// Referral letter (진료의뢰서). First concrete template.
// To add another document later, copy this shape into a new file and register it.
import { A4, ClinicHeader, DocMetaRow, PatientBox, DocSection, SignatureBlock, L } from './shared.jsx';

var FL = {
  referredTo: { ko: '수신 (의뢰 기관 / 의사)', en: 'Referred To (Facility / Physician)', fr: 'Destinataire (établissement / médecin)' },
  diagnosis:  { ko: '진단명', en: 'Diagnosis', fr: 'Diagnostic' },
  findings:   { ko: '환자 상태 및 진료 소견', en: 'Clinical Findings', fr: 'État du patient et observations' },
  treatment:  { ko: '현재 치료 / 투약', en: 'Current Treatment / Medication', fr: 'Traitement / médication en cours' },
  purpose:    { ko: '의뢰 목적', en: 'Reason for Referral', fr: 'Motif de la référence' },
};

var INTRO = {
  ko: '아래 환자를 귀 기관(의)께 의뢰하오니, 진료를 부탁드립니다.',
  en: 'We kindly refer the following patient to your care for further evaluation and management.',
  fr: 'Nous référons le patient suivant à vos soins pour évaluation et prise en charge complémentaires.',
};

function Layout(props) {
  var v = props.values || {}, lang = props.lang;
  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={L({ ko: '진 료 의 뢰 서', en: 'Referral Letter', fr: 'Lettre de Référence' }, lang)} />
      <DocMetaRow lang={lang} docNo={props.docNo} dateStr={props.dateStr} />

      <div style={{ fontSize: 12.5, marginBottom: 10 }}>
        <b>{L(FL.referredTo, lang)}:</b>{' '}
        <span style={{ borderBottom: '1px solid #999', display: 'inline-block', minWidth: 320 }}>{v.referredTo || ' '}</span>
      </div>

      <PatientBox patient={props.patient} lang={lang} />

      <div style={{ fontSize: 12.5, margin: '6px 0 14px', fontStyle: 'italic' }}>{L(INTRO, lang)}</div>

      <DocSection label={L(FL.diagnosis, lang)} value={v.diagnosis} />
      <DocSection label={L(FL.findings, lang)} value={v.findings} />
      <DocSection label={L(FL.treatment, lang)} value={v.treatment} />
      <DocSection label={L(FL.purpose, lang)} value={v.purpose} />

      <SignatureBlock lang={lang} doctor={props.doctor} clinic={props.clinic} />
    </A4>
  );
}

export default {
  code: 'referral',
  category: 'document',
  name: { ko: '진료의뢰서', en: 'Referral Letter', fr: 'Lettre de référence' },
  fields: [
    { key: 'referredTo', label: FL.referredTo, type: 'text' },
    { key: 'diagnosis',  label: FL.diagnosis,  type: 'textarea', rows: 2 },
    { key: 'findings',   label: FL.findings,   type: 'textarea', rows: 4, autofill: 'note' },
    { key: 'treatment',  label: FL.treatment,  type: 'textarea', rows: 3, autofill: 'meds' },
    { key: 'purpose',    label: FL.purpose,    type: 'textarea', rows: 2 },
  ],
  Layout: Layout,
};
