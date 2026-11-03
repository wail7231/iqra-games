/* هانج مان — كلمة مخفية بخانات وتلميح؛ يختار الطالب الحروف من لوحة حروف عربية (أو يكتبها بلوحة المفاتيح).
   شكلان يختارهما المعلم:
     رسم: كل خطأ يرسم جزءًا من المشنقة والرسم (١١ جزءًا تتوزع على عدد الفرص)، شخص بلا ملامح وجه
     بالونات: كل خطأ يُفجّر بالونًا (فوانيس في الليل، زهور في الحديقة، بلورات في الجليد، قلم في الدفتر)
   تفاصيل الرسم تتبع قالب الشكل في tests.css: خشب، نيون مضيء، عشب وأوراق، ثلج وجليد، رسم بالقلم.
   التشكيل لا يُحسب (الحرف المشكول يُعامل كحرفه). */
'use strict';

const KEY_ROWS = ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط ذ', 'ئ ء ؤ ر ى ة و ز ظ أ إ آ'];
const BALLOON_COLORS = ['#E5554F', '#F2A516', '#3FA34D', '#2E8BC0', '#8E5CC2', '#E5559A', '#1FA39A', '#F07A2A', '#5C7CFA', '#C0392B', '#3F8A3A'];
/* أجزاء الرسم بالترتيب: المشنقة ثم الرسم */
const HANG_PARTS = [
  { d: 'M18 226H142', kind: 'wood' },
  { d: 'M52 226V22', kind: 'wood' },
  { d: 'M44 22H156', kind: 'wood' },
  { d: 'M52 62L92 22', kind: 'wood' },
  { d: 'M150 22V52', kind: 'rope' },
  { circle: [150, 73, 21], kind: 'fig' },
  { d: 'M150 94V152', kind: 'fig' },
  { d: 'M150 110L124 136', kind: 'fig' },
  { d: 'M150 110L176 136', kind: 'fig' },
  { d: 'M150 152L128 194', kind: 'fig' },
  { d: 'M150 152L172 194', kind: 'fig' },
];
/* زينة كل قالب، تظهر مع الجزء الذي تتبعه */
const HANG_EXTRAS = `
  <g class="hx hx-garden" data-part="0"><path d="M14 226q4-12 8 0q4-14 8 0q4-10 8 0M100 226q4-12 8 0q4-14 8 0q4-10 8 0q4-12 8 0" /></g>
  <g class="hx hx-garden" data-part="2"><ellipse cx="80" cy="16" rx="9" ry="4.5" transform="rotate(-20 80 16)"/><ellipse cx="96" cy="16" rx="8" ry="4" transform="rotate(25 96 16)"/><ellipse cx="128" cy="16" rx="9" ry="4.5" transform="rotate(-15 128 16)"/></g>
  <g class="hx hx-ice" data-part="2"><path d="M42 18q8-9 16 0q10-8 20 0q10-9 22 0q10-8 22 0q10-9 22 0q8-7 14 0z"/><path class="icicle" d="M66 25l3 14 3-14zM98 25l2.5 11 2.5-11zM124 25l3 16 3-16z"/></g>
  <g class="hx hx-ice" data-part="0"><path d="M14 222q10-8 22 0q12-9 26 0q12-8 26 0q12-9 26 0q10-7 30 0v4H14z"/></g>
  <g class="hx hx-classic" data-part="0"><path d="M30 226v8M70 226v8M110 226v8"/></g>`;

let hangKeys = null;
document.addEventListener('keydown', e => { if (hangKeys && hangKeys[e.key]) hangKeys[e.key].click(); });

function hangArt() {
  const parts = HANG_PARTS.map((p, i) => {
    const shape = p.circle
      ? `<circle cx="${p.circle[0]}" cy="${p.circle[1]}" r="${p.circle[2]}" pathLength="1"/>`
      : `<path d="${p.d}" pathLength="1"/>`;
    /* الخشب بخطّين: داكن وفوقه خط أفتح كأنه عرق الخشب */
    return `<g class="hp hp-${p.kind}" data-part="${i}">${shape}${p.kind === 'wood' ? shape.replace('pathLength="1"', 'pathLength="1" class="grain"') : ''}</g>`;
  }).join('');
  return `<svg class="hang-art" viewBox="0 0 200 240" aria-hidden="true">
    <defs>
      <filter id="hmSketch"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>
      <filter id="hmGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g class="hang-all">${parts}${HANG_EXTRAS}</g>
  </svg>`;
}

Play.register({
  settings: [
    { key: 'look', label: 'الشكل', options: [[1, 'رسم'], [0, 'بالونات']], def: 1 },
    { key: 'chances', label: 'عدد الفرص', options: [[3, '٣'], [5, '٥'], [7, '٧'], [11, '١١']], def: 7 },
    'timer',
  ],
  label: it => it.hint || it.word,
  answer: it => it.word,
  round(it) {
    const plain = [...stripMarks(it.word)];
    Play.head(it.hint || '');
    const n = Play.cfg.chances;
    const drawing = Play.cfg.look === 1;

    const stage = el('div', 'hang-stage' + (drawing ? ' drawing' : ''));
    let balloons = [];
    if (drawing) {
      stage.innerHTML = hangArt();
    } else {
      stage.classList.add('balloons');
      balloons = [...Array(n)].map((_, i) => {
        const b = el('div', 'balloon', '<span class="bl-body"></span><span class="bl-string"></span>');
        b.style.setProperty('--c', BALLOON_COLORS[i % BALLOON_COLORS.length]);
        b.style.setProperty('--d', (i * .37 % 1.6) + 's');
        stage.appendChild(b);
        return b;
      });
    }
    const left = el('div', 'hang-left');
    const word = el('div', 'hang-word');
    const cells = plain.map(ch => {
      if (!ch.trim()) return word.appendChild(el('span', 'hang-gap'));
      const c = el('span', 'hang-cell');
      c.dataset.ch = ch;
      return word.appendChild(c);
    });
    const keys = el('div', 'hang-keys');
    left.append(word, keys);
    const wrap = el('div', 'hang-wrap');
    wrap.append(stage, left);
    Play.board.appendChild(wrap);

    let wrong = 0;
    const need = new Set(plain.filter(ch => ch.trim()));
    /* كم جزءًا يُرسم بعد هذا العدد من الأخطاء: الأجزاء الـ١١ موزعة على الفرص */
    const drawUpTo = w => {
      const count = w >= n ? HANG_PARTS.length : Math.round(w * HANG_PARTS.length / n);
      $$('[data-part]', stage).forEach(p => { if (+p.dataset.part < count) p.classList.add('on'); });
    };
    hangKeys = {};
    KEY_ROWS.forEach(row => {
      const r = el('div', 'hk-row');
      row.split(' ').forEach(ch => {
        const k = el('button', 'hang-key');
        k.textContent = ch;
        k.addEventListener('click', () => {
          if (Play.roundDone || k.disabled) return;
          Play.touch();
          k.disabled = true;
          if (need.has(ch)) {
            k.classList.add('right');
            need.delete(ch);
            cells.forEach(c => { if (c.dataset && c.dataset.ch === ch) { c.textContent = ch; c.classList.add('open'); } });
            if (!need.size) {
              word.classList.add('solved');
              stage.classList.add('saved');
              Play.good(word);
              Play.finish(1, { delay: 1900 });
            } else FX.play('good');
          } else {
            k.classList.add('wrong');
            wrong++;
            if (drawing) { drawUpTo(wrong); FX.play('nope'); }
            else { balloons[wrong - 1].classList.add('popped'); FX.play('pop'); }
            if (wrong >= n) {
              cells.forEach(c => { if (c.dataset && c.dataset.ch && !c.textContent) { c.textContent = c.dataset.ch; c.classList.add('missed'); } });
              word.classList.add('lost');
              stage.classList.add('lost');
              FX.play('bad');
              Play.finish(0, { delay: 2600 });
            }
          }
        });
        hangKeys[ch] = k;
        r.appendChild(k);
      });
      keys.appendChild(r);
    });
  },
});
