import { h, icon, fmt, mins, sheet, ask, toast, ring, confetti } from './ui.js';
import { figure } from './figure.js';
import { POSES, byId, CATS, LEVELS } from './poses.js';
import { FLOWS, BREATHS, expand, totalSec } from './flows.js';
import { S, update, save, streak, bestStreak, week, totals, BADGES, minutesByDay, dayKey, exportData, importData, resetAll, checkBadges } from './store.js';
import { playFlow, playBreath, playMeditate } from './play.js';
import { hasHebrewVoice, unlock, AMBIENT } from './audio.js';
import { GIFT, APP_NAME } from './config.js';

const app = document.getElementById('app');
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const PHRASES = [
  'גוף רגוע, לב רגוע.', 'מספיקות עשר דקות כדי לחזור לעצמך.', 'התקדמות קטנה היא עדיין התקדמות.', 'היום תקשיבי לגוף. הוא יודע.',
  'שאיפה של כוח, נשיפה של שחרור.', 'לא צריך להיות מושלמת, רק נוכחת.', 'כל תרגול הוא מתנה שאת נותנת לעצמך.', 'לאט זה גם קצב.',
  'חזרה למזרן היא תמיד ניצחון.', 'תני לנשימה להוביל.', 'איפה שאת היום, זה בדיוק המקום להתחיל.', 'רכות היא גם כוח.',
  'מה שעשית אתמול לא קובע מה תעשי היום.', 'מותר לנוח. מנוחה היא חלק מהתרגול.', 'כתפיים למטה, לב למעלה.'
];
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };
const go2 = go;

// ---------------------------------------------------------------- theme
function applyTheme() {
  const t = S().settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]').content = dark ? '#16201d' : '#f6f1ea';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ---------------------------------------------------------------- shell
const TABS = [['home', 'בית', 'home'], ['flows', 'אימונים', 'flows'], ['poses', 'תנוחות', 'poses'], ['breathe', 'נשימה', 'breath'], ['progress', 'התקדמות', 'chart']];
function shell(tab, ...content) {
  const main = h('main', { class: 'page' }, content);
  const nav = h('nav', { class: 'tabbar' }, TABS.map(([id, label, ic]) =>
    h('a', { href: '#/' + id, class: 'tab' + (tab === id ? ' on' : ''), 'aria-label': label }, icon(ic), h('span', {}, label))));
  app.replaceChildren(main, nav);
  main.scrollTop = 0; window.scrollTo(0, 0);
}
const header = (title, back, extra) => h('header', { class: 'top' },
  back ? h('a', { class: 'iconbtn', href: back, 'aria-label': 'חזרה' }, icon('back')) : null,
  h('h1', {}, title), extra || h('span'));

function flowAll() { return [...FLOWS, ...S().custom.map(c => ({ ...c, icon: '✨', tone: 'lilac', sub: 'זרימה שבנית', level: 1, custom: true }))]; }
function findFlow(id) {
  if (id.startsWith('p-')) { const p = byId[id.slice(2)]; return p && { id, name: p.he, steps: [[p.id, p.hold]], tone: 'leaf', single: true }; }
  return flowAll().find(f => f.id === id);
}

// ---------------------------------------------------------------- welcome
function welcome() {
  const fig = figure({}, { cls: 'fig-hero' });
  const seq = ['upsalute', 'fold', 'halflift', 'downdog', 'cobra', 'child', 'w2', 'tree', 'mountain'];
  let i = 0; const loop = setInterval(() => fig.morph(byId[seq[i++ % seq.length]].pose, 1400), 2200);
  const name = h('input', { class: 'input', placeholder: 'איך לקרוא לך?', value: S().profile.name, maxlength: 20 });
  let goal = S().settings.goalMin;
  const goals = h('div', { class: 'chips center' }, [30, 60, 90, 150].map(g => h('button', { class: 'chip' + (g === goal ? ' on' : ''), onclick: e => {
    goal = g; goals.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); e.currentTarget.classList.add('on');
  } }, `${g} דק׳`)));
  app.replaceChildren(h('div', { class: 'welcome' },
    h('div', { class: 'blob b1' }), h('div', { class: 'blob b2' }),
    h('div', { class: 'w-card' },
      h('div', { class: 'gift-tag' }, '🎁 ' + GIFT.title),
      fig.el,
      h('h1', { class: 'brand' }, APP_NAME),
      h('p', { class: 'lead' }, GIFT.note),
      h('p', { class: 'sign' }, GIFT.from),
      name,
      h('div', { class: 'label' }, 'כמה דקות בשבוע תרצי לתרגל?'), goals,
      h('button', { class: 'btn primary wide', onclick: () => {
        unlock(); clearInterval(loop);
        update(s => { s.profile.name = name.value.trim(); s.profile.welcomed = true; s.settings.goalMin = goal; });
        confetti(120); go('#/home');
      } }, 'מתחילות ✨'))));
  return () => clearInterval(loop);
}

// ---------------------------------------------------------------- home
function greet() { const hr = new Date().getHours(); return hr < 5 ? 'לילה טוב' : hr < 12 ? 'בוקר טוב' : hr < 17 ? 'צהריים טובים' : hr < 21 ? 'ערב טוב' : 'לילה טוב'; }
function suggested() {
  const hr = new Date().getHours(), done = new Set(S().log.filter(e => dayKey(e.ts) === dayKey()).map(e => e.ref));
  const pick = hr < 11 ? ['morning', 'sun', 'quick'] : hr >= 20 ? ['night', 'gentle'] : ['back', 'hips', 'strong', 'gentle', 'sun'];
  const rot = pick.slice(dayNum() % pick.length).concat(pick);
  return byFlow(rot.find(id => !done.has(id)) || rot[0]);
}
const byFlow = id => FLOWS.find(f => f.id === id);

function home() {
  const s = S(), w = week(), st = streak(), goal = s.settings.goalMin, frac = w.min / goal;
  const sug = suggested();
  const todayIdx = new Date().getDay();
  const pod = POSES.filter(p => !(s.settings.prenatal && p.preg))[dayNum() % POSES.filter(p => !(s.settings.prenatal && p.preg)).length];
  const podFig = figure(byId.mountain.pose, { cls: 'fig-sm' });
  let flip = false; const podLoop = setInterval(() => { flip = !flip; podFig.morph(flip ? pod.pose : byId.mountain.pose, 1500); }, 3000);
  setTimeout(() => podFig.morph(pod.pose, 1500), 400);
  const intent = h('input', { class: 'input ghost-input', placeholder: 'למשל: להיות סבלנית עם עצמי', value: s.intention.date === dayKey() ? s.intention.text : '', maxlength: 60,
    onchange: e => update(x => { x.intention = { date: dayKey(), text: e.target.value.trim() }; }) });

  shell('home',
    h('header', { class: 'hello' },
      h('div', {}, h('div', { class: 'muted' }, new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })),
        h('h1', {}, `${greet()}${s.profile.name ? ', ' + s.profile.name : ''}`)),
      h('a', { class: 'iconbtn', href: '#/settings', 'aria-label': 'הגדרות' }, icon('gear'))),

    h('section', { class: 'card hero-goal' },
      h('div', { class: 'goal-ring' }, ring(frac, { size: 132, stroke: 12, cls: frac >= 1 ? 'done' : '' }),
        h('div', { class: 'ring-txt' }, h('b', {}, w.min), h('small', {}, `מתוך ${goal} דק׳`))),
      h('div', { class: 'goal-side' },
        h('div', { class: 'streak' + (st ? ' hot' : '') }, icon('flame'), h('b', {}, st), h('span', {}, st === 1 ? 'יום ברצף' : 'ימים ברצף')),
        h('div', { class: 'weekdots' }, w.days.map((d, i) => h('div', { class: 'wd' + (d.min ? ' on' : '') + (i === todayIdx ? ' today' : '') + (i === 6 && s.settings.shabbat ? ' rest' : '') },
          h('i', {}, d.min ? '✓' : ''), h('span', {}, DAYS[i])))),
        h('div', { class: 'muted small' }, frac >= 1 ? '🎯 היעד השבועי הושג!' : `עוד ${Math.max(0, goal - w.min)} דק׳ ליעד השבוע`))),

    h('section', { class: 'phrase' }, '“' + PHRASES[dayNum() % PHRASES.length] + '”'),

    h('h2', { class: 'sec' }, 'מומלץ עכשיו'),
    flowCard(sug, true),

    h('div', { class: 'quick' },
      h('a', { class: 'qbtn tone-sky', href: '#/breathe/coherent' }, h('span', {}, '🌬️'), h('b', {}, 'לנשום'), h('small', {}, '3 דקות')),
      h('a', { class: 'qbtn tone-night', href: '#/meditate' }, h('span', {}, '🕯️'), h('b', {}, 'מדיטציה'), h('small', {}, 'שקט')),
      h('a', { class: 'qbtn tone-sun', href: '#/flow/quick' }, h('span', {}, '⏱️'), h('b', {}, '5 דקות'), h('small', {}, 'לעצמי'))),

    h('section', { class: 'card intention' }, h('div', { class: 'label' }, '🌱 הכוונה שלי להיום'), intent),

    h('h2', { class: 'sec' }, 'תנוחת היום'),
    h('a', { class: 'card pod', href: '#/pose/' + pod.id }, podFig.el,
      h('div', {}, h('b', { class: 'pod-name' }, pod.he), h('div', { class: 'muted' }, pod.sa), h('p', {}, pod.benefits[0]), h('span', { class: 'link' }, 'ללמוד את התנוחה ←'))),
  );
  return () => clearInterval(podLoop);
}

// ---------------------------------------------------------------- flows
function flowCard(f, big) {
  const sec = totalSec(f.steps), n = expand(f.steps).length;
  return h('a', { class: `card flow tone-${f.tone || 'leaf'}${big ? ' big' : ''}`, href: '#/flow/' + f.id },
    h('div', { class: 'flow-ic' }, f.icon || '✨'),
    h('div', { class: 'flow-txt' }, h('b', {}, f.name), h('small', {}, f.sub || ''),
      h('div', { class: 'meta' }, h('span', {}, icon('clock'), mins(sec)), h('span', {}, `${n} תנוחות`), f.level ? h('span', {}, LEVELS[f.level]) : null)),
    big ? h('span', { class: 'play-dot' }, icon('play')) : null);
}
function flows() {
  const custom = S().custom;
  shell('flows', header('אימונים'),
    h('div', { class: 'list' }, FLOWS.map(f => flowCard(f))),
    h('h2', { class: 'sec' }, 'הזרימות שלי'),
    custom.length ? h('div', { class: 'list' }, flowAll().filter(f => f.custom).map(f => flowCard(f))) : h('p', { class: 'muted empty' }, 'עוד לא בנית זרימה משלך. בחרי תנוחות, קבעי זמנים, וזה שלך.'),
    h('a', { class: 'btn soft wide', href: '#/builder' }, icon('plus'), 'בניית זרימה חדשה'));
}

const SCALES = [[.7, 'קצר'], [1, 'רגיל'], [1.4, 'ארוך']];
function flowDetail(id) {
  const f = findFlow(id); if (!f) return go('#/flows');
  const scale = +(sessionStorage.getItem('scale') || 1);
  const steps = expand(f.steps);
  const warn = S().settings.prenatal && steps.some(s => byId[s.id].preg);
  shell('flows', header(f.name, '#/flows', f.custom ? h('a', { class: 'iconbtn', href: '#/builder/' + f.id, 'aria-label': 'עריכה' }, icon('edit')) : null),
    h('section', { class: `card flow-hero tone-${f.tone || 'leaf'}` }, h('div', { class: 'flow-ic xl' }, f.icon || '✨'), h('p', {}, f.sub),
      h('div', { class: 'meta' }, h('span', {}, icon('clock'), mins(totalSec(f.steps) * scale)), h('span', {}, `${steps.length} תנוחות`))),
    warn && h('div', { class: 'banner warn' }, '🤰 במצב היריון: התנוחות המסומנות דורשות התאמה או החלפה. הקשיבי לגוף והתייעצי עם הרופאה או המדריכה.'),
    h('div', { class: 'label' }, 'אורך התרגול'),
    h('div', { class: 'chips' }, SCALES.map(([v, l]) => h('button', { class: 'chip' + (v === scale ? ' on' : ''), onclick: () => { sessionStorage.setItem('scale', v); render(); } }, l))),
    h('button', { class: 'btn primary wide big-cta', onclick: () => { unlock(); go(`#/play/${f.id}`); } }, icon('play'), 'מתחילות'),
    h('div', { class: 'steps' }, steps.map((s, i) => {
      const p = byId[s.id];
      return h('a', { class: 'step' + (S().settings.prenatal && p.preg ? ' preg' : ''), href: '#/pose/' + p.id },
        h('span', { class: 'n' }, i + 1), figure(p.pose, { mirror: s.side === 'l', cls: 'fig-xs' }).el,
        h('div', { class: 'grow' }, h('b', {}, p.he), h('small', { class: 'muted' }, s.side ? (s.side === 'r' ? 'ימין' : 'שמאל') : p.sa)),
        h('span', { class: 'sec-t' }, fmt(Math.max(5, Math.round(s.sec * scale)))));
    })));
}

// ---------------------------------------------------------------- builder
function builder(id) {
  const existing = S().custom.find(c => c.id === id);
  const draft = existing ? structuredClone(existing) : { id: 'c' + Date.now().toString(36), name: '', steps: [] };
  const name = h('input', { class: 'input', placeholder: 'שם הזרימה', value: draft.name, maxlength: 30, oninput: e => draft.name = e.target.value });
  const list = h('div', { class: 'steps edit' });
  const sumEl = h('div', { class: 'muted' });
  const paint = () => {
    sumEl.textContent = draft.steps.length ? `${expand(draft.steps).length} תנוחות · ${mins(totalSec(draft.steps))}` : 'הוסיפי תנוחות מהרשימה';
    list.replaceChildren(...draft.steps.map((st, i) => {
      const p = byId[st[0]];
      const secEl = h('span', { class: 'sec-t' }, fmt(st[1]));
      const adj = d => { st[1] = Math.max(5, Math.min(600, st[1] + d)); secEl.textContent = fmt(st[1]); sumEl.textContent = `${expand(draft.steps).length} תנוחות · ${mins(totalSec(draft.steps))}`; };
      return h('div', { class: 'step' }, figure(p.pose, { cls: 'fig-xs' }).el,
        h('div', { class: 'grow' }, h('b', {}, p.he), p.sided ? h('small', { class: 'muted' }, 'שני הצדדים') : null),
        h('div', { class: 'stepper' }, h('button', { onclick: () => adj(-5) }, '−'), secEl, h('button', { onclick: () => adj(5) }, '+')),
        h('div', { class: 'col' },
          h('button', { class: 'mini', disabled: i === 0, onclick: () => { [draft.steps[i - 1], draft.steps[i]] = [draft.steps[i], draft.steps[i - 1]]; paint(); } }, icon('up')),
          h('button', { class: 'mini', disabled: i === draft.steps.length - 1, onclick: () => { [draft.steps[i + 1], draft.steps[i]] = [draft.steps[i], draft.steps[i + 1]]; paint(); } }, icon('down'))),
        h('button', { class: 'mini danger', 'aria-label': 'הסרה', onclick: () => { draft.steps.splice(i, 1); paint(); } }, icon('trash')));
    }));
  };
  const pick = () => {
    let close;
    const grid = h('div', { class: 'pick-grid' }, POSES.map(p => h('button', { class: 'pick', onclick: () => { draft.steps.push([p.id, p.hold]); paint(); toast(`נוספה: ${p.he}`); } },
      figure(p.pose, { cls: 'fig-xs' }).el, h('span', {}, p.he))));
    close = sheet(h('div', {}, h('div', { class: 'row between' }, h('h3', {}, 'הוספת תנוחה'), h('button', { class: 'btn soft', onclick: () => close() }, 'סיום')), grid));
  };
  shell('flows', header(existing ? 'עריכת זרימה' : 'זרימה חדשה', existing ? '#/flow/' + id : '#/flows'),
    name, sumEl, list,
    h('button', { class: 'btn soft wide', onclick: pick }, icon('plus'), 'הוספת תנוחה'),
    h('button', { class: 'btn primary wide', onclick: () => {
      if (!draft.steps.length) return toast('הוסיפי לפחות תנוחה אחת');
      draft.name = draft.name.trim() || 'הזרימה שלי';
      update(s => { const i = s.custom.findIndex(c => c.id === draft.id); if (i >= 0) s.custom[i] = draft; else s.custom.push(draft); });
      checkBadges(FLOWS.map(f => f.id)); toast('נשמר ✓'); go('#/flow/' + draft.id);
    } }, 'שמירה'),
    existing && h('button', { class: 'btn ghost wide danger', onclick: async () => {
      if (await ask('למחוק את הזרימה?', draft.name, 'מחיקה')) { update(s => s.custom = s.custom.filter(c => c.id !== id)); go('#/flows'); }
    } }, icon('trash'), 'מחיקה'));
  paint();
}

// ---------------------------------------------------------------- poses
let poseFilter = { q: '', cat: '', favs: false };
function poses() {
  const grid = h('div', { class: 'pose-grid' });
  const paint = () => {
    const q = poseFilter.q.trim().toLowerCase(), favs = S().favs;
    const list = POSES.filter(p => (!poseFilter.cat || p.cat === poseFilter.cat) && (!poseFilter.favs || favs.includes(p.id)) &&
      (!q || [p.he, p.sa, p.en].some(x => x.toLowerCase().includes(q))));
    grid.replaceChildren(...(list.length ? list.map(p => h('a', { class: 'pose-card' + (S().settings.prenatal && p.preg ? ' preg' : ''), href: '#/pose/' + p.id },
      favs.includes(p.id) ? h('span', { class: 'fav-dot' }, icon('heart')) : null,
      figure(p.pose, { cls: 'fig-card' }).el, h('b', {}, p.he), h('small', {}, p.sa))) : [h('p', { class: 'muted empty' }, poseFilter.favs ? 'עוד אין מועדפות. סמני ❤ בדף של תנוחה.' : 'לא נמצאו תנוחות')]));
  };
  const chips = h('div', { class: 'chips scroll' },
    h('button', { class: 'chip' + (poseFilter.favs ? ' on' : ''), onclick: e => { poseFilter.favs = !poseFilter.favs; e.currentTarget.classList.toggle('on'); paint(); } }, '❤ מועדפות'),
    [['', 'הכל'], ...Object.entries(CATS)].map(([k, v]) => h('button', { class: 'chip' + (poseFilter.cat === k ? ' on' : ''), 'data-k': k, onclick: e => {
      poseFilter.cat = k; chips.querySelectorAll('[data-k]').forEach(c => c.classList.toggle('on', c.dataset.k === k)); paint();
    } }, v)));
  shell('poses', header('ספריית תנוחות', null, h('span', { class: 'count' }, POSES.length)),
    h('label', { class: 'search' }, icon('search'), h('input', { placeholder: 'חיפוש בעברית, אנגלית או סנסקריט', value: poseFilter.q, oninput: e => { poseFilter.q = e.target.value; paint(); } })),
    chips, grid);
  paint();
}
function poseDetail(id) {
  const p = byId[id]; if (!p) return go('#/poses');
  const fig = figure(byId.mountain.pose, { cls: 'fig-detail' });
  let on = true; const loop = setInterval(() => { on = !on; fig.morph(on ? p.pose : (p.cat === 'rest' || p.cat === 'floor' || p.cat === 'seated' || p.cat === 'back' || p.cat === 'hips' ? byId.easy.pose : byId.mountain.pose), 1600); }, 3600);
  setTimeout(() => fig.morph(p.pose, 1600), 300);
  const fav = () => S().favs.includes(id);
  const favBtn = h('button', { class: 'iconbtn' + (fav() ? ' faved' : ''), 'aria-label': 'מועדפת', onclick: () => {
    update(s => s.favs = fav() ? s.favs.filter(x => x !== id) : [...s.favs, id]); favBtn.classList.toggle('faved', fav()); toast(fav() ? 'נוספה למועדפות ❤' : 'הוסרה מהמועדפות');
  } }, icon('heart'));
  const done = totals().poseSet.has(id);
  shell('poses', header(p.he, '#/poses', favBtn),
    h('section', { class: 'card pose-hero' }, fig.el,
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, CATS[p.cat]), h('span', { class: 'tag' }, LEVELS[p.level]), p.sided && h('span', { class: 'tag' }, 'שני הצדדים'), done && h('span', { class: 'tag ok' }, '✓ תרגלת')),
      h('div', { class: 'names' }, h('b', {}, p.sa), ' · ', p.en)),
    S().settings.prenatal && p.preg && h('div', { class: 'banner warn' }, '🤰 בהיריון: עדיף לוותר על התנוחה הזאת או להתאים אותה. התייעצי עם הרופאה או עם מדריכה ליוגה בהיריון.'),
    h('button', { class: 'btn primary wide', onclick: () => go('#/play/p-' + id) }, icon('play'), `לתרגל עכשיו · ${fmt(p.hold)}${p.sided ? ' לכל צד' : ''}`),
    h('h2', { class: 'sec' }, 'איך עושים'),
    h('ol', { class: 'howto' }, p.steps.map(s => h('li', {}, s))),
    h('h2', { class: 'sec' }, 'למה זה טוב'),
    h('ul', { class: 'benefits' }, p.benefits.map(s => h('li', {}, s))),
    p.caution && h('div', { class: 'banner soft' }, '💡 ' + p.caution),
    h('h2', { class: 'sec' }, 'מופיעה באימונים'),
    h('div', { class: 'chips' }, FLOWS.filter(f => f.steps.some(s => s[0] === id)).map(f => h('a', { class: 'chip', href: '#/flow/' + f.id }, f.icon + ' ' + f.name))));
  return () => clearInterval(loop);
}

// ---------------------------------------------------------------- breathe & meditate
function breathe() {
  shell('breathe', header('נשימה ומדיטציה'),
    h('a', { class: 'card med-card', href: '#/meditate' }, h('div', { class: 'm-mini' }, h('i'), h('i')),
      h('div', {}, h('b', {}, 'מדיטציה בטיימר'), h('small', {}, 'שקט, צליל רקע ופעמון עדין'))),
    h('h2', { class: 'sec' }, 'תרגילי נשימה'),
    h('div', { class: 'list' }, BREATHS.map(b => {
      const cyc = b.pattern.reduce((a, p) => a + p[1], 0);
      return h('a', { class: 'card breath-card', href: '#/breathe/' + b.id }, h('div', { class: 'flow-ic' }, b.icon),
        h('div', { class: 'grow' }, h('b', {}, b.name), h('small', {}, b.sub),
          h('div', { class: 'meta' }, h('span', {}, b.pattern.map(p => p[1]).join('-')), h('span', {}, icon('clock'), mins(cyc * b.rounds)))));
    })),
    h('p', { class: 'muted small' }, 'אם מרגישה סחרחורת, חזרי לנשימה רגילה. בהיריון, עדיף לוותר על עצירות נשימה ארוכות.'));
}
function breathSetup(id) {
  const b = BREATHS.find(x => x.id === id); if (!b) return go('#/breathe');
  const cyc = b.pattern.reduce((a, p) => a + p[1], 0);
  let rounds = b.rounds;
  const lbl = h('b', {}), dur = h('span', { class: 'muted' });
  const paint = () => { lbl.textContent = rounds; dur.textContent = mins(cyc * rounds); };
  shell('breathe', header(b.name, '#/breathe'),
    h('section', { class: 'card center breath-setup' }, h('div', { class: 'flow-ic xl' }, b.icon), h('p', {}, b.sub),
      h('div', { class: 'pattern' }, b.pattern.map(([k, s]) => h('div', { class: 'ph ph-' + k }, h('b', {}, s), h('small', {}, { in: 'שאיפה', out: 'נשיפה', hold: 'החזקה' }[k]))))),
    h('div', { class: 'label center' }, 'מספר סבבים'),
    h('div', { class: 'stepper big' }, h('button', { onclick: () => { rounds = Math.max(2, rounds - 1); paint(); } }, '−'), lbl, h('button', { onclick: () => { rounds = Math.min(60, rounds + 1); paint(); } }, '+')),
    h('div', { class: 'center' }, dur),
    h('button', { class: 'btn primary wide big-cta', onclick: () => { unlock(); sessionStorage.setItem('rounds', rounds); go('#/breathplay/' + id); } }, icon('play'), 'להתחיל לנשום'));
  paint();
}
function meditate() {
  const m = JSON.parse(localStorage.getItem('yoga-med') || '{"minutes":5,"interval":0,"sound":"ocean"}');
  const set = (k, v, row) => { m[k] = v; localStorage.setItem('yoga-med', JSON.stringify(m)); row.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.v == v)); };
  const chipRow = (k, opts) => { const row = h('div', { class: 'chips center' }); row.append(...opts.map(([v, l]) => h('button', { class: 'chip' + (m[k] == v ? ' on' : ''), 'data-v': v, onclick: () => set(k, v, row) }, l))); return row; };
  shell('breathe', header('מדיטציה', '#/breathe'),
    h('div', { class: 'm-orb small' }, h('i'), h('i'), h('i')),
    h('div', { class: 'label center' }, 'משך'), chipRow('minutes', [[3, '3'], [5, '5'], [10, '10'], [15, '15'], [20, '20']].map(([v, l]) => [v, l + ' דק׳'])),
    h('div', { class: 'label center' }, 'פעמון ביניים'), chipRow('interval', [[0, 'בלי'], [1, 'כל דקה'], [5, 'כל 5 דק׳']]),
    h('div', { class: 'label center' }, 'צליל רקע'), chipRow('sound', Object.entries(AMBIENT)),
    h('button', { class: 'btn primary wide big-cta', onclick: () => { unlock(); go('#/medplay'); } }, icon('play'), 'להתחיל'));
}

// ---------------------------------------------------------------- progress
function progress() {
  const t = totals(), st = streak(), best = bestStreak(), s = S();
  const w = week(), prev = week(-1);
  const maxDay = Math.max(20, ...w.days.map(d => d.min));
  const m = minutesByDay();
  // 18-week heatmap, columns = weeks (Sunday first)
  const start = new Date(); start.setHours(12); start.setDate(start.getDate() - start.getDay() - 7 * 17);
  const cols = [...Array(18)].map((_, c) => h('div', { class: 'hm-col' }, [...Array(7)].map((_, r) => {
    const d = new Date(start); d.setDate(start.getDate() + c * 7 + r); const v = m[dayKey(d)] || 0, fut = d > new Date();
    const lv = v === 0 ? 0 : v < 10 ? 1 : v < 20 ? 2 : v < 40 ? 3 : 4;
    return h('i', { class: `hm l${lv}${fut ? ' fut' : ''}`, title: `${d.toLocaleDateString('he-IL')} · ${Math.round(v)} דק׳` });
  })));
  const hist = [...s.log].reverse().slice(0, 30);
  shell('progress', header('ההתקדמות שלי'),
    h('div', { class: 'tiles' },
      tile('🔥', st, 'ימים ברצף'), tile('⭐', best, 'השיא שלי'), tile('⏳', t.min, 'דקות בסך הכל'), tile('🧘‍♀️', t.sessions, 'תרגולים')),
    h('section', { class: 'card' },
      h('div', { class: 'row between' }, h('b', {}, 'השבוע'), h('span', { class: 'muted small' }, `${w.min} דק׳ · שבוע שעבר ${prev.min}`)),
      h('div', { class: 'bars' }, w.days.map((d, i) => h('div', { class: 'bar' + (i === new Date().getDay() ? ' today' : '') },
        h('div', { class: 'bar-v' }, d.min || ''), h('i', { style: { height: Math.max(4, d.min / maxDay * 100) + '%' } }), h('span', {}, DAYS[i]))))),
    h('section', { class: 'card' }, h('div', { class: 'row between' }, h('b', {}, 'מפת תרגול'), h('span', { class: 'muted small' }, '18 שבועות אחרונים')),
      h('div', { class: 'heatmap' }, h('div', { class: 'hm-days' }, DAYS.map(d => h('span', {}, d))), h('div', { class: 'hm-grid' }, cols)),
      h('div', { class: 'hm-legend muted small' }, 'פחות', [0, 1, 2, 3, 4].map(l => h('i', { class: 'hm l' + l })), 'יותר')),
    h('h2', { class: 'sec' }, `תגים · ${Object.keys(s.badges).length}/${BADGES.length}`),
    h('div', { class: 'badges' }, BADGES.map(b => h('div', { class: 'badge' + (s.badges[b.id] ? ' got' : ''), title: b.desc },
      h('div', { class: 'b-ic' }, s.badges[b.id] ? b.icon : '🔒'), h('div', {}, h('b', {}, b.name), h('small', {}, b.desc))))),
    h('h2', { class: 'sec' }, 'יומן תרגול'),
    hist.length ? h('div', { class: 'history' }, hist.map(e => h('div', { class: 'hist' },
      h('div', { class: 'h-ic' }, e.mood != null ? ['😣', '😕', '😌', '😊', '🤩'][e.mood] : { flow: '🧘‍♀️', breath: '🌬️', meditate: '🕯️' }[e.kind]),
      h('div', { class: 'grow' }, h('b', {}, e.title), h('small', { class: 'muted' }, new Date(e.ts).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) + ` · ${Math.max(1, Math.round(e.minutes))} דק׳`),
        e.note ? h('p', { class: 'h-note' }, e.note) : null),
      h('button', { class: 'mini', 'aria-label': 'מחיקה', onclick: async () => { if (await ask('למחוק את הרישום?', e.title, 'מחיקה')) { update(x => x.log = x.log.filter(y => y.id !== e.id)); render(); } } }, icon('trash')))))
      : h('div', { class: 'card empty center' }, h('div', { class: 'xl' }, '🌱'), h('p', {}, 'כאן יופיעו התרגולים שלך.'), h('a', { class: 'btn primary', href: '#/flows' }, 'לתרגול הראשון')));
}
const tile = (ic, v, l) => h('div', { class: 'tile' }, h('span', { class: 'tile-ic' }, ic), h('b', { class: 'countup', 'data-v': v }, '0'), h('small', {}, l));
function countUp() {
  document.querySelectorAll('.countup').forEach(el => {
    const v = +el.dataset.v, t0 = performance.now(), d = 900;
    const f = n => { const x = Math.min(1, (n - t0) / d); el.textContent = Math.round(v * (1 - Math.pow(1 - x, 3))); if (x < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}

// ---------------------------------------------------------------- settings
function settings() {
  const s = S().settings;
  const tog = (k, label, sub) => h('label', { class: 'setting' }, h('div', { class: 'grow' }, h('b', {}, label), sub && h('small', { class: 'muted' }, sub)),
    h('span', { class: 'switch' }, h('input', { type: 'checkbox', checked: s[k], onchange: e => { update(x => x.settings[k] = e.target.checked); if (k === 'prenatal' && e.target.checked) toast('התנוחות שדורשות התאמה יסומנו'); } }), h('i')));
  const range = (k, label, min, max, stepv, unit) => {
    const out = h('b', {}, s[k] + ' ' + unit);
    return h('div', { class: 'setting col' }, h('div', { class: 'row between' }, h('b', {}, label), out),
      h('input', { type: 'range', min, max, step: stepv, value: s[k], oninput: e => { out.textContent = e.target.value + ' ' + unit; }, onchange: e => update(x => x.settings[k] = +e.target.value) }));
  };
  const name = h('input', { class: 'input', value: S().profile.name, placeholder: 'השם שלך', onchange: e => update(x => x.profile.name = e.target.value.trim()) });
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try { importData(await f.text()); toast('הגיבוי שוחזר ✓'); render(); } catch { toast('הקובץ לא תקין'); }
  } });
  shell('home', header('הגדרות', '#/home'),
    h('div', { class: 'label' }, 'השם שלי'), name,
    h('h2', { class: 'sec' }, 'יעדים'),
    range('goalMin', 'דקות בשבוע', 15, 300, 15, 'דק׳'),
    h('h2', { class: 'sec' }, 'תרגול'),
    tog('voice', 'הנחיה קולית', hasHebrewVoice() ? 'קריאת שם התנוחה בעברית' : 'לא נמצא קול עברי במכשיר הזה. הצלילים והרטט עדיין פועלים.'),
    tog('sounds', 'צלילים', 'פעמון במעבר בין תנוחות'),
    tog('vibrate', 'רטט', 'באנדרואיד בלבד'),
    range('prep', 'זמן התכוננות לפני תרגול', 0, 15, 1, 'שנ׳'),
    tog('shabbat', 'שבת לא שוברת רצף', 'יום שבת לא נספר כהפסקה ברצף'),
    tog('prenatal', 'מצב היריון', 'מסמן תנוחות שדורשות התאמה. לא תחליף להתייעצות עם הרופאה'),
    h('h2', { class: 'sec' }, 'מראה'),
    h('div', { class: 'chips' }, [['auto', 'אוטומטי'], ['light', 'בהיר'], ['dark', 'כהה']].map(([v, l]) => h('button', { class: 'chip' + (s.theme === v ? ' on' : ''), onclick: () => { update(x => x.settings.theme = v); applyTheme(); render(); } }, l))),
    h('h2', { class: 'sec' }, 'תזכורת'),
    h('p', { class: 'muted small' }, 'מוסיפה ללוח השנה שלך תזכורת יומית קבועה לתרגל.'),
    h('div', { class: 'row gap' }, h('input', { type: 'time', class: 'input', id: 'remt', value: '20:30' }), h('button', { class: 'btn soft', onclick: () => ics(document.getElementById('remt').value) }, icon('bell'), 'הוספה ליומן')),
    h('h2', { class: 'sec' }, 'גיבוי'),
    h('p', { class: 'muted small' }, 'כל הנתונים נשמרים רק בטלפון הזה. כדאי לשמור גיבוי מדי פעם.'),
    h('div', { class: 'row gap' },
      h('button', { class: 'btn soft grow', onclick: () => download(`yoga-backup-${dayKey()}.json`, exportData(), 'application/json') }, icon('download'), 'שמירת גיבוי'),
      h('button', { class: 'btn soft grow', onclick: () => file.click() }, icon('upload'), 'שחזור'), file),
    h('h2', { class: 'sec' }, 'על האפליקציה'),
    h('section', { class: 'card gift-card' }, h('div', { class: 'gift-tag' }, '🎁 ' + GIFT.title), h('p', {}, GIFT.note), h('p', { class: 'sign' }, GIFT.from)),
    h('p', { class: 'muted small' }, 'המידע באפליקציה הוא כללי ואינו ייעוץ רפואי. בכאב, סחרחורת או בהיריון - הקשיבי לגוף והתייעצי עם איש מקצוע.'),
    h('button', { class: 'btn ghost wide danger', onclick: async () => { if (await ask('למחוק את כל הנתונים?', 'כל ההיסטוריה, התגים והזרימות שלך יימחקו מהמכשיר.', 'מחיקת הכל')) { resetAll(); applyTheme(); go('#/home'); } } }, 'איפוס כל הנתונים'));
}
function download(name, text, type) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove();
}
function ics(time) {
  const [hh, mm] = (time || '20:30').split(':'), d = new Date(); d.setHours(+hh, +mm, 0, 0);
  const p = n => String(n).padStart(2, '0');
  const dt = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  const end = new Date(d.getTime() + 15 * 6e4), de = `${end.getFullYear()}${p(end.getMonth() + 1)}${p(end.getDate())}T${p(end.getHours())}${p(end.getMinutes())}00`;
  const url = location.href.split('#')[0];
  download('yoga-reminder.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//yoga//he', 'BEGIN:VEVENT', `UID:yoga-${Date.now()}@local`, `DTSTAMP:${dt}`, `DTSTART:${dt}`, `DTEND:${de}`,
    'RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR', `SUMMARY:🧘‍♀️ זמן ליוגה`, `DESCRIPTION:${url}`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:זמן ליוגה', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
}

// ---------------------------------------------------------------- router
let cleanup = null;
function render() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const [, route = 'home', arg] = location.hash.split('/');
  if (!S().profile.welcomed && route !== 'welcome') { cleanup = welcome(); return; }
  document.body.classList.toggle('in-player', ['play', 'breathplay', 'medplay'].includes(route));
  let r;
  switch (route) {
    case 'flows': r = flows(); break;
    case 'flow': r = flowDetail(decodeURIComponent(arg || '')); break;
    case 'builder': r = builder(arg); break;
    case 'poses': r = poses(); break;
    case 'pose': r = poseDetail(arg); break;
    case 'breathe': r = arg ? breathSetup(arg) : breathe(); break;
    case 'meditate': r = meditate(); break;
    case 'progress': r = progress(); countUp(); break;
    case 'settings': r = settings(); break;
    case 'play': { const f = findFlow(decodeURIComponent(arg || '')); if (!f) return go('#/flows');
      r = playFlow(app, f, { scale: f.single ? 1 : +(sessionStorage.getItem('scale') || 1), go: go2 }); break; }
    case 'breathplay': { const b = BREATHS.find(x => x.id === arg); if (!b) return go('#/breathe');
      r = playBreath(app, b, { rounds: +(sessionStorage.getItem('rounds') || b.rounds), go: go2 }); break; }
    case 'medplay': { const m = JSON.parse(localStorage.getItem('yoga-med') || '{"minutes":5,"interval":0,"sound":"ocean"}'); r = playMeditate(app, { ...m, go: go2 }); break; }
    default: r = home();
  }
  cleanup = typeof r === 'function' ? r : null;
}
window.addEventListener('hashchange', render);
applyTheme();
render();
document.documentElement.classList.add('ready');

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
