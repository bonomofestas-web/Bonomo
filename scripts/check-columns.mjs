import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data: collab, error: err1 } = await supabase.from('collaborators').select('id, name, theme').limit(1);
  console.log('Collaborators theme column:', err1 ? err1.message : 'OK', collab);

  const { data: funnels, error: err2 } = await supabase.from('commercial_funnels').select('id, name, is_pinned').limit(1);
  console.log('Funnels is_pinned column:', err2 ? err2.message : 'OK', funnels);

  const { data: venues, error: err3 } = await supabase.from('venues').select('id, name, welcome_video_url').limit(1);
  console.log('Venues welcome_video_url column:', err3 ? err3.message : 'OK', venues);
}

checkColumns();
