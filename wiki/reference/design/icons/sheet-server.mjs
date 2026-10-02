// Helper for the icon sheets: serves sheet.html and writes the PNG it posts back into
// wiki/reference/design/. Local only (127.0.0.1); the design session's helper port is 9190.
//   node icons.mjs && node sheet-server.mjs      then open http://127.0.0.1:9190/
// (design session - tooling only, not part of the app)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET' && u.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(here, 'sheet.html'))); return; }
  if (req.method === 'POST' && u.pathname === '/png') {
    const name = (u.searchParams.get('name') || '').replace(/[^a-zA-Z0-9_-]/g, ''); if (!name) { res.writeHead(400); res.end(); return; }
    const parts = []; req.on('data', d => parts.push(d)); req.on('end', () => { fs.writeFileSync(path.join(here, '..', name + '.png'), Buffer.concat(parts)); res.writeHead(200); res.end('ok'); });
    return;
  }
  res.writeHead(404); res.end();
}).listen(9190, '127.0.0.1', () => console.log('icon sheets on http://127.0.0.1:9190/'));
