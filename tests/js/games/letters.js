/* ترتيب الحروف — حروف الكلمة مبعثرة مع حروف زائدة تشبه حروفها (ب ت ث ن، ج ح خ، س ش…) للتصعيب.
   ضغطة على حرف = يذهب إلى أول خانة فارغة، وضغطة على حرف في خانة = يعود. حين تمتلئ الخانات
   تُفحص الحروف واحدًا بعد واحد: الصحيح أخضر والخاطئ أحمر، ويصلح الطالب الأحمر حتى تكتمل الكلمة. */
'use strict';

const lettersOf = word => [...stripMarks(word)].filter(ch => ch.trim());
/* حروف متشابهة الرسم أو الصوت — منها تُختار الحروف الزائدة */
const LOOKALIKE = {
  'ب': 'تثني', 'ت': 'بثن', 'ث': 'بتن', 'ن': 'بتي', 'ي': 'ىئن', 'ى': 'يا', 'ئ': 'يء',
  'ج': 'حخ', 'ح': 'جخ', 'خ': 'جح', 'د': 'ذر', 'ذ': 'دز', 'ر': 'زد', 'ز': 'رذ',
  'س': 'شص', 'ش': 'سض', 'ص': 'ضس', 'ض': 'صظ', 'ط': 'ظت', 'ظ': 'طض', 'ع': 'غء', 'غ': 'عق',
  'ف': 'قغ', 'ق': 'فك', 'ك': 'لق', 'ل': 'كا', 'م': 'نب', 'ه': 'ةح', 'ة': 'هت',
  'و': 'ؤر', 'ؤ': 'وء', 'ا': 'أإل', 'أ': 'اإآ', 'إ': 'اأ', 'آ': 'اأ', 'ء': 'ئأ',
};
function extraLetters(letters, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = letters[Math.random() * letters.length | 0];
    const like = LOOKALIKE[base] || 'ابتنسل';
    out.push(like[Math.random() * like.length | 0]);
  }
  return out;
}

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
    const tiles = scramble([...letters, ...extraLetters(letters, Play.cfg.extra)], (a, b) => a === b);

    const slots = el('div', 'letter-slots');
    const slotEls = letters.map(() => slots.appendChild(el('div', 'letter-slot')));
    const bank = el('div', 'letter-bank');
    Play.board.append(slots, bank);
    let checking = false;

    /* فحص حرفًا بعد حرف حين تمتلئ الخانات */
    const check = async () => {
      if (slotEls.some(s => !s.firstChild)) return;
      checking = true;
      let ok = 0;
      await FX.sequence(slotEls, (s, k) => {
        const right = s.firstChild.textContent === letters[k];
        s.classList.remove('ok', 'no');
        s.classList.add(right ? 'ok' : 'no');
        if (right) ok++;
        FX.play(right ? 'good' : 'nope');
      }, 260);
      checking = false;
      if (ok === letters.length) {
        slots.classList.add('solved');
        $$('.letter-tile', Play.board).forEach(t => t.classList.add('locked'));
        const done = el('div', 'letters-word');
        done.textContent = it.word;
        Play.board.insertBefore(done, bank);
        Play.good(slots);
        Play.finish(1, { delay: 1900 });
      }
    };
    tiles.forEach(ch => {
      const b = el('button', 'letter-tile');
      b.textContent = ch;
      b.addEventListener('click', () => {
        if (Play.roundDone || checking) return;
        Play.touch();
        if (b.parentNode === bank) {
          const s = slotEls.find(x => !x.firstChild);
          if (!s) return;
          s.classList.remove('ok', 'no');
          s.appendChild(b);
          FX.play('tick');
          check();
        } else {
          b.parentNode.classList.remove('ok', 'no');
          bank.appendChild(b);
        }
      });
      bank.appendChild(b);
    });
  },
});
