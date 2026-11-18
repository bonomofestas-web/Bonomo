import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return res.status(500).json({ error: 'Credenciais do Cloudflare R2 não configuradas no servidor.' });
  }

  // Exclusão exige usuário autenticado (JWT do Supabase): antes qualquer pessoa podia apagar qualquer objeto.
  const authHeader = String(req.headers.authorization || '');
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!accessToken || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(401).json({ error: 'Autenticação obrigatória.' });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authErr } = await authClient.auth.getUser(accessToken);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  try {
    const { key } = req.body || {};

    if (!key || typeof key !== 'string' || key.includes('..') || key.startsWith('/')) {
      return res.status(400).json({ error: 'Chave "key" do arquivo inválida ou não fornecida.' });
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
