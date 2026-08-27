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

async function testPinFunnel() {
  const funnelId = 'f1111111-1111-1111-1111-111111111111';
  console.log('Toggling pin on funnel:', funnelId);

  const { data: updated, error } = await supabase
    .from('commercial_funnels')
    .update({ is_pinned: true })
    .eq('id', funnelId)
    .select('*');

  console.log('Update result:', error ? error.message : 'SUCCESS', updated);

  const { data: verified } = await supabase
    .from('commercial_funnels')
    .select('id, name, is_pinned')
    .eq('id', funnelId)
    .single();

  console.log('Verified from DB:', verified);
}

testPinFunnel();
