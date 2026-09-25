import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { 
  AdminUser, 
  Collaborator,
  Venue, 
  DebutanteAccount,
  Lead,
  CrmStage,
  LeadActivity,
  LeadTask,
  LeadParticipant,
  JourneyTemplate,
  BenefitCatalogItem,
  VipRewardCatalogItem,
  AdminRole,
  ThemeMode,
  AdminTask,
  TaskStatus,
  CommercialFunnel,
  MqlQuestion,
  LeadMqlLevel,
  FeatureFlagId,
  FeatureFlagStatus,
  SystemAnnouncement,
  AnnouncementReadReceipt,
  SupportTicket,
  SupportTicketStatus,
  Client,
  ClientStage,
  ClientDocument,
  ClientActivity,
  VenueAgendaConfig,
  CommercialCommitment
} from '../types/admin';
import type { Source } from '../types/sources';
import type { 
  Milestone, 
  VipReward, 
  Appointment 
} from '../types';
import { 
  mockMilestones, 
  mockVipRewards 
} from '../data/mockData';
import { mockClients } from '../data/mockClients';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/mediaStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { venueService } from '../services/venueService';
import { funnelService } from '../services/funnelService';
import { leadService, isPhoneMatch, mergeAndSortActivities, findMatchingLead, isGenericOrFamilyNickname, formatActivityFromDb } from '../services/leadService';
import { sourceService } from '../services/sourceService';
import { debutanteService, taskService } from '../services/debutanteService';
import { appointmentService } from '../services/appointmentService';
import { agendaAvailabilityService } from '../services/agendaAvailabilityService';
import { catalogService } from '../services/catalogService';
import { collaboratorService, featureFlagService } from '../services/collaboratorService';
import { journeyTemplateService } from '../services/journeyTemplateService';
import { mqlService } from '../services/mqlService';
import { supportService } from '../services/supportService';
import { clientService } from '../services/clientService';
import { uazapiService } from '../services/uazapiService';
import { whatsappMediaService } from '../services/whatsappMediaService';
import { uazapiSseService, isLidIdentifier } from '../services/uazapiSseService';
import { createMonogramAvatar } from '../utils/avatarUtils';
import { generateLeadCode, generateClientCode } from '../utils/leadUtils';
import { isUuid } from '../utils/uuid';

const STORAGE_KEY_USER = 'bonomo_admin_user_v7';
const STORAGE_KEY_COLLABORATORS = 'bonomo_admin_collaborators_v7';
const STORAGE_KEY_VENUES = 'bonomo_admin_venues_v7';
const STORAGE_KEY_DEBUTANTES = 'bonomo_admin_debutantes_v7';
const STORAGE_KEY_CLIENTS = 'bonomo_admin_clients_v7';
const STORAGE_KEY_AGENDA_CONFIGS = 'bonomo_admin_agenda_configs_v1';
const STORAGE_KEY_APPOINTMENTS = 'bonomo_admin_appointments_v1';
const STORAGE_KEY_LEADS = 'bonomo_admin_leads_v7';
const STORAGE_KEY_SOURCES = 'bonomo_admin_sources_v1';
const STORAGE_KEY_TEMPLATES = 'bonomo_admin_templates_v7';
const STORAGE_KEY_ACTIVE_VENUE = 'bonomo_admin_active_venue_v7';
const STORAGE_KEY_BENEFITS = 'bonomo_admin_benefits_catalog_v7';
const STORAGE_KEY_VIP_CATALOG = 'bonomo_admin_vip_catalog_v7';
const STORAGE_KEY_THEME = 'bonomo_admin_theme_v7';
const STORAGE_KEY_TASKS = 'bonomo_admin_tasks_v7';
const STORAGE_KEY_FUNNELS = 'bonomo_admin_funnels_v7';
const STORAGE_KEY_LEAD_GOAL = 'bonomo_admin_lead_goal';
const STORAGE_KEY_FEATURE_FLAGS = 'bonomo_system_feature_flags';
const STORAGE_KEY_FEATURE_DESCRIPTIONS = 'bonomo_system_feature_descriptions';
const STORAGE_KEY_ANNOUNCEMENTS = 'bonomo_system_announcements';
const STORAGE_KEY_MQL_QUESTIONS = 'bonomo_admin_mql_questions_v1';
const STORAGE_KEY_SUPPORT_TICKETS = 'bonomo_support_tickets_v1';

export const createDefaultMqlQuestionsForVenue = (venueId: string): MqlQuestion[] => [
  {
    id: `mql_q1_${venueId}`,
    venueId,
    title: 'Qual a previsão de contratação / fechamento da festa?',
    description: 'Avalia a urgência e janela de oportunidade comercial',
    weight: 1,
    order: 0,
    options: [
      { id: 'opt_1_1', label: 'Imediata (próximos 7 a 15 dias)', points: 100 },
      { id: 'opt_1_2', label: 'Em até 30 a 60 dias', points: 75 },
      { id: 'opt_1_3', label: 'Em até 6 meses', points: 50 },
      { id: 'opt_1_4', label: 'Apenas pesquisando sem prazo definido', points: 15 },
    ],
  },
  {
    id: `mql_q2_${venueId}`,
    venueId,
    title: 'O orçamento / investimento estimado está alinhado?',
    description: 'Verifica poder de investimento e alinhamento com pacotes da casa',
    weight: 1,
    order: 1,
    options: [
      { id: 'opt_2_1', label: 'Orçamento totalmente aprovado e com recurso disponível', points: 100 },
      { id: 'opt_2_2', label: 'Orçamento pré-definido dentro da média dos pacotes', points: 70 },
      { id: 'opt_2_3', label: 'Buscando menor preço / sem orçamento definido', points: 30 },
    ],
  },
  {
    id: `mql_q3_${venueId}`,
    venueId,
    title: 'Os decisores financeiros principais estão no contato?',
    description: 'Mede o nível de acesso aos reais tomadores de decisão',
    weight: 1,
    order: 2,
    options: [
      { id: 'opt_3_1', label: 'Sim, o decisor financeiro principal está diretamente na conversa', points: 100 },
      { id: 'opt_3_2', label: 'Sim, o decisor está ciente e participará da visita/reunião', points: 75 },
      { id: 'opt_3_3', label: 'Não, anfitrião(ã) ainda não alinhou com os responsáveis', points: 20 },
    ],
  },
  {
    id: `mql_q4_${venueId}`,
    venueId,
    title: 'A data do evento já está definida?',
    description: 'Identifica a maturidade da contratação da data',
    weight: 1,
    order: 3,
    options: [
      { id: 'opt_4_1', label: 'Data fixa definida e inegociável', points: 100 },
      { id: 'opt_4_2', label: 'Mês ou semestre já escolhido com opções flexíveis', points: 70 },
      { id: 'opt_4_3', label: 'Sem previsão ou data ainda incerta', points: 25 },
    ],
  },
];

export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ── Default Seed Data ─────────────────────────────────────────────────────────

// 100% clean — Zero mock collaborators. Collaborators are fetched directly from Supabase.
const DEFAULT_COLLABORATORS: Collaborator[] = [];

const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagId, FeatureFlagStatus> = {
  master_dashboard: 'active',
  commercial_dashboard: 'active',
  goals: 'active',
};

const DEFAULT_ADMIN_USER: AdminUser | null = null;

// 100% clean — Zero mock venues in production. User registers their own venues.
const DEFAULT_VENUES: Venue[] = [];

const DEFAULT_TEMPLATES: JourneyTemplate[] = [];

const DEFAULT_BENEFITS_CATALOG: BenefitCatalogItem[] = [];

const DEFAULT_VIP_CATALOG: VipRewardCatalogItem[] = [];

// Leads start empty in production — no mocked leads
const DEFAULT_LEADS: Lead[] = [];

// Debutantes start empty in production — zero mocked debutantes
const DEFAULT_DEBUTANTES: DebutanteAccount[] = [];

// ── Context Interface ─────────────────────────────────────────────────────────

export interface AdminContextType {
  currentUser: AdminUser | null;
  collaborators: Collaborator[];
  venues: Venue[];
  debutantes: DebutanteAccount[];
  leads: Lead[];
  templates: JourneyTemplate[];
  benefitsCatalog: BenefitCatalogItem[];
  vipCatalog: VipRewardCatalogItem[];
  funnels: CommercialFunnel[];
  userPinnedFunnelIds: string[];
  togglePinFunnel: (funnelId: string) => void;
  isFunnelPinned: (funnelId: string) => boolean;
  sources: Source[];
  activeVenueId: string | null;
  activeDebutanteId: string | null;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Sources & Lead Tracking Module
  addSource: (data: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSource: (id: string, data: Partial<Source>) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  toggleSourceStatus: (id: string, active: boolean) => Promise<void>;
  hasUnconfiguredSources: boolean;
  unconfiguredSourcesCount: number;

  // Auth & Roles
  login: (email: string, pass: string, optUser?: Partial<AdminUser>) => Promise<boolean> | boolean;
  logout: () => void;
  switchUserRoleDemo: (role: AdminRole) => void;
  switchCollaborator: (collab: Collaborator) => void;
  impersonatingMaster: AdminUser | null;
  startImpersonation: (collab: Collaborator) => void;
  stopImpersonation: () => void;
  updateCurrentUserProfile: (data: Partial<AdminUser>) => void;

  // Collaborators
  addCollaborator: (data: Omit<Collaborator, 'id' | 'createdAt'>) => string;
  updateCollaborator: (id: string, data: Partial<Collaborator>) => void;
  deleteCollaborator: (id: string, reassignToId?: string | null) => void;

  // Venue Management
  setActiveVenueId: (id: string | null) => void;
  addVenue: (venueData: Omit<Venue, 'id' | 'createdAt'>) => string;
  updateVenue: (id: string, venueData: Partial<Venue>) => void;
  deleteVenue: (id: string) => Promise<{ success: boolean; message?: string; activeDebutantesCount?: number }>;
  updateVenueDistribution: (venueId: string, mode: 'queue' | 'round_robin', sdrIds: string[]) => void;

  // Debutante Management (App de Convidados)
  setActiveDebutanteId: (id: string | null) => void;
  addDebutanteAccount: (data: {
    venueId: string;
    name: string;
    partyDate: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
    baseGuestLimit?: number;
    hasJourneyEnabled?: boolean;
    welcomeVideoUrl?: string;
    journeyTemplateId?: string;
  }) => DebutanteAccount;
  updateDebutanteAccount: (id: string, data: Partial<DebutanteAccount>) => void;
  deleteDebutanteAccount: (id: string) => Promise<void> | void;
  setDebutanteStatus: (id: string, status: 'active' | 'inactive') => void;
  toggleDebutanteStatus: (id: string) => void;
  updateDebutanteModuleToggle: (id: string, hasJourneyEnabled: boolean) => void;
  updateDebutanteMilestones: (id: string, milestones: Milestone[]) => void;
  updateDebutanteVipRewards: (id: string, vipRewards: VipReward[]) => void;
  linkDebutanteJourney: (debutanteId: string, templateId: string) => void;
  markWelcomeVideoSeen: (slugOrId: string) => void;

  // Clientes & Pós-Venda (F5 System)
  clients: Client[];
  allClients: Client[];
  addClient: (clientData: Partial<Client>) => string;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  updateClientStage: (id: string, stage: ClientStage) => void;
  addClientNote: (id: string, noteText: string) => void;
  addClientDocument: (id: string, doc: Omit<ClientDocument, 'id' | 'uploadedAt'>) => void;
  linkClientDebutante: (clientId: string, debutanteId: string | null) => void;
  addClientUpsellSale: (clientId: string, sale: Omit<import('../types/admin').ClientUpsellSale, 'id' | 'clientId' | 'createdAt'>) => void;
  updateClientUpsellSale: (clientId: string, saleId: string, updates: Partial<import('../types/admin').ClientUpsellSale>) => void;
  deleteClientUpsellSale: (clientId: string, saleId: string) => void;

  // Funnel Management
  addFunnel: (data: Omit<CommercialFunnel, 'id' | 'createdAt'>) => string;
  updateFunnel: (id: string, data: Partial<CommercialFunnel>) => void;
  deleteFunnel: (id: string) => void;
  deleteFunnelWithLeadMigration: (
    funnelId: string,
    destinationFunnelId: string,
    stageMapping: Record<string, string>
  ) => Promise<{ success: boolean; migratedLeadsCount: number; updatedSourcesCount: number }>;
  duplicateFunnel: (funnelId: string, targetVenueId?: string) => string;
  reorderFunnels: (orderedFunnels: CommercialFunnel[]) => Promise<void>;
  markLeadAsRead: (leadId: string) => void;

  // CRM Leads — Stage & Assignment
  unindexedLeadsCount: number;
  reassignLeadFunnel: (leadId: string, destinationFunnelId: string, stageId?: string) => Promise<boolean>;
  reassignMultipleLeadsFunnel: (leadIds: string[], destinationFunnelId: string, stageId?: string) => Promise<{ successCount: number; failedCount: number }>;
  updateLeadStage: (leadId: string, newStage: CrmStage) => void;
  addLeadNote: (leadId: string, noteText: string) => void;
  validateLead: (leadId: string) => void;
  invalidateLead: (leadId: string) => void;
  createLeadFromReferral: (data: {
    debutanteId: string;
    debutanteName: string;
    debutanteSlug: string;
    venueId: string;
    name: string;
    phone: string;
    age: number;
    group: string;
    notes?: string;
  }) => string;
  createLeadFromWhatsApp: (data: {
    venueId: string;
    phone: string;
    name?: string;
    firstMessage?: string;
    sourceId?: string;
    avatarUrl?: string;
    fromMe?: boolean;
    mediaUrl?: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
    initialFunnelId?: string;
    initialStage?: CrmStage;
  }) => Promise<string>;
  createLead: (data: {
    name: string;
    phone: string;
    email?: string;
    venueId: string;
    funnelId: string;
    stage?: CrmStage;
    source?: import('../types/admin').LeadSource;
    sourceId?: string;
    sourceName?: string;
    subSource?: string;
    eventType?: import('../types/admin').LeadEventType;
    eventDate?: string;
    estimatedGuests?: number;
    estimatedBudget?: number;
    temperature?: import('../types/admin').LeadTemperature;
    sdrId?: string;
    sdrName?: string;
    closerId?: string;
    closerName?: string;
    notes?: string;
    debutanteBirthDate?: string;
    customFieldValues?: Record<string, any>;
    tags?: string[];
    createdBy?: string;
    createdByName?: string;
    createdByAvatar?: string;
  }) => Promise<string>;
  rejectLead: (leadId: string, reason: string) => void;
  deleteLead: (leadId: string) => void;
  deleteMultipleLeads: (leadIds: string[]) => Promise<void>;
  archiveLead: (leadId: string) => Promise<boolean>;
  unarchiveLead: (leadId: string, funnelId?: string, stageId?: string) => Promise<boolean>;
  mergeLeads: (primaryLeadId: string, secondaryLeadId: string) => Promise<boolean>;
  consolidateAllDuplicateLeads: () => Promise<{ mergedCount: number }>;
  syncWhatsAppHistoryGap: (options?: {
    sourceId?: string;
    instanceToken?: string;
    timeWindowMinutes?: number;
    startTimestamp?: number;
    endTimestamp?: number;
    createMissingLeads?: boolean;
  }) => Promise<{ recoveredCount: number; newLeadsCount: number; updatedLeadsCount: number }>;
  closeLeadSale: (leadId: string) => void;
  closeLeadSaleWithValue: (
    leadId: string,
    dealValue: number,
    packageSold: string,
    contractDate?: string,
    closerNotes?: string,
    extraOptions?: {
      downPayment?: number;
      installmentsCount?: number;
      hasCreditCard?: boolean;
      contractSignedFileUrl?: string;
      contractSignedFileName?: string;
      guestCount?: number;
      eventYear?: number | string;
    }
  ) => void;
  updateLeadData: (leadId: string, data: Partial<Lead>) => void;
  assignLead: (leadId: string, assigneeName: string) => void;
  claimLeadIfUnassigned: (leadId: string, claimantName?: string) => void;

  // SDR / Closer — Dual Responsibility
  assignLeadSdr: (leadId: string, sdrId: string) => void;
  assignLeadCloser: (leadId: string, closerId: string) => void;
  removeLeadCloser: (leadId: string) => void;
  removeLeadSdr: (leadId: string) => void;

  // Lead Distribution (Round Robin)
  distributeLeadRoundRobin: (venueId: string) => Collaborator | null;

  // Lead Tasks & Activities
  addLeadTask: (leadId: string, task: Omit<LeadTask, 'id' | 'leadId' | 'createdAt' | 'status'>) => string;
  updateLeadTask: (leadId: string, taskId: string, updates: Partial<LeadTask>) => void;
  completeLeadTask: (leadId: string, taskId: string) => void;
  deleteLeadTask: (leadId: string, taskId: string) => void;
  addLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'timestamp' | 'leadId'>) => void;

  // Query Helpers
  getLeadsByCollaborator: (collaboratorId: string) => Lead[];
  getTasksByCollaborator: (collaboratorId: string) => (LeadTask & { leadName: string; leadId: string })[];
  getDebutanteBySlug: (slug: string) => DebutanteAccount | undefined;
  getVenueById: (venueId: string) => Venue | undefined;
  getCollaboratorById: (id: string) => Collaborator | undefined;

  // Benefits & VIP Catalogs
  addBenefitCatalogItem: (data: Omit<BenefitCatalogItem, 'id' | 'createdAt'>) => string;
  updateBenefitCatalogItem: (id: string, data: Partial<BenefitCatalogItem>) => void;
  deleteBenefitCatalogItem: (id: string) => void;
  addVipCatalogItem: (data: Omit<VipRewardCatalogItem, 'id' | 'createdAt'>) => string;
  updateVipCatalogItem: (id: string, data: Partial<VipRewardCatalogItem>) => void;
  deleteVipCatalogItem: (id: string) => void;

  // Journey Templates
  addTemplate: (data: Omit<JourneyTemplate, 'id' | 'createdAt'>) => string;
  updateTemplate: (id: string, data: Partial<JourneyTemplate>) => void;
  deleteTemplate: (id: string) => void;
  applyTemplateToDebutante: (debutanteId: string, templateId: string) => void;
  shareJourneyTemplateToVenue: (templateId: string, targetVenueId: string) => void;
  shareCatalogItemToVenue: (type: 'benefit' | 'vip', itemId: string, targetVenueId: string) => void;

  // Appointments & Unified Agenda
  appointments: Appointment[];
  addAppointmentForDebutante: (debutanteId: string, appData: Omit<Appointment, 'id'>) => void;
  updateAppointmentForDebutante: (debutanteId: string, appId: string, appData: Partial<Appointment>) => void;
  deleteAppointmentForDebutante: (debutanteId: string, appId: string) => void;
  addAppointment: (appData: Omit<Appointment, 'id'>) => Promise<Appointment | null>;
  updateAppointment: (appId: string, appData: Partial<Appointment>) => Promise<boolean>;
  deleteAppointment: (appId: string) => Promise<boolean>;

  // Motor de Disponibilidade de Agenda & Compromissos Comerciais (Visitas e Degustações)
  venueAgendaConfigs: VenueAgendaConfig[];
  updateVenueAgendaConfig: (config: VenueAgendaConfig) => Promise<boolean>;
  scheduleCommercialCommitment: (leadId: string, type: 'visit' | 'tasting', commitmentData: {
    date: string;
    time: string;
    durationMinutes?: number;
    pax: number;
    responsibleCollaboratorId?: string;
    responsibleName?: string;
    notes?: string;
    venueId?: string;
  }) => Promise<boolean>;
  completeCommercialCommitment: (leadId: string, type: 'visit' | 'tasting', feedback?: string) => Promise<boolean>;
  cancelCommercialCommitment: (leadId: string, type: 'visit' | 'tasting', reason?: string, statusOverride?: 'cancelled' | 'no_show') => Promise<boolean>;


  // General & Personal Tasks (Home / CRM)
  tasks: AdminTask[];
  addTask: (data: Omit<AdminTask, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, data: Partial<AdminTask>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  addTaskComment: (taskId: string, text: string) => void;
  completeTaskWithFeedback: (taskId: string, feedback: string, customFinalStatus?: TaskStatus) => void;

  // MQL (Marketing Qualified Lead) System
  mqlQuestions: MqlQuestion[];
  addMqlQuestion: (data: Omit<MqlQuestion, 'id'>) => string;
  updateMqlQuestion: (id: string, data: Partial<MqlQuestion>) => void;
  deleteMqlQuestion: (id: string) => void;
  saveLeadMqlAnswers: (leadId: string, answers: Record<string, string>, score: number, level: LeadMqlLevel) => void;
  resetVenueLeadsMql: (venueId: string) => void;

  // Commercial Funnel Lead Goal
  leadGoal: import('../types/admin').LeadGoal;
  setLeadGoal: (goal: import('../types/admin').LeadGoal) => void;

  // Feature Flags (Developer Controlled)
  featureFlags: Record<FeatureFlagId, FeatureFlagStatus>;
  updateFeatureFlag: (featureId: FeatureFlagId, status: FeatureFlagStatus, comingSoonMessage?: string) => void;
  getFeatureStatus: (featureId: FeatureFlagId) => FeatureFlagStatus;
  featureDescriptions: Record<FeatureFlagId, string>;
  updateFeatureComingSoonMessage: (flagId: FeatureFlagId, message: string) => void;
  isFlagsLoaded: boolean;

  // Support Tickets & Bug Reports (Audio 3)
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketCode' | 'createdAt' | 'updatedAt' | 'messages'>) => Promise<SupportTicket | null>;
  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) => Promise<boolean>;
  sendSupportMessage: (ticketId: string, message: string) => Promise<boolean>;

  // System Announcements (Developer Broadcast & Read Receipts)
  announcements: SystemAnnouncement[];
  createAnnouncement: (data: Omit<SystemAnnouncement, 'id' | 'createdAt' | 'readReceipts' | 'authorId'>) => Promise<string>;
  markAnnouncementAsRead: (announcementId: string) => Promise<void>;

  // Multi-Tenant & Developer Management
  allCollaborators: Collaborator[];
  allVenues: Venue[];
  allDebutantes: DebutanteAccount[];
  allLeads: Lead[];
  allTasks: AdminTask[];
  allSources: Source[];
  allMqlQuestions: MqlQuestion[];
  addMasterAccount: (name: string, email: string) => string;
  toggleMasterAccountStatus: (masterId: string, active: boolean) => void;
  isInitialSyncComplete: boolean;
  sendCollaboratorInvite: (email: string, name?: string, role?: string) => Promise<{ success: boolean; message: string }>;
  forceLogout: (reason?: string) => void;
}

const AdminStateContext = createContext<AdminContextType | undefined>(undefined);

export const AdminStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u) {
          const isUserDev = Boolean(u.isDev || u.email?.toLowerCase() === 'patrickcouto.oficial@gmail.com');
          return { ...u, isDev: isUserDev };
        }
      } catch {}
    }
    return DEFAULT_ADMIN_USER;
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLLABORATORS);
    return saved ? JSON.parse(saved) : DEFAULT_COLLABORATORS;
  });

  const [venues, setVenues] = useState<Venue[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VENUES);
    return saved ? JSON.parse(saved) : DEFAULT_VENUES;
  });

  const [debutantes, setDebutantes] = useState<DebutanteAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DEBUTANTES);
    return saved ? JSON.parse(saved) : DEFAULT_DEBUTANTES;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return mockClients;
  });

  // Conjuntos de proteção anti-flicker para exclusões recentes
  const deletedDebutanteIdsRef = React.useRef<Set<string>>(new Set());
  const deletedLeadIdsRef = React.useRef<Set<string>>(new Set());
  const deletedTaskIdsRef = React.useRef<Set<string>>(new Set());
  const deletedCollabIdsRef = React.useRef<Set<string>>(new Set());

  // Refs para acesso ao vivo dentro de callbacks SSE sem re-registrar listeners
  const leadsRef = React.useRef<Lead[]>([]);
  const sourcesRef = React.useRef<Source[]>([]);
  const venuesRef = React.useRef<Venue[]>([]);

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LEADS);
    const parsed: Lead[] = saved ? JSON.parse(saved) : DEFAULT_LEADS;
    const mapped = parsed.map(lead => {
      const code = lead.code || generateLeadCode();
      const name = (!lead.name || lead.name.trim() === '' || lead.name === 'Sem nome' || lead.name === 'Lead Sem Nome')
        ? code
        : lead.name;
      let phone = lead.phone;
      let avatarUrl = lead.avatarUrl;
      if (code === 'LEAD-N4K9HT' || phone === '157221941944479') {
        phone = '5521999723215';
      }
      return { ...lead, code, name, phone, avatarUrl };
    });

    // ── Consolidação e merge automático de duplicados por telefone ──────────
    // Unifica múltiplos leads do mesmo telefone, preservando e ordenando todas as mensagens
    const groups: Lead[][] = [];
    for (const lead of mapped) {
      const cleanPhone = (lead.phone || '').replace(/\D/g, '');
      if (cleanPhone.length < 8) {
        groups.push([lead]);
        continue;
      }
      const matchedGroup = groups.find(g => g.some(existing => isPhoneMatch(existing.phone, lead.phone)));
      if (matchedGroup) {
        matchedGroup.push(lead);
      } else {
        groups.push([lead]);
      }
    }

    const consolidated: Lead[] = [];
    for (const group of groups) {
      if (group.length === 1) {
        consolidated.push(group[0]);
        continue;
      }

      // Eleger o lead Master
      group.sort((a, b) => {
        const scoreA = (a.name && !a.name.startsWith('LEAD-') && a.name !== 'Sem nome' ? 50 : 0) + (a.activities?.length || 0);
        const scoreB = (b.name && !b.name.startsWith('LEAD-') && b.name !== 'Sem nome' ? 50 : 0) + (b.activities?.length || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const master = { ...group[0] };
      for (const secondary of group.slice(1)) {
        master.activities = mergeAndSortActivities(master.activities || [], secondary.activities || [], master.id);
        if ((!master.name || master.name.startsWith('LEAD-') || master.name === 'Sem nome') && secondary.name && !secondary.name.startsWith('LEAD-')) {
          master.name = secondary.name;
        }
        if (!master.avatarUrl && secondary.avatarUrl) master.avatarUrl = secondary.avatarUrl;
        if (!master.email && secondary.email) master.email = secondary.email;
        if (!master.eventDate && secondary.eventDate) master.eventDate = secondary.eventDate;
      }
      consolidated.push(master);
    }
    // ────────────────────────────────────────────────────────────────────
    return consolidated;
  });

  const [mqlQuestions, setMqlQuestions] = useState<MqlQuestion[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MQL_QUESTIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [templates, setTemplates] = useState<JourneyTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [benefitsCatalog, setBenefitsCatalog] = useState<BenefitCatalogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BENEFITS);
    return saved ? JSON.parse(saved) : DEFAULT_BENEFITS_CATALOG;
  });

  const [vipCatalog, setVipCatalog] = useState<VipRewardCatalogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIP_CATALOG);
    return saved ? JSON.parse(saved) : DEFAULT_VIP_CATALOG;
  });

  const [tasks, setTasks] = useState<AdminTask[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TASKS);
    return saved ? JSON.parse(saved) : [];
  });

  const [venueAgendaConfigs, setVenueAgendaConfigs] = useState<VenueAgendaConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AGENDA_CONFIGS);
    return saved ? JSON.parse(saved) : [];
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [funnels, setFunnels] = useState<CommercialFunnel[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FUNNELS);
    if (!saved) return [];
    try {
      const parsed: CommercialFunnel[] = JSON.parse(saved);
      return parsed.filter(f => 
        f.id !== 'indicacao' && 
        f.id !== 'trafego' && 
        f.id !== 'parcerias'
      );
    } catch {
      return [];
    }
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    return saved || 'light'; // Default to light SaaS theme as requested
  });

  const [leadGoal, setLeadGoalState] = useState<import('../types/admin').LeadGoal>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LEAD_GOAL);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    return { target: 30, deadline: endOfMonth, title: 'Meta Mensal de Leads' };
  });

  const setLeadGoal = (goal: import('../types/admin').LeadGoal) => {
    setLeadGoalState(goal);
    safeLocalStorageSet(STORAGE_KEY_LEAD_GOAL, JSON.stringify(goal));
  };

  const [featureFlags, setFeatureFlags] = useState<Record<FeatureFlagId, FeatureFlagStatus>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FEATURE_FLAGS);
    if (saved) {
      try { return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(saved) }; } catch {}
    }
    return DEFAULT_FEATURE_FLAGS;
  });

  const [featureDescriptions, setFeatureDescriptions] = useState<Record<FeatureFlagId, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FEATURE_DESCRIPTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {} as Record<FeatureFlagId, string>;
  });

  const [isFlagsLoaded, setIsFlagsLoaded] = useState<boolean>(false);
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState<boolean>(false);

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SUPPORT_TICKETS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const updateFeatureComingSoonMessage = (flagId: FeatureFlagId, message: string) => {
    setFeatureDescriptions(prev => {
      const updated = { ...prev, [flagId]: message };
      safeLocalStorageSet(STORAGE_KEY_FEATURE_DESCRIPTIONS, JSON.stringify(updated));
      return updated;
    });

    try {
      window.dispatchEvent(new CustomEvent('bonomo_feature_flag_changed', {
        detail: { featureId: flagId, status: featureFlags[flagId] || 'coming_soon', comingSoonMessage: message }
      }));
    } catch {}

    featureFlagService.update(flagId, featureFlags[flagId] || 'coming_soon', message);
  };

  const createSupportTicket = async (ticketData: Omit<SupportTicket, 'id' | 'ticketCode' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<SupportTicket | null> => {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const ticketCode = `#TKT-${randomCode}`;
    const newTicket = await supportService.createTicket({
      ...ticketData,
      ticketCode,
    });
    if (newTicket) {
      setSupportTickets(prev => {
        const updated = [newTicket, ...prev.filter(t => t.id !== newTicket.id)];
        safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updated));
        return updated;
      });
      return newTicket;
    }
    return null;
  };

  const updateSupportTicketStatus = async (ticketId: string, status: SupportTicketStatus): Promise<boolean> => {
    setSupportTickets(prev => {
      const updated = prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t);
      safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updated));
      return updated;
    });
    return await supportService.updateStatus(ticketId, status);
  };

  const sendSupportMessage = async (ticketId: string, message: string): Promise<boolean> => {
    if (!currentUser || !message.trim()) return false;
    const msg = await supportService.addMessage({
      ticketId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: message.trim(),
    });
    if (msg) {
      setSupportTickets(prev => {
        const updated = prev.map(t => {
          if (t.id === ticketId) {
            return {
              ...t,
              updatedAt: new Date().toISOString(),
              messages: [...(t.messages || []), msg],
            };
          }
          return t;
        });
        safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updated));
        return updated;
      });
      return true;
    }
    return false;
  };

  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const createAnnouncement = async (data: Omit<SystemAnnouncement, 'id' | 'createdAt' | 'readReceipts' | 'authorId'>): Promise<string> => {
    const id = generateUuid();
    const newAnn: SystemAnnouncement = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      authorId: currentUser?.id || 'dev',
      readReceipts: [],
    };
    setAnnouncements(prev => {
      const updated = [newAnn, ...prev];
      safeLocalStorageSet(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      Promise.resolve(
        supabase.from('system_broadcast_announcements').insert({
          id,
          title: newAnn.title,
          content: newAnn.content,
          type: newAnn.type,
          media_type: newAnn.mediaType,
          media_url: newAnn.mediaUrl,
          target_roles: newAnn.targetRoles,
          author_id: newAnn.authorId,
          read_receipts: [],
        })
      ).catch(err => console.warn('Falha ao salvar broadcast no Supabase:', err));
    }

    return id;
  };

  const markAnnouncementAsRead = async (announcementId: string): Promise<void> => {
    if (!currentUser) return;
    setAnnouncements(prev => {
      const updated = prev.map(a => {
        if (a.id === announcementId) {
          const alreadyRead = a.readReceipts.some(r => r.userId === currentUser.id);
          if (alreadyRead) return a;
          const newReceipt = {
            userId: currentUser.id,
            userName: currentUser.name || 'Usuário',
            userEmail: currentUser.email || '',
            userRole: currentUser.role || 'master',
            readAt: new Date().toISOString(),
          };
          return {
            ...a,
            readReceipts: [...a.readReceipts, newReceipt],
          };
        }
        return a;
      });
      safeLocalStorageSet(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      supabase.from('system_broadcast_announcements')
        .select('read_receipts')
        .eq('id', announcementId)
        .single()
        .then(({ data }) => {
          const receipts = (data?.read_receipts || []) as AnnouncementReadReceipt[];
          if (!receipts.some(r => r.userId === currentUser.id)) {
            const newReceipt = {
              userId: currentUser.id,
              userName: currentUser.name || 'Usuário',
              userEmail: currentUser.email || '',
              userRole: currentUser.role || 'master',
              readAt: new Date().toISOString(),
            };
            supabase.from('system_broadcast_announcements')
              .update({ read_receipts: [...receipts, newReceipt] })
              .eq('id', announcementId)
              .then(() => {}, (err: any) => console.warn('Falha ao atualizar recibo de leitura:', err));
          }
        }, () => {});
    }
  };

  const updateFeatureFlag = (featureId: FeatureFlagId, status: FeatureFlagStatus, comingSoonMessage?: string) => {
    setFeatureFlags(prev => {
      const updated = { ...prev, [featureId]: status };
      safeLocalStorageSet(STORAGE_KEY_FEATURE_FLAGS, JSON.stringify(updated));
      return updated;
    });

    if (comingSoonMessage !== undefined) {
      updateFeatureComingSoonMessage(featureId, comingSoonMessage);
    }

    // Disparar sincronização instantânea em tempo real para toda a aplicação
    try {
      window.dispatchEvent(new CustomEvent('bonomo_feature_flag_changed', {
        detail: { featureId, status, comingSoonMessage }
      }));
    } catch {}

    const msg = comingSoonMessage !== undefined ? comingSoonMessage : featureDescriptions[featureId];
    featureFlagService.update(featureId, status, msg);
  };

  const getFeatureStatus = (featureId: FeatureFlagId): FeatureFlagStatus => {
    // Usuários com isDev = true possuem acesso a todas as features
    if (currentUser?.isDev) return 'active';
    return featureFlags[featureId] || 'active';
  };

  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_VENUE) || null;
  });

  const [activeDebutanteId, setActiveDebutanteId] = useState<string | null>(null);

  // ── Sync to localStorage ────────────────────────────────────────────────────

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    safeLocalStorageSet(STORAGE_KEY_THEME, newTheme);
    if (currentUser?.id || currentUser?.email) {
      collaboratorService.upsert({
        id: currentUser.id,
        email: currentUser.email,
        theme: newTheme,
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(collaborators));
  }, [collaborators]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(venues));
    venuesRef.current = venues;
  }, [venues]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(debutantes));
  }, [debutantes]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(leads));
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_BENEFITS, JSON.stringify(benefitsCatalog));
  }, [benefitsCatalog]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_VIP_CATALOG, JSON.stringify(vipCatalog));
  }, [vipCatalog]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  const [sources, setSources] = useState<Source[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SOURCES);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(sources));
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(funnels));
  }, [funnels]);

  useEffect(() => {
    if (currentUser) {
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);



  // ── Supabase Initial Fetch & Realtime Synchronizer ──────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    const loadLiveSupabaseData = async () => {
      try {
        const results = await Promise.allSettled([
          venueService.getAll(),             // 0
          funnelService.getAll(),            // 1
          leadService.getAll(),              // 2
          debutanteService.getAll(),         // 3
          taskService.getAll(),              // 4
          collaboratorService.getAll(),      // 5
          catalogService.getAllBenefits(),   // 6
          catalogService.getAllVipRewards(), // 7
          journeyTemplateService.getAll(),   // 8
          sourceService.getAll(),            // 9
          mqlService.getAll(),               // 10
          clientService.getAll(),            // 11
          agendaAvailabilityService.getAllConfigs(), // 12
          appointmentService.getAll(),       // 13
        ]);

        const dbVenues = results[0].status === 'fulfilled' ? results[0].value : [];
        const dbFunnels = results[1].status === 'fulfilled' ? results[1].value : [];
        const dbLeads = results[2].status === 'fulfilled' ? results[2].value : [];
        const dbDebutantes = results[3].status === 'fulfilled' ? results[3].value : [];
        const dbTasks = results[4].status === 'fulfilled' ? results[4].value : [];
        const dbCollabs = results[5].status === 'fulfilled' ? results[5].value : [];
        const dbBenefits = results[6].status === 'fulfilled' ? results[6].value : [];
        const dbVip = results[7].status === 'fulfilled' ? results[7].value : [];
        const dbTemplates = results[8].status === 'fulfilled' ? results[8].value : [];
        const dbSources = results[9].status === 'fulfilled' ? results[9].value : [];
        const dbMql = results[10].status === 'fulfilled' ? results[10].value : [];
        const dbClients = results[11].status === 'fulfilled' ? results[11].value : [];
        const dbAgendaConfigs = results[12].status === 'fulfilled' ? results[12].value : [];
        const dbAppointments = results[13].status === 'fulfilled' ? results[13].value : [];

        const serviceNames = ['venues', 'funnels', 'leads', 'debutantes', 'tasks', 'collaborators', 'benefits', 'vip', 'templates', 'sources', 'mql', 'clients', 'agendaConfigs', 'appointments'];
        results.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.warn(`[Supabase Sync] Falha ao carregar ${serviceNames[idx]}:`, res.reason);
          }
        });

        if (isMounted) {
          let syncedFunnels = dbFunnels;
          if (results[0].status === 'fulfilled' && dbVenues.length > 0) {
            setVenues(dbVenues);
            safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(dbVenues));
            // Garante que toda casa possua funil comercial primário cadastrado no Supabase
            syncedFunnels = await funnelService.ensureDefaultFunnels(dbVenues, dbFunnels);
            if (syncedFunnels.length > 0) {
              setFunnels(syncedFunnels);
              safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(syncedFunnels));
            }
            // Garante que cada casa possua origem nativa de indicação vinculada ao seu funil primário
            await sourceService.ensureDefaultReferralSources(dbVenues, syncedFunnels);
            const freshSources = await sourceService.getAll();
            if (freshSources.length > 0) {
              setSources(freshSources);
              safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(freshSources));
            }
          } else {
            if (results[1].status === 'fulfilled' && dbFunnels.length > 0) {
              setFunnels(dbFunnels);
              safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(dbFunnels));
            }
            if (results[9].status === 'fulfilled' && dbSources.length > 0) {
              setSources(dbSources);
              safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(dbSources));
            }
          }

          if (results[2].status === 'fulfilled' && Array.isArray(dbLeads)) {
            const funnelNameMap = new Map<string, string>();
            syncedFunnels.forEach(f => {
              funnelNameMap.set(f.name.toLowerCase().trim(), f.id);
            });

            const enrichedLeads = dbLeads.map(l => {
              const code = l.code || generateLeadCode();
              const name = (!l.name || l.name.trim() === '' || l.name === 'Sem nome' || l.name === 'Lead Sem Nome')
                ? code
                : l.name;
              let funnelId = l.funnelId;
              // Reconciliação: se o lead tinha salvo o nome do funil ao invés do ID, remapeia para o ID oficial
              if (funnelId && funnelNameMap.has(funnelId.toLowerCase().trim())) {
                funnelId = funnelNameMap.get(funnelId.toLowerCase().trim())!;
              }
              const localMatch = leads.find(prev => prev.id === l.id || prev.code === code);
              let phone = l.phone || localMatch?.phone || '';
              let avatarUrl = l.avatarUrl || (l.customFieldValues as any)?.avatarUrl || localMatch?.avatarUrl;
              if (code === 'LEAD-N4K9HT' || phone === '157221941944479') {
                phone = '5521999723215';
              }
              return { ...l, code, name, funnelId, phone, avatarUrl };
            });

            // Auto-cura e consolidação de duplicados no Supabase e em memória
            const { consolidatedLeads, mergedCount } = await leadService.consolidateDuplicatesInDatabase(enrichedLeads);
            if (mergedCount > 0) {
              console.log(`[Supabase Sync] ${mergedCount} lead(s) duplicado(s) foram consolidados e apagados com sucesso no banco de dados.`);
            }
            setLeads(consolidatedLeads);
            safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(consolidatedLeads));

            // Auto-cura assíncrona de leads que ainda possuam LID temporário no campo de telefone
            setTimeout(() => {
              const activeWa = sourcesRef.current.find(s => s.type === 'whatsapp_api' && s.status === 'active' && s.whatsappInstanceId);
              const instToken = activeWa?.whatsappInstanceId;
              if (instToken) {
                const lidsToHeal = consolidatedLeads.filter(l => isLidIdentifier(l.phone));
                for (const lead of lidsToHeal) {
                  const lidClean = lead.phone.replace(/\D/g, '');
                  uazapiService.resolveContactPhoneAndProfile(instToken, lidClean).then(async (resolved) => {
                    if (resolved.phone && !isLidIdentifier(resolved.phone) && resolved.phone.length <= 13) {
                      const cleanReal = resolved.phone.replace(/\D/g, '');
                      console.log(`[Auto-Healing JID/LID] Lead ${lead.code} (${lead.name}) teve telefone real recuperado: ${cleanReal}`);
                      const current = leadsRef.current;
                      const matchedByPhone = current.filter(l => l.id !== lead.id && isPhoneMatch(l.phone, cleanReal));
                      if (matchedByPhone.length > 0) {
                        await leadService.consolidateDuplicatesInDatabase([...matchedByPhone, { ...lead, phone: cleanReal, whatsappLid: lidClean }]);
                        await consolidateAllDuplicateLeads();
                      } else {
                        updateLeadData(lead.id, {
                          phone: cleanReal,
                          whatsappLid: lidClean,
                          name: (!lead.name || isGenericOrFamilyNickname(lead.name) || lead.name.startsWith('LEAD-')) && resolved.name && !isGenericOrFamilyNickname(resolved.name) ? resolved.name : lead.name,
                          avatarUrl: lead.avatarUrl || resolved.avatarUrl,
                        });
                        if (isSupabaseConfigured) {
                          leadService.update(lead.id, { phone: cleanReal, whatsappLid: lidClean }).catch(() => {});
                        }
                      }
                    }
                  }).catch(() => {});
                }
              }
            }, 3000);
          }

          if (results[10].status === 'fulfilled') {
            setMqlQuestions(dbMql);
            safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(dbMql));
          }

          if (results[3].status === 'fulfilled' && Array.isArray(dbDebutantes)) {
            setDebutantes(dbDebutantes);
            safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(dbDebutantes));
          }

          if (results[4].status === 'fulfilled' && Array.isArray(dbTasks)) {
            setTasks(dbTasks);
            safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(dbTasks));
          }

          if (results[11].status === 'fulfilled' && Array.isArray(dbClients)) {
            setClients(dbClients);
            safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(dbClients));
          }

          if (results[5].status === 'fulfilled' && Array.isArray(dbCollabs)) {
            setCollaborators(dbCollabs);
            safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(dbCollabs));
            const activeEmail = currentUser?.email;
            if (activeEmail) {
              const matched = dbCollabs.find(c => c.email.toLowerCase() === activeEmail.toLowerCase());
              if (matched) {
                if (matched.theme) {
                  setThemeState(matched.theme as ThemeMode);
                  safeLocalStorageSet(STORAGE_KEY_THEME, matched.theme);
                }
                // Sincroniza currentUser com os dados mais recentes do banco (Single Source of Truth)
                setCurrentUser(prev => {
                  if (!prev) return null;
                  const updatedUser: AdminUser = {
                    ...prev,
                    id: matched.id,
                    name: matched.name || prev.name,
                    role: matched.role || prev.role,
                    avatarUrl: matched.avatarUrl !== undefined ? matched.avatarUrl : prev.avatarUrl,
                    phone: matched.phone !== undefined ? matched.phone : prev.phone,
                    venueIds: matched.venueId === 'all' ? [] : (matched.venueIds || [matched.venueId]),
                    isFirstAccess: Boolean(matched.isFirstAccess),
                    masterId: matched.masterId || prev.masterId,
                  };
                  safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(updatedUser));
                  return updatedUser;
                });
              }
            }
          }
          if (dbBenefits.length > 0) setBenefitsCatalog(dbBenefits);
          if (dbVip.length > 0) setVipCatalog(dbVip);
          if (dbTemplates.length > 0) {
            setTemplates(dbTemplates);
          } else {
            // Seed Supabase with local templates if empty
            templates.forEach(t => journeyTemplateService.upsert(t));
          }

          if (Array.isArray(dbAgendaConfigs) && dbAgendaConfigs.length > 0) {
            setVenueAgendaConfigs(dbAgendaConfigs);
            safeLocalStorageSet(STORAGE_KEY_AGENDA_CONFIGS, JSON.stringify(dbAgendaConfigs));
          }

          if (Array.isArray(dbAppointments)) {
            setAppointments(dbAppointments);
            safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(dbAppointments));
          }

          // Realtime sync of system feature flags from Supabase
          const { data: dbFlags } = await supabase.from('system_feature_flags').select('*');
          if (dbFlags && dbFlags.length > 0) {
            const mappedFlags: Record<string, FeatureFlagStatus> = {};
            const mappedDescriptions: Record<string, string> = {};
            dbFlags.forEach((row: any) => {
              mappedFlags[row.feature_id] = row.status;
              if (row.coming_soon_message) {
                mappedDescriptions[row.feature_id] = row.coming_soon_message;
              }
            });
            setFeatureFlags(prev => {
              const next = { ...prev, ...mappedFlags };
              safeLocalStorageSet(STORAGE_KEY_FEATURE_FLAGS, JSON.stringify(next));
              return next;
            });
            setFeatureDescriptions(prev => {
              const next = { ...prev, ...mappedDescriptions };
              safeLocalStorageSet(STORAGE_KEY_FEATURE_DESCRIPTIONS, JSON.stringify(next));
              return next;
            });
          }
          setIsFlagsLoaded(true);
          setIsInitialSyncComplete(true);

          // Load support tickets
          const dbTickets = await supportService.getAll();
          if (dbTickets && isMounted) {
            setSupportTickets(dbTickets);
            safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(dbTickets));
          }
        }
      } catch (err) {
        console.warn('Falha na sincronização inicial do Supabase:', err);
      } finally {
        if (isMounted) {
          setIsFlagsLoaded(true);
          setIsInitialSyncComplete(true);
        }
      }
    };

    loadLiveSupabaseData();

    // Checa se a navegação atual é um retorno de link de recuperação/convite do Supabase
    const isRecoveryNavigation = typeof window !== 'undefined' && (
      window.location.hash.includes('type=recovery') || 
      window.location.search.includes('type=recovery') ||
      window.location.hash.includes('type=invite') ||
      window.location.search.includes('type=invite')
    );

    // Sincroniza sessão do Supabase Auth com o registro real do colaborador na tabela collaborators
    const syncUserFromSession = async (u: any) => {
      if (!u?.email || !isMounted) return;
      const cleanEmail = u.email.toLowerCase().trim();

      // 1. Tenta localizar na lista local de colaboradores já carregada
      const local = collaborators.find(c => c.email.toLowerCase() === cleanEmail);
      if (local && isMounted) {
        const isUserDev = Boolean(local.isDev || cleanEmail === 'patrickcouto.oficial@gmail.com');
        const fullUser: AdminUser = {
          id: local.id,
          name: local.name,
          email: local.email,
          role: local.role as any,
          avatarUrl: local.avatarUrl,
          phone: local.phone,
          venueIds: local.venueId === 'all' ? [] : (local.venueIds || [local.venueId]),
          isFirstAccess: Boolean(local.isFirstAccess),
          lastLoginAt: local.lastLoginAt,
          masterId: local.masterId,
          isDev: isUserDev,
        };
        setCurrentUser(fullUser);
        safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(fullUser));
        return;
      }

      // 2. Busca direto no Supabase caso ainda não esteja na memória
      try {
        const { data: dbRow } = await supabase
          .from('collaborators')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbRow && isMounted) {
          const isUserDev = Boolean(dbRow.is_dev || cleanEmail === 'patrickcouto.oficial@gmail.com');
          const fullUser: AdminUser = {
            id: dbRow.id,
            name: dbRow.name || u.user_metadata?.name || cleanEmail.split('@')[0],
            email: dbRow.email,
            role: (dbRow.role as any) || 'sdr',
            avatarUrl: dbRow.avatar_url || u.user_metadata?.avatar_url,
            phone: dbRow.phone,
            venueIds: dbRow.venue_id === 'all' ? [] : (dbRow.venue_ids || [dbRow.venue_id]),
            isFirstAccess: Boolean(dbRow.is_first_access),
            lastLoginAt: dbRow.last_login_at,
            masterId: dbRow.master_id,
            isDev: isUserDev,
          };
          setCurrentUser(fullUser);
          safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(fullUser));
          return;
        }
      } catch (err) {
        console.warn('Erro ao restaurar colaborador da sessão:', err);
      }

      // 3. Fallback estrito apenas se não existir em collaborators (ex: super admin dev)
      if (isMounted) {
        setCurrentUser(prev => {
          if (prev && prev.email.toLowerCase() === cleanEmail) {
            const isUserDev = Boolean(prev.isDev || cleanEmail === 'patrickcouto.oficial@gmail.com');
            if (prev.isDev !== isUserDev) return { ...prev, isDev: isUserDev };
            return prev;
          }
          const fallbackUser: AdminUser = {
            id: u.id,
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
            email: u.email || '',
            role: (u.user_metadata?.role as any) || 'master',
            avatarUrl: u.user_metadata?.avatar_url,
            venueIds: [],
            isFirstAccess: false,
            isDev: cleanEmail === 'patrickcouto.oficial@gmail.com',
          };
          safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(fallbackUser));
          return fallbackUser;
        });
      }
    };

    // Check and restore Supabase Auth session if active (apenas se NÃO for link de recuperação/convite)
    if (!isRecoveryNavigation) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMounted && session?.user) {
          syncUserFromSession(session.user);
        }
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) setCurrentUser(null);
      } else if (session?.user && isMounted) {
        if (event === 'PASSWORD_RECOVERY' || isRecoveryNavigation || (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')))) {
          console.log('[Auth] Evento de recuperação/convite detectado no onAuthStateChange. Mantendo tela de nova senha ativa.');
          return;
        }

        syncUserFromSession(session.user);
      }
    });

    // Setup Realtime WebSocket Listener with Debounce
    let debounceTimer: any = null;
    const triggerDebouncedSync = (fn: () => Promise<void>) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) fn();
      }, 150);
    };

    const realtimeChannel = supabase
      .channel('bonomo-admin-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, async () => {
        const updated = await venueService.getAll();
        if (isMounted && updated.length > 0) setVenues(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_funnels' }, async () => {
        const updated = await funnelService.getAll();
        if (isMounted && updated.length > 0) setFunnels(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, async () => {
        triggerDebouncedSync(async () => {
          const updated = await leadService.getAll();
          if (isMounted) {
            const filtered = updated.filter(l => !deletedLeadIdsRef.current.has(l.id));
            setLeads(filtered);
            safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(filtered));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debutantes' }, async () => {
        const updated = await debutanteService.getAll();
        if (isMounted) {
          const filtered = updated.filter(d => !deletedDebutanteIdsRef.current.has(d.id) && !deletedDebutanteIdsRef.current.has(d.slug));
          setDebutantes(filtered);
          safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(filtered));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, async () => {
        // Debutante cadastrou indicação -> atualiza debutantes e leads em tempo real
        triggerDebouncedSync(async () => {
          const [updatedDebs, updatedLeads] = await Promise.all([
            debutanteService.getAll(),
            leadService.getAll(),
          ]);
          if (isMounted) {
            const filteredDebs = updatedDebs.filter(d => !deletedDebutanteIdsRef.current.has(d.id) && !deletedDebutanteIdsRef.current.has(d.slug));
            const filteredLeads = updatedLeads.filter(l => !deletedLeadIdsRef.current.has(l.id));
            setDebutantes(filteredDebs);
            setLeads(filteredLeads);
            safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(filteredDebs));
            safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(filteredLeads));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, async () => {
        // Convidado confirmou -> atualiza lista de convidados em tempo real
        triggerDebouncedSync(async () => {
          const updatedDebs = await debutanteService.getAll();
          if (isMounted) {
            const filteredDebs = updatedDebs.filter(d => !deletedDebutanteIdsRef.current.has(d.id) && !deletedDebutanteIdsRef.current.has(d.slug));
            setDebutantes(filteredDebs);
            safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(filteredDebs));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        // Agendamento criado ou atualizado
        triggerDebouncedSync(async () => {
          const updatedDebs = await debutanteService.getAll();
          if (isMounted) {
            const filteredDebs = updatedDebs.filter(d => !deletedDebutanteIdsRef.current.has(d.id) && !deletedDebutanteIdsRef.current.has(d.slug));
            setDebutantes(filteredDebs);
            safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(filteredDebs));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, async () => {
        const updated = await taskService.getAll();
        if (isMounted) {
          const filtered = updated.filter(t => !deletedTaskIdsRef.current.has(t.id));
          setTasks(filtered);
          safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(filtered));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, async (payload: any) => {
        if (!isMounted) return;
        const eventType = payload.eventType; // 'INSERT', 'UPDATE', 'DELETE'
        const newRow = payload.new;
        const oldRow = payload.old;
        const targetLeadId = newRow?.lead_id || oldRow?.lead_id;

        if (targetLeadId) {
          setLeads(prev => {
            let found = false;
            const updated = prev.map(lead => {
              if (lead.id !== targetLeadId) return lead;
              found = true;
              const currentActs = lead.activities || [];

              if (eventType === 'INSERT' && newRow) {
                const formatted = formatActivityFromDb(newRow);
                const exists = currentActs.some(a => a.id === formatted.id || (
                  a.text === formatted.text && 
                  Math.abs(new Date(a.timestamp).getTime() - new Date(formatted.timestamp).getTime()) < 5000
                ));
                const acts = exists
                  ? currentActs.map(a => (a.id === formatted.id || (a.text === formatted.text && Math.abs(new Date(a.timestamp).getTime() - new Date(formatted.timestamp).getTime()) < 5000)) ? formatted : a)
                  : [...currentActs, formatted];
                return {
                  ...lead,
                  activities: acts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
                  lastInteractionAt: formatted.timestamp || lead.lastInteractionAt,
                };
              } else if (eventType === 'UPDATE' && newRow) {
                const formatted = formatActivityFromDb(newRow);
                const acts = currentActs.map(a => a.id === formatted.id ? formatted : a);
                return { ...lead, activities: acts };
              } else if (eventType === 'DELETE' && oldRow?.id) {
                const acts = currentActs.filter(a => a.id !== oldRow.id);
                return { ...lead, activities: acts };
              }
              return lead;
            });

            if (!found) {
              triggerDebouncedSync(async () => {
                const refreshed = await leadService.getAll();
                if (isMounted) setLeads(refreshed);
              });
              return prev;
            }

            leadsRef.current = updated;
            return updated;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_participants' }, async () => {
        triggerDebouncedSync(async () => {
          const updated = await leadService.getAll();
          if (isMounted && updated.length > 0) setLeads(updated);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, async () => {
        const updated = await clientService.getAll();
        if (isMounted) {
          setClients(updated);
          safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborators' }, async () => {
        const updated = await collaboratorService.getAll();
        if (isMounted) {
          const filtered = updated.filter(c => !deletedCollabIdsRef.current.has(c.id));
          setCollaborators(filtered);
          safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(filtered));
          setCurrentUser(prev => {
            if (!prev) return null;
            const me = updated.find(c => c.id === prev.id || c.email.toLowerCase() === prev.email.toLowerCase());
            if (me) {
              if (me.active === false) {
                setTimeout(() => {
                  logout();
                  alert('Sua conta de acesso foi suspensa ou desativada pelo administrador.');
                }, 50);
                return null;
              }
              safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(me));
              return me;
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'benefit_catalog_items' }, async () => {
        const updated = await catalogService.getAllBenefits();
        if (isMounted && updated.length > 0) setBenefitsCatalog(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vip_reward_catalog_items' }, async () => {
        const updated = await catalogService.getAllVipRewards();
        if (isMounted && updated.length > 0) setVipCatalog(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_broadcast_announcements' }, async () => {
        if (isSupabaseConfigured) {
          const { data } = await supabase.from('system_broadcast_announcements').select('*').order('created_at', { ascending: false });
          if (data && data.length > 0 && isMounted) {
            const mapped: SystemAnnouncement[] = data.map(row => ({
              id: row.id,
              title: row.title,
              content: row.content,
              type: row.type || 'feature',
              mediaType: row.media_type || 'none',
              mediaUrl: row.media_url || undefined,
              targetRoles: row.target_roles || ['master'],
              targetAudience: row.target_roles?.length >= 5 ? 'all' : (row.target_roles?.length === 1 && row.target_roles[0] === 'master' ? 'masters' : 'custom'),
              createdAt: row.created_at || new Date().toISOString(),
              authorId: row.author_id || 'dev',
              readReceipts: row.read_receipts || [],
            }));
            setAnnouncements(mapped);
            safeLocalStorageSet(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(mapped));
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sources' }, async () => {
        const updated = await sourceService.getAll();
        if (isMounted && updated.length > 0) setSources(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'source_events' }, async () => {
        const updated = await sourceService.getAll();
        if (isMounted && updated.length > 0) setSources(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_feature_flags' }, async () => {
        const { flags, descriptions } = await featureFlagService.getAll();
        if (isMounted) {
          if (Object.keys(flags).length > 0) {
            setFeatureFlags(prev => {
              const next = { ...prev, ...flags };
              safeLocalStorageSet(STORAGE_KEY_FEATURE_FLAGS, JSON.stringify(next));
              return next;
            });
          }
          if (Object.keys(descriptions).length > 0) {
            setFeatureDescriptions(prev => {
              const next = { ...prev, ...descriptions };
              safeLocalStorageSet(STORAGE_KEY_FEATURE_DESCRIPTIONS, JSON.stringify(next));
              return next;
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, async () => {
        const updated = await supportService.getAll();
        if (isMounted) {
          setSupportTickets(updated);
          safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updated));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, async () => {
        const updated = await supportService.getAll();
        if (isMounted) {
          setSupportTickets(updated);
          safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updated));
        }
      })
      .subscribe();

    const handleLocalFlagChanged = (e: any) => {
      if (e.detail?.flags) {
        setFeatureFlags(prev => ({ ...prev, ...e.detail.flags }));
      }
      if (e.detail?.descriptions) {
        setFeatureDescriptions(prev => ({ ...prev, ...e.detail.descriptions }));
      }
    };
    window.addEventListener('bonomo_feature_flag_changed', handleLocalFlagChanged);

    // Sincronização sob demanda ao retornar à aba (o Realtime WebSocket cuida das alterações em tempo real)
    const handleWindowFocus = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        Promise.all([
          leadService.getAll(),
          debutanteService.getAll(),
          clientService.getAll(),
          supportService.getAll(),
        ]).then(([updatedLeads, updatedDebs, updatedClients, updatedTickets]) => {
          if (isMounted) {
            if (updatedLeads.length > 0) setLeads(updatedLeads);
            if (updatedDebs.length > 0) setDebutantes(updatedDebs);
            if (updatedClients && updatedClients.length > 0) {
              setClients(updatedClients);
              safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updatedClients));
            }
            if (updatedTickets && updatedTickets.length > 0) {
              setSupportTickets(prev => {
                const prevStr = JSON.stringify(prev.map(t => ({ id: t.id, s: t.status, m: t.messages?.length })));
                const nextStr = JSON.stringify(updatedTickets.map(t => ({ id: t.id, s: t.status, m: t.messages?.length })));
                if (prevStr !== nextStr) {
                  safeLocalStorageSet(STORAGE_KEY_SUPPORT_TICKETS, JSON.stringify(updatedTickets));
                  return updatedTickets;
                }
                return prev;
              });
            }
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('bonomo_feature_flag_changed', handleLocalFlagChanged);
      supabase.removeChannel(realtimeChannel);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Reconcile and clean up funnels associated with deleted venues
  useEffect(() => {
    setFunnels(prev => {
      const validVenueIds = new Set(venues.map(v => v.id));
      const filtered = prev.filter(f => 
        f.id !== 'indicacao' && 
        f.id !== 'trafego' && 
        f.id !== 'parcerias' && 
        (f.venueId === 'all' || validVenueIds.has(f.venueId))
      );

      if (filtered.length !== prev.length) {
        safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(filtered));
        return filtered;
      }
      return prev;
    });
  }, [venues]);

  const setActiveVenueId = (id: string | null) => {
    setActiveVenueIdState(id);
    if (id) {
      safeLocalStorageSet(STORAGE_KEY_ACTIVE_VENUE, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_VENUE);
    }
  };

  // ── Auth Methods (Strict Password Validation) ──────────────────────────────

  const login = async (email: string, pass: string, optUser?: Partial<AdminUser>): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanPass) return false;

    // 1. Localiza o colaborador no estado carregado ou diretamente no Supabase
    let foundCollab = collaborators.find(c => c.email.toLowerCase() === cleanEmail);

    if (!foundCollab && isSupabaseConfigured) {
      try {
        const { data: dbRow } = await supabase
          .from('collaborators')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbRow) {
          foundCollab = {
            id: dbRow.id,
            name: dbRow.name,
            email: dbRow.email,
            role: dbRow.role || 'sdr',
            venueId: dbRow.venue_id || 'all',
            venueIds: dbRow.venue_ids || [],
            avatarUrl: dbRow.avatar_url,
            phone: dbRow.phone,
            active: dbRow.active ?? true,
            isFirstAccess: dbRow.is_first_access ?? false,
            password: dbRow.password,
            masterId: dbRow.master_id || undefined,
            theme: dbRow.theme || 'light',
            createdAt: dbRow.created_at || new Date().toISOString(),
          };
          setCollaborators(prev => [foundCollab!, ...prev.filter(c => c.id !== foundCollab!.id)]);
        }
      } catch (err) {
        console.warn('Erro ao consultar colaborador no Supabase:', err);
      }
    }

    if (!foundCollab) {
      return false;
    }

    // 2. Verificação estrita de suspensão/desativação da conta
    if (!foundCollab.active) {
      throw new Error('Acesso desativado. Entre em contato com o administrador da sua conta.');
    }

    // 3. Validação de senha via hash pgcrypto RPC
    const storedPass = foundCollab.password || 'Bonomo#2026';
    const isBcrypt = storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$') || storedPass.startsWith('$2y$');

    let isPasswordValid = false;

    if (isBcrypt && isSupabaseConfigured) {
      try {
        const { data: isMatch } = await supabase.rpc('verify_collaborator_password', {
          email_input: cleanEmail,
          password_input: cleanPass,
        });
        isPasswordValid = Boolean(isMatch);
      } catch (rpcErr) {
        console.warn('Fallback na validação de hash:', rpcErr);
        isPasswordValid = (cleanPass === storedPass);
      }
    } else {
      isPasswordValid = (cleanPass === storedPass);
    }

    if (!isPasswordValid) {
      return false;
    }

    // 4. Criação do AdminUser estritamente com o role cadastrado no banco
    const nowIso = new Date().toISOString();
    const isFirst = optUser?.isFirstAccess !== undefined 
      ? Boolean(optUser.isFirstAccess) 
      : Boolean(foundCollab.isFirstAccess);

    const user: AdminUser = {
      id: optUser?.id || foundCollab.id,
      name: optUser?.name || foundCollab.name,
      email: foundCollab.email,
      role: (optUser?.role || foundCollab.role) as any,
      avatarUrl: optUser?.avatarUrl !== undefined ? optUser.avatarUrl : foundCollab.avatarUrl,
      phone: foundCollab.phone,
      venueIds: foundCollab.venueId === 'all' ? [] : (foundCollab.venueIds || [foundCollab.venueId]),
      isFirstAccess: isFirst,
      lastLoginAt: nowIso,
      masterId: foundCollab.masterId,
      isDev: Boolean(optUser?.isDev !== undefined ? optUser.isDev : foundCollab.isDev),
    };

    // Atualiza estado local de colaboradores para refletir imediatamente o último acesso
    setCollaborators(prev => prev.map(c => c.id === foundCollab!.id ? { ...c, lastLoginAt: nowIso, isFirstAccess: isFirst } : c));

    // Persiste no banco Supabase
    if (isSupabaseConfigured) {
      void supabase.from('collaborators').update({
        last_login_at: nowIso,
        is_first_access: isFirst,
      }).eq('id', foundCollab.id);
    }

    setCurrentUser(user);
    safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(user));
    if (foundCollab.venueId && foundCollab.venueId !== 'all') {
      setActiveVenueId(foundCollab.venueId);
    }
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('bonomo_admin_user_v7');
      localStorage.removeItem('bonomo_admin_user_v6');
      localStorage.removeItem('bonomo_admin_user_v5');
      localStorage.removeItem('f5_system_user');
      localStorage.removeItem('bonomo_admin_active_tab'); // Limpa a aba ativa para abrir sempre em início
      localStorage.removeItem('bonomo_impersonating_master');
      setImpersonatingMaster(null);
      sessionStorage.clear();
      if (isSupabaseConfigured) {
        supabase.auth.signOut().catch(() => {});
      }
    } catch {}
    window.location.href = window.location.origin + '/?admin=true';
  };

  const switchUserRoleDemo = (role: AdminRole) => {
    const allCollabs = [...collaborators, ...DEFAULT_COLLABORATORS];
    const matched = allCollabs.find(c => c.role === role);
    if (matched) {
      setCurrentUser({
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        avatarUrl: matched.avatarUrl,
        venueIds: matched.venueId === 'all' ? [] : [matched.venueId],
      });
      if (matched.venueId !== 'all') {
        setActiveVenueId(matched.venueId);
      } else {
        setActiveVenueId(null);
      }
    }
  };

  const [impersonatingMaster, setImpersonatingMaster] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('bonomo_impersonating_master');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });

  const startImpersonation = (c: Collaborator) => {
    // If not already impersonating, remember original master user
    if (!impersonatingMaster && currentUser) {
      setImpersonatingMaster(currentUser);
      safeLocalStorageSet('bonomo_impersonating_master', JSON.stringify(currentUser));
    }

    const user: AdminUser = {
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      avatarUrl: c.avatarUrl,
      venueIds: c.venueId === 'all' ? [] : (c.venueIds && c.venueIds.length > 0 ? c.venueIds : [c.venueId]),
      phone: c.phone,
      masterId: currentUser?.role === 'master' ? currentUser.id : currentUser?.masterId,
    };
    setCurrentUser(user);
    safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(user));
    if (c.venueId !== 'all') {
      setActiveVenueId(c.venueId);
    } else {
      setActiveVenueId(null);
    }
  };

  const stopImpersonation = () => {
    if (impersonatingMaster) {
      setCurrentUser(impersonatingMaster);
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(impersonatingMaster));
      setImpersonatingMaster(null);
      localStorage.removeItem('bonomo_impersonating_master');
      setActiveVenueId(null);
    }
  };

  const switchCollaborator = (c: Collaborator) => {
    startImpersonation(c);
  };

  const updateCurrentUserProfile = (data: Partial<AdminUser>) => {
    const activeId = currentUser?.id || 'collab_master_1';
    const effectiveName = data.name !== undefined ? data.name : (currentUser?.name || 'Administrador');
    const effectiveEmail = (data.email !== undefined ? data.email : (currentUser?.email || '')).toLowerCase().trim();
    const effectivePhone = data.phone !== undefined ? data.phone : (currentUser?.phone || '');
    const effectiveAvatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : (currentUser?.avatarUrl || '');

    setCurrentUser(prev => {
      if (!prev) return null;
      const updated: AdminUser = {
        ...prev,
        name: data.name !== undefined ? data.name : prev.name,
        email: data.email !== undefined ? data.email : prev.email,
        phone: data.phone !== undefined ? data.phone : prev.phone,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : prev.avatarUrl,
        theme: data.theme !== undefined ? data.theme : prev.theme,
      };
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    });

    const userEmail = effectiveEmail;

    // Sincroniza na lista de colaboradores para que reflita imediatamente em todas as telas
    setCollaborators(prev => {
      const exists = prev.some(c => c.id === activeId || (userEmail && c.email.toLowerCase().trim() === userEmail) || (currentUser?.role === 'master' && c.role === 'master'));
      let updated: Collaborator[];
      if (exists) {
        updated = prev.map(c => {
          const matches = c.id === activeId || (userEmail && c.email.toLowerCase().trim() === userEmail) || (currentUser?.role === 'master' && c.role === 'master');
          if (matches) {
            return {
              ...c,
              name: effectiveName,
              email: effectiveEmail,
              avatarUrl: effectiveAvatarUrl,
              phone: effectivePhone,
            };
          }
          return c;
        });
      } else {
        const newCollab: Collaborator = {
          id: activeId,
          name: effectiveName,
          email: userEmail || 'diretoria@bonomofestas.com.br',
          role: currentUser?.role || 'master',
          avatarUrl: effectiveAvatarUrl,
          phone: effectivePhone || '(21) 99999-8888',
          venueId: 'all',
          active: true,
          createdAt: new Date().toISOString().split('T')[0],
        };
        updated = [newCollab, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });

    // Sincroniza em tempo real com a tabela public.collaborators no Supabase por ID e EMAIL
    collaboratorService.upsert({
      id: activeId,
      name: effectiveName,
      email: effectiveEmail || 'diretoria@bonomofestas.com.br',
      avatarUrl: effectiveAvatarUrl,
      phone: effectivePhone,
    });

    if (isSupabaseConfigured) {
      supabase.auth.updateUser({
        data: {
          name: effectiveName,
          avatar_url: effectiveAvatarUrl,
          phone: effectivePhone,
        }
      }).catch(err => console.warn('Falha ao atualizar metadata no Supabase Auth:', err));
    }
  };

  // ── Scoped Tenant Master ID & Isolation ─────────────────────────────────────
  // O Desenvolvedor usa seu próprio tenant isolado (currentUser.id) para testes.
  // O Master usa seu próprio tenant (currentUser.id).
  // ── Scoped Tenant Master ID & Isolation (Estrito LGPD) ─────────────────────
  // Todo usuário (inclusive desenvolvedores) opera estritamente em seu próprio tenant isolado.
  // Colaboradores subordinados operam estritamente no tenant do seu master proprietário.
  const scopedMasterId = useMemo(() => {
    if (!currentUser) return null;
    return currentUser.masterId || currentUser.id;
  }, [currentUser]);

  // Casas de Festa do Tenant Ativo (Estritamente isoladas por masterId)
  const scopedVenues = useMemo(() => {
    if (!currentUser || !scopedMasterId) return venues;
    
    // Filtra as casas pertencentes ao tenant
    const masterVenues = venues.filter(v => v.masterId === scopedMasterId);
    
    // Se for o próprio master (ou master dev), vê todas as casas do seu tenant
    if (currentUser.role === 'master' || !currentUser.masterId) {
      return masterVenues;
    }

    // Colaborador subordinado vê as casas atribuídas a ele dentro do tenant do seu master
    if (!currentUser.venueIds || currentUser.venueIds.length === 0) return masterVenues;
    const assigned = masterVenues.filter(v => currentUser.venueIds?.includes(v.id));
    return assigned.length > 0 ? assigned : masterVenues;
  }, [venues, scopedMasterId, currentUser]);

  // Auto-ajuste de activeVenueId para o tenant atual (evita vazamento de seleção entre contas)
  useEffect(() => {
    if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
      const existsInScoped = scopedVenues.some(v => v.id === activeVenueId);
      if (!existsInScoped) {
        const fallback = scopedVenues.length > 0 ? scopedVenues[0].id : null;
        setActiveVenueIdState(fallback);
        if (fallback) {
          safeLocalStorageSet(STORAGE_KEY_ACTIVE_VENUE, fallback);
        } else {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_VENUE);
        }
      }
    }
  }, [scopedVenues, activeVenueId]);

  // Colaboradores da Equipe do Tenant Ativo
  const scopedCollaborators = useMemo(() => {
    if (!currentUser || !scopedMasterId) return collaborators;
    return collaborators.filter(c => 
      c.id === scopedMasterId ||
      c.masterId === scopedMasterId
    );
  }, [collaborators, scopedMasterId, currentUser]);

  // Leads do Tenant Ativo (pertencem estritamente às casas ou master do tenant)
  const scopedLeads = useMemo(() => {
    if (!currentUser || !scopedMasterId) return leads;
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));

    return leads.filter(l => {
      // REGRA DE OURO DA HIERARQUIA: Lead -> Origem -> Casa de Festa -> Master
      // Se o lead possui uma origem vinculada, essa origem DEVE pertencer a uma das casas do tenant!
      if (l.sourceId) {
        const src = sources.find(s => s.id === l.sourceId);
        if (src && src.venueId && !masterVenueIds.has(src.venueId)) {
          return false; // Origem pertence a outro master/casa -> isola 100%!
        }
      }

      // Se o lead possui uma casa vinculada, essa casa DEVE pertencer ao tenant!
      if (l.venueId && !masterVenueIds.has(l.venueId)) {
        return false;
      }

      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        return l.venueId === activeVenueId;
      }

      // Se o lead não tiver casa vinculada, restringe pelo masterId
      if (!l.venueId) {
        return l.masterId === scopedMasterId;
      }

      return masterVenueIds.has(l.venueId);
    });
  }, [leads, sources, scopedMasterId, scopedVenues, activeVenueId, currentUser]);

  // Funis do Tenant Ativo
  const scopedFunnels = useMemo(() => {
    if (!currentUser || !scopedMasterId) return funnels;
    if (activeVenueId && activeVenueId !== 'all') {
      return funnels.filter(f => f.venueId === activeVenueId || (f.venueId === 'all' && f.masterId === scopedMasterId));
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return funnels.filter(f => 
      (f.venueId && masterVenueIds.has(f.venueId)) || 
      (f.venueId === 'all' && (f.masterId === scopedMasterId || !f.masterId))
    );
  }, [funnels, scopedMasterId, scopedVenues, activeVenueId, currentUser]);

  // Debutantes do Tenant Ativo
  const scopedDebutantes = useMemo(() => {
    if (!currentUser || !scopedMasterId) return debutantes;
    if (activeVenueId && activeVenueId !== 'all') {
      return debutantes.filter(d => d.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return debutantes.filter(d => masterVenueIds.has(d.venueId));
  }, [debutantes, scopedVenues, activeVenueId, currentUser]);

  // Clientes de Pós-Venda do Tenant Ativo
  const scopedClients = useMemo(() => {
    if (!currentUser || !scopedMasterId) return clients;
    if (activeVenueId && activeVenueId !== 'all') {
      return clients.filter(c => c.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return clients.filter(c => (c.venueId && masterVenueIds.has(c.venueId)) || (c as any).masterId === scopedMasterId);
  }, [clients, scopedMasterId, scopedVenues, activeVenueId, currentUser]);

  // Origens do Tenant Ativo
  const scopedSources = useMemo(() => {
    if (!currentUser || !scopedMasterId) return sources;
    if (activeVenueId && activeVenueId !== 'all') {
      return sources.filter(s => s.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return sources.filter(s => masterVenueIds.has(s.venueId));
  }, [sources, scopedVenues, activeVenueId, currentUser]);

  // Perguntas ICP do Tenant Ativo
  const scopedMqlQuestions = useMemo(() => {
    if (!currentUser) return mqlQuestions;
    if (activeVenueId && activeVenueId !== 'all') {
      return mqlQuestions.filter(q => q.venueId === activeVenueId || (q.venueIds && q.venueIds.includes(activeVenueId)));
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return mqlQuestions.filter(q => (Boolean(q.venueId) && masterVenueIds.has(q.venueId!)) || (q.venueIds && q.venueIds.some(id => masterVenueIds.has(id))) || Boolean(q.funnelId) || (q.funnelIds && q.funnelIds.length > 0));
  }, [mqlQuestions, scopedVenues, activeVenueId, currentUser]);

  // Modelos de Jornada do Tenant Ativo (estritamente isolados por casa ativa / tenant)
  const scopedTemplates = useMemo(() => {
    if (!currentUser) return templates;
    if (activeVenueId && activeVenueId !== 'all') {
      return templates.filter(t => t.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return templates.filter(t => Boolean(t.venueId && masterVenueIds.has(t.venueId)));
  }, [templates, scopedVenues, activeVenueId, currentUser]);

  // Catálogo de Benefícios do Tenant Ativo
  const scopedBenefitsCatalog = useMemo(() => {
    if (!currentUser) return benefitsCatalog;
    if (activeVenueId && activeVenueId !== 'all') {
      return benefitsCatalog.filter(b => b.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return benefitsCatalog.filter(b => Boolean(b.venueId && masterVenueIds.has(b.venueId)));
  }, [benefitsCatalog, scopedVenues, activeVenueId, currentUser]);

  // Catálogo VIP do Tenant Ativo
  const scopedVipCatalog = useMemo(() => {
    if (!currentUser) return vipCatalog;
    if (activeVenueId && activeVenueId !== 'all') {
      return vipCatalog.filter(v => v.venueId === activeVenueId);
    }
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return vipCatalog.filter(v => Boolean(v.venueId && masterVenueIds.has(v.venueId)));
  }, [vipCatalog, scopedVenues, activeVenueId, currentUser]);

  // Tarefas do Tenant Ativo (Estritamente isoladas por casas do tenant e master)
  const scopedTasks = useMemo(() => {
    if (!currentUser || !scopedMasterId) return tasks;
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return tasks.filter(t => {
      // 1. Se uma casa específica estiver selecionada no filtro global
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (t.venueId) return t.venueId === activeVenueId;
        if (t.leadId) {
          const l = leads.find(lead => lead.id === t.leadId);
          return l?.venueId === activeVenueId;
        }
        if (t.clientId) {
          const c = clients.find(cli => cli.id === t.clientId);
          return c?.venueId === activeVenueId;
        }
        return false;
      }
      // 2. Se estiver em 'all' ou 'multi', deve pertencer às casas do tenant
      if (t.venueId) return masterVenueIds.has(t.venueId);
      if (t.leadId) {
        const l = leads.find(lead => lead.id === t.leadId);
        return l && (l.masterId === scopedMasterId || (l.venueId && masterVenueIds.has(l.venueId)));
      }
      if (t.clientId) {
        const c = clients.find(cli => cli.id === t.clientId);
        return c && ((c as any).masterId === scopedMasterId || (c.venueId && masterVenueIds.has(c.venueId)));
      }
      return (t as any).masterId === scopedMasterId || t.createdById === currentUser.id;
    });
  }, [tasks, scopedVenues, scopedMasterId, leads, clients, activeVenueId, currentUser]);

  // Agendamentos / Visitas do Tenant Ativo
  const scopedAppointments = useMemo(() => {
    if (!currentUser || !scopedMasterId) return appointments;
    const masterVenueIds = new Set(scopedVenues.map(v => v.id));
    return appointments.filter(a => {
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        return a.venueId === activeVenueId;
      }
      return a.venueId ? masterVenueIds.has(a.venueId) : true;
    });
  }, [appointments, scopedVenues, activeVenueId, currentUser]);

  // ── Developer Exclusive Methods ─────────────────────────────────────────────
  const addMasterAccount = (name: string, email: string): string => {
    const id = generateUuid();
    const cleanEmail = email.trim().toLowerCase();
    const newMaster: Collaborator = {
      id,
      name,
      email: cleanEmail,
      role: 'master',
      venueId: 'all',
      venueIds: [],
      active: true,
      isFirstAccess: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setCollaborators(prev => [newMaster, ...prev]);
    collaboratorService.upsert(newMaster);
    return id;
  };

  const toggleMasterAccountStatus = (masterId: string, active: boolean) => {
    // 1. Atualiza no estado local o Master e aplica desativação/ativação em cascata para seus colaboradores
    setCollaborators(prev => prev.map(c => {
      if (c.id === masterId) {
        return { ...c, active };
      }
      if (c.masterId === masterId) {
        return { ...c, active };
      }
      return c;
    }));

    // 2. Persiste no Supabase (o trigger PostgreSQL trg_cascade_master_deactivation também reforça no banco)
    if (isSupabaseConfigured) {
      Promise.resolve(supabase.from('collaborators').update({ active }).eq('id', masterId))
        .catch((err: any) => console.warn('Erro ao atualizar status do master:', err));
      Promise.resolve(supabase.from('collaborators').update({ active }).eq('master_id', masterId))
        .catch((err: any) => console.warn('Erro ao atualizar status dos subordinados:', err));
    }
  };

  // ── Collaborators CRUD ──────────────────────────────────────────────────────

  const sendCollaboratorInvite = async (
    email: string,
    name?: string,
    role?: string
  ): Promise<{ success: boolean; message: string }> => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanEmail = email.trim().toLowerCase();
    const finalRedirectTo = `${origin}/?admin=true&type=recovery`;

    try {
      const response = await fetch('/api/invite-collaborator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name,
          role,
          invitedByName: currentUser?.name || 'Administração F5 System',
          redirectTo: finalRedirectTo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          return {
            success: true,
            message: data?.message || 'Convite enviado com sucesso!',
          };
        }
      }
    } catch (err: any) {
      console.warn('[Auth] /api/invite-collaborator indisponível ou com erro, acionando fallback direto do Supabase Auth:', err);
    }

    // Fallback Client-side direto caso a API /api/invite-collaborator não responda (ex: dev local) ou retorne falha
    try {
      if (isSupabaseConfigured) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: finalRedirectTo,
        });
        if (!resetErr) {
          return {
            success: true,
            message: 'E-mail de primeiro acesso e ativação enviado com sucesso!',
          };
        } else {
          console.warn('[Auth] Erro no fallback resetPasswordForEmail:', resetErr.message);
        }
      }
    } catch (clientErr: any) {
      console.warn('[Auth] Falha no fallback client-side:', clientErr);
    }

    return {
      success: false,
      message: 'Não foi possível enviar o e-mail automaticamente. Verifique as configurações de SMTP.',
    };
  };

  const addCollaborator = (data: Omit<Collaborator, 'id' | 'createdAt'>): string => {
    // RBAC: Gerentes (admin/gerencia) não podem criar outros gerentes, masters ou devs
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'gerencia';
    if (isManager) {
      if (['admin', 'gerencia', 'master', 'dev'].includes(data.role)) {
        alert('Acesso Negado: Gerentes não possuem permissão para cadastrar outros gerentes ou administradores.');
        throw new Error('Acesso Negado: Gerentes não podem criar outros gerentes.');
      }
    }

    const id = generateUuid();
    const newCollab: Collaborator = {
      ...data,
      id,
      masterId: data.masterId || scopedMasterId || currentUser?.id,
      createdAt: new Date().toISOString().split('T')[0],
      isFirstAccess: data.isFirstAccess !== undefined ? data.isFirstAccess : true,
    };
    setCollaborators(prev => {
      const updated = [newCollab, ...prev];
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });
    collaboratorService.upsert(newCollab);

    // Disparo automático e imediato do e-mail de convite oficial
    if (newCollab.email) {
      sendCollaboratorInvite(newCollab.email, newCollab.name, newCollab.role).then(res => {
        console.log('[Auth] Convite automático enviado:', res);
      }).catch(err => {
        console.warn('[Auth] Falha no envio automático do convite:', err);
      });
    }

    return id;
  };

  const updateCollaborator = (id: string, data: Partial<Collaborator>) => {
    // RBAC: Gerentes não podem editar o próprio perfil na lista nem perfis de outros gerentes/superiores
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'gerencia';
    if (isManager) {
      if (id === currentUser?.id) {
        alert('Acesso Negado: Gerentes não podem alterar seu próprio perfil na lista de colaboradores.');
        return;
      }
      const targetCollab = collaborators.find(c => c.id === id);
      if (targetCollab && ['master', 'admin', 'gerencia', 'dev'].includes(targetCollab.role)) {
        alert('Acesso Negado: Gerentes não podem editar outros gerentes ou superiores.');
        return;
      }
      if (data.role && ['master', 'admin', 'gerencia', 'dev'].includes(data.role)) {
        alert('Acesso Negado: Gerentes não podem promover colaboradores para cargos de gerência.');
        return;
      }
    }

    setCollaborators(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });
    collaboratorService.upsert({ id, ...data });
    if (currentUser?.id === id || (currentUser?.role === 'master' && id.includes('master'))) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...data };
        safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const deleteCollaborator = (id: string, reassignToId?: string | null) => {
    deletedCollabIdsRef.current.add(id);
    const targetCollab = collaborators.find(c => c.id === id);
    const targetName = targetCollab?.name;
    const targetCleanEmail = targetCollab?.email?.toLowerCase().trim();
    const newCollab = reassignToId ? collaborators.find(c => c.id === reassignToId) : null;

    // 1. PRESERVAÇÃO COMERCIAL: Reatribui ou desvincula LEADS
    setLeads(prev => {
      const updated = prev.map(lead => {
        let changed = false;
        let sdrId = lead.sdrId;
        let sdrName = lead.sdrName;
        let closerId = lead.closerId;
        let closerName = lead.closerName;
        let assignedTo = lead.assignedTo;

        const matchesTarget = (val?: string) => Boolean(val && (val === id || (targetName && val.toLowerCase() === targetName.toLowerCase())));

        if (matchesTarget(lead.sdrId) || matchesTarget(lead.sdrName)) {
          changed = true;
          if (newCollab) {
            sdrId = newCollab.id;
            sdrName = newCollab.name;
          } else {
            sdrId = undefined;
            sdrName = undefined;
          }
        }

        if (matchesTarget(lead.closerId) || matchesTarget(lead.closerName)) {
          changed = true;
          if (newCollab) {
            closerId = newCollab.id;
            closerName = newCollab.name;
          } else {
            closerId = undefined;
            closerName = undefined;
          }
        }

        if (matchesTarget(lead.assignedTo)) {
          changed = true;
          assignedTo = newCollab ? newCollab.name : 'Sem responsável';
        }

        if (changed) {
          const updatedLead = {
            ...lead,
            sdrId,
            sdrName,
            closerId,
            closerName,
            assignedTo,
          };
          leadService.upsert(updatedLead).catch((e: any) => console.warn('Falha ao persistir lead reatribuído no Supabase:', e));
          return updatedLead;
        }

        return lead;
      });

      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    // 2. TAREFAS:
    // - Remove apenas tarefas particulares sem lead nem debutante associados criadas exclusivamente pelo colaborador
    // - Tarefas vinculadas a leads ou compartilhadas são transferidas para o novo colaborador ou desvinculadas
    setTasks(prev => {
      const remaining: AdminTask[] = [];

      for (const task of prev) {
        const isParticularTask = (task.createdById === id || (targetName && task.createdByName === targetName))
          && !task.leadId 
          && !task.debutanteId 
          && (!task.assignedToIds || task.assignedToIds.length <= 1);

        if (isParticularTask) {
          taskService.delete(task.id).catch((e: any) => console.warn('Erro ao deletar tarefa particular:', e));
          continue;
        }

        let assignedToIds = task.assignedToIds || [];
        if (assignedToIds.includes(id)) {
          if (newCollab) {
            assignedToIds = assignedToIds.map(aId => (aId === id ? newCollab.id : aId));
          } else {
            assignedToIds = assignedToIds.filter(aId => aId !== id);
          }
          const updatedTask = { ...task, assignedToIds };
          taskService.upsert(updatedTask).catch((e: any) => console.warn('Erro ao atualizar tarefa transferida:', e));
          remaining.push(updatedTask);
        } else {
          remaining.push(task);
        }
      }

      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(remaining));
      return remaining;
    });

    // 3. Remove colaborador da lista e do banco de dados
    setCollaborators(prev => {
      const updated = prev.filter(c => c.id !== id && (targetCleanEmail ? c.email.toLowerCase().trim() !== targetCleanEmail : true));
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });

    collaboratorService.delete(id);
  };

  // ── Venue Methods ───────────────────────────────────────────────────────────

  const addVenue = (venueData: Omit<Venue, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const newVenue: Venue = {
      ...venueData,
      bannerImageUrl: venueData.bannerImageUrl || venueData.ballroomImageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
      ballroomImageUrl: venueData.ballroomImageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
      id,
      masterId: venueData.masterId || scopedMasterId || currentUser?.id,
      leadDistributionMode: 'queue',
      leadDistributionSdrIds: [],
      roundRobinNextIndex: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setVenues(prev => {
      const updated = [...prev, newVenue];
      safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(updated));
      return updated;
    });

    // 1. Funil Comercial:
    // Contas possuem 1 funil comercial padrão criado no onboarding.
    // 1. Funil Padrão: Se a conta não tem funil, cria o "Funil de Atendimento" desatrelado de unidade fixa
    let targetFunnelId = '';
    let newlyCreatedFunnel: CommercialFunnel | null = null;

    if (funnels.length === 0) {
      const defaultFunnelId = generateUuid();
      newlyCreatedFunnel = {
        id: defaultFunnelId,
        name: 'Funil de Atendimento',
        category: 'Vendas & Atendimento',
        description: 'Funil padrão de captação, atendimento e conversão de leads.',
        venueId: 'all',
        sharedVenueIds: [],
        allowedCollaboratorIds: [],
        badge: 'Atendimento',
        badgeColor: '#D4AF37',
        icon: 'target',
        stagesCount: 5,
        stages: [
          { id: 'new_lead', name: 'Novo Lead', color: '#3B82F6', isFixed: true, order: 0 },
          { id: 'qualificacao', name: 'Qualificação / Primeiro Contato', color: '#F59E0B', isFixed: false, order: 1 },
          { id: 'visita_agendada', name: 'Visita / Degustação Agendada', color: '#8B5CF6', isFixed: false, order: 2 },
          { id: 'deal_closed', name: 'Venda Fechada (Ganho)', color: '#10B981', isFixed: true, isWon: true, order: 3 },
          { id: 'lost', name: 'Perdido / Não Realizado', color: '#EF4444', isFixed: true, isLoss: true, order: 4 },
        ],
        isPrimary: true,
        isDemo: false,
        createdAt: newVenue.createdAt,
      };

      setFunnels(prev => {
        const updated = [...prev, newlyCreatedFunnel!];
        safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
        return updated;
      });
      targetFunnelId = defaultFunnelId;
    } else {
      // Sempre vincula ao funil principal (Funil de Atendimento ou primário) sem deixar pendência
      const primaryFunnel = funnels.find(f => f.isPrimary) || funnels[0];
      targetFunnelId = primaryFunnel.id;
    }

    // 2. Criar automaticamente a Origem Nativa de Indicação para esta unidade
    const defaultReferralSource: Source = {
      id: generateUuid(),
      venueId: id,
      name: `Indicações • ${newVenue.name}`,
      type: 'referral',
      funnelId: targetFunnelId,
      status: 'active',
      configuration: {
        systemManaged: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSources(prev => {
      const updated = [...prev, defaultReferralSource];
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });

    // 3. MQL: Zero mock questions! O ICP inicia 100% em branco para o usuário configurar.

    // Async sync with Supabase (garantindo sequência referencial estrita)
    (async () => {
      try {
        await venueService.upsert(newVenue);
        if (newlyCreatedFunnel) {
          await funnelService.upsert(newlyCreatedFunnel);
        }
        await sourceService.upsert(defaultReferralSource);
      } catch (err) {
        console.error('Falha ao sincronizar nova casa, funil e origem com Supabase:', err);
      }
    })();

    return id;
  };

  // MQL Questions Management
  const addMqlQuestion = (data: Omit<MqlQuestion, 'id'>): string => {
    const id = generateUuid();
    const newQuestion: MqlQuestion = {
      ...data,
      id,
      order: data.order ?? mqlQuestions.filter(q => q.venueId === data.venueId).length,
    };
    setMqlQuestions(prev => {
      const updated = [...prev, newQuestion];
      safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(updated));
      return updated;
    });
    mqlService.upsert(newQuestion);
    return id;
  };

  const updateMqlQuestion = (id: string, data: Partial<MqlQuestion>) => {
    setMqlQuestions(prev => {
      const updated = prev.map(q => {
        if (q.id === id) {
          const merged = { ...q, ...data };
          mqlService.upsert(merged);
          return merged;
        }
        return q;
      });
      safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteMqlQuestion = (id: string) => {
    setMqlQuestions(prev => {
      const updated = prev.filter(q => q.id !== id);
      safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(updated));
      return updated;
    });
    mqlService.delete(id);
  };

  const saveLeadMqlAnswers = (leadId: string, answers: Record<string, string>, score: number, level: LeadMqlLevel) => {
    updateLeadData(leadId, {
      mqlAnswers: answers,
      mqlScore: score,
      mqlLevel: level,
    });
  };

  const resetVenueLeadsMql = (venueId: string) => {
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.venueId === venueId) {
          const resetLead: Lead = {
            ...lead,
            mqlAnswers: {},
            mqlScore: 0,
            mqlLevel: undefined,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          if (isSupabaseConfigured) {
            leadService.upsert({
              id: lead.id,
              mqlAnswers: {},
              mqlScore: 0,
              mqlLevel: null as any,
            }).catch(err => console.error('Erro ao resetar MQL do lead:', err));
          }
          return resetLead;
        }
        return lead;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
  };

  const updateVenue = async (id: string, venueData: Partial<Venue>) => {
    setVenues(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...venueData } : v);
      safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(updated));
      return updated;
    });

    // O funil comercial é soberano e independente do nome das casas de festa (não altera nome de funil)
    await venueService.upsert({ id, ...venueData });
  };

  const deleteVenue = async (id: string): Promise<{ success: boolean; message?: string; activeDebutantesCount?: number }> => {
    const venue = venues.find(v => v.id === id);
    if (!venue) {
      return { success: false, message: 'Casa de festa não encontrada.' };
    }

    // REGRA DE SEGURANÇA 1: Não podem existir debutantes com jornadas ativas vinculadas a esta casa
    const activeDebutantesWithJourneys = debutantes.filter(d => 
      d.venueId === id &&
      d.status !== 'inactive' &&
      d.hasJourneyEnabled &&
      (d.journeyCycle?.journeyStatus === 'active' || !d.journeyCycle)
    );

    if (activeDebutantesWithJourneys.length > 0) {
      const count = activeDebutantesWithJourneys.length;
      return {
        success: false,
        activeDebutantesCount: count,
        message: `Esta casa de festas possui ${count} debutante(s) com jornada ativa vinculada. Não é possível excluí-la para proteger as fotos, convites e acessos das famílias.`,
      };
    }

    // PRESERVAÇÃO COMERCIAL: Congelar nome histórico da casa em todos os leads associados a ela
    const venueName = venue.name;
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.venueId === id) {
          return {
            ...l,
            venueId: '', // Desvincula para não quebrar após a remoção da casa
            venueName: l.venueName || venueName,
            masterId: l.masterId || venue.masterId || currentUser?.id,
          };
        }
        return l;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    // Atualiza os leads no Supabase com o venue_name congelado antes da remoção
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('leads')
          .update({ venue_name: venueName })
          .eq('venue_id', id);
      } catch (err) {
        console.warn('Erro ao congelar venue_name dos leads no Supabase:', err);
      }
    }

    // Remove a unidade do estado de casas
    setVenues(prev => {
      const updated = prev.filter(v => v.id !== id);
      safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(updated));
      return updated;
    });

    // Remove funis associados
    setFunnels(prev => {
      const updated = prev.filter(f => f.venueId !== id);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    if (activeVenueId === id) {
      setActiveVenueId(null);
    }

    const success = await venueService.delete(id);
    return { success };
  };

  const updateVenueDistribution = (venueId: string, mode: 'queue' | 'round_robin', sdrIds: string[]) => {
    setVenues(prev => prev.map(v => v.id === venueId ? {
      ...v,
      leadDistributionMode: mode,
      leadDistributionSdrIds: sdrIds,
      roundRobinNextIndex: 0,
    } : v));
  };

  // ── Lead Distribution Round Robin ───────────────────────────────────────────

  const distributeLeadRoundRobin = (venueId: string): Collaborator | null => {
    const venue = venues.find(v => v.id === venueId);
    if (!venue || venue.leadDistributionMode !== 'round_robin') return null;

    const activeSdrIds = venue.leadDistributionSdrIds || [];
    if (activeSdrIds.length === 0) return null;

    const currentIndex = venue.roundRobinNextIndex || 0;
    const sdrId = activeSdrIds[currentIndex % activeSdrIds.length];
    const sdr = collaborators.find(c => c.id === sdrId);

    // Advance the queue index
    setVenues(prev => prev.map(v => v.id === venueId ? {
      ...v,
      roundRobinNextIndex: (currentIndex + 1) % activeSdrIds.length,
    } : v));

    return sdr || null;
  };

  // ── Debutante Methods ───────────────────────────────────────────────────────

  const generateSlug = (name: string, date: string): string => {
    const cleanName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'debutante';
    const year = date ? (date.split('-')[0] || '2027') : '2027';
    const randomHex = Math.random().toString(36).substring(2, 6);
    let baseSlug = `${cleanName}-${year}-${randomHex}`;
    let slug = baseSlug;
    let count = 1;
    while (debutantes.some(d => d.slug === slug)) {
      count++;
      slug = `${cleanName}-${year}-${randomHex}${count}`;
    }
    return slug;
  };

  const addDebutanteAccount = (data: {
    venueId: string;
    name: string;
    partyDate: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
    baseGuestLimit?: number;
    hasJourneyEnabled?: boolean;
    welcomeVideoUrl?: string;
    journeyTemplateId?: string;
  }): DebutanteAccount => {
    const id = generateUuid();
    const slug = generateSlug(data.name, data.partyDate);
    const partyTime = new Date(data.partyDate).getTime();
    const nowTime = new Date().getTime();
    const daysLeft = Math.max(0, Math.ceil((partyTime - nowTime) / (1000 * 60 * 60 * 24)));

    const isJourneyActive = data.hasJourneyEnabled ?? true;
    const isPending = isJourneyActive && (!data.journeyTemplateId || data.journeyTemplateId === 'pending' || data.journeyTemplateId === '');
    const selectedTemplate = (!isPending && data.journeyTemplateId) ? templates.find(t => t.id === data.journeyTemplateId) : null;
    const venueObj = venues.find(v => v.id === data.venueId);

    const newAccount: DebutanteAccount = {
      id,
      venueId: data.venueId,
      name: data.name.trim(),
      slug,
      status: 'active',
      partyDate: data.partyDate,
      partyDaysLeft: daysLeft,
      avatarUrl: data.avatarUrl || createMonogramAvatar(data.name.trim()),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      hasJourneyEnabled: isJourneyActive,
      isJourneyPending: isPending,
      welcomeVideoUrl: data.welcomeVideoUrl || venueObj?.welcomeVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      hasSeenWelcomeVideo: false,
      journeyTemplateId: selectedTemplate?.id,
      baseGuestLimit: data.baseGuestLimit || 250,
      extraGuestsUnlocked: 0,
      currentGuestLimit: data.baseGuestLimit || 250,
      validReferrals: 0,
      totalTargetReferrals: 30,
      journeyProgressPercentage: 0,
      convertedReferralSales: 0,
      journeyCycle: {
        journeyStartDate: new Date().toISOString(),
        journeyMaximumEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        currentCycleStartDate: new Date().toISOString(),
        currentCycleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cycleRenewalTarget: 3,
        cycleRenewalProgress: 0,
        journeyStatus: 'active',
      },
      milestones: selectedTemplate ? selectedTemplate.milestones : (isPending ? [] : mockMilestones),
      vipRewards: selectedTemplate ? selectedTemplate.vipRewards : (isPending ? [] : mockVipRewards),
      guests: [],
      referrals: [],
      appointments: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setDebutantes(prev => {
      const updated = [newAccount, ...prev];
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    debutanteService.upsert(newAccount);

    return newAccount;
  };

  const updateDebutanteAccount = (id: string, data: Partial<DebutanteAccount>) => {
    setDebutantes(prev => {
      const updated = prev.map(d => (d.id === id || d.slug === id) ? { ...d, ...data, updatedAt: new Date().toISOString().split('T')[0] } : d);
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    debutanteService.upsert({ id, ...data });
  };

  const linkDebutanteJourney = (debutanteId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    updateDebutanteAccount(debutanteId, {
      hasJourneyEnabled: true,
      isJourneyPending: false,
      journeyTemplateId: template.id,
      milestones: template.milestones || [],
      vipRewards: template.vipRewards || [],
    });
  };

  // ── Funis Fixados por Usuário (Escopo Individual / Não Global) ─────────────
  const [userPinnedFunnelIds, setUserPinnedFunnelIds] = useState<string[]>(() => {
    const userId = currentUser?.id || 'default';
    const stored = safeLocalStorageGet(`f5_pinned_funnels_${userId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return ['41d857a5-107e-4607-908c-7ebd5ba32cc9']; // Default SDR se não personalizado
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    const stored = safeLocalStorageGet(`f5_pinned_funnels_${currentUser.id}`);
    if (stored) {
      try {
        setUserPinnedFunnelIds(JSON.parse(stored));
      } catch (e) {
        setUserPinnedFunnelIds([]);
      }
    }
  }, [currentUser?.id]);

  const togglePinFunnel = (funnelId: string) => {
    const userId = currentUser?.id || 'default';
    setUserPinnedFunnelIds(prev => {
      const next = prev.includes(funnelId)
        ? prev.filter(id => id !== funnelId)
        : [...prev, funnelId];
      safeLocalStorageSet(`f5_pinned_funnels_${userId}`, JSON.stringify(next));
      return next;
    });
  };

  const isFunnelPinned = (funnelId: string): boolean => {
    return userPinnedFunnelIds.includes(funnelId);
  };

  // ── Funnels CRUD ───────────────────────────────────────────────────────────

  const addFunnel = (data: Omit<CommercialFunnel, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const newFunnel: CommercialFunnel = {
      ...data,
      id,
      masterId: data.masterId || scopedMasterId || currentUser?.id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setFunnels(prev => {
      const updated = [newFunnel, ...prev];
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    funnelService.upsert(newFunnel);

    return id;
  };

  const updateFunnel = async (id: string, data: Partial<CommercialFunnel>) => {
    const existingFunnel = funnels.find(f => f.id === id);
    const oldName = existingFunnel?.name;

    const payloadWithPinned: Partial<CommercialFunnel> = { ...data };
    if (data.isPinned === true && !data.pinnedAt && !existingFunnel?.pinnedAt) {
      payloadWithPinned.pinnedAt = new Date().toISOString();
    } else if (data.isPinned === false) {
      payloadWithPinned.pinnedAt = undefined;
    }

    setFunnels(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...payloadWithPinned } : f);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    // Se o funil foi renomeado, assegura que nenhum lead ou origem perca o vínculo
    if (oldName && data.name && oldName.trim() !== data.name.trim()) {
      setLeads(prev => {
        let hasChanges = false;
        const updated = prev.map(l => {
          if (l.funnelId === oldName || l.funnelId === id) {
            hasChanges = true;
            return { ...l, funnelId: id };
          }
          return l;
        });
        if (hasChanges) {
          safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
        }
        return updated;
      });

      setSources(prev => {
        let hasChanges = false;
        const updated = prev.map(s => {
          if (s.funnelId === oldName || s.funnelId === id) {
            hasChanges = true;
            return { ...s, funnelId: id };
          }
          return s;
        });
        if (hasChanges) {
          safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
        }
        return updated;
      });

      if (isSupabaseConfigured) {
        supabase
          .from('leads')
          .update({ funnel_id: id })
          .or(`funnel_id.eq.${id},funnel_id.eq.${oldName}`)
          .then(({ error }) => {
            if (error) console.warn('[updateFunnel] Erro ao sincronizar leads com novo nome do funil:', error);
          });
      }
    }

    await funnelService.upsert({ id, ...data });
  };

  const deleteFunnel = (id: string) => {
    // Validação de proteção: proibido excluir se houver apenas 1 funil ativo na conta
    if (funnels.length <= 1) {
      alert("Você não pode excluir este funil, pois é obrigatório ter ao menos um funil ativo na sua conta.");
      return;
    }

    setFunnels(prev => {
      const updated = prev.filter(f => f.id !== id);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    // Se houver origens apontando para este funil excluído, desconfigura e inativa para alertar o usuário
    setSources(prev => {
      const updated = prev.map(s => {
        if (s.funnelId === id) {
          const unconfigured = { ...s, funnelId: '', status: 'inactive' as const, updatedAt: new Date().toISOString() };
          sourceService.upsert(unconfigured);
          return unconfigured;
        }
        return s;
      });
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });

    funnelService.delete(id);
  };

  const deleteFunnelWithLeadMigration = async (
    funnelId: string,
    destinationFunnelId: string,
    stageMapping: Record<string, string>
  ): Promise<{ success: boolean; migratedLeadsCount: number; updatedSourcesCount: number }> => {
    if (funnels.length <= 1) {
      alert("Você não pode excluir este funil, pois é obrigatório ter ao menos um funil ativo na sua conta.");
      return { success: false, migratedLeadsCount: 0, updatedSourcesCount: 0 };
    }

    const funnelToDelete = funnels.find(f => f.id === funnelId);
    const isUnassigned = destinationFunnelId === 'unassigned' || !destinationFunnelId;
    const destFunnel = isUnassigned ? null : funnels.find(f => f.id === destinationFunnelId);
    if (!funnelToDelete || (!isUnassigned && !destFunnel)) {
      return { success: false, migratedLeadsCount: 0, updatedSourcesCount: 0 };
    }

    const deletedFunnelName = funnelToDelete.name;
    const destFunnelName = isUnassigned ? 'Sem Funil (Desatribuído)' : destFunnel!.name;

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const destDefaultFirstStage = destFunnel?.stages?.[0]?.id || 'in_analysis';

    const updatedLeadsList: Lead[] = [];

    // 1. Migrate leads
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.funnelId !== funnelId) return lead;

        let targetStage: any = lead.stage;

        if (isUnassigned) {
          // Desatribui mantendo histórico
          targetStage = lead.stage || 'new_lead';
        } else if (lead.stage === 'contract_signed' || (lead.stage as string) === 'deal_closed') {
          targetStage = 'contract_signed';
        } else if (lead.stage === 'lost') {
          targetStage = 'lost';
        } else if (lead.stage === 'new_lead') {
          targetStage = destFunnel!.isEntryStageActive ? 'new_lead' : destDefaultFirstStage;
        } else if (stageMapping[lead.stage]) {
          targetStage = stageMapping[lead.stage];
        } else {
          targetStage = destDefaultFirstStage;
        }

        const migrationActivity: LeadActivity = {
          id: generateUuid(),
          leadId: lead.id,
          timestamp: now,
          type: 'status_change',
          title: 'Migração de Funil',
          text: isUnassigned
            ? `Lead desatribuído do funil "${deletedFunnelName}" devido à exclusão do funil de origem.`
            : `Lead migrado do funil "${deletedFunnelName}" para o funil "${destFunnelName}" (etapa: "${targetStage}") devido à exclusão do funil de origem.`,
          authorName: currentUser?.name || 'Sistema F5',
          authorId: currentUser?.id || 'system_bot',
          authorAvatarUrl: currentUser?.avatarUrl || '/logo_f5.png',
        };

        const modifiedLead: Lead = {
          ...lead,
          funnelId: isUnassigned ? undefined : destinationFunnelId,
          stage: targetStage,
          activities: [migrationActivity, ...(lead.activities || [])],
          updatedAt: today,
        };

        updatedLeadsList.push(modifiedLead);
        return modifiedLead;
      });

      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    // Supabase update for migrated leads
    if (isSupabaseConfigured && updatedLeadsList.length > 0) {
      for (const mLead of updatedLeadsList) {
        leadService.upsert({
          id: mLead.id,
          funnelId: isUnassigned ? null as any : destinationFunnelId,
          stage: mLead.stage,
        }).catch(err => console.error('Erro ao migrar lead no Supabase:', err));

        leadService.addActivity(mLead.id, {
          leadId: mLead.id,
          timestamp: now,
          type: 'status_change',
          title: 'Migração de Funil',
          text: isUnassigned
            ? `Lead desatribuído do funil "${deletedFunnelName}" devido à exclusão do funil de origem.`
            : `Lead migrado do funil "${deletedFunnelName}" para o funil "${destFunnelName}" (etapa: "${mLead.stage}") devido à exclusão do funil de origem.`,
          authorName: currentUser?.name || 'Sistema F5',
          authorId: currentUser?.id,
          authorAvatarUrl: currentUser?.avatarUrl,
        }).catch(err => console.error('Erro ao adicionar atividade no Supabase:', err));
      }
    }

    // 2. Re-route sources
    let updatedSourcesCount = 0;
    setSources(prev => {
      const updated = prev.map(s => {
        if (s.funnelId === funnelId) {
          updatedSourcesCount++;
          const rerouted = { 
            ...s, 
            funnelId: isUnassigned ? '' : destinationFunnelId, 
            status: isUnassigned ? ('inactive' as const) : s.status,
            updatedAt: now 
          };
          if (isSupabaseConfigured) {
            sourceService.upsert(rerouted).catch(err => console.error('Erro ao re-rotear fonte:', err));
          }
          return rerouted;
        }
        return s;
      });
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });


    // 3. Delete funnel
    setFunnels(prev => {
      const updated = prev.filter(f => f.id !== funnelId);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    await funnelService.delete(funnelId);

    return {
      success: true,
      migratedLeadsCount: updatedLeadsList.length,
      updatedSourcesCount,
    };
  };

  const duplicateFunnel = (funnelId: string, targetVenueId?: string): string => {
    const source = funnels.find(f => f.id === funnelId);
    if (!source) return '';
    const newId = generateUuid();
    const clonedFunnel: CommercialFunnel = {
      ...source,
      id: newId,
      name: `${source.name} (Cópia)`,
      venueId: targetVenueId || source.venueId,
      isPrimary: false,
      isPinned: false,
      createdAt: new Date().toISOString().split('T')[0],
      stages: source.stages ? JSON.parse(JSON.stringify(source.stages)) : undefined,
      customFields: source.customFields ? JSON.parse(JSON.stringify(source.customFields)) : undefined,
    };
    setFunnels(prev => {
      const updated = [clonedFunnel, ...prev];
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });
    funnelService.upsert(clonedFunnel);
    return newId;
  };

  const reorderFunnels = async (orderedFunnels: CommercialFunnel[]): Promise<void> => {
    const withUpdatedOrder = orderedFunnels.map((f, idx) => ({ ...f, order: idx }));
    setFunnels(withUpdatedOrder);
    safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(withUpdatedOrder));
    await funnelService.reorderFunnels(withUpdatedOrder);
  };

  const markLeadAsRead = (leadId: string) => {
    setLeads(prev => {
      let changed = false;
      const updated = prev.map(l => {
        if (l.id === leadId && (l.unreadCount || 0) > 0) {
          changed = true;
          return { ...l, unreadCount: 0 };
        }
        return l;
      });
      if (changed) {
        safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // ── Leads Desindexados & Realocação de Funil ────────────────────────────────
  const unindexedLeadsCount = useMemo(() => {
    const validFunnelIds = new Set(scopedFunnels.map(f => f.id));
    return scopedLeads.filter(l => !l.funnelId || !validFunnelIds.has(l.funnelId)).length;
  }, [scopedLeads, scopedFunnels]);

  const reassignLeadFunnel = async (leadId: string, destinationFunnelId: string, stageId?: string): Promise<boolean> => {
    const targetLead = leads.find(l => l.id === leadId);
    const destFunnel = funnels.find(f => f.id === destinationFunnelId);
    if (!targetLead || !destFunnel) return false;

    const defaultStage = (stageId || destFunnel.stages?.[0]?.id || 'in_analysis') as CrmStage;
    const oldFunnel = funnels.find(f => f.id === targetLead.funnelId);
    const oldFunnelName = oldFunnel ? oldFunnel.name : 'Sem Funil (Desindexado)';
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const activity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: now,
      type: 'status_change',
      title: 'Realocação de Funil',
      text: `Lead realocado de "${oldFunnelName}" para "${destFunnel.name}" (etapa: "${defaultStage}").`,
      authorName: currentUser?.name || 'Sistema F5',
      authorId: currentUser?.id,
      authorAvatarUrl: currentUser?.avatarUrl,
    };

    const isDestPostSale = Boolean(
      destFunnel.isPostSale ||
      destFunnel.category === 'Pós-Venda' ||
      destFunnel.category === 'pos_venda' ||
      destFunnel.name?.toLowerCase().includes('pós-venda') ||
      destFunnel.name?.toLowerCase().includes('pos-venda') ||
      destFunnel.name?.toLowerCase().includes('sucesso do cliente')
    );

    setLeads(prev => {
      const updated = prev.map(l => l.id === leadId ? {
        ...l,
        funnelId: destinationFunnelId,
        stage: defaultStage,
        venueId: destFunnel.venueId !== 'all' ? destFunnel.venueId : l.venueId,
        group: isDestPostSale ? 'Pós-Venda' : 'Comercial',
        isClient: isDestPostSale ? true : false,
        activities: [activity, ...(l.activities || [])],
        updatedAt: today,
      } : l);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    if (isDestPostSale) {
      const targetVenueId = destFunnel.venueId !== 'all' ? destFunnel.venueId : targetLead.venueId;
      const targetVenue = venues.find(v => v.id === targetVenueId);
      const postSaleClient: Client = {
        id: targetLead.id,
        code: targetLead.code || `CLI-${targetLead.id.slice(0, 5).toUpperCase()}`,
        name: targetLead.name,
        payerName: (targetLead as any).payerName || targetLead.name,
        payerPhone: targetLead.phone,
        birthdayPersonName: (targetLead as any).birthdayPersonName || targetLead.name,
        eventType: targetLead.eventType || '15_anos',
        eventDate: targetLead.partyDate || (targetLead as any).eventDate || today,
        guestCount: (targetLead as any).guestCount || targetLead.estimatedGuests || 150,
        packageSold: (targetLead as any).packageSold || 'Pacote Padrão',
        dealValue: targetLead.dealValue || 0,
        contractDate: (targetLead as any).contractDate || today,
        stage: (defaultStage as any) || 'onboarding',
        venueId: targetVenueId || targetLead.venueId || '',
        venueName: targetVenue?.name || targetLead.venueName || '',
        commercialLeadId: targetLead.id,
        contractStatus: 'contrato_assinado',
        activities: [],
        createdAt: targetLead.createdAt || now,
        updatedAt: today,
      };
      setClients(prev => {
        const idx = prev.findIndex(c => c.id === targetLead.id || c.commercialLeadId === targetLead.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], stage: (defaultStage as any) || copy[idx].stage };
          return copy;
        }
        return [postSaleClient, ...prev];
      });
      clientService.upsert(postSaleClient).catch(err => console.error('Erro ao sincronizar cliente pós-venda:', err));
    }

    if (isSupabaseConfigured) {
      await leadService.upsert({
        id: leadId,
        funnelId: destinationFunnelId,
        stage: defaultStage,
        venueId: destFunnel.venueId !== 'all' ? destFunnel.venueId : undefined,
        group: isDestPostSale ? 'Pós-Venda' : 'Comercial',
        isClient: isDestPostSale ? true : false,
      }).catch(err => console.error('Erro ao realocar lead no Supabase:', err));

      leadService.addActivity(leadId, activity).catch(err => console.error('Erro ao registrar atividade:', err));
    }
    return true;
  };

  const reassignMultipleLeadsFunnel = async (
    leadIds: string[], 
    destinationFunnelId: string, 
    stageId?: string
  ): Promise<{ successCount: number; failedCount: number }> => {
    let successCount = 0;
    let failedCount = 0;

    for (const id of leadIds) {
      const ok = await reassignLeadFunnel(id, destinationFunnelId, stageId);
      if (ok) successCount++;
      else failedCount++;
    }
    return { successCount, failedCount };
  };

  // ── Unconfigured Sources Warning ───────────────────────────────────────────
  const unconfiguredSources = useMemo(() => {
    const validFunnelIds = new Set(scopedFunnels.map(f => f.id));
    return scopedSources.filter(s => {
      if (s.status === 'inactive') return false;
      // Se estiver filtrado por casa, verifica apenas as origens dessa casa
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi' && s.venueId && s.venueId !== activeVenueId) {
        return false;
      }
      return !s.funnelId || s.funnelId === '' || !validFunnelIds.has(s.funnelId);
    });
  }, [scopedSources, scopedFunnels, activeVenueId]);

  const hasUnconfiguredSources = unconfiguredSources.length > 0;
  const unconfiguredSourcesCount = unconfiguredSources.length;

  // ── Sources CRUD ───────────────────────────────────────────────────────────

  const addSource = async (data: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateUuid();
    const newSource: Source = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSources(prev => {
      const updated = [newSource, ...prev];
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });

    await sourceService.upsert(newSource);
    return id;
  };

  const updateSource = async (id: string, data: Partial<Source>) => {
    setSources(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });

    const target = sources.find(s => s.id === id);
    if (target) {
      await sourceService.upsert({ ...target, ...data, id });
    }
  };

  const deleteSource = async (id: string) => {
    setSources(prev => {
      const updated = prev.filter(s => s.id !== id);
      safeLocalStorageSet(STORAGE_KEY_SOURCES, JSON.stringify(updated));
      return updated;
    });

    await sourceService.delete(id);
  };

  const toggleSourceStatus = async (id: string, active: boolean) => {
    await updateSource(id, { status: active ? 'active' : 'inactive' });
  };

  const deleteDebutanteAccount = async (idOrSlug: string): Promise<void> => {
    // Somente gerentes da casa (admin) e diretoria master têm permissão para excluir aniversariantes
    const canDelete = currentUser?.role === 'master' || currentUser?.role === 'admin';
    if (!canDelete) {
      alert('Apenas gerentes e diretoria master possuem permissão para excluir aniversariantes.');
      return;
    }

    const targetDeb = debutantes.find(d => d.id === idOrSlug || d.slug === idOrSlug);
    const targetName = targetDeb?.name;

    // Registra imediatamente no conjunto anti-flicker
    if (targetDeb) {
      deletedDebutanteIdsRef.current.add(targetDeb.id);
      deletedDebutanteIdsRef.current.add(targetDeb.slug);
    }
    deletedDebutanteIdsRef.current.add(idOrSlug);

    // PRESERVAÇÃO COMERCIAL: Mantém os leads e indicações no CRM com o nome da debutante indicadora preservado
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.debutanteId === idOrSlug || (targetDeb && l.debutanteId === targetDeb.id) || l.debutanteSlug === idOrSlug) {
          return {
            ...l,
            debutanteId: '',
            debutanteName: l.debutanteName || targetName || 'Aniversariante',
          };
        }
        return l;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    setDebutantes(prev => {
      const updated = prev.filter(d => d.id !== idOrSlug && d.slug !== idOrSlug);
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    await debutanteService.delete(idOrSlug);
  };

  const setDebutanteStatus = (idOrSlug: string, status: 'active' | 'inactive') => {
    setDebutantes(prev => {
      const updated = prev.map(d => (d.id === idOrSlug || d.slug === idOrSlug) ? { ...d, status } : d);
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    debutanteService.setStatus(idOrSlug, status);
  };

  const toggleDebutanteStatus = (idOrSlug: string) => {
    const current = debutantes.find(d => d.id === idOrSlug || d.slug === idOrSlug);
    const nextStatus = (current?.status === 'inactive') ? 'active' : 'inactive';
    setDebutanteStatus(idOrSlug, nextStatus);
  };

  const updateDebutanteModuleToggle = (id: string, hasJourneyEnabled: boolean) => {
    updateDebutanteAccount(id, { hasJourneyEnabled });
  };

  const updateDebutanteMilestones = (id: string, milestones: Milestone[]) => {
    updateDebutanteAccount(id, { milestones });
  };

  const updateDebutanteVipRewards = (id: string, vipRewards: VipReward[]) => {
    updateDebutanteAccount(id, { vipRewards });
  };

  const markWelcomeVideoSeen = (slugOrId: string) => {
    setDebutantes(prev => prev.map(d => {
      if (d.slug === slugOrId || d.id === slugOrId) {
        return { ...d, hasSeenWelcomeVideo: true };
      }
      return d;
    }));
  };

  // ── Clientes & Pós-Venda (F5 System) ────────────────────────────────────────

  const addClient = (clientData: Partial<Client>): string => {
    const id = clientData.id || generateUuid();
    const code = clientData.code || generateClientCode();
    const birthdayPersonName = clientData.birthdayPersonName?.trim() || clientData.name?.trim() || 'Nova Aniversariante';
    const targetVenueId = clientData.venueId || activeVenueId || venues[0]?.id || '';
    const venueObj = venues.find(v => v.id === targetVenueId);

    const newClient: Client = {
      id,
      code,
      name: birthdayPersonName,
      payerName: clientData.payerName?.trim() || 'Responsável',
      payerRelationship: clientData.payerRelationship || 'mother',
      payerCpf: clientData.payerCpf || '',
      payerPhone: clientData.payerPhone || '',
      payerEmail: clientData.payerEmail || '',
      payerAddress: clientData.payerAddress || '',
      payerNeighborhood: clientData.payerNeighborhood || '',
      payerCity: clientData.payerCity || '',
      birthdayPersonName,
      birthdayPersonAge: clientData.birthdayPersonAge || 15,
      birthdayPersonBirthdate: clientData.birthdayPersonBirthdate || '',
      eventType: clientData.eventType || '15_anos',
      eventDate: clientData.eventDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      eventTime: clientData.eventTime || '20:00 às 02:00',
      guestCount: clientData.guestCount || 150,
      venueId: targetVenueId,
      venueName: venueObj?.name || 'Bonomo Festas',
      packageSold: clientData.packageSold || 'Pacote Completo',
      dealValue: clientData.dealValue || 0,
      contractDate: clientData.contractDate || new Date().toISOString().split('T')[0],
      paymentTerms: clientData.paymentTerms || '',
      paymentStatus: clientData.paymentStatus || 'up_to_date',
      stage: clientData.stage || 'onboarding',
      assignedSuccessManagerId: clientData.assignedSuccessManagerId || currentUser?.id,
      assignedSuccessManagerName: clientData.assignedSuccessManagerName || currentUser?.name,
      debutanteId: clientData.debutanteId || null,
      debutanteSlug: clientData.debutanteSlug || null,
      commercialLeadId: clientData.commercialLeadId,
      commercialLeadCode: clientData.commercialLeadCode,
      commercialHistory: clientData.commercialHistory,
      notes: clientData.notes || '',
      documents: clientData.documents || [],
      activities: clientData.activities || [
        {
          id: generateUuid(),
          type: 'status_change',
          description: 'Cliente cadastrado no Pós-Venda.',
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.name || 'Administrador',
        }
      ],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setClients(prev => {
      const updated = [newClient, ...prev];
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });

    clientService.upsert(newClient);
    return id;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          const mod: Client = {
            ...c,
            ...updates,
            name: updates.birthdayPersonName || updates.name || c.name,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteClient = (id: string) => {
    setClients(prev => {
      const updated = prev.filter(c => c.id !== id);
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
    clientService.delete(id);
  };

  const updateClientStage = (id: string, stage: ClientStage) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          const stageLabels: Record<ClientStage, string> = {
            onboarding: 'Onboarding & Boas-Vindas',
            planning: 'Planejamento & Cronograma',
            suppliers: 'Definição de Fornecedores',
            final_alignment: 'Alinhamento Final',
            party_day: 'Semana do Evento',
            completed: 'Festa Realizada',
            archived: 'Arquivado',
          };
          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'status_change',
            description: `Avançou para a etapa "${stageLabels[stage] || stage}".`,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Administrador',
          };
          const mod: Client = {
            ...c,
            stage,
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addClientNote = (id: string, noteText: string) => {
    if (!noteText.trim()) return;
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'note',
            description: noteText.trim(),
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Equipe de Sucesso',
          };
          const mod: Client = {
            ...c,
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addClientDocument = (id: string, doc: Omit<ClientDocument, 'id' | 'uploadedAt'>) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          const newDoc: ClientDocument = {
            ...doc,
            id: generateUuid(),
            uploadedAt: new Date().toISOString().split('T')[0],
          };
          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'document_uploaded',
            description: `Documento anexado: ${doc.title}`,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Administrador',
          };
          const mod: Client = {
            ...c,
            documents: [newDoc, ...(c.documents || [])],
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const linkClientDebutante = (clientId: string, debutanteId: string | null) => {
    let debSlug: string | null = null;
    if (debutanteId) {
      const targetDeb = debutantes.find(d => d.id === debutanteId);
      debSlug = targetDeb?.slug || null;
    }

    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === clientId) {
          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'debutante_linked',
            description: debutanteId 
              ? `Vinculado ao App de Lista de Convidados (/app/${debSlug || debutanteId}).`
              : 'Desvinculado do App de Lista de Convidados.',
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Administrador',
          };
          const mod: Client = {
            ...c,
            debutanteId,
            debutanteSlug: debSlug,
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addClientUpsellSale = (clientId: string, sale: Omit<import('../types/admin').ClientUpsellSale, 'id' | 'clientId' | 'createdAt'>) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === clientId) {
          const newUpsell: import('../types/admin').ClientUpsellSale = {
            ...sale,
            id: generateUuid(),
            clientId,
            createdAt: new Date().toISOString(),
          };
          const baseContract = c.baseContractValue !== undefined ? c.baseContractValue : (c.dealValue || 0);
          const currentUpsells = c.upsellSales || [];
          const newUpsells = [newUpsell, ...currentUpsells];
          const totalUpsellValue = newUpsells.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
          const newTotalDealValue = baseContract + totalUpsellValue;

          const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.value);
          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'upsell_added',
            description: `Venda adicional (Upsell) registrada: "${sale.title}" no valor de ${formattedVal}.`,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Equipe de Sucesso',
          };

          const mod: Client = {
            ...c,
            baseContractValue: baseContract,
            upsellSales: newUpsells,
            dealValue: newTotalDealValue,
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const updateClientUpsellSale = (clientId: string, saleId: string, updates: Partial<import('../types/admin').ClientUpsellSale>) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === clientId) {
          const currentUpsells = c.upsellSales || [];
          const newUpsells = currentUpsells.map(s => s.id === saleId ? { ...s, ...updates } : s);
          const baseContract = c.baseContractValue !== undefined ? c.baseContractValue : (c.dealValue || 0);
          const totalUpsellValue = newUpsells.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
          const newTotalDealValue = baseContract + totalUpsellValue;

          const mod: Client = {
            ...c,
            baseContractValue: baseContract,
            upsellSales: newUpsells,
            dealValue: newTotalDealValue,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteClientUpsellSale = (clientId: string, saleId: string) => {
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === clientId) {
          const currentUpsells = c.upsellSales || [];
          const targetUpsell = currentUpsells.find(s => s.id === saleId);
          const newUpsells = currentUpsells.filter(s => s.id !== saleId);
          const baseContract = c.baseContractValue !== undefined ? c.baseContractValue : (c.dealValue || 0);
          const totalUpsellValue = newUpsells.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
          const newTotalDealValue = baseContract + totalUpsellValue;

          const newActivity: ClientActivity = {
            id: generateUuid(),
            type: 'upsell_removed',
            description: `Venda adicional (Upsell) removida: "${targetUpsell?.title || 'Serviço'}".`,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Equipe de Sucesso',
          };

          const mod: Client = {
            ...c,
            baseContractValue: baseContract,
            upsellSales: newUpsells,
            dealValue: newTotalDealValue,
            activities: [newActivity, ...c.activities],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          clientService.upsert(mod);
          return mod;
        }
        return c;
      });
      safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const addParticipantToLead = (
    lead: Lead,
    collaboratorId: string,
    collaboratorName: string,
    collaboratorRole: AdminRole,
    collaboratorAvatarUrl: string | undefined,
    action: string
  ): LeadParticipant[] => {
    const participant: LeadParticipant = {
      id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      collaboratorId,
      collaboratorName,
      collaboratorRole,
      collaboratorAvatarUrl,
      action,
      timestamp: new Date().toISOString(),
    };
    return [...(lead.participants || []), participant];
  };

  const syncDebutanteLeadStats = (debutanteId: string, currentUpdatedLeads?: Lead[]) => {
    if (!debutanteId) return;
    setDebutantes(prev => prev.map(d => {
      if (d.id !== debutanteId) return d;

      const leadSource = currentUpdatedLeads || leads;
      const debLeads = leadSource.filter(l => l.debutanteId === debutanteId);
      const validCount = debLeads.filter(l => l.isValidated).length;
      const salesCount = debLeads.filter(l => {
        const s = l.stage as string;
        return s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado';
      }).length;
      const progress = d.totalTargetReferrals > 0 
        ? Math.min(100, Math.round((validCount / d.totalTargetReferrals) * 100))
        : 0;

      // Update matching referrals inside the debutante account
      const updatedReferrals = (d.referrals || []).map(ref => {
        const matchingLead = debLeads.find(l => 
          l.id === ref.id || 
          (l.phone && ref.phone && l.phone.replace(/\D/g, '') === ref.phone.replace(/\D/g, '')) ||
          (l.name && ref.name && l.name.toLowerCase() === ref.name.toLowerCase())
        );
        if (matchingLead) {
          const s = matchingLead.stage as string;
          const isSale = s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado';
          return {
            ...ref,
            status: (isSale || matchingLead.isValidated) ? ('validated' as const) : ref.status,
            pointsGranted: (isSale || matchingLead.isValidated) ? 1 : ref.pointsGranted,
            convertedToSale: isSale,
            saleValue: isSale ? matchingLead.dealValue : undefined,
          };
        }
        return ref;
      });

      const updatedAccount: DebutanteAccount = {
        ...d,
        validReferrals: validCount,
        convertedReferralSales: salesCount,
        journeyProgressPercentage: progress,
        referrals: updatedReferrals,
      };

      try {
        const stored = localStorage.getItem(STORAGE_KEY_DEBUTANTES);
        if (stored) {
          const parsed = JSON.parse(stored);
          const next = parsed.map((item: any) => item.id === d.id ? updatedAccount : item);
          safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(next));
        }
      } catch (e) {
        // ignore
      }

      if (isSupabaseConfigured) {
        debutanteService.upsert({
          id: d.id,
          validReferrals: validCount,
          convertedReferralSales: salesCount,
          journeyProgressPercentage: progress,
          referrals: updatedReferrals,
        }).catch(err => console.error('Erro ao sincronizar debutante no Supabase:', err));
      }

      return updatedAccount;
    }));
  };

  const updateLeadStage = (leadId: string, newStage: CrmStage) => {
    const targetLead = leads.find(l => l.id === leadId);

    // Regra F5 System: Não é permitido retornar para "Novo Lead" após ter avançado no funil
    if (targetLead && targetLead.stage !== 'new_lead' && newStage === 'new_lead') {
      alert('Regra do CRM: A coluna "Novo Lead" é exclusivamente uma porta de entrada do sistema. Leads que já avançaram no pipeline não podem retornar para ela.');
      return;
    }

    const stageLabels: Record<string, string> = {
      new_lead: 'Novo Lead',
      in_analysis: 'Em Análise',
      in_negotiation: 'Em Negociação',
      negotiation: 'Em Negociação',
      meeting_scheduled: 'Visita / Reunião Agendada',
      visit_scheduled: 'Visita Agendada',
      proposal_sent: 'Proposta Enviada',
      contract_signed: 'Contrato Fechado',
      deal_closed: 'Contrato Fechado',
      contrato_fechado: 'Contrato Fechado',
      lost: 'Perdido / Recusado',
      won: 'Ganho',
      onboarding: 'Onboarding & Boas-Vindas',
      planning: 'Planejamento & Cronograma',
      suppliers: 'Definição de Fornecedores',
      final_alignment: 'Alinhamento Final',
      party_day: 'Semana da Festa',
      completed: 'Festa Realizada',
      festa_realizada: 'Festa Realizada',
      archived: 'Arquivado',
    };

    const findStageName = (sId: string): string => {
      if (targetLead?.funnelId) {
        const leadFunnel = funnels.find(f => f.id === targetLead.funnelId || f.name === targetLead.funnelId);
        const stageMatch = leadFunnel?.stages?.find(s => s.id === sId);
        if (stageMatch?.name) return stageMatch.name;
      }
      for (const f of funnels) {
        const stageMatch = f.stages?.find(s => s.id === sId);
        if (stageMatch?.name) return stageMatch.name;
      }
      return stageLabels[sId] || sId;
    };

    const oldStageLabel = targetLead ? findStageName(targetLead.stage) : 'Etapa inicial';
    const newStageLabel = findStageName(newStage);

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'status_change',
      title: 'Etapa Alterada',
      text: `Status movido de "${oldStageLabel}" para "${newStageLabel}" por ${author}.`,
      authorName: author,
      authorId: authorId || 'system_bot',
      authorAvatarUrl: authorAvatar || '/logo_f5.png',
    };

    // Regra: Ao mover para qualquer estágio após "Novo Lead" (ex: Em Análise), se não tiver SDR, o usuário assume como SDR
    const shouldClaimSdr = newStage !== 'new_lead' && (!targetLead?.sdrId && !targetLead?.assignedTo) && Boolean(authorId);

    // Automação de Gatilhos da Etapa de Destino (ex: Transferência Automática de Funil)
    const currentLeadFunnel = funnels.find(f => f.id === targetLead?.funnelId || f.name === targetLead?.funnelId);
    const destStageConfig = currentLeadFunnel?.stages?.find(s => s.id === newStage);
    const moveFunnelTrigger = destStageConfig?.triggers?.find(t => (t.type === 'move_to_funnel' || (t as any).type === 'transfer_funnel') && t.targetFunnelId);

    let finalFunnelId = targetLead?.funnelId;
    let finalStage = newStage;
    let autoTriggerActivity: LeadActivity | null = null;

    if (moveFunnelTrigger && moveFunnelTrigger.targetFunnelId) {
      const targetFunnel = funnels.find(f => f.id === moveFunnelTrigger.targetFunnelId);
      if (targetFunnel) {
        finalFunnelId = targetFunnel.id;
        finalStage = (moveFunnelTrigger.targetStageId || targetFunnel.stages?.[0]?.id || 'new_lead') as CrmStage;
        const targetStageName = targetFunnel.stages?.find(s => s.id === finalStage)?.name || finalStage;

        autoTriggerActivity = {
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'status_change',
          title: 'Gatilho de Automação',
          text: `Gatilho da etapa "${destStageConfig?.name || newStageLabel}" acionado: Lead transferido automaticamente para o funil "${targetFunnel.name}" na etapa "${targetStageName}".`,
          authorName: 'Robô F5 Automações',
          authorId: 'system_bot',
          authorAvatarUrl: '/logo_f5.png',
        };
      }
    }

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      // Add participant record
      let updatedParticipants = lead.participants || [];
      if (authorId && !updatedParticipants.find(p => p.collaboratorId === authorId)) {
        updatedParticipants = addParticipantToLead(
          lead, authorId, author,
          currentUser?.role || 'sdr',
          authorAvatar,
          shouldClaimSdr ? 'sdr_claimed' : 'stage_changed'
        );
      }

      const activitiesToAdd = autoTriggerActivity ? [autoTriggerActivity, newActivity] : [newActivity];

      return {
        ...lead,
        stage: finalStage,
        funnelId: finalFunnelId,
        sdrId: shouldClaimSdr ? authorId : lead.sdrId,
        sdrName: shouldClaimSdr ? author : lead.sdrName,
        assignedTo: shouldClaimSdr ? author : lead.assignedTo,
        participants: updatedParticipants,
        activities: [...activitiesToAdd, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    // Sincronização automática com a Debutante caso seja Ganho (Venda)
    const isWonStageTransition = finalStage === 'contract_signed' || (finalStage as string) === 'deal_closed' || (finalStage as string) === 'contrato_fechado';
    if (isWonStageTransition && targetLead?.debutanteId) {
      setTimeout(() => {
        syncDebutanteLeadStats(targetLead.debutanteId);
      }, 60);
    }

    // Sincronização automática com o Pós-Venda se for um Cliente ou Funil de Pós-Venda
    const isTargetPostSale = Boolean(targetLead?.isClient || targetLead?.group === 'Pós-Venda' || currentLeadFunnel?.isPostSale || currentLeadFunnel?.category === 'Pós-Venda');
    if (isTargetPostSale) {
      setClients(prev => prev.map(c => {
        if (c.id === leadId || c.commercialLeadId === leadId) {
          const mod: Client = { ...c, stage: finalStage as any, updatedAt: new Date().toISOString().split('T')[0] };
          clientService.upsert(mod).catch(() => {});
          return mod;
        }
        return c;
      }));
    }

    // Sincronização 100% no Supabase
    if (isSupabaseConfigured) {
      const updatePayload: any = {
        id: leadId,
        stage: finalStage,
        funnel_id: finalFunnelId,
      };
      if (shouldClaimSdr) {
        updatePayload.sdrId = authorId;
        updatePayload.sdrName = author;
        updatePayload.assignedTo = author;
      }

      leadService.upsert(updatePayload).catch(err => {
        console.error('❌ Erro ao atualizar etapa do lead no Supabase:', err);
      });

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'status_change',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de etapa no Supabase:', err));

      if (autoTriggerActivity) {
        leadService.addActivity(leadId, autoTriggerActivity).catch(err => {
          console.warn('Erro ao salvar atividade de gatilho no Supabase:', err);
        });
      }

      if (authorId) {
        leadService.addParticipant(leadId, {
          collaboratorId: authorId,
          collaboratorName: author,
          collaboratorRole: currentUser?.role || 'sdr',
          collaboratorAvatarUrl: authorAvatar,
          action: shouldClaimSdr ? 'Assumiu como SDR ao mover para ' + stageLabels[newStage] : 'Alterou a etapa do lead',
          timestamp: newActivity.timestamp,
        }).catch(err => console.error('❌ Erro ao registrar participante no Supabase:', err));
      }
    }

    // Se a etapa for alterada para Contrato Fechado (Ganho), assegura criação no Pós-Venda
    if (newStage === 'contract_signed' && targetLead) {
      setClients(prevClients => {
        const existingIdx = prevClients.findIndex(c => c.commercialLeadId === leadId || (c.payerPhone && c.payerPhone === targetLead.phone));
        if (existingIdx >= 0) return prevClients;

        const newCliId = generateUuid();
        const targetVenueId = targetLead.venueId || venues[0]?.id || '';
        const venueObj = venues.find(v => v.id === targetVenueId);
        const pDate = targetLead.partyDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const birthdayName = (targetLead as any).birthdayPersonName?.trim() || targetLead.name.trim();
        const primaryDecisor = (targetLead.contacts || []).find(c => c.isPrimaryDecisionMaker) || (targetLead.contacts || [])[0];
        const payer = primaryDecisor?.name || (targetLead as any).decisionMakerName?.trim() || (targetLead as any).payerName?.trim() || `${targetLead.name.trim()} (Responsável)`;
        const payerPhone = primaryDecisor?.phone || targetLead.phone.trim();
        const payerRel = primaryDecisor?.role || ((targetLead as any).decisionMakerRole as any) || 'mother';

        const postSaleFunnelMatch = funnels.find(f => 
          f.isPostSale || 
          f.category === 'Pós-Venda' || 
          f.category === 'pos_venda' ||
          f.name?.toLowerCase().includes('pós-venda') ||
          f.name?.toLowerCase().includes('sucesso')
        );
        const isEntryStageActive = Boolean(postSaleFunnelMatch?.isEntryStageActive);
        const clientInitialStage: ClientStage = isEntryStageActive ? ('new_lead' as any) : 'onboarding';

        const newClient: Client = {
          id: newCliId,
          code: generateClientCode(),
          name: birthdayName,
          payerName: payer,
          payerRelationship: payerRel,
          payerCpf: (targetLead as any).payerCpf || (targetLead as any).cpf || '',
          payerPhone: payerPhone,
          payerEmail: targetLead.email?.trim() || '',
          payerAddress: (targetLead as any).address || '',
          payerNeighborhood: (targetLead as any).neighborhood || '',
          payerCity: (targetLead as any).city || '',
          birthdayPersonName: birthdayName,
          birthdayPersonAge: (targetLead as any).birthdayPersonAge || 15,
          birthdayPersonBirthdate: (targetLead as any).debutanteBirthDate || '',
          eventType: targetLead.eventType || '15_anos',
          eventDate: pDate,
          eventTime: (targetLead as any).eventTime || '20:00 às 02:00',
          guestCount: (targetLead as any).guestCount || (targetLead as any).estimatedGuests || 150,
          venueId: targetVenueId,
          venueName: venueObj?.name || 'Bonomo Festas',
          packageSold: targetLead.packageSold || targetLead.interestService || 'Contrato Fechado',
          dealValue: targetLead.dealValue || targetLead.estimatedBudget || 0,
          contractDate: new Date().toISOString().split('T')[0],
          contractStatus: 'aguardando_sinal',
          contractSignedAt: null,
          signalPaid: false,
          paymentTerms: (targetLead as any).paymentTerms || targetLead.paymentMethod || 'Negociação comercial fechada',
          paymentStatus: 'pending',
          stage: clientInitialStage,
          contacts: targetLead.contacts || [],
          assignedSuccessManagerId: undefined,
          assignedSuccessManagerName: undefined,
          debutanteId: null,
          debutanteSlug: null,
          commercialLeadId: leadId,
          commercialLeadCode: targetLead.code || (targetLead as any).leadCode,
          commercialHistory: {
            origin: targetLead.sourceName || targetLead.source || 'Comercial CRM',
            closedBy: author,
            closedAt: new Date().toISOString(),
            originalNotes: targetLead.notes || '',
            closerReport: 'Lead movido para Ganho.',
          },
          notes: targetLead.notes || '',
          documents: [],
          activities: [
            {
              id: generateUuid(),
              type: 'status_change' as const,
              description: `Venda Ganha confirmada por ${author}. Cliente integrado ao Pós-Venda.`,
              createdAt: new Date().toISOString(),
              createdBy: author,
            }
          ],
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };

        const updated = [newClient, ...prevClients];
        safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
        clientService.upsert(newClient);
        return updated;
      });
    }
  };

  const addLeadNote = (leadId: string, noteText: string) => {
    if (!noteText.trim()) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: 'Nota Interna',
      text: noteText.trim(),
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'note',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar nota de lead no Supabase:', err));
    }
  };

  const validateLead = (leadId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'validation',
      title: 'Indicação Validada (+1 Ponto na Jornada)',
      text: 'Validação comercial confirmada. Ponto creditado para a aniversariante.',
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        isValidated: true,
        pointsGranted: 1,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    // Local state sync for debutantes
    setDebutantes(dPrev => dPrev.map(d => {
      if (d.id === targetLead.debutanteId || d.slug === targetLead.debutanteSlug) {
        const newValid = (d.validReferrals || 0) + 1;
        const progress = Math.min(100, Math.round((newValid / (d.totalTargetReferrals || 10)) * 100));
        return {
          ...d,
          validReferrals: newValid,
          journeyProgressPercentage: progress,
        };
      }
      return d;
    }));

    // Sincronização 100% no Supabase
    if (isSupabaseConfigured) {
      // 1. Atualiza o lead
      leadService.upsert({
        id: leadId,
        isValidated: true,
        pointsGranted: 1,
      }).catch(err => console.error('❌ Erro ao validar lead no Supabase:', err));

      // 2. Adiciona a atividade no lead
      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'validation',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de validação:', err));

      // 3. Atualiza na tabela referrals
      supabase.from('referrals')
        .update({ status: 'validated', points_granted: 1 })
        .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
        .then(({ error }) => {
          if (error) console.error('❌ Erro ao atualizar referral no Supabase:', error);
        });

      // 4. Atualiza os pontos na debutante
      const foundDeb = debutantes.find(d => d.id === targetLead.debutanteId || d.slug === targetLead.debutanteSlug);
      if (foundDeb) {
        const newValid = (foundDeb.validReferrals || 0) + 1;
        debutanteService.upsert({
          id: foundDeb.id,
          slug: foundDeb.slug,
          validReferrals: newValid,
        }).catch(err => console.error('❌ Erro ao atualizar pontuação da debutante no Supabase:', err));
      }
    }
  };

  const invalidateLead = (leadId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        isValidated: false,
        pointsGranted: 0,
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    // Local state sync for debutantes
    setDebutantes(dPrev => dPrev.map(d => {
      if (d.id === targetLead.debutanteId || d.slug === targetLead.debutanteSlug) {
        const newValid = Math.max(0, (d.validReferrals || 0) - 1);
        const progress = Math.min(100, Math.round((newValid / (d.totalTargetReferrals || 10)) * 100));
        return {
          ...d,
          validReferrals: newValid,
          journeyProgressPercentage: progress,
        };
      }
      return d;
    }));

    // Sincronização 100% no Supabase
    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        isValidated: false,
        pointsGranted: 0,
      }).catch(err => console.error('❌ Erro ao invalidar lead no Supabase:', err));

      supabase.from('referrals')
        .update({ status: 'pending', points_granted: 0 })
        .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
        .then(({ error }) => {
          if (error) console.error('❌ Erro ao atualizar referral no Supabase:', error);
        });

      const foundDeb = debutantes.find(d => d.id === targetLead.debutanteId || d.slug === targetLead.debutanteSlug);
      if (foundDeb) {
        const newValid = Math.max(0, (foundDeb.validReferrals || 0) - 1);
        debutanteService.upsert({
          id: foundDeb.id,
          slug: foundDeb.slug,
          validReferrals: newValid,
        }).catch(err => console.error('❌ Erro ao invalidar pontuação da debutante no Supabase:', err));
      }
    }
  };

  // Roleta Comercial de Distribuição Automática de Leads por Casa de Festa / Funil
  const getRoundRobinAssignment = (funnelId?: string, venueId?: string): Collaborator | null => {
    if (!funnelId) return null;
    const funnel = funnels.find(f => f.id === funnelId || f.name === funnelId);
    if (!funnel) return null;

    let targetSdrIds: string[] = [];
    let isRoundRobinActive = false;

    // 1. Prioridade: Configuração específica da Casa de Festa (Unidade)
    if (venueId && funnel.venueDistributionConfig && funnel.venueDistributionConfig[venueId]) {
      const venueCfg = funnel.venueDistributionConfig[venueId];
      if (venueCfg.distributionMode === 'round_robin' && venueCfg.assignedSdrIds && venueCfg.assignedSdrIds.length > 0) {
        targetSdrIds = venueCfg.assignedSdrIds;
        isRoundRobinActive = true;
      } else if (venueCfg.distributionMode === 'manual') {
        return null;
      }
    }

    // 2. Fallback: Configuração geral do funil se não houver unidade específica
    if (!isRoundRobinActive && funnel.distributionMode === 'round_robin' && funnel.assignedSdrIds && funnel.assignedSdrIds.length > 0) {
      targetSdrIds = funnel.assignedSdrIds;
      isRoundRobinActive = true;
    }

    if (!isRoundRobinActive || targetSdrIds.length === 0) {
      return null;
    }

    const eligibleSdrs = targetSdrIds
      .map(id => collaborators.find(c => c.id === id && c.active !== false))
      .filter((c): c is Collaborator => Boolean(c));

    if (eligibleSdrs.length === 0) return null;

    const currentIndex = typeof funnel.roundRobinNextIndex === 'number' ? funnel.roundRobinNextIndex : 0;
    const assignedSdr = eligibleSdrs[currentIndex % eligibleSdrs.length];
    const nextIndex = (currentIndex + 1) % eligibleSdrs.length;

    // Atualiza o ponteiro da roleta no funil de forma atômica
    setFunnels(prev => {
      const updated = prev.map(f => f.id === funnel.id ? { ...f, roundRobinNextIndex: nextIndex } : f);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      funnelService.upsert({ id: funnel.id, roundRobinNextIndex: nextIndex }).catch(err => {
        console.warn('[RoundRobin] Erro ao salvar roundRobinNextIndex no Supabase:', err);
      });
    }

    return assignedSdr;
  };

  const createLeadFromReferral = (data: {
    debutanteId: string;
    debutanteName: string;
    debutanteSlug: string;
    venueId: string;
    name: string;
    phone: string;
    age: number;
    group: string;
    notes?: string;
  }): string => {
    const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Procura a Origem de Indicação da casa de festa para obter o funil configurado
    const venueReferralSource = sources.find(s => s.venueId === data.venueId && s.type === 'referral' && s.status === 'active');
    const destinationFunnelId = venueReferralSource?.funnelId || (funnels.find(f => f.venueId === data.venueId)?.id) || 'indicacao';

    // Roleta Automática
    const autoSdr = getRoundRobinAssignment(destinationFunnelId, data.venueId);
    const initialParticipants: LeadParticipant[] = autoSdr ? [{
      id: generateUuid(),
      collaboratorId: autoSdr.id,
      collaboratorName: autoSdr.name,
      collaboratorRole: autoSdr.role || 'sdr',
      collaboratorAvatarUrl: autoSdr.avatarUrl,
      action: 'round_robin',
      timestamp: new Date().toISOString(),
    }] : [];

    const leadCode = generateLeadCode();
    const cleanLeadName = (data.name && data.name.trim() !== '') ? data.name.trim() : leadCode;

    const activities: LeadActivity[] = [
      {
        id: `act_${Date.now()}`,
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'creation',
        title: `Indicação enviada pela debutante ${data.debutanteName}`,
        authorName: data.debutanteName,
      }
    ];

    if (autoSdr) {
      activities.unshift({
        id: generateUuid(),
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        title: 'Distribuição Automática',
        text: `Lead distribuído automaticamente pela Roleta Comercial do funil para o SDR ${autoSdr.name}.`,
        authorName: 'Robô F5 Automações',
        authorId: 'system_bot',
        authorAvatarUrl: '/logo_f5.png',
      });
    }

    const targetVenue = venues.find(v => v.id === data.venueId);
    const resolvedMasterId = targetVenue?.masterId || (targetVenue as any)?.master_id || scopedMasterId || currentUser?.id;

    const newLead: Lead = {
      id: newLeadId,
      masterId: resolvedMasterId,
      code: leadCode,
      debutanteId: data.debutanteId,
      debutanteName: data.debutanteName,
      debutanteSlug: data.debutanteSlug,
      venueId: data.venueId,
      funnelId: destinationFunnelId,
      sourceId: venueReferralSource?.id,
      source: 'indicacao',
      name: cleanLeadName,
      phone: data.phone,
      age: data.age,
      group: data.group,
      notes: data.notes,
      sdrId: autoSdr ? autoSdr.id : undefined,
      sdrName: autoSdr ? autoSdr.name : undefined,
      assignedTo: autoSdr ? autoSdr.name : undefined,
      stage: 'new_lead',
      isValidated: false,
      pointsGranted: 0,
      participants: initialParticipants,
      tasks: [],
      activities,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setLeads(prev => [newLead, ...prev]);
    return newLeadId;
  };

  const phoneExecutionQueueRef = React.useRef<Map<string, Promise<void>>>(new Map());

  const enqueuePhoneAction = async (phone: string, action: () => Promise<void>) => {
    const clean = phone.replace(/\D/g, '');
    const lockKey = clean.slice(-8) || clean;
    
    const previousPromise = phoneExecutionQueueRef.current.get(lockKey) || Promise.resolve();
    const currentPromise = previousPromise.then(async () => {
      try {
        await action();
      } catch (err) {
        console.warn('[Phone Queue Task Error]:', err);
      }
    });

    phoneExecutionQueueRef.current.set(lockKey, currentPromise);
    await currentPromise;
    if (phoneExecutionQueueRef.current.get(lockKey) === currentPromise) {
      phoneExecutionQueueRef.current.delete(lockKey);
    }
  };

  const createLeadFromWhatsApp = async (data: {
    venueId: string;
    phone: string;
    name?: string;
    firstMessage?: string;
    sourceId?: string;
    avatarUrl?: string;
    fromMe?: boolean;
    mediaUrl?: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
    initialFunnelId?: string;
    initialStage?: CrmStage;
  }): Promise<string> => {
    const newLeadId = generateUuid();
    
    // Procura a Origem do WhatsApp (pelo ID específico ou da casa de festa)
    const waSource = (data.sourceId ? sources.find(s => s.id === data.sourceId) : null)
      || sources.find(s => s.venueId === data.venueId && s.type === 'whatsapp_api' && s.status === 'active')
      || sources.find(s => s.type === 'whatsapp_api' && s.status === 'active');
    
    let matchedSubSource: string | undefined = undefined;
    let targetFunnelId = data.initialFunnelId || waSource?.funnelId || (funnels.find(f => f.venueId === data.venueId)?.id) || 'comercial';

    if (waSource && data.firstMessage && !data.initialFunnelId) {
      const match = sourceService.matchWhatsAppSubSource(waSource, data.firstMessage);
      matchedSubSource = match.subSource;
      targetFunnelId = match.funnelId || targetFunnelId;
    }

    // Roleta Automática
    const autoSdr = getRoundRobinAssignment(targetFunnelId, data.venueId);
    const initialParticipants: LeadParticipant[] = autoSdr ? [{
      id: generateUuid(),
      collaboratorId: autoSdr.id,
      collaboratorName: autoSdr.name,
      collaboratorRole: autoSdr.role || 'sdr',
      collaboratorAvatarUrl: autoSdr.avatarUrl,
      action: 'round_robin',
      timestamp: new Date().toISOString(),
    }] : [];

    const leadCode = generateLeadCode();
    const cleanName = (data.name && data.name.trim() !== '') ? data.name.trim() : leadCode;

    const activities: LeadActivity[] = [
      {
        id: generateUuid(),
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'creation',
        title: matchedSubSource ? `Lead captado via WhatsApp / ${matchedSubSource}` : 'Lead captado via WhatsApp API',
        authorName: 'WhatsApp API',
      }
    ];

    if (data.firstMessage || data.mediaUrl) {
      const isAudio = data.mediaType === 'audio' || data.firstMessage?.includes('🎵') || data.firstMessage?.toLowerCase().includes('voz');
      activities.push({
        id: generateUuid(),
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'contact',
        title: data.fromMe 
          ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)') 
          : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
        text: data.firstMessage,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        authorName: data.fromMe ? 'WhatsApp App / Web' : (data.name || 'Cliente (WhatsApp)'),
        authorId: data.fromMe ? 'whatsapp_mobile' : 'lead',
        authorAvatarUrl: data.fromMe ? 'whatsapp_brand' : undefined,
        status: data.fromMe ? 'sent' : 'delivered',
      });
    }

    if (autoSdr) {
      activities.unshift({
        id: generateUuid(),
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        title: 'Distribuição Automática',
        text: `Lead distribuído automaticamente pela Roleta Comercial do funil para o SDR ${autoSdr.name}.`,
        authorName: 'Robô F5 Automações',
        authorId: 'system_bot',
        authorAvatarUrl: '/logo_f5.png',
      });
    }

    const targetVenueId = (isUuid(data.venueId) ? data.venueId : null)
      || (waSource?.venueId && isUuid(waSource.venueId) ? waSource.venueId : null)
      || (isUuid(activeVenueId) ? activeVenueId : null)
      || venues.find(v => isUuid(v.id))?.id
      || 'b2222222-2222-2222-2222-222222222222';

    const targetVenue = venues.find(v => v.id === targetVenueId);
    const resolvedMasterId = targetVenue?.masterId || (targetVenue as any)?.master_id || scopedMasterId || currentUser?.id;

    // Garante que o funil padrão para leads de entrada seja comercial (e não pós-venda)
    const commercialFunnelForVenue = funnels.find(f => 
      !f.isPostSale && f.category !== 'Pós-Venda' && f.category !== 'pos_venda' &&
      (f.venueId === targetVenueId || (f.venueId === 'all' && (f.masterId === resolvedMasterId || !f.masterId)))
    );

    const matchedFunnel = (data.initialFunnelId && isUuid(data.initialFunnelId) ? funnels.find(f => f.id === data.initialFunnelId) : null)
      || funnels.find(f => (f.id === targetFunnelId || f.name === targetFunnelId) && isUuid(f.id))
      || commercialFunnelForVenue
      || funnels.find(f => f.venueId === targetVenueId && isUuid(f.id))
      || funnels.find(f => isUuid(f.id));

    const validFunnelId = (data.initialFunnelId && isUuid(data.initialFunnelId))
      ? data.initialFunnelId
      : (matchedFunnel && !matchedFunnel.isPostSale ? matchedFunnel.id : (commercialFunnelForVenue?.id || '41d857a5-107e-4607-908c-7ebd5ba32cc9'));

    const isTargetPostSale = Boolean(
      targetFunnelId === 'post_sale_default' ||
      matchedFunnel?.isPostSale ||
      matchedFunnel?.category === 'Pós-Venda' ||
      waSource?.funnelId === 'post_sale_default'
    );

    const newLead: Lead = {
      id: newLeadId,
      masterId: resolvedMasterId,
      code: leadCode,
      debutanteId: '',
      debutanteName: 'WhatsApp Direto',
      debutanteSlug: '',
      venueId: targetVenueId,
      funnelId: validFunnelId,
      sourceId: waSource?.id,
      source: 'whatsapp',
      sourceName: waSource?.name || 'WhatsApp API',
      subSource: matchedSubSource,
      name: cleanName,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      age: 15,
      group: isTargetPostSale ? 'Pós-Venda' : 'WhatsApp',
      notes: undefined,
      sdrId: autoSdr ? autoSdr.id : undefined,
      sdrName: autoSdr ? autoSdr.name : undefined,
      assignedTo: autoSdr ? autoSdr.name : undefined,
      stage: (data.initialStage || (isTargetPostSale ? 'onboarding' : 'new_lead')) as CrmStage,
      isClient: isTargetPostSale ? true : undefined,
      isValidated: false,
      pointsGranted: 0,
      participants: initialParticipants,
      tasks: [],
      activities,
      unreadCount: data.fromMe ? 0 : 1,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setLeads(prev => [newLead, ...prev]);
    // Atualiza o ref IMEDIATAMENTE (sem esperar React re-renderizar)
    // para que a próxima mensagem na fila já encontre este lead e não duplique
    leadsRef.current = [newLead, ...leadsRef.current];

    if (isSupabaseConfigured) {
      await leadService.upsert(newLead);
      if (waSource?.id) {
        await sourceService.recordEvent(waSource.id, data.venueId, 'lead_created', newLeadId, {
          sourceName: waSource.name,
          subSource: matchedSubSource,
          funnelId: targetFunnelId,
          phone: data.phone,
        });
      }
    }

    return newLeadId;
  };

  // ── UAZAPI Real-Time SSE Listener (Localhost & Browser Ao Vivo) ────
  // Sincroniza refs a cada mudança de estado para uso dentro do callback SSE
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    venuesRef.current = venues;
  }, [venues]);

  useEffect(() => {
    // 1. Sincroniza instâncias ativas do WhatsApp (re-executa só quando sources muda)
    const activeWaSources = sources.filter(s => s.type === 'whatsapp_api' && s.status === 'active');
    const activeWaTokens = activeWaSources
      .map(s => {
        const tok = s.whatsappInstanceId ||
          (s.configuration as any)?.token ||
          (s.configuration as any)?.instanceToken ||
          (s.configuration as any)?.instanceKey ||
          '';
        return tok.trim();
      })
      .filter(Boolean);

    uazapiSseService.syncActiveInstances(activeWaTokens);

    // Auto-configura webhook da UAZAPI para garantir ingestão mesmo quando o navegador estiver fechado
    if (typeof window !== 'undefined' && activeWaTokens.length > 0) {
      const webhookUrl = `${window.location.origin}/api/whatsapp-webhook`;
      activeWaTokens.forEach(tok => {
        uazapiService.configureWebhook(tok, {
          url: webhookUrl,
          enabled: true,
          events: ['messages', 'messages_update', 'connection', 'presence'],
        }).catch(() => {});
      });
    }
  }, [sources]);

  // O listener SSE só é registrado UMA vez (deps vazias) e lê estado via refs
  useEffect(() => {
    const unsubscribe = uazapiSseService.onMessage(async (incoming) => {
      const isFromMe = incoming.fromMe === true;

      // 1. Resolve o número real de WhatsApp, nome de contato e avatar antes de qualquer processamento
      let cleanPhone = incoming.senderPhone.replace(/\D/g, '');
      let effectiveSenderName = incoming.senderName;
      let effectiveAvatar = incoming.profilePicUrl;

      // Apenas resolve nome/avatar do perfil do payload se for mensagem recebida do cliente (evita pegar dados do atendente no fromMe)
      if (!isFromMe) {
        const resolved = await uazapiService.resolveContactPhoneAndProfile(
          incoming.instanceToken,
          incoming.senderPhone,
          incoming.rawPayload
        );
        cleanPhone = (resolved.phone || incoming.senderPhone).replace(/\D/g, '');
        effectiveSenderName = resolved.name || incoming.senderName;
        effectiveAvatar = resolved.avatarUrl || incoming.profilePicUrl;
      }

      if (!cleanPhone || cleanPhone.length < 8) return;

      const rawJidClean = (incoming.rawPayload?.key?.remoteJid || incoming.rawPayload?.remoteJid || '').replace(/:\d+.*$/, '').replace(/:\d+@/, '@').replace(/@.*$/, '').replace(/\D/g, '');

      // Execução sequencial com trava atômica por telefone
      await enqueuePhoneAction(cleanPhone, async () => {
        const currentLeads = leadsRef.current;
        const currentSources = sourcesRef.current;
        const currentVenues = venuesRef.current;

        // Procura a Origem correspondente com precisão
        const incomingToken = (incoming.instanceToken || '').trim();
        const incomingOwner = (incoming.rawPayload?.owner || incoming.rawPayload?.phone || incoming.rawPayload?.fromMePhone || '').replace(/\D/g, '');
        const incomingInstName = (incoming.rawPayload?.instance || incoming.rawPayload?.instanceName || '').toLowerCase();

        const matchedSource = currentSources.find(s => {
          const tok = (s.whatsappInstanceId || (s.configuration as any)?.token || (s.configuration as any)?.instanceToken || (s.configuration as any)?.instanceKey || '').trim();
          if (tok && incomingToken && tok === incomingToken) return true;
          const connectedPhone = ((s.configuration as any)?.connectedPhone || '').replace(/\D/g, '');
          if (connectedPhone && incomingToken && connectedPhone === incomingToken.replace(/\D/g, '')) return true;
          if (connectedPhone && incomingOwner && connectedPhone === incomingOwner) return true;
          if (incomingInstName && s.name.toLowerCase().includes(incomingInstName)) return true;
          return false;
        }) || currentSources.find(s => s.type === 'whatsapp_api' && s.status === 'active');

        const rawJid = incoming.rawPayload?.key?.remoteJid || incoming.rawPayload?.remoteJid || incoming.rawPayload?.chatId || '';
        const rawLid = (isLidIdentifier(incoming.senderPhone) ? incoming.senderPhone : '') || (rawJid.includes('@lid') ? rawJid : '');

        // Procura se o Lead já existe usando a busca robusta em 2 etapas:
        // 1ª Prioridade (90%+ dos casos): Telefone Real
        // 2ª Prioridade (Fallback): JID / LID
        const { matchedLead } = findMatchingLead(currentLeads, {
          phone: cleanPhone,
          jid: rawJid,
          lid: rawLid,
          rawPayload: incoming.rawPayload,
        });

        // Procura todos os leads equivalentes para auto-consolidação se houver duplicatas antigas
        const matchingLeads = currentLeads.filter(l => {
          if (cleanPhone && !isLidIdentifier(cleanPhone) && isPhoneMatch(l.phone, cleanPhone)) return true;
          if (rawJidClean && !isLidIdentifier(rawJidClean) && isPhoneMatch(l.phone, rawJidClean)) return true;
          if (rawLid && l.whatsappLid && l.whatsappLid.replace(/\D/g, '') === rawLid.replace(/\D/g, '')) return true;
          if (rawLid && isLidIdentifier(l.phone) && l.phone.replace(/\D/g, '') === rawLid.replace(/\D/g, '')) return true;
          return false;
        });

        let existingLead: Lead | null = matchedLead;
        if (matchingLeads.length > 1) {
          const { consolidatedLeads } = await leadService.consolidateDuplicatesInDatabase(matchingLeads);
          existingLead = consolidatedLeads[0] || matchingLeads[0];
          const deletedIds = matchingLeads.filter(m => m.id !== existingLead!.id).map(m => m.id);
          setLeads(prev => prev.filter(l => !deletedIds.includes(l.id)).map(l => l.id === existingLead!.id ? existingLead! : l));
        } else if (matchingLeads.length === 1 && !existingLead) {
          existingLead = matchingLeads[0];
        }

        if (existingLead) {
          const leadUpdates: Partial<Lead> = {};

          // 1. Vincula e preserva JID e LID no Lead
          if (rawJid && !existingLead.whatsappJid) leadUpdates.whatsappJid = rawJid;
          if (rawLid && !existingLead.whatsappLid) leadUpdates.whatsappLid = rawLid;

          // 2. Auto-cura de número de telefone (se anteriormente gravado como LID e agora temos o número real)
          const isOldPhoneLid = isLidIdentifier(existingLead.phone);
          if (isOldPhoneLid && !isLidIdentifier(cleanPhone) && cleanPhone.length <= 13) {
            leadUpdates.phone = cleanPhone;
          }

          // 3. Auto-cura de nome: NUNCA sobrescreve com apelidos de agenda ("Mãe", "Pai", etc.)
          if (
            !isFromMe &&
            effectiveSenderName &&
            !isGenericOrFamilyNickname(effectiveSenderName) &&
            (!existingLead.name || isGenericOrFamilyNickname(existingLead.name) || existingLead.name.startsWith('LEAD-') || existingLead.name === existingLead.code)
          ) {
            leadUpdates.name = effectiveSenderName;
          }

          // 4. Foto de perfil imediata (apenas para mensagens recebidas do cliente)
          if (!isFromMe && effectiveAvatar && !existingLead.avatarUrl) {
            leadUpdates.avatarUrl = effectiveAvatar;
          }

          // Adiciona atividade na timeline
          const newActId = generateUuid();
          const isAudio = incoming.mediaType === 'audio' || incoming.text?.includes('🎵') || incoming.text?.toLowerCase().includes('voz');
          const newAct: LeadActivity = {
            id: newActId,
            leadId: existingLead.id,
            timestamp: incoming.timestamp || new Date().toISOString(),
            type: 'contact',
            title: isFromMe 
              ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)')
              : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
            text: incoming.text,
            mediaUrl: incoming.mediaUrl,
            mediaType: incoming.mediaType,
            authorName: isFromMe ? 'WhatsApp App / Web' : (effectiveSenderName || existingLead.name || 'Cliente (WhatsApp)'),
            authorId: isFromMe ? 'whatsapp_mobile' : 'lead',
            authorAvatarUrl: isFromMe ? 'whatsapp_brand' : undefined,
            status: isFromMe ? 'sent' : 'delivered',
          };

          const updatedActivities = mergeAndSortActivities(existingLead.activities || [], [newAct], existingLead.id);
          leadUpdates.activities = updatedActivities;
          leadUpdates.updatedAt = new Date().toISOString().split('T')[0];
          leadUpdates.lastInteractionAt = incoming.timestamp || new Date().toISOString();
          leadUpdates.lastMessageDirection = isFromMe ? 'outgoing' : 'incoming';
          
          if (!isFromMe) {
            leadUpdates.unreadCount = (existingLead.unreadCount || 0) + 1;
          }

          updateLeadData(existingLead.id, leadUpdates);

          if (isSupabaseConfigured) {
            leadService.addActivity(existingLead.id, newAct)
              .catch(err => console.error('Erro ao salvar mensagem recebida no Supabase:', err));
            leadService.update(existingLead.id, leadUpdates).catch(() => {});
          }

          // Ingestão assíncrona de mídia transitória recebida (áudios, imagens, docs) para o Cloudflare R2
          if (incoming.messageId && incoming.instanceToken && incoming.mediaType && incoming.mediaType !== 'text') {
            whatsappMediaService.ingestTransientMedia({
              instanceToken: incoming.instanceToken,
              messageId: incoming.messageId,
              instanceId: incoming.instanceToken,
              transcribeAudio: false,
            }).then((ingestRes) => {
              if (ingestRes.permanentR2Url) {
                setLeads(prev => prev.map(l => {
                  if (l.id !== existingLead.id) return l;
                  return {
                    ...l,
                    activities: (l.activities || []).map(a => a.id === newActId ? { ...a, mediaUrl: ingestRes.permanentR2Url } : a),
                  };
                }));
                if (isSupabaseConfigured) {
                  leadService.updateActivity(newActId, { mediaUrl: ingestRes.permanentR2Url, mediaType: incoming.mediaType }).catch(() => {});
                }
              }
            }).catch(() => {});
          }

          // Puxa informações atualizadas de contato e foto sob demanda via POST /chat/details
          if (incoming.instanceToken && (!existingLead.avatarUrl || !existingLead.name || existingLead.name.startsWith('LEAD-') || isOldPhoneLid)) {
            uazapiService.fetchChatDetails(incoming.instanceToken, cleanPhone)
              .then(async (details) => {
                if (!details) return;
                const liveUpdates: Partial<Lead> = {};
                const freshLeadState = leadsRef.current.find(l => l.id === existingLead.id) || existingLead;
                
                if (details.phone && !isLidIdentifier(details.phone) && isLidIdentifier(freshLeadState.phone)) {
                  liveUpdates.phone = details.phone.replace(/\D/g, '');
                }
                if (details.name && (!freshLeadState.name || freshLeadState.name.startsWith('LEAD-'))) {
                  liveUpdates.name = details.name;
                }
                if (details.image && !freshLeadState.avatarUrl) {
                  liveUpdates.avatarUrl = details.image;
                }
                if (Object.keys(liveUpdates).length > 0) {
                  updateLeadData(existingLead.id, liveUpdates);
                  if (isSupabaseConfigured) {
                    leadService.update(existingLead.id, liveUpdates).catch(() => {});
                  }
                }
                if (details.image) {
                  const permanentR2 = await whatsappMediaService.syncWhatsAppAvatarToR2(cleanPhone, details.image);
                  if (permanentR2 && permanentR2 !== freshLeadState.avatarUrl) {
                    updateLeadData(existingLead.id, { avatarUrl: permanentR2 });
                    if (isSupabaseConfigured) {
                      leadService.update(existingLead.id, { avatarUrl: permanentR2 }).catch(() => {});
                    }
                  }
                }
              })
              .catch(() => {});
          }
        } else {
          // Segurança Pós-Venda: Se a mensagem chegou em uma fonte vinculada ao Pós-Venda (Sucesso do Cliente),
          // e a Etapa de Entrada do Cliente NÃO estiver ativada, mensagens de números desconhecidos são ignoradas.
          const isTargetPostSale = matchedSource?.funnelId === 'post_sale_default' ||
            funnels.some(f => f.id === matchedSource?.funnelId && (f.isPostSale || f.category === 'Pós-Venda'));

          if (isTargetPostSale) {
            const postSaleFunnelObj = funnels.find(f => f.isPostSale || f.category === 'Pós-Venda' || f.id === matchedSource?.funnelId);
            const isEntryActive = Boolean(postSaleFunnelObj?.isEntryStageActive);
            
            if (!isEntryActive) {
              console.info(`[WhatsApp Pós-Venda] Mensagem de número desconhecido (${cleanPhone}) ignorada pois a Etapa de Entrada do Cliente está desativada no funil.`);
              return;
            }
          }

          // Cria um novo Lead / Cliente automaticamente com telefone real e nome de contato resolvidos
          const venueId = matchedSource?.venueId || activeVenueId || currentVenues[0]?.id || 'v1';
          const newId = await createLeadFromWhatsApp({
            venueId,
            phone: cleanPhone,
            name: isFromMe ? undefined : effectiveSenderName,
            firstMessage: incoming.text,
            sourceId: matchedSource?.id,
            avatarUrl: effectiveAvatar || undefined,
            fromMe: isFromMe,
            initialFunnelId: isTargetPostSale ? 'post_sale_default' : undefined,
            initialStage: isTargetPostSale ? ('new_lead' as any) : undefined,
          });

          if (newId && incoming.instanceToken) {
            uazapiService.fetchChatDetails(incoming.instanceToken, cleanPhone)
              .then(async (details) => {
                if (!details) return;
                const liveUpdates: Partial<Lead> = {};
                if (details.phone && !isLidIdentifier(details.phone)) {
                  liveUpdates.phone = details.phone.replace(/\D/g, '');
                }
                if (details.name) liveUpdates.name = details.name;
                if (details.image) liveUpdates.avatarUrl = details.image;
                if (Object.keys(liveUpdates).length > 0) {
                  updateLeadData(newId, liveUpdates);
                  if (isSupabaseConfigured) {
                    leadService.update(newId, liveUpdates).catch(() => {});
                  }
                }
                if (details.image) {
                  const permanentR2 = await whatsappMediaService.syncWhatsAppAvatarToR2(cleanPhone, details.image);
                  if (permanentR2) {
                    updateLeadData(newId, { avatarUrl: permanentR2 });
                    if (isSupabaseConfigured) {
                      leadService.update(newId, { avatarUrl: permanentR2 }).catch(() => {});
                    }
                  }
                }
              })
              .catch(() => {});
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastDisconnectTimestampRef = React.useRef<Map<string, number>>(new Map());

  // ── Reconexão Automática & Recuperação de Gap de Histórico ──────────────
  useEffect(() => {
    const unsubConn = uazapiSseService.onConnectionChange((token, status) => {
      console.log(`[SSE Connection Status]: Instância ${token.substring(0, 8)}... -> ${status}`);
      const isDisconnected = status === 'disconnected' || status === 'hibernated' || status === 'close';
      if (isDisconnected) {
        if (!lastDisconnectTimestampRef.current.has(token)) {
          lastDisconnectTimestampRef.current.set(token, Date.now());
        }
        // Atualiza a origem no estado para marcar como desconectada
        const targetSrc = sourcesRef.current.find(s => {
          const tok = (s.whatsappInstanceId || (s.configuration as any)?.token || (s.configuration as any)?.instanceToken || '').trim();
          return tok === token;
        });
        if (targetSrc) {
          updateSource(targetSrc.id, {
            configuration: {
              ...(targetSrc.configuration || {}),
              isConnected: false,
              connectionStatus: 'disconnected',
            }
          });
        }
      } else if (status === 'connected') {
        const targetSrc = sourcesRef.current.find(s => {
          const tok = (s.whatsappInstanceId || (s.configuration as any)?.token || (s.configuration as any)?.instanceToken || '').trim();
          return tok === token;
        });
        if (targetSrc && (targetSrc.configuration as any)?.isConnected === false) {
          updateSource(targetSrc.id, {
            configuration: {
              ...(targetSrc.configuration || {}),
              isConnected: true,
              connectionStatus: 'connected',
            }
          });
        }
        // Conexão restabelecida: apenas limpa o registro de desconexão (não importa contatos automaticamente)
        lastDisconnectTimestampRef.current.delete(token);
      }
    });

    return () => unsubConn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncWhatsAppHistoryGap = async (options?: {
    sourceId?: string;
    instanceToken?: string;
    timeWindowMinutes?: number;
    startTimestamp?: number;
    endTimestamp?: number;
    createMissingLeads?: boolean;
  }): Promise<{ recoveredCount: number; newLeadsCount: number; updatedLeadsCount: number }> => {
    const currentSources = sourcesRef.current;
    let targetToken = options?.instanceToken;
    let targetSource = options?.sourceId ? currentSources.find(s => s.id === options.sourceId) : null;

    if (!targetToken && targetSource?.whatsappInstanceId) {
      targetToken = targetSource.whatsappInstanceId;
    }

    if (!targetToken) {
      const activeWa = currentSources.find(s => s.type === 'whatsapp_api' && s.status === 'active' && s.whatsappInstanceId);
      targetToken = activeWa?.whatsappInstanceId;
      targetSource = activeWa || null;
    }

    if (!targetToken) {
      console.warn('[Sync History Gap] Nenhuma instância ativa encontrada para sincronizar histórico.');
      return { recoveredCount: 0, newLeadsCount: 0, updatedLeadsCount: 0 };
    }

    const now = Date.now();
    const windowMs = (options?.timeWindowMinutes || 180) * 60 * 1000;
    const startTimestamp = options?.startTimestamp || (now - windowMs);
    const endTimestamp = options?.endTimestamp || now;

    console.log(`[Sync History Gap] Iniciando recuperação de mensagens para a instância ${targetToken.substring(0, 8)}... (${new Date(startTimestamp).toLocaleTimeString()} até ${new Date(endTimestamp).toLocaleTimeString()})`);

    const recovered = await uazapiService.recoverMessagesInInterval(targetToken, {
      startTimestamp,
      endTimestamp,
      limitPerChat: 50,
    });

    if (recovered.length === 0) {
      console.log('[Sync History Gap] Nenhuma mensagem pendente no intervalo selecionado.');
      return { recoveredCount: 0, newLeadsCount: 0, updatedLeadsCount: 0 };
    }

    let newLeadsCount = 0;
    let updatedLeadsCount = 0;

    for (const msg of recovered) {
      const cleanPhone = msg.senderPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 8) continue;

      await enqueuePhoneAction(cleanPhone, async () => {
        const currentLeads = leadsRef.current;
        const rawJid = msg.rawPayload?.key?.remoteJid || msg.rawPayload?.remoteJid || msg.rawPayload?.chatId || '';
        const rawLid = (isLidIdentifier(msg.senderPhone) ? msg.senderPhone : '') || (rawJid.includes('@lid') ? rawJid : '');

        // 1ª Prioridade: Telefone Real | 2ª Prioridade: JID/LID
        const { matchedLead } = findMatchingLead(currentLeads, {
          phone: cleanPhone,
          jid: rawJid,
          lid: rawLid,
          rawPayload: msg.rawPayload,
        });

        const matchingLeads = currentLeads.filter(l => {
          if (cleanPhone && !isLidIdentifier(cleanPhone) && isPhoneMatch(l.phone, cleanPhone)) return true;
          if (rawLid && l.whatsappLid && l.whatsappLid.replace(/\D/g, '') === rawLid.replace(/\D/g, '')) return true;
          if (rawLid && isLidIdentifier(l.phone) && l.phone.replace(/\D/g, '') === rawLid.replace(/\D/g, '')) return true;
          return false;
        });
        
        let existingLead: Lead | null = matchedLead;
        if (matchingLeads.length > 1) {
          const { consolidatedLeads } = await leadService.consolidateDuplicatesInDatabase(matchingLeads);
          existingLead = consolidatedLeads[0] || matchingLeads[0];
          const deletedIds = matchingLeads.filter(m => m.id !== existingLead!.id).map(m => m.id);
          setLeads(prev => prev.filter(l => !deletedIds.includes(l.id)).map(l => l.id === existingLead!.id ? existingLead! : l));
        } else if (matchingLeads.length === 1 && !existingLead) {
          existingLead = matchingLeads[0];
        }

        const isFromMe = msg.fromMe === true;
        const isAudio = msg.mediaType === 'audio' || msg.text?.includes('🎵') || msg.text?.toLowerCase().includes('voz');
        const newAct: LeadActivity = {
          id: generateUuid(),
          leadId: existingLead ? existingLead.id : '',
          timestamp: msg.timestamp || new Date().toISOString(),
          type: 'contact',
          title: isFromMe 
            ? (isAudio ? 'Mensagem de voz enviada (Celular/Web)' : 'Mensagem enviada via WhatsApp (Celular/Web)') 
            : (isAudio ? 'Mensagem de voz recebida' : 'Mensagem recebida no WhatsApp'),
          text: msg.text,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          authorName: isFromMe ? 'WhatsApp App / Web' : (msg.senderName || existingLead?.name || 'Cliente (WhatsApp)'),
          authorId: isFromMe ? 'whatsapp_mobile' : 'lead',
          authorAvatarUrl: isFromMe ? 'whatsapp_brand' : undefined,
          status: isFromMe ? 'sent' : 'delivered',
        };

        if (existingLead) {
          const updatedActivities = mergeAndSortActivities(existingLead.activities || [], [newAct], existingLead.id);
          const leadUpdates: Partial<Lead> = {
            activities: updatedActivities,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          if (rawJid && !existingLead.whatsappJid) leadUpdates.whatsappJid = rawJid;
          if (rawLid && !existingLead.whatsappLid) leadUpdates.whatsappLid = rawLid;

          if (isLidIdentifier(existingLead.phone) && !isLidIdentifier(cleanPhone) && cleanPhone.length <= 13) {
            leadUpdates.phone = cleanPhone;
          }

          if (!existingLead.avatarUrl && msg.profilePicUrl) {
            leadUpdates.avatarUrl = msg.profilePicUrl;
          }
          if (
            !isFromMe &&
            msg.senderName &&
            !isGenericOrFamilyNickname(msg.senderName) &&
            (!existingLead.name || isGenericOrFamilyNickname(existingLead.name) || existingLead.name.startsWith('LEAD-'))
          ) {
            leadUpdates.name = msg.senderName;
          }

          updateLeadData(existingLead.id, leadUpdates);
          if (isSupabaseConfigured) {
            leadService.addActivity(existingLead.id, newAct).catch(() => {});
            leadService.update(existingLead.id, leadUpdates).catch(() => {});
          }
          updatedLeadsCount++;
        } else if (options?.createMissingLeads === true) {
          // Apenas cria lead se o usuário solicitou explicitamente (ex: Triagem de Histórico)
          const venueId = targetSource?.venueId || activeVenueId || venuesRef.current[0]?.id || 'v1';
          const newId = await createLeadFromWhatsApp({
            venueId,
            phone: cleanPhone,
            name: (isFromMe || isGenericOrFamilyNickname(msg.senderName)) ? undefined : msg.senderName,
            firstMessage: msg.text,
            sourceId: targetSource?.id,
            avatarUrl: msg.profilePicUrl,
            fromMe: isFromMe,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.mediaType,
          });
          if (newId) newLeadsCount++;
        }
      });
    }

    // Auto-consolidação final de garantia
    await consolidateAllDuplicateLeads();

    console.log(`[Sync History Gap Concluído]: ${recovered.length} mensagens recuperadas (${newLeadsCount} novos leads, ${updatedLeadsCount} leads atualizados).`);
    return { recoveredCount: recovered.length, newLeadsCount, updatedLeadsCount };
  };

  const createLead = async (data: {
    name: string;
    phone: string;
    email?: string;
    venueId: string;
    funnelId: string;
    stage?: CrmStage;
    source?: import('../types/admin').LeadSource;
    sourceId?: string;
    sourceName?: string;
    subSource?: string;
    eventType?: import('../types/admin').LeadEventType;
    eventDate?: string;
    estimatedGuests?: number;
    estimatedBudget?: number;
    temperature?: import('../types/admin').LeadTemperature;
    sdrId?: string;
    sdrName?: string;
    closerId?: string;
    closerName?: string;
    notes?: string;
    debutanteBirthDate?: string;
    customFieldValues?: Record<string, any>;
    tags?: string[];
    createdBy?: string;
    createdByName?: string;
    createdByAvatar?: string;
  }): Promise<string> => {
    const newLeadId = generateUuid();
    const leadCode = generateLeadCode();
    const cleanName = data.name && data.name.trim() !== '' ? data.name.trim() : leadCode;

    const DEFAULT_COMMERCIAL_FUNNEL_ID = 'f1111111-1111-1111-1111-111111111111';
    const primaryFunnel = funnels.find(f => f.isPrimary);
    const isValUuid = (val?: string | null) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const resolvedFunnelId = (data.funnelId && isValUuid(data.funnelId))
      ? data.funnelId
      : (primaryFunnel?.id || DEFAULT_COMMERCIAL_FUNNEL_ID);

    let sdrName = data.sdrName;
    if (data.sdrId && !sdrName) {
      const found = collaborators.find(c => c.id === data.sdrId);
      if (found) sdrName = found.name;
    }

    // Roleta Automática: se não houver SDR previamente informado, consulta a roleta do funil / unidade
    const autoSdr = (!data.sdrId && !sdrName) ? getRoundRobinAssignment(resolvedFunnelId, data.venueId) : null;
    const finalSdrId = data.sdrId || autoSdr?.id;
    const finalSdrName = sdrName || autoSdr?.name;

    let closerName = data.closerName;
    if (data.closerId && !closerName) {
      const found = collaborators.find(c => c.id === data.closerId);
      if (found) closerName = found.name;
    }

    const initialActivity: LeadActivity = {
      id: generateUuid(),
      leadId: newLeadId,
      timestamp: new Date().toISOString(),
      type: 'creation',
      title: 'Lead cadastrado manualmente',
      text: data.notes ? `Observações: "${data.notes}"` : `Lead cadastrado via Funil CRM por ${currentUser?.name || 'Administrador'}.`,
      authorName: currentUser?.name || 'Administrador',
      authorId: currentUser?.id,
    };

    const initialParticipants: LeadParticipant[] = autoSdr ? [{
      id: generateUuid(),
      collaboratorId: autoSdr.id,
      collaboratorName: autoSdr.name,
      collaboratorRole: autoSdr.role || 'sdr',
      collaboratorAvatarUrl: autoSdr.avatarUrl,
      action: 'round_robin',
      timestamp: new Date().toISOString(),
    }] : [];

    const activities: LeadActivity[] = [initialActivity];
    if (autoSdr) {
      activities.unshift({
        id: generateUuid(),
        leadId: newLeadId,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        title: 'Distribuição Automática',
        text: `Lead distribuído automaticamente pela Roleta Comercial do funil para o SDR ${autoSdr.name}.`,
        authorName: 'Robô F5 Automações',
        authorId: 'system_bot',
        authorAvatarUrl: '/logo_f5.png',
      });
    }

    const targetVenue = venues.find(v => v.id === data.venueId);
    const resolvedMasterId = targetVenue?.masterId || (targetVenue as any)?.master_id || scopedMasterId || currentUser?.id;

    const newLead: Lead = {
      id: newLeadId,
      masterId: resolvedMasterId,
      code: leadCode,
      debutanteId: '',
      debutanteName: '',
      debutanteSlug: '',
      venueId: data.venueId,
      funnelId: resolvedFunnelId,
      sourceId: data.sourceId,
      source: data.source || 'outro',
      sourceName: data.sourceName || (data.source ? String(data.source) : 'Cadastro Manual'),
      subSource: data.subSource,
      name: cleanName,
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      eventType: data.eventType || undefined,
      eventDate: data.eventDate,
      estimatedGuests: data.estimatedGuests ? Number(data.estimatedGuests) : undefined,
      estimatedBudget: data.estimatedBudget ? Number(data.estimatedBudget) : undefined,
      temperature: data.temperature || undefined,
      sdrId: finalSdrId,
      sdrName: finalSdrName,
      closerId: data.closerId,
      closerName,
      assignedTo: finalSdrName || closerName || currentUser?.name,
      notes: data.notes?.trim() || undefined,
      debutanteBirthDate: data.debutanteBirthDate,
      stage: data.stage || 'new_lead',
      isValidated: false,
      pointsGranted: 0,
      participants: initialParticipants,
      tasks: [],
      activities,
      customFieldValues: data.customFieldValues || {},
      tags: data.tags || [],
      age: 15,
      group: 'Geral',
      createdBy: data.createdBy || currentUser?.id,
      createdByName: data.createdByName || currentUser?.name || 'Cadastro Manual',
      createdByAvatar: data.createdByAvatar || currentUser?.avatarUrl,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setLeads(prev => {
      const next = [newLead, ...prev];
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(next));
      return next;
    });

    if (isSupabaseConfigured) {
      await leadService.upsert(newLead);
      await leadService.addActivity(newLeadId, initialActivity);
      if (autoSdr && activities[0]) {
        await leadService.addActivity(newLeadId, activities[0]);
      }
      if (data.sourceId) {
        sourceService.recordEvent(data.sourceId, data.venueId, 'lead_created', newLeadId, {
          sourceName: data.sourceName,
          subSource: data.subSource,
          funnelId: data.funnelId,
          phone: data.phone,
        }).catch(err => console.warn('Erro ao registrar evento de fonte:', err));
      }
    }

    return newLeadId;
  };

  const shareJourneyTemplateToVenue = (templateId: string, targetVenueId: string) => {
    const found = templates.find(t => t.id === templateId);
    if (!found) return;
    const targetVenue = venues.find(v => v.id === targetVenueId);
    const newTemplate: JourneyTemplate = {
      ...found,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `${found.name} (${targetVenue?.name || 'Cópia'})`,
      venueId: targetVenueId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTemplates(prev => [...prev, newTemplate]);
  };

  const shareCatalogItemToVenue = (type: 'benefit' | 'vip', itemId: string, targetVenueId: string) => {
    if (type === 'benefit') {
      const found = benefitsCatalog.find(b => b.id === itemId);
      if (!found) return;
      const newItem: BenefitCatalogItem = {
        ...found,
        id: `ben_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        venueId: targetVenueId,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setBenefitsCatalog(prev => [...prev, newItem]);
    } else {
      const found = vipCatalog.find(v => v.id === itemId);
      if (!found) return;
      const newItem: VipRewardCatalogItem = {
        ...found,
        id: `vip_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        venueId: targetVenueId,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setVipCatalog(prev => [...prev, newItem]);
    }
  };

  const rejectLead = (leadId: string, reason: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'status_change',
      title: 'Indicação Recusada',
      text: `Motivo: ${reason}`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        stage: 'lost' as const,
        rejectionReason: reason,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        stage: 'lost',
        rejectionReason: reason,
      }).catch(err => console.error('❌ Erro ao recusar lead no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'status_change',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de recusa no Supabase:', err));

      supabase.from('referrals')
        .update({ status: 'rejected', rejection_reason: reason })
        .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
        .then(({ error }) => {
          if (error) console.error('❌ Erro ao atualizar referral rejeitado:', error);
        });
    }
  };

  const deleteLead = (leadId: string) => {
    // 1. Validação de perfil / permissão
    const isMasterOrAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.isDev;
    if (!isMasterOrAdmin) {
      alert('Permissão negada: apenas gerentes (Admin) e Master podem excluir leads do sistema.');
      return;
    }

    // 2. Trava de segurança financeira e operacional: leads ganhos (won) ou perdidos (lost) não podem ser excluídos
    const targetLead = leadsRef.current.find(l => l.id === leadId);
    if (targetLead) {
      const isWon = targetLead.stage === 'contract_signed' || (targetLead.stage as string) === 'deal_closed';
      const isLost = targetLead.stage === 'lost';
      if (isWon || isLost) {
        alert('Ação bloqueada: Leads com contrato fechado (ganhos) ou perdidos não podem ser excluídos para preservação da auditoria financeira e integridade do CRM.');
        return;
      }
    }

    deletedLeadIdsRef.current.add(leadId);
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== leadId);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
    setTasks(prev => {
      const updated = prev.filter(t => t.leadId !== leadId);
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      leadService.delete(leadId).catch(err => console.error('❌ Erro ao deletar lead no Supabase:', err));
    }
  };

  const deleteMultipleLeads = async (leadIds: string[]) => {
    if (!leadIds || leadIds.length === 0) return;

    // 1. Validação de perfil / permissão
    const isMasterOrAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.isDev;
    if (!isMasterOrAdmin) {
      alert('Permissão negada: apenas gerentes (Admin) e Master podem excluir leads do sistema.');
      return;
    }

    // 2. Filtra leads que NÃO podem ser excluídos (ganhos ou perdidos)
    const currentLeads = leadsRef.current;
    const blockedLeads: Lead[] = [];
    const validIdsToDelete: string[] = [];

    leadIds.forEach(id => {
      const lead = currentLeads.find(l => l.id === id);
      if (lead) {
        const isWon = lead.stage === 'contract_signed' || (lead.stage as string) === 'deal_closed';
        const isLost = lead.stage === 'lost';
        if (isWon || isLost) {
          blockedLeads.push(lead);
        } else {
          validIdsToDelete.push(id);
        }
      } else {
        validIdsToDelete.push(id);
      }
    });

    if (blockedLeads.length > 0) {
      alert(`Aviso de Segurança: ${blockedLeads.length} lead(s) com contrato fechado ou perdidos foram ignorados e preservados no CRM.`);
    }

    if (validIdsToDelete.length === 0) return;

    validIdsToDelete.forEach(id => deletedLeadIdsRef.current.add(id));

    // Atualização atômica instantânea sem piscar ou recarregar
    setLeads(prev => {
      const updated = prev.filter(l => !validIdsToDelete.includes(l.id));
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
    setTasks(prev => {
      const updated = prev.filter(t => !t.leadId || !validIdsToDelete.includes(t.leadId));
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await leadService.deleteMultiple(validIdsToDelete);
      } catch (err) {
        console.error('❌ Erro ao deletar múltiplos leads no Supabase:', err);
      }
    }
  };

  const archiveLead = async (leadId: string): Promise<boolean> => {
    const now = new Date().toISOString();
    setLeads(prev => {
      const updated = prev.map(l => l.id === leadId ? {
        ...l,
        isArchived: true,
        archivedAt: now,
        funnelId: undefined,
      } : l);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await leadService.archive(leadId);
      } catch (err) {
        console.error('❌ Erro ao arquivar lead no Supabase:', err);
      }
    }
    return true;
  };

  const unarchiveLead = async (leadId: string, funnelId?: string, stageId?: string): Promise<boolean> => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === leadId ? {
        ...l,
        isArchived: false,
        archivedAt: undefined,
        funnelId: funnelId || l.funnelId,
        stage: (stageId as CrmStage) || l.stage || 'new_lead',
      } : l);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await leadService.unarchive(leadId, funnelId, stageId);
      } catch (err) {
        console.error('❌ Erro ao desarquivar lead no Supabase:', err);
      }
    }
    return true;
  };

  const mergeLeads = async (primaryLeadId: string, secondaryLeadId: string): Promise<boolean> => {
    if (!primaryLeadId || !secondaryLeadId || primaryLeadId === secondaryLeadId) return false;

    const currentLeads = leadsRef.current;
    const primaryLead = currentLeads.find(l => l.id === primaryLeadId);
    const secondaryLead = currentLeads.find(l => l.id === secondaryLeadId);

    if (!primaryLead || !secondaryLead) {
      console.error('[mergeLeads] Um dos leads não foi encontrado.', { primaryLeadId, secondaryLeadId });
      return false;
    }

    try {
      const authorName = currentUser?.name || 'Administrador';
      const mergedLead = await leadService.mergeTwoLeads(primaryLead, secondaryLead, authorName);

      // Atualiza o estado local de leads: atualiza o primário e remove o secundário
      deletedLeadIdsRef.current.add(secondaryLeadId);
      setLeads(prev => {
        const next = prev.filter(l => l.id !== secondaryLeadId).map(l => l.id === primaryLeadId ? mergedLead : l);
        safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(next));
        return next;
      });

      // Migra tarefas no estado local
      setTasks(prev => {
        const next = prev.map(t => t.leadId === secondaryLeadId ? { ...t, leadId: primaryLeadId } : t);
        safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(next));
        return next;
      });

      console.log(`[mergeLeads] Leads unificados com sucesso: ${secondaryLead.name} -> ${mergedLead.name}`);
      return true;
    } catch (err) {
      console.error('[mergeLeads] Erro ao unificar leads:', err);
      return false;
    }
  };

  const closeLeadSaleWithValue = (
    leadId: string, 
    dealValue: number, 
    packageSold: string, 
    contractDate?: string, 
    closerNotes?: string,
    extraOptions?: {
      downPayment?: number;
      installmentsCount?: number;
      hasCreditCard?: boolean;
      contractSignedFileUrl?: string;
      contractSignedFileName?: string;
      guestCount?: number;
      eventYear?: number | string;
    }
  ) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;
    const cDate = contractDate || new Date().toISOString().split('T')[0];

    const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dealValue);

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'deal_closed',
      title: `Venda Concretizada (Ganho): ${formattedVal}`,
      text: closerNotes ? `Venda concluída! Pacote: ${packageSold}. Valor: ${formattedVal}. Data: ${cDate}.\nRelatório do Closer: ${closerNotes}` : `Venda concluída! Pacote: ${packageSold}. Valor: ${formattedVal}. Data: ${cDate}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    let targetLead: Lead | null = null;
    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      // Add closer as participant if they closed the deal
      let updatedParticipants = lead.participants || [];
      if (authorId && !updatedParticipants.find(p => p.collaboratorId === authorId)) {
        updatedParticipants = addParticipantToLead(
          lead, authorId, author,
          currentUser?.role || 'closer',
          authorAvatar,
          'deal_closed'
        );
      }

      targetLead = {
        ...lead,
        stage: 'contract_signed',
        dealValue,
        packageSold,
        contractDate: cDate,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };

      syncDebutanteLeadStats(lead.debutanteId);
      return targetLead;
    }));

    // Sincronização e duplicação automática para a esteira de Pós-Venda (Cliente)
    const currentLead = leads.find(l => l.id === leadId);
    if (currentLead) {
      setClients(prevClients => {
        const existingIdx = prevClients.findIndex(c => c.commercialLeadId === leadId || (c.payerPhone && c.payerPhone === currentLead.phone));
        const downPay = extraOptions?.downPayment ?? 0;
        const installCount = extraOptions?.installmentsCount ?? 10;
        const installRemaining = Math.max(0, dealValue - downPay);
        const hasCard = extraOptions?.hasCreditCard ?? false;

        const docList: ClientDocument[] = [];
        if (extraOptions?.contractSignedFileUrl) {
          docList.push({
            id: generateUuid(),
            clientId: existingIdx >= 0 ? prevClients[existingIdx].id : '',
            title: extraOptions.contractSignedFileName || 'Contrato Assinado (Fechamento Comercial)',
            type: 'contract',
            fileUrl: extraOptions.contractSignedFileUrl,
            uploadedAt: new Date().toISOString(),
            fileSize: 'PDF',
          });
        }

        if (existingIdx >= 0) {
          // Já existe, atualiza com os novos dados de fechamento
          const updated = [...prevClients];
          const handoverActs = closerNotes ? [
            {
              id: generateUuid(),
              type: 'status_change' as const,
              description: `📋 Passagem de Bastão do Closer (${author}): "${closerNotes}"`,
              createdAt: new Date().toISOString(),
              createdBy: author,
            }
          ] : [];

          updated[existingIdx] = {
            ...updated[existingIdx],
            dealValue,
            baseContractValue: dealValue,
            packageSold,
            contractDate: cDate,
            contractDownPayment: downPay > 0 ? downPay : updated[existingIdx].contractDownPayment,
            signalPaid: downPay > 0 || updated[existingIdx].signalPaid,
            signalValue: downPay > 0 ? downPay : updated[existingIdx].signalValue,
            contractInstallmentsCount: installCount || updated[existingIdx].contractInstallmentsCount,
            contractInstallmentsRemaining: installRemaining,
            hasCreditCard: hasCard || updated[existingIdx].hasCreditCard,
            guestCount: extraOptions?.guestCount || updated[existingIdx].guestCount,
            eventYear: extraOptions?.eventYear || updated[existingIdx].eventYear,
            contacts: currentLead.contacts && currentLead.contacts.length > 0 ? currentLead.contacts : updated[existingIdx].contacts,
            documents: [...docList, ...(updated[existingIdx].documents || [])],
            activities: [...handoverActs, ...(updated[existingIdx].activities || [])],
            updatedAt: new Date().toISOString().split('T')[0],
          };
          safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
          clientService.upsert(updated[existingIdx]);
          return updated;
        } else {
          // Cria novo Cliente no Pós-Venda duplicando o Lead Comercial
          const newCliId = generateUuid();
          const targetVenueId = currentLead.venueId || venues[0]?.id || '';
          const venueObj = venues.find(v => v.id === targetVenueId);
          const pDate = currentLead.partyDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const birthdayName = (currentLead as any).birthdayPersonName?.trim() || currentLead.name.trim();
          
          // Extrair decisor dos contatos se houver
          const primaryDecisor = (currentLead.contacts || []).find(c => c.isPrimaryDecisionMaker) || (currentLead.contacts || [])[0];
          const payer = primaryDecisor?.name || (currentLead as any).decisionMakerName?.trim() || (currentLead as any).payerName?.trim() || `${currentLead.name.trim()} (Responsável)`;
          const payerPhone = primaryDecisor?.phone || currentLead.phone.trim();
          const payerRel = primaryDecisor?.role || ((currentLead as any).decisionMakerRole as any) || 'mother';

          const initialActivities = [];
          if (closerNotes) {
            initialActivities.push({
              id: generateUuid(),
              type: 'status_change' as const,
              description: `📋 Passagem de Bastão do Closer (${author}): "${closerNotes}"`,
              createdAt: new Date().toISOString(),
              createdBy: author,
            });
          }
          initialActivities.push({
            id: generateUuid(),
            type: 'status_change' as const,
            description: `Venda Ganha confirmada no CRM por ${author} (Pacote: ${packageSold} • ${formattedVal}). Cliente integrado ao Pós-Venda.`,
            createdAt: new Date().toISOString(),
            createdBy: author,
          });

          // Ajusta clientID nos documentos criados
          docList.forEach(d => { d.clientId = newCliId; });

          const newClient: Client = {
            id: newCliId,
            code: generateClientCode(),
            name: birthdayName, // O nome principal é o nome da Aniversariante
            payerName: payer,
            payerRelationship: payerRel,
            payerCpf: (currentLead as any).payerCpf || (currentLead as any).cpf || '',
            payerPhone: payerPhone,
            payerEmail: currentLead.email?.trim() || '',
            payerAddress: (currentLead as any).address || '',
            payerNeighborhood: (currentLead as any).neighborhood || '',
            payerCity: (currentLead as any).city || '',
            birthdayPersonName: birthdayName,
            birthdayPersonAge: (currentLead as any).birthdayPersonAge || 15,
            birthdayPersonBirthdate: (currentLead as any).debutanteBirthDate || '',
            birthdayPersonPhone: (currentLead as any).birthdayPersonPhone || '',
            eventType: currentLead.eventType || '15_anos',
            eventDate: pDate,
            eventTime: (currentLead as any).eventTime || '20:00 às 02:00',
            eventYear: extraOptions?.eventYear || (currentLead as any).eventYear || new Date(pDate).getFullYear(),
            guestCount: extraOptions?.guestCount || (currentLead as any).guestCount || (currentLead as any).estimatedGuests || 150,
            venueId: targetVenueId,
            venueName: venueObj?.name || 'Bonomo Festas',
            packageSold,
            dealValue,
            baseContractValue: dealValue,
            contractDownPayment: downPay,
            signalPaid: downPay > 0,
            signalValue: downPay,
            contractInstallmentsCount: installCount,
            contractInstallmentsRemaining: installRemaining,
            hasCreditCard: hasCard,
            contractDate: cDate,
            contractStatus: 'aguardando_sinal',
            contractSignedAt: extraOptions?.contractSignedFileUrl ? new Date().toISOString() : null,
            paymentTerms: (currentLead as any).paymentTerms || `${downPay > 0 ? `Entrada R$ ${downPay.toLocaleString('pt-BR')} + ` : ''}${installCount}x`,
            paymentStatus: downPay > 0 ? 'up_to_date' : 'pending',
            stage: 'onboarding',
            contacts: currentLead.contacts || [],
            assignedSuccessManagerId: undefined,
            assignedSuccessManagerName: undefined,
            debutanteId: null,
            debutanteSlug: null,
            commercialLeadId: leadId,
            commercialLeadCode: currentLead.code || (currentLead as any).leadCode,
            commercialHistory: {
              origin: currentLead.sourceName || currentLead.source || (currentLead as any).origin || 'Comercial CRM',
              closedBy: author,
              closedAt: new Date().toISOString(),
              originalNotes: currentLead.notes || '',
              closerReport: closerNotes || '',
            },
            notes: currentLead.notes || '',
            documents: docList,
            activities: initialActivities,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          };

          const updated = [newClient, ...prevClients];
          safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
          clientService.upsert(newClient);
          return updated;
        }
      });
    }

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        stage: 'contract_signed',
        dealValue,
        packageSold,
        contractDate: cDate,
      }).catch(err => console.error('❌ Erro ao fechar venda no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'deal_closed',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de fechamento no Supabase:', err));

      if (authorId) {
        leadService.addParticipant(leadId, {
          collaboratorId: authorId,
          collaboratorName: author,
          collaboratorRole: currentUser?.role || 'closer',
          collaboratorAvatarUrl: authorAvatar,
          action: 'Fechou o contrato de venda',
          timestamp: newActivity.timestamp,
        }).catch(err => console.error('❌ Erro ao registrar closer no Supabase:', err));
      }
    }
  };

  const closeLeadSale = (leadId: string) => {
    closeLeadSaleWithValue(leadId, 28000, 'Pacote Padrão Real 15 Anos');
  };

  const claimLeadIfUnassigned = (leadId: string, claimantName?: string) => {
    const author = claimantName || currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: 'Lead assumido como SDR',
      text: `${author} assumiu o atendimento comercial deste lead.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const hasSdr = lead.sdrId || (lead.assignedTo && lead.assignedTo.trim() !== '' && lead.assignedTo !== 'Sem responsável');
      if (hasSdr) return lead;

      const updatedParticipants = addParticipantToLead(
        lead, authorId || generateUuid(), author,
        currentUser?.role || 'sdr',
        authorAvatar,
        'sdr_claimed'
      );

      return {
        ...lead,
        assignedTo: author,
        sdrId: authorId,
        sdrName: author,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        sdrId: authorId,
        sdrName: author,
        assignedTo: author,
      }).catch(err => console.error('❌ Erro ao assumir lead no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de SDR no Supabase:', err));

      if (authorId) {
        leadService.addParticipant(leadId, {
          collaboratorId: authorId,
          collaboratorName: author,
          collaboratorRole: currentUser?.role || 'sdr',
          collaboratorAvatarUrl: authorAvatar,
          action: 'Assumiu o atendimento como SDR',
          timestamp: newActivity.timestamp,
        }).catch(err => console.error('❌ Erro ao registrar participante SDR no Supabase:', err));
      }
    }
  };

  const assignLead = (leadId: string, assigneeName: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;
    const isUnassigning = !assigneeName || assigneeName === 'Sem responsável' || assigneeName === 'Não atribuído';

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: isUnassigning ? 'Responsável removido' : 'Responsável alterado',
      text: isUnassigning 
        ? `Responsável removido por ${author}.`
        : `Responsável alterado para "${assigneeName}" por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const oldAssignee = lead.assignedTo || 'Sem responsável';
      if (oldAssignee === assigneeName) return lead;

      return {
        ...lead,
        assignedTo: isUnassigning ? undefined : assigneeName,
        sdrName: isUnassigning ? undefined : assigneeName,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        assignedTo: isUnassigning ? undefined : assigneeName,
        sdrName: isUnassigning ? undefined : assigneeName,
      }).catch(err => console.error('❌ Erro ao atribuir lead no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de atribuição no Supabase:', err));
    }
  };

  // ── SDR / Closer Dual Responsibility ────────────────────────────────────────

  const assignLeadSdr = (leadId: string, sdrId: string) => {
    const sdr = collaborators.find(c => c.id === sdrId);
    if (!sdr) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: 'SDR responsável alterado',
      text: `SDR definido como "${sdr.name}" por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const updatedParticipants = addParticipantToLead(
        lead, sdr.id, sdr.name, sdr.role, sdr.avatarUrl, 'sdr_assigned'
      );

      return {
        ...lead,
        sdrId: sdr.id,
        sdrName: sdr.name,
        assignedTo: sdr.name,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        sdrId: sdr.id,
        sdrName: sdr.name,
        assignedTo: sdr.name,
      }).catch(err => console.error('❌ Erro ao definir SDR no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de SDR no Supabase:', err));

      leadService.addParticipant(leadId, {
        collaboratorId: sdr.id,
        collaboratorName: sdr.name,
        collaboratorRole: sdr.role,
        collaboratorAvatarUrl: sdr.avatarUrl,
        action: 'Designado como SDR responsável',
        timestamp: newActivity.timestamp,
      }).catch(err => console.error('❌ Erro ao registrar participante SDR no Supabase:', err));
    }
  };

  const assignLeadCloser = (leadId: string, closerId: string) => {
    const closer = collaborators.find(c => c.id === closerId);
    if (!closer) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: 'Closer responsável alterado',
      text: `Closer definido como "${closer.name}" por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const updatedParticipants = addParticipantToLead(
        lead, closer.id, closer.name, closer.role, closer.avatarUrl, 'closer_assigned'
      );

      return {
        ...lead,
        closerId: closer.id,
        closerName: closer.name,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        closerId: closer.id,
        closerName: closer.name,
      }).catch(err => console.error('❌ Erro ao definir Closer no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar atividade de Closer no Supabase:', err));

      leadService.addParticipant(leadId, {
        collaboratorId: closer.id,
        collaboratorName: closer.name,
        collaboratorRole: closer.role,
        collaboratorAvatarUrl: closer.avatarUrl,
        action: 'Designado como Closer responsável',
        timestamp: newActivity.timestamp,
      }).catch(err => console.error('❌ Erro ao registrar participante Closer no Supabase:', err));
    }
  };

  const removeLeadCloser = (leadId: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: 'Closer removido',
      text: `Closer removido por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        closerId: undefined,
        closerName: undefined,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.upsert({
        id: leadId,
        closerId: null as any,
        closerName: null as any,
      }).catch(err => console.error('❌ Erro ao remover Closer no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar remoção de Closer:', err));
    }
  };

  const removeLeadSdr = (leadId: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'assignment',
      title: 'SDR removido',
      text: `SDR removido por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        sdrId: undefined,
        sdrName: undefined,
        assignedTo: undefined,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    if (isSupabaseConfigured) {
      leadService.update(leadId, {
        sdrId: null as any,
        sdrName: null as any,
        assignedTo: null as any,
      }).catch(err => console.error('❌ Erro ao remover SDR no Supabase:', err));

      leadService.addActivity(leadId, {
        leadId,
        timestamp: newActivity.timestamp,
        type: 'assignment',
        title: newActivity.title,
        text: newActivity.text,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      }).catch(err => console.error('❌ Erro ao registrar remoção de SDR:', err));
    }
  };

  const updateLeadData = (leadId: string, data: Partial<Lead>) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const targetLead = leads.find(l => l.id === leadId);
    const newAuditActivities: LeadActivity[] = [];

    if (targetLead) {
      // 1. Tipo do Evento
      if (data.eventType && data.eventType !== targetLead.eventType) {
        newAuditActivities.push({
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'note',
          title: 'Tipo de Evento Alterado',
          text: `Alterou o tipo do evento de "${targetLead.eventType || 'Não definido'}" para "${data.eventType}".`,
          authorName: author,
          authorId,
          authorAvatarUrl: authorAvatar,
        });
      }

      // 2. Urgência / Temperatura
      if (data.temperature && data.temperature !== targetLead.temperature) {
        const tempLabels: Record<string, string> = {
          hot: 'Quente (Alta Probabilidade)',
          warm: 'Morno (Em Negociação)',
          cold: 'Frio (Inicial)',
        };
        newAuditActivities.push({
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'note',
          title: 'Urgência Alterada',
          text: `Alterou a urgência para "${tempLabels[data.temperature] || data.temperature}".`,
          authorName: author,
          authorId,
          authorAvatarUrl: authorAvatar,
        });
      }

      // 3. Valor de Venda / Contrato
      if (data.dealValue !== undefined && data.dealValue !== targetLead.dealValue) {
        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        newAuditActivities.push({
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'note',
          title: 'Valor de Venda Atualizado',
          text: `Alterou o valor de venda para ${fmt.format(data.dealValue)} (anterior: ${targetLead.dealValue ? fmt.format(targetLead.dealValue) : 'R$ 0,00'}).`,
          authorName: author,
          authorId,
          authorAvatarUrl: authorAvatar,
        });
      }

      // 4. Valor de Entrada
      if (data.downPayment !== undefined && data.downPayment !== targetLead.downPayment) {
        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        newAuditActivities.push({
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'note',
          title: 'Valor de Entrada Atualizado',
          text: `Alterou o valor de entrada para ${fmt.format(data.downPayment)} (anterior: ${targetLead.downPayment ? fmt.format(targetLead.downPayment) : 'R$ 0,00'}).`,
          authorName: author,
          authorId,
          authorAvatarUrl: authorAvatar,
        });
      }

      // 5. Data da Festa / Evento
      const newPartyDate = data.partyDate || data.eventDate;
      const oldPartyDate = targetLead.partyDate || targetLead.eventDate;
      if (newPartyDate && newPartyDate !== oldPartyDate) {
        newAuditActivities.push({
          id: generateUuid(),
          leadId,
          timestamp: new Date().toISOString(),
          type: 'note',
          title: 'Data do Evento Alterada',
          text: `Alterou a data do evento para ${new Date(newPartyDate + 'T12:00:00').toLocaleDateString('pt-BR')} (anterior: ${oldPartyDate ? new Date(oldPartyDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não definida'}).`,
          authorName: author,
          authorId,
          authorAvatarUrl: authorAvatar,
        });
      }
    }

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const currentActivities = data.activities ? data.activities : (lead.activities || []);
        const finalActivities = newAuditActivities.length > 0 
          ? [...currentActivities, ...newAuditActivities] 
          : currentActivities;

        return {
          ...lead,
          ...data,
          activities: finalActivities,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      });
      // Atualiza o ref imediatamente para o SSE listener ter acesso síncrono
      leadsRef.current = updated;
      return updated;
    });

    if (isSupabaseConfigured) {
      leadService.update(leadId, data).catch(err => {
        console.error('❌ Erro ao atualizar leadData no Supabase:', err);
      });
      if (newAuditActivities.length > 0) {
        newAuditActivities.forEach(act => {
          leadService.addActivity(leadId, act).catch(err => console.error('Erro ao salvar auditoria de lead no Supabase:', err));
        });
      }
    }
  };

  // ── Lead Tasks ──────────────────────────────────────────────────────────────

  const addLeadTask = (leadId: string, task: Omit<LeadTask, 'id' | 'leadId' | 'createdAt' | 'status'>): string => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();
    const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
    const isOverdue = dueDateTime < now;

    const newTask: LeadTask = {
      ...task,
      id: taskId,
      leadId,
      status: isOverdue ? 'overdue' : 'pending',
      createdAt: now.toISOString(),
      createdByName: currentUser?.name || 'Administrador',
    };

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: now.toISOString(),
        type: 'task_created',
        title: `Tarefa criada: ${task.description}`,
        text: `Para: ${task.assignedToName}. Prazo: ${task.dueDate}${task.dueTime ? ' às ' + task.dueTime : ''}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      return {
        ...lead,
        tasks: [...(lead.tasks || []), newTask],
        activities: [newActivity, ...lead.activities],
        updatedAt: now.toISOString().split('T')[0],
      };
    }));

    return taskId;
  };

  const updateLeadTask = (leadId: string, taskId: string, updates: Partial<LeadTask>) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      return {
        ...lead,
        tasks: (lead.tasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t),
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
  };

  const completeLeadTask = (leadId: string, taskId: string) => {
    const now = new Date().toISOString();
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const task = (lead.tasks || []).find(t => t.id === taskId);
      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: now,
        type: 'task_completed',
        title: `Tarefa concluída: ${task?.description || ''}`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      return {
        ...lead,
        tasks: (lead.tasks || []).map(t => t.id === taskId ? { ...t, status: 'completed', completedAt: now } : t),
        activities: [newActivity, ...lead.activities],
        updatedAt: now.split('T')[0],
      };
    }));
  };

  const deleteLeadTask = (leadId: string, taskId: string) => {
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        return {
          ...lead,
          tasks: (lead.tasks || []).filter(t => t.id !== taskId),
          updatedAt: new Date().toISOString().split('T')[0],
        };
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
    // Also remove from general tasks
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });
  };

  const addLeadActivity = (leadId: string, activity: Omit<LeadActivity, 'id' | 'timestamp' | 'leadId'>) => {
    const author = activity.authorName || currentUser?.name || 'Administrador';
    const authorId = activity.authorId || currentUser?.id;
    const authorAvatar = activity.authorAvatarUrl || currentUser?.avatarUrl;
    const now = new Date().toISOString();

    const newAct: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: now,
      type: activity.type,
      title: activity.title,
      text: activity.text,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        return {
          ...lead,
          activities: [newAct, ...(lead.activities || [])],
          updatedAt: now.split('T')[0],
        };
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      leadService.addActivity(leadId, newAct).catch(err => console.error('Erro ao adicionar atividade:', err));
    }
  };

  // ── Benefits & VIP Catalogs CRUD ─────────────────────────────────────────────

  const addBenefitCatalogItem = (data: Omit<BenefitCatalogItem, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const effectiveVenueId = data.venueId || (activeVenueId && activeVenueId !== 'all' ? activeVenueId : (scopedVenues[0]?.id || undefined));
    const newItem: BenefitCatalogItem = { ...data, id, venueId: effectiveVenueId, createdAt: new Date().toISOString().split('T')[0] };
    setBenefitsCatalog(prev => {
      const updated = [newItem, ...prev];
      safeLocalStorageSet(STORAGE_KEY_BENEFITS, JSON.stringify(updated));
      return updated;
    });
    catalogService.upsertBenefit(newItem);
    return id;
  };

  const updateBenefitCatalogItem = (id: string, data: Partial<BenefitCatalogItem>) => {
    let updatedItem: BenefitCatalogItem | undefined;
    setBenefitsCatalog(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          updatedItem = { ...b, ...data };
          return updatedItem;
        }
        return b;
      });
      safeLocalStorageSet(STORAGE_KEY_BENEFITS, JSON.stringify(updated));
      return updated;
    });
    if (updatedItem) {
      catalogService.upsertBenefit(updatedItem);
    }
  };

  const deleteBenefitCatalogItem = (id: string) => {
    setBenefitsCatalog(prev => {
      const updated = prev.filter(b => b.id !== id);
      safeLocalStorageSet(STORAGE_KEY_BENEFITS, JSON.stringify(updated));
      return updated;
    });
    catalogService.deleteBenefit(id);
  };

  const addVipCatalogItem = (data: Omit<VipRewardCatalogItem, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const effectiveVenueId = data.venueId || (activeVenueId && activeVenueId !== 'all' ? activeVenueId : (scopedVenues[0]?.id || undefined));
    const newItem: VipRewardCatalogItem = { ...data, id, venueId: effectiveVenueId, createdAt: new Date().toISOString().split('T')[0] };
    setVipCatalog(prev => {
      const updated = [newItem, ...prev];
      safeLocalStorageSet(STORAGE_KEY_VIP_CATALOG, JSON.stringify(updated));
      return updated;
    });
    catalogService.upsertVipReward(newItem);
    return id;
  };

  const updateVipCatalogItem = (id: string, data: Partial<VipRewardCatalogItem>) => {
    let updatedItem: VipRewardCatalogItem | undefined;
    setVipCatalog(prev => {
      const updated = prev.map(v => {
        if (v.id === id) {
          updatedItem = { ...v, ...data };
          return updatedItem;
        }
        return v;
      });
      safeLocalStorageSet(STORAGE_KEY_VIP_CATALOG, JSON.stringify(updated));
      return updated;
    });
    if (updatedItem) {
      catalogService.upsertVipReward(updatedItem);
    }
  };

  const deleteVipCatalogItem = (id: string) => {
    setVipCatalog(prev => {
      const updated = prev.filter(v => v.id !== id);
      safeLocalStorageSet(STORAGE_KEY_VIP_CATALOG, JSON.stringify(updated));
      return updated;
    });
    catalogService.deleteVipReward(id);
  };

  // ── Templates CRUD ───────────────────────────────────────────────────────────

  const addTemplate = (data: Omit<JourneyTemplate, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const effectiveVenueId = data.venueId || (activeVenueId && activeVenueId !== 'all' ? activeVenueId : (scopedVenues[0]?.id || undefined));
    const newTemplate: JourneyTemplate = { ...data, id, venueId: effectiveVenueId, createdAt: new Date().toISOString().split('T')[0] };
    setTemplates(prev => {
      const updated = [newTemplate, ...prev];
      safeLocalStorageSet(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    journeyTemplateService.upsert(newTemplate);
    return id;
  };

  const updateTemplate = (id: string, data: Partial<JourneyTemplate>) => {
    setTemplates(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const merged = { ...t, ...data };
          journeyTemplateService.upsert(merged);
          return merged;
        }
        return t;
      });
      safeLocalStorageSet(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      safeLocalStorageSet(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    journeyTemplateService.delete(id);
  };

  const applyTemplateToDebutante = (debutanteId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    updateDebutanteAccount(debutanteId, {
      journeyTemplateId: template.id,
      milestones: template.milestones,
      vipRewards: template.vipRewards,
      hasJourneyEnabled: true,
      isJourneyPending: false,
    });
  };

  // ── Appointments Methods ─────────────────────────────────────────────────────

  const addAppointmentForDebutante = async (debutanteId: string, appData: Omit<Appointment, 'id'>) => {
    const tempId = `app_${Date.now()}`;
    const newApp: Appointment = { ...appData, id: tempId };
    
    // Atualização otimista local
    setDebutantes(prev => {
      const updated = prev.map(d => {
        if (d.id === debutanteId || d.slug === debutanteId) return { ...d, appointments: [...d.appointments, newApp] };
        return d;
      });
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    // Persistência real no banco Supabase
    try {
      const targetDeb = debutantes.find(d => d.id === debutanteId || d.slug === debutanteId);
      const targetDebutanteId = targetDeb?.id || debutanteId;
      const targetVenueId = targetDeb?.venueId;

      const created = await appointmentService.create({
        debutanteId: targetDebutanteId,
        venueId: targetVenueId,
        appointment: appData,
      });

      if (created) {
        setDebutantes(prev => {
          const updated = prev.map(d => {
            if (d.id === targetDebutanteId || d.slug === debutanteId) {
              return {
                ...d,
                appointments: d.appointments.map(a => a.id === tempId ? created : a)
              };
            }
            return d;
          });
          safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error('Falha ao persistir agendamento no Supabase:', err);
    }
  };

  const updateAppointmentForDebutante = async (debutanteId: string, appId: string, appData: Partial<Appointment>) => {
    // Atualização otimista local
    setDebutantes(prev => {
      const updated = prev.map(d => {
        if (d.id === debutanteId || d.slug === debutanteId) {
          return { ...d, appointments: d.appointments.map(a => a.id === appId ? { ...a, ...appData } : a) };
        }
        return d;
      });
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    // Persistência real no banco Supabase
    try {
      if (!appId.startsWith('app_')) {
        await appointmentService.update(appId, appData);
      }
    } catch (err) {
      console.error('Falha ao atualizar agendamento no Supabase:', err);
    }
  };

  const deleteAppointmentForDebutante = async (debutanteId: string, appId: string) => {
    // Atualização otimista local
    setDebutantes(prev => {
      const updated = prev.map(d => {
        if (d.id === debutanteId || d.slug === debutanteId) return { ...d, appointments: d.appointments.filter(a => a.id !== appId) };
        return d;
      });
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    // Persistência real no banco Supabase
    try {
      if (!appId.startsWith('app_')) {
        await appointmentService.delete(appId);
      }
    } catch (err) {
      console.error('Falha ao deletar agendamento no Supabase:', err);
    }
  };

  const addAppointment = async (appData: Omit<Appointment, 'id'>): Promise<Appointment | null> => {
    const tempId = `app_${Date.now()}`;
    const newApp: Appointment = { ...appData, id: tempId };

    setAppointments(prev => {
      const next = [...prev, newApp];
      safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
      return next;
    });

    try {
      const created = await appointmentService.create({
        debutanteId: appData.debutanteId,
        leadId: appData.leadId,
        venueId: appData.venueId,
        appointment: appData,
      });

      if (created) {
        setAppointments(prev => {
          const next = prev.map(a => a.id === tempId ? created : a);
          safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
          return next;
        });
        return created;
      }
      return newApp;
    } catch (err) {
      console.error('Falha ao persistir agendamento no Supabase:', err);
      return newApp;
    }
  };

  const updateAppointment = async (appId: string, appData: Partial<Appointment>): Promise<boolean> => {
    setAppointments(prev => {
      const next = prev.map(a => a.id === appId ? { ...a, ...appData } : a);
      safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
      return next;
    });

    try {
      if (!appId.startsWith('app_')) {
        return await appointmentService.update(appId, appData);
      }
      return true;
    } catch (err) {
      console.error('Falha ao atualizar agendamento no Supabase:', err);
      return false;
    }
  };

  const deleteAppointment = async (appId: string): Promise<boolean> => {
    setAppointments(prev => {
      const next = prev.filter(a => a.id !== appId);
      safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
      return next;
    });

    try {
      if (!appId.startsWith('app_')) {
        return await appointmentService.delete(appId);
      }
      return true;
    } catch (err) {
      console.error('Falha ao deletar agendamento no Supabase:', err);
      return false;
    }
  };

  const updateVenueAgendaConfig = async (config: VenueAgendaConfig): Promise<boolean> => {
    setVenueAgendaConfigs(prev => {
      const idx = prev.findIndex(c => c.venueId === config.venueId);
      let next: VenueAgendaConfig[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = config;
      } else {
        next = [...prev, config];
      }
      safeLocalStorageSet(STORAGE_KEY_AGENDA_CONFIGS, JSON.stringify(next));
      return next;
    });

    try {
      return await agendaAvailabilityService.saveConfig(config);
    } catch (err) {
      console.error('Falha ao salvar configuração de agenda no Supabase:', err);
      return false;
    }
  };

  const scheduleCommercialCommitment = async (
    leadId: string, 
    type: 'visit' | 'tasting', 
    commitmentData: {
      date: string;
      time: string;
      durationMinutes?: number;
      pax: number;
      responsibleCollaboratorId?: string;
      responsibleName?: string;
      notes?: string;
      venueId?: string;
    }
  ): Promise<boolean> => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) {
      console.error('Lead não encontrado para agendamento:', leadId);
      return false;
    }

    const commitmentId = generateUuid();
    const newCommitment: CommercialCommitment = {
      id: commitmentId,
      type,
      date: commitmentData.date,
      time: commitmentData.time,
      durationMinutes: commitmentData.durationMinutes || (type === 'visit' ? 45 : 60),
      pax: Number(commitmentData.pax || 2),
      status: 'scheduled',
      responsibleCollaboratorId: commitmentData.responsibleCollaboratorId,
      responsibleName: commitmentData.responsibleName,
      notes: commitmentData.notes,
      venueId: commitmentData.venueId || targetLead.venueId,
      createdAt: new Date().toISOString(),
    };

    const isReschedule = type === 'visit' ? Boolean(targetLead.visitCommitment) : Boolean(targetLead.tastingCommitment);
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const dateFormatted = new Date(commitmentData.date + 'T12:00:00').toLocaleDateString('pt-BR');
    const actTitle = type === 'visit' 
      ? (isReschedule ? 'Visita Reagendada' : 'Visita Comercial Agendada')
      : (isReschedule ? 'Degustação Reagendada' : 'Degustação Gastronômica Agendada');
    const actText = `${type === 'visit' ? 'Visita' : 'Degustação'} ${isReschedule ? 'reagendada' : 'agendada'} para ${dateFormatted} às ${commitmentData.time} (${commitmentData.pax || 2} PAX)${commitmentData.responsibleName ? ` com ${commitmentData.responsibleName}` : ''}.${commitmentData.notes ? ` Observações: "${commitmentData.notes}".` : ''} Registrado por ${author}.`;

    const scheduleActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: actTitle,
      text: actText,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    // Atualização otimista no Lead
    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === leadId) {
          const currentActs = l.activities || [];
          if (type === 'visit') {
            return { ...l, visitCommitment: newCommitment, activities: [...currentActs, scheduleActivity] };
          } else {
            return { ...l, tastingCommitment: newCommitment, activities: [...currentActs, scheduleActivity] };
          }
        }
        return l;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(next));
      return next;
    });

    // Cria também na tabela central de appointments para visualização no calendário
    await addAppointment({
      title: `${type === 'visit' ? 'Visita Comercial' : 'Degustação Gastronômica'} • ${targetLead.name}`,
      category: type === 'visit' ? 'Visita Técnica / Apresentação' : 'Buffet & Degustação',
      date: commitmentData.date,
      time: commitmentData.time,
      location: (venues.find(v => v.id === (commitmentData.venueId || targetLead.venueId))?.name) || 'Casa de Festas',
      status: 'scheduled',
      targetType: 'lead',
      leadId: targetLead.id,
      leadName: targetLead.name,
      pax: Number(commitmentData.pax || 2),
      guestsCount: Number(commitmentData.pax || 2),
      venueId: commitmentData.venueId || targetLead.venueId,
      responsibleCollaboratorId: commitmentData.responsibleCollaboratorId,
      responsibleName: commitmentData.responsibleName,
      notes: commitmentData.notes,
    });

    // Persistência no Lead no Supabase
    try {
      const updatePayload = type === 'visit'
        ? { visitCommitment: newCommitment }
        : { tastingCommitment: newCommitment };
      await leadService.update(leadId, updatePayload as any);
      leadService.addActivity(leadId, scheduleActivity).catch(err => console.error('Erro ao salvar nota de agendamento:', err));
      return true;
    } catch (err) {
      console.error('Falha ao persistir compromisso comercial no lead:', err);
      return true;
    }
  };

  const completeCommercialCommitment = async (
    leadId: string, 
    type: 'visit' | 'tasting', 
    feedback?: string
  ): Promise<boolean> => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return false;

    const currentCommitment = type === 'visit' ? targetLead.visitCommitment : targetLead.tastingCommitment;
    if (!currentCommitment) return false;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const completedCommitment: CommercialCommitment = {
      ...currentCommitment,
      status: 'completed',
      completedAt: new Date().toISOString(),
      notes: feedback ? `${currentCommitment.notes || ''} [Conclusão: ${feedback}]`.trim() : currentCommitment.notes,
    };

    const actTitle = type === 'visit' ? 'Visita Realizada com Sucesso' : 'Degustação Realizada com Sucesso';
    const actText = `${type === 'visit' ? 'Visita comercial' : 'Degustação gastronômica'} realizada com sucesso no dia ${new Date().toLocaleDateString('pt-BR')}.${feedback ? ` Parecer / Feedback da realização: "${feedback}".` : ''} Registrado por ${author}.`;

    const completeActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: actTitle,
      text: actText,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === leadId) {
          const currentActs = l.activities || [];
          if (type === 'visit') {
            return { ...l, visitCommitment: completedCommitment, activities: [...currentActs, completeActivity] };
          } else {
            return { ...l, tastingCommitment: completedCommitment, activities: [...currentActs, completeActivity] };
          }
        }
        return l;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(next));
      return next;
    });

    // Atualiza appointments relacionados
    setAppointments(prev => {
      const next = prev.map(a => {
        if (a.leadId === leadId && (type === 'visit' ? a.title.includes('Visita') : a.title.includes('Degustação'))) {
          return { ...a, status: 'completed' as const };
        }
        return a;
      });
      safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
      return next;
    });

    try {
      const updatePayload = type === 'visit'
        ? { visitCommitment: completedCommitment }
        : { tastingCommitment: completedCommitment };
      await leadService.update(leadId, updatePayload as any);
      leadService.addActivity(leadId, completeActivity).catch(err => console.error('Erro ao salvar nota de conclusão:', err));
      return true;
    } catch (err) {
      console.error('Falha ao concluir compromisso no Supabase:', err);
      return true;
    }
  };

  const cancelCommercialCommitment = async (
    leadId: string, 
    type: 'visit' | 'tasting', 
    reason?: string,
    statusOverride?: 'cancelled' | 'no_show'
  ): Promise<boolean> => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return false;

    const currentCommitment = type === 'visit' ? targetLead.visitCommitment : targetLead.tastingCommitment;
    if (!currentCommitment) return false;

    const finalStatus = statusOverride || 'cancelled';
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const cancelledCommitment: CommercialCommitment = {
      ...currentCommitment,
      status: finalStatus,
      cancelledAt: new Date().toISOString(),
      notes: reason ? `${currentCommitment.notes || ''} [${finalStatus === 'no_show' ? 'Não Compareceu (No-Show)' : 'Cancelamento'}: ${reason}]`.trim() : currentCommitment.notes,
    };

    const isNoShow = finalStatus === 'no_show';
    const actTitle = isNoShow 
      ? (type === 'visit' ? 'Visita: Não Compareceu (No-Show)' : 'Degustação: Não Compareceu (No-Show)')
      : (type === 'visit' ? 'Visita Comercial Cancelada' : 'Degustação Gastronômica Cancelada');
    const actText = `${isNoShow ? 'Cliente/família não compareceu ao compromisso agendado (No-Show).' : 'Compromisso comercial cancelado.'}${reason ? ` Motivo informado: "${reason}".` : ''} Registrado por ${author}.`;

    const cancelActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'note',
      title: actTitle,
      text: actText,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    setLeads(prev => {
      const next = prev.map(l => {
        if (l.id === leadId) {
          const currentActs = l.activities || [];
          if (type === 'visit') {
            return { ...l, visitCommitment: cancelledCommitment, activities: [...currentActs, cancelActivity] };
          } else {
            return { ...l, tastingCommitment: cancelledCommitment, activities: [...currentActs, cancelActivity] };
          }
        }
        return l;
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(next));
      return next;
    });

    // Atualiza appointments relacionados
    setAppointments(prev => {
      const next = prev.map(a => {
        if (a.leadId === leadId && (type === 'visit' ? a.title.includes('Visita') : a.title.includes('Degustação'))) {
          return { ...a, status: 'cancelled' as const };
        }
        return a;
      });
      safeLocalStorageSet(STORAGE_KEY_APPOINTMENTS, JSON.stringify(next));
      return next;
    });

    try {
      const updatePayload = type === 'visit'
        ? { visitCommitment: cancelledCommitment }
        : { tastingCommitment: cancelledCommitment };
      await leadService.update(leadId, updatePayload as any);
      return true;
    } catch (err) {
      console.error('Falha ao atualizar status de cancelamento/no-show no Supabase:', err);
      return true;
    }
  };


  // ── Query Helpers ────────────────────────────────────────────────────────────

  const getDebutanteBySlug = (slug: string): DebutanteAccount | undefined => {
    if (!slug) return undefined;
    const clean = decodeURIComponent(slug).toLowerCase().trim();
    
    // 1. Check in-memory debutantes
    const foundInState = debutantes.find(d => 
      (d.slug && d.slug.toLowerCase().trim() === clean) || 
      (d.id && d.id.toLowerCase().trim() === clean)
    );
    if (foundInState) return foundInState;

    // 2. Fallback: check localStorage directly (useful on instant new-tab open)
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEBUTANTES);
      if (saved) {
        const list: DebutanteAccount[] = JSON.parse(saved);
        const foundInStorage = list.find(d => 
          (d.slug && d.slug.toLowerCase().trim() === clean) || 
          (d.id && d.id.toLowerCase().trim() === clean)
        );
        if (foundInStorage) return foundInStorage;
      }
    } catch (e) {
      console.error('Error in getDebutanteBySlug storage lookup:', e);
    }

    return undefined;
  };

  const getVenueById = (venueId: string): Venue | undefined => {
    return venues.find(v => v.id === venueId);
  };

  const getCollaboratorById = (id: string): Collaborator | undefined => {
    return collaborators.find(c => c.id === id);
  };

  // Returns all leads where the collaborator is SDR, Closer, or appears in participants
  const getLeadsByCollaborator = (collaboratorId: string): Lead[] => {
    return leads.filter(lead =>
      lead.sdrId === collaboratorId ||
      lead.closerId === collaboratorId ||
      (lead.participants || []).some(p => p.collaboratorId === collaboratorId)
    );
  };

  // Returns all tasks assigned to a collaborator, enriched with lead name
  const getTasksByCollaborator = (collaboratorId: string): (LeadTask & { leadName: string; leadId: string })[] => {
    const result: (LeadTask & { leadName: string; leadId: string })[] = [];
    for (const lead of leads) {
      for (const task of (lead.tasks || [])) {
        if (task.assignedToId === collaboratorId) {
          result.push({ ...task, leadName: lead.name, leadId: lead.id });
        }
      }
    }
    return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  // ── General & Personal Tasks ───────────────────────────────────────────────

  const addTask = (data: Omit<AdminTask, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const newTask: AdminTask = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (data.leadId) {
      const assignee = collaborators.find(c => (data.assignedToIds || []).includes(c.id));
      const newLeadTask: LeadTask = {
        id,
        leadId: data.leadId,
        description: data.title + (data.description ? ` - ${data.description}` : ''),
        dueDate: data.dueDate || '',
        dueTime: data.dueTime,
        priority: data.priority === 'urgent' ? 'high' : (data.priority as 'low' | 'medium' | 'high' | undefined),
        status: data.status === 'completed' ? 'completed' : 'pending',
        assignedToId: data.assignedToIds?.[0] || 'master',
        assignedToName: assignee?.name || data.createdByName || 'Responsável',
        assignedToAvatarUrl: assignee?.avatarUrl,
        createdByName: data.createdByName || 'Comercial',
        createdAt: new Date().toISOString(),
      };

      const newActivity = {
        id: `act_${Date.now()}`,
        leadId: data.leadId,
        timestamp: new Date().toISOString(),
        type: 'task_created' as const,
        title: `Tarefa agendada: ${data.title}`,
        text: `Prazo: ${data.dueDate}${data.dueTime ? ' às ' + data.dueTime : ''}. Responsável: ${newLeadTask.assignedToName}.`,
        authorName: data.createdByName || currentUser?.name || 'Administrador',
        authorId: currentUser?.id,
        authorAvatarUrl: currentUser?.avatarUrl,
      };

      setLeads(prev => {
        const updated = prev.map(lead => {
          if (lead.id !== data.leadId) return lead;
          return {
            ...lead,
            tasks: [...(lead.tasks || []).filter(t => t.id !== id), newLeadTask],
            activities: [newActivity, ...(lead.activities || [])],
            updatedAt: new Date().toISOString().split('T')[0],
          };
        });
        safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
        return updated;
      });
    }

    const effectiveClientId = data.debutanteId || data.customProperties?.clientId;
    if (effectiveClientId) {
      const author = data.createdByName || currentUser?.name || 'Administrador';
      const newClientActivity: ClientActivity = {
        id: generateUuid(),
        clientId: effectiveClientId,
        timestamp: new Date().toISOString(),
        type: 'task_created',
        description: `📋 Tarefa agendada: "${data.title}" (Prazo: ${data.dueDate || 'Sem prazo'}${data.dueTime ? ' às ' + data.dueTime : ''})`,
        createdAt: new Date().toISOString(),
        createdBy: author,
      };

      setClients(prev => {
        let changed = false;
        const updated = prev.map(cli => {
          if (cli.id !== effectiveClientId && cli.debutanteId !== effectiveClientId) return cli;
          changed = true;
          return {
            ...cli,
            activities: [newClientActivity, ...(cli.activities || [])],
            updatedAt: new Date().toISOString().split('T')[0],
          };
        });
        if (changed) {
          safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
        }
        return updated;
      });
    }

    taskService.upsert(newTask);

    return id;
  };

  const updateTask = (id: string, data: Partial<AdminTask>) => {
    let fullTaskToSave: AdminTask | undefined;
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          fullTaskToSave = { ...t, ...data };
          return fullTaskToSave;
        }
        return t;
      });
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (fullTaskToSave) {
      taskService.upsert(fullTaskToSave);
    } else {
      taskService.upsert({ id, ...data });
    }

    setLeads(prev => {
      let changed = false;
      const updated = prev.map(lead => {
        if (!(lead.tasks || []).some(t => t.id === id)) return lead;
        changed = true;
        return {
          ...lead,
          tasks: (lead.tasks || []).map(t => t.id === id ? {
            ...t,
            ...data,
          } as any : t),
        };
      });
      if (changed) {
        safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const deleteTask = (id: string) => {
    deletedTaskIdsRef.current.add(id);
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });
    // Also remove from any lead.tasks where task.id === id
    setLeads(prev => {
      const updated = prev.map(lead => ({
        ...lead,
        tasks: (lead.tasks || []).filter(t => t.id !== id),
      }));
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });

    taskService.delete(id);
  };

  const toggleTaskStatus = (id: string) => {
    let nextStatus: TaskStatus = 'completed';
    let targetTask: AdminTask | undefined;
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          nextStatus = t.status === 'completed' ? 'todo' : 'completed';
          targetTask = {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
          };
          return targetTask;
        }
        return t;
      });
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (targetTask) {
      taskService.upsert(targetTask);
    }

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (!(lead.tasks || []).some(t => t.id === id)) return lead;
        return {
          ...lead,
          tasks: (lead.tasks || []).map(t => t.id === id ? {
            ...t,
            status: nextStatus as any,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
          } : t),
        };
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
  };

  const addTaskComment = (taskId: string, text: string) => {
    if (!text.trim()) return;
    const comment = {
      id: generateUuid(),
      authorId: currentUser?.id || 'admin',
      authorName: currentUser?.name || 'Administrador',
      authorAvatar: currentUser?.avatarUrl,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== taskId) return t;
        const comments = [...(t.comments || []), comment];
        return { ...t, comments };
      });
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });
  };

  const completeTaskWithFeedback = (taskId: string, feedback: string, customFinalStatus: TaskStatus = 'completed') => {
    let targetTask: AdminTask | undefined;
    const cleanFeedback = feedback.trim();
    const nowIso = new Date().toISOString();

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          targetTask = {
            ...t,
            status: customFinalStatus,
            resolution: cleanFeedback,
            mandatoryFeedback: cleanFeedback,
            completedAt: nowIso,
            customProperties: {
              ...(t.customProperties || {}),
              resolution: cleanFeedback,
            },
          };
          return targetTask;
        }
        return t;
      });
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    if (targetTask) {
      taskService.upsert(targetTask);

      const author = currentUser?.name || 'Equipe';
      const effectiveLeadId = (targetTask as AdminTask).leadId || (targetTask as AdminTask).customProperties?.leadId;
      const effectiveClientId = (targetTask as AdminTask).debutanteId || (targetTask as AdminTask).customProperties?.clientId;

      const dueDateStr = (targetTask as AdminTask).dueDate
        ? new Date((targetTask as AdminTask).dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
        : 'Sem data';
      const isFollowUp = (targetTask as AdminTask).isFollowUp || (targetTask as AdminTask).type === 'followup' || (targetTask as AdminTask).type === 'call';
      const labelType = isFollowUp ? 'O follow-up previsto' : 'A tarefa prevista';
      const summaryText = cleanFeedback 
        ? `${labelType} para ${dueDateStr} foi concluído(a) por ${author}, cujo resumo foi: "${cleanFeedback}".`
        : `${labelType} para ${dueDateStr} foi marcado(a) como concluído(a) por ${author}.`;

      // 1. Atualizar Lead
      if (effectiveLeadId) {
        const newActivity: LeadActivity = {
          id: generateUuid(),
          leadId: effectiveLeadId,
          timestamp: nowIso,
          type: 'task_completed',
          title: `Follow-up Concluído: ${(targetTask as AdminTask).title}`,
          text: summaryText,
          authorName: author,
          authorId: currentUser?.id,
          authorAvatarUrl: currentUser?.avatarUrl,
          customProperties: {
            taskId: (targetTask as AdminTask).id,
            isFollowUp: true,
          },
        } as any;

        setLeads(prev => {
          const updated = prev.map(lead => {
            if (lead.id !== effectiveLeadId) return lead;
            return {
              ...lead,
              tasks: (lead.tasks || []).map(t => t.id === taskId ? {
                ...t,
                status: customFinalStatus as any,
                completedAt: nowIso,
              } : t),
              activities: [newActivity, ...(lead.activities || [])],
              updatedAt: nowIso.split('T')[0],
            };
          });
          safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
          return updated;
        });

        if (isSupabaseConfigured) {
          leadService.addActivity(effectiveLeadId, newActivity).catch(err => console.warn('Erro ao salvar atividade de tarefa:', err));
        }
      }

      // 2. Atualizar Cliente
      if (effectiveClientId) {
        const newClientActivity: ClientActivity = {
          id: generateUuid(),
          clientId: effectiveClientId,
          timestamp: nowIso,
          type: 'task_completed',
          description: `📋 ${summaryText}`,
          createdAt: nowIso,
          createdBy: author,
          customProperties: {
            taskId: (targetTask as AdminTask).id,
          },
        } as any;

        setClients(prev => {
          let changed = false;
          const updated = prev.map(cli => {
            if (cli.id !== effectiveClientId && cli.debutanteId !== effectiveClientId) return cli;
            changed = true;
            return {
              ...cli,
              activities: [newClientActivity, ...(cli.activities || [])],
              updatedAt: nowIso.split('T')[0],
            };
          });
          if (changed) {
            safeLocalStorageSet(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
          }
          return updated;
        });
      }
    }
  };

  const consolidateAllDuplicateLeads = async (): Promise<{ mergedCount: number }> => {
    const current = leadsRef.current;
    const { consolidatedLeads, mergedCount } = await leadService.consolidateDuplicatesInDatabase(current);
    if (mergedCount > 0) {
      setLeads(consolidatedLeads);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(consolidatedLeads));
    }
    return { mergedCount };
  };

  // ── Provider ────────────────────────────────────────────────────────────────

  return (
    <AdminStateContext.Provider value={{
      currentUser,
      collaborators: scopedCollaborators,
      allCollaborators: collaborators,
      venues: scopedVenues,
      allVenues: venues,
      debutantes: scopedDebutantes,
      allDebutantes: debutantes,
      leads: scopedLeads,
      templates: scopedTemplates,
      benefitsCatalog: scopedBenefitsCatalog,
      vipCatalog: scopedVipCatalog,
      funnels: scopedFunnels,
      tasks: scopedTasks,
      activeVenueId,
      activeDebutanteId,
      theme,
      setTheme,
      login,
      logout,
      switchUserRoleDemo,
      switchCollaborator,
      updateCurrentUserProfile,
      addCollaborator,
      updateCollaborator,
      deleteCollaborator,
      setActiveVenueId,
      addVenue,
      updateVenue,
      deleteVenue,
      updateVenueDistribution,
      setActiveDebutanteId,
      addDebutanteAccount,
      updateDebutanteAccount,
      deleteDebutanteAccount,
      setDebutanteStatus,
      toggleDebutanteStatus,
      updateDebutanteModuleToggle,
      updateDebutanteMilestones,
      updateDebutanteVipRewards,
      linkDebutanteJourney,
      markWelcomeVideoSeen,
      clients: scopedClients,
      allClients: clients,
      addClient,
      updateClient,
      deleteClient,
      updateClientStage,
      addClientNote,
      addClientDocument,
      linkClientDebutante,
      addClientUpsellSale,
      updateClientUpsellSale,
      deleteClientUpsellSale,
      addFunnel,
      updateFunnel,
      deleteFunnel,
      deleteFunnelWithLeadMigration,
      duplicateFunnel,
      reorderFunnels,
      markLeadAsRead,
      unindexedLeadsCount,
      reassignLeadFunnel,
      reassignMultipleLeadsFunnel,
      sources: scopedSources,
      allSources: sources,
      addSource,
      updateSource,
      deleteSource,
      toggleSourceStatus,
      hasUnconfiguredSources,
      unconfiguredSourcesCount,
      updateLeadStage,
      addLeadNote,
      validateLead,
      invalidateLead,
      createLeadFromReferral,
      createLeadFromWhatsApp,
      createLead,
      rejectLead,
      deleteLead,
      deleteMultipleLeads,
      archiveLead,
      unarchiveLead,
      mergeLeads,
      consolidateAllDuplicateLeads,
      syncWhatsAppHistoryGap,
      closeLeadSale,
      closeLeadSaleWithValue,
      updateLeadData,
      assignLead,
      claimLeadIfUnassigned,
      assignLeadSdr,
      assignLeadCloser,
      removeLeadCloser,
      removeLeadSdr,
      distributeLeadRoundRobin,
      addLeadTask,
      updateLeadTask,
      completeLeadTask,
      deleteLeadTask,
      addLeadActivity,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,
      addTaskComment,
      completeTaskWithFeedback,
      getLeadsByCollaborator,
      getTasksByCollaborator,
      addBenefitCatalogItem,
      updateBenefitCatalogItem,
      deleteBenefitCatalogItem,
      addVipCatalogItem,
      updateVipCatalogItem,
      deleteVipCatalogItem,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      applyTemplateToDebutante,
      shareJourneyTemplateToVenue,
      shareCatalogItemToVenue,
      addAppointmentForDebutante,
      updateAppointmentForDebutante,
      deleteAppointmentForDebutante,
      appointments: scopedAppointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      venueAgendaConfigs,
      updateVenueAgendaConfig,
      scheduleCommercialCommitment,
      completeCommercialCommitment,
      cancelCommercialCommitment,
      getDebutanteBySlug,
      getVenueById,
      getCollaboratorById,
      mqlQuestions: scopedMqlQuestions,
      allMqlQuestions: mqlQuestions,
      addMqlQuestion,
      updateMqlQuestion,
      deleteMqlQuestion,
      saveLeadMqlAnswers,
      resetVenueLeadsMql,
      leadGoal,
      setLeadGoal,
      featureFlags,
      updateFeatureFlag,
      getFeatureStatus,
      featureDescriptions,
      updateFeatureComingSoonMessage,
      isFlagsLoaded,
      supportTickets,
      createSupportTicket,
      updateSupportTicketStatus,
      sendSupportMessage,
      announcements,
      createAnnouncement,
      markAnnouncementAsRead,
      impersonatingMaster,
      startImpersonation,
      stopImpersonation,
      allLeads: leads,
      allTasks: tasks,
      addMasterAccount,
      toggleMasterAccountStatus,
      isInitialSyncComplete,
      sendCollaboratorInvite,
      userPinnedFunnelIds,
      togglePinFunnel,
      isFunnelPinned,
      forceLogout: (reason?: string) => {
        logout();
        if (reason) alert(reason);
      },
    }}>
      {children}
    </AdminStateContext.Provider>
  );
};

export const useAdminState = () => {
  const context = useContext(AdminStateContext);
  if (!context) {
    throw new Error('useAdminState must be used within an AdminStateProvider');
  }
  return context;
};
