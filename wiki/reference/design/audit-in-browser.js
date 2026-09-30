// Is everything readable on the light screen? Paste into the console on an ISOLATED session
// stack with the light screen on (the switch in the top bar, or ?theme=light), then run
// __audit(). It lists every visible text below WCAG AA against the background it really
// sits on (4.5, or 3 for large text), every placeholder below 4.5, and every input whose
// border is below 3 against what surrounds it. An empty list is a pass. Disabled controls
// are listed but do not count (WCAG exempts them).
//
// Opacity (2026-09-30, found by the reception and consultation sessions): an element's
// opacity fades everything inside it, so the text of a card at opacity 0.85 is fainter than
// its colour says. Each colour is therefore taken with the opacity of the element that
// paints it times the opacity of every ancestor. The first version only looked at the
// element's own opacity and passed text it should not have.
window.__audit = function () {
  function parse(s) { var m = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/.exec(s); if (!m) return null; return { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : parseFloat(m[4]) }; }
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function over(t, a, b) { return t.map(function (v, i) { return v * a + b[i] * (1 - a); }); }
  // opacity of el times that of all its ancestors
  function fade(el) { var o = 1; var e = el; while (e && e.nodeType === 1) { var v = parseFloat(getComputedStyle(e).opacity); if (!isNaN(v)) o *= v; e = e.parentElement; } return o; }
  // what is painted behind el (el's own background included), as one colour
  function bgOf(el) {
    var layers = []; var e = el;
    while (e && e.nodeType === 1) {
      var cs = getComputedStyle(e); var p = null;
      if (cs.backgroundImage.indexOf('gradient') >= 0) { var all = cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []; p = all.length ? parse(all[0]) : null; } else p = parse(cs.backgroundColor);
      if (p && p.a > 0) { var a = p.a * fade(e); layers.push({ c: p.c, a: a }); if (a >= 0.99) break; }
      e = e.parentElement;
    }
    var c = [255, 255, 255]; for (var i = layers.length - 1; i >= 0; i--) c = over(layers[i].c, layers[i].a, c); return c;
  }
  var out = []; var seen = {};
  Array.from(document.querySelectorAll('#root *')).forEach(function (el) {
    var r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return; var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    var hasText = Array.from(el.childNodes).some(function (n) { return n.nodeType === 3 && n.textContent.trim(); }) || ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !/^(checkbox|radio|range|file|hidden)$/.test(el.type || '') && (el.value || el.placeholder));
    var bg = bgOf(el); var f = fade(el); var note = (el.disabled ? ' (disabled)' : '') + (f < 1 ? ' (faded to ' + f.toFixed(2) + ')' : '');
    if (hasText) {
      var fg = parse(cs.color); if (fg) { var c = over(fg.c, fg.a * f, bg); var ratio = con(c, bg); var big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700); var need = big ? 3 : 4.5;
        if (ratio < need) { var k = cs.color + ' on ' + bg.map(Math.round).join(',') + note; if (!seen[k]) { seen[k] = 1; out.push(ratio.toFixed(2) + ' TEXT ' + el.tagName + ' "' + (el.textContent || el.value || el.placeholder || '').trim().slice(0, 30) + '" ' + cs.fontSize + ' ' + k); } } }
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder && !el.value) { var pcs = getComputedStyle(el, '::placeholder'); var ph = parse(pcs.color); if (ph) { var po = parseFloat(pcs.opacity); var r2 = con(over(ph.c, ph.a * f * (isNaN(po) ? 1 : po), bg), bg); if (r2 < 4.5) { var k2 = 'ph ' + ph.c.join(',') + ' on ' + bg.map(Math.round).join(',') + note; if (!seen[k2]) { seen[k2] = 1; out.push(r2.toFixed(2) + ' PLACEHOLDER "' + el.placeholder.slice(0, 30) + '" ' + k2); } } } }
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') { var bw = parseFloat(cs.borderTopWidth); var outer = el.parentElement ? bgOf(el.parentElement) : [255, 255, 255]; var b = parse(cs.borderTopColor); if (bw > 0 && b) { var r3 = con(over(b.c, b.a * f, outer), outer); if (r3 < 3) { var k3 = 'bd ' + cs.borderTopColor + ' on ' + outer.map(Math.round).join(',') + note; if (!seen[k3]) { seen[k3] = 1; out.push(r3.toFixed(2) + ' FIELD-BORDER ' + el.tagName + ' "' + (el.placeholder || el.value || '').slice(0, 30) + '" ' + k3); } } } }
  });
  return out.sort();
};
// What has the keyboard must show it: focuses each input in turn and lists those with no
// visible ring (no outline and no box shadow while focused).
window.__auditFocus = function () {
  var out = [];
  Array.from(document.querySelectorAll('#root input, #root textarea, #root select')).forEach(function (el) {
    var r = el.getBoundingClientRect(); if (r.width === 0 || el.disabled || el.type === 'checkbox' || el.type === 'radio') return;
    el.focus({ preventScroll: true }); var cs = getComputedStyle(el);
    var ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
    if (!ring) out.push(el.tagName + ' "' + (el.placeholder || el.value || el.name || '').slice(0, 30) + '"');
    el.blur();
  });
  return out;
};
