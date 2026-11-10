'use strict';
// Εισάγει προσβάσιμα σημεία της Άρτας από το OpenStreetMap (Overpass API).
// Χρήση:  npm run import:osm              -> εισάγονται ως εγκεκριμένα
//         npm run import:osm -- --pending  -> μπαίνουν στην ουρά έγκρισης
//         npm run import:osm -- --file data.json  -> από αποθηκευμένη απάντηση Overpass
// Τα δεδομένα OSM διατίθενται με άδεια ODbL – διατηρείται η απόδοση στον χάρτη.
const fs = require('node:fs');
const path = require('node:path');
const { openDb } = require('../src/db');
const { BOUNDS } = require('../src/constants');

const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const bbox = `${BOUNDS.minLat},${BOUNDS.minLng},${BOUNDS.maxLat},${BOUNDS.maxLng}`;
const QUERY = `[out:json][timeout:90];
(
  nwr["wheelchair"~"^(yes|designated|limited)$"](${bbox});
  nwr["toilets:wheelchair"="yes"](${bbox});
  nwr["amenity"="parking_space"]["parking_space"="disabled"](${bbox});
  node["highway"="crossing"]["traffic_signals:sound"="yes"](${bbox});
  node["highway"="traffic_signals"]["traffic_signals:sound"="yes"](${bbox});
);
out center tags;`;

function category(t) {
  const a = t.amenity, s = t.shop, tour = t.tourism, hw = t.highway;
  if (a === 'parking_space' || (a === 'parking' && t['capacity:disabled'])) return 'parking';
  if (a === 'toilets') return 'wc';
  if (hw === 'crossing' || hw === 'traffic_signals') return 'diavasi';
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'].includes(a) || t.healthcare) return 'ygeia';
  if (['townhall', 'police', 'post_office', 'courthouse', 'fire_station', 'social_facility'].includes(a) || t.office === 'government') return 'dimosia';
  if (['school', 'university', 'college', 'kindergarten', 'library'].includes(a)) return 'ekpaideusi';
  if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'ice_cream'].includes(a)) return 'estiasi';
  if (['bank', 'atm'].includes(a)) return 'trapeza';
  if (['bus_station'].includes(a) || t.public_transport || hw === 'bus_stop') return 'metafores';
  if (t.leisure === 'park' || t.place === 'square' || t.leisure === 'playground') return 'parko';
  if (['museum', 'attraction', 'gallery'].includes(tour) || t.historic || a === 'place_of_worship' || a === 'theatre' || a === 'cinema') return 'politismos';
  if (s) return 'emporio';
  return 'allo';
}

const FALLBACK_NAME = {
  parking: 'Θέση στάθμευσης ΑμεΑ', wc: 'Τουαλέτα ΑμεΑ', diavasi: 'Φανάρι με ηχητική σήμανση', trapeza: 'ATM', metafores: 'Στάση λεωφορείου',
};

/** Μετατρέπει ένα στοιχείο Overpass σε σημείο της εφαρμογής (ή null). */
function toPoint(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const cat = category(t);
  const name = t['name:el'] || t.name || FALLBACK_NAME[cat];
  if (!name) return null;

  const features = new Set();
  if (t['toilets:wheelchair'] === 'yes' || (t.amenity === 'toilets' && t.wheelchair === 'yes')) features.add('wc');
  if (t.ramp === 'yes' || t['ramp:wheelchair'] === 'yes') features.add('rampa');
  if (t.elevator === 'yes' || t.lift === 'yes') features.add('anelkystiras');
  if (t.tactile_paving === 'yes') features.add('odigos');
  if (t['traffic_signals:sound'] === 'yes') features.add('ixitiko');
  if (cat === 'parking' || Number(t['capacity:disabled']) > 0) features.add('parking');
  if (t.entrance === 'yes' && t.step_count === '0') features.add('isopedo');

  const level = t.wheelchair === 'limited' ? 'partial' : 'full';
  const address = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const description = t['wheelchair:description:el'] || t['wheelchair:description'] || t.description || '';
  return {
    externalId: `osm:${el.type}/${el.id}`,
    name: String(name).slice(0, 120), category: cat, level, features: [...features],
    lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6,
    address: address.slice(0, 200), description: String(description).slice(0, 2000),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const pending = args.includes('--pending');
  const fileIdx = args.indexOf('--file');
  let data;
  if (fileIdx >= 0) data = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf8'));
  else {
    console.log('Λήψη δεδομένων από το OpenStreetMap…');
    const res = await fetch(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: QUERY }), headers: { 'User-Agent': 'arta-access-map/1.0' } });
    if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
    data = await res.json();
  }

  const db = openDb(path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'arta.db'));
  const upsert = db.prepare(`
    INSERT INTO points (name, description, address, category, level, features, lat, lng, status, source, external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'osm', ?)
    ON CONFLICT(external_id) DO UPDATE SET
      name=excluded.name, address=excluded.address, category=excluded.category, level=excluded.level,
      features=excluded.features, lat=excluded.lat, lng=excluded.lng`);
  let n = 0;
  for (const el of data.elements || []) {
    const p = toPoint(el);
    if (!p) continue;
    upsert.run(p.name, p.description, p.address, p.category, p.level, JSON.stringify(p.features), p.lat, p.lng, pending ? 'pending' : 'approved', p.externalId);
    n++;
  }
  console.log(`Εισήχθησαν/ενημερώθηκαν ${n} σημεία από το OpenStreetMap.`);
}

if (require.main === module) main().catch((e) => { console.error('Αποτυχία εισαγωγής:', e.message); process.exit(1); });
module.exports = { toPoint, category };
