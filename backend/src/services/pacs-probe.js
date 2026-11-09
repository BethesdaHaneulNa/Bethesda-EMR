// Can the EMR reach the image server the way the viewer relay does (pacs.viewer.js)?
// GET <orthanc_url>/system with the password pair-with-emr stored, from inside the EMR's
// container - which is the point: an address that opens in a browser on the server PC
// can still be one the container cannot reach (2026-09-30, clean install: the LAN
// address with 9090, which listens on 127.0.0.1 only -> ECONNREFUSED; every status
// line stayed green).
//
// Used by the status check (status.routes.js, line "pacs_relay"); the PACS session can
// call it when the address is saved, so both say the same thing. Returns
//   { state: 'ok', version }                       Orthanc answered and accepted the login
//   { state: 'refused' }                           nothing listens there: server stopped, or the address/port is wrong
//   { state: 'unknownHost' }                       the host name does not resolve
//   { state: 'timeout' }                           no answer within the time limit
//   { state: 'unauthorized' }                      Orthanc refused the stored password -> pair-with-emr
//   { state: 'notOrthanc', code }                  something answered that is not Orthanc (another program on the port)
//   { state: 'badAddress' }                        the stored address is not a URL
// The password is never part of the result or of a log line.
const http = require('http');
const https = require('https');

const DEFAULT_URL = 'http://host.docker.internal:9090';

function probeOrthanc(orthancUrl, password, timeoutMs) {
  const limit = timeoutMs || 4000;
  return new Promise(resolve => {
    let target;
    try {
      const base = new URL(String(orthancUrl || DEFAULT_URL));
      target = new URL(base.pathname.replace(/\/+$/, '') + '/system', base.origin);
    } catch (e) { return resolve({ state: 'badAddress' }); }
    let done = false;
    const finish = r => { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request(target, {
      method: 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from('admin:' + (password || '')).toString('base64'), Accept: 'application/json' },
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { if (body.length < 20000) body += c; });
      res.on('end', () => {
        // Orthanc's own refusal carries its realm; a 401 from something else is "not Orthanc".
        if (res.statusCode === 401) {
          const realm = String(res.headers['www-authenticate'] || '');
          return finish(/orthanc/i.test(realm) || !realm ? { state: 'unauthorized' } : { state: 'notOrthanc', code: 401 });
        }
        let j = null;
        try { j = JSON.parse(body); } catch (e) { /* not JSON */ }
        if (res.statusCode === 200 && j && typeof j === 'object' && (j.Version || j.ApiVersion)) {
          return finish({ state: 'ok', version: String(j.Version || '') });
        }
        finish({ state: 'notOrthanc', code: res.statusCode || 0 });
      });
      res.on('error', () => finish({ state: 'notOrthanc', code: res.statusCode || 0 }));
    });
    const timer = setTimeout(() => { req.destroy(); finish({ state: 'timeout' }); }, limit);
    req.on('error', err => {
      const code = err && err.code;
      if (code === 'ECONNREFUSED') return finish({ state: 'refused' });
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return finish({ state: 'unknownHost' });
      if (code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') return finish({ state: 'timeout' });
      finish({ state: 'refused' });
    });
    req.end();
  });
}

module.exports = { probeOrthanc, DEFAULT_URL };
