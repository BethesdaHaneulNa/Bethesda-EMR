// External / outside prescription (원외 처방전). Lists drugs marked 'external'
// in the pharmacy so the patient can fill them at an outside pharmacy. A4.
import { A4, ClinicHeader, DocMetaRow, PatientBox, DocSection, SignatureBlock, L } from './shared.jsx';

var FL = {
  destination: { ko: '수신 약국 (선택)', en: 'Pharmacy (optional)', fr: 'Pharmacie (optionnel)' },
  note:        { ko: '복약지도 / 비고', en: 'Instructions / Notes', fr: 'Conseils / Remarques' },
};
var COL = {
  no:    { ko: 'No', en: 'No', fr: 'N°' },
  drug:  { ko: '약품명', en: 'Medication', fr: 'Médicament' },
  dose:  { ko: '1회량', en: 'Dose', fr: 'Dose' },
  freq:  { ko: '횟수', en: 'Freq', fr: 'Fréq.' },
  days:  { ko: '일수', en: 'Days', fr: 'Jours' },
  qty:   { ko: '총량', en: 'Qty', fr: 'Qté' },
  route: { ko: '용법 / 비고', en: 'Route / Note', fr: 'Voie / Note' },
};
var EMPTY = {
  ko: '원외로 지정된 처방이 없습니다. (약국 화면에서 약을 "원외"로 지정하세요)',
  en: 'No prescriptions marked as external. (Mark drugs as "external" in the pharmacy screen.)',
  fr: 'Aucune ordonnance externe. (Marquez les médicaments comme « externe » dans la pharmacie.)',
};

function qtyOf(rx) {
  var q = parseFloat(rx.total_qty);
  if (!isNaN(q) && q > 0) return q;
  return (parseFloat(rx.dose) || 0) * (Number(rx.frequency) || 1) * (Number(rx.days) || 1);
}

function Layout(props) {
  var v = props.values || {}, lang = props.lang;
  var meds = (props.meds || []).filter(function (m) { return m.dispense_type === 'external'; });
  var cell = { border: '1px solid #999', padding: '5px 7px', fontSize: 12, textAlign: 'left' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, textAlign: 'center' });
  var num = Object.assign({}, cell, { textAlign: 'center' });

  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={L({ ko: '원 외 처 방 전', en: 'Outside Prescription', fr: 'Ordonnance (pharmacie externe)' }, lang)} />
      <DocMetaRow lang={lang} docNo={props.docNo} dateStr={props.dateStr} />

      {v.destination ? <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>{L(FL.destination, lang)}:</b> {v.destination}</div> : null}

      <PatientBox patient={props.patient} lang={lang} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <thead>
          <tr>
            <th style={Object.assign({}, head, { width: 32 })}>{L(COL.no, lang)}</th>
            <th style={head}>{L(COL.drug, lang)}</th>
            <th style={Object.assign({}, head, { width: 52 })}>{L(COL.dose, lang)}</th>
            <th style={Object.assign({}, head, { width: 48 })}>{L(COL.freq, lang)}</th>
            <th style={Object.assign({}, head, { width: 48 })}>{L(COL.days, lang)}</th>
            <th style={Object.assign({}, head, { width: 52 })}>{L(COL.qty, lang)}</th>
            <th style={Object.assign({}, head, { width: 150 })}>{L(COL.route, lang)}</th>
          </tr>
        </thead>
        <tbody>
          {meds.length === 0
            ? <tr><td style={Object.assign({}, cell, { textAlign: 'center', color: '#666', padding: '14px' })} colSpan={7}>{L(EMPTY, lang)}</td></tr>
            : meds.map(function (rx, i) {
                return <tr key={rx.id || i}>
                  <td style={num}>{i + 1}</td>
                  <td style={cell}><b>{rx.drug_name}</b>{rx.drug_code ? <span style={{ color: '#666', marginLeft: 6, fontSize: 11 }}>{rx.drug_code}</span> : null}</td>
                  <td style={num}>{rx.dose || ''}</td>
                  <td style={num}>{rx.frequency || ''}</td>
                  <td style={num}>{rx.days || ''}</td>
                  <td style={num}>{qtyOf(rx)}</td>
                  <td style={cell}>{[rx.route, rx.memo].filter(Boolean).join(' · ')}</td>
                </tr>;
              })}
        </tbody>
      </table>

      <DocSection label={L(FL.note, lang)} value={v.note} />

      <SignatureBlock lang={lang} doctor={props.doctor} clinic={props.clinic} />
    </A4>
  );
}

export default {
  code: 'external-rx',
  category: 'prescription',
  name: { ko: '원외 처방전', en: 'Outside Prescription', fr: 'Ordonnance externe' },
  needsMeds: true,
  fields: [
    { key: 'destination', label: FL.destination, type: 'text' },
    { key: 'note', label: FL.note, type: 'textarea', rows: 3 },
  ],
  Layout: Layout,
};
