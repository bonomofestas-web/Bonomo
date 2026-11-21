#!/usr/bin/env node
/**
 * SIMULACAO (banco LOCAL, so para visualizar o calendario financeiro): transforma o rascunho do plano de cada contrato
 * importado em parcelas a receber (source = 'simulacao') e cria algumas contas a pagar de exemplo com datas fixas.
 * Nao aprova nenhum contrato. Para apagar tudo: --limpar. Recusa rodar fora do banco local.
 * Datas que o contrato nao traz: parcelas comecam no proximo dia 10; sinal/entrada sem data sao ignorados.
 * Uso: node scripts/import-contratos/simulacao_financeiro.mjs [--limpar]
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf-8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(env.VITE_SUPABASE_URL || '')) { console.error('RECUSADO: o banco nao e local.'); process.exit(1); }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

if (process.argv.includes('--limpar')) {
  const a = await sb.from('fin_receivables').delete().eq('source', 'simulacao');
  const b = await sb.from('fin_payables').delete().eq('source', 'simulacao');
  console.log('Simulacao apagada.', a.error?.message || '', b.error?.message || '');
  process.exit(0);
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const addMonths = (s, m, day) => {
  const [y, mo, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1 + m, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day || d, last)).padStart(2, '0')}`;
};
const today = new Date();
const nextTenth = (() => { const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + (today.getUTCDate() > 10 ? 1 : 0), 10)); return iso(d); })();

const reviews = (await sb.from('fin_contract_reviews').select('contract_id, plan_snapshot, status').eq('status', 'pendente')).data || [];
const contracts = new Map();
for (let i = 0; i < reviews.length; i += 50) {
  const { data } = await sb.from('contracts').select('id, master_id, venue_id, client_id, contact_id, total_amount, event_date').in('id', reviews.slice(i, i + 50).map((r) => r.contract_id));
  (data || []).forEach((c) => contracts.set(c.id, c));
}

await sb.from('fin_receivables').delete().eq('source', 'simulacao');
const rows = [];
for (const r of reviews) {
  const c = contracts.get(r.contract_id);
  if (!c) continue;
  const items = r.plan_snapshot?.items || [];
  const base = { master_id: c.master_id, venue_id: c.venue_id, contract_id: c.id, client_id: c.client_id, contact_id: c.contact_id, competence_date: c.event_date, source: 'simulacao' };
  let seq = 0;
  const push = (kind, s, total, due, amount) => { if (!due || !(amount > 0)) return; rows.push({ ...base, id: randomUUID(), kind, seq: s, total_seq: total, due_date: due, amount: Math.round(amount * 100) / 100, payment_method: 'pix', import_key: `sim:${c.id}:${kind}:${seq++}` }); };
  let launched = 0;
  for (const it of items) {
    if (it.type === 'sinal' || it.type === 'entrada') { launched += Number(it.amount); push(it.type, 1, 1, it.date, Number(it.amount)); }
    else if (it.type === 'parcelas') {
      const n = it.count || 0;
      const first = it.first_due_date || nextTenth;
      for (let i = 0; i < n; i++) push('parcela', i + 1, n, addMonths(first, i, it.due_day), Number(it.amount));
      launched += Number(it.amount) * n;
    } else if (it.type === 'cartao') { launched += Number(it.gross_amount); push('cartao', 1, 1, it.date, Number(it.gross_amount)); }
    else if (it.type === 'pos_evento') { launched += Number(it.amount); push('pos_evento', 1, 1, c.event_date ? addDays(c.event_date, it.offset_days || 0) : null, Number(it.amount)); }
  }
  const saldo = items.find((i) => i.type === 'saldo');
  if (saldo) push('saldo', 1, 1, saldo.date || (c.event_date ? addDays(c.event_date, saldo.offset_days ?? -30) : null), Number(c.total_amount) - launched);
}
for (let i = 0; i < rows.length; i += 500) { const r = await sb.from('fin_receivables').insert(rows.slice(i, i + 500)); if (r.error) throw new Error(r.error.message); }

// contas a pagar de exemplo (datas fixas, por casa), 18 meses a partir do mes passado
const venues = (await sb.from('venues').select('id, name, master_id').limit(20)).data || [];
await sb.from('fin_payables').delete().eq('source', 'simulacao');
const pay = [];
const fixed = [['Aluguel', 18000, 5], ['Folha de pagamento', 42000, 5], ['Energia e água', 6500, 15], ['Impostos', 12000, 20]];
for (const v of venues) {
  const k = 1 + (venues.indexOf(v) % 3) * 0.15;
  for (let m = -1; m < 18; m++) for (const [name, val, day] of fixed) {
    pay.push({ id: randomUUID(), master_id: v.master_id, venue_id: v.id, description: `[Simulação] ${name}`, due_date: addMonths(iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), m, day), amount: Math.round(val * k), cost_nature: 'fixo', source: 'simulacao' });
  }
}
for (let i = 0; i < pay.length; i += 500) { const r = await sb.from('fin_payables').insert(pay.slice(i, i + 500)); if (r.error) throw new Error(r.error.message); }
console.log('Simulacao criada:', { parcelasAReceber: rows.length, contasAPagar: pay.length, contratos: reviews.length });
