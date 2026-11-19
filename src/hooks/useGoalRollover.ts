import { useEffect, useRef } from 'react';
import { useAdminState } from '../context/AdminStateContext';
import {
  GOAL_METRICS, goalPlanService, periodTarget, todayISO,
  type CollaboratorGoal,
} from '../services/goalPlanService';
import { summarizeVenueResponseWindow } from '../services/responseTimeService';
import { collaboratorActual, computeGoalActuals, goalMet, goalPct, venueActual } from '../utils/goalActuals';

// Uma virada por vez no app inteiro (dashboard e tela de metas podem montar juntos)
let inFlight: Promise<boolean> | null = null;

/**
 * Virada de periodo: para cada periodo ATIVO vencido (ends_on < hoje) grava o resultado de cada meta (imutavel),
 * fecha o periodo e cria o proximo com as mesmas metas (ativo se recorrente; senao pendente, para reconfigurar e ativar).
 * Idempotente: o banco impede resultado e proximo periodo duplicados.
 * Chama `onClosed` quando algum periodo foi encerrado.
 */
export const useGoalRollover = (onClosed?: () => void): void => {
  const { leads, clients, funnels, collaborators, currentUser } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const dataReady = leads.length > 0; // nunca grava resultado antes dos leads carregarem
  // Sempre le os dados mais recentes quando o timer dispara (o efeito nao refaz a cada lead)
  const latest = useRef({ leads, clients, funnels, collaborators, currentUser });
  latest.current = { leads, clients, funnels, collaborators, currentUser };

  useEffect(() => {
    if (!masterId || !dataReady || inFlight) return;
    const timer = window.setTimeout(() => {
      const { leads, clients, funnels, collaborators, currentUser } = latest.current;
      inFlight = (async () => {
        const expired = await goalPlanService.listPeriods(masterId, { statuses: ['active'] });
        const due = expired.filter(p => p.endsOn < todayISO());
        if (due.length === 0) return false;

        const goalRows = await goalPlanService.listCollaboratorGoals(masterId, { periodIds: due.map(p => p.id) });
        const actor = { id: currentUser?.id, name: currentUser?.name };
        const nameOf = new Map(collaborators.map(c => [c.id, c.name]));
        const collaboratorIds = new Set(collaborators.map(c => c.id));

        for (const period of due) {
          // Tempo de resposta (so comercial) da janela do periodo
          const response = await summarizeVenueResponseWindow({
            leads, funnels, collaboratorIds, venueId: period.venueId, startsOn: period.startsOn, endsOn: period.endsOn,
          });
          const actuals = computeGoalActuals({ leads, clients, funnels, collaborators }, period.venueId, period.startsOn, period.endsOn, response);
          const myGoals: CollaboratorGoal[] = goalRows.filter(g => g.periodId === period.id && g.status === 'active');

          const results = [
            ...GOAL_METRICS.flatMap(m => {
              const target = periodTarget(period, m.key);
              if (target <= 0) return [];
              const actual = venueActual(actuals, m.key);
              return [{
                venueId: period.venueId, periodId: period.id, scope: 'venue' as const, metric: m.key,
                startsOn: period.startsOn, endsOn: period.endsOn, targetValue: target,
                actualValue: actual ?? 0, pct: goalPct(m.key, target, actual),
                outcome: goalMet(m.key, target, actual) ? 'met' as const : 'missed' as const,
              }];
            }),
            ...myGoals.map(g => {
              const actual = collaboratorActual(actuals, g.collaboratorId, g.metric);
              return {
                venueId: period.venueId, periodId: period.id, scope: 'collaborator' as const,
                collaboratorId: g.collaboratorId, collaboratorName: nameOf.get(g.collaboratorId),
                metric: g.metric, startsOn: period.startsOn, endsOn: period.endsOn, targetValue: g.targetValue,
                actualValue: actual ?? 0, pct: goalPct(g.metric, g.targetValue, actual),
                outcome: goalMet(g.metric, g.targetValue, actual) ? 'met' as const : 'missed' as const,
              };
            }),
          ];

          // 1. Resultado primeiro (imutavel); so depois fecha e abre o proximo
          await goalPlanService.insertResults(masterId, results);
          await goalPlanService.createNextPeriod(masterId, period, myGoals, actor);
          await goalPlanService.setPeriodStatus(masterId, period.id, 'closed');
          for (const g of myGoals) await goalPlanService.setGoalStatus(masterId, g.id, 'closed');
        }
        return true;
      })()
        .catch(err => { console.error('[useGoalRollover]', err); return false; })
        .finally(() => { inFlight = null; });
      void inFlight.then(closed => { if (closed) onClosed?.(); });
    }, 3000);
    return () => window.clearTimeout(timer);
    // Roda quando o Master ou a prontidao dos dados muda; nao refaz a cada alteracao de lead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId, dataReady]);
};
