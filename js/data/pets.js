// 펫 16종. 하나를 데리고 다니면 효과가 켜진다. 같은 펫을 또 뽑으면 레벨이 올라 효과가 세진다 (최대 Lv.5).
// eff: 늘 켜진 능력 (레벨마다 lvK배씩 오름) · act: 펫이 직접 하는 행동
export const PET_RARITY = [
  { name: '일반', color: '#d8d0c0' }, { name: '고급', color: '#7ad070' }, { name: '희귀', color: '#6aa8ff' },
  { name: '영웅', color: '#c080ff' }, { name: '전설', color: '#ffb040' },
];
export const PETS = {
  carrot: { name: '캐럿', rar: 0, model: 'cat', c: '#f08a34', c2: '#fbe3c8', stripes: '#c4621f', eff: { gold: 6, pickup: 1 }, desc: '처음부터 함께한 주황 고양이. 골드를 더 많이 주워 와요.' },
  ash: { name: '잿빛 고양이', rar: 0, model: 'cat', c: '#8c909c', c2: '#c8cad2', stripes: '#646874', eff: { exp: 5 }, desc: '경험치를 조금 더 얻어요.' },
  jelly: { name: '아기 슬라임', rar: 0, model: 'slime', c: '#7ed36a', eff: { regen: 0.6 }, desc: '곁에 있으면 체력이 천천히 차요.' },
  sparrow: { name: '참새', rar: 0, model: 'bird', c: '#a0784a', c2: '#e8d8b8', eff: { speed: 4 }, desc: '조금 더 빨리 걸어요.' },
  midnight: { name: '검은 고양이', rar: 1, model: 'cat', c: '#302c3a', c2: '#46424e', eye: '#f0d23c', eff: { crit: 3 }, desc: '치명타가 조금 더 잘 터져요.' },
  snow: { name: '흰 고양이', rar: 1, model: 'cat', c: '#f4f2ee', c2: '#ffffff', eye: '#50a0e0', eff: { mpRegen: 0.5 }, desc: '마나가 더 빨리 차요.' },
  owl: { name: '부엉이', rar: 1, model: 'owl', c: '#8a6a4a', c2: '#e8d8b8', eff: { drop: 12 }, desc: '장비·재료가 더 잘 떨어져요.' },
  fox: { name: '여우', rar: 2, model: 'fox', c: '#e8823a', c2: '#fff4e4', eff: { matk: 4 }, act: { kind: 'shoot', el: 'fire', power: 0.5, every: 1.6 }, desc: '내가 공격할 때 여우불을 함께 쏴요.' },
  bunny: { name: '달토끼', rar: 2, model: 'bunny', c: '#f4f0f8', c2: '#f0a8c0', eff: { speed: 8, blinkCd: 15 }, desc: '이동 속도가 빨라지고 블링크가 빨리 돌아와요.' },
  turtle: { name: '바위 거북', rar: 2, model: 'turtle', c: '#6a9a5a', c2: '#8a7050', eff: { dmgTaken: -8 }, desc: '받는 피해가 줄어요.' },
  ember: { name: '불꽃 정령', rar: 3, model: 'wisp', c: '#ff8a3a', eff: { elemAll: 6 }, act: { kind: 'burn', chance: 0.15 }, desc: '내 공격이 15% 확률로 불을 붙여요.' },
  frost: { name: '얼음 요정', rar: 3, model: 'wisp', c: '#9fe6ff', eff: { def: 6 }, act: { kind: 'aura', st: 'slow', r: 3.5 }, desc: '가까이 온 적을 느리게 만들어요.' },
  pebble: { name: '꼬마 골렘', rar: 3, model: 'golem', c: '#9a8a7a', eff: { hp: 60 }, act: { kind: 'shield', every: 8, amount: 0.08 }, desc: '8초마다 보호막을 씌워 줘요.' },
  dragonling: { name: '아기 용', rar: 4, model: 'dragon', c: '#d04030', c2: '#f0c070', eff: { elemAll: 10 }, act: { kind: 'breath', power: 1.6, every: 5 }, desc: '5초마다 앞의 적에게 불을 뿜고, 모든 피해가 늘어요.' },
  starcat: { name: '별빛 고양이', rar: 4, model: 'cat', c: '#3a3a7a', c2: '#a0a0ff', stripes: '#ffe27a', glow: '#ffe27a', eff: { exp: 18, gold: 18, drop: 10 }, desc: '경험치·골드·드랍이 모두 크게 늘어요.' },
  chronowl: { name: '시간 부엉이', rar: 4, model: 'owl', c: '#5a4a8a', c2: '#e8c060', glow: '#e8c060', eff: { cdr: 10, mpRegen: 0.8 }, desc: '모든 스킬이 빨리 돌아오고 마나가 빨리 차요.' },
};
for (const [id, p] of Object.entries(PETS)) p.id = id;

// 펫 상자 (상점). 등급 확률 %
export const PET_BOXES = {
  basic: { name: '펫 상자', price: 1500, odds: [55, 30, 11, 3.5, 0.5], icon: '🎁' },
  shiny: { name: '빛나는 펫 상자', price: 9000, odds: [0, 45, 35, 16, 4], icon: '🌟' },
};
export const PET_MAX_LV = 5;
export function petEff(id, lv = 1) {
  const p = PETS[id], k = 1 + (lv - 1) * 0.35, o = {};
  for (const [a, v] of Object.entries(p.eff)) o[a] = a === 'pickup' ? v : +(v * k).toFixed(2);
  return o;
}
