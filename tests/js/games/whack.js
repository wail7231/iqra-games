/* اصطد الصحيح (Whack-a-mole) — أشكال تخرج من داخل الحفر وتختفي، وعلى كل شكل إجابة؛ يضرب الطالب الصحيحة منها.
   الأشكال تتغير بقالب الشكل (فوانيس، كواكب، زهور، بلورات ثلج، أدوات دفتر) — في whack-shapes.js.
   اللعب مستمر حتى نهاية وقت الجولة: كل ضربة صحيحة نقطة ولو تكررت الإجابة، وضرب الخاطئة يُنقص قلبًا.
   أقصى نقاط الجولة = عدد الأشكال الصحيحة التي ظهرت فيها.
   الحفرة: فتحة داكنة خلف الشكل، والشكل داخل إطار يقصّه عند منتصف الفتحة فيبدو خارجًا منها. */
'use strict';

const HOLES = 9;

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 4 },
    { key: 'roundTime', label: 'وقت كل جولة', options: [[20, '٢٠ ث'], [30, '٣٠ ث'], [45, '٤٥ ث'], [60, '٦٠ ث']], def: 30 },
    'lives',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q) {
    const corrects = answersOf(q);
    const head = Play.head(q.q, ' ');
    const sub = head.querySelector('.round-sub');
    let hits = 0, shown = 0;
    const paintSub = () => { sub.textContent = `✓ ${toAr(hits)}`; };
    paintSub();

    const bar = el('div', 'round-timebar', '<span></span>');
    Play.board.appendChild(bar);
    const field = el('div', 'whack-field');
    const holes = [...Array(HOLES)].map(() => {
      const h = el('div', 'hole', '<span class="hole-back"></span><div class="pop-clip"><div class="pop"><span class="pop-shape"></span><span class="pop-label"></span></div></div><span class="hole-lip"></span>');
      field.appendChild(h);
      return h;
    });
    Play.board.appendChild(field);
    const popOf = h => h.querySelector('.pop');

    const lvl = Play.cfg.speed;
    const stay = 2700 - lvl * 200;          // مدة بقاء الشكل ظاهرًا
    const gap = Math.max(380, 1250 - lvl * 85);
    const total = Play.cfg.roundTime * 1000;
    const token = {};
    Play._whack = token;
    const alive = () => Play._whack === token && !Play.roundDone && !Play.finished;
    let startAt = 0;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (alive()) fn(); }, ms));

    const finish = () => {
      timers.forEach(clearTimeout);
      holes.forEach(h => h.classList.remove('up'));
      if (hits) FX.burst(field, { count: 30 });
      Play.finish(hits, { delay: 1600, max: Math.max(hits, shown, 1) });
    };
    const spawn = () => {
      const free = holes.filter(h => !h.classList.contains('up'));
      if (free.length) {
        const h = free[Math.random() * free.length | 0];
        /* نحو نصف الأشكال صحيحة، فلا يطول انتظار الطالب */
        const ok = Math.random() < .5 || !q.wrong.length;
        const pool = ok ? corrects : q.wrong;
        const text = pool[Math.random() * pool.length | 0];
        const pop = popOf(h);
        const set = WHACK_SHAPES[Play.cfg.theme] || WHACK_SHAPES.classic;
        pop.className = 'pop';
        pop.querySelector('.pop-shape').innerHTML = `<svg viewBox="0 0 64 64">${set[Math.random() * set.length | 0]}</svg>`;
        pop.querySelector('.pop-label').textContent = text;
        h.dataset.ok = ok ? '1' : '';
        if (ok) shown++;
        h.classList.add('up');
        later(() => h.classList.remove('up'), stay);
      }
      later(spawn, gap * (.7 + Math.random() * .6));
    };
    const tick = () => {
      const left = Math.max(0, total - (performance.now() - startAt));
      bar.firstChild.style.width = (left / total * 100) + '%';
      if (left <= 0) finish();
      else later(tick, 100);
    };

    holes.forEach(h => h.addEventListener('pointerdown', e => {
      if (!alive() || !h.classList.contains('up') || h.classList.contains('struck')) return;
      e.preventDefault();
      Play.touch();
      h.classList.add('struck');
      later(() => h.classList.remove('struck'), 450);
      const pop = popOf(h);
      if (h.dataset.ok) {
        pop.classList.add('right');
        Play.good(pop);
        hits++;
        paintSub();
        /* النقاط تُسجَّل في نهاية الجولة؛ هنا العدّاد فقط */
        $('#scoreVal').textContent = toAr(Play.score + hits);
        FX.bump($('#scoreVal').parentNode);
      } else {
        pop.classList.add('wrong');
        Play.bad(pop);
        Play.mistake();
      }
      later(() => h.classList.remove('up'), 350);
    }));

    /* عدّ تنازلي قصير قبل كل جولة */
    const count = el('div', 'whack-count', '٣');
    field.appendChild(count);
    let n = 3;
    const countdown = () => {
      if (n > 0) { count.textContent = toAr(n--); FX.play('tick'); later(countdown, 650); return; }
      count.remove();
      startAt = performance.now();
      Play.touch();
      spawn();
      tick();
    };
    later(countdown, 300);
  },
});
