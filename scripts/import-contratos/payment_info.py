#!/usr/bin/env python3
"""
Le o bloco de pagamento de um contrato (catalogo.json -> dados) e devolve:
  signal      soma de sinal + pre-sinal
  entry       entrada (a_vista tambem entra aqui)
  summary     texto da clausula "FORMA DE PAGAMENTO" do contrato, limpo (descricao do pagamento combinado)
  plan        rascunho do plano estruturado: sinal + entrada + parcelas + saldo automatico (30 dias antes da festa)
  notes       avisos para conferencia humana (datas nao lidas, soma nao fecha, etc.)

So le; nao grava nada. Datas lidas do texto sao SUGESTAO (o financeiro confirma ao aprovar).
"""
import re
from datetime import date

NL = chr(10)
DATE_RE = r"(\d{1,2})/(\d{1,2})/(\d{2,4})"


def _iso(d, m, y):
    d, m, y = int(d), int(m), int(y)
    if y < 100:
        y += 2000
    try:
        return date(y, m, d).isoformat()
    except ValueError:
        return None


def _first_date(text):
    mm = re.search(DATE_RE, text)
    return _iso(*mm.groups()) if mm else None


def written_text(trecho):
    """Trecho da clausula a partir de FORMA DE PAGAMENTO, sem linhas de assinatura (____)."""
    if not trecho:
        return ""
    t = re.sub(r"\s+", " ", trecho)
    # o titulo da secao vem em MAIUSCULAS com dois-pontos; a frase de abertura ("valores e forma de pagamento,") nao conta
    ms = list(re.finditer(r"FORMA DE PAGAMENTO\s*:", t))
    if ms:
        t = t[ms[0].end():]
    t = re.sub(r"[_]{2,}", "", t)
    t = re.sub(r"\s*-\s*;", ";", t)
    t = re.sub(r"\s+", " ", t).strip(" .;-")
    return t[:1500]


def _window(text, keyword_re, span=140):
    mm = re.search(keyword_re, text, re.I)
    return text[mm.start(): mm.start() + span] if mm else ""


def _brl(v):
    return "R$ " + "{:,.2f}".format(v).replace(",", "X").replace(".", ",").replace("X", ".")


def _br(iso):
    return "/".join(reversed(iso.split("-"))) if iso else ""


def clean_summary(items, total, text):
    """Descricao curta e sem repeticao do pagamento combinado: uma condicao por linha (o cronograma parcela a parcela fica no financeiro)."""
    lines = []
    others = 0.0
    for it in items:
        if it["type"] in ("sinal", "entrada"):
            others += it["amount"]
            lines.append("%s de %s%s" % ("Sinal" if it["type"] == "sinal" else "Entrada", _brl(it["amount"]), (" em " + _br(it["date"])) if it.get("date") else ""))
        elif it["type"] == "parcelas":
            others += it["amount"] * it["count"]
            md = re.search(r"todo dia (\d{1,2})", text, re.I)
            freq = (", todo dia %s" % md.group(1)) if md else ""
            start = (" a partir de " + _br(it["first_due_date"])) if it.get("first_due_date") else ""
            lines.append("%d %s de %s%s%s" % (it["count"], "parcela" if it["count"] == 1 else "parcelas", _brl(it["amount"]), freq, start))
    saldo = [it for it in items if it["type"] == "saldo"]
    if saldo:
        rest = round(total - others, 2)
        when = (" até " + _br(saldo[0]["date"])) if saldo[0].get("date") else " (30 dias antes da festa)"
        lines.append("Saldo final de %s%s" % (_brl(rest), when))
    return chr(10).join(lines)


def parse(d):
    d = d or {}
    comps = d.get("componentes") or []
    total = float(d.get("valor_final") or d.get("valor_por") or 0)
    text = written_text(d.get("pagamento_trecho"))
    notes = []

    signal = round(sum(float(c.get("valor") or 0) * max(1, int(c.get("qtd") or 1)) for c in comps if c.get("tipo") in ("sinal", "pre_sinal")), 2)
    entry = round(sum(float(c.get("valor") or 0) * max(1, int(c.get("qtd") or 1)) for c in comps if c.get("tipo") in ("entrada", "a_vista")), 2)

    # datas sugeridas, lidas logo depois da palavra-chave
    sinal_date = _first_date(_window(text, r"(pr[eé][- ]?)?sinal")) if signal else None
    entrada_date = _first_date(_window(text, r"entrada|[aà] vista")) if entry else None
    saldo_date = None
    for ms in reversed(list(re.finditer(r"saldo( final)?", text, re.I))):
        w = text[ms.start(): ms.start() + 110]
        if re.search(r"\d+\s*/\s*\d+\s*[–-]\s*R\$", w):  # janela de parcela "03/16 - R$ ..."
            continue
        dd = _first_date(w)
        if dd:
            saldo_date = dd
            break
    first_parcel = None
    mp = re.search(r"0?1\s*/\s*\d+[^;]{0,60}?" + DATE_RE, text, re.I)
    if mp:
        first_parcel = _iso(*mp.groups())
    if not first_parcel:
        mp = re.search(r"parcela[^.;]{0,160}?" + DATE_RE, text, re.I)
        if mp:
            first_parcel = _iso(*mp.groups())

    items = []
    for c in comps:
        t, v, q = c.get("tipo"), float(c.get("valor") or 0), max(1, int(c.get("qtd") or 1))
        if v <= 0:
            continue
        if t in ("sinal", "pre_sinal"):
            for _ in range(q):
                items.append({"type": "sinal", "amount": v, "method": "pix", **({"date": sinal_date} if sinal_date else {})})
        elif t in ("entrada", "a_vista"):
            for _ in range(q):
                items.append({"type": "entrada", "amount": v, "method": "pix", **({"date": entrada_date} if entrada_date else {})})
        elif t == "parcelas":
            items.append({"type": "parcelas", "count": q, "amount": v, "method": "pix", **({"first_due_date": first_parcel} if first_parcel else {})})

    others = sum(it["amount"] if it["type"] != "parcelas" else it["amount"] * it["count"] for it in items)
    remaining = round(total - others, 2)
    if remaining > 0.009:
        saldo = {"type": "saldo", "offset_days": -30, "method": "pix"}
        # data lida do texto so vale se for plausivel: entre 120 dias antes da festa e 10 dias depois
        ev = d.get("data_evento")
        plausible = True
        if saldo_date and ev:
            try:
                delta = (date.fromisoformat(ev) - date.fromisoformat(saldo_date)).days
                plausible = -10 <= delta <= 120
            except ValueError:
                plausible = False
            if not plausible:
                notes.append("Data do saldo lida do contrato (%s) fora do esperado: usado o padrão de 30 dias antes da festa." % saldo_date)
        if saldo_date and plausible:
            saldo["date"] = saldo_date
        items.append(saldo)
    elif remaining < -0.009:
        notes.append("A soma do que foi lido (sinal, entrada e parcelas) passa do total do contrato em R$ %.2f: conferir o PDF." % (-remaining))
    if not items:
        notes.append("Não foi possível ler as condições de pagamento: montar o plano a partir do PDF.")
    elif any(it["type"] in ("sinal", "entrada") and "date" not in it for it in items):
        notes.append("Datas de sinal/entrada não lidas do contrato: preencher ao aprovar.")
    if any(it["type"] == "parcelas" and "first_due_date" not in it for it in items):
        notes.append("Data da 1ª parcela não lida do contrato: preencher ao aprovar.")

    plan = {"version": 1, "items": items, "source": "importacao"}
    clean = clean_summary(items, total, text)
    return {"signal": signal, "entry": entry, "summary": clean or text, "plan": plan, "notes": notes, "total": total}


if __name__ == "__main__":
    import json
    import sys
    cat = json.load(open(r"C:\Users\--\Downloads\Contratos_catalogo\catalogo.json", encoding="utf-8"))
    n = sig = dated = summ = empty = over = 0
    for e in cat:
        if not e.get("dados"):
            continue
        r = parse(e["dados"])
        n += 1
        sig += 1 if r["signal"] > 0 else 0
        summ += 1 if r["summary"] else 0
        empty += 1 if not r["plan"]["items"] else 0
        over += 1 if any("passa do total" in x for x in r["notes"]) else 0
        dated += 1 if any(it.get("date") or it.get("first_due_date") for it in r["plan"]["items"]) else 0
    print(json.dumps({"contratos": n, "comSinal": sig, "comTexto": summ, "semPlano": empty, "somaPassaDoTotal": over, "comAlgumaData": dated}, ensure_ascii=False))
