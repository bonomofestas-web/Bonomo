import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file directly to get credentials
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env não encontrado na raiz do projeto.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      envVars[key] = value;
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL ou Chave não configuradas no .env');
  process.exit(1);
}

console.log('🔄 Conectando ao Supabase para gerar backup...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_BACKUP = [
  'venues',
  'collaborators',
  'leads',
  'debutantes',
  'appointments',
  'guest_groups',
  'guests',
  'vip_rewards',
  'journey_templates',
  'mql_questions',
  'sources',
  'venue_goals',
  'support_tickets',
  'system_announcements'
];

async function runBackup() {
  const backupDir = path.resolve(__dirname, '../supabase/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionBackupFolder = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(sessionBackupFolder, { recursive: true });

  const summary = {
    timestamp: new Date().toISOString(),
    sourceUrl: supabaseUrl,
    tables: {}
  };

  for (const table of TABLES_TO_BACKUP) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`⚠️  Tabela "${table}": ${error.message}`);
        summary.tables[table] = { status: 'error', error: error.message };
        continue;
      }

      const filePath = path.join(sessionBackupFolder, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), 'utf8');
      console.log(`✅ Tabela "${table}": ${(data || []).length} registros salvos.`);
      summary.tables[table] = { status: 'success', count: (data || []).length };
    } catch (err) {
      console.error(`❌ Erro ao exportar "${table}":`, err.message);
      summary.tables[table] = { status: 'error', error: err.message };
    }
  }

  const summaryPath = path.join(sessionBackupFolder, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`🎉 Backup de Produção concluído com sucesso!`);
  console.log(`📁 Pasta: ${sessionBackupFolder}`);
  console.log('======================================================\n');
}

runBackup();
