/**
 * F5 SYSTEM • VARREDURA AUTOMÁTICA DE EXPURGO DE FOTOS EM BASE64
 * 
 * Executa a higienização de imagens/avatares gravados indevidamente no banco
 * de dados (como base64 'data:image%') e garante que passem obrigatoriamente
 * pelo Cloudflare R2.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Carregar .env.local e .env
loadEnvFile(path.resolve(__dirname, '../.env.local'));
loadEnvFile(path.resolve(__dirname, '../.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runPhotoPurge() {
  console.log(`\n🔍 [F5 System] Iniciando varredura automática de fotos no banco (${supabaseUrl})...\n`);

  let totalPurged = 0;

  // 1. Tentar via RPC purge_all_base64_photos se disponível
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('purge_all_base64_photos');
    if (!rpcError && rpcData) {
      console.log('✅ RPC de expurgo executada com sucesso no PostgreSQL:');
      console.log(JSON.stringify(rpcData, null, 2));
      return;
    }
  } catch (err) {
    // Continua para varredura manual caso o RPC não esteja registrado ainda no banco remoto
  }

  // 2. Varredura manual tabela por tabela via PostgREST
  const targets = [
    { table: 'collaborators', column: 'avatar_url' },
    { table: 'debutantes', column: 'avatar_url' },
    { table: 'debutantes', column: 'custom_invite_photo_url' },
    { table: 'venues', column: 'logo_url' },
    { table: 'venues', column: 'ballroom_image_url' },
    { table: 'venues', column: 'banner_image_url' },
    { table: 'commercial_funnels', column: 'custom_image_url' },
    { table: 'lead_activities', column: 'author_avatar_url' },
    { table: 'lead_participants', column: 'collaborator_avatar_url' },
    { table: 'task_comments', column: 'author_avatar' },
    { table: 'support_tickets', column: 'image_url' },
  ];

  for (const { table, column } of targets) {
    try {
      // Buscar registros com data:image
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${column}`)
        .ilike(column, 'data:image%');

      if (error) {
        // Tabela pode não existir em versões antigas
        continue;
      }

      if (data && data.length > 0) {
        console.log(`⚠️  Encontrados ${data.length} registro(s) com Base64 na tabela [${table}.${column}]. Limpando...`);

        for (const item of data) {
          const { error: updateErr } = await supabase
            .from(table)
            .update({ [column]: null })
            .eq('id', item.id);

          if (!updateErr) {
            totalPurged++;
          }
        }
      }
    } catch (targetErr) {
      // Segue para a próxima tabela
    }
  }

  if (totalPurged === 0) {
    console.log('✨ Nenhuma foto em Base64 encontrada no banco. Todas as fotos estão em conformidade com o Cloudflare R2!');
  } else {
    console.log(`\n🧹 Concluído: ${totalPurged} foto(s) em Base64 foram eliminadas do banco de dados.`);
    console.log('   Os usuários deverão reenviar os avatares/logos através do Cloudflare R2.\n');
  }
}

runPhotoPurge().catch(err => {
  console.error('❌ Falha na execução da varredura:', err);
  process.exit(1);
});
