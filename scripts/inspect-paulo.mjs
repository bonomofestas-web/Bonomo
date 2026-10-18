import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    if (match[1] === 'VITE_SUPABASE_URL') supabaseUrl = match[2].trim().replace(/^["']|["']$/g, '');
    if (match[1] === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = match[2].trim().replace(/^["']|["']$/g, '');
  }
});
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: acts } = await supabase.from('lead_activities').select('*').eq('lead_id', 'a5b207e0-9758-4ae4-8a44-13deafca3b36');
  console.log('Acts for Paulo Duarte:', acts);

  const { data: actsGui } = await supabase.from('lead_activities').select('*').eq('lead_id', '4f489030-859d-4fb8-9a4e-838b2645dc56');
  console.log('Acts for Guilherme Gomes:', actsGui);
}
check();
