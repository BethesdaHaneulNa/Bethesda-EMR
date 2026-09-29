// Proof that the dark screen did not change. Paste into the console on an ISOLATED session
// stack (never the clinic's EMR), once on the build before a change and once after, with
// the same data and the same clicks. __dump(name) writes one line per element with every
// computed colour (var(--x) is resolved to the real colour there), posted to a local saver
// on 127.0.0.1:9190 that writes the body to <name>.txt. Then: diff before_x.txt after_x.txt
// - not one character may differ (leave out the RULE / HOVERVAR lines, which list the
// stylesheet itself).
window.__dump = async function (name) {
  var P = ['color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'boxShadow', 'textDecorationColor', 'caretColor', 'filter', 'colorScheme', 'opacity'];
  var els = [document.documentElement].concat(Array.from(document.documentElement.querySelectorAll('*'))).filter(function (e) { return ['SCRIPT', 'STYLE', 'META', 'TITLE', 'LINK', 'HEAD'].indexOf(e.tagName) < 0; });
  var lines = els.map(function (e, i) { var cs = getComputedStyle(e); var v = P.map(function (p) { return cs[p]; }); if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') v.push('ph:' + getComputedStyle(e, '::placeholder').color); return i + ' ' + e.tagName + ' | ' + v.join(' | '); });
  var hover = ''; for (var s = 0; s < document.styleSheets.length; s++) { try { var rs = document.styleSheets[s].cssRules; for (var r = 0; r < rs.length; r++) { var t = rs[r].cssText; if (/hover|active/.test(t)) hover += '\nRULE ' + t.replace(/\s+/g, ' '); } } catch (e) {} }
  var root = getComputedStyle(document.documentElement).getPropertyValue('--hover-filter');
  var r2 = await fetch('http://127.0.0.1:9190/save?name=' + name, { method: 'POST', body: lines.join('\n') + '\nELEMENTS ' + els.length + hover + '\nHOVERVAR [' + root.trim() + ']' });
  return (await r2.text()) + ' ' + els.length;
};
// Walks the seven screens in French, and on each opens the first test patient it finds.
window.__tour = async function (prefix) {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = []; var labels = ['Enregistrement', 'Consultation', 'Paiement', 'Pharmacie', 'Laboratoire', 'Statistiques', 'Paramètres'];
  var fr = Array.from(document.querySelectorAll('button')).filter(function (b) { return b.textContent === 'FR'; })[0]; if (fr) fr.click(); await wait(500);
  for (var i = 0; i < labels.length; i++) {
    var b = Array.from(document.querySelectorAll('button')).filter(function (x) { return x.textContent === labels[i]; })[0]; if (!b) { out.push('no button ' + labels[i]); continue; }
    b.click(); await wait(2500); if (document.activeElement) document.activeElement.blur();
    out.push(await window.__dump(prefix + '_' + (i + 1) + '_' + location.pathname.replace(/\W/g, '')));
    var row = Array.from(document.querySelectorAll('div,span,td')).filter(function (e) { return e.children.length === 0 && /^RASOANAIVO|^RAKOTOMALALA/.test(e.textContent); })[0];
    if (row) { row.click(); await wait(2000); if (document.activeElement) document.activeElement.blur(); out.push(await window.__dump(prefix + '_' + (i + 1) + '_' + location.pathname.replace(/\W/g, '') + '_patient')); }
  }
  return out.join(' ; ');
};
