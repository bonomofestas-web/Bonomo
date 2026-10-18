import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function auditR2() {
  console.log('============================================================');
  console.log('🔍 AUDITORIA COMPLETA DE ARMAZENAMENTO NO CLOUDFLARE R2');
  console.log(`📦 Bucket: ${bucketName}`);
  console.log('============================================================\n');

  let totalObjects = 0;
  let totalBytes = 0;
  let continuationToken = undefined;

  const folderStats = {};
  const extensionStats = {};
  const allObjects = [];

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    const contents = response.Contents || [];

    for (const obj of contents) {
      totalObjects++;
      totalBytes += obj.Size || 0;

      const key = obj.Key || '';
      const size = obj.Size || 0;
      const lastModified = obj.LastModified;

      allObjects.push({ key, size, lastModified });

      // Pasta / Prefixo de primeiro e segundo nível
      const parts = key.split('/');
      let prefix = parts.length > 1 ? parts[0] + '/' : '(raiz)';
      if (parts.length > 2) {
        prefix = `${parts[0]}/${parts[1]}/`;
      }

      if (!folderStats[prefix]) {
        folderStats[prefix] = { count: 0, bytes: 0 };
      }
      folderStats[prefix].count++;
      folderStats[prefix].bytes += size;

      // Extensão
      const extMatch = key.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : '(sem extensão)';
      if (!extensionStats[ext]) {
        extensionStats[ext] = { count: 0, bytes: 0 };
      }
      extensionStats[ext].count++;
      extensionStats[ext].bytes += size;
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`📊 TOTAL GERAL: ${totalObjects} arquivos | ${formatBytes(totalBytes)} (${(totalBytes / (1024 * 1024 * 1024)).toFixed(3)} GB)\n`);

  console.log('📁 DISTRIBUIÇÃO POR PASTAS / PREFIXOS:');
  console.log('------------------------------------------------------------');
  const sortedFolders = Object.entries(folderStats).sort((a, b) => b[1].bytes - a[1].bytes);
  for (const [folder, stat] of sortedFolders) {
    const pct = ((stat.bytes / (totalBytes || 1)) * 100).toFixed(1);
    console.log(`  ${folder.padEnd(35)} : ${String(stat.count).padStart(5)} arquivos | ${formatBytes(stat.bytes).padStart(10)} (${pct}%)`);
  }

  console.log('\n📄 DISTRIBUIÇÃO POR EXTENSÃO DE ARQUIVO:');
  console.log('------------------------------------------------------------');
  const sortedExts = Object.entries(extensionStats).sort((a, b) => b[1].bytes - a[1].bytes);
  for (const [ext, stat] of sortedExts) {
    const pct = ((stat.bytes / (totalBytes || 1)) * 100).toFixed(1);
    console.log(`  .${ext.padEnd(15)} : ${String(stat.count).padStart(5)} arquivos | ${formatBytes(stat.bytes).padStart(10)} (${pct}%)`);
  }

  console.log('\n🏆 TOP 25 MAIORES ARQUIVOS:');
  console.log('------------------------------------------------------------');
  const topLargest = [...allObjects].sort((a, b) => b.size - a.size).slice(0, 25);
  topLargest.forEach((item, idx) => {
    console.log(`  #${String(idx + 1).padStart(2)} [${formatBytes(item.size).padStart(10)}] ${item.key} (${new Date(item.lastModified).toISOString().split('T')[0]})`);
  });

  // Salvar relatório JSON detalhado para análise profunda
  const reportPath = path.resolve(__dirname, 'r2-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    totalObjects,
    totalBytes,
    totalGB: totalBytes / (1024 * 1024 * 1024),
    folderStats,
    extensionStats,
    topLargest,
    allKeys: allObjects.map(o => ({ key: o.key, size: o.size, modified: o.lastModified }))
  }, null, 2));

  console.log(`\n💾 Relatório detalhado gerado em: scripts/r2-audit-report.json`);
}

auditR2().catch(err => console.error('Erro na auditoria R2:', err));
