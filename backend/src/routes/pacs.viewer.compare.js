// BROWSER code, not a route: pacs.viewer.js serves this file as
// /api/pacs/viewer/px/compare.js and adds it to the Stone viewer page when the image
// window opens with several studies of the same patient (?study=OPENED,OTHER,...).
//
// "Compare with an earlier exam" (director, 2026-10-01). Stone can show two series
// side by side, but only by hand: pick the layout, tick the other study in a
// drop-down, drag a series. It has no URL parameter or message for it, so this adds
// one thin bar above the viewer with one button that does those steps through
// Stone's own page object (`app`): show the patient's other studies in the left
// list, split the screen in two columns, put the opened exam on the left and the
// earlier one (?px_prev=, chosen by the EMR: same exam, the one just before) on the
// right. A click on any study in the left list then replaces the right-hand image.
//
// Until the button is pressed the window is what it always was: the opened exam
// alone. The reading box beside the viewer belongs to the opened order only, so the
// other exams stay out of the way until they are asked for.
//
// Everything is wrapped so that a Stone update that renames something leaves the
// plain viewer working (the bar then does not appear, or the button does nothing).
(function () {
  'use strict';
  var q, uids, opened, prevUid;
  try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
  uids = (q.get('study') || '').split(',').filter(Boolean);
  if (uids.length < 2 || typeof app === 'undefined' || !app.SetViewportLayout || !app.SetViewportSeries) return;
  opened = uids[0];
  prevUid = q.get('px_prev') || '';

  // The EMR and this page share an origin, so the EMR's language choice is readable.
  var lang = 'fr';
  try { lang = window.localStorage.getItem('medconnect_lang') || 'fr'; } catch (e) { lang = 'fr'; }
  var TEXT = {
    fr: {
      withPrev: '⇆ Comparer avec {x}', pick: '⇆ Comparer avec un autre examen', end: '✕ Fin de la comparaison',
      others: '{n} autre(s) examen(s) de ce patient', du: ' du ',
      hint: "Pour changer l'image de droite, cliquez sur un examen dans la liste de gauche.",
      hintPick: "Cliquez sur un examen dans la liste de gauche : il s'affiche à droite."
    },
    ko: {
      withPrev: '⇆ 이전 검사와 비교: {x}', pick: '⇆ 다른 검사와 비교', end: '✕ 비교 끝내기',
      others: '이 환자의 다른 검사 {n}건', du: ' ',
      hint: '오른쪽 영상을 바꾸려면 왼쪽 목록에서 검사를 누르세요.',
      hintPick: '왼쪽 목록에서 검사를 누르면 오른쪽에 나옵니다.'
    },
    en: {
      withPrev: '⇆ Compare with {x}', pick: '⇆ Compare with another exam', end: '✕ End comparison',
      others: '{n} other exam(s) of this patient', du: ' of ',
      hint: 'To change the image on the right, click an exam in the list on the left.',
      hintPick: 'Click an exam in the list on the left: it shows on the right.'
    }
  };
  var t = TEXT[lang] || TEXT.fr;

  var STUDY_UID = '0020,000d', STUDY_DATE = '0008,0020', STUDY_DESCRIPTION = '0008,1030';
  var comparing = false, keptLeftMode = null, keptLeftVisible = null;

  function studyByUid(uid) {
    var list = app.studies || [];
    for (var i = 0; i < list.length; i++) if (list[i].studyInstanceUid === uid) return list[i];
    return null;
  }
  function dateOf(s) { return (s && s.tags && s.tags[STUDY_DATE]) || ''; }
  function nameOf(s) {
    var d = dateOf(s), name = (s.tags && s.tags[STUDY_DESCRIPTION]) || '';
    var day = d.length === 8 ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6) : '';
    return name && day ? name + t.du + day : (name || day || '?');
  }
  // The first series of a study whose images Stone has already read.
  function firstSeries(s) {
    if (!s) return -1;
    for (var i = 0; i < s.series.length; i++) {
      var one = app.series[s.series[i]];
      if (one && one.numberOfFrames > 0) return s.series[i];
    }
    return -1;
  }
  function shownStudy(content) {
    return content && content.series && content.series.tags ? content.series.tags[STUDY_UID] : '';
  }
  // Stone remembers the last layout for the next window; a comparison must not
  // leave every later window split in two with an empty half.
  function setLayout(layout) {
    var kept = null;
    try { kept = window.localStorage.getItem('layout'); } catch (e) { kept = null; }
    app.SetViewportLayout(layout);
    try { if (kept === null) window.localStorage.removeItem('layout'); else window.localStorage.setItem('layout', kept); } catch (e) { /* private mode */ }
  }
  // Stone sizes its canvases on a window resize.
  function refit() {
    window.setTimeout(function () {
      try { window.dispatchEvent(new Event('resize')); app.FitContent(); } catch (e) { /* older Stone */ }
    }, 300);
  }

  function showOthers(on) {
    var list = app.studies || [];
    for (var i = 0; i < list.length; i++) list[i].selected = on || list[i].studyInstanceUid === opened;
    if (on) {
      // The opened exam first, then the others, most recent first.
      app.studies = list.slice().sort(function (a, b) {
        if (a.studyInstanceUid === opened) return -1;
        if (b.studyInstanceUid === opened) return 1;
        return dateOf(b).localeCompare(dateOf(a));
      });
    }
  }

  function start() {
    comparing = true;
    showOthers(true);
    keptLeftMode = app.leftMode; keptLeftVisible = app.leftVisible;
    app.leftVisible = true; app.leftMode = 'small';      // a narrow list leaves room for two images
    setLayout('2x1');
    if (shownStudy(app.viewport1Content) !== opened) {
      var mine = firstSeries(studyByUid(opened));
      if (mine >= 0) app.SetViewportSeries(1, { seriesIndex: mine });
    }
    var other = firstSeries(studyByUid(prevUid));
    if (other >= 0) app.SetViewportSeries(2, { seriesIndex: other });
    app.activeViewport = 2;                              // a click in the list goes to the right-hand image
    refit(); draw();
  }

  function stop() {
    comparing = false;
    setLayout('1x1');
    showOthers(false);
    if (keptLeftMode !== null) { app.leftMode = keptLeftMode; app.leftVisible = keptLeftVisible; }
    if (shownStudy(app.viewport1Content) !== opened) {
      var mine = firstSeries(studyByUid(opened));
      if (mine >= 0) app.SetViewportSeries(1, { seriesIndex: mine });
    }
    app.activeViewport = 1;
    refit(); draw();
  }

  var style = document.createElement('style');
  style.textContent =
    '#wv{position:absolute;top:30px;left:0;right:0;bottom:0}' +
    '#px-bar{position:absolute;top:0;left:0;right:0;height:30px;background:#16181d;border-bottom:1px solid #333;' +
    'display:flex;align-items:center;gap:10px;padding:0 8px;font:13px sans-serif;color:#aab4c3;box-sizing:border-box;' +
    'z-index:5;white-space:nowrap;overflow:hidden}' +
    '#px-bar button{flex:none;background:#5b21b6;color:#ede9fe;border:1px solid #8b5cf6;border-radius:4px;padding:3px 10px;' +
    'font:700 12px sans-serif;cursor:pointer}' +
    '#px-bar button.px-on{background:#3f3f46;border-color:#71717a;color:#f4f4f5}' +
    '#px-bar span{overflow:hidden;text-overflow:ellipsis}' +
    '@media print{#px-bar{display:none}#wv{top:0}}';
  var bar = document.createElement('div'); bar.id = 'px-bar'; bar.style.display = 'none';
  var button = document.createElement('button'); button.type = 'button';
  var note = document.createElement('span');
  bar.appendChild(button); bar.appendChild(note);
  button.addEventListener('click', function () {
    try { if (comparing) stop(); else start(); } catch (e) { if (window.console) console.error('compare', e); }
  });

  // Texts go in as text, never as HTML: a study description comes from the device.
  function draw() {
    var list = app.studies || [], n = 0;
    for (var i = 0; i < list.length; i++) if (list[i].studyInstanceUid !== opened) n++;
    if (!studyByUid(opened) || n === 0) { bar.style.display = 'none'; style.disabled = true; return; }
    var wasHidden = bar.style.display === 'none';
    bar.style.display = ''; style.disabled = false;
    var prev = studyByUid(prevUid);
    if (comparing) {
      button.textContent = t.end; button.className = 'px-on';
      note.textContent = shownStudy(app.viewport2Content) ? t.hint : t.hintPick;
    } else {
      button.textContent = prev ? t.withPrev.replace('{x}', nameOf(prev)) : t.pick; button.className = '';
      note.textContent = t.others.replace('{n}', n);
    }
    if (wasHidden) refit();
  }

  document.head.appendChild(style); style.disabled = true;
  document.body.appendChild(bar);
  // Stone rebuilds its study list each time a study finishes loading.
  window.addEventListener('ResourcesLoaded', function () {
    try { if (comparing) showOthers(true); draw(); } catch (e) { /* leave the plain viewer */ }
  });
  window.addEventListener('MetadataLoaded', function () { try { draw(); } catch (e) { /* same */ } });
  // A click in Stone's list may have filled the right-hand image: say the right thing.
  document.addEventListener('click', function () {
    if (comparing) window.setTimeout(function () { try { draw(); } catch (e) { /* same */ } }, 200);
  }, true);
  try { if (app.ready) draw(); } catch (e) { /* same */ }
})();
