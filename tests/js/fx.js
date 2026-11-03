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
      if (!overlay) add('fx-moon');
    } else if (theme === 'garden') {
      const cols = ['#F4A6C1', '#F7C948', '#FFFFFF', '#E5559A', '#B6E388'];
      for (let i = 0; i < (overlay ? 9 : 14); i++) add('fx-petal', { left: rnd(0, 100) + '%', '--c': cols[i % cols.length], 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(8, 15) + 's', '--sway': rnd(20, 70) + 'px' });
      if (!overlay) {
        add('fx-grass', {}, GRASS);
        for (let i = 0; i < 6; i++) add('fx-flower', { left: rnd(2, 95) + '%', '--sz': rnd(16, 26) + 'px', 'animation-delay': rnd(0, 3) + 's' }, FLOWER(cols[i % 4]));
      }
    } else if (theme === 'ice') {
      for (let i = 0; i < (overlay ? 18 : 30); i++) add('fx-flake', { left: rnd(0, 100) + '%', '--sz': rnd(8, 20) + 'px', 'animation-delay': -rnd(0, 12) + 's', 'animation-duration': rnd(7, 14) + 's', '--sway': rnd(15, 50) + 'px' }, FLAKE);
      if (!overlay) { add('fx-frost tl'); add('fx-frost br'); }
    } else if (theme === 'notebook') {
      if (!overlay) {
        add('fx-holes');
        DOODLES.forEach((d, i) => add('fx-doodle d' + i, { 'animation-delay': i * .4 + 's' }, d));
      }
    } else {
      for (let i = 0; i < (overlay ? 10 : 16); i++) add('fx-spark', { left: rnd(0, 100) + '%', top: rnd(10, 100) + '%', 'animation-delay': -rnd(0, 6) + 's', 'animation-duration': rnd(4, 8) + 's' });
      if (!overlay) { add('fx-corner tl'); add('fx-corner tr'); add('fx-corner bl'); add('fx-corner br'); }
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

  return { play, burst, floatText, bump, sequence, themeLayer, bindToggle };
})();
