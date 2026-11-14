// 키보드 + 터치(가상 조이스틱·버튼)
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  Space: 'attack', KeyJ: 'attack', KeyZ: 'attack',
  Digit1: 'skill0', Digit2: 'skill1', Digit3: 'skill2', Digit4: 'skill3', Digit5: 'skill4', Digit6: 'skill5',
  KeyQ: 'hp', KeyE: 'mp', KeyF: 'talk', Enter: 'talk', KeyX: 'talk',
};
export class Input {
  constructor() {
    this.down = new Set(); this.hit = new Set(); this.joy = { x: 0, y: 0 }; this.menuKeys = [];
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const a = KEYMAP[e.code];
      if (a) { if (!this.down.has(a)) this.hit.add(a); this.down.add(a); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); }
      this.menuKeys.push(e);
    });
    addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this.down.delete(a); });
    addEventListener('blur', () => { this.down.clear(); this.joy = { x: 0, y: 0 }; });
  }
  move() {
    let x = this.joy.x, y = this.joy.y;
    if (this.down.has('left')) x -= 1; if (this.down.has('right')) x += 1; if (this.down.has('up')) y -= 1; if (this.down.has('down')) y += 1;
    return { x, y };
  }
  held(a) { return this.down.has(a); }
  pressed(a) { return this.hit.has(a); }
  endFrame() { this.hit.clear(); this.menuKeys.length = 0; }
  press(a) { this.hit.add(a); }
  hold(a, v) { if (v) { if (!this.down.has(a)) this.hit.add(a); this.down.add(a); } else this.down.delete(a); }

  bindTouch(root) {
    const stick = root.querySelector('#stick'), knob = root.querySelector('#knob');
    let id = null, ox = 0, oy = 0;
    const R = 46;
    const startT = (e) => { const t = e.changedTouches[0]; id = t.identifier; const r = stick.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; moveT(e); e.preventDefault(); };
    const moveT = (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) {
        let dx = t.clientX - ox, dy = t.clientY - oy; const l = Math.hypot(dx, dy); if (l > R) { dx = dx / l * R; dy = dy / l * R; }
        knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy = { x: Math.abs(dx) > 8 ? dx / R : 0, y: Math.abs(dy) > 8 ? dy / R : 0 };
      }
      e.preventDefault();
    };
    const endT = (e) => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; this.joy = { x: 0, y: 0 }; knob.style.transform = ''; } };
    stick.addEventListener('touchstart', startT, { passive: false });
    stick.addEventListener('touchmove', moveT, { passive: false });
    stick.addEventListener('touchend', endT); stick.addEventListener('touchcancel', endT);
    for (const b of root.querySelectorAll('[data-act]')) {
      const a = b.dataset.act;
      const on = (e) => { e.preventDefault(); this.hold(a, true); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); this.hold(a, false); b.classList.remove('on'); };
      b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
      b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
    }
  }
}
