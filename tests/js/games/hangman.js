/* البالونات (Hangman) — كلمة مخفية بخانات وتلميح؛ يختار الطالب الحروف من لوحة حروف عربية
   (أو يكتبها بلوحة المفاتيح). كل حرف خاطئ يُفجّر بالونًا؛ إذا انفجرت كلها ظهرت الكلمة بلا نقطة.
   شكل البالونات يتبع قالب الشكل في tests.css: بالونات، فوانيس مضيئة (ليل)، زهور تذبل (حديقة)،
   بلورات تتحطم (جليد)، بالونات مرسومة بالقلم تُشطب (دفتر).
   بالونات بدل رسم إنسان، والتشكيل لا يُحسب (الحرف المشكول يُعامل كحرفه). */
'use strict';

const KEY_ROWS = ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط ذ', 'ئ ء ؤ ر ى ة و ز ظ أ إ آ'];
const BALLOON_COLORS = ['#E5554F', '#F2A516', '#3FA34D', '#2E8BC0', '#8E5CC2', '#E5559A', '#1FA39A', '#F07A2A', '#5C7CFA', '#C0392B'];
let hangKeys = null;
document.addEventListener('keydown', e => { if (hangKeys && hangKeys[e.key]) hangKeys[e.key].click(); });

Play.register({
  settings: [
    { key: 'balloons', label: 'عدد البالونات', options: [[5, '٥'], [7, '٧'], [9, '٩']], def: 7 },
    'timer',
  ],
  label: it => it.hint || it.word,
  answer: it => it.word,
  round(it) {
    const plain = [...stripMarks(it.word)];
    Play.head(it.hint || '');

    const sky = el('div', 'balloons');
    const n = Play.cfg.balloons;
    const balloons = [...Array(n)].map((_, i) => {
      const b = el('div', 'balloon', '<span class="bl-body"></span><span class="bl-string"></span>');
      b.style.setProperty('--c', BALLOON_COLORS[i % BALLOON_COLORS.length]);
      b.style.setProperty('--d', (i * .37 % 1.6) + 's');
      sky.appendChild(b);
      return b;
    });
    const word = el('div', 'hang-word');
    const cells = plain.map(ch => {
      if (!ch.trim()) return word.appendChild(el('span', 'hang-gap'));
      const c = el('span', 'hang-cell');
      c.dataset.ch = ch;
      return word.appendChild(c);
    });
    const keys = el('div', 'hang-keys');
    Play.board.append(sky, word, keys);

    let popped = 0;
    const need = new Set(plain.filter(ch => ch.trim()));
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
              Play.good(word);
              Play.finish(1, { delay: 1900 });
            } else FX.play('good');
          } else {
            k.classList.add('wrong');
            balloons[popped++].classList.add('popped');
            FX.play('pop');
            if (popped >= n) {
              cells.forEach(c => { if (c.dataset && c.dataset.ch && !c.textContent) { c.textContent = c.dataset.ch; c.classList.add('missed'); } });
              word.classList.add('lost');
              FX.play('bad');
              Play.finish(0, { delay: 2400 });
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
