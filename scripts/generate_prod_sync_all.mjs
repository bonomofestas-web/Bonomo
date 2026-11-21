import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY, {
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
  console.log('--- Buscando dados de Contratos, Clientes e Eventos ---');
  const contracts = await fetchAll('contracts');
  const clients = await fetchAll('clients');
  const events = await fetchAll('venue_events');

  console.log(`Contratos: ${contracts.length}`);
  console.log(`Clientes Pós-Venda: ${clients.length}`);
  console.log(`Eventos da Agenda: ${events.length}`);

  const sql = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • SINCRONIZAÇÃO COMPLETA: 218 CONTRATOS, CLIENTES NO PÓS-VENDA E AGENDA`,
    `-- 1. Remove legados/duplicados para manter estritamente os 218 contratos reais`,
    `-- 2. Atualiza contratos com padrão oficial [Homenageados] [Evento] e CTR-[CASA][DATA]`,
    `-- 3. Insere todos os 218 clientes com seus funis e valores no pós-venda`,
    `-- 4. Insere todos os 217 eventos com data na Agenda de Eventos`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 1. LIMPEZA DOS CONTRATOS LEGADOS (MANTÉM APENAS OS 218 REAIS)`,
    `DELETE FROM public.contracts `,
    `WHERE commercial_fields_snapshot->>'origem' IS NULL `,
    `   OR commercial_fields_snapshot->>'origem' != 'importacao_contratos';`,
    ``,
    `-- 2. UPSERT DOS 218 CONTRATOS REAIS`,
    buildBatchUpsert('contracts', contracts, 50),
    ``,
    `-- 3. UPSERT DOS 218 CLIENTES NO PÓS-VENDA`,
    buildBatchUpsert('clients', clients, 50),
    ``,
    `-- 4. UPSERT DOS 217 EVENTOS NA AGENDA`,
    buildBatchUpsert('venue_events', events, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contracts) as total_contratos_reais,`,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.venue_events) as total_eventos_agenda;`
  ].join('\n');

  const outPath = 'supabase/migrations/05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql';
  writeFileSync(outPath, sql, 'utf-8');
  console.log(`✅ Gerado com sucesso: ${outPath} (${(sql.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
