// 이야기: 세라벨 대륙, 마법사의 마을 루미나. 8장.
// 대사 형식: [말하는 사람 id, '대사'] — 'hero'는 주인공, 'sys'는 해설. {name}은 주인공 이름.
// 퀘스트 단계 type: talk(npc와 말하기) kill(몬스터 n마리) collect(몬스터가 떨어뜨리는 퀘스트 물건 n개)
//   mid(중간보스 쓰러뜨리기) reach(지역 끝 도착) boss(보스) exam(마탑 시험)

export const WORLD_NAME = '세라벨';

export const SPEAKERS = {
  hero: { name: '{name}' },
  sys: { name: '' },
  orben: { name: '대마법사 오르벤', look: 'orben' },
  rina: { name: '약초상 리나', look: 'rina' },
  leo: { name: '견습 마법사 레오', look: 'leo' },
  garrick: { name: '지팡이 장인 갈릭', look: 'garrick' },
  mira: { name: '의상실 미라', look: 'mira' },
  momo: { name: '잡화점 모모', look: 'momo' },
  carrot: { name: '캐럿', look: 'cat:carrot' },
  elder_liz: { name: '리자드맨 장로 수사', look: 'elder_liz' },
  ceres: { name: '세레스', look: 'mon:ceres' },
  grak: { name: '그락', look: 'mon:goblin_chief' },
  morga: { name: '모르가', look: 'mon:morga' },
  bolg: { name: '볼그', look: 'mon:bolg' },
  kai: { name: '카이', look: 'mon:kai' },
  nekros: { name: '네크로스', look: 'mon:nekros' },
  baltar: { name: '발타르', look: 'mon:baltar' },
  azdaha: { name: '아즈다하', look: 'mon:azdaha' },
  examiner: { name: '마탑 시험관', look: 'orben' },
};

export const PROLOGUE = [
  ['sys', '오백 년 전, 재앙의 용 아즈다하가 세라벨 대륙을 불태웠다.'],
  ['sys', '아홉 원소의 대마법사들은 목숨을 걸고 아홉 개의 봉인을 만들어, 용을 「용의 둥지」 깊은 곳에 잠재웠다.'],
  ['sys', '봉인을 지키는 마법사들이 모여 사는 곳 — 별빛 마탑 아래의 작은 마을, 루미나.'],
  ['sys', '그리고 오늘, 한 견습 마법사가 첫 지팡이를 받는다.'],
];

export const ENDING = [
  ['azdaha', '아홉… 원소가… 하나로… 오백 년 전의 그들과는… 다르구나…'],
  ['sys', '아홉 빛이 겹쳐 용을 감싼다. 이번 봉인은 누구의 희생도 필요 없었다.'],
  ['orben', '{name}, 너는 봉인을 「고친」 게 아니라 새로 「짜냈구나」. 혼자가 아니라 원소 모두와 손잡고.'],
  ['leo', '그러니까… 이제 익스퍼트 정도가 아니라는 거지? 대마법사님?'],
  ['carrot', '냐아!'],
  ['sys', '루미나 마을에는 새 전설이 하나 더해졌다. 아홉 원소와 친구가 된 마법사, {name}의 이야기가.'],
  ['sys', '— 끝. 하지만 모험은 계속할 수 있어요. 더 강한 장비와 남은 스킬을 모아 보세요.'],
];

// 장마다: 제목, 지역 두 곳(field·dungeon), 이야기, 퀘스트 단계
export const CHAPTERS = [
  null,
  {
    id: 1, title: '1장 · 견습의 첫걸음', exam: 1,
    field: { id: 'f1', name: '초록 숲', theme: 'forest', mons: ['slime_green', 'mushroom', 'slime_blue', 'goblin', 'goblin_archer'], mid: 'king_slime' },
    dungeon: { id: 'd1', name: '고블린 굴', theme: 'canyon', dark: true, mons: ['goblin', 'goblin_archer', 'slime_blue'], boss: 'goblin_chief' },
    steps: [
      { type: 'talk', npc: 'orben', text: '마탑 앞의 오르벤 선생님과 이야기하기', say: [
        ['orben', '왔구나, {name}. 오늘로 너도 지팡이를 쥘 나이가 되었지.'],
        ['orben', '마법사는 아홉 원소 가운데 하나와 먼저 마음을 맞춘단다. 첫 원소를 골라 보렴. 시험을 하나 통과할 때마다 새 원소와 친해질 수 있을 게다.'],
        ['sys', '@chooseElement'],
        ['orben', '좋은 선택이다. 이 견습 지팡이를 받거라. 배운 스킬은 [K] 스킬 창에서 익히고, 숫자 칸에 올려 쓰면 된다.'],
        ['orben', '마침 일이 하나 있구나. 요즘 초록 숲의 슬라임이 부쩍 늘었다는구나. 리나가 약초를 못 캔다며 울상이더라.'],
      ] },
      { type: 'kill', mon: 'slime_green', n: 6, area: 'f1', text: '초록 숲에서 초록 슬라임 6마리 쓰러뜨리기', done: [
        ['hero', '슬라임이 이렇게 많다니… 누가 일부러 숲을 어지럽히는 것 같아.'],
        ['carrot', '냥! (풀숲 너머로 초록 귀 몇 개가 보인다)'],
      ] },
      { type: 'collect', mon: 'goblin', item: '도둑맞은 약초', n: 5, area: 'f1', text: '고블린에게서 리나의 약초 5묶음 되찾기', done: [
        ['hero', '약초 바구니에 검은 비늘 무늬가 그려져 있어. 고블린이 이런 걸 그릴 줄 알았나?'],
      ] },
      { type: 'mid', mon: 'king_slime', area: 'f1', text: '숲 깊은 곳의 킹 슬라임 쓰러뜨리기', before: [
        ['sys', '땅이 출렁인다. 왕관을 쓴 거대한 슬라임이 길을 막았다!'],
      ], done: [
        ['hero', '휴… 슬라임들이 몰려든 건 이 녀석 때문이었구나. 그런데 슬라임이 왕관을?'],
        ['carrot', '냐앙. (동굴 쪽을 가리킨다)'],
      ] },
      { type: 'boss', mon: 'goblin_chief', area: 'd1', text: '고블린 굴 안쪽의 족장 그락 쓰러뜨리기', before: [
        ['grak', '크하하! 꼬마 마법사! 검은 비늘 나리가 준 이 힘이면 루미나도 내 거다!'],
        ['hero', '검은 비늘…? 누가 너한테 힘을 줬다는 거야!'],
      ], done: [
        ['grak', '끄윽… 비늘 부적이… 깨졌어…'],
        ['sys', '그락의 목에서 깨진 검은 비늘 부적이 떨어졌다. 차갑고, 오래된 용의 냄새가 난다.'],
      ] },
      { type: 'talk', npc: 'orben', text: '오르벤 선생님께 검은 비늘 부적 보여 드리기', say: [
        ['orben', '이건… 「검은 비늘 교단」의 표식이로구나. 용을 신으로 모시는 자들이지. 오백 년 동안 숨어 있던 무리가 다시 움직이다니.'],
        ['orben', '{name}, 이제 견습으로는 부족하다. 마탑에서 초급 마법사 시험을 보거라. 시험관 골렘을 이기면 된다.'],
      ] },
      { type: 'exam', rank: 1, mon: 'exam_1', text: '별빛 마탑에서 초급 마법사 시험 보기', done: [
        ['orben', '훌륭하다! 오늘부터 너는 초급 마법사다. 새 원소 하나와 더 마음을 맞출 수 있게 되었구나.'],
        ['sys', '@chooseElement'],
      ] },
    ],
  },
  {
    id: 2, title: '2장 · 안개 늪의 속삭임',
    field: { id: 'f2', name: '안개 늪', theme: 'swamp', mons: ['toad', 'slime_poison', 'lizardman', 'lizard_spear', 'wisp_swamp'], mid: 'lizard_captain' },
    dungeon: { id: 'd2', name: '가라앉은 사원', theme: 'swamp', dark: true, indoorWall: true, mons: ['lizardman', 'slime_poison', 'wisp_swamp', 'lizard_spear'], boss: 'morga' },
    steps: [
      { type: 'talk', npc: 'rina', text: '약초상 리나의 이야기 듣기', say: [
        ['rina', '{name}! 큰일이야, 레오가 안개 늪으로 혼자 갔어. 늪 근처 마을 사람들이 하나둘 사라진대서 조사하겠다고…'],
        ['rina', '늪에는 원래 순한 리자드맨들이 살았는데, 요즘은 안개만 끼면 사람을 공격한대. 조심해!'],
      ] },
      { type: 'kill', mon: 'lizardman', n: 6, area: 'f2', text: '안개 늪에서 사나워진 리자드맨 6마리 진정시키기', done: [
        ['elder_liz', '쉬익… 고맙다, 작은 마법사. 우리 젊은이들은 안개에 홀렸다. 안개는 사원의 마녀가 뿜는 것.'],
        ['elder_liz', '하지만 전사장 그르샤가 길을 막고 있다. 그도 홀렸다…'],
      ] },
      { type: 'collect', mon: 'wisp_swamp', item: '안개 구슬', n: 4, area: 'f2', text: '도깨비불이 품은 안개 구슬 4개 모으기', done: [
        ['hero', '안개 구슬 속에서 누군가 속삭여… "물의 봉인… 물의 봉인을 마셔라…"'],
      ] },
      { type: 'mid', mon: 'lizard_captain', area: 'f2', text: '리자드맨 전사장 그르샤 쓰러뜨리기', done: [
        ['elder_liz', '그르샤가 정신을 차렸다. 사원으로 가라. 너의 친구도 거기 붙잡혀 있다.'],
      ] },
      { type: 'boss', mon: 'morga', area: 'd2', text: '가라앉은 사원의 늪의 마녀 모르가 쓰러뜨리기', before: [
        ['morga', '어머, 루미나의 병아리가 또 왔네. 저 친구처럼 얌전히 갇혀 있을래?'],
        ['leo', '{name}! 저 마녀가 물의 봉인을 빨아들이고 있어!'],
      ], done: [
        ['morga', '흥… 늦었어. 발타르 님께서… 곧 아홉 봉인을…'],
        ['sys', '모르가는 검은 안개가 되어 흩어졌다. 사원 바닥의 물의 봉인이 희미하게 다시 빛난다.'],
        ['leo', '살았다… 고마워, {name}. 다음엔 내가 구해 줄게. 아마도.'],
      ] },
      { type: 'talk', npc: 'orben', text: '오르벤 선생님께 「발타르」라는 이름 전하기', say: [
        ['orben', '…발타르라. 그 이름을 다시 들을 줄은 몰랐구나.'],
        ['orben', '지금은 말할 수 없다. 다만 봉인이 하나씩 약해지는 건 틀림없어. 다음은 불의 봉인이 있는 붉은 협곡일 게다.'],
      ] },
    ],
  },
  {
    id: 3, title: '3장 · 불꽃 협곡', exam: 2,
    field: { id: 'f3', name: '붉은 협곡', theme: 'canyon', mons: ['orc', 'orc_shaman', 'salamander', 'slime_lava', 'bat_fire'], mid: 'orc_berserker' },
    dungeon: { id: 'd3', name: '용암 동굴', theme: 'lair', dark: true, mons: ['orc', 'salamander', 'slime_lava', 'bat_fire', 'orc_shaman'], boss: 'bolg' },
    steps: [
      { type: 'talk', npc: 'garrick', text: '지팡이 장인 갈릭의 부탁 듣기', say: [
        ['garrick', '협곡 너머에서 오던 화염석 마차가 또 털렸다네. 오크들이 요즘 이상해. 눈이 시뻘겋고, 지치지도 않아.'],
        ['garrick', '화염석이 없으면 좋은 지팡이도 못 만들어. 가서 좀 혼내 주게. 돌아오면 지팡이 값 깎아 주지!'],
      ] },
      { type: 'kill', mon: 'orc', n: 8, area: 'f3', text: '붉은 협곡의 오크 8마리 쓰러뜨리기' },
      { type: 'collect', mon: 'orc_shaman', item: '붉은 피 약병', n: 4, area: 'f3', text: '오크 주술사가 가진 붉은 약병 4개 빼앗기', done: [
        ['hero', '이 약병… 용의 피를 묽게 탄 거야. 이걸 마셔서 오크들이 미쳐 버린 거구나.'],
      ] },
      { type: 'mid', mon: 'orc_berserker', area: 'f3', text: '오크 광전사 쓰러뜨리기' },
      { type: 'boss', mon: 'bolg', area: 'd3', text: '용암 동굴의 오크 대족장 볼그 쓰러뜨리기', before: [
        ['bolg', '용의 피! 용의 힘! 이 불의 봉인만 부수면 볼그는 용이 된다!'],
      ], done: [
        ['bolg', '불이… 꺼진다… 교단 놈들… 거짓말을…'],
        ['sys', '볼그가 쓰러지자 동굴 깊은 곳의 불의 봉인이 다시 타오른다.'],
      ] },
      { type: 'talk', npc: 'orben', text: '루미나로 돌아가 보고하기', say: [
        ['orben', '불의 봉인까지 노렸다니. 교단은 봉인을 순서대로 무너뜨리고 있구나.'],
        ['orben', '넌 이제 중급 시험을 볼 자격이 있다. 이번 시험관은 조금 거칠 게다.'],
      ] },
      { type: 'exam', rank: 2, mon: 'exam_2', text: '별빛 마탑에서 중급 마법사 시험 보기', done: [
        ['orben', '중급 마법사 {name}! 이 마을에서 너만큼 빨리 오른 아이는 오랜만이구나.'],
        ['sys', '@chooseElement'],
      ] },
    ],
  },
  {
    id: 4, title: '4장 · 얼어붙은 봉우리',
    field: { id: 'f4', name: '서리 산길', theme: 'snow', mons: ['wolf_ice', 'slime_snow', 'yeti', 'bat_frost', 'golem_ice'], mid: 'frost_wolf_king' },
    dungeon: { id: 'd4', name: '빙결 궁전', theme: 'snow', indoorWall: true, mons: ['golem_ice', 'bat_frost', 'slime_snow', 'yeti'], boss: 'ceres' },
    steps: [
      { type: 'talk', npc: 'mira', text: '의상실 미라에게 겨울 옷 받기', say: [
        ['mira', '한여름인데 북쪽 산에서 눈보라가 내려온대. 얼음의 봉인을 지키는 수호자님이 계신 곳인데…'],
        ['mira', '자, 털안감 덧댄 로브야. 감기 걸리면 마법도 엉망이 되니까!'],
      ] },
      { type: 'kill', mon: 'wolf_ice', n: 8, area: 'f4', text: '서리 산길의 얼음 늑대 8마리 쓰러뜨리기' },
      { type: 'mid', mon: 'frost_wolf_king', area: 'f4', text: '서리 늑대왕 쓰러뜨리기', done: [
        ['hero', '늑대왕의 이마에도 검은 비늘이 박혀 있었어. 수호자님까지 무사할까…'],
      ] },
      { type: 'collect', mon: 'golem_ice', item: '빛나는 얼음 핵', n: 4, area: 'd4', text: '빙결 궁전의 얼음 골렘에게서 얼음 핵 4개 얻기', done: [
        ['sys', '얼음 핵마다 슬픈 목소리가 갇혀 있다. "누가… 나를… 멈춰 줘…"'],
      ] },
      { type: 'boss', mon: 'ceres', area: 'd4', text: '빙결의 여왕 세레스를 막기', before: [
        ['ceres', '오지 마… 내 안의 검은 비늘이… 모두 얼려 버리라고 해…'],
        ['hero', '세레스님! 제가 그 저주를 깨 드릴게요!'],
      ], done: [
        ['ceres', '…따뜻하구나. 오백 년 만에 처음이야. 고맙다, 작은 마법사.'],
        ['ceres', '들으렴. 교단을 이끄는 발타르는 오르벤의 제자였다. 오르벤이 가장 아끼던 아이였지.'],
      ] },
      { type: 'talk', npc: 'orben', text: '오르벤 선생님께 진실을 묻기', say: [
        ['orben', '…세레스가 말했구나. 그래, 발타르는 내 첫 제자였다. 누구보다 재능 있었고, 누구보다 용의 힘에 끌렸지.'],
        ['orben', '그 아이를 막지 못한 건 내 잘못이다. 하지만 {name}, 너까지 잃고 싶지는 않구나.'],
        ['hero', '선생님, 저는 도망치지 않을 거예요. 다음 봉인은 어디죠?'],
        ['orben', '…하늘의 「바람의 탑」. 고집도 나를 닮았구나.'],
      ] },
    ],
  },
  {
    id: 5, title: '5장 · 바람의 탑', exam: 3,
    field: { id: 'f5', name: '구름 다리', theme: 'sky', mons: ['harpy', 'wisp_wind', 'slime_storm', 'gargoyle', 'cultist'], mid: 'griffin' },
    dungeon: { id: 'd5', name: '바람의 탑 꼭대기', theme: 'sky', indoorWall: true, mons: ['gargoyle', 'cultist', 'wisp_wind', 'harpy'], boss: 'kai' },
    steps: [
      { type: 'talk', npc: 'leo', text: '레오와 함께 구름 다리로 가기', say: [
        ['leo', '이번엔 나도 간다! 바람 원소는 내 전공이거든. …시험은 두 번 떨어졌지만.'],
        ['leo', '탑 꼭대기에 교단의 「바람의 집행자」가 있대. 이름은 카이. 우리 또래라던데.'],
      ] },
      { type: 'kill', mon: 'cultist', n: 6, area: 'f5', text: '구름 다리의 교단 수련생 6명 물리치기' },
      { type: 'collect', mon: 'harpy', item: '폭풍 깃털', n: 5, area: 'f5', text: '하피에게서 폭풍 깃털 5개 모으기 (탑 결계 풀기)', done: [
        ['leo', '깃털로 결계를 풀었어! 근데 저 위에서 무언가 엄청 크게 날갯짓을…'],
      ] },
      { type: 'mid', mon: 'griffin', area: 'f5', text: '폭풍 그리폰 쓰러뜨리기' },
      { type: 'boss', mon: 'kai', area: 'd5', text: '바람의 집행자 카이 쓰러뜨리기', before: [
        ['kai', '루미나의 마법사인가. 오르벤에게 속고 있는 줄도 모르고.'],
        ['kai', '오백 년 전 봉인은 아홉 마법사의 「목숨」으로 만든 거다. 봉인이 약해지면, 누군가 또 죽어야 해. 오르벤은 그걸 너에게 시킬 생각이지.'],
        ['hero', '…그래도 용을 깨우는 건 답이 아니야!'],
      ], done: [
        ['kai', '강하군… 그럼 네가 찾아 봐. 희생 없는 봉인을. 그런 게… 있다면…'],
        ['sys', '카이는 바람에 몸을 맡긴 채 사라졌다. 탑의 바람의 봉인이 다시 돈다.'],
      ] },
      { type: 'talk', npc: 'orben', text: '오르벤 선생님께 카이의 말 묻기', say: [
        ['orben', '카이의 말은 사실이다. 봉인은 희생으로 만들어졌다. 그리고… 다시 짤 때가 오면 내가 할 생각이었다.'],
        ['hero', '그런 건 싫어요. 다른 방법이 분명 있을 거예요.'],
        ['orben', '…먼저 상급 시험을 통과하거라. 그 다음, 가라앉은 도서관의 옛 기록을 찾아보자꾸나.'],
      ] },
      { type: 'exam', rank: 3, mon: 'exam_3', text: '별빛 마탑에서 상급 마법사 시험 보기', done: [
        ['orben', '상급 마법사가 된 걸 축하한다. 이제 너는 봉인을 지키는 마법사 가운데 하나다.'],
        ['sys', '@chooseElement'],
      ] },
    ],
  },
  {
    id: 6, title: '6장 · 가라앉은 도서관',
    field: { id: 'f6', name: '잠긴 서고', theme: 'library', indoorWall: true, mons: ['skeleton', 'ghost', 'book_mimic', 'slime_shadow', 'skeleton_mage'], mid: 'forbidden_book' },
    dungeon: { id: 'd6', name: '금서고', theme: 'library', dark: true, indoorWall: true, mons: ['skeleton_mage', 'ghost', 'skeleton', 'slime_shadow'], boss: 'nekros' },
    steps: [
      { type: 'talk', npc: 'momo', text: '잡화점 모모에게 도서관 열쇠 사기', say: [
        ['momo', '가라앉은 도서관 열쇠? 우리 할머니의 할머니가 쓰던 거라 녹이 좀 슬었지만… 공짜로 줄게! 대신 살아서 와.'],
        ['momo', '그 도서관엔 「책을 지키다 책이 된 사서」가 있대. 무서운 얘기지?'],
      ] },
      { type: 'kill', mon: 'skeleton', n: 8, area: 'f6', text: '잠긴 서고의 해골 병사 8명 쓰러뜨리기' },
      { type: 'collect', mon: 'book_mimic', item: '봉인 기록 쪽지', n: 5, area: 'f6', text: '책 미믹에게서 봉인 기록 쪽지 5장 모으기', done: [
        ['sys', '쪽지를 이어 붙이자 한 문장이 드러난다. "아홉 원소가 서로를 미워하지 않는다면, 봉인에 피는 필요 없다."'],
        ['hero', '희생 없는 봉인… 정말로 있었어!'],
      ] },
      { type: 'mid', mon: 'forbidden_book', area: 'f6', text: '금서 「검은 장」 덮기' },
      { type: 'boss', mon: 'nekros', area: 'd6', text: '금서고의 리치 네크로스 쓰러뜨리기', before: [
        ['nekros', '책을 펼치려는 자여. 오백 년 전 나는 이 비밀을 지키려고 죽음마저 버렸다.'],
        ['nekros', '그 비밀이 너무 위험하기에. 아홉 원소를 하나로 묶는 자는… 용보다 강해질 수 있으니.'],
        ['hero', '저는 지배하려는 게 아니에요. 지키려는 거예요!'],
      ], done: [
        ['nekros', '…그 눈. 발타르와는 다르군. 가져가라. 그리고 서둘러라. 그 자는 이미 「시간의 미궁」으로 갔다.'],
      ] },
      { type: 'talk', npc: 'orben', text: '오르벤 선생님께 희생 없는 봉인 알리기', say: [
        ['orben', '아홉 원소의 조화라… 오백 년 동안 아무도 해내지 못했지. 하지만 너라면.'],
        ['orben', '발타르는 시간 마법으로 용이 잠든 시간을 「감아」 그 힘을 통째로 삼키려는 게다. 미궁으로 가거라. 나도 곧 뒤따르마.'],
      ] },
    ],
  },
  {
    id: 7, title: '7장 · 시간의 미궁', exam: 4,
    field: { id: 'f7', name: '모래시계 사막', theme: 'time', mons: ['scorpion', 'clockwork', 'bat_clock', 'time_wraith', 'cult_mage'], mid: 'clocktower_golem' },
    dungeon: { id: 'd7', name: '시간의 미궁', theme: 'time', dark: true, indoorWall: true, mons: ['clockwork', 'time_wraith', 'cult_mage', 'bat_clock'], boss: 'baltar' },
    steps: [
      { type: 'talk', npc: 'leo', text: '레오에게서 미궁 소식 듣기', say: [
        ['leo', '{name}, 사막의 모래가 거꾸로 흘러! 위로! 이게 말이 돼?'],
        ['leo', '교단 마도사들이 시계탑을 세워서 시간을 감고 있대. 저 시계탑부터 멈춰야 해.'],
      ] },
      { type: 'kill', mon: 'cult_mage', n: 8, area: 'f7', text: '모래시계 사막의 교단 마도사 8명 물리치기' },
      { type: 'mid', mon: 'clocktower_golem', area: 'f7', text: '시계탑 수호자 멈추기' },
      { type: 'collect', mon: 'time_wraith', item: '멈춘 초침', n: 5, area: 'd7', text: '시간의 망령에게서 멈춘 초침 5개 모으기 (미궁 길 열기)' },
      { type: 'boss', mon: 'baltar', area: 'd7', text: '교단장 발타르 쓰러뜨리기', before: [
        ['baltar', '스승님의 새 제자로군. 그 늙은이는 너에게 「희생」을 가르쳤나? 나는 「힘」을 택했다.'],
        ['baltar', '용의 시간을 감으면, 오백 년의 힘이 나의 것이 된다. 아무도 죽을 필요 없지. 나 말고는 아무도 남지 않을 테니.'],
        ['hero', '그건 아무도 남지 않는다는 뜻이잖아!'],
      ], done: [
        ['baltar', '크윽… 하지만 늦었다. 마지막 바늘은… 이미 돌았다.'],
        ['sys', '땅이 울린다. 멀리 남쪽 화산에서 붉은 빛이 하늘을 찢는다. — 재앙의 용이 깨어났다.'],
        ['orben', '{name}! …내가 늦었구나. 발타르, 바보 같은 녀석.'],
      ] },
      { type: 'talk', npc: 'orben', text: '루미나로 돌아가 오르벤 선생님과 이야기하기', say: [
        ['orben', '용은 깨어났다. 이제 남은 건 새 봉인뿐이다. 아홉 원소를 하나로 묶는 봉인.'],
        ['orben', '마지막 시험이다. 익스퍼트 시험관은 바로 나, 아니 나의 환영이다. 나를 넘어서지 못하면 용 앞에 설 수 없다.'],
      ] },
      { type: 'exam', rank: 4, mon: 'exam_4', text: '별빛 마탑에서 익스퍼트 마법사 시험 보기', done: [
        ['orben', '…허허. 내 환영이 졌구나. 익스퍼트 마법사 {name}. 이 마을의 자랑이다.'],
        ['sys', '@chooseElement'],
        ['orben', '가거라. 이번에는 혼자 짊어지지 말고, 원소들과 함께.'],
      ] },
    ],
  },
  {
    id: 8, title: '8장 · 용의 둥지',
    field: { id: 'f8', name: '불타는 화산길', theme: 'lair', mons: ['drake', 'dragonkin', 'wisp_fire', 'golem_magma', 'dragon_priest'], mid: 'wyvern' },
    dungeon: { id: 'd8', name: '용의 둥지', theme: 'lair', dark: true, mons: ['dragonkin', 'golem_magma', 'drake', 'dragon_priest'], boss: 'azdaha' },
    steps: [
      { type: 'talk', npc: 'orben', text: '출발 전 마지막으로 마을 사람들과 인사하기', say: [
        ['rina', '{name}, 내가 만든 제일 좋은 물약이야. 꼭 돌아와.'],
        ['garrick', '내 평생 최고의 지팡이를 깎아 두겠네. 돌아와서 받아 가.'],
        ['leo', '난 마을을 지킬게. …다음엔 진짜로 같이 가자.'],
        ['carrot', '냐아앙! (캐럿은 처음부터 끝까지 함께다)'],
      ] },
      { type: 'kill', mon: 'dragonkin', n: 8, area: 'f8', text: '불타는 화산길의 용인족 전사 8명 쓰러뜨리기' },
      { type: 'collect', mon: 'dragon_priest', item: '봉인의 조각', n: 5, area: 'f8', text: '용의 신관이 빼앗은 봉인의 조각 5개 되찾기', done: [
        ['sys', '아홉 봉인의 조각이 모였다. 조각들이 서로를 끌어당기며 부드럽게 빛난다.'],
      ] },
      { type: 'mid', mon: 'wyvern', area: 'f8', text: '둥지 입구의 검은 와이번 쓰러뜨리기' },
      { type: 'boss', mon: 'azdaha', area: 'd8', text: '재앙의 용 아즈다하 다시 잠재우기', before: [
        ['azdaha', '작은 것. 오백 년 전에도 너희는 아홉이었다. 그런데 이번엔 하나뿐이로군.'],
        ['hero', '하나가 아니야. 나한테는 아홉 원소랑, 루미나랑, 캐럿이 있어!'],
        ['carrot', '냐앗!'],
      ], done: '@ending' },
    ],
  },
];

// 마을 사람 (루미나)
export const NPCS = {
  orben: { name: '대마법사 오르벤', role: 'quest', look: { skin: [246, 211, 179], hair: [225, 225, 230], style: 'bald', outfit: [70, 80, 160], kind: 'robe', band: [227, 179, 65], beard: true, hat: { c: [55, 60, 130], band: [227, 179, 65] }, staff: { orb: [160, 220, 255] } },
    idle: ['마탑의 시험은 언제든 다시 볼 수 있단다.', '원소는 서로 미워하지 않는단다. 사람이 그렇게 만들 뿐이지.'] },
  rina: { name: '약초상 리나', role: 'shop:potion', look: { skin: [222, 172, 128], hair: [60, 110, 60], style: 'long', outfit: [120, 160, 80], kind: 'dress' },
    idle: ['물약은 넉넉히! 마나가 바닥나면 마법사도 그냥 사람이야.'] },
  garrick: { name: '지팡이 장인 갈릭', role: 'shop:staff', look: { skin: [222, 172, 128], hair: [120, 80, 50], style: 'bald', beard: [150, 100, 60], outfit: [130, 90, 60], kind: 'tunic', pants: [80, 60, 40] },
    idle: ['좋은 지팡이는 마법사를 고르지. 자넨 어떤 지팡이에게 골라질 텐가?'] },
  mira: { name: '의상실 미라', role: 'shop:cloth', look: { skin: [246, 211, 179], hair: [200, 120, 180], style: 'pigtails', outfit: [60, 140, 150], kind: 'dress', hat: { c: [30, 90, 100], band: [250, 210, 230] } },
    idle: ['모자는 마나를, 로브는 체력을 지켜 줘. 멋은 덤이고!'] },
  momo: { name: '잡화점 모모', role: 'shop:general', look: { skin: [246, 211, 179], hair: [230, 180, 90], style: 'bun', outfit: [240, 236, 224], kind: 'tunic', pants: [110, 80, 60] },
    idle: ['귀환 주문서 하나쯤은 늘 가방에 넣어 둬.', '반지랑 목걸이도 조금 들여놨어.'] },
  leo: { name: '견습 마법사 레오', role: 'talk', look: { skin: [160, 106, 70], hair: [30, 24, 30], style: 'short', outfit: [90, 60, 130], kind: 'tunic', pants: [60, 50, 70] },
    idle: ['언젠가 나도 시험에 붙을 거야. 언젠가…', '바람 마법은 속도가 생명이지!'] },
  elder_liz: { name: '리자드맨 장로 수사', role: 'talk', look: { skin: [90, 140, 100], hair: [60, 100, 70], style: 'bald', hairSide: false, outfit: [110, 100, 70], kind: 'robe', snout: true, tail: [80, 130, 90], staff: { orb: [140, 220, 160] } }, idle: ['쉬익… 늪은 다시 조용해질 것이다.'] },
};

// 주인공 고르기
export const HEROES = {
  girl: { label: '소녀 마법사', defName: '페퍼', look: { skin: [246, 211, 179], hair: [138, 59, 36], style: 'messy' } },
  boy: { label: '소년 마법사', defName: '루카', look: { skin: [246, 211, 179], hair: [110, 80, 50], style: 'short' } },
};
