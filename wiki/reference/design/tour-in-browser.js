// Walks every screen of an ISOLATED session stack (never the clinic's EMR), in French, and at
// each stop (1) writes the computed colours of every element (compare-in-browser.js) and
// (2) runs the contrast audit on the light and on the dark screen (audit-in-browser.js).
// Load compare-in-browser.js and audit-in-browser.js first, then this file, then:
//   __walk('before')   ...change the colours, rebuild...   __walk('after')
// It runs for about five minutes. Poll window.__walkResult; it is null until the walk ends.
// The test data it expects: patients named RAKOTOMALALA, RASOANAIVO, ANDRIANARISOA with
// visits today, one consultation in progress, two finished, one receipt paid today.
(function () {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var btn = function (re) { return Array.from(document.querySelectorAll('button')).filter(function (x) { return re.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0; })[0]; };
  var leaf = function (re, sel) { return Array.from(document.querySelectorAll(sel || 'div,span,td')).filter(function (e) { return e.children.length === 0 && re.test(e.textContent) && e.getBoundingClientRect().width > 0; }); };
  var root = document.documentElement;
  var closeAll = async function () { for (var i = 0; i < 4; i++) { var c = Array.from(document.querySelectorAll('button')).filter(function (x) { return x.getBoundingClientRect().width > 0 && /^(✕|×|Fermer|Annuler|Fermer ✕)$/.test(x.textContent.trim()); }).pop(); if (!c) break; c.click(); await wait(500); } };

  window.__walkResult = null;
  window.__walk = async function (prefix) {
    window.__walkResult = null;
    var dumps = [], light = {}, dark = {}, paper = {}, log = [], n = 0;
    var was = root.getAttribute('data-theme');
    var snap = async function (label) {
      if (document.activeElement) document.activeElement.blur();
      document.querySelectorAll('*').forEach(function (e) { if (e.scrollLeft > 0) e.scrollLeft = 0; });
      n++; var name = ('0' + n).slice(-2) + '_' + label;
      root.removeAttribute('data-theme'); await wait(80);
      dumps.push(await window.__dump(prefix + '_' + name));
      var d = window.__audit(); if (d.length) dark[name] = d;
      root.setAttribute('data-theme', 'light'); await wait(120);
      var l = window.__audit(); if (l.length) light[name] = l;
      root.setAttribute('data-theme', 'paper'); await wait(120);
      var p = window.__audit(); if (p.length) paper[name] = p;
      root.removeAttribute('data-theme'); await wait(60);
    };
    try {
      var fr = btn(/^FR$/); if (fr) fr.click(); await wait(600);
      var page = async function (label) { var b = btn(new RegExp('^' + label + '$')); if (!b) { log.push('no menu ' + label); return false; } b.click(); await wait(2500); return true; };
      var NAMES = /^(RASOANAIVO|RAKOTOMALALA|ANDRIANARISOA)/;
      var windows = async function (where) {
        var icons = ['🧪', '🩻', '📄', '📋 Dossier', '📋 S', '💊 Ordonnance'];
        for (var k = 0; k < icons.length; k++) { var ib = Array.from(document.querySelectorAll('button')).filter(function (x) { return x.textContent.trim().indexOf(icons[k]) === 0 && x.getBoundingClientRect().width > 0; })[0]; if (ib && !ib.disabled) { ib.click(); await wait(1800); await snap(where + '_win' + k); await closeAll(); await wait(400); } }
      };
      var patients = async function (where, max, withWindows) {
        var rows = leaf(NAMES);
        for (var r = 0; r < Math.min(rows.length, max); r++) { var nm = rows[r].textContent.slice(0, 5); rows[r].click(); await wait(2200); await snap(where + '_' + nm); if (withWindows) await windows(where + '_' + nm); rows = leaf(NAMES); }
      };

      if (await page('Enregistrement')) { await snap('registration'); await patients('registration', 1, false); var t2 = btn(/^En cours/); if (t2) { t2.click(); await wait(600); await snap('registration_inprogress'); } var t3 = btn(/^Terminé \(/); if (t3) { t3.click(); await wait(600); await snap('registration_done'); } }
      if (await page('Consultation')) { await snap('consultation'); var q = btn(/File d.Attente/); if (q) { q.click(); await wait(800); await snap('consultation_queue'); } await patients('consultation', 2, true); var os = btn(/^Ordonnances types$/); if (os) { os.click(); await wait(800); await snap('consultation_sets'); } }
      if (await page('Paiement')) {
        await snap('payment'); await patients('payment', 1, true);
        var paid = btn(/^Payé aujourd/); if (paid) { paid.click(); await wait(1500); await snap('payment_paid'); await patients('payment_paid', 1, false); var rc = btn(/^Reçus$/); if (rc) { rc.click(); await wait(1200); await snap('payment_receipts'); } }
      }
      if (await page('Pharmacie')) {
        await snap('pharmacy'); await patients('pharmacy', 1, true);
        var st = btn(/Stock$/); if (st) { st.click(); await wait(2000); await snap('stock'); var d1 = leaf(/^MED-0\d+/)[0] || leaf(/Aceclofen/)[0]; if (d1) { d1.click(); await wait(1500); await snap('stock_drug'); var en = btn(/^Entrée$/); if (en) { en.click(); await wait(600); await snap('stock_receive'); } } var rp = btn(/Rapport mensuel/); if (rp) { rp.click(); await wait(2000); await snap('stock_report'); await closeAll(); await wait(400); } }
      }
      if (await page('Laboratoire')) { await snap('lab'); await patients('lab', 2, false); var done = btn(/^Terminé \d/); if (done) { done.click(); await wait(1500); await snap('lab_done'); await patients('lab_done', 1, false); } }
      if (await page('Statistiques')) {
        var mo = btn(/^Ce mois$/); if (mo) { mo.click(); await wait(1500); }
        await snap('stats');
        var cards = Array.from(document.querySelectorAll('.pressable'));
        for (var i = 0; i < Math.min(cards.length, 3); i++) { cards = Array.from(document.querySelectorAll('.pressable')); if (!cards[i]) break; cards[i].click(); await wait(900); await snap('stats_card' + i); }
      }
      if (await page('Paramètres')) {
        var side = function () { return Array.from(document.querySelectorAll('div')).filter(function (e) { var r = e.getBoundingClientRect(); return r.left < 5 && r.width > 100 && r.width < 260 && r.height > 20 && r.height < 40 && r.top > 85 && e.children.length <= 2 && e.textContent.trim().length > 3 && getComputedStyle(e).cursor === 'pointer'; }); };
        var count = side().length;
        for (var s = 0; s < count; s++) {
          var items = side(); if (!items[s]) { log.push('settings item ' + s + ' not found'); await page('Paramètres'); items = side(); if (!items[s]) continue; }
          var name = items[s].textContent.trim().replace(/[^A-Za-z]/g, '').slice(0, 10); items[s].click(); await wait(1800); await snap('set_' + name);
          var opener = Array.from(document.querySelectorAll('button')).filter(function (x) { var r = x.getBoundingClientRect(); return r.left > 200 && r.width > 0 && /^\+ Ajouter/.test(x.textContent.trim()) && !x.disabled; })[0];
          if (opener) { opener.click(); await wait(1200); await snap('set_' + name + '_add'); await closeAll(); await wait(400); }
          var mod = btn(/^Modifier$/); if (mod && s < 5) { mod.click(); await wait(1200); await snap('set_' + name + '_edit'); await closeAll(); await wait(400); }
        }
        var chip = Array.from(document.querySelectorAll('span')).filter(function (e) { return /🔑/.test(e.textContent) && e.children.length === 0; })[0]; if (chip) { chip.click(); await wait(1000); await snap('password'); await closeAll(); await wait(300); }
      }
    } catch (e) { log.push('stopped: ' + String(e)); }
    if (was) root.setAttribute('data-theme', was);
    var flat = function (o) { var all = {}; for (var k in o) o[k].forEach(function (x) { (all[x] = all[x] || []).push(k); }); return Object.keys(all).sort().map(function (x) { return x + '  <- ' + all[x].length + ' stops, first ' + all[x][0]; }); };
    window.__walkResult = { stops: n, dumps: dumps.length, log: log, light: flat(light), dark: flat(dark), paper: flat(paper) };
    return window.__walkResult;
  };
})();
