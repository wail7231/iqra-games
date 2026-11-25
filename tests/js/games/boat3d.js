/* القارب الحر (ثلاثي الأبعاد) — بحيرة واسعة بأمواج، وقارب يقوده الطالب بحرية:
   يمين/يسار للالتفاف، أعلى للتقدّم، أسفل للرجوع (بالأسهم، أو بعصا التحكم تحت الإصبع).
   تطفو في البحيرة عوّامات عليها الإجابات: الاصطدام بالصحيحة يجمعها (نقطة إن كانت أول اختيار)،
   والخاطئة تنفجر وتدفع القارب وتُنقص قلبًا. في البحيرة جزر وصخور يلتفّ حولها، ورذاذ ماء خلف القارب.
   شكل القارب والماء والشاطئ يتبع قالب الشكل. */
'use strict';

let BOAT = null;
const LAKE_R = 24;
const WATER = {
  classic: ['#3FA9BC', '#7FD0DC'], night: ['#0E1A44', '#24346A'], garden: ['#4FA3C7', '#8CD0F2'], ice: ['#5FB3E3', '#BFE3F3'],
  notebook: ['#D6E3F2', '#FFFFFF'], ocean: ['#0E7C86', '#3FB0B8'], space: ['#2A1D5E', '#6E52C8'], autumn: ['#4C7A68', '#7FA894'],
  summer: ['#1E9AAE', '#5FC9D6'], winter: ['#3B5BA9', '#8EA6C8'],
};

function boatScene() {
  const S = K3.create({ fov: 55, fogNear: 30, fogFar: 85, ratio: .62 });
  const { scene, camera } = S;
  const field = new THREE.Group();
  scene.add(field);
  const joy = K3.joystick(S);
  let water, waterGeo, boat, wake = [], rocks = [], buoys = [], drifters = [];
  const P = S.P = { x: 0, z: 8, a: Math.PI, v: 0, push: null };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const maxV = () => 6 + Play.cfg.speed * .7;

  /* ---------- البحيرة والشاطئ والجزر ---------- */
  S.onTheme = th => {
    const wc = WATER[Play.cfg.theme] || WATER.classic;
    waterGeo = new THREE.CircleGeometry(LAKE_R + 2, 64, 0, Math.PI * 2);
    waterGeo = new THREE.PlaneGeometry((LAKE_R + 3) * 2, (LAKE_R + 3) * 2, 56, 56);
    const cols = [], c1 = K3.col(wc[0]), c2 = K3.col(wc[1]);
    for (let i = 0; i < waterGeo.attributes.position.count; i++) { const c = c1.clone().lerp(c2, Math.random() * .6); cols.push(c.r, c.g, c.b); }
    waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 70, specular: K3.col('#FFFFFF').multiplyScalar(.3), transparent: true, opacity: .93 }));
    water.rotation.x = -Math.PI / 2;
    S.env.add(water);
    /* الشاطئ: حلقة من الأرض حول البحيرة وزينة القالب عليها */
    const shore = new THREE.Mesh(new THREE.RingGeometry(LAKE_R + .5, LAKE_R + 40, 64), K3.mat(th.ground, { map: K3.groundTexture(th, 12), side: THREE.DoubleSide }));
    shore.rotation.x = -Math.PI / 2; shore.position.y = .35;
    S.env.add(shore);
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(LAKE_R + .6, LAKE_R + 1.4, 1, 64, 1, true), K3.mat(th.ground2, { side: THREE.DoubleSide }));
    bank.position.y = -.1; S.env.add(bank);
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2 + K3.rnd(-.05, .05), r = LAKE_R + K3.rnd(2.5, 9);
      const p = K3.prop(th, K3.rnd(1.2, 2));
      p.position.set(Math.cos(a) * r, .35, Math.sin(a) * r); p.rotation.y = Math.random() * 6;
      S.env.add(p);
    }
    K3.scatter(S.env, th, { count: 420, at: () => { const a = Math.random() * Math.PI * 2, r = LAKE_R + K3.rnd(1.2, 14); return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: .35 }; } });
    K3.horizon(S, th, { radius: 80 });
    K3.weather(S, th, { w: 30, h: 14, d: 50, cz: 0 });
    /* جزر وصخور داخل البحيرة يلتفّ حولها القارب */
    rocks = [];
    const spots = [[-9, -6, 2.2], [10, -10, 2.6], [6, 9, 1.8], [-12, 10, 2], [0, -17, 2.4], [16, 3, 1.6], [-17, -2, 1.7], [-3, 3, 1.2], [12, 14, 1.5], [-6, -15, 1.3], [18, -6, 1.2], [-15, 15, 1.4], [3, -8, 1], [-19, 7, 1.1]];
    spots.forEach(([x, z, r]) => {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), K3.mat(th.dark ? '#3A3570' : th.sketch ? '#FFFFFF' : '#9C8A70', { flatShading: true }));
      rock.scale.y = .45; g.add(rock);
      if (th.sketch) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(rock.geometry), new THREE.LineBasicMaterial({ color: '#2B4C7E' })));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * .8, r * .95, .3, 9), K3.mat(th.ground, { flatShading: true }));
      top.position.y = r * .42; g.add(top);
      const p = K3.prop(th, r * .55); p.position.y = r * .55; g.add(p);
      g.position.set(x, 0, z);
      S.env.add(g);
      rocks.push({ x, z, r: r * .95 });
    });
    /* عوائق طافية تتهادى مع الموج: براميل وجذوع وصناديق تدفع القارب إن اصطدم بها */
    drifters.forEach(d => scene.remove(d.g));
    drifters = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group(), kind = i % 3;
      if (kind === 0) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.1, 14), K3.mat(i % 2 ? '#C0392B' : '#A0603A'));
        barrel.rotation.z = Math.PI / 2; g.add(barrel);
        for (const x of [-.35, .35]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(.46, .05, 6, 20), K3.mat('#5A5A66')); hoop.rotation.y = Math.PI / 2; hoop.position.x = x; g.add(hoop); }
      } else if (kind === 1) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, 2.6, 10), K3.mat('#8A5A30', { flatShading: true }));
        log.rotation.z = Math.PI / 2; g.add(log);
        for (const x of [-1.3, 1.3]) { const end = new THREE.Mesh(new THREE.CircleGeometry(.3, 12), K3.mat('#D9B98A')); end.position.x = x; end.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(end); }
      } else {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 1), K3.mat('#B98446')); g.add(crate);
        const band = new THREE.Mesh(new THREE.BoxGeometry(1.04, .1, 1.04), K3.mat('#7A4A2A')); g.add(band);
      }
      let x, z;
      for (let t = 0; t < 40; t++) { const a = Math.random() * Math.PI * 2, rr = K3.rnd(4, LAKE_R - 3); x = Math.cos(a) * rr; z = Math.sin(a) * rr; if (rocks.every(k => Math.hypot(k.x - x, k.z - z) > k.r + 2) && Math.hypot(x - P.x, z - P.z) > 5) break; }
      g.position.set(x, 0, z);
      scene.add(g);
      const a = Math.random() * Math.PI * 2;
      drifters.push({ g, x, z, vx: Math.cos(a) * K3.rnd(.6, 1.3), vz: Math.sin(a) * K3.rnd(.6, 1.3), r: kind === 1 ? 1.3 : .7, ph: Math.random() * 6, spin: K3.rnd(-.3, .3), hit: 0 });
    }
    if (boat) scene.remove(boat);
    boat = makeBoat(th);
    scene.add(boat);
    wake.forEach(w => scene.remove(w.m));
    wake = [];
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: th.dark ? '#9DB3D9' : '#FFFFFF', transparent: true, opacity: 0 }));
      scene.add(m); wake.push({ m, life: 0 });
    }
    if (S.q) spawn(buoys.map(b => ({ a: b.a, x: b.g.position.x, z: b.g.position.z, state: b.state })));
  };

  /* ---------- القارب: بدن وشراع وشكل اللاعب على مقدمته ---------- */
  function makeBoat(th) {
    const g = new THREE.Group(), id = Play.cfg.theme;
    const hullC = { space: '#22164A', night: '#1B2752', notebook: '#FFFFFF', winter: '#C0392B', ice: '#FFFFFF' }[id] || '#A0603A';
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 1.6); hullShape.quadraticCurveTo(.9, .9, .85, -1.1); hullShape.lineTo(-.85, -1.1); hullShape.quadraticCurveTo(-.9, .9, 0, 1.6);
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: .55, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 3 });
    hullGeo.rotateX(Math.PI / 2); hullGeo.translate(0, .45, 0);
    const hull = new THREE.Mesh(hullGeo, K3.mat(hullC, { emissive: th.dark ? K3.col(th.accent).multiplyScalar(.15) : K3.col('#000000') }));
    hull.rotation.y = 0; g.add(hull);
    if (th.sketch) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(hullGeo, 30), new THREE.LineBasicMaterial({ color: '#2B4C7E' })));
    const deck = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: .06, bevelEnabled: false }), K3.mat(th.dark ? '#3A4A80' : '#F3E3C3'));
    deck.geometry.rotateX(Math.PI / 2); deck.scale.set(.85, 1, .85); deck.position.y = .5; g.add(deck);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(1, .05, 6, 40), K3.mat(th.accent));
    stripe.scale.set(.86, 1.35, 1); stripe.rotation.x = Math.PI / 2; stripe.position.set(0, .28, .25); g.add(stripe);
    if (id === 'space') {
      /* مركبة فضاء: حلقة مضيئة ومحركان */
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .08, 8, 40), K3.glow(th.accent)); ring.rotation.x = Math.PI / 2; ring.position.y = .3; g.add(ring);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, .6, 10), K3.glow('#F7A93B')); e.rotation.x = Math.PI / 2; e.position.set(sx * .45, .35, -1.2); g.add(e); }
    } else {
      /* صاري وشراع منتفخ بلون القالب، وعلم صغير */
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, 2.6, 8), K3.mat('#6B4A2E')); mast.position.set(0, 1.75, .35); g.add(mast);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.9, 6), K3.mat('#6B4A2E')); yard.rotation.z = Math.PI / 2; yard.position.set(0, 2.85, .4); g.add(yard);
      const sailGeo = new THREE.PlaneGeometry(1.6, 1.9, 8, 8), sp = sailGeo.attributes.position;
      for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, Math.cos(x / .8 * Math.PI / 2) * .32 * (1 - Math.abs(y) / 1.6)); }
      sailGeo.computeVertexNormals();
      const sail = new THREE.Mesh(sailGeo, K3.mat(id === 'notebook' ? '#FFFFFF' : th.card, { side: THREE.DoubleSide }));
      sail.position.set(0, 1.85, .45); sail.scale.set(1.05, .95, 1); g.add(sail);
      g.userData.sail = sail;
      const band = new THREE.Mesh(new THREE.PlaneGeometry(1.45, .32), K3.mat(th.accent, { side: THREE.DoubleSide }));
      band.position.set(0, 1.6, .62); g.add(band);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(.5, .28), K3.mat(th.gold, { side: THREE.DoubleSide }));
      flag.position.set(.25, 3.2, .35); g.add(flag);
      g.userData.flag = flag;
    }
    const rider = K3.player();
    rider.scale.setScalar(.62);
    rider.position.set(0, 1.0, -.55);
    g.add(rider);
    g.userData.rider = rider;
    return g;
  }

  /* ---------- العوّامات ---------- */
  function buoy(a, th) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.45, .6, .9, 16), K3.mat('#FFFFFF'));
    body.position.y = .3; g.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.47, .55, .3, 16), K3.mat(th.accent));
    band.position.y = .3; g.add(band);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.32, .55, 12), K3.mat(th.accent)); cap.position.y = 1.0; g.add(cap);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), K3.glow(th.gold)); lamp.position.y = 1.35; g.add(lamp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .05, 6, 32), K3.glow(th.gold, { transparent: true, opacity: .6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .05; g.add(ring);
    const sign = K3.sign(a.t, { h: .95, px: 64 });
    if (sign.scale.x > 3.8) sign.scale.set(3.8, 3.8 / sign.userData.ratio, 1);
    sign.position.y = 2.25;
    g.add(sign);
    g.userData = { sign, ring, lamp };
    return g;
  }
  function spawn(keep) {
    const th = K3.theme();
    buoys.forEach(b => field.remove(b.g));
    buoys = [];
    const list = keep || mixAnswers(S.q).map(a => ({ a }));
    list.forEach(it => {
      if (it.state === 'gone') return;
      let x = it.x, z = it.z;
      if (x == null) {
        for (let t = 0; t < 80; t++) {
          const ang = Math.random() * Math.PI * 2, r = K3.rnd(3, LAKE_R - 3);
          x = Math.cos(ang) * r; z = Math.sin(ang) * r;
          const free = rocks.every(k => Math.hypot(k.x - x, k.z - z) > k.r + 2) && buoys.every(b => Math.hypot(b.g.position.x - x, b.g.position.z - z) > 5);
          if (free && Math.hypot(x - P.x, z - P.z) > 6) break;
        }
      }
      const g = buoy(it.a, th);
      g.position.set(x, 0, z);
      field.add(g);
      const b = { a: it.a, g, state: it.state || '', ph: Math.random() * 6, t: 0 };
      buoys.push(b);
      if (b.state === 'good') paintGood(b);
    });
  }
  function paintGood(b) {
    K3.tint(b.g, '#4CAF50', .7);
    K3.recolorSign(b.g.userData.sign, '✓ ' + b.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
  }
  S.buoys = () => buoys;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    spawn();
  };
  function hit(b) {
    if (b.state || S.answered || Play.roundDone) return;
    const pt = b.g.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    if (b.a.ok) {
      b.state = 'good';
      paintGood(b);
      S.collected.push(b.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      b.state = 'bad';
      K3.tint(b.g, '#C0392B', .7);
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      const dx = P.x - b.g.position.x, dz = P.z - b.g.position.z, d = Math.hypot(dx, dz) || 1;
      P.push = { vx: dx / d * 9, vz: dz / d * 9, t: .45 };
      P.v *= -.3;
      Play.mistake();
    }
  }

  K3.controls(S, { hold: joy.hold });

  /* ارتفاع الموج في نقطة */
  const wave = (x, z, t) => Math.sin(x * .45 + t * 1.6) * .16 + Math.cos(z * .38 + t * 1.2) * .14 + Math.sin((x + z) * .8 + t * 2.3) * .05;

  S.onFrame = dt => {
    const t = S.t;
    /* الأمواج: تحريك رؤوس سطح الماء */
    if (waterGeo) {
      const p = waterGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, wave(x, -y, t)); }
      p.needsUpdate = true;
      waterGeo.computeVertexNormals();
    }
    /* القيادة: يمين/يسار يلتفّ، أعلى يتقدّم، أسفل يرجع */
    const live = S.started && !Play.finished;
    const inp = live ? joy.read() : { x: 0, z: 0 };
    const thrust = -inp.z;
    P.v += (thrust * (thrust > 0 ? maxV() : maxV() * .45) - P.v) * Math.min(1, dt * (thrust ? 1.6 : .9));
    P.a -= inp.x * dt * (1.4 + Math.min(1, Math.abs(P.v) / 4) * 1.2) * (P.v < -.2 ? -1 : 1);
    let vx = Math.sin(P.a) * P.v, vz = Math.cos(P.a) * P.v;
    if (P.push) { vx += P.push.vx; vz += P.push.vz; P.push.t -= dt; if (P.push.t <= 0) P.push = null; }
    let nx = P.x + vx * dt, nz = P.z + vz * dt;
    /* حدود البحيرة والصخور */
    const r = Math.hypot(nx, nz);
    if (r > LAKE_R - 1.4) { nx *= (LAKE_R - 1.4) / r; nz *= (LAKE_R - 1.4) / r; P.v *= .7; }
    rocks.forEach(k => { const dx = nx - k.x, dz = nz - k.z, d = Math.hypot(dx, dz), m = k.r + 1.1; if (d < m) { nx = k.x + dx / d * m; nz = k.z + dz / d * m; P.v *= .85; } });
    /* العوائق الطافية: تتحرك وترتد عن الصخور والحافة، والاصطدام بها يدفع القارب */
    drifters.forEach(d => {
      d.x += d.vx * dt; d.z += d.vz * dt;
      const rr = Math.hypot(d.x, d.z);
      if (rr > LAKE_R - 2) { d.vx = -d.vx; d.vz = -d.vz; d.x *= (LAKE_R - 2.1) / rr; d.z *= (LAKE_R - 2.1) / rr; }
      rocks.forEach(k => { if (Math.hypot(k.x - d.x, k.z - d.z) < k.r + d.r) { d.vx = -d.vx; d.vz = -d.vz; } });
      d.g.position.set(d.x, wave(d.x, d.z, S.t) + .05, d.z);
      d.g.rotation.y += d.spin * dt; d.g.rotation.x = Math.sin(S.t * 1.4 + d.ph) * .12;
      d.hit = Math.max(0, d.hit - dt);
      const dx = nx - d.x, dz = nz - d.z, dd = Math.hypot(dx, dz), m = d.r + 1;
      if (dd < m && dd > 0) {
        nx = d.x + dx / dd * m; nz = d.z + dz / dd * m;
        if (!d.hit && Math.abs(P.v) > 1.5) { d.hit = 1; P.v *= -.35; d.vx -= dx / dd * 1.5; d.vz -= dz / dd * 1.5; FX.play('bad'); Play.board.classList.remove('shake'); void Play.board.offsetWidth; Play.board.classList.add('shake'); }
      }
    });
    P.x = nx; P.z = nz;
    if (boat) {
      const h = wave(P.x, P.z, t);
      boat.position.set(P.x, h - .1, P.z);
      boat.rotation.set(Math.sin(t * 1.7) * .05 - P.v * .006, P.a, -inp.x * Math.min(1, Math.abs(P.v) / 5) * .18 + Math.cos(t * 1.3) * .04, 'YXZ');
      if (boat.userData.flag) boat.userData.flag.rotation.y = Math.sin(t * 8) * .35;
      if (boat.userData.sail) boat.userData.sail.scale.z = 1 + Math.min(1, Math.abs(P.v) / 6) * .6 + Math.sin(t * 3) * .05;
      boat.userData.rider.userData.body.rotation.y += dt * 1.5;
    }
    /* رذاذ الماء خلف القارب */
    if (Math.abs(P.v) > 1.2 && boat) {
      const w = wake.reduce((m, x) => x.life < m.life ? x : m, wake[0]);
      if (w && w.life <= 0) {
        const s = Math.random() < .5 ? -1 : 1;
        w.m.position.set(P.x - Math.sin(P.a) * 1.2 + Math.cos(P.a) * s * .5, .15, P.z - Math.cos(P.a) * 1.2 - Math.sin(P.a) * s * .5);
        w.life = 1; w.vx = Math.cos(P.a) * s * 1.2; w.vz = -Math.sin(P.a) * s * 1.2;
      }
    }
    wake.forEach(w => {
      if (w.life <= 0) { w.m.material.opacity = 0; return; }
      w.life -= dt * .9;
      w.m.position.x += w.vx * dt; w.m.position.z += w.vz * dt;
      w.m.scale.set(1 + (1 - w.life) * 1.6, .35, 1 + (1 - w.life) * 1.6);
      w.m.material.opacity = Math.max(0, w.life) * .75;
    });
    /* العوّامات تتمايل مع الموج */
    buoys.forEach(b => {
      const g = b.g;
      if (b.state === 'good') { b.t += dt; g.position.y += dt * 1.6; g.rotation.y += dt * 5; if (b.t > 1.2) g.scale.setScalar(Math.max(.01, 1 - (b.t - 1.2) * 2)); if (b.t > 1.7) { b.state = 'gone'; field.remove(g); } return; }
      if (b.state === 'bad') { b.t += dt; g.position.y -= dt * 2.5; g.rotation.z += dt * 3; if (b.t > 1) { b.state = 'gone'; field.remove(g); } return; }
      if (b.state === 'gone') return;
      g.position.y = wave(g.position.x, g.position.z, t) - .05;
      g.rotation.z = Math.sin(t * 1.5 + b.ph) * .08;
      g.userData.ring.scale.setScalar(1 + ((t * .8 + b.ph) % 1) * .6);
      g.userData.ring.material.opacity = .7 * (1 - ((t * .8 + b.ph) % 1));
      if (live && Math.hypot(g.position.x - P.x, g.position.z - P.z) < 1.6) hit(b);
    });
    if (S.q && !S.answered && !Play.roundDone && !buoys.some(b => !b.state && b.a.ok)) {
      const keep = buoys.filter(b => b.state === 'good').map(b => b.a.t);
      spawn(mixAnswers(S.q, Infinity, [...S.collected, ...keep]).map(a => ({ a })));
    }
    /* كاميرا مطاردة خلف القارب */
    const cx = P.x - Math.sin(P.a) * 8.5, cz = P.z - Math.cos(P.a) * 8.5;
    camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 2.5);
    camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 2.5);
    camera.position.y += (5 - camera.position.y) * Math.min(1, dt * 2.5);
    camera.lookAt(P.x + Math.sin(P.a) * 5, .5, P.z + Math.cos(P.a) * 5);
  };
  camera.position.set(0, 5, 16);
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'السرعة', kind: 'range', min: 1, max: 10, def: 4 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !BOAT || !BOAT.wrap.isConnected) {
      if (BOAT) BOAT.wrap.remove();
      BOAT = boatScene();
      Play.board.appendChild(BOAT.wrap);
      BOAT.size();
    }
    BOAT.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(BOAT.wrap, BOAT.paint.el);
    K3.fonts.then(() => BOAT.setQuestion(q));
  },
});
