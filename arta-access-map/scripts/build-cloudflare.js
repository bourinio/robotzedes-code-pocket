'use strict';
// Φτιάχνει τον φάκελο dist-cloudflare/ και το arta-cloudflare.zip για «Upload assets» στο Cloudflare Pages.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist-cloudflare');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), out, { recursive: true });
const lf = path.dirname(require.resolve('leaflet/dist/leaflet.js'));
for (const f of ['leaflet.js', 'leaflet.css', 'images']) fs.cpSync(path.join(lf, f), path.join(out, 'vendor', 'leaflet', f), { recursive: true });
const seed = fs.readFileSync(path.join(root, 'seed', 'arta-points.json'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'cloudflare', '_worker.js'), 'utf8');
if (!worker.includes('/*__SEED__*/ null')) throw new Error('_worker.js: λείπει το /*__SEED__*/');
fs.writeFileSync(path.join(out, '_worker.js'), worker.replace('/*__SEED__*/ null', JSON.stringify(JSON.parse(seed))));

// Μόνο το API και οι φωτογραφίες περνούν από τον worker· τα υπόλοιπα σερβίρονται στατικά (δωρεάν).
fs.writeFileSync(path.join(out, '_routes.json'), JSON.stringify({ version: 1, include: ['/api/*', '/photos/*'], exclude: [] }, null, 2));
fs.writeFileSync(path.join(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'
`);

const zip = path.join(root, 'arta-cloudflare.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.'], { cwd: out });
console.log(`Έτοιμο: ${path.relative(process.cwd(), zip)}`);
