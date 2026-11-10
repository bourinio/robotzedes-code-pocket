/* Κοινά βοηθήματα για χάρτη και διαχείριση */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Δημιουργία στοιχείου με ασφάλεια (κείμενο μέσω textContent, όχι innerHTML). */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Όπως το replaceChildren, αλλά αγνοεί κενά (null/false). */
function fill(el, ...children) {
  el.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

/**
 * Σμικραίνει μια φωτογραφία (έως 1600px, JPEG) πριν το ανέβασμα.
 * Έτσι οι λήψεις κινητού (5–10 MB) γίνονται ~300–600 KB.
 */
async function compressImage(file, maxSide = 1600, quality = 0.82) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5e6) { bmp.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * Υπόβαθρο χάρτη: OpenStreetMap. Σύμφωνα με την πολιτική χρήσης του, ο browser στέλνει τη διεύθυνση της σελίδας
 * (Referer). Όταν η εφαρμογή ανοίγει ως τοπικό αρχείο δεν υπάρχει διεύθυνση και οι δρόμοι δεν φορτώνουν:
 * τότε εμφανίζεται εξήγηση αντί για τα πλακίδια «Access blocked».
 */
function addBaseLayer(map) {
  const URL_TPL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const noReferer = location.protocol === 'file:' || location.origin === 'null';
  const notice = (text) => {
    const box = L.DomUtil.create('div', 'map-notice');
    box.setAttribute('role', 'status');
    box.textContent = text;
    map.getContainer().appendChild(box);
  };
  if (noReferer) {
    notice('Οι δρόμοι του χάρτη φαίνονται μόνο όταν η εφαρμογή ανοίγει από τη διεύθυνσή της στο ίντερνετ ή από την εφαρμογή κινητού. Τα σημεία λειτουργούν κανονικά.');
    return;
  }
  L.tileLayer(URL_TPL, {
    maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution: '&copy; συντελεστές <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

async function api(path, { method = 'GET', body, form } = {}) {
  // Τοπική έκδοση (χωρίς server): όλα γίνονται μέσα στον browser
  if (window.LocalBackend) return window.LocalBackend.request(method, path, { body, form });
  const opts = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  let data = {};
  try { data = await res.json(); } catch { /* κενή απάντηση */ }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Σφάλμα δικτύου'), { status: res.status });
  return data;
}

function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

/** Αφαιρεί τόνους & πεζά για αναζήτηση στα ελληνικά. */
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ');
}

const STATUS_LABEL = { pending: 'Σε αναμονή', approved: 'Εγκρίθηκε', rejected: 'Απορρίφθηκε' };

function statusBadge(status) {
  return h('span', { class: `badge ${status}`, text: STATUS_LABEL[status] || status });
}

function levelBadge(level, levels) {
  return h('span', { class: `badge lvl-${level}` }, h('span', { 'aria-hidden': 'true', text: level === 'full' ? '✓ ' : '! ' }), levels[level]);
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d) ? s : d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Online/στατική έκδοση: service worker για εγκατάσταση ως εφαρμογή (όχι σε αρχείο file:// ούτε μέσα στο APK)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.AndroidApp && location.hostname !== 'appassets.androidplatform.net') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
