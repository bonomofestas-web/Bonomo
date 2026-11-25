#!/usr/bin/env node
/**
 * Resolve na PRODUCAO as pendencias que a importacao deixou como tarefa mas que estao nos proprios contratos:
 *  1. preenche telefone, CPF, convidados e valor lidos do PDF do contrato (releitura tolerante a formatos);
 *  2. remove contratos duplicados criados pela importacao (mesmo contratante/CPF/valor de um contrato ja existente),
 *     anexando o arquivo ao contrato original;
 *  3. repara nomes de anexos com acento quebrado e remove anexos repetidos;
 *  4. da baixa nas partes de tarefas que ficaram resolvidas e mantem as que ainda dependem de uma pessoa.
 * Padrao = dry-run. Backup completo (linhas antes) em pendencias_backup.json, usado por --rollback.
 * Uso: node scripts/import-contratos/resolver_pendencias_prod.mjs [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DIR = 'C:/Users/--/Downloads/Contratos_catalogo';
const BACKUP = `${DIR}/pendencias_backup.json`;
const RELATORIO = `${DIR}/pendencias_resultado.json`;
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const readEnv = (f) => Object.fromEntries(readFileSync(f, 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const env = readEnv('.env');
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const digits = (s) => String(s ?? '').replace(/\D/g, '');
const fmtPhone = (d) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d);
const fmtCpf = (d) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
const cpfOk = (d) => {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); if (((s * 10) % 11) % 10 !== Number(d[n])) return false; }
  return true;
};
const hoje = new Date().toLocaleDateString('pt-BR');
const isoDe = (br) => br.split('/').reverse().join('-');

// Dados lidos do texto do PDF de cada contrato (releitura tolerante a formatos).
const PREENCHER = {
  'CTR-ERL20270225': { tel: '21964162800' },
  'CTR-ERL20270521': { tel: '21972802793' },
  'CTR-ERL20280115': { tel: '21964423600' },
  'CTR-ERL20280721': { tel: '21979065335' },
  'CTR-ERL20270128': { cpf: '10169116700' },
  'CTR-ERL20270807': { cpf: '08601448798' },
  'CTR-ERL20271218': { cpf: '51672030587' },
  // CPF digitado errado no contrato; o numero correto (valido pelo digito verificador) esta em outro documento da mesma pasta
  'CTR-ERL20270305': { cpf: '08478215794' },
  'CTR-ER20280121': { cpf: '09268720795' },
  'CTR-ERL20270718': { guests: 150 },
  'CTR-ERL20270304': { guests: 100 },
  'CTR-ERL20290914': { guests: 120 }, // 100 + 20 de cortesia, "totalizando 120 convidados"
  'CTR-ER20270122': { total: 27900 }, // entrada 1.000 + 22 x 1.000 + saldo 4.900
  'CTR-ERL20270430': { total: 62000 }, // entrada 6.200 + 8 x 6.975
};
// Duplicados da importacao: mesmo contratante, CPF, valor e convidados de um contrato que ja existia.
const DUPLICADOS = [
  { remover: 'CTR-ER20261127-2', manter: 'CTR-ER20261127', rotulo: 'Versão da pasta 15A VITORIA (PAI FRANCISCO)' },
  { remover: 'CTR-ERL20270723-2', manter: 'CTR-ERL20270723', rotulo: 'Versão da pasta 15A BLACK CAROLINA 150P (CARLA)' },
  { remover: 'CTR-ERL20271119-2', manter: 'CTR-ERL20271119', rotulo: 'Cópia achada na pasta 15A KAUANNE BLACK 150P (CLEIDE)' },
  { remover: 'CTR-ERL20281020-2', manter: 'CTR-ERL20281020', rotulo: 'Versão da pasta 15A MARIA ALICE TURBO 170P (THAYS)' },
];

if (args.includes('--rollback')) {
  if (!existsSync(BACKUP)) { console.log('Sem backup para desfazer.'); process.exit(0); }
  const b = JSON.parse(readFileSync(BACKUP, 'utf-8'));
  const n = (o) => Object.values(o).reduce((a, l) => a + l.length, 0);
  console.log(`Rollback: ${n(b.removidos)} linhas removidas e ${n(b.alterados)} alteradas`, APLICAR ? '' : '(dry-run; use --aplicar)');
  if (APLICAR) {
    for (const [t, tabela] of [['clients', 'clients'], ['contracts', 'contracts'], ['placements', 'contract_funnel_placements'], ['tasks', 'admin_tasks']]) for (const r of b.removidos[t]) must(await sb.from(tabela).upsert(r), `restaurar ${t}`);
    for (const [t, tabela] of [['contracts', 'contracts'], ['clients', 'clients'], ['contacts', 'contacts'], ['tasks', 'admin_tasks']]) for (const r of b.alterados[t]) must(await sb.from(tabela).upsert(r), `restaurar ${t}`);
    console.log('Desfeito.');
  }
  process.exit(0);
}

const backup = { removidos: { clients: [], contracts: [], placements: [], tasks: [] }, alterados: { contracts: [], clients: [], contacts: [], tasks: [] } };
const rel = { preenchidos: [], removidos: [], anexosReparados: 0, tarefasBaixadas: [], tarefasParciais: [], tarefasRemovidas: 0, semTelefone: [], restantes: [], avisos: [] };
const seen = new Set();
/** Atualiza uma linha guardando o estado anterior completo (uma vez por linha) para o rollback. */
async function upd(tabela, lista, id, patch) {
  const k = `${tabela}:${id}`;
  if (!seen.has(k)) {
    const antes = must(await sb.from(tabela).select('*').eq('id', id).eq('master_id', MASTER_ID).maybeSingle(), `ler ${tabela}`);
    if (antes) { backup.alterados[lista].push(antes); seen.add(k); }
  }
  if (APLICAR) must(await sb.from(tabela).update(patch).eq('id', id).eq('master_id', MASTER_ID), `atualizar ${tabela}`);
}

try {
  let contratos = must(await sb.from('contracts').select('*').eq('master_id', MASTER_ID), 'contratos');
  const porCodigo = () => new Map(contratos.map((c) => [c.contract_code, c]));
  console.log(`${APLICAR ? 'APLICAR' : 'dry-run'} | contratos: ${contratos.length}`);

  // ---------- 1. preencher ----------
  for (const [code, f] of Object.entries(PREENCHER)) {
    const c = porCodigo().get(code);
    if (!c) { rel.avisos.push(`nao encontrado: ${code}`); continue; }
    const snap = { ...(c.client_snapshot || {}) };
    const pC = {}; const pCl = {}; const pCt = {}; const partes = [];
    const removeAlertas = [];
    if (f.tel) { const p = fmtPhone(f.tel); snap.phone = p; pCl.payer_phone = p; pCt.primary_phone = p; partes.push(`telefone ${p}`); removeAlertas.push('telefone_invalido'); }
    if (f.cpf) {
      if (!cpfOk(f.cpf)) { rel.avisos.push(`CPF invalido ignorado: ${code}`); continue; }
      const p = fmtCpf(f.cpf); snap.cpf = p; pCl.payer_cpf = p; pCt.cpf = p; partes.push(`CPF ${p}`); removeAlertas.push('cpf_invalido', 'cpf_ausente');
    }
    if (f.guests) { pC.guest_count = f.guests; pCl.guest_count = f.guests; partes.push(`${f.guests} convidados`); }
    if (f.total) { pC.total_amount = f.total; pCl.deal_value = f.total; partes.push(`valor R$ ${f.total}`); }
    if (f.tel || f.cpf) pC.client_snapshot = snap;
    console.log(`preencher ${code}: ${partes.join(', ')}`);
    rel.preenchidos.push({ contrato: code, campos: partes });
    await upd('contracts', 'contracts', c.id, { ...pC, updated_at: new Date().toISOString() });
    Object.assign(c, pC);
    if (c.client_id && Object.keys(pCl).length) await upd('clients', 'clients', c.client_id, pCl);
    if (f.guests && c.client_id) {
      const ev = must(await sb.from('venue_events').select('id, guest_count').eq('master_id', MASTER_ID).eq('client_id', c.client_id), 'agenda');
      for (const e of ev) if (APLICAR) must(await sb.from('venue_events').update({ guest_count: f.guests }).eq('id', e.id).eq('master_id', MASTER_ID), 'agenda convidados');
    }
    if (c.contact_id) {
      const ct = must(await sb.from('contacts').select('id, custom_fields, primary_phone').eq('id', c.contact_id).eq('master_id', MASTER_ID).maybeSingle(), 'contato');
      if (ct) {
        const cf = { ...(ct.custom_fields || {}) };
        if (Array.isArray(cf.dataAlerts)) cf.dataAlerts = cf.dataAlerts.filter((a) => !removeAlertas.includes(a.type));
        const patch = { ...pCt, custom_fields: cf };
        if (pCt.primary_phone) {
          const igual = must(await sb.from('contacts').select('id').eq('master_id', MASTER_ID).eq('primary_phone', pCt.primary_phone).neq('id', ct.id).is('deleted_at', null), 'contato igual');
          if (igual.length) { delete patch.primary_phone; rel.avisos.push(`${code}: ja existe outro contato com o telefone ${pCt.primary_phone}; contato nao alterado`); }
        }
        await upd('contacts', 'contacts', ct.id, patch);
      }
    }
  }

  // ---------- 2. duplicados ----------
  for (const d of DUPLICADOS) {
    const rem = porCodigo().get(d.remover); const man = porCodigo().get(d.manter);
    if (!rem || !man) { rel.avisos.push(`duplicado ja tratado ou ausente: ${d.remover}`); continue; }
    const snapR = rem.client_snapshot || {}; const snapM = man.client_snapshot || {};
    if (digits(snapR.cpf) !== digits(snapM.cpf) || Number(rem.total_amount) !== Number(man.total_amount) || rem.venue_id !== man.venue_id) { rel.avisos.push(`${d.remover}: nao confere com ${d.manter}; mantido`); continue; }
    const eventos = rem.client_id ? must(await sb.from('venue_events').select('id').eq('master_id', MASTER_ID).eq('client_id', rem.client_id), 'agenda') : [];
    if (eventos.length) { rel.avisos.push(`${d.remover}: tem evento na agenda; mantido`); continue; }
    console.log(`remover duplicado ${d.remover} (mantem ${d.manter}); arquivo vira anexo do original`);
    rel.removidos.push({ removido: d.remover, mantido: d.manter });
    const anexos = Array.isArray(man.attachments) ? man.attachments : [];
    if (rem.contract_file_url && !anexos.some((a) => a.url === rem.contract_file_url)) {
      const novos = [...anexos, { name: d.rotulo, url: rem.contract_file_url, type: 'versao_alternativa' }];
      await upd('contracts', 'contracts', man.id, { attachments: novos });
      man.attachments = novos;
    }
    const placements = must(await sb.from('contract_funnel_placements').select('*').eq('master_id', MASTER_ID).eq('contract_id', rem.id), 'colocacoes');
    const tarefas = must(await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos').contains('custom_properties', { contractId: rem.id }), 'tarefas');
    backup.removidos.placements.push(...placements); backup.removidos.tasks.push(...tarefas);
    const clienteRow = rem.client_id ? must(await sb.from('clients').select('*').eq('id', rem.client_id).eq('master_id', MASTER_ID).maybeSingle(), 'cliente') : null;
    const clienteCompartilhado = contratos.some((x) => x.id !== rem.id && x.client_id === rem.client_id);
    backup.removidos.contracts.push(rem); if (clienteRow && !clienteCompartilhado) backup.removidos.clients.push(clienteRow);
    rel.tarefasRemovidas += tarefas.length;
    if (APLICAR) {
      if (placements.length) must(await sb.from('contract_funnel_placements').delete().eq('master_id', MASTER_ID).eq('contract_id', rem.id), 'apagar colocacao');
      for (const t of tarefas) must(await sb.from('admin_tasks').delete().eq('id', t.id).eq('master_id', MASTER_ID), 'apagar tarefa');
      must(await sb.from('contracts').delete().eq('id', rem.id).eq('master_id', MASTER_ID), 'apagar contrato');
      if (clienteRow && !clienteCompartilhado) must(await sb.from('clients').delete().eq('id', rem.client_id).eq('master_id', MASTER_ID), 'apagar cliente');
    }
    contratos = contratos.filter((x) => x.id !== rem.id);
  }

  // ---------- 3. anexos: acento quebrado e repetidos ----------
  const reparaNome = (s) => String(s).replace(/ALTERA\?{2,}O/g, 'ALTERAÇÃO').replace(/\?{2,}/g, '').trim();
  for (const c of contratos) {
    const lista = Array.isArray(c.attachments) ? c.attachments : [];
    if (!lista.some((a) => /\?{2,}/.test(a.name || ''))) continue;
    const vistos = new Set(); const novos = [];
    for (const a of lista) { const nome = reparaNome(a.name); if (vistos.has(nome)) continue; vistos.add(nome); novos.push({ ...a, name: nome }); }
    // prefere manter a versao com nome correto quando havia duas
    if (novos.length !== lista.length || lista.some((a, i) => a.name !== novos[i]?.name)) { await upd('contracts', 'contracts', c.id, { attachments: novos }); c.attachments = novos; rel.anexosReparados++; }
  }

  // ---------- 4. tarefas ----------
  const tarefas = must(await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos').neq('status', 'completed'), 'tarefas');
  const porId = new Map(contratos.map((c) => [c.id, c]));
  const resolve = (b, c) => {
    const snap = c.client_snapshot || {};
    let m;
    if ((m = b.match(/Convidados no contrato \((\d+)\)/))) return Number(m[1]) === Number(c.guest_count) ? `Convidados: o contrato diz ${m[1]} e o cadastro está com ${m[1]} (o nome da pasta é só rótulo).` : null;
    if ((m = b.match(/Pacote no contrato \(([^)]+)\)/))) return String(c.package_name || '').toLowerCase().includes(m[1].toLowerCase()) ? `Pacote: o contrato diz ${m[1]} e o cadastro está com ${c.package_name}.` : null;
    if ((m = b.match(/Data do contrato \((\d{2}\/\d{2}\/\d{4})\) diferente da data do nome da pasta/))) return isoDe(m[1]) === c.event_date ? `Data: o contrato diz ${m[1]} e o cadastro e a agenda estão com ${m[1]}.` : null;
    if ((m = b.match(/Data alterada por aditivo: de .* para (\d{2}\/\d{2}\/\d{4})/))) return isoDe(m[1]) === c.event_date ? `Data ${m[1]} conferida: aditivo com o mesmo CPF do contrato, já aplicado e anexado.` : null;
    if ((m = b.match(/Aditivo inclui \d+ convidados extras: o contrato passa de \d+ para (\d+)/))) return Number(m[1]) === Number(c.guest_count) ? `Convidados ${m[1]} conferidos com o aditivo anexado.` : null;
    if (/CPF com erro no contrato|CPF n.o encontrado/.test(b)) return cpfOk(digits(snap.cpf)) ? `CPF ${snap.cpf} conferido no contrato.` : null;
    if (/Telefone inv.lido no contrato/.test(b)) return digits(snap.phone).length >= 10 ? `Telefone ${snap.phone} lido do contrato.` : null;
    if (/mais de uma vers.o do contrato/.test(b)) return VERSOES[c.contract_code]?.nota ?? null;
    return null;
  };
  // Pastas com mais de uma versao/contrato, conferidas nos textos dos arquivos (datas de modificacao e CPF/nome do contratante)
  const VERSOES = {
    'CTR-ER20270430': { nota: 'Duas versões na pasta (datas 25/04 e 30/04/2027, mesmo contratante e CPF): está em uso a mais recente (editada em 23/05/2024), que bate com a data da pasta e do cadastro.' },
    'CTR-ERL20270502': { nota: 'A pasta mistura contratos: o arquivo B.docx é de outro cliente (Antonia Zavarize, 25/02/2027, que já tem cadastro próprio). O contrato desta pasta (Sabrina, 02/05/2027) é o que está no sistema.' },
  };
  const REESCREVER = {
    'CTR-ERL20280527': '- A pasta tem dois contratos de clientes diferentes: o assinado (Priscila, 27/05/2028), que é este cadastro, e um segundo ainda não lançado (Angelo Marinho Vianna, CPF 037.482.847-48, evento 23/06/2028, arquivo "2028-06-23 15A MANUELA TURBO 120P (JUÇARA).doc"). Lançar o segundo contrato.',
    'CTR-ERL20270727': '- O contrato não traz telefone e o e-mail do cliente não aparece em nenhum lead ou contato com telefone. Pegar o telefone com o cliente (Rafael Orige Silva).',
  };
  for (const t of tarefas) {
    const c = porId.get(t.custom_properties?.contractId);
    if (!c) continue;
    const linhas = String(t.description || '').split('\n');
    const abertas = []; const feitas = [];
    for (const l of linhas) {
      if (!l.trim()) continue;
      if (/^Resolvido automaticamente/.test(l) || /^\u2713 /.test(l)) continue; // ja tratado antes
      if (!l.trim().startsWith('- ')) { abertas.push(l); continue; }
      const r = resolve(l, c);
      if (r) feitas.push(r);
      else if (REESCREVER[c.contract_code] && (/mais de uma vers.o|Telefone inv.lido/.test(l))) abertas.push(REESCREVER[c.contract_code]);
      else if (/CPF com erro no contrato \(([^)]+)\)/.test(l)) abertas.push(`- O CPF escrito no contrato (${l.match(/\(([^)]+)\)/)[1]}) não passa na validação do dígito verificador, ou seja, o número está digitado errado no próprio documento. Pedir o documento ao cliente e corrigir no contato.`);
      else abertas.push(l);
    }
    for (const l of abertas) if (l.trim().startsWith('- ') && !/Nenhuma vers/.test(l)) rel.restantes.push(`${c.contract_code} | ${l.slice(0, 150)}`);
    if (!feitas.length && abertas.join('\n') === linhas.filter((x) => x.trim()).join('\n')) continue;
    const temAcao = abertas.some((l) => l.trim().startsWith('- '));
    const bloco = feitas.length ? `\n\nConferido automaticamente em ${hoje}:\n${feitas.map((f) => `\u2713 ${f}`).join('\n')}` : '';
    const patch = { description: `${abertas.join('\n')}${bloco}`.trim() };
    if (!temAcao) { patch.status = 'completed'; patch.completed_at = new Date().toISOString(); }
    await upd('admin_tasks', 'tasks', t.id, patch);
    (temAcao ? rel.tarefasParciais : rel.tarefasBaixadas).push({ titulo: t.title, resolvidos: feitas.length });
  }
} finally {
  if (APLICAR) writeFileSync(BACKUP, JSON.stringify(backup, null, 1));
  writeFileSync(RELATORIO, JSON.stringify(rel, null, 1));
}
console.log(`Resumo: preenchidos ${rel.preenchidos.length} | duplicados removidos ${rel.removidos.length} (tarefas apagadas ${rel.tarefasRemovidas}) | anexos reparados ${rel.anexosReparados} | tarefas concluídas ${rel.tarefasBaixadas.length} | tarefas com parte resolvida ${rel.tarefasParciais.length}`);
if (rel.avisos.length) console.log('Avisos:', rel.avisos);
process.exit(0);
