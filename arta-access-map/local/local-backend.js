/* Προσβάσιμη Άρτα – τοπική έκδοση (χωρίς server).
 * Υλοποιεί το ίδιο API με τον server, αλλά μέσα στον browser:
 * όλα τα δεδομένα (λογαριασμοί, σημεία, φωτογραφίες) αποθηκεύονται στο IndexedDB αυτού του browser.
 * Ο πρώτος λογαριασμός που δημιουργείται γίνεται διαχειριστής.
 *
 * Οι γραμμές __CONFIG__ / __OSM__ συμπληρώνονται από το scripts/build-local.js.
 */
'use strict';
(function () {
  const CONFIG = /*__CONFIG__*/ null;
  /*__OSM__*/

  const MAX_PHOTOS = 3;
  const DB_NAME = 'prosvasimi-arta';
  const UID_KEY = 'prosvasimi-arta-uid';

  class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  // ---------- αποθήκευση ----------
  let idb;
  let data; // { seq, users:[], points:[], photos:[] } – οι φωτογραφίες (blob) είναι σε χωριστό store
  const urlCache = new Map();

  function openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('kv');
        req.result.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbReq(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(r && r.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Αποτυχία αποθήκευσης'));
    });
  }
  const save = () => idbReq('kv', 'readwrite', (s) => s.put(data, 'data'));
  const putBlob = (id, blob) => idbReq('blobs', 'readwrite', (s) => s.put(blob, id));
  const getBlob = (id) => idbReq('blobs', 'readonly', (s) => s.get(id));
  const delBlob = (id) => { const u = urlCache.get(id); if (u) { URL.revokeObjectURL(u); urlCache.delete(id); } return idbReq('blobs', 'readwrite', (s) => s.delete(id)); };

  let ready;
  function init() {
    if (!ready) {
      ready = (async () => {
        if (!window.indexedDB) throw new HttpError(500, 'Ο browser δεν υποστηρίζει τοπική αποθήκευση. Δοκιμάστε Chrome, Edge ή Firefox.');
        idb = await openIdb();
        data = (await idbReq('kv', 'readonly', (s) => s.get('data'))) || { seq: 0, users: [], points: [], photos: [] };
        // προφόρτωση URL εγκεκριμένων φωτογραφιών
        for (const ph of data.photos) await photoUrl(ph.id);
      })();
    }
    return ready;
  }
  const nextId = () => ++data.seq;
  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

  async function photoUrl(id) {
    if (!urlCache.has(id)) {
      const blob = await getBlob(id);
      urlCache.set(id, blob ? URL.createObjectURL(blob) : '');
    }
    return urlCache.get(id);
  }

  // ---------- κωδικοί ----------
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function hashPassword(password, saltHex) {
    const salt = saltHex || toHex(crypto.getRandomValues(new Uint8Array(16)));
    if (crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
      return `pbkdf2$${salt}$${toHex(bits)}`;
    }
    // εναλλακτικό (μη ασφαλές περιβάλλον): απλό hash
    let h = 2166136261;
    for (const c of salt + password) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return `fnv$${salt}$${h.toString(16)}`;
  }
  async function verifyPassword(password, stored) {
    const [, salt] = String(stored).split('$');
    return (await hashPassword(password, salt)) === stored;
  }

  // ---------- έλεγχοι ----------
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  function validatePoint(body, partial = false) {
    const { categories, features, levels, bounds } = CONFIG;
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
      if (!categories[out.category]) throw new HttpError(400, 'Μη έγκυρη κατηγορία.');
    }
    if (!partial || has('level')) {
      out.level = str(body.level, 20);
      if (!levels[out.level]) throw new HttpError(400, 'Μη έγκυρο επίπεδο προσβασιμότητας.');
    }
    if (!partial || has('features')) {
      const f = Array.isArray(body.features) ? body.features : body.features ? [body.features] : [];
      out.features = [...new Set(f.map(String).filter((k) => features[k]))];
    }
    if (!partial || has('lat') || has('lng')) {
      const lat = Number(body.lat), lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Επιλέξτε θέση στον χάρτη.');
      if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng)
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

  async function readPhotos(form) {
    const files = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0);
    if (files.length > MAX_PHOTOS) throw new HttpError(400, `Έως ${MAX_PHOTOS} φωτογραφίες ανά υποβολή.`);
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new HttpError(400, 'Επιτρέπονται μόνο φωτογραφίες JPEG, PNG ή WebP.');
      if (f.size > 8e6) throw new HttpError(400, 'Η φωτογραφία είναι πολύ μεγάλη.');
    }
    return files;
  }

  async function storePhotos(pointId, files, status, userId) {
    const ids = [];
    for (const f of files) {
      const id = nextId();
      await putBlob(id, new Blob([await f.arrayBuffer()], { type: f.type }));
      data.photos.push({ id, pointId, status, uploadedBy: userId, rejectReason: null, createdAt: now() });
      await photoUrl(id);
      ids.push(id);
    }
    return ids;
  }

  // ---------- προβολές ----------
  const userName = (id) => data.users.find((u) => u.id === id)?.name;
  const photoView = (ph) => ({ id: ph.id, url: urlCache.get(ph.id) || '', status: ph.status, ...(ph.rejectReason ? { rejectReason: ph.rejectReason } : {}) });
  function pointView(p, photos, withAuthor) {
    return {
      id: p.id, name: p.name, description: p.description, address: p.address, category: p.category, level: p.level,
      features: [...p.features], lat: p.lat, lng: p.lng, status: p.status, source: p.source, createdAt: p.createdAt,
      ...(p.rejectReason ? { rejectReason: p.rejectReason } : {}),
      ...(withAuthor ? { author: userName(p.createdBy) || (p.source === 'user' ? null : undefined) } : {}),
      photos: photos || [],
    };
  }
  const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role };

  // ---------- δρομολόγηση ----------
  async function route(method, path, body, form) {
    await init();
    const uid = Number(localStorage.getItem(UID_KEY)) || 0;
    const user = data.users.find((u) => u.id === uid) || null;
    const isAdmin = user?.role === 'admin';
    const needUser = () => { if (!user) throw new HttpError(401, 'Απαιτείται σύνδεση.'); };
    const needAdmin = () => { needUser(); if (!isAdmin) throw new HttpError(403, 'Μόνο για διαχειριστές.'); };
    const [pathname, query = ''] = path.split('?');
    const q = new URLSearchParams(query);
    let m;

    if (pathname === '/config') return CONFIG;
    if (pathname === '/auth/me') return { user: publicUser(user) };

    if (pathname === '/auth/register' && method === 'POST') {
      const name = str(body.name, 80), email = str(body.email, 200).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (name.length < 2) throw new HttpError(400, 'Συμπληρώστε το όνομά σας.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Μη έγκυρο email.');
      if (password.length < 8) throw new HttpError(400, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      if (data.users.some((u) => u.email === email)) throw new HttpError(409, 'Υπάρχει ήδη λογαριασμός με αυτό το email.');
      const u = { id: nextId(), name, email, role: data.users.length === 0 ? 'admin' : 'user', passwordHash: await hashPassword(password), createdAt: now() };
      data.users.push(u);
      await save();
      localStorage.setItem(UID_KEY, String(u.id));
      return { user: publicUser(u) };
    }

    if (pathname === '/auth/login' && method === 'POST') {
      const u = data.users.find((x) => x.email === str(body.email, 200).toLowerCase());
      if (!u || !(await verifyPassword(typeof body.password === 'string' ? body.password : '', u.passwordHash)))
        throw new HttpError(401, 'Λάθος email ή κωδικός.');
      localStorage.setItem(UID_KEY, String(u.id));
      return { user: publicUser(u) };
    }

    if (pathname === '/auth/logout' && method === 'POST') {
      localStorage.removeItem(UID_KEY);
      return { ok: true };
    }

    if (pathname === '/points' && method === 'GET') {
      const pts = data.points.filter((p) => p.status === 'approved').sort((a, b) => a.name.localeCompare(b.name, 'el'));
      return { points: pts.map((p) => pointView(p, data.photos.filter((ph) => ph.pointId === p.id && ph.status === 'approved').map(photoView))) };
    }

    if ((m = pathname.match(/^\/points\/(\d+)$/)) && method === 'GET') {
      const p = data.points.find((x) => x.id === Number(m[1]));
      if (!p || !(p.status === 'approved' || isAdmin || (user && p.createdBy === user.id))) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
      return { point: pointView(p, data.photos.filter((ph) => ph.pointId === p.id && (isAdmin || ph.status === 'approved')).map(photoView)) };
    }

    if (pathname === '/points' && method === 'POST') {
      needUser();
      const d = validatePoint(formToObject(form));
      const files = await readPhotos(form);
      const status = isAdmin ? 'approved' : 'pending';
      const p = { id: nextId(), ...d, status, source: 'user', createdBy: user.id, rejectReason: null, createdAt: now() };
      data.points.push(p);
      await storePhotos(p.id, files, status, user.id);
      await save();
      return { point: pointView(p, data.photos.filter((ph) => ph.pointId === p.id).map(photoView)) };
    }

    if ((m = pathname.match(/^\/points\/(\d+)\/photos$/)) && method === 'POST') {
      needUser();
      const p = data.points.find((x) => x.id === Number(m[1]) && x.status === 'approved');
      if (!p) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
      const files = await readPhotos(form);
      if (!files.length) throw new HttpError(400, 'Επιλέξτε τουλάχιστον μία φωτογραφία.');
      const status = isAdmin ? 'approved' : 'pending';
      const ids = await storePhotos(p.id, files, status, user.id);
      await save();
      return { photos: ids.map((id) => ({ id, url: urlCache.get(id), status })) };
    }

    if (pathname === '/my/submissions') {
      needUser();
      const mine = data.points.filter((p) => p.createdBy === user.id).sort((a, b) => b.id - a.id);
      const own = new Set(mine.map((p) => p.id));
      const photos = data.photos.filter((ph) => ph.uploadedBy === user.id).sort((a, b) => b.id - a.id);
      return {
        points: mine.map((p) => pointView(p, photos.filter((ph) => ph.pointId === p.id).map(photoView))),
        photos: photos.filter((ph) => !own.has(ph.pointId))
          .map((ph) => ({ ...photoView(ph), pointId: ph.pointId, pointName: data.points.find((p) => p.id === ph.pointId)?.name })),
      };
    }

    if (pathname.startsWith('/admin/')) {
      needAdmin();
      return routeAdmin(method, pathname, q, body, user);
    }
    throw new HttpError(404, 'Δεν βρέθηκε.');
  }

  async function routeAdmin(method, pathname, q, body, user) {
    const pointOf = (id) => data.points.find((p) => p.id === id);
    const review = (obj, status, reason) => {
      obj.status = status;
      obj.rejectReason = status === 'rejected' ? reason || null : null;
      obj.reviewedBy = user.id;
      obj.reviewedAt = now();
    };
    let m;

    if (pathname === '/admin/stats') {
      return {
        approvedPoints: data.points.filter((p) => p.status === 'approved').length,
        pendingPoints: data.points.filter((p) => p.status === 'pending').length,
        pendingPhotos: data.photos.filter((ph) => ph.status === 'pending' && pointOf(ph.pointId)?.status === 'approved').length,
        users: data.users.length,
      };
    }

    if (pathname === '/admin/pending') {
      const pend = data.photos.filter((ph) => ph.status === 'pending');
      return {
        points: data.points.filter((p) => p.status === 'pending').map((p) => ({
          ...pointView(p, pend.filter((ph) => ph.pointId === p.id).map(photoView), true),
          authorEmail: data.users.find((u) => u.id === p.createdBy)?.email,
        })),
        photos: pend.filter((ph) => pointOf(ph.pointId)?.status === 'approved').map((ph) => ({
          ...photoView(ph), pointId: ph.pointId, pointName: pointOf(ph.pointId).name, author: userName(ph.uploadedBy), createdAt: ph.createdAt,
        })),
      };
    }

    if (pathname === '/admin/points' && method === 'GET') {
      const st = ['approved', 'pending', 'rejected'].includes(q.get('status')) ? q.get('status') : 'approved';
      return { points: data.points.filter((p) => p.status === st).sort((a, b) => b.id - a.id).map((p) => pointView(p, null, true)) };
    }

    if ((m = pathname.match(/^\/admin\/points\/(\d+)\/(approve|reject)$/)) && method === 'POST') {
      const p = pointOf(Number(m[1]));
      if (!p || p.status !== 'pending') throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής υποβολή.');
      const approve = m[2] === 'approve';
      const reason = str(body?.reason, 500);
      const reject = new Set((body?.rejectPhotoIds || []).map(Number));
      review(p, approve ? 'approved' : 'rejected', reason);
      for (const ph of data.photos.filter((x) => x.pointId === p.id && x.status === 'pending')) {
        if (approve) review(ph, reject.has(ph.id) ? 'rejected' : 'approved', 'Απορρίφθηκε κατά την έγκριση του σημείου');
        else review(ph, 'rejected', reason);
      }
      await save();
      return { ok: true };
    }

    if ((m = pathname.match(/^\/admin\/photos\/(\d+)\/(approve|reject)$/)) && method === 'POST') {
      const ph = data.photos.find((x) => x.id === Number(m[1]));
      if (!ph || ph.status !== 'pending') throw new HttpError(404, 'Δεν βρέθηκε εκκρεμής φωτογραφία.');
      review(ph, m[2] === 'approve' ? 'approved' : 'rejected', str(body?.reason, 500));
      await save();
      return { ok: true };
    }

    if ((m = pathname.match(/^\/admin\/points\/(\d+)$/)) && method === 'PATCH') {
      const p = pointOf(Number(m[1]));
      if (!p) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
      Object.assign(p, validatePoint(body || {}, true));
      await save();
      return { point: pointView(p) };
    }

    if ((m = pathname.match(/^\/admin\/points\/(\d+)$/)) && method === 'DELETE') {
      const id = Number(m[1]);
      if (!pointOf(id)) throw new HttpError(404, 'Το σημείο δεν βρέθηκε.');
      for (const ph of data.photos.filter((x) => x.pointId === id)) await delBlob(ph.id);
      data.photos = data.photos.filter((x) => x.pointId !== id);
      data.points = data.points.filter((p) => p.id !== id);
      await save();
      return { ok: true };
    }

    if (pathname === '/admin/import-osm' && method === 'POST') {
      let osm;
      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: OVERPASS_QUERY }) });
        if (!res.ok) throw new Error();
        osm = await res.json();
      } catch {
        throw new HttpError(502, 'Το OpenStreetMap δεν απάντησε. Ελέγξτε τη σύνδεση στο ίντερνετ και δοκιμάστε ξανά.');
      }
      let n = 0;
      for (const el of osm.elements || []) {
        const x = toPoint(el);
        if (!x) continue;
        const existing = data.points.find((p) => p.externalId === x.externalId);
        const fields = { name: x.name, address: x.address, category: x.category, level: x.level, features: x.features, lat: x.lat, lng: x.lng };
        if (existing) Object.assign(existing, fields);
        else data.points.push({ id: nextId(), ...fields, description: x.description, status: body?.pending ? 'pending' : 'approved',
          source: 'osm', externalId: x.externalId, createdBy: null, rejectReason: null, createdAt: now() });
        n++;
      }
      await save();
      return { imported: n };
    }

    // Αντίγραφο ασφαλείας: όλα τα δεδομένα + φωτογραφίες σε ένα αρχείο JSON
    if (pathname === '/admin/export') {
      const photos = {};
      for (const ph of data.photos) {
        const blob = await getBlob(ph.id);
        if (blob) photos[ph.id] = { type: blob.type, b64: await blobToBase64(blob) };
      }
      return { app: 'prosvasimi-arta', version: 1, exportedAt: now(), data, photos };
    }

    if (pathname === '/admin/import' && method === 'POST') {
      if (!body || body.app !== 'prosvasimi-arta' || !body.data?.points) throw new HttpError(400, 'Το αρχείο δεν είναι αντίγραφο της εφαρμογής.');
      for (const ph of data.photos) await delBlob(ph.id);
      for (const [id, ph] of Object.entries(body.photos || {})) await putBlob(Number(id), base64ToBlob(ph.b64, ph.type));
      const me = data.users.find((u) => u.id === user.id);
      data = body.data;
      // ο τρέχων διαχειριστής δεν «κλειδώνεται» έξω
      if (!data.users.some((u) => u.email === me.email)) { me.id = ++data.seq; data.users.push(me); }
      localStorage.setItem(UID_KEY, String(data.users.find((u) => u.email === me.email).id));
      await save();
      for (const ph of data.photos) await photoUrl(ph.id);
      return { points: data.points.length, photos: data.photos.length };
    }

    throw new HttpError(404, 'Δεν βρέθηκε.');
  }

  function blobToBase64(blob) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBlob(b64, type) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type });
  }

  window.LocalBackend = {
    async request(method, path, { body, form } = {}) {
      try {
        return await route(method, path, body || {}, form);
      } catch (e) {
        if (!(e instanceof HttpError)) console.error(e);
        throw Object.assign(new Error(e instanceof HttpError ? e.message : 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.'), { status: e.status || 500 });
      }
    },
  };
})();
