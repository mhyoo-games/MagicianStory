// 입력: 움직임은 방향키(또는 터치 막대)만. 나머지는 모두 단축키 설정에서 바꿀 수 있다.
import { ARROWS } from './rules.js';

export class Input {
  constructor() {
    this.held = new Set(); this.hit = new Set(); this.keys = {}; this.capture = null; this.stick = { x: 0, y: 0 }; this.touchAct = new Set(); this.touchHeld = new Set();
    this.blocked = () => false;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (this.capture) { e.preventDefault(); const f = this.capture; this.capture = null; f(e.code); return; }
      if (ARROWS.includes(e.code) || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      if (!e.repeat) this.hit.add(e.code);
      this.held.add(e.code);
    });
    addEventListener('keyup', (e) => this.held.delete(e.code));
    addEventListener('blur', () => this.held.clear());
  }
  bind(keys) { this.keys = keys; }
  codeOf(action) { return this.keys[action]; }
  // 한 번 눌림 (이 프레임)
  pressed(action) { const c = this.keys[action]; return (c && this.hit.has(c)) || this.touchAct.has(action); }
  down(action) { const c = this.keys[action]; return (c && this.held.has(c)) || this.touchHeld.has(action); }
  rawPressed(code) { return this.hit.has(code); }
  axis() {
    let x = 0, y = 0;
    if (this.held.has('ArrowLeft')) x -= 1; if (this.held.has('ArrowRight')) x += 1;
    if (this.held.has('ArrowUp')) y -= 1; if (this.held.has('ArrowDown')) y += 1;
    if (!x && !y) { x = this.stick.x; y = this.stick.y; }
    const l = Math.hypot(x, y); return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
  endFrame() { this.hit.clear(); this.touchAct.clear(); }
  bindTouch(root) {
    const stick = root.querySelector('#stick'), knob = root.querySelector('#knob');
    let id = null, cx = 0, cy = 0;
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
    const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), R = 50; if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.stick = { x: Math.abs(dx) > 8 ? dx / R : 0, y: Math.abs(dy) > 8 ? dy / R : 0 }; };
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.stick = { x: 0, y: 0 }; };
    stick.addEventListener('pointermove', move); stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    for (const b of root.querySelectorAll('[data-act]')) this.touchBtn(b, b.dataset.act);
  }
  touchBtn(b, act) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.touchAct.add(act); this.touchHeld.add(act); b.classList.add('on'); });
    const up = () => { this.touchHeld.delete(act); b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }
}
export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  return { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt', Tab: 'Tab', Enter: 'Enter', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps' }[code] || code;
}
