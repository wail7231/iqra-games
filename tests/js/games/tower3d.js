/* برج المكعبات (ثلاثي الأبعاد) — تُبنى الجملة أو الآية برجًا كلمة فوق كلمة.
   فوق البرج تتدلّى مكعبات عليها كلمات (الكلمة التالية وكلمات أخرى من الجملة)،
   يمين/يسار يختار المكعب، وأسفل (أو لمس المكعب) يُسقطه: الصحيح يستقر فوق البرج،
   والخاطئ يرتطم ويتدحرج ويسقط ويُنقص قلبًا. تكتمل الجملة = نقطة (إن لم يكن فيها خطأ).
   الشكل يتبع قالب الشكل. */
'use strict';

let TOWER = null;
const towerWords = it => it.text.trim().split(/\s+/);
const CUBE_H = .9;

function towerScene() {
  const S = K3.create({ fov: 50, fogNear: 30, fogFar: 85, ratio: .66, maxH: 520 });
  const { scene, camera } = S;
  const stack = new THREE.Group(), hang = new THREE.Group();
  scene.add(stack, hang);
  let words = [], placed = 0, choices = [], sel = 0, falling = [], base, rail, marker, topY = 0, claw;
  S.it = null; S.missed = false; S.done = false;

  S.onTheme = th => {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), K3.mat(th.ground, { map: K3.groundTexture(th, 20) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.02;
    S.env.add(ground);
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + .15 + (i / 15) * (Math.PI - .3), r = K3.rnd(7, 14);
      const p = K3.prop(th, K3.rnd(1.1, 1.7));
      p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 2);
      S.env.add(p);
    }
    K3.horizon(S, th, { radius: 60 });
    K3.weather(S, th, { w: 14, h: 18, d: 20, cz: -3 });
    if (S.it) build(true);
  };

  /* ---------- المكعب: كلمة على وجهيه الأمامي والخلفي ---------- */
  function cube(word, th, state) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const font = `${Play.quran ? 400 : 700} 72px ${Play.quran ? "'Amiri Quran'" : "'IBM Plex Sans Arabic'"}, sans-serif`;
    g.font = font;
    const tw = g.measureText(word).width;
    const w = Math.max(1.5, Math.min(4.2, (tw + 70) / 120));
    c.width = Math.round(w * 120); c.height = Math.round(CUBE_H * 120);
    const bg = state === 'good' ? '#4CAF50' : state === 'bad' ? '#C0392B' : th.card;
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = state ? 'rgba(0,0,0,.25)' : th.accent; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(12, 12, c.width - 24, c.height * .28);
    g.font = font; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = state ? '#FFFFFF' : th.ink;
    g.fillText(word, c.width / 2, c.height / 2 + (Play.quran ? 10 : 3), c.width - 30);
    const face = new THREE.MeshLambertMaterial({ map: K3.texture(c) });
    const side = K3.mat(state === 'good' ? '#3F9A43' : state === 'bad' ? '#A93226' : th.wall);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, CUBE_H, 1.1), [side, side, side, side, face, face]);
    if (th.sketch) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#2B4C7E' })));
    m.userData = { word, w };
    return m;
  }

  function build(keepProgress) {
    const th = K3.theme();
    K3.clear(stack); K3.clear(hang);
    falling.forEach(f => scene.remove(f.m)); falling = [];
    base = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, .5, 8), K3.mat(th.wall2));
    b1.position.y = .25; base.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, .2, 8), K3.mat(th.gold));
    b2.position.y = .6; base.add(b2);
    stack.add(base);
    topY = .7;
    if (!keepProgress) placed = 0;
    for (let i = 0; i < placed; i++) {
      const m = cube(words[i], th, 'good');
      m.position.set(0, topY + CUBE_H / 2, 0);
      m.rotation.y = ((i * 37) % 7 - 3) * .03;
      stack.add(m);
      topY += CUBE_H;
    }
    /* سكة فوقية تتدلّى منها المكعبات */
    rail = new THREE.Mesh(new THREE.BoxGeometry(11, .14, .14), K3.mat(th.wall2));
    hang.add(rail);
    claw = new THREE.Group();
    const clawBody = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .5), K3.mat(th.accent));
    claw.add(clawBody);
    marker = new THREE.Mesh(new THREE.ConeGeometry(.28, .45, 4), K3.glow(th.gold));
    marker.rotation.x = Math.PI;
    claw.add(marker);
    hang.add(claw);
    offer();
  }
  /* الخيارات: الكلمة التالية ومعها حتى كلمتين أخريين من بقية الجملة */
  function offer() {
    choices.forEach(c => hang.remove(c.g));
    choices = [];
    if (placed >= words.length) return;
    const th = K3.theme();
    const next = words[placed];
    const pool = [...new Set(words.slice(placed + 1).filter(w => w !== next))];
    const list = shuffle([next, ...shuffle(pool).slice(0, 2)]);
    const gap = .5, widths = list.map(w => cube(w, th).userData.w);
    let x = -(widths.reduce((s, w) => s + w, 0) + gap * (list.length - 1)) / 2;
    list.forEach((w, k) => {
      const g = new THREE.Group();
      const m = cube(w, th);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .8, 4), K3.mat('#5A5A66'));
      rope.position.y = CUBE_H / 2 + .4;
      g.add(m, rope);
      g.position.x = x + widths[k] / 2;
      x += widths[k] + gap;
      g.userData = { word: w, m, ok: w === next, ph: Math.random() * 6 };
      hang.add(g);
      choices.push({ g, word: w, ok: w === next });
    });
    sel = Math.max(0, Math.min(sel, choices.length - 1));
  }
  S.choices = () => choices;
  S.pick = k => { sel = k; drop(); };
  S.setQuestion = it => {
    S.it = it; S.missed = false; S.done = false;
    words = towerWords(it);
    sel = 0;
    build(false);
  };

  function drop() {
    if (!S.started || S.done || Play.roundDone || falling.some(f => !f.done)) return;
    const c = choices[sel];
    if (!c) return;
    const th = K3.theme();
    const wp = new THREE.Vector3();
    c.g.getWorldPosition(wp);
    const m = cube(c.word, th, c.ok ? 'good' : '');
    m.position.copy(wp);
    scene.add(m);
    hang.remove(c.g);
    choices.splice(choices.indexOf(c), 1);
    FX.play('tick');
    falling.push({ m, ok: c.ok, vy: 0, t: 0, vx: 0, spin: 0, word: c.word, done: false });
  }
  function landed(f) {
    const pt = f.m.position.clone();
    if (f.ok) {
      scene.remove(f.m);
      f.m.position.set(0, topY + CUBE_H / 2, 0);
      f.m.rotation.set(0, ((placed * 37) % 7 - 3) * .03, 0);
      stack.add(f.m);
      topY += CUBE_H;
      placed++;
      f.done = true;
      if (placed >= words.length) {
        S.done = true;
        K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
        FX.play('ok');
        Play.finish(S.missed ? 0 : 1, { delay: 1600 });
      } else { K3.burstAt(S, pt, true, '✓'); FX.play('good'); offer(); }
    } else {
      /* يرتطم ويتدحرج إلى جانب ويسقط */
      f.m.material.forEach((x, i) => { if (i < 4) x.color.set('#C0392B'); });
      f.vx = (Math.random() < .5 ? -1 : 1) * 3.5; f.vy = 4; f.spin = f.vx * 1.6; f.bounced = true;
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      if (!Play.mistake()) setTimeout(() => { if (!S.done) offer(); }, 500);
    }
  }

  K3.controls(S, {
    dir(d) {
      if (d === 'left') sel = Math.max(0, sel - 1);
      if (d === 'right') sel = Math.min(choices.length - 1, sel + 1);
      if (d === 'down' || d === 'up') drop();
      if (d === 'left' || d === 'right') FX.play('tick');
    },
    tap(e) {
      if (!e) { drop(); return; }
      const hit = K3.pick(S, e, choices.map(c => c.g));
      if (!hit) return;
      const k = choices.findIndex(c => { let o = hit.object; while (o && o !== c.g) o = o.parent; return o === c.g; });
      if (k >= 0) { sel = k; drop(); }
    },
  });

  S.onFrame = dt => {
    const hy = topY + 3.4;
    hang.position.y += (hy - hang.position.y) * Math.min(1, dt * 4);
    if (rail) rail.position.y = CUBE_H / 2 + .8;
    choices.forEach((c, k) => {
      c.g.rotation.z = Math.sin(S.t * 1.8 + c.g.userData.ph) * .05;
      c.g.position.y = (k === sel ? -.15 : 0) + Math.sin(S.t * 2 + k) * .04;
      c.g.scale.setScalar(k === sel ? 1.1 : 1);
      /* المكعب المختار يتوهج بلون القالب */
      const side = c.g.userData.m.material[0];
      side.emissive.set(k === sel ? K3.theme().gold : '#000000').multiplyScalar(k === sel ? .45 + Math.sin(S.t * 6) * .15 : 0);
    });
    if (claw && choices[sel]) {
      claw.position.x += (choices[sel].g.position.x - claw.position.x) * Math.min(1, dt * 12);
      claw.position.y = CUBE_H / 2 + .8;
      marker.position.y = .75 + Math.sin(S.t * 5) * .06;
      marker.visible = !falling.some(f => !f.done);
    }
    falling.forEach(f => {
      if (f.done) return;
      f.t += dt;
      f.vy -= 20 * dt;
      f.m.position.y += f.vy * dt;
      f.m.position.x += (f.ok ? -f.m.position.x * Math.min(1, dt * 8) : f.vx * dt);
      f.m.rotation.z += f.spin * dt;
      const floor = topY + CUBE_H / 2;
      if (!f.bounced && f.m.position.y <= floor) { f.m.position.y = floor; landed(f); }
      if (f.bounced && f.m.position.y < -6) { f.done = true; scene.remove(f.m); }
    });
    /* الكاميرا ترتفع مع البرج وتدور حوله قليلًا */
    const cy = topY + 1.3, a = Math.sin(S.t * .25) * .22;
    camera.position.x += (Math.sin(a) * 10 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.z += (Math.cos(a) * 10 - camera.position.z) * Math.min(1, dt * 2);
    camera.position.y += (cy + 1.5 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, cy, 0);
  };
  camera.position.set(0, 4, 10);
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: it => it.hint || towerWords(it).slice(0, 3).join(' ') + '…',
  answer: it => it.text,
  round(it, i) {
    if (i === 0 || !TOWER || !TOWER.wrap.isConnected) {
      if (TOWER) TOWER.wrap.remove();
      TOWER = towerScene();
      Play.board.appendChild(TOWER.wrap);
      TOWER.size();
    }
    const h = Play.head(it.hint || '');
    Play.board.insertBefore(h, TOWER.wrap);
    K3.fonts.then(() => TOWER.setQuestion(it));
  },
});
