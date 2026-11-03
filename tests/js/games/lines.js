/* ترتيب الجمل (أو الآيات) — الجمل مبعثرة على اليمين، وخانات مرقّمة على اليسار.
   يضع الطالب كل جملة في خانتها (سحبًا أو ضغطًا)، ولا يعرف الصواب حتى يضغط «تأكيد»؛
   بعدها تُقفل اللوحة: نقطة لكل جملة في مكانها الصحيح، ويظهر الصحيح تحت الخاطئة. */
'use strict';

Play.register({
  settings: ['timer'],
  points: it => it.lines.length,
  label: it => it.title || it.lines[0],
  answer: it => it.lines.join(' ۝ '),
  round(it) {
    Play.head(it.title || '');
    const wrap = el('div', 'lines-wrap');
    const pool = el('div', 'line-pool');
    const slots = el('div', 'line-slots');
    wrap.append(pool, slots);
    Play.board.appendChild(wrap);

    const cards = scramble(it.lines.map((t, i) => i)).map(i => {
      const c = el('div', 'line-card');
      c.textContent = it.lines[i];
      c.dataset.i = i;
      return c;
    });
    const slotEls = it.lines.map((_, k) => {
      const s = el('div', 'line-slot', `<span class="ls-num">${toAr(k + 1)}</span><div class="ls-drop"></div>`);
      s.dataset.k = k;
      slots.appendChild(s);
      return s;
    });
    const dropOf = s => s.querySelector('.ls-drop');
    let selectedSlot = null;

    const confirm = actionBtn('تأكيد', 'btn-primary', () => grade());
    actionBar(confirm);
    const refresh = () => {
      confirm.disabled = slotEls.some(s => !dropOf(s).firstChild);
      slotEls.forEach(s => s.classList.toggle('filled', !!dropOf(s).firstChild));
    };
    const toPool = c => { pool.appendChild(c); refresh(); };
    const toSlot = (c, s) => {
      const old = dropOf(s).firstChild;
      const from = c.closest('.line-slot');
      if (old && old !== c) { if (from) dropOf(from).appendChild(old); else pool.appendChild(old); }
      dropOf(s).appendChild(c);
      refresh();
    };
    const firstEmpty = () => slotEls.find(s => !dropOf(s).firstChild);

    cards.forEach(c => {
      dragItem(c, {
        targets: '.line-slot, .line-pool',
        onDrop(t) {
          if (!t) return;
          if (t.classList.contains('line-pool')) toPool(c);
          else toSlot(c, t);
        },
        onTap() {
          if (c.closest('.line-slot')) { toPool(c); return; }
          const s = selectedSlot || firstEmpty();
          if (s) toSlot(c, s);
          if (selectedSlot) { selectedSlot.classList.remove('sel'); selectedSlot = null; }
        },
      });
      pool.appendChild(c);
    });
    /* ضغطة على خانة فارغة تحددها، فتذهب إليها الجملة التالية المضغوطة */
    slotEls.forEach(s => s.addEventListener('click', e => {
      if (Play.roundDone || dropOf(s).firstChild || e.target.closest('.line-card')) return;
      if (selectedSlot) selectedSlot.classList.remove('sel');
      selectedSlot = selectedSlot === s ? null : s;
      if (selectedSlot) s.classList.add('sel');
    }));
    refresh();

    /* النتيجة تظهر خانةً بعد خانة: أخضر للصحيحة وأحمر للخاطئة */
    async function grade() {
      if (Play.roundDone || wrap.classList.contains('grading')) return;
      wrap.classList.add('grading', 'graded');
      confirm.remove();
      $$('.line-card', wrap).forEach(c => c.classList.add('locked'));
      let right = 0;
      await FX.sequence(slotEls, (s, k) => {
        const ok = +dropOf(s).firstChild.dataset.i === k;
        s.classList.add(ok ? 'right' : 'wrong', 'revealed');
        if (ok) { right++; FX.play('good'); FX.floatText(s.querySelector('.ls-num'), '+١'); }
        else {
          FX.play('nope');
          const fix = el('div', 'ls-fix');
          fix.textContent = it.lines[k];
          s.appendChild(fix);
        }
      }, 520);
      if (right === slotEls.length) Play.good(wrap, right);
      Play.finish(right, { manual: true });
    }
  },
});
