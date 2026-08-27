import { S3Client, ListObjectsV2Command, ListBucketsCommand } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function testRead() {
  try {
    console.log('Tentando listar objetos do bucket:', env.CLOUDFLARE_R2_BUCKET_NAME);
    const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: env.CLOUDFLARE_R2_BUCKET_NAME }));
    console.log('✅ ListObjects sucesso! Objetos:', listRes.Contents || []);
  } catch (err) {
    console.error('❌ Erro no ListObjects:', err.message, err.Code);
  }

  try {
    console.log('Tentando listar buckets da conta...');
    const bucketsRes = await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ ListBuckets sucesso! Buckets encontrados:', bucketsRes.Buckets);
  } catch (err) {
    console.error('❌ Erro no ListBuckets:', err.message, err.Code);
  }
}

testRead();
