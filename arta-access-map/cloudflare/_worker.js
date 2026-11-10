// Προσβάσιμη Άρτα – έκδοση για Cloudflare Pages (advanced mode, _worker.js)
// Χρειάζεται: D1 binding με όνομα DB και μεταβλητή ADMIN_EMAIL.
// Οι φωτογραφίες αποθηκεύονται στη D1 (συμπιεσμένες από τον browser), ώστε να μη χρειάζεται R2.

const CATEGORIES = {
  dimosia: 'Δημόσια υπηρεσία', ygeia: 'Υγεία', politismos: 'Πολιτισμός & αξιοθέατα', ekpaideusi: 'Εκπαίδευση',
  estiasi: 'Εστίαση & καφέ', emporio: 'Καταστήματα', trapeza: 'Τράπεζες & ΑΤΜ', parking: 'Θέση στάθμευσης ΑμεΑ',
  wc: 'Τουαλέτα ΑμεΑ', rampa: 'Ράμπα / πεζοδρόμιο', diavasi: 'Διάβαση / φανάρι με ήχο', parko: 'Πάρκο & πλατεία',
  metafores: 'Συγκοινωνίες', paralia: 'Παραλία', allo: 'Άλλο',
};
const FEATURES = {
  rampa: 'Ράμπα εισόδου', isopedo: 'Ισόπεδη είσοδος', anelkystiras: 'Ανελκυστήρας', wc: 'WC ΑμεΑ',
  parking: 'Στάθμευση ΑμεΑ', odigos: 'Οδηγός όδευσης τυφλών', ixitiko: 'Ηχητική σήμανση',
};
const LEVELS = { full: 'Πλήρως προσβάσιμο', partial: 'Μερικώς προσβάσιμο' };
const BOUNDS = { minLat: 38.99, maxLat: 39.42, minLng: 20.75, maxLng: 21.1 };
const CENTER = { lat: 39.1605, lng: 20.9856, zoom: 15 };

// Γνωστά προσβάσιμα σημεία (seed/arta-points.json) – συμπληρώνονται από το scripts/build-cloudflare.js
const SEED = /*__SEED__*/ null;

const MAX_PHOTO_BYTES = 1_900_000; // όριο D1 για BLOB ~2 MB
const MAX_PHOTOS = 3;
const SESSION_COOKIE = 'arta_sid';
const SESSION_DAYS = 30;
const PBKDF2_ITER = 100000; // μέγιστο που επιτρέπει το Workers runtime

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS points (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, level TEXT NOT NULL, features TEXT NOT NULL DEFAULT '[]',
    lat REAL NOT NULL, lng REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reject_reason TEXT, source TEXT NOT NULL DEFAULT 'user',
    external_id TEXT UNIQUE, created_by INTEGER, reviewed_by INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_points_status ON points(status)`,
  `CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, point_id INTEGER NOT NULL REFERENCES points(id) ON DELETE CASCADE,
    mime TEXT NOT NULL, data BLOB NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reject_reason TEXT, uploaded_by INTEGER,
    reviewed_by INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_point ON photos(point_id)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status)`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let schemaReady = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let res;
    try {
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/')) {
        if (!env.DB) throw new HttpError(500, 'Δεν έχει συνδεθεί η βάση D1 (binding με όνομα DB). Δείτε τις οδηγίες εγκατάστασης.');
        if (!schemaReady) { await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))); await seedPoints(env.DB); schemaReady = true; }
        res = await handle(request, env, url);
      } else {
        res = await env.ASSETS.fetch(request);
      }
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      res = json({ error: e instanceof HttpError ? e.message : 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.' }, e.status || 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
    return res;
  },
};

/** Προσθέτει τα γνωστά σημεία μία φορά ανά έκδοση του seed (δεν ξαναβάζει όσα έσβησε ο διαχειριστής). */
async function seedPoints(db) {
  if (!SEED?.points?.length) return;
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").first();
  if (row && Number(row.value) >= SEED.version) return;
  const stmts = SEED.points.map((p) => db.prepare(`INSERT OR IGNORE INTO points
      (name, description, address, category, level, features, lat, lng, status, source, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`)
    .bind(p.name, p.description || '', p.address || '', p.category, p.level, JSON.stringify(p.features || []), p.lat, p.lng, p.source, p.externalId));
  stmts.push(db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(SEED.version)));
  await db.batch(stmts);
}

// ---------------- βοηθήματα ----------------
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function readJson(request) {
  try { return (await request.json()) || {}; } catch { return {}; }
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${toHex(salt)}$${toHex(await pbkdf2(password, salt, PBKDF2_ITER))}`;
}
async function verifyPassword(password, stored) {
  const [algo, iter, salt, hash] = String(stored).split('$');
  if (algo !== 'pbkdf2' || !salt || !hash) return false;
  const actual = new Uint8Array(await pbkdf2(password, fromHex(salt), Number(iter)));
  const expected = fromHex(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sessionCookie(token, expires, secure) {
  return [`${SESSION_COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict',
    expires ? `Expires=${new Date(expires).toUTCString()}` : 'Max-Age=0', secure ? 'Secure' : null].filter(Boolean).join('; ');
}

function sniffImage(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/** Παίρνει τις φωτογραφίες από ένα FormData και τις ελέγχει. */
async function readPhotos(form) {
  const files = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (files.length > MAX_PHOTOS) throw new HttpError(400, `Έως ${MAX_PHOTOS} φωτογραφίες ανά υποβολή.`);
  const out = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) throw new HttpError(400, 'Η φωτογραφία είναι πολύ μεγάλη (έως 2 MB).');
    const bytes = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(bytes);
    if (!mime) throw new HttpError(400, 'Επιτρέπονται μόνο φωτογραφίες JPEG, PNG ή WebP.');
    out.push({ bytes, mime });
  }
  return out;
}

function validatePoint(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    out.name = str(body.name, 120);
    if (out.name.length < 2) throw new HttpError(400, 'Το όνομα είναι υποχρεωτικό.');
  }
  if (!partial || has('description')) out.description = str(body.description, 2000);
  if (!partial || has('address')) out.address = str(body.address, 200);
  if (!partial || has('category')) {
    out.category = str(body.category, 40);
    if (!CATEGORIES[out.category]) throw new HttpError(400, 'Μη έγκυρη κατηγορία.');
  }
  if (!partial || has('level')) {
    out.level = str(body.level, 20);
    if (!LEVELS[out.level]) throw new HttpError(400, 'Μη έγκυρο επίπεδο προσβασιμότητας.');
  }
  if (!partial || has('features')) {
    let f = body.features;
    if (!Array.isArray(f)) f = f ? [f] : [];
    out.features = JSON.stringify([...new Set(f.map(String).filter((k) => FEATURES[k]))]);
  }
  if (!partial || has('lat') || has('lng')) {
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Επιλέξτε θέση στον χάρτη.');
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng)
      throw new HttpError(400, 'Η θέση πρέπει να βρίσκεται στην περιοχή της Άρτας.');
    out.lat = Math.round(lat * 1e6) / 1e6;
    out.lng = Math.round(lng * 1e6) / 1e6;
  }
  return out;
}

function formToObject(form) {
  const o = {};
  for (const k of ['name', 'description', 'address', 'category', 'level', 'lat', 'lng']) {
    const v = form.get(k);
    if (typeof v === 'string') o[k] = v;
  }
  o.features = form.getAll('features').filter((v) => typeof v === 'string');
  return o;
}

const photoView = (ph) => ({ id: ph.id, url: `/photos/${ph.id}`, status: ph.status, ...(ph.reject_reason ? { rejectReason: ph.reject_reason } : {}) });

function serializePoint(p, photos) {
  return {
    id: p.id, name: p.name, description: p.description, address: p.address, category: p.category, level: p.level,
    features: JSON.parse(p.features || '[]'), lat: p.lat, lng: p.lng, status: p.status, source: p.source, createdAt: p.created_at,
    ...(p.reject_reason ? { rejectReason: p.reject_reason } : {}),
    ...(p.author_name !== undefined ? { author: p.author_name } : {}),
    photos: photos || [],
  };
}

// Απλό όριο προσπαθειών σύνδεσης ανά IP (ανά instance)
const hits = new Map();
function rateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.reset < now) hits.set(ip, { count: 1, reset: now + 15 * 60 * 1000 });
  else if (++rec.count > 20) throw new HttpError(429, 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.');
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}

// ---------------- δρομολόγηση ----------------
async function handle(request, env, url) {
  const db = env.DB;
  const method = request.method;
  const path = url.pathname;
  const secure = url.protocol === 'https:';
  const adminEmail = String(env.ADMIN_EMAIL || '').trim().toLowerCase();

  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  const user = token
    ? await db.prepare(`SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
                        WHERE s.token = ? AND s.expires_at > ?`).bind(token, Date.now()).first()
    : null;
  const isAdmin = user?.role === 'admin';
  const needUser = () => { if (!user) throw new HttpError(401, 'Απαιτείται σύνδεση.'); };
  const needAdmin = () => { needUser(); if (!isAdmin) throw new HttpError(403, 'Μόνο για διαχειριστές.'); };

  async function startSession(userId, payload, status = 200) {
    const t = randomToken();
    const expires = Date.now() + SESSION_DAYS * 864e5;
    await db.batch([
      db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(t, userId, expires),
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
    ]);
    return json(payload, status, { 'Set-Cookie': sessionCookie(t, expires, secure) });
  }

  let m;
  // ---- ρυθμίσεις
  if (path === '/api/config' && method === 'GET')
    return json({ categories: CATEGORIES, features: FEATURES, levels: LEVELS, bounds: BOUNDS, center: CENTER });

  // ---- λογαριασμοί
  if (path === '/api/auth/me') return json({ user });

  if (path === '/api/auth/register' && method === 'POST') {
    rateLimit(request);
    const b = await readJson(request);
    const name = str(b.name, 80);
    const email = str(b.email, 200).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    if (name.length < 2) throw new HttpError(400, 'Συμπληρώστε το όνομά σας.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Μη έγκυρο email.');
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (await db.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) throw new HttpError(409, 'Υπάρχει ήδη λογαριασμός με αυτό το email.');
    const role = adminEmail && email === adminEmail ? 'admin' : 'user';
    const r = await db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
      .bind(email, name, await hashPassword(password), role).run();
    const id = r.meta.last_row_id;
    return startSession(id, { user: { id, name, email, role } }, 201);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    rateLimit(request);
    const b = await readJson(request);
    const email = str(b.email, 200).toLowerCase();
    const u = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!u || !(await verifyPassword(typeof b.password === 'string' ? b.password : '', u.password_hash)))
      throw new HttpError(401, 'Λάθος email ή κωδικός.');
    // Ο λογαριασμός του ADMIN_EMAIL γίνεται διαχειριστής
    if (adminEmail && u.email.toLowerCase() === adminEmail && u.role !== 'admin') {
      await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(u.id).run();
      u.role = 'admin';
    }
    return startSession(u.id, { user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0, secure) });
  }

  // ---- δημόσια σημεία
  if (path === '/api/points' && method === 'GET') {
    const [{ results: points }, { results: photos }] = await db.batch([
      db.prepare("SELECT * FROM points WHERE status = 'approved' ORDER BY name"),
      db.prepare("SELECT id, point_id, status FROM photos WHERE status = 'approved' ORDER BY id"),
    ]);
    const by = new Map();
    for (const ph of photos) { if (!by.has(ph.point_id)) by.set(ph.point_id, []); by.get(ph.point_id).push(photoView(ph)); }
    return json({ points: points.map((p) => serializePoint(p, by.get(p.id))) });
  }

  if ((m = path.match(/^\/api\/points\/(\d+)$/)) && method === 'GET') {
    const p = await db.prepare('SELECT * FROM points WHERE id = ?').bind(Number(m[1])).first();
    if (!p || !(p.status === 'approved' || isAdmin || (user && p.created_by === user.id))) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    const { results } = await db.prepare(`SELECT id, status, reject_reason FROM photos WHERE point_id = ? ${isAdmin ? '' : "AND status = 'approved'"}`).bind(p.id).all();
    return json({ point: serializePoint(p, results.map(photoView)) });
  }

  // ---- υποβολές
  if (path === '/api/points' && method === 'POST') {
    needUser();
    const form = await request.formData();
    const d = validatePoint(formToObject(form));
    const photos = await readPhotos(form);
    const status = isAdmin ? 'approved' : 'pending';
    const r = await db.prepare(`INSERT INTO points (name, description, address, category, level, features, lat, lng, status, created_by, reviewed_by, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(d.name, d.description, d.address, d.category, d.level, d.features, d.lat, d.lng, status, user.id,
        isAdmin ? user.id : null, isAdmin ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null).run();
    const pid = r.meta.last_row_id;
    if (photos.length) {
      await db.batch(photos.map((ph) => db.prepare('INSERT INTO photos (point_id, mime, data, status, uploaded_by) VALUES (?, ?, ?, ?, ?)')
        .bind(pid, ph.mime, ph.bytes, status, user.id)));
    }
    const p = await db.prepare('SELECT * FROM points WHERE id = ?').bind(pid).first();
    const { results } = await db.prepare('SELECT id, status, reject_reason FROM photos WHERE point_id = ?').bind(pid).all();
    return json({ point: serializePoint(p, results.map(photoView)) }, 201);
  }

  if ((m = path.match(/^\/api\/points\/(\d+)\/photos$/)) && method === 'POST') {
    needUser();
    const p = await db.prepare("SELECT id FROM points WHERE id = ? AND status = 'approved'").bind(Number(m[1])).first();
    if (!p) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    const photos = await readPhotos(await request.formData());
    if (!photos.length) throw new HttpError(400, 'Επιλέξτε τουλάχιστον μία φωτογραφία.');
    const status = isAdmin ? 'approved' : 'pending';
    const res = await db.batch(photos.map((ph) => db.prepare('INSERT INTO photos (point_id, mime, data, status, uploaded_by) VALUES (?, ?, ?, ?, ?)')
      .bind(p.id, ph.mime, ph.bytes, status, user.id)));
    return json({ photos: res.map((r) => ({ id: r.meta.last_row_id, url: `/photos/${r.meta.last_row_id}`, status })) }, 201);
  }

  if (path === '/api/my/submissions' && method === 'GET') {
    needUser();
    const [{ results: points }, { results: photos }] = await db.batch([
      db.prepare('SELECT * FROM points WHERE created_by = ? ORDER BY id DESC').bind(user.id),
      db.prepare(`SELECT ph.id, ph.point_id, ph.status, ph.reject_reason, p.name AS point_name FROM photos ph JOIN points p ON p.id = ph.point_id
                  WHERE ph.uploaded_by = ? ORDER BY ph.id DESC`).bind(user.id),
    ]);
    const own = new Set(points.map((p) => p.id));
    return json({
      points: points.map((p) => serializePoint(p, photos.filter((ph) => ph.point_id === p.id).map(photoView))),
      photos: photos.filter((ph) => !own.has(ph.point_id)).map((ph) => ({ ...photoView(ph), pointId: ph.point_id, pointName: ph.point_name })),
    });
  }

  // ---- φωτογραφίες
  if ((m = path.match(/^\/photos\/(\d+)$/)) && method === 'GET') {
    const ph = await db.prepare('SELECT ph.*, p.status AS point_status FROM photos ph JOIN points p ON p.id = ph.point_id WHERE ph.id = ?')
      .bind(Number(m[1])).first();
    const pub = ph && ph.status === 'approved' && ph.point_status === 'approved';
    if (!ph || !(pub || isAdmin || (user && ph.uploaded_by === user.id))) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(ph.data), {
      headers: { 'Content-Type': ph.mime, 'Cache-Control': pub ? 'public, max-age=86400' : 'private, no-store' },
    });
  }

  // ---- διαχείριση
  if (path.startsWith('/api/admin/')) {
    needAdmin();
    return handleAdmin(request, db, path, method, user, url);
  }

  throw new HttpError(404, 'Δεν βρέθηκε.');
}

async function handleAdmin(request, db, path, method, user, url) {
  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const review = (table, id, status, reason) =>
    db.prepare(`UPDATE ${table} SET status = ?, reject_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'`)
      .bind(status, status === 'rejected' ? reason || null : null, user.id, now(), id);
  let m;

  if (path === '/api/admin/stats') {
    const c = (sql) => db.prepare(sql);
    const r = await db.batch([
      c("SELECT COUNT(*) n FROM points WHERE status='approved'"),
      c("SELECT COUNT(*) n FROM points WHERE status='pending'"),
      c("SELECT COUNT(*) n FROM photos ph JOIN points p ON p.id=ph.point_id WHERE ph.status='pending' AND p.status='approved'"),
      c('SELECT COUNT(*) n FROM users'),
    ]);
    const [a, b, d, e] = r.map((x) => x.results[0].n);
    return json({ approvedPoints: a, pendingPoints: b, pendingPhotos: d, users: e });
  }

  if (path === '/api/admin/pending') {
    const [{ results: points }, { results: photos }] = await db.batch([
      db.prepare(`SELECT p.*, u.name AS author_name, u.email AS author_email FROM points p LEFT JOIN users u ON u.id = p.created_by
                  WHERE p.status = 'pending' ORDER BY p.id`),
      db.prepare(`SELECT ph.id, ph.point_id, ph.status, ph.created_at, p.name AS point_name, p.status AS point_status, u.name AS author_name
                  FROM photos ph JOIN points p ON p.id = ph.point_id LEFT JOIN users u ON u.id = ph.uploaded_by
                  WHERE ph.status = 'pending' ORDER BY ph.id`),
    ]);
    return json({
      points: points.map((p) => ({ ...serializePoint(p, photos.filter((ph) => ph.point_id === p.id).map(photoView)), authorEmail: p.author_email })),
      photos: photos.filter((ph) => ph.point_status === 'approved')
        .map((ph) => ({ ...photoView(ph), pointId: ph.point_id, pointName: ph.point_name, author: ph.author_name, createdAt: ph.created_at })),
    });
  }

  if (path === '/api/admin/points' && method === 'GET') {
    const st = ['approved', 'pending', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'approved';
    const { results } = await db.prepare(`SELECT p.*, u.name AS author_name FROM points p LEFT JOIN users u ON u.id = p.created_by
                                          WHERE p.status = ? ORDER BY p.id DESC`).bind(st).all();
    return json({ points: results.map((p) => serializePoint(p)) });
  }

  if ((m = path.match(/^\/api\/admin\/points\/(\d+)\/(approve|reject)$/)) && method === 'POST') {
    const id = Number(m[1]);
    const body = await readJson(request);
    const approve = m[2] === 'approve';
    const r = await review('points', id, approve ? 'approved' : 'rejected', str(body.reason, 500)).run();
    if (!r.meta.changes) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής υποβολή.');
    const { results } = await db.prepare("SELECT id FROM photos WHERE point_id = ? AND status = 'pending'").bind(id).all();
    const reject = new Set((Array.isArray(body.rejectPhotoIds) ? body.rejectPhotoIds : []).map(Number));
    if (results.length) {
      await db.batch(results.map((ph) => approve
        ? review('photos', ph.id, reject.has(ph.id) ? 'rejected' : 'approved', 'Απορρίφθηκε κατά την έγκριση του σημείου')
        : review('photos', ph.id, 'rejected', str(body.reason, 500))));
    }
    return json({ ok: true });
  }

  if ((m = path.match(/^\/api\/admin\/photos\/(\d+)\/(approve|reject)$/)) && method === 'POST') {
    const body = await readJson(request);
    const r = await review('photos', Number(m[1]), m[2] === 'approve' ? 'approved' : 'rejected', str(body.reason, 500)).run();
    if (!r.meta.changes) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής φωτογραφία.');
    return json({ ok: true });
  }

  if ((m = path.match(/^\/api\/admin\/points\/(\d+)$/)) && method === 'PATCH') {
    const id = Number(m[1]);
    const d = validatePoint(await readJson(request), { partial: true });
    const keys = Object.keys(d);
    if (!keys.length) throw new HttpError(400, 'Δεν δόθηκαν αλλαγές.');
    const r = await db.prepare(`UPDATE points SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...keys.map((k) => d[k]), id).run();
    if (!r.meta.changes) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    return json({ point: serializePoint(await db.prepare('SELECT * FROM points WHERE id = ?').bind(id).first()) });
  }

  if ((m = path.match(/^\/api\/admin\/points\/(\d+)$/)) && method === 'DELETE') {
    const id = Number(m[1]);
    const [, r] = await db.batch([
      db.prepare('DELETE FROM photos WHERE point_id = ?').bind(id),
      db.prepare('DELETE FROM points WHERE id = ?').bind(id),
    ]);
    if (!r.meta.changes) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    return json({ ok: true });
  }

  if ((m = path.match(/^\/api\/admin\/photos\/(\d+)$/)) && method === 'DELETE') {
    const r = await db.prepare('DELETE FROM photos WHERE id = ?').bind(Number(m[1])).run();
    if (!r.meta.changes) throw new HttpError(404, 'Η φωτογραφία δεν βρέθηκε.');
    return json({ ok: true });
  }

  if (path === '/api/admin/import-osm' && method === 'POST') {
    const body = await readJson(request);
    let data;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
        headers: { 'User-Agent': 'arta-access-map/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch {
      throw new HttpError(502, 'Το OpenStreetMap δεν απάντησε. Δοκιμάστε ξανά σε λίγα λεπτά.');
    }
    const pts = (data.elements || []).map(osmToPoint).filter(Boolean);
    const status = body.pending ? 'pending' : 'approved';
    const stmts = pts.map((p) => db.prepare(`
      INSERT INTO points (name, description, address, category, level, features, lat, lng, status, source, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'osm', ?)
      ON CONFLICT(external_id) DO UPDATE SET name=excluded.name, address=excluded.address, category=excluded.category,
        level=excluded.level, features=excluded.features, lat=excluded.lat, lng=excluded.lng`)
      .bind(p.name, p.description, p.address, p.category, p.level, JSON.stringify(p.features), p.lat, p.lng, status, p.externalId));
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    return json({ imported: pts.length });
  }

  throw new HttpError(404, 'Δεν βρέθηκε.');
}

// ---------------- OpenStreetMap ----------------
const BBOX = `${BOUNDS.minLat},${BOUNDS.minLng},${BOUNDS.maxLat},${BOUNDS.maxLng}`;
const OVERPASS_QUERY = `[out:json][timeout:60];
(
  nwr["wheelchair"~"^(yes|designated|limited)$"](${BBOX});
  nwr["toilets:wheelchair"="yes"](${BBOX});
  nwr["amenity"="parking_space"]["parking_space"="disabled"](${BBOX});
  node["highway"="crossing"]["traffic_signals:sound"="yes"](${BBOX});
  node["highway"="traffic_signals"]["traffic_signals:sound"="yes"](${BBOX});
);
out center tags;`;

function osmCategory(t) {
  const a = t.amenity, hw = t.highway;
  if (a === 'parking_space' || (a === 'parking' && t['capacity:disabled'])) return 'parking';
  if (a === 'toilets') return 'wc';
  if (hw === 'crossing' || hw === 'traffic_signals') return 'diavasi';
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'].includes(a) || t.healthcare) return 'ygeia';
  if (['townhall', 'police', 'post_office', 'courthouse', 'fire_station', 'social_facility'].includes(a) || t.office === 'government') return 'dimosia';
  if (['school', 'university', 'college', 'kindergarten', 'library'].includes(a)) return 'ekpaideusi';
  if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'ice_cream'].includes(a)) return 'estiasi';
  if (['bank', 'atm'].includes(a)) return 'trapeza';
  if (a === 'bus_station' || t.public_transport || hw === 'bus_stop') return 'metafores';
  if (t.leisure === 'park' || t.place === 'square' || t.leisure === 'playground') return 'parko';
  if (['museum', 'attraction', 'gallery'].includes(t.tourism) || t.historic || ['place_of_worship', 'theatre', 'cinema'].includes(a)) return 'politismos';
  if (t.shop) return 'emporio';
  return 'allo';
}
const OSM_FALLBACK = { parking: 'Θέση στάθμευσης ΑμεΑ', wc: 'Τουαλέτα ΑμεΑ', diavasi: 'Φανάρι με ηχητική σήμανση', trapeza: 'ATM', metafores: 'Στάση λεωφορείου' };

function osmToPoint(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const cat = osmCategory(t);
  const name = t['name:el'] || t.name || OSM_FALLBACK[cat];
  if (!name) return null;
  const f = new Set();
  if (t['toilets:wheelchair'] === 'yes' || (t.amenity === 'toilets' && t.wheelchair === 'yes')) f.add('wc');
  if (t.ramp === 'yes' || t['ramp:wheelchair'] === 'yes') f.add('rampa');
  if (t.elevator === 'yes' || t.lift === 'yes') f.add('anelkystiras');
  if (t.tactile_paving === 'yes') f.add('odigos');
  if (t['traffic_signals:sound'] === 'yes') f.add('ixitiko');
  if (cat === 'parking' || Number(t['capacity:disabled']) > 0) f.add('parking');
  return {
    externalId: `osm:${el.type}/${el.id}`, name: String(name).slice(0, 120), category: cat,
    level: t.wheelchair === 'limited' ? 'partial' : 'full', features: [...f],
    lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6,
    address: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ').slice(0, 200),
    description: String(t['wheelchair:description:el'] || t['wheelchair:description'] || t.description || '').slice(0, 2000),
  };
}
