/* الجزر الطائرة (ثلاثي الأبعاد) — جزر صغيرة تطفو في السماء على شبكة، وعلى بعضها لافتات الإجابات.
   يقفز اللاعب من جزيرة إلى جارتها: أعلى = للأمام، أسفل = للخلف، يمين ويسار (بالأسهم أو السحب، أو لمس الجزيرة المجاورة).
   الهبوط على جزيرة إجابة = اختيارها: الصحيحة تخضرّ (نقطة إن كانت أول اختيار)، والخاطئة تهتز وتسقط ويعود اللاعب.
   مع كل سؤال تغوص الجزر القديمة وتصعد جزر جديدة. الشكل يتبع قالب الشكل. */
'use strict';

const ISL = { cols: 7, rows: 6, dx: 2.5, dz: 2.7 };
const ISL_START = Math.floor(ISL.cols / 2);
let ISLE = null;

function islandsScene() {
  const S = K3.create({ fov: 50, fogNear: 30, fogFar: 80, ratio: .62 });
  const { scene, camera } = S;
  const board = new THREE.Group();
  scene.add(board);
  let cells = [], hero, shadow, old = null;
  const P = S.P = { c: ISL_START, r: 0, prev: null, hop: null, x: 0, z: 0, y: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  const pos = (c, r) => new THREE.Vector3((c - (ISL.cols - 1) / 2) * ISL.dx, 0, -r * ISL.dz);

  camera.position.set(0, 7.5, 8);

  S.onTheme = th => {
    K3.horizon(S, th, { radius: 70, y: -14, hills: false });
    K3.weather(S, th, { w: 26, h: 16, d: 50, cz: -8, cy: -6 });
    /* غيوم تحت الجزر */
    for (let i = 0; i < 24; i++) {
      const c = K3.cloud(K3.rnd(.8, 1.6), th.dark ? '#3A4A80' : '#FFFFFF', th.dark ? .55 : .92);
      c.position.set(K3.rnd(-20, 20), K3.rnd(-7, -3.5), K3.rnd(-26, 6));
      c.userData.drift = K3.rnd(.2, .6);
      S.env.add(c);
    }
    S.fx.push(dt => S.env.children.forEach(c => { if (c.userData.drift) { c.position.x += c.userData.drift * dt; if (c.position.x > 18) c.position.x = -18; } }));
    if (hero) scene.remove(hero, shadow);
    hero = K3.player();
    shadow = K3.blob(.5, .3);
    scene.add(hero, shadow);
    if (S.q) build(true);
  };

  /* ---------- جزيرة واحدة: سطح بلون الأرض وصخرة مقلوبة تحتها وزينة صغيرة ---------- */
  function island(th, big, a) {
    const g = new THREE.Group();
    const R = big ? 1.05 : .9;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .92, .32, 9), K3.mat(th.ground, { flatShading: true }));
    top.position.y = -.16; g.add(top);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(R * .9, R * 1.7, 9), K3.mat(th.dark ? '#2A2550' : th.sketch ? '#FFFFFF' : '#9C7A55', { flatShading: true }));
    rock.rotation.x = Math.PI; rock.position.y = -.32 - R * .85; g.add(rock);
    if (th.sketch) { [top, rock].forEach(m => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#2B4C7E' })); e.position.copy(m.position); e.rotation.copy(m.rotation); g.add(e); }); }
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, .08, 9), K3.mat(th.ground2, { flatShading: true }));
    lip.position.y = -.3; g.add(lip);
    const patch = K3.tuftPatch(th, a ? 4 : 7); patch.scale.setScalar(.75); patch.position.y = 0; g.add(patch);
    if (!a && Math.random() < .55) {
      const p = K3.prop(th, .38);
      p.position.set(K3.rnd(-.4, .4), 0, K3.rnd(-.5, -.2));
      g.add(p);
    }
    if (a) {
      /* لافتة الإجابة على عمود */
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.1, 6), K3.mat(th.wall2));
      post.position.set(0, .55, -.55); g.add(post);
      const s = K3.sign(a.t, { h: .74, px: 64 });
      const maxW = 2.45;
      if (s.scale.x > maxW) s.scale.set(maxW, maxW / s.userData.ratio, 1);
      s.position.set(0, 1.35, -.55);
      g.add(s);
      g.userData.sign = s;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * .75, .05, 6, 32), K3.glow(th.gold));
      ring.rotation.x = Math.PI / 2; ring.position.y = .02; g.add(ring);
      g.userData.ring = ring;
    }
    g.userData.R = R;
    g.userData.top = top;
    return g;
  }

  /* ---------- الشبكة: إجابات متباعدة، وجزر عادية بينها، وفجوات قليلة يمكن الوصول رغمها ---------- */
  function layout(answers) {
    const { cols, rows } = ISL;
    for (let tries = 0; tries < 60; tries++) {
      const grid = [...Array(rows)].map(() => Array(cols).fill('plain'));
      const spots = [];
      for (let r = 2; r < rows; r++) for (let c = 0; c < cols; c++) spots.push([c, r]);
      const chosen = [];
      for (const s of shuffle(spots)) {
        if (chosen.length === answers.length) break;
        if (chosen.some(([c, r]) => r === s[1] && Math.abs(c - s[0]) < 2)) continue;
        chosen.push(s);
      }
      if (chosen.length < answers.length) continue;
      chosen.forEach(([c, r], k) => { grid[r][c] = k; });
      for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === 'plain' && Math.random() < (tries < 40 ? .32 : 0)) grid[r][c] = null;
      /* كل جزيرة إجابة يجب أن يُوصَل إليها من البداية عبر الجزر العادية */
      const seen = new Set([ISL_START + ',0']), queue = [[ISL_START, 0]], reach = new Set();
      while (queue.length) {
        const [c, r] = queue.shift();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr, k = nc + ',' + nr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(k)) continue;
          seen.add(k);
          const v = grid[nr][nc];
          if (v === null) continue;
          if (typeof v === 'number') { reach.add(v); continue; }
          queue.push([nc, nr]);
        }
      }
      if (reach.size === answers.length) return grid;
    }
    const grid = [...Array(ISL.rows)].map(() => Array(ISL.cols).fill('plain'));
    answers.forEach((a, k) => { grid[1 + Math.floor(k / 2)][k % 2 ? ISL.cols - 1 : 0] = k; });
    return grid;
  }
  function build(keep) {
    const th = K3.theme();
    if (old) { old.forEach(c => board.remove(c.g)); old = null; }
    if (cells.length) { old = cells; old.forEach(c => { c.sink = 0; }); }
    const answers = keep && S.answers ? S.answers : mixAnswers(S.q, 6, S.collected);
    S.answers = answers;
    const grid = layout(answers);
    cells = [];
    for (let r = 0; r < ISL.rows; r++) for (let c = 0; c < ISL.cols; c++) {
      const v = grid[r][c];
      if (v === null) continue;
      const a = typeof v === 'number' ? answers[v] : null;
      const g = island(th, !!a, a);
      const p = pos(c, r);
      g.position.set(p.x, -9, p.z);
      g.rotation.y = K3.rnd(-.3, .3);
      board.add(g);
      cells.push({ c, r, a, g, rise: -(r * .12 + c * .05), state: '', ph: Math.random() * 6 });
    }
    P.c = ISL_START; P.r = 0; P.prev = null; P.hop = null;
  }
  S.cells = () => cells;
  const cellAt = (c, r) => cells.find(x => x.c === c && x.r === r && x.state !== 'gone');
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false; S.answers = null;
    S.need = needAll(q) ? answersOf(q).length : 1;
    build(false);
  };

  /* ---------- الحركة: قفزة من جزيرة إلى جارتها ---------- */
  function hopTo(c, r, back) {
    if (P.hop || S.answered || Play.roundDone) return;
    const to = cellAt(c, r);
    if (!to || to.state === 'bad') { if (!back) { FX.play('tick'); hero.userData.nudge = { t: 0, dc: c - P.c, dr: r - P.r }; } return; }
    P.hop = { from: { c: P.c, r: P.r }, to, t: 0, back };
    if (!back) P.prev = { c: P.c, r: P.r };
    P.c = c; P.r = r;
    FX.play('tick');
  }
  function land(cell) {
    if (!cell.a || cell.state) return;
    const pt = cell.g.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    if (cell.a.ok) {
      cell.state = 'good';
      K3.tint(cell.g, '#4CAF50', .55);
      K3.recolorSign(cell.g.userData.sign, '✓ ' + cell.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
      S.collected.push(cell.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { K3.burstAt(S, pt, true, '✓'); FX.play('good'); return; }
      S.answered = true;
      K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
      FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      cell.state = 'bad';
      cell.fall = 0;
      K3.tint(cell.g, '#C0392B', .5);
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      if (!Play.mistake()) setTimeout(() => { if (P.prev) hopTo(P.prev.c, P.prev.r, true); }, 380);
    }
  }
  const move = d => {
    if (d === 'up') hopTo(P.c, P.r + 1);
    if (d === 'down') hopTo(P.c, P.r - 1);
    if (d === 'left') hopTo(P.c - 1, P.r);
    if (d === 'right') hopTo(P.c + 1, P.r);
  };
  K3.controls(S, {
    dir: move,
    tap(e) {
      if (!e) return;
      /* لمس جزيرة مجاورة = القفز إليها */
      const hit = K3.pick(S, e, cells.map(c => c.g));
      if (!hit) return;
      const cell = cells.find(c => { let o = hit.object; while (o && o !== c.g) o = o.parent; return o === c.g; });
      if (cell && Math.abs(cell.c - P.c) + Math.abs(cell.r - P.r) === 1) hopTo(cell.c, cell.r);
    },
  });

  S.onFrame = dt => {
    /* صعود الجزر الجديدة وغوص القديمة */
    cells.forEach(c => {
      c.rise = Math.min(1, c.rise + dt * 1.6);
      const k = K3.ease(Math.max(0, c.rise));
      let y = -9 + k * 9 + Math.sin(S.t * 1.4 + c.ph) * .08;
      if (c.state === 'bad') { c.fall += dt; y -= c.fall > .35 ? (c.fall - .35) * (c.fall - .35) * 18 : 0; c.g.position.x += Math.sin(S.t * 60) * .01; if (c.fall > 2) { c.state = 'gone'; board.remove(c.g); } }
      c.g.position.y = y;
      if (c.g.userData.ring) c.g.userData.ring.material.opacity = .6 + Math.sin(S.t * 4) * .3;
    });
    if (old) {
      old.forEach(c => { c.sink += dt * 1.2; c.g.position.y -= c.sink * c.sink * .5; });
      if (old[0] && old[0].sink > 2) { old.forEach(c => board.remove(c.g)); old = null; }
    }
    /* اللاعب يتبع الجزيرة التي يقف عليها، أو يطير في قفزة */
    const here = cellAt(P.c, P.r);
    let target = pos(P.c, P.r), baseY = here ? here.g.position.y : 0;
    if (P.hop) {
      P.hop.t = Math.min(1, P.hop.t + dt * 2.8);
      const k = P.hop.t, a = pos(P.hop.from.c, P.hop.from.r), b = pos(P.hop.to.c, P.hop.to.r);
      target = a.clone().lerp(b, k);
      const fromCell = cellAt(P.hop.from.c, P.hop.from.r);
      baseY = (fromCell ? fromCell.g.position.y : 0) * (1 - k) + P.hop.to.g.position.y * k + Math.sin(k * Math.PI) * 1.4;
      if (k >= 1) { const to = P.hop.to, back = P.hop.back; P.hop = null; if (!back) land(to); }
    }
    P.x += (target.x - P.x) * (P.hop ? 1 : Math.min(1, dt * 10));
    P.z += (target.z - P.z) * (P.hop ? 1 : Math.min(1, dt * 10));
    if (hero) {
      let nx = 0, nz = 0;
      const n = hero.userData.nudge;
      if (n) { n.t += dt * 4; const s = Math.sin(Math.min(1, n.t) * Math.PI) * .25; nx = n.dc * s; nz = -n.dr * s; if (n.t >= 1) hero.userData.nudge = null; }
      hero.position.set(P.x + nx, baseY + .5, P.z + nz);
      hero.userData.body.rotation.y += dt * 1.2;
      if (P.hop) hero.userData.body.rotation.x = P.hop.t * Math.PI * 2;
      else hero.userData.body.rotation.x *= .8;
      shadow.position.set(P.x, (here ? here.g.position.y : -9) + .01, P.z);
      shadow.visible = !P.hop;
    }
    /* الكاميرا خلف اللاعب ومن فوق، تتبعه بنعومة */
    const cx = P.x * .55, cz = P.z;
    camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 3);
    camera.position.z += (cz + 7.4 - camera.position.z) * Math.min(1, dt * 3);
    camera.position.y += (7 - camera.position.y) * Math.min(1, dt * 3);
    camera.lookAt(camera.position.x * .9, -.6, camera.position.z - 9.6);
  };
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !ISLE || !ISLE.wrap.isConnected) {
      if (ISLE) ISLE.wrap.remove();
      ISLE = islandsScene();
      Play.board.appendChild(ISLE.wrap);
      ISLE.size();
    }
    ISLE.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(ISLE.wrap, ISLE.paint.el);
    K3.fonts.then(() => ISLE.setQuestion(q));
  },
});
