import re, sys, collections
txt = open(sys.argv[1], encoding='utf-8').read()
# λεζάντες: "Εικόνα N: ... (Όνομα – Κωδικός θέσης: X)"
txt = re.sub(r'\.{3,}\s*\d*', ' ', txt)
txt = re.sub(r'\n\s*ΔΗΜΟΣ ΑΡΤΑΙΩΝ.*?\n.*?Π1\n', '\n', txt)
caps = re.findall(r'Εικόνα\s+\d+:\s*(.*?Κωδικός\s*\n?\s*θέσης:\s*\n?\s*([ΔΚ][\.,]\s*[ΚΧ][\.,]\s*_\s*\d+))', txt, re.S)
by = collections.OrderedDict()
for full, code in caps:
    code = re.sub(r'\s', '', code).replace(',', '.')
    full = re.sub(r'\s+', ' ', full)
    by.setdefault(code, set()).add(full)
KW = re.compile(r'ράμπ|ανελκυστ|αναβατ|W\.?C|τουαλ|υγιειν|όδευσ|τυφλ|ΑμεΑ|ΑΜΕΑ|στάθμευσ|χειρολισθ|ισόπεδ', re.I)
for code, cs in by.items():
    hits = sorted(c for c in cs if KW.search(c))
    if hits:
        print(code)
        for c in hits: print('   ', c[:200])
print('codes with captions:', len(by))
