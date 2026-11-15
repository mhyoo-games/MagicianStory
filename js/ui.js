// 화면 위 HTML: HUD · 대화 · 창(가방·스킬·능력치·이야기·펫·지도·단축키·상점·대장간·펫 상자) · 선택 창
import * as R from './rules.js';
import { keyLabel } from './input.js';
import { audio, sfx } from './audio.js';
import { portrait } from './engine/portrait.js';
import { SKILLS, ELEMENTS, ELEM_NAME, ELEM_ICON, ELEM_COLOR, RANK_NAME, ELEMENT_TRAIT, TRAIT_LV, SKILL_MAX_LV, describe, kindText, STAT_NAME, skillAt } from './data/skills.js';
import { ITEMS, SLOTS, SLOT_NAME, SLOT_ICON, RARITY, MATERIALS, CONSUMABLES, ENHANCE, ENHANCE_BONUS, enhanceCost, enhanceMul } from './data/items.js';
import { PETS, PET_RARITY, PET_BOXES, PET_MAX_LV, petEff } from './data/pets.js';
import { SPEAKERS, NPCS, HEROES, CHAPTERS } from './data/story.js';
import { REGIONS, ORDER } from './data/world.js';
import { MONSTERS } from './data/monsters.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const PCT = new Set(['crit', 'cdr', 'elem', 'drain', 'gold', 'exp', 'drop', 'speed', 'dmgTaken', 'blinkCd', 'elemAll', 'matk%']);
const statLine = (st) => Object.entries(st).map(([k, v]) => `${STAT_NAME[k] || { elemAll: '모든 속성 피해', pickup: '줍기 범위', blinkCd: '블링크 재사용', regen: '체력 회복' }[k] || k} ${v > 0 ? '+' : ''}${v}${PCT.has(k) ? '%' : k === 'regen' || k === 'mpRegen' ? '/초' : ''}`).join(' · ');
const itemIcon = (it) => SLOT_ICON[it.slot];
const ACTION_ORDER = ['attack', 'blink', 'talk', 'slot0', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'hp', 'mp', 'bag', 'skills', 'stats', 'story', 'pets', 'map'];

export class UI {
  constructor(root) {
    this.root = root; this.panel = null; this.modalOpen = 0; this.dlg = null;
    this.el = { hud: $('#hud'), quest: $('#quest'), slots: $('#slots'), boss: $('#boss'), banner: $('#banner'), toasts: $('#toasts'), hint: $('#hint'), dialog: $('#dialog'), panel: $('#panel'), flash: $('#flash'), fade: $('#fade') };
    this.el.panel.addEventListener('click', (e) => { if (e.target === this.el.panel) this.close(); });
  }
  bind(g) {
    this.g = g;
    this.el.hud.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) { sfx('ui'); b.dataset.open === 'menu' ? this.open('menu') : this.toggle(b.dataset.open); } });
    this.el.slots.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-slot]'); if (!b || !this.g.s) return; e.preventDefault();
      const k = b.dataset.slot;
      if (k === 'attack') { this.g.input.touchAct.add('attack'); this.g.input.touchHeld.add('attack'); const up = () => { this.g.input.touchHeld.delete('attack'); removeEventListener('pointerup', up); }; addEventListener('pointerup', up); }
      else if (k === 'blink') this.g.blink(); else if (k === 'hp' || k === 'mp') this.g.usePotion(k); else this.g.useSlot(+k);
    });
  }
  blocking() { return !!this.panel || this.modalOpen > 0 || !!this.dlg; }

  // ───────── HUD ─────────
  tick() {
    const g = this.g, s = g.s; if (!s || !g.h) return;
    const h = g.h, hs = g.hs;
    if (!this.hudBuilt) this.buildHud();
    const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));
    this.q('#lvText').innerHTML = `${esc(s.name)} <b>Lv.${s.lv}</b> <span class="rank r${s.rank}">${RANK_NAME[s.rank]}</span> ${s.elements.map((e) => `<i title="${ELEM_NAME[e]}">${ELEM_ICON[e]}</i>`).join('')}`;
    const hb = this.q('#hpBar'), mb = this.q('#mpBar'), xb = this.q('#xpBar');
    hb.style.width = pct(h.hp, hs.hp) + '%'; hb.parentNode.dataset.t = `${Math.ceil(Math.max(0, h.hp))} / ${hs.hp}${h.barrier > 1 ? ` (+${Math.round(h.barrier)})` : ''}`;
    mb.style.width = pct(h.mp, hs.mp) + '%'; mb.parentNode.dataset.t = `${Math.floor(h.mp)} / ${hs.mp}`;
    xb.style.width = pct(s.exp, R.expNeed(s.lv)) + '%';
    const bf = [];
    for (const b of g.buffs) bf.push(`<span>${b.icon || '✨'}${Math.ceil(b.t)}</span>`);
    if (h.stoneShield) bf.push(`<span title="견고">🪨×${h.stoneShield}</span>`);
    if (g.flow) bf.push(`<span title="흐름">🌊${g.flow}</span>`);
    if (h.st.poison > 0) bf.push('<span class="bad">☠</span>'); if (h.st.slow > 0) bf.push('<span class="bad">🐌</span>'); if (h.st.stun > 0) bf.push('<span class="bad">💫</span>');
    if (s.statPts || s.skillPts) bf.push(`<span class="pts" title="쓸 수 있는 점수">${s.statPts ? `능력치 ${s.statPts}` : ''}${s.statPts && s.skillPts ? ' · ' : ''}${s.skillPts ? `스킬 ${s.skillPts}` : ''}</span>`);
    const bfs = bf.join(''); if (bfs !== this.lastBf) { this.q('#buffs').innerHTML = bfs; this.lastBf = bfs; }
    this.q('#goldText').textContent = `💰 ${s.gold.toLocaleString()}G`;
    // 슬롯
    for (const el of this.el.slots.querySelectorAll('[data-slot]')) {
      const k = el.dataset.slot; let cd = 0, max = 1, nomp = false;
      if (k === 'attack') { cd = Math.max(0, h.atkCd); max = R.BASIC_CD; }
      else if (k === 'blink') { cd = g.cds.blink || 0; max = SKILLS.blink.cd; nomp = h.mp < SKILLS.blink.mp; }
      else if (k === 'hp' || k === 'mp') { const id = R.quickPotion(s, k); el.querySelector('em').textContent = id ? s.cons[id] : 0; cd = g.cds['pot_' + k] || 0; max = 1.2; }
      else { const id = s.slots[+k]; if (id) { const sk = R.skillOf(s, id); cd = g.cds[id] || 0; max = sk.cd * (1 - hs.cdr / 100); nomp = h.mp < sk.mp; } }
      el.querySelector('.cd').style.height = (cd > 0 ? Math.min(100, (cd / max) * 100) : 0) + '%';
      el.classList.toggle('nomp', nomp);
      const t = el.querySelector('.cdt'); if (t) t.textContent = cd > 0.95 ? Math.ceil(cd) : '';
    }
    // 보스
    if (this.bossM) { const m = this.bossM; this.q('#bossBar').style.width = pct(m.hp, m.max) + '%'; this.q('#bossHp').textContent = `${Math.max(0, Math.ceil(m.hp)).toLocaleString()} / ${m.max.toLocaleString()}`; }
    // 살펴보기
    const ni = this.blocking() ? null : g.nearInteract();
    if (ni !== this.lastHint) { this.lastHint = ni; this.el.hint.style.display = ni ? '' : 'none'; if (ni) this.el.hint.innerHTML = `<b>[${keyLabel(s.keys.talk)}]</b> ${esc(ni)}`; $('#talkBtn').style.display = ni ? '' : 'none'; }
  }
  q(s) { return this.root.querySelector(s); }
  buildHud() {
    this.hudBuilt = true; this.refreshSlots();
    this.refreshMenus();
  }
  refreshMenus() {
    const k = this.g.s.keys;
    this.q('.menus').innerHTML = [['bag', '🎒', '가방'], ['skills', '📖', '스킬'], ['stats', '🧙', '능력치'], ['pets', '🐾', '펫'], ['story', '📜', '이야기'], ['map', '🗺️', '지도']].map(([a, ic, nm]) => `<button data-open="${a}" title="${nm} (${keyLabel(k[a])})">${ic}<small>${keyLabel(k[a])}</small></button>`).join('') + '<button data-open="menu" title="메뉴 (Esc)">⚙️<small>Esc</small></button>';
  }
  refreshSlots() {
    const s = this.g.s, k = s.keys;
    const cell = (key, label, inner, cls = '', name = '') => `<button class="slot ${cls}" data-slot="${key}" data-name="${esc(name)}"><small>${label}</small>${inner}<div class="cd"></div><span class="cdt"></span></button>`;
    let html = cell('attack', keyLabel(k.attack), '<b>✦</b>', 'basic', '기본 공격') + cell('blink', keyLabel(k.blink), '<b>💨</b>', 'blinkS', '블링크');
    html += '<span class="sep"></span>';
    for (let i = 0; i < R.SLOT_COUNT; i++) {
      const id = s.slots[i], sk = id && SKILLS[id];
      html += cell(i, keyLabel(k['slot' + i]), sk ? `<b style="color:${ELEM_COLOR[sk.el]}">${ELEM_ICON[sk.el]}</b>` : '', sk ? '' : 'empty', sk ? sk.name : '');
    }
    html += '<span class="sep"></span>' + cell('hp', keyLabel(k.hp), '<b>❤️</b><em>0</em>', 'pot', '체력') + cell('mp', keyLabel(k.mp), '<b>💙</b><em>0</em>', 'pot', '마나');
    this.el.slots.innerHTML = html;
  }
  quest(title, text, where) { this.el.quest.innerHTML = `<small>${esc(title)}</small>${esc(text)}${where ? `<em>${esc(where)}</em>` : ''}`; this.el.quest.classList.remove('pulse'); void this.el.quest.offsetWidth; this.el.quest.classList.add('pulse'); }
  boss(m) {
    this.bossM = m;
    if (!m) { this.el.boss.style.display = 'none'; return; }
    const role = { mid: '중간 보스', boss: '보스', exam: '전직 시험' }[m.role] || '';
    this.el.boss.innerHTML = `<span>${esc(m.def.name)}</span> <small>${role} · Lv.${m.lv}</small><div><i id="bossBar"></i></div><small id="bossHp"></small>`;
    this.el.boss.style.display = '';
  }
  banner(big, small = '') { const b = this.el.banner; b.innerHTML = `<b>${esc(big)}</b>${small ? `<small>${esc(small)}</small>` : ''}`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  toast(html) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
    this.el.toasts.appendChild(t); while (this.el.toasts.children.length > 6) this.el.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
  }
  hurt() { this.el.flash.classList.remove('on'); void this.el.flash.offsetWidth; this.el.flash.classList.add('on'); }
  fade(fn) { const f = this.el.fade; f.classList.add('on'); this.modalOpen++; setTimeout(() => { try { fn(); } finally { setTimeout(() => { f.classList.remove('on'); this.modalOpen--; }, 120); } }, 280); }

  // ───────── 대화 ─────────
  portraitOf(who) {
    const g = this.g;
    if (who === 'hero') return portrait('hero' + g.heroKey, 'human', g.heroLook());
    if (who === 'carrot') return portrait('pet_carrot', 'pet', PETS.carrot);
    if (NPCS[who]) return portrait('npc_' + who, 'npc', NPCS[who].look, who);
    const mid = { grak: 'goblin_chief', morga: 'morga', bolg: 'bolg', ceres: 'ceres', kai: 'kai', nekros: 'nekros', baltar: 'baltar', azdaha: 'azdaha' }[who];
    if (mid) return portrait('mon_' + mid, 'mon', MONSTERS[mid].model, mid);
    return '';
  }
  dialog(lines, done) {
    const g = this.g, s = g.s; let i = 0;
    const box = this.el.dialog;
    const next = () => {
      if (i >= lines.length) { box.style.display = 'none'; this.dlg = null; done && done(); return; }
      const [who, raw] = lines[i++];
      if (raw === '@chooseElement') { box.style.display = 'none'; this.chooseElement(() => next()); return; }
      const text = raw.replace(/\{name\}/g, s.name);
      const name = (SPEAKERS[who] ?? who).replace('{name}', s.name);
      const img = who === 'sys' ? '' : this.portraitOf(who);
      box.className = who === 'sys' ? 'sys' : '';
      box.innerHTML = `${img ? `<img class="por" src="${img}" alt="">` : who === 'sys' ? '' : '<div class="por"></div>'}<div class="body">${name ? `<b>${esc(name)}</b>` : ''}<p class="txt"></p><small>▶ ${keyLabel(s.keys.talk)} · 클릭</small></div>`;
      box.style.display = '';
      const t = box.querySelector('.txt'); let k = 0;
      this.dlgType = setInterval(() => { k += 2; t.textContent = text.slice(0, k); if (k % 6 === 0) sfx('talk'); if (k >= text.length) { clearInterval(this.dlgType); this.dlgType = null; } }, 22);
      this.dlgSkip = () => { if (this.dlgType) { clearInterval(this.dlgType); this.dlgType = null; t.textContent = text; return; } next(); };
    };
    this.dlg = { next: () => this.dlgSkip && this.dlgSkip() };
    box.onclick = () => this.dlg && this.dlg.next();
    next();
  }
  keyDown(code) {
    // 대화 · 창이 열린 동안 키
    const s = this.g.s; if (!s) return false;
    if (this.capturing) return true;
    if (this.modalOpen > 0) return code === 'Escape' ? (this.modalEsc && this.modalEsc(), true) : true;
    if (this.dlg) { if (code === s.keys.talk || code === 'Enter' || code === s.keys.attack) this.dlg.next(); return true; }
    if (code === 'Escape') { if (this.panel) this.close(); else this.open('menu'); return true; }
    for (const a of ['bag', 'skills', 'stats', 'story', 'pets', 'map']) if (code === s.keys[a]) { this.toggle(a); return true; }
    return !!this.panel;
  }

  // ───────── 창 ─────────
  toggle(kind) { if (this.panel === kind) this.close(); else this.open(kind); }
  close() { this.panel = null; this.el.panel.style.display = 'none'; this.el.panel.innerHTML = ''; sfx('ui'); }
  open(kind, opt = {}) { this.panel = kind; this.popt = opt; this.render(); this.el.panel.style.display = ''; }
  render() {
    const k = this.panel; if (!k) return;
    const [title, body] = this.view(k);
    this.el.panel.innerHTML = `<div class="pbox p-${k.replace(':', '-')}"><header><h2>${title}</h2><span class="gold">💰 ${this.g.s.gold.toLocaleString()}G</span><button class="x" data-x>✕</button></header><div class="pbody">${body}</div></div>`;
    this.el.panel.querySelector('[data-x]').onclick = () => this.close();
    this.wire(k);
  }
  view(k) {
    if (k === 'bag') return ['🎒 가방', this.vBag()];
    if (k === 'skills') return ['📖 스킬', this.vSkills()];
    if (k === 'stats') return ['🧙 능력치', this.vStats()];
    if (k === 'story') return ['📜 이야기', this.vStory()];
    if (k === 'pets') return ['🐾 펫', this.vPets()];
    if (k === 'map' || k === 'warp') return [k === 'warp' ? '🔮 순간 이동 비석' : '🗺️ 지도', this.vMap(k === 'warp')];
    if (k === 'keys') return ['⌨️ 단축키 설정', this.vKeys()];
    if (k === 'menu') return ['⚙️ 메뉴', this.vMenu()];
    if (k === 'credits') return ['ℹ️ 만든 사람 · 출처', this.vCredits()];
    if (k.startsWith('shop:')) return [{ 'shop:potion': '🧪 물약 가게', 'shop:staff': '🪄 지팡이 가게', 'shop:cloth': '👒 옷 가게', 'shop:general': '🎒 잡화점' }[k], this.vShop(k.slice(5))];
    if (k === 'smith') return ['⚒️ 대장간', this.vSmith()];
    if (k === 'petshop') return ['🎁 펫 가게', this.vPetShop()];
    return ['', ''];
  }

  // 가방
  vBag() {
    const s = this.g.s, tab = this.popt.tab || 'gear', sel = this.popt.sel;
    const eqHtml = SLOTS.map((sl) => { const i = R.equipped(s, sl), it = i && ITEMS[i.id]; return `<button class="eq" data-sel="${i ? i.uid : ''}"><span class="ic">${SLOT_ICON[sl]}</span><span><small>${SLOT_NAME[sl]}</small><b style="color:${it ? RARITY[it.rar].color : '#777'}">${it ? `${esc(it.name)}${i.plus ? ` +${i.plus}` : ''}` : '비어 있음'}</b></span></button>`; }).join('');
    let right = `<div class="tabs">${[['gear', '장비'], ['mats', '재료'], ['cons', '소모품']].map(([t, n]) => `<button class="tab ${tab === t ? 'on' : ''}" data-tab="${t}">${n}</button>`).join('')}</div>`;
    if (tab === 'gear') {
      const inv = s.inv.slice().sort((a, b) => ITEMS[b.id].tier - ITEMS[a.id].tier || ITEMS[b.id].rar - ITEMS[a.id].rar);
      right += `<div class="invgrid">${inv.map((i) => { const it = ITEMS[i.id], eq = Object.values(s.equip).includes(i.uid); return `<button class="it ${sel === i.uid ? 'sel' : ''} ${R.canEquip(s, i.id) ? '' : 'lock'} ${eq ? 'eqd' : ''}" data-sel="${i.uid}" style="border-color:${RARITY[it.rar].color}" title="${esc(it.name)}">${itemIcon(it)}${i.plus ? `<em>+${i.plus}</em>` : ''}${eq ? '<i>E</i>' : ''}</button>`; }).join('') || '<p class="dim">장비가 없어요</p>'}</div>`;
      right += `<div class="detail">${sel ? this.itemDetail(sel) : '<p class="dim">장비를 눌러 자세히 보기</p>'}</div>`;
    } else if (tab === 'mats') {
      const ms = Object.entries(s.mats).filter(([, n]) => n > 0);
      right += `<div class="matlist">${ms.map(([id, n]) => `<div class="mat"><span>${MATERIALS[id].icon}</span><b>${MATERIALS[id].name}</b><em>×${n}</em></div>`).join('') || '<p class="dim">재료가 없어요. 몬스터를 쓰러뜨리면 떨어져요.</p>'}</div><p class="dim">재료는 대장간에서 장비를 만들거나 강화하는 데 써요.</p>`;
    } else {
      const cs = Object.entries(s.cons).filter(([, n]) => n > 0);
      right += `<div class="conslist">${cs.map(([id, n]) => { const c = CONSUMABLES[id]; const q = c.kind === 'hp' || c.kind === 'mp'; return `<div class="cons"><span style="color:${c.color}">●</span><b>${c.name}</b><em>×${n}</em>${q ? `<button data-quick="${id}" class="${s.quick[c.kind] === id ? 'on' : ''}">${s.quick[c.kind] === id ? '빠른 칸 ✓' : '빠른 칸에'}</button>` : c.kind === 'recall' ? '<button data-use="recall">쓰기</button>' : c.kind === 'reset' ? '<button data-use="forget">쓰기</button>' : `<small>${c.desc || ''}</small>`}</div>`; }).join('') || '<p class="dim">소모품이 없어요</p>'}</div>`;
    }
    return `<div class="bag"><div><h3>입은 장비</h3>${eqHtml}<p class="dim small">장비 능력은 강화할수록 커지고, +10 · +15 · +20에는 추가 효과가 붙어요.</p></div><div>${right}</div></div>`;
  }
  itemDetail(uid) {
    const s = this.g.s, inst = s.inv.find((x) => x.uid === uid); if (!inst) return '';
    const it = ITEMS[inst.id], st = R.itemStats(inst), eq = Object.values(s.equip).includes(uid);
    const cur = R.equipped(s, it.slot), cst = cur && cur.uid !== uid ? R.itemStats(cur) : null;
    let cmp = '';
    if (cst) { const keys = new Set([...Object.keys(st), ...Object.keys(cst)]); cmp = `<span class="cmp">${[...keys].map((k) => { const d = +((st[k] || 0) - (cst[k] || 0)).toFixed(1); return d ? `<i class="${d > 0 ? 'up' : 'down'}">${STAT_NAME[k] || k} ${d > 0 ? '▲' : '▼'}${Math.abs(d)}</i>` : ''; }).join('')}</span>`; }
    const src = { shop: '상점', craft: '대장간 제작', drop: '몬스터가 드물게', boss: '보스 고유' }[it.src];
    return `<div class="det"><div class="big" style="border-color:${RARITY[it.rar].color}">${itemIcon(it)}</div><div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}${inst.plus ? ` +${inst.plus}` : ''}</b><small>${RARITY[it.rar].name} · ${SLOT_NAME[it.slot]} · Lv.${it.lv} 이상 · ${src}${it.el && it.el !== 'arcane' ? ` · ${ELEM_ICON[it.el]} ${ELEM_NAME[it.el]}` : ''}</small><p>${statLine(st)}</p>${cmp}
      <div class="row">${eq ? '<span class="dim">입고 있어요</span>' : R.canEquip(s, inst.id) ? `<button data-equip="${uid}">입기</button>` : `<span class="dim">Lv.${it.lv}부터 입을 수 있어요</span>`}</div></div></div>`;
  }
  // 스킬
  vSkills() {
    const s = this.g.s, els = s.elements;
    const tab = this.popt.tab || els[0] || 'arcane';
    let html = `<p class="pts">스킬 점수 <b>${s.skillPts}</b> · 계급 <b>${RANK_NAME[s.rank]}</b> · Lv.${TRAIT_LV}이 되면 특성을 하나 골라요.</p>`;
    html += `<div class="tabs">${els.map((e) => `<button class="tab ${tab === e ? 'on' : ''}" data-tab="${e}" style="--c:${ELEM_COLOR[e]}">${ELEM_ICON[e]} ${ELEM_NAME[e]}</button>`).join('')}<button class="tab ${tab === 'arcane' ? 'on' : ''}" data-tab="arcane">🔮 공용</button>${R.needsElementChoice(s) ? '<button class="tab new" data-choose-el>＋ 원소 고르기</button>' : ''}</div>`;
    if (tab !== 'arcane') html += `<div class="eltrait" style="border-color:${ELEM_COLOR[tab]}"><b>${ELEM_ICON[tab]} 원소 특성 「${ELEMENT_TRAIT[tab].name}」</b><p>${ELEMENT_TRAIT[tab].desc}</p></div>`;
    const list = Object.values(SKILLS).filter((k) => k.el === tab).sort((a, b) => a.order - b.order);
    html += '<div class="sklist">' + list.map((sk) => {
      const lv = s.skills[sk.id] || 0, cl = R.canLearn(s, sk.id), cur = skillAt(sk.id, Math.max(1, lv), s.traits[sk.id] ?? null);
      const slotIdx = s.slots.indexOf(sk.id);
      const traits = sk.traits ? `<div class="traits">${sk.traits.map((t, i) => `<span class="${s.traits[sk.id] === i ? 'on' : s.traits[sk.id] != null ? 'off' : ''}">${i ? 'B' : 'A'} · <b>${esc(t.name)}</b> ${esc(t.desc)}</span>`).join('')}</div>` : '';
      const needTrait = sk.traits && lv >= TRAIT_LV && s.traits[sk.id] == null;
      const info = sk.kind === 'blink' ? `MP ${sk.mp} · 재사용 ${sk.cd}초 · 거리 ${sk.dist}m` : `MP ${cur.mp} · 재사용 ${cur.cd}초${cur.power ? ` · 위력 ${Math.round(cur.power * 100)}%` : ''}`;
      return `<div class="sk ${lv ? 'have' : ''} ${sk.rank > s.rank ? 'locked' : ''}"><div class="ic" style="color:${ELEM_COLOR[sk.el]}">${ELEM_ICON[sk.el]}</div><div class="info"><b>${esc(sk.name)} <small>${RANK_NAME[sk.rank]} · ${kindText(sk.kind)} · Lv.${lv}/${R.maxLv(sk.id)}</small></b><p>${esc(describe(cur))}</p><p class="dim small">${info}</p>${traits}</div>
        <div class="act">${sk.base ? '<span class="why">기본 스킬</span>' : `<button class="learn" data-learn="${sk.id}" ${cl.ok ? '' : 'disabled'}>${lv ? '올리기' : '배우기'}</button>${cl.ok ? '' : `<span class="why">${cl.why}</span>`}`}
        ${needTrait ? `<button class="learn hot" data-trait="${sk.id}">특성 고르기</button>` : ''}
        ${lv && sk.kind !== 'blink' ? `<div class="slotsel">${Array.from({ length: R.SLOT_COUNT }, (_, i) => `<button data-slotset="${sk.id}:${i}" class="${slotIdx === i ? 'on' : ''}" title="스킬 칸 ${i + 1}">${keyLabel(s.keys['slot' + i])}</button>`).join('')}</div>` : ''}</div></div>`;
    }).join('') + '</div>';
    return html;
  }
  vStats() {
    const s = this.g.s, hs = this.g.hs;
    const st = [['int', '지능', '마력 +1.5'], ['wis', '지혜', '마나 +4 · 마나 회복'], ['vit', '체력', '체력 +7 · 방어'], ['agi', '민첩', '치명타 · 이동 속도']];
    const rows = [['체력', hs.hp], ['마나', hs.mp], ['마력', hs.matk], ['방어', hs.def], ['치명타', hs.crit.toFixed(1) + '%'], ['재사용 감소', hs.cdr + '%'], ['이동 속도', Math.round(hs.speed) + '%'], ['체력 회복', hs.regen.toFixed(1) + '/초'], ['마나 회복', hs.mpRegen.toFixed(1) + '/초'], ['모든 속성 피해', '+' + hs.allElem + '%'], ['흡혈', hs.drain + '%'], ['골드 · 경험치 · 드랍', `+${hs.gold || 0}% · +${hs.exp || 0}% · +${hs.drop || 0}%`]];
    for (const e of ELEMENTS) if (hs.elem[e]) rows.push([`${ELEM_ICON[e]} ${ELEM_NAME[e]} 피해`, '+' + hs.elem[e] + '%']);
    return `<div class="stats"><div><div class="me"><img src="${portrait('hero' + this.g.heroKey, 'human', this.g.heroLook())}" alt=""><p><b>${esc(s.name)}</b><small>Lv.${s.lv} · ${RANK_NAME[s.rank]} 마법사</small><small>경험치 ${s.exp.toLocaleString()} / ${R.expNeed(s.lv).toLocaleString()}</small><small>쓰러뜨린 몬스터 ${s.kills.toLocaleString()} · 모험 ${Math.floor(s.time / 60)}분</small></p></div>
      <p class="pts">남은 능력치 점수 <b>${s.statPts}</b></p>${st.map(([k, n, d]) => `<div class="st"><b>${n}</b><span>${s.stats[k]}</span><small>${d}</small><button data-stat="${k}" ${s.statPts ? '' : 'disabled'}>＋</button><button data-stat5="${k}" ${s.statPts >= 5 ? '' : 'disabled'}>＋5</button></div>`).join('')}</div>
      <div><table>${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table></div></div>`;
  }
  vStory() {
    const s = this.g.s;
    return '<div class="story">' + CHAPTERS.slice(1).map((c) => {
      const cur = c.id === s.ch && !s.done, done = c.id < s.ch || s.done, lock = c.id > s.ch && !s.done;
      return `<div class="chap ${cur ? 'cur' : ''} ${lock ? 'lock' : ''}"><b>${c.title}</b>${lock ? '<small>아직 열리지 않았어요</small>' : `<ul>${c.steps.map((st, i) => `<li class="${done || (cur && i < s.step) ? 'done' : cur && i === s.step ? 'now' : 'todo'}">${done || (cur && i < s.step) ? '✓' : cur && i === s.step ? '▶' : '·'} ${esc(cur && i === s.step ? R.stepText(s) : st.text)} <small>${REGIONS[st.region].name}</small></li>`).join('')}</ul>`}</div>`;
    }).join('') + '</div>';
  }
  vPets() {
    const s = this.g.s, own = Object.entries(s.pets).filter(([, l]) => l > 0);
    let html = '<p class="dim">펫은 하나만 데리고 다닐 수 있어요. 같은 펫을 또 뽑으면 레벨이 올라 효과가 세져요 (최대 Lv.5). 펫 상자는 펫 가게에서 팔아요.</p><div class="petlist">';
    html += own.map(([id, lv]) => { const p = PETS[id]; return `<div class="pet ${s.pet === id ? 'on' : ''}"><img src="${portrait('pet_' + id, 'pet', p)}" alt=""><div><b style="color:${PET_RARITY[p.rar].color}">${esc(p.name)}</b> <small>${PET_RARITY[p.rar].name} · Lv.${lv}</small><p>${esc(p.desc)}</p><p class="dim small">${statLine(petEff(id, lv))}</p></div>${s.pet === id ? '<span class="dim">함께하는 중</span>' : `<button data-pet="${id}">데려가기</button>`}</div>`; }).join('') || '<p class="dim">아직 펫이 없어요.</p>';
    html += `</div><h3>모을 수 있는 펫 (${own.length}/${Object.keys(PETS).length})</h3><div class="petdex">${Object.values(PETS).map((p) => `<span class="${s.pets[p.id] ? 'got' : ''}" style="border-color:${PET_RARITY[p.rar].color}" title="${s.pets[p.id] ? esc(p.name + ' — ' + p.desc) : '???'}">${s.pets[p.id] ? `<img src="${portrait('pet_' + p.id, 'pet', p)}" alt="">` : '?'}</span>`).join('')}</div>`;
    return html;
  }
  vMap(warp) {
    const s = this.g.s, allowed = R.allowedIdx(s), cur = this.g.A.id, qr = R.stepRegion(s);
    let html = warp ? '<p class="dim">들렀던 마을의 비석으로 순간 이동할 수 있어요.</p>' : `<p class="dim">루미나에서 오른쪽으로 계속 걸어 나가는 여정이에요. 마을 비석끼리는 순간 이동할 수 있어요.</p>`;
    html += '<div class="route">' + ORDER.map((id) => {
      const r = REGIONS[id], open = r.idx <= allowed, here = id === cur, town = r.kind === 'town', canWarp = warp && town && s.warps.includes(id) && !here;
      return `<button class="node ${town ? 'town' : r.kind} ${here ? 'here' : ''} ${open ? '' : 'lock'} ${qr === id ? 'quest' : ''}" ${canWarp ? `data-warp="${id}"` : 'disabled'}><b>${town ? '🏘️' : r.kind === 'cave' ? '🕳️' : '🌲'} ${open ? esc(r.name) : '???'}</b><small>${r.ch}장${here ? ' · 지금 여기' : ''}${qr === id ? ' · 📍퀘스트' : ''}${r.boss && s.beaten[r.boss] ? ' · 보스 ✓' : ''}${r.mid && s.beaten[r.mid] ? ' · 중간보스 ✓' : ''}</small>${canWarp ? '<em>이동 →</em>' : ''}</button>`;
    }).join('<i class="arr">›</i>') + '</div>';
    return html;
  }
  vKeys() {
    const s = this.g.s, cap = this.capturing;
    return `<p class="dim">움직임은 <b>방향키</b>만 써요. 나머지는 모두 원하는 키로 바꿀 수 있어요. 바꿀 칸을 누른 뒤 새 키를 누르세요 (이미 쓰는 키라면 서로 바뀌어요).</p>
      <div class="keys">${ACTION_ORDER.map((a) => `<div class="krow"><span>${R.ACTION_NAME[a]}${a.startsWith('slot') ? ` <small>${s.slots[+a.slice(4)] ? esc(SKILLS[s.slots[+a.slice(4)]].name) : '비어 있음'}</small>` : ''}</span><button data-bind="${a}" class="${cap === a ? 'cap' : ''}">${cap === a ? '키를 누르세요…' : keyLabel(s.keys[a])}</button></div>`).join('')}<div class="krow"><span>움직이기</span><button disabled>← ↑ → ↓</button></div><div class="krow"><span>메뉴 · 창 닫기</span><button disabled>Esc</button></div></div>
      <div class="row"><button data-keyreset>처음 설정으로</button></div>`;
  }
  vMenu() {
    const v = audio.vol;
    return `<div class="menu"><button data-x2>▶ 계속하기</button><button data-go="keys">⌨️ 단축키 설정</button>
      <div class="vol"><span>🎵 음악</span><input type="range" min="0" max="1" step="0.05" value="${v.music}" data-vol="music"></div>
      <div class="vol"><span>🔊 효과음</span><input type="range" min="0" max="1" step="0.05" value="${v.sfx}" data-vol="sfx"></div>
      <button data-sound>${audio.on ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}</button>
      <button data-go="credits">ℹ️ 만든 사람 · 출처</button><button data-save>💾 저장 (${(this.g.slot || 0) + 1}번 칸)</button><button data-title class="danger">🏠 저장하고 처음 화면으로</button></div>`;
  }
  vCredits() {
    return `<div class="credits"><p><b>매지션 스토리</b> — 만든 사람 <b>심심풀이</b></p>
      <p>주인공 · 마을 사람 · 고양이 캐럿의 바탕: <b>Pepper&amp;Carrot</b> — David Revoy, <a href="https://www.peppercarrot.com" target="_blank" rel="noopener">peppercarrot.com</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. 원작 그림을 그대로 쓰지 않고 이 게임에 맞게 새로 만들었어요.</p>
      <p>타일 · 건물 · 나무 · 사람과 몬스터 픽셀 그림: <b>Pixel Crawler</b> — Anokolisa (<a href="https://www.patreon.com/Anokolisa" target="_blank" rel="noopener">patreon.com/Anokolisa</a>). 색을 바꾸거나 옷·모자를 그려 입혀 이 게임에 맞게 고쳐 썼어요.</p>
      <p>글꼴: <b>갈무리</b> — quiple, SIL Open Font License 1.1.</p>
      <p>그리기: three.js (MIT).</p>
      <p class="dim">음악과 효과음은 모두 브라우저에서 바로 지어내요. 저장은 이 브라우저에만 남아요 (저장 칸 3개).</p></div>`;
  }
  vShop(kind) {
    const g = this.g, s = g.s, tab = this.popt.tab || 'buy';
    let html = `<div class="tabs"><button class="tab ${tab === 'buy' ? 'on' : ''}" data-tab="buy">사기</button><button class="tab ${tab === 'sell' ? 'on' : ''}" data-tab="sell">팔기</button></div>`;
    if (tab === 'buy') {
      const ids = R.shopStock(kind, s, g.A.id);
      html += '<div class="shoplist">' + ids.map((id) => {
        const it = ITEMS[id] || CONSUMABLES[id], isItem = !!ITEMS[id];
        const sub = isItem ? `${RARITY[it.rar].name} · ${SLOT_NAME[it.slot]} · Lv.${it.lv} · ${statLine(it.st)}` : it.desc || (it.kind === 'hp' ? `체력 ${it.val} 회복` : `마나 ${it.val} 회복`) + ` · 가진 것 ${s.cons[id] || 0}`;
        return `<div class="row-it"><span class="ic" style="color:${isItem ? RARITY[it.rar].color : it.color}">${isItem ? itemIcon(it) : '🧪'}</span><div><b style="color:${isItem ? RARITY[it.rar].color : '#fff'}">${esc(it.name)}</b><small>${esc(sub)}</small></div><button data-buy="${id}" ${s.gold >= it.price ? '' : 'disabled'}>${it.price.toLocaleString()}G</button>${!isItem ? `<button data-buy10="${id}" ${s.gold >= it.price * 10 ? '' : 'disabled'}>×10</button>` : ''}</div>`;
      }).join('') + '</div>';
      if (kind === 'staff' || kind === 'cloth') html += '<p class="dim">상점 장비는 기본만 팔아요. 더 좋은 장비는 대장간에서 만들거나 몬스터·보스에게서 얻어요.</p>';
    } else {
      const inv = s.inv.filter((i) => !Object.values(s.equip).includes(i.uid));
      html += '<div class="shoplist">' + inv.map((i) => { const it = ITEMS[i.id]; return `<div class="row-it"><span class="ic">${itemIcon(it)}</span><div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}${i.plus ? ` +${i.plus}` : ''}</b><small>${statLine(R.itemStats(i))}</small></div><button data-sell="${i.uid}">${R.sellPrice(i).toLocaleString()}G</button></div>`; }).join('') + '</div>';
      if (!inv.length) html += '<p class="dim">팔 장비가 없어요 (입은 장비는 팔 수 없어요)</p>';
      else html += '<div class="row"><button data-sellcommon>일반 등급 모두 팔기</button></div>';
    }
    return html;
  }
  vSmith() {
    const g = this.g, s = g.s, tab = this.popt.tab || 'enh';
    let html = `<div class="tabs"><button class="tab ${tab === 'enh' ? 'on' : ''}" data-tab="enh">⚡ 강화</button><button class="tab ${tab === 'craft' ? 'on' : ''}" data-tab="craft">🔨 제작</button></div>`;
    const have = (k) => s.mats[k] || 0;
    if (tab === 'craft') {
      const ids = R.recipesFor(g.A.id).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
      html += '<p class="dim">몬스터가 떨어뜨린 재료로 장비를 만들어요. 이 마을에서는 지금 장까지의 제작법을 쓸 수 있어요.</p><div class="shoplist">' + ids.map((id) => {
        const it = ITEMS[id], r = it.recipe, ok = R.canCraft(s, id);
        const need = Object.entries(r).filter(([k, n]) => k !== 'gold' && n > 0).map(([k, n]) => `<i class="${have(k) >= n ? 'ok' : 'no'}">${MATERIALS[k].icon}${MATERIALS[k].name} ${have(k)}/${n}</i>`).join(' ');
        return `<div class="row-it"><span class="ic" style="color:${RARITY[it.rar].color}">${itemIcon(it)}</span><div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b><small>Lv.${it.lv} · ${statLine(it.st)}</small><small class="need">${need} · <i class="${s.gold >= r.gold ? 'ok' : 'no'}">💰${r.gold.toLocaleString()}</i></small></div><button data-craft="${id}" ${ok ? '' : 'disabled'}>만들기</button></div>`;
      }).join('') + '</div>';
      return html;
    }
    // 강화
    const list = s.inv.slice().sort((a, b) => (Object.values(s.equip).includes(b.uid) ? 1 : 0) - (Object.values(s.equip).includes(a.uid) ? 1 : 0) || (b.plus || 0) - (a.plus || 0));
    const sel = this.popt.sel && s.inv.find((i) => i.uid === this.popt.sel) ? this.popt.sel : (list[0] && list[0].uid);
    html += `<div class="smith"><div class="invgrid">${list.map((i) => { const it = ITEMS[i.id], eq = Object.values(s.equip).includes(i.uid); return `<button class="it ${sel === i.uid ? 'sel' : ''} ${eq ? 'eqd' : ''}" data-sel="${i.uid}" style="border-color:${RARITY[it.rar].color}" title="${esc(it.name)}">${itemIcon(it)}${i.plus ? `<em>+${i.plus}</em>` : ''}${eq ? '<i>E</i>' : ''}</button>`; }).join('')}</div>`;
    const inst = s.inv.find((i) => i.uid === sel);
    if (inst) {
      const it = ITEMS[inst.id], p = inst.plus || 0;
      if (p >= 20) html += `<div class="enh"><b style="color:${RARITY[it.rar].color}">${esc(it.name)} +20</b><p class="gold">최고 강화예요! ✨</p></div>`;
      else {
        const e = ENHANCE[p + 1], cost = enhanceCost(it, p + 1), now = R.itemStats(inst), nxt = R.itemStats({ ...inst, plus: p + 1 });
        const ok = s.gold >= cost.gold && have('stone') >= cost.stones;
        const prot = this.popt.protect && e.breakOnFail;
        html += `<div class="enh"><div class="enhhead"><span class="big" style="border-color:${RARITY[it.rar].color}">${itemIcon(it)}</span><div><b style="color:${RARITY[it.rar].color}">${esc(it.name)}</b><div class="plus">+${p} → <b>+${p + 1}</b></div></div></div>
          <table class="enht"><tr><th>성공 확률</th><td><b class="${e.rate >= 50 ? 'ok' : 'no'}">${e.rate}%</b></td></tr>
          <tr><th>실패하면</th><td>${e.breakOnFail ? `<b class="no">${e.breakOnFail}% 확률로 부서짐</b>` : e.down ? '한 단계 내려감 (+' + Math.max(0, p - 1) + ')' : '그대로'}</td></tr>
          <tr><th>필요</th><td><i class="${s.gold >= cost.gold ? 'ok' : 'no'}">💰 ${cost.gold.toLocaleString()}G</i> · <i class="${have('stone') >= cost.stones ? 'ok' : 'no'}">🔷 강화석 ${have('stone')}/${cost.stones}</i></td></tr>
          <tr><th>능력</th><td>${Object.keys(nxt).map((k) => `${STAT_NAME[k] || k} ${now[k] || 0} → <b class="ok">${nxt[k]}</b>`).join('<br>')}</td></tr>
          <tr><th>배율</th><td>×${enhanceMul(p)} → <b>×${enhanceMul(p + 1)}</b>${ENHANCE_BONUS[p + 1] ? ` · <b class="gold">+${p + 1} 보너스: ${ENHANCE_BONUS[p + 1]}</b>` : ''}</td></tr></table>
          ${e.breakOnFail ? `<label class="prot"><input type="checkbox" data-protect ${prot ? 'checked' : ''} ${s.cons.protect > 0 ? '' : 'disabled'}> 🛡️ 강화 보호 주문서 쓰기 (가진 것 ${s.cons.protect || 0}개 · 잡화점에서 팔아요)</label>` : ''}
          <div class="row"><button class="enhbtn" data-enhance="${inst.uid}" ${ok ? '' : 'disabled'}>⚡ 강화하기</button></div>
          <p class="dim small">+1~+6은 실패해도 그대로 · +7~+11은 실패하면 한 단계 내려가요 · +12부터는 실패하면 부서질 수 있어요.</p></div>`;
      }
    } else html += '<p class="dim">강화할 장비가 없어요</p>';
    html += '</div>';
    return html;
  }
  vPetShop() {
    const s = this.g.s;
    return `<p class="dim">상자를 열면 펫이 하나 나와요. 이미 가진 펫이면 레벨이 올라요 (Lv.5인 펫이 또 나오면 값의 30%를 돌려받아요).</p><div class="boxes">${Object.entries(PET_BOXES).map(([id, b]) => `<div class="box"><div class="bic">${b.icon}</div><b>${b.name}</b><div class="odds">${b.odds.map((o, i) => o ? `<span style="color:${PET_RARITY[i].color}">${PET_RARITY[i].name} ${o}%</span>` : '').join('')}</div><button data-box="${id}" ${s.gold >= b.price ? '' : 'disabled'}>💰 ${b.price.toLocaleString()}G</button></div>`).join('')}</div>
      <h3>나올 수 있는 펫</h3><div class="petdex big">${Object.values(PETS).filter((p) => p.id !== 'carrot').map((p) => `<span class="${s.pets[p.id] ? 'got' : ''}" style="border-color:${PET_RARITY[p.rar].color}"><img src="${portrait('pet_' + p.id, 'pet', p)}" alt=""><small style="color:${PET_RARITY[p.rar].color}">${PET_RARITY[p.rar].name}</small><b>${esc(p.name)}</b><i>${esc(p.desc)}</i></span>`).join('')}</div>`;
  }

  wire(k) {
    const P = this.el.panel, g = this.g, s = g.s;
    const on = (sel, fn) => { for (const b of P.querySelectorAll(sel)) b.onclick = (e) => { e.stopPropagation(); fn(b, e); }; };
    on('[data-tab]', (b) => { this.popt = { ...this.popt, tab: b.dataset.tab, sel: null }; sfx('ui'); this.render(); });
    on('[data-sel]', (b) => { if (!b.dataset.sel) return; this.popt = { ...this.popt, sel: +b.dataset.sel }; if (k === 'bag') this.popt.tab = 'gear'; sfx('ui'); this.render(); });
    on('[data-equip]', (b) => { if (R.equip(s, +b.dataset.equip)) { sfx('item'); g.rebuildHero(); this.render(); } });
    on('[data-quick]', (b) => { const id = b.dataset.quick; s.quick[CONSUMABLES[id].kind] = id; sfx('ui'); this.render(); });
    on('[data-use]', (b) => { if (b.dataset.use === 'recall') { if (g.A.safe) return this.toast('이미 마을이에요'); this.close(); g.recall(); } else this.confirm('망각의 물약을 마시면 배운 스킬과 능력치 점수를 모두 돌려받아요. 마실까요?', () => { s.cons.forget--; R.resetPoints(s); this.refreshSlots(); sfx('heal'); this.render(); }); });
    on('[data-learn]', (b) => { const id = b.dataset.learn, r = R.learn(s, id); if (r.ok) { sfx('levelup'); this.refreshSlots(); this.render(); if (r.needTrait) this.chooseTrait(id); } else { sfx('nope'); this.toast(r.why); } });
    on('[data-trait]', (b) => this.chooseTrait(b.dataset.trait));
    on('[data-slotset]', (b) => { const [id, i] = b.dataset.slotset.split(':'); const n = +i; const prev = s.slots.indexOf(id); if (s.slots[n] === id) s.slots[n] = null; else { if (prev >= 0) s.slots[prev] = s.slots[n]; s.slots[n] = id; } sfx('ui'); this.refreshSlots(); this.render(); });
    on('[data-choose-el]', () => this.chooseElement(() => this.render()));
    on('[data-stat]', (b) => { if (s.statPts > 0) { s.statPts--; s.stats[b.dataset.stat]++; sfx('ui'); this.render(); } });
    on('[data-stat5]', (b) => { if (s.statPts >= 5) { s.statPts -= 5; s.stats[b.dataset.stat5] += 5; sfx('ui'); this.render(); } });
    on('[data-pet]', (b) => { s.pet = b.dataset.pet; g.setPet(); sfx('item'); this.render(); });
    on('[data-warp]', (b) => { const id = b.dataset.warp; this.close(); g.warpTo(id); });
    on('[data-bind]', (b) => this.capture(b.dataset.bind));
    on('[data-keyreset]', () => { s.keys = { ...R.DEFAULT_KEYS }; g.input.bind(s.keys); this.refreshSlots(); this.refreshMenus(); sfx('ui'); this.render(); });
    on('[data-go]', (b) => this.open(b.dataset.go));
    on('[data-x2]', () => this.close());
    on('[data-sound]', () => { audio.toggle(); this.render(); });
    on('[data-save]', () => { g.save(); this.toast(`💾 ${(g.slot || 0) + 1}번 칸에 저장했어요`); });
    on('[data-title]', () => { g.save(); location.reload(); });
    for (const r of P.querySelectorAll('[data-vol]')) r.oninput = () => audio.setVol(r.dataset.vol, +r.value);
    on('[data-buy]', (b) => { if (R.buy(s, b.dataset.buy)) { sfx('coin'); this.render(); } else sfx('nope'); });
    on('[data-buy10]', (b) => { let n = 0; for (let i = 0; i < 10; i++) if (R.buy(s, b.dataset.buy10)) n++; if (n) sfx('coin'); this.render(); });
    on('[data-sell]', (b) => { const gld = R.sell(s, +b.dataset.sell); if (gld) { sfx('coin'); this.render(); } });
    on('[data-sellcommon]', () => { let t = 0; for (const i of s.inv.slice()) if (ITEMS[i.id].rar === 0 && !(i.plus > 0)) t += R.sell(s, i.uid); if (t) { sfx('coin'); this.toast(`💰 +${t}G`); } this.render(); });
    on('[data-craft]', (b) => { const it = R.craft(s, b.dataset.craft); if (it) { sfx('anvil'); this.toast(`🔨 <b style="color:${RARITY[ITEMS[it.id].rar].color}">${ITEMS[it.id].name}</b>을(를) 만들었어요!`); g.onCraft(); this.render(); } });
    const pr = P.querySelector('[data-protect]'); if (pr) pr.onchange = () => { this.popt.protect = pr.checked; this.render(); };
    on('[data-enhance]', (b) => this.doEnhance(+b.dataset.enhance));
    on('[data-box]', (b) => this.doBox(b.dataset.box));
  }
  capture(action) {
    const g = this.g, s = g.s;
    this.capturing = action; this.render();
    g.input.capture = (code) => {
      this.capturing = null;
      if (code === 'Escape') { this.render(); return; }
      if (R.ARROWS.includes(code)) { this.toast('방향키는 움직이기 전용이에요'); this.render(); return; }
      const other = Object.keys(s.keys).find((a) => s.keys[a] === code && a !== action);
      if (other) s.keys[other] = s.keys[action];
      s.keys[action] = code; g.input.bind(s.keys); sfx('ui');
      this.refreshSlots(); this.refreshMenus(); this.render(); g.save();
    };
  }
  doEnhance(uid) {
    const g = this.g, s = g.s, inst = s.inv.find((i) => i.uid === uid); if (!inst) return;
    const it = ITEMS[inst.id];
    const useP = !!(this.popt.protect && ENHANCE[(inst.plus || 0) + 1].breakOnFail);
    this.modalOpen++;
    const m = this.modal(`<div class="enhanim"><div class="anvil">⚒️</div><p>${esc(it.name)} +${inst.plus || 0} → +${(inst.plus || 0) + 1}</p><div class="sparks"></div></div>`, true);
    sfx('anvil'); setTimeout(() => sfx('anvil'), 350);
    setTimeout(() => {
      const r = R.enhance(s, uid, Math.random, useP);
      m.remove(); this.modalOpen--;
      if (!r.ok) { this.toast(r.why || '강화할 수 없어요'); return; }
      if (r.result === 'success') { sfx(r.plus >= 12 ? 'legend' : 'success'); this.toast(`✨ 강화 성공! <b>${esc(it.name)} +${r.plus}</b>`); if (r.plus >= 10) this.banner(`+${r.plus} 강화 성공!`, it.name); }
      else if (r.result === 'broken') { sfx('break'); this.banner('장비가 부서졌어요…', `${it.name} +${r.plus}`); this.popt.sel = null; }
      else if (r.result === 'protected') { sfx('block'); this.toast('🛡️ 실패했지만 보호 주문서가 장비를 지켰어요'); }
      else if (r.result === 'down') { sfx('wrong'); this.toast(`실패… +${r.plus}로 내려갔어요`); }
      else { sfx('wrong'); this.toast('강화 실패… 장비는 그대로예요'); }
      g.rebuildHero(); g.onEnhance(); g.save(); this.render();
    }, 900);
  }
  doBox(id) {
    const g = this.g, s = g.s;
    const r = R.openBox(s, id, Math.random); if (!r) { sfx('nope'); return; }
    const p = PETS[r.id], col = PET_RARITY[r.rar].color;
    this.modalOpen++;
    const m = this.modal(`<div class="boxopen"><div class="giftbox">${PET_BOXES[id].icon}</div><p>두근두근…</p></div>`, true);
    sfx('box');
    setTimeout(() => {
      m.querySelector('.boxopen').innerHTML = `<div class="reveal r${r.rar}" style="--c:${col}"><img src="${portrait('pet_' + r.id, 'pet', p)}" alt=""></div><h2 style="color:${col}">${PET_RARITY[r.rar].name} · ${esc(p.name)}</h2><p>${esc(p.desc)}</p><p>${r.dup ? `이미 최고 레벨이라 ${r.refund.toLocaleString()}G를 돌려받았어요` : r.isNew ? '새 펫을 얻었어요!' : `Lv.${r.lv}로 올랐어요!`}</p><div class="row"><button data-ok>좋아요</button>${!r.dup && s.pet !== r.id ? '<button data-take>데려가기</button>' : ''}</div>`;
      sfx(r.rar >= 3 ? 'legend' : 'item');
      if (r.rar >= 4) this.banner('전설 펫!', p.name);
      const close = () => { m.remove(); this.modalOpen--; this.render(); };
      m.querySelector('[data-ok]').onclick = close;
      const tk = m.querySelector('[data-take]'); if (tk) tk.onclick = () => { s.pet = r.id; g.setPet(); close(); };
      if (!s.pet || s.pet === r.id) g.setPet();
      g.save();
    }, 1300);
  }

  // ───────── 고르기 창 ─────────
  modal(html, wide) { const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="box ${wide ? 'wide' : ''}">${html}</div>`; this.root.appendChild(d); return d; }
  confirm(msg, yes) {
    this.modalOpen++;
    const m = this.modal(`<p>${esc(msg)}</p><div class="row"><button data-y>네</button><button data-n>아니요</button></div>`);
    const end = () => { m.remove(); this.modalOpen--; this.modalEsc = null; };
    m.querySelector('[data-y]').onclick = () => { end(); yes(); }; m.querySelector('[data-n]').onclick = end; this.modalEsc = end;
  }
  chooseElement(done) {
    const s = this.g.s;
    this.modalOpen++;
    const m = this.modal(`<h2>원소 고르기</h2><p>마음을 맞출 원소를 하나 골라요 (${s.elements.length + 1}번째). 고른 원소의 스킬을 배울 수 있고, 그 원소의 특성이 늘 켜져요.</p><div class="elems"><div class="grid">${ELEMENTS.map((e) => `<button data-el="${e}" ${s.elements.includes(e) ? 'disabled' : ''} style="--c:${ELEM_COLOR[e]}"><b>${ELEM_ICON[e]} ${ELEM_NAME[e]}${s.elements.includes(e) ? ' ✓' : ''}</b><em>특성 「${ELEMENT_TRAIT[e].name}」</em><small>${ELEMENT_TRAIT[e].desc}</small><small class="sks">${Object.values(SKILLS).filter((k) => k.el === e).map((k) => k.name).join(' · ')}</small></button>`).join('')}</div></div>`, true);
    for (const b of m.querySelectorAll('[data-el]')) b.onclick = () => {
      const e = b.dataset.el; if (!R.chooseElement(s, e)) return;
      // 처음 원소를 고르면 그 원소의 첫 스킬을 배워 칸에 넣는다
      const first = `${e}_1`; if (!s.skills[first]) { s.skills[first] = 1; const i = s.slots.indexOf(null); if (i >= 0) s.slots[i] = first; }
      sfx('levelup'); m.remove(); this.modalOpen--; this.refreshSlots(); this.toast(`${ELEM_ICON[e]} ${ELEM_NAME[e]} 원소와 마음이 맞았어요! 「${SKILLS[first].name}」을(를) 익혔어요 (칸 [${keyLabel(s.keys['slot' + s.slots.indexOf(first)])}]).`);
      done && done();
    };
  }
  chooseTrait(id) {
    const s = this.g.s, sk = SKILLS[id];
    this.modalOpen++;
    const m = this.modal(`<h2>${ELEM_ICON[sk.el]} ${esc(sk.name)} — 특성 고르기</h2><p>둘 가운데 하나를 골라요. 망각의 물약으로만 다시 고를 수 있어요.</p><div class="traitpick">${sk.traits.map((t, i) => `<button data-t="${i}"><b>${i ? 'B' : 'A'} · ${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('')}</div><div class="row"><button data-later>나중에</button></div>`, true);
    const end = () => { m.remove(); this.modalOpen--; this.modalEsc = null; this.render(); };
    for (const b of m.querySelectorAll('[data-t]')) b.onclick = () => { R.chooseTrait(s, id, +b.dataset.t); sfx('levelup'); end(); };
    m.querySelector('[data-later]').onclick = end; this.modalEsc = end;
  }
  quiz(st, cb) {
    let i = 0; this.modalOpen++;
    const m = this.modal('<div class="quiz"></div>', true);
    const show = () => {
      const q = st.questions[i];
      m.querySelector('.quiz').innerHTML = `<h2>문제 ${i + 1} / ${st.questions.length}</h2><p>${esc(q.q)}</p><div class="answers">${q.a.map((a, k) => `<button data-a="${k}">${esc(a)}</button>`).join('')}</div>`;
      for (const b of m.querySelectorAll('[data-a]')) b.onclick = () => {
        if (+b.dataset.a === q.ok) { sfx('quest'); i++; if (i >= st.questions.length) { m.remove(); this.modalOpen--; cb(true); } else show(); }
        else { sfx('wrong'); m.remove(); this.modalOpen--; cb(false); }
      };
    };
    show();
  }
  ending() {
    const s = this.g.s;
    this.modalOpen++;
    const m = this.modal(`<h2>🐉 끝 — 그리고 계속</h2><p><b>${esc(s.name)}</b>, Lv.${s.lv} 익스퍼트 마법사</p><p>원소 ${s.elements.map((e) => ELEM_ICON[e]).join('')} · 쓰러뜨린 몬스터 ${s.kills.toLocaleString()} · 블링크 ${(s.flags.blinks || 0).toLocaleString()}번 · 모험 ${Math.floor(s.time / 60)}분</p><p class="dim">만든 사람 심심풀이 · 주인공과 캐럿의 바탕 Pepper&amp;Carrot (David Revoy, CC BY 4.0) · 픽셀 에셋 Pixel Crawler (Anokolisa)</p><div class="row"><button data-ok>자유 모험 계속하기</button></div>`);
    m.querySelector('[data-ok]').onclick = () => { m.remove(); this.modalOpen--; };
  }
}
