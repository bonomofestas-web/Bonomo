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

const GENERATED_COLS = new Set([
  'primary_phone_digits',
  'secondary_phone_digits',
  'cpf_digits',
  'primary_phone_key',
]);

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

  // Array column specifically for target_pos_sale_funnel_ids
  if (col === 'target_pos_sale_funnel_ids') {
    if (Array.isArray(v)) {
      if (v.length === 0) return "'{}'::uuid[]";
      return `ARRAY[${v.map(id => `'${id}'::uuid`).join(', ')}]::uuid[]`;
    }
    return "'{}'::uuid[]";
  }

  // JSON / JSONB
  if (typeof v === 'object') {
    const jsonStr = JSON.stringify(v);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }

  if (typeof v === 'string') {
    return `'${v.replace(/'/g, "''")}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildUpsertStatement(table, rows) {
  if (!rows || rows.length === 0) return '';
  const rawCols = Object.keys(rows[0]);
  const cols = rawCols.filter(c => !GENERATED_COLS.has(c));
  const updateCols = cols.filter(c => c !== 'id' && c !== 'created_at');

  const statements = [];
  for (const row of rows) {
    const vals = cols.map(c => sqlValue(c, row[c])).join(', ');
    const updateClauses = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
    const sql = `INSERT INTO public."${table}" ("${cols.join('", "')}") VALUES (${vals}) ON CONFLICT ("id") DO UPDATE SET ${updateClauses};`;
    statements.push(sql);
  }
  return statements.join('\n');
}

function buildBatchInsert(table, rows, batchSize = 100) {
  if (!rows || rows.length === 0) return '';
  const rawCols = Object.keys(rows[0]);
  const cols = rawCols.filter(c => !GENERATED_COLS.has(c));
  const statements = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valueLines = batch.map(row => `(${cols.map(c => sqlValue(c, row[c])).join(', ')})`).join(',\n  ');
    statements.push(`INSERT INTO public."${table}" ("${cols.join('", "')}") VALUES\n  ${valueLines}\nON CONFLICT ("id") DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')};`);
  }
  return statements.join('\n\n');
}

async function main() {
  console.log('--- Buscando dados locais ---');
  const contacts = await fetchAll('contacts');
  const clients = await fetchAll('clients');
  const contracts = await fetchAll('contracts');
  const reviews = await fetchAll('fin_contract_reviews');
  const receivables = await fetchAll('fin_receivables');
  const payables = await fetchAll('fin_payables');

  console.log(`Contatos: ${contacts.length}`);
  console.log(`Clientes: ${clients.length}`);
  console.log(`Contratos: ${contracts.length}`);
  console.log(`Revisões Financeiras: ${reviews.length}`);
  console.log(`Recebíveis (Finanças): ${receivables.length}`);
  console.log(`A Pagar (Finanças): ${payables.length}`);

  const sqlParts = [
    `-- ==============================================================================`,
    `-- ATUALIZAÇÃO DEFINITIVA DE CONTRATOS E FINANCEIRO PARA PRODUÇÃO (F5 SYSTEM)`,
    `-- Gerado em: ${new Date().toISOString()}`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 1. UPSERT CONTATOS (${contacts.length} registros)`,
    buildUpsertStatement('contacts', contacts),
    ``,
    `-- 2. UPSERT CLIENTES (${clients.length} registros)`,
    buildUpsertStatement('clients', clients),
    ``,
    `-- 3. UPSERT CONTRATOS COM PREÇOS, LINKS R2 E STATUS (${contracts.length} registros)`,
    buildUpsertStatement('contracts', contracts),
    ``,
    `-- 4. UPSERT REVISÕES FINANCEIRAS (${reviews.length} registros)`,
    buildUpsertStatement('fin_contract_reviews', reviews),
    ``,
    `-- 5. LIMPEZA E CARGA DE RECEBÍVEIS (CALENDÁRIO E VISÃO GERAL DE FINANÇAS)`,
    `DELETE FROM public.fin_receivables WHERE source = 'simulacao';`,
    buildBatchInsert('fin_receivables', receivables, 100),
    ``,
    `-- 6. LIMPEZA E CARGA DE CONTAS A PAGAR`,
    `DELETE FROM public.fin_payables WHERE source = 'simulacao';`,
    buildBatchInsert('fin_payables', payables, 100),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contracts WHERE total_amount > 0 AND approval_status = 'approved') as contratos_aprovados_com_preco,`,
    `  (SELECT count(*) FROM public.contracts WHERE contract_file_url IS NOT NULL) as contratos_com_link_r2,`,
    `  (SELECT count(*) FROM public.fin_contract_reviews) as total_revisoes_financeiras,`,
    `  (SELECT count(*) FROM public.fin_receivables) as total_recebiveis_financeiro;`
  ];

  const targetPath = 'supabase/migrations/ATUALIZAR_CONTRATOS_FINANCEIRO_PRODUCAO.sql';
  writeFileSync(targetPath, sqlParts.join('\n'), 'utf-8');
  console.log(`\nScript gerado com sucesso em: ${targetPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
