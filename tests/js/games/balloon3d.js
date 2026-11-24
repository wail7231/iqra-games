/* منطاد المظلات (ثلاثي الأبعاد) — منطاد هواء ساخن يطير فوق حقول وقرى، وعلى الأرض منصّات هبوط
   على كل منصة إجابة. يحرّك اللاعب المنطاد بحرية (الأسهم أو السحب كعصا تحكم)، ويسقط صندوقًا بمظلة
   (لمسة أو المسافة أو زر الإسقاط). الصندوق يسقط ثم تنفتح مظلته وتدفعه الريح، ودائرة على الأرض
   تُظهر أين سيهبط، وسهم الريح في الأعلى يُظهر اتجاهها.
   الهبوط على منصة الصحيحة يضيئها خضراء وتتطاير نجوم (نقطة إن كانت أول اختيار)،
   وعلى الخاطئة تحمرّ وتهتز وتُنقص قلبًا، وخارج المنصات غبار خفيف بلا عقوبة. */
'use strict';

let BALLOON = null;
const BL = { y: 11, area: 30, padR: 2.7, chuteVy: 2.6, freeT: .35 };

function balloonScene() {
  const S = K3.create({ fov: 55, fogNear: 50, fogFar: 120, ratio: .62, maxH: 540 });
  const { scene, camera } = S;
  const joy = K3.joystick(S);
  let balloon = null, shadow = null, pads = [], crates = [], bits = [], marker = null, clouds = [];
  const P = S.P = { x: 0, z: 14, vx: 0, vz: 0 };
  const wind = S.wind = new THREE.Vector3();
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  /* مواضع المنصات محددة سلفًا ومتباعدة، فلا تقع قرية أو شجرة فوق منصة مهما تغيّر السؤال */
  const SPOTS = [];
  for (let t = 0; t < 600 && SPOTS.length < 14; t++) {
    const x = K3.rnd(-BL.area + 3, BL.area - 3), z = K3.rnd(-BL.area - 12, 4);
    if (SPOTS.every(p => Math.hypot(p.x - x, p.z - z) > 10.5) && Math.hypot(x - P.x, z - P.z) > 9) SPOTS.push({ x, z });
  }
  const nearSpot = (x, z, r) => SPOTS.some(p => Math.hypot(p.x - x, p.z - z) < r);
  const windArrow = el('div', 'k3-wind', '<svg viewBox="0 0 40 40"><path d="M20 4l8 12h-5v18h-6V16h-5z"/></svg>');
  S.wrap.appendChild(windArrow);

  /* ---------- الأرض: حقول ملوّنة، وطرق، وقرى، وأشجار ---------- */
  function house(th) {
    const g = new THREE.Group(), w = K3.rnd(1.2, 1.8), d = K3.rnd(1.1, 1.5), h = K3.rnd(.9, 1.3);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), K3.mat(['#FFF8EA', '#F2DDBA', '#E9E2D6'][Math.floor(Math.random() * 3)])); walls.position.y = h / 2; g.add(walls);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(.01, w * .75, .8, 4, 1), K3.mat([th.wall, th.wall2, '#B5532A'][Math.floor(Math.random() * 3)], { flatShading: true })); roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.y = h + .4; g.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(.3, .5), K3.mat('#6B4A2E')); door.position.set(0, .25, d / 2 + .01); g.add(door);
    for (const x of [-w / 3, w / 3]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(.24, .22), K3.glow(th.dark ? '#FFE08A' : '#9CD5F2')); win.position.set(x, h * .62, d / 2 + .01); g.add(win); }
    return g;
  }
  S.onTheme = th => {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), K3.mat(th.ground, { map: K3.groundTexture(th, 34) }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -14; S.env.add(ground);
    /* رقع حقول بألوان قريبة من القالب، بخطوط حراثة */
    const fieldCols = [th.ground2, th.path, K3.col(th.ground).lerp(K3.col('#FFFFFF'), .22).getStyle(), K3.col(th.ground2).lerp(K3.col('#000000'), .08).getStyle()];
    const rowsTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 3); const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
    for (let i = 0; i < 30; i++) {
      const w = K3.rnd(6, 13), d = K3.rnd(6, 13);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), K3.mat(fieldCols[i % fieldCols.length], { map: rowsTex }));
      f.rotation.x = -Math.PI / 2; f.rotation.z = (Math.floor(Math.random() * 4)) * Math.PI / 2 + K3.rnd(-.05, .05);
      f.position.set(K3.rnd(-60, 60), .02 + i * .001, K3.rnd(-70, 30));
      S.env.add(f);
    }
    for (const [x, z, w, d] of [[0, -20, 3, 130], [-20, 0, 130, 2.6], [22, -35, 2.6, 90]]) { const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), K3.mat(th.path)); road.rotation.x = -Math.PI / 2; road.position.set(x, .05, z); S.env.add(road); }
    /* قرى صغيرة بعيدة عن المنصات */
    for (let v = 0, made = 0; v < 40 && made < 6; v++) {
      const cx = K3.rnd(-55, 55), cz = K3.rnd(-65, 25);
      if (nearSpot(cx, cz, 11)) continue;
      made++;
      for (let k = 0; k < 5; k++) { const h = house(th); h.position.set(cx + K3.rnd(-5, 5), 0, cz + K3.rnd(-5, 5)); h.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; S.env.add(h); }
    }
    for (let i = 0; i < 70; i++) {
      const x = K3.rnd(-70, 70), z = K3.rnd(-80, 35);
      if (nearSpot(x, z, 5.5)) continue;
      const p = K3.prop(th, K3.rnd(1.3, 2.4)); p.position.set(x, 0, z); S.env.add(p);
    }
    K3.scatter(S.env, th, { x0: -60, x1: 60, z0: -70, z1: 30, count: 700, avoid: (x, z) => nearSpot(x, z, BL.padR + .5) });
    K3.horizon(S, th, { radius: 95 });
    K3.weather(S, th, { w: 40, h: 22, d: 60, cz: -10 });
    /* غيوم تمرّ مع الريح على ارتفاع المنطاد وفوقه */
    clouds = [];
    if (!th.sketch) for (let i = 0; i < 10; i++) { const c = K3.cloud(K3.rnd(1.6, 3), th.dark ? '#5A6A9A' : '#FFFFFF', .92); c.position.set(K3.rnd(-60, 60), K3.rnd(15, 22), K3.rnd(-70, 20)); S.env.add(c); clouds.push(c); }
    /* المنطاد وظله ودائرة الهبوط المتوقّع */
    if (balloon) scene.remove(balloon);
    balloon = makeBalloon(th); scene.add(balloon);
    if (!shadow) { shadow = K3.blob(2.2, .22); scene.add(shadow); }
    if (!marker) {
      marker = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; marker.add(ring);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.22, 16), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false })); dot.rotation.x = -Math.PI / 2; marker.add(dot);
      for (let k = 0; k < 4; k++) { const tk = new THREE.Mesh(new THREE.PlaneGeometry(.12, .5), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false })); tk.rotation.x = -Math.PI / 2; tk.rotation.z = k * Math.PI / 2; tk.position.set(Math.sin(k * Math.PI / 2) * 1.5, 0, Math.cos(k * Math.PI / 2) * 1.5); marker.add(tk); }
      marker.renderOrder = 4; scene.add(marker);
    }
    if (S.q) layoutPads(pads.map(p => ({ a: p.a, x: p.x, z: p.z, state: p.state })));
  };

  /* ---------- المنطاد: غلاف بشرائح ملوّنة، وسلة مجدولة، وحبال، وشعلة ---------- */
  function goreTex(th) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64;
    const g = c.getContext('2d'), cols = [th.accent, th.gold, '#FFFFFF', th.wall2];
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * 32, 0, 32, 64); }
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 16; i++) g.fillRect(i * 32, 0, 2, 64);
    return K3.texture(c);
  }
  function makeBalloon(th) {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 24; i++) { const k = i / 24, y = k * 5.4; const r = k < .62 ? .55 + Math.sin(k / .62 * Math.PI / 2) * 2.05 : 2.6 * Math.cos((k - .62) / .38 * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(.001, r), y)); }
    const env = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshPhongMaterial({ map: goreTex(th), shininess: 30, side: THREE.DoubleSide }));
    env.position.y = 2.4; g.add(env);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(.56, .06, 6, 20), K3.mat('#6B4A2E')); crown.rotation.x = Math.PI / 2; crown.position.y = 2.42; g.add(crown);
    /* السلة: خوص بخطوط، وحافة جلدية، وأكياس رمل معلّقة */
    const wc = document.createElement('canvas'); wc.width = wc.height = 64; const wg = wc.getContext('2d');
    wg.fillStyle = '#B98A4E'; wg.fillRect(0, 0, 64, 64); wg.strokeStyle = 'rgba(80,50,20,.55)'; wg.lineWidth = 2;
    for (let y = 0; y < 64; y += 8) { wg.beginPath(); for (let x = 0; x <= 64; x += 8) wg.lineTo(x, y + ((x / 8) % 2 ? 3 : 0)); wg.stroke(); }
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.2, .9, 1.2), K3.mat('#FFFFFF', { map: K3.texture(wc) })); basket.position.y = .45; g.add(basket);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.32, .14, 1.32), K3.mat('#6B4A2E')); rim.position.y = .92; g.add(rim);
    for (const [x, z] of [[-.58, -.58], [.58, -.58], [-.58, .58], [.58, .58]]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.6, 4), K3.mat('#5A4632'));
      rope.position.set(x * .75, 1.7, z * .75); rope.rotation.set(-z * .25, 0, x * .25); g.add(rope);
    }
    for (const [x, z] of [[.66, .2], [-.66, -.25], [.2, .66]]) { const bag = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), K3.mat('#C9B48A')); bag.scale.y = 1.3; bag.position.set(x, .45, z); g.add(bag); }
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .3, 10), K3.mat('#5A5A66')); burner.position.y = 1.9; g.add(burner);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.2, .7, 10), new THREE.MeshBasicMaterial({ color: '#FFB04A', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.y = 2.35; g.add(flame);
    const rider = K3.player(); rider.scale.setScalar(.5); rider.position.y = 1.15; g.add(rider);
    g.userData = { env, flame, rider };
    return g;
  }

  /* ---------- منصّات الهبوط ---------- */
  function padTex(th) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    ['#FFFFFF', th.accent, '#FFFFFF', th.accent, th.gold].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 126 - k * 25, 0, 7); g.fill(); });
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 70); g.lineTo(128, 186); g.moveTo(70, 128); g.lineTo(186, 128); g.stroke();
    return K3.texture(c);
  }
  function makePad(a, th) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(BL.padR + .25, BL.padR + .45, .3, 36), K3.mat(th.dark ? '#3A4A80' : '#9C8F80', { flatShading: true })); base.position.y = .15; g.add(base);
    const face = new THREE.Mesh(new THREE.CircleGeometry(BL.padR, 40), K3.mat('#FFFFFF', { map: padTex(th) })); face.rotation.x = -Math.PI / 2; face.position.y = .31; g.add(face);
    for (let i = 0; i < 8; i++) { const a2 = i / 8 * Math.PI * 2, lt = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), K3.glow(th.gold)); lt.position.set(Math.cos(a2) * (BL.padR + .3), .36, Math.sin(a2) * (BL.padR + .3)); g.add(lt); }
    /* كمّ الريح على عمود بجانب المنصة */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 6), K3.mat('#5A5A66')); pole.position.set(BL.padR + .7, 1.3, 0); g.add(pole);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(.22, .1, 1, 10, 1, true), K3.mat('#E8761E', { side: THREE.DoubleSide })); sock.geometry.translate(0, -.5, 0); sock.position.set(BL.padR + .7, 2.5, 0); sock.rotation.order = 'YXZ'; g.add(sock);
    const sign = K3.sign(a.t, { h: 1.25, px: 76 });
    if (sign.scale.x > 4.8) sign.scale.set(4.8, 4.8 / sign.userData.ratio, 1);
    sign.position.y = 2.6; g.add(sign);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.8, 6), K3.mat('#6B4A2E')); stand.position.y = 1.2; g.add(stand);
    g.userData = { face, sign, sock };
    return g;
  }
  function layoutPads(keep) {
    const th = K3.theme();
    pads.forEach(p => scene.remove(p.g));
    pads = [];
    const list = keep || mixAnswers(S.q, 12, []).map(a => ({ a }));
    const free = shuffle(SPOTS.slice());
    list.forEach((it, k) => {
      let { x, z } = it;
      if (x == null) ({ x, z } = free[k % free.length]);
      const g = makePad(it.a, th); g.position.set(x, 0, z); scene.add(g);
      const p = { a: it.a, g, x, z, state: it.state || '', t: 0 };
      if (p.state === 'good') K3.tint(g, '#4CAF50', .5); else if (p.state === 'bad') K3.tint(g, '#C0392B', .5);
      pads.push(p);
    });
  }
  S.pads = () => pads;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    crates.forEach(c => scene.remove(c.g)); crates = [];
    /* ريح جديدة لكل سؤال، قوتها من الإعدادات */
    const a = Math.random() * Math.PI * 2, k = (Play.cfg.wind == null ? 4 : Play.cfg.wind) / 10;
    wind.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(k * K3.rnd(1.2, 2));
    layoutPads();
  };

  /* ---------- الصندوق بالمظلة ---------- */
  function makeCrate(th) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), K3.mat('#A0703A')); g.add(box);
    for (const y of [-.25, .25]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(.84, .08, .84), K3.mat('#7A5230')); pl.position.y = y; g.add(pl); }
    const band = new THREE.Mesh(new THREE.BoxGeometry(.2, .84, .84), K3.mat(th.gold)); g.add(band);
    const chute = new THREE.Group(); chute.position.y = 2.2; g.add(chute);
    const cg = new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4);
    const canopy = new THREE.Mesh(cg, new THREE.MeshPhongMaterial({ map: goreTex(th), side: THREE.DoubleSide, shininess: 20 })); canopy.scale.y = .7; chute.add(canopy);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.1, 3), K3.mat('#FFFFFF')); s.position.set(Math.cos(a) * .6, -1, Math.sin(a) * .6); s.lookAt(0, -2.2, 0); s.rotateX(Math.PI / 2); chute.add(s); }
    chute.scale.setScalar(.01);
    g.userData = { chute };
    return g;
  }
  /* محاكاة الهبوط نفسها تُستعمل للصندوق وللدائرة المتوقعة، فتطابقان تمامًا */
  function stepCrate(c, dt) {
    c.t += dt;
    if (c.t < BL.freeT) c.vy -= 14 * dt;
    else c.vy += (-BL.chuteVy - c.vy) * Math.min(1, dt * 5);
    const k = Math.min(1, dt * (c.t < BL.freeT ? .6 : 2.2));
    c.vx += (wind.x - c.vx) * k; c.vz += (wind.z - c.vz) * k;
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
  }
  function predict() {
    const c = { x: P.x, y: BL.y - .2, z: P.z, vx: P.vx, vy: 0, vz: P.vz, t: 0 };
    for (let i = 0; i < 400 && c.y > .35; i++) stepCrate(c, 1 / 30);
    return c;
  }
  S.predict = predict;
  S.drop = () => {
    if (!S.started) { S.begin(); return; }
    if (Play.finished || S.answered || Play.roundDone || crates.some(c => !c.landed)) return;
    const g = makeCrate(K3.theme());
    const c = { g, x: P.x, y: BL.y - .2, z: P.z, vx: P.vx, vy: 0, vz: P.vz, t: 0, landed: false, life: 2.5 };
    g.position.set(c.x, c.y, c.z); scene.add(g); crates.push(c);
    FX.play('pop');
  };
  function land(c) {
    c.landed = true; c.y = .35;
    const pad = pads.find(p => !p.state && Math.hypot(p.x - c.x, p.z - c.z) < BL.padR + .35);
    const pos = new THREE.Vector3(c.x, .8, c.z), pt = S.screen(pos);
    for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#C9B48A', transparent: true, opacity: .7, depthWrite: false })); s.position.set(c.x, .4, c.z); s.scale.setScalar(.5); scene.add(s); const a = Math.random() * 6.28; bits.push({ m: s, puff: true, v: new THREE.Vector3(Math.cos(a) * 1.6, K3.rnd(.4, 1), Math.sin(a) * 1.6), life: 1 }); }
    if (!pad || S.answered || Play.roundDone) { FX.play('tick'); return; }
    if (pad.a.ok) {
      pad.state = 'good'; pad.t = 0;
      K3.tint(pad.g, '#4CAF50', .5);
      for (let i = 0; i < 22; i++) { const m = K3.starMesh(.2, i % 2 ? K3.theme().gold : '#FFFFFF', .06); m.position.copy(pos); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 3.5, K3.rnd(3, 8), Math.sin(a) * 3.5), life: 1, spin: K3.rnd(-8, 8) }); }
      S.collected.push(pad.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1600 });
    } else {
      pad.state = 'bad'; pad.t = 0;
      K3.tint(pad.g, '#C0392B', .5);
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- التحكم ---------- */
  K3.controls(S, { hold: joy.hold, tap(e) { S.drop(); } });
  const btn = el('button', 'k3-btn k3-fire', '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>');
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); S.drop(); });
  S.wrap.appendChild(btn);

  const look = new THREE.Vector3();
  S.onFrame = dt => {
    if (!balloon) return;
    const t = S.t, live = S.started && !Play.finished;
    const inp = live ? joy.read() : { x: 0, z: 0 };
    P.vx += (inp.x * 7 - P.vx) * Math.min(1, dt * 2.2);
    P.vz += (inp.z * 7 - P.vz) * Math.min(1, dt * 2.2);
    P.x = Math.max(-BL.area - 6, Math.min(BL.area + 6, P.x + P.vx * dt));
    P.z = Math.max(-BL.area - 20, Math.min(18, P.z + P.vz * dt));
    const bob = Math.sin(t * 1.2) * .25;
    balloon.position.set(P.x, BL.y - 1 + bob, P.z);
    balloon.rotation.z = -P.vx * .02; balloon.rotation.x = P.vz * .02;
    const u = balloon.userData;
    u.flame.scale.set(1, .8 + Math.sin(t * 22) * .2 + Math.random() * .15, 1);
    u.rider.userData.body.rotation.y += dt * 1.2;
    shadow.position.set(P.x, .06, P.z); shadow.scale.setScalar(1 + bob * .1);
    /* دائرة الهبوط المتوقّع */
    const pr = predict();
    const over = pads.find(p => !p.state && Math.hypot(p.x - pr.x, p.z - pr.z) < BL.padR + .35);
    marker.visible = live && !S.answered && !crates.some(c => !c.landed);
    marker.position.set(pr.x, .4, pr.z);
    marker.rotation.y += dt * .8;
    marker.scale.setScalar(over ? 1.25 + Math.sin(t * 8) * .08 : 1);
    marker.children.forEach(m => m.material.color.set(over ? K3.theme().gold : '#FFFFFF'));
    /* الصناديق */
    crates.forEach(c => {
      if (!c.landed) {
        stepCrate(c, dt);
        const ch = c.g.userData.chute;
        ch.scale.setScalar(c.t < BL.freeT ? .01 : Math.min(1, (c.t - BL.freeT) * 3));
        c.g.rotation.z = Math.sin(t * 2 + c.x) * .08;
        if (c.y <= .75) land(c);
      } else {
        c.life -= dt;
        const ch = c.g.userData.chute; ch.scale.y = Math.max(.01, ch.scale.y - dt * 2); ch.position.x += dt * .8;
        if (c.life <= 0) scene.remove(c.g);
      }
      c.g.position.set(c.x, Math.max(.75, c.y), c.z);
    });
    crates = crates.filter(c => c.life > 0);
    /* المنصات: كمّ الريح يشير مع الريح، واهتزاز الخاطئة */
    const wy = Math.atan2(wind.x, wind.z), wk = Math.min(1, wind.length() / 1.6);
    pads.forEach(p => {
      const s = p.g.userData.sock;
      s.rotation.y = wy; s.rotation.x = Math.PI / 2 * (.35 + wk * .6) + Math.sin(t * 6 + p.x) * .06;
      if (p.state === 'bad') { p.t += dt; p.g.position.x = p.x + Math.sin(t * 50) * .1 * Math.max(0, 1 - p.t * 2); }
    });
    clouds.forEach((c, i) => { c.position.x += wind.x * dt * .8; c.position.z += wind.z * dt * .8; if (Math.abs(c.position.x) > 70) c.position.x *= -.95; if (c.position.z > 30 || c.position.z < -80) c.position.z = c.position.z > 30 ? -78 : 28; });
    bits.forEach(b => {
      b.life -= dt * 1.1;
      if (b.puff) { b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(.5 + (1 - b.life) * 1.5); b.m.material.opacity = Math.max(0, b.life * .7); }
      else { b.v.y -= 10 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += b.spin * dt; b.m.scale.setScalar(Math.max(.01, b.life)); }
      if (b.life <= 0) scene.remove(b.m);
    });
    bits = bits.filter(b => b.life > 0);
    /* سهم الريح: اتجاهها كما تراه الكاميرا (الكاميرا تنظر نحو -z) */
    windArrow.style.transform = `rotate(${Math.atan2(wind.x, -wind.z)}rad) scale(${.7 + wk * .5})`;
    windArrow.classList.toggle('on', S.started);
    /* الكاميرا خلف المنطاد ومن فوقه، تنظر إلى الأرض أمامه */
    camera.position.x += (P.x - camera.position.x) * Math.min(1, dt * 2.5);
    camera.position.y += (BL.y + 15 - camera.position.y) * Math.min(1, dt * 2.5);
    camera.position.z += (P.z + 14 - camera.position.z) * Math.min(1, dt * 2.5);
    look.set(P.x, 0, P.z - 9);
    camera.lookAt(look);
  };
  camera.position.set(0, BL.y + 15, P.z + 14);
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'wind', label: 'قوة الريح', kind: 'range', min: 0, max: 10, def: 4 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !BALLOON || !BALLOON.wrap.isConnected) {
      if (BALLOON) BALLOON.wrap.remove();
      BALLOON = balloonScene();
      Play.board.appendChild(BALLOON.wrap);
      BALLOON.size();
    }
    BALLOON.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(BALLOON.paint.el, BALLOON.wrap);
    K3.fonts.then(() => BALLOON.setQuestion(q));
  },
});
