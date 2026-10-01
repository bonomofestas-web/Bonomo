import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '', supabaseAnonKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
    if (m[1] === 'VITE_SUPABASE_URL') supabaseUrl = val;
    if (m[1] === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  }
});
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: collabs } = await supabase.from('collaborators').select('id, name, email, role, venue_id, venue_ids, permissions, venues');
  console.log('--- TODOS OS COLABORADORES ---');
  console.log(JSON.stringify(collabs, null, 2));

  // Verificar leads com origem 7666
  const { data: leads } = await supabase.from('leads').select('id, name, phone, venue_id, venue_name, source_id, source_name, funnel_id');
  const leads7666 = leads.filter(l => 
    (l.source_name && l.source_name.includes('7666')) ||
    (l.source_id === '7c65ad4e-95ef-4917-b19f-5bdce0861b11') ||
    (l.funnel_id === '2edfcbb9-130a-41a2-aae4-b855aeb312f5')
  );
  console.log('--- LEADS DA ORIGEM OU FUNIL 7666 ---');
  console.log('Total encontrados:', leads7666.length);
  console.log(JSON.stringify(leads7666.map(l => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    venue_id: l.venue_id,
    venue_name: l.venue_name,
    source_name: l.source_name,
    funnel_id: l.funnel_id
  })), null, 2));
}
run();
