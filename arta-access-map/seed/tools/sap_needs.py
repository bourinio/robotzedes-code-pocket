import re, sys, json
t = open(sys.argv[1], encoding='utf-8').read()
t = re.sub(r'\n[^\n]*Πίνακας των προτεινόμενων παρεμβάσεων[^\n]*\n[^\n]*Α/Α[^\n]*\n', '\n', t)
t = re.sub(r'\n\s*\d+ από 50\s*\n', '\n', t)
out, cur = {}, []
for line in t.split('\n'):
    m = re.search(r'([ΔΚ][\.,][ΚΧ][\.,]_\d+)\s*$', line.strip())
    b = re.search(r'•\s+(.*)$', line)
    if b: cur.append(b.group(1).strip())
    elif cur and line.strip() and re.match(r'^\s{60,}\S', line) and not m: cur[-1] += ' ' + line.strip()
    if m:
        code = m.group(1).replace(',', '.')
        items = [re.sub(r'\s+', ' ', x).rstrip('.') for x in cur]
        out[code] = items; cur = []
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(out)); print(out.get('Δ.Κ._1')); print(out.get('Κ.Χ._16'))
