/* Διαγωνισμοί ρομποτικής + έλεγχος καταλληλότητας ομάδας.
 * Φορτώνεται πριν από το app.js· το app.js καλεί RZComp.list / detail / team με τα δικά του helpers. */
(function () {
"use strict";

const COMPS = window.COMPETITIONS || [];
const EQUIP = window.EQUIPMENT || [];
const EQ = {};
EQUIP.forEach(e => { EQ[e.k] = e; });
const CTRL = EQUIP.map(e => e.k);          // κάθε εξοπλισμός της λίστας είναι προγραμματιζόμενος ελεγκτής

const MON = ["", "Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιούν", "Ιούλ", "Αύγ", "Σεπ", "Οκτ", "Νοέ", "Δεκ"];
const LVL = { 1: "Αρχάριο", 2: "Μέσο", 3: "Προχωρημένο" };
const TRAVEL = { local: "Μόνο τοπικά / στην πόλη μας", national: "Μέσα στην Ελλάδα", intl: "Και στο εξωτερικό" };
const OK = 0, WARN = 1, FAIL = 2, INFO = 3;   // INFO: πληροφορία, δεν επηρεάζει την απόφαση
const VERDICT = [
  { t: "Μπορεί να συμμετάσχει", s: "ok", i: "✓" },
  { t: "Υπό προϋποθέσεις", s: "warn", i: "!" },
  { t: "Δεν πληροί τις προϋποθέσεις", s: "fail", i: "✕" },
];
const DEFAULT_TEAM = {
  name: "", students: 3, ageMin: 11, ageMax: 14, coach: true, school: true,
  lvl: 1, budget: 500, travel: "national", hw: [],
};

/* ---------- Ημερομηνίες ---------- */
// Επόμενη εμφάνιση ενός διαστήματος μηνών [s, e] (επιτρέπεται e < s, π.χ. Νοε→Μαρ).
function nextWindow(m, now) {
  const s = m[0], e = m[1] >= m[0] ? m[1] : m[1] + 12;
  const cur = now.getFullYear() * 12 + now.getMonth() + 1;
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
    const a = y * 12 + s, b = y * 12 + e;
    if (b >= cur) return { a: a, b: b, live: a <= cur, months: Math.max(0, a - cur) };
  }
  return null;
}
function ymLabel(i) { const y = Math.floor((i - 1) / 12), m = i - y * 12; return MON[m] + " " + y; }
function windowLabel(w) {
  if (w.a === w.b) return ymLabel(w.a);
  const ya = Math.floor((w.a - 1) / 12), yb = Math.floor((w.b - 1) / 12);
  return ya === yb ? MON[w.a - ya * 12] + "–" + ymLabel(w.b) : ymLabel(w.a) + " – " + ymLabel(w.b);
}
function whenText(w) {
  if (w.live) return "σε εξέλιξη τώρα";
  if (w.months === 0) return "αυτόν τον μήνα";
  if (w.months === 1) return "τον επόμενο μήνα";
  return "σε ~" + w.months + " μήνες";
}
function timeline(c, now) {
  return c.events.map(ev => Object.assign({ ev: ev }, nextWindow(ev.m, now))).sort((x, y) => x.a - y.a);
}
// Η πρώτη φάση (είσοδος) της επόμενης διοργάνωσης· οι επόμενες φάσεις θέλουν πρόκριση.
function entry(c, now) { return Object.assign({ ev: c.events[0] }, nextWindow(c.events[0].m, now)); }
function regOpen(c, now) {
  const w = nextWindow(c.reg, now);
  return w && w.live;
}

/* ---------- Έλεγχος καταλληλότητας ---------- */
function hwNames(list) { return list.map(k => EQ[k] ? EQ[k].n : k).join(" ή "); }

function checkCat(c, cat, team, now) {
  const out = [];
  const add = (s, t) => out.push({ s: s, t: t });

  // Ηλικίες: όλοι οι μαθητές πρέπει να είναι μέσα στο όριο
  const [a0, a1] = cat.age;
  if (team.ageMin >= a0 && team.ageMax <= a1) add(OK, "Ηλικίες " + team.ageMin + "–" + team.ageMax + " εντός ορίου (" + a0 + "–" + (a1 >= 99 ? "χωρίς όριο" : a1) + ")");
  else if (team.ageMax < a0 || team.ageMin > a1) add(FAIL, "Ηλικίες " + team.ageMin + "–" + team.ageMax + ": η κατηγορία είναι για " + a0 + "–" + a1 + " ετών");
  else add(WARN, "Μόνο μέρος των μαθητών είναι " + a0 + "–" + a1 + " ετών: συμμετέχουν μόνο όσοι είναι εντός ορίου");

  // Μέλη ομάδας
  const [t0, t1] = cat.team, n = team.students;
  if (n < t0) add(FAIL, "Χρειάζονται τουλάχιστον " + t0 + " μαθητές (έχετε " + n + ")");
  else if (n > t1) {
    const k = Math.ceil(n / t1);
    if (k * t0 <= n) add(INFO, "Έως " + t1 + " μαθητές ανά ομάδα: δηλώστε " + k + " ομάδες με τους " + n + " μαθητές");
    else add(WARN, "Έως " + t1 + " μαθητές ανά ομάδα: οι " + n + " δεν χωρίζονται σε πλήρεις ομάδες (κάποιοι θα μείνουν εκτός)");
  } else add(OK, n + " μαθητές: εντός ορίου (" + t0 + "–" + t1 + " ανά ομάδα)");

  // Εξοπλισμός
  let hwCost = 0;
  if (cat.hw === "none") add(OK, "Το υλικό δίνεται από τη διοργάνωση");
  else {
    const need = cat.hw === "any" ? CTRL : cat.hw;
    const have = need.filter(k => team.hw.indexOf(k) >= 0);
    if (have.length) add(OK, "Εξοπλισμός: " + hwNames(have).replace(/ ή /g, ", "));
    else {
      const cheapest = need.map(k => EQ[k]).filter(Boolean).sort((x, y) => x.cost - y.cost)[0];
      hwCost = cheapest ? cheapest.cost : 0;
      const what = cat.hw === "any" ? "έναν προγραμματιζόμενο ελεγκτή (π.χ. " + cheapest.n + ")" : hwNames(need);
      add(hwCost <= Math.max(0, team.budget - c.cost[0]) ? WARN : FAIL,
        "Λείπει εξοπλισμός: χρειάζεστε " + what + " · αγορά από ~" + hwCost + "€");
    }
  }

  // Προπονητής / σχολείο / εθνική επιλογή
  if (c.coach) add(team.coach ? OK : FAIL, team.coach ? "Υπάρχει ενήλικας προπονητής" : "Απαιτείται ενήλικας προπονητής (εκπαιδευτικός ή γονέας)");
  if (c.school) add(team.school ? OK : FAIL, team.school ? "Σχολική ομάδα" : "Δέχεται μόνο σχολικές ομάδες με υπεύθυνο εκπαιδευτικό");
  if (c.select) add(WARN, "Μία ομάδα ανά χώρα: η επιλογή γίνεται από τον εθνικό φορέα");

  // Μετακίνηση
  const tl = timeline(c, now);
  const lvlTravel = { local: 0, national: 1, intl: 2 }[team.travel];
  if (c.gr) {
    if (lvlTravel >= 1) add(OK, "Υπάρχει φάση στην Ελλάδα" + (tl.some(x => x.ev.intl) ? (lvlTravel >= 2 ? " · μπορείτε να πάτε και στον διεθνή τελικό" : " · ο διεθνής τελικός θέλει ταξίδι στο εξωτερικό") : ""));
    else add(WARN, "Η εθνική φάση μπορεί να γίνει σε άλλη πόλη: χρειάζεται μετακίνηση");
  } else {
    if (lvlTravel >= 2) add(OK, "Δεν υπάρχει (γνωστή) εθνική φάση στην Ελλάδα: θα ταξιδέψετε στο εξωτερικό");
    else add(FAIL, "Δεν υπάρχει (γνωστή) εθνική φάση στην Ελλάδα: απαιτείται ταξίδι στο εξωτερικό");
  }

  // Κόστος
  const travelCost = !c.gr ? 1500 : 0;      // ενδεικτικό ταξίδι 3–5 ατόμων εντός Ευρώπης
  const total = c.cost[0] + hwCost + travelCost;
  if (team.budget >= total) add(OK, "Προϋπολογισμός " + team.budget + "€ ≥ εκτίμηση ~" + total + "€");
  else add(team.budget >= total * 0.6 ? WARN : FAIL, "Προϋπολογισμός " + team.budget + "€ < εκτίμηση ~" + total + "€" +
    (travelCost ? " (περιλαμβάνει ~" + travelCost + "€ ταξίδι)" : "") + ": χρειάζεστε χορηγό ή άλλη χρηματοδότηση");

  // Εμπειρία
  if (team.lvl >= c.lvl) add(OK, "Επίπεδο ομάδας κατάλληλο (" + LVL[c.lvl] + ")");
  else add(WARN, "Ο διαγωνισμός είναι επιπέδου «" + LVL[c.lvl] + "»: χρειάζεται επιπλέον εκπαίδευση");

  // Χρόνος προετοιμασίας μέχρι την πρώτη επόμενη φάση
  const first = entry(c, now);
  if (first && !first.live && first.months >= c.prep) add(OK, "Χρόνος προετοιμασίας: " + first.months + " μήνες έως «" + first.ev.n + "» (προτείνονται " + c.prep + ")");
  else if (first) add(INFO, "Για φέτος ο χρόνος είναι λίγος (" + first.ev.n + ": " + whenText(first) + ", προτείνονται " + c.prep +
    " μήνες προετοιμασίας) · στόχος η επόμενη σεζόν: " + windowLabel({ a: first.a + 12, b: first.b + 12 }));

  const status = out.reduce((m, x) => x.s === INFO ? m : Math.max(m, x.s), OK);
  return { cat: cat, status: status, checks: out, total: total };
}

function evaluate(c, team, now) {
  const res = c.cats.map(cat => checkCat(c, cat, team, now))
    .sort((a, b) => a.status - b.status || a.checks.filter(x => x.s && x.s !== INFO).length - b.checks.filter(x => x.s && x.s !== INFO).length);
  return { best: res[0], all: res };
}

/* ---------- Σελίδες ---------- */
function teamSummary(api, team) {
  if (!team) return '<div class="tool cteam"><h3>👥 Η ομάδα σας</h3><p>Συμπλήρωσε το προφίλ της ομάδας (μαθητές, ηλικίες, εξοπλισμό, προϋπολογισμό) για να δεις σε ποιους διαγωνισμούς μπορείτε να πάτε.</p>' +
    '<button class="btn pri" data-go="#/team" style="width:100%">Δημιουργία προφίλ ομάδας</button></div>';
  return '<div class="tool cteam"><div class="cth"><h3>👥 ' + api.esc(team.name || "Η ομάδα σας") + '</h3><button class="chip" data-go="#/team">✎ Αλλαγή</button></div>' +
    '<div class="sub">' + team.students + " μαθητές · " + team.ageMin + "–" + team.ageMax + " ετών · " + LVL[team.lvl] + " · " + team.budget + "€ · " + TRAVEL[team.travel] +
    "<br>" + (team.hw.length ? api.esc(hwNames(team.hw).replace(/ ή /g, ", ")) : "Χωρίς δηλωμένο εξοπλισμό") + "</div></div>";
}

function badge(st) { const v = VERDICT[st]; return '<span class="vbadge ' + v.s + '">' + v.i + " " + v.t + "</span>"; }

function list(api, filter) {
  api.setNav("comp");
  const now = new Date();
  const team = api.store.get("rz.team", null);
  const rows = COMPS.map(c => {
    const tl = timeline(c, now);
    return { c: c, tl: tl, next: entry(c, now), ev: team ? evaluate(c, team, now) : null };
  });
  const shown = rows.filter(r => {
    if (filter === "ok") return r.ev && r.ev.best.status === OK;
    if (filter === "maybe") return r.ev && r.ev.best.status <= WARN;
    if (filter === "gr") return r.c.gr;
    if (filter === "reg") return regOpen(r.c, now);
    return true;
  }).sort((a, b) => (a.ev && b.ev ? a.ev.best.status - b.ev.best.status : 0) || a.next.a - b.next.a);
  const counts = [0, 0, 0];
  if (team) rows.forEach(r => counts[r.ev.best.status]++);
  const chip = (f, t) => '<button class="chip' + ((filter || "") === f ? " on" : "") + '" data-go="#/comp' + (f ? "?f=" + f : "") + '">' + t + "</button>";

  api.main.innerHTML =
    '<div class="head"><div class="title">🏆 Διαγωνισμοί</div><div class="sub">Επερχόμενοι διαγωνισμοί ρομποτικής σε όλο τον κόσμο και αν μπορεί να συμμετάσχει η ομάδα σας.</div></div>' +
    teamSummary(api, team) +
    (team ? '<div class="cstats"><span class="vbadge ok">✓ ' + counts[0] + '</span><span class="vbadge warn">! ' + counts[1] + '</span><span class="vbadge fail">✕ ' + counts[2] + "</span></div>" : "") +
    '<div class="chips">' + chip("", "Όλοι") + (team ? chip("ok", "✓ Κατάλληλοι") + chip("maybe", "Κατάλληλοι ή υπό όρους") : "") +
    chip("gr", "🇬🇷 Με φάση στην Ελλάδα") + chip("reg", "Εγγραφές τώρα") + "</div>" +
    (shown.length ? '<div class="list">' + shown.map(r =>
      '<button class="item citem" data-go="#/comp/' + r.c.id + '">' +
      '<div class="ic" style="background:var(--chip)">' + r.c.em + "</div>" +
      '<div class="tx"><h3>' + api.esc(r.c.name) + "</h3>" +
      '<div class="mt">📅 ' + windowLabel(r.next) + " · " + whenText(r.next) + (r.c.gr ? " · 🇬🇷" : " · ✈️") + "</div>" +
      (r.ev ? '<div class="cv">' + badge(r.ev.best.status) + (r.ev.best.status < FAIL ? '<span class="cvc">' + api.esc(r.ev.best.cat.n) + "</span>" : "") + "</div>" : "") +
      '</div><div class="st">›</div></button>').join("") + "</div>"
      : '<div class="empty">Κανένας διαγωνισμός με αυτό το φίλτρο.</div>') +
    '<p class="sub cnote">Οι ημερομηνίες είναι η συνήθης περίοδος κάθε φάσης και οι κανόνες ενδεικτικοί. Πριν τη δήλωση συμμετοχής έλεγξε τον επίσημο κανονισμό της σεζόν.</p>';
}

function detail(api, id) {
  const c = COMPS.find(x => x.id === id);
  if (!c) return list(api);
  api.setNav("comp");
  const now = new Date();
  const team = api.store.get("rz.team", null);
  const ev = team ? evaluate(c, team, now) : null;
  const tl = timeline(c, now);
  const reg = nextWindow(c.reg, now);
  const ic = ["✓", "!", "✕", "i"], cls = ["ok", "warn", "fail", "info"];

  api.main.innerHTML =
    '<div class="head"><button class="back" data-go="#/comp">← Διαγωνισμοί</button>' +
    '<div class="title" style="font-size:20px"><span>' + c.em + "</span>" + api.esc(c.name) + "</div>" +
    '<div class="meta"><span class="pill">' + api.esc(c.org) + '</span><span class="pill lvl' + c.lvl + '">' + LVL[c.lvl] + "</span>" +
    '<span class="pill">' + (c.gr ? "🇬🇷 Φάση στην Ελλάδα" : "✈️ Μόνο εξωτερικό") + "</span></div></div>" +
    '<div class="desc">' + api.esc(c.d) + "</div>" +

    (ev ? '<div class="verdict ' + cls[ev.best.status] + '"><div class="vt">' + VERDICT[ev.best.status].i + " " + VERDICT[ev.best.status].t + "</div>" +
      '<div class="vs">' + (ev.best.status < FAIL ? "Καλύτερη κατηγορία: <b>" + api.esc(ev.best.cat.n) + "</b>" : "Καμία κατηγορία δεν ταιριάζει αυτή τη στιγμή") + " · εκτίμηση κόστους ~" + ev.best.total + "€</div></div>" +
      '<div class="sec"><h2>Έλεγχος ανά κατηγορία</h2></div>' +
      ev.all.map((r, i) => '<details class="ccat"' + (i === 0 ? " open" : "") + "><summary>" + badge(r.status) + "<b>" + api.esc(r.cat.n) + "</b></summary>" +
        (r.cat.note ? '<div class="sub" style="margin:4px 0 6px">' + api.esc(r.cat.note) + "</div>" : "") +
        '<ul class="checks">' + r.checks.map(x => '<li class="' + cls[x.s] + '"><span>' + ic[x.s] + "</span>" + api.esc(x.t) + "</li>").join("") + "</ul></details>").join("")
      : teamSummary(api, null)) +

    '<div class="sec"><h2>Χρονοδιάγραμμα</h2></div><div class="tool"><ul class="tline">' +
    '<li><b>Εγγραφές</b><span>' + windowLabel(reg) + " · " + (reg.live ? "πιθανώς ανοιχτές τώρα" : whenText(reg)) + "</span></li>" +
    tl.map(x => "<li><b>" + api.esc(x.ev.n) + "</b><span>" + windowLabel(x) + " · " + whenText(x) + (x.ev.intl ? " · ✈️" : "") + "</span></li>").join("") +
    "</ul></div>" +

    '<div class="sec"><h2>Κατηγορίες & κανόνες</h2></div><div class="tool"><table class="ctab"><tr><th>Κατηγορία</th><th>Ηλικία</th><th>Μέλη</th><th>Υλικό</th></tr>' +
    c.cats.map(k => "<tr><td>" + api.esc(k.n) + "</td><td>" + k.age[0] + "–" + (k.age[1] >= 99 ? "∞" : k.age[1]) + "</td><td>" + k.team[0] + "–" + k.team[1] + "</td><td>" +
      (k.hw === "any" ? "Οποιοδήποτε" : k.hw === "none" ? "Δίνεται" : api.esc(hwNames(k.hw).replace(/ ή /g, ", "))) + "</td></tr>").join("") +
    '</table><p style="margin:10px 0 0">Κόστος σεζόν: ~' + c.cost[0] + "–" + c.cost[1] + "€ · προετοιμασία: " + c.prep + " μήνες" +
    (c.coach ? " · ενήλικας προπονητής" : "") + (c.school ? " · σχολική ομάδα" : "") + "</p></div>" +
    '<div class="actions"><button class="btn pri" data-act="open">🌐 Επίσημη σελίδα</button><button class="btn sec2" data-go="#/team">👥 Ομάδα</button></div>';

  api.main.querySelector('[data-act="open"]').onclick = () => api.openUrl(c.url);
}

function team(api) {
  api.setNav("comp");
  const t = Object.assign({}, DEFAULT_TEAM, api.store.get("rz.team", {}));
  const num = (id, label, v, min, max) => '<div class="fld"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" inputmode="numeric" value="' + v + '" min="' + min + '" max="' + max + '"></div>';
  const sel = (id, label, opts, v) => '<div class="fld"><label for="' + id + '">' + label + '</label><select id="' + id + '">' +
    Object.keys(opts).map(k => '<option value="' + k + '"' + (String(v) === k ? " selected" : "") + ">" + opts[k] + "</option>").join("") + "</select></div>";

  api.main.innerHTML =
    '<div class="head"><button class="back" data-go="#/comp">← Διαγωνισμοί</button><div class="title">👥 Προφίλ ομάδας</div>' +
    '<div class="sub">Αποθηκεύεται μόνο σε αυτή τη συσκευή.</div></div>' +
    '<div class="tool"><div class="fld"><label for="f_name">Όνομα ομάδας / σχολείου</label><input id="f_name" value="' + api.esc(t.name) + '" placeholder="π.χ. Robotzedes 2ο Γυμνάσιο"></div></div>' +
    '<div class="tool"><h3>Μαθητές</h3><div class="row">' +
    num("f_n", "Πλήθος μαθητών", t.students, 1, 60) +
    sel("f_lvl", "Εμπειρία", LVL, t.lvl) +
    num("f_a0", "Μικρότερη ηλικία", t.ageMin, 5, 40) +
    num("f_a1", "Μεγαλύτερη ηλικία", t.ageMax, 5, 40) + "</div></div>" +
    '<div class="tool"><h3>Εξοπλισμός που διαθέτετε</h3><div class="eqgrid">' +
    EQUIP.map(e => '<label class="eq"><input type="checkbox" value="' + e.k + '"' + (t.hw.indexOf(e.k) >= 0 ? " checked" : "") + "><span>" + api.esc(e.n) + "</span></label>").join("") +
    "</div></div>" +
    '<div class="tool"><h3>Οργάνωση & πόροι</h3><div class="row">' +
    num("f_b", "Προϋπολογισμός (€)", t.budget, 0, 100000) +
    sel("f_tr", "Μπορείτε να ταξιδέψετε", TRAVEL, t.travel) + "</div>" +
    '<label class="eq wide"><input type="checkbox" id="f_coach"' + (t.coach ? " checked" : "") + "><span>Υπάρχει ενήλικας προπονητής (εκπαιδευτικός / γονέας)</span></label>" +
    '<label class="eq wide"><input type="checkbox" id="f_school"' + (t.school ? " checked" : "") + "><span>Σχολική ομάδα (όχι ιδιωτικός όμιλος)</span></label></div>" +
    '<div class="actions"><button class="btn pri" data-act="save">💾 Αποθήκευση & έλεγχος</button></div>';

  const $ = id => document.getElementById(id);
  api.main.querySelector('[data-act="save"]').onclick = () => {
    const int = (id, d) => { const v = parseInt($(id).value, 10); return isNaN(v) ? d : v; };
    let a0 = int("f_a0", 10), a1 = int("f_a1", a0);
    if (a1 < a0) { const x = a0; a0 = a1; a1 = x; }
    const out = {
      name: $("f_name").value.trim(), students: Math.max(1, int("f_n", 1)), ageMin: a0, ageMax: a1,
      lvl: int("f_lvl", 1), budget: Math.max(0, int("f_b", 0)), travel: $("f_tr").value,
      coach: $("f_coach").checked, school: $("f_school").checked,
      hw: Array.from(api.main.querySelectorAll(".eqgrid input:checked")).map(x => x.value),
    };
    api.store.set("rz.team", out);
    api.toast("Η ομάδα αποθηκεύτηκε ✓");
    api.go("#/comp");
  };
}

window.RZComp = { list: list, detail: detail, team: team, evaluate: evaluate, nextWindow: nextWindow };
})();
