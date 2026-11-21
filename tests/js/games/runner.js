/* الكرة القافزة (ثلاثية الأبعاد، منظور جانبي كألعاب المنصّات) — كرة تتدحرج على أرض مجسّمة،
   وتأتي نحوها منصّات طافية على كل منها لافتة إجابة. ضغطة (أو مسافة / سهم أعلى) = قفزة.
   الهبوط على منصّة = اختيار إجابتها: الصحيحة تخضرّ (نقطة إن كانت أول اختيار)، والخاطئة تتفتت وتسقط وتُنقص قلبًا.
   إن مرّت كل المنصّات دون اختيار عادت من جديد. المشهد يبقى بين الأسئلة. الشكل يتبع قالب الشكل. */
'use strict';

let RUN = null;
const RN = { r: .55, g: 24, jump: 10.2 };

function runnerScene() {
  const S = K3.create({ fov: 46, fogNear: 28, fogFar: 80, ratio: .5, maxH: 460 });
  const { scene, camera } = S;
  const world = new THREE.Group();
  scene.add(world);
  let ball, shadow, groundTex = null, deco = [];
  const P = S.P = { y: 0, vy: 0, on: null, roll: 0 };
  S.plats = [];
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const speed = () => 4.2 + Play.cfg.speed * .65;

  camera.position.set(3.2, 3.6, 12);
  camera.lookAt(-3.5, 1.8, 0);

  /* ---------- الأرض والزينة ---------- */
  S.onTheme = th => {
    K3.clear(world);
    groundTex = K3.groundTexture(th, 10);
    groundTex.repeat.set(16, 2);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 1.2, 7), K3.mat('#FFFFFF', { map: groundTex }));
    ground.position.set(-20, -.6, 0);
    world.add(ground);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(120, .16, .3), K3.mat(th.wall2));
    edge.position.set(-20, .02, 3.45); world.add(edge);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), K3.mat(th.ground2, { map: K3.groundTexture(th, 30) }));
    far.rotation.x = -Math.PI / 2; far.position.set(-20, -.05, -30); world.add(far);
    K3.horizon(S, th, { radius: 70 });
    K3.weather(S, th, { w: 30, h: 12, d: 30, cz: -6 });
    /* زينة تتحرك مع الأرض: أشجار وصخور خلف الممر، وعشب وحصى على الحافة الأمامية */
    deco = [];
    for (let i = 0; i < 22; i++) {
      const p = K3.prop(th, K3.rnd(1.2, 2));
      p.position.set(-60 + i * 4.6 + K3.rnd(-1, 1), 0, K3.rnd(-9, -4));
      p.rotation.y = Math.random() * 6;
      world.add(p); deco.push({ g: p, span: 101 });
    }
    for (let i = 0; i < 26; i++) {
      const t = K3.tuftPatch(th, 6);
      t.position.set(-60 + i * 3.9, 0, Math.random() < .5 ? K3.rnd(2.2, 3.2) : K3.rnd(-3.2, -2.2));
      world.add(t); deco.push({ g: t, span: 101 });
    }
    if (ball) scene.remove(ball, shadow);
    ball = K3.player();
    shadow = K3.blob(.6, .3);
    scene.add(ball, shadow);
    /* المنصّات الحالية تُعاد بألوان القالب */
    const keep = S.plats.filter(p => !p.state).map(p => ({ a: p.a, x: p.x, top: p.top, round: p.round }));
    S.plats.forEach(p => world.remove(p.g));
    S.plats = [];
    keep.forEach(k => addPlat(k.a, k.x, k.top, k.round));
  };

  /* ---------- منصّة طافية بلافتة إجابة على وجهها ---------- */
  function addPlat(a, x, top, round) {
    const th = K3.theme();
    const sign = K3.plate(a.t, 3, .8, { px: 70 });
    const w = Math.max(2.6, Math.min(4.4, sign.geometry.parameters.width + .4));
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, .55, 2), K3.mat(th.wall));
    body.position.y = -.28; g.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .16, 2.12), K3.mat(th.deco === 'pines' || th.deco === 'crystals' ? '#FFFFFF' : th.ground));
    cap.position.y = .02; g.add(cap);
    const under = new THREE.Mesh(new THREE.ConeGeometry(.6, .9, 6), K3.mat(th.wall2, { flatShading: true }));
    under.rotation.x = Math.PI; under.position.y = -.95; g.add(under);
    sign.position.set(0, -.28, 1.02);
    sign.scale.setScalar(Math.min(1, (w - .3) / sign.geometry.parameters.width));
    g.add(sign);
    g.position.set(x, top, 0);
    world.add(g);
    const p = { a, g, x, w, top, round, state: '', fall: 0, ph: Math.random() * 6 };
    S.plats.push(p);
    return p;
  }
  S.spawn = () => {
    const answers = fitAnswers(mixAnswers(S.q, 6, S.collected), 6);
    let x = Math.min(-16, ...S.plats.filter(p => !p.state).map(p => p.x - p.w - 5));
    answers.forEach(a => {
      const p = addPlat(a, x, K3.rnd(1.1, 1.65), S.q);
      x -= p.w + K3.rnd(4.5, 6.5);
    });
  };
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    S.plats.filter(p => !p.state).forEach(p => { world.remove(p.g); p.state = 'gone'; });
    S.plats = S.plats.filter(p => p.state !== 'gone');
    S.spawn();
  };

  /* ---------- القفز والهبوط ---------- */
  const jump = () => {
    if (!S.started) { S.begin(); return; }
    if (P.y <= .001 || P.on) { P.vy = RN.jump; P.on = null; FX.play('tick'); }
  };
  S.jump = jump;
  K3.controls(S, { dir(d) { if (d === 'up') jump(); }, tap() { jump(); } });

  function land(p) {
    P.on = p;
    if (p.state || S.answered || Play.roundDone) return;
    const pt = p.g.position.clone().add(new THREE.Vector3(0, 1, 0));
    if (p.a.ok) {
      p.state = 'good';
      K3.tint(p.g, '#4CAF50', .65);
      S.collected.push(p.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 900 });
    } else {
      p.state = 'bad';
      K3.tint(p.g, '#C0392B', .6);
      S.missed = true;
      P.on = null;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      Play.mistake();
    }
  }

  S.onFrame = dt => {
    const live = S.started && !Play.finished;
    const v = live ? speed() : 0;
    if (groundTex) groundTex.offset.x -= v * dt / (120 / 16);
    deco.forEach(d => { d.g.position.x += v * dt; if (d.g.position.x > 41) d.g.position.x -= d.span; });
    S.plats.forEach(p => {
      p.x += v * dt;
      p.g.position.x = p.x;
      if (p.state === 'bad') { p.fall += dt; p.g.position.y = p.top - p.fall * p.fall * 9; p.g.rotation.z = p.fall * 1.2; }
      else p.g.position.y = p.top + Math.sin(S.t * 1.6 + p.ph) * .05;
    });
    /* الكرة: جاذبية وهبوط على منصّة أو على الأرض */
    if (P.on && (P.on.state === 'bad' || Math.abs(P.on.x) > P.on.w / 2 + .1)) P.on = null;
    if (!P.on) {
      const prev = P.y;
      P.vy -= RN.g * dt;
      P.y += P.vy * dt;
      if (P.vy < 0) {
        const p = S.plats.find(p => p.state !== 'bad' && Math.abs(p.x) <= p.w / 2 + .15 && prev >= p.top - .02 && P.y <= p.top + .02);
        if (p) { P.y = p.top; P.vy = 0; land(p); }
      }
      if (P.y <= 0) { P.y = 0; P.vy = 0; }
    } else P.y = P.on.g.position.y;
    if (ball) {
      ball.position.set(0, P.y + RN.r, 0);
      P.roll += v * dt / RN.r;
      ball.userData.body.rotation.z = P.roll;
      ball.userData.body.rotation.y = Math.sin(S.t) * .2;
      const ground = P.on ? P.on.g.position.y : 0;
      shadow.position.set(0, ground + .03, 0);
      shadow.scale.setScalar(Math.max(.4, 1 - (P.y - ground) * .2));
    }
    /* حذف ما عبر، وإعادة منصّات السؤال إن فاتت كلها */
    for (let i = S.plats.length - 1; i >= 0; i--) { const p = S.plats[i]; if (p.x > 22 || p.fall > 2) { world.remove(p.g); S.plats.splice(i, 1); } }
    if (live && S.q && !S.answered && !Play.roundDone && !S.plats.some(p => p.round === S.q && !p.state && p.x < 1)) S.spawn();
    camera.position.y += (3.6 + P.y * .35 - camera.position.y) * Math.min(1, dt * 3);
    camera.lookAt(-3.5, 1.8 + P.y * .3, 0);
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
    if (i === 0 || !RUN || !RUN.wrap.isConnected) {
      if (RUN) RUN.wrap.remove();
      RUN = runnerScene();
      Play.board.appendChild(RUN.wrap);
      RUN.size();
    }
    RUN.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(RUN.paint.el, RUN.wrap);
    K3.fonts.then(() => RUN.setQuestion(q));
  },
});
