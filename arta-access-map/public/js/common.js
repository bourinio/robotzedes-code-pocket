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

async function api(path, { method = 'GET', body, form } = {}) {
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
