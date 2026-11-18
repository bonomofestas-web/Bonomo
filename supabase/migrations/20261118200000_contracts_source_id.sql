-- Contrato guarda a origem (origem/instancia WhatsApp do lead que o gerou).
-- Alimenta a escolha do chip de resposta do contrato/cliente (origem do contrato respeitada quando for do funil atual).
-- Backfill a partir do lead de origem, sempre dentro do mesmo Master. Idempotente.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS source_id TEXT;

UPDATE public.contracts c
SET source_id = l.source_id::text
FROM public.leads l
WHERE c.source_id IS NULL
  AND c.origin_lead_id::text = l.id::text
  AND l.source_id IS NOT NULL
  AND c.master_id = l.master_id;
