/* الكرة القافزة (بلاتفورمر بسيط) — كرة تتدحرج وحدها، والمنصات تأتي نحوها وعلى كل منصة إجابة.
   ضغطة على اللوحة (أو مسافة / سهم أعلى) = قفزة. الهبوط على منصة = اختيار إجابتها:
   الصحيحة نقطة (إن كانت أول اختيار)، والخاطئة تتفتت وتسقط وتُنقص قلبًا.
   إن مرّت كل المنصات دون اختيار عادت من جديد. المنصات تعبر من تحت الكرة (من جهة واحدة).
   المشهد يبقى بين الأسئلة (لا يُعاد بناؤه) فتستمر الكرة في الجري. شكل الكرة والمنصات والخلفية يتبع القالب. */
'use strict';

const RUN_THEMES = {
  classic:  { far: '#E9D3A8', far2: '#D9BE8C', ground: '#D9B98A', groundTop: '#C49A62', plat: '#C9A26A', platEdge: '#7E5A2E', ink: '#2A1A0E', ball: '#E3B341', ballLine: '#7E2A17', deco: 'domes' },
  night:    { far: '#1E2B5C', far2: '#16224A', ground: '#16224A', groundTop: '#59C3F0', plat: '#1B2752', platEdge: '#59C3F0', ink: '#EAF4FF', ball: '#F6E7A8', ballLine: '#F2A516', deco: 'hills', glow: true },
  garden:   { far: '#9CCB7E', far2: '#7DB867', ground: '#8A5A30', groundTop: '#5FA052', plat: '#8A5A30', platEdge: '#5FA052', ink: '#FFFDF4', ball: '#F7C948', ballLine: '#E07A1F', deco: 'trees' },
  ice:      { far: '#CDE7F4', far2: '#FFFFFF', ground: '#F7FBFF', groundTop: '#BFE3F3', plat: '#BFE3F3', platEdge: '#4A9CCB', ink: '#12354A', ball: '#FFFFFF', ballLine: '#9CCFEA', deco: 'mountains' },
  notebook: { far: 'rgba(43,76,126,.1)', far2: 'rgba(43,76,126,.18)', ground: 'rgba(0,0,0,0)', groundTop: '#2B4C7E', plat: '#FFFFFF', platEdge: '#2B4C7E', ink: '#1F2F4D', ball: '#FFFFFF', ballLine: '#2B4C7E', deco: 'hills', sketch: true },
};
let RUN = null;

function runnerScene() {
  const wrap = el('div', 'run-wrap keep');
  const cv = el('canvas', 'run-canvas');
  const start = el('div', 'run-start', '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
  wrap.append(cv, start);
  const ctx = cv.getContext('2d');
  const S = {
    wrap, q: null, plats: [], running: false, missed: false, answered: false, dist: 0,
    ball: { y: 0, vy: 0, on: null }, W: 0, H: 0, gy: 0, r: 16,
  };
  const g = 2100, jumpV = 800;
  const size = () => {
    S.W = wrap.clientWidth;
    const cap = document.body.classList.contains('is-fs') ? window.innerHeight * .72 : 420;
    S.H = Math.round(Math.min(cap, Math.max(280, S.W * .48)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = S.W * dpr;
    cv.height = S.H * dpr;
    cv.style.height = S.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.gy = S.H - 52;
    S.bx = S.W * .78;
    if (!S.ball.y || !S.ball.on) S.ball.y = Math.min(S.ball.y || S.gy - S.r, S.gy - S.r);
  };
  S.size = size;
  window.addEventListener('resize', () => { if (wrap.isConnected) size(); });
  const T = () => RUN_THEMES[Play.cfg.theme] || RUN_THEMES.classic;
  const speed = () => 150 + Play.cfg.speed * 22;
  const font = px => `${Play.quran ? 400 : 700} ${px}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;

  /* منصات السؤال: واحدة لكل إجابة، تبدأ خارج اللوحة يسارًا وتتباعد */
  S.spawn = () => {
    const q = S.q;
    const answers = shuffle([...answersOf(q).map(t => ({ t, ok: true })), ...q.wrong.map(t => ({ t, ok: false }))]);
    ctx.font = font(16);
    let x = -40;
    answers.forEach(a => {
      const w = Math.max(120, Math.min(S.W * .32, ctx.measureText(a.t).width + 36));
      x -= w;
      S.plats.push({ ...a, x, w, top: S.gy - 70 - Math.random() * 55, state: '', fall: 0, round: S.q });
      x -= 150 + Math.random() * 90;
    });
  };
  S.setQuestion = q => {
    S.q = q;
    S.missed = false;
    S.answered = false;
    S.plats = S.plats.filter(p => p.state);   // منصات محسومة تكمل طريقها
    S.spawn();
  };
  const jump = () => {
    if (Play.roundDone && !S.running) return;
    if (!S.running) { S.running = true; start.classList.add('hidden'); Play.touch(); return; }
    const onGround = S.ball.y >= S.gy - S.r - .5;
    if (onGround || S.ball.on) { S.ball.vy = -jumpV; S.ball.on = null; FX.play('tick'); }
  };
  S.jump = jump;
  cv.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  start.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });

  function land(p) {
    S.ball.on = p;
    if (p.state || S.answered) return;
    const r = cv.getBoundingClientRect();
    const pt = { x: r.left + S.bx, y: r.top + p.top - 10 };
    if (p.ok) {
      p.state = 'good';
      S.answered = true;
      FX.burst(pt, { count: 28 });
      FX.floatText(pt, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 900 });
    } else {
      p.state = 'bad';
      S.missed = true;
      S.ball.on = null;
      FX.floatText(pt, '✗', '#C0392B');
      FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- الرسم ---------- */
  function drawBack(th) {
    const off = S.dist * .15;
    ctx.fillStyle = th.far;
    ctx.beginPath();
    ctx.moveTo(0, S.gy);
    for (let x = 0; x <= S.W + 20; x += 20) {
      const wx = x - off;
      const y = th.deco === 'mountains'
        ? S.gy - 90 - Math.abs(((wx / 160) % 2 + 2) % 2 - 1) * 80
        : S.gy - 50 - Math.sin(wx / 120) * 26 - Math.sin(wx / 47) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(S.W, S.gy);
    ctx.fill();
    if (th.sketch) { ctx.strokeStyle = th.platEdge; ctx.lineWidth = 1.5; ctx.stroke(); }
    /* زينة بعيدة: قباب، أشجار، قمم ثلجية */
    const off2 = S.dist * .3;
    for (let k = -1; k < S.W / 220 + 2; k++) {
      const x = ((k * 220 + off2) % (S.W + 220) + S.W + 220) % (S.W + 220) - 110;
      ctx.fillStyle = th.far2;
      if (th.deco === 'domes') {
        ctx.beginPath(); ctx.arc(x, S.gy - 38, 22, Math.PI, 0); ctx.fill();
        ctx.fillRect(x - 22, S.gy - 38, 44, 38);
        ctx.fillRect(x + 34, S.gy - 86, 8, 86);
        ctx.beginPath(); ctx.arc(x + 38, S.gy - 86, 7, Math.PI, 0); ctx.fill();
      } else if (th.deco === 'trees') {
        ctx.fillStyle = '#7A4A1F'; ctx.fillRect(x - 4, S.gy - 40, 8, 40);
        ctx.fillStyle = '#4C9A4A'; ctx.beginPath(); ctx.arc(x, S.gy - 52, 24, 0, 7); ctx.arc(x - 16, S.gy - 40, 15, 0, 7); ctx.arc(x + 16, S.gy - 40, 15, 0, 7); ctx.fill();
      } else if (th.deco === 'mountains') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(x - 26, S.gy - 120); ctx.lineTo(x, S.gy - 150); ctx.lineTo(x + 26, S.gy - 120); ctx.fill();
      }
    }
    /* الأرض */
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, S.gy, S.W, S.H - S.gy);
    ctx.strokeStyle = th.groundTop;
    ctx.lineWidth = th.glow ? 3 : 6;
    if (th.glow) { ctx.shadowColor = th.groundTop; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.moveTo(0, S.gy); ctx.lineTo(S.W, S.gy); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function drawPlat(p, th) {
    ctx.save();
    if (p.state === 'bad') { ctx.translate(p.x + p.w / 2, p.top + p.fall * 260); ctx.rotate(p.fall * .9); ctx.globalAlpha = 1 - p.fall; ctx.translate(-(p.x + p.w / 2), -p.top); }
    const h = 34;
    const good = p.state === 'good';
    if (th.glow) { ctx.shadowColor = good ? '#3F8A3A' : th.platEdge; ctx.shadowBlur = 14; }
    ctx.fillStyle = good ? '#3F8A3A' : p.state === 'bad' ? '#C0392B' : th.plat;
    ctx.strokeStyle = good ? '#2E6B2A' : th.platEdge;
    ctx.lineWidth = th.sketch ? 2.5 : 3;
    ctx.beginPath(); ctx.roundRect(p.x, p.top, p.w, h, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (th.deco === 'trees' && !good && p.state !== 'bad') { ctx.fillStyle = '#5FA052'; ctx.beginPath(); ctx.roundRect(p.x - 2, p.top - 4, p.w + 4, 10, 5); ctx.fill(); }
    if (th.deco === 'mountains' && !good) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(p.x + 4, p.top - 3, p.w - 8, 7, 4); ctx.fill(); }
    if (th.sketch) { ctx.strokeStyle = 'rgba(43,76,126,.35)'; ctx.lineWidth = 1; for (let k = 10; k < p.w; k += 10) { ctx.beginPath(); ctx.moveTo(p.x + k, p.top + h); ctx.lineTo(p.x + k - 8, p.top + 2); ctx.stroke(); } }
    ctx.fillStyle = good || p.state === 'bad' ? '#FFFFFF' : th.ink;
    ctx.font = font(Math.min(18, Math.max(14, S.W * .018)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.t, p.x + p.w / 2, p.top + h / 2 + 1, p.w - 14);
    ctx.restore();
  }
  function drawBall(th) {
    const { bx } = S, by = S.ball.y, r = S.r;
    ctx.save();
    ctx.translate(bx, by);
    /* ظل على الأرض */
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(0, S.gy - by + 2, r * Math.max(.4, 1 - (S.gy - by - r) / 200), 4, 0, 0, 7); ctx.fill();
    if (th.glow) { ctx.shadowColor = th.ball; ctx.shadowBlur = 22; }
    ctx.fillStyle = th.ball;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = th.ballLine;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    /* نقش يدور مع التدحرج: نجمة ثمانية */
    ctx.rotate(-S.dist / r);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.moveTo(Math.cos(a) * r * .75, Math.sin(a) * r * .75); ctx.lineTo(-Math.cos(a) * r * .75, -Math.sin(a) * r * .75); }
    ctx.stroke();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    if (!wrap.isConnected) return;
    const dt = Math.min(.035, (now - last) / 1000);
    last = now;
    const th = T();
    if (S.running && !Play.finished) {
      const v = speed() * dt;
      S.dist += v;
      S.plats.forEach(p => { p.x += v; if (p.state === 'bad') p.fall = Math.min(1, p.fall + dt * 1.4); });
      /* الكرة: جاذبية وهبوط على منصة أو الأرض */
      const b = S.ball;
      if (b.on && (b.on.state === 'bad' || S.bx < b.on.x || S.bx > b.on.x + b.on.w)) b.on = null;
      if (!b.on) {
        const prev = b.y;
        b.vy += g * dt;
        b.y += b.vy * dt;
        if (b.vy > 0) {
          const p = S.plats.find(p => p.state !== 'bad' && S.bx >= p.x - 4 && S.bx <= p.x + p.w + 4 && prev + S.r <= p.top + 2 && b.y + S.r >= p.top);
          if (p) { b.y = p.top - S.r; b.vy = 0; land(p); }
        }
        if (b.y >= S.gy - S.r) { b.y = S.gy - S.r; b.vy = 0; }
      } else {
        b.y = b.on.top - S.r;
      }
      /* حذف ما خرج من اللوحة، وإعادة منصات السؤال إن فاتت كلها دون جواب */
      S.plats = S.plats.filter(p => p.x < S.W + 40 && p.fall < 1);
      if (!S.answered && !Play.roundDone && !S.plats.some(p => p.round === S.q && !p.state)) S.spawn();
    }
    ctx.clearRect(0, 0, S.W, S.H);
    drawBack(th);
    S.plats.forEach(p => drawPlat(p, th));
    drawBall(th);
    requestAnimationFrame(frame);
  }
  size();
  S.ball.y = S.gy - S.r;
  requestAnimationFrame(frame);
  return S;
}

document.addEventListener('keydown', e => {
  if (!RUN || !RUN.wrap.isConnected) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); RUN.jump(); }
});

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    /* المشهد يُبنى مرة واحدة في أول سؤال ويبقى بين الأسئلة */
    if (i === 0 || !RUN || !RUN.wrap.isConnected) {
      if (RUN) RUN.wrap.remove();
      RUN = runnerScene();
      Play.board.appendChild(RUN.wrap);
      RUN.size();
    }
    const head = Play.head(q.q);
    Play.board.insertBefore(head, RUN.wrap);
    RUN.setQuestion(q);
  },
});
