import type { CommercialCommitment, Lead } from '../types/admin';
import { MQL_QUALIFIED_MIN, hasMqlAnswers } from './mqlScore';

/**
 * Esteira comercial do lead (criado -> qualificado -> agendado -> compareceu -> fechou).
 * Fonte unica: o dashboard e as metas usam estas mesmas regras para nunca divergirem.
 */

export const commitmentDone = (c?: CommercialCommitment): boolean => !!c && c.status === 'completed';

/** Indefinido nao e zero: so conta MQL quando ha respostas (o banco guarda mql_score 0 por padrao). */
export const hasMql = (l: Lead): boolean =>
  hasMqlAnswers(l.mqlAnswers) && typeof l.mqlScore === 'number' && Number.isFinite(l.mqlScore);

/** Abaixo de 10% de MQL o lead e desqualificado por natureza. */
export const isDisqualified = (l: Lead): boolean => hasMql(l) && (l.mqlScore as number) < MQL_QUALIFIED_MIN;

export const wasScheduled = (l: Lead): boolean =>
  [l.visitCommitment, l.tastingCommitment].some(c => !!c && c.status !== 'not_scheduled' && c.scheduled !== false);

export const wasAttended = (l: Lead): boolean => commitmentDone(l.visitCommitment) || commitmentDone(l.tastingCommitment);

export const pctOf = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null);

export interface JourneyCohort {
  coh: Lead[];             // leads criados na janela
  mqlInUse: boolean;       // ha MQL respondido na coorte
  base: Lead[];            // base de qualificacao (qualificados; sem MQL em uso, todos os captados)
  scheduled: Lead[];
  attended: Lead[];
  won: Lead[];
  wonFromAttended: Lead[];
  lost: Lead[];
}

/** Monta a esteira de uma coorte ja filtrada (leads criados na janela, do escopo). */
export const buildJourneyCohort = (
  coh: Lead[],
  isClosed: (l: Lead) => boolean,
  isLost: (l: Lead) => boolean,
): JourneyCohort => {
  const mqlInUse = coh.some(hasMql);
  const base = mqlInUse ? coh.filter(l => hasMql(l) && !isDisqualified(l)) : coh;
  const scheduled = base.filter(wasScheduled);
  const attended = scheduled.filter(wasAttended);
  const won = coh.filter(isClosed);
  const wonFromAttended = won.filter(wasAttended);
  const lost = coh.filter(isLost);
  return { coh, mqlInUse, base, scheduled, attended, won, wonFromAttended, lost };
};

/** Taxas da esteira: agendamento (qualificado->agendado), comparecimento (agendado->compareceu) e fechamento (compareceu->fechou). */
export const journeyRates = (j: JourneyCohort) => ({
  schedulingRate: pctOf(j.scheduled.length, j.base.length),
  attendanceRate: pctOf(j.attended.length, j.scheduled.length),
  closingRate: pctOf(j.wonFromAttended.length, j.attended.length),
});
