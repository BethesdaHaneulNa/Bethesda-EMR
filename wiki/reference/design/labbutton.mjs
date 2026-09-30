// Builds the page for the director's decision on the lab's buttons (dark screen):
// bright cyan with near-black text, as now, or deep cyan with white text like the main
// buttons of the other screens. Real screens of the isolated stack (DOM), drawn with the
// token block of index.html as it is and with three values changed.
//   node labbutton.mjs <folder with real_lab.txt and real_payment.txt> <index.html>
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';

const [dir, indexFile] = process.argv.slice(2);
const h = fs.readFileSync(indexFile, 'utf8').replace(/\r\n/g, '\n');
const a = h.indexOf('<style id="bethesda-theme">'); const s = h.indexOf(':root {', a), e = h.indexOf('}', s);
const block = h.slice(s + 7, e).trim().replace(/\s*\n\s*/g, '');
const fix = s => s.replace(/min-height: 100vh/g, 'min-height: 768px').replace(/height: 100vh/g, 'height: 768px').replace(/calc\((-\d+)px \+ 100vh\)/g, (m, x) => (768 + +x) + 'px').replace(/calc\(100vh - (\d+)px\)/g, (m, x) => (768 - +x) + 'px');
const snaps = { lab: fix(fs.readFileSync(path.join(dir, 'real_lab.txt'), 'utf8')), payment: fix(fs.readFileSync(path.join(dir, 'real_payment.txt'), 'utf8')) };
const data = JSON.stringify(snaps).replace(/</g, '\\u003c');
const page = `<title>검사실 단추 색 맞추기</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
/* layout: one column; the lab screen as it is, as it would be, and another screen for comparison */
:root{ --bg:#f4f6f9; --panel:#ffffff; --ink:#111827; --ink-2:#4b5565; --line:#d6dbe3; --accent:#1d4ed8;
  --sans:"IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; color-scheme:dark }
body{ background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.65 }
.wrap{ max-width:1180px; margin:0 auto; padding-inline:20px; padding-block:32px 64px; display:flex; flex-direction:column; gap:30px }
.h1{ font-size:clamp(24px,3.4vw,32px); font-weight:700; line-height:1.25; margin:0; text-wrap:balance }
.lead{ margin:8px 0 0; color:var(--ink-2); max-width:64ch }
.h2{ font-size:20px; font-weight:700; margin:0 0 6px }
.pair{ display:flex; flex-direction:column; gap:24px }
.cap{ font-weight:700; margin:0 0 6px }
.cap span{ font-weight:400; color:var(--ink-2); margin-left:8px }
.shot{ position:relative; width:100%; aspect-ratio:1366/768; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:#0f1117 }
.scroll{ overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--panel) }
.tbl{ border-collapse:collapse; width:100%; min-width:560px; font-size:15px }
.tbl th,.tbl td{ padding:11px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top }
.tbl thead th{ font-size:13px; color:var(--ink-2); font-weight:600 }
.tbl tbody tr:last-child th,.tbl tbody tr:last-child td{ border-bottom:0 }
.choices{ margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px }
.ch{ border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:14px 16px }
.ch b{ display:block; margin-bottom:2px }
.ch p{ margin:0; color:var(--ink-2); font-size:14.5px }
.rec{ color:var(--accent); font-weight:600 }
.mock{ position:absolute; left:0; top:0; width:1366px; height:768px; overflow:hidden; transform-origin:0 0; transform:scale(var(--s,.5)); font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif; font-size:18px; line-height:normal; pointer-events:none; text-align:left; color-scheme:dark; background:var(--bg); color:var(--text) }
.mock *{ margin:0; padding:0; box-sizing:border-box }
.mock input,.mock select,.mock textarea,.mock button{ font-size:17px }
.mock table{ font-size:16px }
.mock ::placeholder{ color:var(--placeholder); opacity:1 }
.mock{${block}}
.mock.deep{--cyan-fill:#0e7490;--cyan-fill-2:#155e75;--on-cyan:#ffffff}
</style>
<main class="wrap">
  <header>
    <h1 class="h1">검사실 단추 색 맞추기</h1>
    <p class="lead">어두운 화면에서 다른 화면의 주 단추는 짙은 바탕에 흰 글자인데, 검사실만 밝은 청록 바탕에 검은 글자입니다. 읽는 데는 문제가 없지만 혼자 가장 밝습니다. 간호사가 약국과 검사실을 오가므로 모양을 맞추자는 임상병리 쪽 의견입니다. 아래는 시험용 EMR의 실제 화면입니다. 환자는 가짜입니다.</p>
  </header>
  <section aria-label="화면 비교" class="pair">
    <div><p class="cap">지금 <span>밝은 청록 바탕 + 검은 글자 (「CBC」 단추, 아래의 저장 단추)</span></p><div class="shot" id="now"></div></div>
    <div><p class="cap">고친 뒤 <span>짙은 청록 바탕 + 흰 글자</span></p><div class="shot" id="deep"></div></div>
    <div><p class="cap">견주어 볼 화면 <span>수납 — 파랑 · 초록 주 단추가 짙은 바탕 + 흰 글자</span></p><div class="shot" id="other"></div></div>
  </section>
  <section aria-label="숫자">
    <h2 class="h2">숫자로 보면</h2>
    <div class="scroll"><table class="tbl">
      <thead><tr><th scope="col"></th><th scope="col">지금</th><th scope="col">고친 뒤</th></tr></thead>
      <tbody>
        <tr><th scope="row">단추 위 글자가 읽히는 정도 (기준 4.5 이상)</th><td>7.6</td><td>5.4</td></tr>
        <tr><th scope="row">단추가 바탕에서 눈에 띄는 정도</th><td>7.4 (혼자 가장 밝음)</td><td>3.4 (초록 3.3, 파랑 3.5 와 같은 수준)</td></tr>
        <tr><th scope="row">검사 이름, 낮음 ▼ 높음 ▲ 같은 글자</th><td colspan="2">달라지지 않습니다</td></tr>
        <tr><th scope="row">밝은 화면</th><td colspan="2">달라지지 않습니다 (이미 짙은 청록 + 흰 글자)</td></tr>
      </tbody>
    </table></div>
  </section>
  <section aria-label="정하실 것">
    <h2 class="h2">정하실 것</h2>
    <ul class="choices">
      <li class="ch"><b>가. 맞춤 <span class="rec">추천</span></b><p>검사실 단추를 짙은 청록 + 흰 글자로. 어느 화면에서나 「짙은 바탕에 흰 글자 = 누르는 주 단추」가 되어 화면을 오갈 때 헷갈리지 않습니다. 글자는 지금보다 덜 또렷하지만 기준은 넘습니다.</p></li>
      <li class="ch"><b>나. 그대로 둠</b><p>검사실만 밝은 청록 + 검은 글자. 단추 글자가 가장 또렷하고 눈에 잘 띕니다. 다른 화면과 모양이 다릅니다.</p></li>
    </ul>
  </section>
</main>
<script type="application/json" id="snaps">${data}</script>
<script>
(function () {
  var SNAPS = JSON.parse(document.getElementById('snaps').textContent);
  function fit(shot) { shot.style.setProperty('--s', shot.clientWidth / 1366); }
  function fill(id, which, cls) { var shot = document.getElementById(id); var d = document.createElement('div'); d.className = 'mock' + cls; d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', ''); d.innerHTML = SNAPS[which]; shot.textContent = ''; shot.appendChild(d); fit(shot); }
  fill('now', 'lab', ''); fill('deep', 'lab', ' deep'); fill('other', 'payment', '');
  window.addEventListener('resize', function () { document.querySelectorAll('.shot').forEach(fit); });
})();
</script>
`;
fs.writeFileSync('lab-button-2026-09-30.html', page);
console.log('page bytes', page.length, 'block has cyan-fill:', /--cyan-fill: ?#06b6d4/.test(block));
