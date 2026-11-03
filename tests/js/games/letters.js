/* ترتيب الحروف — حروف الكلمة مبعثرة مع حروف زائدة للتصعيب؛ يضعها الطالب في الخانات بالترتيب.
   ضغطة على حرف = يذهب إلى أول خانة فارغة، وضغطة على حرف في خانة = يعود. حين تمتلئ الخانات
   تُفحص الكلمة: الصحيحة تتلوّن وتُحسب، والخاطئة تهتز ليصلحها الطالب. */
'use strict';

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const lettersOf = word => [...stripMarks(word)].filter(ch => ch.trim());

Play.register({
  settings: [
    { key: 'extra', label: 'حروف زائدة', options: [[0, '٠'], [2, '٢'], [4, '٤'], [6, '٦']], def: 2 },
    'timer',
  ],
  label: it => it.hint || it.word,
  answer: it => it.word,
  round(it) {
    const letters = lettersOf(it.word);
    Play.head(it.hint || '');
    const pick = it.extra ? [...stripMarks(it.extra)].filter(ch => ch.trim()) : [...ARABIC_LETTERS];
    const extras = [...Array(Play.cfg.extra)].map(() => pick[Math.random() * pick.length | 0]);
    const tiles = scramble([...letters, ...extras].map((ch, i) => ({ ch, i })), (a, b) => a.ch === b.ch);

    const slots = el('div', 'letter-slots');
    const slotEls = letters.map(() => slots.appendChild(el('div', 'letter-slot')));
    const bank = el('div', 'letter-bank');
    Play.board.append(slots, bank);
    const done = el('div', 'letters-word');
    done.textContent = it.word;

    const check = () => {
      if (slotEls.some(s => !s.firstChild)) return;
      const now = slotEls.map(s => s.firstChild.textContent).join('');
      if (now === letters.join('')) {
        slots.classList.add('solved');
        $$('.letter-tile', Play.board).forEach(t => t.classList.add('locked'));
        Play.board.insertBefore(done, bank);
        Play.finish(1, { delay: 1800 });
      } else {
        slots.classList.remove('nope');
        void slots.offsetWidth;
        slots.classList.add('nope');
      }
    };
    tiles.forEach(t => {
      const b = el('button', 'letter-tile');
      b.textContent = t.ch;
      b.addEventListener('click', () => {
        if (Play.roundDone) return;
        Play.touch();
        slots.classList.remove('nope');
        if (b.parentNode === bank) {
          const s = slotEls.find(x => !x.firstChild);
          if (s) { s.appendChild(b); check(); }
        } else {
          bank.appendChild(b);
        }
      });
      bank.appendChild(b);
    });

    actionBar(actionBtn('تخطَّ', 'btn-ghost skip-btn', () => {
      if (Play.roundDone) return;
      slotEls.forEach((s, k) => { s.innerHTML = ''; s.appendChild(el('span', 'letter-tile shown', letters[k])); });
      Play.board.insertBefore(done, bank);
      bank.remove();
      Play.finish(0, { delay: 2200 });
    }));
  },
});
