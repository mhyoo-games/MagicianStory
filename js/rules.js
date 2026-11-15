// 규칙 (화면과 상관없는 순수 계산). 숫자를 바꾸면 tests/logic.test.mjs를 맞춘다.
import { SKILLS, ELEMENTS, skillAt, SKILL_MAX_LV, TRAIT_LV } from './data/skills.js';
import { ITEMS, CONSUMABLES, SLOTS, MATERIALS, ENHANCE, enhanceMul, enhanceExtra, enhanceCost, TIER_LV } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { CHAPTERS } from './data/story.js';
import { REGIONS, ORDER, TOWNS } from './data/world.js';
import { PETS, PET_BOXES, PET_MAX_LV, petEff } from './data/pets.js';

export const MAX_LV = 60;
export const SAVE_KEY = 'magicianstory_save_v2';
// 한 브라우저에 저장 칸 3개. 1번 칸은 예전 저장 이름 그대로라 예전 저장이 1번 칸으로 들어온다.
export const SAVE_SLOTS = 3;
export const slotKey = (i) => (i <= 0 ? SAVE_KEY : `${SAVE_KEY}_${i + 1}`);
// 저장 칸에 보일 짧은 설명
export function slotInfo(s) {
  if (!s) return null;
  const r = REGIONS[s.region];
  return { name: s.name, lv: s.lv, ch: s.ch, hero: s.hero, region: r ? r.name : '', at: s.savedAt || 0 };
}
export const RANK_ELEMENTS = [1, 2, 3, 4, 5];
export const SLOT_COUNT = 8;
export const DEFAULT_KEYS = {
  attack: 'KeyZ', blink: 'KeyX', talk: 'Space',
  slot0: 'KeyA', slot1: 'KeyS', slot2: 'KeyD', slot3: 'KeyF', slot4: 'KeyQ', slot5: 'KeyW', slot6: 'KeyE', slot7: 'KeyR',
  hp: 'Digit1', mp: 'Digit2',
  bag: 'KeyI', skills: 'KeyK', stats: 'KeyC', story: 'KeyJ', pets: 'KeyP', map: 'KeyM',
};
export const ACTION_NAME = {
  attack: '기본 공격', blink: '블링크', talk: '말 걸기 · 살펴보기',
  slot0: '스킬 칸 1', slot1: '스킬 칸 2', slot2: '스킬 칸 3', slot3: '스킬 칸 4', slot4: '스킬 칸 5', slot5: '스킬 칸 6', slot6: '스킬 칸 7', slot7: '스킬 칸 8',
  hp: '체력 물약', mp: '마나 물약', bag: '가방', skills: '스킬', stats: '능력치', story: '이야기', pets: '펫', map: '지도',
};
export const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export function expNeed(lv) { return Math.round(24 * Math.pow(lv, 1.8) + 40); }

const ROLE = {
  normal: { hp: 1, atk: 1, exp: 1, gold: 1 },
  mid: { hp: 11, atk: 1.4, exp: 14, gold: 12 },
  boss: { hp: 18, atk: 1.55, exp: 30, gold: 25 },
  exam: { hp: 12, atk: 1.3, exp: 0, gold: 0 },
  object: { hp: 1.6, atk: 0, exp: 0, gold: 0 },
  clone: { hp: 0.5, atk: 0.8, exp: 0, gold: 0 },
};
export function monsterStats(m) {
  const L = m.lv, r = ROLE[m.role] || ROLE.normal, fin = m.final ? 1.35 : 1;
  return {
    hp: Math.round((40 + L * 22 + L * L * 0.4) * r.hp * fin),
    atk: Math.round((6 + L * 3.4) * r.atk),
    def: Math.round(L * 0.8),
    exp: Math.round((12 + L * 7) * (1 + L / 22) * r.exp),
    gold: Math.round((2 + L * 1.6) * r.gold),
    speed: m.slow ? 0.65 : m.ai === 'charger' ? 1.15 : m.ai === 'caster' ? 0.9 : 1,
  };
}

// ── 저장 ──
export function newSave(name, hero) {
  return {
    v: 2, name, hero, lv: 1, exp: 0, gold: 80, statPts: 0, skillPts: 1,
    stats: { int: 4, wis: 4, vit: 4, agi: 4 },
    rank: 0, elements: [], skills: { blink: 1 }, traits: {}, slots: Array(SLOT_COUNT).fill(null),
    keys: { ...DEFAULT_KEYS },
    equip: {}, inv: [], uid: 1, mats: {}, cons: { hp1: 3, mp1: 3 }, quick: { hp: 'hp1', mp: 'mp1' },
    pets: {}, pet: null,
    ch: 1, step: 0, prog: 0, found: {}, solved: {}, beaten: {}, warps: ['t_lumina'], lastTown: 't_lumina',
    region: 't_lumina', pos: null, kills: 0, time: 0, done: false, seenPrologue: false, quiz: 0, flags: {},
  };
}
export function fixSave(s) {
  if (!s || s.v !== 2) return null;
  const d = newSave(s.name || '마법사', s.hero || 'girl');
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const k of Object.keys(DEFAULT_KEYS)) if (!s.keys[k]) s.keys[k] = DEFAULT_KEYS[k];
  s.slots = s.slots.concat(Array(SLOT_COUNT).fill(null)).slice(0, SLOT_COUNT).map((id) => (id && SKILLS[id] ? id : null));
  for (const id of Object.keys(s.skills)) if (!SKILLS[id]) delete s.skills[id];
  s.skills.blink = 1;
  s.inv = s.inv.filter((it) => ITEMS[it.id]);
  for (const sl of Object.keys(s.equip)) if (!s.inv.find((it) => it.uid === s.equip[sl])) delete s.equip[sl];
  if (!REGIONS[s.region]) s.region = 't_lumina';
  return s;
}

export function addItem(s, id, plus = 0) { const it = { uid: s.uid++, id, plus }; s.inv.push(it); return it; }
export function equipped(s, slot) { const uid = s.equip[slot]; return uid ? s.inv.find((x) => x.uid === uid) : null; }
export function itemStats(inst) {
  const it = ITEMS[inst.id], m = enhanceMul(inst.plus || 0), o = {};
  for (const [k, v] of Object.entries(it.st)) o[k] = k === 'crit' || k === 'cdr' || k === 'speed' || k === 'drop' || k === 'gold' || k === 'drain' ? +(v * (1 + (m - 1) * 0.5)).toFixed(1) : Math.round(v * m * 10) / 10;
  for (const [k, v] of Object.entries(enhanceExtra(inst.plus || 0))) o[k] = (o[k] || 0) + v;
  return o;
}

// ── 능력치 ──
export function heroStats(s, buffs = []) {
  const st = s.stats, L = s.lv;
  const o = {
    hp: 60 + L * 9 + st.vit * 7, mp: 30 + L * 2.5 + st.wis * 4,
    matk: 6 + L * 1.3 + st.int * 1.5, def: L * 0.8 + st.vit * 0.6,
    crit: 5 + st.agi * 0.25, speed: 100 + st.agi * 0.3, cdr: 0,
    regen: 0.2 + L * 0.03, mpRegen: 0.6 + st.wis * 0.05 + L * 0.02, drain: 0, gold: 0, exp: 0, drop: 0, dmgTaken: 0, blinkCd: 0,
    elem: {}, allElem: 0, staffEl: 'arcane', shield: 0, pickup: 0,
  };
  for (const e of ELEMENTS) o.elem[e] = 0;
  for (const slot of SLOTS) {
    const inst = equipped(s, slot); if (!inst) continue;
    const it = ITEMS[inst.id];
    for (const [k, v] of Object.entries(itemStats(inst))) {
      if (k === 'elem') { if (slot === 'staff' && it.el && it.el !== 'arcane') o.elem[it.el] += v; else o.allElem += v; }
      else o[k] = (o[k] || 0) + v;
    }
    if (slot === 'staff') o.staffEl = it.el || 'arcane';
  }
  if (s.pet && s.pets[s.pet]) for (const [k, v] of Object.entries(petEff(s.pet, s.pets[s.pet]))) { if (k === 'elemAll') o.allElem += v; else o[k] = (o[k] || 0) + v; }
  const mul = { matk: 0, def: 0, speed: 0 };
  for (const b of buffs) for (const [k, v] of Object.entries(b.st)) { if (k in mul) mul[k] += v; else o[k] = (o[k] || 0) + v; }
  o.matk = Math.round(o.matk * (1 + mul.matk / 100));
  o.def = Math.round(o.def * (1 + mul.def / 100));
  o.speed += mul.speed;
  o.hp = Math.round(o.hp); o.mp = Math.round(o.mp);
  o.crit = Math.min(60, o.crit); o.cdr = Math.min(45, o.cdr);
  return o;
}
export const BASIC_POWER = 0.32;   // 기본 공격은 약하다 (스킬이 주력)
export const BASIC_CD = 0.55;
export const BASIC_MP = 1;          // 기본 공격을 맞히면 마나 1

export function damageToMonster(hs, power, el, m, roll = 0.5, critRoll = 1, mods = {}) {
  const ms = monsterStats(m);
  const bonus = 1 + ((hs.elem[el] || 0) + hs.allElem) / 100;
  let weak = m.weak === el ? 1.5 : m.resist === el ? 0.6 : 1;
  if (el === 'light' && (m.undead || m.weak === 'light')) weak *= 1.3 * (mods.holy || 1);
  const crit = critRoll * 100 < hs.crit;
  const def = ms.def * (mods.defDown ? 1 - mods.defDown : 1);
  const dmg = hs.matk * power * bonus * weak * (100 / (100 + def)) * (0.9 + roll * 0.2) * (crit ? 1.6 : 1) * (mods.mul || 1);
  return { dmg: Math.max(1, Math.round(dmg)), crit, weak: weak > 1, resist: weak < 1 };
}
export function damageToHero(hs, atk, mult = 1, roll = 0.5) {
  return Math.max(1, Math.round(atk * mult * (100 / (100 + hs.def * 1.6)) * (0.9 + roll * 0.2) * (1 + (hs.dmgTaken || 0) / 100)));
}

export function gainExp(s, n) {
  const ups = [];
  if (s.lv >= MAX_LV) return ups;
  s.exp += n;
  while (s.lv < MAX_LV && s.exp >= expNeed(s.lv)) { s.exp -= expNeed(s.lv); s.lv++; s.statPts += 3; s.skillPts += 1; ups.push(s.lv); }
  if (s.lv >= MAX_LV) s.exp = 0;
  return ups;
}

// ── 스킬 ──
export function maxLv(id) { return SKILLS[id].maxLv || SKILL_MAX_LV; }
export function canLearn(s, id) {
  const sk = SKILLS[id]; if (!sk) return { ok: false, why: '없는 스킬' };
  const cur = s.skills[id] || 0;
  if (cur >= maxLv(id)) return { ok: false, why: '최고 레벨' };
  if (sk.el !== 'arcane' && !s.elements.includes(sk.el)) return { ok: false, why: '고르지 않은 원소' };
  if (sk.rank > s.rank) return { ok: false, why: `${['견습', '초급', '중급', '상급', '익스퍼트'][sk.rank]} 마법사부터` };
  if (s.skillPts < 1) return { ok: false, why: '스킬 점수 부족' };
  return { ok: true };
}
export function learn(s, id) {
  const c = canLearn(s, id); if (!c.ok) return c;
  s.skills[id] = (s.skills[id] || 0) + 1; s.skillPts--;
  if (s.skills[id] === 1 && SKILLS[id].kind !== 'blink' && !s.slots.includes(id)) { const i = s.slots.indexOf(null); if (i >= 0) s.slots[i] = id; }
  return { ok: true, needTrait: s.skills[id] === TRAIT_LV && SKILLS[id].traits && s.traits[id] == null };
}
export function chooseTrait(s, id, t) {
  if (!SKILLS[id].traits || (s.skills[id] || 0) < TRAIT_LV || (t !== 0 && t !== 1)) return false;
  s.traits[id] = t; return true;
}
export function skillOf(s, id) { return skillAt(id, s.skills[id] || 1, s.traits[id] ?? null); }
export function chooseElement(s, el) {
  if (!ELEMENTS.includes(el) || s.elements.includes(el) || s.elements.length >= RANK_ELEMENTS[s.rank]) return false;
  s.elements.push(el); return true;
}
export function needsElementChoice(s) { return s.elements.length < RANK_ELEMENTS[s.rank]; }
export function resetPoints(s) {
  let sp = 0; for (const [id, lv] of Object.entries(s.skills)) if (id !== 'blink') sp += lv;
  s.skillPts += sp; s.skills = { blink: 1 }; s.traits = {}; s.slots = Array(SLOT_COUNT).fill(null);
  s.statPts += s.stats.int + s.stats.wis + s.stats.vit + s.stats.agi - 16; s.stats = { int: 4, wis: 4, vit: 4, agi: 4 };
}

// ── 장비 · 상점 ──
export function canEquip(s, id) { return s.lv >= ITEMS[id].lv; }
export function equip(s, uid) {
  const inst = s.inv.find((x) => x.uid === uid); if (!inst || !canEquip(s, inst.id)) return false;
  s.equip[ITEMS[inst.id].slot] = uid; return true;
}
export function sellPrice(inst) { return Math.round(ITEMS[inst.id].price * 0.25 * (1 + (inst.plus || 0) * 0.15)); }
export function sell(s, uid) {
  const i = s.inv.findIndex((x) => x.uid === uid); if (i < 0 || Object.values(s.equip).includes(uid)) return 0;
  const g = sellPrice(s.inv[i]); s.gold += g; s.inv.splice(i, 1); return g;
}
export function buy(s, id) {
  const it = ITEMS[id] || CONSUMABLES[id]; if (!it || s.gold < it.price) return false;
  s.gold -= it.price;
  if (CONSUMABLES[id]) s.cons[id] = (s.cons[id] || 0) + 1; else addItem(s, id);
  return true;
}
export function townTier(regionId) { return REGIONS[regionId] ? REGIONS[regionId].ch : 1; }
export function shopStock(kind, s, regionId) {
  const t = townTier(regionId);
  if (kind === 'potion') return Object.values(CONSUMABLES).filter((c) => (c.kind === 'hp' || c.kind === 'mp') && c.lv <= TIER_LV[t] + 8).map((c) => c.id);
  if (kind === 'general') return ['recall', 'forget', 'protect'];
  const slots = kind === 'staff' ? ['staff'] : ['hat', 'robe', 'shoes'];
  return Object.values(ITEMS).filter((it) => it.src === 'shop' && slots.includes(it.slot) && it.tier <= t && it.tier >= t - 1).map((it) => it.id);
}

// ── 제작 · 강화 ──
export function recipesFor(regionId) { const t = townTier(regionId); return Object.values(ITEMS).filter((it) => it.src === 'craft' && it.tier <= t).map((it) => it.id); }
export function canCraft(s, id) {
  const r = ITEMS[id].recipe; if (!r) return false;
  if (s.gold < r.gold) return false;
  for (const [m, n] of Object.entries(r)) if (m !== 'gold' && n > 0 && (s.mats[m] || 0) < n) return false;
  return true;
}
export function craft(s, id) {
  if (!canCraft(s, id)) return null;
  const r = ITEMS[id].recipe; s.gold -= r.gold;
  for (const [m, n] of Object.entries(r)) if (m !== 'gold' && n > 0) s.mats[m] -= n;
  s.flags.crafted = (s.flags.crafted || 0) + 1;
  return addItem(s, id);
}
// rand: 0~1. 결과: success · fail · down(한 단계 내려감) · broken(부서짐) · protected(보호 주문서가 막음)
export function enhance(s, uid, rand, useProtect = false) {
  const inst = s.inv.find((x) => x.uid === uid); if (!inst) return { ok: false };
  const plus = inst.plus || 0; if (plus >= 20) return { ok: false, why: '최고 강화' };
  const e = ENHANCE[plus + 1], it = ITEMS[inst.id], cost = enhanceCost(it, plus + 1);
  if (s.gold < cost.gold || (s.mats.stone || 0) < cost.stones) return { ok: false, why: '재료 부족' };
  if (useProtect && !(s.cons.protect > 0)) return { ok: false, why: '보호 주문서 없음' };
  s.gold -= cost.gold; s.mats.stone -= cost.stones;
  if (useProtect && e.breakOnFail) s.cons.protect--;
  const r1 = rand(), r2 = rand();
  if (r1 * 100 < e.rate) { inst.plus = plus + 1; s.flags.maxPlus = Math.max(s.flags.maxPlus || 0, inst.plus); return { ok: true, result: 'success', plus: inst.plus }; }
  if (e.breakOnFail && r2 * 100 < e.breakOnFail) {
    if (useProtect) return { ok: true, result: 'protected', plus };
    const i = s.inv.indexOf(inst); s.inv.splice(i, 1);
    for (const [sl, u] of Object.entries(s.equip)) if (u === uid) delete s.equip[sl];
    return { ok: true, result: 'broken', plus };
  }
  if (e.down) { inst.plus = plus - 1; return { ok: true, result: 'down', plus: inst.plus }; }
  return { ok: true, result: 'fail', plus };
}

// ── 펫 ──
export function openBox(s, boxId, rand) {
  const b = PET_BOXES[boxId]; if (!b || s.gold < b.price) return null;
  s.gold -= b.price;
  let r = rand() * 100, rar = 0;
  for (let i = 0; i < b.odds.length; i++) { if (r < b.odds[i]) { rar = i; break; } r -= b.odds[i]; rar = i; }
  const pool = Object.values(PETS).filter((p) => p.rar === rar && p.id !== 'carrot');
  const p = pool[Math.floor(rand() * pool.length)];
  const before = s.pets[p.id] || 0;
  if (before >= PET_MAX_LV) { const refund = Math.round(b.price * 0.3); s.gold += refund; return { id: p.id, rar, dup: true, refund }; }
  s.pets[p.id] = before + 1;
  if (!s.pet) s.pet = p.id;
  return { id: p.id, rar, lv: s.pets[p.id], isNew: before === 0 };
}

// ── 드랍 (rand는 0~1 함수) ──
export function rollDrops(m, rand, s) {
  const ms = monsterStats(m), out = { gold: 0, items: [], mats: {}, cons: [] };
  if (['object', 'clone', 'exam'].includes(m.role)) return out;
  const hs = s ? heroStats(s) : { gold: 0, drop: 0 };
  const dropMul = 1 + (hs.drop || 0) / 100;
  out.gold = Math.round(ms.gold * (0.6 + rand() * 0.8) * (1 + (hs.gold || 0) / 100));
  const t = Math.max(1, Math.min(8, m.ch || 1));
  const addM = (k, n = 1) => { out.mats[k] = (out.mats[k] || 0) + n; };
  const dropItems = Object.values(ITEMS).filter((it) => it.tier === t && it.src === 'drop');
  if (m.role === 'normal') {
    if (rand() < 0.32 * dropMul) addM(`m${t}a`);
    if (rand() < 0.05 * dropMul) addM(`m${t}b`);
    if (rand() < 0.04 * dropMul) addM('stone');
    if (rand() < 0.008 * dropMul) out.items.push(dropItems[Math.floor(rand() * dropItems.length)].id);
    if (rand() < 0.05) out.cons.push(potionFor(m.lv, rand() < 0.5 ? 'hp' : 'mp'));
  } else if (m.role === 'mid') {
    addM(`m${t}a`, 3); addM(`m${t}b`, 2); addM('stone', 2);
    if (rand() < 0.35 * dropMul) out.items.push(dropItems[Math.floor(rand() * dropItems.length)].id);
  } else if (m.role === 'boss') {
    addM(`m${t}a`, 5); addM(`m${t}b`, 3); addM('stone', 4); addM('crystal', 1);
    const own = Object.values(ITEMS).filter((it) => it.bossOf === m.id);
    if (s && !s.beaten[m.id]) out.items.push(own[0].id);
    for (const it of own) if (rand() < 0.18 * dropMul && !out.items.includes(it.id)) out.items.push(it.id);
  }
  return out;
}
export function potionFor(lv, kind) { return kind + (lv >= 45 ? 4 : lv >= 30 ? 3 : lv >= 15 ? 2 : 1); }
export function quickPotion(s, kind) {
  const want = s.quick[kind];
  if (want && s.cons[want] > 0) return want;
  return [4, 3, 2, 1].map((n) => kind + n).find((id) => s.cons[id] > 0) || null;
}

// ── 이야기 진행 ──
export function curStep(s) { const c = CHAPTERS[s.ch]; return c && !s.done ? c.steps[s.step] : null; }
export function allowedIdx(s) {
  if (s.done) return ORDER.length - 1;
  let mx = 0;
  for (let c = 1; c <= s.ch; c++) CHAPTERS[c].steps.forEach((st, i) => { if (c < s.ch || i <= s.step) mx = Math.max(mx, REGIONS[st.region].idx); });
  return mx;
}
export function regionOpen(s, id) { return REGIONS[id] && REGIONS[id].idx <= allowedIdx(s); }
export function onKill(s, monId, regionId) {
  const st = curStep(s); if (!st) return null;
  if (st.type === 'kill' && st.mon === monId && st.region === regionId) { s.prog++; return s.prog >= st.n ? 'stepDone' : 'prog'; }
  if ((st.type === 'mid' || st.type === 'boss' || st.type === 'exam') && st.mon === monId) return 'stepDone';
  return null;
}
export function collectRoll(s, monId, regionId, rand) {
  const st = curStep(s);
  if (!st || st.type !== 'collect' || st.mon !== monId || st.region !== regionId) return null;
  if (rand() < 0.45) { s.prog++; return s.prog >= st.n ? 'stepDone' : 'prog'; }
  return null;
}
export function onFind(s, regionId, findId) {
  if (s.found[findId]) return null;
  s.found[findId] = 1;
  const st = curStep(s);
  if (st && st.type === 'find' && st.region === regionId) {
    const need = [].concat(st.find);
    if (need.includes(findId)) { s.prog = need.filter((f) => s.found[f]).length; return s.prog >= need.length ? 'stepDone' : 'prog'; }
  }
  return 'found';
}
export function onSolve(s, regionId, puzzleId) {
  s.solved[puzzleId] = 1;
  const st = curStep(s);
  if (st && st.type === 'puzzle' && st.region === regionId) return 'stepDone';
  return null;
}
export function stepCount(st) { return st.type === 'find' ? [].concat(st.find).length : st.type === 'defend' ? st.waves : st.type === 'quiz' ? st.questions.length : st.n || 0; }
export function advance(s) {
  const C = CHAPTERS[s.ch], st = C.steps[s.step];
  const reward = stepReward(s.ch, st);
  s.step++; s.prog = 0; s.quiz = 0;
  if (st.type === 'exam') { s.rank = Math.max(s.rank, st.rank); s.skillPts += 2; }
  if (s.step >= C.steps.length) { if (s.ch >= 8) s.done = true; else { s.ch++; s.step = 0; } }
  return reward;
}
export function stepReward(ch, st) {
  const lv = [0, 4, 11, 18, 25, 32, 39, 46, 54][ch];
  const big = st.type === 'boss' || st.type === 'exam' ? 2.2 : st.type === 'mid' ? 1.4 : 0.7;
  return { exp: Math.round(expNeed(lv) * 0.4 * big), gold: Math.round((15 + lv * 8) * big) };
}
export function stepText(s) {
  const st = curStep(s); if (!st) return s.done ? '모든 이야기를 마쳤어요! 자유롭게 모험하세요.' : '';
  const n = stepCount(st);
  return n && st.type !== 'quiz' ? `${st.text} (${s.prog}/${n})` : st.text;
}
export function stepRegion(s) { const st = curStep(s); return st ? st.region : null; }
export function visitTown(s, id) { if (REGIONS[id].kind === 'town') { if (!s.warps.includes(id)) s.warps.push(id); s.lastTown = id; } }
export { SKILLS, ITEMS, CONSUMABLES, MONSTERS, CHAPTERS, ELEMENTS, MATERIALS, REGIONS, ORDER, TOWNS, PETS, PET_BOXES, ENHANCE, skillAt, enhanceMul, enhanceCost };
