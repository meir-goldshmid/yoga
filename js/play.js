// Full-screen players: guided flow, breathing and meditation, plus the finish screen.
import { h, icon, fmt, mins, ask, confetti, ring, toast } from './ui.js';
import { figure } from './figure.js';
import { byId } from './poses.js';
import { expand, PHASE, FLOWS } from './flows.js';
import { S, update, logSession, checkBadges, week } from './store.js';
import { bell, tick, say, hush, buzz, unlock, keepAwake, ambient, stopAmbient, AMBIENT } from './audio.js';

const SIDE = { r: 'צד ימין', l: 'צד שמאל' };

function closeBtn(onclick) { return h('button', { class: 'iconbtn close', 'aria-label': 'סגירה', onclick }, icon('x')); }

/** Runs a timed loop with pause support. Calls onTick(dt seconds). Returns controller. */
function clock(onTick) {
  let last = performance.now(), paused = false, id = setInterval(() => {
    const n = performance.now(), dt = (n - last) / 1000; last = n; if (!paused) onTick(dt);
  }, 200);
  return { pause(p) { paused = p; last = performance.now(); }, get paused() { return paused; }, stop() { clearInterval(id); } };
}

// ---------------------------------------------------------------- flow player
export function playFlow(root, flow, { scale = 1, go }) {
  const steps = expand(flow.steps).map(s => ({ ...s, sec: Math.max(5, Math.round(s.sec * scale)) }));
  const total = steps.reduce((a, s) => a + s.sec, 0);
  let idx = 0, left = S().settings.prep, phase = S().settings.prep > 0 ? 'prep' : 'pose', active = 0, done = false;
  unlock(); keepAwake(true);

  const fig = figure(byId[steps[0].id].pose, { mirror: steps[0].side === 'l', cls: 'fig-big' });
  const R = 46, C = 2 * Math.PI * R;
  const timer = h('div', { class: 'p-timer', html: `<svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="${R}"/><circle class="ring-fg" cx="50" cy="50" r="${R}" stroke-dasharray="${C}"/></svg><b></b>` });
  const tArc = timer.querySelector('.ring-fg'), tNum = timer.querySelector('b');
  const nameEl = h('h2', { class: 'p-name' }), saEl = h('div', { class: 'p-sa' }), sideEl = h('div', { class: 'p-side' });
  const cueEl = h('p', { class: 'p-cue' }), nextEl = h('div', { class: 'p-next' });
  const bar = h('div', { class: 'p-bar' }, h('i')), barFill = bar.firstChild;
  const remEl = h('span', { class: 'p-rem' });
  const breath = h('div', { class: 'p-breath' }, h('span'));
  const playBtn = h('button', { class: 'iconbtn big play', 'aria-label': 'השהיה', onclick: () => toggle() }, icon('pause'));

  const view = h('div', { class: 'player tone-' + (flow.tone || 'leaf') },
    h('div', { class: 'p-top' }, closeBtn(() => quit()), h('div', { class: 'p-title' }, flow.name), remEl),
    bar,
    h('div', { class: 'p-stage' }, breath, fig.el),
    h('div', { class: 'p-info' }, sideEl, nameEl, saEl, cueEl),
    h('div', { class: 'p-controls' },
      h('button', { class: 'iconbtn', 'aria-label': 'הקודם', onclick: () => jump(idx - 1) }, icon('back')),
      timer, playBtn,
      h('button', { class: 'iconbtn', 'aria-label': 'הבא', onclick: () => jump(idx + 1) }, icon('back', 'flip'))),
    nextEl);
  root.replaceChildren(view);

  function show(announce) {
    const s = steps[idx], p = byId[s.id];
    nameEl.textContent = phase === 'prep' ? 'מתכוננות…' : p.he;
    if (phase === 'prep') nameEl.textContent = 'מתחילות עם: ' + p.he;
    saEl.textContent = p.sa;
    sideEl.textContent = s.side ? SIDE[s.side] : ''; sideEl.hidden = !s.side;
    cueEl.textContent = p.cue || '';
    const n = steps[idx + 1]; nextEl.replaceChildren(...(n ? [h('span', { class: 'muted' }, 'הבא: '), byId[n.id].he + (n.side ? ` (${SIDE[n.side]})` : '')] : [h('span', { class: 'muted' }, 'זו התנוחה האחרונה')]));
    fig.mirror(s.side === 'l'); fig.morph(p.pose, 1200);
    if (announce) { bell(.6); say(phase === 'prep' ? 'מתכוננות. ' + p.he : p.he + (s.side ? ', ' + SIDE[s.side] : '') + '. ' + (p.cue || '')); buzz(40); }
    paint();
  }
  function paint() {
    const dur = phase === 'prep' ? S().settings.prep : steps[idx].sec;
    tArc.style.strokeDashoffset = C * (1 - left / dur);
    tNum.textContent = Math.ceil(left);
    const before = steps.slice(0, idx).reduce((a, s) => a + s.sec, 0) + (phase === 'pose' ? steps[idx].sec - left : 0);
    barFill.style.width = (before / total * 100) + '%';
    remEl.textContent = fmt(total - before);
  }
  function jump(i) {
    if (i < 0) i = 0; if (i >= steps.length) return finish();
    idx = i; phase = 'pose'; left = steps[i].sec; show(true);
  }
  const ctl = clock(dt => {
    left -= dt; if (phase === 'pose') active += dt;
    if (left <= 3.05 && left > 0 && Math.ceil(left) !== Math.ceil(left + dt)) tick();
    if (left <= 0) { if (phase === 'prep') { phase = 'pose'; left = steps[idx].sec; show(true); } else jump(idx + 1); }
    else paint();
  });
  function toggle() {
    ctl.pause(!ctl.paused); view.classList.toggle('paused', ctl.paused);
    playBtn.replaceChildren(icon(ctl.paused ? 'play' : 'pause')); if (ctl.paused) hush();
  }
  async function quit() {
    if (done) return;
    if (active < 60) { cleanup(); go('#/flow/' + flow.id); return; }
    ctl.pause(true);
    const save = await ask('לסיים עכשיו?', `תרגלת ${mins(active)}. לשמור את מה שעשית?`, 'כן, לשמור', 'בלי לשמור');
    cleanup();
    if (save) finishScreen(root, { kind: 'flow', title: flow.name, ref: flow.id, minutes: active / 60, poses: posesDone(), partial: true, go });
    else go('#/flow/' + flow.id);
  }
  const posesDone = () => [...new Set(steps.slice(0, idx + 1).map(s => s.id))];
  function finish() {
    if (done) return; done = true; cleanup(); bell(1, 384);
    say('כל הכבוד. סיימת את התרגול');
    finishScreen(root, { kind: 'flow', title: flow.name, ref: flow.id, minutes: active / 60, poses: [...new Set(steps.map(s => s.id))], go });
  }
  function cleanup() { ctl.stop(); hush(); keepAwake(false); }
  show(true);
  return cleanup;
}

// ---------------------------------------------------------------- breathing
export function playBreath(root, b, { rounds, go }) {
  unlock(); keepAwake(true);
  const pat = b.pattern, cyc = pat.reduce((a, p) => a + p[1], 0);
  let round = 1, pi = 0, left = pat[0][1], elapsed = 0, done = false;
  const orb = h('div', { class: 'orb' }, h('div', { class: 'orb-core' }), h('div', { class: 'orb-ring' }));
  const lbl = h('div', { class: 'orb-label' }), cnt = h('div', { class: 'orb-count' }), rd = h('div', { class: 'muted' });
  const playBtn = h('button', { class: 'iconbtn big play', onclick: () => toggle() }, icon('pause'));
  const view = h('div', { class: 'player breathe-player' },
    h('div', { class: 'p-top' }, closeBtn(() => quit()), h('div', { class: 'p-title' }, b.name), h('span')),
    h('div', { class: 'orb-wrap' }, orb, h('div', { class: 'orb-text' }, lbl, cnt)),
    rd, h('div', { class: 'p-controls' }, playBtn));
  root.replaceChildren(view);
  function phaseStart() {
    const [k, sec] = pat[pi]; lbl.textContent = PHASE[k];
    orb.dataset.phase = k; orb.style.setProperty('--d', sec + 's');
    if (k === 'in') orb.classList.add('big'); if (k === 'out') orb.classList.remove('big');
    rd.textContent = `סבב ${round} מתוך ${rounds}`;
    say(PHASE[k]); buzz(k === 'hold' ? [15, 60, 15] : 25);
  }
  const ctl = clock(dt => {
    left -= dt; elapsed += dt; cnt.textContent = Math.max(1, Math.ceil(left));
    if (left <= 0) {
      pi++; if (pi >= pat.length) { pi = 0; round++; if (round > rounds) return finish(); }
      left = pat[pi][1]; phaseStart();
    }
  });
  function toggle() { ctl.pause(!ctl.paused); view.classList.toggle('paused', ctl.paused); playBtn.replaceChildren(icon(ctl.paused ? 'play' : 'pause')); }
  function cleanup() { ctl.stop(); hush(); keepAwake(false); }
  function finish() { if (done) return; done = true; cleanup(); bell(1); finishScreen(root, { kind: 'breath', title: b.name, ref: b.id, minutes: elapsed / 60, go }); }
  function quit() { cleanup(); if (elapsed >= 60) { done = true; finishScreen(root, { kind: 'breath', title: b.name, ref: b.id, minutes: elapsed / 60, partial: true, go }); } else go('#/breathe'); }
  bell(.5); cnt.textContent = Math.ceil(left); setTimeout(phaseStart, 50);
  return cleanup;
}

// ---------------------------------------------------------------- meditation
export function playMeditate(root, { minutes, interval, sound, go }) {
  unlock(); keepAwake(true); ambient(sound);
  const total = minutes * 60; let left = total, done = false, nextBell = interval ? interval * 60 : Infinity;
  const num = h('div', { class: 'm-time' }, fmt(left));
  const playBtn = h('button', { class: 'iconbtn big play', onclick: () => toggle() }, icon('pause'));
  const view = h('div', { class: 'player meditate-player' },
    h('div', { class: 'p-top' }, closeBtn(() => quit()), h('div', { class: 'p-title' }, 'מדיטציה'), h('span')),
    h('div', { class: 'm-orb' }, h('i'), h('i'), h('i'), num),
    h('p', { class: 'p-cue' }, 'שבי בנוחות, עצמי עיניים, ותני לנשימה לנשום את עצמה.'),
    h('div', { class: 'muted center' }, AMBIENT[sound] !== 'שקט' ? 'צליל רקע: ' + AMBIENT[sound] : ''),
    h('div', { class: 'p-controls' }, playBtn));
  root.replaceChildren(view);
  const ctl = clock(dt => {
    left -= dt; num.textContent = fmt(left);
    if (total - left >= nextBell && left > 5) { bell(.5); nextBell += interval * 60; }
    if (left <= 0) finish();
  });
  function toggle() { ctl.pause(!ctl.paused); view.classList.toggle('paused', ctl.paused); playBtn.replaceChildren(icon(ctl.paused ? 'play' : 'pause')); ctl.paused ? stopAmbient() : ambient(sound); }
  function cleanup() { ctl.stop(); stopAmbient(); keepAwake(false); }
  function finish() { if (done) return; done = true; cleanup(); bell(1); setTimeout(() => bell(.7), 2500); finishScreen(root, { kind: 'meditate', title: `מדיטציה ${minutes} דק׳`, ref: 'meditate', minutes: (total - Math.max(0, left)) / 60, go }); }
  function quit() { const el = total - left; cleanup(); if (el >= 60) { done = true; finishScreen(root, { kind: 'meditate', title: 'מדיטציה', ref: 'meditate', minutes: el / 60, partial: true, go }); } else go('#/breathe'); }
  bell(.9);
  return cleanup;
}

// ---------------------------------------------------------------- finish
const MOODS = ['😣', '😕', '😌', '😊', '🤩'];
function finishScreen(root, { kind, title, ref, minutes, poses = [], partial, go }) {
  const goalBefore = week().min >= S().settings.goalMin;
  const entry = logSession({ kind, title: title + (partial ? ' (חלקי)' : ''), ref, minutes, poses });
  const fresh = checkBadges(FLOWS.map(f => f.id));
  const goalNow = !goalBefore && week().min >= S().settings.goalMin;
  const w = week();
  let mood = null;
  const note = h('textarea', { class: 'input', rows: 2, placeholder: 'משהו שתרצי לזכור מהתרגול? (לא חובה)' });
  const moods = h('div', { class: 'moods' }, MOODS.map((m, i) => h('button', { class: 'mood', 'aria-label': 'מצב רוח ' + (i + 1), onclick: e => {
    mood = i; moods.querySelectorAll('.mood').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on');
  } }, m)));
  const save = () => {
    update(s => { const e = s.log.find(x => x.id === entry.id); if (e) { e.mood = mood; e.note = note.value.trim(); } });
    go('#/home');
  };
  root.replaceChildren(h('div', { class: 'player finish' },
    h('div', { class: 'finish-burst' }, h('div', { class: 'finish-check' }, icon('check'))),
    h('h1', {}, partial ? 'כל דקה נחשבת' : 'כל הכבוד!'),
    h('p', { class: 'lead' }, `${title} · ${minutes < 1 ? 'פחות מדקה' : Math.round(minutes) + ' דקות'}`),
    h('div', { class: 'finish-stats' },
      h('div', {}, h('b', {}, w.min), h('span', {}, 'דקות השבוע')),
      h('div', {}, ring(w.min / S().settings.goalMin, { size: 64, stroke: 7 }), h('span', {}, `יעד: ${S().settings.goalMin}`)),
      h('div', {}, h('b', {}, w.active), h('span', {}, 'ימי תרגול השבוע'))),
    goalNow && h('div', { class: 'banner gold' }, '🎯 עמדת ביעד השבועי! איזה יופי'),
    fresh.length > 0 && h('div', { class: 'new-badges' }, h('div', { class: 'muted' }, fresh.length > 1 ? 'תגים חדשים' : 'תג חדש'),
      fresh.map(b => h('div', { class: 'badge got pop' }, h('div', { class: 'b-ic' }, b.icon), h('div', {}, h('b', {}, b.name), h('small', {}, b.desc))))),
    h('h3', {}, 'איך את מרגישה?'), moods, note,
    h('button', { class: 'btn primary wide', onclick: save }, 'שמירה'),
  ));
  setTimeout(() => confetti(fresh.length || goalNow ? 160 : 90), 250);
  if (fresh.length) setTimeout(() => toast('קיבלת תג חדש: ' + fresh[0].name), 900);
}
