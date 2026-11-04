/* البازل — كل صورة يرفعها المعلم جولة: تُقسَّم تلقائيًا إلى قطع بألسنة وتجاويف (٩ إلى ٢٥ قطعة حسب الإعداد)،
   وتتبعثر القطع في الصينية، ويسحبها الطالب إلى مكانها في الإطار؛ إذا اقتربت من مكانها الصحيح التصقت به.
   عند اكتمالها تختفي خطوط القطع وتظهر الصورة كاملة مع عنوانها (إن وُجد).
   الشبكة تتبع اتجاه الصورة: الطولية تأخذ أعمدة أقل وصفوفًا أكثر. */
'use strict';

const PZ_GRIDS = { 9: [3, 3], 12: [4, 3], 16: [4, 4], 20: [5, 4], 25: [5, 5] };
const PZ_EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const pzHit = document.createElement('canvas').getContext('2d');

Play.register({
  settings: [
    { key: 'pieces', label: 'عدد القطع', options: [[9, '٩'], [12, '١٢'], [16, '١٦'], [20, '٢٠'], [25, '٢٥']], def: 9 },
    'timer',
  ],
  label: it => it.title || 'صورة',
  answer: () => `${toAr(Play.cfg.pieces)} قطعة`,
  round(it) {
    Play.head('');
    const stage = el('div', 'pz-stage');
    Play.board.appendChild(stage);
    const im = new Image();
    im.onload = () => { if (stage.isConnected) build(stage, im, it); };
    im.src = it.img;
  },
});

function build(stage, im, it) {
  const n = PZ_GRIDS[Play.cfg.pieces] ? Play.cfg.pieces : 9;
  let [cols, rows] = PZ_GRIDS[n];
  if (im.naturalHeight > im.naturalWidth && cols !== rows) [cols, rows] = [rows, cols];
  const seed = Math.random().toString(36).slice(2);

  const frame = el('div', 'pz-frame');
  const ghost = el('canvas');
  const full = el('img', 'pz-full');
  full.src = it.img;
  full.alt = '';
  frame.append(ghost, full);
  const tray = el('div', 'pz-tray');
  const peek = el('button', 'pz-peek', PZ_EYE);
  peek.type = 'button';
  peek.setAttribute('aria-label', 'الصورة');
  const count = el('div', 'pz-count');
  stage.append(tray, frame, peek, count);

  /* القطع: ترتيب عشوائي لمواقعها في الصينية */
  const pieces = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const c = el('canvas', 'pz-piece');
    stage.appendChild(c);
    pieces.push({ i, j, el: c, edges: puzzleEdges(seed, cols, rows, i, j), placed: false, x: 0, y: 0, jx: Math.random() - .5, jy: Math.random() - .5 });
  }
  shuffle(pieces.map((_, k) => k)).forEach((slot, k) => { pieces[k].slot = slot; });
  let L = null, z = 10, placed = 0, done = false;

  const put = (p, x, y, lift) => {
    p.x = x; p.y = y;
    p.el.style.transform = `translate(${x}px, ${y}px)${lift ? ' scale(1.06)' : ''}`;
  };
  const target = p => ({ x: L.fx + p.i * L.pw - L.pad, y: L.fy + p.j * L.ph - L.pad });
  const paintCount = () => { count.textContent = `${toAr(placed)} / ${toAr(n)}`; };

  /* حساب المقاسات: إطار الصورة وصينية القطع، جنبًا إلى جنب على الشاشات العريضة وفوق بعض على الضيقة */
  function layout() {
    const W = stage.clientWidth;
    if (!W) return;
    const fs = document.body.classList.contains('is-fs');
    const wide = W >= 640;
    const maxH = fs ? Math.max(260, window.innerHeight - 190) : wide ? 480 : 380;
    /* على الشاشة العريضة: نصغّر الإطار تدريجيًا حتى تتسع الصينية بجانبه لكل القطع دون أن تطول كثيرًا */
    let fw, fh, pw, ph, m, pad, cellW, cellH, fitH;
    for (const share of wide ? [.56, .52, .48, .44, .4, .36] : [1]) {
      const maxW = wide ? W * share : W - 16;
      const s = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
      fw = Math.round(im.naturalWidth * s); fh = Math.round(im.naturalHeight * s);
      pw = fw / cols; ph = fh / rows; m = Math.min(pw, ph); pad = Math.ceil(m * .3);
      /* الصينية تتسع لكل القطع متفرقة (كل قطعة في خانة أكبر منها قليلًا) */
      cellW = pw + pad * .9; cellH = ph + pad * .9;
      fitH = w => Math.ceil(n / Math.max(1, Math.floor(w / cellW))) * cellH + pad * .6;
      if (!wide || fitH(W - fw - 30) <= fh * 1.15) break;
    }
    let fx, fy, tr;
    if (wide) {
      fx = W - fw - 8; fy = 8;
      const w = W - fw - 30;
      tr = { x: 8, y: 8, w, h: Math.max(fh, fitH(w)) };
    } else {
      fx = (W - fw) / 2; fy = 8;
      tr = { x: 8, y: fh + 28, w: W - 16, h: fitH(W - 16) };
    }
    L = { W, fw, fh, pw, ph, m, pad, fx, fy, tr };
    stage.style.height = Math.max(fy + fh, tr.y + tr.h) + 12 + 'px';
    Object.assign(frame.style, { left: fx + 'px', top: fy + 'px', width: fw + 'px', height: fh + 'px' });
    Object.assign(tray.style, { left: tr.x + 'px', top: tr.y + 'px', width: tr.w + 'px', height: tr.h + 'px' });
    Object.assign(peek.style, { left: (fx + 8) + 'px', top: (fy + 8) + 'px' });
    Object.assign(count.style, { left: (fx + fw - 8) + 'px', top: (fy + 8) + 'px' });
    drawGhost();
    /* خانات الصينية: شبكة تملأ مساحتها، وكل قطعة في خانتها مع إزاحة بسيطة */
    const tcols = Math.max(1, Math.min(n, Math.floor(tr.w / cellW))), trows = Math.ceil(n / tcols);
    const cw = tr.w / tcols, ch = tr.h / trows;
    pieces.forEach(p => {
      drawPiece(p);
      if (p.placed) { const t = target(p); put(p, t.x, t.y); return; }
      const cx = tr.x + cw * (p.slot % tcols + .5) + p.jx * Math.max(0, cw - pw) * .5;
      const cy = tr.y + ch * ((p.slot / tcols | 0) + .5) + p.jy * Math.max(0, ch - ph) * .5;
      put(p, cx - pw / 2 - pad, cy - ph / 2 - pad);
    });
  }

  function drawGhost() {
    const dpr = window.devicePixelRatio || 1, g = ghost.getContext('2d');
    ghost.width = L.fw * dpr; ghost.height = L.fh * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = .13;
    g.drawImage(im, 0, 0, L.fw, L.fh);
    g.globalAlpha = 1;
    const cs = getComputedStyle(Play.board);
    g.strokeStyle = cs.getPropertyValue('--b-ink').trim() || '#555';
    g.globalAlpha = .22;
    g.lineWidth = 1.2;
    g.setLineDash([5, 4]);
    pieces.forEach(p => { g.beginPath(); puzzlePiecePath(g, p.i * L.pw, p.j * L.ph, L.pw, L.ph, p.edges); g.stroke(); });
  }

  function drawPiece(p) {
    const dpr = window.devicePixelRatio || 1, w = L.pw + L.pad * 2, h = L.ph + L.pad * 2;
    p.el.width = Math.ceil(w * dpr); p.el.height = Math.ceil(h * dpr);
    p.el.style.width = w + 'px'; p.el.style.height = h + 'px';
    p.path = new Path2D();
    puzzlePiecePath(p.path, 0, 0, L.pw, L.ph, p.edges);
    const g = p.el.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, L.pad * dpr, L.pad * dpr);
    g.save();
    g.clip(p.path);
    g.drawImage(im, -p.i * L.pw, -p.j * L.ph, L.fw, L.fh);
    g.restore();
    /* حافة بارزة: ظل داكن ثم لمعة فاتحة */
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke(p.path);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = .9; g.stroke(p.path);
  }

  /* السحب: نلتقط أعلى قطعة يقع الإصبع داخل شكلها الفعلي (لا داخل مربعها) */
  let drag = null;
  const local = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  stage.addEventListener('pointerdown', e => {
    if (done || !L || e.target === peek || peek.contains(e.target)) return;
    const pt = local(e);
    const hit = pieces.filter(p => !p.placed).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))
      .find(p => pzHit.isPointInPath(p.path, pt.x - p.x - L.pad, pt.y - p.y - L.pad));
    if (!hit) return;
    e.preventDefault();
    Play.touch();
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    drag = { p: hit, dx: pt.x - hit.x, dy: pt.y - hit.y, id: e.pointerId };
    hit.el.style.zIndex = ++z;
    hit.el.classList.remove('snap');
    hit.el.classList.add('lift');
    put(hit, hit.x, hit.y, true);
    FX.play('tick');
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pt = local(e), p = drag.p;
    const w = L.pw + L.pad * 2, h = L.ph + L.pad * 2, H = stage.clientHeight;
    put(p, Math.max(-L.pad, Math.min(L.W - w + L.pad, pt.x - drag.dx)), Math.max(-L.pad, Math.min(H - h + L.pad, pt.y - drag.dy)), true);
  });
  const drop = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.p;
    drag = null;
    p.el.classList.remove('lift');
    p.el.classList.add('snap');
    const t = target(p);
    if (Math.hypot(p.x - t.x, p.y - t.y) < L.m * .38) {
      p.placed = true;
      p.el.style.zIndex = 2;
      p.el.classList.add('placed');
      put(p, t.x, t.y);
      placed++;
      paintCount();
      FX.play('pop');
      const r = stage.getBoundingClientRect();
      FX.burst({ x: r.left + t.x + L.pad + L.pw / 2, y: r.top + t.y + L.pad + L.ph / 2 }, { count: 8 });
      if (placed === n) setTimeout(complete, 250);
    } else {
      put(p, p.x, p.y);
    }
  };
  stage.addEventListener('pointerup', drop);
  stage.addEventListener('pointercancel', drop);

  /* معاينة الصورة كاملة ما دام الزر مضغوطًا */
  const peekOn = e => { e.preventDefault(); frame.classList.add('peek'); stage.classList.add('peeking'); };
  const peekOff = () => { frame.classList.remove('peek'); stage.classList.remove('peeking'); };
  peek.addEventListener('pointerdown', peekOn);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => peek.addEventListener(k, peekOff));

  function complete() {
    done = true;
    frame.classList.add('done');
    pieces.forEach(p => p.el.classList.add('gone'));
    tray.classList.add('gone');
    peek.remove();
    FX.play('win');
    FX.burst(frame, { count: 46, spread: 220 });
    if (it.title) {
      const t = el('div', 'pz-title');
      t.textContent = it.title;
      stage.after(t);
    }
    Play.finish(1, { manual: true, nextLabel: 'الصورة التالية' });
  }

  layout();
  paintCount();
  let lastW = stage.clientWidth;
  const ro = new ResizeObserver(() => {
    if (!stage.isConnected) { ro.disconnect(); return; }
    if (stage.clientWidth !== lastW && !drag) { lastW = stage.clientWidth; layout(); }
  });
  ro.observe(stage);
  const onFs = () => { if (!stage.isConnected) return document.removeEventListener('fullscreenchange', onFs); setTimeout(layout, 120); };
  document.addEventListener('fullscreenchange', onFs);
}
