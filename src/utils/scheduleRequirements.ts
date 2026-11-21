import type { Lead } from '../types/admin';

export type ScheduleFieldKey = 'eventType' | 'estimatedGuests' | 'desiredPeriod' | 'eventYear' | 'decisionMakers' | 'debutanteName';

export const SCHEDULE_FIELD_LABELS: Record<ScheduleFieldKey, string> = {
  eventType: 'Tipo do evento',
  estimatedGuests: 'Número de convidados',
  desiredPeriod: 'Período desejado',
  eventYear: 'Ano do evento',
  decisionMakers: 'Decisores',
  debutanteName: 'Nome do aniversariante',
};

/**
 * Dados obrigatórios para marcar visita ou degustação: sem eles o agendamento não abre.
 * Qualquer campo além destes é extra e não bloqueia.
 */
export function getScheduleMissing(lead: Partial<Lead> | null | undefined): ScheduleFieldKey[] {
  if (!lead) return [];
  const l = lead as any;
  const missing: ScheduleFieldKey[] = [];
  if (!l.eventType) missing.push('eventType');
  if (!(Number(l.estimatedGuests) > 0)) missing.push('estimatedGuests');
  if (!String(l.desiredPeriod || '').trim() && !l.eventDate && !l.partyDate) missing.push('desiredPeriod');
  if (!String(l.eventYear || '').trim() && !l.eventDate && !l.partyDate) missing.push('eventYear');
  const hasDecisor = String(l.decisionMakers || '').trim() || (l.contacts || []).some((c: any) => c.isPrimaryDecisionMaker);
  if (!hasDecisor) missing.push('decisionMakers');
  if (!String(l.debutanteName || '').trim() && !(l.contacts || []).some((c: any) => c.role === 'debutante' || c.role === 'aniversariante')) missing.push('debutanteName');
  return missing;
}
