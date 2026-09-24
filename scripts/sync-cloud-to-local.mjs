import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const CLOUD_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const LOCAL_URL = process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const cloud = createClient(CLOUD_URL, CLOUD_KEY);
const local = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY);

const TABLES = [
  'venues',
  'commercial_funnels',
  'collaborators',
  'debutantes',
  'sources',
  'mql_questions',
  'leads',
  'lead_activities',
  'lead_participants',
  'admin_tasks',
  'appointments',
  'guests',
  'referrals',
  'venue_agenda_configs',
  'clients',
  'journey_templates',
  'task_databases',
  'task_custom_statuses',
  'task_custom_types',
  'task_property_definitions',
  'system_broadcast_announcements'
];

async function sync() {
  console.log('🔄 Iniciando sincronização Cloud -> Local (Docker)...');

  for (const table of TABLES) {
    try {
      const { data, error } = await cloud.from(table).select('*');
      if (error) {
        console.warn(`⚠️ Erro ao ler ${table} do Cloud: ${error.message}`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`ℹ️ Tabela ${table}: vazia no Cloud, nada a importar.`);
        continue;
      }

      console.log(`📦 Importando ${data.length} registros para ${table}...`);
      const { error: upsertErr } = await local.from(table).upsert(data, { onConflict: 'id' });
      if (upsertErr) {
        console.error(`❌ Erro ao inserir em ${table} local:`, upsertErr.message);
      } else {
        console.log(`✅ ${table}: ${data.length} registros sincronizados com sucesso.`);
      }
    } catch (e) {
      console.error(`❌ Exceção ao sincronizar ${table}:`, e);
    }
  }

  console.log('🎉 Sincronização Cloud -> Local concluída com sucesso!');
}

sync();
