// 소리는 모두 브라우저에서 합성 (파일 없음)
let ac = null, master = null, musicGain = null, on = true;
try { on = localStorage.getItem('ms_sound') !== 'off'; } catch (e) { /* */ }
function ctx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function soundOn() { return on; }
export function toggleSound() { on = !on; try { localStorage.setItem('ms_sound', on ? 'on' : 'off'); } catch (e) { /* */ } if (master) master.gain.value = on ? 0.5 : 0; return on; }
export function unlock() { ctx(); if (master) master.gain.value = on ? 0.5 : 0; }

function tone(f, d, type = 'square', vol = 0.15, slide = 0, delay = 0) {
  const a = ctx(); if (!a || !on) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, vol = 0.15, hp = 800, delay = 0) {
  const a = ctx(); if (!a || !on) return;
  const t = a.currentTime + delay, len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp; s.buffer = buf; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const EL_F = { fire: 330, water: 520, ice: 880, wind: 660, dark: 180, light: 990, wood: 440, earth: 150, time: 740, arcane: 600 };
let last = {};
export function sfx(k, el) {
  const now = performance.now(); if (last[k] && now - last[k] < 40) return; last[k] = now;
  const f = EL_F[el] || 600;
  switch (k) {
    case 'shoot': tone(f, 0.08, 'square', 0.05, f * 0.5); break;
    case 'cast': tone(f * 0.8, 0.18, 'triangle', 0.12, f); tone(f * 1.2, 0.12, 'sine', 0.06, 0, 0.05); break;
    case 'boom': noise(0.25, 0.14, el === 'earth' ? 200 : 600); tone(90, 0.25, 'sine', 0.15, -40); break;
    case 'hit': tone(220, 0.05, 'square', 0.06, -80); break;
    case 'die': tone(400, 0.15, 'square', 0.07, -300); break;
    case 'bossdie': for (let i = 0; i < 5; i++) { noise(0.3, 0.12, 300, i * 0.12); tone(200 - i * 30, 0.3, 'sawtooth', 0.08, -100, i * 0.12); } break;
    case 'hurt': tone(160, 0.12, 'sawtooth', 0.1, -60); break;
    case 'coin': tone(1200, 0.05, 'square', 0.05); tone(1600, 0.08, 'square', 0.05, 0, 0.05); break;
    case 'item': [660, 880, 1100].forEach((x, i) => tone(x, 0.1, 'triangle', 0.08, 0, i * 0.07)); break;
    case 'potion': tone(500, 0.2, 'sine', 0.1, 400); break;
    case 'heal': [520, 660, 780].forEach((x, i) => tone(x, 0.15, 'sine', 0.08, 0, i * 0.06)); break;
    case 'levelup': [523, 659, 784, 1047].forEach((x, i) => tone(x, 0.18, 'square', 0.08, 0, i * 0.09)); break;
    case 'quest': [784, 988, 1175].forEach((x, i) => tone(x, 0.16, 'triangle', 0.1, 0, i * 0.1)); break;
    case 'roar': noise(0.6, 0.18, 120); tone(80, 0.6, 'sawtooth', 0.12, -30); break;
    case 'zap': noise(0.15, 0.12, 2000); tone(1400, 0.1, 'square', 0.05, -900); break;
    case 'dead': [400, 300, 200].forEach((x, i) => tone(x, 0.3, 'triangle', 0.1, -50, i * 0.2)); break;
    case 'ui': tone(880, 0.04, 'square', 0.04); break;
    case 'nope': tone(150, 0.12, 'square', 0.06); break;
    case 'talk': tone(700 + Math.random() * 200, 0.03, 'square', 0.025); break;
  }
}

// 아주 단순한 배경 음악 (지역 분위기별 반복 선율)
const SONGS = {
  town: { bpm: 96, scale: [0, 2, 4, 7, 9], root: 60, wave: 'triangle' },
  field: { bpm: 112, scale: [0, 2, 4, 5, 7, 9, 11], root: 57, wave: 'square' },
  dungeon: { bpm: 84, scale: [0, 2, 3, 5, 7, 8, 10], root: 50, wave: 'triangle' },
  boss: { bpm: 140, scale: [0, 1, 3, 5, 7, 8, 10], root: 45, wave: 'sawtooth' },
};
let cur = null, timer = null, step = 0, seed = 1;
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
export const music = {
  play(kind, theme) {
    const key = kind + theme; if (cur === key) return; cur = key;
    if (timer) clearInterval(timer);
    const S = SONGS[kind]; seed = [...key].reduce((a, c) => a + c.charCodeAt(0) * 7, 11);
    const mel = Array.from({ length: 16 }, () => (rnd() < 0.18 ? null : S.scale[Math.floor(rnd() * S.scale.length)] + (rnd() < 0.25 ? 12 : 0)));
    const bass = [0, 0, 5, 7].map((x) => x - 12);
    step = 0;
    const beat = 60 / S.bpm / 2;
    timer = setInterval(() => {
      const a = ac; if (!a || !on || a.state !== 'running') return;
      const t = a.currentTime;
      const n = mel[step % 16];
      const note = (m, d, w, v) => { const o = a.createOscillator(), g = a.createGain(); o.type = w; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + d + 0.02); };
      if (n !== null) note(S.root + 12 + n, beat * 1.6, S.wave, 0.06);
      if (step % 4 === 0) note(S.root + bass[(step / 4) % 4], beat * 3.5, 'triangle', 0.09);
      if (kind === 'boss' && step % 2 === 0) note(S.root - 12, beat * 0.5, 'square', 0.04);
      step++;
    }, beat * 1000);
  },
  stop() { if (timer) clearInterval(timer); timer = null; cur = null; },
};
