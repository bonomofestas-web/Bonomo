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

const GENERATED_COLUMNS = new Set([
  'primary_phone_digits',
  'secondary_phone_digits',
  'cpf_digits',
  'primary_phone_key'
]);

function buildBatchUpsert(table, rows, batchSize = 50) {
  if (!rows || rows.length === 0) return `-- (Nenhum registro para ${table})`;
  const cols = Object.keys(rows[0]).filter(c => !GENERATED_COLUMNS.has(c));
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
  const contacts = await fetchAll('contacts', '*', 'id');
  const contactDependents = await fetchAll('contact_dependents', '*', 'id');
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

  console.log(`Contatos: ${contacts.length}`);
  console.log(`Dependentes de Contatos: ${contactDependents.length}`);
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

  const sqlHeader = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • SINCRONIZAÇÃO COMPLETA DE PRODUÇÃO:`,
    `-- Contatos (${contacts.length}), Dependentes (${contactDependents.length}), Contratos (${contracts.length}),`,
    `-- Clientes Pós-Venda (${clients.length}), Eventos da Agenda (${events.length}),`,
    `-- Tarefas Operacionais (${adminTasks.length}), Configurações de Agenda, Metas e Setores/Cargos`,
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
    `-- GARANTE COLUNAS NECESSÁRIAS NAS TABELAS DE CLIENTES, CONTRATOS, CONTATOS, EVENTOS E TAREFAS`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_title TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contact_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contact_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS venue_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_supplier BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS supplier_profile JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_name TEXT;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS blocks_venue_day BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_name TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS database_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS content TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_properties JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_status_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_type TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS mandatory_feedback BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS assigned_to_ids UUID[] DEFAULT '{}'::uuid[];`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;`,
    `ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "admin_tasks_full_access" ON public.admin_tasks;`,
    `CREATE POLICY "admin_tasks_full_access" ON public.admin_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    `ALTER TABLE public.venue_goals ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.venue_goals ADD COLUMN IF NOT EXISTS appointments_target INT;`,
    ``
  ].join('\n');

  const canonicalContactPhones = contacts.map(c => c.primary_phone).filter(Boolean);
  const canonicalContactKeys = Array.from(new Set(contacts.map(c => c.primary_phone_key).filter(Boolean)));
  const canonicalContactIds = contacts.map(c => c.id).filter(Boolean);

  const contactDeduplicationBlock = [
    `-- 1. RESOLUÇÃO DE CONFLITOS EM uq_contacts_master_phone_key E idx_contacts_master_primary_phone (DEDUPLICAÇÃO DE PRODUÇÃO)`,
    `-- Remove os contatos antigos em produção que possuam chaves de telefone em comum com a base canônica mas com IDs legados divergentes`,
    `DELETE FROM public.contact_dependents `,
    `WHERE parent_contact_id IN (`,
    `  SELECT id FROM public.contacts `,
    `  WHERE (primary_phone_key IN (${canonicalContactKeys.map(k => `'${k}'`).join(', ')})`,
    `     OR primary_phone IN (${canonicalContactPhones.map(p => `'${p}'`).join(', ')}))`,
    `    AND id NOT IN (${canonicalContactIds.map(id => `'${id}'::uuid`).join(', ')})`,
    `);`,
    ``,
    `DELETE FROM public.contacts `,
    `WHERE (primary_phone_key IN (${canonicalContactKeys.map(k => `'${k}'`).join(', ')})`,
    `   OR primary_phone IN (${canonicalContactPhones.map(p => `'${p}'`).join(', ')}))`,
    `  AND id NOT IN (${canonicalContactIds.map(id => `'${id}'::uuid`).join(', ')});`,
    ``
  ].join('\n');

  // PARTE 1 (05A): ESTRUTURA, CONTATOS E DEPENDENTES
  const sqlPartA = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • MIGRATION 05A: ESTRUTURA E CONTATOS (SEM CONFLITO DE CARGOS)`,
    `-- Execução 1 de 3 no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    sqlHeader,
    contactDeduplicationBlock,
    `-- 2. UPSERT DOS CONTATOS E DEPENDENTES`,
    buildBatchUpsert('contacts', contacts, 50),
    ``,
    buildBatchUpsert('contact_dependents', contactDependents, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `SELECT `,
    `  (SELECT count(*) FROM public.contacts) as total_contatos,`,
    `  (SELECT count(*) FROM public.contact_dependents) as total_dependentes;`
  ].join('\n');

  // PARTE 2 (05B): LIMPEZA E UPSERT DOS 218 CONTRATOS REAIS
  const sqlPartB = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • MIGRATION 05B: 218 CONTRATOS REAIS`,
    `-- Execução 2 de 4 no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- GARANTE COLUNAS NECESSÁRIAS NAS TABELAS DE CONTRATOS`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contact_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS venue_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_id UUID;`,
    ``,
    `-- 1. LIMPEZA DOS CONTRATOS LEGADOS (MANTÉM APENAS OS 218 REAIS)`,
    `DELETE FROM public.contracts `,
    `WHERE commercial_fields_snapshot->>'origem' IS NULL `,
    `   OR commercial_fields_snapshot->>'origem' != 'importacao_contratos';`,
    ``,
    `-- 2. UPSERT DOS 218 CONTRATOS REAIS`,
    buildBatchUpsert('contracts', contracts, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `SELECT (SELECT count(*) FROM public.contracts) as total_contratos_reais;`
  ].join('\n');

  // PARTE 3 (05C): CLIENTES NO PÓS-VENDA E REVIEWS FINANCEIROS
  const sqlPartC = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • MIGRATION 05C: 218 CLIENTES PÓS-VENDA E REVIEWS FINANCEIROS`,
    `-- Execução 3 de 4 no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- GARANTE COLUNAS NECESSÁRIAS NA TABELA DE CLIENTES`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_title TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contact_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;`,
    ``,
    `-- 1. UPSERT DOS 218 CLIENTES NO PÓS-VENDA`,
    buildBatchUpsert('clients', clients, 50),
    ``,
    `-- 2. UPSERT DOS REVIEWS FINANCEIROS`,
    buildBatchUpsert('fin_contract_reviews', contractReviews, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `SELECT `,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.fin_contract_reviews) as total_reviews_financeiros;`
  ].join('\n');

  // PARTE 4 (05D): AGENDA DE EVENTOS E TAREFAS OPERACIONAIS
  const sqlPartD = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • MIGRATION 05D: AGENDA DE EVENTOS E TAREFAS OPERACIONAIS`,
    `-- Execução 3 de 3 no SQL Editor do Supabase`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- GARANTE COLUNAS NECESSÁRIAS NAS TABELAS DE EVENTOS E TAREFAS`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_name TEXT;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS blocks_venue_day BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_name TEXT;`,
    ``,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS database_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS content TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_properties JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_status_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_type TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS mandatory_feedback BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS assigned_to_ids UUID[] DEFAULT '{}'::uuid[];`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;`,
    `ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "admin_tasks_full_access" ON public.admin_tasks;`,
    `CREATE POLICY "admin_tasks_full_access" ON public.admin_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    ``,
    `-- 1. UPSERT DOS 217 EVENTOS NA AGENDA DE EVENTOS`,
    buildBatchUpsert('venue_events', events, 50),
    ``,
    `-- 2. UPSERT DAS 59 TAREFAS OPERACIONAIS DOS CONTRATOS`,
    buildBatchUpsert('admin_tasks', adminTasks, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL COMPLETA:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contacts) as total_contatos,`,
    `  (SELECT count(*) FROM public.contracts) as total_contratos_reais,`,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.venue_events) as total_eventos_agenda,`,
    `  (SELECT count(*) FROM public.admin_tasks) as total_tarefas_admin;`
  ].join('\n');

  // ARQUIVO UNIFICADO (para quem roda via psql CLI)
  const sqlFull = [
    sqlHeader,
    contactDeduplicationBlock,
    `-- 2. UPSERT DOS CONTATOS E DEPENDENTES`,
    buildBatchUpsert('contacts', contacts, 50),
    ``,
    buildBatchUpsert('contact_dependents', contactDependents, 50),
    ``,
    `-- 2. LIMPEZA DOS CONTRATOS LEGADOS (MANTÉM APENAS OS 218 REAIS)`,
    `DELETE FROM public.contracts `,
    `WHERE commercial_fields_snapshot->>'origem' IS NULL `,
    `   OR commercial_fields_snapshot->>'origem' != 'importacao_contratos';`,
    ``,
    `-- 3. UPSERT DOS 218 CONTRATOS REAIS`,
    buildBatchUpsert('contracts', contracts, 50),
    ``,
    `-- 4. UPSERT DOS 218 CLIENTES NO PÓS-VENDA`,
    buildBatchUpsert('clients', clients, 50),
    ``,
    `-- 5. UPSERT DOS 217 EVENTOS NA AGENDA DE EVENTOS`,
    buildBatchUpsert('venue_events', events, 50),
    ``,
    `-- 6. UPSERT DOS REVIEWS FINANCEIROS`,
    buildBatchUpsert('fin_contract_reviews', contractReviews, 50),
    ``,
    `-- 7. UPSERT DAS 59 TAREFAS OPERACIONAIS DOS CONTRATOS`,
    buildBatchUpsert('admin_tasks', adminTasks, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contacts) as total_contatos,`,
    `  (SELECT count(*) FROM public.contracts) as total_contratos_reais,`,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.venue_events) as total_eventos_agenda,`,
    `  (SELECT count(*) FROM public.admin_tasks) as total_tarefas_admin;`
  ].join('\n');

  const outPathA = 'supabase/migrations/05A_SINCRONIZAR_ESTRUTURA_E_CONTATOS.sql';
  writeFileSync(outPathA, sqlPartA, 'utf-8');
  console.log(`✅ Gerado: ${outPathA} (${(sqlPartA.length / 1024).toFixed(1)} KB)`);

  const outPathB = 'supabase/migrations/05B_SINCRONIZAR_218_CONTRATOS.sql';
  writeFileSync(outPathB, sqlPartB, 'utf-8');
  console.log(`✅ Gerado: ${outPathB} (${(sqlPartB.length / 1024).toFixed(1)} KB)`);

  const outPathC = 'supabase/migrations/05C_SINCRONIZAR_218_CLIENTES_POSVENDA.sql';
  writeFileSync(outPathC, sqlPartC, 'utf-8');
  console.log(`✅ Gerado: ${outPathC} (${(sqlPartC.length / 1024).toFixed(1)} KB)`);

  const outPathD = 'supabase/migrations/05D_SINCRONIZAR_AGENDA_METAS_TAREFAS.sql';
  writeFileSync(outPathD, sqlPartD, 'utf-8');
  console.log(`✅ Gerado: ${outPathD} (${(sqlPartD.length / 1024).toFixed(1)} KB)`);

  // ARQUIVO APENAS O QUE FALTA EM PRODUÇÃO (Contatos, Clientes, Eventos da Agenda e Tarefas Operacionais)
  const sqlPending = [
    `-- ==============================================================================`,
    `-- F5 SYSTEM • MIGRATION DIRETA: APENAS O QUE FALTA EM PRODUÇÃO`,
    `-- Execução única e definitiva no SQL Editor do Supabase`,
    `-- Contatos (257), Clientes Pós-Venda (218), Agenda (217) e Tarefas Operacionais (59)`,
    `-- ==============================================================================`,
    `SET session_replication_role = 'replica';`,
    ``,
    `-- 0. GARANTE TODAS AS COLUNAS NECESSÁRIAS NAS TABELAS`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_title TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contract_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_to_contact_id UUID;`,
    `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contact_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS venue_id UUID;`,
    `ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_supplier BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS supplier_profile JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS client_name TEXT;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS blocks_venue_day BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_id UUID;`,
    `ALTER TABLE public.venue_events ADD COLUMN IF NOT EXISTS created_by_name TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS database_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS content TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_properties JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_status_id TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS custom_type TEXT;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS mandatory_feedback BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS assigned_to_ids UUID[] DEFAULT '{}'::uuid[];`,
    `ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;`,
    `ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "admin_tasks_full_access" ON public.admin_tasks;`,
    `CREATE POLICY "admin_tasks_full_access" ON public.admin_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`,
    `ALTER TABLE public.venue_goals ADD COLUMN IF NOT EXISTS master_id UUID;`,
    `ALTER TABLE public.venue_goals ADD COLUMN IF NOT EXISTS appointments_target INT;`,
    ``,
    contactDeduplicationBlock,
    `-- 1. UPSERT DOS 257 CONTATOS E DEPENDENTES`,
    buildBatchUpsert('contacts', contacts, 50),
    ``,
    buildBatchUpsert('contact_dependents', contactDependents, 50),
    ``,
    `-- 2. UPSERT DOS 218 CLIENTES NO PÓS-VENDA`,
    buildBatchUpsert('clients', clients, 50),
    ``,
    `-- 3. UPSERT DOS 217 EVENTOS NA AGENDA DE EVENTOS`,
    buildBatchUpsert('venue_events', events, 50),
    ``,
    `-- 4. UPSERT DAS 59 TAREFAS OPERACIONAIS DOS CONTRATOS`,
    buildBatchUpsert('admin_tasks', adminTasks, 50),
    ``,
    `SET session_replication_role = 'origin';`,
    ``,
    `-- VERIFICAÇÃO FINAL:`,
    `SELECT `,
    `  (SELECT count(*) FROM public.contacts) as total_contatos,`,
    `  (SELECT count(*) FROM public.contracts) as total_contratos_reais,`,
    `  (SELECT count(*) FROM public.clients) as total_clientes_posvenda,`,
    `  (SELECT count(*) FROM public.venue_events) as total_eventos_agenda,`,
    `  (SELECT count(*) FROM public.admin_tasks) as total_tarefas_admin;`
  ].join('\n');

  const outPathPending = 'supabase/migrations/05_APENAS_O_QUE_FALTA_EM_PRODUCAO.sql';
  writeFileSync(outPathPending, sqlPending, 'utf-8');
  console.log(`✅ Gerado: ${outPathPending} (${(sqlPending.length / 1024).toFixed(1)} KB)`);

  const outPathFull = 'supabase/migrations/05_SINCRONIZAR_PRODUCAO_218_CONTRATOS_CLIENTES_AGENDA.sql';
  writeFileSync(outPathFull, sqlFull, 'utf-8');
  console.log(`✅ Gerado unificado: ${outPathFull} (${(sqlFull.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
