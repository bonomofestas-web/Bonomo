import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

/**
 * Limpeza sazonal de mídia no Cloudflare R2 (Vercel Cron diário, ver vercel.json).
 *
 * Regras (mantenha em sincronia com src/utils/mediaStoragePolicy.ts):
 * - Vídeo não fixado sem abrir há 30 dias e foto não fixada sem abrir há 90 dias são removidos do R2.
 * - NUNCA toca texto, áudio e documento. Mídia fixada (pinned) nunca é removida.
 * - A mensagem permanece no histórico; o card passa a mostrar "removida para liberar espaço".
 *
 * Segurança:
 * - Exige `Authorization: Bearer <CRON_SECRET>` (a Vercel envia automaticamente quando CRON_SECRET está definido).
 * - Por padrão roda em SIMULAÇÃO (dry-run): só informa o que seria apagado. A remoção real exige
 *   R2_CLEANUP_APPLY=true no ambiente (ative só depois de a equipe conhecer o botão "Fixar").
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const EXPIRE_DAYS: Record<string, number> = { video: 30, image: 90 };
const BATCH_LIMIT = 200;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = String(req.headers.authorization || '');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase (service role) não configurado.' });
  }

  const applyRequested = process.env.R2_CLEANUP_APPLY === 'true' && req.query.dryRun !== '1';
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
  const apply = applyRequested && !!(accountId && accessKeyId && secretAccessKey && bucketName);

  const s3 = apply
    ? new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } })
    : null;

  const summary = { mode: apply ? 'apply' : 'dry-run', candidates: 0, purged: 0, freedBytes: 0, errors: 0 };
  const sample: Array<{ id: string; kind: string; sizeBytes: number | null; lastAccessedAt: string }> = [];

  try {
    for (const kind of Object.keys(EXPIRE_DAYS)) {
      const cutoff = new Date(Date.now() - EXPIRE_DAYS[kind] * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error } = await supabase
        .from('whatsapp_media')
        .select('id, master_id, activity_id, kind, size_bytes, r2_key, last_accessed_at')
        .eq('status', 'stored')
        .eq('pinned', false)
        .eq('kind', kind)
        .lt('last_accessed_at', cutoff)
        .not('r2_key', 'is', null)
        .order('last_accessed_at', { ascending: true })
        .limit(BATCH_LIMIT);
      if (error) throw error;

      for (const row of rows || []) {
        summary.candidates += 1;
        if (sample.length < 20) sample.push({ id: row.id, kind: row.kind, sizeBytes: row.size_bytes, lastAccessedAt: row.last_accessed_at });
        if (!apply || !s3) continue;

        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: row.r2_key as string }));
          await supabase
            .from('whatsapp_media')
            .update({ status: 'purged', purged_at: new Date().toISOString(), failure_reason: 'purged' })
            .eq('id', row.id)
            .eq('master_id', row.master_id);

          // A mensagem continua no histórico; o card mostra "removida para liberar espaço"
          if (row.activity_id) {
            const { data: act } = await supabase.from('lead_activities').select('metadata').eq('id', row.activity_id).maybeSingle();
            await supabase
              .from('lead_activities')
              .update({ metadata: { ...((act?.metadata as any) || {}), needsManualDownload: true, mediaError: 'purged', media_purged: true } })
              .eq('id', row.activity_id);
          }
          summary.purged += 1;
          summary.freedBytes += Number(row.size_bytes) || 0;
        } catch (err) {
          summary.errors += 1;
          console.warn('[r2-cleanup] falha ao expurgar', row.id, err);
        }
      }
    }
    return res.status(200).json({ success: true, ...summary, sample });
  } catch (err: any) {
    console.error('[r2-cleanup] erro:', err);
    return res.status(500).json({ error: err?.message || 'Falha na limpeza.', ...summary });
  }
}
