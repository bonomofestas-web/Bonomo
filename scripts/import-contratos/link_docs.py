#!/usr/bin/env python3
"""
Fase 2 - vinculo de documentos por CPF (somente leitura).

Regra do usuario: aditivo, comprovante ou qualquer outro documento so e da mesma pessoa do contrato se o CPF
aparece nos DOIS documentos e e igual. Sem CPF no documento, ou CPF diferente = vinculo NAO confirmado
(o documento fica numa lista para decisao humana; nada e anexado sozinho).

Saida (fora do repositorio): docs_vinculo.csv
"""
import csv
import json
import os
import re
import subprocess
import sys

DIR = r"C:\Users\--\Downloads\Contratos_catalogo"
CPF_RE = re.compile(r"(?<!\d)(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{2})(?!\d)")


def text(path):
    r = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


def cpfs(t):
    out = set()
    for m in CPF_RE.finditer(t):
        d = "".join(m.groups())
        if len(set(d)) > 1:
            out.add(d)
    return out


def digits(s):
    return re.sub(r"\D", "", s or "")


def main():
    cat = json.load(open(os.path.join(DIR, "catalogo.json"), encoding="utf-8"))
    inv = {e["event_key"]: e for e in json.load(open(os.path.join(DIR, "inventario.json"), encoding="utf-8"))["events"]}
    vis = json.load(open(os.path.join(DIR, "leitura_visual.json"), encoding="utf-8"))
    root = json.load(open(os.path.join(DIR, "inventario.json"), encoding="utf-8"))["root"]
    rows = []
    for e in cat:
        if e["classe"][0] in "CE":
            continue
        k = e["event_key"]
        v = vis.get(k, {})
        if e["classe"][0] == "D" and not v.get("cpf"):
            continue
        cpf = digits(e["dados"].get("cpf") or v.get("cpf"))
        main_rel = e.get("main_pdf")
        for f in inv[k]["files"]:
            if main_rel and f["rel"] == main_rel:
                continue
            if f["kind"] in ("contrato", "contrato_assinado") and not main_rel:
                continue
            t = text(f["path"])
            found = cpfs(t)
            if not cpf:
                status, motivo = "NAO_CONFIRMADO", "contrato sem CPF lido"
            elif not found:
                status, motivo = "NAO_CONFIRMADO", "documento sem CPF"
            elif cpf in found:
                status, motivo = "CONFIRMADO", "CPF igual nos dois"
            else:
                status, motivo = "CONFLITO", "CPF diferente do contrato"
            rows.append([k, os.path.basename(e["rel_dir"]), f["kind"], f["name"], status, motivo])
    with open(os.path.join(DIR, "docs_vinculo.csv"), "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["event_key", "pasta", "tipo", "arquivo", "vinculo", "motivo"])
        w.writerows(rows)
    from collections import Counter
    print(Counter(r[4] for r in rows))
    print(Counter((r[2], r[4]) for r in rows))


if __name__ == "__main__":
    sys.exit(main())
