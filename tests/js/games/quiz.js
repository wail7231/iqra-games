/* اختيار من متعدد — سؤال وأزرار إجابات ملوّنة مرقّمة (ويمكن الاختيار بأرقام لوحة المفاتيح).
   إجابة صحيحة واحدة أو «تكفي واحدة»: أول ضغطة تحسم السؤال، والخطأ يُظهر الصحيحة ويُنقص قلبًا.
   «يجب جمعها كلها»: يختار الطالب كل الإجابات الصحيحة، وكل خطأ يُنقص قلبًا. */
'use strict';

let quizButtons = [];
document.addEventListener('keydown', e => {
  const n = '123456'.indexOf(e.key) >= 0 ? '123456'.indexOf(e.key) : '١٢٣٤٥٦'.indexOf(e.key);
  if (n >= 0 && quizButtons[n]) quizButtons[n].click();
});

Play.register({
  settings: ['timer', 'lives'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q) {
    const corrects = answersOf(q);
    const needAll = corrects.length > 1 && q.need === 'all';
    const head = Play.head(q.q, needAll ? ' ' : '');
    const sub = head.querySelector('.round-sub');
    let got = 0, missed = false;
    const paintSub = () => { if (sub) sub.textContent = `✓ ${toAr(got)} من ${toAr(corrects.length)}`; };
    paintSub();

    const opts = shuffle([...corrects.map(t => ({ t, ok: true })), ...q.wrong.map(t => ({ t, ok: false }))]);
    const grid = el('div', 'quiz-grid' + (opts.length > 4 ? ' many' : ''));
    const reveal = () => quizButtons.forEach((b, i) => {
      b.disabled = true;
      if (opts[i].ok) b.classList.add('right');
      else if (!b.classList.contains('wrong')) b.classList.add('dim');
    });
    quizButtons = opts.map((o, i) => {
      const b = el('button', 'quiz-opt', `<span class="qo-num">${toAr(i + 1)}</span><span class="qo-txt"></span>`);
      b.style.setProperty('--c', CHIP_COLORS[i % CHIP_COLORS.length]);
      b.lastChild.textContent = o.t;
      b.addEventListener('click', () => {
        if (Play.roundDone || b.disabled) return;
        Play.touch();
        b.disabled = true;
        if (o.ok) {
          b.classList.add('right');
          got++;
          paintSub();
          if (!needAll || got === corrects.length) { reveal(); Play.finish(missed ? 0 : 1); }
        } else {
          b.classList.add('wrong');
          missed = true;
          const over = Play.mistake();
          if (!needAll && !over) { reveal(); Play.finish(0, { delay: 1800 }); }
        }
      });
      grid.appendChild(b);
      return b;
    });
    Play.board.appendChild(grid);
  },
});
