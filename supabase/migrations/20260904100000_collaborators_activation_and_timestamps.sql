-- ============================================================================
-- MIGRATION: Colaboradores - Rastreamento de Primeiro Acesso e Ativação de Conta
-- Data: 2026-09-04
-- ============================================================================

-- 1. Adiciona colunas para controle de status de ativação da conta
ALTER TABLE IF EXISTS public.collaborators
ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Assegura que colaboradores existentes com histórico tenham status correto
UPDATE public.collaborators
SET is_first_access = false, activated_at = COALESCE(created_at, now())
WHERE is_first_access IS NULL AND (active = true);

-- 3. Assegura políticas de RLS completas para leitura e atualização síncrona
ALTER TABLE IF EXISTS public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborators_full_access" ON public.collaborators;
CREATE POLICY "collaborators_full_access" 
ON public.collaborators 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Replica identity full para Realtime imediato
ALTER TABLE IF EXISTS public.collaborators REPLICA IDENTITY FULL;
