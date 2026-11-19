import type { AdminTask, Client, Collaborator, CommercialFunnel, Lead } from '../types/admin';
import type { Appointment } from '../types';
import { getCommercialRolesInVenue, isCommercialCollaborator } from './funnelResponsibility';
import { commercialJobRoles, jobRoleLabel, type CustomJobRole, type JobRoleAliases } from './jobRoles';

/**
 * Perfil e ATIVOS de cada colaborador. Funcoes puras sobre dados que o contexto ja carrega em memoria
 * (nao fazem consulta ao banco: orcamento do Supabase gratuito).
 *
 * Ativo por perfil: comercial = leads em aberto; pos-venda = contratos administrados; todos = tarefas e compromissos.
 * Gerentes nao tem ativos (os ativos sao os times deles): mostram resultado de gestao (managerResults.ts).
 */

export type CollabSectorKey = 'gerencia' | 'comercial' | 'pos_venda' | 'marketing' | 'financeiro';

export type ProfileKind =
  | 'closer' | 'sdr' | 'sdr_closer'
  | 'gerente_comercial' | 'gerente_geral' | 'gerente_pos_venda'
  | 'pos_venda' | 'marketing' | 'financeiro' | 'outro';

export const PROFILE_KIND_LABEL: Record<ProfileKind, string> = {
  closer: 'Closer',
  sdr: 'SDR',
  sdr_closer: 'SDR e Closer',
  gerente_comercial: 'Gerente comercial',
  gerente_geral: 'Gerente geral',
  gerente_pos_venda: 'Gerente de pós-venda',
  pos_venda: 'Pós-venda',
  marketing: 'Marketing',
  financeiro: 'Financeiro',
  outro: 'Colaborador',
};

/** Gerentes nao tem ativos: o perfil mostra a visao de gestao. */
export const isManagerKind = (k: ProfileKind): boolean => k === 'gerente_comercial' || k === 'gerente_geral' || k === 'gerente_pos_venda';

/** Setores do colaborador (`sectors`, com o mesmo fallback pelo cargo-base usado na lista). */
export const collaboratorSectors = (c: Collaborator): CollabSectorKey[] => {
  const found = new Set<CollabSectorKey>();
  (c.sectors || []).forEach(s => found.add(s as CollabSectorKey));
  (c.permissions || []).forEach(p => { if (typeof p === 'string' && p.startsWith('sector:')) found.add(p.replace('sector:', '') as CollabSectorKey); });
  if (c.department && c.department !== 'diretoria') found.add(c.department as CollabSectorKey);
  if (c.role === 'master' || c.role === 'admin' || c.role === 'gerencia') {
    found.add('gerencia');
    if (found.size === 1) { found.add('comercial'); found.add('pos_venda'); }
  } else if (c.role === 'pos_venda') found.add('pos_venda');
  else if ((c.role as string) === 'financeiro') found.add('financeiro');
  else if (found.size === 0) found.add('comercial');
  const order: CollabSectorKey[] = ['gerencia', 'comercial', 'pos_venda', 'marketing', 'financeiro'];
  return order.filter(k => found.has(k));
};

/** Cargo explicito de marketing (ex.: gestor de trafego) sem cargo de gerencia: a pessoa e do marketing mesmo com acesso amplo. */
const hasMarketingJob = (c: Collaborator): boolean => {
  const jobs = c.jobRoles || [];
  return jobs.some(r => r.startsWith('marketing:')) && !jobs.some(r => r.startsWith('gerencia:'));
};

/** Setor principal: define em qual secao do Time a pessoa aparece. */
export const primarySectorOf = (c: Collaborator): CollabSectorKey => {
  const sectors = collaboratorSectors(c);
  if (c.role !== 'master' && hasMarketingJob(c) && sectors.includes('marketing')) return 'marketing';
  if (sectors.includes('gerencia') && (c.role === 'master' || c.role === 'admin' || c.role === 'gerencia' || (c.jobRoles || []).some(r => r.startsWith('gerencia:')))) return 'gerencia';
  if (commercialJobRoles(c).defined) return 'comercial';
  if (sectors.includes('pos_venda') && c.role === 'pos_venda') return 'pos_venda';
  if (sectors.includes('marketing') && !sectors.includes('pos_venda')) return 'marketing';
  if (sectors.includes('pos_venda') && !isCommercialCollaborator(c)) return 'pos_venda';
  if (sectors.includes('pos_venda') && !sectors.includes('comercial')) return 'pos_venda';
  if (sectors.includes('comercial')) return c.role === 'pos_venda' ? 'pos_venda' : 'comercial';
  return sectors[0] || 'comercial';
};

/** Tipo de perfil: decide quais ativos ou qual visao de gestao aparecem. Cargo definido prevalece sobre a equipe dos funis. */
export const resolveProfileKind = (c: Collaborator, funnels: CommercialFunnel[], venueIds: string[]): ProfileKind => {
  const jobs = c.jobRoles || [];
  if (c.role !== 'master' && hasMarketingJob(c)) return 'marketing';
  if (jobs.includes('gerencia:gerente_geral') || ((c.role === 'master' || c.role === 'admin' || c.role === 'gerencia') && !jobs.some(r => r.startsWith('comercial:') || r.startsWith('pos_venda:')))) {
    return 'gerente_geral';
  }
  if (jobs.includes('comercial:gerente') && !jobs.includes('comercial:sdr') && !jobs.includes('comercial:closer')) return 'gerente_comercial';
  if (jobs.some(r => r.startsWith('pos_venda:') && /gerente|coordena|lider/.test(r))) return 'gerente_pos_venda';

  const primary = primarySectorOf(c);
  if (primary === 'pos_venda') return 'pos_venda';
  if (primary === 'marketing') return 'marketing';
  if (primary === 'financeiro') return 'financeiro';
  if (primary === 'comercial') {
    let sdr = false;
    let closer = false;
    (venueIds.length ? venueIds : ['all']).forEach(v => {
      const r = getCommercialRolesInVenue(funnels, v, c);
      sdr = sdr || r.sdr;
      closer = closer || r.closer;
    });
    if (sdr && closer) return 'sdr_closer';
    if (closer) return 'closer';
    if (sdr) return 'sdr';
    return commercialJobRoles(c).manager ? 'gerente_comercial' : 'outro';
  }
  return 'outro';
};

/** Cargos legiveis (labels de jobRoles; custom pelo catalogo) para chips. */
export const jobRoleLabels = (c: Collaborator, custom: CustomJobRole[], aliases: JobRoleAliases = {}): string[] => (c.jobRoles || []).map(r => jobRoleLabel(r, custom, aliases));

/* ───────── Leads (comercial) ───────── */

export interface LeadClassifier {
  isClosed: (l: Lead) => boolean;
  isLost: (l: Lead) => boolean;
  /** Lead de funil de pos-venda: fora das metricas comerciais. */
  isPostSale: (l: Lead) => boolean;
  isOpen: (l: Lead) => boolean;
}

export const buildLeadClassifier = (funnels: CommercialFunnel[]): LeadClassifier => {
  const won = new Set<string>();
  const loss = new Set<string>();
  const postSaleFunnels = new Set<string>();
  funnels.forEach(f => {
    if (f.isPostSale) postSaleFunnels.add(f.id);
    (f.stages || []).forEach(s => { if (s.isWon) won.add(s.id); if (s.isLoss) loss.add(s.id); });
  });
  const isClosed = (l: Lead) => l.stage === 'contract_signed' || won.has(String(l.stage));
  const isLost = (l: Lead) => !isClosed(l) && (loss.has(String(l.stage)) || l.stage === 'lost' || (loss.size === 0 && !!l.lossReason));
  const isPostSale = (l: Lead) => !!l.funnelId && postSaleFunnels.has(l.funnelId);
  return {
    isClosed, isLost, isPostSale,
    isOpen: (l: Lead) => !isPostSale(l) && !l.isRemovedFromFunnel && !l.isArchived && !isClosed(l) && !isLost(l),
  };
};

/* ───────── Pos-venda ───────── */

const ACTIVE_CLIENT_STAGES = new Set(['onboarding', 'planning', 'suppliers', 'final_alignment', 'party_day']);
/** Contrato administrado ativo: em andamento no pos-venda (fora de entrada, concluido, cancelado e arquivado). */
export const isActiveContract = (c: Client): boolean => ACTIVE_CLIENT_STAGES.has(String(c.stage));
export const contractValue = (c: Client): number => Number(c.baseContractValue ?? c.dealValue ?? 0);

/* ───────── Tarefas e compromissos ───────── */

const OPEN_TASK = new Set(['todo', 'in_progress', 'waiting']);
export const isOpenTask = (t: AdminTask): boolean => OPEN_TASK.has(String(t.status));
export const isOverdueTask = (t: AdminTask, todayISO: string): boolean => isOpenTask(t) && !!t.dueDate && t.dueDate < todayISO;

const UPCOMING_APPT = new Set(['scheduled', 'confirmed', 'in_progress', 'rescheduled']);

export interface AssetSummary {
  leads: number;          // leads comerciais em aberto
  contracts: number;      // contratos administrados ativos (pos-venda)
  tasks: number;          // tarefas em aberto
  overdueTasks: number;
  appointments: number;   // compromissos futuros
}

export interface AssetContext {
  leads: Lead[];
  clients: Client[];
  tasks: AdminTask[];
  appointments: Appointment[];
  funnels: CommercialFunnel[];
  todayISO: string;
}

const blank = (): AssetSummary => ({ leads: 0, contracts: 0, tasks: 0, overdueTasks: 0, appointments: 0 });

/** Resumo dos ativos de varias pessoas em uma unica passada pelos dados (sem N varreduras). */
export const summarizeAssets = (ctx: AssetContext): Map<string, AssetSummary> => {
  const out = new Map<string, AssetSummary>();
  const get = (id: string) => { let r = out.get(id); if (!r) { r = blank(); out.set(id, r); } return r; };
  const cls = buildLeadClassifier(ctx.funnels);

  ctx.leads.forEach(l => {
    if (!cls.isOpen(l)) return;
    if (l.sdrId) get(l.sdrId).leads += 1;
    if (l.closerId && l.closerId !== l.sdrId) get(l.closerId).leads += 1;
  });
  ctx.clients.forEach(c => { if (c.assignedSuccessManagerId && isActiveContract(c)) get(c.assignedSuccessManagerId).contracts += 1; });
  ctx.tasks.forEach(t => {
    if (!isOpenTask(t)) return;
    const overdue = isOverdueTask(t, ctx.todayISO);
    (t.assignedToIds || []).forEach(id => { const r = get(id); r.tasks += 1; if (overdue) r.overdueTasks += 1; });
  });

  // Compromissos: tabela de agenda + visitas/degustacoes dos leads (sem contar duas vezes o mesmo agendamento)
  const seen = new Set<string>();
  ctx.appointments.forEach(a => {
    if (!a.responsibleCollaboratorId || !UPCOMING_APPT.has(String(a.status)) || a.date < ctx.todayISO) return;
    seen.add(a.id);
    get(a.responsibleCollaboratorId).appointments += 1;
  });
  ctx.leads.forEach(l => {
    [l.visitCommitment, l.tastingCommitment].forEach(c => {
      if (!c || c.status !== 'scheduled' || !c.date || c.date < ctx.todayISO) return;
      if (c.appointmentId && seen.has(c.appointmentId)) return;
      const id = c.responsibleCollaboratorId || c.responsibleId;
      if (id) get(id).appointments += 1;
    });
  });
  return out;
};

export const emptyAssetSummary = blank;

/* ───────── Listas detalhadas (perfil) ───────── */

export const leadsOf = (id: string, leads: Lead[], cls: LeadClassifier): Lead[] =>
  leads.filter(l => (l.sdrId === id || l.closerId === id) && cls.isOpen(l));

export const contractsOf = (id: string, clients: Client[]): Client[] =>
  clients.filter(c => c.assignedSuccessManagerId === id && isActiveContract(c));

export const upsellSalesOf = (id: string, clients: Client[], startsOn?: string, endsOn?: string) => {
  const rows: { client: Client; sale: NonNullable<Client['upsellSales']>[number] }[] = [];
  clients.forEach(c => (c.upsellSales || []).forEach(s => {
    if (s.responsibleId !== id) return;
    const d = (s.saleDate || '').slice(0, 10);
    if (startsOn && d < startsOn) return;
    if (endsOn && d > endsOn) return;
    rows.push({ client: c, sale: s });
  }));
  return rows;
};

export const tasksOf = (id: string, tasks: AdminTask[]): AdminTask[] => tasks.filter(t => (t.assignedToIds || []).includes(id) && isOpenTask(t));

export const appointmentsOf = (id: string, appointments: Appointment[], todayISO: string): Appointment[] =>
  appointments.filter(a => a.responsibleCollaboratorId === id && UPCOMING_APPT.has(String(a.status)) && a.date >= todayISO);

/** Soma dos ativos de varias pessoas (faixa de resumo do Time). */
export const summarizeAssetsTotal = (list: (AssetSummary | undefined)[]): AssetSummary =>
  list.reduce<AssetSummary>((acc, s) => (s ? {
    leads: acc.leads + s.leads, contracts: acc.contracts + s.contracts, tasks: acc.tasks + s.tasks,
    overdueTasks: acc.overdueTasks + s.overdueTasks, appointments: acc.appointments + s.appointments,
  } : acc), blank());
