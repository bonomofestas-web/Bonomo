#!/usr/bin/env python3
"""
Fase 1 / passo 1 - INVENTARIO dos contratos (somente leitura).

Agrupa a pasta de contratos por EVENTO (uma pasta = um evento), classifica cada PDF, calcula hash para tirar
duplicatas e marca o que esta fora do escopo (evento passado). NAO grava nada no sistema.

Os DADOS gerados (com CPF e endereco) ficam FORA do repositorio:
  C:\\Users\\--\\Downloads\\Contratos_catalogo\\

Uso:
  python scripts/import-contratos/inventory.py [--root PASTA] [--out PASTA] [--today AAAA-MM-DD]
"""
import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date

DEFAULT_ROOT = r"C:\Users\--\Downloads\Contratos"
DEFAULT_OUT = r"C:\Users\--\Downloads\Contratos_catalogo"

# aceita separadores repetidos ("2027-01- 08") e o prefixo de status da pasta ("== REALIZADO ==", "== CANCELADO ==", "CANCELADO ")
DATE_RE = re.compile(r"^(20\d{2})[-. ]+(\d{1,2}|XX)[-. ]+(\d{1,2}|XX)", re.I)
DATE_RE_LOOSE = DATE_RE
STATUS_RE = re.compile(
    r"^\s*(?:==\s*)?(REALIZADO|CANCELADO|CANCELAR|ADIADO|REMARCADO|DISTRATO|TRANSFERIDO|PERDIDO|EM\s+NEGOCIA\S*)\s*(?:=\s*=|==|=)?\s*[-:]*\s*",
    re.I,
)


def strip_status(name):
    """'== CANCELADO == 2027-01-30 - 15A ...' -> ('cancelado', '2027-01-30 - 15A ...')."""
    m = STATUS_RE.match(name)
    if m:
        return m.group(1).lower(), name[m.end():]
    return None, name
GUESTS_RE = re.compile(r"(\d{2,3})\s*P\b", re.I)
PAREN_RE = re.compile(r"\(([^()]*)\)")

PACKAGES = ("BLACK", "GOLD", "SILVER", "TURBO", "PLATINUM", "DIAMOND", "BRONZE")


def sha256(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def parse_event_folder(name):
    """Le o que o NOME DA PASTA conta (segunda fonte, para cruzar com o contrato)."""
    status, name_wo = strip_status(name)
    m = DATE_RE.match(name_wo)
    out = {"folder_name": name, "folder_status": status, "date": None, "type": None, "package": None, "guests": None,
           "contractor_hint": None, "is_proposal": False, "is_upgrade": False}
    out["date_unknown"] = False
    if m:
        if "X" in (m.group(2) + m.group(3)).upper():
            out["date_unknown"] = True
        else:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            try:
                out["date"] = date(y, mo, d).isoformat()
            except ValueError:
                out["date"] = None
    name = name_wo
    up = name.upper()
    out["is_proposal"] = "PROPOSTA" in up
    out["is_upgrade"] = "UPGRADE" in up or re.search(r"\bUP\b", up) is not None
    g = GUESTS_RE.search(name)
    if g:
        out["guests"] = int(g.group(1))
    for p in PACKAGES:
        if p in up:
            out["package"] = p.title()
            break
    if re.search(r"\b15\s*A\b|\b15\s*ANOS\b", up):
        out["type"] = "15_anos"
    elif "CASAMENTO" in up or "NOIVOS" in up:
        out["type"] = "casamento"
    elif "BODAS" in up:
        out["type"] = "bodas"
    elif re.search(r"\b\d{2}\s*A\b", up) or "ANIVERS" in up:
        out["type"] = "aniversario"
    elif "INFANTIL" in up or "KIDS" in up:
        out["type"] = "infantil"
    elif "FORMATURA" in up:
        out["type"] = "formatura"
    elif "CORPORAT" in up or "CONFRATERN" in up or "EMPRESA" in up:
        out["type"] = "corporativo"
    parens = PAREN_RE.findall(name)
    if parens:
        out["contractor_hint"] = parens[-1].strip() or None
    return out


def classify_pdf(filename):
    n = filename.lower()
    if "proposta" in n:
        return "proposta"
    if "aditivo" in n:
        return "aditivo"
    if "comprov" in n:
        return "comprovante"
    if "terceiriz" in n:
        return "terceirizados"
    if "clicksign" in n:
        return "contrato_assinado"
    if "contrato" in n:
        return "contrato"
    return "outro"


def nearest_event_dir(path, root):
    """Pasta de EVENTO mais proxima do arquivo (nome comeca com data)."""
    rel = os.path.relpath(os.path.dirname(path), root).split(os.sep)
    for i in range(len(rel), 0, -1):
        if DATE_RE.match(strip_status(rel[i - 1])[1]):
            return os.path.join(root, *rel[:i])
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=DEFAULT_ROOT)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--today", default=date.today().isoformat())
    args = ap.parse_args()

    root, out_dir = args.root, args.out
    os.makedirs(out_dir, exist_ok=True)

    events = {}
    orphans = []
    all_event_dirs = set()
    ignored = Counter()
    for dp, dn, fn in os.walk(root):
        base = os.path.basename(dp)
        if DATE_RE.match(strip_status(base)[1]):
            all_event_dirs.add(dp)
        for f in fn:
            full = os.path.join(dp, f)
            ext = os.path.splitext(f)[1].lower()
            if ext != ".pdf":
                ignored[ext or "(sem ext)"] += 1
                continue
            ev = nearest_event_dir(full, root)
            if ev is None:
                ignored["pdf_fora_de_pasta_de_evento"] += 1
                orphans.append(os.path.relpath(full, root))
                continue
            e = events.setdefault(ev, {"event_dir": ev, "files": []})
            e["files"].append(full)

    inv = []
    seen_hash = {}
    for ev_dir, e in events.items():
        info = parse_event_folder(os.path.basename(ev_dir))
        part = os.path.relpath(ev_dir, root).split(os.sep)[0]
        files = []
        for fpath in sorted(e["files"]):
            h = sha256(fpath)
            dup_of = seen_hash.get(h)
            if dup_of is None:
                seen_hash[h] = fpath
            files.append({
                "path": fpath,
                "rel": os.path.relpath(fpath, root),
                "name": os.path.basename(fpath),
                "kind": classify_pdf(os.path.basename(fpath)),
                "sha256": h,
                "size": os.path.getsize(fpath),
                "duplicate_of": dup_of,
            })
        inv.append({
            "event_key": hashlib.sha1(os.path.relpath(ev_dir, root).encode("utf-8")).hexdigest()[:12],
            "event_dir": ev_dir,
            "rel_dir": os.path.relpath(ev_dir, root),
            "part": part,
            "folder": info,
            "files": files,
            "in_scope_by_folder": bool((info["date"] and info["date"] >= args.today) or info["date_unknown"]),
        })

    inv.sort(key=lambda x: (x["folder"]["date"] or "9999", x["rel_dir"]))

    # eventos (pasta) sem nenhum PDF
    no_pdf = sorted(os.path.relpath(d, root) for d in all_event_dirs if d not in events)

    with open(os.path.join(out_dir, "inventario.json"), "w", encoding="utf-8") as f:
        json.dump({"root": root, "today": args.today, "events": inv, "event_dirs_sem_pdf": no_pdf, "pdfs_orfaos": orphans,
                   "arquivos_ignorados_por_extensao": dict(ignored)}, f, ensure_ascii=False, indent=1)

    # resumo
    kinds = Counter(x["kind"] for e in inv for x in e["files"])
    dups = sum(1 for e in inv for x in e["files"] if x["duplicate_of"])
    scope = sum(1 for e in inv if e["in_scope_by_folder"])
    by_year = Counter((e["folder"]["date"] or "sem-data")[:4] for e in inv if e["in_scope_by_folder"])
    print(f"hoje: {args.today}")
    print(f"pastas de evento com PDF: {len(inv)} | sem PDF: {len(no_pdf)}")
    print(f"futuras (pela data da pasta): {scope} | passadas ou sem data: {len(inv) - scope}")
    print(f"PDFs: {sum(len(e['files']) for e in inv)} | duplicados (mesmo hash): {dups}")
    print("tipos de PDF:", dict(kinds))
    print("futuros por ano:", dict(sorted(by_year.items())))
    print("status da pasta:", dict(Counter(e["folder"]["folder_status"] or "(sem status)" for e in inv)))
    print("propostas:", sum(1 for e in inv if e["folder"]["is_proposal"]), "| upgrades:", sum(1 for e in inv if e["folder"]["is_upgrade"]))
    print("PDFs fora de pasta de evento (orfaos):", len(orphans))
    print(f"saida: {os.path.join(out_dir, 'inventario.json')}")


if __name__ == "__main__":
    sys.exit(main())
