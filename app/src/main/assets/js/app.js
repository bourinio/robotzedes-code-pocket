(function () {
"use strict";

/* ---------- Πλατφόρμες ---------- */
const PLATFORMS = [
  { id: "ev3",      name: "LEGO EV3",          em: "🧱", c: "#e8a200", d: "MINDSTORMS EV3 με MicroPython (Pybricks)" },
  { id: "spike",    name: "LEGO SPIKE Prime",  em: "🟨", c: "#f5b400", d: "SPIKE 3 Python: μοτέρ, αισθητήρες, hub" },
  { id: "microbit", name: "micro:bit",         em: "🟩", c: "#00a676", d: "MicroPython & MakeCode: οθόνη, radio, αισθητήρες" },
  { id: "maqueen",  name: "Maqueen",           em: "🚙", c: "#00a0e9", d: "Ρομπότ DFRobot Maqueen με micro:bit" },
  { id: "arduino",  name: "Arduino",           em: "♾️", c: "#00878f", d: "UNO/Nano: αισθητήρες, μοτέρ, ρομπότ" },
  { id: "rccar",    name: "Arduino RC Cars",   em: "🏎️", c: "#f00087", d: "Bluetooth, IR, nRF24 & Wi-Fi αυτοκίνητα" },
  { id: "mbot",     name: "mBot / mBot2",      em: "🤖", c: "#1e88e5", d: "Makeblock mBot (Arduino) & mBot2 (Python)" },
  { id: "esp32",    name: "ESP32",             em: "📶", c: "#e7352c", d: "Wi-Fi & Bluetooth projects" },
  { id: "pico",     name: "Raspberry Pi Pico", em: "🍓", c: "#c51a4a", d: "MicroPython στο Pico / Pico W" },
  { id: "guides",   name: "Οδηγοί & Pinouts",  em: "📘", c: "#0b67b2", d: "Συνδεσμολογίες, θεωρία, συχνά λάθη" },
];
const PMAP = {};
PLATFORMS.forEach(p => { PMAP[p.id] = p; });

const CAT_ICON = {
  "Βασικά": "💡", "Μοτέρ": "⚙️", "Κίνηση": "🚗", "Αισθητήρες": "📡", "Line Follower": "➰",
  "Obstacle Avoidance": "🧱", "Sumo": "🥋", "Αυτοματισμοί": "🤖", "Ήχος": "🔊", "Radio": "📻",
  "Pins & Εξαρτήματα": "🔌", "Παιχνίδια": "🎮", "Τηλεχειρισμός": "🎮", "Servo & Εξαρτήματα": "🦾",
  "Οθόνες": "🖥️", "Bluetooth": "📱", "Υπέρυθρο (IR)": "🔴", "Ραδιοσυχνότητες (nRF24)": "📡",
  "Wi-Fi": "📶", "mBot2 (CyberPi)": "🟦", "Χειριστήρια": "🕹️", "PWM": "〰️", "Pinouts": "📌", "Συνδεσμολογίες": "🔧", "Θεωρία": "📐",
};
const LEVEL = { 1: "Αρχάριο", 2: "Μέσο", 3: "Προχωρημένο" };

/* ---------- Δεδομένα ---------- */
const ALL = (window.SNIPPETS || []).map((s, i) => {
  const variants = s.v ? s.v : [{ l: s.lang || "Code", c: s.code }];
  return Object.assign({}, s, {
    id: s.p + "-" + slug(s.t) + "-" + i,
    key: s.p + "|" + s.t,
    variants: variants,
    langs: variants.map(v => v.l),
    hay: norm([s.t, s.cat, s.hw, s.d, PMAP[s.p] ? PMAP[s.p].name : "", variants.map(v => v.l).join(" ")].join(" ")),
    code: variants.map(v => v.c).join("\n"),
  });
});
const BYID = {};
ALL.forEach(s => { BYID[s.id] = s; });

function slug(t) {
  return norm(t).replace(/[^a-z0-9α-ω]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
// πεζά + χωρίς τόνους, για αναζήτηση
function norm(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ");
}
function esc(t) {
  return String(t).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ---------- Αποθήκευση (ασφαλής) ---------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const favs = new Set(store.get("rz.favs", []));
let recent = store.get("rz.recent", []);
let fontSize = store.get("rz.fs", 12.5);
let theme = store.get("rz.theme", "auto");
const prefs = store.get("rz.prefs", {});   // προτιμώμενη γλώσσα ανά πλατφόρμα

function saveFavs() { store.set("rz.favs", Array.from(favs)); }
function pushRecent(key) {
  recent = [key].concat(recent.filter(k => k !== key)).slice(0, 8);
  store.set("rz.recent", recent);
}
function byKey(key) { return ALL.find(s => s.key === key); }
function applyTheme() {
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
applyTheme();

/* ---------- Syntax highlighting ---------- */
const KW = {
  py: "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print range len int float str abs min max",
  c: "void int long float double bool char byte unsigned const static return if else for while do switch case break continue default true false HIGH LOW INPUT OUTPUT INPUT_PULLUP struct String uint8_t int16_t uint16_t uint32_t new delete class public private this nullptr sizeof PROGMEM",
  js: "let const var function return if else for while do switch case break continue true false new this null undefined of in typeof",
};
const KWSET = {};
Object.keys(KW).forEach(k => { KWSET[k] = new Set(KW[k].split(" ")); });

function langKind(l) {
  l = (l || "").toLowerCase();
  if (l.indexOf("python") >= 0) return "py";
  if (l.indexOf("js") >= 0 || l.indexOf("makecode") >= 0) return "js";
  if (l.indexOf("οδηγ") >= 0) return "txt";
  return "c";
}

function highlight(code, kind) {
  if (kind === "txt") return esc(code);
  const kws = KWSET[kind];
  const com = kind === "py" ? "#[^\\n]*" : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const str = kind === "py"
    ? '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\''
    : 'R"HTML\\([\\s\\S]*?\\)HTML"|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`[\\s\\S]*?`';
  const pre = kind === "c" ? "|^[ \\t]*#\\w+[^\\n]*" : "";
  const re = new RegExp("(" + com + ")|(" + str + ")" + (pre ? "|(" + pre.slice(1) + ")" : "|(\\b\\B)") +
    "|(\\b\\d+(?:\\.\\d+)?(?:UL|L|f)?\\b|\\b0x[0-9a-fA-F]+\\b)|([A-Za-z_]\\w*)(?=\\s*\\()|([A-Za-z_]\\w*)", "gm");
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    if (m.index === re.lastIndex) { re.lastIndex++; continue; }
    out += esc(code.slice(last, m.index));
    const t = m[0];
    if (m[1]) out += '<span class="c">' + esc(t) + "</span>";
    else if (m[2]) out += '<span class="s">' + esc(t) + "</span>";
    else if (m[3]) out += '<span class="p">' + esc(t) + "</span>";
    else if (m[4]) out += '<span class="n">' + esc(t) + "</span>";
    else if (m[5]) out += kws.has(t) ? '<span class="k">' + esc(t) + "</span>" : '<span class="f">' + esc(t) + "</span>";
    else out += kws.has(t) ? '<span class="k">' + esc(t) + "</span>" : esc(t);
    last = m.index + t.length;
  }
  return out + esc(code.slice(last));
}

// Χωρίζει το highlighted HTML σε γραμμές κρατώντας ανοιχτά τα spans
function codeTable(html) {
  const lines = html.split("\n");
  let open = "";
  return "<table>" + lines.map((ln, i) => {
    const start = open;
    const tags = ln.match(/<span class="\w">|<\/span>/g) || [];
    tags.forEach(t => { open = t === "</span>" ? "" : t; });
    return '<tr><td class="ln">' + (i + 1) + "</td><td>" + start + ln + (open ? "</span>" : "") + "</td></tr>";
  }).join("") + "</table>";
}

/* ---------- UI helpers ---------- */
const MAIN = document.getElementById("main");
const Q = document.getElementById("q");
const QX = document.getElementById("qx");
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 1400);
}
function setNav(n) {
  document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("on", b.dataset.nav === n));
}
function go(hash) { location.hash = hash; }
function lvlBadge(l) { return '<span class="lvl lvl' + l + '">' + LEVEL[l] + "</span>"; }
function platStyle(p) { return "--c:" + p.c + ";--cb:" + p.c + "26"; }

function itemHTML(s, showPlat) {
  const p = PMAP[s.p];
  return '<button class="item" style="' + platStyle(p) + '" data-go="#/s/' + s.id + '">' +
    '<div class="ic">' + (CAT_ICON[s.cat] || p.em) + "</div>" +
    '<div class="tx"><h3>' + esc(s.t) + "</h3>" +
    '<div class="mt">' + lvlBadge(s.lvl) + (showPlat ? esc(p.name) + " · " : "") + esc(s.cat) + " · " + esc(s.langs.join(" / ")) + "</div></div>" +
    '<div class="st">' + (favs.has(s.key) ? "★" : "›") + "</div></button>";
}
function listHTML(items, showPlat) {
  if (!items.length) return '<div class="empty">Δεν βρέθηκαν κώδικες.</div>';
  return '<div class="list">' + items.map(s => itemHTML(s, showPlat)).join("") + "</div>";
}

/* ---------- Σελίδες ---------- */
function home() {
  setNav("home");
  const counts = {};
  ALL.forEach(s => { counts[s.p] = (counts[s.p] || 0) + 1; });
  const rec = recent.map(byKey).filter(Boolean).slice(0, 4);
  MAIN.innerHTML =
    '<section class="hero"><h1>Κώδικες εκπαιδευτικής ρομποτικής στην τσέπη σου</h1>' +
    "<p>Έτοιμα, πλήρη προγράμματα για LEGO, micro:bit, Maqueen, mBot, Arduino, ESP32 και Pico. Δουλεύουν χωρίς internet: τα ανοίγεις, τα αντιγράφεις, τα τρέχεις.</p>" +
    '<div class="stats"><span class="stat">' + ALL.length + ' κώδικες</span><span class="stat">' + (PLATFORMS.length - 1) +
    ' πλατφόρμες</span><span class="stat">Python · C++ · MakeCode</span></div></section>' +
    (rec.length ? '<div class="sec"><h2>Πρόσφατα</h2></div>' + listHTML(rec, true) : "") +
    '<div class="sec"><h2>Πλατφόρμες</h2><a href="#/all">Όλοι οι κώδικες ›</a></div>' +
    '<div class="grid">' + PLATFORMS.map(p =>
      '<button class="plat" style="' + platStyle(p) + '" data-go="#/p/' + p.id + '">' +
      '<div class="em">' + p.em + '</div><div class="nm">' + esc(p.name) + '</div><div class="ds">' + esc(p.d) +
      '</div><div class="ct">' + (counts[p.id] || 0) + " " + (p.id === "guides" ? "οδηγοί" : "κώδικες") + " ›</div></button>").join("") +
    "</div>" +
    '<div class="sec"><h2>Διαγωνισμοί</h2><a href="#/comp">Όλοι ›</a></div>' +
    '<button class="item" style="--cb:#f0008726" data-go="#/comp"><div class="ic">🏆</div><div class="tx"><h3>Επερχόμενοι διαγωνισμοί ρομποτικής</h3>' +
    '<div class="mt">WRO, FIRST, VEX, RoboCup Junior και άλλοι · μπορεί να πάει η ομάδα σας;</div></div><div class="st">›</div></button>';
}

function platform(pid, cat, lvl) {
  const p = PMAP[pid];
  if (!p) return home();
  setNav("home");
  const items = ALL.filter(s => s.p === pid);
  const cats = Array.from(new Set(items.map(s => s.cat)));
  const shown = items.filter(s => (!cat || s.cat === cat) && (!lvl || s.lvl === lvl));
  const base = "#/p/" + pid;
  const q = (c, l) => base + "?" + [c ? "c=" + encodeURIComponent(c) : "", l ? "l=" + l : ""].filter(Boolean).join("&");
  MAIN.innerHTML =
    '<div class="head"><button class="back" data-go="#/">← Αρχική</button>' +
    '<div class="title"><span>' + p.em + "</span>" + esc(p.name) + "</div>" +
    '<div class="sub">' + esc(p.d) + " · " + items.length + (pid === "guides" ? " οδηγοί" : " κώδικες") + "</div></div>" +
    '<div class="chips">' +
    '<button class="chip' + (!cat ? " on" : "") + '" data-go="' + q(null, lvl) + '">Όλα</button>' +
    cats.map(c => '<button class="chip' + (c === cat ? " on" : "") + '" data-go="' + q(c, lvl) + '">' +
      (CAT_ICON[c] || "📁") + " " + esc(c) + "</button>").join("") + "</div>" +
    (pid === "guides" ? "" : '<div class="chips">' + [1, 2, 3].map(l =>
      '<button class="chip lv' + (l === lvl ? " on" : "") + '" data-go="' + q(cat, l === lvl ? null : l) + '">' + LEVEL[l] + "</button>").join("") + "</div>") +
    listHTML(shown, false);
}

function snippet(id, vi) {
  const s = BYID[id];
  if (!s) return home();
  const p = PMAP[s.p];
  setNav("");
  pushRecent(s.key);
  if (vi == null) {
    const pref = prefs[s.p];
    vi = Math.max(0, s.langs.indexOf(pref));
  }
  const v = s.variants[vi] || s.variants[0];
  const kind = langKind(v.l);
  MAIN.innerHTML =
    '<div class="head"><button class="back" data-go="#/p/' + p.id + '">← ' + esc(p.name) + "</button>" +
    '<div class="title" style="font-size:20px">' + esc(s.t) + "</div>" +
    '<div class="meta"><span class="pill" style="background:' + p.c + "26;color:" + p.c + '">' + p.em + " " + esc(p.name) + "</span>" +
    '<span class="pill">' + (CAT_ICON[s.cat] || "") + " " + esc(s.cat) + "</span>" + (s.lvl ? '<span class="pill lvl' + s.lvl + '">' + LEVEL[s.lvl] + "</span>" : "") + "</div></div>" +
    (s.d ? '<div class="desc">' + esc(s.d) + "</div>" : "") +
    (s.hw ? '<div class="hw"><b>Υλικό:</b> ' + esc(s.hw) + "</div>" : "") +
    (s.variants.length > 1 ? '<div class="tabs">' + s.variants.map((x, i) =>
      '<button class="tab' + (i === vi ? " on" : "") + '" data-tab="' + i + '">' + esc(x.l) + "</button>").join("") + "</div>" : "") +
    '<div class="codewrap"><div class="codebar"><span>' + esc(v.l) + " · " + v.c.split("\n").length + " γραμμές</span>" +
    '<span class="zoom"><button data-zoom="-1" aria-label="Μικρότερα">A−</button><button data-zoom="1" aria-label="Μεγαλύτερα">A+</button></span></div>' +
    '<div class="code" style="--fs:' + fontSize + 'px">' + codeTable(highlight(v.c, kind)) + "</div></div>" +
    '<div class="actions"><button class="btn pri" data-act="copy">📋 Αντιγραφή</button>' +
    '<button class="btn sec2" data-act="share">↗ Κοινοποίηση</button>' +
    '<button class="btn fav" data-act="fav" aria-label="Αγαπημένο">' + (favs.has(s.key) ? "★" : "☆") + "</button></div>";

  MAIN.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => {
    const i = +b.dataset.tab;
    prefs[s.p] = s.variants[i].l;
    store.set("rz.prefs", prefs);
    snippet(id, i);
  });
  MAIN.querySelectorAll("[data-zoom]").forEach(b => b.onclick = () => {
    fontSize = Math.min(20, Math.max(9, fontSize + (+b.dataset.zoom)));
    store.set("rz.fs", fontSize);
    MAIN.querySelector(".code").style.setProperty("--fs", fontSize + "px");
  });
  MAIN.querySelector('[data-act="copy"]').onclick = () => copyText(v.c);
  MAIN.querySelector('[data-act="share"]').onclick = () => shareText(s.t, v.c);
  MAIN.querySelector('[data-act="fav"]').onclick = (e) => {
    if (favs.has(s.key)) { favs.delete(s.key); toast("Αφαιρέθηκε από τα αγαπημένα"); }
    else { favs.add(s.key); toast("Προστέθηκε στα αγαπημένα ★"); }
    saveFavs();
    e.currentTarget.textContent = favs.has(s.key) ? "★" : "☆";
  };
}

function favorites() {
  setNav("fav");
  const items = ALL.filter(s => favs.has(s.key));
  MAIN.innerHTML = '<div class="head"><div class="title">★ Αγαπημένα</div><div class="sub">Πάτα ☆ σε οποιονδήποτε κώδικα για να τον βάλεις εδώ.</div></div>' +
    (items.length ? listHTML(items, true) : '<div class="empty">Δεν έχεις αγαπημένα ακόμη.</div>');
}

function allCodes(cat) {
  setNav("all");
  const cats = Array.from(new Set(ALL.filter(s => s.p !== "guides").map(s => s.cat))).sort((a, b) => a.localeCompare(b, "el"));
  const items = ALL.filter(s => s.p !== "guides" && (!cat || s.cat === cat));
  MAIN.innerHTML = '<div class="head"><div class="title">Όλοι οι κώδικες</div><div class="sub">Φιλτράρισμα ανά θέμα σε όλες τις πλατφόρμες.</div></div>' +
    '<div class="chips"><button class="chip' + (!cat ? " on" : "") + '" data-go="#/all">Όλα</button>' +
    cats.map(c => '<button class="chip' + (c === cat ? " on" : "") + '" data-go="#/all?c=' + encodeURIComponent(c) + '">' + (CAT_ICON[c] || "📁") + " " + esc(c) + "</button>").join("") +
    "</div>" + listHTML(items, true);
}

function search(q) {
  setNav("");
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const score = s => {
    let sc = 0;
    for (const t of terms) {
      if (s.hay.indexOf(t) >= 0) sc += norm(s.t).indexOf(t) >= 0 ? 3 : 2;
      else if (norm(s.code).indexOf(t) >= 0) sc += 1;
      else return 0;
    }
    return sc;
  };
  const items = ALL.map(s => [score(s), s]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  MAIN.innerHTML = '<div class="head"><div class="title">Αναζήτηση</div><div class="sub">' + items.length + " αποτελέσματα για «" + esc(q) + "»</div></div>" + listHTML(items, true);
}

function tools() {
  setNav("tools");
  MAIN.innerHTML =
    '<div class="head"><div class="title">🧮 Εργαλεία</div><div class="sub">Γρήγοροι υπολογισμοί για την τάξη και το εργαστήριο.</div></div>' +
    '<div class="tool"><h3>Αντίσταση για LED</h3><p>R = (Vπηγής − V_LED) / I</p><div class="row">' +
    '<div class="fld"><label>Τάση πηγής (V)</label><select id="t_vs"><option value="5">5V (Arduino)</option><option value="3.3">3.3V (micro:bit/ESP32/Pico)</option><option value="9">9V</option><option value="12">12V</option></select></div>' +
    '<div class="fld"><label>Χρώμα LED</label><select id="t_vf"><option value="2">Κόκκινο (2.0V)</option><option value="2.1">Κίτρινο (2.1V)</option><option value="2.2">Πράσινο (2.2V)</option><option value="3.1">Μπλε/Άσπρο (3.1V)</option></select></div>' +
    '<div class="fld"><label>Ρεύμα (mA)</label><input id="t_i" type="number" value="15" min="1" max="30"></div></div>' +
    '<div class="out" id="t_r"></div></div>' +
    '<div class="tool"><h3>Μοίρες τροχού για απόσταση</h3><p>Για LEGO (run_for_degrees / run_angle) και encoders.</p><div class="row">' +
    '<div class="fld"><label>Διάμετρος τροχού (cm)</label><input id="w_d" type="number" value="5.6" step="0.1"></div>' +
    '<div class="fld"><label>Απόσταση (cm)</label><input id="w_x" type="number" value="30"></div>' +
    '<div class="fld"><label>Απόσταση τροχών (cm)</label><input id="w_a" type="number" value="11.2" step="0.1"></div>' +
    '<div class="fld"><label>Στροφή (μοίρες)</label><input id="w_t" type="number" value="90"></div></div>' +
    '<div class="out" id="w_r"></div></div>' +
    '<div class="tool"><h3>map() αριθμομηχανή</h3><p>Ίδιο με τη map(value, fromLow, fromHigh, toLow, toHigh) του Arduino.</p><div class="row">' +
    '<div class="fld"><label>Τιμή</label><input id="m_v" type="number" value="512"></div>' +
    '<div class="fld"><label>Από (min / max)</label><input id="m_fr" value="0 1023"></div>' +
    '<div class="fld"><label>Προς (min / max)</label><input id="m_to" value="0 255"></div></div>' +
    '<div class="out" id="m_r"></div></div>' +
    '<div class="tool"><h3>Υπερηχητικός: χρόνος → απόσταση</h3><p>Απόσταση = χρόνος (μs) × 0.0343 / 2</p><div class="row">' +
    '<div class="fld"><label>Χρόνος ηχούς (μs)</label><input id="u_t" type="number" value="1166"></div></div>' +
    '<div class="out" id="u_r"></div></div>';

  const $ = id => document.getElementById(id);
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  function nextStd(r) {
    let dec = 1;
    while (r > 100) { r /= 10; dec *= 10; }
    while (r < 10) { r *= 10; dec /= 10; }
    for (const e of E12) if (e >= r - 1e-9) return e * dec;
    return 100 * dec;
  }
  function fmtOhm(r) { return r >= 1000 ? (r / 1000).toFixed(r % 1000 ? 1 : 0) + "kΩ" : Math.round(r) + "Ω"; }
  function calc() {
    const vs = +$("t_vs").value, vf = +$("t_vf").value, i = +$("t_i").value / 1000;
    if (vs <= vf || !(i > 0)) $("t_r").innerHTML = "Η τάση πηγής πρέπει να είναι μεγαλύτερη από του LED.";
    else {
      const r = (vs - vf) / i;
      $("t_r").innerHTML = "R = " + r.toFixed(0) + "Ω → τυπική: " + fmtOhm(nextStd(r)) + "<small>Ισχύς ≈ " + ((vs - vf) * i * 1000).toFixed(0) + " mW (μια αντίσταση 1/4W αρκεί)</small>";
    }
    const d = +$("w_d").value, x = +$("w_x").value, a = +$("w_a").value, t = +$("w_t").value;
    if (d > 0) {
      const c = Math.PI * d;
      $("w_r").innerHTML = "Ευθεία: " + Math.round(x / c * 360) + "° (" + (x / c).toFixed(2) + " περιστροφές)" +
        "<small>Στροφή επί τόπου " + t + "°: " + Math.round(a / d * t) + "° σε κάθε τροχό (αντίθετες φορές) · περιφέρεια " + c.toFixed(1) + " cm</small>";
    }
    const fr = $("m_fr").value.split(/[\s,\/]+/).map(Number), to = $("m_to").value.split(/[\s,\/]+/).map(Number), v = +$("m_v").value;
    if (fr.length >= 2 && to.length >= 2 && fr[1] !== fr[0]) {
      $("m_r").innerHTML = "= " + Math.trunc((v - fr[0]) * (to[1] - to[0]) / (fr[1] - fr[0]) + to[0]) + "<small>map(" + v + ", " + fr[0] + ", " + fr[1] + ", " + to[0] + ", " + to[1] + ")</small>";
    }
    const ut = +$("u_t").value;
    $("u_r").innerHTML = (ut * 0.0343 / 2).toFixed(1) + " cm";
  }
  MAIN.querySelectorAll("input,select").forEach(el => { el.oninput = calc; el.onchange = calc; });
  calc();
}

function about() {
  setNav("info");
  const label = { auto: "Αυτόματο", light: "Φωτεινό", dark: "Σκοτεινό" };
  MAIN.innerHTML =
    '<div class="head"><div class="title">ⓘ Πληροφορίες</div></div>' +
    '<div class="tool"><h3>Θέμα εμφάνισης</h3><div class="chips" style="margin:0;padding:6px 0 0">' +
    ["auto", "light", "dark"].map(t => '<button class="chip' + (theme === t ? " on" : "") + '" data-theme="' + t + '">' + label[t] + "</button>").join("") +
    "</div></div>" +
    '<div class="about"><b>ROBOTZEDES – Robotics Code Pocket</b><br>' + ALL.length + " πλήρη προγράμματα και οδηγοί για εκπαιδευτική ρομποτική, διαθέσιμα offline." +
    "<ul>" + PLATFORMS.map(p => "<li>" + p.em + " <b>" + esc(p.name) + "</b>: " + ALL.filter(s => s.p === p.id).length + "</li>").join("") + "</ul>" +
    "<b>Πού γράφω τον κώδικα;</b><ul>" +
    "<li>EV3: VS Code + επέκταση «LEGO MINDSTORMS EV3 MicroPython»</li>" +
    "<li>SPIKE Prime: εφαρμογή SPIKE (v3) → νέο έργο Python</li>" +
    "<li>micro:bit & Maqueen: makecode.microbit.org (JavaScript) ή python.microbit.org</li>" +
    "<li>Arduino / ESP32: Arduino IDE 2 (για ESP32 εγκατάστησε «esp32 by Espressif»)</li>" +
    "<li>mBot: Arduino IDE + βιβλιοθήκη Makeblock · mBot2: mBlock 5 (CyberPi, Upload, Python)</li>" +
    "<li>Pico: Thonny με MicroPython firmware</li></ul>" +
    '<span class="sub">LEGO®, MINDSTORMS®, SPIKE™ είναι εμπορικά σήματα του LEGO Group. micro:bit είναι σήμα του Micro:bit Educational Foundation. Η εφαρμογή δεν σχετίζεται με τους κατασκευαστές.</span></div>';
  MAIN.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => {
    theme = b.dataset.theme;
    store.set("rz.theme", theme);
    applyTheme();
    about();
  });
}

/* ---------- Αντιγραφή / Κοινοποίηση ---------- */
function copyText(t) {
  if (window.Android && window.Android.copyText) { window.Android.copyText(t); return; }
  const done = () => toast("Ο κώδικας αντιγράφηκε ✓");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done));
  } else fallbackCopy(t, done);
}
function fallbackCopy(t, done) {
  const a = document.createElement("textarea");
  a.value = t;
  a.style.position = "fixed";
  a.style.opacity = "0";
  document.body.appendChild(a);
  a.select();
  try { document.execCommand("copy"); done(); } catch (e) { toast("Η αντιγραφή απέτυχε"); }
  a.remove();
}
function shareText(title, t) {
  if (window.Android && window.Android.shareText) { window.Android.shareText(title, t); return; }
  if (navigator.share) { navigator.share({ title: title, text: t }).catch(() => {}); return; }
  copyText(t);
}

function openUrl(u) {
  if (window.Android && window.Android.openUrl) { window.Android.openUrl(u); return; }
  window.open(u, "_blank", "noopener");
}

/* ---------- Router ---------- */
const API = { main: MAIN, esc: esc, setNav: setNav, store: store, toast: toast, go: go, openUrl: openUrl };
function route() {
  const h = location.hash || "#/";
  const [path, qs] = h.slice(1).split("?");
  const params = {};
  (qs || "").split("&").filter(Boolean).forEach(kv => {
    const [k, v] = kv.split("=");
    params[k] = decodeURIComponent(v || "");
  });
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "q") { Q.value = ""; QX.style.display = "none"; }
  if (parts[0] === "p") platform(parts[1], params.c || null, params.l ? +params.l : null);
  else if (parts[0] === "s") snippet(decodeURIComponent(parts[1]));
  else if (parts[0] === "fav") favorites();
  else if (parts[0] === "all") allCodes(params.c || null);
  else if (parts[0] === "comp" && window.RZComp) parts[1] ? window.RZComp.detail(API, parts[1]) : window.RZComp.list(API, params.f || "");
  else if (parts[0] === "team" && window.RZComp) window.RZComp.team(API);
  else if (parts[0] === "tools") tools();
  else if (parts[0] === "info") about();
  else if (parts[0] === "q") search(params.q || "");
  else home();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

document.addEventListener("click", e => {
  const el = e.target.closest("[data-go]");
  if (el) { e.preventDefault(); go(el.dataset.go); }
});

let searchTimer;
Q.addEventListener("input", () => {
  QX.style.display = Q.value ? "block" : "none";
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const v = Q.value.trim();
    if (!v) { if ((location.hash || "").indexOf("#/q") === 0) history.back(); return; }
    const target = "#/q?q=" + encodeURIComponent(v);
    if ((location.hash || "").indexOf("#/q") === 0) { history.replaceState(null, "", target); search(v); }
    else go(target);
  }, 180);
});
QX.addEventListener("click", () => { Q.value = ""; QX.style.display = "none"; go("#/"); });

route();
})();
