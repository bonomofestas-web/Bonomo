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

/** Metricas base da casa (valores iniciais de referencia, todos opcionais). Taxas em %. */
export interface VenueBaseline {
  venueId: string;
  conversionRate: number | null;
  qualificationRate: number | null;
  qualToSchedRate: number | null;
  schedToAttendRate: number | null;
  attendToWonRate: number | null;
  lossRate: number | null;
  leadsPerMonth: number | null;
  appointmentsPerMonth: number | null;
  contractsPerMonth: number | null;
  avgTicket: number | null;
  monthlyRevenue: number | null;
  responseTimeMinutes: number | null;
  avgResponseMinutes: number | null; // media de qualquer mensagem (so comercial)
}

const BASELINE_COLUMNS =
  'venue_id, conversion_rate, qualification_rate, qual_to_sched_rate, sched_to_attend_rate, attend_to_won_rate, loss_rate, leads_per_month, appointments_per_month, contracts_per_month, avg_ticket, monthly_revenue, response_time_minutes, avg_response_minutes';

const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

const mapBaselineRow = (row: any): VenueBaseline => ({
  venueId: row.venue_id,
  conversionRate: numOrNull(row.conversion_rate),
  qualificationRate: numOrNull(row.qualification_rate),
  qualToSchedRate: numOrNull(row.qual_to_sched_rate),
  schedToAttendRate: numOrNull(row.sched_to_attend_rate),
  attendToWonRate: numOrNull(row.attend_to_won_rate),
  lossRate: numOrNull(row.loss_rate),
  leadsPerMonth: numOrNull(row.leads_per_month),
  appointmentsPerMonth: numOrNull(row.appointments_per_month),
  contractsPerMonth: numOrNull(row.contracts_per_month),
  avgTicket: numOrNull(row.avg_ticket),
  monthlyRevenue: numOrNull(row.monthly_revenue),
  responseTimeMinutes: numOrNull(row.response_time_minutes),
  avgResponseMinutes: numOrNull(row.avg_response_minutes),
});

/**
 * Todas as operacoes exigem masterId (isolamento entre Masters feito no servico).
 */
export const goalsService = {
  /** Metricas base das casas do Master (opcionalmente de uma casa). */
  async listVenueBaselines(masterId: string, venueId?: string): Promise<VenueBaseline[]> {
    if (!isSupabaseConfigured || !masterId) return [];
    let query = supabase.from('venue_baselines').select(BASELINE_COLUMNS).eq('master_id', masterId);
    if (venueId) query = query.eq('venue_id', venueId);
    const { data, error } = await query;
    if (error) {
      console.error('[goalsService.listVenueBaselines]', error.message);
      return [];
    }
    return (data || []).map(mapBaselineRow);
  },

  async saveVenueBaseline(masterId: string, baseline: VenueBaseline, updatedBy?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !masterId || !baseline.venueId) return false;
    const { error } = await supabase.from('venue_baselines').upsert(
      {
        master_id: masterId,
        venue_id: baseline.venueId,
        conversion_rate: baseline.conversionRate,
        qualification_rate: baseline.qualificationRate,
        qual_to_sched_rate: baseline.qualToSchedRate,
        sched_to_attend_rate: baseline.schedToAttendRate,
        attend_to_won_rate: baseline.attendToWonRate,
        loss_rate: baseline.lossRate,
        leads_per_month: baseline.leadsPerMonth,
        appointments_per_month: baseline.appointmentsPerMonth,
        contracts_per_month: baseline.contractsPerMonth,
        avg_ticket: baseline.avgTicket,
        monthly_revenue: baseline.monthlyRevenue,
        response_time_minutes: baseline.responseTimeMinutes,
        avg_response_minutes: baseline.avgResponseMinutes,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'venue_id' }
    );
    if (error) {
      console.error('[goalsService.saveVenueBaseline]', error.message);
      return false;
    }
    return true;
  },

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
