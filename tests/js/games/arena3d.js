/* مغامرة الساحة (ثلاثية الأبعاد) — ساحة واسعة يتجوّل فيها الطالب بحرية تامة بكاميرا من الخلف (شخص ثالث):
   الأسهم أو WASD للحركة بالنسبة لاتجاه الكاميرا، Shift للركض، المسافة للقفز، والسحب بالفأرة (أو Q/E) لتدوير الكاميرا.
   على اللمس: عصا تحكم في النصف الأيسر، والسحب في النصف الأيمن يدير الكاميرا، وزر للقفز.
   المهمة في كل سؤال: صناديق موزّعة في الساحة (بعضها فوق منصّات تحتاج قفزًا) وعلى كل صندوق إجابة.
   فتح صندوق الصحيحة يعطي مفتاحًا، وحين تُجمع المفاتيح المطلوبة تضيء البوابة الثابتة فوق منصّتها (يُصعد إليها بدرج) ويشير إليها سهم، ودخولها = الفوز بالسؤال.
   قفزتان (الثانية في الهواء)، وقذائف بلا عدد (نقرة الفأرة أو F أو زر الإطلاق) تنفجر بقوة وتحطّم الكرات الشائكة.
   الصندوق الخاطئ ينفجر دخانًا ويدفع اللاعب ويُنقص قلبًا. كرات شائكة تتدحرج ذهابًا وإيابًا وتدفع من يلمسها.
   الشكل يتبع قالب الشكل. */
'use strict';

let ARENA = null;
const AR = { half: 26, R: .45, run: 5.6, sprint: 9.4, jump: 10, g: 26 };
const GATE_Z = -AR.half + 5, GATE_H = 2.6;

function arenaScene() {
  const S = K3.create({ fov: 58, fogNear: 34, fogFar: 95, ratio: .62, maxH: 540 });
  const { scene, camera } = S;
  const joy = K3.joystick(S);
  const world = new THREE.Group();
  scene.add(world);
  let hero, shadow, arrow, chests = [], portal = null, hazards = [], solids = [], smoke = [];
  const P = S.P = { x: 0, z: 18, y: 0, vx: 0, vz: 0, vy: 0, yaw: Math.PI, ground: true, stun: 0, keys: 0 };
  const cam = { yaw: 0, pitch: .42, dist: 8.5, drag: null };
  S.q = null; S.need = 1; S.missed = false; S.answered = false;

  /* ---------- مخطط الساحة: يُولَّد مرة واحدة ويُرسم بألوان أي قالب ---------- */
  const layout = (() => {
    const L = [], H = AR.half;
    const free = (x, z, r) => Math.hypot(x, z - 18) > 5 && Math.hypot(x, z) > 8 && !(Math.abs(x) < 10 && z < -H + 17) && L.every(b => Math.abs(b.x - x) > b.hw + r && Math.abs(b.z - z) > b.hd + r || Math.hypot(b.x - x, b.z - z) > Math.max(b.hw, b.hd) + r + 1.5);
    /* منصّات بدرجة جانبية للصعود */
    for (let i = 0, t = 0; i < 7 && t < 200; t++) {
      const x = K3.rnd(-H + 5, H - 5), z = K3.rnd(-H + 5, H - 5), w = K3.rnd(2, 3.2), d = K3.rnd(2, 3.2), h = Math.random() < .5 ? 1.2 : 2.3;
      if (!free(x, z, 4)) continue;
      L.push({ x, z, hw: w, hd: d, h, kind: 'plat' });
      if (h > 2) { const sx = Math.random() < .5 ? -1 : 1; L.push({ x: x + sx * (w + 1), z, hw: 1, hd: 1.2, h: 1.1, kind: 'step' }); }
      i++;
    }
    /* أعمدة وجدران قصيرة */
    for (let i = 0, t = 0; i < 12 && t < 300; t++) {
      const x = K3.rnd(-H + 3, H - 3), z = K3.rnd(-H + 3, H - 3), wall = Math.random() < .45;
      const hw = wall ? (Math.random() < .5 ? K3.rnd(2.5, 4) : .4) : .6, hd = wall ? (hw > 1 ? .4 : K3.rnd(2.5, 4)) : .6;
      if (!free(x, z, 3)) continue;
      L.push({ x, z, hw, hd, h: wall ? 1.6 : 3.2, kind: wall ? 'wall' : 'pillar' });
      i++;
    }
    /* منصّة البوابة الثابتة شمال الساحة، ودرج من أربع درجات يصعد إليها */
    L.push({ x: 0, z: GATE_Z, hw: 3.4, hd: 3, h: 2.6, kind: 'gate', step: true });
    for (let k = 1; k <= 4; k++) L.push({ x: 0, z: GATE_Z + 3 + (4 - k) * .9 + .45, hw: 1.5, hd: .45, h: k * .52, kind: 'stair', step: true });
    return L;
  })();

  /* ---------- الرسم ---------- */
  function stoneTex(th, base) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = th.sketch ? '#2B4C7E' : 'rgba(0,0,0,.16)'; g.lineWidth = 3;
    for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(128, r * 32); g.stroke(); for (let x = (r % 2) * 32; x < 128; x += 64) { g.beginPath(); g.moveTo(x, r * 32); g.lineTo(x, r * 32 + 32); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 30; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 6, 3);
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function buildWorld(th) {
    K3.clear(world);
    solids = [];
    const H = AR.half;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 60, H * 2 + 60), K3.mat(th.ground, { map: K3.groundTexture(th, 40) }));
    ground.rotation.x = -Math.PI / 2;
    world.add(ground);
    /* ممرّ دائري في الوسط وحجارة مرصوفة */
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(6, 40), K3.mat(th.path, { transparent: true, opacity: .8 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = .01; world.add(plaza);
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.8, 6.2, 48), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: .4, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .02; world.add(ring);
    /* سور منخفض حول الساحة */
    const wallTex = stoneTex(th, '#' + K3.col(th.wall).lerp(K3.col(th.dark ? '#1B2752' : '#FFFFFF'), .3).getHexString());
    for (const [x, z, hw, hd] of [[0, -H - .5, H + 1, .5], [0, H + .5, H + 1, .5], [-H - .5, 0, .5, H + 1], [H + .5, 0, .5, H + 1]]) {
      const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(hw, hd) / 1.5, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 1.4, hd * 2), K3.mat('#FFFFFF', { map: t }));
      m.position.set(x, .7, z); world.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + .1, .18, hd * 2 + .1), K3.mat(th.wall2)); cap.position.set(x, 1.45, z); world.add(cap);
      solids.push({ x, z, hw, hd, h: 1.4 });
    }
    /* المنصّات والأعمدة والجدران */
    layout.forEach(b => {
      const g = new THREE.Group();
      const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, b.hw), Math.max(1, b.h / 1.2));
      const body = new THREE.Mesh(b.kind === 'pillar' ? new THREE.CylinderGeometry(b.hw, b.hw * 1.1, b.h, 12) : new THREE.BoxGeometry(b.hw * 2, b.h, b.hd * 2), K3.mat('#FFFFFF', { map: t }));
      body.position.y = b.h / 2; g.add(body);
      if (th.sketch) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: '#2B4C7E' })); e.position.copy(body.position); g.add(e); }
      if (b.kind === 'plat' || b.kind === 'step' || b.kind === 'gate' || b.kind === 'stair') {
        const top = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2 + .12, .14, b.hd * 2 + .12), K3.mat(th.ground, { map: K3.groundTexture(th, 4) }));
        top.position.y = b.h + .02; g.add(top);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2 + .2, .1, b.hd * 2 + .2), K3.mat(th.wall2)); trim.position.y = b.h - .06; g.add(trim);
        if (b.kind !== 'stair' && b.kind !== 'gate') K3.scatter(g, th, { x0: -b.hw + .3, x1: b.hw - .3, z0: -b.hd + .3, z1: b.hd - .3, y: b.h + .09, count: Math.round(b.hw * b.hd * 2) });
        if (b.kind === 'stair') for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .9, 6), K3.mat(th.wall2)); post.position.set(sx * 1.45, b.h + .45, 0); g.add(post); }
      } else if (b.kind === 'pillar') {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(b.hw * 1.25, b.hw * 1.1, .3, 12), K3.mat(th.wall2)); cap.position.y = b.h + .15; g.add(cap);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), K3.glow(th.gold)); orb.position.y = b.h + .55; g.add(orb);
      } else {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2 + .12, .16, b.hd * 2 + .12), K3.mat(th.wall2)); cap.position.y = b.h + .08; g.add(cap);
      }
      g.position.set(b.x, 0, b.z);
      world.add(g);
      solids.push({ x: b.x, z: b.z, hw: b.kind === 'pillar' ? b.hw * .9 : b.hw, hd: b.kind === 'pillar' ? b.hw * .9 : b.hd, h: b.kind === 'pillar' ? b.h + .3 : b.h + (b.kind === 'wall' ? .16 : .09), step: !!b.step });
    });
    /* نافورة في وسط الساحة بماء يتحرك ورذاذ */
    const fount = new THREE.Group();
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, .6, 32), K3.mat('#FFFFFF', { map: wallTex }));
    basin.position.y = .3; fount.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, .14, 8, 40), K3.mat(th.wall2)); rim.rotation.x = Math.PI / 2; rim.position.y = .62; fount.add(rim);
    const waterC = { space: '#6E52C8', night: '#2E4A8A', notebook: '#BFD3EA', autumn: '#5E8C7A' }[Play.cfg.theme] || '#3FB0C8';
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshPhongMaterial({ color: waterC, shininess: 120, transparent: true, opacity: .85, emissive: K3.col(waterC).multiplyScalar(.15) }));
    water.rotation.x = -Math.PI / 2; water.position.y = .55; fount.add(water);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.25, .4, 1.6, 12), K3.mat(th.wall2)); column.position.y = 1; fount.add(column);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.9, .4, .3, 20), K3.mat(th.gold)); bowl.position.y = 1.85; fount.add(bowl);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(.18, 1.1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#DDF6FF', transparent: true, opacity: .6 }));
    jet.position.y = 2.5; fount.add(jet);
    const drops = [];
    for (let i = 0; i < 24; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#E6FBFF', transparent: true, opacity: .85 })); fount.add(d); drops.push({ d, t: Math.random(), a: i / 24 * Math.PI * 2 }); }
    jet.onBeforeRender = () => { const t = performance.now() / 1000; jet.scale.y = 1 + Math.sin(t * 6) * .08; water.material.emissiveIntensity = 1; drops.forEach(o => { const k = (t * .7 + o.t) % 1; o.d.position.set(Math.cos(o.a) * k * 1.6, 3 - k * k * 2.4 + k * 1.2, Math.sin(o.a) * k * 1.6); }); };
    world.add(fount);
    solids.push({ x: 0, z: 0, hw: 2.1, hd: 2.1, h: .62 });
    /* مشاعل على السور برايات ملوّنة بينها */
    for (let i = -3; i <= 3; i++) for (const [wx, wz, rot] of [[i * 7, -H - .5, 0], [i * 7, H + .5, Math.PI], [-H - .5, i * 7, Math.PI / 2], [H + .5, i * 7, -Math.PI / 2]]) {
      if (Math.abs(i) === 3) continue;
      const t = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .9, 6), K3.mat('#5A4632')); pole.position.y = 1.95; t.add(pole);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.18, .1, .2, 8), K3.mat(th.wall2)); cup.position.y = 2.45; t.add(cup);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.13, .38, 8), K3.glow(th.dark ? '#7FD3F7' : '#FFB347')); flame.position.y = 2.7; t.add(flame);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: th.dark ? '#7FD3F7' : '#FFB347', transparent: true, opacity: .55, depthWrite: false })); halo.scale.set(1.6, 1.6, 1); halo.position.y = 2.7; t.add(halo);
      flame.onBeforeRender = () => { const q = performance.now() / 120 + wx + wz; flame.scale.set(1 + Math.sin(q) * .12, 1 + Math.sin(q * 1.7) * .2, 1); halo.material.opacity = .45 + Math.sin(q * 1.3) * .12; };
      t.position.set(wx, 0, wz); world.add(t);
      if (i !== 0) {
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.6, 1, 4), K3.mat(i % 2 ? th.accent : th.gold, { side: THREE.DoubleSide }));
        ban.position.set(wx + (rot === 0 || rot === Math.PI ? 3.5 : 0), .7, wz + (rot === 0 || rot === Math.PI ? 0 : 3.5));
        ban.rotation.y = rot; ban.translateZ(.56); world.add(ban);
        const emb = new THREE.Mesh(new THREE.CircleGeometry(.25, 16), K3.mat('#FFFFFF', { side: THREE.DoubleSide })); emb.position.copy(ban.position); emb.rotation.y = rot; emb.translateZ(.01); emb.position.y += .25; world.add(emb);
      }
    }
    /* صناديق خشب وبراميل قرب السور */
    for (let i = 0; i < 14; i++) {
      const side = i % 4, along = K3.rnd(-H + 3, H - 3), off = H - 1.2;
      const x = side === 0 ? along : side === 1 ? along : side === 2 ? -off : off, z = side === 0 ? -off : side === 1 ? off : along;
      if (Math.abs(x) < 10 && z < -H + 17) continue;
      if (solids.some(b => Math.abs(b.x - x) < b.hw + 1 && Math.abs(b.z - z) < b.hd + 1)) continue;
      const g = new THREE.Group();
      if (i % 2) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), K3.mat('#B98446')); crate.position.y = .5; g.add(crate);
        for (const y of [.08, .92]) { const band = new THREE.Mesh(new THREE.BoxGeometry(1.04, .1, 1.04), K3.mat('#7A4A2A')); band.position.y = y; g.add(band); }
        const x1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, .1, .02), K3.mat('#7A4A2A')); x1.position.set(0, .5, .51); x1.rotation.z = .78; g.add(x1);
        const x2 = x1.clone(); x2.rotation.z = -.78; g.add(x2);
        solids.push({ x, z, hw: .5, hd: .5, h: 1 });
      } else {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 1.1, 14), K3.mat('#A0603A')); barrel.position.y = .55; barrel.scale.set(1, 1, 1); g.add(barrel);
        for (const y of [.2, .9]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(.44, .04, 6, 20), K3.mat('#5A5A66')); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; g.add(hoop); }
        solids.push({ x, z, hw: .42, hd: .42, h: 1.1 });
      }
      g.position.set(x, 0, z); g.rotation.y = Math.random() * 6; world.add(g);
    }
    /* زينة خارج السور وتفاصيل على الأرض */
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * Math.PI * 2, r = H * 1.25 + K3.rnd(1, 8);
      const p = K3.prop(th, K3.rnd(1.4, 2.4));
      p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); p.rotation.y = Math.random() * 6;
      world.add(p);
    }
    for (let i = 0; i < 10; i++) {
      const x = K3.rnd(-H + 2, H - 2), z = K3.rnd(-H + 2, H - 2);
      if (solids.some(b => Math.abs(b.x - x) < b.hw + 1.5 && Math.abs(b.z - z) < b.hd + 1.5) || Math.hypot(x, z - 18) < 4) continue;
      const p = K3.prop(th, K3.rnd(.7, 1)); p.position.set(x, 0, z); world.add(p);
      solids.push({ x, z, hw: .35, hd: .35, h: 1.2 });
    }
    K3.scatter(world, th, { x0: -H, x1: H, z0: -H, z1: H, count: 900, avoid: (x, z) => solids.some(b => Math.abs(b.x - x) < b.hw + .2 && Math.abs(b.z - z) < b.hd + .2) || Math.hypot(x, z) < 6.2 });
    K3.scatter(world, th, { x0: -H - 20, x1: H + 20, z0: -H - 20, z1: H + 20, count: 500, avoid: (x, z) => Math.abs(x) < H + 1.2 && Math.abs(z) < H + 1.2 });
  }

  S.onTheme = th => {
    buildWorld(th);
    K3.horizon(S, th, { radius: 90 });
    K3.weather(S, th, { w: 30, h: 16, d: 60, cz: 0 });
    if (hero) scene.remove(hero, shadow, arrow);
    hero = K3.player(); hero.scale.setScalar(1.15);
    shadow = K3.blob(.6, .32);
    /* سهم يدور فوق اللاعب ويشير إلى البوابة حين تُفتح */
    arrow = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .7, 4), K3.glow(th.gold));
    cone.rotation.x = Math.PI / 2; cone.position.z = .4; arrow.add(cone);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .5), K3.glow(th.gold)); tail.position.z = -.1; arrow.add(tail);
    arrow.visible = false;
    scene.add(hero, shadow, arrow);
    hazards.forEach(h => scene.remove(h.g));
    makeHazards(th);
    if (S.q) { const keep = chests.length ? chests.map(c => ({ a: c.a, x: c.x, z: c.z, y: c.y, state: c.state })) : null; spawnChests(keep); placePortal(portal && portal.pos); }
    paintMap();
  };

  /* ---------- الصناديق ---------- */
  function chestMesh(a, th) {
    const g = new THREE.Group();
    const wood = K3.mat(th.dark ? '#5A4A80' : '#A0603A'), gold = K3.mat(th.gold, { emissive: K3.col(th.gold).multiplyScalar(.2) });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, .7, .85), wood); base.position.y = .35; g.add(base);
    const lid = new THREE.Group(); lid.position.set(0, .7, -.42); g.add(lid);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, 1.2, 16, 1, false, 0, Math.PI), wood);
    lidM.rotation.z = Math.PI / 2; lidM.rotation.y = Math.PI / 2; lidM.position.z = .42; lid.add(lidM);
    for (const x of [-.45, .45]) { const band = new THREE.Mesh(new THREE.BoxGeometry(.1, .72, .88), gold); band.position.set(x, .35, 0); g.add(band); }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(.2, .24, .08), gold); lock.position.set(0, .62, .45); g.add(lock);
    const halo = new THREE.Mesh(new THREE.RingGeometry(.9, 1.05, 32), new THREE.MeshBasicMaterial({ color: th.gold, transparent: true, opacity: .5, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .03; g.add(halo);
    const sign = K3.sign(a.t, { h: .9, px: 64 });
    if (sign.scale.x > 3.8) sign.scale.set(3.8, 3.8 / sign.userData.ratio, 1);
    sign.position.y = 2;
    g.add(sign);
    g.userData = { lid, sign, halo };
    return g;
  }
  const topAt = (x, z) => solids.reduce((m, b) => Math.abs(b.x - x) < b.hw && Math.abs(b.z - z) < b.hd ? Math.max(m, b.h) : m, 0);
  function spawnChests(keep) {
    const th = K3.theme();
    chests.forEach(c => world.remove(c.g));
    chests = [];
    const list = keep || mixAnswers(S.q, 6, []).map(a => ({ a }));
    const plats = layout.filter(b => b.kind === 'plat');
    list.forEach((it, k) => {
      if (it.state === 'gone') return;
      let { x, z, y } = it;
      if (x == null) {
        /* نصفها تقريبًا فوق المنصّات (تحتاج قفزًا)، والباقي على الأرض متباعدة */
        const onPlat = k % 2 === 1 && plats.length;
        for (let t = 0; t < 120; t++) {
          if (onPlat) { const b = plats[Math.floor(Math.random() * plats.length)]; x = b.x; z = b.z; y = b.h + .09; }
          else { x = K3.rnd(-AR.half + 3, AR.half - 3); z = K3.rnd(-AR.half + 3, AR.half - 3); y = 0; }
          const clear = onPlat || (!(Math.abs(x) < 7 && z < -AR.half + 14) && Math.hypot(x, z) > 4) && !solids.some(b => Math.abs(b.x - x) < b.hw + 1.4 && Math.abs(b.z - z) < b.hd + 1.4);
          if (clear && chests.every(c => Math.hypot(c.x - x, c.z - z) > 5) && Math.hypot(x - P.x, z - P.z) > 6) break;
        }
      }
      const g = chestMesh(it.a, th);
      g.position.set(x, y, z);
      g.rotation.y = Math.random() * Math.PI * 2;
      world.add(g);
      const c = { a: it.a, g, x, z, y, state: it.state || '', t: 0 };
      chests.push(c);
      if (c.state === 'good') { c.g.userData.lid.rotation.x = -1.9; K3.tint(c.g, '#4CAF50', .5); }
    });
  }
  /* ---------- البوابة ---------- */
  function placePortal() {
    const th = K3.theme();
    if (portal) world.remove(portal.g);
    const pos = { x: 0, z: GATE_Z };
    const g = new THREE.Group();
    const stone = K3.mat(th.wall2);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, .3, 32), stone); base.position.y = .15; g.add(base);
    const runes = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.45, 48), new THREE.MeshBasicMaterial({ color: '#777788', transparent: true, opacity: .6, side: THREE.DoubleSide }));
    runes.rotation.x = -Math.PI / 2; runes.position.y = .32; g.add(runes);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, .22, 12, 40), K3.mat(th.gold, { emissive: K3.col(th.gold).multiplyScalar(.15) }));
    ring.position.y = 2; g.add(ring);
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, 2, 10), stone); p.position.set(sx * 1.6, 1, 0); g.add(p);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.2, 0), K3.mat('#8A8A9A')); gem.position.set(sx * 1.6, 2.25, 0); g.add(gem);
    }
    const veil = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), new THREE.MeshBasicMaterial({ color: '#8A8A9A', transparent: true, opacity: .15, side: THREE.DoubleSide }));
    veil.position.y = 2; g.add(veil);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 16, 24, 1, true), new THREE.MeshBasicMaterial({ color: th.gold, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 8; g.add(beam);
    const light = new THREE.PointLight(th.gold, 0, 16, 1.6); light.position.y = 2; g.add(light);
    const sparks = [];
    /* مصابيح على جانبي الدرج تضيء مع البوابة */
    const lamps = [];
    for (let k = 1; k <= 4; k++) for (const sx of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#6E6A7A' }));
      l.position.set(sx * 1.45, k * .52 + .95 - GATE_H, 3 + (4 - k) * .9 + .45);
      g.add(l); lamps.push(l);
    }
    g.position.set(pos.x, GATE_H + .09, pos.z);
    world.add(g);
    portal = { g, ring, veil, beam, sparks, pos, light, runes, lamps, gems: g.children.filter(c => c.geometry && c.geometry.type === 'OctahedronGeometry'), y: GATE_H + .09, open: false };
    if (P.keys >= S.need) openPortal();
  }
  function openPortal() {
    if (!portal || portal.open) return;
    portal.open = true;
    const gold = K3.theme().gold;
    portal.veil.material.color.set(gold);
    portal.runes.material.color.set(gold);
    portal.lamps.forEach(l => l.material.color.set(gold));
    portal.gems.forEach(m => { m.material = K3.glow(gold); });
    portal.sparks.forEach(s => { s.visible = true; });
    FX.play('good');
  }

  /* ---------- الكرات الشائكة ---------- */
  function makeHazards(th) {
    hazards = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 1), K3.mat(th.dark ? '#3A3570' : '#6B5A4A', { flatShading: true }));
      g.add(ball);
      const spike = new THREE.ConeGeometry(.12, .4, 6), sm = K3.mat(th.accent);
      const ico = new THREE.IcosahedronGeometry(.55, 0).attributes.position;
      for (let k = 0; k < ico.count; k += 3) { const v = new THREE.Vector3().fromBufferAttribute(ico, k).normalize(), c = new THREE.Mesh(spike, sm); c.position.copy(v.clone().multiplyScalar(.6)); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); g.add(c); }
      let x, z, t = 0;
      do { x = K3.rnd(-AR.half + 4, AR.half - 4); z = K3.rnd(-AR.half + 4, AR.half - 8); t++; } while (t < 50 && solids.some(b => Math.abs(b.x - x) < b.hw + 1.5 && Math.abs(b.z - z) < b.hd + 1.5));
      const a = Math.random() * Math.PI * 2;
      g.position.set(x, .65, z);
      scene.add(g);
      hazards.push({ g, x, z, dx: Math.cos(a), dz: Math.sin(a), sp: 2.6 + i * .4 });
    }
  }

  S.chests = () => chests;
  S.portal = () => portal;
  S.setQuestion = q => {
    S.q = q; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    P.keys = 0;
    if (!solids.length) return;
    spawnChests();
    placePortal();
    arrow.visible = false;
    paintMap();
  };

  /* ---------- فتح صندوق ---------- */
  function open(c) {
    if (c.state || S.answered || Play.roundDone) return;
    const pt = c.g.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    if (c.a.ok) {
      c.state = 'good'; c.t = 0;
      K3.tint(c.g, '#4CAF50', .5);
      K3.recolorSign(c.g.userData.sign, '✓ ' + c.a.t, { bg: '#4CAF50', fg: '#FFFFFF', edge: '#2E7D32', px: 64 });
      /* مفتاح ذهبي يطير إلى اللاعب */
      const key = new THREE.Group(), gm = K3.mat(K3.theme().gold, { emissive: K3.col(K3.theme().gold).multiplyScalar(.4) });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(.18, .06, 8, 20), gm); bow.position.y = .3; key.add(bow);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .55, 8), gm); key.add(shaft);
      for (const y of [-.18, -.08]) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(.14, .06, .05), gm); tooth.position.set(.08, y, 0); key.add(tooth); }
      key.position.copy(c.g.position).add(new THREE.Vector3(0, 1, 0));
      scene.add(key);
      c.key = key;
      P.keys++;
      if (S.paint) S.paint(P.keys);
      K3.burstAt(S, pt, true, '🗝');
      FX.play('good');
      if (P.keys >= S.need) openPortal();
    } else {
      c.state = 'bad'; c.t = 0;
      K3.tint(c.g, '#C0392B', .6);
      S.missed = true;
      K3.burstAt(S, pt, false);
      FX.play('bad');
      for (let i = 0; i < 10; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(K3.rnd(.25, .5), 10, 8), new THREE.MeshBasicMaterial({ color: '#6E6A7A', transparent: true, opacity: .7 }));
        m.position.copy(c.g.position).add(new THREE.Vector3(K3.rnd(-.5, .5), K3.rnd(.4, 1), K3.rnd(-.5, .5)));
        scene.add(m); smoke.push({ m, v: new THREE.Vector3(K3.rnd(-1, 1), K3.rnd(1, 2.2), K3.rnd(-1, 1)), life: 1 });
      }
      const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz) || 1;
      P.vx = dx / d * 10; P.vz = dz / d * 10; P.vy = 5; P.stun = .45;
      Play.mistake();
    }
  }
  function win() {
    S.answered = true;
    const pt = portal.g.position.clone().add(new THREE.Vector3(0, 2, 0));
    K3.burstAt(S, pt, true, S.missed ? '✓' : '+١');
    FX.play('ok');
    P.vy = 7;
    Play.finish(S.missed ? 0 : 1, { delay: 1100 });
  }

  /* ---------- القذائف: بلا عدد، تنطلق إلى الأمام وتنفجر بقوة عند أول اصطدام ---------- */
  const shots = [], booms = [];
  let lastShot = 0;
  function fire() {
    if (!S.started || Play.finished || S.t - lastShot < .16) return;
    lastShot = S.t;
    const th = K3.theme(), g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), K3.glow('#FFFFFF')); g.add(core);
    const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: th.gold, transparent: true, opacity: .9, depthWrite: false })); glowS.scale.set(1.3, 1.3, 1); g.add(glowS);
    const dir = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    g.position.set(P.x + dir.x * .8, P.y + 1.05, P.z + dir.z * .8);
    scene.add(g);
    shots.push({ g, dir, life: 1.4, trail: [] });
    FX.play('shoot');
  }
  /* غيمة صغيرة (للقفزة الثانية) */
  function puff(x, y, z) {
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .8 }));
      const a = i / 8 * Math.PI * 2;
      m.position.set(x, y, z); scene.add(m);
      smoke.push({ m, v: new THREE.Vector3(Math.cos(a) * 2.2, -.3, Math.sin(a) * 2.2), life: .7 });
    }
  }
  /* انفجار: وميض، وموجة صادمة، وشظايا ملوّنة، ودخان، واهتزاز الكاميرا */
  function boom(pos, big = false) {
    const th = K3.theme(), k = big ? 1.6 : 1;
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.dotTex(), color: '#FFF3C4', transparent: true, opacity: 1, depthWrite: false }));
    flash.position.copy(pos); scene.add(flash);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 12), new THREE.MeshBasicMaterial({ color: th.gold, transparent: true, opacity: .9 }));
    core.position.copy(pos); scene.add(core);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.6, .9, 40), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, Math.max(.05, pos.y - .8), pos.z); scene.add(ring);
    const light = new THREE.PointLight('#FFB347', 4 * k, 12 * k, 2); light.position.copy(pos); scene.add(light);
    const bits = [];
    const cols = [th.gold, th.accent, '#FFFFFF', '#FFB347'];
    for (let i = 0; i < (big ? 34 : 22); i++) {
      const m = new THREE.Mesh(i % 2 ? new THREE.BoxGeometry(.14, .14, .14) : new THREE.TetrahedronGeometry(.13), K3.glow(cols[i % 4]));
      m.position.copy(pos); scene.add(m);
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2;
      bits.push({ m, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + .4, Math.sin(a) * Math.cos(e)).multiplyScalar(K3.rnd(5, 10) * k), spin: K3.rnd(-10, 10) });
    }
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(K3.rnd(.35, .6) * k, 10, 8), new THREE.MeshBasicMaterial({ color: '#7A7484', transparent: true, opacity: .55 }));
      m.position.copy(pos); scene.add(m);
      smoke.push({ m, v: new THREE.Vector3(K3.rnd(-1.5, 1.5), K3.rnd(1, 2.5), K3.rnd(-1.5, 1.5)), life: 1.2 });
    }
    booms.push({ flash, core, ring, light, bits, t: 0, k });
    cam.shake = Math.max(cam.shake || 0, big ? .45 : .25);
    FX.play('boom');
  }
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i], p = s.g.position;
      p.addScaledVector(s.dir, 24 * dt);
      s.life -= dt;
      /* أثر مضيء خلف القذيفة */
      if (Math.random() < .8) { const t = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshBasicMaterial({ color: K3.theme().gold, transparent: true, opacity: .7 })); t.position.copy(p); scene.add(t); smoke.push({ m: t, v: new THREE.Vector3(0, .3, 0), life: .35 }); }
      const wall = solids.find(b => Math.abs(b.x - p.x) < b.hw + .1 && Math.abs(b.z - p.z) < b.hd + .1 && p.y < b.h + .1);
      const hz = hazards.find(h => !h.dead && Math.hypot(h.x - p.x, h.z - p.z) < 1 && p.y < 1.7);
      const out = Math.abs(p.x) > AR.half + 1 || Math.abs(p.z) > AR.half + 1;
      if (hz || wall || out || s.life <= 0) {
        scene.remove(s.g); shots.splice(i, 1);
        /* موجة الانفجار تحطّم كل كرة شائكة قريبة، حتى لو لم تُصب مباشرة */
        const blast = hazards.filter(h => !h.dead && Math.hypot(h.x - p.x, h.z - p.z) < 4.5);
        boom(p.clone(), blast.length > 0);
        blast.forEach((h, i) => { h.dead = 5; h.g.visible = false; if (h !== hz) setTimeout(() => boom(new THREE.Vector3(h.x, .7, h.z), false), 90 + i * 70); });
      }
    }
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      b.t += dt;
      const t = b.t;
      b.flash.scale.setScalar((1 + t * 22) * b.k); b.flash.material.opacity = Math.max(0, 1 - t * 3);
      b.core.scale.setScalar((1 + t * 6) * b.k); b.core.material.opacity = Math.max(0, .9 - t * 2.4);
      b.ring.scale.setScalar(1 + t * 14 * b.k); b.ring.material.opacity = Math.max(0, .8 - t * 1.6);
      b.light.intensity = Math.max(0, 4 * b.k * (1 - t * 2.5));
      b.bits.forEach(o => { o.v.y -= 18 * dt; o.m.position.addScaledVector(o.v, dt); if (o.m.position.y < .07) { o.m.position.y = .07; o.v.multiplyScalar(.5); o.v.y *= -.4; } o.m.rotation.x += o.spin * dt; o.m.rotation.y += o.spin * dt; o.m.scale.setScalar(Math.max(.01, 1 - Math.max(0, t - .8) * 1.5)); });
      if (t > 1.5) { [b.flash, b.core, b.ring, b.light, ...b.bits.map(o => o.m)].forEach(m => scene.remove(m)); booms.splice(i, 1); }
    }
    /* الكرات المحطّمة تعود بعد لحظات في مكان آخر بعيد عن اللاعب */
    hazards.forEach(h => {
      if (!h.dead) return;
      h.dead -= dt;
      if (h.dead <= 0) {
        h.dead = 0;
        for (let t = 0; t < 40; t++) { h.x = K3.rnd(-AR.half + 4, AR.half - 4); h.z = K3.rnd(-AR.half + 4, AR.half - 8); if (Math.hypot(h.x - P.x, h.z - P.z) > 12 && !solids.some(b => Math.abs(b.x - h.x) < b.hw + 1.5 && Math.abs(b.z - h.z) < b.hd + 1.5)) break; }
        h.g.visible = true; h.g.scale.setScalar(.01); h.grow = 0;
      }
    });
  }
  const fireBtn = el('button', 'k3-btn k3-fire', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>');
  fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!S.started) S.begin(); fire(); });
  S.wrap.appendChild(fireBtn);
  document.addEventListener('keydown', e => { if (S.wrap.isConnected && (e.code === 'KeyF' || e.code === 'KeyJ') && S.started) fire(); });

  /* ---------- التحكم: عصا يسارًا وكاميرا يمينًا على اللمس، وسحب الفأرة يدير الكاميرا ---------- */
  let mode = null;
  /* قفزتان: الأولى من الأرض، والثانية في الهواء مع دورة */
  const jump = () => {
    if (P.stun > .25) return;
    if (P.ground) { P.vy = AR.jump; P.ground = false; P.jumps = 1; FX.play('tick'); }
    else if ((P.jumps || 0) < 2) { P.vy = AR.jump * .92; P.jumps = 2; P.flip = 1; FX.play('pop'); puff(P.x, P.y + .2, P.z); }
  };
  K3.controls(S, {
    hold(e, phase) {
      if (phase === 'down' && e) {
        const r = S.cv.getBoundingClientRect();
        mode = e.pointerType !== 'mouse' && e.clientX < r.left + r.width / 2 ? 'joy' : 'cam';
        if (mode === 'joy') joy.hold(e, 'down');
        cam.drag = e.clientX;
      } else if (phase === 'move' && e) {
        if (mode === 'joy') joy.hold(e, 'move');
        else if (mode === 'cam') { cam.yaw -= (e.clientX - cam.drag) * .009; cam.drag = e.clientX; }
      } else if (phase === 'up') { if (mode === 'joy') joy.hold(e, 'up'); mode = null; }
    },
    tap(e) { if (e && e.pointerType === 'mouse') fire(); else jump(); },
  });
  const jumpBtn = el('button', 'k3-btn k3-jump', '<svg viewBox="0 0 24 24"><path d="M12 19V6M6 11l6-6 6 6"/></svg>');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!S.started) S.begin(); jump(); });
  S.wrap.appendChild(jumpBtn);

  /* ---------- الخريطة الصغيرة ---------- */
  const map = el('canvas', 'k3-map');
  S.wrap.appendChild(map);
  let mapBase = null;
  const MS = 120, toMap = (x, z) => [6 + (x + AR.half) / (AR.half * 2) * (MS - 12), 6 + (z + AR.half) / (AR.half * 2) * (MS - 12)];
  function paintMap() {
    const th = K3.theme(), dpr = window.devicePixelRatio || 1;
    map.width = map.height = MS * dpr; map.style.width = map.style.height = MS + 'px';
    const g = map.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, MS, MS);
    g.fillStyle = th.dark ? 'rgba(10,10,30,.72)' : 'rgba(255,255,255,.85)';
    g.beginPath(); g.roundRect(0, 0, MS, MS, 10); g.fill();
    g.strokeStyle = th.wall2; g.lineWidth = 2; g.strokeRect(5, 5, MS - 10, MS - 10);
    g.fillStyle = th.wall2; g.globalAlpha = .55;
    layout.forEach(b => { const [x, y] = toMap(b.x - b.hw, b.z - b.hd), [x2, y2] = toMap(b.x + b.hw, b.z + b.hd); g.fillRect(x, y, x2 - x, y2 - y); });
    g.globalAlpha = 1;
    mapBase = g.getImageData(0, 0, map.width, map.height);
  }
  function drawMap() {
    if (!mapBase) return;
    const g = map.getContext('2d'), th = K3.theme();
    g.putImageData(mapBase, 0, 0);
    chests.forEach(c => { if (c.state === 'gone' || c.state === 'bad') return; const [x, y] = toMap(c.x, c.z); g.fillStyle = c.state === 'good' ? '#4CAF50' : th.gold; g.fillRect(x - 3, y - 3, 6, 6); });
    if (portal) { const [x, y] = toMap(portal.pos.x, portal.pos.z); g.strokeStyle = portal.open ? th.gold : '#8A8A9A'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 5, 0, 7); g.stroke(); }
    hazards.forEach(h => { if (h.dead) return; const [x, y] = toMap(h.x, h.z); g.fillStyle = '#C0392B'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); });
    const [px, py] = toMap(P.x, P.z);
    g.save(); g.translate(px, py); g.rotate(-P.yaw + Math.PI);
    g.fillStyle = th.accent; g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  /* ---------- الفيزياء ---------- */
  function collide(nx, nz, y) {
    const R = AR.R;
    for (let it = 0; it < 2; it++) for (const b of solids) {
      if (y >= b.h - (b.step ? .72 : .3)) continue;          // فوقه (أو درجة يُصعد إليها): لا يصدّ
      const cx = Math.max(b.x - b.hw, Math.min(nx, b.x + b.hw)), cz = Math.max(b.z - b.hd, Math.min(nz, b.z + b.hd));
      const dx = nx - cx, dz = nz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + dx / d * R; nz = cz + dz / d * R; }
      else if (Math.abs(nx - b.x) / b.hw > Math.abs(nz - b.z) / b.hd) nx = b.x + Math.sign(nx - b.x || 1) * (b.hw + R);
      else nz = b.z + Math.sign(nz - b.z || 1) * (b.hd + R);
    }
    return [nx, nz];
  }
  const floorAt = (x, z, y) => solids.reduce((m, b) => (Math.abs(b.x - x) < b.hw + AR.R * .5 && Math.abs(b.z - z) < b.hd + AR.R * .5 && y >= b.h - (b.step ? .72 : .3)) ? Math.max(m, b.h) : m, 0);

  S.onFrame = dt => {
    if (!solids.length) return;
    const k = S.keys, live = S.started && !Play.finished;
    if (k.KeyQ) cam.yaw += dt * 2.2;
    if (k.KeyE) cam.yaw -= dt * 2.2;
    const inp = live && !P.stun ? joy.read() : { x: 0, z: 0 };
    /* الحركة بالنسبة لاتجاه الكاميرا */
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx;
    let mx = fx * -inp.z + rx * inp.x, mz = fz * -inp.z + rz * inp.x;
    const ml = Math.hypot(mx, mz);
    const sprint = (k.ShiftLeft || k.ShiftRight || Math.hypot(joy.x, joy.z) > .95);
    const sp = sprint ? AR.sprint : AR.run;
    if (P.stun > 0) P.stun = Math.max(0, P.stun - dt);
    else {
      P.vx += (mx * sp - P.vx) * Math.min(1, dt * (P.ground ? 10 : 4));
      P.vz += (mz * sp - P.vz) * Math.min(1, dt * (P.ground ? 10 : 4));
    }
    if (ml > .1) P.yaw = Math.atan2(mx, mz);
    let [nx, nz] = collide(P.x + P.vx * dt, P.z + P.vz * dt, P.y);
    nx = Math.max(-AR.half + .6, Math.min(AR.half - .6, nx)); nz = Math.max(-AR.half + .6, Math.min(AR.half - .6, nz));
    P.x = nx; P.z = nz;
    P.vy -= AR.g * dt;
    P.y += P.vy * dt;
    const fl = floorAt(P.x, P.z, P.y);
    if (P.y <= fl) { if (!P.ground && P.vy < -6) FX.play('tick'); P.y = fl; P.vy = 0; P.ground = true; P.jumps = 0; } else P.ground = P.y - fl < .02;
    if (P.flip) P.flip = Math.max(0, P.flip - dt * 2.4);
    /* اللاعب */
    if (hero) {
      const moving = Math.hypot(P.vx, P.vz);
      hero.position.set(P.x, P.y + .62 + (P.ground ? Math.abs(Math.sin(S.t * (sprint ? 14 : 10))) * Math.min(.18, moving * .03) : 0), P.z);
      hero.rotation.y += ((P.yaw - hero.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 12);
      hero.userData.body.rotation.y += dt * (1 + moving * .5);
      hero.rotation.x = P.flip ? (1 - P.flip) * Math.PI * 2 : P.ground ? 0 : Math.max(-.4, Math.min(.4, -P.vy * .04));
      shadow.position.set(P.x, fl + .03, P.z);
      shadow.scale.setScalar(Math.max(.4, 1 - (P.y - fl) * .15));
      /* السهم يشير إلى البوابة المفتوحة */
      arrow.visible = !!(portal && portal.open && !S.answered);
      if (arrow.visible) arrow.children.forEach(m => { m.material.opacity = 1; });
      if (arrow.visible) {
        arrow.position.set(P.x, P.y + 2.1 + Math.sin(S.t * 4) * .1, P.z);
        arrow.rotation.y = Math.atan2(portal.pos.x - P.x, portal.pos.z - P.z);
      }
    }
    /* الصناديق */
    chests.forEach(c => {
      const ud = c.g.userData;
      if (!c.state) {
        ud.halo.material.opacity = .35 + Math.sin(S.t * 3 + c.x) * .2;
        ud.lid.rotation.x = Math.sin(S.t * 2 + c.z) * .04;
        if (live && Math.hypot(c.x - P.x, c.z - P.z) < 1.25 && Math.abs(P.y - c.y) < 1.2) open(c);
      } else if (c.state === 'good') {
        c.t += dt;
        ud.lid.rotation.x = Math.max(-1.9, ud.lid.rotation.x - dt * 6);
        if (c.key) {
          const k2 = Math.min(1, c.t / .9), from = c.g.position.clone().add(new THREE.Vector3(0, 1.4, 0)), to = new THREE.Vector3(P.x, P.y + 1.5, P.z);
          c.key.position.copy(from.lerp(to, K3.ease(k2))).add(new THREE.Vector3(0, Math.sin(k2 * Math.PI) * 1.5, 0));
          c.key.rotation.y += dt * 8;
          c.key.scale.setScalar(Math.max(.01, 1 - Math.max(0, k2 - .85) * 6));
          if (k2 >= 1) { scene.remove(c.key); c.key = null; }
        }
      } else if (c.state === 'bad') {
        c.t += dt;
        c.g.position.x = c.x + Math.sin(c.t * 50) * .06 * Math.max(0, 1 - c.t);
        if (c.t > .6) { c.g.position.y = c.y - (c.t - .6) * 2; c.g.scale.setScalar(Math.max(.01, 1 - (c.t - .6) * 1.2)); }
        if (c.t > 1.4) { c.state = 'gone'; world.remove(c.g); }
      }
    });
    /* إن انفجرت كل الصناديق الصحيحة المتبقية… (لا يحدث عادة) نعيد توزيعها */
    if (S.q && live && !S.answered && P.keys < S.need && !chests.some(c => !c.state && c.a.ok)) {
      const got = chests.filter(c => c.state === 'good').map(c => c.a.t);
      spawnChests(mixAnswers(S.q, 6, got).map(a => ({ a })));
    }
    smoke.forEach(s => { s.life -= dt * .8; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(1 + (1 - s.life) * 1.5); s.m.material.opacity = Math.max(0, s.life * .7); if (s.life <= 0) scene.remove(s.m); });
    smoke = smoke.filter(s => s.life > 0);
    /* البوابة */
    if (portal) {
      portal.ring.rotation.z += dt * (portal.open ? 1.8 : .2);
      portal.veil.material.opacity = portal.open ? .45 + Math.sin(S.t * 5) * .15 : .12;
      portal.beam.material.opacity += ((portal.open ? .22 : 0) - portal.beam.material.opacity) * Math.min(1, dt * 3);
      portal.sparks.forEach((s, i) => { const a = S.t * 2 + i * .63, r = 1.2 + Math.sin(S.t * 3 + i) * .3; s.position.set(Math.cos(a) * r, 2 + Math.sin(a) * r, Math.sin(S.t + i) * .3); });
      portal.light.intensity += ((portal.open ? 2.2 + Math.sin(S.t * 4) * .4 : 0) - portal.light.intensity) * Math.min(1, dt * 3);
      if (portal.open && live && !S.answered && Math.hypot(portal.pos.x - P.x, portal.pos.z - P.z) < 1.6 && Math.abs(P.y - portal.y) < 1.2) win();
    }
    /* الكرات الشائكة: تتدحرج وترتدّ عن الجدران، وتدفع اللاعب */
    updateShots(dt);
    hazards.forEach(h => {
      if (h.dead) return;
      if (h.grow != null && h.grow < 1) { h.grow = Math.min(1, h.grow + dt * 2); h.g.scale.setScalar(K3.ease(h.grow)); }
      if (live) {
        const nx = h.x + h.dx * h.sp * dt, nz = h.z + h.dz * h.sp * dt;
        const hit = Math.abs(nx) > AR.half - 1 || Math.abs(nz) > AR.half - 1 || solids.some(b => Math.abs(b.x - nx) < b.hw + .6 && Math.abs(b.z - nz) < b.hd + .6);
        if (hit) { const a = Math.atan2(h.dz, h.dx) + Math.PI + K3.rnd(-.8, .8); h.dx = Math.cos(a); h.dz = Math.sin(a); }
        else { h.x = nx; h.z = nz; }
      }
      h.g.position.set(h.x, .65, h.z);
      h.g.rotation.x += h.dz * h.sp * dt / .6; h.g.rotation.z -= h.dx * h.sp * dt / .6;
      if (live && !P.stun && P.y < 1 && Math.hypot(h.x - P.x, h.z - P.z) < 1.15) {
        const dx = P.x - h.x, dz = P.z - h.z, d = Math.hypot(dx, dz) || 1;
        P.vx = dx / d * 11; P.vz = dz / d * 11; P.vy = 6; P.stun = .55; P.ground = false;
        FX.play('bad');
        Play.board.classList.remove('shake'); void Play.board.offsetWidth; Play.board.classList.add('shake');
      }
    });
    drawMap();
    /* كاميرا الشخص الثالث: خلف اللاعب ومن فوق، تتبعه بنعومة ولا تخترق السور */
    const cdx = Math.sin(cam.yaw) * cam.dist * Math.cos(cam.pitch), cdz = Math.cos(cam.yaw) * cam.dist * Math.cos(cam.pitch);
    const tx = P.x + cdx, tz = P.z + cdz, ty = P.y + 1.2 + Math.sin(cam.pitch) * cam.dist;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 6);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 6);
    camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 5);
    if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt); const a = cam.shake * .6; camera.position.x += K3.rnd(-a, a); camera.position.y += K3.rnd(-a, a); }
    camera.lookAt(P.x, P.y + 1.2, P.z);
  };
  camera.position.set(0, 6, 26);
  S.size();
  return S;
}

Play.register({
  settings: ['lives', 'timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !ARENA || !ARENA.wrap.isConnected) {
      if (ARENA) ARENA.wrap.remove();
      ARENA = arenaScene();
      Play.board.appendChild(ARENA.wrap);
      ARENA.size();
    }
    ARENA.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    Play.board.insertBefore(ARENA.paint.el, ARENA.wrap);
    K3.fonts.then(() => ARENA.setQuestion(q));
  },
});
