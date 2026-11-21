#!/usr/bin/env python3
"""
Auditoria do que foi importado no banco LOCAL (somente leitura): confere cada contrato do sistema contra o PDF de origem
e contra o que o proprio importador deveria ter criado. Nao altera nada.

Saida (fora do repositorio): C:\\Users\\--\\Downloads\\Contratos_catalogo\\auditoria.csv e auditoria_resumo.json
"""
import csv
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date

DIR = r"C:\Users\--\Downloads\Contratos_catalogo"
TODAY = date(2026, 11, 19)
MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
NL = chr(10)


def q(sql):
    r = subprocess.run(["docker", "exec", "supabase_db_Bonomo_Festas_2", "psql", "-U", "postgres", "-At", "-c",
                        "select coalesce(json_agg(t),'[]'::json) from (" + sql + ") t"], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout.strip() or "[]")


def strip(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def norm(s):
    return re.sub(r"\s+", " ", strip(s).lower())


def digits(s):
    return re.sub(r"\D", "", s or "")


_text_cache = {}


def pdf_text(path):
    if path not in _text_cache:
        r = subprocess.run(["pdftotext", "-enc", "UTF-8", "-layout", path, "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
        _text_cache[path] = r.stdout
    return _text_cache[path]


def main():
    iset = {o["key"]: o for o in json.load(open(os.path.join(DIR, "import_set.json"), encoding="utf-8"))}
    files = json.load(open(os.path.join(DIR, "local_files.json"), encoding="utf-8"))

    contracts = q("select * from contracts where commercial_fields_snapshot->>'importKey' is not null")
    clients = {r["id"]: r for r in q("select * from clients where id in (select client_id from contracts where commercial_fields_snapshot->>'importKey' is not null)")}
    contacts = {r["id"]: r for r in q("select * from contacts where id in (select contact_id from contracts where commercial_fields_snapshot->>'importKey' is not null)")}
    events = defaultdict(list)
    for e in q("select * from venue_events where client_id is not null"):
        events[e["client_id"]].append(e)
    tasks = defaultdict(list)
    for t in q("select * from admin_tasks where created_by_name='Importação de contratos'"):
        tasks[(t.get("custom_properties") or {}).get("contractId")].append(t)
    placements = {r["contract_id"] for r in q("select contract_id from contract_funnel_placements")}
    log_rows = []
    lp = os.path.join(DIR, "import_log.jsonl")
    if os.path.exists(lp):
        log_rows = [json.loads(l) for l in open(lp, encoding="utf-8") if l.strip()]
    prev_contact = {r["id"]: r["previous"] for r in log_rows if r.get("kind") == "contact_updated"}

    rows = []  # (key, pasta, area, severidade, mensagem)

    def add(c, area, sev, msg):
        rows.append([c["commercial_fields_snapshot"]["importKey"].split(":", 1)[1], c["commercial_fields_snapshot"].get("pasta", ""), area, sev, msg])

    checks_ok = Counter()
    checks_bad = Counter()

    def ok(area):
        checks_ok[area] += 1

    def bad(c, area, sev, msg):
        checks_bad[area] += 1
        add(c, area, sev, msg)

    # --- 0. existencia ---
    expected = {"contratos:" + k for k in iset}
    got = {c["commercial_fields_snapshot"]["importKey"] for c in contracts}
    for k in sorted(expected - got):
        rows.append([k.split(":", 1)[1], iset[k.split(":", 1)[1]]["pasta"], "existencia", "ERRO", "contrato esperado nao existe no banco"])
    for k in sorted(got - expected):
        rows.append([k.split(":", 1)[1], "", "existencia", "ERRO", "contrato no banco que nao esta no lote"])

    seen_phone = defaultdict(list)
    seen_day = defaultdict(list)

    for c in contracts:
        key = c["commercial_fields_snapshot"]["importKey"].split(":", 1)[1]
        o = iset.get(key)
        if not o:
            continue
        cl = clients.get(c["client_id"])
        ct = contacts.get(c["contact_id"])
        conflict = bool(c["commercial_fields_snapshot"].get("dataEmConflito"))
        snap = c["client_snapshot"] or {}

        # 1. integridade
        if cl and c["id"] in placements and ct:
            ok("integridade")
        else:
            bad(c, "integridade", "ERRO", "falta cliente, colocacao no funil ou contato (cliente=%s, colocacao=%s, contato=%s)" % (bool(cl), c["id"] in placements, bool(ct)))

        # 2. datas
        d = c["event_date"]
        if conflict:
            if d is None and (not cl or cl["event_date"] is None) and not events.get(c["client_id"]):
                ok("datas")
            else:
                bad(c, "datas", "ERRO", "data em conflito deveria estar vazia no contrato, no cliente e na agenda")
        else:
            problems = []
            if d != o["event_date"]:
                problems.append("data do contrato (%s) difere da lida do PDF (%s)" % (d, o["event_date"]))
            if cl and cl["event_date"] != d:
                problems.append("data do cliente (%s) difere da do contrato (%s)" % (cl["event_date"], d))
            evs = events.get(c["client_id"], [])
            if len(evs) != 1:
                problems.append("agenda tem %d evento(s) para o cliente (esperado 1)" % len(evs))
            elif evs[0]["event_date"] != d:
                problems.append("data da agenda (%s) difere da do contrato (%s)" % (evs[0]["event_date"], d))
            if d:
                dd = date.fromisoformat(d)
                if dd < TODAY:
                    problems.append("data no passado (%s)" % d)
                if dd.year > 2032:
                    problems.append("data muito distante (%s)" % d)
                bd = (cl or {}).get("birthday_person_birthdate")
                if bd and bd == d:
                    problems.append("data da festa igual ao nascimento")
            if problems:
                for p in problems:
                    bad(c, "datas", "ERRO", p)
            else:
                ok("datas")
        if d:
            seen_day[(c["venue_id"], d)].append(key)

        # 3. conferencia com o PDF (texto presente no documento de origem)
        path = files.get(o.get("main_id") or "")
        if not path or not os.path.exists(path):
            bad(c, "pdf", "ERRO", "arquivo principal nao encontrado")
        else:
            txt = pdf_text(path)
            T = norm(txt)
            Dg = digits(txt)
            if len(re.sub(r"\s", "", txt)) < 150:
                checks_ok["pdf_escaneado_conferir_a_mao"] += 1
                add(c, "pdf", "AVISO", "PDF escaneado (sem texto): conferido so na leitura visual")
            else:
                miss = []
                toks = [t for t in norm(o["name"]).split() if len(t) > 2 and t not in ("dos", "das", "del")]
                if toks and not all(t in T for t in toks):
                    miss.append("nome do contratante (%s)" % o["name"])
                cpfd = digits(o["cpf"])
                if cpfd and cpfd not in Dg:
                    miss.append("CPF (%s)" % o["cpf"])
                ph = digits(o["phone"])[-8:]
                if "telefone_invalido" not in o["alerts"] and ph and ph not in Dg:
                    miss.append("telefone (%s)" % o["phone"])
                if o["event_date"] and not conflict and not o.get("date_fix"):
                    y, m, dday = o["event_date"].split("-")
                    pat1 = r"%d\s*(?:de\s*)?%s\s*(?:de\s*)?%s" % (int(dday), MONTHS[int(m) - 1], y)
                    pat2 = r"%s[/.-]%s[/.-]%s" % (dday, m, y)
                    if not (re.search(pat1, T) or re.search(pat2, T)):
                        miss.append("data do evento (%s)" % o["event_date"])
                if o["guests"] and not re.search(r"(?<!\d)%d(?!\d)" % o["guests"], re.sub(r"\.", "", txt)):
                    miss.append("convidados (%s)" % o["guests"])
                if o["total"]:
                    inteiro = "{:,.0f}".format(o["total"]).replace(",", ".")
                    cents = "{:,.2f}".format(o["total"]).replace(",", "X").replace(".", ",").replace("X", ".")
                    if cents not in txt and cents.replace(".", "") not in txt and inteiro not in txt:
                        miss.append("valor total (%s)" % cents)
                if miss:
                    for mm in miss:
                        bad(c, "pdf", "ERRO", "nao encontrei no PDF de origem: " + mm)
                else:
                    ok("pdf")

        # 4. contato = contrato
        if ct:
            diffs = []
            if norm(ct["name"]) != norm(o["name"]):
                diffs.append("nome do contato (%s) difere do contrato (%s)" % (ct["name"], o["name"]))
            if (ct["cpf"] or "") != (o["cpf"] or ""):
                diffs.append("CPF do contato (%s) difere do contrato (%s)" % (ct["cpf"], o["cpf"]))
            if o["email"] and (ct["email"] or "").lower() != o["email"].lower():
                diffs.append("e-mail do contato difere do contrato")
            if "telefone_invalido" not in o["alerts"] and digits(ct["primary_phone"])[-8:] != digits(o["phone"])[-8:]:
                diffs.append("telefone do contato difere do contrato")
            alerts_ct = [a["type"] for a in ((ct.get("custom_fields") or {}).get("dataAlerts") or [])]
            for a in o["alerts"]:
                if a not in alerts_ct:
                    diffs.append("falta o alerta '%s' no contato" % a)
            if diffs:
                for df in diffs:
                    bad(c, "contato", "ERRO", df)
            else:
                ok("contato")
            seen_phone[digits(ct["primary_phone"])[-8:]].append((key, ct["id"], ct["name"]))
            # contato atualizado: o nome antigo era de outra pessoa?
            pv = prev_contact.get(ct["id"])
            if pv and pv.get("name"):
                a = set(t for t in norm(pv["name"]).split() if len(t) > 2)
                b = set(t for t in norm(o["name"]).split() if len(t) > 2)
                if a and b and not (a & b):
                    add(c, "contato", "ATENCAO", "contato existente tinha outro nome (%s) e foi sobrescrito pelo do contrato; conferir se o telefone e o mesmo dono" % pv["name"])
                    checks_bad["contato_sobrescrito_outro_nome"] += 1

        # 5. contrato: campos e titulo
        t = c["contract_title"] or ""
        issues = []
        if re.search(r"None|null|undefined|\s{2,}", t):
            issues.append("titulo com lixo: " + t)
        if not t.strip() or t.strip().endswith("•"):
            issues.append("titulo vazio ou incompleto: " + t)
        if not c["guest_count"]:
            issues.append("convidados zerado")
        if not c["total_amount"] or float(c["total_amount"]) <= 0:
            issues.append("valor total zerado")
        if float(c["entry_amount"] or 0) > float(c["total_amount"] or 0):
            issues.append("entrada maior que o total")
        if (c["sdr_name"] or c["closer_name"]):
            issues.append("SDR/Closer deveriam estar vazios")
        if issues:
            for i in issues:
                bad(c, "contrato", "ERRO" if "titulo com lixo" in i or "zerado" in i else "AVISO", i)
        else:
            ok("contrato")
        if not o.get("honoree") and o["event_type"] == "15_anos":
            add(c, "contrato", "AVISO", "15 anos sem nome da aniversariante (titulo fica so com o contratante)")
            checks_bad["sem_homenageado"] += 1

        # 6. documentos
        url = c["contract_file_url"] or ""
        did = re.sub(r"^.*/|\.pdf$", "", url)
        pth = files.get(did)
        if pth and os.path.exists(pth) and open(pth, "rb").read(4) == b"%PDF":
            ok("documentos")
        else:
            bad(c, "documentos", "ERRO", "link do contrato nao abre um PDF: " + url)
        for a in c["attachments"] or []:
            pth = files.get(re.sub(r"^.*/|\.pdf$", "", a["url"]))
            if not (pth and os.path.exists(pth)):
                bad(c, "documentos", "ERRO", "anexo sem arquivo: " + a["name"])

        # 7. tarefas esperadas
        expected_items = list(o.get("pendencias") or [])
        if conflict:
            expected_items.append("DATA INDEFINIDA")
        for a in o["alerts"]:
            expected_items.append(a)
        tk = tasks.get(c["id"], [])
        if expected_items and not tk:
            bad(c, "tarefas", "ERRO", "tem %d pendencia(s) e nao tem tarefa" % len(expected_items))
        elif not expected_items and tk:
            bad(c, "tarefas", "AVISO", "tem tarefa sem pendencia correspondente")
        elif tk:
            desc = " ".join(x["description"] or "" for x in tk)
            falta = []
            for a in o["alerts"]:
                kw = {"cpf_invalido": "CPF com erro", "cpf_ausente": "CPF não encontrado", "telefone_invalido": "Telefone inválido", "telefone_compartilhado": "mesmo telefone"}[a]
                if kw not in desc:
                    falta.append(kw)
            if conflict and "DATA INDEFINIDA" not in desc:
                falta.append("DATA INDEFINIDA")
            for p in o.get("pendencias") or []:
                if p not in desc:
                    falta.append(p[:60])
            bad_assign = [x for x in tk if x["assigned_to_ids"]]
            clid = (tk[0].get("custom_properties") or {}).get("clientId")
            if falta:
                bad(c, "tarefas", "ERRO", "tarefa sem o item: " + "; ".join(falta))
            elif bad_assign:
                bad(c, "tarefas", "ERRO", "tarefa com responsavel (deveria ser livre)")
            elif clid != c["client_id"]:
                bad(c, "tarefas", "ERRO", "tarefa nao aponta para o cliente do contrato")
            else:
                ok("tarefas")
        else:
            ok("tarefas")

    # --- duplicidade ---
    for ph, lst in seen_phone.items():
        ids = {x[1] for x in lst}
        if len(ids) > 1:
            rows.append([",".join(x[0] for x in lst), "", "duplicidade", "ERRO", "contatos diferentes com o mesmo telefone final %s" % ph])
    for (v, d), keys in seen_day.items():
        if len(keys) > 1:
            rows.append([",".join(keys), "", "duplicidade", "ERRO", "%d contratos na mesma casa e data (%s)" % (len(keys), d)])

    with open(os.path.join(DIR, "auditoria.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["event_key", "pasta", "area", "gravidade", "mensagem"])
        w.writerows(rows)
    resumo = {"contratos_auditados": len(contracts), "conferencias_ok": dict(checks_ok), "problemas": dict(checks_bad),
              "por_gravidade": dict(Counter(r[3] for r in rows)), "por_area": {a + "/" + g: n for (a, g), n in Counter((r[2], r[3]) for r in rows).most_common()}}
    json.dump({k: (v if not isinstance(v, dict) else {str(a): b for a, b in v.items()}) for k, v in resumo.items()},
              open(os.path.join(DIR, "auditoria_resumo.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(resumo, ensure_ascii=False, indent=1, default=str))


if __name__ == "__main__":
    sys.exit(main())
