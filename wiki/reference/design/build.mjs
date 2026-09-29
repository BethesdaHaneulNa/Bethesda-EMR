// Assembles the mockup page for the director from themes.json.
import fs from 'fs';
const D = JSON.parse(fs.readFileSync('themes.json', 'utf8'));
const R = D.report;
const rows = [
  ['본문', '본문 글자', 4.5], ['보조', '보조 글자 (설명, 작은 제목)', 4.5], ['흐린', '흐린 글자 (안내, 칸 이름)', 4.5],
  ['파랑', '파랑 글자', 4.5], ['초록', '초록 글자', 4.5], ['노랑', '노랑 글자', 4.5], ['빨강', '빨강 글자', 4.5],
  ['색 단추 위 글자', '색 단추 위의 흰 글자', 4.5], ['입력 칸 테두리', '입력 칸 테두리', 3],
];
const cell = (tk, k, need) => { const x = R[tk][k]; if (!x) return '<td class="num">없음</td>'; const ok = x.min >= need; return '<td class="num ' + (ok ? 'ok' : 'ng') + '">' + x.min.toFixed(1) + ' <span class="mark">' + (ok ? '통과' : '미달') + '</span></td>'; };
const table = rows.map(r => '<tr><th scope="row">' + r[1] + '<span class="need">기준 ' + r[2] + ' 이상</span></th>' + ['dark', 'A', 'B', 'C'].map(tk => cell(tk, r[0], r[2])).join('') + '</tr>').join('\n');

const sw = (h, label) => '<li class="sw"><span class="chip" style="background:#' + h + '"></span><span class="swl">' + label + '</span><code>#' + h + '</code></li>';
const inventory = [
  ['바탕', [['0f1117', '화면 바탕'], ['11141c', '진료 화면 칸'], ['13161f', '판'], ['161a26', '메뉴 줄'], ['1a1f2e', '제목 줄']]],
  ['칸 · 테두리', [['1e2433', '단추 · 꼬리표'], ['232838', '테두리'], ['2a3142', '입력 칸 테두리']]],
  ['글자 3단계', [['e2e8f0', '본문'], ['94a3b8', '보조'], ['64748b', '흐린']]],
  ['강조 (파랑)', [['3b82f6', '단추'], ['60a5fa', '글자']]],
  ['상태', [['10b981', '초록 · 완료'], ['f59e0b', '노랑 · 주의'], ['ef4444', '빨강 · 경고'], ['8b5cf6', '보라 · 약국·판독'], ['06b6d4', '청록 · 검사']]],
].map(g => '<div class="inv"><h3 class="invh">' + g[0] + '</h3><ul class="sws">' + g[1].map(x => sw(x[0], x[1])).join('') + '</ul></div>').join('\n');

const data = JSON.stringify(D.snaps).replace(/</g, '\\u003c');
const page = `<title>베데스다 EMR 밝은 화면 시안</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
/* layout: one column; the chosen mockup large on top, the four side by side under it, numbers after */
:root{
  --bg:#f4f6f9; --panel:#ffffff; --ink:#111827; --ink-2:#4b5565; --line:#d6dbe3; --accent:#1d4ed8; --accent-soft:#e3ebfd;
  --ok:#0a6b4a; --ng:#a82020;
  --sans:"IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;
  --mono:"IBM Plex Mono",Consolas,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --accent-soft:#1c2a47; --ok:#5fd0a4; --ng:#ff8f8f; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --accent-soft:#1c2a47; --ok:#5fd0a4; --ng:#ff8f8f; color-scheme:dark }
body{ background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.65 }
.wrap{ max-width:1180px; margin:0 auto; padding-inline:20px; padding-block:32px 64px; display:flex; flex-direction:column; gap:36px }
.h1{ font-size:clamp(24px,3.4vw,32px); font-weight:700; line-height:1.25; margin:0; text-wrap:balance }
.lead{ margin:8px 0 0; color:var(--ink-2); max-width:62ch }
.h2{ font-size:20px; font-weight:700; margin:0 0 4px; text-wrap:balance }
.sub{ margin:0 0 14px; color:var(--ink-2); max-width:66ch }
.controls{ display:flex; flex-wrap:wrap; gap:14px 28px; align-items:flex-end }
.grp{ display:flex; flex-direction:column; gap:6px; min-width:0 }
.lbl{ font-size:13px; font-weight:600; color:var(--ink-2); letter-spacing:.02em }
.seg{ display:flex; flex-wrap:wrap; gap:6px }
.opt{ font:inherit; font-size:15px; font-weight:600; padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--ink); cursor:pointer }
.opt[aria-pressed="true"]{ background:var(--accent); border-color:var(--accent); color:var(--bg) }
.opt:focus-visible{ outline:3px solid var(--accent); outline-offset:2px }
.opt:disabled{ opacity:.45; cursor:not-allowed }
.dot{ display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; vertical-align:baseline }
.shot{ position:relative; width:100%; aspect-ratio:1366/768; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:var(--panel) }
.cap{ display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:8px; font-size:14px; color:var(--ink-2) }
.cap b{ color:var(--ink) }
.four{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px }
@media (max-width:640px){ .four{ grid-template-columns:minmax(0,1fr) } }
.pick{ display:flex; flex-direction:column; gap:8px; padding:0; border:0; background:none; font:inherit; color:inherit; text-align:left; cursor:pointer; min-width:0 }
.pick .shot{ border-width:2px }
.pick[aria-pressed="true"] .shot{ border-color:var(--accent) }
.pick:focus-visible .shot{ outline:3px solid var(--accent); outline-offset:2px }
.pname{ font-weight:700 }
.pdesc{ color:var(--ink-2); font-size:14.5px; margin:0 }
.scroll{ overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--panel) }
.tbl{ border-collapse:collapse; width:100%; min-width:620px; font-size:15px }
.tbl th,.tbl td{ padding:10px 14px; border-bottom:1px solid var(--line); text-align:left }
.tbl thead th{ font-size:13px; color:var(--ink-2); font-weight:600 }
.tbl tbody tr:last-child th,.tbl tbody tr:last-child td{ border-bottom:0 }
.tbl th[scope="row"]{ font-weight:600 }
.need{ display:block; font-size:12.5px; font-weight:400; color:var(--ink-2) }
.num{ font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap }
.num.ok .mark{ color:var(--ok) } .num.ng{ color:var(--ng); font-weight:600 }
.mark{ font-family:var(--sans); font-size:13px; font-weight:600; margin-left:4px }
.note{ margin:12px 0 0; color:var(--ink-2); font-size:14.5px; max-width:70ch }
.invs{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px 28px }
.invh{ font-size:14px; font-weight:700; margin:0 0 6px }
.sws{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:5px }
.sw{ display:grid; grid-template-columns:22px 1fr auto; gap:10px; align-items:center; font-size:14.5px }
.chip{ width:22px; height:22px; border-radius:5px; border:1px solid var(--line) }
.sw code{ font-family:var(--mono); font-size:12.5px; color:var(--ink-2) }
.qs{ margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px }
.q{ border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:14px 16px }
.qt{ font-weight:700; margin:0 0 4px }
.qa{ margin:0; color:var(--ink-2); font-size:14.5px }
.rec{ color:var(--accent); font-weight:600 }

/* the mockup itself: the EMR's own base styles, scoped */
.mock{ position:absolute; left:0; top:0; width:1366px; height:768px; overflow:hidden; transform-origin:0 0; transform:scale(var(--s,.5)); font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif; font-size:18px; line-height:normal; pointer-events:none; text-align:left }
.mock *{ margin:0; padding:0; box-sizing:border-box }
.mock input,.mock select,.mock textarea,.mock button{ font-size:17px }
.mock table{ font-size:16px }
${D.css}
</style>

<main class="wrap">
  <header>
    <h1 class="h1">베데스다 EMR 밝은 화면 시안</h1>
    <p class="lead">지금 쓰는 어두운 화면과, 밝은 화면 시안 세 가지입니다. 시험용 EMR의 실제 화면에 색만 바꿔 입혔습니다. 배치와 글자는 그대로이고, 환자 이름은 모두 가짜입니다.</p>
  </header>

  <section aria-label="크게 보기">
    <div class="controls">
      <div class="grp"><span class="lbl">화면</span><div class="seg" id="seg-screen">
        <button class="opt" id="o-registration" data-k="screen" data-v="registration">접수</button>
        <button class="opt" id="o-consultation" data-k="screen" data-v="consultation">진료</button></div></div>
      <div class="grp"><span class="lbl">화면 언어</span><div class="seg">
        <button class="opt" id="o-ko" data-k="lang" data-v="ko">한국어</button>
        <button class="opt" id="o-fr" data-k="lang" data-v="fr">프랑스어 (현장)</button></div></div>
      <div class="grp"><span class="lbl">색</span><div class="seg">
        <button class="opt" id="o-dark" data-k="theme" data-v="dark">지금 (어두운 화면)</button>
        <button class="opt" id="o-A" data-k="theme" data-v="A">A 맑은 흰색</button>
        <button class="opt" id="o-B" data-k="theme" data-v="B">B 따뜻한 종이색</button>
        <button class="opt" id="o-C" data-k="theme" data-v="C">C 또렷한 흰색</button></div></div>
      <div class="grp"><span class="lbl">강조색 (밝은 화면에서)</span><div class="seg">
        <button class="opt" id="o-blue" data-k="accent" data-v="blue"><span class="dot" style="background:#2563eb"></span>파랑 (지금 그대로)</button>
        <button class="opt" id="o-teal" data-k="accent" data-v="teal"><span class="dot" style="background:#0e7c86"></span>청록</button>
        <button class="opt" id="o-indigo" data-k="accent" data-v="indigo"><span class="dot" style="background:#4338ca"></span>남색</button></div></div>
    </div>
    <div class="shot" id="stage" style="margin-top:16px"></div>
    <div class="cap"><span><b id="cap-name"></b> <span id="cap-desc"></span></span><span>실제 크기 1366 × 768 (현장의 오래된 모니터 크기)</span></div>
  </section>

  <section aria-label="나란히 보기">
    <h2 class="h2">나란히 보기</h2>
    <p class="sub">같은 화면을 네 가지 색으로 놓았습니다. 누르면 위에서 크게 보입니다.</p>
    <div class="four" id="four"></div>
  </section>

  <section aria-label="글자가 잘 읽히는지">
    <h2 class="h2">글자가 잘 읽히는지</h2>
    <p class="sub">글자와 바탕의 밝기 차이(대비)입니다. 숫자가 클수록 잘 보입니다. 국제 기준(WCAG AA)은 글자 4.5 이상, 칸 테두리 3 이상입니다. 각 칸은 두 화면에서 가장 낮게 나온 값입니다.</p>
    <div class="scroll"><table class="tbl">
      <thead><tr><th scope="col">무엇</th><th scope="col">지금 (어두운 화면)</th><th scope="col">A 맑은 흰색</th><th scope="col">B 따뜻한 종이색</th><th scope="col">C 또렷한 흰색</th></tr></thead>
      <tbody>
${table}
      </tbody>
    </table></div>
    <p class="note">지금 어두운 화면에는 기준에 못 미치는 곳이 몇 군데 있습니다(흐린 글자, 파랑 단추 위 흰 글자, 입력 칸 테두리). 어두운 화면은 이번에 한 점도 바꾸지 않기로 했으므로 그대로 두고, 고칠지는 따로 여쭙겠습니다. 밝은 시안 세 가지는 모두 기준을 넘도록 맞췄습니다.</p>
  </section>

  <section aria-label="지금 화면의 색">
    <h2 class="h2">지금 어두운 화면의 색</h2>
    <p class="sub">화면 파일에 박혀 있는 색은 모두 86가지입니다. 그중 자주 쓰는 것은 아래 18가지이고, 나머지는 이 색들의 조금 밝거나 어두운 변형입니다.</p>
    <div class="invs">
${inventory}
    </div>
  </section>

  <section aria-label="정하실 것">
    <h2 class="h2">정하실 것</h2>
    <p class="sub">한 번에 한두 가지씩 대화창에서 여쭙겠습니다. 추천을 같이 적었습니다.</p>
    <ul class="qs">
      <li class="q"><p class="qt">밝은 화면은 A · B · C 중 무엇으로</p><p class="qa">위 그림에서 골라 주세요.</p></li>
      <li class="q"><p class="qt">강조색</p><p class="qa"><span class="rec">추천: 파랑 그대로.</span> 초록(완료)·청록(검사)·보라(약국)가 이미 뜻을 갖고 있어, 파랑이 가장 덜 헷갈립니다.</p></li>
      <li class="q"><p class="qt">처음 켰을 때 기본</p><p class="qa"><span class="rec">추천: 밝은 화면.</span> 햇빛 드는 진료실과 오래된 모니터에서 더 잘 보입니다.</p></li>
      <li class="q"><p class="qt">바꾸는 단추의 자리</p><p class="qa"><span class="rec">추천: 화면 맨 위 줄, 언어 단추 옆.</span> 누구나 누를 수 있게.</p></li>
      <li class="q"><p class="qt">고른 것을 어디에 기억할지</p><p class="qa"><span class="rec">추천: 그 PC에.</span> 진료실 PC마다 다르게 둘 수 있습니다. 계정마다 기억하려면 DB를 고쳐야 합니다.</p></li>
      <li class="q"><p class="qt">그대로 두는 것</p><p class="qa">영상 보는 창, 인쇄 미리보기, 영수증·처방전 같은 종이는 어느 쪽을 골라도 지금 모양 그대로입니다.</p></li>
    </ul>
  </section>
</main>

<script type="application/json" id="snaps">${data}</script>
<script>
(function () {
  var SNAPS = JSON.parse(document.getElementById('snaps').textContent);
  var THEMES = {
    dark: ['지금 (어두운 화면)', '지금 쓰는 색 그대로입니다.'],
    A: ['A 맑은 흰색', '흰 판에 옅은 회색 바탕. 지금 화면과 가장 닮은 느낌입니다.'],
    B: ['B 따뜻한 종이색', '누런 종이 같은 바탕. 눈부심이 덜해 오래 봐도 편합니다.'],
    C: ['C 또렷한 흰색', '새하얀 바탕에 검은 글자, 진한 테두리. 맨 위 줄만 어둡게 남깁니다. 햇빛·낡은 모니터에 가장 강합니다.']
  };
  var state = { screen: 'registration', lang: 'ko', theme: 'A', accent: 'blue' };
  try { var s = JSON.parse(localStorage.getItem('ds-mock') || 'null'); if (s) for (var k in state) if (s[k]) state[k] = s[k]; } catch (e) {}

  function mock(theme) {
    var d = document.createElement('div');
    d.className = 'mock' + (theme === 'dark' ? '' : ' t-' + theme + ' a-' + state.accent);
    d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', '');
    d.innerHTML = SNAPS[state.screen + '_' + state.lang];
    return d;
  }
  function fit(shot) { shot.style.setProperty('--s', shot.clientWidth / 1366); }
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (e) { fit(e.target); }); }) : null;
  function fill(shot, theme) { shot.textContent = ''; shot.appendChild(mock(theme)); fit(shot); if (ro) ro.observe(shot); }

  var stage = document.getElementById('stage'), four = document.getElementById('four');
  function render() {
    fill(stage, state.theme);
    document.getElementById('cap-name').textContent = THEMES[state.theme][0];
    document.getElementById('cap-desc').textContent = THEMES[state.theme][1];
    four.textContent = '';
    Object.keys(THEMES).forEach(function (tk) {
      var b = document.createElement('button'); b.className = 'pick'; b.id = 'pick-' + tk; b.type = 'button';
      b.setAttribute('aria-pressed', String(state.theme === tk));
      var shot = document.createElement('div'); shot.className = 'shot'; b.appendChild(shot);
      var n = document.createElement('span'); n.className = 'pname'; n.textContent = THEMES[tk][0]; b.appendChild(n);
      var p = document.createElement('p'); p.className = 'pdesc'; p.textContent = THEMES[tk][1]; b.appendChild(p);
      b.addEventListener('click', function () { state.theme = tk; save(); render(); stage.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      four.appendChild(b); fill(shot, tk);
    });
    document.querySelectorAll('.opt').forEach(function (o) {
      o.setAttribute('aria-pressed', String(state[o.dataset.k] === o.dataset.v));
      if (o.dataset.k === 'accent') o.disabled = state.theme === 'dark';
    });
  }
  function save() { try { localStorage.setItem('ds-mock', JSON.stringify(state)); } catch (e) {} }
  document.querySelectorAll('.opt').forEach(function (o) {
    o.type = 'button';
    o.addEventListener('click', function () { state[o.dataset.k] = o.dataset.v; save(); render(); });
  });
  window.addEventListener('resize', function () { document.querySelectorAll('.shot').forEach(fit); });
  render();
})();
</script>
`;
fs.writeFileSync('bethesda-light-mockups.html', page);
console.log('page bytes', page.length);
