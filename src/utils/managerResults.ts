import type { Client, Collaborator, CommercialFunnel, Lead } from '../types/admin';
import { computeGoalActuals, type GoalActuals } from './goalActuals';
import { contractValue, isActiveContract, type AssetSummary, type ProfileKind } from './collaboratorAssets';

/**
 * Visao de gestao do gerente: resultado do que ele administra (casas, comercial ou pos-venda).
 * Funcoes puras sobre dados em memoria (sem consulta ao banco).
 */

export type ManagerPeriod = 'this_month' | 'last_month';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const managerRange = (period: ManagerPeriod, now: Date = new Date()): { startsOn: string; endsOn: string; label: string } => {
  const base = period === 'this_month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = period === 'this_month' ? now : new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const label = base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { startsOn: iso(base), endsOn: iso(end), label: label.charAt(0).toUpperCase() + label.slice(1) };
};

export interface VenueResult {
  venueId: string;
  name: string;
  revenue: number;
  closings: number;
  appointments: number;
  schedulingRate: number | null;
  attendanceRate: number | null;
  closingRate: number | null;
}

export interface TeamDelivery {
  id: string;
  name: string;
  revenue: number;
  closings: number;
  appointments: number;
}

export interface PostSaleResult {
  activeContracts: number;
  contractsValue: number;
  upsellRevenue: number;
  upsellCount: number;
  openTasks: number;
  upcomingAppointments: number;
}

export interface ManagerResultSet {
  period: { startsOn: string; endsOn: string; label: string };
  showCommercial: boolean;
  showPostSale: boolean;
  totals: VenueResult;
  venues: VenueResult[];
  team: TeamDelivery[];
  postSale: PostSaleResult;
}

interface Input {
  kind: ProfileKind;
  /** Casas que o gerente administra (ja escopadas). */
  venues: { id: string; name: string }[];
  period: ManagerPeriod;
  leads: Lead[];
  clients: Client[];
  funnels: CommercialFunnel[];
  collaborators: Collaborator[];
  /** Resumo de ativos por pessoa (collaboratorAssets.summarizeAssets). */
  assets: Map<string, AssetSummary>;
  /** Pessoas do comercial e do pos-venda nas casas (ids). */
  commercialTeamIds: Set<string>;
  postSaleTeamIds: Set<string>;
}

const toVenueResult = (venueId: string, name: string, a: GoalActuals): VenueResult => ({
  venueId, name,
  revenue: a.venue.revenue, closings: a.venue.closings, appointments: a.venue.appointments,
  schedulingRate: a.venue.schedulingRate, attendanceRate: a.venue.attendanceRate, closingRate: a.venue.closingRate,
});

export const computeManagerResults = (input: Input): ManagerResultSet => {
  const period = managerRange(input.period);
  const venueIds = input.venues.map(v => v.id);
  const actualsInput = { leads: input.leads, clients: input.clients, funnels: input.funnels, collaborators: input.collaborators };

  const showCommercial = input.kind === 'gerente_geral' || input.kind === 'gerente_comercial';
  const showPostSale = input.kind === 'gerente_geral' || input.kind === 'gerente_pos_venda';

  const pooled = computeGoalActuals(actualsInput, venueIds, period.startsOn, period.endsOn);
  const totals = toVenueResult('all', 'Total', pooled);
  const venues = input.venues
    .map(v => toVenueResult(v.id, v.name, computeGoalActuals(actualsInput, v.id, period.startsOn, period.endsOn)))
    .sort((a, b) => b.revenue - a.revenue);

  const team: TeamDelivery[] = input.collaborators
    .filter(c => c.active && input.commercialTeamIds.has(c.id))
    .map(c => {
      const row = pooled.byCollaborator.get(c.id);
      return { id: c.id, name: c.name, revenue: row?.revenue ?? 0, closings: row?.closings ?? 0, appointments: row?.appointments ?? 0 };
    })
    .filter(t => t.revenue > 0 || t.closings > 0 || t.appointments > 0)
    .sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);

  // Pos-venda: contratos ativos nas casas e vendas adicionais no periodo (o pos-venda tambem vende)
  const inScope = input.clients.filter(c => venueIds.includes(c.venueId));
  const activeContracts = inScope.filter(isActiveContract);
  let upsellRevenue = 0;
  let upsellCount = 0;
  inScope.forEach(c => (c.upsellSales || []).forEach(s => {
    const d = (s.saleDate || '').slice(0, 10);
    if (d >= period.startsOn && d <= period.endsOn) { upsellRevenue += Number(s.value || 0); upsellCount += 1; }
  }));
  let openTasks = 0;
  let upcomingAppointments = 0;
  input.postSaleTeamIds.forEach(id => {
    const a = input.assets.get(id);
    if (a) { openTasks += a.tasks; upcomingAppointments += a.appointments; }
  });

  return {
    period, showCommercial, showPostSale, totals, venues, team,
    postSale: {
      activeContracts: activeContracts.length,
      contractsValue: activeContracts.reduce((s, c) => s + contractValue(c), 0),
      upsellRevenue, upsellCount, openTasks, upcomingAppointments,
    },
  };
};
