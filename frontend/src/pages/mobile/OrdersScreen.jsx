// /m 「📋 Ordres」 (1.7.11, clinic manager on site): read-only. Today's visits that have
// orders (GET /api/visits/today/orders-list) -> tap -> every order the doctor placed on
// the visit: name, type, status, memo. Any signed-in member of staff.
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { fill, hhmm, vitalsError } from '../../vitals.js';
import { FS, col, rowBtn, listBox, nameText, subText, nameOf, timeOf, ListHead, ErrorBox, Empty, Tag, orderStatus, typeWord, everyHalfMinute } from './ui.jsx';

export function OrdersScreen(props) {
  var t = props.t;
  var ls = useState(null), list = ls[0], setList = ls[1];
  var es = useState(''), error = es[0], setError = es[1];
  var vs = useState(null), visitId = vs[0], setVisitId = vs[1];

  function loadList() {
    return api.get('/visits/today/orders-list').then(function (rows) {
      setList(Array.isArray(rows) ? rows : []); setError('');
    }).catch(function (err) { setError(vitalsError(t, err)); setList(function (p) { return p || []; }); });
  }
  useEffect(function () { return everyHalfMinute(loadList); }, []);

  var visit = visitId != null && list ? list.filter(function (v) { return v.id === visitId; })[0] || null : null;

  if (visit) return (
    <div style={col}>
      <ListHead t={t} title={nameOf(visit)} onBack={function () { setVisitId(null); }} onRefresh={loadList} />
      <div style={Object.assign({}, subText, { marginBottom: 10 })}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{visit.chart_no}</span>{timeOf(visit) ? ' · ' + timeOf(visit) : ''}</div>
      <ErrorBox text={error} />
      <div style={listBox}>
        {(visit.orders || []).map(function (o) {
          var st = orderStatus(t, o.status);
          var off = o.status === 'cancelled';
          return <div key={o.order_item_id} style={Object.assign({}, rowBtn, { cursor: 'default', alignItems: 'flex-start' })}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={Object.assign({}, nameText, off ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {})}>{o.order_name}</span>
              <span style={subText}>{typeWord(t, o.code_type)}{o.order_code ? ' · ' + o.order_code : ''}{o.created_at ? ' · ' + hhmm(o.created_at) : ''}</span>
              {o.memo ? <span style={Object.assign({}, subText, { color: 'var(--text)', whiteSpace: 'pre-line' })}>📝 {o.memo}</span> : null}
            </span>
            <Tag c={st.c}>{st.word}</Tag>
          </div>;
        })}
      </div>
    </div>
  );

  return (
    <div style={col}>
      <ListHead t={t} title={'📋 ' + t.mo_orders} onBack={props.onHome} backLabel={t.mo_home} onRefresh={loadList} />
      <ErrorBox text={error} />
      {list === null ? <Empty text={t.loading} /> : list.length === 0 ? <Empty text={t.mo_emptyOrders} /> :
        <div style={listBox}>
          {list.map(function (v) {
            return <button key={v.id} type="button" onClick={function () { setVisitId(v.id); }} style={rowBtn}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nameText}>{nameOf(v)}</span>
                <span style={subText}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{v.chart_no}</span>{timeOf(v) ? ' · ' + timeOf(v) : ''}</span>
              </span>
              <Tag c="accent">{fill(t.mo_nOrders, { n: v.active })}</Tag>
            </button>;
          })}
        </div>}
      <div style={{ marginTop: 8, fontSize: FS, color: 'var(--text-3)' }}>{t.mo_readOnly}</div>
    </div>
  );
}
