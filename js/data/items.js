// 장비 120개 = 8단계 × 13 + 보스 고유 16. 재료 · 제작법 · 강화표 · 소모품.
// src: shop(상점) · craft(대장간에서 제작) · drop(몬스터가 드물게) · boss(보스 고유)
// rar: 0 일반 · 1 고급 · 2 희귀 · 3 영웅 · 4 전설
import { ELEMENTS } from './skills.js';

export const SLOTS = ['staff', 'hat', 'robe', 'shoes', 'ring', 'amulet'];
export const SLOT_NAME = { staff: '지팡이', hat: '모자', robe: '로브', shoes: '신발', ring: '반지', amulet: '목걸이' };
export const SLOT_ICON = { staff: '🪄', hat: '🎩', robe: '👘', shoes: '👢', ring: '💍', amulet: '📿' };
export const RARITY = [
  { name: '일반', color: '#d8d0c0' }, { name: '고급', color: '#7ad070' }, { name: '희귀', color: '#6aa8ff' },
  { name: '영웅', color: '#c080ff' }, { name: '전설', color: '#ffb040' },
];
export const TIER_LV = [0, 1, 8, 15, 22, 29, 36, 43, 50];
const EL_WORD = { fire: '화염', water: '물결', ice: '서리', wind: '질풍', dark: '암흑', light: '광휘', wood: '신록', earth: '대지', time: '시간' };
export const EL_HEX = { fire: '#ff7a2a', water: '#3a9cff', ice: '#9fe6ff', wind: '#6fe0b8', dark: '#9a5ae0', light: '#ffe27a', wood: '#7ccf4a', earth: '#c49a5a', time: '#e8c060', arcane: '#b48cff' };
const WOOD_T = ['', '참나무', '물푸레나무', '은자작나무', '흑단', '월계수', '수정나무', '별빛 은', '용의 뼈'];
const WOOD_C = ['', '#8b5a2b', '#a07846', '#d2d2dc', '#3c2828', '#788c46', '#aad2e6', '#dcdcff', '#f0e6c8'];
const CLOTH_T = ['', '무명', '리넨', '모직', '비단', '마법사 비단', '별실', '달빛 실', '용비늘'];
const METAL_T = ['', '구리', '청동', '은', '백금', '미스릴', '오리하르콘', '별철', '용의 심장'];
const HAT_C = ['', '#46283c', '#3c508c', '#285a3c', '#6e3232', '#3c3c46', '#78468c', '#1e3c5a', '#8c6428'];
const ROBE_C = ['', '#c8423a', '#4650a0', '#648c50', '#783c8c', '#3c788c', '#8c6e46', '#282838', '#962828'];

// 재료: 장마다 흔한 것 1 · 귀한 것 1, 그리고 어디서나 나오는 강화석·마력 결정
export const MATERIALS = {
  m1a: { name: '슬라임 젤리', tier: 1, icon: '🟢' }, m1b: { name: '고블린 송곳니', tier: 1, icon: '🦷' },
  m2a: { name: '늪 이끼', tier: 2, icon: '🌿' }, m2b: { name: '리자드 비늘', tier: 2, icon: '🐊' },
  m3a: { name: '화염석', tier: 3, icon: '🔥' }, m3b: { name: '오크 철괴', tier: 3, icon: '⛓️' },
  m4a: { name: '서리 결정', tier: 4, icon: '❄️' }, m4b: { name: '늑대 은빛 털', tier: 4, icon: '🐺' },
  m5a: { name: '폭풍 깃털', tier: 5, icon: '🪶' }, m5b: { name: '하늘 돌', tier: 5, icon: '🌫️' },
  m6a: { name: '낡은 책장', tier: 6, icon: '📜' }, m6b: { name: '영혼 잉크', tier: 6, icon: '🖋️' },
  m7a: { name: '시간 모래', tier: 7, icon: '⏳' }, m7b: { name: '태엽 톱니', tier: 7, icon: '⚙️' },
  m8a: { name: '용암 비늘', tier: 8, icon: '🐉' }, m8b: { name: '용의 숨결석', tier: 8, icon: '💠' },
  stone: { name: '강화석', tier: 0, icon: '🔷' },
  crystal: { name: '마력 결정', tier: 0, icon: '🔮' },
};

export const ITEMS = {};
let n = 0;
function add(it) {
  it.id = it.id || `it${String(++n).padStart(3, '0')}`;
  it.lv = TIER_LV[it.tier];
  it.price = Math.round((60 + it.tier * it.tier * 90) * [1, 1.7, 2.8, 4.5, 7][it.rar] * ({ staff: 1.3, hat: 0.8, robe: 1, shoes: 0.7, ring: 0.9, amulet: 1 }[it.slot]));
  if (it.src === 'craft') it.recipe = { [`m${it.tier}a`]: 4 + it.tier, [`m${it.tier}b`]: 1 + Math.floor(it.tier / 2), crystal: it.tier >= 5 ? 1 : 0, gold: Math.round(it.price * 0.35) };
  ITEMS[it.id] = it;
}
for (let t = 1; t <= 8; t++) {
  const e1 = ELEMENTS[(t * 2) % 9], e2 = ELEMENTS[(t * 2 + 4) % 9], e3 = ELEMENTS[(t * 5 + 1) % 9];
  const m = 6 + t * 9; // 지팡이 마력 기준
  add({ slot: 'staff', tier: t, rar: 0, src: 'shop', el: 'arcane', name: `${WOOD_T[t]} 지팡이`, st: { matk: m }, look: { orb: EL_HEX.arcane, wood: WOOD_C[t] } });
  add({ slot: 'staff', tier: t, rar: 1, src: 'craft', el: e1, name: `${EL_WORD[e1]}의 ${WOOD_T[t]} 지팡이`, st: { matk: Math.round(m * 1.15), elem: 8 + t * 2 }, look: { orb: EL_HEX[e1], wood: WOOD_C[t] } });
  add({ slot: 'staff', tier: t, rar: 2, src: 'drop', el: e2, name: `${EL_WORD[e2]}의 ${WOOD_T[t]} 마법봉`, st: { matk: Math.round(m * 1.3), elem: 12 + t * 2, crit: 2 + t }, look: { orb: EL_HEX[e2], wood: WOOD_C[t] } });
  add({ slot: 'hat', tier: t, rar: 0, src: 'shop', name: `${CLOTH_T[t]} 고깔모자`, st: { mp: 6 + t * 6, def: 1 + t }, look: { c: HAT_C[t], band: '#e3b341' } });
  add({ slot: 'hat', tier: t, rar: 1, src: 'craft', name: `${EL_WORD[e3]}의 ${CLOTH_T[t]} 마법사 모자`, st: { mp: 10 + t * 8, def: 2 + t, cdr: 2 + Math.floor(t / 2) }, look: { c: HAT_C[(t % 8) + 1], band: EL_HEX[e3] } });
  add({ slot: 'robe', tier: t, rar: 0, src: 'shop', name: `${CLOTH_T[t]} 수련복`, st: { hp: 14 + t * 14, def: 2 + t * 3 }, look: { c: ROBE_C[t], trim: '#f1e6d2' } });
  add({ slot: 'robe', tier: t, rar: 1, src: 'craft', name: `${EL_WORD[e1]}의 ${CLOTH_T[t]} 로브`, st: { hp: 20 + t * 18, def: 3 + t * 4, mpRegen: +(0.2 + t * 0.1).toFixed(1) }, look: { c: ROBE_C[(t % 8) + 1], trim: EL_HEX[e1] } });
  add({ slot: 'shoes', tier: t, rar: 0, src: 'shop', name: `${CLOTH_T[t]} 신발`, st: { speed: 3 + Math.floor(t / 2), def: 1 + t }, look: { c: '#5a3c28' } });
  add({ slot: 'shoes', tier: t, rar: 1, src: 'craft', name: `${CLOTH_T[t]} 여행 장화`, st: { speed: 5 + Math.floor(t / 2), def: 1 + t * 2, hp: t * 8 }, look: { c: '#463246' } });
  add({ slot: 'ring', tier: t, rar: 1, src: 'craft', name: `${METAL_T[t]} 반지`, st: { matk: 1 + t * 2, crit: 1 + Math.floor(t / 2) }, look: { c: EL_HEX[e2] } });
  add({ slot: 'ring', tier: t, rar: 2, src: 'drop', name: `${EL_WORD[e3]}의 ${METAL_T[t]} 인장 반지`, st: { matk: 2 + t * 3, crit: 2 + Math.floor(t / 2), elem: 4 + t }, look: { c: EL_HEX[e3] } });
  add({ slot: 'amulet', tier: t, rar: 1, src: 'craft', name: `${METAL_T[t]} 목걸이`, st: { hp: 10 + t * 12, mp: 6 + t * 6 }, look: { c: EL_HEX[e1] } });
  add({ slot: 'amulet', tier: t, rar: 2, src: 'drop', name: `${EL_WORD[e2]}의 ${METAL_T[t]} 부적`, st: { hp: 12 + t * 14, mp: 8 + t * 8, regen: +(0.2 + t * 0.15).toFixed(1), drop: 3 + t } , look: { c: EL_HEX[e2] } });
}
// 보스 고유 (보스마다 둘: 처음 쓰러뜨리면 하나는 꼭)
const UNIQUE = [
  ['goblin_chief', 1, 'staff', '족장의 뼈 몽둥이 지팡이', { matk: 22, crit: 6, gold: 10 }, { orb: '#e0c060', wood: '#e8dcc0' }, 'earth'],
  ['goblin_chief', 1, 'amulet', '고블린 왕관 조각', { hp: 40, mp: 20, drop: 10 }, { c: '#e0b030' }],
  ['morga', 2, 'hat', '늪 마녀의 고깔', { mp: 50, elem: 12, cdr: 6 }, { c: '#203020', band: '#90c060' }],
  ['morga', 2, 'ring', '독안개 반지', { matk: 14, crit: 5, drain: 2 }, { c: '#90c060' }],
  ['bolg', 3, 'robe', '대족장의 가죽 갑옷', { hp: 140, def: 30, regen: 1 }, { c: '#5a3228', trim: '#c85028' }],
  ['bolg', 3, 'staff', '용의 피 몽둥이', { matk: 55, elem: 16, crit: 5 }, { orb: '#d02020', wood: '#5a2a1a' }, 'fire'],
  ['ceres', 4, 'hat', '빙결 여왕의 왕관 모자', { mp: 90, elem: 18, crit: 6 }, { c: '#b4dcf5', band: '#ffffff', gem: '#78c8ff' }],
  ['ceres', 4, 'amulet', '녹지 않는 눈꽃', { hp: 120, mp: 60, regen: 2 }, { c: '#c8f0ff' }],
  ['kai', 5, 'robe', '바람 집행자의 외투', { hp: 220, def: 40, speed: 10, cdr: 8 }, { c: '#2a4a4a', trim: '#a0f0d0' }],
  ['kai', 5, 'staff', '폭풍을 부르는 지팡이', { matk: 100, elem: 22, crit: 8 }, { orb: '#a0f0d0', wood: '#2a4a4a' }, 'wind'],
  ['nekros', 6, 'hat', '리치의 검은 관', { mp: 150, elem: 24, drain: 3 }, { c: '#3a2050', band: '#e0c060', gem: '#80ff80' }],
  ['nekros', 6, 'ring', '영혼 사슬 반지', { matk: 40, crit: 10, drain: 4 }, { c: '#80ff80' }],
  ['baltar', 7, 'robe', '시간술사의 법의', { hp: 380, def: 60, cdr: 14, mpRegen: 1.5 }, { c: '#2a1030', trim: '#e0c060' }],
  ['baltar', 7, 'amulet', '멈춘 모래시계', { hp: 260, mp: 140, cdr: 8 }, { c: '#e0c060' }],
  ['azdaha', 8, 'staff', '용살자의 지팡이', { matk: 190, elem: 35, crit: 12 }, { orb: '#ffcf40', wood: '#f0e6c8' }, 'fire'],
  ['azdaha', 8, 'hat', '용살자의 모자', { mp: 220, elem: 30, crit: 10, cdr: 10 }, { c: '#962838', band: '#ffc85a', gem: '#fff078' }],
];
for (const [boss, t, slot, name, st, look, el] of UNIQUE) add({ slot, tier: t, rar: 4, src: 'boss', bossOf: boss, name, st, look, el: el || (slot === 'staff' ? 'arcane' : undefined) });

// 강화: +1 ~ +20. 12강부터 실패하면 부서질 수 있다.
export const ENHANCE = [null];
{
  const rate = [100, 95, 90, 85, 80, 72, 65, 58, 50, 44, 38, 30, 26, 22, 18, 14, 10, 7, 4, 2];
  const brk = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 25, 30, 35, 40, 45, 50, 55, 60]; // 실패했을 때 부서질 확률(%)
  for (let i = 0; i < 20; i++) ENHANCE.push({ to: i + 1, rate: rate[i], breakOnFail: brk[i], stones: 1 + Math.floor(i / 3) + (i >= 11 ? i - 9 : 0), goldMul: Math.round(Math.pow(i + 1, 1.55) * 10) / 10, down: i >= 6 && i < 11 });
}
// 강화 능력 배율: +10 = 1.6배, +15 = 2.1배, +20 = 3배
export function enhanceMul(lv) {
  let m = 1;
  for (let i = 1; i <= lv; i++) m += i <= 10 ? 0.06 : i <= 15 ? 0.1 : 0.18;
  return +m.toFixed(2);
}
export const ENHANCE_BONUS = { 10: '속성 피해 +5%', 15: '속성 피해 +10% · 치명타 +3%', 20: '속성 피해 +20% · 치명타 +6% · 빛나는 장비' };
export function enhanceExtra(lv) { return lv >= 20 ? { elem: 20, crit: 6 } : lv >= 15 ? { elem: 10, crit: 3 } : lv >= 10 ? { elem: 5 } : {}; }
export function enhanceCost(it, to) { const e = ENHANCE[to]; return { gold: Math.round(it.price * 0.12 * e.goldMul), stones: e.stones }; }

export const CONSUMABLES = {
  hp1: { name: '작은 체력 물약', kind: 'hp', val: 50, price: 25, lv: 1, color: '#dc465a' },
  hp2: { name: '체력 물약', kind: 'hp', val: 160, price: 80, lv: 15, color: '#dc3246' },
  hp3: { name: '큰 체력 물약', kind: 'hp', val: 420, price: 210, lv: 30, color: '#c81e3c' },
  hp4: { name: '최고급 체력 물약', kind: 'hp', val: 900, price: 480, lv: 45, color: '#b41450' },
  mp1: { name: '작은 마나 물약', kind: 'mp', val: 30, price: 25, lv: 1, color: '#4678e6' },
  mp2: { name: '마나 물약', kind: 'mp', val: 90, price: 80, lv: 15, color: '#3264dc' },
  mp3: { name: '큰 마나 물약', kind: 'mp', val: 220, price: 210, lv: 30, color: '#2850c8' },
  mp4: { name: '최고급 마나 물약', kind: 'mp', val: 480, price: 480, lv: 45, color: '#3c28be' },
  recall: { name: '귀환 주문서', kind: 'recall', price: 60, lv: 1, color: '#7850c8', desc: '마지막으로 들른 마을로 바로 돌아가요.' },
  protect: { name: '강화 보호 주문서', kind: 'protect', price: 6000, lv: 10, color: '#f0d060', desc: '강화가 실패해도 장비가 부서지지 않아요 (한 번 씀).' },
  forget: { name: '망각의 물약', kind: 'reset', price: 800, lv: 10, color: '#c8c8dc', desc: '배운 스킬과 능력치를 모두 되돌려 점수를 돌려받아요.' },
};
for (const [id, c] of Object.entries(CONSUMABLES)) c.id = id;
