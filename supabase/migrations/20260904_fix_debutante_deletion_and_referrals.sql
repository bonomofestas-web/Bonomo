-- Migration: Fix debutante deletion and preserve referrals/leads in CRM
-- Permite que debutantes sejam deletadas sem violar restrição NOT NULL na tabela referrals
-- Preserva histórico de indicações e leads no CRM com o nome da debutante indicadora

DO $$
BEGIN
    -- 1. Garante coluna debutante_name na tabela referrals
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'referrals' 
          AND column_name = 'debutante_name'
    ) THEN
        ALTER TABLE public.referrals ADD COLUMN debutante_name TEXT;
    END IF;

    -- 2. Torna a coluna debutante_id em referrals NULLABLE para suportar desvinculação
    ALTER TABLE public.referrals ALTER COLUMN debutante_id DROP NOT NULL;

    -- 3. Se a foreign key existir como CASCADE ou RESTRICT, ajusta para SET NULL
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

-- 4. Garante políticas de RLS completas para debutantes e referrals
ALTER TABLE public.debutantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debutantes_full_access" ON public.debutantes;
CREATE POLICY "debutantes_full_access" ON public.debutantes 
  FOR ALL TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "referrals_full_access" ON public.referrals;
CREATE POLICY "referrals_full_access" ON public.referrals 
  FOR ALL TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

ALTER TABLE public.debutantes REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
