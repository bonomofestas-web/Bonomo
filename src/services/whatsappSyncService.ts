import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { leadService, findMatchingLead } from './leadService';
import { contactService } from './contactService';
import { isLidIdentifier } from './uazapiSseService';
import {
  whatsappMediaService,
  MediaDownloadError,
  MediaPendingError,
  resolveMediaMessageIds,
} from './whatsappMediaService';
import { mediaStorageService } from './mediaStorageService';
import { generateUuid } from '../utils/uuid';
import type { Lead, LeadActivity, Contact } from '../types/admin';
import type { Source } from '../types/sources';

/**
 * Motor da Central de Sincronização do WhatsApp.
 * Fases independentes (a tela mostra cada uma): comparar com o banco -> revisar -> gravar -> recuperar mídias.
 * Regras: tudo escopado por master (leads recebidos já vêm escopados do contexto), nunca regrava o que já existe,
 * grava em lote e aceita cancelamento. Nenhuma mensagem existente é alterada ou apagada.
 */

export interface RecoveredMessage {
  instanceToken: string;
  senderPhone: string;
  senderName: string;
  profilePicUrl?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  timestamp: string;
  fromMe?: boolean;
  messageId?: string;
  waId?: string;
  rawPayload: any;
}

/** Limites da sincronização (período limitado para não sobrecarregar o celular, a UAZAPI e o sistema). */
export const SYNC_LIMITS = {
  /** Período máximo selecionável (dias) */
  maxDays: 30,
  /** Até este período a UAZAPI cobre sozinha; acima dele o celular é SEMPRE requisitado */
  apiWindowDays: 7,
  /** Mensagens pedidas ao celular por rodada (máximo da UAZAPI) */
  requestCount: 100,
  maxRoundsPerChat: 15,
  maxMessagesPerChat: 1500,
  chatTimeBudgetMs: 4 * 60 * 1000,
  /** Conversas seguidas sem resposta do celular antes de desistir da etapa */
  maxConsecutivePhoneFailures: 2,
} as const;

export type CoverageStatus = 'complete' | 'partial' | 'api_only';
export interface ChatCoverage {
  status: CoverageStatus;
  /** Por que ficou parcial (mostrado na revisão e no relatório) */
  reason?: string;
  /** true = chegamos até o início do período ou ao começo da conversa */
  reachedStart: boolean;
}

export interface SyncChatPlan {
  key: string;
  coverage?: ChatCoverage;
  phone: string;
  name: string;
  avatarUrl?: string;
  rawJid: string;
  rawLid: string;
  /** Todas as mensagens do período vindas da UAZAPI */
  totalMessages: number;
  /** Apenas as que ainda NÃO existem no banco (o que será gravado) */
  newMessages: RecoveredMessage[];
  lead?: Lead;
  action: 'create' | 'update';
  mediaCount: number;
}

export interface SyncPlan {
  chats: SyncChatPlan[];
  /** Conversas já em dia (existem e sem mensagens novas): não aparecem na revisão */
  upToDate: number;
  fetchedMessages: number;
  fetchedChats: number;
}

export interface MediaQueueItem {
  activityId: string;
  leadId: string;
  leadName: string;
  text: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  messageIds: string[];
  baseMeta: Record<string, any>;
}

export interface SyncApplyResult {
  created: number;
  updated: number;
  messagesSaved: number;
  failed: Array<{ name: string; phone: string; error: string }>;
  mediaQueue: MediaQueueItem[];
  cancelled: boolean;
}

export interface MediaPhaseResult {
  stored: number;
  pending: Array<{ leadName: string; mediaType: string; sizeBytes?: number; reason: string }>;
  askedPhone: number;
  cancelled: boolean;
}

const normText = (t: string) =>
  (t || '').replace(/^\[media:[^\]]*\]\s*/i, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 30);
const timeTextKey = (iso: string, text: string) => `t:${Math.floor(new Date(iso).getTime() / 1000)}:${normText(text)}`;

function shortIdOf(msg: RecoveredMessage): string | undefined {
  const raw = msg.rawPayload || {};
  return msg.messageId || raw.messageid || raw.messageId || (typeof raw.id === 'string' && raw.id.includes(':') ? raw.id.split(':').pop() : undefined);
}

/** Agrupa as mensagens recuperadas por conversa (telefone). */
export function groupMessagesByChat(recovered: RecoveredMessage[]): Map<string, {
  phone: string; name: string; avatarUrl?: string; rawJid: string; rawLid: string; messages: RecoveredMessage[];
}> {
  const map = new Map<string, any>();
  for (const msg of recovered) {
    const phone = (msg.senderPhone || '').replace(/\D/g, '');
    if (!phone || phone.length < 8) continue;
    const rawJid = msg.rawPayload?.key?.remoteJid || msg.rawPayload?.remoteJid || msg.rawPayload?.chatId || msg.rawPayload?.chatid || '';
    const rawLid = (isLidIdentifier(msg.senderPhone) ? msg.senderPhone : '') || (String(rawJid).includes('@lid') ? rawJid : '');
    let group = map.get(phone);
    if (!group) {
      group = { phone, name: msg.senderName || `Contato ${phone.slice(-4)}`, avatarUrl: msg.profilePicUrl, rawJid, rawLid, messages: [] };
      map.set(phone, group);
    }
    // O nome do contato vem das mensagens recebidas; as enviadas trazem o rótulo genérico do app
    if (!msg.fromMe && msg.senderName && msg.senderName !== 'Cliente (WhatsApp)') group.name = msg.senderName;
    group.messages.push(msg);
  }
  return map;
}

/** Chaves das mensagens que o banco já tem (ids da UAZAPI e, na falta deles, instante+texto), por lead. Só colunas mínimas. */
async function fetchKnownKeys(leadIds: string[], sinceIso: string, signal?: AbortSignal): Promise<Map<string, Set<string>>> {
  const known = new Map<string, Set<string>>();
  for (const id of leadIds) known.set(id, new Set());
  if (!isSupabaseConfigured) return known;

  for (let i = 0; i < leadIds.length; i += 25) {
    const chunk = leadIds.slice(i, i + 25);
    for (let from = 0; ; from += 1000) {
      if (signal?.aborted) return known;
      const { data, error } = await supabase
        .from('lead_activities')
        .select('lead_id, timestamp, txt:text, mid:metadata->>messageId, wid:metadata->>waId, sid:metadata->>shortId')
        .in('lead_id', chunk)
        .gte('timestamp', sinceIso)
        .order('timestamp', { ascending: false })
        .range(from, from + 999);
      if (error) { console.warn('[sync] fetchKnownKeys:', error.message); break; }
      for (const row of (data || []) as any[]) {
        const set = known.get(row.lead_id);
        if (!set) continue;
        if (row.mid) set.add(String(row.mid));
        if (row.wid) set.add(String(row.wid));
        if (row.sid) set.add(String(row.sid));
        set.add(timeTextKey(row.timestamp, row.txt || ''));
      }
      if (!data || data.length < 1000) break;
    }
  }
  return known;
}

/**
 * FASE "Buscar no celular": para cada conversa cuja mensagem mais antiga ainda é POSTERIOR ao início do período,
 * pede ao celular as 100 mensagens anteriores à mais antiga que temos (/message/history-sync), relê a conversa na
 * UAZAPI (onde as mensagens recuperadas passam a ficar disponíveis) e repete até chegar ao início do período,
 * ao começo da conversa ou a um dos limites. Conversas continuam sendo processadas uma de cada vez (1 pedido ativo por conversa).
 */
export async function deepenFromPhone(params: {
  token: string;
  recovered: RecoveredMessage[];
  startTimestamp: number;
  endTimestamp: number;
  signal?: AbortSignal;
  onProgress?: (p: { done: number; total: number; name?: string; detail?: string }) => void;
  onLog?: (line: string) => void;
}): Promise<{ messages: RecoveredMessage[]; coverage: Map<string, ChatCoverage>; phoneUnreachable: boolean; requests: number }> {
  const { token, recovered, startTimestamp, endTimestamp, signal, onProgress, onLog } = params;
  const { uazapiService } = await import('./uazapiService');
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const tsOf = (m: RecoveredMessage) => new Date(m.timestamp).getTime();
  const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const groups = groupMessagesByChat(recovered);
  const coverage = new Map<string, ChatCoverage>();
  const output: RecoveredMessage[] = [];
  const candidates: Array<{ phone: string; g: ReturnType<typeof groups.get> & {} }> = [];

  groups.forEach((g, phone) => {
    const oldest = Math.min(...g.messages.map(tsOf));
    // A UAZAPI já trouxe mensagens de antes do início do período: nada a pedir ao celular
    if (oldest <= startTimestamp + 60_000) {
      coverage.set(phone, { status: 'complete', reachedStart: true });
      output.push(...g.messages);
    } else {
      candidates.push({ phone, g: g as any });
    }
  });

  let requests = 0;
  let consecutiveFailures = 0;
  let phoneUnreachable = false;

  for (let ci = 0; ci < candidates.length; ci++) {
    const { phone, g } = candidates[ci];
    let current = [...g.messages].sort((a, b) => tsOf(a) - tsOf(b));

    if (signal?.aborted) { coverage.set(phone, { status: 'partial', reason: 'Cancelado', reachedStart: false }); output.push(...current); continue; }
    if (phoneUnreachable) {
      coverage.set(phone, { status: 'partial', reason: 'Celular indisponível: só a janela da UAZAPI foi trazida', reachedStart: false });
      output.push(...current);
      continue;
    }

    const jid = g.rawJid && String(g.rawJid).includes('@')
      ? String(g.rawJid).replace(/:\d+@/, '@')
      : `${phone}@s.whatsapp.net`;
    const chatStartedAt = Date.now();
    let status: ChatCoverage = { status: 'partial', reason: 'Limite de rodadas atingido', reachedStart: false };
    let noProgress = 0;
    let firstRequest = true;

    for (let round = 1; round <= SYNC_LIMITS.maxRoundsPerChat; round++) {
      if (signal?.aborted) { status = { status: 'partial', reason: 'Cancelado', reachedStart: false }; break; }
      const oldest = current[0];
      if (tsOf(oldest) <= startTimestamp + 60_000) { status = { status: 'complete', reachedStart: true }; break; }
      if (current.length >= SYNC_LIMITS.maxMessagesPerChat) { status = { status: 'partial', reason: `Limite de ${SYNC_LIMITS.maxMessagesPerChat} mensagens por conversa`, reachedStart: false }; break; }
      if (Date.now() - chatStartedAt > SYNC_LIMITS.chatTimeBudgetMs) { status = { status: 'partial', reason: 'Tempo máximo por conversa atingido', reachedStart: false }; break; }

      onProgress?.({
        done: ci, total: candidates.length, name: g.name,
        detail: `${g.name}: pedindo ao celular mais ${SYNC_LIMITS.requestCount} mensagens (até ${fmtDay(startTimestamp)}) - rodada ${round}`,
      });

      requests += 1;
      const r = await uazapiService.requestHistorySync(token, {
        number: jid,
        messageid: shortIdOf(oldest),
        timestamp: tsOf(oldest),
        fromMe: !!oldest.fromMe,
        count: SYNC_LIMITS.requestCount,
      });

      if (!r.ok) {
        if (firstRequest) consecutiveFailures += 1;
        status = { status: 'partial', reason: 'O celular não respondeu (abra o WhatsApp do chip e deixe-o ativo)', reachedStart: false };
        if (consecutiveFailures >= SYNC_LIMITS.maxConsecutivePhoneFailures) phoneUnreachable = true;
        break;
      }
      firstRequest = false;
      consecutiveFailures = 0;
      if (r.status === 'blocked') { status = { status: 'partial', reason: 'A UAZAPI não liberou mais histórico desta conversa', reachedStart: false }; break; }
      if (r.status === 'timeout' || r.status === 'pending') await sleep(4000); // mensagens podem chegar logo após o prazo

      const reread = await uazapiService.recoverMessagesInInterval(token, {
        startTimestamp,
        endTimestamp,
        limitPerChat: Math.min(SYNC_LIMITS.maxMessagesPerChat, current.length + SYNC_LIMITS.requestCount + 50),
        onlyChats: [{ wa_chatid: jid, phone, wa_name: g.name, image: g.avatarUrl }],
        signal,
      }) as unknown as RecoveredMessage[];

      if (reread.length > current.length) {
        current = [...reread].sort((a, b) => tsOf(a) - tsOf(b));
        noProgress = 0;
        if (r.hasMore === false) { status = { status: 'complete', reachedStart: true }; break; } // começo da conversa
      } else {
        // Nada novo: se a UAZAPI confirmou que não há mais, a conversa começou dentro do período
        if (r.hasMore === false) { status = { status: 'complete', reachedStart: true }; break; }
        noProgress += 1;
        if (noProgress >= 2) { status = { status: 'partial', reason: 'O celular não devolveu mais mensagens', reachedStart: false }; break; }
      }
    }

    coverage.set(phone, status);
    output.push(...current);
    onLog?.(`${g.name}: ${current.length} mensagem(ns) no período - ${status.status === 'complete' ? 'histórico completo' : `parcial (${status.reason})`}.`);
    onProgress?.({ done: ci + 1, total: candidates.length, name: g.name });
    if (phoneUnreachable) onLog?.('O celular não respondeu em conversas seguidas: o restante usará só o que a UAZAPI tem.');
  }

  return { messages: output, coverage, phoneUnreachable, requests };
}

/**
 * FASE "Comparar com o banco": decide, por conversa, criar / atualizar / ignorar (já em dia),
 * calculando exatamente quais mensagens ainda não existem.
 */
export async function buildSyncPlan(params: {
  recovered: RecoveredMessage[];
  leads: Lead[];
  sinceIso: string;
  signal?: AbortSignal;
  /** Cobertura por conversa (da etapa do celular); conversas sem entrada são tratadas como cobertas pela API */
  coverage?: Map<string, ChatCoverage>;
  onProgress?: (p: { done: number; total: number; detail?: string }) => void;
}): Promise<SyncPlan> {
  const { recovered, leads, sinceIso, signal, onProgress, coverage } = params;
  const groups = groupMessagesByChat(recovered);
  const entries = Array.from(groups.values());

  // 1) Casa cada conversa com um lead existente (telefone / JID / LID)
  const matched = entries.map(g => ({
    g,
    lead: findMatchingLead(leads, { phone: g.phone, jid: g.rawJid, lid: g.rawLid }).matchedLead as Lead | undefined,
  }));
  onProgress?.({ done: 0, total: entries.length, detail: 'Cruzando conversas com os leads existentes...' });

  // 2) Busca no banco o que já foi gravado desses leads (em lote, colunas mínimas)
  const leadIds = Array.from(new Set(matched.filter(m => m.lead).map(m => m.lead!.id)));
  const sinceMargin = new Date(new Date(sinceIso).getTime() - 24 * 60 * 60 * 1000).toISOString();
  onProgress?.({ done: 0, total: entries.length, detail: `Lendo o histórico já gravado de ${leadIds.length} lead(s)...` });
  const knownByLead = await fetchKnownKeys(leadIds, sinceMargin, signal);

  // 3) Diferença por conversa
  const chats: SyncChatPlan[] = [];
  let upToDate = 0;
  matched.forEach(({ g, lead }, idx) => {
    const known = lead ? knownByLead.get(lead.id) : undefined;
    const sorted = [...g.messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const newMessages = sorted.filter(m => {
      if (!known) return true;
      const ids = [m.messageId, m.waId, shortIdOf(m)].filter(Boolean) as string[];
      if (ids.some(id => known.has(id))) return false;
      return !known.has(timeTextKey(m.timestamp, m.text));
    });

    if (lead && newMessages.length === 0) {
      upToDate += 1; // nada a fazer: some da lista de revisão
    } else {
      chats.push({
        key: g.phone,
        coverage: coverage?.get(g.phone),
        phone: g.phone,
        name: g.name,
        avatarUrl: g.avatarUrl,
        rawJid: g.rawJid,
        rawLid: g.rawLid,
        totalMessages: sorted.length,
        newMessages,
        lead,
        action: lead ? 'update' : 'create',
        mediaCount: newMessages.filter(m => m.mediaType && m.mediaType !== 'text').length,
      });
    }
    if (idx % 10 === 0) onProgress?.({ done: idx + 1, total: entries.length });
  });
  onProgress?.({ done: entries.length, total: entries.length });

  chats.sort((a, b) => b.newMessages.length - a.newMessages.length);
  return { chats, upToDate, fetchedMessages: recovered.length, fetchedChats: entries.length };
}

/** FASE "Gravar": cria leads/contatos e grava só as mensagens novas, em lote. */
export async function applySyncPlan(params: {
  chats: SyncChatPlan[];
  source: Source | null;
  masterId: string;
  venueId?: string;
  funnelId?: string;
  createLeadFromWhatsApp: (data: any) => Promise<string>;
  signal?: AbortSignal;
  onProgress?: (p: { done: number; total: number; name?: string; created: number; updated: number; messages: number }) => void;
  onLog?: (line: string) => void;
}): Promise<SyncApplyResult> {
  const { chats, source, masterId, venueId, funnelId, createLeadFromWhatsApp, signal, onProgress, onLog } = params;
  const result: SyncApplyResult = { created: 0, updated: 0, messagesSaved: 0, failed: [], mediaQueue: [], cancelled: false };

  // Contatos existentes em lote (sem o teto de 500 do fluxo antigo)
  const contactByPhone: Map<string, Contact> = await contactService.findByPhones(masterId, chats.map(c => c.phone));

  for (let i = 0; i < chats.length; i++) {
    if (signal?.aborted) { result.cancelled = true; break; }
    const chat = chats[i];
    try {
      // Contato (reaproveita o existente; cria só se não houver)
      let contact = contactByPhone.get(chat.phone);
      if (!contact) {
        try {
          const niceName = chat.name && !/^Contato \d+$/.test(chat.name) ? chat.name : `Contato ${chat.phone.slice(-4)}`;
          const created = await contactService.createContact({
            masterId,
            name: niceName,
            primaryPhone: chat.phone,
            whatsappPhone: chat.phone,
            venueIds: venueId ? [venueId] : undefined,
          } as any);
          if (created) { contact = created; contactByPhone.set(chat.phone, created); }
        } catch (err) {
          console.warn('[sync] contato não criado:', chat.phone, err);
        }
      }

      const buildActivities = (leadId: string, leadName: string): { acts: LeadActivity[]; media: MediaQueueItem[] } => {
        const media: MediaQueueItem[] = [];
        const acts = chat.newMessages.map(m => {
          const isAudio = m.mediaType === 'audio';
          const hasMedia = !!m.mediaType && m.mediaType !== 'text';
          const messageIds = resolveMediaMessageIds({ waId: m.waId, messageId: m.messageId, rawPayload: m.rawPayload });
          const id = generateUuid();
          const baseMeta: Record<string, any> = {
            messageId: shortIdOf(m) || m.messageId,
            waId: m.waId,
            sourceId: source?.id,
            ...(hasMedia ? { needsManualDownload: true } : {}),
          };
          if (hasMedia && messageIds.length > 0) {
            media.push({ activityId: id, leadId, leadName, text: m.text, mediaType: m.mediaType as any, messageIds, baseMeta });
          }
          return {
            id,
            leadId,
            messageId: shortIdOf(m) || m.messageId,
            timestamp: m.timestamp,
            type: 'contact',
            title: m.fromMe
              ? (isAudio ? 'Mensagem de voz enviada (WhatsApp)' : 'Mensagem enviada via WhatsApp')
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: m.text || '',
            mediaType: m.mediaType,
            authorName: m.fromMe ? 'WhatsApp' : chat.name,
            authorId: m.fromMe ? 'whatsapp_mobile' : 'lead',
            status: m.fromMe ? 'sent' : 'delivered',
            metadata: baseMeta,
          } as unknown as LeadActivity;
        });
        return { acts, media };
      };

      const newest = chat.newMessages[chat.newMessages.length - 1];

      if (chat.action === 'update' && chat.lead) {
        const { acts, media } = buildActivities(chat.lead.id, chat.lead.name);
        const saved = await leadService.addActivitiesBatch(chat.lead.id, acts);
        const updates: Partial<Lead> = {};
        if (contact && !chat.lead.contactId) updates.contactId = contact.id;
        // Só avança hora/prévia do lead se a mensagem sincronizada for MAIS NOVA que a última interação conhecida
        const lastKnown = new Date(chat.lead.lastMessageAt || chat.lead.lastInteractionAt || 0).getTime();
        if (newest && new Date(newest.timestamp).getTime() > lastKnown) {
          updates.lastInteractionAt = newest.timestamp;
          updates.lastMessageAt = newest.timestamp;
          updates.lastMessageDirection = newest.fromMe ? 'outgoing' : 'incoming';
          updates.lastMessageText = (newest.text || '').slice(0, 200);
        }
        if (Object.keys(updates).length > 0) await leadService.update(chat.lead.id, updates);
        result.updated += 1;
        result.messagesSaved += saved;
        result.mediaQueue.push(...media);
        onLog?.(`${chat.name}: ${saved} mensagem(ns) nova(s) gravada(s).`);
      } else {
        const first = chat.newMessages[0];
        const venue = venueId || source?.venueId;
        if (!venue) throw new Error('Casa (unidade) de destino não definida para criar o lead.');
        const leadId = await createLeadFromWhatsApp({
          venueId: venue,
          phone: chat.phone,
          name: chat.name,
          firstMessage: first?.text || 'Contato WhatsApp',
          sourceId: source?.id,
          avatarUrl: chat.avatarUrl,
          fromMe: first?.fromMe,
          initialFunnelId: funnelId,
          initialStage: 'new_lead',
          // Data de entrada = a da PRIMEIRA mensagem puxada (nunca "hoje")
          messageTimestamp: first?.timestamp,
        });
        if (!leadId) throw new Error('Não foi possível criar o lead.');

        // A atividade criada junto com o lead leva a data/hora de agora e não guarda os ids da UAZAPI:
        // corrige-a com os dados reais da primeira mensagem e grava as demais em lote.
        const { acts, media } = buildActivities(leadId, chat.name);
        const [firstAct, ...restActs] = acts;
        if (isSupabaseConfigured && firstAct) {
          const { data: createdAct } = await supabase
            .from('lead_activities')
            .select('id, metadata')
            .eq('lead_id', leadId)
            .order('timestamp', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (createdAct?.id) {
            await supabase.from('lead_activities').update({
              timestamp: firstAct.timestamp,
              metadata: { ...((createdAct.metadata as any) || {}), ...((firstAct as any).metadata || {}) },
            }).eq('id', createdAct.id);
            const firstMedia = media.find(m => m.activityId === firstAct.id);
            if (firstMedia) firstMedia.activityId = createdAct.id;
          }
        }
        const saved = await leadService.addActivitiesBatch(leadId, restActs);
        const leadUpdates: Partial<Lead> = {};
        if (contact) leadUpdates.contactId = contact.id;
        if (newest) {
          leadUpdates.lastInteractionAt = newest.timestamp;
          leadUpdates.lastMessageAt = newest.timestamp;
          leadUpdates.lastMessageDirection = newest.fromMe ? 'outgoing' : 'incoming';
          leadUpdates.lastMessageText = (newest.text || '').slice(0, 200);
        }
        if (Object.keys(leadUpdates).length > 0) await leadService.update(leadId, leadUpdates);
        result.created += 1;
        result.messagesSaved += saved + 1;
        result.mediaQueue.push(...media);
        onLog?.(`${chat.name}: lead criado com ${saved + 1} mensagem(ns).`);
      }
    } catch (err: any) {
      result.failed.push({ name: chat.name, phone: chat.phone, error: err?.message || 'Falha ao gravar' });
      onLog?.(`Erro em ${chat.name}: ${err?.message || 'falha ao gravar'}`);
    }
    onProgress?.({ done: i + 1, total: chats.length, name: chat.name, created: result.created, updated: result.updated, messages: result.messagesSaved });
    // Cede o thread para a interface atualizar entre conversas
    await new Promise(r => setTimeout(r, 0));
  }
  return result;
}

/**
 * FASE "Recuperar mídias": 1) tenta pela UAZAPI (política de peso aplicada: leve sobe, pesada fica pendente com o peso);
 * 2) o que a UAZAPI não encontra pode ser pedido ao CELULAR (limitado por `phoneBudget`, pois cada pedido espera o aparelho).
 */
export async function recoverQueuedMedia(params: {
  queue: MediaQueueItem[];
  source: Source | null;
  masterId: string;
  venueId?: string;
  instanceToken: string;
  askPhone: boolean;
  phoneBudget: number;
  signal?: AbortSignal;
  onProgress?: (p: { stage: 'api' | 'phone'; done: number; total: number; detail?: string }) => void;
}): Promise<MediaPhaseResult> {
  const { queue, source, masterId, venueId, instanceToken, askPhone, phoneBudget, signal, onProgress } = params;
  const result: MediaPhaseResult = { stored: 0, pending: [], askedPhone: 0, cancelled: false };
  const missing: MediaQueueItem[] = [];

  const persist = async (item: MediaQueueItem, outcome: {
    status: 'stored' | 'pending'; url?: string; r2Key?: string; size?: number; mimetype?: string; fileName?: string; reason?: string;
  }) => {
    const meta: Record<string, any> = { ...item.baseMeta };
    if (outcome.status === 'stored' && outcome.url) {
      meta.needsManualDownload = false;
      meta.permanentR2Url = outcome.url;
      await leadService.updateActivity(item.activityId, { text: item.text, mediaUrl: outcome.url, mediaType: item.mediaType, metadata: meta } as any);
    } else {
      meta.needsManualDownload = true;
      if (outcome.size) meta.mediaSizeBytes = outcome.size;
      if (outcome.reason && outcome.reason !== 'heavy') meta.mediaError = outcome.reason;
      await leadService.updateActivity(item.activityId, { metadata: meta } as any);
    }
    mediaStorageService.register({
      masterId,
      venueId,
      sourceId: source?.id,
      leadId: item.leadId,
      activityId: item.activityId,
      messageId: item.messageIds[item.messageIds.length - 1],
      mediaType: item.mediaType,
      mimetype: outcome.mimetype,
      fileName: outcome.fileName,
      sizeBytes: outcome.size,
      r2Key: outcome.r2Key,
      publicUrl: outcome.url,
      status: outcome.status,
      failureReason: outcome.status === 'stored' ? undefined : outcome.reason,
    });
  };

  const ingestOptions = (item: MediaQueueItem) => ({
    instanceToken,
    messageId: item.messageIds[0],
    fallbackMessageIds: item.messageIds.slice(1),
    instanceId: source?.id || 'default',
    transcribeAudio: false,
    enforcePolicy: { mediaType: item.mediaType },
  });

  // Passo 1: pela UAZAPI, 3 em paralelo (respeita o limite de 10 req/s por chip)
  let done = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      if (signal?.aborted) { result.cancelled = true; return; }
      const item = queue[cursor++];
      try {
        const r = await whatsappMediaService.ingestTransientMedia(ingestOptions(item));
        result.stored += 1;
        await persist(item, { status: 'stored', url: r.permanentR2Url, r2Key: r.r2Key, size: r.fileSize, mimetype: r.mimetype, fileName: r.fileName });
      } catch (err: any) {
        if (err instanceof MediaPendingError) {
          await persist(item, { status: 'pending', size: err.sizeBytes, reason: 'heavy' });
          result.pending.push({ leadName: item.leadName, mediaType: item.mediaType, sizeBytes: err.sizeBytes, reason: 'Pesada: aguardando sua decisão' });
        } else if (err instanceof MediaDownloadError && (err.kind === 'not_found' || err.kind === 'no_media')) {
          missing.push(item);
        } else {
          const kind = err instanceof MediaDownloadError ? err.kind : 'network';
          await persist(item, { status: 'pending', reason: kind });
          result.pending.push({ leadName: item.leadName, mediaType: item.mediaType, reason: kind === 'server' ? 'Falha do servidor' : 'Falha de conexão' });
        }
      }
      done += 1;
      onProgress?.({ stage: 'api', done, total: queue.length, detail: item.leadName });
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  // Passo 2: o que a UAZAPI não tem é pedido ao celular, um por vez (cada pedido aguarda o aparelho responder)
  let phoneAsked = 0;
  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    if (signal?.aborted) { result.cancelled = true; break; }
    if (askPhone && phoneAsked < phoneBudget) {
      phoneAsked += 1;
      onProgress?.({ stage: 'phone', done: i, total: missing.length, detail: `${item.leadName} (pedindo ao celular)` });
      try {
        const r = await whatsappMediaService.ingestWithPhoneFallback(ingestOptions(item));
        result.stored += 1;
        await persist(item, { status: 'stored', url: r.permanentR2Url, r2Key: r.r2Key, size: r.fileSize, mimetype: r.mimetype, fileName: r.fileName });
        continue;
      } catch (err: any) {
        if (err instanceof MediaPendingError) {
          await persist(item, { status: 'pending', size: err.sizeBytes, reason: 'heavy' });
          result.pending.push({ leadName: item.leadName, mediaType: item.mediaType, sizeBytes: err.sizeBytes, reason: 'Pesada: aguardando sua decisão' });
          continue;
        }
        const kind = err instanceof MediaDownloadError ? err.kind : 'phone';
        await persist(item, { status: 'pending', reason: kind });
        result.pending.push({ leadName: item.leadName, mediaType: item.mediaType, reason: 'O celular não enviou (abra o WhatsApp e tente de novo no card)' });
        continue;
      }
    }
    await persist(item, { status: 'pending', reason: 'not_found' });
    result.pending.push({ leadName: item.leadName, mediaType: item.mediaType, reason: 'Fora da janela da UAZAPI (tente pelo card da mensagem)' });
  }
  result.askedPhone = phoneAsked;
  onProgress?.({ stage: 'phone', done: missing.length, total: missing.length });
  return result;
}
