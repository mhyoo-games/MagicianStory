// 몬스터. lv로 능력치가 정해진다 (rules.js monsterStats). role: normal · mid(중간보스) · boss · exam(시험관)
// model.t: human(맨몸 캐릭터에 옷·모자를 그려 입힘, 에셋 몬스터는 engine/sheets.js의 MON_PX) · slime · mushroom · beast · flyer · golem · ghost · book · dragon
// ai: melee 다가와 때림 · ranged 떨어져 쏨 · charger 돌진 · caster 마법 쏘고 물러남 · hopper 통통 튐
// weak: 약한 속성(1.5배) · resist: 강한 속성(0.6배) · undead: 빛에 약함 · boss: 기믹 이름 (bosses.js)
export const MONSTERS = {
  // 1장 — 뒷동산 · 초록 숲 · 고블린 굴
  slime_green: { name: '초록 슬라임', lv: 1, ch: 1, model: { t: 'slime', c: '#7ed36a' }, ai: 'hopper', weak: 'fire' },
  mushroom: { name: '뭉게버섯', lv: 2, ch: 1, model: { t: 'mushroom', c: '#e0604c' }, ai: 'hopper', weak: 'fire' },
  slime_blue: { name: '파란 슬라임', lv: 3, ch: 1, model: { t: 'slime', c: '#6aa8e8' }, ai: 'hopper', weak: 'wood', resist: 'water' },
  goblin: { name: '고블린', lv: 4, ch: 1, model: { t: 'human', skin: '#8cc461', hair: null, shirt: '#8a6a40', pants: '#5a4a30', face: 'angry', ears: 1, weapon: 'club', scale: 0.75 }, ai: 'melee', weak: 'light' },
  goblin_archer: { name: '고블린 궁수', lv: 5, ch: 1, model: { t: 'human', skin: '#8cc461', hair: '#4a3a2a', shirt: '#5a7a40', pants: '#4a4a30', face: 'angry', ears: 1, weapon: 'bow', scale: 0.75 }, ai: 'ranged', proj: 'arrow', weak: 'fire' },
  king_slime: { name: '킹 슬라임', lv: 5, ch: 1, role: 'mid', model: { t: 'slime', c: '#66c85a', crown: 1, scale: 2.6 }, ai: 'hopper', weak: 'fire', boss: 'kingSlime' },
  goblin_chief: { name: '고블린 족장 그락', lv: 7, ch: 1, role: 'boss', model: { t: 'human', skin: '#7ab452', shirt: '#6a3a2a', pants: '#3a3020', face: 'angry', ears: 1, tusks: 1, weapon: 'club', crown: '#e0b030', scale: 1.5 }, ai: 'melee', weak: 'light', boss: 'goblinChief' },

  // 2장 — 안개 늪 · 가라앉은 사원
  toad: { name: '늪 두꺼비', lv: 8, ch: 2, model: { t: 'beast', head: 'toad', c: '#6f8c4a', c2: '#c8c890' }, ai: 'hopper', proj: 'spit', weak: 'ice', resist: 'water' },
  slime_poison: { name: '독 슬라임', lv: 9, ch: 2, model: { t: 'slime', c: '#a060c0' }, ai: 'hopper', weak: 'light', resist: 'dark', onHit: 'poison' },
  lizardman: { name: '리자드맨', lv: 10, ch: 2, model: { t: 'human', skin: '#5aa070', shirt: '#6a5a3a', pants: '#4a4030', face: 'lizard', tail: 1, weapon: 'sword' }, ai: 'melee', weak: 'ice', resist: 'water' },
  wisp_swamp: { name: '늪 도깨비불', lv: 11, ch: 2, model: { t: 'flyer', kind: 'wisp', c: '#a0e070' }, ai: 'caster', proj: 'wood', weak: 'fire', resist: 'wood' },
  lizard_spear: { name: '리자드맨 창병', lv: 12, ch: 2, model: { t: 'human', skin: '#4a9070', shirt: '#5a4a6a', pants: '#3a3040', face: 'lizard', tail: 1, weapon: 'spear' }, ai: 'charger', weak: 'ice', resist: 'water' },
  lizard_captain: { name: '리자드맨 전사장 그르샤', lv: 12, ch: 2, role: 'mid', model: { t: 'human', skin: '#3a8060', shirt: '#8a3030', pants: '#3a2020', face: 'lizard', tail: 1, weapon: 'axe', helm: '#8a8a9a', scale: 1.6 }, ai: 'melee', weak: 'ice', resist: 'water', boss: 'lizardCaptain' },
  morga: { name: '늪의 마녀 모르가', lv: 14, ch: 2, role: 'boss', model: { t: 'human', skin: '#c8d0b0', hair: '#202820', hairLong: 1, shirt: '#304a30', pants: '#203020', face: 'witch', hat: '#203020', robe: '#304a30', weapon: 'staff', orb: '#b070e0', scale: 1.4 }, ai: 'caster', proj: 'dark', weak: 'light', resist: 'dark', boss: 'morga' },

  // 3장 — 붉은 협곡 · 용암 갱도
  orc: { name: '오크', lv: 15, ch: 3, model: { t: 'human', skin: '#7a9a5a', shirt: '#6a4a3a', pants: '#3a3a2a', face: 'angry', tusks: 1, weapon: 'club', scale: 1.15 }, ai: 'melee', weak: 'water' },
  salamander: { name: '불도마뱀', lv: 16, ch: 3, model: { t: 'beast', head: 'lizard', c: '#e06a30', c2: '#ffd080' }, ai: 'charger', weak: 'water', resist: 'fire', elem: 'fire' },
  orc_shaman: { name: '오크 주술사', lv: 17, ch: 3, model: { t: 'human', skin: '#7a9a5a', hair: '#c0c0b0', hairLong: 1, shirt: '#8a3a2a', pants: '#4a2a1a', face: 'angry', tusks: 1, robe: '#8a3a2a', weapon: 'staff', orb: '#ff8040' }, ai: 'caster', proj: 'fire', weak: 'water', resist: 'fire' },
  slime_lava: { name: '용암 슬라임', lv: 18, ch: 3, model: { t: 'slime', c: '#e05a30', glow: '#ffb040' }, ai: 'hopper', weak: 'water', resist: 'fire', elem: 'fire' },
  bat_fire: { name: '불박쥐', lv: 19, ch: 3, model: { t: 'flyer', kind: 'bat', c: '#a03a30', c2: '#e06a40' }, ai: 'charger', weak: 'ice', resist: 'fire' },
  orc_berserker: { name: '오크 광전사', lv: 19, ch: 3, role: 'mid', model: { t: 'human', skin: '#8a7a5a', hair: '#c03020', shirt: '#5a2a1a', pants: '#2a2a1a', face: 'angry', tusks: 1, weapon: 'axe', scale: 1.7 }, ai: 'charger', weak: 'water', boss: 'berserker' },
  bolg: { name: '오크 대족장 볼그', lv: 21, ch: 3, role: 'boss', model: { t: 'human', skin: '#6a8a4a', shirt: '#4a2a2a', pants: '#2a2020', face: 'angry', tusks: 1, weapon: 'axe', helm: '#5a5a6a', scale: 2 }, ai: 'melee', weak: 'water', boss: 'bolg' },

  // 4장 — 서리 산길 · 빙결 궁전
  wolf_ice: { name: '얼음 늑대', lv: 22, ch: 4, model: { t: 'beast', head: 'wolf', c: '#c8d8e8', c2: '#f0f6ff' }, ai: 'charger', weak: 'fire', resist: 'ice' },
  slime_snow: { name: '눈 슬라임', lv: 23, ch: 4, model: { t: 'slime', c: '#e8f0fa' }, ai: 'hopper', weak: 'fire', resist: 'ice', onHit: 'chill' },
  yeti: { name: '설인', lv: 24, ch: 4, model: { t: 'human', skin: '#a0b8d0', hair: '#f0f4f8', shirt: '#eef2f6', pants: '#e0e6ee', shoes: '#c0c8d0', face: 'angry', fur: 1, scale: 1.4 }, ai: 'melee', weak: 'fire', resist: 'ice' },
  bat_frost: { name: '서리 박쥐', lv: 25, ch: 4, model: { t: 'flyer', kind: 'bat', c: '#6080b0', c2: '#a0c8f0' }, ai: 'charger', weak: 'fire' },
  golem_ice: { name: '얼음 골렘', lv: 26, ch: 4, model: { t: 'golem', c: '#9cc8e8', crystal: '#e0ffff' }, ai: 'melee', weak: 'fire', resist: 'ice', slow: 1 },
  frost_wolf_king: { name: '서리 늑대왕', lv: 27, ch: 4, role: 'mid', model: { t: 'beast', head: 'wolf', c: '#8aa8c8', c2: '#e8f0ff', mane: 1, scale: 2.4 }, ai: 'charger', weak: 'fire', resist: 'ice', boss: 'wolfKing' },
  ceres: { name: '빙결의 여왕 세레스', lv: 29, ch: 4, role: 'boss', model: { t: 'human', skin: '#e8f0fa', hair: '#f4f8ff', hairLong: 1, shirt: '#7ab0e0', pants: '#5a90c0', face: 'calm', crown: '#c0f0ff', robe: '#7ab0e0', weapon: 'staff', orb: '#c0f0ff', scale: 1.5 }, ai: 'caster', proj: 'ice', weak: 'fire', resist: 'ice', boss: 'ceres' },

  // 5장 — 구름 다리 · 바람의 탑
  harpy: { name: '하피', lv: 29, ch: 5, model: { t: 'human', skin: '#f0d0b0', hair: '#806040', hairLong: 1, shirt: '#a08060', pants: '#806040', face: 'angry', wings: '#b09070' }, ai: 'charger', weak: 'earth', resist: 'wind' },
  wisp_wind: { name: '바람 정령', lv: 30, ch: 5, model: { t: 'flyer', kind: 'wisp', c: '#a0f0d0' }, ai: 'caster', proj: 'wind', weak: 'earth', resist: 'wind' },
  slime_storm: { name: '번개 슬라임', lv: 31, ch: 5, model: { t: 'slime', c: '#e8e070', glow: '#fff8a0' }, ai: 'hopper', weak: 'earth', onHit: 'stun' },
  gargoyle: { name: '돌 가고일', lv: 32, ch: 5, model: { t: 'flyer', kind: 'gargoyle', c: '#8a8a98', c2: '#6a6a78' }, ai: 'charger', weak: 'water', resist: 'earth' },
  cultist: { name: '검은 비늘 수련생', lv: 33, ch: 5, model: { t: 'human', skin: '#e8c8a8', shirt: '#2a2a3a', pants: '#1a1a2a', face: 'calm', hood: '#2a2a3a', robe: '#2a2a3a', weapon: 'staff', orb: '#c03040' }, ai: 'caster', proj: 'dark', weak: 'light' },
  griffin: { name: '폭풍 그리폰', lv: 34, ch: 5, role: 'mid', model: { t: 'beast', head: 'griffin', c: '#c8a060', c2: '#f8f8f0', wings: '#8a6a40', scale: 2.4 }, ai: 'charger', weak: 'earth', resist: 'wind', boss: 'griffin' },
  kai: { name: '바람의 집행자 카이', lv: 36, ch: 5, role: 'boss', model: { t: 'human', skin: '#e8c8a8', hair: '#a0e0d0', shirt: '#2a4a4a', pants: '#1a2a2a', face: 'calm', robe: '#2a4a4a', weapon: 'staff', orb: '#a0f0d0', scale: 1.4 }, ai: 'caster', proj: 'wind', weak: 'earth', resist: 'wind', boss: 'kai' },

  // 6장 — 잠긴 서고 · 금서고
  skeleton: { name: '해골 병사', lv: 36, ch: 6, model: { t: 'human', skin: '#e8e0d0', shirt: '#d8d0c0', pants: '#c8c0b0', face: 'skull', weapon: 'sword' }, ai: 'melee', weak: 'light', resist: 'dark', undead: 1 },
  ghost: { name: '서고의 유령', lv: 37, ch: 6, model: { t: 'ghost', c: '#c8d0f0' }, ai: 'charger', weak: 'light', resist: 'wind', undead: 1 },
  zombie: { name: '잠든 사서', lv: 38, ch: 6, model: { t: 'human', skinTex: 'zombieA', face: null }, ai: 'melee', weak: 'light', undead: 1, slow: 1 },
  skeleton_mage: { name: '해골 마법사', lv: 38, ch: 6, model: { t: 'human', skin: '#e8e0d0', shirt: '#4a3a6a', pants: '#3a2a5a', face: 'skull', hat: '#3a2a5a', robe: '#4a3a6a', weapon: 'staff', orb: '#a080e0' }, ai: 'caster', proj: 'dark', weak: 'light', resist: 'dark', undead: 1 },
  book_mimic: { name: '책 미믹', lv: 39, ch: 6, model: { t: 'book', c: '#7a3a3a' }, ai: 'hopper', weak: 'fire' },
  forbidden_book: { name: '금서 「검은 장」', lv: 41, ch: 6, role: 'mid', model: { t: 'book', c: '#2a1a3a', glow: '#a060ff', scale: 2.6 }, ai: 'caster', proj: 'dark', weak: 'light', resist: 'dark', boss: 'forbiddenBook' },
  nekros: { name: '리치 네크로스', lv: 43, ch: 6, role: 'boss', model: { t: 'human', skin: '#d8d0c0', shirt: '#3a2050', pants: '#2a1040', face: 'skull', crown: '#e0c060', robe: '#3a2050', weapon: 'staff', orb: '#80ff80', scale: 1.6 }, ai: 'caster', proj: 'dark', weak: 'light', resist: 'dark', undead: 1, boss: 'nekros' },

  // 7장 — 모래시계 사막 · 시간의 미궁
  clockwork: { name: '태엽 골렘', lv: 43, ch: 7, model: { t: 'golem', c: '#b08a50', gear: 1 }, ai: 'melee', weak: 'water', resist: 'earth' },
  scorpion: { name: '모래 전갈', lv: 44, ch: 7, model: { t: 'beast', head: 'scorp', c: '#c0904a', c2: '#e0c080' }, ai: 'charger', weak: 'water', resist: 'earth', onHit: 'poison' },
  zombie_dry: { name: '모래 미라', lv: 45, ch: 7, model: { t: 'human', skinTex: 'zombieC', face: null, scale: 1.05 }, ai: 'melee', weak: 'fire', undead: 1, slow: 1 },
  time_wraith: { name: '시간의 망령', lv: 45, ch: 7, model: { t: 'ghost', c: '#d8c0f0', clock: 1 }, ai: 'caster', proj: 'time', weak: 'light', resist: 'time', undead: 1 },
  cult_mage: { name: '검은 비늘 마도사', lv: 46, ch: 7, model: { t: 'human', skin: '#d8b898', shirt: '#3a1a2a', pants: '#2a1020', face: 'calm', hood: '#3a1a2a', robe: '#3a1a2a', weapon: 'staff', orb: '#e0c060' }, ai: 'caster', proj: 'time', weak: 'dark', resist: 'time' },
  clocktower: { name: '시계탑 수호자', lv: 48, ch: 7, role: 'mid', model: { t: 'golem', c: '#a07a40', gear: 1, scale: 2.4 }, ai: 'melee', weak: 'water', resist: 'earth', boss: 'clocktower' },
  baltar: { name: '교단장 발타르', lv: 50, ch: 7, role: 'boss', model: { t: 'human', skin: '#d8b898', hair: '#a0a0a8', shirt: '#2a1030', pants: '#1a0820', face: 'beard', hood: '#2a1030', robe: '#2a1030', weapon: 'staff', orb: '#e0c060', scale: 1.5 }, ai: 'caster', proj: 'time', weak: 'light', resist: 'dark', boss: 'baltar' },

  // 8장 — 불타는 화산길 · 용의 둥지
  drake: { name: '화염 드레이크', lv: 50, ch: 8, model: { t: 'beast', head: 'drake', c: '#b03a30', c2: '#f0c080' }, ai: 'charger', weak: 'ice', resist: 'fire' },
  wisp_fire: { name: '업화의 정령', lv: 51, ch: 8, model: { t: 'flyer', kind: 'wisp', c: '#ff8040' }, ai: 'caster', proj: 'fire', weak: 'water', resist: 'fire' },
  dragonkin: { name: '용인족 전사', lv: 52, ch: 8, model: { t: 'human', skin: '#a04040', shirt: '#3a2a2a', pants: '#2a1a1a', face: 'lizard', tail: 1, weapon: 'spear', helm: '#4a3a3a', scale: 1.2 }, ai: 'charger', weak: 'ice', resist: 'fire' },
  golem_magma: { name: '마그마 골렘', lv: 53, ch: 8, model: { t: 'golem', c: '#4a3a3a', lava: '#ffb040' }, ai: 'melee', weak: 'water', resist: 'fire' },
  dragon_priest: { name: '용의 신관', lv: 54, ch: 8, model: { t: 'human', skin: '#d8b898', shirt: '#5a1010', pants: '#3a0808', face: 'calm', hood: '#5a1010', robe: '#5a1010', weapon: 'staff', orb: '#ff6040' }, ai: 'caster', proj: 'fire', weak: 'water', resist: 'dark' },
  wyvern: { name: '검은 와이번', lv: 55, ch: 8, role: 'mid', model: { t: 'dragon', c: '#3a3a4a', c2: '#8a8aa0', scale: 1.6 }, ai: 'charger', weak: 'light', resist: 'fire', boss: 'wyvern' },
  azdaha: { name: '재앙의 용 아즈다하', lv: 58, ch: 8, role: 'boss', model: { t: 'dragon', c: '#9a2020', c2: '#f0c070', scale: 2.6 }, ai: 'melee', weak: 'ice', resist: 'fire', boss: 'azdaha', final: 1 },

  // 시험관
  exam_1: { name: '시험관 골렘 (초급)', lv: 7, ch: 0, role: 'exam', model: { t: 'golem', c: '#7a6aa8', rune: '#a0f0ff', scale: 1.7 }, ai: 'melee', boss: 'exam' },
  exam_2: { name: '시험관 골렘 (중급)', lv: 21, ch: 0, role: 'exam', model: { t: 'golem', c: '#6a7ab8', rune: '#a0ffd0', scale: 1.9 }, ai: 'melee', boss: 'exam' },
  exam_3: { name: '시험관 골렘 (상급)', lv: 36, ch: 0, role: 'exam', model: { t: 'golem', c: '#8a5ab0', rune: '#ffd0a0', scale: 2.1 }, ai: 'melee', boss: 'exam' },
  exam_4: { name: '대마법사 오르벤의 환영', lv: 50, ch: 0, role: 'exam', model: { t: 'human', skin: '#f6d3b3', hair: '#e1e1e6', shirt: '#4650a0', pants: '#373c82', face: 'beard', hat: '#373c82', robe: '#4650a0', weapon: 'staff', orb: '#a0e0ff', scale: 1.4, ghostly: 1 }, ai: 'caster', proj: 'arcane', boss: 'orbenExam' },

  // 기믹 물체 (보스가 만들어 냄)
  totem: { name: '고블린 토템', lv: 7, ch: 1, role: 'object', model: { t: 'totem', c: '#8a5a3a', glow: '#e0b030' }, ai: 'none' },
  blood_barrel: { name: '용의 피 통', lv: 21, ch: 3, role: 'object', model: { t: 'barrel', c: '#6a3a2a', glow: '#d02020' }, ai: 'none' },
  brazier: { name: '꺼진 화로', lv: 29, ch: 4, role: 'object', model: { t: 'brazier', c: '#5a5a6a' }, ai: 'none' },
  rod: { name: '피뢰침', lv: 34, ch: 5, role: 'object', model: { t: 'rod', c: '#8a8a9a', glow: '#fff8a0' }, ai: 'none' },
  phylactery: { name: '영혼 그릇', lv: 43, ch: 6, role: 'object', model: { t: 'orb', c: '#2a1a3a', glow: '#80ff80' }, ai: 'none' },
  clock: { name: '되감는 시계', lv: 50, ch: 7, role: 'object', model: { t: 'clockObj', c: '#a07a40', glow: '#e0c060' }, ai: 'none' },
  ice_crystal: { name: '얼음 결정', lv: 58, ch: 8, role: 'object', model: { t: 'crystal', c: '#9fe6ff' }, ai: 'none' },
  mirror: { name: '마녀의 분신', lv: 14, ch: 2, role: 'clone', model: { t: 'human', skin: '#c8d0b0', hair: '#202820', hairLong: 1, shirt: '#304a30', pants: '#203020', face: 'witch', hat: '#203020', robe: '#304a30', weapon: 'staff', orb: '#b070e0', scale: 1.4 }, ai: 'caster', proj: 'dark' },
};
for (const [id, m] of Object.entries(MONSTERS)) { m.id = id; m.role = m.role || 'normal'; m.model.scale = m.model.scale || 1; }
export const BOSS_ROLES = ['mid', 'boss', 'exam'];
