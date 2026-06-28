import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';

function ymd(d) { return d ? String(d).split('T')[0] : ''; }

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

  var bd = '#232838', tx = '#e2e8f0', t2 = '#94a3b8', t3 = '#64748b', cyan = '#a78bfa';

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noImagingOrders || '영상검사 내역이 없습니다'}</div>;

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: 12 }}>
      {rows.map(function (r) {
        return <div key={r.id} style={{ background: '#161a26', border: '1px solid ' + bd, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', color: '#34d399', fontSize: 13, fontWeight: 700 }}>{ymd(r.visit_date)}</span>
            <span style={{ background: '#1e3a5f', color: '#93c5fd', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{r.pacs_modality || ''}</span>
            <span style={{ color: tx, fontSize: 15, fontWeight: 700 }}>{r.order_name}</span>
            {r.study_instance_uid && props.onOpen ? <button onClick={function () { props.onOpen(r.id); }} title={t.viewImage || '영상보기'} style={{ marginLeft: 'auto', background: '#7c3aed22', color: cyan, border: '1px solid #7c3aed55', borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖼 {t.viewImage || '영상보기'}</button> : null}
          </div>
          <div style={{ fontSize: 14, color: r.result_text ? tx : t3, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: '#0f1117', border: '1px solid ' + bd, borderRadius: 6, padding: '8px 10px', minHeight: 24 }}>
            {r.result_text || (t.noReading || '판독 소견 없음')}
          </div>
          {r.result_at ? <div style={{ fontSize: 12, color: t3, marginTop: 4 }}>{t.lastReadBy || '판독'}: {r.result_by_name || ''} · {ymd(r.result_at)}</div> : null}
        </div>;
      })}
    </div>
  );
}
