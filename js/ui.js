// Small DOM helpers, icons, modal sheet, toast and confetti.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z',
  flows: 'M4 6h16M4 12h10M4 18h13',
  poses: 'M12 4.5a2 2 0 110 .01M5 9l7 2 7-2M12 11v4l-4 6M12 15l4 6',
  breath: 'M3 9h11a3 3 0 10-3-3M3 15h15a3 3 0 11-3 3M3 12h7',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  play: 'M7 4.5v15l12-7.5z', pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  next: 'M18 5v14M5 5l10 7-10 7z', prev: 'M6 5v14M19 5L9 12l10 7z',
  x: 'M6 6l12 12M18 6L6 18', back: 'M9 5l7 7-7 7',
  heart: 'M12 20s-7-4.4-9.2-8.6C1.2 8.2 3 4.5 6.5 4.5c2 0 3.4 1.2 5.5 3.3 2.1-2.1 3.5-3.3 5.5-3.3 3.5 0 5.3 3.7 3.7 6.9C19 15.6 12 20 12 20z',
  plus: 'M12 5v14M5 12h14', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  flame: 'M12 22c4.4 0 7-2.9 7-6.6 0-3.9-3-6.4-4.2-9.9-.3-.9-1.5-1-1.9-.2-.7 1.4-.6 3.1-1.8 3.9C10 8 9.7 5.4 8.3 4.6c-.6-.3-1.3.2-1.3.9C7 9.3 5 11.7 5 15.4 5 19.1 7.6 22 12 22z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 20V9M7 13l5-5 5 5M5 4h14', bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4',
};
export const icon = (n, cls = '') => h('span', { class: 'ic ' + cls, html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>` });

export const fmt = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const mins = s => { const m = Math.round(s / 60); return m < 1 ? 'פחות מדקה' : m === 1 ? 'דקה' : `${m} דק׳`; };

export function toast(msg) {
  const t = h('div', { class: 'toast' }, msg); document.body.append(t);
  setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
}

/** Bottom sheet modal. Returns a close function. */
export function sheet(content, { onClose } = {}) {
  const bg = h('div', { class: 'sheet-bg' });
  const box = h('div', { class: 'sheet', role: 'dialog' }, h('div', { class: 'sheet-grip' }), content);
  const close = () => { bg.classList.add('out'); setTimeout(() => bg.remove(), 260); onClose && onClose(); };
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.append(box); document.body.append(bg);
  requestAnimationFrame(() => bg.classList.add('in'));
  return close;
}
export function ask(title, text, yes, no = 'ביטול') {
  return new Promise(res => {
    let close;
    const done = v => { close(); res(v); };
    close = sheet(h('div', { class: 'ask' }, h('h3', {}, title), text && h('p', { class: 'muted' }, text),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => done(true) }, yes), h('button', { class: 'btn ghost grow', onclick: () => done(false) }, no))));
  });
}

export function confetti(n = 90) {
  const fx = document.getElementById('fx'); if (!fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e8a598', '#8fb9a8', '#f2c57c', '#b8a4d6', '#7fb2d6', '#f4d6cc'];
  for (let i = 0; i < n; i++) {
    const c = h('i', { class: 'cf' });
    const x = Math.random() * 100, dx = (Math.random() - .5) * 40, r = Math.random() * 720 - 360, d = 2.2 + Math.random() * 1.8;
    c.style.cssText = `left:${x}vw;background:${colors[i % colors.length]};--dx:${dx}vw;--r:${r}deg;animation-duration:${d}s;animation-delay:${Math.random() * .4}s;${Math.random() > .5 ? 'border-radius:50%;' : ''}`;
    fx.append(c); setTimeout(() => c.remove(), (d + .5) * 1000);
  }
}

/** SVG progress ring. */
export function ring(frac, { size = 120, stroke = 10, cls = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return h('div', { class: 'ring ' + cls, style: { width: size + 'px', height: size + 'px' },
    html: `<svg viewBox="0 0 ${size} ${size}"><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
    <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" style="--c:${c}"/></svg>` });
}
