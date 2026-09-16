-- ============================================================================
-- MIGRATION: TASK SECTORS, STATUS ORDERING & PROPERTY PERSISTENCE
-- ============================================================================

-- 1. Adicionar coluna 'sector' na tabela task_custom_types
ALTER TABLE IF EXISTS public.task_custom_types
    ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'Geral';

-- 2. Seed dos tipos de tarefas estruturados por setores estratégicos
INSERT INTO public.task_custom_types (id, name, sector, icon, color)
VALUES
    -- Comercial
    ('com_contact', 'Contato Inicial', 'Comercial', 'Phone', '#3B82F6'),
    ('com_followup', 'Follow-up Comercial', 'Comercial', 'MessageSquare', '#10B981'),
    ('com_meeting', 'Reunião / Apresentação', 'Comercial', 'Users', '#8B5CF6'),
    ('com_proposal', 'Envio de Proposta / Negociação', 'Comercial', 'FileText', '#F59E0B'),
    ('com_closing', 'Fechamento de Contrato', 'Comercial', 'CheckCircle2', '#10B981'),

    -- Marketing
    ('mkt_campaign', 'Campanhas & Anúncios', 'Marketing', 'Megaphone', '#EC4899'),
    ('mkt_content', 'Produção de Conteúdo', 'Marketing', 'Camera', '#EC4899'),
    ('mkt_social', 'Gestão de Redes Sociais', 'Marketing', 'Globe', '#3B82F6'),
    ('mkt_partnerships', 'Parcerias & Influencers', 'Marketing', 'Users', '#8B5CF6'),

    -- Pós-Venda / Atendimento
    ('pos_alignment', 'Reunião de Alinhamento', 'Pós-Venda / Atendimento', 'Calendar', '#A78BFA'),
    ('pos_tasting', 'Degustação da Casa', 'Pós-Venda / Atendimento', 'Utensils', '#F59E0B'),
    ('pos_menu_decor', 'Confirmação Cardápio / Decoração', 'Pós-Venda / Atendimento', 'Sparkles', '#EC4899'),
    ('pos_survey', 'Pesquisa de Satisfação', 'Pós-Venda / Atendimento', 'Star', '#F59E0B'),

    -- Administrativo
    ('adm_contracts', 'Elaboração & Gestão de Contratos', 'Administrativo', 'FileText', '#64748B'),
    ('adm_documents', 'Gestão de Documentos', 'Administrativo', 'Paperclip', '#64748B'),
    ('adm_internal_meeting', 'Reunião Interna de Equipe', 'Administrativo', 'Users', '#3B82F6'),
    ('adm_hr', 'RH, Escalas & Colaboradores', 'Administrativo', 'UserCheck', '#10B981'),

    -- Financeiro
    ('fin_entry', 'Lançamento Financeiro', 'Financeiro', 'DollarSign', '#10B981'),
    ('fin_collection', 'Cobrança de Parcela', 'Financeiro', 'AlertCircle', '#EF4444'),
    ('fin_receipt', 'Emissão de Recibo / NF', 'Financeiro', 'FileText', '#10B981'),
    ('fin_reconciliation', 'Conciliação Bancária', 'Financeiro', 'CheckSquare', '#3B82F6'),

    -- Operacional / Eventos
    ('ops_inspection', 'Vistoria Pré-Evento', 'Operacional / Eventos', 'CheckCircle2', '#F59E0B'),
    ('ops_venue_check', 'Checagem de Espaço & Casa', 'Operacional / Eventos', 'Building2', '#3B82F6'),
    ('ops_maintenance', 'Manutenção Preventiva', 'Operacional / Eventos', 'Wrench', '#EF4444'),
    ('ops_inventory', 'Controle de Materiais / Estoque', 'Operacional / Eventos', 'Package', '#8B5CF6'),

    -- Geral
    ('gen_operational', 'Geral / Operacional', 'Geral', 'Briefcase', '#94A3B8')
ON CONFLICT (id) DO UPDATE SET
    sector = EXCLUDED.sector,
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;
