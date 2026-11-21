import { readFileSync } from 'node:fs';
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

async function main() {
  // Query all tables from Postgres
  const { data: tables, error: tErr } = await sb
    .from('contracts')
    .select('id')
    .limit(1);

  // We can query pg_tables or run through all known tables
  const candidateTables = [
    'admin_tasks',
    'appointments',
    'app_announcements',
    'app_banners',
    'app_faq_items',
    'app_features',
    'app_invite_templates',
    'app_notifications',
    'app_schedule_items',
    'app_settings',
    'app_staff_members',
    'app_sub_admins',
    'audit_logs',
    'clients',
    'collaborators',
    'collaborator_history',
    'collaborator_presence',
    'collaborator_time_tracking',
    'commercial_funnels',
    'contacts',
    'contracts',
    'debutantes',
    'debutante_gift_items',
    'debutante_guests',
    'debutante_music_requests',
    'debutante_photos',
    'debutante_rsvp',
    'dev_audit_logs',
    'dev_feature_flags',
    'dev_support_tickets',
    'fin_accounts',
    'fin_categories',
    'fin_contract_reviews',
    'fin_cost_centers',
    'fin_credit_card_fees',
    'fin_payables',
    'fin_payment_methods',
    'fin_receivables',
    'funnels',
    'funnel_custom_fields',
    'funnel_packages',
    'funnel_stages',
    'goal_periods',
    'goal_results',
    'job_roles',
    'job_role_permissions',
    'job_sectors',
    'journeys',
    'journey_steps',
    'leads',
    'lead_activities',
    'lead_custom_field_values',
    'lead_journey_steps',
    'lead_notes',
    'lead_scores',
    'lead_tags',
    'mql_profiles',
    'mql_questions',
    'mql_rules',
    'notification_logs',
    'sources',
    'system_announcements',
    'task_comments',
    'task_custom_statuses',
    'task_custom_types',
    'task_databases',
    'task_property_definitions',
    'task_property_order',
    'task_sectors',
    'venues',
    'venue_agenda_configs',
    'venue_baselines',
    'venue_events',
    'venue_goals',
    'whatsapp_chats',
    'whatsapp_contacts',
    'whatsapp_groups',
    'whatsapp_instances',
    'whatsapp_messages',
    'whatsapp_sub_sources'
  ];

  const results = [];
  for (const t of candidateTables) {
    try {
      const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
      if (!error && count !== null && count > 0) {
        results.push({ table: t, count });
      } else if (error && !error.message.includes('Could not find the table') && !error.message.includes('schema cache')) {
        results.push({ table: t, error: error.message });
      }
    } catch (e) {
      // skip non-existent
    }
  }

  results.sort((a, b) => (b.count || 0) - (a.count || 0));
  console.log('TABLES WITH DATA LOCALLY:');
  console.table(results);
}

main().catch(console.error);
