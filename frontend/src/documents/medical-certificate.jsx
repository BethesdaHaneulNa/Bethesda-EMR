// Medical certificate (진단서 / Certificat médical). One A4 page.
//
// Asked by the clinic (2026-10-02): "the documents window only has the referral letter".
// The boxes follow the hospital form the director showed (the picture itself carries
// personal data and is not in the repository): document and chart numbers / the patient /
// the diagnoses with their codes, clinical or final / history / the physician's findings /
// remarks / date of issue, the institution, the department, the physician and a place
// to sign. No licence number: the director dropped it (2026-10-02, not needed in Madagascar).
//
// Filled by itself: the patient, the consultation's diagnoses (autofill 'diagnoses': one a
// line, "code name", in the document's language), today's date, the clinic, the doctor.
// Typed: the address when the patient record has none (reception does not record one),
// history, findings, remarks, clinical / final.
//
// Another certificate later (rest / sick leave): copy this file, change the boxes, and
// add it to TEMPLATES in registry.js. Nothing else needs to change.
import { A4, ClinicHeader, L, DOC_LABELS, fmtDate, calcAge, clinicName } from './shared.jsx';

var FL = {
  address:   { ko: '주소 (환자 기록에 없을 때)', en: 'Address (when the patient record has none)', fr: "Adresse (si le dossier n'en a pas)" },
  diagnosis: { ko: '진단 (한 줄에 하나: 코드 이름)', en: 'Diagnosis (one a line: code, then name)', fr: 'Diagnostic (un par ligne : code puis nom)' },
  kind:      { ko: '진단 구분', en: 'Kind of diagnosis', fr: 'Nature du diagnostic' },
  history:   { ko: '병력 (발병일 · 경과)', en: 'History of illness or injury', fr: 'Histoire de la maladie ou de la blessure' },
  findings:  { ko: '의사 소견', en: "Physician's findings and statement", fr: 'Constatations et avis du médecin' },
  remarks:   { ko: '비고', en: 'Remarks', fr: 'Remarques' },
};
// What the paper prints (shorter than the form's labels).
var PL = {
  code:        { ko: '질병코드', en: 'Code', fr: 'Code' },
  diagnosis:   { ko: '진단명', en: 'Diagnosis', fr: 'Diagnostic' },
  address:     DOC_LABELS.address,
  history:     { ko: '병력', en: 'History of illness or injury', fr: 'Histoire de la maladie ou de la blessure' },
  certify:     { ko: '위와 같이 진단함.', en: 'I certify the diagnosis stated above.', fr: 'Je certifie le diagnostic indiqué ci-dessus.' },
  issued:      { ko: '발행일', en: 'Date of issue', fr: "Date d'émission" },
  institution: { ko: '의료기관', en: 'Institution', fr: 'Établissement' },
};
// Stored values of the "kind" box; what is shown comes from KIND. (A saved document keeps
// the stored value, so these two words are not to be changed.)
var KINDS = ['clinical', 'final'];
var KIND = {
  clinical: { ko: '임상적 진단', en: 'Clinical diagnosis', fr: 'Diagnostic clinique' },
  final:    { ko: '최종 진단', en: 'Final diagnosis', fr: 'Diagnostic définitif' },
};

// "B54 Paludisme, sans précision" -> code and name; a line with no code keeps its words.
// The code is what an ICD code looks like: a letter, two digits, an optional decimal.
function splitLine(line) {
  var m = /^\s*([A-Za-z]\d{2}(?:\.\d{1,2})?)\s+(.+)$/.exec(line);
  return m ? { code: m[1].toUpperCase(), name: m[2].trim() } : { code: '', name: String(line).trim() };
}

function Layout(props) {
  var v = props.values || {}, lang = props.lang, p = props.patient || {}, clinic = props.clinic || {}, doctor = props.doctor || {};
  var cell = { border: '1px solid #999', padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap', width: 96 });
  var sex = p.gender === 'M' ? L(DOC_LABELS.male, lang) : p.gender === 'F' ? L(DOC_LABELS.female, lang) : '';
  var age = calcAge(p.date_of_birth);
  var address = String(v.address || p.address || '').trim();
  var lines = String(v.diagnosis || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(splitLine);
  // The form shows its boxes even when empty: two diagnosis rows at least.
  while (lines.length < 2) lines.push({ code: '', name: '' });
  var kind = String(v.dxKind || '').trim();
  // A drawn box, not a character: the check-box characters are missing from some of the
  // fonts a print falls back to.
  var box = function (on) {
    return <span style={{ display: 'inline-block', width: 11, height: 11, border: '1px solid #111', marginRight: 5, verticalAlign: '-1px', textAlign: 'center', lineHeight: '10px', fontSize: 10, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>{on ? 'X' : ''}</span>;
  };
  var section = function (label, value, minHeight) {
    return (
      <div style={{ marginBottom: 8, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 3 }}>{label}</div>
        <div style={{ border: '1px solid #999', padding: '6px 8px', fontSize: 12.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minHeight: minHeight, lineHeight: 1.5 }}>{value || ' '}</div>
      </div>
    );
  };
  var row = function (label, value) {
    return <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td><td style={{ padding: '2px 0', overflowWrap: 'anywhere' }}>{value}</td></tr>;
  };
  var blank = <span style={{ display: 'inline-block', minWidth: 160, borderBottom: '1px solid #999' }}>{' '}</span>;
  return (
    // pad: a little less white than a letter, so the form and five lines of findings stay
    // on one page with room for more diagnoses (measured at the print width, 688 px).
    <A4 innerRef={props.innerRef} pad="24px 32px">
      <ClinicHeader clinic={clinic} lang={lang} title={L({ ko: '진 단 서', en: 'Medical Certificate', fr: 'Certificat Médical' }, lang)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
        <div><b>{L(DOC_LABELS.docNo, lang)}:</b> {props.docNo || '—'}</div>
        <div><b>{L(DOC_LABELS.chartNo, lang)}:</b> <span style={{ whiteSpace: 'nowrap' }}>{p.chart_no || ''}</span></div>
      </div>

      {/* The patient. The name is never cut: it wraps in its cell. The address row is
          always there on a certificate, empty when nobody knows it. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody>
          <tr>
            <td style={head}>{L(DOC_LABELS.name, lang)}</td>
            <td style={Object.assign({}, cell, { overflowWrap: 'anywhere' })}>{(p.last_name || '') + ' ' + (p.first_name || '')}</td>
            <td style={head}>{L(DOC_LABELS.sex, lang)}</td>
            <td style={Object.assign({}, cell, { width: 110 })}>{sex}</td>
          </tr>
          <tr>
            <td style={head}>{L(DOC_LABELS.dob, lang)}</td>
            <td style={cell}>{fmtDate(p.date_of_birth)}</td>
            <td style={head}>{L(DOC_LABELS.age, lang)}</td>
            <td style={cell}>{age !== '' ? age : ''}</td>
          </tr>
          <tr>
            <td style={head}>{L(PL.address, lang)}</td>
            <td style={Object.assign({}, cell, { overflowWrap: 'anywhere' })} colSpan={3}>{address || ' '}</td>
          </tr>
        </tbody>
      </table>

      {/* The diagnoses: one row each, the code in its own column (empty for a diagnosis
          written without one). */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody>
          <tr>
            <td style={Object.assign({}, head, { width: 96 })}>{L(PL.code, lang)}</td>
            <td style={Object.assign({}, head, { width: 'auto' })}>{L(PL.diagnosis, lang)}</td>
          </tr>
          {lines.map(function (d, i) {
            return <tr key={i}>
              <td style={Object.assign({}, cell, { fontFamily: '"Courier New", monospace', whiteSpace: 'nowrap', height: 22 })}>{d.code}</td>
              <td style={Object.assign({}, cell, { fontSize: 12.5, overflowWrap: 'anywhere' })}>{d.name}</td>
            </tr>;
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 12.5, marginBottom: 10 }}>
        {KINDS.map(function (k) {
          return <span key={k} style={{ marginRight: 22, whiteSpace: 'nowrap' }}>{box(kind === k)}{L(KIND[k], lang)}</span>;
        })}
      </div>

      {section(L(PL.history, lang), v.history, 50)}
      {section(L(FL.findings, lang), v.findings, 92)}
      {section(L(FL.remarks, lang), v.remarks, 34)}

      {/* What the certificate ends with: the statement, the date, who issues it. */}
      <div style={{ marginTop: 10, fontSize: 12.5, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ marginBottom: 8 }}>{L(PL.certify, lang)}</div>
        <div style={{ marginBottom: 10 }}><b>{L(PL.issued, lang)}:</b> {props.dateStr || ''}</div>
        <table style={{ borderCollapse: 'collapse', marginLeft: 'auto', maxWidth: '78%' }}>
          <tbody>
            {row(L(PL.institution, lang), <b>{clinicName(clinic, lang)}</b>)}
            {clinic.address ? row(L(DOC_LABELS.address, lang), clinic.address) : null}
            {clinic.phone ? row(L(DOC_LABELS.phone, lang), clinic.phone) : null}
            {doctor.dept_code ? row(L(DOC_LABELS.department, lang), doctor.dept_code) : null}
            {row(L(DOC_LABELS.doctor, lang), <span><b>{doctor.name || ''}</b>{doctor.name ? null : blank}<span style={{ marginLeft: 10, color: '#555' }}>({L(DOC_LABELS.signature, lang)})</span><span style={{ display: 'inline-block', minWidth: 110, borderBottom: '1px solid #999', marginLeft: 6 }}>{' '}</span></span>)}
          </tbody>
        </table>
      </div>
    </A4>
  );
}

export default {
  code: 'medical-certificate',
  category: 'document',
  name: { ko: '진단서', en: 'Medical Certificate', fr: 'Certificat médical' },
  fields: [
    { key: 'diagnosis', label: FL.diagnosis, type: 'textarea', rows: 3, autofill: 'diagnoses' },
    { key: 'dxKind',    label: FL.kind,      type: 'checks', options: KINDS, single: true,
      optionLabel: function (opt, lang) { return L(KIND[opt], lang) || opt; } },
    { key: 'history',   label: FL.history,   type: 'textarea', rows: 3 },
    { key: 'findings',  label: FL.findings,  type: 'textarea', rows: 5 },
    { key: 'remarks',   label: FL.remarks,   type: 'textarea', rows: 2 },
    { key: 'address',   label: FL.address,   type: 'text' },
  ],
  Layout: Layout,
};
