import type { Collaborator, AdminRole } from '../types/admin';
import { hasJobRole, HEAD_GROWTH_ROLE } from './jobRoles';

export interface AccessLevelOption {
  id: AdminRole;
  label: string;
  badgeLabel: string;
  description: string;
}

/**
 * Os Níveis Oficiais de Acesso do F5 System:
 * 1. Master: Diretor Master (Diretoria Geral com acesso a toda a rede)
 * 2. Diretor: Diretoria Executiva (acesso pleno às unidades autorizadas)
 * 3. Gerência: Gerentes de unidade(s)
 * 4. Pós-Venda: Sucesso do Cliente e Anfitriãs
 * 5. Comercial: Atendimento, Vendas e SDR/Closer unificados
 */
export const OFFICIAL_ACCESS_LEVELS: AccessLevelOption[] = [
  {
    id: 'master',
    label: 'Diretor(a) Master',
    badgeLabel: 'Diretor(a) Master',
    description: 'Diretoria Geral • Acesso irrestrito a toda a rede',
  },
  {
    id: 'diretor',
    label: 'Diretor(a)',
    badgeLabel: 'Diretor(a)',
    description: 'Diretoria • Poder de master nas unidades autorizadas',
  },
  {
    id: 'admin',
    label: 'Gerência',
    badgeLabel: 'Gerência',
    description: 'Gestão da unidade, equipe, funis e metas',
  },
  {
    id: 'pos_venda',
    label: 'Pós-Venda',
    badgeLabel: 'Pós-Venda',
    description: 'Sucesso do cliente, aniversariantes e anfitriãs',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    badgeLabel: 'Comercial',
    description: 'Atendimento comercial, WhatsApp e funis de vendas',
  },
];

/**
 * Retorna se o usuário é Master (ou root dev)
 */
export const isUserMaster = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'master' || role === 'dev' || Boolean(user.isDev);
};

/**
 * Retorna se o usuário é Diretor (Diretoria Executiva)
 */
export const isUserDirector = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (isUserMaster(user)) return true;
  const role = (user.role || '').toLowerCase();
  if (role === 'diretor' || role === 'diretoria') return true;
  if (user.department === 'diretoria') return true;
  if (user.sectors && user.sectors.includes('diretoria')) return true;
  const title = ((user as any).roleTitle || '').toLowerCase();
  if (title.includes('direto')) return true;
  return hasJobRole(user as any, 'diretoria:diretor') || hasJobRole(user as any, 'diretoria:master') || hasJobRole(user as any, HEAD_GROWTH_ROLE);
};

/**
 * Retorna se o usuário possui nível de Gerência
 */
export const isUserManager = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (isUserMaster(user) || isUserDirector(user)) return true;
  const role = (user.role || '').toLowerCase();
  if (role === 'admin' || role === 'gerencia') return true;
  if (user.sectors && user.sectors.includes('gerencia')) return true;
  return false;
};

/**
 * Tipo do evento do contrato: so gerencia (gerente de pos-venda, gerente geral, diretor/acesso geral, master/admin).
 * Predicado unico, tambem verificado no servico (nao so na tela).
 */
export const canChangeEventType = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (isUserMaster(user) || isUserDirector(user) || isUserManager(user)) return true;
  const role = (user.role || '').toLowerCase();
  if (role === 'gerente') return true;
  if (user.department === 'gerencia' || user.department === 'diretoria') return true;
  if (user.sectors && (user.sectors.includes('gerencia') || user.sectors.includes('diretoria'))) return true;
  const title = ((user as any).roleTitle || '').toLowerCase();
  if (title.includes('geren') || title.includes('direto')) return true;
  return hasJobRole(user as any, 'pos_venda:gerente') || hasJobRole(user as any, 'gerencia:gerente_geral') || hasJobRole(user as any, 'diretoria:diretor');
};

/**
 * REGRA MANDATÓRIA: Somente Gerência, Diretor e Master podem mudar um lead de unidade!
 * Usuários de Pós-Venda e Comercial NÃO possuem essa permissão.
 */
export const canChangeLeadVenue = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  return isUserMaster(user) || isUserDirector(user) || isUserManager(user);
};

/**
 * Mapeia qualquer papel ou legado para o rótulo oficial amigável
 */
export const formatAccessRoleLabel = (role?: string): string => {
  if (!role) return 'Sem cargo';
  const clean = role.toLowerCase().trim();
  switch (clean) {
    case 'master':
      return 'Diretor(a) Master';
    case 'diretor':
    case 'diretoria':
      return 'Diretor(a)';
    case 'dev':
      return 'Desenvolvedor';
    case 'admin':
    case 'gerencia':
      return 'Gerência';
    case 'pos_venda':
      return 'Pós-Venda';
    case 'comercial':
    case 'crm':
    case 'sdr':
    case 'closer':
      return 'Comercial';
    case 'financeiro':
      return 'Financeiro';
    default:
      return role;
  }
};

/**
 * Quem pode abrir o contrato a partir da Agenda de Eventos: gerencia/master ou quem atua nos DOIS setores
 * (comercial e pos-venda). Quem e so comercial ve o resumo, sem o botao.
 */
export const canAccessContractFromAgenda = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (canChangeEventType(user)) return true;
  const sectors = user.sectors || [];
  return sectors.includes('comercial') && sectors.includes('pos_venda');
};

/** Marcar/alterar SDR e Closer dos contratos: gerencia, master e gerente comercial. */
export const canEditContractTeam = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  return canChangeEventType(user) || hasJobRole(user as any, 'comercial:gerente');
};

/** Financeiro: master, diretor, gerencia e quem atua no setor financeiro. Comercial e pos-venda nao enxergam. */
export const canAccessFinance = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (isUserMaster(user) || isUserDirector(user) || isUserManager(user)) return true;
  if ((user.role || '').toLowerCase() === 'financeiro') return true;
  return Boolean(user.sectors && user.sectors.includes('financeiro'));
};

/**
 * Contratos aprovados e documentos do contrato (PDF): so financeiro e pos-venda (alem de master, diretor e gerencia).
 * O comercial acompanha a venda ate "Preenchido" e nao ve os aprovados nem abre o documento.
 */
export const canViewContractDocument = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  if (isUserMaster(user) || isUserDirector(user) || isUserManager(user)) return true;
  const role = (user.role || '').toLowerCase();
  if (role === 'financeiro' || role === 'pos_venda') return true;
  const sectors = user.sectors || [];
  return sectors.includes('financeiro') || sectors.includes('pos_venda');
};
export const canSeeApprovedContracts = canViewContractDocument;
