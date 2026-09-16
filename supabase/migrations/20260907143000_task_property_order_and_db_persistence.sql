-- ============================================================================
-- MIGRATION: TASK PROPERTY ORDERING & SHARED DATABASE PERSISTENCE
-- ============================================================================

-- 1. Coluna de ordenação de propriedades na base de dados (visão global compartilhada)
ALTER TABLE IF EXISTS public.task_databases
    ADD COLUMN IF NOT EXISTS property_order JSONB DEFAULT '["status", "due_date", "assignees", "priority", "custom_type", "lead_id"]'::jsonb;

-- 2. Coluna order_index em task_custom_types para persistir ordenação de tipos e setores
ALTER TABLE IF EXISTS public.task_custom_types
    ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

-- Atualizar a base padrão com a ordem inicial das propriedades
UPDATE public.task_databases
SET property_order = '["status", "due_date", "assignees", "priority", "custom_type", "lead_id"]'::jsonb
WHERE id = 'default_collabs' AND (property_order IS NULL OR property_order = '[]'::jsonb);
