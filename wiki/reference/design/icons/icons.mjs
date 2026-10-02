// The common icon of the three Bethesda programs (EMR, PACS, CD): candidate marks.
// Everything is drawn here, as SVG: no downloaded picture, no font (the letter B is a path).
//   node icons.mjs            writes svg/<option>-<program>.svg and sheet.html
// sheet.html draws the comparison sheets on a canvas (256/48/32/16, on light, dark and a
// desktop-like background) and posts them as PNG to the helper that serves it
// (see sheet-server.mjs). An .ico can be made from the same SVG once a mark is chosen.
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// colours: the EMR's own families (frontend/index.html) - blue is the accent, violet is what
// the EMR uses for imaging, deep cyan for the laboratory and for things that leave the house
export const TONE = {
  blue:   { top: '#3b82f6', bottom: '#1d4ed8', ink: '#1d4ed8' },
  violet: { top: '#8b5cf6', bottom: '#5b21b6', ink: '#5b21b6' },
  cyan:   { top: '#1596b3', bottom: '#155e75', ink: '#155e75' },
};
export const PROGRAMS = { emr: 'Bethesda EMR', pacs: 'Bethesda PACS', cd: 'Bethesda CD' };

const tile = (id, t) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient></defs><rect x="16" y="16" width="224" height="224" rx="52" fill="url(#${id})"/>`;

// the letter B of the login screen, drawn: a stem and two bowls, the holes cut by even-odd
const LETTER_B = '<path fill="#fff" fill-rule="evenodd" transform="translate(-5 0)" d="M84 60H138A32 32 0 0 1 138 124H84Z M84 124H146A36 36 0 0 1 146 196H84Z M112 84H137A13 13 0 0 1 137 110H112Z M112 138H143A17 17 0 0 1 143 172H112Z"/>';

// a cross with rounded ends (not the red-cross emblem: never red on white here)
const cross = (cx, cy, len, thick, fill) => `<rect x="${cx - len / 2}" y="${cy - thick / 2}" width="${len}" height="${thick}" rx="${thick / 4}" fill="${fill}"/><rect x="${cx - thick / 2}" y="${cy - len / 2}" width="${thick}" height="${len}" rx="${thick / 4}" fill="${fill}"/>`;

// the three shapes: a sheet of the record, a screen, a disc - white, with the cross in the tile's colour
const SHAPE = {
  emr: ink => `<path fill="#fff" d="M84 44H150L190 84V198A14 14 0 0 1 176 212H84A14 14 0 0 1 70 198V58A14 14 0 0 1 84 44Z"/><path fill="${ink}" opacity=".28" d="M150 44L190 84H162A12 12 0 0 1 150 72Z"/>${cross(130, 142, 76, 24, ink)}`,
  pacs: ink => `<rect x="40" y="56" width="176" height="122" rx="16" fill="#fff"/><rect x="112" y="176" width="32" height="20" fill="#fff"/><rect x="84" y="192" width="88" height="16" rx="8" fill="#fff"/>${cross(128, 117, 70, 22, ink)}`,
  cd: ink => `<circle cx="128" cy="128" r="88" fill="#fff"/><circle cx="128" cy="128" r="62" fill="none" stroke="${ink}" stroke-opacity=".22" stroke-width="6"/>${cross(128, 128, 68, 22, ink)}<circle cx="128" cy="128" r="7" fill="#fff"/>`,
};

// the candidates
export const OPTIONS = {
  A: { name: '글자 B', note: '지금 로그인 화면의 파란 「B」 그대로. 프로그램은 색으로만 구별(EMR 파랑 · PACS 보라 · CD 청록).',
       tone: { emr: 'blue', pacs: 'violet', cd: 'cyan' }, draw: () => LETTER_B },
  B: { name: '모양 + 십자, 한 가지 파랑', note: '셋 다 같은 파랑. 프로그램은 흰 모양으로 구별(기록지 · 화면 · 디스크), 가운데 십자가 공통 표식.',
       tone: { emr: 'blue', pacs: 'blue', cd: 'blue' }, draw: (p, ink) => SHAPE[p](ink) },
  C: { name: '모양 + 십자 + 색', note: 'B 의 모양에 프로그램마다 색을 더함. 모양과 색 두 가지로 구별.',
       tone: { emr: 'blue', pacs: 'violet', cd: 'cyan' }, draw: (p, ink) => SHAPE[p](ink) },
};

export function svg(option, program) {
  const o = OPTIONS[option], t = TONE[o.tone[program]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${tile('g' + option + program, t)}${o.draw(program, t.ink)}</svg>`;
}

if ((process.argv[1] || '').endsWith('icons.mjs')) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.join(here, 'svg'), { recursive: true });
  const all = {};
  for (const o of Object.keys(OPTIONS)) for (const p of Object.keys(PROGRAMS)) { const s = svg(o, p); all[o + '-' + p] = s; fs.writeFileSync(path.join(here, 'svg', o + '-' + p + '.svg'), s + '\n'); }
  const meta = Object.fromEntries(Object.keys(OPTIONS).map(k => [k, { name: OPTIONS[k].name, note: OPTIONS[k].note }]));
  const page = fs.readFileSync(path.join(here, 'sheet.template.html'), 'utf8').replace('/*DATA*/', 'var ICONS = ' + JSON.stringify(all) + '; var META = ' + JSON.stringify(meta) + '; var PROGRAMS = ' + JSON.stringify(PROGRAMS) + ';');
  fs.writeFileSync(path.join(here, 'sheet.html'), page);
  console.log('wrote', Object.keys(all).length, 'svg and sheet.html');
}
