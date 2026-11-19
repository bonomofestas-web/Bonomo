import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { classifyChatActivity } from '../utils/chatActivity';
import type { CommercialFunnel, Lead } from '../types/admin';

/**
 * Tempo de resposta do COMERCIAL (pos-venda nunca entra: quem chama filtra os leads comerciais).
 * Um par = uma mensagem do cliente sem resposta ate a proxima mensagem da equipe OU o marcador
 * "Conversa Encerrada" (que classifica a ultima mensagem como respondida). Bot/automacao nao responde.
 */
export interface ResponsePair {
  leadId: string;
  clientAt: number;
  replyAt: number;
  minutes: number;
  responderId?: string;
  isFirst: boolean; // primeira resposta ao lead
}

export interface ResponseWindowStats {
  avgAll: number | null;   // media de TODAS as respostas (qualquer mensagem)
  avgFirst: number | null; // media da 1a resposta (leads criados na janela)
  pairs: number;
  firstCount: number;
}

export interface ResponderStats { avgAll: number | null; avgFirst: number | null; pairs: number }

interface ActivityRow { lead_id: string; type: string; title: string; timestamp: string; author_id: string | null; author_name?: string | null; metadata?: Record<string, any> | null }

const mean = (values: number[]): number | null => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

/** Funcao pura: monta os pares de resposta de uma conversa (atividades de um unico lead). */
export const buildResponsePairs = (
  leadId: string,
  rows: ActivityRow[],
  collaboratorIds: Set<string>,
  fallbackResponderId?: string,
): ResponsePair[] => {
  const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const pairs: ResponsePair[] = [];
  let pendingSince: number | null = null;
  let hadReply = false;

  sorted.forEach(row => {
    const t = new Date(row.timestamp).getTime();
    if (!Number.isFinite(t)) return;
    const kind = classifyChatActivity({
      type: row.type, title: row.title, authorId: row.author_id, authorName: row.author_name, metadata: row.metadata,
    }, collaboratorIds);
    if (kind === 'client') {
      if (pendingSince === null) pendingSince = t; // varias seguidas contam a partir da primeira
      return;
    }
    if ((kind === 'team' || kind === 'session_end') && pendingSince !== null) {
      pairs.push({
        leadId,
        clientAt: pendingSince,
        replyAt: t,
        minutes: Math.max(0, (t - pendingSince) / 60000),
        // Mensagens do celular/web chegam sem autor: atribui ao responsavel do lead
        responderId: row.author_id && collaboratorIds.has(row.author_id) ? row.author_id : fallbackResponderId,
        isFirst: !hadReply,
      });
      hadReply = true;
      pendingSince = null;
    }
  });
  return pairs;
};

/** Funcao pura: resume os pares em uma janela [start, end] (ms). */
export const summarizeResponsePairs = (
  pairs: ResponsePair[],
  windowMs: { start: number; end: number },
  leadCreatedAt: Map<string, number>,
): { total: ResponseWindowStats; byResponder: Map<string, ResponderStats> } => {
  const inWin = (t: number) => t >= windowMs.start && t <= windowMs.end;
  const all = pairs.filter(p => inWin(p.replyAt));
  // 1a resposta: leads CRIADOS na janela (a conversa nasce nela)
  const first = pairs.filter(p => p.isFirst && inWin(leadCreatedAt.get(p.leadId) ?? p.clientAt));

  const total: ResponseWindowStats = {
    avgAll: mean(all.map(p => p.minutes)),
    avgFirst: mean(first.map(p => p.minutes)),
    pairs: all.length,
    firstCount: first.length,
  };

  const ids = new Set<string>();
  [...all, ...first].forEach(p => { if (p.responderId) ids.add(p.responderId); });
  const byResponder = new Map<string, ResponderStats>();
  ids.forEach(id => {
    const a = all.filter(p => p.responderId === id);
    const f = first.filter(p => p.responderId === id);
    byResponder.set(id, { avgAll: mean(a.map(p => p.minutes)), avgFirst: mean(f.map(p => p.minutes)), pairs: a.length });
  });
  return { total, byResponder };
};

const CHUNK = 120;
const PAGE = 1000;
const MAX_PAGES = 20;
/** Cache em memoria: o mesmo escopo/janela nao volta ao banco por 10 min (protege a banda do plano gratuito). */
const CACHE_TTL_MS = 10 * 60 * 1000;
const pairsCache = new Map<string, { at: number; value: { pairs: ResponsePair[]; truncated: boolean } }>();

export const responseTimeService = {
  /**
   * Busca as atividades de conversa dos leads COMERCIAIS informados e monta os pares.
   * `leadIds` ja deve conter so leads comerciais do escopo (master/unidades) do usuario.
   */
  async fetchPairs(params: {
    leadIds: string[];
    startMs: number;
    endMs: number;
    collaboratorIds: Set<string>;
    ownerByLead: Map<string, string>;
  }): Promise<{ pairs: ResponsePair[]; truncated: boolean }> {
    const { leadIds, startMs, endMs, collaboratorIds, ownerByLead } = params;
    if (!isSupabaseConfigured || leadIds.length === 0) return { pairs: [], truncated: false };
    // Margem antes da janela: a pergunta do cliente pode ter vindo antes da resposta
    const cacheKey = `${leadIds.length}:${[...leadIds].sort().slice(0, 40).join(',')}:${Math.floor(startMs / 3600000)}:${Math.floor(endMs / 3600000)}`;
    const hit = pairsCache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const fromIso = new Date(startMs - 7 * 86400000).toISOString();
    const toIso = new Date(endMs).toISOString();
    const byLead = new Map<string, ActivityRow[]>();
    let truncated = false;
    let pagesUsed = 0;

    for (let i = 0; i < leadIds.length; i += CHUNK) {
      const chunk = leadIds.slice(i, i + CHUNK);
      for (let page = 0; page < MAX_PAGES && pagesUsed < MAX_PAGES * 2; page++) {
        pagesUsed += 1;
        const { data, error } = await supabase
          .from('lead_activities')
          .select('lead_id, type, title, timestamp, author_id, author_name, metadata')
          .in('lead_id', chunk)
          .in('type', ['contact', 'whatsapp', 'creation'])
          .gte('timestamp', fromIso)
          .lte('timestamp', toIso)
          .order('timestamp', { ascending: true })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        (data || []).forEach(row => {
          const list = byLead.get(row.lead_id as string);
          if (list) list.push(row as ActivityRow); else byLead.set(row.lead_id as string, [row as ActivityRow]);
        });
        if (!data || data.length < PAGE) break;
        if (page === MAX_PAGES - 1) truncated = true;
      }
    }

    const pairs: ResponsePair[] = [];
    byLead.forEach((rows, leadId) => {
      pairs.push(...buildResponsePairs(leadId, rows, collaboratorIds, ownerByLead.get(leadId)));
    });
    const value = { pairs, truncated };
    if (pairsCache.size > 30) pairsCache.clear();
    pairsCache.set(cacheKey, { at: Date.now(), value });
    return value;
  },
};

/**
 * Tempo de resposta COMERCIAL de uma unidade em uma janela (datas YYYY-MM-DD, inclusivas).
 * Usado pelas metas (progresso e virada de periodo). Leads de funis de pos-venda ficam de fora.
 */
export const summarizeVenueResponseWindow = async (params: {
  leads: Lead[];
  funnels: Pick<CommercialFunnel, 'id' | 'isPostSale'>[];
  collaboratorIds: Set<string>;
  venueId: string;
  startsOn: string;
  endsOn: string;
}): Promise<{ total: ResponseWindowStats; byResponder: Map<string, ResponderStats> }> => {
  const commercial = new Set(params.funnels.filter(f => !f.isPostSale).map(f => f.id));
  const ids: string[] = [];
  const created = new Map<string, number>();
  const owner = new Map<string, string>();
  params.leads.forEach(l => {
    if (l.venueId !== params.venueId || l.isRemovedFromFunnel) return;
    if (l.funnelId && !commercial.has(l.funnelId)) return;
    ids.push(l.id);
    created.set(l.id, new Date(l.createdAt).getTime());
    const o = l.sdrId || l.closerId;
    if (o) owner.set(l.id, o);
  });
  const startMs = new Date(`${params.startsOn}T00:00:00`).getTime();
  const endMs = new Date(`${params.endsOn}T23:59:59.999`).getTime();
  const { pairs } = await responseTimeService.fetchPairs({
    leadIds: ids, startMs, endMs, collaboratorIds: params.collaboratorIds, ownerByLead: owner,
  });
  return summarizeResponsePairs(pairs, { start: startMs, end: endMs }, created);
};
