-- Migration: Central de Fotos do WhatsApp no Contato
-- Adiciona avatar_url diretamente em clients e leads para propagação rápida
-- Mantém contacts.profile_picture_url como a Single Source of Truth

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN clients.avatar_url IS 'URL da foto sincronizada via contacts.profile_picture_url';
COMMENT ON COLUMN leads.avatar_url IS 'URL da foto sincronizada via contacts.profile_picture_url';
