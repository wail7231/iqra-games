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
    c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
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

  function create({ fov = 50, maxH = 480, ratio = .6, fogNear = 30, fogFar = 90 } = {}) {
    const wrap = el('div', 'k3-wrap run-wrap keep');
    const cv = el('canvas', 'k3-canvas run-canvas');
    const start = el('div', 'run-start', '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');
    wrap.append(cv, start);
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1.6, .1, 300);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a8a, .62);
    const sun = new THREE.DirectionalLight(0xffffff, .58);
    sun.position.set(-8, 14, 10);
    scene.add(hemi, sun);
    const S = {
      wrap, cv, start, renderer, scene, camera, hemi, sun, W: 0, H: 0, t: 0, started: false,
      env: new THREE.Group(), fx: [], themeId: null, keys: {}, onFrame: null, onTheme: null,
    };
    scene.add(S.env);
    S.size = () => {
      S.W = wrap.clientWidth || 600;
      const fs = document.body.classList.contains('is-fs');
      S.H = Math.round(fs ? window.innerHeight - 130 : Math.min(maxH, Math.max(320, S.W * ratio)));
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
      if (scene.background) scene.background.dispose();
      scene.background = skyTexture(th);
      scene.fog = new THREE.Fog(th.sky[1], fogNear, fogFar);
      hemi.intensity = th.dark ? .5 : .62;
      sun.intensity = th.dark ? .45 : .58;
      hemi.groundColor = col(th.dark ? '#24204a' : '#9a8f80');
      clear(S.env);
      S.fx.length = 0;
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
    let last = performance.now();
    function frame(now) {
      if (!wrap.isConnected) { renderer.dispose(); return; }
      const dt = Math.min(.04, (now - last) / 1000);
      last = now;
      S.t += dt;
      if (S.themeId !== Play.cfg.theme) S.applyTheme();
      if (S.onFrame) S.onFrame(dt);
      S.fx.forEach(f => f(dt, S.t));
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return S;
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

  /* ---------- شكل اللاعب حسب القالب (أشكال بلا أرواح) ---------- */
  function starShape(r1, r2, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i <= n * 2; i++) {
      const a = Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  }
  function starMesh(r, color, depth = .22) {
    const g = new THREE.ExtrudeGeometry(starShape(r, r * .45), { depth, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 2 });
    g.center();
    return new THREE.Mesh(g, mat(color, { emissive: col(color).multiplyScalar(.25) }));
  }
  function player(kind = THEME_EMBLEM[Play.cfg.theme] || 'star') {
    const g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    g.userData.body = body;
    const sph = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat(c, o));
    switch (kind) {
      case 'moon': {
        body.add(sph(.5, '#FFF3C4', { emissive: col('#F2D27A').multiplyScalar(.55) }));
        [[.25, .18, .4, .1], [-.2, -.1, .44, .08], [.05, -.3, .38, .07]].forEach(([x, y, z, r]) => { const m = sph(r, '#E2C47A'); m.position.set(x, y, z); m.scale.z = .4; body.add(m); });
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#F6E7A8', transparent: true, opacity: .55, depthWrite: false }));
        halo.scale.set(2, 2, 1); g.add(halo);
        break;
      }
      case 'flower': {
        body.add(sph(.26, '#F7C948'));
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, p = sph(.2, '#E5559A'); p.scale.set(1.5, .55, .9); p.position.set(Math.cos(a) * .36, 0, Math.sin(a) * .36); p.rotation.y = -a; body.add(p); }
        const c = sph(.12, '#FFFFFF'); c.position.y = .2; body.add(c);
        body.rotation.x = .5;
        break;
      }
      case 'snow': {
        const ice = new THREE.Mesh(new THREE.OctahedronGeometry(.32, 0), mat('#D6EEFA', { emissive: col('#4A9CCB').multiplyScalar(.2) }));
        body.add(ice);
        const arm = new THREE.BoxGeometry(1.05, .09, .09), twig = new THREE.BoxGeometry(.26, .06, .06), m = mat('#FFFFFF', { emissive: col('#9CD5F2').multiplyScalar(.3) });
        for (let i = 0; i < 3; i++) {
          const a = new THREE.Mesh(arm, m); a.rotation.z = i * Math.PI / 3; body.add(a);
          for (const s of [-1, 1]) for (const d of [-1, 1]) { const t = new THREE.Mesh(twig, m); t.position.set(Math.cos(i * Math.PI / 3) * .34 * s, Math.sin(i * Math.PI / 3) * .34 * s, 0); t.rotation.z = i * Math.PI / 3 + d * .8; body.add(t); }
        }
        break;
      }
      case 'sketch': {
        const geo = new THREE.IcosahedronGeometry(.48, 1);
        body.add(new THREE.Mesh(geo, mat('#FFFFFF')));
        body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#2B4C7E' })));
        break;
      }
      case 'bubble': {
        body.add(new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 24), new THREE.MeshPhongMaterial({ color: '#9ED8DE', transparent: true, opacity: .5, shininess: 120, specular: col('#FFFFFF') })));
        const hl = sph(.1, '#FFFFFF', { emissive: col('#FFFFFF') }); hl.position.set(-.2, .22, .38); body.add(hl);
        const hl2 = sph(.05, '#FFFFFF', { emissive: col('#FFFFFF') }); hl2.position.set(.22, -.2, .42); body.add(hl2);
        break;
      }
      case 'planet': {
        body.add(sph(.4, '#8E6CF0', { emissive: col('#3A2380').multiplyScalar(.4) }));
        const band = new THREE.Mesh(new THREE.TorusGeometry(.4, .045, 8, 40), mat('#C9B4FF')); band.rotation.x = Math.PI / 2; band.position.y = .1; body.add(band);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.66, .05, 8, 48), mat('#F6E7A8', { emissive: col('#F6E7A8').multiplyScalar(.4) }));
        ring.rotation.x = Math.PI / 2 - .4; g.add(ring);
        break;
      }
      case 'pumpkin': {
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, s = sph(.28, i % 2 ? '#E8761E' : '#F08A2E'); s.scale.set(.75, 1, 1.2); s.position.set(Math.cos(a) * .2, 0, Math.sin(a) * .2); s.rotation.y = -a; body.add(s); }
        const st = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .22, 8), mat('#5C7F2A')); st.position.y = .36; body.add(st);
        break;
      }
      case 'sun': {
        body.add(sph(.36, '#FFD24A', { emissive: col('#F7A21B').multiplyScalar(.6) }));
        const cone = new THREE.ConeGeometry(.08, .24, 8), m = mat('#F7A21B', { emissive: col('#E8590C').multiplyScalar(.4) });
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = new THREE.Mesh(cone, m); c.position.set(Math.cos(a) * .48, Math.sin(a) * .48, 0); c.rotation.z = a - Math.PI / 2; body.add(c); }
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = new THREE.Mesh(cone, m); c.position.set(Math.cos(a) * .42, 0, Math.sin(a) * .42); c.rotation.set(Math.PI / 2, 0, a - Math.PI / 2); c.lookAt(Math.cos(a) * 2, 0, Math.sin(a) * 2); c.rotateX(Math.PI / 2); body.add(c); }
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#FFD24A', transparent: true, opacity: .5, depthWrite: false }));
        halo.scale.set(1.9, 1.9, 1); g.add(halo);
        break;
      }
      case 'snowball': {
        const geo = new THREE.IcosahedronGeometry(.48, 2), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + (Math.sin(v.x * 23) * Math.cos(v.y * 19) * Math.sin(v.z * 17)) * .05; p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
        geo.computeVertexNormals();
        body.add(new THREE.Mesh(geo, mat('#FFFFFF', { emissive: col('#DCE5F0').multiplyScalar(.25) })));
        break;
      }
      default: { // star — نجمة ذهبية
        const s = starMesh(.52, '#E3B341');
        body.add(s);
        const c = sph(.13, '#AB3920'); c.position.z = .17; c.scale.z = .5; body.add(c);
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
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12 * s, .16 * s, .9 * s, 7), mat('#8A5A30'));
    trunk.position.y = .45 * s; g.add(trunk);
    const crowns = th.deco === 'autumn' ? ['#E8761E', '#C2621B', '#D9A42B'] : ['#5FA052', '#4C9A4A', '#7DBA62'];
    [[0, 1.25, 0, .55], [-.28, 1.0, .1, .38], [.3, 1.05, -.05, .4]].forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), mat(crowns[i % 3], { flatShading: true }));
      m.position.set(x * s, y * s, z * s); g.add(m);
    });
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
  function prop(th, s = 1) {
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
  /* مشهد بعيد: جبال/تلال/كواكب في الأفق */
  function horizon(S, th, { radius = 60, y = 0 } = {}) {
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
      }
    } else if (th.deco !== 'paper') {
      const hillCol = { palms: '#2BB3C0', pines: '#DCE5F0', crystals: '#CFE8F6', coral: '#2E9CA8', autumn: '#D9A86C', trees: '#9CCB7E', domes: '#E9D3A8' }[th.deco] || th.ground2;
      for (let i = 0; i < 14; i++) {
        const a = Math.PI + (i / 13) * Math.PI, h = rnd(5, 12);
        const m = new THREE.Mesh(new THREE.ConeGeometry(rnd(7, 12), h, 6), mat(hillCol, { flatShading: true }));
        m.position.set(Math.cos(a) * radius, y + h / 2 - 1, Math.sin(a) * radius);
        g.add(m);
        if (th.deco === 'pines' || th.deco === 'crystals') { const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 6), mat('#FFFFFF', { flatShading: true })); cap.position.set(m.position.x, y + h - 2.3, m.position.z); g.add(cap); }
      }
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
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = th.ground; g.fillRect(0, 0, 256, 256);
    if (th.sketch) {
      g.strokeStyle = '#BFD3EA'; g.lineWidth = 3;
      for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y + 16); g.lineTo(256, y + 16); g.stroke(); }
    } else {
      for (let i = 0; i < 160; i++) {
        g.fillStyle = Math.random() < .5 ? th.ground2 : 'rgba(255,255,255,.35)';
        g.globalAlpha = rnd(.15, .5);
        g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, rnd(2, 7), 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    const t = texture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
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
    THEMES, theme, mat, glow, col, rnd, ease, fonts, sign, plate, recolorSign, textCanvas, texture, create, clear, controls, pick, groundPoint,
    player, blob, starMesh, tree, pine, palm, prop, cloud, planet, horizon, weather, groundTexture, burstAt, tint, dotTex,
  };
})();
