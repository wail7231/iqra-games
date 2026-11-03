/* أدوات مشتركة بين صفحات الاختبارات — IQRA Network */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = n => String(n).replace(/[0-9]/g, d => AR_DIGITS[+d]);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  json(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
};

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* الثيم — يُطبَّق مبكرًا من سكربت صغير في <head> ثم يُربط الزر هنا */
function bindTheme() {
  $$('.btn-theme').forEach(b => b.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    store.set('iqra_theme', dark ? 'dark' : 'light');
  }));
}

/* رقم السورة/الجزء من الرابط ‎?n= */
function queryNum(max) {
  const n = Number(new URLSearchParams(location.search).get('n'));
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

/* تحميل ملف البيانات بوسم <script> ليعمل أيضًا عند فتح الملف مباشرة (file://) */
function loadTestData(kind, n) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `data/${kind}/${n}.js`;
    s.onload = () => window.__TEST_DATA__ ? resolve(window.__TEST_DATA__) : reject(new Error('empty'));
    s.onerror = () => reject(new Error('load'));
    document.head.appendChild(s);
  });
}

function showFatal(msg, backHref) {
  const main = $('#main');
  main.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'fatal';
  box.innerHTML = `<h2>تعذّر فتح الاختبار</h2><p></p><a class="btn btn-primary">العودة إلى قائمة الاختبارات</a>`;
  box.querySelector('p').textContent = msg;
  box.querySelector('a').href = backHref;
  main.appendChild(box);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* خط الآيات — ثلاثة خيارات تُحفظ في المتصفح */
const QURAN_FONTS = [
  { id: 'amiri', name: 'الأميري', css: "'Amiri Quran', 'Amiri', serif" },
  { id: 'scheherazade', name: 'شهرزاد', css: "'Scheherazade New', 'Amiri Quran', serif" },
  { id: 'naskh', name: 'النسخ', css: "'Noto Naskh Arabic', 'Amiri Quran', serif" },
];
function applyFont(id) {
  const f = QURAN_FONTS.find(x => x.id === id) || QURAN_FONTS[0];
  document.documentElement.style.setProperty('--font-quran', f.css);
  return f.id;
}
let currentFont = applyFont(store.get('iqra_tests_font'));

function bindFont() {
  let menu = null;
  const close = () => { if (menu) { menu.remove(); menu = null; } };
  const open = btn => {
    menu = document.createElement('div');
    menu.className = 'font-menu';
    for (const f of QURAN_FONTS) {
      const b = document.createElement('button');
      b.className = f.id === currentFont ? 'on' : '';
      b.innerHTML = '<span class="sample">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ</span><span class="name"></span>';
      b.firstChild.style.fontFamily = f.css;
      b.lastChild.textContent = f.name;
      b.addEventListener('click', () => {
        currentFont = applyFont(f.id);
        store.set('iqra_tests_font', f.id);
        close();
      });
      menu.appendChild(b);
    }
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  };
  $$('.btn-font').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    if (menu) close(); else open(btn);
  }));
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target)) close(); });
  window.addEventListener('scroll', close, { passive: true });
}
