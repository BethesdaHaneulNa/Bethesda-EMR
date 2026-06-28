// Shared building blocks for the document engine (A4 letterhead, patient box,
// signature block, print helper, i18n picker). Templates compose these so that
// adding a new form = one template file, nothing else.

// pick a localized string from { ko, en, fr } (or return plain string as-is)
export function L(v, lang) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || v.fr || v.ko || '';
}

export function fmtDate(d) {
  if (!d) return '';
  var s = typeof d === 'string' ? d : '';
  if (s.indexOf('T') >= 0) s = s.split('T')[0];
  return s || String(d);
}

export function calcAge(dob) {
  if (!dob) return '';
  var d = new Date(typeof dob === 'string' ? dob.split('T')[0] : dob);
  if (isNaN(d.getTime())) return '';
  var n = new Date();
  var a = n.getFullYear() - d.getFullYear();
  var m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}

export function clinicName(clinic, lang) {
  if (!clinic) return 'Bethesda Clinic';
  if (lang === 'fr') return clinic.name_fr || clinic.name_en || clinic.name;
  if (lang === 'en') return clinic.name_en || clinic.name;
  return clinic.name || clinic.name_en || 'Bethesda Clinic';
}

// universal labels shared by every document
export var DOC_LABELS = {
  name:       { ko: '성명',     en: 'Name',          fr: 'Nom' },
  chartNo:    { ko: '차트번호', en: 'Chart No.',     fr: 'N° dossier' },
  dob:        { ko: '생년월일', en: 'Date of Birth', fr: 'Date de naissance' },
  age:        { ko: '나이',     en: 'Age',           fr: 'Âge' },
  sex:        { ko: '성별',     en: 'Sex',           fr: 'Sexe' },
  address:    { ko: '주소',     en: 'Address',       fr: 'Adresse' },
  phone:      { ko: '연락처',   en: 'Phone',         fr: 'Téléphone' },
  date:       { ko: '발행일',   en: 'Date',          fr: 'Date' },
  docNo:      { ko: '발행번호', en: 'Document No.',  fr: 'N° document' },
  doctor:     { ko: '의사',     en: 'Physician',     fr: 'Médecin' },
  department: { ko: '진료과',   en: 'Department',    fr: 'Service' },
  signature:  { ko: '서명',     en: 'Signature',     fr: 'Signature' },
  male:       { ko: '남',       en: 'M',             fr: 'M' },
  female:     { ko: '여',       en: 'F',             fr: 'F' },
};

// ── A4 letterhead ───────────────────────────────────────────────
export function ClinicHeader(props) {
  var clinic = props.clinic, lang = props.lang, title = props.title;
  return (
    <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>{clinicName(clinic, lang)}</div>
      <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>
        {(clinic && clinic.address) || ''}{clinic && clinic.phone ? '  ·  Tel: ' + clinic.phone : ''}{clinic && clinic.email ? '  ·  ' + clinic.email : ''}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
    </div>
  );
}

// ── doc number + date row ───────────────────────────────────────
export function DocMetaRow(props) {
  var lang = props.lang;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
      <div><b>{L(DOC_LABELS.docNo, lang)}:</b> {props.docNo || '—'}</div>
      <div><b>{L(DOC_LABELS.date, lang)}:</b> {props.dateStr || ''}</div>
    </div>
  );
}

// ── patient identity box ────────────────────────────────────────
export function PatientBox(props) {
  var p = props.patient || {}, lang = props.lang;
  var cell = { border: '1px solid #999', padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap', width: 90 });
  var sex = p.gender === 'M' ? L(DOC_LABELS.male, lang) : p.gender === 'F' ? L(DOC_LABELS.female, lang) : '';
  var age = calcAge(p.date_of_birth);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <tbody>
        <tr>
          <td style={head}>{L(DOC_LABELS.name, lang)}</td>
          <td style={cell}>{(p.last_name || '') + ' ' + (p.first_name || '')}</td>
          <td style={head}>{L(DOC_LABELS.chartNo, lang)}</td>
          <td style={cell}>{p.chart_no || ''}</td>
        </tr>
        <tr>
          <td style={head}>{L(DOC_LABELS.dob, lang)}</td>
          <td style={cell}>{fmtDate(p.date_of_birth)}{age !== '' ? '  (' + age + ')' : ''}</td>
          <td style={head}>{L(DOC_LABELS.sex, lang)}</td>
          <td style={cell}>{sex}</td>
        </tr>
        <tr>
          <td style={head}>{L(DOC_LABELS.address, lang)}</td>
          <td style={cell} colSpan={3}>{p.address || ''}</td>
        </tr>
        <tr>
          <td style={head}>{L(DOC_LABELS.phone, lang)}</td>
          <td style={cell} colSpan={3}>{p.mobile || p.phone || ''}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ── a labeled body section (preserves line breaks) ──────────────
export function DocSection(props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 3, borderBottom: '1px solid #ccc', paddingBottom: 2 }}>{props.label}</div>
      <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', minHeight: 22, lineHeight: 1.5 }}>{props.value || ' '}</div>
    </div>
  );
}

// ── doctor / clinic signature block ─────────────────────────────
export function SignatureBlock(props) {
  var lang = props.lang, doctor = props.doctor || {}, clinic = props.clinic || {};
  return (
    <div style={{ marginTop: 28, fontSize: 12.5, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {doctor.dept_code ? <tr><td style={{ padding: '2px 10px 2px 0', fontWeight: 700 }}>{L(DOC_LABELS.department, lang)}</td><td style={{ padding: '2px 0' }}>{doctor.dept_code}</td></tr> : null}
            <tr>
              <td style={{ padding: '2px 10px 2px 0', fontWeight: 700 }}>{L(DOC_LABELS.doctor, lang)}</td>
              <td style={{ padding: '2px 0' }}><span style={{ fontWeight: 700 }}>{doctor.name || ''}</span>
                <span style={{ marginLeft: 8, color: '#555' }}>({L(DOC_LABELS.signature, lang)})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18, fontWeight: 700 }}>{clinicName(clinic, lang)}</div>
    </div>
  );
}

// ── A4 wrapper ──────────────────────────────────────────────────
export function A4(props) {
  return (
    <div ref={props.innerRef} style={{
      width: '100%', background: '#fff', color: '#111',
      padding: '34px 40px', boxSizing: 'border-box',
      fontFamily: '"Times New Roman", Georgia, serif', fontSize: 13, lineHeight: 1.45,
    }}>
      {props.children}
    </div>
  );
}

// ── print: open the A4 node in a clean print window ─────────────
export function printDocument(node, title) {
  if (!node) return;
  var html = node.outerHTML;
  var w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert('팝업이 차단되어 인쇄할 수 없습니다. 브라우저에서 팝업을 허용해 주세요.'); return; }
  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (title || 'Document') + '</title>' +
    '<style>@page{size:A4;margin:14mm} *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box} html,body{margin:0;padding:0;background:#fff}</style>' +
    '</head><body>' + html + '</body></html>'
  );
  w.document.close();
  w.focus();
  setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
}
