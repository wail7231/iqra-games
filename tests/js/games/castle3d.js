/* القلعة الدوّارة (ثلاثية الأبعاد) — برج دائري عالٍ، واللاعب يمشي حوله على ممرّ الطابق الذي هو فيه.
   يمين/يسار = الدوران حول البرج (والكاميرا تدور معه)، أعلى أو لمسة = قفزة.
   فوق كل طابق درجات بارزة من البرج عليها الإجابات: القفز إلى درجة الصحيحة يرفعه طابقًا (نقطة إن كانت أول اختيار)،
   والخاطئة تنهار ويسقط اللاعب إلى ممرّه ويُنقص قلبًا. الشكل يتبع قالب الشكل. */
'use strict';

let CASTLE = null;
const CT = { R: 3, walk: 3.75, H: 2.6 };    // نصف قطر البرج، ومسار اللاعب، وارتفاع الطابق

function castleScene() {
  const S = K3.create({ fov: 52, fogNear: 30, fogFar: 90, ratio: .66, maxH: 520 });
  const { scene, camera } = S;
  const joy = K3.joystick(S);
  let tower = null, hero, shadow, ledges = [], level = 0, built = 0;
  const P = S.P = { a: 0, y: 0, vy: 0, on: null, base: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;

  /* ---------- البرج: حجارة، وممرّ دائري لكل طابق، وشرفات ---------- */
  function stoneTexture(th) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = th.wall; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = th.sketch ? '#2B4C7E' : 'rgba(0,0,0,.18)'; g.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      const y = r * 32;
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      for (let x = (r % 2) * 32; x < 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,255,255,.1)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 128, 8, 4);
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
    return t;
  }
  function floorRing(th, y) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(CT.walk + .75, CT.walk + .75, .3, 48, 1, false), K3.mat(th.path));
    ring.position.y = y - .15; g.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(CT.walk + .75, .08, 6, 48), K3.mat(th.accent));
    lip.rotation.x = Math.PI / 2; lip.position.y = y; g.add(lip);
    /* أعمدة صغيرة على الحافة */
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5, 6), K3.mat(th.wall2));
      p.position.set(Math.cos(a) * (CT.walk + .72), y + .25, Math.sin(a) * (CT.walk + .72)); g.add(p);
    }
    return g;
  }
  function buildTower(th) {
    tower = new THREE.Group();
    S.env.add(tower);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 48), K3.mat(th.ground, { map: K3.groundTexture(th, 26) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.02;
    S.env.add(ground);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = K3.rnd(8, 22);
      const p = K3.prop(th, K3.rnd(1.2, 2)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      S.env.add(p);
    }
    K3.horizon(S, th, { radius: 80 });
    K3.weather(S, th, { w: 20, h: 40, d: 30, cz: 0 });
    for (let i = 0; i < 12; i++) {
      const c = K3.cloud(K3.rnd(1, 2), th.dark ? '#3A4A80' : '#FFFFFF', th.dark ? .5 : .85);
      const a = Math.random() * Math.PI * 2, r = K3.rnd(9, 16);
      c.position.set(Math.cos(a) * r, K3.rnd(6, 40), Math.sin(a) * r);
      c.userData.orbit = { a, r, s: K3.rnd(.03, .08) };
      S.env.add(c);
    }
    S.fx.push(dt => S.env.children.forEach(c => { const o = c.userData.orbit; if (o) { o.a += o.s * dt; c.position.x = Math.cos(o.a) * o.r; c.position.z = Math.sin(o.a) * o.r; } }));
    built = 0;
    growTo(level + 2, th);
  }
  /* يبني طوابق البرج حتى الطابق n */
  function growTo(n, th) {
    th = th || K3.theme();
    const tex = stoneTexture(th);
    while (built < n) {
      const y = built * CT.H;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(CT.R, CT.R, CT.H, 32, 1, true), K3.mat('#FFFFFF', { map: tex }));
      body.position.y = y + CT.H / 2; tower.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(CT.R + .12, CT.R + .12, .25, 32), K3.mat(th.wall2));
      band.position.y = y + CT.H - .12; tower.add(band);
      /* نوافذ مضيئة */
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + built * .7, w = new THREE.Mesh(new THREE.PlaneGeometry(.45, .7), K3.glow(th.dark ? '#F6E7A8' : '#3A2A1A'));
        w.position.set(Math.cos(a) * (CT.R + .01), y + 1.3, Math.sin(a) * (CT.R + .01)); w.lookAt(Math.cos(a) * 9, y + 1.3, Math.sin(a) * 9);
        tower.add(w);
      }
      tower.add(floorRing(th, y));
      built++;
    }
    /* قمّة البرج فوق آخر طابق */
    if (tower.userData.cap) tower.remove(tower.userData.cap);
    const cap = new THREE.Group(), top = built * CT.H;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(CT.R + .6, 3, 32), K3.mat(th.accent)); roof.position.y = top + 1.5; cap.add(roof);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8), K3.glow(th.gold)); tip.position.y = top + 3.1; cap.add(tip);
    tower.add(cap);
    tower.userData.cap = cap;
  }

  S.onTheme = th => {
    buildTower(th);
    if (hero) scene.remove(hero, shadow);
    hero = K3.player();
    shadow = K3.blob(.5, .3);
    scene.add(hero, shadow);
    if (S.q) placeLedges(true);
  };

  /* ---------- الدرجات: بارزة من البرج فوق الطابق الحالي، عليها الإجابات ---------- */
  function placeLedges(keep) {
    const th = K3.theme();
    ledges.forEach(l => tower && tower.remove(l.g));
    const list = keep && S.answers ? S.answers : mixAnswers(S.q, 4, S.collected);
    S.answers = list;
    const off = Math.random() * Math.PI * 2, y = (level + 1) * CT.H - .9;
    ledges = list.map((a, k) => {
      const ang = off + k / list.length * Math.PI * 2;
      const g = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .28, 1.5), K3.mat(th.gold));
      slab.position.set(0, 0, 0); g.add(slab);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.76, .08, 1.56), K3.mat(th.wall2)); trim.position.y = -.17; g.add(trim);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(.2, .7, 1.1), K3.mat(th.wall2)); brace.position.set(0, -.45, -.15); brace.rotation.x = .5; g.add(brace);
      const sign = K3.sign(a.t, { h: .85, px: 64 });
      if (sign.scale.x > 3.2) sign.scale.set(3.2, 3.2 / sign.userData.ratio, 1);
      sign.position.set(0, 1.25, .3);
      g.add(sign);
      g.position.set(Math.cos(ang) * CT.walk, y, Math.sin(ang) * CT.walk);
      g.rotation.y = -ang + Math.PI / 2;
      tower.add(g);
      return { a, g, ang, y, state: '', sign, fall: 0 };
    });
  }
  S.ledges = () => ledges;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false; S.answers = null;
    S.need = needAll(q) ? answersOf(q).length : 1;
    if (tower) placeLedges(false);
  };

  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const jump = () => { if (P.vy === 0 && !P.rise) { P.vy = 8.2; FX.play('tick'); } };
  K3.controls(S, {
    hold: joy.hold,
    dir(d) { if (d === 'up') jump(); },
    tap() { jump(); },
  });

  function land(l) {
    const pt = l.g.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    tower.localToWorld(pt);
    if (l.a.ok) {
      l.state = 'good';
      K3.tint(l.g, '#4CAF50', .7);
      K3.recolorSign(l.sign, '✓ ' + l.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
      S.collected.push(l.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); P.drop = .5; return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      /* صعود إلى الطابق التالي */
      P.rise = 1.1;
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      l.state = 'bad';
      K3.tint(l.g, '#C0392B', .7);
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      P.on = null; P.vy = 0;
      Play.mistake();
    }
  }

  S.onFrame = dt => {
    if (!tower) return;
    const live = S.started && !Play.finished;
    const inp = live ? joy.read() : { x: 0, z: 0 };
    if (inp.z < -.6 && joy.active) jump();
    /* الدوران حول البرج */
    if (!P.rise) P.a += inp.x * dt * 1.9;
    const floorY = level * CT.H;
    /* القفز والجاذبية والهبوط على درجة */
    if (P.rise) {
      P.rise -= dt;
      P.y += ((level + 1) * CT.H - P.y) * Math.min(1, dt * 5);
      if (P.rise <= 0) { P.rise = 0; level++; P.y = level * CT.H; P.vy = 0; P.on = null; growTo(level + 2); }
    } else if (P.on) {
      P.y = P.on.y + .14;
      if (P.drop) { P.drop -= dt; if (P.drop <= 0) { P.drop = 0; P.on = null; P.vy = 2; } }
      else if (P.vy > 0) P.on = null;
    } else if (P.y > floorY || P.vy > 0) {
      const prev = P.y;
      P.vy -= 22 * dt;
      P.y = Math.max(floorY, P.y + P.vy * dt);
      if (P.vy < 0) {
        const l = ledges.find(l => l.state !== 'bad' && Math.abs(angDiff(P.a, l.ang)) < .32 && prev >= l.y + .1 && P.y <= l.y + .14);
        if (l) { P.y = l.y + .14; P.vy = 0; P.on = l; if (!l.state && !S.answered && !Play.roundDone) land(l); }
      }
      if (P.y === floorY) P.vy = 0;
    }
    ledges.forEach(l => {
      if (l.state === 'bad') { l.fall += dt; l.g.position.y = l.y - l.fall * l.fall * 9; l.g.rotation.z += dt * 2; if (l.fall > 2.5) { tower.remove(l.g); l.state = 'gone'; } }
      else if (!l.state) l.g.children[0].material.emissive = K3.col(K3.theme().gold).multiplyScalar(.15 + Math.sin(S.t * 4 + l.ang) * .1);
    });
    /* اللاعب على مسار دائري حول البرج */
    const px = Math.cos(P.a) * CT.walk, pz = Math.sin(P.a) * CT.walk;
    if (hero) {
      hero.position.set(px, P.y + .5, pz);
      hero.rotation.y = -P.a;
      hero.userData.body.rotation.y += dt * (1 + Math.abs(inp.x) * 4);
      shadow.position.set(px, (P.on ? P.on.y + .15 : floorY) + .02, pz);
    }
    /* الكاميرا تدور مع اللاعب خارج البرج */
    const cr = 11.5, cy = P.y + 3.2;
    const ca = Math.atan2(camera.position.z, camera.position.x);
    const na = ca + angDiff(P.a, ca) * Math.min(1, dt * 3);
    camera.position.set(Math.cos(na) * cr, camera.position.y + (cy - camera.position.y) * Math.min(1, dt * 3), Math.sin(na) * cr);
    camera.lookAt(0, camera.position.y - 1.6, 0);
  };
  camera.position.set(11.5, 3.2, 0);
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !CASTLE || !CASTLE.wrap.isConnected) {
      if (CASTLE) CASTLE.wrap.remove();
      CASTLE = castleScene();
      Play.board.appendChild(CASTLE.wrap);
      CASTLE.size();
    }
    CASTLE.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(CASTLE.paint.el, CASTLE.wrap);
    K3.fonts.then(() => CASTLE.setQuestion(q));
  },
});
