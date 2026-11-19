import type { LeadActivity } from '../types/admin';

// Regras de escolha do WhatsApp (instancia) para responder um lead, contrato ou cliente.
//  0. A instancia pertence a UM funil (origem). Nao envia por outro funil. Funil sem origem usa as instancias que o lead ja usou.
//     No funil so se liga/desliga o envio de cada numero.
//  1. Disponiveis = instancias que atendem o funil ATUAL do card e estao habilitadas para envio nele.
//  2. Recomendada: (a) escolha manual, (b) chip da ultima mensagem RECEBIDA do cliente, (c) chip da ultima mensagem enviada
//     pelo sistema, (d) origem do lead/contrato, (e) primeiro chip do funil com envio habilitado. Sempre entre as disponiveis.
//  3. Chip desconectado nunca e trocado sozinho (a tela bloqueia e avisa).

interface SenderLike { id: string; type?: string; funnelId?: string; configuration?: any }

/** Ids das instancias DESABILITADAS para envio dentro do funil (o funil so liga/desliga o envio de cada numero). */
export const getSendDisabledIds = (funnel?: any): string[] =>
  (funnel?.sendDisabledSourceIds || funnel?.duplicateRuleConfig?._sendDisabledSourceIds || []) as string[];

/** A instancia atende o funil? Regra: um numero pertence a UM funil (o da origem). Nao ha envio compartilhado. */
export const canSourceServeFunnel = (s: SenderLike, funnelId: string): boolean => s.funnelId === funnelId;

/**
 * Instancias WhatsApp que atendem o funil e estao habilitadas para envio nele (ordem de cadastro preservada).
 * Funil SEM origem (ex.: follow-up): usa as instancias que o proprio lead ja usou (`carriedIds`).
 */
export function funnelSenders<T extends SenderLike>(
  sources: T[],
  funnel: { id: string } | undefined,
  usable: (s: T) => boolean,
  carriedIds: string[] = [],
): T[] {
  if (!funnel?.id) return [];
  const disabled = getSendDisabledIds(funnel);
  const wa = sources.filter(s => s.type === 'whatsapp_api');
  const funnelHasOrigin = wa.some(s => s.funnelId === funnel.id);
  if (!funnelHasOrigin) {
    return wa.filter(s => carriedIds.includes(s.id) && usable(s) && !disabled.includes(s.id));
  }
  return wa.filter(s => usable(s) && canSourceServeFunnel(s, funnel.id) && !disabled.includes(s.id));
}

/** Ids das instancias que o lead ja usou: origem do lead + chip de cada mensagem (senderSourceId/sourceId/instanceId). */
export function leadCarriedSourceIds(lead?: { sourceId?: string; source_id?: string } | null, activities?: LeadActivity[]): string[] {
  const ids = new Set<string>();
  const origin = lead?.sourceId || lead?.source_id;
  if (origin) ids.add(origin);
  for (const a of activities || []) {
    const meta: any = a.metadata || {};
    const id = a.instanceId || meta.senderSourceId || meta.instanceId || meta.sourceId;
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

const SENT_BY_PHONE = 'whatsapp_mobile';

/** Chip da ultima mensagem ENVIADA PELO SISTEMA (ignora o que foi digitado direto no celular e o que o cliente mandou). */
export function lastSystemSentSourceId(activities?: LeadActivity[]): string | undefined {
  let best: { at: number; id: string } | null = null;
  for (const a of activities || []) {
    if (a.type !== 'contact' || !/enviad/i.test(a.title || '')) continue;
    if (!a.authorId || a.authorId === 'lead' || a.authorId === SENT_BY_PHONE) continue;
    const meta: any = a.metadata || {};
    const id = a.instanceId || meta.senderSourceId || meta.instanceId || meta.sourceId;
    if (!id) continue;
    const at = new Date(a.timestamp || 0).getTime();
    if (!best || at > best.at) best = { at, id };
  }
  return best?.id;
}

/** Numero (chip) da ULTIMA mensagem RECEBIDA do cliente: e por onde ele acabou de falar. */
export function lastIncomingSourceId(activities?: LeadActivity[]): string | undefined {
  let best: { at: number; id: string } | null = null;
  for (const a of activities || []) {
    if (a.type !== 'contact' || a.authorId !== 'lead') continue;
    const meta: any = a.metadata || {};
    const id = a.instanceId || meta.senderSourceId || meta.instanceId || meta.sourceId;
    if (!id) continue;
    const at = new Date(a.timestamp || 0).getTime();
    if (!best || at > best.at) best = { at, id };
  }
  return best?.id;
}

export type SenderReason = 'manual' | 'last_incoming' | 'last_sent' | 'origin' | 'first';

/** Chip recomendado entre os disponiveis (ids na ordem de cadastro). */
export function recommendSender(
  allowedIds: string[],
  opts: { manualId?: string; lastIncomingId?: string; lastSentId?: string; originId?: string },
): { id: string; reason: SenderReason } | null {
  const has = (id?: string) => Boolean(id && allowedIds.includes(id));
  if (has(opts.manualId)) return { id: opts.manualId as string, reason: 'manual' };
  if (has(opts.lastIncomingId)) return { id: opts.lastIncomingId as string, reason: 'last_incoming' };
  if (has(opts.lastSentId)) return { id: opts.lastSentId as string, reason: 'last_sent' };
  if (has(opts.originId)) return { id: opts.originId as string, reason: 'origin' };
  if (allowedIds.length > 0) return { id: allowedIds[0], reason: 'first' };
  return null;
}

const manualKey = (leadId: string) => `f5_wa_sender_${leadId}`;

export const readManualSender = (leadId: string): string | undefined => {
  try { return localStorage.getItem(manualKey(leadId)) || undefined; } catch { return undefined; }
};

export const saveManualSender = (leadId: string, sourceId: string) => {
  try { localStorage.setItem(manualKey(leadId), sourceId); } catch { /* sem armazenamento */ }
};
