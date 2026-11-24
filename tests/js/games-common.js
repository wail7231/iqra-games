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
  whack:   { name: 'اصطد الصحيح', three: true, editor: 'editor.html', player: 'game.html', desc: 'أشكال تقفز من الأنابيب، اضربها بالمطرقة إن حملت إجابة صحيحة.' },
  spot:    { name: 'أين الخطأ؟', editor: 'editor.html', player: 'game.html', desc: 'كلمة في النص استُبدلت بغيرها، اكتشفها.' },
  group:   { name: 'المصنِّف', editor: 'editor.html', player: 'game.html', desc: 'اسحب كل بطاقة إلى مجموعتها الصحيحة.' },
  match:   { name: 'المطابقة', editor: 'editor.html', player: 'game.html', desc: 'صِل كل عنصر بما يناسبه من العمود الآخر.' },
  wheel:   { name: 'العجلة الدوّارة', editor: 'editor.html', player: 'game.html', desc: 'أدِر العجلة؛ القطاع المختار يُسأل عنه ثم يُحذف من العجلة.' },
  plane:   { name: 'الطائرة والغيوم', editor: 'editor.html', player: 'game.html', desc: 'وجّه الطائرة إلى الغيمة التي تحمل الإجابة الصحيحة.' },
  leaves:  { name: 'القفز على الأوراق', editor: 'editor.html', player: 'game.html', desc: 'اقفز على الورقة الطافية التي تحمل الإجابة الصحيحة.' },
  archery: { name: 'الرماية', editor: 'editor.html', player: 'game.html', desc: 'اسحب القوس وأطلق السهم على هدف الإجابة الصحيحة.' },
  plant:   { name: 'اختيار من متعدد', editor: 'editor.html', player: 'game.html', desc: 'سؤال وإجابات، وكل إجابة صحيحة تسقي النبتة فتكبر حتى تُثمر.' },
  puzzle:  { name: 'البازل', editor: 'editor.html', player: 'game.html', desc: 'ارفع صورة فتُقسَّم قطعًا، ويركّبها الطالب في مكانها.' },
  lane3d:    { name: 'الممر الجاري', three: true, editor: 'editor.html', player: 'game.html', desc: 'كرة تجري في ممر مجسّم، تنتقل يمينًا ويسارًا لتعبر بوابة الإجابة الصحيحة.' },
  islands3d: { name: 'الجزر الطائرة', three: true, editor: 'editor.html', player: 'game.html', desc: 'قفز بين جزر تطفو في السماء حتى جزيرة الإجابة الصحيحة.' },
  maze3d:    { name: 'المتاهة المجسّمة', three: true, editor: 'editor.html', player: 'game.html', desc: 'متاهة بجدران مرتفعة، ادخل باب الإجابة الصحيحة.' },
  arena3d:   { name: 'مغامرة الساحة', three: true, editor: 'editor.html', player: 'game.html', desc: 'تجوّل بحرية في ساحة واسعة، افتح صندوق الإجابة الصحيحة لتأخذ المفتاح، ثم ادخل البوابة.' },
  boat3d:    { name: 'القارب الحر', three: true, editor: 'editor.html', player: 'game.html', desc: 'قُد القارب بحرية في البحيرة واجمع العوّامات التي تحمل الإجابات الصحيحة.' },
  ski3d:     { name: 'التزلّج على المنحدر', three: true, editor: 'editor.html', player: 'game.html', desc: 'انزلق على المنحدر بين الأعلام، ومرّ من بوابة الإجابة الصحيحة.' },
  castle3d:  { name: 'القلعة الدوّارة', three: true, editor: 'editor.html', player: 'game.html', desc: 'دُر حول البرج واقفز إلى درجة الإجابة الصحيحة لتصعد طابقًا.' },
  shoot3d:   { name: 'ميدان الرماية', three: true, editor: 'editor.html', player: 'game.html', desc: 'صوّب على الأهداف المتحركة في الميدان، وأصب هدف الإجابة الصحيحة.' },
  darts3d:   { name: 'القوس والسهم', three: true, editor: 'editor.html', player: 'game.html', desc: 'قف وسط الساحة، ودُر بنظرك حولك، وأطلق السهم على هدف الإجابة الصحيحة.' },
  catapult3d:{ name: 'المنجنيق والقلعة', three: true, editor: 'editor.html', player: 'game.html', desc: 'وجّه المنجنيق واضبط قوته، واهدم برج الإجابة الصحيحة.' },
  sub3d:     { name: 'صيد الفقاعات', three: true, editor: 'editor.html', player: 'game.html', desc: 'غُص بالغواصة بين المرجان وافقع فقاعة الإجابة الصحيحة.' },
  lighthouse3d: { name: 'سفن المنارة', three: true, editor: 'editor.html', player: 'game.html', desc: 'أدر ضوء المنارة وأرسل الإشارة إلى سفينة الإجابة الصحيحة لترسو في الميناء.' },
  balloon3d: { name: 'منطاد المظلات', three: true, editor: 'editor.html', player: 'game.html', desc: 'طِر بالمنطاد فوق الحقول وأسقط الصندوق بالمظلة على منصة الإجابة الصحيحة.' },
};
const ICON_MAZE = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 4v8h4M16 8v12M8 16h4v4M12 8h4"/></svg>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qCount = n => n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالان' : `${toAr(n)} ${n <= 10 ? 'أسئلة' : 'سؤالًا'}`;
const newGameId =() => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* خلط الإجابات لكل الألعاب: ترتيب عشوائي جديد في كل مرة، والإجابة الصحيحة لا تبقى في موضعها
   نفسه من المرة السابقة لهذا السؤال (حتى لا يحفظ الطالب «الأولى يمين»).
   limit: أقصى عدد يُعرض — تُختصر الخاطئة فقط، والصحيحة لا تُستبعد أبدًا. كل عنصر فيه t و text و ok. */
/* «يجب جمعها كلها»: سؤال فيه أكثر من إجابة صحيحة وطلب المعلم اختيارها جميعًا */
const needAll = q => Array.isArray(q.correct) && q.correct.filter(Boolean).length > 1 && q.need === 'all';
function mixAnswers(q, limit = Infinity, skip = []) {
  const corrects = (Array.isArray(q.correct) ? q.correct : [q.correct]).filter(c => !skip.includes(c));
  /* كل الصحيحة تظهر في «يجب جمعها كلها»، وإلا تُختار منها عيّنة عشوائية تتسع لها اللعبة */
  const ok = needAll(q) ? corrects : shuffle(corrects).slice(0, Math.max(1, Math.min(corrects.length, limit - 1)));
  const bad = shuffle(q.wrong || []).slice(0, Math.max(needAll(q) ? 1 : 0, limit - ok.length));
  const list = [...ok.map(t => ({ t, text: t, ok: true })), ...bad.map(t => ({ t, text: t, ok: false }))];
  const key = 'iqra_pos_' + [...String(q.q || q.label || '') + (corrects[0] || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  /* عشوائي تمامًا، مع منع ظهور الصحيحة في الموضع نفسه ثلاث مرات متتالية
     (ومع ثلاث إجابات فأكثر لا تتكرر في موضعها السابق) — بلا نمط ثابت يُحفظ */
  const hist = String(store.get(key) || '').split(',').filter(Boolean);
  const stuck = p => list.length > 1 && (list.length >= 3 ? hist[hist.length - 1] === p : hist.length >= 2 && hist.slice(-2).every(h => h === p));
  let out = shuffle(list);
  for (let i = 0; i < 12 && stuck(String(out.findIndex(o => o.ok))); i++) out = shuffle(list);
  store.set(key, [...hist, String(out.findIndex(o => o.ok))].slice(-4).join(','));
  return out;
}

/* لعبة تتسع لعدد محدود من الإجابات: إن زادت (في «يجب جمعها كلها») نأخذ منها max−1 صحيحة وواحدة خاطئة */
function fitAnswers(list, max) {
  if (list.length <= max) return list;
  return shuffle([...list.filter(a => a.ok).slice(0, max - 1), ...list.filter(a => !a.ok).slice(0, 1)]);
}
/* رأس السؤال مع عدّاد «✓ ١ من ٣» حين يجب جمع كل الإجابات الصحيحة؛ يعيد دالة تحديث العدّاد */
function needHead(text, need) {
  const h = Play.head(text, need > 1 ? ' ' : '');
  const sub = h.querySelector('.round-sub');
  const paint = got => { if (sub) sub.textContent = `✓ ${toAr(got)} من ${toAr(need)}`; };
  paint(0);
  paint.el = h;
  return paint;
}

/* تفاصيل صغيرة على الأرض حسب القالب: عشب، أزهار، حصى، أصداف، لمعات ثلج */
const GROUND_BITS = {
  classic: { tuft: '#A88A50', dots: ['#E3B341', '#AB3920'], stone: '#C9A96A' },
  night: { tuft: '#2E4A8A', dots: ['#F6E7A8', '#59C3F0'], stone: '#24346A', glow: true },
  garden: { tuft: '#3F7D3A', dots: ['#E5559A', '#F7C948', '#FFFFFF'], stone: '#B9A88A' },
  ice: { tuft: '#BFE3F3', dots: ['#FFFFFF', '#9CD5F2'], stone: '#DDEFF8', glow: true },
  notebook: { tuft: '#2B4C7E', dots: ['#E8A3A3'], stone: '#DCE3EC', sketch: true },
  ocean: { tuft: '#2E8C6A', dots: ['#F4A6C1', '#FFF3DC'], stone: '#CDB27A' },
  space: { tuft: '#6E52C8', dots: ['#F6E7A8', '#B48CFF'], stone: '#1E1446', glow: true },
  autumn: { tuft: '#8A5226', dots: ['#E8761E', '#D9A42B', '#A8432A'], stone: '#9C7A55' },
  summer: { tuft: '#5FA052', dots: ['#F4A6C1', '#FFF3DC', '#E8590C'], stone: '#E3B871' },
  winter: { tuft: '#DCE5F0', dots: ['#FFFFFF', '#C0392B'], stone: '#C9D6E8', glow: true },
};
function groundBits(ctx, theme, W, y, h, off = 0, seed = 1) {
  const B = GROUND_BITS[theme] || GROUND_BITS.classic;
  const hash = k => { const v = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  const span = 46, first = Math.floor(-off / span) - 1;
  ctx.save();
  for (let k = first; k < first + W / span + 3; k++) {
    const x = k * span + off + hash(k) * 30, r = hash(k + 7), yy = y + 6 + hash(k + 3) * (h - 12);
    if (r < .45) {
      ctx.strokeStyle = B.tuft; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + j * 3, yy); ctx.quadraticCurveTo(x + j * 4, yy - 5, x + j * 6, yy - 9 - hash(k + j) * 4); ctx.stroke(); }
    } else if (r < .72) {
      ctx.fillStyle = B.stone; ctx.globalAlpha = B.sketch ? .5 : .85;
      ctx.beginPath(); ctx.ellipse(x, yy, 4 + hash(k + 9) * 4, 2.5 + hash(k + 5) * 2, 0, 0, 7); ctx.fill();
      if (B.sketch) { ctx.strokeStyle = '#2B4C7E'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else {
      const c = B.dots[k % B.dots.length];
      if (B.glow) { ctx.shadowColor = c; ctx.shadowBlur = 6; }
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, yy - 3, 2.6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      if (!B.glow) { ctx.strokeStyle = B.tuft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yy - 1); ctx.lineTo(x, yy + 4); ctx.stroke(); }
    }
  }
  ctx.restore();
}
/* تلال أو مشهد بعيد بطبقتين (للطائرة) */
function farLand(ctx, theme, W, H, off) {
  const L = {
    classic: ['#E9D3A8', '#D9BE8C', 'domes'], night: ['#1E2B5C', '#16224A', 'domes'], garden: ['#B8DDA0', '#9CCB7E', 'trees'],
    ice: ['#DDEFF8', '#CDE7F4', 'peaks'], notebook: ['rgba(43,76,126,.08)', 'rgba(43,76,126,.14)', 'peaks'], ocean: ['#9ED8DE', '#7CC7CF', 'waves'],
    space: ['#2A1D5E', '#3A2A7A', 'craters'], autumn: ['#F2D3A8', '#E2B07A', 'trees'], summer: ['#7FD3E8', '#F2D49B', 'waves'], winter: ['#DCE5F0', '#C9D6E8', 'peaks'],
  }[theme] || ['#E9D3A8', '#D9BE8C', 'domes'];
  [[.25, 70, 22, L[0]], [.5, 40, 14, L[1]]].forEach(([sp, base, amp, col], li) => {
    const o = off * sp;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x + o;
      const y = L[2] === 'peaks' ? H - base - Math.abs(((wx / 140) % 2 + 2) % 2 - 1) * amp * 2.2 : L[2] === 'waves' && li ? H - base * .5 - Math.sin(wx / 30) * 3 : H - base - Math.sin(wx / 110 + li) * amp - Math.sin(wx / 43) * amp * .3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.fill();
    if (L[2] === 'peaks' && !li) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let k = -1; k < W / 280 + 2; k++) { const px = k * 280 - (o % 280) + 140; ctx.beginPath(); ctx.moveTo(px - 26, H - base - amp * 1.4); ctx.lineTo(px, H - base - amp * 2.2); ctx.lineTo(px + 26, H - base - amp * 1.4); ctx.fill(); }
    }
    if (li === 1 && (L[2] === 'domes' || L[2] === 'trees')) {
      for (let k = -1; k < W / 190 + 2; k++) {
        const px = k * 190 - (o % 190) + 60, py = H - base - 6;
        ctx.fillStyle = col;
        if (L[2] === 'domes') { ctx.beginPath(); ctx.arc(px, py - 10, 16, Math.PI, 0); ctx.fill(); ctx.fillRect(px - 16, py - 10, 32, 14); ctx.fillRect(px + 26, py - 44, 6, 48); ctx.beginPath(); ctx.arc(px + 29, py - 44, 5, Math.PI, 0); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(px, py - 18, 14, 0, 7); ctx.arc(px + 12, py - 10, 10, 0, 7); ctx.arc(px - 12, py - 10, 10, 0, 7); ctx.fill(); }
      }
    }
    if (li === 1 && L[2] === 'craters') {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let k = -1; k < W / 120 + 2; k++) { const px = k * 120 - (o % 120) + 40; ctx.beginPath(); ctx.ellipse(px, H - base * .45, 16, 4, 0, 0, 7); ctx.fill(); }
    }
  });
}

/* ================= شكل اللاعب حسب قالب الشكل (مشترك بين الكرة القافزة وقطعة الضفدع والقوس) =================
   أشكال بلا أرواح: نجمة، قمر، زهرة، ندفة ثلج، رسم بالقلم، فقاعة، كوكب، يقطينة، لؤلؤة، بلّوطة.
   rot يدير النقش (للتدحرج)، والأجزاء الثابتة (حلقة الكوكب، العنق) لا تدور. */
const THEME_EMBLEM = { classic: 'star', night: 'moon', garden: 'flower', ice: 'snow', notebook: 'sketch', ocean: 'bubble', space: 'planet', autumn: 'pumpkin', summer: 'sun', winter: 'snowball' };
function drawEmblem(c, kind, r, rot = 0, t = 0) {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const disc = (fill, line, lw = r * .12) => { c.beginPath(); c.arc(0, 0, r, 0, 7); c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke(); } };
  const shine = (a = .55) => { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(-r * .35, -r * .4, r * .3, r * .16, -.6, 0, 7); c.fill(); };
  switch (kind) {
    case 'moon': {
      c.shadowColor = '#F6E7A8'; c.shadowBlur = r * .9;
      const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, '#FFFBE6'); g.addColorStop(1, '#F2D27A');
      disc(g);
      c.shadowBlur = 0;
      c.rotate(rot);
      c.fillStyle = 'rgba(190,150,60,.35)';
      [[.3, -.2, .2], [-.35, .25, .14], [.05, .45, .1]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, 7); c.fill(); });
      break;
    }
    case 'flower': {
      disc('#F7C948', '#E07A1F');
      c.rotate(rot);
      c.fillStyle = '#E5559A';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(Math.cos(a) * r * .5, Math.sin(a) * r * .5, r * .3, r * .17, a, 0, 7); c.fill(); }
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, 0, r * .2, 0, 7); c.fill();
      break;
    }
    case 'snow': {
      const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D6EEFA');
      disc(g, '#9CCFEA', r * .08);
      c.rotate(rot);
      c.strokeStyle = '#4A9CCB'; c.lineWidth = Math.max(1.5, r * .09);
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
        c.moveTo(0, 0); c.lineTo(ca * r * .72, sa * r * .72);
        const bx = ca * r * .42, by = sa * r * .42;
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + .8) * r * .22, by + Math.sin(a + .8) * r * .22);
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - .8) * r * .22, by + Math.sin(a - .8) * r * .22);
      }
      c.stroke();
      break;
    }
    case 'sketch': {
      c.strokeStyle = '#2B4C7E';
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
      c.lineWidth = Math.max(1.5, r * .1);
      c.rotate(rot);
      for (let k = 0; k < 2; k++) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.283, rr = r * (1 + Math.sin(i * 3 + k * 2) * .04 - k * .06); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.stroke(); }
      c.save(); c.beginPath(); c.arc(0, 0, r * .92, 0, 7); c.clip();
      c.lineWidth = 1.2; c.globalAlpha = .5;
      for (let x = -r; x < r; x += r * .28) { c.beginPath(); c.moveTo(x, r); c.lineTo(x + r * .6, r * .2); c.stroke(); }
      c.restore();
      break;
    }
    case 'bubble': {
      const g = c.createRadialGradient(-r * .25, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.7, 'rgba(120,210,230,.25)'); g.addColorStop(1, 'rgba(14,124,134,.45)');
      disc(g, 'rgba(255,255,255,.85)', r * .08);
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = r * .1;
      c.beginPath(); c.arc(0, 0, r * .7, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(r * .38, r * .35, r * .09, 0, 7); c.fill();
      break;
    }
    case 'planet': {
      c.save();
      c.beginPath(); c.arc(0, 0, r, 0, 7); c.clip();
      c.fillStyle = '#8E6CF0'; c.fillRect(-r, -r, r * 2, r * 2);
      c.rotate(.35);
      const off = ((rot * r) % (r * .8) + r * .8) % (r * .8);
      c.fillStyle = '#C9B4FF';
      for (let y = -r * 1.6 + off; y < r * 1.6; y += r * .8) c.fillRect(-r * 1.5, y, r * 3, r * .26);
      c.restore();
      shine(.35);
      c.strokeStyle = '#F6E7A8'; c.lineWidth = r * .14;
      c.beginPath(); c.ellipse(0, 0, r * 1.55, r * .42, -.35, Math.PI * .05, Math.PI * .95); c.stroke();
      c.beginPath(); c.ellipse(0, 0, r * 1.55, r * .42, -.35, Math.PI * 1.05, Math.PI * 1.95); c.globalAlpha = .55; c.stroke();
      break;
    }
    case 'pumpkin': {
      c.save();
      c.rotate(Math.sin(rot) * .15);
      c.fillStyle = '#E8761E';
      c.strokeStyle = '#B4520E'; c.lineWidth = r * .08;
      [-.55, .55, 0].forEach(x => { c.beginPath(); c.ellipse(x * r, 0, r * .55, r * .9, 0, 0, 7); c.fill(); c.stroke(); });
      c.fillStyle = '#5C7F2A';
      c.beginPath(); c.roundRect(-r * .1, -r * 1.15, r * .2, r * .35, r * .06); c.fill();
      c.beginPath(); c.ellipse(r * .3, -r * 1.02, r * .25, r * .1, -.5, 0, 7); c.fill();
      c.restore();
      shine(.3);
      break;
    }
    case 'pearl': {
      const g = c.createRadialGradient(-r * .3, -r * .35, r * .05, 0, 0, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(.6, '#F3E6F0'); g.addColorStop(1, '#C9B6C8');
      c.shadowColor = 'rgba(255,255,255,.8)'; c.shadowBlur = r * .5;
      disc(g);
      c.shadowBlur = 0;
      shine(.8);
      break;
    }
    case 'acorn': {
      c.rotate(Math.sin(rot) * .12);
      c.fillStyle = '#C98A3E'; c.strokeStyle = '#7A4A1C'; c.lineWidth = r * .08;
      c.beginPath(); c.ellipse(0, r * .15, r * .72, r * .85, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#7A4A1C';
      c.beginPath(); c.ellipse(0, -r * .35, r * .88, r * .42, 0, Math.PI, 0); c.lineTo(r * .88, -r * .3); c.quadraticCurveTo(0, -r * .1, -r * .88, -r * .3); c.fill();
      c.fillRect(-r * .07, -r * 1.05, r * .14, r * .3);
      shine(.3);
      break;
    }
    case 'sun': {
      /* شمس صيفية: أشعة مثلثة تدور حول قرص دافئ */
      c.save();
      c.rotate(rot * .5);
      c.fillStyle = '#F7A21B';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a - .16) * r * .78, Math.sin(a - .16) * r * .78); c.lineTo(Math.cos(a) * r * 1.22, Math.sin(a) * r * 1.22); c.lineTo(Math.cos(a + .16) * r * .78, Math.sin(a + .16) * r * .78); c.fill(); }
      c.restore();
      c.shadowColor = 'rgba(247,179,43,.8)'; c.shadowBlur = r * .6;
      const g = c.createRadialGradient(-r * .25, -r * .3, r * .1, 0, 0, r * .85);
      g.addColorStop(0, '#FFF6C9'); g.addColorStop(.55, '#FFD24A'); g.addColorStop(1, '#F7A21B');
      c.beginPath(); c.arc(0, 0, r * .82, 0, 7); c.fillStyle = g; c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = '#E8590C'; c.lineWidth = r * .08; c.stroke();
      shine(.45);
      break;
    }
    case 'snowball': {
      /* كرة ثلج: حافة متموجة وظل أزرق ولمعات */
      const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(.7, '#EEF3FA'); g.addColorStop(1, '#B9CBE4');
      c.beginPath();
      for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.283, rr = r * (1 + Math.sin(i * 5 + 1) * .035); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.fillStyle = g; c.fill();
      c.strokeStyle = '#9FB3D1'; c.lineWidth = r * .07; c.stroke();
      c.rotate(rot);
      c.fillStyle = 'rgba(159,179,209,.55)';
      [[.35, .2, .12], [-.3, .4, .09], [.1, -.45, .08], [-.45, -.1, .07], [.5, -.3, .06]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, 7); c.fill(); });
      c.rotate(-rot);
      c.fillStyle = '#FFFFFF';
      const sp = (x, y, s) => { c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); };
      sp(-r * .38, -r * .42, r * .22); sp(r * .3, -r * .62, r * .12);
      break;
    }
    default: { // star — نجمة ذهبية بنقش ثماني يدور
      const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, '#FFF3C4'); g.addColorStop(1, '#E3B341');
      disc(g, '#7E2A17');
      c.rotate(rot);
      c.fillStyle = '#AB3920';
      c.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .3 : r * .66; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill();
    }
  }
  c.restore();
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
