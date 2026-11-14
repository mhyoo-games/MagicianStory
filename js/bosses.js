// 중간보스 · 보스 · 시험관의 기믹과 공격. 바닥 경고(빨간 표시)가 차오르면 터진다 → 블링크로 피하기.
import * as THREE from 'three';
import { mesh, G, mat, glowMat, sprite } from './engine/models.js';
import { crop, trim } from './engine/sheets.js';
let PIL = null, FIRE = null;
const pillarImg = () => PIL || (PIL = trim(crop('rocks', 2, 19, 28, 43)));
const fireImg = () => FIRE || (FIRE = trim(crop('fire', 0, 0, 32, 48)));
import { EL3 } from './engine/fx.js';
import { sfx } from './audio.js';
import { zig } from './cast.js';

const D = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const R = (a, b) => a + Math.random() * (b - a);
const hp = (m) => m.hp / m.max;

// ── 공통 도구 ──
const circle = (g, m, x, y, r, dur, mult = 1.2, o = {}) => g.telegraph({ kind: 'circle', x, y, r, dur, src: m, mult, el: o.el || m.el, ...o });
const line = (g, m, a, len, w, dur, mult = 1.3, o = {}) => g.telegraph({ kind: 'line', x: o.x ?? m.x, y: o.y ?? m.y, ang: a, len, w, dur, src: m, mult, el: o.el || m.el, ...o });
const cone = (g, m, a, r, arc, dur, mult = 1.3, o = {}) => g.telegraph({ kind: 'cone', x: m.x, y: m.y, ang: a, r, arc, dur, src: m, mult, el: o.el || m.el, ...o });
const toHero = (g, m) => ang(m.x, m.y, g.h.x, g.h.y);
const dist = (g, m) => D(m.x, m.y, g.h.x, g.h.y);
function ring(g, m, n, speed = 7, mult = 0.8, el, off = 0, o = {}) { for (let i = 0; i < n; i++) g.eshot(m, off + (i / n) * Math.PI * 2, { speed, mult, el: el || m.el, ...o }); }
function fan(g, m, a, n, spread, speed = 9, mult = 0.8, el, o = {}) { for (let i = 0; i < n; i++) g.eshot(m, a + (n > 1 ? (i - (n - 1) / 2) * spread : 0), { speed, mult, el: el || m.el, ...o }); }
function minions(g, m, id, n, r = 3, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R(0, 1), x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
    const p = g.walk(x, y) ? [x, y] : [m.x + R(-1, 1), m.y + R(-1, 1)];
    const c = g.spawnMon(id, p[0], p[1], { parent: m, minion: 1, aggro: true, noLoot: true, ...o });
    if (c) { out.push(c); g.fx.burst(c.x, 0.5, c.y, 16, EL3.dark, { speed: 2 }); }
  }
  return out;
}
function objects(g, m, id, pts, k = 4, o = {}) {
  return pts.map((p) => { const c = g.spawnMon(id, p.x, p.y, { parent: m, ai: 'none', noLoot: true, ...o }); c.hp = c.max = Math.max(30, Math.round(g.hs.matk * k)); g.fx.burst(c.x, 0.5, c.y, 20, EL3.arcane, { speed: 2, up: 3 }); return c; });
}
const anchors = (g) => g.A.anchors || [0, 1, 2, 3].map((i) => ({ x: g.A.arena.x + Math.cos(i * 1.57 + 0.78) * 5, y: g.A.arena.y + Math.sin(i * 1.57 + 0.78) * 4 }));
const alive = (list) => (list || []).filter((c) => c.alive);
function chase(g, m, dt, keep = 1.6, k = 1) { if (dist(g, m) > keep) g.step(m, g.h.x, g.h.y, dt, k); else m.face = toHero(g, m); }
function kite(g, m, dt, want = 5.5, k = 1) { const d = dist(g, m); if (d > want + 1.5) g.step(m, g.h.x, g.h.y, dt, k); else if (d < want - 1.5) { const a = ang(g.h.x, g.h.y, m.x, m.y); g.step(m, m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, dt, k); } else m.face = toHero(g, m); }
function teleport(g, m, x, y) {
  if (!g.walk(x, y, m.rad * 0.7)) return false;
  g.fx.burst(m.x, 1, m.y, 24, EL3[m.el] || EL3.dark, { speed: 2, ry: 2 }); m.x = x; m.y = y; g.fx.burst(x, 1, y, 24, EL3[m.el] || EL3.dark, { speed: 2, ry: 2 }); sfx('blink'); return true;
}
// 돌진: m.bs.dash = { a, t, sp, mult, hit, onEnd }
function dash(m, a, t, sp, mult, onEnd) { m.bs.dash = { a, t, sp, mult, hit: 0, onEnd }; }
function runDash(g, m, dt) {
  const d = m.bs.dash; d.t -= dt;
  const nx = m.x + Math.cos(d.a) * d.sp * dt, ny = m.y + Math.sin(d.a) * d.sp * dt;
  let blocked = !g.walk(nx, ny, m.rad * 0.6), pillar = null;
  for (const b of g.blockers) if (D(nx, ny, b.x, b.y) < b.r + m.rad * 0.8) { blocked = true; pillar = b; }
  if (!blocked) { m.x = nx; m.y = ny; }
  m.face = d.a; m.movedT = 0.1;
  if (Math.random() < 0.7) g.fx.burst(m.x, 0.3, m.y, 2, ['#c8b090', '#8a7a6a'], { speed: 1, up: 1, size: 0.5 });
  if (!d.hit && dist(g, m) < m.rad + 0.5) { d.hit = 1; g.hurtHero(m.ms.atk, d.mult, { src: m }); g.h.kx = Math.cos(d.a) * 12; g.h.ky = Math.sin(d.a) * 12; }
  if (d.t <= 0 || blocked) { m.bs.dash = null; d.onEnd && d.onEnd(blocked, pillar); }
}
// 패턴 고르기 (같은 걸 연달아 안 씀)
function pick(m, pats) {
  const ok = pats.filter((p) => (p.ph ?? 0) <= m.bs.phase && p.f !== m.bs.last && (!p.if || p.if()));
  const list = ok.length ? ok : pats.filter((p) => (p.ph ?? 0) <= m.bs.phase);
  let sum = list.reduce((a, p) => a + (p.w || 1), 0), r = Math.random() * sum;
  for (const p of list) { r -= p.w || 1; if (r <= 0) { m.bs.last = p.f; return p.f; } }
  return list[0].f;
}
// 기본 진행: 돌진 중 · 쉬는 중 · 움직임 · 다음 패턴
function run(g, m, dt, P) {
  const b = m.bs; b.t += dt;
  const ph = P.phases ? P.phases.filter((x) => hp(m) <= x).length : 0;
  if (ph > b.phase) { b.phase = ph; P.onPhase && P.onPhase(g, m, ph); }
  if (b.dash) return runDash(g, m, dt);
  if (b.busy > 0) { b.busy -= dt; if (b.lock) m.face = b.lock === 1 ? m.face : toHero(g, m); return; }
  P.move(g, m, dt);
  b.next -= dt * (1 + b.phase * 0.18);
  if (b.next <= 0) {
    const f = pick(m, P.pats(g, m));
    const busy = f(g, m) ?? 1;
    b.busy = busy; b.next = R(P.gap[0], P.gap[1]);
  }
}
function shieldBubble(m, on, color = '#ffd040') {
  if (on && !m.bubble) { m.bubble = new THREE.Mesh(G.sph(m.rad * 2.2 + 0.6, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); m.bubble.position.y = m.H * 0.5; m.model.root.add(m.bubble); }
  if (!on && m.bubble) { m.model.root.remove(m.bubble); m.bubble = null; }
  if (m.bubble) m.bubble.position.y = m.H * 0.5, m.bubble.material.opacity = 0.18 + Math.sin(performance.now() / 150) * 0.06;
}

export const BOSS = {
  // ───── 1장 ─────
  kingSlime: {
    init(g, m) { m.el = 'wood'; m.bs.splits = [0.7, 0.4]; },
    onHurt(g, m) { const sp = m.bs.splits; if (sp.length && hp(m) < sp[0]) { sp.shift(); g.later(0.01, () => { minions(g, m, 'slime_green', 3, 2, { hpMul: 1.4 }); g.ui.toast('킹 슬라임이 갈라졌어요!'); m.model.root.scale.multiplyScalar(0.88); }); } },
    update(g, m, dt) {
      run(g, m, dt, {
        gap: [1.2, 2], phases: [0.5],
        move: (g2, mm, d) => { mm.hopT = (mm.hopT || 0) + d; chase(g2, mm, d, 1.8, 0.7); mm.lift = Math.abs(Math.sin(mm.hopT * 4)) * 0.4; },
        pats: () => [
          { f: (g2, mm) => { const tx = g2.h.x, ty = g2.h.y, sx = mm.x, sy = mm.y; circle(g2, mm, tx, ty, 2.8, 1.1, 1.5, { el: 'wood', shake: 0.35 }); let k = 0; const step = () => { k += 0.1; mm.x = sx + (tx - sx) * Math.min(1, k); mm.y = sy + (ty - sy) * Math.min(1, k); mm.lift = Math.sin(Math.min(1, k) * Math.PI) * 3; if (k < 1) g2.later(0.1, step); else mm.lift = 0; }; g2.later(0.1, step); return 1.4; }, w: 3 },
          { f: (g2, mm) => { ring(g2, mm, 10, 6, 0.7, 'wood'); if (mm.bs.phase) g2.later(0.5, () => ring(g2, mm, 10, 6, 0.7, 'wood', 0.31)); return 0.8; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 3; i++) g2.later(i * 0.35, () => circle(g2, mm, g2.h.x + R(-1, 1), g2.h.y + R(-1, 1), 1.5, 0.8, 1, { el: 'wood' })); return 1.4; }, w: 2 },
        ],
      });
    },
  },
  goblinChief: {
    init(g, m) { m.el = 'earth'; g.later(0.1, () => { m.bs.totems = objects(g, m, 'totem', anchors(g).slice(0, 3), 5); m.bs.re = 1; g.ui.toast('토템이 그락을 지키고 있어요! 토템부터 부수세요.'); }); },
    onHurt(g, m) { return alive(m.bs.totems).length ? 0 : 1; },
    onChild(g, m, c) { if (c.id === 'totem') { const n = alive(m.bs.totems).length; g.ui.toast(n ? `토템이 ${n}개 남았어요` : '보호막이 깨졌어요! 지금이에요!'); if (!n) { m.st.stun = 2.5; g.shake(0.3); } } },
    update(g, m, dt) {
      shieldBubble(m, alive(m.bs.totems).length > 0);
      if (m.bs.re && hp(m) < 0.45) { m.bs.re = 0; g.ui.toast('그락이 토템을 다시 세워요!'); sfx('roar'); m.bs.totems = objects(g, m, 'totem', anchors(g).slice(1, 3), 5); }
      run(g, m, dt, {
        gap: [1, 1.8], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 1.9),
        pats: () => [
          { f: (g2, mm) => { cone(g2, mm, toHero(g2, mm), 3.4, 1.7, 0.75, 1.5); mm.bs.lock = 1; return 1; }, w: 3 },
          { f: (g2, mm) => { const tx = g2.h.x, ty = g2.h.y; circle(g2, mm, tx, ty, 2.4, 1.1, 1.7, { shake: 0.35, then: () => { if (g2.walk(tx, ty, mm.rad * 0.6)) { mm.x = tx; mm.y = ty; } } }); return 1.3; }, w: 2 },
          { f: (g2, mm) => { if (alive(g2.mons.filter((x) => x.parent === mm && x.id === 'goblin')).length < 3) minions(g2, mm, 'goblin', 2, 2.5); sfx('roar'); return 0.8; }, w: 1 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3.2, 0.9, 1.4); return 1.2; }, w: 2, ph: 1 },
        ],
      });
    },
  },
  // ───── 2장 ─────
  lizardCaptain: {
    init(g, m) { m.el = 'water'; m.bs.guard = 0; },
    onHurt(g, m, o) {
      if (m.bs.guard <= 0) return 1;
      const [fx, fy] = o.from || [g.h.x, g.h.y];
      const a = ang(m.x, m.y, fx, fy); const front = Math.cos(a - m.face) > 0.2;
      if (front) { g.fx.burst(m.x + Math.cos(m.face) * 0.8, 1, m.y + Math.sin(m.face) * 0.8, 6, ['#ffffff', '#c8c8d8'], { speed: 2 }); return 0.08; }
      g.O.num(m.x, m.H + 0.9, m.y, '등을 노렸다!', '#ffd040'); return 1.6;
    },
    update(g, m, dt) {
      if (m.bs.guard > 0) { m.bs.guard -= dt; shieldBubble(m, true, '#c8d8ff'); const a = toHero(g, m); let da = ((a - m.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI; m.face += Math.max(-1.6 * dt, Math.min(1.6 * dt, da)); if (m.bs.guard <= 0) { shieldBubble(m, false); } if (Math.random() < 0.02) fan(g, m, m.face, 3, 0.3, 8, 0.7, 'water'); return; }
      run(g, m, dt, {
        gap: [0.9, 1.6], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2),
        pats: () => [
          { f: (g2, mm) => { mm.bs.guard = 4.5; g2.ui.toast('그르샤가 방패를 들었어요! 뒤로 돌아가요.'); return 0.2; }, w: 3 },
          { f: (g2, mm) => { const a = toHero(g2, mm); line(g2, mm, a, 4.5, 1.2, 0.6, 1.5); return 0.9; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); line(g2, mm, a, 9, 1.6, 0.8, 0.1, { noFx: 1, then: () => dash(mm, a, 0.6, 15, 1.4) }); return 1; }, w: 2 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 2.6, 0.7, 1.3); return 1; }, w: 1, ph: 1 },
        ],
      });
    },
  },
  morga: {
    init(g, m) { m.el = 'dark'; g.later(0.5, () => this.split(g, m)); m.bs.cl = 9; },
    split(g, m) {
      for (const c of alive(m.bs.clones)) { c.alive = false; g.removeMon(c); }
      const n = m.bs.phase ? 3 : 2, a0 = R(0, 6.28), pts = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (i / (n + 1)) * Math.PI * 2; pts.push([g.h.x + Math.cos(a) * 5, g.h.y + Math.sin(a) * 5]); }
      pts.sort(() => Math.random() - 0.5);
      const [rx, ry] = pts.pop(); teleport(g, m, rx, ry) || teleport(g, m, g.A.arena.x, g.A.arena.y);
      m.bs.clones = pts.map(([x, y]) => { const c = g.spawnMon('mirror', g.walk(x, y) ? x : m.x, g.walk(x, y) ? y : m.y, { parent: m, noShadow: true, noLoot: true, aggro: true }); c.hp = c.max = Math.round(g.hs.matk * 2); return c; });
      g.ui.toast('모르가가 분신을 만들었어요! 그림자가 있는 쪽이 진짜예요.');
    },
    onHurt(g, m) { if (alive(m.bs.clones).length) { for (const c of alive(m.bs.clones)) { c.alive = false; g.fx.burst(c.x, 1, c.y, 20, EL3.dark, { speed: 2 }); g.removeMon(c); } g.O.num(m.x, m.H + 1, m.y, '찾았다!', '#ffd040'); m.st.stun = 1.2; } return 1; },
    update(g, m, dt) {
      m.bs.cl -= dt; if (m.bs.cl <= 0) { m.bs.cl = 11; this.split(g, m); }
      run(g, m, dt, {
        gap: [1.1, 1.8], phases: [0.5],
        move: (g2, mm, d) => kite(g2, mm, d, 6),
        pats: () => [
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 5, 0.28, 8, 0.8, 'dark'); return 0.7; }, w: 3 },
          { f: (g2, mm) => { for (let i = 0; i < 3 + mm.bs.phase; i++) g2.later(i * 0.25, () => circle(g2, mm, g2.h.x + R(-1.5, 1.5), g2.h.y + R(-1.5, 1.5), 1.6, 1, 1.1, { el: 'wood', st: 'poison' })); return 1.4; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 3; i++) g2.later(i * 0.3, () => g2.eshot(mm, toHero(g2, mm) + R(-0.6, 0.6), { speed: 5.5, mult: 0.9, el: 'dark', home: 1.8, range: 16 })); return 1.2; }, w: 2 },
        ],
      });
    },
  },
  // ───── 3장 ─────
  berserker: {
    init(g, m) { m.el = 'fire'; g.later(0.05, () => this.pillars(g)); },
    pillars(g) {
      for (const b of g.blockers) g.ents.remove(b.mesh);
      g.blockers = anchors(g).map((p) => { const mm = sprite(pillarImg(), { sink: 0 }); mm.position.set(p.x, 0, p.y + 0.4); g.ents.add(mm); return { x: p.x, y: p.y, r: 0.7, mesh: mm }; });
    },
    update(g, m, dt) {
      if (m.bs.stunT > 0) { m.bs.stunT -= dt; m.dmgMul = 2; return; } else m.dmgMul = 1;
      run(g, m, dt, {
        gap: [0.9, 1.5], phases: [0.4],
        move: (g2, mm, d) => chase(g2, mm, d, 2.2, 1.1),
        pats: () => [
          { f: (g2, mm) => {
            const a = toHero(g2, mm); line(g2, mm, a, 15, 1.8, 0.9, 0.1, { noFx: 1, then: () => dash(mm, a, 1.2, 15, 1.7, (blocked, pillar) => {
              if (pillar) { g2.ents.remove(pillar.mesh); g2.blockers = g2.blockers.filter((b) => b !== pillar); g2.fx.burst(pillar.x, 1, pillar.y, 40, ['#8a6a50', '#c8a070'], { speed: 4, up: 4 }); sfx('bigboom'); g2.shake(0.5); mm.st.stun = 3; mm.bs.stunT = 3; g2.ui.toast('기둥에 부딪혀 기절했어요! 지금이에요!'); if (!g2.blockers.length) g2.later(4, () => BOSS.berserker.pillars(g2)); }
              else if (blocked) { g2.shake(0.3); }
            }) }); return 1.1; }, w: 3 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3, 0.9, 1.5, { el: 'fire' }); return 1.1; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 3; i++) g2.later(i * 0.45, () => cone(g2, mm, toHero(g2, mm), 3, 1.4, 0.45, 1.2)); return 1.6; }, w: 1, ph: 1 },
        ],
      });
    },
  },
  bolg: {
    init(g, m) { m.el = 'fire'; m.bs.drinkAt = [0.66, 0.33]; g.later(0.05, () => { m.bs.barrels = objects(g, m, 'blood_barrel', anchors(g).slice(0, 3), 4); }); m.rage = 0; },
    update(g, m, dt) {
      const b = m.bs;
      if (b.goDrink) {
        const t = b.goDrink; if (!t.alive) { b.goDrink = null; g.ui.toast('통을 부쉈어요! 볼그가 화가 났어요.'); return; }
        g.step(m, t.x, t.y, dt, 1.3);
        if (D(m.x, m.y, t.x, t.y) < 1.6) { t.alive = false; g.removeMon(t); b.goDrink = null; m.hp = Math.min(m.max, m.hp + m.max * 0.15); m.rage += 0.25; m.ms = { ...m.ms, atk: Math.round(m.ms.atk * 1.2) }; sfx('roar'); g.fx.pillar(m.x, m.y, 'fire', 6, 1.4, 1); g.ui.toast('볼그가 용의 피를 마셨어요! 더 강해졌어요.'); m.model.root.scale.multiplyScalar(1.08); }
        return;
      }
      if (b.drinkAt.length && hp(m) < b.drinkAt[0]) { b.drinkAt.shift(); const list = alive(b.barrels); if (list.length) { list.sort((p, q) => D(m.x, m.y, p.x, p.y) - D(m.x, m.y, q.x, q.y)); b.goDrink = list[0]; g.ui.toast('볼그가 피 통으로 달려가요! 먼저 부수세요!'); return; } }
      run(g, m, dt, {
        gap: [1, 1.6], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2.3),
        pats: () => [
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3.4, 1, 1.6, { el: 'fire', shake: 0.4 }); return 1.2; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); for (const d of [-0.5, 0, 0.5]) line(g2, mm, a + d, 9, 1.2, 0.8, 1.2, { el: 'fire' }); return 1.1; }, w: 2 },
          { f: (g2, mm) => { const tx = g2.h.x, ty = g2.h.y; circle(g2, mm, tx, ty, 2.6, 1.1, 1.8, { el: 'fire', shake: 0.4, then: () => { if (g2.walk(tx, ty, mm.rad * 0.6)) { mm.x = tx; mm.y = ty; } ring(g2, mm, 8, 6, 0.7, 'fire'); } }); return 1.4; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 6; i++) g2.later(i * 0.18, () => circle(g2, mm, g2.h.x + R(-3, 3), g2.h.y + R(-3, 3), 1.4, 0.9, 1, { el: 'fire' })); return 1.4; }, w: 1, ph: 1 },
        ],
      });
    },
  },
  // ───── 4장 ─────
  wolfKing: {
    init(g, m) { m.el = 'ice'; m.bs.howl = 2; },
    onHurt(g, m) { const n = alive(g.mons.filter((x) => x.parent === m)).length; return Math.max(0.35, 1 - n * 0.22); },
    update(g, m, dt) {
      const pack = alive(g.mons.filter((x) => x.parent === m)).length;
      shieldBubble(m, pack > 0, '#c8e8ff');
      m.bs.howl -= dt;
      if (m.bs.howl <= 0 && !m.bs.busy) { m.bs.howl = 16; if (pack < 2) { minions(g, m, 'wolf_ice', 3 - pack, 3); sfx('roar'); g.ui.toast('늑대왕이 무리를 불렀어요! 무리가 있으면 덜 다쳐요.'); } }
      run(g, m, dt, {
        gap: [0.9, 1.5], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2, 1.2),
        pats: () => [
          { f: (g2, mm) => { let k = 0; const go = () => { if (!mm.alive) return; const a = toHero(g2, mm); line(g2, mm, a, 7, 1.4, 0.55, 0.1, { noFx: 1, then: () => dash(mm, a, 0.45, 15, 1.3, () => { if (++k < 2 + mm.bs.phase) g2.later(0.2, go); }) }); }; go(); return 2.2; }, w: 3 },
          { f: (g2, mm) => { cone(g2, mm, toHero(g2, mm), 5.5, 1.1, 0.8, 1.3, { el: 'ice', st: 'chill' }); return 1; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); for (let i = 0; i < 6; i++) g2.later(i * 0.08, () => g2.fx.spike(mm.x + Math.cos(a) * (1 + i * 1.3), mm.y + Math.sin(a) * (1 + i * 1.3), 'ice', 1)); line(g2, mm, a, 8, 1.4, 0.7, 1.4, { el: 'ice', noFx: 1 }); return 1; }, w: 2 },
        ],
      });
    },
  },
  ceres: {
    init(g, m) { m.el = 'ice'; m.bs.armor = 1; g.later(0.05, () => this.braziers(g, m)); },
    braziers(g, m) { for (const f of m.bs.flames || []) g.ents.remove(f); m.bs.flames = []; m.bs.lit = 0; m.bs.braz = objects(g, m, 'brazier', anchors(g), 1.5); g.ui.toast('꺼진 화로 넷을 마법으로 켜면 얼음 갑옷이 녹아요!'); },
    onHurt(g, m) { return m.bs.armor ? 0.05 : 1.6; },
    onChild(g, m, c) {
      if (c.id !== 'brazier') return;
      const f = sprite(fireImg(), { sink: 0 }); f.position.set(c.x, 0.6, c.y + 0.1); g.ents.add(f); m.bs.flames.push(f);
      m.bs.lit++; g.ui.toast(`화로 ${m.bs.lit}/4`); sfx('boom', 'fire');
      if (m.bs.lit >= 4) { m.bs.armor = 0; m.st.stun = 2.5; m.bs.thaw = 10; g.ui.toast('얼음 갑옷이 녹았어요! 지금 공격해요!'); g.fx.burst(m.x, 1.5, m.y, 60, EL3.ice, { speed: 5, up: 4 }); sfx('break'); }
    },
    update(g, m, dt) {
      shieldBubble(m, !!m.bs.armor, '#bfe8ff');
      if (!m.bs.armor) { m.bs.thaw -= dt; if (m.bs.thaw <= 0) { m.bs.armor = 1; g.ui.toast('세레스가 다시 얼음 갑옷을 둘렀어요'); this.braziers(g, m); } }
      run(g, m, dt, {
        gap: [1, 1.7], phases: [0.5],
        move: (g2, mm, d) => kite(g2, mm, d, 6, 0.8),
        pats: () => [
          { f: (g2, mm) => { ring(g2, mm, 12 + mm.bs.phase * 4, 6.5, 0.8, 'ice', R(0, 1)); return 0.9; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 5; i++) g2.later(i * 0.2, () => circle(g2, mm, g2.h.x + R(-2.5, 2.5), g2.h.y + R(-2.5, 2.5), 1.6, 1, 1.1, { el: 'ice', st: 'chill' })); return 1.4; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); for (const d of [-0.35, 0, 0.35]) line(g2, mm, a + d, 12, 1.1, 0.9, 1.3, { el: 'ice', st: 'stun' }); return 1.2; }, w: 2 },
        ],
      });
    },
  },
  // ───── 5장 ─────
  griffin: {
    init(g, m) { m.el = 'wind'; m.bs.flyT = 6; g.later(0.05, () => { m.bs.rods = objects(g, m, 'rod', anchors(g).slice(0, 2), 1.5); }); },
    onHurt(g, m) { return m.bs.downT > 0 ? 1.6 : 1; },
    onChild(g, m, c) {
      if (c.id !== 'rod') return;
      if (m.flying) {
        g.fx.bolt(zig([c.x, 3, c.y], [m.x, 2.5, m.y], 8), '#fff8a0', 0.4); g.fx.bolt(zig([m.x, 12, m.y], [m.x, 0.2, m.y], 8), '#ffffff', 0.4); sfx('zap'); g.shake(0.5);
        m.flying = false; m.untarget = false; m.bs.downT = 4; m.st.stun = 4; m.bs.flyT = 12; g.ui.toast('번개에 맞아 떨어졌어요! 지금이에요!');
      } else g.ui.toast('그리폰이 하늘에 있을 때 피뢰침을 맞혀야 해요');
      g.later(5, () => { if (m.alive) m.bs.rods = alive(m.bs.rods).concat(objects(g, m, 'rod', [{ x: c.x, y: c.y }], 1.5)); });
    },
    update(g, m, dt) {
      const b = m.bs; if (b.downT > 0) b.downT -= dt;
      if (m.flying) {
        b.air -= dt; const tx = g.h.x + Math.cos(b.t) * 4, ty = g.h.y + Math.sin(b.t) * 3; g.step(m, tx, ty, dt, 1.2);
        b.drop -= dt; if (b.drop <= 0) { b.drop = 1.1; circle(g, m, g.h.x, g.h.y, 1.8, 1, 1.2, { el: 'wind' }); }
        if (b.air <= 0) { m.flying = false; m.untarget = false; circle(g, m, m.x, m.y, 3, 0.6, 1.4, { el: 'wind' }); }
        return;
      }
      b.flyT -= dt;
      if (b.flyT <= 0 && !b.busy) { b.flyT = 16; m.flying = true; m.untarget = true; b.air = 8; b.drop = 1; g.ui.toast('그리폰이 날아올랐어요! 피뢰침을 맞혀 떨어뜨려요.'); sfx('roar'); return; }
      run(g, m, dt, {
        gap: [0.9, 1.6], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2.4, 1.1),
        pats: () => [
          { f: (g2, mm) => { const a = toHero(g2, mm); line(g2, mm, a, 11, 1.8, 0.7, 0.1, { noFx: 1, then: () => dash(mm, a, 0.7, 16, 1.5) }); return 1; }, w: 3 },
          { f: (g2, mm) => { const a = toHero(g2, mm); cone(g2, mm, a, 6, 1.2, 0.8, 1, { el: 'wind', then: () => { if (g2.inShape({ cone: [mm.x, mm.y, a, 6, 1.2] }, g2.h.x, g2.h.y)) { g2.h.kx = Math.cos(a) * 18; g2.h.ky = Math.sin(a) * 18; } } }); return 1; }, w: 2 },
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 7, 0.2, 10, 0.7, 'wind'); return 0.8; }, w: 2 },
        ],
      });
    },
  },
  kai: {
    init(g, m) { m.el = 'wind'; },
    update(g, m, dt) {
      const b = m.bs;
      if (b.gale > 0) { b.gale -= dt; const a = ang(m.x, m.y, g.h.x, g.h.y); g.h.kx += Math.cos(a) * 14 * dt; g.h.ky += Math.sin(a) * 14 * dt; if (Math.random() < 0.6) g.fx.burst(m.x, 1, m.y, 2, EL3.wind, { speed: 0, vx: Math.cos(a) * 12, vz: Math.sin(a) * 12, up: 0, grav: 0, life: 0.8, size: 0.4 }); }
      run(g, m, dt, {
        gap: [0.9, 1.5], phases: [0.6, 0.3],
        onPhase: (g2, mm, ph) => { g2.ui.toast(ph === 1 ? '카이: "바람을 거스를 수 있겠나?"' : '카이: "폭풍이여, 오라!"'); sfx('roar'); },
        move: (g2, mm, d) => kite(g2, mm, d, 5.5, 1.1),
        pats: () => [
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 5, 0.25, 12, 0.85, 'wind', { look: 'cutter' }); g2.later(0.4, () => fan(g2, mm, toHero(g2, mm), 4, 0.3, 12, 0.85, 'wind')); return 1; }, w: 3 },
          { f: (g2, mm) => { const a = toHero(g2, mm), x = g2.h.x - Math.cos(a) * 2.5, y = g2.h.y - Math.sin(a) * 2.5; if (teleport(g2, mm, x, y)) cone(g2, mm, toHero(g2, mm), 3.5, 1.6, 0.6, 1.5, { el: 'wind' }); return 1; }, w: 2 },
          { f: (g2, mm) => { mm.bs.gale = 3; g2.ui.toast('거센 바람! 블링크로 버텨요'); for (let i = 0; i < 4; i++) g2.later(0.6 + i * 0.6, () => circle(g2, mm, g2.h.x + R(-2, 2), g2.h.y + R(-2, 2), 1.5, 0.8, 1.1, { el: 'wind' })); return 3; }, w: 2, ph: 1 },
          { f: (g2, mm) => { for (let i = 0; i < 8; i++) g2.later(i * 0.15, () => { const x = g2.h.x + R(-4, 4), y = g2.h.y + R(-4, 4); circle(g2, mm, x, y, 1.4, 0.7, 1.2, { el: 'wind', noFx: 1, then: () => { g2.fx.bolt(zig([x, 10, y - 1], [x, 0.1, y], 7), '#fffbe0', 0.3); sfx('zap'); } }); }); return 1.8; }, w: 2, ph: 2 },
        ],
      });
    },
  },
  // ───── 6장 ─────
  forbiddenBook: {
    init(g, m) { m.el = 'dark'; m.bs.open = 0; m.bs.cyc = 6; },
    onHurt(g, m) { return m.bs.open > 0 ? 2 : 0.5; },
    update(g, m, dt) {
      const b = m.bs; b.cyc -= dt;
      if (b.open > 0) { b.open -= dt; shieldBubble(m, false); m.model.root.scale.setScalar(1.15); if (b.open <= 0) g.ui.toast('금서가 다시 덮였어요'); }
      else { shieldBubble(m, true, '#a060ff'); m.model.root.scale.setScalar(1); }
      if (b.cyc <= 0) { b.cyc = 13; b.open = 5; minions(g, m, 'book_mimic', 3, 3); g.ui.toast('금서가 펼쳐졌어요! 지금은 피해가 두 배!'); sfx('roar'); }
      run(g, m, dt, {
        gap: [1, 1.6], phases: [0.5],
        move: (g2, mm, d) => kite(g2, mm, d, 5, 0.7),
        pats: () => [
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 7 + mm.bs.phase * 2, 0.22, 8, 0.75, 'dark'); return 0.8; }, w: 3 },
          { f: (g2, mm) => { for (let i = 0; i < 4; i++) g2.later(i * 0.25, () => circle(g2, mm, g2.h.x + R(-2, 2), g2.h.y + R(-2, 2), 1.7, 1, 1.2, { el: 'dark' })); return 1.4; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); line(g2, mm, a, 13, 1.6, 1, 1.6, { el: 'dark' }); return 1.2; }, w: 2 },
        ],
      });
    },
  },
  nekros: {
    init(g, m) { m.el = 'dark'; m.undying = 1; g.later(0.05, () => { m.bs.jars = objects(g, m, 'phylactery', anchors(g).slice(0, 3), 4); g.ui.toast('영혼 그릇이 남아 있는 한 네크로스는 쓰러지지 않아요!'); }); },
    onHurt(g, m) { if (alive(m.bs.jars).length && m.hp < m.max * 0.15) { g.later(0.01, () => { if (m.alive) { m.hp = m.max * 0.4; g.ui.toast('네크로스가 영혼 그릇의 힘으로 되살아났어요!'); g.fx.pillar(m.x, m.y, 'heal', 6, 1.2, 1); sfx('roar'); } }); } return 1; },
    onChild(g, m, c) { if (c.id === 'phylactery') { const n = alive(m.bs.jars).length; g.ui.toast(n ? `영혼 그릇 ${n}개 남음` : '영혼 그릇이 모두 깨졌어요! 이제 쓰러뜨릴 수 있어요.'); } },
    update(g, m, dt) {
      const jars = alive(m.bs.jars); shieldBubble(m, jars.length > 0, '#80ff80');
      for (const [i, j] of jars.entries()) { const a = m.bs.t * 0.4 + i * 2.09; const x = g.A.arena.x + Math.cos(a) * 5.5, y = g.A.arena.y + Math.sin(a) * 4.5; if (g.walk(x, y)) { j.x = x; j.y = y; } }
      if (m.hp <= m.max * 0.15 && jars.length) m.hp = m.max * 0.4;
      run(g, m, dt, {
        gap: [1, 1.6], phases: [0.5],
        move: (g2, mm, d) => kite(g2, mm, d, 6, 0.7),
        pats: () => [
          { f: (g2, mm) => { const a0 = toHero(g2, mm); for (let i = 0; i < 3; i++) g2.later(i * 0.5, () => line(g2, mm, a0 + (i - 1) * 0.5, 14, 1.5, 0.9, 1.5, { el: 'dark' })); return 2; }, w: 3 },
          { f: (g2, mm) => { if (alive(g2.mons.filter((x) => x.parent === mm && x.id === 'skeleton')).length < 4) minions(g2, mm, 'skeleton', 3, 3); return 0.8; }, w: 1 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3.6, 1, 1.5, { el: 'dark' }); return 1.2; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 4; i++) g2.later(i * 0.25, () => g2.eshot(mm, toHero(g2, mm) + R(-0.8, 0.8), { speed: 5, mult: 0.9, el: 'dark', home: 2, range: 16 })); return 1.2; }, w: 2, ph: 1 },
        ],
      });
    },
  },
  // ───── 7장 ─────
  clocktower: {
    init(g, m) { m.el = 'time'; m.bs.noon = 7; },
    update(g, m, dt) {
      const b = m.bs; b.noon -= dt;
      if (b.noon <= 0 && !b.busy) {
        b.noon = 13; const r = 6.5;
        g.ui.toast('🕛 바늘이 12시로! 큰 원 밖으로 빠져나가요!'); sfx('warn');
        g.telegraph({ kind: 'circle', x: m.x, y: m.y, r, dur: 3, src: m, mult: 2.4, el: 'time', st: 'stun', shake: 0.5 });
        b.busy = 3.2; return;
      }
      run(g, m, dt, {
        gap: [0.9, 1.5], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2.5, 0.7),
        pats: () => [
          { f: (g2, mm) => { const a0 = R(0, 1); for (let k = 0; k < 2; k++) g2.later(k * 0.9, () => { for (let i = 0; i < 4; i++) line(g2, mm, a0 + k * 0.4 + i * Math.PI / 2, 10, 1.3, 0.8, 1.3, { el: 'time' }); }); return 2; }, w: 3 },
          { f: (g2, mm) => { ring(g2, mm, 14, 6, 0.75, 'time', R(0, 1)); return 0.9; }, w: 2 },
          { f: (g2, mm) => { cone(g2, mm, toHero(g2, mm), 4, 1.6, 0.8, 1.6, { el: 'earth', shake: 0.3 }); return 1.1; }, w: 2 },
        ],
      });
    },
  },
  baltar: {
    init(g, m) { m.el = 'time'; m.bs.rew = 12; g.later(0.05, () => { m.bs.clocks = objects(g, m, 'clock', anchors(g).slice(2, 4), 5); g.ui.toast('되감는 시계가 있으면 발타르가 체력을 되돌려요! 시계부터 부수세요.'); }); },
    onChild(g, m, c) { if (c.id === 'clock') g.ui.toast(alive(m.bs.clocks).length ? '시계 하나를 부쉈어요' : '시계를 모두 부쉈어요! 이제 되돌리지 못해요.'); },
    update(g, m, dt) {
      const b = m.bs; b.rew -= dt; const cl = alive(b.clocks);
      if (b.rew <= 0) { b.rew = 14; if (cl.length && m.hp < m.max) { m.hp = Math.min(m.max, m.hp + m.max * 0.12 * cl.length); g.ui.toast('⏪ 발타르가 시간을 되감았어요!'); g.fx.ring(m.x, m.y, 4, '#f0d080', { dur: 0.8 }); for (const c of cl) g.fx.beam(c.x, 1.5, c.y, m.x, 1.5, m.y, 'time', 0.2, 0.6); sfx('roar'); } }
      run(g, m, dt, {
        gap: [0.9, 1.5], phases: [0.5],
        onPhase: (g2, mm) => { minions(g2, mm, 'cult_mage', 2, 4); g2.ui.toast('발타르: "시간은 내 편이다!"'); },
        move: (g2, mm, d) => kite(g2, mm, d, 6, 0.9),
        pats: () => [
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 5, 0.3, 7, 0.8, 'time', { st: 'slow' }); return 0.8; }, w: 3 },
          { f: (g2, mm) => { for (let i = 0; i < 5; i++) g2.later(i * 0.2, () => circle(g2, mm, g2.h.x + R(-2.5, 2.5), g2.h.y + R(-2.5, 2.5), 1.6, 1, 1.2, { el: 'time', st: 'slow' })); return 1.3; }, w: 2 },
          { f: (g2, mm) => { const x = g2.A.arena.x + R(-5, 5), y = g2.A.arena.y + R(-3, 3); teleport(g2, mm, x, y); g2.later(0.2, () => { for (const a of [0, Math.PI / 2]) { line(g2, mm, a, 12, 1.4, 1, 1.4, { el: 'time', x: g2.h.x - Math.cos(a) * 6, y: g2.h.y - Math.sin(a) * 6 }); } }); return 1.4; }, w: 2 },
          { f: (g2, mm) => { ring(g2, mm, 16, 5.5, 0.8, 'time'); g2.later(0.6, () => ring(g2, mm, 16, 5.5, 0.8, 'time', 0.2)); return 1.3; }, w: 1, ph: 1 },
        ],
      });
    },
  },
  // ───── 8장 ─────
  wyvern: {
    init(g, m) { m.el = 'fire'; m.flying = true; m.flyHit = 1; m.bs.landT = 0; },
    onHurt(g, m) { return m.flying ? 0.55 : 1.4; },
    update(g, m, dt) {
      const b = m.bs;
      if (b.landT > 0) { b.landT -= dt; if (b.landT <= 0) { m.flying = true; g.ui.toast('와이번이 다시 날아올랐어요'); } }
      run(g, m, dt, {
        gap: [0.9, 1.4], phases: [0.5],
        move: (g2, mm, d) => (mm.flying ? kite(g2, mm, d, 6, 1.3) : chase(g2, mm, d, 2.5)),
        pats: () => [
          { f: (g2, mm) => { const a = toHero(g2, mm); line(g2, mm, a, 15, 2, 0.9, 0.1, { noFx: 1, el: 'fire', then: () => { mm.flying = false; dash(mm, a, 0.9, 17, 1.7, () => { mm.bs.landT = 4; g2.shake(0.4); circle(g2, mm, mm.x, mm.y, 2.6, 0.4, 1.2, { el: 'fire' }); g2.ui.toast('와이번이 내려앉았어요! 지금 공격!'); }); } }); return 1.2; }, w: 3, if: () => m.flying },
          { f: (g2, mm) => { const a = toHero(g2, mm), p = a + Math.PI / 2; for (const k of [-3, 0, 3]) line(g2, mm, a, 16, 1.4, 1, 1.4, { el: 'fire', x: mm.x + Math.cos(p) * k, y: mm.y + Math.sin(p) * k }); return 1.2; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 7; i++) g2.later(i * 0.15, () => circle(g2, mm, g2.h.x + R(-3, 3), g2.h.y + R(-3, 3), 1.5, 0.9, 1.2, { el: 'fire' })); return 1.4; }, w: 2 },
          { f: (g2, mm) => { cone(g2, mm, toHero(g2, mm), 6, 1, 0.8, 1.5, { el: 'fire' }); return 1; }, w: 2, if: () => !m.flying },
        ],
      });
    },
  },
  azdaha: {
    init(g, m) { m.el = 'fire'; m.flyHit = 1; m.bs.crys = 10; m.bs.weak = 0; },
    onHurt(g, m) { return m.bs.weak > 0 ? 2 : m.flying ? 0.35 : 0.6; },
    onChild(g, m, c) { if (c.id === 'ice_crystal') { m.bs.weak = 7; m.st.stun = 2.5; m.flying = false; g.ui.toast('얼음 결정이 깨지며 용이 얼어붙었어요! 약점이 드러났어요!'); g.fx.burst(m.x, 2, m.y, 60, EL3.ice, { speed: 5, up: 4 }); sfx('break'); } },
    update(g, m, dt) {
      const b = m.bs;
      if (b.weak > 0) { b.weak -= dt; shieldBubble(m, false); } else shieldBubble(m, true, '#ff8040');
      b.crys -= dt;
      if (b.crys <= 0 && !alive(g.mons.filter((x) => x.parent === m && x.id === 'ice_crystal')).length) {
        b.crys = 16; const p = anchors(g)[Math.floor(Math.random() * 4)];
        g.fx.burst(p.x, 8, p.y, 1, ['#c8f0ff'], { speed: 0, up: -14, grav: -20, size: 2, life: 0.4 });
        g.later(0.4, () => { objects(g, m, 'ice_crystal', [p], 4); g.ui.toast('❄️ 얼음 결정이 떨어졌어요! 부수면 용의 약점이 드러나요.'); sfx('bigboom', 'ice'); });
      }
      if (b.fly > 0) { b.fly -= dt; if (b.fly <= 0) { m.flying = false; circle(g, m, m.x, m.y, 4, 0.6, 1.6, { el: 'fire', shake: 0.6 }); } }
      run(g, m, dt, {
        gap: [0.8, 1.3], phases: [0.66, 0.33],
        onPhase: (g2, mm, ph) => { sfx('roar'); g2.shake(0.8); g2.ui.banner(ph === 1 ? '아즈다하가 분노해요' : '재앙의 날개', ph === 1 ? '불꽃이 하늘에서 쏟아져요' : '용이 하늘로 날아올라요'); mm.ms = { ...mm.ms, atk: Math.round(mm.ms.atk * 1.1) }; },
        move: (g2, mm, d) => chase(g2, mm, d, 3.2, 0.9),
        pats: () => [
          { f: (g2, mm) => { const a = toHero(g2, mm); cone(g2, mm, a, 7.5, 1.1, 1, 1.8, { el: 'fire', shake: 0.4 }); return 1.3; }, w: 3 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3.6, 0.8, 1.6, { el: 'earth', shake: 0.4 }); return 1; }, w: 2 },
          { f: (g2, mm) => { const a = toHero(g2, mm); for (const d of [-0.6, -0.2, 0.2, 0.6]) line(g2, mm, a + d, 12, 1.2, 0.9, 1.4, { el: 'fire' }); return 1.2; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 10; i++) g2.later(i * 0.14, () => { const x = g2.h.x + R(-4, 4), y = g2.h.y + R(-4, 4); circle(g2, mm, x, y, 1.6, 1, 1.3, { el: 'fire', noFx: 0 }); }); return 1.8; }, w: 2, ph: 1 },
          { f: (g2, mm) => { mm.flying = true; mm.bs.fly = 4; for (let i = 0; i < 6; i++) g2.later(0.5 + i * 0.55, () => { ring(g2, mm, 10, 5.5, 0.8, 'fire', i * 0.3); circle(g2, mm, g2.h.x, g2.h.y, 2, 0.9, 1.3, { el: 'fire' }); }); return 4.2; }, w: 2, ph: 2 },
        ],
      });
    },
  },
  // ───── 시험관 ─────
  exam: {
    init(g, m) { m.el = 'arcane'; m.bs.rank = +m.id.split('_')[1] || 1; },
    update(g, m, dt) {
      const rk = m.bs.rank;
      run(g, m, dt, {
        gap: [1.3 - rk * 0.15, 2 - rk * 0.2], phases: [0.5],
        move: (g2, mm, d) => chase(g2, mm, d, 2.2, 0.8),
        pats: () => [
          { f: (g2, mm) => { circle(g2, mm, g2.h.x, g2.h.y, 2, 1.1 - rk * 0.1, 1.3, { el: 'arcane' }); if (rk >= 2) g2.later(0.4, () => circle(g2, mm, g2.h.x, g2.h.y, 2, 1, 1.3, { el: 'arcane' })); return 1.2; }, w: 2 },
          { f: (g2, mm) => { const a0 = R(0, 1), n = 2 + rk; for (let i = 0; i < n; i++) line(g2, mm, a0 + (i / n) * Math.PI * 2, 9, 1.2, 1, 1.3, { el: 'arcane' }); return 1.3; }, w: 2 },
          { f: (g2, mm) => { ring(g2, mm, 6 + rk * 3, 5.5, 0.8, 'arcane'); return 0.9; }, w: 2 },
          { f: (g2, mm) => { circle(g2, mm, mm.x, mm.y, 3.2, 0.9, 1.5, { el: 'arcane', shake: 0.3 }); return 1.1; }, w: 1, ph: 1 },
        ],
      });
    },
  },
  orbenExam: {
    init(g, m) { m.el = 'arcane'; },
    update(g, m, dt) {
      run(g, m, dt, {
        gap: [0.7, 1.2], phases: [0.6, 0.3],
        onPhase: (g2, mm, ph) => g2.ui.toast(ph === 1 ? '오르벤: "좋아, 조금 더 빠르게 가 보자꾸나."' : '오르벤: "블링크는 마법사의 첫 번째 친구라고 했지?"'),
        move: (g2, mm, d) => kite(g2, mm, d, 6, 1.1),
        pats: () => [
          { f: (g2, mm) => { fan(g2, mm, toHero(g2, mm), 5, 0.22, 11, 0.8, 'arcane'); g2.later(0.35, () => fan(g2, mm, toHero(g2, mm), 4, 0.3, 11, 0.8, 'arcane')); return 0.9; }, w: 3 },
          { f: (g2, mm) => { const a = R(0, 6.28); teleport(g2, mm, g2.h.x + Math.cos(a) * 5, g2.h.y + Math.sin(a) * 4); g2.later(0.15, () => circle(g2, mm, g2.h.x, g2.h.y, 2.2, 0.85, 1.4, { el: 'arcane' })); return 1; }, w: 2 },
          { f: (g2, mm) => { for (let i = 0; i < 3; i++) g2.later(i * 0.5, () => ring(g2, mm, 12, 6, 0.75, 'arcane', i * 0.26)); return 1.6; }, w: 2, ph: 1 },
          { f: (g2, mm) => { for (const el of ['fire', 'ice', 'light', 'dark']) { const a = R(0, 6.28); line(g2, mm, a, 12, 1.3, 1, 1.3, { el, x: g2.h.x - Math.cos(a) * 6, y: g2.h.y - Math.sin(a) * 6 }); } return 1.3; }, w: 2, ph: 2 },
        ],
      });
    },
  },
};
