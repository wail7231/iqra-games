/* جمع النجوم (ثلاثي الأبعاد) — ساحة دائرية تطفو في السماء، ونجوم تتهادى فيها وعلى كل نجمة إجابة.
   يقود الطالب مركبته (شكل اللاعب على قرص يحوم) بالأسهم، أو بلمس مكان في الساحة فتتجه إليه.
   لمس نجمة صحيحة يجمعها (نقطة إن كانت أول اختيار)، والخاطئة تنفجر وتدفع المركبة وتُنقص قلبًا.
   مع «يجب جمعها كلها» يجمع كل الصحيحة. الشكل يتبع قالب الشكل. */
'use strict';

let STAR3 = null;
const ARENA_R = 13;

function starsScene() {
  const S = K3.create({ fov: 48, fogNear: 30, fogFar: 85, ratio: .62 });
  const { scene, camera } = S;
  const field = new THREE.Group();
  scene.add(field);
  let orbs = [], hero, shadow, rider, arena;
  const P = S.P = { x: 0, z: 0, vx: 0, vz: 0, target: null, push: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const speed = () => 3.2 + Play.cfg.speed * .45;

  camera.position.set(0, 12, 11);
  camera.lookAt(0, 0, 0);

  S.onTheme = th => {
    /* الساحة: قرص كبير بحافة لامعة، وصخرة تحته، وأعمدة صغيرة على الحافة */
    arena = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R + .6, ARENA_R + .3, .5, 40), K3.mat(th.ground, { map: K3.groundTexture(th, 6) }));
    top.position.y = -.25; arena.add(top);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R - .3, 48), K3.mat(th.path, { transparent: true, opacity: .55 }));
    inner.rotation.x = -Math.PI / 2; inner.position.y = .01; arena.add(inner);
    for (let k = 1; k <= 5; k++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(k * 2.5 - .05, k * 2.5 + .05, 96), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: .25, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; arena.add(ring);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R + .55, .16, 8, 64), K3.mat(th.wall2, { emissive: K3.col(th.wall2).multiplyScalar(th.dark ? .5 : .15) }));
    rim.rotation.x = Math.PI / 2; rim.position.y = .02; arena.add(rim);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(ARENA_R + .3, 9, 14), K3.mat(th.dark ? '#2A2550' : th.sketch ? '#FFFFFF' : '#9C7A55', { flatShading: true }));
    rock.rotation.x = Math.PI; rock.position.y = -5; arena.add(rock);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, p = K3.prop(th, 1);
      p.position.set(Math.cos(a) * (ARENA_R + 2.2), -.5, Math.sin(a) * (ARENA_R + 2.2));
      if (Math.sin(a) < .3) arena.add(p);
    }
    S.env.add(arena);
    K3.horizon(S, th, { radius: 75, y: -12, hills: false });
    K3.weather(S, th, { w: 26, h: 14, d: 44, cz: -2, cy: -2 });
    for (let i = 0; i < 10; i++) {
      const c = K3.cloud(K3.rnd(1, 2), th.dark ? '#3A4A80' : '#FFFFFF', th.dark ? .5 : .9);
      c.position.set(K3.rnd(-30, 30), K3.rnd(-11, -5), K3.rnd(-30, 14));
      c.userData.drift = K3.rnd(.2, .5); S.env.add(c);
    }
    S.fx.push(dt => S.env.children.forEach(c => { if (c.userData.drift) { c.position.x += c.userData.drift * dt; if (c.position.x > 22) c.position.x = -22; } }));
    /* المركبة: قرص يحوم وعليه شكل اللاعب */
    if (hero) scene.remove(hero, shadow);
    hero = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.62, .45, .18, 24), K3.mat(th.wall2, { emissive: K3.col(th.wall2).multiplyScalar(.2) }));
    hero.add(disc);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(.6, .05, 6, 32), K3.glow(th.gold));
    glowRing.rotation.x = Math.PI / 2; glowRing.position.y = -.05; hero.add(glowRing);
    rider = K3.player();
    rider.position.y = .55; rider.scale.setScalar(.85);
    hero.add(rider);
    shadow = K3.blob(.7, .3);
    scene.add(hero, shadow);
    if (S.q && orbs.length) { const keep = orbs.map(o => ({ a: o.a, x: o.g.position.x, z: o.g.position.z, state: o.state })); spawn(keep); }
  };

  /* ---------- النجوم ---------- */
  function orb(a, th) {
    const g = new THREE.Group();
    const s = K3.starMesh(.62, th.gold, .28);
    g.add(s);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: th.gold, transparent: true, opacity: .45, depthWrite: false }));
    halo.scale.set(2, 2, 1); g.add(halo);
    const sign = K3.sign(a.t, { h: .9, px: 64 });
    const maxW = 3.6;
    if (sign.scale.x > maxW) sign.scale.set(maxW, maxW / sign.userData.ratio, 1);
    sign.position.y = 1.3;
    g.add(sign);
    const sh = K3.blob(.5, .22);
    sh.position.y = -.88;
    g.add(sh);
    g.userData = { star: s, sign, halo };
    return g;
  }
  function spawn(keep) {
    const th = K3.theme();
    orbs.forEach(o => field.remove(o.g));
    orbs = [];
    const list = keep || mixAnswers(S.q, 6).map(a => ({ a }));
    list.forEach((it, k) => {
      if (it.state === 'gone') return;
      const g = orb(it.a, th);
      let x = it.x, z = it.z;
      if (x == null) {
        /* مواضع متباعدة بعيدًا عن المركبة */
        for (let t = 0; t < 40; t++) {
          const a = Math.random() * Math.PI * 2, r = K3.rnd(1.5, ARENA_R - 1.2);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
          if (Math.hypot(x - P.x, z - P.z) > 3 && orbs.every(o => Math.hypot(o.g.position.x - x, o.g.position.z - z) > 2.8)) break;
        }
      }
      g.position.set(x, .9, z);
      const a = Math.random() * Math.PI * 2;
      field.add(g);
      orbs.push({ a: it.a, g, vx: Math.cos(a) * .5, vz: Math.sin(a) * .5, state: it.state || '', ph: Math.random() * 6, pop: 0, rise: keep ? 1 : 0 });
      if (it.state === 'good') paintGood(orbs[orbs.length - 1]);
    });
  }
  function paintGood(o) {
    K3.tint(o.g, '#4CAF50', .7);
    K3.recolorSign(o.g.userData.sign, '✓ ' + o.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
  }
  S.orbs = () => orbs;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    spawn();
  };
  function touch(o) {
    if (o.state || S.answered || Play.roundDone) return;
    const pt = o.g.position.clone().add(new THREE.Vector3(0, 1, 0));
    if (o.a.ok) {
      o.state = 'good';
      paintGood(o);
      S.collected.push(o.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      o.state = 'bad';
      K3.tint(o.g, '#C0392B', .7);
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      /* دفعة إلى الخلف بعيدًا عن النجمة */
      const dx = P.x - o.g.position.x, dz = P.z - o.g.position.z, d = Math.hypot(dx, dz) || 1;
      P.vx = dx / d * 9; P.vz = dz / d * 9; P.push = .35; P.target = null;
      Play.mistake();
    }
  }

  K3.controls(S, {
    hold(e, phase) {
      if (!S.started || !e || phase === 'up') return;
      const p = K3.groundPoint(S, e, 0);
      if (p) P.target = p;
    },
  });

  S.onFrame = dt => {
    const sp = speed();
    /* القيادة: الأسهم أو نقطة الهدف */
    let ix = 0, iz = 0;
    const k = S.keys;
    if (k.ArrowLeft || k.KeyA) ix -= 1;
    if (k.ArrowRight || k.KeyD) ix += 1;
    if (k.ArrowUp || k.KeyW) iz -= 1;
    if (k.ArrowDown || k.KeyS) iz += 1;
    if (ix || iz) P.target = null;
    else if (P.target) {
      const dx = P.target.x - P.x, dz = P.target.z - P.z, d = Math.hypot(dx, dz);
      if (d < .25) P.target = null; else { ix = dx / d * Math.min(1, d); iz = dz / d * Math.min(1, d); }
    }
    const len = Math.hypot(ix, iz) || 1;
    if (P.push > 0) P.push -= dt;
    else if (S.started && !Play.finished) {
      P.vx += ((ix / Math.max(1, len)) * sp - P.vx) * Math.min(1, dt * 6);
      P.vz += ((iz / Math.max(1, len)) * sp - P.vz) * Math.min(1, dt * 6);
    } else { P.vx *= .9; P.vz *= .9; }
    P.x += P.vx * dt; P.z += P.vz * dt;
    const r = Math.hypot(P.x, P.z);
    if (r > ARENA_R - .6) { P.x *= (ARENA_R - .6) / r; P.z *= (ARENA_R - .6) / r; }
    if (hero) {
      hero.position.set(P.x, .45 + Math.sin(S.t * 3) * .07, P.z);
      hero.rotation.z = -P.vx * .04; hero.rotation.x = P.vz * .04;
      rider.userData.body.rotation.y += dt * 2;
      shadow.position.set(P.x, .03, P.z);
    }
    /* النجوم تتهادى وترتد عن الحافة وعن بعضها */
    orbs.forEach(o => {
      o.rise = Math.min(1, o.rise + dt * 1.5);
      const g = o.g;
      if (o.state === 'good') { g.position.y += dt * 1.2; g.rotation.y += dt * 6; o.pop += dt; g.scale.setScalar(Math.max(.01, 1 - Math.max(0, o.pop - .8) * 1.5)); if (o.pop > 1.5) { o.state = 'gone'; field.remove(g); } return; }
      if (o.state === 'bad') { o.pop += dt; g.scale.setScalar(Math.max(.01, 1 + o.pop * 1.5 - o.pop * o.pop * 4)); if (o.pop > .6) { o.state = 'gone'; field.remove(g); } return; }
      if (o.state === 'gone') return;
      const drift = S.started ? .35 + Play.cfg.speed * .08 : .15;
      g.position.x += o.vx * drift * dt; g.position.z += o.vz * drift * dt;
      const rr = Math.hypot(g.position.x, g.position.z);
      if (rr > ARENA_R - 1) { const nx = g.position.x / rr, nz = g.position.z / rr, dot = o.vx * nx + o.vz * nz; if (dot > 0) { o.vx -= 2 * dot * nx; o.vz -= 2 * dot * nz; } }
      orbs.forEach(b => { if (b === o || b.state) return; const dx = g.position.x - b.g.position.x, dz = g.position.z - b.g.position.z, d = Math.hypot(dx, dz); if (d < 2.4 && d > 0) { o.vx += dx / d * dt * 2; o.vz += dz / d * dt * 2; } });
      const vl = Math.hypot(o.vx, o.vz) || 1; o.vx /= vl; o.vz /= vl;
      g.position.y = .9 + Math.sin(S.t * 2 + o.ph) * .15 - (1 - K3.ease(o.rise)) * 3;
      g.userData.star.rotation.y += dt * 1.5;
      g.userData.halo.material.opacity = .35 + Math.sin(S.t * 3 + o.ph) * .15;
      if (S.started && Math.hypot(g.position.x - P.x, g.position.z - P.z) < 1.05) touch(o);
    });
    /* إن جُمعت النجوم أو انفجرت كلها ولم يكتمل السؤال تأتي نجوم جديدة */
    if (S.q && !S.answered && !Play.roundDone && !orbs.some(o => !o.state && o.a.ok)) {
      const keep = orbs.filter(o => o.state === 'good').map(o => o.a.t);
      const fresh = mixAnswers(S.q, 6, [...S.collected, ...keep]).map(a => ({ a }));
      spawn(fresh);
    }
    camera.position.x += (P.x * .8 - camera.position.x) * Math.min(1, dt * 2.5);
    camera.position.z += (P.z * .8 + 11 - camera.position.z) * Math.min(1, dt * 2.5);
    camera.lookAt(camera.position.x, 0, camera.position.z - 11.6);
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
    if (i === 0 || !STAR3 || !STAR3.wrap.isConnected) {
      if (STAR3) STAR3.wrap.remove();
      STAR3 = starsScene();
      Play.board.appendChild(STAR3.wrap);
      STAR3.size();
    }
    STAR3.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(STAR3.paint.el, STAR3.wrap);
    K3.fonts.then(() => STAR3.setQuestion(q));
  },
});
