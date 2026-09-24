import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      envVars[key] = value;
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Cloud Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCloud() {
  console.log('\n--- Cloud Venues ---');
  const { data: venues, error: vErr } = await supabase.from('venues').select('*');
  console.log('Count:', venues?.length, vErr || '');
  console.log(JSON.stringify(venues, null, 2));

  console.log('\n--- Cloud Funnels (commercial_funnels) ---');
  const { data: funnels, error: fErr } = await supabase.from('commercial_funnels').select('*');
  console.log('Count:', funnels?.length, fErr || '');
  console.log(JSON.stringify(funnels, null, 2));

  console.log('\n--- Cloud Leads ---');
  const { data: leads, error: lErr } = await supabase.from('leads').select('*');
  console.log('Count:', leads?.length, lErr || '');
  console.log(JSON.stringify(leads?.slice(0, 10), null, 2));

  console.log('\n--- Cloud Collaborators ---');
  const { data: collabs, error: cErr } = await supabase.from('collaborators').select('*');
  console.log('Count:', collabs?.length, cErr || '');
  console.log(JSON.stringify(collabs, null, 2));
}

checkCloud();
