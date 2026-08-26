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

async function testAuth() {
  console.log('Testando autenticação Supabase Auth...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'dev@bonomoapp.com',
    password: 'password123', // or '123456'
  });

  if (error) {
    // Try 123456
    const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
      email: 'dev@bonomoapp.com',
      password: '123456',
    });
    if (e2) {
      console.log('Erro de autenticação:', e2.message);
    } else {
      console.log('✅ Login com senha "123456" realizado com sucesso!', d2.user.email);
    }
  } else {
    console.log('✅ Login com senha "password123" realizado com sucesso!', data.user.email);
  }
}

testAuth();
