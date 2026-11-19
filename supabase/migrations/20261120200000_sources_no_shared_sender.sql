-- ==============================================================================
-- F5 SYSTEM • NUMEROS x FUNIS: um numero pertence a UM funil (sem envio compartilhado)
-- Data: 2026-11-20
--
-- Regra: uma origem (numero) pertence a exatamente um funil e nao envia por outro. Remove a lista
-- `configuration.senderFunnelIds` das origens. Dado so de configuracao; nenhuma mensagem e afetada.
-- Idempotente.
-- ==============================================================================

UPDATE public.sources
SET configuration = configuration - 'senderFunnelIds'
WHERE configuration ? 'senderFunnelIds';
