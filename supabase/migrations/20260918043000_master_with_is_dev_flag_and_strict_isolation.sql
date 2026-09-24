-- ============================================================================
-- MIGRAÇÃO: MASTER COM FLAG IS_DEV & ISOLAMENTO ESTRITO LGPD
-- Data: 2026-09-18
-- Regra: A role 'dev' deixa de existir. Todo desenvolvedor é um 'master'
--        com a flag booleana is_dev = true. Cada master possui seu tenant
--        estritamente isolado sem cruzamento de dados de clientes/leads.
-- ============================================================================

-- 1. Adicionar a coluna is_dev na tabela collaborators
ALTER TABLE public.collaborators
ADD COLUMN IF NOT EXISTS is_dev BOOLEAN DEFAULT false;

-- 2. Atualizar contas de dev existentes para role = 'master' com is_dev = true
UPDATE public.collaborators
SET role = 'master', is_dev = true
WHERE email = 'patrickcouto.oficial@gmail.com' OR role = 'dev';

-- 3. Assegurar que todas as outras contas tenham is_dev = false por padrão
UPDATE public.collaborators
SET is_dev = false
WHERE is_dev IS NULL;

-- 4. Criar índice de performance para consultas com is_dev
CREATE INDEX IF NOT EXISTS idx_collaborators_is_dev ON public.collaborators(is_dev);

-- 5. Atualizar replicação realtime
ALTER TABLE public.collaborators REPLICA IDENTITY FULL;
