import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';

function ymd(d) { return d ? String(d).split('T')[0] : ''; }

// Date × test-item matrix of a patient's lab results (read-only).
export function LabResults(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];

  useEffect(function () {
    if (!props.patientId) { setRows([]); return; }
    setLoading(true);
    api.get('/lab/patient/' + props.patientId + '/results')
      .then(function (r) { setRows(r || []); }).catch(function () { setRows([]); })
      .then(function () { setLoading(false); });
  }, [props.patientId]);

  var bd = '#232838', tx = '#e2e8f0', t2 = '#94a3b8', t3 = '#64748b';

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noLabResults || 'No lab results'}</div>;

  // distinct dates (desc)
  var dates = [];
  rows.forEach(function (r) { var d = ymd(r.result_date); if (d && dates.indexOf(d) < 0) dates.push(d); });
  dates.sort().reverse();

  // group by panel, then item (by name) preserving order
  var panels = [];
  var pmap = {};
  rows.forEach(function (r) {
    var pk = r.panel_name || r.panel_code || '—';
    if (!pmap[pk]) { pmap[pk] = { name: pk, items: [], imap: {} }; panels.push(pmap[pk]); }
    var P = pmap[pk];
    if (!P.imap[r.name]) {
      P.imap[r.name] = { name: r.name, unit: r.unit, ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, byDate: {} };
      P.items.push(P.imap[r.name]);
    }
    P.imap[r.name].byDate[ymd(r.result_date)] = r;
  });

  function refText(it) {
    if (it.ref_text) return it.ref_text;
    if (it.ref_low != null && it.ref_high != null) return it.ref_low + '~' + it.ref_high;
    if (it.ref_low != null) return '≥' + it.ref_low;
    if (it.ref_high != null) return '≤' + it.ref_high;
    return '';
  }
  function cell(r) {
    if (!r) return <span style={{ color: t3 }}>·</span>;
    var color = r.flag === 'low' ? '#60a5fa' : r.flag === 'high' ? '#f87171' : tx;
    var mark = r.flag === 'low' ? '▼' : r.flag === 'high' ? '▲' : '';
    return <span style={{ color: color, fontWeight: r.flag === 'low' || r.flag === 'high' ? 800 : 500 }}>{mark}{r.value}</span>;
  }

  var th = { padding: '6px 8px', textAlign: 'left', color: t2, fontSize: 12, borderBottom: '1px solid ' + bd, position: 'sticky', top: 0, background: '#161a26', whiteSpace: 'nowrap' };
  var td = { padding: '5px 8px', fontSize: 13, borderBottom: '1px solid #1e2433', whiteSpace: 'nowrap' };

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'system-ui,sans-serif' }}>
        <thead>
          <tr>
            <th style={Object.assign({}, th, { left: 0, zIndex: 2 })}>{t.testName || '검사명'}</th>
            <th style={th}>{t.unit || '단위'}</th>
            <th style={th}>{t.refRange || '참고치'}</th>
            {dates.map(function (d) { return <th key={d} style={Object.assign({}, th, { textAlign: 'right' })}>{d}</th>; })}
          </tr>
        </thead>
        <tbody>
          {panels.map(function (P) {
            return [
              <tr key={'p-' + P.name}><td colSpan={3 + dates.length} style={{ padding: '5px 8px', background: '#0f1622', color: '#7dd3fc', fontWeight: 800, fontSize: 12, borderBottom: '1px solid ' + bd }}>{P.name}</td></tr>
            ].concat(P.items.map(function (it) {
              return <tr key={P.name + '-' + it.name}>
                <td style={Object.assign({}, td, { left: 0, background: '#11141c', fontWeight: 600, color: tx })}>{it.name}</td>
                <td style={Object.assign({}, td, { color: t2 })}>{it.unit || ''}</td>
                <td style={Object.assign({}, td, { color: t3 })}>{refText(it)}</td>
                {dates.map(function (d) { return <td key={d} style={Object.assign({}, td, { textAlign: 'right', fontFamily: 'monospace' })}>{cell(it.byDate[d])}</td>; })}
              </tr>;
            }));
          })}
        </tbody>
      </table>
    </div>
  );
}
