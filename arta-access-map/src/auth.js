'use strict';
const crypto = require('node:crypto');

const SESSION_COOKIE = 'arta_sid';
const SESSION_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function createUser(db, { email, name, password, role = 'user' }) {
  const r = db
    .prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(email.trim().toLowerCase(), name.trim(), hashPassword(password), role);
  return Number(r.lastInsertRowid);
}

/** Δημιουργεί ή αναβαθμίζει τον διαχειριστή από ADMIN_EMAIL / ADMIN_PASSWORD. */
function ensureAdmin(db, email, password, name = 'Διαχειριστής') {
  if (!email || !password) return null;
  const u = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (u) {
    if (u.role !== 'admin') db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(u.id);
    return u.id;
  }
  return createUser(db, { email, name, password, role: 'admin' });
}

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return { token, expires };
}

function sessionCookie(token, expires, secure) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    expires ? `Expires=${new Date(expires).toUTCString()}` : 'Max-Age=0',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Middleware: φορτώνει req.user από το cookie συνεδρίας. */
function loadUser(db) {
  const stmt = db.prepare(`
    SELECT u.id, u.email, u.name, u.role FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?`);
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.sessionToken = token || null;
    req.user = token ? stmt.get(token, Date.now()) || null : null;
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Απαιτείται σύνδεση.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Απαιτείται σύνδεση.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Μόνο για διαχειριστές.' });
  next();
}

/** Απλό όριο προσπαθειών ανά IP (στη μνήμη). */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key);
    if (!rec || rec.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
    } else if (++rec.count > max) {
      res.set('Retry-After', String(Math.ceil((rec.reset - now) / 1000)));
      return res.status(429).json({ error: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.' });
    }
    if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    next();
  };
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createUser,
  ensureAdmin,
  createSession,
  sessionCookie,
  loadUser,
  requireUser,
  requireAdmin,
  rateLimit,
};
