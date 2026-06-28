// Chart-record templates (category 'chart'): a shared operation-record layout
// reused across Madagascar's common procedures, plus a surgical consent form.
// Adding a procedure = one entry in OPS below.
import { A4, ClinicHeader, DocMetaRow, PatientBox, DocSection, SignatureBlock, L } from './shared.jsx';

var FL = {
  opDate:    { ko: '수술일', en: 'Operation Date', fr: 'Date opératoire' },
  opName:    { ko: '수술명', en: 'Operation', fr: 'Intervention' },
  preDx:     { ko: '술전 진단', en: 'Pre-op Diagnosis', fr: 'Diagnostic pré-op' },
  postDx:    { ko: '술후 진단', en: 'Post-op Diagnosis', fr: 'Diagnostic post-op' },
  surgeon:   { ko: '집도의', en: 'Surgeon', fr: 'Chirurgien' },
  assistant: { ko: '보조의', en: 'Assistant', fr: 'Assistant' },
  anesthesia:{ ko: '마취', en: 'Anesthesia', fr: 'Anesthésie' },
  findings:  { ko: '수술 소견 / 술기', en: 'Operative Findings / Technique', fr: 'Compte-rendu opératoire' },
  bloodLoss: { ko: '출혈량 / 수혈', en: 'Blood Loss / Transfusion', fr: 'Pertes / Transfusion' },
  complications: { ko: '합병증', en: 'Complications', fr: 'Complications' },
  postPlan:  { ko: '술후 계획', en: 'Post-op Plan', fr: 'Plan post-opératoire' },
};

function OperationLayout(props) {
  var v = props.values || {}, lang = props.lang;
  var cell = { border: '1px solid #999', padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap', width: 90 });
  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={props.title} />
      <DocMetaRow lang={lang} docNo={props.docNo} dateStr={props.dateStr} />
      <PatientBox patient={props.patient} lang={lang} />
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody>
          <tr><td style={head}>{L(FL.opDate, lang)}</td><td style={cell}>{v.opDate || ''}</td><td style={head}>{L(FL.anesthesia, lang)}</td><td style={cell}>{v.anesthesia || ''}</td></tr>
          <tr><td style={head}>{L(FL.opName, lang)}</td><td style={cell} colSpan={3}>{v.opName || ''}</td></tr>
          <tr><td style={head}>{L(FL.preDx, lang)}</td><td style={cell}>{v.preDx || ''}</td><td style={head}>{L(FL.postDx, lang)}</td><td style={cell}>{v.postDx || ''}</td></tr>
          <tr><td style={head}>{L(FL.surgeon, lang)}</td><td style={cell}>{v.surgeon || ''}</td><td style={head}>{L(FL.assistant, lang)}</td><td style={cell}>{v.assistant || ''}</td></tr>
        </tbody>
      </table>
      <DocSection label={L(FL.findings, lang)} value={v.findings} />
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 12px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody><tr><td style={head}>{L(FL.bloodLoss, lang)}</td><td style={cell}>{v.bloodLoss || ''}</td><td style={head}>{L(FL.complications, lang)}</td><td style={cell}>{v.complications || ''}</td></tr></tbody>
      </table>
      <DocSection label={L(FL.postPlan, lang)} value={v.postPlan} />
      <SignatureBlock lang={lang} doctor={props.doctor} clinic={props.clinic} />
    </A4>
  );
}

// build a template that shares OperationLayout with procedure-specific defaults
function makeOp(code, name, title, defaults) {
  defaults = defaults || {};
  return {
    code: code,
    category: 'chart',
    name: name,
    fields: [
      { key: 'opDate', label: FL.opDate, type: 'text' },
      { key: 'opName', label: FL.opName, type: 'text', default: defaults.opName },
      { key: 'preDx', label: FL.preDx, type: 'text', default: defaults.preDx },
      { key: 'postDx', label: FL.postDx, type: 'text', default: defaults.postDx },
      { key: 'surgeon', label: FL.surgeon, type: 'text', autofill: 'doctor' },
      { key: 'assistant', label: FL.assistant, type: 'text' },
      { key: 'anesthesia', label: FL.anesthesia, type: 'text', default: defaults.anesthesia },
      { key: 'findings', label: FL.findings, type: 'textarea', rows: 7, default: defaults.findings },
      { key: 'bloodLoss', label: FL.bloodLoss, type: 'text' },
      { key: 'complications', label: FL.complications, type: 'text' },
      { key: 'postPlan', label: FL.postPlan, type: 'textarea', rows: 3, default: defaults.postPlan },
    ],
    Layout: function (p) { return OperationLayout(Object.assign({}, p, { title: L(title, p.lang) })); },
  };
}

var SUTURE_SKELETON = 'Under sterile conditions and [local] anesthesia, the wound was irrigated and explored. No foreign body / deeper structure injury noted. The wound was closed with [N] [size] sutures. Tetanus status checked. Dressing applied.';
var IND_SKELETON = 'Under [local] anesthesia, the abscess was incised, pus drained, and the cavity irrigated. Loculations broken down. Wound packed / left open for drainage. Dressing applied.';

var OPS = [
  makeOp('surgical-record',
    { ko: '수술기록지 (공통)', en: 'Operation Record', fr: "Compte-rendu opératoire" },
    { ko: '수 술 기 록 지', en: 'Operation Record', fr: 'Compte-rendu opératoire' },
    {}),
  makeOp('op-hernia',
    { ko: '탈장 수술기록지', en: 'Hernia Repair Record', fr: 'Cure de hernie' },
    { ko: '탈장 수술 기록지', en: 'Inguinal Hernia Repair', fr: 'Cure de hernie inguinale' },
    { opName: 'Inguinal hernia repair (Lichtenstein, mesh)', preDx: 'Inguinal hernia', postDx: 'Inguinal hernia', anesthesia: 'Spinal / Local',
      findings: 'Under [anesthesia], supine position, prepped and draped sterilely. Oblique groin incision made. External oblique opened, cord isolated. Hernia sac identified ([indirect/direct]), dissected and reduced. [Mesh placed and fixed / primary repair]. Hemostasis achieved. Closed in layers. Counts correct. Patient tolerated the procedure well.' }),
  makeOp('op-appendectomy',
    { ko: '충수절제술 기록지', en: 'Appendectomy Record', fr: 'Appendicectomie' },
    { ko: '충수절제술 기록지', en: 'Appendectomy', fr: 'Appendicectomie' },
    { opName: 'Open appendectomy', preDx: 'Acute appendicitis', postDx: 'Acute appendicitis', anesthesia: 'General / Spinal',
      findings: 'Under [anesthesia], McBurney / lower-midline incision. Appendix identified — [inflamed / perforated / gangrenous]. Mesoappendix ligated and divided. Appendix base ligated and transected. Stump [inverted]. Peritoneal cavity irrigated. Hemostasis achieved. Closed in layers. Counts correct.' }),
  makeOp('op-laceration',
    { ko: '열상 봉합 기록지', en: 'Laceration Repair Record', fr: 'Suture de plaie' },
    { ko: '열상 봉합 기록지', en: 'Laceration Repair', fr: 'Suture de plaie' },
    { opName: 'Wound suture / Laceration repair', anesthesia: 'Local', findings: SUTURE_SKELETON, postPlan: 'Wound check in 2-3 days. Suture removal in [7-10] days. Keep clean and dry.' }),
  makeOp('op-ind',
    { ko: '절개 배농 기록지', en: 'Incision & Drainage Record', fr: 'Incision et drainage' },
    { ko: '절개 배농 기록지', en: 'Incision & Drainage', fr: 'Incision et drainage' },
    { opName: 'Incision and drainage (abscess)', anesthesia: 'Local', findings: IND_SKELETON, postPlan: 'Daily dressing change. Wound check in 2-3 days. Antibiotics as prescribed.' }),
  makeOp('op-cesarean',
    { ko: '제왕절개 기록지', en: 'Cesarean Section Record', fr: 'Césarienne' },
    { ko: '제왕절개 기록지', en: 'Cesarean Section', fr: 'Césarienne' },
    { opName: 'Cesarean section (lower segment transverse)', anesthesia: 'Spinal',
      findings: 'Under spinal anesthesia, supine with left tilt, prepped and draped. Pfannenstiel incision. Lower segment transverse uterine incision. Live [male/female] infant delivered at [time], APGAR [ / ]. Placenta and membranes delivered complete. Uterus closed in [2] layers. Hemostasis achieved. Abdomen closed in layers. Counts correct. EBL [ ] mL.',
      postPlan: 'Monitor vitals and bleeding. Uterotonics. Encourage breastfeeding. Remove dressing day 2.' }),
  makeOp('op-circumcision',
    { ko: '포경수술 기록지', en: 'Circumcision Record', fr: 'Circoncision' },
    { ko: '포경수술 기록지', en: 'Circumcision', fr: 'Circoncision' },
    { opName: 'Circumcision', anesthesia: 'Local (dorsal penile block)',
      findings: 'Under local block, prepped and draped. Foreskin retracted and adhesions released. Excess foreskin excised. Hemostasis achieved. Mucosa approximated to skin with absorbable sutures. Dressing applied.',
      postPlan: 'Keep clean and dry. Analgesia. Review in [5-7] days.' }),
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
