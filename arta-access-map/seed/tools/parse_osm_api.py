import xml.etree.ElementTree as ET, glob, json, collections, sys
nodes, ways, rels = {}, {}, {}
for f in sorted(glob.glob('map*.xml')):
    r = ET.parse(f).getroot()
    for n in r.iter('node'):
        nodes[n.get('id')] = dict(lat=float(n.get('lat')), lon=float(n.get('lon')), tags={t.get('k'): t.get('v') for t in n.iter('tag')})
    for w in r.iter('way'):
        ways[w.get('id')] = dict(nds=[x.get('ref') for x in w.iter('nd')], tags={t.get('k'): t.get('v') for t in w.iter('tag')})
print('nodes', len(nodes), 'ways', len(ways))
# center for ways
def center(w):
    pts = [nodes[x] for x in w['nds'] if x in nodes]
    if not pts: return None
    return sum(p['lat'] for p in pts)/len(pts), sum(p['lon'] for p in pts)/len(pts)
KEYS = lambda t: (t.get('wheelchair') in ('yes','limited','designated','no') or t.get('kerb') in ('lowered','flush','raised') or t.get('tactile_paving') in ('yes','no')
    or 'capacity:disabled' in t or t.get('amenity')=='toilets' or t.get('highway')=='elevator' or 'ramp:wheelchair' in t or t.get('parking_space')=='disabled' or 'toilets:wheelchair' in t or 'disabled' in t)
els = []
for i, n in nodes.items():
    if KEYS(n['tags']): els.append({'type':'node','id':int(i),'lat':n['lat'],'lon':n['lon'],'tags':n['tags']})
node_way = collections.defaultdict(list)
for i, w in ways.items():
    for x in w['nds']: node_way[x].append(i)
    if KEYS(w['tags']):
        c = center(w)
        if c: els.append({'type':'way','id':int(i),'center':{'lat':c[0],'lon':c[1]},'tags':w['tags']})
c = collections.Counter()
for e in els:
    t = e['tags']
    for k in ('wheelchair','kerb','tactile_paving'):
        if k in t: c[f'{k}={t[k]}'] += 1
    if t.get('amenity')=='toilets': c['toilets'] += 1
    if 'capacity:disabled' in t: c['capacity:disabled'] += 1
print(c)
json.dump({'elements': els}, open('city.json','w'), ensure_ascii=False)
# unnamed entrances: parent building
for e in els:
    t = e['tags']
    if e['type']=='node' and 'entrance' in t:
        par = [ways[w]['tags'] for w in node_way[str(e['id'])]]
        print('ENTRANCE', e['id'], t, [p.get('name') or p.get('building') or p.get('amenity') for p in par])
for e in els:
    t = e['tags']
    if 'kerb' not in t and 'tactile_paving' not in t or t.get('wheelchair'):
        print(e['type'], e['id'], json.dumps(t, ensure_ascii=False)[:200])
