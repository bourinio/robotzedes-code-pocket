/* Χάρτης προσβασιμότητας Άρτας – δημόσια σελίδα */
'use strict';

const SOURCE_LABEL = {
  osm: 'OpenStreetMap (© συντελεστές OpenStreetMap, ODbL)',
  sap: 'Σχέδιο Αστικής Προσβασιμότητας Δήμου Αρταίων (2023)',
  dimos: 'Δήμος Αρταίων',
};

const state = { cfg: null, user: null, points: [], markers: new Map(), picking: false, pickMarker: null };
let map;

init().catch((e) => toast(e.message));

async function init() {
  const [cfg, me] = await Promise.all([api('/config'), api('/auth/me')]);
  state.cfg = cfg;
  state.user = me.user;

  setupMap();
  setupFilters();
  setupAuth();
  setupAdd();
  renderUser();
  await loadPoints();

  const m = location.hash.match(/^#p(\d+)$/);
  if (m) openPoint(Number(m[1]));
}

// ---------------- Χάρτης ----------------
function setupMap() {
  const { center, bounds } = state.cfg;
  map = L.map('map', {
    center: [center.lat, center.lng],
    zoom: center.zoom,
    minZoom: 11,
    maxBounds: [[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]],
    maxBoundsViscosity: 0.8,
  });
  addBaseLayer(map);

  map.on('click', (e) => {
    if (!state.picking) return;
    setPickedLocation(e.latlng.lat, e.latlng.lng);
    stopPicking();
    $('#dlg-add').showModal();
  });

  $('#btn-locate').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Η συσκευή δεν υποστηρίζει εντοπισμό θέσης.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        if (state.locMarker) state.locMarker.setLatLng(ll);
        else state.locMarker = L.circleMarker(ll, { radius: 8, color: '#1a56db', fillOpacity: 0.8 }).addTo(map).bindTooltip('Είστε εδώ');
        map.setView(ll, 17);
        if (state.picking) { setPickedLocation(...ll); stopPicking(); $('#dlg-add').showModal(); }
      },
      () => toast('Δεν ήταν δυνατός ο εντοπισμός της θέσης σας.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function markerIcon(p) {
  const cls = `pin ${p.level}`;
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="${cls}"><span>${p.level === 'full' ? '✓' : '!'}</span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

async function loadPoints() {
  const { points } = await api('/points');
  state.points = points;
  for (const m of state.markers.values()) m.remove();
  state.markers.clear();
  for (const p of points) {
    const m = L.marker([p.lat, p.lng], {
      icon: markerIcon(p),
      title: p.name,
      alt: `${p.name} – ${state.cfg.levels[p.level]}`,
      keyboard: true,
    });
    m.on('click', (e) => {
      if (state.picking) map.fire('click', { latlng: e.latlng });
      else openPoint(p.id);
    });
    state.markers.set(p.id, m);
  }
  applyFilters();
}

// ---------------- Φίλτρα & λίστα ----------------
function setupFilters() {
  const { categories, features } = state.cfg;
  const sel = $('#f-category');
  for (const [k, v] of Object.entries(categories)) sel.append(h('option', { value: k, text: v }));
  const fBox = $('#f-features');
  for (const [k, v] of Object.entries(features)) {
    fBox.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', class: 'f-feature', value: k }), ' ', v));
  }
  $('#q').addEventListener('input', applyFilters);
  sel.addEventListener('change', applyFilters);
  $$('.f-level, .f-feature').forEach((c) => c.addEventListener('change', applyFilters));
}

function applyFilters() {
  const q = norm($('#q').value.trim());
  const cat = $('#f-category').value;
  const levels = $$('.f-level:checked').map((c) => c.value);
  const feats = $$('.f-feature:checked').map((c) => c.value);

  const visible = state.points.filter((p) =>
    levels.includes(p.level) &&
    (!cat || p.category === cat) &&
    feats.every((f) => p.features.includes(f)) &&
    (!q || norm(`${p.name} ${p.address} ${p.description} ${state.cfg.categories[p.category]}`).includes(q))
  );

  for (const [id, m] of state.markers) {
    if (visible.some((p) => p.id === id)) m.addTo(map);
    else m.remove();
  }

  const list = $('#list');
  fill(list, 
    ...visible.map((p) =>
      h('li', {},
        h('button', { type: 'button', class: 'point-item', onclick: () => { map.setView([p.lat, p.lng], 18); openPoint(p.id); } },
          h('span', { class: `dot ${p.level}`, 'aria-hidden': 'true', text: p.level === 'full' ? '✓' : '!' }),
          h('span', { class: 'pi-text' },
            h('strong', { text: p.name }),
            h('small', { text: `${state.cfg.categories[p.category]}${p.address ? ' · ' + p.address : ''}` })
          )
        )
      )
    )
  );
  $('#count').textContent = state.points.length
    ? `${visible.length} από ${state.points.length} σημεία`
    : 'Δεν υπάρχουν ακόμη εγκεκριμένα σημεία. Γίνε ο πρώτος που θα προσθέσει!';
}

// ---------------- Λεπτομέρειες σημείου ----------------
async function openPoint(id) {
  let p = state.points.find((x) => x.id === id);
  try { p = (await api(`/points/${id}`)).point; } catch { if (!p) return toast('Το σημείο δεν βρέθηκε.'); }
  const { categories, features, levels } = state.cfg;
  const body = $('#point-body');
  const fileInput = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, id: 'add-photo-input', class: 'sr-only' });

  fileInput.addEventListener('change', async () => {
    if (!fileInput.files.length) return;
    const fd = new FormData();
    for (const f of [...fileInput.files].slice(0, 3)) fd.append('photos', await compressImage(f));
    try {
      const r = await api(`/points/${id}/photos`, { method: 'POST', form: fd });
      toast(r.photos[0]?.status === 'approved' ? 'Η φωτογραφία προστέθηκε.' : 'Ευχαριστούμε! Η φωτογραφία θα εμφανιστεί μετά την έγκριση.');
      if (r.photos[0]?.status === 'approved') { await loadPoints(); openPoint(id); }
    } catch (e) { toast(e.message); }
    fileInput.value = '';
  });

  fill(body, 
    h('h2', { id: 'point-title', text: p.name }),
    h('p', {}, levelBadge(p.level, levels), ' ', h('span', { class: 'badge cat', text: categories[p.category] })),
    p.address ? h('p', {}, h('span', { 'aria-hidden': 'true', text: '📍 ' }), p.address) : null,
    p.description ? h('p', { class: 'desc', text: p.description }) : null,
    p.features.length
      ? h('ul', { class: 'feat-list', 'aria-label': 'Χαρακτηριστικά προσβασιμότητας' }, p.features.map((f) => h('li', { text: features[f] || f })))
      : null,
    p.photos.length
      ? h('div', { class: 'gallery' }, p.photos.map((ph, i) =>
          h('a', { href: ph.url, target: '_blank', rel: 'noopener' },
            h('img', { src: ph.url, alt: `Φωτογραφία ${i + 1} – ${p.name}`, loading: 'lazy' }))))
      : h('p', { class: 'muted', text: 'Δεν υπάρχουν ακόμη φωτογραφίες.' }),
    h('div', { class: 'row' },
      h('a', { class: 'btn', href: `https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}`, target: '_blank', rel: 'noopener', text: 'Οδηγίες διαδρομής' }),
      state.user
        ? h('label', { class: 'btn', for: 'add-photo-input', tabindex: '0', role: 'button',
            onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, '📷 Πρόσθεσε φωτογραφία')
        : h('button', { type: 'button', class: 'btn', onclick: () => { $('#dlg-point').close(); openAuth(); } }, 'Συνδέσου για να προσθέσεις φωτογραφία'),
      fileInput
    ),
    SOURCE_LABEL[p.source] ? h('p', { class: 'muted small', text: `Πηγή: ${SOURCE_LABEL[p.source]}` }) : null
  );
  history.replaceState(null, '', `#p${id}`);
  const dlg = $('#dlg-point');
  dlg.addEventListener('close', () => history.replaceState(null, '', location.pathname), { once: true });
  if (!dlg.open) dlg.showModal();
}

// ---------------- Λογαριασμός ----------------
let authMode = 'login';
let setAuthMode = () => {};

function setupAuth() {
  const setMode = setAuthMode = (mode) => {
    authMode = mode;
    const reg = mode === 'register';
    $('#tab-login').setAttribute('aria-selected', String(!reg));
    $('#tab-register').setAttribute('aria-selected', String(reg));
    $('#name-field').hidden = !reg;
    $('#auth-title').textContent = reg ? 'Νέος λογαριασμός' : 'Σύνδεση';
    $('#form-auth button[type=submit]').textContent = reg ? 'Δημιουργία λογαριασμού' : 'Σύνδεση';
    $('#form-auth [name=password]').autocomplete = reg ? 'new-password' : 'current-password';
    $('#form-auth .error').textContent = '';
  };
  $('#tab-login').addEventListener('click', () => setMode('login'));
  $('#tab-register').addEventListener('click', () => setMode('register'));

  $('#form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const err = $('#form-auth .error');
    err.textContent = '';
    try {
      const { user } = await api(authMode === 'register' ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: Object.fromEntries(fd),
      });
      state.user = user;
      $('#dlg-auth').close();
      e.target.reset();
      renderUser();
      toast(`Καλώς ήρθες, ${user.name}!`);
      if (state.afterLogin) { const f = state.afterLogin; state.afterLogin = null; f(); }
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
}

function openAuth(after) {
  state.afterLogin = after || null;
  setAuthMode('login');
  $('#dlg-auth').showModal();
}

function renderUser() {
  const area = $('#user-area');
  if (!state.user) {
    fill(area, h('button', { type: 'button', class: 'btn', onclick: () => openAuth() }, 'Σύνδεση'));
    return;
  }
  fill(area, 
    h('button', { type: 'button', class: 'btn', onclick: openMine }, 'Οι υποβολές μου'),
    state.user.role === 'admin' ? h('a', { class: 'btn', href: 'admin.html' }, 'Διαχείριση') : null,
    h('button', {
      type: 'button', class: 'btn ghost', title: state.user.email,
      onclick: async () => { await api('/auth/logout', { method: 'POST' }); state.user = null; renderUser(); toast('Αποσυνδέθηκες.'); },
    }, `Έξοδος (${state.user.name})`)
  );
}

async function openMine() {
  const body = $('#mine-body');
  fill(body, h('p', { class: 'muted', text: 'Φόρτωση…' }));
  $('#dlg-mine').showModal();
  try {
    const { points, photos } = await api('/my/submissions');
    if (!points.length && !photos.length) {
      fill(body, h('p', { class: 'muted', text: 'Δεν έχεις κάνει ακόμη καμία υποβολή.' }));
      return;
    }
    fill(body, 
      ...points.map((p) =>
        h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('strong', { text: p.name }), statusBadge(p.status)),
          h('small', { class: 'muted', text: `${state.cfg.categories[p.category]} · ${fmtDate(p.createdAt)} · ${p.photos.length} φωτ.` }),
          p.rejectReason ? h('p', { class: 'error', text: `Αιτία απόρριψης: ${p.rejectReason}` }) : null
        )
      ),
      photos.length ? h('h3', { text: 'Φωτογραφίες σε υπάρχοντα σημεία' }) : null,
      ...photos.map((ph) =>
        h('div', { class: 'card row' },
          h('img', { src: ph.url, alt: '', class: 'thumb' }),
          h('span', { text: ph.pointName }),
          statusBadge(ph.status)
        )
      )
    );
  } catch (e) {
    fill(body, h('p', { class: 'error', text: e.message }));
  }
}

// ---------------- Νέο σημείο ----------------
function setupAdd() {
  const form = $('#form-add');
  const { categories, features } = state.cfg;
  for (const [k, v] of Object.entries(categories)) form.category.append(h('option', { value: k, text: v }));
  const fBox = $('#add-features');
  for (const [k, v] of Object.entries(features)) fBox.append(h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'features', value: k }), ' ', v));

  const openAdd = () => {
    if (!state.user) return openAuth(openAdd);
    if (!form.lat.value) startPicking();
    else $('#dlg-add').showModal();
  };
  $('#btn-add').addEventListener('click', openAdd);

  $('#btn-pick').addEventListener('click', startPicking);
  $('#btn-pick-cancel').addEventListener('click', () => { stopPicking(); $('#dlg-add').showModal(); });

  form.photos.addEventListener('change', () => {
    const box = $('#add-previews');
    fill(box, ...[...form.photos.files].slice(0, 3).map((f) => h('img', { src: URL.createObjectURL(f), alt: f.name, class: 'thumb' })));
    if (form.photos.files.length > 3) toast('Θα σταλούν μόνο οι 3 πρώτες φωτογραφίες.');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#form-add .error');
    err.textContent = '';
    if (!form.lat.value) { err.textContent = 'Επίλεξε τη θέση του σημείου στον χάρτη.'; return; }
    if (!form.name.value.trim()) { err.textContent = 'Συμπλήρωσε το όνομα του σημείου.'; form.name.focus(); return; }
    const fd = new FormData(form);
    fd.delete('photos');
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    for (const f of [...form.photos.files].slice(0, 3)) fd.append('photos', await compressImage(f));
    try {
      const { point } = await api('/points', { method: 'POST', form: fd });
      $('#dlg-add').close();
      form.reset();
      fill($('#add-previews'), );
      $('#add-loc').textContent = 'Δεν έχει οριστεί θέση';
      if (state.pickMarker) { state.pickMarker.remove(); state.pickMarker = null; }
      if (point.status === 'approved') { await loadPoints(); toast('Το σημείο δημοσιεύτηκε.'); }
      else toast('Ευχαριστούμε! Το σημείο στάλθηκε για έγκριση.', 5000);
    } catch (ex) {
      err.textContent = ex.message;
      if (ex.status === 401) { state.user = null; renderUser(); }
    } finally {
      btn.disabled = false;
    }
  });
}

function startPicking() {
  state.picking = true;
  $('#dlg-add').close();
  $('#pick-banner').hidden = false;
  $('#map').classList.add('picking');
}

function stopPicking() {
  state.picking = false;
  $('#pick-banner').hidden = true;
  $('#map').classList.remove('picking');
}

function setPickedLocation(lat, lng) {
  const { bounds } = state.cfg;
  if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
    toast('Η θέση πρέπει να είναι στην περιοχή της Άρτας.');
    return;
  }
  const form = $('#form-add');
  form.lat.value = lat.toFixed(6);
  form.lng.value = lng.toFixed(6);
  $('#add-loc').textContent = `Θέση: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (state.pickMarker) state.pickMarker.setLatLng([lat, lng]);
  else {
    state.pickMarker = L.marker([lat, lng], { draggable: true, title: 'Νέο σημείο' }).addTo(map);
    state.pickMarker.on('dragend', () => { const ll = state.pickMarker.getLatLng(); setPickedLocation(ll.lat, ll.lng); });
  }
}
