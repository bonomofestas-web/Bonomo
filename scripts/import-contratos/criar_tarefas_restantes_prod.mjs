#!/usr/bin/env node
/**
 * Cria (ou complementa) tarefas para as pendencias que so uma pessoa resolve e que ainda nao tinham tarefa.
 * Padrao = dry-run. Log em tarefas_restantes_log.json. Uso: node ... [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const LOG = 'C:/Users/--/Downloads/Contratos_catalogo/tarefas_restantes_log.json';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const NL = String.fromCharCode(10);
if (process.argv.includes('--rollback')) {
  const l = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf-8')) : { criadas: [], alteradas: [] };
  console.log(`Rollback: ${l.criadas.length} criadas, ${l.alteradas.length} alteradas`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) { for (const id of l.criadas) must(await sb.from('admin_tasks').delete().eq('id', id).eq('master_id', MASTER_ID), 'apagar'); for (const r of l.alteradas) must(await sb.from('admin_tasks').upsert(r), 'restaurar'); }
  process.exit(0);
}
const PENDENCIAS = {
  'CTR-ER20261205': 'O CPF escrito no contrato (602.152,657-15) tem vírgula e não passa na validação do dígito verificador. Pedir o documento da contratante e corrigir no contato.',
  'CTR-VCF20270121': 'O CPF escrito no contrato (00741414102-30) tem dígitos a mais e não passa na validação. Pedir o documento da contratante e corrigir no contato.',
  'CTR-ERL20280204': 'O contrato não traz telefone e o e-mail do cliente não aparece em nenhum lead ou contato com telefone. Pegar o telefone com o cliente (Camilla Manso Barbosa).',
  'CTR-ERL20270314': 'Existem dois contratos da mesma contratante (Adriana Dinis, 18 anos da Danielle): este de 14/03/2027 e o CTR-ERL20270321 de 21/03/2027, mesmos CPF, valor e convidados. A versão de 14/03 foi editada depois (25/11/2025) e 14/03 é o aniversário dela, então ela provavelmente é a vigente, mas não é certo. Confirmar a data com o cliente, manter um e excluir o outro.',
  'CTR-ERL20271119': 'A pasta "15A KAUANNE BLACK 150P (CLEIDE)", de 17/06/2027, só continha uma cópia do contrato de outro cliente (Mariana, 19/11/2027), que foi anexada aqui. O contrato da Kauanne (Cleide) não foi encontrado: localizar e lançar.',
};
const cs = must(await sb.from('contracts').select('id, contract_code, venue_id, client_id, contact_id, title').eq('master_id', MASTER_ID).in('contract_code', Object.keys(PENDENCIAS)), 'contratos');
const abertas = must(await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos').neq('status', 'completed'), 'tarefas');
const log = { criadas: [], alteradas: [] };
for (const c of cs) {
  const txt = `- ${PENDENCIAS[c.contract_code]}`;
  const t = abertas.find((x) => x.custom_properties?.contractId === c.id);
  if (t) {
    console.log(`complementar tarefa de ${c.contract_code}`);
    if (APLICAR) { log.alteradas.push(t); must(await sb.from('admin_tasks').update({ description: `${t.description}${NL}${txt}` }).eq('id', t.id).eq('master_id', MASTER_ID), 'atualizar'); }
  } else {
    console.log(`criar tarefa para ${c.contract_code}`);
    const id = randomUUID();
    if (APLICAR) {
      must(await sb.from('admin_tasks').insert({
        id, master_id: MASTER_ID, venue_id: c.venue_id, database_id: 'default_collabs', title: `Ajustar cadastro importado: ${c.title}`, description: txt, status: 'todo', custom_status_id: 'st_todo',
        priority: 'medium', type: 'general', custom_type: 'Geral / Operacional', assigned_to_ids: [], due_date: null, due_time: null, created_by_name: 'Importação de contratos',
        custom_properties: { masterId: MASTER_ID, clientId: c.client_id, contractId: c.id, contactId: c.contact_id, leadName: c.title, clientName: c.title, origem: 'importacao_contratos', sector: 'pos_venda', semResponsavel: true },
      }), 'criar');
      log.criadas.push(id);
    }
  }
}
if (APLICAR) writeFileSync(LOG, JSON.stringify(log, null, 1));
process.exit(0);
