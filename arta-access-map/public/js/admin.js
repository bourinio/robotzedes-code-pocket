/* Σελίδα διαχειριστή: έγκριση / απόρριψη υποβολών */
'use strict';

let cfg;
let tab = 'pending';

(async function init() {
  const [c, me] = await Promise.all([api('/config'), api('/auth/me')]);
  cfg = c;
  if (!me.user || me.user.role !== 'admin') {
    fill($('#admin-gate'), 'Η σελίδα είναι μόνο για διαχειριστές. ', h('a', { href: '/', text: 'Σύνδεση από τον χάρτη' }));
    return;
  }
  $('#admin-gate').hidden = true;
  $('#admin-app').hidden = false;

  $$('[role=tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    $$('[role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    render();
  }));
  setupEdit();
  render();
})().catch((e) => toast(e.message));

async function refreshStats() {
  const s = await api('/admin/stats');
  fill($('#stats'), 
    stat(s.pendingPoints, 'εκκρεμή σημεία'),
    stat(s.pendingPhotos, 'εκκρεμείς φωτογραφίες'),
    stat(s.approvedPoints, 'εγκεκριμένα σημεία'),
    stat(s.users, 'χρήστες')
  );
}
const stat = (n, label) => h('div', { class: 'stat' }, h('strong', { text: String(n) }), h('span', { text: label }));

async function render() {
  const panel = $('#panel');
  fill(panel, h('p', { class: 'muted', text: 'Φόρτωση…' }));
  try {
    await refreshStats();
    if (tab === 'pending' || tab === 'photos') {
      const data = await api('/admin/pending');
      fill(panel, ...(tab === 'pending' ? renderPendingPoints(data.points) : renderPendingPhotos(data.photos)));
    } else {
      const { points } = await api(`/admin/points?status=${tab}`);
      fill(panel, ...renderPointTable(points));
    }
  } catch (e) {
    fill(panel, h('p', { class: 'error', text: e.message }));
  }
}

function miniMap(el, p) {
  requestAnimationFrame(() => {
    const m = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([p.lat, p.lng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    L.marker([p.lat, p.lng]).addTo(m);
  });
}

function renderPendingPoints(points) {
  if (!points.length) return [h('p', { class: 'muted', text: 'Δεν υπάρχουν εκκρεμή σημεία. 🎉' })];
  return points.map((p) => {
    const mapEl = h('div', { class: 'mini-map', role: 'img', 'aria-label': `Θέση: ${p.lat}, ${p.lng}` });
    miniMap(mapEl, p);
    const rejected = new Set();
    const card = h('article', { class: 'card review' },
      h('div', { class: 'review-grid' },
        h('div', {},
          h('h2', { text: p.name }),
          h('p', {}, levelBadge(p.level, cfg.levels), ' ', h('span', { class: 'badge cat', text: cfg.categories[p.category] })),
          p.address ? h('p', { text: `📍 ${p.address}` }) : null,
          p.description ? h('p', { class: 'desc', text: p.description }) : null,
          p.features.length ? h('ul', { class: 'feat-list' }, p.features.map((f) => h('li', { text: cfg.features[f] }))) : null,
          h('p', { class: 'muted small', text: `Από: ${p.author || '—'} (${p.authorEmail || ''}) · ${fmtDate(p.createdAt)} · ${p.lat}, ${p.lng}` })
        ),
        mapEl
      ),
      p.photos.length
        ? h('div', { class: 'gallery' }, p.photos.map((ph) => {
            const box = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Έγκριση φωτογραφίας' });
            box.addEventListener('change', () => (box.checked ? rejected.delete(ph.id) : rejected.add(ph.id)));
            return h('figure', { class: 'ph-pick' },
              h('a', { href: ph.url, target: '_blank', rel: 'noopener' }, h('img', { src: ph.url, alt: `Φωτογραφία για ${p.name}` })),
              h('figcaption', {}, h('label', {}, box, ' Έγκριση')));
          }))
        : h('p', { class: 'muted', text: 'Χωρίς φωτογραφίες.' }),
      actions(
        async () => { await api(`/admin/points/${p.id}/approve`, { method: 'POST', body: { rejectPhotoIds: [...rejected] } }); toast('Το σημείο εγκρίθηκε.'); },
        async (reason) => { await api(`/admin/points/${p.id}/reject`, { method: 'POST', body: { reason } }); toast('Το σημείο απορρίφθηκε.'); },
        () => openEdit(p)
      )
    );
    return card;
  });
}

function renderPendingPhotos(photos) {
  if (!photos.length) return [h('p', { class: 'muted', text: 'Δεν υπάρχουν εκκρεμείς φωτογραφίες.' })];
  return [h('div', { class: 'photo-grid' }, photos.map((ph) =>
    h('article', { class: 'card' },
      h('a', { href: ph.url, target: '_blank', rel: 'noopener' }, h('img', { src: ph.url, alt: `Φωτογραφία για ${ph.pointName}`, class: 'review-img' })),
      h('p', {}, h('strong', { text: ph.pointName })),
      h('p', { class: 'muted small', text: `Από: ${ph.author || '—'} · ${fmtDate(ph.createdAt)}` }),
      actions(
        async () => { await api(`/admin/photos/${ph.id}/approve`, { method: 'POST' }); toast('Η φωτογραφία εγκρίθηκε.'); },
        async (reason) => { await api(`/admin/photos/${ph.id}/reject`, { method: 'POST', body: { reason } }); toast('Η φωτογραφία απορρίφθηκε.'); }
      )
    )))];
}

function actions(onApprove, onReject, onEdit) {
  const reason = h('input', { type: 'text', placeholder: 'Αιτία απόρριψης (προαιρετικά)', 'aria-label': 'Αιτία απόρριψης', maxlength: '500' });
  const run = (fn) => async (e) => {
    e.target.disabled = true;
    try { await fn(); render(); } catch (ex) { toast(ex.message); e.target.disabled = false; }
  };
  return h('div', { class: 'row review-actions' },
    h('button', { type: 'button', class: 'btn approve', onclick: run(onApprove) }, '✓ Έγκριση'),
    onEdit ? h('button', { type: 'button', class: 'btn', onclick: onEdit }, 'Επεξεργασία') : null,
    reason,
    h('button', { type: 'button', class: 'btn reject', onclick: run(() => onReject(reason.value.trim())) }, '✕ Απόρριψη')
  );
}

function renderPointTable(points) {
  if (!points.length) return [h('p', { class: 'muted', text: 'Δεν υπάρχουν σημεία.' })];
  const filter = h('input', { type: 'search', placeholder: 'Φιλτράρισμα…', 'aria-label': 'Φιλτράρισμα σημείων', class: 'table-filter' });
  const tbody = h('tbody');
  const draw = () => {
    const q = norm(filter.value);
    fill(tbody, ...points.filter((p) => !q || norm(p.name + ' ' + p.address).includes(q)).map((p) =>
      h('tr', {},
        h('td', {}, h('a', { href: `/#p${p.id}`, text: p.name })),
        h('td', { text: cfg.categories[p.category] }),
        h('td', {}, levelBadge(p.level, cfg.levels)),
        h('td', { text: p.source === 'user' ? (p.author || '—') : p.source.toUpperCase() }),
        h('td', { text: p.rejectReason || '' }),
        h('td', { class: 'nowrap' },
          h('button', { type: 'button', class: 'btn small', onclick: () => openEdit(p) }, 'Επεξεργασία'), ' ',
          h('button', { type: 'button', class: 'btn small reject', onclick: async () => {
            if (!confirm(`Οριστική διαγραφή του «${p.name}»;`)) return;
            try { await api(`/admin/points/${p.id}`, { method: 'DELETE' }); toast('Διαγράφηκε.'); render(); } catch (e) { toast(e.message); }
          } }, 'Διαγραφή'))
      )));
  };
  filter.addEventListener('input', draw);
  draw();
  return [filter, h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, ['Όνομα', 'Κατηγορία', 'Πρόσβαση', 'Υποβολή', 'Σημείωση', ''].map((t) => h('th', { scope: 'col', text: t })))),
    tbody))];
}

// ---------- Επεξεργασία ----------
let editing = null;

function setupEdit() {
  const form = $('#form-edit');
  for (const [k, v] of Object.entries(cfg.categories)) form.category.append(h('option', { value: k, text: v }));
  for (const [k, v] of Object.entries(cfg.features)) $('#edit-features').append(h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'features', value: k }), ' ', v));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd);
    body.features = fd.getAll('features');
    try {
      await api(`/admin/points/${editing.id}`, { method: 'PATCH', body });
      $('#dlg-edit').close();
      toast('Αποθηκεύτηκε.');
      render();
    } catch (ex) {
      $('#form-edit .error').textContent = ex.message;
    }
  });
}

function openEdit(p) {
  editing = p;
  const form = $('#form-edit');
  for (const k of ['name', 'address', 'category', 'level', 'description', 'lat', 'lng']) form[k].value = p[k] ?? '';
  $$('[name=features]', form).forEach((c) => { c.checked = p.features.includes(c.value); });
  $('#form-edit .error').textContent = '';
  $('#dlg-edit').showModal();
}
