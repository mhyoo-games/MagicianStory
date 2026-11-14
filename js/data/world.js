// 이어진 세계: 루미나에서 출발해 왼쪽 → 오른쪽으로 계속 걸어 나간다. 지역 사이를 걸어서 오가고,
// 들렀던 마을의 비석끼리는 순간 이동할 수 있다.
// 지역(kind field·cave)은 구간(segs)을 이어 붙여 만든다:
//   field/cave 사냥터 · blink 블링크로만 건너는 낭떠러지 · plates 발판 동시에 밟기 · torches 순서대로 화로 켜기
//   crystals 수정 불 맞추기 · boulder 바위 밀어 스위치 누르기 · ice 미끄러운 얼음길 · wind 바람길 · lava 용암 디딤돌
//   defend 지키기 자리 · arena 중간보스 공터 · boss 보스방
export const ORDER = [
  't_lumina', 'r_hill', 'r_forest', 'r_gcave',
  't_hari', 'r_swamp', 'r_temple',
  't_dorn', 'r_canyon', 'r_mine',
  't_serena', 'r_frost', 'r_palace',
  't_aero', 'r_bridge', 'r_tower',
  't_libra', 'r_stacks', 'r_vault',
  't_sahar', 'r_desert', 'r_maze',
  't_camp', 'r_volcano', 'r_lair',
];

export const REGIONS = {
  t_lumina: { name: '루미나 마을', kind: 'town', theme: 'meadow', ch: 1, music: 'town1',
    npcs: [['orben', 'quest'], ['rina', 'shop:potion'], ['garrick', 'smith'], ['mira', 'shop:cloth'], ['momo', 'shop:general'], ['leo', 'talk'], ['petshop', 'pet']], tower: 1 },
  r_hill: { name: '마을 뒷동산', kind: 'field', theme: 'meadow', ch: 1, mons: ['slime_green', 'mushroom'], segs: ['field', 'blink', 'field', 'plates'], music: 'field1',
    finds: [{ id: 'kitten', seg: 2, name: '덤불 속 아기 고양이', pet: 'carrot' }] },
  r_forest: { name: '초록 숲', kind: 'field', theme: 'forest', ch: 1, mons: ['slime_green', 'mushroom', 'slime_blue', 'goblin'], segs: ['field', 'torches', 'field', 'arena'], mid: 'king_slime', music: 'field1',
    finds: [{ id: 'herb1', seg: 0, name: '빛나는 약초' }, { id: 'herb2', seg: 2, name: '빛나는 약초' }, { id: 'herb3', seg: 2, name: '빛나는 약초', far: 1 }] },
  r_gcave: { name: '고블린 굴', kind: 'cave', theme: 'cave', ch: 1, mons: ['goblin', 'goblin_archer', 'slime_blue'], segs: ['cave', 'boulder', 'cave', 'boss'], boss: 'goblin_chief', music: 'cave1' },

  t_hari: { name: '강가 마을 하리', kind: 'town', theme: 'river', ch: 2, music: 'town2',
    npcs: [['cecil', 'exam'], ['otto', 'quest'], ['hari_shop', 'shop:potion'], ['hari_smith', 'smith'], ['hari_tailor', 'shop:cloth'], ['hari_general', 'shop:general']], tower: 1 },
  r_swamp: { name: '안개 늪', kind: 'field', theme: 'swamp', ch: 2, mons: ['toad', 'slime_poison', 'lizardman', 'wisp_swamp', 'lizard_spear'], segs: ['field', 'torches', 'field', 'blink', 'arena'], mid: 'lizard_captain', music: 'field2', fog: 1 },
  r_temple: { name: '가라앉은 사원', kind: 'cave', theme: 'mossy', ch: 2, mons: ['lizardman', 'slime_poison', 'wisp_swamp', 'lizard_spear'], segs: ['cave', 'crystals', 'cave', 'boss'], boss: 'morga', music: 'cave2' },

  t_dorn: { name: '광산 마을 도른', kind: 'town', theme: 'canyon', ch: 3, music: 'town2',
    npcs: [['bron', 'smith'], ['dorn_chief', 'quest'], ['dorn_shop', 'shop:potion'], ['dorn_staff', 'shop:staff'], ['dorn_general', 'shop:general'], ['petshop2', 'pet']] },
  r_canyon: { name: '붉은 협곡', kind: 'field', theme: 'canyon', ch: 3, mons: ['orc', 'salamander', 'orc_shaman', 'bat_fire'], segs: ['field', 'lava', 'defend', 'field', 'arena'], mid: 'orc_berserker', music: 'field3' },
  r_mine: { name: '용암 갱도', kind: 'cave', theme: 'lavacave', ch: 3, mons: ['orc', 'slime_lava', 'bat_fire', 'orc_shaman', 'salamander'], segs: ['cave', 'boulder', 'lava', 'boss'], boss: 'bolg', music: 'cave2' },

  t_serena: { name: '눈마을 세레나', kind: 'town', theme: 'snow', ch: 4, music: 'town3',
    npcs: [['iris', 'exam'], ['serena_elder', 'quest'], ['serena_shop', 'shop:potion'], ['serena_smith', 'smith'], ['serena_tailor', 'shop:cloth'], ['serena_general', 'shop:general']], tower: 1 },
  r_frost: { name: '서리 산길', kind: 'field', theme: 'snow', ch: 4, mons: ['wolf_ice', 'slime_snow', 'yeti', 'bat_frost'], segs: ['field', 'ice', 'field', 'arena'], mid: 'frost_wolf_king', music: 'field4',
    finds: [{ id: 'trav1', seg: 0, name: '얼어붙은 나그네' }, { id: 'trav2', seg: 2, name: '얼어붙은 나그네' }, { id: 'trav3', seg: 2, name: '얼어붙은 나그네', far: 1 }] },
  r_palace: { name: '빙결 궁전', kind: 'cave', theme: 'icecave', ch: 4, mons: ['golem_ice', 'bat_frost', 'slime_snow', 'yeti'], segs: ['cave', 'crystals', 'ice', 'boss'], boss: 'ceres', music: 'cave3' },

  t_aero: { name: '구름 정류장 아에로', kind: 'town', theme: 'sky', ch: 5, music: 'town3',
    npcs: [['leo', 'quest'], ['aero_keeper', 'talk'], ['aero_shop', 'shop:potion'], ['aero_smith', 'smith'], ['aero_staff', 'shop:staff'], ['petshop3', 'pet']] },
  r_bridge: { name: '구름 다리', kind: 'field', theme: 'sky', ch: 5, mons: ['harpy', 'wisp_wind', 'slime_storm', 'gargoyle', 'cultist'], segs: ['field', 'blink', 'wind', 'field', 'arena'], mid: 'griffin', music: 'field5' },
  r_tower: { name: '바람의 탑', kind: 'cave', theme: 'skycave', ch: 5, mons: ['gargoyle', 'cultist', 'wisp_wind', 'harpy'], segs: ['cave', 'plates', 'wind', 'boss'], boss: 'kai', music: 'cave3' },

  t_libra: { name: '학자 마을 리브라', kind: 'town', theme: 'library', ch: 6, music: 'town4',
    npcs: [['nora', 'quest'], ['libra_exam', 'exam'], ['libra_shop', 'shop:potion'], ['libra_smith', 'smith'], ['libra_tailor', 'shop:cloth'], ['libra_general', 'shop:general']], tower: 1 },
  r_stacks: { name: '잠긴 서고', kind: 'cave', theme: 'library', ch: 6, mons: ['skeleton', 'ghost', 'book_mimic', 'zombie', 'skeleton_mage'], segs: ['cave', 'torches', 'cave', 'arena'], mid: 'forbidden_book', music: 'cave4' },
  r_vault: { name: '금서고', kind: 'cave', theme: 'vault', ch: 6, mons: ['skeleton_mage', 'ghost', 'skeleton', 'zombie'], segs: ['cave', 'crystals', 'cave', 'boss'], boss: 'nekros', music: 'cave4' },

  t_sahar: { name: '오아시스 마을 사하르', kind: 'town', theme: 'desert', ch: 7, music: 'town4',
    npcs: [['sahar_elder', 'quest'], ['sahar_shop', 'shop:potion'], ['sahar_smith', 'smith'], ['sahar_staff', 'shop:staff'], ['sahar_general', 'shop:general'], ['petshop4', 'pet']] },
  r_desert: { name: '모래시계 사막', kind: 'field', theme: 'desert', ch: 7, mons: ['scorpion', 'clockwork', 'zombie_dry', 'cult_mage'], segs: ['field', 'plates', 'field', 'blink', 'arena'], mid: 'clocktower', music: 'field6' },
  r_maze: { name: '시간의 미궁', kind: 'cave', theme: 'timecave', ch: 7, mons: ['clockwork', 'time_wraith', 'cult_mage', 'zombie_dry'], segs: ['cave', 'boulder', 'crystals', 'boss'], boss: 'baltar', music: 'cave5' },

  t_camp: { name: '봉인 기사단 야영지', kind: 'town', theme: 'ash', ch: 8, music: 'town5',
    npcs: [['orben', 'exam'], ['camp_captain', 'quest'], ['camp_shop', 'shop:potion'], ['camp_smith', 'smith'], ['camp_general', 'shop:general'], ['leo', 'talk']], tower: 1 },
  r_volcano: { name: '불타는 화산길', kind: 'field', theme: 'volcano', ch: 8, mons: ['drake', 'wisp_fire', 'dragonkin', 'golem_magma', 'dragon_priest'], segs: ['field', 'lava', 'defend', 'lava', 'arena'], mid: 'wyvern', music: 'field7' },
  r_lair: { name: '용의 둥지', kind: 'cave', theme: 'lair', ch: 8, mons: ['dragonkin', 'golem_magma', 'drake', 'dragon_priest'], segs: ['cave', 'blink', 'cave', 'boss'], boss: 'azdaha', music: 'cave5' },
};
ORDER.forEach((id, i) => { const r = REGIONS[id]; r.id = id; r.idx = i; r.prev = ORDER[i - 1] || null; r.next = ORDER[i + 1] || null; });
export const TOWNS = ORDER.filter((id) => REGIONS[id].kind === 'town');

// 테마: 땅·물·벽·나무 색 (3D 그리기에 씀)
export const THEMES = {
  meadow: { ground: '#86c06a', ground2: '#76b05c', path: '#d8bc84', water: '#5aa8e0', cliff: '#8a8070', leaf: '#5aa04a', leaf2: '#7cc05a', trunk: '#7a5232', rock: '#9a9488', sky: '#a8d8f0', fog: '#cfe8f4', flower: ['#ff7a7a', '#ffe060', '#ffffff'] },
  forest: { ground: '#6aa456', ground2: '#5a9448', path: '#c0a070', water: '#4a98d0', cliff: '#6a6a5a', leaf: '#3a7a3a', leaf2: '#5a9a3a', trunk: '#6a4426', rock: '#7a7a70', sky: '#9ccce0', fog: '#bcd8c0', flower: ['#ff8ab0', '#fff080', '#c0a0ff'] },
  river: { ground: '#8ac270', ground2: '#7ab062', path: '#dcc490', water: '#4aa0e0', cliff: '#8a8070', leaf: '#4a9048', leaf2: '#6ab050', trunk: '#7a5232', rock: '#9a9488', sky: '#a8d8f0', fog: '#cfe8f4', flower: ['#ff9a6a', '#ffffff', '#ffe060'] },
  swamp: { ground: '#6a7a4a', ground2: '#5a6a40', path: '#8a7a54', water: '#4a6a4a', cliff: '#4a5040', leaf: '#4a6a3a', leaf2: '#5a7a40', trunk: '#4a3a2a', rock: '#6a6a5a', sky: '#7a8a7a', fog: '#8a9a88', flower: ['#c0e080', '#a080c0', '#e0f0b0'], dead: 1 },
  canyon: { ground: '#c47a4a', ground2: '#b46a40', path: '#e0a46a', water: '#ff7a2a', lava: 1, cliff: '#8a4a32', leaf: '#8a6a3a', leaf2: '#a07a40', trunk: '#5a3a2a', rock: '#9a5a40', sky: '#f0b880', fog: '#e8b090', flower: ['#ffb040', '#ff6040'], noTree: 1 },
  snow: { ground: '#e8f0f8', ground2: '#d8e4f0', path: '#c8d8e8', water: '#8ac8f0', ice: 1, cliff: '#9aa8b8', leaf: '#3a6a5a', leaf2: '#4a7a6a', trunk: '#5a4434', rock: '#aab4c4', sky: '#c8dcf0', fog: '#e0ecf8', flower: ['#ffffff', '#c0e0ff'], pine: 1 },
  sky: { ground: '#e0dce8', ground2: '#d0ccdc', path: '#f4ecd8', water: '#b8d8f8', void: 1, cliff: '#c0bcd0', leaf: '#7ac0a0', leaf2: '#9ad0b0', trunk: '#8a7a6a', rock: '#c8c4d8', sky: '#bcdcff', fog: '#e8f0ff', flower: ['#ffffff', '#a0f0d0', '#fff0a0'] },
  desert: { ground: '#e0c890', ground2: '#d4ba80', path: '#f0dca8', water: '#5ab0d0', cliff: '#c0a070', leaf: '#6a9a4a', leaf2: '#8ab05a', trunk: '#8a6a3a', rock: '#c8a878', sky: '#f8e0a8', fog: '#f4e4c0', flower: ['#ff9050', '#ffe080'], cactus: 1 },
  volcano: { ground: '#5a4448', ground2: '#4a383c', path: '#7a5a50', water: '#ff6a2a', lava: 1, cliff: '#3a2a2e', leaf: '#5a3a3a', leaf2: '#6a4a3a', trunk: '#3a2a2a', rock: '#4a3a3e', sky: '#5a3030', fog: '#7a4a40', flower: ['#ff6040', '#ffb040'], noTree: 1 },
  ash: { ground: '#7a6a64', ground2: '#6a5c58', path: '#9a8a7a', water: '#ff7a3a', lava: 1, cliff: '#4a3e3a', leaf: '#5a5a4a', leaf2: '#6a6a50', trunk: '#3a2e28', rock: '#5a504c', sky: '#7a5a50', fog: '#8a6a60', flower: ['#ffb040'] },
  library: { ground: '#8a6a4a', ground2: '#7a5e42', path: '#a8885a', water: '#2a2a4a', cliff: '#5a4a5a', leaf: '#5a4a3a', leaf2: '#6a5a4a', trunk: '#4a3424', rock: '#6a5a6a', sky: '#3a3048', fog: '#4a4060', flower: ['#c0a0ff', '#ffe0a0'], indoor: 1 },
  // 동굴 테마: 동굴 키트에 입힐 색
  cave: { tint: '#ffffff', tex: 'colormap', light: '#ffd8a8', fog: '#2a1a14', amb: 0.75 },
  mossy: { tint: '#a8d0a0', tex: 'variation-a', light: '#c8f0a0', fog: '#14201a', amb: 0.6 },
  lavacave: { tint: '#ffb098', tex: 'colormap', light: '#ff9050', fog: '#2a0e08', amb: 0.6, lava: 1 },
  icecave: { tint: '#c0e4ff', tex: 'variation-b', light: '#c8ecff', fog: '#0e1828', amb: 0.8, ice: 1 },
  skycave: { tint: '#e0e0ff', tex: 'variation-b', light: '#ffffff', fog: '#202838', amb: 0.9 },
  vault: { tint: '#b0a0d0', tex: 'variation-a', light: '#b090ff', fog: '#100a1a', amb: 0.5 },
  timecave: { tint: '#f0d8a0', tex: 'colormap', light: '#ffe0a0', fog: '#1a140a', amb: 0.7 },
  lair: { tint: '#ff9a88', tex: 'colormap', light: '#ff7040', fog: '#200606', amb: 0.55, lava: 1 },
};
// library는 들판 테마지만 동굴처럼 그린다 (책장 벽)
THEMES.library.caveLike = { tint: '#d8b890', tex: 'variation-a', light: '#ffe0a0', fog: '#140e0a', amb: 0.7, shelves: 1 };
