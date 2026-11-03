/* أين الخطأ؟ — نص استُبدلت فيه كلمة أو أكثر بكلمات خاطئة (مثل كلمة من آية متشابهة).
   يضغط الطالب على الكلمة الخاطئة: المكتشفة تُشطب وتظهر الصحيحة مكانها بالأخضر،
   والضغط على كلمة سليمة يُنقص قلبًا. نقطة لكل كلمة مكتشفة. */
'use strict';

const spotTokens = it => it.text.trim().split(/\s+/);

Play.register({
  settings: ['timer', 'lives'],
  points: it => it.changes.length,
  label: it => {
    const tokens = spotTokens(it);
    it.changes.forEach(c => { tokens[c.at] = c.wrong; });
    return tokens.join(' ');
  },
  answer: it => it.text,
  round(it) {
    const tokens = spotTokens(it);
    const changed = new Map(it.changes.map(c => [c.at, c.wrong]));
    const head = Play.head('', ' ');
    const sub = head.querySelector('.round-sub');
    let found = 0;
    const paintSub = () => { sub.textContent = `✓ ${toAr(found)} من ${toAr(changed.size)}`; };
    paintSub();

    const text = el('div', 'spot-text');
    tokens.forEach((w, i) => {
      const b = el('button', 'spot-word');
      b.textContent = changed.has(i) ? changed.get(i) : w;
      b.addEventListener('click', () => {
        if (Play.roundDone || b.disabled) return;
        Play.touch();
        if (changed.has(i)) {
          b.disabled = true;
          b.classList.add('found');
          b.innerHTML = '<s></s><span></span>';
          b.firstChild.textContent = changed.get(i);
          b.lastChild.textContent = w;
          found++;
          paintSub();
          Play.good(b);
          if (found === changed.size) Play.finish(found, { delay: 2000 });
        } else {
          b.classList.remove('nope');
          void b.offsetWidth;
          b.classList.add('nope');
          Play.bad(b);
          Play.mistake();
        }
      });
      text.appendChild(b);
      text.appendChild(document.createTextNode(' '));
    });
    Play.board.appendChild(text);
  },
});
