// Builds drug-import-review.csv: the table the manager checks before the 105 lines
// of the old stock program are brought into the EMR drug list. Reads
// old-stock-inventory-2026-05-15.csv (never changes it) and changes no data.
//
//   node wiki/reference/drug-import-review.js
//
// One row per drug code (batches of the same code are added up). Rows that need a
// look come first. Nothing here is a medical decision: the daily total is left for
// the doctors, and the "for reference" daily total is plain arithmetic on the old
// program's own posology text. Plan: wiki/handoff/pharmacy.md, "옛 재고 105줄".
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'old-stock-inventory-2026-05-15.csv');
const OUT = path.join(__dirname, 'drug-import-review.csv');

function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.length > 1);
}

// Old classification -> EMR category (stored in English, translated on screen).
const CATEGORY = {
  'Gastrointestinal': 'GI',
  'Respiratory': 'Respiratory',
  'Analgesic / Antipyretic': 'Analgesic',
  'Analgesic / Anti-inflammatory': 'Analgesic',
  'Dermatology / Wound Care': 'Dermatology',
  'Dermatology': 'Dermatology',
  'Cardiovascular': 'Cardiovascular',
  'Antihistamine / Allergy': 'Antihistamine',
  'Antihistamine / Antiemetic': 'Antihistamine',
  'Obstetrics / Gynecology': 'Gynecology',
  'Antibiotic': 'Antibiotic',
  'Antibiotic / Antiprotozoal': 'Antibiotic',
  'Antiparasitic': 'Antiparasitic',
  'Ophthalmic': 'Ophthalmic',
  'Vitamins / Supplements': 'Vitamin',
  'Musculoskeletal': 'Musculoskeletal',
  'Corticosteroid': 'Corticosteroid',
  'Antimalarial': 'Antimalarial',
  'Urology': 'Urology',
  'Endocrine / Antidiabetic': 'Endocrine',
  'Dental / Oral': 'Other',
};

// The old program's form column is wrong on several lines (tablets filed as eye
// drops). Only where the name plainly says otherwise is it corrected here; the
// rest are flagged for a person to decide.
function correctedForm(r) {
  const n = (r.name + ' ' + r.generic_name).toLowerCase();
  if (/eye drop|ophthalmic/.test(n)) return { form: 'Ophthalmic', note: '' };
  if (/\bsupp\b|suppositor/.test(n)) return { form: 'Suppository', note: r.form !== 'Suppository' ? '제형 틀림(좌약인데 ' + r.form + ')' : '' };
  if (/\btab\b|tablet/.test(n) && !/Tablet/.test(r.form)) {
    if (/sachet|powder/i.test(r.form)) return { form: r.form, note: '이름은 정(Tab)인데 제형은 ' + r.form + ' — 확인' };
    return { form: 'Tablet', note: '제형 틀림(정인데 ' + r.form + ')' };
  }
  if (/\bcap\b|capsule/.test(n) && !/Capsule/.test(r.form) && !/powder/i.test(r.form)) return { form: 'Capsule', note: '제형 틀림(캡슐인데 ' + r.form + ')' };
  if (/almag/.test(n)) {
    const t = ((r.notes || '').match(/Original stock text: ([^;]+)/) || [])[1] || '';
    if (/정/.test(t)) return { form: 'Tablet', note: '제형 틀림(제산제 Almagate, 원래 표기 「' + t.trim() + '」는 정인데 ' + r.form + ')' };
    return { form: r.form, note: '제산제(Almagate)로 보이는데 제형이 ' + r.form + ' — 확인' };
  }
  // Filed as eye drops with nothing eye-related in the name: the unit in the original
  // stock text (정 tablets, 캡슐 capsules) says what it is.
  if (/Ophthalmic/.test(r.form)) {
    const t = ((r.notes || '').match(/Original stock text: ([^;]+)/) || [])[1] || '';
    if (/정/.test(t)) return { form: 'Tablet', note: '제형 틀림(원래 표기 「' + t.trim() + '」는 정인데 Ophthalmic)' };
    if (/캡슐/.test(t)) return { form: 'Capsule', note: '제형 틀림(원래 표기 「' + t.trim() + '」는 캡슐인데 Ophthalmic)' };
    return { form: r.form, note: '안약으로 되어 있으나 이름에 눈약 표시가 없음 — 확인' };
  }
  return { form: r.form, note: '' };
}

// Handed out by the bottle / tube rather than counted as doses (H2).
function packUnit(form) {
  return /Ophthalmic|Syrup|Topical|Gel/i.test(form) ? '예' : '';
}

const FREQ = { QD: 1, BID: 2, TID: 3, QID: 4 };
// Times a day, only when the text names exactly one clear code.
function frequency(posology) {
  const s = String(posology || '').toUpperCase().trim();
  if (!s || /PRN/.test(s)) return null;
  // No word boundary before the code: the old program also wrote "1QD", "1TID".
  const codes = [...new Set([...s.matchAll(/(?:^|[^A-Z])(QD|BID|TID|QID|Q\d+H)(?![A-Z])/g)].map(m => m[1]))];
  if (codes.length !== 1) return null;
  if (/\d\s*-\s*\d/.test(s) || /\//.test(s)) return null;           // ranges, alternatives
  const c = codes[0];
  if (FREQ[c]) return { n: FREQ[c], code: c };
  const h = c.match(/^Q(\d+)H$/);
  return h ? { n: Math.round(24 / Number(h[1])), code: c } : null;
}
// "1T BID" -> 1 a time; only a single plain number. "1_2T" is left alone: it is
// also written for capsules and a gel, so it may mean 1-2 rather than a half.
function perIntake(posology) {
  const s = String(posology || '').toUpperCase().trim();
  const m = s.match(/^(\d+)\s*[TC]?\s*(?:QD|BID|TID|QID|Q\d+H)(?![A-Z])/);
  return m ? Number(m[1]) : null;
}

// "100정*8" -> 800, "850정" -> 850, "4900" -> 4900; null when it cannot be read.
function originalCount(text) {
  const s = String(text || '').trim().replace(/(\d),(\d{3})/g, '$1$2');   // "1,000정"
  let m = s.match(/^(\d+)\D*\*\s*(\d+)/); if (m) return Number(m[1]) * Number(m[2]);
  m = s.match(/^(\d+)\D*$/); if (m) return Number(m[1]);
  return null;
}

function fmt(n) { return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); }

const [head, ...body] = parseCsv(fs.readFileSync(SRC, 'utf8').replace(/^﻿/, ''));
const lines = body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));

const byCode = new Map();
for (const r of lines) { if (!byCode.has(r.code)) byCode.set(r.code, []); byCode.get(r.code).push(r); }
const nameCodes = new Map();
for (const r of lines) {
  const k = r.name.trim().toLowerCase();
  if (!nameCodes.has(k)) nameCodes.set(k, new Set());
  nameCodes.get(k).add(r.code);
}

const out = [];
for (const [code, batches] of byCode) {
  const r = batches[0];
  const checks = [];
  const fc = correctedForm(r);
  if (fc.note) checks.push(fc.note);

  const others = [...nameCodes.get(r.name.trim().toLowerCase())].filter(c => c !== code);
  if (others.length) checks.push('같은 이름 다른 코드: ' + others.join(', '));

  const total = batches.reduce((s, b) => s + (Number(b.current_quantity) || 0), 0);
  const originals = [];
  for (const b of batches) {
    const t = ((b.notes || '').match(/Original stock text: ([^;]+)/) || [])[1];
    if (t) {
      originals.push(t.trim());
      const expect = originalCount(t);
      if (expect !== null && expect !== Number(b.current_quantity)) checks.push('수량 불일치(원래 표기 ' + t.trim() + ' ≈ ' + expect + ', 수량 ' + b.current_quantity + ')');
    }
  }
  if (total === 0) checks.push('수량 0');
  if (/review/i.test(r.notes)) checks.push('옛 메모: 확인 필요(needs review)');
  if (/\(\s*\/|^\d/.test(r.name)) checks.push('이름 확인');
  const category = CATEGORY[r.classification] || 'Other';
  if (!CATEGORY[r.classification]) checks.push('분류 대응 없음(' + r.classification + ')');
  if (category === 'Antimalarial') checks.push('말라리아약 — 의사 확인 목록(급함)');

  const fr = frequency(r.posology);
  if (/\d_\d/.test(r.posology)) checks.push('옛 용법 「' + r.posology + '」의 1_2 뜻(½? 1~2?) 확인');
  const per = perIntake(r.posology);
  const refDaily = fr && per !== null ? fmt(per * fr.n) : '';

  out.push({
    '확인할 점': [...new Set(checks)].join(' / '),
    '코드': code,
    '약 이름': r.name,
    '성분': r.generic_name,
    '함량': r.strength,
    '제형 (옛 값)': r.form,
    '제형 (고친 값)': fc.form,
    'EMR 분류': category,
    '옛 분류': r.classification,
    '수량 합계': total,
    '원래 수량 표기': [...new Set(originals)].join(' + '),
    '묶음 수': batches.length,
    '옛 용법 (원문)': r.posology,
    '옮길 횟수': fr ? fr.n : '',
    '옮길 용법': fr ? fr.code : '',
    '참고: 옛 용법으로 계산한 하루 총량 (가져오지 않음)': refDaily,
    '채울 칸: 하루 총량': '',
    '채울 칸: 일수': '',
    '채울 칸: 가격': '',
    '채울 칸: 최소 재고': '',
    '병·개 단위 약?': packUnit(fc.form),
    '흔한 용도': r.common_use,
  });
}

out.sort((a, b) => (a['확인할 점'] ? 0 : 1) - (b['확인할 점'] ? 0 : 1) || a['코드'].localeCompare(b['코드']));

const cols = Object.keys(out[0]);
const esc = v => { const s = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = '﻿' + [cols.map(esc).join(','), ...out.map(o => cols.map(c => esc(o[c])).join(','))].join('\r\n') + '\r\n';
fs.writeFileSync(OUT, csv);
const flagged = out.filter(o => o['확인할 점']).length;
console.log('drugs', out.length, '| with something to check', flagged, '| pack-unit', out.filter(o => o['병·개 단위 약?']).length,
  '| frequency carried', out.filter(o => o['옮길 횟수'] !== '').length, '->', path.relative(process.cwd(), OUT));
