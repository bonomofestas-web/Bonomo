#!/usr/bin/env python3
"""
Monta a lista de PROPOSTAS historicas que valem entrar na etapa Proposta do quadro de contratos.
Entram so pastas que (1) tem arquivo de proposta, (2) ainda nao viraram contrato no sistema (por CPF, telefone ou nome),
(3) nao tem documento assinado, (4) tem dados minimos viaveis (contratante, telefone ou CPF, valor plausivel) e
(5) a data da festa ainda esta em aberto (hoje ou depois). Le Contratos_catalogo (reanalise.json + contratos_prod.json).
Saida: Contratos_catalogo/propostas_historicas.json. Uso: python scripts/import-contratos/build_propostas_historicas.py
"""
import datetime, glob, hashlib, json, os, re, sys, unicodedata

sys.stdout.reconfigure(encoding='utf-8')
CAT = 'C:/Users/--/Downloads/Contratos_catalogo/'
HOJE = datetime.date.today()
VALOR_MINIMO = 5000.0  # abaixo disso e leitura de sinal/parcela, nao o valor da festa

rean = json.load(open(CAT + 'reanalise/reanalise.json', encoding='utf-8'))['pastas']
cs = json.load(open(CAT + 'contratos_prod.json', encoding='utf-8'))
by_event = {ek: p for p in rean for ek in p['event_keys']}
D = lambda s: re.sub(r'\D', '', s or '')
norm = lambda n: re.sub(r'[^a-z0-9]+', '', ''.join(c for c in unicodedata.normalize('NFD', (n or '').lower()) if unicodedata.category(c) != 'Mn'))

sist_pastas = set()
cpfs, fones, nomes = set(), set(), set()
for c in cs:
    k = ((c['commercial_fields_snapshot'] or {}).get('importKey') or '').replace('contratos:', '')
    if k in by_event: sist_pastas.add(by_event[k]['key'])
    s = c['client_snapshot'] or {}
    if D(s.get('cpf')): cpfs.add(D(s['cpf']))
    if len(D(s.get('phone'))) >= 10: fones.add(D(s['phone'])[-9:])
    if s.get('name'): nomes.add(norm(s['name']))

conv = {}
for mf in glob.glob('C:/Users/--/Downloads/Contratos_convertidos/*/manifest.json'):
    for k, v in json.load(open(mf, encoding='utf-8')).items():
        if v: conv[os.path.normpath(k).lower()] = v

def sha(p):
    h = hashlib.sha1()
    with open(p, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''): h.update(ch)
    return h.hexdigest()

def tipo(pasta):
    u = pasta.upper()
    if 'CASAMENTO' in u: return 'casamento'
    if 'BODAS' in u: return 'bodas'
    if re.search(r'\b15\s*A\b|15 ANOS', u): return '15_anos'
    if re.search(r'\b\d{2}\s*A\b', u): return 'aniversario'
    return '15_anos'

out, motivos = [], {}
for p in rean:
    if p['key'] in sist_pastas: continue
    docs = [d for d in p['docs'] if isinstance(d, dict)]
    props = [d for d in docs if re.search(r'propost', d.get('arquivo', ''), re.I) or re.search(r'propost', p['pasta'], re.I)]
    if not props: continue
    def pula(m): motivos[m] = motivos.get(m, 0) + 1
    if any(d.get('assinado') for d in docs): pula('tem documento assinado (e contrato)'); continue
    com_dados = [d for d in docs if d.get('dados')]
    d = (com_dados[0]['dados']) if com_dados else None
    if not d: pula('sem dados lidos'); continue
    nome, cpf = d.get('contratante_nome'), D(d.get('cpf'))
    fone = D(d.get('telefone_normalizado') or d.get('telefone'))
    valor = d.get('valor_final') or 0
    ev = d.get('data_evento')
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', p['pasta'])
    data_evento = datetime.date.fromisoformat(ev) if ev else (datetime.date(int(m[1]), int(m[2]), int(m[3])) if m else None)
    if 'cancel' in p['pasta'].lower(): pula('pasta cancelada'); continue
    if not nome or not (len(fone) >= 10 or len(cpf) == 11): pula('sem nome e telefone/CPF'); continue
    if valor < VALOR_MINIMO: pula('valor nao confiavel'); continue
    if not data_evento or data_evento < HOJE: pula('data da festa passada ou desconhecida'); continue
    if (cpf and cpf in cpfs) or (len(fone) >= 10 and fone[-9:] in fones) or norm(nome) in nomes: pula('ja e contrato no sistema (CPF, telefone ou nome)'); continue
    doc = next((x for x in props if x.get('legivel')), props[0])
    src = doc['caminho']
    if os.path.splitext(src)[1].lower() in ('.doc', '.docx'): src = conv.get(os.path.normpath(src).lower())
    if not src or not os.path.exists(src): pula('arquivo da proposta nao encontrado/convertido'); continue
    if os.path.splitext(src)[1].lower() != '.pdf': pula('arquivo da proposta nao e PDF'); continue
    titulo = re.sub(r'^\d{4}-\d{2}-\s*\d{2}\s*-?\s*', '', p['pasta'])
    titulo = re.sub(r'\.(docx?|pdf)$', '', titulo, flags=re.I).strip()
    out.append({
        'pasta': p['pasta'], 'titulo': titulo, 'contratante': nome, 'telefone': d.get('telefone_normalizado') or d.get('telefone'), 'cpf': d.get('cpf'),
        'email': d.get('email'), 'endereco': d.get('endereco'), 'venue': d.get('venue'), 'tipo': tipo(p['pasta']),
        'data_evento': data_evento.isoformat(), 'convidados': d.get('convidados'), 'pacote': d.get('pacote_texto'), 'valor': valor,
        'data_proposta': (doc.get('modificado') or '')[:10] or None, 'arquivo_origem': src, 'arquivo_id': sha(src)[:16],
    })

json.dump(out, open(CAT + 'propostas_historicas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('propostas historicas viaveis:', len(out))
print('nao entram:', motivos)
for o in out: print(' ', o['data_evento'], o['venue'], '|', o['contratante'][:34], '|', o['valor'], '| proposta de', o['data_proposta'])
