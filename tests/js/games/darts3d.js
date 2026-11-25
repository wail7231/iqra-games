/* القوس والسهم (ثلاثي الأبعاد، منظور الشخص الأول) — يقف اللاعب وسط ساحة واسعة، والأهداف القشّية موزّعة حوله
   في كل الاتجاهات وبعيدة عن بعضها، فوق كل هدف لافتة إجابة. السحب على الشاشة (أو الأسهم) يدير النظر بحرية كاملة
   حول اللاعب، واللمسة القصيرة (أو المسافة أو زر الإطلاق) تشدّ القوس وتطلق سهمًا حقيقيًا يطير بقوس خفيف ويغرز
   حيث يصيب. الهدف الصحيح يخضرّ وتتطاير منه نجوم (نقطة إن كان أول اختيار)، والخاطئ يحمرّ ويهتز ويُنقص قلبًا.
   أسهم صغيرة على طرفي الشاشة تدلّ على أهداف لم تُصب بعد خارج النظر. */
'use strict';

let BOW = null;
/* سرعة السهم والجاذبية حقيقيتان تقريبًا: كلما بعُد الهدف نزل السهم أكثر، فيرفع اللاعب تصويبه قليلًا */
const BW = { eye: 1.7, speed: 33, g: 9.8, rMin: 12, rMax: 19, heights: [0, 2.6, 5.2, 8, 1.3, 6.5] };

function bowScene() {
  const S = K3.create({ fov: 62, fogNear: 30, fogFar: 85, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  const yard = new THREE.Group();
  scene.add(yard);
  let targets = [], flying = [], stuck = [], bits = [], bow = null, nocked = null, string = null, stands = [];
  const look = { yaw: 0, pitch: -.02 };
  const draw = { k: 0, state: 'ready', t: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  camera.position.set(0, BW.eye, 0);
  camera.rotation.order = 'YXZ';

  /* شعيرة ثابتة في وسط الشاشة، ومؤشرا الأهداف خارج النظر */
  const cross = el('div', 'k3-cross bow on', '<i></i><b></b>');
  S.wrap.appendChild(cross);
  const hintL = el('div', 'k3-hint l', '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>');
  const hintR = el('div', 'k3-hint r', '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>');
  S.wrap.append(hintL, hintR);

  /* ---------- السهم: قصبة خشبية، ونصل معدني، وثلاث ريشات، وفوق ---------- */
  function arrowMesh(th) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.05, 8), K3.mat('#C8A06A')); shaft.rotation.x = Math.PI / 2; g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.04, .16, 4), K3.mat('#9AA0AA', { flatShading: true })); tip.rotation.x = Math.PI / 2; tip.position.z = .6; g.add(tip);
    const nock = new THREE.Mesh(new THREE.CylinderGeometry(.026, .022, .06, 8), K3.mat(th.accent)); nock.rotation.x = Math.PI / 2; nock.position.z = -.53; g.add(nock);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .05, 8), K3.mat(th.gold)); band.rotation.x = Math.PI / 2; band.position.z = -.25; g.add(band);
    for (let i = 0; i < 3; i++) {
      const vane = new THREE.Mesh(new THREE.PlaneGeometry(.06, .22), K3.mat(i ? '#FFFFFF' : th.accent, { side: THREE.DoubleSide }));
      vane.rotation.x = Math.PI / 2; vane.position.z = -.4;
      const holder = new THREE.Group(); holder.rotation.z = i * Math.PI * 2 / 3; vane.position.x = .045; holder.add(vane); g.add(holder);
    }
    return g;   // النصل نحو +z
  }

  /* ---------- القوس في يد اللاعب (أسفل يمين النظر) ---------- */
  const TIP = { y: .57, z: -.41 };
  function makeBow(th) {
    if (bow) camera.remove(bow);
    bow = new THREE.Group();
    const frame = new THREE.Group(); frame.rotation.y = Math.PI / 2; bow.add(frame);
    const limbs = new THREE.Mesh(new THREE.TorusGeometry(.7, .028, 8, 40, 1.9), K3.mat('#7A4A24'));
    limbs.rotation.z = -.95; frame.add(limbs);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), K3.mat(th.gold));
      cap.position.set(Math.cos(.95) * .7, s * Math.sin(.95) * .7, 0); frame.add(cap);
      const inlay = new THREE.Mesh(new THREE.TorusGeometry(.7, .031, 6, 12, .25), K3.mat(th.accent)); inlay.rotation.z = s > 0 ? .35 : -.6; frame.add(inlay);
    }
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .22, 10), K3.mat('#3A2A1A')); grip.position.set(.7, 0, 0); frame.add(grip);
    for (let i = 0; i < 4; i++) { const wrap = new THREE.Mesh(new THREE.TorusGeometry(.042, .008, 4, 10), K3.mat(th.gold)); wrap.rotation.x = Math.PI / 2; wrap.position.set(.7, -.08 + i * .055, 0); frame.add(wrap); }
    const rest = new THREE.Mesh(new THREE.BoxGeometry(.04, .02, .05), K3.mat('#3A2A1A')); rest.position.set(.66, .11, 0); frame.add(rest);
    /* الوتر: خطّان من الطرفين إلى نقطة الشدّ */
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: '#F4EBD8' }));
    bow.add(string);
    nocked = arrowMesh(th); nocked.rotation.y = Math.PI; bow.add(nocked);
    bow.position.set(.32, -.36, -.62);
    bow.rotation.z = -.22;
    camera.add(bow);
    scene.add(camera);
    setDraw(0);
  }
  function setDraw(k) {
    const pull = k * .42, nz = TIP.z + pull;
    const p = string.geometry.attributes.position;
    p.setXYZ(0, 0, TIP.y, TIP.z); p.setXYZ(1, 0, 0, nz); p.setXYZ(2, 0, -TIP.y, TIP.z);
    p.needsUpdate = true;
    if (nocked) nocked.position.set(0, 0, nz - .53);
  }

  /* ---------- الساحة: عشب، ودائرة ممشى، وسياج، وبالات قش، ورايات ---------- */
  S.onTheme = th => {
    K3.clear(yard);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), K3.mat(th.ground, { map: K3.groundTexture(th, 26) }));
    ground.rotation.x = -Math.PI / 2; yard.add(ground);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.4, 48), K3.mat(th.path)); ring.rotation.x = -Math.PI / 2; ring.position.y = .01; yard.add(ring);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, .14, 32), K3.mat(th.wall2)); pad.position.y = .07; yard.add(pad);
    const padTop = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 32), K3.mat(th.gold)); padTop.rotation.x = -Math.PI / 2; padTop.position.y = .15; yard.add(padTop);
    /* سياج دائري بعيد */
    const R = 27;
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, post = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.6, .2), K3.mat('#8A5A30'));
      post.position.set(Math.cos(a) * R, .8, Math.sin(a) * R); yard.add(post);
    }
    for (const y of [.5, 1.3]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(R, .06, 4, 96), K3.mat('#A0703A')); rail.rotation.x = Math.PI / 2; rail.position.y = y; yard.add(rail); }
    /* بالات قش وصناديق أسهم ورايات بين الأهداف */
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + .2, r = K3.rnd(8, 11);
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.1, 14), K3.mat('#E2C46A', { flatShading: true }));
      bale.rotation.z = Math.PI / 2; bale.rotation.y = a; bale.position.set(Math.cos(a) * r, .55, Math.sin(a) * r); yard.add(bale);
      for (const s of [-.3, .3]) { const tie = new THREE.Mesh(new THREE.TorusGeometry(.56, .025, 4, 18), K3.mat('#8A5A30')); tie.rotation.x = Math.PI / 2; tie.position.y = s; bale.add(tie); }
    }
    const cols = [th.accent, th.gold, '#FFFFFF', th.wall2];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, r = 24;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 5, 8), K3.mat('#6B4A2E')); pole.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r); yard.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .7), K3.mat(cols[i % 4], { side: THREE.DoubleSide })); flag.position.set(pole.position.x, 4.5, pole.position.z); flag.rotation.y = -a; flag.translateX(.6); yard.add(flag);
      S.fx.push((dt, t) => { flag.rotation.x = Math.sin(t * 3 + i) * .12; });
    }
    K3.scatter(yard, th, { x0: -45, x1: 45, z0: -45, z1: 45, count: 900, avoid: (x, z) => Math.hypot(x, z) < 4 || Math.hypot(x, z) > 44 });
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + K3.rnd(-.1, .1), r = K3.rnd(30, 40); const p = K3.prop(th, K3.rnd(1.5, 2.6)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); yard.add(p); }
    K3.horizon(S, th, { radius: 70 });
    K3.weather(S, th, { w: 30, h: 12, d: 60, cz: 0 });
    makeBow(th);
    if (S.q && targets.length) layout(targets.map(t => ({ a: t.a, state: t.state, ang: t.ang, r: t.r, h: t.h })));
  };

  /* ---------- الأهداف القشّية ---------- */
  function faceTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#E2C46A'; g.fillRect(0, 0, 256, 256);
    /* ألوان هدف الرماية الحقيقي من الخارج للداخل */
    ['#FFFFFF', '#2A2A30', '#2F7FD1', '#D8392B', '#F7C948'].forEach((col, k) => {
      g.fillStyle = col; g.beginPath(); g.arc(128, 128, 122 - k * 23, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(128, 128, 122 - k * 23 - 11, 0, 7); g.stroke();
    });
    g.fillStyle = '#2A2A30'; g.beginPath(); g.arc(128, 128, 4, 0, 7); g.fill();
    return K3.texture(c);
  }
  function strawTex() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#D9B85A'; g.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 260; i++) { g.strokeStyle = Math.random() < .5 ? 'rgba(150,110,40,.5)' : 'rgba(255,240,180,.5)'; g.beginPath(); const x = Math.random() * 128, y = Math.random() * 64; g.moveTo(x, y); g.lineTo(x + K3.rnd(-6, 6), y + K3.rnd(4, 10)); g.stroke(); }
    const t = K3.texture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 6; return t;
  }
  function makeTarget(a, th) {
    const g = new THREE.Group(), face = new THREE.Group();
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .45, 40), [K3.mat('#D9B85A', { map: strawTex() }), K3.mat('#FFFFFF', { map: faceTex() }), K3.mat('#C9A24A')]);
    butt.rotation.x = Math.PI / 2; face.add(butt);
    for (const s of [-.12, .12]) { const rope = new THREE.Mesh(new THREE.TorusGeometry(1.11, .025, 4, 40), K3.mat('#8A5A30')); rope.position.z = s; face.add(rope); }
    face.position.y = 1.9; face.rotation.x = -.12;
    g.add(face);
    /* حامل ثلاثي الأرجل */
    for (const [x, z, rz, rx] of [[-.75, -.1, -.22, 0], [.75, -.1, .22, 0], [0, -.75, 0, .4]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 2.8, 8), K3.mat('#7A5230'));
      leg.position.set(x, 1.3, z); leg.rotation.set(rx, 0, rz); g.add(leg);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, .1, .1), K3.mat('#7A5230')); bar.position.set(0, .75, .05); g.add(bar);
    /* لافتة الإجابة على لوح خشبي فوق الهدف */
    const label = K3.plate(a.t, 2.9, .85, { px: 76 }); label.position.set(0, 3.6, .06); g.add(label);
    const h = label.geometry.parameters.height;
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.1, h + .22, .1), K3.mat('#8A5A30')); board.position.set(0, 3.6, 0); g.add(board);
    for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .7, 6), K3.mat('#6B4A2E')); post.position.set(sx * 1.2, 3.6 - h / 2 - .3, -.02); g.add(post); }
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.1, 40), K3.glow(th.gold, { transparent: true, opacity: .35 })); glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = .03; g.add(glowRing);
    g.userData = { face, label, glowRing };
    return g;
  }
  function stand(h, th) {
    const g = new THREE.Group(); g.userData.h = h;
    if (h < 2) {
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, h, .18), K3.mat('#7A5230')); p.position.set(x * 1.1, h / 2, z * .9); g.add(p); }
      for (const z of [-.9, .9]) { const br = new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, .1), K3.mat('#8A5A30')); br.position.set(0, h * .5, z); br.rotation.z = .4; g.add(br); }
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, .16, 2.2), K3.mat('#A0703A')); deck.position.y = h; g.add(deck);
      return g;
    }
    const stone = K3.mat(th.dark ? '#5A6A9A' : '#B9AE9C', { flatShading: true });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.85, h, 12), stone); tower.position.y = h / 2; g.add(tower);
    for (let y = 1.2; y < h - .4; y += 1.3) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.62 + (h - y) * .02, 1.62 + (h - y) * .02, .12, 12), K3.mat(th.dark ? '#3A4A80' : '#8F8576', { flatShading: true })); ring.position.y = y; g.add(ring); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.7, .3, 12), K3.mat(th.wall2, { flatShading: true })); top.position.y = h; g.add(top);
    for (let i = 0; i < 10; i++) { if (i === 0 || i === 5) continue; const a = i / 10 * Math.PI * 2; const c = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .3), stone); c.position.set(Math.cos(a) * 1.75, h + .36, Math.sin(a) * 1.75); c.rotation.y = -a; g.add(c); }
    /* نوافذ ضيقة وسلّم خشبي على الجدار وراية صغيرة */
    for (let y = 1.8; y < h - .8; y += 2.2) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.22, .5), K3.mat('#2A1E14')); w.position.set(0, y, 1.72); g.add(w); }
    const ladder = new THREE.Group();
    for (const x of [-.25, .25]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(.06, h, .06), K3.mat('#7A5230')); rail.position.set(x, h / 2, 0); ladder.add(rail); }
    for (let y = .3; y < h; y += .4) { const rung = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .05), K3.mat('#8A5A30')); rung.position.y = y; ladder.add(rung); }
    ladder.position.set(1.85, 0, 0); ladder.rotation.y = Math.PI / 2; g.add(ladder);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.6, 6), K3.mat('#5A4632')); pole.position.set(-1.5, h + .8, -.6); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.7, .4), K3.mat(th.accent, { side: THREE.DoubleSide })); flag.position.set(-1.15, h + 1.4, -.6); g.add(flag);
    S.fx.push((dt, t) => { flag.rotation.y = Math.sin(t * 3 + h) * .3; });
    return g;
  }
  function layout(keep) {
    const th = K3.theme();
    targets.forEach(t => yard.remove(t.g));
    stands.forEach(m => yard.remove(m)); stands = [];
    const hs = shuffle(BW.heights.slice());
    targets = [];
    const list = keep || mixAnswers(S.q).map(a => ({ a }));
    const n = list.length, off = look.yaw + K3.rnd(-.5, .5);
    list.forEach((it, k) => {
      if (it.state === 'gone') return;
      /* موزّعة على الدائرة كلها، والفراغ بين كل هدفين واسع */
      const ang = it.ang != null ? it.ang : off + k / n * Math.PI * 2 + K3.rnd(-.18, .18);
      const r = it.r || K3.rnd(BW.rMin, BW.rMax);
      /* ارتفاعات مختلفة: هدف على الأرض، وآخر على سقالة، وآخر فوق برج عالٍ */
      const h = it.h != null ? it.h : hs[k % hs.length];
      const g = makeTarget(it.a, th);
      g.position.set(-Math.sin(ang) * r, h, -Math.cos(ang) * r);
      g.lookAt(0, h, 0);
      yard.add(g);
      if (h > 0) { const st = stand(h, th); st.position.set(g.position.x, 0, g.position.z); st.rotation.y = g.rotation.y; yard.add(st); stands.push(st); }
      const t = { a: it.a, g, ang, r, h, state: it.state || '', t: 0, rise: keep ? 1 : 0 };
      if (t.state === 'good') K3.tint(g, '#4CAF50', .45);
      if (t.state === 'bad') K3.tint(g, '#C0392B', .5);
      targets.push(t);
    });
  }
  S.targets = () => targets;
  S.look = look;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    stuck.forEach(s => s.m.parent && s.m.parent.remove(s.m)); stuck = [];
    layout();
  };

  /* ---------- الإطلاق: شدّ قصير ثم إفلات ---------- */
  S.shoot = () => {
    if (!S.started) { S.begin(); return; }
    if (draw.state !== 'ready' || Play.finished) return;
    draw.state = 'pull'; draw.t = 0;
    FX.play('tick');
  };
  function release() {
    const th = K3.theme(), dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const m = arrowMesh(th);
    const p = new THREE.Vector3(.12, -.12, -.6); camera.localToWorld(p);
    m.position.copy(p);
    const v = dir.multiplyScalar(BW.speed);
    m.lookAt(p.clone().add(v));
    scene.add(m);
    flying.push({ m, v, life: 3 });
    nocked.visible = false;
    FX.play('shoot');
  }
  function stick(f, target, pos) {
    const m = f.m;
    /* يغرز قليلًا في القش (أو التراب) ويبقى معه ويهتز لحظة */
    m.position.addScaledVector(f.v.clone().normalize(), .18);
    if (target) target.g.userData.face.attach(m);
    stuck.push({ m, wob: 1, base: m.rotation.clone() });
  }
  function puff(pos, col, n = 8) {
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: col, transparent: true, opacity: .7, depthWrite: false })); s.position.copy(pos); s.scale.setScalar(.3); scene.add(s); const a = Math.random() * 6.28; bits.push({ m: s, puff: true, v: new THREE.Vector3(Math.cos(a), K3.rnd(.4, 1.2), Math.sin(a)).multiplyScalar(1.4), life: 1 }); }
  }
  function hit(t, pos) {
    const pt = S.screen(pos);
    puff(pos, '#E2C46A', 10);
    if (t.state || S.answered || Play.roundDone) { FX.play('pop'); return; }
    if (t.a.ok) {
      t.state = 'good'; t.t = 0;
      K3.tint(t.g, '#4CAF50', .45);
      for (let i = 0; i < 20; i++) { const m = K3.starMesh(.16, i % 2 ? K3.theme().gold : '#FFFFFF', .05); m.position.copy(pos); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 3, K3.rnd(2, 6), Math.sin(a) * 3), life: 1, spin: K3.rnd(-8, 8) }); }
      S.collected.push(t.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1500 });
    } else {
      t.state = 'bad'; t.t = 0;
      K3.tint(t.g, '#C0392B', .5);
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }

  /* ---------- التحكم: سحب للنظر، ولمسة قصيرة للإطلاق ---------- */
  let last = null, moved = 0;
  K3.controls(S, {
    hold(e, phase) {
      if (phase === 'down' && e) { last = { x: e.clientX, y: e.clientY }; moved = 0; }
      else if (phase === 'move' && e && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        look.yaw += dx * .0055; look.pitch = Math.max(-.55, Math.min(.85, look.pitch + dy * .004));
        last = { x: e.clientX, y: e.clientY };
      } else if (phase === 'up') last = null;
    },
    tap(e) { if (!e || moved < 10) S.shoot(); },
  });
  const fire = el('button', 'k3-btn k3-fire', '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M20 4h-6M20 4v6M4 20l3-1-2-2z"/></svg>');
  fire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); S.shoot(); });
  S.wrap.appendChild(fire);

  const tmp = new THREE.Vector3();
  S.onFrame = dt => {
    const k = S.keys, live = S.started && !Play.finished;
    if (live) {
      look.yaw += ((k.ArrowLeft || k.KeyA ? 1 : 0) - (k.ArrowRight || k.KeyD ? 1 : 0)) * dt * 1.9;
      look.pitch = Math.max(-.55, Math.min(.85, look.pitch + ((k.ArrowUp || k.KeyW ? 1 : 0) - (k.ArrowDown || k.KeyS ? 1 : 0)) * dt * 1.1));
    } else look.yaw += dt * .06;
    camera.rotation.y = look.yaw; camera.rotation.x = look.pitch;
    /* شدّ الوتر ثم الإفلات ثم سهم جديد */
    if (bow) {
      if (draw.state === 'pull') { draw.t += dt; draw.k = Math.min(1, draw.t / .28); if (draw.k >= 1) { release(); draw.state = 'loose'; draw.t = 0; } }
      else if (draw.state === 'loose') { draw.t += dt; draw.k = Math.max(0, 1 - draw.t * 14) - Math.sin(Math.min(1, draw.t * 4) * Math.PI * 3) * .05 * (1 - Math.min(1, draw.t * 2)); if (draw.t > .4) { draw.state = 'ready'; nocked.visible = true; draw.k = 0; } }
      setDraw(Math.max(-.08, draw.k));
      bow.position.z = -.62 + draw.k * .06;
      bow.position.y = -.36 + Math.sin(S.t * 1.6) * .006;
    }
    /* الأسهم الطائرة: جاذبية خفيفة، واصطدام بوجه الهدف أو الأرض */
    flying.forEach(f => {
      const steps = 3;
      for (let i = 0; i < steps && f.life > 0; i++) {
        const h = dt / steps;
        f.v.y -= BW.g * h;
        f.m.position.addScaledVector(f.v, h);
        f.life -= h;
        tmp.copy(f.m.position).addScaledVector(f.v.clone().normalize(), .55);
        for (const t of targets) {
          const l = t.g.userData.face.worldToLocal(tmp.clone());
          if (l.z < .25 && l.z > -.3 && Math.hypot(l.x, l.y) < 1.1) { stick(f, t, tmp.clone()); hit(t, tmp.clone()); f.life = -1; break; }
        }
        if (f.life > 0) for (const st of stands) { const dx = tmp.x - st.position.x, dz = tmp.z - st.position.z; if (Math.hypot(dx, dz) < 1.8 && tmp.y < st.userData.h) { stick(f, null); puff(tmp, '#B9AE9C', 6); FX.play('tick'); f.life = -1; break; } }
        if (f.life > 0 && tmp.y < .02) { tmp.y = .02; stick(f, null); puff(tmp, '#C9B48A', 6); FX.play('tick'); f.life = -1; }
      }
      if (f.life > 0) f.m.lookAt(tmp.copy(f.m.position).add(f.v));
      else if (f.life > -1) scene.remove(f.m);
    });
    flying = flying.filter(f => f.life > 0);
    stuck.forEach(s => { if (s.wob > 0) { s.wob = Math.max(0, s.wob - dt * 2.2); s.m.rotateX(Math.sin(S.t * 60) * .02 * s.wob); } });
    /* الأهداف */
    targets.forEach(t => {
      const g = t.g, u = g.userData;
      t.rise = Math.min(1, t.rise + dt * 1.6);
      g.position.y = t.h - 4 * (1 - K3.ease(t.rise));
      if (t.state === 'bad') { t.t += dt; u.face.position.x = Math.sin(S.t * 50) * .07 * Math.max(0, 1 - t.t * 2); }
      if (t.state === 'good') { t.t += dt; u.face.rotation.z = Math.sin(t.t * 8) * .1 * Math.max(0, 1 - t.t); }
      u.glowRing.material.opacity = t.state ? 0 : .25 + Math.sin(S.t * 3 + t.ang) * .12;
    });
    bits.forEach(b => {
      b.life -= dt * 1.2;
      if (b.puff) { b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(.3 + (1 - b.life) * 1.2); b.m.material.opacity = Math.max(0, b.life * .6); }
      else { b.v.y -= 9 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += (b.spin || 0) * dt; b.m.scale.setScalar(Math.max(.01, b.life)); }
      if (b.life <= 0) scene.remove(b.m);
    });
    bits = bits.filter(b => b.life > 0);
    /* مؤشرات الأهداف المتبقية خارج النظر */
    const half = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) * .9;
    let left = false, right = false;
    targets.forEach(t => { if (t.state) return; const rel = Math.atan2(Math.sin(t.ang - look.yaw), Math.cos(t.ang - look.yaw)); if (rel > half) left = true; if (rel < -half) right = true; });
    hintL.classList.toggle('on', live && left); hintR.classList.toggle('on', live && right);
  };
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !BOW || !BOW.wrap.isConnected) {
      if (BOW) BOW.wrap.remove();
      BOW = bowScene();
      Play.board.appendChild(BOW.wrap);
      BOW.size();
    }
    BOW.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(BOW.wrap, BOW.paint.el);
    K3.fonts.then(() => BOW.setQuestion(q));
  },
});
