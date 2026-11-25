#!/usr/bin/env node
/**
 * Grava em producao o plano de pagamento estruturado lido dos PDFs (pagamentos_aplicar.json, gerado pela releitura dos contratos
 * baixados do R2): payment_terms (formato de src/utils/paymentPlan.ts), sinal, entrada, saldo e resumo. So grava planos que a
 * validacao do sistema aceita. Os que nao fecham ou nao foram lidos viram aviso na tarefa do contrato.
 * Padrao = dry-run. Backup dos valores anteriores em pagamentos_backup.json. Uso: node ... [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describePlan, planSignalEntry, validatePlan, toCents } from '../../src/utils/paymentPlan.ts';

const DIR = 'C:/Users/--/Downloads/Contratos_catalogo';
const BACKUP = `${DIR}/pagamentos_backup.json`;
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const NL = String.fromCharCode(10);

if (process.argv.includes('--rollback')) {
  const b = existsSync(BACKUP) ? JSON.parse(readFileSync(BACKUP, 'utf-8')) : { contratos: [], tarefasCriadas: [], tarefasAlteradas: [] };
  console.log(`Rollback: ${b.contratos.length} contratos, ${b.tarefasCriadas.length} tarefas criadas, ${b.tarefasAlteradas.length} alteradas`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) {
    for (const r of b.contratos) must(await sb.from('contracts').update(r.antes).eq('id', r.id).eq('master_id', MASTER_ID), 'restaurar contrato');
    for (const id of b.tarefasCriadas) must(await sb.from('admin_tasks').delete().eq('id', id).eq('master_id', MASTER_ID), 'apagar tarefa');
    for (const t of b.tarefasAlteradas) must(await sb.from('admin_tasks').upsert(t), 'restaurar tarefa');
  }
  process.exit(0);
}

const { aplicar, alertas } = JSON.parse(readFileSync(`${DIR}/pagamentos_aplicar.json`, 'utf-8'));
const cs = must(await sb.from('contracts').select('id, contract_code, venue_id, client_id, contact_id, title, total_amount, event_date, approval_status, payment_terms, payment_summary, entry_amount, signal_amount, balance_amount').eq('master_id', MASTER_ID), 'contratos');
const porCodigo = new Map(cs.map((c) => [c.contract_code, c]));
const backup = { contratos: [], tarefasCriadas: [], tarefasAlteradas: [] };
const rel = { aplicados: 0, recusados: [], resumosReparados: 0, avisos: 0 };
const campos = (c) => ({ payment_terms: c.payment_terms, payment_summary: c.payment_summary, entry_amount: c.entry_amount, signal_amount: c.signal_amount, balance_amount: c.balance_amount });

for (const c of cs) {
  if (c.approval_status === 'canceled') continue;
  const p = aplicar[c.contract_code];
  let patch = null;
  if (p) {
    const total = Number(c.total_amount || 0);
    const plan = { version: 1, items: p.items, source: 'importacao' };
    let v = validatePlan(plan, total, { hasEventDate: !!c.event_date, eventDate: c.event_date });
    if (v.errors.length && Math.abs(v.diffCents) <= 100) {
      // diferenca de centavos do arredondamento das parcelas no contrato: a ultima parcela absorve
      const par = [...plan.items].reverse().find((i) => i.type === 'parcelas');
      if (par) {
        const ultima = par.last_amount ?? par.amount;
        par.last_amount = Math.round(toCents(ultima) - v.diffCents) / 100;
        plan.note = `Ultima parcela ajustada em R$ ${(Math.abs(v.diffCents) / 100).toFixed(2).replace('.', ',')} (arredondamento do contrato).`;
        v = validatePlan(plan, total, { hasEventDate: !!c.event_date, eventDate: c.event_date });
      }
    }
    if (v.errors.length) { rel.recusados.push(`${c.contract_code}: ${v.errors[0]}`); }
    else {
      const { signal, entry } = planSignalEntry(plan);
      patch = { payment_terms: plan, payment_summary: describePlan(plan, total) || null, signal_amount: signal, entry_amount: entry, balance_amount: Math.round((total - signal - entry) * 100) / 100 };
      rel.aplicados++;
    }
  }
  if (!patch && /at\?\?/.test(c.payment_summary || '')) { patch = { payment_summary: c.payment_summary.replace(/at\?\?/g, 'até') }; rel.resumosReparados++; }
  if (!patch) continue;
  backup.contratos.push({ id: c.id, antes: Object.fromEntries(Object.keys(patch).map((k) => [k, campos(c)[k]])) });
  if (APLICAR) must(await sb.from('contracts').update(patch).eq('id', c.id).eq('master_id', MASTER_ID), 'atualizar contrato');
}

// avisos nas tarefas
const abertas = must(await sb.from('admin_tasks').select('*').eq('master_id', MASTER_ID).eq('created_by_name', 'Importação de contratos').neq('status', 'completed'), 'tarefas');
for (const [code, texto] of Object.entries(alertas)) {
  const c = porCodigo.get(code);
  if (!c || c.approval_status === 'canceled') continue;
  const t = abertas.find((x) => x.custom_properties?.contractId === c.id);
  const linha = `- ${texto}`;
  rel.avisos++;
  if (t) {
    if (String(t.description).includes('Plano de pagamento:')) continue;
    if (APLICAR) { backup.tarefasAlteradas.push(t); must(await sb.from('admin_tasks').update({ description: `${t.description}${NL}${linha}` }).eq('id', t.id).eq('master_id', MASTER_ID), 'atualizar tarefa'); }
  } else if (APLICAR) {
    const id = randomUUID();
    must(await sb.from('admin_tasks').insert({
      id, master_id: MASTER_ID, venue_id: c.venue_id, database_id: 'default_collabs', title: `Ajustar cadastro importado: ${c.title}`, description: linha, status: 'todo', custom_status_id: 'st_todo',
      priority: 'medium', type: 'general', custom_type: 'Geral / Operacional', assigned_to_ids: [], due_date: null, due_time: null, created_by_name: 'Importação de contratos',
      custom_properties: { masterId: MASTER_ID, clientId: c.client_id, contractId: c.id, contactId: c.contact_id, leadName: c.title, clientName: c.title, origem: 'importacao_contratos', sector: 'pos_venda', semResponsavel: true },
    }), 'criar tarefa');
    backup.tarefasCriadas.push(id);
  }
}
if (APLICAR) writeFileSync(BACKUP, JSON.stringify(backup, null, 1));
console.log(`${APLICAR ? 'APLICADO' : 'dry-run'}: planos gravados ${rel.aplicados} | recusados pela validacao ${rel.recusados.length} | resumos reparados ${rel.resumosReparados} | avisos em tarefas ${rel.avisos}`);
if (rel.recusados.length) console.log(rel.recusados.slice(0, 15));
process.exit(0);
