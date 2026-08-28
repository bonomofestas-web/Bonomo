-- ============================================================================
-- EXPANSÃO DA TABELA DE LEADS (CAMPOS COMERCIAIS COMPLETOS)
-- ============================================================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS primary_contact_role TEXT DEFAULT 'debutante',
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT '15 Anos',
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS debutante_birth_date DATE,
ADD COLUMN IF NOT EXISTS estimated_guests INT,
ADD COLUMN IF NOT EXISTS desired_period TEXT,
ADD COLUMN IF NOT EXISTS interest_service TEXT,
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Garante que o Realtime continue ativo com REPLICA IDENTITY FULL
ALTER TABLE public.leads REPLICA IDENTITY FULL;
