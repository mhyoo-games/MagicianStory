// 데이터 모양 검사: node tests/data.test.mjs
import assert from 'node:assert/strict';
import { SKILLS, ELEMENTS } from '../js/data/skills.js';
import { ITEMS, SLOTS, CONSUMABLES } from '../js/data/items.js';
import { MONSTERS } from '../js/data/monsters.js';
import { CHAPTERS, NPCS, SPEAKERS, PROLOGUE, ENDING } from '../js/data/story.js';
import { buildArea, TILE } from '../js/world.js';
import { drawMonsterFrame } from '../js/sprites.js';
import * as A from '../js/art.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// 스킬 200개, 속성마다 22개
const sk = Object.values(SKILLS);
ok(sk.length === 200, `스킬 200개 (지금 ${sk.length})`);
for (const e of ELEMENTS) ok(sk.filter((s) => s.el === e).length === 22, `${e} 스킬 22개`);
ok(new Set(sk.map((s) => s.name)).size === sk.length, '스킬 이름이 모두 다름');
const KINDS = ['bolt', 'multi', 'nova', 'area', 'rain', 'line', 'field', 'orbit', 'chain', 'buff', 'heal', 'dash', 'passive'];
for (const s of sk) {
  ok(KINDS.includes(s.kind), `${s.id} 종류`);
  ok(s.desc && s.desc.length > 4, `${s.id} 설명`);
  ok(s.rank >= 0 && s.rank <= 4, `${s.id} 계급`);
  if (s.req) { ok(SKILLS[s.req], `${s.id} 선행 스킬 있음`); ok(SKILLS[s.req].rank < s.rank && SKILLS[s.req].el === s.el, `${s.id} 선행은 같은 속성 아래 계급`); }
  if (!['buff', 'heal', 'dash', 'passive'].includes(s.kind)) ok(s.power > 0 && s.mp > 0 && s.cd > 0, `${s.id} 위력·MP·재사용`);
  if (s.kind === 'buff') ok(s.buff && s.dur > 0, `${s.id} 버프`);
  if (s.kind === 'passive') ok(s.pas, `${s.id} 패시브`);
}
for (const e of ELEMENTS) for (let r = 0; r <= 4; r++) ok(sk.some((s) => s.el === e && s.rank === r && !['buff', 'passive', 'heal', 'dash'].includes(s.kind)), `${e} ${r}계급에 공격 스킬`);

// 장비 200개
const it = Object.values(ITEMS);
ok(it.length === 200, `장비 200개 (지금 ${it.length})`);
ok(new Set(it.map((x) => x.name)).size === 200, '장비 이름이 모두 다름');
for (const x of it) {
  ok(SLOTS.includes(x.slot), `${x.id} 칸`);
  ok(x.tier >= 1 && x.tier <= 8, `${x.id} 단계`);
  ok(['shop', 'drop', 'boss'].includes(x.src), `${x.id} 얻는 곳`);
  ok(x.price > 0 && Object.keys(x.st).length > 0, `${x.id} 값·능력`);
  if (x.src === 'boss') ok(MONSTERS[x.bossOf] && MONSTERS[x.bossOf].role === 'boss', `${x.id} 보스 드랍 연결 (${x.bossOf})`);
}
for (let t = 1; t <= 8; t++) {
  ok(it.some((x) => x.tier === t && x.src === 'shop' && x.slot === 'staff'), `${t}단계 상점 지팡이`);
  ok(it.some((x) => x.tier === t && x.src === 'drop'), `${t}단계 드랍 장비`);
}
for (const c of Object.values(CONSUMABLES)) ok(c.price > 0, `${c.id} 값`);

// 몬스터
const mons = Object.values(MONSTERS);
ok(mons.filter((m) => m.role === 'normal').length >= 40, '일반 몬스터 40종 이상');
for (const m of mons) {
  for (let f = 0; f < 4; f++) { const p = drawMonsterFrame(m, f, 'down'); ok(p.w >= 32 && p.d.some((v) => v > 0), `${m.id} 그림 ${f}`); }
  if (m.role !== 'normal') ok(Array.isArray(m.pattern) && m.pattern.length >= 2, `${m.id} 보스 무늬`);
  if (m.summon) ok(MONSTERS[m.summon], `${m.id} 부하 ${m.summon}`);
}
ok(MONSTERS.azdaha && MONSTERS.azdaha.final, '마지막 보스는 용');

// 이야기 8장, 장마다 중간보스·보스
ok(CHAPTERS.length === 9, '8장');
const exams = [];
for (let c = 1; c <= 8; c++) {
  const C = CHAPTERS[c];
  ok(C.field.mid && MONSTERS[C.field.mid].role === 'mid', `${c}장 중간보스`);
  ok(C.dungeon.boss && MONSTERS[C.dungeon.boss].role === 'boss', `${c}장 보스`);
  for (const id of [...C.field.mons, ...C.dungeon.mons]) ok(MONSTERS[id], `${c}장 몬스터 ${id}`);
  ok(C.steps.some((s) => s.type === 'mid' && s.mon === C.field.mid), `${c}장 중간보스 단계`);
  ok(C.steps.some((s) => s.type === 'boss' && s.mon === C.dungeon.boss), `${c}장 보스 단계`);
  for (const s of C.steps) {
    ok(s.text, `${c}장 단계 글`);
    if (s.type === 'talk') ok(NPCS[s.npc] && s.say.length, `${c}장 대화 ${s.npc}`);
    if (s.type === 'kill' || s.type === 'collect') {
      const area = s.area === C.field.id ? C.field : C.dungeon;
      ok(area.mons.includes(s.mon), `${c}장 ${s.mon}이(가) ${s.area}에 나옴`);
      ok(s.n > 0, `${c}장 개수`);
    }
    if (s.type === 'exam') { ok(MONSTERS[s.mon].role === 'exam', `${c}장 시험관`); exams.push(s.rank); }
    for (const L of [s.say, s.before, Array.isArray(s.done) ? s.done : null].filter(Boolean)) for (const [who] of L) ok(SPEAKERS[who], `말하는 사람 ${who}`);
  }
}
ok(JSON.stringify(exams) === '[1,2,3,4]', '전직 시험 네 번 (초급·중급·상급·익스퍼트)');
for (const [who] of [...PROLOGUE, ...ENDING]) ok(SPEAKERS[who], `말하는 사람 ${who}`);

// 맵: 입구에서 보스 자리까지 걸어갈 수 있음
const ids = ['village', 'tower'];
for (let c = 1; c <= 8; c++) ids.push(CHAPTERS[c].field.id, CHAPTERS[c].dungeon.id);
for (const id of ids) {
  const M = buildArea(id);
  const idx = (x, y) => y * M.w + x;
  const sx = Math.floor(M.entry.x), sy = Math.floor(M.entry.y);
  ok(!M.solid[idx(sx, sy)], `${id} 입구가 막히지 않음`);
  const seen = new Uint8Array(M.w * M.h), q = [[sx, sy]]; seen[idx(sx, sy)] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= M.w || ny >= M.h) continue; const k = idx(nx, ny); if (!seen[k] && !M.solid[k]) { seen[k] = 1; q.push([nx, ny]); } } }
  if (M.arena) ok(seen[idx(M.arena.x, M.arena.y)], `${id} 보스 자리까지 길이 있음`);
  for (const e of M.exits) { let any = false; for (let y = e.y; y < e.y + e.h; y++) for (let x = e.x; x < e.x + e.w; x++) if (seen[idx(x, y)]) any = true; ok(any, `${id} → ${e.to} 출구로 갈 수 있음`); }
  if (M.info) { const reach = M.spawns.filter((s) => seen[idx(s.x, s.y)]).length; ok(reach >= 10, `${id} 몬스터 자리 ${reach}곳에 갈 수 있음`); }
  for (const npc of M.npcs) ok(seen[idx(Math.floor(npc.x), Math.floor(npc.y + 0.5))] || seen[idx(Math.floor(npc.x), Math.floor(npc.y))], `${id} ${npc.id}에게 갈 수 있음`);
}
// 그림 몇 가지
for (const t of Object.keys(A.THEMES)) for (const k of ['g', 'path', 'water', 'wall', 'floor']) ok(A.tile(t, k, 1).d.some((v) => v > 0), `타일 ${t} ${k}`);
for (const d of ['down', 'left', 'right', 'up']) ok(A.human({ hat: { c: [1, 2, 3] }, staff: {} }, d, 0, 'cast').d.some((v) => v > 0), `주인공 ${d}`);

console.log(`데이터 검사 통과 ✔ (${n}개)`);
