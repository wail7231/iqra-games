/* القفز على الأوراق — منظر من الأعلى تمامًا لبركة ماء. قطعة مستديرة (لا كائن حي) تقف على ورقة في الأسفل،
   وأمامها صف أوراق طافية تتمايل يمينًا ويسارًا وعلى كل ورقة إجابة. يضغط الطالب ورقة فتقفز القطعة إليها
   (تكبر في منتصف القفزة لتدل على الارتفاع). الصحيحة: تهبط عليها ويتحرك المشهد للأعلى ويأتي الصف التالي.
   الخاطئة: تغرق الورقة وتعود القطعة إلى ورقتها مع رذاذ، وتُنقص قلبًا. شكل الماء والأوراق والقطعة يتبع القالب. */
'use strict';

const POND_THEMES = {
  classic:  { water: '#2E8C8C', water2: '#3BA3A0', ripple: 'rgba(255,255,255,.25)', leaf: '#4C9A4A', leafEdge: '#E3B341', ink: '#FFFFFF', token: '#E3B341', tokenEdge: '#7E2A17', shape: 'pad', rim: '#C9A26A' },
  night:    { water: '#0B1330', water2: '#142152', ripple: 'rgba(89,195,240,.25)', leaf: '#1F7A6B', leafEdge: '#59C3F0', ink: '#EAF4FF', token: '#F6E7A8', tokenEdge: '#FFFFFF', shape: 'pad', glow: true, moon: true },
  garden:   { water: '#4FA3C7', water2: '#6BB8D6', ripple: 'rgba(255,255,255,.3)', leaf: '#5FA052', leafEdge: '#3D7F3B', ink: '#FFFFFF', token: '#8A5A30', tokenEdge: '#F7C948', shape: 'pad', flowers: true },
  ice:      { water: '#1F5F8B', water2: '#2D7FB8', ripple: 'rgba(255,255,255,.2)', leaf: '#F4FBFF', leafEdge: '#9CD5F2', ink: '#12354A', token: '#FFFFFF', tokenEdge: '#9CCFEA', shape: 'floe' },
  notebook: { water: '#FDFBF3', water2: '#EEF3FA', ripple: 'rgba(43,76,126,.25)', leaf: '#FFFFFF', leafEdge: '#2B4C7E', ink: '#1F2F4D', token: '#2B4C7E', tokenEdge: '#1F2F4D', shape: 'pad', sketch: true },
};
let POND = null;

function pondScene() {
  const wrap = el('div', 'run-wrap keep');
  const cv = el('canvas', 'run-canvas');
  wrap.appendChild(cv);
  const ctx = cv.getContext('2d');
  const S = { wrap, q: null, row: [], home: null, token: null, jump: null, scroll: null, W: 0, H: 0, t: 0, missed: false, splashes: [] };
  const size = () => {
    S.W = wrap.clientWidth;
    const cap = document.body.classList.contains('is-fs') ? window.innerHeight - 130 : 460;
    S.H = Math.round(document.body.classList.contains('is-fs') ? cap : Math.min(cap, Math.max(320, S.W * .55)));
    const dpr = window.devicePixelRatio || 1;
    cv.width = S.W * dpr;
    cv.height = S.H * dpr;
    cv.style.height = S.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.homeY = S.H - 66;
    S.rowY = S.H * .36;
    if (S.home) S.home.y = S.homeY;
    S.row.forEach(l => { l.y = S.rowY; });
    if (S.token && !S.jump) { S.token.x = S.home.x; S.token.y = S.home.y; }
  };
  S.size = size;
  window.addEventListener('resize', () => { if (wrap.isConnected) size(); });
  const T = () => POND_THEMES[Play.cfg.theme] || POND_THEMES.classic;
  const font = px => `${Play.quran ? 400 : 700} ${px}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;
  const sway = () => Play.cfg.speed;

  S.setQuestion = q => {
    S.q = q;
    S.missed = false;
    if (!S.home) S.home = { x: S.W / 2, y: S.homeY, r: 38, t: '', start: true };
    if (!S.token) S.token = { x: S.home.x, y: S.home.y };
    const answers = shuffle([...answersOf(q).map(t => ({ t, ok: true })), ...q.wrong.map(t => ({ t, ok: false }))]).slice(0, 5);
    const n = answers.length, slot = S.W / n;
    ctx.font = font(16);
    S.row = answers.map((a, i) => ({
      ...a, cx: slot * (i + .5), x: slot * (i + .5), y: S.rowY - 40, enter: 0,
      r: Math.max(34, Math.min(slot * .4, 70, ctx.measureText(a.t).width / 2 + 22)),
      phase: Math.random() * 6.28, amp: Math.max(0, slot * .5 - Math.max(34, Math.min(slot * .4, 70))) * .9, sink: 0, rot: Math.random() * 6.28,
    }));
  };

  /* اختيار ورقة بالضغط عليها */
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (Play.roundDone || S.jump || S.scroll) return;
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const leaf = S.row.find(l => !l.sink && Math.hypot(px - l.x, py - l.y) < l.r + 6);
    if (!leaf) return;
    Play.touch();
    FX.play('pop');
    S.jump = { from: { x: S.token.x, y: S.token.y }, leaf, t: 0 };
  });

  function landed(leaf) {
    const r = cv.getBoundingClientRect();
    const pt = { x: r.left + leaf.x, y: r.top + leaf.y };
    if (leaf.ok) {
      FX.burst(pt, { count: 26 });
      FX.floatText(pt, S.missed ? '✓' : '+١');
      FX.play('ok');
      leaf.good = true;
      /* المشهد يتحرك للأعلى: الورقة الصحيحة تصير ورقة البداية */
      S.scroll = { t: 0, leaf, from: leaf.y };
      Play.finish(S.missed ? 0 : 1, { delay: 1100 });
    } else {
      leaf.sink = .001;
      S.missed = true;
      S.splashes.push({ x: leaf.x, y: leaf.y, t: 0 });
      FX.floatText(pt, '✗', '#C0392B');
      FX.play('bad');
      Play.mistake();
      /* القطعة تعود إلى ورقتها */
      S.jump = { from: { x: leaf.x, y: leaf.y }, leaf: S.home, t: 0, back: true };
    }
  }

  /* ---------- الرسم ---------- */
  function drawWater(th) {
    const g = ctx.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, th.water);
    g.addColorStop(1, th.water2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S.W, S.H);
    if (th.sketch) {
      ctx.strokeStyle = th.ripple; ctx.lineWidth = 1.5;
      for (let y = 30; y < S.H; y += 34) { ctx.beginPath(); for (let x = 0; x <= S.W; x += 12) ctx.lineTo(x, y + Math.sin((x + S.t * 30) / 26) * 4); ctx.stroke(); }
    } else {
      ctx.strokeStyle = th.ripple; ctx.lineWidth = 2;
      for (let k = 0; k < 9; k++) {
        const cx = (k * 173 % S.W), cy = (k * 97 % S.H), rr = ((S.t * 18 + k * 30) % 60) + 10;
        ctx.globalAlpha = 1 - rr / 70;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr * 1.4, rr * .6, 0, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (th.moon) { ctx.fillStyle = 'rgba(246,231,168,.18)'; ctx.beginPath(); ctx.ellipse(S.W * .2, S.H * .2, 46, 18, 0, 0, 7); ctx.fill(); }
    if (th.rim) { ctx.strokeStyle = th.rim; ctx.lineWidth = 10; ctx.strokeRect(5, 5, S.W - 10, S.H - 10); }
  }
  function drawLeaf(l, th) {
    if (l.sink >= 1) return;
    ctx.save();
    ctx.translate(l.x, l.y);
    const s = 1 - l.sink * .7;
    ctx.scale(s, s);
    ctx.globalAlpha = 1 - l.sink;
    if (th.glow || l.good) { ctx.shadowColor = l.good ? '#7FD36B' : th.leafEdge; ctx.shadowBlur = 16; }
    ctx.fillStyle = l.good ? '#3F8A3A' : l.sink ? '#7A5A4A' : th.leaf;
    ctx.strokeStyle = th.leafEdge;
    ctx.lineWidth = th.sketch ? 2.5 : 3;
    ctx.beginPath();
    if (th.shape === 'floe') {
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + l.rot, rr = l.r * (.86 + ((k * 37) % 10) / 70); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .88); }
      ctx.closePath();
    } else {
      /* ورقة زنبق: دائرة بشق */
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, l.r, l.rot + .25, l.rot + 6.03);
      ctx.closePath();
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    if (th.shape === 'pad' && !th.sketch) {
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 6; k++) { const a = l.rot + .25 + k * 1.0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * l.r * .85, Math.sin(a) * l.r * .85); ctx.stroke(); }
    }
    if (th.flowers && !l.t) { ctx.fillStyle = '#F4A6C1'; for (let k = 0; k < 5; k++) { const a = k * 1.256; ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 6, 0, 7); ctx.fill(); } }
    if (l.t) {
      ctx.fillStyle = l.good ? '#FFFFFF' : th.ink;
      ctx.font = font(Math.min(18, Math.max(13, l.r * .36)));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = th.ink === '#FFFFFF' ? 'rgba(0,0,0,.45)' : 'transparent';
      ctx.shadowBlur = 3;
      ctx.fillText(l.t, 0, 1, l.r * 1.7);
    }
    ctx.restore();
  }
  function drawToken(th) {
    let { x, y } = S.token, lift = 0;
    if (S.jump) {
      const k = Math.min(1, S.jump.t), to = S.jump.leaf;
      x = S.jump.from.x + (to.x - S.jump.from.x) * k;
      y = S.jump.from.y + (to.y - S.jump.from.y) * k;
      lift = Math.sin(k * Math.PI);
    }
    const r = 15 * (1 + lift * .7);
    /* ظل على الماء يبتعد كلما ارتفعت القطعة */
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(x + lift * 12, y + lift * 16, 14, 9, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    if (th.glow) { ctx.shadowColor = th.token; ctx.shadowBlur = 20; }
    const g = ctx.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(.35, th.token);
    g.addColorStop(1, th.tokenEdge);
    ctx.fillStyle = th.sketch ? th.token : g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = th.tokenEdge; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    if (!wrap.isConnected) return;
    const dt = Math.min(.035, (now - last) / 1000);
    last = now;
    S.t += dt;
    const th = T();
    S.row.forEach(l => {
      l.enter = Math.min(1, l.enter + dt * 2);
      const baseY = S.scroll && S.scroll.leaf === l ? l.y : S.rowY - 40 * (1 - l.enter);
      if (!(S.scroll && S.scroll.leaf === l)) { l.y = baseY; l.x = l.cx + Math.sin(S.t * (.5 + sway() * .12) + l.phase) * l.amp * sway() / 10; }
      if (l.sink) l.sink = Math.min(1, l.sink + dt * 1.4);
    });
    if (S.jump) {
      S.jump.t += dt / .55;
      if (S.jump.t >= 1) {
        const j = S.jump;
        S.jump = null;
        S.token.x = j.leaf.x;
        S.token.y = j.leaf.y;
        if (j.back) FX.play('tick'); else landed(j.leaf);
      }
    } else if (!S.scroll) {
      /* القطعة تتحرك مع ورقتها */
      S.token.x = S.home.x;
      S.token.y = S.home.y;
    }
    if (S.scroll) {
      S.scroll.t = Math.min(1, S.scroll.t + dt / .7);
      const l = S.scroll.leaf, e = 1 - Math.pow(1 - S.scroll.t, 3);
      l.y = S.scroll.from + (S.homeY - S.scroll.from) * e;
      S.home.y += (S.H + 80 - S.home.y) * .12;
      S.token.x = l.x;
      S.token.y = l.y;
      S.row.forEach(o => { if (o !== l) o.sink = Math.max(o.sink, S.scroll.t); });
      if (S.scroll.t >= 1) {
        S.home = { x: l.x, y: S.homeY, r: l.r, t: '', good: false, sink: 0, rot: l.rot };
        S.row = [];
        S.scroll = null;
      }
    }
    S.splashes = S.splashes.filter(s => (s.t += dt) < .8);
    drawWater(th);
    drawLeaf(S.home, th);
    S.row.forEach(l => drawLeaf(l, th));
    S.splashes.forEach(s => {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - s.t / .8;
      ctx.beginPath(); ctx.arc(s.x, s.y, 10 + s.t * 70, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    });
    drawToken(th);
    requestAnimationFrame(frame);
  }
  size();
  requestAnimationFrame(frame);
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'حركة الأوراق', kind: 'range', min: 1, max: 10, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !POND || !POND.wrap.isConnected) {
      if (POND) POND.wrap.remove();
      POND = pondScene();
      Play.board.appendChild(POND.wrap);
      POND.size();
    }
    Play.board.insertBefore(Play.head(q.q), POND.wrap);
    POND.setQuestion(q);
  },
});
