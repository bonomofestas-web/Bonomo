#!/usr/bin/env python3
"""
Fase 1 / passo 2 - EXTRACAO dos dados do contrato principal (somente leitura).

Le o inventario.json, escolhe o contrato principal de cada evento em escopo, extrai os campos por regra
(pdftotext) e cruza com o que o nome da pasta diz. Gera catalogo.json + CSVs de conferencia.
NAO grava nada no sistema. Os dados (CPF, endereco) ficam fora do repositorio.

Uso: python scripts/import-contratos/extract.py [--dir PASTA_DE_SAIDA]
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from datetime import date

OUT = r"C:\Users\--\Downloads\Contratos_catalogo"

VENUES = {
    "29.938.052/0001-95": "Espaço Rio Lounge",
    "29.802.828/0001-45": "Espaço Realizar",
    "97.546.636/0001-75": "Viena Casa de Festas",
}
MONTHS = {m: i + 1 for i, m in enumerate(
    ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"])}


def strip_acc(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def pdf_text(path, first_page_only=False):
    args = ["pdftotext", "-layout", "-enc", "UTF-8"]
    if first_page_only:
        args += ["-l", "1"]
    try:
        r = subprocess.run(args + [path, "-"], capture_output=True, timeout=60)
        return r.stdout.decode("utf-8", "ignore")
    except Exception:
        return ""


def norm(t):
    t = t.replace("\u00a0", " ")
    t = re.sub(r"Clicksign\s+[0-9a-f\-]{20,}", " ", t)
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"(\d)\s*-\s+(\d)", r"\1-\2", t)  # CEP quebrado: "20560- 120"
    return t.strip()


def money(s):
    s = s.replace("R$", "").strip()
    s = re.sub(r"[^\d.,]", "", s)
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        s = s.replace(".", "")  # "8.000" = 8000 (ponto de milhar, sem centavos)
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def cpf_ok(c):
    d = re.sub(r"\D", "", c or "")
    if len(d) != 11 or d == d[0] * 11:
        return False
    for n in (9, 10):
        s = sum(int(d[i]) * (n + 1 - i) for i in range(n))
        if (s * 10 % 11) % 10 != int(d[n]):
            return False
    return True


def phone_digits(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("55") and len(d) >= 12:
        d = d[2:]
    if len(d) == 13 and d[:2] == d[2:4]:  # DDD digitado duas vezes: "(21) 2196405-8036" -> 21 96405-8036
        d = d[2:]
    return d


def fmt_phone(p):
    d = phone_digits(p)
    if len(d) == 11:
        return f"({d[:2]}) {d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:]}"
    return (p or "").strip()


def phone_ok(p):
    d = phone_digits(p)
    return len(d) in (10, 11) and 11 <= int(d[:2]) <= 99


def event_kind(desc, folder_type):
    t = strip_acc((desc or "") + " " + (folder_type or "")).lower()
    if re.search(r"\b15\s*anos|quinze|debut", t):
        return "15_anos"
    if "casamento" in t or "noiv" in t:
        return "casamento"
    if "bodas" in t:
        return "bodas"
    if "renovacao de votos" in t:
        return "renovacao_votos"
    if "infantil" in t or re.search(r"\bkids\b|\b[1-9] ano\b|aninho", t):
        return "infantil"
    if "formatura" in t:
        return "formatura"
    if "corporat" in t or "confratern" in t or "empresa" in t:
        return "corporativo"
    if "cha " in t or "cha de" in t:
        return "cha"
    if "aniversario" in t or re.search(r"\b\d{2}\s*anos\b", t):
        return "aniversario"
    return "outro"


AMT_ANY = r"(?:R\$\s*)*([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)"
AMT = r"R\$\s*(?:R\$\s*)*([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)"  # componentes: R$ obrigatorio


def parse_payment(t):
    """Clausula de valores e forma de pagamento. Devolve dict com base, total final e componentes."""
    out = {"valor_de": None, "valor_por": None, "valor_final": None, "pre_sinal": None, "sinal": None,
           "entrada": None, "parcelas_qtd": None, "parcela_valor": None, "saldo": None, "a_vista": False,
           "componentes": [], "soma_componentes": None, "pagamento_trecho": None}
    m = re.search(r"ter[aá�]\s+valores\s+e\s+forma\s+de\s+pagamento[^:]{0,30}:", t, re.I)
    if not m:
        m = re.search(r"(VALOR\s+(?:TOTAL\s+)?DO\s+EVENTO)", t, re.I)
        if not m:
            return out
    clause = t[m.start(): m.start() + 3500]
    cut = re.search(r"DADOS\s+BANC|\s1[6-9]\s*[º°]\s", clause)
    if cut:
        clause = clause[:cut.start()]
    out["pagamento_trecho"] = clause[:1800]

    # valores do evento: De/Por (base) e "VALOR TOTAL DO EVENTO" final (apos opcionais)
    de = re.search(r"\b(?:DE|De):?\s*" + AMT_ANY, clause)
    por = re.search(r"\b(?:POR|Por):?\s*" + AMT_ANY, clause)
    out["valor_de"] = money(de.group(1)) if de else None
    out["valor_por"] = money(por.group(1)) if por else None
    pre_idx = re.search(r"FORMA\s+DE\s+PAGAMENTO\s*:", clause, re.I)
    pre = clause[: pre_idx.start()] if pre_idx else clause
    finals = re.findall(r"(?:VALOR\s+)?(?:TOTAL\s+)?DO\s+EVENTO:?\s*(?:De:?\s*" + AMT_ANY + r"\s*Por:?\s*" + AMT_ANY + r"|" + AMT_ANY + r")", pre, re.I)
    totals = []
    for a, b, c in finals:
        v = b or c
        if v:
            totals.append(money(v))
    if not totals and out["valor_por"] is not None:
        totals = [out["valor_por"]]
    if not totals:
        mm = re.search(r"VALOR\s+DO\s+EVENTO:?\s*(?:De:?\s*" + AMT_ANY + r"\s*)?(?:Por:?\s*" + AMT_ANY + r")", clause, re.I)
        if mm and mm.group(2):
            totals = [money(mm.group(2))]
    out["valor_final"] = totals[-1] if totals else None
    if out["valor_por"] is None and totals:
        out["valor_por"] = totals[0]

    # forma de pagamento: so os marcadores em lista (antes do cronograma "bom p/")
    fp = re.search(r"FORMA\s+DE\s+PAGAMENTO:?(.*)", clause, re.I)
    seg = fp.group(1) if fp else clause
    cut2 = re.search(r"\bEntrada\s*[–—\-�]\s*R\$|\b0?1\s*/\s*\d{1,2}\s*[–—\-�]|bom\s+p/|Sinal\s*[–—\-�]\s*R\$", seg)
    if cut2:
        seg = seg[:cut2.start()]
    comps = []
    NOR = r"(?:(?!R\$)[^;]){0,%d}"  # qualquer texto ate o proximo "R$", sem atravessar ";"
    for rx, tipo in ((r"Pr[eé]-?\s*sinal" + NOR % 30 + AMT, "pre_sinal"),
                     (r"(?<!Pr[eé]-)(?<!Pr[eé] )\bSinal" + NOR % 30 + AMT, "sinal"),
                     (r"Saldo" + NOR % 45 + AMT, "saldo")):
        for mm in re.finditer(rx, seg, re.I):
            v = money(mm.group(1))
            if v:
                comps.append({"tipo": tipo, "valor": v, "qtd": 1})
    for mm in re.finditer(r"Entrada(?:(?!R\$)[^;]){0,45}?(?:em\s+(\d{1,2})\s*x\s+de\s+)?" + AMT, seg, re.I):
        v = money(mm.group(2))
        if v:
            comps.append({"tipo": "entrada", "valor": v, "qtd": int(mm.group(1)) if mm.group(1) else 1})
    sched = [int(x) for x in re.findall(r"(?<!\d)0?1\s*/\s*(\d{1,2})\s*[–—\-\ufffd]", clause)]
    sched_n = max(sched) if sched else None
    for mm in re.finditer(r"(?:(\d{1,3})\s+)?parcelas?" + NOR % 70 + AMT, seg, re.I):
        v = money(mm.group(2))
        qtd = int(mm.group(1)) if mm.group(1) else sched_n
        if v and qtd:
            comps.append({"tipo": "parcelas", "valor": v, "qtd": qtd})
    # tira repeticoes exatas (cronograma que repete as linhas)
    seen, uniq = set(), []
    for c in comps:
        k = (c["tipo"], c["valor"], c["qtd"])
        if k not in seen:
            seen.add(k)
            uniq.append(c)
    comps = uniq
    out["a_vista"] = bool(re.search(r"[àa]\s+vista", seg, re.I))
    if out["a_vista"] and not comps and out["valor_final"]:
        comps.append({"tipo": "a_vista", "valor": out["valor_final"], "qtd": 1})
    out["componentes"] = comps
    for c in comps:
        if c["tipo"] in ("pre_sinal", "sinal", "entrada", "saldo") and out[c["tipo"]] is None:
            out[c["tipo"]] = c["valor"]
    pc = [c for c in comps if c["tipo"] == "parcelas"]
    if pc:
        out["parcelas_qtd"] = sum(c["qtd"] for c in pc)
        out["parcela_valor"] = pc[0]["valor"]
    if comps:
        out["soma_componentes"] = round(sum(c["valor"] * c["qtd"] for c in comps), 2)
    return out


def parse_contract(text):
    """Campos do contrato principal. Retorna (dados, observacoes_de_parse)."""
    t = norm(text)
    d, notes = {}, []
    m = re.search(r"(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})", t)
    d["cnpj"] = m.group(1) if m else None
    d["venue"] = VENUES.get(d["cnpj"])

    # cabecalho do modelo ("CONTRATO POCKET", "CONTRATO COMERCIAL"...)
    m = re.match(r"\s*(CONTRATO[^C]{0,30}?)\s+Contrato de presta", t, re.I)
    d["modelo"] = m.group(1).strip() if m else None

    # bloco do contratante: entre "denominada daqui em diante contratada" e "denominado(s) daqui em diante contratante(s)"
    blk = None
    m = re.search(r"daqui\s+em\s+diante\s+CONTRATAD[AO]\s*(?:e\s+)?(.+?)\s+denominad[oa]s?\s+daqui\s+em\s+diante\s+contratantes?", t, re.I)
    if m:
        blk = m.group(1)
    if blk is None:
        m = re.search(r"daqui\s+em\s+diante\s+contratad[ao]\s*(?:e\s+)?(.+?)(?:denominad|ajustam)", t, re.I)
        blk = m.group(1) if m else None
    d["contratante_bloco"] = blk
    if blk:
        name = re.split(r",?\s*(?:CPF|C\.P\.F|Cpf)", blk, maxsplit=1)[0].strip(" ,;:")
        name = re.sub(r"^((contratad[oa]s?|contratantes?|e|a|o)\s+)+", "", name, flags=re.I)
        d["contratante_nome"] = name or None
        cpfs = re.findall(r"CPF[^\d]{0,4}([\d.\-]{11,14})", blk, re.I)
        d["cpf"] = cpfs[0] if cpfs else None
        d["cpf_2"] = cpfs[1] if len(cpfs) > 1 else None
        tels = [x.strip() for x in re.findall(r"Tel(?:efone)?\.?:?\s*([\d()\s.\-+]{8,22})", blk, re.I)]
        tels = [x for x in tels if len(phone_digits(x)) >= 10] or tels
        d["telefone"] = (tels[0].strip() if tels else None)
        d["telefones_todos"] = [x.strip() for x in tels]
        em = re.findall(r"[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+", blk)
        d["email"] = em[0].lower() if em else None
        ceps = re.findall(r"(\d{2}\.?\d{3}-?\d{3})", re.sub(r"CPF:?\s*[\d.\-]+", "", blk))
        d["cep"] = ceps[-1] if ceps else None
        am = re.search(r"(?:Endere[cç]o:?|\bEnd\.?:|residentes?\s+(?:na|no|em|a)|resid[eê]ncia:?)\s*(.+?)(?=\s*(?:CEP|Cep|E-?mail|Email|Tel\b|$))", blk, re.I)
        d["endereco"] = re.sub(r"[\s,;\-–—�]+$", "", am.group(1)).strip() if am else None
        # segunda pessoa (casal): nome apos o primeiro bloco de CPF
        if d["cpf_2"]:
            n2 = re.search(r"(?:e|,)\s+([A-ZÀ-Ú][\wÀ-ú ]{5,60}?),?\s*CPF:?\s*" + re.escape(d["cpf_2"]), blk)
            d["contratante_2_nome"] = n2.group(1).strip() if n2 else None
    else:
        notes.append("bloco do contratante nao encontrado")

    # clausula 1: data, local, ocasiao, convidados
    t_dia = re.sub(r"(Que\s+no\s+dia\s+)(\d{1,2})/(\d{1,2})/(\d{4})", lambda x: f"{x.group(1)}{x.group(2)} de {list(MONTHS)[int(x.group(3)) - 1]} de {x.group(4)}", t, count=1, flags=re.I)
    m = re.search(r"1\s*[º°o]?\s*Que\s+no\s+dia\s+(\d{1,2})\s*(?:de\s+)?([A-Za-zçÇãÃõÕéÉêÊ]+)\s*(?:de\s+)?(\d{4})(.+?)(?=2\s*[º°o]\s*Que)", t_dia, re.I)
    if m:
        mes = MONTHS.get(strip_acc(m.group(2)).lower())
        try:
            d["data_evento"] = date(int(m.group(3)), mes, int(m.group(1))).isoformat() if mes else None
        except (ValueError, TypeError):
            d["data_evento"] = None
        resto = m.group(4)
        d["clausula1"] = resto.strip()[:600]
        om = re.search(r"por\s+ocasi[ãa]o\s+(.+?)\s*,?\s*para\s+(\d{1,4})\s*(?:\([^)]*\))?\s*convidados", resto, re.I)
        if om:
            d["ocasiao"] = om.group(1).strip(" ,")
            d["convidados"] = int(om.group(2))
        else:
            gm = re.search(r"(\d{1,4})\s*(?:\([^)]*\))?\s*convidados", resto, re.I)
            d["convidados"] = int(gm.group(1)) if gm else None
            d["ocasiao"] = None
            notes.append("ocasiao nao identificada")
        nm = re.search(r"(?:sua|seu)\s+(?:filh[oa]|neto|neta|sobrinh[oa]|irm[ãa])\s+([A-ZÀ-Ú][A-Za-zÀ-ú ]+?)(?:,|\s+Data|\s+para|\s+nascid)", resto)
        d["homenageado"] = nm.group(1).strip() if nm else None
        bd = re.search(r"(?:Data\s+de\s+nascimento|nascid[oa]\(?[Aa]?\)?\s+no\s+dia)\s*:?\s*(\d{1,2}/\d{1,2}/\d{4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4})", resto, re.I)
        d["nascimento_homenageado"] = bd.group(1) if bd else None
    else:
        notes.append("clausula 1 (data/convidados) nao encontrada")

    # pacote
    pm = re.findall(r"Festa\s+(Silver|Gold|Black|Turbo|Pocket|Premium|Classic|Platinum)", t, re.I)
    d["pacote_texto"] = pm[0].title() if pm else None

    # valores e pagamento
    d.update(parse_payment(t))

    # particularidades curtas (para a passagem de bastao)
    bits = []
    for label, rx in (("Brindes", r"BRINDES:?\s*(.{0,160}?)(?=OPCIONAL|OPCIONAIS|2\s*[º°]|$)"),
                      ("Opcional", r"OPCIONAL\s+CONTRATADO:?\s*(.{0,160}?)(?=VALOR|FORMA|OBSERV|$)"),
                      ("Campanha", r"REF:?\s*(.{0,160}?)(?=FORMA|PR[ÉE]|$)"),
                      ("Observacoes", r"OBSERVA[ÇC][ÕO]ES?:?\s*(.{0,200})")):
        mm = re.search(rx, t, re.I)
        if mm and mm.group(1).strip(" .:;-"):
            bits.append(f"{label}: {mm.group(1).strip(' .:;-')[:150]}")
    d["particularidades_raw"] = bits
    return d, notes


def validate(d, folder):
    flags = []
    if not d.get("venue"):
        flags.append("casa nao identificada (CNPJ)")
    if not d.get("contratante_nome"):
        flags.append("sem nome do contratante")
    if d.get("cpf") and not cpf_ok(d["cpf"]):
        flags.append("CPF invalido (digitos)")
    if not d.get("cpf"):
        flags.append("sem CPF")
    if d.get("telefone") and not phone_ok(d["telefone"]):
        flags.append("telefone fora do padrao")
    if d.get("telefone") and len(phone_digits(d["telefone"])) == 10 and phone_digits(d["telefone"])[2] == "9":
        flags.append("telefone celular com 10 digitos (falta digito? e a chave do contato)")
    if not d.get("telefone"):
        flags.append("sem telefone")
    if not d.get("email"):
        flags.append("AVISO sem e-mail")
    if not d.get("data_evento"):
        flags.append("sem data do evento")
    if not d.get("convidados"):
        flags.append("sem numero de convidados")
    total = d.get("valor_final") or d.get("valor_por")
    if total is None:
        flags.append("valor total nao extraido")
    elif d.get("soma_componentes") is not None and abs(d["soma_componentes"] - total) > 1.0:
        flags.append(f"AVISO pagamento detalhado nao fecha: componentes {d['soma_componentes']} x total {total}")
    elif d.get("soma_componentes") is None:
        flags.append("AVISO forma de pagamento nao lida")
    # cruzamento com a pasta
    if folder.get("date") and d.get("data_evento") and folder["date"] != d["data_evento"]:
        flags.append(f"DATA diverge: contrato {d['data_evento']} x pasta {folder['date']}")
    if folder.get("guests") and d.get("convidados") and folder["guests"] != d["convidados"]:
        flags.append(f"CONVIDADOS divergem: contrato {d['convidados']} x pasta {folder['guests']}")
    if folder.get("package") and d.get("pacote_texto") and folder["package"].lower() != d["pacote_texto"].lower():
        flags.append(f"PACOTE diverge: contrato {d['pacote_texto']} x pasta {folder['package']}")
    return flags


def pick_main(files):
    """Contrato principal: assinado (Clicksign) > 'contrato' > outro PDF que parece contrato. Sem duplicados."""
    cands = []
    for f in files:
        if f["duplicate_of"] or f["kind"] in ("proposta", "comprovante", "terceirizados", "aditivo"):
            continue
        score = {"contrato_assinado": 3, "contrato": 2}.get(f["kind"], 1)
        cands.append((score, f["size"], f))
    cands.sort(key=lambda x: (-x[0], -x[1]))
    return [c[2] for c in cands]


BLOQUEIOS = ("casa nao identificada", "telefone celular com 10", "sem nome do contratante", "sem CPF", "CPF invalido", "sem telefone", "telefone fora do padrao",
             "sem data do evento", "sem numero de convidados", "valor total nao extraido", "DATA diverge", "CONVIDADOS divergem",
             "PACOTE diverge", "SEM CONTRATO", "STATUS DA PASTA: cancel", "STATUS DA PASTA: distrato", "pasta de PROPOSTA", "pasta de UPGRADE",
             "data da pasta desconhecida", "aditivo")


def classe(rec):
    fl = rec["flags"]
    if any(f.startswith("pasta de PROPOSTA") or f.startswith("STATUS DA PASTA: cancel") or f.startswith("STATUS DA PASTA: distrato")
           or f.startswith("STATUS DA PASTA: realizado") for f in fl):
        return "C_candidato_a_excluir"
    if not rec["dados"] and not rec["needs_visual"]:
        return "E_sem_contrato"
    if rec["needs_visual"]:
        return "D_ler_visualmente"
    if any(any(f.startswith(b) for b in BLOQUEIOS) for f in fl):
        return "B_revisar"
    return "A_pronto"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=OUT)
    ap.add_argument("--all", action="store_true", help="inclui tambem eventos fora de escopo (passados)")
    args = ap.parse_args()
    inv = json.load(open(os.path.join(args.dir, "inventario.json"), encoding="utf-8"))
    out = []
    # A mesma festa aparece em varias partes do download (ex.: contrato numa, aditivo/comprovante noutra): junta pelo nome da pasta.
    merged = {}
    for e in inv["events"]:
        k = re.sub(r"[^a-z0-9]+", "", strip_acc(os.path.basename(e["rel_dir"])).lower())
        if k in merged:
            m = merged[k]
            have = {f["sha256"] for f in m["files"]}
            for f in e["files"]:
                if f["sha256"] not in have:
                    m["files"].append(dict(f, duplicate_of=None))
                    have.add(f["sha256"])
            m.setdefault("merged_dirs", []).append(e["rel_dir"])
        else:
            merged[k] = dict(e, files=[dict(f, duplicate_of=None) for f in e["files"]])
    for e in merged.values():
        if not (e["in_scope_by_folder"] or args.all):
            continue
        folder = e["folder"]
        rec = {"event_key": e["event_key"], "rel_dir": e["rel_dir"], "part": e["part"], "folder": folder,
               "status_pasta": folder.get("folder_status"), "main_pdf": None, "alternates": [],
               "needs_visual": False, "dados": {}, "flags": [], "parse_notes": [],
               "docs": {"comprovantes": [], "aditivos": [], "terceirizados": [], "outros": []}}
        for f in e["files"]:
            if f["duplicate_of"]:
                continue
            slot = {"comprovante": "comprovantes", "aditivo": "aditivos", "terceirizados": "terceirizados"}.get(f["kind"])
            if slot:
                rec["docs"][slot].append(f["rel"])
        ordered = pick_main(e["files"])
        chosen_text = None
        for f in ordered:
            txt = pdf_text(f["path"])
            plain = re.sub(r"\s", "", txt)
            if len(plain) < 150:
                rec["alternates"].append({"rel": f["rel"], "motivo": "sem texto (escaneado)"})
                continue
            if "ajustam" not in strip_acc(txt).lower() and "contrato de prestacao" not in strip_acc(txt).lower():
                rec["alternates"].append({"rel": f["rel"], "motivo": "nao parece contrato"})
                continue
            rec["main_pdf"] = f["rel"]
            chosen_text = txt
            break
        if not chosen_text:
            rec["needs_visual"] = bool(ordered)
            rec["flags"].append("SEM CONTRATO COM TEXTO: " + ("ler visualmente" if ordered else "nenhum PDF de contrato"))
        else:
            dados, notes = parse_contract(chosen_text)
            dados.pop("contratante_bloco", None)
            dados["telefone_normalizado"] = fmt_phone(dados.get("telefone")) if dados.get("telefone") else None
            rec["dados"] = dados
            rec["parse_notes"] = notes
            rec["flags"] += validate(dados, folder)
            dados["tipo_evento"] = event_kind(dados.get("ocasiao"), folder.get("type"))
        if rec["status_pasta"] in ("cancelado", "cancelar", "distrato"):
            rec["flags"].append(f"STATUS DA PASTA: {rec['status_pasta']} (nao importar sem decisao)")
        elif rec["status_pasta"]:
            rec["flags"].append(f"STATUS DA PASTA: {rec['status_pasta']}")
        if folder.get("is_upgrade"):
            rec["flags"].append("pasta de UPGRADE (pode ser aditivo de outro contrato)")
        if folder.get("is_proposal"):
            rec["flags"].append("pasta de PROPOSTA (nao e contrato)")
        if folder.get("date_unknown"):
            rec["flags"].append("data da pasta desconhecida (XX)")
        if rec["docs"]["aditivos"]:
            rec["flags"].append(f"tem {len(rec['docs']['aditivos'])} aditivo(s): conferir o que mudou")
        rec["classe"] = classe(rec)
        out.append(rec)

    with open(os.path.join(args.dir, "catalogo.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    # CSVs de conferencia (UTF-8 com BOM, separador ';' para o Excel em portugues)
    cols = ["classe", "event_key", "pasta", "status_pasta", "casa", "contratante", "cpf", "telefone", "email", "endereco", "cep",
            "data_evento", "convidados", "tipo_evento", "ocasiao", "homenageado", "pacote", "valor_de", "valor_por",
            "pre_sinal", "entrada", "saldo", "parcelas", "particularidades", "n_aditivos", "contrato_pdf", "flags"]
    with open(os.path.join(args.dir, "eventos.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(cols)
        for r in out:
            d = r["dados"]
            w.writerow([r["classe"], r["event_key"], r["rel_dir"], r["status_pasta"] or "", d.get("venue") or "", d.get("contratante_nome") or "",
                        d.get("cpf") or "", d.get("telefone") or "", d.get("email") or "", d.get("endereco") or "", d.get("cep") or "",
                        d.get("data_evento") or "", d.get("convidados") or "", d.get("tipo_evento") or "", d.get("ocasiao") or "",
                        d.get("homenageado") or "", d.get("pacote_texto") or r["folder"].get("package") or "",
                        d.get("valor_de") or "", d.get("valor_final") or d.get("valor_por") or "", d.get("pre_sinal") or "", d.get("entrada") or "",
                        d.get("saldo") or "", d.get("parcelas_qtd") or "", " | ".join(d.get("particularidades_raw") or []),
                        len(r["docs"]["aditivos"]), r["main_pdf"] or "", " ; ".join(r["flags"])])
    with open(os.path.join(args.dir, "divergencias.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["event_key", "pasta", "flag"])
        for r in out:
            for fl in r["flags"]:
                w.writerow([r["event_key"], r["rel_dir"], fl])

    # resumo de qualidade
    n = len(out)
    ok = [r for r in out if r["dados"]]
    c = Counter()
    for r in ok:
        for k in ("venue", "contratante_nome", "cpf", "telefone", "email", "endereco", "data_evento", "convidados", "valor_final", "entrada", "soma_componentes"):
            if r["dados"].get(k):
                c[k] += 1
    print(f"eventos em escopo: {n} | com contrato lido: {len(ok)} | sem texto/precisa leitura visual: {sum(1 for r in out if r['needs_visual'])} | sem nenhum contrato: {sum(1 for r in out if not r['dados'] and not r['needs_visual'])}")
    print("preenchimento (sobre os lidos):", {k: f"{v}/{len(ok)}" for k, v in c.items()})
    fl = Counter(re.sub(r"[\d.,]+", "#", x).split(":")[0][:60] for r in out for x in r["flags"])
    print("flags mais comuns:", fl.most_common(12))
    print("classes:", dict(sorted(Counter(r["classe"] for r in out).items())))
    print("saida:", args.dir)


if __name__ == "__main__":
    sys.exit(main())
