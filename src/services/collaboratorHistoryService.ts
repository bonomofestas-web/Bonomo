import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Historico imutavel de mudancas do colaborador (cargo, setores, unidades, ativacao). Falha em silencio: nunca trava a acao principal. */
export type CollaboratorHistoryAction = 'created' | 'role_changed' | 'sectors_changed' | 'venues_changed' | 'deactivated' | 'reactivated' | 'updated';

export interface CollaboratorHistoryEntry {
  id: string;
  action: CollaboratorHistoryAction;
  details: string;
  actorName: string;
  createdAt: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const collaboratorHistoryService = {
  async add(entry: { masterId?: string; collaboratorId: string; action: CollaboratorHistoryAction; details?: string; actorId?: string; actorName?: string }): Promise<void> {
    if (!isSupabaseConfigured || !entry.masterId || !UUID_RE.test(entry.masterId) || !UUID_RE.test(entry.collaboratorId)) return;
    const { error } = await supabase.from('collaborator_history').insert({
      master_id: entry.masterId,
      collaborator_id: entry.collaboratorId,
      action: entry.action,
      details: entry.details ? entry.details.slice(0, 500) : null,
      actor_id: entry.actorId && UUID_RE.test(entry.actorId) ? entry.actorId : null,
      actor_name: entry.actorName || null,
    });
    if (error) console.warn('[collaboratorHistory.add]', error.message);
  },

  async list(masterId: string, collaboratorId: string, limit = 50): Promise<CollaboratorHistoryEntry[]> {
    if (!isSupabaseConfigured || !UUID_RE.test(masterId) || !UUID_RE.test(collaboratorId)) return [];
    const { data, error } = await supabase
      .from('collaborator_history')
      .select('id, action, details, actor_name, created_at')
      .eq('master_id', masterId)
      .eq('collaborator_id', collaboratorId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.warn('[collaboratorHistory.list]', error.message); return []; }
    return (data || []).map(r => ({
      id: r.id as string,
      action: r.action as CollaboratorHistoryAction,
      details: (r.details as string) || '',
      actorName: (r.actor_name as string) || 'Sistema',
      createdAt: r.created_at as string,
    }));
  },
};
