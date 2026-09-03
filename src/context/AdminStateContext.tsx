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
  FeatureFlagStatus
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
import { safeLocalStorageSet } from '../utils/mediaStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { venueService } from '../services/venueService';
import { funnelService } from '../services/funnelService';
import { leadService } from '../services/leadService';
import { sourceService } from '../services/sourceService';
import { debutanteService, taskService } from '../services/debutanteService';
import { catalogService } from '../services/catalogService';
import { collaboratorService, featureFlagService } from '../services/collaboratorService';
import { journeyTemplateService } from '../services/journeyTemplateService';
import { mqlService } from '../services/mqlService';
import { createMonogramAvatar } from '../utils/avatarUtils';
import { generateLeadCode } from '../utils/leadUtils';

const STORAGE_KEY_USER = 'bonomo_admin_user_v7';
const STORAGE_KEY_COLLABORATORS = 'bonomo_admin_collaborators_v7';
const STORAGE_KEY_VENUES = 'bonomo_admin_venues_v7';
const STORAGE_KEY_DEBUTANTES = 'bonomo_admin_debutantes_v7';
const STORAGE_KEY_LEADS = 'bonomo_admin_leads_v7';
const STORAGE_KEY_SOURCES = 'bonomo_admin_sources_v1';
const STORAGE_KEY_TEMPLATES = 'bonomo_admin_templates_v7';
const STORAGE_KEY_ACTIVE_VENUE = 'bonomo_admin_active_venue_v7';
const STORAGE_KEY_BENEFITS = 'bonomo_admin_benefits_catalog_v7';
const STORAGE_KEY_VIP_CATALOG = 'bonomo_admin_vip_catalog_v7';
const STORAGE_KEY_THEME = 'bonomo_admin_theme_v7';
const STORAGE_KEY_TASKS = 'bonomo_admin_tasks_v7';
const STORAGE_KEY_FUNNELS = 'bonomo_admin_funnels_v7';
const STORAGE_KEY_LEAD_GOAL = 'bonomo_admin_lead_goal_v7';
const STORAGE_KEY_MQL_QUESTIONS = 'bonomo_admin_mql_questions_v1';
const STORAGE_KEY_FEATURE_FLAGS = 'f5_system_feature_flags_v1';

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

const DEFAULT_COLLABORATORS: Collaborator[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'F5 Developer',
    email: 'bonomofestas@gmail.com',
    role: 'dev',
    venueId: 'all',
    avatarUrl: '/f5_mark.png',
    phone: '(21) 99999-9999',
    password: 'Bonomo#2026',
    active: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'F5 Master',
    email: 'dev@bonomoapp.com',
    role: 'master',
    venueId: 'all',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    phone: '(21) 99999-9999',
    password: 'Bonomo#2026',
    active: true,
    createdAt: '2026-01-01',
  }
];

const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagId, FeatureFlagStatus> = {
  whatsapp: 'active',
  icp: 'active',
  sources: 'active',
  debutantes: 'active',
  venue_goals: 'active',
  funnels: 'active',
  master_dashboard: 'active',
  collaborators: 'active',
  venues: 'active',
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
  updateCurrentUserProfile: (data: Partial<AdminUser>) => void;

  // Collaborators
  addCollaborator: (data: Omit<Collaborator, 'id' | 'createdAt'>) => string;
  updateCollaborator: (id: string, data: Partial<Collaborator>) => void;
  deleteCollaborator: (id: string) => void;

  // Venue Management
  setActiveVenueId: (id: string | null) => void;
  addVenue: (venueData: Omit<Venue, 'id' | 'createdAt'>) => string;
  updateVenue: (id: string, venueData: Partial<Venue>) => void;
  deleteVenue: (id: string) => void;
  updateVenueDistribution: (venueId: string, mode: 'queue' | 'round_robin', sdrIds: string[]) => void;

  // Debutante Management
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
  deleteDebutanteAccount: (id: string) => void;
  setDebutanteStatus: (id: string, status: 'active' | 'inactive') => void;
  toggleDebutanteStatus: (id: string) => void;
  updateDebutanteModuleToggle: (id: string, hasJourneyEnabled: boolean) => void;
  updateDebutanteMilestones: (id: string, milestones: Milestone[]) => void;
  updateDebutanteVipRewards: (id: string, vipRewards: VipReward[]) => void;
  linkDebutanteJourney: (debutanteId: string, templateId: string) => void;
  markWelcomeVideoSeen: (slugOrId: string) => void;

  // Funnel Management
  addFunnel: (data: Omit<CommercialFunnel, 'id' | 'createdAt'>) => string;
  updateFunnel: (id: string, data: Partial<CommercialFunnel>) => void;
  deleteFunnel: (id: string) => void;

  // CRM Leads — Stage & Assignment
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
  }) => Promise<string>;
  rejectLead: (leadId: string, reason: string) => void;
  deleteLead: (leadId: string) => void;
  closeLeadSale: (leadId: string) => void;
  closeLeadSaleWithValue: (leadId: string, dealValue: number, packageSold: string, contractDate?: string) => void;
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

  // Appointments
  addAppointmentForDebutante: (debutanteId: string, appData: Omit<Appointment, 'id'>) => void;
  updateAppointmentForDebutante: (debutanteId: string, appId: string, appData: Partial<Appointment>) => void;
  deleteAppointmentForDebutante: (debutanteId: string, appId: string) => void;

  // General & Personal Tasks (Home / CRM)
  tasks: AdminTask[];
  addTask: (data: Omit<AdminTask, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, data: Partial<AdminTask>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // MQL (Marketing Qualified Lead) System
  mqlQuestions: MqlQuestion[];
  addMqlQuestion: (data: Omit<MqlQuestion, 'id'>) => string;
  updateMqlQuestion: (id: string, data: Partial<MqlQuestion>) => void;
  deleteMqlQuestion: (id: string) => void;
  saveLeadMqlAnswers: (leadId: string, answers: Record<string, string>, score: number, level: LeadMqlLevel) => void;

  // Commercial Funnel Lead Goal
  leadGoal: import('../types/admin').LeadGoal;
  setLeadGoal: (goal: import('../types/admin').LeadGoal) => void;

  // Feature Flags (Developer Controlled)
  featureFlags: Record<FeatureFlagId, FeatureFlagStatus>;
  updateFeatureFlag: (featureId: FeatureFlagId, status: FeatureFlagStatus) => void;
  getFeatureStatus: (featureId: FeatureFlagId) => FeatureFlagStatus;
}

const AdminStateContext = createContext<AdminContextType | undefined>(undefined);

export const AdminStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
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

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LEADS);
    const parsed: Lead[] = saved ? JSON.parse(saved) : DEFAULT_LEADS;
    return parsed.map(lead => {
      const code = lead.code || generateLeadCode();
      const name = (!lead.name || lead.name.trim() === '' || lead.name === 'Sem nome' || lead.name === 'Lead Sem Nome')
        ? code
        : lead.name;
      return { ...lead, code, name };
    });
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
    const savedVenues = localStorage.getItem(STORAGE_KEY_VENUES);
    const existingVenues: Venue[] = savedVenues ? JSON.parse(savedVenues) : DEFAULT_VENUES;
    const initialQuestions = existingVenues.flatMap(v => createDefaultMqlQuestionsForVenue(v.id));
    if (initialQuestions.length > 0) {
      safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(initialQuestions));
    }
    return initialQuestions;
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

  const [funnels, setFunnels] = useState<CommercialFunnel[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FUNNELS);
    if (!saved) return [];
    try {
      const parsed: CommercialFunnel[] = JSON.parse(saved);
      // Clean out legacy mock funnels and funnels without a valid venue
      return parsed.filter(f => 
        f.id !== 'indicacao' && 
        f.id !== 'trafego' && 
        f.id !== 'parcerias' && 
        f.venueId !== 'all'
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

  const updateFeatureFlag = (featureId: FeatureFlagId, status: FeatureFlagStatus) => {
    setFeatureFlags(prev => {
      const updated = { ...prev, [featureId]: status };
      safeLocalStorageSet(STORAGE_KEY_FEATURE_FLAGS, JSON.stringify(updated));
      return updated;
    });
    featureFlagService.update(featureId, status);
  };

  const getFeatureStatus = (featureId: FeatureFlagId): FeatureFlagStatus => {
    // DEV role ALWAYS sees and accesses every feature
    if (currentUser?.role === 'dev') return 'active';
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
  }, [venues]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(debutantes));
  }, [debutantes]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(leads));
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
        const [dbVenues, dbFunnels, dbLeads, dbDebutantes, dbTasks, dbCollabs, dbBenefits, dbVip, dbTemplates, dbSources, dbMql] = await Promise.all([
          venueService.getAll(),
          funnelService.getAll(),
          leadService.getAll(),
          debutanteService.getAll(),
          taskService.getAll(),
          collaboratorService.getAll(),
          catalogService.getAllBenefits(),
          catalogService.getAllVipRewards(),
          journeyTemplateService.getAll(),
          sourceService.getAll(),
          mqlService.getAll(),
        ]);

        if (isMounted) {
          if (dbVenues.length > 0) setVenues(dbVenues);
          if (dbFunnels.length > 0) setFunnels(dbFunnels);
          if (dbLeads.length > 0) {
            const enrichedLeads = dbLeads.map(l => {
              const code = l.code || generateLeadCode();
              const name = (!l.name || l.name.trim() === '' || l.name === 'Sem nome' || l.name === 'Lead Sem Nome')
                ? code
                : l.name;
              return { ...l, code, name };
            });
            setLeads(enrichedLeads);
          }
          if (dbSources.length > 0) setSources(dbSources);
          if (dbMql.length > 0) {
            setMqlQuestions(dbMql);
          } else if (dbVenues.length > 0) {
            mqlService.ensureDefaultQuestions(dbVenues).then(defaults => {
              if (defaults.length > 0) setMqlQuestions(defaults);
            });
          }

          // Ensure each venue has a default referral source
          sourceService.ensureDefaultReferralSources(dbVenues, dbFunnels);

          // Merge local debutantes with remote database to prevent any data loss
          const localDebsRaw = localStorage.getItem(STORAGE_KEY_DEBUTANTES);
          const localDebs: DebutanteAccount[] = localDebsRaw ? JSON.parse(localDebsRaw) : [];
          
          for (const lDeb of localDebs) {
            if (!dbDebutantes.some(d => d.id === lDeb.id || d.slug === lDeb.slug)) {
              debutanteService.upsert(lDeb);
            }
          }

          const combinedDebs = [...dbDebutantes];
          for (const lDeb of localDebs) {
            if (!combinedDebs.some(d => d.id === lDeb.id || d.slug === lDeb.slug)) {
              combinedDebs.push(lDeb);
            }
          }
          if (combinedDebs.length > 0) setDebutantes(combinedDebs);

          if (dbTasks.length > 0) setTasks(dbTasks);
          if (dbCollabs.length > 0) {
            setCollaborators(dbCollabs);
            const activeEmail = currentUser?.email || 'dev@bonomoapp.com';
            const matched = dbCollabs.find(c => c.email.toLowerCase() === activeEmail.toLowerCase());
            if (matched && matched.theme) {
              setThemeState(matched.theme as ThemeMode);
              safeLocalStorageSet(STORAGE_KEY_THEME, matched.theme);
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
        }
      } catch (err) {
        console.warn('Falha na sincronização inicial do Supabase:', err);
      }
    };

    loadLiveSupabaseData();

    // Check and restore Supabase Auth session if active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session?.user) {
        const u = session.user;
        setCurrentUser(prev => {
          if (prev) return prev;
          return {
            id: u.id,
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
            email: u.email || '',
            role: (u.user_metadata?.role as any) || 'master',
            avatarUrl: u.user_metadata?.avatar_url,
            venueIds: [],
          };
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) setCurrentUser(null);
      } else if (session?.user && isMounted) {
        const u = session.user;
        setCurrentUser({
          id: u.id,
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
          email: u.email || '',
          role: (u.user_metadata?.role as any) || 'master',
          avatarUrl: u.user_metadata?.avatar_url,
          venueIds: [],
        });
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
        const updated = await leadService.getAll();
        if (isMounted) setLeads(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debutantes' }, async () => {
        const updated = await debutanteService.getAll();
        if (isMounted && updated.length > 0) setDebutantes(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, async () => {
        // Debutante cadastrou indicação -> atualiza debutantes e leads em tempo real
        triggerDebouncedSync(async () => {
          const [updatedDebs, updatedLeads] = await Promise.all([
            debutanteService.getAll(),
            leadService.getAll(),
          ]);
          if (isMounted) {
            if (updatedDebs.length > 0) setDebutantes(updatedDebs);
            if (updatedLeads.length > 0) setLeads(updatedLeads);
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, async () => {
        // Convidado confirmou -> atualiza lista de convidados em tempo real
        triggerDebouncedSync(async () => {
          const updatedDebs = await debutanteService.getAll();
          if (isMounted && updatedDebs.length > 0) setDebutantes(updatedDebs);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        // Agendamento criado ou atualizado
        triggerDebouncedSync(async () => {
          const updatedDebs = await debutanteService.getAll();
          if (isMounted && updatedDebs.length > 0) setDebutantes(updatedDebs);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, async () => {
        const updated = await taskService.getAll();
        if (isMounted) setTasks(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, async () => {
        const updated = await leadService.getAll();
        if (isMounted && updated.length > 0) setLeads(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_participants' }, async () => {
        const updated = await leadService.getAll();
        if (isMounted && updated.length > 0) setLeads(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborators' }, async () => {
        const updated = await collaboratorService.getAll();
        if (isMounted && updated.length > 0) setCollaborators(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'benefit_catalog_items' }, async () => {
        const updated = await catalogService.getAllBenefits();
        if (isMounted && updated.length > 0) setBenefitsCatalog(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vip_reward_catalog_items' }, async () => {
        const updated = await catalogService.getAllVipRewards();
        if (isMounted && updated.length > 0) setVipCatalog(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sources' }, async () => {
        const updated = await sourceService.getAll();
        if (isMounted && updated.length > 0) setSources(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'source_events' }, async () => {
        const updated = await sourceService.getAll();
        if (isMounted && updated.length > 0) setSources(updated);
      })
      .subscribe();

    // Heartbeat Polling inteligente a cada 6 segundos para multi-dispositivos
    const adminPollingInterval = setInterval(async () => {
      if (document.visibilityState === 'visible' && isMounted) {
        const [updatedLeads, updatedDebs] = await Promise.all([
          leadService.getAll(),
          debutanteService.getAll(),
        ]);
        if (isMounted) {
          if (updatedLeads.length > 0) setLeads(updatedLeads);
          if (updatedDebs.length > 0) setDebutantes(updatedDebs);
        }
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      clearInterval(adminPollingInterval);
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

    // 1. Dedicated Dev Super-Role Account (bonomofestas@gmail.com)
    if (cleanEmail === 'bonomofestas@gmail.com') {
      if (cleanPass !== 'Bonomo#2026') {
        return false;
      }
      const devUser: AdminUser = {
        id: 'd0000000-0000-0000-0000-000000000001',
        name: 'F5 Developer',
        email: 'bonomofestas@gmail.com',
        role: 'dev',
        avatarUrl: '/f5_mark.png',
        venueIds: [],
      };
      setCurrentUser(devUser);
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(devUser));
      return true;
    }

    // 2. Dedicated Master Account (dev@bonomoapp.com or master@bonomofestas.com)
    if (cleanEmail === 'dev@bonomoapp.com' || cleanEmail === 'master@bonomofestas.com' || cleanEmail === 'master@f5system.com') {
      if (cleanPass !== 'Bonomo#2026') {
        return false;
      }
      const masterUser: AdminUser = {
        id: 'a0000000-0000-0000-0000-000000000001',
        name: 'F5 Master',
        email: cleanEmail,
        role: 'master',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        venueIds: [],
      };
      setCurrentUser(masterUser);
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(masterUser));
      return true;
    }

    // 3. Registered Collaborators in system
    const foundCollab = collaborators.find(c => c.email.toLowerCase() === cleanEmail);
    if (foundCollab) {
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

      const user: AdminUser = {
        id: optUser?.id || foundCollab.id,
        name: optUser?.name || foundCollab.name,
        email: foundCollab.email,
        role: (optUser?.role || foundCollab.role) as any,
        avatarUrl: optUser?.avatarUrl !== undefined ? optUser.avatarUrl : foundCollab.avatarUrl,
        venueIds: foundCollab.venueId === 'all' ? [] : (foundCollab.venueIds || [foundCollab.venueId]),
      };
      setCurrentUser(user);
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(user));
      if (foundCollab.venueId !== 'all') {
        setActiveVenueId(foundCollab.venueId);
      }
      return true;
    }

    // 4. OptUser fallback if password is correct
    if (optUser && optUser.id) {
      if (cleanPass !== 'Bonomo#2026') return false;
      const user: AdminUser = {
        id: optUser.id,
        name: optUser.name || 'F5 Master',
        email: cleanEmail,
        role: optUser.role || 'master',
        avatarUrl: optUser.avatarUrl,
        venueIds: optUser.venueIds || [],
      };
      setCurrentUser(user);
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(user));
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('bonomo_admin_user_v7');
      localStorage.removeItem('bonomo_admin_user_v6');
      localStorage.removeItem('bonomo_admin_user_v5');
      localStorage.removeItem('f5_system_user');
      sessionStorage.clear();
      if (isSupabaseConfigured) {
        supabase.auth.signOut().catch(() => {});
      }
    } catch {}
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

  const switchCollaborator = (c: Collaborator) => {
    const user: AdminUser = {
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      avatarUrl: c.avatarUrl,
      venueIds: c.venueId === 'all' ? [] : (c.venueIds && c.venueIds.length > 0 ? c.venueIds : [c.venueId]),
      phone: c.phone,
    };
    setCurrentUser(user);
    safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(user));
    if (c.venueId !== 'all') {
      setActiveVenueId(c.venueId);
    } else {
      setActiveVenueId(null);
    }
  };

  const updateCurrentUserProfile = (data: Partial<AdminUser>) => {
    let activeId = currentUser?.id || 'collab_master_1';
    let updatedUser: AdminUser | null = null;

    setCurrentUser(prev => {
      if (!prev) return null;
      activeId = prev.id;
      updatedUser = {
        ...prev,
        name: data.name !== undefined ? data.name : prev.name,
        email: data.email !== undefined ? data.email : prev.email,
        phone: data.phone !== undefined ? data.phone : prev.phone,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : prev.avatarUrl,
        theme: data.theme !== undefined ? data.theme : prev.theme,
      };
      safeLocalStorageSet(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      return updatedUser;
    });

    // Also sync to collaborators list so the staff member entry reflects the new name/avatar/phone
    setCollaborators(prev => {
      const exists = prev.some(c => c.id === activeId || (currentUser?.role === 'master' && c.role === 'master'));
      let updated: Collaborator[];
      if (exists) {
        updated = prev.map(c => {
          if (c.id === activeId || (currentUser?.role === 'master' && c.role === 'master')) {
            return {
              ...c,
              name: data.name !== undefined ? data.name : c.name,
              email: data.email !== undefined ? data.email : c.email,
              avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : c.avatarUrl,
              phone: data.phone !== undefined ? data.phone : c.phone,
            };
          }
          return c;
        });
      } else {
        const newCollab: Collaborator = {
          id: activeId,
          name: data.name || currentUser?.name || 'Carlos Bonomo',
          email: data.email || currentUser?.email || 'diretoria@bonomofestas.com.br',
          role: currentUser?.role || 'master',
          avatarUrl: data.avatarUrl || currentUser?.avatarUrl,
          phone: data.phone || '(21) 99999-8888',
          venueId: 'all',
          active: true,
          createdAt: new Date().toISOString().split('T')[0],
        };
        updated = [newCollab, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });

    // Sincronizar em tempo real com o Supabase
    if (activeId && updatedUser) {
      collaboratorService.upsert({
        id: activeId,
        name: (updatedUser as AdminUser).name,
        email: (updatedUser as AdminUser).email,
        avatarUrl: (updatedUser as AdminUser).avatarUrl,
        phone: (updatedUser as AdminUser).phone,
      });

      if (isSupabaseConfigured) {
        supabase.auth.updateUser({
          data: {
            name: (updatedUser as AdminUser).name,
            avatar_url: (updatedUser as AdminUser).avatarUrl,
            phone: (updatedUser as AdminUser).phone,
          }
        }).catch(err => console.warn('Falha ao atualizar metadata no Supabase Auth:', err));
      }
    }
  };

  // ── Collaborators CRUD ──────────────────────────────────────────────────────

  const addCollaborator = (data: Omit<Collaborator, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const newCollab: Collaborator = {
      ...data,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCollaborators(prev => {
      const updated = [newCollab, ...prev];
      safeLocalStorageSet(STORAGE_KEY_COLLABORATORS, JSON.stringify(updated));
      return updated;
    });
    collaboratorService.upsert(newCollab);
    return id;
  };

  const updateCollaborator = (id: string, data: Partial<Collaborator>) => {
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

  const deleteCollaborator = (id: string) => {
    setCollaborators(prev => {
      const updated = prev.filter(c => c.id !== id);
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
      ballroomImageUrl: venueData.ballroomImageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
      id,
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

    // 1. Criar automaticamente o Funil Comercial Padrão para a nova casa de festa
    const defaultFunnelId = generateUuid();
    const defaultFunnel: CommercialFunnel = {
      id: defaultFunnelId,
      name: `Funil Comercial • ${newVenue.name}`,
      category: 'Vendas & Atendimento',
      description: `Funil padrão de captação e conversão da unidade ${newVenue.name}.`,
      venueId: id,
      allowedCollaboratorIds: [],
      badge: `Padrão • ${newVenue.name}`,
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
      const updated = [...prev, defaultFunnel];
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    // 2. Criar automaticamente a Origem Nativa de Indicação vinculada a esse funil
    const defaultReferralSource: Source = {
      id: generateUuid(),
      venueId: id,
      name: `Indicações das Debutantes • ${newVenue.name}`,
      type: 'referral',
      funnelId: defaultFunnelId,
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

    // 3. Criar automaticamente as Perguntas Padrão de MQL da nova casa de festa
    const defaultMqlQuestions = createDefaultMqlQuestionsForVenue(id);
    setMqlQuestions(prev => {
      const updated = [...prev, ...defaultMqlQuestions];
      safeLocalStorageSet(STORAGE_KEY_MQL_QUESTIONS, JSON.stringify(updated));
      return updated;
    });

    // Async sync with Supabase
    venueService.upsert(newVenue);
    funnelService.upsert(defaultFunnel);
    sourceService.upsert(defaultReferralSource);

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

  const updateVenue = (id: string, venueData: Partial<Venue>) => {
    setVenues(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...venueData } : v);
      safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(updated));
      return updated;
    });

    if (venueData.name) {
      setFunnels(prev => {
        const updated = prev.map(f => {
          if (f.venueId === id && f.isPrimary) {
            const pf = {
              ...f,
              name: `Funil Comercial • ${venueData.name}`,
              badge: `Padrão • ${venueData.name}`,
              description: `Captação automatizada através das convidadas e debutantes VIP da unidade ${venueData.name}.`,
            };
            funnelService.upsert(pf);
            return pf;
          }
          return f;
        });
        safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
        return updated;
      });
    }

    venueService.upsert({ id, ...venueData });
  };

  const deleteVenue = (id: string) => {
    setVenues(prev => {
      const updated = prev.filter(v => v.id !== id);
      safeLocalStorageSet(STORAGE_KEY_VENUES, JSON.stringify(updated));
      return updated;
    });

    // Clean up funnels associated with deleted venue
    setFunnels(prev => {
      const updated = prev.filter(f => f.venueId !== id);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    if (activeVenueId === id) {
      setActiveVenueId(null);
    }

    venueService.delete(id);
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

  // ── Funnels CRUD ───────────────────────────────────────────────────────────

  const addFunnel = (data: Omit<CommercialFunnel, 'id' | 'createdAt'>): string => {
    const id = generateUuid();
    const newFunnel: CommercialFunnel = {
      ...data,
      id,
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

  const updateFunnel = (id: string, data: Partial<CommercialFunnel>) => {
    setFunnels(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...data } : f);
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    funnelService.upsert({ id, ...data });
  };

  const deleteFunnel = (id: string) => {
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

  // ── Unconfigured Sources Warning ───────────────────────────────────────────
  const unconfiguredSources = useMemo(() => {
    const validFunnelIds = new Set(funnels.map(f => f.id));
    return sources.filter(s => !s.funnelId || s.funnelId === '' || !validFunnelIds.has(s.funnelId));
  }, [sources, funnels]);

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

  const deleteDebutanteAccount = (idOrSlug: string) => {
    setDebutantes(prev => {
      const updated = prev.filter(d => d.id !== idOrSlug && d.slug !== idOrSlug);
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    debutanteService.delete(idOrSlug);
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

  // ── CRM Leads — Stage & Activity ────────────────────────────────────────────

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

  const syncDebutanteLeadStats = (debutanteId: string) => {
    setDebutantes(prev => prev.map(d => {
      if (d.id !== debutanteId) return d;

      const debLeads = leads.filter(l => l.debutanteId === debutanteId);
      const validCount = debLeads.filter(l => l.isValidated).length;
      const salesCount = debLeads.filter(l => l.stage === 'contract_signed').length;
      const progress = Math.min(100, Math.round((validCount / d.totalTargetReferrals) * 100));

      return {
        ...d,
        validReferrals: validCount,
        convertedReferralSales: salesCount,
        journeyProgressPercentage: progress,
      };
    }));
  };

  const updateLeadStage = (leadId: string, newStage: CrmStage) => {
    const targetLead = leads.find(l => l.id === leadId);
    const stageLabels: Record<CrmStage, string> = {
      new_lead: 'Novo Lead',
      in_analysis: 'Em Análise',
      meeting_scheduled: 'Reunião Agendada',
      contract_signed: 'Contrato Fechado',
      lost: 'Perdido / Recusado',
    };

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    const newActivity: LeadActivity = {
      id: generateUuid(),
      leadId,
      timestamp: new Date().toISOString(),
      type: 'status_change',
      title: `Etapa alterada para: ${stageLabels[newStage]}`,
      text: `Status alterado por ${author}.`,
      authorName: author,
      authorId,
      authorAvatarUrl: authorAvatar,
    };

    // Regra: Ao mover para qualquer estágio após "Novo Lead" (ex: Em Análise), se não tiver SDR, o usuário assume como SDR
    const shouldClaimSdr = newStage !== 'new_lead' && (!targetLead?.sdrId && !targetLead?.assignedTo) && Boolean(authorId);

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

      return {
        ...lead,
        stage: newStage,
        sdrId: shouldClaimSdr ? authorId : lead.sdrId,
        sdrName: shouldClaimSdr ? author : lead.sdrName,
        assignedTo: shouldClaimSdr ? author : lead.assignedTo,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));

    // Sincronização 100% no Supabase
    if (isSupabaseConfigured) {
      const updatePayload: any = {
        id: leadId,
        stage: newStage,
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
      title: 'Observação registrada',
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

    const leadCode = generateLeadCode();
    const cleanLeadName = (data.name && data.name.trim() !== '') ? data.name.trim() : leadCode;

    const newLead: Lead = {
      id: newLeadId,
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
      stage: 'new_lead',
      isValidated: false,
      pointsGranted: 0,
      participants: [],
      tasks: [],
      activities: [
        {
          id: `act_${Date.now()}`,
          leadId: newLeadId,
          timestamp: new Date().toISOString(),
          type: 'creation',
          title: `Indicação enviada pela debutante ${data.debutanteName}`,
          authorName: data.debutanteName,
        }
      ],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setLeads(prev => [newLead, ...prev]);
    return newLeadId;
  };

  const createLeadFromWhatsApp = async (data: {
    venueId: string;
    phone: string;
    name?: string;
    firstMessage?: string;
    sourceId?: string;
  }): Promise<string> => {
    const newLeadId = generateUuid();
    
    // Procura a Origem do WhatsApp (pelo ID específico ou da casa de festa)
    const waSource = (data.sourceId ? sources.find(s => s.id === data.sourceId) : null)
      || sources.find(s => s.venueId === data.venueId && s.type === 'whatsapp_api' && s.status === 'active')
      || sources.find(s => s.type === 'whatsapp_api' && s.status === 'active');
    
    let matchedSubSource: string | undefined = undefined;
    let targetFunnelId = waSource?.funnelId || (funnels.find(f => f.venueId === data.venueId)?.id) || 'comercial';

    if (waSource && data.firstMessage) {
      const match = sourceService.matchWhatsAppSubSource(waSource, data.firstMessage);
      matchedSubSource = match.subSource;
      targetFunnelId = match.funnelId || targetFunnelId;
    }

    const leadCode = generateLeadCode();
    const cleanName = (data.name && data.name.trim() !== '') ? data.name.trim() : leadCode;

    const newLead: Lead = {
      id: newLeadId,
      code: leadCode,
      debutanteId: '',
      debutanteName: 'WhatsApp Direto',
      debutanteSlug: '',
      venueId: data.venueId,
      funnelId: targetFunnelId,
      sourceId: waSource?.id,
      source: 'whatsapp',
      sourceName: waSource?.name || 'WhatsApp API',
      subSource: matchedSubSource,
      name: cleanName,
      phone: data.phone,
      age: 15,
      group: 'WhatsApp',
      notes: data.firstMessage ? `Primeira mensagem: "${data.firstMessage}"` : undefined,
      stage: 'new_lead',
      isValidated: false,
      pointsGranted: 0,
      participants: [],
      tasks: [],
      activities: [
        {
          id: generateUuid(),
          leadId: newLeadId,
          timestamp: new Date().toISOString(),
          type: 'creation',
          title: matchedSubSource ? `Lead captado via WhatsApp / ${matchedSubSource}` : 'Lead captado via WhatsApp API',
          text: data.firstMessage ? `Mensagem inicial: "${data.firstMessage}"` : undefined,
          authorName: 'WhatsApp API',
        }
      ],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setLeads(prev => [newLead, ...prev]);

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
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setTasks(prev => prev.filter(t => t.leadId !== leadId));

    if (isSupabaseConfigured) {
      leadService.delete(leadId).catch(err => console.error('❌ Erro ao deletar lead no Supabase:', err));
    }
  };

  const closeLeadSaleWithValue = (leadId: string, dealValue: number, packageSold: string, contractDate?: string) => {
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
      title: `Contrato Fechado: ${formattedVal}`,
      text: `Venda concluída! Pacote: ${packageSold}. Valor: ${formattedVal}. Data: ${cDate}.`,
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
        closerId: undefined,
        closerName: undefined,
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
      leadService.upsert({
        id: leadId,
        sdrId: undefined,
        sdrName: undefined,
        assignedTo: undefined,
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
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        return {
          ...lead,
          ...data,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      });
      return updated;
    });

    if (isSupabaseConfigured) {
      leadService.upsert({ id: leadId, ...data } as any).catch(err => {
        console.error('❌ Erro ao atualizar leadData no Supabase:', err);
      });
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
    const newItem: BenefitCatalogItem = { ...data, id, createdAt: new Date().toISOString().split('T')[0] };
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
    const newItem: VipRewardCatalogItem = { ...data, id, createdAt: new Date().toISOString().split('T')[0] };
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
    const id = `template_${Date.now()}`;
    const newTemplate: JourneyTemplate = { ...data, id, createdAt: new Date().toISOString().split('T')[0] };
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

  const addAppointmentForDebutante = (debutanteId: string, appData: Omit<Appointment, 'id'>) => {
    const newApp: Appointment = { ...appData, id: `app_${Date.now()}` };
    setDebutantes(prev => {
      const updated = prev.map(d => {
        if (d.id === debutanteId || d.slug === debutanteId) return { ...d, appointments: [...d.appointments, newApp] };
        return d;
      });
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });
  };

  const updateAppointmentForDebutante = (debutanteId: string, appId: string, appData: Partial<Appointment>) => {
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
  };

  const deleteAppointmentForDebutante = (debutanteId: string, appId: string) => {
    setDebutantes(prev => {
      const updated = prev.map(d => {
        if (d.id === debutanteId || d.slug === debutanteId) return { ...d, appointments: d.appointments.filter(a => a.id !== appId) };
        return d;
      });
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });
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
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        priority: data.priority,
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

    taskService.upsert(newTask);

    return id;
  };

  const updateTask = (id: string, data: Partial<AdminTask>) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...data } : t);
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });

    taskService.upsert({ id, ...data });
  };

  const deleteTask = (id: string) => {
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

  // ── Provider ────────────────────────────────────────────────────────────────

  return (
    <AdminStateContext.Provider value={{
      currentUser,
      collaborators,
      venues,
      debutantes,
      leads,
      templates,
      benefitsCatalog,
      vipCatalog,
      funnels,
      tasks,
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
      addFunnel,
      updateFunnel,
      deleteFunnel,
      sources,
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
      rejectLead,
      deleteLead,
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
      getDebutanteBySlug,
      getVenueById,
      getCollaboratorById,
      mqlQuestions,
      addMqlQuestion,
      updateMqlQuestion,
      deleteMqlQuestion,
      saveLeadMqlAnswers,
      leadGoal,
      setLeadGoal,
      featureFlags,
      updateFeatureFlag,
      getFeatureStatus,
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
