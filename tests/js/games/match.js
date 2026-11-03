/* المطابقة — عمود ثابت من العناصر، وبجانب كل عنصر خانة؛ وبطاقات العمود الآخر مبعثرة تحتها.
   يضع الطالب كل بطاقة بجانب ما يناسبه (سحبًا أو ضغطًا)، ثم «تأكيد» يكشف النتيجة سطرًا بعد سطر،
   ويظهر الصحيح تحت الخاطئ. نقطة لكل زوج صحيح. */
'use strict';

Play.register({
  settings: ['timer'],
  points: it => it.pairs.length,
  label: it => it.title || it.pairs.slice(0, 3).map(p => p[0]).join('، ') + '…',
  answer: it => it.pairs.map(p => `${p[0]} ← ${p[1]}`).join('، '),
  round(it) {
    Play.head(it.title || '');
    const rows = el('div', 'match-rows');
    const slots = it.pairs.map((p, k) => {
      const r = el('div', 'match-row', '<div class="mr-left"></div><div class="mr-slot"></div>');
      r.firstChild.textContent = p[0];
      r.firstChild.style.setProperty('--c', CHIP_COLORS[k % CHIP_COLORS.length]);
      r.dataset.k = k;
      rows.appendChild(r);
      return r;
    });
    const pool = el('div', 'word-bank match-pool');
    Play.board.append(rows, pool);
    let selectedRow = null;

    const confirm = actionBtn('تأكيد', 'btn-primary', () => grade());
    actionBar(confirm);
    const slotOf = r => r.lastChild;
    const refresh = () => {
      confirm.disabled = slots.some(r => !slotOf(r).firstChild);
      slots.forEach(r => r.classList.toggle('filled', !!slotOf(r).firstChild));
    };
    const place = (card, r) => {
      const old = slotOf(r).firstChild;
      const from = card.closest('.match-row');
      if (old && old !== card) { if (from) slotOf(from).appendChild(old); else pool.appendChild(old); }
      slotOf(r).appendChild(card);
      if (selectedRow) { selectedRow.classList.remove('sel'); selectedRow = null; }
      FX.play('tick');
      refresh();
    };

    shuffle(it.pairs.map((p, k) => ({ t: p[1], k }))).forEach(({ t, k }) => {
      const card = el('div', 'bank-chip match-card');
      card.textContent = t;
      card.dataset.k = k;
      card.style.setProperty('--c', '#4F6475');
      dragItem(card, {
        targets: '.match-row, .match-pool',
        onDrop(target) {
          if (!target) return;
          if (target.classList.contains('match-pool')) { pool.appendChild(card); refresh(); }
          else place(card, target);
        },
        onTap() {
          if (card.closest('.match-row')) { pool.appendChild(card); refresh(); return; }
          const r = selectedRow || slots.find(x => !slotOf(x).firstChild);
          if (r) place(card, r);
        },
      });
      pool.appendChild(card);
    });
    slots.forEach(r => r.addEventListener('click', e => {
      if (Play.roundDone || slotOf(r).firstChild || e.target.closest('.match-card')) return;
      if (selectedRow) selectedRow.classList.remove('sel');
      selectedRow = selectedRow === r ? null : r;
      if (selectedRow) r.classList.add('sel');
    }));
    refresh();

    async function grade() {
      if (Play.roundDone || rows.classList.contains('grading')) return;
      rows.classList.add('grading');
      confirm.remove();
      $$('.match-card', Play.board).forEach(c => c.classList.add('locked'));
      let right = 0;
      await FX.sequence(slots, (r, k) => {
        const ok = +slotOf(r).firstChild.dataset.k === k;
        r.classList.add(ok ? 'right' : 'wrong', 'revealed');
        if (ok) { right++; FX.play('good'); }
        else {
          FX.play('nope');
          const fix = el('small', 'mr-fix');
          fix.textContent = it.pairs[k][1];
          r.appendChild(fix);
        }
      }, 480);
      if (right === slots.length) Play.good(rows, right);
      Play.finish(right, { manual: true });
    }
  },
});
