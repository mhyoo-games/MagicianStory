// 이펙트: 빛 알갱이 · 충격파 고리 · 바닥 경고 · 투사체 · 광선 · 번개
import * as THREE from 'three';
import { glowMat, sprite, canvasTex } from './models.js';
import { projFrames } from './sheets.js';
import { glowDot } from './mapview.js';

export const EL3 = {
  fire: ['#fff0a0', '#ffb040', '#ff5a1a'], water: ['#e0f8ff', '#6ac8ff', '#2a78e0'], ice: ['#ffffff', '#c8f0ff', '#7ac8f0'],
  wind: ['#f0fff8', '#a0f0d0', '#3ac0a0'], dark: ['#f0d0ff', '#a060f0', '#4a1a8a'], light: ['#ffffff', '#fff0a0', '#ffd040'],
  wood: ['#e0ffc0', '#8ae050', '#3a9a3a'], earth: ['#f0e0c0', '#c8a060', '#7a5a30'], time: ['#fffbe0', '#f0d080', '#a080e0'],
  arcane: ['#f8f0ff', '#c8a0ff', '#7a50e0'], enemy: ['#ffd0c0', '#ff6040', '#b01a1a'], heal: ['#f0fff0', '#8aff9a', '#3ac060'],
};

const PMAX = 4000;
export class FX {
  constructor(root) {
    this.root = root;
    // 빛 알갱이 (하나의 Points)
    const g = new THREE.BufferGeometry();
    this.pp = new Float32Array(PMAX * 3); this.pc = new Float32Array(PMAX * 3); this.ps = new Float32Array(PMAX);
    this.pv = new Float32Array(PMAX * 3); this.plife = new Float32Array(PMAX); this.pmax = new Float32Array(PMAX); this.pg = new Float32Array(PMAX); this.psz = new Float32Array(PMAX);
    g.setAttribute('position', new THREE.BufferAttribute(this.pp, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.pc, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.ps, 1));
    const tex = dotTex();
    this.pmat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 48 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'uniform float scale; attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t; }',
    });
    this.points = new THREE.Points(g, this.pmat); this.points.frustumCulled = false; root.add(this.points);
    this.pi = 0;
    this.items = []; // 고리·경고·광선 등 (각자 update)
  }
  // 알갱이 n개 뿌리기
  burst(x, y, z, n, colors, o = {}) {
    const sp = o.speed ?? 3, life = o.life ?? 0.6, size = o.size ?? 0.35, up = o.up ?? 1.5, grav = o.grav ?? -4, spread = o.spread ?? 1;
    for (let i = 0; i < n; i++) {
      const k = this.pi = (this.pi + 1) % PMAX;
      const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7) * spread;
      this.pp[k * 3] = x + (o.r ? (Math.random() - 0.5) * o.r : 0); this.pp[k * 3 + 1] = y + (o.ry ? Math.random() * o.ry : 0); this.pp[k * 3 + 2] = z + (o.r ? (Math.random() - 0.5) * o.r : 0);
      this.pv[k * 3] = Math.cos(a) * s + (o.vx || 0); this.pv[k * 3 + 1] = up * (0.4 + Math.random()); this.pv[k * 3 + 2] = Math.sin(a) * s + (o.vz || 0);
      const c = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      this.pc[k * 3] = c.r; this.pc[k * 3 + 1] = c.g; this.pc[k * 3 + 2] = c.b;
      this.plife[k] = this.pmax[k] = life * (0.6 + Math.random() * 0.6); this.pg[k] = grav; this.psz[k] = size * (0.6 + Math.random() * 0.8);
    }
  }
  trail(x, y, z, colors, size = 0.3, life = 0.35) { this.burst(x, y, z, 1, colors, { speed: 0.3, up: 0.2, grav: 0, life, size }); }
  ring(x, z, r, color, o = {}) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.op ?? 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, (o.y ?? 0.06), z); this.root.add(m);
    const dur = o.dur ?? 0.45, from = o.from ?? 0.2;
    this.items.push({ m, t: 0, dur, upd: (it, k) => { const s = r * (from + (1 - from) * easeOut(k)); m.scale.set(s, s, s); m.material.opacity = (o.op ?? 0.9) * (1 - k); } });
  }
  flash(x, y, z, color, size = 3, dur = 0.25) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y, z); this.root.add(s);
    this.items.push({ m: s, t: 0, dur, upd: (it, k) => { const sc = size * (0.5 + k); s.scale.set(sc, sc, sc); s.material.opacity = 1 - k; } });
  }
  // 바닥 경고: kind circle · line · cone. 시간이 차면 안쪽이 채워진다
  warn(o) {
    const g = new THREE.Group(); g.position.set(o.x, 0.07, o.z);
    const col = o.friendly ? '#8ad0ff' : '#ff3a2a';
    let fill, edge;
    if (o.kind === 'line') {
      const len = o.len, w = o.w;
      edge = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false }));
      fill = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false }));
      for (const m of [edge, fill]) { m.rotation.x = -Math.PI / 2; m.geometry.translate(0, len / 2, 0); }
      g.rotation.y = -o.ang - Math.PI / 2; // ang: 바닥(x, y) 평면 각도
      g.add(edge, fill);
      this.items.push({ m: g, t: 0, dur: o.dur, upd: (it, k) => { fill.scale.set(1, Math.max(0.01, k), 1); } });
    } else if (o.kind === 'cone') {
      edge = new THREE.Mesh(new THREE.CircleGeometry(o.r, 32, -o.arc / 2, o.arc), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      fill = new THREE.Mesh(new THREE.CircleGeometry(o.r, 32, -o.arc / 2, o.arc), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      for (const m of [edge, fill]) m.rotation.x = -Math.PI / 2;
      g.rotation.y = -o.ang; g.add(edge, fill);
      this.items.push({ m: g, t: 0, dur: o.dur, upd: (it, k) => { fill.scale.setScalar(Math.max(0.01, k)); } });
    } else {
      edge = new THREE.Mesh(new THREE.RingGeometry(o.r * 0.92, o.r, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false }));
      const base = new THREE.Mesh(new THREE.CircleGeometry(o.r, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, depthWrite: false }));
      fill = new THREE.Mesh(new THREE.CircleGeometry(o.r, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }));
      for (const m of [edge, base, fill]) m.rotation.x = -Math.PI / 2;
      g.add(base, edge, fill);
      this.items.push({ m: g, t: 0, dur: o.dur, follow: o.follow, upd: (it, k) => { fill.scale.setScalar(Math.max(0.01, k)); edge.material.opacity = 0.5 + Math.sin(it.t * 20) * 0.3; if (it.follow) { const p = it.follow(); if (p) g.position.set(p.x, 0.07, p.z); } } });
    }
    this.root.add(g);
    return g;
  }
  beam(x1, y1, z1, x2, y2, z2, el, w = 0.5, dur = 0.3) {
    const c = EL3[el] || EL3.arcane;
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), len = a.distanceTo(b);
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(w, w, len, 10, 1, true), glowAdd(c[2], 0.6));
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.4, len, 8, 1, true), glowAdd(c[0], 1));
    grp.add(outer, inner); grp.position.copy(a).lerp(b, 0.5);
    grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    this.root.add(grp);
    this.items.push({ m: grp, t: 0, dur, upd: (it, k) => { const s = 1 - k * 0.7; grp.scale.set(s, 1, s); outer.material.opacity = 0.6 * (1 - k); inner.material.opacity = 1 - k; } });
  }
  bolt(pts, color = '#fff6a0', dur = 0.25, w = 3) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const l1 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, linewidth: w }));
    const l2 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#8a6aff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    l2.position.y = 0.03; this.root.add(l1, l2);
    this.items.push({ m: l1, t: 0, dur, upd: (it, k) => { l1.material.opacity = 1 - k; } });
    this.items.push({ m: l2, t: 0, dur, upd: (it, k) => { l2.material.opacity = 0.6 * (1 - k); } });
  }
  pillar(x, z, el, h = 6, w = 0.9, dur = 0.5) {
    const c = EL3[el] || EL3.light;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 1.2, h, 14, 1, true), glowAdd(c[1], 0.8)); m.position.set(x, h / 2, z);
    this.root.add(m); this.items.push({ m, t: 0, dur, upd: (it, k) => { m.material.opacity = 0.8 * (1 - k); m.scale.set(1 - k * 0.6, 1, 1 - k * 0.6); } });
  }
  // 땅에서 솟는 가시 (흙·얼음·나무)
  spike(x, z, el, w = 1, dur = 0.6) {
    const colr = { earth: '#9a7a52', ice: '#c8f0ff', wood: '#4a9a3a' }[el] || '#aaaaaa';
    const m = new THREE.Mesh(el === 'ice' ? new THREE.OctahedronGeometry(0.3 * w) : new THREE.ConeGeometry(0.22 * w, 1.2 * w, 5), new THREE.MeshStandardMaterial({ color: colr, flatShading: true, roughness: el === 'ice' ? 0.1 : 0.9, emissive: el === 'ice' ? '#4a8ac0' : '#000000', emissiveIntensity: 0.3 }));
    if (el === 'ice') m.scale.set(1, 3, 1);
    m.position.set(x + (Math.random() - 0.5) * 0.3, 0, z + (Math.random() - 0.5) * 0.3); m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4); m.castShadow = true;
    this.root.add(m);
    this.items.push({ m, t: 0, dur, upd: (it, k) => { const up = k < 0.2 ? k / 0.2 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; m.position.y = (up - 1) * 1.2 * w + 0.3 * w; } });
    if (Math.random() < 0.5) this.burst(x, 0.1, z, 4, el === 'wood' ? ['#6aba4a', '#3a7a2a'] : el === 'ice' ? ['#ffffff', '#c8f0ff'] : ['#8a6a4a', '#5a4030'], { speed: 1.5, up: 3, grav: -10, size: 0.3, life: 0.5 });
  }
  // 속성별 터짐
  explode(x, z, r, el, big) {
    const c = EL3[el] || EL3.arcane;
    this.ring(x, z, r, c[1], { dur: 0.45 }); if (big) this.ring(x, z, r * 1.3, c[2], { dur: 0.7, from: 0.5 });
    this.flash(x, 0.8, z, c[1], r * 1.6, 0.3);
    const n = Math.min(80, Math.round(14 + r * 10));
    this.burst(x, 0.4, z, n, c, { speed: r * 2.2, up: 2.5, size: 0.42, life: 0.7, r: r * 0.6 });
    if (el === 'earth') this.burst(x, 0.2, z, 14, ['#8a6a4a', '#5a4030'], { speed: r * 1.5, up: 5, grav: -14, size: 0.5, life: 0.8 });
    if (el === 'ice') this.burst(x, 0.5, z, 16, ['#ffffff', '#c8f0ff'], { speed: r * 1.6, up: 3, grav: -6, size: 0.3, life: 0.9 });
    if (el === 'fire') this.burst(x, 0.3, z, 20, ['#ff8a2a', '#ffd060', '#5a2a1a'], { speed: r, up: 4, grav: 1.5, size: 0.55, life: 0.9, r });
  }
  update(dt) {
    for (let k = 0; k < PMAX; k++) {
      if (this.plife[k] <= 0) { if (this.ps[k]) this.ps[k] = 0; continue; }
      this.plife[k] -= dt;
      this.pv[k * 3 + 1] += this.pg[k] * dt;
      this.pp[k * 3] += this.pv[k * 3] * dt; this.pp[k * 3 + 1] += this.pv[k * 3 + 1] * dt; this.pp[k * 3 + 2] += this.pv[k * 3 + 2] * dt;
      if (this.pp[k * 3 + 1] < 0.02) { this.pp[k * 3 + 1] = 0.02; this.pv[k * 3 + 1] *= -0.3; }
      this.ps[k] = this.psz[k] * Math.max(0, this.plife[k] / this.pmax[k]);
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.color.needsUpdate = true;
    for (const it of this.items) { it.t += dt; it.upd(it, Math.min(1, it.t / it.dur)); }
    const dead = this.items.filter((it) => it.t >= it.dur);
    for (const it of dead) { this.root.remove(it.m); it.m.traverse?.((o) => { o.geometry?.dispose(); }); }
    this.items = this.items.filter((it) => it.t < it.dur);
  }
  clear() { for (const it of this.items) this.root.remove(it.m); this.items = []; this.plife.fill(0); }
}

// 투사체: 픽셀 그림 4장을 돌려 가며 + 뒤에 은은한 빛
export function projMesh(el, look, big = 1) {
  const c = EL3[el] || EL3.arcane, fr = projFrames(el, look || '');
  const g = new THREE.Group();
  const glow = sprite(glowDot(c[1]), { anchor: 'center', blend: 1, add: 1, scale: 1.6 * big }); glow.material.opacity = 0.55; g.add(glow);
  const s = sprite(fr[0], { anchor: 'center', scale: big }); s.position.z = 0.01; g.add(s);
  g.userData.colors = c; g.userData.tick = (t) => { s.material.map = canvasTex(fr[Math.floor(t * 12) % 4]); };
  g.userData.dir = (vx) => { s.scale.x = vx < 0 ? -1 : 1; };
  return g;
}
function glowAdd(color, op) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); }
let _dot = null;
function dotTex() {
  if (_dot) return _dot;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(cv); return _dot;
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);
