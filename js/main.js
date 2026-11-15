// 시작: 에셋 불러오기 → 처음 화면 → 게임 진행 고리
import * as R from './rules.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { View } from './engine/view.js';
import { Overlay } from './engine/overlay.js';
import { loadImages } from './engine/sheets.js';
import { portrait } from './engine/portrait.js';
import { audio, music } from './audio.js';
import { HEROES } from './data/story.js';
import { PETS } from './data/pets.js';

const input = new Input();
const ui = new UI(document.getElementById('app'));
const view = new View(document.getElementById('view'));
const overlay = new Overlay(document.getElementById('ov'), view);
const game = new Game(view, overlay, ui, input);
ui.bind(game);
input.bindTouch(document.getElementById('touch'));
window.__game = game; window.__R = R; // 개발용 (콘솔에서 살펴보기)
document.body.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);

addEventListener('keydown', (e) => {
  if (!game.s || input.capture) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (ui.keyDown(e.code)) { input.hit.delete(e.code); if (e.code !== 'Escape') e.preventDefault(); }
});

let last = performance.now(), running = false;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (game.s) { game.update(dt); ui.tick(dt); overlay.draw(dt, game.overlayItems(), game.mv && game.mv.dark ? { dark: game.mv.dark, x: game.h.x, z: game.h.y } : null); }
  view.render();
  input.endFrame();
  requestAnimationFrame(loop);
}
addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });

// ───────── 처음 화면 ─────────
const title = document.getElementById('title');
function loadSave(i) { try { return R.fixSave(JSON.parse(localStorage.getItem(R.slotKey(i)))); } catch (e) { return null; } }
const heroLook = (k) => ({ ...HEROES[k].look, hat: '#46283c', band: '#e3b341', weapon: 'staff', orb: '#ff8a3a', wood: '#7a5232' });
const when = (t) => { if (!t) return ''; const d = new Date(t), p = (n) => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
function showTitle() {
  const saves = Array.from({ length: R.SAVE_SLOTS }, (_, i) => loadSave(i));
  const pep = portrait('title_girl', 'human', heroLook('girl')), crt = portrait('pet_carrot', 'pet', PETS.carrot);
  const card = (sv, i) => {
    const n = `<span class="sno">${i + 1}</span>`;
    if (!sv) return `<div class="slot empty">${n}<button data-new="${i}">✨ 새로 시작 <small>빈 저장 칸</small></button></div>`;
    const f = R.slotInfo(sv);
    return `<div class="slot">${n}<img src="${portrait('slot_' + sv.hero, 'human', heroLook(sv.hero))}" alt=""><button data-cont="${i}">▶ ${f.name} <small>Lv.${f.lv} · ${f.ch}장 · ${f.region}${f.at ? ' · ' + when(f.at) : ''}</small></button><button class="del" data-del="${i}" title="지우기">🗑</button></div>`;
  };
  title.innerHTML = `<div class="tbox"><div class="logo"><img src="${pep}" alt=""><img src="${crt}" alt="" class="cat"><h1>매지션 스토리</h1><p>견습 마법사의 여정 · 아홉 원소와 재앙의 용</p></div>
    <div class="tbtn slots">${saves.map(card).join('')}</div>
    <p class="tfoot">저장 칸은 3개 · 저장은 이 브라우저에만 남아요<br>만든 사람 심심풀이 · 주인공과 캐럿의 바탕 Pepper&amp;Carrot (David Revoy, CC BY 4.0) · 픽셀 에셋 Pixel Crawler (Anokolisa)</p></div>`;
  title.style.display = '';
  music.play('town_title');
  for (const b of title.querySelectorAll('[data-cont]')) b.onclick = () => { audio.unlock(); const i = +b.dataset.cont; begin(saves[i], false, i); };
  for (const b of title.querySelectorAll('[data-new]')) b.onclick = () => { audio.unlock(); newGame(+b.dataset.new); };
  for (const b of title.querySelectorAll('[data-del]')) b.onclick = () => {
    const i = +b.dataset.del;
    ui.confirm(`${i + 1}번 저장 칸(${saves[i].name} · Lv.${saves[i].lv})을 지울까요? 되돌릴 수 없어요.`, () => { try { localStorage.removeItem(R.slotKey(i)); } catch (e) { /* */ } showTitle(); });
  };
}
function newGame(slot) {
  let pick = 'girl';
  const draw = () => {
    title.innerHTML = `<div class="tbox new"><h2>주인공 만들기 <small>${slot + 1}번 칸</small></h2><div class="heroes">${Object.entries(HEROES).map(([k, h]) => `<button data-h="${k}" class="${pick === k ? 'on' : ''}"><img src="${portrait('title_' + k, 'human', heroLook(k))}" alt=""><b>${h.label}</b></button>`).join('')}</div>
      <label>이름 <input id="nm" maxlength="8" value="${HEROES[pick].defName}"></label><button id="go">모험 떠나기 →</button><button id="back" class="sub">← 뒤로</button></div>`;
    for (const b of title.querySelectorAll('[data-h]')) b.onclick = () => { pick = b.dataset.h; draw(); };
    document.getElementById('back').onclick = showTitle;
    document.getElementById('go').onclick = () => {
      const name = (document.getElementById('nm').value || HEROES[pick].defName).trim().slice(0, 8) || HEROES[pick].defName;
      begin(R.newSave(name, pick), true, slot);
    };
  };
  draw();
}
function begin(s, fresh, slot = 0) {
  audio.unlock();
  title.style.display = 'none'; document.body.classList.add('ingame');
  game.slot = slot; game.start(s); if (fresh) game.save();
}

// ───────── 불러오기 ─────────
const bar = document.getElementById('loadbar');
loadImages('', (k) => { bar.style.width = Math.round(k * 100) + '%'; }).then(() => {
  document.getElementById('loading').style.display = 'none';
  requestAnimationFrame(loop);
  showTitle();
}).catch((e) => { document.getElementById('loading').innerHTML = `<p>불러오지 못했어요 😢<br><small>${String(e)}</small></p>`; });
