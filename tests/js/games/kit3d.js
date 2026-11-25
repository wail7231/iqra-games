/* أدوات مشتركة للألعاب ثلاثية الأبعاد (Three.js):
   المشهد والكاميرا والإضاءة، ألوان كل قالب شكل وزينته (أشجار، نخيل، صنوبر، مرجان، كواكب…)،
   شكل اللاعب حسب القالب (بلا أرواح)، لافتات الإجابات بالخط العربي، والتحكم بالأسهم والسحب واللمس. */
'use strict';

const K3 = (() => {
  /* ---------- ألوان القوالب ---------- */
  const THEMES = {
    classic:  { sky: ['#F7E4C2', '#FDF6EA'], ground: '#E2C796', ground2: '#C9A56E', path: '#F6EAD2', wall: '#AB3920', wall2: '#7E2A17', accent: '#AB3920', gold: '#E3B341', card: '#FFFDF6', ink: '#2A1A0E', deco: 'domes', fx: 'sparks' },
    night:    { sky: ['#070D24', '#1D2C5E'], ground: '#1B2752', ground2: '#121B3D', path: '#26386E', wall: '#3A5BA8', wall2: '#59C3F0', accent: '#59C3F0', gold: '#F6E7A8', card: '#1B2752', ink: '#EAF4FF', deco: 'night', fx: 'stars', dark: true },
    garden:   { sky: ['#8CD0F2', '#E6F6FD'], ground: '#7DBA62', ground2: '#5FA052', path: '#EFE4C4', wall: '#4C9A4A', wall2: '#3F7D3A', accent: '#E5559A', gold: '#F7C948', card: '#FFFDF4', ink: '#22361F', deco: 'trees', fx: 'petals' },
    ice:      { sky: ['#9FD3EE', '#F2FAFE'], ground: '#F4FAFF', ground2: '#D3EAF7', path: '#E3F3FB', wall: '#7FC2E8', wall2: '#2D7FB8', accent: '#2D7FB8', gold: '#9CD5F2', card: '#FFFFFF', ink: '#12354A', deco: 'crystals', fx: 'flakes' },
    notebook: { sky: ['#FDFBF3', '#FDFBF3'], ground: '#FFFFFF', ground2: '#EEF3FA', path: '#FFFFFF', wall: '#FFFFFF', wall2: '#2B4C7E', accent: '#2B4C7E', gold: '#E8A3A3', card: '#FFFFFF', ink: '#1F2F4D', deco: 'paper', fx: 'none', sketch: true },
    ocean:    { sky: ['#3FA9BC', '#BFEAF0'], ground: '#E7D3A2', ground2: '#CDB27A', path: '#F2E4BE', wall: '#3FB0B8', wall2: '#0E7C86', accent: '#0E7C86', gold: '#F7C948', card: '#FFFFFF', ink: '#0B3B47', deco: 'coral', fx: 'bubbles' },
    space:    { sky: ['#07041A', '#3A2380'], ground: '#3A2A7A', ground2: '#2A1D5E', path: '#4A3A8A', wall: '#6E52C8', wall2: '#B48CFF', accent: '#B48CFF', gold: '#F6E7A8', card: '#22164A', ink: '#F1EAFF', deco: 'space', fx: 'stars', dark: true },
    autumn:   { sky: ['#F6B979', '#FCE9CF'], ground: '#D69A55', ground2: '#B5793E', path: '#F2DDBA', wall: '#C2621B', wall2: '#8A5226', accent: '#C2621B', gold: '#D9A42B', card: '#FFFAF2', ink: '#3D2412', deco: 'autumn', fx: 'leaves' },
    summer:   { sky: ['#43B8EC', '#D9F3FC'], ground: '#F4D9A2', ground2: '#E3B871', path: '#FFF3D6', wall: '#F7B32B', wall2: '#E8590C', accent: '#E8590C', gold: '#F7B32B', card: '#FFFFFF', ink: '#4A2A0A', deco: 'palms', fx: 'glints' },
    winter:   { sky: ['#8EA6C8', '#EEF3F8'], ground: '#FFFFFF', ground2: '#DCE5F0', path: '#EEF3FA', wall: '#5A7BC4', wall2: '#3B5BA9', accent: '#3B5BA9', gold: '#C0392B', card: '#FFFFFF', ink: '#1E2A44', deco: 'pines', fx: 'snow' },
  };
  const theme = () => THEMES[Play.cfg.theme] || THEMES.classic;
  const col = c => new THREE.Color(c);
  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const glow = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- لافتات الإجابات: نص عربي على لوحة ملوّنة ---------- */
  const fontOf = (px, bold = true) => `${Play.quran ? 400 : (bold ? 700 : 600)} ${px}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;
  const fonts = (document.fonts ? Promise.all([
    document.fonts.load("700 40px 'IBM Plex Sans Arabic'"), document.fonts.load("400 40px 'Amiri Quran'"),
  ]).catch(() => {}) : Promise.resolve());
  function textCanvas(text, { bg = '#FFFFFF', fg = '#222222', edge = null, px = 64, pad = 34, minW = 0, radius = 30, shadow = true } = {}) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = fontOf(px);
    const tw = Math.min(1400, g.measureText(text).width);
    const H = Math.round(px * (Play.quran ? 2.05 : 1.75)) + (shadow ? 12 : 0);
    const W = Math.max(minW, Math.round(tw + pad * 2));
    c.width = W; c.height = H;
    g.font = fontOf(px);
    const bh = H - (shadow ? 12 : 0);
    if (bg) {
      if (shadow) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.roundRect(4, 12, W - 8, bh - 4, radius); g.fill(); }
      g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, W - 8, bh - 8, radius); g.fill();
      if (edge) { g.strokeStyle = edge; g.lineWidth = 7; g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(14, 10, W - 28, bh * .32, radius * .7); g.fill();
    }
    g.direction = 'rtl';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.fillText(text, W / 2, bh / 2 + (Play.quran ? px * .12 : 2), W - pad * 1.4);
    return c;
  }
  function texture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 4;
    t.minFilter = THREE.LinearFilter;
    return t;
  }
  /* لافتة تواجه الكاميرا دائمًا (Sprite) بارتفاع h */
  function sign(text, o = {}) {
    const th = theme();
    const c = textCanvas(text, { bg: o.bg || th.card, fg: o.fg || th.ink, edge: o.edge === undefined ? th.accent : o.edge, ...o });
    const m = new THREE.SpriteMaterial({ map: texture(c), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    const h = o.h || .8;
    s.scale.set(h * c.width / c.height, h, 1);
    s.userData.ratio = c.width / c.height;
    s.renderOrder = 5;
    return s;
  }
  /* لافتة مسطّحة (تُثبَّت على بوابة أو وجه مكعب) */
  function plate(text, w, h, o = {}) {
    const th = theme();
    const c = textCanvas(text, { bg: o.bg || th.card, fg: o.fg || th.ink, edge: o.edge === undefined ? th.accent : o.edge, minW: Math.round((w / h) * 120), shadow: false, ...o });
    const m = new THREE.MeshBasicMaterial({ map: texture(c), transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), m);
    return mesh;
  }
  function recolorSign(s, text, o) {
    const th = theme();
    const c = textCanvas(text, { bg: o.bg || th.card, fg: o.fg || th.ink, edge: o.edge === undefined ? th.accent : o.edge, ...o });
    s.material.map.dispose();
    s.material.map = texture(c);
    s.material.needsUpdate = true;
  }

  /* ---------- المشهد ---------- */
  function skyTexture(th) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(.72, th.sky[1]); gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    /* توهّج دافئ (أو بارد ليلًا) قرب الأفق */
    const glowC = th.dark ? 'rgba(120,140,255,.22)' : th.deco === 'pines' || th.deco === 'crystals' ? 'rgba(255,255,255,.45)' : 'rgba(255,236,190,.55)';
    const hg = g.createLinearGradient(0, 150, 0, 256); hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(.7, glowC); hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg; g.fillRect(0, 150, 256, 106);
    /* غيوم رقيقة ممدودة في الأعلى */
    if (!th.sketch) {
      g.fillStyle = th.dark ? 'rgba(180,170,255,.07)' : 'rgba(255,255,255,.35)';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rnd(0, 256), rnd(20, 140), rnd(30, 70), rnd(4, 9), 0, 0, 7); g.fill(); }
    }
    return texture(c);
  }

  const dotTex = (() => {
    let t = null;
    return () => {
      if (t) return t;
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return (t = texture(c));
    };
  })();

  function create({ fov = 50, maxH = 480, ratio = .6, fogNear = 30, fogFar = 90, fsPad = 40 } = {}) {
    const wrap = el('div', 'k3-wrap run-wrap keep');
    const cv = el('canvas', 'k3-canvas run-canvas');
    const start = el('div', 'run-start', '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
    wrap.append(cv, start);
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    let pr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr);
    /* ظلال حقيقية ناعمة من الشمس */
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1.6, .1, 300);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a8a, .62);
    const sun = new THREE.DirectionalLight(0xffffff, .58);
    sun.position.set(-8, 14, 10);
    sun.castShadow = true;
    /* الأجهزة الضعيفة (ذاكرة أو أنوية قليلة) تبدأ بجودة أخف */
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    sun.shadow.mapSize.set(weak ? 1024 : 1536, weak ? 1024 : 1536);
    if (weak) { pr = Math.min(pr, 1.25); renderer.setPixelRatio(pr); }
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
    sun.shadow.bias = -.0006;
    sun.shadow.normalBias = .03;
    scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xffffff, .22);
    fill.position.set(9, 6, -8);
    scene.add(hemi, sun, fill);
    const S = {
      wrap, cv, start, renderer, scene, camera, hemi, sun, W: 0, H: 0, t: 0, started: false,
      env: new THREE.Group(), fx: [], themeId: null, keys: {}, onFrame: null, onTheme: null,
    };
    scene.add(S.env);
    S.size = () => {
      S.W = wrap.clientWidth || 600;
      const fs = document.body.classList.contains('is-fs');
      S.H = Math.round(fs ? window.innerHeight - fsPad : Math.min(maxH, Math.max(320, S.W * ratio)));
      renderer.setSize(S.W, S.H, false);
      cv.style.height = S.H + 'px';
      camera.aspect = S.W / S.H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', () => { if (wrap.isConnected) S.size(); });
    /* القالب: السماء والضباب والإضاءة والزينة؛ يُعاد بناؤه إن غيّر المعلم القالب أثناء اللعب */
    S.applyTheme = () => {
      const th = theme();
      S.themeId = Play.cfg.theme;
      if (scene.background && scene.background.dispose) scene.background.dispose();
      scene.background = skyTexture(th);
      scene.fog = new THREE.Fog(th.sky[1], fogNear, fogFar);
      hemi.intensity = th.dark ? .5 : .62;
      sun.intensity = th.dark ? .45 : .58;
      hemi.groundColor = col(th.dark ? '#24204a' : '#9a8f80');
      hemi.color = col('#FFFFFF').lerp(col(th.sky[1]), .25);
      fill.color = col(th.accent).lerp(col('#FFFFFF'), .55);
      fill.intensity = th.dark ? .32 : .2;
      clear(S.env);
      S.fx.length = 0;
      /* لون المؤشرات في واجهة اللعبة (شعيرة التصويب، وعصا اللمس) */
      const aim = aimColor(th);
      S.wrap.style.setProperty('--aim', aim);
      S.wrap.style.setProperty('--aim-edge', aim === '#FFFFFF' ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.85)');
      if (S.onTheme) S.onTheme(th);
    };
    /* بداية اللعب بلمسة أو زر */
    S.begin = () => {
      if (S.started) return false;
      S.started = true;
      start.classList.add('hidden');
      Play.touch();
      return true;
    };
    start.addEventListener('pointerdown', e => { e.preventDefault(); S.begin(); });
    S.screen = v => {
      const p = v.clone().project(camera), r = cv.getBoundingClientRect();
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
    };
    const sunDir = new THREE.Vector3(), sunFocus = new THREE.Vector3(), perf = { n: 0, sum: 0 };
    S.onScreen = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { S.onScreen = es[0].isIntersecting; }).observe(wrap);
    let last = performance.now();
    function frame(now) {
      if (!wrap.isConnected) { renderer.dispose(); return; }
      const raw = now - last, dt = Math.min(.04, raw / 1000);
      last = now;
      /* اللعبة خارج الشاشة أو الصفحة مخفية: لا رسم (توفير للبطارية والمعالج) */
      if (document.hidden || !S.onScreen) { requestAnimationFrame(frame); return; }
      /* جودة تتكيف مع الجهاز: إن بطؤ الرسم نخفّض الدقة، ثم الظلال */
      perf.n++; perf.sum += raw;
      if (perf.n >= 90) {
        const avg = perf.sum / perf.n;
        perf.n = perf.sum = 0;
        if (avg > 24 && pr > 1) { pr = Math.max(1, pr - .25); renderer.setPixelRatio(pr); S.size(); }
        else if (avg > 28 && renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(m => { if (m.material) [].concat(m.material).forEach(x => { x.needsUpdate = true; }); }); }
      }
      S.t += dt;
      if (S.themeId !== Play.cfg.theme) S.applyTheme();
      if (S.onFrame) S.onFrame(dt);
      /* الشمس تتبع ما تنظر إليه الكاميرا حتى تبقى الظلال حادة قرب اللاعب */
      camera.getWorldDirection(sunDir);
      const k = sunDir.y < -.05 ? Math.min(30, -camera.position.y / sunDir.y) : 14;
      sunFocus.copy(camera.position).addScaledVector(sunDir, k * .8);
      sun.target.position.copy(sunFocus);
      sun.position.set(sunFocus.x - 14, sunFocus.y + 26, sunFocus.z + 16);
      /* كل فترة: ما يُلقي الظل وما يستقبله (الأشياء الجديدة تُضاف تلقائيًا) */
      if ((S.frames = (S.frames || 0) + 1) % 30 === 1) castShadows(scene);
      S.fx.forEach(f => f(dt, S.t));
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return S;
  }
  /* يُلقي الظل كل مجسّم صلب، ولا تُلقيه الأسطح المسطّحة ولا الشفافة ولا المتوهجة ولا العشب الكثير */
  const FLAT = /Plane|Circle|Ring/;
  function castShadows(root) {
    root.traverse(m => {
      if (!m.isMesh || m.userData.shadowDone) return;
      m.userData.shadowDone = true;
      const mats = [].concat(m.material);
      const see = mats.every(x => !x.transparent || x.opacity > .9) && !mats.some(x => x.isMeshBasicMaterial);
      m.castShadow = see && !FLAT.test(m.geometry.type) && !(m.isInstancedMesh && m.geometry.type === 'ConeGeometry');
      m.receiveShadow = !mats.some(x => x.isMeshBasicMaterial);
    });
  }
  function clear(g) {
    while (g.children.length) {
      const o = g.children.pop();
      o.traverse(m => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) [].concat(m.material).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); });
      });
    }
  }

  /* ---------- التحكم: أسهم، سحب بالإصبع، ولمسة ---------- */
  function controls(S, { dir, tap, hold } = {}) {
    const keyDir = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
    const onKey = e => {
      if (!S.wrap.isConnected) { document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onUp); return; }
      if (e.target.closest && e.target.closest('input, textarea')) return;
      const d = keyDir[e.code];
      if (d || e.code === 'Space') e.preventDefault();
      S.keys[e.code] = true;
      if (!S.started) { if (d || e.code === 'Space' || e.code === 'Enter') S.begin(); return; }
      if (d && dir) dir(d, e.repeat);
      if ((e.code === 'Space' || e.code === 'Enter') && tap) tap(null);
    };
    const onUp = e => { S.keys[e.code] = false; };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onUp);
    let down = null;
    S.cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!S.started) { S.begin(); return; }
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      try { S.cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (hold) hold(e, 'down');
    });
    S.cv.addEventListener('pointermove', e => { if (down && hold) hold(e, 'move'); });
    const up = e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      down = null;
      if (hold) hold(e, 'up');
      if (Math.hypot(dx, dy) > 26) {
        if (dir) dir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), false, true);
      } else if (tap) tap(e);
    };
    S.cv.addEventListener('pointerup', up);
    S.cv.addEventListener('pointercancel', () => { down = null; if (hold) hold(null, 'up'); });
  }
  /* عصا تحكم باللمس: تظهر تحت الإصبع حيث يلمس، وتعيد اتجاهًا بين -1 و1 (x يمين، z أسفل) */
  function joystick(S) {
    const joy = { x: 0, z: 0, o: null, active: false };
    const ui = el('div', 'k3-joy', '<i></i>');
    S.wrap.appendChild(ui);
    joy.hold = (e, phase) => {
      if (phase === 'down' && e) {
        joy.o = { x: e.clientX, y: e.clientY }; joy.active = true;
        const r = S.wrap.getBoundingClientRect();
        ui.style.left = (e.clientX - r.left) + 'px'; ui.style.top = (e.clientY - r.top) + 'px';
        ui.classList.add('on');
      } else if (phase === 'move' && joy.o && e) {
        const dx = e.clientX - joy.o.x, dy = e.clientY - joy.o.y, len = Math.hypot(dx, dy);
        const k = len < 6 ? 0 : Math.min(1, len / 55) / len;
        joy.x = dx * k; joy.z = dy * k;
        ui.firstChild.style.transform = 'translate(' + Math.max(-28, Math.min(28, dx)) + 'px,' + Math.max(-28, Math.min(28, dy)) + 'px)';
      } else if (phase === 'up') {
        joy.o = null; joy.x = joy.z = 0; joy.active = false;
        ui.classList.remove('on'); ui.firstChild.style.transform = '';
      }
    };
    /* اتجاه موحّد من الأسهم والعصا */
    joy.read = () => {
      const k = S.keys;
      let x = joy.x, z = joy.z;
      if (k.ArrowLeft || k.KeyA) x -= 1;
      if (k.ArrowRight || k.KeyD) x += 1;
      if (k.ArrowUp || k.KeyW) z -= 1;
      if (k.ArrowDown || k.KeyS) z += 1;
      const l = Math.hypot(x, z);
      return l > 1 ? { x: x / l, z: z / l } : { x, z };
    };
    return joy;
  }
  /* نقطة على الأرض (مستوى y) تحت إصبع اللاعب */
  const ray = new THREE.Raycaster();
  function pick(S, e, objects) {
    const r = S.cv.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, S.camera);
    return objects ? ray.intersectObjects(objects, true)[0] : null;
  }
  function groundPoint(S, e, y = 0) {
    const r = S.cv.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, S.camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }

  function starShape(r1, r2, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i <= n * 2; i++) {
      const a = Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  }
  function starMesh(r, color, depth = .22) {
    const g = new THREE.ExtrudeGeometry(starShape(r, r * .45), { depth, bevelEnabled: true, bevelThickness: Math.min(.06, r * .12), bevelSize: Math.min(.05, r * .1), bevelSegments: 2 });
    g.center();
    return new THREE.Mesh(g, mat(color, { emissive: col(color).multiplyScalar(.25) }));
  }
  /* أجزاء تتحرك وحدها (نجوم صغيرة تدور، لمعات تومض): تتحدّث قبل رسمها في كل إطار */
  const clock = () => performance.now() / 1000;
  function orbit(parent, mesh, r, speed, tilt = 0, phase = 0, y = 0) {
    const pivot = new THREE.Group();
    pivot.rotation.x = tilt;
    mesh.position.set(r, y, 0);
    pivot.add(mesh);
    parent.add(pivot);
    mesh.onBeforeRender = () => { pivot.rotation.y = phase + clock() * speed; };
    return pivot;
  }
  function twinkle(mesh, speed = 3, phase = 0, base = 1, amp = .35) {
    const s0 = mesh.scale.x;
    mesh.onBeforeRender = () => mesh.scale.setScalar(s0 * (base + Math.sin(clock() * speed + phase) * amp));
    return mesh;
  }
  const sparkTex = (() => {
    let t = null;
    return () => {
      if (t) return t;
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(32, 0); g.quadraticCurveTo(36, 28, 64, 32); g.quadraticCurveTo(36, 36, 32, 64); g.quadraticCurveTo(28, 36, 0, 32); g.quadraticCurveTo(28, 28, 32, 0); g.fill();
      return (t = texture(c));
    };
  })();
  const spark = (c = '#FFFFFF', s = .25) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex(), color: c, transparent: true, depthWrite: false })); m.scale.set(s, s, 1); return m; };
  const halo = (c, s, o = .5) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: c, transparent: true, opacity: o, depthWrite: false })); m.scale.set(s, s, 1); return m; };
  function crescentShape(r) {
    const s = new THREE.Shape();
    s.absarc(0, 0, r, Math.PI * .5, Math.PI * 1.5, false);
    s.absarc(r * .42, 0, r * .82, Math.PI * 1.36, Math.PI * .64, true);
    return s;
  }

  /* ---------- شكل اللاعب حسب القالب (أشكال بلا أرواح، بتفاصيل وأجزاء تتحرك) ---------- */
  function player(kind = THEME_EMBLEM[Play.cfg.theme] || 'star') {
    const g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    g.userData.body = body;
    const sph = (r, c, o, ws = 28, hs = 20) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat(c, o));
    const shiny = (c, o = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: 80, specular: col('#FFFFFF').multiplyScalar(.35), ...o });
    switch (kind) {
      case 'moon': {
        /* هلال ذهبي بحواف ناعمة، وفوهات صغيرة، ونجمتان تدوران حوله */
        const geo = new THREE.ExtrudeGeometry(crescentShape(.55), { depth: .22, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 4, curveSegments: 32 });
        geo.center();
        const m = new THREE.Mesh(geo, shiny('#FFF0B0', { emissive: col('#F2C94C').multiplyScalar(.45) }));
        body.add(m);
        [[-.32, .2, .17, .07], [-.38, -.18, .17, .05], [-.18, .4, .16, .04]].forEach(([x, y, z, r]) => { const c = sph(r, '#E2B85A'); c.position.set(x, y, z); c.scale.z = .35; body.add(c); });
        g.add(halo('#F6E7A8', 2.1, .5));
        for (let i = 0; i < 2; i++) { const s = starMesh(.12, '#FFF6D0', .05); orbit(g, s, .78, 1.2 + i * .5, .5 - i, i * 3); }
        orbit(g, spark('#FFFFFF', .22), .62, -2, .9, 1);
        break;
      }
      case 'flower': {
        /* زهرة بطبقتين من البتلات، وقلب منقّط، وأوراق خضراء */
        const heart = sph(.22, '#F7C948', { emissive: col('#E07A1F').multiplyScalar(.15) });
        heart.scale.z = .55; body.add(heart);
        for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = .05 + Math.sqrt(i / 14) * .15, d = sph(.028, '#B8681E', {}, 8, 6); d.position.set(Math.cos(a) * rr, Math.sin(a) * rr, .12); body.add(d); }
        const petal = new THREE.SphereGeometry(.2, 16, 12);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, p = new THREE.Mesh(petal, shiny('#E5559A')); p.scale.set(1.45, .7, .35);
          p.position.set(Math.cos(a) * .4, Math.sin(a) * .4, -.03); p.rotation.z = a; body.add(p);
          const a2 = a + Math.PI / 8, q = new THREE.Mesh(petal, shiny('#F4A6C1')); q.scale.set(1.05, .55, .3);
          q.position.set(Math.cos(a2) * .3, Math.sin(a2) * .3, .03); q.rotation.z = a2; body.add(q);
        }
        for (const s of [-1, 1]) { const l = sph(.18, '#5FA052', { flatShading: true }); l.scale.set(1.5, .5, .2); l.position.set(s * .5, -.42, -.1); l.rotation.z = s * .5; body.add(l); }
        orbit(g, sph(.04, '#FFFFFF', { emissive: col('#FFFFFF').multiplyScalar(.5) }), .75, 1.6, .4);
        break;
      }
      case 'snow': {
        /* ندفة ثلج بستة أذرع مزخرفة، وبلورة في القلب، ولمعات */
        const m = shiny('#FFFFFF', { emissive: col('#9CD5F2').multiplyScalar(.35) });
        const core = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .1, 6), shiny('#BFE3F3', { emissive: col('#4A9CCB').multiplyScalar(.2) }));
        core.rotation.x = Math.PI / 2; body.add(core);
        const arm = new THREE.BoxGeometry(.56, .08, .08), twig = new THREE.BoxGeometry(.2, .055, .055);
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, armG = new THREE.Group(); armG.rotation.z = a;
          const b = new THREE.Mesh(arm, m); b.position.x = .32; armG.add(b);
          for (const [x, l] of [[.3, 1], [.46, .7]]) for (const d of [-1, 1]) { const t = new THREE.Mesh(twig, m); t.scale.x = l; t.position.set(x + .04, d * .06, 0); t.rotation.z = d * .9; armG.add(t); }
          const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), shiny('#9CD5F2', { emissive: col('#59C3F0').multiplyScalar(.4) })); tip.position.x = .62; armG.add(tip);
          body.add(armG);
        }
        g.add(halo('#CFEFFF', 1.7, .45));
        for (let i = 0; i < 3; i++) orbit(g, twinkle(spark('#FFFFFF', .2), 4, i * 2, 1, .4), .7, 1 + i * .3, i * .7, i * 2);
        break;
      }
      case 'sketch': {
        /* كرة مرسومة بالقلم: خطوط مزدوجة مهتزة، وتظليل، وقلم رصاص صغير يدور حولها */
        const geo = new THREE.IcosahedronGeometry(.48, 1);
        body.add(new THREE.Mesh(geo, mat('#FFFFFF')));
        const ink = new THREE.LineBasicMaterial({ color: '#2B4C7E' });
        body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), ink));
        const l2 = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#5A6B88', transparent: true, opacity: .5 }));
        l2.scale.setScalar(1.035); l2.rotation.set(.05, .08, .03); body.add(l2);
        const hatch = new THREE.Group();
        for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.02, .3, .005), new THREE.MeshBasicMaterial({ color: '#9AA6BB' })); p.position.set(-.1 + i * .07, -.22, .44); p.rotation.z = .6; hatch.add(p); }
        body.add(hatch);
        const pencil = new THREE.Group();
        const wood = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .34, 6), mat('#F7C948')); pencil.add(wood);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(.05, .1, 6), mat('#F6E0B5')); tip.position.y = -.22; tip.rotation.x = Math.PI; pencil.add(tip);
        const lead = new THREE.Mesh(new THREE.ConeGeometry(.018, .04, 6), mat('#2B4C7E')); lead.position.y = -.28; lead.rotation.x = Math.PI; pencil.add(lead);
        const rub = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .07, 6), mat('#F4A6C1')); rub.position.y = .2; pencil.add(rub);
        pencil.rotation.z = .5;
        orbit(g, pencil, .78, 1.3, .3);
        break;
      }
      case 'bubble': {
        /* فقاعة بألوان قوس قزح خفيفة، ولمعات، وفقاعات صغيرة تدور */
        body.add(new THREE.Mesh(new THREE.SphereGeometry(.5, 40, 30), new THREE.MeshPhongMaterial({ color: '#9ED8DE', transparent: true, opacity: .42, shininess: 140, specular: col('#FFFFFF'), emissive: col('#F4A6C1').multiplyScalar(.12) })));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(.49, .012, 6, 48), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .55 }));
        body.add(rim);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 18), new THREE.MeshBasicMaterial({ color: '#C9B4FF', transparent: true, opacity: .12, side: THREE.BackSide }));
        body.add(inner);
        const hl = sph(.11, '#FFFFFF', { emissive: col('#FFFFFF') }); hl.scale.set(1.4, .8, .5); hl.position.set(-.2, .24, .38); hl.rotation.z = .6; body.add(hl);
        const hl2 = sph(.05, '#FFFFFF', { emissive: col('#FFFFFF') }); hl2.position.set(.24, -.2, .4); body.add(hl2);
        const small = () => new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshPhongMaterial({ color: '#BFEAF0', transparent: true, opacity: .55, shininess: 120 }));
        orbit(g, small(), .72, 1.3, .3);
        orbit(g, small(), .66, -1, -.5, 2);
        break;
      }
      case 'planet': {
        /* كوكب بأحزمة ملوّنة، وحلقتين مائلتين، وقمر صغير يدور */
        body.add(sph(.4, '#8E6CF0', { emissive: col('#3A2380').multiplyScalar(.4) }, 36, 28));
        [[.18, '#C9B4FF', .405], [-.08, '#B48CFF', .41], [-.25, '#6E52C8', .36]].forEach(([y, c, r]) => {
          const band = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(Math.max(.01, r * r - y * y)) + .005, .035, 8, 48), mat(c)); band.rotation.x = Math.PI / 2; band.position.y = y; body.add(band);
        });
        const spot = sph(.08, '#E8761E'); spot.position.set(.2, .05, .32); spot.scale.z = .4; body.add(spot);
        const ringG = new THREE.Group(); ringG.rotation.x = Math.PI / 2 - .45; ringG.rotation.y = .2;
        ringG.add(new THREE.Mesh(new THREE.TorusGeometry(.66, .045, 8, 64), mat('#F6E7A8', { emissive: col('#F6E7A8').multiplyScalar(.45) })));
        ringG.add(new THREE.Mesh(new THREE.TorusGeometry(.8, .025, 6, 64), mat('#FFE6C4', { emissive: col('#E8761E').multiplyScalar(.3), transparent: true, opacity: .8 })));
        g.add(ringG);
        orbit(g, sph(.08, '#D9D9E8', { emissive: col('#FFFFFF').multiplyScalar(.15) }), 1, 1.1, .6);
        g.add(halo('#B48CFF', 1.8, .35));
        break;
      }
      case 'pumpkin': {
        /* يقطينة بفصوص لامعة، وساق ملتوية، وورقة، ومحلاق ملفوف */
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.SphereGeometry(.28, 22, 16), shiny(i % 2 ? '#E8761E' : '#F08A2E')); s.scale.set(.72, .95, 1.2); s.position.set(Math.cos(a) * .2, 0, Math.sin(a) * .2); s.rotation.y = -a; body.add(s); }
        const st = new THREE.Mesh(new THREE.CylinderGeometry(.045, .075, .24, 8), mat('#5C7F2A'));
        st.position.set(.02, .36, 0); st.rotation.z = -.25; body.add(st);
        const leaf = sph(.13, '#6E9B35', { flatShading: true }); leaf.scale.set(1.6, .2, .9); leaf.position.set(-.16, .32, .05); leaf.rotation.z = .4; body.add(leaf);
        const vine = new THREE.Mesh(new THREE.TorusGeometry(.08, .012, 6, 20, Math.PI * 1.6), mat('#5C7F2A')); vine.position.set(.16, .38, .05); body.add(vine);
        orbit(g, new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 6), mat('#C2621B')), .7, 1.2, .3);
        break;
      }
      case 'sun': {
        /* شمس بطبقتين من الأشعة تدوران بعكس بعض، وتاج مضيء */
        const core = sph(.34, '#FFD24A', { emissive: col('#F7A21B').multiplyScalar(.65) }, 32, 24);
        body.add(core);
        const inner = sph(.25, '#FFF3B0', { emissive: col('#FFE07A').multiplyScalar(.6), transparent: true, opacity: .6 });
        inner.position.z = .12; body.add(inner);
        const cone = new THREE.ConeGeometry(.075, .26, 8);
        const rays1 = new THREE.Group(), rays2 = new THREE.Group();
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = new THREE.Mesh(cone, mat('#F7A21B', { emissive: col('#E8590C').multiplyScalar(.45) })); c.position.set(Math.cos(a) * .47, Math.sin(a) * .47, 0); c.rotation.z = a - Math.PI / 2; rays1.add(c); }
        for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * Math.PI * 2, c = new THREE.Mesh(cone, mat('#FFD24A', { emissive: col('#F7B32B').multiplyScalar(.5) })); c.scale.setScalar(.7); c.position.set(Math.cos(a) * .42, Math.sin(a) * .42, -.03); c.rotation.z = a - Math.PI / 2; rays2.add(c); }
        rays1.children[0].onBeforeRender = () => { rays1.rotation.z = clock() * .6; };
        rays2.children[0].onBeforeRender = () => { rays2.rotation.z = -clock() * .9; };
        body.add(rays1, rays2);
        const corona = new THREE.Mesh(new THREE.TorusGeometry(.38, .02, 6, 48), glow('#FFF3B0'));
        body.add(corona);
        g.add(twinkle(halo('#FFD24A', 2, .5), 2, 0, 1, .06));
        break;
      }
      case 'snowball': {
        /* كرة ثلج متكتلة، عليها حبات ثلج بارزة ولمعات تومض */
        const geo = new THREE.IcosahedronGeometry(.48, 3), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + (Math.sin(v.x * 23) * Math.cos(v.y * 19) * Math.sin(v.z * 17)) * .05; p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
        geo.computeVertexNormals();
        body.add(new THREE.Mesh(geo, mat('#FFFFFF', { emissive: col('#DCE5F0').multiplyScalar(.3) })));
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 2 - 1), c = new THREE.Mesh(new THREE.DodecahedronGeometry(.06 + Math.random() * .05, 0), mat(i % 3 ? '#FFFFFF' : '#DCE8F7', { flatShading: true }));
          c.position.setFromSphericalCoords(.48, e, a); body.add(c);
        }
        for (let i = 0; i < 4; i++) { const s = twinkle(spark('#FFFFFF', .2), 3 + i, i * 1.7, 1, .5); s.position.setFromSphericalCoords(.55, 1 + i * .4, i * 1.6); body.add(s); }
        orbit(g, new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), mat('#FFFFFF')), .72, 1.4, .5);
        orbit(g, new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), mat('#FFFFFF')), .66, -1.1, -.3, 2);
        break;
      }
      default: { // star — نجمة ذهبية بنجمة حمراء بارزة وحبات على الأطراف ولمعات تدور
        const s = starMesh(.55, '#E3B341', .24);
        s.material = shiny('#E3B341', { emissive: col('#E3B341').multiplyScalar(.25) });
        body.add(s);
        const inner = starMesh(.27, '#AB3920', .1); inner.position.z = .2; body.add(inner);
        const c = sph(.08, '#FFF3C4', { emissive: col('#FFF3C4').multiplyScalar(.5) }); c.position.z = .27; body.add(c);
        for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 5, b = sph(.05, '#FFF3C4', { emissive: col('#FFF3C4').multiplyScalar(.4) }, 10, 8); b.position.set(Math.cos(a) * .5, Math.sin(a) * .5, .14); body.add(b); }
        g.add(halo('#F7D774', 1.7, .4));
        for (let i = 0; i < 3; i++) orbit(g, twinkle(spark('#FFF3C4', .22), 4, i * 2, 1, .4), .78, 1.2 + i * .3, i * .6 - .3, i * 2.1);
      }
    }
    g.userData.kind = kind;
    return g;
  }
  /* ظل دائري ناعم تحت الأشياء */
  function blob(r = .5, o = .28) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ map: dotTex(), color: '#000000', transparent: true, opacity: o, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  /* ---------- زينة القالب ---------- */
  function tree(th, s = 1) {
    const g = new THREE.Group();
    const bark = mat('#8A5A30');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1 * s, .17 * s, 1 * s, 7), bark);
    trunk.position.y = .5 * s; g.add(trunk);
    for (const [x, y, rz] of [[-.18, .8, .7], [.2, .85, -.7]]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .06 * s, .45 * s, 5), bark); br.position.set(x * s, y * s, 0); br.rotation.z = rz; g.add(br); }
    const autumn = th.deco === 'autumn', night = th.deco === 'night';
    const crowns = autumn ? ['#E8761E', '#C2621B', '#D9A42B', '#F08A2E'] : night ? ['#1F5A5A', '#24346A', '#1F7A6B', '#2E4A8A'] : ['#5FA052', '#4C9A4A', '#7DBA62', '#6DAA5C'];
    [[0, 1.35, 0, .55], [-.34, 1.08, .12, .4], [.36, 1.12, -.06, .42], [.05, 1.0, .34, .36], [-.1, 1.62, -.1, .38], [.22, 1.5, .2, .3]].forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), mat(crowns[i % 4], { flatShading: true }));
      m.position.set(x * s, y * s, z * s); m.rotation.set(i, i * 2, 0); g.add(m);
    });
    /* ثمار أو أزهار صغيرة على الأوراق */
    const dot = autumn ? '#A8432A' : night ? '#F6E7A8' : th.deco === 'trees' ? '#E5559A' : '#F7C948';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, d = new THREE.Mesh(new THREE.SphereGeometry(.06 * s, 6, 4), night ? glow(dot) : mat(dot));
      d.position.set(Math.cos(a) * .5 * s, (1.2 + (i % 3) * .15) * s, Math.sin(a) * .5 * s); g.add(d);
    }
    /* عشب حول الجذع */
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.05 * s, .22 * s, 4), mat(crowns[2])); const a = i * 1.3; t.position.set(Math.cos(a) * .22 * s, .1 * s, Math.sin(a) * .22 * s); t.rotation.z = Math.cos(a) * .3; g.add(t); }
    return g;
  }
  function pine(th, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1 * s, .14 * s, .5 * s, 6), mat('#6B4A2E'));
    trunk.position.y = .25 * s; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const r = (.62 - i * .15) * s, h = (.75 - i * .1) * s, y = (.55 + i * .42) * s;
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat('#2F5D50', { flatShading: true }));
      c.position.y = y + h / 2; g.add(c);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * .55, h * .45, 8), mat('#FFFFFF'));
      cap.position.y = y + h * .78; g.add(cap);
    }
    return g;
  }
  function palm(th, s = 1) {
    const g = new THREE.Group();
    let x = 0, y = 0;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(.09 * s, .12 * s, .34 * s, 7), mat(i % 2 ? '#A0703A' : '#B98446'));
      x += .05 * s * i * .4; y += .3 * s;
      seg.position.set(x, y, 0); seg.rotation.z = -.08 * i; g.add(seg);
    }
    const top = new THREE.Vector3(x, y + .1 * s, 0);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.5 * s, 10, 6), mat(i % 2 ? '#2E8B57' : '#3FA36A', { flatShading: true }));
      leaf.scale.set(1.3, .1, .32);
      const a = i / 7 * Math.PI * 2;
      leaf.position.set(top.x + Math.cos(a) * .5 * s, top.y - .12 * s, Math.sin(a) * .5 * s);
      leaf.rotation.y = -a; leaf.rotation.z = -.35;
      g.add(leaf);
    }
    for (let i = 0; i < 3; i++) { const n = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 8, 6), mat('#8A5A30')); n.position.set(top.x + Math.cos(i * 2) * .1 * s, top.y - .12 * s, Math.sin(i * 2) * .1 * s); g.add(n); }
    return g;
  }
  function umbrella(s = 1) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03 * s, .03 * s, 1.5 * s, 6), mat('#6B4A2E'));
    pole.position.y = .75 * s; g.add(pole);
    const cols = ['#E8590C', '#FFFFFF', '#2BB3C0', '#FFFFFF'];
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(.8 * s, .35 * s, 8, 1, true, i * Math.PI / 4, Math.PI / 4), mat(cols[i % 4], { side: THREE.DoubleSide }));
      c.position.y = 1.5 * s; g.add(c);
    }
    g.rotation.z = .12;
    return g;
  }
  function dome(th, s = 1) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.7 * s, .7 * s, .8 * s, 16), mat('#F3E3C3'));
    base.position.y = .4 * s; g.add(base);
    const d = new THREE.Mesh(new THREE.SphereGeometry(.7 * s, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#E3B341'));
    d.position.y = .8 * s; g.add(d);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.06 * s, .3 * s, 6), mat('#AB3920')); tip.position.y = 1.62 * s; g.add(tip);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(.16 * s, .2 * s, 2.1 * s, 10), mat('#F3E3C3'));
    tower.position.set(1.05 * s, 1.05 * s, 0); g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.22 * s, .45 * s, 10), mat('#AB3920')); cap.position.set(1.05 * s, 2.32 * s, 0); g.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.7 * s, .05 * s, 6, 24), mat('#AB3920')); band.rotation.x = Math.PI / 2; band.position.y = .8 * s; g.add(band);
    return g;
  }
  function crystal(th, s = 1) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhongMaterial({ color: '#BFE3F3', emissive: col('#4A9CCB').multiplyScalar(.15), transparent: true, opacity: .85, shininess: 90, flatShading: true });
    [[0, 1.1, 0, .32], [.35, .7, .1, .2], [-.3, .6, -.1, .18]].forEach(([x, h, z, r]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s * 1.4, 6), m);
      c.position.set(x * s, h * s * .7, z * s); c.rotation.z = -x * .5; g.add(c);
    });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(.55 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FFFFFF'));
    mound.scale.y = .4; g.add(mound);
    return g;
  }
  function coral(th, s = 1) {
    const g = new THREE.Group();
    const cols = ['#F27A6B', '#F7A35C', '#E5559A'];
    const c = cols[Math.floor(Math.random() * 3)];
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08 * s, .12 * s, .8 * s, 6), mat(c));
    trunk.position.y = .4 * s; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.05 * s, .07 * s, .5 * s, 6), mat(c));
      const a = i * 1.6;
      b.position.set(Math.cos(a) * .18 * s, .7 * s + i * .08 * s, Math.sin(a) * .18 * s);
      b.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); g.add(b);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.07 * s, 8, 6), mat(c)); tip.position.set(Math.cos(a) * .32 * s, .92 * s + i * .08 * s, Math.sin(a) * .32 * s); g.add(tip);
    }
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(.08 * s, 1.3 * s, .04 * s), mat('#2E8C6A'));
      w.position.set(.4 * s + i * .12 * s, .65 * s, -.2 * s); w.rotation.z = (i - 1) * .2; w.userData.sway = i; g.add(w);
    }
    return g;
  }
  function planet(s = 1, c1 = '#E8761E', c2 = '#F6E7A8') {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1 * s, 24, 16), mat(c1, { emissive: col(c1).multiplyScalar(.3) })));
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.6 * s, .1 * s, 6, 40), mat(c2, { emissive: col(c2).multiplyScalar(.4) }));
    r.rotation.x = Math.PI / 2 - .5; g.add(r);
    return g;
  }
  function paperBox(s = 1) {
    const g = new THREE.Group();
    const geo = Math.random() < .5 ? new THREE.ConeGeometry(.5 * s, 1.1 * s, 4) : new THREE.BoxGeometry(.8 * s, .8 * s, .8 * s);
    const m = new THREE.Mesh(geo, mat('#FFFFFF'));
    m.position.y = (geo.type === 'ConeGeometry' ? .55 : .4) * s; m.rotation.y = Math.random() * 3;
    g.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#2B4C7E' }));
    e.position.copy(m.position); e.rotation.copy(m.rotation); g.add(e);
    return g;
  }
  function lantern(s = 1) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .05 * s, 1.4 * s, 6), mat('#2A3866'));
    post.position.y = .7 * s; g.add(post);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.16 * s, .2 * s, .34 * s, 6), glow('#F6E7A8'));
    l.position.y = 1.55 * s; g.add(l);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#F6E7A8', transparent: true, opacity: .6, depthWrite: false }));
    halo.scale.set(1.3 * s, 1.3 * s, 1); halo.position.y = 1.55 * s; g.add(halo);
    return g;
  }
  /* قطعة زينة واحدة حسب القالب */
  /* مجموعة صخور طبيعية بألوان القالب، وعليها طحلب أو ثلج */
  function rocks(th, s = 1) {
    const g = new THREE.Group();
    const base = { pines: '#9FB3D1', crystals: '#B9D6E8', space: '#4A3A8A', night: '#3A4A80', palms: '#C9A96A', coral: '#B98A5A', autumn: '#8A6A4A', paper: '#FFFFFF' }[th.deco] || '#9C8F80';
    const top = { pines: '#FFFFFF', crystals: '#FFFFFF', trees: '#6DAA5C', autumn: '#C98A3E', night: '#2E4A8A', domes: '#C9A96A' }[th.deco];
    for (let i = 0; i < 4; i++) {
      const r = rnd(.25, .55) * s * (i ? .75 : 1);
      const geo = new THREE.DodecahedronGeometry(r, 0), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * rnd(.85, 1.15), p.getY(k) * rnd(.6, .9), p.getZ(k) * rnd(.85, 1.15));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat(col(base).offsetHSL(0, 0, rnd(-.08, .06)), { flatShading: true }));
      m.position.set(i ? rnd(-.6, .6) * s : 0, r * .5, i ? rnd(-.6, .6) * s : 0); m.rotation.y = rnd(0, 6);
      g.add(m);
      if (th.sketch) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#2B4C7E' })); e.position.copy(m.position); e.rotation.copy(m.rotation); g.add(e); }
      if (top && !th.sketch) { const cap = new THREE.Mesh(new THREE.SphereGeometry(r * .7, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(top, { flatShading: true })); cap.position.set(m.position.x, m.position.y + r * .35, m.position.z); cap.scale.y = .5; g.add(cap); }
    }
    return g;
  }
  /* شجيرة من كرات خضراء بدرجات، وفيها أزهار أو ثمار صغيرة */
  function bush(th, s = 1) {
    const g = new THREE.Group();
    const cols = { autumn: ['#C2621B', '#E8761E', '#A8432A'], pines: ['#2F5D50', '#3F6E60', '#FFFFFF'], crystals: ['#9CD5F2', '#BFE3F3', '#FFFFFF'], night: ['#1F5A5A', '#24346A', '#1F7A6B'], space: ['#6E52C8', '#8E6CF0', '#B48CFF'], coral: ['#2E8C6A', '#3FA37A', '#1F7A6B'], paper: ['#FFFFFF', '#EEF3FA', '#FFFFFF'], domes: ['#8FA05A', '#A8B86A', '#7A8A4A'] }[th.deco] || ['#4C9A4A', '#5FA052', '#6DBA5F'];
    for (let i = 0; i < 6; i++) {
      const r = rnd(.28, .45) * s;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(cols[i % 3], { flatShading: true }));
      m.position.set(rnd(-.45, .45) * s, r * .8 + (i > 3 ? .2 * s : 0), rnd(-.35, .35) * s); g.add(m);
    }
    const dot = { trees: '#E5559A', palms: '#F7C948', autumn: '#A8432A', pines: '#C0392B', night: '#F6E7A8', domes: '#AB3920' }[th.deco];
    if (dot) for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.05 * s, 6, 4), th.deco === 'night' ? glow(dot) : mat(dot)); const a = i * .9; d.position.set(Math.cos(a) * .45 * s, (.4 + (i % 3) * .12) * s, Math.sin(a) * .35 * s); g.add(d); }
    return g;
  }
  function prop(th, s = 1) {
    const roll = Math.random();
    if (roll < .14) return rocks(th, s);
    if (roll < .26) return bush(th, s);
    switch (th.deco) {
      case 'trees': case 'autumn': return Math.random() < .8 ? tree(th, s) : flowers(th, s);
      case 'pines': return pine(th, s);
      case 'palms': return Math.random() < .7 ? palm(th, s) : umbrella(s);
      case 'crystals': return crystal(th, s);
      case 'coral': return coral(th, s);
      case 'paper': return paperBox(s);
      case 'night': return Math.random() < .5 ? lantern(s) : tree({ deco: 'night' }, s);
      case 'space': return crystal(th, s * .8);
      default: return dome(th, s * .7);
    }
  }
  function flowers(th, s = 1) {
    const g = new THREE.Group();
    const cols = th.deco === 'autumn' ? ['#C2621B', '#D9A42B', '#A8432A'] : ['#E5559A', '#F7C948', '#FFFFFF', '#F4A6C1'];
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.02 * s, .02 * s, .35 * s, 4), mat('#3F7D3A'));
      const x = rnd(-.4, .4) * s, z = rnd(-.4, .4) * s;
      st.position.set(x, .17 * s, z); g.add(st);
      const f = new THREE.Mesh(new THREE.SphereGeometry(.1 * s, 8, 6), mat(cols[i % cols.length]));
      f.position.set(x, .38 * s, z); g.add(f);
    }
    return g;
  }
  const SCATTER = {
    trees:    { tuft: ['#4C9A4A', '#6DBA5F'], dot: ['#E5559A', '#F7C948', '#FFFFFF', '#F4A6C1'], pebble: '#B9A88A' },
    autumn:   { tuft: ['#A86A2E', '#C98A3E'], dot: ['#E8761E', '#D9A42B', '#A8432A'], pebble: '#9C7A55' },
    domes:    { tuft: ['#B8A060', '#A08A50'], dot: ['#E3B341', '#AB3920'], pebble: '#C9A96A' },
    night:    { tuft: ['#24346A', '#2E4A8A'], dot: ['#F6E7A8', '#59C3F0'], pebble: '#3A4A80', glow: true },
    crystals: { tuft: ['#DCEFFA', '#BFE3F3'], dot: ['#9CD5F2', '#FFFFFF'], pebble: '#CFE8F6', glow: true },
    pines:    { tuft: ['#FFFFFF', '#E3EAF3'], dot: ['#C0392B', '#FFFFFF'], pebble: '#DCE5F0' },
    palms:    { tuft: ['#7FB069', '#5FA052'], dot: ['#F4A6C1', '#FFF3DC', '#F7C948'], pebble: '#E3C88F' },
    coral:    { tuft: ['#2E8C6A', '#3FA37A'], dot: ['#F27A6B', '#F7A35C', '#FFF3DC'], pebble: '#CDB27A' },
    space:    { tuft: ['#6E52C8', '#8E6CF0'], dot: ['#F6E7A8', '#B48CFF'], pebble: '#4A3A8A', glow: true },
    paper:    { tuft: ['#2B4C7E', '#5A6B88'], dot: ['#E8A3A3', '#F7C948'], pebble: '#FFFFFF' },
  };
  /* ينثر تفاصيل صغيرة على الأرض داخل مستطيل، مع تجنّب أماكن (avoid يعيد true للمكان الممنوع) */
  function scatter(parent, th, { x0 = -20, x1 = 20, z0 = -20, z1 = 20, y = 0, count = 260, avoid = null, at = null } = {}) {
    const P = SCATTER[th.deco] || SCATTER.trees, dummy = new THREE.Object3D(), c = new THREE.Color();
    const make = (geo, material, n) => { const m = new THREE.InstancedMesh(geo, material, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.count = 0; parent.add(m); return m; };
    const tuftGeo = new THREE.ConeGeometry(.07, .38, 4); tuftGeo.translate(0, .19, 0);
    const tufts = make(tuftGeo, mat('#FFFFFF', { flatShading: true }), count * 3);
    const pebbles = make(new THREE.DodecahedronGeometry(.13, 0), mat(P.pebble, { flatShading: true }), count);
    const dots = make(new THREE.SphereGeometry(.075, 6, 4), P.glow ? new THREE.MeshBasicMaterial({ color: '#FFFFFF' }) : mat('#FFFFFF'), count);
    let tries = 0;
    for (let i = 0; i < count && tries < count * 6; tries++) {
      let x, z, yy = y;
      if (at) { const p = at(); if (!p) continue; ({ x, z } = p); yy = p.y ?? y; } else { x = rnd(x0, x1); z = rnd(z0, z1); }
      if (avoid && avoid(x, z)) continue;
      i++;
      const kind = Math.random();
      if (kind < .55) {
        /* خصلة من ثلاث شفرات */
        for (let k = 0; k < 3; k++) {
          dummy.position.set(x + rnd(-.08, .08), yy, z + rnd(-.08, .08));
          dummy.rotation.set(rnd(-.35, .35), rnd(0, 6), rnd(-.35, .35));
          dummy.scale.setScalar(rnd(.6, 1.2)); dummy.updateMatrix();
          tufts.setMatrixAt(tufts.count, dummy.matrix); tufts.setColorAt(tufts.count, c.set(P.tuft[k % 2])); tufts.count++;
        }
      } else if (kind < .8) {
        dummy.position.set(x, yy + .04, z); dummy.rotation.set(rnd(0, 3), rnd(0, 3), 0);
        dummy.scale.set(rnd(.6, 1.6), rnd(.4, .8), rnd(.6, 1.4)); dummy.updateMatrix();
        pebbles.setMatrixAt(pebbles.count++, dummy.matrix);
      } else {
        dummy.position.set(x, yy + .2, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(rnd(.8, 1.3)); dummy.updateMatrix();
        dots.setMatrixAt(dots.count, dummy.matrix); dots.setColorAt(dots.count, c.set(P.dot[dots.count % P.dot.length])); dots.count++;
        /* ساق صغيرة تحت الزهرة */
        if (!P.glow) { dummy.position.set(x, yy, z); dummy.scale.set(.5, .55, .5); dummy.updateMatrix(); tufts.setMatrixAt(tufts.count, dummy.matrix); tufts.setColorAt(tufts.count, c.set(P.tuft[0])); tufts.count++; }
      }
    }
    [tufts, pebbles, dots].forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    return { tufts, pebbles, dots };
  }
  /* مجموعة صغيرة متحركة من العشب والحصى (للمشاهد التي تتحرك فيها الأرض) */
  function tuftPatch(th, n = 6) {
    const g = new THREE.Group(), P = SCATTER[th.deco] || SCATTER.trees;
    for (let i = 0; i < n; i++) {
      const x = rnd(-.8, .8), z = rnd(-.8, .8);
      if (Math.random() < .7) { const t = new THREE.Mesh(new THREE.ConeGeometry(.07, .4, 4), mat(P.tuft[i % 2], { flatShading: true })); t.position.set(x, .2, z); t.rotation.z = rnd(-.3, .3); g.add(t); }
      else { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.14, 0), mat(P.pebble, { flatShading: true })); p.position.set(x, .06, z); p.scale.y = .6; g.add(p); }
    }
    return g;
  }
  /* مشهد بعيد: جبال/تلال/كواكب في الأفق */
  function horizon(S, th, { radius = 60, y = 0, hills = true } = {}) {
    const g = new THREE.Group();
    if (th.deco === 'space' || th.deco === 'night') {
      if (th.deco === 'space') {
        const p1 = planet(3.5, '#8E6CF0', '#F6E7A8'); p1.position.set(-28, 16, -60); g.add(p1);
        const p2 = planet(1.8, '#E8761E', '#FFE6C4'); p2.position.set(30, 22, -55); g.add(p2);
      } else {
        const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 16), glow('#F6E7A8'));
        moon.position.set(-26, 22, -70); g.add(moon);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#F6E7A8', transparent: true, opacity: .45, depthWrite: false, fog: false }));
        halo.scale.set(16, 16, 1); halo.position.copy(moon.position); g.add(halo);
        if (hills) mountainRanges(g, th, radius, y);
      }
    } else if (th.deco !== 'paper') {
      /* الجبال: ثلاث سلاسل تحيط بالخريطة كلها — بعيدة باهتة بلون السماء، ووسطى بتفاصيلها، وتلال قريبة بأشجار صغيرة */
      if (hills) mountainRanges(g, th, radius, y);
      if (th.deco === 'palms' || th.deco === 'trees' || th.deco === 'domes' || th.deco === 'autumn') {
        const sunM = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), glow(th.deco === 'autumn' ? '#FFC45C' : '#FFE07A', { fog: false }));
        sunM.position.set(24, 26, -80); g.add(sunM);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#FFE07A', transparent: true, opacity: .55, depthWrite: false, fog: false }));
        halo.scale.set(22, 22, 1); halo.position.copy(sunM.position); g.add(halo);
      }
      /* غيوم بعيدة */
      for (let i = 0; i < 6; i++) {
        const c = cloud(rnd(1.2, 2.2), th.deco === 'pines' ? '#E3EAF3' : '#FFFFFF');
        c.position.set(rnd(-50, 50), rnd(14, 26), rnd(-75, -45));
        c.userData.drift = rnd(.3, .8);
        g.add(c);
      }
      S.fx.push(dt => g.children.forEach(c => { if (c.userData.drift) { c.position.x += c.userData.drift * dt; if (c.position.x > 60) c.position.x = -60; } }));
    }
    S.env.add(g);
    return g;
  }

  /* ---------- جبل واحد: صخر بحواف متعرّجة، وألوان حسب الارتفاع والميل (عشب، صخر، ثلج) ---------- */
  function mountainGeo(r, h, pal, o = {}) {
    let geo = new THREE.ConeGeometry(r, h, 18, 12, true);
    const p = geo.attributes.position, ph = [rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6)];
    const peakX = rnd(-.12, .12) * r, peakZ = rnd(-.12, .12) * r;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yv = p.getY(i), z = p.getZ(i), t = (yv + h / 2) / h, d = Math.hypot(x, z);
      if (d < 1e-4) { p.setXYZ(i, peakX, yv, peakZ); continue; }
      const a = Math.atan2(z, x);
      /* تعرّجات: نتوءات كبيرة وحواف صغيرة، أقوى في الوسط، والقمة مائلة قليلًا */
      const n = Math.sin(a * 3 + ph[0]) * .5 + Math.sin(a * 7 + ph[1]) * .28 + Math.sin(a * 13 + t * 6 + ph[2]) * .14 + Math.sin(t * 11 + a * 2 + ph[3]) * .1;
      const k = 1 + n * .2 * (1 - t * .3);
      p.setXYZ(i, x * k + peakX * t, yv + (t > .02 && t < .97 ? Math.sin(a * 5 + ph[2]) * h * .035 : 0), z * k + peakZ * t);
    }
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    const pos = geo.attributes.position, nor = geo.attributes.normal, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const snowLine = o.snow == null ? .7 : o.snow;
    for (let f = 0; f < pos.count; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3, t = (cy + h / 2) / h;
      const ny = (nor.getY(f) + nor.getY(f + 1) + nor.getY(f + 2)) / 3, ca = Math.atan2(pos.getZ(f), pos.getX(f));
      const jag = Math.sin(ca * 9 + h) * .06 + rnd(-.03, .03);
      if (snowLine < 1 && t > snowLine + jag) c.copy(pal.snow).lerp(pal.rock, ny < .45 ? .35 : 0);
      else if (t > .28 + jag) c.copy(pal.rock).lerp(pal.rock2, Math.max(0, .6 - ny));
      else c.copy(pal.base).lerp(pal.rock, Math.max(0, t / .28 - .5));
      c.offsetHSL(0, 0, rnd(-.035, .035));
      if (pal.haze) c.lerp(pal.haze, pal.hazeK);
      for (let v = 0; v < 3; v++) cols.set([c.r, c.g, c.b], (f + v) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }
  /* ألوان الجبال حسب القالب */
  function mountainPalette(th) {
    const id = th.deco;
    const base = { palms: '#C9A96A', coral: '#3FA37A', pines: '#E9EEF5', crystals: '#DCEBF5', autumn: '#B5793E', trees: '#6DAA5C', domes: '#C9A56E', night: '#1E2B5A' }[id] || th.ground2;
    const rock = { palms: '#B08A5A', coral: '#7C8F86', pines: '#7D8DA8', crystals: '#8FB4CF', autumn: '#8A6A4A', trees: '#8C8C8A', domes: '#A88A62', night: '#2C3A6E' }[id] || '#8C8C8A';
    const rock2 = col(rock).multiplyScalar(.72);
    const snow = { palms: '#F3E3C0', coral: '#E8F4F2', autumn: '#F7EBD6', night: '#9FB3D9', domes: '#F7EBD6' }[id] || '#FFFFFF';
    const line = { palms: 1, coral: .85, pines: .42, crystals: .45, autumn: .78, trees: .7, domes: .82, night: .66 }[id];
    return { base: col(base), rock: col(rock), rock2, snow: col(snow), line: line == null ? .7 : line };
  }
  function mountainRanges(g, th, radius, y) {
    const pal = mountainPalette(th), sky = col(th.sky[1]);
    const far = { ...pal, haze: sky, hazeK: th.dark ? .35 : .5 };
    const mid = { ...pal, haze: sky, hazeK: th.dark ? .12 : .18 };
    const matV = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false, side: THREE.DoubleSide });
    const matM = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    /* السلسلة البعيدة: قمم عالية متلاصقة حول الأفق كله */
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2 + rnd(-.06, .06), h = rnd(18, 34), r = rnd(13, 20);
      const m = new THREE.Mesh(mountainGeo(r, h, far, { snow: pal.line - .05 }), matV);
      m.position.set(Math.cos(a) * radius * 1.5, y + h / 2 - 2, Math.sin(a) * radius * 1.5); m.rotation.y = rnd(0, 6);
      g.add(m);
    }
    /* السلسلة الوسطى: جبال بقمم مزدوجة أحيانًا */
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2 + rnd(-.08, .08), h = rnd(11, 22), r = rnd(9, 14);
      const cx = Math.cos(a) * radius * 1.15, cz = Math.sin(a) * radius * 1.15;
      const m = new THREE.Mesh(mountainGeo(r, h, mid, { snow: pal.line }), matM);
      m.position.set(cx, y + h / 2 - 1.5, cz); m.rotation.y = rnd(0, 6); g.add(m);
      if (i % 3 === 0) { const h2 = h * rnd(.55, .75), m2 = new THREE.Mesh(mountainGeo(r * .7, h2, mid, { snow: pal.line + .05 }), matM); m2.position.set(cx + Math.cos(a + 1.57) * r * .8, y + h2 / 2 - 1.5, cz + Math.sin(a + 1.57) * r * .8); g.add(m2); }
    }
    /* تلال قريبة مستديرة بأشجار صغيرة على سفوحها */
    const treeGeo = new THREE.ConeGeometry(.9, 2.6, 6), trunkCol = col(th.dark ? '#16324A' : th.deco === 'autumn' ? '#C2621B' : th.deco === 'pines' ? '#2F5D50' : '#3F7D3A');
    const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({ color: trunkCol, flatShading: true }), 160);
    let tn = 0;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + rnd(-.05, .05), h = rnd(4, 8), r = rnd(8, 12);
      const cx = Math.cos(a) * radius * .98, cz = Math.sin(a) * radius * .98;
      const hg = new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hp = hg.attributes.position;
      for (let k = 0; k < hp.count; k++) hp.setY(k, hp.getY(k) / r * h * (1 + Math.sin(hp.getX(k) * .7 + i) * .12));
      hg.computeVertexNormals();
      const hill = new THREE.Mesh(hg, mat(col(pal.base).lerp(sky, .08).getStyle(), { flatShading: true }));
      hill.position.set(cx, y - .4, cz); g.add(hill);
      if (th.deco !== 'palms' && th.deco !== 'coral') for (let k = 0; k < 6 && tn < 160; k++) {
        const ta = rnd(0, 6.28), tr = rnd(.25, .8) * r, th2 = h * Math.sqrt(Math.max(0, 1 - (tr / r) ** 2));
        dummy.position.set(cx + Math.cos(ta) * tr, y - .4 + th2 + 1.1, cz + Math.sin(ta) * tr);
        dummy.scale.setScalar(rnd(.7, 1.3)); dummy.updateMatrix(); trees.setMatrixAt(tn++, dummy.matrix);
      }
    }
    trees.count = tn; g.add(trees);
  }
  function aimColor(th = theme()) {
    const lum = h => { const c = col(h); return .2126 * c.r + .7152 * c.g + .0722 * c.b; };
    const bright = th.sketch || lum(th.ground) > .75;
    return bright ? (th.sketch ? '#2B4C7E' : th.wall2 || th.accent) : '#FFFFFF';
  }
  function cloud(s = 1, c = '#FFFFFF', opacity = 1) {
    const g = new THREE.Group();
    const m = mat(c, { transparent: opacity < 1, opacity, emissive: col(c).multiplyScalar(.25) });
    [[0, 0, 0, 1], [1, -.15, 0, .75], [-1, -.2, 0, .7], [.45, .45, 0, .7], [-.5, .35, .1, .6]].forEach(([x, y, z, r]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r * s, 14, 10), m); p.position.set(x * s, y * s, z * s); g.add(p);
    });
    g.scale.y = .7;
    return g;
  }

  /* ---------- جزيئات الجو: ثلج، أوراق، بتلات، فقاعات، نجوم ---------- */
  function weather(S, th, { w = 30, h = 14, d = 40, cz = -10, cy = 0, count } = {}) {
    if (th.fx === 'none' || th.fx === 'sparks') {
      if (th.fx === 'sparks') count = count || 40; else return;
    }
    const n = count || ({ stars: 260, snow: 260, flakes: 200, leaves: 70, petals: 80, bubbles: 90, glints: 60 })[th.fx] || 60;
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), sp = [];
    const stars = th.fx === 'stars';
    for (let i = 0; i < n; i++) {
      if (stars) {
        const a = Math.random() * Math.PI * 2, e = rnd(.05, 1.2), r = 90;
        pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * .8 + 5, Math.sin(a) * Math.cos(e) * r], i * 3);
      } else pos.set([rnd(-w, w), cy + rnd(0, h), cz + rnd(-d / 2, d / 2)], i * 3);
      sp.push(rnd(.6, 1.4));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = { stars: '#FFFFFF', snow: '#FFFFFF', flakes: '#FFFFFF', leaves: '#E8761E', petals: '#F4A6C1', bubbles: '#E6FBFF', glints: '#FFFFFF', sparks: '#E3B341' }[th.fx];
    const size = { stars: .7, snow: .22, flakes: .3, leaves: .38, petals: .3, bubbles: .3, glints: .25, sparks: .22 }[th.fx];
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTex(), transparent: true, depthWrite: false, fog: !stars, sizeAttenuation: true }));
    S.env.add(pts);
    if (stars) { S.fx.push((dt, t) => { pts.material.opacity = .8 + Math.sin(t * 2) * .2; pts.rotation.y += dt * .004; }); return pts; }
    const up = th.fx === 'bubbles' || th.fx === 'sparks';
    S.fx.push((dt, t) => {
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        pos[k + 1] += (up ? 1 : -1) * dt * sp[i] * (th.fx === 'glints' ? 0 : 1.1);
        pos[k] += Math.sin(t * .8 + i) * dt * .35;
        if (pos[k + 1] < cy - 1) pos[k + 1] = cy + h;
        if (pos[k + 1] > cy + h) pos[k + 1] = cy - 1;
      }
      if (th.fx === 'glints') pts.material.opacity = .4 + Math.abs(Math.sin(t * 3)) * .6;
      geo.attributes.position.needsUpdate = true;
    });
    return pts;
  }
  /* أرضية بنقش القالب (خطوط الدفتر، رمل، عشب…) */
  function groundTexture(th, rep = 8) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d'), N = 512, deco = th.deco;
    g.fillStyle = th.ground; g.fillRect(0, 0, N, N);
    if (th.sketch) {
      g.strokeStyle = '#BFD3EA'; g.lineWidth = 4;
      for (let y = 0; y < N; y += 64) { g.beginPath(); g.moveTo(0, y + 32); g.lineTo(N, y + 32); g.stroke(); }
      g.strokeStyle = 'rgba(43,76,126,.18)'; g.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const x = rnd(0, N), y = rnd(0, N); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y - 10); g.stroke(); }
    } else {
      /* بقع ناعمة بلونين حتى لا تبدو الأرض مسطّحة */
      for (let i = 0; i < 60; i++) {
        const x = rnd(0, N), y = rnd(0, N), r = rnd(20, 70), gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, Math.random() < .5 ? th.ground2 : 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = rnd(.12, .3); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      if (deco === 'trees' || deco === 'autumn' || deco === 'night') {
        /* شفرات عشب صغيرة */
        const cols = deco === 'autumn' ? ['#A86A2E', '#C98A3E', '#8A5226'] : deco === 'night' ? ['#24346A', '#2E4A8A', '#1B2752'] : ['#4C9A4A', '#6DBA5F', '#3F7D3A'];
        g.lineWidth = 2; g.lineCap = 'round';
        for (let i = 0; i < 1400; i++) { const x = rnd(0, N), y = rnd(0, N), h = rnd(5, 11); g.strokeStyle = cols[i % 3]; g.globalAlpha = rnd(.35, .8); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + rnd(-3, 3), y - h / 2, x + rnd(-4, 4), y - h); g.stroke(); }
        if (deco === 'trees') for (let i = 0; i < 70; i++) { g.globalAlpha = .9; g.fillStyle = ['#F4A6C1', '#F7C948', '#FFFFFF', '#E5559A'][i % 4]; g.beginPath(); g.arc(rnd(0, N), rnd(0, N), rnd(2, 3.5), 0, 7); g.fill(); }
        if (deco === 'autumn') for (let i = 0; i < 90; i++) { g.globalAlpha = .85; g.fillStyle = ['#E8761E', '#D9A42B', '#A8432A'][i % 3]; g.save(); g.translate(rnd(0, N), rnd(0, N)); g.rotate(rnd(0, 6)); g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, 7); g.fill(); g.restore(); }
      } else if (deco === 'palms' || deco === 'domes' || deco === 'coral') {
        /* رمل بتموّجات الريح وحصى وأصداف */
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2.5;
        for (let y = 0; y < N; y += 18) { g.beginPath(); for (let x = 0; x <= N; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 5); g.stroke(); }
        g.strokeStyle = 'rgba(0,0,0,.07)';
        for (let y = 9; y < N; y += 18) { g.beginPath(); for (let x = 0; x <= N; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 5); g.stroke(); }
        for (let i = 0; i < 160; i++) { g.globalAlpha = rnd(.3, .7); g.fillStyle = Math.random() < .5 ? th.ground2 : '#FFFFFF'; g.beginPath(); g.ellipse(rnd(0, N), rnd(0, N), rnd(1.5, 4), rnd(1, 3), rnd(0, 3), 0, 7); g.fill(); }
        if (deco !== 'domes') for (let i = 0; i < 26; i++) { g.globalAlpha = .9; g.fillStyle = ['#F4A6C1', '#FFF3DC', '#F7C948'][i % 3]; const x = rnd(0, N), y = rnd(0, N); g.beginPath(); g.moveTo(x, y); g.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9); g.fill(); }
      } else if (deco === 'pines' || deco === 'crystals') {
        /* ثلج: آثار ناعمة ولمعات */
        g.strokeStyle = 'rgba(159,179,209,.35)'; g.lineWidth = 3;
        for (let i = 0; i < 40; i++) { const x = rnd(0, N), y = rnd(0, N); g.beginPath(); g.arc(x, y, rnd(10, 30), rnd(0, 3), rnd(3, 6)); g.stroke(); }
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < 260; i++) { g.globalAlpha = rnd(.4, 1); const x = rnd(0, N), y = rnd(0, N), r = rnd(.8, 2.2); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(120,170,220,.5)';
        for (let i = 0; i < 60; i++) { g.globalAlpha = .6; g.beginPath(); g.arc(rnd(0, N), rnd(0, N), 1.2, 0, 7); g.fill(); }
      } else if (deco === 'space') {
        /* أرض كوكب: فوهات وغبار لامع */
        for (let i = 0; i < 26; i++) { const x = rnd(0, N), y = rnd(0, N), r = rnd(8, 28); g.globalAlpha = .45; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(201,180,255,.45)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x - 1, y - 1, r, Math.PI * .9, Math.PI * 1.9); g.stroke(); }
        g.fillStyle = '#F6E7A8';
        for (let i = 0; i < 150; i++) { g.globalAlpha = rnd(.3, .9); g.fillRect(rnd(0, N), rnd(0, N), 1.6, 1.6); }
      }
      g.globalAlpha = 1;
    }
    const t = texture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep / 2, rep / 2);
    return t;
  }


  /* ---------- مؤثرات عند الإجابة ---------- */
  function burstAt(S, v, ok, txt) {
    const p = S.screen(v);
    if (ok) { FX.burst(p, { count: 24 }); FX.floatText(p, txt || '+١'); }
    else FX.floatText(p, '✗', '#C0392B');
  }
  /* تغيير لون كل المواد في كائن (أخضر للصحيح، أحمر للخطأ) */
  function tint(obj, c, k = .45) {
    obj.traverse(m => {
      if (!m.material || m.isSprite) return;
      [].concat(m.material).forEach(x => {
        if (x.map && !x.color) return;
        if (!x.userData.orig && x.color) x.userData.orig = x.color.clone();
        if (x.color && !x.map) x.color.lerp(col(c), k);
        if (x.emissive) x.emissive = col(c).multiplyScalar(.25);
      });
    });
  }
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  return {
    THEMES, theme, aimColor, mat, glow, col, rnd, ease, fonts, sign, plate, recolorSign, textCanvas, texture, create, clear, controls, joystick, pick, groundPoint,
    player, blob, starMesh, scatter, tuftPatch, rocks, bush, tree, pine, palm, prop, cloud, planet, horizon, weather, groundTexture, burstAt, tint, dotTex,
  };
})();
