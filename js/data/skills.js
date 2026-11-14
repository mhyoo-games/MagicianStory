// 스킬 200개: 아홉 속성 × 22 + 공용 2.
// rank: 0 견습 · 1 초급 · 2 중급 · 3 상급 · 4 익스퍼트 (그 계급이 되어야 배울 수 있음)
// kind: bolt(탄) multi(부채꼴 여러 발) nova(내 주위) area(앞쪽 지점) rain(여러 번 떨어짐) line(관통 줄기)
//       field(남는 장판) orbit(내 주위를 도는 구슬) chain(번쩍 튀는 번개) buff heal dash passive
// st: 걸리는 상태 — burn 화상 · poison 중독 · slow 느려짐 · freeze 얼음 · root 속박 · stun 기절 · knock 밀려남
//     curse 방어 약화 · drain 흡혈 · blind 눈부심(공격 못 함)

export const ELEMENTS = ['fire', 'water', 'ice', 'wind', 'dark', 'light', 'wood', 'earth', 'time'];
export const ELEM_NAME = { fire: '불', water: '물', ice: '얼음', wind: '바람', dark: '어둠', light: '빛', wood: '나무', earth: '흙', time: '시간', arcane: '무속성' };
export const ELEM_ICON = { fire: '🔥', water: '💧', ice: '❄️', wind: '🌪️', dark: '🌑', light: '✨', wood: '🌿', earth: '🪨', time: '⏳', arcane: '🔮' };
export const ELEM_DESC = {
  fire: '강한 한 방과 화상. 불길이 번지는 공격 마법의 꽃.',
  water: '밀어내기와 회복을 함께. 흐름을 다루는 균형의 길.',
  ice: '느리게 하고 얼려 버리는 통제의 달인.',
  wind: '빠른 탄과 튀는 번개. 폭풍을 부르는 속도의 길.',
  dark: '적을 약하게 하고 생명을 빼앗는 위험한 힘.',
  light: '치유와 눈부신 빛줄기. 언데드의 천적.',
  wood: '덩굴로 묶고 독을 퍼뜨리며 스스로 되살아나는 생명의 길.',
  earth: '기절과 단단한 방어. 묵직한 바위의 힘.',
  time: '적을 늦추고 나를 빠르게, 재사용 시간을 되돌리는 희귀한 길.',
};
export const RANK_NAME = ['견습', '초급', '중급', '상급', '익스퍼트'];

// [이름, 종류, 계급, 추가 설정]
const T = {
  fire: [
    ['불씨탄', 'bolt', 0, { st: 'burn' }],
    ['작은 불꽃', 'nova', 0, { r: 36 }],
    ['파이어볼', 'bolt', 1, { st: 'burn', big: 1, boom: 26 }],
    ['화염 부채', 'multi', 1, { n: 3 }],
    ['불꽃 손길', 'passive', 1, { pas: { elem: 10 } }],
    ['타오르는 의지', 'buff', 1, { buff: { matk: 15 } }],
    ['화염 폭발', 'area', 1, { r: 40, st: 'burn' }],
    ['연속 파이어볼', 'multi', 2, { n: 5, spread: 0.5, st: 'burn' }],
    ['불의 장벽', 'field', 2, { r: 34, st: 'burn' }],
    ['화염 고리', 'nova', 2, { r: 60, st: 'burn' }],
    ['플레임 랜스', 'line', 2, { len: 150 }],
    ['열기 순환', 'passive', 2, { pas: { mpRegen: 0.6 } }],
    ['메테오', 'area', 3, { r: 64, delay: 0.9, st: 'burn' }],
    ['불사조의 춤', 'orbit', 3, { n: 3 }],
    ['화염 폭풍', 'rain', 3, { r: 80, n: 8 }],
    ['작열', 'passive', 3, { pas: { elem: 15, crit: 3 } }],
    ['지옥불 창', 'line', 3, { len: 200, st: 'burn', w: 18 }],
    ['대폭발', 'nova', 4, { r: 100, st: 'burn' }],
    ['유성우', 'rain', 4, { r: 120, n: 14, boomR: 26 }],
    ['태양의 분노', 'area', 4, { r: 96, delay: 1.1, st: 'burn' }],
    ['꺼지지 않는 불꽃', 'buff', 4, { buff: { matk: 30, crit: 10 } }],
    ['화염의 화신', 'passive', 4, { pas: { elem: 25 } }],
  ],
  water: [
    ['물방울탄', 'bolt', 0, { st: 'knock' }],
    ['맑은 샘', 'heal', 0, { heal: 0.18 }],
    ['워터볼', 'bolt', 1, { big: 1, st: 'knock', boom: 22 }],
    ['물보라', 'nova', 1, { r: 44, st: 'knock' }],
    ['흐르는 마나', 'passive', 1, { pas: { mpRegen: 0.5, mp: 30 } }],
    ['물의 장막', 'buff', 1, { buff: { def: 20 } }],
    ['물줄기', 'line', 1, { len: 130, st: 'knock' }],
    ['파도', 'line', 2, { len: 180, w: 30, st: 'knock' }],
    ['소용돌이', 'field', 2, { r: 40, st: 'slow', pull: 1 }],
    ['치유의 비', 'heal', 2, { heal: 0.3, regen: 1 }],
    ['쌍둥이 워터볼', 'multi', 2, { n: 2, spread: 0.25, big: 1 }],
    ['맑은 정신', 'passive', 2, { pas: { mp: 60, cdr: 4 } }],
    ['해일', 'line', 3, { len: 240, w: 40, st: 'knock' }],
    ['물의 구슬', 'orbit', 3, { n: 4 }],
    ['폭우', 'rain', 3, { r: 90, n: 10, st: 'slow' }],
    ['생명의 샘', 'passive', 3, { pas: { hp: 120, regen: 2 } }],
    ['물기둥', 'area', 3, { r: 50, st: 'knock' }],
    ['대해일', 'line', 4, { len: 300, w: 56, st: 'knock' }],
    ['심해의 소용돌이', 'field', 4, { r: 70, st: 'slow', pull: 1 }],
    ['성수의 축복', 'heal', 4, { heal: 0.6, regen: 1 }],
    ['물의 정령 강림', 'buff', 4, { buff: { def: 30, regen: 4, matk: 15 } }],
    ['바다의 마음', 'passive', 4, { pas: { elem: 20, mp: 100 } }],
  ],
  ice: [
    ['얼음 조각', 'bolt', 0, { st: 'slow' }],
    ['서리 숨결', 'nova', 0, { r: 34, st: 'slow' }],
    ['아이스 볼트', 'bolt', 1, { big: 1, st: 'slow' }],
    ['얼음 파편', 'multi', 1, { n: 4, st: 'slow' }],
    ['차가운 머리', 'passive', 1, { pas: { crit: 4 } }],
    ['얼음 갑옷', 'buff', 1, { buff: { def: 25 } }],
    ['서리 폭발', 'area', 1, { r: 38, st: 'freeze' }],
    ['빙결 고리', 'nova', 2, { r: 58, st: 'freeze' }],
    ['얼음 창', 'line', 2, { len: 160, st: 'slow' }],
    ['눈보라', 'field', 2, { r: 44, st: 'slow' }],
    ['얼음 비', 'rain', 2, { r: 70, n: 6, st: 'slow' }],
    ['한기 흡수', 'passive', 2, { pas: { elem: 12 } }],
    ['블리자드', 'rain', 3, { r: 100, n: 12, st: 'slow' }],
    ['얼음 결정 방패', 'orbit', 3, { n: 3 }],
    ['절대 영도', 'nova', 3, { r: 76, st: 'freeze' }],
    ['빙하의 가호', 'passive', 3, { pas: { def: 25, hp: 80 } }],
    ['서리 거인의 주먹', 'area', 3, { r: 56, delay: 0.7, st: 'freeze' }],
    ['영원의 겨울', 'field', 4, { r: 90, st: 'freeze' }],
    ['빙결 감옥', 'area', 4, { r: 80, st: 'freeze', delay: 0.6 }],
    ['얼음 혜성', 'rain', 4, { r: 120, n: 12, boomR: 28, st: 'slow' }],
    ['얼음 여왕의 축복', 'buff', 4, { buff: { def: 40, crit: 12 } }],
    ['얼어붙은 심장', 'passive', 4, { pas: { elem: 25, crit: 5 } }],
  ],
  wind: [
    ['바람 칼날', 'bolt', 0, { fast: 1, pierce: 1 }],
    ['돌풍', 'nova', 0, { r: 40, st: 'knock' }],
    ['윈드 커터', 'bolt', 1, { fast: 1, pierce: 1, big: 1 }],
    ['트윈 커터', 'multi', 1, { n: 2, spread: 0.3, fast: 1, pierce: 1 }],
    ['가벼운 발걸음', 'passive', 1, { pas: { speed: 8 } }],
    ['순풍', 'buff', 1, { buff: { speed: 25, cdr: 10 } }],
    ['스파크', 'chain', 1, { n: 3, style: 'storm' }],
    ['회오리', 'field', 2, { r: 36, st: 'knock', move: 1 }],
    ['라이트닝', 'chain', 2, { n: 5, style: 'storm' }],
    ['진공 베기', 'line', 2, { len: 170, w: 16 }],
    ['바람의 장벽', 'orbit', 2, { n: 2, st: 'knock' }],
    ['질풍의 감각', 'passive', 2, { pas: { cdr: 6, speed: 6 } }],
    ['토네이도', 'field', 3, { r: 54, st: 'knock', move: 1 }],
    ['썬더볼트', 'area', 3, { r: 44, st: 'stun', style: 'storm', delay: 0.3 }],
    ['칼바람 폭풍', 'multi', 3, { n: 8, spread: 1.6, fast: 1, pierce: 1 }],
    ['폭풍의 눈', 'passive', 3, { pas: { crit: 6, cdr: 5 } }],
    ['연쇄 번개', 'chain', 3, { n: 8, style: 'storm' }],
    ['썬더스톰', 'rain', 4, { r: 120, n: 14, st: 'stun', style: 'storm' }],
    ['하늘 가르기', 'line', 4, { len: 320, w: 30 }],
    ['대선풍', 'field', 4, { r: 80, st: 'knock', move: 1, pull: 1 }],
    ['바람의 정령 강림', 'buff', 4, { buff: { speed: 40, cdr: 25 } }],
    ['폭풍의 화신', 'passive', 4, { pas: { elem: 25, speed: 10 } }],
  ],
  dark: [
    ['어둠 구슬', 'bolt', 0, { st: 'curse' }],
    ['생명 흡수', 'bolt', 0, { st: 'drain' }],
    ['섀도 볼', 'bolt', 1, { big: 1, st: 'curse' }],
    ['저주의 손길', 'area', 1, { r: 40, st: 'curse' }],
    ['어둠에 익숙함', 'passive', 1, { pas: { drain: 2 } }],
    ['피의 계약', 'buff', 1, { buff: { matk: 25, def: -10 } }],
    ['그림자 화살', 'multi', 1, { n: 3, st: 'drain' }],
    ['어둠의 늪', 'field', 2, { r: 44, st: 'slow' }],
    ['영혼 흡수', 'nova', 2, { r: 56, st: 'drain' }],
    ['그림자 창', 'line', 2, { len: 170, st: 'curse' }],
    ['검은 구슬', 'orbit', 2, { n: 3, st: 'drain' }],
    ['어둠의 갈망', 'passive', 2, { pas: { drain: 3, elem: 8 } }],
    ['블랙홀', 'field', 3, { r: 64, pull: 1, st: 'curse' }],
    ['죽음의 손', 'area', 3, { r: 50, delay: 0.5, st: 'drain' }],
    ['어둠의 비', 'rain', 3, { r: 100, n: 10, st: 'curse' }],
    ['밤의 지배자', 'passive', 3, { pas: { elem: 15, crit: 4 } }],
    ['악몽', 'nova', 3, { r: 80, st: 'stun' }],
    ['심연', 'field', 4, { r: 96, pull: 1, st: 'curse' }],
    ['영혼 수확', 'nova', 4, { r: 110, st: 'drain' }],
    ['검은 태양', 'area', 4, { r: 100, delay: 1, st: 'curse' }],
    ['어둠의 화신', 'buff', 4, { buff: { matk: 40, drain: 8 } }],
    ['밤의 왕관', 'passive', 4, { pas: { elem: 25, drain: 4 } }],
  ],
  light: [
    ['빛의 화살', 'bolt', 0, { fast: 1 }],
    ['작은 치유', 'heal', 0, { heal: 0.2 }],
    ['홀리 볼트', 'bolt', 1, { big: 1, st: 'blind' }],
    ['섬광', 'nova', 1, { r: 50, st: 'blind' }],
    ['빛의 은총', 'passive', 1, { pas: { hp: 50, regen: 1 } }],
    ['축복', 'buff', 1, { buff: { matk: 12, def: 12 } }],
    ['빛줄기', 'line', 1, { len: 150 }],
    ['빛의 구슬', 'orbit', 2, { n: 2 }],
    ['성스러운 빛', 'area', 2, { r: 48, st: 'blind' }],
    ['치유의 빛', 'heal', 2, { heal: 0.35 }],
    ['프리즘 화살', 'multi', 2, { n: 5, spread: 0.9, fast: 1 }],
    ['맑은 영혼', 'passive', 2, { pas: { mp: 50, elem: 8 } }],
    ['심판의 빛기둥', 'area', 3, { r: 44, delay: 0.6, st: 'stun' }],
    ['성역', 'field', 3, { r: 60, heal: 1 }],
    ['빛의 비', 'rain', 3, { r: 100, n: 10, st: 'blind' }],
    ['신성한 가호', 'passive', 3, { pas: { def: 20, hp: 100 } }],
    ['광휘의 창', 'line', 3, { len: 260, w: 22 }],
    ['천상의 빛', 'nova', 4, { r: 110, st: 'blind' }],
    ['신의 심판', 'rain', 4, { r: 130, n: 12, st: 'stun', boomR: 26 }],
    ['부활의 빛', 'heal', 4, { heal: 0.8, regen: 1 }],
    ['빛의 정령 강림', 'buff', 4, { buff: { matk: 25, def: 25, regen: 4 } }],
    ['태양의 화신', 'passive', 4, { pas: { elem: 25, hp: 150 } }],
  ],
  wood: [
    ['가시 씨앗', 'bolt', 0, { st: 'poison' }],
    ['풀잎 치유', 'heal', 0, { heal: 0.12, regen: 1 }],
    ['덩굴 채찍', 'line', 1, { len: 110, st: 'root' }],
    ['나뭇잎 폭풍', 'multi', 1, { n: 5, spread: 1.1, st: 'poison' }],
    ['숲의 숨결', 'passive', 1, { pas: { regen: 2, hp: 40 } }],
    ['나무 껍질 피부', 'buff', 1, { buff: { def: 30 } }],
    ['독 포자', 'area', 1, { r: 40, st: 'poison' }],
    ['속박의 덩굴', 'area', 2, { r: 48, st: 'root' }],
    ['독 안개', 'field', 2, { r: 48, st: 'poison' }],
    ['가시 덤불', 'nova', 2, { r: 54, st: 'root' }],
    ['씨앗 폭탄', 'multi', 2, { n: 3, big: 1, boom: 22, st: 'poison' }],
    ['뿌리 깊은 나무', 'passive', 2, { pas: { def: 15, hp: 60 } }],
    ['대지의 덩굴', 'line', 3, { len: 220, w: 26, st: 'root' }],
    ['꽃잎 회오리', 'orbit', 3, { n: 5, st: 'poison' }],
    ['맹독의 비', 'rain', 3, { r: 100, n: 10, st: 'poison' }],
    ['생명의 나무', 'field', 3, { r: 56, heal: 1 }],
    ['숲의 분노', 'nova', 3, { r: 80, st: 'root' }],
    ['세계수의 뿌리', 'area', 4, { r: 100, st: 'root', delay: 0.6 }],
    ['식인 꽃밭', 'field', 4, { r: 90, st: 'poison' }],
    ['천 개의 가시', 'multi', 4, { n: 14, spread: 6.28, st: 'poison' }],
    ['숲의 정령 강림', 'buff', 4, { buff: { regen: 8, def: 30 } }],
    ['초록의 화신', 'passive', 4, { pas: { elem: 25, regen: 4 } }],
  ],
  earth: [
    ['돌멩이', 'bolt', 0, { st: 'stun', stunCh: 0.1 }],
    ['흙먼지', 'nova', 0, { r: 36, st: 'slow' }],
    ['바위 던지기', 'bolt', 1, { big: 1, st: 'stun', boom: 20 }],
    ['돌 파편', 'multi', 1, { n: 4 }],
    ['단단한 몸', 'passive', 1, { pas: { def: 12, hp: 40 } }],
    ['바위 피부', 'buff', 1, { buff: { def: 40, speed: -10 } }],
    ['땅 울림', 'nova', 1, { r: 50, st: 'stun' }],
    ['대지 가시', 'line', 2, { len: 150, st: 'stun' }],
    ['바위 소나기', 'rain', 2, { r: 70, n: 6, st: 'stun' }],
    ['모래 늪', 'field', 2, { r: 46, st: 'slow' }],
    ['돌 방패', 'orbit', 2, { n: 2, st: 'knock' }],
    ['대지의 힘', 'passive', 2, { pas: { elem: 10, def: 10 } }],
    ['지진', 'nova', 3, { r: 90, st: 'stun' }],
    ['거대 바위', 'bolt', 3, { big: 2, pierce: 1, st: 'stun', boom: 36 }],
    ['운석 낙하', 'area', 3, { r: 60, delay: 0.9, st: 'stun' }],
    ['산의 인내', 'passive', 3, { pas: { def: 30, hp: 120 } }],
    ['모래 폭풍', 'field', 3, { r: 70, st: 'blind', move: 1 }],
    ['대륙 붕괴', 'nova', 4, { r: 120, st: 'stun' }],
    ['천벌의 바위', 'rain', 4, { r: 120, n: 10, boomR: 32, st: 'stun' }],
    ['골렘의 주먹', 'area', 4, { r: 80, delay: 0.5, st: 'stun' }],
    ['대지의 정령 강림', 'buff', 4, { buff: { def: 60, matk: 20 } }],
    ['대지의 화신', 'passive', 4, { pas: { elem: 25, def: 30 } }],
  ],
  time: [
    ['초침탄', 'bolt', 0, { st: 'slow' }],
    ['한 박자 빠르게', 'buff', 0, { buff: { speed: 15 } }],
    ['시간 왜곡탄', 'bolt', 1, { big: 1, st: 'slow' }],
    ['느린 시간', 'nova', 1, { r: 56, st: 'slow' }],
    ['시간 감각', 'passive', 1, { pas: { cdr: 5 } }],
    ['가속', 'buff', 1, { buff: { speed: 20, cdr: 15 } }],
    ['되감기', 'heal', 1, { heal: 0.25 }],
    ['시계 바늘', 'orbit', 2, { n: 2, st: 'slow' }],
    ['시간 정지 구역', 'field', 2, { r: 46, st: 'freeze' }],
    ['과거의 메아리', 'multi', 2, { n: 3, spread: 0.2, big: 1 }],
    ['순간 이동', 'dash', 2, { dist: 90 }],
    ['흐르는 모래', 'passive', 2, { pas: { cdr: 6, mpRegen: 0.4 } }],
    ['시간 폭발', 'area', 3, { r: 56, st: 'stun' }],
    ['평행 시간', 'buff', 3, { buff: { cdr: 30, matk: 15 } }],
    ['멈춘 세계', 'nova', 3, { r: 90, st: 'freeze' }],
    ['시간의 주인', 'passive', 3, { pas: { cdr: 8, crit: 4 } }],
    ['노화', 'line', 3, { len: 220, st: 'curse' }],
    ['시간 붕괴', 'rain', 4, { r: 120, n: 12, st: 'slow' }],
    ['영겁의 감옥', 'field', 4, { r: 90, st: 'freeze' }],
    ['종말의 시계', 'nova', 4, { r: 120, st: 'stun' }],
    ['크로노스의 축복', 'buff', 4, { buff: { cdr: 45, speed: 30 } }],
    ['시간의 화신', 'passive', 4, { pas: { elem: 25, cdr: 10 } }],
  ],
};

const BASE_POWER = [1.0, 1.55, 2.2, 3.0, 4.1];
const BASE_MP = [6, 11, 18, 28, 42];
const KIND = {
  bolt: { pw: 1.0, mp: 1.0, cd: 0.7 }, multi: { pw: 0.62, mp: 1.4, cd: 1.6 }, nova: { pw: 1.25, mp: 1.5, cd: 4 },
  area: { pw: 1.6, mp: 1.6, cd: 5 }, rain: { pw: 0.75, mp: 2.0, cd: 9 }, line: { pw: 1.35, mp: 1.3, cd: 3 },
  field: { pw: 0.32, mp: 1.8, cd: 9 }, orbit: { pw: 0.55, mp: 1.8, cd: 14 }, chain: { pw: 0.95, mp: 1.2, cd: 2.5 },
  buff: { pw: 0, mp: 1.6, cd: 25 }, heal: { pw: 0, mp: 1.8, cd: 14 }, dash: { pw: 0, mp: 0.8, cd: 3 }, passive: { pw: 0, mp: 0, cd: 0 },
};
const DUR = { field: 4, orbit: 8, buff: 15 };

const ST_TEXT = { burn: '화상', poison: '중독', slow: '느려짐', freeze: '얼림', root: '속박', stun: '기절', knock: '밀쳐냄', curse: '방어 약화', drain: '생명 흡수', blind: '눈부심' };
export const STAT_NAME = { matk: '마력', def: '방어', hp: '체력', mp: '마나', crit: '치명타', cdr: '재사용 감소', speed: '이동 속도', mpRegen: '마나 회복', regen: '체력 회복', elem: '속성 피해', drain: '흡혈', shield: '마나 실드', gold: '골드 획득', exp: '경험치' };

export const SKILLS = {};
for (const el of Object.keys(T)) {
  T[el].forEach(([name, kind, rank, x], i) => {
    const k = KIND[kind];
    const id = `${el}_${String(i + 1).padStart(2, '0')}`;
    const s = {
      id, name, el, kind, rank, order: i,
      power: +(BASE_POWER[rank] * k.pw * (x.big === 2 ? 1.6 : x.big ? 1.25 : 1)).toFixed(2),
      mp: Math.round(BASE_MP[rank] * k.mp),
      cd: +(k.cd * (x.big ? 1.3 : 1) * (x.n && kind === 'multi' ? 1 + x.n * 0.05 : 1)).toFixed(1),
      dur: x.dur || DUR[kind] || 0,
      ...x,
    };
    if (kind === 'buff' && rank === 4) s.dur = 20;
    // 앞 스킬을 먼저 배워야 하는 것: 같은 속성에서 바로 아래 계급의 첫 스킬
    const prevFirst = T[el].findIndex((t) => t[2] === rank - 1);
    if (rank > 0 && prevFirst >= 0) s.req = `${el}_${String(prevFirst + 1).padStart(2, '0')}`;
    s.desc = describe(s);
    SKILLS[id] = s;
  });
}
// 공용 (누구나 배울 수 있음)
SKILLS.common_shield = { id: 'common_shield', name: '마나 실드', el: 'arcane', kind: 'buff', rank: 0, order: 0, power: 0, mp: 14, cd: 30, dur: 10, buff: { shield: 1 }, desc: '받는 피해의 절반을 MP로 대신 받아요 (10초).' };
SKILLS.common_blink = { id: 'common_blink', name: '블링크', el: 'arcane', kind: 'dash', rank: 1, order: 1, power: 0, mp: 10, cd: 4, dist: 70, desc: '보는 방향으로 순간 이동해요. 위험한 공격을 피할 때!' };

function describe(s) {
  const st = s.st ? ` · ${ST_TEXT[s.st]}` : '';
  switch (s.kind) {
    case 'bolt': return `앞으로 ${s.big ? '큰 ' : ''}마법 탄을 쏴요${s.pierce ? ' (관통)' : ''}${s.boom ? ' · 맞으면 터짐' : ''}${st}.`;
    case 'multi': return s.spread >= 6 ? `사방으로 ${s.n}발을 흩뿌려요${st}.` : `부채꼴로 ${s.n}발을 쏴요${st}.`;
    case 'nova': return `내 주위를 한꺼번에 공격해요 (반경 ${s.r})${st}.`;
    case 'area': return `앞쪽 지점에 ${s.delay ? '잠시 뒤 ' : ''}큰 마법이 터져요 (반경 ${s.r})${st}.`;
    case 'rain': return `넓은 곳에 마법이 ${s.n}번 쏟아져요${st}.`;
    case 'line': return `앞으로 길게 뻗어 줄 위의 적을 모두 맞혀요${st}.`;
    case 'field': return s.heal ? `서 있으면 체력이 차오르는 장판을 깔아요 (${s.dur}초).` : `${s.dur}초 동안 남는 장판을 깔아요${s.pull ? ' · 끌어당김' : ''}${s.move ? ' · 앞으로 움직임' : ''}${st}.`;
    case 'orbit': return `내 주위를 도는 구슬 ${s.n}개를 불러요 (${s.dur}초)${st}.`;
    case 'chain': return `번개가 가까운 적 ${s.n}명에게 튀어요${st}.`;
    case 'heal': return `체력을 ${Math.round(s.heal * 100)}% 되찾아요${s.regen ? ' · 잠시 계속 회복' : ''}.`;
    case 'dash': return '보는 방향으로 순간 이동해요.';
    case 'buff': return `${s.dur}초 동안 ${statText(s.buff, true)}.`;
    case 'passive': return `늘 켜져 있어요: ${statText(s.pas)}.`;
  }
  return '';
}
export function statText(o, buff = false) {
  const PCT = buff ? ['matk', 'def', 'speed', 'cdr', 'crit', 'drain', 'gold', 'exp', 'elem'] : ['crit', 'cdr', 'speed', 'elem', 'drain', 'gold', 'exp'];
  return Object.entries(o).filter(([k]) => k !== 'shield').map(([k, v]) => {
    const unit = PCT.includes(k) ? '%' : (k === 'regen' || k === 'mpRegen') ? '/초' : '';
    return `${STAT_NAME[k] || k} ${v > 0 ? '+' : ''}${+(+v).toFixed(1)}${unit}`;
  }).join(', ');
}

// 스킬 레벨(1~5)에 따른 실제 수치
export function skillAt(s, lv = 1) {
  const k = 1 + (lv - 1) * 0.14;
  return { ...s, lv, power: s.power * k, mp: Math.round(s.mp * (1 + (lv - 1) * 0.08)), heal: s.heal ? s.heal * (1 + (lv - 1) * 0.08) : 0,
    buff: s.buff ? scaleObj(s.buff, 1 + (lv - 1) * 0.12) : null, pas: s.pas ? scaleObj(s.pas, lv) : null };
}
function scaleObj(o, k) { const r = {}; for (const [a, v] of Object.entries(o)) r[a] = a === 'shield' ? v : +(v * k).toFixed(2); return r; }
export const SKILL_MAX_LV = 5;
