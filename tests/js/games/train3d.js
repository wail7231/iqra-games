/* قطار الإجابات (ثلاثي الأبعاد) — قطار بخاري يسير على إحدى ثلاث سكك بين الجبال والأشجار،
   وأمامه تلال فيها أنفاق، وفوق كل نفق لافتة إجابة. يمين/يسار (أو السحب) يحوّل القطار إلى سكة أخرى.
   دخول نفق الإجابة الصحيحة يضيئه بالأخضر والنجوم (نقطة إن كانت أول اختيار)،
   والنفق الخاطئ ينزل حاجزه فيتوقف القطار لحظة بضوء أحمر ويُنقص قلبًا ثم يُكمل.
   الأنفاق تتتابع حتى يُختار الصحيح. الشكل يتبع قالب الشكل. */
'use strict';

let TRAIN = null;
const TR_X = [-3.4, 0, 3.4];

function trainScene() {
  const S = K3.create({ fov: 55, fogNear: 30, fogFar: 85, ratio: .6, maxH: 520 });
  const { scene, camera } = S;
  const world = new THREE.Group();
  scene.add(world);
  let rows = [], deco = [], sleepers = null, train = null, smoke = [], bits = [];
  const P = S.P = { lane: 1, x: 0, v: 0, stop: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const speed = () => 7 + Play.cfg.speed * 1.2;
  camera.position.set(0, 5.6, 10);
  camera.lookAt(0, 1.2, -9);

  /* ---------- السكك والمشهد ---------- */
  S.onTheme = th => {
    K3.clear(world);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 180), K3.mat(th.ground, { map: K3.groundTexture(th, 30) }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -60; world.add(ground);
    /* حصى السكك وقضبانها */
    TR_X.forEach(x => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, .14, 180), K3.mat(th.dark ? '#3A3A50' : '#9C8F80')); bed.position.set(x, .07, -60); world.add(bed);
      for (const sx of [-.6, .6]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 180), K3.mat('#B9BCC6')); rail.position.set(x + sx, .2, -60); world.add(rail); }
    });
    sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, .1, .32), K3.mat('#6B4A2E'), 3 * 70);
    world.add(sleepers);
    /* أعمدة برق وأشجار على الجانبين تتحرك مع السير */
    deco = [];
    for (let i = 0; i < 24; i++) {
      const p = K3.prop(th, K3.rnd(1.3, 2.2)), sx = i % 2 ? 1 : -1;
      p.position.set(sx * K3.rnd(8, 16), 0, -i * 5.5); p.rotation.y = Math.random() * 6;
      world.add(p); deco.push(p);
    }
    for (let i = 0; i < 12; i++) {
      const pole = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 4, 6), K3.mat('#6B4A2E')); post.position.y = 2; pole.add(post);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, .1, .1), K3.mat('#6B4A2E')); bar.position.y = 3.7; pole.add(bar);
      pole.position.set(-6.2, 0, -i * 11); world.add(pole); deco.push(pole);
    }
    K3.horizon(S, th, { radius: 80 });
    K3.weather(S, th, { w: 24, h: 14, d: 50, cz: -20 });
    if (train) scene.remove(train);
    train = makeTrain(th);
    scene.add(train);
    rows.forEach(r => world.remove(r.g));
    rows = [];
    if (S.q && !S.answered) spawnRow(-40);
  };

  /* ---------- القطار: قاطرة بخارية وعربتان، وشكل اللاعب يركب الأولى ---------- */
  function makeTrain(th) {
    const t = new THREE.Group();
    const loco = new THREE.Group();
    const body = K3.mat(th.accent), trim = K3.mat(th.gold), dark = K3.mat('#2A2A33');
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 2.6, 20), body); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.25, -.6); loco.add(boiler);
    for (const z of [-1.6, -.6, .4]) { const band = new THREE.Mesh(new THREE.TorusGeometry(.71, .05, 6, 24), trim); band.position.set(0, 1.25, z); loco.add(band); }
    const front = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .12, 20), dark); front.rotation.x = Math.PI / 2; front.position.set(0, 1.25, -1.95); loco.add(front);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .25, 12), K3.glow('#FFF3B0')); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 2.05, -1.85); loco.add(lamp);
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFF3B0', transparent: true, opacity: .55, depthWrite: false })); beam.scale.set(1.6, 1.6, 1); beam.position.copy(lamp.position); loco.add(beam);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(.22, .16, .8, 12), dark); chimney.position.set(0, 2.2, -1.3); loco.add(chimney);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(.32, .22, .2, 12), trim); funnel.position.set(0, 2.62, -1.3); loco.add(funnel);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), trim); dome.position.set(0, 1.95, -.4); loco.add(dome);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.2), body); cab.position.set(0, 1.55, 1.2); loco.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, .14, 1.5), dark); roof.position.set(0, 2.36, 1.2); loco.add(roof);
    for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), K3.glow('#FFE8A0')); win.position.set(sx * .81, 1.75, 1.2); win.rotation.y = sx * Math.PI / 2; loco.add(win); }
    const catcher = new THREE.Mesh(new THREE.ConeGeometry(.75, .7, 4), trim); catcher.rotation.set(Math.PI / 2, Math.PI / 4, 0); catcher.position.set(0, .45, -2.15); catcher.scale.z = .5; loco.add(catcher);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, .3, 4.2), dark); chassis.position.set(0, .55, -.3); loco.add(chassis);
    const wheels = [];
    for (const sx of [-.78, .78]) for (const z of [-1.4, -.4, .6, 1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(z === 1.4 ? .32 : .42, z === 1.4 ? .32 : .42, .14, 16), K3.mat('#5A5A66'));
      w.rotation.z = Math.PI / 2; w.position.set(sx, .45, z); loco.add(w); wheels.push(w);
      const hub = new THREE.Mesh(new THREE.BoxGeometry(.16, .5, .08), trim); hub.position.copy(w.position); hub.position.x += sx * .05; loco.add(hub); wheels.push(hub);
    }
    t.add(loco);
    const wagons = [];
    for (let i = 0; i < 2; i++) {
      const w = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, .9, 2.6), K3.mat(i ? th.wall : th.wall2)); bed.position.y = 1; w.add(bed);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.7, .12, 2.7), trim); rim.position.y = 1.48; w.add(rim);
      for (const sx of [-.78, .78]) for (const z of [-.8, .8]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .14, 14), K3.mat('#5A5A66')); wh.rotation.z = Math.PI / 2; wh.position.set(sx, .4, z); w.add(wh); wheels.push(wh); }
      if (i === 0) { const rider = K3.player(); rider.scale.setScalar(1.05); rider.position.set(0, 2.05, 0); w.add(rider); w.userData.rider = rider; }
      else for (let k = 0; k < 3; k++) { const crate = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), K3.mat('#B98446')); crate.position.set((k - 1) * .45, 1.7, (k % 2) * .4 - .2); w.add(crate); }
      w.position.z = 3.3 + i * 3; t.add(w); wagons.push(w);
    }
    t.userData = { loco, wagons, wheels, chimneyTop: new THREE.Vector3(0, 2.75, -1.3) };
    return t;
  }

  /* ---------- صف الأنفاق: تلّة واحدة فيها ثلاث فتحات، فوق كل فتحة لافتة ---------- */
  function spawnRow(z) {
    const th = K3.theme();
    const answers = mixAnswers(S.q, 3, S.collected).slice(0, 3);
    const lanes = shuffle([0, 1, 2]).slice(0, answers.length);
    const g = new THREE.Group();
    const hill = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 3), K3.mat(th.ground2, { flatShading: true }));
    hill.position.y = 2.75; g.add(hill);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 3, 24, 1, false, 0, Math.PI), K3.mat(th.ground2, { flatShading: true }));
    top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.y = 5.5; top.scale.set(.45, 1, 1); g.add(top);
    K3.scatter(g, th, { x0: -6.5, x1: 6.5, z0: -1, z1: 1, y: 5.6, count: 60 });
    const portals = [];
    [0, 1, 2].forEach(l => {
      const x = TR_X[l];
      const p = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.45, .32, 10, 24, Math.PI), K3.mat(th.dark ? '#3A4A80' : '#B9AE9C', { flatShading: true }));
      arch.position.y = 2.2; p.add(arch);
      for (const sx of [-1, 1]) { const col = new THREE.Mesh(new THREE.BoxGeometry(.5, 2.2, .6), K3.mat(th.dark ? '#3A4A80' : '#B9AE9C', { flatShading: true })); col.position.set(sx * 1.45, 1.1, 0); p.add(col); }
      const hole = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#0D0A08' })); hole.position.set(0, 2.2, .02); p.add(hole);
      const holeLow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ color: '#0D0A08' })); holeLow.position.set(0, 1.1, .02); p.add(holeLow);
      const ans = answers[lanes.indexOf(l)];
      if (ans) {
        const sign = K3.plate(ans.t, 2.8, .8, { px: 70 }); sign.position.set(0, 4.25, 1.62); p.add(sign);
        for (const sx of [-1, 1]) { const lt = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), K3.glow(th.gold)); lt.position.set(sx * 1.45, 2.55, .42); p.add(lt); }
      } else {
        for (let k = 0; k < 5; k++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(K3.rnd(.45, .7), 0), K3.mat('#8A7A6A', { flatShading: true })); rk.position.set(K3.rnd(-.8, .8), .4 + (k > 2 ? .7 : 0), .6); p.add(rk); }
      }
      /* حاجز يُنزل عند الخطأ */
      const bar = new THREE.Group();
      const boom = new THREE.Mesh(new THREE.BoxGeometry(2.8, .2, .14), K3.mat('#FFFFFF')); boom.position.x = 1.4; bar.add(boom);
      for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(.35, .21, .15), K3.mat('#C0392B')); st.position.x = .3 + k * .7; bar.add(st); }
      bar.position.set(-1.4, 1.3, 2); bar.rotation.z = Math.PI / 2 - .05; p.add(bar);
      p.position.set(x, 0, 1.52);
      g.add(p);
      portals.push({ lane: l, g: p, a: ans || null, bar, state: '' });
    });
    g.position.z = z;
    world.add(g);
    rows.push({ g, z, portals, q: S.q, done: false });
  }
  S.rows = () => rows;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    rows.filter(r => !r.done).forEach(r => { world.remove(r.g); r.dead = true; });
    rows = rows.filter(r => !r.dead);
    if (train) spawnRow(-34);
  };

  K3.controls(S, {
    dir(d) {
      if (d === 'left') P.lane = Math.max(0, P.lane - 1);
      if (d === 'right') P.lane = Math.min(2, P.lane + 1);
      if (d === 'left' || d === 'right') FX.play('tick');
    },
  });

  function enter(r) {
    r.done = true;
    if (r.q !== S.q || S.answered || Play.roundDone) return;
    const p = r.portals.find(p => p.lane === P.lane);
    const pos = new THREE.Vector3(TR_X[P.lane], 3, r.z + 1.5), pt = S.screen(pos);
    if (!p || !p.a) { P.stop = 1; FX.play('bad'); return; }
    if (p.a.ok) {
      p.state = 'good';
      K3.tint(p.g, '#4CAF50', .55);
      for (let i = 0; i < 18; i++) { const m = K3.starMesh(.18, i % 2 ? K3.theme().gold : '#FFFFFF', .06); m.position.copy(pos); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 4, K3.rnd(2, 6), K3.rnd(-1, 3)), life: 1 }); }
      S.collected.push(p.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1100 });
    } else {
      p.state = 'bad';
      p.drop = 0;
      K3.tint(p.g, '#C0392B', .45);
      S.missed = true;
      P.stop = 1.3;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }

  S.onFrame = dt => {
    if (!train) return;
    const live = S.started && !Play.finished;
    /* السرعة: تتوقف عند الحاجز ثم تعود */
    if (P.stop > 0) P.stop -= dt;
    const want = live ? (P.stop > 0 ? 0 : speed()) : 0;
    P.v += (want - P.v) * Math.min(1, dt * (P.stop > 0 ? 6 : 1.5));
    const v = P.v;
    /* القضبان: العوارض تتحرك وتعود */
    if (sleepers) {
      const m4 = new THREE.Matrix4();
      S.slOff = ((S.slOff || 0) + v * dt) % 1.2;
      let i = 0;
      TR_X.forEach(x => { for (let k = 0; k < 70; k++) { m4.makeTranslation(x, .17, 12 - k * 1.2 + S.slOff); sleepers.setMatrixAt(i++, m4); } });
      sleepers.instanceMatrix.needsUpdate = true;
    }
    deco.forEach(d => { d.position.z += v * dt; if (d.position.z > 14) d.position.z -= 132; });
    /* الأنفاق */
    rows.forEach(r => {
      r.z += v * dt; r.g.position.z = r.z;
      if (!r.done && r.z + 1.5 > -2.2) enter(r);
      r.portals.forEach(p => { if (p.state === 'bad' && p.drop < 1) { p.drop = Math.min(1, p.drop + dt * 4); p.bar.rotation.z = (Math.PI / 2 - .05) * (1 - p.drop); } if (p.state === 'bad' && P.stop <= 0 && p.drop >= 1) p.bar.rotation.z = Math.min(Math.PI / 2, p.bar.rotation.z + dt * 3); });
    });
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].z > 16) { world.remove(rows[i].g); rows.splice(i, 1); }
    if (live && S.q && !S.answered && !Play.roundDone) { const far = Math.min(0, ...rows.filter(r => r.q === S.q).map(r => r.z)); if (far > -30) spawnRow(far - 42); }
    /* تحويل السكة: القاطرة تنتقل أولًا والعربات تلحقها */
    P.x += (TR_X[P.lane] - P.x) * Math.min(1, dt * 5);
    const { loco, wagons, wheels } = train.userData;
    loco.position.x = P.x; loco.rotation.y = (P.x - TR_X[P.lane]) * .12;
    wagons.forEach((w, i) => { w.position.x += (loco.position.x - w.position.x) * Math.min(1, dt * (3.5 - i)); w.rotation.y = (w.position.x - loco.position.x) * -.1; });
    wheels.forEach(w => { w.rotation.x += v * dt / .4; });
    loco.position.y = Math.sin(S.t * 18) * .015 * Math.min(1, v / 5);
    if (wagons[0].userData.rider) wagons[0].userData.rider.userData.body.rotation.y += dt * 1.5;
    /* دخان المدخنة */
    if (live && Math.random() < dt * (6 + v * .6)) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#EDEDED', transparent: true, opacity: .75 }));
      m.position.set(loco.position.x, 2.8, -1.3); scene.add(m);
      smoke.push({ m, life: 1, v: new THREE.Vector3(K3.rnd(-.3, .3), 1.6, v * .9) });
    }
    smoke.forEach(s => { s.life -= dt * .7; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(1 + (1 - s.life) * 2.4); s.m.material.opacity = Math.max(0, s.life * .7); if (s.life <= 0) scene.remove(s.m); });
    smoke = smoke.filter(s => s.life > 0);
    bits.forEach(b => { b.life -= dt * 1.2; b.v.y -= 10 * dt; b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(Math.max(.01, b.life)); if (b.life <= 0) scene.remove(b.m); });
    bits = bits.filter(b => b.life > 0);
    camera.position.x += (P.x * .5 - camera.position.x) * Math.min(1, dt * 3);
    camera.lookAt(camera.position.x * .8, 1.2, -9);
  };
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !TRAIN || !TRAIN.wrap.isConnected) {
      if (TRAIN) TRAIN.wrap.remove();
      TRAIN = trainScene();
      Play.board.appendChild(TRAIN.wrap);
      TRAIN.size();
    }
    TRAIN.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(TRAIN.paint.el, TRAIN.wrap);
    K3.fonts.then(() => TRAIN.setQuestion(q));
  },
});
