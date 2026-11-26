/* ميدان الرماية (ثلاثي الأبعاد، منظور الشخص الأول) — يقف اللاعب وسط ساحة بلدة على الطراز المكسيكي:
   بيوت طينية ملوّنة بأسقف مسطحة تبرز منها عوارض خشبية، وأبواب مقوّسة، ونوافذ بمصاريع، وشرفات، وصبّار وجرار.
   تظهر الأهداف بالتناوب من أماكن مختلفة حول اللاعب: بعضها يطلع من أسفل نافذة أو من خلف صندوق،
   وبعضها ينزل متأرجحًا من حافة سطح، وبعضها ينزلق من خلف جانب بيت. يبقى الهدف ظاهرًا مدة يحددها المعلم
   في الإعدادات (من ثانية إلى ست ثوانٍ) ثم يختفي، ويعود لاحقًا في مكان آخر حتى يُصاب.
   السحب على الشاشة (أو الأسهم) يدير النظر في كل الاتجاهات، واللمسة القصيرة تطلق حيث لُمس (والمسافة تطلق نحو الوسط).
   الهدف الصحيح ينقلب وتتطاير منه نجوم (نقطة إن كان أول اختيار)، والخاطئ يحمرّ ويختفي ويُنقص قلبًا.
   أسهم على طرفي الشاشة تدلّ على أهداف ظاهرة خارج النظر. */
'use strict';

let SHOOT = null;
const SH = { eye: 1.65, R: 15.5, houses: 11, maxUp: 3 };
const SH_WALLS = ['#E9B872', '#D9825B', '#F2D3A2', '#C9663F', '#7FB7BE', '#E5A6A6', '#F5E6C8', '#B9D7A8', '#E8C37A'];

function shootScene() {
  const S = K3.create({ fov: 62, fogNear: 40, fogFar: 110, ratio: .6, maxH: 540 });
  const { scene, camera } = S;
  const town = new THREE.Group();
  scene.add(town);
  let slots = [], targets = [], shots = [], bits = [], gun = null, muzzle = null, recoil = 0, flashT = 0;
  let queue = [], nextAt = 0;
  const look = { yaw: 0, pitch: .08 };
  const aim = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  S.q = null; S.collected = []; S.need = 1; S.missed = false; S.answered = false;
  S.look = look;
  camera.position.set(0, SH.eye, 0);
  camera.rotation.order = 'YXZ';

  /* الشعيرة ثابتة في وسط الشاشة: الكاميرا والسلاح يتحركان معًا والتصويب دائمًا نحو الوسط */
  const cross = el('div', 'k3-cross bow on', '<i></i><b></b>');
  S.wrap.appendChild(cross);
  const hintL = el('div', 'k3-hint l', '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>');
  const hintR = el('div', 'k3-hint r', '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>');
  S.wrap.append(hintL, hintR);
  /* مؤشر الفأرة مخفي فوق اللعبة: الشعيرة في الوسط هي وحدها مكان الإطلاق */
  S.cv.style.cursor = 'none';
  /* قفل المؤشر بعد أول نقرة (كألعاب المنظور الأول): الفأرة تدير النظر بلا حدود ولا يظهر سهمها، وEsc يحرّرها */
  const locked = () => document.pointerLockElement === S.cv;
  const lock = () => { try { if (!locked() && S.cv.requestPointerLock) { const p = S.cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } } catch (_) {} };
  const unlock = () => { try { if (locked()) document.exitPointerLock(); } catch (_) {} };
  S.cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && S.started && !Play.finished) lock(); });
  document.addEventListener('pointerlockchange', () => { if (!locked()) edge = edgeV = 0; });
  const showFor = () => Math.max(1, Math.min(6, +Play.cfg.show || 3));

  /* ---------- قوام الجدران الطينية وأرضية الساحة ---------- */
  function adobeTex(base) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, Math.random() * 3 + .5, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { g.beginPath(); const x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y); g.lineTo(x + K3.rnd(-14, 14), y + K3.rnd(4, 18)); g.stroke(); }
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function cobbleTex(th) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const base = K3.col(th.path).lerp(K3.col('#C9A77A'), th.dark ? 0 : .35);
    g.fillStyle = base.getStyle(); g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 21) for (let x = (y / 21) % 2 ? -12 : 0; x < 256; x += 25) {
      g.fillStyle = base.clone().offsetHSL(0, 0, K3.rnd(-.07, .07)).getStyle();
      g.beginPath(); if (g.roundRect) g.roundRect(x + 2, y + 2, 21, 17, 6); else g.rect(x + 2, y + 2, 21, 17); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.stroke();
    }
    const t = K3.texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); return t;
  }

  /* ---------- صبّار في أصيص، وبيت طيني، وصندوق خشبي ---------- */
  function cactus(s = 1) {
    const g = new THREE.Group(), m = K3.mat('#4E8F4A', { flatShading: true });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.32 * s, .24 * s, .42 * s, 10), K3.mat('#B5532A')); pot.position.y = .21 * s; g.add(pot);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.13 * s, .15 * s, 1 * s, 8), m); body.position.y = .9 * s; g.add(body);
    for (const sx of [-1, 1]) {
      const up = sx > 0 ? .1 : 0;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.08 * s, .09 * s, .4 * s, 7), m); arm.position.set(sx * .22 * s, (.98 + up) * s, 0); g.add(arm);
      const elb = new THREE.Mesh(new THREE.CylinderGeometry(.08 * s, .08 * s, .2 * s, 7), m); elb.rotation.z = Math.PI / 2; elb.position.set(sx * .13 * s, (.8 + up) * s, 0); g.add(elb);
    }
    const top = new THREE.Mesh(new THREE.SphereGeometry(.13 * s, 8, 6), m); top.position.y = 1.4 * s; g.add(top);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(.06 * s, 6, 4), K3.mat('#E5559A')); fl.position.y = 1.52 * s; g.add(fl);
    return g;
  }
  function house(i, th) {
    const g = new THREE.Group();
    const w = K3.rnd(6.2, 7.4), h = K3.rnd(4.4, 6.4), d = 5;
    const wall = SH_WALLS[(i * 4) % SH_WALLS.length];
    const wallM = K3.mat('#FFFFFF', { map: adobeTex(wall) });
    const trimM = K3.mat(K3.col(wall).multiplyScalar(.78).getStyle());
    const wood = K3.mat('#6B4A2E'), dark = K3.mat('#3A2A1E');
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); body.position.y = h / 2; g.add(body);
    /* حافة السطح وشريط القاعدة، ودرجة زخرفية فوق بعض البيوت */
    const par = new THREE.Mesh(new THREE.BoxGeometry(w + .2, .45, d + .2), trimM); par.position.y = h + .2; g.add(par);
    if (i % 2) { const step = new THREE.Mesh(new THREE.BoxGeometry(w * .4, .5, .3), trimM); step.position.set(0, h + .65, d / 2 - .05); g.add(step); }
    const base = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .45, d + .1), trimM); base.position.y = .22; g.add(base);
    /* عوارض خشبية بارزة تحت السطح */
    for (let k = 0; k < Math.floor(w / 1.1); k++) { const v = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .75, 6), wood); v.rotation.x = Math.PI / 2; v.position.set(-w / 2 + .6 + k * 1.1, h - .35, d / 2 + .3); g.add(v); }
    /* باب مقوّس بإطار */
    const doorX = (i % 3 - 1) * w * .28;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, .08), dark); door.position.set(doorX, 1.15, d / 2 + .02); g.add(door);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .08, 16, 1, false, 0, Math.PI), dark); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(doorX, 2.1, d / 2 + .02); g.add(arch);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(.66, .08, 6, 16, Math.PI), trimM); frame.position.set(doorX, 2.1, d / 2 + .05); g.add(frame);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), K3.mat(th.gold)); knob.position.set(doorX + .4, 1.1, d / 2 + .08); g.add(knob);
    /* نوافذ بمصاريع خشبية مفتوحة، وأحواض زهور */
    const winY = Math.min(h - 1.6, 3.1), winXs = [-w * .3, w * .3].filter(x => Math.abs(x - doorX) > 1.6);
    const wins = [];
    winXs.forEach(x => {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, .06), K3.mat('#2C2620')); pane.position.set(x, winY, d / 2 + .02); g.add(pane);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.1, .08), wood); bar.position.set(x, winY, d / 2 + .05); g.add(bar);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.4, .14, .3), trimM); sill.position.set(x, winY - .62, d / 2 + .12); g.add(sill);
      for (const sx of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.15, .06), K3.mat(th.accent)); sh.position.set(x + sx * .82, winY, d / 2 + .06); sh.rotation.y = sx * .35; g.add(sh);
        for (let k = 0; k < 4; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.46, .03, .08), K3.mat(K3.col(th.accent).multiplyScalar(.75).getStyle())); sl.position.copy(sh.position); sl.position.y += -.4 + k * .27; sl.rotation.y = sh.rotation.y; g.add(sl); }
      }
      wins.push({ x, y: winY });
    });
    /* شرفة خشبية لبعض البيوت العالية */
    if (i % 3 === 0 && h > 5.2) {
      const bx = winXs.length ? -winXs[0] * .1 : 0;
      const bal = new THREE.Mesh(new THREE.BoxGeometry(2.4, .14, .9), wood); bal.position.set(bx, h - 1.25, d / 2 + .45); g.add(bal);
      for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, .6, .06), wood); p.position.set(bx - 1.1 + k * .37, h - .9, d / 2 + .85); g.add(p); }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, .08, .08), wood); rail.position.set(bx, h - .6, d / 2 + .85); g.add(rail);
    }
    /* صبّار وجرار فخارية أمام البيت */
    const c1 = cactus(K3.rnd(.8, 1.1)); c1.position.set(w / 2 - .5, 0, d / 2 + .7); g.add(c1);
    if (i % 2 === 0) { const jar = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 10), K3.mat('#B5532A')); jar.scale.y = 1.2; jar.position.set(-w / 2 + .6, .42, d / 2 + .6); g.add(jar); const lip = new THREE.Mesh(new THREE.TorusGeometry(.18, .05, 6, 12), K3.mat('#8A3A1A')); lip.rotation.x = Math.PI / 2; lip.position.set(-w / 2 + .6, .88, d / 2 + .6); g.add(lip); }
    g.userData = { w, h, d, wins };
    return g;
  }
  function crate() {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1), K3.mat('#A0703A')); box.position.y = .55; g.add(box);
    for (const y of [.15, .95]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.54, .1, 1.04), K3.mat('#7A5230')); pl.position.y = y; g.add(pl); }
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, .1, .04), K3.mat('#7A5230')); x1.rotation.z = .6; x1.position.set(0, .55, .52); g.add(x1);
    return g;
  }

  /* ---------- البلدة حول الساحة ---------- */
  S.onTheme = th => {
    targets.forEach(t => t.slot.house.remove(t.g)); targets = [];
    K3.clear(town); slots = [];
    const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 48), K3.mat(th.ground, { map: K3.groundTexture(th, 26) }));
    ground.rotation.x = -Math.PI / 2; town.add(ground);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(SH.R - 2.5, 48), K3.mat('#FFFFFF', { map: cobbleTex(th) })); plaza.rotation.x = -Math.PI / 2; plaza.position.y = .02; town.add(plaza);
    const ring = new THREE.Mesh(new THREE.RingGeometry(SH.R - 2.6, SH.R - 2.3, 64), K3.mat(th.wall2)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; town.add(ring);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, .18, 20), K3.mat('#8A5A30')); deck.position.y = .09; town.add(deck);
    const n = SH.houses;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const hg = house(i, th);
      hg.position.set(-Math.sin(a) * SH.R, 0, -Math.cos(a) * SH.R); hg.rotation.y = a;
      town.add(hg);
      const u = hg.userData, dir = i % 2 ? 1 : -1;
      /* أماكن ظهور الأهداف: من أسفل نافذة، ومن حافة السطح، ومن خلف جانب البيت */
      u.wins.forEach(wv => slots.push({ house: hg, kind: 'up', x: wv.x, y: wv.y - .2, z: u.d / 2 + .35 }));
      slots.push({ house: hg, kind: 'down', x: dir * u.w * .1, y: u.h + .45, z: u.d / 2 + .55 });
      slots.push({ house: hg, kind: 'side', x: dir * (u.w / 2), y: 1.9, z: u.d / 2 - .6, dir });
      /* صندوق في الزقاق بين البيتين يطلع من خلفه هدف، وجدار منخفض يسدّ الزقاق */
      const a2 = a + Math.PI / n, cg = crate();
      cg.position.set(-Math.sin(a2) * (SH.R - 1.6), 0, -Math.cos(a2) * (SH.R - 1.6)); cg.rotation.y = a2; town.add(cg);
      slots.push({ house: cg, kind: 'up', x: 0, y: .2, z: -.15, low: true });
      const wl = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, .5), K3.mat('#FFFFFF', { map: adobeTex(SH_WALLS[(i * 2 + 1) % SH_WALLS.length]) }));
      wl.position.set(-Math.sin(a2) * (SH.R + 1.4), .8, -Math.cos(a2) * (SH.R + 1.4)); wl.rotation.y = a2; town.add(wl);
    }
    /* برج جرس وخزان ماء خلف البيوت، وصبّار كبير وتلال حول البلدة */
    const tower = new THREE.Group();
    const tb = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 3), K3.mat('#FFFFFF', { map: adobeTex('#F2D3A2') })); tb.position.y = 5; tower.add(tb);
    const tt = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 3.4), K3.mat('#C9A06A')); tt.position.y = 10.2; tower.add(tt);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.4, 4), K3.mat('#B5532A')); cap.rotation.y = Math.PI / 4; cap.position.y = 11.6; tower.add(cap);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .1, 16, 1, false, 0, Math.PI), K3.mat('#2C2620')); hole.rotation.set(Math.PI / 2, 0, Math.PI / 2); hole.position.set(0, 8.4, 1.52); tower.add(hole);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(.35, .5, 12, 1, true), K3.mat(th.gold, { side: THREE.DoubleSide })); bell.position.set(0, 8.3, 1.2); tower.add(bell);
    tower.position.set(10, 0, -SH.R - 9); tower.lookAt(0, 0, 0); town.add(tower);
    const wt = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 14), K3.mat('#8A5A30')); tank.position.y = 6.6; wt.add(tank);
    for (const y of [5.8, 7.4]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.62, .05, 6, 20), K3.mat('#5A5A66')); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; wt.add(hoop); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 14), K3.mat('#6B4A2E')); roof.position.y = 8.2; wt.add(roof);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 5.6, 6), K3.mat('#5A4632')); leg.position.set(x * 1.1, 2.8, z * 1.1); wt.add(leg); }
    wt.position.set(-14, 0, SH.R + 8); town.add(wt);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = K3.rnd(26, 36); const p = i % 2 ? cactus(K3.rnd(1.8, 2.8)) : K3.prop(th, K3.rnd(1.4, 2.4)); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); town.add(p); }
    K3.scatter(town, th, { x0: -45, x1: 45, z0: -45, z1: 45, count: 500, avoid: (x, z) => Math.hypot(x, z) < SH.R + 4 });
    K3.horizon(S, th, { radius: 75 });
    K3.weather(S, th, { w: 30, h: 14, d: 60, cz: 0 });
    makeGun(th);
  };

  /* ---------- البندقية في يد اللاعب، تلتفت نحو التصويب، وومضة عند الإطلاق ---------- */
  const GUN_AT = new THREE.Vector3(.62, -.62, -1.5);
  function makeGun(th) {
    if (gun) camera.remove(gun);
    gun = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .3, 1.3), K3.mat('#4A505C')); gun.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.33, .08, 1.1), K3.mat(th.accent)); stripe.position.y = .02; gun.add(stripe);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .9, 12), K3.mat('#5A5A66')); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .06, -.95); gun.add(barrel);
    for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.TorusGeometry(.105, .025, 6, 14), K3.mat('#3A3F4A')); fin.position.set(0, .06, -.65 - i * .14); gun.add(fin); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.11, .035, 6, 16), K3.glow(th.gold)); ring.position.set(0, .06, -1.38); gun.add(ring);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.22, .5, .3), K3.mat('#8A5A30')); grip.position.set(0, -.32, .25); grip.rotation.x = .3; gun.add(grip);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.26, .26, .5), K3.mat('#8A5A30')); stock.position.set(0, -.08, .8); gun.add(stock);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .55, 14), K3.mat('#2A2A30')); scope.rotation.x = Math.PI / 2; scope.position.set(0, .3, -.15); gun.add(scope);
    muzzle = new THREE.Group(); muzzle.position.set(0, .06, -1.5); gun.add(muzzle);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128; const fg = fc.getContext('2d');
    const rg = fg.createRadialGradient(64, 64, 4, 64, 64, 60); rg.addColorStop(0, 'rgba(255,255,240,1)'); rg.addColorStop(.35, 'rgba(255,214,110,.9)'); rg.addColorStop(1, 'rgba(255,140,40,0)');
    fg.fillStyle = rg; fg.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 22 : 62; fg.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } fg.fill();
    const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: K3.texture(fc), transparent: true, depthWrite: false, depthTest: false })); muzzle.add(star);
    const ml = new THREE.PointLight('#FFD27A', 0, 6); muzzle.add(ml);
    muzzle.userData = { star, ml }; muzzle.visible = false;
    gun.rotation.order = 'YXZ'; gun.scale.setScalar(.6);
    gun.position.copy(GUN_AT);
    camera.add(gun); scene.add(camera);
  }
  function aimGun(nx, ny) {
    const t = Math.tan(camera.fov * Math.PI / 360);
    const p = new THREE.Vector3(nx * t * camera.aspect, ny * t, -1).multiplyScalar(16).sub(GUN_AT);
    aim.ty = Math.atan2(-p.x, -p.z); aim.tp = Math.atan2(p.y, Math.hypot(p.x, p.z));
  }

  /* ---------- الهدف: قرص ملوّن على ذراع خشبية، ولافتة الإجابة فوقه (أو تحته للنازل من السطح) ---------- */
  function targetTex(th) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    [th.accent, '#FFFFFF', th.wall2, '#FFFFFF', th.gold].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 124 - k * 24, 0, 7); g.fill(); });
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(128, 128, 124 - k * 24, 0, 7); g.stroke(); }
    return K3.texture(c);
  }
  function makeTarget(a, th, slot) {
    const g = new THREE.Group(), face = new THREE.Group(), kind = slot.kind;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .1, 36), [K3.mat('#8A5A30'), K3.mat('#FFFFFF', { map: targetTex(th) }), K3.mat('#8A5A30')]);
    disc.rotation.x = Math.PI / 2; face.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.73, .05, 8, 36), K3.mat(th.gold)); face.add(rim);
    const armM = K3.mat('#5A4632');
    if (kind === 'down') { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.1, 6), armM); arm.position.y = .9; face.add(arm); }
    else if (kind === 'side') { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.4, 6), armM); arm.rotation.z = Math.PI / 2; arm.position.x = -slot.dir * 1.05; face.add(arm); }
    else { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 6), armM); arm.position.y = -1.1; face.add(arm); }
    g.add(face);
    const sign = K3.sign(a.t, { h: .9, px: 76 });
    if (sign.scale.x > 3.6) sign.scale.set(3.6, 3.6 / sign.userData.ratio, 1);
    sign.position.y = kind === 'down' ? -1.25 : 1.25;
    face.add(sign);
    g.userData = { face, sign };
    return g;
  }
  function nextAnswer() {
    queue = queue.filter(a => !(a.ok && S.collected.includes(a.t)));
    if (!queue.length) queue = shuffle(mixAnswers(S.q, Infinity, S.collected));
    return queue.shift();
  }
  function spawn() {
    const free = slots.filter(s => !s.busy && S.t - (s.freeAt || -9) > 1.2);
    if (!free.length) return;
    const s = free[Math.floor(Math.random() * free.length)];
    const a = nextAnswer();
    if (!a) return;
    const g = makeTarget(a, K3.theme(), s);
    s.house.add(g);
    g.position.set(s.x, s.y, s.z);
    s.busy = true;
    const t = { a, g, slot: s, kind: s.kind, t: 0, stay: showFor(), phase: 'in', k: 0, state: '' };
    pose(t);
    targets.push(t);
  }
  S.targets = () => targets;
  S.setQuestion = q => {
    S.q = q; S.collected = []; S.missed = false; S.answered = false;
    S.need = needAll(q) ? answersOf(q).length : 1;
    targets.forEach(t => { t.slot.house.remove(t.g); t.slot.busy = false; }); targets = [];
    queue = shuffle(mixAnswers(q));
    nextAt = S.t + .6;
  };
  /* موضع الهدف بحسب نوع ظهوره ومقدار ظهوره k (0 مخفي، 1 ظاهر) */
  function pose(t) {
    const f = t.g.userData.face, k = K3.ease(Math.max(0, Math.min(1, t.k))), s = t.slot;
    f.visible = k > .02;
    if (t.kind === 'up') { f.position.y = (s.low ? -.9 : -1) + k * (s.low ? 2.3 : 2.1); f.scale.setScalar(.35 + k * .65); }
    else if (t.kind === 'down') { f.position.y = -1.1; f.rotation.x = -(1 - k) * Math.PI / 2; f.scale.setScalar(.3 + k * .7); }
    else { f.position.x = s.dir * (-1.3 + k * 2.5); f.scale.setScalar(.4 + k * .6); }
  }

  /* ---------- الإطلاق ---------- */
  const ray = new THREE.Raycaster();
  S.fireAt = (nx, ny) => {
    if (!S.started) { S.begin(); return; }
    if (Play.finished || !gun) return;
    aimGun(nx, ny); aim.yaw = aim.ty; aim.pitch = aim.tp; gun.rotation.y = aim.yaw; gun.rotation.x = aim.pitch;
    camera.updateMatrixWorld(true);
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const live = targets.filter(t => !t.state && t.k > .35);
    const hit = ray.intersectObjects(live.map(t => t.g), true)[0];
    const end = hit ? hit.point.clone() : ray.ray.at(30, new THREE.Vector3());
    const start = new THREE.Vector3(); muzzle.getWorldPosition(start);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), K3.glow(K3.aimColor()));
    ball.position.copy(start); scene.add(ball);
    const tgt = hit ? live.find(t => { let o = hit.object; while (o && o !== t.g) o = o.parent; return o === t.g; }) : null;
    shots.push({ ball, start, end, t: 0, tgt });
    recoil = 1; flashT = .13; muzzle.visible = true; muzzle.userData.star.material.rotation = Math.random() * 6;
    FX.play('shoot');
  };
  function burst(pos, colors, n = 18) {
    for (let i = 0; i < n; i++) {
      const m = i % 2 ? K3.starMesh(.14, colors[i % colors.length], .05) : new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .12), K3.glow(colors[i % colors.length]));
      m.position.copy(pos); scene.add(m);
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3;
      bits.push({ m, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + .3, Math.sin(a) * Math.cos(e)).multiplyScalar(K3.rnd(2.5, 6)), life: 1, spin: K3.rnd(-9, 9) });
    }
  }
  function impact(s) {
    const pos = s.end, t = s.tgt;
    if (!t || t.state || S.answered || Play.roundDone) { burst(pos, ['#C9B48A', '#FFFFFF'], 6); FX.play('tick'); return; }
    const pt = S.screen(pos);
    t.phase = 'hit'; t.t = 0;
    if (t.a.ok) {
      t.state = 'good';
      K3.tint(t.g, '#4CAF50', .45);
      burst(pos, [K3.theme().gold, '#FFFFFF', '#7FD36B'], 22);
      S.collected.push(t.a.t);
      if (S.paint) S.paint(S.collected.length);
      if (S.collected.length < S.need) { FX.burst(pt, { count: 14 }); FX.floatText(pt, '✓'); FX.play('good'); return; }
      S.answered = true;
      FX.burst(pt, { count: 28 }); FX.floatText(pt, S.missed ? '✓' : '+١'); FX.play('ok');
      Play.finish(S.missed ? 0 : 1, { delay: 1300 });
    } else {
      t.state = 'bad';
      K3.tint(t.g, '#C0392B', .55);
      burst(pos, ['#C0392B', '#5A5A66'], 10);
      S.missed = true;
      FX.floatText(pt, '✗', '#C0392B'); FX.play('bad');
      Play.mistake(t.a.t);
    }
  }

  /* ---------- التحكم: تحريك الفأرة (أو السحب بالإصبع) يدير الكاميرا مع السلاح، والنقر يطلق نحو الشعيرة ----------
     - الفأرة: حركتها فوق اللعبة تدير النظر مباشرة، وعند الاقتراب من حافة الشاشة يستمر الدوران نحوها.
     - اللمس: سحب الإصبع يدير النظر، واللمسة القصيرة تطلق. */
  let last = null, moved = 0, edge = 0, edgeV = 0;
  const turn = (dx, dy) => { look.yaw -= dx * .0045; look.pitch = Math.max(-.35, Math.min(.7, look.pitch - dy * .0035)); };
  S.cv.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !S.started) return;
    const r = S.cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (e.movementX || e.movementY) turn(e.movementX, e.movementY);
    if (locked()) { edge = edgeV = 0; return; }
    /* قبل القفل: قرب الحافة يمينًا أو يسارًا دوران مستمر بسرعة تتناسب مع القرب */
    edge = fx < .1 ? (.1 - fx) / .1 : fx > .9 ? -(fx - .9) / .1 : 0;
    edgeV = fy < .1 ? (.1 - fy) / .1 : fy > .92 ? -(fy - .92) / .08 : 0;
  });
  S.cv.addEventListener('pointerleave', () => { edge = edgeV = 0; });
  K3.controls(S, {
    hold(e, phase) {
      if (phase === 'down' && e) { last = { x: e.clientX, y: e.clientY }; moved = 0; }
      else if (phase === 'move' && e && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (e.pointerType !== 'mouse') turn(dx * 1.25, dy * 1.25);
        last = { x: e.clientX, y: e.clientY };
      } else if (phase === 'up') last = null;
    },
    tap(e) { if (!e || moved < 14 || (e && e.pointerType === 'mouse')) S.fireAt(0, 0); },
  });
  const fire = el('button', 'k3-btn k3-fire', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>');
  fire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); S.fireAt(0, 0); });
  S.wrap.appendChild(fire);

  const wp = new THREE.Vector3();
  S.onFrame = dt => {
    const k = S.keys, live = S.started && !Play.finished;
    if (!live || !S.wrap.isConnected) unlock();
    if (live) {
      look.yaw += ((k.ArrowLeft || k.KeyA ? 1 : 0) - (k.ArrowRight || k.KeyD ? 1 : 0)) * dt * 1.9;
      look.pitch = Math.max(-.35, Math.min(.7, look.pitch + ((k.ArrowUp || k.KeyW ? 1 : 0) - (k.ArrowDown || k.KeyS ? 1 : 0)) * dt * 1.1));
      look.yaw += edge * dt * 1.6;
      look.pitch = Math.max(-.35, Math.min(.7, look.pitch + edgeV * dt * .8));
    } else look.yaw += dt * .07;
    camera.rotation.y = look.yaw; camera.rotation.x = look.pitch;
    /* جدولة الأهداف: حتى ثلاثة ظاهرة معًا، يظهر كل منها مدة الإعداد ثم يختفي ويعود غيره */
    if (live && S.q && !S.answered && !Play.roundDone && S.t >= nextAt && targets.length < SH.maxUp) { spawn(); nextAt = S.t + K3.rnd(.5, 1.1); }
    targets.forEach(t => {
      t.t += dt;
      if (t.phase === 'in') { t.k = Math.min(1, t.t / .35); if (t.k >= 1) { t.phase = 'up'; t.t = 0; } }
      else if (t.phase === 'up') { t.k = 1; if (t.t >= t.stay) { t.phase = 'out'; t.t = 0; } }
      else if (t.phase === 'out') { t.k = Math.max(0, 1 - t.t / .3); if (t.k <= 0) t.phase = 'gone'; }
      else if (t.phase === 'hit') {
        const f = t.g.userData.face;
        if (t.state === 'good') { f.rotation.y += dt * 12; f.scale.setScalar(Math.max(.01, f.scale.x - dt * 1.6)); }
        else { t.k = Math.max(0, 1 - t.t * 1.6); pose(t); f.position.x += Math.sin(S.t * 60) * .03; }
        if (t.t > .65) t.phase = 'gone';
      }
      if (t.phase === 'in' || t.phase === 'up' || t.phase === 'out') pose(t);
      /* ومضة تحذير قبل اختفاء الهدف بقليل */
      t.g.userData.sign.material.opacity = t.phase === 'up' && t.stay - t.t < .7 ? .45 + Math.abs(Math.sin(S.t * 14)) * .55 : 1;
    });
    targets.filter(t => t.phase === 'gone').forEach(t => { t.slot.house.remove(t.g); t.slot.busy = false; t.slot.freeAt = S.t; });
    targets = targets.filter(t => t.phase !== 'gone');
    /* الطلقات والشظايا */
    shots.forEach(s => { s.t = Math.min(1, s.t + dt * 8); s.ball.position.lerpVectors(s.start, s.end, s.t); if (s.t >= 1 && !s.done) { s.done = true; scene.remove(s.ball); impact(s); } });
    shots = shots.filter(s => !s.done);
    bits.forEach(b => { b.life -= dt * 1.3; b.v.y -= 12 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.z += b.spin * dt; b.m.scale.setScalar(Math.max(.01, b.life)); if (b.life <= 0) scene.remove(b.m); });
    bits = bits.filter(b => b.life > 0);
    /* البندقية والومضة */
    recoil = Math.max(0, recoil - dt * 6);
    if (gun) { aimGun(0, 0); aim.yaw += (aim.ty - aim.yaw) * Math.min(1, dt * 14); aim.pitch += (aim.tp - aim.pitch) * Math.min(1, dt * 14); gun.rotation.y = aim.yaw; gun.rotation.x = aim.pitch + recoil * .22; gun.position.z = GUN_AT.z + recoil * .16; }
    if (muzzle) { flashT -= dt; muzzle.visible = flashT > 0; const q = Math.max(0, flashT / .13); muzzle.userData.star.scale.setScalar(.8 + q * 1.4); muzzle.userData.ml.intensity = q * 2.2; }
    /* مؤشرات الأهداف الظاهرة خارج النظر */
    const half = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) * .9;
    let left = false, right = false;
    targets.forEach(t => { if (t.state || t.phase === 'out') return; t.g.getWorldPosition(wp); const ang = Math.atan2(-wp.x, -wp.z), rel = Math.atan2(Math.sin(ang - look.yaw), Math.cos(ang - look.yaw)); if (rel > half) left = true; if (rel < -half) right = true; });
    hintL.classList.toggle('on', live && left); hintR.classList.toggle('on', live && right);
  };
  S.size();
  return S;
}

Play.register({
  settings: [
    { key: 'show', label: 'مدة ظهور الهدف (بالثواني)', kind: 'range', min: 1, max: 6, def: 3 },
    'lives', 'timer',
  ],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0 || !SHOOT || !SHOOT.wrap.isConnected) {
      if (SHOOT) SHOOT.wrap.remove();
      SHOOT = shootScene();
      Play.board.appendChild(SHOOT.wrap);
      SHOOT.size();
    }
    SHOOT.paint = needHead(q.q, needAll(q) ? answersOf(q).length : 1);
    qOver(SHOOT.wrap, SHOOT.paint.el);
    K3.fonts.then(() => SHOOT.setQuestion(q));
  },
});
