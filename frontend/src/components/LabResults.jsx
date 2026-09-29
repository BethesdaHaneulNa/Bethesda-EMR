import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';

// A DATE column reaches the browser as the clinic's local midnight written in
// UTC ("2026-09-28T21:00:00.000Z" for the 29th at UTC+3), so cutting at 'T'
// showed every visit and result one day early. Read it back as a local date;
// a plain "YYYY-MM-DD" is already a date and is kept as it is.
function ymd(d) {
  if (!d) return '';
  var s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var x = new Date(s);
  return isNaN(x.getTime()) ? s.split('T')[0] : x.toLocaleDateString('en-CA');
}

// Date × test-item matrix of a patient's lab results (read-only).
export function LabResults(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];

  useEffect(function () {
    if (!props.patientId) { setRows([]); setLoading(false); return; }
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

  // A test done twice on one day (a repeat) used to show only the later result:
  // a cell was one date. Now each order of a panel on a date gets a slot --
  // first of the day, second, ... by entry time -- and a date with repeats has
  // one column per slot, each value with its entry time (decision 8,
  // 2026-09-29). Different panels share slot 1, so an ordinary day stays one column.
  function pk(r) { return r.panel_name || r.panel_code || '—'; }
  var firstAt = {};   // order_item_id -> earliest result_at
  rows.forEach(function (r) {
    var at = r.result_at ? new Date(r.result_at).getTime() : 0;
    if (firstAt[r.order_item_id] === undefined || at < firstAt[r.order_item_id]) firstAt[r.order_item_id] = at;
  });
  var perDayPanel = {};   // date|panel -> [order_item_id...]
  rows.forEach(function (r) {
    var k = ymd(r.result_date) + '|' + pk(r);
    if (!perDayPanel[k]) perDayPanel[k] = [];
    if (perDayPanel[k].indexOf(r.order_item_id) < 0) perDayPanel[k].push(r.order_item_id);
  });
  var slotOf = {}, slots = {};   // order_item_id -> slot index; date -> number of slots
  Object.keys(perDayPanel).forEach(function (k) {
    var d = k.split('|')[0];
    perDayPanel[k].sort(function (a, b) { return firstAt[a] - firstAt[b] || a - b; });
    perDayPanel[k].forEach(function (id, i) { slotOf[id] = i; });
    slots[d] = Math.max(slots[d] || 1, perDayPanel[k].length);
  });
  var cols = [];   // [{d, s, multi}]
  dates.forEach(function (d) { for (var i = 0; i < (slots[d] || 1); i++) cols.push({ d: d, s: i, multi: (slots[d] || 1) > 1 }); });

  // group by panel, then item (by name) preserving order
  var panels = [];
  var pmap = {};
  rows.forEach(function (r) {
    var pname = pk(r);
    if (!pmap[pname]) { pmap[pname] = { name: pname, items: [], imap: {} }; panels.push(pmap[pname]); }
    var P = pmap[pname];
    if (!P.imap[r.name]) {
      P.imap[r.name] = { name: r.name, unit: r.unit, ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, byCol: {} };
      P.items.push(P.imap[r.name]);
    }
    P.imap[r.name].byCol[ymd(r.result_date) + '#' + (slotOf[r.order_item_id] || 0)] = r;
  });
  function hhmm(v) { if (!v) return ''; var x = new Date(v); return isNaN(x.getTime()) ? '' : x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }

  function refText(it) {
    if (it.ref_text) return it.ref_text;
    if (it.ref_low != null && it.ref_high != null) return it.ref_low + '~' + it.ref_high;
    if (it.ref_low != null) return '≥' + it.ref_low;
    if (it.ref_high != null) return '≤' + it.ref_high;
    return '';
  }
  function cell(r, multi) {
    if (!r) return <span style={{ color: t3 }}>·</span>;
    // 'abnormal' is a text result that differs from its reference text (e.g. a
    // positive malaria test): red like high, marked "!" since it is not "above".
    var odd = r.flag === 'low' || r.flag === 'high' || r.flag === 'abnormal';
    var color = r.flag === 'low' ? '#60a5fa' : odd ? '#f87171' : tx;
    var mark = r.flag === 'low' ? '▼' : r.flag === 'high' ? '▲' : r.flag === 'abnormal' ? '! ' : '';
    var v = <span style={{ color: color, fontWeight: odd ? 800 : 500 }}>{mark}{r.value}</span>;
    if (!multi) return v;
    return <span>{v}<span style={{ display: 'block', color: t3, fontSize: 10 }}>{hhmm(r.result_at)}</span></span>;
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
            {cols.map(function (c) { return <th key={c.d + '#' + c.s} style={Object.assign({}, th, { textAlign: 'right' })}>{c.d}{c.multi ? ' (' + (c.s + 1) + ')' : ''}</th>; })}
          </tr>
        </thead>
        <tbody>
          {panels.map(function (P) {
            return [
              <tr key={'p-' + P.name}><td colSpan={3 + cols.length} style={{ padding: '5px 8px', background: '#0f1622', color: '#7dd3fc', fontWeight: 800, fontSize: 12, borderBottom: '1px solid ' + bd }}><span style={{ position: 'sticky', left: 8 }}>{P.name}</span></td></tr>
            ].concat(P.items.map(function (it) {
              return <tr key={P.name + '-' + it.name}>
                <td style={Object.assign({}, td, { position: 'sticky', left: 0, zIndex: 1, background: '#11141c', fontWeight: 600, color: tx })}>{it.name}</td>
                <td style={Object.assign({}, td, { color: t2 })}>{it.unit || ''}</td>
                <td style={Object.assign({}, td, { color: t3 })}>{refText(it)}</td>
                {cols.map(function (c) { return <td key={c.d + '#' + c.s} style={Object.assign({}, td, { textAlign: 'right', fontFamily: 'monospace' })}>{cell(it.byCol[c.d + '#' + c.s], c.multi)}</td>; })}
              </tr>;
            }));
          })}
        </tbody>
      </table>
    </div>
  );
}
