import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid } from '../utils/uuid';
import type { 
  RevenueMetrics, 
  FunnelConversionMetrics, 
  FunnelStageConversion,
  GoalComparisonMetrics 
} from '../types/admin';

export interface MetricsFilterParams {
  masterId: string;
  venueId?: string;
  funnelId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GoalMetricsParams {
  masterId: string;
  venueId: string;
  period?: 'monthly' | 'quarterly' | 'yearly';
  month?: number; // 1 a 12
  year?: number;  // Ex: 2026
}

export const metricsService = {
  /**
   * 1. AGREGAR FATURAMENTO REAL A PARTIR DOS CONTRATOS FECHADOS (total_amount)
   * Projeta exclusivamente colunas necessárias (Egress Shield) e filtra contratos aprovados/concluídos.
   */
  async getRevenueMetrics({
    masterId,
    venueId,
    startDate,
    endDate,
  }: MetricsFilterParams): Promise<RevenueMetrics> {
    const emptyResult: RevenueMetrics = {
      totalRevenue: 0,
      contractsCount: 0,
      averageTicket: 0,
      monthlyBreakdown: [],
    };

    if (!isSupabaseConfigured || !masterId) return emptyResult;

    try {
      // BLINDAGEM DE EGRESS: Projeção restrita a total_amount, approval_status, created_at, approved_at
      let query = supabase
        .from('contracts')
        .select('total_amount, approval_status, approved_at, created_at, event_date')
        .eq('master_id', masterId)
        .in('approval_status', ['approved', 'completed']);

      if (venueId && venueId !== 'all' && isUuid(venueId)) {
        query = query.eq('venue_id', venueId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[metricsService.getRevenueMetrics] Erro ao consultar contratos:', error);
        return emptyResult;
      }

      const contracts = data || [];
      const contractsCount = contracts.length;
      const totalRevenue = contracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const averageTicket = contractsCount > 0 ? Math.round(totalRevenue / contractsCount) : 0;

      // Agrupamento mensal para gráficos e análise temporal
      const monthlyMap: Record<string, { revenue: number; count: number; year: number; month: string }> = {};

      contracts.forEach(c => {
        const rawDate = c.approved_at || c.created_at || c.event_date;
        if (!rawDate) return;
        const d = new Date(rawDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = { revenue: 0, count: 0, year: y, month: key };
        }
        monthlyMap[key].revenue += Number(c.total_amount || 0);
        monthlyMap[key].count += 1;
      });

      const monthlyBreakdown = Object.values(monthlyMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
          month: item.month,
          year: item.year,
          revenue: item.revenue,
          contractsCount: item.count,
        }));

      return {
        totalRevenue,
        contractsCount,
        averageTicket,
        monthlyBreakdown,
      };
    } catch (err) {
      console.error('[metricsService.getRevenueMetrics] Exceção:', err);
      return emptyResult;
    }
  },

  /**
   * 2. CALCULAR CONVERSÃO POR ETAPA DO FUNIL COMERCIAL COM DEDUPLICAÇÃO ESTRITA (Regra Ted Mosby)
   * Pipeline de 6 etapas padronizadas:
   * 1. Leads Totais -> 2. Leads Qualificados -> 3. Agendamentos -> 4. Agendamentos Realizados (Comparecidos) -> 5. Propostas -> 6. Contratos Assinados.
   * Regra de Unicidade: Se um mesmo lead tiver Visita Comercial e Degustação agendadas/realizadas, ele é
   * contabilizado como 1 único lead na etapa, desduplicado por lead_id / contact_id.
   */
  async getFunnelConversionMetrics({
    masterId,
    funnelId,
    venueId,
    startDate,
    endDate,
  }: MetricsFilterParams): Promise<FunnelConversionMetrics> {
    const emptyResult: FunnelConversionMetrics = {
      funnelId,
      totalLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      overallConversionRate: 0,
      stages: [],
      summary: {
        totalLeads: 0,
        qualifiedLeads: 0,
        scheduledAppointments: 0,
        completedAppointments: 0,
        proposals: 0,
        signedContracts: 0,
      },
    };

    if (!isSupabaseConfigured || !masterId) return emptyResult;

    try {
      // 1. Consulta enxuta de Leads (Egress Shield: apenas colunas necessárias)
      let leadsQuery = supabase
        .from('leads')
        .select('id, contact_id, stage, mql_score, mql_level, is_validated, deal_value, visit_commitment, tasting_commitment')
        .eq('master_id', masterId)
        .neq('is_archived', true);

      if (funnelId && isUuid(funnelId)) {
        leadsQuery = leadsQuery.eq('funnel_id', funnelId);
      }

      if (venueId && venueId !== 'all' && isUuid(venueId)) {
        leadsQuery = leadsQuery.eq('venue_id', venueId);
      }

      if (startDate) {
        leadsQuery = leadsQuery.gte('created_at', startDate);
      }

      if (endDate) {
        leadsQuery = leadsQuery.lte('created_at', endDate);
      }

      // 2. Consulta enxuta de Compromissos (Visitas e Degustações)
      let appQuery = supabase
        .from('appointments')
        .select('id, lead_id, venue_id, category, title, status')
        .neq('status', 'cancelled');

      if (venueId && venueId !== 'all' && isUuid(venueId)) {
        appQuery = appQuery.eq('venue_id', venueId);
      }

      // 3. Consulta enxuta de Contratos Aprovados/Concluídos
      let contractsQuery = supabase
        .from('contracts')
        .select('id, origin_lead_id, contact_id, venue_id, approval_status, total_amount')
        .eq('master_id', masterId)
        .in('approval_status', ['approved', 'completed']);

      if (venueId && venueId !== 'all' && isUuid(venueId)) {
        contractsQuery = contractsQuery.eq('venue_id', venueId);
      }

      // Executa em paralelo para performance e economia de conexões
      const [leadsRes, appsRes, contractsRes] = await Promise.all([
        leadsQuery,
        appQuery,
        contractsQuery,
      ]);

      const leads = leadsRes.data || [];
      const appointments = appsRes.data || [];
      const contracts = contractsRes.data || [];

      // Mapeamento de leads pertencentes ao filtro
      const leadMap = new Map<string, typeof leads[0]>();
      const contactToLeadMap = new Map<string, string>();
      leads.forEach(l => {
        leadMap.set(l.id, l);
        if (l.contact_id) {
          contactToLeadMap.set(l.contact_id, l.id);
        }
      });

      // -------------------------------------------------------------
      // DEDUPLICAÇÃO E CLASSIFICAÇÃO DAS 6 ETAPAS
      // -------------------------------------------------------------

      // Etapa 1: Leads Totais
      const totalLeadIds = new Set<string>(leads.map(l => l.id));

      // Etapa 6: Contratos Assinados (identifica leads fechados)
      const signedLeadIds = new Set<string>();
      contracts.forEach(c => {
        if (c.origin_lead_id && leadMap.has(c.origin_lead_id)) {
          signedLeadIds.add(c.origin_lead_id);
        } else if (c.contact_id && contactToLeadMap.has(c.contact_id)) {
          signedLeadIds.add(contactToLeadMap.get(c.contact_id)!);
        }
      });
      leads.forEach(l => {
        if (l.stage === 'deal_closed' || l.stage === 'won' || l.stage === 'completed') {
          signedLeadIds.add(l.id);
        }
      });

      // Etapa 5: Propostas
      const proposalLeadIds = new Set<string>();
      leads.forEach(l => {
        const isProposalStage = 
          l.stage === 'proposal' ||
          l.stage === 'negotiation' ||
          l.stage === 'proposta' ||
          l.stage === 'negociacao' ||
          l.stage === 'aguardando_aprovacao';

        if (isProposalStage || (l.deal_value && l.deal_value > 0) || signedLeadIds.has(l.id)) {
          proposalLeadIds.add(l.id);
        }
      });

      // Etapa 3 & 4: Agendamentos e Agendamentos Realizados (Comparecidos)
      // REGRA DE UNICIDADE: Se um mesmo lead tiver Visita Comercial E Degustação,
      // ele conta como 1 único lead em Agendamentos e 1 único em Agendamentos Realizados.
      const scheduledLeadIds = new Set<string>();
      const completedAppointmentLeadIds = new Set<string>();

      appointments.forEach(app => {
        const leadId = app.lead_id;
        if (leadId && leadMap.has(leadId)) {
          scheduledLeadIds.add(leadId);

          if (app.status === 'completed') {
            completedAppointmentLeadIds.add(leadId);
          }
        }
      });

      // Também avalia agendamentos e comparecimentos registrados no próprio lead
      leads.forEach(l => {
        const hasVisit = Boolean(l.visit_commitment);
        const hasTasting = Boolean(l.tasting_commitment);
        const isAppStage = 
          l.stage === 'visit_scheduled' ||
          l.stage === 'tasting_scheduled' ||
          l.stage === 'agendado' ||
          l.stage === 'visita' ||
          l.stage === 'degustacao';

        if (hasVisit || hasTasting || isAppStage || proposalLeadIds.has(l.id) || signedLeadIds.has(l.id)) {
          scheduledLeadIds.add(l.id);
        }

        const visitCompleted = l.visit_commitment && (l.visit_commitment as any).status === 'completed';
        const tastingCompleted = l.tasting_commitment && (l.tasting_commitment as any).status === 'completed';

        if (visitCompleted || tastingCompleted || proposalLeadIds.has(l.id) || signedLeadIds.has(l.id)) {
          completedAppointmentLeadIds.add(l.id);
        }
      });

      // Etapa 2: Leads Qualificados
      const qualifiedLeadIds = new Set<string>();
      leads.forEach(l => {
        const isMql = (l.mql_score !== undefined && l.mql_score !== null && l.mql_score >= 50) ||
          l.mql_level === 'mql' ||
          l.mql_level === 'sql' ||
          l.is_validated === true;

        const isBeyondEntry = l.stage !== 'new_lead' && l.stage !== 'inbox' && l.stage !== 'entrada';

        if (isMql || isBeyondEntry || scheduledLeadIds.has(l.id) || completedAppointmentLeadIds.has(l.id) || proposalLeadIds.has(l.id) || signedLeadIds.has(l.id)) {
          qualifiedLeadIds.add(l.id);
        }
      });

      // Contagens finais deduplicadas
      const countTotal = totalLeadIds.size;
      const countQualified = qualifiedLeadIds.size;
      const countScheduled = scheduledLeadIds.size;
      const countCompleted = completedAppointmentLeadIds.size;
      const countProposals = proposalLeadIds.size;
      const countSigned = signedLeadIds.size;

      // As 6 etapas formais do Funil Comercial F5 System
      const canonicalStages: Array<{ id: string; name: string; count: number }> = [
        { id: 'total_leads', name: 'Leads Totais', count: countTotal },
        { id: 'qualified_leads', name: 'Leads Qualificados', count: countQualified },
        { id: 'scheduled_appointments', name: 'Agendamentos', count: countScheduled },
        { id: 'completed_appointments', name: 'Agendamentos Realizados (Comparecidos)', count: countCompleted },
        { id: 'proposals', name: 'Propostas', count: countProposals },
        { id: 'signed_contracts', name: 'Contratos Assinados', count: countSigned },
      ];

      const stageConversions: FunnelStageConversion[] = canonicalStages.map((st, idx) => {
        const next = canonicalStages[idx + 1];
        const nextCount = next ? next.count : 0;
        const conversionToNext = st.count > 0 && next
          ? Math.min(100, Math.round((nextCount / st.count) * 100))
          : 100;
        const dropoffRate = 100 - conversionToNext;

        return {
          stageId: st.id,
          stageName: st.name,
          leadsCount: st.count,
          uniqueLeadsCount: st.count,
          conversionToNext,
          dropoffRate,
        };
      });

      const overallConversionRate = countTotal > 0 ? Math.round((countSigned / countTotal) * 100) : 0;
      const lostLeads = leads.filter(l => l.stage === 'lost' || l.stage === 'canceled').length;

      return {
        funnelId,
        totalLeads: countTotal,
        wonLeads: countSigned,
        lostLeads,
        overallConversionRate,
        stages: stageConversions,
        summary: {
          totalLeads: countTotal,
          qualifiedLeads: countQualified,
          scheduledAppointments: countScheduled,
          completedAppointments: countCompleted,
          proposals: countProposals,
          signedContracts: countSigned,
        },
      };
    } catch (err) {
      console.error('[metricsService.getFunnelConversionMetrics] Exceção:', err);
      return emptyResult;
    }
  },

  /**
   * 3. COMPARAR REALIZADO VS META DA UNIDADE CADASTRADA EM VENUE_GOALS
   */
  async getGoalComparisonMetrics({
    masterId,
    venueId,
    period = 'monthly',
    month,
    year,
  }: GoalMetricsParams): Promise<GoalComparisonMetrics> {
    const currDate = new Date();
    const targetYear = year || currDate.getFullYear();
    const targetMonth = month || (currDate.getMonth() + 1);

    const emptyResult: GoalComparisonMetrics = {
      venueId,
      period,
      month: targetMonth,
      year: targetYear,
      revenue: { target: 150000, achieved: 0, percentage: 0, remaining: 150000 },
      sales: { target: 12, achieved: 0, percentage: 0, remaining: 12 },
      leads: { target: 60, achieved: 0, percentage: 0, remaining: 60 },
      pace: { daysElapsed: 1, totalDays: 30, projectedRevenue: 0, isPaceOnTrack: false },
    };

    if (!isSupabaseConfigured || !masterId || !venueId) return emptyResult;

    try {
      // 1. Busca meta da unidade (Primeiro em venue_goals, depois fallback para venues.goals)
      let targetGoals = {
        revenueTarget: 150000,
        salesTarget: 12,
        leadsTarget: 60,
        responseTimeTargetMinutes: 15,
      };

      const { data: dbGoal } = await supabase
        .from('venue_goals')
        .select('*')
        .eq('master_id', masterId)
        .eq('venue_id', venueId)
        .eq('period', period)
        .eq('year', targetYear)
        .eq('month', targetMonth)
        .maybeSingle();

      if (dbGoal) {
        targetGoals = {
          revenueTarget: Number(dbGoal.revenue_target || 150000),
          salesTarget: Number(dbGoal.sales_target || 12),
          leadsTarget: Number(dbGoal.leads_target || 60),
          responseTimeTargetMinutes: Number(dbGoal.response_time_target_minutes || 15),
        };
      } else {
        // Fallback: venues.goals
        const { data: venueRow } = await supabase
          .from('venues')
          .select('name, goals')
          .eq('id', venueId)
          .eq('master_id', masterId)
          .maybeSingle();

        if (venueRow?.goals) {
          const g = venueRow.goals;
          targetGoals = {
            revenueTarget: Number(g.revenueTarget || 150000),
            salesTarget: Number(g.salesTarget || 12),
            leadsTarget: Number(g.leadsTarget || 60),
            responseTimeTargetMinutes: Number(g.responseTimeTargetMinutes || 15),
          };
        }
      }

      // 2. Calcula período de datas
      const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString();
      const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
      const endDate = new Date(targetYear, targetMonth - 1, lastDayOfMonth, 23, 59, 59, 999).toISOString();

      // 3. Faturamento & Vendas Realizadas (Contratos Aprovados/Concluídos)
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('total_amount')
        .eq('master_id', masterId)
        .eq('venue_id', venueId)
        .in('approval_status', ['approved', 'completed'])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const contracts = contractsData || [];
      const achievedSales = contracts.length;
      const achievedRevenue = contracts.reduce((acc, c) => acc + Number(c.total_amount || 0), 0);

      // 4. Leads Realizados (Captação no período)
      const { count: achievedLeadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('master_id', masterId)
        .eq('venue_id', venueId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const achievedLeads = achievedLeadsCount || 0;

      // 5. Percentuais e Restantes
      const revenuePct = targetGoals.revenueTarget > 0 ? Math.round((achievedRevenue / targetGoals.revenueTarget) * 100) : 0;
      const salesPct = targetGoals.salesTarget > 0 ? Math.round((achievedSales / targetGoals.salesTarget) * 100) : 0;
      const leadsPct = targetGoals.leadsTarget > 0 ? Math.round((achievedLeads / targetGoals.leadsTarget) * 100) : 0;

      // 6. Projeção de Ritmo (Pace)
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === targetYear && now.getMonth() + 1 === targetMonth;
      const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : lastDayOfMonth;
      const totalDays = lastDayOfMonth;
      const dailyRevenuePace = achievedRevenue / daysElapsed;
      const projectedRevenue = Math.round(dailyRevenuePace * totalDays);
      const isPaceOnTrack = projectedRevenue >= targetGoals.revenueTarget;

      return {
        venueId,
        period,
        month: targetMonth,
        year: targetYear,
        revenue: {
          target: targetGoals.revenueTarget,
          achieved: achievedRevenue,
          percentage: revenuePct,
          remaining: Math.max(0, targetGoals.revenueTarget - achievedRevenue),
        },
        sales: {
          target: targetGoals.salesTarget,
          achieved: achievedSales,
          percentage: salesPct,
          remaining: Math.max(0, targetGoals.salesTarget - achievedSales),
        },
        leads: {
          target: targetGoals.leadsTarget,
          achieved: achievedLeads,
          percentage: leadsPct,
          remaining: Math.max(0, targetGoals.leadsTarget - achievedLeads),
        },
        pace: {
          daysElapsed,
          totalDays,
          projectedRevenue,
          isPaceOnTrack,
        },
      };
    } catch (err) {
      console.error('[metricsService.getGoalComparisonMetrics] Exceção:', err);
      return emptyResult;
    }
  },

  /**
   * Salva ou atualiza a meta da unidade garantindo consistência em venue_goals e venues.goals
   */
  async upsertVenueGoal(params: {
    masterId: string;
    venueId: string;
    revenueTarget: number;
    salesTarget: number;
    leadsTarget: number;
    responseTimeTargetMinutes?: number;
    appointmentsTarget?: number;
    period?: 'monthly' | 'quarterly' | 'yearly';
    month?: number;
    year?: number;
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !params.masterId || !params.venueId) return false;

    const period = params.period || 'monthly';
    const currDate = new Date();
    const year = params.year || currDate.getFullYear();
    const month = params.month || (currDate.getMonth() + 1);
    const respTime = params.responseTimeTargetMinutes || 15;

    try {
      // 1. Grava na tabela dedicada venue_goals
      const { error: errGoals } = await supabase
        .from('venue_goals')
        .upsert({
          master_id: params.masterId,
          venue_id: params.venueId,
          revenue_target: params.revenueTarget,
          sales_target: params.salesTarget,
          leads_target: params.leadsTarget,
          response_time_target_minutes: respTime,
          appointments_target: params.appointmentsTarget ?? 0,
          period,
          month,
          year,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'master_id,venue_id,period,month,year' });

      if (errGoals) {
        console.warn('[metricsService.upsertVenueGoal] Aviso ao gravar venue_goals:', errGoals.message);
      }

      // 2. Atualiza venues.goals para sincronia com o estado global da aplicação
      const goalsJson = {
        revenueTarget: params.revenueTarget,
        salesTarget: params.salesTarget,
        leadsTarget: params.leadsTarget,
        responseTimeTargetMinutes: respTime,
        appointmentsTarget: params.appointmentsTarget ?? 0,
        period,
      };

      await supabase
        .from('venues')
        .update({ goals: goalsJson, updated_at: new Date().toISOString() })
        .eq('id', params.venueId)
        .eq('master_id', params.masterId);

      return true;
    } catch (err) {
      console.error('[metricsService.upsertVenueGoal] Exceção:', err);
      return false;
    }
  },
};
