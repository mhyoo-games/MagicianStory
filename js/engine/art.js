// 픽셀 그리기 (코드로 그리는 몬스터·펫·마법 탄). 고양이 캐럿은 웹툰 Pepper&Carrot(David Revoy, CC BY 4.0)을 바탕으로 다시 그린 것.
import { Pix, shade, tint, rng, makeCanvas } from './pix.js';

const EYE = [42, 26, 18], BLUSH = [241, 155, 138], MOUTH = [122, 59, 42], BOOT = [74, 44, 29];
const WOOD = [139, 90, 43], WHITE = [250, 250, 250];
export const SKINS = { light: [246, 211, 179], tan: [222, 172, 128], brown: [160, 106, 70] };

// ─────────────────────────── 사람 (4방향) ───────────────────────────
// o: { skin, hair, style, outfit, kind, pants, band, beard, hat:{c,band}, staff:{orb, wood},
//      ears, tusks, snout, tail, wings, weapon, wide, skeleton, hood, crown, helm, fur, eye }
export function human(o, dir, f, pose = 'walk') {
  const p = new Pix(32, 32);
  if (dir === 'right') return human(o, 'left', f, pose).flipX();
  const skin = o.skin || SKINS.light, hair = o.hair || [90, 60, 40], out = o.outfit || [200, 66, 58];
  const walk = pose === 'walk';
  const b = pose === 'idle' ? [0, 0, 1, 0][f] : walk ? [0, -1, 0, -1][f] : 0;
  const legs = walk ? [[1, 0], [0, 0], [0, 1], [0, 0]][f] : [0, 0];
  const arm = walk ? [1, 0, -1, 0][f] : 0;
  const kind = o.kind || 'dress';
  const bottom = { dress: 26, robe: 28, tunic: 24, fur: 27 }[kind];
  const wide = o.wide ? 1 : 0;

  // 뒤쪽 것들: 날개·꼬리·뒤로 드는 지팡이
  if (o.wings) wingsBack(p, o.wings, b, f, dir);
  if (o.tail && dir !== 'up') p.line(19, 24 + b, dir === 'left' ? 27 : 25, 28, o.tail, 2);

  if (dir === 'left') sideBody(p, o, f, b, pose, skin, hair, out, kind, bottom);
  else {
    // 다리
    if (kind === 'tunic' || kind === 'fur') {
      const pc = o.pants || shade(out);
      p.rect(12 - wide, 24 + b, 14 - wide, 28 - legs[0], pc); p.rect(17 + wide, 24 + b, 19 + wide, 28 - legs[1], pc);
    } else {
      p.rect(12, 26 + b, 13, 28 - legs[0], skin); p.rect(18, 26 + b, 19, 28 - legs[1], skin);
    }
    p.rect(11 - wide, 29 - legs[0], 14 - wide, 30 - legs[0], o.boot || BOOT); p.rect(17 + wide, 29 - legs[1], 20 + wide, 30 - legs[1], o.boot || BOOT);
    if (o.style === 'long' && dir === 'down') p.rect(8, 12 + b, 23, 23 + b, shade(hair, 0.85));
    if (o.style === 'long' && dir === 'up') p.rect(8, 12 + b, 23, 24 + b, hair);
    // 몸
    if (kind === 'fur') {
      p.ellipse(7 - wide, 15 + b, 24 + wide, 28 + b, out);
      p.ellipse(11, 19 + b, 20, 27 + b, tint(out, 0.25));
    } else {
      const ex = kind !== 'tunic' ? 1 : 0;
      p.poly([[12 - wide, 18 + b], [19 + wide, 18 + b], [21 + ex + wide, bottom + b], [10 - ex - wide, bottom + b]], out);
      p.line(10 - ex - wide, bottom + b, 21 + ex + wide, bottom + b, shade(out));
      if (o.skeleton) for (const y of [20, 22, 24]) p.line(13, y + b, 18, y + b, shade(out, 0.6));
      else if (kind === 'robe') { p.line(15, 19 + b, 15, 27 + b, o.band || shade(out, 0.6)); p.line(16, 19 + b, 16, 27 + b, o.band || shade(out, 0.6)); }
      else if (dir === 'down') p.line(12, 21 + b, 19, 21 + b, shade(out, 0.55));
    }
    // 팔
    const castUp = pose === 'cast';
    const ac = kind === 'fur' ? out : shade(out, 0.88);
    p.rect(9 - wide, 19 + b + arm, 10 - wide, 23 + b + arm, ac); p.rect(9 - wide, 24 + b + arm, 10 - wide, 24 + b + arm, skin);
    if (castUp && dir === 'down') { p.rect(21 + wide, 14, 22 + wide, 19, ac); p.rect(21 + wide, 13, 22 + wide, 13, skin); }
    else { p.rect(21 + wide, 19 + b - arm, 22 + wide, 23 + b - arm, ac); p.rect(21 + wide, 24 + b - arm, 22 + wide, 24 + b - arm, skin); }
    // 머리
    if (dir === 'down') frontHead(p, o, b, f, skin, hair, pose);
    else backHead(p, o, b, skin, hair);
  }
  // 손에 든 것
  if (o.staff) staffDraw(p, o.staff, dir, b, arm, pose, f);
  if (o.weapon) weaponDraw(p, o.weapon, dir, b, arm, o.weaponColor);
  if (o.hat && !o.hood && !o.helm) hatDraw(p, o.hat, dir, b);
  if (o.crown) crownDraw(p, o.crown, b, dir);
  if (o.helm) helmDraw(p, o.helm, b, dir);
  return p;
}

function frontHead(p, o, b, f, skin, hair, pose) {
  const st = o.style, blink = pose === 'idle' && f === 3;
  if (o.hood) p.ellipse(7, 5 + b, 24, 19 + b, o.hood);
  else if (st !== 'bald' && st !== 'none') p.ellipse(8, 6 + b, 23, 18 + b, hair);
  if (st === 'pigtails') { p.ellipse(4, 12 + b, 9, 18 + b, hair); p.ellipse(22, 12 + b, 27, 18 + b, hair); }
  if (st === 'bun' && !o.hat) p.ellipse(13, 3 + b, 18, 7 + b, hair);
  if (st === 'messy') {
    p.poly([[7, 14 + b], [5, 18 + b], [9, 17 + b]], shade(hair, 0.8)); p.poly([[24, 14 + b], [26, 18 + b], [22, 17 + b]], shade(hair, 0.8));
    if (!o.hat) p.poly([[13, 7 + b], [14, 3 + b], [16, 6 + b], [18, 3 + b], [19, 7 + b]], hair);
  }
  if (o.ears) { p.poly([[10, 11 + b], [5, 8 + b], [10, 14 + b]], skin); p.poly([[21, 11 + b], [26, 8 + b], [21, 14 + b]], skin); }
  p.ellipse(10, 8 + b, 21, 18 + b, skin);
  if (o.snout) { p.ellipse(12, 14 + b, 19, 20 + b, tint(skin, 0.25)); p.point(14, 16 + b, shade(skin, 0.5)); p.point(17, 16 + b, shade(skin, 0.5)); }
  if (o.hood) { p.rect(10, 7 + b, 21, 9 + b, o.hood); }
  else if (st === 'bald') { if (o.hairSide !== false) { p.rect(9, 11 + b, 10, 14 + b, hair); p.rect(21, 11 + b, 22, 14 + b, hair); } }
  else if (st !== 'none') {
    p.rect(10, 7 + b, 21, 10 + b, hair);
    for (const x of [12, 15, 19]) p.point(x, 11 + b, hair);
    p.point(14, 10 + b, skin); p.point(17, 10 + b, skin);
  }
  const ec = o.eye || EYE;
  if (o.skeleton) { p.rect(12, 12 + b, 14, 14 + b, [30, 20, 30]); p.rect(17, 12 + b, 19, 14 + b, [30, 20, 30]); if (o.eye) { p.point(13, 13 + b, o.eye); p.point(18, 13 + b, o.eye); } }
  else if (blink) { p.line(12, 14 + b, 13, 14 + b, EYE); p.line(18, 14 + b, 19, 14 + b, EYE); }
  else for (const x of [13, 18]) { p.rect(x, 13 + b, x, 14 + b, EYE); if (o.eye) p.point(x, 13 + b, ec); }
  if (!o.skeleton && !o.snout && !o.noBlush) { p.point(12, 15 + b, BLUSH); p.point(19, 15 + b, BLUSH); }
  if (o.beard) {
    p.poly([[11, 15 + b], [20, 15 + b], [19, 21 + b], [15, 24 + b], [12, 21 + b]], o.beard === true ? hair : o.beard);
    p.line(13, 16 + b, 18, 16 + b, shade(o.beard === true ? hair : o.beard, 0.8));
  } else if (o.skeleton) { for (const x of [13, 15, 17]) p.point(x, 17 + b, [60, 50, 50]); }
  else if (!o.snout) { p.point(15, 16 + b, MOUTH); p.point(16, 16 + b, MOUTH); }
  if (o.tusks) { p.point(13, 17 + b, WHITE); p.point(18, 17 + b, WHITE); p.point(13, 16 + b, WHITE); p.point(18, 16 + b, WHITE); }
}

function backHead(p, o, b, skin, hair) {
  const st = o.style;
  if (o.ears) { p.poly([[10, 11 + b], [5, 8 + b], [10, 14 + b]], skin); p.poly([[21, 11 + b], [26, 8 + b], [21, 14 + b]], skin); }
  if (o.hood) { p.ellipse(7, 5 + b, 24, 19 + b, o.hood); p.line(10, 17 + b, 21, 17 + b, shade(o.hood)); return; }
  if (st === 'bald' || st === 'none') { p.ellipse(10, 8 + b, 21, 18 + b, skin); if (st === 'bald') p.rect(10, 13 + b, 21, 15 + b, hair); return; }
  p.ellipse(8, 6 + b, 23, 18 + b, hair);
  p.rect(10, 12 + b, 21, 18 + b, hair);
  p.line(11, 15 + b, 20, 15 + b, shade(hair, 0.85));
  if (st === 'pigtails') { p.ellipse(4, 12 + b, 9, 18 + b, hair); p.ellipse(22, 12 + b, 27, 18 + b, hair); }
  if (st === 'bun' && !o.hat) p.ellipse(13, 3 + b, 18, 7 + b, hair);
  if (st === 'messy' && !o.hat) p.poly([[13, 7 + b], [14, 3 + b], [16, 6 + b], [18, 3 + b], [19, 7 + b]], hair);
}

function sideBody(p, o, f, b, pose, skin, hair, out, kind, bottom) {
  const walk = pose === 'walk', s = walk ? [1, 0, -1, 0][f] : 0, wide = o.wide ? 1 : 0;
  const legC = (kind === 'tunic' || kind === 'fur') ? (o.pants || shade(out)) : skin;
  // 뒷다리 → 앞다리
  p.rect(16 - s, 24 + b, 17 - s, 28, shade(legC, 0.85)); p.rect(15 - s, 29, 18 - s, 30, shade(o.boot || BOOT, 0.85));
  p.rect(13 + s, 24 + b, 14 + s, 28, legC); p.rect(11 + s, 29, 14 + s, 30, o.boot || BOOT);
  if (o.style === 'long') p.rect(16, 12 + b, 23, 23 + b, shade(hair, 0.85));
  if (kind === 'fur') { p.ellipse(9 - wide, 15 + b, 23 + wide, 28 + b, out); }
  else {
    const ex = kind !== 'tunic' ? 1 : 0;
    p.poly([[13 - wide, 18 + b], [19 + wide, 18 + b], [21 + ex + wide, bottom + b], [11 - ex - wide, bottom + b]], out);
    p.line(11 - ex - wide, bottom + b, 21 + ex + wide, bottom + b, shade(out));
    if (o.skeleton) for (const y of [20, 22, 24]) p.line(14, y + b, 18, y + b, shade(out, 0.6));
  }
  // 머리
  if (o.ears) p.poly([[17, 11 + b], [22, 7 + b], [19, 13 + b]], skin);
  if (o.hood) p.ellipse(8, 5 + b, 24, 19 + b, o.hood);
  else if (o.style !== 'bald' && o.style !== 'none') p.ellipse(9, 6 + b, 23, 18 + b, hair);
  if (o.style === 'pigtails') p.ellipse(20, 12 + b, 25, 18 + b, hair);
  if (o.style === 'bun' && !o.hat) p.ellipse(18, 3 + b, 23, 8 + b, hair);
  if (o.style === 'messy') { p.poly([[22, 9 + b], [26, 8 + b], [23, 13 + b]], shade(hair, 0.8)); if (!o.hat) p.poly([[13, 7 + b], [15, 3 + b], [17, 6 + b], [20, 4 + b], [20, 8 + b]], hair); }
  p.ellipse(8, 8 + b, 19, 18 + b, skin);
  if (o.snout) { p.ellipse(4, 13 + b, 12, 18 + b, tint(skin, 0.2)); p.point(5, 14 + b, shade(skin, 0.5)); }
  if (o.hood) { p.ellipse(13, 5 + b, 24, 19 + b, o.hood); p.rect(9, 6 + b, 18, 8 + b, o.hood); }
  else if (o.style === 'bald') p.ellipse(15, 10 + b, 20, 15 + b, hair);
  else if (o.style !== 'none') { p.ellipse(14, 6 + b, 23, 17 + b, hair); p.rect(9, 7 + b, 18, 9 + b, hair); p.point(10, 10 + b, hair); }
  if (o.skeleton) { p.rect(10, 12 + b, 12, 14 + b, [30, 20, 30]); if (o.eye) p.point(11, 13 + b, o.eye); }
  else { p.rect(11, 13 + b, 11, 14 + b, EYE); if (o.eye) p.point(11, 13 + b, o.eye); }
  if (!o.skeleton && !o.snout && !o.noBlush) p.point(10, 15 + b, BLUSH);
  if (o.beard) p.poly([[8, 15 + b], [15, 15 + b], [13, 21 + b], [10, 23 + b]], o.beard === true ? hair : o.beard);
  else if (!o.snout && !o.skeleton) p.point(9, 16 + b, MOUTH);
  if (o.tusks) { p.point(9, 16 + b, WHITE); p.point(9, 17 + b, WHITE); }
  // 앞팔
  const a = walk ? [-1, 0, 1, 0][f] : 0;
  const ac = kind === 'fur' ? shade(out, 0.9) : shade(out, 0.82);
  if (pose === 'cast') { p.rect(9, 18 + b, 14, 19 + b, ac); p.rect(8, 18 + b, 8, 19 + b, skin); }
  else { p.rect(15 + a, 19 + b, 16 + a, 23 + b, ac); p.rect(15 + a, 24 + b, 16 + a, 24 + b, skin); }
}

function wingsBack(p, c, b, f, dir) {
  const up = [0, -2, -3, -1][f];
  if (dir === 'left') { p.poly([[17, 16 + b], [28, 8 + up], [27, 20 + up], [19, 22 + b]], c); return; }
  p.poly([[12, 17 + b], [2, 9 + up], [3, 22 + up], [11, 23 + b]], c);
  p.poly([[19, 17 + b], [29, 9 + up], [28, 22 + up], [20, 23 + b]], c);
}

function staffDraw(p, st, dir, b, arm, pose, f) {
  const wood = st.wood || WOOD, orb = st.orb || [160, 120, 255];
  const glow = pose === 'cast';
  if (dir === 'down') {
    if (glow) { p.line(23, 3, 23, 21, wood); orbAt(p, 23, 3, orb, true, f); }
    else { p.line(23, 12 + b - arm, 23, 29, wood); orbAt(p, 23, 11 + b - arm, orb, false, f); }
  } else if (dir === 'up') {
    p.line(8, 12 + b + arm, 8, 29, wood); orbAt(p, 8, 11 + b + arm, orb, glow, f);
  } else {
    if (glow) { p.line(14, 19 + b, 3, 17 + b, wood); orbAt(p, 2, 17 + b, orb, true, f); }
    else { const a = pose === 'walk' ? [-1, 0, 1, 0][f] : 0; p.line(6 + a, 17 + b, 6 + a, 29, wood); orbAt(p, 6 + a, 15 + b, orb, false, f); }
  }
}

function orbAt(p, x, y, c, glow, f) {
  if (glow) { p.disc(x + 0.5, y + 0.5, 3, [...tint(c, 0.4), 150]); }
  p.rect(x - 1, y - 1, x + 1, y + 1, c); p.point(x, y - 1, tint(c, 0.6));
  if (glow && f % 2) { p.point(x - 3, y, tint(c, 0.7)); p.point(x + 3, y, tint(c, 0.7)); p.point(x, y - 3, tint(c, 0.7)); }
}

function weaponDraw(p, w, dir, b, arm, color) {
  const x = dir === 'up' ? 8 : dir === 'left' ? 11 : 23;
  const c = color || WOOD;
  if (w === 'club') { p.line(x, 15 + b, x, 27 + b, c, 2); p.ellipse(x - 2, 12 + b, x + 2, 17 + b, shade(c, 0.85)); }
  else if (w === 'spear') { p.line(x, 4 + b, x, 29, c); p.poly([[x - 2, 6 + b], [x, 1 + b], [x + 2, 6 + b]], [200, 200, 210]); }
  else if (w === 'axe') { p.line(x, 10 + b, x, 28, c, 2); p.poly([[x, 10 + b], [x + 5, 8 + b], [x + 5, 16 + b], [x, 14 + b]], [190, 190, 200]); }
  else if (w === 'sword') { p.line(x, 12 + b, x, 24 + b, [210, 210, 220]); p.line(x - 2, 24 + b, x + 2, 24 + b, [140, 100, 50]); p.line(x, 25 + b, x, 27 + b, [100, 70, 40]); }
  else if (w === 'bow') { p.path([[x + 1, 12 + b], [x + 3, 16 + b], [x + 3, 22 + b], [x + 1, 26 + b]], c); p.line(x + 1, 12 + b, x + 1, 26 + b, [230, 230, 230]); }
  else if (w === 'dagger') { p.line(x, 20 + b, x, 25 + b, [210, 210, 220]); p.point(x, 26 + b, [100, 70, 40]); }
  else if (w === 'book') { p.rect(x - 2, 18 + b, x + 2, 23 + b, c); p.line(x, 18 + b, x, 23 + b, [240, 230, 200]); }
}

function hatDraw(p, h, dir, b) {
  const hc = h.c, band = h.band || shade(hc, 0.6);
  const tip = dir === 'up' ? [[10, 8 + b], [21, 8 + b], [18, 3 + b], [13, 0 + b], [15, 2 + b], [13, 4 + b]]
    : dir === 'left' ? [[10, 8 + b], [21, 8 + b], [19, 4 + b], [24, 1 + b], [17, 1 + b], [13, 4 + b]]
      : [[10, 8 + b], [21, 8 + b], [18, 3 + b], [22, 0 + b], [16, 1 + b], [13, 4 + b]];
  p.poly(tip, hc);
  p.rect(11, 6 + b, 20, 7 + b, band);
  p.ellipse(dir === 'left' ? 4 : 5, 7 + b, dir === 'left' ? 24 : 26, 10 + b, shade(hc, 0.8));
  p.line(dir === 'left' ? 6 : 7, 8 + b, dir === 'left' ? 22 : 24, 8 + b, hc);
  if (h.gem) p.point(15, 6 + b, h.gem);
}
function crownDraw(p, c, b, dir) {
  const x0 = dir === 'left' ? 9 : 11;
  p.rect(x0, 5 + b, x0 + 9, 7 + b, c);
  for (const x of [x0, x0 + 3, x0 + 6, x0 + 9]) p.point(x, 4 + b, c);
  p.point(x0 + 4, 6 + b, [220, 60, 80]);
}
function helmDraw(p, c, b, dir) {
  p.ellipse(9, 5 + b, 22, 12 + b, c);
  p.rect(9, 10 + b, 22, 11 + b, shade(c));
  if (dir !== 'left') { p.poly([[9, 8 + b], [5, 2 + b], [10, 6 + b]], [240, 230, 200]); p.poly([[22, 8 + b], [26, 2 + b], [21, 6 + b]], [240, 230, 200]); }
  else p.poly([[19, 7 + b], [24, 1 + b], [21, 8 + b]], [240, 230, 200]);
}

// ─────────────────────────── 고양이 (옆모습, 왼쪽 보기) ───────────────────────────
export function cat(c, f, mode = 'walk', hat = null) {
  const p = new Pix(32, 32), B = c.base, D = c.dark, W = c.belly, pat = c.pattern, eye = c.eye || EYE;
  const face = pat === 'points' ? D : B;
  let hb = 0, blink = false;
  if (mode === 'walk') {
    const bob = [0, -1, 0, -1][f], lp = [[0, 2], [1, 1], [2, 0], [1, 1]][f], ty = [10, 9, 10, 11][f];
    const legcol = (pat === 'points' || pat === 'stripes') ? D : shade(B, 0.72);
    for (const [x, off] of [[9, lp[0]], [13, lp[1]], [19, lp[1]], [23, lp[0]]]) { p.rect(x, 24 - off + bob, x + 1, 27, legcol); p.point(x, 28, W); p.point(x + 1, 28, W); }
    p.ellipse(7, 16 + bob, 26, 26 + bob, B); p.ellipse(10, 21 + bob, 20, 26 + bob, W);
    const tail = (pat === 'points' || pat === 'calico') ? D : B;
    p.line(26, 20 + bob, 29, ty + 6, tail, 2); p.line(29, ty + 6, 29, ty, tail, 2);
    if (pat === 'stripes') for (const x of [16, 19, 22]) p.line(x, 17 + bob, x, 19 + bob, D);
    if (pat === 'calico') { p.ellipse(15, 16 + bob, 21, 20 + bob, D); p.ellipse(20, 18 + bob, 25, 22 + bob, c.patch2); }
    hb = bob;
  } else {
    blink = f === 2; const sw = [0, 1, 2, 1][f];
    const tail = pat === 'none' ? B : D;
    p.line(20, 28, 27, 28, tail, 2); p.line(27, 28, 28 + (sw >> 1), 22 - sw, tail, 2);
    p.ellipse(7, 15, 22, 29, B); p.ellipse(9, 20, 17, 29, W); p.rect(9, 27, 11, 29, W); p.rect(14, 27, 16, 29, W);
    if (pat === 'stripes') for (const y of [18, 21, 24]) p.line(19, y, 21, y, D);
    if (pat === 'calico') { p.ellipse(15, 15, 21, 21, D); p.ellipse(16, 22, 21, 27, c.patch2); }
  }
  p.poly([[2, 9 + hb], [4, 4 + hb], [7, 8 + hb]], face);
  p.poly([[10, 8 + hb], [13, 4 + hb], [14, 9 + hb]], pat === 'calico' ? c.patch2 : face);
  p.ellipse(1, 7 + hb, 15, 19 + hb, B);
  if (pat === 'points') p.ellipse(3, 11 + hb, 12, 18 + hb, D);
  p.ellipse(4, 13 + hb, 11, 18 + hb, pat === 'points' ? tint(D, 0.15) : W);
  if (blink) { p.line(4, 12 + hb, 6, 12 + hb, EYE); p.line(9, 12 + hb, 11, 12 + hb, EYE); }
  else for (const x of [5, 10]) { p.point(x, 11 + hb, eye); p.point(x, 12 + hb, EYE); }
  p.point(7, 14 + hb, [224, 96, 122]); p.point(8, 14 + hb, [224, 96, 122]);
  if (pat === 'stripes') { p.line(7, 8 + hb, 7, 9 + hb, D); p.line(9, 8 + hb, 9, 9 + hb, D); }
  if (hat) {
    p.poly([[4, 7 + hb], [12, 7 + hb], [10, 3 + hb], [13, 0 + hb], [8, 1 + hb], [6, 4 + hb]], hat.c);
    p.line(5, 6 + hb, 11, 6 + hb, hat.band || shade(hat.c, 0.6));
    p.line(2, 7 + hb, 14, 7 + hb, shade(hat.c, 0.8)); p.line(3, 8 + hb, 13, 8 + hb, shade(hat.c, 0.8));
  }
  return p;
}
export const CATS = {
  carrot: { base: [240, 138, 52], dark: [196, 98, 31], belly: [251, 227, 200], pattern: 'stripes' },
  midnight: { base: [48, 44, 58], dark: [28, 26, 36], belly: [70, 66, 82], pattern: 'none', eye: [240, 210, 60] },
  snow: { base: [244, 242, 238], dark: [200, 196, 190], belly: [255, 255, 255], pattern: 'none', eye: [80, 150, 220] },
  ash: { base: [140, 144, 156], dark: [100, 104, 116], belly: [200, 202, 210], pattern: 'stripes' },
  calico: { base: [250, 246, 238], dark: [220, 140, 60], belly: [255, 255, 255], pattern: 'calico', patch2: [60, 50, 50] },
  mocha: { base: [236, 222, 196], dark: [110, 76, 56], belly: [246, 238, 222], pattern: 'points', eye: [90, 160, 230] },
};

// ─────────────────────────── 몬스터 ───────────────────────────
export function slime(o, f) {
  const p = new Pix(32, 32), c = o.c, sq = [[6, 13, 25, 28], [5, 15, 26, 28], [6, 14, 25, 28], [7, 12, 24, 28]][f];
  p.ellipse(sq[0], sq[1], sq[2], sq[3], shade(c, 0.8));
  p.ellipse(sq[0] + 1, sq[1], sq[2] - 1, sq[3] - 2, c);
  p.ellipse(sq[0] + 4, sq[1] + 2, sq[0] + 8, sq[1] + 5, tint(c, 0.55));
  const ey = sq[1] + 7;
  p.rect(12, ey, 13, ey + 2, EYE); p.rect(18, ey, 19, ey + 2, EYE); p.point(12, ey, WHITE); p.point(18, ey, WHITE);
  if (o.angry) { p.line(11, ey - 2, 14, ey - 1, EYE); p.line(20, ey - 2, 17, ey - 1, EYE); }
  if (o.acc === 'crown') { const y = sq[1] - 4; p.rect(11, y + 2, 20, y + 4, [240, 200, 60]); for (const x of [11, 14, 17, 20]) p.point(x, y + 1, [240, 200, 60]); p.point(15, y + 3, [220, 60, 80]); }
  if (o.acc === 'flame') { p.poly([[13, sq[1] + 1], [16, sq[1] - 6 + (f % 2)], [19, sq[1] + 1]], [255, 200, 60]); p.poly([[15, sq[1]], [16, sq[1] - 3], [17, sq[1]]], [255, 248, 200]); }
  if (o.acc === 'ice') { p.poly([[9, sq[1] + 3], [10, sq[1] - 3], [12, sq[1] + 2]], [220, 245, 255]); p.poly([[19, sq[1] + 2], [22, sq[1] - 4], [23, sq[1] + 3]], [220, 245, 255]); }
  if (o.acc === 'spark') { p.line(8, sq[1], 6, sq[1] - 4, [255, 240, 120]); p.line(24, sq[1] + 1, 26, sq[1] - 3, [255, 240, 120]); }
  if (o.acc === 'leaf') { p.line(16, sq[1], 16, sq[1] - 3, [70, 120, 50]); p.ellipse(16, sq[1] - 5, 20, sq[1] - 2, [110, 180, 80]); }
  if (o.acc === 'drip') { p.rect(9, sq[3] - 1, 10, sq[3] + 1, c); p.rect(21, sq[3] - 1, 22, sq[3] + 2, c); }
  return p;
}

export function mushroom(o, f) {
  const p = new Pix(32, 32), hop = [0, -2, -3, -1][f];
  p.rect(12, 17 + hop, 19, 27 + hop, o.stem || [240, 226, 200]);
  p.rect(11, 28, 13, 29, BOOT); p.rect(18, 28, 20, 29, BOOT);
  p.ellipse(5, 6 + hop, 26, 19 + hop, o.c);
  p.rect(5, 15 + hop, 26, 17 + hop, shade(o.c, 0.8));
  for (const [x, y] of [[9, 9], [16, 8], [21, 11], [12, 13]]) p.ellipse(x, y + hop, x + 2, y + 2 + hop, o.spot || WHITE);
  p.rect(13, 20 + hop, 13, 22 + hop, EYE); p.rect(18, 20 + hop, 18, 22 + hop, EYE);
  p.point(15, 24 + hop, MOUTH); p.point(16, 24 + hop, MOUTH);
  return p;
}

export function beast(o, f) {
  const p = new Pix(32, 32), B = o.c, W = o.belly || tint(B, 0.4), D = o.dark || shade(B, 0.7);
  const h = o.head, lp = [[0, 2], [1, 1], [2, 0], [1, 1]][f], bob = [0, -1, 0, -1][f];
  if (h === 'toad') {
    const hop = [0, -2, -3, -1][f];
    p.ellipse(5, 13 + hop, 27, 27 + hop, B); p.ellipse(8, 19 + hop, 22, 27 + hop, W);
    p.ellipse(7, 9 + hop, 13, 15 + hop, B); p.ellipse(17, 9 + hop, 23, 15 + hop, B);
    p.rect(9, 11 + hop, 10, 12 + hop, EYE); p.rect(19, 11 + hop, 20, 12 + hop, EYE);
    p.line(9, 18 + hop, 21, 18 + hop, D);
    p.rect(4, 26, 8, 28, D); p.rect(22, 26, 26, 28, D);
    for (const [x, y] of [[14, 14], [24, 17], [11, 22]]) p.point(x, y + hop, D);
    return p;
  }
  if (o.wings) { const up = [0, -3, -4, -2][f]; p.poly([[14, 16 + bob], [24, 3 + up], [28, 10 + up], [20, 18 + bob]], o.wings); }
  // 꼬리
  if (o.tail === 'long') p.path([[24, 19 + bob], [28, 21], [31, 19]], D, 3);
  if (o.tail === 'bushy') p.ellipse(24, 12 + bob, 30, 18 + bob, B);
  if (o.tail === 'stinger') { p.path([[24, 20 + bob], [28, 15], [27, 9], [22, 7]], D, 2); p.poly([[20, 6], [23, 5], [22, 9]], [230, 220, 120]); }
  if (o.tail === 'tuft') { p.line(25, 19 + bob, 30, 16, D); p.ellipse(28, 13, 31, 16, shade(D, 0.8)); }
  const legC = D;
  const low = h === 'lizard' || h === 'scorp';
  const ly = low ? 24 : 22;
  for (const [x, off] of [[11, lp[0]], [14, lp[1]], [21, lp[1]], [24, lp[0]]]) { p.rect(x, ly - off + bob, x + 1, 27, legC); p.rect(x, 28, x + 1, 28, shade(legC, 0.7)); }
  if (low) { p.ellipse(8, 17 + bob, 25, 25 + bob, B); p.ellipse(10, 21 + bob, 22, 25 + bob, W); }
  else { p.ellipse(9, 13 + bob, 26, 24 + bob, B); p.ellipse(11, 19 + bob, 23, 24 + bob, W); }
  if (o.spikes) for (const x of [12, 16, 20, 24]) p.poly([[x, 14 + bob], [x + 2, 10 + bob], [x + 3, 14 + bob]], o.spikes);
  if (o.mane) p.ellipse(6, 9 + bob, 15, 22 + bob, o.mane);
  // 머리
  const hb = bob;
  if (h === 'wolf' || h === 'drake' || h === 'boar') {
    p.ellipse(2, 9 + hb, 13, 20 + hb, B);
    p.rect(0, 14 + hb, 5, 18 + hb, h === 'boar' ? tint(B, 0.2) : B);
    p.point(0, 14 + hb, EYE);
    if (h !== 'boar') { p.poly([[6, 10 + hb], [8, 4 + hb], [10, 10 + hb]], D); p.poly([[9, 10 + hb], [12, 5 + hb], [12, 11 + hb]], D); }
    else { p.poly([[2, 18 + hb], [1, 21 + hb], [4, 19 + hb]], WHITE); p.poly([[7, 9 + hb], [9, 6 + hb], [10, 10 + hb]], D); }
    p.point(5, 13 + hb, o.eye || EYE); p.point(5, 12 + hb, o.eye || EYE);
    if (h === 'drake') { p.poly([[8, 10 + hb], [13, 4 + hb], [11, 11 + hb]], o.horn || [240, 230, 200]); p.line(1, 18 + hb, 4, 18 + hb, [255, 200, 80]); }
  } else if (h === 'lizard') {
    p.ellipse(1, 15 + hb, 11, 22 + hb, B); p.point(4, 17 + hb, o.eye || EYE); p.line(1, 20 + hb, 5, 20 + hb, D);
  } else if (h === 'scorp') {
    p.ellipse(3, 16 + hb, 11, 22 + hb, B); p.point(5, 17 + hb, EYE); p.point(7, 17 + hb, EYE);
    p.path([[4, 20], [1, 18], [0, 15]], D, 2); p.path([[6, 22], [2, 24], [0, 22]], D, 2);
    for (const x of [13, 16, 19]) p.line(x, 18 + hb, x, 22 + hb, D);
  } else if (h === 'griffin') {
    p.ellipse(2, 7 + hb, 13, 18 + hb, o.headC || WHITE);
    p.poly([[2, 12 + hb], [-1, 14 + hb], [2, 15 + hb]], [240, 190, 60]);
    p.point(6, 11 + hb, EYE); p.poly([[9, 8 + hb], [12, 4 + hb], [12, 9 + hb]], o.headC || WHITE);
  }
  return p;
}

export function flyer(o, f) {
  const p = new Pix(32, 32), c = o.c, up = [0, -4, -6, -3][f], yb = [0, 1, 2, 1][f];
  if (o.kind === 'wisp') {
    const r = 6 + (f % 2);
    p.disc(16, 16 + yb, r + 3, [...c, 90]); p.disc(16, 16 + yb, r, c); p.disc(16, 15 + yb, r - 3, tint(c, 0.6));
    p.poly([[11, 18 + yb], [16, 28 + (f % 2) * 2], [21, 18 + yb]], [...c, 180]);
    p.rect(13, 15 + yb, 14, 16 + yb, EYE); p.rect(18, 15 + yb, 19, 16 + yb, EYE);
    return p;
  }
  p.poly([[13, 15 + yb], [2, 8 + up], [4, 20 + yb], [10, 19 + yb]], o.wing || shade(c, 0.85));
  p.poly([[19, 15 + yb], [30, 8 + up], [28, 20 + yb], [22, 19 + yb]], o.wing || shade(c, 0.85));
  p.ellipse(10, 10 + yb, 21, 23 + yb, c);
  p.poly([[11, 12 + yb], [11, 6 + yb], [14, 11 + yb]], c); p.poly([[20, 12 + yb], [20, 6 + yb], [17, 11 + yb]], c);
  if (o.horn) { p.poly([[11, 10 + yb], [9, 4 + yb], [13, 9 + yb]], o.horn); p.poly([[20, 10 + yb], [22, 4 + yb], [18, 9 + yb]], o.horn); }
  const ec = o.eye || [240, 60, 60];
  p.point(13, 15 + yb, ec); p.point(18, 15 + yb, ec); p.point(14, 15 + yb, ec); p.point(17, 15 + yb, ec);
  p.point(14, 19 + yb, WHITE); p.point(17, 19 + yb, WHITE);
  if (o.kind === 'gargoyle') { p.rect(12, 23 + yb, 13, 26 + yb, shade(c)); p.rect(18, 23 + yb, 19, 26 + yb, shade(c)); }
  return p;
}

export function golem(o, f) {
  const p = new Pix(32, 32), c = o.c, D = shade(c, 0.75), sw = [0, 1, 0, -1][f], st = [0, 0, 1, 0][f];
  p.rect(10, 25, 14, 30 - (f === 1 ? 1 : 0), D); p.rect(17, 25, 21, 30 - (f === 3 ? 1 : 0), D);
  p.rect(7, 8 + st, 24, 25 + st, c); p.rect(7, 23 + st, 24, 25 + st, D);
  p.rect(8, 9 + st, 23, 10 + st, tint(c, 0.25));
  p.rect(3, 10 + st + sw, 7, 22 + st + sw, D); p.rect(24, 10 + st - sw, 28, 22 + st - sw, D);
  p.rect(12, 2 + st, 19, 8 + st, c);
  const eye = o.eye || [120, 230, 255];
  p.rect(13, 4 + st, 14, 5 + st, eye); p.rect(17, 4 + st, 18, 5 + st, eye);
  if (o.deco === 'ice') { p.poly([[7, 9 + st], [5, 2 + st], [10, 8 + st]], [220, 245, 255]); p.poly([[24, 9 + st], [27, 1 + st], [21, 8 + st]], [220, 245, 255]); }
  if (o.deco === 'lava') { p.path([[10, 12 + st], [14, 16 + st], [12, 20 + st]], [255, 150, 40]); p.path([[20, 11 + st], [17, 17 + st], [21, 22 + st]], [255, 150, 40]); }
  if (o.deco === 'gear') { p.ellipse(11, 13 + st, 20, 22 + st, [200, 170, 90], 2); p.rect(15, 17 + st, 16, 18 + st, [200, 170, 90]); p.line(15, 17 + st, 15 + [3, 0, -3, 0][f], 17 + st + [0, 3, 0, -3][f], [120, 90, 40]); }
  if (o.deco === 'rune') { p.path([[12, 13 + st], [15, 16 + st], [12, 19 + st]], eye); p.path([[19, 13 + st], [16, 16 + st], [19, 19 + st]], eye); p.point(15, 21 + st, eye); }
  if (o.deco === 'moss') { p.rect(7, 8 + st, 14, 9 + st, [90, 150, 70]); p.rect(19, 8 + st, 24, 10 + st, [90, 150, 70]); }
  return p;
}

export function ghost(o, f) {
  const p = new Pix(32, 32), c = [...o.c, 210], yb = [0, -1, -2, -1][f];
  p.ellipse(7, 4 + yb, 24, 22 + yb, c);
  p.rect(7, 14 + yb, 24, 24 + yb, c);
  for (let i = 0; i < 4; i++) { const x = 7 + i * 4 + (f % 2); p.poly([[x, 24 + yb], [x + 2, 28 + yb], [x + 4, 24 + yb]], c); }
  p.rect(11, 11 + yb, 13, 14 + yb, [40, 30, 60]); p.rect(18, 11 + yb, 20, 14 + yb, [40, 30, 60]);
  if (o.eye) { p.point(12, 12 + yb, o.eye); p.point(19, 12 + yb, o.eye); }
  p.ellipse(13, 17 + yb, 18, 21 + yb, [40, 30, 60]);
  p.rect(4, 14 + yb + [0, 1, 2, 1][f], 7, 16 + yb, c); p.rect(24, 14 + yb + [2, 1, 0, 1][f], 27, 16 + yb, c);
  if (o.deco === 'clock') { p.ellipse(13, 1 + yb, 18, 6 + yb, [230, 200, 90], 1); p.point(15, 3 + yb, [230, 200, 90]); }
  return p;
}

export function mimic(o, f) {
  const p = new Pix(32, 32), c = o.c, open = [2, 5, 7, 4][f], yb = [0, -1, -2, -1][f];
  p.rect(6, 16 + yb, 25, 26 + yb, c); p.rect(7, 17 + yb, 24, 25 + yb, [240, 230, 200]); p.line(15, 17 + yb, 15, 25 + yb, shade(c));
  p.poly([[6, 16 + yb], [25, 16 + yb], [25, 15 - open + yb], [6, 15 - open + yb]], c);
  p.rect(7, 14 - open + yb, 24, 15 - open + yb, [240, 230, 200]);
  for (let x = 8; x < 24; x += 3) { p.poly([[x, 16 + yb], [x + 1, 13 + yb], [x + 2, 16 + yb]], WHITE); }
  p.rect(10, 9 - open + yb, 12, 11 - open + yb, [255, 220, 60]); p.rect(19, 9 - open + yb, 21, 11 - open + yb, [255, 220, 60]);
  p.rect(9, 27, 11, 29, shade(c)); p.rect(20, 27, 22, 29, shade(c));
  return p;
}

// 용 (크기 64 기준, size로 줄여 그림)
export function dragon(o, f, size = 64) {
  const p = new Pix(size, size), k = size / 64;
  const S = (v) => v * k;
  const c = o.c, D = shade(c, 0.7), belly = o.belly || [240, 210, 150], up = [0, -5, -8, -3][f], br = [0, 1, 1, 0][f];
  // 날개
  p.poly([[S(22), S(28)], [S(2), S(10 + up)], [S(4), S(24 + up)], [S(0), S(38 + up / 2)], [S(18), S(40)]], o.wing || D);
  p.poly([[S(42), S(28)], [S(62), S(10 + up)], [S(60), S(24 + up)], [S(64), S(38 + up / 2)], [S(46), S(40)]], o.wing || D);
  p.path([[S(22), S(28)], [S(4), S(24 + up)]], shade(D, 0.8)); p.path([[S(42), S(28)], [S(60), S(24 + up)]], shade(D, 0.8));
  // 꼬리
  p.path([[S(40), S(54)], [S(52), S(58)], [S(58), S(52)], [S(56), S(46)]], c, Math.max(2, Math.round(S(4))));
  p.poly([[S(56), S(44)], [S(60), S(46)], [S(55), S(49)]], D);
  // 몸
  p.ellipse(S(18), S(26 + br), S(46), S(58), c);
  p.ellipse(S(24), S(32 + br), S(40), S(58), belly);
  for (let y = 36; y < 56; y += 4) p.line(S(25), S(y + br), S(39), S(y + br), shade(belly, 0.85));
  // 다리
  p.rect(S(18), S(50), S(25), S(61), D); p.rect(S(39), S(50), S(46), S(61), D);
  for (const x of [17, 20, 23, 38, 41, 44]) p.point(S(x), S(62), WHITE);
  // 목·머리
  p.rect(S(27), S(18 + br), S(37), S(30 + br), c);
  p.ellipse(S(21), S(4 + br), S(43), S(22 + br), c);
  p.ellipse(S(25), S(14 + br), S(39), S(24 + br), tint(c, 0.15));
  p.poly([[S(23), S(8 + br)], [S(16), S(-2)], [S(26), S(5 + br)]], o.horn || [240, 230, 200]);
  p.poly([[S(41), S(8 + br)], [S(48), S(-2)], [S(38), S(5 + br)]], o.horn || [240, 230, 200]);
  const eye = o.eye || [255, 220, 60];
  p.rect(S(26), S(11 + br), S(29), S(13 + br), eye); p.rect(S(35), S(11 + br), S(38), S(13 + br), eye);
  p.point(S(28), S(12 + br), [60, 0, 0]); p.point(S(36), S(12 + br), [60, 0, 0]);
  p.point(S(29), S(19 + br), shade(c, 0.4)); p.point(S(35), S(19 + br), shade(c, 0.4));
  p.line(S(28), S(22 + br), S(36), S(22 + br), shade(c, 0.45));
  if (f % 2) for (const x of [29, 32, 35]) p.point(S(x), S(25 + br), [255, 180, 60]);
  for (const x of [22, 27, 32, 37, 42]) p.poly([[S(x - 1), S(28 + br)], [S(x), S(24 + br)], [S(x + 1), S(28 + br)]], o.spike || D);
  return p;
}

// ─────────────────────────── 마법 ───────────────────────────
export const ELEM_PAL = {
  arcane: [[245, 240, 255], [200, 180, 255], [150, 110, 240], [100, 70, 190], [50, 30, 110]],
  fire: [[255, 248, 200], [255, 208, 70], [246, 124, 34], [200, 52, 32], [100, 34, 34]],
  water: [[236, 252, 255], [150, 218, 250], [66, 148, 232], [34, 78, 176], [20, 40, 100]],
  ice: [[255, 255, 255], [210, 245, 255], [150, 215, 245], [90, 160, 215], [50, 100, 160]],
  wind: [[244, 255, 248], [180, 244, 214], [96, 206, 172], [50, 144, 132], [30, 90, 90]],
  dark: [[230, 200, 255], [170, 110, 230], [110, 50, 170], [60, 20, 100], [25, 10, 45]],
  light: [[255, 255, 255], [255, 250, 200], [255, 230, 120], [240, 190, 70], [170, 120, 40]],
  wood: [[230, 255, 200], [170, 230, 110], [100, 180, 70], [60, 130, 50], [40, 80, 40]],
  earth: [[240, 220, 180], [210, 170, 110], [160, 115, 70], [110, 75, 45], [70, 45, 30]],
  time: [[255, 252, 230], [250, 225, 150], [220, 180, 90], [160, 120, 200], [90, 60, 140]],
};

export function projectile(el, f, style) {
  const p = new Pix(16, 16), P = ELEM_PAL[el] || ELEM_PAL.arcane, cx = 9, cy = 8;
  const R = rng(el + f + (style || ''));
  const st = style || el;
  if (st === 'fire') {
    for (let k = 0; k < 3; k++) p.disc(cx - 3 - k * 2 + R.int(-1, 1), cy + R.int(-1, 1), 3 - k, P[2 + Math.min(2, k)]);
    p.disc(cx, cy, 4, P[3]); p.disc(cx, cy, 3, P[2]); p.disc(cx + 1, cy - 1, 2, P[1]); p.point(cx + 1, cy - 1, P[0]);
  } else if (st === 'water') {
    p.disc(cx, cy, 4, P[3]); p.disc(cx, cy, 3, P[2]); p.disc(cx + 1, cy - 1, 1.5, P[0]);
    p.point(cx - 6, cy + R.int(-1, 1), P[1]); p.point(cx - 8, cy + R.int(-2, 2), P[1]);
  } else if (st === 'ice') {
    p.poly([[cx + 5, cy], [cx, cy - 3], [cx - 5, cy], [cx, cy + 3]], P[2]); p.poly([[cx + 4, cy], [cx, cy - 1], [cx - 3, cy], [cx, cy + 1]], P[0]);
    if (f % 2) { p.point(cx - 5, cy - 3, P[0]); p.point(cx - 6, cy + 3, P[1]); }
  } else if (st === 'wind') {
    p.disc(cx, cy, 6, P[2]); p.disc(cx + 1, cy, 5, P[1]); p.disc(cx - 3, cy, 6, null);
    p.line(1, cy - 4 + (f % 2), 4, cy - 4 + (f % 2), P[1]); p.line(0, cy + 3, 3, cy + 3, P[1]);
  } else if (st === 'storm') {
    p.path([[1, cy], [4, cy - 3], [7, cy + 1], [10, cy - 2], [14, cy]], P[3], 2); p.path([[1, cy], [4, cy - 3], [7, cy + 1], [10, cy - 2], [14, cy]], [255, 250, 180]);
    p.disc(cx + 4, cy, 2, [255, 255, 220]);
  } else if (st === 'dark') {
    p.disc(cx, cy, 5, [...P[2], 160]); p.disc(cx, cy, 4, P[3]); p.disc(cx, cy, 2, P[4]);
    const a = f * 1.6; p.point(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, P[0]); p.point(cx - Math.cos(a) * 5, cy - Math.sin(a) * 5, P[1]);
  } else if (st === 'light') {
    const r = 5 + (f % 2);
    p.line(cx - r, cy, cx + r, cy, P[2]); p.line(cx, cy - r, cx, cy + r, P[2]);
    p.disc(cx, cy, 3, P[1]); p.disc(cx, cy, 2, P[0]); p.line(cx - 7, cy, cx - 4, cy, [...P[3], 160]);
  } else if (st === 'wood') {
    const a = f * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    p.poly([[cx + ca * 5, cy + sa * 5], [cx - sa * 2, cy + ca * 2], [cx - ca * 5, cy - sa * 5], [cx + sa * 2, cy - ca * 2]], P[2]);
    p.line(cx - ca * 4, cy - sa * 4, cx + ca * 4, cy + sa * 4, P[4]);
  } else if (st === 'earth') {
    const s = [[cx - 3, cy - 3], [cx + 3, cy - 4], [cx + 4, cy + 2], [cx - 1, cy + 4], [cx - 4, cy + 1]];
    const rot = s.map(([x, y]) => { const a = f * 0.8, dx = x - cx, dy = y - cy; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; });
    p.poly(rot, P[2]); p.point(cx - 1, cy - 1, P[1]); p.point(cx + 1, cy + 1, P[3]);
  } else if (st === 'time') {
    p.ellipse(cx - 4, cy - 4, cx + 4, cy + 4, P[2], 1); p.point(cx, cy, P[0]);
    const a = f * Math.PI / 2; p.line(cx, cy, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, P[3]);
    p.point(cx, cy - 4, P[0]); p.point(cx + 4, cy, P[0]); p.point(cx, cy + 4, P[0]); p.point(cx - 4, cy, P[0]);
  } else if (st === 'arrow') {
    p.line(2, cy, 12, cy, [150, 110, 60]); p.poly([[11, cy - 2], [15, cy], [11, cy + 2]], [200, 200, 210]); p.line(2, cy - 1, 4, cy - 1, WHITE);
  } else if (st === 'spit') {
    p.disc(cx, cy, 3, P[2]); p.point(cx - 4, cy, P[1]);
  } else { // arcane
    p.disc(cx, cy, 4, [...P[2], 150]); p.disc(cx, cy, 3, P[2]); p.disc(cx, cy, 2, P[1]); p.point(cx, cy, P[0]);
    p.point(cx - 5, cy + (f % 2), P[1]); p.point(cx - 7, cy - (f % 2), P[2]);
  }
  return p;
}

export function burst(el, size, f, n = 6) {
  const p = new Pix(size, size), P = ELEM_PAL[el] || ELEM_PAL.arcane, c = size / 2, t = f / (n - 1);
  const R = rng(el + size + f);
  const r = c * (0.3 + 0.7 * Math.min(1, t * 1.5)), fade = Math.max(0, (t - 0.45) / 0.55);
  const a = Math.round(255 * (1 - fade));
  if (fade < 1) {
    p.disc(c, c, r, [...P[3], Math.round(a * 0.7)]);
    p.disc(c, c, r * (0.78 - 0.4 * fade), [...P[2], a]);
    p.disc(c, c, r * Math.max(0, 0.5 - 0.5 * fade), [...P[1], a]);
    p.disc(c, c, r * Math.max(0, 0.25 - 0.3 * fade), [...P[0], a]);
    p.ellipse(c - r, c - r, c + r - 1, c + r - 1, [...P[1], a], 1);
  }
  const parts = Math.round(8 * (1 - fade * 0.6));
  for (let i = 0; i < parts; i++) {
    const ang = R() * 6.283, L = r * (0.7 + R() * 0.5), x = c + Math.cos(ang) * L, y = c + Math.sin(ang) * L;
    if (el === 'ice') p.poly([[x, y - 2], [x + 1, y], [x, y + 2], [x - 1, y]], P[0]);
    else if (el === 'wood') { p.point(x, y, P[1]); p.point(x + 1, y, P[2]); }
    else if (el === 'earth') p.rect(x - 1, y - 1, x + 1, y + 1, P[2 + (i % 2)]);
    else if (el === 'light') { p.point(x, y, P[0]); p.point(x - 1, y, P[1]); p.point(x + 1, y, P[1]); p.point(x, y - 1, P[1]); p.point(x, y + 1, P[1]); }
    else if (el === 'time') { p.point(x, y, P[1]); p.point(x, y - 1, P[3]); }
    else p.point(x, y, P[R.int(0, 2)]);
  }
  return p;
}

// ─────────────────────────── 타일 (16×16) ───────────────────────────
export const THEMES = {
  village: { g: [122, 166, 106], g2: [108, 152, 92], path: [206, 176, 128], water: [80, 150, 220], leaf: [78, 138, 74], rock: [150, 150, 150], wall: [140, 130, 120], floor: [180, 160, 130], deco: [[232, 96, 76], [243, 211, 107], [250, 250, 250]] },
  forest: { g: [96, 150, 80], g2: [84, 136, 70], path: [176, 146, 98], water: [70, 140, 200], leaf: [52, 110, 56], rock: [130, 136, 130], wall: [90, 110, 80], floor: [120, 100, 70], deco: [[240, 120, 160], [250, 240, 150], [250, 250, 250]] },
  swamp: { g: [104, 120, 80], g2: [92, 108, 70], path: [130, 116, 80], water: [80, 104, 70], leaf: [80, 100, 60], rock: [110, 110, 100], wall: [70, 80, 60], floor: [90, 90, 70], deco: [[180, 200, 120], [140, 90, 140], [200, 220, 160]], deadTree: true },
  canyon: { g: [176, 108, 72], g2: [160, 96, 64], path: [200, 140, 90], water: [240, 110, 40], lava: true, leaf: [120, 80, 50], rock: [110, 70, 60], wall: [120, 70, 50], floor: [150, 90, 60], deco: [[255, 180, 60], [90, 60, 50], [200, 130, 80]], noTree: true },
  snow: { g: [236, 242, 248], g2: [220, 230, 242], path: [200, 214, 230], water: [150, 200, 235], leaf: [70, 110, 100], rock: [160, 170, 186], wall: [170, 190, 210], floor: [200, 214, 230], deco: [[255, 255, 255], [180, 220, 250], [140, 180, 220]], pine: true },
  sky: { g: [214, 210, 220], g2: [200, 196, 210], path: [236, 230, 210], water: [150, 196, 240], sky: true, leaf: [110, 180, 140], rock: [180, 176, 190], wall: [170, 166, 186], floor: [214, 210, 220], deco: [[255, 255, 255], [200, 240, 220], [250, 230, 160]] },
  library: { g: [120, 90, 64], g2: [110, 82, 58], path: [150, 116, 80], water: [40, 36, 60], leaf: [80, 60, 50], rock: [110, 100, 110], wall: [76, 70, 90], floor: [120, 90, 64], deco: [[200, 180, 255], [250, 230, 160], [160, 120, 90]], indoor: true },
  time: { g: [214, 190, 140], g2: [200, 176, 128], path: [230, 210, 160], water: [100, 80, 140], leaf: [150, 130, 90], rock: [170, 150, 110], wall: [160, 130, 90], floor: [214, 190, 140], deco: [[230, 200, 90], [160, 120, 200], [250, 240, 210]], indoor: true },
  lair: { g: [70, 54, 60], g2: [60, 46, 52], path: [100, 76, 70], water: [240, 100, 40], lava: true, leaf: [90, 40, 40], rock: [50, 40, 46], wall: [60, 40, 44], floor: [80, 60, 64], deco: [[255, 120, 60], [200, 60, 70], [255, 200, 90]], noTree: true },
  tower: { g: [96, 86, 130], g2: [88, 78, 120], path: [130, 118, 170], water: [60, 50, 100], leaf: [110, 90, 150], rock: [120, 110, 150], wall: [70, 60, 100], floor: [96, 86, 130], deco: [[200, 180, 255], [150, 220, 255], [255, 240, 200]], indoor: true },
};

export function tile(theme, kind, v = 0) {
  const T = THEMES[theme], p = new Pix(16, 16), R = rng(theme + kind + v);
  if (kind === 'g') {
    p.rect(0, 0, 15, 15, T.g);
    for (let i = 0; i < 7; i++) p.point(R.int(0, 15), R.int(0, 15), shade(T.g, 0.92));
    if (v % 3 === 0) for (let i = 0; i < 4; i++) { const x = R.int(0, 13), y = R.int(0, 13); p.rect(x, y, x + 2, y + 1, T.g2); }
    if (v % 5 === 1) { const d = T.deco[R.int(0, T.deco.length - 1)]; p.point(R.int(2, 13), R.int(2, 13), d); }
    if (v % 4 === 2 && !T.indoor) { const x = R.int(2, 12), y = R.int(4, 13); p.point(x, y, tint(T.g, 0.25)); p.point(x + 1, y - 1, tint(T.g, 0.25)); }
  } else if (kind === 'path') {
    p.rect(0, 0, 15, 15, T.path);
    for (let i = 0; i < 5; i++) p.point(R.int(0, 15), R.int(0, 15), shade(T.path, 0.88));
  } else if (kind === 'floor') {
    p.rect(0, 0, 15, 15, T.floor); p.line(0, 15, 15, 15, shade(T.floor, 0.85)); p.line(15, 0, 15, 15, shade(T.floor, 0.85));
    if (v % 2) p.line(0, 7, 15, 7, shade(T.floor, 0.92));
    for (let i = 0; i < 3; i++) p.point(R.int(0, 14), R.int(0, 14), tint(T.floor, 0.1));
  } else if (kind === 'water') {
    p.rect(0, 0, 15, 15, T.water);
    const hl = T.lava ? [255, 210, 90] : tint(T.water, 0.4);
    for (let i = 0; i < 3; i++) { const x = (R.int(0, 12) + v * 2) % 13, y = R.int(1, 14); p.line(x, y, x + 2, y, hl); }
    if (T.sky) { p.rect(0, 0, 15, 15, [170, 205, 240]); p.ellipse(R.int(-2, 6), R.int(2, 8), R.int(10, 17), R.int(10, 15), [245, 248, 255]); }
  } else if (kind === 'wall') {
    p.rect(0, 0, 15, 15, T.wall);
    for (let y = 0; y < 16; y += 5) { p.line(0, y, 15, y, shade(T.wall, 0.8)); const o = (y / 5) % 2 ? 4 : 10; p.line(o, y, o, y + 4, shade(T.wall, 0.8)); }
    p.line(0, 0, 15, 0, tint(T.wall, 0.2));
  } else if (kind === 'walltop') {
    p.rect(0, 0, 15, 15, shade(T.wall, 0.6)); p.rect(1, 1, 14, 14, shade(T.wall, 0.7));
  }
  return p;
}

// 맵 위 물건 (나무·바위 등). 크기가 제각각
export function prop(theme, kind, v = 0) {
  const T = THEMES[theme], R = rng(theme + kind + v);
  if (kind === 'tree') {
    const p = new Pix(16, 32);
    if (T.noTree || T.indoor) { // 뾰족 바위
      p.poly([[2, 31], [6, 8 + R.int(0, 6)], [9, 14], [12, 4 + R.int(0, 6)], [15, 31]], T.rock);
      p.line(6, 12, 6, 30, tint(T.rock, 0.2)); return p;
    }
    if (T.deadTree) {
      p.rect(7, 12, 9, 31, [90, 70, 50]); p.path([[8, 16], [3, 9], [2, 5]], [90, 70, 50]); p.path([[8, 14], [13, 8], [14, 4]], [90, 70, 50]);
      p.ellipse(1, 3, 6, 7, [80, 100, 60]); p.ellipse(11, 2, 16, 6, [80, 100, 60]); return p;
    }
    if (T.pine) {
      p.rect(7, 24, 8, 31, [90, 60, 40]);
      for (let k = 0; k < 3; k++) p.poly([[1 + k, 26 - k * 7], [8, 8 - k * 6], [15 - k, 26 - k * 7]], T.leaf);
      for (let k = 0; k < 3; k++) p.line(4 + k, 24 - k * 7, 11 - k, 24 - k * 7, [250, 250, 255]);
      p.point(8, 3, [250, 250, 255]); return p;
    }
    p.rect(6, 20, 9, 31, [96, 64, 40]); p.point(7, 31, shade([96, 64, 40]));
    p.ellipse(0, 3, 15, 22, T.leaf); p.ellipse(2, 4, 10, 13, tint(T.leaf, 0.2));
    p.ellipse(4, 14, 15, 23, shade(T.leaf, 0.9));
    if (v % 3 === 0) { p.point(4, 10, [230, 80, 70]); p.point(11, 16, [230, 80, 70]); }
    return p;
  }
  if (kind === 'rock') {
    const p = new Pix(16, 16);
    p.ellipse(1, 4, 14, 15, shade(T.rock, 0.8)); p.ellipse(2, 3, 13, 13, T.rock); p.ellipse(4, 5, 8, 8, tint(T.rock, 0.3));
    if (theme === 'snow') p.ellipse(3, 2, 12, 6, [250, 252, 255]);
    return p;
  }
  if (kind === 'bush') {
    const p = new Pix(16, 16);
    if (theme === 'library') { p.rect(1, 3, 14, 15, [120, 80, 50]); for (let y = 4; y < 15; y += 4) for (let x = 2; x < 14; x += 2) p.rect(x, y, x, y + 2, [[180, 60, 60], [60, 90, 160], [70, 140, 80], [200, 170, 80]][(x + y) % 4]); return p; }
    if (theme === 'time') { p.ellipse(2, 2, 13, 13, [200, 170, 90], 2); p.rect(7, 7, 8, 8, [200, 170, 90]); for (let k = 0; k < 8; k++) { const a = k * 0.785; p.point(7.5 + Math.cos(a) * 7, 7.5 + Math.sin(a) * 7, [200, 170, 90]); } return p; }
    if (T.lava || theme === 'tower') { p.poly([[4, 15], [6, 3], [9, 8], [11, 1], [13, 15]], theme === 'tower' ? [150, 220, 255] : [220, 70, 80]); p.line(7, 6, 7, 14, [255, 255, 255]); return p; }
    p.ellipse(0, 4, 15, 15, shade(T.leaf, 0.9)); p.ellipse(2, 3, 11, 11, T.leaf);
    p.point(5, 7, tint(T.leaf, 0.35)); p.point(10, 9, tint(T.leaf, 0.35));
    return p;
  }
  if (kind === 'pillar') {
    const p = new Pix(16, 32);
    p.rect(3, 4, 12, 30, T.wall); p.rect(1, 1, 14, 4, tint(T.wall, 0.15)); p.rect(1, 28, 14, 31, shade(T.wall, 0.85));
    p.line(5, 5, 5, 27, tint(T.wall, 0.25)); p.line(10, 5, 10, 27, shade(T.wall, 0.85));
    return p;
  }
  if (kind === 'shelf') {
    const p = new Pix(16, 32);
    p.rect(0, 2, 15, 31, [110, 74, 46]); p.rect(1, 3, 14, 30, [80, 52, 34]);
    for (let y = 4; y < 30; y += 7) { p.line(1, y + 6, 14, y + 6, [130, 90, 56]); for (let x = 2; x < 14; x += 2) p.rect(x, y + R.int(0, 2), x, y + 5, [[180, 60, 60], [60, 90, 160], [70, 140, 80], [200, 170, 80], [150, 90, 170]][R.int(0, 4)]); }
    return p;
  }
  return new Pix(16, 16);
}

// 마을 건물 (가로 48)
export function house(roof, wall, kind = 'house') {
  const p = new Pix(48, 48);
  if (kind === 'tower') {
    const q = new Pix(48, 80);
    q.rect(14, 24, 33, 79, [170, 160, 150]); q.rect(14, 24, 15, 79, [140, 130, 124]);
    q.poly([[9, 26], [38, 26], [24, 0]], roof); q.point(24, 0, [255, 220, 90]);
    for (const y of [34, 50]) q.rect(21, y, 26, y + 6, [255, 226, 140]);
    q.rect(19, 66, 28, 79, [90, 58, 34]); q.ellipse(19, 62, 28, 70, [90, 58, 34]);
    return q;
  }
  p.rect(6, 22, 41, 47, wall); p.rect(6, 22, 7, 47, shade(wall, 0.85));
  p.poly([[0, 24], [47, 24], [24, 4]], roof); p.line(0, 24, 47, 24, shade(roof, 0.7));
  p.rect(34, 6, 37, 16, [120, 100, 90]);
  p.rect(19, 34, 28, 47, [90, 58, 34]); p.point(26, 41, [230, 200, 90]);
  p.rect(10, 29, 15, 34, [255, 226, 140]); p.rect(32, 29, 37, 34, [255, 226, 140]);
  p.line(12, 29, 12, 34, shade(wall, 0.6)); p.line(34, 29, 34, 34, shade(wall, 0.6));
  if (kind === 'staff') { p.line(42, 26, 46, 40, WOOD, 2); p.rect(44, 24, 47, 27, [160, 120, 255]); }
  if (kind === 'cloth') { p.poly([[40, 28], [46, 28], [45, 38], [41, 38]], [200, 66, 58]); }
  if (kind === 'potion') { p.disc(44, 34, 3, [220, 70, 90]); p.rect(43, 29, 44, 31, [200, 200, 210]); }
  return p;
}

// 아이템 아이콘 (16×16)
export function icon(slot, c1, c2, v = 0) {
  const p = new Pix(16, 16), D = shade(c1, 0.7);
  if (slot === 'staff') { p.line(3, 14, 11, 4, c2 || WOOD, 2); p.disc(12, 4, 3, c1); p.point(12, 3, tint(c1, 0.6)); if (v % 2) { p.point(14, 1, tint(c1, 0.5)); p.point(9, 2, tint(c1, 0.5)); } }
  else if (slot === 'hat') { p.poly([[2, 12], [14, 12], [10, 5], [13, 1], [8, 2], [6, 6]], c1); p.ellipse(0, 11, 15, 14, D); p.rect(5, 10, 11, 11, c2 || shade(c1, 0.5)); }
  else if (slot === 'robe') { p.poly([[5, 2], [10, 2], [13, 15], [2, 15]], c1); p.line(7, 3, 7, 15, c2 || D); p.rect(3, 4, 4, 9, D); p.rect(11, 4, 12, 9, D); }
  else if (slot === 'shoes') { p.rect(2, 8, 6, 13, c1); p.rect(2, 12, 8, 14, D); p.rect(9, 8, 13, 13, c1); p.rect(9, 12, 15, 14, D); }
  else if (slot === 'ring') { p.ellipse(3, 6, 12, 15, c2 || [230, 200, 90], 2); p.disc(8, 5, 3, c1); p.point(7, 4, tint(c1, 0.6)); }
  else if (slot === 'amulet') { p.path([[3, 1], [8, 8], [13, 1]], c2 || [230, 200, 90]); p.poly([[8, 7], [12, 11], [8, 15], [4, 11]], c1); p.point(7, 10, tint(c1, 0.6)); }
  else if (slot === 'potion') { p.rect(6, 1, 9, 4, [200, 190, 170]); p.disc(8, 10, 5, c1); p.disc(6, 8, 1.5, tint(c1, 0.6)); }
  else if (slot === 'scroll') { p.rect(3, 3, 12, 13, [240, 226, 190]); p.rect(2, 2, 13, 3, [200, 170, 120]); p.rect(2, 13, 13, 14, [200, 170, 120]); p.line(5, 6, 10, 6, c1); p.line(5, 9, 10, 9, c1); }
  else if (slot === 'gem') { p.poly([[8, 1], [14, 7], [8, 15], [2, 7]], c1); p.poly([[8, 3], [11, 7], [8, 10], [5, 7]], tint(c1, 0.4)); }
  return p;
}

// ─────────────────────────── 시트 굽기 (캐시) ───────────────────────────
const cache = new Map();
export function baked(key, make) {
  let v = cache.get(key);
  if (!v) { v = make(); cache.set(key, v); }
  return v;
}
export function framesToCanvases(frames) { return frames.map((f) => f.toCanvas()); }
export function scaled(pix, k) {
  const c = makeCanvas(pix.w * k, pix.h * k), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false; ctx.drawImage(pix.toCanvas(), 0, 0, pix.w * k, pix.h * k);
  return c;
}
