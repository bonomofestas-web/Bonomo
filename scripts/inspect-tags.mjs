import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    env[m[1]] = v;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: leads, count } = await supabase.from('leads').select('*', { count: 'exact' });
  console.log('Total leads:', count);
  leads?.forEach(l => {
    console.log(`Lead ID: ${l.id} | Name: ${l.name} | Stage: ${l.stage} | Tags: ${JSON.stringify(l.tags)} | EventType: ${l.event_type}`);
  });

  const { data: clients, count: cCount } = await supabase.from('clients').select('*', { count: 'exact' });
  console.log('\nTotal clients:', cCount);
  clients?.forEach(c => {
    console.log(`Client ID: ${c.id} | Name: ${c.name} | Stage: ${c.stage} | Tags: ${JSON.stringify(c.tags)} | EventType: ${c.event_type}`);
  });
}
run();
