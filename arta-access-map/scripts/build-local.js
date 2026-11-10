'use strict';
// Φτιάχνει την ΤΟΠΙΚΗ έκδοση (χωρίς server): dist-local/Prosvasimi-Arta/ και Prosvasimi-Arta.zip.
// Ανοίγει με διπλό κλικ στο index.html· τα δεδομένα μένουν στον browser.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { CATEGORIES, FEATURES, LEVELS, BOUNDS, CENTER } = require('../src/constants');
const osm = require('./import-osm');

const root = path.join(__dirname, '..');
const outBase = path.join(root, 'dist-local');
const out = path.join(outBase, 'Prosvasimi-Arta');
fs.rmSync(outBase, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), out, { recursive: true });
const lf = path.dirname(require.resolve('leaflet/dist/leaflet.js'));
for (const f of ['leaflet.js', 'leaflet.css', 'images']) fs.cpSync(path.join(lf, f), path.join(out, 'vendor', 'leaflet', f), { recursive: true });

// Τοπικό «backend» με ενσωματωμένες ρυθμίσεις και κώδικα OpenStreetMap (από τις ίδιες πηγές με τον server)
const config = { categories: CATEGORIES, features: FEATURES, levels: LEVELS, bounds: BOUNDS, center: CENTER };
const osmCode = [
  `const OVERPASS_QUERY = ${JSON.stringify(osm.QUERY)};`,
  `const FALLBACK_NAME = ${JSON.stringify(osm.FALLBACK_NAME)};`,
  osm.category.toString(),
  osm.toPoint.toString(),
].join('\n  ');
let backend = fs.readFileSync(path.join(root, 'local', 'local-backend.js'), 'utf8');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'seed', 'arta-points.json'), 'utf8'));
backend = backend.replace('/*__CONFIG__*/ null', JSON.stringify(config)).replace('/*__SEED__*/ null', JSON.stringify(seed)).replace('/*__OSM__*/', osmCode);
fs.writeFileSync(path.join(out, 'js', 'local-backend.js'), backend);

// Κάθε σελίδα γίνεται ΑΥΤΟΝΟΜΗ: CSS, JavaScript και εικονίδια ενσωματώνονται μέσα στο HTML,
// ώστε να δουλεύει ακόμα κι αν ανοιχτεί μόνο το ένα αρχείο (π.χ. μέσα από το zip).
const read = (rel) => fs.readFileSync(path.join(out, rel), 'utf8');
const dataUri = (rel) => `data:image/png;base64,${fs.readFileSync(path.join(out, rel)).toString('base64')}`;
const safeJs = (js) => js.replace(/<\/script/gi, '<\\/script');
const leafletCss = read('vendor/leaflet/leaflet.css').replace(/url\((images\/[\w@.-]+\.png)\)/g, (_, f) => `url(${dataUri('vendor/leaflet/' + f)})`);
const iconFix = `L.Icon.Default.imagePath = '';
L.Icon.Default.mergeOptions({ iconUrl: '${dataUri('vendor/leaflet/images/marker-icon.png')}',
  iconRetinaUrl: '${dataUri('vendor/leaflet/images/marker-icon-2x.png')}', shadowUrl: '${dataUri('vendor/leaflet/images/marker-shadow.png')}' });`;

const staticPages = {};
for (const page of ['index.html', 'admin.html']) {
  let html = read(page);
  const swaps = [
    ['<link rel="stylesheet" href="vendor/leaflet/leaflet.css">', `<style>${leafletCss}</style>`],
    ['<link rel="stylesheet" href="css/app.css">', `<style>${read('css/app.css')}</style>`],
    ['<script src="vendor/leaflet/leaflet.js"></script>', `<script>${safeJs(read('vendor/leaflet/leaflet.js'))}\n${iconFix}</script>`],
    ['<script src="js/common.js"></script>', `<script>${safeJs(read('js/local-backend.js'))}</script>\n  <script>${safeJs(read('js/common.js'))}</script>`],
    [page === 'index.html' ? '<script src="js/app.js"></script>' : '<script src="js/admin.js"></script>',
      `<script>${safeJs(read(page === 'index.html' ? 'js/app.js' : 'js/admin.js'))}</script>`],
  ];
  for (const [from, to] of swaps) {
    if (!html.includes(from)) throw new Error(`${page}: δεν βρέθηκε ${from}`);
    html = html.replace(from, () => to);
  }
  html = html.replace(/(src|href)="(icons\/[\w.-]+\.png)"/g, (_, attr, f) => `${attr}="${dataUri(f)}"`);
  staticPages[page] = html; // η στατική έκδοση κρατά το manifest (εγκατάσταση στο κινητό)
  html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '');
  if (/<(script|link)[^>]+(src|href)="(js|css|vendor|icons)\//.test(html)) throw new Error(`${page}: έμεινε εξωτερικό αρχείο`);
  fs.writeFileSync(path.join(out, page), html);
}
// Τα ξεχωριστά αρχεία δεν χρειάζονται πια
for (const d of ['js', 'css', 'vendor', 'icons', 'manifest.webmanifest', 'sw.js']) fs.rmSync(path.join(out, d), { recursive: true, force: true });

fs.writeFileSync(path.join(out, 'ΔΙΑΒΑΣΕ-ΜΕ.txt'), `ΠΡΟΣΒΑΣΙΜΗ ΑΡΤΑ – τοπική έκδοση
================================

1. Κάνε «Εξαγωγή όλων» του zip και μετά διπλό κλικ στο index.html (ανοίγει στον browser).
   Καλύτερα με Chrome ή Edge: εκεί οι αλλαγές σου αποθηκεύονται μόνιμα.
   (Σε Firefox/Safari ή σε ιδιωτικό παράθυρο βλέπεις τα σημεία, αλλά οι αλλαγές χάνονται όταν κλείσει.)
   Χρειάζεται ίντερνετ μόνο για να φαίνεται ο χάρτης (δρόμοι).
2. Πάτα «Σύνδεση» → «Νέος λογαριασμός».
   Ο ΠΡΩΤΟΣ λογαριασμός που φτιάχνεται γίνεται ΔΙΑΧΕΙΡΙΣΤΗΣ.
3. Πρόσθεσε σημεία με το «+ Πρόσθεσε σημείο». Ως διαχειριστής τα εγκρίνεις από το κουμπί «Διαχείριση».
4. Στη «Διαχείριση» μπορείς:
   - να φέρεις έτοιμα σημεία από το OpenStreetMap (κάτω κάτω στη σελίδα)
   - να κατεβάσεις «Αντίγραφο ασφαλείας» και να το επαναφέρεις σε άλλον υπολογιστή.

ΠΡΟΣΟΧΗ: Τα δεδομένα αποθηκεύονται ΜΟΝΟ σε αυτόν τον υπολογιστή και σε αυτόν τον browser.
- Άλλοι άνθρωποι δεν βλέπουν τις αλλαγές σου (για αυτό χρειάζεται η online έκδοση).
- Αν σβήσεις τα «δεδομένα ιστότοπων» του browser, χάνονται. Κράτα αντίγραφο ασφαλείας!
- Μην αλλάζεις θέση στον φάκελο μετά, ούτε να ανοίγεις το index.html σε ιδιωτικό παράθυρο.
`);

// Αντίγραφο μόνο των σελίδων για την εφαρμογή Android (android/app → assets)
const androidAssets = path.join(outBase, 'android-assets');
fs.mkdirSync(androidAssets, { recursive: true });
for (const page of ['index.html', 'admin.html']) fs.copyFileSync(path.join(out, page), path.join(androidAssets, page));

const zip = path.join(root, 'Prosvasimi-Arta.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, 'Prosvasimi-Arta'], { cwd: outBase });
console.log(`Έτοιμο: ${path.relative(process.cwd(), zip)}  (άνοιξε το dist-local/Prosvasimi-Arta/index.html)`);

// ---------- ΣΤΑΤΙΚΗ έκδοση για Cloudflare Pages / οποιοδήποτε hosting: ΕΝΑ zip, χωρίς ρυθμίσεις ----------
// Ίδια με την τοπική (τα δεδομένα μένουν στη συσκευή του κάθε χρήστη) + manifest/εικονίδια/service worker
// ώστε να εγκαθίσταται στο κινητό σαν εφαρμογή.
const st = path.join(root, 'dist-static');
fs.rmSync(st, { recursive: true, force: true });
fs.mkdirSync(st, { recursive: true });
for (const [page, html] of Object.entries(staticPages)) fs.writeFileSync(path.join(st, page), html);
fs.cpSync(path.join(root, 'public', 'icons'), path.join(st, 'icons'), { recursive: true });
for (const f of ['manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(root, 'public', f), path.join(st, f));
fs.writeFileSync(path.join(st, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
/sw.js
  Cache-Control: no-cache
`);
const staticZip = path.join(root, 'arta-static.zip');
fs.rmSync(staticZip, { force: true });
execFileSync('zip', ['-qr', staticZip, '.'], { cwd: st });
console.log(`Έτοιμο: ${path.relative(process.cwd(), staticZip)}  (στατική έκδοση: ανέβασμα με ένα zip)`);
