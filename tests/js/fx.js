/* مؤثرات الألعاب المشتركة:
   - أصوات خفيفة مولَّدة بالمتصفح (بلا ملفات)، مع زر كتم يُحفظ في المتصفح
   - قصاصات احتفال، ونقاط طائرة (+١)، ونبضة لعدّاد النقاط
   - كشف تدريجي لنتائج الإجابات واحدة بعد واحدة
   - طبقة زينة متحركة لكل قالب شكل: لمعات ذهبية (كلاسيكي)، نجوم وقمر وشهب (ليل)،
     عشب وبتلات تتساقط (حديقة)، ثلج يتساقط وصقيع (جليد)، رسومات قلم وثقوب (دفتر) */
'use strict';

const FX = (() => {
  let actx = null;
  let muted = store.get('iqra_sound') === 'off';
  const audio = () => {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  };
  function tone(freq, start, dur, type = 'sine', vol = .16, slide = 0) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const t = a.currentTime + start;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + .05);
  }
  const SOUNDS = {
    ok: () => { tone(659, 0, .16, 'triangle'); tone(988, .08, .3, 'triangle'); tone(1319, .16, .35, 'sine', .08); },
    bad: () => { tone(196, 0, .25, 'triangle', .12, .7); },
    good: () => tone(784, 0, .16, 'triangle', .12),
    nope: () => tone(233, 0, .18, 'triangle', .1, .8),
    tick: () => tone(1046, 0, .06, 'sine', .06),
    pop: () => { tone(520, 0, .08, 'square', .05, 2); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .085, .32, 'triangle', .12)),
  };
  const play = name => { if (!muted && SOUNDS[name]) { try { SOUNDS[name](); } catch (_) {} } };

  const centerOf = t => {
    if (t && t.getBoundingClientRect) { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return t;
  };
  const CONFETTI = ['#F2A516', '#3F8A3A', '#2E8BC0', '#E5559A', '#8E5CC2', '#E3B341', '#1FA39A'];
  /* قصاصات تتطاير من عنصر (أو من نقطة {x, y}) */
  function burst(target, { count = 26, spread = 130, colors = CONFETTI } = {}) {
    const { x, y } = centerOf(target);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'fx-bit' + (i % 3 === 0 ? ' round' : '');
      p.style.background = colors[i % colors.length];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * spread;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * .8 - 50;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 110}px)) scale(.7) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.75,.4,1)' }).onfinish = () => p.remove();
    }
  }
  /* نص صغير يطير من العنصر للأعلى، مثل +١ */
  function floatText(target, text, color = '#3F8A3A') {
    const { x, y } = centerOf(target);
    const s = document.createElement('span');
    s.className = 'fx-float';
    s.textContent = text;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.color = color;
    document.body.appendChild(s);
    s.animate([
      { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -110%) scale(1.15)', opacity: 1, offset: .25 },
      { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 },
    ], { duration: 1100, easing: 'ease-out' }).onfinish = () => s.remove();
  }
  const bump = el => el && el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
  /* كشف تدريجي: fn لكل عنصر بفاصل زمني، ثم يُكمل */
  async function sequence(items, fn, step = 430) {
    for (let i = 0; i < items.length; i++) {
      fn(items[i], i);
      await new Promise(r => setTimeout(r, step));
    }
  }

  /* ---------- زينة القوالب ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FLAKE = '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M12 2l-2 2.5M12 2l2 2.5M12 22l-2-2.5M12 22l2-2.5"/></svg>';
  const GRASS = '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 60 L0 38 Q8 18 12 40 Q18 10 24 38 Q30 22 36 42 Q44 6 50 40 Q56 24 62 44 Q70 14 76 40 Q84 26 90 44 Q98 8 104 40 Q110 22 118 42 Q126 12 132 40 Q140 28 146 44 Q154 6 160 40 Q166 20 174 42 Q182 14 188 40 Q196 26 202 44 Q210 10 216 40 Q222 22 230 42 Q238 8 244 40 Q252 26 258 44 Q266 12 272 40 Q278 20 286 42 Q294 6 300 40 Q308 26 314 44 Q322 14 328 40 Q334 22 342 42 Q350 10 356 40 Q364 24 370 44 Q378 12 384 40 Q392 22 400 38 L400 60Z"/></svg>';
  const FLOWER = c => `<svg viewBox="0 0 24 24"><g fill="${c}"><circle cx="12" cy="6" r="4"/><circle cx="18" cy="11" r="4"/><circle cx="15.5" cy="18" r="4"/><circle cx="8.5" cy="18" r="4"/><circle cx="6" cy="11" r="4"/></g><circle cx="12" cy="13" r="3.4" fill="#F7C948"/></svg>`;
  const DOODLES = [
    '<svg viewBox="0 0 40 40"><path d="M20 4l4.5 10.5L36 15l-8.5 7.5L30 34l-10-6-10 6 2.5-11.5L4 15l11.5-.5z"/></svg>',
    '<svg viewBox="0 0 40 40"><path d="M20 20c0-2 3-2 3 0s-4 4-6 1 1-8 6-7 7 7 4 11-11 5-13 0-1-14 7-15 14 3 14 11"/></svg>',
    '<svg viewBox="0 0 60 30"><path d="M4 20c8-14 18 6 26-6s16 4 26-8M48 4l8 2-3 7"/></svg>',
    '<svg viewBox="0 0 40 40"><path d="M8 32 32 8M26 8h6v6M10 12l4-4M30 28l-4 4"/></svg>',
  ];

  /* تفاصيل إضافية لكل قالب (في اللوحة فقط، لا فوق المتاهة) */
  const LANTERN = '<svg viewBox="0 0 30 70"><path d="M15 0v14" stroke="#B8925A" stroke-width="1.5"/><path d="M10 14h10v4H10z" fill="#7E2A17"/><path d="M7 18h16l3 26H4z" fill="#E3B341"/><path d="M10 21h10l2 20H8z" fill="#FFF3C4"/><path d="M4 44h22v5H4z" fill="#7E2A17"/><path d="M12 49h6l-1 4h-4z" fill="#7E2A17"/></svg>';
  const WAVES = '<svg viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 18 Q25 6 50 18 T100 18 T150 18 T200 18 T250 18 T300 18 T350 18 T400 18 V40 H0Z"/></svg>';
  const WEED = '<svg viewBox="0 0 30 80" preserveAspectRatio="none"><path d="M15 80 C4 62 26 50 15 32 C7 20 19 10 15 0" fill="none" stroke-width="5" stroke-linecap="round"/></svg>';
  const PLANET = (body, band, ring) => `<svg viewBox="0 0 100 60"><path d="M4 30a46 11 0 0 1 92 0" fill="none" stroke="${ring}" stroke-width="3" opacity=".6"/><circle cx="50" cy="30" r="20" fill="${body}"/><path d="M33 24h34M31 33h38" stroke="${band}" stroke-width="4"/><path d="M4 30a46 11 0 0 0 92 0" fill="none" stroke="${ring}" stroke-width="3"/></svg>`;
  const LEAF = '<svg viewBox="0 0 24 24"><path d="M12 1c5 4 8 8 8 12a8 8 0 0 1-16 0c0-4 3-8 8-12z"/><path d="M12 5v18" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/></svg>';
  const PILE = '<svg viewBox="0 0 400 30" preserveAspectRatio="none"><path d="M0 30 Q20 10 40 22 Q60 6 80 20 Q100 8 120 22 Q140 4 160 20 Q180 10 200 22 Q220 6 240 20 Q260 8 280 22 Q300 4 320 20 Q340 10 360 22 Q380 8 400 18 V30Z"/></svg>';
  const CLOUD = c => `<svg viewBox="0 0 120 50"><path d="M20 44a16 16 0 0 1 4-31 22 22 0 0 1 40-6 18 18 0 0 1 34 10 14 14 0 0 1 2 27z" fill="${c}"/></svg>`;
  const SUN = '<svg viewBox="0 0 100 100"><g stroke="#F7C948" stroke-width="5" stroke-linecap="round">' + [...Array(12)].map((_, i) => `<path d="M50 8v12" transform="rotate(${i * 30} 50 50)"/>`).join('') + '</g><circle cx="50" cy="50" r="22" fill="#F7C948"/><circle cx="50" cy="50" r="22" fill="none" stroke="#F2A516" stroke-width="3"/></svg>';
  const ICICLES = '<svg viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 0h400v6l-8 0-4 24-4-24h-14l-3 14-3-14h-20l-5 30-5-30h-16l-3 12-3-12h-22l-4 22-4-22h-18l-3 16-3-16h-24l-5 28-5-28h-14l-3 12-3-12h-22l-4 20-4-20h-18l-3 14-3-14h-20l-5 26-5-26h-16l-3 10-3-10h-22l-4 22-4-22H40l-3 14-3-14H14l-4 18-4-18H0z" fill="#E8F7FF"/></svg>';
  const PALM = '<svg viewBox="0 0 80 120"><path d="M40 120c2-30 10-60 4-88" fill="none" stroke="#A0703A" stroke-width="7" stroke-linecap="round"/><path d="M40 120c2-30 10-60 4-88" fill="none" stroke="#C89458" stroke-width="2" stroke-dasharray="4 7"/><g fill="#2E8B57"><path d="M44 32C30 18 12 20 2 30c14-4 28-2 42 2z"/><path d="M44 32C58 16 74 20 80 30 68 26 56 28 44 32z"/><path d="M44 32C40 14 30 4 16 2c12 8 22 18 28 30z"/><path d="M44 32C50 14 62 6 74 6 62 14 52 22 44 32z"/><path d="M44 32C34 36 24 48 22 60c6-12 14-22 22-28z"/><path d="M44 32c10 6 18 16 20 28-6-10-12-20-20-28z"/></g><circle cx="40" cy="34" r="4" fill="#8A5A30"/><circle cx="47" cy="35" r="4" fill="#8A5A30"/></svg>';
  const UMBRELLA = '<svg viewBox="0 0 80 80"><path d="M40 20l6 60" stroke="#6B4A2E" stroke-width="3"/><path d="M6 32a36 22 0 0 1 70-12z" fill="#E8590C"/><path d="M22 28a20 22 0 0 1 36-9z" fill="#FFFFFF"/><path d="M36 26a6 20 0 0 1 10-7z" fill="#2BB3C0"/></svg>';
  const BALL = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#B8430A" stroke-width="1.5"/><path d="M20 2a18 18 0 0 1 15 8L20 20z" fill="#E8590C"/><path d="M38 24a18 18 0 0 1-10 13L20 20z" fill="#2BB3C0"/><path d="M12 36A18 18 0 0 1 2 22l18-2z" fill="#F7B32B"/></svg>';
  const SEA = '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 14 Q25 4 50 14 T100 14 T150 14 T200 14 T250 14 T300 14 T350 14 T400 14 V60 H0Z" fill="#5FC9D6"/><path d="M0 24 Q25 16 50 24 T100 24 T150 24 T200 24 T250 24 T300 24 T350 24 T400 24 V60 H0Z" fill="#2BB3C0"/><path d="M0 44 Q50 36 100 44 T200 44 T300 44 T400 44 V60 H0Z" fill="#F2D49B"/></svg>';
  const PINE = '<svg viewBox="0 0 60 100" preserveAspectRatio="none"><rect x="26" y="84" width="8" height="16" fill="#6B4A2E"/><path d="M30 2 6 40h10L2 64h12L0 88h60L46 64h12L44 40h10z" fill="#2F5D50"/><path d="M30 2 20 18q10-4 20 0zM16 40h28l-5-8q-9 4-18 0zM14 64h32l-5-8q-11 4-22 0zM2 88h56l-6-8q-22 5-44 0z" fill="#FFFFFF"/></svg>';
  const HILLS = '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 30 Q60 6 130 26 T260 22 T400 28 V60 H0Z" fill="#E3EAF3"/><path d="M0 44 Q80 24 170 40 T320 36 T400 42 V60 H0Z" fill="#FFFFFF"/></svg>';
  const CABIN = '<svg viewBox="0 0 90 80"><rect x="60" y="8" width="10" height="22" fill="#7A4A2A"/><path d="M58 8h14" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M4 40 45 10l41 30z" fill="#FFFFFF" stroke="#C9D6E8" stroke-width="2" stroke-linejoin="round"/><path d="M12 40h66v38H12z" fill="#A0603A"/><path d="M12 48h66M12 57h66M12 66h66" stroke="#7A4A2A" stroke-width="1.5"/><rect x="20" y="48" width="18" height="14" fill="#FFD24A" stroke="#7A4A2A" stroke-width="2.5"/><path d="M29 48v14M20 55h18" stroke="#7A4A2A" stroke-width="1.5"/><rect x="50" y="54" width="14" height="24" fill="#6B3F22"/><circle cx="60" cy="66" r="1.5" fill="#FFD24A"/><path d="M8 78h74" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>';
  const CLIP = '<svg viewBox="0 0 30 70"><path d="M10 60V14a7 7 0 0 1 14 0v40a4 4 0 0 1-8 0V18" fill="none" stroke="#8A97AB" stroke-width="3" stroke-linecap="round"/></svg>';

  function themeLayer(host, theme, { overlay = false } = {}) {
    let layer = host.querySelector(':scope > .fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      host.prepend(layer);
    }
    layer.className = `fx-layer fx-${theme}${overlay ? ' overlay' : ''}`;
    layer.innerHTML = '';
    const add = (cls, style = {}, html = '') => {
      const s = document.createElement('span');
      s.className = cls;
      for (const k in style) s.style.setProperty(k, style[k]);
      s.innerHTML = html;
      layer.appendChild(s);
      return s;
    };
    if (theme === 'night') {
      for (let i = 0; i < (overlay ? 24 : 46); i++) add('fx-star', { left: rnd(0, 100) + '%', top: rnd(0, 100) + '%', '--s': rnd(1.5, 3.5) + 'px', 'animation-delay': rnd(0, 4) + 's', 'animation-duration': rnd(2, 4.5) + 's' });
      for (let i = 0; i < 2; i++) add('fx-shoot', { top: rnd(4, 40) + '%', right: rnd(0, 50) + '%', 'animation-delay': rnd(1, 9) + 's' });
      if (!overlay) {
        add('fx-moon');
        add('fx-cloud c1', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(157,179,217,.18)'));
        add('fx-cloud c2', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(157,179,217,.12)'));
      }
    } else if (theme === 'garden') {
      const cols = ['#F4A6C1', '#F7C948', '#FFFFFF', '#E5559A', '#B6E388'];
      for (let i = 0; i < (overlay ? 9 : 14); i++) add('fx-petal', { left: rnd(0, 100) + '%', '--c': cols[i % cols.length], 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(8, 15) + 's', '--sway': rnd(20, 70) + 'px' });
      if (!overlay) {
        add('fx-sun', {}, SUN);
        add('fx-cloud c1', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(255,255,255,.9)'));
        add('fx-cloud c2', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(255,255,255,.75)'));
        add('fx-grass', {}, GRASS);
        for (let i = 0; i < 6; i++) add('fx-flower', { left: rnd(2, 95) + '%', '--sz': rnd(16, 26) + 'px', 'animation-delay': rnd(0, 3) + 's' }, FLOWER(cols[i % 4]));
      }
    } else if (theme === 'ice') {
      for (let i = 0; i < (overlay ? 18 : 30); i++) add('fx-flake', { left: rnd(0, 100) + '%', '--sz': rnd(8, 20) + 'px', 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(7, 14) + 's', '--sway': rnd(15, 50) + 'px' }, FLAKE);
      if (!overlay) { add('fx-frost tl'); add('fx-frost br'); add('fx-icicles', {}, ICICLES); }
    } else if (theme === 'notebook') {
      if (!overlay) {
        add('fx-holes');
        add('fx-clip', {}, CLIP);
        add('fx-tape');
        DOODLES.forEach((d, i) => add('fx-doodle d' + i, { 'animation-delay': i * .4 + 's' }, d));
      }
    } else if (theme === 'ocean') {
      for (let i = 0; i < (overlay ? 12 : 20); i++) add('fx-bubble', { left: rnd(0, 100) + '%', '--sz': rnd(6, 22) + 'px', '--sway': rnd(-30, 30) + 'px', 'animation-delay': -rnd(0, 14) + 's', 'animation-duration': rnd(8, 16) + 's' });
      if (!overlay) {
        add('fx-rays');
        const cols = ['#2E8C6A', '#3FA37A', '#1F7A6B'];
        for (let i = 0; i < 5; i++) add('fx-weed', { left: rnd(2, 95) + '%', '--h': rnd(50, 90) + 'px', '--c': cols[i % 3], 'animation-delay': -rnd(0, 3) + 's' }, WEED);
        add('fx-waves', {}, WAVES);
      }
    } else if (theme === 'space') {
      for (let i = 0; i < (overlay ? 24 : 50); i++) add('fx-star', { left: rnd(0, 100) + '%', top: rnd(0, 100) + '%', '--s': rnd(1.2, 3.2) + 'px', 'animation-delay': rnd(0, 4) + 's', 'animation-duration': rnd(2, 5) + 's' });
      for (let i = 0; i < 2; i++) add('fx-shoot', { top: rnd(4, 50) + '%', right: rnd(0, 50) + '%', 'animation-delay': rnd(1, 9) + 's' });
      if (!overlay) {
        add('fx-nebula', { top: '-10%', right: '-10%' });
        add('fx-planet', { top: '18px', left: '20px', '--sz': '90px' }, PLANET('#8E6CF0', '#C9B4FF', '#F6E7A8'));
        add('fx-planet', { bottom: '22px', right: '30px', '--sz': '54px', 'animation-delay': '-3s' }, PLANET('#E8761E', '#F7C948', '#FFE6C4'));
      }
    } else if (theme === 'summer') {
      for (let i = 0; i < (overlay ? 8 : 14); i++) add('fx-glint', { left: rnd(0, 100) + '%', top: (overlay ? rnd(0, 100) : rnd(82, 96)) + '%', 'animation-delay': -rnd(0, 3) + 's', 'animation-duration': rnd(1.4, 2.8) + 's' });
      if (!overlay) {
        add('fx-sun big', {}, SUN);
        add('fx-cloud c1', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(255,255,255,.95)'));
        add('fx-cloud c2', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(255,255,255,.8)'));
        add('fx-sea', {}, SEA);
        add('fx-palm p1', {}, PALM);
        add('fx-palm p2', {}, PALM);
        add('fx-umbrella', {}, UMBRELLA);
        add('fx-ball', {}, BALL);
      }
    } else if (theme === 'winter') {
      for (let i = 0; i < (overlay ? 22 : 42); i++) add('fx-snow', { left: rnd(0, 100) + '%', '--sz': rnd(3, 8) + 'px', 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(6, 13) + 's', '--sway': rnd(-40, 40) + 'px' });
      if (!overlay) {
        add('fx-cloud c1 gray', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(201,214,232,.9)'));
        add('fx-cloud c2 gray', { 'animation-delay': -rnd(0, 40) + 's' }, CLOUD('rgba(201,214,232,.7)'));
        add('fx-hills', {}, HILLS);
        [[2, 70], [9, 52], [80, 64], [90, 82], [70, 44]].forEach(([l, h]) => add('fx-pine', { left: l + '%', '--h': h + 'px' }, PINE));
        add('fx-cabin', {}, CABIN);
        for (let i = 0; i < 3; i++) add('fx-smoke', { 'animation-delay': i * 1.4 + 's' });
      }
    } else if (theme === 'autumn') {
      const cols = ['#E8761E', '#C2621B', '#D9A42B', '#A8432A', '#E0A458'];
      for (let i = 0; i < (overlay ? 10 : 16); i++) add('fx-leaf', { left: rnd(0, 100) + '%', '--sz': rnd(12, 22) + 'px', '--c': cols[i % cols.length], 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(9, 16) + 's', '--sway': rnd(20, 70) + 'px' }, LEAF);
      if (!overlay) { add('fx-haze'); add('fx-pile', {}, PILE); }
    } else {
      for (let i = 0; i < (overlay ? 10 : 16); i++) add('fx-spark', { left: rnd(0, 100) + '%', top: rnd(10, 100) + '%', 'animation-delay': -rnd(0, 6) + 's', 'animation-duration': rnd(4, 8) + 's' });
      if (!overlay) {
        add('fx-corner tl'); add('fx-corner tr'); add('fx-corner bl'); add('fx-corner br');
        add('fx-lantern l1', {}, LANTERN);
        add('fx-lantern l2', {}, LANTERN);
      }
    }
    return layer;
  }

  /* زر الكتم في الشريط العلوي */
  function bindToggle(btn) {
    if (!btn) return;
    const paint = () => { btn.classList.toggle('muted', muted); btn.title = muted ? 'تشغيل الأصوات' : 'كتم الأصوات'; };
    btn.addEventListener('click', () => { muted = !muted; store.set('iqra_sound', muted ? 'off' : 'on'); paint(); if (!muted) play('tick'); });
    paint();
  }

  /* زر ملء الشاشة: تختفي الإعدادات وتكبر اللعبة (body.is-fs). يُخفى الزر حيث لا يدعمه المتصفح (آيفون) */
  function bindFullscreen(btn, target) {
    if (!btn) return;
    const root = target || document.documentElement;
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req) { btn.classList.add('hidden'); return; }
    const active = () => document.fullscreenElement || document.webkitFullscreenElement;
    btn.addEventListener('click', () => {
      if (active()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else req.call(root);
      btn.blur();
    });
    const sync = () => {
      document.body.classList.toggle('is-fs', !!active());
      btn.title = active() ? 'الخروج من ملء الشاشة' : 'ملء الشاشة';
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
  }

  /* شريط قوالب الشكل: يُسحب يمينًا ويسارًا بالإصبع أو الفأرة، والقالب المختار يظهر في المنتصف */
  function swipe(el) {
    if (!el || el._swipe) return;
    el._swipe = true;
    let down = null, moved = false;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;       // اللمس يسحب بطبيعته
      down = { x: e.clientX, left: el.scrollLeft };
      moved = false;
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) { moved = true; el.classList.add('dragging'); }
      if (moved) el.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = null; el.classList.remove('dragging'); });
    el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    el.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft -= e.deltaY; e.preventDefault(); } }, { passive: false });
    const on = el.querySelector('.on');
    if (on) requestAnimationFrame(() => on.scrollIntoView({ block: 'nearest', inline: 'center' }));
  }

  return { play, burst, floatText, bump, sequence, themeLayer, bindToggle, bindFullscreen, swipe };
})();
