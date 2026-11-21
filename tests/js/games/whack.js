/* اصطد الصحيح (ثلاثي الأبعاد) — ساحة عشبية فيها تسعة أنابيب، تقفز منها أشكال لطيفة (نجوم، أقمار، زهور، كواكب…)
   وفوق كل شكل لافتة إجابة. مطرقة تتبع اليد، وضغطة على الشكل = ضربة:
   الصحيحة تنفجر نجومًا وتُحسب نقطة (والضربات المتتالية الصحيحة تصنع سلسلة ×٢ ×٣…)،
   والخاطئة يحمرّ شكلها ويهتز ويُنقص قلبًا. اللعب حتى نهاية وقت الجولة، وأقصى النقاط = عدد الصحيحة التي ظهرت.
   الشكل يتبع قالب الشكل. */
'use strict';

let WH = null;
const WH_GRID = { cols: 3, rows: 3, dx: 3.3, dz: 3 };
const WH_KINDS = ['star', 'moon', 'flower', 'snow', 'bubble', 'planet', 'pumpkin', 'sun', 'snowball', 'sketch'];

function whackScene() {
  const S = K3.create({ fov: 46, fogNear: 30, fogFar: 85, ratio: .6, maxH: 520 });
  const { scene, camera } = S;
  const field = new THREE.Group();
  scene.add(field);
  S.holes = [];
  const sparks = [];
  let mallet = null, swing = 0, aim = new THREE.Vector3(0, 1.8, 2), aimShown = false;

  camera.position.set(0, 10.5, 9.2);
  camera.lookAt(0, 0, -.6);

  /* ---------- الساحة والأنابيب ---------- */
  S.onTheme = th => {
    K3.clear(field);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), K3.mat(th.ground2, { map: K3.groundTexture(th, 26) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.02;
    field.add(ground);
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 8, .5, 48), K3.mat('#FFFFFF', { map: K3.groundTexture(th, 6) }));
    plaza.position.y = -.25; field.add(plaza);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.7, .16, 8, 72), K3.mat(th.wall2)); rim.rotation.x = Math.PI / 2; rim.position.y = .01; field.add(rim);
    K3.scatter(field, th, { count: 260, at: () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 7.3; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0 }; }, avoid: (x, z) => S.holes.some(h => Math.hypot(h.x - x, h.z - z) < 1.3) });
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * .9 + (i / 25) * Math.PI * 1.2, r = K3.rnd(9.5, 16);
      const p = K3.prop(th, K3.rnd(1.3, 2.2)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); p.rotation.y = Math.random() * 6;
      field.add(p);
    }
    K3.horizon(S, th, { radius: 70 });
    K3.weather(S, th, { w: 18, h: 12, d: 24, cz: -4 });
    S.holes.forEach(h => h.pop && scene.remove(h.pop));
    S.holes = [];
    for (let r = 0; r < WH_GRID.rows; r++) for (let c = 0; c < WH_GRID.cols; c++) {
      const x = (c - 1) * WH_GRID.dx, z = (r - 1) * WH_GRID.dz;
      const g = new THREE.Group();
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, .75, 32, 1, true), K3.mat(th.wall, { side: THREE.FrontSide }));
      pipe.position.y = .37; g.add(pipe);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(.98, .98, .75, 32, 1, true), new THREE.MeshBasicMaterial({ color: th.dark ? '#05030E' : '#2A1E14', side: THREE.BackSide }));
      inside.position.y = .37; g.add(inside);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(.98, 32), new THREE.MeshBasicMaterial({ color: th.dark ? '#020108' : '#1B130C' }));
      hole.rotation.x = -Math.PI / 2; hole.position.y = .1; g.add(hole);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1.03, .12, 10, 40), K3.mat(th.gold, { emissive: K3.col(th.gold).multiplyScalar(.15) }));
      lip.rotation.x = Math.PI / 2; lip.position.y = .76; g.add(lip);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.08, .06, 6, 40), K3.mat(th.wall2)); band.rotation.x = Math.PI / 2; band.position.y = .3; g.add(band);
      const patch = K3.tuftPatch(th, 8); patch.scale.setScalar(1.4); g.add(patch);
      g.position.set(x, 0, z);
      field.add(g);
      S.holes.push({ x, z, g, lip, pop: null, up: 0, t: 0, ok: false, state: '', life: 0 });
    }
    if (mallet) scene.remove(mallet);
    mallet = makeMallet(th);
    scene.add(mallet);
  };

  /* ---------- المطرقة ---------- */
  function makeMallet(th) {
    const g = new THREE.Group(), arm = new THREE.Group();
    g.add(arm);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 2.2, 10), K3.mat('#8A5A30'));
    handle.position.set(0, 1.1, 0); arm.add(handle);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .6, 10), K3.mat(th.wall2)); grip.position.y = 1.95; arm.add(grip);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.1, 20), K3.mat(th.accent));
    head.rotation.z = Math.PI / 2; head.position.y = 0; arm.add(head);
    for (const x of [-.45, .45]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .14, 20), K3.mat(th.gold)); cap.rotation.z = Math.PI / 2; cap.position.x = x; arm.add(cap); }
    arm.rotation.x = -.5;
    g.userData.arm = arm;
    g.visible = false;
    return g;
  }

  /* ---------- الأشكال ---------- */
  S.raise = (h, text, ok) => {
    const th = K3.theme();
    if (h.pop) scene.remove(h.pop);
    const g = new THREE.Group();
    const body = K3.player(WH_KINDS[Math.floor(Math.random() * WH_KINDS.length)]);
    body.scale.setScalar(1.45);
    g.add(body);
    const sign = K3.sign(text, { h: .95, px: 64 });
    if (sign.scale.x > 3.2) sign.scale.set(3.2, 3.2 / sign.userData.ratio, 1);
    sign.position.y = 1.75;
    g.add(sign);
    g.userData = { body, sign };
    g.position.set(h.x, -1.2, h.z);
    scene.add(g);
    Object.assign(h, { pop: g, up: 1, t: 0, ok, state: '', text, life: 0 });
  };
  S.lower = h => { if (h.up === 1) h.up = -1; };

  /* نجوم صغيرة تتطاير من الضربة */
  function starBurst(pos, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const m = K3.starMesh(.16, i % 2 ? color : '#FFFFFF', .06);
      m.position.copy(pos);
      scene.add(m);
      const a = Math.random() * Math.PI * 2;
      sparks.push({ m, v: new THREE.Vector3(Math.cos(a) * K3.rnd(2, 5), K3.rnd(4, 8), Math.sin(a) * K3.rnd(2, 5)), life: 1, spin: K3.rnd(-8, 8) });
    }
  }
  /* ضربة على حفرة: تتحرك المطرقة إليها وتضرب */
  S.strike = h => {
    if (!S.onHit) return;
    aim.set(h.x, 1.8, h.z + .2);
    aimShown = true;
    swing = 1;
    setTimeout(() => S.onHit(h), 90);
  };
  S.burst = (h, good) => {
    const pos = new THREE.Vector3(h.x, 1.3, h.z);
    if (good) { starBurst(pos, K3.theme().gold, 16); h.state = 'good'; h.up = -1; K3.tint(h.pop, '#4CAF50', .5); }
    else { h.state = 'bad'; K3.tint(h.pop, '#C0392B', .7); h.shake = .5; setTimeout(() => S.lower(h), 420); }
    return S.screen(pos);
  };

  /* ---------- اللمس والفأرة: المطرقة تتبع اليد، والضغطة تضرب أقرب شكل ظاهر ---------- */
  S.cv.addEventListener('pointermove', e => {
    const p = K3.groundPoint(S, e, 1.8);
    if (p) { aim.copy(p); aimShown = true; }
  });
  S.cv.addEventListener('pointerleave', () => { aimShown = false; });
  S.cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!S.started) return;
    const p = K3.groundPoint(S, e, .9);
    if (!p) return;
    aim.set(p.x, 1.8, p.z); aimShown = true; swing = 1;
    /* الشكل المضروب: أقربها إلى نقطة الضغطة (مع ارتفاعه) */
    const cand = S.holes.filter(h => h.up >= 0 && h.pop && !h.state && h.t > .25)
      .map(h => ({ h, d: Math.hypot(h.x - p.x, h.z - p.z) }))
      .filter(o => o.d < 1.7).sort((a, b) => a.d - b.d)[0];
    if (cand && S.onHit) setTimeout(() => S.onHit(cand.h), 90);
    else FX.play('tick');
  });

  S.onFrame = dt => {
    S.holes.forEach(h => {
      if (!h.pop) return;
      const g = h.pop;
      if (h.up === 1) h.t = Math.min(1, h.t + dt * 4);
      else if (h.up === -1) h.t = Math.max(0, h.t - dt * 3.2);
      /* قفزة مرنة للأعلى ثم استقرار */
      const k = h.t, back = 1.70158 * 1.4;
      const e = k === 0 ? 0 : 1 + (back + 1) * Math.pow(k - 1, 3) + back * Math.pow(k - 1, 2);
      g.position.y = -1.2 + e * 2.15;
      g.userData.body.userData.body.rotation.y += dt * 1.6;
      if (h.shake > 0) { h.shake -= dt; g.position.x = h.x + Math.sin(S.t * 70) * .1; } else g.position.x = h.x;
      if (h.state === 'good') g.scale.setScalar(Math.max(.01, h.t));
      g.userData.sign.visible = h.t > .55;
      if (h.up === -1 && h.t === 0) { scene.remove(g); h.pop = null; h.up = 0; h.state = ''; }
    });
    sparks.forEach(s => { s.life -= dt * 1.1; s.v.y -= 16 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.z += s.spin * dt; s.m.scale.setScalar(Math.max(.01, s.life)); if (s.life <= 0) scene.remove(s.m); });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    /* المطرقة: تلحق باليد وتضرب */
    if (mallet) {
      mallet.visible = aimShown && S.started;
      mallet.position.lerp(aim, Math.min(1, dt * 18));
      const arm = mallet.userData.arm;
      if (swing > 0) { swing = Math.max(0, swing - dt * 4); arm.rotation.x = -.5 + Math.sin((1 - swing) * Math.PI) * 1.25; mallet.position.y = 1.8 - Math.sin((1 - swing) * Math.PI) * .9; }
      else arm.rotation.x += (-.5 - arm.rotation.x) * Math.min(1, dt * 8);
    }
  };
  S.size();
  S.cv.style.cursor = 'none';
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 4 },
    { key: 'roundTime', label: 'وقت كل جولة', options: [[20, '٢٠ ث'], [30, '٣٠ ث'], [45, '٤٥ ث'], [60, '٦٠ ث']], def: 30 },
    'lives',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    const corrects = answersOf(q);
    const head = Play.head(q.q, ' ');
    const sub = head.querySelector('.round-sub');
    let hits = 0, shown = 0, combo = 0;
    const paintSub = () => { sub.textContent = `✓ ${toAr(hits)}`; };
    paintSub();
    const bar = el('div', 'round-timebar', '<span></span>');
    if (i === 0 || !WH || !WH.wrap.isConnected) {
      if (WH) WH.wrap.remove();
      WH = whackScene();
      Play.board.appendChild(WH.wrap);
      WH.size();
    }
    Play.board.insertBefore(head, WH.wrap);
    Play.board.insertBefore(bar, WH.wrap);
    WH.start.classList.add('hidden');
    WH.started = true;

    const lvl = Play.cfg.speed;
    const stay = 2700 - lvl * 200;
    const gap = Math.max(380, 1250 - lvl * 85);
    const total = Play.cfg.roundTime * 1000;
    const token = {};
    Play._whack = token;
    const alive = () => Play._whack === token && !Play.roundDone && !Play.finished;
    let startAt = 0;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (alive()) fn(); }, ms));

    const finish = () => {
      timers.forEach(clearTimeout);
      WH.holes.forEach(h => WH.lower(h));
      if (hits) FX.burst(WH.wrap, { count: 30 });
      Play.finish(hits, { delay: 1600, max: Math.max(hits, shown, 1) });
    };
    const spawn = () => {
      const free = WH.holes.filter(h => !h.pop);
      if (free.length) {
        const h = free[Math.random() * free.length | 0];
        const ok = Math.random() < .5 || !q.wrong.length;
        const pool = ok ? corrects : q.wrong;
        WH.raise(h, pool[Math.random() * pool.length | 0], ok);
        if (ok) shown++;
        const mine = h.pop;
        later(() => { if (h.pop === mine && !h.state) WH.lower(h); }, stay);
      }
      later(spawn, gap * (.7 + Math.random() * .6));
    };
    const tick = () => {
      const left = Math.max(0, total - (performance.now() - startAt));
      bar.firstChild.style.width = (left / total * 100) + '%';
      if (left <= 0) finish();
      else later(tick, 100);
    };
    WH.onHit = h => {
      if (!alive() || !h.pop || h.state) return;
      Play.touch();
      const pt = WH.burst(h, h.ok);
      if (h.ok) {
        hits++; combo++;
        paintSub();
        FX.burst(pt, { count: 18 + combo * 3 });
        FX.floatText(pt, combo > 1 ? `+١  ×${toAr(combo)}` : '+١');
        FX.play(combo > 2 ? 'ok' : 'good');
        $('#scoreVal').textContent = toAr(Play.score + hits);
        FX.bump($('#scoreVal').parentNode);
      } else {
        combo = 0;
        FX.floatText(pt, '✗', '#C0392B');
        FX.play('bad');
        Play.mistake();
      }
    };

    /* عدّ تنازلي كبير فوق الساحة */
    const count = el('div', 'k3-count', '٣');
    WH.wrap.appendChild(count);
    let n = 3;
    const countdown = () => {
      if (n > 0) { count.textContent = toAr(n--); count.classList.remove('pulse'); void count.offsetWidth; count.classList.add('pulse'); FX.play('tick'); later(countdown, 650); return; }
      count.remove();
      startAt = performance.now();
      Play.touch();
      spawn();
      tick();
    };
    later(countdown, 300);
  },
});
