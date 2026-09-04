-- ============================================================================
-- MIGRATION: Suporte a Pós-Venda, Funis Comerciais e Exclusão Segura
-- Data: 2026-09-04
-- ============================================================================

-- 1. FUNIS COMERCIAIS: Adiciona suporte a funis de pós-venda e controle de papéis
ALTER TABLE IF EXISTS public.commercial_funnels
ADD COLUMN IF NOT EXISTS is_post_sale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_roles TEXT[] DEFAULT '{}';

-- 2. INDICAÇÕES (REFERRALS): Preservação de nome da debutante indicadora e desvinculação segura
DO $$
BEGIN
    -- Garante coluna debutante_name
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'referrals' 
          AND column_name = 'debutante_name'
    ) THEN
        ALTER TABLE public.referrals ADD COLUMN debutante_name TEXT;
    END IF;

    -- Torna debutante_id NULLABLE para permitir exclusão da aniversariante sem deletar o lead
    ALTER TABLE public.referrals ALTER COLUMN debutante_id DROP NOT NULL;

    -- Altera FK para ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'referrals' 
          AND kcu.column_name = 'debutante_id' 
          AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_debutante_id_fkey;
        ALTER TABLE public.referrals 
          ADD CONSTRAINT referrals_debutante_id_fkey 
          FOREIGN KEY (debutante_id) 
          REFERENCES public.debutantes(id) 
          ON DELETE SET NULL;
    END IF;
END $$;

-- 3. COLABORADORES: Ativação, primeiro acesso e login
ALTER TABLE IF EXISTS public.collaborators
ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 4. RLS E REPLICA IDENTITY (Realtime)
ALTER TABLE IF EXISTS public.commercial_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_funnels_full_access" ON public.commercial_funnels;
CREATE POLICY "commercial_funnels_full_access" ON public.commercial_funnels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_full_access" ON public.referrals;
CREATE POLICY "referrals_full_access" ON public.referrals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
CREATE POLICY "collaborators_full_access" ON public.collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.commercial_funnels REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.referrals REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;
