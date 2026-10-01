// Imaging report: one exam's reading on one A4 sheet, to go with the images when a
// patient is referred to another hospital (director, 2026-10-01). The form follows the
// report sheet of the director's own hospital: a ruled table - a big title and the exam
// date on the left, the patient's four lines on the right, a band with the exam, a band
// with the reading, and at the foot of the page the clinic and who read it.
//
// It has the document engine's template shape (code, name, Layout taking values /
// patient / clinic / lang / docNo / dateStr) and is issued through POST /api/documents
// like every paper that leaves the clinic, but it is printed from the imaging list
// (components/RadiologyReadings.jsx), not from the documents window - there is nothing
// to fill in: every value comes from the exam.
//   values { exam_name, modality, exam_date, image_count, dept, ordered_by,
//            reading, read_by, read_at }
import { L, fmtDate, calcAge, clinicName, DOC_LABELS } from './shared.jsx';

// The labels are the form's own. Korean keeps the English labels of the original sheet.
var T = {
  title:     { fr: 'COMPTE-RENDU', en: 'REPORT', ko: 'REPORT' },
  name:      { fr: 'NOM', en: 'NAME', ko: 'NAME' },
  id:        { fr: 'N° dossier', en: 'ID', ko: 'ID' },
  sexAge:    { fr: 'Sexe, Âge', en: 'Sex,Age', ko: 'Sex,Age' },
  dob:       { fr: 'Né(e) le', en: 'Birthday', ko: 'Birthday' },
  exam:      { fr: 'Examen', en: 'Exam', ko: 'Exam' },
  reading:   { fr: 'Compte-rendu', en: 'Reading', ko: 'Reading' },
  orderedBy: { fr: 'Demandé par', en: 'Ordered by', ko: '의뢰' },
  images:    { fr: '{n} image(s)', en: '{n} image(s)', ko: '영상 {n}장' },
  reader:    { fr: 'Médecin lecteur :', en: 'Read by:', ko: '판독의:' },
  docNo:     { fr: 'N° document', en: 'Document No.', ko: '발행번호' },
  issued:    { fr: 'Émis le', en: 'Issued', ko: '발행' },
};

var FONT = '"Segoe UI", "Malgun Gothic", "Noto Sans", Arial, sans-serif';
var LINE = '1.5px solid #000';
// The printable height of an A4 page inside printDocument()'s 14 mm margins is 269 mm;
// a little less, so that rounding never pushes the foot onto a page of its own.
var PAGE = '264mm';

function stamp(d) {
  if (!d) return '';
  var x = new Date(String(d));
  if (isNaN(x.getTime())) return fmtDate(d);
  return x.toLocaleDateString('en-CA') + ' ' + ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2);
}

export function ImagingReportLayout(props) {
  var v = props.values || {}, p = props.patient || {}, clinic = props.clinic || {}, lang = props.lang || 'fr';
  var fullName = ((p.last_name || '') + ' ' + (p.first_name || '')).trim();
  var sex = p.gender === 'M' ? L(DOC_LABELS.male, lang) : p.gender === 'F' ? L(DOC_LABELS.female, lang) : '';
  var age = calcAge(p.date_of_birth);
  var who = [v.dept, v.ordered_by].filter(Boolean).join(' · ');
  var colon = lang === 'fr' ? ' : ' : ': ';   // French puts a space before the colon
  var small = [who ? L(T.orderedBy, lang) + colon + who : '', v.image_count ? L(T.images, lang).replace('{n}', v.image_count) : ''].filter(Boolean).join('   —   ');
  var contact = [clinic.address, clinic.phone ? 'Tel: ' + clinic.phone : '', clinic.email].filter(Boolean).join('  ·  ');
  var hospital = clinic.name || clinic.name_en || clinic.name_fr ? clinicName(clinic, lang) : '';

  var lab = { border: LINE, fontWeight: 700, fontSize: '12.5pt', textAlign: 'center', padding: '0 4px', whiteSpace: 'nowrap' };
  var val = { border: LINE, fontSize: '12pt', textAlign: 'center', padding: '0 6px', wordBreak: 'break-word' };
  var band = { border: LINE, borderTop: 'none', textAlign: 'center', fontWeight: 700, fontSize: '17pt', padding: '4px 6px', lineHeight: 1.3 };

  return (
    <div style={{ position: 'relative', minHeight: PAGE, paddingBottom: '27mm', boxSizing: 'border-box', background: '#fff', color: '#000', fontFamily: FONT, pageBreakAfter: props.last === false ? 'always' : 'auto', breakAfter: props.last === false ? 'page' : 'auto' }}>
      {/* A table, so that its head line is printed again at the top of every following
          page of a long reading (the browser repeats a table's head): patient, chart
          number, exam. On the first page the big box is pulled up over it. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr><td style={{ height: 22, padding: '0 2px 4px', fontSize: '8.5pt', color: '#333', verticalAlign: 'bottom', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {[fullName, p.chart_no, v.exam_name, v.exam_date].filter(Boolean).join('   ·   ')}
          </td></tr>
        </thead>
        <tbody>
          <tr><td style={{ padding: 0 }}>
            <div style={{ marginTop: -22, position: 'relative', background: '#fff' }}>
              {/* 1. title and exam date | the patient */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', height: '140pt' }}>
                <colgroup><col style={{ width: '55%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14.5%' }} /><col style={{ width: '14.5%' }} /></colgroup>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ border: LINE, textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                      <div style={{ color: '#0000ff', fontWeight: 800, fontSize: lang === 'fr' ? '25pt' : '30pt', letterSpacing: 0.5, lineHeight: 1.15 }}>{L(T.title, lang)}</div>
                      <div style={{ fontWeight: 700, fontSize: '14pt', marginTop: 6 }}>{v.exam_date || ''}</div>
                    </td>
                    <td style={lab}>{L(T.name, lang)}</td>
                    <td colSpan={2} style={val}>{fullName}</td>
                  </tr>
                  <tr><td style={lab}>{L(T.id, lang)}</td><td colSpan={2} style={val}>{p.chart_no || ''}</td></tr>
                  <tr><td style={lab}>{L(T.sexAge, lang)}</td><td style={val}>{sex}</td><td style={val}>{age === '' ? '' : age}</td></tr>
                  <tr><td style={lab}>{L(T.dob, lang)}</td><td colSpan={2} style={val}>{fmtDate(p.date_of_birth)}</td></tr>
                </tbody>
              </table>
              {/* 2. the exam */}
              <div style={band}>{L(T.exam, lang)}</div>
              <div style={{ border: LINE, borderTop: 'none', padding: '5px 6px 7px', minHeight: '40pt' }}>
                <div style={{ fontSize: '13pt' }}>{v.exam_name || ''}{v.modality ? <span style={{ fontSize: '10pt', color: '#333' }}>{'   (' + v.modality + ')'}</span> : null}</div>
                {small ? <div style={{ fontSize: '8.5pt', color: '#444', marginTop: 3 }}>{small}</div> : null}
              </div>
              {/* 3. the reading - the box is as tall as the text */}
              <div style={band}>{L(T.reading, lang)}</div>
              <div style={{ border: LINE, borderTop: 'none', padding: '5px 6px 8px', fontSize: '9.5pt', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v.reading || ''}</div>
            </div>
          </td></tr>
        </tbody>
      </table>
      {/* 4. the foot of the page: the clinic, and who read it */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: '1 1 55%', textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '16pt', lineHeight: 1.2 }}>{hospital}</div>
            {contact ? <div style={{ fontSize: '8pt', color: '#333', marginTop: 2 }}>{contact}</div> : null}
          </div>
          <div style={{ flex: '1 1 45%', fontSize: '9.5pt' }}>
            <div><span style={{ fontWeight: 700 }}>{L(T.reader, lang)}</span> {v.read_by || ''}</div>
            <div style={{ color: '#333', fontSize: '8.5pt' }}>{stamp(v.read_at)}</div>
            <div style={{ marginTop: 16, borderTop: '1px solid #000', paddingTop: 2, fontSize: '8pt', color: '#333' }}>{L(DOC_LABELS.signature, lang)}</div>
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: '7.5pt', color: '#444', textAlign: 'right' }}>
          {L(T.docNo, lang) + colon}{props.docNo || '—'}{props.dateStr ? '   ·   ' + L(T.issued, lang) + ' ' + props.dateStr : ''}
        </div>
      </div>
    </div>
  );
}

export var IMAGING_REPORT_NAME = { ko: '영상 판독 보고서', en: 'Imaging report', fr: "Compte-rendu d'imagerie" };

export default {
  code: 'imaging-report',
  category: 'imaging',
  name: IMAGING_REPORT_NAME,
  fields: [],
  Layout: ImagingReportLayout,
};
