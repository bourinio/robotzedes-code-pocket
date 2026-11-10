import json, csv, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
cat = {'dimosia': 'Δημόσια υπηρεσία', 'ygeia': 'Υγεία', 'politismos': 'Πολιτισμός & αξιοθέατα', 'ekpaideusi': 'Εκπαίδευση', 'estiasi': 'Εστίαση & καφέ',
       'emporio': 'Καταστήματα', 'trapeza': 'Τράπεζες & ΑΤΜ', 'parking': 'Θέση στάθμευσης ΑμεΑ', 'wc': 'Τουαλέτα ΑμεΑ', 'parko': 'Πάρκο & πλατεία',
       'paralia': 'Παραλία', 'allo': 'Άλλο'}
feat = {'rampa': 'Ράμπα', 'isopedo': 'Ισόπεδη είσοδος', 'anelkystiras': 'Ανελκυστήρας', 'wc': 'WC ΑμεΑ'}
src = {'osm': 'OpenStreetMap', 'sap': 'ΣΑΠ Δήμου Αρταίων 2023', 'dimos': 'Ανακοίνωση Δήμου Αρταίων'}
with open(sys.argv[2], 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Όνομα', 'Κατηγορία', 'Προσβασιμότητα', 'Διαθέτει', 'Διεύθυνση / Οικισμός', 'Πλάτος', 'Μήκος', 'Πηγή', 'Σημειώσεις'])
    for p in sorted(d['points'], key=lambda p: (p['source'] != 'sap', p['name'])):
        w.writerow([p['name'], cat.get(p['category'], p['category']), 'Πλήρως' if p['level'] == 'full' else 'Μερικώς',
                    ', '.join(feat.get(x, x) for x in p['features']), p['address'], p['lat'], p['lng'], src[p['source']], p['description'].replace('\n', ' ')])
print('ok')
