-- Adiciona suporte explícito para status de envio e mensagem de erro em atividades do lead
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Índice para acelerar filtros de timeline
CREATE INDEX IF NOT EXISTS idx_lead_activities_status ON public.lead_activities(status);
