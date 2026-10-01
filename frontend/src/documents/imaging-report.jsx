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
//   values { exam_name, exam_date, reading, read_by, read_at } are printed. The list also
//   passes modality, image_count, dept and ordered_by: they stay in the issued record
//   (document_log) and are not on the sheet - the director took them off (2026-10-01).
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
  reader:    { fr: 'Médecin lecteur :', en: 'Read by:', ko: '판독의:' },
  issued:    { fr: 'Émis le', en: 'Issued', ko: '발행' },
};

var FONT = '"Segoe UI", "Malgun Gothic", "Noto Sans", Arial, sans-serif';
var LINE = '1.5px solid #000';
// The printable height of an A4 page inside printDocument()'s 14 mm margins is 269 mm;
// a little less, so that rounding never pushes the foot onto a page of its own.
var PAGE = '264mm';

// ── long names ───────────────────────────────────────────────────────────────
// A Malagasy name easily runs to forty or sixty letters. The sheet is read in another
// hospital, so a name is never cut ("…"): it gets smaller letters and more lines, broken
// between words - inside a word only when that one word is wider than its box.
// The sheet is laid out before it is printed and cannot measure itself, so the width of
// a text is estimated from its letters (capitals wide, i and l narrow, Korean a full em).
function emWidth(text) {
  // Per letter, in em - measured on Segoe UI and Arial, the wider of the two.
  var w = 0, s = String(text || '');
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), code = s.charCodeAt(i);
    if (code > 0x2E80) w += 1;
    else if (c === ' ') w += 0.28;
    else if (c === 'M') w += 0.9;
    else if (c === 'W') w += 0.95;
    else if (c === 'I') w += 0.28;
    else if (c >= 'A' && c <= 'Z') w += 0.68;
    else if (c === 'm') w += 0.86;
    else if (c === 'w') w += 0.73;
    else if ("ilj.,:;'’·".indexOf(c) >= 0) w += 0.26;
    else if ('tfr-()'.indexOf(c) >= 0) w += 0.35;
    else w += 0.56;
  }
  return w;
}
// Lines `text` takes in a box `widthPt` wide at `sizePt`, the way the browser breaks it
// (overflow-wrap: break-word): between words, and a word too wide for the box runs on.
export function linesAt(text, widthPt, sizePt, bold) {
  var max = widthPt / (sizePt * (bold ? 1.08 : 1)), words = String(text || '').split(/\s+/).filter(Boolean);
  var lines = 1, cur = 0;
  for (var i = 0; i < words.length; i++) {
    var ww = emWidth(words[i]);
    if (ww > max) {
      if (cur > 0) lines++;
      lines += Math.ceil(ww / max) - 1;
      cur = ww % max || max;
    } else if (cur > 0 && cur + 0.28 + ww > max) { lines++; cur = ww; }
    else cur += (cur > 0 ? 0.28 : 0) + ww;
  }
  return lines;
}
// The largest of `sizes` at which `text` fits `maxLines` lines - first looking for a size
// at which no word has to be broken, then accepting a broken word; the smallest if none.
export function fitSize(text, widthPt, maxLines, sizes, bold) {
  var w = widthPt * 0.97, words = String(text || '').split(/\s+/).filter(Boolean), widest = 0;
  for (var k = 0; k < words.length; k++) widest = Math.max(widest, emWidth(words[k]));
  for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < sizes.length; i++) {
      var whole = widest * sizes[i] * (bold ? 1.08 : 1) <= w;
      if ((whole || pass === 1) && linesAt(text, w, sizes[i], bold) <= maxLines(sizes[i])) return sizes[i];
    }
  }
  return sizes[sizes.length - 1];
}
var SHEET = 516;      // 182 mm, the printed width, in points

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
  var contact = [clinic.address, clinic.phone ? 'Tel: ' + clinic.phone : '', clinic.email].filter(Boolean).join('  ·  ');
  var hospital = clinic.name || clinic.name_en || clinic.name_fr ? clinicName(clinic, lang) : '';

  // The name's box is 29% of the sheet wide and one of four equal rows of the head box
  // (35pt each). Letters shrink 12 -> 9pt as the name needs two, then three lines - no
  // smaller: it is read by strangers. A name that still does not fit makes the four
  // rows grow together, never one alone.
  var nameW = SHEET * 0.29 - 14, rowPt = 35;
  var nameSize = fitSize(fullName, nameW, function (pt) { return Math.floor((rowPt - 3) / (pt * 1.18)); }, [12, 10.5, 9.5, 9]);
  var nameLines = linesAt(fullName, nameW * 0.97, nameSize);
  rowPt = Math.max(rowPt, Math.ceil(nameLines * nameSize * 1.18 + 3));
  // The line repeated at the top of every following page: as many lines as it needs.
  var runText = [fullName, p.chart_no, v.exam_name, v.exam_date].filter(Boolean).join('   ·   ');
  var runPx = 10 + 12 * Math.min(4, linesAt(runText, (SHEET - 4) * 0.97, 8.5));
  // The foot of the page: the clinic's name shrinks before it takes a third line, and
  // the room kept for the foot grows with what is in it.
  var footL = SHEET * 0.55 - 14, footR = SHEET * 0.45;
  var clinicSize = fitSize(hospital, footL, function () { return 2; }, [16, 14, 12.5, 11, 10], true);
  var footPt = Math.max(
    linesAt(hospital, footL * 0.97, clinicSize, true) * clinicSize * 1.2 + (contact ? linesAt(contact, footL * 0.97, 8) * 8 * 1.35 + 2 : 0),
    linesAt(L(T.reader, lang) + ' ' + (v.read_by || ''), footR * 0.97, 9.5) * 9.5 * 1.4 + 8.5 * 1.4 + 16 + 14) + 6 + 12 + 14;

  var lab = { border: LINE, fontWeight: 700, fontSize: '12.5pt', textAlign: 'center', padding: '0 4px', whiteSpace: 'nowrap', height: rowPt + 'pt' };
  var val = { border: LINE, fontSize: '12pt', textAlign: 'center', padding: '0 6px', overflowWrap: 'break-word', wordBreak: 'normal' };
  var nameCell = Object.assign({}, val, { fontSize: nameSize + 'pt', lineHeight: 1.18, padding: '2px 6px' });
  var band = { border: LINE, borderTop: 'none', textAlign: 'center', fontWeight: 700, fontSize: '17pt', padding: '4px 6px', lineHeight: 1.3 };

  return (
    <div style={{ position: 'relative', minHeight: PAGE, paddingBottom: Math.max(76, Math.ceil(footPt)) + 'pt', boxSizing: 'border-box', background: '#fff', color: '#000', fontFamily: FONT, pageBreakAfter: props.last === false ? 'always' : 'auto', breakAfter: props.last === false ? 'page' : 'auto' }}>
      {/* A table, so that its head line is printed again at the top of every following
          page of a long reading (the browser repeats a table's head): patient, chart
          number, exam. On the first page the big box is pulled up over it. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr><td style={{ height: runPx, padding: '0 2px 4px', fontSize: '8.5pt', lineHeight: '12px', color: '#333', verticalAlign: 'bottom', overflowWrap: 'break-word' }}>
            {runText}
          </td></tr>
        </thead>
        <tbody>
          <tr><td style={{ padding: 0 }}>
            <div style={{ marginTop: -runPx, position: 'relative', background: '#fff' }}>
              {/* 1. title and exam date | the patient */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', height: (rowPt * 4) + 'pt' }}>
                <colgroup><col style={{ width: '55%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14.5%' }} /><col style={{ width: '14.5%' }} /></colgroup>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ border: LINE, textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                      <div style={{ color: '#0000ff', fontWeight: 800, fontSize: lang === 'fr' ? '25pt' : '30pt', letterSpacing: 0.5, lineHeight: 1.15 }}>{L(T.title, lang)}</div>
                      <div style={{ fontWeight: 700, fontSize: '14pt', marginTop: 6 }}>{v.exam_date || ''}</div>
                    </td>
                    <td style={lab}>{L(T.name, lang)}</td>
                    <td colSpan={2} style={nameCell}>{fullName}</td>
                  </tr>
                  <tr><td style={lab}>{L(T.id, lang)}</td><td colSpan={2} style={val}>{p.chart_no || ''}</td></tr>
                  <tr><td style={lab}>{L(T.sexAge, lang)}</td><td style={val}>{sex}</td><td style={val}>{age === '' ? '' : age}</td></tr>
                  <tr><td style={lab}>{L(T.dob, lang)}</td><td colSpan={2} style={val}>{fmtDate(p.date_of_birth)}</td></tr>
                </tbody>
              </table>
              {/* 2. the exam */}
              <div style={band}>{L(T.exam, lang)}</div>
              <div style={{ border: LINE, borderTop: 'none', padding: '5px 6px 7px', minHeight: '40pt' }}>
                {/* The exam's name alone (director, 2026-10-01): the modality code beside it - «(CR)» -
                    said nothing to the hospital that receives the report; the form it follows has none. */}
                <div style={{ fontSize: '13pt', overflowWrap: 'break-word' }}>{v.exam_name || ''}</div>
                {/* No second line (ordered by - number of images): the director took it out,
                    2026-10-01 - the form it follows has the exam's name alone. */}
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
          <div style={{ flex: '0 0 55%', minWidth: 0, textAlign: 'right', overflowWrap: 'break-word' }}>
            <div style={{ fontWeight: 800, fontSize: clinicSize + 'pt', lineHeight: 1.2 }}>{hospital}</div>
            {contact ? <div style={{ fontSize: '8pt', color: '#333', marginTop: 2 }}>{contact}</div> : null}
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0, fontSize: '9.5pt', overflowWrap: 'break-word' }}>
            <div><span style={{ fontWeight: 700 }}>{L(T.reader, lang)}</span> {v.read_by || ''}</div>
            <div style={{ color: '#333', fontSize: '8.5pt' }}>{stamp(v.read_at)}</div>
            <div style={{ marginTop: 16, borderTop: '1px solid #000', paddingTop: 2, fontSize: '8pt', color: '#333' }}>{L(DOC_LABELS.signature, lang)}</div>
          </div>
        </div>
        {/* When it was printed - not the document number: that is for the clinic's own
            records (documents history, change log) and means nothing to the hospital
            that receives the sheet (director, 2026-10-01). props.docNo is not printed. */}
        <div style={{ marginTop: 6, fontSize: '7.5pt', color: '#444', textAlign: 'right', minHeight: '9pt' }}>
          {props.dateStr ? L(T.issued, lang) + ' ' + props.dateStr : ''}
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
