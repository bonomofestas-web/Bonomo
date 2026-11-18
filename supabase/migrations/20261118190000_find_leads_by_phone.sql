-- Busca de lead por telefone para o webhook: telefone principal E contatos do lead (2o/3o numero, mae, pai).
-- Antes o webhook so olhava leads.phone; mensagem do 2o numero criava um lead duplicado.
-- Isolada por Master (ou pelas casas do Master). Usa to_jsonb(l) para nao depender de a coluna `contacts` existir. Idempotente.
CREATE OR REPLACE FUNCTION public.f5_find_lead_ids_by_phone(p_master UUID, p_venues TEXT[], p_tail TEXT)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT l.id
    FROM public.leads l
    WHERE length(regexp_replace(COALESCE(p_tail, ''), '\D', '', 'g')) >= 8
      AND (l.master_id = p_master OR l.venue_id::text = ANY(COALESCE(p_venues, ARRAY[]::TEXT[])))
      AND (
            right(regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR right(regexp_replace(COALESCE(to_jsonb(l) ->> 'mother_phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR right(regexp_replace(COALESCE(to_jsonb(l) ->> 'father_phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
         OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(to_jsonb(l) -> 'contacts') = 'array' THEN to_jsonb(l) -> 'contacts' ELSE '[]'::jsonb END
                   ) c
              WHERE right(regexp_replace(COALESCE(c ->> 'phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
            )
         OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(l.custom_field_values -> 'contacts') = 'array' THEN l.custom_field_values -> 'contacts' ELSE '[]'::jsonb END
                   ) c
              WHERE right(regexp_replace(COALESCE(c ->> 'phone', ''), '\D', '', 'g'), length(p_tail)) = p_tail
            )
      )
    ORDER BY l.last_interaction_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.f5_find_lead_ids_by_phone(UUID, TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.f5_find_lead_ids_by_phone(UUID, TEXT[], TEXT) TO service_role;
