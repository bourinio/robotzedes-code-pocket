'use strict';
process.env.DISABLE_RATE_LIMIT = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { toPoint } = require('../scripts/import-osm');

let server, base, tmp;
const ADMIN = { email: 'admin@test.gr', password: 'admin-pass-123' };
// Ελάχιστο έγκυρο PNG 1x1
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arta-'));
  const app = createApp({ dbFile: path.join(tmp, 'db.sqlite'), uploadDir: path.join(tmp, 'up'), adminEmail: ADMIN.email, adminPassword: ADMIN.password, seed: false });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const headers = cookie ? { cookie } : {};
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + url, { method, headers, body: payload });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
  };
}

function pointForm(extra = {}, photos = 1) {
  const fd = new FormData();
  const fields = { name: 'Φαρμακείο Κέντρου', category: 'ygeia', level: 'full', lat: '39.1600', lng: '20.9850', address: 'Σκουφά 1', description: 'Ράμπα στην είσοδο', ...extra };
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('features', 'rampa');
  fd.append('features', 'wc');
  for (let i = 0; i < photos; i++) fd.append('photos', new Blob([PNG], { type: 'image/png' }), `p${i}.png`);
  return fd;
}

test('ροή: εγγραφή → υποβολή → έγκριση από διαχειριστή → δημόσια εμφάνιση', async () => {
  const user = client();
  const admin = client();
  const anon = client();

  // Ανώνυμος δεν μπορεί να υποβάλει
  assert.equal((await anon('POST', '/api/points', pointForm())).status, 401);

  let r = await user('POST', '/api/auth/register', { name: 'Μαρία', email: 'maria@test.gr', password: 'kodikos123' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, 'user');

  r = await user('POST', '/api/points', pointForm());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const pid = r.body.point.id;
  const photoUrl = r.body.point.photos[0].url;
  assert.equal(r.body.point.status, 'pending');
  assert.deepEqual(r.body.point.features, ['rampa', 'wc']);

  // Δεν εμφανίζεται δημόσια, ούτε η φωτογραφία
  assert.equal((await anon('GET', '/api/points')).body.points.length, 0);
  assert.equal((await anon('GET', photoUrl)).status, 404);
  assert.equal((await anon('GET', `/api/points/${pid}`)).status, 404);
  // Ο δημιουργός βλέπει τη φωτογραφία του
  assert.equal((await user('GET', photoUrl)).status, 200);

  // Απλός χρήστης δεν έχει πρόσβαση στη διαχείριση
  assert.equal((await user('GET', '/api/admin/pending')).status, 403);

  assert.equal((await admin('POST', '/api/auth/login', { email: ADMIN.email, password: 'wrong-pass' })).status, 401);
  assert.equal((await admin('POST', '/api/auth/login', ADMIN)).status, 200);
  r = await admin('GET', '/api/admin/pending');
  assert.equal(r.body.points.length, 1);
  assert.equal(r.body.points[0].photos.length, 1);

  assert.equal((await admin('POST', `/api/admin/points/${pid}/approve`, {})).status, 200);
  // Δεύτερη έγκριση: δεν είναι πλέον εκκρεμές
  assert.equal((await admin('POST', `/api/admin/points/${pid}/approve`, {})).status, 404);

  r = await anon('GET', '/api/points');
  assert.equal(r.body.points.length, 1);
  assert.equal(r.body.points[0].photos.length, 1);
  assert.equal((await anon('GET', photoUrl)).status, 200);

  // Νέα φωτογραφία σε εγκεκριμένο σημείο → αναμονή → απόρριψη
  const fd = new FormData();
  fd.append('photos', new Blob([PNG], { type: 'image/png' }), 'x.png');
  r = await user('POST', `/api/points/${pid}/photos`, fd);
  assert.equal(r.status, 201);
  const phId = r.body.photos[0].id;
  r = await admin('GET', '/api/admin/pending');
  assert.equal(r.body.photos.length, 1);
  assert.equal((await admin('POST', `/api/admin/photos/${phId}/reject`, { reason: 'Θολή' })).status, 200);
  assert.equal((await anon('GET', `/photos/${phId}`)).status, 404);

  r = await user('GET', '/api/my/submissions');
  assert.equal(r.body.points[0].status, 'approved');
  const rejected = r.body.points[0].photos.find((p) => p.id === phId);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.rejectReason, 'Θολή');
});

test('απόρριψη σημείου με αιτία', async () => {
  const user = client();
  const admin = client();
  await user('POST', '/api/auth/register', { name: 'Γιώργος', email: 'giorgos@test.gr', password: 'kodikos123' });
  await admin('POST', '/api/auth/login', ADMIN);
  const r = await user('POST', '/api/points', pointForm({ name: 'Λάθος σημείο' }, 0));
  assert.equal((await admin('POST', `/api/admin/points/${r.body.point.id}/reject`, { reason: 'Διπλότυπο' })).status, 200);
  const mine = await user('GET', '/api/my/submissions');
  assert.equal(mine.body.points[0].status, 'rejected');
  assert.equal(mine.body.points[0].rejectReason, 'Διπλότυπο');
});

test('έλεγχοι εγκυρότητας', async () => {
  const user = client();
  await user('POST', '/api/auth/register', { name: 'Ελένη', email: 'eleni@test.gr', password: 'kodikos123' });

  assert.equal((await user('POST', '/api/auth/register', { name: 'Ελένη', email: 'ELENI@test.gr', password: 'kodikos123' })).status, 409);
  assert.equal((await client()('POST', '/api/auth/register', { name: 'X', email: 'bad', password: '1' })).status, 400);

  // Εκτός Άρτας
  assert.equal((await user('POST', '/api/points', pointForm({ lat: '37.98', lng: '23.72' }, 0))).status, 400);
  // Λάθος κατηγορία
  assert.equal((await user('POST', '/api/points', pointForm({ category: 'xyz' }, 0))).status, 400);
  // Αρχείο που δεν είναι εικόνα
  const fd = pointForm({}, 0);
  fd.append('photos', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.png');
  const r = await user('POST', '/api/points', fd);
  assert.equal(r.status, 400);
  assert.match(r.body.error, /JPEG, PNG ή WebP/);
  // Πάνω από 3 φωτογραφίες
  assert.equal((await user('POST', '/api/points', pointForm({}, 4))).status, 400);
});

test('ο διαχειριστής δημοσιεύει απευθείας, επεξεργάζεται και διαγράφει', async () => {
  const admin = client();
  await admin('POST', '/api/auth/login', ADMIN);
  let r = await admin('POST', '/api/points', pointForm({ name: 'Δημαρχείο' }));
  assert.equal(r.body.point.status, 'approved');
  const id = r.body.point.id;
  r = await admin('PATCH', `/api/admin/points/${id}`, { level: 'partial', features: ['anelkystiras'] });
  assert.equal(r.status, 200);
  assert.equal(r.body.point.level, 'partial');
  assert.deepEqual(r.body.point.features, ['anelkystiras']);
  assert.equal((await admin('DELETE', `/api/admin/points/${id}`)).status, 200);
  assert.equal((await client()('GET', `/api/points/${id}`)).status, 404);
});

test('αποσύνδεση ακυρώνει τη συνεδρία', async () => {
  const user = client();
  await user('POST', '/api/auth/register', { name: 'Νίκος', email: 'nikos@test.gr', password: 'kodikos123' });
  assert.ok((await user('GET', '/api/auth/me')).body.user);
  await user('POST', '/api/auth/logout');
  assert.equal((await user('GET', '/api/auth/me')).body.user, null);
});

test('μετατροπή δεδομένων OpenStreetMap', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'overpass.json'), 'utf8'));
  const pts = data.elements.map(toPoint);
  assert.deepEqual(pts[0], {
    externalId: 'osm:node/1', name: 'Φαρμακείο Δοκιμή', category: 'ygeia', level: 'full', features: ['rampa'],
    lat: 39.1601, lng: 20.9851, address: '', description: '',
  });
  assert.equal(pts[1].level, 'partial');
  assert.equal(pts[1].category, 'dimosia');
  assert.deepEqual(pts[1].features, ['wc']);
  assert.equal(pts[2].name, 'Θέση στάθμευσης ΑμεΑ');
  assert.deepEqual(pts[2].features, ['parking']);
  assert.equal(pts[3], null); // χωρίς όνομα → παραλείπεται
});

test('τα γνωστά σημεία φορτώνονται μία φορά και δεν ξαναεμφανίζονται αν διαγραφούν', async () => {
  const { openDb } = require('../src/db');
  const { seedPoints, loadSeed } = require('../src/seed');
  const { BOUNDS, CATEGORIES, FEATURES, LEVELS } = require('../src/constants');
  const seed = loadSeed();
  assert.ok(seed.points.length > 20);
  for (const p of seed.points) {
    assert.ok(CATEGORIES[p.category], p.name);
    assert.ok(LEVELS[p.level], p.name);
    assert.ok(p.features.every((f) => FEATURES[f]), p.name);
    assert.ok(p.lat >= BOUNDS.minLat && p.lat <= BOUNDS.maxLat && p.lng >= BOUNDS.minLng && p.lng <= BOUNDS.maxLng, p.name);
  }
  assert.equal(new Set(seed.points.map((p) => p.externalId)).size, seed.points.length);
  const db = openDb(':memory:');
  assert.equal(seedPoints(db, seed), seed.points.length);
  db.prepare("DELETE FROM points WHERE external_id = ?").run(seed.points[0].externalId);
  assert.equal(seedPoints(db, seed), 0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM points WHERE status = 'approved'").get().n, seed.points.length - 1);
  // νέα έκδοση: προστίθενται μόνο όσα λείπουν
  assert.equal(seedPoints(db, { ...seed, version: seed.version + 1 }), 1);
});
