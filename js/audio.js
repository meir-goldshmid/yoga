// Sounds are synthesised with Web Audio, so nothing needs downloading and everything works offline.
import { S } from './store.js';

let ctx;
const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
export const unlock = () => { try { ac(); } catch {} };

/** Singing-bowl style bell: a few inharmonic partials with long decay. */
export function bell(strength = 1, base = 432) {
  if (!S().settings.sounds) return;
  try {
    const c = ac(), now = c.currentTime, out = c.createGain();
    out.gain.value = 0.22 * strength; out.connect(c.destination);
    [[1, 1, 4.5], [2.71, .45, 3], [5.1, .2, 2], [0.5, .25, 5]].forEach(([r, g, d]) => {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = base * r;
      v.gain.setValueAtTime(0, now); v.gain.linearRampToValueAtTime(g, now + .01); v.gain.exponentialRampToValueAtTime(.0001, now + d);
      o.connect(v).connect(out); o.start(now); o.stop(now + d + .1);
    });
  } catch {}
}
export function tick() {
  if (!S().settings.sounds) return;
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain(), n = c.currentTime;
    o.frequency.value = 880; g.gain.setValueAtTime(.08, n); g.gain.exponentialRampToValueAtTime(.0001, n + .12);
    o.connect(g).connect(c.destination); o.start(n); o.stop(n + .15);
  } catch {}
}
export function buzz(p = 30) { if (S().settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch {} }

// ---------- speech ----------
let heVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  heVoice = vs.find(v => /^he|^iw/i.test(v.lang) && /female|carmit|hila|google/i.test(v.name)) || vs.find(v => /^he|^iw/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export const hasHebrewVoice = () => !!heVoice;
export function say(text) {
  if (!S().settings.voice || !('speechSynthesis' in window) || !heVoice) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = heVoice; u.lang = heVoice.lang; u.rate = .92; u.pitch = 1.05; speechSynthesis.speak(u); } catch {}
}
export const hush = () => { try { speechSynthesis.cancel(); } catch {} };

// ---------- ambient soundscapes ----------
let amb = null;
export const AMBIENT = { none: 'שקט', ocean: 'גלים', rain: 'גשם', bowl: 'צליל עמוק' };
function noise(c) {
  const b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0);
  let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } // brown-ish noise
  const s = c.createBufferSource(); s.buffer = b; s.loop = true; return s;
}
export function ambient(kind) {
  stopAmbient(); if (kind === 'none' || !kind) return;
  try {
    const c = ac(), master = c.createGain(); master.gain.value = 0; master.connect(c.destination);
    master.gain.linearRampToValueAtTime(kind === 'bowl' ? .07 : .35, c.currentTime + 3);
    const nodes = [];
    if (kind === 'ocean' || kind === 'rain') {
      const n = noise(c), f = c.createBiquadFilter(); f.type = kind === 'rain' ? 'highpass' : 'lowpass'; f.frequency.value = kind === 'rain' ? 900 : 500;
      const g = c.createGain(); g.gain.value = kind === 'rain' ? .5 : .7; n.connect(f).connect(g).connect(master); n.start(); nodes.push(n);
      if (kind === 'ocean') { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .09; lg.gain.value = .55; lfo.connect(lg).connect(g.gain); lfo.start(); nodes.push(lfo); }
    } else {
      [110, 165, 220.5].forEach((fq, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = fq; g.gain.value = [.5, .25, .15][i]; o.connect(g).connect(master); o.start(); nodes.push(o); });
    }
    amb = { master, nodes };
  } catch {}
}
export function stopAmbient() {
  if (!amb) return; const { master, nodes } = amb; amb = null;
  try { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.2); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch {} }), 1400); } catch {}
}

// ---------- screen wake lock ----------
let lock = null, wantLock = false;
export async function keepAwake(on) {
  wantLock = on;
  try {
    if (on && 'wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => lock = null); }
    if (!on && lock) { await lock.release(); lock = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (wantLock && document.visibilityState === 'visible') keepAwake(true); });
