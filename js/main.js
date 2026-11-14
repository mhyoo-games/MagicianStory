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
function loadSave() { try { return R.fixSave(JSON.parse(localStorage.getItem(R.SAVE_KEY))); } catch (e) { return null; } }
const heroLook = (k) => ({ ...HEROES[k].look, shirt: k === 'girl' ? '#c8423a' : '#5a3c82', pants: k === 'girl' ? '#3a3048' : '#46403a', shoes: '#4a3426', hat: '#46283c', band: '#e3b341', robe: k === 'girl' ? '#c8423a' : '#4650a0', trim: '#e3b341', weapon: 'staff', orb: '#ff8a3a' });
function showTitle() {
  const sv = loadSave();
  const pep = portrait('title_girl', 'human', heroLook('girl')), crt = portrait('pet_carrot', 'pet', PETS.carrot);
  title.innerHTML = `<div class="tbox"><div class="logo"><img src="${pep}" alt=""><img src="${crt}" alt="" class="cat"><h1>매지션 스토리</h1><p>견습 마법사의 여정 · 아홉 원소와 재앙의 용</p></div>
    <div class="tbtn">${sv ? `<button id="tContinue">▶ 이어하기 <small>${sv.name} · Lv.${sv.lv} · ${sv.ch}장</small></button>` : ''}<button id="tNew">✨ 새로 시작</button></div>
    <p class="tfoot">만든 사람 심심풀이 · 주인공과 캐럿의 바탕 Pepper&amp;Carrot (David Revoy, CC BY 4.0) · 픽셀 에셋 Pixel Crawler (Anokolisa)</p></div>`;
  title.style.display = '';
  music.play('town_title');
  if (sv) document.getElementById('tContinue').onclick = () => { audio.unlock(); begin(sv); };
  document.getElementById('tNew').onclick = () => { audio.unlock(); if (sv) ui.confirm('새로 시작하면 지금 저장이 지워져요. 괜찮아요?', newGame); else newGame(); };
}
function newGame() {
  let pick = 'girl';
  const draw = () => {
    title.innerHTML = `<div class="tbox new"><h2>주인공 만들기</h2><div class="heroes">${Object.entries(HEROES).map(([k, h]) => `<button data-h="${k}" class="${pick === k ? 'on' : ''}"><img src="${portrait('title_' + k, 'human', heroLook(k))}" alt=""><b>${h.label}</b></button>`).join('')}</div>
      <label>이름 <input id="nm" maxlength="8" value="${HEROES[pick].defName}"></label><button id="go">모험 떠나기 →</button><button id="back" class="sub">← 뒤로</button></div>`;
    for (const b of title.querySelectorAll('[data-h]')) b.onclick = () => { pick = b.dataset.h; draw(); };
    document.getElementById('back').onclick = showTitle;
    document.getElementById('go').onclick = () => {
      const name = (document.getElementById('nm').value || HEROES[pick].defName).trim().slice(0, 8) || HEROES[pick].defName;
      begin(R.newSave(name, pick), true);
    };
  };
  draw();
}
function begin(s, fresh) {
  audio.unlock();
  title.style.display = 'none'; document.body.classList.add('ingame');
  game.start(s); if (fresh) game.save();
}

// ───────── 불러오기 ─────────
const bar = document.getElementById('loadbar');
loadImages('', (k) => { bar.style.width = Math.round(k * 100) + '%'; }).then(() => {
  document.getElementById('loading').style.display = 'none';
  requestAnimationFrame(loop);
  showTitle();
}).catch((e) => { document.getElementById('loading').innerHTML = `<p>불러오지 못했어요 😢<br><small>${String(e)}</small></p>`; });
