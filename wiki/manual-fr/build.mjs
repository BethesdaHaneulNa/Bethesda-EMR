// Builds the French staff guide into one printable page (A4).
//
//   node wiki/manual-fr/build.mjs [out.html]
//
// Reads the module files of this folder in the order staff meet them, turns the
// Markdown into HTML (only what these files use: headings, paragraphs, lists, tables,
// bold, italic, code, quotes) and writes one HTML file with a cover, a table of
// contents and a chapter per module. Print it from a browser, or:
//
//   msedge --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=guide.pdf out.html
//
// No dependencies. Comments in the sources (<!-- à revoir -->, <!-- terme à vérifier -->)
// are not printed; they are listed on the console so nothing is forgotten.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(here, 'guide-fr.html');

const CHAPTERS = [
  ['reception', 'Accueil'],
  ['consultation', 'Médecin'],
  ['laboratory', 'Laboratoire'],
  ['pharmacy', 'Pharmacie'],
  ['payment', 'Caisse'],
  ['pacs', 'Imagerie'],
  ['statistics', 'Administration'],
  ['settings', 'Administration'],
  ['design', 'Tout le personnel'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + codes[Number(i)] + '</code>');
  return s;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function render(md, id, notes) {
  md = md.replace(/<!--([\s\S]*?)-->/g, (m, c) => { notes.push(id + ': ' + c.trim().replace(/\s+/g, ' ')); return ''; });
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let title = '';
  let i = 0;
  const listItem = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

  function list(indent) {
    const first = listItem.exec(lines[i]);
    const ordered = /\d/.test(first[2]);
    const items = [];
    while (i < lines.length) {
      const m = listItem.exec(lines[i]);
      if (m && m[1].length === indent) {
        i++;
        let body = m[3];
        // continuation lines and nested lists
        let nested = '';
        while (i < lines.length) {
          const n = listItem.exec(lines[i]);
          if (n && n[1].length > indent) { nested += list(n[1].length); continue; }
          if (!n && /^\s+\S/.test(lines[i]) && lines[i].search(/\S/) > indent) { body += ' ' + lines[i].trim(); i++; continue; }
          break;
        }
        items.push('<li>' + inline(body) + nested + '</li>');
        continue;
      }
      break;
    }
    return (ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>');
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      if (level === 1) { title = h[2].trim(); i++; continue; }
      html.push(`<h${level} id="${id}-${slug(h[2])}">${inline(h[2].trim())}</h${level}>`);
      i++; continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      html.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (listItem.test(line)) { html.push(list(listItem.exec(line)[1].length)); continue; }
    if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      html.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>');
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>\s?|\s*\|)/.test(lines[i]) && !listItem.test(lines[i])) { p.push(lines[i].trim()); i++; }
    html.push('<p>' + inline(p.join(' ')) + '</p>');
  }
  return { title, html: html.join('\n') };
}

const notes = [];
const chapters = [];
for (const [id, reader] of CHAPTERS) {
  const file = path.join(here, id + '.md');
  if (!fs.existsSync(file)) { console.log('missing: ' + id + '.md (left out)'); continue; }
  const r = render(fs.readFileSync(file, 'utf8'), id, notes);
  chapters.push({ id, reader, title: r.title || id, html: r.html });
}

let version = '';
try { version = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'backend', 'package.json'), 'utf8')).version; } catch (e) { /* not essential */ }
const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const css = `
@page { size: A4; margin: 18mm 17mm 20mm 17mm; @bottom-center { content: counter(page); font: 9pt "Segoe UI", Arial, sans-serif; color: #555; } }
@page :first { @bottom-center { content: ""; } }
* { box-sizing: border-box; }
html { font-size: 10.5pt; }
body { margin: 0; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #111; line-height: 1.5; background: #fff; }
.sheet { max-width: 176mm; margin: 0 auto; padding: 0 0 12mm; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .kicker { font-size: 11pt; letter-spacing: .08em; text-transform: uppercase; color: #444; }
.cover h1 { font-size: 34pt; line-height: 1.1; margin: 6mm 0 4mm; font-weight: 700; letter-spacing: -.01em; }
.cover p { font-size: 12pt; color: #333; max-width: 120mm; margin: 0 0 3mm; }
.cover .meta { margin-top: 18mm; font-size: 9.5pt; color: #555; border-top: 1px solid #999; padding-top: 4mm; }
.toc { page-break-after: always; }
.toc h2 { font-size: 16pt; margin: 0 0 6mm; }
.toc table { border: 0; }
.toc td { border: 0; border-bottom: 1px dotted #999; padding: 2.2mm 0; font-size: 11pt; }
.toc td:last-child { text-align: right; color: #444; font-size: 9.5pt; }
.chapter { page-break-before: always; }
.chapter:first-of-type { page-break-before: auto; }
.chapter > header { border-bottom: 2px solid #111; margin-bottom: 5mm; padding-bottom: 2mm; }
.chapter > header .who { font-size: 9pt; letter-spacing: .08em; text-transform: uppercase; color: #444; }
.chapter > header h1 { font-size: 22pt; margin: 1mm 0 0; line-height: 1.15; }
h2 { font-size: 13.5pt; margin: 8mm 0 2.5mm; padding-top: 1mm; border-top: 1px solid #bbb; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 5.5mm 0 1.5mm; page-break-after: avoid; }
h4 { font-size: 10.5pt; margin: 4mm 0 1mm; page-break-after: avoid; }
p { margin: 0 0 2.4mm; orphans: 3; widows: 3; }
ol, ul { margin: 0 0 3mm; padding-left: 6.5mm; }
li { margin: 0 0 1.2mm; }
li > ol, li > ul { margin-top: 1mm; }
strong { font-weight: 700; }
code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: #eee; padding: 0 1mm; border-radius: 1mm; }
blockquote { margin: 0 0 3mm; padding: 2mm 4mm; border-left: 3px solid #111; background: #f3f3f3; }
table { width: 100%; border-collapse: collapse; margin: 1mm 0 4mm; font-size: 9.5pt; page-break-inside: auto; }
th, td { border: 1px solid #888; padding: 1.6mm 2mm; vertical-align: top; text-align: left; }
th { background: #e6e6e6; font-weight: 700; }
tr { page-break-inside: avoid; }
@media screen { body { background: #ddd; } .sheet { background: #fff; padding: 18mm 17mm; margin: 8mm auto; max-width: 210mm; } }
`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bethesda EMR — Guide du personnel</title>
<style>${css}</style>
</head>
<body>
<div class="sheet">
<section class="cover">
  <div class="kicker">Hôpital Bethesda · Madagascar</div>
  <h1>Bethesda EMR<br>Guide du personnel</h1>
  <p>Comment utiliser le dossier médical au quotidien : accueil, consultation, laboratoire, pharmacie, caisse et administration.</p>
  <p>Gardez ce guide près de l'ordinateur. Les mots en <strong>gras</strong> sont ceux que vous voyez à l'écran.</p>
  <div class="meta">Version ${esc(version || '—')} du logiciel · guide imprimé le ${esc(today)} · les patients cités sont fictifs</div>
</section>
<section class="toc">
  <h2>Sommaire</h2>
  <table>
${chapters.map((c) => `    <tr><td><a href="#${c.id}" style="color:inherit;text-decoration:none">${esc(c.title)}</a></td><td>${esc(c.reader)}</td></tr>`).join('\n')}
  </table>
</section>
${chapters.map((c) => `<section class="chapter" id="${c.id}">
<header><div class="who">${esc(c.reader)}</div><h1>${esc(c.title)}</h1></header>
${c.html}
</section>`).join('\n')}
</div>
</body>
</html>
`;

fs.writeFileSync(out, page, 'utf8');
console.log('written: ' + out + ' (' + chapters.length + ' chapters, ' + Math.round(page.length / 1024) + ' KB)');
if (notes.length) {
  console.log('\nnotes left in the sources (not printed):');
  notes.forEach((n) => console.log('  - ' + n));
}
