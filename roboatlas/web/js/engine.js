/* RoboAtlas – μηχανή ημερομηνιών και καταλληλότητας ομάδας.
 * Δεν αγγίζει DOM: επιστρέφει ελέγχους { s: κατάσταση, k: κλειδί μηνύματος, p: παράμετροι }.
 * Οι παράμετροι με όνομα που ξεκινά από "hw" είναι λίστες κλειδιών εξοπλισμού (η διεπαφή τις μετατρέπει σε ονόματα). */
(function (root) {
"use strict";

const OK = 0, WARN = 1, FAIL = 2, INFO = 3;   // INFO: πληροφορία, δεν επηρεάζει την απόφαση

function create(data) {
  const COMPS = data.competitions, EQUIP = data.equipment, COUNTRIES = data.countries;
  const EQ = {};
  EQUIP.forEach(e => { EQ[e.k] = e; });
  const CTRL = EQUIP.filter(e => e.type === "ctrl").map(e => e.k);
  const REGION = {};
  COUNTRIES.forEach(c => { REGION[c[0]] = c[3]; });

  /* ---------- Ημερομηνίες (μετρημένες σε «αύξοντα μήνα» = έτος*12 + μήνας) ---------- */
  function monthIndex(d) { return d.getFullYear() * 12 + d.getMonth() + 1; }
  // Επόμενη εμφάνιση του διαστήματος μηνών [s, e] (επιτρέπεται e < s, π.χ. Νοε→Μαρ)
  function nextWindow(m, now) {
    const s = m[0], e = m[1] >= m[0] ? m[1] : m[1] + 12;
    const cur = monthIndex(now);
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
      const a = y * 12 + s, b = y * 12 + e;
      if (b >= cur) return { a: a, b: b, live: a <= cur, months: Math.max(0, a - cur) };
    }
    return null;
  }
  function timeline(c, now) {
    return c.events.map(ev => Object.assign({ ev: ev }, nextWindow(ev.m, now))).sort((x, y) => x.a - y.a);
  }
  // Πρώτη φάση (είσοδος) της επόμενης διοργάνωσης· οι υπόλοιπες θέλουν πρόκριση
  function entry(c, now) { return Object.assign({ ev: c.events[0] }, nextWindow(c.events[0].m, now)); }
  // Οι φάσεις της σεζόν που ξεκινά με την επόμενη φάση εισόδου (π.χ. εθνικοί → διεθνής τελικός)
  function season(c, now) {
    const st = entry(c, now), cur = monthIndex(now);
    const at = { getFullYear: () => Math.floor((st.a - 1) / 12), getMonth: () => (st.a - 1) % 12 };
    return timeline(c, at).map(w => Object.assign(w, { live: w.a <= cur && cur <= w.b, months: Math.max(0, w.a - cur) }));
  }
  function regOpen(c, now) { const w = nextWindow(c.reg, now); return !!(w && w.live); }

  /* ---------- Γεωγραφία ---------- */
  function inCountry(c, country) {
    if (!country) return false;
    if (c.only) return c.only.indexOf(country) >= 0;
    return (c.natIn || []).indexOf(country) >= 0 || c.host === country;
  }
  function travelPerPerson(c, country) {
    if (c.host) return REGION[c.host] && REGION[c.host] === REGION[country] ? 400 : 1200;
    return 700;                                  // άγνωστος τόπος: μέση εκτίμηση
  }

  /* ---------- Έλεγχος μίας κατηγορίας ---------- */
  function checkCat(c, cat, team, now) {
    const out = [];
    const add = (s, k, p) => out.push({ s: s, k: k, p: p || {} });
    const country = team.country;

    // Χώρα (διαγωνισμοί μόνο για συγκεκριμένες χώρες)
    if (c.only && c.only.indexOf(country) < 0) add(FAIL, "k_only_fail", { countries: c.only });

    // Ηλικίες: όλοι οι μαθητές μέσα στο όριο
    const a0 = cat.age[0], a1 = cat.age[1];
    if (team.ageMin >= a0 && team.ageMax <= a1) add(OK, "k_age_ok", { a: team.ageMin, b: team.ageMax, c: a0, d: a1 >= 99 ? "∞" : a1 });
    else if (team.ageMax < a0 || team.ageMin > a1) add(FAIL, "k_age_fail", { a: team.ageMin, b: team.ageMax, c: a0, d: a1 });
    else add(WARN, "k_age_part", { c: a0, d: a1 });

    // Μέλη
    const t0 = cat.team[0], t1 = cat.team[1], n = team.students;
    if (n < t0) add(FAIL, "k_team_few", { a: t0, n: n });
    else if (n > t1) {
      const k = Math.ceil(n / t1);
      if (k * t0 <= n) add(INFO, "k_team_split", { b: t1, k: k, n: n });
      else add(WARN, "k_team_over", { b: t1, n: n });
    } else add(OK, "k_team_ok", { n: n, a: t0, b: t1 });

    // Εξοπλισμός
    let hwCost = 0, missing = [];
    if (cat.hw === "none") add(OK, "k_hw_given");
    else {
      const need = cat.hw === "any" ? CTRL : cat.hw;
      const have = need.filter(k => team.hw.indexOf(k) >= 0);
      if (have.length) add(OK, "k_hw_ok", { hw: have });
      else {
        missing = need.slice().sort((x, y) => EQ[x].price[0] - EQ[y].price[0]);
        hwCost = EQ[missing[0]].price[0];
        const room = Math.max(0, team.budget - c.cost[0]);
        add(hwCost <= room ? WARN : FAIL, "k_hw_miss", { hw: cat.hw === "any" ? [missing[0]] : need, any: cat.hw === "any", e: hwCost });
      }
    }
    const recMissing = (cat.rec || []).filter(k => team.hw.indexOf(k) < 0);
    if (recMissing.length) add(INFO, "k_rec", { hw: recMissing });

    // Προπονητής / σχολείο / εθνική επιλογή
    if (c.coach) add(team.coach ? OK : FAIL, team.coach ? "k_coach_ok" : "k_coach_fail");
    if (c.school) add(team.school ? OK : FAIL, team.school ? "k_school_ok" : "k_school_fail");
    if (c.nat === "select") add(WARN, "k_select");

    // Μετακίνηση
    const tl = season(c, now);
    const canTravel = { local: 0, national: 1, intl: 2 }[team.travel] || 0;
    let travelCost = 0;
    const people = Math.min(n, t1) + 1;
    const home = inCountry(c, country);
    if (c.nat === "none") {
      if (c.host && c.host === country) add(canTravel >= 1 ? OK : WARN, canTravel >= 1 ? "k_host_home" : "k_nat_far");
      else if (canTravel >= 2) { add(OK, "k_abroad_ok"); travelCost = people * travelPerPerson(c, country); }
      else add(FAIL, "k_abroad_fail");
    } else if (c.nat === "select") {
      // η εθνική ομάδα ταξιδεύει με την υποστήριξη του εθνικού φορέα
      if (canTravel < 2) add(WARN, "k_abroad_fail");
    } else if (home) {
      add(canTravel >= 1 ? OK : WARN, canTravel >= 1 ? "k_nat_ok" : "k_nat_far");
      if (tl.some(x => x.ev.intl)) add(INFO, "k_intl_final");
    } else if (!c.only) {
      // "wide" χωρίς επιβεβαιωμένη εθνική φάση στη χώρα της ομάδας
      if (canTravel >= 2) { add(WARN, "k_nat_unknown"); travelCost = people * travelPerPerson(c, country); }
      else add(WARN, "k_nat_unknown");
    }

    // Κόστος
    const total = c.cost[0] + hwCost + travelCost;
    if (team.budget >= total) add(OK, "k_budget_ok", { b: team.budget, e: total });
    else add(team.budget >= total * 0.6 ? WARN : FAIL, "k_budget_low", { b: team.budget, e: total, t: travelCost });

    // Εμπειρία
    if (team.lvl >= c.lvl) add(OK, "k_lvl_ok", { l: c.lvl });
    else add(WARN, "k_lvl_low", { l: c.lvl });

    // Χρόνος προετοιμασίας μέχρι τη φάση εισόδου
    const first = entry(c, now);
    if (!first.live && first.months >= c.prep) add(OK, "k_prep_ok", { m: first.months, ev: first.ev, p: c.prep });
    else add(INFO, "k_prep_next", { ev: first.ev, w: first, p: c.prep, next: { a: first.a + 12, b: first.b + 12 } });

    const status = out.reduce((m, x) => x.s === INFO ? m : Math.max(m, x.s), OK);
    const issues = out.filter(x => x.s === WARN || x.s === FAIL).length;
    return { cat: cat, status: status, issues: issues, checks: out, total: total, missing: missing, travel: travelCost };
  }

  function evaluate(c, team, now) {
    const all = c.cats.map(cat => checkCat(c, cat, team, now))
      .sort((a, b) => a.status - b.status || a.issues - b.issues || a.total - b.total);
    return { best: all[0], all: all };
  }

  // Ποιος εξοπλισμός «ανοίγει» τους περισσότερους διαγωνισμούς για την ομάδα
  function shopping(team, now) {
    const hwBlocked = b => b.status === FAIL || b.checks.some(x => x.k === "k_hw_miss");
    const base = {};
    COMPS.forEach(c => { base[c.id] = evaluate(c, team, now).best; });
    return EQUIP.filter(e => team.hw.indexOf(e.k) < 0).map(e => {
      const t2 = Object.assign({}, team, { hw: team.hw.concat(e.k) });
      // «Ανοίγει» έναν διαγωνισμό αν πριν τον έκοβε ο εξοπλισμός (ή ήταν ✕) και μετά δεν λείπει εξοπλισμός ούτε είναι ✕
      const gains = COMPS.filter(c => {
        if (!hwBlocked(base[c.id])) return false;
        const ev = evaluate(c, t2, now).best;
        return ev.status < FAIL && ev.checks.every(x => x.k !== "k_hw_miss");
      });
      return { eq: e, comps: gains };
    }).filter(x => x.comps.length).sort((a, b) => b.comps.length - a.comps.length || a.eq.price[0] - b.eq.price[0]);
  }

  // Πόσοι διαγωνισμοί απαιτούν / επιτρέπουν κάθε εξοπλισμό
  function usage(k) {
    const req = [], any = [], rec = [];
    COMPS.forEach(c => c.cats.forEach(cat => {
      const row = { c: c, cat: cat };
      if (Array.isArray(cat.hw) && cat.hw.indexOf(k) >= 0) req.push(row);
      else if (cat.hw === "any" && EQ[k] && EQ[k].type === "ctrl") any.push(row);
      if ((cat.rec || []).indexOf(k) >= 0) rec.push(row);
    }));
    return { req: req, any: any, rec: rec };
  }

  return {
    OK: OK, WARN: WARN, FAIL: FAIL, INFO: INFO,
    nextWindow: nextWindow, timeline: timeline, season: season, entry: entry, regOpen: regOpen, inCountry: inCountry,
    evaluate: evaluate, shopping: shopping, usage: usage, region: k => REGION[k],
  };
}

root.RAEngine = { create: create };
if (typeof module !== "undefined") module.exports = root.RAEngine;
})(typeof window !== "undefined" ? window : globalThis);
