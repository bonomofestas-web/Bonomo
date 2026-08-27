import type { 
  Milestone, 
  VipReward, 
  Guest, 
  Referral, 
  Appointment, 
  JourneyCycleState 
} from './index';

// All roles in the system (sdr/closer are operational roles under crm)
export type AdminRole = 'master' | 'admin' | 'crm' | 'sdr' | 'closer';

export type ThemeMode = 'dark' | 'light';

export const APP_VERSION = '1.0.1 (Beta)';

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
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  ballroomImageUrl: string;
  description: string;
  experienceText: string;
  address: string;
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

export interface Lead {
  id: string;
  debutanteId: string;
  debutanteName: string;
  debutanteSlug: string;
  venueId: string;
  name: string;
  phone: string;
  age: number;
  group: string;
  notes?: string;
  stage: CrmStage;
  isValidated: boolean;  // Se true, indicação é válida e concedeu +1 ponto para a debutante
  pointsGranted: number; // 1 se válida, 0 se não
  rejectionReason?: string;

  // Responsabilidade dupla SDR + Closer
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
