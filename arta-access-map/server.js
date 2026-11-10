'use strict';
const path = require('node:path');
const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const app = createApp({
  dbFile: path.join(DATA_DIR, 'arta.db'),
  uploadDir: path.join(DATA_DIR, 'uploads'),
});

if (!process.env.ADMIN_EMAIL) {
  console.warn('Προσοχή: δεν ορίστηκε ADMIN_EMAIL/ADMIN_PASSWORD. Δημιουργήστε διαχειριστή με: npm run create-admin');
}

app.listen(PORT, () => console.log(`Χάρτης Προσβασιμότητας Άρτας: http://localhost:${PORT}`));
