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

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
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

// fallback for legacy tokens that predate the permissions array
function defaultPermsForRole(role) {
  switch (role) {
    case 'admin': return ['registration', 'consultation', 'payment', 'pharmacy', 'lab', 'stats', 'settings'];
    case 'frontdesk': return ['registration', 'payment'];
    case 'doctor': return ['consultation'];
    case 'pharmacy': return ['pharmacy'];
    case 'lab': return ['lab'];
    default: return [];
  }
}

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

module.exports = { authMiddleware, roleMiddleware, permMiddleware, defaultPermsForRole, effectivePerms, generateToken };
