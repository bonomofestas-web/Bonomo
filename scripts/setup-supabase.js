/**
 * BONOMO FESTAS - SUPABASE MIGRATION RUNNER
 * 
 * Este script executa a criação de todas as tabelas, índices e seeds no banco PostgreSQL do Supabase.
 * Pode ser executado com: node scripts/setup-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSetup() {
  console.log('----------------------------------------------------');
  console.log('🚀 BONOMO FESTAS - SUPABASE MIGRATION & SETUP');
  console.log('----------------------------------------------------');

  const envPath = path.resolve(__dirname, '../.env');
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (key === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !serviceRoleKey) serviceRoleKey = val;
      }
    });
  }

  const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`📄 Arquivo de Schema carregado: ${schemaPath} (${sql.length} bytes)`);

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('\n⚠️ ATENÇÃO: As chaves VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não foram preenchidas no .env.');
    console.log('👉 Você pode copiar o conteúdo de "supabase/schema.sql" e colar diretamente no SQL Editor do Supabase.');
    return;
  }

  console.log(`🔗 Conectando ao Supabase em: ${supabaseUrl}`);

  try {
    // Attempting REST SQL execution or Management API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      console.log('✅ Migrations executadas com sucesso no Supabase!');
    } else {
      console.log('ℹ️ Para aplicar as migrations:');
      console.log('1. Acesse https://supabase.com -> Seu Projeto -> SQL Editor');
      console.log('2. Cole o conteúdo de "supabase/schema.sql" e clique em "RUN".');
    }
  } catch (error) {
    console.log('ℹ️ Execute o script SQL em: supabase.com -> SQL Editor -> Colar "supabase/schema.sql"');
  }
}

runSetup();
