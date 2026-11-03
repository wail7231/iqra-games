/* السقاية — أسئلة اختيار من متعدد بجانب أصيص فيه نبتة. كل إجابة صحيحة: يميل الإبريق ويقطر الماء
   وتكبر النبتة مرحلة (بذرة، برعم، أوراق، ساق أطول، زهور، ثمار) بحسب نسبة الإجابات الصحيحة.
   الخطأ يُذبل الأوراق لحظة فقط ثم تظهر الإجابة الصحيحة؛ لا تموت النبتة. في النهاية تظهر النبتة في شاشة النتيجة.
   شكل الأصيص والنبتة يتبع قالب الشكل في tests.css. */
'use strict';

const PLANT_STAGES = 6;
let plantGrown = 0;

/* النبتة بكل مراحلها؛ المرحلة الحالية تُظهر ما يخصها عبر data-stage */
function plantSVG(stage) {
  const leaf = (y, side, s, k) => `<path class="pl-leaf" data-stage="${k}" style="transform-origin:110px ${y}px" d="M110 ${y}c${side * 12} -${10 * s} ${side * 34} -${12 * s} ${side * 44} -${2 * s}c-${side * 12} ${10 * s} -${side * 32} ${12 * s} -${side * 44} ${2 * s}z"/>`;
  const flower = (x, y, k) => `<g class="pl-flower" data-stage="${k}" style="transform-origin:${x}px ${y}px">${[0, 72, 144, 216, 288].map(r => `<ellipse cx="${x}" cy="${y - 9}" rx="6" ry="9" transform="rotate(${r} ${x} ${y})"/>`).join('')}<circle class="pl-core" cx="${x}" cy="${y}" r="5"/></g>`;
  const fruit = (x, y) => `<circle class="pl-fruit" data-stage="6" cx="${x}" cy="${y}" r="7"/>`;
  return `<svg class="plant-svg" viewBox="0 0 220 300" data-at="${stage}" aria-hidden="true">
    <g class="pl-can"><path d="M150 40h40a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6h-40a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6z"/><path class="pl-spout" d="M144 54l-30-12 4-6 30 10z"/><path class="pl-handle" d="M196 48c14 0 14 24 0 24" fill="none"/></g>
    <g class="pl-drops"><circle cx="116" cy="70" r="3"/><circle cx="110" cy="62" r="2.5"/><circle cx="104" cy="74" r="3"/><circle cx="112" cy="80" r="2"/></g>
    <path class="pl-stem" pathLength="1" style="stroke-dashoffset:${1 - [0, .16, .36, .56, .76, 1, 1][stage]}" d="M110 232C108 205 114 178 110 150S106 98 110 58"/>
    <ellipse class="pl-seed" data-stage="0" cx="110" cy="230" rx="7" ry="4.5"/>
    ${leaf(214, -1, .7, 1)}${leaf(214, 1, .7, 1)}${leaf(184, -1, 1, 2)}${leaf(176, 1, 1, 2)}${leaf(150, -1, 1, 3)}${leaf(142, 1, 1, 3)}${leaf(116, -1, .9, 4)}${leaf(108, 1, .9, 4)}
    ${flower(110, 56, 5)}${flower(70, 112, 6)}${flower(150, 104, 6)}
    ${fruit(84, 132)}${fruit(138, 124)}${fruit(124, 164)}
    <path class="pl-pot" d="M64 236h92l-10 58H74z"/><rect class="pl-rim" x="56" y="224" width="108" height="16" rx="5"/>
    <ellipse class="pl-soil" cx="110" cy="230" rx="48" ry="6"/>
  </svg>`;
}
const stageOf = () => Math.round(plantGrown / Play.items.length * PLANT_STAGES);
/* إظهار أجزاء المرحلة: كل عنصر يظهر إذا كانت مرحلته ≤ الحالية (البذرة في المرحلة ٠ فقط) */
function paintPlant(svg, stage) {
  svg.dataset.at = stage;
  $$('[data-stage]', svg).forEach(e => {
    const k = +e.dataset.stage;
    e.classList.toggle('on', k === 0 ? stage === 0 : k <= stage);
  });
  svg.querySelector('.pl-stem').style.strokeDashoffset = 1 - [0, .16, .36, .56, .76, 1, 1][stage];
}

Play.register({
  settings: ['timer'],
  label: q => q.q,
  answer: q => answersOf(q).join('، '),
  round(q, i) {
    if (i === 0) plantGrown = 0;
    Play.head(q.q);
    const wrap = el('div', 'plant-wrap');
    const scene = el('div', 'plant-scene', plantSVG(stageOf()));
    const svg = scene.firstElementChild;
    paintPlant(svg, stageOf());
    const grid = el('div', 'quiz-grid plant-answers');
    wrap.append(scene, grid);
    Play.board.appendChild(wrap);

    const corrects = answersOf(q);
    const opts = mixAnswers(q);
    const buttons = opts.map((o, k) => {
      const b = el('button', 'quiz-opt', `<span class="qo-num">${toAr(k + 1)}</span><span class="qo-txt"></span><span class="qo-mark"></span>`);
      b.style.setProperty('--c', CHIP_COLORS[k % CHIP_COLORS.length]);
      b.querySelector('.qo-txt').textContent = o.t;
      b.addEventListener('click', () => {
        if (Play.roundDone) return;
        Play.touch();
        buttons.forEach((x, j) => { x.disabled = true; if (opts[j].ok) x.classList.add('right'); else if (x !== b) x.classList.add('dim'); });
        if (o.ok) {
          b.classList.add('celebrate');
          plantGrown++;
          svg.classList.remove('pour');
          void svg.offsetWidth;
          svg.classList.add('pour');
          FX.play('good');
          setTimeout(() => { paintPlant(svg, stageOf()); Play.good(scene); }, 650);
          Play.finish(1, { delay: 2000 });
        } else {
          b.classList.add('wrong');
          svg.classList.add('wilt');
          setTimeout(() => svg.classList.remove('wilt'), 1300);
          Play.bad(b);
          Play.finish(0, { delay: 2200 });
        }
      });
      grid.appendChild(b);
      return b;
    });
  },
  /* النبتة النهائية في شاشة النتيجة */
  onEnd() {
    const old = $('#summary .plant-final');
    if (old) old.remove();
    const box = el('div', 'plant-final board', plantSVG(stageOf()));
    box.dataset.theme = Play.cfg.theme;
    paintPlant(box.firstElementChild, stageOf());
    $('#summary .summary-head').after(box);
  },
});
