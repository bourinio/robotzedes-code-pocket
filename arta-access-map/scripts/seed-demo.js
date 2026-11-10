'use strict';
// Προσθέτει λίγα ΔΟΚΙΜΑΣΤΙΚΑ σημεία για να δείτε πώς λειτουργεί ο χάρτης.
// Οι θέσεις είναι κατά προσέγγιση και τα στοιχεία προσβασιμότητας ΔΕΝ είναι επαληθευμένα.
// Διαγράψτε τα από τη σελίδα διαχείρισης πριν τη δημόσια λειτουργία.
const path = require('node:path');
const { openDb } = require('../src/db');

const NOTE = '\n\n[Δοκιμαστικό σημείο – η θέση και τα στοιχεία χρειάζονται επιβεβαίωση]';
const demo = [
  { name: 'Πλατεία Κιλκίς', category: 'parko', level: 'full', features: ['isopedo'], lat: 39.1597, lng: 20.9858, address: 'Κέντρο Άρτας', description: 'Κεντρική πλατεία της πόλης.' },
  { name: 'Παναγία Παρηγορήτισσα', category: 'politismos', level: 'partial', features: [], lat: 39.1588, lng: 20.9873, address: 'Κέντρο Άρτας', description: 'Βυζαντινός ναός – αρχαιολογικός χώρος.' },
  { name: 'Γεφύρι της Άρτας', category: 'politismos', level: 'partial', features: [], lat: 39.1574, lng: 20.9729, address: 'Ποταμός Άραχθος', description: 'Ιστορικό πέτρινο γεφύρι. Ο χώρος γύρω είναι προσβάσιμος, η διάβαση του γεφυριού όχι.' },
  { name: 'Κάστρο της Άρτας', category: 'politismos', level: 'partial', features: [], lat: 39.1635, lng: 20.9838, address: 'Κάστρο', description: 'Βυζαντινό κάστρο.' },
];

const db = openDb(path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'arta.db'));
const ins = db.prepare(`INSERT OR IGNORE INTO points (name, description, address, category, level, features, lat, lng, status, source, external_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'demo', ?)`);
let n = 0;
for (const [i, p] of demo.entries()) {
  n += ins.run(p.name, p.description + NOTE, p.address, p.category, p.level, JSON.stringify(p.features), p.lat, p.lng, `demo:${i}`).changes;
}
console.log(`Προστέθηκαν ${n} δοκιμαστικά σημεία.`);
