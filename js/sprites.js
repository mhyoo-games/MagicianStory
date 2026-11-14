// 그림(art.js)을 프레임 캔버스로 구워 두고 꺼내 쓰는 곳
import * as A from './art.js';
import { shade, tint } from './pix.js';

const C = new Map();
function get(key, make) { let v = C.get(key); if (!v) { v = make(); C.set(key, v); } return v; }

export function drawMonsterFrame(m, f, dir = 'down') {
  const a = m.art;
  if (a.t === 'slime') return A.slime(a, f);
  if (a.t === 'mushroom') return A.mushroom(a, f);
  if (a.t === 'human') return A.human(a, dir === 'up' ? 'up' : dir === 'left' || dir === 'right' ? dir : 'down', f, 'walk');
  if (a.t === 'beast') { const p = A.beast(a, f); return dir === 'right' ? p.flipX() : p; }
  if (a.t === 'flyer') return A.flyer(a, f);
  if (a.t === 'golem') return A.golem(a, f);
  if (a.t === 'ghost') return A.ghost(a, f);
  if (a.t === 'mimic') return A.mimic(a, f);
  if (a.t === 'dragon') return A.dragon(a, f, a.size || 64);
  return A.slime({ c: [200, 0, 200] }, f);
}

// 몬스터 프레임 묶음: { frames: {down:[c..], left, right, up}, hit: 흰 깜빡임 }
export function monsterSprite(m) {
  return get('m:' + m.id, () => {
    const dirs = m.art.t === 'human' ? ['down', 'left', 'right', 'up'] : m.art.t === 'beast' ? ['left', 'right'] : ['down'];
    const frames = {}, white = {};
    for (const d of dirs) {
      frames[d] = []; white[d] = [];
      for (let f = 0; f < 4; f++) {
        const p = drawMonsterFrame(m, f, d);
        frames[d].push(p.toCanvas());
        const w = p; for (let i = 0; i < w.d.length; i += 4) if (w.d[i + 3]) { w.d[i] = 255; w.d[i + 1] = 255; w.d[i + 2] = 255; }
        white[d].push(w.toCanvas());
      }
    }
    const size = m.art.t === 'dragon' ? (m.art.size || 64) : 32;
    return { frames, white, size, dirs };
  });
}

// 주인공 모습: 장비에 따라 모자·로브·지팡이 색이 바뀐다
export function heroSprite(look) {
  const key = 'h:' + JSON.stringify(look);
  return get(key, () => {
    const o = { ...look };
    const out = { walk: {}, cast: {}, idle: {} };
    for (const d of ['down', 'left', 'right', 'up']) {
      out.walk[d] = [0, 1, 2, 3].map((f) => A.human(o, d, f, 'walk').toCanvas());
      out.cast[d] = [0, 1].map((f) => A.human(o, d, f, 'cast').toCanvas());
      out.idle[d] = [0, 1, 2, 3].map((f) => A.human(o, d, f, 'idle').toCanvas());
    }
    return out;
  });
}

export function npcSprite(o, id) {
  return get('n:' + id, () => ({ idle: [0, 1, 2, 3].map((f) => A.human(o, 'down', f, 'idle').toCanvas()) }));
}

export function catSprite(id, hat) {
  return get('c:' + id + (hat ? 'h' : ''), () => {
    const c = A.CATS[id];
    const walkL = [0, 1, 2, 3].map((f) => A.cat(c, f, 'walk', hat));
    const sitL = [0, 1, 2, 3].map((f) => A.cat(c, f, 'sit', hat));
    return {
      walk: { left: walkL.map((p) => p.toCanvas()), right: walkL.map((p) => p.flipX().toCanvas()) },
      sit: { left: sitL.map((p) => p.toCanvas()), right: sitL.map((p) => p.flipX().toCanvas()) },
    };
  });
}

export function projSprite(el, style) {
  return get('p:' + el + ':' + (style || ''), () => [0, 1, 2, 3].map((f) => A.projectile(el, f, style).toCanvas()));
}
export function burstSprite(el, size) {
  return get('b:' + el + size, () => [0, 1, 2, 3, 4, 5].map((f) => A.burst(el, size, f).toCanvas()));
}
export function tileSprite(theme, kind, v) { return get('t:' + theme + kind + v, () => A.tile(theme, kind, v).toCanvas()); }
export function propSprite(theme, kind, v) { return get('o:' + theme + kind + v, () => A.prop(theme, kind, v).toCanvas()); }
export function houseSprite(roof, wall, kind) { return get('hs:' + roof + wall + kind, () => A.house(roof, wall, kind).toCanvas()); }
export function iconSprite(slot, c1, c2, v) { return get('i:' + slot + c1 + c2 + v, () => A.icon(slot, c1, c2, v).toCanvas()); }
export function iconURL(slot, c1, c2, v) {
  return get('iu:' + slot + c1 + c2 + v, () => {
    const p = A.icon(slot, c1, c2, v), cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(p.toCanvas(), 0, 0, 32, 32); return cv.toDataURL();
  });
}
export function portraitURL(o, scale = 3) {
  return get('pu:' + JSON.stringify(o) + scale, () => {
    const p = o.cat ? A.cat(A.CATS[o.cat], 0, 'sit') : A.human(o, 'down', 0, 'idle');
    const cv = document.createElement('canvas'); cv.width = 32 * scale; cv.height = 32 * scale;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(p.toCanvas(), 0, 0, cv.width, cv.height); return cv.toDataURL();
  });
}
export function monsterPortraitURL(m, scale = 3) {
  return get('mp:' + m.id + scale, () => {
    const p = drawMonsterFrame(m, 0, 'down'), cv = document.createElement('canvas'); cv.width = p.w * scale; cv.height = p.h * scale;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(p.toCanvas(), 0, 0, cv.width, cv.height); return cv.toDataURL();
  });
}
export { shade, tint };
