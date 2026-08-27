import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

console.log('Testing R2 credentials:');
console.log('Account ID:', env.CLOUDFLARE_R2_ACCOUNT_ID);
console.log('Bucket:', env.CLOUDFLARE_R2_BUCKET_NAME);
console.log('Public URL:', env.CLOUDFLARE_R2_PUBLIC_URL);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function testR2() {
  try {
    const testBuffer = Buffer.from('Bonomo Festas Test Video Buffer ' + Date.now(), 'utf-8');
    const key = `test/test_video_${Date.now()}.mp4`;

    console.log('Enviando objeto para R2...');
    const result = await s3Client.send(
      new PutObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET_NAME || '001',
        Key: key,
        Body: testBuffer,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    console.log('✅ Objeto enviado para o Cloudflare R2 com sucesso!');
    console.log('URL Pública:', `${env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`);
  } catch (err) {
    console.error('❌ Erro no envio para R2:', err);
  }
}

testR2();
