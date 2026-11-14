// 규칙 검사: node tests/logic.test.mjs   (표: TABLE=1 · 실패해도 계속: SOFT=1)
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import { SKILLS, ELEMENTS, skillAt } from '../js/data/skills.js';
import { ITEMS, ENHANCE } from '../js/data/items.js';
import { MONSTERS } from '../js/data/monsters.js';
import { CHAPTERS } from '../js/data/story.js';
import { REGIONS, ORDER } from '../js/data/world.js';

const SOFT = !!process.env.SOFT;
let n = 0;
const ok = (c, m) => { if (SOFT && !c) { console.log('  ✘', m); return; } assert.ok(c, m); n++; };
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const lcg = (seed) => { let a = seed >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); };

// 시작은 약하게
{ const s = R.newSave('t', 'girl'), hs = R.heroStats(s); ok(hs.hp <= 100 && hs.mp <= 50, `처음 체력 ${hs.hp} · 마나 ${hs.mp}`); ok(s.skills.blink === 1, '블링크는 처음부터'); }
for (let l = 1; l < 60; l++) ok(R.expNeed(l + 1) > R.expNeed(l), '경험치는 점점 많이');

// 단축키: 방향키는 이동 전용, 나머지는 바꿀 수 있음
ok(!Object.values(R.DEFAULT_KEYS).some((k) => R.ARROWS.includes(k)), '기본 단축키에 방향키 없음');
ok(new Set(Object.values(R.DEFAULT_KEYS)).size === Object.keys(R.DEFAULT_KEYS).length, '기본 단축키가 겹치지 않음');

// 스킬·특성
{
  const s = R.newSave('t', 'girl');
  ok(!R.canLearn(s, 'fire_1').ok, '원소를 고르기 전엔 못 배움');
  ok(R.chooseElement(s, 'fire') && !R.chooseElement(s, 'ice'), '견습은 원소 하나');
  s.skillPts = 10;
  ok(R.learn(s, 'fire_1').ok && s.slots[0] === 'fire_1', '배우면 빈 칸에 들어감');
  ok(!R.canLearn(s, 'fire_2').ok, '초급 스킬은 초급부터');
  R.learn(s, 'fire_1'); const r3 = R.learn(s, 'fire_1');
  ok(r3.needTrait, 'Lv.3이 되면 특성 고르기');
  ok(R.chooseTrait(s, 'fire_1', 0) && R.skillOf(s, 'fire_1').n === 3, '특성 A: 세 갈래');
  ok(R.chooseTrait(s, 'fire_1', 1) && R.skillOf(s, 'fire_1').boom > 2, '특성 B: 작열탄');
  const before = s.skillPts; R.resetPoints(s); ok(s.skillPts === before + 3 && s.skills.blink === 1 && !s.skills.fire_1, '망각의 물약');
}

// 강화: 확률표대로, 12강부터 부서질 수 있음
{
  const s = R.newSave('t', 'girl'); s.gold = 1e9; s.mats.stone = 1e6;
  const inst = R.addItem(s, 'it001');
  ok(R.enhance(s, inst.uid, seq([0])).result === 'success' && inst.plus === 1, '강화 성공');
  inst.plus = 11; const f = R.enhance(s, inst.uid, seq([0.99, 0.99]));
  ok(f.result === 'fail' && inst.plus === 11, '+12 실패 (부서지지 않음)');
  const b = R.enhance(s, inst.uid, seq([0.99, 0]));
  ok(b.result === 'broken' && !s.inv.includes(inst), '+12 실패하면 부서질 수 있음');
  const inst2 = R.addItem(s, 'it001'); inst2.plus = 14; s.cons.protect = 1;
  ok(R.enhance(s, inst2.uid, seq([0.99, 0]), true).result === 'protected' && s.inv.includes(inst2) && s.cons.protect === 0, '보호 주문서는 파괴를 막음');
  const inst3 = R.addItem(s, 'it001'); inst3.plus = 8; ok(R.enhance(s, inst3.uid, seq([0.99, 0.99])).result === 'down' && inst3.plus === 7, '+7~+11은 실패하면 한 단계 내려감');
  const inst4 = R.addItem(s, 'it001'); inst4.plus = 3; ok(R.enhance(s, inst4.uid, seq([0.99, 0.99])).result === 'fail' && inst4.plus === 3, '+6까지는 실패해도 그대로');
  // 많이 해 보면 +20까지 가기는 아주 어렵다
  const rnd = lcg(7); let reach = 0, trials = 200;
  for (let t = 0; t < trials; t++) { const x = R.addItem(s, 'it001'); for (let k = 0; k < 400 && s.inv.includes(x) && x.plus < 20; k++) R.enhance(s, x.uid, rnd); if (x.plus >= 20) reach++; }
  ok(reach < trials * 0.1, `+20 도달 ${reach}/${trials} (드묾)`);
  const base = R.itemStats({ id: 'it001', plus: 0 }).matk, top = R.itemStats({ id: 'it001', plus: 20 }).matk;
  ok(top / base >= 2.8, `+20 마력 ${base} → ${top}`);
}

// 제작
{
  const s = R.newSave('t', 'girl'), id = Object.values(ITEMS).find((x) => x.src === 'craft' && x.tier === 1).id;
  ok(!R.canCraft(s, id), '재료 없으면 못 만듦');
  s.gold = 1e5; for (const [m, k] of Object.entries(ITEMS[id].recipe)) if (m !== 'gold') s.mats[m] = k;
  const got = R.craft(s, id); ok(got && got.id === id && s.flags.crafted === 1, '제작');
  ok(R.recipesFor('t_dorn').length > R.recipesFor('t_lumina').length, '앞으로 갈수록 제작법이 늘어남');
}

// 펫 뽑기
{
  const s = R.newSave('t', 'girl'); s.gold = 1e7;
  const rnd = lcg(3), count = [0, 0, 0, 0, 0];
  for (let k = 0; k < 2000; k++) { const r = R.openBox(s, 'basic', rnd); count[r.rar]++; }
  ok(count[0] > count[1] && count[1] > count[2] && count[2] > count[3] && count[3] >= count[4], `등급별 확률 ${count.join('/')}`);
  ok(count[4] > 0 && count[4] < 40, '전설은 드묾');
  ok(Object.values(s.pets).every((lv) => lv >= 1 && lv <= 5), '펫 레벨 1~5');
  const g = R.newSave('t', 'girl'); g.gold = 100; ok(R.openBox(g, 'basic', rnd) === null, '돈이 모자라면 못 엶');
}

// 드랍은 드물게 (장비), 재료는 자주
{
  const s = R.newSave('t', 'girl'), rnd = lcg(11); let items = 0, mats = 0;
  for (let k = 0; k < 3000; k++) { const d = R.rollDrops(MONSTERS.goblin, rnd, s); items += d.items.length; mats += Object.values(d.mats).reduce((a, c) => a + c, 0); }
  ok(items / 3000 < 0.02, `일반 몬스터 장비 드랍 ${(items / 30).toFixed(2)}%`);
  ok(mats / 3000 > 0.3, `재료 드랍 ${(mats / 30).toFixed(0)}%`);
  for (let c = 1; c <= 8; c++) { const b = Object.values(MONSTERS).find((m) => m.role === 'boss' && m.ch === c); const d = R.rollDrops(b, seq([0.99]), s); ok(d.items.some((x) => ITEMS[x].bossOf === b.id), `${c}장 보스 첫 처치 고유 장비`); }
}

// 이야기를 처음부터 끝까지, 지역은 앞으로만 열림
{
  const s = R.newSave('t', 'girl'); let guard = 0, prevAllowed = 0;
  ok(!R.regionOpen(s, 'r_forest') && R.regionOpen(s, 't_lumina'), '처음엔 루미나만');
  while (!s.done && guard++ < 500) {
    const st = R.curStep(s);
    ok(R.regionOpen(s, st.region), `${s.ch}장 ${s.step}단계 지역 ${st.region}이 열려 있음`);
    const a = R.allowedIdx(s); ok(a >= prevAllowed, '열린 지역이 줄지 않음'); prevAllowed = a;
    if (st.type === 'kill') for (let k = 0; k < st.n; k++) R.onKill(s, st.mon, st.region);
    if (st.type === 'collect') { let r; do r = R.collectRoll(s, st.mon, st.region, () => 0.1); while (r !== 'stepDone'); }
    if (st.type === 'find') for (const f of [].concat(st.find)) R.onFind(s, st.region, f);
    if (['mid', 'boss', 'exam'].includes(st.type)) ok(R.onKill(s, st.mon, st.region) === 'stepDone', '보스로 진행');
    R.advance(s);
  }
  ok(s.done && s.rank === 4, '8장을 마치면 익스퍼트');
  ok(R.regionOpen(s, 'r_lair'), '다 깨면 모두 열림');
}

// 밸런스: 스킬을 쓰면 적당한 시간, 기본 공격만으로는 너무 오래 걸린다
function heroAt(c, lv, avoid, plus = 4) {
  const s = R.newSave('t', 'girl'); s.lv = lv; s.rank = [0, 0, 1, 1, 2, 2, 3, 3, 4][c];
  const pts = (lv - 1) * 3; s.stats.int += Math.round(pts * 0.55); s.stats.vit += Math.round(pts * 0.25); s.stats.wis += pts - Math.round(pts * 0.55) - Math.round(pts * 0.25);
  const el = ELEMENTS.find((e) => e !== avoid && e !== 'time');
  s.elements = [el];
  for (const slot of ['staff', 'hat', 'robe', 'shoes', 'ring', 'amulet']) {
    const best = Object.values(ITEMS).filter((x) => x.slot === slot && (x.src === 'craft' || x.src === 'shop') && x.tier <= c && x.lv <= lv).sort((a, b) => b.tier - a.tier || b.rar - a.rar)[0];
    if (best) s.equip[slot] = R.addItem(s, best.id, plus).uid;
  }
  s.skillPts = lv;
  for (let pass = 0; pass < 5; pass++) for (const k of Object.values(SKILLS).filter((x) => x.el === el)) if (R.canLearn(s, k.id).ok) R.learn(s, k.id);
  return { s, el, hs: R.heroStats(s) };
}
function ttk(h, m, basicOnly) {
  const unit = R.damageToMonster(h.hs, 1, h.el, m, 0.5, 1).dmg * (1 + h.hs.crit / 100 * 0.6);
  const basic = R.BASIC_POWER / R.BASIC_CD;
  let pow = 0, mp = 0;
  if (!basicOnly) for (const [id, lv] of Object.entries(h.s.skills)) {
    const k = skillAt(id, lv); if (!k.power || id === 'blink') continue;
    const hits = k.kind === 'rain' ? (k.n || 6) * 0.5 : k.kind === 'field' ? (k.dur || 4) * 2 * 0.7 : k.kind === 'summon' ? (k.dur || 10) * 0.8 : k.kind === 'chain' ? 1.4 : 1;
    pow += k.power * hits / Math.max(k.cd, 0.8) * 0.75; mp += k.mp / Math.max(k.cd, 0.8) * 0.75;
  }
  const mpOk = Math.min(1, (h.hs.mpRegen + basic * R.BASIC_MP + h.hs.mp / 60) / Math.max(0.01, mp));
  return R.monsterStats(m).hp / (unit * (basic + pow * mpOk) * 0.55);
}
const table = [];
for (let c = 1; c <= 8; c++) {
  const R0 = Object.values(REGIONS).find((r) => r.ch === c && r.boss), boss = MONSTERS[R0.boss];
  const Rm = Object.values(REGIONS).find((r) => r.ch === c && r.mid), mid = MONSTERS[Rm.mid];
  const hb = heroAt(c, boss.lv, boss.weak, 2 + c), hm = heroAt(c, mid.lv, mid.weak, 2 + c);
  const tb = ttk(hb, boss), tbBasic = ttk(hb, boss, true), tm = ttk(hm, mid);
  const bs = R.monsterStats(boss), hits = hb.hs.hp / R.damageToHero(hb.hs, bs.atk * 1.4);
  const nm = MONSTERS[REGIONS[ORDER[ORDER.indexOf(R0.id) - 1]].mons?.[0] || R0.mons[0]], hn = heroAt(c, nm.lv, nm.weak, 1 + c);
  const nBasic = R.monsterStats(nm).hp / R.damageToMonster(hn.hs, R.BASIC_POWER, hn.el, nm, 0.5, 1).dmg;
  const bestPow = Math.max(...Object.entries(hn.s.skills).filter(([k]) => k !== 'blink').map(([k, lv]) => { const x = skillAt(k, lv); return ['bolt', 'line', 'nova', 'area', 'cone'].includes(x.kind) ? x.power : 0; }));
  const nSkill = R.monsterStats(nm).hp / R.damageToMonster(hn.hs, bestPow, hn.el, nm, 0.5, 1).dmg;
  table.push({ 장: c, 보스: boss.name, Lv: boss.lv, 체력: hb.hs.hp, 마력: hb.hs.matk, '보스(초)': Math.round(tb), '기본공격만(초)': Math.round(tbBasic), '중간(초)': Math.round(tm), '버팀': Math.round(hits), '일반·기본': nBasic.toFixed(1), '일반·스킬': nSkill.toFixed(1) });
  ok(tb > 25 && tb < 160, `${c}장 보스 ${Math.round(tb)}초`);
  ok(tbBasic > tb * 2.5, `${c}장 기본 공격만으로는 ${Math.round(tbBasic)}초 (스킬보다 2.5배 넘게)`);
  ok(tm > 12 && tm < 100, `${c}장 중간보스 ${Math.round(tm)}초`);
  ok(hits >= 5 && hits <= 30, `${c}장 보스 공격 ${Math.round(hits)}번 버팀`);
  ok(nBasic >= 5, `${c}장 일반 몬스터 기본 공격 ${nBasic.toFixed(1)}번 (스킬이 필요)`);
  ok(nSkill <= 4, `${c}장 일반 몬스터 첫 스킬 ${nSkill.toFixed(1)}번`);
}
if (process.env.TABLE) console.table(table);
console.log(`규칙 검사 통과 ✔ (${n}개)`);
