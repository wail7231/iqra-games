/* الطائرة والغيوم — طائرة على اليمين يحرّكها الطالب صعودًا ونزولًا (بالإصبع أو الفأرة أو الأسهم)،
   وغيوم تأتي نحوها في ممرات منفصلة وعلى كل غيمة إجابة. دخول الغيمة الصحيحة نقطة (إن كانت أول اختيار)،
   والخاطئة تصير غيمة عاصفة وتُنقص قلبًا. إن عبرت الغيوم كلها دون اختيار عادت من جديد.
   المشهد يبقى بين الأسئلة. شكل الطائرة والغيوم يتبع قالب الشكل. */
'use strict';

const PLANE_THEMES = {
  classic:  { cloud: '#FFF8E8', cloudEdge: '#E3B341', ink: '#2A1A0E', body: '#AB3920', wing: '#E3B341', glass: '#F7E7C0', trail: 'rgba(227,179,65,.35)' },
  night:    { cloud: '#24346A', cloudEdge: '#59C3F0', ink: '#EAF4FF', body: '#DDE6F5', wing: '#59C3F0', glass: '#F6E7A8', trail: 'rgba(89,195,240,.35)', glow: true, lights: true },
  garden:   { cloud: '#FFFFFF', cloudEdge: '#BFE3F3', ink: '#22361F', body: '#3F8A3A', wing: '#F7C948', glass: '#DDF1FB', trail: 'rgba(255,255,255,.7)' },
  ice:      { cloud: '#F4FBFF', cloudEdge: '#9CD5F2', ink: '#12354A', body: '#FFFFFF', wing: '#2D7FB8', glass: '#9CD5F2', trail: 'rgba(156,213,242,.5)', sparkle: true },
  notebook: { cloud: '#FFFFFF', cloudEdge: '#2B4C7E', ink: '#1F2F4D', body: '#FFFFFF', wing: '#DCE3EC', glass: '#FFFFFF', trail: 'rgba(43,76,126,.25)', paper: true },
};
let SKY = null;

function skyScene() {
  const wrap = el('div', 'run-wrap keep');
  const cv = el('canvas', 'run-canvas');
  const start = el('div', 'run-start', '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
  wrap.append(cv, start);
  const ctx = cv.getContext('2d');
  const S = { wrap, q: null, clouds: [], running: false, missed: false, answered: false, y: 0, ty: 0, W: 0, H: 0, keys: {}, t: 0 };
  const size = () => {
    S.W = wrap.clientWidth;
    const cap = document.body.classList.contains('is-fs') ? window.innerHeight * .72 : 440;
    S.H = Math.round(Math.min(cap, Math.max(300, S.W * .5)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = S.W * dpr;
    cv.height = S.H * dpr;
    cv.style.height = S.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.px = S.W * .82;
    if (!S.y) S.y = S.ty = S.H / 2;
  };
  S.size = size;
  window.addEventListener('resize', () => { if (wrap.isConnected) size(); });
  const T = () => PLANE_THEMES[Play.cfg.theme] || PLANE_THEMES.classic;
  const speed = () => 110 + Play.cfg.speed * 20;
  const font = px => `${Play.quran ? 400 : 700} ${px}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;

  /* موجة غيوم: غيمة لكل إجابة في ممر خاص، تدخل من اليسار متقاربة */
  S.spawn = () => {
    const answers = shuffle([...answersOf(S.q).map(t => ({ t, ok: true })), ...S.q.wrong.map(t => ({ t, ok: false }))]).slice(0, 5);
    const n = answers.length, lane = (S.H - 30) / n;
    ctx.font = font(16);
    answers.forEach((a, i) => {
      const h = Math.min(70, lane - 12);
      const w = Math.max(110, Math.min(S.W * .34, ctx.measureText(a.t).width + 56));
      S.clouds.push({ ...a, x: -w - 20 - Math.random() * 80, y: 15 + lane * (i + .5), w, h, state: '', fade: 0, q: S.q });
    });
  };
  S.setQuestion = q => {
    S.q = q;
    S.missed = false;
    S.answered = false;
    S.clouds = S.clouds.filter(c => c.state);
    S.spawn();
  };
  const begin = () => { if (!S.running) { S.running = true; start.classList.add('hidden'); Play.touch(); } };
  const aimAt = e => { const r = cv.getBoundingClientRect(); S.ty = Math.max(24, Math.min(S.H - 24, e.clientY - r.top)); };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); begin(); aimAt(e); });
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) aimAt(e); });
  start.addEventListener('pointerdown', e => { e.preventDefault(); begin(); });
  S.key = (code, down) => { S.keys[code] = down; if (down) begin(); };

  function hit(c) {
    const r = cv.getBoundingClientRect();
    const pt = { x: r.left + c.x + c.w / 2, y: r.top + c.y };
    if (c.ok) {
      c.state = 'good';
      S.answered = true;
      FX.burst(pt, { count: 28 });
      FX.floatText(pt, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 900 });
    } else {
      c.state = 'bad';
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B');
      FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- الرسم ---------- */
  function cloudPath(c) {
    const { x, y, w, h } = c;
    ctx.beginPath();
    ctx.moveTo(x + h * .4, y + h / 2);
    ctx.arc(x + h * .45, y + h * .1, h * .4, Math.PI * .5, Math.PI * 1.5);
    ctx.arc(x + w * .32, y - h * .18, h * .42, Math.PI * 1.05, Math.PI * 1.9);
    ctx.arc(x + w * .62, y - h * .2, h * .46, Math.PI * 1.1, Math.PI * 1.95);
    ctx.arc(x + w - h * .45, y + h * .08, h * .42, Math.PI * 1.5, Math.PI * .5);
    ctx.closePath();
  }
  function drawCloud(c, th) {
    ctx.save();
    ctx.globalAlpha = 1 - c.fade;
    const fill = c.state === 'good' ? '#3F8A3A' : c.state === 'bad' ? '#3A3F4A' : th.cloud;
    if (th.glow || c.state === 'good') { ctx.shadowColor = c.state === 'good' ? '#7FD36B' : th.cloudEdge; ctx.shadowBlur = 16; }
    cloudPath(c);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = c.state === 'bad' ? '#1C1F26' : th.cloudEdge;
    ctx.lineWidth = th.paper ? 2.5 : 2;
    ctx.stroke();
    if (c.state === 'bad') {
      /* برق صغير من الغيمة العاصفة */
      ctx.fillStyle = '#F7C948';
      const bx = c.x + c.w / 2, by = c.y + c.h * .45;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 8, by + 20); ctx.lineTo(bx + 1, by + 18); ctx.lineTo(bx - 6, by + 36); ctx.lineTo(bx + 12, by + 12); ctx.lineTo(bx + 3, by + 14); ctx.closePath(); ctx.fill();
    }
    if (th.sparkle && !c.state) { ctx.fillStyle = '#FFFFFF'; [[.3, -.1], [.7, .05], [.5, -.3]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.arc(c.x + c.w * fx, c.y + c.h * fy, 2, 0, 7); ctx.fill(); }); }
    ctx.fillStyle = c.state ? '#FFFFFF' : th.ink;
    ctx.font = font(Math.min(18, Math.max(14, c.h * .3)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.t, c.x + c.w / 2, c.y + 2, c.w - 30);
    ctx.restore();
  }
  function drawPlane(th) {
    const x = S.px, y = S.y, tilt = Math.max(-.35, Math.min(.35, (S.ty - S.y) / 120));
    /* أثر خلف الطائرة */
    ctx.strokeStyle = th.trail;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 40, y); ctx.lineTo(S.W + 10, y - tilt * 30); ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    if (th.paper) {
      /* طائرة ورقية مرسومة */
      ctx.strokeStyle = th.cloudEdge; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(30, -18); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#DCE3EC';
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(30, 16); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      if (th.glow) { ctx.shadowColor = th.wing; ctx.shadowBlur = 14; }
      ctx.fillStyle = th.wing;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(12, -30); ctx.lineTo(22, -30); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26, -2); ctx.lineTo(36, -18); ctx.lineTo(42, -18); ctx.lineTo(40, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = th.body;
      ctx.beginPath(); ctx.ellipse(6, 0, 36, 10, 0, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.glass;
      ctx.beginPath(); ctx.ellipse(-18, -3, 9, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = th.wing;
      ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(10, 26); ctx.lineTo(18, 26); ctx.lineTo(12, 2); ctx.closePath(); ctx.fill();
      if (th.lights && Math.floor(S.t * 3) % 2) { ctx.fillStyle = '#FF5A5A'; ctx.beginPath(); ctx.arc(17, -29, 3, 0, 7); ctx.fill(); }
      /* مروحة تدور */
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2.5;
      const p = Math.sin(S.t * 40) * 12;
      ctx.beginPath(); ctx.moveTo(-42, -p); ctx.lineTo(-42, p); ctx.stroke();
    }
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    if (!wrap.isConnected) return;
    const dt = Math.min(.035, (now - last) / 1000);
    last = now;
    S.t += dt;
    const th = T();
    if (S.keys.ArrowUp || S.keys.KeyW) S.ty = Math.max(24, S.ty - 340 * dt);
    if (S.keys.ArrowDown || S.keys.KeyS) S.ty = Math.min(S.H - 24, S.ty + 340 * dt);
    S.y += (S.ty - S.y) * Math.min(1, dt * 7);
    if (S.running && !Play.finished) {
      const v = speed() * dt;
      S.clouds.forEach(c => { c.x += v; if (c.state) c.fade = Math.min(1, c.fade + dt * .9); });
      /* اصطدام: مقدمة الطائرة داخل الغيمة */
      if (!Play.roundDone) {
        const c = S.clouds.find(c => !c.state && S.px - 36 < c.x + c.w - 6 && S.px + 20 > c.x + 6 && Math.abs(S.y - c.y) < c.h * .55);
        if (c) hit(c);
      }
      S.clouds = S.clouds.filter(c => c.x < S.W + 40 && c.fade < 1);
      if (!S.answered && !Play.roundDone && !S.clouds.some(c => c.q === S.q && !c.state)) S.spawn();
    }
    ctx.clearRect(0, 0, S.W, S.H);
    S.clouds.forEach(c => drawCloud(c, th));
    drawPlane(th);
    requestAnimationFrame(frame);
  }
  size();
  requestAnimationFrame(frame);
  return S;
}

document.addEventListener('keydown', e => { if (SKY && SKY.wrap.isConnected && /^(ArrowUp|ArrowDown|KeyW|KeyS)$/.test(e.code)) { e.preventDefault(); SKY.key(e.code, true); } });
document.addEventListener('keyup', e => { if (SKY && SKY.wrap.isConnected) SKY.key(e.code, false); });

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !SKY || !SKY.wrap.isConnected) {
      if (SKY) SKY.wrap.remove();
      SKY = skyScene();
      Play.board.appendChild(SKY.wrap);
      SKY.size();
    }
    Play.board.insertBefore(Play.head(q.q), SKY.wrap);
    SKY.setQuestion(q);
  },
});
