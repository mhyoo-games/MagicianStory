// 규칙 검사: node tests/logic.test.mjs   (표 보기: TABLE=1 node tests/logic.test.mjs)
import assert from 'node:assert/strict';
import * as R from '../js/rules.js';
import { SKILLS, skillAt, ELEMENTS } from '../js/data/skills.js';
import { ITEMS } from '../js/data/items.js';
import { MONSTERS } from '../js/data/monsters.js';
import { CHAPTERS } from '../js/data/story.js';

let n = 0;
const SOFT = !!process.env.SOFT;
const ok = (c, m) => { if (SOFT && !c) { console.log("  ✘", m); return; } assert.ok(c, m); n++; };
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

// 경험치
for (let l = 1; l < 60; l++) ok(R.expNeed(l + 1) > R.expNeed(l), '경험치는 점점 많이');
{ const s = R.newSave('t', 'girl'); const ups = R.gainExp(s, R.expNeed(1) + R.expNeed(2)); ok(ups.length === 2 && s.lv === 3 && s.statPts === 8 && s.skillPts === 3, '두 번 레벨 업'); }

// 원소·스킬 배우기
{
  const s = R.newSave('t', 'girl');
  ok(!R.canLearn(s, 'fire_01').ok, '원소를 고르기 전엔 못 배움');
  ok(R.chooseElement(s, 'fire') && !R.chooseElement(s, 'water'), '견습은 원소 하나');
  ok(R.learn(s, 'fire_01').ok && s.slots[0] === 'fire_01', '배우면 빈 칸에 들어감');
  ok(!R.canLearn(s, 'fire_03').ok, '초급 스킬은 초급부터');
  s.rank = 1; s.skillPts = 10;
  ok(R.chooseElement(s, 'water'), '초급은 원소 둘');
  ok(R.canLearn(s, 'fire_03').ok, '초급이 되면 배움');
  ok(!R.canLearn(s, 'water_03').ok, '선행 스킬이 필요');
  for (let k = 0; k < 4; k++) R.learn(s, 'fire_01');
  ok(s.skills.fire_01 === 5 && !R.canLearn(s, 'fire_01').ok, '최고 레벨 5');
  const before = s.skillPts; R.resetPoints(s); ok(s.skillPts === before + 5 && !Object.keys(s.skills).length, '망각의 물약으로 되돌림');
}

// 피해
{
  const s = R.newSave('t', 'girl'), hs = R.heroStats(s), m = MONSTERS.slime_green;
  const a = R.damageToMonster(hs, 1, 'fire', m, 0.5, 1).dmg, b = R.damageToMonster(hs, 1, 'water', m, 0.5, 1).dmg;
  ok(Math.abs(a / b - 1.5) < 0.05, '약점은 1.5배');
  ok(R.damageToMonster(hs, 1, 'water', MONSTERS.slime_blue, 0.5, 1).resist, '강한 속성은 덜 들어감');
  ok(R.damageToMonster(hs, 1, 'fire', m, 0.5, 0).crit, '치명타');
  ok(R.damageToHero(hs, 100) < 100, '방어로 줄어듦');
}

// 장비
{
  const s = R.newSave('t', 'girl');
  const hi = Object.values(ITEMS).find((x) => x.tier === 8);
  const inst = R.addItem(s, hi.id); ok(!R.equip(s, inst.uid), '레벨이 모자라면 못 낌');
  s.lv = 60; ok(R.equip(s, inst.uid), '레벨 되면 낌');
  ok(R.sell(s, inst.uid) === 0, '낀 장비는 못 팖');
  s.gold = 100000; ok(R.buy(s, 'hp1') && s.cons.hp1 === 6, '물약 사기');
  for (let c = 1; c <= 8; c++) { s.ch = c; for (const k of ['staff', 'cloth', 'potion', 'general']) ok(R.shopStock(k, s).length > 0, `${c}장 ${k} 상점`); }
}

// 보스 첫 처치는 전설 장비
for (let c = 1; c <= 8; c++) {
  const id = CHAPTERS[c].dungeon.boss, s = R.newSave('t', 'girl');
  const d = R.rollDrops(MONSTERS[id], seq([0.9]), s);
  ok(d.items.some((x) => ITEMS[x].rar === 4 && ITEMS[x].bossOf === id), `${c}장 보스 첫 처치 전설 장비`);
}

// 이야기를 처음부터 끝까지
{
  const s = R.newSave('t', 'girl'); let guard = 0;
  while (!s.done && guard++ < 500) {
    const st = R.curStep(s);
    if (st.type === 'kill') { for (let k = 0; k < st.n; k++) R.onKill(s, st.mon, st.area); ok(s.prog >= st.n, '잡은 수'); }
    if (st.type === 'collect') { let r; do r = R.collectRoll(s, st.mon, st.area, () => 0.1); while (r !== 'stepDone'); }
    if (st.type === 'mid' || st.type === 'boss' || st.type === 'exam') ok(R.onKill(s, st.mon, st.area) === 'stepDone', '보스 처치로 진행');
    if (st.area) ok(R.areaOpen(s, st.area), `${st.area}가 열려 있음 (${s.ch}장 ${s.step})`);
    R.advance(s);
  }
  ok(s.done && s.rank === 4, '8장을 마치면 익스퍼트');
  ok(R.areaOpen(s, 'd8'), '다 깨면 모두 열림');
}
{ const s = R.newSave('t', 'girl'); ok(!R.areaOpen(s, 'd1') && R.areaOpen(s, 'f1') && !R.areaOpen(s, 'f2'), '처음엔 초록 숲만'); }

// 밸런스: 그 보스의 레벨·그 단계 상점 장비·한 원소(약점 아님)에 점수를 다 쓴 주인공이 적당한 시간에 잡는지
function heroAt(c, lv, avoid) {
  const s = R.newSave('t', 'girl');
  s.lv = lv; s.rank = [0, 1, 1, 2, 2, 3, 3, 4, 4][c];
  const stP = (s.lv - 1) * 4; s.stats.int += Math.round(stP * 0.6); s.stats.vit += Math.round(stP * 0.25); s.stats.wis += stP - Math.round(stP * 0.6) - Math.round(stP * 0.25);
  const el = ELEMENTS.find((e) => e !== avoid && e !== 'time');
  s.elements = [el];
  for (const slot of ['staff', 'hat', 'robe', 'shoes', 'ring', 'amulet']) {
    const best = Object.values(ITEMS).filter((x) => x.slot === slot && x.src === 'shop' && x.tier <= c && x.lv <= lv).sort((a, b) => b.tier - a.tier || b.rar - a.rar)[0];
    if (best) s.equip[slot] = R.addItem(s, best.id).uid;
  }
  s.skillPts = s.lv + [0, 0, 3, 3, 6, 6, 9, 9, 12][c];
  const atk = Object.values(SKILLS).filter((k) => k.el === el && k.rank <= s.rank && !['buff', 'heal', 'dash'].includes(k.kind));
  for (let pass = 0; pass < 5; pass++) for (const k of atk) { if (s.skillPts <= 0) break; if (R.canLearn(s, k.id).ok) R.learn(s, k.id); }
  return { s, el, hs: R.heroStats(s) };
}
// 실제로는 피하고 움직이느라 이상적인 계산의 절반 정도만 때린다고 본다
function timeToKill(h, m) {
  const per = (k, lv) => { const a = skillAt(k, lv); const hits = k.kind === 'multi' ? Math.min(a.n, 2.2) : k.kind === 'rain' ? a.n * 0.5 : k.kind === 'field' ? a.dur * 2 * 0.7 : k.kind === 'orbit' ? a.dur * 1.2 : 1; return a.power * hits; };
  const basic = 0.9 / 0.42 * 0.7;
  let skillPow = 0, mpUse = 0;
  for (const [id, lv] of Object.entries(h.s.skills)) { const k = SKILLS[id]; if (k.kind === 'passive') continue; const a = skillAt(k, lv); skillPow += per(k, lv) / Math.max(a.cd, 1.2) * 0.75; mpUse += a.mp / Math.max(a.cd, 1.2) * 0.75; }
  const mpOk = Math.min(1, (h.hs.mpRegen + h.hs.mp / 60) / Math.max(0.01, mpUse));
  const unit = R.damageToMonster(h.hs, 1, h.el, m, 0.5, 1).dmg * (1 + h.hs.crit / 100 * 0.6);
  return R.monsterStats(m).hp / (unit * (basic + skillPow * mpOk) * 0.5);
}
const table = [];
for (let c = 1; c <= 8; c++) {
  const boss = MONSTERS[CHAPTERS[c].dungeon.boss], mid = MONSTERS[CHAPTERS[c].field.mid];
  const hb = heroAt(c, boss.lv, boss.weak), hm = heroAt(c, mid.lv, mid.weak);
  const ttk = timeToKill(hb, boss), ttkMid = timeToKill(hm, mid);
  const bs = R.monsterStats(boss), hitsToDie = hb.hs.hp / R.damageToHero(hb.hs, bs.atk * 1.5);
  table.push({ 장: c, 보스: boss.name, Lv: boss.lv, 마력: hb.hs.matk, 체력: hb.hs.hp, '보스HP': bs.hp, '보스(초)': Math.round(ttk), 중간보스: mid.name, '중간(초)': Math.round(ttkMid), '버티는 대수': Math.round(hitsToDie) });
  ok(ttk > 20 && ttk < 150, `${c}장 보스 ${boss.name} 잡는 시간 ${Math.round(ttk)}초 (20~150초)`);
  ok(ttkMid > 12 && ttkMid < 90, `${c}장 중간보스 ${mid.name} ${Math.round(ttkMid)}초 (12~90초)`);
  ok(hitsToDie >= 6, `${c}장 보스 공격을 ${Math.round(hitsToDie)}번 버팀 (6번 이상)`);
  const nm = MONSTERS[CHAPTERS[c].field.mons[0]], hn = heroAt(c, nm.lv, nm.weak), nHits = R.monsterStats(nm).hp / R.damageToMonster(hn.hs, 0.9, hn.el, nm, 0.5, 1).dmg;
  ok(nHits >= 0.8 && nHits <= 6, `${c}장 일반 몬스터는 기본 공격 ${nHits.toFixed(1)}번 (같은 레벨)`);
}
// 시험관도 이길 수 있는 세기 (시간 150초)
for (const [rank, id] of [[1, 'exam_1'], [2, 'exam_2'], [3, 'exam_3'], [4, 'exam_4']]) {
  const m = MONSTERS[id], s = R.newSave('t', 'girl'); s.lv = m.lv; s.stats.int += (s.lv - 1) * 2;
  const st = Object.values(ITEMS).filter((x) => x.slot === 'staff' && x.src === 'shop' && x.lv <= s.lv).sort((a, b) => b.tier - a.tier)[0]; s.equip.staff = R.addItem(s, st.id).uid;
  const hs = R.heroStats(s), dps = R.damageToMonster(hs, 1, 'fire', m, 0.5, 1).dmg * 3.2;
  ok(R.monsterStats(m).hp / dps < 120, `${id} 시험 시간 안에 이길 수 있음 (${Math.round(R.monsterStats(m).hp / dps)}초)`);
}
if (process.env.TABLE) console.table(table);
console.log(`규칙 검사 통과 ✔ (${n}개)`);
