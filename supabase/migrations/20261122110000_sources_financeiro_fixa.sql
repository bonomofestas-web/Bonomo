-- ==============================================================================
-- F5 SYSTEM • CONEXAO FIXA DO FINANCEIRO: toda casa tem uma origem de WhatsApp "Financeiro • <casa>"
-- Sem funil. E o unico numero usado dentro do Financeiro (conversa com o cliente sobre o contrato).
-- Idempotente; o master_id vem do gatilho de sources (venue -> master).
-- ==============================================================================
INSERT INTO public.sources (id, venue_id, name, type, funnel_id, status, configuration)
SELECT gen_random_uuid(), v.id::text, 'Financeiro • ' || v.name, 'whatsapp_api', NULL, 'active', '{"role":"financeiro","fixed":true}'::jsonb
FROM public.venues v
WHERE NOT EXISTS (
  SELECT 1 FROM public.sources s WHERE s.venue_id = v.id::text AND s.configuration->>'role' = 'financeiro'
);
