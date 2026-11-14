// 아주 작은 픽셀 그리기 도구. 안티앨리어싱 없이 한 칸씩 찍는다.
// 좌표 규칙은 Python PIL ImageDraw와 비슷하게(사각형·타원 상자는 양 끝 포함).

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (c === null) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; return; }
    const a = c.length > 3 ? c[3] : 255;
    if (a >= 255 || d[i + 3] === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; return; }
    // 반투명은 섞어 그린다
    const k = a / 255;
    d[i] = d[i] * (1 - k) + c[0] * k; d[i + 1] = d[i + 1] * (1 - k) + c[1] * k; d[i + 2] = d[i + 2] * (1 - k) + c[2] * k;
    d[i + 3] = Math.min(255, d[i + 3] + a);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return this.d[i + 3] ? [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]] : null;
  }
  point(x, y, c) { this.set(Math.round(x), Math.round(y), c); }
  rect(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }
  ellipse(x0, y0, x1, y1, c, outline = 0) {
    const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2;
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, v = dx * dx + dy * dy;
      if (v > 1) continue;
      if (outline) {
        const ix = (x + 0.5 - cx) / Math.max(0.5, rx - outline), iy = (y + 0.5 - cy) / Math.max(0.5, ry - outline);
        if (ix * ix + iy * iy <= 1) continue;
      }
      this.set(x, y, c);
    }
  }
  disc(cx, cy, r, c) { if (r > 0) this.ellipse(cx - r, cy - r, cx + r - 1, cy + r - 1, c); }
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const py = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= py && by > py) || (by <= py && ay > py)) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]) - 1; x++) this.set(x, y, c);
      if (xs.length === 0) continue;
    }
    // 가장자리도 한 번 그어서 얇은 꼭지가 빠지지 않게
    for (let i = 0; i < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], c);
  }
  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (w <= 1) this.set(x0, y0, c);
      else { const o = Math.floor((w - 1) / 2); this.rect(x0 - o, y0 - o, x0 - o + w - 1, y0 - o + w - 1, c); }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  path(pts, c, w = 1) { for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, w); }
  // 바깥 테두리(투명 옆 칸)를 진한 색으로
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.d[(y * this.w + x) * 4 + 3]) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  flipX() {
    const o = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const s = (y * this.w + x) * 4, t = (y * this.w + (this.w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) o.d[t + k] = this.d[s + k];
    }
    return o;
  }
  // 같은 크기로 위치만 옮겨 붙이기
  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (src.d[i + 3]) this.set(x + ox, y + oy, [src.d[i], src.d[i + 1], src.d[i + 2], src.d[i + 3]]);
    }
  }
  toCanvas() {
    const cv = makeCanvas(this.w, this.h);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.d);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

export const shade = (c, k = 0.72) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
export const tint = (c, k = 0.3) => [Math.round(c[0] + (255 - c[0]) * k), Math.round(c[1] + (255 - c[1]) * k), Math.round(c[2] + (255 - c[2]) * k)];
export const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

// 시드로 정해지는 난수 (같은 시드면 같은 그림·같은 맵)
export function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}
