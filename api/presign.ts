import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS so the browser can PUT directly to R2
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Credenciais SOMENTE por variável de ambiente (nunca versionar chaves no código).
  const accountId       = process.env.CLOUDFLARE_R2_ACCOUNT_ID       || '';
  const accessKeyId     = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID     || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  const bucketName      = process.env.CLOUDFLARE_R2_BUCKET_NAME       || '';
  const publicUrl       = (process.env.CLOUDFLARE_R2_PUBLIC_URL       || '').replace(/\/$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return res.status(500).json({ error: 'Credenciais do Cloudflare R2 não configuradas no servidor.' });
  }

  try {
    const { fileName, contentType, folder = 'videos', customKey } = req.body || {};

    if (!contentType) {
      return res.status(400).json({ error: 'contentType não fornecido.' });
    }

    const ext = fileName ? fileName.split('.').pop() : (contentType.split('/')[1] || 'bin');
    const timestamp  = Date.now();
    const randomHex  = Math.random().toString(36).substring(2, 8);
    const key        = customKey ? `${folder}/${customKey}` : `${folder}/${timestamp}_${randomHex}.${ext}`;

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Presigned PUT URL — valid for 15 minutes
    const presignedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
      { expiresIn: 900 }
    );

    return res.status(200).json({
      success: true,
      presignedUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
    });
  } catch (error: any) {
    console.error('Erro ao gerar presigned URL:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao gerar URL de upload.',
    });
  }
}
