/* سفن المنارة (ثلاثي الأبعاد) — منارة على جزيرة صخرية عند طرف البحر، ورصيف خشبي وبيت للحارس.
   تقترب من الأفق سفن شراعية، فوق كل سفينة لافتة إجابة. يدير اللاعب ضوء المنارة بالسحب أو بالأسهم،
   ويلمس السفينة (أو يضغط المسافة والضوء عليها) فيومض الضوء نحوها:
   السفينة الصحيحة تتجه إلى الميناء وترسو عند الرصيف (نقطة إن كانت أول اختيار)،
   والخاطئة تحمرّ وتطلق بوقها وتبتعد في الضباب وتُنقص قلبًا.
   السفن التي لم تُختر تقترب ثم تستدير وتعود، بلا عقوبة. الماء والسماء والجزيرة تتبع قالب الشكل. */
'use strict';

let LIGHT = null;
const LH = { x: -8, z: 6, top: 8.3, far: -58, near: -10 };
const LH_WATER = {
  classic: ['#3FA9BC', '#7FD0DC'], night: ['#0E1A44', '#24346A'], garden: ['#3F96BA', '#8CD0F2'], ice: ['#4F9FD0', '#BFE3F3'],
  notebook: ['#D6E3F2', '#FFFFFF'], ocean: ['#0E7C86', '#3FB0B8'], space: ['#2A1D5E', '#6E52C8'], autumn: ['#3F6E66', '#7FA894'],
  summer: ['#1E9AAE', '#5FC9D6'], winter: ['#3B5BA9', '#8EA6C8'],
};
const lhWave = (x, z, t) => Math.sin(x * .22 + t * 1.1) * .2 + Math.cos(z * .27 + t * .85) * .17 + Math.sin((x + z) * .13 + t * .55) * .1;

function lighthouseScene() {
  const S = K3.create({ fov: 52, fogNear: 62, fogFar: 140, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  let waterGeo = null, beam = null, beamGlow = null, lamp = null, ships = [], bits = [], wakes = [];
  const B = { yaw: .1, target: null, flash: 0, pending: null, cool: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  S.B = B;
  camera.position.set(0, 8.5, 17);
  camera.lookAt(0, 1, -16);
  const speed = () => .9 + (Play.cfg.speed || 4) * .2;
  const yawTo = (x, z) => Math.atan2(x - LH.x, -(z - LH.z));

  /* ---------- البحر والجزيرة والمنارة ---------- */
  function stripes(th) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : (th.sketch ? '#2B4C7E' : '#C0392B'); g.fillRect(0, i * 256 / 6, 64, 256 / 6); }
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < 256; y += 8) g.fillRect(0, y, 64, 1);
    return K3.texture(c);
  }
  S.onTheme = th => {
    const wc = LH_WATER[Play.cfg.theme] || LH_WATER.classic;
    waterGeo = new THREE.PlaneGeometry(170, 150, 70, 60);
    const cols = [], c1 = K3.col(wc[0]), c2 = K3.col(wc[1]);
    for (let i = 0; i < waterGeo.attributes.position.count; i++) { const c = c1.clone().lerp(c2, Math.random() * .55); cols.push(c.r, c.g, c.b); }
    waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 80, specular: K3.col('#FFFFFF').multiplyScalar(.35) }));
    water.rotation.x = -Math.PI / 2; water.position.z = -30;
    S.env.add(water);
    const rockC = th.dark ? '#3A3570' : th.sketch ? '#FFFFFF' : '#8F8576';
    /* الجزيرة: صخور متراكبة وقمة عشبية */
    const isle = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r = K3.rnd(3.2, 4.6);
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(K3.rnd(1.1, 1.8), 0), K3.mat(rockC, { flatShading: true }));
      rk.position.set(Math.cos(a) * r, K3.rnd(-.2, .5), Math.sin(a) * r); rk.rotation.set(Math.random() * 3, Math.random() * 3, 0); isle.add(rk);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 1.6, 14), K3.mat(th.ground, { flatShading: true, map: K3.groundTexture(th, 3) }));
    top.position.y = .8; isle.add(top);
    K3.scatter(isle, th, { count: 60, at: () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 3.9; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 1.6 }; }, avoid: (x, z) => Math.hypot(x, z) < 1.7 });
    for (const [x, z] of [[2.6, -1.6], [-2.8, 1.4], [-2.2, -2.4]]) { const p = K3.prop(th, 1.1); p.position.set(x, 1.6, z); isle.add(p); }
    isle.position.set(LH.x, 0, LH.z);
    S.env.add(isle);
    /* المنارة: برج مخطط، ونوافذ وباب، وشرفة بسياج، وغرفة مصباح زجاجية، وقبة */
    const tower = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.85, 1.3, 6.2, 28), K3.mat('#FFFFFF', { map: stripes(th) })); body.position.y = 4.7; tower.add(body);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, .7, 20), K3.mat(rockC, { flatShading: true })); base.position.y = 1.85; tower.add(base);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(.55, .9), K3.mat('#6B4A2E')); door.position.set(0, 2.55, 1.29); door.rotation.x = -.06; tower.add(door);
    for (const y of [4.2, 5.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.3, .45), K3.glow(th.dark ? '#FFE08A' : '#5A7BC4')); w.position.set(0, y, 1.21 - (y - 2) * .07); w.rotation.x = -.07; tower.add(w); }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.2, .2, 24), K3.mat('#3A3F4A')); gallery.position.y = 7.85; tower.add(gallery);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.3, .035, 6, 32), K3.mat('#3A3F4A')); rail.rotation.x = Math.PI / 2; rail.position.y = 8.35; tower.add(rail);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, post = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 4), K3.mat('#3A3F4A')); post.position.set(Math.cos(a) * 1.3, 8.1, Math.sin(a) * 1.3); tower.add(post); }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, 1, 12, 1, true), new THREE.MeshPhongMaterial({ color: '#E6FBFF', transparent: true, opacity: .45, shininess: 120, side: THREE.DoubleSide })); glass.position.y = 8.45; tower.add(glass);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, bar = new THREE.Mesh(new THREE.BoxGeometry(.05, 1, .05), K3.mat('#3A3F4A')); bar.position.set(Math.cos(a) * .62, 8.45, Math.sin(a) * .62); tower.add(bar); }
    lamp = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12), K3.glow('#FFF3C4')); lamp.position.y = 8.45; tower.add(lamp);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(.85, .9, 16), K3.mat(th.sketch ? '#2B4C7E' : '#C0392B')); roof.position.y = 9.4; tower.add(roof);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), K3.mat(th.gold)); knob.position.y = 9.92; tower.add(knob);
    tower.position.set(LH.x, 0, LH.z);
    S.env.add(tower);
    /* بيت الحارس بجانب المنارة */
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(2, 1.3, 1.6), K3.mat(th.card || '#FFFFFF')); walls.position.y = .65; house.add(walls);
    const hroof = new THREE.Mesh(new THREE.ConeGeometry(1.6, .9, 4), K3.mat(th.wall2)); hroof.rotation.y = Math.PI / 4; hroof.position.y = 1.75; hroof.scale.z = .85; house.add(hroof);
    const hdoor = new THREE.Mesh(new THREE.PlaneGeometry(.4, .7), K3.mat('#6B4A2E')); hdoor.position.set(.4, .35, .81); house.add(hdoor);
    const hwin = new THREE.Mesh(new THREE.PlaneGeometry(.4, .35), K3.glow(th.dark ? '#FFE08A' : '#9CD5F2')); hwin.position.set(-.45, .75, .81); house.add(hwin);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(.25, .6, .25), K3.mat(rockC)); chim.position.set(-.5, 2, -.2); house.add(chim);
    house.position.set(LH.x + 2.4, 1.6, LH.z + 1.4); house.rotation.y = -.5;
    S.env.add(house);
    /* الرصيف: ألواح خشبية على أعمدة، وفوانيس، وحبال إرساء */
    const pier = new THREE.Group();
    for (let i = 0; i < 26; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(.42, .12, 2.2), K3.mat(i % 2 ? '#A0703A' : '#8A5A30')); pl.position.set(i * .44, 1.05, 0); pier.add(pl); }
    for (let i = 0; i < 6; i++) for (const z of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 2.4, 8), K3.mat('#6B4A2E')); post.position.set(i * 2.2, .1, z); pier.add(post); }
    for (const x of [3.4, 8.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 6), K3.mat('#3A3F4A')); pole.position.set(x, 1.9, -1); pier.add(pole);
      const lt = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), K3.glow('#FFE08A')); lt.position.set(x, 2.75, -1); pier.add(lt);
    }
    pier.position.set(LH.x + 4.2, 0, LH.z - .6);
    S.env.add(pier);
    /* جزر بعيدة وعوّامات مضيئة */
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), r = K3.rnd(2.5, 5);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, r * .7, 9), K3.mat(th.ground2, { flatShading: true })); hill.position.y = r * .3; g.add(hill);
      for (let k = 0; k < 3; k++) { const p = K3.prop(th, K3.rnd(1.2, 2)); p.position.set(K3.rnd(-r * .5, r * .5), r * .35, K3.rnd(-r * .3, r * .3)); g.add(p); }
      g.position.set((i % 2 ? 1 : -1) * K3.rnd(32, 55), -.3, K3.rnd(-75, -45)); S.env.add(g);
    }
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const f = new THREE.Mesh(new THREE.CylinderGeometry(.3, .45, .8, 10), K3.mat(i % 2 ? '#C0392B' : '#2E8C6A')); g.add(f);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .5, 10), K3.mat('#FFFFFF')); cap.position.y = .65; g.add(cap);
      const lt = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), K3.glow(i % 2 ? '#FF6B5A' : '#7FD36B')); lt.position.y = 1; g.add(lt);
      const x = -24 + i * 12 + K3.rnd(-2, 2), z = K3.rnd(-30, -16);
      g.position.set(x, 0, z); S.env.add(g);
      S.fx.push((dt, t) => { g.position.y = lhWave(x, z, t) + .1; g.rotation.z = Math.sin(t * 1.3 + i) * .12; lt.material.color.setScalar(.6 + Math.sin(t * 4 + i) * .4); });
    }
    K3.horizon(S, th, { radius: 95, hills: false });
    K3.weather(S, th, { w: 40, h: 14, d: 60, cz: -20 });
    /* شعاع المنارة: مخروط ضوء شفاف يبدأ من المصباح، وهالة حوله */
    const bg = new THREE.ConeGeometry(4.2, 46, 28, 1, true); bg.translate(0, -23, 0); bg.rotateX(Math.PI / 2);
    beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: '#FFF3C4', transparent: true, opacity: th.dark ? .2 : .13, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    beam.position.set(LH.x, LH.top + .15, LH.z); beam.rotation.order = 'YXZ';
    S.env.add(beam);
    beamGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFF3C4', transparent: true, opacity: .9, depthWrite: false, fog: false }));
    beamGlow.scale.set(3, 3, 1); beamGlow.position.copy(beam.position);
    S.env.add(beamGlow);
    if (S.q) ships.forEach(s => { scene.add(s.g); });
  };

  /* ---------- السفينة الشراعية ---------- */
  function hullShape() {
    const s = new THREE.Shape();
    s.moveTo(-.95, 2); s.lineTo(.95, 2); s.lineTo(1, -.5);
    s.quadraticCurveTo(.7, -1.9, 0, -2.5); s.quadraticCurveTo(-.7, -1.9, -1, -.5); s.closePath();
    return s;
  }
  function makeShip(a) {
    const th = K3.theme(), g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    const hullCol = ['#8A5A30', '#2E5A88', '#3F6E50', '#7A3A2A'][Math.floor(Math.random() * 4)];
    const hg = new THREE.ExtrudeGeometry(hullShape(), { depth: 1, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 10 });
    hg.rotateX(Math.PI / 2);
    const hull = new THREE.Mesh(hg, [K3.mat('#C9A06A'), K3.mat(hullCol, { flatShading: true })]); hull.position.y = .55; body.add(hull);
    const bg = new THREE.ExtrudeGeometry(hullShape(), { depth: .14, bevelEnabled: false, curveSegments: 10 }); bg.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bg, K3.mat(th.gold)); band.scale.set(1.04, 1, 1.03); band.position.y = .5; body.add(band);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const ph = new THREE.Mesh(new THREE.CircleGeometry(.11, 12), K3.glow(th.dark ? '#FFE08A' : '#E6FBFF')); ph.position.set(sx * 1.01, .15, -.6 + k * .7); ph.rotation.y = sx * Math.PI / 2; body.add(ph); }
    /* القمرة في المؤخرة بنوافذ وسقف */
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, .75, 1.1), K3.mat(th.card || '#FFFFFF')); cab.position.set(0, .95, 1.2); body.add(cab);
    const croof = new THREE.Mesh(new THREE.BoxGeometry(1.45, .12, 1.25), K3.mat(th.wall2)); croof.position.set(0, 1.38, 1.2); body.add(croof);
    for (const x of [-.35, .35]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.28, .25), K3.glow('#9CD5F2')); w.position.set(x, 1, .64); w.rotation.y = Math.PI; body.add(w); }
    /* الصاري والشراع المنتفخ والراية */
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 4.4, 8), K3.mat('#6B4A2E')); mast.position.set(0, 2.7, -.3); body.add(mast);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.4, 6), K3.mat('#6B4A2E')); boom.rotation.z = Math.PI / 2; boom.position.set(0, 1.25, -.25); body.add(boom);
    const sg = new THREE.PlaneGeometry(2.3, 2.9, 8, 8), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, -(1 - (x / 1.15) ** 2) * .45 * (.6 + (y + 1.45) / 2.9 * .4)); }
    sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, K3.mat('#FFF8EA', { side: THREE.DoubleSide })); sail.position.set(0, 2.75, -.15); body.add(sail);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.3, .35, 8, 1), K3.mat(th.accent, { side: THREE.DoubleSide })); stripe.position.set(0, 2.2, -.32); body.add(stripe);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.6, .32), K3.mat(th.accent, { side: THREE.DoubleSide })); flag.position.set(.3, 5.05, -.3); body.add(flag);
    const bowLamp = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), K3.glow('#FFE08A')); bowLamp.position.set(0, .8, -2.35); body.add(bowLamp);
    /* لافتة الإجابة فوق الصاري (تواجه الكاميرا دائمًا)، وحلقة على الماء حين يقع الضوء على السفينة */
    const sign = K3.sign(a.t, { h: 1.15, px: 76 });
    if (sign.scale.x > 4.2) sign.scale.set(4.2, 4.2 / sign.userData.ratio, 1);
    sign.position.set(0, 6.1, 0); g.add(sign);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 40), K3.glow('#FFF3C4', { transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .25; g.add(ring);
    g.userData = { body, sign, ring, flag, sail };
    return g;
  }
  function spawnShips() {
    ships.forEach(s => scene.remove(s.g));
    ships = [];
    const list = mixAnswers(S.q, 6, []);
    const n = list.length, lanes = shuffle([...Array(n)].map((_, k) => k));
    list.forEach((a, k) => {
      /* كل سفينة في ممر خاص بها حتى لا تتزاحم، وبعدها عن المنارة مختلف */
      const x = -24 + (lanes[k] + .5) * (48 / n) + K3.rnd(-1, 1);
      const z = K3.rnd(LH.far, LH.far + 18);
      const g = makeShip(a); g.position.set(x, 0, z);
      scene.add(g);
      ships.push({ a, g, x, z, lane: x, ph: Math.random() * 6, sp: K3.rnd(.85, 1.15), state: 'come', t: 0, dir: 1 });
    });
  }
  S.ships = () => ships;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false; B.pending = null;
    S.need = needAll(q) ? answersOf(q).length : 1;
    spawnShips();
  };

  /* ---------- الإشارة: ومضة الضوء نحو سفينة ---------- */
  const inBeam = s => {
    const d = Math.hypot(s.x - LH.x, s.z - LH.z), half = Math.atan(2.2 / Math.max(4, d)) + .02;
    return Math.abs(Math.atan2(Math.sin(yawTo(s.x, s.z) - B.yaw), Math.cos(yawTo(s.x, s.z) - B.yaw))) < half;
  };
  const choosable = s => s.state === 'come' || s.state === 'back';
  S.signal = ship => {
    if (!S.started) { S.begin(); return; }
    if (B.cool > 0 || B.pending || Play.finished) return;
    const s = ship || ships.filter(x => choosable(x) && inBeam(x)).sort((a, b) => b.z - a.z)[0];
    if (s) B.target = yawTo(s.x, s.z);
    B.flash = 1; B.cool = .55;
    FX.play('tick');
    if (s) B.pending = { s, t: .3 };
  };
  function judge(s) {
    if (!choosable(s) || S.answered || Play.roundDone) return;
    const pt = S.screen(new THREE.Vector3(s.x, 6.1, s.z));
    if (s.a.ok) {
      const k = S.collected.length;
      S.collected.push(s.a.t);
      s.state = 'home'; s.t = 0;
      /* مكان الرسوّ على الرصيف */
      s.dock = new THREE.Vector3(LH.x + 6 + k * 3.1, 0, LH.z - 3.4);
      K3.tint(s.g.userData.body, '#4CAF50', .35);
      for (let i = 0; i < 22; i++) { const m = K3.starMesh(.2, i % 2 ? K3.theme().gold : '#FFFFFF', .06); m.position.set(s.x, 5.5, s.z); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 4, K3.rnd(2, 7), Math.sin(a) * 4), life: 1, spin: K3.rnd(-8, 8) }); }
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1800 });
    } else {
      s.state = 'away'; s.t = 0;
      K3.tint(s.g.userData.body, '#C0392B', .5);
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- التحكم: سحب يدير الضوء، ولمسة على سفينة ترسل الإشارة ---------- */
  let last = null, moved = 0;
  K3.controls(S, {
    hold(e, phase) {
      if (phase === 'down' && e) { last = e.clientX; moved = 0; }
      else if (phase === 'move' && e && last != null) { const dx = e.clientX - last; moved += Math.abs(dx); B.yaw = Math.max(-1.2, Math.min(1.25, B.yaw + dx * .004)); B.target = null; last = e.clientX; }
      else if (phase === 'up') last = null;
    },
    tap(e) {
      if (!e) { S.signal(); return; }
      if (moved > 10) return;
      /* لمسة على السفينة أو لافتتها مباشرة، وإلا أقرب سفينة لجهة اللمسة */
      const hit = K3.pick(S, e, ships.filter(choosable).map(s => s.g));
      let s = hit && ships.find(x => { let o = hit.object; while (o && o !== x.g) o = o.parent; return o === x.g; });
      if (!s) {
        const p = K3.groundPoint(S, e, 0);
        if (p) {
          const y = yawTo(p.x, p.z);
          B.target = y;
          s = ships.filter(choosable).map(x => ({ x, d: Math.abs(Math.atan2(Math.sin(yawTo(x.x, x.z) - y), Math.cos(yawTo(x.x, x.z) - y))) })).filter(o => o.d < .12).sort((a, b) => a.d - b.d).map(o => o.x)[0];
        }
      }
      S.signal(s || null);
    },
  });
  const btn = el('button', 'k3-btn k3-fire', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>');
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); S.signal(); });
  S.wrap.appendChild(btn);

  const tmp = new THREE.Vector3();
  S.onFrame = dt => {
    const t = S.t, live = S.started && !Play.finished, k = S.keys;
    /* الأمواج */
    if (waterGeo) {
      const p = waterGeo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, lhWave(p.getX(i), -p.getY(i) - 30, t));
      p.needsUpdate = true;
      waterGeo.computeVertexNormals();
    }
    /* الضوء: يدور ببطء قبل البدء، وبالأسهم أثناء اللعب، ويتجه نحو السفينة الملموسة */
    if (!S.started) B.yaw = Math.sin(t * .4) * .6;
    else if (live) {
      const turn = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
      if (turn) { B.yaw = Math.max(-1.2, Math.min(1.25, B.yaw + turn * dt * 1.3)); B.target = null; }
      if (B.target != null) { B.yaw += (B.target - B.yaw) * Math.min(1, dt * 12); if (Math.abs(B.target - B.yaw) < .002) B.target = null; }
    }
    B.flash = Math.max(0, B.flash - dt * 2.4); B.cool = Math.max(0, B.cool - dt);
    if (beam) {
      beam.rotation.y = -B.yaw; beam.rotation.x = -.11;
      beam.material.opacity = (K3.theme().dark ? .2 : .13) + B.flash * .35;
      beam.scale.set(1 + B.flash * .25, 1 + B.flash * .25, 1);
      beamGlow.scale.setScalar(3 + B.flash * 3 + Math.sin(t * 5) * .2);
      lamp.material.color.set(B.flash > .1 ? '#FFFFFF' : '#FFF3C4');
    }
    if (B.pending) { B.pending.t -= dt; if (B.pending.t <= 0) { const s = B.pending.s; B.pending = null; judge(s); } }
    /* السفن */
    ships.forEach(s => {
      const u = s.g.userData;
      let vx = 0, vz = 0;
      if (s.state === 'come' || s.state === 'back') {
        if (live) {
          const sp = speed() * s.sp * (s.state === 'back' ? 1.6 : 1);
          const tx = s.state === 'come' ? s.lane * .55 : s.lane, tz = s.state === 'come' ? LH.near : LH.far;
          const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz) || 1;
          vx = dx / d * sp; vz = dz / d * sp;
          if (s.state === 'come' && s.z > LH.near - 1) s.state = 'back';
          if (s.state === 'back' && s.z < LH.far + 4) s.state = 'come';
        }
      } else if (s.state === 'home') {
        s.t += dt;
        const dx = s.dock.x - s.x, dz = s.dock.z - s.z, d = Math.hypot(dx, dz);
        if (d > .3) { const sp = Math.min(6, d * 1.2 + 1); vx = dx / d * sp; vz = dz / d * sp; }
        else s.state = 'docked';
      } else if (s.state === 'away') {
        s.t += dt;
        vx = s.lane * .2; vz = -7;
        if (s.z < -95) { s.state = 'gone'; scene.remove(s.g); }
      }
      s.x += vx * dt; s.z += vz * dt;
      const h = lhWave(s.x, s.z, t);
      s.g.position.set(s.x, h + .05, s.z);
      /* الاتجاه نحو الحركة بنعومة، وتمايل مع الموج */
      if (Math.hypot(vx, vz) > .2) { const want = Math.atan2(-vx, -vz), cur = u.body.rotation.y; u.body.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, dt * 2.5); }
      if (s.state === 'docked') { const cur = u.body.rotation.y, want = Math.PI / 2; u.body.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, dt * 2); }
      u.body.rotation.z = Math.sin(t * 1.3 + s.ph) * .06; u.body.rotation.x = Math.cos(t * 1.1 + s.ph) * .04;
      u.flag.rotation.y = Math.sin(t * 5 + s.ph) * .35;
      u.sign.visible = s.state !== 'gone';
      u.ring.material.opacity = live && choosable(s) && inBeam(s) ? .45 + Math.sin(t * 6) * .15 : 0;
      /* أثر الماء خلف السفينة المتحركة */
      if (Math.hypot(vx, vz) > .3 && Math.random() < dt * 6) {
        const w = new THREE.Mesh(new THREE.RingGeometry(.3, .5, 16), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .55, depthWrite: false }));
        w.rotation.x = -Math.PI / 2; tmp.set(-vx, 0, -vz).normalize().multiplyScalar(2.2); w.position.set(s.x + tmp.x, h + .12, s.z + tmp.z);
        scene.add(w); wakes.push({ m: w, life: 1 });
      }
    });
    wakes.forEach(w => { w.life -= dt * .7; w.m.scale.setScalar(1 + (1 - w.life) * 3); w.m.material.opacity = Math.max(0, w.life * .55); if (w.life <= 0) scene.remove(w.m); });
    wakes = wakes.filter(w => w.life > 0);
    bits.forEach(b => { b.life -= dt * 1.1; b.v.y -= 10 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += b.spin * dt; b.m.scale.setScalar(Math.max(.01, b.life)); if (b.life <= 0) scene.remove(b.m); });
    bits = bits.filter(b => b.life > 0);
  };
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'سرعة السفن', kind: 'range', min: 1, max: 10, def: 4 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !LIGHT || !LIGHT.wrap.isConnected) {
      if (LIGHT) LIGHT.wrap.remove();
      LIGHT = lighthouseScene();
      Play.board.appendChild(LIGHT.wrap);
      LIGHT.size();
    }
    LIGHT.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(LIGHT.paint.el, LIGHT.wrap);
    K3.fonts.then(() => LIGHT.setQuestion(q));
  },
});
