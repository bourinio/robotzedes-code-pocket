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

for (const page of ['index.html', 'admin.html']) {
  const file = path.join(out, page);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('<script src="js/common.js"></script>')) throw new Error(`${page}: δεν βρέθηκε το common.js`);
  fs.writeFileSync(file, html.replace('<script src="js/common.js"></script>', '<script src="js/local-backend.js"></script>\n  <script src="js/common.js"></script>'));
}

fs.writeFileSync(path.join(out, 'ΔΙΑΒΑΣΕ-ΜΕ.txt'), `ΠΡΟΣΒΑΣΙΜΗ ΑΡΤΑ – τοπική έκδοση
================================

1. Κάνε διπλό κλικ στο αρχείο index.html (ανοίγει στον browser).
   Καλύτερα με Chrome, Edge ή Firefox. Χρειάζεται ίντερνετ μόνο για να φαίνεται ο χάρτης.
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

const zip = path.join(root, 'Prosvasimi-Arta.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, 'Prosvasimi-Arta'], { cwd: outBase });
console.log(`Έτοιμο: ${path.relative(process.cwd(), zip)}  (άνοιξε το dist-local/Prosvasimi-Arta/index.html)`);
