// Builds the page that shows the director the dark screen as it is and as it would be
// with its low-contrast colours adjusted (wiki/modules/design.md, section 7).
//   node darkfix.mjs      -> dark-contrast-2026-09-30.html
// Uses the tokenized snapshots in ./snaps (the real registration and consultation screens
// of the isolated stack, fake patients). A proposal only: nothing in the app changes.
// (design session - tooling only, not part of the app)
import fs from 'fs';
import { parseVar, value, rgb, contrast } from './themes.mjs';

// what would change: [kind test, from, to]
const TEXT = { '64748b': '8793a6', '475569': '8290a3', '3b82f6': '60a5fa', 'ef4444': 'f87171' };
const FILL = { '3b82f6': '2563eb', '2563eb': '1d4ed8', '10b981': '047857', '059669': '046c4e', '16a34a': '15803d' };
const FIELD_BORDER = { '2a3142': '5d6a82' };
const PLACEHOLDER = '8290a3';

const snaps = {}; const names = new Set();
for (const f of fs.readdirSync('snaps').filter(f => f.startsWith('tok_'))) {
  const j = JSON.parse(fs.readFileSync('snaps/' + f, 'utf8'));
  const h = j.html
    .replace(/<(input|textarea|select)\b[^>]*>/g, m => m.replace(/-bg-t/g, '-bgf-t').replace(/-bd-on-/g, '-bdf-on-'))
    .replace(/min-height: 100vh/g, 'min-height: 768px').replace(/calc\((-\d+)px \+ 100vh\)/g, (m, n) => (768 + +n) + 'px');
  (h.match(/--k-[0-9a-z_-]+/g) || []).forEach(n => names.add(n));
  snaps[f.replace('tok_', '').replace('.json', '')] = h;
}
const vars = [...names].sort().map(parseVar);
function fixed(v) {
  const alpha = v.a < 1 ? ('0' + Math.round(v.a * 255).toString(16)).slice(-2) : '';
  const white = v.text && v.text.slice(0, 6) === 'ffffff';
  let to = null;
  if (v.kind === 'fg' && v.a >= 1 && TEXT[v.hex] && v.chain[v.chain.length - 1].slice(0, 6) !== v.hex) to = TEXT[v.hex];
  if ((v.kind === 'bg' || v.kind === 'bgf') && v.a >= 1 && white && FILL[v.hex]) to = FILL[v.hex];
  if (v.kind === 'bdf' && FIELD_BORDER[v.hex]) to = FIELD_BORDER[v.hex];
  return '#' + (to || v.hex) + alpha;
}
const css = '.mock{' + vars.map(v => v.name + ':' + value('dark', v, 'blue').css).join(';') + '}\n' +
  '.mock.fix{' + vars.map(v => v.name + ':' + fixed(v)).join(';') + '}\n' +
  '.mock.fix ::placeholder{color:#' + PLACEHOLDER + '}';

const c = (a, b) => contrast(rgb(a), rgb(b));
const range = (col, bgs) => { const r = bgs.map(b => c(col, b)); return Math.min(...r).toFixed(1) + '~' + Math.max(...r).toFixed(1); };
const SURF = ['0f1117', '13161f', '1a1f2e', '1e2433'];
const rows = [
  ['① 흐린 회색 글자', '칸 이름, 표 머리, 작은 안내 글자', '#64748b', range('64748b', SURF), '#8793a6', range('8793a6', SURF), '조금 밝아집니다. 나란히 놓고 보아야 알 정도입니다.', 4.5],
  ['② 더 흐린 글자', '눌리지 않는 단추의 글자, 「→」 같은 표시, 빈 화면의 안내', '#475569', range('475569', SURF), '#8290a3', range('8290a3', SURF), '눈에 띄게 밝아집니다. 지금은 거의 안 보이던 글자가 읽힙니다.', 4.5],
  ['③ 파랑 글자', '「대기」 꼬리표, 고른 탭', '#3b82f6', range('3b82f6', SURF), '#60a5fa', range('60a5fa', SURF), '조금 밝은 파랑이 됩니다. 메뉴에서 이미 쓰는 파랑과 같아집니다.', 4.5],
  ['④ 빨강 글자', '「로그아웃」, 취소 · 미수 표시', '#ef4444', range('ef4444', SURF), '#f87171', range('f87171', SURF), '조금 밝은 빨강이 됩니다. 경고 글자에서 이미 쓰는 빨강과 같아집니다.', 4.5],
  ['⑤ 색 단추 위 흰 글자', '파랑 「저장」, 초록 「확인」 · 「완료」 단추', '파랑 #3b82f6 · 초록 #10b981', c('ffffff', '3b82f6').toFixed(1) + ' · ' + c('ffffff', '10b981').toFixed(1), '파랑 #2563eb · 초록 #047857', c('ffffff', '2563eb').toFixed(1) + ' · ' + c('ffffff', '047857').toFixed(1), '단추 바탕이 짙어집니다. 초록 단추가 가장 많이 달라집니다. 밝은 화면의 단추와 같은 색이 됩니다.', 4.5],
  ['⑥ 입력 칸 테두리', '글자를 넣는 모든 칸', '#2a3142', range('2a3142', ['0f1117', '13161f', '1a1f2e']), '#5d6a82', range('5d6a82', ['0f1117', '13161f', '1a1f2e']), '가장 눈에 띄는 변화입니다. 칸마다 테두리가 또렷해져, 어디에 글자를 넣는지 한눈에 보입니다.', 3],
  ['⑦ 칸 안의 예시 글자', '빈 칸에 흐리게 보이는 「이름 / 차트번호 …」', '브라우저 기본 회색', range('757575', SURF), '#8290a3', range('8290a3', SURF), '조금 밝아집니다.', 4.5],
];
const tr = rows.map(r => { const lo = parseFloat(r[3]); const ok = x => parseFloat(x) >= r[7]; return '<tr><th scope="row">' + r[0] + '<span class="where">' + r[1] + '</span></th><td><span class="sw" style="background:' + (r[2].match(/#[0-9a-f]{6}/) || ['#757575'])[0] + '"></span><code>' + r[2] + '</code><span class="n ' + (ok(r[3]) ? 'ok' : 'ng') + '">대비 ' + r[3] + (ok(r[3]) ? ' 통과' : ' 미달') + '</span></td><td><span class="sw" style="background:' + r[4].match(/#[0-9a-f]{6}/)[0] + '"></span><code>' + r[4] + '</code><span class="n ok">대비 ' + r[5] + ' 통과</span></td><td>' + r[6] + '</td></tr>'; }).join('\n');

const data = JSON.stringify(snaps).replace(/</g, '\\u003c');
const page = `<title>어두운 화면 글자 또렷하게</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
/* layout: one column; the two dark screens one above the other, the table of changes after */
:root{ --bg:#f4f6f9; --panel:#ffffff; --ink:#111827; --ink-2:#4b5565; --line:#d6dbe3; --accent:#1d4ed8; --ok:#0a6b4a; --ng:#a82020;
  --sans:"IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif; --mono:"IBM Plex Mono",Consolas,monospace }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --ok:#5fd0a4; --ng:#ff8f8f; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#0e1116; --panel:#171b22; --ink:#e8ecf2; --ink-2:#a3adbb; --line:#2c333f; --accent:#8fb4ff; --ok:#5fd0a4; --ng:#ff8f8f; color-scheme:dark }
body{ background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.65 }
.wrap{ max-width:1180px; margin:0 auto; padding-inline:20px; padding-block:32px 64px; display:flex; flex-direction:column; gap:34px }
.h1{ font-size:clamp(24px,3.4vw,32px); font-weight:700; line-height:1.25; margin:0; text-wrap:balance }
.lead{ margin:8px 0 0; color:var(--ink-2); max-width:64ch }
.h2{ font-size:20px; font-weight:700; margin:0 0 4px }
.sub{ margin:0 0 14px; color:var(--ink-2); max-width:66ch }
.seg{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px }
.opt{ font:inherit; font-size:15px; font-weight:600; padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--ink); cursor:pointer }
.opt[aria-pressed="true"]{ background:var(--accent); border-color:var(--accent); color:var(--bg) }
.opt:focus-visible{ outline:3px solid var(--accent); outline-offset:2px }
.pair{ display:flex; flex-direction:column; gap:22px }
.cap{ font-weight:700; margin:0 0 6px }
.cap span{ font-weight:400; color:var(--ink-2); margin-left:8px }
.shot{ position:relative; width:100%; aspect-ratio:1366/768; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:#0f1117 }
.scroll{ overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--panel) }
.tbl{ border-collapse:collapse; width:100%; min-width:760px; font-size:15px }
.tbl th,.tbl td{ padding:12px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top }
.tbl thead th{ font-size:13px; color:var(--ink-2); font-weight:600 }
.tbl tbody tr:last-child th,.tbl tbody tr:last-child td{ border-bottom:0 }
.where{ display:block; font-weight:400; font-size:13.5px; color:var(--ink-2) }
.sw{ display:inline-block; width:16px; height:16px; border-radius:4px; border:1px solid var(--line); vertical-align:-3px; margin-right:6px }
.tbl code{ font-family:var(--mono); font-size:13px }
.n{ display:block; font-size:13.5px; font-variant-numeric:tabular-nums; margin-top:2px }
.n.ok{ color:var(--ok) } .n.ng{ color:var(--ng); font-weight:600 }
.choices{ margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px }
.ch{ border:1px solid var(--line); border-radius:10px; background:var(--panel); padding:14px 16px }
.ch b{ display:block; margin-bottom:2px }
.ch p{ margin:0; color:var(--ink-2); font-size:14.5px }
.rec{ color:var(--accent); font-weight:600 }
.mock{ position:absolute; left:0; top:0; width:1366px; height:768px; overflow:hidden; transform-origin:0 0; transform:scale(var(--s,.5)); font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif; font-size:18px; line-height:normal; pointer-events:none; text-align:left; color-scheme:dark }
.mock *{ margin:0; padding:0; box-sizing:border-box }
.mock input,.mock select,.mock textarea,.mock button{ font-size:17px }
.mock table{ font-size:16px }
${css}
</style>
<main class="wrap">
  <header>
    <h1 class="h1">어두운 화면 글자 또렷하게</h1>
    <p class="lead">지금 어두운 화면에는 글자와 바탕의 밝기 차이가 국제 기준(WCAG AA)에 못 미치는 곳이 있습니다. 밝은 화면을 만들며 재 보다가 찾았습니다. 아래는 지금 화면과, 고쳤을 때의 화면입니다. 아직 아무것도 바꾸지 않았습니다.</p>
  </header>
  <section aria-label="화면 비교">
    <div class="seg">
      <button class="opt" id="o-registration" data-k="screen" data-v="registration" type="button">접수</button>
      <button class="opt" id="o-consultation" data-k="screen" data-v="consultation" type="button">진료</button>
      <button class="opt" id="o-ko" data-k="lang" data-v="ko" type="button">한국어</button>
      <button class="opt" id="o-fr" data-k="lang" data-v="fr" type="button">프랑스어 (현장)</button>
    </div>
    <div class="pair">
      <div><p class="cap">지금 <span>어두운 화면 그대로</span></p><div class="shot" id="now"></div></div>
      <div><p class="cap">고친 뒤 <span>아래 표의 일곱 가지를 모두 고쳤을 때</span></p><div class="shot" id="fix"></div></div>
    </div>
  </section>
  <section aria-label="무엇이 달라지나">
    <h2 class="h2">무엇이 달라지나</h2>
    <p class="sub">대비는 글자와 바탕의 밝기 차이입니다. 숫자가 클수록 잘 보입니다. 기준은 글자 4.5 이상, 칸 테두리 3 이상입니다. 범위는 놓인 바탕에 따라 달라지는 값입니다.</p>
    <div class="scroll"><table class="tbl">
      <thead><tr><th scope="col">어디</th><th scope="col">지금</th><th scope="col">고치면</th><th scope="col">눈에 얼마나 달라지나</th></tr></thead>
      <tbody>
${tr}
      </tbody>
    </table></div>
  </section>
  <section aria-label="정하실 것">
    <h2 class="h2">정하실 것</h2>
    <p class="sub">셋 가운데 하나입니다. 어느 쪽이든 밝은 화면은 달라지지 않습니다.</p>
    <ul class="choices">
      <li class="ch"><b>가. 일곱 가지 모두 고침 <span class="rec">추천</span></b><p>현장의 오래된 모니터와 햇빛 아래에서 어두운 화면도 읽기 쉬워집니다. 화면의 느낌은 같고, 입력 칸 테두리와 초록 단추가 가장 달라 보입니다.</p></li>
      <li class="ch"><b>나. 글자만 고침 (①②③④⑦)</b><p>단추 색과 입력 칸 테두리는 지금 그대로 둡니다. 화면이 거의 달라 보이지 않지만, 칸 테두리는 여전히 흐립니다.</p></li>
      <li class="ch"><b>다. 그대로 둠</b><p>어두운 화면은 지금과 똑같이 둡니다. 읽기 어려운 분은 밝은 화면을 쓰면 됩니다.</p></li>
    </ul>
  </section>
</main>
<script type="application/json" id="snaps">${data}</script>
<script>
(function () {
  var SNAPS = JSON.parse(document.getElementById('snaps').textContent);
  var state = { screen: 'registration', lang: 'ko' };
  function fit(shot) { shot.style.setProperty('--s', shot.clientWidth / 1366); }
  function fill(shot, cls) { var d = document.createElement('div'); d.className = 'mock' + cls; d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', ''); d.innerHTML = SNAPS[state.screen + '_' + state.lang]; shot.textContent = ''; shot.appendChild(d); fit(shot); }
  function render() {
    fill(document.getElementById('now'), ''); fill(document.getElementById('fix'), ' fix');
    document.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', String(state[o.dataset.k] === o.dataset.v)); });
  }
  document.querySelectorAll('.opt').forEach(function (o) { o.addEventListener('click', function () { state[o.dataset.k] = o.dataset.v; render(); }); });
  window.addEventListener('resize', function () { document.querySelectorAll('.shot').forEach(fit); });
  render();
})();
</script>
`;
fs.writeFileSync('dark-contrast-2026-09-30.html', page);
console.log('page bytes', page.length);
rows.forEach(r => console.log(r[0].padEnd(16), r[2].padEnd(30), r[3].padEnd(12), '->', r[4].padEnd(30), r[5]));
