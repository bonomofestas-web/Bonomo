-- ==============================================================================
-- F5 SYSTEM: MIGRATION - MULTI-TENANCY, ISOLAMENTO POR MASTER E FEATURE FLAGS
-- ==============================================================================

-- 1. ADICIONA A COLUNA MASTER_ID NAS TABELAS PRINCIPAIS
-- master_id referencia o ID do colaborador com role 'master' (ou 'dev' para testes)
ALTER TABLE public.collaborators 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;

ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

ALTER TABLE public.commercial_funnels 
ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- 2. TABELA DE FEATURE FLAGS GLOBAIS (SINCRONIZADAS EM TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.system_feature_flags (
  feature_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'coming_soon' | 'disabled'
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remove restrições NOT NULL legadas caso a tabela já existisse no banco
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN name DROP NOT NULL;
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN category DROP NOT NULL;
ALTER TABLE IF EXISTS public.system_feature_flags ALTER COLUMN description DROP NOT NULL;

-- Popula flags padrão caso não existam ou atualiza com dados completos
INSERT INTO public.system_feature_flags (feature_id, name, description, category, status)
VALUES 
  ('whatsapp', 'WhatsApp & Atendimento', 'Caixa de entrada integrada e disparos', 'Atendimento', 'active'),
  ('icp', 'Qualificação ICP & MQL', 'Cálculo de nota e badges ICP', 'Inteligência', 'active'),
  ('sources', 'Origens & Rastreamento', 'Formulários e parâmetros UTM', 'Comercial & CRM', 'active'),
  ('debutantes', 'Aniversariantes & Debutantes', 'Gestão de anfitriãs e convites', 'Comercial & CRM', 'active'),
  ('venue_goals', 'Metas da Casa de Festas', 'Metas comerciais e faturamento', 'Comercial & CRM', 'active'),
  ('funnels', 'Funis Comerciais & Kanban', 'Pipeline e etapas de vendas', 'Comercial & CRM', 'active'),
  ('master_dashboard', 'Dashboard Master', 'Visão consolidada da rede', 'Administrativo', 'active'),
  ('collaborators', 'Equipe & Colaboradores', 'Gestão de usuários e permissões', 'Administrativo', 'active'),
  ('venues', 'Casas de Festa & Unidades', 'Cadastro de espaços e salões', 'Administrativo', 'active')
ON CONFLICT (feature_id) DO UPDATE SET 
  status = EXCLUDED.status,
  updated_at = now();

-- 3. TRIGGER DE DESATIVAÇÃO EM CASCATA DE COLABORADORES
-- Quando um Master for desativado (active = false), desativa automaticamente todos os colaboradores subordinados
CREATE OR REPLACE FUNCTION trg_cascade_master_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o colaborador for um master e seu status ativo foi alterado para false
  IF OLD.role = 'master' AND OLD.active = true AND NEW.active = false THEN
    UPDATE public.collaborators
    SET active = false,
        updated_at = now()
    WHERE master_id = NEW.id;
  END IF;

  -- Se o master for reativado, reativa seus colaboradores
  IF OLD.role = 'master' AND OLD.active = false AND NEW.active = true THEN
    UPDATE public.collaborators
    SET active = true,
        updated_at = now()
    WHERE master_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collaborators_cascade_deactivation ON public.collaborators;
CREATE TRIGGER trg_collaborators_cascade_deactivation
AFTER UPDATE OF active ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION trg_cascade_master_deactivation();

-- 4. BACKFILL INICIAL SEGURO:
-- Associa as casas e colaboradores existentes ao Master oficial cadastrado
DO $$
DECLARE
  first_master_id UUID;
BEGIN
  SELECT id INTO first_master_id 
  FROM public.collaborators 
  WHERE role = 'master' 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF first_master_id IS NOT NULL THEN
    -- Vincula venues que ainda não possuem master_id ao primeiro master
    UPDATE public.venues 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;

    -- Vincula funis comerciais ao primeiro master
    UPDATE public.commercial_funnels 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;

    -- Vincula colaboradores não-masters (e não-devs) que não possuem master_id ao primeiro master
    UPDATE public.collaborators 
    SET master_id = first_master_id 
    WHERE master_id IS NULL 
      AND role NOT IN ('master', 'dev');

    -- Vincula leads ao primeiro master
    UPDATE public.leads 
    SET master_id = first_master_id 
    WHERE master_id IS NULL;
  END IF;
END;
$$;
