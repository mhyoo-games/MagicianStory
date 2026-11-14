// 픽셀 캐릭터를 화면에 세우기: 시트 한 장(atlas)을 판 하나에 붙이고 프레임마다 그림 자리만 옮긴다.
// 1칸 = 16px = 1m. 판은 땅에 수직으로 서 있고(x·높이 평면), 카메라가 비스듬히 보여 준다.
import * as THREE from 'three';
import { heroSet, monsterSet, npcSet, petSet, cv } from './sheets.js';

export const PX = 16;
const M = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!M.has(key)) M.set(key, new THREE.MeshBasicMaterial({ color, transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null || o.op > 0.8 }));
  return M.get(key);
}
export function glowMat(color, op = 1) { const key = 'glow' + color + op; if (!M.has(key)) M.set(key, new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: op >= 1 })); return M.get(key); }
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
const G = {
  sph: (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h), box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
  cyl: (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s), cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d), dod: (r) => new THREE.DodecahedronGeometry(r, 0), oct: (r) => new THREE.OctahedronGeometry(r, 0),
  tor: (r, t, a = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 20, a), cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 12),
};
export { mesh, G };

const TEX = new WeakMap();
export function canvasTex(c) {
  if (TEX.has(c)) return TEX.get(c);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  TEX.set(c, t); return t;
}
// 그림 한 장을 세운 판. anchor: 'bottom'(발끝이 자리) · 'center' · 'flat'(땅에 눕힘)
export function sprite(c, o = {}) {
  const w = c.width / PX * (o.scale || 1), h = c.height / PX * (o.scale || 1);
  const geo = new THREE.PlaneGeometry(w, h);
  if (o.flat) geo.rotateX(-Math.PI / 2);
  else if (o.anchor !== 'center') geo.translate(0, h / 2 - (o.sink || 0), 0);
  const m = new THREE.MeshBasicMaterial({ map: canvasTex(c), alphaTest: o.blend ? 0 : 0.5, transparent: !!o.blend, depthWrite: !o.blend, side: THREE.DoubleSide, opacity: o.op ?? 1, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const s = new THREE.Mesh(geo, m); s.userData.w = w; s.userData.h = h;
  return s;
}
let SHADOW = null;
export function shadowMesh(r = 0.4) {
  if (!SHADOW) { const c = cv(32, 16), g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(16, 8, 15, 7, 0, 0, Math.PI * 2); g.fill(); SHADOW = c; }
  const s = sprite(SHADOW, { flat: 1, blend: 1, scale: r / 0.9 }); s.position.y = 0.01; s.renderOrder = -1; return s;
}

const SPEED = { idle: 6, walk: 9, run: 12, hit: 10, death: 10 };
export class Actor {
  constructor(set, o = {}) {
    this.set = set; this.k = o.scale ?? set.scale ?? 1;
    this.root = new THREE.Group();
    const S = set.S, tex = canvasTex(set.atlas).clone(); tex.needsUpdate = true;
    tex.repeat.set(1 / set.cols, 1 / set.rows); this.tex = tex;
    const geo = new THREE.PlaneGeometry(S / PX, S / PX); geo.translate((S / 2 - set.ax) / PX, (set.ay - S / 2) / PX, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: !!set.ghost, opacity: set.ghost ? 0.72 : 1, depthWrite: true });
    this.body = new THREE.Mesh(geo, this.mat); this.body.scale.setScalar(this.k);
    this.shadow = o.noShadow ? null : shadowMesh(0.32 * this.k + 0.12);
    if (this.shadow) this.root.add(this.shadow);
    this.root.add(this.body);
    this.H = (set.ay - set.top) / PX * this.k;
    this.base = new THREE.Color(1, 1, 1); this.cur = 'idle'; this.dir = set.sideOnly ? 'side' : 'down'; this.flip = false; this.fi = 0; this.ft = 0; this.once = null; this.castT = 0; this.flashOn = false;
    this.frame(this.list()[0]);
  }
  list() { const a = this.set.anims[this.cur] || this.set.anims.idle; return a[this.dir] || a.side || a.down; }
  frame(i) { const c = this.set.cols, r = this.set.rows; this.tex.offset.set((i % c) / c, 1 - (Math.floor(i / c) + 1) / r); }
  face(a) {
    const dx = Math.cos(a), dy = Math.sin(a);
    if (this.set.sideOnly || Math.abs(dx) > Math.abs(dy) * 0.85) { this.dir = 'side'; if (Math.abs(dx) > 0.15) this.flip = dx < 0; }
    else this.dir = dy > 0 ? 'down' : 'up';
    const left = this.dir === 'side' && this.flip;
    this.body.scale.x = this.k * ((this.set.faceLeft ? !left : left) ? -1 : 1);
  }
  play(name) { if (this.once) return; if (name !== this.cur && this.set.anims[name]) { this.cur = name; this.fi = 0; this.ft = 0; } }
  playOnce(name, done) { if (!this.set.anims[name]) { done && done(); return; } this.cur = name; this.fi = 0; this.ft = 0; this.once = done || (() => {}); }
  update(dt, t, st = {}) {
    if (!this.once) this.play(st.moving ? (st.slow ? 'walk' : 'run') : 'idle');
    const l = this.list();
    this.ft += dt * (SPEED[this.cur] || 8) * (st.rate || 1);
    while (this.ft >= 1) { this.ft -= 1; this.fi++; if (this.fi >= l.length) { if (this.once) { const f = this.once; this.once = null; this.fi = l.length - 1; f(); if (this.cur === 'death') { this.fi = l.length - 1; this.ft = -999; } } else this.fi = 0; } }
    this.frame(l[Math.min(this.fi, l.length - 1)]);
    this.body.position.y = (st.lift || 0) + (st.flying ? 1.6 + Math.sin(t * 3) * 0.15 : 0);
    if (this.castT > 0) { this.castT -= dt; this.mat.color.setRGB(1.5, 1.3, 1.9); } else if (!this.flashOn) this.mat.color.copy(this.base);
  }
  cast() { this.castT = 0.18; }
  flash(on) { this.flashOn = on; if (on) this.mat.color.setRGB(4, 4, 4); else this.mat.color.copy(this.base); }
  tint(hexc) { this.base.set(hexc); this.mat.color.copy(this.base); }
}

export function makeHuman(look) { return new Actor(heroSet(look)); }
export function makeCreature(model, id = null) {
  const set = monsterSet(id || ('art_' + JSON.stringify(model)), model);
  return new Actor(set, { scale: set.scale });
}
export function makeNpc(id, look) { return new Actor(npcSet(id, look)); }
export function makePet(p) { return new Actor(petSet(p)); }
