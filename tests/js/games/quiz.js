/* اختيار من متعدد — سؤال وأزرار إجابات ملوّنة مرقّمة (ويمكن الاختيار بأرقام لوحة المفاتيح).
   إجابة صحيحة واحدة أو «تكفي واحدة»: أول ضغطة تحسم السؤال، والخطأ يُظهر الصحيحة ويُنقص قلبًا.
   «يجب جمعها كلها»: يختار الطالب كل الإجابات الصحيحة، وكل خطأ يُنقص قلبًا.
   الإجابة الصحيحة تحتفل: الزر يكبر ويلمع بعلامة ✓، قصاصات و+١ وصوت، وعدّاد للإجابات المتتالية. */
'use strict';

let quizButtons = [];
document.addEventListener('keydown', e => {
  const n = '123456'.indexOf(e.key) >= 0 ? '123456'.indexOf(e.key) : '١٢٣٤٥٦'.indexOf(e.key);
  if (n >= 0 && quizButtons[n]) quizButtons[n].click();
});

/* شارة الإجابات الصحيحة المتتالية */
function showStreak() {
  const old = $('.streak-badge', Play.board);
  if (old) old.remove();
  if (Play.streak < 2) return;
  const b = el('div', 'streak-badge', `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg><span>${toAr(Play.streak)} متتالية</span>`);
  Play.board.appendChild(b);
}

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
    showStreak();

    const opts = mixAnswers(q);
    const grid = el('div', 'quiz-grid' + (opts.length > 4 ? ' many' : ''));
    const reveal = () => quizButtons.forEach((b, i) => {
      b.disabled = true;
      if (opts[i].ok) b.classList.add('right');
      else if (!b.classList.contains('wrong')) b.classList.add('dim');
    });
    quizButtons = opts.map((o, i) => {
      const b = el('button', 'quiz-opt', `<span class="qo-num">${toAr(i + 1)}</span><span class="qo-txt"></span><span class="qo-mark"></span>`);
      b.style.setProperty('--c', CHIP_COLORS[i % CHIP_COLORS.length]);
      b.querySelector('.qo-txt').textContent = o.t;
      b.addEventListener('click', () => {
        if (Play.roundDone || b.disabled) return;
        Play.touch();
        b.disabled = true;
        if (o.ok) {
          b.classList.add('right', 'celebrate');
          got++;
          paintSub();
          const complete = !needAll || got === corrects.length;
          if (complete && !missed) { Play.streak++; Play.good(b); showStreak(); }
          else FX.play('good');
          if (complete) { reveal(); Play.finish(missed ? 0 : 1, { delay: 1500 }); }
        } else {
          b.classList.add('wrong');
          missed = true;
          Play.streak = 0;
          showStreak();
          Play.bad(b);
          const over = Play.mistake();
          if (!needAll && !over) { setTimeout(reveal, 350); Play.finish(0, { delay: 2000 }); }
        }
      });
      grid.appendChild(b);
      return b;
    });
    Play.board.appendChild(grid);
  },
});
