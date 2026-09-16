import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local first, fallback to .env
let envVars = {};
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.resolve(__dirname, `../${envFile}`);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const value = trimmed.slice(idx + 1).trim();
          if (!envVars[key]) {
            envVars[key] = value;
          }
        }
      }
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔄 Conectando ao Supabase Local para restaurar dados de teste...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Encontrar a pasta de backup mais recente
const backupsRoot = path.resolve(__dirname, '../supabase/backups');
if (!fs.existsSync(backupsRoot)) {
  console.error('❌ Nenhuma pasta de backup encontrada em supabase/backups');
  process.exit(1);
}

const dirs = fs.readdirSync(backupsRoot)
  .filter(d => fs.statSync(path.join(backupsRoot, d)).isDirectory() && d.startsWith('backup_'))
  .sort()
  .reverse();

if (dirs.length === 0) {
  console.error('❌ Nenhum backup encontrado em supabase/backups');
  process.exit(1);
}

const latestBackupFolder = path.join(backupsRoot, dirs[0]);
console.log(`📁 Usando o backup mais recente: ${dirs[0]}\n`);

// Ordem estrita de integridade referencial (foreign keys)
const TABLES_TO_RESTORE = [
  'venues',
  'collaborators',
  'sources',
  'journey_templates',
  'debutantes',
  'leads',
  'appointments',
  'guests',
  'support_tickets'
];

async function restore() {
  for (const table of TABLES_TO_RESTORE) {
    const jsonPath = path.join(latestBackupFolder, `${table}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.log(`⏭️  Tabela "${table}": arquivo não encontrado no backup, pulando.`);
      continue;
    }

    try {
      const records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!Array.isArray(records) || records.length === 0) {
        console.log(`ℹ️  Tabela "${table}": 0 registros no backup.`);
        continue;
      }

      console.log(`⏳ Restaurando "${table}" (${records.length} registros)...`);

      // Upsert em lotes
      const { data, error } = await supabase
        .from(table)
        .upsert(records, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.warn(`⚠️  Erro ao importar "${table}": ${error.message}`);
      } else {
        console.log(`✅ Tabela "${table}": ${records.length} registros sincronizados com sucesso.`);
      }
    } catch (err) {
      console.error(`❌ Erro ao processar arquivo "${table}.json":`, err.message);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 Restauração dos dados no Supabase Local concluída!');
  console.log('======================================================\n');
}

restore();
