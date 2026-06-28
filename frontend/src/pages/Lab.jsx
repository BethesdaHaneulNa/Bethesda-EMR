import { useState, useEffect } from 'react';
import { TopBar } from '../components/TopBar.jsx';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { LabResults } from '../components/LabResults.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';

function ymd(d) { return d ? String(d).split('T')[0] : ''; }
function nm(v) { return ((v.last_name || '') + ' ' + (v.first_name || '')).trim(); }
function flagOf(v, lo, hi) {
  var n = parseFloat(v); if (isNaN(n)) return '';
  if (lo != null && lo !== '' && n < parseFloat(lo)) return 'low';
  if (hi != null && hi !== '' && n > parseFloat(hi)) return 'high';
  if ((lo == null || lo === '') && (hi == null || hi === '')) return '';
  return 'normal';
}

export default function LabPage() {
  var lc = useLang(); var t = lc.t;
  var ps = useState([]), pending = ps[0], setPending = ps[1];
  var cps = useState([]), completed = cps[0], setCompleted = cps[1];
  var tb = useState('pending'), tab = tb[0], setTab = tb[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];       // consultation group
  var vw = useState(null), view = vw[0], setView = vw[1];     // 'all' | order_item_id
  var gs = useState([]), groups = gs[0], setGroups = gs[1];   // [{order_item_id, order_name, items}]
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var fs = useState(false), finderOpen = fs[0], setFinderOpen = fs[1];
  var cvs = useState(false), chartViewOpen = cvs[0], setChartViewOpen = cvs[1];

  useEffect(function () { loadData(); }, []);
  function loadData() {
    setLoading(true);
    Promise.all([
      api.get('/lab/pending').catch(function () { return []; }),
      api.get('/lab/completed').catch(function () { return []; }),
    ]).then(function (r) { setPending(r[0] || []); setCompleted(r[1] || []); setLoading(false); });
  }

  function pickConsult(g) {
    setSel(g);
    var orders = g.lab_orders || [];
    if (orders.length > 1) loadView('all', g);
    else if (orders.length === 1) loadView(orders[0].order_item_id, g);
    else { setGroups([]); setView(null); }
  }
  function pickVisit(v) {
    api.get('/lab/visit/' + v.id + '/orders').then(function (g) {
      if (!g) { alert(t.labNoOrders || '이 내원에 검사 오더가 없습니다.'); return; }
      pickConsult(g);
    }).catch(function (e) { alert('Error: ' + e.message); });
  }
  function loadView(v, g) {
    g = g || sel;
    setView(v);
    var orders = g.lab_orders || [];
    var targets = v === 'all' ? orders : orders.filter(function (o) { return o.order_item_id === v; });
    Promise.all(targets.map(function (o) {
      return api.get('/lab/order/' + o.order_item_id + '/items')
        .then(function (d) { return { order_item_id: o.order_item_id, order_name: o.order_name, items: (d.items || []).map(function (x) { return Object.assign({}, x); }) }; })
        .catch(function () { return { order_item_id: o.order_item_id, order_name: o.order_name, items: [] }; });
    })).then(function (gr) { setGroups(gr); });
  }
  function setVal(gi, ii, k, val) {
    setGroups(function (prev) {
      var n = prev.slice(); n[gi] = Object.assign({}, n[gi]); n[gi].items = n[gi].items.slice();
      n[gi].items[ii] = Object.assign({}, n[gi].items[ii]); n[gi].items[ii][k] = val; return n;
    });
  }
  async function save() {
    if (!groups.length) return;
    setBusy(true);
    try {
      for (var i = 0; i < groups.length; i++) {
        await api.post('/lab/order/' + groups[i].order_item_id + '/results', { results: groups[i].items });
      }
      loadData();
      setSel(null); setView(null); setGroups([]);
    } catch (e) { alert('Error: ' + e.message); }
    setBusy(false);
  }

  var bd = '#232838', bd2 = '#2a3142', pn = '#13161f', scBg = '#1a1f2e', tx = '#e2e8f0', t2 = '#94a3b8', t3 = '#64748b', cyan = '#06b6d4';
  var list = tab === 'pending' ? pending : completed;
  var totalItems = groups.reduce(function (a, g) { return a + g.items.length; }, 0);

  function itemGrid(gi, g, showHeader) {
    return <div key={g.order_item_id} style={{ marginBottom: 14 }}>
      {showHeader ? <div style={{ fontWeight: 800, fontSize: 14, color: '#67e8f9', marginBottom: 5 }}>{g.order_name}</div> : null}
      {g.items.length === 0 ? <div style={{ color: t3, fontSize: 13, padding: '4px 2px' }}>{t.labNoMaster || '이 검사의 항목이 설정되지 않았습니다 (설정 → 검사항목에서 정의)'}</div> : (
        <div style={{ border: '1px solid ' + bd, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .7fr 1fr 1.4fr', background: '#161a26', color: t3, fontSize: 13, fontWeight: 800 }}>
            {[t.testName || '검사명', t.refRange || '참고치', t.unit || '단위', t.labValue || '결과값', t.labComment || '비고'].map(function (h) { return <div key={h} style={{ padding: '8px 10px' }}>{h}</div>; })}
          </div>
          {g.items.map(function (it, ii) {
            var fl = flagOf(it.value, it.ref_low, it.ref_high);
            var ref = it.ref_text || (it.ref_low != null && it.ref_high != null ? it.ref_low + '~' + it.ref_high : it.ref_low != null ? '≥' + it.ref_low : it.ref_high != null ? '≤' + it.ref_high : '');
            var vc = fl === 'low' ? '#60a5fa' : fl === 'high' ? '#f87171' : tx;
            return <div key={ii} style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .7fr 1fr 1.4fr', borderTop: '1px solid ' + bd, alignItems: 'center' }}>
              <div style={{ padding: '7px 10px', fontWeight: 600 }}>{it.name}</div>
              <div style={{ padding: '7px 10px', color: t3, fontSize: 13 }}>{ref}</div>
              <div style={{ padding: '7px 10px', color: t2, fontSize: 13 }}>{it.unit || ''}</div>
              <div style={{ padding: '5px 8px' }}>
                <input value={it.value || ''} onChange={function (e) { setVal(gi, ii, 'value', e.target.value); }} style={{ width: '100%', boxSizing: 'border-box', background: '#0f1117', border: '1px solid ' + (fl === 'low' || fl === 'high' ? vc : bd2), borderRadius: 4, color: vc, fontSize: 14, fontWeight: 700, padding: '5px 8px', outline: 'none' }} />
              </div>
              <div style={{ padding: '5px 8px' }}>
                <input value={it.comment || ''} onChange={function (e) { setVal(gi, ii, 'comment', e.target.value); }} placeholder="—" style={{ width: '100%', boxSizing: 'border-box', background: '#0f1117', border: '1px solid ' + bd2, borderRadius: 4, color: t2, fontSize: 13, padding: '5px 8px', outline: 'none' }} />
              </div>
            </div>;
          })}
        </div>
      )}
    </div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#0f1117', color: tx, minHeight: '100vh', fontSize: 15 }}>
      <TopBar />
      <div style={{ background: '#161a26', borderBottom: '1px solid ' + bd, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={function () { setTab('pending'); setSel(null); }} style={{ background: tab === 'pending' ? cyan + '20' : 'transparent', color: tab === 'pending' ? '#67e8f9' : t3, border: '1px solid ' + (tab === 'pending' ? cyan + '50' : 'transparent'), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.labPending || '결과 대기'} {pending.length}</button>
        <button onClick={function () { setTab('completed'); setSel(null); }} style={{ background: tab === 'completed' ? '#10b98120' : 'transparent', color: tab === 'completed' ? '#6ee7b7' : t3, border: '1px solid ' + (tab === 'completed' ? '#10b98150' : 'transparent'), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.labCompleted || '입력 완료'} {completed.length}</button>
        <button onClick={loadData} style={{ background: '#1e2433', color: t2, border: '1px solid ' + bd2, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 15 }}>↻</button>
        <button onClick={function () { setFinderOpen(true); }} style={{ background: '#1e2433', color: t2, border: '1px solid ' + bd2, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>🔍 {t.findPatient}</button>
        <button onClick={function () { if (sel) setChartViewOpen(true); }} disabled={!sel} style={{ background: '#1e2433', color: sel ? '#ddd6fe' : '#475569', border: '1px solid ' + (sel ? '#a855f7' : bd2), borderRadius: 5, padding: '5px 12px', cursor: sel ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700 }}>📋 {t.chartViewer || '차트뷰어'}</button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 86px)' }}>
        {/* LEFT: pending consultations */}
        <div style={{ width: 300, borderRight: '1px solid ' + bd, background: pn, overflow: 'auto', flexShrink: 0 }}>
          {loading ? <div style={{ padding: 16, color: t3 }}>{t.loading || 'Loading…'}</div> : null}
          {!loading && list.length === 0 ? <div style={{ padding: 16, color: t3, fontSize: 14 }}>{tab === 'pending' ? (t.labNoPending || '결과 대기 검사 없음') : (t.labNoCompleted || '완료 내역 없음')}</div> : null}
          {list.map(function (g) {
            var active = sel && sel.consultation_id === g.consultation_id;
            return <div key={g.consultation_id} onClick={function () { pickConsult(g); }} style={{ padding: '9px 12px', borderBottom: '1px solid ' + bd, cursor: 'pointer', background: active ? cyan + '12' : 'transparent', borderLeft: active ? '3px solid ' + cyan : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{nm(g)}</span>
                <span style={{ color: t3, fontSize: 12 }}>{ymd(g.visit_date)}</span>
              </div>
              <div style={{ fontSize: 12, color: t2 }}>{g.chart_no} · {g.doctor_name || ''}</div>
              <div style={{ fontSize: 12, color: cyan, marginTop: 2 }}>{(g.lab_orders || []).map(function (o) { return o.order_name; }).join(', ')}</div>
            </div>;
          })}
        </div>

        {/* CENTER: entry */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!sel ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t3 }}>{t.labSelectHint || '왼쪽에서 환자를 선택하세요'}</div> : (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + bd, background: scBg }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{nm(sel)} <span style={{ color: t2, fontSize: 14, fontWeight: 400 }}>{sel.chart_no} · {ymd(sel.visit_date)}</span></div>
                {sel.allergies ? <div style={{ marginTop: 4, color: '#fca5a5', fontSize: 13 }}>⚠ {sel.allergies}</div> : null}
              </div>
              {/* panel tabs: All + each panel */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid ' + bd, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(sel.lab_orders || []).length > 1 ? (function () {
                  var on = view === 'all';
                  return <button onClick={function () { loadView('all'); }} style={{ background: on ? cyan : '#1e2433', color: on ? '#08161a' : t2, border: '1px solid ' + (on ? cyan : bd2), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>{t.labAll || '전체'}</button>;
                })() : null}
                {(sel.lab_orders || []).map(function (o) {
                  var on = view === o.order_item_id;
                  return <button key={o.order_item_id} onClick={function () { loadView(o.order_item_id); }} style={{ background: on ? cyan : '#1e2433', color: on ? '#08161a' : t2, border: '1px solid ' + (on ? cyan : bd2), borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{o.order_name}{o.status === 'completed' ? ' ✓' : ''}</button>;
                })}
              </div>
              {/* item grid(s) */}
              <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
                {groups.length === 0 ? <div style={{ color: t3, fontSize: 14, padding: 10 }}>{t.labNoMaster || '항목이 없습니다'}</div>
                  : groups.map(function (g, gi) { return itemGrid(gi, g, view === 'all'); })}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid ' + bd, background: '#161a26', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={save} disabled={busy || totalItems === 0} style={{ background: totalItems ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : '#1e2433', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 28px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 900 }}>✓ {t.labSave || '결과 저장 · 완료'}{view === 'all' && groups.length > 1 ? ' (' + t.labAll + ')' : ''}</button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: history matrix */}
        <div style={{ width: 460, borderLeft: '1px solid ' + bd, background: pn, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 14, color: '#67e8f9' }}>🧪 {t.labResultsTitle || '검사결과'}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}><LabResults patientId={sel ? sel.patient_id : null} /></div>
        </div>
      </div>
      <PatientFinder open={finderOpen} onClose={function () { setFinderOpen(false); }} mode="visit"
        onPickVisit={function (v) { pickVisit(v); }} />
      <DocumentModal open={chartViewOpen} onClose={function () { setChartViewOpen(false); }} category="chart" readOnly={true}
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{}} />
    </div>
  );
}
