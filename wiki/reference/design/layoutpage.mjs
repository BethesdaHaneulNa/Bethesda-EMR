// Builds the page for the director: payment, pharmacy and laboratory side by side, as they
// are and with the shared shapes of frontend/src/layout.js. Real screens of the isolated
// stack (DOM snapshots: root.innerHTML saved before and after), drawn with the dark token
// block of index.html.
//   node layoutpage.mjs <folder with lay0_*.txt and lay1_*.txt> <index.html>
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';

const [dir, indexFile] = process.argv.slice(2);
const h = fs.readFileSync(indexFile, 'utf8').replace(/\r\n/g, '\n');
const a = h.indexOf('<style id="bethesda-theme">'); const s = h.indexOf(':root {', a), e = h.indexOf('}', s);
const block = h.slice(s + 7, e).trim().replace(/\s*\n\s*/g, '');
const fix = t => t.replace(/min-height: 100vh/g, 'min-height: 768px').replace(/height: 100vh/g, 'height: 768px').replace(/calc\((-\d+)px \+ 100vh\)/g, (m, x) => (768 + +x) + 'px').replace(/calc\(100vh - (\d+)px\)/g, (m, x) => (768 - +x) + 'px').replace(/28vw/g, '382.5px').replace(/24vw/g, '327.8px').replace(/20\.8vw/g, '284px');
const snaps = {};
for (const k of ['payment', 'pharmacy', 'lab']) for (const v of ['', '_sel']) for (const p of ['lay0', 'lay1']) snaps[p + '_' + k + v] = fix(fs.readFileSync(path.join(dir, p + '_' + k + v + '.txt'), 'utf8'));
const data = JSON.stringify(snaps).replace(/</g, '\\u003c');
const names = { payment: '수납', pharmacy: '약국', lab: '임상병리' };
const strip = p => Object.keys(names).map(k => `<figure class="fig"><div class="crop" data-snap="${p}_${k}"></div><figcaption>${names[k]}</figcaption></figure>`).join('');
const page = `<title>모듈 화면 맞추기</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>
:root{ --bg:#f4f6f9; --panel:#ffffff; --ink:#111827; --ink-2:#4b5565; --line:#d6dbe3; --accent:#1d4ed8; --mark:#fff3c4;
  --sans:"IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --mark:#4a3d10; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --mark:#4a3d10; color-scheme:dark }
body{ background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.65 }
.wrap{ max-width:1180px; margin:0 auto; padding-inline:20px; padding-block:32px 64px; display:flex; flex-direction:column; gap:34px }
.h1{ font-size:clamp(24px,3.4vw,32px); font-weight:700; line-height:1.25; margin:0; text-wrap:balance }
.lead{ margin:8px 0 0; color:var(--ink-2); max-width:66ch }
.h2{ font-size:20px; font-weight:700; margin:0 0 4px; text-wrap:balance }
.sub{ margin:0 0 12px; color:var(--ink-2); max-width:66ch; font-size:15px }
.cap{ font-weight:700; margin:14px 0 8px }
.cap span{ font-weight:400; color:var(--ink-2); margin-left:8px; font-size:14.5px }
.three{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px }
@media (max-width:760px){ .three{ grid-template-columns:1fr } }
.fig{ margin:0; min-width:0 }
.fig figcaption{ font-size:13.5px; color:var(--ink-2); margin-top:4px; text-align:center }
.crop{ position:relative; width:100%; max-width:100%; aspect-ratio:520/400; overflow:hidden; border:1px solid var(--line); border-radius:8px; background:#0f1117 }
.shot{ position:relative; width:100%; max-width:100%; aspect-ratio:1366/768; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:#0f1117 }
.bar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 0 10px }
.seg{ display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden }
.seg button{ font:inherit; font-size:14.5px; font-weight:600; padding:7px 14px; border:0; background:var(--panel); color:var(--ink-2); cursor:pointer }
.seg button[aria-pressed="true"]{ background:var(--accent); color:var(--bg) }
.seg button:focus-visible{ outline:2px solid var(--accent); outline-offset:-2px }
.scroll{ overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--panel) }
.tbl{ border-collapse:collapse; width:100%; min-width:860px; font-size:14.5px }
.tbl th,.tbl td{ padding:10px 12px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top }
.tbl thead th{ font-size:13px; color:var(--ink-2); font-weight:600; white-space:nowrap }
.tbl tbody tr:last-child th,.tbl tbody tr:last-child td{ border-bottom:0 }
.tbl td:last-child{ background:var(--mark); font-weight:600 }
.choices{ margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px }
.ch{ border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:14px 16px }
.ch b{ display:block; margin-bottom:2px }
.ch p{ margin:0; color:var(--ink-2); font-size:14.5px }
.rec{ color:var(--accent); font-weight:600 }
.list{ margin:0; padding-left:20px; color:var(--ink-2); font-size:15px; max-width:70ch }
.list li{ margin-bottom:4px }
.mock{ position:absolute; left:0; top:0; width:1366px; height:768px; overflow:hidden; transform-origin:0 0; transform:scale(var(--s,.5)); font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif; font-size:16px; line-height:normal; pointer-events:none; text-align:left; color-scheme:dark; background:var(--bg); color:var(--text) }
.crop .mock{ top:calc(var(--s,.5) * -44px) }
.mock *{ margin:0; padding:0; box-sizing:border-box }
.mock ::placeholder{ color:var(--placeholder); opacity:1 }
.mock{${block}}
</style>
<main class="wrap">
  <header>
    <h1 class="h1">모듈 화면 맞추기 — 수납 · 약국 · 임상병리</h1>
    <p class="lead">세 화면은 같은 짜임(위에 도구 줄, 왼쪽에 환자 목록, 가운데 작업, 오른쪽에 기록)인데 세션마다 따로 만들어 조금씩 달랐습니다. 아래는 시험용 EMR의 실제 화면입니다. 환자는 가짜입니다. 동작과 글은 그대로이고 크기 · 자리 · 모양만 맞췄습니다.</p>
  </header>

  <section aria-label="왼쪽 목록 비교">
    <h2 class="h2">왼쪽 목록과 도구 줄</h2>
    <p class="sub">화면의 왼쪽 위를 같은 크기로 잘라 나란히 놓았습니다.</p>
    <p class="cap">지금 <span>도구 줄 높이, 탭 모양, 제목 줄, 글자 크기, 「대기」 꼬리표가 제각각</span></p>
    <div class="three">${strip('lay0')}</div>
    <p class="cap">맞춘 뒤 <span>한 가지 모양. 색(수납 파랑 · 약국 보라 · 임상병리 청록)은 그대로</span></p>
    <div class="three">${strip('lay1')}</div>
  </section>

  <section aria-label="화면 전체">
    <h2 class="h2">화면 전체로 보기</h2>
    <p class="sub">단추를 눌러 바꿔 보세요. 오른쪽 칸의 폭과 탭 옆 새로고침(↻) 자리를 보실 수 있습니다.</p>
    <div class="bar">
      <div class="seg" role="group" aria-label="화면"><button data-k="scr" data-v="payment" aria-pressed="true">수납</button><button data-k="scr" data-v="pharmacy" aria-pressed="false">약국</button><button data-k="scr" data-v="lab" aria-pressed="false">임상병리</button></div>
      <div class="seg" role="group" aria-label="상태"><button data-k="st" data-v="" aria-pressed="false">환자 고르기 전</button><button data-k="st" data-v="_sel" aria-pressed="true">환자를 고른 뒤</button></div>
      <div class="seg" role="group" aria-label="전후"><button data-k="ver" data-v="lay0" aria-pressed="false">지금</button><button data-k="ver" data-v="lay1" aria-pressed="true">맞춘 뒤</button></div>
    </div>
    <div class="shot" id="full"></div>
  </section>

  <section aria-label="무엇이 달랐나">
    <h2 class="h2">무엇이 달랐고, 무엇으로 맞췄나</h2>
    <p class="sub">1366×768 화면에서 잰 값입니다.</p>
    <div class="scroll"><table class="tbl">
      <thead><tr><th scope="col">무엇</th><th scope="col">수납 (지금)</th><th scope="col">약국 (지금)</th><th scope="col">임상병리 (지금)</th><th scope="col">맞춘 값</th></tr></thead>
      <tbody>
        <tr><th scope="row">왼쪽 목록 칸 폭</th><td>300</td><td>300</td><td>300</td><td>300 (오늘 이미 맞춤)</td></tr>
        <tr><th scope="row">오른쪽 칸 폭</th><td>382</td><td>328</td><td>460</td><td>모두 382</td></tr>
        <tr><th scope="row">도구 줄 높이 · 단추 글자</th><td>50 · 14</td><td>45 · 16</td><td>46 · 15</td><td>47 · 14</td></tr>
        <tr><th scope="row">대기 / 완료 탭</th><td>파랑으로 꽉 채움, 「(2)」</td><td>옅은 보라, 「2」</td><td>옅은 청록, 「3」</td><td>모두 옅게 칠함, 「(2)」</td></tr>
        <tr><th scope="row">새로고침</th><td>오른쪽 끝 ↻</td><td>탭 옆 「새로고침」 글자</td><td>탭 바로 옆 ↻</td><td>모두 탭 바로 옆 ↻ (말씀하신 자리)</td></tr>
        <tr><th scope="row">목록 위 제목 줄</th><td>💰 수납 대기</td><td>💊 약국</td><td>없음</td><td>뺌 (정하심)</td></tr>
        <tr><th scope="row">검색 칸</th><td>있음, 글자 15</td><td>있음, 글자 16</td><td>없음</td><td>글자 15 (임상병리에 넣는 것은 기능이라 그 세션에 부탁)</td></tr>
        <tr><th scope="row">목록의 환자 이름</th><td>15, 아주 굵게</td><td>16, 아주 굵게</td><td>15, 굵게</td><td>15, 아주 굵게</td></tr>
        <tr><th scope="row">목록의 둘째 줄</th><td>13</td><td>16</td><td>12</td><td>13</td></tr>
        <tr><th scope="row">「대기」 · 「진료 중」 표시</th><td>작은 노랑 상자</td><td>상자 없는 큰 글자</td><td>둘째 줄 안의 글자 (오른쪽 위에는 날짜)</td><td>모두 오른쪽 위 작은 상자 (날짜는 둘째 줄로)</td></tr>
        <tr><th scope="row">가운데 안내 글</th><td>그림 54 + 기울인 글 17</td><td>그림 49 + 굵은 글 18</td><td>그림 없이 글만 15</td><td>그림 54 + 기울인 글 17</td></tr>
        <tr><th scope="row">오른쪽 칸 제목</th><td>14</td><td>15</td><td>14</td><td>14, 같은 높이</td></tr>
      </tbody>
    </table></div>
  </section>

  <section aria-label="정하실 것">
    <h2 class="h2">정하신 것 — 목록 위 제목 줄은 뺌</h2>
    <p class="sub">수납의 「💰 수납 대기」, 약국의 「💊 약국」 줄입니다. 임상병리에는 없습니다. 2026-10-01 에 「가. 뺌」과 「이대로 적용」을 고르셨습니다.</p>
    <ul class="choices">
      <li class="ch"><b>가. 뺌 <span class="rec">추천 · 위 그림이 이 모양</span></b><p>바로 위 탭이 이미 「수납 대기 (2)」라고 말하고 있어 같은 말이 두 번 나옵니다. 빼면 목록이 한 줄 더 보입니다.</p></li>
      <li class="ch"><b>나. 셋 다 넣음</b><p>임상병리에도 「🧪 결과 대기」 줄을 넣어 셋을 맞춥니다. 목록 위가 한 줄 두꺼워집니다.</p></li>
    </ul>
  </section>

  <section aria-label="다음 차례">
    <h2 class="h2">이어서 맞출 것 (그림에는 아직 없음)</h2>
    <ul class="list">
      <li><b>접수</b> — 양쪽 칸이 440으로 넓은 것은 입력 양식이라 그대로 두고, 작업일자 줄만 수납과 같은 모양(한 줄, 작은 단추)으로.</li>
      <li><b>진료</b> — 대기 서랍의 환자 이름(14, 보통 굵기)과 꼬리표(11)를 위 목록과 같은 크기(15 아주 굵게, 12)로. 서랍 폭 340은 ⚙ 단추와 표시 줄이 있어 그대로.</li>
      <li>값은 한 파일(<code>frontend/src/layout.js</code>)에 모아, 다음에 한 곳만 고치면 셋이 같이 바뀌게 했습니다.</li>
    </ul>
  </section>
</main>
<script type="application/json" id="snaps">${data}</script>
<script>
(function () {
  var SNAPS = JSON.parse(document.getElementById('snaps').textContent);
  function mock(box, key, base) { var d = document.createElement('div'); d.className = 'mock'; d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', ''); d.innerHTML = SNAPS[key]; box.textContent = ''; box.appendChild(d); box.style.setProperty('--s', box.clientWidth / base); box.dataset.base = base; }
  document.querySelectorAll('.crop').forEach(function (c) { mock(c, c.dataset.snap, 520); });
  var state = { scr: 'payment', st: '_sel', ver: 'lay1' };
  function full() { mock(document.getElementById('full'), state.ver + '_' + state.scr + state.st, 1366); }
  document.querySelectorAll('.seg button').forEach(function (b) { b.addEventListener('click', function () { state[b.dataset.k] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); full(); }); });
  full();
  window.addEventListener('resize', function () { document.querySelectorAll('.crop,.shot').forEach(function (c) { c.style.setProperty('--s', c.clientWidth / +c.dataset.base); }); });
})();
</script>
`;
fs.writeFileSync('module-layout-2026-10-01.html', page);
console.log('page bytes', page.length);
