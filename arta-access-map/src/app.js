'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');

const { openDb, tx } = require('./db');
const auth = require('./auth');
const { CATEGORIES, FEATURES, LEVELS, BOUNDS, CENTER } = require('./constants');

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_POINT = 3;

/** Αναγνωρίζει τον τύπο εικόνας από τα πρώτα bytes (όχι από το όνομα αρχείου). */
function sniffImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' };
  return null;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Έλεγχος & καθαρισμός πεδίων σημείου. */
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
    if (typeof f === 'string') {
      try {
        f = f.startsWith('[') ? JSON.parse(f) : f.split(',');
      } catch {
        f = [];
      }
    }
    if (!Array.isArray(f)) f = f ? [f] : [];
    out.features = JSON.stringify([...new Set(f.map(String).filter((k) => FEATURES[k]))]);
  }
  if (!partial || has('lat') || has('lng')) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Επιλέξτε θέση στον χάρτη.');
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng)
      throw new HttpError(400, 'Η θέση πρέπει να βρίσκεται στην περιοχή της Άρτας.');
    out.lat = Math.round(lat * 1e6) / 1e6;
    out.lng = Math.round(lng * 1e6) / 1e6;
  }
  return out;
}

function createApp({
  dbFile = path.join(__dirname, '..', 'data', 'arta.db'),
  uploadDir = path.join(__dirname, '..', 'data', 'uploads'),
  adminEmail = process.env.ADMIN_EMAIL,
  adminPassword = process.env.ADMIN_PASSWORD,
  secureCookies = process.env.NODE_ENV === 'production',
  trustProxy = process.env.TRUST_PROXY === '1',
} = {}) {
  const db = openDb(dbFile);
  fs.mkdirSync(uploadDir, { recursive: true });
  auth.ensureAdmin(db, adminEmail, adminPassword);

  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; " +
        "style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    });
    next();
  });

  app.use(express.json({ limit: '50kb' }));
  app.use(auth.loadUser(db));

  // Στατικά αρχεία
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/vendor/leaflet', express.static(path.dirname(require.resolve('leaflet/dist/leaflet.js'))));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS_PER_POINT, fields: 20 },
  });

  /** Αποθηκεύει τα ανεβασμένα αρχεία (μετά από έλεγχο) και επιστρέφει τα στοιχεία τους. */
  function storeFiles(files) {
    const stored = [];
    for (const f of files || []) {
      const kind = sniffImage(f.buffer);
      if (!kind) throw new HttpError(400, 'Επιτρέπονται μόνο φωτογραφίες JPEG, PNG ή WebP.');
      stored.push({ buffer: f.buffer, mime: kind.mime, filename: `${crypto.randomUUID()}.${kind.ext}` });
    }
    for (const s of stored) fs.writeFileSync(path.join(uploadDir, s.filename), s.buffer);
    return stored;
  }

  function removeFiles(filenames) {
    for (const f of filenames) fs.rm(path.join(uploadDir, path.basename(f)), { force: true }, () => {});
  }

  const insertPhoto = db.prepare(
    'INSERT INTO photos (point_id, filename, mime, status, uploaded_by) VALUES (?, ?, ?, ?, ?)'
  );

  function serializePoint(p, photos) {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      address: p.address,
      category: p.category,
      level: p.level,
      features: JSON.parse(p.features || '[]'),
      lat: p.lat,
      lng: p.lng,
      status: p.status,
      source: p.source,
      createdAt: p.created_at,
      ...(p.reject_reason ? { rejectReason: p.reject_reason } : {}),
      ...(p.author_name !== undefined ? { author: p.author_name } : {}),
      photos: photos || [],
    };
  }

  const photoView = (ph) => ({
    id: ph.id,
    url: `/photos/${ph.id}`,
    status: ph.status,
    ...(ph.reject_reason ? { rejectReason: ph.reject_reason } : {}),
  });

  const wrap = (fn) => (req, res, next) => {
    try {
      const r = fn(req, res, next);
      if (r && typeof r.catch === 'function') r.catch(next);
    } catch (e) {
      next(e);
    }
  };

  const api = express.Router();

  // ---------- Ρυθμίσεις ----------
  api.get('/config', (_req, res) => res.json({ categories: CATEGORIES, features: FEATURES, levels: LEVELS, bounds: BOUNDS, center: CENTER }));

  // ---------- Λογαριασμοί ----------
  const authLimiter = rateLimitOrPass();
  function rateLimitOrPass() {
    return process.env.DISABLE_RATE_LIMIT === '1'
      ? (_q, _s, n) => n()
      : auth.rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  }

  function login(res, userId) {
    const s = auth.createSession(db, userId);
    res.set('Set-Cookie', auth.sessionCookie(s.token, s.expires, secureCookies));
  }

  api.post('/auth/register', authLimiter, wrap((req, res) => {
    const name = str(req.body.name, 80);
    const email = str(req.body.email, 200).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.length < 2) throw new HttpError(400, 'Συμπληρώστε το όνομά σας.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Μη έγκυρο email.');
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Υπάρχει ήδη λογαριασμός με αυτό το email.');
    const id = auth.createUser(db, { email, name, password });
    login(res, id);
    res.status(201).json({ user: { id, name, email, role: 'user' } });
  }));

  api.post('/auth/login', authLimiter, wrap((req, res) => {
    const email = str(req.body.email, 200).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!u || !auth.verifyPassword(password, u.password_hash)) throw new HttpError(401, 'Λάθος email ή κωδικός.');
    login(res, u.id);
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }));

  api.post('/auth/logout', (req, res) => {
    if (req.sessionToken) db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
    res.set('Set-Cookie', auth.sessionCookie('', 0, secureCookies));
    res.json({ ok: true });
  });

  api.get('/auth/me', (req, res) => res.json({ user: req.user }));

  // ---------- Δημόσια σημεία ----------
  api.get('/points', (_req, res) => {
    const points = db.prepare("SELECT * FROM points WHERE status = 'approved' ORDER BY name").all();
    const photos = db.prepare("SELECT id, point_id, status FROM photos WHERE status = 'approved' ORDER BY id").all();
    const byPoint = new Map();
    for (const ph of photos) {
      if (!byPoint.has(ph.point_id)) byPoint.set(ph.point_id, []);
      byPoint.get(ph.point_id).push(photoView(ph));
    }
    res.json({ points: points.map((p) => serializePoint(p, byPoint.get(p.id))) });
  });

  api.get('/points/:id', (req, res) => {
    const p = db.prepare('SELECT * FROM points WHERE id = ?').get(Number(req.params.id));
    const canSee = p && (p.status === 'approved' || req.user?.role === 'admin' || (req.user && p.created_by === req.user.id));
    if (!canSee) return res.status(404).json({ error: 'Το σημείο δεν βρέθηκε.' });
    const photos = db
      .prepare(req.user?.role === 'admin' ? 'SELECT * FROM photos WHERE point_id = ?' : "SELECT * FROM photos WHERE point_id = ? AND status = 'approved'")
      .all(p.id);
    res.json({ point: serializePoint(p, photos.map(photoView)) });
  });

  // ---------- Υποβολές χρηστών ----------
  api.post('/points', auth.requireUser, upload.array('photos', MAX_PHOTOS_PER_POINT), wrap((req, res) => {
    const data = validatePoint(req.body);
    const isAdmin = req.user.role === 'admin';
    const status = isAdmin ? 'approved' : 'pending';
    const files = storeFiles(req.files);
    try {
      const id = tx(db, () => {
        const r = db
          .prepare(`INSERT INTO points (name, description, address, category, level, features, lat, lng, status, created_by, reviewed_by, reviewed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${isAdmin ? "datetime('now')" : 'NULL'})`)
          .run(data.name, data.description, data.address, data.category, data.level, data.features, data.lat, data.lng, status, req.user.id, isAdmin ? req.user.id : null);
        const pid = Number(r.lastInsertRowid);
        for (const f of files) insertPhoto.run(pid, f.filename, f.mime, status, req.user.id);
        return pid;
      });
      const p = db.prepare('SELECT * FROM points WHERE id = ?').get(id);
      const photos = db.prepare('SELECT * FROM photos WHERE point_id = ?').all(id).map(photoView);
      res.status(201).json({ point: serializePoint(p, photos) });
    } catch (e) {
      removeFiles(files.map((f) => f.filename));
      throw e;
    }
  }));

  api.post('/points/:id/photos', auth.requireUser, upload.array('photos', MAX_PHOTOS_PER_POINT), wrap((req, res) => {
    const p = db.prepare("SELECT id FROM points WHERE id = ? AND status = 'approved'").get(Number(req.params.id));
    if (!p) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    if (!req.files?.length) throw new HttpError(400, 'Επιλέξτε τουλάχιστον μία φωτογραφία.');
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    const files = storeFiles(req.files);
    const ids = tx(db, () => files.map((f) => Number(insertPhoto.run(p.id, f.filename, f.mime, status, req.user.id).lastInsertRowid)));
    res.status(201).json({ photos: ids.map((id) => ({ id, url: `/photos/${id}`, status })) });
  }));

  api.get('/my/submissions', auth.requireUser, (req, res) => {
    const points = db.prepare('SELECT * FROM points WHERE created_by = ? ORDER BY id DESC').all(req.user.id);
    const photos = db
      .prepare(`SELECT ph.*, p.name AS point_name FROM photos ph JOIN points p ON p.id = ph.point_id
                WHERE ph.uploaded_by = ? ORDER BY ph.id DESC`)
      .all(req.user.id);
    res.json({
      points: points.map((p) => serializePoint(p, photos.filter((ph) => ph.point_id === p.id).map(photoView))),
      photos: photos.filter((ph) => !points.some((p) => p.id === ph.point_id)).map((ph) => ({ ...photoView(ph), pointId: ph.point_id, pointName: ph.point_name })),
    });
  });

  // ---------- Διαχείριση ----------
  const admin = express.Router();
  admin.use(auth.requireAdmin);

  admin.get('/stats', (_req, res) => {
    const c = (sql) => db.prepare(sql).get().n;
    res.json({
      approvedPoints: c("SELECT COUNT(*) n FROM points WHERE status='approved'"),
      pendingPoints: c("SELECT COUNT(*) n FROM points WHERE status='pending'"),
      pendingPhotos: c("SELECT COUNT(*) n FROM photos ph JOIN points p ON p.id=ph.point_id WHERE ph.status='pending' AND p.status='approved'"),
      users: c('SELECT COUNT(*) n FROM users'),
    });
  });

  admin.get('/pending', (_req, res) => {
    const points = db
      .prepare(`SELECT p.*, u.name AS author_name, u.email AS author_email FROM points p
                LEFT JOIN users u ON u.id = p.created_by WHERE p.status = 'pending' ORDER BY p.id`)
      .all();
    const photos = db
      .prepare(`SELECT ph.*, p.name AS point_name, p.status AS point_status, u.name AS author_name
                FROM photos ph JOIN points p ON p.id = ph.point_id LEFT JOIN users u ON u.id = ph.uploaded_by
                WHERE ph.status = 'pending' ORDER BY ph.id`)
      .all();
    res.json({
      points: points.map((p) => ({
        ...serializePoint(p, photos.filter((ph) => ph.point_id === p.id).map(photoView)),
        authorEmail: p.author_email,
      })),
      photos: photos
        .filter((ph) => ph.point_status === 'approved')
        .map((ph) => ({ ...photoView(ph), pointId: ph.point_id, pointName: ph.point_name, author: ph.author_name, createdAt: ph.created_at })),
    });
  });

  admin.get('/points', (req, res) => {
    const status = ['approved', 'pending', 'rejected'].includes(req.query.status) ? req.query.status : 'approved';
    const points = db
      .prepare(`SELECT p.*, u.name AS author_name FROM points p LEFT JOIN users u ON u.id = p.created_by
                WHERE p.status = ? ORDER BY p.id DESC`)
      .all(status);
    res.json({ points: points.map((p) => serializePoint(p)) });
  });

  function review(table, id, status, reason, reviewerId) {
    const r = db
      .prepare(`UPDATE ${table} SET status = ?, reject_reason = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ? AND status = 'pending'`)
      .run(status, status === 'rejected' ? reason || null : null, reviewerId, id);
    return r.changes > 0;
  }

  admin.post('/points/:id/approve', wrap((req, res) => {
    const id = Number(req.params.id);
    const ok = tx(db, () => {
      const changed = review('points', id, 'approved', null, req.user.id);
      if (changed) {
        // Οι φωτογραφίες που στάλθηκαν μαζί με το σημείο εγκρίνονται μαζί του,
        // εκτός αν ο διαχειριστής έχει ορίσει ρητά ποιες απορρίπτονται.
        const reject = new Set((req.body?.rejectPhotoIds || []).map(Number));
        for (const ph of db.prepare("SELECT id FROM photos WHERE point_id = ? AND status = 'pending'").all(id)) {
          review('photos', ph.id, reject.has(ph.id) ? 'rejected' : 'approved', 'Απορρίφθηκε κατά την έγκριση του σημείου', req.user.id);
        }
      }
      return changed;
    });
    if (!ok) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής υποβολή.');
    res.json({ ok: true });
  }));

  admin.post('/points/:id/reject', wrap((req, res) => {
    const id = Number(req.params.id);
    const reason = str(req.body?.reason, 500);
    const ok = tx(db, () => {
      const changed = review('points', id, 'rejected', reason, req.user.id);
      if (changed) for (const ph of db.prepare("SELECT id FROM photos WHERE point_id = ? AND status = 'pending'").all(id)) review('photos', ph.id, 'rejected', reason, req.user.id);
      return changed;
    });
    if (!ok) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής υποβολή.');
    res.json({ ok: true });
  }));

  admin.post('/photos/:id/approve', wrap((req, res) => {
    if (!review('photos', Number(req.params.id), 'approved', null, req.user.id)) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής φωτογραφία.');
    res.json({ ok: true });
  }));

  admin.post('/photos/:id/reject', wrap((req, res) => {
    if (!review('photos', Number(req.params.id), 'rejected', str(req.body?.reason, 500), req.user.id)) throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής φωτογραφία.');
    res.json({ ok: true });
  }));

  admin.patch('/points/:id', wrap((req, res) => {
    const id = Number(req.params.id);
    const data = validatePoint(req.body, { partial: true });
    const keys = Object.keys(data);
    if (!keys.length) throw new HttpError(400, 'Δεν δόθηκαν αλλαγές.');
    const r = db.prepare(`UPDATE points SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => data[k]), id);
    if (!r.changes) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    res.json({ point: serializePoint(db.prepare('SELECT * FROM points WHERE id = ?').get(id)) });
  }));

  admin.delete('/points/:id', wrap((req, res) => {
    const id = Number(req.params.id);
    const files = db.prepare('SELECT filename FROM photos WHERE point_id = ?').all(id).map((r) => r.filename);
    const r = db.prepare('DELETE FROM points WHERE id = ?').run(id);
    if (!r.changes) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
    removeFiles(files);
    res.json({ ok: true });
  }));

  admin.delete('/photos/:id', wrap((req, res) => {
    const ph = db.prepare('SELECT filename FROM photos WHERE id = ?').get(Number(req.params.id));
    if (!ph) throw new HttpError(404, 'Η φωτογραφία δεν βρέθηκε.');
    db.prepare('DELETE FROM photos WHERE id = ?').run(Number(req.params.id));
    removeFiles([ph.filename]);
    res.json({ ok: true });
  }));

  admin.post('/import-osm', wrap(async (req, res) => {
    const { fetchOverpass, importInto } = require('../scripts/import-osm');
    let data;
    try {
      data = await fetchOverpass();
    } catch {
      throw new HttpError(502, 'Το OpenStreetMap δεν απάντησε. Δοκιμάστε ξανά αργότερα.');
    }
    res.json({ imported: importInto(db, data, Boolean(req.body?.pending)) });
  }));

  api.use('/admin', admin);
  app.use('/api', api);

  // ---------- Φωτογραφίες (με έλεγχο δικαιωμάτων) ----------
  app.get('/photos/:id', (req, res) => {
    const ph = db
      .prepare('SELECT ph.*, p.status AS point_status FROM photos ph JOIN points p ON p.id = ph.point_id WHERE ph.id = ?')
      .get(Number(req.params.id));
    const isPublic = ph && ph.status === 'approved' && ph.point_status === 'approved';
    const allowed = ph && (isPublic || req.user?.role === 'admin' || (req.user && ph.uploaded_by === req.user.id));
    if (!allowed) return res.status(404).end();
    res.set('Cache-Control', isPublic ? 'public, max-age=86400' : 'private, no-store');
    res.type(ph.mime);
    res.sendFile(path.join(uploadDir, path.basename(ph.filename)), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Δεν βρέθηκε.' }));

  // ---------- Σφάλματα ----------
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? 'Κάθε φωτογραφία πρέπει να είναι έως 5 MB.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `Έως ${MAX_PHOTOS_PER_POINT} φωτογραφίες ανά υποβολή.`
        : 'Μη έγκυρο αρχείο.';
      return res.status(400).json({ error: msg });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Μη έγκυρα δεδομένα.' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.' });
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp, sniffImage, validatePoint };
