/* رمي السهام (ثلاثي الأبعاد) — لوح سهام كبير على جدار غرفة مزيّنة، مقسوم قطاعات ملوّنة وعلى كل قطاع إجابة،
   واللوح يدور ببطء. يُسحب السهم إلى الخلف ويُفلت: اتجاه السحب يحدد مكان الإصابة (معاكسًا له)،
   ونقطة تصويب تظهر على اللوح أثناء السحب. ريح خفيفة (سهم صغير يبيّن اتجاهها) تحرف الرمية قليلًا.
   القطاع الصحيح يضيء أخضر ويبقى السهم مغروزًا فيه (نقطة إن كان أول اختيار)، والخاطئ يومض أحمر ويُنقص قلبًا.
   الشكل يتبع قالب الشكل. */
'use strict';

let DARTS = null;
const DB = { R: 2.7, y: 2.9, z: -7 };

function dartsScene() {
  const S = K3.create({ fov: 50, fogNear: 30, fogFar: 80, ratio: .62, maxH: 560 });
  const { scene, camera } = S;
  const room = new THREE.Group();
  scene.add(room);
  let board = null, sectors = [], dart = null, flying = null, stuck = [], wind = 0, windArrow = null, bits = [];
  const aim = { on: false, sx: 0, sy: 0, x: 0, y: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  camera.position.set(0, 2.6, 6.5);
  camera.lookAt(0, 2.8, DB.z);
  const reticle = el('div', 'k3-cross dart', '<i></i><b></b>');
  S.wrap.appendChild(reticle);

  /* ---------- الغرفة: جدار بنقش القالب، أرضية خشبية، فوانيس، رفوف وسجادة ---------- */
  function wallTex(th) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = th.dark ? '#1B2752' : th.path; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = th.dark ? 'rgba(89,195,240,.18)' : 'rgba(0,0,0,.08)'; g.lineWidth = 3;
    for (let x = 0; x < 512; x += 64) for (let y = 0; y < 512; y += 64) { g.beginPath(); for (let i = 0; i < 9; i++) { const a = i * Math.PI / 4, r = i % 2 ? 14 : 30; g.lineTo(x + 32 + Math.cos(a) * r, y + 32 + Math.sin(a) * r); } g.stroke(); }
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2);
    return t;
  }
  function floorTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#A0703A' : '#B98446'; g.fillRect(0, i * 32, 256, 32); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, i * 32 + 30, 256, 2); g.fillRect((i * 97) % 256, i * 32, 2, 32); }
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
    return t;
  }
  S.onTheme = th => {
    K3.clear(room);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), K3.mat('#FFFFFF', { map: wallTex(th) }));
    wall.position.set(0, 5, DB.z - .2); room.add(wall);
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), K3.mat('#FFFFFF', { map: wallTex(th) })); side.rotation.y = -sx * Math.PI / 2; side.position.set(sx * 9, 5, 0); room.add(side); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), K3.mat('#FFFFFF', { map: floorTex() })); floor.rotation.x = -Math.PI / 2; floor.position.z = 0; room.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), K3.mat(th.accent)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, 3.2); room.add(rug);
    const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.7, 2, 40), K3.mat(th.gold, { side: THREE.DoubleSide })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, .02, 3.2); room.add(rug2);
    const throwLine = new THREE.Mesh(new THREE.PlaneGeometry(4, .1), K3.glow(th.gold)); throwLine.rotation.x = -Math.PI / 2; throwLine.position.set(0, .03, 1.2); room.add(throwLine);
    /* إطار خشبي حول اللوح وفانوسان */
    const frame = new THREE.Mesh(new THREE.TorusGeometry(DB.R + .45, .22, 10, 64), K3.mat('#6B4A2E')); frame.position.set(0, DB.y, DB.z - .05); room.add(frame);
    for (const sx of [-1, 1]) {
      const l = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.8, .08, .08), K3.mat('#3A2A1A')); arm.position.set(sx * .4, 0, 0); l.add(arm);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .5, 6), K3.glow(th.dark ? '#7FD3F7' : '#FFD27A')); lamp.position.set(sx * .8, -.35, 0); l.add(lamp);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFD27A', transparent: true, opacity: .5, depthWrite: false })); halo.scale.set(2, 2, 1); halo.position.copy(lamp.position); l.add(halo);
      l.position.set(sx * (DB.R + 1.2), DB.y + 1.6, DB.z + .2); room.add(l);
      const light = new THREE.PointLight('#FFD27A', .5, 8); light.position.set(sx * (DB.R + 1.6), DB.y + 1.2, DB.z + 1); room.add(light);
    }
    /* رفوف بزينة القالب على الجانبين */
    for (const sx of [-1, 1]) for (const y of [1.6, 3.4]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, .12, .6), K3.mat('#8A5A30')); shelf.position.set(sx * 6.4, y, DB.z + .2); room.add(shelf);
      const p = K3.prop(th, .45); p.position.set(sx * 6.4 + K3.rnd(-.6, .6), y + .06, DB.z + .2); room.add(p);
    }
    /* مؤشر الريح */
    windArrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1, .08, .08), K3.glow('#FFFFFF')); windArrow.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.16, .34, 8), K3.glow('#FFFFFF')); tip.rotation.z = -Math.PI / 2; tip.position.x = .6; windArrow.add(tip);
    windArrow.position.set(0, DB.y + DB.R + 1.1, DB.z + .3); room.add(windArrow);
    scene.add(camera);
    if (S.q) buildBoard(sectors.map(s => ({ a: s.a, state: s.state })));
    newDart();
  };

  /* ---------- اللوح: قطاعات بالتناوب، والكتابة على كل قطاع ---------- */
  function boardTex(list, th) {
    const N = 1024, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), n = list.length, R = N / 2 - 6;
    const cols = [th.accent, th.card, th.wall2, th.gold, '#2E7D9A', '#FFFFFF'];
    list.forEach((s, k) => {
      const a0 = k / n * Math.PI * 2 - Math.PI / 2, a1 = (k + 1) / n * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = s.state === 'good' ? '#4CAF50' : s.state === 'bad' ? '#7A3A3A' : (k % 2 ? cols[1] : cols[(k / 2 | 0) % 4 === 1 ? 2 : (k / 2 | 0) % 4 === 2 ? 4 : 0]);
      g.beginPath(); g.moveTo(N / 2, N / 2); g.arc(N / 2, N / 2, R, a0, a1); g.closePath(); g.fill();
      g.strokeStyle = th.gold; g.lineWidth = 6; g.stroke();
    });
    /* حلقات الزينة والمركز */
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 5;
    [R * .62, R * .9].forEach(r => { g.beginPath(); g.arc(N / 2, N / 2, r, 0, 7); g.stroke(); });
    g.fillStyle = th.gold; g.beginPath(); g.arc(N / 2, N / 2, R * .13, 0, 7); g.fill();
    g.fillStyle = th.accent; g.beginPath(); g.arc(N / 2, N / 2, R * .06, 0, 7); g.fill();
    /* الكتابة في منتصف كل قطاع، مائلة مع اتجاهه */
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    list.forEach((s, k) => {
      const am = (k + .5) / n * Math.PI * 2 - Math.PI / 2, r = R * .62;
      g.save(); g.translate(N / 2 + Math.cos(am) * r, N / 2 + Math.sin(am) * r);
      let rot = am + Math.PI / 2; if (Math.cos(am) < -.01 || (Math.abs(Math.cos(am)) < .01 && Math.sin(am) > 0)) rot += 0;
      if (Math.sin(am) > .3) rot += Math.PI;
      g.rotate(rot);
      const dark = s.state || (k % 2 === 0);
      const px = Math.max(34, Math.min(70, 520 / Math.max(4, [...s.a.t].length) * (n > 4 ? .8 : 1)));
      g.font = `${Play.quran ? 400 : 700} ${px}px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;
      g.lineWidth = 8; g.strokeStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.8)'; g.strokeText(s.a.t, 0, 0, R * .75);
      g.fillStyle = dark ? '#FFFFFF' : th.ink; g.fillText(s.a.t, 0, 0, R * .75);
      g.restore();
    });
    return K3.texture(c);
  }
  function buildBoard(keep) {
    const th = K3.theme();
    if (board) room.remove(board);
    sectors = (keep && keep.length ? keep : mixAnswers(S.q, 6, []).map(a => ({ a }))).map(s => ({ a: s.a, state: s.state || '' }));
    board = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CircleGeometry(DB.R, 64), new THREE.MeshLambertMaterial({ map: boardTex(sectors, th) }));
    board.add(face);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(DB.R + .08, DB.R + .08, .3, 64), K3.mat('#2A1E14')); back.rotation.x = Math.PI / 2; back.position.z = -.16; board.add(back);
    board.position.set(0, DB.y, DB.z);
    board.userData.face = face;
    room.add(board);
    stuck.forEach(s => scene.remove(s.m)); stuck = [];
    wind = K3.rnd(-1, 1) * .6;
  }
  function repaint() { const th = K3.theme(); board.userData.face.material.map.dispose(); board.userData.face.material.map = boardTex(sectors, th); board.userData.face.material.needsUpdate = true; }
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    buildBoard();
  };

  /* ---------- السهم ---------- */
  function dartMesh(th) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .9, 8), K3.mat('#D9D9E8')); shaft.rotation.x = Math.PI / 2; g.add(shaft);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.07, .06, .35, 12), K3.mat(th.wall2)); barrel.rotation.x = Math.PI / 2; barrel.position.z = -.15; g.add(barrel);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.04, .3, 8), K3.mat('#9AA0AA')); tip.rotation.x = -Math.PI / 2; tip.position.z = -.58; g.add(tip);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(.3, .22), K3.mat(i % 2 ? th.accent : th.gold, { side: THREE.DoubleSide })); f.position.z = .4; f.rotation.z = i * Math.PI / 3; f.rotation.y = Math.PI / 2; f.position.x = 0; g.add(f); }
    return g;
  }
  function newDart() {
    if (dart) scene.remove(dart);
    dart = dartMesh(K3.theme());
    dart.position.set(.6, 1.7, 4.2);
    scene.add(dart);
  }
  /* نقطة الإصابة على مستوى اللوح من متجه السحب (معاكس له) */
  const aimPoint = () => new THREE.Vector3(-aim.x * .012 * 1.2, DB.y - aim.y * .012 * 1.2 * -1 * -1, DB.z + .02);
  function aimFromDrag() { return new THREE.Vector3(-(aim.x - aim.sx) * .011, DB.y + (aim.y - aim.sy) * .011, DB.z + .02); }
  S.throwAt = (target) => {
    if (flying || !dart || S.answered || Play.roundDone) return;
    const from = dart.position.clone(), to = target.clone();
    to.x += wind * 1.1;
    flying = { from, to, t: 0, dur: .5 };
    FX.play('pop');
  };
  S.cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!S.started) { S.begin(); return; }
    if (flying) return;
    aim.on = true; aim.sx = aim.x = e.clientX; aim.sy = aim.y = e.clientY;
    try { S.cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  S.cv.addEventListener('pointermove', e => {
    if (!aim.on) return;
    aim.x = e.clientX; aim.y = e.clientY;
    const p = aimFromDrag(), sp = S.screen(p), r = S.cv.getBoundingClientRect();
    reticle.style.left = (sp.x - r.left) + 'px'; reticle.style.top = (sp.y - r.top) + 'px';
    reticle.classList.add('on');
  });
  const release = () => {
    if (!aim.on) return;
    aim.on = false; reticle.classList.remove('on');
    if (Math.hypot(aim.x - aim.sx, aim.y - aim.sy) < 12) return;
    S.throwAt(aimFromDrag());
  };
  S.cv.addEventListener('pointerup', release);
  S.cv.addEventListener('pointercancel', () => { aim.on = false; reticle.classList.remove('on'); });

  function landed(f) {
    const p = f.to;
    /* موضع الإصابة بالنسبة للوح الدوّار */
    const lx = p.x - board.position.x, ly = p.y - board.position.y, r = Math.hypot(lx, ly);
    const pt = S.screen(p);
    const keep = dart; dart = null;
    stuck.push({ m: keep, wob: 1 });
    setTimeout(newDart, 650);
    if (r > DB.R) { FX.play('tick'); FX.floatText(pt, '…', '#888'); return; }
    if (r < DB.R * .13) { FX.play('tick'); return; }
    let ang = Math.atan2(-ly, lx) - (-board.rotation.z);
    ang = ((ang + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.floor(ang / (Math.PI * 2) * sectors.length) % sectors.length;
    const s = sectors[k];
    if (!s || s.state || S.answered || Play.roundDone) { FX.play('tick'); return; }
    if (s.a.ok) {
      s.state = 'good'; repaint();
      S.collected.push(s.a.t);
      if (S.paint) S.paint(S.collected.length);
      for (let i = 0; i < 14; i++) { const m = K3.starMesh(.14, i % 2 ? K3.theme().gold : '#FFFFFF', .05); m.position.copy(p); scene.add(m); const a = Math.random() * 6.28; bits.push({ m, v: new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3 + 2, 2), life: 1 }); }
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1400 });
    } else {
      s.state = 'bad'; repaint();
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake();
    }
  }
  S.sectors = () => sectors;
  S.boardRot = () => board ? board.rotation.z : 0;

  S.onFrame = dt => {
    if (board && S.started) board.rotation.z += dt * (.12 + Play.cfg.speed * .04);
    if (windArrow) { windArrow.scale.x = Math.sign(wind || 1) * (.4 + Math.abs(wind)); windArrow.position.y = DB.y + DB.R + 1.1 + Math.sin(S.t * 3) * .05; }
    if (dart && !flying) { dart.position.y = 1.7 + Math.sin(S.t * 2) * .03; dart.lookAt(0, DB.y, DB.z); dart.rotateY(Math.PI); }
    if (flying && dart) {
      const f = flying;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = f.t, p = f.from.clone().lerp(f.to, k);
      p.y += Math.sin(k * Math.PI) * 1.2;
      p.x += Math.sin(k * Math.PI) * wind * .3;
      const prev = dart.position.clone();
      dart.position.copy(p);
      const dir = p.clone().sub(prev);
      if (dir.lengthSq() > 1e-6) { dart.lookAt(p.clone().sub(dir)); }
      dart.rotation.z += dt * 12;
      if (f.t >= 1) {
        dart.position.copy(f.to);
        /* السهم يُغرز في اللوح ويدور معه */
        const local = board.worldToLocal(dart.position.clone());
        scene.remove(dart); board.add(dart); dart.position.copy(local); dart.position.z = .3;
        dart.rotation.set(0, 0, 0);
        flying = null;
        landed(f);
      }
    }
    stuck.forEach(s => { s.wob = Math.max(0, s.wob - dt * 2.5); s.m.rotation.x = Math.sin(S.t * 40) * .08 * s.wob; });
    bits.forEach(b => { b.life -= dt * 1.4; b.v.y -= 9 * dt; b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(Math.max(.01, b.life)); if (b.life <= 0) scene.remove(b.m); });
    bits = bits.filter(b => b.life > 0);
  };
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'speed', label: 'سرعة دوران اللوح', kind: 'range', min: 1, max: 10, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !DARTS || !DARTS.wrap.isConnected) {
      if (DARTS) DARTS.wrap.remove();
      DARTS = dartsScene();
      Play.board.appendChild(DARTS.wrap);
      DARTS.size();
    }
    DARTS.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(DARTS.paint.el, DARTS.wrap);
    K3.fonts.then(() => DARTS.setQuestion(q));
  },
});
