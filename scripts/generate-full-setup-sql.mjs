import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
const backupsDir = path.join(projectRoot, 'supabase', 'backups');

// Find latest backup
const backupFolders = fs.readdirSync(backupsDir)
  .filter(d => fs.statSync(path.join(backupsDir, d)).isDirectory() && d.startsWith('backup_'))
  .sort()
  .reverse();

const latestBackup = backupFolders.length > 0 ? path.join(backupsDir, backupFolders[0]) : null;

// Native Postgres array columns (everything else is JSONB)
const POSTGRES_ARRAY_COLUMNS = new Set([
  'lead_distribution_sdr_ids',
  'venue_ids',
  'shared_venue_ids',
  'allowed_collaborator_ids',
  'allowed_roles',
  'target_roles',
  'funnel_ids',
  'assigned_to_ids',
  'sdr_ids'
]);

// Helper to escape SQL string
function sqlEscape(colName, val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  
  if (POSTGRES_ARRAY_COLUMNS.has(colName)) {
    if (!Array.isArray(val) || val.length === 0) return `ARRAY[]::uuid[]`;
    const escapedItems = val.map(item => {
      if (typeof item === 'string') return `"${item.replace(/"/g, '\\"')}"`;
      return String(item);
    });
    return `'{${escapedItems.join(',')}}'`;
  }

  if (typeof val === 'object') {
    // JSONB: array or object
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }

  // String: escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Generate INSERT SQL from JSON records
function generateInserts(tableName, records, conflictKey = 'id') {
  if (!records || records.length === 0) return '';
  
  let sql = `\n-- ----------------------------------------------------------------------------\n`;
  sql += `-- DADOS: ${tableName.toUpperCase()} (${records.length} registros)\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;

  for (const record of records) {
    const keys = Object.keys(record);
    const cols = keys.map(k => `"${k}"`).join(', ');
    const values = keys.map(k => sqlEscape(k, record[k])).join(', ');
    
    // ON CONFLICT DO NOTHING to avoid duplicate key errors if re-run
    sql += `INSERT INTO public.${tableName} (${cols})\nVALUES (${values})\nON CONFLICT (${conflictKey}) DO NOTHING;\n\n`;
  }

  return sql;
}

async function run() {
  console.log('🚀 Gerando arquivo mestre consolidado FULL_SETUP_NEW_PROJECT.sql...');

  let fullSql = `-- ============================================================================\n`;
  fullSql += `-- F5 SYSTEM • SCRIPT UNIFICADO DE CRIAÇÃO E MIGRAÇÃO DE NOVO BANCO SUPABASE\n`;
  fullSql += `-- Data de geração: ${new Date().toISOString()}\n`;
  fullSql += `-- Instruções:\n`;
  fullSql += `-- 1. Abra o novo projeto no Supabase Dashboard (https://supabase.com/dashboard)\n`;
  fullSql += `-- 2. No menu lateral esquerdo, clique em "SQL Editor"\n`;
  fullSql += `-- 3. Clique em "+ New Query" (Nova Consulta)\n`;
  fullSql += `-- 4. Cole TODO o conteúdo deste arquivo e clique no botão verde "Run" (ou Ctrl+Enter)\n`;
  fullSql += `-- 5. Aguarde alguns segundos até o término da execução (Success. No rows returned).\n`;
  fullSql += `-- ============================================================================\n\n`;

  // 1. Ler todas as migrações em ordem cronológica
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Concatenando ${migrationFiles.length} arquivos de migração DDL...`);

  fullSql += `-- ============================================================================\n`;
  fullSql += `-- PARTE 1: ESTRUTURA DO BANCO (DDL - TABELAS, FUNÇÕES, TRIGGERS, RLS, REALTIME)\n`;
  fullSql += `-- ============================================================================\n\n`;

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    fullSql += `-- >>> MIGRAÇÃO: ${file} <<<\n`;
    fullSql += content.trim();
    fullSql += `\n\n`;
  }

  // 2. Inserir dados das tabelas
  if (latestBackup) {
    console.log(`📁 Injetando dados do backup mais recente (${path.basename(latestBackup)})...`);
    fullSql += `-- ============================================================================\n`;
    fullSql += `-- PARTE 2: DADOS DE PRODUÇÃO / SEED (DML - CASAS, COLABORADORES, LEADS, ETC)\n`;
    fullSql += `-- ============================================================================\n\n`;
    fullSql += `-- Desativa restrições de FK temporariamente durante a carga para evitar conflitos de ordem\n`;
    fullSql += `SET session_replication_role = 'replica';\n\n`;

    // Funis comerciais essenciais (referenciados por leads e fontes)
    const defaultCommercialFunnels = [
      {
        id: 'f1111111-1111-1111-1111-111111111111',
        name: 'Funil de Indicação de Amigas',
        category: 'Indicações do App',
        description: 'Pipeline exclusivo alimentado em tempo real pelas debutantes ativas.',
        venue_id: 'a1111111-1111-1111-1111-111111111111',
        badge: 'Indicações do App',
        badge_color: '#D4AF37',
        icon: 'crown',
        is_primary: true,
        is_pinned: true
      },
      {
        id: 'f2222222-2222-2222-2222-222222222222',
        name: 'Funil de Tráfego Pago & Meta Ads',
        category: 'Marketing Digital',
        description: 'Captação de leads qualificados via Instagram Ads e Google.',
        venue_id: 'a1111111-1111-1111-1111-111111111111',
        badge: 'Marketing Digital',
        badge_color: '#3B82F6',
        icon: 'megaphone',
        is_primary: false,
        is_pinned: false
      },
      {
        id: '56499e81-6614-4579-a907-6576069f3538',
        name: 'Funil Geral de Atendimento',
        category: 'Comercial',
        description: 'Pipeline comercial geral e captação.',
        venue_id: 'a1111111-1111-1111-1111-111111111111',
        badge: 'Comercial',
        badge_color: '#10B981',
        icon: 'target',
        is_primary: false,
        is_pinned: false
      },
      {
        id: '14ebab05-5661-4cdf-b6dc-deb4472d4422',
        name: 'Indicações das Debutantes • Minha house',
        category: 'Indicações',
        description: 'Pipeline exclusivo de indicações',
        venue_id: '4194834f-feb7-4369-bc3e-4500d5714b9c',
        badge: 'Indicações',
        badge_color: '#D4AF37',
        icon: 'gift',
        is_primary: false,
        is_pinned: false
      }
    ];

    const tablesOrder = [
      'venues',
      'commercial_funnels',
      'collaborators',
      'sources',
      'journey_templates',
      'debutantes',
      'leads',
      'appointments',
      'guests',
      'support_tickets'
    ];

    for (const table of tablesOrder) {
      if (table === 'commercial_funnels') {
        fullSql += generateInserts('commercial_funnels', defaultCommercialFunnels, 'id');
        console.log(`   + Tabela commercial_funnels: ${defaultCommercialFunnels.length} registros inseridos no SQL`);
        continue;
      }

      const jsonFile = path.join(latestBackup, `${table}.json`);
      if (fs.existsSync(jsonFile)) {
        try {
          const records = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          if (Array.isArray(records) && records.length > 0) {
            fullSql += generateInserts(table, records, 'id');
            console.log(`   + Tabela ${table}: ${records.length} registros inseridos no SQL`);
          }
        } catch (e) {
          console.error(`Erro ao ler dados da tabela ${table}:`, e.message);
        }
      }
    }

    fullSql += `\n-- Reativa as restrições de FK e integridade referencial normais\n`;
    fullSql += `SET session_replication_role = 'origin';\n\n`;
  }

  const outputPath = path.join(projectRoot, 'supabase', 'FULL_SETUP_NEW_PROJECT.sql');
  fs.writeFileSync(outputPath, fullSql, 'utf8');

  const stats = fs.statSync(outputPath);
  console.log(`\n✅ Sucesso! Arquivo gerado em:`);
  console.log(`   ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);
}

run().catch(console.error);
