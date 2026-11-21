/* التزلّج على المنحدر (ثلاثي الأبعاد) — كرة تنزلق على منحدر طويل بين الأعلام والأشجار.
   الحركة يمينًا ويسارًا حرة (بالأسهم أو بعصا التحكم)، أعلى = قفزة، أسفل = انحناء يزيد السرعة.
   على المنحدر بوابات من علمين وبينهما لافتة الإجابة: العبور من بوابة الصحيحة نقطة (إن كانت أول اختيار)،
   والخاطئة تنكسر أعلامها وتُنقص قلبًا. مطبّات ترمي الكرة في الهواء، وصخور تبطئها إن اصطدمت بها.
   المشهد يبقى بين الأسئلة. الشكل يتبع قالب الشكل. */
'use strict';

let SKI = null;
const SKI_W = 8.5;          // نصف عرض المنحدر

function skiScene() {
  const S = K3.create({ fov: 58, fogNear: 28, fogFar: 75, ratio: .62 });
  const { scene, camera } = S;
  let slope = null;                         // كل شيء على المنحدر داخل مجموعة مائلة (تُبنى مع القالب)
  const joy = K3.joystick(S);
  const items = [];                          // بوابات وصخور ومطبّات وزينة تتحرك نحو الكرة
  let ground, groundTex, ball, shadow, trail = [];
  const P = S.P = { x: 0, y: 0, vy: 0, vx: 0, tuck: 0, stumble: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const speed = () => (8 + Play.cfg.speed * 1.4) * (P.tuck > 0 ? 1.35 : 1) * (P.stumble > 0 ? .45 : 1);

  camera.position.set(0, 4.6, 7.2);

  S.onTheme = th => {
    slope = new THREE.Group();
    slope.rotation.x = .2;
    S.env.add(slope);
    items.length = 0;
    trail = [];
    groundTex = K3.groundTexture(th, 10);
    groundTex.repeat.set(4, 30);
    ground = new THREE.Mesh(new THREE.PlaneGeometry(SKI_W * 2 + 2, 180), K3.mat(th.ground, { map: groundTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -80;
    slope.add(ground);
    /* أطراف المنحدر: أرض أغمق على الجانبين */
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(40, 180), K3.mat(th.ground2));
      side.rotation.x = -Math.PI / 2; side.position.set(sx * (SKI_W + 21), -.05, -80);
      slope.add(side);
      const rope = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 180), K3.mat(th.accent));
      rope.position.set(sx * (SKI_W + .9), .6, -80); slope.add(rope);
    }
    K3.horizon(S, th, { radius: 85, y: 6 });
    K3.weather(S, th, { w: 20, h: 14, d: 50, cz: -20 });
    for (let z = -6; z > -90; z -= 6) addSide(z);
    ball = K3.player();
    shadow = K3.blob(.55, .3);
    slope.add(ball, shadow);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 4), new THREE.MeshBasicMaterial({ color: th.dark ? '#9DB3D9' : '#FFFFFF', transparent: true, opacity: 0 }));
      slope.add(m); trail.push({ m, life: 0 });
    }
    if (S.q && !S.answered) spawnRow(-42);
  };
  /* ---------- قطع المنحدر ---------- */
  function addSide(z) {
    const th = K3.theme();
    for (const sx of [-1, 1]) {
      const p = K3.prop(th, K3.rnd(1.2, 1.8));
      p.position.set(sx * K3.rnd(SKI_W + 2.5, SKI_W + 9), 0, z + K3.rnd(-2, 2));
      p.rotation.y = Math.random() * 6;
      slope.add(p);
      items.push({ g: p, kind: 'deco', z: p.position.z });
      const t = K3.tuftPatch(th, 6);
      t.position.set(sx * K3.rnd(SKI_W + 1.3, SKI_W + 3), 0, z + K3.rnd(-3, 3));
      slope.add(t);
      items.push({ g: t, kind: 'deco', z: t.position.z, near: true });
    }
  }
  function flag(color) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 8), K3.mat('#FFFFFF'));
    pole.position.y = 1.1; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(.75, .5, 4, 1), K3.mat(color, { side: THREE.DoubleSide }));
    cloth.position.set(.38, 1.9, 0); g.add(cloth);
    g.userData.cloth = cloth;
    return g;
  }
  function gate(a, x, th) {
    const g = new THREE.Group();
    g.position.x = x;
    const fl = [flag(th.accent), flag(th.accent)];
    fl[0].position.x = -1.65; fl[1].position.x = 1.65; fl[1].scale.x = -1;
    g.add(...fl);
    const banner = K3.plate(a.t, 3.2, .9, { px: 72 });
    banner.position.y = 2.85;
    g.add(banner);
    const cord = new THREE.Mesh(new THREE.BoxGeometry(3.3, .05, .05), K3.mat(th.wall2)); cord.position.y = 2.15; g.add(cord);
    g.userData = { a, flags: fl };
    return g;
  }
  function spawnRow(z = -60) {
    const th = K3.theme();
    const answers = mixAnswers(S.q, 3, S.collected).slice(0, 3);
    /* مواضع متباعدة عبر عرض المنحدر */
    const slots = shuffle([-6, -2, 2, 6]).slice(0, answers.length).sort((a, b) => a - b);
    const row = { kind: 'row', z, q: S.q, gates: [], done: false, g: new THREE.Group() };
    answers.forEach((a, k) => { const gt = gate(a, slots[k] + K3.rnd(-.4, .4), th); row.g.add(gt); row.gates.push(gt); });
    row.g.position.z = z;
    slope.add(row.g);
    items.push(row);
    /* بين الصفوف: مطبّ وصخرة */
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, .6, 2.2), K3.mat(th.wall, { flatShading: true }));
    ramp.geometry.translate(0, .3, 0);
    const rp = ramp.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) if (rp.getZ(i) > 0) rp.setY(i, 0);
    ramp.geometry.computeVertexNormals();
    const rx = K3.rnd(-SKI_W + 2, SKI_W - 2);
    const rg = new THREE.Group(); rg.add(ramp);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.64, .1, .14), K3.mat(th.gold)); edge.position.set(0, .62, -1.1); rg.add(edge);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.12, .66, 2.24), K3.mat(th.wall2)); st.position.set(sx * 1.3, .3, 0); st.geometry.translate(0, 0, 0); rg.add(st); }
    rg.position.set(rx, 0, z + 18);
    slope.add(rg);
    items.push({ kind: 'ramp', g: rg, z: z + 18, x: rx, done: false });
    const sx = rx > 0 ? K3.rnd(-SKI_W + 1.5, -1) : K3.rnd(1, SKI_W - 1.5);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.6, 0), K3.mat(th.dark ? '#3A3570' : '#9C8A70', { flatShading: true }));
    rock.position.set(sx, .35, z + 10); rock.scale.y = .7;
    slope.add(rock);
    items.push({ kind: 'rock', g: rock, z: z + 10, x: sx, done: false });
    /* عوائق أكثر: صخور وأشجار على المنحدر، وجذع ساقط يُقفز فوقه */
    const obstacle = (kind, x, oz) => {
      let g;
      if (kind === 'tree') { g = K3.prop(th, 1.1); }
      else { g = new THREE.Mesh(new THREE.DodecahedronGeometry(K3.rnd(.5, .75), 0), K3.mat(th.dark ? '#3A3570' : '#9C8A70', { flatShading: true })); g.position.y = .35; g.scale.y = .7; }
      g.position.x = x; g.position.z = oz;
      slope.add(g);
      items.push({ kind: kind === 'tree' ? 'rock' : 'rock', g, z: oz, x, done: false, w: kind === 'tree' ? 1.1 : 1 });
    };
    for (const oz of [z + 5, z + 15, z + 27]) {
      const n = 1 + (Math.random() < .5 ? 1 : 0);
      for (let i = 0; i < n; i++) obstacle(Math.random() < .4 ? 'tree' : 'rock', K3.rnd(-SKI_W + 1, SKI_W - 1), oz + K3.rnd(-1.5, 1.5));
    }
    const lx = K3.rnd(-SKI_W + 3.5, SKI_W - 3.5), log = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, 6, 10), K3.mat('#8A5A30', { flatShading: true }));
    trunk.rotation.z = Math.PI / 2; trunk.position.y = .3; log.add(trunk);
    for (const ex of [-3, 3]) { const end = new THREE.Mesh(new THREE.CircleGeometry(.29, 12), K3.mat('#D9B98A')); end.position.set(ex, .3, 0); end.rotation.y = ex > 0 ? Math.PI / 2 : -Math.PI / 2; log.add(end); }
    const snow = new THREE.Mesh(new THREE.BoxGeometry(5.4, .08, .3), K3.mat(th.deco === 'pines' || th.deco === 'crystals' ? '#FFFFFF' : th.ground2)); snow.position.y = .6; log.add(snow);
    log.position.set(lx, 0, z + 21);
    slope.add(log);
    items.push({ kind: 'log', g: log, z: z + 21, x: lx, done: false });
  }
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    if (!slope) return;
    items.filter(it => it.kind === 'row' && !it.done).forEach(it => { slope.remove(it.g); it.dead = true; });
    spawnRow(-42);
  };

  const jump = () => { if (P.y <= .01) { P.vy = 7.5; FX.play('tick'); } };
  K3.controls(S, {
    hold: joy.hold,
    dir(d, repeat, swipe) { if (d === 'up') jump(); if (d === 'down') P.tuck = 1; },
    tap() { jump(); },
  });

  function passRow(row) {
    row.done = true;
    if (row.q !== S.q || S.answered || Play.roundDone) return;
    const gt = row.gates.find(g => Math.abs(g.position.x - P.x) < 1.65);
    if (!gt) { spawnRow(); return; }
    const a = gt.userData.a, wp = new THREE.Vector3(gt.position.x, 2.6, 0);
    row.g.localToWorld(wp);
    if (a.ok) {
      K3.tint(gt, '#4CAF50', .7);
      S.collected.push(a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, wp, true, '✓'); FX.play('good'); spawnRow(); return; }
      S.answered = true;
      K3.burstAt(S, wp, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 900 });
    } else {
      K3.tint(gt, '#C0392B', .7);
      gt.userData.flags.forEach((f, i) => { f.userData.fall = i ? 1 : -1; });
      S.missed = true;
      K3.burstAt(S, wp, false);
      FX.play('bad');
      if (!Play.mistake()) spawnRow();
    }
  }

  S.onFrame = dt => {
    if (!slope) return;
    const live = S.started && !Play.finished;
    const v = live ? speed() : 0;
    P.tuck = Math.max(0, P.tuck - dt);
    P.stumble = Math.max(0, P.stumble - dt);
    const inp = live ? joy.read() : { x: 0, z: 0 };
    if (inp.z > .5) P.tuck = .2;
    if (inp.z < -.6 && joy.active) jump();
    P.vx += (inp.x * 9 - P.vx) * Math.min(1, dt * 6);
    P.x = Math.max(-SKI_W + .6, Math.min(SKI_W - .6, P.x + P.vx * dt));
    if (P.y > 0 || P.vy > 0) { P.vy -= 20 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0; }
    if (ball) {
      const sq = P.tuck > 0 ? .8 : 1;
      ball.position.set(P.x, .55 * sq + P.y, 0);
      ball.scale.set(1.1 / Math.sqrt(sq), sq * 1.1, 1.1 / Math.sqrt(sq));
      ball.rotation.z = -P.vx * .05;
      ball.userData.body.rotation.y += dt * (2 + v * .2);
      shadow.position.set(P.x, .02, 0);
      shadow.scale.setScalar(1 - Math.min(.6, P.y / 5));
    }
    if (groundTex) groundTex.offset.y += v * dt / 6;
    /* أثر ثلج/رمل خلف الكرة */
    if (v > 0 && P.y < .05) {
      const t = trail.find(t => t.life <= 0);
      if (t) { t.m.position.set(P.x + K3.rnd(-.3, .3), .1, .4); t.life = 1; }
    }
    trail.forEach(t => { if (t.life <= 0) { t.m.material.opacity = 0; return; } t.life -= dt * 1.6; t.m.position.z += v * dt; t.m.position.y += dt * .4; t.m.scale.setScalar(1 + (1 - t.life) * 2); t.m.material.opacity = t.life * .7; });
    let farthest = 0;
    items.forEach(it => {
      if (it.dead) return;
      it.z += v * dt;
      it.g.position.z = it.z;
      if (it.kind === 'deco') { if (it.z > 10) { it.z -= 90; it.g.position.x = Math.sign(it.g.position.x) * (it.near ? K3.rnd(SKI_W + 1.3, SKI_W + 3) : K3.rnd(SKI_W + 2.5, SKI_W + 9)); } return; }
      farthest = Math.min(farthest, it.z);
      if (it.kind === 'row') {
        it.gates.forEach(g => g.userData.flags.forEach(f => {
          f.userData.cloth.rotation.y = Math.sin(S.t * 6 + g.position.x) * .3;
          if (f.userData.fall) f.rotation.z = Math.max(-1.4, Math.min(1.4, f.rotation.z + f.userData.fall * dt * 3));
        }));
        if (!it.done && it.z >= 0) passRow(it);
      } else if (!it.done && it.z >= -.4) {
        it.done = true;
        if (it.kind === 'ramp' && Math.abs(it.x - P.x) < 1.6 && P.y < .3) { P.vy = 9.5; FX.play('good'); }
        if (((it.kind === 'rock' && Math.abs(it.x - P.x) < (it.w || 1)) || (it.kind === 'log' && Math.abs(it.x - P.x) < 3.2)) && P.y < .5) { P.stumble = .6; FX.play('bad'); Play.board.classList.remove('shake'); void Play.board.offsetWidth; Play.board.classList.add('shake'); }
      }
    });
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.kind !== 'deco' && (it.dead || it.z > 14)) { slope.remove(it.g); items.splice(i, 1); } }
    if (live && S.q && !S.answered && !Play.roundDone && !items.some(it => it.kind === 'row' && !it.done && !it.dead && it.q === S.q)) spawnRow(Math.min(-40, farthest - 22));
    camera.position.x += (P.x * .6 - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y += (4.6 + P.y * .3 - camera.position.y) * Math.min(1, dt * 4);
    camera.lookAt(camera.position.x * .7, 1.2, -8);
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
    if (i === 0 || !SKI || !SKI.wrap.isConnected) {
      if (SKI) SKI.wrap.remove();
      SKI = skiScene();
      Play.board.appendChild(SKI.wrap);
      SKI.size();
    }
    SKI.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(SKI.paint.el, SKI.wrap);
    K3.fonts.then(() => SKI.setQuestion(q));
  },
});
