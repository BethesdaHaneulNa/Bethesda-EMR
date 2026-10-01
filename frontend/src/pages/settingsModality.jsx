// The imaging modality of an order code (Settings > order codes > edit window).
//
// A device asks its worklist for its own modality and receives only the lines that carry
// exactly that value. The window used to offer six fixed values; the rectoscope seen in
// Madagascar probably asks for "AS", and what an older device asks is only known on site
// (the PACS folder's device-watch shows it). So: the common values to pick from, each with
// a word on what it is, and "Other" for any value typed by hand (the director,
// 2026-10-01). The server cleans and checks it the same way (admin.routes.js
// cleanModality): upper case, A-Z 0-9 _, 16 characters at most.
import { useState } from 'react';

// Shown in this order; the description is t['se_mod_' + code].
export var MODALITIES = ['US', 'CR', 'DX', 'CT', 'MR', 'ES', 'AS', 'XA', 'RF', 'MG', 'NM', 'PT', 'ECG', 'SC', 'OT'];
var OTHER = '__other__';

export function cleanModalityInput(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16); }

export function ModalityField(props) {
  var t = props.t, value = props.value || '';
  // "Other" stays open while its field is empty; a stored value that is not in the list
  // (typed here earlier, or put in the database on site) opens it as well.
  var oS = useState(value !== '' && MODALITIES.indexOf(value) < 0), other = oS[0], setOther = oS[1];
  var picked = other ? OTHER : value;
  return (
    <div>
      <select value={picked} style={props.style} onChange={function (e) {
        var v = e.target.value;
        if (v === OTHER) { setOther(true); props.onChange(''); } else { setOther(false); props.onChange(v); }
      }}>
        <option value="">{t.se_none}</option>
        {MODALITIES.map(function (m) { return <option key={m} value={m}>{m + ' — ' + (t['se_mod_' + m] || m)}</option>; })}
        <option value={OTHER}>{t.se_modOther}</option>
      </select>
      {other ? (
        <input value={value} autoFocus maxLength={16} placeholder={t.se_modOtherPh} autoComplete="off" spellCheck={false}
          onChange={function (e) { props.onChange(cleanModalityInput(e.target.value)); }}
          style={Object.assign({}, props.style, { marginTop: 6, fontFamily: 'monospace', textTransform: 'uppercase' })} />
      ) : null}
    </div>
  );
}

// Why the value matters, under the fields at full width (the field itself sits in a narrow column).
export function ModalityHint(props) {
  // The second line: an order that goes to the worklist is treated as an imaging exam whatever
  // its type (PACS, 2026-10-01) - a rectoscopy filed as a procedure still gets its reading.
  return <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>{props.t.se_modHint}<div style={{ marginTop: 4 }}>{props.t.se_modListHint}</div></div>;
}
