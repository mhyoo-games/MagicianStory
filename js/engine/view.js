// 렌더러 · 카메라. 비스듬한 평행 투영: 땅(x, z)은 그대로, 높이(y)는 화면 위쪽으로 → 2D 픽셀 그림처럼 보인다.
import * as THREE from 'three';

export const PX = 16;
export class View {
  constructor(canvas) {
    this.R = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.R.outputColorSpace = THREE.SRGBColorSpace;
    this.R.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.cam = new THREE.Camera(); // 행렬을 직접 만든다
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.fxRoot = new THREE.Group(); this.scene.add(this.fxRoot);
    this.focus = new THREE.Vector3(); this.shake = 0; this.tint = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.R.setSize(w, h, false); this.W = w; this.H = h;
    // 화면에 16px 칸이 몇 배로 보일지 (정수 배율)
    this.scale = Math.max(2, Math.min(5, Math.round(Math.min(w / 430, h / 260))));
    if (w < h) this.scale = Math.max(2, Math.round(w / 230));
    this.halfW = w / (2 * PX * this.scale); this.halfH = h / (2 * PX * this.scale);
  }
  setMap(mv) {
    if (this.mv) { this.world.remove(this.mv.root); disposeDeep(this.mv.root); }
    this.mv = mv; this.world.add(mv.root);
    this.scene.background = new THREE.Color(mv.bg);
  }
  follow(x, z, dt, A) {
    const t = new THREE.Vector3(x, 0, z - 0.8);
    if (A) { const mx = Math.min(this.halfW, A.w / 2), mz = Math.min(this.halfH, A.h / 2); t.x = Math.max(mx, Math.min(A.w - mx, t.x)); t.z = Math.max(mz - 1, Math.min(A.h - mz + 0.5, t.z)); }
    this.focus.lerp(t, Math.min(1, dt * 7));
    let fx = this.focus.x, fz = this.focus.z;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * 0.5; fx += (Math.random() - 0.5) * k; fz += (Math.random() - 0.5) * k; }
    // 픽셀에 맞춰 반올림 (떨림 방지)
    const snap = 1 / (PX * this.scale); fx = Math.round(fx / snap) * snap; fz = Math.round(fz / snap) * snap;
    const sx = 1 / this.halfW, sy = 1 / this.halfH, D = 1 / 80;
    // clip.x = (x - fx) * sx ; clip.y = (-(z - fz) + y) * sy ; clip.z = -(z - fz) * D - y * D * 0.02
    const m = this.cam.projectionMatrix;
    m.set(sx, 0, 0, -fx * sx,
      0, sy, -sy, fz * sy,
      0, -D * 0.02, -D, fz * D,
      0, 0, 0, 1);
    this.cam.projectionMatrixInverse.copy(m).invert();
    this.cam.matrixWorld.identity(); this.cam.matrixWorldInverse.identity();
    this.fx = fx; this.fz = fz;
  }
  render() { this.R.render(this.scene, this.cam); }
  project(x, y, z) {
    const sx = (x - this.fx) / this.halfW, sy = (-(z - this.fz) + y) / this.halfH;
    return { x: (sx * 0.5 + 0.5) * this.W, y: (-sy * 0.5 + 0.5) * this.H, vis: Math.abs(sx) < 1.3 && Math.abs(sy) < 1.3 };
  }
  unit() { return PX * this.scale; }
}
export function disposeDeep(o) {
  o.traverse((c) => { if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose?.(); });
}
