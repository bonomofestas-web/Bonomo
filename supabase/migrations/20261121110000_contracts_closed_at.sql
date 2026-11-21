-- ==============================================================================
-- F5 SYSTEM • Data de FECHAMENTO do contrato (usada pelo dashboard comercial)
-- O faturamento do dashboard deve contar pela data em que a venda foi fechada (assinatura), nao pela data em que o
-- registro foi criado no sistema (contratos importados teriam todos a mesma data de criacao). Idempotente.
-- ==============================================================================
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS closed_at DATE;
CREATE INDEX IF NOT EXISTS idx_contracts_master_closed_at ON public.contracts(master_id, closed_at);
