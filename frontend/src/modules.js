// Single source of truth for access modules.
// Each module = one grantable permission + its screen/route + nav styling.
// Add a module here and it automatically appears in the nav, the route guard,
// and the staff permission checkboxes.
export var MODULES = [
  { perm: 'registration', path: '/registration', key: 'registration', icon: '🏥', color: '#3b82f6' },
  { perm: 'consultation', path: '/consultation', key: 'consultation', icon: '🩺', color: '#10b981' },
  { perm: 'payment',      path: '/payment',      key: 'payment',      icon: '💳', color: '#f59e0b' },
  { perm: 'pharmacy',     path: '/pharmacy',     key: 'pharmacy',     icon: '💊', color: '#8b5cf6' },
  { perm: 'lab',          path: '/lab',          key: 'lab',          icon: '🧪', color: '#06b6d4' },
  { perm: 'stats',        path: '/stats',        key: 'stats',        icon: '📊', color: '#ec4899' },
  { perm: 'settings',     path: '/settings',     key: 'settings',     icon: '⚙️', color: '#ef4444' },
];

// fallback for legacy sessions whose stored user predates the permissions array
export function defaultPermsForRole(role) {
  switch (role) {
    case 'admin': return MODULES.map(function (m) { return m.perm; });
    case 'frontdesk': return ['registration', 'payment'];
    case 'doctor': return ['consultation'];
    case 'pharmacy': return ['pharmacy'];
    case 'lab': return ['lab'];
    default: return [];
  }
}

export function userPerms(user) {
  if (user && Array.isArray(user.permissions)) return user.permissions;
  return defaultPermsForRole(user && user.role);
}

// modules a user may open, in nav order
export function allowedModules(user) {
  var have = userPerms(user);
  return MODULES.filter(function (m) { return have.indexOf(m.perm) >= 0; });
}

export function homePath(user) {
  var mods = allowedModules(user);
  return mods.length ? mods[0].path : '/login';
}
