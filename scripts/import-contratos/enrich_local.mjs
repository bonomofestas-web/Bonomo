#!/usr/bin/env node
/**
 * Enriquece os contratos IMPORTADOS que ja estao no banco LOCAL com o que o contrato diz sobre pagamento:
 * sinal (signal_amount), saldo, texto do pagamento combinado (payment_summary), etapa de fechamento (preenchido) e o
 * rascunho do plano na fila do financeiro (sinal + entrada + parcelas + saldo automatico). Nao recria nada e nao mexe
 * em contrato cujo plano o financeiro ja editou ou aprovou. Idempotente. Recusa rodar fora do banco local.
 * Uso: node scripts/import-contratos/enrich_local.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DIR = 'C:\\Users\\--\\Downloads\\Contratos_catalogo';
const DRY = process.argv.includes('--dry-run');
const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(env.VITE_SUPABASE_URL || '')) { console.error('RECUSADO: o banco nao e local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const iset = new Map(JSON.parse(readFileSync(`${DIR}\\import_set.json`, 'utf-8')).map((o) => ['contratos:' + o.key, o]));
const contracts = (await sb.from('contracts').select('id, master_id, total_amount, entry_amount, signal_amount, payment_summary, commercial_fields_snapshot').not('commercial_fields_snapshot->>importKey', 'is', null)).data || [];
const reviews = new Map(((await sb.from('fin_contract_reviews').select('id, contract_id, status, plan_snapshot').order('created_at', { ascending: false })).data || []).map((r) => [r.contract_id, r]));

let upd = 0, withSignal = 0, plansUpdated = 0, plansKept = 0, noData = 0;
for (const c of contracts) {
  const o = iset.get(c.commercial_fields_snapshot.importKey);
  if (!o) { noData++; continue; }
  const total = Number(c.total_amount);
  const signal = Number(o.signal || 0);
  const entry = Number(o.entry || 0);
  if (signal > 0) withSignal++;
  const patch = { signal_amount: signal, entry_amount: entry, balance_amount: Math.max(0, total - signal - entry), payment_summary: o.payment_summary || null, fill_stage: 'preenchido' };
  if (!DRY) { const r = await sb.from('contracts').update(patch).eq('id', c.id); if (r.error) throw new Error(r.error.message); }
  upd++;

  const rv = reviews.get(c.id);
  if (rv && rv.status === 'pendente') {
    // so substitui rascunho que ainda e o da importacao; o que o financeiro editou fica
    const isDraft = !rv.plan_snapshot?.source || rv.plan_snapshot.source === 'importacao';
    if (isDraft && o.payment_plan) {
      const notes = (o.payment_notes || []).join(' ');
      const plan = { ...o.payment_plan, note: 'Rascunho lido do contrato (datas são sugestão). Conferir o PDF e ajustar antes de aprovar.' + (notes ? ' ' + notes : '') };
      if (!DRY) { const r = await sb.from('fin_contract_reviews').update({ plan_snapshot: plan, plan_hash: String(plan.items.length) }).eq('id', rv.id); if (r.error) throw new Error(r.error.message); }
      plansUpdated++;
    } else plansKept++;
  }
}
console.log(DRY ? '--- SIMULACAO ---' : '--- FEITO ---', { contratosImportados: contracts.length, atualizados: upd, comSinal: withSignal, semDadosNoConjunto: noData, rascunhosAtualizados: plansUpdated, rascunhosPreservados: plansKept });
