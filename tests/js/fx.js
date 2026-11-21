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
  /* ضجيج منخفض يتلاشى: دويّ الانفجار */
  function noise(start, dur, vol = .5, f0 = 1400, f1 = 90) {
    const a = audio();
    if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
    const src = a.createBufferSource(), flt = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + start;
    src.buffer = buf; flt.type = 'lowpass';
    flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(flt).connect(g).connect(a.destination);
    src.start(t); src.stop(t + dur + .05);
  }
  const SOUNDS = {
    /* انفجار مريح: دويّ عميق ناعم، ثم هدير يخفت، وطقطقة خفيفة، بلا حدّة */
    boom: () => {
      tone(110, 0, .55, 'sine', .34, .32);
      tone(62, .01, .7, 'sine', .28, .6);
      noise(0, .9, .32, 700, 60);
      noise(.03, .35, .08, 2600, 900);
      [.08, .14, .23, .31].forEach((t, i) => noise(t, .07, .035 - i * .006, 3200, 1500));
    },
    shoot: () => { tone(880, 0, .12, 'square', .04, .35); noise(0, .1, .08, 4000, 800); },
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

  const SCENE = {
    classic: '<svg viewBox="0 0 600 90" preserveAspectRatio="xMidYMax slice"><g fill="#C9A96A"><path d="M0 90V70h40V58a22 22 0 0 1 44 0v12h30V40h8l4-14 4 14h8v50zM150 90V64h26V50a30 30 0 0 1 60 0v14h26v26zM300 90V72h30V62a18 18 0 0 1 36 0v10h24V34h6l4-16 4 16h6v56zM430 90V60h20V46a34 34 0 0 1 68 0v14h22v30zM560 90V70h40v20z"/></g><g fill="#AB3920" opacity=".55"><circle cx="206" cy="20" r="3"/><circle cx="484" cy="12" r="3"/><circle cx="62" cy="36" r="2.5"/></g></svg>',
    night: '<svg viewBox="0 0 600 90" preserveAspectRatio="xMidYMax slice"><g fill="#0B1330"><path d="M0 90V66h40V54a22 22 0 0 1 44 0v12h30V34h8l4-16 4 16h8v56zM150 90V60h26V46a30 30 0 0 1 60 0v14h26v30zM300 90V70h30V60a18 18 0 0 1 36 0v10h24V30h6l4-18 4 18h6v60zM430 90V58h20V44a34 34 0 0 1 68 0v14h22v32zM560 90V68h40v22z"/></g><g fill="#F6E7A8"><rect x="54" y="72" width="6" height="8" rx="3"/><rect x="190" y="68" width="6" height="9" rx="3"/><rect x="214" y="68" width="6" height="9" rx="3"/><rect x="340" y="76" width="6" height="8" rx="3"/><rect x="470" y="66" width="6" height="9" rx="3"/><rect x="494" y="66" width="6" height="9" rx="3"/><circle cx="125" cy="44" r="2.5"/><circle cx="395" cy="40" r="2.5"/></g></svg>',
    garden: '<svg viewBox="0 0 600 70" preserveAspectRatio="xMidYMax slice"><g fill="#7DBA62"><circle cx="30" cy="52" r="26"/><circle cx="70" cy="46" r="30"/><circle cx="120" cy="56" r="22"/><circle cx="250" cy="54" r="24"/><circle cx="290" cy="48" r="28"/><circle cx="420" cy="52" r="26"/><circle cx="470" cy="44" r="32"/><circle cx="530" cy="54" r="24"/><circle cx="580" cy="50" r="26"/></g><g fill="#F4F0E0" opacity=".9"><path d="M140 70V40l6-8 6 8v30zM170 70V40l6-8 6 8v30zM200 70V40l6-8 6 8v30zM320 70V40l6-8 6 8v30zM350 70V40l6-8 6 8v30zM380 70V40l6-8 6 8v30z"/><rect x="136" y="48" width="84" height="5"/><rect x="316" y="48" width="84" height="5"/></g><g fill="#E5559A"><circle cx="64" cy="34" r="4"/><circle cx="286" cy="36" r="4"/><circle cx="476" cy="30" r="4"/></g><g fill="#F7C948"><circle cx="40" cy="44" r="3.5"/><circle cx="440" cy="40" r="3.5"/><circle cx="560" cy="42" r="3.5"/></g></svg>',
    ice: '<svg viewBox="0 0 600 110" preserveAspectRatio="xMidYMax slice"><path d="M0 110 60 40l40 40 60-70 70 100 50-60 60 60 70-90 80 90 50-40 60 50v-10z" fill="#CDE7F4"/><path d="M60 40 72 54 50 52zM160 10l16 22-30-2zM230 110zM340 60l12 14-20 0zM410 20l14 20-28 0zM540 70l10 12-18 0z" fill="#FFFFFF"/><path d="M0 110 40 80l50 30 60-44 70 44 70-34 60 34 80-40 70 40 50-24 50 24z" fill="#BFE3F3"/></svg>',
    notebook: '<svg viewBox="0 0 600 60" preserveAspectRatio="xMidYMax slice"><rect x="20" y="30" width="300" height="24" fill="#F7E3A0" stroke="#2B4C7E" stroke-width="2"/><g stroke="#2B4C7E" stroke-width="2"><path d="M40 30v10M60 30v6M80 30v10M100 30v6M120 30v10M140 30v6M160 30v10M180 30v6M200 30v10M220 30v6M240 30v10M260 30v6M280 30v10M300 30v6"/></g><g transform="rotate(-8 470 36)"><rect x="380" y="30" width="170" height="16" fill="#F7C948" stroke="#2B4C7E" stroke-width="2"/><rect x="370" y="30" width="12" height="16" fill="#F4A6C1" stroke="#2B4C7E" stroke-width="2"/><path d="M550 30l22 8-22 8z" fill="#F6E0B5" stroke="#2B4C7E" stroke-width="2"/></g></svg>',
    ocean: '<svg viewBox="0 0 600 80" preserveAspectRatio="xMidYMax slice"><path d="M0 80V50q60-18 120-4t130 0 120-8 120 6 110-6v42z" fill="#E7D3A2"/><g fill="#CDB27A"><ellipse cx="80" cy="66" rx="10" ry="4"/><ellipse cx="300" cy="70" rx="12" ry="4"/><ellipse cx="520" cy="64" rx="9" ry="3"/></g><g fill="#F4A6C1"><path d="M160 62a10 10 0 0 1 20 0z"/><path d="M420 60a8 8 0 0 1 16 0z"/></g><g transform="translate(250 22)" stroke="#5A6B88" stroke-width="5" fill="none" stroke-linecap="round"><circle cx="20" cy="4" r="5"/><path d="M20 9v34M8 18h24M2 32q4 14 18 14t18-14"/></g><g transform="translate(480 34)"><rect x="0" y="10" width="44" height="26" rx="4" fill="#A0603A" stroke="#6B3F22" stroke-width="3"/><path d="M0 14a22 14 0 0 1 44 0z" fill="#B8743F" stroke="#6B3F22" stroke-width="3"/><rect x="18" y="16" width="8" height="10" fill="#F7C948"/></g></svg>',
    space: '<svg viewBox="0 0 600 80" preserveAspectRatio="xMidYMax slice"><path d="M0 80V46q80-14 160-2t150-6 140 4 150-4v42z" fill="#2A1D5E"/><g fill="#1E1446"><ellipse cx="90" cy="62" rx="26" ry="7"/><ellipse cx="280" cy="68" rx="18" ry="5"/><ellipse cx="470" cy="60" rx="30" ry="8"/></g><g stroke="#B48CFF" stroke-width="2" fill="none" opacity=".7"><path d="M64 60a26 7 0 0 1 52 0M262 66a18 5 0 0 1 36 0M440 58a30 8 0 0 1 60 0"/></g><g transform="translate(360 10)"><path d="M14 0c8 6 10 18 6 30H8C4 18 6 6 14 0z" fill="#EDE6FF"/><circle cx="14" cy="14" r="4" fill="#7FD3F7"/><path d="M8 24l-6 10h8zM20 24l6 10h-8z" fill="#E8761E"/></g></svg>',
    autumn: '<svg viewBox="0 0 600 90" preserveAspectRatio="xMidYMax slice"><path d="M0 90V60q90-30 180-6t160-8 150 4 110-10v50z" fill="#E2B07A"/><g fill="#6B4320"><rect x="70" y="40" width="6" height="30"/><rect x="250" y="34" width="7" height="34"/><rect x="460" y="38" width="6" height="30"/></g><g fill="#E8761E"><circle cx="73" cy="34" r="18"/><circle cx="253" cy="28" r="20"/><circle cx="463" cy="32" r="18"/></g><g fill="#C2621B"><circle cx="60" cy="42" r="11"/><circle cx="268" cy="38" r="12"/><circle cx="476" cy="40" r="11"/></g><g fill="#F08A2E" stroke="#B4520E" stroke-width="1.5"><ellipse cx="150" cy="78" rx="12" ry="9"/><ellipse cx="380" cy="80" rx="10" ry="8"/><ellipse cx="540" cy="76" rx="13" ry="9"/></g><g fill="#5C7F2A"><rect x="149" y="66" width="3" height="5"/><rect x="379" y="69" width="3" height="5"/><rect x="539" y="64" width="3" height="5"/></g></svg>',
  };
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
      if (!overlay) { add('fx-aurora'); add('fx-frost tl'); add('fx-frost br'); add('fx-icicles', {}, ICICLES); }
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
    if (!overlay && SCENE[theme]) add('fx-scene fx-scene-' + theme, {}, SCENE[theme]);
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
    /* كل أزرار ملء الشاشة في الصفحة (في اللوحة وفي شاشة النتيجة) تعمل بالطريقة نفسها */
    const toggle = b => {
      if (active()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else req.call(root);
      b.blur();
    };
    new Set([btn, ...document.querySelectorAll('.fs-btn')]).forEach(b => b.addEventListener('click', () => toggle(b)));
    const sync = () => {
      document.body.classList.toggle('is-fs', !!active());
      document.querySelectorAll('.fs-btn').forEach(b => { b.title = active() ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'; });
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
