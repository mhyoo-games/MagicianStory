// 데이터·맵 검사: node tests/data.test.mjs
import assert from 'node:assert/strict';
import { SKILLS, ELEMENTS, ELEMENT_TRAIT, skillAt } from '../js/data/skills.js';
import { ITEMS, SLOTS, CONSUMABLES, MATERIALS, ENHANCE, enhanceMul } from '../js/data/items.js';
import { MONSTERS } from '../js/data/monsters.js';
import { PETS, PET_BOXES } from '../js/data/pets.js';
import { CHAPTERS, NPCS, SPEAKERS, PROLOGUE, ENDING } from '../js/data/story.js';
import { REGIONS, ORDER, THEMES } from '../js/data/world.js';
import { buildRegion, tileAt, isWalkTile, blinkLand, VOID, LAVA, WATER, WIND, ICE, WALL } from '../js/mapgen.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// 스킬: 원소마다 6개, 공용 2개, 특성 둘씩
const sk = Object.values(SKILLS);
ok(sk.length === 56, `스킬 56개 (지금 ${sk.length})`);
ok(new Set(sk.map((s) => s.name)).size === sk.length, '스킬 이름이 모두 다름');
for (const e of ELEMENTS) {
  const list = sk.filter((s) => s.el === e);
  ok(list.length === 6, `${e} 스킬 6개`);
  ok(ELEMENT_TRAIT[e] && ELEMENT_TRAIT[e].desc, `${e} 원소 특성`);
  for (let r = 0; r <= 4; r++) ok(list.some((s) => s.rank === r), `${e} ${r}계급 스킬`);
  for (const s of list) {
    ok(s.traits && s.traits.length === 2 && s.traits.every((t) => t.name && t.desc), `${s.id} 특성 A/B`);
    ok(s.mp > 0 && s.cd > 0 && s.desc, `${s.id} MP·재사용·설명`);
    const a = skillAt(s.id, 5, 0), b = skillAt(s.id, 5, 1);
    ok(a.traitName && b.traitName && a.traitName !== b.traitName, `${s.id} 특성 적용`);
  }
}
ok(SKILLS.blink.base && SKILLS.blink.kind === 'blink', '블링크는 기본 스킬');
ok(sk.filter((s) => s.kind === 'blink').length === 1, '이동기는 블링크 하나');

// 장비·재료·강화
const it = Object.values(ITEMS);
ok(it.length === 120, `장비 120개 (지금 ${it.length})`);
ok(new Set(it.map((x) => x.name)).size === it.length, '장비 이름이 모두 다름');
for (const x of it) {
  ok(SLOTS.includes(x.slot) && x.tier >= 1 && x.tier <= 8 && x.price > 0, `${x.id} 기본`);
  if (x.src === 'craft') { ok(x.recipe && x.recipe.gold > 0, `${x.id} 제작법`); for (const m of Object.keys(x.recipe)) if (m !== 'gold') ok(MATERIALS[m], `${x.id} 재료 ${m}`); }
  if (x.src === 'boss') ok(MONSTERS[x.bossOf] && MONSTERS[x.bossOf].role === 'boss', `${x.id} 보스 ${x.bossOf}`);
}
for (let t = 1; t <= 8; t++) for (const src of ['shop', 'craft', 'drop']) ok(it.some((x) => x.tier === t && x.src === src), `${t}단계 ${src}`);
for (const b of Object.values(MONSTERS).filter((m) => m.role === 'boss')) ok(it.filter((x) => x.bossOf === b.id).length === 2, `${b.id} 고유 장비 둘`);
ok(ENHANCE.length === 21 && ENHANCE[20].to === 20, '강화 +20까지');
for (let i = 1; i <= 20; i++) { ok(ENHANCE[i].rate > 0 && ENHANCE[i].rate <= 100, `+${i} 확률`); if (i > 1) ok(ENHANCE[i].rate <= ENHANCE[i - 1].rate, `+${i} 확률은 점점 낮아짐`); ok((ENHANCE[i].breakOnFail > 0) === (i >= 12), `+${i} 파괴는 12강부터`); }
ok(enhanceMul(20) >= 2.8, '+20은 능력치가 크게 오름');
for (const c of Object.values(CONSUMABLES)) ok(c.price > 0, `${c.id} 값`);

// 펫
const pets = Object.values(PETS);
ok(pets.length >= 16, '펫 16종 이상');
for (let r = 0; r <= 4; r++) ok(pets.filter((p) => p.rar === r && p.id !== 'carrot').length >= 2, `${r}등급 펫 둘 이상`);
for (const p of pets) ok(Object.keys(p.eff).length && p.desc && p.model, `${p.id} 효과`);
for (const b of Object.values(PET_BOXES)) ok(Math.abs(b.odds.reduce((a, c) => a + c, 0) - 100) < 1e-6, `${b.name} 확률 합 100`);

// 몬스터
for (const m of Object.values(MONSTERS)) ok(m.model && m.model.t && m.lv > 0, `${m.id} 모양`);
ok(Object.values(MONSTERS).filter((m) => m.role === 'normal').length >= 40, '일반 몬스터 40종 이상');
for (const m of Object.values(MONSTERS).filter((x) => ['mid', 'boss', 'exam'].includes(x.role))) ok(m.boss, `${m.id} 기믹`);

// 세계: 이어진 순서, 마을 8곳
ok(ORDER.length === 25 && ORDER.filter((id) => REGIONS[id].kind === 'town').length === 8, '지역 25곳 · 마을 8곳');
for (const id of ORDER) {
  const R = REGIONS[id];
  ok(THEMES[R.theme], `${id} 테마`);
  for (const m of R.mons || []) ok(MONSTERS[m] && MONSTERS[m].role === 'normal', `${id} 몬스터 ${m}`);
  if (R.mid) ok(MONSTERS[R.mid].role === 'mid' && R.segs.includes('arena'), `${id} 중간보스 공터`);
  if (R.boss) ok(MONSTERS[R.boss].role === 'boss' && R.segs.includes('boss'), `${id} 보스방`);
  for (const [npc] of R.npcs || []) ok(NPCS[npc], `${id} 사람 ${npc}`);
}

// 이야기: 8장, 장마다 중간보스·보스, 퀘스트 종류가 골고루
ok(CHAPTERS.length === 9, '8장');
const types = new Set(); const exams = [];
let lastIdx = 0;
for (let c = 1; c <= 8; c++) {
  const C = CHAPTERS[c], tys = C.steps.map((s) => s.type);
  ok(tys.includes('mid') && tys.includes('boss'), `${c}장 중간보스·보스`);
  ok(new Set(tys).size >= 4, `${c}장 퀘스트 종류 ${new Set(tys).size}가지`);
  for (const st of C.steps) {
    types.add(st.type);
    const R = REGIONS[st.region]; ok(R, `${c}장 지역 ${st.region}`);
    ok(R.idx >= lastIdx, `${c}장 「${st.text}」 앞으로만 나아감`); lastIdx = Math.max(lastIdx, R.idx);
    if (st.npc && ['talk', 'exam', 'quiz'].includes(st.type)) ok((R.npcs || []).some(([id]) => id === st.npc), `${c}장 ${st.npc}이(가) ${st.region}에 있음`);
    if (st.type === 'kill' || st.type === 'collect') ok(R.mons.includes(st.mon), `${c}장 ${st.mon}이(가) ${st.region}에 나옴`);
    if (st.type === 'mid') ok(R.mid === st.mon, `${c}장 중간보스 자리`);
    if (st.type === 'boss') ok(R.boss === st.mon, `${c}장 보스 자리`);
    if (st.type === 'find') for (const f of [].concat(st.find)) ok((R.finds || []).some((x) => x.id === f), `${c}장 찾을 것 ${f}`);
    if (st.type === 'puzzle') ok(buildRegion(st.region).puzzles.length > 0, `${c}장 ${st.region}에 퍼즐`);
    if (st.type === 'defend') ok(R.segs.includes('defend'), `${c}장 지키기 자리`);
    if (st.type === 'escort') ok(NPCS[st.npc], `${c}장 호위할 사람`);
    if (st.type === 'quiz') ok(st.questions.length === 3 && st.questions.every((q) => q.a[q.ok]), `${c}장 문제`);
    if (st.type === 'exam') { exams.push(st.rank); ok(MONSTERS[st.mon].role === 'exam' && REGIONS[st.region].tower, `${c}장 시험장`); }
    for (const L of [st.say, st.before, Array.isArray(st.done) ? st.done : null].filter(Boolean)) for (const [who] of L) ok(who in SPEAKERS, `말하는 사람 ${who}`);
  }
}
ok(JSON.stringify(exams) === '[1,2,3,4]', '전직 시험 네 번');
for (const t of ['talk', 'reach', 'find', 'collect', 'kill', 'puzzle', 'escort', 'defend', 'mid', 'boss', 'exam', 'craft', 'enhance', 'quiz']) ok(types.has(t), `퀘스트 종류 ${t}`);
for (const [who] of [...PROLOGUE, ...ENDING]) ok(who in SPEAKERS, `말하는 사람 ${who}`);

// 맵: 문을 연다고 치고, 걷기 + 블링크(5칸)로 입구에서 끝까지·보스 자리·찾을 것·사람에게 갈 수 있는지
for (const id of ORDER) {
  const A = buildRegion(id);
  for (const g of A.gates) for (let y = g.y0; y <= g.y1; y++) A.solid[y * A.w + g.x] = 0;
  const free = (x, y) => x >= 0 && y >= 0 && x < A.w && y < A.h && !A.solid[y * A.w + x] && tileAt(A, x, y) !== WIND;
  const sx = Math.floor(A.entry.x), sy = Math.floor(A.entry.y);
  ok(free(sx, sy), `${id} 입구가 막히지 않음`);
  const seen = new Uint8Array(A.w * A.h), q = [[sx, sy]]; seen[sy * A.w + sx] = 1;
  const pushQ = (x, y) => { if (free(x, y) && !seen[y * A.w + x]) { seen[y * A.w + x] = 1; q.push([x, y]); } };
  let usedBlink = false;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      pushQ(x + dx, y + dy);
      // 블링크: 바람길도 건너뜀
      const nx = x + dx, ny = y + dy, k = tileAt(A, nx, ny);
      if (k === VOID || k === LAVA || k === WATER || k === WIND) {
        for (let d = 2; d <= 5; d++) { const tx = x + dx * d, ty = y + dy * d; if (tileAt(A, tx, ty) === WALL) break; if (free(tx, ty)) { if (!seen[ty * A.w + tx]) usedBlink = true; pushQ(tx, ty); break; } }
      }
      // 얼음: 미끄러짐
      if (tileAt(A, x, y) === ICE || k === ICE) {
        let cx = x, cy = y;
        for (let i = 0; i < 40; i++) { const tx = cx + dx, ty = cy + dy; if (!free(tx, ty)) break; cx = tx; cy = ty; if (tileAt(A, cx, cy) !== ICE) break; }
        pushQ(cx, cy);
      }
    }
  }
  const reach = (p, what) => ok(seen[Math.floor(p.y) * A.w + Math.floor(p.x)], `${id} ${what}까지 갈 수 있음`);
  reach(A.endPos, '끝');
  if (A.arena) reach(A.arena, '보스 자리');
  if (A.examArena) reach(A.examArena, '시험장');
  for (const f of A.finds) reach(f, f.name);
  for (const p of A.npcs) { const nearOk = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen[(Math.floor(p.y) + dy) * A.w + Math.floor(p.x) + dx]); ok(nearOk, `${id} ${p.id}에게 갈 수 있음`); }
  if (A.region.segs && (A.region.segs.includes('blink') || A.region.segs.includes('lava') || A.region.segs.includes('wind'))) ok(usedBlink, `${id} 블링크가 꼭 필요한 곳이 있음`);
  for (const pz of A.puzzles) if (pz.type === 'plates') for (const pl of pz.plates) reach(pl, '발판');
  ok(A.spawns.length >= (A.kind === 'town' ? 0 : 8), `${id} 몬스터 자리 ${A.spawns.length}`);
  // 블링크 함수: 낭떠러지 앞에서 건너편에 내림
  if (A.region.segs && A.region.segs.includes('blink') && A.kind === 'field') {
    const s = A.region.segs.indexOf('blink'), x0 = A.segX[s], py = A.pathY[x0 + 11];
    const land = blinkLand(A, x0 + 8.5, py + 0.5, 1, 0, 5);
    ok(land.x > x0 + 13, `${id} 블링크로 낭떠러지를 건넘 (${land.x.toFixed(1)})`);
  }
}
console.log(`데이터 검사 통과 ✔ (${n}개)`);
