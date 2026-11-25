-- ==============================================================================
-- F5 SYSTEM • Correção definitiva das policies RLS das tabelas de Pesquisa
-- Remove quaisquer policies antigas/restritivas em surveys, survey_questions e
-- survey_responses e recria a policy padrão de isolamento por Master
-- (master_id = public.f5_current_master_id()).
-- ==============================================================================

DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['surveys', 'survey_questions', 'survey_responses'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (master_id = public.f5_current_master_id()) WITH CHECK (master_id = public.f5_current_master_id())',
      t || '_master_isolation',
      t
    );

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role', t);
  END LOOP;
END $$;
