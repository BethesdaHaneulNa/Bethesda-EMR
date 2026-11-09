// /m 「📷 Imagerie」 (1.7.11, clinic manager on site): read-only. Today's imaging orders of
// every visit, oldest first (GET /api/visits/today/imaging-list): patient, exam, device type
// and body part, memo, and where it stands - worklist not sent / sent to the device /
// images arrived. One tap shows the order's details; nothing else. Any signed-in staff.
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { fill, hhmm, vitalsError } from '../../vitals.js';
import { FS, col, bigBtn, rowBtn, listBox, nameText, subText, nameOf, ListHead, ErrorBox, Empty, Tag, orderStatus, everyHalfMinute } from './ui.jsx';

// Where the exam stands, from the order and its latest worklist entry. Images arrived:
// the worklist entry says so (pacs.routes.js sets images_received_at and status
// 'completed'). order_item.worklist_status alone is not enough: an order whose code does
// not use the worklist is stored 'completed' from the start (consult.routes.js POST
// /:id/orders) - seen on the test stack, it read "images received" with no image.
function stage(t, o) {
  if (o.status === 'cancelled' || o.worklist_status === 'cancelled') return { word: t.mo_s_cancelled, c: 'danger' };
  if (o.images_received_at || o.worklist_log_status === 'completed') {
    return { word: o.image_count ? fill(t.mo_imgArrivedN, { n: o.image_count }) : t.mo_imgArrived, c: 'ok' };
  }
  var sent = o.worklist_sent_at || o.worklist_log_sent_at;
  if (sent || o.worklist_status === 'sent' || o.worklist_status === 'in_progress') return { word: fill(t.mo_imgSent, { time: hhmm(sent) }), c: 'warn' };
  if (o.worklist_status === 'completed') return { word: t.mo_imgNoWorklist, c: 'accent' };
  return { word: t.mo_imgNotSent, c: 'accent' };
}
function devicePart(o) { return [o.modality, o.body_part].filter(Boolean).join(' · '); }

export function ImagingScreen(props) {
  var t = props.t;
  var ls = useState(null), list = ls[0], setList = ls[1];
  var es = useState(''), error = es[0], setError = es[1];
  var ss = useState(null), selId = ss[0], setSelId = ss[1];

  function loadList() {
    return api.get('/visits/today/imaging-list').then(function (rows) {
      setList(Array.isArray(rows) ? rows : []); setError('');
    }).catch(function (err) { setError(vitalsError(t, err)); setList(function (p) { return p || []; }); });
  }
  useEffect(function () { return everyHalfMinute(loadList); }, []);

  var sel = selId != null && list ? list.filter(function (o) { return o.order_item_id === selId; })[0] || null : null;

  if (sel) {
    var sg = stage(t, sel), st = orderStatus(t, sel.status);
    var rows = [
      [t.mo_patient, nameOf(sel) + ' · ' + (sel.chart_no || '')],
      [t.mo_exam, sel.order_name + (sel.order_code ? ' (' + sel.order_code + ')' : '')],
      [t.mo_modality, sel.modality || '—'],
      [t.mo_bodyPart, sel.body_part || '—'],
      [t.mo_orderedAt, hhmm(sel.created_at) || '—'],
      [t.mo_status, st.word],
      [t.mo_worklist, sg.word],
      [t.mo_memo, sel.memo || '—'],
    ];
    return (
      <div style={col}>
        <ListHead t={t} title={'📷 ' + sel.order_name} onBack={function () { setSelId(null); }} />
        <div style={listBox}>
          {rows.map(function (r) {
            return <div key={r[0]} style={{ padding: '12px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-3)' }}>{r[0]}</div>
              <div style={{ fontSize: 20, color: 'var(--text-strong)', overflowWrap: 'anywhere', whiteSpace: 'pre-line', marginTop: 2 }}>{r[1]}</div>
            </div>;
          })}
        </div>
        <button type="button" onClick={function () { setSelId(null); }} style={Object.assign({}, bigBtn, { width: '100%', marginTop: 14, background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' })}>{t.m_back}</button>
      </div>
    );
  }

  return (
    <div style={col}>
      <ListHead t={t} title={'📷 ' + t.mo_imaging} onBack={props.onHome} backLabel={t.mo_home} onRefresh={loadList} />
      <ErrorBox text={error} />
      {list === null ? <Empty text={t.loading} /> : list.length === 0 ? <Empty text={t.mo_emptyImaging} /> :
        <div style={listBox}>
          {list.map(function (o) {
            var sg = stage(t, o);
            return <button key={o.order_item_id} type="button" onClick={function () { setSelId(o.order_item_id); }} style={Object.assign({}, rowBtn, { alignItems: 'flex-start' })}>
              <span style={{ width: 56, flexShrink: 0, fontSize: FS, fontWeight: 800, color: 'var(--text-2)', paddingTop: 2 }}>{hhmm(o.created_at)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nameText}>{o.order_name}</span>
                <span style={subText}>{nameOf(o)} · <span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{o.chart_no}</span></span>
                {devicePart(o) ? <span style={subText}>{devicePart(o)}</span> : null}
                {o.memo ? <span style={Object.assign({}, subText, { color: 'var(--text)' })}>📝 {o.memo}</span> : null}
                <span style={{ display: 'block', marginTop: 6 }}><Tag c={sg.c}>{sg.word}</Tag></span>
              </span>
            </button>;
          })}
        </div>}
      <div style={{ marginTop: 8, fontSize: FS, color: 'var(--text-3)' }}>{t.mo_readOnly}</div>
    </div>
  );
}
