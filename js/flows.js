import { byId } from './poses.js';

const sun = () => [
  ['mountain', 10], ['upsalute', 6], ['fold', 8], ['halflift', 5], ['plank', 8], ['chaturanga', 4],
  ['updog', 6], ['downdog', 20], ['halflift', 5], ['fold', 8], ['upsalute', 6], ['mountain', 6]
];

// Each step: [poseId, seconds]. Sided poses expand to right and left in the player.
export const FLOWS = [
  { id: 'morning', name: 'בוקר טוב', sub: 'להתעורר בעדינות ולהתחיל את היום עם אנרגיה', icon: '🌅', level: 1, tone: 'sun',
    steps: [['easy', 45], ['cat', 8], ['cow', 8], ['cat', 8], ['cow', 8], ['child', 30], ['downdog', 30], ['lowlunge', 25], ['fold', 25], ['upsalute', 10], ['mountain', 15], ['w2', 25], ['triangle', 25], ['tree', 25], ['mountain', 20]] },
  { id: 'sun', name: 'ברכת השמש', sub: 'שלושה סבבים של זרימה קלאסית שמחממת את כל הגוף', icon: '☀️', level: 1, tone: 'sun',
    steps: [...sun(), ...sun(), ...sun(), ['child', 40]] },
  { id: 'back', name: 'גב בריא', sub: 'שחרור לגב התחתון ולכתפיים אחרי יום ארוך', icon: '🌿', level: 1, tone: 'leaf',
    steps: [['child', 45], ['cat', 8], ['cow', 8], ['cat', 8], ['cow', 8], ['cat', 8], ['cow', 8], ['sphinx', 40], ['child', 30], ['downdog', 30], ['halflift', 10], ['fold', 30], ['kneeschest', 40], ['bridge', 25], ['kneeschest', 20], ['supinetwist', 40], ['corpse', 120]] },
  { id: 'night', name: 'לפני השינה', sub: 'האטה, נשימה ומתיחות רכות לשינה טובה', icon: '🌙', level: 1, tone: 'night',
    steps: [['easy', 60], ['butterfly', 60], ['seatedfold', 60], ['child', 60], ['kneeschest', 40], ['happybaby', 40], ['supinetwist', 45], ['legswall', 150], ['corpse', 180]] },
  { id: 'hips', name: 'פתיחת ירכיים', sub: 'זרימה עמוקה לירכיים, לאגן ולגב התחתון', icon: '🦋', level: 2, tone: 'rose',
    steps: [['easy', 30], ['cat', 8], ['cow', 8], ['downdog', 30], ['lowlunge', 40], ['pigeon', 75], ['downdog', 20], ['squat', 40], ['butterfly', 60], ['seatedfold', 45], ['happybaby', 45], ['supinetwist', 40], ['corpse', 120]] },
  { id: 'strong', name: 'כוח ואיזון', sub: 'לחזק רגליים, ליבה ויציבות', icon: '🔥', level: 2, tone: 'fire',
    steps: [['mountain', 15], ['chair', 25], ['fold', 20], ['plank', 30], ['downdog', 20], ['w1', 30], ['w2', 30], ['reverse', 20], ['sideangle', 25], ['w3', 20], ['tree', 30], ['dancer', 20], ['sideplank', 20], ['boat', 20], ['child', 30], ['boat', 20], ['bridge', 25], ['corpse', 90]] },
  { id: 'quick', name: '5 דקות לעצמי', sub: 'הפסקה קצרה בין המטלות', icon: '⏱️', level: 1, tone: 'sky',
    steps: [['mountain', 20], ['upsalute', 15], ['fold', 30], ['halflift', 10], ['chair', 20], ['tree', 25], ['mountain', 30], ['easy', 120]] },
  { id: 'gentle', name: 'יוגה עדינה', sub: 'תרגול רך שמתאים לימים עייפים. תנוחות בעמידה ובישיבה', icon: '🌸', level: 1, tone: 'rose',
    steps: [['easy', 60], ['cat', 8], ['cow', 8], ['cat', 8], ['cow', 8], ['child', 40], ['lowlunge', 30], ['w2', 25], ['mountain', 20], ['tree', 20], ['squat', 30], ['butterfly', 60], ['easy', 90]] },
];

export const BREATHS = [
  { id: 'box', name: 'נשימת קופסה', sub: 'מרגיעה ומחדדת ריכוז', icon: '◻️', pattern: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]], rounds: 8 },
  { id: '478', name: 'נשימת 4-7-8', sub: 'לפני השינה או ברגע של לחץ', icon: '🌙', pattern: [['in', 4], ['hold', 7], ['out', 8]], rounds: 5 },
  { id: 'coherent', name: 'נשימה מאוזנת', sub: '5.5 שניות פנימה, 5.5 החוצה', icon: '〰️', pattern: [['in', 5.5], ['out', 5.5]], rounds: 16 },
  { id: 'calm', name: 'נשיפה ארוכה', sub: 'נשיפה כפולה מהשאיפה - מרגיעה מהר', icon: '🍃', pattern: [['in', 4], ['out', 8]], rounds: 10 },
  { id: 'energy', name: 'נשימה מעוררת', sub: 'שאיפה ארוכה ונשיפה קצרה - לאנרגיה', icon: '⚡', pattern: [['in', 6], ['hold', 2], ['out', 3]], rounds: 10 },
];
export const PHASE = { in: 'שאיפה', out: 'נשיפה', hold: 'החזקה' };

/** Expands a step list into player steps, splitting sided poses into right then left. */
export function expand(steps) {
  const out = [];
  for (const [id, sec] of steps) {
    const p = byId[id]; if (!p) continue;
    if (p.sided) { out.push({ id, sec, side: 'r' }, { id, sec, side: 'l' }); }
    else out.push({ id, sec });
  }
  return out;
}
export const totalSec = steps => expand(steps).reduce((s, x) => s + x.sec, 0);
