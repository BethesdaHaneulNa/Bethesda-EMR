const crypto = require('crypto');

// The bridge token is the only thing guarding the worklist feed, which hands out
// the names and birth dates of today's imaging patients without a login. The
// schema and the PACS compose file both ship the same placeholder, so a clinic
// that never paired a PACS was answering to a value printed in the repository.
// PACS setup generates 48 hex characters; anything short or a known placeholder
// counts as "not configured" and is refused, whatever the bridge sends.
const MIN_BRIDGE_TOKEN_LENGTH = 16;
const PLACEHOLDER_TOKENS = ['change-me-bridge-token'];

function usableBridgeToken(value) {
  const v = String(value || '');
  return v.length >= MIN_BRIDGE_TOKEN_LENGTH && !PLACEHOLDER_TOKENS.includes(v);
}

// Header first: a token in the query string is written into the access log on
// every poll. The query and body forms stay accepted for bridges already out there.
function presentedToken(req) {
  return req.header('x-bridge-token') || (req.body && req.body.token) || req.query.token || '';
}

// Constant time, so the comparison does not reveal how much of a guess was right.
function bridgeTokenMatches(configured, presented) {
  if (!usableBridgeToken(configured) || typeof presented !== 'string') return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(presented);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { MIN_BRIDGE_TOKEN_LENGTH, usableBridgeToken, presentedToken, bridgeTokenMatches };
