/* صيد الفقاعات (ثلاثي الأبعاد) — غواصة صغيرة تسبح بحرية في قاع البحر بين المرجان والصخور والأعشاب،
   وحولها فقاعات كبيرة طافية، على كل فقاعة إجابة. الأسهم (أو العصا) للحركة، E/Q (أو الزران) للصعود والنزول،
   F أو نقرة أو زر الإطلاق يرمي كرة ضوء تفقع الفقاعة. الصحيحة تتفجر نجومًا ولآلئ (نقطة إن كانت أول اختيار)،
   والخاطئة تنفث حبرًا يغبّش الشاشة لحظة ويُنقص قلبًا.
   في قالب الفضاء والليل تصبح مركبة بين الكواكب، وفي الشتاء والجليد تحت سقف جليدي. */
'use strict';

let SUB = null;
const SB = { half: 16, top: 9, bottom: 1 };

function subScene() {
  const S = K3.create({ fov: 58, fogNear: 6, fogFar: 42, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  const sea = new THREE.Group();
  scene.add(sea);
  const joy = K3.joystick(S);
  let sub = null, bubbles = [], shots = [], bits = [], weeds = [], rays = [], floaters = [], mode = 'sea', caustic = null;
  const P = S.P = { x: 0, y: 4, z: 10, vx: 0, vy: 0, vz: 0, yaw: Math.PI };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const ink = el('div', 'k3-ink');
  S.wrap.appendChild(ink);

  /* ---------- البيئة: بحر، أو فضاء، أو تحت الجليد ---------- */
  function causticTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 40; i++) { g.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; g.ellipse(x, y, K3.rnd(10, 30), K3.rnd(6, 18), Math.random() * 3, 0, 7); g.stroke(); }
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
    return t;
  }
  S.onTheme = th => {
    K3.clear(sea);
    const id = Play.cfg.theme;
    mode = id === 'space' || id === 'night' ? 'space' : id === 'winter' || id === 'ice' ? 'ice' : 'sea';
    const water = mode === 'space' ? '#0B0820' : mode === 'ice' ? '#2C5A86' : '#1E7F92';
    scene.background = new THREE.Color(water);
    scene.fog = new THREE.Fog(water, mode === 'space' ? 20 : 8, mode === 'space' ? 70 : 44);
    S.hemi.color = K3.col(mode === 'space' ? '#B48CFF' : '#BFEFFF');
    /* القاع */
    const floorC = mode === 'space' ? '#3A2A7A' : mode === 'ice' ? '#DCE8F4' : '#E7D3A2';
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 40, 40), K3.mat(floorC, { map: K3.groundTexture(mode === 'sea' ? { ...th, deco: 'coral', ground: floorC, ground2: '#CDB27A' } : th, 14), flatShading: true }));
    const fp = floor.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * .3) * .4 + Math.cos(fp.getY(i) * .25) * .5);
    floor.geometry.computeVertexNormals();
    floor.rotation.x = -Math.PI / 2; sea.add(floor);
    if (mode === 'sea') {
      caustic = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: causticTex(), transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending }));
      caustic.rotation.x = -Math.PI / 2; caustic.position.y = .6; sea.add(caustic);
      /* أشعة ضوء من السطح */
      rays = [];
      for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 22, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#E6FBFF', transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide })); r.position.set(K3.rnd(-14, 14), 11, K3.rnd(-14, 8)); r.rotation.z = K3.rnd(-.2, .2); sea.add(r); rays.push(r); }
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: '#BFEFFF', transparent: true, opacity: .25, side: THREE.DoubleSide })); surface.rotation.x = Math.PI / 2; surface.position.y = SB.top + 3; sea.add(surface);
    } else if (mode === 'ice') {
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 30, 30), K3.mat('#EAF6FF', { side: THREE.DoubleSide, flatShading: true, transparent: true, opacity: .9 }));
      const cp = ceil.geometry.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.random() * .8);
      ceil.geometry.computeVertexNormals(); ceil.rotation.x = Math.PI / 2; ceil.position.y = SB.top + 2.5; sea.add(ceil);
      for (let i = 0; i < 30; i++) { const ic = new THREE.Mesh(new THREE.ConeGeometry(K3.rnd(.2, .5), K3.rnd(1, 2.6), 6), K3.mat('#CFEFFF', { flatShading: true, transparent: true, opacity: .85 })); ic.rotation.x = Math.PI; ic.position.set(K3.rnd(-20, 20), SB.top + 1.6, K3.rnd(-20, 14)); sea.add(ic); }
    } else {
      for (let i = 0; i < 5; i++) { const p = K3.planet(K3.rnd(1, 2.4), ['#8E6CF0', '#E8761E', '#2E7D9A'][i % 3], '#F6E7A8'); p.position.set(K3.rnd(-25, 25), K3.rnd(10, 18), K3.rnd(-30, -10)); sea.add(p); }
    }
    /* مرجان وصخور وأعشاب تتمايل (أو بلورات وكويكبات) */
    weeds = [];
    for (let i = 0; i < 46; i++) {
      const x = K3.rnd(-22, 22), z = K3.rnd(-22, 16);
      if (Math.abs(x) < 3 && z > 6) continue;
      let p;
      if (mode === 'sea') p = i % 3 ? K3.prop({ ...th, deco: 'coral' }, K3.rnd(1.2, 2.2)) : K3.rocks({ ...th, deco: 'coral' }, K3.rnd(1, 2));
      else if (mode === 'ice') p = i % 2 ? K3.prop({ ...th, deco: 'crystals' }, K3.rnd(1, 2)) : K3.rocks({ ...th, deco: 'crystals' }, K3.rnd(1, 2));
      else p = i % 2 ? K3.prop({ ...th, deco: 'space' }, K3.rnd(1, 2)) : K3.rocks({ ...th, deco: 'space' }, K3.rnd(1, 2));
      p.position.set(x, 0, z); p.rotation.y = Math.random() * 6; sea.add(p);
    }
    if (mode === 'sea') for (let i = 0; i < 40; i++) {
      const h = K3.rnd(1.5, 4), w = new THREE.Mesh(new THREE.BoxGeometry(.12, h, .05), K3.mat(i % 2 ? '#2E8C6A' : '#3FA37A'));
      w.geometry.translate(0, h / 2, 0); w.position.set(K3.rnd(-20, 20), 0, K3.rnd(-20, 14)); sea.add(w); weeds.push({ m: w, ph: Math.random() * 6 });
    }
    /* جسيمات طافية: فقاعات صغيرة أو نجوم */
    K3.weather(S, mode === 'space' ? { ...th, fx: 'stars' } : { ...th, fx: 'bubbles' }, { w: 22, h: 12, d: 36, cz: -2, cy: 0 });
    if (sub) scene.remove(sub);
    sub = makeSub(th);
    scene.add(sub);
    if (S.q) spawnBubbles(bubbles.map(b => ({ a: b.a, x: b.x, y: b.y, z: b.z, state: b.state })));
  };

  /* ---------- الغواصة (أو المركبة) ---------- */
  function makeSub(th) {
    const g = new THREE.Group(), body = new THREE.Group();
    g.add(body);
    const yellow = K3.mat(mode === 'space' ? '#EDE6FF' : '#F7C948'), trim = K3.mat(mode === 'space' ? th.accent : '#E8761E');
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), yellow); hull.scale.set(1, .8, 1.7); body.add(hull);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, .7, 16), yellow); tower.position.set(0, .85, -.2); body.add(tower);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .6, 8), K3.mat('#5A5A66')); scope.position.set(0, 1.45, -.3); body.add(scope);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#BFEFFF', transparent: true, opacity: .45, shininess: 120 })); dome.position.set(0, .5, -.95); body.add(dome);
    const rider = K3.player(); rider.scale.setScalar(.55); rider.position.set(0, .7, -.95); body.add(rider);
    for (const z of [-.2, .5, 1.1]) for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.16, 14), K3.glow('#FFF3B0')); w.position.set(sx * .99, .05, z); w.rotation.y = sx * Math.PI / 2; body.add(w); const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .04, 6, 14), trim); ring.position.copy(w.position); ring.rotation.y = w.rotation.y; body.add(ring); }
    for (const sx of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.9, .08, .5), trim); fin.position.set(sx * .9, 0, 1.2); body.add(fin); }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.08, .9, .6), trim); tail.position.set(0, .2, 1.55); body.add(tail);
    const prop = new THREE.Group(); prop.position.set(0, 0, 1.78); body.add(prop);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.12, .7, .05), K3.mat('#5A5A66')); b.rotation.z = i * Math.PI / 1.5; prop.add(b); }
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFF3B0', transparent: true, opacity: .7, depthWrite: false })); lamp.scale.set(1.6, 1.6, 1); lamp.position.set(0, -.1, -1.75); body.add(lamp);
    const spot = new THREE.SpotLight('#FFF3B0', 1.2, 18, .45, .6); spot.position.set(0, 0, -1.6); spot.target.position.set(0, -1, -8); body.add(spot, spot.target);
    g.userData = { body, prop, rider };
    return g;
  }

  /* ---------- الفقاعات الكبيرة ---------- */
  function bubble(a) {
    const th = K3.theme(), g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 20), new THREE.MeshPhongMaterial({ color: mode === 'space' ? '#C9B4FF' : '#BFEFFF', transparent: true, opacity: .32, depthWrite: false, shininess: 140, specular: K3.col('#FFFFFF'), emissive: K3.col('#F4A6C1').multiplyScalar(.08) }));
    g.add(ball);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, .025, 6, 40), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .5 })); g.add(rim);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), K3.glow('#FFFFFF')); hl.scale.set(1.4, .7, .4); hl.position.set(-.45, .55, .85); g.add(hl);
    const sign = K3.sign(a.t, { h: .75, px: 64 }); sign.renderOrder = 8; sign.material.depthTest = false;
    if (sign.scale.x > 2.6) sign.scale.set(2.6, 2.6 / sign.userData.ratio, 1);
    g.add(sign);
    g.userData = { ball, sign };
    return g;
  }
  function spawnBubbles(keep) {
    bubbles.forEach(b => sea.remove(b.g));
    bubbles = [];
    const list = keep && keep.length ? keep : mixAnswers(S.q, 6, []).map(a => ({ a }));
    list.forEach(it => {
      if (it.state === 'gone') return;
      let { x, y, z } = it;
      if (x == null) for (let t = 0; t < 60; t++) { x = K3.rnd(-SB.half + 2, SB.half - 2); y = K3.rnd(2.5, SB.top - 1); z = K3.rnd(-SB.half + 2, SB.half - 6); if (Math.hypot(x - P.x, z - P.z) > 7 && bubbles.every(b => Math.hypot(b.x - x, b.y - y, b.z - z) > 4.5)) break; }
      const g = bubble(it.a); g.position.set(x, y, z); sea.add(g);
      bubbles.push({ a: it.a, g, x, y, z, ph: Math.random() * 6, state: it.state || '', t: 0, rise: keep ? 1 : 0 });
    });
  }
  S.bubbles = () => bubbles;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    spawnBubbles();
  };

  /* ---------- الإطلاق ---------- */
  let lastShot = 0;
  S.fire = () => {
    if (!S.started || Play.finished || S.t - lastShot < .25) return;
    lastShot = S.t;
    const dir = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    const m = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), K3.glow('#FFFFFF'));
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: K3.theme().gold, transparent: true, opacity: .9, depthWrite: false })); h.scale.set(1.2, 1.2, 1); m.add(h);
    m.position.set(P.x + dir.x * 1.9, P.y, P.z + dir.z * 1.9);
    scene.add(m);
    shots.push({ m, dir, life: 1.3 });
    FX.play('shoot');
  };
  function popBubble(b) {
    const pos = b.g.position.clone(), pt = S.screen(pos);
    if (b.a.ok) {
      b.state = 'good'; b.t = 0;
      for (let i = 0; i < 20; i++) {
        const m = i % 3 ? K3.starMesh(.14, i % 2 ? K3.theme().gold : '#FFFFFF', .05) : new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshPhongMaterial({ color: '#FFF6F0', shininess: 120 }));
        m.position.copy(pos); scene.add(m);
        const a = Math.random() * 6.28, e = K3.rnd(-1, 1.2);
        bits.push({ m, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(K3.rnd(2, 5)), life: 1 });
      }
      S.collected.push(b.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      b.state = 'bad'; b.t = 0;
      for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(K3.rnd(.3, .6), 8, 6), new THREE.MeshBasicMaterial({ color: '#1A1426', transparent: true, opacity: .75 })); m.position.copy(pos); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 2, K3.rnd(-1, 1.5), Math.sin(a) * 2), life: 1, ink: true }); }
      ink.classList.remove('on'); void ink.offsetWidth; ink.classList.add('on');
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- التحكم: عصا يسارًا، وأزرار للصعود والنزول والإطلاق ---------- */
  K3.controls(S, { hold: joy.hold, tap(e) { if (e) S.fire(); } });
  const mkBtn = (cls, svg, fn) => { const b = el('button', 'k3-btn ' + cls, svg); let iv = null; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!S.started) S.begin(); fn(true); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, () => fn(false))); S.wrap.appendChild(b); return b; };
  const vert = { up: false, down: false };
  mkBtn('k3-fire', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>', on => { if (on) S.fire(); });
  mkBtn('k3-up', '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>', on => { vert.up = on; });
  mkBtn('k3-down', '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>', on => { vert.down = on; });
  document.addEventListener('keydown', e => { if (S.wrap.isConnected && S.started && (e.code === 'KeyF' || e.code === 'Space')) { e.preventDefault(); S.fire(); } });

  S.onFrame = dt => {
    if (!sub) return;
    const live = S.started && !Play.finished, k = S.keys;
    const inp = live ? joy.read() : { x: 0, z: 0 };
    /* الحركة بالنسبة للكاميرا (الكاميرا خلف الغواصة دائمًا تقريبًا) */
    const tx = inp.x * 5.5, tz = inp.z * 5.5;
    const ty = live ? ((k.KeyE || k.PageUp || vert.up ? 1 : 0) - (k.KeyQ || k.PageDown || vert.down ? 1 : 0)) * 4 : 0;
    P.vx += (tx - P.vx) * Math.min(1, dt * 3); P.vz += (tz - P.vz) * Math.min(1, dt * 3); P.vy += (ty - P.vy) * Math.min(1, dt * 3);
    P.x = Math.max(-SB.half, Math.min(SB.half, P.x + P.vx * dt));
    P.z = Math.max(-SB.half, Math.min(SB.half, P.z + P.vz * dt));
    P.y = Math.max(SB.bottom + .6, Math.min(SB.top, P.y + P.vy * dt));
    if (Math.hypot(P.vx, P.vz) > .4) P.yaw = Math.atan2(P.vx, P.vz);
    const { body, prop, rider } = sub.userData;
    sub.position.set(P.x, P.y + Math.sin(S.t * 1.6) * .08, P.z);
    sub.rotation.y += ((P.yaw + Math.PI - sub.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
    body.rotation.z = -P.vx * .03; body.rotation.x = P.vy * .05;
    prop.rotation.z += dt * (4 + Math.hypot(P.vx, P.vz) * 3);
    rider.userData.body.rotation.y += dt * 1.4;
    /* الفقاعات تتهادى صعودًا ونزولًا */
    bubbles.forEach(b => {
      const g = b.g;
      b.rise = Math.min(1, b.rise + dt * 1.4);
      if (b.state === 'good' || b.state === 'bad') { b.t += dt; g.scale.setScalar(Math.max(.01, 1 + b.t * 2.5 - b.t * b.t * 8)); g.userData.sign.visible = false; if (b.t > .45) { b.state = 'gone'; sea.remove(g); } return; }
      if (b.state === 'gone') return;
      g.position.y = b.y + Math.sin(S.t * 1.1 + b.ph) * .5 - (1 - K3.ease(b.rise)) * 6;
      g.position.x = b.x + Math.sin(S.t * .6 + b.ph) * .4;
      g.userData.ball.rotation.y += dt * .5;
      g.scale.setScalar(1 + Math.sin(S.t * 2.4 + b.ph) * .03);
      /* لمس الفقاعة بالغواصة يفقعها أيضًا */
      if (live && !S.answered && !Play.roundDone && g.position.distanceTo(sub.position) < 2.1) popBubble(b);
    });
    if (S.q && live && !S.answered && !Play.roundDone && !bubbles.some(b => !b.state && b.a.ok)) spawnBubbles(mixAnswers(S.q, 6, S.collected).map(a => ({ a })));
    /* كرات الضوء */
    shots.forEach(s => {
      s.life -= dt; s.m.position.addScaledVector(s.dir, 16 * dt);
      const b = bubbles.find(b => !b.state && b.g.position.distanceTo(s.m.position) < 1.3);
      if (b && !S.answered && !Play.roundDone) { popBubble(b); s.life = 0; }
      if (s.life <= 0) scene.remove(s.m);
    });
    shots = shots.filter(s => s.life > 0);
    bits.forEach(b => { b.life -= dt * (b.ink ? .8 : 1.1); b.v.multiplyScalar(1 - dt * 1.5); b.v.y += (b.ink ? 0 : .6) * dt; b.m.position.addScaledVector(b.v, dt); if (b.ink) { b.m.scale.setScalar(1 + (1 - b.life) * 2); b.m.material.opacity = Math.max(0, b.life * .75); } else b.m.scale.setScalar(Math.max(.01, b.life)); if (b.life <= 0) scene.remove(b.m); });
    bits = bits.filter(b => b.life > 0);
    weeds.forEach(w => { w.m.rotation.z = Math.sin(S.t * 1.4 + w.ph) * .25; w.m.rotation.x = Math.cos(S.t * 1.1 + w.ph) * .15; });
    if (caustic) caustic.material.map.offset.set(Math.sin(S.t * .2) * .3, S.t * .02);
    rays.forEach((r, i) => { r.material.opacity = .05 + Math.sin(S.t * .7 + i) * .03; });
    /* كاميرا خلف الغواصة ومن فوق قليلًا */
    const cx = P.x, cz = P.z + 8.5, cy = P.y + 2.8;
    camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 3);
    camera.position.y += (cy - camera.position.y) * Math.min(1, dt * 3);
    camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 3);
    camera.lookAt(P.x, P.y, P.z - 4);
  };
  camera.position.set(0, 7, 18);
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !SUB || !SUB.wrap.isConnected) {
      if (SUB) SUB.wrap.remove();
      SUB = subScene();
      Play.board.appendChild(SUB.wrap);
      SUB.size();
    }
    SUB.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(SUB.paint.el, SUB.wrap);
    K3.fonts.then(() => SUB.setQuestion(q));
  },
});
