#!/usr/bin/env python3
"""
Reanalise dos contratos tratando a MESMA pasta como uma so, mesmo quando o Drive a dividiu em partes (drive-download-...-001/-002),
e lendo tambem os contratos em Word (convertidos para PDF pelo LibreOffice). Somente leitura: NAO grava nada no sistema.

Por pasta de evento (nome igual = mesma pasta):
  - junta os arquivos de todas as partes;
  - converte cada .doc/.docx para PDF (cache em --conv) e le o texto com pdftotext;
  - classifica cada documento (contrato assinado, minuta/proposta, aditivo, comprovante, escaneado...);
  - extrai os campos de TODAS as versoes do contrato (reaproveita parse_contract do extract.py) e escolhe a versao de referencia:
    assinada > a que bate com o nome da pasta > a sem campos em branco > a mais recente.

Os dados (CPF, endereco, telefone) ficam FORA do repositorio: --out (padrao C:\\Users\\--\\Downloads\\Contratos_catalogo\\reanalise).

Uso: python scripts/import-contratos/reanalise_pastas_unidas.py [--todas] [--sem-converter] [--so-converter]
"""
import argparse
import collections
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract as ex  # noqa: E402  (reaproveita parse_contract, validate, money...)

ROOT = r"C:\Users\--\Downloads\Contratos"
OUT = r"C:\Users\--\Downloads\Contratos_catalogo\reanalise"
CONV = r"C:\Users\--\Downloads\Contratos_convertidos"
SOFFICE_CANDIDATES = [r"C:\Program Files\LibreOffice\program\soffice.exe", r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"]

DATE_RE = re.compile(r"^(20\d{2})[-. ]+(\d{1,2}|XX)[-. ]+(\d{1,2}|XX)", re.I)
STATUS_RE = re.compile(r"^\s*(?:==\s*)?(REALIZADO|CANCELADO|CANCELAR|ADIADO|REMARCADO|DISTRATO|TRANSFERIDO|PERDIDO|EM\s+NEGOCIA\S*)\s*(?:=\s*=|==|=)?\s*[-:]*\s*", re.I)
WORD_EXT = {".doc", ".docx"}
PKGS = ("BLACK", "GOLD", "SILVER", "TURBO", "PLATINUM", "DIAMOND", "BRONZE")
NAO_CONTRATO = ("aditivo", "comprov", "terceiriz", "ficha", "mapa", "aprovad", "balan", "quita", "inspir", "bolo", "decor", "cardapio",
                "sabor", "orcamento", "projeto", "convidado extra", "planta", "boleto", "extrato", "pix", "recibo")


def strip_status(n):
    m = STATUS_RE.match(n)
    return (m.group(1).lower(), n[m.end():]) if m else (None, n)


def key_of(name):
    return re.sub(r"[^a-z0-9]+", "", ex.strip_acc(name).lower())


def sha8(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:10]


def folder_info(name):
    status, base = strip_status(name)
    m = DATE_RE.match(base)
    info = {"status": status, "date": None, "date_unknown": False, "guests": None, "package": None}
    if m:
        if "X" in (m.group(2) + m.group(3)).upper():
            info["date_unknown"] = True
        else:
            try:
                info["date"] = date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
            except ValueError:
                pass
    g = re.search(r"(\d{2,3})\s*P\b", base, re.I)
    if g:
        info["guests"] = int(g.group(1))
    up = base.upper()
    for p in PKGS:
        if p in up:
            info["package"] = p.title()
            break
    return info


def nearest_event_dir(path):
    rel = os.path.relpath(os.path.dirname(path), ROOT).split(os.sep)
    for i in range(len(rel), 0, -1):
        if DATE_RE.match(strip_status(rel[i - 1])[1]):
            return os.path.join(ROOT, *rel[:i])
    return None


def collect():
    groups = collections.OrderedDict()
    for dp, dn, fn in os.walk(ROOT):
        base = os.path.basename(dp)
        if DATE_RE.match(strip_status(base)[1]):
            g = groups.setdefault(key_of(base), {"nomes": set(), "dirs": set(), "files": []})
            g["nomes"].add(base)
            g["dirs"].add(dp)
        for f in fn:
            p = os.path.join(dp, f)
            ev = nearest_event_dir(p)
            if not ev:
                continue
            g = groups.setdefault(key_of(os.path.basename(ev)), {"nomes": set(), "dirs": set(), "files": []})
            g["nomes"].add(os.path.basename(ev))
            g["dirs"].add(ev)
            g["files"].append(p)
    return groups


def part_of(path):
    rel = os.path.relpath(path, ROOT).split(os.sep)
    m = re.search(r"-(\d{3})$", rel[0])
    return (m.group(1) if m else rel[0][-6:])


def find_soffice():
    for c in SOFFICE_CANDIDATES:
        if os.path.exists(c):
            return c
    return shutil.which("soffice")


def convert_words(groups, in_scope, force=False):
    """Converte cada Word das pastas em escopo para PDF (cache em CONV). Devolve {caminho_word: caminho_pdf|None}."""
    soffice = find_soffice()
    if not soffice:
        print("LibreOffice nao encontrado: Word nao sera lido.")
        return {}
    profile = "file:///" + os.path.join(os.environ.get("TEMP", r"C:\Temp"), "lo_profile_contratos").replace("\\", "/")
    result = {}
    todo = [(k, g) for k, g in groups.items() if k in in_scope]
    total_words = sum(1 for k, g in todo for p in g["files"] if os.path.splitext(p)[1].lower() in WORD_EXT and not os.path.basename(p).startswith("~$"))
    done = 0
    t0 = datetime.now()
    for k, g in todo:
        words = [p for p in g["files"] if os.path.splitext(p)[1].lower() in WORD_EXT and not os.path.basename(p).startswith("~$")]
        if not words:
            continue
        dest = os.path.join(CONV, k[:80])
        os.makedirs(dest, exist_ok=True)
        manifest_path = os.path.join(dest, "manifest.json")
        manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else {}
        pend = []
        for p in words:
            tag = sha8(p)
            pdf = os.path.join(dest, f"{tag}.pdf")
            if os.path.exists(pdf) and not force:
                result[p] = pdf
                manifest[p] = pdf
            else:
                pend.append((p, tag, pdf))
        if pend:
            work = os.path.join(dest, "_work")
            shutil.rmtree(work, ignore_errors=True)
            os.makedirs(work, exist_ok=True)
            copies = []
            for p, tag, pdf in pend:
                ext = os.path.splitext(p)[1].lower()
                cp = os.path.join(work, tag + ext)
                shutil.copy2(p, cp)
                copies.append(cp)
            try:
                subprocess.run([soffice, "--headless", "--norestore", "--nolockcheck", f"-env:UserInstallation={profile}",
                                "--convert-to", "pdf", "--outdir", dest] + copies, capture_output=True, timeout=240)
            except Exception as e:  # noqa: BLE001
                print("  falha soffice:", k[:40], type(e).__name__)
            for p, tag, pdf in pend:
                result[p] = pdf if os.path.exists(pdf) else None
                manifest[p] = result[p]
            shutil.rmtree(work, ignore_errors=True)
        json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        done += len(words)
        if done % 20 < len(words):
            el = (datetime.now() - t0).total_seconds()
            print(f"  convertidos {done}/{total_words} ({el:.0f}s)", flush=True)
    return result



def docx_text(path):
    """Texto de um .docx lendo o XML direto (paragrafos e tabelas, na ordem). Sem dependencias."""
    import zipfile
    import xml.etree.ElementTree as ET
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read("word/document.xml")
    except Exception:  # noqa: BLE001
        return ""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return ""
    linhas = []
    for p in root.iter(ns + "p"):
        partes = []
        for el in p.iter():
            if el.tag == ns + "t" and el.text:
                partes.append(el.text)
            elif el.tag == ns + "tab":
                partes.append(chr(9))
        linhas.append("".join(partes))
    return chr(10).join(linhas)

def read_doc(path, origem, texto_path=None, txt=None):
    """Le um PDF (original ou convertido do Word) e devolve o registro do documento."""
    nome = os.path.basename(path)
    rec = {"arquivo": nome, "parte": part_of(path), "origem": origem, "caminho": path, "papel": "outro", "legivel": False,
           "assinado": False, "brancos": 0, "dados": None}
    low = ex.strip_acc(nome).lower()
    try:
        rec["modificado"] = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M")
    except OSError:
        rec["modificado"] = ""
    if txt is None:
        txt = ex.pdf_text(texto_path)
    plain = re.sub(r"\s", "", txt)
    rec["tamanho_texto"] = len(plain)
    if "clicksign" in low or "assinado" in low:
        rec["assinado"] = True
    if re.search(r"clicksign", txt, re.I):
        rec["assinado"] = True
    if "aditivo" in low:
        rec["papel"] = "aditivo"
        return rec
    if len(plain) < 150:
        rec["papel"] = "escaneado" if not any(k in low for k in NAO_CONTRATO) else "outro"
        return rec
    norm = ex.strip_acc(txt).lower()
    eh_contrato = "ajustam" in norm or "contrato de prestacao" in norm
    if "proposta" in low and not eh_contrato:
        rec["papel"] = "proposta"
        return rec
    if not eh_contrato:
        rec["papel"] = "proposta" if "proposta" in norm[:600] else "outro"
        return rec
    rec["papel"] = "contrato"
    rec["legivel"] = True
    rec["brancos"] = len(re.findall(r"_{3,}", txt))
    dados, notes = ex.parse_contract(txt)
    dados.pop("contratante_bloco", None)
    dados["telefone_normalizado"] = ex.fmt_phone(dados.get("telefone")) if dados.get("telefone") else None
    rec["dados"] = dados
    return rec


def score(rec, info):
    d = rec["dados"] or {}
    s = 0
    if info.get("date") and d.get("data_evento") == info["date"]:
        s += 20
    if info.get("guests") and d.get("convidados") == info["guests"]:
        s += 20
    if info.get("package") and (d.get("pacote_texto") or "").lower() == info["package"].lower():
        s += 10
    return s


def main():
    global ROOT, CONV
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=ROOT)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--conv", default=CONV)
    ap.add_argument("--export-date", default="2026-11-19")
    ap.add_argument("--todas", action="store_true", help="inclui pastas de eventos passados")
    ap.add_argument("--sem-converter", action="store_true")
    ap.add_argument("--so-converter", action="store_true")
    ap.add_argument("--force", action="store_true", help="reconverte mesmo com cache")
    args = ap.parse_args()
    ROOT, CONV = args.root, args.conv
    os.makedirs(args.out, exist_ok=True)
    export = date.fromisoformat(args.export_date)

    groups = collect()
    infos = {k: folder_info(sorted(g["nomes"], key=lambda n: (-sum(ord(c) > 127 for c in n), n))[0]) for k, g in groups.items()}
    in_scope = {k for k, i in infos.items() if args.todas or i["date_unknown"] or (i["date"] and date.fromisoformat(i["date"]) >= export)}
    print(f"pastas (nome unico): {len(groups)} | divididas em mais de um lugar: {sum(1 for g in groups.values() if len(g['dirs']) > 1)} | em escopo: {len(in_scope)}")

    conv = {}
    if not args.sem_converter:
        conv = convert_words(groups, in_scope, force=args.force)
        falhas = [p for p, v in conv.items() if v is None]
        print(f"Word convertidos: {sum(1 for v in conv.values() if v)} | falhas: {len(falhas)}")
    if args.so_converter:
        return 0

    out = []
    for k, g in groups.items():
        info = infos[k]
        nome = sorted(g["nomes"], key=lambda n: (-sum(ord(c) > 127 for c in n), n))[0]
        files = sorted(set(g["files"]))
        # remove copias identicas (mesmo conteudo em duas partes)
        vistos, unicos = set(), []
        for p in files:
            try:
                h = sha8(p)
            except OSError:
                continue
            if h in vistos:
                continue
            vistos.add(h)
            unicos.append(p)
        event_keys = sorted({hashlib.sha1(os.path.relpath(d, ROOT).encode("utf-8")).hexdigest()[:12] for d in g["dirs"]})
        rec = {"key": k, "pasta": nome, "partes": sorted({part_of(d) for d in g["dirs"]}), "info": info, "event_keys": event_keys,
               "n_arquivos": len(files), "docs": [], "imagens": 0, "word": 0, "xlsx": 0, "em_escopo": k in in_scope}
        for p in unicos:
            ext = os.path.splitext(p)[1].lower()
            if ext in (".jpg", ".jpeg", ".png", ".heic"):
                rec["imagens"] += 1
            elif ext == ".xlsx":
                rec["xlsx"] += 1
            elif ext == ".pdf":
                if k in in_scope or args.todas:
                    rec["docs"].append(read_doc(p, "PDF", p))
            elif ext in WORD_EXT and not os.path.basename(p).startswith("~$"):
                rec["word"] += 1
                if k in in_scope or args.todas:
                    pdf = conv.get(p)
                    if pdf and os.path.exists(pdf):
                        rec["docs"].append(read_doc(p, "Word convertido", pdf))
                    elif ext == ".docx" and docx_text(p).strip():
                        rec["docs"].append(read_doc(p, "Word (texto direto)", txt=docx_text(p)))
                    else:
                        rec["docs"].append({"arquivo": os.path.basename(p), "parte": part_of(p), "origem": "Word", "caminho": p,
                                            "papel": "word_nao_convertido", "legivel": False, "assinado": False, "brancos": 0,
                                            "dados": None, "modificado": ""})
        contratos = [d for d in rec["docs"] if d["papel"] == "contrato"]
        ref = None
        if contratos:
            contratos.sort(key=lambda d: (d["assinado"], score(d, info), -d["brancos"], d["modificado"]), reverse=True)
            ref = contratos[0]
            ref["referencia"] = True
            iguais = collections.Counter((d["dados"].get("data_evento"), d["dados"].get("convidados"), d["dados"].get("valor_final") or d["dados"].get("valor_por")) for d in contratos)
            rec["versoes_diferentes"] = len(iguais) > 1
            if ref["assinado"]:
                rec["motivo_referencia"] = "versao assinada digitalmente"
            elif len(contratos) > 1 and score(ref, info) > score(contratos[1], info):
                rec["motivo_referencia"] = "bate com o nome da pasta"
            elif len(contratos) > 1 and ref["brancos"] < contratos[1]["brancos"]:
                rec["motivo_referencia"] = "sem campos em branco"
            elif len(contratos) > 1:
                rec["motivo_referencia"] = "versao mais recente"
            else:
                rec["motivo_referencia"] = "unico contrato encontrado"
        rec["status_leitura"] = ("contrato_lido" if ref else ("so_escaneado" if any(d["papel"] == "escaneado" for d in rec["docs"])
                                  else ("word_nao_lido" if any(d["papel"] == "word_nao_convertido" for d in rec["docs"])
                                        else ("so_proposta" if any(d["papel"] == "proposta" for d in rec["docs"]) else "sem_contrato"))))
        # flags finais: so da versao de referencia, comparada com o nome da pasta
        flags = []
        if ref:
            d = ref["dados"]
            flags = ex.validate(d, {"date": info["date"], "guests": info["guests"], "package": info["package"]})
            alt_ok = [x for x in contratos[1:] if score(x, info) >= score(ref, info)]
            rec["flags"] = flags
        else:
            rec["flags"] = []
        rec["aditivos"] = [d["arquivo"] for d in rec["docs"] if d["papel"] == "aditivo"]
        rec["propostas"] = [d["arquivo"] for d in rec["docs"] if d["papel"] == "proposta"]
        out.append(rec)

    path = os.path.join(args.out, "reanalise.json")
    json.dump({"gerado_em": datetime.now().isoformat(timespec="seconds"), "exportacao": args.export_date, "pastas": out},
              open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=list)
    st = collections.Counter(r["status_leitura"] for r in out if r["em_escopo"])
    print("status de leitura (em escopo):", dict(st))
    print("versoes diferentes entre si:", sum(1 for r in out if r.get("versoes_diferentes")))
    print("saida:", path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
