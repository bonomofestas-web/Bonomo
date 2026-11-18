-- Toda notificacao fica guardada (historico de entrega e de leitura).
-- delivery_status: 'pending' ao cair no banco; 'delivered' quando o pop-up/aviso foi exibido ao destinatario.
-- read_at (ja existente): visualizada (clique no pop-up ou na notificacao, ou "marcar como lida").
-- cleared_at: "Limpar" apenas oculta da central; a linha NUNCA e apagada.
-- Idempotente.

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_delivery_status_check' AND conrelid = 'public.notifications'::regclass
    ) THEN
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_delivery_status_check CHECK (delivery_status IN ('pending', 'delivered'));
    END IF;
END $$;

-- Notificacoes anteriores a este ajuste ja foram exibidas ao usuario: nao tratar como pendentes
UPDATE public.notifications
SET delivery_status = 'delivered', delivered_at = COALESCE(delivered_at, created_at)
WHERE delivery_status = 'pending' AND created_at < now();

CREATE INDEX IF NOT EXISTS idx_notifications_pending
    ON public.notifications (recipient_id) WHERE delivery_status = 'pending';

-- Historico e imutavel: o destinatario nao apaga notificacoes (limpar = preencher cleared_at)
DROP POLICY IF EXISTS "notifications_recipient_delete" ON public.notifications;
