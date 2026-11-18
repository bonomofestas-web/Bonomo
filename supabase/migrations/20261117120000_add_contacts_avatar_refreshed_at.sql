-- Migration: adiciona coluna avatar_refreshed_at na tabela contacts
-- Usada para controlar o TTL de 7 dias do refresh de foto de perfil do WhatsApp via UAZAPI
-- Path R2 fixo: avatars/{master_id}/picture_{contact_code}.jpg

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS avatar_refreshed_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.avatar_refreshed_at IS
  'Timestamp do último refresh da foto de perfil via UAZAPI. NULL = nunca buscado. Refresh disparado quando > 7 dias.';
