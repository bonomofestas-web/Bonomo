import type { Collaborator, CommercialFunnel, FunnelStageConfig, Lead, StageResponsibility } from '../types/admin';

// Regras de papel (SDR/Closer), visibilidade e responsabilidade por etapa do funil.
// Fonte unica usada pelo Kanban, pela configuracao do funil e pelas notificacoes.
// Isolamento: sempre receba colaboradores ja escopados por master (scopedMasterId).

type CollabLike = Pick<Collaborator, 'id' | 'role'> &
  Partial<Pick<Collaborator, 'active' | 'isDev' | 'venueId' | 'venueIds' | 'sectors' | 'department' | 'masterId'>>;

export interface FunnelMemberRoles { sdr: boolean; closer: boolean }

export const isManagerLike = (c: Pick<Collaborator, 'role'> & Partial<Pick<Collaborator, 'isDev'>>): boolean =>
  c.role === 'master' || c.role === 'admin' || c.role === 'gerencia' || c.role === 'dev' || Boolean(c.isDev);

const COMMERCIAL_ROLES = ['comercial', 'crm', 'sdr', 'closer'];

export const isCommercialCollaborator = (c: CollabLike): boolean =>
  COMMERCIAL_ROLES.includes(c.role) ||
  (c.sectors || []).includes('comercial') ||
  c.department === 'comercial';

/** Papel do colaborador no funil. Se o funil nao define equipe, usa o cargo do colaborador. */
export function getFunnelMemberRoles(funnel: CommercialFunnel | undefined, c: CollabLike): FunnelMemberRoles {
  const sdrIds = new Set([...(funnel?.teamMemberIds || []), ...(funnel?.assignedSdrIds || [])]);
  const closerIds = new Set(funnel?.closerIds || []);
  if (sdrIds.size > 0 || closerIds.size > 0) {
    return { sdr: sdrIds.has(c.id), closer: closerIds.has(c.id) };
  }
  if (c.role === 'sdr') return { sdr: true, closer: false };
  if (c.role === 'closer') return { sdr: false, closer: true };
  const commercial = isCommercialCollaborator(c);
  return { sdr: commercial, closer: commercial };
}

/**
 * Papeis (SDR/Closer) de um colaborador em uma unidade, somando os funis COMERCIAIS dela.
 * O cargo no cadastro e generico (crm, admin...): quem e SDR ou Closer vem da equipe de cada funil.
 */
export function getCommercialRolesInVenue(funnels: CommercialFunnel[], venueId: string, c: CollabLike): FunnelMemberRoles {
  // Cargo definido no cadastro (acesso x cargo) prevalece sobre a equipe dos funis
  const jobRoles = (c as { jobRoles?: string[] }).jobRoles || [];
  if (jobRoles.some(r => r.startsWith('comercial:'))) {
    return { sdr: jobRoles.includes('comercial:sdr'), closer: jobRoles.includes('comercial:closer') };
  }
  const venueFunnels = funnels.filter(f => !f.isPostSale && (f.venueId === venueId || (f.sharedVenueIds || []).includes(venueId)));
  if (venueFunnels.length === 0) return getFunnelMemberRoles(undefined, c);
  return venueFunnels.reduce<FunnelMemberRoles>((acc, f) => {
    const r = getFunnelMemberRoles(f, c);
    return { sdr: acc.sdr || r.sdr, closer: acc.closer || r.closer };
  }, { sdr: false, closer: false });
}

/** Pode ver a etapa? Lista especifica > visibilidade por papel > livre. Gestao enxerga tudo. */
export function canCollaboratorSeeStage(
  funnel: CommercialFunnel | undefined,
  stage: FunnelStageConfig | undefined,
  c: CollabLike,
): boolean {
  if (isManagerLike(c)) return true;
  if (!stage) return true;
  if (stage.allowedCollaboratorIds && stage.allowedCollaboratorIds.length > 0) {
    return stage.allowedCollaboratorIds.includes(c.id);
  }
  if (stage.visibility === 'sdr') return getFunnelMemberRoles(funnel, c).sdr;
  if (stage.visibility === 'closer') return getFunnelMemberRoles(funnel, c).closer;
  return true;
}

const hasVenueAccess = (c: CollabLike, venueId?: string): boolean => {
  if (!venueId || venueId === 'all') return true;
  if (c.venueId === 'all') return true;
  const ids = c.venueIds && c.venueIds.length > 0 ? c.venueIds : (c.venueId ? [c.venueId] : []);
  return ids.length === 0 || ids.includes(venueId);
};

const hasFunnelAccess = (funnel: CommercialFunnel | undefined, c: CollabLike): boolean => {
  const allowed = funnel?.allowedCollaboratorIds;
  return !allowed || allowed.length === 0 || allowed.includes(c.id);
};

/** Colaboradores comerciais ativos que enxergam a etapa (sem gestao), dentro do tenant e da unidade. */
export function getStageViewers(
  funnel: CommercialFunnel | undefined,
  stage: FunnelStageConfig | undefined,
  collaborators: CollabLike[],
  opts: { venueId?: string; masterId?: string } = {},
): CollabLike[] {
  return collaborators.filter(c =>
    c.active !== false &&
    !isManagerLike(c) &&
    isCommercialCollaborator(c) &&
    (!opts.masterId || !c.masterId || c.masterId === opts.masterId) &&
    hasVenueAccess(c, opts.venueId) &&
    hasFunnelAccess(funnel, c) &&
    canCollaboratorSeeStage(funnel, stage, c),
  );
}

/** Donos atuais do lead nesta etapa, conforme a responsabilidade (mutua = SDR e Closer). */
export function getStageOwnerIds(
  stage: FunnelStageConfig | undefined,
  lead: Pick<Lead, 'sdrId' | 'closerId'>,
): string[] {
  const resp: StageResponsibility = stage?.responsibility || 'both';
  const ids: string[] = [];
  if (resp !== 'closer' && lead.sdrId) ids.push(lead.sdrId);
  if (resp !== 'sdr' && lead.closerId) ids.push(lead.closerId);
  return ids;
}

/**
 * Quem deve ser notificado sobre um lead: so o dono; se nao ha dono, quem poderia ser dono.
 * Etapa vista por um unico colaborador torna esse colaborador o responsavel implicito.
 * Com roleta ativa e sem dono, ninguem e notificado (o sorteado sera notificado ao receber o lead).
 */
export function getLeadNotificationRecipientIds(
  funnel: CommercialFunnel | undefined,
  stage: FunnelStageConfig | undefined,
  lead: Pick<Lead, 'sdrId' | 'closerId' | 'venueId'>,
  collaborators: CollabLike[],
  opts: { masterId?: string } = {},
): string[] {
  const owners = getStageOwnerIds(stage, lead);
  if (owners.length > 0) {
    // Dono explicito do lead sempre e notificado, exceto se for um colaborador sabidamente inativo.
    // (a lista local pode nao conter o proprio Master; a RLS de INSERT valida o pertencimento ao tenant)
    const inactive = new Set(collaborators.filter(c => c.active === false).map(c => c.id));
    return owners.filter(id => !inactive.has(id));
  }
  const venueId = lead.venueId;
  const venueDist = venueId ? funnel?.venueDistributionConfig?.[venueId] : undefined;
  const mode = venueDist && venueDist.distributionMode && venueDist.distributionMode !== 'inherit'
    ? venueDist.distributionMode
    : funnel?.distributionMode;
  if (mode === 'round_robin') return [];

  const resp: StageResponsibility = stage?.responsibility || 'both';
  return getStageViewers(funnel, stage, collaborators, { venueId, masterId: opts.masterId })
    .filter(c => {
      const roles = getFunnelMemberRoles(funnel, c);
      return resp === 'both' ? (roles.sdr || roles.closer) : roles[resp];
    })
    .map(c => c.id);
}
