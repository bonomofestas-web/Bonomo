#!/usr/bin/env node
/**
 * Cria em PRODUCAO a revisao financeira pendente (fin_contract_reviews) dos contratos aprovados que ainda nao tem,
 * com o plano de pagamento lido do contrato (payment_terms) como rascunho. Mesma regra usada nos 218 primeiros contratos.
 * Padrao = dry-run. Log para --rollback. Uso: node scripts/import-contratos/seed_reviews_prod.mjs [--aplicar] [--rollback]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const LOG = 'C:/Users/--/Downloads/Contratos_catalogo/reviews_prod_log.json';
const MASTER_ID = 'a0000000-0000-0000-0000-000000000001';
const APLICAR = process.argv.includes('--aplicar');
const env = Object.fromEntries(readFileSync('.env', 'utf-8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.VITE_SUPABASE_URL || /127\.0\.0\.1|localhost/.test(env.VITE_SUPABASE_URL)) { console.error('RECUSADO: o .env nao aponta para a producao.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
// mesmo hash de src/services/financeService.ts
const planHash = (plan) => { const s = JSON.stringify(plan?.items || []); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };

if (process.argv.includes('--rollback')) {
  const ids = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf-8')) : [];
  console.log(`Rollback: ${ids.length} revisoes`, APLICAR ? '' : '(dry-run)');
  if (APLICAR) for (const id of ids) must(await sb.from('fin_contract_reviews').delete().eq('id', id).eq('master_id', MASTER_ID), 'apagar');
  process.exit(0);
}
const cs = must(await sb.from('contracts').select('id, contract_code, payment_terms, approval_status').eq('master_id', MASTER_ID).in('approval_status', ['approved', 'completed']), 'contratos');
const tem = new Set(must(await sb.from('fin_contract_reviews').select('contract_id').eq('master_id', MASTER_ID), 'revisoes').map((r) => r.contract_id));
const rows = []; let comPlano = 0;
for (const c of cs) {
  if (tem.has(c.id)) continue;
  const pt = c.payment_terms && Array.isArray(c.payment_terms.items) && c.payment_terms.items.length ? c.payment_terms : null;
  if (pt) comPlano++;
  const plan = pt ? { ...pt, note: 'Rascunho lido do contrato (datas são sugestão). Conferir o PDF e ajustar antes de aprovar.' } : { version: 1, items: [], source: 'importacao', note: 'Plano de pagamento não lido do contrato. Conferir o PDF e lançar antes de aprovar.' };
  rows.push({ id: randomUUID(), master_id: MASTER_ID, contract_id: c.id, status: 'pendente', plan_snapshot: plan, plan_hash: planHash(plan) });
}
console.log(`${APLICAR ? 'APLICAR' : 'dry-run'}: ${rows.length} revisoes a criar (${comPlano} com plano lido, ${rows.length - comPlano} sem plano)`);
if (APLICAR && rows.length) {
  for (let i = 0; i < rows.length; i += 100) must(await sb.from('fin_contract_reviews').insert(rows.slice(i, i + 100)), 'inserir');
  writeFileSync(LOG, JSON.stringify(rows.map((r) => r.id)));
}
process.exit(0);
