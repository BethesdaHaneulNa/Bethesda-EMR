import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';

// A timestamp (result_at, cancelled_at) reaches the browser in UTC, so cutting
// at 'T' dated a reading written between local midnight and 03:00 the day
// before (P-22). Read it back as the clinic's local date; a plain DATE
// ("YYYY-MM-DD", visit_date) is already a date and is kept. Same rule as
// LabResults.jsx.
function ymd(d) {
  if (!d) return '';
  var s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var x = new Date(s);
  return isNaN(x.getTime()) ? s.split('T')[0] : x.toLocaleDateString('en-CA');
}

// What the images say about the patient, next to the order it was taken for.
// Only the worklist bridge fills this in (POST /api/pacs/study-arrived); a
// mismatch means the patient was typed or edited on the device, so the study
// may belong to someone else. It cannot show a wrong pick from the worklist --
// those images carry the picked patient's own details.
//
// Shared with the viewer window in Consultation.jsx, so it takes the shape
// GET /api/pacs/viewer-url returns as `images`: { patient_check, patient_id,
// patient_name } (null before anything arrived). A row of this list is turned
// into that shape by imagesOfRow. `style` overrides the outer box (margins).
export function imagesOfRow(r) {
  if (!r || !r.images_received_at) return null;
  return { patient_check: r.patient_check || '', patient_id: r.image_patient_id || '', patient_name: r.image_patient_name || '' };
}

export function PatientCheck(props) {
  var im = props.images, t = props.t;
  if (!im || (im.patient_check !== 'mismatch' && im.patient_check !== 'missing')) return null;
  var mismatch = im.patient_check === 'mismatch';
  var text = mismatch
    ? String(t.px_patientMismatch || '').replace('{id}', im.patient_id || '').replace('{name}', String(im.patient_name || '').replace(/\^/g, ' ').trim())
    : (t.px_patientMissing || '');
  return <div style={Object.assign({ margin: '4px 0 6px', padding: '6px 9px', borderRadius: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.5,
    background: mismatch ? 'var(--danger-chip)' : 'var(--warn-chip)', color: mismatch ? 'var(--danger-text-2)' : 'var(--warn-text-2)',
    border: '1px solid ' + (mismatch ? 'var(--danger-deep)' : 'var(--warn-strong)') }, props.style)}>⚠ {text}</div>;
}

// Read-only list of a patient's imaging orders + radiology readings.
export function RadiologyReadings(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];

  useEffect(function () {
    if (!props.patientId) { setRows([]); return; }
    setLoading(true);
    api.get('/pacs/readings/patient/' + props.patientId)
      .then(function (r) { setRows(r || []); }).catch(function () { setRows([]); })
      .then(function () { setLoading(false); });
  }, [props.patientId]);

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', cyan = 'var(--violet-text)';

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noImagingOrders || '영상검사 내역이 없습니다'}</div>;

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: 12 }}>
      {rows.map(function (r) {
        // A cancelled order (decision 3-B) stays in the list: its images and
        // reading are part of the record, including why it was cancelled. It is
        // told apart by grey text, the struck-out name, the "Annulé" tag and a
        // dashed border - not by opacity, which dimmed every line of it below
        // the contrast floor (design 3.3.1; 2.5-3.0 light, 2.9-4.4 dark).
        var cancelled = r.order_status === 'cancelled';
        return <div key={r.id} style={{ background: 'var(--panel-2)', border: '1px ' + (cancelled ? 'dashed' : 'solid') + ' ' + bd, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', color: cancelled ? t3 : 'var(--ok-text)', fontSize: 13, fontWeight: 700 }}>{ymd(r.visit_date)}</span>
            <span style={{ background: cancelled ? 'var(--btn-neutral-2)' : 'var(--accent-chip)', color: cancelled ? 'var(--text-soft-2)' : 'var(--accent-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{r.pacs_modality || ''}</span>
            <span style={{ color: cancelled ? t3 : tx, fontSize: 15, fontWeight: 700, textDecoration: cancelled ? 'line-through' : 'none' }}>{r.order_name}</span>
            {cancelled ? <span title={r.cancel_reason || ''} style={{ background: 'var(--btn-neutral-2)', color: 'var(--text-soft-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{t.px_orderCancelled}</span> : null}
            {r.images_received_at
              ? <span style={{ color: cancelled ? t3 : 'var(--ok-text)', fontSize: 12, fontWeight: 700 }}>{String(t.px_imagesArrived || '').replace('{n}', r.image_count == null ? '?' : r.image_count)}</span>
              : (r.study_instance_uid && !cancelled ? <span style={{ color: t3, fontSize: 12 }}>{t.px_imagesWaiting}</span> : null)}
            {r.study_instance_uid && props.onOpen ? <button onClick={function () { props.onOpen(r.id); }} title={t.viewImage || '영상보기'} style={{ marginLeft: 'auto', background: 'var(--violet-strong-a22)', color: cyan, border: '1px solid var(--violet-strong-a55)', borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖼 {t.viewImage || '영상보기'}</button> : null}
          </div>
          {cancelled && (r.cancel_reason || r.cancelled_at)
            ? <div style={{ fontSize: 12, color: t2, margin: '2px 0 6px' }}>{t.px_orderCancelled}{r.cancelled_at ? ' · ' + ymd(r.cancelled_at) : ''}{r.cancel_reason ? ' — ' + (t.px_cancelReason || '') + ' : ' + r.cancel_reason : ''}</div>
            : null}
          <PatientCheck images={imagesOfRow(r)} t={t} />
          {r.image_study_uid && r.image_study_uid !== r.study_instance_uid
            ? <div style={{ fontSize: 12, color: 'var(--warn-text)', margin: '0 0 6px' }}>{t.px_linkedByAccession}</div>
            : null}
          <div style={{ fontSize: 14, color: r.result_text ? tx : t3, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 6, padding: '8px 10px', minHeight: 24 }}>
            {r.result_text || (t.noReading || '판독 소견 없음')}
          </div>
          {r.result_at ? <div style={{ fontSize: 12, color: t3, marginTop: 4 }}>{t.lastReadBy || '판독'}: {r.result_by_name || ''} · {ymd(r.result_at)}</div> : null}
        </div>;
      })}
    </div>
  );
}
