// Builds the page that shows the director the dark screen before and after it was brought
// up to WCAG AA (decided 2026-09-30) - with the REAL screens, not a mock-up:
//   the DOM of three screens of the isolated stack (registration, consultation, payment,
//   French, 1366x768, fake patients), drawn once with the token block of index.html as it
//   was before the change and once with the block as it is now.
//   node darkreal.mjs <folder with real_*.txt> <index.html before> <index.html after>
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';

const [dir, beforeFile, afterFile] = process.argv.slice(2);
const darkBlock = f => { const h = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); const a = h.indexOf('<style id="bethesda-theme">'); const s = h.indexOf(':root {', a), e = h.indexOf('}', s); return h.slice(s + 7, e).trim().replace(/\s*\n\s*/g, ''); };
const snaps = {};
for (const n of ['registration', 'consultation', 'payment']) {
  snaps[n] = fs.readFileSync(path.join(dir, 'real_' + n + '.txt'), 'utf8')
    .replace(/min-height: 100vh/g, 'min-height: 768px').replace(/height: 100vh/g, 'height: 768px').replace(/calc\((-\d+)px \+ 100vh\)/g, (m, x) => (768 + +x) + 'px').replace(/calc\(100vh - (\d+)px\)/g, (m, x) => (768 - +x) + 'px');
}
const data = JSON.stringify(snaps).replace(/</g, '\\u003c');
const page = `<title>어두운 화면 고치기 전과 뒤</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
/* layout: one column; the same real screen twice, before above, after below */
:root{ --bg:#f4f6f9; --panel:#ffffff; --ink:#111827; --ink-2:#4b5565; --line:#d6dbe3; --accent:#1d4ed8;
  --sans:"IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; color-scheme:dark }
body{ background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.65 }
.wrap{ max-width:1180px; margin:0 auto; padding-inline:20px; padding-block:32px 64px; display:flex; flex-direction:column; gap:30px }
.h1{ font-size:clamp(24px,3.4vw,32px); font-weight:700; line-height:1.25; margin:0; text-wrap:balance }
.lead{ margin:8px 0 0; color:var(--ink-2); max-width:64ch }
.h2{ font-size:20px; font-weight:700; margin:0 0 6px }
.seg{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px }
.opt{ font:inherit; font-size:15px; font-weight:600; padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--ink); cursor:pointer }
.opt[aria-pressed="true"]{ background:var(--accent); border-color:var(--accent); color:var(--bg) }
.opt:focus-visible{ outline:3px solid var(--accent); outline-offset:2px }
.pair{ display:flex; flex-direction:column; gap:22px }
.cap{ font-weight:700; margin:0 0 6px }
.cap span{ font-weight:400; color:var(--ink-2); margin-left:8px }
.shot{ position:relative; width:100%; aspect-ratio:1366/768; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:#0f1117 }
.list{ margin:0; padding-left:20px; max-width:70ch }
.list li{ margin-bottom:4px }
.mock{ position:absolute; left:0; top:0; width:1366px; height:768px; overflow:hidden; transform-origin:0 0; transform:scale(var(--s,.5)); font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif; font-size:18px; line-height:normal; pointer-events:none; text-align:left; color-scheme:dark; background:var(--bg); color:var(--text) }
.mock *{ margin:0; padding:0; box-sizing:border-box }
.mock input,.mock select,.mock textarea,.mock button{ font-size:17px }
.mock table{ font-size:16px }
.mock.before{${darkBlock(beforeFile)}}
.mock.after{${darkBlock(afterFile)}}
.mock.after ::placeholder{ color:var(--placeholder); opacity:1 }
</style>
<main class="wrap">
  <header>
    <h1 class="h1">어두운 화면 고치기 전과 뒤</h1>
    <p class="lead">정하신 대로 어두운 화면의 흐린 글자, 단추, 입력 칸 테두리를 고쳤습니다. 아래는 시안이 아니라 시험용 EMR의 실제 화면입니다. 같은 화면을 고치기 전의 색과 고친 뒤의 색으로 그렸습니다. 환자는 모두 가짜입니다.</p>
  </header>
  <section aria-label="화면 비교">
    <div class="seg">
      <button class="opt" id="o-registration" data-v="registration" type="button">접수</button>
      <button class="opt" id="o-consultation" data-v="consultation" type="button">진료</button>
      <button class="opt" id="o-payment" data-v="payment" type="button">수납</button>
    </div>
    <div class="pair">
      <div><p class="cap">고치기 전</p><div class="shot" id="before"></div></div>
      <div><p class="cap">고친 뒤</p><div class="shot" id="after"></div></div>
    </div>
  </section>
  <section aria-label="달라진 것">
    <h2 class="h2">달라진 것</h2>
    <ul class="list">
      <li>흐린 회색 글자(칸 이름, 표 머리, 안내)가 밝아졌습니다.</li>
      <li>글자를 넣는 칸마다 테두리가 또렷해졌습니다.</li>
      <li>파랑, 초록, 빨강, 노랑, 보라 단추의 바탕이 짙어져 그 위의 흰 글자가 잘 보입니다.</li>
      <li>파랑 글자와 빨강 글자가 조금 밝아졌습니다.</li>
      <li>빈 칸 안의 예시 글자가 밝아졌습니다.</li>
      <li>글자를 넣으려고 칸을 누르면 그 칸 둘레에 파랑 테두리가 생깁니다. 이 그림은 멈춘 화면이라 보이지 않습니다.</li>
    </ul>
  </section>
  <section aria-label="그대로인 것">
    <h2 class="h2">그대로인 것</h2>
    <ul class="list">
      <li>영수증, 처방전, 의뢰서 같은 종이와 그 미리보기.</li>
      <li>진료 화면의 환자 이름 줄(진한 파랑).</li>
      <li>검사실의 청록 단추. 밝은 청록 바탕에 검은 글자가 이미 잘 읽혀서 바꾸지 않았습니다.</li>
      <li>색의 뜻: 파랑 대기, 노랑 진료 중 · 주의, 초록 완료 · 받음, 빨강 취소 · 미수, 보라 정정.</li>
      <li>밝은 화면.</li>
    </ul>
  </section>
</main>
<script type="application/json" id="snaps">${data}</script>
<script>
(function () {
  var SNAPS = JSON.parse(document.getElementById('snaps').textContent);
  var screen = 'registration';
  function fit(shot) { shot.style.setProperty('--s', shot.clientWidth / 1366); }
  function fill(id, cls) { var shot = document.getElementById(id); var d = document.createElement('div'); d.className = 'mock ' + cls; d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', ''); d.innerHTML = SNAPS[screen]; shot.textContent = ''; shot.appendChild(d); fit(shot); }
  function render() { fill('before', 'before'); fill('after', 'after'); document.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.v === screen)); }); }
  document.querySelectorAll('.opt').forEach(function (o) { o.addEventListener('click', function () { screen = o.dataset.v; render(); }); });
  window.addEventListener('resize', function () { document.querySelectorAll('.shot').forEach(fit); });
  render();
})();
</script>
`;
fs.writeFileSync('dark-before-after-2026-09-30.html', page);
console.log('page bytes', page.length, 'before block', darkBlock(beforeFile).length, 'after block', darkBlock(afterFile).length);
