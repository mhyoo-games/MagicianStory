// 스킬 쓰기: 종류(kind)마다 모양과 효과. 피해 계산·특성은 game.hit()이 맡는다.
import { EL3 } from './engine/fx.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function cast(g, sk) {
  const h = g.h, el = sk.el;
  const far = sk.kind === 'area' || sk.kind === 'rain' || sk.kind === 'field';
  const aim = g.aim(far ? 11 : 10);
  const c = EL3[el] || EL3.arcane;
  const id = g.castId = (g.castId || 0) + 1;
  const base = { sk, castId: id };
  h.model.cast(); g.sfx('cast', el);
  switch (sk.kind) {
    case 'bolt': {
      const n = sk.n || 1;
      for (let k = 0; k < n; k++) {
        const a = aim.ang + (n > 1 ? (k - (n - 1) / 2) * (sk.spread || 0.3) : 0);
        const side = sk.spread && sk.spread < 0.25 && n > 1 ? (k - 0.5) * 0.6 : 0;
        g.shot({ x: h.x - Math.sin(aim.ang) * side, y: h.y + Math.cos(aim.ang) * side, ang: a, speed: sk.speed || 17, el, power: sk.power, ...base, pierce: sk.pierce, boom: sk.boom, look: sk.look, boomerang: sk.boomerang, homing: sk.homing, bounce: sk.bounce, split: sk.split, range: 11, big: sk.boom > 2 ? 1.5 : 1 });
      }
      break;
    }
    case 'cone': {
      const len = sk.len, arc = sk.arc;
      g.strike({ cone: [h.x, h.y, aim.ang, len, arc] }, sk.power, el, base);
      for (let i = 0; i < 70; i++) { const a = aim.ang + rnd(-arc / 2, arc / 2), d = rnd(0.5, len); g.fx.burst(h.x + Math.cos(a) * d * 0.3, 0.8, h.y + Math.sin(a) * d * 0.3, 1, c, { speed: 0.1, vx: Math.cos(a) * d * 2.2, vz: Math.sin(a) * d * 2.2, up: 0.4, grav: 0, life: 0.45, size: 0.5 }); }
      if (sk.invuln) { h.inv = Math.max(h.inv, sk.invuln); g.fx.ring(h.x, h.y, 1.4, '#e0f8ff', { dur: sk.invuln }); }
      break;
    }
    case 'nova': {
      const doIt = (k = 1) => {
        if (sk.toLine) { line(g, h.x, h.y, aim.ang, 9, 2.2, sk.power * k, el, base, c); return; }
        const hits = g.strike({ c: [h.x, h.y, sk.r] }, sk.power * k, el, { ...base, from: [h.x, h.y], knock: sk.st === 'knock' && !sk.pullIn ? (sk.knock ?? 4) : 0, pull: sk.pullIn ? 3 : 0 });
        g.fx.explode(h.x, h.y, sk.r, el, sk.r > 4.5);
        if (sk.look === 'scythe') for (let i = 0; i < 3; i++) g.fx.ring(h.x, h.y, sk.r * (0.6 + i * 0.2), c[2], { dur: 0.3 + i * 0.12, y: 0.8 + i * 0.3 });
        g.sfx(sk.r > 4.5 ? 'bigboom' : 'boom', el); g.shake(sk.r > 4.5 ? 0.35 : 0.15);
        return hits;
      };
      doIt();
      if (sk.twice) g.later(sk.twice, () => doIt(0.8));
      if (sk.thrice) { g.later(1, () => doIt()); g.later(2, () => doIt()); }
      if (sk.guard) g.addBuff({ id: sk.id + 'g', st: { dmgTaken: -sk.guard }, t: 3, icon: '🛡️' });
      if (sk.haste) g.addBuff({ id: sk.id + 'h', st: { speed: sk.haste }, t: 3, icon: '💨' });
      break;
    }
    case 'area': {
      const strikeAt = (x, y, r, pw) => {
        g.fx.warn({ kind: 'circle', x, y, r, dur: sk.delay || 0.3, friendly: 1 });
        g.later(sk.delay || 0.3, () => {
          g.strike({ c: [x, y, r] }, pw, el, { ...base, from: [x, y] });
          areaFx(g, x, y, r, el, sk.look);
          if (sk.after === 'slow') g.addZone({ x, y, r, dur: 4, el, power: 0, sk: { ...sk, st: 'slow' }, look: 'mud' });
        });
      };
      if (sk.rainN) { for (let i = 0; i < sk.rainN; i++) g.later(i * 0.12, () => strikeAt(aim.tx + rnd(-2.6, 2.6), aim.ty + rnd(-2.6, 2.6), sk.r, sk.power)); }
      else if (sk.thrice) {
        strikeAt(aim.tx, aim.ty, sk.r, sk.power);
        for (const k of [1, 2]) g.later(k * 0.45, () => { const t = g.nearest(h.x, h.y, 11, true); const p = t ? [t.x, t.y] : [aim.tx + rnd(-2, 2), aim.ty + rnd(-2, 2)]; strikeAt(p[0], p[1], sk.r, sk.power); });
      } else strikeAt(aim.tx, aim.ty, sk.r, sk.power);
      break;
    }
    case 'rain': {
      const cx = aim.target ? aim.tx : h.x + Math.cos(aim.ang) * 3, cy = aim.target ? aim.ty : h.y + Math.sin(aim.ang) * 3;
      const n = sk.n, R = sk.r;
      for (let i = 0; i < n; i++) g.later(0.1 + i * (1.3 / n), () => {
        const t = Math.random() < 0.5 ? g.nearest(cx, cy, R, true) : null;
        const x = t ? t.x + rnd(-0.5, 0.5) : cx + rnd(-R, R) * 0.8, y = t ? t.y + rnd(-0.5, 0.5) : cy + rnd(-R, R) * 0.8;
        const hits = g.strike({ c: [x, y, 1.5] }, sk.power, el, { ...base, freezeCh: sk.freezeCh, from: [x, y] });
        areaFx(g, x, y, 1.5, el, sk.look || (el === 'ice' ? 'shard' : null));
        if (sk.lifePer && hits.length) g.healPct(sk.lifePer);
      });
      if (sk.heal) g.healPct(sk.heal);
      if (sk.sanctuary) g.addZone({ x: h.x, y: h.y, r: 3.2, dur: sk.sanctuary, el: 'light', power: 0, sk: { ...sk, st: null }, healZone: 0.03, look: 'holy' });
      break;
    }
    case 'line': {
      const go = (ang, k = 1) => line(g, h.x, h.y, ang, sk.len, sk.w, sk.power * k, el, { ...base, pull: sk.pullIn ? 1 : 0, knock: sk.st === 'knock' && !sk.pullIn ? 3 : 0 }, c, sk);
      if (sk.fan) for (const d of [-0.38, 0, 0.38]) go(aim.ang + d, 0.8);
      else if (sk.repeat) for (let i = 0; i < sk.repeat; i++) g.later(i * 0.25, () => go(g.aim(10).ang));
      else go(aim.ang);
      break;
    }
    case 'wave': {
      const run = (dir) => g.addWave({ x: h.x, y: h.y, ang: aim.ang + (dir < 0 ? Math.PI : 0), len: sk.len, w: sk.w, el, power: sk.power, sk, castId: id, lifePer: sk.lifePer, back: dir < 0 });
      run(1); if (sk.twice) g.later(sk.twice, () => run(-1));
      g.shake(0.3); g.sfx('bigboom', el);
      break;
    }
    case 'field': {
      const atMe = sk.follow || sk.healZone || sk.storm;
      const px = atMe ? h.x : aim.tx, py = atMe ? h.y : aim.ty;
      const mk = (x, y, ang) => g.addZone({ x, y, r: sk.r, dur: sk.dur, el, power: sk.power, sk, castId: id, pull: sk.pull, follow: sk.follow, move: sk.move ? { vx: Math.cos(ang) * sk.move, vy: Math.sin(ang) * sk.move } : null, storm: sk.storm, healZone: sk.healZone, mpZone: sk.mpZone, guardZone: sk.guardZone, endBoom: sk.endBoom, endPower: sk.endPower, grow: sk.grow, heavySlow: sk.heavySlow, focus: sk.focus });
      if (sk.twin) { const p = aim.ang + Math.PI / 2; mk(h.x + Math.cos(p) * 1.6, h.y + Math.sin(p) * 1.6, aim.ang + 0.2); mk(h.x - Math.cos(p) * 1.6, h.y - Math.sin(p) * 1.6, aim.ang - 0.2); }
      else mk(sk.move ? h.x + Math.cos(aim.ang) * 1.5 : px, sk.move ? h.y + Math.sin(aim.ang) * 1.5 : py, aim.ang);
      break;
    }
    case 'orbit': g.addOrbs(sk); break;
    case 'chain': {
      let cur = g.nearestFront(h.x, h.y, aim.ang, 9) || g.nearest(h.x, h.y, 7, true);
      let from = [h.x, 1.1, h.y], pw = sk.power; const hit = new Set();
      if (!cur) { const ex = h.x + Math.cos(aim.ang) * 6, ey = h.y + Math.sin(aim.ang) * 6; g.fx.bolt(zig(from, [ex, 0.6, ey]), '#fff8a0'); g.sfx('zap'); g.hitTargetsAt(ex, ey, 1, el); break; }
      for (let i = 0; i < sk.n && cur; i++) {
        hit.add(cur); g.fx.bolt(zig(from, [cur.x, 0.9, cur.y]), '#fff8a0', 0.3); g.fx.burst(cur.x, 0.9, cur.y, 10, ['#ffffff', '#fff8a0', '#a0c8ff'], { speed: 3, size: 0.3 });
        g.hit(cur, pw, el, { ...base, from: [h.x, h.y] }); from = [cur.x, 0.9, cur.y]; pw *= 1 + (sk.grow || 0);
        const nx = cur; cur = g.nearest(nx.x, nx.y, 4.5, true, hit);
      }
      g.sfx('zap');
      break;
    }
    case 'summon': g.summon(sk); break;
    case 'buff': {
      g.addBuff({ id: sk.id, st: sk.buff, t: sk.dur, icon: sk.el === 'ice' ? '🧊' : sk.el === 'earth' ? '🪨' : sk.el === 'time' ? '⏩' : '🔮', thorns: sk.thorns, reflect: sk.reflect, blink2: sk.blink2 });
      if (sk.shieldNow) g.h.stoneShield = 3;
      g.fx.ring(h.x, h.y, 2, c[1], { dur: 0.5 }); g.fx.burst(h.x, 0.2, h.y, 30, c, { speed: 1.5, up: 3, grav: 0.5, size: 0.3, r: 1 });
      break;
    }
    case 'heal': {
      g.healPct(sk.heal);
      if (sk.spring) g.addBuff({ id: sk.id + 'sp', st: { regen: g.hs.hp * 0.03 }, t: sk.spring, icon: '💧' });
      if (sk.regenT) g.addBuff({ id: sk.id + 're', st: { regen: g.hs.hp * 0.025 }, t: sk.regenT, icon: '✨' });
      if (sk.buff) g.addBuff({ id: sk.id + 'b', st: sk.buff, t: sk.buffT || 10, icon: '🌟' });
      if (sk.cleanse) { h.st = {}; g.h.barrier = Math.max(g.h.barrier, g.hs.hp * (sk.shield || 0.1)); }
      if (sk.cdBack) for (const k of Object.keys(g.cds)) if (k !== sk.id) g.cds[k] = Math.max(0, g.cds[k] - sk.cdBack);
      g.fx.pillar(h.x, h.y, el === 'time' ? 'time' : 'heal', 4, 0.9, 0.6); g.fx.burst(h.x, 0.2, h.y, 30, el === 'time' ? EL3.time : EL3.heal, { speed: 1, up: 3, grav: 0.5, size: 0.35, r: 1.2 });
      g.sfx('heal');
      break;
    }
    case 'stop': g.timeStop(sk); break;
  }
}

function line(g, x, y, ang, len, w, power, el, o, c, sk = {}) {
  const hits = g.strike({ line: [x, y, ang, len, w] }, power, el, { ...o, from: [x, y], shatter: sk.shatter });
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  if (el === 'earth' || el === 'wood' || el === 'ice') {
    for (let d = 0.8; d < len; d += 0.7) g.later(d * 0.025, () => { const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d; g.fx.spike(px, py, el, w); });
  } else if (el === 'water') {
    for (let d = 0.5; d < len; d += 0.5) g.later(d * 0.03, () => g.fx.burst(x + Math.cos(ang) * d, 0.3, y + Math.sin(ang) * d, 5, c, { speed: w, up: 3, grav: -8, size: 0.4, life: 0.5 }));
  } else g.fx.beam(x, 0.9, y, ex, 0.9, ey, el, w * 0.4, 0.35);
  if (sk.endBoom) g.later(0.15, () => { g.strike({ c: [ex, ey, sk.endBoom] }, power * 0.8, el, o); g.fx.explode(ex, ey, sk.endBoom, el, true); g.sfx('boom', el); });
  g.sfx('shoot', el);
  return hits;
}
function areaFx(g, x, y, r, el, look) {
  const c = EL3[el] || EL3.arcane;
  if (look === 'thunder') { g.fx.bolt(zig([x + rnd(-1, 1), 9, y - 2], [x, 0.1, y], 8), '#fffbe0', 0.3); g.fx.flash(x, 1, y, '#fff8c0', r * 2.5, 0.2); g.sfx('zap'); }
  else if (look === 'pillar') { g.fx.pillar(x, y, 'light', 8, r * 0.6, 0.5); }
  else if (look === 'roots') { for (let i = 0; i < 5; i++) g.fx.spike(x + rnd(-r, r) * 0.6, y + rnd(-r, r) * 0.6, 'wood', 1); }
  else if (look === 'boulder' || el === 'earth') { g.fx.burst(x, 6, y, 1, ['#8a6a4a'], { speed: 0, up: -12, grav: -20, size: 1.6, life: 0.25 }); g.later(0.2, () => { for (let i = 0; i < 4; i++) g.fx.spike(x + rnd(-r, r) * 0.5, y + rnd(-r, r) * 0.5, 'earth', 1.2); }); }
  else if (el === 'fire') { g.fx.burst(x - 2, 7, y - 3, 1, c, { speed: 0, vx: 8, vz: 12, up: -18, grav: -10, size: 1.8, life: 0.3 }); }
  else if (look === 'shard') { g.fx.burst(x, 3, y, 6, ['#ffffff', '#c8f0ff'], { speed: 0.5, up: -6, grav: -10, size: 0.4, life: 0.4 }); }
  g.fx.explode(x, y, r, el, r > 3);
  g.sfx(r > 3 ? 'bigboom' : 'boom', el); g.shake(r > 3 ? 0.3 : 0.12);
}
export function zig(a, b, n = 6) {
  const out = [a];
  for (let i = 1; i < n; i++) { const k = i / n; out.push([a[0] + (b[0] - a[0]) * k + rnd(-0.4, 0.4), a[1] + (b[1] - a[1]) * k + rnd(-0.2, 0.2), a[2] + (b[2] - a[2]) * k + rnd(-0.4, 0.4)]); }
  out.push(b); return out;
}
