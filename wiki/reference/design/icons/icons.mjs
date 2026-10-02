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

// The director chose option C on 2026-10-02 and asked for the EMR picture to be something
// other than a sheet of paper. Four shapes to choose from, in the same style.
export const EMR_ALT = {
  house:  { name: '집 (병원)', note: '베데스다 = 「자비의 집」. 지붕이 있는 집 안에 십자',
            draw: ink => '<path fill="#fff" stroke="#fff" stroke-width="18" stroke-linejoin="round" d="M128 58L198 114V198H58V114Z"/>' + cross(128, 150, 66, 21, ink) },
  heart:  { name: '하트', note: '돌봄. 하트 안에 십자',
            draw: ink => '<path fill="#fff" d="M128 210C66 168 42 132 42 100A46 46 0 0 1 128 78A46 46 0 0 1 214 100C214 132 190 168 128 210Z"/>' + cross(128, 126, 62, 20, ink) },
  folder: { name: '차트 폴더', note: '환자 차트를 넣는 폴더. 종이 대신 폴더',
            draw: ink => '<path fill="#fff" d="M48 78A14 14 0 0 1 62 64H104A10 10 0 0 1 112 68L124 84H194A14 14 0 0 1 208 98V186A14 14 0 0 1 194 200H62A14 14 0 0 1 48 186Z"/>' + cross(128, 142, 62, 20, ink) },
  person: { name: '사람 (환자)', note: '환자 한 사람. 가슴에 작은 십자',
            draw: ink => '<circle cx="128" cy="90" r="34" fill="#fff"/><path fill="#fff" d="M56 212A72 72 0 0 1 200 212Z"/>' + cross(128, 178, 40, 14, ink) },
};
export function svgEmrAlt(k) { const t = TONE.blue; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${tile('gE' + k, t)}${EMR_ALT[k].draw(t.ink)}</svg>`; }

// Chosen by the director on 2026-10-02: option C, with the house for the EMR.
export const FINAL = { emr: () => svgEmrAlt('house'), pacs: () => svg('C', 'pacs'), cd: () => svg('C', 'cd') };

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
  // second sheet: the EMR shapes to choose from, beside the PACS and CD of option C
  const alt = {}; for (const k of Object.keys(EMR_ALT)) { alt[k] = svgEmrAlt(k); fs.writeFileSync(path.join(here, 'svg', 'C-emr-' + k + '.svg'), alt[k] + '\n'); }
  const page2 = fs.readFileSync(path.join(here, 'sheet2.template.html'), 'utf8').replace('/*DATA*/', 'var ALT = ' + JSON.stringify(alt) + '; var ALTMETA = ' + JSON.stringify(Object.fromEntries(Object.keys(EMR_ALT).map(k => [k, { name: EMR_ALT[k].name, note: EMR_ALT[k].note }]))) + '; var PACS = ' + JSON.stringify(all['C-pacs']) + '; var CD = ' + JSON.stringify(all['C-cd']) + ';');
  fs.writeFileSync(path.join(here, 'sheet2.html'), page2);
  // the chosen three: final/bethesda-<program>.svg, and the page that draws their PNGs
  fs.mkdirSync(path.join(here, 'final'), { recursive: true }); fs.mkdirSync(path.join(here, 'png'), { recursive: true });
  const fin = {}; for (const p of Object.keys(FINAL)) { fin[p] = FINAL[p](); fs.writeFileSync(path.join(here, 'final', 'bethesda-' + p + '.svg'), fin[p] + String.fromCharCode(10)); }
  fs.writeFileSync(path.join(here, 'sheet3.html'), fs.readFileSync(path.join(here, 'sheet3.template.html'), 'utf8').replace('/*DATA*/', 'var FINAL = ' + JSON.stringify(fin) + ';'));
  console.log('wrote', Object.keys(all).length + Object.keys(alt).length, 'svg, sheet.html and sheet2.html');
}
