const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

async function queryTable(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`;
  const res = await fetch(url, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Range': '0-4',
      'Prefer': 'count=exact'
    }
  });

  const contentRange = res.headers.get('content-range');
  let count = 0;
  if (contentRange && contentRange.includes('/')) {
    count = parseInt(contentRange.split('/')[1], 10) || 0;
  }

  if (res.ok) {
    const data = await res.json();
    return { ok: true, count, data };
  } else {
    const error = await res.text();
    return { ok: false, status: res.status, error };
  }
}

async function run() {
  console.log('🔍 Testando conexão com Supabase Cloud (' + SUPABASE_URL + ')...');

  const tables = [
    'collaborators',
    'venues',
    'commercial_funnels',
    'leads',
    'lead_activities',
    'lead_participants',
    'clients',
    'clients_post_sale',
    'admin_tasks',
    'task_comments',
    'task_databases',
    'task_custom_statuses',
    'task_custom_types',
    'task_property_definitions',
    'support_tickets',
    'support_ticket_messages',
    'system_broadcast_announcements',
    'whatsapp_instances',
    'whatsapp_webhook_logs',
    'password_reset_codes',
    'mql_questions',
    'sources',
    'source_events',
    'debutantes'
  ];

  for (const t of tables) {
    const result = await queryTable(t);
    if (result.ok) {
      console.log(`✅ [${t}]: OK - ${result.count} registro(s) encontrados.`);
    } else {
      console.log(`❌ [${t}]: FALHA (${result.status}) - ${result.error}`);
    }
  }

  // Verificar colaboradores
  const collabs = await queryTable('collaborators');
  if (collabs.ok) {
    console.log('\n👥 Colaboradores cadastrados:');
    collabs.data.forEach(c => {
      console.log(`- ${c.name} (${c.email}) | Cargo: ${c.role} | Dev: ${c.is_dev} | Ativo: ${c.active}`);
    });
  }
}

run();
