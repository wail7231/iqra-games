/* الإطار المشترك لقوالب الألعاب (game.html) — كل قالب في js/games/<القالب>.js ويسجّل نفسه بـ Play.register:
   {
     settings: ['timer', 'lives', { key, label, note, options: [[قيمة, نص]], def } | { key, label, kind: 'range', min, max, def, describe(v) }],
     points(item)  → أقصى نقاط السؤال (افتراضيًا ١)
     label(item)   → نص السؤال في شاشة النتيجة
     answer(item)  → الإجابة الصحيحة في شاشة النتيجة
     round(item, i) → يرسم السؤال في Play.board، ثم يستدعي Play.finish(نقاطه) عند انتهائه
   }
   الإطار يتولى: تحميل اللعبة، الإعدادات وقوالب الشكل، المؤقت والقلوب والنقاط، شاشة النتيجة،
   نسخة الطلاب (الإعدادات من الرابط)، وحفظ الإعدادات ونسخ الرابط. */
'use strict';

const PARAMS = new URLSearchParams(location.search);
const STUDENT = PARAMS.has('student') || (location.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(location.hostname));
const THEME_LIST = [['classic', 'كلاسيكي'], ['night', 'ليل'], ['garden', 'حديقة'], ['ice', 'جليد'], ['notebook', 'دفتر']];
const COMMON_SETTINGS = {
  timer: { key: 'timer', label: 'المؤقت', note: 'لكامل اللعبة', options: [[0, 'بلا'], [1, '١ د'], [2, '٢ د'], [3, '٣ د'], [5, '٥ د']], def: 0 },
  lives: { key: 'lives', label: 'القلوب', options: [[1, '١'], [3, '٣'], [5, '٥'], [0, '∞']], def: 3 },
};
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1z"/></svg>';

const Play = {
  board: $('#board'),
  game: null, def: null, cfg: null, isDraft: false,
  items: [], idx: 0, score: 0, max: 0, results: [], lives: Infinity, t0: 0, finished: false, roundDone: false,

  register(def) { this.def = def; },
  get item() { return this.items[this.idx]; },
  get quran() { return (this.game.settings || {}).font === 'quran'; },

  /* ---------- الجولات ---------- */
  start() {
    clearTimeout(this._next);
    const order = [...this.game.questions.keys()];
    this.items = (this.game.settings || {}).order === 'random' ? shuffle(order).map(i => this.game.questions[i]) : order.map(i => this.game.questions[i]);
    this.idx = 0; this.score = 0; this._shown = 0; this.maxOf = []; this.streak = 0; this.results = []; this.t0 = 0; this.finished = false;
    this.max = this.items.reduce((s, it) => s + (this.def.points ? this.def.points(it) : 1), 0);
    this.lives = this.usesLives && this.cfg.lives > 0 ? this.cfg.lives : Infinity;
    $('#summary').classList.add('hidden');
    $('#playArea').classList.remove('hidden');
    this.hud();
    this.round();
  },
  round() {
    this.roundDone = false;
    /* طبقة زينة القالب تبقى، ويُمسح ما سواها */
    [...this.board.children].forEach(c => { if (!c.classList.contains('fx-layer') && !c.classList.contains('keep')) c.remove(); });
    this.board.classList.toggle('quran-text', this.quran);
    $('#progressBar').style.width = (this.idx / this.items.length * 100) + '%';
    this.def.round(this.item, this.idx);
  },
  /* رأس السؤال المشترك: رقمه ونصه */
  head(text, sub) {
    const h = document.createElement('div');
    h.className = 'round-head';
    h.innerHTML = `<div class="round-num">${toAr(this.idx + 1)} / ${toAr(this.items.length)}</div><div class="round-q"></div>${sub ? '<div class="round-sub"></div>' : ''}`;
    h.querySelector('.round-q').textContent = text;
    if (sub) h.querySelector('.round-sub').textContent = sub;
    this.board.appendChild(h);
    return h;
  },
  /* نهاية السؤال: تُسجَّل نقاطه، ثم السؤال التالي تلقائيًا (أو بزر «التالي» إن طُلب) */
  /* max: أقصى نقاط هذا السؤال إن لم يُعرف إلا في نهايته (مثل «اصطد الصحيح» المؤقّتة) */
  finish(points, { delay = 1300, manual = false, max, nextLabel } = {}) {
    if (this.roundDone || this.finished) return;
    this.roundDone = true;
    this.score += points;
    this.results[this.idx] = points;
    if (max != null) { this.max += max - this.planned(this.item); (this.maxOf = this.maxOf || [])[this.idx] = max; }
    this.hud();
    if (manual) {
      const b = document.createElement('button');
      b.className = 'btn btn-primary next-round';
      b.innerHTML = this.idx + 1 < this.items.length ? (nextLabel || 'التالي') + ' <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>' : 'النتيجة';
      b.addEventListener('click', () => this.next());
      this.board.appendChild(b);
      b.focus({ preventScroll: true });
    } else {
      this._next = setTimeout(() => this.next(), delay);
    }
  },
  next() {
    if (this.finished) return;
    this.idx++;
    if (this.idx >= this.items.length) this.end('done');
    else this.round();
  },
  /* خطأ يكلّف قلبًا (في القوالب التي تستعمل القلوب) */
  mistake() {
    this.board.classList.remove('shake');
    void this.board.offsetWidth;
    this.board.classList.add('shake');
    if (!this.usesLives || this.cfg.lives <= 0) return false;
    this.lives--;
    this.hud();
    if (this.lives <= 0) { this.roundDone = true; setTimeout(() => this.end('lives'), 900); return true; }
    return false;
  },
  /* ابدأ المؤقت عند أول لمسة أو ضغطة في اللعبة */
  touch() { if (!this.t0 && !this.finished) this.t0 = performance.now(); },
  planned(it) { return this.def.points ? this.def.points(it) : 1; },
  get usesLives() { return this.def.settings.includes('lives'); },

  /* احتفال صغير بإجابة صحيحة: صوت وقصاصات و+١ */
  good(el, points = 1) {
    FX.play('ok');
    if (el) { FX.burst(el, { count: 22 }); FX.floatText(el, '+' + toAr(points)); }
  },
  bad(el) {
    FX.play('bad');
    if (el) FX.floatText(el, '✗', '#C0392B');
  },
  hud() {
    if (this.score > (this._shown || 0)) FX.bump($('#scoreVal').parentNode);
    this._shown = this.score;
    $('#scoreVal').textContent = toAr(this.score);
    $('#livesStat').classList.toggle('hidden', !this.usesLives);
    if (this.usesLives) {
      const max = this.cfg.lives, left = Math.max(0, this.lives);
      $('#livesVal').textContent = max > 0 ? '♥'.repeat(left) + '♡'.repeat(Math.max(0, max - left)) : '♥ ∞';
    }
  },

  end(reason) {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this._next);
    const secs = Math.round(this.elapsed());
    $('#progressBar').style.width = '100%';
    $('#playArea').classList.add('hidden');
    $('#summary').classList.remove('hidden');
    const complete = reason === 'done';
    const ratio = this.max ? this.score / this.max : 0;
    const stars = complete ? (ratio >= .9 ? 3 : ratio >= .6 ? 2 : ratio > 0 ? 1 : 0) : 0;
    $('#sumEmoji').textContent = !complete ? (reason === 'time' ? '⏰' : '💪') : stars === 3 ? '🏆' : stars === 2 ? '🌟' : '👍';
    $('#sumTitle').textContent = complete ? (stars === 3 ? 'ممتاز' : stars === 2 ? 'أحسنت' : 'انتهت اللعبة') : reason === 'time' ? 'انتهى الوقت' : 'انتهت القلوب';
    $('#sumCorrect').textContent = toAr(this.score);
    $('#sumTotal').textContent = toAr(this.max);
    $('#sumTime').textContent = fmtClock(secs);
    $('#sumPct').textContent = toAr(Math.round(ratio * 100)) + '٪';
    $('#sumStars').innerHTML = [0, 1, 2].map(i => `<span class="star${i < stars ? ' on' : ''}">${STAR_SVG}</span>`).join('');
    if (this.def.onEnd) this.def.onEnd();
    if (complete && stars) { FX.play('win'); setTimeout(() => FX.burst($('#sumStars'), { count: 40, spread: 200 }), 300); }
    const list = $('#sumList');
    list.innerHTML = '';
    this.items.forEach((it, i) => {
      const got = this.results[i], max = (this.maxOf && this.maxOf[i] != null) ? this.maxOf[i] : this.planned(it);
      const el = document.createElement('div');
      el.className = 'sum-item ' + (got === max ? 'correct' : 'wrong');
      el.innerHTML = `
        <div class="sum-head-row"><span class="sum-name"></span><span class="sum-badge">${got == null ? '–' : got === max ? '✓' : max > 1 ? toAr(got) + '/' + toAr(max) : '✗'}</span></div>
        <div class="sum-row"><span class="sum-label">الإجابة</span><span class="sum-ans"></span></div>`;
      $('.sum-name', el).textContent = this.def.label(it);
      $('.sum-ans', el).textContent = this.def.answer(it);
      list.appendChild(el);
    });
    if (!this.isDraft && complete && !STUDENT) {
      const best = store.json(`iqra_game_${this.game.id}`);
      if (!best || this.score > best.score) store.set(`iqra_game_${this.game.id}`, JSON.stringify({ score: this.score, total: this.max }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  elapsed() { return this.t0 ? (performance.now() - this.t0) / 1000 : 0; },
  restart() { this.start(); },
};

const fmtClock = s => toAr(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
let lastClock = '';
setInterval(() => {
  if (!Play.cfg || Play.finished) return;
  const limit = (Play.cfg.timer || 0) * 60;
  const secs = limit ? Math.max(0, Math.ceil(limit - Play.elapsed())) : Math.floor(Play.elapsed());
  const txt = fmtClock(secs);
  if (txt !== lastClock) {
    lastClock = txt;
    $('#clockVal').textContent = txt;
    $('#clockStat').classList.toggle('urgent', !!limit && secs <= 10);
  }
  if (limit && Play.t0 && secs <= 0) Play.end('time');
}, 250);
Play.board.addEventListener('pointerdown', () => Play.touch());
document.addEventListener('keydown', () => Play.touch());

/* ================= أدوات صغيرة للقوالب ================= */
const CHIP_COLORS = ['#2E7D9A', '#C2457A', '#C77D16', '#3F8A3A', '#7A4FB0', '#4F6BBF', '#AB3920', '#1F7A6B'];
const answersOf = q => Array.isArray(q.correct) ? q.correct : [q.correct];
/* حذف التشكيل والتطويل، وألف الوصل تصير ألفًا — لمقارنة الحروف */
const stripMarks = s => String(s).replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/ٱ/g, 'ا');
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
/* ترتيب عشوائي يختلف عن الترتيب الأصلي ما أمكن */
function scramble(arr, same = (a, b) => a === b) {
  if (arr.length < 2) return arr.slice();
  for (let i = 0; i < 12; i++) {
    const s = shuffle(arr);
    if (s.some((x, k) => !same(x, arr[k]))) return s;
  }
  return arr.slice().reverse();
}
/* زر «تخطَّ» أو «تأكيد» أسفل اللوحة */
function actionBar(...buttons) {
  const bar = el('div', 'round-actions');
  buttons.forEach(b => bar.appendChild(b));
  Play.board.appendChild(bar);
  return bar;
}
function actionBtn(text, cls, onClick) {
  const b = el('button', 'btn ' + cls, text);
  b.addEventListener('click', onClick);
  return b;
}

/* ================= السحب بالإصبع أو الفأرة =================
   dragItem(el, { onDrop(targetEl|null, ev), targets: 'محدِّد أماكن الإفلات', onTap() })
   ضغطة بلا سحب = onTap؛ سحب = نسخة طافية تتبع المؤشر ثم onDrop على المكان تحتها. */
function dragItem(el, { targets, onDrop, onTap, onMove }) {
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || el.classList.contains('locked') || Play.roundDone) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
    let ghost = null, over = null;
    const move = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px' });
        document.body.appendChild(ghost);
        el.classList.add('drag-src');
      }
      ghost.style.transform = `translate(${ev.clientX - sx + r.left}px, ${ev.clientY - sy + r.top}px) rotate(-2.5deg) scale(1.06)`;
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const t = under && targets ? under.closest(targets) : null;
      if (t !== over) { if (over) over.classList.remove('drop-over'); over = t; if (over) over.classList.add('drop-over'); }
      if (onMove) onMove(ev, under);
    };
    const up = ev => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (over) over.classList.remove('drop-over');
      if (!ghost) { if (onTap) onTap(); return; }
      ghost.remove();
      el.classList.remove('drag-src');
      if (onDrop) onDrop(over, ev);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

/* ================= الإعدادات وقوالب الشكل ================= */
const settingDefs = () => Play.def.settings.map(s => typeof s === 'string' ? COMMON_SETTINGS[s] : s);
const cfgKey = () => Play.isDraft ? 'iqra_game_cfg_preview' : `iqra_game_cfg_${Play.game.id}`;

function loadCfg() {
  const cfg = { theme: 'classic' };
  for (const s of settingDefs()) cfg[s.key] = s.def;
  if (STUDENT) {
    for (const s of settingDefs()) {
      const v = Number(PARAMS.get(s.key));
      if (!PARAMS.has(s.key) || !Number.isFinite(v)) continue;
      if (s.kind === 'range' ? v >= s.min && v <= s.max : s.options.some(o => o[0] === v)) cfg[s.key] = v;
    }
    const th = PARAMS.get('theme');
    if (THEME_LIST.some(t => t[0] === th)) cfg.theme = th;
  } else {
    Object.assign(cfg, store.json(cfgKey()));
    if (!THEME_LIST.some(t => t[0] === cfg.theme)) cfg.theme = 'classic';
  }
  return cfg;
}
const applyTheme = () => { Play.board.dataset.theme = Play.cfg.theme; FX.themeLayer(Play.board, Play.cfg.theme); };

let savedCfg = '', pubState = 'unknown', canShare = false;
const dirty = () => JSON.stringify(Play.cfg) !== savedCfg;
function changed(restart) {
  if (canShare) paintShare();
  else if (!STUDENT) store.set(cfgKey(), JSON.stringify(Play.cfg));
  if (restart) Play.restart();
}

function bindSettings() {
  const grid = $('#themeGrid');
  for (const [id, name] of THEME_LIST) {
    const b = document.createElement('button');
    b.className = 'theme-btn' + (id === Play.cfg.theme ? ' on' : '');
    b.innerHTML = `<span class="theme-prev" data-theme="${id}"><i></i><i></i><i></i></span><span>${name}</span>`;
    b.addEventListener('click', () => {
      Play.cfg.theme = id;
      applyTheme();
      $$('.theme-btn').forEach(x => x.classList.toggle('on', x === b));
      b.blur();
      changed(false);
    });
    grid.appendChild(b);
  }
  const rows = $('#cfgRows');
  for (const s of settingDefs()) {
    const row = document.createElement('div');
    row.className = 'cfg-row' + (s.kind === 'range' ? ' cfg-level' : '');
    if (s.kind === 'range') {
      row.innerHTML = `
        <div class="cfg-head"><span></span><span class="lvl-badge"></span></div>
        <input type="range" class="lvl-range" min="${s.min}" max="${s.max}" step="1">
        <div class="lvl-scale"><span>بطيء</span><span>سريع جدًّا</span></div>`;
      const range = row.querySelector('input'), badge = row.querySelector('.lvl-badge');
      const paint = () => {
        range.value = Play.cfg[s.key];
        badge.textContent = toAr(Play.cfg[s.key]);
        range.style.setProperty('--fill', ((Play.cfg[s.key] - s.min) / (s.max - s.min) * 100) + '%');
      };
      range.addEventListener('input', () => { Play.cfg[s.key] = +range.value; paint(); changed(false); });
      range.addEventListener('change', () => { range.blur(); Play.restart(); });
      paint();
    } else {
      row.innerHTML = `<div class="cfg-head"><span></span>${s.note ? `<small>${s.note}</small>` : ''}</div><div class="ed-seg"></div>`;
      const seg = row.querySelector('.ed-seg');
      seg.innerHTML = s.options.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('');
      const paint = () => $$('button', seg).forEach(b => b.classList.toggle('on', +b.dataset.v === Play.cfg[s.key]));
      seg.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        Play.cfg[s.key] = +b.dataset.v;
        paint();
        b.blur();
        changed(true);
      });
      paint();
    }
    row.querySelector('.cfg-head span').textContent = s.label;
    rows.appendChild(row);
  }
}

/* ================= حفظ الإعدادات ونسخ رابط الطلاب ================= */
function studentLink() {
  const p = new URLSearchParams({ id: Play.game.id });
  for (const s of settingDefs()) p.set(s.key, Play.cfg[s.key]);
  p.set('theme', Play.cfg.theme);
  return `${STUDENT_SITE}tests/game.html?${p}`;
}
async function onlineState() {
  try {
    const res = await fetch(`${STUDENT_SITE}games/index.js?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'unknown';
    const text = await res.text();
    const list = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    const entry = list.find(e => e.id === Play.game.id);
    return !entry ? 'missing' : entry.updated < Play.game.updated ? 'old' : 'ok';
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
  savedCfg = JSON.stringify(Play.cfg);
  $('#shareRow').classList.remove('hidden');
  $('#saveCfgBtn').addEventListener('click', () => {
    store.set(cfgKey(), JSON.stringify(Play.cfg));
    savedCfg = JSON.stringify(Play.cfg);
    paintShare();
    toast('حُفظت الإعدادات ✓');
  });
  $('#shareBtn').addEventListener('click', async () => {
    const link = studentLink();
    toast(await copyText(link) ? 'نُسخ الرابط ✓' : link);
  });
  paintShare();
  /* إن لم تكن اللعبة على الموقع بعد (النشر التلقائي يعمل عليها) نعيد التحقق كل ١٠ ثوانٍ حتى تصل */
  const check = () => onlineState().then(s => {
    const was = pubState;
    pubState = s;
    paintShare();
    if (s === 'missing' || s === 'old') setTimeout(check, 10000);
    else if (was === 'missing' || was === 'old') toast('اللعبة على موقع الطلاب الآن ✓');
  });
  check();
}

/* ================= البداية ================= */
async function init() {
  try {
    if (PARAMS.get('draft')) {
      Play.game = store.json('iqra_game_preview');
      Play.isDraft = true;
      if (!Play.game) throw new Error('draft');
    } else {
      Play.game = await loadGame(PARAMS.get('id'));
    }
    if (!GAME_TYPES[Play.game.type] || Play.game.type === 'maze') throw new Error('type');
    const load = src => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
    if (Play.game.type === 'whack') await load('js/games/whack-shapes.js');
    await load(`js/games/${Play.game.type}.js`);
  } catch (_) {
    showFatal('لم نجد ملف هذه اللعبة في مجلد games.', 'index.html#games');
    return;
  }
  const g = Play.game;
  g.settings = g.settings || {};
  Play.cfg = loadCfg();
  document.title = `${g.name} · ${GAME_TYPES[g.type].name}`;
  $('#gameName').textContent = g.name;
  $('#gameSub').textContent = Play.isDraft ? 'تجربة قبل الحفظ' : GAME_TYPES[g.type].name;
  document.body.classList.toggle('quran-font', g.settings.font === 'quran');
  if (STUDENT) {
    document.body.classList.add('student');
    ['#cfgPanel', '#editLink', '.tool-pill', '#backBtn', '#listLink'].forEach(s => $(s).classList.add('hidden'));
  } else if (Play.isDraft) {
    $('#editLink').classList.add('hidden');
  } else {
    $('#editLink').href = `editor.html?id=${g.id}`;
    $('#editTopBtn').href = `editor.html?id=${g.id}`;
    $('#editTopBtn').classList.remove('hidden');
    gameFolderHash(g.id).then(h => { $('#backBtn').href = h; $('#listLink').href = h; });
    if (STUDENT_SITE) bindShare();
  }
  applyTheme();
  bindSettings();
  $('#againBtn').addEventListener('click', () => Play.start());
  Play.start();
}

bindTheme();
FX.bindToggle($('#soundBtn'));
FX.bindFullscreen($('#fsBtn'), $('#board'));
init();
