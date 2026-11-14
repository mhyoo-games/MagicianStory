// 몬스터. lv로 능력치가 정해진다(rules.js monsterStats). role: normal | mid(중간보스) | boss | exam(시험관)
// art.t: slime | mushroom | human | beast | flyer | golem | ghost | mimic | dragon
// ai: melee(다가와 때림) | ranged(떨어져 쏨) | charger(돌진) | caster(마법 쏨, 도망) | hopper
// weak: 약한 속성(1.5배), resist: 강한 속성(0.6배)
const S = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const MONSTERS = {
  // ── 1장 초록 숲 ──
  slime_green: { name: '초록 슬라임', lv: 1, ch: 1, art: { t: 'slime', c: S('#7ed36a') }, ai: 'hopper', weak: 'fire', drop: 'jelly' },
  slime_blue: { name: '파란 슬라임', lv: 3, ch: 1, art: { t: 'slime', c: S('#6aa8e8') }, ai: 'hopper', weak: 'wood', resist: 'water' },
  mushroom: { name: '뭉게버섯', lv: 2, ch: 1, art: { t: 'mushroom', c: S('#e0604c') }, ai: 'hopper', weak: 'fire' },
  goblin: { name: '고블린', lv: 4, ch: 1, art: { t: 'human', skin: S('#8cc461'), hair: S('#4a3a2a'), style: 'bald', hairSide: false, outfit: S('#8a6a40'), kind: 'tunic', pants: S('#5a4a30'), ears: true, weapon: 'club', noBlush: true, eye: S('#f0e060') }, ai: 'melee', weak: 'light' },
  goblin_archer: { name: '고블린 궁수', lv: 5, ch: 1, art: { t: 'human', skin: S('#8cc461'), hair: S('#4a3a2a'), style: 'short', outfit: S('#5a7a40'), kind: 'tunic', pants: S('#4a4a30'), ears: true, weapon: 'bow', noBlush: true, eye: S('#f0e060') }, ai: 'ranged', proj: 'arrow', weak: 'fire' },
  king_slime: { name: '킹 슬라임', lv: 5, ch: 1, role: 'mid', scale: 2.5, art: { t: 'slime', c: S('#66c85a'), acc: 'crown', angry: true }, ai: 'hopper', weak: 'fire', summon: 'slime_green', pattern: ['slam', 'summon', 'hop'] },
  goblin_chief: { name: '고블린 족장 그락', lv: 7, ch: 1, role: 'boss', scale: 2, art: { t: 'human', skin: S('#7ab452'), hair: S('#3a2a1a'), style: 'bald', hairSide: false, outfit: S('#6a3a2a'), kind: 'tunic', pants: S('#3a3020'), ears: true, tusks: true, weapon: 'club', crown: S('#e0b030'), wide: true, noBlush: true, eye: S('#ff6040') }, ai: 'melee', weak: 'light', summon: 'goblin', pattern: ['charge', 'slam', 'summon', 'spin'] },

  // ── 2장 안개 늪 ──
  toad: { name: '늪 두꺼비', lv: 8, ch: 2, art: { t: 'beast', head: 'toad', c: S('#6f8c4a'), belly: S('#c8c890') }, ai: 'hopper', proj: 'spit', weak: 'ice', resist: 'water' },
  slime_poison: { name: '독 슬라임', lv: 9, ch: 2, art: { t: 'slime', c: S('#a060c0'), acc: 'drip' }, ai: 'hopper', weak: 'light', resist: 'dark' },
  lizardman: { name: '리자드맨', lv: 10, ch: 2, art: { t: 'human', skin: S('#5aa070'), hair: S('#3a7050'), style: 'bald', hairSide: false, outfit: S('#6a5a3a'), kind: 'tunic', pants: S('#4a4030'), snout: true, tail: S('#4a9060'), weapon: 'sword', eye: S('#f0d040') }, ai: 'melee', weak: 'ice', resist: 'water' },
  lizard_spear: { name: '리자드맨 창병', lv: 12, ch: 2, art: { t: 'human', skin: S('#4a9070'), hair: S('#2a6050'), style: 'bald', hairSide: false, outfit: S('#5a4a6a'), kind: 'tunic', pants: S('#3a3040'), snout: true, tail: S('#3a8060'), weapon: 'spear', eye: S('#f0d040') }, ai: 'charger', weak: 'ice', resist: 'water' },
  wisp_swamp: { name: '늪 도깨비불', lv: 11, ch: 2, art: { t: 'flyer', kind: 'wisp', c: S('#a0e070') }, ai: 'caster', proj: 'wood', elem: 'wood', weak: 'fire', resist: 'wood' },
  lizard_captain: { name: '리자드맨 전사장', lv: 12, ch: 2, role: 'mid', scale: 2, art: { t: 'human', skin: S('#3a8060'), hair: S('#205040'), style: 'bald', hairSide: false, outfit: S('#8a3030'), kind: 'tunic', pants: S('#3a2020'), snout: true, tail: S('#307050'), weapon: 'axe', helm: S('#8a8a9a'), eye: S('#ff5040') }, ai: 'melee', weak: 'ice', resist: 'water', pattern: ['charge', 'spin', 'slam'] },
  morga: { name: '늪의 마녀 모르가', lv: 14, ch: 2, role: 'boss', scale: 2, art: { t: 'human', skin: S('#c8d0b0'), hair: S('#202820'), style: 'long', outfit: S('#304a30'), kind: 'robe', band: S('#90c060'), hat: { c: S('#203020'), band: S('#90c060') }, staff: { orb: S('#b070e0') }, eye: S('#c070ff'), noBlush: true }, ai: 'caster', proj: 'dark', elem: 'dark', weak: 'light', resist: 'dark', summon: 'slime_poison', pattern: ['spread', 'poisonfield', 'summon', 'blink'] },

  // ── 3장 불꽃 협곡 ──
  orc: { name: '오크', lv: 15, ch: 3, art: { t: 'human', skin: S('#7a9a5a'), hair: S('#2a2a1a'), style: 'bald', hairSide: false, outfit: S('#6a4a3a'), kind: 'tunic', pants: S('#3a3a2a'), tusks: true, wide: true, weapon: 'club', noBlush: true, eye: S('#ff6040') }, ai: 'melee', weak: 'water' },
  orc_shaman: { name: '오크 주술사', lv: 17, ch: 3, art: { t: 'human', skin: S('#7a9a5a'), hair: S('#c0c0b0'), style: 'long', outfit: S('#8a3a2a'), kind: 'robe', band: S('#f0b040'), tusks: true, staff: { orb: S('#ff8040') }, noBlush: true }, ai: 'caster', proj: 'fire', elem: 'fire', weak: 'water', resist: 'fire' },
  salamander: { name: '불도마뱀', lv: 16, ch: 3, art: { t: 'beast', head: 'lizard', c: S('#e06a30'), belly: S('#ffd080'), tail: 'long', spikes: S('#ffb040') }, ai: 'charger', elem: 'fire', weak: 'water', resist: 'fire' },
  slime_lava: { name: '용암 슬라임', lv: 18, ch: 3, art: { t: 'slime', c: S('#e05a30'), acc: 'flame' }, ai: 'hopper', elem: 'fire', weak: 'water', resist: 'fire' },
  bat_fire: { name: '불박쥐', lv: 19, ch: 3, art: { t: 'flyer', c: S('#a03a30'), wing: S('#e06a40'), eye: S('#ffe060') }, ai: 'charger', elem: 'fire', weak: 'ice', resist: 'fire' },
  orc_berserker: { name: '오크 광전사', lv: 19, ch: 3, role: 'mid', scale: 2, art: { t: 'human', skin: S('#8a7a5a'), hair: S('#c03020'), style: 'messy', outfit: S('#5a2a1a'), kind: 'tunic', pants: S('#2a2a1a'), tusks: true, wide: true, weapon: 'axe', noBlush: true, eye: S('#ff3020') }, ai: 'charger', weak: 'water', pattern: ['charge', 'spin', 'rage'] },
  bolg: { name: '오크 대족장 볼그', lv: 21, ch: 3, role: 'boss', scale: 2.3, art: { t: 'human', skin: S('#6a8a4a'), hair: S('#1a1a10'), style: 'bald', hairSide: false, outfit: S('#4a2a2a'), kind: 'tunic', pants: S('#2a2020'), tusks: true, wide: true, weapon: 'axe', helm: S('#5a5a6a'), noBlush: true, eye: S('#ff4020') }, ai: 'melee', weak: 'water', summon: 'orc', pattern: ['slam', 'charge', 'firewave', 'summon'] },

  // ── 4장 얼어붙은 봉우리 ──
  wolf_ice: { name: '얼음 늑대', lv: 22, ch: 4, art: { t: 'beast', head: 'wolf', c: S('#c8d8e8'), belly: S('#f0f6ff'), tail: 'bushy', eye: S('#60c0ff') }, ai: 'charger', elem: 'ice', weak: 'fire', resist: 'ice' },
  yeti: { name: '설인', lv: 24, ch: 4, art: { t: 'human', kind: 'fur', skin: S('#a0b8d0'), hair: S('#f0f4f8'), style: 'none', outfit: S('#eef2f6'), wide: true, noBlush: true }, ai: 'melee', weak: 'fire', resist: 'ice' },
  slime_snow: { name: '눈 슬라임', lv: 23, ch: 4, art: { t: 'slime', c: S('#e8f0fa'), acc: 'ice' }, ai: 'hopper', elem: 'ice', weak: 'fire', resist: 'ice' },
  golem_ice: { name: '얼음 골렘', lv: 26, ch: 4, art: { t: 'golem', c: S('#9cc8e8'), deco: 'ice', eye: S('#e0ffff') }, ai: 'melee', elem: 'ice', weak: 'fire', resist: 'ice', slow: true },
  bat_frost: { name: '서리 박쥐', lv: 25, ch: 4, art: { t: 'flyer', c: S('#6080b0'), wing: S('#a0c8f0'), eye: S('#e0ffff') }, ai: 'charger', elem: 'ice', weak: 'fire' },
  frost_wolf_king: { name: '서리 늑대왕', lv: 27, ch: 4, role: 'mid', scale: 2.2, art: { t: 'beast', head: 'wolf', c: S('#8aa8c8'), belly: S('#e8f0ff'), tail: 'bushy', mane: S('#e8f0ff'), eye: S('#40e0ff') }, ai: 'charger', elem: 'ice', weak: 'fire', resist: 'ice', summon: 'wolf_ice', pattern: ['charge', 'howl', 'icespread'] },
  ceres: { name: '빙결의 여왕 세레스', lv: 29, ch: 4, role: 'boss', scale: 2, art: { t: 'human', skin: S('#e8f0fa'), hair: S('#f4f8ff'), style: 'long', outfit: S('#7ab0e0'), kind: 'robe', band: S('#e0f4ff'), crown: S('#c0f0ff'), staff: { orb: S('#c0f0ff'), wood: S('#a0c0e0') }, eye: S('#60c0ff'), noBlush: true }, ai: 'caster', proj: 'ice', elem: 'ice', weak: 'fire', resist: 'ice', pattern: ['spread', 'icerain', 'freeze', 'blink'] },

  // ── 5장 바람의 탑 ──
  harpy: { name: '하피', lv: 29, ch: 5, art: { t: 'human', skin: S('#f0d0b0'), hair: S('#806040'), style: 'long', outfit: S('#a08060'), kind: 'dress', wings: S('#b09070'), eye: S('#f0c040') }, ai: 'charger', elem: 'wind', weak: 'earth', resist: 'wind' },
  wisp_wind: { name: '바람 정령', lv: 30, ch: 5, art: { t: 'flyer', kind: 'wisp', c: S('#a0f0d0') }, ai: 'caster', proj: 'wind', elem: 'wind', weak: 'earth', resist: 'wind' },
  gargoyle: { name: '돌 가고일', lv: 32, ch: 5, art: { t: 'flyer', kind: 'gargoyle', c: S('#8a8a98'), wing: S('#6a6a78'), horn: S('#c0c0c8'), eye: S('#ff4040') }, ai: 'charger', elem: 'earth', weak: 'water', resist: 'earth' },
  slime_storm: { name: '번개 슬라임', lv: 31, ch: 5, art: { t: 'slime', c: S('#e8e070'), acc: 'spark' }, ai: 'hopper', elem: 'wind', weak: 'earth' },
  cultist: { name: '검은 비늘 수련생', lv: 33, ch: 5, art: { t: 'human', skin: S('#e8c8a8'), hair: S('#202020'), style: 'short', outfit: S('#2a2a3a'), kind: 'robe', band: S('#a03040'), hood: S('#2a2a3a'), staff: { orb: S('#a03040') } }, ai: 'caster', proj: 'dark', elem: 'dark', weak: 'light' },
  griffin: { name: '폭풍 그리폰', lv: 34, ch: 5, role: 'mid', scale: 2.2, art: { t: 'beast', head: 'griffin', c: S('#c8a060'), belly: S('#f0e0b0'), headC: S('#f8f8f0'), wings: S('#8a6a40'), tail: 'tuft' }, ai: 'charger', elem: 'wind', weak: 'earth', resist: 'wind', pattern: ['charge', 'tornado', 'feathers'] },
  kai: { name: '바람의 집행자 카이', lv: 36, ch: 5, role: 'boss', scale: 2, art: { t: 'human', skin: S('#e8c8a8'), hair: S('#a0e0d0'), style: 'messy', outfit: S('#2a4a4a'), kind: 'robe', band: S('#a0f0d0'), hood: null, staff: { orb: S('#a0f0d0') }, eye: S('#60ffd0') }, ai: 'caster', proj: 'storm', elem: 'wind', weak: 'earth', resist: 'wind', summon: 'cultist', pattern: ['spread', 'lightning', 'tornado', 'blink'] },

  // ── 6장 가라앉은 도서관 ──
  skeleton: { name: '해골 병사', lv: 36, ch: 6, art: { t: 'human', skin: S('#e8e0d0'), hair: S('#e8e0d0'), style: 'none', outfit: S('#d8d0c0'), kind: 'tunic', pants: S('#c8c0b0'), skeleton: true, weapon: 'sword', eye: S('#ff5050') }, ai: 'melee', elem: 'dark', weak: 'light', resist: 'dark' },
  skeleton_mage: { name: '해골 마법사', lv: 38, ch: 6, art: { t: 'human', skin: S('#e8e0d0'), hair: S('#e8e0d0'), style: 'none', outfit: S('#4a3a6a'), kind: 'robe', band: S('#a080e0'), skeleton: true, hat: { c: S('#3a2a5a') }, staff: { orb: S('#a080e0') }, eye: S('#a0ff80') }, ai: 'caster', proj: 'dark', elem: 'dark', weak: 'light', resist: 'dark' },
  ghost: { name: '서고의 유령', lv: 37, ch: 6, art: { t: 'ghost', c: S('#c8d0f0'), eye: S('#80c0ff') }, ai: 'charger', elem: 'dark', weak: 'light', resist: 'wind', phase: true },
  book_mimic: { name: '책 미믹', lv: 39, ch: 6, art: { t: 'mimic', c: S('#7a3a3a') }, ai: 'hopper', weak: 'fire' },
  slime_shadow: { name: '그림자 슬라임', lv: 40, ch: 6, art: { t: 'slime', c: S('#4a3a6a') }, ai: 'hopper', elem: 'dark', weak: 'light', resist: 'dark' },
  forbidden_book: { name: '금서 「검은 장」', lv: 41, ch: 6, role: 'mid', scale: 2.4, art: { t: 'mimic', c: S('#2a1a3a') }, ai: 'caster', proj: 'dark', elem: 'dark', weak: 'light', resist: 'dark', summon: 'book_mimic', pattern: ['spread', 'summon', 'darkrain'] },
  nekros: { name: '리치 네크로스', lv: 43, ch: 6, role: 'boss', scale: 2.2, art: { t: 'human', skin: S('#d8d0c0'), hair: S('#d8d0c0'), style: 'none', outfit: S('#3a2050'), kind: 'robe', band: S('#e0c060'), skeleton: true, crown: S('#e0c060'), staff: { orb: S('#80ff80'), wood: S('#403050') }, eye: S('#80ff80') }, ai: 'caster', proj: 'dark', elem: 'dark', weak: 'light', resist: 'dark', summon: 'skeleton', pattern: ['spread', 'darkrain', 'summon', 'drain', 'blink'] },

  // ── 7장 시간의 미궁 ──
  clockwork: { name: '태엽 골렘', lv: 43, ch: 7, art: { t: 'golem', c: S('#b08a50'), deco: 'gear', eye: S('#80e0ff') }, ai: 'melee', elem: 'earth', weak: 'water', resist: 'earth' },
  scorpion: { name: '모래 전갈', lv: 44, ch: 7, art: { t: 'beast', head: 'scorp', c: S('#c0904a'), belly: S('#e0c080'), tail: 'stinger' }, ai: 'charger', elem: 'earth', weak: 'water', resist: 'earth' },
  time_wraith: { name: '시간의 망령', lv: 45, ch: 7, art: { t: 'ghost', c: S('#d8c0f0'), eye: S('#f0d060'), deco: 'clock' }, ai: 'caster', proj: 'time', elem: 'time', weak: 'light', resist: 'time', phase: true },
  cult_mage: { name: '검은 비늘 마도사', lv: 46, ch: 7, art: { t: 'human', skin: S('#d8b898'), hair: S('#101010'), style: 'short', outfit: S('#3a1a2a'), kind: 'robe', band: S('#e0c060'), hood: S('#3a1a2a'), staff: { orb: S('#e0c060') } }, ai: 'caster', proj: 'time', elem: 'time', weak: 'dark', resist: 'time' },
  bat_clock: { name: '초침 박쥐', lv: 47, ch: 7, art: { t: 'flyer', c: S('#6a5a80'), wing: S('#c0a060'), eye: S('#f0e060') }, ai: 'charger', elem: 'time', weak: 'wind' },
  clocktower_golem: { name: '시계탑 수호자', lv: 48, ch: 7, role: 'mid', scale: 2.5, art: { t: 'golem', c: S('#a07a40'), deco: 'gear', eye: S('#f0e060') }, ai: 'melee', elem: 'time', weak: 'water', resist: 'earth', pattern: ['slam', 'timestop', 'charge'] },
  baltar: { name: '교단장 발타르', lv: 50, ch: 7, role: 'boss', scale: 2, art: { t: 'human', skin: S('#d8b898'), hair: S('#a0a0a8'), style: 'bald', outfit: S('#2a1030'), kind: 'robe', band: S('#e0c060'), beard: S('#a0a0a8'), hood: S('#2a1030'), staff: { orb: S('#e0c060'), wood: S('#302030') }, eye: S('#f0d060') }, ai: 'caster', proj: 'time', elem: 'time', weak: 'light', resist: 'dark', summon: 'cult_mage', pattern: ['spread', 'timestop', 'darkrain', 'summon', 'blink'] },

  // ── 8장 용의 둥지 ──
  drake: { name: '화염 드레이크', lv: 50, ch: 8, art: { t: 'beast', head: 'drake', c: S('#b03a30'), belly: S('#f0c080'), tail: 'long', spikes: S('#701a1a'), eye: S('#ffe040') }, ai: 'charger', elem: 'fire', weak: 'ice', resist: 'fire' },
  dragonkin: { name: '용인족 전사', lv: 52, ch: 8, art: { t: 'human', skin: S('#a04040'), hair: S('#601a1a'), style: 'bald', hairSide: false, outfit: S('#3a2a2a'), kind: 'tunic', pants: S('#2a1a1a'), snout: true, tail: S('#902a2a'), weapon: 'spear', helm: S('#4a3a3a'), eye: S('#ffe040') }, ai: 'charger', elem: 'fire', weak: 'ice', resist: 'fire' },
  golem_magma: { name: '마그마 골렘', lv: 53, ch: 8, art: { t: 'golem', c: S('#4a3a3a'), deco: 'lava', eye: S('#ffb040') }, ai: 'melee', elem: 'fire', weak: 'water', resist: 'fire' },
  wisp_fire: { name: '업화의 정령', lv: 51, ch: 8, art: { t: 'flyer', kind: 'wisp', c: S('#ff8040') }, ai: 'caster', proj: 'fire', elem: 'fire', weak: 'water', resist: 'fire' },
  dragon_priest: { name: '용의 신관', lv: 54, ch: 8, art: { t: 'human', skin: S('#d8b898'), hair: S('#101010'), style: 'short', outfit: S('#5a1010'), kind: 'robe', band: S('#ffb040'), hood: S('#5a1010'), staff: { orb: S('#ff6040') } }, ai: 'caster', proj: 'fire', elem: 'fire', weak: 'water', resist: 'dark' },
  wyvern: { name: '검은 와이번', lv: 55, ch: 8, role: 'mid', scale: 2.2, art: { t: 'dragon', size: 48, c: S('#3a3a4a'), belly: S('#8a8aa0'), wing: S('#2a2a38'), eye: S('#ff4040') }, ai: 'charger', elem: 'dark', weak: 'light', resist: 'fire', pattern: ['charge', 'firebreath', 'spread'] },
  azdaha: { name: '재앙의 용 아즈다하', lv: 58, ch: 8, role: 'boss', scale: 2.6, art: { t: 'dragon', size: 64, c: S('#9a2020'), belly: S('#f0c070'), wing: S('#5a1010'), eye: S('#ffe040'), horn: S('#f0e0c0') }, ai: 'melee', elem: 'fire', weak: 'ice', resist: 'fire', summon: 'drake', final: true, pattern: ['firebreath', 'meteor', 'charge', 'summon', 'tailspin', 'roar'] },

  // ── 마탑 시험관 ──
  exam_1: { name: '시험관 골렘 (초급)', lv: 7, ch: 0, role: 'exam', scale: 1.8, art: { t: 'golem', c: S('#7a6aa8'), deco: 'rune', eye: S('#a0f0ff') }, ai: 'melee', pattern: ['slam', 'spread'] },
  exam_2: { name: '시험관 골렘 (중급)', lv: 21, ch: 0, role: 'exam', scale: 2, art: { t: 'golem', c: S('#6a7ab8'), deco: 'rune', eye: S('#a0ffd0') }, ai: 'melee', pattern: ['slam', 'spread', 'charge'] },
  exam_3: { name: '시험관 골렘 (상급)', lv: 36, ch: 0, role: 'exam', scale: 2.2, art: { t: 'golem', c: S('#8a5ab0'), deco: 'rune', eye: S('#ffd0a0') }, ai: 'melee', pattern: ['slam', 'spread', 'charge', 'icerain'] },
  exam_4: { name: '대마법사 오르벤의 환영', lv: 50, ch: 0, role: 'exam', scale: 2, art: { t: 'human', skin: [246, 211, 179], hair: S('#e1e1e6'), style: 'bald', outfit: S('#4650a0'), kind: 'robe', band: S('#e3b341'), beard: true, hat: { c: S('#373c82'), band: S('#e3b341') }, staff: { orb: S('#a0e0ff') } }, ai: 'caster', proj: 'arcane', pattern: ['spread', 'icerain', 'darkrain', 'blink', 'timestop'] },
};

for (const [id, m] of Object.entries(MONSTERS)) { m.id = id; m.role = m.role || 'normal'; m.scale = m.scale || 1; }
