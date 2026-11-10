"""Ενώνει OpenStreetMap + Σχέδιο Αστικής Προσβασιμότητας (ΣΑΠ) + ανακοινώσεις Δήμου σε seed/arta-points.json."""
import json, re, sys, os
S = sys.argv[1]; OUT = sys.argv[2]
points = []

# ---------- 1. OpenStreetMap ----------
els = {}
for f in ('osm/arta.json', 'osm/city.json'):  # δήμος (Overpass, Ιούν. 2026) + κέντρο (OSM API, σήμερα)
    for e in json.load(open(os.path.join(S, f), encoding='utf-8'))['elements']:
        els[(e['type'], e['id'])] = e
PARENT = {2415029681: 'Σούπερ Μάρκετ Αγγέλης', 3290485320: 'ΑΒ Βασιλόπουλος'}

def category(t):
    a = t.get('amenity'); hw = t.get('highway')
    if a == 'toilets': return 'wc'
    if hw in ('crossing', 'traffic_signals'): return 'diavasi'
    if a in ('hospital', 'clinic', 'doctors', 'pharmacy', 'dentist') or t.get('healthcare'): return 'ygeia'
    if a in ('townhall', 'police', 'post_office', 'courthouse') or t.get('office') == 'government' or 'Ραδιοφων' in t.get('note', ''): return 'dimosia'
    if a in ('school', 'university', 'college', 'kindergarten', 'library'): return 'ekpaideusi'
    if a in ('restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'ice_cream'): return 'estiasi'
    if a in ('bank', 'atm'): return 'trapeza'
    if t.get('leisure') in ('park', 'playground', 'stadium', 'sports_centre', 'fitness_centre') or t.get('place') == 'square': return 'parko'
    if t.get('tourism') in ('museum', 'attraction', 'gallery') or t.get('historic') or a in ('place_of_worship', 'theatre', 'cinema'): return 'politismos'
    if t.get('shop') or 'entrance' in t: return 'emporio'
    return 'allo'

EXCLUDE = {6336710610, 6336712068, 2696973363}  # εκτός Δήμου Αρταίων (Δήμος Ζηρού / δυτικά)
EAST_BANK = {2415029681, 3290485320}            # απέναντι από τον Άραχθο, εκτός ορίων Δήμου Αρταίων
for (typ, i), e in sorted(els.items()):
    if i in EXCLUDE: continue
    t = e.get('tags', {})
    wc = t.get('wheelchair')
    if wc not in ('yes', 'limited', 'designated') and t.get('toilets:wheelchair') != 'yes': continue
    lat = e.get('lat', e.get('center', {}).get('lat')); lon = e.get('lon', e.get('center', {}).get('lon'))
    name = t.get('name:el') or t.get('name')
    if not name:
        if 'entrance' in t: name = PARENT.get(i, 'Προσβάσιμη είσοδος')
        elif t.get('shop') == 'kiosk': name = 'Περίπτερο'
        elif t.get('amenity') == 'parking': name = f"Πάρκινγκ {t['operator']}" if t.get('operator') else 'Χώρος στάθμευσης'
        elif t.get('amenity') == 'toilets': name = 'Δημόσια τουαλέτα ΑμεΑ'
        elif t.get('amenity') == 'fuel': name = 'Πρατήριο καυσίμων'
        else: continue
    if name == 'Παλλας': name = 'Κινηματογράφος Παλλάς'
    if name == 'Σκλαβενίτης': name = 'Σκλαβενίτης (Άρτα)'
    f = []
    if t.get('ramp') == 'yes' or t.get('ramp:wheelchair') == 'yes': f.append('rampa')
    if t.get('automatic_door') == 'yes' or 'entrance' in t: f.append('isopedo')
    if t.get('toilets:wheelchair') == 'yes' or (t.get('amenity') == 'toilets' and wc == 'yes'): f.append('wc')
    if t.get('elevator') == 'yes': f.append('anelkystiras')
    addr = ' '.join(x for x in (t.get('addr:street'), t.get('addr:housenumber')) if x)
    if i in EAST_BANK: addr = 'Ανατολικά του Αράχθου (εκτός ορίων Δήμου Αρταίων)'
    desc = []
    if 'entrance' in t: desc.append('Η κύρια είσοδος είναι προσβάσιμη με αμαξίδιο' + (' (αυτόματη πόρτα).' if t.get('automatic_door') == 'yes' else '.'))
    if t.get('amenity') == 'parking': desc.append('Χώρος στάθμευσης σημειωμένος ως προσβάσιμος με αμαξίδιο.')
    if t.get('amenity') == 'toilets': desc.append('Δωρεάν δημόσια τουαλέτα' + (' με αλλαξιέρα' if t.get('changing_table') == 'yes' else '') + '.')
    if t.get('opening_hours'): desc.append(f"Ωράριο: {t['opening_hours']}")
    if t.get('phone') or t.get('contact:phone'): desc.append(f"Τηλ.: {t.get('phone') or t.get('contact:phone')}")
    desc.append('Πρόσβαση με αμαξίδιο: ' + ('ναι' if wc in ('yes', 'designated') else 'περιορισμένη' if wc == 'limited' else 'WC ΑμεΑ') + ' (OpenStreetMap).')
    points.append(dict(externalId=f'osm:{typ}/{i}', source='osm', name=name, category=category(t),
                       level='partial' if wc == 'limited' else 'full', features=f, lat=round(lat, 6), lng=round(lon, 6),
                       address=addr, description='\n'.join(desc)))

# ---------- 2. ΣΑΠ Δήμου Αρταίων (2023): σημεία με ράμπα που φαίνεται στις φωτογραφίες της μελέτης ----------
import re as _re
kml = open(os.path.join(S, 'arta/sap/kml_out/doc.kml'), encoding='utf-8').read()
loc = {}
for p in _re.findall(r'<Placemark.*?</Placemark>', kml, _re.S):
    n = _re.search(r'<name>(.*?)</name>', p, _re.S).group(1).replace('&amp;', '&')
    code, _, title = n.partition(' - ')
    lon, lat, _ = _re.search(r'<coordinates>\s*(.*?)\s*</coordinates>', p, _re.S).group(1).split(',')
    loc[code.replace(',', '.').strip()] = (title.strip(), float(lat), float(lon))
needs = json.load(open(os.path.join(S, 'arta/sap/needs.json'), encoding='utf-8'))
SAP = {  # κωδικός: (όνομα, κατηγορία, τι δείχνει η φωτογραφία της μελέτης, οικισμός)
    'Δ.Κ._1': ('Δημαρχείο Αρταίων', 'dimosia', 'ράμπα εισόδου στην πρόσοψη και στην πίσω όψη, ράμπα πεζοδρομίου', 'Άρτα'),
    'Δ.Κ._2': None,  # συγχωνεύεται με το σημείο OSM του Αρχαιολογικού Μουσείου
    'Κ.Χ._4': ('Πλατεία Ναπολέοντος Ζέρβα', 'parko', 'ράμπα επί του πεζοδρομίου της οδού Κρυστάλλη (βόρεια πλευρά)', 'Άρτα'),
    'Κ.Χ._5': ('Πλατεία Ταξιαρχών', 'parko', 'ράμπα επικοινωνίας της παιδικής χαράς με το κτίριο του ΚΑΠΗ', 'Άρτα'),
    'Κ.Χ._8': ('Παναγία Παρηγορήτισσα – πλατεία', 'politismos', 'ράμπα εισόδου στον Ιερό Ναό από την οδό Ορλάνδου', 'Άρτα'),
    'Κ.Χ._9': ('Πλατεία Κωστακιών', 'parko', 'ράμπα εισόδου στον προαύλιο χώρο (βορειοανατολικά)', 'Κωστακιοί'),
    'Κ.Χ._12': ('Πλατεία Γραμμενίτσας', 'parko', 'ράμπα εισόδου στην πλατεία (νοτιοανατολικά)', 'Γραμμενίτσα'),
    'Κ.Χ._16': ('Κεντρική πλατεία Ανέζας', 'parko', 'ράμπα εισόδου στην πλατεία (βόρεια πλευρά)', 'Ανέζα'),
    'Κ.Χ._23': ('Πλατεία Ράχης', 'parko', 'ράμπα εισόδου (βόρεια πλευρά)', 'Ράχη'),
    'Κ.Χ._30': ('Πλατεία Αμμοτόπου', 'parko', 'ράμπα εισόδου (βόρεια πλευρά)', 'Αμμότοπος'),
    'Κ.Χ._32': ('Πλατεία Καμπής', 'parko', 'ράμπες εισόδου στη βόρεια και στη νότια πλευρά', 'Καμπή'),
}
def needs_text(code):
    items = [x + ' ραμπών' if x.endswith(' και') else x for x in needs.get(code, [])]
    return ('Η μελέτη προτείνει ακόμη: ' + '; '.join(i[0].lower() + i[1:] for i in items) + '.') if items else ''
for code, v in SAP.items():
    if not v: continue
    name, cat, seen, place = v
    _, lat, lon = loc[code]
    points.append(dict(externalId=f'sap:{code}', source='sap', name=name, category=cat, level='partial', features=['rampa'],
                       lat=round(lat, 6), lng=round(lon, 6), address=place,
                       description=f'Σύμφωνα με το Σχέδιο Αστικής Προσβασιμότητας του Δήμου Αρταίων (2023) υπάρχει {seen}. ' + needs_text(code)))
for p in points:
    if p['externalId'] == 'osm:way/220544987':  # Αρχαιολογικό Μουσείο
        p['level'] = 'partial'; p['features'] = ['rampa']
        p['description'] += '\nΣΑΠ Δήμου Αρταίων (2023): υπάρχει ράμπα εισόδου (νοτιοανατολική όψη). ' + needs_text('Δ.Κ._2')

# ---------- 3. Δήμος Αρταίων: ράμπες ΑμεΑ σε παραλίες Κορωνησίας (ανακοίνωση 13/8/2021) ----------
BEACH = ('Ράμπα με μηχανισμό μετακίνησης ΑμεΑ προς τη θάλασσα (Δήμος Αρταίων, ανακοίνωση 13/8/2021, έργο ΕΣΠΑ). '
         'Εποχική υποδομή: τοποθετείται το καλοκαίρι – επιβεβαιώστε με τον Δήμο ότι λειτουργεί φέτος.')
for eid, name, lat, lng, extra in [
    ('dimos:beach-frachtis', 'Παραλία «Φράχτης» – ράμπα ΑμεΑ', 39.011383, 20.925699, ''),
    ('dimos:beach-salaora', 'Παραλία Σαλαώρας – ράμπα ΑμεΑ', 39.033197, 20.858502, ''),
    ('dimos:beach-piso-koronisia', 'Πίσω παραλία Κορωνησίας – ράμπα ΑμεΑ', 39.017273, 20.913244, ' Η ακριβής θέση της ράμπας στην παραλία δεν είναι γνωστή.'),
]:
    points.append(dict(externalId=eid, source='dimos', name=name, category='paralia', level='partial', features=['rampa'],
                       lat=lat, lng=lng, address='Κορωνησία', description=BEACH + extra))

json.dump({'version': 1, 'generated': '2026-11-10', 'points': points}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(points), Counter(p['source'] for p in points), Counter(p['level'] for p in points))
for p in points: print(f"{p['source']:5} {p['level']:7} {p['category']:10} {p['name']}  [{', '.join(p['features'])}]")
