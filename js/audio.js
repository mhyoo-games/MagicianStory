// 소리: 모두 브라우저에서 합성 (파일 없음).
// 배경 음악은 지역마다 시드로 곡을 지어 낸다. 마을은 잔잔하게, 사냥터는 북·베이스·화음으로 신나게,
// 동굴은 어둡게, 보스는 빠르게. 곡마다 여러 마디(도입 · A · B · 쉼 · 절정)로 이어져 금방 되풀이되지 않는다.
let ac = null, master = null, mus = null, sfxBus = null, delay = null, vol = { music: 0.55, sfx: 0.7 }, on = true;
try { const v = JSON.parse(localStorage.getItem('ms_audio') || 'null'); if (v) { vol = { ...vol, ...v }; on = v.on !== false; } } catch (e) { /* */ }
function save() { try { localStorage.setItem('ms_audio', JSON.stringify({ ...vol, on })); } catch (e) { /* */ } }
function ctx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); master = ac.createGain(); master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    mus = ac.createGain(); mus.connect(comp); sfxBus = ac.createGain(); sfxBus.connect(comp);
    delay = ac.createDelay(1); const fb = ac.createGain(), wet = ac.createGain(); fb.gain.value = 0.32; wet.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(mus);
    applyVol();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function applyVol() { if (!ac) return; master.gain.value = on ? 1 : 0; mus.gain.value = vol.music * 0.5; sfxBus.gain.value = vol.sfx * 0.6; }
export const audio = {
  get on() { return on; }, get vol() { return vol; },
  toggle() { on = !on; applyVol(); save(); return on; },
  setVol(k, v) { vol[k] = v; applyVol(); save(); },
  unlock() { ctx(); },
};

// ───────── 효과음 ─────────
function tone(f, d, type = 'square', v = 0.15, slide = 0, at = 0, dest) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + d + 0.03);
}
let NB = null;
function noiseBuf(a) { if (!NB) { const len = a.sampleRate; NB = a.createBuffer(1, len, a.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; } return NB; }
function noise(d, v = 0.15, freq = 800, type = 'highpass', at = 0, dest, q = 0.7) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at, s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  s.buffer = noiseBuf(a); f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(dest || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
}
const EL_F = { fire: 330, water: 520, ice: 880, wind: 660, dark: 180, light: 990, wood: 440, earth: 150, time: 740, arcane: 600, enemy: 260 };
const last = {};
export function sfx(k, el) {
  if (!ac || !on) return;
  const now = performance.now(); if (last[k] && now - last[k] < 45) return; last[k] = now;
  const f = EL_F[el] || 600;
  switch (k) {
    case 'shoot': tone(f, 0.09, 'triangle', 0.08, f * 0.6); break;
    case 'cast': tone(f * 0.7, 0.22, 'sawtooth', 0.05, f); tone(f * 1.5, 0.16, 'sine', 0.08, 0, 0.04); noise(0.12, 0.05, 3000); break;
    case 'boom': noise(0.35, 0.22, el === 'earth' ? 300 : 900, 'lowpass'); tone(110, 0.3, 'sine', 0.25, -70); break;
    case 'bigboom': noise(0.7, 0.3, 500, 'lowpass'); tone(80, 0.6, 'sine', 0.35, -50); tone(160, 0.4, 'sawtooth', 0.06, -100); break;
    case 'zap': noise(0.16, 0.14, 2600); tone(1500, 0.12, 'square', 0.05, -1000); break;
    case 'hit': noise(0.05, 0.12, 1500); tone(240, 0.06, 'square', 0.05, -100); break;
    case 'crit': noise(0.08, 0.18, 2500); tone(900, 0.1, 'square', 0.06, -500); break;
    case 'block': tone(1800, 0.08, 'square', 0.05); tone(1200, 0.1, 'triangle', 0.05, 0, 0.03); break;
    case 'die': tone(380, 0.16, 'square', 0.06, -280); noise(0.12, 0.08, 600); break;
    case 'bossdie': for (let i = 0; i < 6; i++) { noise(0.35, 0.16, 400, 'lowpass', i * 0.13); tone(220 - i * 25, 0.35, 'sawtooth', 0.07, -100, i * 0.13); } break;
    case 'hurt': tone(170, 0.14, 'sawtooth', 0.12, -70); noise(0.08, 0.1, 400, 'lowpass'); break;
    case 'blink': tone(400, 0.14, 'sine', 0.1, 1400); noise(0.12, 0.06, 4000); break;
    case 'coin': tone(1320, 0.05, 'square', 0.04); tone(1760, 0.09, 'square', 0.04, 0, 0.05); break;
    case 'item': [660, 880, 1100, 1320].forEach((x, i) => tone(x, 0.12, 'triangle', 0.08, 0, i * 0.06)); break;
    case 'potion': tone(500, 0.22, 'sine', 0.12, 500); break;
    case 'heal': [520, 660, 780, 1040].forEach((x, i) => tone(x, 0.2, 'sine', 0.07, 0, i * 0.06)); break;
    case 'levelup': [523, 659, 784, 1047, 1319].forEach((x, i) => tone(x, 0.22, 'square', 0.06, 0, i * 0.08)); break;
    case 'quest': [784, 988, 1175, 1568].forEach((x, i) => tone(x, 0.18, 'triangle', 0.09, 0, i * 0.09)); break;
    case 'roar': noise(0.8, 0.25, 160, 'lowpass'); tone(70, 0.8, 'sawtooth', 0.14, -25); break;
    case 'warn': tone(880, 0.08, 'square', 0.04); tone(660, 0.1, 'square', 0.04, 0, 0.09); break;
    case 'puzzle': [523, 784, 1047].forEach((x, i) => tone(x, 0.16, 'sine', 0.1, 0, i * 0.05)); break;
    case 'click': tone(700, 0.05, 'square', 0.05); break;
    case 'wrong': tone(220, 0.15, 'square', 0.07); tone(180, 0.2, 'square', 0.07, 0, 0.12); break;
    case 'dead': [440, 330, 260, 196].forEach((x, i) => tone(x, 0.35, 'triangle', 0.1, -40, i * 0.22)); break;
    case 'ui': tone(900, 0.04, 'square', 0.035); break;
    case 'nope': tone(150, 0.14, 'square', 0.06); break;
    case 'talk': tone(650 + Math.random() * 250, 0.03, 'square', 0.02); break;
    case 'anvil': noise(0.2, 0.2, 3000, 'bandpass', 0, null, 4); tone(1800, 0.3, 'triangle', 0.06); break;
    case 'success': [523, 659, 784, 1047].forEach((x, i) => tone(x, 0.3, 'triangle', 0.1, 0, i * 0.07)); noise(0.4, 0.05, 6000, 'highpass', 0.25); break;
    case 'break': noise(0.6, 0.3, 1200, 'bandpass', 0, null, 1.5); [400, 300, 200].forEach((x, i) => tone(x, 0.2, 'sawtooth', 0.08, -80, i * 0.08)); break;
    case 'box': [392, 523, 659, 784, 1047, 1319].forEach((x, i) => tone(x, 0.14, 'triangle', 0.07, 0, i * 0.07)); break;
    case 'legend': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((x, i) => tone(x, 0.3, 'square', 0.05, 0, i * 0.07)); noise(1.2, 0.06, 7000, 'highpass', 0.4); break;
  }
}

// ───────── 배경 음악 ─────────
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11] };
const PROG = {
  town: [[0, 5, 3, 4], [0, 3, 5, 4], [5, 3, 0, 4], [0, 2, 3, 4], [3, 4, 2, 5]],
  field: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [5, 3, 0, 4], [0, 2, 3, 4]],
  cave: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 3, 1, 4], [0, 6, 5, 1]],
  boss: [[0, 5, 6, 4], [0, 1, 5, 4], [0, 6, 5, 6], [0, 3, 1, 4]],
};
function rngOf(str) { let a = 7; for (const c of str) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
function compose(key) {
  const style = key.startsWith('town') ? 'town' : key.startsWith('field') ? 'field' : key.startsWith('cave') ? 'cave' : 'boss';
  const r = rngOf(key + '#v2'), pick = (a) => a[Math.floor(r() * a.length)];
  const scale = SCALES[pick({ town: ['major', 'lydian', 'mixo', 'major'], field: ['dorian', 'minor', 'mixo', 'dorian'], cave: ['phryg', 'harm', 'minor'], boss: ['harm', 'phryg', 'minor'] }[style])];
  const root = { town: 60, field: 57, cave: 50, boss: 52 }[style] + Math.floor(r() * 5) - 2;
  const bpm = { town: 80 + r() * 12, field: 126 + r() * 14, cave: 92 + r() * 10, boss: 150 + r() * 12 }[style];
  const progA = pick(PROG[style]), progB = pick(PROG[style]);
  // 동기(2마디 = 16칸)를 만들고 화음에 맞춰 옮겨 쓴다
  const motif = () => {
    const out = []; const dens = { town: 0.45, field: 0.7, cave: 0.35, boss: 0.75 }[style];
    let deg = Math.floor(r() * 5);
    for (let i = 0; i < 16; i++) {
      const strong = i % 4 === 0;
      if (r() < (strong ? 0.9 : dens * (i % 2 ? 0.6 : 1))) { deg += strong ? 0 : pick([-2, -1, -1, 1, 1, 2, 3]); deg = Math.max(-2, Math.min(9, deg)); out.push({ i, deg, len: strong && r() < 0.5 ? 3 : r() < 0.3 ? 2 : 1 }); }
    }
    return out;
  };
  const mA = motif(), mB = motif(), mC = motif();
  const vary = (m, k) => m.map((n) => ({ ...n, deg: n.deg + (r() < k ? pick([-1, 1, 2]) : 0) })).filter(() => r() > k * 0.3);
  const bassPat = style === 'field' ? pick([[0, 0, 7, 0, 0, 7, 12, 7], [0, 0, 0, 12, 0, 0, 7, 10], [0, 12, 0, 7, 0, 12, 10, 7]]) : style === 'boss' ? [0, 0, 12, 0, 0, 12, 0, 7] : [0, null, null, null, 7, null, null, null];
  // 마디 구성: name, bars, 쓸 동기, 어떤 악기를 켤지
  const S = {
    town: [['A', 8, mA, 'pad arp mel'], ['A2', 8, vary(mA, 0.3), 'pad arp mel shaker'], ['B', 8, mB, 'pad bell mel'], ['C', 4, null, 'pad arp'], ['A3', 8, vary(mA, 0.5), 'pad arp mel shaker']],
    field: [['I', 4, null, 'kick hat bass'], ['A', 8, mA, 'kick snare hat bass stab mel'], ['A2', 8, vary(mA, 0.35), 'kick snare hat bass stab mel'], ['B', 8, mB, 'kick snare hat ohat bass pad mel2'], ['D', 4, null, 'pad arp'], ['F', 2, null, 'snareroll bass'], ['C', 8, mC, 'kick snare hat ohat bass stab mel crash']],
    cave: [['A', 8, null, 'drone pulse tom'], ['B', 8, mA, 'drone pulse bell tom'], ['C', 8, mB, 'drone pulse bell hat'], ['D', 4, null, 'drone']],
    boss: [['A', 8, mA, 'kick2 snare hat bass stab mel'], ['B', 8, mB, 'kick2 snare hat bass stab mel crash'], ['C', 4, null, 'kick snareroll bass'], ['A2', 8, vary(mA, 0.4), 'kick2 snare hat bass stab mel']],
  }[style];
  const bars = []; for (const [name, n, m, inst] of S) for (let b = 0; b < n; b++) bars.push({ name, m, b, inst: new Set(inst.split(' ')), prog: name.startsWith('B') ? progB : progA });
  return { style, scale, root, bpm, bars, bassPat, loopFrom: style === 'field' ? 4 : 0 };
}
const deg2midi = (S, d) => { const L = S.scale.length, o = Math.floor(d / L), k = ((d % L) + L) % L; return S.root + o * 12 + S.scale[k]; };
function mnote(t, midi, d, type, v, o = {}) {
  const a = ac, osc = a.createOscillator(), g = a.createGain();
  osc.type = type; osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); if (o.det) osc.detune.value = o.det;
  let node = osc;
  if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lpEnv) f.frequency.exponentialRampToValueAtTime(Math.max(80, o.lp * 0.25), t + d); f.Q.value = o.q || 1; osc.connect(f); node = f; }
  const at = o.att || 0.008;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + at); g.gain.setValueAtTime(v, t + Math.max(at, d * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + (o.rel || 0.05));
  node.connect(g); g.connect(mus); if (o.wet) g.connect(delay);
  osc.start(t); osc.stop(t + d + (o.rel || 0.05) + 0.05);
}
function drum(t, kind, v = 1) {
  const a = ac;
  if (kind === 'kick') { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(mus); o.start(t); o.stop(t + 0.32); return; }
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); s.buffer = noiseBuf(a);
  let d = 0.05;
  if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; d = 0.18; g.gain.setValueAtTime(0.42 * v, t); const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); og.gain.setValueAtTime(0.25 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); og.connect(mus); o.start(t); o.stop(t + 0.12); }
  else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 8000; d = 0.04; g.gain.setValueAtTime(0.14 * v, t); }
  else if (kind === 'ohat') { f.type = 'highpass'; f.frequency.value = 7000; d = 0.22; g.gain.setValueAtTime(0.12 * v, t); }
  else if (kind === 'crash') { f.type = 'highpass'; f.frequency.value = 4000; d = 1.2; g.gain.setValueAtTime(0.16 * v, t); }
  else if (kind === 'shaker') { f.type = 'bandpass'; f.frequency.value = 6000; f.Q.value = 2; d = 0.06; g.gain.setValueAtTime(0.06 * v, t); }
  else if (kind === 'tom') { const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.3); og.gain.setValueAtTime(0.4 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(og); og.connect(mus); o.start(t); o.stop(t + 0.42); return; }
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(mus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
}
function playStep(S, bar, i, t, sx) {
  const I = bar.inst, chordDeg = bar.prog[Math.floor(bar.b / 2) % 4];
  const chord = [chordDeg, chordDeg + 2, chordDeg + 4].map((d) => deg2midi(S, d));
  const pos = (bar.b % 2) * 8 + i; // 동기 안의 칸 (2마디 = 16칸, 여기서는 8분음표 기준)
  // 8분음표 칸 i: 0~7
  if (I.has('kick') && (i === 0 || i === 4 || (S.style === 'field' && i === 6 && bar.b % 2))) drum(t, 'kick');
  if (I.has('kick2') && i % 2 === 0) drum(t, 'kick', 0.85);
  if (I.has('kick2')) drum(t + sx / 2, 'kick', i % 2 ? 0.5 : 0);
  if (I.has('snare') && (i === 2 || i === 6)) drum(t, 'snare');
  if (I.has('snareroll')) { drum(t, 'snare', 0.3 + (i / 8) * 0.7); drum(t + sx / 2, 'snare', 0.25 + (i / 8) * 0.6); }
  if (I.has('hat')) { drum(t, 'hat', i % 2 ? 0.7 : 1); if (S.style !== 'cave') drum(t + sx / 2, 'hat', 0.45); }
  if (I.has('ohat') && i % 2 === 1) drum(t, 'ohat');
  if (I.has('crash') && i === 0 && bar.b === 0) drum(t, 'crash');
  if (I.has('shaker')) { drum(t, 'shaker'); drum(t + sx / 2, 'shaker', 0.6); }
  if (I.has('tom') && (i === 0 || (i === 5 && bar.b % 2))) drum(t, 'tom', 0.7);
  const rootM = deg2midi(S, chordDeg) - 24;
  if (I.has('bass')) { const b = S.bassPat[i]; if (b != null) mnote(t, rootM + b, sx * 0.9, 'sawtooth', 0.11, { lp: 700, lpEnv: 1, q: 4 }); }
  if (I.has('pulse')) mnote(t, rootM + (i % 4 === 3 ? 7 : 0), sx * 0.8, 'triangle', 0.1, { lp: 500 });
  if (I.has('drone') && i === 0 && bar.b % 2 === 0) { mnote(t, rootM, sx * 16, 'sawtooth', 0.05, { lp: 260, att: 1.2, rel: 0.8 }); mnote(t, rootM + 7, sx * 16, 'sine', 0.05, { att: 1.5, rel: 0.8 }); }
  if (I.has('pad') && i === 0 && bar.b % 2 === 0) for (const m of chord) { mnote(t, m, sx * 15.5, 'triangle', 0.035, { att: 0.5, rel: 0.6 }); mnote(t, m + 12, sx * 15.5, 'sine', 0.02, { att: 0.8, rel: 0.6, det: 6 }); }
  if (I.has('stab') && (i === 1 || i === 3 || i === 6)) for (const m of chord) mnote(t, m, sx * 0.5, 'sawtooth', 0.03, { lp: 2400, lpEnv: 1 });
  if (I.has('arp')) { const m = chord[(i + bar.b) % 3] + (i >= 4 ? 12 : 0); mnote(t, m, sx * 1.4, 'sine', 0.045, { wet: 1 }); }
  if (I.has('bell') && (i === 0 || i === 3 || i === 6)) mnote(t, chord[(i / 3 + bar.b) % 3] + 24, sx * 3, 'sine', 0.04, { wet: 1, rel: 0.6 });
  if (bar.m && (I.has('mel') || I.has('mel2'))) {
    for (const n of bar.m) if (n.i === pos) {
      const m = deg2midi(S, n.deg + chordDeg % 2) + 12 + (I.has('mel2') ? 12 : 0);
      const type = S.style === 'town' ? 'triangle' : S.style === 'cave' ? 'sine' : 'square';
      mnote(t, m, sx * n.len * 0.95, type, S.style === 'town' ? 0.075 : 0.05, { lp: S.style === 'town' ? 3000 : 3600, wet: S.style !== 'boss' ? 1 : 0, rel: 0.1 });
      if (S.style === 'field' || S.style === 'boss') mnote(t, m - 12, sx * n.len * 0.9, 'sawtooth', 0.02, { lp: 1600 });
    }
  }
}
let song = null, songKey = null, timer = null, nextT = 0, barI = 0, stepI = 0, fade = null;
export const music = {
  play(key) {
    if (songKey === key) return; songKey = key;
    const a = ctx(); if (!a) return;
    if (fade) clearTimeout(fade);
    mus.gain.cancelScheduledValues(a.currentTime); mus.gain.setValueAtTime(mus.gain.value, a.currentTime); mus.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.5);
    fade = setTimeout(() => {
      song = compose(key); barI = 0; stepI = 0; nextT = a.currentTime + 0.1;
      mus.gain.cancelScheduledValues(a.currentTime); mus.gain.setValueAtTime(0.0001, a.currentTime); mus.gain.linearRampToValueAtTime(vol.music * 0.5, a.currentTime + 1.2);
      if (!timer) timer = setInterval(tick, 30);
    }, 520);
  },
  stop() { songKey = null; song = null; },
  get key() { return songKey; },
};
function tick() {
  if (!ac || !song || ac.state !== 'running') return;
  const sx = 60 / song.bpm / 2; // 8분음표
  while (nextT < ac.currentTime + 0.18) {
    const bar = song.bars[barI];
    if (on && vol.music > 0) playStep(song, bar, stepI, nextT, sx);
    nextT += sx * (song.style === 'town' ? (stepI % 2 ? 0.9 : 1.1) : 1);
    stepI++; if (stepI >= 8) { stepI = 0; barI++; if (barI >= song.bars.length) barI = song.loopFrom; }
  }
}
