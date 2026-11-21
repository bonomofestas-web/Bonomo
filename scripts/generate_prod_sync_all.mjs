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
    let q = sb.from(table).select(select);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) {
      console.warn(`Aviso ao buscar ${table}:`, error.message);
      return [];
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

  if (col === 'target_pos_sale_funnel_ids' || col === 'assigned_to_ids') {
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
  if (!rows || rows.length === 0) return `-- (Nenhum registro para ${table})`;
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
  console.log('--- Buscando dados completos das tabelas locais ---');
  const contracts = await fetchAll('contracts');
  const clients = await fetchAll('clients');
  const events = await fetchAll('venue_events');
  const contractReviews = await fetchAll('fin_contract_reviews');
  const taskDatabases = await fetchAll('task_databases', '*', 'id');
  const taskStatuses = await fetchAll('task_custom_statuses', '*', 'id');
  const taskTypes = await fetchAll('task_custom_types', '*', 'id');
  const adminTasks = await fetchAll('admin_tasks', '*', 'id');
  const jobSectors = await fetchAll('job_sectors', '*', 'id');
  const jobRoles = await fetchAll('job_roles', '*', 'id');
  const jobRoleLabels = await fetchAll('job_role_labels', '*', 'id');
  const jobRoleOrder = await fetchAll('job_role_order', '*', 'id');
  const venueAgendaConfigs = await fetchAll('venue_agenda_configs', '*', 'id');
  const venueGoals = await fetchAll('venue_goals', '*', 'id');

  console.log(`Contratos: ${contracts.length}`);
  console.log(`Clientes Pós-Venda: ${clients.length}`);
  console.log(`Eventos da Agenda: ${events.length}`);
  console.log(`Reviews Financeiros: ${contractReviews.length}`);
  console.log(`Task Databases: ${taskDatabases.length}`);
  console.log(`Task Statuses: ${taskStatuses.length}`);
  console.log(`Task Types: ${taskTypes.length}`);
  console.log(`Admin Tasks: ${adminTasks.length}`);
  console.log(`Job Sectors: ${jobSectors.length}`);
  console.log(`Job Roles: ${jobRoles.length}`);
  console.log(`Job Role Labels: ${jobRoleLabels.length}`);
  console.log(`Job Role Order: ${jobRoleOrder.length}`);
  console.log(`Venue Agenda Configs: ${venueAgendaConfigs.length}`);
  console.log(`Venue Goals: ${venueGoals.length}`);

  const sql = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • SINCRONIZAÇÃO COMPLETA DE PRODUÇÃO:`,
    `-- Contratos (218), Clientes Pós-Venda (218), Eventos da Agenda (217),`,
    `-- Tarefas Operacionais (59), Configurações de Agenda, Metas e Setores/Cargos`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 0. GARANTE ESTRUTURA E POLÍTICAS DE ACESSO PARA SETORES, CARGOS E TAREFAS`,
    `CREATE TABLE IF NOT EXISTS public.job_sectors (`,
    `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`,
    `    master_id UUID NOT NULL,`,
    `    sector_id TEXT NOT NULL,`,
    `    name TEXT NOT NULL,`,
    `    color TEXT NOT NULL DEFAULT '#14A9D7',`,
    `    position INT NOT NULL DEFAULT 0,`,
    `    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),`,
    `    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),`,
    `    CONSTRAINT uq_job_sectors_master_sector UNIQUE (master_id, sector_id)`,
    `);`,
    `CREATE INDEX IF NOT EXISTS idx_job_sectors_master ON public.job_sectors(master_id, position);`,
    `ALTER TABLE public.job_sectors ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "job_sectors_master_scope" ON public.job_sectors;`,
    `CREATE POLICY "job_sectors_master_scope" ON public.job_sectors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    ``,
    `ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "job_roles_master_scope" ON public.job_roles;`,
    `DROP POLICY IF EXISTS "job_roles_policy" ON public.job_roles;`,
    `CREATE POLICY "job_roles_master_scope" ON public.job_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    ``,
    `ALTER TABLE public.job_role_labels ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "job_role_labels_master_scope" ON public.job_role_labels;`,
    `CREATE POLICY "job_role_labels_master_scope" ON public.job_role_labels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    ``,
    `ALTER TABLE public.job_role_order ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "job_role_order_master_scope" ON public.job_role_order;`,
    `DROP POLICY IF EXISTS "job_role_order_full_access" ON public.job_role_order;`,
    `CREATE POLICY "job_role_order_full_access" ON public.job_role_order FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    ``,
    `ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "admin_tasks_full_access" ON public.admin_tasks;`,
    `CREATE POLICY "admin_tasks_full_access" ON public.admin_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
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
    `-- 4. UPSERT DOS 217 EVENTOS NA AGENDA DE EVENTOS`,
    buildBatchUpsert('venue_events', events, 50),
    ``,
    `-- 5. UPSERT DOS REVIEWS FINANCEIROS`,
    buildBatchUpsert('fin_contract_reviews', contractReviews, 50),
    ``,
    `-- 6. UPSERT DO WORKSPACE DE TAREFAS (DATABASES, STATUSES, TYPES)`,
    buildBatchUpsert('task_databases', taskDatabases, 50),
    ``,
    buildBatchUpsert('task_custom_statuses', taskStatuses, 50),
    ``,
    buildBatchUpsert('task_custom_types', taskTypes, 50),
    ``,
    `-- 7. UPSERT DAS 59 TAREFAS OPERACIONAIS DOS CONTRATOS`,
    buildBatchUpsert('admin_tasks', adminTasks, 50),
    ``,
    `-- 8. UPSERT DOS SETORES E CARGOS DINÂMICOS (DIRETORIA, COMERCIAL, ETC)`,
    buildBatchUpsert('job_sectors', jobSectors, 50),
    ``,
    buildBatchUpsert('job_roles', jobRoles, 50),
    ``,
    buildBatchUpsert('job_role_labels', jobRoleLabels, 50),
    ``,
    buildBatchUpsert('job_role_order', jobRoleOrder, 50),
    ``,
    `-- 9. UPSERT DAS CONFIGURAÇÕES DE AGENDA E METAS DAS CASAS`,
    buildBatchUpsert('venue_agenda_configs', venueAgendaConfigs, 50),
    ``,
    buildBatchUpsert('venue_goals', venueGoals, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contracts) as total_contratos_reais,`,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.venue_events) as total_eventos_agenda,`,
    `  (SELECT count(*) FROM public.admin_tasks) as total_tarefas_admin,`,
    `  (SELECT count(*) FROM public.job_sectors) as total_setores;`
  ].join('\n');

  const outPath = 'supabase/migrations/05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql';
  writeFileSync(outPath, sql, 'utf-8');
  console.log(`✅ Gerado com sucesso: ${outPath} (${(sql.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
