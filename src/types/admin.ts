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

export type FeatureFlagId = 
  | 'master_dashboard';

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
  avatarUrl?: string;
  venueIds?: string[]; // IDs das casas que tem acesso (vazio ou master = todas)
  phone?: string;
  theme?: ThemeMode;
  isFirstAccess?: boolean;
  activatedAt?: string;
  lastLoginAt?: string;
  masterId?: string; // ID da conta Master proprietária (caso subordinado)
  sectors?: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[];
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
  activatedAt?: string;
  lastLoginAt?: string;
  password?: string;
  customJobTitle?: string; // Cargo/Título executivo customizado (ex: 'Coordenador Geral', 'Líder Comercial')
  department?: 'diretoria' | 'gerencia' | 'comercial' | 'pos_venda' | 'financeiro';
  sectors?: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[]; // Setores que o colaborador participa
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

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'none';
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
  leadId?: string; // CRM Lead direct connection
  leadName?: string;
  clientId?: string; // Post-sale client direct connection
  clientName?: string;
  debutanteId?: string; // Debutante connection
  debutanteName?: string;
  venueId?: string;
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
  type: 'move_to_funnel' | 'move_copy_to_funnel' | 'notify_closer' | 'assign_role' | 'send_whatsapp';
  label: string;
  targetFunnelId?: string;
  targetStageId?: string;
  targetRoleId?: string;
  description?: string;
  whatsappTemplate?: string;
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
}

export type FunnelCustomFieldSection = 'commercial' | 'contact' | 'event';
export type FunnelFieldType = 'text' | 'date' | 'number' | 'todo' | 'select' | 'multi_select';

export interface FunnelCustomField {
  id: string;
  label: string;
  type: FunnelFieldType;
  section?: FunnelCustomFieldSection; // 'commercial' (Dados Comerciais), 'contact' (Aniversariante & Contatos), 'event' (Dados do Evento)
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

export interface FunnelDuplicateRuleConfig {
  matchPhone: boolean;
  matchEmail: boolean;
  matchName: boolean;
  action: 'keep_recent' | 'keep_both' | 'keep_oldest_update';
}

export interface MqlOption {
  id: string;
  label: string;
  points: number; // 100, 70, 40, 0
  situation?: MqlOptionSituation;
}

export interface MqlQuestion {
  id: string;
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
  email?: string;
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

  // Compromissos Comerciais Exclusivos (Máximo 1 de cada por lead, eterno)
  visitCommitment?: CommercialCommitment;
  tastingCommitment?: CommercialCommitment;

  partyDate?: string;   // Data prevista para a festa de 15 anos do lead
  funnelEnteredAt?: string; // Data exata em que o lead entrou no funil
  secondaryFunnelIds?: string[]; // IDs dos funis secundários onde o lead também é exibido simultaneamente
  activities: LeadActivity[];
  createdBy?: string;         // ID do usuário/colaborador que realizou o cadastro manual
  createdByName?: string;     // Nome legível do autor do cadastro manual
  createdByAvatar?: string;   // Foto/avatar do autor do cadastro manual
  createdAt: string;
  updatedAt: string;
}

// ── Compromissos Comerciais & Motor de Agenda (F5 System) ───────────────────
export type CommercialCommitmentType = 'visit' | 'tasting';
export type CommercialCommitmentStatus = 'not_scheduled' | 'scheduled' | 'completed' | 'cancelled';

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

export interface AgendaRecurringRule {
  enabledDays: number[];        // 0=Domingo, 1=Segunda, ..., 6=Sábado
  timeSlots: string[];          // ['10:00', '14:00', '16:00', '18:00']
  durationMinutes: number;      // Duração de cada compromisso (ex: 45 min)
  maxConcurrentPerSlot: number; // Capacidade de agendamentos por slot (ex: 3)
  maxPaxPerSlot?: number;       // Limite de PAX por slot (ex: 20)
}

export interface AgendaDateOverride {
  date: string;                 // YYYY-MM-DD
  isBlocked: boolean;           // Se true, o dia inteiro está bloqueado
  reason?: string;              // 'Feriado', 'Manutenção', 'Evento Privado'
  customSlots?: string[];       // Horários específicos que substituem a regra naquele dia
}

export interface VenueAgendaConfig {
  id?: string;
  venueId: string;              // ID da Casa de Festa ou 'all'
  visitsRule: AgendaRecurringRule;
  tastingsRule: AgendaRecurringRule;
  dateOverrides: AgendaDateOverride[];
  updatedAt?: string;
}

// ── Entidade Cliente & Pós-Venda (F5 System) ──────────────────────────────────
export interface ClientDocument {
  id: string;
  title: string;
  name?: string;
  type: 'contract' | 'amendment' | 'receipt' | 'id_document' | 'other';
  fileUrl: string;
  url?: string;
  uploadedAt: string;
  fileSize?: string;
  sizeBytes?: number;
}

export interface ClientActivity {
  id: string;
  clientId?: string;
  timestamp?: string;
  type: 'status_change' | 'note' | 'document_uploaded' | 'meeting' | 'debutante_linked' | 'contact' | 'creation' | 'assignment' | 'task_created' | 'task_completed';
  title?: string;
  text?: string;
  description: string;
  authorName?: string;
  createdAt: string;
  createdBy: string;
}

export type ClientStage = 
  | 'onboarding'       // Boas-vindas & Onboarding
  | 'planning'         // Planejamento & Cronograma
  | 'suppliers'        // Definição de Fornecedores / Degustação
  | 'final_alignment'  // Alinhamento Final (Reta Final)
  | 'party_day'        // Semana da Festa / Dia do Evento
  | 'completed'        // Pós-Festa Realizada
  | 'archived';        // Arquivado

export interface Client {
  id: string;
  code: string;                          // ex: 'CLI-8W3K9P'
  name: string;                          // Nome da Aniversariante / Homenageada (ex: Fernanda)
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
  dealValue: number;                     // Valor total do contrato (R$)
  contractDate: string;                  // Data de fechamento do contrato
  contractStatus?: 'aguardando_sinal' | 'sinal_pago' | 'contrato_enviado' | 'contrato_assinado'; // Status contratual no Pós-Venda
  contractSignedAt?: string | null;      // Data em que o contrato foi assinado (definida pelo Pós-Venda)
  signalPaid?: boolean;                  // Se o sinal da entrada foi pago
  signalValue?: number;                  // Valor do sinal pago
  signalPaidAt?: string | null;          // Data do pagamento do sinal
  paymentTerms?: string;                 // Condições de pagamento (Entrada, parcelas, etc.)
  paymentStatus?: 'up_to_date' | 'pending' | 'overdue' | 'paid_in_full';

  stage: ClientStage;                    // Etapa no Funil de Pós-Venda
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
  tags?: string[];
  funnelEnteredAt?: string; // Data de entrada do cliente no funil de pós-venda
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
  sharedVenueIds?: string[]; // IDs de casas adicionais que compartilham este funil
  allowedCollaboratorIds?: string[]; // IDs dos colaboradores permitidos (vazio = todos)
  allowedRoles?: AdminRole[]; // Cargos que podem interagir neste funil
  isPostSale?: boolean; // Se é um funil com objetivo de Pós-Venda
  isWonStageEnabled?: boolean; // Se a etapa de Ganho está ativada neste funil (padrão: true)
  isEntryStageActive?: boolean; // Etapa de leads de entrada ativada (estilo Como CRM)
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
  packageOptions?: string[]; // Lista de pacotes de venda deste funil
  paymentOptions?: string[]; // Lista de condições/formatos de pagamento deste funil
  predefinedTags?: string[]; // Tags pré-configuradas e recomendadas para leads deste funil
  distributionMode?: 'manual' | 'round_robin'; // Modo de distribuição dos novos leads (manual ou roleta)
  assignedSdrIds?: string[]; // IDs dos SDRs que participam da distribuição automática deste funil
  roundRobinNextIndex?: number; // Índice do próximo SDR na roleta
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
