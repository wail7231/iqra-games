/* الطائرة والغيوم — طائرة على اليمين يحرّكها الطالب صعودًا ونزولًا (بالإصبع أو الفأرة أو الأسهم)،
   وغيوم تأتي نحوها في ممرات منفصلة وعلى كل غيمة إجابة. دخول الغيمة الصحيحة نقطة (إن كانت أول اختيار)،
   والخاطئة تصير غيمة عاصفة وتُنقص قلبًا. إن عبرت الغيوم كلها دون اختيار عادت من جديد.
   المشهد يبقى بين الأسئلة. شكل الطائرة والغيوم يتبع قالب الشكل. */
'use strict';

const PLANE_THEMES = {
  classic:  { plane: 'prop', cloud: '#FFFDF6', cloud2: '#F5DEB8', cloudEdge: '#D9A23A', shine: 'rgba(255,255,255,.85)', shade: 'rgba(120,70,20,.1)', ink: '#3A1E0E',
              body: '#AB3920', body2: '#D9573A', wing: '#E3B341', wing2: '#B8892A', glass: '#F7E7C0', trail: 'rgba(255,255,255,.9)' },
  night:    { plane: 'jet', cloud: '#34508F', cloud2: '#1E2C5C', cloudEdge: '#59C3F0', shine: 'rgba(160,220,255,.22)', shade: 'rgba(0,0,0,.18)', ink: '#F2F8FF',
              body: '#C9D6EE', wing: '#59C3F0', wing2: '#2F7DA6', glass: '#F6E7A8', trail: 'rgba(246,231,168,.7)', trailKind: 'jet', glow: true, stars: true },
  garden:   { plane: 'biplane', cloud: '#FFFFFF', cloud2: '#D8EEFA', cloudEdge: '#9FD3EE', shine: 'rgba(255,255,255,.95)', shade: 'rgba(40,90,60,.1)', ink: '#1F3A1C',
              body: '#3F8A3A', body2: '#6DBA5F', wing: '#F7C948', wing2: '#C99A22', glass: '#DDF1FB', trail: 'rgba(255,255,255,.95)' },
  ice:      { plane: 'glider', cloud: '#FFFFFF', cloud2: '#C9E8F8', cloudEdge: '#7FC2E8', shine: 'rgba(255,255,255,1)', shade: 'rgba(45,127,184,.12)', ink: '#0F3550',
              body: '#DDEFFA', wing: '#2D7FB8', wing2: '#1F5F8C', glass: '#7FC2E8', trail: '#FFFFFF', trailKind: 'sparkle', sparkle: true },
  notebook: { plane: 'paper', cloud: '#FFFFFF', cloud2: '#FFFFFF', cloudEdge: '#2B4C7E', shine: 'transparent', shade: 'transparent', ink: '#1F2F4D',
              body: '#FFFFFF', wing: '#DCE3EC', glass: '#FFFFFF', trail: 'rgba(43,76,126,.45)', trailKind: 'dash', paper: true },
};
let SKY = null;

function skyScene() {
  const wrap = el('div', 'run-wrap keep');
  const cv = el('canvas', 'run-canvas');
  const start = el('div', 'run-start', '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
  wrap.append(cv, start);
  const ctx = cv.getContext('2d');
  const S = { wrap, q: null, clouds: [], running: false, missed: false, answered: false, y: 0, ty: 0, W: 0, H: 0, keys: {}, t: 0, hist: [] };
  const size = () => {
    S.W = wrap.clientWidth;
    const cap = document.body.classList.contains('is-fs') ? window.innerHeight - 130 : 470;
    S.H = Math.round(document.body.classList.contains('is-fs') ? cap : Math.min(cap, Math.max(330, S.W * .54)));
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

  /* الغيوم تأتي واحدةً بعد أخرى متباعدة: بين كل غيمة والتي تليها مسافة واسعة،
     وكل غيمة في ارتفاع بعيد عن سابقتها (أعلى / وسط / أسفل)، فيقرأ الطالب كل إجابة ويفكّر قبل الاختيار */
  S.spawn = () => {
    const answers = mixAnswers(S.q, 5);
    const h = Math.max(64, Math.min(92, S.H * .19));
    const levels = [.24, .53, .8].map(f => Math.round(S.H * f));
    const gap = Math.max(300, S.W * .42);
    ctx.font = font(Math.round(Math.min(22, Math.max(16, h * .24))));
    let x = -40, lastLevel = -1;
    answers.forEach(a => {
      const w = Math.max(150, Math.min(S.W * .34, ctx.measureText(a.t).width + h * .8 + 40));
      /* ارتفاع مختلف عن الغيمة السابقة، ويُفضَّل الأبعد عنها */
      const options = [0, 1, 2].filter(k => k !== lastLevel);
      const far = lastLevel === 1 ? options : options.filter(k => Math.abs(k - lastLevel) === 2);
      const pool = far.length && Math.random() < .65 ? far : options;
      const k = pool[Math.random() * pool.length | 0];
      lastLevel = k;
      x -= w;
      S.clouds.push({ ...a, x, y: levels[k], w, h, state: '', fade: 0, q: S.q });
      x -= gap;
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
  /* الغيمة: كتل دائرية منتفخة فوق قاعدة مسطّحة؛ الكتل الوسطى أكبر */
  function puffs(c) {
    if (c.puffs) return c.puffs;
    const n = Math.max(3, Math.round(c.w / (c.h * .6)));
    c.puffs = Array.from({ length: n }, (_, i) => {
      const f = i / (n - 1), mid = 1 - Math.abs(f - .5) * 2;
      return { f, r: c.h * (.28 + mid * .2 + Math.random() * .07) };
    });
    c.ph = Math.random() * 6.28;
    return c.puffs;
  }
  const puffAt = (c, p) => {
    const left = c.x + c.h * .4, right = c.x + c.w - c.h * .4;
    return { cx: left + (right - left) * p.f, cy: c.y + c.h * .42 - p.r * .95 };
  };
  function cloudShape(c, grow) {
    const { x, y, w, h } = c, top = y - h * .1 - grow, bot = y + h * .42 + grow, l = x + h * .1 - grow, r = x + w - h * .1 + grow, rr = (bot - top) / 2;
    ctx.beginPath();
    puffs(c).forEach(p => { const { cx, cy } = puffAt(c, p); ctx.moveTo(cx + p.r + grow, cy); ctx.arc(cx, cy, p.r + grow, 0, 6.2832); });
    ctx.moveTo(l + rr, top);
    ctx.lineTo(r - rr, top);
    ctx.arc(r - rr, top + rr, rr, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(l + rr, bot);
    ctx.arc(l + rr, top + rr, rr, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
  }
  function star4(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }
  function drawCloud(c, th) {
    puffs(c);
    ctx.save();
    ctx.globalAlpha = 1 - c.fade;
    ctx.translate(0, Math.sin(S.t * 1.3 + c.ph) * 3);
    const good = c.state === 'good', bad = c.state === 'bad';
    /* ظل خفيف تحت الغيمة */
    if (!th.paper) { ctx.fillStyle = th.shade; ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y + c.h * .6, c.w * .4, c.h * .09, 0, 0, 7); ctx.fill(); }
    /* الحافة: نفس الشكل أكبر قليلًا بلون الحافة */
    if (th.glow || good) { ctx.shadowColor = good ? '#7FD36B' : th.cloudEdge; ctx.shadowBlur = 20; }
    cloudShape(c, th.paper ? 2.6 : 2.2);
    ctx.fillStyle = bad ? '#1C1F26' : good ? '#2E6B2A' : th.cloudEdge;
    ctx.fill();
    ctx.shadowBlur = 0;
    /* الجسم بتدرّج من الأعلى إلى الأسفل */
    const g = ctx.createLinearGradient(0, c.y - c.h * .55, 0, c.y + c.h * .42);
    const [c1, c2] = good ? ['#62B95A', '#3F8A3A'] : bad ? ['#5E6576', '#353A46'] : [th.cloud, th.cloud2];
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    cloudShape(c, 0);
    ctx.fillStyle = g;
    ctx.fill();
    if (!c.state) {
      if (th.paper) {
        /* تظليل بالقلم في أسفل الغيمة */
        ctx.save(); cloudShape(c, 0); ctx.clip();
        ctx.strokeStyle = 'rgba(43,76,126,.2)'; ctx.lineWidth = 1.2;
        for (let k = c.x - c.h; k < c.x + c.w; k += 8) { ctx.beginPath(); ctx.moveTo(k, c.y + c.h * .45); ctx.lineTo(k + c.h * .28, c.y + c.h * .2); ctx.stroke(); }
        ctx.restore();
      } else {
        /* لمعة على كل كتلة */
        ctx.fillStyle = th.shine;
        puffs(c).forEach(p => { const { cx, cy } = puffAt(c, p); ctx.beginPath(); ctx.ellipse(cx - p.r * .28, cy - p.r * .42, p.r * .36, p.r * .16, -.35, 0, 7); ctx.fill(); });
      }
      if (th.sparkle) { ctx.fillStyle = '#FFFFFF'; const tw = .6 + Math.sin(S.t * 4 + c.ph) * .4; [[.22, -.25, 6], [.78, -.15, 5], [.55, -.48, 4]].forEach(([fx, fy, s]) => star4(c.x + c.w * fx, c.y + c.h * fy, s * tw)); ctx.fillStyle = 'rgba(156,213,242,.9)'; star4(c.x + c.w * .38, c.y + c.h * .32, 3); }
      if (th.stars) { ctx.fillStyle = '#F6E7A8'; [[-.06, -.3], [1.04, -.1], [.5, -.75]].forEach(([fx, fy], k) => star4(c.x + c.w * fx, c.y + c.h * fy, 3 + Math.sin(S.t * 3 + k + c.ph) * 1.5)); }
    }
    if (bad) {
      /* برق صغير من الغيمة العاصفة */
      ctx.fillStyle = '#F7C948';
      const bx = c.x + c.w / 2, by = c.y + c.h * .4;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 8, by + 20); ctx.lineTo(bx + 1, by + 18); ctx.lineTo(bx - 6, by + 36); ctx.lineTo(bx + 12, by + 12); ctx.lineTo(bx + 3, by + 14); ctx.closePath(); ctx.fill();
    }
    /* الكتابة: لون واضح مع حدّ يفصلها عن الغيمة */
    const ink = c.state ? '#FFFFFF' : th.ink, light = parseInt(ink.slice(1), 16) > 0x999999;
    ctx.font = font(Math.round(Math.min(22, Math.max(16, c.h * .24))));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = light ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.8)';
    ctx.strokeText(c.t, c.x + c.w / 2, c.y + c.h * .1, c.w - 36);
    ctx.fillStyle = ink;
    ctx.fillText(c.t, c.x + c.w / 2, c.y + c.h * .1, c.w - 36);
    ctx.restore();
  }

  /* أثر الطائرة يتبع مسارها الفعلي (آخر مواضعها) */
  function drawTrail(th) {
    const h = S.hist, n = h.length;
    if (n < 2) return;
    const at = k => ({ x: S.px + 44 + k * 7, y: h[n - 1 - k] });
    ctx.save();
    if (th.trailKind === 'dash') {
      ctx.strokeStyle = th.trail; ctx.lineWidth = 2.5; ctx.setLineDash([9, 7]); ctx.lineCap = 'round';
      ctx.beginPath(); for (let k = 0; k < n; k++) { const p = at(k); ctx.lineTo(p.x, p.y + 4); } ctx.stroke();
    } else if (th.trailKind === 'jet') {
      for (let k = 0; k < n; k++) { const p = at(k); ctx.globalAlpha = (1 - k / n) * .8; ctx.fillStyle = th.trail; ctx.beginPath(); ctx.arc(p.x, p.y, 5 - k / n * 3, 0, 7); ctx.fill(); }
    } else if (th.trailKind === 'sparkle') {
      ctx.fillStyle = '#FFFFFF';
      for (let k = 2; k < n; k += 3) { const p = at(k); ctx.globalAlpha = 1 - k / n; star4(p.x, p.y + Math.sin(k * 1.7) * 7, 2 + ((k * 7) % 4)); }
    } else {
      /* دخان أبيض على شكل كرات صغيرة تكبر وتتلاشى */
      for (let k = 2; k < n; k += 3) { const p = at(k); ctx.globalAlpha = (1 - k / n) * .85; ctx.fillStyle = th.trail; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + k * .22, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  const prop = (x, s) => {
    ctx.fillStyle = 'rgba(40,40,40,.28)';
    ctx.beginPath(); ctx.ellipse(x, 0, 3, s * (.75 + Math.abs(Math.sin(S.t * 30)) * .25), 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3A3A3A'; ctx.beginPath(); ctx.arc(x, 0, 3.5, 0, 7); ctx.fill();
  };
  const poly = (pts, fill, stroke, lw) => {
    ctx.beginPath(); pts.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  };
  const bodyGrad = (c1, c2, ry) => { const g = ctx.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };

  const PLANES = {
    /* طائرة مروحية كلاسيكية */
    prop(th) {
      poly([[22, -4], [33, -26], [44, -26], [43, -3]], th.wing2, 'rgba(0,0,0,.2)');
      poly([[-6, -3], [6, -22], [16, -22], [12, -3]], th.wing2);
      ctx.fillStyle = bodyGrad(th.body2, th.body, 12);
      ctx.beginPath(); ctx.ellipse(4, 0, 40, 12, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.wing; ctx.fillRect(-28, 2, 66, 3.5);
      ctx.fillStyle = th.glass; [-2, 8, 18].forEach(wx => { ctx.beginPath(); ctx.arc(wx, -3, 2.8, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(-22, -4, 9, 5.5, -.15, 0, 7); ctx.fill();
      poly([[-6, 3], [8, 30], [19, 30], [13, 3]], th.wing, 'rgba(0,0,0,.2)');
      prop(-37, 18);
    },
    /* نفّاثة ليلية بأضواء تومض ولهب خلفي */
    jet(th) {
      const fl = 10 + Math.sin(S.t * 50) * 3;
      const g = ctx.createLinearGradient(44, 0, 44 + fl + 10, 0); g.addColorStop(0, '#FFF2B0'); g.addColorStop(.5, '#F7A93B'); g.addColorStop(1, 'rgba(89,195,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(48, 0, fl, 4.5, 0, 0, 7); ctx.fill();
      poly([[26, -4], [40, -26], [47, -26], [46, -4]], th.wing2);
      poly([[2, -3], [24, -20], [31, -20], [18, -3]], th.wing2);
      ctx.fillStyle = bodyGrad('#FFFFFF', th.body, 9);
      ctx.beginPath(); ctx.moveTo(-48, 1); ctx.quadraticCurveTo(-34, -10, -10, -9); ctx.lineTo(44, -6); ctx.lineTo(46, 5); ctx.lineTo(-10, 8); ctx.quadraticCurveTo(-36, 9, -48, 1); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = th.glass; ctx.beginPath(); ctx.ellipse(-30, -4, 9, 3.6, -.12, 0, 7); ctx.fill();
      ctx.fillStyle = th.wing; ctx.fillRect(-20, 0, 60, 2.5);
      poly([[0, 3], [26, 28], [34, 28], [18, 3]], th.wing, 'rgba(0,0,0,.25)');
      const on = Math.floor(S.t * 2.5) % 2;
      ctx.fillStyle = on ? '#FF5A5A' : 'rgba(255,90,90,.3)'; ctx.beginPath(); ctx.arc(31, 27, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = on ? 'rgba(90,255,140,.3)' : '#5AFF8C'; ctx.beginPath(); ctx.arc(28, -19, 2.4, 0, 7); ctx.fill();
    },
    /* طائرة بجناحين متراكبين */
    biplane(th) {
      poly([[22, -3], [32, -22], [41, -22], [40, -2]], th.wing2, 'rgba(0,0,0,.2)');
      ctx.strokeStyle = '#6B4A2A'; ctx.lineWidth = 2;
      [[-14, -17, -12, 11], [6, -17, 8, 11]].forEach(([a, b, c2, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); });
      ctx.fillStyle = bodyGrad(th.body2, th.body, 11);
      ctx.beginPath(); ctx.ellipse(2, 0, 36, 10.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.glass; ctx.beginPath(); ctx.ellipse(-12, -8, 7, 4, 0, Math.PI, 0); ctx.fill();
      const wing = yy => { ctx.fillStyle = th.wing; ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-3, yy, 22, 4.2, 0, 0, 7); ctx.fill(); ctx.stroke(); };
      wing(-18); wing(12);
      ctx.fillStyle = '#5A4632'; [[-8, 18], [8, 18]].forEach(([wx, wy]) => { ctx.beginPath(); ctx.arc(wx, wy, 4, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#5A4632'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(-2, 8); ctx.lineTo(8, 18); ctx.stroke();
      prop(-34, 17);
    },
    /* شراعية بجناحين طويلين وأطراف ملونة */
    glider(th) {
      poly([[28, -3], [36, -24], [43, -24], [42, -2]], th.wing2, 'rgba(0,0,0,.15)');
      poly([[30, -24], [50, -26], [50, -22], [36, -21]], th.wing);
      poly([[-4, -2], [2, -30], [9, -30], [10, -2]], '#EAF6FD', 'rgba(45,127,184,.4)');
      poly([[2, -30], [9, -30], [8, -24], [3, -24]], th.wing);
      ctx.fillStyle = bodyGrad('#FFFFFF', th.body, 8);
      ctx.beginPath(); ctx.moveTo(-42, 1); ctx.quadraticCurveTo(-36, -8, -16, -7); ctx.lineTo(42, -2); ctx.lineTo(42, 2); ctx.lineTo(-16, 7); ctx.quadraticCurveTo(-36, 8, -42, 1); ctx.fill();
      ctx.strokeStyle = 'rgba(45,127,184,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = th.glass; ctx.beginPath(); ctx.ellipse(-24, -5, 10, 4, -.1, 0, 7); ctx.fill();
      poly([[-4, 2], [4, 36], [12, 36], [10, 2]], '#FFFFFF', 'rgba(45,127,184,.45)');
      poly([[4, 36], [12, 36], [11, 29], [5, 29]], th.wing);
    },
    /* طائرة ورقية مطويّة */
    paper(th) {
      const ink = th.cloudEdge;
      poly([[-40, 0], [16, 1], [20, 13]], '#C9D3E0', ink, 2);
      poly([[-40, 0], [34, 15], [16, 1]], '#EEF3FA', ink, 2);
      poly([[-40, 0], [34, -22], [16, 1]], '#FFFFFF', ink, 2.4);
      ctx.strokeStyle = 'rgba(43,76,126,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(26, -14); ctx.stroke();
      ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(8, -12); ctx.stroke();
    },
  };
  function drawPlane(th) {
    const x = S.px, y = S.y, tilt = Math.max(-.35, Math.min(.35, (S.ty - S.y) / 120));
    drawTrail(th);
    ctx.save();
    ctx.translate(x, y + Math.sin(S.t * 2.2) * 1.5);
    ctx.rotate(tilt);
    ctx.scale(1.12, 1.12);
    ctx.lineJoin = 'round';
    if (th.glow) { ctx.shadowColor = th.wing; ctx.shadowBlur = 12; }
    (PLANES[th.plane] || PLANES.prop)(th);
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
    S.hist.push(S.y);
    if (S.hist.length > 34) S.hist.shift();
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
