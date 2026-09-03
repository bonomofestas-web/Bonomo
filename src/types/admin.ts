import type { 
  Milestone, 
  VipReward, 
  Guest, 
  Referral, 
  Appointment, 
  JourneyCycleState 
} from './index';

// All roles in the system (dev is the exclusive root developer super-role)
export type AdminRole = 'dev' | 'master' | 'admin' | 'crm' | 'sdr' | 'closer';

export type FeatureFlagId = 
  | 'home'
  | 'dashboard'
  | 'whatsapp'
  | 'icp'
  | 'sources'
  | 'debutantes'
  | 'venue_goals'
  | 'collaborators'
  | 'venues'
  | 'funnels'
  | 'master_dashboard';

export type FeatureFlagStatus = 'active' | 'coming_soon' | 'disabled';

export interface FeatureFlagConfig {
  id: FeatureFlagId;
  name: string;
  description: string;
  category: 'Comercial & CRM' | 'Atendimento' | 'Inteligência' | 'Administrativo';
  status: FeatureFlagStatus;
}

export type ThemeMode = 'dark' | 'light';

export const APP_VERSION = '1.2.0 (F5 System)';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  venueIds?: string[]; // IDs das casas que tem acesso (vazio ou master = todas)
  phone?: string;
  theme?: ThemeMode;
  isFirstAccess?: boolean;
  masterId?: string; // ID da conta Master proprietária (caso subordinado)
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: AdminRole; // 'master' | 'admin' | 'crm' | 'sdr' | 'closer'
  venueId: string; // 'all' ou ID principal da casa
  venueIds?: string[]; // IDs das múltiplas casas de festa atribuídas
  avatarUrl?: string;
  phone?: string;
  active: boolean;
  isFirstAccess?: boolean;
  password?: string;
  theme?: ThemeMode;
  masterId?: string; // ID da conta Master a que este colaborador está vinculado
  createdAt: string;
}

export interface Venue {
  id: string;
  masterId?: string; // ID do Master proprietário desta unidade
  name: string;
  tagline: string;
  logoUrl?: string;
  ballroomImageUrl: string;
  description: string;
  experienceText: string;
  address: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  yearsInBusiness: number;
  eventsCompleted: number;
  guestsDelighted: number;
  googleMapsEmbedUrl: string;
  googleMapsLink: string;
  wazeLink: string;
  defaultDressCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  fontFamily: string;
  welcomeVideoUrl?: string; // Vídeo vertical 9:16 padrão da casa
  welcomeVideoName?: string;
  createdAt: string;
  // Lead distribution config for this venue
  leadDistributionMode?: 'queue' | 'round_robin'; // 'queue' = SDRs puxam, 'round_robin' = automático
  leadDistributionSdrIds?: string[]; // IDs dos SDRs ativos na distribuição desta casa
  roundRobinNextIndex?: number; // Índice do próximo SDR na fila round robin
  goals?: VenueGoals; // Metas individuais da casa
}

export interface VenueGoals {
  revenueTarget: number;            // Meta de faturamento em R$ (ex: R$ 150.000)
  salesTarget: number;              // Meta de vendas/fechamentos (ex: 12)
  leadsTarget: number;              // Meta de leads captados (ex: 60)
  responseTimeTargetMinutes: number; // Meta de tempo de resposta em minutos (ex: 15 min)
  period: 'monthly' | 'quarterly' | 'yearly';
  deadlineDate?: string;
}

export interface CollaboratorTimeLog {
  collaboratorId: string;
  collaboratorName: string;
  date: string; // YYYY-MM-DD
  activeSeconds: number; // Segundos com a aba ativa e focada
  lastActiveTimestamp: number;
}

export type LeadSource = 
  | 'indicacao'      // Indicação da Debutante / App
  | 'instagram'      // Redes Sociais / Instagram Direct
  | 'trafego_pago'   // Anúncios Meta Ads / Google Ads
  | 'whatsapp'       // WhatsApp Direto
  | 'parceria'       // Parceiros / Cerimonialistas
  | 'evento_externo' // Evento / Feira
  | 'outro';

export interface LeadGoal {
  target: number;
  deadline: string; // YYYY-MM-DD
  title?: string;
}

export type CrmStage = 
  | 'new_lead'          // Novo Lead (Indicação enviada)
  | 'in_analysis'       // Em Análise / Contato Inicial
  | 'meeting_scheduled' // Reunião / Degustação Agendada
  | 'contract_signed'   // Venda Fechada / Contrato Assinado (Venda VIP)
  | 'lost';             // Perdido / Não Realizado

export interface LeadParticipant {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorRole: AdminRole;
  collaboratorAvatarUrl?: string;
  action: string; // e.g., 'sdr_assigned', 'closer_assigned', 'stage_changed', 'note_added', 'lead_validated'
  timestamp: string; // ISO String
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'call' | 'meeting' | 'tasting' | 'followup' | 'general';

export interface AdminTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  createdById: string;
  createdByName: string;
  assignedToIds: string[]; // multi-collaborator assignment
  leadId?: string; // CRM Lead connection
  leadName?: string;
  debutanteId?: string; // Debutante connection
  debutanteName?: string;
  venueId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface LeadTask {
  id: string;
  leadId: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority?: 'low' | 'medium' | 'high';
  assignedToId: string;
  assignedToName: string;
  assignedToAvatarUrl?: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt: string;
  completedAt?: string;
  createdByName: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  timestamp: string; // ISO String
  type: 'status_change' | 'note' | 'contact' | 'creation' | 'deal_closed' | 'assignment' | 'task_created' | 'task_completed' | 'validation';
  title: string;
  text?: string;
  authorName: string;
  authorId?: string;
  authorAvatarUrl?: string;
}

export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type LeadEventType = '15 Anos' | 'Casamento' | 'Infantil' | 'Formatura' | 'Corporativo' | 'Outro';
export type LeadContactRole = 
  | 'aniversariante' 
  | 'debutante' 
  | 'mae' 
  | 'pai' 
  | 'tio' 
  | 'noivo' 
  | 'responsavel' 
  | 'outro'
  | string;

export interface LeadContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  neighborhood?: string;
  role: LeadContactRole;
  roleCustomName?: string;
  isPrimaryDecisionMaker?: boolean;
}

export interface FunnelStageConfig {
  id: string;
  name: string;
  color?: string;
  isFixed?: boolean;  // 'new_lead' (inicial), 'deal_closed' (ganho) e 'lost' (perdido) são fixos
  isWon?: boolean;    // Estágio de Sucesso/Ganho
  isLoss?: boolean;   // Estágio de Perda
  order?: number;
}

export type FunnelFieldType = 'text' | 'date' | 'number' | 'todo' | 'select';

export interface FunnelCustomField {
  id: string;
  label: string;
  type: FunnelFieldType;
  options?: string[]; // Para campos tipo 'select'
  required?: boolean;
  placeholder?: string;
  order?: number;
}

export type LeadMqlLevel = 'top' | 'qualified' | 'cold';

export type MqlOptionSituation = 'ideal' | 'good' | 'medium' | 'bad';

export const ICP_SITUATION_CONFIG: Record<MqlOptionSituation, { label: string; points: number; color: string; bg: string; border: string; icon: string }> = {
  ideal: { label: 'Ideal', points: 100, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', icon: '🟢' },
  good: { label: 'Bom', points: 70, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', icon: '🔵' },
  medium: { label: 'Médio', points: 40, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', icon: '🟡' },
  bad: { label: 'Ruim', points: 0, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', icon: '🔴' },
};

export interface MqlOption {
  id: string;
  label: string;
  points: number; // 100, 70, 40, 0
  situation?: MqlOptionSituation;
}

export interface MqlQuestion {
  id: string;
  venueId: string;
  title: string;
  description?: string;
  options: MqlOption[];
  weight?: number;
  order?: number;
}

export interface Lead {
  id: string;
  masterId?: string;     // ID da conta Master proprietária deste lead
  code?: string;         // Código Único do Lead no formato LEAD-XXXXXX
  debutanteId: string;
  debutanteName: string;
  debutanteSlug: string;
  venueId: string;
  funnelId?: string;     // Funil comercial ao qual o lead pertence
  sourceId?: string;     // ID da Origem vinculada (Módulo de Origens)
  sourceName?: string;   // Nome amigável da Origem (ex: "WhatsApp Principal", "Formulário Site")
  subSource?: string;    // Nome da Sub-origem (ex: "Instagram", "Google Ads", "Bio")
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;       // Origem do Lead (Indicação, Instagram, Tráfego Pago, WhatsApp, etc)
  responseTimeMinutes?: number; // Tempo de resposta do atendimento em minutos
  neighborhood?: string; // Bairro
  address?: string;      // Endereço completo

  // Contatos Vinculados & Decisor
  contacts?: LeadContact[];
  primaryContactRole?: LeadContactRole;

  // Dados do Evento
  eventType?: LeadEventType;      // Padrão '15 Anos' para indicação
  eventDate?: string;             // Data do evento
  debutanteBirthDate?: string;    // Data de aniversário da debutante
  estimatedGuests?: number;       // Quantidade estimada de convidados
  desiredPeriod?: string;         // Data desejada / período (caso sem data exata)

  // Dados Comerciais & Qualificação
  interestService?: string;       // Qual espaço/pacote/serviço despertou interesse
  estimatedBudget?: number;       // Investimento / orçamento
  paymentMethod?: string;         // Forma de pagamento
  temperature?: LeadTemperature;  // 'hot' (🔥 Quente) | 'warm' (🟡 Morno) | 'cold' (🔵 Frio)
  tags?: string[];                // Tags específicas do funil

  // Qualificação MQL (Marketing Qualified Lead)
  mqlScore?: number;               // Porcentagem calculada (0 a 100%)
  mqlLevel?: LeadMqlLevel;         // 'top' (🟢 Top) | 'qualified' (🟡 Qualificado) | 'cold' (🔴 Frio)
  mqlAnswers?: Record<string, string>; // questionId -> optionId

  // Campos Customizados definidos pelo Funil
  customFieldValues?: Record<string, any>;

  age: number;
  group: string;
  notes?: string;
  stage: CrmStage;
  isValidated: boolean;  // Se true, indicação é válida e concedeu +1 ponto para a debutante
  pointsGranted: number; // 1 se válida, 0 se não
  rejectionReason?: string;

  // Responsabilidade dupla SDR + Closer (Obrigatórios)
  sdrId?: string;        // ID do SDR responsável pela captação/qualificação
  sdrName?: string;      // Nome do SDR
  closerId?: string;     // ID do Closer responsável pela venda
  closerName?: string;   // Nome do Closer

  // Campo legado mantido para compatibilidade (agora reflete o SDR)
  assignedTo?: string;   // Nome do responsável principal (SDR ou quem abriu o lead)

  dealValue?: number;    // Valor da venda em R$ (obrigatório ao fechar contrato)
  packageSold?: string;  // Pacote ou descrição do serviço contratado
  contractDate?: string; // Data em que a venda foi fechada

  // Histórico inteligente de participação
  participants: LeadParticipant[];

  // Tarefas vinculadas ao lead
  tasks: LeadTask[];

  partyDate?: string;   // Data prevista para a festa de 15 anos do lead
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface CommercialFunnel {
  id: string;
  masterId?: string; // ID do Master proprietário deste funil
  name: string;
  category: string;
  description?: string;
  venueId: string; // ID específico da casa
  allowedCollaboratorIds?: string[]; // IDs dos colaboradores permitidos (vazio = todos)
  badge?: string;
  badgeColor?: string;
  icon?: string;
  customImageUrl?: string; // Foto ou imagem customizada do funil (400x400)
  isPinned?: boolean; // Se o funil está fixado na Sidebar
  stagesCount?: number;
  stages?: FunnelStageConfig[]; // Etapas customizadas do funil
  customFields?: FunnelCustomField[]; // Campos extras personalizados para os leads deste funil
  isPrimary?: boolean;
  isDemo?: boolean;
  createdAt?: string;
}

export interface BenefitCatalogItem {
  id: string;
  venueId?: string;       // Vinculado a uma casa específica ou 'all'
  name: string;
  description: string;
  pointsRequired: number;
  cardImageUrl: string;   // Imagem 1: Mockup / Fundo Transparente para exibição na jornada
  detailImageUrl: string; // Imagem 2: Foto Banner / Modal para exibição nos detalhes do benefício conquistado
  category: 'festa' | 'convidados' | 'entretenimento' | 'gastronomia' | 'vip';
  defaultValue?: number;
  estimatedValue?: number; // Valor estimado financeiro em R$
  createdAt?: string;
}

export interface VipRewardCatalogItem {
  id: string;
  venueId?: string;       // Vinculado a uma casa específica ou 'all'
  name: string;
  description: string;
  salesRequired: number;
  cardImageUrl: string;   // Imagem 1: Mockup transparente
  detailImageUrl: string; // Imagem 2: Foto detalhada
  badgeTag?: string;
  estimatedValue?: number; // Valor estimado financeiro em R$
  createdAt?: string;
}

export interface JourneyTemplate {
  id: string;
  venueId?: string;       // Vinculado a uma casa específica ou 'all'
  name: string;
  description: string;
  seasonOrPeriod?: string; // ex: 'Padrão 2027', 'Especial Ouro - Janeiro'
  milestones: Milestone[];
  vipRewards: VipReward[];
  createdAt: string;
}

export interface DebutanteAccount {
  id: string;
  venueId: string;
  name: string;
  slug: string; // ex: 'maria-eduarda-2027' -> link exclusivo ?debutante=maria-eduarda-2027
  status?: 'active' | 'inactive'; // Status ativo ou inativo
  partyDate: string; // YYYY-MM-DD
  partyDaysLeft: number;
  avatarUrl: string;
  phone: string;
  email?: string;
  motherName?: string;
  fatherName?: string;

  // Configuração de Módulos
  hasJourneyEnabled: boolean; // Se true, tem Jornada, Indicações, Benefícios e botão Indicar Amiga. Se false, apenas Convidados e Compromissos.
  isJourneyPending?: boolean; // Se true, jornada foi ativada mas ainda está pendente de vinculação
  welcomeVideoUrl?: string; // Vídeo vertical customizado para o primeiro acesso
  hasSeenWelcomeVideo?: boolean; // Se já assistiu a introdução no primeiro login
  journeyTemplateId?: string; // Modelo de jornada aplicado

  // Convites & Recepção
  customInvitePhotoUrl?: string;
  useCustomInvitePhoto?: boolean;
  receptionMessage?: string;

  // Limite de Convidados
  baseGuestLimit: number;
  extraGuestsUnlocked: number;
  currentGuestLimit: number;

  // Jornada & Presentes
  validReferrals: number;
  totalTargetReferrals: number;
  journeyProgressPercentage: number;
  convertedReferralSales: number;
  journeyCycle: JourneyCycleState;
  milestones: Milestone[];
  vipRewards: VipReward[];

  // Dados Relacionados
  guests: Guest[];
  referrals: Referral[];
  appointments: Appointment[];

  createdAt: string;
  updatedAt: string;
}

export interface AdminAppState {
  currentUser: AdminUser | null;
  collaborators: Collaborator[];
  venues: Venue[];
  debutantes: DebutanteAccount[];
  leads: Lead[];
  templates: JourneyTemplate[];
  benefitsCatalog: BenefitCatalogItem[];
  vipCatalog: VipRewardCatalogItem[];
  activeVenueId: string | null; // Filtro de casa ativa no painel (null = Todas)
  activeDebutanteId: string | null;
  theme: ThemeMode;
}
