import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CollaboratorGoals, TeamGoals, VenueGoals } from '../types/admin';

type GoalPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface VenueGoalRecord extends VenueGoals {
  venueId: string;
  month: number;
  year: number;
}

const VENUE_COLUMNS =
  'venue_id, revenue_target, sales_target, leads_target, appointments_target, response_time_target_minutes, period, month, year';
const TEAM_COLUMNS =
  'id, master_id, venue_id, role, period, month, year, revenue_target, appointments_target, closings_target, response_time_target_minutes';

const mapVenueRow = (row: any): VenueGoalRecord => ({
  venueId: row.venue_id,
  revenueTarget: Number(row.revenue_target || 0),
  salesTarget: Number(row.sales_target || 0),
  leadsTarget: Number(row.leads_target || 0),
  appointmentsTarget: Number(row.appointments_target || 0),
  responseTimeTargetMinutes: Number(row.response_time_target_minutes || 0),
  period: (row.period || 'monthly') as GoalPeriod,
  month: Number(row.month || 0),
  year: Number(row.year || new Date().getFullYear()),
});

const mapTeamRow = (row: any): TeamGoals => ({
  id: row.id,
  masterId: row.master_id,
  venueId: row.venue_id,
  role: row.role,
  period: (row.period || 'monthly') as GoalPeriod,
  month: Number(row.month || 0),
  year: Number(row.year),
  revenueTarget: Number(row.revenue_target || 0),
  appointmentsTarget: Number(row.appointments_target || 0),
  closingsTarget: Number(row.closings_target || 0),
  responseTimeTargetMinutes: Number(row.response_time_target_minutes || 0),
});

/**
 * Todas as operacoes exigem masterId (isolamento entre Masters feito no servico).
 */
export const goalsService = {
  /** Metas de unidade (venue_goals) do Master, opcionalmente de um periodo. */
  async listVenueGoals(masterId: string, filter?: { year?: number; month?: number }): Promise<VenueGoalRecord[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let query = supabase.from('venue_goals').select(VENUE_COLUMNS).eq('master_id', masterId);
    if (filter?.year !== undefined) query = query.eq('year', filter.year);
    if (filter?.month !== undefined) query = query.eq('month', filter.month);
    const { data, error } = await query;
    if (error) {
      console.error('[goalsService.listVenueGoals]', error.message);
      return [];
    }
    return (data || []).map(mapVenueRow);
  },

  /** Meta consolidada da rede: soma das metas das unidades informadas. */
  sumNetworkGoals(goals: VenueGoalRecord[], venueIds: string[]): VenueGoalRecord | null {
    const scoped = goals.filter(g => venueIds.includes(g.venueId));
    if (scoped.length === 0) return null;
    return scoped.reduce<VenueGoalRecord>(
      (acc, g) => ({
        ...acc,
        revenueTarget: acc.revenueTarget + g.revenueTarget,
        salesTarget: acc.salesTarget + g.salesTarget,
        leadsTarget: acc.leadsTarget + g.leadsTarget,
        appointmentsTarget: (acc.appointmentsTarget || 0) + (g.appointmentsTarget || 0),
        responseTimeTargetMinutes: Math.max(acc.responseTimeTargetMinutes, g.responseTimeTargetMinutes),
      }),
      { ...scoped[0], venueId: 'network', revenueTarget: 0, salesTarget: 0, leadsTarget: 0, appointmentsTarget: 0, responseTimeTargetMinutes: 0 }
    );
  },

  /** Metas por equipe (SDR/Closer) do Master. */
  async listTeamGoals(masterId: string, filter?: { venueId?: string; year?: number; month?: number }): Promise<TeamGoals[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let query = supabase.from('team_goals').select(TEAM_COLUMNS).eq('master_id', masterId);
    if (filter?.venueId) query = query.eq('venue_id', filter.venueId);
    if (filter?.year !== undefined) query = query.eq('year', filter.year);
    if (filter?.month !== undefined) query = query.eq('month', filter.month);
    const { data, error } = await query;
    if (error) {
      console.error('[goalsService.listTeamGoals]', error.message);
      return [];
    }
    return (data || []).map(mapTeamRow);
  },

  async upsertTeamGoal(goal: TeamGoals): Promise<boolean> {
    if (!isSupabaseConfigured || !goal.masterId || !goal.venueId) return false;
    const { error } = await supabase.from('team_goals').upsert(
      {
        master_id: goal.masterId,
        venue_id: goal.venueId,
        role: goal.role,
        period: goal.period,
        month: goal.month,
        year: goal.year,
        revenue_target: goal.revenueTarget,
        appointments_target: goal.appointmentsTarget,
        closings_target: goal.closingsTarget,
        response_time_target_minutes: goal.responseTimeTargetMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'master_id,venue_id,role,period,month,year' }
    );
    if (error) {
      console.error('[goalsService.upsertTeamGoal]', error.message);
      return false;
    }
    return true;
  },

  /** Meta individual: grava collaborators.goals, restrita ao Master dono do colaborador. */
  async saveCollaboratorGoals(masterId: string, collaboratorId: string, goals: CollaboratorGoals): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || !collaboratorId) return false;
    const { data, error } = await supabase
      .from('collaborators')
      .update({ goals, updated_at: new Date().toISOString() })
      .eq('id', collaboratorId)
      .eq('master_id', masterId)
      .select('id');
    if (error) {
      console.error('[goalsService.saveCollaboratorGoals]', error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  },
};
