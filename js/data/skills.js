// 스킬 56개 = 아홉 원소 × 6 + 공용 2 (블링크·마나 실드).
// 원소마다 「원소 특성」이 하나씩 있어, 그 원소 스킬로 맞히면 늘 켜진다 (ELEMENT_TRAIT).
// 스킬은 Lv.1~5. Lv.3이 되면 특성 A/B 가운데 하나를 골라 성질이 바뀐다 (traits).
// rank: 0 견습 · 1 초급 · 2 중급 · 3 상급 · 4 익스퍼트 — 그 계급이 되어야 배울 수 있다.
// kind: bolt 탄 · cone 부채꼴 숨결 · nova 내 주위 · area 지점 폭발 · rain 쏟아짐 · line 관통 줄기 · field 장판
//       orbit 도는 구슬 · chain 연쇄 · summon 소환 · buff 강화 · heal 회복 · blink 순간 이동 · stop 시간 정지 · wave 큰 물결

export const ELEMENTS = ['fire', 'water', 'ice', 'wind', 'dark', 'light', 'wood', 'earth', 'time'];
export const ELEM_NAME = { fire: '불', water: '물', ice: '얼음', wind: '바람', dark: '어둠', light: '빛', wood: '나무', earth: '흙', time: '시간', arcane: '무속성' };
export const ELEM_ICON = { fire: '🔥', water: '💧', ice: '❄️', wind: '🌪️', dark: '🌑', light: '✨', wood: '🌿', earth: '🪨', time: '⏳', arcane: '🔮' };
export const ELEM_COLOR = { fire: '#ff7a2a', water: '#3a9cff', ice: '#9fe6ff', wind: '#6fe0b8', dark: '#9a5ae0', light: '#ffe27a', wood: '#7ccf4a', earth: '#c49a5a', time: '#e8c060', arcane: '#b48cff' };
export const RANK_NAME = ['견습', '초급', '중급', '상급', '익스퍼트'];

export const ELEMENT_TRAIT = {
  fire: { name: '점화', desc: '불 스킬에 맞으면 화상이 1겹씩 쌓여요 (최대 5). 5겹이 되면 터져서 주위에 큰 피해를 주고 처음부터 다시 쌓여요.' },
  water: { name: '흐름', desc: '서로 다른 스킬을 이어 쓰면 흐름이 1씩 쌓여요 (최대 5, 1마다 피해 +6%). 같은 스킬을 두 번 연달아 쓰면 사라져요. 물 스킬로 맞히면 체력을 조금 되찾아요.' },
  ice: { name: '동결', desc: '얼음 스킬은 냉기를 쌓아 느리게 하고, 3겹이면 2초 동안 얼려요. 얼어 있는 적을 맞히면 깨지면서 피해가 60% 더 들어가요.' },
  wind: { name: '질풍', desc: '움직이는 동안 바람 스킬의 재사용 시간이 빨리 돌아요. 밀쳐낸 적이 벽에 부딪히면 기절하고 피해를 더 받아요.' },
  dark: { name: '잠식', desc: '어둠 스킬에 맞은 적은 잠식되어 계속 피해를 받고 방어가 15% 떨어져요. 잠식된 적을 쓰러뜨리면 마나를 되찾아요.' },
  light: { name: '광휘', desc: '빛 스킬로 맞히면 준 피해의 일부만큼 체력을 되찾아요. 언데드와 어둠 몬스터에게는 30% 더 아파요.' },
  wood: { name: '개화', desc: '나무 스킬에 맞은 자리에 씨앗이 심겨요. 3초 뒤 꽃이 피며 주위를 공격하고 묶은 뒤 내 체력을 채워 줘요.' },
  earth: { name: '견고', desc: '흙 스킬을 쓸 때마다 보호막이 쌓여요 (최대 3겹). 보호막이 있는 동안에는 밀려나거나 기절하지 않아요.' },
  time: { name: '가속', desc: '시간 스킬로 맞힐 때마다 다른 스킬의 재사용 시간이 줄어요. 느려진 적에게는 20% 더 아파요.' },
};

// [이름, 종류, 계급, 기본 설정, 특성A, 특성B]
// 특성은 { name, desc, ...덮어쓸 설정 }
const T = {
  fire: [
    ['파이어볼', 'bolt', 0, { power: 1.25, mp: 5, cd: 1.1, boom: 1.6, look: 'fireball' },
      { name: '세 갈래', desc: '부채꼴로 세 발을 쏴요.', n: 3, spread: 0.5, power: 0.95 }, { name: '작열탄', desc: '폭발이 커지고 화상이 2겹 쌓여요.', boom: 2.8, stack: 2 }],
    ['화염 고리', 'nova', 1, { power: 1.5, mp: 9, cd: 5, r: 3.2 },
      { name: '불꽃 방패', desc: '쓰고 나서 3초 동안 받는 피해가 25% 줄어요.', guard: 25 }, { name: '연속 폭발', desc: '0.6초 뒤 한 번 더 터져요.', twice: 0.6 }],
    ['불의 장벽', 'field', 1, { power: 0.45, mp: 12, cd: 9, r: 2.4, dur: 4 },
      { name: '불길 행진', desc: '장판이 앞으로 천천히 나아가요.', move: 2.2 }, { name: '지옥문', desc: '범위가 50% 넓어지고 2초 더 남아요.', r: 3.6, dur: 6 }],
    ['플레임 랜스', 'line', 2, { power: 2.6, mp: 14, cd: 4, len: 10, w: 1.1 },
      { name: '긴 창', desc: '길이가 40% 늘어요.', len: 14 }, { name: '화산 분출', desc: '창 끝에서 크게 터져요.', endBoom: 2.6 }],
    ['메테오', 'area', 3, { power: 4.2, mp: 24, cd: 9, r: 3.2, delay: 0.9, st: 'stun' },
      { name: '유성우', desc: '작은 운석 다섯 개가 흩어져 떨어져요.', rainN: 5, power: 1.8, r: 2 }, { name: '대운석', desc: '범위와 피해가 크게 늘어요.', r: 4.6, power: 5.6 }],
    ['불사조 강림', 'summon', 4, { power: 1.4, mp: 40, cd: 40, dur: 12, ally: 'phoenix' },
      { name: '재탄생', desc: '소환해 둔 동안 쓰러지면 한 번 되살아나요.', revive: 1 }, { name: '불새의 날개', desc: '불사조가 화염탄을 두 배로 쏴요.', rate: 2 }],
  ],
  water: [
    ['워터볼', 'bolt', 0, { power: 1.15, mp: 4, cd: 0.9, st: 'knock', look: 'waterball' },
      { name: '물수제비', desc: '맞은 뒤 가까운 적에게 두 번 튕겨요.', bounce: 2 }, { name: '거품 감옥', desc: '맞은 적을 1초 동안 거품에 가둬요.', st: 'stun', stunCh: 1 }],
    ['치유의 샘', 'heal', 1, { heal: 0.22, mp: 12, cd: 12 },
      { name: '샘물', desc: '4초 동안 체력이 계속 차오르는 샘이 생겨요.', spring: 4 }, { name: '정화', desc: '나쁜 상태를 풀고 보호막을 얻어요.', cleanse: 1, shield: 0.1 }],
    ['파도', 'line', 1, { power: 1.6, mp: 10, cd: 4, len: 8, w: 2.4, st: 'knock' },
      { name: '역류', desc: '밀어내는 대신 내 쪽으로 끌어와요.', pullIn: 1 }, { name: '높은 파도', desc: '폭과 길이가 늘어요.', w: 3.6, len: 11 }],
    ['소용돌이', 'field', 2, { power: 0.55, mp: 16, cd: 10, r: 2.8, dur: 4, pull: 1 },
      { name: '심해', desc: '끌어당기는 힘이 세지고 느려져요.', pull: 2, st: 'slow' }, { name: '물기둥 폭발', desc: '끝날 때 크게 터져요.', endBoom: 3, endPower: 3 }],
    ['물의 정령', 'summon', 3, { power: 1.1, mp: 26, cd: 26, dur: 14, ally: 'waterSpirit' },
      { name: '쌍둥이 정령', desc: '정령이 둘 나와요.', count: 2 }, { name: '치유 정령', desc: '정령이 2초마다 내 체력을 채워 줘요.', healer: 1 }],
    ['대해일', 'wave', 4, { power: 3.2, mp: 42, cd: 32, len: 16, w: 9, st: 'knock' },
      { name: '밀물과 썰물', desc: '파도가 한 번 더 되돌아와요.', twice: 1.2 }, { name: '바다의 축복', desc: '맞힌 적 하나마다 체력을 되찾아요.', lifePer: 0.03 }],
  ],
  ice: [
    ['아이스 볼트', 'bolt', 0, { power: 1.1, mp: 4, cd: 0.9, st: 'chill', look: 'iceshard' },
      { name: '파편', desc: '맞으면 세 갈래 얼음 조각으로 쪼개져요.', split: 3 }, { name: '무거운 얼음', desc: '냉기가 2겹 쌓여요.', stack: 2, power: 1.3 }],
    ['서리 숨결', 'cone', 1, { power: 1.4, mp: 10, cd: 4, len: 5.5, arc: 0.9, st: 'chill' },
      { name: '영하', desc: '사거리가 길어져요.', len: 8 }, { name: '얼음 거울', desc: '쓰는 동안 1.5초 무적이에요.', invuln: 1.5 }],
    ['얼음 갑옷', 'buff', 1, { mp: 12, cd: 22, dur: 12, buff: { def: 40 } },
      { name: '가시 갑옷', desc: '나를 때린 적이 얼어붙어요.', thorns: 'freeze' }, { name: '냉기 순환', desc: '켜져 있는 동안 마나가 빨리 차요.', buff: { def: 30, mpRegen: 2 } }],
    ['얼음 창', 'line', 2, { power: 2.4, mp: 14, cd: 4, len: 10, w: 1, st: 'chill' },
      { name: '연속 창', desc: '0.25초 간격으로 세 번 쏴요.', repeat: 3, power: 1.2 }, { name: '깨뜨리기', desc: '얼어 있는 적에게 두 배로 아파요.', shatter: 1 }],
    ['블리자드', 'rain', 3, { power: 1.3, mp: 24, cd: 11, r: 4, n: 10, st: 'chill' },
      { name: '눈보라 장막', desc: '범위가 넓어져요.', r: 5.5, n: 14 }, { name: '한파', desc: '맞을 때마다 얼 확률이 생겨요.', freezeCh: 0.35 }],
    ['절대 영도', 'nova', 4, { power: 3.6, mp: 40, cd: 30, r: 6.5, st: 'freeze', freezeT: 3 },
      { name: '얼음 감옥', desc: '얼어 있는 시간이 두 배예요.', freezeT: 6 }, { name: '산산조각', desc: '얼어붙은 적이 2초 뒤 폭발해 주위에도 피해를 줘요.', burstAfter: 2 }],
  ],
  wind: [
    ['윈드 커터', 'bolt', 0, { power: 1.0, mp: 4, cd: 0.7, pierce: 1, speed: 26, look: 'cutter' },
      { name: '쌍칼', desc: '두 발을 나란히 쏴요.', n: 2, spread: 0.18 }, { name: '돌아오는 칼날', desc: '끝까지 날아간 뒤 돌아와 한 번 더 맞혀요.', boomerang: 1 }],
    ['스파크', 'chain', 1, { power: 1.4, mp: 9, cd: 2.6, n: 4, look: 'spark' },
      { name: '연쇄 증폭', desc: '튈 때마다 15%씩 세져요.', grow: 0.15 }, { name: '감전', desc: '맞은 적이 잠깐 기절해요.', st: 'stun', stunCh: 0.6 }],
    ['돌풍', 'nova', 1, { power: 1.2, mp: 9, cd: 5, r: 3.4, st: 'knock', knock: 6 },
      { name: '진공', desc: '밀어내는 대신 끌어당겨요.', pullIn: 1, knock: 0 }, { name: '폭풍 질주', desc: '쓰고 나서 3초 동안 이동 속도 +40%.', haste: 40 }],
    ['토네이도', 'field', 2, { power: 0.6, mp: 16, cd: 10, r: 1.8, dur: 4, move: 4, st: 'knock' },
      { name: '쌍둥이 토네이도', desc: '토네이도가 양쪽으로 둘 생겨요.', twin: 1 }, { name: '흡입', desc: '주위의 적을 빨아들여요.', pull: 2, knock: 0 }],
    ['썬더볼트', 'area', 3, { power: 3.6, mp: 22, cd: 8, r: 2.6, delay: 0.35, st: 'stun', look: 'thunder' },
      { name: '삼연뢰', desc: '번개가 세 번 떨어져요.', thrice: 1, power: 1.8 }, { name: '뇌신', desc: '범위가 넓어지고 기절이 길어져요.', r: 4, stunT: 2 }],
    ['폭풍의 눈', 'field', 4, { power: 2.2, mp: 40, cd: 30, r: 6, dur: 8, storm: 1, follow: 1 },
      { name: '태풍', desc: '범위가 넓어지고 적을 끌어와요.', r: 8, pull: 1 }, { name: '낙뢰 집중', desc: '번개가 보스·강한 적을 먼저 노려요.', focus: 1, power: 2.8 }],
  ],
  dark: [
    ['섀도 볼', 'bolt', 0, { power: 1.15, mp: 4, cd: 0.9, st: 'corrupt', look: 'shadow' },
      { name: '추적', desc: '가까운 적을 따라가요.', homing: 1 }, { name: '흡혈탄', desc: '준 피해의 10%만큼 체력을 되찾아요.', drain: 0.1 }],
    ['저주', 'area', 1, { power: 0.8, mp: 10, cd: 6, r: 3, delay: 0.2, st: 'curse' },
      { name: '전염', desc: '저주받은 적이 쓰러지면 주위로 옮아가요.', spread: 1 }, { name: '약화', desc: '저주받은 적의 공격력이 30% 떨어져요.', weaken: 30 }],
    ['그림자 늪', 'field', 1, { power: 0.4, mp: 12, cd: 9, r: 3, dur: 5, st: 'slow' },
      { name: '침묵', desc: '안에 있는 적은 공격하지 못해요.', st: 'blind' }, { name: '심연', desc: '지속 피해가 두 배예요.', power: 0.8 }],
    ['영혼 흡수', 'nova', 2, { power: 2.0, mp: 16, cd: 7, r: 4, drain: 0.12 },
      { name: '영혼 수확', desc: '이걸로 쓰러뜨린 적마다 마나 10을 되찾아요.', mpOnKill: 10 }, { name: '생명 착취', desc: '흡혈이 두 배예요.', drain: 0.24 }],
    ['블랙홀', 'field', 3, { power: 0.9, mp: 26, cd: 14, r: 4.2, dur: 4, pull: 2.4 },
      { name: '사건의 지평선', desc: '끝날 때 크게 터져요.', endBoom: 4.5, endPower: 4 }, { name: '중력장', desc: '범위가 넓고 적이 느려져요.', r: 5.8, st: 'slow' }],
    ['죽음의 낫', 'nova', 4, { power: 4.6, mp: 42, cd: 28, r: 5.5, look: 'scythe' },
      { name: '처형', desc: '체력이 30% 아래인 적에게 두 배로 아파요.', execute: 0.3 }, { name: '밤의 장막', desc: '맞은 적이 잠식 3겹을 얻어요.', st: 'corrupt', stack: 3 }],
  ],
  light: [
    ['빛의 화살', 'bolt', 0, { power: 1.05, mp: 4, cd: 0.75, speed: 28, look: 'lightarrow' },
      { name: '프리즘', desc: '세 갈래로 쏴요.', n: 3, spread: 0.4, power: 0.8 }, { name: '성스러운 화살', desc: '언데드·어둠 몬스터에게 두 배로 아파요.', holy: 2 }],
    ['치유의 빛', 'heal', 1, { heal: 0.3, mp: 14, cd: 13 },
      { name: '축복', desc: '10초 동안 마력 +20%.', buff: { matk: 20 }, buffT: 10 }, { name: '재생', desc: '6초 동안 체력이 계속 차요.', regenT: 6 }],
    ['섬광', 'nova', 1, { power: 1.1, mp: 9, cd: 6, r: 3.6, st: 'blind' },
      { name: '눈멂', desc: '눈부심이 두 배로 길어요.', blindT: 4 }, { name: '빛의 폭발', desc: '피해가 60% 늘어요.', power: 1.8 }],
    ['빛의 구슬', 'orbit', 2, { power: 1.1, mp: 16, cd: 16, n: 3, dur: 10 },
      { name: '수호 구슬', desc: '구슬이 날아오는 탄을 막아 줘요.', blockShots: 1 }, { name: '빛의 칼날', desc: '구슬이 커지고 더 아파요.', power: 1.7, big: 1 }],
    ['심판의 빛기둥', 'area', 3, { power: 4.0, mp: 24, cd: 9, r: 2.6, delay: 0.6, st: 'stun', look: 'pillar' },
      { name: '연속 심판', desc: '빛기둥이 세 곳에 차례로 떨어져요.', thrice: 1, power: 2.2 }, { name: '신의 분노', desc: '범위가 넓고 기절이 길어요.', r: 4, stunT: 2 }],
    ['천상의 강림', 'rain', 4, { power: 2.4, mp: 42, cd: 32, r: 7, n: 16, look: 'pillar', heal: 0.25 },
      { name: '성역', desc: '내 자리에 회복 장판이 8초 남아요.', sanctuary: 8 }, { name: '신벌', desc: '빛기둥 하나하나가 더 아파요.', power: 3.2 }],
  ],
  wood: [
    ['가시 씨앗', 'bolt', 0, { power: 1.05, mp: 4, cd: 0.9, look: 'thorn' },
      { name: '씨앗 폭탄', desc: '맞으면 터져 주위에도 씨앗을 심어요.', boom: 2 }, { name: '독가시', desc: '맞은 적이 중독돼요.', st: 'poison' }],
    ['덩굴 채찍', 'line', 1, { power: 1.5, mp: 9, cd: 4, len: 7, w: 1.2, st: 'root' },
      { name: '끌어오기', desc: '맞은 적을 내 앞으로 끌어와요.', pullIn: 1 }, { name: '긴 덩굴', desc: '길이가 두 배이고 관통해요.', len: 12 }],
    ['생명의 나무', 'field', 1, { power: 0, mp: 14, cd: 16, r: 3, dur: 8, healZone: 0.03 },
      { name: '열매', desc: '마나도 같이 차요.', mpZone: 0.03 }, { name: '뿌리 수호', desc: '안에 있으면 받는 피해가 20% 줄어요.', guardZone: 20 }],
    ['독 안개', 'field', 2, { power: 0.5, mp: 14, cd: 10, r: 3.2, dur: 6, st: 'poison' },
      { name: '맹독', desc: '중독 피해가 두 배예요.', poisonX: 2 }, { name: '퍼지는 안개', desc: '안개가 천천히 커져요.', grow: 1 }],
    ['식인 꽃', 'summon', 3, { power: 1.6, mp: 24, cd: 24, dur: 16, ally: 'flower' },
      { name: '꽃밭', desc: '꽃이 둘 피어요.', count: 2 }, { name: '거대 꽃', desc: '꽃이 커지고 두 배로 물어요.', power: 3.2, big: 1 }],
    ['세계수의 분노', 'rain', 4, { power: 2.4, mp: 40, cd: 30, r: 7, n: 14, st: 'root', look: 'roots' },
      { name: '영원한 숲', desc: '속박이 두 배로 길어요.', rootT: 4 }, { name: '대지의 생명', desc: '뿌리가 솟을 때마다 체력을 조금씩 되찾아요.', lifePer: 0.02 }],
  ],
  earth: [
    ['바위 던지기', 'bolt', 0, { power: 1.4, mp: 5, cd: 1.2, speed: 16, st: 'stun', stunCh: 0.15, look: 'rock' },
      { name: '낙석', desc: '맞으면 터져 주위에도 피해를 줘요.', boom: 2 }, { name: '돌파', desc: '관통해요.', pierce: 1 }],
    ['땅 울림', 'nova', 1, { power: 1.5, mp: 10, cd: 6, r: 3.2, st: 'stun', stunCh: 0.5 },
      { name: '여진', desc: '0.8초 뒤 한 번 더 울려요.', twice: 0.8 }, { name: '단층', desc: '앞으로 길게 갈라져요.', toLine: 1 }],
    ['바위 갑옷', 'buff', 1, { mp: 12, cd: 22, dur: 12, buff: { def: 60, speed: -10 } },
      { name: '반사', desc: '받은 피해의 30%를 되돌려줘요.', reflect: 30 }, { name: '굳건함', desc: '보호막 3겹을 바로 얻어요.', shieldNow: 3 }],
    ['대지 가시', 'line', 2, { power: 2.4, mp: 14, cd: 5, len: 9, w: 1.2, st: 'stun', stunCh: 0.5 },
      { name: '가시 숲', desc: '세 갈래로 솟아요.', fan: 3 }, { name: '관통 가시', desc: '피해가 50% 늘어요.', power: 3.6 }],
    ['운석 낙하', 'area', 3, { power: 4.2, mp: 24, cd: 10, r: 3.4, delay: 0.8, st: 'stun', stunCh: 0.8, look: 'boulder' },
      { name: '연쇄 낙석', desc: '바위가 세 번 떨어져요.', thrice: 1, power: 2.2 }, { name: '대지 붕괴', desc: '떨어진 자리에 4초 동안 느려지는 장판이 생겨요.', after: 'slow' }],
    ['골렘 소환', 'summon', 4, { power: 2.6, mp: 40, cd: 40, dur: 18, ally: 'golem' },
      { name: '거신', desc: '골렘이 더 크고 단단해요.', big: 1, power: 3.6 }, { name: '돌의 군단', desc: '작은 골렘 셋이 나와요.', count: 3, power: 1.3 }],
  ],
  time: [
    ['초침탄', 'bolt', 0, { power: 1.0, mp: 4, cd: 0.8, st: 'slow', look: 'clock' },
      { name: '되감기탄', desc: '끝까지 간 뒤 돌아와요.', boomerang: 1 }, { name: '멈춤', desc: '20% 확률로 1초 멈춰요.', st: 'stun', stunCh: 0.2 }],
    ['가속', 'buff', 1, { mp: 12, cd: 20, dur: 8, buff: { speed: 25, cdr: 20 } },
      { name: '잔상', desc: '켜져 있는 동안 블링크를 두 번 이어 쓸 수 있어요.', blink2: 1 }, { name: '집중', desc: '치명타 +15%.', buff: { speed: 15, cdr: 15, crit: 15 } }],
    ['시간 감옥', 'field', 1, { power: 0.35, mp: 12, cd: 10, r: 3, dur: 5, st: 'slow' },
      { name: '영겁', desc: '안에 있는 적이 거의 멈춰요.', heavySlow: 1 }, { name: '붕괴', desc: '끝날 때 터져요.', endBoom: 3, endPower: 2.5 }],
    ['되감기', 'heal', 2, { heal: 0.28, mp: 16, cd: 18 },
      { name: '되돌린 시간', desc: '다른 스킬 재사용을 모두 2초 줄여요.', cdBack: 2 }, { name: '과거의 나', desc: '회복량이 두 배예요.', heal: 0.56 }],
    ['시간 폭발', 'nova', 3, { power: 3.0, mp: 22, cd: 9, r: 4.2, st: 'stun', stunCh: 0.6 },
      { name: '연쇄 폭발', desc: '1초 간격으로 두 번 더 터져요.', thrice: 1, power: 1.6 }, { name: '시간 왜곡', desc: '범위가 넓고 맞은 적이 오래 느려져요.', r: 5.6, st: 'slow' }],
    ['시간 정지', 'stop', 4, { power: 0, mp: 44, cd: 36, dur: 3.5 },
      { name: '영원의 순간', desc: '멈추는 시간이 두 배예요.', dur: 7 }, { name: '누적 피해', desc: '멈춘 동안 받은 피해가 풀릴 때 두 배로 터져요.', store: 2 }],
  ],
};

export const SKILLS = {};
for (const el of ELEMENTS) T[el].forEach(([name, kind, rank, base, A, B], i) => {
  const id = `${el}_${i + 1}`;
  SKILLS[id] = { id, name, el, kind, rank, order: i, ...base, traits: [A, B] };
});
SKILLS.blink = { id: 'blink', name: '블링크', el: 'arcane', kind: 'blink', rank: 0, order: 0, mp: 4, cd: 2.4, dist: 5, base: true, maxLv: 1,
  desc: '보는 방향으로 순간 이동해요. 이동하는 동안 무적이고, 낭떠러지를 건너뛸 수 있어요.' };
SKILLS.manaShield = { id: 'manaShield', name: '마나 실드', el: 'arcane', kind: 'buff', rank: 0, order: 1, mp: 10, cd: 28, dur: 10, buff: { shield: 1 }, maxLv: 3,
  traits: null, desc: '10초 동안 받는 피해의 절반을 마나로 대신 받아요.' };

export const SKILL_MAX_LV = 5;
export const TRAIT_LV = 3;

// 레벨·특성을 적용한 실제 스킬
export function skillAt(id, lv = 1, trait = null) {
  const s = SKILLS[id];
  let o = { ...s, lv };
  if (trait != null && s.traits && lv >= TRAIT_LV) { const t = s.traits[trait]; o = { ...o, ...t, name: s.name, desc: s.desc, trait, traitName: t.name }; }
  const k = 1 + (lv - 1) * 0.16;
  if (o.power) o.power = +(o.power * k).toFixed(3);
  if (o.heal) o.heal = +(o.heal * (1 + (lv - 1) * 0.1)).toFixed(3);
  if (o.mp) o.mp = Math.round(o.mp * (1 + (lv - 1) * 0.1));
  if (o.buff) { const b = {}; for (const [a, v] of Object.entries(o.buff)) b[a] = a === 'shield' ? v : +(v * (1 + (lv - 1) * 0.12)).toFixed(1); o.buff = b; }
  return o;
}

const KIND_TEXT = { bolt: '탄', cone: '부채꼴', nova: '주위 폭발', area: '지점 폭발', rain: '쏟아짐', line: '관통', field: '장판', orbit: '도는 구슬', chain: '연쇄', summon: '소환', buff: '강화', heal: '회복', blink: '순간 이동', stop: '시간 정지', wave: '큰 물결' };
export const ST_TEXT = { burn: '화상', chill: '냉기', freeze: '얼림', knock: '밀쳐냄', stun: '기절', corrupt: '잠식', curse: '저주', slow: '느려짐', blind: '눈부심', root: '속박', poison: '중독' };
export function kindText(k) { return KIND_TEXT[k] || k; }
export function describe(s) {
  if (s.desc) return s.desc;
  const st = s.st ? ` · ${ST_TEXT[s.st]}` : '';
  switch (s.kind) {
    case 'bolt': return `앞으로 마법 탄을 쏴요${s.pierce ? ' (관통)' : ''}${s.boom ? ' · 맞으면 터짐' : ''}${st}.`;
    case 'cone': return `앞쪽 부채꼴에 숨결을 뿜어요${st}.`;
    case 'nova': return `내 주위를 한꺼번에 공격해요${st}.`;
    case 'area': return `앞쪽 지점에 ${s.delay >= 0.5 ? '잠시 뒤 ' : ''}큰 마법이 터져요${st}.`;
    case 'rain': return `넓은 곳에 마법이 ${s.n}번 쏟아져요${st}.`;
    case 'line': return `앞으로 길게 뻗어 줄 위의 적을 모두 맞혀요${st}.`;
    case 'field': return s.healZone ? `안에 있으면 체력이 차오르는 숲을 만들어요 (${s.dur}초).` : s.storm ? `내 주위에 ${s.dur}초 동안 번개 폭풍이 몰아쳐요.` : `${s.dur}초 동안 남는 장판을 깔아요${s.pull ? ' · 끌어당김' : ''}${s.move ? ' · 앞으로 움직임' : ''}${st}.`;
    case 'orbit': return `내 주위를 도는 구슬 ${s.n}개를 불러요 (${s.dur}초).`;
    case 'chain': return `번개가 가까운 적 ${s.n}명에게 튀어요${st}.`;
    case 'summon': return { phoenix: '불사조를 불러 함께 싸워요.', waterSpirit: '물의 정령을 불러 물탄을 쏘게 해요.', flower: '가까운 적을 무는 식인 꽃을 피워요.', golem: '돌 골렘을 불러 앞에서 싸우게 해요.' }[s.ally] + ` (${s.dur}초)`;
    case 'buff': return `${s.dur}초 동안 ${buffText(s.buff)}.`;
    case 'heal': return `체력을 ${Math.round(s.heal * 100)}% 되찾아요.`;
    case 'stop': return `${s.dur}초 동안 주위 모든 적의 시간을 멈춰요.`;
    case 'wave': return '화면을 휩쓰는 큰 물결로 앞의 적을 모두 쓸어내요.';
  }
  return '';
}
export const STAT_NAME = { matk: '마력', def: '방어', hp: '체력', mp: '마나', crit: '치명타', cdr: '재사용 감소', speed: '이동 속도', mpRegen: '마나 회복', regen: '체력 회복', elem: '속성 피해', drain: '흡혈', shield: '마나 실드', gold: '골드 획득', exp: '경험치', drop: '드랍률', dmgTaken: '받는 피해' };
export function buffText(b) {
  const PCT = ['matk', 'def', 'speed', 'cdr', 'crit', 'drain', 'elem'];
  return Object.entries(b).filter(([k]) => k !== 'shield').map(([k, v]) => `${STAT_NAME[k] || k} ${v > 0 ? '+' : ''}${v}${PCT.includes(k) ? '%' : k === 'mpRegen' || k === 'regen' ? '/초' : ''}`).join(', ') || '마나 실드';
}
for (const s of Object.values(SKILLS)) if (!s.desc) s.desc = describe(s);
