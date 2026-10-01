// Measures the parts that the module screens have in common, so they can be compared:
// the tool row, the columns, the work-date row, the list rows, the empty-screen notice.
// Paste into the console of an ISOLATED session stack (never the clinic's EMR), on one of
// the module screens, then: __layout()  -> an object of plain values.
// (design session - tooling only, not part of the app)
(function () {
  var px = function (v) { return Math.round(parseFloat(v) * 10) / 10; };
  var st = function (e) {
    var c = getComputedStyle(e), r = e.getBoundingClientRect();
    return { text: (e.value || e.textContent || '').trim().slice(0, 28), tag: e.tagName, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), font: px(c.fontSize) + '/' + c.fontWeight + (c.fontStyle !== 'normal' ? '/' + c.fontStyle : ''), pad: c.padding, radius: c.borderRadius, bg: c.backgroundImage !== 'none' ? 'gradient' : c.backgroundColor, color: c.color, border: c.borderTopWidth === '0px' ? 'none' : c.borderTopWidth + ' ' + c.borderTopColor };
  };
  var visible = function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  window.__layout = function () {
    var out = { path: location.pathname, tools: [], cols: [], date: [], rows: [], notices: [] };
    var all = Array.from(document.querySelectorAll('body *')).filter(visible);
    // tool row: buttons between the menu row and the columns (y from 44 to 100)
    all.filter(function (e) { return e.tagName === 'BUTTON'; }).forEach(function (b) { var r = b.getBoundingClientRect(); if (r.top > 60 && r.top < 112) out.tools.push(st(b)); });
    var first = out.tools[0] && all.filter(function (e) { return e.tagName === 'BUTTON'; }).filter(function (b) { var r = b.getBoundingClientRect(); return r.top > 60 && r.top < 112; })[0];
    if (first) { var row = first.parentElement; while (row && row.getBoundingClientRect().width < 1000) row = row.parentElement; if (row) { var s = st(row); out.toolRow = { h: s.h, pad: s.pad, bg: s.bg, y: s.y, gap: getComputedStyle(first.parentElement).gap }; } }
    // columns: the widest element whose children sit side by side and fill the width
    var best = null;
    all.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.width < 1300 || r.height < 400 || r.top > 140) return; var kids = Array.from(e.children).filter(visible); if (kids.length < 2 || kids.length > 4) return; var tops = kids.map(function (k) { return Math.round(k.getBoundingClientRect().top); }); if (tops.some(function (t) { return Math.abs(t - tops[0]) > 2; })) return; best = e; });
    if (best) { out.colsTop = Math.round(best.getBoundingClientRect().top); out.colsTemplate = getComputedStyle(best).gridTemplateColumns; Array.from(best.children).filter(visible).forEach(function (k) { var s = st(k); out.cols.push({ x: s.x, w: s.w, bg: s.bg, border: getComputedStyle(k).borderRightWidth + '/' + getComputedStyle(k).borderLeftWidth }); }); }
    // work-date row
    var di = all.filter(function (e) { return e.tagName === 'INPUT' && e.type === 'date'; })[0];
    if (di) { var dr = di.parentElement; while (dr && dr.getBoundingClientRect().width < 150) dr = dr.parentElement; out.dateRow = st(dr); out.dateRow.text = ''; Array.from(dr.querySelectorAll('*')).filter(visible).forEach(function (e) { if (e.children.length === 0 || e.tagName === 'BUTTON' || e.tagName === 'INPUT') out.date.push(st(e)); }); }
    // list: leaf texts in the left 300px below the tool row
    all.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.left < 300 && r.right <= 310 && r.top > 110 && r.top < 330 && (e.children.length === 0 || e.tagName === 'INPUT') && (e.textContent.trim() || e.tagName === 'INPUT') && !(di && (di.parentElement.contains(e)))) out.rows.push(st(e)); });
    // notices: italic or centred leaf texts in the middle and right
    all.forEach(function (e) { var r = e.getBoundingClientRect(), c = getComputedStyle(e); if (r.left >= 300 && r.top > 100 && e.children.length === 0 && e.textContent.trim() && (c.fontStyle === 'italic' || c.textAlign === 'center' || parseFloat(c.fontSize) >= 30)) { var s = st(e); s.align = c.textAlign; s.opacity = c.opacity; out.notices.push(s); } });
    out.notices = out.notices.slice(0, 8); out.rows = out.rows.slice(0, 14);
    return out;
  };
})();
