import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findTasks() {
  const { data, error } = await supabase
    .from('admin_tasks')
    .select('id, title, type, custom_type, database_id, custom_properties')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log('Recent tasks:');
  data.forEach(t => {
    console.log(`- [${t.id}] "${t.title}" | type: ${t.type} | custom_type: ${t.custom_type} | db: ${t.database_id}`);
  });
}

findTasks();
