import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = (match[2] || '').trim().replace(/^["']|["']$/g, '');
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: s1 } = await supabase.from('sources').select('id, name, type, whatsapp_instance_id, configuration').eq('id', '03fed987-e4df-4f71-9236-a64237840225');
  console.log('Source by ID:', s1);

  const { data: s2 } = await supabase.from('sources').select('id, name, type, whatsapp_instance_id, configuration').eq('whatsapp_instance_id', '03fed987-e4df-4f71-9236-a64237840225');
  console.log('Source by inst_id:', s2);

  // Check how many messages in whatsapp_messages or messages
  const { count: msgCount } = await supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true });
  console.log('Total whatsapp_messages in DB:', msgCount);

  // Check how many messages have media_url
  const { count: mediaCount } = await supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).not('media_url', 'is', null);
  console.log('Total messages with media_url in DB:', mediaCount);
}

run();
