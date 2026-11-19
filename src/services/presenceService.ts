import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Presenca ao vivo da equipe (uma linha por colaborador, sem Realtime).
 * Protecoes do plano gratuito: teto de gravacoes por hora, recuo em erro e parada em tabela ausente/sem permissao.
 */
export type PresenceEntityType = 'lead' | 'client' | 'task' | 'appointment' | 'none';

export interface PresenceRow {
  collaboratorId: string;
  view: string | null;
  entityType: PresenceEntityType;
  entityId: string | null;
  entityLabel: string | null;
  lastSeenAt: number;
}

export interface PresencePayload {
  collaboratorId: string;
  masterId: string;
  venueId?: string | null;
  view: string;
  entityType: PresenceEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
}

/**
 * RECURSO NA GAVETA: presenca ao vivo desligada por decisao de custo (cota do Supabase gratuito).
 * Com false, nada grava nem le: nenhum timer, nenhuma requisicao. Para reativar, mude para true
 * (e confira a chave remota team_presence em Dev). A tabela collaborator_presence continua no banco, vazia.
 */
export const PRESENCE_ENABLED = false;

const MAX_WRITES_PER_HOUR = 120;
const BACKOFF_MS = 10 * 60 * 1000;
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let writeTimes: number[] = [];
let blockedUntil = 0;
let disabledForSession = false;

const handleError = (error: { code?: string; status?: number; message?: string }) => {
  const code = String(error.code || '');
  // tabela ausente, sem permissao (RLS) ou cota: para na sessao; demais erros: recuo de 10 min
  if (code === '42P01' || code === 'PGRST205' || code === '42501' || error.status === 401 || error.status === 403 || error.status === 402) {
    disabledForSession = true;
  } else {
    blockedUntil = Date.now() + BACKOFF_MS;
  }
};

export const presenceService = {
  ONLINE_WINDOW_MS,

  /** Grava a presenca da pessoa (upsert sem retorno: ~0 bytes de resposta). */
  async publish(p: PresencePayload): Promise<void> {
    if (!PRESENCE_ENABLED || !isSupabaseConfigured || disabledForSession || Date.now() < blockedUntil) return;
    if (!UUID_RE.test(p.collaboratorId) || !UUID_RE.test(p.masterId)) return;
    const now = Date.now();
    writeTimes = writeTimes.filter(t => now - t < 3600000);
    if (writeTimes.length >= MAX_WRITES_PER_HOUR) return;
    writeTimes.push(now);
    const { error } = await supabase.from('collaborator_presence').upsert({
      collaborator_id: p.collaboratorId,
      master_id: p.masterId,
      venue_id: p.venueId && UUID_RE.test(p.venueId) ? p.venueId : null,
      view: p.view.slice(0, 40),
      entity_type: p.entityType,
      entity_id: p.entityId ? String(p.entityId).slice(0, 64) : null,
      entity_label: p.entityLabel ? p.entityLabel.slice(0, 60) : null,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'collaborator_id' });
    if (error) handleError(error as any);
  },

  /** Le a presenca de UMA pessoa (resposta minima, ~250 bytes). Usada so no perfil aberto. */
  async getOne(masterId: string, collaboratorId: string): Promise<PresenceRow | null> {
    if (!PRESENCE_ENABLED || !isSupabaseConfigured || disabledForSession || Date.now() < blockedUntil || !UUID_RE.test(masterId) || !UUID_RE.test(collaboratorId)) return null;
    const { data, error } = await supabase
      .from('collaborator_presence')
      .select('collaborator_id, view, entity_type, entity_id, entity_label, last_seen_at')
      .eq('master_id', masterId)
      .eq('collaborator_id', collaboratorId)
      .maybeSingle();
    if (error) { handleError(error as any); return null; }
    if (!data) return null;
    return {
      collaboratorId: data.collaborator_id as string,
      view: (data.view as string) || null,
      entityType: (data.entity_type as PresenceEntityType) || 'none',
      entityId: (data.entity_id as string) || null,
      entityLabel: (data.entity_label as string) || null,
      lastSeenAt: new Date(data.last_seen_at as string).getTime(),
    };
  },

  /** Le quem esta online (ultimos 3 min) do Master. Colunas minimas. */
  async listOnline(masterId: string): Promise<PresenceRow[]> {
    if (!PRESENCE_ENABLED || !isSupabaseConfigured || disabledForSession || Date.now() < blockedUntil || !UUID_RE.test(masterId)) return [];
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { data, error } = await supabase
      .from('collaborator_presence')
      .select('collaborator_id, view, entity_type, entity_id, entity_label, last_seen_at')
      .eq('master_id', masterId)
      .gte('last_seen_at', since)
      .limit(100);
    if (error) { handleError(error as any); return []; }
    return (data || []).map(r => ({
      collaboratorId: r.collaborator_id as string,
      view: (r.view as string) || null,
      entityType: (r.entity_type as PresenceEntityType) || 'none',
      entityId: (r.entity_id as string) || null,
      entityLabel: (r.entity_label as string) || null,
      lastSeenAt: new Date(r.last_seen_at as string).getTime(),
    }));
  },
};
