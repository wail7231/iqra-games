/* الألعاب التفاعلية — أدوات مشتركة: قراءة الألعاب من مجلد games وحفظها فيه
   كل لعبة ملف مستقل:  games/<المعرّف>.js  ←  window.__GAME__ = { id, type, name, desc, settings, questions, created, updated }
   وفهرس الألعاب:      games/index.js       ←  window.__GAMES_INDEX__ = [{ id, type, name, desc, count, updated }]
   القراءة بوسم <script> فتعمل عند فتح الأداة مباشرة من الحاسوب (file://).
   الحفظ عبر File System Access (Chrome / Edge): يُختار مجلد games مرة واحدة ويُتذكَّر،
   وفي المتصفحات الأخرى يُنزَّل الملفان ليُنقلا يدويًا إلى مجلد games. */
'use strict';

const GAMES_DIR = '../games/';
/* عنوان نسخة الطلاب المنشورة (GitHub Pages) — منه يُبنى رابط «نسخ رابط اللعبة للطلاب» */
const STUDENT_SITE = 'https://wail7231.github.io/iqra-games/';
/* القوالب: المتاهة لها صفحتها، وبقية القوالب تشترك في game.html (اللعب) و editor.html (الصناعة) */
const GAME_TYPES = {
  maze:    { name: 'متاهة', editor: 'maze-editor.html', player: 'maze.html', desc: 'حرّك اللاعب داخل المتاهة وادخل باب الإجابة الصحيحة، وتجنّب المطاردين.' },
  /* القالب القديم: يبقى لتعمل ألعابه، ومخفي من بطاقات القوالب (حلّ محلّه «اختيار من متعدد» بالنبتة) */
  quiz:    { name: 'اختيار سريع', editor: 'editor.html', player: 'game.html', desc: 'سؤال وعدة إجابات ملوّنة، اختر الصحيحة منها.', hidden: true },
  words:   { name: 'ترتيب الكلمات', editor: 'editor.html', player: 'game.html', desc: 'رتّب الكلمات المبعثرة لتكوّن الجملة الصحيحة.' },
  lines:   { name: 'ترتيب الجمل', editor: 'editor.html', player: 'game.html', desc: 'ضع الجمل أو الآيات في ترتيبها الصحيح ثم تأكّد.' },
  letters: { name: 'ترتيب الحروف', editor: 'editor.html', player: 'game.html', desc: 'رتّب الحروف لتكوّن الكلمة، بين حروف زائدة متشابهة.' },
  hangman: { name: 'هانج مان', editor: 'editor.html', player: 'game.html', desc: 'خمّن حروف الكلمة المخفية قبل أن يكتمل الرسم أو تنفجر البالونات.' },
  blanks:  { name: 'أكمل الفراغات', editor: 'editor.html', player: 'game.html', desc: 'ضع الكلمات المناسبة في فراغات النص ثم تأكّد.' },
  whack:   { name: 'اصطد الصحيح', editor: 'editor.html', player: 'game.html', desc: 'أشكال تخرج من الحفر، اضرب التي تحمل إجابة صحيحة.' },
  spot:    { name: 'أين الخطأ؟', editor: 'editor.html', player: 'game.html', desc: 'كلمة في النص استُبدلت بغيرها، اكتشفها.' },
  group:   { name: 'المصنِّف', editor: 'editor.html', player: 'game.html', desc: 'اسحب كل بطاقة إلى مجموعتها الصحيحة.' },
  match:   { name: 'المطابقة', editor: 'editor.html', player: 'game.html', desc: 'صِل كل عنصر بما يناسبه من العمود الآخر.' },
  wheel:   { name: 'العجلة الدوّارة', editor: 'editor.html', player: 'game.html', desc: 'أدِر العجلة؛ القطاع المختار يُسأل عنه ثم يُحذف من العجلة.' },
  plane:   { name: 'الطائرة والغيوم', editor: 'editor.html', player: 'game.html', desc: 'وجّه الطائرة إلى الغيمة التي تحمل الإجابة الصحيحة.' },
  leaves:  { name: 'القفز على الأوراق', editor: 'editor.html', player: 'game.html', desc: 'اقفز على الورقة الطافية التي تحمل الإجابة الصحيحة.' },
  archery: { name: 'الرماية', editor: 'editor.html', player: 'game.html', desc: 'اسحب القوس وأطلق السهم على هدف الإجابة الصحيحة.' },
  plant:   { name: 'اختيار من متعدد', editor: 'editor.html', player: 'game.html', desc: 'سؤال وإجابات، وكل إجابة صحيحة تسقي النبتة فتكبر حتى تُثمر.' },
  puzzle:  { name: 'البازل', editor: 'editor.html', player: 'game.html', desc: 'ارفع صورة فتُقسَّم قطعًا، ويركّبها الطالب في مكانها.' },
  runner:  { name: 'الكرة القافزة', editor: 'editor.html', player: 'game.html', desc: 'اقفز بالكرة على المنصة التي تحمل الإجابة الصحيحة.' },
};
const ICON_MAZE = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 4v8h4M16 8v12M8 16h4v4M12 8h4"/></svg>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qCount = n => n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالان' : `${toAr(n)} ${n <= 10 ? 'أسئلة' : 'سؤالًا'}`;
const newGameId =() => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* خلط الإجابات لكل الألعاب: ترتيب عشوائي جديد في كل مرة، والإجابة الصحيحة لا تبقى في موضعها
   نفسه من المرة السابقة لهذا السؤال (حتى لا يحفظ الطالب «الأولى يمين»).
   limit: أقصى عدد يُعرض — تُختصر الخاطئة فقط، والصحيحة لا تُستبعد أبدًا. كل عنصر فيه t و text و ok. */
function mixAnswers(q, limit = Infinity) {
  const corrects = Array.isArray(q.correct) ? q.correct : [q.correct];
  const ok = corrects.slice(0, Math.max(1, Math.min(corrects.length, limit - 1)));
  const bad = shuffle(q.wrong || []).slice(0, Math.max(0, limit - ok.length));
  const list = [...ok.map(t => ({ t, text: t, ok: true })), ...bad.map(t => ({ t, text: t, ok: false }))];
  const key = 'iqra_pos_' + [...String(q.q || q.label || '') + corrects[0]].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  /* عشوائي تمامًا، مع منع ظهور الصحيحة في الموضع نفسه ثلاث مرات متتالية
     (ومع ثلاث إجابات فأكثر لا تتكرر في موضعها السابق) — بلا نمط ثابت يُحفظ */
  const hist = String(store.get(key) || '').split(',').filter(Boolean);
  const stuck = p => list.length > 1 && (list.length >= 3 ? hist[hist.length - 1] === p : hist.length >= 2 && hist.slice(-2).every(h => h === p));
  let out = shuffle(list);
  for (let i = 0; i < 12 && stuck(String(out.findIndex(o => o.ok))); i++) out = shuffle(list);
  store.set(key, [...hist, String(out.findIndex(o => o.ok))].slice(-4).join(','));
  return out;
}

/* ================= شكل قطع البازل (مشترك بين اللعبة وغلافها) =================
   كل حدّ داخلي بين قطعتين له اتجاه ثابت: لسان بارز في واحدة وتجويف في جارتها.
   puzzleEdges → { top, right, bottom, left } قيمها ١ (لسان للخارج) أو −١ (تجويف) أو ٠ (حافة الصورة). */
function puzzleEdges(seed, cols, rows, i, j) {
  const sign = (kind, a, b) => {
    let h = 2166136261;
    for (const ch of seed + kind + a + ',' + b) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) % 2 ? 1 : -1;
  };
  return {
    top: j === 0 ? 0 : -sign('h', i, j - 1),
    bottom: j === rows - 1 ? 0 : sign('h', i, j),
    left: i === 0 ? 0 : -sign('v', i - 1, j),
    right: i === cols - 1 ? 0 : sign('v', i, j),
  };
}
/* مسار القطعة باتجاه عقارب الساعة؛ اللسان بحجم ثابت نسبةً إلى أصغر ضلعي القطعة */
function puzzlePiecePath(ctx, x, y, w, h, e) {
  const m = Math.min(w, h);
  const edge = (ax, ay, bx, by, k) => {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, nx = dy, ny = -dx;
    const P = (t, o) => [ax + dx * (L / 2 + (t - .5) * m) + nx * o * m * k, ay + dy * (L / 2 + (t - .5) * m) + ny * o * m * k];
    if (!k) { ctx.lineTo(bx, by); return; }
    ctx.lineTo(...P(.36, 0));
    ctx.bezierCurveTo(...P(.41, 0), ...P(.44, .06), ...P(.41, .11));
    ctx.bezierCurveTo(...P(.35, .2), ...P(.4, .28), ...P(.5, .28));
    ctx.bezierCurveTo(...P(.6, .28), ...P(.65, .2), ...P(.59, .11));
    ctx.bezierCurveTo(...P(.56, .06), ...P(.59, 0), ...P(.64, 0));
    ctx.lineTo(bx, by);
  };
  ctx.moveTo(x, y);
  edge(x, y, x + w, y, e.top);
  edge(x + w, y, x + w, y + h, e.right);
  edge(x + w, y + h, x, y + h, e.bottom);
  edge(x, y + h, x, y, e.left);
  ctx.closePath();
}

function loadScriptFresh(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src + '?t=' + Date.now();
    s.onload = () => { s.remove(); resolve(); };
    s.onerror = () => { s.remove(); reject(new Error('load')); };
    document.head.appendChild(s);
  });
}

async function loadGamesIndex() {
  window.__GAMES_INDEX__ = [];
  try { await loadScriptFresh(GAMES_DIR + 'index.js'); } catch (_) {}
  return Array.isArray(window.__GAMES_INDEX__) ? window.__GAMES_INDEX__ : [];
}

async function loadGame(id) {
  if (!/^[a-z0-9-]+$/i.test(id || '')) throw new Error('id');
  window.__GAME__ = null;
  await loadScriptFresh(GAMES_DIR + id + '.js');
  if (!window.__GAME__) throw new Error('empty');
  return window.__GAME__;
}

/* ================= كتابة الملفات ================= */
const indexEntry = g => ({ id: g.id, type: g.type, name: g.name, desc: g.desc || '', count: g.questions.length, updated: g.updated, ...(g.cover ? { cover: g.cover } : {}) });
const gameFileText = g =>
  `/* لعبة «${g.name.replace(/\*\//g, '')}» — صُنعت بأداة الألعاب التفاعلية، IQRA Network */\nwindow.__GAME__ = ${JSON.stringify(g, null, 1)};\n`;
const indexFileText = list =>
  `/* فهرس الألعاب التفاعلية — يُعاد بناؤه تلقائيًا عند كل حفظ */\nwindow.__GAMES_INDEX__ = ${JSON.stringify(list, null, 1)};\n`;

function parseGameFile(text) {
  const at = text.indexOf('window.__GAME__');
  const i = text.indexOf('{', at), j = text.lastIndexOf('}');
  if (at < 0 || i < 0) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch (_) { return null; }
}

/* مقبض المجلد يُحفظ في IndexedDB حتى لا يُسأل المستخدم عنه في كل مرة */
const handleDB = {
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('iqra-games', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise(res => {
      const q = db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  },
  async set(k, v) {
    const db = await this.open();
    return new Promise(res => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = tx.onerror = () => res();
    });
  },
};
const canPickFolder = 'showDirectoryPicker' in window;

async function savedFolder() {
  if (!canPickFolder) return null;
  try { return await handleDB.get('dir'); } catch (_) { return null; }
}

/* يُطلب اختيار المجلد عند أول حفظ؛ إن اختار المستخدم مجلد الأداة نفسه نستعمل مجلد games داخله */
async function gamesFolder(forcePick = false) {
  let dir = forcePick ? null : await savedFolder();
  const opts = { mode: 'readwrite' };
  if (dir && await dir.queryPermission(opts) !== 'granted' && await dir.requestPermission(opts) !== 'granted') dir = null;
  if (!dir) {
    dir = await window.showDirectoryPicker({ id: 'iqra-games', mode: 'readwrite' });
    if (dir.name !== 'games') {
      try { dir = await dir.getDirectoryHandle('games'); }
      catch (_) {
        if (!confirm(`المجلد المختار اسمه «${dir.name}» وليس games.\nالألعاب تظهر في القائمة فقط إذا حُفظت في مجلد games داخل مجلد الأداة.\nهل تريد الحفظ فيه مع ذلك؟`)) throw new DOMException('', 'AbortError');
      }
    }
    await handleDB.set('dir', dir);
  }
  return dir;
}

async function writeText(dir, name, text) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

/* الفهرس يُبنى من ملفات المجلد نفسها، فلا يختلف عنها أبدًا */
async function rebuildIndex(dir) {
  const list = [];
  for await (const [name, h] of dir.entries()) {
    if (h.kind !== 'file' || !name.endsWith('.js') || name === 'index.js' || name === 'folders.js') continue;
    const g = parseGameFile(await (await h.getFile()).text());
    if (g && g.id && Array.isArray(g.questions)) list.push(indexEntry(g));
  }
  list.sort((a, b) => b.updated - a.updated);
  await writeText(dir, 'index.js', indexFileText(list));
}

function downloadText(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* يعيد 'folder' عند الحفظ المباشر، أو 'download' عند تنزيل الملفين */
async function saveGame(game) {
  if (canPickFolder) {
    const dir = await gamesFolder();
    await writeText(dir, game.id + '.js', gameFileText(game));
    await rebuildIndex(dir);
    return 'folder';
  }
  const list = (await loadGamesIndex()).filter(e => e.id !== game.id);
  list.unshift(indexEntry(game));
  downloadText(game.id + '.js', gameFileText(game));
  setTimeout(() => downloadText('index.js', indexFileText(list)), 400);
  return 'download';
}

/* ================= مجلدات الألعاب =================
   ترتيب داخل الأداة فقط، في ملف واحد لا يغيّر ملفات الألعاب نفسها (فالنقل لا يحتاج نشرًا):
   games/folders.js ← window.__GAME_FOLDERS__ = { folders: [{ id, name, parent }], games: { معرّف_اللعبة: معرّف_المجلد } } */
const newFolderId = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const foldersFileText = f =>
  `/* مجلدات الألعاب التفاعلية — ترتيب الألعاب داخل الأداة */\nwindow.__GAME_FOLDERS__ = ${JSON.stringify(f, null, 1)};\n`;

async function loadFolders() {
  window.__GAME_FOLDERS__ = null;
  try { await loadScriptFresh(GAMES_DIR + 'folders.js'); } catch (_) {}
  const f = window.__GAME_FOLDERS__ || {};
  return {
    folders: Array.isArray(f.folders) ? f.folders : [],
    games: f.games && typeof f.games === 'object' ? f.games : {},
  };
}

async function saveFolders(f) {
  if (!canPickFolder) { downloadText('folders.js', foldersFileText(f)); return 'download'; }
  const dir = await gamesFolder();
  await writeText(dir, 'folders.js', foldersFileText(f));
  return 'folder';
}

/* مجلد اللعبة إن وُجد — لرجوع صفحات اللعبة والمحرر إلى المجلد نفسه */
async function gameFolderHash(id) {
  const f = await loadFolders();
  const fid = f.games[id];
  return fid && f.folders.some(x => x.id === fid) ? `index.html#games/${fid}` : 'index.html#games';
}

async function deleteGame(id) {
  const dir = await gamesFolder();
  try { await dir.removeEntry(id + '.js'); } catch (_) {}
  await rebuildIndex(dir);
}
