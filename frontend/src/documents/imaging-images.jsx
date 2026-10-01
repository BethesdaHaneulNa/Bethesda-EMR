// An exam's images on paper: A4 sheets with 1, 2, 4 or 6 pictures each (director,
// 2026-10-01: «마다 많은 병원이 그냥 프린터로 뽑아 주는 걸로 안다» - many hospitals hand
// the films over as printed sheets). The head of every page says whose pictures they are
// and of which exam; the foot says they are for reference, when the sheet was printed
// and which page it is.
//
// It has the document engine's template shape (code, name, Layout taking values /
// patient / clinic / lang / docNo / dateStr) and is issued through POST /api/documents,
// but it is printed from the imaging list (components/ImagesPrint.jsx): the pictures are
// chosen there.
//   values { exam_name, exam_date, order_item_id, per_page, clarity,
//            images: [{ id, series, number, frames, desc }] }
// The issued record keeps which pictures were printed, never the pictures themselves:
// a sheet opened again from the documents history asks the image server for them again
// (usePictures below). props.pictures - { id: data URL } - is what the print window has
// already loaded; with it nothing is fetched here.
// The document number is not printed (like the imaging report: it means nothing to the
// hospital that receives the sheet).
import { useState, useEffect } from 'react';
import { L, calcAge, clinicName, DOC_LABELS } from './shared.jsx';
import { fitSize } from './imaging-report.jsx';

var T = {
  title:   { fr: 'IMAGES', en: 'IMAGES', ko: 'IMAGES' },
  name:    { fr: 'NOM', en: 'NAME', ko: 'NAME' },
  id:      { fr: 'N° dossier', en: 'ID', ko: 'ID' },
  sexAge:  { fr: 'Sexe, Âge', en: 'Sex,Age', ko: 'Sex,Age' },
  exam:    { fr: 'Examen', en: 'Exam', ko: 'Exam' },
  date:    { fr: 'Date', en: 'Date', ko: 'Date' },
  note:    { fr: 'Images de référence — non destinées au diagnostic', en: 'Reference images — not for diagnosis', ko: '참고용 영상 — 진단용이 아님' },
  issued:  { fr: 'Émis le', en: 'Issued', ko: '발행' },
  frames:  { fr: '1re image de {n}', en: 'first of {n} frames', ko: '{n}프레임 중 첫 장' },
  loading: { fr: 'Chargement…', en: 'Loading…', ko: '불러오는 중…' },
  missing: { fr: 'Image indisponible', en: 'Picture not available', ko: '그림을 가져오지 못함' },
};

var FONT = '"Segoe UI", "Malgun Gothic", "Noto Sans", Arial, sans-serif';
var LINE = '1.2px solid #000';
var PAGE = '264mm';        // the printable height inside printDocument()'s 14 mm margins, less a little (imaging-report.jsx)
var SHEET = 516;           // 182 mm in points

export var PER_PAGE = [1, 2, 4, 6];
// columns x rows of a page (portrait A4)
var GRID = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] };
// How wide a picture is asked for: a column of the page at about 220 dots per inch.
export function pictureWidth(perPage) { return perPage > 2 ? 1000 : 1600; }

// ── the pictures ─────────────────────────────────────────────────────────────
// One picture from the EMR (GET /api/pacs/export/image), as an <img> element. The login
// token rides in a header, so it cannot be an <img src> - it is fetched and kept as an
// object URL for as long as the page lives.
var cache = {};            // "order:id:w" -> Promise<HTMLImageElement>
export function loadPicture(orderItemId, id, w) {
  var key = orderItemId + ':' + id + ':' + w;
  if (cache[key]) return cache[key];
  var token = null; try { token = localStorage.getItem('medconnect_token'); } catch (e) { /* no storage */ }
  var p = fetch('/api/pacs/export/image?order_item_id=' + encodeURIComponent(orderItemId) + '&instance=' + encodeURIComponent(id) + '&w=' + w,
    { headers: token ? { Authorization: 'Bearer ' + token } : {} })
    .then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error(j.error || 'HTTP ' + r.status); e.code = j.code; e.status = r.status; throw e; });
      return r.blob();
    })
    .then(function (blob) {
      return new Promise(function (ok, no) {
        var img = new Image();
        img.onload = function () { ok(img); };
        img.onerror = function () { no(new Error('not a picture')); };
        img.src = URL.createObjectURL(blob);
      });
    });
  // A failure is not remembered: the next look asks again.
  p.catch(function () { delete cache[key]; });
  cache[key] = p;
  return p;
}

// Ultrasound and X-ray are dark: on a black-and-white laser printer the greys clog into
// black. `clarity` lifts the dark and middle greys (a gamma curve) on the printed copy
// only - the image itself is never changed. 0 = as it is, 1 = lighter, 2 = lighter still.
export var CLARITY = [1, 1.45, 2.0];
export function toPaper(img, clarity) {
  var c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  var g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  var gamma = CLARITY[clarity] || 1;
  if (gamma !== 1) {
    var lut = new Uint8ClampedArray(256);
    for (var i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, 1 / gamma));
    var d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for (var k = 0; k < px.length; k += 4) { px[k] = lut[px[k]]; px[k + 1] = lut[px[k + 1]]; px[k + 2] = lut[px[k + 2]]; }
    g.putImageData(d, 0, 0);
  }
  return c.toDataURL('image/jpeg', 0.9);
}

// { id: data URL | 'error' } for the pictures of `images`, filled in as they arrive.
// What was made for the paper is kept (by picture, width and clarity), so ticking one
// more picture or going back to a layout does not make the others again.
var paper = {};            // "order:id:w:clarity" -> data URL | 'error'
export function forgetPictures() {
  Object.keys(cache).forEach(function (k) { cache[k].then(function (img) { URL.revokeObjectURL(img.src); }, function () {}); });
  cache = {}; paper = {};
}
export function usePictures(orderItemId, images, perPage, clarity, off) {
  var st = useState(0), setTick = st[1];
  var ids = (images || []).map(function (x) { return x.id; }).join(','), w = pictureWidth(perPage);
  var key = function (id) { return orderItemId + ':' + id + ':' + w + ':' + (clarity || 0); };
  useEffect(function () {
    if (off || !orderItemId || !ids) return;
    var alive = true;
    ids.split(',').forEach(function (id) {
      var k = key(id);
      if (paper[k] === 'error') delete paper[k];          // asked again on every look
      if (paper[k]) return;
      loadPicture(orderItemId, id, w)
        .then(function (img) { return toPaper(img, clarity || 0); }, function () { return 'error'; })
        .then(function (url) { paper[k] = url; if (alive) setTick(function (n) { return n + 1; }); });
    });
    return function () { alive = false; };
  }, [orderItemId, ids, w, clarity, off]);
  var out = {};
  if (!off) (images || []).forEach(function (x) { if (paper[key(x.id)]) out[x.id] = paper[key(x.id)]; });
  return out;
}

// "S2 · 5 — Liver (1re image de 24)": series and image number as the device gave them.
export function pictureLabel(im, lang) {
  var s = (im.series == null ? '' : 'S' + im.series) + (im.series != null && im.number != null ? ' · ' : '') + (im.number == null ? '' : String(im.number));
  if (im.desc) s += (s ? ' — ' : '') + im.desc;
  if (im.frames > 1) s += (s ? ' ' : '') + '(' + L(T.frames, lang).replace('{n}', im.frames) + ')';
  return s;
}

export function ImagingImagesLayout(props) {
  var v = props.values || {}, p = props.patient || {}, clinic = props.clinic || {}, lang = props.lang || 'fr';
  var images = v.images || [], per = GRID[v.per_page] ? v.per_page : 2, grid = GRID[per];
  // The print window passes what it has loaded; a sheet drawn again from the documents
  // history loads its pictures here.
  var own = usePictures(v.order_item_id, images, per, v.clarity || 0, !!props.pictures);
  var pics = props.pictures || own;

  var fullName = ((p.last_name || '') + ' ' + (p.first_name || '')).trim();
  var sex = p.gender === 'M' ? L(DOC_LABELS.male, lang) : p.gender === 'F' ? L(DOC_LABELS.female, lang) : '';
  var age = calcAge(p.date_of_birth);
  var hospital = clinic.name || clinic.name_en || clinic.name_fr ? clinicName(clinic, lang) : '';
  var contact = [clinic.address, clinic.phone ? 'Tel: ' + clinic.phone : ''].filter(Boolean).join('  ·  ');

  // Long names are never cut: smaller letters first, then more lines (imaging-report.jsx).
  var nameW = SHEET * 0.46 - 12, examW = SHEET * 0.60 - 12;
  var nameSize = fitSize(fullName, nameW, function () { return 2; }, [11.5, 10.5, 9.5, 9]);
  var examSize = fitSize(v.exam_name, examW, function () { return 2; }, [11.5, 10.5, 9.5, 9]);
  var clinicSize = fitSize(hospital, SHEET * 0.68, function () { return 2; }, [14, 12.5, 11, 10], true);

  var pages = [];
  for (var i = 0; i < images.length; i += per) pages.push(images.slice(i, i + per));
  if (!pages.length) pages.push([]);

  var lab = { border: LINE, fontWeight: 700, fontSize: '9.5pt', textAlign: 'center', padding: '3px 4px', whiteSpace: 'nowrap', width: '1%' };
  var val = { border: LINE, fontSize: '11pt', padding: '3px 7px', overflowWrap: 'break-word', wordBreak: 'normal' };

  return (
    <div style={{ color: '#000', fontFamily: FONT }}>
      {pages.map(function (page, n) {
        var last = n === pages.length - 1;
        return (
          <div key={n} className="px-img-page" style={{ height: PAGE, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', background: '#fff',
            pageBreakAfter: last && props.last !== false ? 'auto' : 'always', breakAfter: last && props.last !== false ? 'auto' : 'page' }}>
            {/* the head: the clinic and the title, then whose pictures and of which exam */}
            <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 5 }}>
              <div style={{ flex: '1 1 0', minWidth: 0, overflowWrap: 'break-word' }}>
                <div style={{ fontWeight: 800, fontSize: clinicSize + 'pt', lineHeight: 1.2 }}>{hospital}</div>
                {contact ? <div style={{ fontSize: '7.5pt', color: '#333', marginTop: 1 }}>{contact}</div> : null}
              </div>
              <div style={{ flex: 'none', color: '#0000ff', fontWeight: 800, fontSize: '19pt', letterSpacing: 0.5, lineHeight: 1 }}>{L(T.title, lang)}</div>
            </div>
            <table style={{ flex: 'none', width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={lab}>{L(T.name, lang)}</td>
                  <td style={Object.assign({}, val, { fontSize: nameSize + 'pt', fontWeight: 700, lineHeight: 1.18, width: '46%' })}>{fullName}</td>
                  <td style={lab}>{L(T.id, lang)}</td>
                  <td style={Object.assign({}, val, { whiteSpace: 'nowrap' })}>{p.chart_no || ''}</td>
                  <td style={lab}>{L(T.sexAge, lang)}</td>
                  <td style={Object.assign({}, val, { whiteSpace: 'nowrap' })}>{[sex, age === '' ? '' : age].filter(function (x) { return x !== ''; }).join(' · ')}</td>
                </tr>
                <tr>
                  <td style={lab}>{L(T.exam, lang)}</td>
                  <td colSpan={3} style={Object.assign({}, val, { fontSize: examSize + 'pt', lineHeight: 1.18 })}>{v.exam_name || ''}</td>
                  <td style={lab}>{L(T.date, lang)}</td>
                  <td style={Object.assign({}, val, { whiteSpace: 'nowrap' })}>{v.exam_date || ''}</td>
                </tr>
              </tbody>
            </table>
            {/* the pictures: each keeps its proportions inside its box - none is cropped */}
            <div style={{ flex: '1 1 0', minHeight: 0, marginTop: 6, display: 'grid', gap: '5px',
              gridTemplateColumns: 'repeat(' + grid[0] + ', minmax(0, 1fr))', gridTemplateRows: 'repeat(' + grid[1] + ', minmax(0, 1fr))' }}>
              {page.map(function (im) {
                var src = pics[im.id];
                return (
                  <div key={im.id} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '0.6px solid #888' }}>
                    <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {src && src !== 'error'
                        ? <img src={src} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: '9pt', color: '#555' }}>{src === 'error' ? L(T.missing, lang) : L(T.loading, lang)}</span>}
                    </div>
                    <div style={{ flex: 'none', fontSize: '7.5pt', lineHeight: 1.25, color: '#222', padding: '1px 4px 2px', borderTop: '0.6px solid #888', overflowWrap: 'break-word' }}>
                      {pictureLabel(im, lang) || ' '}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* the foot: what these sheets are for, when they were printed, the page */}
            <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4, fontSize: '7.5pt', color: '#333' }}>
              <span style={{ flex: '1 1 0', minWidth: 0, fontWeight: 700 }}>{L(T.note, lang)}</span>
              <span style={{ flex: 'none' }}>{props.dateStr ? L(T.issued, lang) + ' ' + props.dateStr + '   ·   ' : ''}{(n + 1) + ' / ' + pages.length}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export var IMAGING_IMAGES_NAME = { ko: '검사 영상 인쇄', en: 'Exam images', fr: "Images de l'examen" };

export default {
  code: 'imaging-images',
  category: 'imaging',
  name: IMAGING_IMAGES_NAME,
  fields: [],
  Layout: ImagingImagesLayout,
};
