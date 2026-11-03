/* أكمل الفراغات — النص بكلمات مخفية، وتحته بنك كلمات (المخفية + كلمات خاطئة يضعها المعلم).
   يضع الطالب الكلمات في الفراغات (سحبًا، أو ضغطًا: الكلمة تذهب إلى الفراغ المحدد أو أول فراغ فارغ)،
   ثم يضغط «تأكيد»: تُقفل اللوحة، نقطة لكل فراغ صحيح، ويظهر الصحيح فوق الخاطئ. */
'use strict';

const tokensOf = it => it.text.trim().split(/\s+/);

Play.register({
  settings: ['timer'],
  points: it => it.hidden.length,
  label: it => tokensOf(it).map((w, i) => it.hidden.includes(i) ? '……' : w).join(' '),
  answer: it => it.hidden.map(i => tokensOf(it)[i]).join('، '),
  round(it) {
    const tokens = tokensOf(it);
    const hidden = new Set(it.hidden);
    Play.head('');
    const text = el('div', 'blanks-text');
    const blanks = [];
    tokens.forEach((w, i) => {
      if (hidden.has(i)) {
        const b = el('span', 'blank');
        b.dataset.answer = w;
        text.appendChild(b);
        blanks.push(b);
      } else {
        text.appendChild(el('span', 'bt-word')).textContent = w;
      }
      text.appendChild(document.createTextNode(' '));
    });
    const bank = el('div', 'word-bank');
    Play.board.append(text, bank);
    let selected = null;

    const confirm = actionBtn('تأكيد', 'btn-primary', () => grade());
    actionBar(confirm);
    const refresh = () => {
      confirm.disabled = blanks.some(b => !b.firstChild);
      blanks.forEach(b => b.classList.toggle('filled', !!b.firstChild));
    };
    const select = b => {
      if (selected) selected.classList.remove('sel');
      selected = selected === b ? null : b;
      if (selected) selected.classList.add('sel');
    };
    const place = (chip, b) => {
      const old = b.firstChild;
      const from = chip.closest('.blank');
      if (old && old !== chip) { if (from) from.appendChild(old); else bank.appendChild(old); }
      b.appendChild(chip);
      if (selected) select(selected);
      refresh();
    };

    shuffle([...it.hidden.map(i => tokens[i]), ...(it.wrong || [])]).forEach((w, k) => {
      const chip = el('span', 'bank-chip');
      chip.textContent = w;
      chip.style.setProperty('--c', CHIP_COLORS[k % CHIP_COLORS.length]);
      dragItem(chip, {
        targets: '.blank, .word-bank',
        onDrop(t) {
          if (!t) return;
          if (t.classList.contains('word-bank')) { bank.appendChild(chip); refresh(); }
          else place(chip, t);
        },
        onTap() {
          if (chip.closest('.blank')) { bank.appendChild(chip); refresh(); return; }
          const b = selected || blanks.find(x => !x.firstChild);
          if (b) place(chip, b);
        },
      });
      bank.appendChild(chip);
    });
    blanks.forEach(b => b.addEventListener('click', e => {
      if (Play.roundDone || e.target.closest('.bank-chip')) return;
      select(b);
    }));
    refresh();

    /* النتيجة تظهر فراغًا بعد فراغ */
    async function grade() {
      if (Play.roundDone || text.classList.contains('grading')) return;
      text.classList.add('grading');
      confirm.remove();
      $$('.bank-chip', Play.board).forEach(c => c.classList.add('locked'));
      let right = 0;
      await FX.sequence(blanks, b => {
        const ok = b.firstChild.textContent === b.dataset.answer;
        b.classList.add(ok ? 'right' : 'wrong', 'revealed');
        if (ok) { right++; FX.play('good'); FX.floatText(b, '+١'); }
        else {
          FX.play('nope');
          const fix = el('span', 'blank-fix');
          fix.textContent = b.dataset.answer;
          b.appendChild(fix);
        }
      }, 520);
      if (right === blanks.length) Play.good(text, right);
      Play.finish(right, { manual: true });
    }
  },
});
