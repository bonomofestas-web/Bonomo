-- ============================================================================
-- MIGRATION: ALLOW NULL DUE_DATE, NONE PRIORITY & CLEAN TASK CREATION
-- ============================================================================

-- 1. Permitir tarefas sem data pré-definida (due_date nullable)
ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN due_date DROP NOT NULL;

-- 2. Permitir prioridade indefinida ('none' / nullable)
ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN priority DROP NOT NULL;

ALTER TABLE IF EXISTS public.admin_tasks
    ALTER COLUMN priority SET DEFAULT 'none';

-- 3. Garantir que task_comments suporte UUID gerado automaticamente
ALTER TABLE IF EXISTS public.task_comments
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
