/* ترتيب الكلمات — كلمات الجملة مبعثرة في بطاقات باهتة؛ يسحبها الطالب لترتيبها (أو يضغط بطاقتين لتبديلهما).
   لا زر تأكيد: حين يصبح الترتيب صحيحًا تأخذ البطاقات ألوانها الحقيقية وتُحسب النقطة. */
'use strict';

const wordsOf = it => it.text.trim().split(/\s+/);

Play.register({
  settings: ['timer'],
  label: it => it.hint || wordsOf(it).slice(0, 3).join(' ') + '…',
  answer: it => it.text,
  round(it) {
    const words = wordsOf(it);
    Play.head(it.hint || '');
    const row = el('div', 'word-row');
    const order = scramble(words.map((w, i) => i), (a, b) => words[a] === words[b]);
    let selected = null;

    const check = () => {
      const now = [...row.children].map(c => words[c.dataset.w]);
      if (now.join(' ') !== words.join(' ')) return;
      row.classList.add('solved');
      row.querySelectorAll('.word-chip').forEach(c => c.classList.add('locked'));
      Play.finish(1, { delay: 1700 });
    };
    order.forEach(i => {
      const c = el('div', 'word-chip');
      c.textContent = words[i];
      c.dataset.w = i;
      c.style.setProperty('--c', CHIP_COLORS[i % CHIP_COLORS.length]);
      dragItem(c, {
        /* أثناء السحب تتحرك البطاقة في الصف مباشرة: يمين منتصف البطاقة الأخرى = قبلها */
        onMove(ev, under) {
          const t = under && under.closest('.word-chip');
          if (!t || t === c || t.parentNode !== row) return;
          const r = t.getBoundingClientRect();
          row.insertBefore(c, ev.clientX > r.left + r.width / 2 ? t : t.nextSibling);
        },
        onDrop: check,
        onTap() {
          if (!selected) { selected = c; c.classList.add('sel'); return; }
          if (selected !== c) {
            const a = selected, b = c, aNext = a.nextSibling;
            if (aNext === b) row.insertBefore(b, a);
            else { row.insertBefore(a, b); row.insertBefore(b, aNext); }
          }
          selected.classList.remove('sel');
          selected = null;
          check();
        },
      });
      row.appendChild(c);
    });
    Play.board.appendChild(row);

    actionBar(actionBtn('تخطَّ', 'btn-ghost skip-btn', () => {
      if (Play.roundDone) return;
      words.forEach((w, i) => row.appendChild(row.querySelector(`[data-w="${i}"]`)));
      row.classList.add('shown');
      Play.finish(0, { delay: 2200 });
    }));
  },
});
