-- ============================================================================
-- MIGRATION: TASKS WORKSPACE, DATABASES, STATUSES & SMART NOTES
-- ============================================================================

-- 1. Bases de Dados de Tarefas (Workspaces de Tarefas)
CREATE TABLE IF NOT EXISTS public.task_databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_databases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_databases_all" ON public.task_databases;
CREATE POLICY "task_databases_all" ON public.task_databases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_databases REPLICA IDENTITY FULL;

-- Base Padrão Não-Excluível: Tarefas de Colaboradores
INSERT INTO public.task_databases (id, name, description, is_default)
VALUES ('default_collabs', 'Tarefas de Colaboradores', 'Base de dados principal de tarefas da equipe e colaboradores', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Status Customizados das Bases de Dados
CREATE TABLE IF NOT EXISTS public.task_custom_statuses (
    id TEXT PRIMARY KEY,
    database_id TEXT REFERENCES public.task_databases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_key TEXT NOT NULL, -- 'todo' (A fazer) | 'in_progress' (Em andamento) | 'completed' (Concluídos)
    color TEXT NOT NULL DEFAULT '#3B82F6',
    bg_color TEXT NOT NULL DEFAULT 'rgba(59, 130, 246, 0.14)',
    order_index INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_custom_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_custom_statuses_all" ON public.task_custom_statuses;
CREATE POLICY "task_custom_statuses_all" ON public.task_custom_statuses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_custom_statuses REPLICA IDENTITY FULL;

-- Seed dos status padrão (A fazer -> Não iniciado, Em andamento -> Fazendo, Concluídos -> Finalizado)
INSERT INTO public.task_custom_statuses (id, database_id, name, group_key, color, bg_color, order_index, is_default)
VALUES
    ('st_todo', 'default_collabs', 'Não iniciado', 'todo', '#94A3B8', 'rgba(148, 163, 184, 0.14)', 0, true),
    ('st_doing', 'default_collabs', 'Fazendo', 'in_progress', '#3B82F6', 'rgba(59, 130, 246, 0.14)', 1, false),
    ('st_done', 'default_collabs', 'Finalizado', 'completed', '#10B981', 'rgba(16, 185, 129, 0.14)', 2, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Tipos de Tarefas Customizados
CREATE TABLE IF NOT EXISTS public.task_custom_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Briefcase',
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_custom_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_custom_types_all" ON public.task_custom_types;
CREATE POLICY "task_custom_types_all" ON public.task_custom_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_custom_types REPLICA IDENTITY FULL;

INSERT INTO public.task_custom_types (id, name, icon, color)
VALUES
    ('general', 'Geral / Operacional', 'Briefcase', '#94A3B8'),
    ('followup', 'Follow-up Comercial', 'MessageSquare', '#10B981'),
    ('meeting', 'Reunião / Visita', 'Users', '#A78BFA'),
    ('call', 'Ligação de Alinhamento', 'Phone', '#60A5FA'),
    ('tasting', 'Degustação', 'Utensils', '#F59E0B'),
    ('document', 'Envio de Proposta / Contrato', 'FileText', '#EC4899')
ON CONFLICT (id) DO NOTHING;

-- 4. Definições de Propriedades Customizáveis (Campos dinâmicos da base de dados)
CREATE TABLE IF NOT EXISTS public.task_property_definitions (
    id TEXT PRIMARY KEY,
    database_id TEXT REFERENCES public.task_databases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text' | 'number' | 'select' | 'multi_select' | 'files' | 'checkbox' | 'url' | 'email' | 'phone' | 'location'
    options JSONB DEFAULT '[]'::jsonb,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_property_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_property_definitions_all" ON public.task_property_definitions;
CREATE POLICY "task_property_definitions_all" ON public.task_property_definitions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_property_definitions REPLICA IDENTITY FULL;

-- 5. Extensões da Tabela admin_tasks
ALTER TABLE IF EXISTS public.admin_tasks
    ADD COLUMN IF NOT EXISTS database_id TEXT DEFAULT 'default_collabs',
    ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS custom_properties JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS custom_status_id TEXT DEFAULT 'st_todo',
    ADD COLUMN IF NOT EXISTS custom_type TEXT DEFAULT 'Geral / Operacional',
    ADD COLUMN IF NOT EXISTS mandatory_feedback TEXT;

-- 6. Tabela de Comentários das Tarefas (com CASCADE DELETE)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments_all" ON public.task_comments;
CREATE POLICY "task_comments_all" ON public.task_comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;

-- 7. Publicação no Realtime
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'task_databases',
            'task_custom_statuses',
            'task_custom_types',
            'task_property_definitions',
            'task_comments'
        ]) AS tablename
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl.tablename
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl.tablename);
        END IF;
    END LOOP;
END $$;
