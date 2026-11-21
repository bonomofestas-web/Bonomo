-- ==============================================================================
-- F5 SYSTEM • FLUXO DO CONTRATO (venda -> fechamento pelo closer -> financeiro -> pos-venda)
-- - signal_amount: sinal como campo proprio do contrato
-- - payment_summary: condicao de pagamento combinada em texto
-- - fill_stage: etapa de fechamento conduzida pelo closer (pendente ... preenchido)
-- - finance_message: recado do financeiro ao devolver o contrato ao closer
-- - clients.contract_id: liga todos os cards de pos-venda ao mesmo contrato
-- - venue_events: horario passa a ser opcional (evento sem hora = dia inteiro)
-- - feature flag 'finance' desligada
-- Idempotente.
-- ==============================================================================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signal_amount numeric(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS payment_summary text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS fill_stage text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS finance_message text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS finance_message_at timestamptz;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_fill_stage_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_fill_stage_check
  CHECK (fill_stage IN ('pendente','aguardando_assinatura','juntando_documentos','preenchido'));

-- Contratos que ja passaram do fechamento (aprovados/concluidos/na mesa) ficam como preenchidos.
UPDATE public.contracts SET fill_stage = 'preenchido'
 WHERE fill_stage = 'pendente' AND approval_status IN ('approved','completed','pending_approval');

CREATE INDEX IF NOT EXISTS idx_contracts_fill_stage ON public.contracts (master_id, fill_stage);

-- Cards de pos-venda ligados ao contrato
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_contract_id ON public.clients (contract_id) WHERE contract_id IS NOT NULL;
UPDATE public.clients cl SET contract_id = c.id
  FROM public.contracts c WHERE c.client_id = cl.id AND cl.contract_id IS NULL;

-- Evento sem horario = dia inteiro
ALTER TABLE public.venue_events ALTER COLUMN start_time DROP DEFAULT;
ALTER TABLE public.venue_events ALTER COLUMN end_time DROP DEFAULT;

-- Financeiro entra desligado
INSERT INTO public.system_feature_flags (feature_id, name, description, category, status)
VALUES ('finance', 'Financeiro', 'Recebiveis, planos de pagamento e funil financeiro', 'Administrativo', 'disabled')
ON CONFLICT (feature_id) DO NOTHING;
