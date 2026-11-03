/* اصطد الصحيح (Whack-a-mole) — أشكال تخرج من حفر وتختفي، وعلى كل شكل إجابة؛ يضرب الطالب الصحيحة منها.
   الأشكال تتغير بقالب الشكل (فوانيس، كواكب، زهور، بلورات ثلج، أدوات دفتر) — في whack-shapes.js. كل إجابة صحيحة تُحسب مرة واحدة،
   والجولة تنتهي عند اصطياد كل الصحيحة أو انتهاء وقتها. ضرب الخاطئة يُنقص قلبًا. */
'use strict';

const HOLES = 9;

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 4 },
    { key: 'roundTime', label: 'وقت كل جولة', options: [[20, '٢٠ ث'], [30, '٣٠ ث'], [45, '٤٥ ث'], [60, '٦٠ ث']], def: 30 },
    'lives',
  ],
  points: q => answersOf(q).length,
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q) {
    const corrects = answersOf(q);
    const head = Play.head(q.q, ' ');
    const sub = head.querySelector('.round-sub');
    const hit = new Set();
    const paintSub = () => { sub.textContent = `✓ ${toAr(hit.size)} من ${toAr(corrects.length)}`; };
    paintSub();

    const bar = el('div', 'round-timebar', '<span></span>');
    Play.board.appendChild(bar);
    const field = el('div', 'whack-field');
    const holes = [...Array(HOLES)].map(() => {
      const h = el('div', 'hole', '<div class="pop"><span class="pop-shape"></span><span class="pop-label"></span></div>');
      field.appendChild(h);
      return h;
    });
    Play.board.appendChild(field);

    const lvl = Play.cfg.speed;
    const stay = 2700 - lvl * 200;          // مدة بقاء البطاقة ظاهرة
    const gap = Math.max(380, 1250 - lvl * 85);
    const total = Play.cfg.roundTime * 1000;
    const token = {};
    Play._whack = token;
    const alive = () => Play._whack === token && !Play.roundDone && !Play.finished;
    let startAt = 0, timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (alive()) fn(); }, ms));

    const finish = () => {
      timers.forEach(clearTimeout);
      holes.forEach(h => h.classList.remove('up'));
      Play.finish(hit.size, { delay: 1500 });
    };
    const spawn = () => {
      const free = holes.filter(h => !h.classList.contains('up'));
      if (free.length) {
        const h = free[Math.random() * free.length | 0];
        const waiting = corrects.filter(t => !hit.has(t));
        /* نحو نصف البطاقات صحيحة، فلا يطول انتظار الطالب */
        const ok = waiting.length && (Math.random() < .55 || !q.wrong.length);
        const text = ok ? waiting[Math.random() * waiting.length | 0] : q.wrong[Math.random() * q.wrong.length | 0];
        const pop = h.firstChild;
        const set = WHACK_SHAPES[Play.cfg.theme] || WHACK_SHAPES.classic;
        pop.className = 'pop';
        pop.querySelector('.pop-shape').innerHTML = `<svg viewBox="0 0 64 64">${set[Math.random() * set.length | 0]}</svg>`;
        pop.querySelector('.pop-label').textContent = text;
        h.dataset.text = text;
        h.dataset.ok = ok ? '1' : '';
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
      if (h.dataset.ok) {
        h.firstChild.classList.add('right');
        Play.good(h.firstChild);
        hit.add(h.dataset.text);
        paintSub();
        /* النقاط تُسجَّل مرة واحدة في نهاية الجولة؛ هنا العدّاد فقط */
        $('#scoreVal').textContent = toAr(Play.score + hit.size);
        later(() => h.classList.remove('up'), 350);
        if (hit.size === corrects.length) later(finish, 400);
      } else {
        h.firstChild.classList.add('wrong');
        Play.bad(h.firstChild);
        later(() => h.classList.remove('up'), 350);
        Play.mistake();
      }
    }));

    /* عدّ تنازلي قصير قبل كل جولة */
    const count = el('div', 'whack-count', '٣');
    field.appendChild(count);
    let n = 3;
    const countdown = () => {
      if (n > 0) { count.textContent = toAr(n--); later(countdown, 650); return; }
      count.remove();
      startAt = performance.now();
      Play.touch();
      spawn();
      tick();
    };
    later(countdown, 300);
  },
});
