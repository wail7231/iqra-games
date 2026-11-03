/* المصنِّف — بطاقات مبعثرة ومجموعات ملوّنة (من ٢ إلى ٤)؛ يضع الطالب كل بطاقة في مجموعتها
   (سحبًا، أو ضغطًا على البطاقة ثم على المجموعة). «تأكيد» يكشف النتيجة بطاقةً بعد بطاقة،
   ويظهر اسم المجموعة الصحيحة تحت البطاقة الخاطئة. نقطة لكل بطاقة صحيحة. */
'use strict';

Play.register({
  settings: ['timer'],
  points: it => it.groups.reduce((s, g) => s + g.items.length, 0),
  label: it => it.title || it.groups.map(g => g.name).join(' / '),
  answer: it => it.groups.map(g => `${g.name}: ${g.items.join('، ')}`).join(' — '),
  round(it) {
    Play.head(it.title || '');
    const cols = el('div', 'group-cols');
    cols.style.setProperty('--n', it.groups.length);
    const zones = it.groups.map((g, gi) => {
      const z = el('div', 'group-zone', '<div class="gz-head"></div><div class="gz-body"></div>');
      z.dataset.g = gi;
      z.style.setProperty('--c', CHIP_COLORS[gi % CHIP_COLORS.length]);
      z.firstChild.textContent = g.name;
      cols.appendChild(z);
      return z;
    });
    const pool = el('div', 'group-pool');
    Play.board.append(cols, pool);
    let selected = null;

    const confirm = actionBtn('تأكيد', 'btn-primary', () => grade());
    actionBar(confirm);
    const refresh = () => { confirm.disabled = pool.children.length > 0; };
    const select = c => {
      if (selected) selected.classList.remove('sel');
      selected = selected === c ? null : c;
      if (selected) selected.classList.add('sel');
    };
    const put = (c, z) => { z.lastChild.appendChild(c); if (selected === c) select(c); FX.play('tick'); refresh(); };

    shuffle(it.groups.flatMap((g, gi) => g.items.map(t => ({ t, gi })))).forEach(({ t, gi }) => {
      const c = el('div', 'sort-card');
      c.textContent = t;
      c.dataset.g = gi;
      dragItem(c, {
        targets: '.group-zone, .group-pool',
        onDrop(target) {
          if (!target) return;
          if (target.classList.contains('group-pool')) { pool.appendChild(c); refresh(); }
          else put(c, target);
        },
        onTap() {
          if (c.parentNode !== pool) { pool.appendChild(c); refresh(); return; }
          select(c);
        },
      });
      pool.appendChild(c);
    });
    zones.forEach(z => z.addEventListener('click', e => {
      if (Play.roundDone || !selected || e.target.closest('.sort-card')) return;
      put(selected, z);
    }));
    refresh();

    async function grade() {
      if (Play.roundDone || cols.classList.contains('grading')) return;
      cols.classList.add('grading');
      confirm.remove();
      let right = 0;
      const cards = zones.flatMap(z => [...z.lastChild.children].map(c => ({ c, z })));
      cards.forEach(({ c }) => c.classList.add('locked'));
      await FX.sequence(cards, ({ c, z }) => {
        const ok = c.dataset.g === z.dataset.g;
        c.classList.add(ok ? 'right' : 'wrong', 'revealed');
        if (ok) { right++; FX.play('good'); }
        else {
          FX.play('nope');
          const fix = el('small', 'sort-fix');
          fix.textContent = '← ' + it.groups[+c.dataset.g].name;
          c.appendChild(fix);
        }
      }, 380);
      if (right === cards.length) Play.good(cols, right);
      Play.finish(right, { manual: true });
    }
  },
});
