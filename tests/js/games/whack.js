/* اصطد الصحيح (ثلاثي الأبعاد) — ساحة عشبية فيها تسعة أنابيب، تقفز منها أشكال لطيفة (نجوم، أقمار، زهور، كواكب…)
   وفوق كل شكل لافتة إجابة. مطرقة تتبع اليد، وضغطة على الشكل = ضربة:
   الصحيحة تنفجر نجومًا وتُحسب نقطة (والضربات المتتالية الصحيحة تصنع سلسلة ×٢ ×٣…)،
   والخاطئة يحمرّ شكلها ويهتز ويُنقص قلبًا. اللعب حتى نهاية وقت الجولة، وأقصى النقاط = عدد الصحيحة التي ظهرت.
   الشكل يتبع قالب الشكل. */
'use strict';

let WH = null;
const WH_GRID = { cols: 3, rows: 3, dx: 4.6, dz: 3.9 };
const WH_KINDS = ['star', 'moon', 'flower', 'snow', 'bubble', 'planet', 'pumpkin', 'sun', 'snowball', 'sketch'];

function whackScene() {
  const S = K3.create({ fov: 46, fogNear: 30, fogFar: 85, ratio: .6, maxH: 520 });
  const { scene, camera } = S;
  const field = new THREE.Group();
  scene.add(field);
  S.holes = [];
  const sparks = [];
  let mallet = null, swingT = -1, aim = new THREE.Vector3(0, 1.45, 2), aimShown = false, stuckH = null;
  /* مدى الالتصاق والضرب: الدائرة تلتصق بالأنبوب القريب وتبقى عليه قليلًا قبل أن تفلت */
  const SNAP_IN = 2.1, SNAP_OUT = 2.6, HIT_R = 2.3;
  const live = h => h.up >= 0 && h.pop && !h.state && h.t > .2;

  camera.position.set(0, 13.2, 12);
  camera.lookAt(0, 0, -1);

  /* ---------- الساحة والأنابيب ---------- */
  S.onTheme = th => {
    K3.clear(field);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), K3.mat(th.ground2, { map: K3.groundTexture(th, 26) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.02;
    field.add(ground);
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 10.2, .5, 56), K3.mat('#FFFFFF', { map: K3.groundTexture(th, 6) }));
    plaza.position.y = -.25; field.add(plaza);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(9.9, .18, 8, 80), K3.mat(th.wall2)); rim.rotation.x = Math.PI / 2; rim.position.y = .01; field.add(rim);
    K3.scatter(field, th, { count: 360, at: () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 9.5; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0 }; }, avoid: (x, z) => S.holes.some(h => Math.hypot(h.x - x, h.z - z) < 1.3) });
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * .9 + (i / 25) * Math.PI * 1.2, r = K3.rnd(12, 19);
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

  /* ---------- المطرقة: تُمسك مائلة من اليمين، وتهوي إلى اليسار فيضرب وجه رأسها الشكل ---------- */
  const HANDLE = 2.6, HEAD_LEN = 1.15;
  function makeMallet(th) {
    const g = new THREE.Group(), arm = new THREE.Group();
    g.add(arm);
    /* المقبض ممدود من اليد نحو اليسار (‎-x)، والرأس عمودي في طرفه */
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, HANDLE, 10), K3.mat('#8A5A30'));
    handle.rotation.z = Math.PI / 2; handle.position.x = -HANDLE / 2; arm.add(handle);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .75, 10), K3.mat(th.wall2));
    grip.rotation.z = Math.PI / 2; grip.position.x = -.38; arm.add(grip);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 8), K3.mat(th.gold)); arm.add(knob);
    const headG = new THREE.Group(); headG.position.x = -HANDLE; arm.add(headG);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, HEAD_LEN, 24), K3.mat(th.accent));
    headG.add(head);
    for (const y of [-.52, .52]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.49, .49, .16, 24), K3.mat(th.gold)); cap.position.y = y; headG.add(cap); }
    const band = new THREE.Mesh(new THREE.TorusGeometry(.47, .05, 6, 24), K3.mat('#FFFFFF')); band.rotation.x = Math.PI / 2; headG.add(band);
    g.userData = { arm, headG };
    g.visible = false;
    const sh = K3.blob(.7, .28); sh.visible = false; scene.add(sh); g.userData.shadow = sh;
    /* دائرة الهدف: حلقة متقطعة تنبض حيث ستنزل المطرقة */
    const target = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const seg = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.24, 8, 1, i / 12 * Math.PI * 2, Math.PI / 9), new THREE.MeshBasicMaterial({ color: K3.aimColor(th), transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
      target.add(seg);
    }
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.12, 16), new THREE.MeshBasicMaterial({ color: th.gold, transparent: true, opacity: .9, depthWrite: false }));
    target.add(dot);
    target.rotation.x = -Math.PI / 2;
    target.visible = false;
    scene.add(target);
    g.userData.target = target;
    return g;
  }
  /* مراحل الضربة (بالثواني): رفع للأعلى فوق الكتف، ثم هويّ سريع، ثم ارتداد خفيف، ثم عودة إلى الحمل المائل */
  const SW = { up: .12, down: .09, hold: .08, back: .24 };
  const SW_T = SW.up + SW.down + SW.hold + SW.back;
  const HIT_MS = (SW.up + SW.down) * 1000;
  /* زاوية المقبض حول z: ‎-π/2 = المقبض عمودي للأعلى، ‎0 = أفقي نحو اليسار (لحظة الضربة) */
  const REST = -.85, RAISED = -1.85, STRIKE = .06;
  const easeIn = k => k * k * k, easeOut = k => 1 - Math.pow(1 - k, 3);
  function malletAngle(t) {
    if (t < SW.up) return REST + (RAISED - REST) * easeOut(t / SW.up);
    t -= SW.up;
    if (t < SW.down) return RAISED + (STRIKE - RAISED) * easeIn(t / SW.down);
    t -= SW.down;
    if (t < SW.hold) return STRIKE - Math.sin(t / SW.hold * Math.PI) * .22;
    t -= SW.hold;
    return STRIKE + (REST - STRIKE) * easeOut(Math.min(1, t / SW.back));
  }
  /* أثر الضربة: موجة حلقية ناعمة، غبار خفيف، واهتزاز بسيط للكاميرا */
  const impacts = [];
  let shake = 0;
  function impact(x, y, z, good) {
    const th = K3.theme();
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .72, 40), new THREE.MeshBasicMaterial({ color: good === false ? '#FF8A80' : '#FFFFFF', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, y, z);
    scene.add(ring); impacts.push({ m: ring, t: 0, ring: true });
    for (let i = 0; i < 9; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(K3.rnd(.1, .2), 8, 6), new THREE.MeshBasicMaterial({ color: i % 3 ? '#FFFFFF' : th.gold, transparent: true, opacity: .75 }));
      const ang = i / 9 * Math.PI * 2;
      d.position.set(x, y, z); scene.add(d);
      impacts.push({ m: d, t: 0, v: new THREE.Vector3(Math.cos(ang) * 2.4, K3.rnd(1.2, 2.4), Math.sin(ang) * 2.4) });
    }
    shake = .12;
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
    aim.set(h.x, 1.7, h.z);
    aimShown = true;
    swingT = 0;
    setTimeout(() => S.onHit(h), HIT_MS);
  };
  S.burst = (h, good) => {
    const pos = new THREE.Vector3(h.x, 1.3, h.z);
    if (good) { starBurst(pos, K3.theme().gold, 16); h.state = 'good'; h.up = -1; K3.tint(h.pop, '#4CAF50', .5); }
    else { h.state = 'bad'; K3.tint(h.pop, '#C0392B', .7); h.shake = .5; setTimeout(() => S.lower(h), 420); }
    return S.screen(pos);
  };

  /* ---------- اللمس والفأرة: المطرقة تتبع اليد، والضغطة تضرب أقرب شكل ظاهر ---------- */
  S.cv.addEventListener('pointermove', e => {
    const p = K3.groundPoint(S, e, 1.7);
    if (p) { aim.copy(p); aimShown = true; }
  });
  S.cv.addEventListener('pointerleave', () => { aimShown = false; });
  S.cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!S.started) return;
    const p = K3.groundPoint(S, e, 1.3);
    if (!p) return;
    aim.set(p.x, 1.7, p.z); aimShown = true; swingT = 0;
    /* الشكل المضروب: ما لمسته الضغطة مباشرة (الشكل أو لافتته)، وإلا الأنبوب الملتصق به، وإلا الأقرب ضمن مدى واسع */
    const ups = S.holes.filter(live);
    const ray = K3.pick(S, e, ups.map(h => h.pop));
    let cand = null;
    if (ray) { const h = ups.find(h => { let o = ray.object; while (o && o !== h.pop) o = o.parent; return o === h.pop; }); if (h) cand = { h }; }
    if (!cand && stuckH && live(stuckH) && Math.hypot(stuckH.x - p.x, stuckH.z - p.z) < SNAP_OUT) cand = { h: stuckH };
    if (!cand) cand = ups.map(h => ({ h, d: Math.hypot(h.x - p.x, h.z - p.z) })).filter(o => o.d < HIT_R).sort((a, b) => a.d - b.d)[0];
    if (cand) aim.set(cand.h.x, 1.7, cand.h.z);
    if (cand && S.onHit) setTimeout(() => S.onHit(cand.h), HIT_MS);
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
      /* اليد إلى يمين الهدف بطول المقبض، فيقع وجه الرأس على أعلى الشكل تمامًا عند الضربة */
      const ax = stuckH && swingT < 0 ? aim.x + (stuckH.x - aim.x) * .35 : aim.x, az = stuckH && swingT < 0 ? aim.z + (stuckH.z - aim.z) * .35 : aim.z;
      const want = new THREE.Vector3(ax + HANDLE, aim.y + HEAD_LEN / 2 + .25, az + .15);
      mallet.position.lerp(want, Math.min(1, dt * (swingT >= 0 ? 30 : 14)));
      const { arm, headG, shadow: msh } = mallet.userData;
      if (swingT >= 0) {
        swingT += dt;
        arm.rotation.z = malletAngle(swingT);
        /* لحظة الارتطام: الرأس ينضغط قليلًا */
        const hit = swingT > SW.up + SW.down && swingT < SW.up + SW.down + SW.hold;
        headG.scale.set(hit ? 1.12 : 1, hit ? .84 : 1, hit ? 1.12 : 1);
        if (hit && !mallet.userData.thud) { mallet.userData.thud = true; FX.play('pop'); impact(aim.x, aim.y - .1, aim.z); }
        if (swingT >= SW_T) { swingT = -1; mallet.userData.thud = false; }
      } else {
        arm.rotation.z += (REST + Math.sin(S.t * 2.2) * .05 - arm.rotation.z) * Math.min(1, dt * 8);
        headG.scale.set(1, 1, 1);
      }
      /* ميل جانبي بسيط مع حركة اليد، وظل الرأس على الأرض */
      /* ميل خفيف نحو الكاميرا حتى يظهر الرأس بوضوح */
      arm.rotation.x = -.18 + (want.z - mallet.position.z) * .1;
      const hp = new THREE.Vector3(); headG.getWorldPosition(hp);
      msh.visible = mallet.visible; msh.position.set(hp.x, .03, hp.z);
      msh.scale.setScalar(Math.max(.4, 1.3 - hp.y * .25));
      /* دائرة الهدف: تلتصق بأقرب أنبوب ظاهر شكله، وإلا تبقى تحت المطرقة */
      const tg = mallet.userData.target, near = S.holes.map(h => ({ h, d: Math.hypot(h.x - aim.x, h.z - aim.z) })).sort((a, b) => a.d - b.d)[0];
      tg.visible = mallet.visible;
      if (stuckH && Math.hypot(stuckH.x - aim.x, stuckH.z - aim.z) > SNAP_OUT) stuckH = null;
      if (!stuckH && near && near.d < SNAP_IN) stuckH = near.h;
      const snap = !!stuckH;
      if (snap) near.h = stuckH;
      tg.position.lerp(new THREE.Vector3(snap ? near.h.x : aim.x, .82, snap ? near.h.z : aim.z), Math.min(1, dt * 16));
      tg.rotation.z += dt * 1.2;
      tg.scale.setScalar((snap && near.h.pop && !near.h.state ? 1.08 : .95) + Math.sin(S.t * 6) * .04);
      tg.children.forEach(m => { m.material.opacity = snap && near.h.pop && !near.h.state ? .95 : .55; });
    }
    /* آثار الضربات واهتزاز الكاميرا الخفيف */
    impacts.forEach(o => { o.t += dt; if (o.ring) { o.m.scale.setScalar(1 + o.t * 6); o.m.material.opacity = Math.max(0, .8 - o.t * 2.2); } else { o.v.y -= 9 * dt; o.m.position.addScaledVector(o.v, dt); o.m.material.opacity = Math.max(0, .75 - o.t * 1.6); } if (o.t > .55) scene.remove(o.m); });
    for (let i = impacts.length - 1; i >= 0; i--) if (impacts[i].t > .55) impacts.splice(i, 1);
    if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.set(Math.sin(S.t * 90) * shake * .5, 13.2 + Math.cos(S.t * 80) * shake * .4, 12); camera.lookAt(0, 0, -1); } else if (camera.position.x !== 0) { camera.position.set(0, 13.2, 12); camera.lookAt(0, 0, -1); }
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
    head.appendChild(bar);
    qOver(WH.wrap, head);
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
    const okQ = [], badQ = [];
    const spawn = () => {
      const free = WH.holes.filter(h => !h.pop);
      if (free.length) {
        const h = free[Math.random() * free.length | 0];
        /* كل الإجابات تظهر بالتناوب: طابور مخلوط لكل نوع، يُعاد خلطه حين ينتهي */
        const ok = Math.random() < .5 || !q.wrong.length;
        const qu = ok ? okQ : badQ;
        if (!qu.length) qu.push(...shuffle(ok ? corrects : q.wrong));
        WH.raise(h, qu.shift(), ok);
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
