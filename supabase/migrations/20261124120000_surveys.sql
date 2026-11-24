-- ==============================================================================
-- F5 SYSTEM • PESQUISA (formularios de pesquisa estilo Typeform)
-- A gerencia monta pesquisas (uma pergunta por tela), envia o link ao lead (link pessoal com token) ou publica um link
-- geral. As respostas viram graficos e fichas individuais. Todo dado tem master_id e isolamento por Master
-- (public.f5_current_master_id()). O publico (anonimo) NAO acessa as tabelas: passa por api/survey.ts (service role).
-- Idempotente.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  welcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  thanks JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_slug ON public.surveys (slug);
CREATE INDEX IF NOT EXISTS idx_surveys_master_status ON public.surveys (master_id, status);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('short_text','long_text','single_choice','multi_choice','dropdown','yes_no','scale','rating','number','email','phone','date','statement')),
  title TEXT NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  logic JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON public.survey_questions (survey_id, position);

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  token TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','started','completed')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_by_name TEXT,
  sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_responses_token ON public.survey_responses (token) WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON public.survey_responses (master_id, survey_id, status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_lead ON public.survey_responses (master_id, lead_id) WHERE lead_id IS NOT NULL;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['surveys','survey_questions','survey_responses'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_full_access" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_master_isolation" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_master_isolation" ON public.%I FOR ALL TO authenticated USING (master_id = public.f5_current_master_id()) WITH CHECK (master_id = public.f5_current_master_id())', t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role', t);
  END LOOP;
END $$;
