// 장비 200개 + 소모품. 8단계(장마다 한 단계) × 칸별로 만들고, 보스 전용 고유 장비를 더한다.
// src: shop(상점) | drop(몬스터 드랍) | boss(보스 드랍) — 보스 장비는 bossOf에 그 보스 id
// rar: 0 일반 · 1 고급 · 2 희귀 · 3 영웅 · 4 전설
import { ELEMENTS } from './skills.js';

export const SLOTS = ['staff', 'hat', 'robe', 'shoes', 'ring', 'amulet'];
export const SLOT_NAME = { staff: '지팡이', hat: '모자', robe: '로브', shoes: '신발', ring: '반지', amulet: '목걸이' };
export const RARITY = [
  { name: '일반', color: '#d8d0c0' }, { name: '고급', color: '#7ad070' }, { name: '희귀', color: '#6aa8ff' },
  { name: '영웅', color: '#c080ff' }, { name: '전설', color: '#ffb040' },
];
export const TIER_LV = [0, 1, 7, 14, 21, 28, 35, 43, 50];
const EL_WORD = { fire: '화염', water: '물결', ice: '서리', wind: '질풍', dark: '암흑', light: '광휘', wood: '신록', earth: '대지', time: '시간' };
const EL_COLOR = { fire: [246, 124, 34], water: [66, 148, 232], ice: [150, 215, 245], wind: [96, 206, 172], dark: [130, 60, 190], light: [255, 230, 120], wood: [100, 180, 70], earth: [180, 130, 80], time: [220, 180, 90], arcane: [170, 140, 255] };
export { EL_COLOR };
const WOOD_T = ['', '참나무', '물푸레나무', '은자작나무', '흑단', '월계수', '수정나무', '별빛 은', '용의 뼈'];
const WOOD_C = [[0, 0, 0], [139, 90, 43], [160, 120, 70], [210, 210, 220], [60, 40, 40], [120, 140, 70], [170, 210, 230], [220, 220, 255], [240, 230, 200]];
const CLOTH_T = ['', '무명', '리넨', '모직', '비단', '마법사 비단', '별실', '달빛 실', '용비늘'];
const METAL_T = ['', '구리', '청동', '은', '백금', '미스릴', '오리하르콘', '별철', '용의 심장'];
const METAL_C = [[0, 0, 0], [200, 120, 70], [190, 150, 80], [210, 210, 220], [230, 230, 240], [170, 220, 230], [240, 200, 90], [190, 190, 255], [240, 90, 70]];
const HAT_C = [[70, 40, 60], [60, 80, 140], [40, 90, 60], [110, 50, 50], [60, 60, 70], [120, 70, 140], [30, 60, 90], [140, 100, 40], [40, 30, 50]];
const ROBE_C = [[200, 66, 58], [70, 80, 160], [100, 140, 80], [120, 60, 140], [60, 120, 140], [140, 110, 70], [40, 40, 60], [180, 180, 200], [150, 30, 40]];

export const ITEMS = {};
let n = 0;
function add(it) {
  it.id = it.id || `it${String(++n).padStart(3, '0')}`;
  it.lv = TIER_LV[it.tier];
  it.price = Math.round((40 + it.tier * it.tier * 55) * [1, 1.6, 2.6, 4, 6][it.rar] * ({ staff: 1.3, hat: 0.8, robe: 1, shoes: 0.7, ring: 0.9, amulet: 1 }[it.slot]));
  ITEMS[it.id] = it;
}

for (let t = 1; t <= 8; t++) {
  // 지팡이 7개: 무속성 1(상점) + 속성 6 (상점 2 · 드랍 3 · 보스 1)
  const els = [0, 1, 2, 3, 4, 5].map((k) => ELEMENTS[(t * 4 + k * 2) % 9]);
  const base = 8 + t * 13;
  add({ slot: 'staff', tier: t, rar: 0, src: 'shop', el: 'arcane', name: `${WOOD_T[t]} 지팡이`, st: { matk: base }, look: { orb: EL_COLOR.arcane, wood: WOOD_C[t] } });
  els.forEach((el, k) => {
    const rar = k < 2 ? 1 : k < 5 ? 2 : 3, src = k < 2 ? 'shop' : k < 5 ? 'drop' : 'boss';
    const extra = rar === 3 ? { crit: 4 + t, mp: t * 10 } : rar === 2 ? { mp: t * 8 } : {};
    add({ slot: 'staff', tier: t, rar, src, el, name: `${EL_WORD[el]}의 ${WOOD_T[t]} 지팡이`, st: { matk: Math.round(base * [1, 1.08, 1.18, 1.3][rar]), elem: 6 + rar * 4 + t, ...extra }, look: { orb: EL_COLOR[el], wood: WOOD_C[t] } });
  });
  // 모자 3 · 로브 3 · 신발 3 (상점 2 · 드랍 1)
  for (let k = 0; k < 3; k++) {
    const rar = k < 2 ? k : 2, src = k < 2 ? 'shop' : 'drop', el = ELEMENTS[(t + k * 3) % 9];
    const hc = HAT_C[(t + k * 2) % HAT_C.length], rc = ROBE_C[(t * 2 + k) % ROBE_C.length];
    add({ slot: 'hat', tier: t, rar, src, name: k === 2 ? `${EL_WORD[el]}의 ${CLOTH_T[t]} 모자` : `${CLOTH_T[t]} ${['고깔모자', '마법사 모자'][k]}`, st: { mp: 10 + t * 12, def: 1 + t * 2, ...(k === 2 ? { elem: 3 + t, cdr: 2 + Math.floor(t / 2) } : {}) }, look: { c: hc, band: EL_COLOR[el] } });
    add({ slot: 'robe', tier: t, rar, src, name: k === 2 ? `${EL_WORD[el]}의 ${CLOTH_T[t]} 로브` : `${CLOTH_T[t]} ${['수련복', '마법사 로브'][k]}`, st: { hp: 20 + t * 26, def: 3 + t * 5, ...(k === 2 ? { mpRegen: +(0.2 + t * 0.1).toFixed(1) } : {}) }, look: { c: rc, kind: k === 0 ? 'dress' : 'robe', band: EL_COLOR[el] } });
    add({ slot: 'shoes', tier: t, rar, src, name: k === 2 ? `${EL_WORD[el]}의 ${CLOTH_T[t]} 장화` : `${CLOTH_T[t]} ${['신발', '여행 장화'][k]}`, st: { speed: 2 + k * 2 + Math.floor(t / 2), def: 1 + t * 2, ...(k === 2 ? { hp: t * 15 } : {}) }, look: { c: [[90, 60, 40], [70, 50, 70], [60, 70, 90]][k] } });
  }
  // 반지 4 · 목걸이 4 (상점 1 · 드랍 2 · 보스 1)
  for (let k = 0; k < 4; k++) {
    const rar = [0, 2, 2, 3][k], src = ['shop', 'drop', 'drop', 'boss'][k], el = ELEMENTS[(t * 2 + k * 5) % 9];
    add({ slot: 'ring', tier: t, rar, src, name: k === 0 ? `${METAL_T[t]} 반지` : `${EL_WORD[el]}의 ${METAL_T[t]} 반지`, st: { matk: 2 + t * 3, crit: 1 + k + Math.floor(t / 2), ...(k ? { elem: 4 + t + rar } : {}), ...(k === 3 ? { cdr: 3 + t } : {}) }, ringEl: k ? el : null, look: { c: EL_COLOR[el], m: METAL_C[t] } });
    add({ slot: 'amulet', tier: t, rar, src, name: k === 0 ? `${METAL_T[t]} 목걸이` : `${EL_WORD[el]}의 ${METAL_T[t]} 부적`, st: { hp: 15 + t * 18, mp: 10 + t * 10, ...(k ? { regen: +(0.3 + t * 0.2).toFixed(1) } : {}), ...(k === 3 ? { drain: 1 + Math.floor(t / 3), gold: 5 + t * 2 } : {}) }, ringEl: k ? el : null, look: { c: EL_COLOR[el], m: METAL_C[t] } });
  }
}
// 보스 고유 장비 8개 (모자·로브)
const UNIQUE = [
  ['goblin_chief', 'robe', 1, '고블린 족장의 망토', { hp: 90, def: 14, gold: 10 }, { c: [110, 60, 40], kind: 'robe', band: [220, 180, 60] }],
  ['morga', 'hat', 2, '늪 마녀의 고깔', { mp: 60, elem: 12, cdr: 6 }, { c: [32, 48, 32], band: [144, 192, 96] }],
  ['bolg', 'robe', 3, '대족장의 가죽 갑옷', { hp: 260, def: 36, regen: 1 }, { c: [90, 50, 40], kind: 'tunic', band: [200, 80, 40] }],
  ['ceres', 'hat', 4, '빙결 여왕의 왕관 모자', { mp: 110, elem: 18, crit: 6 }, { c: [180, 220, 245], band: [255, 255, 255], gem: [120, 200, 255] }],
  ['kai', 'robe', 5, '바람 집행자의 외투', { hp: 300, def: 40, speed: 10, cdr: 8 }, { c: [42, 74, 74], kind: 'robe', band: [160, 240, 208] }],
  ['nekros', 'hat', 6, '리치의 검은 관', { mp: 180, elem: 24, drain: 3 }, { c: [58, 32, 80], band: [224, 192, 96], gem: [128, 255, 128] }],
  ['baltar', 'robe', 7, '시간술사의 법의', { hp: 520, def: 60, cdr: 14, mpRegen: 1.5 }, { c: [42, 16, 48], kind: 'robe', band: [224, 192, 96] }],
  ['azdaha', 'hat', 8, '용살자의 모자', { mp: 260, elem: 35, crit: 12, cdr: 10 }, { c: [150, 30, 40], band: [255, 200, 90], gem: [255, 240, 120] }],
];
for (const [boss, slot, t, name, st, look] of UNIQUE) add({ slot, tier: t, rar: 4, src: 'boss', bossOf: boss, name, st, look });
// 보스 드랍 연결: 그 단계의 boss 장비를 해당 장 보스에게
const BOSS_BY_TIER = { 1: 'goblin_chief', 2: 'morga', 3: 'bolg', 4: 'ceres', 5: 'kai', 6: 'nekros', 7: 'baltar', 8: 'azdaha' };
for (const it of Object.values(ITEMS)) if (it.src === 'boss' && !it.bossOf) it.bossOf = BOSS_BY_TIER[it.tier];

// 소모품 (장비 200개와 따로)
export const CONSUMABLES = {
  hp1: { name: '작은 체력 물약', kind: 'hp', val: 60, price: 15, lv: 1, color: [220, 70, 90] },
  hp2: { name: '체력 물약', kind: 'hp', val: 180, price: 45, lv: 12, color: [220, 50, 70] },
  hp3: { name: '큰 체력 물약', kind: 'hp', val: 450, price: 120, lv: 28, color: [200, 30, 60] },
  hp4: { name: '최고급 체력 물약', kind: 'hp', val: 1000, price: 280, lv: 45, color: [180, 20, 80] },
  mp1: { name: '작은 마나 물약', kind: 'mp', val: 40, price: 15, lv: 1, color: [70, 120, 230] },
  mp2: { name: '마나 물약', kind: 'mp', val: 110, price: 45, lv: 12, color: [50, 100, 220] },
  mp3: { name: '큰 마나 물약', kind: 'mp', val: 260, price: 120, lv: 28, color: [40, 80, 200] },
  mp4: { name: '최고급 마나 물약', kind: 'mp', val: 560, price: 280, lv: 45, color: [60, 40, 190] },
  recall: { name: '귀환 주문서', kind: 'recall', price: 30, lv: 1, color: [120, 80, 200] },
  forget: { name: '망각의 물약', kind: 'reset', price: 500, lv: 10, color: [200, 200, 220], desc: '배운 스킬과 능력치를 모두 되돌려 점수를 돌려받아요.' },
};
for (const [id, c] of Object.entries(CONSUMABLES)) c.id = id;

export function itemsOf(f) { return Object.values(ITEMS).filter(f); }
