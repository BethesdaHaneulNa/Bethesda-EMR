import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// "The images are under the wrong order": the technician picked another line of the same
// patient on the device. This window puts them under the right order - on the image
// server itself (the study number, accession and names inside the images) and in the
// EMR (director, 2026-10-01; server: backend/src/routes/pacs.move.js). Doctors and
// administrators; the reading goes with the images. A reason may be typed and need not
// be - the correction is written in the change log either way.
//   - the other order has no images -> the images move there, and the order they left
//     goes back on the device's list;
//   - the other order has images too -> the two orders exchange images and readings.
// Only orders of the same patient and of the same device type are offered: a device
// lists only the orders of its own type, so nothing else can have been mixed up on it.
//   props.exam        the row of the imaging list whose images are wrong
//   props.t           translations
//   props.onLook(id)  opens the image window on that order (to see what was really done)
//   props.onClose()   props.onDone()  after a correction: read the list again

function ymd(d) {
  if (!d) return '';
  var s = String(d);
  return s.indexOf('T') === 10 ? new Date(s).toLocaleDateString('en-CA') : s.slice(0, 10);
}
function fill(text, values) {
  return String(text || '').replace(/\{(\w+)\}/g, function (m, k) { return values[k] === undefined || values[k] === null ? '' : values[k]; });
}

// The server's `code` in the screen's words; its English sentence when the code is new.
export function moveWhy(t, code, fallback) {
  return (code && t['px_mvErr_' + code]) || fallback || code || '';
}

// One line of the history of an order: who put which images where, and why.
export function moveLine(t, m) {
  var open = m.state !== 'done' && m.state !== 'rolled-back' && m.state !== 'failed';
  var text = fill(m.kind === 'swap' ? t.px_mvLogSwap : t.px_mvLogMove,
    { who: m.staff_name || '', n: m.image_count == null ? '?' : m.image_count, m: m.other_image_count == null ? '?' : m.other_image_count, a: m.from_order_name || '', b: m.to_order_name || '' });
  // The reason only when one was typed.
  var why = String(m.reason || '').trim();
  return ymd(m.created_at) + ' — ' + text + (why ? ' — ' + fill(t.px_mvLogWhy, { why: why }) : '') + (open ? ' — ' + t.px_mvLogPending : '');
}

export function MoveStudy(props) {
  var t = props.t, exam = props.exam;
  var ds = useState(null), data = ds[0], setData = ds[1];          // GET /pacs/move-targets
  var es = useState(''), loadErr = es[0], setLoadErr = es[1];
  var ts = useState(null), target = ts[0], setTarget = ts[1];      // the chosen order
  var rs = useState(''), reason = rs[0], setReason = rs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var os = useState(null), outcome = os[0], setOutcome = os[1];    // { ok, text }
  var ws = useState(false), waiting = ws[0], setWaiting = ws[1];   // the request was cut; the server is still at it

  useEffect(function () {
    api.get('/pacs/move-targets?order_item_id=' + exam.id)
      .then(function (r) { setData(r); })
      .catch(function (e) { setLoadErr(moveWhy(t, e && e.code, (e && e.message) || '')); });
  }, [exam.id]);

  var src = data && data.source;
  var chosen = data && target ? data.targets.filter(function (x) { return x.order_item_id === target; })[0] : null;
  var ready = !!chosen && chosen.can && !busy && !outcome;

  // The patient's corrections, most recent first (GET /pacs/moves/patient); null when they cannot be read.
  function corrections() {
    if (!props.patientId) return Promise.resolve(null);
    return api.get('/pacs/moves/patient/' + props.patientId).then(function (r) { return r || []; }).catch(function () { return null; });
  }
  // A request that was cut (a study of many large images takes minutes; the web server in
  // front, or the network, gives up first) has usually gone through: the server finishes a
  // correction whether or not anyone is still listening. So the correction's own line is
  // looked up - the one newer than `before`, for these two orders - and asked again every
  // 4 s until it says how it ended (10 minutes at most). null: no such line, or no answer.
  async function afterCut(before, to) {
    for (var i = 0; i < 150; i++) {
      await new Promise(function (r) { setTimeout(r, 4000); });
      var list = await corrections();
      var line = list ? list.filter(function (m) { return m.id > before && m.from_order_item_id === exam.id && m.to_order_item_id === to; })[0] : null;
      if (!line) { if (i >= 4) return null; continue; }          // 20 s and no line: the request never arrived
      if (line.state === 'done') return { ok: true, text: t.px_mvDone };
      if (line.state === 'cleanup-pending') return { ok: true, text: t.px_mvDoneLater };
      if (line.state === 'rolled-back') return { ok: false, text: moveWhy(t, 'NOT_CORRECTED', '') };
      if (line.state === 'failed') return { ok: false, text: t.px_mvCheckList };
      setWaiting(true);                                           // started, emr-done, undo-pending: still at it
    }
    return null;
  }

  async function go() {
    if (!ready) return;
    setBusy(true); setWaiting(false);
    var to = chosen.order_item_id;
    var had = await corrections();
    var before = had ? had.reduce(function (n, m) { return Math.max(n, m.id); }, 0) : null;
    try {
      var r = await api.post('/pacs/move', { from_order_item_id: exam.id, to_order_item_id: to, reason: reason.trim() });
      setOutcome({ ok: true, text: r.state === 'done' ? t.px_mvDone : t.px_mvDoneLater });
      if (props.onDone) props.onDone();
    } catch (e) {
      // A refusal carries the server's code. Anything else is a request that was cut: it
      // may still have gone through - ask how the correction ended before saying it failed.
      var found = (!e || !e.code) && before !== null ? await afterCut(before, to) : null;
      setOutcome(found || { ok: false, text: moveWhy(t, e && e.code, (e && e.message) || '') + (e && e.code ? '' : ' ' + t.px_mvCheckList) });
      if (props.onDone) props.onDone();
    }
    setBusy(false); setWaiting(false);
  }

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)';
  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  var COLS = '22px 86px 40px minmax(110px, 1fr) 78px minmax(120px, 190px)';
  var cell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  var box = { background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 6, padding: '8px 12px' };

  return (
    <div onClick={busy ? undefined : props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(820px, 96vw)', maxHeight: '94vh', background: 'var(--bg-col)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--violet-text)' }}>⇄ {t.px_mvTitle}</span>
          <button onClick={props.onClose} disabled={busy} style={Object.assign({}, btn, { marginLeft: 'auto', background: 'var(--btn-neutral-2)', color: tx })}>{t.close || '닫기'} ✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, color: tx, fontSize: 13 }}>
          <div style={{ color: t2, lineHeight: 1.5 }}>{t.px_mvIntro}</div>
          {/* 1. the images in question - look at them first */}
          <div style={Object.assign({ display: 'flex', alignItems: 'center', gap: 10 }, box)}>
            <span style={{ color: t3 }}>{t.px_mvFrom}</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{exam.order_name}</span>
            <span style={{ fontFamily: 'monospace', color: t2 }}>{ymd(exam.visit_date)}</span>
            <span style={{ color: 'var(--ok-text)', fontWeight: 700 }}>{fill(t.px_imgShort, { n: exam.image_count == null ? '?' : exam.image_count })}</span>
            {props.onLook ? <button onClick={function () { props.onLook(exam.id); }} title={t.px_mvLook}
              style={Object.assign({}, btn, { marginLeft: 'auto', padding: '4px 10px', background: 'var(--violet-strong-a22)', color: 'var(--violet-text)', border: '1px solid var(--violet-strong-a55)' })}>🖼 {t.viewImage || '영상보기'}</button> : null}
          </div>
          {loadErr ? <div style={{ color: 'var(--danger-text-2)' }}>{loadErr}</div> : null}
          {!data && !loadErr ? <div style={{ color: t3 }}>{t.loading || 'Loading…'}</div> : null}
          {src && !src.can ? <div style={{ color: 'var(--warn-text)', fontWeight: 700 }}>{moveWhy(t, src.code, src.error)}</div> : null}
          {src && src.issued_reports && src.issued_reports.length ? <div style={{ color: 'var(--warn-text)', lineHeight: 1.5 }}>
            ⚠ {fill(t.px_mvIssued, { x: src.issued_reports.map(function (d) { return d.doc_no + ' (' + ymd(d.issued_at) + ')'; }).join(', ') })}</div> : null}
          {/* 2. the order they belong to */}
          {src && src.can ? <>
            <div style={{ fontWeight: 700 }}>{t.px_mvPick}</div>
            <div style={{ border: '1px solid ' + bd, borderRadius: 6, overflow: 'auto', maxHeight: '34vh', background: 'var(--bg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '5px 10px', position: 'sticky', top: 0, background: 'var(--panel-head)', borderBottom: '1px solid ' + bd, color: t3, fontSize: 12, fontWeight: 700 }}>
                <span></span><span>{t.px_colDate}</span><span>{t.px_colType}</span><span>{t.px_colExam}</span><span>{t.px_colImages}</span><span></span>
              </div>
              {!data.targets.length ? <div style={{ padding: 12, color: t3 }}>{t.px_mvNone}</div> : null}
              {data.targets.map(function (x) {
                var on = target === x.order_item_id;
                return <label key={x.order_item_id} data-target={x.order_item_id}
                  style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '0 10px', minHeight: 28, cursor: x.can && !outcome ? 'pointer' : 'not-allowed',
                    borderBottom: '1px solid ' + bd, background: on ? 'var(--violet-a20)' : 'transparent' }}>
                  <input type="radio" name="px-move-target" checked={on} disabled={!x.can || busy || !!outcome} onChange={function () { setTarget(x.order_item_id); }}
                    style={{ width: 15, height: 15, margin: 0, accentColor: 'var(--violet-strong)' }} />
                  <span style={Object.assign({ fontFamily: 'monospace', fontWeight: 700, color: x.can ? 'var(--ok-text)' : t3 }, cell)}>{ymd(x.visit_date)}</span>
                  <span style={Object.assign({ fontWeight: 700, fontSize: 12, color: x.can ? 'var(--accent-text-2)' : t3 }, cell)}>{x.modality}</span>
                  <span style={Object.assign({ fontWeight: 700, color: x.can ? tx : t3 }, cell)} title={x.order_name}>{x.order_name}</span>
                  <span style={Object.assign({ fontSize: 12, color: x.image_count != null ? (x.can ? 'var(--ok-text)' : t3) : t2 }, cell)}>{x.image_count != null ? fill(t.px_imgShort, { n: x.image_count }) : '—'}</span>
                  <span style={Object.assign({ fontSize: 12, color: x.can ? 'var(--violet-text)' : t2, fontWeight: x.can ? 700 : 400 }, cell)} title={x.can ? '' : moveWhy(t, x.code, x.error)}>
                    {x.can ? (x.kind === 'swap' ? t.px_mvKindSwap : t.px_mvKindMove) : moveWhy(t, x.code, x.error)}</span>
                </label>;
              })}
            </div>
            {/* 3. why - optional */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t.px_mvReason}</span>
              <input value={reason} disabled={busy || !!outcome} maxLength={300} onChange={function (e) { setReason(e.target.value); }} placeholder={t.px_mvReasonPh}
                style={{ flex: 1, minWidth: 0, background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '5px 8px', outline: 'none' }} />
            </label>
            {/* 4. what will happen */}
            {chosen && chosen.can ? <div style={Object.assign({ lineHeight: 1.6 }, box)}>
              {chosen.kind === 'swap'
                ? fill(t.px_mvConfirmSwap, { a: exam.order_name, b: chosen.order_name, n: src.image_count, m: chosen.image_count })
                : fill(t.px_mvConfirmMove, { a: exam.order_name, b: chosen.order_name, n: src.image_count })}
              {' '}{chosen.kind === 'swap' ? (src.has_reading || chosen.has_reading ? t.px_mvReadingsSwap : '') : (src.has_reading ? t.px_mvReadingGoes : '')}
              {' '}{chosen.kind === 'swap' ? '' : fill(t.px_mvBackToList, { a: exam.order_name })}
              {' '}{t.px_mvLogged}
            </div> : null}
          </> : null}
          {outcome ? <div style={{ fontWeight: 700, color: outcome.ok ? 'var(--ok-text)' : 'var(--danger-text-2)', lineHeight: 1.5 }}>{outcome.ok ? '✓ ' : '✕ '}{outcome.text}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ flex: 1, fontSize: 12, color: t2 }}>{busy ? (waiting ? t.px_mvStillWorking : t.px_mvBusyNow) : (src && src.can && !outcome && !ready ? t.px_mvNeed : '')}</span>
          {outcome ? <button onClick={props.onClose} style={Object.assign({}, btn, { background: 'var(--violet-deep)', color: 'var(--on-fill-violet)', border: '1px solid var(--violet-ink)' })}>{t.close || '닫기'}</button>
            : <button onClick={go} disabled={!ready} style={Object.assign({}, btn, { background: ready ? 'var(--violet-deep)' : 'var(--chip)', color: ready ? 'var(--on-fill-violet)' : t3, border: '1px solid ' + (ready ? 'var(--violet-ink)' : 'var(--border-2)'), cursor: ready ? 'pointer' : 'not-allowed' })}>
              ⇄ {chosen && chosen.kind === 'swap' ? t.px_mvGoSwap : t.px_mvGoMove}</button>}
        </div>
      </div>
    </div>
  );
}
