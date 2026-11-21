#!/usr/bin/env node
/**
 * Coloca os contratos IMPORTADOS na fila de aprovacao do financeiro (banco LOCAL), cada um com um rascunho de plano de
 * pagamento montado a partir do que foi lido no contrato (entrada, sinal, parcelas, saldo). Sem datas: o financeiro
 * confere o PDF, completa e aprova contrato por contrato. Contrato importado nao pode ser reprovado.
 * Idempotente (nao duplica revisao). Recusa rodar fora do banco local.
 * Uso: node scripts/import-contratos/seed_reviews.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const DRY = process.argv.includes('--dry-run');
const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(env.VITE_SUPABASE_URL || '')) { console.error('RECUSADO: o banco nao e local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const cat = new Map(JSON.parse(readFileSync(`${DIR}\\catalogo.json`, 'utf-8')).map((e) => [e.event_key, e]));
const visual = JSON.parse(readFileSync(`${DIR}\\leitura_visual.json`, 'utf-8'));

const contracts = (await sb.from('contracts').select('id, master_id, total_amount, commercial_fields_snapshot').not('commercial_fields_snapshot->>importKey', 'is', null)).data || [];
const existing = new Set(((await sb.from('fin_contract_reviews').select('contract_id')).data || []).map((r) => r.contract_id));

const iset = new Map(JSON.parse(readFileSync(`${DIR}\import_set.json`, 'utf-8')).map((o) => ['contratos:' + o.key, o]));
// Rascunho vindo de payment_info.py: sinal + entrada + parcelas + saldo automatico (30 dias antes da festa, ou a data que o contrato traz)
function draftPlan(importKey) {
  const o = iset.get(importKey);
  const plan = o?.payment_plan || { version: 1, items: [], source: 'importacao' };
  const notes = (o?.payment_notes || []).join(' ');
  return { ...plan, note: 'Rascunho lido do contrato (datas são sugestão). Conferir o PDF e ajustar antes de aprovar.' + (notes ? ' ' + notes : '') };
}

let created = 0, empty = 0, fits = 0;
const rows = [];
for (const c of contracts) {
  if (existing.has(c.id)) continue;
  const plan = draftPlan(c.commercial_fields_snapshot.importKey);
  if (!plan.items.length) empty++;
  const sum = plan.items.reduce((a, it) => a + (it.type === 'parcelas' ? it.amount * it.count : it.type === 'saldo' ? 0 : it.amount), 0);
  if (sum <= Number(c.total_amount) + 0.02) fits++;
  rows.push({ master_id: c.master_id, contract_id: c.id, status: 'pendente', plan_snapshot: plan, plan_hash: String(plan.items.length) });
  created++;
}
if (!DRY && rows.length) {
  for (let i = 0; i < rows.length; i += 100) { const r = await sb.from('fin_contract_reviews').insert(rows.slice(i, i + 100)); if (r.error) throw new Error(r.error.message); }
}
console.log(DRY ? '--- SIMULACAO ---' : '--- FEITO ---', { contratos: contracts.length, revisoesCriadas: created, rascunhoVazio: empty, rascunhoJaFechaComTotal: fits, visualSemComponentes: Object.keys(visual).length });
