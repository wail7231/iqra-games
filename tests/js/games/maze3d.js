/* المتاهة المجسّمة (ثلاثية الأبعاد) — متاهة كبيرة بجدران مرتفعة وكاميرا مائلة من فوق تتبع اللاعب.
   الحركة حرة في كل اتجاه (الأسهم، أو السحب بالإصبع كعصا تحكم)، والجدران تصدّ اللاعب.
   في نهايات الممرات المغلقة أبواب عليها الإجابات، وخريطة صغيرة في الزاوية تُظهر مكانها.
   دخول باب الصحيحة نقطة (إن كانت أول اختيار)، والخاطئ يُغلق ويرتدّ اللاعب ويُنقص قلبًا. */
'use strict';

let MZ3 = null;
const MZ = { cell: 2.5, wallH: 1.3, wallT: .34, R: .5 };

function maze3dScene() {
  const S = K3.create({ fov: 50, fogNear: 22, fogFar: 70, ratio: .62, fsPad: 24 });
  const { scene, camera } = S;
  const world = new THREE.Group();
  scene.add(world);
  let M = null, hero, shadow;
  const P = S.P = { x: 0, z: 0, vx: 0, vz: 0, yaw: 0, knock: null };
  const joy = { x: 0, z: 0, o: null };
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
    const cols = n > 10 ? 21 : n > 7 ? 19 : n > 4 ? 15 : 13, rows = n > 10 ? 17 : n > 7 ? 15 : n > 4 ? 13 : 11;
    const sc = Math.floor(cols / 2), sr = rows - 1;
    for (let tries = 0; tries < 60; tries++) {
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
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (bits(open[r][c]) === 1 && dist[r][c] > (tries > 30 ? 2 : 5)) ends.push({ c, r, d: dist[r][c] });
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
    /* صناديق التصادم للحركة الحرة */
    M.boxes = segs.map(([x, z, h]) => ({ x, z, hw: h ? (MZ.cell + MZ.wallT) / 2 : MZ.wallT / 2, hd: h ? MZ.wallT / 2 : (MZ.cell + MZ.wallT) / 2 }));
    M.doors.forEach(d => { if (d.state === 'bad') block(d); });
    paintMap();
    if (th.sketch) {
      const e = new THREE.LineBasicMaterial({ color: '#2B4C7E' });
      segs.forEach(([x, z, h]) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), e); l.position.set(x, MZ.wallH / 2, z); l.rotation.y = h ? 0 : Math.PI / 2; world.add(l); });
    }
    /* عشب وحصى وأزهار حول المتاهة، وحصى قليل في الممرات */
    K3.scatter(world, th, { x0: -W / 2 - 14, x1: W / 2 + 14, z0: -H / 2 - 14, z1: H / 2 + 10, count: 520, avoid: (x, z) => Math.abs(x) < W / 2 + .7 && Math.abs(z) < H / 2 + .7 });
    /* زينة حول المتاهة */
    for (let i = 0, n = 0; i < 400 && n < 26; i++) {
      const x = K3.rnd(-W / 2 - 11, W / 2 + 11), z = K3.rnd(-H / 2 - 11, H / 2 + 6);
      if (Math.abs(x) < W / 2 + 2.6 && Math.abs(z) < H / 2 + 2.6) continue;
      const p = K3.prop(th, K3.rnd(1, 1.6));
      p.position.set(x, 0, z);
      world.add(p); n++;
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
  S.maze = () => M;
  /* الباب الخاطئ يُغلق بحاجز عند مدخله */
  function block(d) {
    const o = M.open[d.r][d.c], p = at(d.c, d.r);
    const [, [dc, dr]] = Object.entries(DIRS).find(([, v]) => o & v[2]);
    const x = p.x + dc * MZ.cell * .5, z = p.z + dr * MZ.cell * .5;
    M.boxes.push(dc ? { x, z, hw: MZ.wallT / 2, hd: MZ.cell / 2 } : { x, z, hw: MZ.cell / 2, hd: MZ.wallT / 2 });
  }

  /* ---------- خريطة صغيرة في الزاوية: الجدران والأبواب واللاعب ---------- */
  const map = el('canvas', 'k3-map');
  const joyEl = el('div', 'k3-joy', '<i></i>');
  S.wrap.append(map, joyEl);
  let mapBase = null;
  const MK = 9;
  function paintMap() {
    const th = K3.theme(), W = M.cols * MK + 8, H = M.rows * MK + 8, dpr = window.devicePixelRatio || 1;
    map.width = W * dpr; map.height = H * dpr;
    map.style.width = W + 'px'; map.style.height = H + 'px';
    const g = map.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = th.dark ? 'rgba(10,10,30,.72)' : 'rgba(255,255,255,.85)';
    g.beginPath(); g.roundRect(0, 0, W, H, 8); g.fill();
    g.strokeStyle = th.wall2; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath();
    for (let r = 0; r < M.rows; r++) for (let c = 0; c < M.cols; c++) {
      const o = M.open[r][c], X = 4 + c * MK, Y = 4 + r * MK;
      if (!(o & 1)) { g.moveTo(X, Y); g.lineTo(X + MK, Y); }
      if (!(o & 8)) { g.moveTo(X, Y); g.lineTo(X, Y + MK); }
      if (r === M.rows - 1) { g.moveTo(X, Y + MK); g.lineTo(X + MK, Y + MK); }
      if (c === M.cols - 1) { g.moveTo(X + MK, Y); g.lineTo(X + MK, Y + MK); }
    }
    g.stroke();
    mapBase = g.getImageData(0, 0, map.width, map.height);
  }
  function drawMap() {
    if (!mapBase) return;
    const g = map.getContext('2d'), th = K3.theme();
    g.putImageData(mapBase, 0, 0);
    const toMap = (x, z) => [4 + (x / MZ.cell + (M.cols - 1) / 2 + .5) * MK, 4 + (z / MZ.cell + (M.rows - 1) / 2 + .5) * MK];
    M.doors.forEach(d => {
      const p = at(d.c, d.r), [x, y] = toMap(p.x, p.z);
      g.fillStyle = d.state === 'good' ? '#4CAF50' : d.state === 'bad' ? '#C0392B' : th.gold;
      g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
    });
    const [px, py] = toMap(P.x, P.z);
    g.fillStyle = th.accent; g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(px, py, 3.8, 0, 7); g.fill(); g.stroke();
  }

  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    const answers = mixAnswers(q, 16);
    M = makeMaze(answers.length);
    M.doors.forEach((d, k) => { d.a = answers[k]; d.state = ''; });
    const p = at(M.sc, M.sr);
    P.x = p.x; P.z = p.z; P.vx = P.vz = 0; P.knock = null; P.yaw = 0;
    draw();
    camera.position.set(p.x, 12, p.z + 7);
  };

  /* ---------- الحركة الحرة مع التصادم بالجدران ---------- */
  function collide(nx, nz) {
    const R = MZ.R;
    for (let it = 0; it < 2; it++) for (const b of M.boxes) {
      const cx = Math.max(b.x - b.hw, Math.min(nx, b.x + b.hw)), cz = Math.max(b.z - b.hd, Math.min(nz, b.z + b.hd));
      const dx = nx - cx, dz = nz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + dx / d * R; nz = cz + dz / d * R; }
      else if (b.hw < b.hd) nx = b.x + Math.sign(nx - b.x || 1) * (b.hw + R);
      else nz = b.z + Math.sign(nz - b.z || 1) * (b.hd + R);
    }
    return [nx, nz];
  }
  function reach(door) {
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
      /* يرتدّ اللاعب إلى الخانة المجاورة ثم يُغلق الباب */
      const o = M.open[door.r][door.c], [, [dc, dr]] = Object.entries(DIRS).find(([, v]) => o & v[2]);
      const to = at(door.c + dc, door.r + dr);
      P.knock = { fx: P.x, fz: P.z, tx: to.x, tz: to.z, t: 0, door };
      P.vx = P.vz = 0;
      Play.mistake();
    }
  }
  /* عصا التحكم: اسحب بإصبعك من أي مكان في اللوحة */
  K3.controls(S, {
    hold(e, phase) {
      if (phase === 'down' && e) {
        joy.o = { x: e.clientX, y: e.clientY };
        const r = S.wrap.getBoundingClientRect();
        joyEl.style.left = (e.clientX - r.left) + 'px'; joyEl.style.top = (e.clientY - r.top) + 'px';
        joyEl.classList.add('on');
      } else if (phase === 'move' && joy.o && e) {
        const dx = e.clientX - joy.o.x, dy = e.clientY - joy.o.y, len = Math.hypot(dx, dy);
        const k = len < 6 ? 0 : Math.min(1, len / 55) / len;
        joy.x = dx * k; joy.z = dy * k;
        joyEl.firstChild.style.transform = `translate(${Math.max(-28, Math.min(28, dx))}px, ${Math.max(-28, Math.min(28, dy))}px)`;
      } else if (phase === 'up') {
        joy.o = null; joy.x = joy.z = 0;
        joyEl.classList.remove('on'); joyEl.firstChild.style.transform = '';
      }
    },
  });

  S.onFrame = dt => {
    if (!M) return;
    const k = S.keys;
    let ix = joy.x, iz = joy.z;
    if (k.ArrowLeft || k.KeyA) ix -= 1;
    if (k.ArrowRight || k.KeyD) ix += 1;
    if (k.ArrowUp || k.KeyW) iz -= 1;
    if (k.ArrowDown || k.KeyS) iz += 1;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const sp = 4.8, live = S.started && !S.answered && !Play.roundDone && !Play.finished;
    if (P.knock) {
      const n = P.knock;
      n.t = Math.min(1, n.t + dt * 3.2);
      const e = K3.ease(n.t);
      P.x = n.fx + (n.tx - n.fx) * e; P.z = n.fz + (n.tz - n.fz) * e;
      if (n.t >= 1) { block(n.door); P.knock = null; }
    } else {
      P.vx += ((live ? ix : 0) * sp - P.vx) * Math.min(1, dt * 10);
      P.vz += ((live ? iz : 0) * sp - P.vz) * Math.min(1, dt * 10);
      [P.x, P.z] = collide(P.x + P.vx * dt, P.z + P.vz * dt);
      if (live) {
        const door = M.doors.find(d => { if (d.state) return false; const p = at(d.c, d.r); return Math.hypot(p.x - P.x, p.z - P.z) < 1; });
        if (door) reach(door);
      }
    }
    const moving = Math.hypot(P.vx, P.vz);
    if (hero) {
      if (moving > .3) P.yaw = Math.atan2(-P.vx, -P.vz);
      hero.rotation.y += ((P.yaw - hero.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
      hero.position.set(P.x, .65 + Math.abs(Math.sin(S.t * 8)) * Math.min(.14, moving * .03), P.z);
      hero.userData.body.rotation.y += dt * (1 + moving * .4);
      shadow.position.set(P.x, .02, P.z);
    }
    M.doors.forEach(d => { if (d.pad && !d.state) d.pad.material.opacity = .35 + Math.sin(S.t * 4) * .25; });
    drawMap();
    camera.position.x += (P.x - camera.position.x) * Math.min(1, dt * 4);
    camera.position.z += (P.z + 7 - camera.position.z) * Math.min(1, dt * 4);
    camera.position.y += (12 - camera.position.y) * Math.min(1, dt * 3);
    camera.lookAt(camera.position.x, 0, camera.position.z - 9);
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
    MZ3.paint.el.classList.add('k3-qover');
    Play.board.classList.add('k3-full');
    MZ3.wrap.querySelectorAll('.k3-qover').forEach(e => e.remove());
    MZ3.wrap.appendChild(MZ3.paint.el);
    K3.fonts.then(() => MZ3.setQuestion(q));
  },
});
