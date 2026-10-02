import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { ImagingImagesLayout, IMAGING_IMAGES_NAME, PER_PAGE, loadPicture, usePictures, forgetPictures, pictureLabel } from '../documents/imaging-images.jsx';

// Printing an exam's images on paper (director, 2026-10-01). Opened from the imaging
// list (RadiologyReadings.jsx) for one exam: the pictures are shown small in the order
// of the device, the first twelve ticked; the paper is drawn below as it will be
// printed. How many pictures a page (1, 2, 4, 6), the sheet's language (French first: it
// is read in another hospital) and how light the pictures are printed are chosen here.
//
// Printing makes a change-log line (POST /api/pacs/export/printed) and nothing is printed
// unless it answered. It is not issuing (director, 2026-10-02): the paper takes no
// number and no row in the documents history. Printing the same sheets again from this
// window does not log them again; changing anything on the paper does.
//   props.exam       the row of the list (id, visit_id, order_name)
//   props.examDate   the date printed for the exam   props.now  when it is printed
//   props.patientId  props.t  props.onClose()
var FIRST = 12, MAX = 48;      // ticked when the window opens; at most on one paper (the server refuses more)

// Why an exam's images cannot be printed ('' = they can) - the server's rule
// (pacs.export.js examBlock), said before the button is pressed.
export function imagesBlock(r, t) {
  if (!r) return t.px_imErr_NO_IMAGES;
  if (r.order_status === 'cancelled') return t.px_imErr_CANCELLED;
  if (!r.images_received_at || !(r.image_study_uid || r.study_instance_uid)) return t.px_imErr_NO_IMAGES;
  if (r.patient_check !== 'match') return t.px_imErr_IDENTITY;
  return '';
}
function why(t, e) { return (e && e.code && t['px_imErr_' + e.code]) || (e && e.message) || ''; }

// The print window: like documents/shared.jsx printDocument, but it waits until every
// picture is ready to be drawn - forty-eight of them are not after a fixed third of a second.
function printSheets(node, title, blocked) {
  if (!node) return;
  var w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert(blocked); return; }
  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (title || 'Images') + '</title>' +
    '<style>@page{size:A4;margin:14mm} *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box} html,body{margin:0;padding:0;background:#fff}</style>' +
    '</head><body>' + node.outerHTML + '</body></html>');
  w.document.close();
  w.focus();
  var imgs = Array.prototype.slice.call(w.document.images || []);
  Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); }))
    .then(function () { setTimeout(function () { try { w.print(); } catch (e) { /* closed meanwhile */ } }, 150); });
}

// The small pictures are asked for three at a time, in the order of the list: a browser
// keeps six requests open to one server, and the pictures of the paper must not wait
// behind three hundred small ones.
var waiting = [], running = 0;
function next() { while (running < 3 && waiting.length) waiting.shift()(); }
function inTurn(fn) {
  return new Promise(function (ok, no) {
    waiting.push(function () { running++; fn().then(ok, no).then(function () { running--; next(); }); });
    next();
  });
}

// A small picture of the strip.
function Thumb(props) {
  var im = props.image, ss = useState(null), src = ss[0], setSrc = ss[1];
  useEffect(function () {
    var alive = true;
    inTurn(function () { return loadPicture(props.orderItemId, im.id, 200); }).then(function (img) { if (alive) setSrc(img.src); }, function () { if (alive) setSrc('error'); });
    return function () { alive = false; };
  }, [im.id]);
  var on = props.on;
  return (
    <div onClick={props.onTick} title={props.label}
      style={{ flex: 'none', width: 84, cursor: 'pointer', border: '2px solid ' + (on ? 'var(--violet-strong)' : 'var(--border-2)'), borderRadius: 4, background: on ? 'var(--violet-a20)' : 'transparent', padding: 2, boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', height: 60, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {src && src !== 'error' ? <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
          : <span style={{ color: '#bbb', fontSize: 11 }}>{src === 'error' ? '✕' : '…'}</span>}
        <input type="checkbox" readOnly checked={on} style={{ position: 'absolute', left: 2, top: 2, width: 15, height: 15, margin: 0, accentColor: 'var(--violet-strong)', pointerEvents: 'none' }} />
        {im.frames > 1 ? <span style={{ position: 'absolute', right: 2, bottom: 2, background: '#000a', color: '#fff', fontSize: 10, padding: '0 3px', borderRadius: 2 }}>▶ {im.frames}</span> : null}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
        {(im.series == null ? '' : 'S' + im.series + ' · ') + (im.number == null ? '' : im.number)}</div>
    </div>
  );
}

export function ImagesPrint(props) {
  var t = props.t, exam = props.exam;
  var lg = useState('fr'), lang = lg[0], setLang = lg[1];
  var pp = useState(2), per = pp[0], setPer = pp[1];
  var cl = useState(0), clarity = cl[0], setClarity = cl[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var ps = useState(null), patient = ps[0], setPatient = ps[1];
  var is = useState(null), info = is[0], setInfo = is[1];           // GET /pacs/export/exam/:id
  var es = useState(''), refused = es[0], setRefused = es[1];       // why the exam's pictures are not given
  var ks = useState([]), chosen = ks[0], setChosen = ks[1];         // ticked picture ids, in the order ticked
  var ns = useState(null), issued = ns[0], setIssued = ns[1];       // true once the print is in the change log
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var go = useState(0), printNow = go[0], setPrintNow = go[1];
  var sheet = useRef(null);

  useEffect(function () {
    api.get('/admin/clinic').then(setClinic).catch(function () { setClinic({}); });
    api.get('/patients/' + props.patientId).then(setPatient).catch(function () { setPatient(null); });
    api.get('/pacs/export/exam/' + exam.id)
      .then(function (r) { setInfo(r); setChosen((r.images || []).slice(0, FIRST).map(function (x) { return x.id; })); })
      .catch(function (e) { setRefused(why(t, e) || 'Error'); });
    // What was loaded for this window is let go with it.
    return function () { waiting = []; forgetPictures(); };
  }, [exam.id]);
  useEffect(function () {
    if (printNow && sheet.current) printSheets(sheet.current, IMAGING_IMAGES_NAME[lang] || IMAGING_IMAGES_NAME.fr, t.px_imPopup);
  }, [printNow]);

  var all = (info && info.images) || [];
  // On the paper in the order of the device, whatever the order they were ticked in.
  var images = all.filter(function (x) { return chosen.indexOf(x.id) >= 0; });
  var pics = usePictures(exam.id, images, per, clarity, false);
  var loaded = images.filter(function (x) { return pics[x.id] && pics[x.id] !== 'error'; }).length;
  var failed = images.filter(function (x) { return pics[x.id] === 'error'; }).length;

  var who = patient ? { id: patient.id, chart_no: patient.chart_no, last_name: patient.last_name, first_name: patient.first_name, gender: patient.gender, date_of_birth: patient.date_of_birth } : null;
  var ready = !!who && !!clinic && !!info && images.length > 0 && loaded === images.length;
  var values = {
    exam_name: exam.order_name || '', exam_date: props.examDate || '', modality: exam.pacs_modality || '', order_item_id: exam.id,
    per_page: per, clarity: clarity,
    images: images.map(function (x) { return { id: x.id, series: x.series, number: x.number, frames: x.frames, desc: x.desc }; }),
  };

  function change(fn) { return function (x) { if (busy) return; fn(x); setIssued(null); }; }
  var tick = change(function (id) {
    if (chosen.indexOf(id) >= 0) return setChosen(chosen.filter(function (x) { return x !== id; }));
    if (chosen.length >= MAX) return alert(String(t.px_imMax || '').replace('{n}', MAX));
    setChosen(chosen.concat([id]));
  });
  var tickAll = change(function () { setChosen(all.slice(0, MAX).map(function (x) { return x.id; })); });
  var tickNone = change(function () { setChosen([]); });

  async function issueAndPrint() {
    if (!ready || busy) return;
    if (issued) { setPrintNow(printNow + 1); return; }
    setBusy(true);
    try {
      // the change-log line - refused, nothing is printed
      await api.post('/pacs/export/printed', { order_item_id: exam.id, instances: images.map(function (x) { return x.id; }), per_page: per, lang: lang });
      setIssued(true); setPrintNow(printNow + 1);
    } catch (e) {
      alert(t.px_printFail + (why(t, e) || ''));
    }
    setBusy(false);
  }

  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  var pick = function (on) { return Object.assign({}, btn, { padding: '4px 10px', background: on ? 'var(--violet-deep)' : 'var(--chip)', color: on ? 'var(--on-fill-violet)' : 'var(--text-soft)', border: '1px solid ' + (on ? 'var(--violet-ink)' : 'var(--border-2)') }); };
  var small = { fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' };
  var status = refused ? '' : !info ? (t.loading || 'Loading…')
    : !images.length ? t.px_imPickNone
    : failed ? String(t.px_imFailed || '').replace('{n}', failed)
    : loaded < images.length ? String(t.px_imLoading || '').replace('{n}', loaded).replace('{m}', images.length)
    : issued ? t.px_printIssued : t.px_imNote;

  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(920px, 96vw)', height: '94vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--violet-text)', marginRight: 'auto' }}>🖨 {t.px_imTitle}</span>
          <button onClick={props.onClose} style={Object.assign({}, btn, { background: 'var(--btn-neutral-2)', color: 'var(--text)' })}>{t.close || '닫기'} ✕</button>
        </div>
        {/* what the paper looks like: pictures a page, how light, the sheet's language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid var(--border-2)', flexWrap: 'wrap' }}>
          <span style={small}>{t.px_imPerPage}</span>
          {PER_PAGE.map(function (n) { return <button key={n} disabled={busy} onClick={function () { if (n !== per) change(setPer)(n); }} style={pick(per === n)}>{n}</button>; })}
          <span style={Object.assign({ marginLeft: 14 }, small)} title={t.px_imClarityHint}>{t.px_imClarity}</span>
          {[0, 1, 2].map(function (c) { return <button key={c} disabled={busy} title={t.px_imClarityHint} onClick={function () { if (c !== clarity) change(setClarity)(c); }} style={pick(clarity === c)}>{c === 0 ? t.px_imClarity0 : c === 1 ? '+' : '++'}</button>; })}
          <span style={Object.assign({ marginLeft: 14 }, small)}>{t.px_printLang}</span>
          {['fr', 'en', 'ko'].map(function (l) { return <button key={l} disabled={busy} onClick={function () { if (l !== lang) change(setLang)(l); }} style={pick(lang === l)}>{l.toUpperCase()}</button>; })}
        </div>
        {/* the pictures of the exam, small: tick the ones to print */}
        {info ? <div style={{ borderBottom: '1px solid var(--border-2)', padding: '6px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{String(t.px_imChosen || '').replace('{n}', images.length).replace('{m}', all.length)}</span>
            <button disabled={busy} onClick={tickAll} style={pick(false)}>{all.length > MAX ? String(t.px_imFirstN || '').replace('{n}', MAX) : t.px_imAll}</button>
            <button disabled={busy} onClick={tickNone} style={pick(false)}>{t.px_untickAll}</button>
            {info.skipped ? <span style={small}>{String(t.px_imSkipped || '').replace('{n}', info.skipped)}</span> : null}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 178, overflow: 'auto' }}>
            {all.map(function (im) { return <Thumb key={im.id} image={im} orderItemId={exam.id} on={chosen.indexOf(im.id) >= 0} label={pictureLabel(im, lang)} onTick={function () { tick(im.id); }} />; })}
            {!all.length ? <span style={small}>{t.px_imErr_NO_IMAGES}</span> : null}
          </div>
        </div> : null}
        {/* the paper: white whatever the screen's theme, at the printed width (A4 less the margins) */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-deep)', padding: 16 }}>
          {refused ? <div style={{ padding: 30, color: 'var(--danger-text-2)', fontSize: 14, fontWeight: 700 }}>⚠ {refused}</div>
            : !who || !clinic || !info ? <div style={{ padding: 30, color: 'var(--text-3)', fontSize: 14 }}>{t.loading || 'Loading…'}</div>
            : <div style={{ width: '182mm', margin: '0 auto' }}>
                {/* in this window only: the pages apart from each other, each a sheet */}
                <style>{'.px-img-page{background:#fff;box-shadow:0 0 0 1px #9993;margin-bottom:14px}'}</style>
                <div ref={sheet}>
                  <ImagingImagesLayout values={values} patient={who} clinic={clinic} lang={lang} docNo="" dateStr={props.now} pictures={pics} />
                </div>
              </div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ flex: 1, fontSize: 12, color: failed ? 'var(--danger-text-2)' : 'var(--text-2)', lineHeight: 1.4 }}>{status}</span>
          <button onClick={issueAndPrint} disabled={!ready || busy} style={Object.assign({}, btn, { background: ready && !busy ? 'var(--violet-deep)' : 'var(--chip)', color: ready && !busy ? 'var(--on-fill-violet)' : 'var(--text-3)', border: '1px solid ' + (ready && !busy ? 'var(--violet-ink)' : 'var(--border-2)') })}>
            🖨 {issued ? t.px_printAgain : t.px_printGo}</button>
        </div>
      </div>
    </div>
  );
}
