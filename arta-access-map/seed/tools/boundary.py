"""Χτίζει το πολύγωνο του Δήμου από relation (outer ways) και ελέγχει σημεία."""
import xml.etree.ElementTree as ET, json, sys
r = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): (float(n.get('lon')), float(n.get('lat'))) for n in r.iter('node')}
ways = {w.get('id'): [x.get('ref') for x in w.iter('nd')] for w in r.iter('way')}
rel = r.find('relation')
segs = [ways[m.get('ref')] for m in rel.iter('member') if m.get('type') == 'way' and m.get('role') in ('outer', '')]
rings = []
while segs:
    ring = segs.pop(0)[:]
    changed = True
    while ring[0] != ring[-1] and changed:
        changed = False
        for i, s in enumerate(segs):
            if s[0] == ring[-1]: ring += s[1:]
            elif s[-1] == ring[-1]: ring += s[::-1][1:]
            elif s[-1] == ring[0]: ring = s[:-1] + ring
            elif s[0] == ring[0]: ring = s[::-1][:-1] + ring
            else: continue
            segs.pop(i); changed = True; break
    rings.append([nodes[n] for n in ring if n in nodes])
def inside(lon, lat):
    c = False
    for ring in rings:
        for i in range(len(ring)):
            x1, y1 = ring[i]; x2, y2 = ring[i - 1]
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1: c = not c
    return c
xs = [p[0] for g in rings for p in g]; ys = [p[1] for g in rings for p in g]
print('rings', len(rings), 'bbox lon', min(xs), max(xs), 'lat', min(ys), max(ys))
json.dump(rings, open(sys.argv[2], 'w'))
pts = json.load(open(sys.argv[3], encoding='utf-8'))['points']
for p in pts:
    if not inside(p['lng'], p['lat']): print('OUTSIDE:', p['externalId'], p['name'], p['lat'], p['lng'])
