/* المنجنيق والقلعة (ثلاثي الأبعاد) — منجنيق خشبي يرمي حجارة على أبراج من مكعبات، وكل برج يرفع علمًا عليه إجابة.
   يمين/يسار (أو السحب أفقيًا) يدير المنجنيق، والسحب إلى الأسفل يشدّ الذراع: كلما زاد السحب زادت القوة،
   ونقاط بيضاء ترسم مسار الحجر قبل الإفلات. على لوحة المفاتيح: المسافة اضغط مطوّلًا للشد ثم أفلت.
   إصابة برج الإجابة الصحيحة تُسقط مكعباته ويطير علمه (نقطة إن كان أول اختيار)، والخاطئ يحمرّ ويرتد الحجر ويُنقص قلبًا.
   الشكل يتبع قالب الشكل. */
'use strict';

let CATA = null;
const CP = { g: 14, base: new THREE.Vector3(0, 0, 6.6) };

function catapultScene() {
  const S = K3.create({ fov: 50, fogNear: 34, fogFar: 95, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  const field = new THREE.Group();
  scene.add(field);
  let towers = [], blocks = [], stone = null, cat = null, dots = [], dust = [], decor = [];
  const A = { yaw: 0, power: 0, pulling: false, sx: 0, sy: 0, yaw0: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  camera.position.set(0, 7, 15.6);
  camera.lookAt(0, .2, -4);

  S.onTheme = th => {
    K3.clear(field);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), K3.mat(th.ground, { map: K3.groundTexture(th, 30) }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -10; field.add(ground);
    /* ممر ترابي من المنجنيق نحو الأبراج، وسور حجري منخفض خلف الأبراج */
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 22), K3.mat(th.path, { transparent: true, opacity: .7 })); path.rotation.x = -Math.PI / 2; path.position.set(0, .01, 0); field.add(path);
    for (let x = -16; x <= 16; x += 2) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, .8), K3.mat(th.dark ? '#3A4A80' : '#9C8F80', { flatShading: true })); st.position.set(x, .55, -34); field.add(st); }
    K3.scatter(field, th, { x0: -30, x1: 30, z0: -35, z1: 16, count: 700, avoid: (x, z) => Math.abs(x) < 2.2 && z > -10 });
    for (let i = 0; i < 26; i++) { const a = Math.PI * (1 + i / 25), r = K3.rnd(24, 34); const p = K3.prop(th, K3.rnd(1.6, 2.6)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 8); field.add(p); }
    for (let i = 0; i < 8; i++) { const p = K3.prop(th, K3.rnd(1, 1.6)); p.position.set((i % 2 ? 1 : -1) * K3.rnd(7, 14), 0, K3.rnd(-4, 12)); field.add(p); }
    K3.horizon(S, th, { radius: 80 });
    K3.weather(S, th, { w: 24, h: 14, d: 40, cz: -8 });
    if (cat) scene.remove(cat);
    cat = makeCatapult(th);
    scene.add(cat);
    for (const d of dots) scene.remove(d);
    dots = [];
    for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), K3.glow(K3.aimColor(th), { transparent: true, opacity: .85 })); d.visible = false; scene.add(d); dots.push(d); }
    if (S.q) buildTowers(towers.map(t => ({ a: t.a, state: t.state })));
  };

  /* ---------- المنجنيق: قاعدة وعجلات وذراع بسلّة ---------- */
  function makeCatapult(th) {
    const g = new THREE.Group(), wood = K3.mat('#8A5A30'), dark = K3.mat('#6B4A2E');
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, 3), wood); rail.position.set(sx * .9, .55, 0); g.add(rail);
      for (const z of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .2, 16), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 1.15, .45, z); g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .24, 8), K3.mat(th.gold)); hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); g.add(hub); }
      const up = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.6, .25), wood); up.position.set(sx * .9, 1.4, .2); g.add(up);
    }
    for (const z of [-1.2, 1.2]) { const cross = new THREE.Mesh(new THREE.BoxGeometry(2.1, .22, .22), wood); cross.position.set(0, .55, z); g.add(cross); }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 2, 10), K3.mat('#5A5A66')); axle.rotation.z = Math.PI / 2; axle.position.set(0, 2.1, .2); g.add(axle);
    const stop = new THREE.Mesh(new THREE.BoxGeometry(1.9, .25, .25), K3.mat(th.accent)); stop.position.set(0, 2.25, -.5); g.add(stop);
    const arm = new THREE.Group(); arm.position.set(0, 2.1, .2); g.add(arm);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.22, .22, 3.2), wood); beam.position.z = 1.1; arm.add(beam);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark); cup.rotation.x = Math.PI; cup.position.set(0, .2, 2.6); arm.add(cup);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .7), K3.mat('#5A5A66')); cw.position.set(0, -.3, -.6); arm.add(cw);
    for (const sx of [-1, 1]) { const brace = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.9, .14), wood); brace.position.set(sx * .9, 1.25, -.6); brace.rotation.x = .55; g.add(brace); }
    for (const sx of [-1, 1]) for (const z of [-1.3, 1.3]) { const plate = new THREE.Mesh(new THREE.BoxGeometry(.34, .34, .06), K3.mat('#5A5A66')); plate.position.set(sx * .9, .55, z); g.add(plate); }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(.14, .04, 6, 12), K3.mat('#C9A96A')); rope.rotation.y = Math.PI / 2; rope.position.set(0, 2.1, .2); g.add(rope);
    for (let i = 0; i < 6; i++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(.3, 0), K3.mat('#7A7484', { flatShading: true })); rk.position.set(1.9 + (i % 3) * .5, .25 + (i > 2 ? .4 : 0), .6 + (i % 2) * .4); g.add(rk); }
    g.userData.arm = arm; g.userData.cup = cup;
    g.position.copy(CP.base);
    return g;
  }

  /* ---------- الأبراج: مكعبات بنقش القالب وعلم الإجابة ---------- */
  function buildTowers(keep) {
    const th = K3.theme();
    towers.forEach(t => { field.remove(t.flag); t.blocks.forEach(b => field.remove(b.m)); });
    decor.forEach(d => field.remove(d)); decor = [];
    blocks = []; towers = [];
    const list = keep && keep.length ? keep : mixAnswers(S.q).map(a => ({ a }));
    const n = list.length;
    {
      const rowsN = Math.ceil(n / Math.min(6, Math.ceil(n / Math.ceil(n / 6))));
      camera.position.set(0, 7 + (rowsN - 1) * 2.2, 15.6 + (rowsN - 1) * .8);
      camera.lookAt(0, .2 + (rowsN - 1) * 1.5, -4 - (rowsN - 1) * 3);
    }
    list.forEach((it, k) => {
      /* كل الإجابات أبراجٌ: حتى ستة في الصف، والصفوف الخلفية بين فراغات الأمامية فلا يحجب برجٌ برجًا */
      const per = Math.min(6, Math.ceil(n / Math.ceil(n / 6))), row = Math.floor(k / per), col = k % per, inRow = Math.min(per, n - row * per);
      const x = (col - (inRow - 1) / 2) * 5 + (row % 2 ? 2.5 : 0), z = -10 - row * 7.5 - (n <= 4 ? (k % 2) * 3 : 0) + K3.rnd(-.4, .4);
      const levels = 3 + Math.floor(Math.random() * 2), tb = [];
      const cols = [th.wall, th.wall2, th.accent];
      for (let l = 0; l < levels; l++) for (let i = 0; i < (l === levels - 1 ? 1 : 2); i++) {
        const w = l === levels - 1 ? 1.1 : .95;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, .9, w), K3.mat(cols[(l + i) % 3], { flatShading: true }));
        const bx = x + (l === levels - 1 ? 0 : (i ? .5 : -.5)), by = .45 + l * .9;
        m.position.set(bx, by, z);
        field.add(m);
        const slit = new THREE.Mesh(new THREE.PlaneGeometry(.14, .42), K3.mat('#2A1E14')); slit.position.set(0, .05, w / 2 + .01); m.add(slit);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(.3, .06, .08), K3.mat(th.gold)); sill.position.set(0, -.2, w / 2 + .03); m.add(sill);
        const seam = new THREE.Mesh(new THREE.BoxGeometry(w + .02, .05, w + .02), K3.mat('#000000', { transparent: true, opacity: .18 })); seam.position.y = .43; m.add(seam);
        if (l === 0 && i === 0) { const door = new THREE.Mesh(new THREE.PlaneGeometry(.42, .62), K3.mat('#6B4A2E')); door.position.set(.47, -.13, w / 2 + .012); m.add(door); const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 4), K3.mat(th.gold)); knob.position.set(.6, -.13, w / 2 + .03); m.add(knob); }
        if (l === levels - 1) for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cr = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), K3.mat(cols[(l + 1) % 3], { flatShading: true })); cr.position.set(cx * (w / 2 - .15), .6, cz * (w / 2 - .15)); m.add(cr); }
        const b = { m, v: new THREE.Vector3(), spin: new THREE.Vector3(), falling: false, rest: m.position.clone() };
        tb.push(b); blocks.push(b);
      }
      const top = .9 * levels;
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, .16, 10), K3.mat(th.dark ? '#3A4A80' : '#9C8F80', { flatShading: true })); plinth.position.set(x, .02, z); field.add(plinth);
      const target = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.95, 32), K3.glow(th.gold, { transparent: true, opacity: .5 })); target.rotation.x = -Math.PI / 2; target.position.set(x, .04, z); field.add(target);
      decor.push(plinth, target);
      const flag = new THREE.Group();
      /* العمود خلف اللافتة، والراية في أعلاه فوق اللافتة، فلا يغطي شيء الكتابة */
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.7, 8), K3.mat("#5A4632")); pole.position.set(0, 1.85, -.18); flag.add(pole);
      const sign = K3.plate(it.a.t, 3.1, 1, { px: 76 }); sign.position.set(0, 1.55, .2); sign.renderOrder = 3; flag.add(sign);
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.25, sign.geometry.parameters.height + .16, .08), K3.mat("#8A5A30")); board.position.set(0, 1.55, .1); flag.add(board);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), K3.mat(th.gold)); ball.position.set(0, 3.75, -.18); flag.add(ball);
      const pen = new THREE.Mesh(new THREE.ConeGeometry(.24, .8, 3), K3.mat(th.accent, { flatShading: true })); pen.rotation.z = -Math.PI / 2; pen.position.set(.42, 3.45, -.18); flag.add(pen); flag.userData.pen = pen;
      /* أعلام الصفوف الخلفية على أعمدة أطول، فتظهر لافتاتها فوق لافتات الصف الأمامي */
      const ext = row * 1.8;
      if (ext) { const ep = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, ext, 8), K3.mat("#5A4632")); ep.position.set(0, -ext / 2 + .02, -.18); flag.add(ep); }
      flag.position.set(x, top + ext, z);
      field.add(flag);
      towers.push({ a: it.a, x, z, top, ext, blocks: tb, flag, sign, state: it.state || '', fly: 0 });
    });
  }
  S.towers = () => towers;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    buildTowers();
  };

  /* ---------- الرمي: سرعة البداية من القوة والاتجاه ---------- */
  const launchVel = () => {
    const sp = 8 + A.power * 17;
    return new THREE.Vector3(-Math.sin(A.yaw) * Math.cos(.75) * sp, Math.sin(.75) * sp, -Math.cos(A.yaw) * Math.cos(.75) * sp);
  };
  const cupPos = () => new THREE.Vector3(CP.base.x, 2.6, CP.base.z - .6);
  S.fire = () => {
    if (stone || S.answered || Play.roundDone) return;
    stone = { m: new THREE.Mesh(new THREE.DodecahedronGeometry(.42, 1), K3.mat('#7A7484', { flatShading: true })), v: launchVel(), t: 0, done: false };
    stone.m.position.copy(cupPos());
    scene.add(stone.m);
    A.release = 1; A.power = 0; A.pulling = false;
    dots.forEach(d => { d.visible = false; });
    FX.play('shoot');
  };
  S.aim = (yaw, power) => { A.yaw = yaw; A.power = power; A.pulling = true; };

  /* التحكم باللمس والفأرة: سحب أفقي للاتجاه، وسحب للأسفل للقوة، والإفلات يرمي */
  S.cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!S.started) { S.begin(); return; }
    if (stone) return;
    A.pulling = true; A.sx = e.clientX; A.sy = e.clientY; A.yaw0 = A.yaw;
    try { S.cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  S.cv.addEventListener('pointermove', e => {
    if (!A.pulling || stone) return;
    A.yaw = Math.max(-.7, Math.min(.7, A.yaw0 - (e.clientX - A.sx) * .004));
    A.power = Math.max(0, Math.min(1, (e.clientY - A.sy) / 180));
  });
  S.cv.addEventListener('pointerup', () => { if (A.pulling && A.power > .05) S.fire(); A.pulling = false; });
  /* لوحة المفاتيح */
  let charging = false;
  document.addEventListener('keydown', e => {
    if (!S.wrap.isConnected || !S.started || stone) return;
    if (e.code === 'ArrowLeft') A.yaw = Math.min(.7, A.yaw + .05);
    if (e.code === 'ArrowRight') A.yaw = Math.max(-.7, A.yaw - .05);
    if (e.code === 'Space' && !charging) { charging = true; A.pulling = true; A.power = 0; e.preventDefault(); }
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space' && charging) { charging = false; if (S.wrap.isConnected) S.fire(); } });

  /* ---------- الإصابة ---------- */
  function hitTower(t, pos) {
    const pt = S.screen(pos.clone().add(new THREE.Vector3(0, 1, 0)));
    if (t.state || S.answered || Play.roundDone) return;
    if (t.a.ok) {
      t.state = 'good';
      t.blocks.forEach((b, i) => { b.falling = true; b.v.set(K3.rnd(-3, 3), K3.rnd(2, 6), K3.rnd(-4, 1)); b.spin.set(K3.rnd(-4, 4), K3.rnd(-4, 4), K3.rnd(-4, 4)); });
      t.fly = .01;
      K3.tint(t.flag, '#4CAF50', .6);
      S.collected.push(t.a.t);
      if (S.paint) S.paint(S.collected.length);
      FX.play('boom');
      if (S.collected.length < S.need) { FX.burst(pt, { count: 16 }); FX.floatText(pt, '✓'); return; }
      S.answered = true;
      FX.burst(pt, { count: 30 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1600 });
    } else {
      t.state = 'bad';
      t.shake = .6;
      K3.tint(t.flag, '#C0392B', .7);
      t.blocks.forEach(b => K3.tint(b.m, '#C0392B', .35));
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }
  function puff(pos) {
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(K3.rnd(.25, .45), 8, 6), new THREE.MeshBasicMaterial({ color: '#D9C9A8', transparent: true, opacity: .7 }));
      m.position.copy(pos); scene.add(m);
      const a = Math.random() * 6.28; dust.push({ m, v: new THREE.Vector3(Math.cos(a) * 2, K3.rnd(.8, 2), Math.sin(a) * 2), life: 1 });
    }
  }

  S.onFrame = dt => {
    /* المنجنيق: الاتجاه، وشدّ الذراع، والإفلات */
    if (cat) {
      cat.rotation.y += (A.yaw - cat.rotation.y) * Math.min(1, dt * 10);
      const arm = cat.userData.arm;
      if (charging) A.power = Math.min(1, A.power + dt * .8);
      if (A.release > 0) { A.release = Math.max(0, A.release - dt * 3); arm.rotation.x = -1.1 * Math.sin((1 - A.release) * Math.PI * .5) * (A.release > 0 ? 1 : 0); }
      else arm.rotation.x += ((A.pulling ? .2 + A.power * .7 : .2) - arm.rotation.x) * Math.min(1, dt * 10);
    }
    /* نقاط المسار المتوقع أثناء الشد */
    const show = A.pulling && !stone && A.power > .02;
    if (show) {
      const v = launchVel(), p = cupPos();
      dots.forEach((d, i) => { const t = (i + 1) * .09; d.position.set(p.x + v.x * t, p.y + v.y * t - .5 * CP.g * t * t, p.z + v.z * t); d.visible = d.position.y > 0; d.material.opacity = .9 - i * .045; });
    } else dots.forEach(d => { d.visible = false; });
    /* الحجر: قذيفة بالجاذبية، يصطدم بالأبراج أو الأرض */
    if (stone) {
      stone.t += dt;
      stone.v.y -= CP.g * dt;
      stone.m.position.addScaledVector(stone.v, dt);
      stone.m.rotation.x += dt * 6; stone.m.rotation.y += dt * 4;
      const p = stone.m.position;
      if (!stone.done) {
        const t = towers.find(t => Math.abs(p.x - t.x) < 1.2 && Math.abs(p.z - t.z) < 1.2 && p.y < t.top + 1.4);
        if (t) {
          stone.done = true;
          hitTower(t, p.clone());
          if (t.a.ok) { stone.v.multiplyScalar(.3); } else { stone.v.set(-stone.v.x * .3, 4, -stone.v.z * .35); }
        }
      }
      if (p.y < .42) {
        if (!stone.done) { stone.done = true; puff(p.clone()); FX.play('tick'); }
        p.y = .42; stone.v.y = Math.abs(stone.v.y) * .3; stone.v.x *= .6; stone.v.z *= .6;
      }
      if (stone.t > 3.2) { scene.remove(stone.m); stone = null; }
    }
    /* المكعبات المتساقطة: جاذبية ودوران وارتداد على الأرض */
    blocks.forEach(b => {
      if (!b.falling) return;
      b.v.y -= CP.g * dt;
      b.m.position.addScaledVector(b.v, dt);
      b.m.rotation.x += b.spin.x * dt; b.m.rotation.y += b.spin.y * dt; b.m.rotation.z += b.spin.z * dt;
      if (b.m.position.y < .45) { b.m.position.y = .45; b.v.y = Math.abs(b.v.y) * .25; b.v.x *= .7; b.v.z *= .7; b.spin.multiplyScalar(.6); if (Math.abs(b.v.y) < .5) b.v.y = 0; }
    });
    towers.forEach(t => {
      if (t.fly) { t.fly += dt; t.flag.position.y = t.top + (t.ext || 0) + t.fly * 4; t.flag.rotation.y += dt * 5; t.flag.scale.setScalar(Math.max(.01, 1 - Math.max(0, t.fly - 1) * 1.5)); }
      if (t.shake > 0) { t.shake -= dt; const o = Math.sin(S.t * 60) * .06 * t.shake; t.blocks.forEach(b => { b.m.position.x = b.rest.x + o; }); }
      if (!t.fly) t.flag.userData.pen.rotation.x = Math.sin(S.t * 3 + t.x) * .35;
    });
    dust.forEach(d => { d.life -= dt * 1.2; d.m.position.addScaledVector(d.v, dt); d.m.scale.setScalar(1 + (1 - d.life) * 1.5); d.m.material.opacity = Math.max(0, d.life * .7); if (d.life <= 0) scene.remove(d.m); });
    dust = dust.filter(d => d.life > 0);
  };
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !CATA || !CATA.wrap.isConnected) {
      if (CATA) CATA.wrap.remove();
      CATA = catapultScene();
      Play.board.appendChild(CATA.wrap);
      CATA.size();
    }
    CATA.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(CATA.wrap, CATA.paint.el);
    K3.fonts.then(() => CATA.setQuestion(q));
  },
});
