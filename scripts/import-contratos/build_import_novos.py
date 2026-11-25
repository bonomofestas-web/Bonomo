#!/usr/bin/env python3
"""
Monta a carga dos contratos que AINDA NAO estao na producao, a partir da reanalise (pastas unidas + Word convertido), e os
ajustes dos contratos que ja estao la (data por aditivo, aditivos a anexar). Somente leitura: nao grava no sistema.

Regras:
- entram: pastas em escopo com contrato lido (PDF ou Word convertido), inclusive CANCELADAS (entram como contrato cancelado);
  ficam fora: proposta sem assinatura, pasta "realizado" e pasta sem contrato;
- ADITIVO so vale para o contrato se o CPF do aditivo for o mesmo do contrato; ele e anexado e, se muda a data da festa,
  a data final segue a cadeia de aditivos (data do contrato -> ... -> data mais nova);
- aditivo que muda convidados/valor/parcelas NAO altera o contrato sozinho: vira pendencia (convidados: so quando o texto diz "+N").

Saidas (fora do repositorio, em C:\\Users\\--\\Downloads\\Contratos_catalogo\\):
  import_set_novos.json, local_files_novos.json, ajustes_prod.json
Uso: python scripts/import-contratos/build_import_novos.py
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_import_set as bis  # noqa: E402
from extract import cpf_ok, fmt_phone, phone_ok  # noqa: E402
from payment_info import parse as parse_payment  # noqa: E402

DIR = r"C:\Users\--\Downloads\Contratos_catalogo"
BK = sorted(glob.glob(r"C:\Users\--\OneDrive\Documents\Codex Projetos\Bonomo Festas 2\supabase\backups\backup_*"))[-1]
MES = bis.MES
STATUS_FORA = ("realizado", "perdido")
STATUS_CANCELADO = ("cancelado", "cancelar", "distrato")


def sid(path):
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:16]


def conv_map():
    m = {}
    for mf in glob.glob(r"C:\Users\--\Downloads\Contratos_convertidos\*\manifest.json"):
        for k, v in json.load(open(mf, encoding="utf-8")).items():
            if v:
                m[os.path.normpath(k).lower()] = v
    return m


CONV = conv_map()


def pdf_path(doc):
    """Arquivo PDF que representa o documento (o proprio PDF ou o Word convertido)."""
    if doc["origem"] == "PDF":
        return doc["caminho"]
    return CONV.get(os.path.normpath(doc["caminho"]).lower())


def texto(path):
    r = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", path, "-"], capture_output=True)
    return re.sub(r"\s+", " ", r.stdout.decode("utf-8", "ignore")).strip()


def iso(d, m=None, y=None):
    if m is None:
        dd, mm, yy = d.split("/")
        y, m, d = yy, mm, dd
    y = int(y)
    y = y + 2000 if y < 100 else y
    return "%04d-%02d-%02d" % (y, int(m), int(d))


def aditivo_info(t):
    """(pares de data (de, para), convidados extras, mexe em pagamento)."""
    low = bis.strip_acc(t).lower()
    pares = []
    for m in re.finditer(r"data anterior:?\s*(\d{1,2}/\d{1,2}/\d{4}).{0,60}?nova data:?\s*(\d{1,2}/\d{1,2}/\d{4})", low):
        pares.append((iso(m.group(1)), iso(m.group(2))))
    for m in re.finditer(r"\bde\s*(\d{1,2}/\d{1,2}/\d{4})\s*para\s*(\d{1,2}/\d{1,2}/\d{4})", low):
        pares.append((iso(m.group(1)), iso(m.group(2))))
    for m in re.finditer(r"originalmente prevista para o dia\s*(\d{1,2}/\d{1,2}/\d{2,4}).{0,80}?passando para o dia\s*(\d{1,2}/\d{1,2}/\d{2,4})", low):
        pares.append((iso(m.group(1)), iso(m.group(2))))
    for m in re.finditer(r"data de (\d{1,2}) de (\w+) de (\d{4}) para a nova data de (\d{1,2}) de (\w+) de (\d{4})", low):
        if m.group(2) in MES and m.group(5) in MES:
            pares.append((iso(m.group(1), MES[m.group(2)], m.group(3)), iso(m.group(4), MES[m.group(5)], m.group(6))))
    extras = [int(x) for x in re.findall(r"inclusao de (\d{1,3})\s*(?:\([^)]*\)\s*)?convidados extras", low)]
    mexe_pagto = bool(re.search(r"alteracao das parcelas|nova forma de pagamento|diferenca de valor|alteracao do prazo", low))
    return sorted(set(pares)), sum(extras), mexe_pagto


def cadeia(data_contrato, pares):
    """Segue a cadeia de aditivos a partir da data do contrato; sem encaixe, usa a data mais nova que nao e 'de' de ninguem."""
    cur, vistos = data_contrato, set()
    while True:
        nxt = next((p for (d, p) in pares if d == cur and p not in vistos), None)
        if not nxt:
            break
        vistos.add(nxt)
        cur = nxt
    if cur == data_contrato and pares:
        de = {d for d, _ in pares}
        terminais = [p for _, p in pares if p not in de]
        if len(set(terminais)) == 1:
            cur = terminais[0]
    return cur


def cpf_digits(s):
    return re.sub(r"\D", "", s or "")


def aditivos_da_pasta(p, cpf):
    """Aditivos da pasta cujo CPF confere com o do contrato. Prefere PDF assinado, depois PDF, depois Word convertido."""
    grupos = {}
    for d in p["docs"]:
        if d.get("papel") != "aditivo":
            continue
        path = pdf_path(d)
        if not path or not os.path.exists(path):
            continue
        t = texto(path)
        cp = {cpf_digits(x) for x in re.findall(r"\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}", t)}
        if not cpf or cpf_digits(cpf) not in cp:
            grupos.setdefault("_sem_cpf", []).append(d["arquivo"])
            continue
        sig = re.sub(r"\W", "", bis.strip_acc(t).lower())[300:900]
        rank = (0 if d.get("assinado") else 1, 0 if d["origem"] == "PDF" else 1)
        cur = grupos.get(sig)
        if cur is None or rank < cur["rank"]:
            grupos[sig] = {"rank": rank, "doc": d, "path": path, "texto": t}
    sem_cpf = grupos.pop("_sem_cpf", [])
    return list(grupos.values()), sem_cpf


def main():
    pastas = json.load(open(os.path.join(DIR, "reanalise", "reanalise.json"), encoding="utf-8"))["pastas"]
    prod = json.load(open(os.path.join(BK, "contracts.json"), encoding="utf-8"))
    prod_by = {((c["commercial_fields_snapshot"] or {}).get("importKey") or "").replace("contratos:", ""): c for c in prod}
    attached = {}
    for c in prod:
        attached[c["id"]] = {a.get("name") for a in (c.get("attachments") or [])}
    files = {}

    def reg(path):
        i = sid(path)
        files[i] = path
        return i

    novos, fora, ajustes = [], [], []
    for p in pastas:
        if not p["em_escopo"]:
            continue
        info = p["info"]
        contratos = [d for d in p["docs"] if d.get("papel") == "contrato"]
        ref = next((d for d in contratos if d.get("referencia")), None)
        k_prod = next((ek for ek in p["event_keys"] if ek in prod_by), None)

        # ---------------- contratos que JA estao na producao: aditivos e data
        if k_prod:
            c = prod_by[k_prod]
            snap = c.get("client_snapshot") or {}
            ads, sem_cpf = aditivos_da_pasta(p, snap.get("cpf"))
            if not ads and not sem_cpf:
                continue
            pares, extras, pagto = [], 0, False
            for a in ads:
                pr, ex, pg = aditivo_info(a["texto"])
                pares += pr; extras = max(extras, ex); pagto = pagto or pg
            data_atual = (c.get("event_date") or "")[:10] or None
            base = (ref or {}).get("dados", {}).get("data_evento") if ref else None
            data_final = cadeia(base or data_atual or "", sorted(set(pares))) if pares else None
            anexar = []
            for a in ads:
                nome = a["doc"]["arquivo"]
                if nome not in attached[c["id"]]:
                    anexar.append({"id": reg(a["path"]), "name": nome, "kind": "aditivo"})
            ajustes.append({"contract_id": c["id"], "contract_code": c["contract_code"], "pasta": p["pasta"], "data_atual": data_atual, "data_contrato_base": base,
                            "data_final": data_final, "mudar_data": bool(data_final and data_final != data_atual), "convidados_extras": extras,
                            "mexe_pagamento": pagto, "anexar": anexar, "aditivos_sem_cpf_confere": sem_cpf, "pares": pares})
            continue

        # ---------------- pastas que ainda NAO estao na producao
        status = info.get("status")
        nome_up = p["pasta"].upper()
        cancelado = status in STATUS_CANCELADO
        if status in STATUS_FORA:
            fora.append([p["pasta"], "pasta marcada como %s" % status]); continue
        if "PROPOSTA" in nome_up and not any(d.get("assinado") for d in contratos):
            fora.append([p["pasta"], "proposta contratual sem assinatura"]); continue
        if not ref:
            fora.append([p["pasta"], "sem contrato lido (%s)" % p["status_leitura"]]); continue
        d = dict(ref["dados"])
        phone = fmt_phone(d.get("telefone")) if d.get("telefone") else None
        phone_bad = not (phone and phone_ok(phone))
        if phone_bad:
            phone = (d.get("telefone") or "").strip() or None
        problems = []
        if not d.get("contratante_nome"):
            problems.append("sem nome do contratante")
        if phone_bad and not d.get("cpf"):
            problems.append("telefone invalido ou ausente e sem CPF")
        if not d.get("data_evento"):
            problems.append("sem data do evento")
        if problems:
            fora.append([p["pasta"], "pendencia para ajuste: " + "; ".join(problems)]); continue

        alerts = []
        if phone_bad:
            alerts.append("telefone_invalido")
        if not d.get("cpf"):
            alerts.append("cpf_ausente")
        elif not cpf_ok(d["cpf"]):
            alerts.append("cpf_invalido")

        path_main = pdf_path(ref)
        main_id = reg(path_main) if path_main and os.path.exists(path_main) else None
        ads, sem_cpf = aditivos_da_pasta(p, d.get("cpf"))
        pares, extras, pagto = [], 0, False
        docs = []
        for a in ads:
            pr, ex, pg = aditivo_info(a["texto"])
            pares += pr; extras = max(extras, ex); pagto = pagto or pg
            docs.append({"id": reg(a["path"]), "name": a["doc"]["arquivo"], "kind": "aditivo"})
        event_date = d["data_evento"]
        date_fix = None
        final = cadeia(event_date, sorted(set(pares))) if pares else event_date
        if final != event_date:
            date_fix = {"de": event_date, "para": final, "origem": "aditivo confirmado por CPF"}
            event_date = final
        guests = d.get("convidados")
        pend = []
        if extras and guests:
            pend.append("Aditivo inclui %d convidados extras: o contrato passa de %s para %s convidados." % (extras, guests, int(guests) + extras))
            guests = int(guests) + extras
        if pagto:
            pend.append("Aditivo altera parcelas, prazo ou valor de pagamento: conferir com o financeiro (o plano de pagamento não foi alterado automaticamente).")
        if sem_cpf:
            pend.append("Aditivo(s) sem CPF igual ao do contrato (não anexado): " + ", ".join(sem_cpf[:3]))
        if cancelado:
            pend.insert(0, "Pasta marcada como CANCELADA no Drive: contrato registrado como cancelado.")
        if not any(x.get("assinado") for x in contratos):
            pend.append("Nenhuma versão do contrato com assinatura digital identificada. Usado: " + ref["arquivo"])
        if len(contratos) > 1 and p.get("versoes_diferentes"):
            pend.append("Há mais de uma versão do contrato com dados diferentes na pasta: conferir. Usado: " + ref["arquivo"])
        for fl in p.get("flags", []):
            m = re.match(r"DATA diverge: contrato (\S+) x pasta (\S+)", fl)
            if m and not (date_fix and event_date == info.get("date")):
                pend.append("Data do contrato (%s) diferente da data do nome da pasta (%s). Confirmar a data correta." % (bis.date_br(m.group(1)), bis.date_br(m.group(2)))); continue
            m = re.match(r"CONVIDADOS divergem: contrato (\S+) x pasta (\S+)", fl)
            if m and not extras:
                pend.append("Convidados no contrato (%s) diferentes do nome da pasta (%s). Confirmar o número correto." % (m.group(1), m.group(2))); continue
            m = re.match(r"PACOTE diverge: contrato (\S+) x pasta (\S+)", fl)
            if m:
                pend.append("Pacote no contrato (%s) diferente do nome da pasta (%s). Confirmar o pacote." % (m.group(1), m.group(2))); continue
        if date_fix:
            pend.append("Data alterada por aditivo: de %s para %s (já aplicada no contrato). Conferir o aditivo." % (bis.date_br(date_fix["de"]), bis.date_br(date_fix["para"])))
        honoree = d.get("homenageado") or (bis.honoree_from_ocasiao(d.get("ocasiao")) if (d.get("tipo_evento") or "15_anos") == "15_anos" else None)
        if honoree and honoree.isupper():
            honoree = bis.nice_name(honoree)
        pay = parse_payment(d)
        novos.append({
            "key": p["event_keys"][0], "pasta": p["pasta"], "venue": d.get("venue"), "name": d["contratante_nome"].strip(), "cpf": d.get("cpf"),
            "phone": phone, "email": d.get("email"), "address": d.get("endereco"), "cep": d.get("cep"), "event_date": event_date, "date_fix": date_fix,
            "guests": guests, "event_type": d.get("tipo_evento") or "15_anos", "honoree": honoree, "package": d.get("pacote_texto"),
            "total": bis.num(d.get("valor_final") or d.get("valor_por")), "entry": bis.num(d.get("entrada")), "signal": pay["signal"],
            "payment_summary": pay["summary"], "payment_plan": pay["plan"], "payment_notes": pay["notes"], "value_from": bis.num(d.get("valor_de")),
            "particularidades": d.get("particularidades_raw") or [], "alerts": alerts, "main_id": main_id, "main_name": ref["arquivo"], "docs": docs,
            "aditivos": len(docs), "assinado": bool(ref.get("assinado")), "pendencias": pend, "date_in_folder": info.get("date"),
            "cancelado": cancelado, "fonte": ref["origem"],
        })

    # mesmo contrato duas vezes (mesma casa, data e CPF)
    seen, dedup = {}, []
    for o in sorted(novos, key=lambda x: (x["cancelado"], x["pasta"])):
        kk = (o["venue"], o["event_date"], re.sub(r"\D", "", o["cpf"] or ""))
        if kk[2] and kk in seen:
            fora.append([o["pasta"], "duplicado de " + seen[kk]["pasta"]])
        else:
            seen[kk] = o; dedup.append(o)
    novos = dedup
    # telefone compartilhado entre contratos novos
    by_phone = {}
    for o in novos:
        ph = re.sub(r"\D", "", o["phone"] or "")[-8:]
        if ph and "telefone_invalido" not in o["alerts"]:
            by_phone.setdefault(ph, []).append(o)
    for ph, lst in by_phone.items():
        if len(lst) > 1 and len({re.sub(r"\D", "", x["cpf"] or "") for x in lst}) > 1:
            for x in lst:
                x["alerts"].append("telefone_compartilhado")
                x["pendencias"].append("O mesmo telefone aparece em outro contrato de pessoa diferente: " + "; ".join(y["name"] for y in lst if y is not x) + ". Confirmar o WhatsApp correto de cada um.")

    json.dump(novos, open(os.path.join(DIR, "import_set_novos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(files, open(os.path.join(DIR, "local_files_novos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(ajustes, open(os.path.join(DIR, "ajustes_prod.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    print("novos:", len(novos), "| cancelados:", sum(1 for o in novos if o["cancelado"]), "| fora:", len(fora))
    print("fora por motivo:", Counter(r[1].split(":")[0][:40] for r in fora).most_common())
    print("por casa:", Counter(o["venue"] for o in novos))
    print("com data alterada por aditivo:", sum(1 for o in novos if o["date_fix"]), "| com aditivo anexado:", sum(1 for o in novos if o["docs"]))
    print("ajustes em contratos da producao:", len(ajustes), "| mudar data:", sum(1 for a in ajustes if a["mudar_data"]), "| aditivos a anexar:", sum(len(a["anexar"]) for a in ajustes))
    print("arquivos a enviar ao R2:", len(files))


if __name__ == "__main__":
    sys.exit(main())
