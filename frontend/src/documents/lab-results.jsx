// Laboratory results sheet: the results of the days the doctor ticked, on A4, to go with
// a patient referred to another hospital (director, 2026-10-01: the lab results window
// gets the good points of the imaging list - print among them). The frame is the imaging
// report's (imaging-report.jsx): a ruled head box - the title and the dates on the left,
// the patient's four lines on the right - and at the foot of the page the clinic, who
// entered the results, and when the sheet was printed. No document number on the paper
// (the director took it off the imaging report: it means nothing to the hospital that
// receives the sheet); it is kept in the issued record.
//
// The days stand side by side, as on the screen, so that a trend can be read: up to four
// columns on a sheet, a further sheet for the next four.
//
// It has the document engine's template shape and is issued through POST /api/documents,
// but it is printed from the lab results window (components/LabResults.jsx), not from the
// documents window - there is nothing to fill in: every value comes from the results.
//   values {
//     columns: [{ date, n, time, by }]      one per ticked day (n: 1,2.. when a test was
//                                           repeated that day, else 0; time: when entered,
//                                           for a repeat; by: who entered it)
//     panels:  [{ name, items: [{ name, unit, ref, cells: [null | { value, flag, ref }] }] }]
//                                           cells run with columns; a cell's own `ref` is
//                                           set only when it was judged by another range
//                                           than the row's (a child grown into the next
//                                           age band, a range edited since)
//   }
import { L, fmtDate, calcAge, clinicName, DOC_LABELS } from './shared.jsx';

// The labels are the form's own. Korean keeps the English labels, as the imaging report does.
var T = {
  title:   { fr: "RÉSULTATS D'ANALYSES", en: 'LABORATORY RESULTS', ko: 'LABORATORY RESULTS' },
  name:    { fr: 'NOM', en: 'NAME', ko: 'NAME' },
  id:      { fr: 'N° dossier', en: 'ID', ko: 'ID' },
  sexAge:  { fr: 'Sexe, Âge', en: 'Sex,Age', ko: 'Sex,Age' },
  dob:     { fr: 'Né(e) le', en: 'Birthday', ko: 'Birthday' },
  test:    { fr: 'Analyse', en: 'Test', ko: 'Test' },
  result:  { fr: 'Résultat', en: 'Result', ko: 'Result' },
  unit:    { fr: 'Unité', en: 'Unit', ko: 'Unit' },
  ref:     { fr: 'Valeurs de référence', en: 'Reference range', ko: 'Reference range' },
  ownRef:  { fr: 'réf.', en: 'ref.', ko: 'ref.' },
  legend:  { fr: 'H = élevé  ·  L = bas  ·  * = anormal', en: 'H = high  ·  L = low  ·  * = abnormal', ko: 'H = 높음  ·  L = 낮음  ·  * = 이상' },
  by:      { fr: 'Résultats saisis par :', en: 'Results entered by:', ko: '결과 입력:' },
  issued:  { fr: 'Émis le', en: 'Issued', ko: '발행' },
  page:    { fr: 'Feuille', en: 'Sheet', ko: 'Sheet' },
};

var FONT = '"Segoe UI", "Malgun Gothic", "Noto Sans", Arial, sans-serif';
var LINE = '1.5px solid #000';
var THIN = '0.75px solid #000';
var PAGE = '264mm';   // the printable height of an A4 page inside printDocument()'s margins, a little less
var SHEET = 516;      // 182 mm, the printed width, in points
export var LAB_SHEET_COLUMNS = 4;   // days side by side on one sheet

// ── long names ───────────────────────────────────────────────────────────────
// Same rule and same estimate as the imaging report (imaging-report.jsx): a name is never
// cut - it gets smaller letters and more lines, broken between words. The sheet cannot
// measure itself before it is printed, so a text's width is estimated from its letters.
// (Kept as a copy here: that file is the PACS session's. If either changes, move both to
// shared.jsx.)
function emWidth(text) {
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
function linesAt(text, widthPt, sizePt, bold) {
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
function fitSize(text, widthPt, maxLines, sizes, bold) {
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

// The letter printed after a value: a printer has no colours, and ▲ ▼ are not in every font.
function flagLetter(flag) { return flag === 'high' ? 'H' : flag === 'low' ? 'L' : flag === 'abnormal' ? '*' : ''; }

// Column widths (%) of the results table: test | one column per day | unit | reference.
function widths(n) {
  if (n <= 1) return { test: 38, day: 22, unit: 14, ref: 26 };
  if (n === 2) return { test: 33, day: 16, unit: 13, ref: 22 };
  if (n === 3) return { test: 29, day: 13, unit: 12, ref: 20 };
  return { test: 22, day: 12, unit: 11, ref: 19 };
}

// One sheet: the head box, the table of up to LAB_SHEET_COLUMNS days, the foot.
function Sheet(props) {
  var p = props.patient || {}, clinic = props.clinic || {}, lang = props.lang || 'fr';
  var cols = props.columns, panels = props.panels;
  var fullName = ((p.last_name || '') + ' ' + (p.first_name || '')).trim();
  var sex = p.gender === 'M' ? L(DOC_LABELS.male, lang) : p.gender === 'F' ? L(DOC_LABELS.female, lang) : '';
  var age = calcAge(p.date_of_birth);
  var contact = [clinic.address, clinic.phone ? 'Tel: ' + clinic.phone : '', clinic.email].filter(Boolean).join('  ·  ');
  var hospital = clinic.name || clinic.name_en || clinic.name_fr ? clinicName(clinic, lang) : '';

  // the days on this sheet, as the head box says them: one day, or the first and the last
  var days = cols.map(function (c) { return c.date; }).filter(function (d, i, a) { return d && a.indexOf(d) === i; }).sort();
  var dayText = days.length <= 1 ? (days[0] || '') : days[0] + '  →  ' + days[days.length - 1];

  // who entered what is on this sheet: one name, or each name with its days
  var byName = {};
  cols.forEach(function (c) { String(c.by || '').split(', ').filter(Boolean).forEach(function (n) { (byName[n] = byName[n] || []).push(c.date); }); });
  var names = Object.keys(byName);
  var byText = names.length <= 1 ? (names[0] || '') : names.map(function (n) {
    return n + ' (' + byName[n].filter(function (d, i, a) { return a.indexOf(d) === i; }).join(', ') + ')';
  }).join(' · ');

  // The head box and the foot: the same arithmetic as the imaging report's.
  var nameW = SHEET * 0.29 - 14, rowPt = 30;
  var nameSize = fitSize(fullName, nameW, function (pt) { return Math.floor((rowPt - 3) / (pt * 1.18)); }, [12, 10.5, 9.5, 9]);
  var nameLines = linesAt(fullName, nameW * 0.97, nameSize);
  rowPt = Math.max(rowPt, Math.ceil(nameLines * nameSize * 1.18 + 3));
  var runText = [fullName, p.chart_no, L(T.title, lang), dayText].filter(Boolean).join('   ·   ');
  var runPx = 10 + 12 * Math.min(4, linesAt(runText, (SHEET - 4) * 0.97, 8.5));
  var footL = SHEET * 0.55 - 14, footR = SHEET * 0.45;
  var clinicSize = fitSize(hospital, footL, function () { return 2; }, [16, 14, 12.5, 11, 10], true);
  var footPt = Math.max(
    linesAt(hospital, footL * 0.97, clinicSize, true) * clinicSize * 1.2 + (contact ? linesAt(contact, footL * 0.97, 8) * 8 * 1.35 + 2 : 0),
    linesAt(L(T.by, lang) + ' ' + byText, footR * 0.97, 9.5) * 9.5 * 1.4 + 16 + 14) + 6 + 12 + 14;

  var lab = { border: LINE, fontWeight: 700, fontSize: '11.5pt', textAlign: 'center', padding: '0 4px', whiteSpace: 'nowrap', height: rowPt + 'pt' };
  var val = { border: LINE, fontSize: '11.5pt', textAlign: 'center', padding: '0 6px', overflowWrap: 'break-word', wordBreak: 'normal' };
  var nameCell = Object.assign({}, val, { fontSize: nameSize + 'pt', lineHeight: 1.18, padding: '2px 6px' });

  var W = widths(cols.length);
  var hd = { border: LINE, fontWeight: 700, fontSize: '9.5pt', padding: '4px 5px', textAlign: 'center', lineHeight: 1.25, background: '#f0f0f0' };
  var td = { borderLeft: LINE, borderRight: LINE, borderBottom: THIN, fontSize: '10.5pt', padding: '3px 6px', overflowWrap: 'break-word', verticalAlign: 'middle', lineHeight: 1.3 };
  var span = 3 + cols.length;

  return (
    <div style={{ position: 'relative', minHeight: PAGE, paddingBottom: Math.max(76, Math.ceil(footPt)) + 'pt', boxSizing: 'border-box', background: '#fff', color: '#000', fontFamily: FONT, pageBreakAfter: props.last ? 'auto' : 'always', breakAfter: props.last ? 'auto' : 'page' }}>
      {/* 1. title and days | the patient. It lies over the table's first head line, which
          is there for the following pages of a long table (see below). */}
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', marginBottom: -runPx }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', height: (rowPt * 4) + 'pt' }}>
          <colgroup><col style={{ width: '55%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14.5%' }} /><col style={{ width: '14.5%' }} /></colgroup>
          <tbody>
            <tr>
              <td rowSpan={4} style={{ border: LINE, textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
                <div style={{ color: '#0000ff', fontWeight: 800, fontSize: lang === 'fr' ? '21pt' : '22pt', letterSpacing: 0.5, lineHeight: 1.15 }}>{L(T.title, lang)}</div>
                <div style={{ fontWeight: 700, fontSize: '13pt', marginTop: 6 }}>{dayText}</div>
                {props.count > 1 ? <div style={{ fontSize: '8.5pt', color: '#333', marginTop: 3 }}>{L(T.page, lang)} {props.index + 1} / {props.count}</div> : null}
              </td>
              <td style={lab}>{L(T.name, lang)}</td>
              <td colSpan={2} style={nameCell}>{fullName}</td>
            </tr>
            <tr><td style={lab}>{L(T.id, lang)}</td><td colSpan={2} style={val}>{p.chart_no || ''}</td></tr>
            <tr><td style={lab}>{L(T.sexAge, lang)}</td><td style={val}>{sex}</td><td style={val}>{age === '' ? '' : age}</td></tr>
            <tr><td style={lab}>{L(T.dob, lang)}</td><td colSpan={2} style={val}>{fmtDate(p.date_of_birth)}</td></tr>
          </tbody>
        </table>
      </div>
      {/* 2. the results. The browser prints a table's head again at the top of every page
          the table runs onto: a line saying whose sheet it is, and the column heads. On
          the first page that line is under the head box. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: W.test + '%' }} />
          {cols.map(function (c, i) { return <col key={i} style={{ width: W.day + '%' }} />; })}
          <col style={{ width: W.unit + '%' }} /><col style={{ width: W.ref + '%' }} />
        </colgroup>
        <thead>
          <tr><td colSpan={span} style={{ height: runPx, padding: '0 2px 4px', fontSize: '8.5pt', lineHeight: '12px', color: '#333', verticalAlign: 'bottom', overflowWrap: 'break-word' }}>{runText}</td></tr>
          <tr>
            <td style={Object.assign({}, hd, { textAlign: 'left' })}>{L(T.test, lang)}</td>
            {cols.map(function (c, i) {
              return <td key={i} style={hd}>
                {cols.length > 1 || c.n ? <div>{c.date}{c.n ? ' (' + c.n + ')' : ''}</div> : <div>{L(T.result, lang)}</div>}
                {c.time ? <div style={{ fontWeight: 400, fontSize: '8pt' }}>{c.time}</div> : null}
              </td>;
            })}
            <td style={hd}>{L(T.unit, lang)}</td>
            <td style={hd}>{L(T.ref, lang)}</td>
          </tr>
        </thead>
        <tbody>
          {panels.map(function (P, pi) {
            return [
              <tr key={'p' + pi} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}><td colSpan={span} style={{ border: LINE, fontWeight: 800, fontSize: '10.5pt', padding: '3px 6px', background: '#f7f7f7' }}>{P.name}</td></tr>,
            ].concat(P.items.map(function (it, ii) {
              return <tr key={'p' + pi + 'i' + ii} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={Object.assign({}, td, { fontWeight: 600 })}>{it.name}</td>
                {it.cells.map(function (c, ci) {
                  var letter = c ? flagLetter(c.flag) : '';
                  return <td key={ci} style={Object.assign({}, td, { textAlign: 'center' })}>
                    {c ? <span style={{ fontWeight: letter ? 800 : 400 }}>{c.value}{letter ? <span style={{ marginLeft: 4 }}>{letter}</span> : null}</span> : ''}
                    {c && c.ref ? <div style={{ fontSize: '7.5pt', color: '#333' }}>{L(T.ownRef, lang)} {c.ref}</div> : null}
                  </td>;
                })}
                <td style={Object.assign({}, td, { textAlign: 'center', fontSize: '9.5pt' })}>{it.unit || ''}</td>
                <td style={Object.assign({}, td, { textAlign: 'center', fontSize: '9.5pt' })}>{it.ref || ''}</td>
              </tr>;
            }));
          })}
          <tr><td colSpan={span} style={{ borderTop: LINE, padding: '4px 2px 0', fontSize: '8pt', color: '#333' }}>{L(T.legend, lang)}</td></tr>
        </tbody>
      </table>
      {/* 3. the foot of the page: the clinic, and who entered the results */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: '0 0 55%', minWidth: 0, textAlign: 'right', overflowWrap: 'break-word' }}>
            <div style={{ fontWeight: 800, fontSize: clinicSize + 'pt', lineHeight: 1.2 }}>{hospital}</div>
            {contact ? <div style={{ fontSize: '8pt', color: '#333', marginTop: 2 }}>{contact}</div> : null}
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0, fontSize: '9.5pt', overflowWrap: 'break-word' }}>
            <div><span style={{ fontWeight: 700 }}>{L(T.by, lang)}</span> {byText}</div>
            <div style={{ marginTop: 16, borderTop: '1px solid #000', paddingTop: 2, fontSize: '8pt', color: '#333' }}>{L(DOC_LABELS.signature, lang)}</div>
          </div>
        </div>
        {/* When it was printed - not the document number (props.docNo is not printed). */}
        <div style={{ marginTop: 6, fontSize: '7.5pt', color: '#444', textAlign: 'right', minHeight: '9pt' }}>
          {props.dateStr ? L(T.issued, lang) + ' ' + props.dateStr : ''}
        </div>
      </div>
    </div>
  );
}

export function LabResultsLayout(props) {
  var v = props.values || {}, columns = v.columns || [], panels = v.panels || [];
  // up to LAB_SHEET_COLUMNS days on a sheet; a sheet carries only the rows that have a
  // value on one of its days
  var sheets = [];
  for (var from = 0; from < Math.max(columns.length, 1); from += LAB_SHEET_COLUMNS) {
    var to = Math.min(from + LAB_SHEET_COLUMNS, columns.length);
    var part = panels.map(function (P) {
      return { name: P.name, items: (P.items || []).map(function (it) {
        return { name: it.name, unit: it.unit, ref: it.ref, cells: (it.cells || []).slice(from, to) };
      }).filter(function (it) { return it.cells.some(function (c) { return !!c; }); }) };
    }).filter(function (P) { return P.items.length; });
    sheets.push({ columns: columns.slice(from, to), panels: part });
  }
  return (
    <div>
      {sheets.map(function (s, i) {
        return <Sheet key={i} index={i} count={sheets.length} columns={s.columns} panels={s.panels}
          patient={props.patient} clinic={props.clinic} lang={props.lang} dateStr={props.dateStr}
          last={i === sheets.length - 1 && props.last !== false} />;
      })}
    </div>
  );
}

export var LAB_RESULTS_NAME = { ko: '검사 결과지', en: 'Laboratory results', fr: "Résultats d'analyses" };

export default {
  code: 'lab-results',
  category: 'lab',
  name: LAB_RESULTS_NAME,
  fields: [],
  Layout: LabResultsLayout,
};
