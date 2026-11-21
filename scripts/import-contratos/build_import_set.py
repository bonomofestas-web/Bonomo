#!/usr/bin/env python3
"""
Monta o conjunto final de importacao (somente leitura): junta catalogo + leitura visual + vinculo de documentos por CPF.

Entradas/saidas FORA do repositorio: C:\\Users\\--\\Downloads\\Contratos_catalogo\\
  import_set.json   eventos que entram (um por contrato)
  fora_do_lote.csv  eventos que NAO entram e por que (o time lanca manualmente ou depende de correcao)
  local_files.json  id -> caminho absoluto (usado so pelo servidor de desenvolvimento para simular o R2)

Regras: so documento com CPF confirmado (igual ao do contrato) e anexado; sem telefone valido ou sem data = fora do lote.
CPF errado NAO bloqueia: entra como esta, com alerta cpf_invalido.
"""
import csv
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import fmt_phone, phone_digits, phone_ok, cpf_ok  # noqa: E402
from payment_info import parse as parse_payment  # noqa: E402

DIR = r"C:\Users\--\Downloads\Contratos_catalogo"


def load(n):
    return json.load(open(os.path.join(DIR, n), encoding="utf-8"))


def short_id(path):
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:16]


def num(x):
    try:
        return float(x) if x not in (None, "") else None
    except (TypeError, ValueError):
        return None


SMALL = {'de', 'da', 'do', 'dos', 'das', 'e'}
MES = {m: i + 1 for i, m in enumerate(['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'])}


def strip_acc(x):
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFD', x or '') if unicodedata.category(c) != 'Mn')


def nice_name(x):
    words = re.sub(r'\s+', ' ', x).strip().lower().split(' ')
    return ' '.join(w if (i and w in SMALL) else w.capitalize() for i, w in enumerate(words))


def honoree_from_ocasiao(oc):
    # 'dos 15 anos da AGATHA', '15 ANOS DE MARIA CLARA', 'dos 15 anos de sua afilhada ANA CAROLLYNE', '... filha ISABELLA - Instagram: @x'
    m = re.search(r'15\s*anos?\s+(.*)$', oc or '', re.I)
    if not m:
        return None
    r = m.group(1)
    r = re.sub(r'^(?:de|da|do)\s+', '', r, flags=re.I)
    r = re.sub(r'^(?:sua|seu)\s+', '', r, flags=re.I)
    r = re.sub(r'^(?:filh[oa]|sobrinh[oa]|neta|neto|afilhad[oa]|enteada|irm[ãa])\s+', '', r, flags=re.I)
    r = re.sub(r'^15\s*A\s+', '', r, flags=re.I)
    r = re.split(r'\s+[-–—]\s+|[.,@(]|\s+Instagram', r)[0]
    r = r.strip()
    return nice_name(r) if len(r) >= 3 else None


def date_br(iso):
    y, m, d = iso.split('-')
    return d + '/' + m + '/' + y


def aditivo_new_dates(path):
    import subprocess
    t = strip_acc(re.sub(r'\s+', ' ', subprocess.run(['pdftotext', '-enc', 'UTF-8', '-layout', path, '-'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout)).lower()
    out = []
    for mm in re.finditer(r'nova data[^0-9]{0,20}(\d{1,2})/(\d{1,2})/(\d{4})', t):
        out.append('%s-%02d-%02d' % (mm.group(3), int(mm.group(2)), int(mm.group(1))))
    for mm in re.finditer(r'nova data de (\d{1,2}) de (\w+) de (\d{4})', t):
        out.append('%s-%02d-%02d' % (mm.group(3), MES.get(mm.group(2), 0), int(mm.group(1))))
    for mm in re.finditer(r'(\d{1,2})/(\d{1,2})/(\d{4}) para (\d{1,2})/(\d{1,2})/(\d{4})', t):
        out.append('%s-%02d-%02d' % (mm.group(6), int(mm.group(5)), int(mm.group(4))))
    return out


def plural(n, um, varios):
    return um if n == 1 else varios


_ctext = {}


def file_text(path):
    import subprocess
    if path not in _ctext:
        _ctext[path] = subprocess.run(['pdftotext', '-enc', 'UTF-8', '-layout', path, '-'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    return _ctext[path]


def is_contract_text(path):
    return 'ajustam o seguinte' in file_text(path).lower()


def is_signed(path, name):
    return 'clicksign' in file_text(path).lower() or 'assinado' in name.lower()


def main():
    cat = load("catalogo.json")
    inv = {e["event_key"]: e for e in load("inventario.json")["events"]}
    root = load("inventario.json")["root"]
    vis = load("leitura_visual.json")
    links = {}
    with open(os.path.join(DIR, "docs_vinculo.csv"), encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            links[(r["event_key"], r["arquivo"])] = r["vinculo"]

    files = {}
    out, fora = [], []

    def reg(path):
        i = short_id(path)
        files[i] = path
        return i

    for e in cat:
        k = e["event_key"]
        pasta = os.path.basename(e["rel_dir"])
        c = e["classe"][0]
        if c == "C":
            fora.append([k, pasta, "cancelado, proposta ou realizado"])
            continue
        if c == "E":
            fora.append([k, pasta, "sem contrato legivel: time lanca manualmente"])
            continue
        d = dict(e["dados"])
        v = vis.get(k, {})
        main_pdf = e.get("main_pdf")
        if c == "D":
            if not v.get("contratante_nome"):
                fora.append([k, pasta, "sem contrato legivel (so documentos de apoio): time lanca manualmente"])
                continue
            d.update({
                "venue": v.get("venue"), "contratante_nome": v["contratante_nome"], "cpf": v.get("cpf"), "telefone": v.get("telefone"),
                "email": v.get("email"), "endereco": v.get("endereco"), "cep": v.get("cep"), "data_evento": v.get("data_evento"),
                "convidados": v.get("convidados"), "homenageado": v.get("homenageado"), "tipo_evento": v.get("tipo_evento"),
                "valor_final": v.get("valor_final"), "valor_de": v.get("valor_de"), "entrada": v.get("entrada"),
                "pacote_texto": (v.get("pacote") or "").split(" ")[0] or None,
            })
            for f in inv[k]["files"]:  # PDF escaneado vira o contrato principal
                if f["kind"] in ("contrato", "contrato_assinado", "outro") and f["name"].lower().startswith(("20", "2027")) and not main_pdf:
                    main_pdf = f["rel"]
            if not main_pdf:
                cand = [f for f in inv[k]["files"] if f["kind"] in ("contrato", "outro")]
                main_pdf = cand[0]["rel"] if cand else None

        phone = fmt_phone(d.get("telefone")) if d.get("telefone") else None
        problems = []
        if not d.get("contratante_nome"):
            problems.append("sem nome do contratante")
        phone_bad = not (phone and phone_ok(phone))
        if phone_bad and not d.get("cpf"):
            problems.append(f"telefone invalido ou ausente ({d.get('telefone')}) e sem CPF")
        if phone_bad:
            phone = (d.get("telefone") or "").strip() or None
        if not d.get("data_evento"):
            problems.append("sem data do evento")
        if problems:
            fora.append([k, pasta, "pendencia para ajuste: " + "; ".join(problems)])
            continue

        alerts = []
        if phone_bad:
            alerts.append("telefone_invalido")
        if not d.get("cpf"):
            alerts.append("cpf_ausente")
        elif not cpf_ok(d["cpf"]):
            alerts.append("cpf_invalido")
        docs = []
        docs_pend = []
        main_id = None
        if main_pdf:
            main_abs = os.path.join(root, main_pdf)
            main_id = reg(main_abs)
        base_contracts = []
        for f in inv[k]["files"]:
            if main_pdf and f["rel"] == main_pdf:
                continue
            # outro texto de contrato na pasta (versao base/crua ou copia): nao entra no sistema; vale o assinado
            if f["kind"] not in ('aditivo', 'comprovante', 'terceirizados', 'proposta') and (f["kind"] in ('contrato', 'contrato_assinado') or is_contract_text(f["path"])):
                base_contracts.append(f["name"])
                continue
            st = links.get((k, f["name"]))
            if st != "CONFIRMADO":
                docs_pend.append({"name": f["name"], "status": st or "NAO_CONFIRMADO"})
                continue
            docs.append({"id": reg(f["path"]), "name": f["name"], "kind": f["kind"]})

        main_abs_p = os.path.join(root, main_pdf) if main_pdf else None
        signed_main = bool(main_abs_p and is_signed(main_abs_p, os.path.basename(main_pdf)))
        extra_pend = []
        if not signed_main and len(base_contracts) >= 1 and c != 'D':
            extra_pend.append('Há ' + str(len(base_contracts) + 1) + ' versões do contrato nesta pasta e nenhuma com assinatura digital identificada. Foi usada "' + os.path.basename(main_pdf) + '". Confirmar qual é a versão final assinada.')
        honoree = d.get('homenageado') or (honoree_from_ocasiao(d.get('ocasiao')) if (d.get('tipo_evento') or '15_anos') == '15_anos' else None)
        if honoree and honoree.isupper():
            honoree = nice_name(honoree)
        event_date = d['data_evento']
        date_fix = None
        news = set()
        for dd in docs:
            if dd['kind'] == 'aditivo':
                news.update(aditivo_new_dates(files[dd['id']]))
        if len(news) == 1 and list(news)[0] != event_date:
            date_fix = {'de': event_date, 'para': list(news)[0], 'origem': 'aditivo confirmado por CPF'}
            event_date = list(news)[0]
        pend = list(extra_pend)
        for fl in e['flags'] + v.get('flags', []):
            if fl.startswith('DATA diverge') and date_fix and event_date == e['folder'].get('date'):
                continue  # resolvido pelo aditivo
            mm = re.match(r'DATA diverge: contrato (\S+) x pasta (\S+)', fl)
            if mm:
                pend.append('Data do contrato (' + date_br(mm.group(1)) + ') diferente da data do nome da pasta (' + date_br(mm.group(2)) + '). Confirmar a data correta.')
                continue
            mm = re.match(r'CONVIDADOS divergem: contrato (\S+) x pasta (\S+)', fl)
            if mm:
                pend.append('Convidados no contrato (' + mm.group(1) + ') diferentes do nome da pasta (' + mm.group(2) + '). Confirmar o número correto.')
                continue
            mm = re.match(r'PACOTE diverge: contrato (\S+) x pasta (\S+)', fl)
            if mm:
                pend.append('Pacote no contrato (' + mm.group(1) + ') diferente do nome da pasta (' + mm.group(2) + '). Confirmar o pacote.')
                continue
            mm = re.match(r'tem (\d+) aditivo', fl)
            if mm:
                n = int(mm.group(1))
                pend.append('Possui ' + str(n) + ' ' + plural(n, 'aditivo', 'aditivos') + ': conferir o que ' + plural(n, 'ele alterou', 'eles alteraram') + ' além da data.' if date_fix else 'Possui ' + str(n) + ' ' + plural(n, 'aditivo', 'aditivos') + ': conferir o que ' + plural(n, 'ele alterou', 'eles alteraram') + '.')
                continue
            if fl.startswith('pasta de UPGRADE'):
                pend.append('A pasta é de upgrade: pode ser aditivo de outro contrato. Confirmar que é um contrato próprio.')
                continue
            if fl.startswith('AVISO sem e-mail'):
                pend.append('Contrato sem e-mail do contratante.')
        if date_fix:
            pend.append('Data alterada por aditivo: de ' + date_br(date_fix['de']) + ' para ' + date_br(date_fix['para']) + ' (já aplicada no contrato). Conferir o aditivo.')
        for dp in docs_pend:
            pend.append(('Documento com CPF diferente do contrato (pode ser orçamento de fornecedor): ' if dp['status'] == 'CONFLITO'
                         else 'Documento sem CPF, vínculo com o contrato não confirmado: ') + dp['name'])
        pay = parse_payment(d)
        out.append({
            "key": k, "pasta": pasta, "venue": d.get("venue"), "name": d["contratante_nome"].strip(), "cpf": d.get("cpf"),
            "phone": phone, "email": d.get("email"), "address": d.get("endereco"), "cep": d.get("cep"),
            "event_date": event_date, "date_fix": date_fix, "guests": d.get("convidados"), "event_type": d.get("tipo_evento") or "15_anos",
            "honoree": honoree, "package": d.get("pacote_texto"),
            "total": num(d.get("valor_final") or d.get("valor_por")), "entry": num(d.get("entrada")), "signal": pay["signal"], "payment_summary": pay["summary"], "payment_plan": pay["plan"], "payment_notes": pay["notes"], "value_from": num(d.get("valor_de")),
            "particularidades": d.get("particularidades_raw") or [], "classe": c, "flags": e["flags"], "alerts": alerts,
            "main_id": main_id, "main_name": os.path.basename(main_pdf) if main_pdf else None, "docs": docs,
            "aditivos": len(e["docs"]["aditivos"]), "assinado": signed_main, "contratos_base_ignorados": base_contracts, "pendencias": pend, "date_in_folder": e["folder"].get("date"),
        })

    # mesmo contrato em duas pastas: mesma casa + data + CPF = um so evento (fica o de classe melhor)
    seen = {}
    for o in sorted(out, key=lambda x: x["classe"]):
        kk = (o["venue"], o["event_date"], re.sub(r"\D", "", o["cpf"] or ""))
        if kk[2] and kk in seen:
            fora.append([o["key"], o["pasta"], f"duplicado de {seen[kk]['pasta']} (mesma casa, data e CPF)"])
            o["_dup"] = True
        else:
            seen[kk] = o
    out = [o for o in out if not o.get("_dup")]

    by_phone = {}
    for o in out:
        ph = re.sub(r'\D', '', o['phone'] or '')[-8:]
        if ph and 'telefone_invalido' not in o['alerts']:
            by_phone.setdefault(ph, []).append(o)
    for ph, lst in by_phone.items():
        cpfs = {re.sub(r'\D', '', x['cpf'] or '') for x in lst}
        if len(lst) > 1 and len(cpfs) > 1:
            for x in lst:
                outros = [y for y in lst if y is not x]
                x['alerts'].append('telefone_compartilhado')
                x['pendencias'].append('O mesmo telefone (' + x['phone'] + ') aparece em outro contrato de pessoa diferente: ' + '; '.join(y['name'] + ' (' + y['pasta'][:40] + ')' for y in outros) + '. Confirmar o WhatsApp correto de cada um.')

    with open(os.path.join(DIR, "import_set.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DIR, "local_files.json"), "w", encoding="utf-8") as f:
        json.dump(files, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DIR, "fora_do_lote.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["event_key", "pasta", "motivo"])
        w.writerows(fora)
    from collections import Counter
    print("entram:", len(out), "| fora:", len(fora))
    print(Counter(r[2].split(":")[0] for r in fora))
    print("por casa:", Counter(o["venue"] for o in out))
    print("alertas:", Counter(a for o in out for a in o["alerts"]))
    print("sem arquivo principal:", sum(1 for o in out if not o["main_id"]))


if __name__ == "__main__":
    sys.exit(main())
