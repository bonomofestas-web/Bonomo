-- Instancia (origem WhatsApp) com check "enviar mensagens" dentro do funil.
-- Toda instancia entra ATIVADA; desativada = so recebe (mensagens que chegam nela continuam entrando no funil,
-- mas ela nao aparece para responder o cliente). Idempotente.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS send_enabled BOOLEAN NOT NULL DEFAULT true;
