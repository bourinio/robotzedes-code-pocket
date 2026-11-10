// Tests της μηχανής: node --test roboatlas/tests
const test = require("node:test");
const assert = require("node:assert");
global.window = global;
require("../web/data/equipment.js");
require("../web/data/competitions.js");
require("../web/data/suppliers.js");
require("../web/js/i18n.js");
const E = require("../web/js/engine.js").create({ competitions: RA_COMPETITIONS, equipment: RA_EQUIPMENT, countries: RA_COUNTRIES });
const NOW = new Date(2026, 10, 10);   // 10 Νοε 2026
const C = id => RA_COMPETITIONS.find(c => c.id === id);
const team = o => Object.assign({ country: "GR", students: 3, ageMin: 12, ageMax: 14, lvl: 1, budget: 700, travel: "national", coach: true, school: true, hw: ["spike"] }, o);

test("επόμενο διάστημα μηνών, και με αναδίπλωση έτους", () => {
  const w = E.nextWindow([5, 6], NOW);
  assert.strictEqual(w.a, 2027 * 12 + 5);
  assert.strictEqual(w.months, 6);
  const live = E.nextWindow([11, 3], NOW);
  assert.ok(live.live);
  assert.strictEqual(live.b, 2027 * 12 + 3);
});

test("η σεζόν ξεκινά από τη φάση εισόδου", () => {
  const s = E.season(C("wro"), NOW);
  assert.strictEqual(s[0].ev, C("wro").events[0]);
  assert.ok(s[1].a > s[0].a);
});

test("ελληνική ομάδα με SPIKE: WRO κατάλληλος", () => {
  assert.strictEqual(E.evaluate(C("wro"), team(), NOW).best.status, E.OK);
});

test("ηλικία εκτός ορίων → ✕", () => {
  assert.strictEqual(E.evaluate(C("fllexp"), team(), NOW).best.status, E.FAIL);
});

test("χωρίς προπονητή → ✕ όπου απαιτείται", () => {
  assert.strictEqual(E.evaluate(C("wro"), team({ coach: false }), NOW).best.status, E.FAIL);
});

test("τοπικός διαγωνισμός άλλης χώρας → ✕", () => {
  const r = E.evaluate(C("ellak"), team({ country: "DE", hw: ["arduino"] }), NOW).best;
  assert.strictEqual(r.status, E.FAIL);
  assert.ok(r.checks.some(x => x.k === "k_only_fail"));
});

test("εξοπλισμός που λείπει: ! αν χωρά στον προϋπολογισμό, ✕ αν όχι", () => {
  const cheap = E.evaluate(C("vexiq"), team({ hw: [], budget: 5000, travel: "intl" }), NOW).best;
  assert.ok(cheap.checks.some(x => x.k === "k_hw_miss" && x.s === E.WARN));
  const poor = E.evaluate(C("vexiq"), team({ hw: [], budget: 100 }), NOW).best;
  assert.ok(poor.checks.some(x => x.k === "k_hw_miss" && x.s === E.FAIL));
});

test("διαγωνισμός μόνο στο εξωτερικό χωρίς δυνατότητα ταξιδιού → ✕", () => {
  assert.strictEqual(E.evaluate(C("robotex"), team({ hw: ["arduino"] }), NOW).best.status, E.FAIL);
  assert.notStrictEqual(E.evaluate(C("robotex"), team({ hw: ["arduino"], travel: "intl", budget: 3000 }), NOW).best.status, E.FAIL);
});

test("πολλοί μαθητές χωρίζονται σε ομάδες χωρίς να αλλάζει η απόφαση", () => {
  const r = E.evaluate(C("wro"), team({ students: 6 }), NOW).best;
  assert.strictEqual(r.status, E.OK);
  assert.ok(r.checks.some(x => x.k === "k_team_split"));
});

test("λίστα αγορών: το mBot ανοίγει το MakeX", () => {
  const s = E.shopping(team({ ageMin: 10, ageMax: 12, travel: "intl", budget: 5000 }), NOW);
  assert.ok(s.some(x => x.eq.k === "mbot" && x.comps.some(c => c.id === "makex")));
});

test("τα δεδομένα αναφέρονται μόνο σε υπαρκτό εξοπλισμό και χώρες", () => {
  const eq = new Set(RA_EQUIPMENT.map(e => e.k)), cc = new Set(RA_COUNTRIES.map(c => c[0]));
  RA_COMPETITIONS.forEach(c => {
    c.cats.forEach(k => [].concat(Array.isArray(k.hw) ? k.hw : [], k.rec || []).forEach(h => assert.ok(eq.has(h), c.id + ":" + h)));
    [].concat(c.natIn || [], c.only || [], c.host ? [c.host] : []).forEach(x => assert.ok(cc.has(x), c.id + ":" + x));
  });
  RA_SUPPLIERS.forEach(s => { assert.ok(cc.has(s.hq), s.id); s.eq.forEach(h => assert.ok(eq.has(h), s.id + ":" + h)); });
});

test("ίδια κλειδιά κειμένων σε ελληνικά και αγγλικά", () => {
  assert.deepStrictEqual(Object.keys(RA_I18N.el).sort(), Object.keys(RA_I18N.en).sort());
});
