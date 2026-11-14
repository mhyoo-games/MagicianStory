// 실시간 진행: 움직임 · 전투 · 몬스터 · 마법 · 드랍 · 이야기 진행. 그리기도 여기서.
import * as R from './rules.js';
import { buildArea, TILE, isSolid, G, PATH, WATER, WALL, FLOOR, VILLAGE_HOUSES } from './world.js';
import { SKILLS, skillAt, ELEM_NAME } from './data/skills.js';
import { ITEMS, CONSUMABLES, RARITY, EL_COLOR } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { CHAPTERS, NPCS, HEROES, ENDING } from './data/story.js';
import * as SP from './sprites.js';
import { ELEM_PAL, THEMES } from './art.js';
import { sfx, music } from './sound.js';

const rnd = Math.random;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export class Game {
  constructor(canvas, ui, input) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ui = ui; this.input = input;
    this.s = null; this.A = null; this.t = 0; this.paused = true; this.fx = []; this.texts = [];
    this.view = { w: 480, h: 270 };
  }

  // ───────── 시작 / 저장 ─────────
  start(save) {
    this.s = save; this.buffs = []; this.cds = {}; this.atkCd = 0;
    const hs = R.heroStats(save);
    this.hero = { x: 0, y: 0, dir: 'down', anim: 0, moving: false, castT: 0, hp: hs.hp, mp: hs.mp, inv: 0, slowT: 0, stunT: 0, dead: false };
    this.pet = { x: 0, y: 0, dir: 'left', anim: 0, sit: 0 };
    this.recalc();
    this.enter(save.area && save.area !== 'tower' ? save.area : 'village', save.pos);
    this.paused = false;
    if (!save.hasSeenPrologue) { save.hasSeenPrologue = true; this.ui.showPrologue(() => this.ui.banner(CHAPTERS[1].title)); }
    else this.ui.banner(this.A.name);
  }
  save() { if (!this.s) return; this.s.area = this.A.id === 'tower' ? 'village' : this.A.id; this.s.pos = this.A.id === 'tower' ? null : { x: this.hero.x, y: this.hero.y }; try { localStorage.setItem(R.SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* 저장 못 해도 계속 */ } }
  recalc() {
    this.hs = R.heroStats(this.s, this.buffs);
    if (this.hero) { this.hero.hp = Math.min(this.hero.hp, this.hs.hp); this.hero.mp = Math.min(this.hero.mp, this.hs.mp); }
    this.look = this.heroLook();
    this.ui.refresh();
  }
  heroLook() {
    const s = this.s, base = HEROES[s.hero].look;
    const st = R.equipped(s, 'staff'), hat = R.equipped(s, 'hat'), robe = R.equipped(s, 'robe');
    const o = { ...base, outfit: [200, 66, 58], kind: s.hero === 'boy' ? 'tunic' : 'dress', pants: [70, 60, 60] };
    if (s.hero === 'boy') o.outfit = [90, 60, 130];
    if (robe) { const L = ITEMS[robe.id].look; o.outfit = L.c; o.kind = L.kind === 'dress' && s.hero === 'boy' ? 'tunic' : L.kind || 'robe'; o.band = L.band; }
    if (hat) { const L = ITEMS[hat.id].look; o.hat = { c: L.c, band: L.band, gem: L.gem }; }
    if (st) { const L = ITEMS[st.id].look; o.staff = { orb: L.orb, wood: L.wood }; }
    return o;
  }

  // ───────── 지역 들어가기 ─────────
  enter(areaId, pos) {
    this.A = buildArea(areaId);
    this.mons = []; this.projs = []; this.fx = []; this.texts = []; this.drops = []; this.fields = []; this.orbits = []; this.teles = []; this.hazards = [];
    this.boss = null; this.exam = null; this.respawnQ = [];
    const e = pos && !isSolid(this.A, pos.x, pos.y) ? pos : { x: (this.A.entry.x + 0.5) * TILE, y: (this.A.entry.y + 0.5) * TILE };
    this.hero.x = e.x; this.hero.y = e.y; this.pet.x = e.x + 14; this.pet.y = e.y;
    this.exitLock = 0.6;
    this.cats = (this.A.cats || []).map(([id, x, y]) => ({ id, x: x * TILE, y: y * TILE, dir: 'left', anim: 0, t: rnd() * 3, sit: rnd() < 0.5, vx: 0 }));
    this.npcs = this.A.npcs.map((n) => ({ ...n, x: n.x * TILE, y: n.y * TILE }));
    if (this.A.info) this.spawnArea();
    this.s.area = areaId;
    music.play(this.A.safe ? 'town' : this.A.indoor ? 'dungeon' : 'field', this.A.theme);
    this.ui.areaChanged(this.A);
    this.save();
  }
  spawnArea() {
    const A = this.A, list = A.info.mons, n = Math.min(A.spawns.length, A.indoor ? 20 : 16);
    for (let i = 0; i < n; i++) {
      const sp = A.spawns[i];
      if ((sp.x * TILE - this.hero.x) ** 2 + (sp.y * TILE - this.hero.y) ** 2 < 120 ** 2) continue;
      this.spawn(list[i % list.length], (sp.x + 0.5) * TILE, (sp.y + 0.5) * TILE);
    }
    // 중간보스·보스
    const st = R.curStep(this.s);
    const midId = A.info.mid, bossId = A.info.boss;
    if (midId && ((st && st.type === 'mid' && st.mon === midId) || this.s.beaten[midId])) this.spawnBoss(midId, !(st && st.type === 'mid' && st.mon === midId));
    if (bossId && ((st && st.type === 'boss' && st.mon === bossId) || this.s.beaten[bossId])) this.spawnBoss(bossId, !(st && st.type === 'boss' && st.mon === bossId));
  }
  spawn(id, x, y, extra = {}) {
    const m = MONSTERS[id], ms = R.monsterStats(m);
    const e = { m, ms, x, y, hp: ms.hp, maxHp: ms.hp, dir: 'down', anim: rnd() * 4, state: 'idle', t: rnd() * 2, home: { x, y }, atkCd: 1 + rnd(), patCd: 2.5, st: {}, flash: 0,
      r: 6 * m.scale, scale: m.scale, alive: true, vx: 0, vy: 0, ...extra };
    this.mons.push(e);
    return e;
  }
  spawnBoss(id, replay) {
    const A = this.A, e = this.spawn(id, (A.arena.x + 0.5) * TILE, (A.arena.y + 0.5) * TILE, { isBoss: true, asleep: true, replay });
    this.boss = e;
  }

  // ───────── 매 프레임 ─────────
  update(dt) {
    if (this.paused || !this.s) return;
    dt = Math.min(dt, 0.05);
    this.t += dt; this.s.time += dt;
    const h = this.hero, hs = this.hs, inp = this.input;
    this.exitLock = Math.max(0, this.exitLock - dt);
    // 버프·재사용
    let changed = false;
    for (const b of this.buffs) { b.t -= dt; if (b.t <= 0) changed = true; }
    if (changed) { this.buffs = this.buffs.filter((b) => b.t > 0); this.recalc(); }
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    // 회복
    if (!h.dead) {
      h.hp = Math.min(hs.hp, h.hp + (hs.regen + (this.A.safe ? hs.hp * 0.04 : 0)) * dt);
      h.mp = Math.min(hs.mp, h.mp + (hs.mpRegen + (this.A.safe ? hs.mp * 0.05 : 0)) * dt);
    }
    h.inv = Math.max(0, h.inv - dt); h.castT = Math.max(0, h.castT - dt); h.slowT = Math.max(0, h.slowT - dt); h.stunT = Math.max(0, h.stunT - dt);
    // 움직임
    let mx = 0, my = 0;
    if (!h.dead && !this.ui.blocking && h.stunT <= 0) { const v = inp.move(); mx = v.x; my = v.y; }
    const len = Math.hypot(mx, my);
    h.moving = len > 0.1;
    if (h.moving) {
      mx /= Math.max(1, len); my /= Math.max(1, len);
      if (Math.abs(mx) > Math.abs(my) + 0.1) h.dir = mx < 0 ? 'left' : 'right'; else if (Math.abs(my) > 0.1) h.dir = my < 0 ? 'up' : 'down';
      const sp = 78 * (hs.speed / 100) * (h.slowT > 0 ? 0.5 : 1) * (h.castT > 0 ? 0.6 : 1);
      this.moveEnt(h, mx * sp * dt, my * sp * dt, 5);
      h.anim += dt * 8;
    } else h.anim = 0;
    // 행동
    if (!h.dead && !this.ui.blocking) {
      if (inp.held('attack')) this.basicAttack();
      for (let i = 0; i < 6; i++) if (inp.pressed('skill' + i)) this.castSlot(i);
      if (inp.pressed('hp')) this.usePotion('hp');
      if (inp.pressed('mp')) this.usePotion('mp');
      if (inp.pressed('talk')) this.interact();
    }
    this.updatePet(dt);
    this.updateCats(dt);
    this.updateMons(dt);
    this.updateProjs(dt);
    this.updateFx(dt);
    this.updateDrops(dt);
    this.updateExits();
    this.updateExam(dt);
    // 리스폰
    for (const q of this.respawnQ) q.t -= dt;
    const ready = this.respawnQ.filter((q) => q.t <= 0); this.respawnQ = this.respawnQ.filter((q) => q.t > 0);
    for (const q of ready) {
      const sp = this.A.spawns[Math.floor(rnd() * this.A.spawns.length)];
      const x = (sp.x + 0.5) * TILE, y = (sp.y + 0.5) * TILE;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 < 160 ** 2) { q.t = 3; this.respawnQ.push(q); continue; }
      this.spawn(q.id, x, y);
    }
    // 가까운 사람 안내
    this.nearNpc = this.npcs.find((n) => (n.x - h.x) ** 2 + (n.y - h.y) ** 2 < 26 ** 2) || null;
    if (Math.floor(this.s.time) % 30 === 0 && Math.floor(this.s.time - dt) % 30 !== 0) this.save();
  }

  moveEnt(e, dx, dy, r) {
    const A = this.A;
    const ok = (x, y) => !isSolid(A, x - r, y - 2) && !isSolid(A, x + r, y - 2) && !isSolid(A, x - r, y + 4) && !isSolid(A, x + r, y + 4);
    if (ok(e.x + dx, e.y)) e.x += dx;
    if (ok(e.x, e.y + dy)) e.y += dy;
    e.x = Math.max(4, Math.min(A.w * TILE - 4, e.x)); e.y = Math.max(4, Math.min(A.h * TILE - 4, e.y));
  }

  // ───────── 주인공 공격 ─────────
  aim(range = 150) {
    const h = this.hero; let best = null, bd = range * range;
    for (const m of this.mons) { if (!m.alive || m.asleep && !m.awake) continue; const d = dist2(h, m); if (d < bd) { bd = d; best = m; } }
    if (best) { const a = Math.atan2(best.y - 6 * best.scale - (h.y - 8), best.x - h.x); return { a, target: best }; }
    const [dx, dy] = DIRV[h.dir]; return { a: Math.atan2(dy, dx), target: null };
  }
  faceTo(a) {
    const c = Math.cos(a), s = Math.sin(a);
    this.hero.dir = Math.abs(c) > Math.abs(s) ? (c < 0 ? 'left' : 'right') : (s < 0 ? 'up' : 'down');
  }
  basicAttack() {
    if (this.atkCd > 0 || this.hero.stunT > 0 || this.A.safe && !this.exam) return;
    const el = this.hs.staffEl || 'arcane';
    const { a } = this.aim(160);
    this.faceTo(a);
    this.atkCd = 0.42 * (1 - this.hs.cdr / 200);
    this.hero.castT = 0.18;
    this.shoot({ a, power: 0.9, el, style: el === 'arcane' ? 'arcane' : el === 'wind' ? 'wind' : el, speed: 230, life: 0.75 });
    sfx('shoot', el);
  }
  shoot(o) {
    const h = this.hero, sx = h.x + Math.cos(o.a) * 8, sy = h.y - 10 + Math.sin(o.a) * 6;
    this.projs.push({ from: 'hero', x: sx, y: sy, vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed, a: o.a, life: o.life || 0.9, power: o.power, el: o.el, style: o.style || o.el,
      pierce: o.pierce, hits: new Set(), r: o.r || 5, st: o.st, boom: o.boom, scale: o.scale || 1, sk: o.sk });
  }
  castSlot(i) {
    const id = this.s.slots[i]; if (!id) return;
    const lv = this.s.skills[id]; if (!lv) return;
    const sk = skillAt(SKILLS[id], lv);
    if (this.A.safe && !this.exam && !['buff', 'heal', 'dash'].includes(sk.kind)) { this.ui.toast('마을 안에서는 공격 마법을 쓸 수 없어요'); return; }
    if ((this.cds[id] || 0) > 0) return;
    if (this.hero.mp < sk.mp) { this.ui.toast('마나가 부족해요'); sfx('nope'); return; }
    this.hero.mp -= sk.mp;
    this.cds[id] = sk.cd * (1 - this.hs.cdr / 100);
    this.cdMax = this.cdMax || {}; this.cdMax[id] = this.cds[id];
    this.hero.castT = 0.35;
    this.useSkill(sk);
  }
  useSkill(sk) {
    const h = this.hero, el = sk.el === 'arcane' ? 'arcane' : sk.el, style = sk.style || el;
    const { a, target } = this.aim(sk.kind === 'line' ? sk.len : 170);
    if (!['buff', 'heal', 'passive'].includes(sk.kind)) this.faceTo(a);
    const tp = target ? { x: target.x, y: target.y } : { x: h.x + Math.cos(a) * 80, y: h.y + Math.sin(a) * 80 };
    sfx('cast', el);
    switch (sk.kind) {
      case 'bolt': this.shoot({ a, power: sk.power, el, style, speed: sk.fast ? 320 : 240, pierce: sk.pierce, st: sk.st, boom: sk.boom, r: sk.big ? 7 + sk.big * 2 : 5, scale: sk.big ? 1 + sk.big * 0.5 : 1, life: 1, sk }); break;
      case 'multi': {
        const n = sk.n, spr = sk.spread ?? 0.6;
        for (let k = 0; k < n; k++) {
          const aa = spr >= 6 ? (k / n) * Math.PI * 2 : a + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spr);
          this.shoot({ a: aa, power: sk.power, el, style, speed: sk.fast ? 300 : 230, pierce: sk.pierce, st: sk.st, boom: sk.boom, r: sk.big ? 7 : 5, scale: sk.big ? 1.4 : 1, life: 0.9, sk });
        }
        break;
      }
      case 'nova': this.boom(h.x, h.y - 6, sk.r, sk.power, el, sk.st, true); break;
      case 'area': {
        const d = sk.delay || 0.25;
        this.teles.push({ x: tp.x, y: tp.y, r: sk.r, t: 0, dur: d, friendly: true, el, then: () => this.boom(tp.x, tp.y, sk.r, sk.power, el, sk.st, true) });
        break;
      }
      case 'rain': {
        const n = sk.n, br = sk.boomR || 20;
        for (let k = 0; k < n; k++) {
          const ang = rnd() * 6.283, d = Math.sqrt(rnd()) * sk.r * 0.6;
          const x = tp.x + Math.cos(ang) * d, y = tp.y + Math.sin(ang) * d;
          this.teles.push({ x, y, r: br, t: -k * (1.6 / n), dur: 0.35, friendly: true, el, style, then: () => this.boom(x, y, br, sk.power, el, sk.st, false, style === 'storm') });
        }
        break;
      }
      case 'line': {
        const L = sk.len, w = sk.w || 14, x2 = h.x + Math.cos(a) * L, y2 = h.y - 8 + Math.sin(a) * L;
        this.fx.push({ kind: 'beam', x: h.x, y: h.y - 8, x2, y2, w, el, t: 0, dur: 0.3 });
        for (const m of this.mons) if (m.alive && segDist(m.x, m.y - 6 * m.scale, h.x, h.y - 8, x2, y2) < w / 2 + m.r) this.hit(m, sk.power, el, sk.st, a);
        break;
      }
      case 'field': this.fields.push({ x: tp.x, y: tp.y, r: sk.r, el, t: 0, dur: sk.dur, tick: 0, power: sk.power, st: sk.st, pull: sk.pull, heal: sk.heal, vx: sk.move ? Math.cos(a) * 40 : 0, vy: sk.move ? Math.sin(a) * 40 : 0 }); break;
      case 'orbit': this.orbits.push({ n: sk.n, t: 0, dur: sk.dur, power: sk.power, el, st: sk.st, ang: 0, hitT: new Map() }); break;
      case 'chain': {
        let from = { x: h.x, y: h.y - 10 }, hitSet = new Set(), pts = [[from.x, from.y]];
        for (let k = 0; k < sk.n; k++) {
          let best = null, bd = (k === 0 ? 170 : 100) ** 2;
          for (const m of this.mons) { if (!m.alive || hitSet.has(m)) continue; const d = (m.x - from.x) ** 2 + (m.y - from.y) ** 2; if (d < bd) { bd = d; best = m; } }
          if (!best) break;
          hitSet.add(best); this.hit(best, sk.power * (1 - k * 0.06), el, sk.st || 'stun', null, 0.15);
          from = { x: best.x, y: best.y - 6 * best.scale }; pts.push([from.x, from.y]);
        }
        if (pts.length === 1) pts.push([h.x + Math.cos(a) * 60, h.y + Math.sin(a) * 60]);
        this.fx.push({ kind: 'bolt', pts, t: 0, dur: 0.25 });
        break;
      }
      case 'buff': {
        const st = { ...sk.buff }; this.buffs = this.buffs.filter((b) => b.id !== sk.id);
        this.buffs.push({ id: sk.id, name: sk.name, st, t: sk.dur, el }); this.recalc();
        this.fx.push({ kind: 'ring', x: h.x, y: h.y - 8, el, t: 0, dur: 0.6 });
        this.text(h.x, h.y - 30, sk.name, '#fff');
        break;
      }
      case 'heal': {
        const v = Math.round(this.hs.hp * sk.heal); h.hp = Math.min(this.hs.hp, h.hp + v);
        this.text(h.x, h.y - 28, '+' + v, '#7dff8a');
        if (sk.regen) { this.buffs = this.buffs.filter((b) => b.id !== sk.id + 'r'); this.buffs.push({ id: sk.id + 'r', name: sk.name, st: { regen: Math.round(this.hs.hp * 0.02) }, t: 6, el }); this.recalc(); }
        this.fx.push({ kind: 'ring', x: h.x, y: h.y - 8, el: 'light', t: 0, dur: 0.6 });
        sfx('heal');
        break;
      }
      case 'dash': {
        const [dx, dy] = DIRV[h.dir], step = 4;
        this.fx.push({ kind: 'puff', x: h.x, y: h.y - 8, el, t: 0, dur: 0.4 });
        for (let k = 0; k < sk.dist / step; k++) { const nx = h.x + dx * step, ny = h.y + dy * step; if (isSolid(this.A, nx, ny)) break; h.x = nx; h.y = ny; }
        h.inv = Math.max(h.inv, 0.3);
        this.fx.push({ kind: 'puff', x: h.x, y: h.y - 8, el, t: 0, dur: 0.4 });
        break;
      }
    }
  }
  boom(x, y, r, power, el, st, big, storm) {
    { const dd = r * 2.2, size = dd > 56 ? 64 : dd > 36 ? 48 : 32; this.fx.push({ kind: 'burst', x, y, el, size, scale: dd / size, t: 0, dur: 0.42 }); }
    if (storm) this.fx.push({ kind: 'bolt', pts: [[x + rnd() * 10 - 5, y - 140], [x + rnd() * 12 - 6, y - 90], [x + rnd() * 12 - 6, y - 40], [x, y]], t: 0, dur: 0.2 });
    for (const m of this.mons) if (m.alive && (m.x - x) ** 2 + (m.y - 4 * m.scale - y) ** 2 < (r + m.r) ** 2) this.hit(m, power, el, st, Math.atan2(m.y - y, m.x - x));
    if (big) this.shake = Math.max(this.shake || 0, 0.15);
    sfx('boom', el);
  }
  hit(m, power, el, st, ang, stunCh) {
    if (!m.alive) return;
    if (m.asleep && !m.awake) this.wake(m);
    const r = R.damageToMonster(this.hs, power, el, m.m, rnd(), rnd());
    let dmg = r.dmg; if (m.st.curseT > 0) dmg = Math.round(dmg * 1.25);
    m.hp -= dmg; m.flash = 0.12;
    this.text(m.x + (rnd() * 8 - 4), m.y - 18 * m.scale, String(dmg), r.crit ? '#ffd23f' : r.weak ? '#ff8a5c' : r.resist ? '#a0a0b0' : '#ffffff', r.crit);
    if (this.hs.drain > 0) this.hero.hp = Math.min(this.hs.hp, this.hero.hp + dmg * this.hs.drain / 100);
    if (st) this.applyStatus(m, st, dmg, ang, stunCh);
    if (m.hp <= 0) this.kill(m);
    else sfx('hit');
  }
  applyStatus(m, st, dmg, ang, stunCh) {
    const k = m.m.role === 'normal' ? 1 : 0.35, S = m.st;
    if (st === 'burn') { S.burnT = 3; S.burnDps = Math.max(S.burnDps || 0, dmg * 0.12); }
    else if (st === 'poison') { S.poisonT = 4; S.poisonDps = Math.max(S.poisonDps || 0, dmg * 0.1); }
    else if (st === 'slow') S.slowT = 2.5 * (k < 1 ? 0.6 : 1);
    else if (st === 'freeze') S.freezeT = 1.4 * k;
    else if (st === 'root') S.rootT = 2 * k;
    else if (st === 'stun') { if (rnd() < (stunCh ?? 0.35)) S.stunT = 1 * k; }
    else if (st === 'knock' && ang != null && m.m.role === 'normal') { m.vx += Math.cos(ang) * 160; m.vy += Math.sin(ang) * 160; }
    else if (st === 'curse') S.curseT = 5;
    else if (st === 'drain') this.hero.hp = Math.min(this.hs.hp, this.hero.hp + dmg * 0.12);
    else if (st === 'blind') S.blindT = 2 * k;
  }
  wake(m) {
    m.awake = true;
    if (m.isBoss) {
      this.ui.bossBar(m);
      const st = R.curStep(this.s);
      if (!m.replay && st && st.before) { this.paused = true; this.ui.dialog(st.before, () => { this.paused = false; }); }
      music.play('boss', this.A.theme);
    }
  }
  kill(m) {
    m.alive = false; m.hp = 0;
    this.fx.push({ kind: 'burst', x: m.x, y: m.y - 8 * m.scale, el: m.m.elem || 'arcane', size: 32, scale: m.scale, t: 0, dur: 0.4 });
    sfx(m.isBoss ? 'bossdie' : 'die');
    const s = this.s, ms = m.ms;
    s.kills++;
    const expGain = Math.round(ms.exp * (1 + (this.hs.exp || 0) / 100) * levelGap(s.lv, m.m.lv));
    if (expGain > 0) { this.text(m.x, m.y - 26 * m.scale, `+${expGain} EXP`, '#b6a0ff'); this.giveExp(expGain); }
    const d = R.rollDrops(m.m, rnd, s);
    if (d.gold) this.dropAt(m.x, m.y, { gold: d.gold });
    for (const id of d.items) this.dropAt(m.x + rnd() * 20 - 10, m.y + rnd() * 12 - 6, { item: id });
    for (const id of d.cons) this.dropAt(m.x + rnd() * 20 - 10, m.y + rnd() * 12 - 6, { cons: id });
    // 이야기
    const res = R.onKill(s, m.m.id, this.A.id);
    if (res === 'prog') this.ui.questProg();
    const col = R.collectRoll(s, m.m.id, this.A.id, rnd);
    if (col) { const st = R.curStep(s); this.text(m.x, m.y - 36, `${st.item} 획득!`, '#ffe28a'); this.ui.questProg(); }
    if (m.isBoss) {
      const first = !s.beaten[m.m.id]; s.beaten[m.m.id] = true; this.boss = null; this.ui.bossBar(null);
      music.play(this.A.indoor ? 'dungeon' : 'field', this.A.theme);
      if (m.m.role === 'boss' || m.m.role === 'mid') for (const o of this.mons) if (o.alive && o.summoned) { o.alive = false; this.fx.push({ kind: 'puff', x: o.x, y: o.y - 8, el: 'arcane', t: 0, dur: 0.4 }); }
      if (!first && res !== 'stepDone') this.ui.toast(`${m.m.name} 다시 쓰러뜨림!`);
    } else if (!m.summoned && m.m.role === 'normal') this.respawnQ.push({ id: m.m.id, t: 10 + rnd() * 6 });
    if (res === 'stepDone' || col === 'stepDone') this.stepDone();
  }
  giveExp(n) {
    const ups = R.gainExp(this.s, n);
    if (ups.length) {
      this.recalc(); this.hero.hp = this.hs.hp; this.hero.mp = this.hs.mp;
      this.fx.push({ kind: 'ring', x: this.hero.x, y: this.hero.y - 8, el: 'light', t: 0, dur: 0.9 });
      this.ui.levelUp(this.s.lv); sfx('levelup');
    }
    this.ui.refresh();
  }
  stepDone() {
    const s = this.s, st = R.curStep(s); if (!st) return;
    const finish = () => {
      const ch = s.ch, rw = R.advance(s);
      this.giveExp(rw.exp); s.gold += rw.gold;
      this.ui.toast(`퀘스트 완료! EXP +${rw.exp} · 골드 +${rw.gold}`);
      sfx('quest');
      if (s.ch !== ch) { this.ui.banner(CHAPTERS[s.ch].title); }
      this.recalc(); this.save(); this.ui.questProg();
    };
    if (st.type === 'exam') { s.rank = Math.max(s.rank, st.rank); this.recalc(); }
    if (st.done === '@ending') { this.paused = true; this.ui.dialog(ENDING, () => { this.paused = false; finish(); this.ui.credits(); }); return; }
    if (st.done) { this.paused = true; this.ui.dialog(st.done, () => { this.paused = false; finish(); }); }
    else finish();
  }

  // ───────── 몬스터 ─────────
  updateMons(dt) {
    const h = this.hero;
    for (const m of this.mons) {
      if (!m.alive) continue;
      const S = m.st;
      for (const k of ['burnT', 'poisonT', 'slowT', 'freezeT', 'rootT', 'stunT', 'curseT', 'blindT']) if (S[k] > 0) S[k] -= dt;
      if (S.burnT > 0 || S.poisonT > 0) {
        m.dotT = (m.dotT || 0) + dt;
        if (m.dotT >= 0.5) {
          m.dotT = 0; const d = Math.max(1, Math.round(((S.burnT > 0 ? S.burnDps : 0) + (S.poisonT > 0 ? S.poisonDps : 0)) * 0.5));
          m.hp -= d; this.text(m.x, m.y - 14 * m.scale, String(d), S.burnT > 0 ? '#ff9a4a' : '#b07aff');
          if (m.hp <= 0) { this.kill(m); continue; }
        }
      }
      m.flash = Math.max(0, m.flash - dt);
      m.atkCd -= dt; m.patCd -= dt;
      // 밀려남
      if (Math.abs(m.vx) + Math.abs(m.vy) > 1) { this.moveEnt(m, m.vx * dt, m.vy * dt, m.r * 0.6); m.vx *= 0.85; m.vy *= 0.85; }
      if (S.freezeT > 0 || S.stunT > 0) continue;
      if (m.asleep && !m.awake) { if (dist2(m, h) < (m.isBoss ? 150 : 90) ** 2 && !h.dead) this.wake(m); else continue; }
      const d = Math.sqrt(dist2(m, h));
      const spd = 42 * m.ms.speed * (S.slowT > 0 ? 0.5 : 1) * (m.enraged ? 1.3 : 1) * (S.rootT > 0 ? 0 : 1) * (this.timeStopT > 0 ? 0.25 : 1);
      const agg = h.dead ? 0 : (m.isBoss ? 400 : 115);
      m.anim += dt * 6;
      if (m.dash) { // 돌진 중
        m.dash.t -= dt; this.moveEnt(m, m.dash.vx * dt, m.dash.vy * dt, m.r * 0.6);
        if (d < m.r + 8 && !m.dash.hit) { m.dash.hit = true; this.hurtHero(m.ms.atk * (m.isBoss ? 1.3 : 1.1), m); }
        if (m.dash.t <= 0) m.dash = null; continue;
      }
      if (m.wind) { m.wind.t -= dt; if (m.wind.t <= 0) { const w = m.wind; m.wind = null; w.fn(); } continue; }
      if (m.hop) { m.hop.t -= dt; this.moveEnt(m, m.hop.vx * dt, m.hop.vy * dt, m.r * 0.6); if (m.hop.t <= 0) { const slam = m.hop.slam; m.hop = null; if (slam) { this.ring(m.x, m.y, 20 * m.scale, m.ms.atk * 1.3, m); this.shake = 0.2; } } continue; }
      // 보스 무늬
      if ((m.isBoss) && m.awake && m.patCd <= 0 && d < 260) { this.pattern(m); continue; }
      if (d > agg) { // 어슬렁
        m.t -= dt;
        if (m.t <= 0) { m.t = 1.5 + rnd() * 2; const a = rnd() * 6.283; m.wv = rnd() < 0.5 ? { x: Math.cos(a), y: Math.sin(a) } : null; if (dist2(m, m.home) > 80 ** 2) m.wv = norm(m.home.x - m.x, m.home.y - m.y); }
        if (m.wv) { this.moveEnt(m, m.wv.x * spd * 0.4 * dt, m.wv.y * spd * 0.4 * dt, m.r * 0.6); m.dir = dirOf(m.wv.x, m.wv.y); }
        continue;
      }
      const v = norm(h.x - m.x, h.y - m.y); m.dir = dirOf(v.x, v.y);
      const ai = m.m.ai;
      if (ai === 'ranged' || ai === 'caster') {
        const want = ai === 'caster' ? 110 : 100;
        if (d > want + 20) this.moveEnt(m, v.x * spd * dt, v.y * spd * dt, m.r * 0.6);
        else if (d < want - 30) this.moveEnt(m, -v.x * spd * 0.8 * dt, -v.y * spd * 0.8 * dt, m.r * 0.6);
        if (m.atkCd <= 0 && d < 190 && !(S.blindT > 0)) { m.atkCd = ai === 'caster' ? 2.0 : 1.7; this.monShoot(m, Math.atan2(h.y - 8 - (m.y - 8 * m.scale), h.x - m.x), 130, m.m.proj || 'arcane', 1); }
      } else if (ai === 'charger') {
        if (d > 85 || m.atkCd > 0) this.moveEnt(m, v.x * spd * dt, v.y * spd * dt, m.r * 0.6);
        else if (!(S.blindT > 0)) { m.atkCd = 2.4; m.wind = { t: 0.45, fn: () => { const vv = norm(h.x - m.x, h.y - m.y); m.dash = { t: 0.45, vx: vv.x * 190, vy: vv.y * 190 }; } }; m.flash = 0.45; }
      } else if (ai === 'hopper') {
        m.t -= dt;
        if (m.t <= 0) { m.t = 0.9 + rnd() * 0.4; m.hop = { t: 0.35, vx: v.x * spd * 2.2, vy: v.y * spd * 2.2 }; }
        if (m.m.proj && m.atkCd <= 0 && d < 140) { m.atkCd = 2.6; this.monShoot(m, Math.atan2(h.y - m.y, h.x - m.x), 110, m.m.proj, 0.9); }
      } else { // melee
        const reach = 14 + m.r;
        if (d > reach) this.moveEnt(m, v.x * spd * dt, v.y * spd * dt, m.r * 0.6);
        else if (m.atkCd <= 0 && !(S.blindT > 0)) { m.atkCd = 1.3; m.flash = 0.3; m.wind = { t: 0.3, fn: () => { if (Math.sqrt(dist2(m, h)) < reach + 8) this.hurtHero(m.ms.atk, m); this.fx.push({ kind: 'swipe', x: m.x + v.x * 10, y: m.y - 6 + v.y * 10, t: 0, dur: 0.2 }); } }; }
      }
      // 닿으면 아픔 (슬라임 등)
      if ((ai === 'hopper' || m.m.art.t === 'ghost') && d < m.r + 6 && m.atkCd < 1.8) { this.hurtHero(m.ms.atk * 0.8, m); m.atkCd = 2.2; }
    }
    this.timeStopT = Math.max(0, (this.timeStopT || 0) - dt);
    // 보스 체력 반 → 성남
    if (this.boss && this.boss.alive && !this.boss.enraged && this.boss.hp < this.boss.maxHp * 0.5) { this.boss.enraged = true; this.text(this.boss.x, this.boss.y - 50, '분노!', '#ff4040', true); this.shake = 0.4; sfx('roar'); }
    if (this.boss) this.ui.bossBar(this.boss);
  }
  monShoot(m, a, speed, style, mult) {
    const el = ['fire', 'water', 'ice', 'wind', 'dark', 'light', 'wood', 'earth', 'time', 'arcane'].includes(style) ? style : style === 'storm' ? 'wind' : 'arcane';
    this.projs.push({ from: 'mon', x: m.x, y: m.y - 8 * m.scale, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, a, life: 2, el, style, r: 4, dmg: m.ms.atk * mult, src: m, scale: m.isBoss ? 1.4 : 1 });
  }
  ring(x, y, r, dmg, m) {
    this.fx.push({ kind: 'burst', x, y: y - 4, el: m.m.elem || 'earth', size: 48, scale: r / 22, t: 0, dur: 0.35, ground: true });
    const h = this.hero; if ((h.x - x) ** 2 + (h.y - y) ** 2 < (r + 5) ** 2) this.hurtHero(dmg, m);
  }
  // 경고 원 → 잠시 뒤 터짐
  warn(x, y, r, delay, dmg, m, el) {
    this.teles.push({ x, y, r, t: 0, dur: delay, el: el || m.m.elem || 'fire', then: () => { this.fx.push({ kind: 'burst', x, y, el: el || m.m.elem || 'fire', size: r > 28 ? 64 : 48, scale: r / 22, t: 0, dur: 0.35, ground: true }); const h = this.hero; if ((h.x - x) ** 2 + (h.y - y) ** 2 < (r + 4) ** 2) this.hurtHero(dmg, m); sfx('boom', el); } });
  }
  pattern(m) {
    const h = this.hero, list = m.m.pattern || ['slam'];
    m.pi = (m.pi ?? -1) + 1;
    const p = rnd() < 0.7 ? list[m.pi % list.length] : list[Math.floor(rnd() * list.length)];
    m.patCd = (m.enraged ? 2.0 : 2.9) + rnd() * 0.8;
    const atk = m.ms.atk, el = m.m.elem || 'arcane';
    const toH = Math.atan2(h.y - m.y, h.x - m.x);
    switch (p) {
      case 'slam': this.warn(h.x, h.y, 26, 0.85, atk * 1.6, m); break;
      case 'hop': this.teles.push({ x: h.x, y: h.y, r: 20 * m.scale, t: 0, dur: 0.45, el: 'earth' }); m.hop = { t: 0.45, vx: (h.x - m.x) / 0.45, vy: (h.y - m.y) / 0.45, slam: true }; break;
      case 'charge': case 'tailspin': {
        if (p === 'tailspin') { m.wind = { t: 0.6, fn: () => this.ring(m.x, m.y, 30 * m.scale, atk * 1.5, m) }; m.flash = 0.6; break; }
        m.flash = 0.6; m.wind = { t: 0.6, fn: () => { const v = norm(h.x - m.x, h.y - m.y); m.dash = { t: 0.55, vx: v.x * 230, vy: v.y * 230 }; } }; break;
      }
      case 'spin': m.flash = 0.5; m.wind = { t: 0.55, fn: () => this.ring(m.x, m.y, 26 * m.scale, atk * 1.4, m) }; this.teles.push({ x: m.x, y: m.y, r: 26 * m.scale, t: 0, dur: 0.55, el: 'earth' }); break;
      case 'summon': case 'howl': {
        const id = m.m.summon; if (!id) break;
        const alive = this.mons.filter((o) => o.alive && o.summoned).length;
        if (alive < 5) for (let k = 0; k < 2 + (m.enraged ? 1 : 0); k++) { const a = rnd() * 6.283; const e = this.spawn(id, m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 20, { summoned: true }); e.awake = true; this.fx.push({ kind: 'puff', x: e.x, y: e.y - 8, el: 'dark', t: 0, dur: 0.4 }); }
        if (p === 'howl') { m.enraged = true; sfx('roar'); }
        break;
      }
      case 'spread': case 'feathers': case 'icespread': {
        const n = m.enraged ? 12 : 8, style = m.m.proj || (p === 'icespread' ? 'ice' : p === 'feathers' ? 'wind' : el);
        for (let k = 0; k < n; k++) this.monShoot(m, (k / n) * 6.283 + rnd() * 0.2, 105, style, 0.9);
        break;
      }
      case 'firewave': case 'poisonfield': case 'icerain': case 'darkrain': case 'meteor': {
        const n = p === 'meteor' ? 7 : 5, pe = { firewave: 'fire', poisonfield: 'wood', icerain: 'ice', darkrain: 'dark', meteor: 'fire' }[p];
        for (let k = 0; k < n; k++) { const a = rnd() * 6.283, d = k === 0 ? 0 : 20 + rnd() * 50; this.warn(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, p === 'meteor' ? 30 : 22, 0.9 + k * 0.12, atk * 1.3, m, pe); }
        break;
      }
      case 'lightning': for (let k = 0; k < 3; k++) { this.teles.push({ x: 0, y: 0, r: 20, t: -k * 0.45, dur: 0.6, el: 'wind', follow: true, then: null, m, atk }); } break;
      case 'freeze': case 'timestop': {
        this.teles.push({ x: m.x, y: m.y, r: 70, t: 0, dur: 0.9, el: p === 'freeze' ? 'ice' : 'time', then: () => { const hh = this.hero; if ((hh.x - m.x) ** 2 + (hh.y - m.y) ** 2 < 74 ** 2) { hh.slowT = 2.5; this.hurtHero(atk * 0.8, m); this.text(hh.x, hh.y - 30, p === 'freeze' ? '얼어붙음!' : '시간이 느려짐!', '#a0e0ff'); } } });
        break;
      }
      case 'blink': { this.fx.push({ kind: 'puff', x: m.x, y: m.y - 10, el, t: 0, dur: 0.4 }); for (let k = 0; k < 10; k++) { const a = rnd() * 6.283, nx = this.A.arena.x * TILE + 8 + Math.cos(a) * 60, ny = this.A.arena.y * TILE + 8 + Math.sin(a) * 50; if (!isSolid(this.A, nx, ny)) { m.x = nx; m.y = ny; break; } } this.fx.push({ kind: 'puff', x: m.x, y: m.y - 10, el, t: 0, dur: 0.4 }); m.patCd = 0.8; break; }
      case 'tornado': this.hazards.push({ x: m.x, y: m.y, vx: Math.cos(toH) * 55, vy: Math.sin(toH) * 55, t: 0, dur: 4, r: 14, el: 'wind', dmg: atk * 0.9, m, hitT: 0 }); break;
      case 'firebreath': {
        const n = 9; for (let k = 0; k < n; k++) setTimeoutGame(this, k * 0.06, () => this.monShoot(m, toH + (rnd() - 0.5) * 0.7, 150, 'fire', 0.8)); break;
      }
      case 'drain': { if (Math.sqrt(dist2(m, h)) < 160) { this.fx.push({ kind: 'beam', x: m.x, y: m.y - 16, x2: h.x, y2: h.y - 8, w: 6, el: 'dark', t: 0, dur: 0.5 }); const dmg = this.hurtHero(atk * 1.1, m); if (dmg) m.hp = Math.min(m.maxHp, m.hp + dmg * 3); } break; }
      case 'roar': { this.shake = 0.6; sfx('roar'); const v = norm(h.x - m.x, h.y - m.y); if (Math.sqrt(dist2(m, h)) < 120) { this.moveEnt(h, v.x * 40, v.y * 40, 5); this.hurtHero(atk * 0.7, m); } break; }
      case 'rage': m.enraged = true; m.patCd = 1; break;
    }
  }
  hurtHero(raw, m) {
    const h = this.hero; if (h.dead || h.inv > 0) return 0;
    let dmg = R.damageToHero(this.hs, raw, 1, rnd());
    if (this.hs.shield && h.mp > 0) { const take = Math.min(h.mp, dmg * 0.5); h.mp -= take; dmg -= take; }
    dmg = Math.round(dmg);
    h.hp -= dmg; h.inv = 0.45; this.text(h.x, h.y - 26, String(dmg), '#ff5050');
    this.shake = Math.max(this.shake || 0, 0.12); sfx('hurt');
    this.ui.hurtFlash();
    if (h.hp <= 0) this.die();
    return dmg;
  }
  die() {
    const h = this.hero; h.dead = true; h.hp = 0;
    const lost = Math.floor(this.s.gold * 0.1); this.s.gold -= lost;
    this.ui.toast(`쓰러졌어요… 마을에서 다시 일어나요 (골드 -${lost})`);
    sfx('dead');
    if (this.exam) this.exam.failed = true;
    setTimeoutGame(this, 2.2, () => { h.dead = false; h.hp = this.hs.hp; h.mp = this.hs.mp; this.buffs = []; this.recalc(); this.enter('village'); });
  }

  // ───────── 탄·효과 ─────────
  updateProjs(dt) {
    const h = this.hero;
    for (const p of this.projs) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) { p.dead = true; if (p.boom) this.boom(p.x, p.y, p.boom, p.power * 0.6, p.el, p.st); continue; }
      if (isSolid(this.A, p.x, p.y + 6)) { p.dead = true; if (p.boom && p.from === 'hero') this.boom(p.x, p.y, p.boom, p.power * 0.6, p.el, p.st); else this.fx.push({ kind: 'spark', x: p.x, y: p.y, el: p.el, t: 0, dur: 0.2 }); continue; }
      if (p.from === 'hero') {
        for (const m of this.mons) {
          if (!m.alive || p.hits.has(m)) continue;
          if ((m.x - p.x) ** 2 + (m.y - 7 * m.scale - p.y) ** 2 < (m.r + p.r + 2) ** 2) {
            p.hits.add(m); this.hit(m, p.power, p.el, p.st, p.a);
            if (p.boom) { this.boom(p.x, p.y, p.boom, p.power * 0.6, p.el, p.st); p.dead = true; break; }
            this.fx.push({ kind: 'spark', x: p.x, y: p.y, el: p.el, t: 0, dur: 0.2 });
            if (!p.pierce) { p.dead = true; break; }
          }
        }
      } else if (!h.dead && (h.x - p.x) ** 2 + (h.y - 10 - p.y) ** 2 < (p.r + 6) ** 2) { p.dead = true; this.hurtHero(p.dmg, p.src); }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }
  updateFx(dt) {
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    for (const t of this.texts) { t.t += dt; t.y -= dt * 22; }
    this.texts = this.texts.filter((t) => t.t < 0.9);
    this.shake = Math.max(0, (this.shake || 0) - dt);
    // 경고·떨어지는 마법
    for (const w of this.teles) {
      w.t += dt;
      if (w.follow && w.t < w.dur * 0.6) { w.x = this.hero.x; w.y = this.hero.y; }
      if (w.t >= w.dur && !w.done) {
        w.done = true;
        if (w.then) w.then();
        else if (w.follow) { this.fx.push({ kind: 'bolt', pts: [[w.x + 6, w.y - 150], [w.x - 6, w.y - 90], [w.x + 5, w.y - 40], [w.x, w.y]], t: 0, dur: 0.25 }); this.fx.push({ kind: 'burst', x: w.x, y: w.y, el: 'wind', size: 32, scale: 1.2, t: 0, dur: 0.35 }); const h = this.hero; if ((h.x - w.x) ** 2 + (h.y - w.y) ** 2 < (w.r + 4) ** 2) this.hurtHero(w.atk * 1.3, w.m); sfx('zap'); }
      }
    }
    this.teles = this.teles.filter((w) => !w.done);
    // 장판
    for (const f of this.fields) {
      f.t += dt; f.tick -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.pull) for (const m of this.mons) if (m.alive && m.m.role === 'normal') { const d = Math.sqrt(dist2(m, f)); if (d < f.r * 1.3 && d > 4) this.moveEnt(m, (f.x - m.x) / d * 30 * dt, (f.y - m.y) / d * 30 * dt, m.r * 0.6); }
      if (f.tick <= 0) {
        f.tick = 0.5;
        if (f.heal) { const h = this.hero; if (dist2(h, f) < f.r * f.r) { const v = Math.round(this.hs.hp * 0.035); h.hp = Math.min(this.hs.hp, h.hp + v); this.text(h.x, h.y - 28, '+' + v, '#7dff8a'); } }
        else for (const m of this.mons) if (m.alive && (m.x - f.x) ** 2 + (m.y - f.y) ** 2 < (f.r + m.r) ** 2) this.hit(m, f.power, f.el, f.st, Math.atan2(m.y - f.y, m.x - f.x), 0.12);
      }
    }
    this.fields = this.fields.filter((f) => f.t < f.dur);
    // 도는 구슬
    for (const o of this.orbits) {
      o.t += dt; o.ang += dt * 4.2;
      for (let k = 0; k < o.n; k++) {
        const a = o.ang + (k / o.n) * 6.283, x = this.hero.x + Math.cos(a) * 28, y = this.hero.y - 8 + Math.sin(a) * 20;
        for (const m of this.mons) {
          if (!m.alive) continue;
          if ((m.x - x) ** 2 + (m.y - 6 * m.scale - y) ** 2 < (m.r + 6) ** 2) { const key = m; const last = o.hitT.get(key) || 0; if (this.t - last > 0.45) { o.hitT.set(key, this.t); this.hit(m, o.power, o.el, o.st, a); } }
        }
      }
    }
    this.orbits = this.orbits.filter((o) => o.t < o.dur);
    // 보스가 만든 위험 (회오리 등)
    for (const z of this.hazards) {
      z.t += dt; z.x += z.vx * dt; z.y += z.vy * dt; z.hitT -= dt;
      const h = this.hero; if (z.hitT <= 0 && (h.x - z.x) ** 2 + (h.y - z.y) ** 2 < (z.r + 5) ** 2) { z.hitT = 0.6; this.hurtHero(z.dmg, z.m); }
      if (isSolid(this.A, z.x, z.y)) { z.vx *= -1; z.vy *= -1; }
    }
    this.hazards = this.hazards.filter((z) => z.t < z.dur);
    // 게임 안 타이머
    if (this.timers) { for (const tm of this.timers) tm.t -= dt; const due = this.timers.filter((tm) => tm.t <= 0); this.timers = this.timers.filter((tm) => tm.t > 0); for (const tm of due) tm.fn(); }
  }
  text(x, y, txt, color, big) { this.texts.push({ x, y, txt, color, big, t: 0 }); }

  // ───────── 드랍 ─────────
  dropAt(x, y, o) { this.drops.push({ x, y, ...o, t: 0, vy: -40 }); }
  updateDrops(dt) {
    const h = this.hero, pet = this.pet, s = this.s;
    for (const d of this.drops) {
      d.t += dt;
      if (d.t < 0.35) { d.y += d.vy * dt; d.vy += 200 * dt; }
      const near = (e, r) => (e.x - d.x) ** 2 + (e.y - d.y) ** 2 < r * r;
      if (d.t > 0.4 && (near(h, 20) || (d.gold && near(pet, 18)))) {
        d.dead = true;
        if (d.gold) { s.gold += d.gold; this.text(d.x, d.y - 10, `+${d.gold}G`, '#ffd23f'); sfx('coin'); }
        if (d.item) { if (s.inv.length >= 80) { this.ui.toast('가방이 가득 찼어요!'); d.dead = false; continue; } R.addItem(s, d.item); const it = ITEMS[d.item]; this.ui.toast(`<span style="color:${RARITY[it.rar].color}">${it.name}</span> 획득!`); sfx('item'); }
        if (d.cons) { s.cons[d.cons] = (s.cons[d.cons] || 0) + 1; this.text(d.x, d.y - 10, CONSUMABLES[d.cons].name, '#ff9ab0'); sfx('coin'); }
        this.ui.refresh();
      }
      if (d.t > 60) d.dead = true;
    }
    this.drops = this.drops.filter((d) => !d.dead);
  }
  usePotion(kind) {
    const id = R.quickPotion(this.s, kind); if (!id) { this.ui.toast(kind === 'hp' ? '체력 물약이 없어요' : '마나 물약이 없어요'); return; }
    if ((this.cds['pot' + kind] || 0) > 0) return;
    const c = CONSUMABLES[id]; this.s.cons[id]--; this.cds['pot' + kind] = 1.2;
    if (kind === 'hp') { this.hero.hp = Math.min(this.hs.hp, this.hero.hp + c.val); this.text(this.hero.x, this.hero.y - 28, '+' + c.val, '#7dff8a'); }
    else { this.hero.mp = Math.min(this.hs.mp, this.hero.mp + c.val); this.text(this.hero.x, this.hero.y - 28, '+' + c.val, '#7ab8ff'); }
    sfx('potion'); this.ui.refresh();
  }
  useConsumable(id) {
    const c = CONSUMABLES[id]; if (!c || !(this.s.cons[id] > 0)) return;
    if (c.kind === 'hp' || c.kind === 'mp') { this.s.quick[c.kind] = id; this.usePotion(c.kind); return; }
    if (c.kind === 'recall') { this.s.cons[id]--; this.ui.closeAll(); this.enter('village'); this.ui.toast('루미나 마을로 돌아왔어요'); return; }
    if (c.kind === 'reset') { this.s.cons[id]--; R.resetPoints(this.s); this.recalc(); this.ui.toast('스킬과 능력치를 모두 되돌렸어요'); }
  }

  // ───────── 사람·출구 ─────────
  interact() {
    const n = this.nearNpc; if (!n) return;
    const s = this.s, st = R.curStep(s), npc = NPCS[n.id];
    if (st && st.type === 'talk' && st.npc === n.id) {
      this.paused = true;
      this.ui.dialog(st.say, () => { this.paused = false; this.stepDone(); });
      return;
    }
    if (st && st.type === 'exam' && n.id === 'orben') {
      if (this.A.id !== 'tower') { this.ui.dialog([['orben', '시험은 마탑 안에서 본단다. 위쪽 마탑으로 들어오너라.']]); return; }
      this.ui.confirm(`${['', '초급', '중급', '상급', '익스퍼트'][st.rank]} 마법사 시험을 시작할까요?\n제한 시간 안에 시험관을 이기면 합격이에요.`, () => this.startExam(st));
      return;
    }
    if (npc.role.startsWith('shop:')) { this.ui.shop(npc.role.slice(5), n.id); return; }
    this.ui.dialog([[n.id, npc.idle[Math.floor(rnd() * npc.idle.length)]]]);
  }
  startExam(st) {
    const A = this.A;
    this.mons = this.mons.filter((m) => false);
    const e = this.spawn(st.mon, (A.arena.x + 0.5) * TILE, (A.arena.y + 0.5) * TILE, { isBoss: true, awake: true, replay: true });
    this.boss = e; this.exam = { t: 150, st }; this.ui.bossBar(e);
    music.play('boss', 'tower'); this.ui.banner('시험 시작!');
  }
  updateExam(dt) {
    if (!this.exam) return;
    const ex = this.exam; ex.t -= dt; this.ui.examTimer(ex.t);
    if (ex.failed || ex.t <= 0) {
      this.exam = null; this.ui.examTimer(null);
      if (!ex.failed) { for (const m of this.mons) m.alive = false; this.boss = null; this.ui.bossBar(null); this.ui.dialog([['orben', '시간이 다 됐구나. 조금 더 강해져서 다시 오너라.']]); }
      return;
    }
    if (this.boss && !this.boss.alive) { this.exam = null; this.ui.examTimer(null); }
    else if (!this.mons.some((m) => m.alive && m.isBoss)) { this.exam = null; this.ui.examTimer(null); }
  }
  updateExits() {
    if (this.exitLock > 0 || this.hero.dead) return;
    const h = this.hero, tx = Math.floor(h.x / TILE), ty = Math.floor(h.y / TILE);
    for (const e of this.A.exits) {
      if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) {
        this.exitLock = 1;
        if (this.exam) { this.ui.toast('시험 중에는 나갈 수 없어요'); return; }
        if (e.to === 'map') { this.ui.travel(); this.pushBack(); return; }
        if (!R.areaOpen(this.s, e.to)) { this.ui.toast('아직은 갈 수 없는 곳이에요. 이야기를 더 진행해 보세요.'); this.pushBack(); return; }
        const from = this.A.id;
        this.enter(e.to);
        // 돌아온 길 쪽에서 나타나기
        const back = this.A.exits.find((x) => x.to === from);
        if (back) { const bx = (back.x + (back.x === 0 ? 1.5 : back.w > 1 ? back.w / 2 : -0.5)) * TILE, by = (back.y + (back.y === 0 ? 1.5 : back.h > 1 ? back.h / 2 : -1)) * TILE; this.hero.x = bx; this.hero.y = by; if (isSolid(this.A, bx, by)) { this.hero.x = (this.A.entry.x + 0.5) * TILE; this.hero.y = (this.A.entry.y + 0.5) * TILE; } this.pet.x = this.hero.x; this.pet.y = this.hero.y; }
        return;
      }
    }
  }
  pushBack() { const h = this.hero, [dx, dy] = DIRV[h.dir]; this.moveEnt(h, -dx * 14, -dy * 14, 5); }
  travelTo(id) { if (!R.areaOpen(this.s, id)) return; this.enter(id); }

  updatePet(dt) {
    const p = this.pet, h = this.hero;
    const tx = h.x + (h.dir === 'left' ? 16 : -16), ty = h.y + 4, d = Math.hypot(tx - p.x, ty - p.y);
    if (d > 160) { p.x = tx; p.y = ty; }
    if (d > 10) { const sp = Math.min(150, d * 3.2); p.x += (tx - p.x) / d * sp * dt; p.y += (ty - p.y) / d * sp * dt; p.dir = tx < p.x ? 'left' : 'right'; p.anim += dt * 9; p.sit = 0; }
    else { p.sit += dt; p.anim += dt * 3; }
  }
  updateCats(dt) {
    for (const c of this.cats) {
      c.t -= dt; c.anim += dt * (c.sit ? 3 : 8);
      if (c.t <= 0) { c.t = 2 + rnd() * 4; c.sit = rnd() < 0.5; c.vx = c.sit ? 0 : (rnd() < 0.5 ? -1 : 1) * 18; c.dir = c.vx < 0 ? 'left' : 'right'; }
      if (!c.sit) { const nx = c.x + c.vx * dt; if (!isSolid(this.A, nx, c.y)) c.x = nx; else c.vx *= -1, c.dir = c.vx < 0 ? 'left' : 'right'; }
    }
  }

  // ───────── 그리기 ─────────
  render() {
    const ctx = this.ctx, A = this.A; if (!A) return;
    const V = this.view, h = this.hero;
    ctx.imageSmoothingEnabled = false;
    let cx = Math.round(h.x - V.w / 2), cy = Math.round(h.y - 12 - V.h / 2);
    cx = Math.max(0, Math.min(A.w * TILE - V.w, cx)); cy = Math.max(0, Math.min(A.h * TILE - V.h, cy));
    if (A.w * TILE < V.w) cx = -Math.floor((V.w - A.w * TILE) / 2);
    if (A.h * TILE < V.h) cy = -Math.floor((V.h - A.h * TILE) / 2);
    if (this.shake > 0) { cx += Math.round((rnd() - 0.5) * 6); cy += Math.round((rnd() - 0.5) * 6); }
    this.cam = { x: cx, y: cy };
    ctx.fillStyle = A.indoor ? '#120e18' : '#1a2418'; ctx.fillRect(0, 0, V.w, V.h);
    ctx.save(); ctx.translate(-cx, -cy);
    // 땅
    const x0 = Math.max(0, Math.floor(cx / TILE)), y0 = Math.max(0, Math.floor(cy / TILE)), x1 = Math.min(A.w - 1, Math.ceil((cx + V.w) / TILE)), y1 = Math.min(A.h - 1, Math.ceil((cy + V.h) / TILE));
    const wf = Math.floor(this.t * 2) % 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = A.t[y * A.w + x], v = A.v[y * A.w + x];
      let img;
      if (k === G) img = SP.tileSprite(A.theme, 'g', v);
      else if (k === PATH) img = SP.tileSprite(A.theme, 'path', v % 3);
      else if (k === WATER) img = SP.tileSprite(A.theme, 'water', wf + (v % 2) * 2);
      else if (k === FLOOR) img = SP.tileSprite(A.theme, 'floor', v % 4);
      else img = SP.tileSprite(A.theme, (y + 1 < A.h && A.t[(y + 1) * A.w + x] !== WALL) ? 'wall' : 'walltop', 0);
      ctx.drawImage(img, x * TILE, y * TILE);
    }
    // 출구 표시
    for (const e of A.exits) {
      const open = e.to === 'map' || R.areaOpen(this.s, e.to);
      ctx.fillStyle = open ? 'rgba(255,240,150,0.18)' : 'rgba(255,80,80,0.12)';
      ctx.fillRect(e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE);
    }
    // 장판 (아래에)
    for (const f of this.fields) this.drawField(ctx, f);
    for (const w of this.teles) this.drawTele(ctx, w);
    ctx.globalAlpha = 0.8; for (const f of this.fx) if (f.ground) this.drawFx(ctx, f); ctx.globalAlpha = 1;
    // y 정렬해서 그릴 것들
    const list = [];
    for (const p of A.props) {
      const px = p.x * TILE, py = p.y * TILE;
      if (px < cx - 64 || px > cx + V.w + 64 || py < cy - 96 || py > cy + V.h + 48) continue;
      list.push({ y: (p.y + (p.th || 1)) * TILE - (p.kind === 'house' ? 0 : 2), draw: () => this.drawProp(ctx, p) });
    }
    for (const n of this.npcs) list.push({ y: n.y + 2, draw: () => this.drawNpc(ctx, n) });
    for (const c of this.cats) { const sp = SP.catSprite(c.id); const fr = (c.sit ? sp.sit : sp.walk)[c.dir][Math.floor(c.anim) % 4]; list.push({ y: c.y + 2, draw: () => ctx.drawImage(fr, Math.round(c.x - 16), Math.round(c.y - 28)) }); }
    for (const m of this.mons) if (m.alive) list.push({ y: m.y, draw: () => this.drawMon(ctx, m) });
    for (const d of this.drops) list.push({ y: d.y, draw: () => this.drawDrop(ctx, d) });
    list.push({ y: this.pet.y + 1, draw: () => this.drawPet(ctx) });
    if (!h.dead || Math.floor(this.t * 10) % 2) list.push({ y: h.y + 1.5, draw: () => this.drawHero(ctx) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.draw();
    // 위에 그리는 것들
    for (const o of this.orbits) this.drawOrbit(ctx, o);
    for (const z of this.hazards) this.drawHazard(ctx, z);
    for (const p of this.projs) this.drawProj(ctx, p);
    for (const f of this.fx) if (!f.ground) this.drawFx(ctx, f);
    // 글자
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.font = t.big ? 'bold 11px Galmuri9, monospace' : '10px Galmuri9, monospace';
      ctx.globalAlpha = Math.min(1, (0.9 - t.t) * 3);
      ctx.fillStyle = '#000'; ctx.fillText(t.txt, Math.round(t.x) + 1, Math.round(t.y) + 1);
      ctx.fillStyle = t.color; ctx.fillText(t.txt, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
    // 사람 이름표
    if (this.nearNpc) { const n = this.nearNpc; ctx.font = '9px Galmuri9, monospace'; const label = NPCS[n.id].name; const w = ctx.measureText(label).width + 8; ctx.fillStyle = 'rgba(20,16,30,0.8)'; ctx.fillRect(Math.round(n.x - w / 2), Math.round(n.y - 46), Math.round(w), 13); ctx.fillStyle = '#ffe9a8'; ctx.fillText(label, Math.round(n.x), Math.round(n.y - 36)); }
    ctx.restore();
    // 어두운 던전
    if (A.dark) this.drawDark(ctx, cx, cy);
  }
  drawProp(ctx, p) {
    const A = this.A, x = p.x * TILE, y = p.y * TILE;
    if (p.kind === 'house') { const hs = p.house; ctx.drawImage(SP.houseSprite(hs.roof, hs.wall, hs.kind), x, y - TILE); if (hs.sign) { ctx.font = '8px Galmuri9, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(30,20,20,0.75)'; const w = ctx.measureText(hs.sign).width + 6; ctx.fillRect(x + 24 - w / 2, y + 34, w, 11); ctx.fillStyle = '#fff4d0'; ctx.fillText(hs.sign, x + 24, y + 43); } return; }
    if (p.kind === 'tower') { ctx.drawImage(SP.houseSprite([70, 80, 160], [0, 0, 0], 'tower'), x, y + 3 * TILE - 80); return; }
    if (p.kind === 'tree' || p.kind === 'pillar' || p.kind === 'shelf') { ctx.drawImage(SP.propSprite(A.theme, p.kind, p.v || 0), x, y - TILE); return; }
    ctx.drawImage(SP.propSprite(A.theme, p.kind, p.v || 0), x, y);
  }
  drawNpc(ctx, n) {
    const npc = NPCS[n.id], sp = SP.npcSprite(npc.look, n.id), fr = sp.idle[Math.floor(this.t * 2.5 + n.x) % 4];
    shadow(ctx, n.x, n.y, 8);
    ctx.drawImage(fr, Math.round(n.x - 16), Math.round(n.y - 30));
    const st = R.curStep(this.s);
    if (st && ((st.type === 'talk' && st.npc === n.id) || (st.type === 'exam' && n.id === 'orben'))) {
      const b = Math.sin(this.t * 5) * 2; ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12px Galmuri9, monospace'; ctx.textAlign = 'center'; ctx.fillText('!', Math.round(n.x), Math.round(n.y - 34 + b));
    }
  }
  drawHero(ctx) {
    const h = this.hero, sp = SP.heroSprite(this.look);
    let fr;
    if (h.castT > 0) fr = sp.cast[h.dir][Math.floor(this.t * 10) % 2];
    else if (h.moving) fr = sp.walk[h.dir][Math.floor(h.anim) % 4];
    else fr = sp.idle[h.dir][Math.floor(this.t * 2) % 4];
    shadow(ctx, h.x, h.y, 7);
    if (h.inv > 0 && Math.floor(this.t * 20) % 2) ctx.globalAlpha = 0.5;
    ctx.drawImage(fr, Math.round(h.x - 16), Math.round(h.y - 30));
    ctx.globalAlpha = 1;
    if (this.hs.shield && this.buffs.some((b) => b.st.shield)) { ctx.strokeStyle = 'rgba(160,140,255,0.7)'; ctx.beginPath(); ctx.arc(h.x, h.y - 12, 15, 0, 6.283); ctx.stroke(); }
    if (h.slowT > 0) { ctx.fillStyle = 'rgba(160,220,255,0.35)'; ctx.fillRect(Math.round(h.x - 9), Math.round(h.y - 28), 18, 28); }
  }
  drawPet(ctx) {
    const p = this.pet, sp = SP.catSprite('carrot'), moving = p.sit < 0.2;
    const fr = (moving ? sp.walk : sp.sit)[p.dir][Math.floor(p.anim) % 4];
    shadow(ctx, p.x, p.y, 6);
    ctx.drawImage(fr, Math.round(p.x - 16), Math.round(p.y - 28));
  }
  drawMon(ctx, m) {
    const sp = SP.monsterSprite(m.m), size = sp.size, sc = m.scale;
    const d = sp.dirs.includes(m.dir) ? m.dir : sp.dirs.includes('left') ? (m.dir === 'right' ? 'right' : 'left') : 'down';
    const set = m.flash > 0 && Math.floor(this.t * 20) % 2 ? sp.white : sp.frames;
    const fr = set[d][Math.floor(m.anim) % 4];
    const w = size * sc, hh = size * sc, yOff = m.hop ? -Math.sin((1 - m.hop.t / 0.4) * Math.PI) * 6 : 0;
    shadow(ctx, m.x, m.y, 7 * sc);
    if (m.m.phase) ctx.globalAlpha = 0.85;
    if (m.st.freezeT > 0) ctx.filter = 'hue-rotate(160deg) saturate(0.6) brightness(1.3)';
    ctx.drawImage(fr, Math.round(m.x - w / 2), Math.round(m.y - hh + 2 * sc + yOff), Math.round(w), Math.round(hh));
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    if (m.asleep && !m.awake) { ctx.fillStyle = '#fff'; ctx.font = '9px Galmuri9, monospace'; ctx.textAlign = 'center'; ctx.fillText('z z', Math.round(m.x + 10), Math.round(m.y - hh)); }
    // 상태 표시
    const S = m.st; let ix = m.x - 8;
    const mark = (c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(ix), Math.round(m.y - hh - 3), 3, 3); ix += 4; };
    if (S.burnT > 0) mark('#ff8a3a'); if (S.poisonT > 0) mark('#b06aff'); if (S.slowT > 0) mark('#8ad0ff'); if (S.rootT > 0) mark('#6ac04a'); if (S.stunT > 0) mark('#ffe060'); if (S.curseT > 0) mark('#6a3a8a'); if (S.blindT > 0) mark('#ffffff');
    if (!m.isBoss && m.hp < m.maxHp) {
      const bw = Math.max(16, 14 * sc); ctx.fillStyle = '#000a'; ctx.fillRect(Math.round(m.x - bw / 2), Math.round(m.y + 3), bw, 3);
      ctx.fillStyle = '#e8453c'; ctx.fillRect(Math.round(m.x - bw / 2), Math.round(m.y + 3), Math.round(bw * m.hp / m.maxHp), 3);
    }
  }
  drawDrop(ctx, d) {
    const b = Math.sin(this.t * 4 + d.x) * 1.5;
    if (d.gold) { ctx.fillStyle = '#b8860b'; ctx.fillRect(Math.round(d.x - 3), Math.round(d.y - 5 + b), 6, 5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(d.x - 2), Math.round(d.y - 5 + b), 4, 3); return; }
    if (d.item) {
      const it = ITEMS[d.item], c1 = it.look.orb || it.look.c || [200, 200, 200], img = SP.iconSprite(it.slot, c1, it.look.wood || it.look.band || it.look.m, 0);
      const col = RARITY[it.rar].color; ctx.fillStyle = col + '55'; ctx.beginPath(); ctx.arc(d.x, d.y - 6 + b, 9, 0, 6.283); ctx.fill();
      ctx.drawImage(img, Math.round(d.x - 8), Math.round(d.y - 14 + b));
      if (it.rar >= 3 && Math.floor(this.t * 4) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(d.x + 5), Math.round(d.y - 16 + b), 1, 1); }
      return;
    }
    if (d.cons) { const c = CONSUMABLES[d.cons]; ctx.drawImage(SP.iconSprite('potion', c.color, null, 0), Math.round(d.x - 8), Math.round(d.y - 14 + b)); }
  }
  drawProj(ctx, p) {
    const fr = SP.projSprite(p.el, p.style)[Math.floor(this.t * 12) % 4];
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.style !== 'arcane' && p.style !== 'dark' && p.style !== 'light' && p.style !== 'time' && p.style !== 'earth' && p.style !== 'water') ctx.rotate(p.a);
    const s = p.scale; ctx.drawImage(fr, -9 * s, -8 * s, 16 * s, 16 * s);
    ctx.restore();
  }
  drawFx(ctx, f) {
    const k = f.t / f.dur;
    if (f.kind === 'burst') { const frs = SP.burstSprite(f.el, f.size), fr = frs[Math.min(5, Math.floor(k * 6))], s = f.size * f.scale; ctx.drawImage(fr, Math.round(f.x - s / 2), Math.round(f.y - s / 2), Math.round(s), Math.round(s)); }
    else if (f.kind === 'spark' || f.kind === 'puff') { const frs = SP.burstSprite(f.el, 32), fr = frs[Math.min(5, 2 + Math.floor(k * 4))]; const s = f.kind === 'puff' ? 30 : 16; ctx.drawImage(fr, Math.round(f.x - s / 2), Math.round(f.y - s / 2), s, s); }
    else if (f.kind === 'ring') { const P = ELEM_PAL[f.el] || ELEM_PAL.arcane; ctx.strokeStyle = rgba(P[1], 1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, 8 + k * 22, 4 + k * 10, 0, 0, 6.283); ctx.stroke(); ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i + this.t * 3; ctx.fillStyle = rgba(P[0], 1 - k); ctx.fillRect(Math.round(f.x + Math.cos(a) * 10), Math.round(f.y - k * 20 + Math.sin(a) * 4), 2, 2); } }
    else if (f.kind === 'beam') { const P = ELEM_PAL[f.el] || ELEM_PAL.arcane; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(P[3], 0.6 * (1 - k)); ctx.lineWidth = f.w * (1 - k * 0.5); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = rgba(P[1], 1 - k); ctx.lineWidth = Math.max(2, f.w * 0.45 * (1 - k)); ctx.stroke(); ctx.strokeStyle = rgba(P[0], 1 - k); ctx.lineWidth = Math.max(1, f.w * 0.15); ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt'; }
    else if (f.kind === 'bolt') { ctx.strokeStyle = `rgba(120,90,222,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.strokeStyle = `rgba(255,250,180,${1 - k})`; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    else if (f.kind === 'swipe') { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 8, -1 + k * 2, 1 + k * 2); ctx.stroke(); ctx.lineWidth = 1; }
  }
  drawTele(ctx, w) {
    if (w.t < 0) return;
    const k = Math.min(1, w.t / w.dur), P = ELEM_PAL[w.el] || ELEM_PAL.fire;
    if (w.friendly) { ctx.strokeStyle = rgba(P[1], 0.7); ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * k, w.r * k * 0.7, 0, 0, 6.283); ctx.stroke(); if (w.style === 'storm' || w.el) { ctx.fillStyle = rgba(P[2], 0.15); ctx.fill(); } return; }
    ctx.fillStyle = `rgba(255,40,40,${0.12 + k * 0.18})`; ctx.strokeStyle = `rgba(255,80,60,${0.5 + k * 0.4})`;
    ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,120,80,0.35)`; ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * k, w.r * k * 0.7, 0, 0, 6.283); ctx.fill();
  }
  drawField(ctx, f) {
    const P = ELEM_PAL[f.el] || ELEM_PAL.arcane, a = Math.min(1, (f.dur - f.t) * 2) * 0.35;
    ctx.fillStyle = rgba(P[2], a); ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.7, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = rgba(P[1], a * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const ang = i * 0.785 + this.t * (f.pull ? 3 : 1); const rr = f.r * (0.3 + ((i * 37 + Math.floor(this.t * 6)) % 7) / 10); ctx.fillStyle = rgba(P[0], a * 2.5); ctx.fillRect(Math.round(f.x + Math.cos(ang) * rr), Math.round(f.y + Math.sin(ang) * rr * 0.7 - ((this.t * 20 + i * 5) % 12)), 2, 2); }
  }
  drawOrbit(ctx, o) {
    const fr = SP.projSprite(o.el, o.el === 'arcane' ? 'arcane' : o.el === 'wind' ? 'wind' : o.el)[Math.floor(this.t * 12) % 4];
    for (let k = 0; k < o.n; k++) { const a = o.ang + (k / o.n) * 6.283; ctx.drawImage(fr, Math.round(this.hero.x + Math.cos(a) * 28 - 9), Math.round(this.hero.y - 8 + Math.sin(a) * 20 - 8)); }
  }
  drawHazard(ctx, z) {
    const P = ELEM_PAL[z.el];
    for (let k = 0; k < 7; k++) { const y = z.y - k * 4, rw = 3 + k * 2.2, off = Math.sin(this.t * 8 + k) * 3; ctx.strokeStyle = rgba(P[1 + (k % 3)], 0.9); ctx.beginPath(); ctx.ellipse(z.x + off, y, rw, 2, 0, 0, 6.283); ctx.stroke(); }
  }
  drawDark(ctx, cx, cy) {
    const V = this.view;
    if (!this.darkCv || this.darkCv.width !== V.w || this.darkCv.height !== V.h) { this.darkCv = document.createElement('canvas'); this.darkCv.width = V.w; this.darkCv.height = V.h; }
    const d = this.darkCv.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.fillStyle = 'rgba(6,4,14,0.62)'; d.fillRect(0, 0, V.w, V.h);
    d.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => { const g = d.createRadialGradient(x - cx, y - cy, 0, x - cx, y - cy, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(x - cx, y - cy, r, 0, 6.283); d.fill(); };
    light(this.hero.x, this.hero.y - 12, 120);
    for (const p of this.projs) if (p.from === 'hero') light(p.x, p.y, 30);
    for (const f of this.fx) if (f.kind === 'burst') light(f.x, f.y, 50);
    if (this.boss && this.boss.awake) light(this.boss.x, this.boss.y - 20, 80);
    ctx.drawImage(this.darkCv, 0, 0);
  }
}

function setTimeoutGame(g, t, fn) { (g.timers = g.timers || []).push({ t, fn }); }
function shadow(ctx, x, y, r) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r, r * 0.4, 0, 0, 6.283); ctx.fill(); }
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`; }
function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function dirOf(x, y) { return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down'); }
function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); }
function levelGap(heroLv, monLv) { const g = heroLv - monLv; return g <= 5 ? 1 : Math.max(0.1, 1 - (g - 5) * 0.15); }
export { ELEM_NAME, EL_COLOR, THEMES, VILLAGE_HOUSES };
