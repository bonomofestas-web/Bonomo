import type { Collaborator, AdminRole } from '../types/admin';

export interface AccessLevelOption {
  id: AdminRole;
  label: string;
  badgeLabel: string;
  description: string;
}

/**
 * Os 4 Níveis Oficiais de Acesso do F5 System:
 * 1. Master: Diretoria Geral e donos da rede
 * 2. Gerência: Gerentes de unidade(s)
 * 3. Pós-Venda: Sucesso do Cliente e Anfitriãs
 * 4. Comercial: Atendimento, Vendas e SDR/Closer unificados
 */
export const OFFICIAL_ACCESS_LEVELS: AccessLevelOption[] = [
  {
    id: 'master',
    label: 'Master',
    badgeLabel: 'Master',
    description: 'Diretoria Geral • Acesso total à rede de casas',
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
 * Retorna se o usuário possui nível de Gerência
 */
export const isUserManager = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'admin' || role === 'gerencia') return true;
  if (user.sectors && user.sectors.includes('gerencia')) return true;
  return false;
};

/**
 * REGRA MANDATÓRIA: Somente Gerência e Master podem mudar um lead de unidade!
 * Usuários de Pós-Venda e Comercial NÃO possuem essa permissão.
 */
export const canChangeLeadVenue = (user?: Partial<Collaborator> | null): boolean => {
  if (!user) return false;
  return isUserMaster(user) || isUserManager(user);
};

/**
 * Mapeia qualquer papel ou legado para o rótulo oficial amigável
 */
export const formatAccessRoleLabel = (role?: string): string => {
  if (!role) return 'Sem cargo';
  const clean = role.toLowerCase().trim();
  switch (clean) {
    case 'master':
      return 'Master';
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
