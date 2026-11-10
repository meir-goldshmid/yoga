// All data lives in this browser's localStorage, under one key. Export/import gives a backup.
const KEY = 'yoga-gift-v1';
const DEFAULTS = {
  v: 1,
  profile: { name: '', since: null, welcomed: false },
  settings: { voice: true, sounds: true, vibrate: true, theme: 'auto', prenatal: false, shabbat: true, goalMin: 60, goalDays: 3, prep: 5 },
  log: [],          // { id, ts, kind: 'flow'|'breath'|'meditate', title, ref, minutes, poses: [], mood, note }
  custom: [],       // { id, name, steps: [[poseId, sec]] }
  favs: [],
  badges: {},       // id -> timestamp
  intention: { date: '', text: '' },
};

let state;
try { state = merge(structuredClone(DEFAULTS), JSON.parse(localStorage.getItem(KEY) || '{}')); }
catch { state = structuredClone(DEFAULTS); }

function merge(base, saved) {
  for (const k in saved) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === 'object') merge(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}
export const S = () => state;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
export function update(fn) { fn(state); save(); }

export function exportData() { return JSON.stringify(state, null, 1); }
export function importData(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.log)) throw new Error('bad');
  state = merge(structuredClone(DEFAULTS), d); save();
}
export function resetAll() { state = structuredClone(DEFAULTS); save(); }

// ---------- dates ----------
export const dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };

// ---------- stats ----------
export function minutesByDay() {
  const m = {};
  for (const e of state.log) { const k = dayKey(e.ts); m[k] = (m[k] || 0) + e.minutes; }
  return m;
}
export function streak() {
  const m = minutesByDay(); let d = new Date(), n = 0;
  const skip = x => state.settings.shabbat && x.getDay() === 6 && !m[dayKey(x)];
  if (!m[dayKey(d)]) d = addDays(d, -1);           // today not done yet doesn't break the streak
  for (let i = 0; i < 2000; i++) {
    if (skip(d)) { d = addDays(d, -1); continue; }
    if (m[dayKey(d)]) { n++; d = addDays(d, -1); } else break;
  }
  return n;
}
export function bestStreak() {
  const days = Object.keys(minutesByDay()).sort(); if (!days.length) return 0;
  const set = new Set(days); let best = 0;
  for (const k of days) {
    const prev = addDays(new Date(k + 'T12:00'), -1);
    let p = prev; if (state.settings.shabbat && p.getDay() === 6 && !set.has(dayKey(p))) p = addDays(p, -1);
    if (set.has(dayKey(p))) continue;              // not the start of a run
    let n = 0, d = new Date(k + 'T12:00');
    while (true) {
      if (set.has(dayKey(d))) { n++; d = addDays(d, 1); }
      else if (state.settings.shabbat && d.getDay() === 6) d = addDays(d, 1);
      else break;
    }
    best = Math.max(best, n);
  }
  return best;
}
export function week(offset = 0) {
  const start = addDays(weekStart(), offset * 7), m = minutesByDay();
  const days = [...Array(7)].map((_, i) => { const d = addDays(start, i); return { d, key: dayKey(d), min: Math.round(m[dayKey(d)] || 0) }; });
  return { days, min: days.reduce((s, x) => s + x.min, 0), active: days.filter(x => x.min > 0).length };
}
export function totals() {
  const min = state.log.reduce((s, e) => s + e.minutes, 0);
  const poses = new Set(state.log.flatMap(e => e.poses || []));
  return { min: Math.round(min), sessions: state.log.length, poses: poses.size, poseSet: poses };
}
export function goalWeeks() {
  // Number of completed weeks (not the current one) in which the weekly minutes goal was met.
  let n = 0; for (let i = -1; i > -60; i--) { if (week(i).min >= state.settings.goalMin) n++; } return n;
}

// ---------- badges ----------
export const BADGES = [
  { id: 'first', icon: '🌱', name: 'צעד ראשון', desc: 'התרגול הראשון', test: t => t.sessions >= 1 },
  { id: 's3', icon: '🔥', name: 'שלושה ברצף', desc: 'רצף של 3 ימים', test: t => t.best >= 3 },
  { id: 's7', icon: '🌈', name: 'שבוע מלא', desc: 'רצף של 7 ימים', test: t => t.best >= 7 },
  { id: 's21', icon: '💎', name: 'הרגל חדש', desc: 'רצף של 21 ימים', test: t => t.best >= 21 },
  { id: 'n10', icon: '🧘‍♀️', name: 'עשרה תרגולים', desc: '10 תרגולים', test: t => t.sessions >= 10 },
  { id: 'n50', icon: '🏵️', name: 'חמישים', desc: '50 תרגולים', test: t => t.sessions >= 50 },
  { id: 'm100', icon: '⏳', name: '100 דקות', desc: '100 דקות תרגול', test: t => t.min >= 100 },
  { id: 'm500', icon: '🌳', name: '500 דקות', desc: '500 דקות תרגול', test: t => t.min >= 500 },
  { id: 'm1000', icon: '👑', name: 'אלף דקות', desc: '1000 דקות תרגול', test: t => t.min >= 1000 },
  { id: 'breath', icon: '🌬️', name: 'נושמת עמוק', desc: 'תרגול נשימה ראשון', test: t => t.kinds.breath >= 1 },
  { id: 'medit', icon: '🕯️', name: 'רגע של שקט', desc: 'מדיטציה ראשונה', test: t => t.kinds.meditate >= 1 },
  { id: 'early', icon: '🌅', name: 'ציפור מוקדמת', desc: 'תרגול לפני 7:30 בבוקר', test: t => t.early },
  { id: 'night', icon: '🌙', name: 'ינשופה', desc: 'תרגול אחרי 21:30', test: t => t.late },
  { id: 'explore', icon: '🧭', name: 'חוקרת', desc: 'תרגלת 20 תנוחות שונות', test: t => t.poses >= 20 },
  { id: 'allflows', icon: '🗺️', name: 'מכירה הכל', desc: 'סיימת את כל האימונים המוכנים', test: t => t.allFlows },
  { id: 'creator', icon: '🎨', name: 'יוצרת', desc: 'בנית זרימה משלך', test: t => t.custom >= 1 },
  { id: 'goal', icon: '🎯', name: 'יעד שבועי', desc: 'עמדת ביעד השבועי', test: t => t.goalNow || t.goalWeeks >= 1 },
  { id: 'goal4', icon: '🏆', name: 'חודש של יעדים', desc: 'עמדת ביעד 4 שבועות', test: t => t.goalWeeks >= 4 },
];

export function checkBadges(flowIds) {
  const t = totals(), kinds = { flow: 0, breath: 0, meditate: 0 };
  for (const e of state.log) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const hm = e => { const d = new Date(e.ts); return d.getHours() * 60 + d.getMinutes(); };
  const done = new Set(state.log.filter(e => e.kind === 'flow').map(e => e.ref));
  const ctx = { ...t, best: bestStreak(), kinds, early: state.log.some(e => hm(e) < 450), late: state.log.some(e => hm(e) >= 1290),
    allFlows: flowIds.every(id => done.has(id)), custom: state.custom.length, goalWeeks: goalWeeks(), goalNow: week().min >= state.settings.goalMin };
  const fresh = [];
  for (const b of BADGES) if (!state.badges[b.id] && b.test(ctx)) { state.badges[b.id] = Date.now(); fresh.push(b); }
  if (fresh.length) save();
  return fresh;
}

export function logSession(entry) {
  const e = { id: Date.now().toString(36), ts: Date.now(), poses: [], ...entry, minutes: Math.max(0, Math.round(entry.minutes * 10) / 10) };
  update(s => { s.log.push(e); if (!s.profile.since) s.profile.since = e.ts; });
  return e;
}
