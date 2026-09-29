// Is everything readable on the light screen? Paste into the console on an ISOLATED session
// stack with the light screen on (document.documentElement.setAttribute('data-theme','light')),
// then run __audit(). It lists every visible text below WCAG AA against the background it
// really sits on (4.5, or 3 for large text), every placeholder below 4.5, and every input
// whose border is below 3 against what surrounds it. An empty list is a pass. Disabled
// controls are listed but do not count (WCAG exempts them).
window.__audit = function () {
  function parse(s) { var m = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/.exec(s); if (!m) return null; return { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : parseFloat(m[4]) }; }
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function over(t, a, b) { return t.map(function (v, i) { return v * a + b[i] * (1 - a); }); }
  function bgOf(el) { var layers = []; var e = el; while (e && e.nodeType === 1) { var cs = getComputedStyle(e); var p = null; if (cs.backgroundImage.indexOf('gradient') >= 0) { var all = cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []; p = all.length ? parse(all[0]) : null; } else p = parse(cs.backgroundColor); if (p && p.a > 0) { layers.push(p); if (p.a >= 0.99) break; } e = e.parentElement; } var c = [255, 255, 255]; for (var i = layers.length - 1; i >= 0; i--) c = over(layers[i].c, layers[i].a, c); return c; }
  var out = []; var seen = {};
  Array.from(document.querySelectorAll('#root *')).forEach(function (el) {
    var r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return; var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    var hasText = Array.from(el.childNodes).some(function (n) { return n.nodeType === 3 && n.textContent.trim(); }) || ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && (el.value || el.placeholder));
    var bg = bgOf(el);
    if (hasText) {
      var fg = parse(cs.color); if (fg) { var c = over(fg.c, fg.a * parseFloat(cs.opacity || 1), bg); var ratio = con(c, bg); var big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700); var need = big ? 3 : 4.5;
        if (ratio < need) { var k = cs.color + ' on ' + bg.map(Math.round).join(','); if (!seen[k]) { seen[k] = 1; out.push(ratio.toFixed(2) + ' TEXT ' + el.tagName + ' "' + (el.textContent || el.value || el.placeholder || '').trim().slice(0, 30) + '" ' + k + (el.disabled ? ' (disabled)' : '')); } } }
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder && !el.value) { var ph = parse(getComputedStyle(el, '::placeholder').color); if (ph) { var r2 = con(over(ph.c, ph.a, bg), bg); if (r2 < 4.5) { var k2 = 'ph ' + ph.c.join(',') + ' on ' + bg.map(Math.round).join(','); if (!seen[k2]) { seen[k2] = 1; out.push(r2.toFixed(2) + ' PLACEHOLDER "' + el.placeholder.slice(0, 30) + '" ' + k2); } } } }
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') { var bw = parseFloat(cs.borderTopWidth); var outer = el.parentElement ? bgOf(el.parentElement) : [255, 255, 255]; var b = parse(cs.borderTopColor); if (bw > 0 && b) { var r3 = con(over(b.c, b.a, outer), outer); if (r3 < 3) { var k3 = 'bd ' + cs.borderTopColor + ' on ' + outer.map(Math.round).join(','); if (!seen[k3]) { seen[k3] = 1; out.push(r3.toFixed(2) + ' FIELD-BORDER ' + el.tagName + ' "' + (el.placeholder || el.value || '').slice(0, 30) + '" ' + k3); } } } }
  });
  return out.sort();
};
