import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  AdminTask, 
  TaskDatabase, 
  TaskCustomStatus, 
  TaskCustomType, 
  TaskPropertyDefinition, 
  TaskComment 
} from '../types/admin';

export const taskService = {
  // ── TASKS CRUD ─────────────────────────────────────────────────────────────
  async getAll(): Promise<AdminTask[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tarefas:', error);
        return [];
      }

      // Buscar comentários de todas as tarefas
      const { data: commentsData } = await supabase
        .from('task_comments')
        .select('*')
        .order('created_at', { ascending: true });

      const commentsByTask: Record<string, TaskComment[]> = {};
      (commentsData || []).forEach((c: any) => {
        if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
        commentsByTask[c.task_id].push({
          id: c.id,
          taskId: c.task_id,
          authorId: c.author_id,
          authorName: c.author_name,
          authorAvatar: c.author_avatar,
          text: c.text,
          createdAt: c.created_at,
        });
      });

      return (data || []).map((row: any) => ({
        id: row.id,
        databaseId: row.database_id || 'default_collabs',
        leadId: row.lead_id || row.custom_properties?.leadId || undefined,
        leadName: row.lead_name || row.custom_properties?.leadName || undefined,
        debutanteId: row.debutante_id || row.custom_properties?.debutanteId || row.custom_properties?.clientId || undefined,
        debutanteName: row.debutante_name || row.custom_properties?.debutanteName || row.custom_properties?.clientName || undefined,
        venueId: row.venue_id,
        title: row.title,
        description: row.description,
        content: row.content || '',
        dueDate: row.due_date,
        dueTime: row.due_time || '14:00',
        status: row.status || 'todo',
        customStatusId: row.custom_status_id || 'st_todo',
        priority: row.priority || 'medium',
        type: row.type || 'general',
        customType: row.custom_type || row.custom_properties?.customType || 'Geral / Operacional',
        createdById: row.created_by_id || 'system',
        createdByName: row.created_by_name || 'Sistema',
        assignedToIds: row.assigned_to_ids || [],
        customProperties: row.custom_properties || {},
        observations: row.observations || row.custom_properties?.observations || '',
        resolution: row.resolution || row.mandatory_feedback || row.custom_properties?.resolution || '',
        comments: commentsByTask[row.id] || [],
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Falha em getAll tasks:', err);
      return [];
    }
  },

  async upsert(task: Partial<AdminTask> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!task.id || !uuidRegex.test(task.id)) {
        console.warn('Upsert ignorado: task.id deve ser um UUID válido:', task.id);
        return false;
      }
      const payload: any = {};
      if (task.databaseId !== undefined) payload.database_id = task.databaseId;
      if (task.leadId !== undefined) payload.lead_id = (task.leadId && uuidRegex.test(task.leadId)) ? task.leadId : null;
      if (task.debutanteId !== undefined) payload.debutante_id = (task.debutanteId && uuidRegex.test(task.debutanteId)) ? task.debutanteId : null;
      if (task.venueId !== undefined) payload.venue_id = (task.venueId && uuidRegex.test(task.venueId)) ? task.venueId : null;
      if (task.title !== undefined) payload.title = task.title;
      if (task.description !== undefined) payload.description = task.description;
      if (task.content !== undefined) payload.content = task.content;
      if (task.dueDate !== undefined) payload.due_date = (task.dueDate && task.dueDate.trim() !== '') ? task.dueDate : null;
      if (task.dueTime !== undefined) payload.due_time = task.dueTime || null;
      if (task.status !== undefined) payload.status = task.status;
      if (task.customStatusId !== undefined) payload.custom_status_id = task.customStatusId;
      if (task.priority !== undefined) payload.priority = (task.priority && task.priority !== 'none') ? task.priority : 'none';
      if (task.type !== undefined) payload.type = task.type;
      if (task.customType !== undefined) payload.custom_type = task.customType;
      if (task.createdById !== undefined) {
        payload.created_by_id = (task.createdById && uuidRegex.test(task.createdById)) ? task.createdById : null;
      }
      if (task.createdByName !== undefined) payload.created_by_name = task.createdByName;
      if (task.assignedToIds !== undefined) {
        payload.assigned_to_ids = (task.assignedToIds || []).filter(id => typeof id === 'string' && uuidRegex.test(id));
      }
      
      if (task.resolution !== undefined) {
        payload.resolution = task.resolution;
      }

      const effectiveLeadId = task.leadId || task.customProperties?.leadId;
      const effectiveDebutanteId = task.debutanteId || task.customProperties?.debutanteId || task.customProperties?.clientId;

      const mergedCustomProps = {
        ...(task.customProperties || {}),
        ...(effectiveLeadId !== undefined ? { leadId: effectiveLeadId } : {}),
        ...(task.leadName !== undefined ? { leadName: task.leadName } : {}),
        ...(effectiveDebutanteId !== undefined ? { debutanteId: effectiveDebutanteId, clientId: effectiveDebutanteId } : {}),
        ...(task.debutanteName !== undefined ? { debutanteName: task.debutanteName, clientName: task.debutanteName } : {}),
        ...(task.observations !== undefined ? { observations: task.observations } : {}),
        ...(task.resolution !== undefined ? { resolution: task.resolution } : {}),
        ...(task.customType !== undefined ? { customType: task.customType } : {}),
      };
      payload.custom_properties = mergedCustomProps;

      let error;
      if (payload.title !== undefined) {
        const res = await supabase
          .from('admin_tasks')
          .upsert({ id: task.id, ...payload });
        error = res.error;
      } else {
        const res = await supabase
          .from('admin_tasks')
          .update(payload)
          .eq('id', task.id);
        error = res.error;
      }

      if (error) {
        console.error('Erro ao salvar tarefa no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em upsert task:', err);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir tarefa:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em delete task:', err);
      return false;
    }
  },

  // ── COMMENTS (CASCADE DELETE PRESERVED) ────────────────────────────────────
  async addComment(
    taskId: string, 
    authorOrComment: string | Omit<TaskComment, 'id' | 'createdAt'>, 
    text?: string, 
    authorId?: string, 
    authorAvatar?: string
  ): Promise<TaskComment | null> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const id = crypto.randomUUID();
    const authorName = typeof authorOrComment === 'string' ? authorOrComment : authorOrComment.authorName;
    const commentText = typeof authorOrComment === 'string' ? (text || '') : authorOrComment.text;
    const rawAuthorId = typeof authorOrComment === 'string' ? authorId : authorOrComment.authorId;
    const cleanAuthorId = (rawAuthorId && uuidRegex.test(rawAuthorId)) ? rawAuthorId : null;
    const aAvatar = typeof authorOrComment === 'string' ? authorAvatar : authorOrComment.authorAvatar;

    const comment: TaskComment = {
      id,
      taskId,
      authorId: cleanAuthorId || undefined,
      authorName,
      authorAvatar: aAvatar,
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) return comment;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          id,
          task_id: (taskId && uuidRegex.test(taskId)) ? taskId : null,
          author_id: cleanAuthorId,
          author_name: authorName,
          author_avatar: aAvatar,
          text: commentText,
        });

      if (error) {
        console.error('Erro ao inserir comentário no Supabase:', error);
        return null;
      }
      return comment;
    } catch (err) {
      console.error('Falha em addComment:', err);
      return null;
    }
  },

  // ── DATABASES ──────────────────────────────────────────────────────────────
  async getDatabases(_venueId?: string): Promise<TaskDatabase[]> {
    const fixedDatabases: TaskDatabase[] = [
      { id: 'default_collabs', name: 'Tarefas Gerais & Operacionais', description: 'Visão Geral de Tarefas', icon: '📋', isDefault: true, propertyOrder: ['status', 'due_date', 'assignees', 'priority', 'custom_type', 'lead_id'] },
      { id: 'db_followup', name: 'Follow-ups Comerciais', description: 'Gestão de contatos e retornos de vendas', icon: '📞', isDefault: false, propertyOrder: ['status', 'due_date', 'assignees', 'priority', 'custom_type', 'lead_id'] },
      { id: 'db_visits_tastings', name: 'Visitas & Degustações', description: 'Agendamentos e degustações do Pós-Venda', icon: '🍽️', isDefault: false, propertyOrder: ['status', 'due_date', 'assignees', 'priority', 'custom_type', 'debutante_id'] },
      { id: 'db_appointments', name: 'Compromissos', description: 'Reuniões e atendimentos com clientes', icon: '👥', isDefault: false, propertyOrder: ['status', 'due_date', 'assignees', 'priority', 'custom_type', 'debutante_id'] },
    ];

    if (!isSupabaseConfigured) {
      return fixedDatabases;
    }
    try {
      const { data, error } = await supabase
        .from('task_databases')
        .select('*')
        .order('is_default', { ascending: false });

      if (error || !data || data.length === 0) {
        return fixedDatabases;
      }

      const fetchedMap = new Map(data.map((d: any) => [d.id, d]));
      return fixedDatabases.map(fixed => {
        const existing = fetchedMap.get(fixed.id);
        if (existing) {
          return {
            id: existing.id,
            name: existing.name || fixed.name,
            description: existing.description || fixed.description,
            icon: existing.icon || fixed.icon,
            venueId: existing.venue_id,
            isDefault: Boolean(existing.is_default),
            propertyOrder: existing.property_order || fixed.propertyOrder,
            createdAt: existing.created_at,
          };
        }
        return fixed;
      });
    } catch (err) {
      console.error('Falha em getDatabases:', err);
      return fixedDatabases;
    }
  },

  async updatePropertyOrder(databaseId: string, propertyOrder: string[]): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { error } = await supabase
        .from('task_databases')
        .update({ property_order: propertyOrder })
        .eq('id', databaseId);

      if (error) {
        console.error('Erro ao atualizar property_order:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha em updatePropertyOrder:', err);
      return false;
    }
  },

  async createDatabase(
    paramsOrName: string | { name: string; description?: string; icon?: string; venueId?: string },
    description?: string,
    icon?: string
  ): Promise<TaskDatabase | null> {
    const id = `db_${Date.now()}`;
    const name = typeof paramsOrName === 'string' ? paramsOrName : paramsOrName.name;
    const desc = typeof paramsOrName === 'string' ? description : paramsOrName.description;
    const dbIcon = typeof paramsOrName === 'string' ? (icon || '📋') : (paramsOrName.icon || '📋');
    const venueId = typeof paramsOrName === 'string' ? undefined : paramsOrName.venueId;

    const newDb: TaskDatabase = { id, name, description: desc, icon: dbIcon, venueId, isDefault: false };
    if (!isSupabaseConfigured) return newDb;
    try {
      const { error } = await supabase.from('task_databases').insert({
        id,
        name,
        description: desc,
        icon: dbIcon,
        venue_id: venueId,
        is_default: false,
      });
      if (error) {
        console.error('Erro ao criar base de dados de tarefas:', error);
        return null;
      }
      return newDb;
    } catch (err) {
      console.error('Falha em createDatabase:', err);
      return null;
    }
  },

  async deleteDatabase(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { error } = await supabase.from('task_databases').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // ── STATUSES ───────────────────────────────────────────────────────────────
  async getCustomStatuses(databaseId = 'default_collabs'): Promise<TaskCustomStatus[]> {
    let defaults: TaskCustomStatus[] = [
      { id: 'st_todo', databaseId, name: 'Não iniciado', groupKey: 'todo', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.14)', orderIndex: 0, isDefault: true },
      { id: 'st_doing', databaseId, name: 'Fazendo', groupKey: 'in_progress', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.14)', orderIndex: 1, isDefault: false },
      { id: 'st_done', databaseId, name: 'Finalizado', groupKey: 'completed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.14)', orderIndex: 2, isDefault: false },
    ];

    if (databaseId === 'db_followup') {
      defaults = [
        { id: 'st_fol_todo', databaseId, name: 'A Fazer', groupKey: 'todo', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.14)', orderIndex: 0, isDefault: true },
        { id: 'st_fol_try1', databaseId, name: '1ª Tentativa', groupKey: 'in_progress', color: '#0284C7', bgColor: 'rgba(2, 132, 199, 0.14)', orderIndex: 1, isDefault: false },
        { id: 'st_fol_try2', databaseId, name: '2ª Tentativa', groupKey: 'in_progress', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.14)', orderIndex: 2, isDefault: false },
        { id: 'st_fol_contacted', databaseId, name: 'Contatado', groupKey: 'in_progress', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.14)', orderIndex: 3, isDefault: false },
        { id: 'st_fol_done', databaseId, name: 'Finalizado / Convertido', groupKey: 'completed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.14)', orderIndex: 4, isDefault: false },
      ];
    } else if (databaseId === 'db_visits_tastings') {
      defaults = [
        { id: 'st_vt_scheduled', databaseId, name: 'Agendado', groupKey: 'todo', color: '#0284C7', bgColor: 'rgba(2, 132, 199, 0.14)', orderIndex: 0, isDefault: true },
        { id: 'st_vt_confirmed', databaseId, name: 'Confirmado', groupKey: 'in_progress', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.14)', orderIndex: 1, isDefault: false },
        { id: 'st_vt_done', databaseId, name: 'Realizado / Aprovado', groupKey: 'completed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.14)', orderIndex: 2, isDefault: false },
        { id: 'st_vt_noshow', databaseId, name: 'Não Compareceu', groupKey: 'completed', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.14)', orderIndex: 3, isDefault: false },
      ];
    } else if (databaseId === 'db_appointments') {
      defaults = [
        { id: 'st_app_scheduled', databaseId, name: 'Agendado', groupKey: 'todo', color: '#7C3AED', bgColor: 'rgba(124, 58, 237, 0.14)', orderIndex: 0, isDefault: true },
        { id: 'st_app_doing', databaseId, name: 'Em Atendimento', groupKey: 'in_progress', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.14)', orderIndex: 1, isDefault: false },
        { id: 'st_app_done', databaseId, name: 'Concluído', groupKey: 'completed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.14)', orderIndex: 2, isDefault: false },
        { id: 'st_app_cancelled', databaseId, name: 'Cancelado / Remarcado', groupKey: 'completed', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.14)', orderIndex: 3, isDefault: false },
      ];
    }

    if (!isSupabaseConfigured) return defaults;
    try {
      const { data, error } = await supabase
        .from('task_custom_statuses')
        .select('*')
        .eq('database_id', databaseId)
        .order('order_index', { ascending: true });

      if (error || !data || data.length === 0) return defaults;

      return data.map((s: any) => ({
        id: s.id,
        databaseId: s.database_id,
        name: s.name,
        groupKey: s.group_key,
        color: s.color,
        bgColor: s.bg_color,
        orderIndex: s.order_index,
        isDefault: Boolean(s.is_default),
        createdAt: s.created_at,
      }));
    } catch {
      return defaults;
    }
  },

  async addCustomStatus(status: Omit<TaskCustomStatus, 'id'>): Promise<TaskCustomStatus | null> {
    const id = `st_${Date.now()}`;
    const newStatus: TaskCustomStatus = { id, ...status };
    if (!isSupabaseConfigured) return newStatus;
    try {
      const { error } = await supabase.from('task_custom_statuses').insert({
        id,
        database_id: status.databaseId,
        name: status.name,
        group_key: status.groupKey,
        color: status.color,
        bg_color: status.bgColor,
        order_index: status.orderIndex,
        is_default: status.isDefault || false,
      });
      if (error) {
        console.error('Erro ao adicionar status customizado:', error);
        return null;
      }
      return newStatus;
    } catch {
      return null;
    }
  },

  async updateCustomStatus(id: string, updates: Partial<TaskCustomStatus>): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.groupKey !== undefined) payload.group_key = updates.groupKey;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.bgColor !== undefined) payload.bg_color = updates.bgColor;
      if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;
      if (updates.isDefault !== undefined) payload.is_default = updates.isDefault;

      const { error } = await supabase
        .from('task_custom_statuses')
        .update(payload)
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  },

  async deleteCustomStatus(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { error } = await supabase
        .from('task_custom_statuses')
        .delete()
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  },

  async reorderCustomStatuses(_databaseId: string, orderedStatuses: TaskCustomStatus[]): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      // Bulk update order_index and group_key
      const promises = orderedStatuses.map((s, idx) => 
        supabase
          .from('task_custom_statuses')
          .update({ order_index: idx, group_key: s.groupKey, is_default: !!s.isDefault })
          .eq('id', s.id)
      );
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error('Erro ao reordenar status:', err);
      return false;
    }
  },

  // ── TYPES (AGRUPADOS POR SETORES) ──────────────────────────────────────────
  async getCustomTypes(_venueId?: string): Promise<TaskCustomType[]> {
    const defaults: TaskCustomType[] = [
      { id: 'com_contact', name: 'Contato Inicial', sector: 'Comercial', icon: 'Phone', color: '#3B82F6' },
      { id: 'com_followup', name: 'Follow-up Comercial', sector: 'Comercial', icon: 'MessageSquare', color: '#10B981' },
      { id: 'com_meeting', name: 'Reunião / Apresentação', sector: 'Comercial', icon: 'Users', color: '#8B5CF6' },
      { id: 'com_proposal', name: 'Envio de Proposta / Negociação', sector: 'Comercial', icon: 'FileText', color: '#F59E0B' },
      { id: 'com_closing', name: 'Fechamento de Contrato', sector: 'Comercial', icon: 'CheckCircle2', color: '#10B981' },

      { id: 'mkt_campaign', name: 'Campanhas & Anúncios', sector: 'Marketing', icon: 'Megaphone', color: '#EC4899' },
      { id: 'mkt_content', name: 'Produção de Conteúdo', sector: 'Marketing', icon: 'Camera', color: '#EC4899' },
      { id: 'mkt_social', name: 'Gestão de Redes Sociais', sector: 'Marketing', icon: 'Globe', color: '#3B82F6' },
      { id: 'mkt_partnerships', name: 'Parcerias & Influencers', sector: 'Marketing', icon: 'Users', color: '#8B5CF6' },

      { id: 'pos_alignment', name: 'Reunião de Alinhamento', sector: 'Pós-Venda / Atendimento', icon: 'Calendar', color: '#A78BFA' },
      { id: 'pos_tasting', name: 'Degustação da Casa', sector: 'Pós-Venda / Atendimento', icon: 'Utensils', color: '#F59E0B' },
      { id: 'pos_menu_decor', name: 'Confirmação Cardápio / Decoração', sector: 'Pós-Venda / Atendimento', icon: 'Sparkles', color: '#EC4899' },
      { id: 'pos_survey', name: 'Pesquisa de Satisfação', sector: 'Pós-Venda / Atendimento', icon: 'Star', color: '#F59E0B' },

      { id: 'adm_contracts', name: 'Elaboração & Gestão de Contratos', sector: 'Administrativo', icon: 'FileText', color: '#64748B' },
      { id: 'adm_documents', name: 'Gestão de Documentos', sector: 'Administrativo', icon: 'Paperclip', color: '#64748B' },
      { id: 'adm_internal_meeting', name: 'Reunião Interna de Equipe', sector: 'Administrativo', icon: 'Users', color: '#3B82F6' },
      { id: 'adm_hr', name: 'RH, Escalas & Colaboradores', sector: 'Administrativo', icon: 'UserCheck', color: '#10B981' },

      { id: 'fin_entry', name: 'Lançamento Financeiro', sector: 'Financeiro', icon: 'DollarSign', color: '#10B981' },
      { id: 'fin_collection', name: 'Cobrança de Parcela', sector: 'Financeiro', icon: 'AlertCircle', color: '#EF4444' },
      { id: 'fin_receipt', name: 'Emissão de Recibo / NF', sector: 'Financeiro', icon: 'FileText', color: '#10B981' },
      { id: 'fin_reconciliation', name: 'Conciliação Bancária', sector: 'Financeiro', icon: 'CheckSquare', color: '#3B82F6' },

      { id: 'ops_inspection', name: 'Vistoria Pré-Evento', sector: 'Operacional / Eventos', icon: 'CheckCircle2', color: '#F59E0B' },
      { id: 'ops_venue_check', name: 'Checagem de Espaço & Casa', sector: 'Operacional / Eventos', icon: 'Building2', color: '#3B82F6' },
      { id: 'ops_maintenance', name: 'Manutenção Preventiva', sector: 'Operacional / Eventos', icon: 'Wrench', color: '#EF4444' },
      { id: 'ops_inventory', name: 'Controle de Materiais / Estoque', sector: 'Operacional / Eventos', icon: 'Package', color: '#8B5CF6' },

      { id: 'gen_operational', name: 'Geral / Operacional', sector: 'Geral', icon: 'Briefcase', color: '#94A3B8' },
    ];

    if (!isSupabaseConfigured) return defaults;
    try {
      const { data, error } = await supabase
        .from('task_custom_types')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) return defaults;

      return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        sector: t.sector || 'Geral',
        icon: t.icon || 'Briefcase',
        color: t.color || '#3B82F6',
        createdAt: t.created_at,
      }));
    } catch {
      return defaults;
    }
  },

  async addCustomType(name: string, sector = 'Geral'): Promise<TaskCustomType | null> {
    const id = `type_${Date.now()}`;
    const newType: TaskCustomType = { id, name, sector, icon: 'Briefcase', color: '#3B82F6' };
    if (!isSupabaseConfigured) return newType;
    try {
      const { error } = await supabase.from('task_custom_types').insert({
        id,
        name,
        sector,
        icon: 'Briefcase',
        color: '#3B82F6',
      });
      if (error) {
        console.error('Erro ao criar tipo de tarefa:', error);
        return null;
      }
      return newType;
    } catch {
      return null;
    }
  },

  async createCustomType(name: string, sector = 'Geral'): Promise<TaskCustomType | null> {
    return this.addCustomType(name, sector);
  },

  // ── PROPERTY DEFINITIONS ───────────────────────────────────────────────────
  async getPropertyDefinitions(databaseId = 'default_collabs'): Promise<TaskPropertyDefinition[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('task_property_definitions')
        .select('*')
        .eq('database_id', databaseId)
        .order('order_index', { ascending: true });

      if (error || !data) return [];
      return data.map((p: any) => ({
        id: p.id,
        databaseId: p.database_id,
        name: p.name,
        type: p.type,
        options: p.options || [],
        orderIndex: p.order_index,
        createdAt: p.created_at,
      }));
    } catch {
      return [];
    }
  },

  async addPropertyDefinition(prop: Omit<TaskPropertyDefinition, 'id'>): Promise<TaskPropertyDefinition | null> {
    const id = `prop_${Date.now()}`;
    const newProp: TaskPropertyDefinition = { id, ...prop };
    if (!isSupabaseConfigured) return newProp;
    try {
      const { error } = await supabase.from('task_property_definitions').insert({
        id,
        database_id: prop.databaseId,
        name: prop.name,
        type: prop.type,
        options: prop.options || [],
        order_index: prop.orderIndex,
      });
      if (error) {
        console.error('Erro ao adicionar propriedade customizada:', error);
        return null;
      }
      return newProp;
    } catch {
      return null;
    }
  },

  async updatePropertyDefinition(id: string, updates: Partial<TaskPropertyDefinition>): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.options !== undefined) payload.options = updates.options;
      if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

      const { error } = await supabase
        .from('task_property_definitions')
        .update(payload)
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  },

  async deletePropertyDefinition(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { error } = await supabase
        .from('task_property_definitions')
        .delete()
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  },

  async reorderPropertyDefinitions(_databaseId: string, orderedProperties: TaskPropertyDefinition[]): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const promises = orderedProperties.map((p, idx) =>
        supabase
          .from('task_property_definitions')
          .update({ order_index: idx })
          .eq('id', p.id)
      );
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error('Erro ao reordenar propriedades:', err);
      return false;
    }
  }
};
