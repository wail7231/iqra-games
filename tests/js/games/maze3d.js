/* المتاهة المجسّمة (ثلاثية الأبعاد) — متاهة بجدران مرتفعة وكاميرا مائلة من فوق خلف اللاعب.
   في نهايات الممرات المغلقة أبواب عليها الإجابات. الأسهم تحرّك اللاعب خانة خانة، والسحب يجعله يمضي حتى منعطف.
   دخول باب الصحيحة نقطة (إن كانت أول اختيار)، والخاطئ يُغلق بقضبان ويرتدّ اللاعب ويُنقص قلبًا.
   لكل سؤال متاهة جديدة. الشكل يتبع قالب الشكل. */
'use strict';

let MZ3 = null;
const MZ = { cell: 2.2, wallH: 1.25, wallT: .32 };

function maze3dScene() {
  const S = K3.create({ fov: 50, fogNear: 22, fogFar: 60, ratio: .62 });
  const { scene, camera } = S;
  const world = new THREE.Group();
  scene.add(world);
  let M = null, hero, shadow;
  const P = { c: 0, r: 0, x: 0, z: 0, from: null, t: 1, dir: null, run: null, bounce: null };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;

  camera.position.set(0, 10, 8);

  S.onTheme = th => {
    K3.horizon(S, th, { radius: 70 });
    K3.weather(S, th, { w: 18, h: 12, d: 30, cz: -4 });
    if (hero) scene.remove(hero, shadow);
    hero = K3.player();
    hero.scale.setScalar(1.25);
    shadow = K3.blob(.6, .3);
    scene.add(hero, shadow);
    if (M) draw();
  };

  /* ---------- توليد المتاهة: حفر عشوائي، ثم الأبواب في النهايات المغلقة الأبعد ---------- */
  // open[r][c]: 1 أعلى(−z) 2 يمين(+x) 4 أسفل(+z) 8 يسار(−x)
  const DIRS = { up: [0, -1, 1, 4], right: [1, 0, 2, 8], down: [0, 1, 4, 1], left: [-1, 0, 8, 2] };
  function carve(cols, rows, sc, sr) {
    const open = [...Array(rows)].map(() => Array(cols).fill(0));
    const seen = [...Array(rows)].map(() => Array(cols).fill(false));
    const stack = [[sc, sr]];
    seen[sr][sc] = true;
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const nx = shuffle(Object.values(DIRS)).filter(([dc, dr]) => { const nc = c + dc, nr = r + dr; return nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr][nc]; });
      if (!nx.length) { stack.pop(); continue; }
      const [dc, dr, b, ob] = nx[0];
      open[r][c] |= b; open[r + dr][c + dc] |= ob;
      seen[r + dr][c + dc] = true;
      stack.push([c + dc, r + dr]);
    }
    /* فتحات إضافية قليلة حتى لا يكون الطريق واحدًا فقط */
    for (let k = 0; k < Math.floor(cols * rows * .08); k++) {
      const c = 1 + Math.floor(Math.random() * (cols - 2)), r = 1 + Math.floor(Math.random() * (rows - 2));
      const [dc, dr, b, ob] = Object.values(DIRS)[Math.floor(Math.random() * 4)];
      open[r][c] |= b; open[r + dr][c + dc] |= ob;
    }
    return open;
  }
  const bits = o => [1, 2, 4, 8].filter(b => o & b).length;
  function makeMaze(n) {
    const cols = n > 4 ? 9 : 7, rows = n > 4 ? 8 : 7;
    const sc = Math.floor(cols / 2), sr = rows - 1;
    for (let tries = 0; tries < 40; tries++) {
      const open = carve(cols, rows, sc, sr);
      /* المسافة من البداية لكل خانة */
      const dist = [...Array(rows)].map(() => Array(cols).fill(-1));
      dist[sr][sc] = 0;
      const q = [[sc, sr]];
      while (q.length) {
        const [c, r] = q.shift();
        for (const [dc, dr, b] of Object.values(DIRS)) if (open[r][c] & b && dist[r + dr][c + dc] < 0) { dist[r + dr][c + dc] = dist[r][c] + 1; q.push([c + dc, r + dr]); }
      }
      const ends = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (bits(open[r][c]) === 1 && dist[r][c] > 3) ends.push({ c, r, d: dist[r][c] });
      if (ends.length < n) continue;
      /* أبواب متباعدة: نختار الأبعد ثم الأبعد عن المختارة */
      const pick = [ends.sort((a, b) => b.d - a.d)[Math.floor(Math.random() * Math.min(3, ends.length))]];
      while (pick.length < n) {
        const best = ends.filter(e => !pick.includes(e)).map(e => ({ e, s: Math.min(...pick.map(p => Math.abs(p.c - e.c) + Math.abs(p.r - e.r))) + e.d * .3 })).sort((a, b) => b.s - a.s)[0];
        pick.push(best.e);
      }
      return { cols, rows, open, sc, sr, doors: shuffle(pick) };
    }
    return null;
  }
  const at = (c, r) => new THREE.Vector3((c - (M.cols - 1) / 2) * MZ.cell, 0, (r - (M.rows - 1) / 2) * MZ.cell);

  /* ---------- الرسم ---------- */
  function draw() {
    const th = K3.theme();
    K3.clear(world);
    const W = M.cols * MZ.cell, H = M.rows * MZ.cell;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), K3.mat(th.ground, { map: K3.groundTexture(th, 30) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.03;
    world.add(ground);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + .6, .16, H + .6), K3.mat(th.path));
    floor.position.y = -.08; world.add(floor);
    /* الجدران: قطع مكررة (InstancedMesh) لتبقى خفيفة */
    const segs = [];
    for (let r = 0; r < M.rows; r++) for (let c = 0; c < M.cols; c++) {
      const o = M.open[r][c], p = at(c, r);
      if (!(o & 1)) segs.push([p.x, p.z - MZ.cell / 2, true]);
      if (!(o & 8)) segs.push([p.x - MZ.cell / 2, p.z, false]);
      if (r === M.rows - 1 && !(o & 4)) segs.push([p.x, p.z + MZ.cell / 2, true]);
      if (c === M.cols - 1 && !(o & 2)) segs.push([p.x + MZ.cell / 2, p.z, false]);
    }
    const geo = new THREE.BoxGeometry(MZ.cell + MZ.wallT, MZ.wallH, MZ.wallT);
    const walls = new THREE.InstancedMesh(geo, K3.mat(th.wall, th.dark ? { emissive: K3.col(th.wall2).multiplyScalar(.25) } : {}), segs.length);
    const capGeo = new THREE.BoxGeometry(MZ.cell + MZ.wallT + .04, .1, MZ.wallT + .06);
    const caps = new THREE.InstancedMesh(capGeo, K3.mat(th.wall2, th.dark ? { emissive: K3.col(th.wall2).multiplyScalar(.5) } : {}), segs.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    segs.forEach(([x, z, h], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h ? 0 : Math.PI / 2);
      m4.compose(new THREE.Vector3(x, MZ.wallH / 2, z), q, one); walls.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x, MZ.wallH + .05, z), q, one); caps.setMatrixAt(i, m4);
    });
    world.add(walls, caps);
    if (th.sketch) {
      const e = new THREE.LineBasicMaterial({ color: '#2B4C7E' });
      segs.forEach(([x, z, h]) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), e); l.position.set(x, MZ.wallH / 2, z); l.rotation.y = h ? 0 : Math.PI / 2; world.add(l); });
    }
    /* زينة حول المتاهة */
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.max(W, H) * .5 + K3.rnd(2, 8);
      const p = K3.prop(th, K3.rnd(1, 1.6));
      p.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      world.add(p);
    }
    /* الأبواب */
    M.doors.forEach(d => {
      const p = at(d.c, d.r), o = M.open[d.r][d.c];
      const side = Object.entries(DIRS).find(([, v]) => o & v[2]);   // الجهة المفتوحة الوحيدة
      const g = new THREE.Group();
      g.position.copy(p);
      g.rotation.y = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[side[0]];
      const arch = new THREE.Mesh(new THREE.TorusGeometry(.78, .12, 8, 24, Math.PI), K3.mat(th.gold));
      arch.position.set(0, 1.0, 0); g.add(arch);
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.05, .22), K3.mat(th.wall2)); post.position.set(sx * .78, .5, 0); g.add(post); }
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .06, 24), K3.glow(th.gold, { transparent: true, opacity: .55 }));
      pad.position.y = .02; g.add(pad);
      const s = K3.sign(d.a.t, { h: .7, px: 64 });
      const maxW = 3.2;
      if (s.scale.x > maxW) s.scale.set(maxW, maxW / s.userData.ratio, 1);
      s.position.set(p.x, 2.25, p.z);
      world.add(g, s);
      d.g = g; d.s = s; d.pad = pad;
      if (d.state) paintDoor(d);
    });
  }
  function paintDoor(d) {
    if (d.state === 'good') {
      K3.tint(d.g, '#4CAF50', .7);
      K3.recolorSign(d.s, '✓ ' + d.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
    } else {
      K3.tint(d.g, '#C0392B', .6);
      for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 6), K3.mat('#5A5A66')); b.position.set(i * .3, .6, .1); d.g.add(b); }
      K3.recolorSign(d.s, d.a.t, { bg: '#C0392B', fg: '#FFFFFF', edge: '#7A1F15', px: 64 });
    }
  }
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    const answers = mixAnswers(q, 6);
    M = makeMaze(answers.length);
    M.doors.forEach((d, k) => { d.a = answers[k]; d.state = ''; });
    P.c = M.sc; P.r = M.sr; P.from = null; P.t = 1; P.run = null;
    const p = at(P.c, P.r); P.x = p.x; P.z = p.z;
    draw();
    camera.position.set(p.x, 10, p.z + 7.5);
  };

  /* ---------- الحركة ---------- */
  function step(d) {
    if (!M || P.t < 1 || S.answered || Play.roundDone) return false;
    const [dc, dr, b] = DIRS[d];
    if (!(M.open[P.r][P.c] & b)) return false;
    const door = M.doors.find(x => x.c === P.c + dc && x.r === P.r + dr);
    if (door && door.state === 'bad') return false;
    P.from = { c: P.c, r: P.r };
    P.c += dc; P.r += dr; P.t = 0; P.dir = d;
    return true;
  }
  /* تقاطع: خانة فيها أكثر من طريقين، أو باب */
  const junction = () => bits(M.open[P.r][P.c]) !== 2 || M.doors.some(x => x.c === P.c && x.r === P.r);
  function arrive() {
    const door = M.doors.find(x => x.c === P.c && x.r === P.r);
    if (door && !door.state) {
      P.run = null;
      const pt = new THREE.Vector3(door.s.position.x, 2.2, door.s.position.z);
      if (door.a.ok) {
        door.state = 'good';
        paintDoor(door);
        S.collected.push(door.a.t);
        if (S.paint) S.paint(S.collected.length);
        if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); return; }
        S.answered = true;
        K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
        FX.play('ok');
        Play.finish(S.missed ? 0 : 1, { delay: 1100 });
      } else {
        door.state = 'bad';
        paintDoor(door);
        S.missed = true;
        K3.burstAt(S, pt, false);
        FX.play('bad');
        if (!Play.mistake()) { const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[P.dir]; P.bounce = back; }
      }
      return;
    }
    if (P.run && !junction()) {
      /* يكمل في الممر ويتبع انعطافه حتى أقرب تقاطع */
      const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[P.dir];
      const next = Object.keys(DIRS).find(k => k !== back && M.open[P.r][P.c] & DIRS[k][2]);
      if (next && step(next)) return;
    }
    P.run = null;
  }
  K3.controls(S, {
    dir(d, repeat, swipe) { if (step(d)) { P.run = swipe ? d : null; FX.play('tick'); } else if (!repeat) FX.play('tick'); },
  });

  S.onFrame = dt => {
    if (!M) return;
    if (P.t < 1) {
      P.t = Math.min(1, P.t + dt * 6.5);
      const a = at(P.from.c, P.from.r), b = at(P.c, P.r), k = P.t;
      P.x = a.x + (b.x - a.x) * k; P.z = a.z + (b.z - a.z) * k;
      if (P.t >= 1) {
        if (P.bounce) { const d = P.bounce; P.bounce = null; M.doors.forEach(x => { if (x.c === P.c && x.r === P.r) x.wasHere = true; }); step(d); }
        else arrive();
      }
    } else {
      /* مفتاح مضغوط باستمرار = يكمل السير */
      for (const [code, d] of [['ArrowUp', 'up'], ['ArrowDown', 'down'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['KeyW', 'up'], ['KeyS', 'down'], ['KeyA', 'left'], ['KeyD', 'right']]) if (S.keys[code] && S.started && step(d)) break;
    }
    if (hero) {
      hero.position.set(P.x, .62 + Math.abs(Math.sin(S.t * 6)) * (P.t < 1 ? .12 : .04), P.z);
      const yaw = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[P.dir || 'up'];
      hero.rotation.y += ((yaw - hero.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
      hero.userData.body.rotation.x -= P.t < 1 ? dt * 9 : 0;
      shadow.position.set(P.x, .02, P.z);
    }
    M.doors.forEach(d => { if (d.pad && !d.state) d.pad.material.opacity = .35 + Math.sin(S.t * 4) * .25; });
    camera.position.x += (P.x - camera.position.x) * Math.min(1, dt * 3);
    camera.position.z += (P.z + 7.2 - camera.position.z) * Math.min(1, dt * 3);
    camera.position.y += (10.5 - camera.position.y) * Math.min(1, dt * 3);
    camera.lookAt(camera.position.x, 0, camera.position.z - 7.6);
  };
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !MZ3 || !MZ3.wrap.isConnected) {
      if (MZ3) MZ3.wrap.remove();
      MZ3 = maze3dScene();
      Play.board.appendChild(MZ3.wrap);
      MZ3.size();
    }
    MZ3.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(MZ3.paint.el, MZ3.wrap);
    K3.fonts.then(() => MZ3.setQuestion(q));
  },
});
