import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const accountId       = process.env.CLOUDFLARE_R2_ACCOUNT_ID       || 'b8a90a4ce83cb7dd913c07ff99596735';
  const accessKeyId     = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID     || '893798c95ffa5b892697319a440f3817';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '168b5fc0ecd81cbb115539bc8b582e85826b5b390c835d04343d18d0026da86b';
  const bucketName      = process.env.CLOUDFLARE_R2_BUCKET_NAME       || '001';

  try {
    const { key } = req.body || {};

    if (!key) {
      return res.status(400).json({ error: 'Chave "key" do arquivo não fornecida.' });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return res.status(200).json({
      success: true,
      message: `Objeto ${key} excluído com sucesso do Cloudflare R2.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir objeto do R2:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao excluir objeto do Cloudflare R2.',
    });
  }
}
