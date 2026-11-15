// 이야기 8장. 루미나에서 남쪽 용의 둥지까지 걸어 나가는 여정.
// 대사: [말하는 사람, '대사'] — hero 주인공 · sys 해설 · {name} 주인공 이름 · '@chooseElement' 원소 고르기 · '@ending' 엔딩
// 퀘스트 단계 type:
//   talk(npc와 말하기) · reach(지역 끝까지 가기) · find(반짝이는 곳 살펴보기) · collect(몬스터가 떨어뜨리는 물건 n개)
//   kill(n마리) · puzzle(그 지역의 퍼즐 풀기) · escort(사람을 지켜 데려가기) · defend(자리 지키기 · 몰려오는 적 막기)
//   mid(중간보스) · boss(보스) · exam(전직 시험) · craft(대장간에서 하나 만들기) · enhance(+n까지 강화) · quiz(문제 풀기)

export const SPEAKERS = {
  hero: '{name}', sys: '', carrot: '캐럿',
  orben: '대마법사 오르벤', rina: '약초상 리나', garrick: '지팡이 장인 갈릭', mira: '의상실 미라', momo: '잡화점 모모', leo: '견습 마법사 레오', petshop: '펫 가게 포포',
  cecil: '하리 마탑 지부장 세실', otto: '뱃사공 오토', elder_liz: '리자드맨 장로 수사',
  bron: '대장장이 브론', dorn_chief: '광산 반장 두르가',
  iris: '세레나 마탑 지부장 이리스', serena_elder: '눈마을 촌장 할머니',
  aero_keeper: '정류장지기 바람',
  nora: '사서 노라', libra_exam: '리브라 마탑 지부장 헤론',
  sahar_elder: '오아시스 장로 라힘',
  camp_captain: '봉인 기사단장 아델',
  grak: '그락', morga: '모르가', bolg: '볼그', ceres: '세레스', kai: '카이', nekros: '네크로스', baltar: '발타르', azdaha: '아즈다하',
};

// 사람 모습 (맨몸 픽셀 캐릭터에 그려 입히는 피부·옷·모자)
const L = (o) => ({ t: 'human', skin: '#f6d3b3', ...o });
export const NPCS = {
  orben: { look: L({ hair: '#e1e1e6', shirt: '#4650a0', pants: '#373c82', face: 'beard', hat: '#373c82', robe: '#4650a0', weapon: 'staff', orb: '#a0e0ff' }), idle: ['원소는 서로 미워하지 않는단다. 사람이 그렇게 만들 뿐이지.', '블링크는 마법사의 첫 번째 친구란다. 위험할 땐 망설이지 말거라.'] },
  rina: { look: L({ skin: '#deac80', hair: '#3c6e3c', hairLong: 1, shirt: '#78a050', pants: '#506a30', face: 'smile' }), idle: ['물약은 넉넉히! 마나가 바닥나면 마법사도 그냥 사람이야.'] },
  garrick: { look: L({ skin: '#deac80', hair: null, shirt: '#825a3c', pants: '#503c28', face: 'beard', beard: '#966440', apron: 1 }), idle: ['재료만 가져오면 무엇이든 만들어 주지. 강화는… 마음 단단히 먹고 하게.'] },
  mira: { look: L({ hair: '#c878b4', hairLong: 1, shirt: '#3c8c96', pants: '#2a5a60', face: 'smile', hat: '#1e5a64' }), idle: ['모자는 마나를, 로브는 체력을 지켜 줘. 멋은 덤이고!'] },
  momo: { look: L({ hair: '#e6b45a', shirt: '#f0ece0', pants: '#6e5a3c', face: 'smile' }), idle: ['귀환 주문서 하나쯤은 늘 가방에 넣어 둬.'] },
  leo: { look: L({ skin: '#a06a46', hair: '#1e181e', shirt: '#5a3c82', pants: '#3c3246', face: 'smile', weapon: 'staff', orb: '#a0f0d0' }), idle: ['언젠가 나도 시험에 붙을 거야. 언젠가…', '바람 마법은 속도가 생명이지!'] },
  petshop: { look: L({ hair: '#f0a0c0', hairLong: 1, shirt: '#f0c0d8', pants: '#a05a7a', face: 'smile' }), idle: ['펫 상자 하나 열어 볼래? 전설 펫이 나올지도 몰라!'] },
  petshop2: { look: L({ hair: '#f0a0c0', shirt: '#f0c0d8', pants: '#a05a7a', face: 'smile' }), idle: ['포포 언니의 동생이야. 여기서도 펫 상자를 팔아!'] },
  petshop3: { look: L({ hair: '#f0a0c0', shirt: '#c0d8f0', pants: '#5a7aa0', face: 'smile' }), idle: ['하늘 위에도 펫은 있지!'] },
  petshop4: { look: L({ skin: '#c08860', hair: '#f0a0c0', shirt: '#f0e0a0', pants: '#a08040', face: 'smile' }), idle: ['사막에서만 나오는 펫도… 아니, 상자는 다 똑같아!'] },
  cecil: { look: L({ hair: '#504040', shirt: '#3a6a8a', pants: '#2a4a6a', face: 'calm', hat: '#2a4a6a', robe: '#3a6a8a', weapon: 'staff', orb: '#80c0ff' }), idle: ['하리 마탑 지부는 작아도 시험은 제대로 본답니다.'] },
  otto: { look: L({ skin: '#c89870', hair: '#6a5a4a', shirt: '#4a6a8a', pants: '#3a3a3a', face: 'beard', beard: '#7a6a5a' }), idle: ['안개만 걷히면 배를 다시 띄울 수 있을 텐데.'] },
  elder_liz: { look: L({ skin: '#5a8c64', shirt: '#6e6446', pants: '#4a4430', face: 'lizard', tail: 1, robe: '#6e6446', weapon: 'staff', orb: '#8cdca0' }), idle: ['쉬익… 늪은 다시 조용해질 것이다.'] },
  bron: { look: L({ skin: '#c89870', hair: '#3a2a1a', shirt: '#6a4a3a', pants: '#3a2a20', face: 'beard', beard: '#3a2a1a', apron: 1 }), idle: ['쇠는 불을 견뎌야 단단해지지. 마법사도 마찬가지고.'] },
  dorn_chief: { look: L({ skin: '#c89870', hair: '#2a2a2a', shirt: '#8a6a3a', pants: '#4a3a2a', face: 'angry', helm: '#e0b040' }), idle: ['광산 수레만 무사히 지나가면 돼!'] },
  iris: { look: L({ hair: '#e8f0ff', hairLong: 1, shirt: '#6a9ac8', pants: '#4a7aa8', face: 'calm', hat: '#4a7aa8', robe: '#6a9ac8', weapon: 'staff', orb: '#c0f0ff' }), idle: ['얼음은 차갑지만, 정직하지요.'] },
  serena_elder: { look: L({ hair: '#f0f0f0', hairLong: 1, shirt: '#8a4a4a', pants: '#5a3a3a', face: 'smile' }), idle: ['이 추위는 여왕님 탓이 아니란다. 무언가가 여왕님을 아프게 하는 거지.'] },
  aero_keeper: { look: L({ hair: '#a0e0d0', shirt: '#e0e0f0', pants: '#8a8aa0', face: 'smile' }), idle: ['다리 위 바람은 늘 같은 쪽으로 불어요. 거스르지 말고 타세요.'] },
  nora: { look: L({ hair: '#5a3a2a', hairLong: 1, shirt: '#5a4a6a', pants: '#3a2a4a', face: 'calm', glasses: 1 }), idle: ['책은 조용히! 하지만 문제는 크게 내 드릴게요.'] },
  libra_exam: { look: L({ hair: '#8a8a8a', shirt: '#6a3a6a', pants: '#4a2a4a', face: 'beard', hat: '#4a2a4a', robe: '#6a3a6a', weapon: 'staff', orb: '#ffd0a0' }), idle: ['상급 마법사는 힘보다 판단이 중요하지.'] },
  sahar_elder: { look: L({ skin: '#a06a46', hair: '#f0f0f0', shirt: '#e0c080', pants: '#a08040', face: 'beard', beard: '#f0f0f0', hood: '#e0c080' }), idle: ['모래가 거꾸로 흐르는 건 오백 년 만이오.'] },
  camp_captain: { look: L({ skin: '#deac80', hair: '#c0a060', shirt: '#8a8a9a', pants: '#4a4a5a', face: 'calm', helm: '#a0a0b0', weapon: 'sword' }), idle: ['봉인 기사단은 마지막까지 여기를 지킨다.'] },
};
// 가게 주인처럼 이름만 다른 사람들
const SHOPKEEP = { hari_shop: 'rina', hari_smith: 'garrick', hari_tailor: 'mira', hari_general: 'momo', dorn_shop: 'rina', dorn_staff: 'garrick', dorn_general: 'momo', serena_shop: 'rina', serena_smith: 'bron', serena_tailor: 'mira', serena_general: 'momo',
  aero_shop: 'rina', aero_smith: 'bron', aero_staff: 'garrick', libra_shop: 'rina', libra_smith: 'bron', libra_tailor: 'mira', libra_general: 'momo', sahar_shop: 'rina', sahar_smith: 'bron', sahar_staff: 'garrick', sahar_general: 'momo',
  camp_shop: 'rina', camp_smith: 'bron', camp_general: 'momo' };
const SK_NAME = { rina: '물약 가게', garrick: '지팡이 가게', mira: '옷 가게', momo: '잡화점', bron: '대장간' };
const TINT = ['#c87a5a', '#5a8ac8', '#8ac85a', '#c8b05a', '#a05ac8'];
let k = 0;
for (const [id, base] of Object.entries(SHOPKEEP)) {
  const b = NPCS[base];
  NPCS[id] = { look: { ...b.look, shirt: TINT[k++ % TINT.length] }, idle: [`어서 와요. ${SK_NAME[base] === '대장간' || id.endsWith('smith') ? '제작도 강화도 여기서!' : '천천히 둘러보세요.'}`] };
  SPEAKERS[id] = id.endsWith('smith') ? '대장장이' : id.endsWith('staff') ? '지팡이 가게' : id.endsWith('tailor') ? '옷 가게' : id.endsWith('general') ? '잡화점' : '물약 가게';
}

export const HEROES = {
  // 소녀: 어깨까지 오는 붉은 머리, 빨간 원피스(치마), 검은 스타킹, 장화, 끝이 꺾인 넓은 모자
  girl: { label: '소녀 마법사', defName: '페퍼', look: { skin: '#f6d3b3', hair: '#8a2f1e', hairStyle: 'long', eye: '#2a1c14', shirt: '#b8333a', skirt: '#b8333a', skirtTrim: '#6a1a22', pants: '#2e2636', shoes: '#5a3424', boots: 1, hatStyle: 'witch', face: 'hero' } },
  // 소년: 짧은 갈색 머리, 청록 웃옷 + 허리띠, 바지, 짧은 보라 망토, 곧게 선 고깔모자
  boy: { label: '소년 마법사', defName: '루카', look: { skin: '#f0c8a0', hair: '#4a2e1c', hairStyle: 'short', eye: '#24507a', shirt: '#2f7a8a', belt: '#5a3a22', pants: '#4a3a2e', shoes: '#3a2a20', cape: '#5a3a8a', hatStyle: 'cone', face: 'hero' } },
};

export const PROLOGUE = [
  ['sys', '오백 년 전, 재앙의 용 아즈다하가 세라벨 대륙을 불태웠다.'],
  ['sys', '아홉 원소의 대마법사들은 목숨을 걸고 아홉 봉인을 만들어, 남쪽 끝 「용의 둥지」에 용을 잠재웠다.'],
  ['sys', '대륙 북쪽 끝, 봉인을 지키는 마법사들의 마을 루미나. 오늘 한 견습 마법사가 첫 지팡이를 받는다.'],
];
export const ENDING = [
  ['azdaha', '아홉… 원소가… 하나로… 오백 년 전의 그들과는… 다르구나…'],
  ['sys', '아홉 빛이 겹쳐 용을 감싼다. 이번 봉인은 누구의 목숨도 바치지 않았다.'],
  ['orben', '{name}, 너는 봉인을 고친 게 아니라 새로 짜냈구나. 원소 모두와 손을 잡고.'],
  ['leo', '그러니까… 이제 익스퍼트가 아니라 대마법사님이라고 불러야 하나?'],
  ['carrot', '냐아!'],
  ['sys', '루미나에서 시작된 긴 길은 여기서 끝났다. 하지만 마법사의 모험은 계속된다. — 끝 —'],
  ['sys', '이제부터는 자유 모험! 깨뜨린 보스를 다시 찾아가 장비를 모으고, +20 강화와 전설 펫에 도전해 보세요.'],
];

export const CHAPTERS = [null,
  { id: 1, title: '1장 · 견습의 첫걸음', steps: [
    { type: 'talk', npc: 'orben', region: 't_lumina', text: '마탑 앞 오르벤 선생님과 이야기하기', say: [
      ['orben', '왔구나, {name}. 오늘로 너도 지팡이를 쥘 나이가 되었지.'],
      ['orben', '마법사는 아홉 원소 가운데 하나와 먼저 마음을 맞춘단다. 시험에 붙을 때마다 원소 하나와 더 친해질 수 있지.'],
      ['sys', '@chooseElement'],
      ['orben', '좋은 선택이다. 견습 지팡이를 받거라. 그리고 이것만은 꼭 기억해. 마법사의 첫 번째 친구는 「블링크」야. [X]를 누르면 보는 쪽으로 순간 이동하지.'],
      ['orben', '마을 뒷동산의 낭떠러지를 블링크로 건너 보렴. 건너편에서 길을 잃은 아기 고양이 울음소리가 들린다더구나.'],
    ] },
    { type: 'find', region: 'r_hill', find: 'kitten', text: '뒷동산에서 우는 아기 고양이 찾기 (블링크로 낭떠러지 건너기)', done: [
      ['sys', '덤불 속에서 주황 줄무늬 아기 고양이가 얼굴을 내민다.'],
      ['carrot', '냐앙…?'],
      ['hero', '혼자였구나. 나랑 같이 갈래? 이름은… 캐럿!'],
      ['sys', '캐럿이 동료가 되었어요! 펫은 [P] 펫 창에서 바꿀 수 있어요. 캐럿은 골드를 더 많이 주워 와요.'],
    ] },
    { type: 'puzzle', region: 'r_hill', text: '뒷동산 끝의 발판 문 열기 (발판 셋을 동시에 밟기)', done: [
      ['hero', '발판이 꺼지기 전에 블링크로 다음 발판까지! 좋아, 문이 열렸어.'],
    ] },
    { type: 'find', region: 'r_forest', find: ['herb1', 'herb2', 'herb3'], text: '초록 숲에서 빛나는 약초 3포기 찾기 (리나의 부탁)', done: [
      ['hero', '약초를 다 모았어. 그런데 숲 안쪽 사당에서 이상한 기운이 느껴져.'],
    ] },
    { type: 'puzzle', region: 'r_forest', text: '숲의 사당: 석판이 알려 주는 순서대로 화로 켜기', done: [
      ['sys', '네 화로가 모두 타오르자 사당 문이 열린다. 안쪽 공터의 땅이 출렁인다.'],
    ] },
    { type: 'mid', mon: 'king_slime', region: 'r_forest', text: '숲 공터의 킹 슬라임 쓰러뜨리기', before: [
      ['sys', '왕관을 쓴 거대한 슬라임! 큰 피해를 받으면 작은 슬라임으로 갈라져요. 갈라진 녀석들도 놓치지 마세요.'],
    ], done: [
      ['hero', '슬라임이 왕관을? 왕관 안쪽에 검은 비늘 무늬가 새겨져 있어…'],
    ] },
    { type: 'boss', mon: 'goblin_chief', region: 'r_gcave', text: '고블린 굴 깊은 곳의 족장 그락 쓰러뜨리기', before: [
      ['grak', '크하하! 꼬마 마법사! 검은 비늘 나리가 준 토템이 있는 한, 나는 안 다친다!'],
      ['sys', '그락 주위의 토템이 보호막을 씌우고 있어요. 토템부터 부수세요!'],
    ], done: [
      ['grak', '끄윽… 비늘 부적이… 깨졌어…'],
      ['sys', '그락의 목에서 깨진 검은 비늘 부적이 떨어졌다. 동굴 너머로 강물 소리가 들린다. 남쪽 강가 마을 하리로 가는 길이다.'],
    ] },
    { type: 'exam', rank: 1, mon: 'exam_1', npc: 'cecil', region: 't_hari', text: '강가 마을 하리의 마탑 지부에서 초급 마법사 시험 보기', say: [
      ['cecil', '루미나에서 소식 들었어요. 고블린 족장을 혼자 쓰러뜨렸다고요? 그렇다면 시험 볼 자격은 충분해요.'],
    ], done: [
      ['cecil', '합격! 오늘부터 초급 마법사예요. 원소 하나와 더 마음을 맞춰 보세요.'],
      ['sys', '@chooseElement'],
    ] },
  ] },
  { id: 2, title: '2장 · 안개 늪의 속삭임', steps: [
    { type: 'talk', npc: 'otto', region: 't_hari', text: '뱃사공 오토의 이야기 듣기', say: [
      ['otto', '젊은 마법사! 늪에 안개가 낀 뒤로 사람들이 사라져. 루미나에서 온 레오라는 녀석도 혼자 늪으로 갔다네.'],
      ['otto', '안개를 걷으려면 늪 한가운데 등불 사당에 불을 켜야 해. 나를 사당까지 데려다주게. 길은 내가 알아.'],
    ] },
    { type: 'escort', npc: 'otto', region: 'r_swamp', toSeg: 1, text: '오토를 지켜서 늪 한가운데 등불 사당까지 데려가기', done: [
      ['otto', '휴, 살았다! 사당 석판에 불 켜는 순서가 적혀 있을 거야.'],
    ] },
    { type: 'puzzle', region: 'r_swamp', text: '등불 사당의 등불을 순서대로 켜서 안개 걷기', done: [
      ['sys', '등불이 켜지자 짙은 안개가 걷힌다. 안개에 홀려 있던 리자드맨들이 흔들린다.'],
    ] },
    { type: 'kill', mon: 'lizardman', n: 6, region: 'r_swamp', text: '아직 홀려 있는 리자드맨 6명 진정시키기', done: [
      ['elder_liz', '쉬익… 고맙다, 작은 마법사. 하지만 전사장 그르샤는 여전히 마녀의 목소리를 듣고 있다.'],
    ] },
    { type: 'mid', mon: 'lizard_captain', region: 'r_swamp', text: '리자드맨 전사장 그르샤를 막기', before: [
      ['sys', '그르샤는 방패를 들면 앞에서 오는 마법을 막아요. 뒤로 블링크해서 등을 노리세요!'],
    ], done: [
      ['elder_liz', '그르샤가 정신을 차렸다. 마녀는 가라앉은 사원에 있다. 너의 친구도 거기에.'],
    ] },
    { type: 'boss', mon: 'morga', region: 'r_temple', text: '가라앉은 사원의 늪의 마녀 모르가 쓰러뜨리기', before: [
      ['morga', '어머, 루미나의 병아리가 또 왔네. 저 친구처럼 얌전히 갇혀 있을래?'],
      ['leo', '{name}! 저 마녀는 분신을 만들어! 진짜는 발밑에 그림자가 있어!'],
    ], done: [
      ['morga', '흥… 늦었어. 발타르 님께서… 곧 아홉 봉인을…'],
      ['leo', '살았다… 고마워, {name}. 다음엔 내가 구해 줄게. 아마도.'],
      ['sys', '사원 뒷문은 남쪽 광산 마을 도른으로 이어진다.'],
    ] },
    { type: 'reach', region: 't_dorn', text: '광산 마을 도른에 도착하기' },
  ] },
  { id: 3, title: '3장 · 불꽃 협곡', steps: [
    { type: 'talk', npc: 'bron', region: 't_dorn', text: '대장장이 브론과 이야기하기', say: [
      ['bron', '루미나 마법사로군. 앞으로 갈 길은 험해. 상점 지팡이로는 금방 한계가 와.'],
      ['bron', '몬스터가 떨어뜨리는 재료를 모아 오면 내가 장비를 만들어 주지. 하나 만들어 보고, 강화도 +3까지 해 보게.'],
    ] },
    { type: 'craft', region: 't_dorn', text: '대장간에서 장비 하나 만들기 (재료는 사냥으로)' },
    { type: 'enhance', to: 3, region: 't_dorn', text: '아무 장비나 +3까지 강화하기', done: [
      ['bron', '좋아, 손맛을 알았군. +12부터는 실패하면 장비가 부서질 수 있으니 「강화 보호 주문서」를 꼭 챙기게.'],
      ['dorn_chief', '마법사님! 협곡 길로 광석 수레가 지나가는데 오크들이 자꾸 습격해요. 수레를 지켜 주세요!'],
    ] },
    { type: 'defend', region: 'r_canyon', waves: 3, text: '붉은 협곡에서 광석 수레 지키기 (몰려오는 오크 3번 막기)', done: [
      ['dorn_chief', '수레가 무사해요! 그런데 오크들 눈이 시뻘겋던데… 뭔가 마신 걸까요?'],
    ] },
    { type: 'mid', mon: 'orc_berserker', region: 'r_canyon', text: '오크 광전사 쓰러뜨리기', before: [
      ['sys', '광전사는 크게 돌진해요. 돌기둥 앞에서 피하면 기둥에 부딪혀 한동안 기절해요!'],
    ] },
    { type: 'collect', mon: 'orc_shaman', item: '붉은 피 약병', n: 4, region: 'r_mine', text: '오크 주술사가 가진 붉은 피 약병 4개 빼앗기', done: [
      ['hero', '용의 피를 묽게 탄 약이야. 이걸 마셔서 오크들이 미쳐 버린 거구나.'],
    ] },
    { type: 'boss', mon: 'bolg', region: 'r_mine', text: '용암 갱도의 오크 대족장 볼그 쓰러뜨리기', before: [
      ['bolg', '용의 피! 용의 힘! 이 통을 다 마시면 볼그는 용이 된다!'],
      ['sys', '볼그는 체력이 줄면 용의 피 통으로 가서 마시고 강해져요. 통을 먼저 부수세요!'],
    ], done: [
      ['bolg', '불이… 꺼진다… 교단 놈들… 거짓말을…'],
      ['sys', '갱도 끝의 비탈길은 눈 덮인 산마을 세레나로 이어진다.'],
    ] },
    { type: 'exam', rank: 2, mon: 'exam_2', npc: 'iris', region: 't_serena', text: '눈마을 세레나의 마탑 지부에서 중급 마법사 시험 보기', say: [
      ['iris', '먼 길 왔네요. 중급 시험관은 조금 거칠어요. 바닥의 경고를 잘 보세요.'],
    ], done: [
      ['iris', '중급 마법사가 된 걸 축하해요. 새 원소를 골라 보세요.'],
      ['sys', '@chooseElement'],
    ] },
  ] },
  { id: 4, title: '4장 · 얼어붙은 봉우리', steps: [
    { type: 'talk', npc: 'serena_elder', region: 't_serena', text: '촌장 할머니의 부탁 듣기', say: [
      ['serena_elder', '한여름인데 산에서 눈보라가 내려온단다. 여왕님 궁전에 가던 나그네 셋이 돌아오지 않았어.'],
      ['serena_elder', '얼어붙은 사람은 마법 불꽃으로 녹일 수 있단다. 산길에서 찾아 주렴.'],
    ] },
    { type: 'find', region: 'r_frost', find: ['trav1', 'trav2', 'trav3'], text: '서리 산길에서 얼어붙은 나그네 셋 녹이기', done: [
      ['sys', '마지막 나그네가 몸을 떨며 말한다. "여왕님 이마에 검은 비늘이… 박혀 있었어요…"'],
    ] },
    { type: 'puzzle', region: 'r_frost', text: '미끄러운 얼음 고개 건너기 (바위에 부딪혀야 멈춰요)' },
    { type: 'mid', mon: 'frost_wolf_king', region: 'r_frost', text: '서리 늑대왕 쓰러뜨리기', before: [
      ['sys', '늑대왕은 울부짖어 무리를 불러 힘을 얻어요. 곁의 늑대를 먼저 쓰러뜨리면 약해져요.'],
    ] },
    { type: 'puzzle', region: 'r_palace', text: '빙결 궁전의 수정을 모두 밝혀 문 열기', done: [
      ['hero', '수정 하나를 치면 이웃 수정도 바뀌네… 됐다, 다 밝혔어!'],
    ] },
    { type: 'boss', mon: 'ceres', region: 'r_palace', text: '빙결의 여왕 세레스를 구하기', before: [
      ['ceres', '오지 마… 내 안의 검은 비늘이… 모두 얼려 버리라고 해…'],
      ['sys', '여왕은 얼음 갑옷에 싸여 있어요. 방 네 귀퉁이의 꺼진 화로를 마법으로 켜면 갑옷이 녹아요!'],
    ], done: [
      ['ceres', '…따뜻하구나. 오백 년 만이야. 고맙다, 작은 마법사.'],
      ['ceres', '들으렴. 교단을 이끄는 발타르는 오르벤의 첫 제자였다. 그 아이는 바람의 탑에서 다음 봉인을 노리고 있어.'],
    ] },
    { type: 'reach', region: 't_aero', text: '궁전 위 구름 정류장 아에로에 도착하기' },
  ] },
  { id: 5, title: '5장 · 바람의 탑', steps: [
    { type: 'talk', npc: 'leo', region: 't_aero', text: '정류장에서 기다리던 레오와 이야기하기', say: [
      ['leo', '{name}! 이번엔 나도 같이 가! …는 아니고, 정류장을 지킬게. 시험 두 번 떨어진 몸이라.'],
      ['leo', '구름 다리에 교단 수련생들이 진을 쳤어. 탑 꼭대기엔 「바람의 집행자」 카이가 있대.'],
    ] },
    { type: 'kill', mon: 'cultist', n: 6, region: 'r_bridge', text: '구름 다리의 교단 수련생 6명 물리치기' },
    { type: 'mid', mon: 'griffin', region: 'r_bridge', text: '폭풍 그리폰을 땅으로 끌어내리기', before: [
      ['sys', '그리폰이 하늘로 날아오르면 마법이 닿지 않아요. 피뢰침을 마법으로 맞혀 번개를 떨어뜨리면 떨어져 기절해요!'],
    ] },
    { type: 'puzzle', region: 'r_tower', text: '바람의 탑: 발판 셋을 한꺼번에 밟아 승강 문 열기' },
    { type: 'boss', mon: 'kai', region: 'r_tower', text: '바람의 집행자 카이 쓰러뜨리기', before: [
      ['kai', '오르벤에게 속고 있는 줄도 모르는군. 오백 년 전 봉인은 아홉 마법사의 목숨으로 만든 거다.'],
      ['kai', '봉인이 약해지면 누군가 또 죽어야 해. 그 늙은이는 그걸 너에게 시킬 생각이지.'],
      ['hero', '…그래도 용을 깨우는 건 답이 아니야!'],
    ], done: [
      ['kai', '강하군… 그럼 네가 찾아봐. 희생 없는 봉인을. 리브라의 가라앉은 서고에… 답이 있을지도.'],
    ] },
    { type: 'exam', rank: 3, mon: 'exam_3', npc: 'libra_exam', region: 't_libra', text: '학자 마을 리브라의 마탑 지부에서 상급 마법사 시험 보기', say: [
      ['libra_exam', '카이를 이긴 마법사라… 상급 시험관 골렘은 자비가 없다. 준비되었나?'],
    ], done: [
      ['libra_exam', '훌륭하다. 상급 마법사여, 새 원소를 맞이하라.'],
      ['sys', '@chooseElement'],
    ] },
  ] },
  { id: 6, title: '6장 · 가라앉은 도서관', steps: [
    { type: 'quiz', npc: 'nora', region: 't_libra', text: '사서 노라의 문제 셋 맞히기 (서고 출입증)', say: [
      ['nora', '서고는 아무나 못 들어가요. 제 문제 세 개를 맞혀야 출입증을 드려요!'],
    ], questions: [
      { q: '불 원소의 특성 「점화」는 화상이 몇 겹 쌓이면 터질까요?', a: ['3겹', '5겹', '9겹'], ok: 1 },
      { q: '오백 년 전 용을 봉인한 대마법사는 모두 몇 명일까요?', a: ['일곱', '여덟', '아홉'], ok: 2 },
      { q: '블링크로 건널 수 있는 것은?', a: ['낭떠러지', '벽', '보스'], ok: 0 },
    ], done: [
      ['nora', '정답! 출입증이에요. 서고 안쪽 금서에는 봉인의 비밀이 적혀 있대요. 책장을 먹는 미믹도 있으니 조심!'],
    ] },
    { type: 'collect', mon: 'book_mimic', item: '봉인 기록 쪽지', n: 5, region: 'r_stacks', text: '책 미믹에게서 봉인 기록 쪽지 5장 되찾기', done: [
      ['sys', '쪽지를 이어 붙이자 한 문장이 드러난다. "아홉 원소가 서로를 미워하지 않는다면, 봉인에 피는 필요 없다."'],
    ] },
    { type: 'puzzle', region: 'r_stacks', text: '서고의 촛대를 순서대로 밝혀 금서 서가 열기' },
    { type: 'mid', mon: 'forbidden_book', region: 'r_stacks', text: '금서 「검은 장」 덮기', before: [
      ['sys', '금서는 책장을 펼쳐 주변의 책을 깨워요. 펼쳐진 동안에는 피해가 두 배로 들어가요!'],
    ] },
    { type: 'puzzle', region: 'r_vault', text: '금서고 봉인 수정을 모두 밝히기' },
    { type: 'boss', mon: 'nekros', region: 'r_vault', text: '리치 네크로스 쓰러뜨리기', before: [
      ['nekros', '이 비밀은 너무 위험하다. 아홉 원소를 하나로 묶는 자는 용보다 강해질 수 있으니.'],
      ['hero', '저는 지배하려는 게 아니에요. 지키려는 거예요!'],
      ['sys', '네크로스는 영혼 그릇이 남아 있는 동안 죽지 않아요. 떠다니는 그릇을 모두 부수세요!'],
    ], done: [
      ['nekros', '…그 눈. 발타르와는 다르군. 서둘러라. 그 자는 이미 남쪽 사막의 「시간의 미궁」으로 갔다.'],
    ] },
    { type: 'reach', region: 't_sahar', text: '오아시스 마을 사하르에 도착하기' },
  ] },
  { id: 7, title: '7장 · 시간의 사막', steps: [
    { type: 'talk', npc: 'sahar_elder', region: 't_sahar', text: '장로 라힘의 이야기 듣기', say: [
      ['sahar_elder', '모래가 거꾸로 흐르오. 교단 마도사들이 사막 한가운데 시계탑을 세워 시간을 감고 있소.'],
    ] },
    { type: 'kill', mon: 'cult_mage', n: 8, region: 'r_desert', text: '모래시계 사막의 교단 마도사 8명 물리치기' },
    { type: 'puzzle', region: 'r_desert', text: '모래 발판을 한꺼번에 밟아 시계탑 길 열기' },
    { type: 'mid', mon: 'clocktower', region: 'r_desert', text: '시계탑 수호자 멈추기', before: [
      ['sys', '수호자의 바늘이 12시를 가리키면 시간이 멈춰요. 그 전에 블링크로 바늘 밖으로 빠져나가세요!'],
    ] },
    { type: 'puzzle', region: 'r_maze', text: '시간의 미궁: 바위를 밀어 태엽 스위치 누르기' },
    { type: 'boss', mon: 'baltar', region: 'r_maze', text: '교단장 발타르 쓰러뜨리기', before: [
      ['baltar', '스승님의 새 제자로군. 그 늙은이는 너에게 희생을 가르쳤나? 나는 힘을 택했다.'],
      ['sys', '발타르는 「되감는 시계」로 체력을 되돌려요. 시계부터 부수세요!'],
    ], done: [
      ['baltar', '크윽… 하지만 늦었다. 마지막 바늘은… 이미 돌았다.'],
      ['sys', '땅이 울린다. 남쪽 화산에서 붉은 빛이 하늘을 찢는다. — 재앙의 용이 깨어났다.'],
    ] },
    { type: 'exam', rank: 4, mon: 'exam_4', npc: 'orben', region: 't_camp', text: '봉인 기사단 야영지에서 오르벤 선생님의 익스퍼트 시험 보기', say: [
      ['orben', '{name}… 여기까지 왔구나. 용은 깨어났다. 남은 건 새 봉인뿐이다.'],
      ['orben', '마지막 시험이다. 시험관은 나의 환영. 나를 넘지 못하면 용 앞에 설 수 없다.'],
    ], done: [
      ['orben', '…허허, 내 환영이 졌구나. 익스퍼트 마법사 {name}. 루미나의 자랑이다.'],
      ['sys', '@chooseElement'],
      ['orben', '가거라. 이번에는 혼자 짊어지지 말고, 원소들과 함께.'],
    ] },
  ] },
  { id: 8, title: '8장 · 용의 둥지', steps: [
    { type: 'talk', npc: 'camp_captain', region: 't_camp', text: '기사단장 아델과 작전 세우기', say: [
      ['camp_captain', '루미나에서 편지가 왔소. 리나는 물약을, 갈릭은 지팡이를 깎아 두겠다더군. 레오는 마을을 지킨다고.'],
      ['camp_captain', '용의 신관들이 봉인 조각을 빼앗아 갔소. 조각을 되찾고, 화산길의 봉인진을 지켜 주시오.'],
    ] },
    { type: 'collect', mon: 'dragon_priest', item: '봉인의 조각', n: 5, region: 'r_volcano', text: '용의 신관에게서 봉인의 조각 5개 되찾기' },
    { type: 'defend', region: 'r_volcano', waves: 4, text: '화산길 봉인진 지키기 (몰려오는 적 4번 막기)', done: [
      ['camp_captain', '봉인진이 버텼소! 둥지 입구를 지키는 검은 와이번만 남았소.'],
    ] },
    { type: 'mid', mon: 'wyvern', region: 'r_volcano', text: '둥지 입구의 검은 와이번 쓰러뜨리기', before: [
      ['sys', '와이번은 하늘에서 불줄기를 그으며 내리꽂혀요. 땅에 그어지는 붉은 줄을 피하세요!'],
    ] },
    { type: 'boss', mon: 'azdaha', region: 'r_lair', text: '재앙의 용 아즈다하 다시 잠재우기', before: [
      ['azdaha', '작은 것. 오백 년 전에도 너희는 아홉이었다. 그런데 이번엔 하나뿐이로군.'],
      ['hero', '하나가 아니야. 나한테는 아홉 원소랑, 루미나랑, 캐럿이 있어!'],
      ['sys', '용은 세 번 모습을 바꿔요. 떨어지는 얼음 결정을 부수면 잠깐 용의 약점이 드러나요!'],
    ], done: '@ending' },
  ] },
];
