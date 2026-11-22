-- F5 SYSTEM • RLS por Master no Financeiro e Fornecedores
-- Substitui as policies abertas (USING (true) para anon) por isolamento real via public.f5_current_master_id().
-- Requer public.f5_current_master_id() (20261118170000_rls_identity_by_email.sql). Idempotente.
-- service_role ignora RLS (api/ e Edge Functions continuam funcionando). anon perde acesso total.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_categories','fin_accounts','fin_card_terminals','fin_contract_reviews','fin_receivables','fin_recurrences',
    'fin_payables','fin_payable_allocations','fin_transactions','fin_card_settlements','fin_revenue_recognition',
    'fin_contract_cancellations','fin_budgets','fin_audit_log','fin_contract_stage_overrides','supplier_quotes'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_full_access" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_master_isolation" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_master_isolation" ON public.%I FOR ALL TO authenticated USING (master_id = public.f5_current_master_id()) WITH CHECK (master_id = public.f5_current_master_id())',
      t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role', t);
  END LOOP;
END $$;

-- A view roda com as permissoes de quem consulta (respeita o RLS das tabelas base) e nao fica exposta ao anon.
DO $$
BEGIN
  IF to_regclass('public.v_fin_contract_summary') IS NOT NULL THEN
    ALTER VIEW public.v_fin_contract_summary SET (security_invoker = true);
    REVOKE ALL ON public.v_fin_contract_summary FROM anon;
    GRANT SELECT ON public.v_fin_contract_summary TO authenticated, service_role;
  END IF;
END $$;
