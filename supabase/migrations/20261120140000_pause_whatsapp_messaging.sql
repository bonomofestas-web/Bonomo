-- ==============================================================================
-- F5 SYSTEM • PAUSA GERAL DE MENSAGENS (ENTRADA E SAIDA DO WHATSAPP)
-- Data: 2026-11-20
--
-- Cria/atualiza a chave remota `whatsapp_messaging` e a deixa DESABILITADA (pausada).
--   * Envio: o app bloqueia texto, midia, audio, figurinha e reacao ("Funcao desabilitada temporariamente").
--   * Recebimento: o webhook (api/whatsapp-webhook.ts e Edge Function uazapi-webhook) responde 200 sem gravar nada
--     e o app nao abre o stream SSE nem sincroniza historico.
--   * Aviso fixo no topo da tela inicial e na tela de Mensagens.
--
-- COMO RETOMAR: no painel Dev > Chaves do sistema, mude "Mensagens do WhatsApp" para ATIVO, ou rode:
--   UPDATE public.system_feature_flags SET status = 'active', updated_at = now() WHERE feature_id = 'whatsapp_messaging';
--
-- ATENCAO: enquanto pausado, mensagens recebidas NAO sao guardadas (so voltam pela sincronizacao de historico:
-- UAZAPI ~7 dias, sincronizacao ate 30 dias).
-- Idempotente. Nao apaga dados.
-- ==============================================================================

INSERT INTO public.system_feature_flags (feature_id, name, description, category, status, coming_soon_message, updated_at, updated_by)
VALUES (
    'whatsapp_messaging',
    'Mensagens do WhatsApp',
    'Liga/desliga o envio e o recebimento de mensagens pelo WhatsApp em todo o sistema.',
    'Atendimento',
    'disabled',
    'O envio e o recebimento de mensagens estão desativados temporariamente.',
    now(),
    'migration 20261120140000'
)
ON CONFLICT (feature_id) DO UPDATE SET
    status = 'disabled',
    coming_soon_message = EXCLUDED.coming_soon_message,
    updated_at = now(),
    updated_by = EXCLUDED.updated_by;
