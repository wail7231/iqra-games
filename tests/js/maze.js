/* لعبة المتاهة — maze.html?id=معرّف اللعبة  (أو ?draft=1 لتجربة المسودة من المحرر)
   لكل سؤال متاهة جديدة تُولَّد عشوائيًا، وفي نهاياتها المسدودة البعيدة عن البداية أبواب ملوّنة مرقّمة هي الإجابات.
   يحرّك الطالب اللاعب إلى باب الإجابة الصحيحة؛ الباب الخاطئ يختفي ويُفقده قلبًا.
   المطاردون يتجوّلون، فإذا اقترب منهم الطالب ضمن مدى كشفهم احمرّت عيونهم وتبعوه،
   ويتركونه إذا ابتعد عنهم. إعدادات اللعب (المستوى، القلوب، المؤقت، الشكل) تحت الأسئلة وتُحفظ لكل لعبة. */
'use strict';

const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }]; // أعلى، يمين، أسفل، يسار
const BIT = [1, 2, 4, 8];
const OPP = [2, 3, 0, 1];
const GATE_COLORS = ['#2E7D9A', '#7A4FB0', '#C77D16', '#3F8A3A', '#C2457A', '#4F6475'];
const PLAYER_SPEED = 6.5;     // خلية في الثانية
const KEY_DIRS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, KeyW: 0, KeyD: 1, KeyS: 2, KeyA: 3 };

/* أنواع المطاردين: السرعة (خلية/ثانية) ومدى الكشف (عدد الخانات على طريق المتاهة) */
const ENEMY_KINDS = {
  square:   { name: 'المربّع', speed: 2.0, detect: 2, color: '#3D4652' },
  triangle: { name: 'المثلث', speed: 2.4, detect: 3, color: '#8A5A12' },
  diamond:  { name: 'المعيّن', speed: 2.8, detect: 4, color: '#4B2C73' },
  hexagon:  { name: 'السداسي', speed: 3.1, detect: 4, color: '#1F5A4D' },
  fire:     { name: 'الكرة النارية', speed: 3.6, detect: 5, color: '#E8541E' },
  ice:      { name: 'الوحش الجليدي', speed: 3.0, detect: 7, color: '#5FB4E0' },
};
const LOSE_EXTRA = 3;         // يترك المطاردُ الطالبَ إذا ابتعد عنه أكثر من مدى كشفه بثلاث خانات
const LEVELS = [
  [], ['square'], ['triangle'], ['diamond'], ['square', 'triangle'],
  ['triangle', 'diamond'], ['diamond', 'hexagon'], ['hexagon', 'fire'], ['fire', 'ice'], ['fire', 'ice', 'diamond'],
];

/* قوالب الشكل: لون الأرضية والجدران وشكل اللاعب */
const THEMES = {
  classic: { name: 'كلاسيكي', player: 'star', playerColor: '#E3B341' },
  night:   { name: 'ليل', floor: '#111933', wall: '#59C3F0', glow: true, player: 'moon', playerColor: '#F6E7A8', dark: true },
  garden:  { name: 'حديقة', floor: '#F4EED9', wall: '#3F7D3A', inner: '#6DAA5C', wallW: .2, player: 'flower', playerColor: '#E5559A' },
  ice:     { name: 'جليد', floor: '#EEF8FC', wall: '#4A9CCB', inner: '#CDEBF7', wallW: .16, player: 'snowflake', playerColor: '#2D7FB8' },
  notebook: { name: 'دفتر', floor: '#FDFBF3', wall: '#2B4C7E', wallW: .09, ruled: '#BFD3EA', margin: '#E8A3A3', player: 'plane', playerColor: '#FFFFFF' },
};

let GAME, isDraft = false, CFG;
let order, qi, score, mistakes, lives, results, t0, finished;
let R = null;                 // الجولة الحالية (سؤال واحد ومتاهته)
const input = { dir: null, sticky: false, held: [] };

const canvas = $('#maze');
const ctx = canvas.getContext('2d');

/* ================= توليد المتاهة ================= */
function bfs(open, cols, rows, sx, sy) {
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  dist[sy][sx] = 0;
  const q = [[sx, sy]];
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (let d = 0; d < 4; d++) {
      if (!(open[y][x] & BIT[d])) continue;
      const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
      if (dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  return dist;
}

/* حفر متاهة كاملة بالرجوع العكسي: كل خلية تتصل بغيرها بطريق واحد */
function carve(cols, rows) {
  const open = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx]) nb.push(d);
    }
    if (!nb.length) { stack.pop(); continue; }
    const d = nb[Math.random() * nb.length | 0];
    const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
    open[y][x] |= BIT[d];
    open[ny][nx] |= BIT[OPP[d]];
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  return open;
}

/* هل الجدران متماسكة؟ لا ساحات مفتوحة (نقطة داخلية بلا أي جدار)، ولا قطع جدار صغيرة طافية.
   الجدران رسمٌ على نقاط الشبكة؛ كل مجموعة جدران غير متصلة بالإطار يجب ألا تقل عن MIN_ISLAND قطعة. */
const MIN_ISLAND = 6;
function wallsSolid(open, cols, rows) {
  const W = cols + 1, H = rows + 1;
  const adj = Array.from({ length: W * H }, () => []);
  const link = (a, b) => { adj[a].push(b); adj[b].push(a); };
  const v = (x, y) => y * W + x;
  for (let y = 0; y <= rows; y++) for (let x = 0; x < cols; x++) {
    if (y === 0 || y === rows || !(open[y][x] & 1)) link(v(x, y), v(x + 1, y));
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x <= cols; x++) {
    if (x === 0 || x === cols || !(open[y][x] & 8)) link(v(x, y), v(x, y + 1));
  }
  const seen = new Uint8Array(W * H);
  for (let y = 1; y < rows; y++) for (let x = 1; x < cols; x++) {
    const s = v(x, y);
    if (!adj[s].length) return false;
    if (seen[s]) continue;
    let border = false, edges = 0;
    const q = [s];
    seen[s] = 1;
    for (let h = 0; h < q.length; h++) {
      const a = q[h], ax = a % W, ay = a / W | 0;
      if (ax === 0 || ay === 0 || ax === cols || ay === rows) border = true;
      edges += adj[a].length;
      for (const b of adj[a]) if (!seen[b]) { seen[b] = 1; q.push(b); }
    }
    if (!border && edges / 2 < MIN_ISLAND) return false;
  }
  return true;
}

/* حلقات قليلة يهرب منها الطالب من المطاردين، بشرط بقاء الجدران متماسكة ودون المساس بالأبواب */
function braid(open, cols, rows, isGate) {
  const want = Math.round(cols * rows * .05);
  let made = 0, tries = 0;
  while (made < want && tries++ < 400) {
    const x = Math.random() * cols | 0, y = Math.random() * rows | 0, d = Math.random() * 4 | 0;
    const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || open[y][x] & BIT[d]) continue;
    if (isGate(x, y) || isGate(nx, ny)) continue;
    open[y][x] |= BIT[d];
    open[ny][nx] |= BIT[OPP[d]];
    if (wallsSolid(open, cols, rows)) { made++; continue; }
    open[y][x] &= ~BIT[d];
    open[ny][nx] &= ~BIT[OPP[d]];
  }
}

/* الأبواب في نهايات مسدودة بعيدة عن البداية ومتباعدة فيما بينها */
function pickGates(open, cols, rows, start, n, minDist) {
  const dist = bfs(open, cols, rows, start.x, start.y);
  const pool = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (dist[y][x] >= minDist && BIT.filter(b => open[y][x] & b).length === 1) pool.push({ x, y });
  }
  const shuffled = shuffle(pool);
  for (let sep = Math.round((cols + rows) / 3); sep >= 2; sep--) {
    const picked = [];
    for (const c of shuffled) {
      if (picked.every(p => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) >= sep)) picked.push(c);
      if (picked.length === n) return picked;
    }
  }
  return null;
}

/* تُعاد المحاولة حتى تتحقق كل الشروط (عادةً من المحاولة الأولى) */
function buildMaze(cols, rows, start, n) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const open = carve(cols, rows);
    const maxD = Math.max(...bfs(open, cols, rows, start.x, start.y).flat());
    const minDist = Math.max(6, Math.round(maxD * (attempt < 40 ? .45 : .3)));
    const cells = pickGates(open, cols, rows, start, n, minDist);
    if (!cells) continue;
    braid(open, cols, rows, (x, y) => cells.some(c => c.x === x && c.y === y));
    /* الحلقات قد تختصر الطريق؛ نتأكد أن كل باب ما زال بعيدًا عن البداية */
    const dist = bfs(open, cols, rows, start.x, start.y);
    if (cells.every(c => dist[c.y][c.x] >= Math.max(6, minDist - 4))) return { open, cells };
  }
  const open = carve(cols, rows);
  return { open, cells: pickGates(open, cols, rows, start, n, 3) };
}

/* ================= الجولة ================= */
function newRound() {
  const q = GAME.questions[order[qi]];
  const portrait = $('.maze-stage').clientWidth < 560;
  const cols = portrait ? 9 : 13, rows = portrait ? 11 : 9;
  const start = { x: cols >> 1, y: rows >> 1 };
  const corrects = answerList(q);
  const answers = shuffle([...corrects.map(text => ({ text, ok: true })), ...q.wrong.map(text => ({ text, ok: false }))]);
  const { open, cells } = buildMaze(cols, rows, start, answers.length);
  const gates = answers.map((a, i) => ({ ...a, x: cells[i].x, y: cells[i].y, color: GATE_COLORS[i], num: toAr(i + 1), gone: false }));

  R = {
    q, cols, rows, open, start, gates,
    gateAt: (x, y) => gates.find(g => !g.gone && g.x === x && g.y === y),
    p: { x: start.x, y: start.y, nx: start.x, ny: start.y, t: 0, moving: false, dir: null },
    need: corrects.length > 1 && q.need === 'all' ? corrects.length : 1, got: 0,
    enemies: [], chaseMap: null, started: false, done: false, missed: false, invuln: 0, hl: -1, hlUntil: 0, clock: 0,
  };
  R.chaseMap = bfs(open, cols, rows, start.x, start.y);
  spawnEnemies();
  resetInput();

  paintQNum();
  $('#qText').textContent = q.q;
  const legend = $('#legend');
  legend.innerHTML = '';
  gates.forEach((g, i) => {
    const b = document.createElement('button');
    b.className = 'ans-key';
    b.innerHTML = `<span class="num"></span><span class="txt"></span>`;
    b.firstChild.style.background = g.color;
    b.firstChild.textContent = g.num;
    b.lastChild.textContent = g.text;
    b.title = 'أين هذا الباب في المتاهة؟';
    b.addEventListener('mouseenter', () => { R.hl = i; });
    b.addEventListener('mouseleave', () => { R.hl = -1; });
    b.addEventListener('click', () => { R.hl = i; R.hlUntil = R.clock + 1.6; });
    g.el = b;
    legend.appendChild(b);
  });
  $('#progressBar').style.width = (qi / order.length * 100) + '%';
  fit();
  message('');
}

/* عند وجوب جمع كل الإجابات الصحيحة يظهر العدّاد بجانب رقم السؤال */
function paintQNum() {
  $('#qNum').textContent = `السؤال ${toAr(qi + 1)} من ${toAr(order.length)}` + (R.need > 1 ? ` · ✓ ${toAr(R.got)} من ${toAr(R.need)}` : '');
}
const answerList = q => Array.isArray(q.correct) ? q.correct : [q.correct];

/* المطاردون يظهرون في أبعد الأماكن عن اللاعب، متباعدين، وخارج الأبواب */
function spawnEnemies() {
  const kinds = LEVELS[CFG.level - 1] || [];
  const pool = [];
  for (let y = 0; y < R.rows; y++) for (let x = 0; x < R.cols; x++) {
    if (!R.gates.some(g => g.x === x && g.y === y)) pool.push({ x, y, d: R.chaseMap[y][x] + Math.random() * 3 });
  }
  pool.sort((a, b) => b.d - a.d);
  const spots = [];
  for (const c of pool) {
    if (spots.length >= kinds.length) break;
    if (spots.every(s => Math.abs(s.x - c.x) + Math.abs(s.y - c.y) >= 5)) spots.push(c);
  }
  R.enemies = spots.map((s, i) => ({
    kind: kinds[i], ...ENEMY_KINDS[kinds[i]],
    x: s.x, y: s.y, nx: s.x, ny: s.y, t: 0, dir: null, chasing: false, alert: 0,
  }));
}

const canGo = (x, y, d) => !!(R.open[y][x] & BIT[d]);

/* ================= الحركة ================= */
function resetInput() { input.dir = null; input.sticky = false; input.held = []; }

function go(d, sticky) {
  if (!R || R.done || finished) return;
  input.dir = d;
  input.sticky = sticky;
  if (!R.started) {
    R.started = true;
    if (!t0) t0 = performance.now();
  }
}

function stepPlayer(dt) {
  const p = R.p;
  let arrived = false;
  if (p.moving) {
    p.t += PLAYER_SPEED * dt;
    if (p.t < 1) return;
    p.x = p.nx; p.y = p.ny; p.t = 0; p.moving = false;
    arrived = true;
    R.chaseMap = bfs(R.open, R.cols, R.rows, p.x, p.y);
    if (onCell()) return;
  }
  if (input.dir == null) return;
  /* الاتجاه المطلوب إن أمكن، وإلا نكمل في الاتجاه نفسه حتى يظهر منعطف */
  const cont = arrived && p.dir != null && canGo(p.x, p.y, p.dir);
  const d = canGo(p.x, p.y, input.dir) ? input.dir : cont ? p.dir : null;
  if (d == null) {
    if (input.sticky) input.dir = null;
    return;
  }
  p.dir = d;
  p.nx = p.x + DIRS[d].dx;
  p.ny = p.y + DIRS[d].dy;
  p.moving = true;
}

function stepEnemy(e, dt) {
  e.alert = Math.max(0, e.alert - dt);
  e.t += e.speed * (e.chasing ? 1.08 : .85) * dt;
  if (e.t < 1 && e.dir != null) return;
  if (e.dir != null) { e.x = e.nx; e.y = e.ny; }
  e.t = 0;

  /* الكشف: المسافة على طريق المتاهة لا عبر الجدران */
  const far = R.chaseMap[e.y][e.x];
  if (!e.chasing && R.invuln <= 0 && far <= e.detect) { e.chasing = true; e.alert = .9; }
  else if (e.chasing && (far > e.detect + LOSE_EXTRA || R.invuln > 0)) e.chasing = false;

  const opts = [];
  for (let d = 0; d < 4; d++) {
    if (!canGo(e.x, e.y, d)) continue;
    const nx = e.x + DIRS[d].dx, ny = e.y + DIRS[d].dy;
    if (!R.gates.some(g => g.x === nx && g.y === ny)) opts.push(d);   // المطارد لا يدخل الأبواب
  }
  if (!opts.length) { e.dir = null; return; }
  let d;
  if (e.chasing && Math.random() < .92) {
    const toPlayer = d => R.chaseMap[e.y + DIRS[d].dy][e.x + DIRS[d].dx];
    d = opts.reduce((a, b) => toPlayer(b) < toPlayer(a) ? b : a);
  } else {
    let choices = opts.filter(d => d !== OPP[e.dir]);
    if (!choices.length) choices = opts;
    d = choices[Math.random() * choices.length | 0];
  }
  e.dir = d;
  e.nx = e.x + DIRS[d].dx;
  e.ny = e.y + DIRS[d].dy;
}

const posOf = o => ({ x: o.x + (o.nx - o.x) * o.t, y: o.y + (o.ny - o.y) * o.t });

/* ================= الأبواب والقلوب ================= */
/* يعيد true إذا انتهت الحركة بدخول باب */
function onCell() {
  const g = R.gateAt(R.p.x, R.p.y);
  if (!g) return false;
  resetInput();
  if (g.ok && R.got + 1 < R.need) {
    g.gone = g.collected = true;
    g.el.classList.add('win');
    mazeCheer(g);
    R.got++;
    paintQNum();
    message(`✓ ${toAr(R.got)} من ${toAr(R.need)}`, 'ok');
  } else if (g.ok) {
    R.got++;
    paintQNum();
    R.done = true;
    mazeCheer(g);
    if (!R.missed) score++;
    results.push({ q: R.q, firstTry: !R.missed });
    g.el.classList.add('win');
    hud();
    message(R.missed ? 'وصلت إلى الإجابة الصحيحة ✓' : 'أحسنت! إجابة صحيحة ✓', 'ok');
    setTimeout(nextQuestion, 1200);
  } else {
    g.gone = true;
    g.el.classList.add('gone');
    R.missed = true;
    mistakes++;
    loseLife('ليست هذه — جرّب بابًا آخر');
  }
  return true;
}

/* احتفال بباب صحيح: من موضع الباب على اللوحة */
function mazeCheer(g) {
  FX.play('ok');
  const r = canvas.getBoundingClientRect();
  const p = { x: r.left + pad + (g.x + .5) * cs, y: r.top + pad + (g.y + .5) * cs };
  FX.burst(p, { count: 24 });
  FX.floatText(p, '✓');
}

function caught() {
  R.missed = true;
  mistakes++;
  const p = R.p;
  Object.assign(p, { x: R.start.x, y: R.start.y, nx: R.start.x, ny: R.start.y, t: 0, moving: false, dir: null });
  R.chaseMap = bfs(R.open, R.cols, R.rows, p.x, p.y);
  spawnEnemies();
  R.invuln = 1.6;
  resetInput();
  loseLife('أمسكك المطارد! عدت إلى المنتصف');
}

function loseLife(msg) {
  FX.play('bad');
  const box = $('#mazeBox');
  box.classList.remove('shake');
  void box.offsetWidth;
  box.classList.add('shake');
  if (CFG.lives > 0) {
    lives--;
    hud();
    if (lives <= 0) {
      R.done = true;
      message('انتهت القلوب', 'bad');
      setTimeout(() => endGame('lives'), 1300);
      return;
    }
  }
  message(msg, 'bad');
}

function nextQuestion() {
  if (finished) return;
  qi++;
  if (qi >= order.length) endGame('done');
  else newRound();
}

let msgTimer;
function message(text, kind = '', stay = false) {
  const m = $('#mazeMsg');
  clearTimeout(msgTimer);
  m.className = 'maze-msg' + (text ? ' show' : '') + (kind ? ' ' + kind : '');
  if (text) m.firstChild.textContent = text;
  if (text && !stay) msgTimer = setTimeout(() => m.classList.remove('show'), 1500);
}

function hud() {
  const max = CFG.lives;
  const left = Math.max(lives, 0);
  $('#livesVal').textContent = max > 0 ? '♥'.repeat(left) + '♡'.repeat(Math.max(0, max - left)) : '♥ ∞';
  $('#scoreVal').textContent = toAr(score);
}

const fmtTime = s => toAr(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const elapsed = () => t0 ? (performance.now() - t0) / 1000 : 0;
let lastClock = '';
function tickClock() {
  const limit = CFG.timer * 60;
  const secs = limit ? Math.max(0, Math.ceil(limit - elapsed())) : Math.floor(elapsed());
  const txt = fmtTime(secs);
  if (txt !== lastClock) {
    lastClock = txt;
    $('#clockVal').textContent = txt;
    $('#clockStat').classList.toggle('urgent', !!limit && secs <= 10);
  }
  if (limit && t0 && secs <= 0 && !finished && !R.done) {
    R.done = true;
    message('انتهى الوقت', 'bad');
    setTimeout(() => endGame('time'), 1200);
  }
}

/* ================= الرسم ================= */
function themeColors(name) {
  const t = { ...THEMES[name] || THEMES.classic };
  if (!t.floor) {
    const css = getComputedStyle(document.documentElement);
    t.dark = document.documentElement.classList.contains('dark');
    t.floor = css.getPropertyValue('--paper').trim();
    t.wall = t.dark ? '#C9A96A' : '#7E2A17';
  }
  t.bad = '#C0392B';
  return t;
}
let T = {};
const readColors = () => { T = themeColors(CFG.theme); $('#mazeBox').style.background = T.floor; FX.themeLayer($('#mazeBox'), CFG.theme, { overlay: true }); };
new MutationObserver(() => { if (CFG) { readColors(); paintThemePreviews(); } })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

let cs = 40, pad = 6, dpr = 1;
function fit() {
  if (!R) return;
  const w = $('.maze-stage').clientWidth;
  const h = window.innerWidth >= 900 ? window.innerHeight - 160 : window.innerHeight * .62;
  cs = Math.max(18, Math.min(64, Math.floor(Math.min((w - 2) / R.cols, h / R.rows))));
  pad = Math.max(3, Math.round(cs * .1));
  dpr = window.devicePixelRatio || 1;
  const W = R.cols * cs + pad * 2, H = R.rows * cs + pad * 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function polygon(c, n, r, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n; i++) c.lineTo(Math.cos(rot + i * 2 * Math.PI / n) * r, Math.sin(rot + i * 2 * Math.PI / n) * r);
  c.closePath();
}

function drawWalls(c, open, cols, rows, size, off, t) {
  const segs = () => {
    c.beginPath();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const o = open[y][x], X = off + x * size, Y = off + y * size;
      if (!(o & 1)) { c.moveTo(X, Y); c.lineTo(X + size, Y); }
      if (!(o & 8)) { c.moveTo(X, Y); c.lineTo(X, Y + size); }
      if (x === cols - 1 && !(o & 2)) { c.moveTo(X + size, Y); c.lineTo(X + size, Y + size); }
      if (y === rows - 1 && !(o & 4)) { c.moveTo(X, Y + size); c.lineTo(X + size, Y + size); }
    }
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = t.wall;
  c.lineWidth = Math.max(2.5, size * (t.wallW || .1));
  if (t.glow) { c.shadowColor = t.wall; c.shadowBlur = size * .35; }
  segs();
  c.stroke();
  c.shadowBlur = 0;
  if (t.inner) {
    c.strokeStyle = t.inner;
    c.lineWidth = Math.max(1, size * (t.wallW || .1) * .35);
    segs();
    c.stroke();
  }
}

/* أرضية الدفتر: أسطر زرقاء وخط هامش أحمر */
function drawRuled(c, t, W, H, step) {
  if (!t.ruled) return;
  c.strokeStyle = t.ruled;
  c.lineWidth = 1;
  c.beginPath();
  for (let y = step; y < H; y += step) { c.moveTo(0, y + .5); c.lineTo(W, y + .5); }
  c.stroke();
  c.strokeStyle = t.margin;
  c.beginPath();
  c.moveTo(W - step * 1.2, 0); c.lineTo(W - step * 1.2, H);
  c.stroke();
}

/* اللاعب — أشكال بلا أرواح: نجمة، هلال، زهرة، ندفة ثلج، طائرة ورقية (تتجه مع الحركة) */
function drawPlayer(c, t, cx, cy, r, clock, dir) {
  c.save();
  c.translate(cx, cy);
  const col = t.playerColor;
  c.lineJoin = 'round';
  switch (t.player) {
    case 'plane':
      c.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir ?? 0] + Math.sin(clock * 5) * .06);
      c.strokeStyle = t.wall; c.lineWidth = Math.max(1.5, r * .11);
      c.beginPath(); c.moveTo(r * 1.05, 0); c.lineTo(-r * .85, -r * .8); c.lineTo(-r * .45, 0); c.closePath();
      c.fillStyle = col; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 1.05, 0); c.lineTo(-r * .85, r * .8); c.lineTo(-r * .45, 0); c.closePath();
      c.fillStyle = '#DCE7F5'; c.fill(); c.stroke();
      break;
    case 'moon':
      c.shadowColor = col; c.shadowBlur = r * .9;
      c.beginPath();
      c.arc(0, 0, r, Math.PI * .28, Math.PI * 1.72, false);
      c.arc(r * .42, -r * .05, r * .78, Math.PI * 1.58, Math.PI * .42, true);
      c.closePath();
      c.fillStyle = col; c.fill();
      break;
    case 'flower':
      c.rotate(clock * .6);
      c.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        c.beginPath(); c.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .42, 0, 7); c.fill();
      }
      c.fillStyle = '#F7C948';
      c.beginPath(); c.arc(0, 0, r * .38, 0, 7); c.fill();
      break;
    case 'snowflake':
      c.rotate(clock * .5);
      c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = Math.max(2, r * .2);
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
        c.moveTo(0, 0); c.lineTo(ca * r, sa * r);
        const bx = ca * r * .55, by = sa * r * .55;
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + .8) * r * .3, by + Math.sin(a + .8) * r * .3);
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - .8) * r * .3, by + Math.sin(a - .8) * r * .3);
      }
      c.stroke();
      break;
    default: // star
      c.rotate(clock * .8);
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, rr = i % 2 ? r * .62 : r;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fillStyle = col; c.fill();
      c.lineWidth = Math.max(1.5, r * .14); c.strokeStyle = t.dark ? '#FFF3D0' : '#7E2A17'; c.stroke();
  }
  c.restore();
}

/* المطارد — شكل هندسي بعينين فقط؛ إذا كشف الطالب احمرّت عيناه وعبس */
function drawFoe(c, kind, cx, cy, r, opts = {}) {
  const k = ENEMY_KINDS[kind], clock = opts.clock || 0, angry = !!opts.angry;
  c.save();
  c.translate(cx, cy);
  if (angry) {
    c.fillStyle = 'rgba(230, 40, 30, .2)';
    c.beginPath(); c.arc(0, 0, r * (1.55 + .12 * Math.sin(clock * 9)), 0, 7); c.fill();
  }
  c.lineJoin = 'round';
  c.lineWidth = r * .22;
  let eyeY = -r * .05, gap = r * .42;
  switch (kind) {
    case 'square': roundRect(c, -r * .95, -r * .95, r * 1.9, r * 1.9, r * .3); break;
    case 'triangle':
      c.beginPath(); c.moveTo(0, -r * 1.15); c.lineTo(r * 1.1, r * .85); c.lineTo(-r * 1.1, r * .85); c.closePath();
      eyeY = r * .3; gap = r * .36; break;
    case 'diamond':
      c.beginPath(); c.moveTo(0, -r * 1.2); c.lineTo(r * 1.05, 0); c.lineTo(0, r * 1.2); c.lineTo(-r * 1.05, 0); c.closePath(); break;
    case 'hexagon': polygon(c, 6, r * 1.05, 0); break;
    case 'fire': {
      const w = Math.sin(clock * 11) * r * .18;
      c.beginPath();
      c.moveTo(w, -r * 1.35);
      c.quadraticCurveTo(r * 1.05, -r * .2, r * .85, r * .35);
      c.arc(0, r * .3, r * .86, 0, Math.PI);
      c.quadraticCurveTo(-r * 1.05, -r * .2, w, -r * 1.35);
      c.closePath();
      eyeY = r * .2; break;
    }
    case 'ice': {
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? r * .82 : r * 1.18;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath(); break;
    }
  }
  if (kind === 'fire') {
    const g = c.createRadialGradient(0, r * .3, r * .1, 0, 0, r * 1.4);
    g.addColorStop(0, '#FFE066'); g.addColorStop(.5, '#FF8A1E'); g.addColorStop(1, '#D9341B');
    c.fillStyle = g;
    c.shadowColor = '#FF7A1A'; c.shadowBlur = r * .8;
    c.fill();
    c.shadowBlur = 0;
  } else {
    c.fillStyle = k.color;
    c.strokeStyle = k.color;
    c.fill();
    c.stroke();
    if (kind === 'ice') { c.lineWidth = r * .08; c.strokeStyle = '#E9F7FF'; c.stroke(); }
    if (opts.outline) { c.lineWidth = r * .07; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); }
  }

  const look = opts.look || { dx: 0, dy: 0 };
  const er = r * .27;
  for (const s of [-1, 1]) {
    const ex = s * gap, ey = eyeY;
    c.fillStyle = angry ? '#FF2A1F' : '#FFFFFF';
    c.beginPath(); c.arc(ex, ey, er, 0, 7); c.fill();
    c.fillStyle = angry ? '#2A0505' : '#1C1612';
    c.beginPath(); c.arc(ex + look.dx * er * .45, ey + look.dy * er * .45, er * (angry ? .42 : .5), 0, 7); c.fill();
    if (angry) {
      c.strokeStyle = '#1C1612'; c.lineCap = 'round'; c.lineWidth = Math.max(1.5, r * .13);
      c.beginPath();
      c.moveTo(ex + s * er * 1.1, ey - er * 1.65);
      c.lineTo(ex - s * er * .9, ey - er * .95);
      c.stroke();
    }
  }
  if (opts.alert > 0) {
    c.fillStyle = '#FF2A1F';
    c.font = `800 ${Math.round(r * 1.1)}px 'IBM Plex Sans Arabic', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText('!', 0, -r * 1.45);
  }
  c.restore();
}

function draw() {
  const W = R.cols * cs + pad * 2, H = R.rows * cs + pad * 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.floor;
  ctx.fillRect(0, 0, W, H);
  drawRuled(ctx, T, W, H, cs / 2);

  /* علامة المنتصف حيث يبدأ اللاعب */
  ctx.fillStyle = T.wall;
  ctx.globalAlpha = .1;
  roundRect(ctx, pad + R.start.x * cs + cs * .15, pad + R.start.y * cs + cs * .15, cs * .7, cs * .7, cs * .2);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* الأبواب */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (R.hlUntil && R.hlUntil < R.clock && R.hl >= 0 && !R.gates[R.hl].el.matches(':hover')) { R.hl = -1; R.hlUntil = 0; }
  R.gates.forEach((g, i) => {
    const x = pad + g.x * cs, y = pad + g.y * cs, m = cs * .12;
    if (g.collected) {
      ctx.strokeStyle = '#3F8A3A';
      ctx.globalAlpha = .7;
      ctx.lineWidth = Math.max(2.5, cs * .09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + cs * .28, y + cs * .52); ctx.lineTo(x + cs * .44, y + cs * .68); ctx.lineTo(x + cs * .74, y + cs * .34);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (g.gone) {
      ctx.strokeStyle = T.bad;
      ctx.globalAlpha = .45;
      ctx.lineWidth = Math.max(2, cs * .07);
      ctx.beginPath();
      ctx.moveTo(x + cs * .3, y + cs * .3); ctx.lineTo(x + cs * .7, y + cs * .7);
      ctx.moveTo(x + cs * .7, y + cs * .3); ctx.lineTo(x + cs * .3, y + cs * .7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (R.hl === i) {
      ctx.fillStyle = g.color;
      ctx.globalAlpha = .3 + .2 * Math.sin(R.clock * 8);
      roundRect(ctx, x, y, cs, cs, cs * .25);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = g.color;
    roundRect(ctx, x + m, y + m, cs - m * 2, cs - m * 2, cs * .2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(cs * .44)}px 'IBM Plex Sans Arabic', sans-serif`;
    ctx.fillText(g.num, x + cs / 2, y + cs / 2 + cs * .03);
  });

  drawWalls(ctx, R.open, R.cols, R.rows, cs, pad, T);

  for (const e of R.enemies) {
    const { x, y } = posOf(e);
    drawFoe(ctx, e.kind, pad + (x + .5) * cs, pad + (y + .5) * cs, cs * .3, {
      angry: e.chasing, alert: e.alert, clock: R.clock, outline: T.dark,
      look: e.dir == null ? null : DIRS[e.dir],
    });
  }

  /* اللاعب يومض أثناء الحماية بعد الإمساك به */
  if (!(R.invuln > 0 && Math.floor(R.invuln * 10) % 2)) {
    const p = posOf(R.p);
    drawPlayer(ctx, T, pad + (p.x + .5) * cs, pad + (p.y + .5) * cs, cs * .36, R.clock, R.p.dir);
  }
}

let last = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0);
  last = now;
  if (R && !finished) {
    R.clock += dt;
    if (R.invuln > 0) R.invuln -= dt;
    if (R.started && !R.done) {
      stepPlayer(dt);
      if (!R.done) {
        R.enemies.forEach(e => stepEnemy(e, dt));
        const p = posOf(R.p);
        if (R.invuln <= 0 && R.enemies.some(e => { const q = posOf(e); return Math.hypot(q.x - p.x, q.y - p.y) < .55; })) caught();
      }
    }
    tickClock();
    draw();
  }
  requestAnimationFrame(loop);
}

/* ================= التحكم ================= */
document.addEventListener('keydown', e => {
  const d = KEY_DIRS[e.code];
  if (d == null || e.target.closest('input, textarea')) return;
  e.preventDefault();
  if (!input.held.includes(d)) input.held.push(d);
  go(d, false);
});
document.addEventListener('keyup', e => {
  const d = KEY_DIRS[e.code];
  if (d == null) return;
  input.held = input.held.filter(x => x !== d);
  if (!input.sticky) input.dir = input.held.length ? input.held[input.held.length - 1] : null;
});
window.addEventListener('blur', resetInput);

/* سحب على المتاهة = اتجاه السحب، وضغطة = اتجاه النقطة المضغوطة من اللاعب */
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', e => {
  if (!down || !R) return;
  let dx = e.clientX - down.x, dy = e.clientY - down.y;
  if (Math.hypot(dx, dy) < 18) {
    const rect = canvas.getBoundingClientRect(), p = posOf(R.p);
    dx = e.clientX - (rect.left + pad + (p.x + .5) * cs);
    dy = e.clientY - (rect.top + pad + (p.y + .5) * cs);
    if (Math.hypot(dx, dy) < cs * .4) { down = null; return; }
  }
  go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0), true);
  down = null;
});

$$('#dpad button').forEach(b => {
  const d = +b.dataset.d;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); go(d, false); });
  const stop = () => { if (input.dir === d && !input.sticky) input.dir = null; };
  b.addEventListener('pointerup', stop);
  b.addEventListener('pointercancel', stop);
});

window.addEventListener('resize', fit);

/* ================= إعدادات اللعب ================= */
/* نسخة الطلاب (الموقع المنشور): الإعدادات مخفية وتأتي من الرابط الذي ينسخه المعلم */
const PARAMS = new URLSearchParams(location.search);
const STUDENT = PARAMS.has('student') || (location.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(location.hostname));

const cfgKey = () => isDraft ? 'iqra_game_cfg_preview' : `iqra_game_cfg_${GAME.id}`;
function loadCfg() {
  const s = GAME.settings || {};
  const legacy = { easy: 1, medium: 3, hard: 6 }[s.difficulty];
  const cfg = { level: s.level || legacy || 3, lives: s.lives ?? 3, timer: 0, theme: 'classic' };
  if (STUDENT) {
    const num = (k, min, max) => { const v = Number(PARAMS.get(k)); return PARAMS.has(k) && Number.isInteger(v) && v >= min && v <= max ? v : undefined; };
    const fromLink = { level: num('lvl', 1, 10), lives: num('lives', 0, 9), timer: num('timer', 0, 30), theme: PARAMS.get('theme') || undefined };
    for (const k in fromLink) if (fromLink[k] !== undefined) cfg[k] = fromLink[k];
  } else {
    Object.assign(cfg, store.json(cfgKey()));
  }
  if (!THEMES[cfg.theme]) cfg.theme = 'classic';
  return cfg;
}
const saveCfg = () => { if (!STUDENT) store.set(cfgKey(), JSON.stringify(CFG)); };

/* حفظ الإعدادات ونسخ الرابط: التغييرات تُجرَّب فورًا في اللعبة، لكن الرابط لا يُنسخ إلا بعد «حفظ التغييرات»،
   حتى يحمل الرابط دائمًا ما يراه المعلم. حالة النشر تُفحص مسبقًا فيُنسخ الرابط فور الضغط. */
let savedCfg = '', pubState = 'unknown', canShare = false;
const dirty = () => JSON.stringify(CFG) !== savedCfg;
function markDirty() {
  if (canShare) paintShare();
  else saveCfg();               // المسودة: تُحفظ تلقائيًا كما كانت
}
function paintShare() {
  const save = $('#saveCfgBtn'), share = $('#shareBtn');
  save.disabled = !dirty();
  save.lastElementChild.textContent = dirty() ? 'حفظ التغييرات' : 'محفوظة ✓';
  share.disabled = dirty() || pubState === 'missing' || pubState === 'old';
  share.lastElementChild.textContent =
    pubState === 'missing' ? 'اللعبة غير منشورة بعد'
    : pubState === 'old' ? 'على الموقع نسخة قديمة من اللعبة'
    : 'نسخ رابط اللعبة للطلاب';
}
function bindShare() {
  canShare = true;
  savedCfg = JSON.stringify(CFG);
  $('#shareRow').classList.remove('hidden');
  $('#saveCfgBtn').addEventListener('click', () => {
    saveCfg();
    savedCfg = JSON.stringify(CFG);
    paintShare();
    toast('حُفظت الإعدادات ✓');
  });
  $('#shareBtn').addEventListener('click', async () => {
    const link = studentLink();
    const ok = await copyText(link);
    const lives = CFG.lives > 0 ? toAr(CFG.lives) + ' قلوب' : 'قلوب بلا حد';
    toast(ok ? `نُسخ الرابط ✓ · المستوى ${toAr(CFG.level)} · ${lives}` : link);
  });
  paintShare();
  onlineState().then(s => { pubState = s; paintShare(); });
}

const studentLink = () => STUDENT_SITE + `tests/maze.html?id=${encodeURIComponent(GAME.id)}&lvl=${CFG.level}&lives=${CFG.lives}&timer=${CFG.timer}&theme=${CFG.theme}`;
/* 'ok' منشورة بآخر تعديل، 'old' منشورة بنسخة أقدم، 'missing' غير منشورة، 'unknown' تعذّر التحقق (بلا إنترنت) */
async function onlineState() {
  try {
    const res = await fetch(`${STUDENT_SITE}games/index.js?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'unknown';
    const text = await res.text();
    const list = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    const entry = list.find(e => e.id === GAME.id);
    return !entry ? 'missing' : entry.updated < GAME.updated ? 'old' : 'ok';
  } catch (_) { return 'unknown'; }
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  return ok;
}

function levelText(level) {
  const kinds = LEVELS[level - 1];
  if (!kinds.length) return '<b>بلا مطاردين</b> — متاهة هادئة للتدرّب';
  const names = kinds.map(k => ENEMY_KINDS[k].name).join(' و');
  const reach = Math.max(...kinds.map(k => ENEMY_KINDS[k].detect));
  const count = kinds.length === 1 ? 'مطارد واحد' : kinds.length === 2 ? 'مطاردان' : toAr(kinds.length) + ' مطاردين';
  return `<b>${count}: ${names}</b><br>يكتشفك من مسافة ${toAr(reach)} ${reach <= 2 ? 'خانتين' : reach <= 10 ? 'خانات' : 'خانة'}`;
}

function paintFoes() {
  const box = $('#lvlFoes');
  box.innerHTML = '';
  for (const k of LEVELS[CFG.level - 1]) {
    const c = document.createElement('canvas');
    const r = window.devicePixelRatio || 1;
    c.width = c.height = 34 * r;
    const g = c.getContext('2d');
    g.scale(r, r);
    drawFoe(g, k, 17, 18, 10, {});
    box.appendChild(c);
  }
  if (!box.children.length) box.innerHTML = '<span class="lvl-calm">☺</span>';
}

/* معاينة كل قالب: متاهة صغيرة ثابتة مع اللاعب */
const PREVIEW_OPEN = [[6, 12, 10], [3, 9, 5], [2, 11, 9]];
function paintThemePreviews() {
  $$('.theme-btn').forEach(btn => {
    const c = btn.querySelector('canvas');
    const t = themeColors(btn.dataset.v);
    const r = window.devicePixelRatio || 1, W = 96, H = 72;
    c.width = W * r; c.height = H * r;
    const g = c.getContext('2d');
    g.scale(r, r);
    g.fillStyle = t.floor;
    g.fillRect(0, 0, W, H);
    drawRuled(g, t, W, H, 9);
    drawWalls(g, PREVIEW_OPEN, 3, 3, 30, 3, { ...t, wallW: (t.wallW || .1) * 1.1 });
    drawPlayer(g, t, 3 + 1.5 * 30, 3 + 1.5 * 30, 10, 0, 1);
  });
}

function bindSettings() {
  const range = $('#lvlRange');
  const paintLevel = () => {
    range.value = CFG.level;
    $('#lvlVal').textContent = toAr(CFG.level);
    $('#lvlText').innerHTML = levelText(CFG.level);
    range.style.setProperty('--fill', ((CFG.level - 1) / 9 * 100) + '%');
    paintFoes();
  };
  range.addEventListener('input', () => {
    CFG.level = +range.value;
    paintLevel();
    markDirty();
    if (R && !finished) spawnEnemies();       // يُطبَّق فورًا على الجولة الحالية
  });
  range.addEventListener('change', () => range.blur());   // حتى تعود الأسهم لتحريك اللاعب
  paintLevel();

  const seg = (id, key, apply) => {
    const el = $(id);
    const paint = () => $$('button', el).forEach(b => b.classList.toggle('on', +b.dataset.v === CFG[key]));
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      CFG[key] = +b.dataset.v;
      paint();
      markDirty();
      apply();
      b.blur();
    });
    paint();
  };
  seg('#cfgLives', 'lives', () => { lives = CFG.lives > 0 ? CFG.lives : Infinity; hud(); });
  seg('#cfgTimer', 'timer', () => { if (t0) t0 = performance.now(); lastClock = ''; });

  const grid = $('#themeGrid');
  for (const [id, t] of Object.entries(THEMES)) {
    const b = document.createElement('button');
    b.className = 'theme-btn';
    b.dataset.v = id;
    b.innerHTML = `<canvas></canvas><span>${t.name}</span>`;
    b.addEventListener('click', () => {
      CFG.theme = id;
      markDirty();
      readColors();
      $$('.theme-btn').forEach(x => x.classList.toggle('on', x === b));
      b.blur();
    });
    b.classList.toggle('on', id === CFG.theme);
    grid.appendChild(b);
  }
  paintThemePreviews();
}

/* ================= البداية والنهاية ================= */
function startGame() {
  const n = GAME.questions.length;
  order = [...Array(n).keys()];
  if (GAME.settings.order === 'random') order = shuffle(order);
  qi = 0; score = 0; mistakes = 0; results = []; t0 = 0; finished = false; lastClock = '';
  lives = CFG.lives > 0 ? CFG.lives : Infinity;
  $('#summary').classList.add('hidden');
  $('#playArea').classList.remove('hidden');
  hud();
  newRound();
}

function endGame(reason) {
  if (finished) return;
  finished = true;
  const complete = reason === 'done';
  const total = order.length;
  const secs = Math.round(elapsed());
  $('#progressBar').style.width = '100%';
  $('#playArea').classList.add('hidden');
  $('#summary').classList.remove('hidden');
  const ratio = score / total;
  const stars = complete ? (ratio >= .9 ? 3 : ratio >= .6 ? 2 : ratio > 0 ? 1 : 0) : 0;
  $('#sumEmoji').textContent = !complete ? (reason === 'time' ? '⏰' : '💪') : stars === 3 ? '🏆' : stars === 2 ? '🌟' : '👍';
  $('#sumTitle').textContent = complete ? 'أنهيت المتاهة' : reason === 'time' ? 'انتهى الوقت' : 'انتهت القلوب';
  $('#sumCorrect').textContent = toAr(score);
  $('#sumTotal').textContent = toAr(total);
  $('#sumTime').textContent = fmtTime(secs);
  $('#sumMistakes').textContent = toAr(mistakes);
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1z"/></svg>';
  $('#sumStars').innerHTML = [0, 1, 2].map(i => `<span class="star${i < stars ? ' on' : ''}">${STAR}</span>`).join('');
  if (complete && stars) { FX.play('win'); setTimeout(() => FX.burst($('#sumStars'), { count: 40, spread: 200 }), 300); }

  const list = $('#sumList');
  list.innerHTML = '';
  order.forEach((qIdx, i) => {
    const q = GAME.questions[qIdx];
    const r = results[i];
    const item = document.createElement('div');
    item.className = 'sum-item ' + (r && r.firstTry ? 'correct' : 'wrong');
    item.innerHTML = `
      <div class="sum-head-row"><span class="sum-name"></span><span class="sum-badge">${r ? (r.firstTry ? '✓' : '↻') : '–'}</span></div>
      <div class="sum-row"><span class="sum-label">الإجابة</span><span class="sum-ans"></span></div>`;
    $('.sum-name', item).textContent = q.q;
    $('.sum-ans', item).textContent = answerList(q).join('، ');
    list.appendChild(item);
  });

  if (!isDraft && complete) {
    const best = store.json(`iqra_game_${GAME.id}`);
    if (!best || score > best.score) store.set(`iqra_game_${GAME.id}`, JSON.stringify({ score, total }));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#againBtn').addEventListener('click', startGame);

async function init() {
  const params = new URLSearchParams(location.search);
  try {
    if (params.get('draft')) {
      GAME = store.json('iqra_game_preview');
      isDraft = true;
      if (!GAME) throw new Error('draft');
    } else {
      GAME = await loadGame(params.get('id'));
    }
  } catch (_) {
    showFatal('لم نجد ملف هذه اللعبة في مجلد games.', 'index.html#games');
    return;
  }
  GAME.settings = GAME.settings || {};
  CFG = loadCfg();
  document.title = `${GAME.name} · لعبة متاهة`;
  $('#gameName').textContent = GAME.name;
  $('#gameSub').textContent = isDraft ? 'تجربة قبل الحفظ' : 'لعبة متاهة';
  document.body.classList.toggle('quran-font', GAME.settings.font === 'quran');
  if (STUDENT) {
    document.body.classList.add('student');
    $('#cfgPanel').classList.add('hidden');
    $('#editLink').classList.add('hidden');
    $('.tool-pill').classList.add('hidden');
    $('#backBtn').classList.add('hidden');
    $('#summary a[href="index.html#games"]').classList.add('hidden');
  } else if (isDraft) {
    $('#editLink').classList.add('hidden');
  } else {
    $('#editLink').href = `maze-editor.html?id=${GAME.id}`;
    gameFolderHash(GAME.id).then(h => { $('#backBtn').href = h; $('#summary a[href="index.html#games"]').href = h; });
    if (STUDENT_SITE) bindShare();
  }
  readColors();
  bindSettings();
  startGame();
  requestAnimationFrame(loop);
}

bindTheme();
FX.bindToggle($('#soundBtn'));
init();
