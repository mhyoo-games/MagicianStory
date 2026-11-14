// 규칙 (화면과 상관없는 순수 계산). 숫자를 바꾸면 tests/logic.test.mjs를 맞춘다.
import { SKILLS, ELEMENTS, skillAt, SKILL_MAX_LV } from './data/skills.js';
import { ITEMS, CONSUMABLES, SLOTS, TIER_LV } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { CHAPTERS } from './data/story.js';

export const MAX_LV = 60;
export const SAVE_KEY = 'magicianstory_save_v1';
export const RANK_ELEMENTS = [1, 2, 3, 4, 5]; // 계급별로 고를 수 있는 원소 수

export function expNeed(lv) { return Math.round(20 * Math.pow(lv, 1.75) + 30); }

const ROLE = {
  normal: { hp: 1, atk: 1, exp: 1, gold: 1 },
  mid: { hp: 15, atk: 1.35, exp: 14, gold: 10 },
  boss: { hp: 22, atk: 1.5, exp: 30, gold: 22 },
  exam: { hp: 11, atk: 1.25, exp: 0, gold: 0 },
};
export function monsterStats(m) {
  const L = m.lv, r = ROLE[m.role] || ROLE.normal;
  const fin = m.final ? 1.5 : 1;
  return {
    hp: Math.round((26 + L * L * 0.62 + L * 16) * r.hp * fin),
    atk: Math.round((5 + L * 3) * r.atk),
    def: Math.round(L * 1.2),
    exp: Math.round((10 + L * 6) * (1 + L / 25) * r.exp),
    gold: Math.round((3 + L * 2.5) * r.gold),
    speed: m.slow ? 0.6 : m.ai === 'charger' ? 1.15 : m.ai === 'caster' ? 0.85 : 1,
  };
}

// ── 새 저장 ──
export function newSave(name, hero) {
  return {
    v: 1, name, hero, lv: 1, exp: 0, gold: 50, statPts: 0, skillPts: 1,
    stats: { int: 5, wis: 5, vit: 5, agi: 5 },
    rank: 0, elements: [], skills: {}, slots: [null, null, null, null, null, null],
    equip: {}, inv: [], uid: 1, cons: { hp1: 5, mp1: 5, recall: 1 }, quick: { hp: 'hp1', mp: 'mp1' },
    ch: 1, step: 0, prog: 0, area: 'village', pos: null, beaten: {}, flags: {}, kills: 0, time: 0, done: false,
    hasSeenPrologue: false,
  };
}
export function fixSave(s) {
  if (!s || s.v !== 1) return null;
  const d = newSave(s.name || '마법사', s.hero || 'girl');
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.slots = (s.slots || []).concat([null, null, null, null, null, null]).slice(0, 6).map((id) => (id && SKILLS[id] ? id : null));
  for (const id of Object.keys(s.skills)) if (!SKILLS[id]) delete s.skills[id];
  s.inv = s.inv.filter((it) => ITEMS[it.id]);
  for (const sl of Object.keys(s.equip)) if (!s.inv.find((it) => it.uid === s.equip[sl])) delete s.equip[sl];
  return s;
}

export function addItem(s, id) {
  const it = { uid: s.uid++, id };
  s.inv.push(it);
  return it;
}
export function equipped(s, slot) { const uid = s.equip[slot]; return uid ? s.inv.find((x) => x.uid === uid) : null; }

// ── 능력치 ──
export function heroStats(s, buffs = []) {
  const st = s.stats, L = s.lv;
  const o = {
    hp: 80 + L * 18 + st.vit * 12, mp: 40 + L * 6 + st.wis * 8,
    matk: 10 + L * 2 + st.int * 2.2, def: L * 1 + st.vit * 0.8,
    crit: 5 + st.agi * 0.25, speed: 100 + st.agi * 0.3, cdr: 0,
    regen: 0.4 + L * 0.02, mpRegen: 1 + st.wis * 0.08, drain: 0, gold: 0, exp: 0,
    elem: {}, allElem: 0, staffEl: 'arcane', shield: 0,
  };
  for (const e of ELEMENTS) o.elem[e] = 0;
  for (const slot of SLOTS) {
    const inst = equipped(s, slot); if (!inst) continue;
    const it = ITEMS[inst.id];
    for (const [k, v] of Object.entries(it.st)) {
      if (k === 'elem') {
        if (slot === 'staff' && it.el !== 'arcane') o.elem[it.el] += v;
        else if (it.ringEl) o.elem[it.ringEl] += v;
        else o.allElem += v;
      } else o[k] = (o[k] || 0) + v;
    }
    if (slot === 'staff') o.staffEl = it.el;
  }
  // 늘 켜진 스킬
  for (const [id, lv] of Object.entries(s.skills)) {
    const sk = SKILLS[id]; if (sk.kind !== 'passive') continue;
    const p = skillAt(sk, lv).pas;
    for (const [k, v] of Object.entries(p)) {
      if (k === 'elem') o.elem[sk.el] += v; else o[k] = (o[k] || 0) + v;
    }
  }
  // 버프 (%는 곱하기)
  const mul = { matk: 0, def: 0, speed: 0 };
  for (const b of buffs) for (const [k, v] of Object.entries(b.st)) {
    if (k in mul) mul[k] += v; else o[k] = (o[k] || 0) + v;
  }
  o.matk = Math.round(o.matk * (1 + mul.matk / 100));
  o.def = Math.round(o.def * (1 + mul.def / 100));
  o.speed = o.speed + mul.speed;
  o.hp = Math.round(o.hp); o.mp = Math.round(o.mp);
  o.crit = Math.min(60, o.crit); o.cdr = Math.min(50, o.cdr);
  return o;
}

// 몬스터에게 주는 피해
export function damageToMonster(hs, power, el, m, roll = 0.5, critRoll = 1) {
  const ms = monsterStats(m);
  const bonus = 1 + ((hs.elem[el] || 0) + hs.allElem) / 100;
  const weak = m.weak === el ? 1.5 : m.resist === el ? 0.6 : 1;
  const crit = critRoll * 100 < hs.crit;
  const dmg = hs.matk * power * bonus * weak * (100 / (100 + ms.def)) * (0.92 + roll * 0.16) * (crit ? 1.6 : 1);
  return { dmg: Math.max(1, Math.round(dmg)), crit, weak: weak > 1, resist: weak < 1 };
}
export function damageToHero(hs, atk, mult = 1, roll = 0.5) {
  return Math.max(1, Math.round(atk * mult * (100 / (100 + hs.def * 1.5)) * (0.9 + roll * 0.2)));
}

// ── 레벨 ──
export function gainExp(s, n) {
  const ups = [];
  if (s.lv >= MAX_LV) return ups;
  s.exp += n;
  while (s.lv < MAX_LV && s.exp >= expNeed(s.lv)) {
    s.exp -= expNeed(s.lv); s.lv++; s.statPts += 4; s.skillPts += 1; ups.push(s.lv);
  }
  if (s.lv >= MAX_LV) s.exp = 0;
  return ups;
}

// ── 스킬 ──
export function canLearn(s, id) {
  const sk = SKILLS[id]; if (!sk) return { ok: false, why: '없는 스킬' };
  const cur = s.skills[id] || 0;
  if (cur >= (sk.kind === 'dash' && sk.el === 'arcane' ? 1 : SKILL_MAX_LV)) return { ok: false, why: '최고 레벨' };
  if (sk.el !== 'arcane' && !s.elements.includes(sk.el)) return { ok: false, why: '아직 고르지 않은 원소' };
  if (sk.rank > s.rank) return { ok: false, why: `${['견습', '초급', '중급', '상급', '익스퍼트'][sk.rank]} 마법사부터` };
  if (!cur && sk.req && !s.skills[sk.req]) return { ok: false, why: `먼저 「${SKILLS[sk.req].name}」` };
  if (s.skillPts < 1) return { ok: false, why: '스킬 점수 부족' };
  return { ok: true };
}
export function learn(s, id) {
  const c = canLearn(s, id); if (!c.ok) return c;
  s.skills[id] = (s.skills[id] || 0) + 1; s.skillPts--;
  if (s.skills[id] === 1 && SKILLS[id].kind !== 'passive') { const i = s.slots.indexOf(null); if (i >= 0 && !s.slots.includes(id)) s.slots[i] = id; }
  return { ok: true };
}
export function chooseElement(s, el) {
  if (!ELEMENTS.includes(el) || s.elements.includes(el)) return false;
  if (s.elements.length >= RANK_ELEMENTS[s.rank]) return false;
  s.elements.push(el);
  return true;
}
export function needsElementChoice(s) { return s.elements.length < RANK_ELEMENTS[s.rank]; }
export function resetPoints(s) {
  let sp = 0; for (const lv of Object.values(s.skills)) sp += lv;
  s.skillPts += sp; s.skills = {}; s.slots = [null, null, null, null, null, null];
  const spent = s.stats.int + s.stats.wis + s.stats.vit + s.stats.agi - 20;
  s.statPts += spent; s.stats = { int: 5, wis: 5, vit: 5, agi: 5 };
}

// ── 장비 ──
export function canEquip(s, id) {
  const it = ITEMS[id]; if (!it) return false;
  return s.lv >= it.lv;
}
export function equip(s, uid) {
  const inst = s.inv.find((x) => x.uid === uid); if (!inst) return false;
  const it = ITEMS[inst.id]; if (!canEquip(s, inst.id)) return false;
  s.equip[it.slot] = uid; return true;
}
export function sellPrice(id) { const it = ITEMS[id]; return Math.round(it.price * 0.3); }
export function sell(s, uid) {
  const i = s.inv.findIndex((x) => x.uid === uid); if (i < 0) return 0;
  if (Object.values(s.equip).includes(uid)) return 0;
  const g = sellPrice(s.inv[i].id); s.gold += g; s.inv.splice(i, 1); return g;
}
export function buy(s, id) {
  const it = ITEMS[id] || CONSUMABLES[id]; if (!it || s.gold < it.price) return false;
  s.gold -= it.price;
  if (CONSUMABLES[id]) s.cons[id] = (s.cons[id] || 0) + 1; else addItem(s, id);
  return true;
}
export function shopStock(kind, s) {
  const maxTier = Math.min(8, s.ch);
  if (kind === 'potion') return Object.values(CONSUMABLES).filter((c) => (c.kind === 'hp' || c.kind === 'mp') && c.lv <= TIER_LV[maxTier] + 6).map((c) => c.id);
  if (kind === 'general') return Object.values(CONSUMABLES).filter((c) => c.kind === 'recall' || c.kind === 'reset').map((c) => c.id)
    .concat(Object.values(ITEMS).filter((it) => it.src === 'shop' && (it.slot === 'ring' || it.slot === 'amulet') && it.tier <= maxTier).map((it) => it.id));
  const slots = kind === 'staff' ? ['staff'] : ['hat', 'robe', 'shoes'];
  return Object.values(ITEMS).filter((it) => it.src === 'shop' && slots.includes(it.slot) && it.tier <= maxTier && it.tier >= maxTier - 2).map((it) => it.id);
}

// ── 드랍 (rand는 0~1 함수) ──
export function rollDrops(m, rand, s) {
  const ms = monsterStats(m), out = { gold: 0, items: [], cons: [] };
  const goldMul = 1 + (s ? heroStats(s).gold / 100 : 0);
  out.gold = Math.round(ms.gold * (0.7 + rand() * 0.6) * goldMul);
  const tier = Math.max(1, Math.min(8, m.ch || 1));
  const drops = Object.values(ITEMS).filter((it) => it.tier === tier && it.src === 'drop');
  const shopT = Object.values(ITEMS).filter((it) => it.tier === tier && it.src === 'shop');
  if (m.role === 'normal') {
    if (rand() < 0.05) { const pool = rand() < 0.6 ? drops : shopT; out.items.push(pool[Math.floor(rand() * pool.length)].id); }
    if (rand() < 0.09) out.cons.push(rand() < 0.5 ? potionFor(m.lv, 'hp') : potionFor(m.lv, 'mp'));
  } else if (m.role === 'mid') {
    out.items.push(drops[Math.floor(rand() * drops.length)].id);
    if (rand() < 0.5) out.items.push(drops[Math.floor(rand() * drops.length)].id);
    out.cons.push(potionFor(m.lv, 'hp'), potionFor(m.lv, 'mp'));
  } else if (m.role === 'boss') {
    const own = Object.values(ITEMS).filter((it) => it.bossOf === m.id);
    const first = s && !s.beaten[m.id];
    if (first && own.length) out.items.push(own.find((it) => it.rar === 4)?.id || own[0].id);
    for (const it of own) if (rand() < 0.3 && !out.items.includes(it.id)) out.items.push(it.id);
    out.items.push(drops[Math.floor(rand() * drops.length)].id);
    out.cons.push(potionFor(m.lv, 'hp'), potionFor(m.lv, 'hp'), potionFor(m.lv, 'mp'));
  }
  return out;
}
export function potionFor(lv, kind) { return kind + (lv >= 45 ? 4 : lv >= 28 ? 3 : lv >= 12 ? 2 : 1); }

// ── 이야기 진행 ──
export function curStep(s) { const c = CHAPTERS[s.ch]; return c ? c.steps[s.step] : null; }
export function areaOpen(s, areaId) {
  if (areaId === 'village' || areaId === 'tower') return true;
  for (let c = 1; c <= 8; c++) {
    const C = CHAPTERS[c];
    if (C.field.id === areaId) return s.ch >= c;
    if (C.dungeon.id === areaId) {
      if (s.ch > c || s.done) return true;
      if (s.ch < c) return false;
      return C.steps.slice(0, s.step + 1).some((st) => st.area === areaId);
    }
  }
  return false;
}
export function areaInfo(areaId) {
  for (let c = 1; c <= 8; c++) {
    const C = CHAPTERS[c];
    if (C.field.id === areaId) return { ...C.field, ch: c, kind: 'field' };
    if (C.dungeon.id === areaId) return { ...C.dungeon, ch: c, kind: 'dungeon' };
  }
  return null;
}
// 몬스터를 쓰러뜨렸을 때 진행 (퀘스트 물건이 떨어지는지는 collectRoll로)
export function onKill(s, monId, areaId) {
  const st = curStep(s); if (!st) return null;
  if ((st.type === 'kill') && st.mon === monId && (!st.area || st.area === areaId)) { s.prog++; if (s.prog >= st.n) return 'stepDone'; return 'prog'; }
  if ((st.type === 'mid' || st.type === 'boss' || st.type === 'exam') && st.mon === monId) return 'stepDone';
  return null;
}
export function collectRoll(s, monId, areaId, rand) {
  const st = curStep(s);
  if (!st || st.type !== 'collect' || st.mon !== monId || (st.area && st.area !== areaId)) return null;
  if (rand() < 0.5) { s.prog++; return s.prog >= st.n ? 'stepDone' : 'prog'; }
  return null;
}
export function advance(s) {
  const C = CHAPTERS[s.ch];
  const st = C.steps[s.step];
  const reward = stepReward(s.ch, st);
  s.step++; s.prog = 0;
  if (st.type === 'exam') { s.rank = Math.max(s.rank, st.rank); s.skillPts += 3; }
  if (s.step >= C.steps.length) {
    if (s.ch >= 8) s.done = true; else { s.ch++; s.step = 0; }
  }
  return reward;
}
export function stepReward(ch, st) {
  const lv = [0, 4, 11, 18, 25, 32, 39, 46, 54][ch];
  const big = st.type === 'boss' || st.type === 'exam' ? 2.5 : st.type === 'mid' ? 1.5 : 0.8;
  return { exp: Math.round(expNeed(lv) * 0.45 * big), gold: Math.round((20 + lv * 12) * big) };
}
export function stepText(s) {
  const st = curStep(s); if (!st) return s.done ? '모든 이야기를 마쳤어요! 자유롭게 모험하세요.' : '';
  if (st.type === 'kill' || st.type === 'collect') return `${st.text} (${s.prog}/${st.n})`;
  return st.text;
}
export function quickPotion(s, kind) {
  const order = [4, 3, 2, 1].map((n) => kind + n).filter((id) => CONSUMABLES[id].lv <= s.lv + 5);
  const want = s.quick[kind];
  if (want && s.cons[want] > 0) return want;
  return order.find((id) => s.cons[id] > 0) || null;
}
export { SKILLS, ITEMS, CONSUMABLES, MONSTERS, CHAPTERS, ELEMENTS, skillAt };
