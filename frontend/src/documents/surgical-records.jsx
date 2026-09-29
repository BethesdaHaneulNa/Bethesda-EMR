// Chart-record templates (category 'chart'): a shared operation-note layout reused
// across the procedures this clinic actually does, plus a surgical consent form.
// Adding a procedure = one entry in OPS below.
//
// The six specialty notes (soft-tissue mass, hernia, appendicitis, breast, hemorrhoid,
// fistula) follow the paper Operation Note the Korean clinic has been filling in for
// years. The paper version carries anatomical drawings the surgeon circles; here those
// become checkbox groups instead - faster to fill, and the selections stay countable
// afterwards, which a circled drawing never is.
import { A4, ClinicHeader, DocMetaRow, PatientBox, DocSection, SignatureBlock, L } from './shared.jsx';
import { OpFigures } from './op-figures.jsx';

var FL = {
  opDate:    { ko: '수술일', en: 'Operation Date', fr: 'Date opératoire' },
  opName:    { ko: '수술명', en: 'Name of Operation', fr: 'Intervention' },
  preDx:     { ko: '술전 진단', en: 'Preoperative Diagnosis', fr: 'Diagnostic pré-op' },
  postDx:    { ko: '술후 진단', en: 'Postoperative Diagnosis', fr: 'Diagnostic post-op' },
  surgeon:   { ko: '집도의', en: 'Surgeon', fr: 'Chirurgien' },
  assistant: { ko: '1st 보조의', en: "1st Assistant", fr: '1er assistant' },
  assistant2:{ ko: '2nd 보조의', en: "2nd Assistant", fr: '2e assistant' },
  scrubNurse:{ ko: 'Scrub 간호사', en: 'Scrub Nurse', fr: 'Infirmière instrumentiste' },
  circNurse: { ko: 'Circ. 간호사', en: 'Circulating Nurse', fr: 'Infirmière circulante' },
  anesthesia:{ ko: '마취', en: 'Name of Anesthesia', fr: 'Anesthésie' },
  findings:  { ko: '수술 소견 / 술기', en: 'Findings and Procedures', fr: 'Compte-rendu opératoire' },
  sutures:   { ko: '사용 봉합사', en: 'Sutures Used', fr: 'Sutures utilisées' },
  sedation:  { ko: '진정 (Dormicum / Pofol, cc)', en: 'Sedation (Dormicum / Pofol, cc)', fr: 'Sédation (Dormicum / Pofol, cc)' },
  bloodLoss: { ko: '출혈량 / 수혈', en: 'Est. Blood Loss / Transfusion', fr: 'Pertes / Transfusion' },
  complications: { ko: '합병증', en: 'Complications', fr: 'Complications' },
  postPlan:  { ko: '술후 계획', en: 'Post-op Plan', fr: 'Plan post-opératoire' },
  // safety checklist, group A (abdominal / excisional)
  tissuePath:{ ko: '검체 병리 의뢰', en: 'Tissue to Pathology', fr: 'Tissu en anatomopathologie' },
  drains:    { ko: '배액관', en: 'Drains', fr: 'Drains' },
  spongeCount:{ ko: '거즈 카운트 일치', en: 'Sponge Count Correct', fr: 'Compte des compresses correct' },
  // safety checklist, group B (breast / anorectal)
  gauzeCount:{ ko: '거즈 카운트', en: 'Gauze Count', fr: 'Compte des compresses' },
  biopsy:    { ko: '생검', en: 'Biopsy', fr: 'Biopsie' },
};

var YESNO = ['Yes', 'No'];

// How a checkbox group may be filled (DocumentModal.jsx, the 'checks' input):
//   single: true         one answer only - Yes/No, a side, a grade, an amount. Ticking a
//                        second one moves the tick; "Sponge count: Yes, No" is not a record.
//   noneOption: 'None'   several allowed, but "None" excludes the rest: picking it clears
//                        the others, picking anything else clears it.
//   (neither)            any combination - sutures, clock positions, quadrants.
// Which group is which is listed in wiki/modules/consultation.md (3.6). Documents issued
// before this rule may hold two answers in a single group; they print as saved.

function OpNoteLayout(props) {
  var v = props.values || {}, lang = props.lang, spec = props.spec || {};
  // Tighter than the other documents: an operation note with a figure has to fit one A4
  // page at the 14 mm print margin (shared.jsx printDocument), and with 4 px padding and
  // 12 px table gaps five of the six specialty notes spilled their signature onto page 2.
  var cell = { border: '1px solid #999', padding: '3px 7px', fontSize: 12, verticalAlign: 'top' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap', width: 92 });
  var tbl = { width: '100%', borderCollapse: 'collapse', marginBottom: 8, pageBreakInside: 'avoid', breakInside: 'avoid' };

  // Only print the procedure-detail rows that were actually filled in - an empty
  // "Fluid collection:" line on a signed record reads as "not checked", not "n/a".
  // A row still holding its untouched typing aid counts as empty too: the size rows
  // start as " ×  ×  cm" so the surgeon only types the numbers, and printed as-is that
  // reads "Size: × × cm" - a measurement that was never taken.
  var detail = (spec.extras || []).filter(function (f) {
    var s = String(v[f.key] || '').trim();
    return s !== '' && s !== String(f.default || '').trim();
  });

  // Called as a function, not <OpFigures/>, so the layout knows whether a figure exists
  // before deciding how to arrange the row. It holds no state, so this is safe.
  var fig = OpFigures({ figure: spec.figure, values: v });

  return (
    <A4 innerRef={props.innerRef} pad="20px 36px">
      <ClinicHeader clinic={props.clinic} lang={lang} title={props.title} />
      <DocMetaRow lang={lang} docNo={props.docNo} dateStr={props.dateStr} />
      {/* minimal: no address or phone. Name, chart number, date of birth and sex are what
          identify the record; a home address on an operation note only travels with every
          copy of it. See PatientBox in shared.jsx. */}
      <PatientBox patient={props.patient} lang={lang} minimal />

      <table style={tbl}>
        <tbody>
          <tr><td style={head}>{L(FL.opDate, lang)}</td><td style={cell}>{v.opDate || ''}</td><td style={head}>{L(FL.anesthesia, lang)}</td><td style={cell}>{v.anesthesia || ''}</td></tr>
          <tr><td style={head}>{L(FL.opName, lang)}</td><td style={cell} colSpan={3}>{v.opName || ''}</td></tr>
          <tr><td style={head}>{L(FL.preDx, lang)}</td><td style={cell}>{v.preDx || ''}</td><td style={head}>{L(FL.postDx, lang)}</td><td style={cell}>{v.postDx || ''}</td></tr>
          <tr><td style={head}>{L(FL.surgeon, lang)}</td><td style={cell}>{v.surgeon || ''}</td><td style={head}>{L(FL.assistant, lang)}</td><td style={cell}>{v.assistant || ''}</td></tr>
          <tr><td style={head}>{L(FL.assistant2, lang)}</td><td style={cell}>{v.assistant2 || ''}</td><td style={head}>{L(FL.scrubNurse, lang)}</td><td style={cell}>{v.scrubNurse || ''}</td></tr>
          <tr><td style={head}>{L(FL.circNurse, lang)}</td><td style={cell}>{v.circNurse || ''}</td><td style={head}>{L(FL.sedation, lang)}</td><td style={cell}>{v.sedation || ''}</td></tr>
        </tbody>
      </table>

      {/* Procedure details and the figure share one row. Stacked, the figure added its full
          height below the table; side by side it mostly fits in the table's height. When
          the figure is too wide to sit beside the table (fistula: three drawings) it wraps
          onto its own line. The figure is driven by these same selections - op-figures.jsx. */}
      {detail.length || fig ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'flex-start', marginBottom: 8 }}>
          {detail.length ? (
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <table style={Object.assign({}, tbl, { marginBottom: 0 })}>
                <tbody>
                  {detail.map(function (f) {
                    return <tr key={f.key}><td style={head}>{L(f.label, lang)}</td><td style={cell}>{v[f.key]}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {fig}
        </div>
      ) : null}

      <DocSection label={L(FL.findings, lang)} value={v.findings} />

      {String(v.sutures || '').trim() ? (
        <table style={tbl}><tbody><tr><td style={head}>{L(FL.sutures, lang)}</td><td style={cell}>{v.sutures}</td></tr></tbody></table>
      ) : null}

      {/* Safety checklist. Which three or four items appear depends on the procedure -
          an excision needs the specimen and sponge count, a breast case needs the
          estimated blood loss and whether a biopsy went off. */}
      <table style={tbl}>
        <tbody>
          {spec.safety === 'B' ? (
            <>
              <tr><td style={head}>{L(FL.gauzeCount, lang)}</td><td style={cell}>{v.gauzeCount || ''}</td><td style={head}>{L(FL.drains, lang)}</td><td style={cell}>{v.drains || ''}</td></tr>
              <tr><td style={head}>{L(FL.bloodLoss, lang)}</td><td style={cell}>{v.bloodLoss || ''}</td><td style={head}>{L(FL.biopsy, lang)}</td><td style={cell}>{v.biopsy || ''}</td></tr>
            </>
          ) : (
            <>
              <tr><td style={head}>{L(FL.tissuePath, lang)}</td><td style={cell}>{v.tissuePath || ''}</td><td style={head}>{L(FL.drains, lang)}</td><td style={cell}>{v.drains || ''}</td></tr>
              <tr><td style={head}>{L(FL.spongeCount, lang)}</td><td style={cell}>{v.spongeCount || ''}</td><td style={head}>{L(FL.bloodLoss, lang)}</td><td style={cell}>{v.bloodLoss || ''}</td></tr>
            </>
          )}
          <tr><td style={head}>{L(FL.complications, lang)}</td><td style={cell} colSpan={3}>{v.complications || ''}</td></tr>
        </tbody>
      </table>

      {String(v.postPlan || '').trim() ? <DocSection label={L(FL.postPlan, lang)} value={v.postPlan} /> : null}
      <SignatureBlock lang={lang} doctor={props.doctor} clinic={props.clinic} tight />
    </A4>
  );
}

// Build an operation note. `spec.extras` are the procedure-specific rows, `spec.sutures`
// the suture set that procedure actually uses, `spec.safety` which checklist applies.
function makeOp(code, name, title, defaults, spec) {
  defaults = defaults || {}; spec = spec || {};
  var fields = [
    { key: 'opDate', label: FL.opDate, type: 'text' },
    { key: 'opName', label: FL.opName, type: 'text', default: defaults.opName },
    { key: 'preDx', label: FL.preDx, type: 'text', default: defaults.preDx },
    { key: 'postDx', label: FL.postDx, type: 'text', default: defaults.postDx },
    { key: 'anesthesia', label: FL.anesthesia, type: 'text', default: defaults.anesthesia },
    { key: 'surgeon', label: FL.surgeon, type: 'text', autofill: 'doctor' },
    { key: 'assistant', label: FL.assistant, type: 'text' },
    { key: 'assistant2', label: FL.assistant2, type: 'text' },
    { key: 'scrubNurse', label: FL.scrubNurse, type: 'text' },
    { key: 'circNurse', label: FL.circNurse, type: 'text' },
    { key: 'sedation', label: FL.sedation, type: 'text', default: defaults.sedation },
  ];
  fields = fields.concat(spec.extras || []);
  fields.push({ key: 'findings', label: FL.findings, type: 'textarea', rows: 7, default: defaults.findings });
  if (spec.sutures) fields.push({ key: 'sutures', label: FL.sutures, type: 'checks', options: spec.sutures });
  if (spec.safety === 'B') {
    fields.push({ key: 'gauzeCount', label: FL.gauzeCount, type: 'checks', options: YESNO, single: true });
    fields.push({ key: 'drains', label: FL.drains, type: 'text' });
    fields.push({ key: 'bloodLoss', label: FL.bloodLoss, type: 'text' });
    fields.push({ key: 'biopsy', label: FL.biopsy, type: 'checks', options: YESNO, single: true });
  } else {
    fields.push({ key: 'tissuePath', label: FL.tissuePath, type: 'checks', options: YESNO, single: true });
    fields.push({ key: 'drains', label: FL.drains, type: 'text' });
    fields.push({ key: 'spongeCount', label: FL.spongeCount, type: 'checks', options: YESNO, single: true });
    fields.push({ key: 'bloodLoss', label: FL.bloodLoss, type: 'text' });
  }
  fields.push({ key: 'complications', label: FL.complications, type: 'text' });
  fields.push({ key: 'postPlan', label: FL.postPlan, type: 'textarea', rows: 3, default: defaults.postPlan });

  return {
    code: code, category: 'chart', name: name, fields: fields,
    Layout: function (p) { return OpNoteLayout(Object.assign({}, p, { title: L(title, p.lang), spec: spec })); },
  };
}

var CLOCK = ['1 o’clock', '2 o’clock', '3 o’clock', '4 o’clock', '5 o’clock', '6 o’clock',
             '7 o’clock', '8 o’clock', '9 o’clock', '10 o’clock', '11 o’clock', '12 o’clock'];

var SUTURE_SKELETON = 'Under sterile conditions and [local] anesthesia, the wound was irrigated and explored. No foreign body / deeper structure injury noted. The wound was closed with [N] [size] sutures. Tetanus status checked. Dressing applied.';
var IND_SKELETON = 'Under [local] anesthesia, the abscess was incised, pus drained, and the cavity irrigated. Loculations broken down. Wound packed / left open for drainage. Dressing applied.';

var OPS = [
  // ── generic ──
  makeOp('surgical-record',
    { ko: '수술기록지 (공통)', en: 'Operation Note', fr: "Compte-rendu opératoire" },
    { ko: '수 술 기 록 지', en: 'Operation Note', fr: 'Compte-rendu opératoire' },
    {}, { safety: 'A' }),

  // ── soft-tissue mass excision (기타) ──
  makeOp('op-soft-tissue',
    { ko: '수술기록지 - 기타 (연부조직)', en: 'Operation Note - Soft Tissue Mass', fr: 'Note op. - Masse des tissus mous' },
    { ko: '수술기록지 - 기타 (연부조직)', en: 'Operation Note — Soft Tissue Mass', fr: 'Note opératoire — Masse des tissus mous' },
    { opName: 'Mass excision', anesthesia: 'Local',
      findings: 'Under local anesthesia, prepped and draped sterilely. Elliptical incision over the mass. The mass was dissected free of surrounding tissue and excised intact. Hemostasis achieved. Closed in layers. Specimen sent for histology.' },
    { safety: 'A',
      sutures: ['Nylon 3-0', 'Nylon 4-0', 'Nylon 5-0', 'Surgifit 3-0'],
      extras: [
        { key: 'layer', label: { ko: '병변 위치', en: 'Lesion Plane', fr: 'Plan de la lésion' }, type: 'checks',
          options: ['Skin', 'Soft tissue (subcutaneous)'] },
        { key: 'massType', label: { ko: '병변 종류', en: 'Mass Type', fr: 'Type de masse' }, type: 'checks',
          options: ['Epidermal cyst', 'Granuloma', 'Lipoma', 'Hemangioma', 'Fibroma', 'Giant cell tumor', 'Myositis ossificans', 'Sarcoma', 'Other'] },
        { key: 'massSize', label: { ko: '크기 (cm)', en: 'Size (cm)', fr: 'Taille (cm)' }, type: 'text', default: ' ×  ×  cm' },
        { key: 'muscleLayer', label: { ko: '근육층 침범', en: 'Muscle Layer Involved', fr: 'Atteinte musculaire' }, type: 'checks', options: YESNO, single: true },
      ] }),

  // ── hernia (탈장) ──
  makeOp('op-hernia',
    { ko: '수술기록지 - 탈장', en: 'Operation Note - Hernia', fr: 'Note op. - Hernie' },
    { ko: '수술기록지 - 탈장', en: 'Operation Note — Hernia', fr: 'Note opératoire — Hernie' },
    { opName: 'Inguinal hernia repair (Lichtenstein, mesh)', preDx: 'Inguinal hernia', postDx: 'Inguinal hernia', anesthesia: 'Spinal / Local',
      findings: 'Under [anesthesia], supine position, prepped and draped sterilely. Oblique groin incision made. External oblique opened, cord isolated. Hernia sac identified, dissected and reduced. [Mesh placed and fixed / primary repair]. Hemostasis achieved. Closed in layers. Counts correct. Patient tolerated the procedure well.' },
    { safety: 'A', figure: 'hernia',
      sutures: ['Vicryl 2-0', 'Surgifit 3-0', 'Nylon 4-0', 'Nylon 5-0'],
      extras: [
        { key: 'side', label: { ko: '부위', en: 'Side', fr: 'Côté' }, type: 'checks', options: ['Right', 'Left', 'Bilateral'], single: true },
        { key: 'herniaType', label: { ko: '탈장 유형', en: 'Hernia Type', fr: 'Type de hernie' }, type: 'checks',
          options: ['Indirect - small', 'Indirect - medium', 'Indirect - large', 'Direct - small', 'Direct - medium', 'Direct - large', 'Combined', 'Femoral'] },
        { key: 'mesh', label: { ko: '메쉬', en: 'Mesh', fr: 'Filet' }, type: 'text' },
      ] }),

  // ── appendectomy (맹장) ──
  makeOp('op-appendectomy',
    { ko: '수술기록지 - 맹장 (충수절제술)', en: 'Operation Note - Appendicitis', fr: 'Note op. - Appendicite' },
    { ko: '수술기록지 - 충수절제술', en: 'Operation Note — Appendectomy', fr: 'Note opératoire — Appendicectomie' },
    { opName: 'Appendectomy', preDx: 'Acute appendicitis', postDx: 'Acute appendicitis', anesthesia: 'General / Spinal',
      findings: 'Under [anesthesia], prepped and draped. Appendix identified and delivered. Mesoappendix ligated and divided. Appendix base secured and transected. Peritoneal cavity irrigated. Hemostasis achieved. Closed in layers. Counts correct.' },
    { safety: 'A', figure: 'appendix',
      extras: [
        { key: 'appyPosition', label: { ko: '충수 위치', en: 'Appendix Position', fr: 'Position de l’appendice' }, type: 'checks',
          options: ['Retrocecal', 'Preileal', 'Postileal', 'Subcecal', 'Pelvic'] },
        { key: 'port', label: { ko: 'Port 삽입', en: 'Port Insertion', fr: 'Insertion des trocarts' }, type: 'checks',
          options: ['Glove port', '5 mm'] },
        { key: 'appyType', label: { ko: '충수 상태', en: 'Type', fr: 'Type' }, type: 'checks',
          options: ['Perforation', 'Gangrenous', 'Suppurative', 'Congestive'], single: true },
        { key: 'appySize', label: { ko: '충수 크기 (cm)', en: 'Appendix Size (cm)', fr: 'Taille de l’appendice (cm)' }, type: 'text', default: ' ×  cm' },
        { key: 'vessel', label: { ko: '충수 혈관 처리', en: 'Appendiceal Vessel', fr: 'Vaisseau appendiculaire' }, type: 'checks',
          options: ['Ligasure', 'Clip', 'Other'] },
        { key: 'base', label: { ko: '충수 기저부 처리', en: 'Appendix Base', fr: 'Base appendiculaire' }, type: 'checks',
          options: ['Endo-loop', 'Other'] },
        { key: 'fluidAmount', label: { ko: '복강 내 삼출액 양', en: 'Fluid Collection', fr: 'Épanchement' }, type: 'checks',
          options: ['> 100 mL', '50–100 mL', '< 50 mL'], single: true },
        { key: 'fluidType', label: { ko: '삼출액 성상', en: 'Fluid Character', fr: 'Nature de l’épanchement' }, type: 'checks',
          options: ['Pus', 'Turbid', 'Serous'] },
        { key: 'jp', label: { ko: 'JP 배액관', en: 'JP Insertion', fr: 'Drain JP' }, type: 'checks',
          options: ['None', 'RLQ', 'LLQ', 'Umbilicus', 'Other'], noneOption: 'None' },
        { key: 'closure', label: { ko: '봉합 (근막 / 피부)', en: 'Closure (Fascia / Skin)', fr: 'Fermeture (fascia / peau)' }, type: 'checks',
          options: ['Fascia: Vicryl 2-0', 'Skin: Nylon 3-0', 'Skin: Nylon 4-0'] },
      ] }),

  // ── breast (유방) ──
  makeOp('op-breast',
    { ko: '수술기록지 - 유방', en: 'Operation Note - Breast', fr: 'Note op. - Sein' },
    { ko: '수술기록지 - 유방', en: 'Operation Note — Breast', fr: 'Note opératoire — Sein' },
    { opName: 'Breast mass excision', anesthesia: 'Local / Sedation',
      findings: 'Under [anesthesia], supine, prepped and draped. Incision over the lesion. The lesion was dissected and excised with a margin of normal tissue. Hemostasis achieved. Closed in layers. Specimen sent for histology.' },
    { safety: 'B', figure: 'breast',
      sutures: ['Surgifit 4-0', 'Surgifit 5-0', 'Nylon 4-0', 'Nylon 5-0'],
      extras: [
        { key: 'side', label: { ko: '부위', en: 'Side', fr: 'Côté' }, type: 'checks', options: ['Right', 'Left', 'Bilateral'], single: true },
        { key: 'quadrant', label: { ko: '사분면', en: 'Quadrant', fr: 'Quadrant' }, type: 'checks',
          options: ['Upper outer', 'Upper inner', 'Lower outer', 'Lower inner', 'Central / subareolar', 'Axillary'] },
        { key: 'lesionSize', label: { ko: '병변 크기 (cm)', en: 'Lesion Size (cm)', fr: 'Taille de la lésion (cm)' }, type: 'text', default: ' ×  ×  cm' },
      ] }),

  // ── hemorrhoid (항문) ──
  makeOp('op-hemorrhoid',
    { ko: '수술기록지 - 항문 (치질)', en: 'Operation Note - Hemorrhoid', fr: 'Note op. - Hémorroïdes' },
    { ko: '수술기록지 - 치질', en: 'Operation Note — Hemorrhoid', fr: 'Note opératoire — Hémorroïdes' },
    { opName: 'Hemorrhoidectomy', preDx: 'Hemorrhoid', postDx: 'Hemorrhoid', anesthesia: 'Spinal / Local',
      findings: 'Under [anesthesia], in [lithotomy/jackknife] position, prepped and draped. Anoscopy performed. Hemorrhoidal piles identified at the positions noted above. Each pile was dissected from the sphincter and excised; the pedicle was transfixed and ligated. Hemostasis achieved. Anal packing applied.' },
    { safety: 'B', figure: 'anal',
      sutures: ['Chromic 2-0', 'Chromic 3-0', 'Surgifit 3-0', 'Nylon 1-0', 'Nylon 2-0', 'Nylon 3-0'],
      extras: [
        { key: 'position', label: { ko: '병변 위치 (시계 방향)', en: 'Pile Position (clock)', fr: 'Position (cadran horaire)' }, type: 'checks', options: CLOCK },
        { key: 'position2', label: { ko: '술후 잔여 / 추가 위치', en: 'Post-op / Additional Position', fr: 'Position post-op / additionnelle' }, type: 'checks', options: CLOCK },
        { key: 'skinTag', label: { ko: '동반 병변', en: 'Associated Lesion', fr: 'Lésion associée' }, type: 'checks',
          options: ['Skin tag', 'Anal fissure', 'Anal papilla', 'None'], noneOption: 'None' },
      ] }),

  // ── anal fistula (치루) ──
  makeOp('op-fistula',
    { ko: '수술기록지 - 치루', en: 'Operation Note - Anal Fistula', fr: 'Note op. - Fistule anale' },
    { ko: '수술기록지 - 치루', en: 'Operation Note — Anal Fistula', fr: 'Note opératoire — Fistule anale' },
    { opName: 'Fistulotomy / Fistulectomy', preDx: 'Anal fistula', postDx: 'Anal fistula', anesthesia: 'Spinal / Local',
      findings: 'Under [anesthesia], in [lithotomy/jackknife] position, prepped and draped. The external opening was identified and the tract probed to the internal opening noted above. The tract was [laid open / excised]; [seton placed]. Sphincter preserved. Hemostasis achieved. Wound left open for drainage.' },
    { safety: 'B', figure: 'fistula',
      sutures: ['Chromic 2-0', 'Chromic 3-0', 'Surgifit 3-0', 'Nylon 1-0', 'Nylon 2-0', 'Nylon 3-0'],
      extras: [
        { key: 'extOpening', label: { ko: '외공 위치 (시계 방향)', en: 'External Opening (clock)', fr: 'Orifice externe (cadran)' }, type: 'checks', options: CLOCK },
        { key: 'intOpening', label: { ko: '내공 위치 (시계 방향)', en: 'Internal Opening (clock)', fr: 'Orifice interne (cadran)' }, type: 'checks', options: CLOCK },
        { key: 'tractType', label: { ko: '치루 유형', en: 'Tract Type', fr: 'Type de trajet' }, type: 'checks',
          options: ['Submucosal', 'Intersphincteric', 'Transsphincteric', 'Suprasphincteric', 'Extrasphincteric'] },
        { key: 'seton', label: { ko: 'Seton 유치', en: 'Seton Placed', fr: 'Seton posé' }, type: 'checks', options: YESNO, single: true },
      ] }),

  // ── procedures already in use at the mission clinic ──
  makeOp('op-laceration',
    { ko: '열상 봉합 기록지', en: 'Laceration Repair Record', fr: 'Suture de plaie' },
    { ko: '열상 봉합 기록지', en: 'Laceration Repair', fr: 'Suture de plaie' },
    { opName: 'Wound suture / Laceration repair', anesthesia: 'Local', findings: SUTURE_SKELETON, postPlan: 'Wound check in 2-3 days. Suture removal in [7-10] days. Keep clean and dry.' },
    { safety: 'A', sutures: ['Nylon 3-0', 'Nylon 4-0', 'Nylon 5-0', 'Vicryl 3-0', 'Vicryl 4-0'] }),
  makeOp('op-ind',
    { ko: '절개 배농 기록지', en: 'Incision & Drainage Record', fr: 'Incision et drainage' },
    { ko: '절개 배농 기록지', en: 'Incision & Drainage', fr: 'Incision et drainage' },
    { opName: 'Incision and drainage (abscess)', anesthesia: 'Local', findings: IND_SKELETON, postPlan: 'Daily dressing change. Wound check in 2-3 days. Antibiotics as prescribed.' },
    { safety: 'A' }),
  makeOp('op-cesarean',
    { ko: '제왕절개 기록지', en: 'Cesarean Section Record', fr: 'Césarienne' },
    { ko: '제왕절개 기록지', en: 'Cesarean Section', fr: 'Césarienne' },
    { opName: 'Cesarean section (lower segment transverse)', anesthesia: 'Spinal',
      findings: 'Under spinal anesthesia, supine with left tilt, prepped and draped. Pfannenstiel incision. Lower segment transverse uterine incision. Live [male/female] infant delivered at [time], APGAR [ / ]. Placenta and membranes delivered complete. Uterus closed in [2] layers. Hemostasis achieved. Abdomen closed in layers. Counts correct.',
      postPlan: 'Monitor vitals and bleeding. Uterotonics. Encourage breastfeeding. Remove dressing day 2.' },
    { safety: 'A', sutures: ['Vicryl 1-0', 'Vicryl 2-0', 'Nylon 3-0'] }),
  makeOp('op-circumcision',
    { ko: '포경수술 기록지', en: 'Circumcision Record', fr: 'Circoncision' },
    { ko: '포경수술 기록지', en: 'Circumcision', fr: 'Circoncision' },
    { opName: 'Circumcision', anesthesia: 'Local (dorsal penile block)',
      findings: 'Under local block, prepped and draped. Foreskin retracted and adhesions released. Excess foreskin excised. Hemostasis achieved. Mucosa approximated to skin with absorbable sutures. Dressing applied.',
      postPlan: 'Keep clean and dry. Analgesia. Review in [5-7] days.' },
    { safety: 'A', sutures: ['Vicryl 4-0', 'Vicryl 5-0', 'Chromic 4-0'] }),
];

// ── Surgical consent (수술 동의서) ──
var CL = {
  procedure: { ko: '수술/시술명', en: 'Procedure', fr: 'Intervention' },
  risks:     { ko: '설명한 위험 / 합병증', en: 'Explained Risks / Complications', fr: 'Risques / complications expliqués' },
  guardian:  { ko: '보호자 / 대리인', en: 'Guardian / Representative', fr: 'Tuteur / représentant' },
  relation:  { ko: '관계', en: 'Relationship', fr: 'Lien' },
};
var CONSENT_TEXT = {
  ko: '본인(또는 보호자)은 위 수술/시술의 목적, 방법, 예상 효과와 발생 가능한 위험·합병증, 대체 가능한 치료 및 미시행 시의 위험에 대해 담당 의사로부터 충분히 설명을 듣고 이해하였으며, 이에 동의합니다.',
  en: 'I (or the guardian) confirm that the purpose, method, expected benefits, possible risks and complications, alternatives, and the risks of not undergoing the above procedure have been fully explained by the physician, that I understand them, and that I consent.',
  fr: "Je (ou le tuteur) confirme que le but, la méthode, les bénéfices attendus, les risques et complications possibles, les alternatives et les risques en cas de non-réalisation de l'intervention ci-dessus m'ont été expliqués par le médecin, que je les comprends et que je consens.",
};

function ConsentLayout(props) {
  var v = props.values || {}, lang = props.lang;
  var line = { borderBottom: '1px solid #555', display: 'inline-block', minWidth: 160 };
  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={L({ ko: '수 술 동 의 서', en: 'Surgical Consent', fr: 'Consentement Chirurgical' }, lang)} />
      <DocMetaRow lang={lang} docNo={props.docNo} dateStr={props.dateStr} />
      <PatientBox patient={props.patient} lang={lang} />
      <div style={{ fontSize: 12.5, marginBottom: 10 }}><b>{L(CL.procedure, lang)}:</b> <span style={line}>{v.procedure || ' '}</span></div>
      <DocSection label={L(CL.risks, lang)} value={v.risks} />
      <div style={{ fontSize: 12.5, lineHeight: 1.7, margin: '14px 0 26px', padding: '10px 12px', border: '1px solid #bbb', background: '#fafafa' }}>{L(CONSENT_TEXT, lang)}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <tbody>
          <tr>
            <td style={{ padding: '10px 8px', width: '50%' }}>{L({ ko: '환자 서명', en: 'Patient signature', fr: 'Signature du patient' }, lang)}: <span style={line}>&nbsp;</span></td>
            <td style={{ padding: '10px 8px' }}>{L(CL.guardian, lang)}: <span style={line}>{v.guardian || ' '}</span> ({L(CL.relation, lang)}: {v.relation || ' '})</td>
          </tr>
        </tbody>
      </table>
      <SignatureBlock lang={lang} doctor={props.doctor} clinic={props.clinic} />
    </A4>
  );
}

var CONSENT = {
  code: 'surgical-consent',
  category: 'chart',
  name: { ko: '수술 동의서', en: 'Surgical Consent', fr: 'Consentement chirurgical' },
  fields: [
    { key: 'procedure', label: CL.procedure, type: 'text' },
    { key: 'risks', label: CL.risks, type: 'textarea', rows: 4, default: 'Bleeding, infection, pain, anesthesia-related risks, recurrence, injury to adjacent structures, need for further surgery.' },
    { key: 'guardian', label: CL.guardian, type: 'text' },
    { key: 'relation', label: CL.relation, type: 'text' },
  ],
  Layout: ConsentLayout,
};

export var CHART_TEMPLATES = OPS.concat([CONSENT]);
