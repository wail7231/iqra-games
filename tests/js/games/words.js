/* ترتيب الكلمات — كلمات الجملة مبعثرة في بطاقات باهتة؛ يسحبها الطالب لترتيبها (أو يضغط بطاقتين لتبديلهما).
   كل كلمة تقف في مكانها الصحيح تأخذ لونها الحقيقي فورًا، وحين تكتمل الجملة تُحسب النقطة. */
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
    let selected = null, placedBefore = 0;

    /* تلوين لحظي: البطاقة في موضعها الصحيح ملوّنة، وغيرها باهتة */
    const check = (silent) => {
      const chips = [...row.children];
      let placed = 0;
      chips.forEach((c, k) => {
        const ok = c.textContent === words[k];
        if (ok && !c.classList.contains('placed')) c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 300 });
        c.classList.toggle('placed', ok);
        if (ok) placed++;
      });
      if (!silent && placed > placedBefore && placed < words.length) FX.play('good');
      placedBefore = placed;
      if (placed !== words.length) return;
      row.classList.add('solved');
      chips.forEach(c => c.classList.add('locked'));
      Play.good(row);
      Play.finish(1, { delay: 1800 });
    };
    order.forEach(i => {
      const c = el('div', 'word-chip');
      c.textContent = words[i];
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
    check(true);
  },
});
