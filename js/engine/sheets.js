// 픽셀 그림 모음: Pixel Crawler 에셋(Anokolisa) 시트를 불러와 프레임으로 자르고,
// 맨몸 캐릭터(Body_A)에 옷·머리·모자·지팡이를 그려 입혀 주인공·마을 사람을 만든다.
// 에셋에 없는 몬스터·펫은 art.js로 같은 크기의 픽셀 그림을 그리고 검은 테두리를 둘러 맞춘다.
import { Pix, hex, shade, tint, makeCanvas } from './pix.js';
import * as ART from './art.js';

export const IMG = {};
const FILES = ['floors', 'walls', 'dungeon', 'veg', 'rocks', 'eso', 'tree_oak', 'tree_pine', 'tree_tall', 'tree_small', 'bwalls', 'roofs', 'bprops', 'bonfire', 'fire', 'anvil'];
for (const a of ['idle', 'walk', 'run', 'hit', 'death']) for (const d of ['down', 'side', 'up']) FILES.push(`body/${a}_${d}`);
for (const n of ['wizzard', 'knight', 'rogue']) for (const a of ['idle', 'run', 'death']) FILES.push(`npc/${n}_${a}`);
FILES.push('npc/peasant_idle', 'npc/peasant_run', 'npc/taverna_idle', 'npc/taverna_run', 'npc/tavernb_idle', 'npc/tavernb_run');
for (const n of ['orc', 'orc_rogue', 'orc_shaman', 'orc_warrior', 'skel', 'skel_mage', 'skel_rogue', 'skel_warrior']) for (const a of ['idle', 'run', 'death']) FILES.push(`mob/${n}_${a}`);

export async function loadImages(base = '', onP = () => {}) {
  let done = 0;
  await Promise.all(FILES.map((f) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { IMG[f] = im; onP(++done / FILES.length); res(); }; im.onerror = () => rej(new Error('그림을 못 불러옴: ' + f)); im.src = `${base}assets/px/${f}.png`; })));
}

// ── 기본 도구 ──
export function cv(w, h) { const c = makeCanvas(w, h); const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; return c; }
export function crop(name, x, y, w, h, filter) {
  const c = cv(w, h), g = c.getContext('2d'); if (filter) g.filter = filter;
  g.drawImage(IMG[name], x, y, w, h, 0, 0, w, h); return c;
}
// 투명한 가장자리 잘라내기
export function trim(c) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  const o = cv(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
}
export const filt = (f) => (f ? `hue-rotate(${f.hue || 0}deg) saturate(${f.sat ?? 1}) brightness(${f.bright ?? 1})${f.sepia ? ` sepia(${f.sepia})` : ''}` : null);
function refilter(c, f) { if (!f) return c; const o = cv(c.width, c.height), g = o.getContext('2d'); g.filter = filt(f); g.drawImage(c, 0, 0); return o; }
function sheetFrames(name, f) { const im = IMG[name], S = im.height, n = Math.round(im.width / S); const out = []; for (let i = 0; i < n; i++) out.push(crop(name, i * S, 0, S, S, filt(f))); return out; }
const pixToC = (p) => p.toCanvas();

// ── 프레임 묶음 → 한 장짜리 그림판(atlas) ──
// set: { S, anims: { idle: { down:[c], side:[c], up:[c] } ... }, sideOnly, faceLeft }
function finish(set) {
  const all = [];
  for (const a of Object.values(set.anims)) for (const d of Object.keys(a)) for (const c of a[d]) all.push(c);
  const S = set.S, cols = Math.min(16, all.length), rows = Math.ceil(all.length / cols);
  const atlas = cv(cols * S, rows * S), g = atlas.getContext('2d');
  let i = 0; const idx = new Map();
  for (const c of all) { if (idx.has(c)) continue; g.drawImage(c, (i % cols) * S, Math.floor(i / cols) * S); idx.set(c, i); i++; }
  const anims = {};
  for (const [k, a] of Object.entries(set.anims)) { anims[k] = {}; for (const d of Object.keys(a)) anims[k][d] = a[d].map((c) => idx.get(c)); }
  // 발끝·가운데·머리끝 (서 있는 프레임 기준)
  const base = set.anims.idle.down || set.anims.idle.side;
  let foot = 0, top = S, sx = 0, n = 0;
  for (const c of base) {
    const d = c.getContext('2d').getImageData(0, 0, S, S).data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 0) { if (y > foot) foot = y; if (y < top) top = y; sx += x; n++; }
  }
  return { ...set, atlas, cols, rows, anims, ax: n ? Math.round(sx / n) + 0.5 : S / 2, ay: foot + 1, top };
}

// ─────────── 사람 입히기 ───────────
const SK1 = [217, 160, 102], SK2 = [162, 101, 67], SK3 = [250, 200, 149];
const near = (d, i, c, t = 18) => Math.abs(d[i] - c[0]) < t && Math.abs(d[i + 1] - c[1]) < t && Math.abs(d[i + 2] - c[2]) < t;
const rgb = (s) => (Array.isArray(s) ? s : hex(s));
function dressFrame(src, look, dir) {
  const S = src.width, c = cv(S, S), g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, S, S), d = im.data;
  let top = S, bot = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3]) { if (y < top) top = y; if (y > bot) bot = y; }
  if (bot < 0) return c;
  const row = (y) => { let l = -1, r = -1; for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3]) { if (l < 0) l = x; r = x; } return [l, r]; };
  const skin = rgb(look.skin || '#f6d3b3'), shirt = rgb(look.robe || look.shirt || '#8a6a4a'), pants = rgb(look.robe || look.pants || '#4a4038'), shoes = rgb(look.shoes || '#4a3426');
  const hair = look.hair ? rgb(look.hair) : null;
  const put = (x, y, col, a = 255) => { if (x < 0 || y < 0 || x >= S || y >= S) return; const i = (y * S + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a; };
  const isOut = (i) => d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30;
  const H = bot - top; // 약 29
  for (let y = top; y <= bot; y++) {
    const rel = y - top, [l, r] = row(y);
    for (let x = l; x <= r; x++) {
      const i = (y * S + x) * 4; if (!d[i + 3] || isOut(i)) continue;
      const dark = near(d, i, SK2), lite = near(d, i, SK3), sk = near(d, i, SK1) || dark || lite;
      if (!sk) continue;
      let col;
      if (rel < 13) col = skin;
      else if (y >= bot - 1) col = shoes;
      else if (rel < 22) col = shirt;
      else col = pants;
      if (rel >= 13 && rel < 22 && look.apron && x > l + 3 && x < r - 3) col = [200, 190, 170];
      put(x, y, dark ? shade(col, 0.72) : lite ? tint(col, 0.25) : col);
      // 머리카락
      if (hair && rel < 13) {
        const w = r - l, back = dir === 'side' ? x <= l + Math.round(w * 0.5) : false;
        let hh = false;
        if (dir === 'up') hh = rel < 12;
        else if (dir === 'down') hh = rel < 4 || (rel < (look.hairLong ? 12 : 8) && (x <= l + 1 || x >= r - 1));
        else hh = rel < 4 || (rel < (look.hairLong ? 12 : 10) && back);
        if (hh) put(x, y, rel < 2 ? tint(hair, 0.2) : dark ? shade(hair, 0.75) : hair);
      }
      // 수염
      if (look.beard && rel >= 8 && rel < 13 && dir !== 'up') { const bc = rgb(look.beard === 1 ? (look.hair || '#d8d8d8') : look.beard); if (dir === 'down' ? x > l + 2 && x < r - 2 : x > l + (r - l) * 0.45) put(x, y, bc); }
    }
  }
  // 로브 자락: 다리 둘레를 넓힌다
  if (look.robe) {
    const rc = rgb(look.robe), trim = look.trim ? rgb(look.trim) : shade(rc, 0.6);
    for (let y = top + 19; y <= bot - 1; y++) {
      const [l, r] = row(y); if (l < 0) continue;
      const k = Math.min(3, Math.floor((y - top - 19) / 2) + 1);
      for (let x = l - k; x <= r + k; x++) { const i = (y * S + x) * 4; if (x === l - k || x === r + k) put(x, y, [0, 0, 0]); else if (!d[i + 3] || !isOut(i) || (x > l && x < r)) put(x, y, y >= bot - 2 ? trim : x < (l + r) / 2 ? rc : shade(rc, 0.85)); }
    }
    const [l, r] = row(bot); for (let x = l - 3; x <= r + 3; x++) put(x, bot, [0, 0, 0]);
  }
  if (look.ghostly) for (let i = 3; i < d.length; i += 4) if (d[i]) d[i] = 170;
  g.putImageData(im, 0, 0);
  // 머리 위·손에 드는 것은 따로 그려 테두리를 두른다
  const [hl, hr] = row(top + 6), cx = Math.round((hl + hr) / 2), p = new Pix(S, S);
  const side = dir === 'side', up = dir === 'up';
  if (look.hairStyle === 'messy' && hair && !look.hat && !look.hood) for (const dx of [-4, -1, 2, 4]) { p.point(cx + dx, top - 1, hair); p.point(cx + dx + 1, top - 2, hair); }
  if (look.hat) {
    const hc = rgb(look.hat), band = look.band ? rgb(look.band) : shade(hc, 0.6), by = top + 3;
    p.rect(hl - 3, by, hr + 3, by + 1, shade(hc, 0.85)); p.rect(hl - 2, by, hr + 2, by, hc);
    p.rect(hl + 1, by - 1, hr - 1, by - 1, band);
    const tipDx = side ? -5 : up ? -3 : 4;
    p.poly([[hl + 1, by - 1], [hr - 1, by - 1], [cx + 1, by - 7], [cx + tipDx, by - 10], [cx - 1, by - 6]], hc);
    p.line(cx - 1, by - 3, cx + 1, by - 5, tint(hc, 0.2));
    if (look.gem) p.point(cx, by - 1, rgb(look.gem));
  }
  if (look.hood) { const hc = rgb(look.hood); for (let y = top - 1; y < top + 11; y++) { const [l, r] = row(Math.max(top, y)); for (let x = l - 1; x <= r + 1; x++) { const face = !up && y > top + 3 && (side ? x > cx - 1 : x > l + 2 && x < r - 2); if (!face) p.point(x, y, y === top - 1 ? tint(hc, 0.15) : hc); } } p.poly([[cx - 2, top], [cx + (side ? -6 : 0), top - 4], [cx + 2, top]], hc); }
  if (look.helm) { const hc = rgb(look.helm); p.rect(hl - 1, top - 1, hr + 1, top + 4, hc); p.rect(hl, top - 1, hr, top, tint(hc, 0.3)); p.poly([[hl - 1, top + 1], [hl - 4, top - 4], [hl + 1, top]], [240, 230, 200]); p.poly([[hr + 1, top + 1], [hr + 4, top - 4], [hr - 1, top]], [240, 230, 200]); }
  if (look.crown) { const cc = rgb(look.crown); p.rect(hl + 1, top - 2, hr - 1, top - 1, cc); for (let x = hl + 1; x <= hr - 1; x += 2) p.point(x, top - 3, cc); }
  if (look.ears) { p.poly([[hl, top + 6], [hl - 4, top + 3], [hl, top + 8]], skin); p.poly([[hr, top + 6], [hr + 4, top + 3], [hr, top + 8]], skin); }
  if (look.tail) p.path([[cx - (side ? 4 : 0), top + 21], [cx - (side ? 9 : 2), top + 25], [cx - (side ? 12 : 4), top + 24]], skin, 2);
  if (look.wings) { const wc = rgb(look.wings); p.poly([[cx - 2, top + 14], [cx - 11, top + 8], [cx - 9, top + 18]], wc); p.poly([[cx + 2, top + 14], [cx + 11, top + 8], [cx + 9, top + 18]], wc); }
  // 손에 든 것
  const wp = look.weapon, [tl, tr] = row(top + 19), hx = side ? tr + 1 : up ? tl - 1 : tr + 1, hy = top + 20;
  const wood = look.wood ? rgb(look.wood) : [122, 82, 50];
  if (wp === 'staff') { p.line(hx, hy - 12, hx, hy + 5, wood); const oc = look.orb ? rgb(look.orb) : [180, 140, 255]; p.disc(hx, hy - 14, 2, oc); p.point(hx, hy - 15, tint(oc, 0.6)); }
  else if (wp === 'club') { p.line(hx, hy - 6, hx, hy + 2, [122, 82, 50]); p.rect(hx - 1, hy - 9, hx + 1, hy - 6, [100, 70, 40]); }
  else if (wp === 'sword') { p.line(hx, hy - 9, hx, hy, [220, 220, 230]); p.line(hx - 2, hy - 1, hx + 2, hy - 1, [140, 110, 50]); }
  else if (wp === 'spear') { p.line(hx, hy - 14, hx, hy + 5, [122, 82, 50]); p.poly([[hx - 1, hy - 14], [hx, hy - 18], [hx + 1, hy - 14]], [210, 210, 220]); }
  else if (wp === 'axe') { p.line(hx, hy - 9, hx, hy + 3, [100, 70, 40]); p.rect(hx + 1, hy - 9, hx + 3, hy - 5, [190, 190, 200]); }
  else if (wp === 'bow') { p.path([[hx, hy - 8], [hx + 2, hy - 4], [hx + 2, hy + 1], [hx, hy + 4]], [140, 100, 50]); }
  p.outline([0, 0, 0, 255]);
  const over = p.toCanvas();
  if (up && wp) { const o = cv(S, S), og = o.getContext('2d'); og.drawImage(over, 0, 0); og.drawImage(c, 0, 0); return o; }
  g.drawImage(over, 0, 0);
  return c;
}
const BODY_ANIMS = { idle: 'idle', walk: 'walk', run: 'run', hit: 'hit', death: 'death' };
function humanSet(look) {
  const anims = {};
  for (const [k, file] of Object.entries(BODY_ANIMS)) {
    anims[k] = {};
    for (const d of ['down', 'side', 'up']) anims[k][d] = sheetFrames(`body/${file}_${d}`).map((f) => dressFrame(f, look, d));
  }
  return finish({ S: 64, anims, sideOnly: false });
}
function packSet(name, f) {
  const idle = sheetFrames(`${name}_idle`, f), run = sheetFrames(`${name}_run`, f), death = sheetFrames(`${name}_death`, f);
  // 크기가 다른 시트(32·64)는 64로 맞춰 발끝을 같은 줄에
  const S = Math.max(idle[0].width, run[0].width, death[0].width);
  const fit = (list) => list.map((c) => { if (c.width === S) return c; const o = cv(S, S); o.getContext('2d').drawImage(c, Math.round((S - c.width) / 2), S - c.height); return o; });
  const set = { S, anims: { idle: { side: fit(idle) }, run: { side: fit(run) }, walk: { side: fit(run) }, death: { side: fit(death) }, hit: { side: fit(idle).slice(0, 2) } }, sideOnly: true };
  return finish(set);
}
function artSet(frames, o = {}) {
  const S = frames[0].w;
  const cs = frames.map((p) => { const q = p.flipX ? p : p; if (o.outline !== false) q.outline([20, 14, 20, 255]); return pixToC(q); });
  const set = { S, anims: { idle: { side: o.still ? [cs[0]] : cs }, run: { side: cs }, walk: { side: cs }, death: { side: [cs[0]] }, hit: { side: [cs[0]] } }, sideOnly: true, faceLeft: o.faceLeft !== false };
  return finish(set);
}

// ─────────── 몬스터 ───────────
const MON_PX = {
  goblin: ['mob/orc', null, 0.8], goblin_archer: ['mob/orc_rogue', null, 0.8], goblin_chief: ['mob/orc_warrior', { hue: -15, sat: 1.2 }, 1.6],
  lizardman: ['mob/orc', { hue: 95, sat: 0.9 }, 1], lizard_spear: ['mob/orc_rogue', { hue: 100 }, 1], lizard_captain: ['mob/orc_warrior', { hue: 100 }, 1.5],
  orc: ['mob/orc_warrior', { sat: 0.8, bright: 0.9 }, 1.05], orc_shaman: ['mob/orc_shaman', null, 1], orc_berserker: ['mob/orc_warrior', { hue: -70, sat: 1.4 }, 1.6], bolg: ['mob/orc_warrior', { hue: -30, bright: 0.8, sat: 1.3 }, 2],
  yeti: ['mob/orc_warrior', { hue: 140, sat: 0.15, bright: 1.7 }, 1.35], dragonkin: ['mob/orc_warrior', { hue: -95, sat: 0.9, bright: 0.85 }, 1.2],
  skeleton: ['mob/skel_warrior', null, 1], skeleton_mage: ['mob/skel_mage', null, 1], zombie: ['mob/skel', { hue: 70, sat: 0.6, bright: 0.85 }, 1], zombie_dry: ['mob/skel_rogue', { sepia: 0.7, bright: 1.05 }, 1.05], nekros: ['mob/skel_mage', { hue: 110, sat: 1.3 }, 1.6],
  morga: ['npc/wizzard', { hue: 165, sat: 0.8, bright: 0.8 }, 1.45], mirror: ['npc/wizzard', { hue: 165, sat: 0.8, bright: 0.8 }, 1.45], ceres: ['npc/wizzard', { hue: -95, sat: 0.6, bright: 1.35 }, 1.5],
  kai: ['npc/wizzard', { hue: -150, sat: 0.9 }, 1.4], baltar: ['npc/wizzard', { hue: 40, sat: 0.7, bright: 0.6 }, 1.5],
  cultist: ['npc/rogue', { hue: 200, sat: 0.4, bright: 0.55 }, 1], cult_mage: ['npc/rogue', { hue: 230, sat: 0.9, bright: 0.6 }, 1], dragon_priest: ['npc/wizzard', { hue: 70, sat: 1.4, bright: 0.7 }, 1.05],
  harpy: ['npc/rogue', { hue: -40, sat: 0.7, bright: 1.1 }, 1],
  exam_4: ['npc/wizzard', { hue: -60, sat: 0.6, bright: 1.3 }, 1.4],
};
const C = (h) => (h ? hex(h) : null);
function creatureFrames(m) {
  const c = C(m.c) || [140, 140, 140], c2 = C(m.c2);
  const f4 = (fn) => [0, 1, 2, 3].map(fn);
  switch (m.t) {
    case 'slime': return f4((f) => ART.slime({ c, acc: m.crown ? 'crown' : m.glow ? (m.c === '#e05a30' ? 'flame' : 'spark') : null }, f));
    case 'mushroom': return f4((f) => ART.mushroom({ c }, f));
    case 'beast': return f4((f) => ART.beast({ head: m.head, c, belly: c2, wings: m.wings ? C(m.wings) : m.head === 'drake' ? shade(c, 0.6) : null, mane: m.mane ? c2 : null, tail: m.head === 'wolf' ? 'bushy' : m.head === 'scorp' ? 'stinger' : m.head === 'lizard' || m.head === 'drake' ? 'long' : 'tuft', spikes: m.head === 'drake' ? [120, 30, 30] : null, headC: m.head === 'griffin' ? c2 : null }, f));
    case 'flyer': return f4((f) => ART.flyer({ kind: m.kind, c, wing: c2 }, f));
    case 'golem': return f4((f) => ART.golem({ c, deco: m.crystal ? 'ice' : m.lava ? 'lava' : m.gear ? 'gear' : m.rune ? 'rune' : null, eye: m.rune ? C(m.rune) : null }, f));
    case 'ghost': return f4((f) => ART.ghost({ c, deco: m.clock ? 'clock' : null }, f));
    case 'book': return f4((f) => ART.mimic({ c }, f));
    case 'dragon': return f4((f) => ART.dragon({ c, belly: c2 }, f, 64));
    default: return [objPix(m)];
  }
}
// 보스가 만드는 물건 (토템 · 통 · 피뢰침 · 영혼 그릇 · 시계 · 얼음 결정 · 화로)
function objPix(m) {
  const p = new Pix(32, 32), c = C(m.c) || [120, 120, 120], gl = C(m.glow) || [255, 220, 120];
  if (m.t === 'totem') { p.rect(12, 6, 19, 30, c); for (const y of [10, 20]) { p.rect(11, y, 20, y + 1, shade(c, 0.6)); p.point(13, y - 2, [255, 70, 40]); p.point(18, y - 2, [255, 70, 40]); } p.poly([[15, 0], [18, 4], [15, 7], [12, 4]], gl); }
  else if (m.t === 'barrel') { p.ellipse(8, 10, 23, 30, c); p.rect(8, 15, 23, 16, [60, 60, 66]); p.rect(8, 24, 23, 25, [60, 60, 66]); p.ellipse(10, 9, 21, 13, gl); }
  else if (m.t === 'rod') { p.rect(15, 6, 16, 30, c); p.rect(13, 28, 18, 30, shade(c)); p.disc(16, 5, 3, gl); p.point(15, 4, [255, 255, 255]); }
  else if (m.t === 'orb') { p.disc(16, 14, 8, c); p.disc(16, 14, 6, shade(gl, 0.6)); p.disc(14, 12, 2, gl); p.rect(12, 24, 19, 26, [80, 70, 90]); }
  else if (m.t === 'clockObj') { p.rect(15, 18, 16, 30, [90, 70, 50]); p.disc(16, 11, 8, [240, 230, 200]); p.ellipse(8, 3, 23, 18, c, 1); p.line(16, 11, 16, 6, [40, 30, 20]); p.line(16, 11, 20, 11, [40, 30, 20]); }
  else if (m.t === 'crystal') { p.poly([[16, 1], [24, 14], [16, 30], [8, 14]], c); p.poly([[16, 3], [19, 14], [16, 26], [12, 14]], tint(c, 0.5)); }
  else if (m.t === 'brazier') { p.rect(9, 12, 22, 15, c); p.poly([[9, 15], [22, 15], [18, 21], [13, 21]], shade(c)); p.rect(14, 21, 17, 30, shade(c, 0.6)); p.rect(11, 29, 20, 30, shade(c, 0.6)); }
  else p.disc(16, 16, 8, c);
  return p;
}
const cache = new Map();
export function monsterSet(id, model) {
  const key = 'm:' + id; if (cache.has(key)) return cache.get(key);
  let set;
  if (MON_PX[id]) set = packSet(MON_PX[id][0], MON_PX[id][1]);
  else if (model.t === 'human') set = humanSet({ ...model, weapon: model.weapon });
  else { const fr = creatureFrames(model); set = artSet(fr, { still: fr.length === 1 }); }
  set.scale = MON_PX[id] ? MON_PX[id][2] : (model.scale || 1) * (model.t === 'human' ? 1 : model.t === 'dragon' ? 0.55 : 0.95);
  set.ghost = !!model.ghostly;
  cache.set(key, set); return set;
}
export function heroSet(look) { const key = 'h:' + JSON.stringify(look); if (!cache.has(key)) cache.set(key, humanSet(look)); return cache.get(key); }

// ─────────── 마을 사람 ───────────
const NPC_PX = { orben: ['npc/wizzard', null], camp_captain: ['npc/knight', null], rina: ['npc/peasant', null], mira: ['npc/taverna', null], momo: ['npc/tavernb', null], petshop: ['npc/peasant', { hue: -70, sat: 1.2 }], sahar_elder: ['npc/rogue', { hue: 30, sat: 0.5, bright: 1.3 }], elder_liz: ['mob/orc_shaman', { hue: 95 }] };
function hashHue(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 7) * 50 - 150; }
function npcPeasant(name, f) {
  const idle = sheetFrames(`${name}_idle`, f), run = sheetFrames(`${name}_run`, f);
  return finish({ S: idle[0].width, anims: { idle: { side: idle }, run: { side: run }, walk: { side: run }, death: { side: [idle[0]] }, hit: { side: [idle[0]] } }, sideOnly: true });
}
export function npcSet(id, look) {
  const key = 'n:' + id; if (cache.has(key)) return cache.get(key);
  let spec = NPC_PX[id];
  if (!spec) {
    if (/^petshop\d/.test(id)) spec = ['npc/peasant', { hue: -70 + hashHue(id) / 3, sat: 1.2 }];
    else if (id.endsWith('_shop')) spec = ['npc/peasant', { hue: hashHue(id) }];
    else if (id.endsWith('_tailor')) spec = ['npc/taverna', { hue: hashHue(id) }];
    else if (id.endsWith('_general')) spec = ['npc/tavernb', { hue: hashHue(id) }];
  }
  let set;
  if (spec) set = /peasant|tavern/.test(spec[0]) ? npcPeasant(spec[0], spec[1]) : packSet(spec[0], spec[1]);
  else set = humanSet(look);
  set.scale = 1;
  cache.set(key, set); return set;
}

// ─────────── 펫 ───────────
export function petSet(p) {
  const key = 'p:' + p.id; if (cache.has(key)) return cache.get(key);
  const c = hex(p.c), c2 = hex(p.c2 || '#ffffff');
  let frames, sc = 0.55;
  const cat = (pal, mod) => [0, 1, 2, 3].map((f) => { const q = ART.cat(pal, f); if (mod) mod(q, f); return q; });
  if (p.model === 'cat') frames = cat({ base: c, dark: p.stripes ? hex(p.stripes) : shade(c, 0.7), belly: c2, pattern: p.stripes ? 'stripes' : 'none', eye: p.eye ? hex(p.eye) : null });
  else if (p.model === 'fox') frames = cat({ base: c, dark: shade(c, 0.6), belly: c2, pattern: 'none' }, (q, f) => { q.ellipse(25, 14, 31, 20, c); q.ellipse(29, 14, 31, 17, c2); });
  else if (p.model === 'bunny') frames = cat({ base: c, dark: shade(c, 0.85), belly: c2, pattern: 'none' }, (q, f) => { const b = [0, -1, 0, -1][f]; q.rect(4, -1 + b, 5, 6 + b, c); q.rect(9, -1 + b, 10, 6 + b, c); q.rect(4, 1 + b, 4, 5 + b, hex('#f0a8c0')); q.rect(9, 1 + b, 9, 5 + b, hex('#f0a8c0')); });
  else if (p.model === 'slime') { frames = [0, 1, 2, 3].map((f) => ART.slime({ c }, f)); sc = 0.5; }
  else if (p.model === 'wisp') { frames = [0, 1, 2, 3].map((f) => ART.flyer({ kind: 'wisp', c }, f)); sc = 0.6; }
  else if (p.model === 'golem') { frames = [0, 1, 2, 3].map((f) => ART.golem({ c, deco: 'rune' }, f)); sc = 0.5; }
  else if (p.model === 'dragon') { frames = [0, 1, 2, 3].map((f) => ART.dragon({ c, belly: c2 }, f, 32)); sc = 0.8; }
  else if (p.model === 'owl' || p.model === 'bird') frames = [0, 1, 2, 3].map((f) => { const q = new Pix(32, 32), y = [0, -1, -2, -1][f] + 6, w = [0, -3, -5, -2][f]; q.ellipse(9, 8 + y, 22, 22 + y, c); q.ellipse(12, 13 + y, 19, 22 + y, c2); q.poly([[9, 14 + y], [3, 10 + y + w], [6, 19 + y]], shade(c, 0.8)); q.poly([[22, 14 + y], [28, 10 + y + w], [25, 19 + y]], shade(c, 0.8)); const ec = p.model === 'owl' ? [240, 160, 30] : [20, 20, 20]; q.rect(12, 11 + y, 13, 12 + y, ec); q.rect(18, 11 + y, 19, 12 + y, ec); q.poly([[15, 14 + y], [16, 16 + y], [17, 14 + y]], [240, 180, 50]); if (p.model === 'owl') { q.poly([[10, 9 + y], [10, 5 + y], [13, 8 + y]], c); q.poly([[21, 9 + y], [21, 5 + y], [18, 8 + y]], c); } return q; });
  else if (p.model === 'turtle') frames = [0, 1, 2, 3].map((f) => { const q = new Pix(32, 32), b = f % 2; q.ellipse(6, 16, 25, 27, c2); for (const [x, y] of [[10, 19], [15, 18], [20, 19], [13, 22], [18, 22]]) q.rect(x, y, x + 2, y + 1, shade(c2, 0.75)); q.ellipse(1 + b, 18, 8 + b, 24, c); q.point(3 + b, 20, [20, 20, 20]); q.rect(8, 26, 10, 29, c); q.rect(21, 26, 23, 29, c); return q; });
  else frames = [0, 1, 2, 3].map(() => { const q = new Pix(32, 32); q.disc(16, 20, 6, c); return q; });
  const set = artSet(frames); set.scale = sc;
  if (p.glow) set.glow = p.glow;
  cache.set(key, set); return set;
}

// ─────────── 마법 탄 ───────────
export function projFrames(el, look) {
  const key = 'pr:' + el + look; if (cache.has(key)) return cache.get(key);
  const st = { fireball: 'fire', waterball: 'water', iceshard: 'ice', cutter: 'wind', shadow: 'dark', lightarrow: 'light', thorn: 'wood', rock: 'earth', clock: 'time', spark: 'storm', arrow: 'arrow', basic: null }[look] ?? null;
  const fr = [0, 1, 2, 3].map((f) => { const p = ART.projectile(el in ART.ELEM_PAL ? el : 'arcane', f, st || undefined); if (el === 'enemy') { /* 붉게 */ for (let i = 0; i < p.d.length; i += 4) if (p.d[i + 3]) { const v = (p.d[i] + p.d[i + 1] + p.d[i + 2]) / 3; p.d[i] = Math.min(255, v * 1.3 + 60); p.d[i + 1] = v * 0.45; p.d[i + 2] = v * 0.4; } } return p.toCanvas(); });
  cache.set(key, fr); return fr;
}
export { hex, shade, tint, Pix };
