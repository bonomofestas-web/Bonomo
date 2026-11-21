#!/usr/bin/env python3
"""
Data de FECHAMENTO dos contratos importados = data de assinatura lida no proprio PDF ("Rio de Janeiro, 12 de agosto de 2026").
Saida (fora do repositorio): Contratos_catalogo\closed_at.json (+ closed_at.sql para o banco LOCAL) e closed_at_sem_data.csv.
Somente leitura dos PDFs. Uso: python -I -X utf8 scripts/import-contratos/extract_closed_at.py
"""
import csv, json, os, re, subprocess, unicodedata
from datetime import date

DIR = r"C:\Users\--\Downloads\Contratos_catalogo"
MES = {m: i + 1 for i, m in enumerate(["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"])}
RE_SIGN = re.compile(r"Rio de Janeiro\s*[,.]?\s*(?:,)?\s*(\d{1,2})\s*(?:de)?\s*([A-Za-zçÇãÃéÉ]+)\s*(?:de)?\s*(\d{4})", re.I)
RE_NUM = re.compile(r"Rio de Janeiro\s*,\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", re.I)
# contratos em papel / escaneados: data lida a olho (manuscrita no alto do contrato)
VISUAL = {"c16d8d8284c6": "2025-11-28", "d11fb78153f9": "2025-12-19", "fe77509296eb": "2026-08-12"}


def strip(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn").lower()


iset = json.load(open(os.path.join(DIR, "import_set.json"), encoding="utf-8"))
files = json.load(open(os.path.join(DIR, "local_files.json"), encoding="utf-8"))
out, missing = {}, []
today = date(2026, 11, 19)
for o in iset:
    k = o["key"]
    if k in VISUAL:
        out[k] = {"date": VISUAL[k], "src": "leitura visual"}
        continue
    path = files.get(o.get("main_id") or "")
    txt = subprocess.run(["pdftotext", "-enc", "UTF-8", "-layout", path, "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout if path else ""
    cands = []
    for m in RE_SIGN.finditer(txt):
        mes = MES.get(strip(m.group(2)))
        if mes:
            try: cands.append(date(int(m.group(3)), mes, int(m.group(1))))
            except ValueError: pass
    for m in RE_NUM.finditer(txt):
        try: cands.append(date(int(m.group(3)), int(m.group(2)), int(m.group(1))))
        except ValueError: pass
    cands = [d for d in cands if date(2023, 1, 1) <= d <= today]
    if cands:
        out[k] = {"date": cands[-1].isoformat(), "src": "assinatura no PDF"}
    else:
        missing.append([k, o["pasta"], o["venue"]])
json.dump(out, open(os.path.join(DIR, "closed_at.json"), "w", encoding="utf-8"), indent=1)
with open(os.path.join(DIR, "closed_at.sql"), "w", encoding="utf-8") as f:
    f.write("BEGIN;\n")
    for k, v in out.items():
        f.write("UPDATE contracts SET closed_at = '%s' WHERE commercial_fields_snapshot->>'importKey' = 'contratos:%s' AND closed_at IS NULL;\n" % (v["date"], k))
    f.write("COMMIT;\n")
with open(os.path.join(DIR, "closed_at_sem_data.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, delimiter=";"); w.writerow(["event_key", "pasta", "casa"]); w.writerows(missing)
from collections import Counter
print("com data:", len(out), "| sem data:", len(missing))
print("por ano:", sorted(Counter(v["date"][:4] for v in out.values()).items()))
print("por mes (2026):", sorted(Counter(v["date"][:7] for v in out.values() if v["date"].startswith("2026")).items()))
