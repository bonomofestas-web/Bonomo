-- Prévia persistida da última mensagem de chat por lead.
-- Motivo: a lista lateral do WhatsApp derivava a prévia de lead_activities carregadas em memória
-- (só ~5 por lead na carga leve), ficando desatualizada até abrir a conversa. Com estas colunas a
-- lista fica correta sem baixar histórico (economiza egress no plano Free do Supabase).
-- Colunas em leads (já escopada por master_id/venue_id); nenhuma tabela nova, nenhuma policy nova.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_message_text TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Backfill (idempotente): só preenche leads ainda sem prévia, a partir da última mensagem de chat.
UPDATE public.leads l
SET last_message_text = left(a.text, 200),
    last_message_at = a.ts
FROM (
  SELECT DISTINCT ON (lead_id) lead_id, text, "timestamp" AS ts
  FROM public.lead_activities
  WHERE type = 'contact'
    AND coalesce(text, '') <> ''
    AND coalesce(metadata->>'isViewAudit', '') <> 'true'
  ORDER BY lead_id, "timestamp" DESC
) a
WHERE a.lead_id = l.id
  AND l.last_message_at IS NULL;
