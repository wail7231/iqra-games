/* الرماية — قوس على حامل في اليمين، وأهداف على اليسار وعلى كل هدف إجابة.
   يسحب الطالب للخلف كالمقلاع (بالفأرة أو بالإصبع) فيحدد الاتجاه والقوة، ثم يُفلت:
   السهم يطير في قوس بفعل الجاذبية ويدور مع اتجاه حركته. الهدف الصحيح نقطة (إن أُصيب أولًا)،
   والخاطئ ينكسر ويختفي ويُنقص قلبًا. الأهداف تتحرك صعودًا ونزولًا حسب السرعة،
   وخط التصويب المنقّط يمكن إخفاؤه للتصعيب. بلا رامٍ: القوس وحده. */
'use strict';

const ARCH_THEMES = {
  classic:  { ground: '#D9B98A', ground2: '#C49A62', hills: '#E9D3A8', rings: ['#7E2A17', '#F7E7C0', '#AB3920', '#F7E7C0', '#E3B341'], plate: '#FFFDF6', ink: '#211B17', edge: '#C9A96A', bow: '#6B4A2E', string: '#F7E7C0', shaft: '#8A5A30', fletch: '#AB3920', dots: '#7E2A17' },
  night:    { ground: '#1B2752', ground2: '#121B3D', hills: '#24346A', rings: ['#59C3F0', '#1B2752', '#59C3F0', '#1B2752', '#F6E7A8'], plate: '#1B2752', ink: '#EAF4FF', edge: '#59C3F0', bow: '#9DB3D9', string: '#F6E7A8', shaft: '#DDF4FF', fletch: '#59C3F0', dots: '#F6E7A8', glow: true },
  garden:   { ground: '#6DAA5C', ground2: '#4C9A4A', hills: '#9CCB7E', rings: ['#E5554F', '#FFFFFF', '#E5554F', '#FFFFFF', '#F7C948'], plate: '#FFFDF4', ink: '#22361F', edge: '#3F7D3A', bow: '#8A5A30', string: '#F4EED9', shaft: '#8A5A30', fletch: '#E5559A', dots: '#3F7D3A' },
  ice:      { ground: '#F7FBFF', ground2: '#DDEFF8', hills: '#CDE7F4', rings: ['#2D7FB8', '#FFFFFF', '#2D7FB8', '#FFFFFF', '#9CD5F2'], plate: '#FFFFFF', ink: '#12354A', edge: '#4A9CCB', bow: '#4A9CCB', string: '#FFFFFF', shaft: '#5A6B88', fletch: '#9CD5F2', dots: '#2D7FB8' },
  notebook: { ground: '#FDFBF3', ground2: '#DCE3EC', hills: 'rgba(43,76,126,.08)', rings: ['#2B4C7E', '#FDFBF3', '#E8A3A3', '#FDFBF3', '#2B4C7E'], plate: '#FFFFFF', ink: '#1F2F4D', edge: '#2B4C7E', bow: '#2B4C7E', string: '#5A6B88', shaft: '#2B4C7E', fletch: '#E8A3A3', dots: '#2B4C7E', sketch: true },
};

Play.register({
  settings: [
    { key: 'speed', label: 'حركة الأهداف', kind: 'range', min: 1, max: 10, def: 3 },
    { key: 'guide', label: 'خط التصويب', options: [[1, 'ظاهر'], [0, 'مخفي']], def: 1 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q) {
    Play.head(q.q);
    const wrap = el('div', 'arch-wrap');
    const cv = el('canvas', 'arch-canvas');
    wrap.appendChild(cv);
    Play.board.appendChild(wrap);
    const ctx = cv.getContext('2d');
    const token = {};
    Play._arch = token;
    const alive = () => Play._arch === token && cv.isConnected && !Play.finished;

    /* لكل هدف عمود وممر خاص به في الجهة اليسرى: صف واحد حتى ٣ أهداف وصفّان لأكثر،
       ويتحرك الهدف داخل ممره فقط، وعرض شريطه لا يتجاوز عموده — فلا تتداخل الأهداف أبدًا */
    const answers = shuffle([...answersOf(q).map(t => ({ t, ok: true })), ...q.wrong.map(t => ({ t, ok: false }))]).slice(0, 6);
    const rows = answers.length <= 3 ? 1 : 2, cols = Math.ceil(answers.length / rows);
    const targets = answers.map((a, i) => ({
      ...a, col: i % cols, row: Math.floor(i / cols), phase: Math.random() * 6.28,
      x: 0, y: 0, base: 0, amp: 0, maxLabel: 120, alive: true, hit: 0, broken: 0, stuck: [],
    }));
    const layout = () => {
      const left = W * .05, area = W * .6;
      const colW = area / cols;
      R = Math.max(18, Math.min(R, colW * .28));
      const top = 16, bandH = (H - 64 - top) / rows;
      const block = R * 3.7;
      targets.forEach(t => {
        t.x = left + colW * (t.col + .5);
        t.base = top + bandH * t.row + Math.max(R + 6, (bandH - block) / 2 + R);
        t.amp = Math.max(0, (bandH - block) / 2 - 4);
        t.maxLabel = Math.max(70, colW - 14);
      });
    };
    token.targets = targets;   // للفحص من أدوات المطوّر
    let W = 0, H = 0, R = 30, g = 600, vmax = 900, missed = false, done = false;
    const bow = { x: 0, y: 0 };
    const size = () => {
      W = wrap.clientWidth;
      const cap = document.body.classList.contains('is-fs') ? window.innerHeight * .74 : 480;
      H = Math.round(Math.min(cap, Math.max(300, W * .56)));
      const dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.max(22, Math.min(36, W * .042));
      g = H * 1.7;
      vmax = Math.sqrt(g * W * 1.25);
      bow.x = W - Math.max(60, W * .08);
      bow.y = H - Math.max(110, H * .3);
      layout();
    };
    size();
    window.addEventListener('resize', () => { if (alive()) size(); });
    token.physics = () => ({ bow, g, vmax, MAXPULL: 150, rect: cv.getBoundingClientRect() });   // للفحص

    /* التصويب: سحب للخلف من أي مكان في اللوحة */
    let aim = null, arrow = null;
    const MAXPULL = 150;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const pullOf = () => {
      let px = aim.sx - aim.x, py = aim.sy - aim.y;
      const len = Math.hypot(px, py);
      if (len > MAXPULL) { px *= MAXPULL / len; py *= MAXPULL / len; }
      return { px, py, len: Math.min(len, MAXPULL) };
    };
    const velocityOf = p => ({ vx: p.px / MAXPULL * vmax, vy: p.py / MAXPULL * vmax });
    cv.addEventListener('pointerdown', e => {
      if (Play.roundDone || arrow || done) return;
      e.preventDefault();
      Play.touch();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      const p = pos(e);
      aim = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    });
    cv.addEventListener('pointermove', e => { if (aim) { const p = pos(e); aim.x = p.x; aim.y = p.y; } });
    const release = () => {
      if (!aim) return;
      const p = pullOf();
      aim = null;
      if (p.len < 14) return;
      const v = velocityOf(p);
      arrow = { x: bow.x, y: bow.y, vx: v.vx, vy: v.vy };
      FX.play('pop');
    };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', () => { aim = null; });

    const T = () => ARCH_THEMES[Play.cfg.theme] || ARCH_THEMES.classic;
    const font = size => `${Play.quran ? 400 : 700} ${size}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;

    function hitTarget(t) {
      const r = cv.getBoundingClientRect();
      const screen = { x: r.left + t.x, y: r.top + t.y };
      t.stuck.push({ dx: arrow.x - t.x, dy: arrow.y - t.y, a: Math.atan2(arrow.vy, arrow.vx) });
      arrow = null;
      if (t.ok) {
        t.hit = 1;
        done = true;
        FX.burst(screen, { count: 30 });
        FX.floatText(screen, missed ? '✓' : '+١');
        FX.play('ok');
        Play.finish(missed ? 0 : 1, { delay: 1500 });
      } else {
        t.broken = .001;
        missed = true;
        FX.floatText(screen, '✗', '#C0392B');
        FX.play('bad');
        Play.mistake();
      }
    }

    /* ---------- الرسم ---------- */
    function drawGround(th) {
      ctx.fillStyle = th.hills;
      ctx.beginPath();
      ctx.moveTo(0, H - 60);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H - 70 - Math.sin(x / 90) * 18 - Math.sin(x / 37) * 6);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();
      const gr = ctx.createLinearGradient(0, H - 46, 0, H);
      gr.addColorStop(0, th.ground);
      gr.addColorStop(1, th.ground2);
      ctx.fillStyle = gr;
      ctx.fillRect(0, H - 46, W, 46);
      if (th.sketch) { ctx.strokeStyle = th.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H - 46); ctx.lineTo(W, H - 46); ctx.stroke(); }
    }
    function drawTarget(t, th, time) {
      const shake = t.broken ? Math.sin(time * 60) * 4 * (1 - t.broken) : 0;
      ctx.save();
      ctx.translate(t.x + shake, t.y);
      if (t.broken) { ctx.globalAlpha = Math.max(0, 1 - t.broken); ctx.rotate(t.broken * .6); }
      if (th.glow) { ctx.shadowColor = th.edge; ctx.shadowBlur = 14; }
      /* حامل الهدف */
      ctx.strokeStyle = th.bow;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-R * .5, R * .6); ctx.lineTo(-R * .8, R * 1.5); ctx.moveTo(R * .5, R * .6); ctx.lineTo(R * .8, R * 1.5); ctx.stroke();
      th.rings.forEach((c, k) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(0, 0, R * (1 - k * .19), 0, 7); ctx.fill();
        if (th.sketch) { ctx.strokeStyle = th.edge; ctx.lineWidth = 1.5; ctx.stroke(); }
      });
      ctx.shadowBlur = 0;
      if (t.hit) { ctx.strokeStyle = '#3F8A3A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R + 4 + Math.sin(time * 10) * 2, 0, 7); ctx.stroke(); }
      t.stuck.forEach(s => drawArrow(s.dx, s.dy, s.a, th, .75));
      /* شريط الإجابة تحت الهدف */
      ctx.font = font(Math.max(13, Math.min(18, R * .55)));
      const tw = Math.min(ctx.measureText(t.t).width + 22, t.maxLabel);
      const py = R * 1.55;
      ctx.fillStyle = t.hit ? '#3F8A3A' : th.plate;
      ctx.strokeStyle = t.hit ? '#3F8A3A' : th.edge;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-tw / 2, py, tw, R * .95, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t.hit ? '#fff' : th.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.t, 0, py + R * .5, tw - 12);
      ctx.restore();
    }
    function drawArrow(x, y, a, th, scale = 1) {
      const L = 54 * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = th.shaft;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#5A5A5A';
      ctx.beginPath(); ctx.moveTo(6 * scale, 0); ctx.lineTo(-6 * scale, -5 * scale); ctx.lineTo(-6 * scale, 5 * scale); ctx.fill();
      ctx.fillStyle = th.fletch;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 8 * scale, -7 * scale); ctx.lineTo(-L + 10 * scale, 0); ctx.lineTo(-L - 8 * scale, 7 * scale); ctx.fill();
      ctx.restore();
    }
    function drawBow(th, pull) {
      const a = pull ? Math.atan2(pull.py, pull.px) : Math.PI;   // نحو اليسار افتراضيًا
      const back = pull ? pull.len / MAXPULL * 34 : 0;
      ctx.save();
      ctx.translate(bow.x, bow.y);
      /* الحامل */
      ctx.strokeStyle = th.bow;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(-18, H - bow.y - 30); ctx.moveTo(0, 26); ctx.lineTo(18, H - bow.y - 30); ctx.stroke();
      ctx.rotate(a);
      /* القوس: قوسان من الخشب ووتر يُشد للخلف */
      if (th.glow) { ctx.shadowColor = th.edge; ctx.shadowBlur = 12; }
      ctx.strokeStyle = th.bow;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-8, -48); ctx.quadraticCurveTo(26, 0, -8, 48); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = th.string;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(-8 - back, 0); ctx.lineTo(-8, 48); ctx.stroke();
      ctx.restore();
      if (!arrow && !done) drawArrow(bow.x + Math.cos(a) * (30 - back), bow.y + Math.sin(a) * (30 - back), a, th);
    }
    function drawGuide(th, pull) {
      if (!Play.cfg.guide || !pull || pull.len < 14) return;
      const v = velocityOf(pull);
      ctx.fillStyle = th.dots;
      for (let i = 1; i <= 14; i++) {
        const t = i * .028;
        const x = bow.x + v.vx * t, y = bow.y + v.vy * t + .5 * g * t * t;
        ctx.globalAlpha = 1 - i / 15;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    let last = performance.now(), clock = 0;

    function frame(now) {
      if (!alive()) return;
      const dt = Math.min(.035, (now - last) / 1000);
      last = now;
      clock += dt;
      const th = T();
      targets.forEach(t => {
        t.y = t.base + Math.sin(clock * (.6 + Play.cfg.speed * .12) + t.phase) * t.amp * Play.cfg.speed / 10;
        if (t.broken) { t.broken += dt * 1.6; if (t.broken >= 1) t.alive = false; }
      });
      if (arrow) {
        arrow.vy += g * dt;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        const a = Math.atan2(arrow.vy, arrow.vx);
        const tip = { x: arrow.x + Math.cos(a) * 6, y: arrow.y + Math.sin(a) * 6 };
        const t = targets.find(t => t.alive && !t.broken && Math.hypot(tip.x - t.x, tip.y - t.y) < R);
        if (t) hitTarget(t);
        else if (arrow.x < -60 || arrow.x > W + 60 || arrow.y > H + 60) arrow = null;
      }
      ctx.clearRect(0, 0, W, H);
      drawGround(th);
      targets.filter(t => t.alive).forEach(t => drawTarget(t, th, clock));
      const pull = aim ? pullOf() : null;
      drawGuide(th, pull);
      drawBow(th, pull);
      if (arrow) drawArrow(arrow.x, arrow.y, Math.atan2(arrow.vy, arrow.vx), th);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
});
