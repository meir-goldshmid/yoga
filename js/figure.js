// A side-view figure built from joint angles (forward kinematics), so any two poses can morph smoothly.
// Angle convention (degrees, absolute): 0 = down, 90 = front (right), 180 = up, -90 = back (left).
// Suffix 1 = near limb (drawn in front), 2 = far limb (drawn behind, lighter).
const L = { torso: 50, neck: 12, head: 10.5, ua: 25, fa: 23, th: 35, sh: 32, foot: 9 };
export const BASE = { t: 180, h: 180, c: 0, ua1: 4, fa1: 2, ua2: -4, fa2: -2, th1: 0, sh1: 0, th2: 0, sh2: 0 };
const W = 220, H = 190, GROUND = 174;
const KEYS = Object.keys(BASE).concat(['f1', 'f2']);
const NS = 'http://www.w3.org/2000/svg';

const rad = a => a * Math.PI / 180;
const step = (o, a, l) => [o[0] + Math.sin(rad(a)) * l, o[1] + Math.cos(rad(a)) * l];

export function full(p) {
  const q = { ...BASE, ...p };
  if (q.f1 == null) q.f1 = q.sh1 + 90;
  if (q.f2 == null) q.f2 = q.sh2 + 90;
  return q;
}

export function joints(p) {
  const q = full(p);
  const pelvis = [0, 0];
  const neck = step(pelvis, q.t, L.torso);
  const head = step(neck, q.h, L.neck + L.head);
  const sh = [pelvis[0] + (neck[0] - pelvis[0]) * .9, pelvis[1] + (neck[1] - pelvis[1]) * .9];
  const j = { pelvis, neck, head, sh };
  for (const s of [1, 2]) {
    j['e' + s] = step(sh, q['ua' + s], L.ua);
    j['w' + s] = step(j['e' + s], q['fa' + s], L.fa);
    j['k' + s] = step(pelvis, q['th' + s], L.th);
    j['a' + s] = step(j['k' + s], q['sh' + s], L.sh);
    j['t' + s] = step(j['a' + s], q['f' + s], L.foot);
  }
  // Spine curve: positive c rounds toward the back, negative arches.
  const d = [(neck[0] - pelvis[0]) / L.torso, (neck[1] - pelvis[1]) / L.torso];
  j.ctrl = [(pelvis[0] + neck[0]) / 2 + d[1] * q.c, (pelvis[1] + neck[1]) / 2 - d[0] * q.c];
  // Rest on the ground and centre horizontally.
  let maxY = head[1] + L.head, minX = head[0] - L.head, maxX = head[0] + L.head;
  for (const k in j) {
    if (k === 'ctrl' || k === 'head') continue;
    maxY = Math.max(maxY, j[k][1]); minX = Math.min(minX, j[k][0]); maxX = Math.max(maxX, j[k][0]);
  }
  const dx = W / 2 - (minX + maxX) / 2, dy = GROUND - maxY - 3;
  for (const k in j) j[k] = [j[k][0] + dx, j[k][1] + dy];
  return j;
}

const f = n => n.toFixed(1);
const line = (...pts) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L');

function paths(p) {
  const j = joints(p);
  return {
    leg2: line(j.pelvis, j.k2, j.a2, j.t2), arm2: line(j.sh, j.e2, j.w2),
    leg1: line(j.pelvis, j.k1, j.a1, j.t1), arm1: line(j.sh, j.e1, j.w1),
    torso: `M${f(j.pelvis[0])} ${f(j.pelvis[1])} Q${f(j.ctrl[0])} ${f(j.ctrl[1])} ${f(j.neck[0])} ${f(j.neck[1])}`,
    neckL: line(j.neck, j.head),
    head: j.head, shadowX: j.pelvis[0]
  };
}

/** Creates an SVG element showing the pose. Returns { el, set(pose), morph(pose, ms) }. */
export function figure(pose = {}, { mirror = false, cls = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'fig ' + cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <ellipse class="fig-shadow" cx="110" cy="${GROUND + 2}" rx="70" ry="5"/>
    <g class="fig-body">
      <path class="fig-far" data-k="leg2"/><path class="fig-far" data-k="arm2"/>
      <path class="fig-torso" data-k="torso"/><path class="fig-neck" data-k="neckL"/>
      <path class="fig-near" data-k="leg1"/>
      <circle class="fig-head" r="${L.head}"/>
      <path class="fig-near" data-k="arm1"/>
    </g>`;
  const body = svg.querySelector('.fig-body');
  if (mirror) body.setAttribute('transform', `translate(${W} 0) scale(-1 1)`);
  const els = {}; svg.querySelectorAll('[data-k]').forEach(e => els[e.dataset.k] = e);
  const headEl = svg.querySelector('.fig-head');
  let cur = full(pose), raf = 0;
  const draw = q => {
    const ps = paths(q);
    for (const k in els) els[k].setAttribute('d', ps[k]);
    headEl.setAttribute('cx', f(ps.head[0])); headEl.setAttribute('cy', f(ps.head[1]));
  };
  draw(cur);
  return {
    el: svg,
    set(p) { cancelAnimationFrame(raf); cur = full(p); draw(cur); },
    mirror(m) { m ? body.setAttribute('transform', `translate(${W} 0) scale(-1 1)`) : body.removeAttribute('transform'); },
    morph(p, ms = 1100) {
      cancelAnimationFrame(raf);
      const from = { ...cur }, to = full(p), t0 = performance.now();
      return new Promise(res => {
        const tick = now => {
          const x = Math.min(1, (now - t0) / ms), e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
          const q = {}; for (const k of KEYS) q[k] = from[k] + (to[k] - from[k]) * e;
          cur = q; draw(q);
          if (x < 1) raf = requestAnimationFrame(tick); else { cur = to; res(); }
        };
        raf = requestAnimationFrame(tick);
      });
    }
  };
}
