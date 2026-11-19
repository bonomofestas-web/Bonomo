-- ==============================================================================
-- F5 SYSTEM • BUSCA DE CONTATOS NO BANCO: colunas so com digitos (telefone e CPF)
-- Data: 2026-11-20
--
-- Motivo: telefone e CPF ficam gravados em formatos diferentes ("(21) 99887-1122", "5521998871122",
-- "135.472.147-00"). Para a busca no servidor casar por qualquer pedaco digitado, o banco passa a manter
-- colunas GERADAS com so digitos. Nada e gravado pelo app nessas colunas (sao calculadas pelo Postgres).
--
-- Idempotente. Nao altera nem apaga dados.
-- ==============================================================================

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS primary_phone_digits   TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(primary_phone, ''),   '\D', '', 'g')) STORED,
    ADD COLUMN IF NOT EXISTS secondary_phone_digits TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(secondary_phone, ''), '\D', '', 'g')) STORED,
    ADD COLUMN IF NOT EXISTS cpf_digits             TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(cpf, ''),             '\D', '', 'g')) STORED;

-- Contagem e listagem por Master sem apagados (usadas no total e na busca paginada)
CREATE INDEX IF NOT EXISTS idx_contacts_master_active_created
    ON public.contacts (master_id, created_at DESC) WHERE deleted_at IS NULL;
