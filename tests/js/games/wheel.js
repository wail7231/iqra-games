/* العجلة الدوّارة — قطاعات يضعها المعلم (مثل سور جزء عمّ). «دوّر» تُدير العجلة وتتوقف على قطاع:
     - قطاع بسؤال: يظهر السؤال وإجاباته ويجيب الطالب
     - قطاع بلا سؤال: يسأل المعلم بنفسه، ويسجّل النتيجة بزرّي ✓ و✗
   بعد «دوّر مرة أخرى» يُحذف القطاع السابق من العجلة حتى تنتهي القطاعات.
   القطاع المختار يُنقل إلى موضع الجولة الحالية في Play.items، فتبقى شاشة النتيجة صحيحة. */
'use strict';

const WHEEL_COLORS = {
  classic:  ['#AB3920', '#FBF0EC', '#56452E', '#E3B341'],
  night:    ['#1B2752', '#59C3F0', '#2A3B78', '#F6E7A8'],
  garden:   ['#3F7D3A', '#F4A6C1', '#F7C948', '#6DAA5C'],
  ice:      ['#2D7FB8', '#FFFFFF', '#9CD5F2', '#4A9CCB'],
  notebook: ['#FFFFFF', '#E8F0FA', '#FFFFFF', '#FBEAEA'],
};
const RIM = { classic: '#7E2A17', night: '#59C3F0', garden: '#8A5A30', ice: '#FFFFFF', notebook: '#2B4C7E' };
let wheelTurn = 0;   // زاوية العجلة الحالية — تبقى بين الجولات حتى تدور من حيث توقفت

/* لون النص المناسب فوق لون القطاع */
const inkOn = hex => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#211B17' : '#FFFFFF';
};

function wheelSVG(labels, theme) {
  const n = labels.length, cols = WHEEL_COLORS[theme] || WHEEL_COLORS.classic, rim = RIM[theme] || RIM.classic;
  const R = 186, r0 = 40, step = 360 / n;
  const pt = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; };
  const size = n >= 24 ? 12 : n >= 16 ? 14 : n >= 10 ? 17 : n >= 6 ? 20 : 24;
  let body = `<circle r="198" fill="${rim}"/>`;
  labels.forEach((label, i) => {
    /* عند العدد الفردي يأخذ آخر قطاع لونًا آخر حتى لا يتجاور لونان متماثلان */
    const fill = n === 1 ? cols[0] : cols[(n % 2 === 1 && i === n - 1) ? 2 : i % 2 === 0 ? 0 : 1] || cols[i % cols.length];
    const a1 = i * step - step / 2, a2 = i * step + step / 2, large = step > 180 ? 1 : 0;
    body += n === 1
      ? `<circle r="${R}" fill="${fill}"/>`
      : `<path d="M${pt(r0, a1)} L${pt(R, a1)} A${R} ${R} 0 ${large} 1 ${pt(R, a2)} L${pt(r0, a2)} A${r0} ${r0} 0 ${large} 0 ${pt(r0, a1)}Z" fill="${fill}" stroke="${rim}" stroke-width="1.5"/>`;
    const deg = i * step;
    const rot = n === 1 ? 0 : deg > 0 && deg < 180 ? deg - 90 : deg + 90;
    const at = n === 1 ? '0 -100' : pt((r0 + R) / 2 + 6, deg);
    body += `<text transform="translate(${at}) rotate(${rot})" text-anchor="middle" dominant-baseline="middle" font-size="${size}" font-weight="700" fill="${inkOn(fill)}">${esc(label)}</text>`;
  });
  for (let k = 0; k < 24; k++) {
    const a = k * 15 * Math.PI / 180;
    body += `<circle cx="${(192 * Math.cos(a)).toFixed(1)}" cy="${(192 * Math.sin(a)).toFixed(1)}" r="2.6" fill="#FFF8DA" opacity=".85"/>`;
  }
  return `<svg viewBox="-200 -200 400 400" class="wheel-disc" style="transform:rotate(${wheelTurn}deg)">${body}</svg>`;
}

Play.register({
  settings: ['timer'],
  label: it => it.label,
  answer: it => it.q ? answersOf(it).join('، ') : 'سؤال من المعلم',
  round(it, i) {
    if (i === 0) wheelTurn = 0;
    Play.head('');
    const rest = Play.items.slice(i);
    const stage = el('div', 'wheel-stage2');
    stage.innerHTML = `
      <svg class="wheel-pin" viewBox="0 0 38 46" aria-hidden="true"><path d="M19 45 3 14A17 17 0 1 1 35 14Z"/><circle cx="19" cy="15" r="5.5"/></svg>
      <div class="wheel-holder">${wheelSVG(rest.map(x => x.label), Play.cfg.theme)}<div class="wheel-hub"></div></div>`;
    const spin = actionBtn('<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3.5-7.1M21 4v5h-5"/></svg> دوّر', 'btn-primary wheel-spin', () => go());
    const result = el('div', 'wheel-result hidden');
    Play.board.append(stage);
    actionBar(spin);
    Play.board.appendChild(result);

    function go() {
      if (Play.roundDone || spin.disabled) return;
      Play.touch();
      spin.disabled = true;
      const n = rest.length, step = 360 / n;
      const j = Math.random() * n | 0;
      /* القطاع j مركزه عند الزاوية j×step؛ ندير العجلة حتى يصل تحت المؤشر في الأعلى */
      const jitter = (Math.random() - .5) * step * .6;
      const target = -(j * step) + jitter;
      const base = wheelTurn - (((wheelTurn % 360) + 360) % 360);
      wheelTurn = base + 360 * 6 + target;
      const disc = stage.querySelector('.wheel-disc');
      disc.style.transition = 'transform 4.4s cubic-bezier(.12,.68,.12,1)';
      disc.style.transform = `rotate(${wheelTurn}deg)`;
      [0, 200, 420, 680, 980, 1350, 1800, 2350, 3000, 3700].forEach(ms => setTimeout(() => FX.play('tick'), ms));
      setTimeout(() => land(j), 4500);
    }

    function land(j) {
      /* ننقل القطاع المختار إلى موضع هذه الجولة */
      const k = i + j;
      [Play.items[i], Play.items[k]] = [Play.items[k], Play.items[i]];
      const chosen = Play.items[i];
      FX.play('ok');
      FX.burst(stage.querySelector('.wheel-pin'), { count: 26 });
      $('.round-actions', Play.board).remove();
      result.classList.remove('hidden');
      result.innerHTML = `<div class="wr-label"></div>`;
      result.firstChild.textContent = chosen.label;
      const next = { manual: true, nextLabel: 'دوّر مرة أخرى' };

      if (chosen.q) {
        const q = el('div', 'wr-q');
        q.textContent = chosen.q;
        const grid = el('div', 'quiz-grid wheel-answers');
        const opts = shuffle([...answersOf(chosen).map(t => ({ t, ok: true })), ...(chosen.wrong || []).map(t => ({ t, ok: false }))]);
        const bs = opts.map((o, x) => {
          const b = el('button', 'quiz-opt', `<span class="qo-num">${toAr(x + 1)}</span><span class="qo-txt"></span><span class="qo-mark"></span>`);
          b.style.setProperty('--c', CHIP_COLORS[x % CHIP_COLORS.length]);
          b.querySelector('.qo-txt').textContent = o.t;
          b.addEventListener('click', () => {
            if (Play.roundDone) return;
            bs.forEach((y, z) => { y.disabled = true; if (opts[z].ok) y.classList.add('right'); else if (y !== b) y.classList.add('dim'); });
            if (o.ok) { b.classList.add('celebrate'); Play.good(b); Play.finish(1, next); }
            else { b.classList.add('wrong'); Play.bad(b); Play.finish(0, next); }
          });
          grid.appendChild(b);
          return b;
        });
        result.append(q, grid);
      } else {
        /* بلا سؤال: المعلم يسأل ويسجّل */
        const judge = el('div', 'wr-judge');
        const yes = actionBtn('✓ أجاب', 'wr-yes', () => { Play.good(yes); Play.finish(1, next); judge.remove(); });
        const no = actionBtn('✗ لم يُجب', 'wr-no', () => { Play.bad(no); Play.finish(0, next); judge.remove(); });
        judge.append(yes, no);
        result.appendChild(judge);
      }
    }
  },
});
