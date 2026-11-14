// 실시간 진행: 움직임 · 블링크 · 전투 · 몬스터 · 퍼즐 · 이야기 · 지역 이동
import * as THREE from 'three';
import * as R from './rules.js';
import { buildRegion, tileAt, blinkLand, isWalkTile, SEGW, VOID, WATER, LAVA, WALL, ICE, WIND, STONE } from './mapgen.js';
import { buildMapView, labelSprite } from './engine/mapview.js';
import { makeHuman, makeCreature, makePet, makeNpc, sprite, canvasTex, mat, glowMat, mesh, G } from './engine/models.js';
import { glowDot } from './engine/mapview.js';
import { crop, trim, Pix, cv } from './engine/sheets.js';
import { FX, EL3, projMesh } from './engine/fx.js';
import { cast, zig } from './cast.js';
import { BOSS } from './bosses.js';
import { sfx, music } from './audio.js';
import { HEROES, NPCS, SPEAKERS, CHAPTERS, ENDING, PROLOGUE } from './data/story.js';
import { ELEMENTS, ELEM_NAME, ST_TEXT } from './data/skills.js';
import { ITEMS, MATERIALS, CONSUMABLES, RARITY, SLOTS, EL_HEX } from './data/items.js';
import { PETS, PET_RARITY } from './data/pets.js';
import { MONSTERS } from './data/monsters.js';
import { REGIONS, ORDER } from './data/world.js';

const D = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BOSSY = new Set(['mid', 'boss', 'exam']);
const OVER = new Set([VOID, WATER, LAVA]);

export class Game {
  constructor(view, overlay, ui, input) {
    this.V = view; this.O = overlay; this.ui = ui; this.input = input;
    this.fx = new FX(view.fxRoot);
    this.t = 0; this.paused = 0; this.s = null;
    this.cds = {}; this.buffs = [];
  }
  sfx(k, el) { sfx(k, el); }
  shake(k) { this.V.shake = Math.max(this.V.shake, k); }
  later(t, fn) { this.timers.push({ t, fn, reg: this.regionToken }); }

  // ───────────── 시작 · 저장 ─────────────
  start(s) {
    this.s = s; this.input.bind(s.keys);
    if (!s.inv.length && s.lv === 1) { for (const id of ['it001', 'it004', 'it006']) R.equip(s, R.addItem(s, id).uid); }
    this.cds = {}; this.buffs = []; this.flow = 0; this.lastSkill = null;
    this.h = { x: 0, y: 0, dir: { x: 1, y: 0 }, face: 0, hp: 1, mp: 1, inv: 0, st: {}, stoneShield: 0, barrier: 0, kx: 0, ky: 0, slide: null, atkCd: 0, blinkCharges: 0, moving: false };
    if (this.h0 && this.h0.model) this.V.world.remove(this.h0.model.root);
    this.heroKey = null; this.h0 = this.h;
    this.rebuildHero();
    this.hs = R.heroStats(s, []);
    this.h.hp = this.hs.hp; this.h.mp = this.hs.mp;
    this.setPet();
    const pos = s.pos;
    this.enter(s.region, pos ? { x: pos.x, y: pos.y } : 'entry', true);
    if (!s.seenPrologue) { s.seenPrologue = true; this.say(this.prologue(), () => this.updateQuest()); }
    this.saveT = 0;
  }
  prologue() { return [...PROLOGUE, ['sys', `움직이기: 방향키 · 기본 공격 [${this.key('attack')}] · 블링크 [${this.key('blink')}] · 말 걸기 [${this.key('talk')}]\n스킬 칸은 [${['slot0', 'slot1', 'slot2', 'slot3'].map((k) => this.key(k)).join(' ')} …], 단축키는 메뉴(Esc) → 단축키 설정에서 바꿀 수 있어요.`]]; }
  key(a) { const c = this.s.keys[a] || ''; return c.replace(/^Key|^Digit/, ''); }
  save() {
    const s = this.s; if (!s || this.exam) return;
    s.pos = this.bossFight || this.defend || this.escort ? null : { x: +this.h.x.toFixed(2), y: +this.h.y.toFixed(2) };
    s.region = this.A ? this.A.id : s.region;
    try { localStorage.setItem(R.SAVE_KEY, JSON.stringify(s)); } catch (e) { /* */ }
  }

  // ───────────── 주인공 모습 ─────────────
  heroLook() {
    const s = this.s, base = HEROES[s.hero].look;
    const eq = (sl) => { const i = R.equipped(s, sl); return i ? { it: ITEMS[i.id], plus: i.plus || 0 } : null; };
    const st = eq('staff'), hat = eq('hat'), robe = eq('robe'), shoes = eq('shoes');
    const girl = s.hero === 'girl';
    return {
      ...base, hairStyle: base.hairStyle, shirt: robe ? robe.it.look.c : girl ? '#c8423a' : '#5a3c82', pants: girl ? '#3a3048' : '#46403a', shoes: shoes ? shoes.it.look.c : '#4a3426',
      hat: hat ? hat.it.look.c : null, band: hat ? hat.it.look.band : null, gem: hat ? hat.it.look.gem : null,
      robe: robe ? robe.it.look.c : null, trim: robe ? robe.it.look.trim : null,
      weapon: 'staff', orb: st ? st.it.look.orb : '#b48cff', wood: st ? st.it.look.wood : '#7a5232',
      glow: Math.max(st ? st.plus : 0, hat ? hat.plus : 0, robe ? robe.plus : 0),
    };
  }
  rebuildHero() {
    const look = this.heroLook(), key = JSON.stringify(look);
    if (this.heroKey === key) return; this.heroKey = key;
    if (this.h.model) this.V.world.remove(this.h.model.root);
    const m = makeHuman(look);
    if (look.glow >= 10) {
      const col = look.glow >= 20 ? '#ffd23f' : look.glow >= 15 ? '#c080ff' : '#6aa8ff';
      const aura = sprite(glowDot(col), { flat: 1, blend: 1, add: 1, scale: 2.4 }); aura.position.y = 0.02; m.root.add(aura); m.aura = aura; m.auraCol = col;
    }
    this.h.model = m; this.V.world.add(m.root);
  }
  setPet() {
    if (this.pet) { this.V.world.remove(this.pet.model.root); this.pet = null; }
    const id = this.s.pet; if (!id || !PETS[id]) return;
    const p = PETS[id]; const model = makePet(p);
    this.pet = { id, p, model, x: this.h.x - 1, y: this.h.y, t: 0, cd: 0, act: p.act || null, lv: this.s.pets[id] };
    this.V.world.add(model.root);
  }

  // ───────────── 지역 들어가기 ─────────────
  enter(id, where = 'entry', first = false) {
    const s = this.s, reg = REGIONS[id];
    this.regionToken = (this.regionToken || 0) + 1;
    this.A = buildRegion(id); const A = this.A; this.reg = reg;
    // 풀어 둔 문 열기
    for (const g of A.gates) if (s.solved[g.puzzle] || (g.boss && s.beaten[reg.boss])) this.openGate(g, true);
    this.mv = buildMapView(A); this.V.setMap(this.mv);
    this.ents = new THREE.Group(); this.mv.root.add(this.ents);
    this.fx.clear();
    this.mons = []; this.shots = []; this.eshots = []; this.zones = []; this.allies = []; this.orbs = null; this.drops = []; this.npcs = []; this.timers = []; this.targets = []; this.waves = [];
    this.boss = null; this.bossFight = false; this.bossDone = false; this.exam = null; this.ui.boss(null); this.escort = null; this.defend = null; this.blockers = []; this.stopT = 0;
    this.puz = {};
    // 자리
    let p = where === 'end' ? A.endPos : where === 'entry' ? A.entry : where;
    if (where && where.warp && A.warp) p = { x: A.warp.x, y: A.warp.y + 1.6 };
    if (!p || !this.walk(p.x, p.y)) p = A.entry;
    this.h.x = p.x; this.h.y = p.y; this.h.slide = null; this.h.kx = this.h.ky = 0;
    this.V.focus.set(p.x, 0, p.y);
    if (this.pet) { this.pet.x = p.x - 0.8; this.pet.y = p.y + 0.4; }
    // 마을 사람
    if (A.kind === 'town') for (const n of A.npcs) this.addNpc(n.id, n.role, n.x, n.y);
    // 몬스터
    if (!A.safe) for (const sp of A.spawns) this.spawnAt(sp);
    this.setupPuzzles();
    this.setupFinds();
    // 이야기
    R.visitTown(s, id);
    s.region = id;
    music.play(reg.music);
    this.ui.banner(reg.name, reg.kind === 'town' ? '마을' : `${reg.ch}장 · ${['', '사냥터', '동굴'][reg.kind === 'cave' ? 2 : 1]}`);
    this.checkStep();
    this.updateQuest();
    if (!first) this.save();
  }
  openGate(g, instant) {
    for (let y = g.y0; y <= g.y1; y++) this.A.solid[y * this.A.w + g.x] = 0;
    // 동굴 문은 4칸 블록: 원래 막혀 있지 않은 칸만 바닥
    if (this.mv && this.mv.gates[g.puzzle]) { this.mv.gates[g.puzzle].target = 1; if (instant) { this.mv.gates[g.puzzle].open = 1; this.mv.gates[g.puzzle].grp.visible = false; } }
    g.opened = 1;
  }
  addNpc(id, role, x, y, o = {}) {
    const def = NPCS[id]; if (!def) return null;
    const model = makeNpc(id, def.look); model.root.position.set(x, 0, y); model.face(Math.PI / 2);
    this.ents.add(model.root);
    const n = { id, role, x, y, model, name: SPEAKERS[id] || id, ...o, face: 0 };
    this.npcs.push(n); return n;
  }

  // ───────────── 몬스터 만들기 ─────────────
  spawnAt(sp) {
    const list = this.reg.mons || []; if (!list.length) return;
    const id = list[Math.floor(Math.random() * list.length)];
    const m = this.spawnMon(id, sp.x + 0.5, sp.y + 0.5); if (m) m.spawn = sp;
  }
  spawnMon(id, x, y, o = {}) {
    const def = MONSTERS[id]; if (!def) return null;
    const ms = R.monsterStats(def);
    const model = makeCreature(def.model, id);
    if (o.noShadow && model.shadow) model.shadow.visible = false;
    model.root.position.set(x, 0, y);
    this.ents.add(model.root);
    const sc = def.model.scale || 1;
    const m = { id, def, ms, lv: def.lv, x, y, hx: x, hy: y, hp: ms.hp, max: ms.hp, model, rad: 0.35 + 0.18 * sc, alive: true, st: {}, cd: 1 + Math.random() * 1.5, t: Math.random() * 10, state: 'idle', face: Math.random() * 6, ai: def.ai, role: def.role, aggro: false, dmgMul: 1, kx: 0, ky: 0, spd: ms.speed, ...o };
    m.H = model.H || 1.5;
    if (o.hpMul) { m.hp = m.max = Math.round(m.max * o.hpMul); }
    if (BOSSY.has(def.role) && BOSS[def.boss]) { m.script = BOSS[def.boss]; m.bs = { t: 0, next: 1.6, phase: 0 }; m.script.init?.(this, m); }
    this.mons.push(m); return m;
  }

  // ───────────── 퍼즐 · 찾을 것 ─────────────
  setupPuzzles() {
    const A = this.A, s = this.s;
    for (const P of A.puzzles) {
      const solved = !!s.solved[P.id];
      const st = this.puz[P.id] = { P, solved };
      if (P.type === 'plates') {
        st.lit = P.plates.map(() => 0); st.meshes = P.plates.map((p) => {
          const m = sprite(solved ? PZ.plateOn() : PZ.plateOff(), { flat: 1 }); m.position.set(p.x + 0.5, 0.015, p.y + 0.5); this.ents.add(m); return m;
        });
      } else if (P.type === 'torches') {
        st.lit = []; const objs = this.mv.objs[P.id] || [];
        objs.forEach((o, i) => { o.num.visible = true; o.num.userData.setText('①②③④'[i]); if (solved) o.light(true); this.targets.push({ x: o.x + 0.5, y: o.y + 0.5, r: 0.6, onHit: (el) => this.torchHit(P.id, i) }); });
        st.objs = objs;
      } else if (P.type === 'crystals') {
        st.on = solved ? P.on.map(() => 1) : P.on.slice(); st.objs = this.mv.objs[P.id] || []; st.cd = st.objs.map(() => 0);
        st.objs.forEach((o, i) => this.targets.push({ x: o.x + 0.5, y: o.y + 0.5, r: 0.6, onHit: () => this.crystalHit(P.id, i) }));
        this.paintCrystals(st);
      } else if (P.type === 'boulder') {
        const b = solved ? P.sw : P.start;
        st.bx = b.x; st.by = b.y; st.ax = b.x; st.ay = b.y;
        st.mesh = sprite(PZ.boulder(), { sink: 1 / 16 }); st.mesh.position.set(b.x + 0.5, 0, b.y + 0.9); this.ents.add(st.mesh);
        st.swTop = sprite(solved ? PZ.swOn() : PZ.swOff(), { flat: 1 }); st.swTop.position.set(P.sw.x + 0.5, 0.012, P.sw.y + 0.5); this.ents.add(st.swTop);
        const rs = sprite(PZ.resetStone(), { sink: 0 }); rs.position.set(P.reset.x + 0.5, 0, P.reset.y + 0.85); this.ents.add(rs);
        st.reset = P.reset;
        this.A.solid[b.y * A.w + b.x] = 1;
      } else if (P.type === 'ice') { st.x1 = P.x1; }
    }
  }
  paintCrystals(st) { st.objs.forEach((o, i) => o.setOn(st.on[i])); }
  torchHit(pid, i) {
    const st = this.puz[pid]; if (st.solved) return;
    if (st.lit.includes(i)) return;
    const need = st.P.order[st.lit.length];
    if (i === need) { st.lit.push(i); st.objs[i].light(true); sfx('click'); this.fx.burst(st.objs[i].x + 0.5, 1.2, st.objs[i].y + 0.5, 16, EL3.fire, { speed: 1.5, up: 2.5 }); if (st.lit.length === 4) this.solve(pid); }
    else { sfx('wrong'); this.ui.toast('순서가 틀렸어요. 화로가 모두 꺼졌어요.'); for (const k of st.lit) st.objs[k].light(false); st.lit = []; }
  }
  crystalHit(pid, i) {
    const st = this.puz[pid]; if (st.solved || st.cd[i] > this.t) return;
    st.cd[i] = this.t + 0.45;
    for (const k of st.P.adj[i]) st.on[k] ^= 1;
    if (!st.P.adj[i].includes(i)) st.on[i] ^= 1;
    this.paintCrystals(st); sfx('click');
    this.fx.burst(st.objs[i].x + 0.5, 1.2, st.objs[i].y + 0.5, 12, ['#9af0ff', '#ffffff'], { speed: 2, up: 2 });
    if (st.on.every((v) => v)) this.solve(pid);
  }
  solve(pid) {
    const st = this.puz[pid]; if (!st || st.solved) return;
    st.solved = true; sfx('puzzle'); this.ui.toast('🔓 길이 열렸어요!'); this.shake(0.2);
    const g = this.A.gates.find((x) => x.puzzle === pid); if (g) this.openGate(g);
    const r = R.onSolve(this.s, this.A.id, pid);
    if (r === 'stepDone') this.completeStep();
    this.save();
  }
  setupFinds() {
    for (const f of this.A.finds) {
      if (this.s.found[f.id]) { const g = this.mv.finds[f.id]; if (g) g.visible = false; continue; }
      if (f.id.startsWith('trav')) this.targets.push({ x: f.x, y: f.y, r: 0.7, find: f, onHit: (el) => { if (!this.s.found[f.id]) this.findIt(f); } });
    }
  }
  findIt(f) {
    const r = R.onFind(this.s, this.A.id, f.id);
    const g = this.mv.finds[f.id]; if (g) g.visible = false;
    this.fx.burst(f.x, 0.8, f.y, 30, ['#fff6a0', '#ffffff', '#ffd040'], { speed: 2, up: 3 }); sfx('item');
    if (f.pet) { this.s.pets[f.pet] = Math.max(1, this.s.pets[f.pet] || 0); this.s.pet = f.pet; this.setPet(); }
    if (f.id.startsWith('trav')) { this.ui.toast(`❄️ ${f.name}을(를) 녹였어요!`); this.fx.burst(f.x, 1, f.y, 30, EL3.ice, { speed: 3, up: 3 }); }
    else if (!f.pet) this.ui.toast(`✨ ${f.name}을(를) 찾았어요!`);
    if (r === 'stepDone') this.completeStep(); else if (r === 'prog') { this.updateQuest(); sfx('coin'); }
  }

  // ───────────── 이야기 ─────────────
  say(lines, done) { this.paused++; this.ui.dialog(lines, () => { this.paused = Math.max(0, this.paused - 1); done && done(); }); }
  updateQuest() {
    const s = this.s, st = R.curStep(s);
    let where = '';
    if (st) { const ri = REGIONS[st.region].idx, ci = REGIONS[this.A.id].idx; where = ri > ci ? `→ ${REGIONS[st.region].name} (오른쪽으로 계속 가요)` : ri < ci ? `← ${REGIONS[st.region].name} (왼쪽으로 돌아가요)` : `📍 ${REGIONS[st.region].name}`; }
    this.ui.quest(st ? CHAPTERS[s.ch].title : '자유 모험', R.stepText(s), where);
  }
  completeStep() {
    const s = this.s, st = R.curStep(s); if (!st) return;
    const chBefore = s.ch;
    const rw = R.advance(s);
    const ups = R.gainExp(s, rw.exp); s.gold += rw.gold;
    sfx('quest'); this.ui.toast(`📜 퀘스트 완료! 경험치 +${rw.exp} · 골드 +${rw.gold}`);
    if (ups.length) this.levelUp(ups);
    const after = () => { this.checkStep(); this.updateQuest(); this.save(); };
    if (st.done === '@ending') this.say(ENDING, () => { this.ui.ending(); after(); });
    else if (st.done) this.say(st.done, after); else after();
    if (s.ch !== chBefore && !s.done) this.later(0.3, () => this.ui.banner(CHAPTERS[s.ch].title, '새 장이 시작돼요'));
  }
  // 지금 단계가 이미 이뤄졌는지 (먼저 풀어 둔 퍼즐, 먼저 찾은 것 등)
  checkStep() {
    const s = this.s, st = R.curStep(s); if (!st) return;
    const here = this.A && st.region === this.A.id;
    if (st.type === 'reach' && here) return this.completeStep();
    if (st.type === 'puzzle' && Object.keys(s.solved).some((k) => k.startsWith(st.region + ':'))) return this.completeStep();
    if (st.type === 'find') { const need = [].concat(st.find); s.prog = need.filter((f) => s.found[f]).length; if (s.prog >= need.length) return this.completeStep(); }
    if ((st.type === 'mid' || st.type === 'boss') && s.beaten[st.mon]) return this.completeStep();
    if (st.type === 'enhance' && s.inv.some((i) => (i.plus || 0) >= st.to)) return this.completeStep();
    if (st.type === 'escort' && here && !this.escort) this.startEscort(st);
  }
  onCraft() { const st = R.curStep(this.s); if (st && st.type === 'craft') this.completeStep(); }
  onEnhance() { const st = R.curStep(this.s); if (st && st.type === 'enhance' && this.s.inv.some((i) => (i.plus || 0) >= st.to)) this.completeStep(); }
  levelUp(ups) {
    sfx('levelup'); this.hs = R.heroStats(this.s, this.buffs); this.h.hp = this.hs.hp; this.h.mp = this.hs.mp;
    this.ui.banner(`Lv.${this.s.lv}`, '레벨이 올랐어요! 능력치 +3 · 스킬 점수 +1');
    this.fx.pillar(this.h.x, this.h.y, 'light', 6, 1, 1); this.fx.burst(this.h.x, 0.3, this.h.y, 50, EL3.light, { speed: 2, up: 4, grav: 0, size: 0.4, r: 1 });
  }

  // ───────────── 말 걸기 ─────────────
  interact() {
    const h = this.h, s = this.s, st = R.curStep(s);
    // 사람
    let best = null, bd = 2.2;
    for (const n of this.npcs) { const d = D(h.x, h.y, n.x, n.y); if (d < bd) { bd = d; best = n; } }
    if (best) return this.talkTo(best);
    // 비석
    if (this.A.warp && D(h.x, h.y, this.A.warp.x, this.A.warp.y) < 2.2) { sfx('ui'); return this.ui.open('warp'); }
    // 찾을 것
    for (const f of this.A.finds) if (!s.found[f.id] && D(h.x, h.y, f.x, f.y) < 1.6) {
      if (f.id.startsWith('trav')) return this.ui.toast('얼음에 갇혀 있어요. 마법으로 녹여 보세요!');
      return this.findIt(f);
    }
    // 바위 되돌림
    for (const p of Object.values(this.puz)) if (p.P.type === 'boulder' && !p.solved && D(h.x, h.y, p.reset.x + 0.5, p.reset.y + 0.5) < 1.6) { this.resetBoulder(p); return; }
    // 표지판
    for (const sg of this.A.signs) if (D(h.x, h.y, sg.x + 0.5, sg.y + 0.5) < 1.8) return this.say([['sys', sg.text]]);
    if (st && st.type === 'defend' && this.A.defend && D(h.x, h.y, this.A.defend.x, this.A.defend.y) < 4 && !this.defend) return this.startDefend(st);
  }
  nearInteract() {
    const h = this.h, s = this.s;
    for (const n of this.npcs) if (D(h.x, h.y, n.x, n.y) < 2.2) return `${n.name}`;
    if (this.A.warp && D(h.x, h.y, this.A.warp.x, this.A.warp.y) < 2.2) return '순간 이동 비석';
    for (const f of this.A.finds) if (!s.found[f.id] && D(h.x, h.y, f.x, f.y) < 1.6) return f.name;
    for (const p of Object.values(this.puz)) if (p.P.type === 'boulder' && !p.solved && D(h.x, h.y, p.reset.x + 0.5, p.reset.y + 0.5) < 1.6) return '되돌림 돌 (바위를 처음 자리로)';
    for (const sg of this.A.signs) if (D(h.x, h.y, sg.x + 0.5, sg.y + 0.5) < 1.8) return sg.tablet ? '석판 읽기' : '표지판 읽기';
    const st = R.curStep(s); if (st && st.type === 'defend' && this.A.defend && !this.defend && D(h.x, h.y, this.A.defend.x, this.A.defend.y) < 4) return '수레 지키기 시작';
    return null;
  }
  talkTo(n) {
    const s = this.s, st = R.curStep(s);
    n.model.face(ang(n.x, n.y, this.h.x, this.h.y));
    if (n.escort) return this.ui.toast('오토: "앞장서 주게! 내가 따라가겠네."');
    if (st && st.npc === n.id && st.region === this.A.id) {
      if (st.type === 'talk') return this.say(st.say, () => this.completeStep());
      if (st.type === 'exam') return this.say(st.say, () => this.startExam(st, n));
      if (st.type === 'quiz') return this.say(st.say, () => this.ui.quiz(st, (ok) => { if (ok) this.completeStep(); else this.say([[n.id, '아쉬워요! 다시 도전해 보세요.']]); }));
    }
    const def = NPCS[n.id], idle = def.idle[Math.floor(Math.random() * def.idle.length)];
    const open = { 'shop:potion': 'shop:potion', 'shop:staff': 'shop:staff', 'shop:cloth': 'shop:cloth', 'shop:general': 'shop:general', smith: 'smith', pet: 'petshop' }[n.role];
    if (open) { sfx('ui'); this.say([[n.id, idle]], () => this.ui.open(open)); return; }
    if (n.role === 'exam' && s.rank >= 4) return this.say([[n.id, '익스퍼트 마법사님이시군요. 언제든 놀러 오세요.']]);
    this.say([[n.id, idle]]);
  }

  // ───────────── 시험 ─────────────
  startExam(st, npc) {
    const A = this.A, p = A.examArena || { x: A.entry.x + 6, y: A.entry.y };
    this.exam = { st, npc };
    this.h.x = p.x; this.h.y = p.y + 3.5;
    this.ui.toast('⚔️ 시험 시작! 시험관을 쓰러뜨리세요.');
    const m = this.spawnMon(st.mon, p.x, p.y - 1.5);
    this.startBoss(m);
    music.play('boss_exam');
  }
  endExam(win) {
    const ex = this.exam; this.exam = null;
    music.play(this.reg.music);
    if (!win) { this.h.hp = this.hs.hp; this.h.mp = this.hs.mp; this.say([[ex.npc.id, '아쉽군요. 준비가 되면 다시 오세요.']]); }
  }

  // ───────────── 호위 · 지키기 ─────────────
  startEscort(st) {
    const A = this.A;
    const n = this.addNpc(st.npc, 'escort', A.entry.x + 0.5, A.entry.y + 1.2, { escort: true, hp: 1, max: 1 });
    n.max = n.hp = Math.round(this.hs.hp * 2.2);
    this.escort = { n, goal: A.segX[st.toSeg] + 4, st };
    this.ui.toast('🛶 오토를 지켜서 사당까지 데려가요. 오토는 내 뒤를 따라와요.');
  }
  startDefend(st) {
    const A = this.A, d = A.defend;
    const cart = this.spawnMon('blood_barrel', d.x, d.y, { cart: true, ai: 'none', friendlyObj: true, hpMul: 1 });
    cart.max = cart.hp = Math.round(this.hs.hp * 3);
    cart.model.tint('#d8b080');
    this.defend = { st, cart, wave: 0, t: 2, live: [] };
    this.ui.toast(`🛡️ 수레를 지켜요! 몰려오는 적 ${st.waves}번`);
    music.play('boss_def');
  }
  updateDefend(dt) {
    const df = this.defend; if (!df) return;
    df.live = df.live.filter((m) => m.alive);
    if (!df.cart.alive) { this.ui.toast('수레가 부서졌어요… 잠시 뒤 다시 시작해요.'); for (const m of df.live) m.alive = false, this.removeMon(m); this.defend = null; music.play(this.reg.music); return; }
    if (!df.live.length) {
      if (df.wave >= df.st.waves) { this.defend = null; df.cart.alive = false; this.removeMon(df.cart); music.play(this.reg.music); this.completeStep(); return; }
      df.t -= dt;
      if (df.t <= 0) {
        df.wave++; df.t = 3; this.ui.banner(`${df.wave} / ${df.st.waves} 번째 무리`, '수레를 지켜요!');
        const n = 3 + df.wave * 2;
        for (let i = 0; i < n; i++) {
          const side = i % 2 ? 1 : -1, x = clamp(df.cart.x + side * (9 + Math.random() * 3), 2, this.A.w - 3), y = clamp(df.cart.y + (Math.random() - 0.5) * 8, 3, this.A.h - 4);
          const list = this.reg.mons; const m = this.spawnMon(list[i % list.length], x, y, { aggro: true, goCart: df.cart });
          if (m && this.walk(x, y)) df.live.push(m); else if (m) { m.x = df.cart.x + side * 6; m.y = df.cart.y; df.live.push(m); }
        }
      }
    }
  }

  // ───────────── 보스 ─────────────
  startBoss(m) {
    this.boss = m; this.bossFight = true;
    m.aggro = true;
    if (m.role !== 'exam') music.play(m.role === 'mid' ? 'boss_mid_' + m.id : 'boss_' + m.id);
    sfx('roar'); this.shake(0.4);
    this.ui.boss(m);
  }
  maybeBoss() {
    const A = this.A, s = this.s; if (!A.arena || this.boss || this.bossDone) return;
    const id = this.reg.mid || this.reg.boss; if (!id) return;
    const st = R.curStep(s);
    const story = st && (st.type === 'mid' || st.type === 'boss') && st.mon === id && st.region === A.id;
    if (!story && !s.beaten[id]) return;
    if (D(this.h.x, this.h.y, A.arena.x, A.arena.y) > 8.5) return;
    const m = this.spawnMon(id, A.arena.x + 2.5, A.arena.y - 0.5);
    for (const o of this.mons) if (o !== m && !o.boss && D(o.x, o.y, A.arena.x, A.arena.y) < 10 && o.role === 'normal') { o.alive = false; this.removeMon(o); }
    const go = () => this.startBoss(m);
    if (story && st.before) { this.say(st.before, go); } else go();
  }

  // ───────────── 지형 ─────────────
  cell(x, y) { return tileAt(this.A, Math.floor(x), Math.floor(y)); }
  solidAt(x, y) { const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= this.A.w || cy >= this.A.h) return true; return this.A.solid[cy * this.A.w + cx] === 1; }
  walk(x, y, r = 0.26) {
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (this.solidAt(x + dx, y + dy)) return false;
    for (const b of this.blockers) if (D(x, y, b.x, b.y) < b.r + r) return false;
    return true;
  }
  move(e, dx, dy, r) {
    let hit = false;
    if (dx) { if (this.walk(e.x + dx, e.y, r)) e.x += dx; else hit = true; }
    if (dy) { if (this.walk(e.x, e.y + dy, r)) e.y += dy; else hit = true; }
    return hit;
  }
  wallAt(x, y) { const k = this.cell(x, y); if (OVER.has(k)) return false; return k === WALL || this.solidAt(x, y); }

  // ───────────── 조준 ─────────────
  aim(range = 10) {
    const h = this.h, f = Math.atan2(h.dir.y, h.dir.x);
    let best = null, bs = 1e9;
    for (const m of this.mons) {
      if (!m.alive || m.untarget || m.friendlyObj) continue;
      const d = D(h.x, h.y, m.x, m.y); if (d > range) continue;
      const a = ang(h.x, h.y, m.x, m.y), dot = Math.cos(a - f);
      if (dot < -0.1 && d > 3) continue;
      const sc = d * (1.7 - dot) * (BOSSY.has(m.role) ? 0.8 : 1);
      if (sc < bs) { bs = sc; best = m; }
    }
    for (const t of this.targets) {
      if (t.done) continue;
      const d = D(h.x, h.y, t.x, t.y); if (d > range) continue;
      const a = ang(h.x, h.y, t.x, t.y), dot = Math.cos(a - f);
      if (dot < 0.55) continue;
      const sc = d * (1.7 - dot) * (best ? 3 : 1);
      if (sc < bs) { bs = sc; best = t; }
    }
    if (best) { const a = ang(h.x, h.y, best.x, best.y); return { ang: a, target: best, tx: best.x, ty: best.y }; }
    const dd = Math.min(range * 0.55, 6);
    return { ang: f, target: null, tx: h.x + Math.cos(f) * dd, ty: h.y + Math.sin(f) * dd };
  }
  nearest(x, y, r, alive = true, skip) {
    let best = null, bd = r;
    for (const m of this.mons) { if (!m.alive || m.untarget || m.friendlyObj || (skip && skip.has(m))) continue; const d = D(x, y, m.x, m.y); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  nearestFront(x, y, a, r) {
    let best = null, bs = 1e9;
    for (const m of this.mons) { if (!m.alive || m.untarget || m.friendlyObj) continue; const d = D(x, y, m.x, m.y); if (d > r) continue; const dot = Math.cos(ang(x, y, m.x, m.y) - a); if (dot < 0.3) continue; const sc = d * (2 - dot); if (sc < bs) { bs = sc; best = m; } }
    return best;
  }
  inShape(sh, px, py, pr = 0) {
    if (sh.c) return D(px, py, sh.c[0], sh.c[1]) <= sh.c[2] + pr;
    if (sh.line) { const [x, y, a, len, w] = sh.line; const dx = px - x, dy = py - y, along = dx * Math.cos(a) + dy * Math.sin(a), side = -dx * Math.sin(a) + dy * Math.cos(a); return along >= -0.3 && along <= len + pr && Math.abs(side) <= w / 2 + pr; }
    if (sh.cone) { const [x, y, a, r, arc] = sh.cone; const d = D(px, py, x, y); if (d > r + pr) return false; if (d < 0.6) return true; let da = Math.abs(((ang(x, y, px, py) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return da <= arc / 2 + pr / Math.max(d, 0.5); }
    return false;
  }
  // 범위 공격: 맞은 몬스터 목록
  strike(sh, power, el, o = {}) {
    const hits = [];
    for (const m of this.mons.slice()) if (m.alive && !m.untarget && !m.friendlyObj && this.inShape(sh, m.x, m.y, m.rad)) { this.hit(m, power, el, o); hits.push(m); }
    for (const t of this.targets) if (!t.done && this.inShape(sh, t.x, t.y, t.r)) t.onHit(el);
    return hits;
  }
  hitTargetsAt(x, y, r, el) { for (const t of this.targets) if (!t.done && D(x, y, t.x, t.y) < r + t.r) { t.onHit(el); return true; } return false; }

  // ───────────── 피해 주기 (원소 특성 포함) ─────────────
  hit(m, power, el, o = {}) {
    if (!m.alive || m.untarget) return 0;
    const s = this.s, hs = this.hs, sk = o.sk;
    const isSkill = !!(sk && sk.el === el && ELEMENTS.includes(el));
    const has = (e) => isSkill && el === e && s.elements.includes(e);
    let mul = (o.mul || 1) * (m.dmgMul ?? 1);
    if (m.script && m.script.onHurt) { const r = m.script.onHurt(this, m, o); if (r != null) mul *= r; }
    if (mul <= 0.001) { this.O.num(m.x, m.H + 0.4, m.y, '막힘', '#a0a0c0'); sfx('block'); return 0; }
    if (sk && s.elements.includes('water') && this.flow) mul *= 1 + this.flow * 0.06;
    const frozen = (m.st.freeze || 0) > 0;
    let shattered = false;
    if (frozen && isSkill) { mul *= sk.shatter ? 2 : s.elements.includes('ice') ? 1.6 : 1; shattered = s.elements.includes('ice') || sk.shatter; }
    if (s.elements.includes('time') && isSkill && ((m.st.slow || 0) > 0 || (m.st.chill && m.st.chill.n))) mul *= 1.2;
    if (sk && sk.execute && m.hp / m.max < sk.execute) mul *= 2;
    if (this.stopT > 0 && m.stopped && this.stopSk && this.stopSk.store) mul *= 1;
    const isBoss = BOSSY.has(m.role);
    const dm = R.damageToMonster(hs, power, el, m.def, Math.random(), Math.random(), { mul, holy: sk && sk.holy, defDown: (m.st.corrupt || 0) > 0 ? 0.15 : 0 });
    let dmg = dm.dmg;
    if (m.stopped && this.stopSk && this.stopSk.store) { m.stored = (m.stored || 0) + dmg; }
    m.hp -= dmg; m.hurtT = 0.12; m.aggro = true;
    if (o.basic) { this.h.mp = Math.min(this.hs.mp, this.h.mp + R.BASIC_MP); }
    // 숫자
    const col = dm.crit ? '#ffe04a' : EL_HEX[el] || '#ffffff';
    this.O.num(m.x, m.H + 0.3, m.y, dm.crit ? dmg + '!' : dmg, col, dm.crit || dmg > hs.matk * 3);
    if (dm.weak) this.O.num(m.x, m.H + 0.8, m.y, '약점', '#ffb060');
    sfx(dm.crit ? 'crit' : 'hit');
    // 흡혈 · 빛 · 물
    let heal = 0;
    if (sk && sk.drain) heal += dmg * sk.drain;
    if (hs.drain) heal += dmg * hs.drain / 100;
    if (has('light')) heal += dmg * 0.04;
    if (has('water') && o.castId && this.lastWaterHeal !== o.castId) { this.lastWaterHeal = o.castId; heal += this.hs.hp * 0.012; }
    if (heal > 0) this.heal(heal, true);
    // 상태
    const res = isBoss ? 0.4 : 1, obj = m.role === 'object' || m.ai === 'none';
    if (!obj) {
      if (shattered && frozen) { m.st.freeze = 0; this.fx.burst(m.x, 0.8, m.y, 20, ['#ffffff', '#c8f0ff', '#7ac8f0'], { speed: 4, up: 3, grav: -8, size: 0.35 }); this.O.num(m.x, m.H + 1, m.y, '깨짐!', '#c8f0ff'); }
      const stName = o.st || (sk && sk.st);
      if (stName) this.applySt(m, stName, sk, res, o);
      if (o.freezeCh && Math.random() < o.freezeCh) m.st.freeze = 1.5 * res;
      if ((o.knock || o.pull) && !isBoss) this.knock(m, o, has('wind'), power, el, sk);
      if (has('fire')) {
        const b = m.st.burn || (m.st.burn = { n: 0, t: 0 }); b.n += sk.stack || 1; b.t = 5;
        if (b.n >= 5) { b.n = 0; this.later(0.05, () => { if (!m.alive && !m.dead) return; this.fx.explode(m.x, m.y, 2.6, 'fire', true); sfx('boom', 'fire'); this.strike({ c: [m.x, m.y, 2.6] }, 1.4 + 0.1 * (sk.lv || 1), 'fire', {}); }); this.O.num(m.x, m.H + 1.1, m.y, '점화!', '#ff9a3a'); }
      } else if (this.pet && this.pet.act && this.pet.act.kind === 'burn' && Math.random() < this.pet.act.chance) { const b = m.st.burn || (m.st.burn = { n: 0, t: 0 }); b.n = Math.min(4, b.n + 1); b.t = 5; }
      if (has('ice') && !frozen) { const c = m.st.chill || (m.st.chill = { n: 0, t: 0 }); c.n += (sk.st === 'chill' ? (sk.stack || 1) : 0) + (sk.st === 'chill' ? 0 : 1); c.t = 4; if (c.n >= 3) { c.n = 0; m.st.freeze = (sk.freezeT || 2) * res; this.O.num(m.x, m.H + 1.1, m.y, '얼음!', '#9fe6ff'); } }
      if (has('dark')) m.st.corrupt = Math.max(m.st.corrupt || 0, 4 * (sk.stack ? 1.5 : 1));
      if (has('wood') && !(m.st.seed > 0)) { m.st.seed = 3; m.seedPow = 0.9 + 0.12 * (sk.lv || 1); }
      if (has('time') && o.castId && this.lastTimeCd !== o.castId) { this.lastTimeCd = o.castId; for (const k of Object.keys(this.cds)) if (k !== sk.id) this.cds[k] = Math.max(0, this.cds[k] - 0.35); }
    }
    if (sk && sk.weaken) m.weaken = sk.weaken;
    if (m.cart || m.friendlyObj) return 0;
    if (m.hp <= 0) this.kill(m, o);
    return dmg;
  }
  applySt(m, name, sk = {}, res = 1, o = {}) {
    const S = m.st;
    switch (name) {
      case 'stun': if (Math.random() < (sk.stunCh ?? 1)) { S.stun = Math.max(S.stun || 0, (sk.stunT || 1) * res); } break;
      case 'freeze': S.freeze = Math.max(S.freeze || 0, (sk.freezeT || 2) * res); break;
      case 'chill': if (!this.s.elements.includes('ice')) { S.slow = Math.max(S.slow || 0, 2 * res); } else { S.slow = Math.max(S.slow || 0, 1.5 * res); } break;
      case 'slow': S.slow = Math.max(S.slow || 0, 3 * res); if (sk.heavySlow) S.heavy = 1; break;
      case 'corrupt': S.corrupt = Math.max(S.corrupt || 0, 4 * (sk.stack || 1)); break;
      case 'curse': S.curse = 6; if (sk.spread) m.curseSpread = 1; break;
      case 'blind': S.blind = Math.max(S.blind || 0, (sk.blindT || 2) * res); break;
      case 'root': S.root = Math.max(S.root || 0, (sk.rootT || 2) * res); break;
      case 'poison': S.poison = 5; S.poisonX = sk.poisonX || 1; break;
    }
  }
  knock(m, o, windTrait, power, el, sk) {
    const [fx, fy] = o.from || [this.h.x, this.h.y];
    const a = ang(fx, fy, m.x, m.y);
    if (o.pull) { const d = Math.max(0, D(fx, fy, m.x, m.y) - 1.2); m.kx = -Math.cos(a) * Math.min(d, 3) * 5; m.ky = -Math.sin(a) * Math.min(d, 3) * 5; m.kT = 0.2; return; }
    const k = o.knock || 3; m.kx = Math.cos(a) * k * 5; m.ky = Math.sin(a) * k * 5; m.kT = 0.2; m.kWind = windTrait ? { power, el, sk } : null;
  }
  kill(m, o = {}) {
    if (!m.alive) return;
    m.alive = false; m.dead = true;
    const s = this.s, def = m.def, isBoss = BOSSY.has(m.role);
    this.fx.burst(m.x, 0.6, m.y, isBoss ? 80 : 18, isBoss ? ['#ffffff', '#ffd040', '#ff8040'] : ['#ffffff', '#d8d0f0', '#a090c0'], { speed: isBoss ? 5 : 2.5, up: 3, size: 0.35 });
    sfx(isBoss ? 'bossdie' : 'die');
    if (m.parent && m.parent.script && m.parent.script.onChild) m.parent.script.onChild(this, m.parent, m);
    if (m.script && m.script.onDeath) m.script.onDeath(this, m);
    // 보상
    if (!['object', 'clone', 'exam'].includes(m.role) && !m.noLoot) {
      const hs = this.hs;
      const ups = R.gainExp(s, Math.round(m.ms.exp * (1 + (hs.exp || 0) / 100)));
      if (ups.length) this.levelUp(ups);
      const dr = R.rollDrops(def, Math.random, s);
      this.dropLoot(m.x, m.y, dr);
      s.kills++;
    }
    if (m.st.corrupt > 0 && s.elements.includes('dark')) { this.h.mp = Math.min(this.hs.mp, this.h.mp + 4); }
    if (o.sk && o.sk.mpOnKill) this.h.mp = Math.min(this.hs.mp, this.h.mp + o.sk.mpOnKill);
    if (m.curseSpread) for (const n of this.mons) if (n.alive && n !== m && D(n.x, n.y, m.x, m.y) < 3.5) { n.st.curse = 6; n.curseSpread = 1; this.fx.burst(n.x, 1, n.y, 8, EL3.dark, { speed: 1 }); }
    // 이야기
    const r = R.onKill(s, m.id, this.A.id);
    const c = R.collectRoll(s, m.id, this.A.id, Math.random);
    if (c) { const st = R.curStep(s); this.ui.toast(`📦 ${st ? st.item : ''} 획득!`); sfx('item'); }
    if (r === 'prog' || c === 'prog') this.updateQuest();
    if (isBoss) {
      if (m.role !== 'exam') s.beaten[m.id] = (s.beaten[m.id] || 0) + 1;
      this.boss = null; this.bossFight = false; this.bossDone = true; this.ui.boss(null);
      for (const o2 of this.mons) if (o2.parent === m || o2.minion) { o2.alive = false; this.removeMon(o2); }
      this.eshots.forEach((p) => this.ents.remove(p.mesh)); this.eshots = [];
      const g = this.A.gates.find((x) => x.boss); if (g && m.role === 'boss') this.openGate(g);
      this.slowmo = 0.8; this.shake(0.6);
      if (this.exam) { const ex = this.exam; this.endExam(true); }
      else music.play(this.reg.music);
      this.fx.pillar(m.x, m.y, 'light', 10, 1.4, 1.2);
    }
    if (r === 'stepDone' || c === 'stepDone') this.later(isBoss ? 1.4 : 0.2, () => this.completeStep());
    this.later(0.6, () => this.removeMon(m));
    if (m.spawn && !this.A.safe) { const sp = m.spawn; this.later(28 + Math.random() * 10, () => { if (D(this.h.x, this.h.y, sp.x, sp.y) > 11) this.spawnAt(sp); else this.later(10, () => this.spawnAt(sp)); }); }
    this.save();
  }
  removeMon(m) { this.ents.remove(m.model.root); this.mons = this.mons.filter((x) => x !== m); }
  dropLoot(x, y, dr) {
    const put = (o) => { const a = Math.random() * 6.28, r = 0.3 + Math.random() * 0.9; this.addDrop({ ...o, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }); };
    if (dr.gold) put({ kind: 'gold', n: dr.gold });
    for (const [k, n] of Object.entries(dr.mats)) put({ kind: 'mat', id: k, n });
    for (const id of dr.items) put({ kind: 'item', id });
    for (const id of dr.cons) put({ kind: 'cons', id, n: 1 });
  }
  addDrop(d) {
    const g = new THREE.Group();
    const icon = d.kind === 'gold' ? PZ.coin() : d.kind === 'mat' ? PZ.gem(d.id) : d.kind === 'cons' ? PZ.potion(CONSUMABLES[d.id].color) : PZ.chest();
    const s = sprite(icon, { sink: 0 }); g.add(s);
    if (d.kind === 'item') { const it = ITEMS[d.id]; const beam = sprite(PZ.beam(), { blend: 1, add: 1 }); beam.material.color.set(RARITY[it.rar].color); beam.material.opacity = 0.7; beam.position.z = -0.02; g.add(beam); }
    g.position.set(d.x, 0, d.y); this.ents.add(g);
    this.drops.push({ ...d, g, s, t: 0 });
  }
  pickUp(d) {
    const s = this.s;
    if (d.kind === 'gold') { s.gold += d.n; sfx('coin'); this.O.num(this.h.x, 2.2, this.h.y, `+${d.n}G`, '#ffd23f'); }
    else if (d.kind === 'mat') { s.mats[d.id] = (s.mats[d.id] || 0) + d.n; sfx('coin'); this.ui.toast(`${MATERIALS[d.id].icon} ${MATERIALS[d.id].name} ×${d.n}`); }
    else if (d.kind === 'cons') { s.cons[d.id] = (s.cons[d.id] || 0) + 1; sfx('coin'); this.ui.toast(`🧪 ${CONSUMABLES[d.id].name}`); }
    else { R.addItem(s, d.id); sfx('item'); const it = ITEMS[d.id]; this.ui.toast(`<b style="color:${RARITY[it.rar].color}">[${RARITY[it.rar].name}] ${it.name}</b> 획득!`); }
  }

  // ───────────── 주인공이 맞기 ─────────────
  hurtHero(atk, mult = 1, o = {}) {
    const h = this.h;
    if (h.inv > 0 || h.blinkT > 0 || this.paused || h.dead) return 0;
    let dmg = R.damageToHero(this.hs, atk, mult * (o.src && o.src.weaken ? 1 - o.src.weaken / 100 : 1) * (o.src && o.src.st && o.src.st.curse > 0 ? 0.85 : 1), Math.random());
    for (const z of this.zones) if (z.guardZone && D(h.x, h.y, z.x, z.y) < z.r) dmg *= 1 - z.guardZone / 100;
    dmg = Math.round(dmg);
    if (h.stoneShield > 0 && dmg > 0) { h.stoneShield--; dmg = Math.round(dmg * 0.35); this.fx.burst(h.x, 1, h.y, 10, EL3.earth, { speed: 2 }); this.O.num(h.x, 2, h.y, '보호막', '#c49a5a'); }
    if (h.barrier > 0) { const a = Math.min(h.barrier, dmg); h.barrier -= a; dmg -= a; }
    if (this.hs.shield && dmg > 0) { const half = Math.round(dmg / 2), mp = Math.min(this.h.mp, half); h.mp -= mp; dmg -= mp; }
    if (dmg <= 0) { sfx('block'); return 0; }
    h.hp -= dmg; h.hurtT = 0.15; h.model.flash(true);
    this.O.num(h.x, 2, h.y, dmg, '#ff5a5a'); sfx('hurt'); this.ui.hurt(); this.shake(Math.min(0.3, 0.08 + dmg / this.hs.hp));
    const src = o.src && o.src.alive && o.src.hp != null ? o.src : null;
    for (const b of this.buffs) {
      if (b.reflect && src) { const r = Math.round(dmg * b.reflect / 100); src.hp -= r; this.O.num(src.x, src.H + 0.3, src.y, r, '#c49a5a'); if (src.hp <= 0) this.kill(src); }
      if (b.thorns && src && !BOSSY.has(src.role)) src.st.freeze = 1.5;
    }
    if (o.st) this.heroSt(o.st);
    if (h.hp <= 0) this.die();
    return dmg;
  }
  heroSt(st) {
    const h = this.h; if (h.stoneShield > 0 && (st === 'stun' || st === 'knock')) return;
    if (st === 'poison') h.st.poison = 4; else if (st === 'chill' || st === 'slow') h.st.slow = 2; else if (st === 'stun') { h.st.stun = 0.8; } else if (st === 'burn') h.st.burn = 3;
  }
  heal(n, quiet) { const h = this.h; const before = h.hp; h.hp = Math.min(this.hs.hp, h.hp + n); if (!quiet && h.hp - before >= 1) this.O.num(h.x, 2.2, h.y, '+' + Math.round(h.hp - before), '#7dff8a'); }
  healPct(k) { this.heal(this.hs.hp * k); }
  die() {
    const h = this.h, s = this.s;
    if (this.allies.some((a) => a.revive && !a.used)) { const a = this.allies.find((x) => x.revive && !x.used); a.used = 1; h.hp = this.hs.hp * 0.4; this.fx.pillar(h.x, h.y, 'fire', 6, 1, 1); this.ui.toast('🔥 불사조의 힘으로 되살아났어요!'); h.inv = 2; return; }
    h.dead = true; sfx('dead');
    if (this.exam) {
      const npc = this.exam.npc;
      this.later(0.6, () => { h.dead = false; for (const m of this.mons) { m.alive = false; this.ents.remove(m.model.root); } this.mons = []; this.eshots.forEach((p) => this.ents.remove(p.mesh)); this.eshots = []; this.boss = null; this.bossFight = false; this.ui.boss(null); h.x = npc.x; h.y = npc.y + 1.5; this.endExam(false); });
      return;
    }
    const lost = Math.round(s.gold * 0.1); s.gold -= lost;
    this.later(0.8, () => this.say([['sys', `쓰러졌어요… 마지막으로 들른 마을에서 깨어나요. (골드 -${lost})`]], () => {
      h.dead = false; this.buffs = []; h.st = {}; this.hs = R.heroStats(s, []); h.hp = this.hs.hp; h.mp = this.hs.mp;
      this.enter(s.lastTown, { warp: 1 });
    }));
  }

  // ───────────── 블링크 ─────────────
  blink() {
    const h = this.h, s = this.s;
    if (h.dead || h.st.stun > 0) return;
    const sk = R.skillOf(s, 'blink');
    const cd = this.cds.blink || 0;
    const b2 = this.buffs.some((b) => b.blink2);
    if (cd > 0 && !(b2 && h.blinkCharges > 0)) return;
    if (h.mp < sk.mp) { this.ui.toast('마나가 모자라요'); sfx('nope'); return; }
    if (this.cell(h.x, h.y) === ICE) { this.ui.toast('얼음 위에서는 발이 미끄러워 블링크를 못 써요!'); sfx('nope'); return; }
    let dx = h.dir.x, dy = h.dir.y; const ax = this.input.axis(); if (ax.x || ax.y) { dx = ax.x; dy = ax.y; }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const land = blinkLand(this.A, h.x, h.y, dx, dy, sk.dist);
    // 동적 막힘(기둥·바위)·벽 끝에서 한 걸음 물러서기
    let tx = land.x, ty = land.y;
    for (let k = 0; k < 12 && !this.walk(tx, ty); k++) { tx -= dx * 0.25; ty -= dy * 0.25; }
    if (D(tx, ty, h.x, h.y) < 0.4) { sfx('nope'); return; }
    h.mp -= sk.mp;
    if (cd > 0 && b2) h.blinkCharges--; else { this.cds.blink = sk.cd * (1 - (this.hs.blinkCd || 0) / 100) * (1 - this.hs.cdr / 200); h.blinkCharges = b2 ? 1 : 0; }
    const c = ['#ffffff', '#c8a0ff', '#8ad8ff'];
    this.fx.burst(h.x, 0.9, h.y, 26, c, { speed: 2, up: 1.5, grav: 0, size: 0.35, r: 0.6, ry: 1.6 });
    this.fx.beam(h.x, 0.9, h.y, tx, 0.9, ty, 'arcane', 0.12, 0.2);
    h.x = tx; h.y = ty; h.blinkT = 0.18; h.inv = Math.max(h.inv, 0.35); h.slide = null; h.kx = h.ky = 0;
    this.fx.burst(tx, 0.9, ty, 26, c, { speed: 2.5, up: 1.5, grav: 0, size: 0.35, r: 0.6, ry: 1.6 }); this.fx.ring(tx, ty, 1.4, '#c8a0ff', { dur: 0.3 });
    sfx('blink');
    s.flags.blinks = (s.flags.blinks || 0) + 1;
  }

  // ───────────── 공격 · 스킬 ─────────────
  canFight() { return !this.A.safe || !!this.exam; }
  basic() {
    const h = this.h; if (h.atkCd > 0 || h.dead || h.st.stun > 0) return;
    if (!this.canFight()) return;
    h.atkCd = R.BASIC_CD * (1 - this.hs.cdr / 200);
    const a = this.aim(9), el = this.hs.staffEl || 'arcane';
    this.shot({ x: h.x, y: h.y, ang: a.ang, speed: 16, el, power: R.BASIC_POWER, basic: true, look: 'basic', range: 9, big: 0.65 });
    h.model.cast(); sfx('shoot', el); h.face = a.ang;
    if (this.pet && this.pet.act && this.pet.act.kind === 'shoot' && this.pet.cd <= 0) { this.pet.cd = this.pet.act.every; this.shot({ x: this.pet.x, y: this.pet.y, ang: ang(this.pet.x, this.pet.y, a.tx, a.ty), speed: 14, el: 'fire', power: this.pet.act.power * (1 + (this.pet.lv - 1) * 0.2), look: 'fireball', range: 9, big: 0.6, pet: 1 }); }
  }
  useSlot(i) {
    const s = this.s, id = s.slots[i];
    if (!id) { this.ui.toast(`스킬 칸 ${i + 1}이 비어 있어요. 스킬 창(${this.key('skills')})에서 넣어요.`); return; }
    this.useSkill(id);
  }
  useSkill(id) {
    const s = this.s, h = this.h;
    if (h.dead || h.st.stun > 0) return;
    if (id === 'blink') return this.blink();
    if (!this.canFight()) { this.ui.toast('마을 안에서는 마법을 쓸 수 없어요'); return; }
    const sk = R.skillOf(s, id);
    if ((this.cds[id] || 0) > 0) return;
    if (h.mp < sk.mp) { this.ui.toast('마나가 모자라요'); sfx('nope'); return; }
    h.mp -= sk.mp;
    this.cds[id] = sk.cd * (1 - this.hs.cdr / 100);
    // 물 · 흙 특성
    if (s.elements.includes('water')) { if (this.lastSkill && this.lastSkill !== id) this.flow = Math.min(5, (this.flow || 0) + 1); else if (this.lastSkill === id) this.flow = 0; }
    this.lastSkill = id;
    if (sk.el === 'earth' && s.elements.includes('earth')) h.stoneShield = Math.min(3, h.stoneShield + 1);
    h.face = this.aim(10).ang;
    cast(this, sk);
  }
  usePotion(kind) {
    const s = this.s, id = R.quickPotion(s, kind);
    if (!id) { this.ui.toast(kind === 'hp' ? '체력 물약이 없어요' : '마나 물약이 없어요'); sfx('nope'); return; }
    if ((this.cds['pot_' + kind] || 0) > 0) return;
    s.cons[id]--; this.cds['pot_' + kind] = 1.2;
    const c = CONSUMABLES[id];
    if (kind === 'hp') this.heal(c.val); else { this.h.mp = Math.min(this.hs.mp, this.h.mp + c.val); this.O.num(this.h.x, 2.2, this.h.y, '+' + c.val, '#7ab8ff'); }
    sfx('potion');
  }
  addBuff(b) { this.buffs = this.buffs.filter((x) => x.id !== b.id); this.buffs.push({ ...b, max: b.t }); }

  // 투사체
  shot(o) {
    const m = projMesh(o.el, o.look, o.big || 1);
    m.position.set(o.x, 0.9, o.y); this.ents.add(m);
    this.shots.push({ ...o, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, life: (o.range || 10) / o.speed, mesh: m, hit: new Set(), sx: o.x, sy: o.y });
  }
  eshot(src, a, o = {}) {
    const el = o.el || src.def.proj || 'enemy', sp = o.speed || 9;
    const m = projMesh(el === 'arrow' ? 'enemy' : el in EL3 ? el : 'enemy', o.look || (src.def.proj === 'arrow' ? 'arrow' : el === 'enemy' ? null : el === 'fire' ? 'fireball' : null), o.big || 0.9);
    m.position.set(src.x, 1, src.y); m.userData.dir(Math.cos(a)); this.ents.add(m);
    this.eshots.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (o.range || 12) / sp, mesh: m, atk: o.atk ?? src.ms.atk, mult: o.mult ?? 0.8, src, st: o.st || (src.def.onHit), el, r: o.r || 0.45, home: o.home });
  }
  addZone(z) {
    const g = new THREE.Group(); g.position.set(z.x, 0.06, z.y);
    const c = EL3[z.el] || EL3.arcane;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: z.healZone ? '#8aff9a' : c[2], transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({ color: c[1], transparent: true, opacity: 0.8, depthWrite: false }));
    disc.rotation.x = ring.rotation.x = -Math.PI / 2; g.add(disc, ring); g.scale.setScalar(z.r);
    this.ents.add(g);
    this.zones.push({ tick: 0.5, acc: 0, t: 0, ...z, g, disc, ring, c, r0: z.r });
  }
  addWave(w) { this.waves.push({ ...w, t: 0, dur: 0.9, hit: new Set() }); }
  addOrbs(sk) {
    if (this.orbs) for (const o of this.orbs.list) this.ents.remove(o);
    const list = [];
    for (let i = 0; i < sk.n; i++) { const m = projMesh('light', null, sk.big ? 1.5 : 1.1); this.ents.add(m); list.push(m); }
    this.orbs = { sk, t: sk.dur, list, a: 0, hitT: new Map() };
  }
  summon(sk) {
    const n = sk.count || 1, h = this.h;
    this.allies = this.allies.filter((a) => { if (a.kind === sk.ally) { this.ents.remove(a.model.root); return false; } return true; });
    for (let i = 0; i < n; i++) {
      const model = sk.ally === 'phoenix' ? makeCreature({ t: 'flyer', kind: 'wisp', c: '#ff8a3a', scale: 1.3 }) : sk.ally === 'waterSpirit' ? makeCreature({ t: 'flyer', kind: 'wisp', c: '#5ab8ff', scale: 1.1 }) : sk.ally === 'flower' ? makeCreature({ t: 'mushroom', c: '#e05aa0', scale: sk.big ? 1.8 : 1.2 }) : makeCreature({ t: 'golem', c: '#9a8a6a', rune: '#ffd080', scale: sk.big ? 1.25 : n > 1 ? 0.6 : 0.9 });
      const a = (i / n) * Math.PI * 2;
      const al = { kind: sk.ally, sk, model, x: h.x + Math.cos(a) * 1.5, y: h.y + Math.sin(a) * 1.5, t: sk.dur, cd: 0.5, rate: sk.rate || 1, revive: sk.revive, healer: sk.healer, ht: 2 };
      model.root.position.set(al.x, 0, al.y); this.ents.add(model.root); this.allies.push(al);
      this.fx.burst(al.x, 0.5, al.y, 24, EL3[sk.el], { speed: 2, up: 3 });
    }
  }
  timeStop(sk) {
    this.stopT = sk.dur; this.stopSk = sk;
    for (const m of this.mons) if (m.alive && D(m.x, m.y, this.h.x, this.h.y) < 14) { m.stopped = sk.dur * (BOSSY.has(m.role) ? 0.5 : 1); m.stored = 0; }
    this.fx.ring(this.h.x, this.h.y, 14, '#f0d080', { dur: 0.8, from: 0 }); this.fx.flash(this.h.x, 2, this.h.y, '#fff0c0', 20, 0.4);
    this.V.tint = 1;
  }

  // ───────────── 한 프레임 ─────────────
  update(dt) {
    if (!this.s || !this.A) return;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.35; }
    dt = Math.min(dt, 0.05);
    const h = this.h, s = this.s;
    if (this.paused || this.ui.blocking()) { this.animate(0, dt); return; }
    this.t += dt; s.time += dt;
    this.hs = R.heroStats(s, this.buffs);
    // 입력
    const I = this.input;
    if (I.pressed('talk')) this.interact();
    if (I.pressed('blink')) this.blink();
    if (I.down('attack')) this.basic();
    for (let i = 0; i < R.SLOT_COUNT; i++) if (I.pressed('slot' + i)) this.useSlot(i);
    if (I.pressed('hp')) this.usePotion('hp');
    if (I.pressed('mp')) this.usePotion('mp');
    // 재사용 시간
    const windMove = h.moving && s.elements.includes('wind');
    for (const k of Object.keys(this.cds)) { const sk = R.SKILLS[k]; const rate = windMove && sk && sk.el === 'wind' ? 1.5 : 1; this.cds[k] = Math.max(0, this.cds[k] - dt * rate); }
    h.atkCd -= dt; h.inv -= dt; h.blinkT -= dt;
    for (const b of this.buffs) b.t -= dt; this.buffs = this.buffs.filter((b) => b.t > 0);
    // 회복
    if (!h.dead) {
      h.hp = Math.min(this.hs.hp, h.hp + this.hs.regen * dt * (this.bossFight ? 0.5 : 1) * (this.A.safe ? 6 : 1));
      h.mp = Math.min(this.hs.mp, h.mp + this.hs.mpRegen * dt * (this.A.safe ? 6 : 1));
      if (h.st.poison > 0) { h.st.poison -= dt; h.hp -= this.hs.hp * 0.012 * dt; }
      if (h.st.burn > 0) { h.st.burn -= dt; h.hp -= this.hs.hp * 0.015 * dt; }
      if (h.hp <= 0 && !h.dead) this.die();
    }
    for (const k of ['slow', 'stun']) if (h.st[k] > 0) h.st[k] -= dt;
    this.moveHero(dt);
    this.updateMons(dt);
    this.updateShots(dt);
    this.updateZones(dt);
    this.updateAllies(dt);
    this.updatePet(dt);
    this.updatePuzzles(dt);
    this.updateDrops(dt);
    this.updateEscort(dt);
    this.updateDefend(dt);
    if (this.stopT > 0) { this.stopT -= dt; if (this.stopT <= 0) this.endStop(); }
    // 타이머
    const now = this.timers; this.timers = [];
    for (const tm of now) { if (tm.reg !== this.regionToken) continue; tm.t -= dt; if (tm.t <= 0) tm.fn(); else this.timers.push(tm); }
    this.maybeBoss();
    if (this.boss && this.A.arena && D(h.x, h.y, this.A.arena.x, this.A.arena.y) > 22 && !this.exam) this.leaveBoss();
    this.checkExits();
    this.saveT += dt; if (this.saveT > 12) { this.saveT = 0; this.save(); }
    this.animate(dt, dt);
  }
  leaveBoss() {
    const m = this.boss; this.boss = null; this.bossFight = false; this.ui.boss(null);
    for (const o of this.mons.slice()) if (o === m || o.parent === m || o.minion) { o.alive = false; this.removeMon(o); }
    music.play(this.reg.music); this.ui.toast('보스에게서 멀어졌어요. 다시 다가가면 처음부터 싸워요.');
  }
  endStop() {
    for (const m of this.mons) if (m.stopped) { const st = m.stored || 0; m.stopped = 0; if (this.stopSk.store && st > 0 && m.alive) { m.hp -= st; this.O.num(m.x, m.H + 0.6, m.y, Math.round(st) + '!!', '#f0d080', true); this.fx.explode(m.x, m.y, 1.6, 'time'); if (m.hp <= 0) this.kill(m); } }
    this.V.tint = 0;
  }
  moveHero(dt) {
    const h = this.h, I = this.input, A = this.A;
    if (h.dead) return;
    const ax = I.axis();
    const k = this.cell(h.x, h.y);
    let spd = 4.6 * this.hs.speed / 100 * (h.st.slow > 0 ? 0.6 : 1);
    h.moving = false;
    if (h.st.stun > 0) return;
    // 얼음: 한 번 미끄러지면 막힐 때까지
    if (k === ICE) {
      if (!h.slide && (ax.x || ax.y)) { h.slide = Math.abs(ax.x) >= Math.abs(ax.y) ? { x: Math.sign(ax.x), y: 0 } : { x: 0, y: Math.sign(ax.y) }; h.x = Math.floor(h.x) + 0.5; h.y = Math.floor(h.y) + 0.5; }
      if (h.slide) {
        const sp = 8 * dt; h.dir = { ...h.slide };
        const nx = h.x + h.slide.x * sp, ny = h.y + h.slide.y * sp;
        if (this.walk(nx + h.slide.x * 0.25, ny + h.slide.y * 0.25, 0.2)) { h.x = nx; h.y = ny; h.moving = true; }
        else { h.x = Math.floor(h.x) + 0.5; h.y = Math.floor(h.y) + 0.5; h.slide = null; }
      }
      return;
    }
    h.slide = null;
    if (ax.x || ax.y) {
      h.dir = { x: ax.x, y: ax.y }; h.moving = true;
      this.move(h, ax.x * spd * dt, ax.y * spd * dt, 0.26);
    }
    // 바람길: 서쪽으로 밀어냄
    if (k === WIND) { const push = 6.5 * dt; this.move(h, -push, 0, 0.26); }
    if (h.kx || h.ky) { this.move(h, h.kx * dt, h.ky * dt, 0.26); h.kx *= 0.85; h.ky *= 0.85; if (Math.abs(h.kx) + Math.abs(h.ky) < 0.3) h.kx = h.ky = 0; }
    // 바위 밀기
    for (const p of Object.values(this.puz)) if (p.P.type === 'boulder' && !p.solved && !p.moving && h.moving) {
      const dx = Math.abs(ax.x) > 0.7 ? Math.sign(ax.x) : 0, dy = Math.abs(ax.y) > 0.7 && !dx ? Math.sign(ax.y) : 0;
      if (!dx && !dy) continue;
      const fx = h.x + dx * 0.55, fy = h.y + dy * 0.55;
      if (Math.floor(fx) === p.bx && Math.floor(fy) === p.by) {
        p.push = (p.push || 0) + dt;
        if (p.push > 0.18) { p.push = 0; this.pushBoulder(p, dx, dy); }
      }
    }
  }
  pushBoulder(p, dx, dy) {
    const A = this.A, nx = p.bx + dx, ny = p.by + dy;
    const k = tileAt(A, nx, ny);
    if (!isWalkTile(k) || A.solid[ny * A.w + nx]) { sfx('nope'); return; }
    A.solid[p.by * A.w + p.bx] = 0; p.bx = nx; p.by = ny; A.solid[ny * A.w + nx] = 1; p.moving = 0.2; sfx('click');
    if (nx === p.P.sw.x && ny === p.P.sw.y) { p.swTop.material.map = canvasTex(PZ.swOn()); this.solve(p.P.id); }
  }
  resetBoulder(p) {
    const A = this.A; A.solid[p.by * A.w + p.bx] = 0; p.bx = p.P.start.x; p.by = p.P.start.y; A.solid[p.by * A.w + p.bx] = 1; p.ax = p.bx; p.ay = p.by; sfx('puzzle'); this.ui.toast('바위가 처음 자리로 돌아갔어요');
    this.fx.burst(p.bx + 0.5, 0.5, p.by + 0.5, 20, EL3.arcane, { speed: 2 });
  }
  updatePuzzles(dt) {
    const h = this.h;
    for (const p of Object.values(this.puz)) {
      if (p.P.type === 'plates' && !p.solved) {
        p.P.plates.forEach((pl, i) => {
          if (D(h.x, h.y, pl.x + 0.5, pl.y + 0.5) < 0.75 || this.allies.some((a) => a.kind === 'golem' && D(a.x, a.y, pl.x + 0.5, pl.y + 0.5) < 0.8)) { if (p.lit[i] <= 0) sfx('click'); p.lit[i] = p.P.time; }
          else p.lit[i] = Math.max(0, p.lit[i] - dt);
          p.meshes[i].material.map = canvasTex(p.lit[i] > 0 ? PZ.plateOn() : PZ.plateOff());
        });
        if (p.lit.every((v) => v > 0)) this.solve(p.P.id);
      }
      if (p.P.type === 'boulder') {
        if (p.moving > 0) p.moving -= dt;
        p.ax += (p.bx - p.ax) * Math.min(1, dt * 14); p.ay += (p.by - p.ay) * Math.min(1, dt * 14);
        p.mesh.position.set(p.ax + 0.5, 0, p.ay + 0.9);
      }
      if (p.P.type === 'ice' && !p.solved && h.x > p.P.x1 + 1.2 && this.cell(h.x, h.y) !== ICE) this.solve(p.P.id);
    }
  }
  checkExits() {
    const h = this.h, A = this.A, s = this.s;
    if (this.exam || h.dead) return;
    let to = null, where = null;
    if (h.x < 0.75 && A.exitL && A.exitL.to) { to = A.exitL.to; where = 'end'; }
    else if (h.x > A.w - 0.75 && A.exitR && A.exitR.to) { to = A.exitR.to; where = 'entry'; }
    if (!to) return;
    if (!R.regionOpen(s, to)) { h.x = clamp(h.x, 1.2, A.w - 1.2); this.ui.toast(`아직은 갈 수 없어요 — ${R.stepText(s)}`); return; }
    if (this.defend || this.escort && where === 'end') { h.x = clamp(h.x, 1.2, A.w - 1.2); this.ui.toast('지금은 자리를 비울 수 없어요!'); return; }
    this.ui.fade(() => this.enter(to, where));
    h.x = clamp(h.x, 1, A.w - 1);
  }
  warpTo(id) { this.ui.fade(() => this.enter(id, { warp: 1 })); sfx('blink'); }
  recall() { if (!this.s.cons.recall) return; this.s.cons.recall--; this.warpTo(this.s.lastTown); }

  // ───────────── 몬스터 생각 ─────────────
  updateMons(dt) {
    const h = this.h;
    for (const m of this.mons) {
      if (!m.alive) continue;
      m.t += dt;
      const S = m.st;
      if (m.hurtT > 0) { m.hurtT -= dt; if (m.hurtT <= 0) m.model.flash(false); else m.model.flash(true); }
      // 상태 진행 (도트)
      for (const k of ['stun', 'freeze', 'slow', 'corrupt', 'curse', 'blind', 'root', 'poison']) if (S[k] > 0) S[k] -= dt;
      if (S.burn && S.burn.t > 0) { S.burn.t -= dt; if (S.burn.n) this.dot(m, 0.05 * S.burn.n, 'fire', dt); }
      if (S.chill && S.chill.t > 0) { S.chill.t -= dt; if (S.chill.t <= 0) S.chill.n = 0; }
      if (S.corrupt > 0) this.dot(m, 0.12, 'dark', dt);
      if (S.poison > 0) this.dot(m, 0.12 * (S.poisonX || 1), 'wood', dt);
      if (S.seed > 0) { S.seed -= dt; if (S.seed <= 0) this.bloom(m); }
      if (!m.alive) continue;
      if (m.stopped > 0) { m.stopped -= dt; this.place(m, 0); continue; }
      if (m.kT > 0) { m.kT -= dt; const hit = this.move(m, m.kx * dt, m.ky * dt, m.rad * 0.7); if (hit && m.kWind) { const w = m.kWind; m.kWind = null; m.st.stun = 1.2; this.hit(m, w.power * 0.3, w.el, { sk: null }); this.O.num(m.x, m.H + 1, m.y, '쾅!', '#a0f0d0'); this.fx.burst(m.x, 0.6, m.y, 12, EL3.wind, { speed: 3 }); } }
      const busy = S.stun > 0 || S.freeze > 0;
      const slowK = S.slow > 0 ? (S.heavy ? 0.15 : 0.5) : 1;
      const chillK = S.chill && S.chill.n ? 1 - 0.15 * S.chill.n : 1;
      m.spdK = busy ? 0 : slowK * chillK * (S.root > 0 ? 0 : 1);
      if (m.script) { if (!busy) m.script.update(this, m, dt); else if (m.busyFx !== 1) {} this.place(m, dt); continue; }
      if (busy) { this.place(m, dt); continue; }
      this.ai(m, dt);
      this.place(m, dt);
    }
    // 적 투사체
    for (const p of this.eshots) {
      if (this.stopT > 0 && D(p.x, p.y, h.x, h.y) < 14) continue;
      if (p.home) { const a = ang(p.x, p.y, h.x, h.y), sp = Math.hypot(p.vx, p.vy); const cur = Math.atan2(p.vy, p.vx); let da = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const na = cur + clamp(da, -p.home * dt, p.home * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      p.mesh.position.set(p.x, 1, p.y); p.mesh.userData.tick(this.t);
      if (Math.random() < 0.5) this.fx.trail(p.x, 1, p.y, p.el === 'arrow' ? ['#8a6a3a'] : (EL3[p.el] || EL3.enemy), 0.3);
      if (this.wallAt(p.x, p.y)) p.life = 0;
      if (this.orbs && this.orbs.sk.blockShots) for (const o of this.orbs.list) if (D(p.x, p.y, o.position.x, o.position.z) < 0.6) { p.life = 0; sfx('block'); }
      if (p.life > 0 && D(p.x, p.y, h.x, h.y) < p.r + 0.25) { p.life = 0; this.hurtHero(p.atk, p.mult, { src: p.src, st: p.st }); this.fx.burst(p.x, 1, p.y, 8, EL3[p.el] || EL3.enemy, { speed: 2 }); }
      if (p.life > 0 && this.escort && D(p.x, p.y, this.escort.n.x, this.escort.n.y) < 0.6) { p.life = 0; this.hurtNpc(this.escort.n, p.atk * p.mult); }
    }
    for (const p of this.eshots) if (p.life <= 0) this.ents.remove(p.mesh);
    this.eshots = this.eshots.filter((p) => p.life > 0);
  }
  dot(m, k, el, dt) { m.dotAcc = (m.dotAcc || 0) + this.hs.matk * k * dt; if (m.dotAcc >= 1) { const d = Math.floor(m.dotAcc); m.dotAcc -= d; m.hp -= d; m.dotShow = (m.dotShow || 0) + d; if (m.t - (m.dotT || 0) > 0.8) { m.dotT = m.t; this.O.num(m.x, m.H + 0.2, m.y, m.dotShow, EL_HEX[el] || '#fff'); m.dotShow = 0; } if (m.hp <= 0 && !m.cart) this.kill(m); } }
  bloom(m) {
    this.fx.explode(m.x, m.y, 2.2, 'wood'); for (let i = 0; i < 5; i++) this.fx.spike(m.x + Math.cos(i * 1.26) * 1, m.y + Math.sin(i * 1.26) * 1, 'wood', 0.8);
    const hits = this.strike({ c: [m.x, m.y, 2.2] }, m.seedPow || 0.9, 'wood', { st: 'root' });
    this.healPct(0.02); sfx('boom', 'wood');
  }
  hurtNpc(n, dmg) { n.hp -= dmg; this.O.num(n.x, 2, n.y, Math.round(dmg), '#ff9a9a'); if (n.hp <= 0 && !n.down) { n.down = 1; this.ui.toast('오토가 쓰러졌어요… 하리로 돌아가 다시 데려와요.'); this.ents.remove(n.model.root); this.npcs = this.npcs.filter((x) => x !== n); this.escort = null; } }
  place(m, dt) {
    m.model.root.position.set(m.x, 0, m.y);
    m.model.face(m.face);
    const moving = m.movedT > 0; m.movedT = (m.movedT || 0) - dt;
    if (m.atkPose > 0) m.atkPose -= dt;
    m.model.update(dt * (m.spdK === 0 && !m.stopped ? 0 : 1) * (m.stopped > 0 ? 0 : 1), m.t, { moving, lift: m.lift || 0, flying: m.flying });
    if (m.st.freeze > 0 && !m.iceMesh) { m.iceMesh = sprite(PZ.ice(), { blend: 1, scale: Math.max(0.8, m.rad * 2.4) }); m.iceMesh.position.z = 0.05; m.model.root.add(m.iceMesh); }
    if (!(m.st.freeze > 0) && m.iceMesh) { m.model.root.remove(m.iceMesh); m.iceMesh = null; }
  }
  // 한 걸음
  step(m, tx, ty, dt, k = 1) {
    const a = ang(m.x, m.y, tx, ty), sp = 2.6 * m.spd * (m.spdK ?? 1) * k * dt;
    if (sp <= 0) return;
    let hit = this.move(m, Math.cos(a) * sp, Math.sin(a) * sp, m.rad * 0.7);
    if (hit) { const side = a + (m.side || (m.side = Math.random() < 0.5 ? 1 : -1)) * 1.2; this.move(m, Math.cos(side) * sp, Math.sin(side) * sp, m.rad * 0.7); }
    m.face = a; m.movedT = 0.1;
  }
  // 적이 노리는 대상: 주인공 · 호위 대상 · 수레
  foe(m) {
    const h = this.h;
    let t = { x: h.x, y: h.y, hero: true }, d = D(m.x, m.y, h.x, h.y);
    if (this.escort) { const n = this.escort.n, dn = D(m.x, m.y, n.x, n.y); if (dn < d * 0.8) { t = { x: n.x, y: n.y, npc: n }; d = dn; } }
    if (m.goCart && m.goCart.alive) { const c = m.goCart, dc = D(m.x, m.y, c.x, c.y); if (dc < d + 2) { t = { x: c.x, y: c.y, cart: c }; d = dc; } }
    t.d = d; return t;
  }
  strikeFoe(m, t, atk, mult, o = {}) {
    if (t.hero) return this.hurtHero(atk, mult, { src: m, st: o.st || m.def.onHit });
    if (t.npc) return this.hurtNpc(t.npc, atk * mult * 0.6);
    if (t.cart) { t.cart.hp -= atk * mult * 0.5; this.O.num(t.cart.x, 1.4, t.cart.y, Math.round(atk * mult * 0.5), '#ff9a9a'); if (t.cart.hp <= 0) { t.cart.alive = false; this.removeMon(t.cart); } }
  }
  ai(m, dt) {
    if (m.ai === 'none') return;
    const t = this.foe(m), d = t.d;
    const aggroR = m.goCart ? 99 : 8;
    if (!m.aggro && d < aggroR) m.aggro = true;
    if (m.aggro && d > 16 && !m.goCart) m.aggro = false;
    m.cd -= dt;
    const blind = m.st.blind > 0, atk = m.ms.atk;
    if (!m.aggro) { // 어슬렁
      if (!m.wander || m.t > m.wander.t) m.wander = { x: m.hx + (Math.random() - 0.5) * 5, y: m.hy + (Math.random() - 0.5) * 4, t: m.t + 2 + Math.random() * 3 };
      if (D(m.x, m.y, m.wander.x, m.wander.y) > 0.4) this.step(m, m.wander.x, m.wander.y, dt, 0.4);
      return;
    }
    if (m.state === 'wind') { // 공격 준비
      m.wt -= dt; m.face = m.wa;
      if (m.wt <= 0) { m.state = 'idle'; m.atkPose = 0.3; m.wfn(); }
      return;
    }
    if (m.state === 'dash') {
      m.dt -= dt; const sp = 11 * dt;
      const hit = this.move(m, Math.cos(m.wa) * sp, Math.sin(m.wa) * sp, m.rad * 0.7); m.movedT = 0.1;
      const tt = this.foe(m);
      if (!m.dashHit && tt.d < m.rad + 0.4) { m.dashHit = 1; this.strikeFoe(m, tt, atk, 1.1); }
      if (m.dt <= 0 || hit) { m.state = 'idle'; m.cd = 1.4 + Math.random(); }
      return;
    }
    const melee = (range, mult, telegraph) => {
      if (d > range || m.cd > 0 || blind) return false;
      const a = ang(m.x, m.y, t.x, t.y);
      m.state = 'wind'; m.wa = a; m.wt = telegraph; m.cd = 1.3 + Math.random() * 0.6;
      this.fx.warn({ kind: 'cone', x: m.x, y: m.y, ang: a, r: range + 0.5, arc: 1.4, dur: telegraph });
      m.wfn = () => { const tt = this.foe(m); if (this.inShape({ cone: [m.x, m.y, a, range + 0.5, 1.4] }, tt.x, tt.y, 0.25)) this.strikeFoe(m, tt, atk, mult); };
      return true;
    };
    switch (m.ai) {
      case 'melee': if (!melee(1.2 + m.rad, 1, 0.5)) if (d > 1.1 + m.rad) this.step(m, t.x, t.y, dt); else m.face = ang(m.x, m.y, t.x, t.y); break;
      case 'hopper': {
        if (!m.hop) m.hop = { t: 0.6 + Math.random() };
        m.hop.t -= dt;
        if (m.hop.t <= 0) { m.hop.t = 1.1 + Math.random() * 0.6; m.hopping = 0.4; m.ha = ang(m.x, m.y, t.x, t.y); }
        if (m.hopping > 0) { m.hopping -= dt; this.move(m, Math.cos(m.ha) * 3.4 * m.spdK * dt, Math.sin(m.ha) * 3.4 * m.spdK * dt, m.rad * 0.7); m.movedT = 0.1; m.face = m.ha; m.lift = Math.sin((0.4 - m.hopping) / 0.4 * Math.PI) * 0.5; } else m.lift = 0;
        if (d < m.rad + 0.4 && m.cd <= 0 && !blind) { m.cd = 1.2; this.strikeFoe(m, t, atk, 0.8); }
        if (m.def.proj && m.cd <= 0 && d < 6 && !blind) { m.cd = 2.4; this.eshot(m, ang(m.x, m.y, t.x, t.y), { el: 'wood', mult: 0.7 }); }
        break;
      }
      case 'ranged': case 'caster': {
        const want = m.ai === 'caster' ? 5.5 : 6;
        if (d > want + 1) this.step(m, t.x, t.y, dt); else if (d < want - 2) { const a = ang(t.x, t.y, m.x, m.y); this.step(m, m.x + Math.cos(a) * 2, m.y + Math.sin(a) * 2, dt, 0.8); }
        else m.face = ang(m.x, m.y, t.x, t.y);
        if (m.cd <= 0 && d < 10 && !blind) {
          const a = ang(m.x, m.y, t.x, t.y);
          if (m.ai === 'caster' && Math.random() < 0.4) { // 바닥 마법
            m.cd = 2.6 + Math.random(); const tx = t.x, ty = t.y;
            this.fx.warn({ kind: 'circle', x: tx, y: ty, r: 1.4, dur: 1 });
            this.later(1, () => { if (!m.alive) return; this.fx.explode(tx, ty, 1.4, m.def.proj === 'arcane' ? 'arcane' : m.def.proj || 'dark'); const tt = this.foe(m); if (D(tt.x, tt.y, tx, ty) < 1.6) this.strikeFoe(m, tt, atk, 1.1); });
          } else {
            m.cd = 1.8 + Math.random() * 0.8;
            m.state = 'wind'; m.wa = a; m.wt = 0.35; m.wfn = () => this.eshot(m, ang(m.x, m.y, this.foe(m).x, this.foe(m).y), { speed: m.def.proj === 'arrow' ? 12 : 8 });
          }
        }
        break;
      }
      case 'charger': {
        if (d < 6 && d > 2 && m.cd <= 0 && !blind) {
          const a = ang(m.x, m.y, t.x, t.y);
          m.state = 'wind'; m.wa = a; m.wt = 0.6; m.cd = 2.5;
          this.fx.warn({ kind: 'line', x: m.x, y: m.y, ang: a, len: 6.5, w: m.rad * 2 + 0.4, dur: 0.6 });
          m.wfn = () => { m.state = 'dash'; m.dt = 0.55; m.dashHit = 0; };
        } else if (!melee(1 + m.rad, 0.9, 0.45)) { if (d > 1 + m.rad) this.step(m, t.x, t.y, dt, 1.1); }
        break;
      }
    }
  }
  // 보스·몬스터용 공격 도구 (bosses.js에서 씀)
  telegraph(o) {
    const w = this.fx.warn(o);
    this.later(o.dur, () => {
      if (o.src && !o.src.alive) return;
      const h = this.h;
      const sh = o.kind === 'circle' ? { c: [o.x, o.y, o.r] } : o.kind === 'line' ? { line: [o.x, o.y, o.ang, o.len, o.w] } : { cone: [o.x, o.y, o.ang, o.r, o.arc] };
      if (!o.noFx) {
        if (o.kind === 'circle') this.fx.explode(o.x, o.y, o.r, o.el || 'enemy', o.r > 3);
        else if (o.kind === 'line') { this.fx.beam(o.x, 0.6, o.y, o.x + Math.cos(o.ang) * o.len, 0.6, o.y + Math.sin(o.ang) * o.len, o.el || 'enemy', o.w * 0.35, 0.3); }
        else { for (let i = 0; i < 40; i++) { const a = o.ang + (Math.random() - 0.5) * o.arc, dd = Math.random() * o.r; this.fx.burst(o.x + Math.cos(a) * dd, 0.5, o.y + Math.sin(a) * dd, 1, EL3[o.el || 'enemy'], { speed: 1, up: 2, size: 0.5 }); } }
        sfx(o.r > 3 || o.len > 8 ? 'bigboom' : 'boom', o.el);
        if (o.shake !== 0) this.shake(o.shake || 0.15);
      }
      if (this.inShape(sh, h.x, h.y, 0.2)) this.hurtHero(o.atk ?? o.src.ms.atk, o.mult || 1, { src: o.src, st: o.st });
      if (this.escort && this.inShape(sh, this.escort.n.x, this.escort.n.y, 0.2)) this.hurtNpc(this.escort.n, (o.atk ?? o.src.ms.atk) * (o.mult || 1) * 0.5);
      o.then && o.then();
    });
    sfx('warn');
    return w;
  }

  // ───────────── 투사체 · 장판 ─────────────
  updateShots(dt) {
    for (const p of this.shots) {
      if (p.homing) { const t = this.nearest(p.x, p.y, 6, true, p.hit); if (t) { const a = ang(p.x, p.y, t.x, t.y), sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let da = ((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const na = cur + clamp(da, -6 * dt, 6 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; } }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      p.mesh.position.set(p.x, 0.9, p.y); p.mesh.userData.tick(this.t); p.mesh.userData.dir(p.vx);
      const cols = p.mesh.userData.colors || EL3.arcane;
      this.fx.trail(p.x, 0.9, p.y, cols, p.basic ? 0.25 : 0.38, p.basic ? 0.2 : 0.35);
      if (this.hitTargetsAt(p.x, p.y, 0.3, p.el)) { this.shotEnd(p, true); continue; }
      if (this.wallAt(p.x, p.y)) { this.shotEnd(p, true); continue; }
      for (const m of this.mons) {
        if (!m.alive || m.untarget || m.friendlyObj || p.hit.has(m) || p.life <= 0) continue;
        if (m.flying && !m.flyHit) continue;
        if (D(p.x, p.y, m.x, m.y) < m.rad + 0.25) {
          p.hit.add(m);
          this.hit(m, p.power, p.el, { sk: p.sk, castId: p.castId, basic: p.basic, from: [p.sx, p.sy], knock: p.sk && p.sk.st === 'knock' ? 2.5 : 0 });
          if (p.split) for (const d of [-0.5, 0, 0.5]) this.shot({ ...p, x: p.x, y: p.y, ang: Math.atan2(p.vy, p.vx) + d, split: 0, power: p.power * 0.5, range: 4, big: 0.6, hit: undefined, sk: p.sk });
          if (p.bounce > 0) { const n = this.nearest(m.x, m.y, 5, true, p.hit); if (n) { const a = ang(m.x, m.y, n.x, n.y), sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.bounce--; p.life = 0.6; continue; } }
          if (!p.pierce) { this.shotEnd(p, false); break; }
        }
      }
      if (p.life <= 0 && !p.ended) {
        if (p.boomerang && !p.back) { p.back = 1; p.life = (p.range || 10) / Math.hypot(p.vx, p.vy); p.vx = -p.vx; p.vy = -p.vy; p.hit.clear(); }
        else this.shotEnd(p, false);
      }
    }
    for (const p of this.shots) if (p.ended) this.ents.remove(p.mesh);
    this.shots = this.shots.filter((p) => !p.ended);
    // 큰 물결
    for (const w of this.waves) {
      w.t += dt; const k = Math.min(1, w.t / w.dur), d = k * w.len;
      const cx = w.x + Math.cos(w.ang) * d, cy = w.y + Math.sin(w.ang) * d, pa = w.ang + Math.PI / 2;
      for (let i = 0; i < 6; i++) { const s2 = (Math.random() - 0.5) * w.w; this.fx.burst(cx + Math.cos(pa) * s2, 0.4, cy + Math.sin(pa) * s2, 1, EL3.water, { speed: 0.5, up: 4, grav: -9, size: 0.7, life: 0.5 }); }
      for (const m of this.mons) if (m.alive && !w.hit.has(m) && this.inShape({ line: [w.x, w.y, w.ang, d, w.w] }, m.x, m.y, m.rad)) { w.hit.add(m); this.hit(m, w.power, w.el, { sk: w.sk, castId: w.castId, from: [w.x, w.y], knock: 4 }); if (w.lifePer) this.healPct(w.lifePer); }
    }
    this.waves = this.waves.filter((w) => w.t < w.dur);
    // 도는 구슬
    if (this.orbs) {
      const o = this.orbs; o.t -= dt; o.a += dt * 3.2;
      o.list.forEach((mm, i) => { const a = o.a + (i / o.list.length) * Math.PI * 2; mm.position.set(this.h.x + Math.cos(a) * 1.7, 1, this.h.y + Math.sin(a) * 1.7); this.fx.trail(mm.position.x, 1, mm.position.z, EL3.light, 0.3, 0.25);
        for (const m of this.mons) if (m.alive && !m.friendlyObj && D(mm.position.x, mm.position.z, m.x, m.y) < m.rad + 0.35 && (o.hitT.get(m) || 0) < this.t) { o.hitT.set(m, this.t + 0.5); this.hit(m, o.sk.power, 'light', { sk: o.sk }); }
        this.hitTargetsAt(mm.position.x, mm.position.z, 0.2, 'light');
      });
      if (o.t <= 0) { for (const mm of o.list) this.ents.remove(mm); this.orbs = null; }
    }
  }
  shotEnd(p, wall) {
    if (p.ended) return; p.ended = true;
    const c = p.mesh.userData.colors || EL3.arcane;
    if (p.boom) { this.strike({ c: [p.x, p.y, p.boom] }, p.power * 0.6, p.el, { sk: p.sk, castId: p.castId, from: [p.x, p.y] }); this.fx.explode(p.x, p.y, p.boom, p.el, p.boom > 2); sfx('boom', p.el); this.shake(0.08); }
    else this.fx.burst(p.x, 0.9, p.y, p.basic ? 6 : 12, c, { speed: 2, up: 1, size: 0.3 });
  }
  updateZones(dt) {
    const h = this.h;
    for (const z of this.zones) {
      z.t += dt;
      if (z.follow) { z.x = h.x; z.y = h.y; }
      if (z.move) { const nx = z.x + z.move.vx * dt, ny = z.y + z.move.vy * dt; if (!this.wallAt(nx, ny)) { z.x = nx; z.y = ny; } }
      if (z.grow) z.r = z.r0 * (1 + z.t / z.dur * 0.8);
      z.g.position.set(z.x, 0.06, z.y); z.g.scale.setScalar(z.r); z.ring.rotation.z += dt;
      z.disc.material.opacity = 0.22 + Math.sin(this.t * 5) * 0.06;
      if (Math.random() < 0.8) { const a = Math.random() * 6.28, r = Math.random() * z.r; this.fx.burst(z.x + Math.cos(a) * r, 0.1, z.y + Math.sin(a) * r, 1, z.healZone ? EL3.heal : z.c, { speed: 0.2, up: 1.8, grav: 0.6, size: 0.4, life: 0.8 }); }
      if (z.pull) for (const m of this.mons) if (m.alive && !BOSSY.has(m.role) && m.ai !== 'none' && D(m.x, m.y, z.x, z.y) < z.r + 1) { const a = ang(m.x, m.y, z.x, z.y); this.move(m, Math.cos(a) * z.pull * dt, Math.sin(a) * z.pull * dt, m.rad * 0.7); }
      z.acc += dt;
      if (z.acc >= z.tick) {
        z.acc -= z.tick;
        if (z.healZone && D(h.x, h.y, z.x, z.y) < z.r) { this.heal(this.hs.hp * z.healZone, true); }
        if (z.mpZone && D(h.x, h.y, z.x, z.y) < z.r) h.mp = Math.min(this.hs.mp, h.mp + this.hs.mp * z.mpZone);
        if (z.power > 0 && !z.storm) this.strike({ c: [z.x, z.y, z.r] }, z.power, z.el, { sk: z.sk, castId: z.castId, st: z.sk.st && z.sk.st !== 'knock' ? z.sk.st : null });
        if (z.storm) for (let i = 0; i < 2; i++) { const t = z.focus ? (this.boss && D(this.boss.x, this.boss.y, z.x, z.y) < z.r ? this.boss : this.nearest(z.x, z.y, z.r)) : this.randomMon(z.x, z.y, z.r); if (t) { this.fx.bolt(zig([t.x, 8, t.y - 1], [t.x, 0.2, t.y], 7), '#fffbe0', 0.25); this.hit(t, z.power, 'wind', { sk: z.sk, castId: z.castId, st: 'stun' }); sfx('zap'); } }
        if (z.heavySlow) for (const m of this.mons) if (m.alive && D(m.x, m.y, z.x, z.y) < z.r) { m.st.slow = 0.6; m.st.heavy = 1; }
      }
      if (z.t >= z.dur) {
        if (z.endBoom) { this.strike({ c: [z.x, z.y, z.endBoom] }, z.endPower || 2, z.el, { sk: z.sk, castId: z.castId }); this.fx.explode(z.x, z.y, z.endBoom, z.el, true); sfx('bigboom', z.el); this.shake(0.3); }
        this.ents.remove(z.g);
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.dur);
  }
  randomMon(x, y, r) { const l = this.mons.filter((m) => m.alive && !m.friendlyObj && !m.untarget && D(m.x, m.y, x, y) < r); return l[Math.floor(Math.random() * l.length)] || null; }
  updateAllies(dt) {
    const h = this.h;
    for (const a of this.allies) {
      a.t -= dt; a.cd -= dt;
      const sk = a.sk;
      if (a.kind === 'flower') {
        if (a.cd <= 0) { const t = this.nearest(a.x, a.y, 2.8); if (t) { a.cd = 1; this.hit(t, sk.power, 'wood', { sk, st: 'poison' }); this.fx.spike(t.x, t.y, 'wood', 0.8); } }
      } else if (a.kind === 'golem') {
        const t = this.nearest(a.x, a.y, 9);
        if (t && D(a.x, a.y, t.x, t.y) > 1.4) { const an = ang(a.x, a.y, t.x, t.y); this.move(a, Math.cos(an) * 3 * dt, Math.sin(an) * 3 * dt, 0.3); a.face = an; a.moving = 1; }
        else if (!t && D(a.x, a.y, h.x, h.y) > 2.5) { const an = ang(a.x, a.y, h.x, h.y); this.move(a, Math.cos(an) * 3.6 * dt, Math.sin(an) * 3.6 * dt, 0.3); a.face = an; a.moving = 1; } else a.moving = 0;
        if (t && a.cd <= 0 && D(a.x, a.y, t.x, t.y) < 1.8) { a.cd = 1.2; a.atk = 0.3; this.strike({ c: [t.x, t.y, 1.5] }, sk.power, 'earth', { sk, from: [a.x, a.y] }); this.fx.explode(t.x, t.y, 1.5, 'earth'); }
      } else { // 날아다니는 친구: 내 곁을 돌며 쏨
        const i = this.allies.indexOf(a), an = this.t * 1.2 + i * 2.1;
        const tx = h.x + Math.cos(an) * 1.6, ty = h.y + Math.sin(an) * 1.6;
        a.x += (tx - a.x) * Math.min(1, dt * 4); a.y += (ty - a.y) * Math.min(1, dt * 4);
        if (a.cd <= 0) { const t = this.nearest(a.x, a.y, 9); if (t) { a.cd = 1.3 / a.rate; this.shot({ x: a.x, y: a.y, ang: ang(a.x, a.y, t.x, t.y), speed: 15, el: sk.el, power: sk.power, sk, look: a.kind === 'phoenix' ? 'fireball' : 'waterball', range: 10, big: 0.8, ally: 1 }); } }
        if (a.healer) { a.ht -= dt; if (a.ht <= 0) { a.ht = 2; this.healPct(0.03); } }
      }
      a.model.root.position.set(a.x, 0, a.y); if (a.face != null) a.model.face(a.face);
      a.model.update(dt, this.t, { moving: !!a.moving, flying: a.kind === 'phoenix' || a.kind === 'waterSpirit' }); if (a.atk > 0) a.atk -= dt;
      if (a.t <= 0) { this.ents.remove(a.model.root); this.fx.burst(a.x, 0.6, a.y, 16, EL3[sk.el], { speed: 2 }); }
    }
    this.allies = this.allies.filter((a) => a.t > 0);
  }
  updatePet(dt) {
    const p = this.pet; if (!p) return;
    const h = this.h, d = D(p.x, p.y, h.x, h.y);
    p.cd -= dt;
    let moving = false;
    if (d > 1.6) { const a = ang(p.x, p.y, h.x, h.y), sp = Math.min(d * 3, 8) * dt; p.x += Math.cos(a) * sp; p.y += Math.sin(a) * sp; p.face = a; moving = true; }
    if (d > 12) { p.x = h.x - 0.8; p.y = h.y; }
    const act = p.act;
    if (act && this.canFight()) {
      if (act.kind === 'aura') for (const m of this.mons) if (m.alive && D(m.x, m.y, h.x, h.y) < act.r && !BOSSY.has(m.role)) m.st.slow = Math.max(m.st.slow || 0, 0.3);
      if (act.kind === 'shield' && p.cd <= 0) { p.cd = act.every; h.barrier = Math.max(h.barrier, this.hs.hp * act.amount * (1 + (p.lv - 1) * 0.25)); this.fx.ring(h.x, h.y, 1, '#c8b090', { dur: 0.4 }); }
      if (act.kind === 'breath' && p.cd <= 0) { const t = this.nearest(p.x, p.y, 6); if (t) { p.cd = act.every; const a = ang(p.x, p.y, t.x, t.y); this.strike({ cone: [p.x, p.y, a, 5, 0.8] }, act.power * (1 + (p.lv - 1) * 0.2), 'fire', {}); for (let i = 0; i < 40; i++) { const aa = a + (Math.random() - 0.5) * 0.8; this.fx.burst(p.x, 0.6, p.y, 1, EL3.fire, { speed: 0, vx: Math.cos(aa) * 9, vz: Math.sin(aa) * 9, up: 0.5, grav: 0, life: 0.5, size: 0.5 }); } sfx('boom', 'fire'); } }
    }
    // 줍기
    const mag = 1 + (this.hs.pickup || 0) * 2.5;
    for (const dr of this.drops) if (!dr.got && D(dr.x, dr.y, p.x, p.y) < mag * 0.8) { const a = ang(dr.x, dr.y, h.x, h.y); dr.x += Math.cos(a) * 6 * dt; dr.y += Math.sin(a) * 6 * dt; }
    p.model.root.position.set(p.x, 0, p.y); if (p.face != null) p.model.face(p.face);
    p.model.update(dt, this.t, { moving, flying: p.p.model === 'owl' || p.p.model === 'bird' || p.p.model === 'wisp' });
  }
  updateDrops(dt) {
    const h = this.h, mag = 1.1 + (this.hs.pickup || 0) * 2.5;
    for (const d of this.drops) {
      d.t += dt; d.g.position.set(d.x, 0, d.y); d.s.position.y = Math.abs(Math.sin(d.t * 3)) * 0.2;
      const dd = D(d.x, d.y, h.x, h.y);
      if (dd < mag && d.t > 0.35) { const a = ang(d.x, d.y, h.x, h.y); d.x += Math.cos(a) * 9 * dt; d.y += Math.sin(a) * 9 * dt; }
      if (dd < 0.5 && d.t > 0.35) { d.got = true; this.pickUp(d); this.ents.remove(d.g); }
      if (d.t > 90) { d.got = true; this.ents.remove(d.g); }
    }
    this.drops = this.drops.filter((d) => !d.got);
  }
  updateEscort(dt) {
    const e = this.escort; if (!e) return;
    const n = e.n, h = this.h, d = D(n.x, n.y, h.x, h.y);
    let moving = false;
    if (d > 1.8) { const a = ang(n.x, n.y, h.x, h.y), sp = Math.min(3.8, d * 1.5) * dt; this.move(n, Math.cos(a) * sp, Math.sin(a) * sp, 0.26); n.face = a; moving = true; }
    n.model.root.position.set(n.x, 0, n.y); if (moving) n.model.face(n.face); n.moving = moving;
    if (n.x >= e.goal) { this.escort = null; n.escort = false; this.completeStep(); }
  }

  // ───────────── 그리기 ─────────────
  animate(dt, rdt) {
    const h = this.h;
    if (!h || !h.model) return;
    const m = h.model;
    m.root.position.set(h.x, 0, h.y);
    m.face(h.moving ? Math.atan2(h.dir.y, h.dir.x) : (h.face != null && h.atkCd > -0.3 ? h.face : Math.atan2(h.dir.y, h.dir.x)));
    m.root.visible = !(h.blinkT > 0);
    if (h.hurtT > 0) { h.hurtT -= rdt; if (h.hurtT <= 0) m.flash(false); }
    m.update(rdt, this.t, { moving: h.moving && !h.slide });
    this.fx.pmat.uniforms.scale.value = this.V.unit();
    if (m.aura) { m.aura.rotation.y += rdt; m.aura.material.opacity = 0.4 + Math.sin(this.t * 4) * 0.2; if (Math.random() < 0.3) this.fx.burst(h.x + (Math.random() - 0.5) * 0.6, 0.1, h.y + (Math.random() - 0.5) * 0.6, 1, [m.auraCol], { speed: 0.1, up: 1.5, grav: 0.5, size: 0.25, life: 0.8 }); }
    for (const n of this.npcs) { n.model.update(rdt, this.t, { moving: !!n.moving }); }
    this.mv.update(rdt, this.t, { x: h.x, z: h.y });
    this.fx.update(rdt);
    this.V.follow(h.x, h.y, rdt, this.A);
  }
  overlayItems() {
    const out = [], s = this.s, st = R.curStep(s);
    for (const m of this.mons) {
      if (!m.alive || m === this.boss) continue;
      if (m.hp < m.max || m.cart || m.role === 'object') out.push({ x: m.x, h: m.H + 0.45 + (m.flying ? 2.2 : 0), z: m.y, bar: m.hp / m.max, w: m.role === 'object' ? 46 : 36, color: m.cart ? '#7ad070' : m.role === 'object' ? '#ffb040' : '#e8453c', lv: m.role === 'normal' ? 'Lv' + m.lv : '', st: stIcons(m) });
    }
    for (const n of this.npcs) {
      const quest = st && st.npc === n.id && st.region === this.A.id;
      out.push({ x: n.x, h: 2.25, z: n.y, label: n.name, color: quest ? '#ffd23f' : '#ffffff', mark: quest ? '!' : null });
      if (n.escort || n.max) out.push({ x: n.x, h: 2.05, z: n.y, bar: n.hp / n.max, w: 40, color: '#7ad070' });
    }
    if (this.A.warp) out.push({ x: this.A.warp.x, h: 3, z: this.A.warp.y, label: '순간 이동 비석', color: '#8ad8ff' });
    for (const f of this.A.finds) if (!s.found[f.id] && D(f.x, f.y, this.h.x, this.h.y) < 6) out.push({ x: f.x, h: 2.1, z: f.y, mark: '✦', mcolor: '#fff6a0' });
    if (this.defend) out.push({ x: this.defend.cart.x, h: 2, z: this.defend.cart.y, label: '광석 수레', color: '#ffe0a0' });
    else if (st && st.type === 'defend' && this.A.defend && st.region === this.A.id) out.push({ x: this.A.defend.x, h: 1.6, z: this.A.defend.y, mark: '!', label: '수레 지키기' });
    return out;
  }
}
function stIcons(m) {
  const S = m.st, o = [];
  if (S.burn && S.burn.n) o.push('🔥' + S.burn.n); if (S.freeze > 0) o.push('🧊'); else if (S.chill && S.chill.n) o.push('❄' + S.chill.n);
  if (S.stun > 0) o.push('💫'); if (S.corrupt > 0) o.push('🌑'); if (S.seed > 0) o.push('🌱'); if (S.poison > 0) o.push('☠'); if (S.root > 0) o.push('🌿'); if (S.curse > 0) o.push('👁');
  return o.join('');
}

// ── 퍼즐·떨어진 것 그림 (픽셀, 한 번만 그림) ──
const PZC = new Map();
const once = (k, f) => () => { if (!PZC.has(k)) PZC.set(k, f()); return PZC.get(k); };
const OL = [24, 16, 24, 255];
const plate = (on) => { const p = new Pix(16, 16); p.disc(8, 8, 7, [90, 90, 104]); p.disc(8, 8, 5, on ? [110, 230, 255] : [60, 64, 80]); if (on) p.disc(7, 7, 2, [230, 255, 255]); p.outline(OL); return p.toCanvas(); };
const PZ = {
  plateOn: once('pOn', () => plate(true)), plateOff: once('pOff', () => plate(false)),
  swOn: once('sOn', () => { const p = new Pix(16, 16); p.rect(1, 1, 14, 14, [90, 90, 104]); p.rect(3, 3, 12, 12, [255, 210, 70]); p.outline(OL); return p.toCanvas(); }),
  swOff: once('sOff', () => { const p = new Pix(16, 16); p.rect(1, 1, 14, 14, [90, 90, 104]); p.rect(3, 3, 12, 12, [120, 100, 50]); p.rect(6, 6, 9, 9, [255, 210, 70]); p.outline(OL); return p.toCanvas(); }),
  boulder: once('bld', () => trim(crop('rocks', 35, 19, 26, 27))),
  resetStone: once('rst', () => { const p = new Pix(12, 22); p.rect(3, 6, 8, 21, [120, 120, 136]); p.rect(4, 7, 5, 20, [150, 150, 166]); p.poly([[6, 0], [9, 3], [6, 6], [3, 3]], [255, 210, 70]); p.outline(OL); return p.toCanvas(); }),
  coin: once('coin', () => { const p = new Pix(8, 8); p.disc(4, 4, 3, [255, 210, 60]); p.point(3, 3, [255, 250, 200]); p.line(4, 2, 4, 5, [200, 150, 30]); p.outline(OL); return p.toCanvas(); }),
  gem: (id) => once('gem' + id, () => { const c = id === 'stone' ? [80, 140, 255] : id === 'crystal' ? [200, 120, 255] : [130, 210, 100]; const p = new Pix(10, 10); p.poly([[5, 0], [9, 4], [5, 9], [1, 4]], c); p.poly([[5, 1], [6, 4], [5, 7], [3, 4]], [255, 255, 255, 160]); p.outline(OL); return p.toCanvas(); })(),
  potion: (col) => once('pot' + col, () => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16)); const p = new Pix(8, 11); p.rect(3, 0, 4, 2, [180, 160, 130]); p.disc(4, 7, 3, [r, g, b]); p.point(3, 6, [255, 255, 255]); p.outline(OL); return p.toCanvas(); })(),
  chest: once('chest', () => trim(crop('eso', 88, 19, 17, 13))),
  beam: once('beam', () => { const c = cv(8, 40), g = c.getContext('2d'); for (let y = 0; y < 40; y++) { g.fillStyle = `rgba(255,255,255,${(y / 40 * 0.9).toFixed(2)})`; g.fillRect(2, y, 4, 1); g.fillStyle = `rgba(255,255,255,${(y / 40 * 0.4).toFixed(2)})`; g.fillRect(1, y, 1, 1); g.fillRect(6, y, 1, 1); } return c; }),
  ice: once('ice', () => { const p = new Pix(16, 24); p.rect(1, 2, 14, 23, [190, 235, 255, 150]); for (let y = 4; y < 22; y += 5) p.line(3, y, 6, y - 3, [255, 255, 255, 220]); p.outline([60, 120, 170, 255]); return p.toCanvas(); }),
};
