-- Migration: Cria índice único parcial para garantir deduplicação atômica de mensagens
-- Impede categoricamente a gravação de atividades duplicadas com o mesmo lead_id e metadata->>'messageId'
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_activities_unique_msg_id 
ON lead_activities (lead_id, (metadata->>'messageId')) 
WHERE metadata->>'messageId' IS NOT NULL;
