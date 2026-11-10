'use strict';
// Φορτώνει τα γνωστά προσβάσιμα σημεία της Άρτας (seed/arta-points.json) στη βάση.
// Τρέχει μία φορά ανά έκδοση του αρχείου: σημεία που ο διαχειριστής έσβησε δεν ξαναεμφανίζονται,
// και σημεία που υπάρχουν ήδη (ίδιο externalId) δεν αντικαθίστανται.
const fs = require('node:fs');
const path = require('node:path');

const SEED_FILE = path.join(__dirname, '..', 'seed', 'arta-points.json');

function loadSeed(file = SEED_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function seedPoints(db, seed = loadSeed()) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get();
  if (row && Number(row.value) >= seed.version) return 0;
  const ins = db.prepare(`INSERT OR IGNORE INTO points
    (name, description, address, category, level, features, lat, lng, status, source, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`);
  let n = 0;
  db.exec('BEGIN');
  try {
    for (const p of seed.points) {
      n += ins.run(p.name, p.description || '', p.address || '', p.category, p.level, JSON.stringify(p.features || []),
        p.lat, p.lng, p.source, p.externalId).changes;
    }
    db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(String(seed.version));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return n;
}

module.exports = { seedPoints, loadSeed, SEED_FILE };
