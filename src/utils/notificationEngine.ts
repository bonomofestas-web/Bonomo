import type { Collaborator, CommercialFunnel, Lead } from '../types/admin';
import type { NewNotification } from '../services/notificationService';
import { getLeadNotificationRecipientIds, isManagerLike } from './funnelResponsibility';

// Mensagem recebida e nova oportunidade tambem sao geradas pelo servidor (api/whatsapp-webhook.ts) para existirem com o
// sistema fechado; aqui cobrimos o caso em que a mensagem entra pelo navegador (SSE). A chave de dedupe e a mesma nos dois lados.
// Funcoes puras: quem grava e o notificationService.
// Todas recebem apenas colaboradores/funis do Master ativo (scoped) e carimbam master_id.
// Chaves de dedupe tornam a geracao idempotente (varios clientes podem processar o mesmo evento).

interface Ctx {
  masterId: string;
  collaborators: Collaborator[];
  funnels: CommercialFunnel[];
}

const toRows = (
  recipientIds: string[],
  base: Omit<NewNotification, 'recipientId'>,
): NewNotification[] => Array.from(new Set(recipientIds)).map(recipientId => ({ ...base, recipientId }));

const preview = (text?: string, max = 110) => {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const leadPayload = (lead: Lead) => ({
  leadId: lead.id,
  leadName: lead.name,
  avatarUrl: lead.avatarUrl,
  funnelId: lead.funnelId,
  sourceName: lead.sourceName,
});

const resolveLeadRecipients = (lead: Lead, ctx: Ctx): string[] => {
  const funnel = ctx.funnels.find(f => f.id === lead.funnelId);
  const stage = funnel?.stages?.find(s => s.id === lead.stage);
  return getLeadNotificationRecipientIds(funnel, stage, lead, ctx.collaborators, { masterId: ctx.masterId });
};

/** Nova oportunidade (lead novo vindo do cliente). Mesma chave do servidor (`opp:<lead>`): quem chegar primeiro grava. */
export function buildNewOpportunity(lead: Lead, ctx: Ctx): NewNotification[] {
  if (lead.isClient) return [];
  return toRows(resolveLeadRecipients(lead, ctx), {
    masterId: ctx.masterId,
    venueId: lead.venueId,
    type: 'new_opportunity',
    title: 'Nova oportunidade',
    body: [lead.name, lead.sourceName].filter(Boolean).join(' · '),
    entityType: 'lead',
    entityId: lead.id,
    payload: leadPayload(lead),
    dedupeKey: `opp:${lead.id}`,
  });
}

/**
 * Mensagem recebida: so o dono do lead (ou quem poderia ser, se nao ha dono).
 * messageKey = id curto da mensagem do WhatsApp; o servidor usa a mesma chave (`msg:<id>`), entao nao duplica.
 */
export function buildInboundMessage(lead: Lead, messageKey: string, text: string, ctx: Ctx): NewNotification[] {
  if (lead.isClient) return [];
  return toRows(resolveLeadRecipients(lead, ctx), {
    masterId: ctx.masterId,
    venueId: lead.venueId,
    type: 'message',
    title: lead.name || 'Nova mensagem',
    body: preview(text) || 'Mensagem recebida',
    entityType: 'lead',
    entityId: lead.id,
    payload: leadPayload(lead),
    dedupeKey: `msg:${messageKey}`,
  });
}

const hasVenue = (c: Collaborator, venueId?: string): boolean => {
  if (!venueId || c.venueId === 'all') return true;
  const ids = c.venueIds && c.venueIds.length > 0 ? c.venueIds : (c.venueId ? [c.venueId] : []);
  return ids.length === 0 || ids.includes(venueId);
};

/** Gerentes da unidade + Master (quem aprova contratos). */
const contractApprovers = (venueId: string | undefined, ctx: Ctx): string[] =>
  ctx.collaborators
    .filter(c => c.active !== false && (c.id === ctx.masterId || c.role === 'master' || (isManagerLike(c) && hasVenue(c, venueId))))
    .map(c => c.id);

const CONTRACT_COPY: Record<string, string> = {
  rejected: 'Contrato devolvido para ajuste',
  approved: 'Contrato aprovado',
  canceled: 'Contrato cancelado',
};

/**
 * Contrato (linha crua do banco). Idempotente por contrato+status: o mesmo UPDATE processado
 * duas vezes nao duplica. O destino do clique e resolvido na hora pelo status atual do contrato.
 */
export function buildContractNotifications(row: any, ctx: Ctx): NewNotification[] {
  const status: string = row?.approval_status;
  if (!row?.id || !status) return [];
  const base = {
    masterId: ctx.masterId,
    venueId: row.venue_id || undefined,
    type: 'contract' as const,
    entityType: 'contract' as const,
    entityId: row.id as string,
    payload: { contractId: row.id, code: row.contract_code, status, leadId: row.origin_lead_id, eventTitle: row.event_title },
    dedupeKey: `contract:${row.id}:${status}`,
  };
  const label = row.contract_code ? ` ${row.contract_code}` : '';

  if (status === 'pending_approval') {
    return toRows(contractApprovers(row.venue_id, ctx), {
      ...base, title: 'Nova oportunidade de contrato', body: `Contrato${label} aguardando aprovação`,
    });
  }
  if (CONTRACT_COPY[status]) {
    const owners = [row.sdr_id, row.closer_id, row.submitted_by].filter(Boolean) as string[];
    const recipients = status === 'canceled' ? [...owners, ...contractApprovers(row.venue_id, ctx)] : owners;
    const valid = new Set(ctx.collaborators.filter(c => c.active !== false).map(c => c.id));
    return toRows(recipients.filter(id => valid.has(id)), {
      ...base, title: CONTRACT_COPY[status], body: `Contrato${label}`,
    });
  }
  return [];
}

const validIds = (ids: (string | null | undefined)[], ctx: Ctx): string[] => {
  const active = new Set(ctx.collaborators.filter(c => c.active !== false).map(c => c.id));
  return ids.filter((id): id is string => Boolean(id) && active.has(id as string));
};

/** Tarefa atribuida (linha crua de admin_tasks). Notifica apenas os responsaveis; idempotente por tarefa+responsavel. */
export function buildTaskNotifications(row: any, ctx: Ctx): NewNotification[] {
  if (!row?.id || row.status === 'completed' || row.status === 'done') return [];
  const when = [row.due_date, row.due_time].filter(Boolean).join(' ');
  return validIds(Array.isArray(row.assigned_to_ids) ? row.assigned_to_ids : [], ctx).map(recipientId => ({
    masterId: ctx.masterId,
    venueId: row.venue_id || undefined,
    recipientId,
    type: 'task' as const,
    title: 'Nova tarefa',
    body: [row.title, when && `para ${when}`].filter(Boolean).join(' · '),
    entityType: 'task' as const,
    entityId: row.id,
    payload: { taskId: row.id, leadId: row.lead_id, dueDate: row.due_date },
    dedupeKey: `task:${row.id}`,
  }));
}

/** Compromisso/visita/degustacao: avisa o responsavel. Idempotente por compromisso+data+hora (reagendar avisa de novo). */
export function buildAppointmentNotifications(row: any, ctx: Ctx): NewNotification[] {
  if (!row?.id || !row.responsible_collaborator_id) return [];
  if (['cancelled', 'canceled', 'completed', 'done'].includes(String(row.status || '').toLowerCase())) return [];
  const category = String(row.category || '').toLowerCase();
  const isVisitOrTasting = /visit|degust|tasting/.test(category);
  return validIds([row.responsible_collaborator_id], ctx).map(recipientId => ({
    masterId: ctx.masterId,
    venueId: row.venue_id || undefined,
    recipientId,
    type: isVisitOrTasting ? 'visit_tasting' as const : 'appointment' as const,
    title: isVisitOrTasting ? 'Visita ou degustação agendada' : 'Novo compromisso',
    body: [row.title, [row.date, row.time].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    entityType: 'appointment' as const,
    entityId: row.id,
    payload: { appointmentId: row.id, leadId: row.lead_id, date: row.date, time: row.time },
    dedupeKey: `appt:${row.id}:${row.date || ''}:${row.time || ''}`,
  }));
}
