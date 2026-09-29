// Paste into the browser console on an ISOLATED session stack (never the clinic's EMR).
// Copies the screen's DOM and replaces every colour in the inline styles with a CSS variable
// whose name records: the colour, what it paints (bg / fg / bd), and what it sits on.
// The result is posted to a local saver (see README in wiki/modules/design.md 3.5).
window.__tok = async function (name) {
  document.querySelectorAll('*').forEach(function (e) { if (e.scrollLeft > 0) e.scrollLeft = 0; });
  document.querySelectorAll('input').forEach(function (i) { if (i.type === 'checkbox' || i.type === 'radio') { if (i.checked) i.setAttribute('checked', ''); else i.removeAttribute('checked'); } else { i.setAttribute('value', i.value); } });
  document.querySelectorAll('textarea').forEach(function (i) { i.textContent = i.value; });
  function h2(n) { return ('0' + Math.round(n).toString(16)).slice(-2); }
  function parse(s) { var m = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/.exec(s); if (!m) return null; var a = m[4] === undefined ? 1 : parseFloat(m[4]); return { a: a, key: h2(+m[1]) + h2(+m[2]) + h2(+m[3]) + (a < 1 ? h2(a * 255) : '') }; }
  function ownBg(el) { var cs = getComputedStyle(el); var bi = cs.backgroundImage; if (bi && bi.indexOf('gradient') >= 0) { var p = parse(bi); if (p) return p; } var p2 = parse(cs.backgroundColor); if (p2 && p2.a > 0) return p2; return null; }
  function chain(el) { var out = []; var e = el; while (e && e.nodeType === 1) { var b = ownBg(e); if (b) { out.push(b.key); if (b.a >= 0.95) return out.join('_'); } e = e.parentElement; } out.push('0f1117'); return out.join('_'); }
  var orig = document.getElementById('root'); var clone = orig.cloneNode(true);
  var O = [orig].concat(Array.from(orig.querySelectorAll('*'))); var C = [clone].concat(Array.from(clone.querySelectorAll('*')));
  var vars = {};
  for (var i = 0; i < O.length; i++) {
    var o = O[i], c = C[i]; var st = o.getAttribute('style'); if (!st || st.indexOf('rgb') < 0) continue;
    var txt = parse(getComputedStyle(o).color); var selfChain = chain(o); var parentChain = o.parentElement ? chain(o.parentElement) : '0f1117';
    var decls = st.split(';').map(function (d) {
      var k = d.indexOf(':'); if (k < 0) return d; var prop = d.slice(0, k).trim(), val = d.slice(k + 1);
      var kind = prop.indexOf('background') === 0 ? 'bg' : prop === 'color' ? 'fg' : (prop.indexOf('border') === 0 || prop.indexOf('outline') === 0) ? 'bd' : prop.indexOf('shadow') >= 0 ? 'sh' : 'fg';
      val = val.replace(/rgba?\([^)]*\)/g, function (m) {
        var p = parse(m); if (!p) return m;
        var ctx = kind === 'bg' ? 't' + (txt ? txt.key : 'x') + '-on-' + parentChain : 'on-' + (kind === 'bd' ? parentChain : selfChain);
        var vn = '--k-' + p.key + '-' + kind + '-' + ctx; vars[vn] = (vars[vn] || 0) + 1; return 'var(' + vn + ')';
      });
      return d.slice(0, k) + ':' + val;
    });
    c.setAttribute('style', decls.join(';'));
  }
  var r = await fetch('http://127.0.0.1:9199/save?name=' + name, { method: 'POST', body: JSON.stringify({ html: clone.outerHTML, vars: vars }) });
  return await r.text();
};
