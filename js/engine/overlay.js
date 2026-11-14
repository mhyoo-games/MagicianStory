// 3D 화면 위에 겹치는 2D 그림: 피해 숫자 · 체력 막대 · 이름표 · 머리 위 표시
export class Overlay {
  constructor(canvas, view) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.view = view; this.nums = [];
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() { const k = Math.min(2, devicePixelRatio || 1); this.k = k; this.cv.width = innerWidth * k; this.cv.height = innerHeight * k; this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px'; }
  num(x, y, z, text, color = '#fff', big = false) { this.nums.push({ x, y, z, text: String(text), color, big, t: 0, dx: (Math.random() - 0.5) * 24 }); if (this.nums.length > 90) this.nums.shift(); }
  draw(dt, items, light) {
    const g = this.g, k = this.k, V = this.view;
    g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
    if (light && light.dark > 0) { // 동굴: 주인공 둘레만 밝게
      const p = V.project(light.x, 1, light.z), u = V.unit(), r = u * 7.5;
      const gr = g.createRadialGradient(p.x, p.y, u * 1.5, p.x, p.y, r);
      gr.addColorStop(0, 'rgba(8,4,14,0)'); gr.addColorStop(0.6, `rgba(8,4,14,${light.dark * 0.45})`); gr.addColorStop(1, `rgba(8,4,14,${light.dark})`);
      g.fillStyle = gr; g.fillRect(0, 0, innerWidth, innerHeight);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const it of items) {
      const p = V.project(it.x, it.h, it.z); if (!p.vis) continue;
      if (it.bar != null) {
        const w = it.w || 40; g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, 6);
        g.fillStyle = it.color || '#e8453c'; g.fillRect(p.x - w / 2, p.y, w * Math.max(0, Math.min(1, it.bar)), 4);
        if (it.lv) { g.font = '10px Galmuri9, monospace'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(it.lv, p.x - w / 2 - 12, p.y + 2); g.fillText(it.lv, p.x - w / 2 - 12, p.y + 2); }
        if (it.st) { g.font = '11px sans-serif'; g.fillText(it.st, p.x, p.y - 9); }
      }
      if (it.label) {
        g.font = (it.big ? 'bold 14px' : '12px') + ' Galmuri11, sans-serif'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,6,20,.9)'; g.strokeText(it.label, p.x, p.y); g.fillStyle = it.color || '#fff'; g.fillText(it.label, p.x, p.y);
      }
      if (it.mark) {
        const bob = Math.sin(performance.now() / 220) * 3;
        g.font = 'bold 22px Galmuri11, sans-serif'; g.lineWidth = 5; g.strokeStyle = '#2a1a00'; g.strokeText(it.mark, p.x, p.y - 14 + bob); g.fillStyle = it.mcolor || '#ffd23f'; g.fillText(it.mark, p.x, p.y - 14 + bob);
      }
    }
    for (const n of this.nums) {
      n.t += dt; const p = V.project(n.x, n.y, n.z); if (!p.vis) continue;
      const a = Math.max(0, 1 - Math.max(0, n.t - 0.5) / 0.4), up = n.t * 46, pop = n.t < 0.12 ? 1 + (0.12 - n.t) * 5 : 1;
      g.globalAlpha = a;
      g.font = `bold ${Math.round((n.big ? 24 : 16) * pop)}px Galmuri11, sans-serif`;
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(n.text, p.x + n.dx * n.t * 2, p.y - up); g.fillStyle = n.color; g.fillText(n.text, p.x + n.dx * n.t * 2, p.y - up);
      g.globalAlpha = 1;
    }
    this.nums = this.nums.filter((n) => n.t < 0.9);
  }
}
