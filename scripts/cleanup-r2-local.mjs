/**
 * F5 SYSTEM • LIMPEZA DE MÍDIAS LOCAIS NO CLOUDFLARE R2
 * 
 * Este script purga com segurança exclusivamente os arquivos criados
 * durante testes em ambiente local (prefixo 'local_dev/').
 * 
 * NUNCA apaga ou altera arquivos das pastas de produção ('brand/', 'videos/', 'avatars/', etc.).
 * 
 * Uso: npm run cleanup:r2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis do .env
const envPath = path.resolve(__dirname, '../.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[match[1]] = val;
    }
  });
}

const accountId = envVars.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = envVars.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = envVars.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = envVars.CLOUDFLARE_R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || '001';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Erro: Credenciais do Cloudflare R2 não encontradas no .env');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function purgeLocalDevFiles() {
  console.log('------------------------------------------------------------');
  console.log('🧹 F5 SYSTEM • LIMPEZA DE ARQUIVOS DE TESTE LOCAL (R2)');
  console.log(`📦 Bucket: ${bucketName}`);
  console.log(`📁 Prefixo Seguro: local_dev/`);
  console.log('------------------------------------------------------------\n');

  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'local_dev/',
    });

    const listed = await s3Client.send(listCmd);

    if (!listed.Contents || listed.Contents.length === 0) {
      console.log('✅ Nenhum arquivo de teste local encontrado em "local_dev/". Tudo limpo!');
      return;
    }

    console.log(`🔍 Encontrados ${listed.Contents.length} arquivo(s) de teste para remoção:`);

    const objectsToDelete = [];
    for (const item of listed.Contents) {
      if (!item.Key.startsWith('local_dev/')) {
        throw new Error(`[TRAVA DE SEGURANÇA]: Tentativa de excluir objeto fora de local_dev/: ${item.Key}`);
      }
      console.log(` - 🗑️  ${item.Key} (${(item.Size / 1024).toFixed(1)} KB)`);
      objectsToDelete.push({ Key: item.Key });
    }

    const deleteCmd = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objectsToDelete },
    });

    await s3Client.send(deleteCmd);

    console.log(`\n🎉 Limpeza concluída com sucesso! ${objectsToDelete.length} arquivo(s) de teste removidos.`);
    console.log('🛡️  Todos os arquivos de produção ("brand/", "videos/", "avatars/") continuam 100% intactos.');
  } catch (err) {
    console.error('❌ Falha durante a limpeza do R2:', err);
    process.exit(1);
  }
}

purgeLocalDevFiles();
