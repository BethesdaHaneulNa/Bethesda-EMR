const jwt = require('jsonwebtoken');

// No fallback on purpose. This secret is the only thing that makes a session
// token unforgeable, so a default value published in the repository is the same
// as no login screen at all: anyone can mint an admin token for any install that
// kept it. setup.sh / setup.ps1 write a random 48-char secret into .env on first
// run; refuse to start rather than come up quietly forgeable.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('JWT_SECRET is not set. Run setup.sh (or setup.ps1) to generate .env, then start again.');
  process.exit(1);
}

// The token says who is asking; what they may do is read from the staff table on
// every request (decided 2026-09-29, settings S1). The token used to carry the role
// and permissions for its whole 12 hours, so a member of staff who was deactivated,
// or had a permission taken away, kept everything until the token ran out.
// One primary-key lookup per request is nothing at a clinic's volume.
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  try {
    // Required here, not at the top: database.js is loaded by scripts that only
    // want generateToken / defaultPermsForRole from this file.
    const { pool } = require('../config/database');
    const r = await pool.query(
      'SELECT id, login_id, name, role, department_id, permissions, status FROM staff WHERE id = $1',
      [decoded.id]
    );
    const staff = r.rows[0];
    // 401, not 403: the screen treats it as "signed out" and returns to the login
    // page, which is what a deactivated account should see.
    if (!staff || staff.status !== 'active') return res.status(401).json({ error: 'Account is inactive' });
    req.user = Object.assign({}, decoded, {
      login_id: staff.login_id, name: staff.name, role: staff.role,
      department_id: staff.department_id,
      permissions: Array.isArray(staff.permissions) ? staff.permissions : defaultPermsForRole(staff.role),
    });
    next();
  } catch (err) {
    // The database could not be asked. Refuse rather than fall back on the token.
    return res.status(503).json({ error: 'Could not verify the account' });
  }
}

function roleMiddleware(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

// The permission list and the per-role defaults (the fallback for legacy tokens
// that predate the permissions array) live in permissions.js - see there.
const { ALL_PERMS, ROLE_DEFAULT_PERMS, defaultPermsForRole } = require('./permissions');

function effectivePerms(user) {
  if (user && Array.isArray(user.permissions)) return user.permissions;
  return defaultPermsForRole(user && user.role);
}

// allow if the user holds ANY of the listed module permissions
function permMiddleware(...perms) {
  return function (req, res, next) {
    var have = effectivePerms(req.user);
    var ok = perms.some(function (p) { return have.indexOf(p) >= 0; });
    if (!ok) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id, login_id: user.login_id, name: user.name, role: user.role,
      department_id: user.department_id, permissions: effectivePerms(user),
    },
    SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { authMiddleware, roleMiddleware, permMiddleware, defaultPermsForRole, effectivePerms, generateToken, ALL_PERMS, ROLE_DEFAULT_PERMS };
