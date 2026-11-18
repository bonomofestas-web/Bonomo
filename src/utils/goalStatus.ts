export type GoalStatusLevel = 'green' | 'yellow' | 'red' | 'none';

export interface GoalStatus {
  level: GoalStatusLevel;
  color: string;
  bg: string;
  label: string;
}

/** Percentual de atingimento (sem limite superior). Retorna null quando nao ha meta. */
export const goalPercent = (achieved: number, target: number): number | null =>
  target > 0 ? Math.round((achieved / target) * 100) : null;

/** Semaforo: verde >= 80%, amarelo 50-79%, vermelho < 50%. */
export const getGoalStatus = (pct: number | null): GoalStatus => {
  if (pct === null) return { level: 'none', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', label: 'Sem meta' };
  if (pct >= 80) return { level: 'green', color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', label: 'No ritmo' };
  if (pct >= 50) return { level: 'yellow', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', label: 'Atenção' };
  return { level: 'red', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)', label: 'Crítico' };
};
