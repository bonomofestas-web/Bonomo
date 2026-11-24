-- ==============================================================================
-- F5 SYSTEM • PROPOSTAS: RESPONSAVEIS (Especialista e SDR)
-- A proposta e um ativo do comercial: quem a gerou (Especialista) e quem atendeu primeiro (SDR) ficam gravados na proposta e
-- passam para o contrato quando ela evolui. Idempotente.
-- ==============================================================================
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS closer_id UUID;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS closer_name TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS sdr_id UUID;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS sdr_name TEXT;
CREATE INDEX IF NOT EXISTS idx_proposals_closer ON public.proposals (master_id, closer_id) WHERE closer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_sdr ON public.proposals (master_id, sdr_id) WHERE sdr_id IS NOT NULL;
