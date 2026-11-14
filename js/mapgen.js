// 지역 맵 만들기 (시드로 정해짐 → 같은 지역은 늘 같은 모양). 화면과 상관없는 순수 계산.
// 칸 1개 = 16px 타일 = 1m. 동굴은 4×4칸 블록 단위.
import { REGIONS, THEMES } from './data/world.js';

export const G = 0, PATH = 1, WATER = 2, WALL = 3, VOID = 4, LAVA = 5, ICE = 6, WIND = 7, FLOOR = 8, STONE = 9;
export const SEGW = 22, FH = 26, BLK = 4;
const WALKABLE = new Set([G, PATH, ICE, WIND, FLOOR, STONE]);
export const isWalkTile = (k) => WALKABLE.has(k);

export function rng(seed) {
  let h = 2166136261 >>> 0; const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

function blank(w, h, fill) {
  return { w, h, t: new Uint8Array(w * h).fill(fill), v: new Uint8Array(w * h), aux: new Int8Array(w * h), props: [], spawns: [], puzzles: [], gates: [], finds: [], signs: [], npcs: [], houses: [], segX: [] };
}
const idx = (A, x, y) => y * A.w + x;
export const tileAt = (A, x, y) => (x < 0 || y < 0 || x >= A.w || y >= A.h ? WALL : A.t[y * A.w + x]);
const put = (A, x, y, k) => { if (x >= 0 && y >= 0 && x < A.w && y < A.h) A.t[y * A.w + x] = k; };
const rect = (A, x0, y0, x1, y1, k) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(A, x, y, k); };

export function buildRegion(id) {
  const R = REGIONS[id];
  let A;
  if (R.kind === 'town') A = town(R);
  else if (R.kind === 'cave') A = cave(R);
  else A = field(R);
  A.id = id; A.region = R; A.kind = R.kind; A.theme = R.theme; A.name = R.name;
  finish(A);
  return A;
}

function finish(A) {
  A.solid = new Uint8Array(A.w * A.h);
  for (let i = 0; i < A.t.length; i++) A.solid[i] = isWalkTile(A.t[i]) ? 0 : 1;
  for (const p of A.props) if (p.solid) for (let dy = 0; dy < (p.th || 1); dy++) for (let dx = 0; dx < (p.tw || 1); dx++) {
    const x = p.x + dx, y = p.y + dy; if (x >= 0 && y >= 0 && x < A.w && y < A.h) A.solid[y * A.w + x] = 1;
  }
  // 퍼즐 문은 처음엔 막혀 있다 (풀면 game이 연다)
  for (const g of A.gates) for (let y = g.y0; y <= g.y1; y++) A.solid[idx(A, g.x, y)] = 1;
}

// ─────────────── 들판 ───────────────
function field(R) {
  const n = R.segs.length, w = n * SEGW + 2, h = FH, A = blank(w, h, G), r = rng('field:' + R.id);
  const th = THEMES[R.theme];
  for (let i = 0; i < w * h; i++) A.v[i] = r.int(0, 9);
  // 테두리: 하늘 테마는 낭떠러지, 나머지는 절벽
  const edge = th.void ? VOID : WALL;
  rect(A, 0, 0, w - 1, 1, edge); rect(A, 0, h - 2, w - 1, h - 1, edge);
  rect(A, 0, 0, 0, h - 1, WALL); rect(A, w - 1, 0, w - 1, h - 1, WALL);
  // 길
  let y = Math.floor(h / 2); const pathY = [];
  for (let x = 0; x < w; x++) {
    if (x % 5 === 0 && x > 3 && x < w - 4) y = Math.max(7, Math.min(h - 8, y + r.int(-2, 2)));
    pathY[x] = y;
  }
  A.pathY = pathY;
  for (let x = 0; x < w; x++) for (let k = -1; k <= 1; k++) if (tileAt(A, x, pathY[x] + k) === G) put(A, x, pathY[x] + k, PATH);
  // 양쪽 출구
  for (let k = -1; k <= 1; k++) { put(A, 0, pathY[0] + k, PATH); put(A, w - 1, pathY[w - 1] + k, PATH); }
  A.entry = { x: 1.5, y: pathY[1] + 0.5 }; A.exitL = { x: 0, y: pathY[0], to: R.prev }; A.exitR = { x: w - 1, y: pathY[w - 1], to: R.next };
  A.endPos = { x: w - 2.5, y: pathY[w - 2] + 0.5 };
  const keep = new Set(); // 물건을 놓지 않을 칸
  const keepRect = (x0, y0, x1, y1) => { for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) keep.add(xx + ',' + yy); };
  R.segs.forEach((seg, s) => {
    const x0 = 1 + s * SEGW, x1 = x0 + SEGW - 1, py = pathY[x0 + 11];
    A.segX.push(x0);
    const pid = `${R.id}:${s}`;
    const gate = () => { for (let yy = 2; yy < h - 2; yy++) if (Math.abs(yy - py) > 1) put(A, x1, yy, WALL); A.gates.push({ puzzle: pid, x: x1, y0: py - 1, y1: py + 1 }); for (let k = -1; k <= 1; k++) put(A, x1, py + k, PATH); keepRect(x1 - 1, py - 2, x1 + 1, py + 2); };
    if (seg === 'field' || seg === 'defend') {
      if (seg === 'defend') { A.defend = { x: x0 + 11.5, y: py + 0.5, seg: s }; keepRect(x0 + 6, py - 5, x0 + 17, py + 5); }
      else if (r() < 0.6 && !th.void) { // 연못·용암 웅덩이
        const cx = x0 + r.int(5, 17), cy = r() < 0.5 ? r.int(4, py - 4) : r.int(py + 4, h - 5), rx = r.int(2, 3), ry = r.int(1, 2);
        for (let yy = cy - ry; yy <= cy + ry; yy++) for (let xx = cx - rx; xx <= cx + rx; xx++) if (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1 && tileAt(A, xx, yy) === G) put(A, xx, yy, th.lava ? LAVA : WATER);
      }
      for (let k = 0; k < 6; k++) A.spawns.push({ x: x0 + r.int(3, SEGW - 3), y: r.int(3, h - 4), seg: s });
    } else if (seg === 'blink') {
      for (let yy = 2; yy < h - 2; yy++) for (let xx = x0 + 9; xx <= x0 + 12; xx++) put(A, xx, yy, VOID);
      A.signs.push({ x: x0 + 6, y: py - 2, text: '낭떠러지는 걸어서 못 건너요. 가장자리에서 블링크로 건너뛰어요!' });
      keepRect(x0 + 5, 2, x0 + 16, h - 3);
      A.spawns.push({ x: x0 + 3, y: py + 4, seg: s }, { x: x0 + 18, y: py - 4, seg: s });
    } else if (seg === 'plates') {
      const ps = [[x0 + 4, py - 6], [x0 + 11, py + 6], [x0 + 17, py - 6]];
      A.puzzles.push({ id: pid, type: 'plates', seg: s, plates: ps.map(([x, yy]) => ({ x, y: yy })), time: 8 });
      for (const [x, yy] of ps) { put(A, x, yy, PATH); keepRect(x - 1, yy - 1, x + 1, yy + 1); }
      A.signs.push({ x: x0 + 2, y: py - 2, text: '발판은 밟고 8초 동안 빛나요. 셋이 한꺼번에 빛나면 문이 열려요. 블링크로 서둘러요!' });
      gate();
    } else if (seg === 'torches') {
      const ts = [[x0 + 5, py - 5], [x0 + 15, py - 5], [x0 + 15, py + 5], [x0 + 5, py + 5]];
      const order = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = r.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
      A.puzzles.push({ id: pid, type: 'torches', seg: s, torches: ts.map(([x, yy]) => ({ x, y: yy })), order });
      for (const [x, yy] of ts) { A.props.push({ x, y: yy, kind: 'brazier', solid: true, puzzle: pid }); keepRect(x - 1, yy - 1, x + 1, yy + 1); }
      A.signs.push({ x: x0 + 10, y: py, text: '석판: 「' + order.map((o) => '①②③④'[o]).join(' → ') + '」 순서대로 화로를 마법으로 맞혀 불을 켜요. 틀리면 모두 꺼져요.', tablet: pid });
      keepRect(x0 + 9, py - 1, x0 + 11, py + 1);
      gate();
    } else if (seg === 'crystals') {
      const cs = [[x0 + 10, py - 4], [x0 + 5, py], [x0 + 10, py], [x0 + 15, py], [x0 + 10, py + 4]];
      const adj = [[0, 2], [1, 2], [2, 0, 1, 3, 4], [3, 2], [4, 2]];
      const on = [1, 1, 1, 1, 1];
      const presses = r.int(2, 3), done = new Set();
      while (done.size < presses) done.add(r.int(0, 4));
      for (const p of done) for (const k of adj[p].concat(adj[p].includes(p) ? [] : [p])) on[k] ^= 1;
      if (on.every((v) => v === 1)) on[1] ^= 1, on[2] ^= 1;
      A.puzzles.push({ id: pid, type: 'crystals', seg: s, crystals: cs.map(([x, yy]) => ({ x, y: yy })), adj, on });
      for (const [x, yy] of cs) { A.props.push({ x, y: yy, kind: 'crystal', solid: true, puzzle: pid }); keepRect(x - 1, yy - 1, x + 1, yy + 1); }
      A.signs.push({ x: x0 + 3, y: py - 2, text: '수정을 마법으로 맞히면 그 수정과 이웃 수정이 함께 켜지고 꺼져요. 다섯 개를 모두 켜면 문이 열려요.' });
      gate();
    } else if (seg === 'boulder') {
      const b = { x: x0 + 7, y: py + 3 }, sw = { x: x0 + 15, y: py - 3 };
      A.puzzles.push({ id: pid, type: 'boulder', seg: s, start: b, sw, reset: { x: x0 + 3, y: py + 3 } });
      keepRect(x0 + 2, py - 7, x0 + 19, py + 7);
      for (const [xx, yy] of [[x0 + 11, py - 6], [x0 + 12, py - 6], [x0 + 17, py], [x0 + 17, py + 1]]) A.props.push({ x: xx, y: yy, kind: 'rock', v: 1, solid: true });
      A.signs.push({ x: x0 + 3, y: py - 2, text: '바위를 밀어 빛나는 스위치에 올려요. 막히면 옆의 「되돌림 돌」을 살펴봐요.' });
      gate();
    } else if (seg === 'ice') {
      iceField(A, r, x0, x1, py, s, R.id);
    } else if (seg === 'wind') {
      for (const lx of [x0 + 6, x0 + 13]) for (let yy = 2; yy < h - 2; yy++) for (let xx = lx; xx < lx + 3; xx++) { put(A, xx, yy, WIND); A.aux[idx(A, xx, yy)] = -1; }
      A.signs.push({ x: x0 + 3, y: py - 2, text: '거센 바람길은 걸어서는 밀려나요. 블링크로 단숨에 뚫고 지나가요!' });
      keepRect(x0 + 5, 2, x0 + 17, h - 3);
    } else if (seg === 'lava') {
      for (let yy = 2; yy < h - 2; yy++) for (let xx = x0 + 4; xx <= x0 + 17; xx++) put(A, xx, yy, th.lava ? LAVA : VOID);
      let sy = py, sx = x0 + 4;
      const stones = [];
      while (sx <= x0 + 15) { stones.push([sx, sy]); sx += 4; sy = Math.max(4, Math.min(h - 7, sy + r.pick([-2, -1, 1, 2]))); }
      for (const [xx, yy] of stones) rect(A, xx, yy - 1, xx + 1, yy + 1, STONE);
      A.signs.push({ x: x0 + 2, y: py - 2, text: '디딤돌에서 디딤돌로 블링크로 건너뛰어요.' });
      keepRect(x0 + 3, 2, x0 + 18, h - 3);
    } else if (seg === 'arena') {
      const cx = x0 + 11, cy = py;
      A.arena = { x: cx + 0.5, y: cy + 0.5, seg: s };
      keepRect(cx - 8, cy - 7, cx + 8, cy + 7);
      A.anchors = [[cx - 5, cy - 4], [cx + 5, cy - 4], [cx - 5, cy + 4], [cx + 5, cy + 4]].map(([x, yy]) => ({ x: x + 0.5, y: yy + 0.5 }));
    }
    // 찾을 것
    for (const f of R.finds || []) if (f.seg === s) {
      const fx = f.far ? x0 + r.int(14, 19) : x0 + r.int(3, 8), fy = f.far ? (r() < 0.5 ? 3 : h - 4) : (r() < 0.5 ? r.int(3, py - 3) : r.int(py + 3, h - 4));
      put(A, fx, fy, G); keepRect(fx - 1, fy - 1, fx + 1, fy + 1);
      A.finds.push({ ...f, x: fx + 0.5, y: fy + 0.5 });
    }
  });
  // 나무·바위·풀 흩뿌리기
  const near = (x, yy) => { for (let dx = -2; dx <= 2; dx++) { const px = x + dx; if (px >= 0 && px < w && Math.abs(pathY[px] - yy) <= 2) return true; } return false; };
  for (let k = 0; k < n * 15; k++) {
    const x = r.int(2, w - 3), yy = r.int(2, h - 3);
    if (tileAt(A, x, yy) !== G || near(x, yy) || keep.has(x + ',' + yy) || x < 4 || x > w - 5) continue;
    keep.add(x + ',' + yy);
    const p = r();
    A.props.push({ x, y: yy, kind: th.noTree ? (p < 0.6 ? 'spire' : 'rock') : p < 0.55 ? 'tree' : p < 0.75 ? 'rock' : 'bush', v: r.int(0, 7), solid: p < 0.75 });
  }
  for (let k = 0; k < n * 30; k++) { const x = r.int(2, w - 3), yy = r.int(2, h - 3); if (tileAt(A, x, yy) === G && !keep.has(x + ',' + yy)) A.props.push({ x, y: yy, kind: 'flower', v: r.int(0, 5) }); }
  // 테두리 나무 (보기용)
  if (!th.void) for (let x = 0; x < w; x += 1) { if (r() < 0.5) A.props.push({ x, y: 0, kind: th.noTree ? 'spire' : 'tree', v: r.int(0, 7), deco: 1 }); if (r() < 0.45) A.props.push({ x, y: h - 1, kind: th.noTree ? 'rock' : 'bush', v: r.int(0, 7), deco: 1 }); }
  A.spawns = A.spawns.filter((sp) => tileAt(A, sp.x, sp.y) === G || tileAt(A, sp.x, sp.y) === PATH).filter((sp) => !A.props.some((p) => p.solid && p.x === sp.x && p.y === sp.y));
  return A;
}

// 얼음길: 미끄러지다 바위에 부딪혀야 멈춘다. 건널 수 있는 배치가 나올 때까지 다시 만든다.
function iceField(A, r, x0, x1, py, s, rid) {
  const ix0 = x0 + 3, ix1 = x0 + 18, iy0 = 3, iy1 = A.h - 4;
  for (let tryN = 0; tryN < 200; tryN++) {
    const rocks = new Set();
    for (let k = 0; k < 16; k++) rocks.add(`${r.int(ix0, ix1)},${r.int(iy0, iy1)}`);
    const startY = py, goalCol = ix1 + 1;
    const blocked = (x, y) => y < iy0 || y > iy1 || rocks.has(`${x},${y}`);
    const slide = (x, y, dx, dy) => { let cx = x, cy = y; for (let i = 0; i < 40; i++) { const nx = cx + dx, ny = cy + dy; if (nx > ix1) return [nx, ny, true]; if (nx < ix0) return [cx, cy, false]; if (blocked(nx, ny)) return [cx, cy, false]; cx = nx; cy = ny; } return [cx, cy, false]; };
    const seen = new Map(), q = [[ix0, startY, 0]]; seen.set(`${ix0},${startY}`, 0);
    let best = -1;
    while (q.length) {
      const [x, y, d] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [nx, ny, out] = slide(x, y, dx, dy);
        if (out) { best = best < 0 ? d + 1 : Math.min(best, d + 1); continue; }
        const key = `${nx},${ny}`; if (!seen.has(key)) { seen.set(key, d + 1); q.push([nx, ny, d + 1]); }
      }
    }
    if (best >= 4 && !rocks.has(`${ix0},${startY}`)) {
      for (let yy = 2; yy < A.h - 2; yy++) for (let xx = ix0; xx <= ix1; xx++) put(A, xx, yy, ICE);
      rect(A, ix0, 2, ix1, iy0 - 1, WALL); rect(A, ix0, iy1 + 1, ix1, A.h - 3, WALL);
      for (const k of rocks) { const [xx, yy] = k.split(',').map(Number); put(A, xx, yy, WALL); A.props.push({ x: xx, y: yy, kind: 'icerock', deco: 1 }); }
      // 얼음 위 들머리: 왼쪽 땅에서 얼음으로 들어간다
      for (let yy = 2; yy < A.h - 2; yy++) { if (Math.abs(yy - py) > 1) { put(A, ix0 - 1, yy, WALL); } }
      A.puzzles.push({ id: `${rid}:${s}`, type: 'ice', seg: s, minMoves: best, x0: ix0, x1: ix1, y0: iy0, y1: iy1 });
      A.signs.push({ x: ix0 - 2, y: py - 2, text: '얼음 위에서는 멈추지 못하고 미끄러져요. 바위에 부딪히는 곳을 잘 노려요.' });
      return;
    }
  }
  throw new Error('얼음길을 만들지 못함');
}

// ─────────────── 동굴 (블록 단위) ───────────────
function cave(R) {
  const n = R.segs.length, BW = n * 6 + 2, BH = 7, r = rng('cave:' + R.id);
  const b = new Uint8Array(BW * BH); // 0 바위 · 1 바닥
  const B = (x, y, v) => { if (x >= 0 && y >= 0 && x < BW && y < BH) b[y * BW + x] = v; };
  const mid = 3;
  for (let x = 0; x < BW; x++) B(x, mid, 1);
  const segInfo = [];
  R.segs.forEach((seg, s) => {
    const bx0 = 1 + s * 6;
    if (seg === 'boss') { for (let y = 1; y <= 5; y++) for (let x = bx0; x < bx0 + 6; x++) B(x, y, 1); }
    else if (seg === 'cave') {
      for (let k = 0; k < 2; k++) { const rx = bx0 + r.int(0, 4), up = r() < 0.5; for (let y = up ? 1 : 4; y <= (up ? 2 : 5); y++) for (let x = rx; x <= rx + 1; x++) B(x, y, 1); B(rx, up ? 2 : 4, 1); }
    } else { for (let y = 2; y <= 4; y++) for (let x = bx0; x < bx0 + 5; x++) B(x, y, 1); if (seg === 'arena') for (let y = 1; y <= 5; y++) for (let x = bx0; x < bx0 + 5; x++) B(x, y, 1); }
    segInfo.push({ seg, bx0 });
  });
  const w = BW * BLK, h = BH * BLK, A = blank(w, h, WALL);
  A.cave = true; A.bw = BW; A.bh = BH; A.blocks = b;
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) if (b[by * BW + bx]) rect(A, bx * BLK, by * BLK, bx * BLK + 3, by * BLK + 3, FLOOR);
  for (let i = 0; i < w * h; i++) A.v[i] = r.int(0, 9);
  const py = mid * BLK + 1; // 가운데 줄 (칸)
  A.pathY = Array(w).fill(py);
  A.entry = { x: 1.5, y: py + 1 }; A.exitL = { x: 0, y: py, to: R.prev, w4: 1 }; A.exitR = { x: w - 1, y: py, to: R.next, w4: 1 };
  A.endPos = { x: w - 2.5, y: py + 1 };
  segInfo.forEach(({ seg, bx0 }, s) => {
    const x0 = bx0 * BLK, cx = x0 + 10, pid = `${R.id}:${s}`;
    A.segX.push(x0);
    const gateX = (bx0 + 5) * BLK + 1;
    const gate = () => { A.gates.push({ puzzle: pid, x: gateX, y0: mid * BLK, y1: mid * BLK + 3, cave: 1 }); };
    if (!['cave', 'boss', 'arena'].includes(seg)) A.spawns.push({ x: x0 + 1, y: 2 * BLK + 1, seg: s }, { x: x0 + 1, y: 5 * BLK - 2, seg: s });
    if (seg === 'cave') {
      const cells = []; for (let yy = 1; yy < h - 1; yy++) for (let xx = x0; xx < x0 + 24; xx++) if (tileAt(A, xx, yy) === FLOOR) cells.push([xx, yy]);
      for (let k = 0; k < 8 && cells.length; k++) { const [sx, sy] = cells.splice(r.int(0, cells.length - 1), 1)[0]; A.spawns.push({ x: sx, y: sy, seg: s }); }
      for (let k = 0; k < 5; k++) { const sx = x0 + r.int(1, 22), sy = r.int(1, h - 2); if (tileAt(A, sx, sy) === FLOOR && Math.abs(sy - py) > 2) A.props.push({ x: sx, y: sy, kind: R.theme === 'library' ? 'shelf' : 'stalagmite', v: r.int(0, 5), solid: true }); }
    } else if (seg === 'boss') {
      A.arena = { x: x0 + 12.5, y: 3.5 * BLK, seg: s };
      A.anchors = [[x0 + 5, 7], [x0 + 20, 7], [x0 + 5, 21], [x0 + 20, 21]].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
      A.gates.push({ puzzle: `boss:${R.boss}`, x: (bx0 + 6) * BLK + 1, y0: mid * BLK, y1: mid * BLK + 3, cave: 1, boss: 1 });
    } else if (seg === 'arena') {
      A.arena = { x: x0 + 10.5, y: 3.5 * BLK, seg: s };
      A.anchors = [[x0 + 4, 7], [x0 + 16, 7], [x0 + 4, 21], [x0 + 16, 21]].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    } else if (seg === 'blink') {
      rect(A, x0 + 8, 2 * BLK, x0 + 11, 5 * BLK - 1, VOID);
      A.signs.push({ x: x0 + 5, y: py - 1, text: '갈라진 틈은 블링크로 건너요!' });
    } else if (seg === 'plates') {
      const ps = [[x0 + 2, 9], [x0 + 10, 18], [x0 + 17, 9]];
      A.puzzles.push({ id: pid, type: 'plates', seg: s, plates: ps.map(([x, y]) => ({ x, y })), time: 7 });
      A.signs.push({ x: x0 + 3, y: py - 1, text: '발판 셋을 한꺼번에 밝히면 문이 열려요 (하나당 7초).' });
      gate();
    } else if (seg === 'torches') {
      const ts = [[x0 + 3, 9], [x0 + 16, 9], [x0 + 16, 18], [x0 + 3, 18]];
      const order = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = r.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
      A.puzzles.push({ id: pid, type: 'torches', seg: s, torches: ts.map(([x, y]) => ({ x, y })), order });
      for (const [x, y] of ts) A.props.push({ x, y, kind: 'brazier', solid: true, puzzle: pid });
      A.signs.push({ x: cx, y: py, text: '석판: 「' + order.map((o) => '①②③④'[o]).join(' → ') + '」 순서대로 화로에 불을 켜요.', tablet: pid });
      gate();
    } else if (seg === 'crystals') {
      const cs = [[cx, 9], [x0 + 4, 14], [cx, 14], [x0 + 16, 14], [cx, 19]];
      const adj = [[0, 2], [1, 2], [2, 0, 1, 3, 4], [3, 2], [4, 2]];
      const on = [1, 1, 1, 1, 1], presses = new Set();
      while (presses.size < r.int(2, 3)) presses.add(r.int(0, 4));
      for (const p of presses) for (const k of adj[p]) on[k] ^= 1;
      if (on.every((v) => v === 1)) on[1] ^= 1, on[2] ^= 1;
      A.puzzles.push({ id: pid, type: 'crystals', seg: s, crystals: cs.map(([x, y]) => ({ x, y })), adj, on });
      for (const [x, y] of cs) A.props.push({ x, y, kind: 'crystal', solid: true, puzzle: pid });
      A.signs.push({ x: x0 + 2, y: py - 1, text: '수정을 맞히면 이웃 수정도 함께 바뀌어요. 모두 켜 보세요.' });
      gate();
    } else if (seg === 'boulder') {
      A.puzzles.push({ id: pid, type: 'boulder', seg: s, start: { x: x0 + 5, y: 16 }, sw: { x: x0 + 14, y: 10 }, reset: { x: x0 + 2, y: 17 } });
      A.props.push({ x: x0 + 9, y: 9, kind: 'stalagmite', v: 0, solid: true }, { x: x0 + 15, y: 14, kind: 'stalagmite', v: 1, solid: true });
      A.signs.push({ x: x0 + 2, y: py - 1, text: '바위를 밀어 스위치 위에 올려요. 되돌림 돌로 처음부터 다시 할 수 있어요.' });
      gate();
    } else if (seg === 'ice') {
      for (let y = 2 * BLK; y < 5 * BLK; y++) for (let x = x0 + 2; x < x0 + 18; x++) if (tileAt(A, x, y) === FLOOR) put(A, x, y, ICE);
      const rk = rng('ice:' + R.id + s);
      // 동굴 얼음길은 간단히: 바위 몇 개 + 가운데 줄은 비움
      for (let k = 0; k < 10; k++) { const x = x0 + rk.int(3, 17), y = rk.int(2 * BLK, 5 * BLK - 1); if (Math.abs(y - py - 1) > 1) { put(A, x, y, WALL); A.props.push({ x, y, kind: 'icerock', deco: 1 }); } }
      A.signs.push({ x: x0 + 1, y: py - 1, text: '미끄러운 얼음이에요. 바위 사이로 미끄러져 나가요.' });
    } else if (seg === 'wind') {
      for (const lx of [x0 + 5, x0 + 12]) for (let y = 2 * BLK; y < 5 * BLK; y++) for (let x = lx; x < lx + 3; x++) if (tileAt(A, x, y) === FLOOR) { put(A, x, y, WIND); A.aux[idx(A, x, y)] = -1; }
      A.signs.push({ x: x0 + 2, y: py - 1, text: '바람길은 블링크로 뚫어요!' });
    } else if (seg === 'lava') {
      for (let y = 2 * BLK; y < 5 * BLK; y++) for (let x = x0 + 3; x < x0 + 17; x++) put(A, x, y, LAVA);
      let sy = py, sx = x0 + 3;
      while (sx <= x0 + 14) { rect(A, sx, sy - 1, sx + 1, sy + 1, STONE); sx += 4; sy = Math.max(2 * BLK + 2, Math.min(5 * BLK - 3, sy + r.pick([-2, -1, 1, 2]))); }
      A.signs.push({ x: x0 + 1, y: py - 1, text: '용암 위 디딤돌을 블링크로 건너요.' });
    }
  });
  return A;
}

// ─────────────── 마을 ───────────────
export const HOUSE_KIND = { quest: 'hall', 'shop:potion': 'potion', 'shop:staff': 'staff', 'shop:cloth': 'cloth', 'shop:general': 'general', smith: 'smith', pet: 'pet', talk: 'house', exam: 'tower' };
function town(R) {
  const w = 54, h = 30, A = blank(w, h, G), r = rng('town:' + R.id), th = THEMES[R.theme];
  for (let i = 0; i < w * h; i++) A.v[i] = r.int(0, 9);
  rect(A, 0, 0, w - 1, 1, WALL); rect(A, 0, h - 2, w - 1, h - 1, WALL); rect(A, 0, 0, 0, h - 1, WALL); rect(A, w - 1, 0, w - 1, h - 1, WALL);
  const py = 15;
  A.pathY = Array(w).fill(py);
  rect(A, 0, py - 1, w - 1, py + 1, PATH);
  for (let k = -1; k <= 1; k++) { put(A, 0, py + k, PATH); put(A, w - 1, py + k, PATH); }
  A.entry = { x: 2.5, y: py + 0.5 }; A.exitL = R.prev ? { x: 0, y: py, to: R.prev } : null; A.exitR = { x: w - 1, y: py, to: R.next };
  A.endPos = { x: w - 3, y: py + 0.5 };
  // 집 자리: 위 4채, 아래 4채
  const spots = [[6, 6], [15, 6], [33, 6], [42, 6], [6, 21], [15, 21], [33, 21], [42, 21]]; // 집 가운데 (8칸 폭)
  const people = R.npcs.slice();
  const withHouse = people.filter(([, role]) => role !== 'talk' && role !== 'exam' && role !== 'quest');
  withHouse.forEach(([id, role], i) => {
    const [hx, hy] = spots[i];
    A.houses.push({ x: hx, y: hy, kind: HOUSE_KIND[role], role, npc: id, top: hy < py });
    rect(A, hx - 3, hy - 2, hx + 3, hy + 1, WALL);
    // 문은 늘 아래(남쪽)를 본다. 아래 줄 집은 옆으로 돌아 문 앞까지 길을 낸다
    const ny = hy + 3;
    if (hy < py) for (let yy = ny; yy <= py; yy++) put(A, hx, yy, PATH);
    else { for (let yy = py; yy <= ny; yy++) put(A, hx + 4, yy, PATH); for (let xx = hx; xx <= hx + 4; xx++) put(A, xx, ny, PATH); }
    A.npcs.push({ id, role, x: hx + 0.5, y: ny + 0.5 });
  });
  // 광장: 비석 · (있으면) 마탑과 시험장
  A.warp = { x: 24.5, y: py + 0.5 };
  A.props.push({ x: 24, y: py, kind: 'warpstone', solid: true });
  if (R.tower) {
    A.houses.push({ x: 24, y: 5, kind: 'tower', role: 'exam', top: true });
    rect(A, 22, 2, 26, 7, WALL);
    for (let yy = 8; yy < py; yy++) put(A, 24, yy, PATH);
    A.examArena = { x: 24.5, y: 23.5 };
    rect(A, 20, 19, 29, 27, PATH);
  }
  let free = [[24, 10], [28, 12], [20, 12], [30, 18], [19, 18]];
  for (const [id, role] of people.filter(([, ro]) => ro === 'talk' || ro === 'exam' || ro === 'quest')) {
    const [x, y] = free.shift(); A.npcs.push({ id, role, x: x + 0.5, y: y + 0.5 });
  }
  // 나무·꽃
  for (let k = 0; k < 70; k++) {
    const x = r.int(2, w - 3), y = r.int(2, h - 3);
    if (tileAt(A, x, y) !== G || Math.abs(y - py) < 3) continue;
    if (A.npcs.some((n) => Math.abs(n.x - x) < 2 && Math.abs(n.y - y) < 2)) continue;
    if (R.tower && x >= 19 && x <= 30 && y >= 18) continue;
    A.props.push(r() < 0.35 ? { x, y, kind: th.noTree ? 'spire' : 'tree', v: r.int(0, 7), solid: true } : { x, y, kind: 'flower', v: r.int(0, 5) });
  }
  for (let x = 0; x < w; x += 2) { A.props.push({ x, y: 0, kind: th.noTree ? 'spire' : 'tree', v: x % 7, deco: 1 }); if (x % 4 === 0) A.props.push({ x, y: h - 1, kind: th.noTree ? 'rock' : 'bush', v: (x + 3) % 7, deco: 1 }); }
  A.lamps = [[10, py - 2], [20, py + 2], [30, py - 2], [40, py + 2]];
  A.safe = true;
  return A;
}

// 블링크 거리 안에서 건너편 땅이 있는지 (테스트·게임 공용)
export function blinkLand(A, x, y, dx, dy, dist) {
  let lx = x, ly = y;
  for (let d = 0.2; d <= dist + 1e-6; d += 0.2) {
    const nx = x + dx * d, ny = y + dy * d, cx = Math.floor(nx), cy = Math.floor(ny), k = tileAt(A, cx, cy);
    const over = k === VOID || k === LAVA || k === WATER;
    if (!over && (k === WALL || A.solid[idx(A, cx, cy)])) break;
    if (!over && !A.solid[idx(A, cx, cy)]) { lx = nx; ly = ny; }
  }
  return { x: lx, y: ly };
}
