/* ميدان الرماية (ثلاثي الأبعاد، منظور الشخص الأول) — أهداف دائرية ملوّنة في ميدان، وعلى كل هدف إجابة.
   بعضها ينزلق يمينًا ويسارًا على سكة، وبعضها يطلع وينزل، وبعضها يدور ببطء.
   الفأرة (أو الإصبع) تحرّك علامة التصويب، والنقرة (أو رفع الإصبع) تطلق كرة ضوء.
   الهدف الصحيح ينقلب ويتطاير نجومًا (نقطة إن كان أول اختيار)، والخاطئ يحمرّ ويهتز ويُنقص قلبًا.
   كل سؤال يأتي بترتيب أهداف جديد. الشكل يتبع قالب الشكل. */
'use strict';

let SHOOT = null;

function shootScene() {
  const S = K3.create({ fov: 55, fogNear: 30, fogFar: 90, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  const range = new THREE.Group();
  scene.add(range);
  let targets = [], shots = [], bits = [], gun = null, recoil = 0;
  const aimPt = new THREE.Vector3(0, 2, -10);
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  camera.position.set(0, 2.1, 8.5);
  camera.lookAt(0, 1.9, -8);

  /* علامة التصويب فوق اللوحة */
  const cross = el('div', 'k3-cross', '<i></i><b></b>');
  S.wrap.appendChild(cross);
  S.cv.style.cursor = 'none';

  /* ---------- الميدان ---------- */
  S.onTheme = th => {
    K3.clear(range);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), K3.mat(th.ground, { map: K3.groundTexture(th, 22) }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -14;
    range.add(ground);
    /* ممرات الرماية: شرائط بلون الممر وخطوط مسافات */
    for (let i = -2; i <= 2; i++) {
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 26), K3.mat(i % 2 ? th.path : th.ground2, { transparent: true, opacity: .55 }));
      lane.rotation.x = -Math.PI / 2; lane.position.set(i * 3.4, .01, -6);
      range.add(lane);
    }
    for (const z of [-4, -10, -16]) { const line = new THREE.Mesh(new THREE.PlaneGeometry(18, .12), K3.glow('#FFFFFF', { transparent: true, opacity: .6 })); line.rotation.x = -Math.PI / 2; line.position.set(0, .02, z); range.add(line); }
    /* سياج خشبي خلفي وتلال ترابية تصدّ الطلقات */
    const berm = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 5, 32, 1, false, 0, Math.PI), K3.mat(th.ground2, { flatShading: true }));
    berm.rotation.y = Math.PI / 2; berm.position.set(0, 1.5, -24); berm.scale.z = .35; range.add(berm);
    for (let x = -12; x <= 12; x += 1.2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.4, .18), K3.mat('#8A5A30')); post.position.set(x, 1.2, -19); range.add(post);
    }
    for (const y of [.7, 1.8]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(25, .16, .12), K3.mat('#A0703A')); rail.position.set(0, y, -19); range.add(rail); }
    /* حبل رايات ملوّنة فوق الميدان */
    const cols = [th.accent, th.gold, '#FFFFFF', th.wall2];
    for (const z of [-3, -12]) {
      for (let i = 0; i < 22; i++) {
        const x = -11 + i * 1.05, y = 6.2 - Math.sin(i / 21 * Math.PI) * 1.2;
        const f = new THREE.Mesh(new THREE.ConeGeometry(.26, .55, 3), K3.mat(cols[i % 4], { side: THREE.DoubleSide }));
        f.rotation.x = Math.PI; f.position.set(x, y - .3, z); range.add(f);
      }
      const rope = new THREE.Mesh(new THREE.TorusGeometry(11.5, .03, 4, 40, Math.PI), K3.mat('#5A4632'));
      rope.position.set(0, 6.2 - 11.5 * .1, z); rope.scale.y = .1; rope.rotation.z = Math.PI; range.add(rope);
      for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 6.4, 8), K3.mat(th.wall2)); pole.position.set(sx * 11.6, 3.2, z); range.add(pole); }
    }
    /* طاولة الرامي في المقدمة: خشب وأكياس رمل وصناديق ذخيرة */
    const desk = new THREE.Mesh(new THREE.BoxGeometry(8, .9, 1.2), K3.mat('#A0703A')); desk.position.set(0, .45, 5.4); range.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(8.2, .12, 1.4), K3.mat('#8A5A30')); top.position.set(0, .95, 5.4); range.add(top);
    for (let i = 0; i < 6; i++) { const bag = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), K3.mat('#C9B48A', { flatShading: true })); bag.scale.set(1.4, .55, .8); bag.position.set(-3.6 + i * 1.45, 1.15, 5.3); range.add(bag); }
    K3.scatter(range, th, { x0: -30, x1: 30, z0: -34, z1: 4, count: 500, avoid: (x, z) => Math.abs(x) < 9.5 && z > -18 && z < 6 });
    for (let i = 0; i < 18; i++) { const a = Math.PI * (1.05 + i / 17 * .9), r = K3.rnd(18, 28); const p = K3.prop(th, K3.rnd(1.5, 2.5)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 6); range.add(p); }
    K3.horizon(S, th, { radius: 75 });
    K3.weather(S, th, { w: 20, h: 12, d: 30, cz: -8 });
    /* البندقية الضوئية أسفل يمين الشاشة */
    if (gun) camera.remove(gun);
    gun = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .3, 1.3), K3.mat(th.wall2)); gun.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .9, 12), K3.mat('#5A5A66')); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .06, -.95); gun.add(barrel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.11, .035, 6, 16), K3.glow(th.gold)); ring.position.set(0, .06, -1.38); gun.add(ring);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.22, .5, .3), K3.mat('#8A5A30')); grip.position.set(0, -.32, .25); grip.rotation.x = .3; gun.add(grip);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, .4), K3.glow(th.gold)); glass.position.set(0, .2, -.1); gun.add(glass);
    gun.position.set(.85, -.7, -1.6);
    camera.add(gun);
    scene.add(camera);
    if (S.q && targets.length) { const keep = targets.map(t => ({ a: t.a, state: t.state })); layoutTargets(keep); }
  };

  /* ---------- الأهداف ---------- */
  function targetTex(th) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const rings = [th.accent, '#FFFFFF', th.wall2, '#FFFFFF', th.gold];
    rings.forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 124 - k * 24, 0, 7); g.fill(); });
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(128, 128, 124 - k * 24, 0, 7); g.stroke(); }
    return K3.texture(c);
  }
  function makeTarget(a, th) {
    const g = new THREE.Group(), face = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .14, 40), [K3.mat('#8A5A30'), K3.mat('#FFFFFF', { map: targetTex(th) }), K3.mat('#8A5A30')]);
    disc.rotation.x = Math.PI / 2; face.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, .06, 8, 40), K3.mat(th.gold)); face.add(rim);
    face.position.y = 2.1;
    g.add(face);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 1.2, 8), K3.mat('#6B4A2E')); post.position.y = .6; g.add(post);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, .14, 16), K3.mat('#5A5A66')); foot.position.y = .07; g.add(foot);
    const label = K3.plate(a.t, 2.4, .7, { px: 70 }); label.position.set(0, .82, .02); g.add(label);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.5, label.geometry.parameters.height + .1), K3.mat(th.wall2)); back.position.set(0, .82, -.01); g.add(back);
    g.userData = { face, label };
    return g;
  }
  function layoutTargets(keep) {
    const th = K3.theme();
    targets.forEach(t => range.remove(t.g));
    targets = [];
    const list = keep || mixAnswers(S.q, 6, []).map(a => ({ a }));
    const n = list.length, front = Math.ceil(n / 2);
    list.forEach((it, k) => {
      const row = k < front ? 0 : 1, inRow = row ? n - front : front, idx = row ? k - front : k;
      const x = (idx - (inRow - 1) / 2) * (row ? 4.4 : 3.8) + K3.rnd(-.4, .4);
      const z = row ? -14 : -7;
      const g = makeTarget(it.a, th);
      g.position.set(x, 0, z);
      range.add(g);
      const motion = ['still', 'slide', 'pop', 'spin'][Math.floor(Math.random() * 4)];
      targets.push({ a: it.a, g, x, z, motion, ph: Math.random() * 6, amp: K3.rnd(.8, 1.4), state: it.state || '', t: 0, rise: keep ? 1 : 0 });
    });
  }
  S.targets = () => targets;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    layoutTargets();
  };

  /* ---------- الإطلاق ---------- */
  const ray = new THREE.Raycaster();
  function aimFrom(e) {
    const r = S.cv.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = -(e.clientY - r.top) / r.height * 2 + 1;
    cross.style.left = (e.clientX - r.left) + 'px'; cross.style.top = (e.clientY - r.top) + 'px';
    cross.classList.add('on');
    return { nx, ny };
  }
  S.fireAt = (nx, ny) => {
    if (!S.started) { S.begin(); return; }
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hits = ray.intersectObjects(targets.filter(t => !t.state || t.state === 'good').map(t => t.g), true);
    const hit = hits[0];
    const end = hit ? hit.point.clone() : ray.ray.at(30, new THREE.Vector3());
    const start = new THREE.Vector3(.85, -.5, -3); camera.localToWorld(start);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), K3.glow('#FFFFFF'));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: K3.theme().gold, transparent: true, opacity: .9, depthWrite: false })); halo.scale.set(.9, .9, 1); ball.add(halo);
    ball.position.copy(start); scene.add(ball);
    const tgt = hit ? targets.find(t => { let o = hit.object; while (o && o !== t.g) o = o.parent; return o === t.g; }) : null;
    shots.push({ ball, start, end, t: 0, tgt });
    recoil = 1;
    FX.play('shoot');
  };
  S.cv.addEventListener('pointermove', e => aimFrom(e));
  S.cv.addEventListener('pointerleave', () => cross.classList.remove('on'));
  S.cv.addEventListener('pointerdown', e => { e.preventDefault(); const p = aimFrom(e); S.fireAt(p.nx, p.ny); });
  S.start.addEventListener('pointerdown', e => { e.preventDefault(); S.begin(); });

  function burst(pos, colors, n = 18) {
    for (let i = 0; i < n; i++) {
      const m = i % 2 ? K3.starMesh(.14, colors[i % colors.length], .05) : new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .12), K3.glow(colors[i % colors.length]));
      m.position.copy(pos); scene.add(m);
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3;
      bits.push({ m, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + .3, Math.sin(a) * Math.cos(e) * .6).multiplyScalar(K3.rnd(3, 7)), life: 1, spin: K3.rnd(-9, 9) });
    }
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFF3C4', transparent: true, depthWrite: false }));
    flash.position.copy(pos); scene.add(flash); bits.push({ m: flash, flash: true, life: 1 });
  }
  function impact(s) {
    const pos = s.end, t = s.tgt;
    if (!t || t.state || S.answered || Play.roundDone) { burst(pos, ['#C9B48A', '#FFFFFF'], 6); FX.play('tick'); return; }
    const pt = S.screen(pos);
    if (t.a.ok) {
      t.state = 'good'; t.t = 0;
      K3.tint(t.g.userData.label, '#4CAF50', .7);
      burst(pos, [K3.theme().gold, '#FFFFFF', '#7FD36B'], 22);
      S.collected.push(t.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      t.state = 'bad'; t.t = 0;
      K3.tint(t.g, '#C0392B', .55);
      burst(pos, ['#C0392B', '#5A5A66'], 10);
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B');
      FX.play('bad');
      Play.mistake();
    }
  }

  S.onFrame = dt => {
    /* حركة الأهداف */
    targets.forEach(t => {
      const g = t.g, f = g.userData.face;
      t.rise = Math.min(1, t.rise + dt * 1.8);
      let y = -3 * (1 - K3.ease(t.rise));
      if (t.state === 'good') { t.t += dt; f.rotation.x = -Math.min(1, t.t * 2.5) * Math.PI / 2; }
      else if (t.state === 'bad') { t.t += dt; g.position.x = t.x + Math.sin(S.t * 60) * .08 * Math.max(0, 1 - t.t * 2); }
      else if (S.started) {
        if (t.motion === 'slide') g.position.x = t.x + Math.sin(S.t * .9 + t.ph) * t.amp;
        if (t.motion === 'pop') y += (Math.sin(S.t * 1.2 + t.ph) * .5 - .5) * 1.3;
        if (t.motion === 'spin') f.rotation.y = Math.sin(S.t * .8 + t.ph) * .8;
      }
      g.position.y = y;
    });
    /* الطلقات: كرة ضوء تطير إلى نقطة الإصابة */
    shots.forEach(s => {
      s.t = Math.min(1, s.t + dt * 7);
      s.ball.position.lerpVectors(s.start, s.end, s.t);
      if (s.t >= 1 && !s.done) { s.done = true; scene.remove(s.ball); impact(s); }
    });
    shots = shots.filter(s => !s.done);
    bits.forEach(b => {
      b.life -= dt * 1.3;
      if (b.flash) { b.m.scale.setScalar((1 - b.life) * 5 + .5); b.m.material.opacity = Math.max(0, b.life); }
      else { b.v.y -= 12 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += b.spin * dt; b.m.scale.setScalar(Math.max(.01, b.life)); }
      if (b.life <= 0) scene.remove(b.m);
    });
    bits = bits.filter(b => b.life > 0);
    /* ارتداد البندقية وميلها نحو التصويب */
    recoil = Math.max(0, recoil - dt * 6);
    if (gun) { gun.position.z = -1.6 + recoil * .25; gun.rotation.x = recoil * .25; }
  };
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !SHOOT || !SHOOT.wrap.isConnected) {
      if (SHOOT) SHOOT.wrap.remove();
      SHOOT = shootScene();
      Play.board.appendChild(SHOOT.wrap);
      SHOOT.size();
    }
    SHOOT.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(SHOOT.paint.el, SHOOT.wrap);
    K3.fonts.then(() => SHOOT.setQuestion(q));
  },
});
