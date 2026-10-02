// Packs PNG files into a Windows .ico (PNG entries, as Windows Vista and later read them).
//   node ico.mjs            makes ico/bethesda-<program>.ico from png/<program>-<size>.png
// The PNGs come from sheet3.html (the chosen marks drawn at 16, 32, 48 and 256).
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SIZES = [16, 32, 48, 256];
fs.mkdirSync(path.join(here, 'ico'), { recursive: true });
for (const prog of ['emr', 'pacs', 'cd']) {
  const pngs = SIZES.map(s => fs.readFileSync(path.join(here, 'png', prog + '-' + s + '.png')));
  const head = Buffer.alloc(6 + 16 * SIZES.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(SIZES.length, 4);
  let offset = head.length;
  SIZES.forEach((s, i) => { const e = 6 + 16 * i; head.writeUInt8(s === 256 ? 0 : s, e); head.writeUInt8(s === 256 ? 0 : s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(offset, e + 12); offset += pngs[i].length; });
  const out = path.join(here, 'ico', 'bethesda-' + prog + '.ico'); fs.writeFileSync(out, Buffer.concat([head, ...pngs])); console.log(out, offset, 'bytes');
}
