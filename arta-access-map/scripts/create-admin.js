'use strict';
// Χρήση: npm run create-admin -- <email> <κωδικός> ["Όνομα"]
const path = require('node:path');
const { openDb } = require('../src/db');
const { ensureAdmin } = require('../src/auth');

const [email, password, name = 'Διαχειριστής'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Χρήση: npm run create-admin -- <email> <κωδικός (8+ χαρακτήρες)> ["Όνομα"]');
  process.exit(1);
}
const db = openDb(path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'arta.db'));
ensureAdmin(db, email, password, name);
console.log(`Ο λογαριασμός ${email} είναι πλέον διαχειριστής.`);
