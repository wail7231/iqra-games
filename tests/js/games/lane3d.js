/* الممر الجاري (ثلاثي الأبعاد) — كرة تجري للأمام في ممر من ثلاث حارات، وتأتي نحوها بوابات متتابعة:
   كل بوابة تحمل إجابة واحدة في حارة عشوائية، وتتكرر الإجابات بترتيب مخلوط حتى يُعبر من الصحيحة
   (تجاوز البوابة بتغيير الحارة بلا عقوبة). يمين/يسار = تبديل الحارة، أعلى = قفزة فوق الحاجز المنخفض، أسفل = انخفاض تحت العارضة.
   العبور من بوابة الصحيحة نقطة (إن كانت أول اختيار)، والخاطئة تنهار وتُنقص قلبًا.
   المشهد يبقى بين الأسئلة فتستمر الكرة في الجري. الشكل يتبع قالب الشكل. */
'use strict';

const LANE_X = [-2.3, 0, 2.3];
let LANE = null;

function laneScene() {
  const S = K3.create({ fov: 55, fogNear: 26, fogFar: 70 });
  const { scene, camera } = S;
  const rows = [];                      // صفوف البوابات والحواجز القادمة
  const side = [];                      // زينة جانبي الطريق (تتحرك وتعود)
  const P = S.P = { lane: 1, x: 0, y: 0, vy: 0, duck: 0, stumble: 0 };
  S.rows = () => rows;
  let road, stripes, ball, shadow;
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false; S.gap = 0;
  const speed = () => 7 + Play.cfg.speed * 1.5;

  camera.position.set(0, 3.4, 6.6);
  camera.lookAt(0, 1, -7);

  S.onTheme = th => {
    /* الطريق: أرض واسعة وممر بحافتين ونقوش متحركة */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 160), K3.mat(th.ground, { map: K3.groundTexture(th, 24) }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.02, -50);
    S.env.add(ground);
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = th.path; g.fillRect(0, 0, 256, 256);
    g.fillStyle = th.sketch ? '#2B4C7E' : 'rgba(0,0,0,.08)';
    [85, 171].forEach(x => { for (let y = 0; y < 256; y += 64) g.fillRect(x - 3, y, 6, 36); });
    g.fillStyle = th.accent; g.fillRect(0, 0, 10, 256); g.fillRect(246, 0, 10, 256);
    const tex = K3.texture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 14);
    road = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 120), K3.mat('#FFFFFF', { map: tex }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -50);
    S.env.add(road);
    stripes = tex;
    for (const sx of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(.35, .3, 120), K3.mat(th.wall2));
      curb.position.set(sx * 3.85, .15, -50); S.env.add(curb);
    }
    side.length = 0;
    for (let i = 0; i < 18; i++) {
      const p = K3.prop(th, K3.rnd(.9, 1.3));
      const sx = i % 2 ? 1 : -1;
      p.position.set(sx * K3.rnd(5.2, 9), 0, -i * 6.5 + K3.rnd(-1, 1));
      p.rotation.y = Math.random() * 6;
      S.env.add(p); side.push(p);
    }
    for (let i = 0; i < 26; i++) {
      const p = K3.tuftPatch(th, 7), sx = i % 2 ? 1 : -1;
      p.position.set(sx * K3.rnd(4.3, 6.5), 0, -i * 4.5);
      S.env.add(p); side.push(p);
    }
    K3.horizon(S, th, { radius: 75 });
    K3.weather(S, th, { w: 18, h: 12, d: 60, cz: -25 });
    /* اللاعب */
    if (ball) scene.remove(ball, shadow);
    ball = K3.player();
    ball.position.set(P.x, .55, 0);
    shadow = K3.blob(.55);
    scene.add(ball, shadow);
    /* البوابات الموجودة تُعاد بألوان القالب الجديد */
    rows.splice(0).forEach(r => scene.remove(r.g));
    if (S.q && !S.answered) { queue = []; S.spawnRow(-34); }
  };

  /* ---------- البوابات ---------- */
  function gate(a, th) {
    const g = new THREE.Group();
    const postM = K3.mat(th.wall2), beamM = K3.mat(th.wall);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.22, 2.3, .22), postM);
      post.position.set(sx * .95, 1.15, 0); g.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), K3.mat(th.gold)); cap.position.set(sx * .95, 2.4, 0); g.add(cap);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.1, .2, .26), beamM);
    beam.position.y = 2.25; g.add(beam);
    const label = K3.plate(a.t, 2.25, .9, { px: 72 });
    label.position.set(0, 3.0, .02);
    label.rotation.x = -.12;
    g.add(label);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.33, label.geometry.parameters.height + .08), K3.mat(th.wall2));
    back.position.set(0, 3.0, -.03); back.rotation.x = -.12; g.add(back);
    /* ستارة شفافة خفيفة داخل البوابة */
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.1), new THREE.MeshBasicMaterial({ color: th.gold, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.y = 1.08; g.add(veil);
    g.userData = { a, veil, beam };
    return g;
  }
  function hurdle(kind, th) {
    const g = new THREE.Group();
    if (kind === 'low') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(7.2, .45, .45), K3.mat(th.accent));
      bar.position.y = .3; g.add(bar);
      for (let i = -3; i <= 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.5, .47, .47), K3.mat('#FFFFFF')); s.position.set(i * 1.05, .3, 0); g.add(s); }
    } else {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 7.4, 12), K3.mat(th.accent));
      bar.rotation.z = Math.PI / 2; bar.position.y = 1.35; g.add(bar);
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.5, .2), K3.mat(th.wall2)); p.position.set(sx * 3.7, .75, 0); g.add(p); }
      for (let i = -3; i <= 3; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .45, 12), K3.mat('#FFFFFF')); s.rotation.z = Math.PI / 2; s.position.set(i * 1.05, 1.35, 0); g.add(s); }
    }
    return g;
  }
  const GATE_GAP = 17;            // المسافة بين بوابة وأخرى
  let queue = [], lastText = null, lastLane = -1;
  /* الإجابة التالية: دورة مخلوطة من كل الإجابات (عدا ما جُمع)، بلا تكرار الإجابة نفسها مرتين متتاليتين */
  function nextAnswer() {
    if (!queue.length) {
      queue = shuffle(mixAnswers(S.q, Infinity, S.collected));
      if (queue.length > 1 && queue[0].t === lastText) queue.push(queue.shift());
    }
    const ans = queue.shift();
    lastText = ans.t;
    return ans;
  }
  function addObstacle(z, th, avoidLane) {
    if (Math.random() < .45) {
      const kind = Math.random() < .5 ? 'low' : 'high';
      const h = hurdle(kind, th);
      h.position.z = z;
      scene.add(h);
      rows.push({ g: h, z, kind, done: false });
      return;
    }
    const lanes = shuffle([0, 1, 2].filter(l => l !== avoidLane)).slice(0, Math.random() < .4 ? 2 : 1), g = new THREE.Group();
    lanes.forEach(l => {
      const pick = Math.random(), o = new THREE.Group();
      if (pick < .4) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.1), K3.mat('#B98446'));
        crate.position.y = .5; o.add(crate);
        for (const y of [.08, .92]) { const band = new THREE.Mesh(new THREE.BoxGeometry(1.24, .1, 1.14), K3.mat('#7A4A2A')); band.position.y = y; o.add(band); }
      } else if (pick < .75) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.05, 14), K3.mat(th.accent));
        barrel.position.y = .53; o.add(barrel);
        for (const y of [.2, .86]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(.46, .05, 6, 20), K3.mat('#FFFFFF')); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; o.add(hoop); }
      } else {
        for (const dx of [-.45, .45]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .85, 12), K3.mat('#E8590C')); cone.position.set(dx, .42, 0); o.add(cone); const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.17, .21, .14, 12), K3.mat('#FFFFFF')); stripe.position.set(dx, .46, 0); o.add(stripe); }
      }
      o.position.x = LANE_X[l];
      g.add(o);
    });
    g.position.z = z;
    scene.add(g);
    rows.push({ g, z, kind: 'block', lanes, done: false });
  }
  /* بوابة واحدة لإجابة واحدة في حارة عشوائية، وبعدها عائق في منتصف المسافة إلى البوابة التالية */
  S.spawnRow = (z = -48) => {
    const th = K3.theme();
    const ans = nextAnswer();
    let lane = Math.floor(Math.random() * 3);
    if (lane === lastLane && Math.random() < .6) lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
    lastLane = lane;
    const g = new THREE.Group();
    g.position.z = z;
    const gt = gate(ans, th);
    gt.position.x = LANE_X[lane]; gt.userData.lane = lane;
    g.add(gt);
    scene.add(g);
    rows.push({ g, z, kind: 'gate', gates: [gt], q: S.q, done: false });
    addObstacle(z + GATE_GAP / 2, th, lane);
  };
  /* أبعد بوابة قادمة لهذا السؤال، لنضع التالية بعدها */
  const farthestGate = () => Math.min(0, ...rows.filter(r => r.kind === 'gate' && !r.dead && r.q === S.q).map(r => r.z));
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    rows.filter(r => r.kind === 'gate' && !r.done).forEach(r => { scene.remove(r.g); r.dead = true; });
    queue = []; lastText = null;
    S.spawnRow(-34);
  };

  /* ---------- التحكم ---------- */
  K3.controls(S, {
    dir(d) {
      if (d === 'left') P.lane = Math.max(0, P.lane - 1);
      if (d === 'right') P.lane = Math.min(2, P.lane + 1);
      if (d === 'up' && P.y <= .01) { P.vy = 7.2; FX.play('tick'); }
      if (d === 'down') { P.duck = .75; if (P.y > 0) P.vy = -9; }
    },
    tap() { if (P.y <= .01) { P.vy = 7.2; FX.play('tick'); } },
  });

  function pass(r) {
    r.done = true;
    if (r.kind !== 'gate') {
      const hit = r.kind === 'block' ? r.lanes.includes(P.lane) && P.y < .9 : r.kind === 'low' ? P.y < .45 : P.duck <= 0 && P.y < 1.1;
      if (hit) { P.stumble = .6; FX.play('bad'); Play.board.classList.remove('shake'); void Play.board.offsetWidth; Play.board.classList.add('shake'); }
      else FX.play('tick');
      return;
    }
    if (r.q !== S.q || S.answered || Play.roundDone) return;
    const gt = r.gates.find(g => g.userData.lane === P.lane);
    if (!gt) return;
    const a = gt.userData.a, pt = new THREE.Vector3(gt.position.x, 2.4, 0);
    if (a.ok) {
      K3.tint(gt, '#4CAF50', .7);
      gt.userData.veil.material.color.set('#7FD36B'); gt.userData.veil.material.opacity = .45;
      S.collected.push(a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); queue = queue.filter(x => x.t !== a.t); return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 900 });
    } else {
      K3.tint(gt, '#C0392B', .7);
      gt.userData.fall = 0;
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      Play.mistake(a.t);
    }
  }

  S.onFrame = dt => {
    const th = K3.theme();
    const run = S.started && !Play.finished;
    const v = run ? speed() * (P.stumble > 0 ? .45 : 1) : 0;
    P.stumble = Math.max(0, P.stumble - dt);
    P.duck = Math.max(0, P.duck - dt);
    /* حركة الكرة: الانتقال بين الحارات والقفز */
    P.x += (LANE_X[P.lane] - P.x) * Math.min(1, dt * 12);
    if (P.y > 0 || P.vy > 0) { P.vy -= 22 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0; }
    if (ball) {
      const sq = P.duck > 0 ? .55 : 1;
      ball.position.set(P.x, .55 * sq + P.y, 0);
      ball.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      /* الكرات تتدحرج، وبقية الأشكال تدور حول نفسها حتى تبقى ظاهرة */
      const roll = ['snowball', 'bubble', 'sketch'].includes(ball.userData.kind);
      if (roll) ball.userData.body.rotation.x -= v * dt / .55; else ball.userData.body.rotation.y += dt * (1.5 + v * .15);
      ball.rotation.z = (P.x - LANE_X[P.lane]) * .25;
      shadow.position.set(P.x, .02, 0);
      shadow.scale.setScalar(1 - Math.min(.5, P.y / 5));
    }
    if (stripes) stripes.offset.y += v * dt / (120 / 14);
    side.forEach(p => { p.position.z += v * dt; if (p.position.z > 8) p.position.z -= 117; });
    S.env.children.forEach(c => c.children && c.children.forEach(w => { if (w.userData.sway != null) w.rotation.z = Math.sin(S.t * 2 + w.userData.sway) * .25; }));
    rows.forEach(r => {
      r.z += v * dt;
      r.g.position.z = r.z;
      if (!r.done && !r.dead && r.z >= 0) pass(r);
      if (r.gates) r.gates.forEach(g => {
        if (g.userData.fall != null) { g.userData.fall = Math.min(1, g.userData.fall + dt * 1.6); g.rotation.x = -K3.ease(g.userData.fall) * 1.45; }
        g.userData.veil.material.opacity = g.userData.fall != null ? .12 : g.userData.veil.material.opacity;
      });
    });
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].z > 12 || rows[i].dead) { if (!rows[i].dead) scene.remove(rows[i].g); rows.splice(i, 1); }
    /* إن لم يبقَ صف بوابات أمام الكرة لهذا السؤال يأتي صف جديد */
    if (run && S.q && !S.answered && !Play.roundDone) { let far = farthestGate(); while (far > -62) { far -= GATE_GAP; S.spawnRow(far); } }
    camera.position.x += (P.x * .45 - camera.position.x) * Math.min(1, dt * 4);
    camera.lookAt(camera.position.x * .6, 1, -7);
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
    if (i === 0 || !LANE || !LANE.wrap.isConnected) {
      if (LANE) LANE.wrap.remove();
      LANE = laneScene();
      Play.board.appendChild(LANE.wrap);
      LANE.size();
    }
    LANE.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(LANE.wrap, LANE.paint.el);
    K3.fonts.then(() => LANE.setQuestion(q));
  },
});
