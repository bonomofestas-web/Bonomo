import type { Collaborator } from '../types/admin';

/**
 * Acesso x cargo.
 * - ACESSO = setores (`sectors`): o que o colaborador enxerga no sistema.
 * - CARGO = `jobRoles`: o que ele e dentro do setor; serve de filtro (quem e SDR, Closer, gestor de trafego...).
 * Guardado na coluna `permissions` como `jobrole:<id>` (ver collaboratorService).
 *
 * Id de cargo:
 *  - fixo (vem do codigo):        `<setor>:<cargo>`        ex.: comercial:sdr, marketing:gestor
 *  - personalizado ("Outro"):     `<setor>:x:<slug>`       ex.: marketing:x:gestor-de-trafego
 * Os personalizados ficam no catalogo `job_roles` (jobRoleService) e podem ser excluidos.
 */
export type JobSector = 'diretoria' | 'comercial' | 'pos_venda' | 'financeiro' | 'marketing_tecnologia' | 'marketing' | 'gerencia' | string;

export const normalizeSector = (sector: string): JobSector => {
  if (sector === 'gerencia') return 'diretoria';
  if (sector === 'marketing') return 'marketing_tecnologia';
  return sector as JobSector;
};

export interface JobSectorConfig {
  id: string;
  label: string;
  color: string;
  position?: number;
}

export const DEFAULT_JOB_SECTORS: JobSectorConfig[] = [
  { id: 'diretoria', label: 'Diretoria', color: '#D4AF37', position: 0 },
  { id: 'comercial', label: 'Comercial', color: '#10B981', position: 1 },
  { id: 'pos_venda', label: 'Pós-Venda', color: '#06B6D4', position: 2 },
  { id: 'financeiro', label: 'Financeiro', color: '#F59E0B', position: 3 },
  { id: 'marketing_tecnologia', label: 'Marketing e Tecnologia', color: '#EC4899', position: 4 },
];

export const JOB_SECTORS: JobSectorConfig[] = DEFAULT_JOB_SECTORS;

export interface JobRoleOption { id: string; label: string; description: string }

/** Cargos fixos de cada setor. Os demais sao digitados em "+ Outro" (catalogo por setor). */
export const JOB_ROLE_OPTIONS: Record<string, JobRoleOption[]> = {
  diretoria: [
    { id: 'diretoria:master', label: 'Diretor Master', description: 'Diretor geral com acesso a toda a rede' },
    { id: 'diretoria:diretor', label: 'Diretor(a)', description: 'Mesmos poderes de um master nas unidades liberadas' },
  ],
  comercial: [
    { id: 'comercial:gerente', label: 'Gerente comercial', description: 'Gestão do setor comercial' },
    { id: 'comercial:closer', label: 'Especialista', description: 'Conduz a visita e fecha o contrato' },
    { id: 'comercial:sdr', label: 'SDR', description: 'Qualifica e agenda' },
  ],
  marketing_tecnologia: [
    { id: 'marketing_tecnologia:head_growth', label: 'Head de Growth', description: 'Mesmo poder de um diretor nas unidades liberadas; único que pode marcar a equipe de marketing' },
    { id: 'marketing_tecnologia:gestor', label: 'Gestor', description: 'Gestão de marketing e tecnologia (ex.: tráfego pago)' },
  ],
  marketing: [
    { id: 'marketing_tecnologia:head_growth', label: 'Head de Growth', description: 'Mesmo poder de um diretor nas unidades liberadas; único que pode marcar a equipe de marketing' },
    { id: 'marketing_tecnologia:gestor', label: 'Gestor', description: 'Gestão de marketing e tecnologia (ex.: tráfego pago)' },
  ],
  pos_venda: [
    { id: 'pos_venda:gerente', label: 'Gerente de pós-venda', description: 'Gestão do setor de pós-venda' },
    { id: 'pos_venda:cs', label: 'Customer Success', description: 'Acompanha a jornada do cliente até a festa e o valor entregue' },
    { id: 'pos_venda:sac', label: 'SAC', description: 'Atendimento receptivo: dúvidas, reclamações e problemas' },
    { id: 'pos_venda:suporte', label: 'Suporte / Implantação', description: 'Onboarding, configuração inicial e orientação ao cliente' },
    { id: 'pos_venda:retencao', label: 'Retenção e fidelização', description: 'Benefícios, pesquisas de satisfação (NPS) e manutenção do cliente' },
    { id: 'pos_venda:upsell', label: 'Expansão / Upsell', description: 'Vendas adicionais e complementares para clientes da base' },
  ],
  financeiro: [
    { id: 'financeiro:gerente', label: 'Gerente financeiro', description: 'Gestão do setor financeiro' },
    { id: 'financeiro:analista', label: 'Analista financeiro', description: 'Rotinas financeiras' },
  ],
};

export interface CustomJobRole { id: string; sector: JobSector; name: string; slug: string }

/** Ordem hierarquica salva (id do cargo -> posicao; menor aparece primeiro). */
export type JobRoleOrder = Record<string, number>;

/** Posicao do cargo: a salva pelo Master; senao a ordem padrao (fixos na ordem da lista, personalizados depois). */
export const roleRank = (id: string, order: JobRoleOrder = {}, custom: CustomJobRole[] = []): number => {
  if (order[id] !== undefined) return order[id];
  const sector = normalizeSector(id.split(':')[0]);
  const fixedIndex = (JOB_ROLE_OPTIONS[sector] || []).findIndex(o => o.id === id);
  if (fixedIndex >= 0) return fixedIndex;
  const customIndex = custom.filter(r => normalizeSector(r.sector) === sector).findIndex(r => r.id === id);
  return 500 + (customIndex >= 0 ? customIndex : 0);
};

/** Ids dos cargos de um setor (fixos + personalizados) na ordem hierarquica. */
export const orderedSectorRoleIds = (sector: JobSector, custom: CustomJobRole[] = [], order: JobRoleOrder = {}): string[] => {
  const norm = normalizeSector(sector);
  const fixed = JOB_ROLE_OPTIONS[norm] || JOB_ROLE_OPTIONS[sector] || [];
  const customItems = custom.filter(r => normalizeSector(r.sector) === norm);
  return [...fixed.map(o => o.id), ...customItems.map(r => r.id)]
    .sort((a, b) => roleRank(a, order, custom) - roleRank(b, order, custom));
};

export const slugifyRole = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

/** Id do cargo personalizado de um setor. */
export const customRoleId = (sector: JobSector, slug: string): string => `${normalizeSector(sector)}:x:${slug}`;

export const isCustomRoleId = (id: string): boolean => id.split(':')[1] === 'x';
export const sectorOfRole = (id: string): JobSector => normalizeSector(id.split(':')[0]);

/** Cargos antigos que deixaram de ser fixos mantem o rotulo. */
const LEGACY_LABELS: Record<string, string> = { 'gerencia:outro': 'Outro' };

/** Rotulo do cargo. Personalizado: nome do catalogo; se o item foi excluido, deriva do slug. */
export type JobRoleAliases = Record<string, string>;

/** Nome de exibicao: o apelido definido pelo Master (ex.: SDR -> "Especialista") vence o nome padrao. */
export const jobRoleLabel = (id: string, custom: CustomJobRole[] = [], aliases: JobRoleAliases = {}): string => {
  const alias = aliases[id]?.trim();
  if (alias) return alias;
  const fixed = Object.values(JOB_ROLE_OPTIONS).flat().find(o => o.id === id);
  if (fixed) return fixed.label;
  const c = custom.find(x => x.id === id || x.id === id.replace(/^gerencia:/, 'diretoria:').replace(/^marketing:/, 'marketing_tecnologia:'));
  if (c) return c.name;
  if (LEGACY_LABELS[id]) return LEGACY_LABELS[id];
  const slug = id.split(':')[2] || id;
  return slug.replace(/-/g, ' ').replace(/^./, ch => ch.toUpperCase());
};

/** Cargo do sistema com poder de diretor fora da Diretoria. */
export const HEAD_GROWTH_ROLE = 'marketing_tecnologia:head_growth';

export const hasJobRole = (c: Pick<Collaborator, 'jobRoles'> | undefined | null, id: string): boolean => !!c?.jobRoles?.includes(id);

/** Cargos comerciais definidos para o colaborador (`defined` = o cadastro tem pelo menos um cargo comercial). */
export const commercialJobRoles = (c: Pick<Collaborator, 'jobRoles'> | undefined | null) => {
  const sdr = hasJobRole(c, 'comercial:sdr');
  const closer = hasJobRole(c, 'comercial:closer');
  const manager = hasJobRole(c, 'comercial:gerente');
  return { sdr, closer, manager, defined: sdr || closer || manager };
};
