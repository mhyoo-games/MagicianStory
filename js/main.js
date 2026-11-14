import * as R from './rules.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { HEROES } from './data/story.js';
import * as SP from './sprites.js';
import { unlock, music } from './sound.js';
import { human, CATS, cat } from './art.js';

const cv = document.getElementById('view');
const input = new Input();
const ui = new UI(document.getElementById('app'));
const game = new Game(cv, ui, input);
ui.bind(game);
input.bindTouch(document.getElementById('touch'));
window.__game = game; window.__R = R; // 개발용 (콘솔에서 살펴보기)

function resize() {
  const W = innerWidth, H = innerHeight;
  const k = Math.max(1, Math.min(5, Math.floor(Math.min(W / 420, H / 250))));
  const w = Math.ceil(W / k), h = Math.ceil(H / k);
  cv.width = w; cv.height = h; cv.style.width = `${w * k}px`; cv.style.height = `${h * k}px`;
  game.view = { w, h };
  document.body.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);
}
addEventListener('resize', resize); resize();

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  game.update(dt); game.render(); if (game.s) ui.tick(dt); input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });

// ───────── 처음 화면 ─────────
const title = document.getElementById('title');
function loadSave() { try { return R.fixSave(JSON.parse(localStorage.getItem(R.SAVE_KEY))); } catch (e) { return null; } }
function showTitle() {
  const sv = loadSave();
  const pep = SP.portraitURL({ ...HEROES.girl.look, outfit: [200, 66, 58], kind: 'dress', hat: { c: [70, 40, 60], band: [200, 66, 58] }, staff: { orb: [255, 140, 60] } }, 4);
  const crt = SP.portraitURL({ cat: 'carrot' }, 3);
  title.innerHTML = `<div class="tbox"><div class="logo"><img src="${pep}" alt=""><img src="${crt}" alt="" class="cat"><h1>매지션 스토리</h1><p>견습 마법사의 여정 · 아홉 원소와 재앙의 용</p></div>
    <div class="tbtn">${sv ? `<button id="tContinue">▶ 이어하기 <small>${sv.name} · Lv.${sv.lv} · ${sv.ch}장</small></button>` : ''}<button id="tNew">✨ 새로 시작</button></div>
    <p class="tfoot">만든 사람 심심풀이 · 그림 바탕 Pepper&amp;Carrot (David Revoy, CC BY 4.0)</p></div>`;
  title.style.display = '';
  if (sv) document.getElementById('tContinue').onclick = () => { unlock(); title.style.display = 'none'; game.start(sv); };
  document.getElementById('tNew').onclick = () => { unlock(); if (sv) ui.confirm('새로 시작하면 지금 저장이 지워져요. 괜찮아요?', newGame); else newGame(); };
}
function newGame() {
  let pick = 'girl';
  const draw = () => {
    title.innerHTML = `<div class="tbox new"><h2>주인공 만들기</h2><div class="heroes">${Object.entries(HEROES).map(([k, h]) => `<button data-h="${k}" class="${pick === k ? 'on' : ''}"><img src="${SP.portraitURL({ ...h.look, outfit: k === 'boy' ? [90, 60, 130] : [200, 66, 58], kind: k === 'boy' ? 'tunic' : 'dress', pants: [70, 60, 60] }, 4)}" alt=""><b>${h.label}</b></button>`).join('')}</div>
      <label>이름 <input id="nm" maxlength="8" value="${HEROES[pick].defName}"></label><button id="go">모험 떠나기 →</button><button id="back" class="sub">← 뒤로</button></div>`;
    for (const b of title.querySelectorAll('[data-h]')) b.onclick = () => { pick = b.dataset.h; draw(); };
    document.getElementById('back').onclick = showTitle;
    document.getElementById('go').onclick = () => {
      const name = (document.getElementById('nm').value || HEROES[pick].defName).trim().slice(0, 8) || HEROES[pick].defName;
      const s = R.newSave(name, pick);
      title.style.display = 'none'; game.start(s); game.save();
    };
  };
  draw();
}
showTitle();
