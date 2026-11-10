/* RoboAtlas – διεπαφή (vanilla JS, hash router, χωρίς build). */
(function () {
"use strict";

const COMPS = window.RA_COMPETITIONS, EQUIP = window.RA_EQUIPMENT, SUPS = window.RA_SUPPLIERS;
const COUNTRIES = window.RA_COUNTRIES, I18N = window.RA_I18N, CONFIG = window.RA_CONFIG || {};
const E = window.RAEngine.create({ competitions: COMPS, equipment: EQUIP, countries: COUNTRIES });
const EQ = {}; EQUIP.forEach(e => { EQ[e.k] = e; });
const CMAP = {}; COMPS.forEach(c => { CMAP[c.id] = c; });

/* ---------- Αποθήκευση ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("ra." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ra." + k, JSON.stringify(v)); } catch (e) { /* ιδιωτική λειτουργία κ.λπ. */ } },
};
const navLang = (navigator.language || "en").slice(0, 2) === "el" ? "el" : "en";
let lang = store.get("lang", navLang);
let country = store.get("country", lang === "el" ? "GR" : "");
let role = store.get("role", "");
let theme = store.get("theme", "auto");
let teams = store.get("teams", []);
let activeTeam = store.get("active", teams[0] ? teams[0].id : null);
let plans = store.get("plans", {});
let studentAge = store.get("age", 12);

function saveTeams() { store.set("teams", teams); }
function teamById(id) { return teams.find(t => t.id === id); }
function currentTeam() { return teamById(activeTeam) || teams[0] || null; }

/* ---------- Γλώσσα & μορφοποίηση ---------- */
function t(key, p) {
  const v = key.split(".").reduce((o, k) => (o == null ? o : o[k]), I18N[lang]);
  if (typeof v !== "string") return v == null ? key : v;
  return p ? v.replace(/\{(\w+)\}/g, (m, k) => (p[k] == null ? "" : p[k])) : v;
}
function L(x) { return x == null ? "" : typeof x === "string" ? x : (x[lang] || x.en || x.el); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ"); }
function flag(cc) { return cc ? String.fromCodePoint.apply(null, cc.toUpperCase().split("").map(ch => 127397 + ch.charCodeAt(0))) : "🌐"; }
function countryName(cc) { const c = COUNTRIES.find(x => x[0] === cc); return c ? (lang === "el" ? c[1] : c[2]) : cc || "—"; }
function eqName(k) { return EQ[k] ? L(EQ[k].n) : k; }
function eqList(keys, sep) { return keys.map(eqName).join(sep || ", "); }
function ym(i) { const y = Math.floor((i - 1) / 12); return t("months")[i - y * 12] + " " + y; }
function winLabel(w) {
  if (w.a === w.b) return ym(w.a);
  const ya = Math.floor((w.a - 1) / 12), yb = Math.floor((w.b - 1) / 12);
  return ya === yb ? t("months")[w.a - ya * 12] + "–" + ym(w.b) : ym(w.a) + " – " + ym(w.b);
}
function whenText(w) { return w.live ? t("live") : w.months === 0 ? t("this_month") : w.months === 1 ? t("next_month") : t("in_months", { n: w.months }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Μετατροπή ελέγχου μηχανής σε κείμενο
function msg(x) {
  const p = Object.assign({}, x.p);
  if (p.hw) p.x = x.k === "k_hw_miss" ? (p.any ? t("k_hw_any", { x: eqName(p.hw[0]) }) : eqList(p.hw, " / ")) : eqList(p.hw);
  if (p.countries) p.c = p.countries.map(countryName).join(", ");
  if (x.k === "k_lvl_ok" || x.k === "k_lvl_low") p.l = t("lvl")[p.l];
  if (x.k === "k_prep_ok") p.e = L(p.ev.n);
  if (x.k === "k_prep_next") { p.e = L(p.ev.n); p.w = whenText(p.w); p.n = winLabel(p.next); }
  if (x.k === "k_budget_low") p.x = p.t ? t("k_budget_travel", { t: p.t }) : "";
  return t(x.k, p);
}

/* ---------- Γενικά UI ---------- */
const MAIN = document.getElementById("main");
const ST = ["ok", "warn", "fail", "info"], IC = ["✓", "!", "✕", "i"];
function badge(s, short) { return '<span class="vb ' + ST[s] + '">' + IC[s] + " " + esc(short ? t("v_short")[s] : t("v")[s]) + "</span>"; }
function setNav(n) { document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("on", b.dataset.nav === n)); }
let toastTimer;
function toast(m) {
  const el = document.getElementById("toast");
  el.textContent = m; el.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("on"), 1600);
}
function go(h) { location.hash = h; }
function openUrl(u) {
  if (!/^https?:\/\//.test(u)) return;
  if (window.Android && window.Android.openUrl) window.Android.openUrl(u);
  else window.open(u, "_blank", "noopener");
}
function copyText(s) {
  const done = () => toast(t("copied"));
  if (window.Android && window.Android.copyText) { window.Android.copyText(s); return; }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(s).then(done, () => legacyCopy(s, done));
  else legacyCopy(s, done);
}
function legacyCopy(s, done) {
  const a = document.createElement("textarea");
  a.value = s; a.style.position = "fixed"; a.style.opacity = "0";
  document.body.appendChild(a); a.select();
  try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
  a.remove();
}
function shareText(title, s) {
  if (window.Android && window.Android.shareText) { window.Android.shareText(title, s); return; }
  if (navigator.share) { navigator.share({ title: title, text: s }).catch(() => {}); return; }
  copyText(s);
}
function head(title, sub, back) {
  return '<div class="head">' + (back ? '<button class="back" data-go="' + back + '">← ' + esc(t("back")) + "</button>" : "") +
    '<h1 class="title">' + title + "</h1>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>";
}
function chip(label, href, on) { return '<button class="chip' + (on ? " on" : "") + '" data-go="' + href + '">' + label + "</button>"; }
function countryOptions(sel, withEmpty) {
  const list = COUNTRIES.slice().sort((a, b) => (lang === "el" ? a[1] : a[2]).localeCompare(lang === "el" ? b[1] : b[2], lang));
  return (withEmpty ? '<option value="">—</option>' : "") +
    list.map(c => '<option value="' + c[0] + '"' + (c[0] === sel ? " selected" : "") + ">" + flag(c[0]) + " " + esc(lang === "el" ? c[1] : c[2]) + "</option>").join("");
}
function applyTheme() {
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  document.getElementById("tag").textContent = t("app_tag");
}

/* ---------- Κάρτες ---------- */
function compRow(c, team, now) {
  const w = E.entry(c, now);
  const ev = team ? E.evaluate(c, team, now) : null;
  const where = c.nat === "none" && c.host ? flag(c.host) : c.only ? flag(c.only[0]) : "🌐";
  return '<button class="item" data-go="#/c/' + c.id + '">' +
    '<div class="ic">' + c.em + "</div>" +
    '<div class="tx"><h3>' + esc(c.name) + "</h3>" +
    '<div class="mt">📅 ' + esc(winLabel(w)) + " · " + esc(whenText(w)) + " · " + where + "</div>" +
    (ev ? '<div class="mt2">' + badge(ev.best.status, true) + (ev.best.status < 2 ? '<span class="dim">' + esc(L(ev.best.cat.n)) + "</span>" : "") + "</div>" : "") +
    '</div><div class="chev">›</div></button>';
}
function teamSwitch(team, base) {
  if (teams.length < 2) return "";
  return '<div class="chips"><span class="lbl">' + esc(t("check_for")) + "</span>" +
    teams.map(x => chip("👥 " + esc(x.name || "—"), base + (base.indexOf("?") >= 0 ? "&" : "?") + "team=" + x.id, team && x.id === team.id)).join("") + "</div>";
}

/* ---------- Αρχική ---------- */
function home() {
  setNav("home");
  const now = new Date();
  const team = currentTeam();
  const upcoming = COMPS.map(c => ({ c: c, w: E.entry(c, now) })).filter(x => !x.w.live).sort((a, b) => a.w.a - b.w.a).slice(0, 4);
  const roles = ["team", "student", "supplier", "organizer"];
  const roleIcon = { team: "👥", student: "🎒", supplier: "🏪", organizer: "🏆" };

  let body = "";
  if (!role) {
    body = '<div class="sec"><h2>' + esc(t("i_am")) + '</h2></div><div class="roles">' +
      roles.map(r => '<button class="role" data-role="' + r + '"><span class="em">' + roleIcon[r] + "</span><b>" + esc(t("role." + r)) +
        "</b><small>" + esc(t("role_d." + r)) + "</small></button>").join("") + "</div>";
  } else {
    if (role === "team") {
      body += '<div class="sec"><h2>' + esc(t("my_teams")) + '</h2><a href="#/t">' + esc(t("see_all")) + "</a></div>";
      body += teams.length ? '<div class="list">' + teams.slice(0, 3).map(x => teamRow(x, now)).join("") + "</div>"
        : '<div class="card"><p>' + esc(t("no_teams")) + '</p><button class="btn pri wide" data-go="#/t/new">＋ ' + esc(t("new_team")) + "</button></div>";
    }
    if (role === "student") {
      body += '<div class="card"><h3>🎒 ' + esc(t("finder_t")) + '</h3><div class="row"><div class="fld"><label for="h_age">' + esc(t("finder_age")) +
        '</label><input id="h_age" type="number" min="5" max="40" value="' + studentAge + '"></div><div class="fld"><label for="h_cc">' + esc(t("my_country")) +
        '</label><select id="h_cc">' + countryOptions(country, true) + '</select></div></div><button class="btn pri wide" id="h_go">' + esc(t("finder_go")) + "</button></div>";
    }
    if (role === "supplier") {
      const rows = EQUIP.map(e => { const u = E.usage(e.k); return { e: e, n: new Set(u.req.concat(u.any).map(r => r.c.id)).size, req: new Set(u.req.map(r => r.c.id)).size }; })
        .sort((a, b) => b.req - a.req || b.n - a.n);
      const max = Math.max.apply(null, rows.map(r => r.n)) || 1;
      body += '<div class="card"><h3>📊 ' + esc(t("sup_t")) + '</h3><p class="sub">' + esc(t("sup_p")) + '</p><div class="bars">' +
        rows.map(r => '<button class="bar" data-go="#/e/' + r.e.k + '"><span class="bn">' + esc(L(r.e.n)) + '</span><span class="bt"><i style="width:' +
          Math.round(r.n / max * 100) + '%"></i><i class="rq" style="width:' + Math.round(r.req / max * 100) + '%"></i></span><span class="bc">' + r.req + "/" + r.n + "</span></button>").join("") +
        '</div></div><div class="card cta"><h3>🏪 ' + esc(t("sup_cta_t")) + "</h3><p>" + esc(t("sup_cta_p")) + '</p><button class="btn pri wide" data-go="#/add?k=supplier">' + esc(t("add_listing")) + "</button></div>";
    }
    if (role === "organizer") {
      body += '<div class="card cta"><h3>🏆 ' + esc(t("org_cta_t")) + "</h3><p>" + esc(t("org_cta_p")) + '</p><button class="btn pri wide" data-go="#/add?k=competition">' + esc(t("add_listing")) + "</button></div>";
    }
    body += '<div class="sec"><h2>' + esc(t("upcoming")) + '</h2><a href="#/c">' + esc(t("see_all")) + "</a></div>" +
      '<div class="list">' + upcoming.map(x => compRow(x.c, role === "team" ? team : null, now)).join("") + "</div>" +
      '<p class="center"><button class="link" data-role="">' + esc(t("change_role")) + " (" + esc(t("role." + role)) + ")</button></p>";
  }

  MAIN.innerHTML = '<section class="hero"><h1>' + esc(t("hero_t")) + "</h1><p>" + esc(t("hero_p")) + '</p><div class="stats">' +
    esc(t("stats", { c: COMPS.length, s: SUPS.length, e: EQUIP.length })) + "</div></section>" + body;

  MAIN.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { role = b.dataset.role; store.set("role", role); home(); });
  const hg = document.getElementById("h_go");
  if (hg) hg.onclick = () => {
    studentAge = parseInt(document.getElementById("h_age").value, 10) || 12;
    country = document.getElementById("h_cc").value; store.set("country", country); store.set("age", studentAge);
    go("#/c?age=" + studentAge);
  };
}

/* ---------- Διαγωνισμοί ---------- */
function compList(params) {
  setNav("comp");
  const now = new Date();
  const team = params.team ? teamById(params.team) || currentTeam() : (role === "student" ? null : currentTeam());
  if (team && params.team) { activeTeam = team.id; store.set("active", activeTeam); }
  const f = params.f || "", age = params.age ? +params.age : null, hw = params.hw || "", q = params.q || "";
  const qn = norm(q);
  const rows = COMPS.filter(c => {
    if (f === "country" && !E.inCountry(c, country)) return false;
    if (f === "reg" && !E.regOpen(c, now)) return false;
    if (f === "beg" && c.lvl > 1) return false;
    if (f === "ok" && (!team || E.evaluate(c, team, now).best.status !== 0)) return false;
    if (age && !c.cats.some(k => age >= k.age[0] && age <= k.age[1])) return false;
    if (hw && !c.cats.some(k => k.hw === "any" ? EQ[hw].type === "ctrl" : Array.isArray(k.hw) && k.hw.indexOf(hw) >= 0)) return false;
    if (c.only && country && c.only.indexOf(country) < 0) return false;   // τοπικοί διαγωνισμοί άλλων χωρών
    if (qn && norm([c.name, c.org, L(c.d), c.cats.map(k => L(k.n)).join(" ")].join(" ")).indexOf(qn) < 0) return false;
    return true;
  }).map(c => ({ c: c, w: E.entry(c, now), s: team ? E.evaluate(c, team, now).best.status : 0 }))
    .sort((a, b) => a.s - b.s || a.w.a - b.w.a);

  const base = "#/c";
  const qs = o => { const p = Object.assign({ f: f, age: age || "", hw: hw, q: q }, o); const s = Object.keys(p).filter(k => p[k]).map(k => k + "=" + encodeURIComponent(p[k])).join("&"); return base + (s ? "?" + s : ""); };
  MAIN.innerHTML = head("🏆 " + esc(t("nav_comp")), esc(t("comp_sub"))) +
    '<label class="search"><span>🔍</span><input id="cq" type="search" value="' + esc(q) + '" placeholder="' + esc(t("search_comp")) + '"></label>' +
    teamSwitch(team, "#/c") +
    '<div class="chips">' + chip(esc(t("all")), qs({ f: "", age: "", hw: "" }), !f && !age && !hw) +
    (team ? chip("✓ " + esc(t("v_short")[0]), qs({ f: f === "ok" ? "" : "ok" }), f === "ok") : "") +
    (country ? chip(flag(country) + " " + esc(t("f_country")), qs({ f: f === "country" ? "" : "country" }), f === "country") : "") +
    chip("📝 " + esc(t("f_reg")), qs({ f: f === "reg" ? "" : "reg" }), f === "reg") +
    chip("🌱 " + esc(t("f_beginner")), qs({ f: f === "beg" ? "" : "beg" }), f === "beg") +
    (age ? chip("✕ " + esc(t("f_age", { a: age })), qs({ age: "" }), true) : "") +
    (hw ? chip("✕ " + esc(t("f_hw", { x: eqName(hw) })), qs({ hw: "" }), true) : "") + "</div>" +
    (rows.length ? '<div class="list">' + rows.map(r => compRow(r.c, team, now)).join("") + "</div>" : '<div class="empty">' + esc(t("none_found")) + "</div>") +
    '<p class="note">' + esc(t("disclaimer")) + "</p>";

  const inp = document.getElementById("cq");
  let tm;
  inp.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { history.replaceState(null, "", qs({ q: inp.value.trim() })); compList(Object.assign({}, params, { q: inp.value.trim() })); const n = document.getElementById("cq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
}

function compDetail(id, params) {
  const c = CMAP[id];
  if (!c) return compList({});
  setNav("comp");
  const now = new Date();
  const team = params.team ? teamById(params.team) : currentTeam();
  if (team && params.team) { activeTeam = team.id; store.set("active", activeTeam); }
  const ev = team ? E.evaluate(c, team, now) : null;
  const tl = E.season(c, now), reg = E.nextWindow(c.reg, now);
  const natTxt = c.nat === "local" ? t("nat_local", { c: c.only.map(x => flag(x) + " " + countryName(x)).join(", ") })
    : t("nat_" + c.nat) + (c.host ? " · " + t("host_in", { c: flag(c.host) + " " + countryName(c.host) }) : "");

  let verdict = "";
  if (ev) {
    const b = ev.best;
    verdict = teamSwitch(team, "#/c/" + c.id) +
      '<div class="verdict ' + ST[b.status] + '"><div class="vt">' + IC[b.status] + " " + esc(t("v")[b.status]) + " · 👥 " + esc(team.name || "—") + "</div>" +
      '<div class="vs">' + (b.status < 2 ? t("best_cat", { c: "<b>" + esc(L(b.cat.n)) + "</b>" }) : esc(t("no_cat"))) + " · " + esc(t("est_cost", { e: b.total })) + "</div>" +
      (b.status < 2 ? '<button class="btn sm" data-go="#/t/' + team.id + "/plan/" + c.id + '">🗓️ ' + esc(t("make_plan")) + "</button>" : "") + "</div>" +
      '<div class="sec"><h2>' + esc(t("per_cat")) + "</h2></div>" +
      ev.all.map((r, i) => '<details class="cat"' + (i === 0 ? " open" : "") + "><summary>" + badge(r.status, true) + "<b>" + esc(L(r.cat.n)) + "</b></summary>" +
        (r.cat.note ? '<p class="sub">' + esc(L(r.cat.note)) + "</p>" : "") +
        '<ul class="checks">' + r.checks.map(x => '<li class="' + ST[x.s] + '"><span>' + IC[x.s] + "</span><div>" + esc(msg(x)) +
          (x.k === "k_hw_miss" ? ' <a href="#/e/' + x.p.hw[0] + '">' + esc(t("where_buy")) + "</a>" : "") + "</div></li>").join("") + "</ul></details>").join("");
  } else {
    verdict = '<div class="card"><p>' + esc(t("pick_team")) + '</p><button class="btn pri wide" data-go="#/t/new">＋ ' + esc(t("new_team")) + "</button></div>";
  }

  MAIN.innerHTML = head('<span class="em">' + c.em + "</span>" + esc(c.name), "", "#/c") +
    '<div class="meta"><span class="pill">' + esc(c.org) + '</span><span class="pill l' + c.lvl + '">' + esc(t("lvl")[c.lvl]) + '</span><span class="pill">' + esc(natTxt) + "</span></div>" +
    '<div class="card">' + esc(L(c.d)) + "</div>" + verdict +
    '<div class="sec"><h2>' + esc(t("timeline")) + '</h2></div><div class="card"><ul class="tline">' +
    "<li><b>📝 " + esc(t("registration")) + "</b><span>" + esc(winLabel(reg)) + " · " + esc(reg.live ? t("reg_open") : whenText(reg)) + "</span></li>" +
    tl.map(x => "<li><b>" + (x.ev.intl ? "✈️ " : "📍 ") + esc(L(x.ev.n)) + "</b><span>" + esc(winLabel(x)) + " · " + esc(whenText(x)) + "</span></li>").join("") +
    "</ul></div>" +
    '<div class="sec"><h2>' + esc(t("rules")) + '</h2></div><div class="card scroll"><table class="tab"><tr><th>' + esc(t("c_cat")) + "</th><th>" + esc(t("c_age")) +
    "</th><th>" + esc(t("c_team")) + "</th><th>" + esc(t("c_hw")) + "</th></tr>" +
    c.cats.map(k => "<tr><td>" + esc(L(k.n)) + "</td><td>" + k.age[0] + "–" + (k.age[1] >= 99 ? "∞" : k.age[1]) + "</td><td>" + k.team[0] + "–" + k.team[1] + "</td><td>" +
      (k.hw === "any" ? esc(t("hw_any")) : k.hw === "none" ? esc(t("hw_none")) : k.hw.map(h => '<a href="#/e/' + h + '">' + esc(eqName(h)) + "</a>").join(", ")) + "</td></tr>").join("") +
    '</table><p class="sub">' + esc(t("season_cost", { a: c.cost[0], b: c.cost[1], p: c.prep })) + (c.coach ? " · " + esc(t("needs_coach")) : "") + (c.school ? " · " + esc(t("needs_school")) : "") + "</p></div>" +
    '<p class="note">' + esc(t("disclaimer")) + "</p>" +
    '<div class="actions"><button class="btn pri" data-url="' + esc(c.url) + '">🌐 ' + esc(t("official")) + "</button></div>";
}

/* ---------- Ομάδες ---------- */
function teamRow(x, now) {
  const res = COMPS.map(c => E.evaluate(c, x, now).best.status);
  const n = [0, 1, 2].map(s => res.filter(r => r === s).length);
  return '<button class="item" data-go="#/t/' + x.id + '"><div class="ic">👥</div><div class="tx"><h3>' + esc(x.name || "—") + "</h3>" +
    '<div class="mt">' + flag(x.country) + " " + x.students + " · " + x.ageMin + "–" + x.ageMax + " · " + esc(t("lvl")[x.lvl]) + "</div>" +
    '<div class="mt2"><span class="vb ok">✓ ' + n[0] + '</span><span class="vb warn">! ' + n[1] + '</span><span class="vb fail">✕ ' + n[2] + "</span></div>" +
    '</div><div class="chev">›</div></button>';
}

function teamsPage() {
  setNav("teams");
  const now = new Date();
  MAIN.innerHTML = head("👥 " + esc(t("nav_teams")), esc(t("teams_sub"))) +
    (teams.length ? '<div class="list">' + teams.map(x => teamRow(x, now)).join("") + "</div>" : '<div class="empty">' + esc(t("no_teams")) + "</div>") +
    '<div class="actions"><button class="btn pri" data-go="#/t/new">＋ ' + esc(t("new_team")) + "</button></div>";
}

function teamPage(id) {
  const x = teamById(id);
  if (!x) return teamsPage();
  setNav("teams");
  activeTeam = x.id; store.set("active", activeTeam);
  const now = new Date();
  const rows = COMPS.map(c => ({ c: c, ev: E.evaluate(c, x, now), w: E.entry(c, now) }))
    .sort((a, b) => a.ev.best.status - b.ev.best.status || a.ev.best.issues - b.ev.best.issues || a.w.a - b.w.a);
  const shop = E.shopping(x, now).slice(0, 5);
  const goals = rows.filter(r => r.ev.best.status === 0).map(r => r.c.name);
  const seek = Object.keys(x.seek || {}).filter(k => x.seek[k]).map(k => t("seek." + k));
  const card = t("card_text", { n: x.name || "—", c: flag(x.country) + " " + countryName(x.country), s: x.students, a: x.ageMin, b: x.ageMax, l: t("lvl")[x.lvl],
    h: x.hw.length ? eqList(x.hw) : t("nothing"), g: goals.length ? goals.join(", ") : t("nothing"), k: seek.length ? seek.join(", ") : t("nothing") });

  MAIN.innerHTML = head("👥 " + esc(x.name || "—"), flag(x.country) + " " + esc(countryName(x.country)) + " · " + x.students + " · " + x.ageMin + "–" + x.ageMax + " · " +
    esc(t("lvl")[x.lvl]) + " · " + x.budget + "€ · " + esc(t("travel." + x.travel)) + "<br>🧰 " + esc(x.hw.length ? eqList(x.hw) : t("nothing")), "#/t") +
    '<div class="row2"><button class="btn sec" data-go="#/t/' + x.id + '/edit">✎ ' + esc(t("edit")) + '</button><button class="btn sec" id="t_del">🗑 ' + esc(t("delete")) + "</button></div>" +
    '<div class="sec"><h2>' + esc(t("matches")) + '</h2></div><div class="list">' +
    rows.map(r => '<button class="item" data-go="#/c/' + r.c.id + "?team=" + x.id + '"><div class="ic">' + r.c.em + '</div><div class="tx"><h3>' + esc(r.c.name) + "</h3>" +
      '<div class="mt">📅 ' + esc(winLabel(r.w)) + " · " + esc(whenText(r.w)) + '</div><div class="mt2">' + badge(r.ev.best.status, true) +
      (r.ev.best.status < 2 ? '<span class="dim">' + esc(L(r.ev.best.cat.n)) + "</span>" : "") + '</div></div><div class="chev">›</div></button>').join("") + "</div>" +
    '<div class="sec"><h2>🛒 ' + esc(t("shopping")) + '</h2></div><p class="sub">' + esc(t("shop_p")) + "</p>" +
    (shop.length ? '<div class="list">' + shop.map(s => '<button class="item" data-go="#/e/' + s.eq.k + '"><div class="ic">🧰</div><div class="tx"><h3>' + esc(L(s.eq.n)) + "</h3>" +
      '<div class="mt">~' + s.eq.price[0] + "–" + s.eq.price[1] + "€ · " + esc(s.comps.length === 1 ? t("unlock1") : t("unlocks", { n: s.comps.length })) + "</div>" +
      '<div class="mt dim">' + esc(s.comps.map(c => c.name).join(", ")) + '</div></div><div class="chev">›</div></button>').join("") + "</div>"
      : '<div class="empty">' + esc(t("shop_none")) + "</div>") +
    '<div class="sec"><h2>🪪 ' + esc(t("team_card")) + '</h2></div><div class="card"><p class="sub">' + esc(t("team_card_p")) + '</p><pre class="tcard">' + esc(card) +
    '</pre><div class="row2"><button class="btn sec" id="tc_copy">📋 ' + esc(t("copy")) + '</button><button class="btn pri" id="tc_share">↗ ' + esc(t("share")) + "</button></div></div>";

  document.getElementById("tc_copy").onclick = () => copyText(card);
  document.getElementById("tc_share").onclick = () => shareText(x.name, card);
  document.getElementById("t_del").onclick = () => {
    if (!confirm(t("del_q", { n: x.name || "—" }))) return;
    teams = teams.filter(y => y.id !== x.id); saveTeams();
    delete plans[x.id]; store.set("plans", plans);
    toast(t("deleted")); go("#/t");
  };
}

function teamEdit(id) {
  setNav("teams");
  const existing = id ? teamById(id) : null;
  const x = Object.assign({ name: "", country: country || "GR", students: 3, ageMin: 11, ageMax: 14, lvl: 1, budget: 500, travel: "national", coach: true, school: true, hw: [], seek: {} }, existing || {});
  const num = (fid, label, v, min, max) => '<div class="fld"><label for="' + fid + '">' + esc(label) + '</label><input id="' + fid + '" type="number" inputmode="numeric" value="' + v + '" min="' + min + '" max="' + max + '"></div>';
  const check = (fid, label, on) => '<label class="ck"><input type="checkbox" id="' + fid + '"' + (on ? " checked" : "") + "><span>" + esc(label) + "</span></label>";
  MAIN.innerHTML = head("✎ " + esc(t("team_edit")), "", existing ? "#/t/" + existing.id : "#/t") +
    '<div class="card"><div class="fld"><label for="f_name">' + esc(t("t_name")) + '</label><input id="f_name" value="' + esc(x.name) + '" placeholder="' + esc(t("t_name_ph")) + '"></div>' +
    '<div class="fld"><label for="f_cc">' + esc(t("t_country")) + '</label><select id="f_cc">' + countryOptions(x.country) + "</select></div></div>" +
    '<div class="card"><h3>' + esc(t("t_students")) + '</h3><div class="row">' + num("f_n", t("t_count"), x.students, 1, 80) +
    '<div class="fld"><label for="f_lvl">' + esc(t("t_lvl")) + '</label><select id="f_lvl">' + [1, 2, 3].map(l => '<option value="' + l + '"' + (x.lvl === l ? " selected" : "") + ">" + esc(t("lvl")[l]) + "</option>").join("") + "</select></div>" +
    num("f_a0", t("t_age0"), x.ageMin, 4, 60) + num("f_a1", t("t_age1"), x.ageMax, 4, 60) + "</div></div>" +
    '<div class="card"><h3>' + esc(t("t_hw")) + '</h3><div class="eqgrid">' +
    EQUIP.map(e => '<label class="ck"><input type="checkbox" name="hw" value="' + e.k + '"' + (x.hw.indexOf(e.k) >= 0 ? " checked" : "") + "><span>" + esc(L(e.n)) + "</span></label>").join("") + "</div></div>" +
    '<div class="card"><h3>' + esc(t("t_res")) + '</h3><div class="row">' + num("f_b", t("t_budget"), x.budget, 0, 1000000) +
    '<div class="fld"><label for="f_tr">' + esc(t("t_travel")) + '</label><select id="f_tr">' + ["local", "national", "intl"].map(k => '<option value="' + k + '"' + (x.travel === k ? " selected" : "") + ">" + esc(t("travel." + k)) + "</option>").join("") + "</select></div></div>" +
    check("f_coach", t("t_coach"), x.coach) + check("f_school", t("t_school"), x.school) + "</div>" +
    '<div class="card"><h3>' + esc(t("t_seek")) + '</h3><div class="eqgrid">' + ["members", "sponsor", "mentor", "equipment"].map(k =>
      '<label class="ck"><input type="checkbox" name="seek" value="' + k + '"' + (x.seek && x.seek[k] ? " checked" : "") + "><span>" + esc(t("seek." + k)) + "</span></label>").join("") + "</div></div>" +
    '<div class="actions"><button class="btn pri" id="f_save">💾 ' + esc(t("t_saveck")) + "</button></div>";

  const $ = i => document.getElementById(i);
  $("f_save").onclick = () => {
    const int = (i, d) => { const v = parseInt($(i).value, 10); return isNaN(v) ? d : v; };
    let a0 = int("f_a0", 10), a1 = int("f_a1", a0);
    if (a1 < a0) { const s = a0; a0 = a1; a1 = s; }
    const seek = {};
    MAIN.querySelectorAll('input[name="seek"]').forEach(i => { seek[i.value] = i.checked; });
    const out = Object.assign({}, x, {
      id: x.id || uid(), name: $("f_name").value.trim(), country: $("f_cc").value, students: Math.max(1, int("f_n", 1)),
      ageMin: a0, ageMax: a1, lvl: int("f_lvl", 1), budget: Math.max(0, int("f_b", 0)), travel: $("f_tr").value,
      coach: $("f_coach").checked, school: $("f_school").checked, seek: seek,
      hw: Array.from(MAIN.querySelectorAll('input[name="hw"]:checked')).map(i => i.value),
    });
    const i = teams.findIndex(y => y.id === out.id);
    if (i >= 0) teams[i] = out; else teams.push(out);
    saveTeams();
    activeTeam = out.id; store.set("active", activeTeam);
    if (!country) { country = out.country; store.set("country", country); }
    toast(t("saved"));
    go("#/t/" + out.id);
  };
}

/* ---------- Πλάνο προετοιμασίας ---------- */
function planPage(tid, cid) {
  const x = teamById(tid), c = CMAP[cid];
  if (!x || !c) return teamsPage();
  setNav("teams");
  const now = new Date(), cur = now.getFullYear() * 12 + now.getMonth() + 1;
  const best = E.evaluate(c, x, now).best;
  let entry = E.entry(c, now);
  if (entry.live || entry.months < c.prep) entry = { a: entry.a + 12, b: entry.b + 12, ev: entry.ev };   // στόχος η επόμενη σεζόν
  const reg = E.nextWindow(c.reg, now);
  let regWin = { a: reg.a, b: reg.b };
  while (regWin.a > entry.a) { regWin = { a: regWin.a - 12, b: regWin.b - 12 }; }
  if (regWin.b < cur) { regWin = { a: regWin.a + 12, b: regWin.b + 12 }; }
  const at = i => Math.max(cur, i);
  const items = [];
  items.push({ m: cur, t: t("p_rules", { c: L(best.cat.n) }) });
  if (best.missing.length) items.push({ m: cur, t: t("p_buy", { x: eqName(best.missing[0]) }), link: "#/e/" + best.missing[0] });
  if (x.budget < best.total) items.push({ m: cur, t: t("p_fund", { e: best.total - x.budget }) });
  items.push({ m: at(regWin.a), t: t("p_reg") + " (" + winLabel(regWin) + ")" });
  items.push({ m: at(entry.a - c.prep), t: t("p_build") });
  items.push({ m: at(entry.a - 2), t: t("p_test") });
  if (best.travel || c.nat === "none") items.push({ m: at(entry.a - 2), t: t("p_travel") });
  items.push({ m: at(entry.a - 1), t: t("p_final") });
  E.timeline(c, { getFullYear: () => Math.floor((entry.a - 1) / 12), getMonth: () => (entry.a - 1) % 12 }).forEach(w => items.push({ m: w.a, t: (w.ev.intl ? "✈️ " : "🏁 ") + L(w.ev.n), ev: true }));
  items.sort((a, b) => a.m - b.m);
  const done = ((plans[tid] || {})[cid]) || [];

  MAIN.innerHTML = head("🗓️ " + esc(t("make_plan")), esc(t("plan_sub", { t: x.name || "—", c: c.name })) + "<br>" + esc(t("plan_p")), "#/c/" + cid + "?team=" + tid) +
    '<div class="card"><ul class="plan">' + items.map((it, i) =>
      '<li class="' + (it.ev ? "ev" : "") + '"><span class="pm">' + esc(ym(it.m)) + "</span>" +
      (it.ev ? '<span class="pt"><b>' + esc(it.t) + "</b></span>"
        : '<label class="pt"><input type="checkbox" data-i="' + i + '"' + (done.indexOf(i) >= 0 ? " checked" : "") + "><span>" + esc(it.t) +
          (it.link ? ' <a href="' + it.link + '">' + esc(t("where_buy")) + "</a>" : "") + "</span></label>") + "</li>").join("") + "</ul></div>" +
    '<p class="note">' + esc(t("disclaimer")) + "</p>";
  MAIN.querySelectorAll("input[data-i]").forEach(cb => cb.onchange = () => {
    const list = Array.from(MAIN.querySelectorAll("input[data-i]:checked")).map(i => +i.dataset.i);
    plans[tid] = plans[tid] || {}; plans[tid][cid] = list; store.set("plans", plans);
  });
}

/* ---------- Εξοπλισμός & προμηθευτές ---------- */
function gearPage(params) {
  setNav("gear");
  const tab = params.tab === "sup" ? "sup" : "eq";
  const tabs = '<div class="seg">' + chip("🧰 " + esc(t("tab_eq")), "#/e", tab === "eq") + chip("🏪 " + esc(t("tab_sup")), "#/e?tab=sup", tab === "sup") + "</div>";
  if (tab === "eq") {
    MAIN.innerHTML = head("🧰 " + esc(t("nav_gear")), esc(t("gear_sub"))) + tabs + '<div class="list">' + EQUIP.map(e => {
      const u = E.usage(e.k), n = new Set(u.req.concat(u.any).map(r => r.c.id)).size;
      return '<button class="item" data-go="#/e/' + e.k + '"><div class="ic">' + (e.type === "tool" ? "🛠️" : "🤖") + '</div><div class="tx"><h3>' + esc(L(e.n)) + "</h3>" +
        '<div class="mt">~' + e.price[0] + "–" + e.price[1] + "€ · " + esc(t("ages", { a: e.age[0] })) + (n ? " · 🏆 " + n : "") + '</div></div><div class="chev">›</div></button>';
    }).join("") + "</div>";
    return;
  }
  const r = params.r || "", q = params.q || "", qn = norm(q);
  const myRegion = E.region(country);
  const list = SUPS.filter(s => (!r || (r === "near" ? E.region(s.hq) === myRegion || s.hq === country : s.kind === r)) &&
    (!qn || norm([s.n, L(s.d), s.eq.map(eqName).join(" "), countryName(s.hq)].join(" ")).indexOf(qn) >= 0))
    .sort((a, b) => (b.hq === country) - (a.hq === country) || (E.region(b.hq) === myRegion) - (E.region(a.hq) === myRegion) || a.n.localeCompare(b.n));
  const qs = o => { const p = Object.assign({ tab: "sup", r: r, q: q }, o); return "#/e?" + Object.keys(p).filter(k => p[k]).map(k => k + "=" + encodeURIComponent(p[k])).join("&"); };
  MAIN.innerHTML = head("🏪 " + esc(t("tab_sup")), esc(t("sup_note"))) + tabs +
    '<label class="search"><span>🔍</span><input id="sq" type="search" value="' + esc(q) + '" placeholder="' + esc(t("search_sup")) + '"></label>' +
    '<div class="chips">' + chip(esc(t("all")), qs({ r: "" }), !r) + (country ? chip(flag(country) + " " + esc(t("f_near")), qs({ r: "near" }), r === "near") : "") +
    ["maker", "shop", "dist"].map(k => chip(esc(t("kind." + k)), qs({ r: k }), r === k)).join("") + "</div>" +
    (list.length ? '<div class="list">' + list.map(supRow).join("") + "</div>" : '<div class="empty">' + esc(t("none_found")) + "</div>") +
    '<div class="card cta"><h3>🏪 ' + esc(t("sup_cta_t")) + "</h3><p>" + esc(t("sup_cta_p")) + '</p><button class="btn pri wide" data-go="#/add?k=supplier">' + esc(t("add_listing")) + "</button></div>";
  const inp = document.getElementById("sq");
  let tm;
  inp.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { history.replaceState(null, "", qs({ q: inp.value.trim() })); gearPage(Object.assign({}, params, { tab: "sup", q: inp.value.trim() })); const n = document.getElementById("sq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
}
function supRow(s) {
  return '<div class="item sup"><div class="ic">' + flag(s.hq) + '</div><div class="tx"><h3>' + esc(s.n) + "</h3>" +
    '<div class="mt">' + esc(t("kind." + s.kind)) + " · " + esc(t("hq", { c: countryName(s.hq) })) + "</div>" +
    '<p class="sd">' + esc(L(s.d)) + '</p><div class="tags">' + s.eq.map(k => '<a class="tag" href="#/e/' + k + '">' + esc(eqName(k)) + "</a>").join("") + "</div></div>" +
    '<button class="btn sm pri" data-url="' + esc(s.url) + '">' + esc(t("visit")) + " ↗</button></div>";
}

function eqPage(k) {
  const e = EQ[k];
  if (!e) return gearPage({});
  setNav("gear");
  const u = E.usage(k);
  const myRegion = E.region(country);
  const sups = SUPS.filter(s => s.eq.indexOf(k) >= 0)
    .sort((a, b) => (b.hq === country) - (a.hq === country) || (E.region(b.hq) === myRegion) - (E.region(a.hq) === myRegion) || (a.kind === "maker" ? -1 : 1));
  const group = rows => {
    const by = {};
    rows.forEach(r => { (by[r.c.id] = by[r.c.id] || { c: r.c, cats: [] }).cats.push(L(r.cat.n)); });
    return Object.keys(by).map(id => '<button class="item" data-go="#/c/' + id + '"><div class="ic">' + by[id].c.em + '</div><div class="tx"><h3>' + esc(by[id].c.name) +
      '</h3><div class="mt">' + esc(by[id].cats.join(", ")) + '</div></div><div class="chev">›</div></button>').join("");
  };
  MAIN.innerHTML = head((e.type === "tool" ? "🛠️ " : "🤖 ") + esc(L(e.n)), "", "#/e") +
    '<div class="meta"><span class="pill">' + esc(t("price", { a: e.price[0], b: e.price[1] })) + '</span><span class="pill">' + esc(t("ages", { a: e.age[0] })) + "</span>" +
    (e.lang ? '<span class="pill">' + esc(t("langs", { l: e.lang })) + "</span>" : "") + "</div>" +
    '<div class="card">' + esc(L(e.d)) + "</div>" +
    (u.req.length ? '<div class="sec"><h2>' + esc(t("used_in")) + '</h2></div><div class="list">' + group(u.req) + "</div>" : "") +
    (u.rec.length ? '<div class="sec"><h2>' + esc(t("rec_in")) + '</h2></div><div class="list">' + group(u.rec) + "</div>" : "") +
    (u.any.length ? '<div class="sec"><h2>' + esc(t("any_in")) + '</h2></div><div class="list">' + group(u.any) + "</div>" : "") +
    '<div class="sec"><h2>🏪 ' + esc(t("sold_by")) + "</h2></div>" + (country ? '<p class="sub">' + esc(t("near_first")) + "</p>" : "") +
    '<div class="list">' + sups.map(supRow).join("") + "</div>" + '<p class="note">' + esc(t("sup_note")) + "</p>";
}

/* ---------- Περισσότερα ---------- */
function morePage() {
  setNav("more");
  MAIN.innerHTML = head("☰ " + esc(t("more_t"))) +
    '<div class="card"><h3>⚙️ ' + esc(t("settings")) + '</h3><div class="row">' +
    '<div class="fld"><label for="m_lang">' + esc(t("language")) + '</label><select id="m_lang"><option value="el"' + (lang === "el" ? " selected" : "") +
    '>Ελληνικά</option><option value="en"' + (lang === "en" ? " selected" : "") + ">English</option></select></div>" +
    '<div class="fld"><label for="m_cc">' + esc(t("my_country")) + '</label><select id="m_cc">' + countryOptions(country, true) + "</select></div></div>" +
    '<label class="lbl2">' + esc(t("theme")) + '</label><div class="seg">' + ["auto", "light", "dark"].map(k => '<button class="chip' + (theme === k ? " on" : "") + '" data-theme="' + k + '">' + esc(t("th." + k)) + "</button>").join("") + "</div>" +
    '<label class="lbl2">' + esc(t("i_am")) + '</label><div class="seg">' + ["team", "student", "supplier", "organizer"].map(r => '<button class="chip' + (role === r ? " on" : "") + '" data-role="' + r + '">' + esc(t("role." + r)) + "</button>").join("") + "</div></div>" +
    '<button class="item" data-go="#/add"><div class="ic">🤝</div><div class="tx"><h3>' + esc(t("contribute")) + '</h3><div class="mt">' + esc(t("contribute_p")) + '</div></div><div class="chev">›</div></button>' +
    '<div class="card"><h3>💾 ' + esc(t("data_t")) + '</h3><div class="row2"><button class="btn sec" id="m_exp">⬆ ' + esc(t("export")) + '</button><button class="btn sec" id="m_imp">⬇ ' + esc(t("import")) + "</button></div>" +
    '<textarea id="m_json" class="json" hidden placeholder="{ &quot;teams&quot;: [...] }"></textarea><button class="btn pri wide" id="m_impgo" hidden>⬇ ' + esc(t("import")) + "</button>" +
    '<button class="link danger" id="m_reset">' + esc(t("reset")) + "</button></div>" +
    '<div class="card"><h3>ⓘ ' + esc(t("about_t")) + "</h3><p>" + esc(t("about_p")) + '</p><p class="sub">' + esc(t("trademarks")) + "</p></div>";

  const $ = i => document.getElementById(i);
  $("m_lang").onchange = () => { lang = $("m_lang").value; store.set("lang", lang); applyLang(); morePage(); };
  $("m_cc").onchange = () => { country = $("m_cc").value; store.set("country", country); };
  MAIN.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => { theme = b.dataset.theme; store.set("theme", theme); applyTheme(); morePage(); });
  MAIN.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { role = b.dataset.role; store.set("role", role); morePage(); });
  $("m_exp").onclick = () => shareText("RoboAtlas", JSON.stringify({ app: "roboatlas", v: 1, teams: teams, plans: plans }, null, 1));
  $("m_imp").onclick = () => { $("m_json").hidden = false; $("m_impgo").hidden = false; $("m_json").focus(); };
  $("m_impgo").onclick = () => {
    try {
      const d = JSON.parse($("m_json").value);
      const list = (d.teams || []).filter(x => x && typeof x.students === "number" && Array.isArray(x.hw));
      if (!list.length) throw new Error("empty");
      list.forEach(x => { const i = teams.findIndex(y => y.id === x.id); if (i >= 0) teams[i] = x; else teams.push(Object.assign({ id: uid() }, x)); });
      saveTeams();
      if (d.plans) { plans = Object.assign(plans, d.plans); store.set("plans", plans); }
      toast(t("import_ok", { n: list.length })); go("#/t");
    } catch (e) { toast(t("import_bad")); }
  };
  $("m_reset").onclick = () => {
    if (!confirm(t("reset_q"))) return;
    try { Object.keys(localStorage).filter(k => k.indexOf("ra.") === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    location.hash = "#/"; location.reload();
  };
}

/* ---------- Συνεισφορά ---------- */
function addPage(params) {
  setNav("more");
  const k = ["supplier", "competition", "fix"].indexOf(params.k) >= 0 ? params.k : "supplier";
  const fld = (id, label, extra) => '<div class="fld"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '"' + (extra || "") + "></div>";
  const eqChecks = name => '<div class="eqgrid">' + EQUIP.map(e => '<label class="ck"><input type="checkbox" name="' + name + '" value="' + e.k + '"><span>' + esc(L(e.n)) + "</span></label>").join("") + "</div>";
  let form = "";
  if (k === "supplier") form = fld("a_name", t("a_name")) + fld("a_url", t("a_url"), ' type="url" placeholder="https://"') +
    '<div class="fld"><label for="a_cc">' + esc(t("a_country")) + '</label><select id="a_cc">' + countryOptions(country, true) + "</select></div>" +
    '<label class="lbl2">' + esc(t("a_eq")) + "</label>" + eqChecks("a_eq") + '<div class="fld"><label for="a_desc">' + esc(t("a_desc")) + '</label><textarea id="a_desc" rows="3"></textarea></div>';
  if (k === "competition") form = fld("a_name", t("a_name")) + fld("a_url", t("a_url"), ' type="url" placeholder="https://"') + fld("a_org", t("a_org")) +
    '<div class="row"><div class="fld"><label for="a_cc">' + esc(t("a_country")) + '</label><select id="a_cc">' + countryOptions(country, true) + "</select></div>" +
    '<div class="fld"><label for="a_m">' + esc(t("a_months")) + '</label><select id="a_m">' + t("months").slice(1).map((m, i) => '<option value="' + (i + 1) + '">' + m + "</option>").join("") + "</select></div>" +
    fld("a_age", t("a_age"), ' placeholder="10-16"') + fld("a_team", t("a_team"), ' placeholder="2-4"') + "</div>" +
    '<label class="lbl2">' + esc(t("a_hw")) + '</label><label class="ck"><input type="checkbox" id="a_any"><span>' + esc(t("hw_any")) + "</span></label>" + eqChecks("a_eq") +
    '<div class="fld"><label for="a_desc">' + esc(t("a_desc")) + '</label><textarea id="a_desc" rows="3"></textarea></div>';
  if (k === "fix") form = '<div class="fld"><label for="a_desc">' + esc(t("a_fix_what")) + '</label><textarea id="a_desc" rows="5"></textarea></div>' + fld("a_url", t("a_url"), ' type="url" placeholder="https://"');
  form += fld("a_mail", t("a_contact"), ' type="email"');

  MAIN.innerHTML = head("🤝 " + esc(t("add_t")), esc(t("contribute_p")), "#/m") +
    '<div class="seg">' + ["supplier", "competition", "fix"].map(x => chip(esc(t("add_kind." + x)), "#/add?k=" + x, x === k)).join("") + "</div>" +
    '<div class="card">' + form + '<button class="btn pri wide" id="a_go">' + esc(t("a_send")) + '</button></div><div id="a_out"></div>';

  const $ = i => document.getElementById(i);
  const val = i => ($(i) ? $(i).value.trim() : "");
  const range = s => { const m = s.match(/(\d+)\D+(\d+)/); return m ? [+m[1], +m[2]] : null; };
  $("a_go").onclick = () => {
    if (k !== "fix" && (!val("a_name") || !/^https?:\/\//.test(val("a_url")))) { toast(t("a_need")); return; }
    if (k === "fix" && !val("a_desc")) { toast(t("a_need")); return; }
    const eqs = Array.from(MAIN.querySelectorAll('input[name="a_eq"]:checked')).map(i => i.value);
    let obj;
    if (k === "supplier") obj = { type: "supplier", n: val("a_name"), url: val("a_url"), hq: val("a_cc"), kind: "shop", eq: eqs, d: { [lang]: val("a_desc") } };
    if (k === "competition") obj = { type: "competition", name: val("a_name"), url: val("a_url"), org: val("a_org"), host: val("a_cc"),
      events: [{ m: [+val("a_m"), +val("a_m")] }], cats: [{ age: range(val("a_age")), team: range(val("a_team")), hw: $("a_any").checked ? "any" : eqs }], d: { [lang]: val("a_desc") } };
    if (k === "fix") obj = { type: "fix", text: val("a_desc"), url: val("a_url") };
    if (val("a_mail")) obj.contact = val("a_mail");
    const text = "RoboAtlas – " + t("add_kind." + k) + "\n\n" + JSON.stringify(obj, null, 2);
    const title = "RoboAtlas: " + t("add_kind." + k) + (obj.n || obj.name ? " – " + (obj.n || obj.name) : "");
    $("a_out").innerHTML = '<div class="card"><p>' + esc(t("a_ready")) + '</p><pre class="tcard">' + esc(text) + '</pre><div class="row2">' +
      '<button class="btn sec" id="o_copy">📋 ' + esc(t("copy")) + '</button><button class="btn sec" id="o_share">↗ ' + esc(t("share")) + "</button></div>" +
      (CONFIG.contactEmail ? '<button class="btn pri wide" id="o_mail">✉️ ' + esc(t("a_email")) + "</button>" : "") +
      (CONFIG.issuesUrl ? '<button class="btn pri wide" id="o_issue">🐙 ' + esc(t("a_issue")) + "</button>" : "") + "</div>";
    $("o_copy").onclick = () => copyText(text);
    $("o_share").onclick = () => shareText(title, text);
    if ($("o_mail")) $("o_mail").onclick = () => { location.href = "mailto:" + CONFIG.contactEmail + "?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text); };
    if ($("o_issue")) $("o_issue").onclick = () => openUrl(CONFIG.issuesUrl + "?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent("```json\n" + JSON.stringify(obj, null, 2) + "\n```"));
    $("a_out").scrollIntoView({ behavior: "smooth" });
  };
}

/* ---------- Router ---------- */
function route() {
  const h = location.hash || "#/";
  const parts0 = h.slice(1).split("?");
  const params = {};
  (parts0[1] || "").split("&").filter(Boolean).forEach(kv => { const i = kv.indexOf("="); params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1) || ""); });
  const p = parts0[0].split("/").filter(Boolean);
  if (p[0] === "c" && p[1]) compDetail(p[1], params);
  else if (p[0] === "c") compList(params);
  else if (p[0] === "t" && p[1] === "new") teamEdit(null);
  else if (p[0] === "t" && p[1] && p[2] === "edit") teamEdit(p[1]);
  else if (p[0] === "t" && p[1] && p[2] === "plan") planPage(p[1], p[3]);
  else if (p[0] === "t" && p[1]) teamPage(p[1]);
  else if (p[0] === "t") teamsPage();
  else if (p[0] === "e" && p[1]) eqPage(p[1]);
  else if (p[0] === "e") gearPage(params);
  else if (p[0] === "m") morePage();
  else if (p[0] === "add") addPage(params);
  else home();
  window.scrollTo(0, 0);
}

document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const u = e.target.closest("[data-url]");
  if (u) { e.preventDefault(); openUrl(u.dataset.url); }
});
window.addEventListener("hashchange", route);

applyTheme();
applyLang();
route();

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
})();
