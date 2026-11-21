-- ==============================================================================
-- F5 SYSTEM • REATIVAÇÃO GERAL DO WHATSAPP (PRODUÇÃO & LOCAL)
-- Data: 2026-11-21
--
-- Reativa a chave remota `whatsapp_messaging`:
--   * Envio: libera texto, mídia, áudio, documentos e reações.
--   * Recebimento: webhook processa normalmente e grava as atividades no banco com deduplicação atômica.
--   * Remove a faixa de aviso de indisponibilidade no topo do sistema.
--
-- Idempotente.
-- ==============================================================================

INSERT INTO public.system_feature_flags (
    feature_id,
    name,
    description,
    category,
    status,
    coming_soon_message,
    updated_at,
    updated_by
)
VALUES (
    'whatsapp_messaging',
    'Mensagens do WhatsApp',
    'Liga/desliga o envio e o recebimento de mensagens pelo WhatsApp em todo o sistema.',
    'Atendimento',
    'active',
    NULL,
    now(),
    'reativacao_pos_deploy'
)
ON CONFLICT (feature_id) DO UPDATE SET
    status = 'active',
    coming_soon_message = NULL,
    updated_at = now(),
    updated_by = 'reativacao_pos_deploy';
