// 화면 위 글·창 (HTML). 게임 규칙은 rules.js, 진행은 game.js
import * as R from './rules.js';
import { SKILLS, ELEMENTS, ELEM_NAME, ELEM_ICON, ELEM_DESC, RANK_NAME, skillAt, statText, STAT_NAME, SKILL_MAX_LV } from './data/skills.js';
import { ITEMS, CONSUMABLES, RARITY, SLOTS, SLOT_NAME } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { CHAPTERS, SPEAKERS, NPCS, PROLOGUE, HEROES } from './data/story.js';
import * as SP from './sprites.js';
import { sfx, toggleSound, soundOn, unlock } from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor(root) {
    this.root = root; this.g = null; this.blocking = false; this.dq = null;
    this.el = {
      hud: $('#hud'), hp: $('#hpBar'), mp: $('#mpBar'), xp: $('#xpBar'), lv: $('#lvText'), gold: $('#goldText'), quest: $('#quest'),
      slots: $('#slots'), boss: $('#boss'), banner: $('#banner'), toasts: $('#toasts'), panel: $('#panel'), dlg: $('#dialog'), timer: $('#timer'), flash: $('#flash'), hint: $('#hint'), buffs: $('#buffs'),
    };
    this.buildSlots();
    for (const b of document.querySelectorAll('[data-open]')) b.addEventListener('click', () => { unlock(); this.open(b.dataset.open); });
    addEventListener('keydown', (e) => this.key(e));
  }
  bind(g) { this.g = g; }
  get s() { return this.g.s; }

  key(e) {
    if (!this.g || !this.g.s) return;
    if (this.dq) { if (['Space', 'Enter', 'KeyF', 'KeyX', 'KeyJ'].includes(e.code)) { e.preventDefault(); this.nextLine(); } return; }
    const map = { KeyB: 'bag', KeyK: 'skills', KeyC: 'stats', KeyN: 'story', Escape: 'menu' };
    if (e.code === 'Escape' && this.cur) { this.closeAll(); return; }
    const w = map[e.code]; if (!w) return;
    if (this.cur === w) this.closeAll(); else this.open(w);
  }

  // ───────── HUD ─────────
  buildSlots() {
    let h = '';
    for (let i = 0; i < 6; i++) h += `<button class="slot" data-act="skill${i}" data-i="${i}"><i class="cd"></i><b></b><small>${i + 1}</small></button>`;
    h += `<button class="slot pot" data-act="hp"><b>❤️</b><small>Q</small><em id="hpCnt"></em></button><button class="slot pot" data-act="mp"><b>💙</b><small>E</small><em id="mpCnt"></em></button>`;
    this.el.slots.innerHTML = h;
    for (const b of this.el.slots.querySelectorAll('.slot')) b.addEventListener('click', () => { if (!('ontouchstart' in window)) this.g.input.press(b.dataset.act); });
  }
  refresh() {
    const g = this.g; if (!g || !g.s) return;
    const s = g.s, hs = g.hs, h = g.hero;
    this.el.lv.innerHTML = `<b>Lv.${s.lv}</b> ${esc(s.name)} <span class="rank r${s.rank}">${RANK_NAME[s.rank]} 마법사</span>`;
    this.el.gold.textContent = `🪙 ${s.gold.toLocaleString()}`;
    this.el.quest.innerHTML = `<small>${esc(CHAPTERS[Math.min(8, s.ch)].title)}</small>${esc(R.stepText(s))}`;
    for (const b of this.el.slots.querySelectorAll('.slot[data-i]')) {
      const id = s.slots[+b.dataset.i], sk = id && SKILLS[id];
      b.querySelector('b').textContent = sk ? ELEM_ICON[sk.el] : '';
      b.title = sk ? `${sk.name} Lv.${s.skills[id]}` : '빈 칸 (스킬 창에서 넣기)';
      b.dataset.name = sk ? sk.name : '';
      b.classList.toggle('empty', !sk);
    }
    const hp = R.quickPotion(s, 'hp'), mp = R.quickPotion(s, 'mp');
    $('#hpCnt').textContent = hp ? s.cons[hp] : 0; $('#mpCnt').textContent = mp ? s.cons[mp] : 0;
    if (this.cur) this.renderPanel();
  }
  tick() {
    const g = this.g, s = g.s, h = g.hero, hs = g.hs;
    this.el.hp.style.width = `${(h.hp / hs.hp) * 100}%`; this.el.hp.parentNode.dataset.t = `${Math.ceil(h.hp)} / ${hs.hp}`;
    this.el.mp.style.width = `${(h.mp / hs.mp) * 100}%`; this.el.mp.parentNode.dataset.t = `${Math.floor(h.mp)} / ${hs.mp}`;
    this.el.xp.style.width = `${s.lv >= R.MAX_LV ? 100 : (s.exp / R.expNeed(s.lv)) * 100}%`;
    for (const b of this.el.slots.querySelectorAll('.slot[data-i]')) {
      const id = s.slots[+b.dataset.i]; const cd = id ? g.cds[id] || 0 : 0, max = (g.cdMax && g.cdMax[id]) || 1;
      b.querySelector('.cd').style.height = `${cd > 0 ? (cd / max) * 100 : 0}%`;
      const sk = id && SKILLS[id]; b.classList.toggle('nomp', !!sk && h.mp < skillAt(sk, s.skills[id] || 1).mp);
    }
    // 버프
    const bh = g.buffs.map((b) => `<span title="${esc(b.name)}">${ELEM_ICON[b.el] || '✨'}${Math.ceil(b.t)}</span>`).join('');
    if (bh !== this._bh) { this.el.buffs.innerHTML = bh; this._bh = bh; }
    // 안내
    let hint = '';
    if (g.nearNpc) { const st = R.curStep(s), n = g.nearNpc; hint = `<b>F</b> ${esc(NPCS[n.id].name)}${st && st.type === 'talk' && st.npc === n.id ? ' (이야기!)' : NPCS[n.id].role.startsWith('shop') ? ' (상점)' : ''}`; }
    if (hint !== this._hint) { this.el.hint.innerHTML = hint; this.el.hint.style.display = hint ? '' : 'none'; this._hint = hint; $('#talkBtn').style.display = hint ? '' : 'none'; }
  }
  areaChanged(A) {
    this.banner(A.name, A.info ? `${A.info.kind === 'field' ? '들판' : '던전'} · 권장 Lv.${Math.min(...A.info.mons.map((m) => MONSTERS[m].lv))}+` : '');
    this.bossBar(null); this.examTimer(null); this.refresh();
  }
  banner(t, sub = '') {
    const b = this.el.banner; b.innerHTML = `<b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }
  toast(html) {
    const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html; this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }
  questProg() { this.refresh(); this.el.quest.classList.remove('pulse'); void this.el.quest.offsetWidth; this.el.quest.classList.add('pulse'); }
  levelUp(lv) { this.banner(`레벨 업! Lv.${lv}`, '능력치 +4 · 스킬 점수 +1 (C · K)'); }
  hurtFlash() { const f = this.el.flash; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  bossBar(m) {
    const b = this.el.boss;
    if (!m || !m.alive || !m.awake) { b.style.display = 'none'; return; }
    b.style.display = '';
    const k = Math.max(0, m.hp / m.maxHp);
    if (b.dataset.id !== m.m.id) { b.dataset.id = m.m.id; b.innerHTML = `<span>${esc(m.m.name)}${m.m.weak ? ` <small>약점 ${ELEM_ICON[m.m.weak]}${ELEM_NAME[m.m.weak]}</small>` : ''}</span><div><i></i></div>`; }
    b.querySelector('i').style.width = `${k * 100}%`;
  }
  examTimer(t) { const e = this.el.timer; if (t == null) { e.style.display = 'none'; return; } e.style.display = ''; e.textContent = `⏳ ${Math.ceil(t)}초`; }

  // ───────── 대화 ─────────
  dialog(lines, done) {
    this.dq = { lines: lines.slice(), done, i: -1 };
    this.blocking = true; this.el.dlg.style.display = '';
    this.el.dlg.onclick = () => this.nextLine();
    this.nextLine();
  }
  nextLine() {
    const q = this.dq; if (!q || q.waiting) return;
    if (q.typing) { q.typing = false; clearInterval(q.tm); $('.txt', this.el.dlg).innerHTML = q.full; return; }
    q.i++;
    if (q.i >= q.lines.length) { this.el.dlg.style.display = 'none'; this.dq = null; this.blocking = !!this.cur; if (q.done) q.done(); return; }
    const [who, text] = q.lines[q.i];
    if (text === '@chooseElement') { this.el.dlg.style.display = 'none'; q.waiting = true; this.chooseElement(() => { q.waiting = false; this.el.dlg.style.display = ''; this.nextLine(); }); return; }
    const sp = SPEAKERS[who] || { name: who };
    const name = (sp.name || '').replace('{name}', this.s.name);
    const full = esc(text.replace(/\{name\}/g, this.s.name));
    let por = '';
    if (who === 'hero') por = SP.portraitURL(this.g.look);
    else if (sp.look && sp.look.startsWith('cat:')) por = SP.portraitURL({ cat: sp.look.slice(4) });
    else if (sp.look && sp.look.startsWith('mon:')) por = SP.monsterPortraitURL(MONSTERS[sp.look.slice(4)], MONSTERS[sp.look.slice(4)].art.t === 'dragon' ? 1.5 : 3);
    else if (sp.look && NPCS[sp.look]) por = SP.portraitURL(NPCS[sp.look].look);
    this.el.dlg.innerHTML = `${por ? `<img class="por" src="${por}" alt="">` : ''}<div class="body ${who === 'sys' ? 'sys' : ''}">${name ? `<b>${esc(name)}</b>` : ''}<p class="txt"></p><small>▼ Space · 눌러서 넘기기</small></div>`;
    const el = $('.txt', this.el.dlg); let n = 0; const plain = text.replace(/\{name\}/g, this.s.name);
    q.full = full; q.typing = true;
    q.tm = setInterval(() => { n += 2; el.textContent = plain.slice(0, n); if (n % 6 === 0) sfx('talk'); if (n >= plain.length) { clearInterval(q.tm); q.typing = false; el.innerHTML = full; } }, 22);
  }
  showPrologue(done) { this.dialog(PROLOGUE, done); }
  confirm(text, yes) {
    this.blocking = true;
    const d = document.createElement('div'); d.className = 'modal';
    d.innerHTML = `<div class="box"><p>${esc(text).replace(/\n/g, '<br>')}</p><div class="row"><button class="ok">좋아요</button><button class="no">아니요</button></div></div>`;
    this.root.appendChild(d);
    const close = () => { d.remove(); this.blocking = !!this.cur || !!this.dq; this.g.paused = this.blocking; };
    this.g.paused = true;
    $('.ok', d).onclick = () => { close(); yes(); }; $('.no', d).onclick = close;
  }
  chooseElement(done) {
    const s = this.s;
    const d = document.createElement('div'); d.className = 'modal elems';
    const left = R.RANK_ELEMENTS[s.rank] - s.elements.length;
    d.innerHTML = `<div class="box wide"><h2>원소 고르기</h2><p>${RANK_NAME[s.rank]} 마법사는 원소를 ${R.RANK_ELEMENTS[s.rank]}개까지 다룰 수 있어요. 새 원소를 하나 골라 주세요.<br><small>고른 원소의 스킬을 배울 수 있어요 (스킬 창 K).</small></p><div class="grid">${ELEMENTS.map((e) => `<button data-e="${e}" ${s.elements.includes(e) ? 'disabled' : ''}><b>${ELEM_ICON[e]} ${ELEM_NAME[e]}</b><small>${ELEM_DESC[e]}</small>${s.elements.includes(e) ? '<em>이미 고름</em>' : ''}</button>`).join('')}</div></div>`;
    this.root.appendChild(d);
    if (left <= 0) { d.remove(); done(); return; }
    for (const b of d.querySelectorAll('[data-e]')) b.onclick = () => {
      if (!R.chooseElement(s, b.dataset.e)) return;
      sfx('levelup'); d.remove();
      if (s.rank === 0 && !R.equipped(s, 'staff')) { const it = R.addItem(s, 'it001'); R.equip(s, it.uid); }
      this.toast(`${ELEM_ICON[b.dataset.e]} ${ELEM_NAME[b.dataset.e]} 원소와 마음이 맞았어요!`);
      this.g.recalc(); this.g.save(); done();
    };
  }

  // ───────── 창 ─────────
  open(w) {
    if (!this.g || !this.g.s || this.dq) return;
    sfx('ui');
    this.cur = w; this.blocking = true; this.g.paused = true;
    this.el.panel.style.display = '';
    this.sel = null;
    this.renderPanel();
  }
  closeAll() {
    this.cur = null; this.el.panel.style.display = 'none'; this.blocking = !!this.dq;
    if (this.g) this.g.paused = this.blocking;
    for (const m of document.querySelectorAll('.modal')) if (!m.classList.contains('keep')) m.remove();
  }
  renderPanel() {
    const w = this.cur; if (!w) return;
    const titles = { bag: '🎒 가방 (B)', skills: '📖 스킬 (K)', stats: '🧙 능력치 (C)', story: '📜 이야기 (N)', menu: '⚙️ 메뉴', shop: '🏪 상점', travel: '🗺️ 여행' };
    const body = this['p_' + w]();
    this.el.panel.innerHTML = `<div class="pbox p-${w}"><header><h2>${titles[w]}</h2><button class="x">✕</button></header><div class="pbody">${body}</div></div>`;
    $('.x', this.el.panel).onclick = () => this.closeAll();
    this.el.panel.onclick = (e) => { if (e.target === this.el.panel) this.closeAll(); };
    const h = this['h_' + w]; if (h) h.call(this, this.el.panel);
  }

  // 가방
  p_bag() {
    const s = this.s;
    const eq = SLOTS.map((sl) => { const inst = R.equipped(s, sl), it = inst && ITEMS[inst.id]; return `<button class="eq ${it ? '' : 'none'}" data-uid="${inst ? inst.uid : ''}">${it ? itemIcon(it) : '<span class="ph"></span>'}<span><small>${SLOT_NAME[sl]}</small>${it ? `<b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b>` : '<b class="dim">비어 있음</b>'}</span></button>`; }).join('');
    const items = s.inv.filter((x) => !Object.values(s.equip).includes(x.uid)).sort((a, b) => ITEMS[b.id].tier - ITEMS[a.id].tier || ITEMS[b.id].rar - ITEMS[a.id].rar);
    const inv = items.map((x) => { const it = ITEMS[x.id]; return `<button class="it ${this.sel === x.uid ? 'sel' : ''} ${s.lv < it.lv ? 'lock' : ''}" data-uid="${x.uid}" title="${esc(it.name)}" style="border-color:${RARITY[it.rar].color}">${itemIcon(it)}</button>`; }).join('') || '<p class="dim">아직 장비가 없어요. 몬스터를 잡거나 상점에서 사 보세요.</p>';
    const cons = Object.entries(s.cons).filter(([, n]) => n > 0).map(([id, n]) => { const c = CONSUMABLES[id]; return `<button class="cons" data-c="${id}">${consIcon(c)}<span>${esc(c.name)} ×${n}${s.quick[c.kind] === id ? ' <em>단축</em>' : ''}</span></button>`; }).join('') || '<p class="dim">소모품이 없어요.</p>';
    const selInst = this.sel && s.inv.find((x) => x.uid === this.sel);
    return `<div class="bag"><div class="col"><h3>장착 중</h3>${eq}<h3>소모품</h3><div class="conslist">${cons}</div></div><div class="col"><h3>가방 <small>${items.length}칸</small></h3><div class="invgrid">${inv}</div><div class="detail">${selInst ? itemDetail(selInst, s, true) : '<p class="dim">장비를 눌러 자세히 보기</p>'}</div></div></div>`;
  }
  h_bag(p) {
    const s = this.s;
    for (const b of p.querySelectorAll('[data-uid]')) b.onclick = () => { const u = +b.dataset.uid; if (u) { this.sel = u; this.renderPanel(); } };
    for (const b of p.querySelectorAll('[data-c]')) b.onclick = () => { this.g.useConsumable(b.dataset.c); this.renderPanel(); };
    const eqB = $('.doEquip', p); if (eqB) eqB.onclick = () => { if (R.equip(s, this.sel)) { sfx('item'); this.g.recalc(); } else this.toast('레벨이 모자라요'); this.renderPanel(); };
    const unB = $('.doUnequip', p); if (unB) unB.onclick = () => { const it = ITEMS[s.inv.find((x) => x.uid === this.sel).id]; delete s.equip[it.slot]; this.g.recalc(); this.renderPanel(); };
    const drB = $('.doDrop', p); if (drB) drB.onclick = () => { const i = s.inv.findIndex((x) => x.uid === this.sel); if (i >= 0 && !Object.values(s.equip).includes(this.sel)) { s.inv.splice(i, 1); this.sel = null; this.renderPanel(); } };
  }

  // 스킬
  p_skills() {
    const s = this.s;
    const tabs = s.elements.concat(['arcane']);
    if (!this.tab || !tabs.includes(this.tab)) this.tab = tabs[0];
    const list = Object.values(SKILLS).filter((k) => k.el === this.tab).sort((a, b) => a.rank - b.rank || a.order - b.order);
    const rows = list.map((k) => {
      const lv = s.skills[k.id] || 0, c = R.canLearn(s, k.id), at = skillAt(k, Math.max(1, lv));
      const inSlot = s.slots.indexOf(k.id);
      return `<div class="sk ${lv ? 'have' : ''} ${k.rank > s.rank ? 'locked' : ''}"><div class="ic e-${k.el}">${ELEM_ICON[k.el]}</div><div class="info"><b>${esc(k.name)} <small>${RANK_NAME[k.rank]} · ${kindName(k.kind)}${lv ? ` · Lv.${lv}/${k.el === 'arcane' && k.kind === 'dash' ? 1 : SKILL_MAX_LV}` : ''}</small></b><p>${esc(k.desc)}</p><small class="dim">${k.kind !== 'passive' ? `MP ${at.mp} · 재사용 ${k.cd}초${at.power ? ` · 위력 ${Math.round(at.power * 100)}%` : ''}` : '늘 켜짐'}${!lv && k.req ? ` · 먼저 「${esc(SKILLS[k.req].name)}」` : ''}</small></div><div class="act">${c.ok ? `<button class="learn" data-id="${k.id}">${lv ? '레벨 업' : '배우기'}</button>` : `<span class="why">${esc(lv >= SKILL_MAX_LV ? '최고 레벨' : c.why)}</span>`}${lv && k.kind !== 'passive' ? `<div class="slotsel">${[0, 1, 2, 3, 4, 5].map((i) => `<button data-put="${k.id}" data-i="${i}" class="${inSlot === i ? 'on' : ''}">${i + 1}</button>`).join('')}</div>` : ''}</div></div>`;
    }).join('');
    const tabH = tabs.map((e) => `<button class="tab ${this.tab === e ? 'on' : ''}" data-tab="${e}">${ELEM_ICON[e]} ${ELEM_NAME[e] === '무속성' ? '공용' : ELEM_NAME[e]}</button>`).join('');
    const more = R.needsElementChoice(s) ? `<button class="tab new" data-choose="1">＋ 새 원소 고르기</button>` : '';
    return `<p class="pts">스킬 점수 <b>${s.skillPts}</b> · 계급 <b>${RANK_NAME[s.rank]}</b> · 고른 원소 ${s.elements.length}/${R.RANK_ELEMENTS[s.rank]} <small class="dim">(시험에 붙으면 원소가 늘어요)</small></p><div class="tabs">${tabH}${more}</div><div class="sklist">${rows}</div>`;
  }
  h_skills(p) {
    const s = this.s;
    for (const b of p.querySelectorAll('[data-tab]')) b.onclick = () => { this.tab = b.dataset.tab; this.renderPanel(); };
    for (const b of p.querySelectorAll('.learn')) b.onclick = () => { const r = R.learn(s, b.dataset.id); if (r.ok) { sfx('levelup'); this.g.recalc(); } this.renderPanel(); this.refresh(); };
    for (const b of p.querySelectorAll('[data-put]')) b.onclick = () => { const id = b.dataset.put, i = +b.dataset.i; const j = s.slots.indexOf(id); if (j >= 0) s.slots[j] = null; if (j !== i) s.slots[i] = id; sfx('ui'); this.refresh(); };
    const ch = $('[data-choose]', p); if (ch) ch.onclick = () => this.chooseElement(() => this.renderPanel());
  }

  // 능력치
  p_stats() {
    const s = this.s, hs = this.g.hs;
    const st = [['int', '지능', '마력이 올라요'], ['wis', '지혜', '마나와 마나 회복'], ['vit', '체력', '체력과 방어'], ['agi', '민첩', '치명타와 이동 속도']];
    const rows = st.map(([k, n, d]) => `<div class="st"><b>${n}</b><span>${s.stats[k]}</span><small>${d}</small><button data-st="${k}" ${s.statPts ? '' : 'disabled'}>＋</button><button data-st5="${k}" ${s.statPts >= 5 ? '' : 'disabled'}>＋5</button></div>`).join('');
    const elems = ELEMENTS.filter((e) => (hs.elem[e] || 0) + hs.allElem).map((e) => `${ELEM_ICON[e]}${ELEM_NAME[e]} +${(hs.elem[e] || 0) + hs.allElem}%`).join(' · ') || '없음';
    const der = [['체력', hs.hp], ['마나', hs.mp], ['마력', hs.matk], ['방어', hs.def], ['치명타', `${hs.crit.toFixed(1)}%`], ['이동 속도', `${Math.round(hs.speed)}%`], ['재사용 감소', `${hs.cdr}%`], ['체력 회복', `${hs.regen.toFixed(1)}/초`], ['마나 회복', `${hs.mpRegen.toFixed(1)}/초`], ['흡혈', `${hs.drain}%`]];
    const left = R.MAX_LV <= s.lv ? '최고 레벨!' : `${s.exp.toLocaleString()} / ${R.expNeed(s.lv).toLocaleString()}`;
    return `<div class="stats"><div class="col"><div class="me"><img src="${SP.portraitURL(this.g.look, 4)}" alt=""><div><b>${esc(s.name)}</b><p>Lv.${s.lv} · ${RANK_NAME[s.rank]} 마법사</p><small>경험치 ${left}</small><small>원소: ${s.elements.map((e) => ELEM_ICON[e] + ELEM_NAME[e]).join(' ') || '아직 없음'}</small></div></div><p class="pts">남은 능력치 점수 <b>${s.statPts}</b></p>${rows}</div><div class="col"><h3>지금 능력</h3><table>${der.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table><p><small>속성 피해: ${elems}</small></p><p><small>잡은 몬스터 ${s.kills.toLocaleString()} · 플레이 ${Math.floor(s.time / 60)}분</small></p></div></div>`;
  }
  h_stats(p) {
    const s = this.s;
    for (const b of p.querySelectorAll('[data-st]')) b.onclick = () => { if (s.statPts > 0) { s.statPts--; s.stats[b.dataset.st]++; this.g.recalc(); sfx('ui'); } };
    for (const b of p.querySelectorAll('[data-st5]')) b.onclick = () => { if (s.statPts >= 5) { s.statPts -= 5; s.stats[b.dataset.st5] += 5; this.g.recalc(); sfx('ui'); } };
  }

  // 이야기
  p_story() {
    const s = this.s;
    let h = '';
    for (let c = 1; c <= 8; c++) {
      const C = CHAPTERS[c];
      if (c > s.ch && !s.done) { h += `<div class="chap lock"><b>${c}장 · ???</b></div>`; continue; }
      const steps = C.steps.map((st, i) => { const done = s.done || c < s.ch || i < s.step, now = !s.done && c === s.ch && i === s.step; return `<li class="${done ? 'done' : now ? 'now' : 'todo'}">${done ? '✔' : now ? '▶' : '·'} ${now ? esc(R.stepText(s)) : done || now ? esc(st.text) : '???'}</li>`; }).join('');
      h += `<div class="chap ${c === s.ch ? 'cur' : ''}"><b>${esc(C.title)}</b><small>${esc(C.field.name)} → ${esc(C.dungeon.name)}${C.exam ? ` · ${RANK_NAME[C.exam]} 시험` : ''}</small><ul>${steps}</ul></div>`;
    }
    return `<div class="story">${h}</div>`;
  }

  // 메뉴
  p_menu() {
    return `<div class="menu"><button data-m="save">💾 저장하기</button><button data-m="sound">${soundOn() ? '🔊 소리 끄기' : '🔇 소리 켜기'}</button><button data-m="keys">⌨️ 조작법</button><button data-m="credits">📜 만든 사람 · 출처</button><button data-m="title">🏠 처음 화면으로</button><button data-m="delete" class="danger">🗑️ 저장 지우기</button></div><div class="keys" style="display:${this.showKeys ? '' : 'none'}">${KEYS_HTML}</div>`;
  }
  h_menu(p) {
    for (const b of p.querySelectorAll('[data-m]')) b.onclick = () => {
      const m = b.dataset.m;
      if (m === 'save') { this.g.save(); this.toast('저장했어요'); }
      if (m === 'sound') { toggleSound(); this.renderPanel(); }
      if (m === 'keys') { this.showKeys = !this.showKeys; this.renderPanel(); }
      if (m === 'credits') this.credits();
      if (m === 'title') { this.g.save(); location.reload(); }
      if (m === 'delete') this.confirm('정말 저장을 지울까요? 되돌릴 수 없어요.', () => { localStorage.removeItem(R.SAVE_KEY); location.reload(); });
    };
  }
  credits() {
    const d = document.createElement('div'); d.className = 'modal credits';
    d.innerHTML = `<div class="box wide"><h2>매지션 스토리</h2><p>만든 사람: <b>심심풀이</b></p><p>주인공·마을 사람·고양이 캐럿은 웹툰 <a href="https://www.peppercarrot.com" target="_blank" rel="noopener">Pepper&amp;Carrot</a> (David Revoy)을 바탕으로 픽셀로 다시 그렸어요.<br>원작 라이선스: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · 바꾼 점: 픽셀 그림으로 새로 그림, 새 캐릭터·몬스터·마법·이야기를 더함.</p><p>몬스터·마법·지도·소리·이야기는 모두 이 게임을 위해 새로 만들었어요.</p><p>글꼴: <a href="https://github.com/quiple/galmuri" target="_blank" rel="noopener">갈무리</a> (SIL Open Font License)</p><div class="row"><button class="ok">닫기</button></div></div>`;
    this.root.appendChild(d); this.blocking = true; this.g.paused = true;
    $('.ok', d).onclick = () => { d.remove(); this.blocking = !!this.cur || !!this.dq; this.g.paused = this.blocking; };
  }

  // 상점
  shop(kind, npc) { this.shopKind = kind; this.shopNpc = npc; this.shopTab = 'buy'; this.open('shop'); }
  p_shop() {
    const s = this.s, kind = this.shopKind;
    const name = { staff: '갈릭의 지팡이 공방', cloth: '미라의 의상실', potion: '리나의 약초 가게', general: '모모의 잡화점' }[kind];
    const tabs = `<div class="tabs"><button class="tab ${this.shopTab === 'buy' ? 'on' : ''}" data-tab="buy">사기</button><button class="tab ${this.shopTab === 'sell' ? 'on' : ''}" data-tab="sell">팔기</button></div>`;
    let rows = '';
    if (this.shopTab === 'buy') {
      rows = R.shopStock(kind, s).map((id) => {
        if (CONSUMABLES[id]) { const c = CONSUMABLES[id]; return `<div class="row-it">${consIcon(c)}<div><b>${esc(c.name)}</b><small>${c.kind === 'hp' ? `체력 +${c.val}` : c.kind === 'mp' ? `마나 +${c.val}` : esc(c.desc || '마을로 바로 돌아가요')} · 가진 수 ${s.cons[id] || 0}</small></div><button data-buy="${id}" ${s.gold >= c.price ? '' : 'disabled'}>🪙${c.price}</button></div>`; }
        const it = ITEMS[id]; return `<div class="row-it">${itemIcon(it)}<div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b><small>Lv.${it.lv} · ${SLOT_NAME[it.slot]} · ${statText(it.st)}</small>${compare(s, it)}</div><button data-buy="${id}" ${s.gold >= it.price ? '' : 'disabled'}>🪙${it.price.toLocaleString()}</button></div>`;
      }).join('');
    } else {
      const items = s.inv.filter((x) => !Object.values(s.equip).includes(x.uid));
      rows = items.map((x) => { const it = ITEMS[x.id]; return `<div class="row-it">${itemIcon(it)}<div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b><small>Lv.${it.lv} · ${statText(it.st)}</small></div><button data-sell="${x.uid}">🪙${R.sellPrice(x.id).toLocaleString()} 팔기</button></div>`; }).join('') || '<p class="dim">팔 장비가 없어요 (장착 중인 건 팔 수 없어요).</p>';
      if (items.length) rows = `<p><button class="sellall" data-sellall="1">일반·고급 장비 모두 팔기</button></p>` + rows;
    }
    return `<p class="pts"><b>${name}</b> · 가진 돈 🪙 ${s.gold.toLocaleString()}</p>${tabs}<div class="shoplist">${rows}</div>`;
  }
  h_shop(p) {
    const s = this.s;
    for (const b of p.querySelectorAll('[data-tab]')) b.onclick = () => { this.shopTab = b.dataset.tab; this.renderPanel(); };
    for (const b of p.querySelectorAll('[data-buy]')) b.onclick = () => { if (R.buy(s, b.dataset.buy)) { sfx('coin'); this.toast('샀어요!'); this.g.save(); } this.renderPanel(); this.refresh(); };
    for (const b of p.querySelectorAll('[data-sell]')) b.onclick = () => { const g = R.sell(s, +b.dataset.sell); if (g) sfx('coin'); this.renderPanel(); this.refresh(); };
    const sa = $('[data-sellall]', p); if (sa) sa.onclick = () => { let t = 0; for (const x of s.inv.slice()) if (ITEMS[x.id].rar <= 1 && !Object.values(s.equip).includes(x.uid)) t += R.sell(s, x.uid); if (t) { sfx('coin'); this.toast(`🪙${t} 받았어요`); } this.renderPanel(); this.refresh(); };
  }

  // 여행
  travel() { this.open('travel'); }
  p_travel() {
    const s = this.s;
    let h = `<button class="trv" data-go="village"><b>🏠 루미나 마을</b><small>상점 · 마탑</small></button>`;
    for (let c = 1; c <= 8; c++) {
      const C = CHAPTERS[c];
      for (const a of [C.field, C.dungeon]) {
        const open = R.areaOpen(s, a.id), lv = Math.min(...a.mons.map((m) => MONSTERS[m].lv));
        h += `<button class="trv ${open ? '' : 'lock'}" data-go="${a.id}" ${open ? '' : 'disabled'}><b>${open ? (a === C.field ? '🌳' : '🕳️') : '🔒'} ${open ? esc(a.name) : '???'}</b><small>${c}장 · 권장 Lv.${lv}+</small></button>`;
      }
    }
    return `<p class="pts">어디로 갈까요?</p><div class="trvlist">${h}</div>`;
  }
  h_travel(p) { for (const b of p.querySelectorAll('[data-go]')) b.onclick = () => { this.closeAll(); this.g.travelTo(b.dataset.go); }; }
}

// ───────── 도움 ─────────
function kindName(k) { return { bolt: '탄', multi: '여러 발', nova: '주위 폭발', area: '지점 폭발', rain: '쏟아짐', line: '관통', field: '장판', orbit: '도는 구슬', chain: '연쇄', buff: '강화', heal: '회복', dash: '이동', passive: '늘 켜짐' }[k] || k; }
export function itemIcon(it) { const c1 = it.look.orb || it.look.c || [200, 200, 200]; return `<img class="icon" src="${SP.iconURL(it.slot, c1, it.look.wood || it.look.band || it.look.m, it.rar)}" alt="">`; }
function consIcon(c) { return `<img class="icon" src="${SP.iconURL(c.kind === 'recall' || c.kind === 'reset' ? 'scroll' : 'potion', c.color, null, 0)}" alt="">`; }
function itemDetail(inst, s, buttons) {
  const it = ITEMS[inst.id], on = Object.values(s.equip).includes(inst.uid);
  return `<div class="det">${itemIcon(it)}<div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b><small>${RARITY[it.rar].name} · ${SLOT_NAME[it.slot]} · 필요 Lv.${it.lv}${it.el && it.el !== 'arcane' ? ` · ${ELEM_ICON[it.el]} ${ELEM_NAME[it.el]} 지팡이` : ''}</small><p>${statText(it.st)}${it.slot === 'staff' ? ' · 기본 공격이 이 지팡이의 속성으로 나가요' : ''}</p>${compare(s, it)}${buttons ? `<div class="row">${on ? '<button class="doUnequip">벗기</button>' : `<button class="doEquip" ${s.lv >= it.lv ? '' : 'disabled'}>장착</button><button class="doDrop">버리기</button>`}</div>` : ''}</div></div>`;
}
function compare(s, it) {
  const cur = R.equipped(s, it.slot); if (!cur || cur.id === it.id) return '';
  const a = ITEMS[cur.id].st, b = it.st, keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const parts = [];
  for (const k of keys) { const d = +((b[k] || 0) - (a[k] || 0)).toFixed(1); if (d) parts.push(`<span class="${d > 0 ? 'up' : 'down'}">${STAT_NAME[k] || k} ${d > 0 ? '+' : ''}${d}</span>`); }
  return parts.length ? `<small class="cmp">지금 장비보다: ${parts.join(' ')}</small>` : '';
}
const KEYS_HTML = `<table><tr><th>움직이기</th><td>방향키 · WASD</td></tr><tr><th>기본 공격</th><td>Space · J (누르고 있으면 계속)</td></tr><tr><th>스킬</th><td>1 ~ 6</td></tr><tr><th>물약</th><td>Q 체력 · E 마나</td></tr><tr><th>말 걸기 · 상점</th><td>F · Enter</td></tr><tr><th>가방 · 스킬 · 능력치 · 이야기</th><td>B · K · C · N</td></tr><tr><th>메뉴 · 닫기</th><td>Esc</td></tr></table><p><small>휴대폰: 왼쪽 아래 조이스틱으로 움직이고 오른쪽 단추로 공격·스킬을 써요.</small></p>`;
export { KEYS_HTML };
