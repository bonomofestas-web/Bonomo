import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchAll(table, select = '*', orderCol = 'id') {
  const all = [];
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`Erro ao buscar ${table}:`, error);
      throw error;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function sqlValue(col, v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);

  if (col === 'target_pos_sale_funnel_ids') {
    if (Array.isArray(v)) {
      if (v.length === 0) return "'{}'::uuid[]";
      return `ARRAY[${v.map(id => `'${id}'::uuid`).join(', ')}]::uuid[]`;
    }
    return "'{}'::uuid[]";
  }

  if (typeof v === 'object') {
    const jsonStr = JSON.stringify(v);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }

  if (typeof v === 'string') {
    return `'${v.replace(/'/g, "''")}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildBatchUpsert(table, rows, batchSize = 50) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const updateCols = cols.filter(c => c !== 'id' && c !== 'created_at');
  const updateClauses = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

  const statements = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valueLines = batch.map(row => `(${cols.map(c => sqlValue(c, row[c])).join(', ')})`).join(',\n  ');
    statements.push(`INSERT INTO public."${table}" ("${cols.join('", "')}") VALUES\n  ${valueLines}\nON CONFLICT ("id") DO UPDATE SET ${updateClauses};`);
  }
  return statements.join('\n\n');
}

async function main() {
  console.log('--- Buscando dados de contratos e financeiro ---');
  const contracts = await fetchAll('contracts');
  const reviews = await fetchAll('fin_contract_reviews');
  const receivables = await fetchAll('fin_receivables');
  const payables = await fetchAll('fin_payables');

  console.log(`Contratos: ${contracts.length}`);
  console.log(`Revisões Financeiras: ${reviews.length}`);
  console.log(`Recebíveis (Finanças): ${receivables.length}`);
  console.log(`A Pagar (Finanças): ${payables.length}`);

  // PARTE 1: Apenas Contratos e Revisões de Finanças (SEM TOCAR EM CONTATOS/CLIENTES)
  const part1Header = [
    `-- ==============================================================================`,
    `-- PARTE 1: ATUALIZAÇÃO DOS 218 CONTRATOS (PREÇOS, R2, STATUS) E REVISÕES`,
    `-- NÃO MODIFICA A TABELA DE CONTATOS (ZERO RISCO DE CONFLITO DE TELEFONE)`,
    `-- Execute esta primeira parte no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 1. UPSERT CONTRATOS COM PREÇOS, LINKS R2 E STATUS (${contracts.length} registros)`,
    buildBatchUpsert('contracts', contracts, 50),
    ``,
    `-- 2. UPSERT REVISÕES FINANCEIRAS (${reviews.length} registros)`,
    buildBatchUpsert('fin_contract_reviews', reviews, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO PARTE 1:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contracts WHERE total_amount > 0 AND approval_status = 'approved') as contratos_com_preco_e_aprovados,`,
    `  (SELECT count(*) FROM public.contracts WHERE contract_file_url IS NOT NULL) as contratos_com_link_r2,`,
    `  (SELECT count(*) FROM public.fin_contract_reviews) as total_revisoes_financeiras;`
  ].join('\n');

  // PARTE 2: Recebíveis Lote 1 (primeiras 1400 parcelas)
  const recPart1 = receivables.slice(0, 1400);
  const part2Header = [
    `-- ==============================================================================`,
    `-- PARTE 2: RECEBÍVEIS DE FINANÇAS - LOTE 1 (Parcelas 1 a 1400)`,
    `-- Execute no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    `DELETE FROM public.fin_receivables WHERE source = 'simulacao';`,
    ``,
    buildBatchUpsert('fin_receivables', recPart1, 100),
    ``,
    `SET session_replication_role = 'origin';`,
    `SELECT count(*) as total_recebiveis_lote_1 FROM public.fin_receivables;`
  ].join('\n');

  // PARTE 3: Recebíveis Lote 2 (parcelas 1401 a 2841) + Contas a Pagar
  const recPart2 = receivables.slice(1400);
  const part3Header = [
    `-- ==============================================================================`,
    `-- PARTE 3: RECEBÍVEIS DE FINANÇAS - LOTE 2 (Parcelas 1401 a 2841) + CONTAS A PAGAR`,
    `-- Execute no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    buildBatchUpsert('fin_receivables', recPart2, 100),
    ``,
    `DELETE FROM public.fin_payables WHERE source = 'simulacao';`,
    buildBatchUpsert('fin_payables', payables, 100),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL COMPLETA:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contracts WHERE total_amount > 0 AND approval_status = 'approved') as contratos_aprovados,`,
    `  (SELECT count(*) FROM public.fin_contract_reviews) as total_revisoes,`,
    `  (SELECT count(*) FROM public.fin_receivables) as total_recebiveis,`,
    `  (SELECT count(*) FROM public.fin_payables) as total_a_pagar;`
  ].join('\n');

  writeFileSync('supabase/migrations/01_ATUALIZAR_CONTRATOS_E_CLIENTES.sql', part1Header, 'utf-8');
  writeFileSync('supabase/migrations/02_ATUALIZAR_FINANCEIRO_RECEBIVEIS_PARTE_1.sql', part2Header, 'utf-8');
  writeFileSync('supabase/migrations/03_ATUALIZAR_FINANCEIRO_RECEBIVEIS_PARTE_2.sql', part3Header, 'utf-8');

  console.log('Scripts atualizados com sucesso!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
