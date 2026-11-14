// 지역 맵 그리기 (픽셀): 땅은 한 장의 그림판에 타일을 찍어 바닥에 깔고(자동 이음 타일),
// 나무·바위·집·문 같은 키 큰 것은 세운 그림판으로 세운다.
import * as THREE from 'three';
import { THEMES } from '../data/world.js';
import { G as T_G, PATH, WATER, WALL, VOID, LAVA, ICE, WIND, FLOOR, STONE, tileAt } from '../mapgen.js';
import { IMG, cv, crop, trim, filt, Pix, hex, shade } from './sheets.js';
import { sprite, canvasTex, PX } from './models.js';

const T = 16;
// 땅 재료 (floors.png 안의 자리)
const RING = { grass: 0, stone: 5, dirt: 10 }; // 둘러싼 모양 타일 (가운데가 빈 고리)
const FILL = { grass: [[1, 10], [2, 10], [3, 10]], grass2: [[1, 11], [2, 11], [3, 11]], stone: [[6, 10], [7, 10], [8, 10]], dirt: [[11, 10], [12, 10], [13, 10]], brick: [[15, 1], [16, 2], [17, 1], [18, 3]], snow: [[0, 22], [1, 22], [2, 22], [3, 22]], ice: [[0, 23], [1, 23], [2, 23], [3, 23]], sand: [[5, 22], [6, 22], [7, 22], [8, 22]], sand2: [[5, 23], [6, 23], [7, 23]] };
// 테마: fill 바닥 전체 · ring 둘레 모양 재료와 놓일 칸 · cliff 절벽 색(0 갈색 · 6 회색 · 12 짙은 갈색) · f 색 바꾸기
const PXT = {
  meadow: { fill: 'dirt', ring: ['grass', 'G'], cliff: 0, grassy: 1 },
  forest: { fill: 'dirt', ring: ['grass', 'G'], cliff: 0, grassy: 1, f: { bright: 0.88, sat: 1.05 } },
  river: { fill: 'stone', ring: ['grass', 'G'], cliff: 6, grassy: 1, f: { bright: 1.05 } },
  swamp: { fill: 'dirt', ring: ['grass', 'G'], cliff: 12, grassy: 1, f: { hue: 25, sat: 0.55, bright: 0.72 } },
  canyon: { fill: 'dirt', ring: ['stone', 'PATH'], cliff: 0, f: { hue: -12, sat: 1.25, bright: 1.05 } },
  snow: { fill: 'snow', ring: ['stone', 'PATH'], cliff: 6, snowy: 1 },
  sky: { fill: 'snow', ring: ['stone', 'PATH'], cliff: 6, f: { hue: 210, sat: 0.6, bright: 1.05 }, sky: 1 },
  desert: { fill: 'sand', ring: ['stone', 'PATH'], cliff: 0, f: { sat: 1.05 } },
  volcano: { fill: 'dirt', ring: ['stone', 'PATH'], cliff: 12, f: { sat: 0.7, bright: 0.55 } },
  ash: { fill: 'stone', ring: ['dirt', 'PATH'], cliff: 12, f: { sat: 0.5, bright: 0.75 } },
  library: { fill: 'brick', cliff: 12, f: { hue: 15, sat: 0.8, bright: 0.85 } },
  cave: { fill: 'dirt', cliff: 0, f: { bright: 0.85 } },
  mossy: { fill: 'stone', ring: ['grass', 'G'], cliff: 6, f: { hue: 15, sat: 0.7, bright: 0.75 } },
  lavacave: { fill: 'dirt', cliff: 12, f: { hue: -15, sat: 1.2, bright: 0.65 } },
  icecave: { fill: 'ice', cliff: 6, f: { bright: 1.08 } },
  skycave: { fill: 'brick', cliff: 6, f: { sat: 0.4, bright: 1.25 } },
  vault: { fill: 'brick', cliff: 6, f: { hue: 230, sat: 0.6, bright: 0.65 } },
  timecave: { fill: 'sand2', cliff: 0, f: { sepia: 0.4, bright: 0.9 } },
  lair: { fill: 'dirt', cliff: 12, f: { hue: -25, sat: 1.4, bright: 0.6 } },
};
const tsCache = new Map();
function ts(name, f) { const key = name + JSON.stringify(f || {}); if (!tsCache.has(key)) { const im = IMG[name]; const c = cv(im.width, im.height), g = c.getContext('2d'); if (f) g.filter = filt(f); g.drawImage(im, 0, 0); tsCache.set(key, c); } return tsCache.get(key); }
function hsh(x, y) { return (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997; }

export function buildMapView(A) {
  const root = new THREE.Group();
  const th0 = THEMES[A.theme];
  const pt = PXT[A.theme] || PXT.meadow;
  const view = { root, gates: {}, objs: {}, finds: {}, updaters: [], fades: [], theme: th0, cave: !!(A.cave || th0.indoor), dark: A.cave ? 1 - (th0.amb ?? 0.7) * 0.6 : th0.indoor ? 0.5 : 0, lightCol: th0.light || '#ffd8a8' };
  const ground = paintGround(A, pt, th0);
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(A.w, A.h), new THREE.MeshBasicMaterial({ map: canvasTex(ground) }));
  gm.rotation.x = -Math.PI / 2; gm.position.set(A.w / 2, 0, A.h / 2); root.add(gm);
  view.bg = pt.sky ? '#cfe2ff' : '#0c0810';
  overlays(A, view);
  propsView(A, th0, pt, view);
  view.update = (dt, t, focus) => {
    for (const u of view.updaters) u(dt, t);
    for (const f of view.fades) {
      const behind = focus.z < f.z - 0.2 && focus.z > f.z - f.h && Math.abs(focus.x - f.x) < f.w / 2 + 0.2;
      const want = behind ? 0.42 : 1; f.k += (want - f.k) * Math.min(1, dt * 9);
      const tr = f.k < 0.98; f.m.transparent = tr; f.m.opacity = f.k; f.m.alphaTest = tr ? 0.05 : 0.5; f.m.depthWrite = !tr;
    }
    for (const gt of Object.values(view.gates)) if (gt.open < gt.target) { gt.open = Math.min(1, gt.open + dt * 1.2); gt.grp.position.y = -gt.open * 3; gt.grp.visible = gt.open < 1; }
  };
  return view;
}

// ───────── 땅 그림판 ─────────
function paintGround(A, pt, th) {
  const W = A.w, H = A.h, c = cv(W * T, H * T), g = c.getContext('2d');
  const F = ts('floors', pt.f), WL = ts('walls', pt.f);
  const k = (x, y) => tileAt(A, x, y);
  const tile = (src, tx, ty, x, y) => g.drawImage(src, tx * T, ty * T, T, T, x * T, y * T, T, T);
  const quad = (src, tx, ty, q, x, y) => { const sx = tx * T + (q % 2) * 8, sy = ty * T + (q >> 1) * 8; g.drawImage(src, sx, sy, 8, 8, x * T + (q % 2) * 8, y * T + (q >> 1) * 8, 8, 8); };
  const fill = (name, x, y) => { const list = FILL[name]; const [tx, ty] = list[hsh(x, y) % list.length]; tile(F, tx, ty, x, y); };
  const isOpen = (kk) => kk !== WALL && kk !== VOID;
  const D4 = [[-1, -1, 'W', 'N'], [1, -1, 'E', 'N'], [-1, 1, 'W', 'S'], [1, 1, 'E', 'S']];
  // 1) 바닥
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const kk = A.t[y * W + x];
    if (kk === WATER || kk === LAVA) { liquid(g, x, y, kk === LAVA, pt, k(x, y - 1) !== kk); continue; }
    if (kk === VOID) continue;
    if (kk === ICE) { fill('ice', x, y); continue; }
    fill(pt.fill, x, y);
  }
  // 2) 둘레 모양 재료 (풀 · 돌길 · 흙길)
  if (pt.ring) {
    const [mat, on] = pt.ring, ox = RING[mat], want = on === 'G' ? T_G : PATH;
    const mine = (kk) => kk === want || (on === 'G' && kk === WIND);
    const inSet = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return true; const kk = A.t[y * W + x]; return mine(kk) || (on === 'G' && kk === WALL); };
    const DIAG = { NW: [3, 4], NE: [1, 4], SW: [3, 0], SE: [1, 0] }, HM = { W: [4, 2], E: [0, 2] }, VM = { N: [2, 4], S: [2, 0] }, CX = { NW: [3, 3], NE: [1, 3], SW: [3, 1], SE: [1, 1] };
    const fl = FILL[mat === 'grass' && th.dead ? 'grass2' : mat];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!mine(A.t[y * W + x])) continue;
      D4.forEach(([hx, vy, hn, vn], q) => {
        const h = inSet(x + hx, y), v = inSet(x, y + vy), d = inSet(x + hx, y + vy), dn = vn + hn;
        if (h && v && d) { const f = fl[hsh(x, y) % fl.length]; quad(F, f[0], f[1], q, x, y); return; }
        const t = h && v ? DIAG[dn] : v ? HM[hn] : h ? VM[vn] : CX[dn];
        quad(F, ox + t[0], t[1], q, x, y);
      });
    }
  }
  // 3) 디딤돌
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A.t[y * W + x] === STONE) {
    fill('stone', x, y);
    g.fillStyle = 'rgba(0,0,0,0.55)'; if (k(x, y + 1) !== STONE) g.fillRect(x * T, y * T + T - 3, T, 3); if (k(x - 1, y) !== STONE) g.fillRect(x * T, y * T, 1, T); if (k(x + 1, y) !== STONE) g.fillRect(x * T + T - 1, y * T, 1, T); if (k(x, y - 1) !== STONE) g.fillRect(x * T, y * T, T, 1);
  }
  // 4) 낭떠러지 (구멍)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A.t[y * W + x] === VOID) {
    if (pt.sky) { g.fillStyle = (x + y) % 3 ? '#cfe2ff' : '#d8e8ff'; g.fillRect(x * T, y * T, T, T); }
    else { g.fillStyle = '#07050a'; g.fillRect(x * T, y * T, T, T); }
    const up = k(x, y - 1);
    if (isOpen(up)) { tile(WL, pt.cliff + 2 + (x % 2), 12, x, y); if (k(x, y + 1) === VOID) { g.globalAlpha = 0.6; tile(WL, pt.cliff + 2 + (x % 2), 13, x, y + 1); g.globalAlpha = 1; } }
    g.fillStyle = 'rgba(0,0,0,0.6)';
    if (isOpen(k(x - 1, y))) g.fillRect(x * T, y * T, 2, T);
    if (isOpen(k(x + 1, y))) g.fillRect(x * T + T - 2, y * T, 2, T);
  }
  if (pt.sky) for (let i = 0; i < W * H / 30; i++) { const x = hsh(i, 5) % W, y = hsh(11, i) % H; if (A.t[y * W + x] === VOID && k(x, y - 1) === VOID) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(x * T + 8, y * T + 8, 14, 5, 0, 0, 7); g.fill(); } }
  // 5) 절벽 (벽)
  const inW = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? true : A.t[y * W + x] === WALL;
  const BF = [2, 2], BH = { W: [0, 2], E: [5, 2] }, BV = { N: [2, 0], S: [2, 4] }, BC = { NW: [0, 1], NE: [5, 1], SW: [0, 4], SE: [5, 4] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (A.t[y * W + x] !== WALL) continue;
    if (A.kind === 'town' && !(x <= 0 || y <= 1 || x >= W - 1 || y >= H - 2)) { fill(pt.fill, x, y); continue; } // 마을 집 자리
    let d = 1; while (y + d < H && inW(x, y + d)) d++;
    if (y + d < H && d <= 2) {
      const row = d === 1 ? (pt.grassy ? 8 : pt.snowy ? 10 : 7) : 6;
      for (let q = 0; q < 4; q++) { const hx = q % 2 ? 1 : -1, side = inW(x + hx, y); const col = side ? (q % 2 ? 3 : 2) : (hx < 0 ? 0 : 5); quad(WL, pt.cliff + col, row, q, x, y); }
      continue;
    }
    D4.forEach(([hx, vy, hn, vn], q) => {
      const h = inW(x + hx, y), v = inW(x, y + vy), dn = vn + hn;
      const t = h && v ? BF : v ? BH[hn] : h ? BV[vn] : BC[dn];
      quad(WL, pt.cliff + t[0], t[1], q, x, y);
    });
    if (A.cave && d > 3 && inW(x - 1, y) && inW(x + 1, y) && inW(x, y - 1)) { g.fillStyle = 'rgba(8,4,12,0.55)'; g.fillRect(x * T, y * T, T, T); }
  }
  // 6) 바람길 · 꽃 · 자갈
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A.t[y * W + x] === WIND) { g.fillStyle = 'rgba(220,255,240,0.3)'; g.fillRect(x * T, y * T, T, T); }
  const V = IMG.veg, deco = [[6, 150, 5, 8], [21, 150, 8, 6], [36, 149, 10, 9], [5, 165, 7, 9], [21, 164, 7, 10], [3, 178, 11, 13], [20, 180, 9, 11]], peb = [[84, 37, 8, 6], [35, 53, 10, 7], [69, 54, 7, 6], [180, 37, 8, 6]];
  for (const p of A.props) if (p.kind === 'flower') {
    const r = pt.grassy ? deco[(p.v + p.x) % deco.length] : peb[p.v % peb.length];
    g.drawImage(pt.grassy ? V : ts('rocks', pt.f), r[0], r[1], r[2], r[3], p.x * T + (hsh(p.x, p.y) % 8), p.y * T + (hsh(p.y, p.x) % 6), r[2], r[3]);
  }
  if (A.cave) { const RK = ts('rocks', pt.f); for (let i = 0; i < W * H / 40; i++) { const x = hsh(i, 3) % W, y = hsh(7, i) % H; if (A.t[y * W + x] === FLOOR) g.drawImage(RK, 65, 17, 31, 14, x * T - 8, y * T + 2, 31, 14); } }
  return c;
}
// 물 · 용암: 물결무늬를 직접 찍는다
function liquid(g, x, y, lava, pt, shore) {
  const X = x * T, Y = y * T, h = hsh(x, y);
  const base = lava ? ['#c8401a', '#e8641e', '#ff9a2a', '#ffd860'] : pt.f && pt.f.hue > 10 ? ['#3a5a4a', '#4a6e58', '#6a8e70', '#9ab8a0'] : ['#2e6ec8', '#3c86de', '#64a8ee', '#bfe4ff'];
  g.fillStyle = base[0]; g.fillRect(X, Y, T, T);
  g.fillStyle = base[1]; for (let i = 0; i < 4; i++) { const yy = (i * 4 + (h % 3)) % 16; g.fillRect(X + ((h >> i) % 6), Y + yy, 8 + (i % 3) * 2, 2); }
  g.fillStyle = base[2]; for (let i = 0; i < 3; i++) { const xx = (h * (i + 3)) % 13, yy = (h * (i + 7)) % 14; g.fillRect(X + xx, Y + yy, lava ? 2 : 3, 1); }
  if (lava) { g.fillStyle = base[3]; g.fillRect(X + (h % 12), Y + ((h >> 2) % 12), 2, 2); g.fillStyle = 'rgba(60,20,10,0.5)'; if (h % 3 === 0) g.fillRect(X + (h % 9), Y + ((h >> 3) % 10), 5, 3); }
  if (shore) { g.fillStyle = lava ? 'rgba(60,16,8,0.7)' : 'rgba(10,30,60,0.45)'; g.fillRect(X, Y, T, 3); g.fillStyle = lava ? 'rgba(255,230,120,0.5)' : 'rgba(255,255,255,0.35)'; g.fillRect(X, Y + 4, T, 1); }
}
function overlays(A, view) {
  const cells = (kind) => { const out = []; for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (A.t[y * A.w + x] === kind) out.push([x, y]); return out; };
  const flat = (list, m, uvK) => {
    const geo = new THREE.BufferGeometry(), p = [], uv = [], ix = []; let v = 0;
    for (const [x, y] of list) { p.push(x, 0.02, y, x + 1, 0.02, y, x + 1, 0.02, y + 1, x, 0.02, y + 1); if (uvK) uv.push(x / 2, y / 2, (x + 1) / 2, y / 2, (x + 1) / 2, (y + 1) / 2, x / 2, (y + 1) / 2); ix.push(v, v + 2, v + 1, v, v + 3, v + 2); v += 4; }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); if (uvK) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ix);
    const o = new THREE.Mesh(geo, m); view.root.add(o); return o;
  };
  const lava = cells(LAVA);
  if (lava.length) { const m = new THREE.MeshBasicMaterial({ color: '#ff6a20', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }); flat(lava, m); view.updaters.push((dt, t) => { m.opacity = 0.14 + Math.sin(t * 2.2) * 0.1; }); }
  const wind = cells(WIND);
  if (wind.length) {
    const c = cv(32, 32), g = c.getContext('2d'); g.fillStyle = '#e8fff6';
    for (const [yy, xx] of [[8, 4], [22, 16]]) { g.fillRect(xx, yy, 12, 2); g.fillRect(xx, yy - 2, 2, 2); g.fillRect(xx, yy + 2, 2, 2); g.fillRect(xx + 2, yy - 4, 2, 2); g.fillRect(xx + 2, yy + 4, 2, 2); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    flat(wind, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false }), 1);
    view.updaters.push((dt, t) => { tex.offset.x = (t * 1.6) % 1; });
  }
  const water = cells(WATER);
  if (water.length) { const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }); flat(water, m); view.updaters.push((dt, t) => { m.opacity = 0.04 + Math.sin(t * 1.3) * 0.04; }); }
}

// ───────── 세워 놓는 그림 ─────────
const SPR = new Map();
function spr(key, make) { if (!SPR.has(key)) SPR.set(key, make()); return SPR.get(key); }
const R = (name, x, y, w, h, f) => () => trim(crop(name, x, y, w, h, filt(f)));
const TREES = {
  oak: [R('tree_oak', 0, 0, 48, 96), R('tree_oak', 48, 0, 48, 96), R('tree_oak', 0, 96, 48, 96), R('tree_oak', 48, 96, 48, 96)],
  oakBare: [R('tree_oak', 96, 0, 48, 96), R('tree_oak', 96, 96, 48, 96)], oakSnow: [R('tree_oak', 144, 0, 48, 96), R('tree_oak', 144, 96, 48, 96)],
  pine: [R('tree_pine', 4, 9, 54, 103), R('tree_pine', 68, 9, 54, 103), R('tree_pine', 4, 121, 54, 103), R('tree_pine', 68, 121, 54, 103)],
  pineBare: [R('tree_pine', 141, 17, 43, 95)],
  tall: [R('tree_tall', 0, 1, 63, 143), R('tree_tall', 64, 1, 63, 143), R('tree_tall', 0, 145, 63, 143), R('tree_tall', 64, 145, 63, 143)],
  small: [R('tree_small', 3, 1, 45, 95), R('tree_small', 67, 1, 45, 95)],
};
const TREE_BY = { meadow: ['oak', 'small', 'oak'], forest: ['oak', 'pine', 'tall'], river: ['oak', 'small'], swamp: ['tall', 'oakBare', 'pineBare'], snow: ['pine', 'oakSnow'], sky: ['small', 'oak'], desert: ['oakBare'], library: ['oakBare'], ash: ['pineBare', 'oakBare'] };
const BUSH = [R('veg', 198, 6, 35, 33), R('veg', 246, 6, 35, 33), R('veg', 194, 51, 28, 26), R('veg', 194, 86, 39, 33)];
const ROCK = [R('rocks', 35, 19, 26, 27), R('rocks', 131, 19, 26, 27), R('rocks', 35, 115, 26, 27), R('rocks', 65, 17, 31, 14)];
const SPIRE = [R('rocks', 2, 19, 28, 43), R('rocks', 98, 19, 28, 43), R('rocks', 2, 115, 28, 43)];
const CRYSTAL = R('rocks', 146, 279, 12, 25);
function pick(list, p) { return list[(p.v ?? hsh(p.x, p.y)) % list.length]; }
function stand(view, c, x, z, o = {}) {
  const s = sprite(c, { sink: o.sink ?? 2 / PX });
  if (o.fade) { s.material = s.material.clone(); view.fades.push({ x, z, w: s.userData.w, h: s.userData.h, m: s.material, k: 1 }); }
  s.position.set(x, 0, z); view.root.add(s); return s;
}
function propsView(A, th, pt, view) {
  const theme = A.theme, treeKinds = TREE_BY[theme] || ['oak'];
  const tf = theme === 'swamp' || theme === 'ash' || theme === 'sky' ? pt.f : null;
  for (const p of A.props) {
    const x = p.x + 0.5, z = p.y + 0.85, v = p.v || 0;
    if (p.kind === 'tree') { const kind = treeKinds[v % treeKinds.length]; const c = spr(`t${kind}${v % 4}${theme}`, () => refilter(pick(TREES[kind], p)(), tf)); stand(view, c, x, z, { fade: 1, sink: 3 / PX }); }
    else if (p.kind === 'bush') stand(view, spr(`b${v % 4}${theme}`, () => refilter(pick(BUSH, p)(), pt.f)), x, z, { fade: 1 });
    else if (p.kind === 'rock') stand(view, spr(`r${v % 4}${theme}`, () => refilter(pick(ROCK, p)(), pt.f)), x, z);
    else if (p.kind === 'spire' || p.kind === 'stalagmite') stand(view, spr(`s${v % 3}${theme}`, () => refilter(pick(SPIRE, p)(), pt.f)), x, z, { fade: 1 });
    else if (p.kind === 'icerock') stand(view, spr(`ir${v % 3}`, () => refilter(pick(SPIRE, p)(), { hue: 180, sat: 0.5, bright: 1.5 })), x, z);
    else if (p.kind === 'shelf') stand(view, spr(`shelf${v % 3}`, () => shelf(v)), x, z, { fade: 1 });
    else if (p.kind === 'brazier') {
      const g = new THREE.Group(); g.position.set(x, 0, z - 0.3);
      const pit = sprite(spr('brz0', () => trim(crop('bonfire', 32, 0, 32, 32))), { sink: 0 }); g.add(pit); const pitOn = spr('brz1', () => trim(crop('bonfire', 0, 0, 32, 32)));
      const fires = spr('fires', () => [0, 1, 2, 3].map((i) => trim(crop('fire', i * 32, 0, 32, 48))));
      const fire = sprite(fires[0], { sink: -3 / PX }); fire.position.z = 0.02; fire.visible = false; g.add(fire);
      const num = labelSprite('?'); num.position.set(0, 2.4, 0.05); num.visible = false; g.add(num);
      view.root.add(g);
      let fi = 0; view.updaters.push((dt, t) => { if (!fire.visible) return; const f = Math.floor(t * 8) % 4; if (f !== fi) { fi = f; fire.material.map = canvasTex(fires[f]); } });
      (view.objs[p.puzzle] = view.objs[p.puzzle] || []).push({ kind: 'brazier', g, fire, num, x: p.x, y: p.y, light(on) { fire.visible = on; pit.material.map = canvasTex(on ? pitOn : spr('brz0', () => null)); } });
    } else if (p.kind === 'crystal') {
      const on = spr('cr_on', () => { const b = CRYSTAL(); const o = cv(b.width * 2, b.height * 2), og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(b, 0, 0, o.width, o.height); return refilter(o, { bright: 1.35, sat: 1.4 }); });
      const off = spr('cr_off', () => refilter(on, { sat: 0, bright: 0.45 }));
      const g = new THREE.Group(); g.position.set(x, 0, z);
      g.add(sprite(spr('ped', () => pedestal()), { sink: 0 }));
      const cr = sprite(off, { sink: -8 / PX }); cr.position.z = 0.02; g.add(cr);
      const glow = sprite(glowDot('#7ad8ff'), { anchor: 'center', blend: 1, add: 1, scale: 1.6 }); glow.position.set(0, 1.6, 0.03); glow.visible = false; g.add(glow);
      view.root.add(g);
      view.updaters.push((dt, t) => { if (glow.visible) glow.material.opacity = 0.5 + Math.sin(t * 4 + p.x) * 0.25; });
      (view.objs[p.puzzle] = view.objs[p.puzzle] || []).push({ kind: 'crystal', g, x: p.x, y: p.y, setOn(val) { cr.material.map = canvasTex(val ? on : off); glow.visible = !!val; } });
    } else if (p.kind === 'warpstone') {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      g.add(sprite(spr('warp', () => warpStone()), { sink: 0 }));
      const glow = sprite(glowDot('#8ad8ff'), { anchor: 'center', blend: 1, add: 1, scale: 2.2 }); glow.position.set(0, 2.5, 0.05); g.add(glow);
      view.root.add(g); view.updaters.push((dt, t) => { glow.material.opacity = 0.55 + Math.sin(t * 2) * 0.3; glow.position.y = 2.5 + Math.sin(t * 2) * 0.1; });
    }
  }
  for (const s of A.signs) stand(view, spr(s.tablet ? 'tablet' : 'sign', () => (s.tablet ? tablet() : sign())), s.x + 0.5, s.y + 0.8, { sink: 0 });
  for (const f of A.finds) {
    const g = new THREE.Group(); g.position.set(f.x, 0, f.y + 0.3);
    if (f.pet) g.add(sprite(spr('kbush', () => BUSH[0]()), { sink: 2 / PX }));
    else if (f.id.startsWith('herb')) g.add(sprite(spr('herb', () => refilter(trim(crop('veg', 195, 161, 11, 31)), { hue: 140, bright: 1.4, sat: 1.4 })), { sink: 0 }));
    else if (f.id.startsWith('trav')) g.add(sprite(spr('trav', () => frozenMan()), { sink: 0 }));
    const sp = sprite(glowDot('#fff6a0'), { anchor: 'center', blend: 1, add: 1, scale: 0.9 }); sp.position.set(0, 1.9, 0.1); g.add(sp);
    view.root.add(g); view.finds[f.id] = g;
    view.updaters.push((dt, t) => { sp.position.y = 1.9 + Math.sin(t * 3) * 0.15; sp.material.opacity = 0.6 + Math.sin(t * 5) * 0.3; });
  }
  for (const h of A.houses) {
    const c = spr('house_' + h.kind, () => (h.kind === 'tower' ? tower() : house(h.kind)));
    const zz = h.kind === 'tower' ? h.y + 2.95 : h.y + 1.95;
    stand(view, c, h.x + 0.5, zz, { fade: 1, sink: 0 });
    if (h.role && h.role !== 'exam') { const ic = { 'shop:potion': '🧪', 'shop:staff': '🪄', 'shop:cloth': '👒', 'shop:general': '🎒', smith: '⚒️', pet: '🐾', quest: '📜' }[h.role]; if (ic) { const sg = labelSprite(ic, true); sg.position.set(h.x + 0.5 + 3.1, 2.1, zz + 0.1); view.root.add(sg); } }
  }
  for (const [x, y] of A.lamps || []) {
    stand(view, spr('lamp', () => lampPost()), x + 0.5, y + 0.8, { sink: 0 });
    const gl = sprite(glowDot('#ffd890'), { anchor: 'center', blend: 1, add: 1, scale: 1.8 }); gl.position.set(x + 0.5, 2.25, y + 0.85); view.root.add(gl);
  }
  for (const g of A.gates) {
    const grp = new THREE.Group();
    for (let y = g.y0; y <= g.y1; y++) { const s = sprite(spr(g.boss ? 'bars_b' : 'bars', () => bars(!!g.boss)), { sink: 0 }); s.position.set(g.x + 0.5, 0, y + 0.9); grp.add(s); }
    view.root.add(grp); view.gates[g.puzzle] = { grp, open: 0, target: 0 };
  }
}
function refilter(c, f) { if (!f) return c; const o = cv(c.width, c.height), g = o.getContext('2d'); g.filter = filt(f); g.drawImage(c, 0, 0); return o; }
const DOTS = new Map();
export function glowDot(col) {
  if (DOTS.has(col)) return DOTS.get(col);
  const c = cv(16, 16), g = c.getContext('2d'), [r, gg, b] = hex(col);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d < 1) { g.fillStyle = `rgba(${r},${gg},${b},${(Math.round((1 - d) * 4) / 4).toFixed(2)})`; g.fillRect(x, y, 1, 1); } }
  DOTS.set(col, c); return c;
}

// ── 코드로 그린 작은 물건 (검은 테두리로 에셋과 맞춤) ──
const O = [24, 16, 24, 255];
function sign() { const p = new Pix(16, 20); p.rect(7, 8, 8, 19, [110, 74, 44]); p.rect(1, 2, 14, 10, [176, 128, 76]); p.rect(2, 3, 13, 9, [200, 150, 92]); for (const y of [5, 7]) p.line(4, y, 11, y, [120, 84, 50]); p.outline(O); return p.toCanvas(); }
function tablet() { const p = new Pix(18, 22); p.rect(2, 2, 15, 21, [130, 130, 140]); p.rect(3, 3, 14, 20, [160, 160, 172]); for (let y = 6; y < 18; y += 3) p.line(5, y, 12, y, [90, 150, 220]); p.rect(1, 19, 16, 21, [100, 100, 110]); p.outline(O); return p.toCanvas(); }
function pedestal() { const p = new Pix(18, 12); p.rect(2, 3, 15, 11, [96, 96, 110]); p.rect(3, 3, 14, 5, [130, 130, 148]); p.outline(O); return p.toCanvas(); }
function lampPost() { const p = new Pix(10, 40); p.rect(4, 8, 5, 39, [58, 58, 66]); p.rect(2, 36, 7, 39, [70, 70, 80]); p.rect(1, 1, 8, 8, [70, 70, 80]); p.rect(2, 2, 7, 7, [255, 220, 140]); p.outline(O); return p.toCanvas(); }
function bars(boss) { const p = new Pix(16, 40), c = boss ? [140, 90, 220] : [90, 90, 104]; for (const x of [2, 7, 12]) p.rect(x, 4, x + 1, 39, c); p.rect(0, 2, 15, 5, boss ? [90, 50, 150] : [110, 80, 56]); p.rect(0, 20, 15, 21, shade(c, 0.8)); if (boss) for (const x of [4, 9]) p.rect(x, 8, x + 1, 36, [200, 160, 255, 120]); p.outline(O); return p.toCanvas(); }
function shelf(v) { const p = new Pix(16, 34), books = [[168, 60, 60], [60, 90, 160], [70, 140, 80], [200, 168, 80], [140, 90, 168]]; p.rect(0, 0, 15, 33, [110, 74, 46]); for (let k = 0; k < 3; k++) { const y = 3 + k * 10; p.rect(1, y, 14, y + 8, [60, 40, 26]); for (let b = 0; b < 6; b++) p.rect(2 + b * 2, y + 1 + ((b + v) % 2), 3 + b * 2, y + 8, books[(b + k + v) % 5]); } p.outline(O); return p.toCanvas(); }
function warpStone() { const p = new Pix(24, 44); p.ellipse(1, 34, 22, 43, [100, 100, 116]); p.poly([[7, 38], [6, 14], [12, 8], [18, 14], [17, 38]], [130, 130, 146]); p.poly([[9, 36], [9, 15], [12, 11], [12, 36]], [160, 160, 176]); for (let y = 18; y < 34; y += 4) p.line(10, y, 14, y, [120, 210, 255]); p.poly([[12, 0], [16, 5], [12, 10], [8, 5]], [140, 220, 255]); p.point(11, 3, [255, 255, 255]); p.outline(O); return p.toCanvas(); }
function frozenMan() { const p = new Pix(22, 34); p.rect(3, 2, 18, 33, [190, 230, 250, 200]); p.ellipse(7, 4, 14, 12, [240, 210, 180]); p.rect(6, 13, 15, 26, [120, 80, 60]); p.rect(7, 27, 9, 32, [70, 50, 40]); p.rect(12, 27, 14, 32, [70, 50, 40]); for (let y = 4; y < 32; y += 6) p.line(4, y, 6, y - 2, [255, 255, 255]); p.outline([40, 80, 120, 255]); return p.toCanvas(); }
function house(kind) {
  const roofF = { potion: { hue: -60 }, staff: { hue: -15, sat: 1.3 }, cloth: { hue: 20 }, general: { hue: 220, sat: 0.7 }, smith: { sat: 0.15, bright: 0.65 }, pet: { hue: 300, sat: 1.1, bright: 1.15 }, hall: { hue: -10, bright: 0.85 }, house: { hue: 170, sat: 0.8 } }[kind] || null;
  const green = kind === 'cloth' || kind === 'potion';
  const c = cv(128, 132), g = c.getContext('2d');
  const wallX = { smith: 0, hall: 96, house: 192, potion: 384, staff: 288, cloth: 384, general: 480, pet: 384 }[kind] ?? 192, wy = 74;
  g.drawImage(IMG.bwalls, wallX, 184, 96, 56, 0, wy, 96, 56); g.drawImage(IMG.bwalls, wallX + 32, 184, 32, 56, 96, wy, 32, 56);
  const roof = cv(128, 90), rg = roof.getContext('2d'); if (roofF) rg.filter = filt(roofF);
  rg.drawImage(IMG.roofs, green ? 128 : 0, 6, 128, 90, 0, 0, 128, 90);
  g.drawImage(roof, 0, 0);
  g.drawImage(IMG.bprops, 101, 29, 22, 35, 53, wy + 21, 22, 35);
  for (const x of [14, 92]) g.drawImage(IMG.bprops, 150, 104, 20, 23, x, wy + 16, 20, 23);
  return trim(c);
}
function tower() {
  const W = 80, H = 176, c = cv(W, H), g = c.getContext('2d');
  for (let y = 64; y < H; y += 16) for (let x = 8; x < 72; x += 16) g.drawImage(IMG.dungeon, 16 + ((x + y) % 32), 16, 16, 16, x, y, 16, 16);
  g.fillStyle = 'rgba(70,80,160,0.25)'; g.fillRect(8, 64, 64, H - 64);
  const p = new Pix(W, H);
  p.rect(8, 64, 8, H - 1, O); p.rect(71, 64, 71, H - 1, O); p.rect(8, H - 1, 71, H - 1, O);
  p.poly([[2, 66], [40, 2], [78, 66]], [56, 72, 150]); p.poly([[40, 4], [76, 64], [40, 64]], [44, 56, 126]); for (let y = 16; y < 64; y += 8) p.line(40 - (y - 2) * 0.58, y, 40 + (y - 2) * 0.58, y, [80, 96, 180]);
  p.rect(30, 140, 49, H - 2, [80, 56, 40]); p.rect(32, 142, 47, H - 2, [110, 76, 50]); p.disc(40, 142, 10, [80, 56, 40]); p.disc(40, 142, 8, [110, 76, 50]);
  for (const y of [86, 112]) { p.rect(34, y, 45, y + 12, [255, 224, 140]); p.rect(39, y, 40, y + 12, [120, 90, 50]); }
  p.disc(40, 1, 3, [255, 230, 140]);
  p.outline(O);
  g.drawImage(p.toCanvas(), 0, 0);
  return c;
}
export function labelSprite(text, big) {
  const c = cv(32, 32), g = c.getContext('2d');
  const draw = (tx, col = '#fff') => { g.clearRect(0, 0, 32, 32); g.fillStyle = 'rgba(20,14,30,0.85)'; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(tx, 16, 17); };
  draw(text);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(big ? 1.4 : 1.1, big ? 1.4 : 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  s.userData.setText = (tx) => { draw(tx, '#ffe28a'); t.needsUpdate = true; };
  return s;
}
