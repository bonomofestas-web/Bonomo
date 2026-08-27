import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Force serverless nodejs runtime
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Método não permitido. Use POST.' });
  }

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '001';
  const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev').replace(/\/$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return res.status(500).json({
      error: 'Credenciais do Cloudflare R2 não configuradas no servidor.',
    });
  }

  try {
    const { fileBase64, fileName, contentType, folder = 'uploads', customKey } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: 'Arquivo fileBase64 não fornecido.' });
    }

    // Convert base64 to buffer
    const base64Data = fileBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = fileName ? fileName.split('.').pop() : (contentType ? contentType.split('/')[1] : 'bin');
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const key = customKey ? `${folder}/${customKey}` : `${folder}/${timestamp}_${randomHex}.${ext}`;

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const finalUrl = `${publicUrl}/${key}`;

    return res.status(200).json({
      success: true,
      url: finalUrl,
      key,
    });
  } catch (error: any) {
    console.error('Erro no upload para o Cloudflare R2:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao realizar upload para o Cloudflare R2',
    });
  }
}
