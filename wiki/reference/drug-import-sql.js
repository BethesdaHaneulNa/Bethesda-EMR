// Writes the migration that brings the clinic's real drug list into the EMR:
// backend/sql/034_pharmacy_import_mission_stock.sql (number set by the coordinator).
// Reads drug-import-review.csv (built by drug-import-review.js from the old stock
// program's 2026-05-15 list) and changes no data itself.
//
//   node wiki/reference/drug-import-sql.js
//
// Decision of 2026-09-29 (wiki/handoff/coordinator.md, "가져올 약 결정"):
// - the drug items go in (name, ingredient, form, category); the price stays empty
//   (0, filled on site); the 25 example drugs are hidden;
// - decision B (same night): a drug has no default dose / times / days / posology any
//   more - the order sets carry the dosing. The columns stay in the table; the daily
//   total and days are left empty, and the times a day and posology code read from the
//   old program (where it named one clear code) are kept but not used. The old
//   posology's "1_2" is therefore not a point to check;
// - stock = the quantity of the 2026-05-15 list, written to the stock record as an
//   "opening" row with its own memo (not a count adjustment);
// - nothing stops on a row that still has something to check: the row goes in as it
//   is and carries a "to check" list (drug.import_check), shown in the pharmacy Stock
//   tab and the settings drug tab until someone on site marks it checked;
// - order sets are not touched.
// The SQL holds the values themselves (a migration's checksum is recorded, so it must
// not read the CSV when it runs) and can be run again without changing anything.
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'drug-import-review.csv');
const OUT = path.join(__dirname, '..', '..', 'backend', 'sql', '034_pharmacy_import_mission_stock.sql');

// Same 17 values as DRUG_CATEGORIES in Settings.jsx.
const CATEGORIES = ['Analgesic', 'Antibiotic', 'Antihistamine', 'Antimalarial', 'Antiparasitic', 'Cardiovascular',
  'Corticosteroid', 'Dermatology', 'Endocrine', 'GI', 'Gynecology', 'Musculoskeletal', 'Ophthalmic', 'Respiratory',
  'Urology', 'Vitamin', 'Other'];
// The example drugs of 003_seed_data.sql, hidden (not deleted: old prescriptions and
// stock records keep pointing at them).
const EXAMPLES = ['PCM500', 'PCM250', 'BRUFEN', 'BRUFEN4', 'DICLO', 'AMOX500', 'AMOX250', 'CEFT', 'METRO', 'ACT01',
  'AMLO5', 'AMLO10', 'METF500', 'METF850', 'OMEP20', 'RECOMID', 'PRED5', 'CHLOR', 'LORAT', 'SALB', 'ORS', 'ZINC',
  'IRON', 'FOLIC', 'CODAEP'];
const PACK = { '병 (bottle)': 'bottle', '튜브 (tube)': 'tube', '개 (unit)': 'unit', '흡입기 (inhaler)': 'inhaler' };
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suppository', 'Powder / Sachet', 'Vaginal / Gel', 'Topical', 'Ophthalmic'];
// Memo of the opening rows; the Stock tab translates it (ph_memoImport).
const MEMO = 'Imported from the old stock program (count of 2026-05-15)';

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

// The review table's "확인할 점" is Korean text joined with " / " - which also occurs
// inside some form names ("Vaginal / Gel"), so a piece that does not start with a
// known opening belongs to the one before it.
const OPENINGS = ['수량 불일치', '수량 0', '같은 이름 다른 코드', '제형 틀림', '이름은 정', '제산제', '안약으로',
  '옛 메모', '이름 확인', '분류 대응 없음', '말라리아약', '세부 분류는 외용', '옛 용법'];
function pieces(s) {
  const out = [];
  for (const p of String(s || '').split(' / ').filter(Boolean)) {
    if (OPENINGS.some(o => p.startsWith(o)) || !out.length) out.push(p); else out[out.length - 1] += ' / ' + p;
  }
  return out;
}
// Each check becomes { k: kind, d: detail }. The kind is translated on screen
// (ph_chk_<kind>); the detail is data from the old list (numbers, codes, the old text).
function checks(r) {
  const out = [];
  for (const p of pieces(r['확인할 점'])) {
    let m;
    if ((m = p.match(/^수량 불일치\(원래 표기 (.+), 수량 (\d+)\)$/))) out.push({ k: 'qty', d: m[1] + ' ≠ ' + m[2] });
    else if (p === '수량 0') out.push({ k: 'zero' });
    else if ((m = p.match(/^같은 이름 다른 코드: (.+)$/))) out.push({ k: 'dup', d: m[1] });
    else if (/^(제형 틀림|이름은 정|제산제|안약으로)/.test(p)) {
      const was = r['제형 (옛 값)'], now = r['제형 (고친 값)'];
      out.push({ k: 'form', d: was === now ? was : was + ' → ' + now });
    }
    else if (p.startsWith('옛 메모')) out.push({ k: 'review' });
    else if (p === '이름 확인') out.push({ k: 'name' });
    else if ((m = p.match(/^분류 대응 없음\((.+)\)$/))) out.push({ k: 'cat', d: m[1] });
    else if (p.startsWith('말라리아약')) out.push({ k: 'malaria' });
    else if (p.startsWith('세부 분류는 외용')) out.push({ k: 'topical' });
    else if (p.startsWith('옛 용법')) continue;   // posology is not kept per drug (decision B)
    else throw new Error(r['코드'] + ': unknown check "' + p + '"');
  }
  // A pack drug whose unit word is itself uncertain (a jar or a bottle).
  if (/확인/.test(r['포장 단위 근거']) && PACK[r['포장 단위 약 (H2-B)']]) {
    out.push({ k: 'packlabel', d: (r['원래 수량 표기'] || '').trim() });
  }
  return out;
}

const text = fs.readFileSync(SRC, 'utf8').replace(/^﻿/, '');
const [head, ...body] = parseCsv(text);
const rows = body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] === undefined ? '' : r[i]])));

// ── checks before writing ──
const problems = [];
const seen = new Set();
const drugs = rows.map(r => {
  const code = r['코드'].trim();
  const bad = msg => problems.push(code + ': ' + msg);
  if (!/^[A-Z0-9-]{1,20}$/.test(code)) bad('code');
  if (seen.has(code)) bad('duplicate code'); seen.add(code);
  if (EXAMPLES.includes(code)) bad('code is an example drug');
  const name = r['약 이름'].trim(), generic = r['성분'].trim();
  if (!name || name.length > 200) bad('name');
  if (generic.length > 200) bad('ingredient longer than 200');
  const category = r['EMR 분류'] || 'Other';
  if (!CATEGORIES.includes(category)) bad('category ' + category);
  const form = r['제형 (고친 값)'].trim();
  if (form && !FORMS.includes(form)) bad('form ' + form);
  const qty = Number(r['수량 합계']);
  if (!Number.isInteger(qty) || qty < 0) bad('quantity ' + r['수량 합계']);
  const freq = r['옮길 횟수'] === '' ? null : Number(r['옮길 횟수']);
  if (freq !== null && (!Number.isInteger(freq) || freq < 1)) bad('frequency');
  const route = r['옮길 용법'].trim() || null;
  if (route && !/^(QD|BID|TID|QID|Q\d+H)$/.test(route)) bad('route ' + route);
  const packText = r['포장 단위 약 (H2-B)'].trim();
  if (packText && packText !== '확인' && !PACK[packText]) bad('pack unit ' + packText);
  // Decision: the price stays empty now (filled on site); the daily total and days are
  // not used at all (decision B). A value here means the table changed - stop.
  for (const col of ['채울 칸: 하루 총량', '채울 칸: 일수', '채울 칸: 가격', '채울 칸: 최소 재고']) {
    if (String(r[col]).trim()) bad(col + ' is filled - this script leaves it empty; change the script first');
  }
  return {
    code, name, generic: generic || null, category, form: form || null, qty, freq, route,
    pack: PACK[packText] || null, check: checks(r),
  };
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ── SQL ──
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
const values = drugs.map(d => '  (' + [
  lit(d.code), lit(d.name), lit(d.generic), lit(d.category), lit(d.form),
  'NULL', lit(d.freq), 'NULL', lit(d.route), '0', lit(d.qty), '0',
  d.pack ? 'TRUE' : 'FALSE', lit(d.pack),
  d.check.length ? lit(JSON.stringify(d.check)) + '::jsonb' : 'NULL',
].join(', ') + ')');
const codes = drugs.map(d => lit(d.code));
const wrap = (list, per) => list.reduce((a, c, i) => a + (i % per === 0 ? (i ? ',\n  ' : '  ') : ', ') + c, '');

const qtySum = drugs.reduce((s, d) => s + d.qty, 0);
const nCheck = drugs.filter(d => d.check.length).length;
const nPack = drugs.filter(d => d.pack).length;
const sql = `-- 034 (pharmacy, session number 403): the clinic's drug list from the old stock program (2026-05-15).
--
-- GENERATED by wiki/reference/drug-import-sql.js from wiki/reference/drug-import-review.csv.
-- Do not edit by hand: change the table or the script and generate again.
--
-- Decision of 2026-09-29 (wiki/handoff/coordinator.md, "가져올 약 결정"):
-- * ${drugs.length} drugs go in with name, ingredient, form and category. Price 0, filled on
--   site (the bill shows "no price" until then).
-- * Decision B: a drug has no default dose / times / days / posology - the order sets
--   carry the dosing. The columns are not dropped: daily total and days stay empty,
--   and the times a day and posology code read from the old program's own posology
--   (where it named one clear code) are kept as they are but not used.
-- * Stock = the quantity of the 2026-05-15 list (total ${qtySum}); each drug gets one
--   "opening" row in the stock record with its own memo, so it is not mistaken for a
--   count adjustment. Counted again on site.
-- * ${nCheck} drugs still have something to check (quantity differing from the old note,
--   same name under two codes, form, pack unit...). They go in as they are with the list
--   in import_check; the Stock tab and the settings drug tab show it until someone marks
--   it checked (import_check_done_at / _by). The list itself is kept.
-- * ${nPack} drugs are pack-unit drugs (025). The four whose form says tablet but whose
--   old sub-class says topical are not marked and carry a "topical" check.
-- * The ${EXAMPLES.length} example drugs of 003 are hidden, not deleted. Order sets are not touched
--   (the consultation screen skips a set's line whose drug is hidden).
-- Safe to run again: existing codes are skipped, an opening row is written only for a
-- drug with no stock record, hiding touches only drugs still shown.

ALTER TABLE drug ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(30);
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check JSONB;
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check_done_at TIMESTAMPTZ;
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check_done_by INTEGER REFERENCES staff(id);

INSERT INTO drug (code, name, generic_name, category, dosage_form,
                  default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock,
                  pack_unit, pack_label, import_check)
VALUES
${values.join(',\n')}
ON CONFLICT (code) DO NOTHING;

INSERT INTO stock_movement (drug_id, kind, qty, stock_before, stock_after, memo)
SELECT d.id, 'opening', GREATEST(COALESCE(d.stock_qty, 0), 0), 0, GREATEST(COALESCE(d.stock_qty, 0), 0),
       ${lit(MEMO)}
  FROM drug d
 WHERE d.code IN (
${wrap(codes, 8)})
   AND NOT EXISTS (SELECT 1 FROM stock_movement m WHERE m.drug_id = d.id);

UPDATE drug SET is_active = FALSE, updated_at = NOW()
 WHERE is_active AND code IN (
${wrap(EXAMPLES.map(lit), 8)});
`;
// 034 has run on the clinic's EMR (2026-09-29): the migration runner records its
// checksum, so the file must never change. Regenerating is only a check that the table
// and the script still give the same file; anything different goes next to it for a
// person to look at - a real change needs a new migration.
if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') !== sql) {
  fs.writeFileSync(OUT + '.new', sql);
  console.error('DIFFERENT from the applied ' + path.basename(OUT) + ' - not overwritten; written to ' + path.basename(OUT) + '.new');
  process.exit(1);
}
fs.writeFileSync(OUT, sql);
const kinds = {};
drugs.forEach(d => d.check.forEach(c => { kinds[c.k] = (kinds[c.k] || 0) + 1; }));
console.log('drugs', drugs.length, '| quantity', qtySum, '| to check', nCheck, kinds, '| pack', nPack, '->', path.relative(process.cwd(), OUT));
