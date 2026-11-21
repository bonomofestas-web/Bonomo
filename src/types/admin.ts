import type {
  Milestone,
  VipReward,
  Guest,
  Referral,
  Appointment,
  JourneyCycleState
} from './index';

// All roles in the system (dev is the exclusive root developer super-role)
export type AdminRole =
  | 'dev'
  | 'master'
  | 'admin'
  | 'gerencia'
  | 'comercial'
  | 'crm'
  | 'sdr'
  | 'closer'
  | 'pos_venda'
  | 'financeiro';

export type ContractFillStage = 'pendente' | 'aguardando_assinatura' | 'juntando_documentos' | 'preenchido';

export type FeatureFlagId =
  | 'master_dashboard'
  | 'commercial_dashboard'
  | 'goals'
  | 'team_presence'
  | 'whatsapp_messaging'
  | 'chat_local_cache'
  | 'finance';

export type FeatureFlagStatus = 'active' | 'coming_soon' | 'disabled';

export interface FeatureFlagConfig {
  id: FeatureFlagId;
  name: string;
  description: string;
  category: 'Comercial & CRM' | 'Atendimento' | 'Inteligência' | 'Administrativo';
  status: FeatureFlagStatus;
  comingSoonMessage?: string;
}

export interface AnnouncementReadReceipt {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  readAt: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'feature' | 'maintenance' | 'general';
  mediaType: 'none' | 'image' | 'video';
  mediaUrl?: string;
  targetRoles: AdminRole[];
  targetAudience?: 'all' | 'masters' | 'custom';
  createdAt: string;
  authorId: string;
  readReceipts: AnnouncementReadReceipt[];
}

export type ThemeMode = 'dark' | 'light';

export const APP_VERSION = '1.2.0 (F5 System)';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isDev?: boolean; // Flag booleana que habilita acesso ao setor Desenvolvedor
  avatarUrl?: string;
  venueIds?: string[]; // IDs das casas que tem acesso (vazio ou master = todas)
  phone?: string;
  theme?: ThemeMode;
  isFirstAccess?: boolean;
  activatedAt?: string;
  lastLoginAt?: string;
  masterId?: string; // ID da conta Master proprietária (caso subordinado)
  sectors?: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing')[];
  primarySector?: 'comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing';
  permissions?: string[];
  pinnedFunnelIds?: string[];
  customJobTitle?: string; // Título / Cargo executivo personalizado
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: AdminRole; // 'master' | 'admin' | 'crm' | 'sdr' | 'closer'
  isDev?: boolean; // Flag de acesso ao setor de desenvolvedor
  venueId: string; // 'all' ou ID principal da casa
  venueIds?: string[]; // IDs das múltiplas casas de festa atribuídas
  avatarUrl?: string;
  phone?: string;
  active: boolean;
  isFirstAccess?: boolean;
  activatedAt?: string;
  lastLoginAt?: string;
  password?: string;
  customJobTitle?: string; // Cargo/Título executivo customizado (ex: 'Coordenador Geral', 'Líder Comercial')
  jobRoles?: string[]; // Cargos por setor ('comercial:sdr', 'comercial:closer', 'comercial:gerente', 'gerencia:gerente_geral'...). Acesso = sectors; cargo = jobRoles
  department?: 'diretoria' | 'gerencia' | 'comercial' | 'pos_venda' | 'financeiro' | 'marketing';
  sectors?: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing')[]; // Setores que o colaborador participa
  primarySector?: 'comercial' | 'pos_venda' | 'gerencia' | 'financeiro' | 'marketing'; // Setor prioritário de abertura
  permissions?: string[]; // Permissões e metadados persistidos no Supabase
  pinnedFunnelIds?: string[]; // IDs dos funis fixados no menu lateral pelo usuário
  theme?: ThemeMode;
  masterId?: string; // ID da conta Master a que este colaborador está vinculado
  goals?: CollaboratorGoals; // Meta individual
  createdAt: string;
}

export interface Venue {
  id: string;
  masterId?: string; // ID do Master proprietário desta unidade
  name: string;
  tagline: string;
  logoUrl?: string;
  bannerImageUrl?: string; // Foto panorâmica cover do banner da unidade (ERP)
  ballroomImageUrl: string; // Foto oficial da casa usada na seção de convites das debutantes
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
  /** Cor da casa nos calendarios (agenda de eventos, tarefas, compromissos, agendamentos) */
  calendarColor?: string;
  active?: boolean; // Status da unidade (ativa ou desativada/pausada)
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
  appointmentsTarget?: number;      // Meta de agendamentos (visitas + degustações)
  period: 'monthly' | 'quarterly' | 'yearly';
  deadlineDate?: string;
}

// Meta consolidada por papel (SDRs ou Closers) em uma unidade
export interface TeamGoals {
  id?: string;
  masterId: string;
  venueId: string;
  role: 'sdr' | 'closer';
  period: 'monthly' | 'quarterly' | 'yearly';
  month: number; // 1-12; 0 quando não mensal
  year: number;
  revenueTarget: number;
  appointmentsTarget: number;
  closingsTarget: number;
  responseTimeTargetMinutes: number;
}

// Meta individual do colaborador (collaborators.goals JSONB)
export interface CollaboratorGoals {
  revenueTarget?: number;
  leadsTarget?: number; // leads / agendamentos
  closingsTarget?: number;
  responseTimeTargetMinutes?: number;
  cycle: 'monthly' | 'weekly';
  validFrom?: string;  // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
}

export interface CollaboratorTimeLog {
  collaboratorId: string;
  collaboratorName: string;
  date: string; // YYYY-MM-DD
  activeSeconds: number; // Segundos com a aba ativa e focada
  lastActiveTimestamp: number;
}

export type LeadSource =
  | 'indicacao'        // Indicação da Debutante / App
  | 'instagram'        // Redes Sociais / Instagram Direct
  | 'trafego_pago'     // Anúncios Meta Ads / Google Ads
  | 'whatsapp'         // WhatsApp Direto
  | 'parceria'         // Parceiros / Cerimonialistas
  | 'evento_externo'   // Evento / Feira
  | 'cadastro_interno' // Cadastro Manual / CRM Interno
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

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'no_result' | 'no_show' | 'cancelled';
export type TaskPriority = 'none' | 'low' | 'normal' | 'medium' | 'high' | 'urgent';
export type TaskType = 'call' | 'meeting' | 'tasting' | 'followup' | 'document' | 'general';

export interface TaskDatabase {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  venueId?: string;
  isDefault: boolean;
  propertyOrder?: string[];
  createdAt?: string;
}

export interface TaskCustomStatus {
  id: string;
  databaseId: string;
  name: string;
  groupKey: 'todo' | 'in_progress' | 'completed'; // A fazer | Em andamento | Concluídos
  color: string;
  bgColor: string;
  orderIndex: number;
  isDefault?: boolean;
  createdAt?: string;
}

export interface TaskCustomType {
  id: string;
  name: string;
  sector?: string;
  icon?: string;
  color?: string;
  orderIndex?: number;
  createdAt?: string;
}

export type CustomPropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'location';

export interface TaskPropertyDefinition {
  id: string;
  databaseId: string;
  name: string;
  type: CustomPropertyType;
  options?: string[]; // for select / multi_select
  orderIndex: number;
  createdAt?: string;
}

export interface TaskComment {
  id: string;
  taskId?: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}

export interface AdminTask {
  id: string;
  databaseId?: string;
  title: string;
  description?: string;
  content?: string; // Bloco de Nota Inteligente - Document body
  icon?: string;
  coverUrl?: string;
  dueDate?: string; // YYYY-MM-DD (Opcional - data crua)
  dueTime?: string; // HH:mm
  endDate?: string; // YYYY-MM-DD (Data de término)
  endTime?: string; // HH:mm
  status: TaskStatus;
  customStatusId?: string;
  priority: TaskPriority;
  type: TaskType;
  customType?: string;
  createdById: string;
  createdByName: string;
  assignedToIds: string[]; // multi-collaborator assignment
  assignedToName?: string; // Nome legível do responsável principal
  leadId?: string; // CRM Lead direct connection
  leadName?: string;
  clientId?: string; // Post-sale client direct connection
  clientName?: string;
  debutanteId?: string; // Debutante connection
  debutanteName?: string;
  venueId?: string;
  masterId?: string;
  databaseSector?: string;
  isFollowUp?: boolean;
  customProperties?: Record<string, any>;
  comments?: TaskComment[];
  mandatoryFeedback?: string;
  observations?: string; // Anotações / Observações da tarefa no Bloco de Notas Inteligente
  resolution?: string; // Resultado / Resolução da tarefa (desfecho da ação)
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
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
  needsManualDownload?: boolean;
  channelId?: string;
  channelName?: string;
  instanceId?: string;
  messageId?: string;
  quotedMessage?: {
    id: string;
    messageId?: string;
    text: string;
    authorName?: string;
    sender?: string;
    mediaType?: string;
    type?: string;
    mediaUrl?: string;
    audioDuration?: string;
    fromMe?: boolean;
  };
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
  cpf?: string;
  address?: string;
  neighborhood?: string;
  birthday?: string;
  eventDate?: string;
  role: LeadContactRole;
  roleCustomName?: string;
  isPrimaryDecisionMaker?: boolean;
}

export interface PodiumTargetConfig {
  funnelId?: string; // 'all' ou ID do funil
  stageId?: string;  // 'all' ou ID da etapa
}

export interface PodiumConfig {
  sdr: PodiumTargetConfig;
  closer: PodiumTargetConfig;
}

export interface FunnelStageTrigger {
  id: string;
  type: 'move_to_funnel' | 'move_copy_to_funnel' | 'notify_closer' | 'assign_role' | 'send_whatsapp' | 'open_schedule' | 'create_post_sale_client';
  label: string;
  targetFunnelId?: string;
  targetStageId?: string;
  targetRoleId?: string;
  description?: string;
  whatsappTemplate?: string;
  scheduleType?: 'visit' | 'tasting' | 'any'; // Tipo de agendamento automático ao entrar na etapa (Visita Comercial ou Degustação)
}

export interface FunnelStageConfig {
  id: string;
  name: string;
  color?: string;
  icon?: string;      // Ícone representativo da etapa (ex: 'calendar', 'phone', 'clock', etc.)
  isMeetingStage?: boolean; // Etapa de Agendamento / Reunião (habilita atribuição e atuação de Closer)
  isFixed?: boolean;  // 'new_lead' (inicial), 'deal_closed' (ganho) e 'lost' (perdido) são fixos
  isWon?: boolean;    // Estágio de Sucesso/Ganho
  isLoss?: boolean;   // Estágio de Perda
  order?: number;
  hints?: string;     // Dicas de negociação da etapa (estilo Como CRM)
  triggers?: FunnelStageTrigger[]; // Gatilhos de automação da etapa
  allowedCollaboratorIds?: string[]; // IDs de colaboradores autorizados a visualizar esta etapa (se vazio, todos veem)
  visibility?: StageVisibility; // Quem enxerga a etapa (padrao: 'all'). Lista especifica em allowedCollaboratorIds tem precedencia
  responsibility?: StageResponsibility; // De quem e o lead nesta etapa (padrao: 'both' = responsabilidade mutua)
}

export type StageVisibility = 'all' | 'sdr' | 'closer' | 'specific';
export type StageResponsibility = 'sdr' | 'closer' | 'both';

export type FunnelCustomFieldSection = 'commercial' | 'contact' | 'event' | 'priority' | 'party_data' | 'contractor' | 'custom';
export type FunnelFieldType = 'text' | 'date' | 'number' | 'todo' | 'select' | 'multi_select';

export interface FunnelCustomField {
  id: string;
  label: string;
  type: FunnelFieldType;
  section?: FunnelCustomFieldSection; // 'priority' (Prioritárias), 'party_data' (Dados da Festa), 'contractor' (Contratante & Aniversariante), 'custom' (Personalizada)
  customSectionName?: string; // Nome customizado se section === 'custom'
  options?: string[]; // Para campos tipo 'select' ou 'multi_select'
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

export type DuplicateResolutionAction =
  | 'keep_oldest'
  | 'keep_newest'
  | 'merge_keep_oldest'
  | 'merge_keep_newest'
  | 'delete_current';

export interface FunnelDuplicateRuleConfig {
  matchPhone: boolean;
  matchEmail: boolean;
  matchName: boolean;
  action: 'keep_recent' | 'keep_both' | 'keep_oldest_update' | 'keep_oldest' | 'keep_newest' | 'merge_keep_oldest' | 'merge_keep_newest' | 'merge_keep_recent' | 'manual';
  autoResolve?: boolean;
}

export interface MqlOption {
  id: string;
  label: string;
  points: number; // 100, 70, 40, 0
  situation?: MqlOptionSituation;
}

/** Copia congelada do MQL no momento em que o lead foi respondido (editar/apagar o MQL nao altera o lead). */
export interface MqlSnapshotQuestion {
  id: string;
  title: string;
  description?: string;
  options: MqlOption[];
}

export interface MqlSnapshot {
  profileId?: string;
  profileName?: string;
  capturedAt: string; // ISO
  questions: MqlSnapshotQuestion[];
}

/** Perfil de qualificacao: nome, autor, data e funis vinculados (1 funil = 1 perfil). */
export interface MqlProfile {
  id: string;
  masterId: string;
  name: string;
  isActive: boolean;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  funnelIds: string[];
}

export interface MqlQuestion {
  id: string;
  profileId?: string; // perfil de qualificacao dono da pergunta
  masterId?: string;
  venueId?: string;
  venueIds?: string[]; // IDs de múltiplas casas de festa vinculadas (legado)
  funnelId?: string; // ID do funil vinculado
  funnelIds?: string[]; // IDs dos funis vinculados a este perfil de qualificação
  profileName?: string; // Nome do perfil ICP (ex: "Qualificação Comercial Padrão")
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
  commercialCode?: string; // Código alfanumérico Base36 exclusivo (LEAD-XXXXXXXX)
  contactId?: string;    // ID do Contato Central vinculado (tabela contacts)
  customFieldsData?: Record<string, any>; // Campos comerciais dinâmicos herdados do funil
  debutanteId: string;
  debutanteName: string;
  debutanteSlug: string;
  venueId: string;
  venueName?: string;    // Nome histórico da Casa de Festas de origem (preservado mesmo se excluída)
  funnelId?: string;     // Funil comercial ao qual o lead pertence
  sourceId?: string;     // ID da Origem vinculada (Módulo de Origens)
  sourceName?: string;   // Nome amigável da Origem (ex: "WhatsApp Principal", "Formulário Site")
  subSource?: string;    // Nome da Sub-origem (ex: "Instagram", "Google Ads", "Bio")
  name: string;
  phone: string;
  whatsappJid?: string;      // Identificador JID do WhatsApp (ex: 5521999999999@s.whatsapp.net)
  whatsappLid?: string;      // Identificador LID multi-dispositivo (ex: 152063344606275@lid ou 152063344606275)
  email?: string;
  avatarUrl?: string;        // URL da foto de perfil sincronizada com R2 / WhatsApp
  cpf?: string;              // CPF do lead / decisor
  birthday?: string;         // Data de nascimento / aniversário do aniversariante
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
  eventYear?: number | string;    // Ano do evento (ex: 2026, 2027)
  debutanteBirthDate?: string;    // Data de aniversário da debutante
  estimatedGuests?: number;       // Quantidade estimada de convidados
  desiredPeriod?: string;         // Data desejada / período (caso sem data exata)
  urgencyLevel?: 'baixa' | 'media' | 'alta' | 'imediata' | 'urgente'; // Nível de urgência

  // Dados Comerciais & Qualificação
  interestService?: string;       // Qual espaço/pacote/serviço despertou interesse
  estimatedBudget?: number;       // Investimento / orçamento
  paymentMethod?: string;         // Forma de pagamento
  downPayment?: number;           // Valor de entrada R$
  installments?: number;          // Quantidade de parcelas
  installmentValue?: number;      // Valor de cada parcela R$
  hasCreditCard?: boolean;        // Cartão de crédito (sim/não)
  profession?: string;            // Profissão do cliente
  decisionMakers?: string;        // Decisores da compra
  temperature?: LeadTemperature;  // 'hot' (🔥 Quente) | 'warm' (🟡 Morno) | 'cold' (🔵 Frio) | undefined (Sem temperatura)
  tags?: string[];                // Tags específicas do funil

  // Qualificação MQL (Marketing Qualified Lead)
  mqlScore?: number;               // Porcentagem calculada (0 a 100%)
  mqlLevel?: LeadMqlLevel;         // 'top' (🟢 Top) | 'qualified' (🟡 Qualificado) | 'cold' (🔴 Frio)
  mqlAnswers?: Record<string, string>; // questionId -> optionId
  mqlSnapshot?: MqlSnapshot;       // MQL da epoca em que o lead foi respondido (imutavel por edicao do MQL)

  // Campos Customizados definidos pelo Funil
  customFieldValues?: Record<string, any>;

  // Unread messages
  unreadCount?: number;

  age: number;
  group: string;
  notes?: string;
  stage: CrmStage;
  isValidated: boolean;  // Se true, indicação é válida e concedeu +1 ponto para a debutante
  pointsGranted: number; // 1 se válida, 0 se não
  rejectionReason?: string;
  lossReason?: string;        // Motivo pelo qual o lead foi perdido
  archiveReason?: string;     // Motivo do arquivamento do lead

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

  // Compromissos Comerciais Exclusivos (Máximo 1 de cada por lead, eterno)
  visitCommitment?: CommercialCommitment;
  tastingCommitment?: CommercialCommitment;

  partyDate?: string;   // Data prevista para a festa de 15 anos do lead
  funnelEnteredAt?: string; // Data exata em que o lead entrou no funil
  secondaryFunnelIds?: string[]; // IDs dos funis secundários onde o lead também é exibido simultaneamente
  isRemovedFromFunnel?: boolean; // Se true, o lead foi removido da esteira (mas mantido no banco)
  removalReason?: string; // Motivo da remoção (ex: spam, telemarketing, engano)
  removedAt?: string; // Data/hora da remoção
  removedBy?: string; // Nome do autor da remoção
  activities: LeadActivity[];
  createdBy?: string;         // ID do usuário/colaborador que realizou o cadastro manual
  createdByName?: string;     // Nome legível do autor do cadastro manual
  createdByAvatar?: string;   // Foto/avatar do autor do cadastro manual
  isClient?: boolean;         // Flag que indica se o registro se origina do módulo de clientes (Pós-Venda)
  isArchived?: boolean;       // Lead arquivado (desanexado de funil ativo sem disparar alerta de 'Sem Funil')
  archivedAt?: string;        // Data em que o lead foi arquivado
  lastInteractionAt?: string; // Timestamp ISO da última interação / mensagem enviada ou recebida
  lastMessageDirection?: 'incoming' | 'outgoing'; // Direção da última mensagem
  lastMessageText?: string;   // Prévia persistida da última mensagem de chat (lista lateral do WhatsApp, sem baixar histórico)
  lastMessageAt?: string;     // Timestamp ISO da última mensagem de chat
  createdAt: string;
  updatedAt: string;
}

export interface DeletedLeadRecord {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  venueId?: string;
  venueName?: string;
  masterId?: string;
  deletedAt: string;
  deletedBy: string;
  reason: string;
}

// ── Compromissos Comerciais & Motor de Agenda (F5 System) ───────────────────
export type CommercialCommitmentType = 'visit' | 'tasting';
export type CommercialCommitmentStatus = 
  | 'not_scheduled' 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'rescheduled' 
  | 'reschedule_target';

export interface SystemSlaConfig {
  idealMinutes: number;       // Padrão: 15 (Lead aguardando dentro do tempo ideal -> Azul Claro)
  warningMinutes: number;     // Padrão: 60 (Preocupante -> Amarelo)
  criticalMinutes: number;    // Padrão: 120 (Alarmante -> Vermelho)
}

export interface CommercialCommitment {
  id?: string;
  scheduled?: boolean;
  type: CommercialCommitmentType;
  date?: string;           // YYYY-MM-DD
  time?: string;           // HH:mm
  durationMinutes?: number;// Duração estimada em minutos
  pax: number;             // Total de pessoas contando com o lead (PAX)
  status: CommercialCommitmentStatus;
  scheduledAt?: string;    // Data ISO do agendamento
  completedAt?: string;    // Data ISO da conclusão
  cancelledAt?: string;
  responsibleId?: string;  // SDR ou Closer responsável
  responsibleCollaboratorId?: string;
  responsibleName?: string;
  appointmentId?: string;  // Vínculo com o agendamento no calendário unificado
  notes?: string;
  venueId?: string;
  createdAt?: string;
}

export interface AgendaDaySchedule {
  dayOfWeek: number;            // 0=Domingo, 1=Segunda, ..., 6=Sábado
  enabled: boolean;
  startTime: string;            // '09:00'
  endTime: string;              // '18:00'
  slotDurationMinutes: number;  // 60, 45, 30...
  timeSlots?: string[];         // Horários calculados ou manuais
  maxConcurrentPerSlot?: number;
  maxPaxPerSlot?: number;
}

export interface AgendaBlockDayConfig {
  enabled: boolean;
  isConfigured: boolean;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxConcurrentPerSlot: number;
  maxPaxPerSlot: number;
  timeSlots?: string[];
}

export interface AgendaBlockRule {
  dateSchedules?: Record<string, AgendaBlockDayConfig>;
  id: string;
  startDate: string;            // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD
  title?: string;
  type: 'visits' | 'tastings' | 'both';
  daySchedules?: Record<number, AgendaDaySchedule>;
  enabledDays?: number[];
  timeSlots?: string[];
  durationMinutes?: number;
  maxConcurrentPerSlot?: number;
  maxPaxPerSlot?: number;
  createdAt?: string;           // ISO 8601
  updatedAt?: string;           // ISO 8601
}

export interface AgendaRecurringRule {
  enabled?: boolean;            // Se false, a regra recorrente semanal está desativada
  isFreeMode?: boolean;         // Modo Livre: libera agendamento em qualquer horário e desativa a regra semanal fixa            // Se false, a regra recorrente semanal está desativada
  enabledDays: number[];        // 0=Domingo, 1=Segunda, ..., 6=Sábado
  timeSlots: string[];          // ['10:00', '14:00', '16:00', '18:00']
  durationMinutes: number;      // Duração de cada compromisso (ex: 45 min)
  maxConcurrentPerSlot: number; // Capacidade de agendamentos por slot (ex: 3)
  maxPaxPerSlot?: number;       // Limite de PAX por slot (ex: 20)
  daySchedules?: Record<number, AgendaDaySchedule>; // Horários específicos por dia da semana
}

export interface AgendaDateOverride {
  date: string;                 // YYYY-MM-DD
  isBlocked: boolean;           // Se true, o dia inteiro está bloqueado
  reason?: string;              // 'Feriado', 'Manutenção', 'Evento Privado'
  customSlots?: string[];       // Horários específicos que substituem a regra naquele dia
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  maxConcurrentPerSlot?: number;
  maxPaxPerSlot?: number;
  createdAt?: string;           // ISO 8601
  updatedAt?: string;           // ISO 8601
}

export interface VenueAgendaConfig {
  id?: string;
  venueId: string;              // ID da Casa de Festa ou 'all'
  isFreeMode?: boolean;         // Modo Livre geral para a unidade
  visitsRule: AgendaRecurringRule;
  tastingsRule: AgendaRecurringRule;
  blockRules?: AgendaBlockRule[]; // Configurações por período com precedência
  dateOverrides: AgendaDateOverride[];
  closerDistributionMode?: 'manual' | 'round_robin'; // Modo de divisão de Closers
  closerIds?: string[];         // Ordem/pesos de Closers para rodízio de agendamento
  closerNextIndex?: number;     // Ponteiro atômico do próximo closer da lista ordenada
  closerAutoNotify?: boolean;   // Disparo automático de notificação / WhatsApp para o closer selecionado
  updatedAt?: string;
}

// ── Entidade Cliente & Pós-Venda (F5 System) ──────────────────────────────────
export interface ClientDocument {
  id: string;
  clientId?: string;
  title: string;
  name?: string;
  type: 'contract' | 'amendment' | 'receipt' | 'id_document' | 'other';
  fileUrl: string;
  url?: string;
  uploadedAt: string;
  fileSize?: string;
  sizeBytes?: number;
}

export interface ClientUpsellSale {
  id: string;
  clientId: string;
  venueId?: string;
  title: string;
  category: 'foto_video' | 'decoracao' | 'atracoes' | 'bar_bebidas' | 'estrutura' | 'alimentacao' | 'outro' | string;
  value: number;
  saleDate: string;
  saleTime?: string;          // HH:mm da venda
  soldAt?: string;            // ISO timestamp completo da venda
  paymentMethod?: string;
  paymentType?: 'a_vista' | 'parcelado' | 'sinal';
  installmentsCount?: number;
  paymentStatus?: 'pago' | 'pendente' | 'parcelado';
  responsibleId?: string;
  responsibleName?: string;
  notes?: string;
  createdAt?: string;
}

export interface ClientActivity {
  id: string;
  clientId?: string;
  timestamp?: string;
  type: 'status_change' | 'note' | 'document_uploaded' | 'meeting' | 'debutante_linked' | 'contact' | 'creation' | 'assignment' | 'task_created' | 'task_completed' | 'upsell_added' | 'upsell_removed';
  title?: string;
  text?: string;
  description: string;
  authorName?: string;
  createdAt: string;
  createdBy: string;
  channelId?: string;
  channelName?: string;
  instanceId?: string;
}

export type ClientStage =
  | 'new_lead'         // Entrada do Cliente (Caixa de Entrada Pós-Venda)
  | 'entry'            // Entrada (alias)
  | 'onboarding'       // Boas-vindas & Onboarding
  | 'planning'         // Planejamento & Cronograma
  | 'suppliers'        // Definição de Fornecedores / Degustação
  | 'final_alignment'  // Alinhamento Final (Reta Final)
  | 'party_day'        // Semana da Festa / Dia do Evento
  | 'completed'        // Pós-Festa Realizada
  | 'lost'             // Contrato Cancelado / Perdido
  | 'archived';        // Arquivado

export interface Client {
  masterId?: string;
  profession?: string;
  id: string;
  code: string;                          // ex: 'CLI-8W3K9P'
  name: string;                          // Nome da Aniversariante / Homenageada (ex: Fernanda)
  avatarUrl?: string;                    // URL da foto de perfil / WhatsApp
  honoreeName?: string;                  // Nome da Aniversariante (compatibilidade)
  honoreeBirthDate?: string;
  honoreeAge?: number;

  payerName: string;                     // Nome do Decisor/Contratante (ex: Roberto Carlos - Pai)
  payerRelationship?: 'father' | 'mother' | 'guardian' | 'self' | 'other';
  payerRole?: string;
  payerCpf?: string;
  payerPhone: string;
  payerEmail?: string;
  payerAddress?: string;
  payerNeighborhood?: string;
  payerCity?: string;

  birthdayPersonName: string;            // Nome da Aniversariante
  birthdayPersonAge?: number;            // Idade que vai fazer (ex: 15)
  birthdayPersonBirthdate?: string;

  eventType: string;                     // '15_anos' | '15 Anos' | 'casamento' | 'infantil' | 'corporativo' | 'outro'
  eventDate: string;                     // Data da festa (YYYY-MM-DD)
  partyDate?: string;
  eventTime?: string;                    // Horário (ex: 19:00 às 00:00)
  guestCount: number;                    // Quantidade de convidados
  estimatedGuests?: number;
  venueId: string;                       // Casa de festas contratada
  venueName: string;

  packageSold: string;                   // Pacote fechado (ex: Pacote Imperial Ouro)
  contractTitle?: string;                // Título persistido do contrato ex: 'Roberto Carlos – Manuella 15 Anos'
  contractFileUrl?: string;              // Arquivo do contrato assinado
  paymentFileUrl?: string;               // Comprovante de entrada / sinal
  dealValue: number;                     // Valor total do contrato (R$)
  baseContractValue?: number;            // Valor base original do contrato
  contractDate: string;                  // Data de fechamento do contrato
  contractStatus?: 'aguardando_sinal' | 'sinal_pago' | 'contrato_enviado' | 'contrato_assinado'; // Status contratual no Pós-Venda
  contractSignedAt?: string | null;      // Data em que o contrato foi assinado (definida pelo Pós-Venda)
  signalPaid?: boolean;                  // Se o sinal da entrada foi pago
  signalValue?: number;                  // Valor do sinal pago
  contractDownPayment?: number;          // Valor de Entrada / Sinal contratual
  contractInstallmentsRemaining?: number;// Valor restante parcelado do contrato
  contractInstallmentsCount?: number;    // Quantidade de parcelas do saldo restante
  hasCreditCard?: boolean;               // Se o cliente possui cartão de crédito (Sim / Não)
  birthdayPersonPhone?: string;          // Telefone direto da aniversariante
  eventYear?: number | string;           // Ano previsto da festa
  signalPaidAt?: string | null;          // Data do pagamento do sinal
  paymentTerms?: string;                 // Condições de pagamento (Entrada, parcelas, etc.)
  paymentStatus?: 'up_to_date' | 'pending' | 'overdue' | 'paid_in_full';

  funnelId?: string;                     // ID do Funil de Pós-Venda em que o cliente está alocado
  stage: ClientStage | string;           // Etapa no Funil de Pós-Venda
  contacts?: LeadContact[];              // Subcontatos e decisores vinculados
  assignedTo?: string;
  assignedToId?: string;
  assignedSuccessManagerId?: string;     // Responsável de Pós-Venda
  assignedSuccessManagerName?: string;

  debutanteId?: string | null;           // ID da conta do App de Convidados (/app/:slug)
  debutanteSlug?: string | null;         // Slug da Debutante no App

  commercialLeadId?: string;             // ID do lead comercial original (duplicado)
  commercialLeadCode?: string;           // Código do lead comercial original (ex: LEAD-7K9F2A)
  originalLeadId?: string;
  originalLeadCode?: string;
  commercialHistory?: {
    origin?: string;
    source?: string;
    closedBy?: string;
    sdrName?: string;
    closerName?: string;
    closedAt?: string;
    convertedAt?: string;
    originalNotes?: string;
    closerReport?: string;
    notesSummary?: string[];
  };

  notes?: string;
  documents?: ClientDocument[];
  activities: ClientActivity[];
  upsellSales?: ClientUpsellSale[];
  tags?: string[];
  funnelEnteredAt?: string; // Data de entrada do cliente no funil de pós-venda
  createdAt: string;
  updatedAt: string;
}


export interface PostSaleChannelConfig {
  id: string; // ex: 'decoracao', 'pos_venda_sucesso', 'producao'
  name: string; // Nome exibido na aba, ex: 'Decoração', 'Sucesso do Cliente'
  icon?: string; // Nome do ícone Lucide
  color?: string; // Cor temática da aba (hex)
  instanceId?: string; // Instância exclusiva de WhatsApp vinculada
  instanceName?: string; // Nome descritivo da instância
  instancePhone?: string; // Telefone formatado da instância
  allowedCollaboratorIds: string[]; // Colaboradores autorizados
  isGeneral?: boolean; // Se é a aba geral padrão
  createdAt?: string;
}

export interface CommercialFunnel {
  id: string;
  masterId?: string; // ID do Master proprietário deste funil
  name: string;
  category: string;
  description?: string;
  venueId: string; // ID específico da casa/unidade
  sharedVenueIds?: string[]; // IDs de unidades adicionais que compartilham este funil
  disabledVenueIds?: string[]; // IDs de unidades desativadas manualmente de visualizar este funil
  allowedCollaboratorIds?: string[]; // IDs dos colaboradores permitidos (vazio = todos)
  allowedRoles?: AdminRole[]; // Cargos que podem interagir neste funil
  isPostSale?: boolean; // Se é um funil com objetivo de Pós-Venda
  isWonStageEnabled?: boolean; // Se a etapa de Ganho está ativada neste funil (padrão: true)
  isEntryStageActive?: boolean; // Etapa de leads de entrada ativada (estilo Como CRM)
  enableInboxStage?: boolean; // Etapa de Caixa de Entrada ativada
  postSaleChannels?: PostSaleChannelConfig[]; // Canais setoriais de WhatsApp (Comercial e Pós-Venda)
  hideGeneralChannel?: boolean; // Se a aba [Geral] padrão está desabilitada/oculta neste funil
  postSaleCustomStageNames?: {
    entry?: string;
    won?: string;
    lost?: string;
  }; // Customização de nomes das etapas fixas no Pós-Venda
  detectDuplicates?: boolean; // Detectar leads duplicados
  duplicateRules?: string; // Regras de duplicidade (legado)
  duplicateRuleConfig?: FunnelDuplicateRuleConfig; // Configurações detalhadas de regras de duplicidade
  phoneWidgetEnabled?: boolean;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  customImageUrl?: string; // Foto ou imagem customizada do funil (400x400)
  isPinned?: boolean; // Se o funil está fixado na Sidebar
  pinnedAt?: string; // Data/hora de fixação para preservar a ordem cronológica de fixação
  order?: number; // Ordem personalizada de exibição do funil
  stagesCount?: number;
  stages?: FunnelStageConfig[]; // Etapas customizadas do funil
  customFields?: FunnelCustomField[]; // Campos extras personalizados para os leads deste funil
  hiddenFieldKeys?: string[]; // Chaves de campos nativos ou extras que foram ocultados neste funil (ex: 'temperature', 'hasCreditCard')
  packageOptions?: string[]; // Lista de pacotes de venda deste funil (legado)
  paymentOptions?: string[]; // Lista de condições/formatos de pagamento deste funil (legado)
  predefinedTags?: string[]; // Tags pré-configuradas e recomendadas para leads deste funil
  allowCollaboratorsCreateTags?: boolean; // Se colaboradores podem criar novas tags no lead ou apenas selecionar predefinidas
  distributionMode?: 'manual' | 'round_robin'; // Modo de distribuição dos novos leads (manual ou roleta)
  assignedSdrIds?: string[]; // IDs dos SDRs que participam da distribuição automática deste funil
  teamMemberIds?: string[]; // Colaboradores que atuam assiduamente neste funil (SDRs e Closers visíveis no funil)
  closerIds?: string[]; // Closers habilitados para receber agendamentos/fechamentos neste funil
  sendDisabledSourceIds?: string[]; // Instancias WhatsApp desabilitadas para ENVIO neste funil (continuam recebendo)
  roundRobinNextIndex?: number; // Índice do próximo SDR na roleta
  defaultWhatsAppSourceId?: string; // ID da origem WhatsApp padrão legada
  priorityWhatsappPerVenue?: Record<string, string>; // Mapeamento: venueId -> sourceId de WhatsApp prioritário por unidade
  venueDistributionConfig?: Record<string, {
    distributionMode?: 'manual' | 'round_robin' | 'inherit';
    assignedSdrIds?: string[];
    roundRobinNextIndex?: number;
    priorityWhatsappSourceId?: string;
  }>; // Configuração individual de roleta e WhatsApp por Casa de Festa
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

export type EventType =
  | 'debutante_15'
  | 'birthday_kids'
  | 'birthday_adult'
  | 'baby_shower'
  | 'wedding_anniversary'
  | 'graduation'
  | 'corporate'
  | 'other';

export type VenueEventStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface VenueEvent {
  id: string;
  masterId?: string;
  venueId: string;
  venueName?: string;
  clientId?: string | null;
  clientName?: string;
  title: string;
  eventType?: string;
  eventDate: string;          // YYYY-MM-DD
  startTime?: string;         // HH:mm
  endTime?: string;           // HH:mm
  guestCount?: number;
  status: VenueEventStatus;
  blocksVenueDay: boolean;    // Trava automaticamente o dia da unidade na agenda comercial/visitas
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventScheduleStatus =
  | 'pre_reserva'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';

export type EventShift = 'manha' | 'tarde' | 'noite' | 'dia_inteiro';

export interface EventSchedule {
  id: string;
  masterId: string;
  venueId: string;
  venueName?: string;
  contractId: string;               // Vínculo obrigatório com o Contrato
  contactId: string;                // Vínculo obrigatório com o Contato principal
  contractCode?: string;
  contactName?: string;
  contactPhone?: string;
  title: string;
  eventType?: string;
  eventDate: string;                // YYYY-MM-DD
  shift: EventShift;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  status: EventScheduleStatus;
  blocksVenueDay?: boolean;
  notes?: string;
  contract?: Contract;
  contact?: Contact;
  venue?: Venue;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  contractsCount: number;
  averageTicket: number;
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    revenue: number;
    contractsCount: number;
  }>;
}

export interface FunnelStageConversion {
  stageId: string;
  stageName: string;
  leadsCount: number;
  conversionToNext: number;
  dropoffRate: number;
  uniqueLeadsCount?: number;
}

export interface FunnelConversionMetrics {
  funnelId?: string;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  overallConversionRate: number;
  stages: FunnelStageConversion[];
  summary?: {
    totalLeads: number;
    qualifiedLeads: number;
    scheduledAppointments: number;
    completedAppointments: number;
    proposals: number;
    signedContracts: number;
  };
}

export interface GoalComparisonMetrics {
  venueId: string;
  venueName?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  month?: number;
  year?: number;
  revenue: {
    target: number;
    achieved: number;
    percentage: number;
    remaining: number;
  };
  sales: {
    target: number;
    achieved: number;
    percentage: number;
    remaining: number;
  };
  leads: {
    target: number;
    achieved: number;
    percentage: number;
    remaining: number;
  };
  pace: {
    daysElapsed: number;
    totalDays: number;
    projectedRevenue: number;
    isPaceOnTrack: boolean;
  };
}

export interface DebutanteAccount {
  id: string;
  venueId: string;
  name: string;
  slug: string; // ex: 'maria-eduarda-2027' -> link exclusivo ?debutante=maria-eduarda-2027
  status?: 'active' | 'inactive'; // Status ativo ou inativo
  eventType?: EventType; // Tipo do evento (15 Anos, Infantil, Adulto, etc.)
  partyDate: string; // YYYY-MM-DD
  partyDaysLeft: number;
  avatarUrl: string;
  phone: string;
  email?: string;
  motherName?: string;
  fatherName?: string;
  contractValue?: number; // Valor fechado do contrato
  packageSold?: string; // Pacote ou descrição do serviço contratado
  paymentTerms?: string; // Condição de pagamento (ex: 'Parcelado', 'À Vista', 'Entrada + Parcelas')
  contractSigned?: boolean; // Contrato assinado (Sim / Não)
  tastingStatus?: 'not_scheduled' | 'scheduled' | 'completed'; // Status de degustação
  visitStatus?: 'not_scheduled' | 'scheduled' | 'completed'; // Status de visitação/ensaio
  neighborhood?: string; // Bairro
  address?: string; // Endereço completo
  postSaleStage?: string; // Estágio no funil de pós-venda (ex: 'contract_signed', 'tasting', 'decoration', 'technical_visit', 'completed')
  leadId?: string; // ID do lead comercial que gerou este cliente
  tasks?: LeadTask[];
  activities?: LeadActivity[];
  customFieldValues?: Record<string, any>;

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

export interface PostSaleStageConfig {
  id: string;
  name: string;
  color?: string;
  isFixed?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
  order?: number;
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

// ── Support Tickets & Bug Reports (Audio 3) ──────────────────────────────────
export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved';

export type SupportTicketModule =
  | 'home'
  | 'crm'
  | 'debutantes'
  | 'venues'
  | 'collaborators'
  | 'whatsapp'
  | 'other';

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: string;
  venueId?: string;
  venueName?: string;
  module: SupportTicketModule;
  description: string;
  imageUrl?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages?: SupportTicketMessage[];
}

export interface PodiumTargetConfig {
  funnelId?: string; // se vazio ou 'all', aplica a todos os funis
  stageId?: string;  // etapa alvo (ex: 'scheduled' para SDR, 'deal_closed' / 'contract_signed' para Closer)
}

export interface PodiumConfig {
  sdr: PodiumTargetConfig;
  closer: PodiumTargetConfig;
}

// ── WhatsApp Quick Messages (Mensagens Rápidas) ─────────────────────────────
export interface QuickMessage {
  id: string;
  masterId?: string;
  venueId?: string | null;
  keyword: string; // sem espaços, ex: saudacao, pix
  message: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

// ==============================================================================
// CENTRAL DE CONTATOS & CONTRATOS DE EVENTOS (F5 SYSTEM v1.2)
// ==============================================================================

/** Ficha do fornecedor (contacts.supplier_profile) */
export interface SupplierProfile {
  segment?: string;        // segmento (buffet, decoracao, foto, DJ...)
  offers?: string;         // o que vende
  companyName?: string;    // razao social / nome fantasia
  cnpj?: string;
  pixType?: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria';
  pixKey?: string;
  address?: string;
  notes?: string;
}

export type SupplierQuoteStatus = 'pendente' | 'aprovado' | 'reprovado';

/** Orcamento de fornecedor: os "ativos" do fornecedor no Contato */
export interface SupplierQuote {
  id: string;
  masterId: string;
  contactId: string;
  venueId?: string;
  contractId?: string;
  title: string;
  description?: string;
  amount: number;
  status: SupplierQuoteStatus;
  requestedByName?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

export type ContactListFilter = 'all' | 'active_contract' | 'supplier';

export interface Contact {
  /** Marcado como fornecedor (vale para quem veio do comercial ou do pos-venda) */
  isSupplier?: boolean;
  supplierProfile?: SupplierProfile;
  /** Transformado em colaborador */
  isCollaborator?: boolean;
  id: string;
  masterId: string;
  code: string;                          // Código Base36 ex: 'CONT-4H8W2N9Q'
  name: string;
  nickname?: string;
  primaryPhone: string;
  whatsappPhone?: string;
  secondaryPhone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  profession?: string;
  birthDate?: string;
  profilePictureUrl?: string;

  // Endereço
  postalCode?: string;
  street?: string;
  number?: string;
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // Família e Metadados
  familyGroupId?: string;
  familyGroupName?: string;
  relationshipRole?: string;             // ex: 'Titular', 'Mãe', 'Pai', 'Debutante', 'Noivo'
  notes?: string;
  customFields?: Record<string, any>;

  // Relações e Indicadores
  venueIds?: string[];                   // Casas de festas onde o contato possui histórico
  dependents?: ContactDependent[];       // Dependentes / grupo familiar
  activeLeadsCount?: number;
  activeContractsCount?: number;

  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ContactDependent {
  id: string;
  masterId: string;
  parentContactId: string;
  dependentContactId?: string;
  name?: string;
  relationship?: string;
  kinship?: string;                       // ex: 'Filho(a) / Debutante', 'Cônjuge', 'Mãe', 'Pai'
  birthDate?: string;
  cpf?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  dependentContact?: Contact;
}

export interface FamilyGroup {
  id: string;
  masterId: string;
  name: string;                          // ex: 'Família Albuquerque Silva'
  notes?: string;
  createdAt: string;
  updatedAt: string;
  members?: Contact[];
}

export type ContractApprovalStatus = 
  | 'pending_approval' // Aguardando Homologação do Gerente Comercial / Geral / Master
  | 'approved'         // Aprovado e liberado para os funis de Pós-Venda
  | 'rejected'         // Ajustes solicitados ao Comercial
  | 'canceled'         // Contrato cancelado/distratado
  | 'completed';       // Evento realizado com sucesso

export interface Contract {
  id: string;
  masterId: string;
  contractCode: string;                  // Código Base36 ex: 'CTR-2026-9BK7MZ'
  contactId: string;
  originLeadId?: string;
  leadId?: string;
  originFunnelId?: string;
  sourceId?: string;                     // Origem (instancia WhatsApp) do lead que gerou o contrato
  venueId: string;                       // REGRA SUPREMA: UNIDADE ÚNICA
  venueName?: string;

  // Dados do Evento
  eventType: string;                     // '15_anos' | 'casamento' | 'infantil' | 'corporativo'
  eventTitle: string;                    // ex: '15 Anos Manuella Albuquerque'
  contractTitle?: string;                // Título persistido do contrato ex: 'Roberto Carlos – Manuella 15 Anos'
  title?: string;                        // Alias de contractTitle
  clientId?: string;                     // Vínculo com a tabela clients
  paymentFileUrl?: string;               // Comprovante de sinal/pagamento
  eventDate?: string;
  eventTime?: string;
  guestCount?: number;
  packageName?: string;

  // Snapshots Imutáveis (Blindagem Unilateral e Jurídica)
  clientSnapshot: {
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    birthdayPersonName?: string;
    [key: string]: any;
  };
  commercialFieldsSnapshot: Record<string, any>; // Perguntas e respostas preenchidas no funil comercial

  // Valores e Condições
  totalAmount: number;
  signalAmount?: number;
  /** Data de fechamento da venda (YYYY-MM-DD) */
  closedAt?: string;
  entryAmount?: number;
  balanceAmount?: number;
  /** Condicao de pagamento combinada, em texto (o fluxo estruturado fica no financeiro) */
  paymentSummary?: string;
  /** Etapa de fechamento conduzida pelo closer */
  fillStage?: ContractFillStage;
  /** Recado do financeiro ao devolver o contrato ao closer */
  financeMessage?: string;
  contractValue?: number;
  packageChosen?: string;
  paymentMethod?: string;
  paymentTerms?: Record<string, any> | string;

  // Responsáveis Eternos (Preservados mesmo se o usuário for deletado)
  sdrId?: string;
  sdrName: string;
  sdrEmail?: string;
  closerId?: string;
  closerName: string;
  closerEmail?: string;

  // Mesa de Homologação & Governança
  approvalStatus: ContractApprovalStatus;
  submittedBy?: string;
  submittedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedByRole?: string;               // 'gerente_comercial' | 'gerente_geral' | 'master'
  approvedAt?: string;
  rejectionReason?: string;

  // Destino Pós-Venda (Mesma Unidade)
  targetPosSaleFunnelIds?: string[];
  targetPostSaleFunnelIds?: string[];
  placements?: ContractFunnelPlacement[];

  // App de Convidados e Documentação
  debutanteId?: string | null;
  debutanteSlug?: string | null;
  handoverNotes?: string;
  contractFileUrl?: string;
  attachments?: Array<{ name: string; url: string; size?: number; type?: string }>;
  notes?: string;

  // Dados do Contato Vinculado (Join em tempo de execução)
  contact?: Contact;

  createdAt: string;
  updatedAt: string;
}

export interface ContractFunnelPlacement {
  id: string;
  masterId: string;
  contractId: string;
  funnelId: string;
  funnelName?: string;
  stageId: string;
  stageName?: string;
  assignedTo?: string;
  assignedToName?: string;
  status: 'in_progress' | 'completed' | 'on_hold';
  completedAt?: string;
  notes?: string;
  orderIndex?: number;
  contract?: Contract;
  createdAt: string;
  updatedAt: string;
}

export type AdminTabType =
  | 'home'
  | 'tasks'
  | 'quick-messages'
  | 'team-calendar'
  | 'dashboard'
  | 'crm'
  | 'contacts'
  | 'leads'
  | 'contracts'
  | 'followups'
  | 'whatsapp'
  | 'post-sale-crm'
  | 'post-sale-clients'
  | 'vip-journey'
  | 'post-sale-appointments'
  | 'post-sale-visits-tastings'
  | 'venue-events'
  | 'team'
  | 'sources'
  | 'mql'
  | 'sla-settings'
  | 'debutantes'
  | 'venue-goals'
  | 'finance'
  | 'finance-approval'
  | 'finance-payables'
  | 'finance-cashflow'
  | 'finance-calendar'
  | 'finance-dre'
  | 'finance-settings'
  | 'master-dashboard'
  | 'system-settings'
  | 'venues'
  | 'benefits'
  | 'collaborators'
  | 'templates'
  | 'appointments'
  | 'notifications'
  | 'settings'
  | 'dev-features'
  | 'dev-users'
  | 'dev-announcements'
  | 'dev-support';





