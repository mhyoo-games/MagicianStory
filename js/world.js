// 맵 만들기 (시드로 정해짐 → 같은 지역은 늘 같은 모양). 화면과 상관없는 순수 계산.
import { rng } from './pix.js';
import { areaInfo } from './rules.js';
import { CHAPTERS } from './data/story.js';

export const TILE = 16;
export const G = 0, PATH = 1, WATER = 2, WALL = 3, FLOOR = 4;

function blank(w, h, fill) { return { w, h, t: new Uint8Array(w * h).fill(fill), v: new Uint8Array(w * h), props: [], spawns: [], exits: [], npcs: [], deco: [] }; }
const at = (A, x, y) => (x < 0 || y < 0 || x >= A.w || y >= A.h ? WALL : A.t[y * A.w + x]);
const put = (A, x, y, k) => { if (x >= 0 && y >= 0 && x < A.w && y < A.h) A.t[y * A.w + x] = k; };

export function buildArea(id) {
  if (id === 'village') return village();
  if (id === 'tower') return tower();
  const info = areaInfo(id);
  const A = info.kind === 'field' && !info.indoorWall ? field(info) : rooms(info);
  A.id = id; A.info = info; A.theme = info.theme; A.name = info.name; A.dark = !!info.dark;
  finish(A);
  return A;
}

function finish(A) {
  A.solid = new Uint8Array(A.w * A.h);
  for (let i = 0; i < A.t.length; i++) A.solid[i] = A.t[i] === WATER || A.t[i] === WALL ? 1 : 0;
  for (const p of A.props) if (p.solid) for (let dy = 0; dy < (p.th || 1); dy++) for (let dx = 0; dx < (p.tw || 1); dx++) {
    const x = p.x + dx, y = p.y + dy; if (x >= 0 && y >= 0 && x < A.w && y < A.h) A.solid[y * A.w + x] = 1;
  }
  for (let i = 0; i < A.v.length; i++) A.v[i] = A.v[i] || 0;
}

// ── 들판 ──
function field(info) {
  const R = rng('field' + info.id), w = 64, h = 40, A = blank(w, h, G);
  for (let i = 0; i < w * h; i++) A.v[i] = R.int(0, 9);
  // 꼬불꼬불한 길 (왼쪽 → 오른쪽)
  let y = Math.floor(h / 2); const pathY = [];
  for (let x = 0; x < w; x++) {
    if (x % 4 === 0 && x > 2 && x < w - 4) y = Math.max(6, Math.min(h - 7, y + R.int(-2, 2)));
    pathY[x] = y;
    for (let k = -1; k <= 1; k++) put(A, x, y + k, PATH);
  }
  // 가지 길 두 개
  for (let b = 0; b < 2; b++) {
    let bx = R.int(14, w - 20), by = pathY[bx]; const dir = R() < 0.5 ? -1 : 1;
    for (let k = 0; k < 12; k++) { by += dir; if (by < 3 || by > h - 4) break; put(A, bx, by, PATH); put(A, bx + 1, by, PATH); if (k % 3 === 2) bx += R.int(-1, 1); }
  }
  const nearPath = (x, yy, d) => { for (let dx = -d; dx <= d; dx++) { const px = x + dx; if (px >= 0 && px < w && Math.abs(pathY[px] - yy) <= d + 1) return true; } return false; };
  // 보스 공터
  const ax = w - 12, ay = pathY[ax];
  A.arena = { x: ax, y: ay };
  const inArena = (x, yy) => (x - ax) ** 2 + (yy - ay) ** 2 < 49;
  // 연못
  for (let k = 0; k < 6; k++) {
    const cx = R.int(6, w - 8), cy = R.int(4, h - 5), rx = R.int(2, 5), ry = R.int(2, 3);
    if (nearPath(cx, cy, Math.max(rx, ry) + 1) || (cx - ax) ** 2 + (cy - ay) ** 2 < 150 || cx < 9) continue;
    for (let yy = cy - ry; yy <= cy + ry; yy++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1) put(A, x, yy, WATER);
  }
  // 가장자리 나무
  for (let x = 0; x < w; x++) for (const yy of [0, h - 1]) A.props.push({ x, y: yy, kind: 'tree', v: R.int(0, 5), solid: true });
  for (let yy = 1; yy < h - 1; yy++) for (const x of [0, w - 1]) if (Math.abs(yy - pathY[x]) > 1) A.props.push({ x, y: yy, kind: 'tree', v: R.int(0, 5), solid: true });
  // 흩어진 나무·바위·덤불
  const taken = new Set();
  for (let k = 0; k < 170; k++) {
    const x = R.int(1, w - 2), yy = R.int(1, h - 2);
    if (at(A, x, yy) !== G || nearPath(x, yy, 1) || inArena(x, yy) || x < 5 || taken.has(x + ',' + yy)) continue;
    taken.add(x + ',' + yy);
    const r = R();
    A.props.push({ x, y: yy, kind: r < 0.55 ? 'tree' : r < 0.78 ? 'rock' : 'bush', v: R.int(0, 7), solid: r < 0.78 });
  }
  // 몬스터가 나오는 곳
  for (let k = 0; k < 400 && A.spawns.length < 24; k++) {
    const x = R.int(10, w - 4), yy = R.int(2, h - 3);
    if (at(A, x, yy) === WATER || taken.has(x + ',' + yy) || inArena(x, yy)) continue;
    A.spawns.push({ x, y: yy });
  }
  A.entry = { x: 1, y: pathY[1] };
  A.exits.push({ x: 0, y: pathY[0] - 1, w: 1, h: 3, to: 'village', label: '루미나 마을' });
  A.exits.push({ x: w - 1, y: pathY[w - 1] - 1, w: 1, h: 3, to: info.id.replace('f', 'd'), label: CHAPTERS[info.ch].dungeon.name, back: true });
  A.endX = w - 3;
  return A;
}

// ── 방과 복도 (던전·실내) ──
function rooms(info) {
  const R = rng('rooms' + info.id), w = 72, h = 44, A = blank(w, h, WALL);
  const floor = FLOOR;
  const cols = 4, rows = 3, cw = 16, ch = Math.floor(h / rows), rs = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const boss = c === cols - 1;
    if (boss && r !== 1) continue;
    const rw = boss ? 18 : R.int(8, 12), rh = boss ? 22 : R.int(7, ch - 4);
    const x0 = boss ? w - rw - 3 : 2 + c * cw + R.int(0, cw - rw - 2), y0 = boss ? Math.floor(h / 2 - rh / 2) : r * ch + R.int(1, ch - rh - 1);
    rs.push({ x0, y0, x1: x0 + rw - 1, y1: y0 + rh - 1, c, r, boss, cx: Math.floor(x0 + rw / 2), cy: Math.floor(y0 + rh / 2) });
  }
  for (const m of rs) for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) put(A, x, y, floor);
  const dig = (a, b) => {
    let x = a.cx, y = a.cy;
    const hz = R() < 0.5;
    const stepX = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); for (let k = -1; k <= 1; k++) put(A, x, y + k, floor); } };
    const stepY = () => { while (y !== b.cy) { y += Math.sign(b.cy - y); for (let k = -1; k <= 1; k++) put(A, x + k, y, floor); } };
    if (hz) { stepX(); stepY(); } else { stepY(); stepX(); }
  };
  // 이웃 방 잇기
  const byC = (c) => rs.filter((m) => m.c === c);
  for (let c = 0; c < cols; c++) {
    const col = byC(c).sort((a, b) => a.r - b.r);
    for (let i = 0; i + 1 < col.length; i++) dig(col[i], col[i + 1]);
    if (c + 1 < cols) { const nx = byC(c + 1); for (const m of col) if (R() < 0.6 || m.r === 1) dig(m, nx[Math.floor(R() * nx.length)]); }
  }
  for (let i = 0; i < w * h; i++) A.v[i] = R.int(0, 9);
  const start = rs.find((m) => m.c === 0 && m.r === 1) || rs[0];
  const boss = rs.find((m) => m.boss);
  A.arena = { x: boss.cx, y: boss.cy };
  A.entry = { x: start.x0 + 1, y: start.cy };
  // 입구 쪽 출구: 시작 방 왼쪽 벽을 뚫는다
  for (let x = 0; x < start.x0; x++) for (let k = -1; k <= 1; k++) put(A, x, start.cy + k, floor);
  A.exits.push({ x: 0, y: start.cy - 1, w: 1, h: 3, to: info.kind === 'field' ? 'village' : info.id.replace('d', 'f'), label: info.kind === 'field' ? '루미나 마을' : CHAPTERS[info.ch].field.name });
  if (info.kind === 'field') {
    // 실내 들판(도서관 등)은 보스방 오른쪽으로 던전 입구
    for (let x = boss.x1 + 1; x < w; x++) for (let k = -1; k <= 1; k++) put(A, x, boss.cy + k, floor);
    A.exits.push({ x: w - 1, y: boss.cy - 1, w: 1, h: 3, to: info.id.replace('f', 'd'), label: CHAPTERS[info.ch].dungeon.name, back: true });
  }
  // 기둥·책장·바위
  const deco = info.theme === 'library' ? 'shelf' : 'pillar';
  for (const m of rs) {
    if (m.boss) { for (const [dx, dy] of [[-6, -7], [6, -7], [-6, 7], [6, 7]]) A.props.push({ x: m.cx + dx, y: m.cy + dy, kind: 'pillar', solid: true, tall: 1 }); continue; }
    for (let x = m.x0 + 1; x < m.x1; x += R.int(3, 5)) if (at(A, x, m.y0 - 1) === WALL && at(A, x, m.y0) === floor) A.props.push({ x, y: m.y0, kind: deco, v: R.int(0, 5), solid: true, tall: 1 });
    for (let k = 0; k < 2; k++) { const x = R.int(m.x0 + 2, m.x1 - 2), y = R.int(m.y0 + 2, m.y1 - 2); if (m !== start) A.props.push({ x, y, kind: R() < 0.5 ? 'rock' : 'bush', v: R.int(0, 5), solid: true }); }
  }
  for (const m of rs) {
    if (m === start || m.boss) continue;
    for (let k = 0; k < 6; k++) A.spawns.push({ x: R.int(m.x0 + 1, m.x1 - 1), y: R.int(m.y0 + 1, m.y1 - 1) });
  }
  A.endX = boss.x0;
  A.indoor = true;
  return A;
}

// ── 마을 루미나 ──
export const VILLAGE_HOUSES = [
  { id: 'staff', x: 6, y: 7, roof: [168, 67, 47], wall: [217, 160, 102], kind: 'staff', npc: 'garrick', sign: '🪄 지팡이' },
  { id: 'cloth', x: 14, y: 7, roof: [60, 140, 150], wall: [228, 200, 160], kind: 'cloth', npc: 'mira', sign: '👒 의상실' },
  { id: 'potion', x: 30, y: 7, roof: [80, 120, 70], wall: [228, 210, 170], kind: 'potion', npc: 'rina', sign: '🧪 약초' },
  { id: 'general', x: 38, y: 7, roof: [110, 70, 130], wall: [210, 180, 140], kind: 'house', npc: 'momo', sign: '🎒 잡화' },
  { id: 'leo', x: 8, y: 19, roof: [70, 80, 160], wall: [220, 200, 170], kind: 'house', npc: 'leo' },
  { id: 'inn', x: 36, y: 19, roof: [150, 90, 60], wall: [230, 210, 180], kind: 'house', npc: null },
];
function village() {
  const R = rng('village'), w = 48, h = 32, A = blank(w, h, G);
  for (let i = 0; i < w * h; i++) A.v[i] = R.int(0, 9);
  for (let x = 0; x < w; x++) for (let k = 15; k <= 17; k++) put(A, x, k, PATH);
  for (let y = 4; y < h - 2; y++) for (let k = 23; k <= 25; k++) put(A, k, y, PATH);
  for (const hs of VILLAGE_HOUSES) for (let x = hs.x + 1; x <= hs.x + 1; x++) for (let y = hs.y + 3; y < 15; y++) { put(A, x, y, PATH); put(A, x + 1, y, PATH); }
  // 연못
  for (let y = 22; y <= 27; y++) for (let x = 18; x <= 22; x++) if (((x - 20) / 2.6) ** 2 + ((y - 24.5) / 3) ** 2 <= 1) put(A, x, y, WATER);
  for (let y = 21; y <= 27; y++) for (let x = 27; x <= 31; x++) if (((x - 29) / 2.6) ** 2 + ((y - 24) / 3) ** 2 <= 1) put(A, x, y, WATER);
  for (const hs of VILLAGE_HOUSES) {
    A.props.push({ x: hs.x, y: hs.y, kind: 'house', house: hs, solid: true, tw: 3, th: 2, ox: 0, oy: -1 });
    if (hs.npc) A.npcs.push({ id: hs.npc, x: hs.x + 1.5, y: hs.y + 3.4 });
  }
  A.props.push({ x: 23, y: 1, kind: 'tower', solid: true, tw: 3, th: 3 });
  A.npcs.push({ id: 'orben', x: 21.5, y: 5.2 });
  for (let x = 0; x < w; x++) { A.props.push({ x, y: 0, kind: 'tree', v: x % 5, solid: true }); A.props.push({ x, y: h - 1, kind: 'tree', v: x % 5, solid: true }); }
  for (let y = 1; y < h - 1; y++) { if (y < 15 || y > 17) { A.props.push({ x: 0, y, kind: 'tree', v: y % 5, solid: true }); A.props.push({ x: w - 1, y, kind: 'tree', v: y % 5, solid: true }); } }
  for (const [x, y] of [[3, 12], [12, 12], [20, 11], [28, 12], [44, 12], [4, 24], [14, 26], [34, 26], [44, 25], [16, 20], [42, 21], [46, 6], [2, 6]]) A.props.push({ x, y, kind: R() < 0.7 ? 'tree' : 'bush', v: R.int(0, 5), solid: true });
  A.exits.push({ x: w - 1, y: 15, w: 1, h: 3, to: 'map', label: '마을 문 (여행)' });
  A.exits.push({ x: 0, y: 15, w: 1, h: 3, to: 'map', label: '마을 문 (여행)' });
  A.exits.push({ x: 23, y: 4, w: 3, h: 1, to: 'tower', label: '별빛 마탑' });
  A.entry = { x: 24, y: 18 };
  A.id = 'village'; A.theme = 'village'; A.name = '루미나 마을'; A.safe = true;
  A.cats = [['midnight', 10, 14], ['snow', 33, 13], ['calico', 40, 23], ['ash', 15, 28], ['mocha', 30, 18]];
  finish(A);
  return A;
}

// ── 별빛 마탑 (시험장) ──
function tower() {
  const w = 26, h = 18, A = blank(w, h, WALL);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) put(A, x, y, FLOOR);
  for (let y = h - 2; y < h; y++) for (let x = 12; x <= 13; x++) put(A, x, y, FLOOR);
  for (const [x, y] of [[4, 4], [21, 4], [4, 13], [21, 13]]) A.props.push({ x, y, kind: 'pillar', solid: true, tall: 1 });
  A.exits.push({ x: 12, y: h - 1, w: 2, h: 1, to: 'village', label: '루미나 마을' });
  A.entry = { x: 12.5, y: h - 3 };
  A.arena = { x: 13, y: 7 };
  A.id = 'tower'; A.theme = 'tower'; A.name = '별빛 마탑 · 시험장'; A.indoor = true; A.safe = true;
  A.npcs.push({ id: 'orben', x: 9, y: 12 });
  finish(A);
  return A;
}

export function isSolid(A, px, py) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= A.w || y >= A.h) return true;
  return A.solid[y * A.w + x] === 1;
}
export { at };
