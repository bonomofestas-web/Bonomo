import React, { createContext, useContext, useState, useEffect } from 'react';
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
  CommercialFunnel
} from '../types/admin';
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
import { debutanteService, taskService } from '../services/debutanteService';
import { catalogService } from '../services/catalogService';
import { collaboratorService } from '../services/collaboratorService';

const STORAGE_KEY_USER = 'bonomo_admin_user_v7';
const STORAGE_KEY_COLLABORATORS = 'bonomo_admin_collaborators_v7';
const STORAGE_KEY_VENUES = 'bonomo_admin_venues_v7';
const STORAGE_KEY_DEBUTANTES = 'bonomo_admin_debutantes_v7';
const STORAGE_KEY_LEADS = 'bonomo_admin_leads_v7';
const STORAGE_KEY_TEMPLATES = 'bonomo_admin_templates_v7';
const STORAGE_KEY_ACTIVE_VENUE = 'bonomo_admin_active_venue_v7';
const STORAGE_KEY_BENEFITS = 'bonomo_admin_benefits_catalog_v7';
const STORAGE_KEY_VIP_CATALOG = 'bonomo_admin_vip_catalog_v7';
const STORAGE_KEY_THEME = 'bonomo_admin_theme_v7';
const STORAGE_KEY_TASKS = 'bonomo_admin_tasks_v7';
const STORAGE_KEY_FUNNELS = 'bonomo_admin_funnels_v7';

// ── Default Seed Data ─────────────────────────────────────────────────────────

const DEFAULT_COLLABORATORS: Collaborator[] = [
  {
    id: 'collab_dev_master',
    name: 'Dev Master',
    email: 'dev@bonomoapp.com',
    role: 'master',
    venueId: 'all',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    phone: '(21) 99999-9999',
    active: true,
    createdAt: '2026-01-01',
  }
];

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
  activeVenueId: string | null;
  activeDebutanteId: string | null;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Auth & Roles
  login: (email: string, pass: string) => boolean;
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
  rejectLead: (leadId: string, reason: string) => void;
  deleteLead: (leadId: string) => void;
  closeLeadSale: (leadId: string) => void;
  closeLeadSaleWithValue: (leadId: string, dealValue: number, packageSold: string, contractDate?: string) => void;
  assignLead: (leadId: string, assigneeName: string) => void;
  claimLeadIfUnassigned: (leadId: string, claimantName?: string) => void;

  // SDR / Closer — Dual Responsibility
  assignLeadSdr: (leadId: string, sdrId: string) => void;
  assignLeadCloser: (leadId: string, closerId: string) => void;
  removeLeadCloser: (leadId: string) => void;

  // Lead Distribution (Round Robin)
  distributeLeadRoundRobin: (venueId: string) => Collaborator | null;

  // Lead Tasks
  addLeadTask: (leadId: string, task: Omit<LeadTask, 'id' | 'leadId' | 'createdAt' | 'status'>) => string;
  updateLeadTask: (leadId: string, taskId: string, updates: Partial<LeadTask>) => void;
  completeLeadTask: (leadId: string, taskId: string) => void;
  deleteLeadTask: (leadId: string, taskId: string) => void;

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
    return saved ? JSON.parse(saved) : DEFAULT_LEADS;
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

  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_VENUE) || null;
  });

  const [activeDebutanteId, setActiveDebutanteId] = useState<string | null>(null);

  // ── Sync to localStorage ────────────────────────────────────────────────────

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    safeLocalStorageSet(STORAGE_KEY_THEME, newTheme);
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

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(funnels));
  }, [funnels]);

  // ── Supabase Initial Fetch & Realtime Synchronizer ──────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    const loadLiveSupabaseData = async () => {
      try {
        const [dbVenues, dbFunnels, dbLeads, dbDebutantes, dbTasks, dbCollabs, dbBenefits, dbVip] = await Promise.all([
          venueService.getAll(),
          funnelService.getAll(),
          leadService.getAll(),
          debutanteService.getAll(),
          taskService.getAll(),
          collaboratorService.getAll(),
          catalogService.getAllBenefits(),
          catalogService.getAllVipRewards(),
        ]);

        if (isMounted) {
          if (dbVenues.length > 0) setVenues(dbVenues);
          if (dbFunnels.length > 0) setFunnels(dbFunnels);
          if (dbLeads.length > 0) setLeads(dbLeads);
          if (dbDebutantes.length > 0) setDebutantes(dbDebutantes);
          if (dbTasks.length > 0) setTasks(dbTasks);
          if (dbCollabs.length > 0) setCollaborators(dbCollabs);
          if (dbBenefits.length > 0) setBenefitsCatalog(dbBenefits);
          if (dbVip.length > 0) setVipCatalog(dbVip);
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

    // Setup Realtime WebSocket Listener
    const realtimeChannel = supabase
      .channel('bonomo-realtime-sync')
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
        if (isMounted && updated.length > 0) setLeads(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debutantes' }, async () => {
        const updated = await debutanteService.getAll();
        if (isMounted && updated.length > 0) setDebutantes(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, async () => {
        const updated = await taskService.getAll();
        if (isMounted && updated.length > 0) setTasks(updated);
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
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(realtimeChannel);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Reconcile and ensure every registered venue has strictly its primary referral funnel and no ghost/mock funnels
  useEffect(() => {
    setFunnels(prev => {
      const validVenueIds = new Set(venues.map(v => v.id));
      // Remove mock/orphaned funnels
      let filtered = prev.filter(f => 
        f.id !== 'indicacao' && 
        f.id !== 'trafego' && 
        f.id !== 'parcerias' && 
        f.venueId !== 'all' && 
        validVenueIds.has(f.venueId)
      );

      let changed = filtered.length !== prev.length;

      for (const v of venues) {
        const expectedName = `Funil de Indicação • ${v.name}`;
        const expectedBadge = `Principal • ${v.name}`;
        const expectedDesc = `Captação automatizada através das convidadas e debutantes VIP da unidade ${v.name}.`;

        const existingPrimaryIdx = filtered.findIndex(f => f.venueId === v.id && f.isPrimary);
        if (existingPrimaryIdx === -1) {
          filtered.push({
            id: `indicacao_${v.id}`,
            name: expectedName,
            category: 'Indicações do App',
            description: expectedDesc,
            venueId: v.id,
            allowedCollaboratorIds: [],
            badge: expectedBadge,
            badgeColor: '#D4AF37',
            icon: 'crown',
            stagesCount: 4,
            isPrimary: true,
            isDemo: false,
            createdAt: v.createdAt || new Date().toISOString().split('T')[0],
          });
          changed = true;
        } else {
          const pf = filtered[existingPrimaryIdx];
          if (pf.name !== expectedName || pf.badge !== expectedBadge) {
            filtered[existingPrimaryIdx] = {
              ...pf,
              name: expectedName,
              badge: expectedBadge,
              description: expectedDesc,
            };
            changed = true;
          }
        }
      }

      if (changed) {
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

  // ── Auth Methods ────────────────────────────────────────────────────────────

  const login = (email: string, _pass: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check registered collaborators
    const foundCollab = collaborators.find(c => c.email.toLowerCase() === cleanEmail);
    if (foundCollab) {
      const user: AdminUser = {
        id: foundCollab.id,
        name: foundCollab.name,
        email: foundCollab.email,
        role: foundCollab.role,
        avatarUrl: foundCollab.avatarUrl,
        venueIds: foundCollab.venueId === 'all' ? [] : [foundCollab.venueId],
      };
      setCurrentUser(user);
      if (foundCollab.venueId !== 'all') {
        setActiveVenueId(foundCollab.venueId);
      }
      return true;
    }

    // Dev Master Test Account (dev@bonomoapp.com or dev@bonomofestas.com)
    if (cleanEmail === 'dev@bonomoapp.com' || cleanEmail === 'dev@bonomofestas.com') {
      const devUser: AdminUser = {
        id: 'collab_dev_master',
        name: 'Dev Master',
        email: cleanEmail,
        role: 'master',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        venueIds: [],
      };
      setCurrentUser(devUser);
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
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
  };

  // ── Collaborators CRUD ──────────────────────────────────────────────────────

  const addCollaborator = (data: Omit<Collaborator, 'id' | 'createdAt'>): string => {
    const id = `collab_${Date.now()}`;
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
    const id = `venue_${Date.now()}`;
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

    // Create the mandatory primary referral funnel for this venue immediately
    const primaryFunnel: CommercialFunnel = {
      id: `indicacao_${id}`,
      name: `Funil de Indicação • ${newVenue.name}`,
      category: 'Indicações do App',
      description: `Captação automatizada através das convidadas e debutantes VIP da unidade ${newVenue.name}.`,
      venueId: id,
      allowedCollaboratorIds: [],
      badge: `Principal • ${newVenue.name}`,
      badgeColor: '#D4AF37',
      icon: 'crown',
      stagesCount: 4,
      isPrimary: true,
      isDemo: false,
      createdAt: newVenue.createdAt,
    };

    setFunnels(prev => {
      const updated = [...prev.filter(f => f.id !== primaryFunnel.id && f.venueId !== 'all'), primaryFunnel];
      safeLocalStorageSet(STORAGE_KEY_FUNNELS, JSON.stringify(updated));
      return updated;
    });

    // Async sync with Supabase
    venueService.upsert(newVenue);
    funnelService.upsert(primaryFunnel);

    return id;
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
              name: `Funil de Indicação • ${venueData.name}`,
              badge: `Principal • ${venueData.name}`,
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
      .replace(/^-|-$/g, '');
    const year = date.split('-')[0] || '2027';
    let baseSlug = `${cleanName}-${year}`;
    let slug = baseSlug;
    let count = 1;
    while (debutantes.some(d => d.slug === slug)) {
      count++;
      slug = `${baseSlug}-${count}`;
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
    const id = `deb_${Date.now()}`;
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
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
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
    const id = `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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

    funnelService.delete(id);
  };

  const deleteDebutanteAccount = (idOrSlug: string) => {
    setDebutantes(prev => {
      const updated = prev.filter(d => d.id !== idOrSlug && d.slug !== idOrSlug);
      safeLocalStorageSet(STORAGE_KEY_DEBUTANTES, JSON.stringify(updated));
      return updated;
    });

    debutanteService.delete(idOrSlug);
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
    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

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
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        title: `Etapa alterada para: ${stageLabels[newStage]}`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      // Add participant record if user is a collaborator not yet in participants
      let updatedParticipants = lead.participants || [];
      if (authorId && !updatedParticipants.find(p => p.collaboratorId === authorId)) {
        updatedParticipants = addParticipantToLead(
          lead, authorId, author,
          currentUser?.role || 'crm',
          authorAvatar,
          'stage_changed'
        );
      }

      const updatedLead = {
        ...lead,
        stage: newStage,
        participants: updatedParticipants,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };

      return updatedLead;
    }));
  };

  const addLeadNote = (leadId: string, noteText: string) => {
    if (!noteText.trim()) return;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const author = currentUser?.name || 'Administrador';
      const authorId = currentUser?.id;
      const authorAvatar = currentUser?.avatarUrl;

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'note',
        title: 'Observação registrada',
        text: noteText.trim(),
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      return {
        ...lead,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
  };

  const validateLead = (leadId: string) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      if (lead.isValidated) return lead;

      const author = currentUser?.name || 'Administrador';
      const authorId = currentUser?.id;
      const authorAvatar = currentUser?.avatarUrl;

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'validation',
        title: 'Indicação Validada (+1 Ponto na Jornada)',
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      // Also sync debutante points
      setDebutantes(dPrev => dPrev.map(d => {
        if (d.id !== lead.debutanteId && d.slug !== lead.debutanteSlug) return d;
        const newValid = (d.validReferrals || 0) + 1;
        const progress = Math.min(100, Math.round((newValid / d.totalTargetReferrals) * 100));
        return {
          ...d,
          validReferrals: newValid,
          journeyProgressPercentage: progress,
        };
      }));

      return {
        ...lead,
        isValidated: true,
        pointsGranted: 1,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
  };

  const invalidateLead = (leadId: string) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      if (!lead.isValidated) return lead;

      // Also sync debutante points
      setDebutantes(dPrev => dPrev.map(d => {
        if (d.id !== lead.debutanteId && d.slug !== lead.debutanteSlug) return d;
        const newValid = Math.max(0, (d.validReferrals || 0) - 1);
        const progress = Math.min(100, Math.round((newValid / d.totalTargetReferrals) * 100));
        return {
          ...d,
          validReferrals: newValid,
          journeyProgressPercentage: progress,
        };
      }));

      return {
        ...lead,
        isValidated: false,
        pointsGranted: 0,
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
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
    const newLead: Lead = {
      id: newLeadId,
      debutanteId: data.debutanteId,
      debutanteName: data.debutanteName,
      debutanteSlug: data.debutanteSlug,
      venueId: data.venueId,
      name: data.name,
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
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;

        const newActivity: LeadActivity = {
          id: `act_${Date.now()}`,
          leadId,
          timestamp: new Date().toISOString(),
          type: 'status_change',
          title: 'Indicação Recusada',
          text: `Motivo: ${reason}`,
          authorName: currentUser?.name || 'Administrador',
          authorId: currentUser?.id,
          authorAvatarUrl: currentUser?.avatarUrl,
        };

        return {
          ...lead,
          stage: 'lost' as const,
          rejectionReason: reason,
          activities: [newActivity, ...lead.activities],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      });
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteLead = (leadId: string) => {
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== leadId);
      safeLocalStorageSet(STORAGE_KEY_LEADS, JSON.stringify(updated));
      return updated;
    });
    // Also remove any tasks associated with this lead
    setTasks(prev => {
      const updated = prev.filter(t => t.leadId !== leadId);
      safeLocalStorageSet(STORAGE_KEY_TASKS, JSON.stringify(updated));
      return updated;
    });
  };

  const closeLeadSaleWithValue = (leadId: string, dealValue: number, packageSold: string, contractDate?: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;
    const cDate = contractDate || new Date().toISOString().split('T')[0];

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dealValue);

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'deal_closed',
        title: `Contrato Fechado: ${formattedVal}`,
        text: `Venda concluída! Pacote: ${packageSold}. Valor: ${formattedVal}. Data: ${cDate}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

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

      const updatedLead: Lead = {
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
      return updatedLead;
    }));
  };

  const closeLeadSale = (leadId: string) => {
    closeLeadSaleWithValue(leadId, 28000, 'Pacote Padrão Real 15 Anos');
  };

  const claimLeadIfUnassigned = (leadId: string, claimantName?: string) => {
    const author = claimantName || currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const hasSdr = lead.sdrId || (lead.assignedTo && lead.assignedTo.trim() !== '' && lead.assignedTo !== 'Sem responsável');
      if (hasSdr) return lead;

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'assignment',
        title: 'Lead assumido como SDR',
        text: `${author} assumiu o atendimento comercial deste lead.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      const updatedParticipants = addParticipantToLead(
        lead, authorId || `user_${Date.now()}`, author,
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
  };

  const assignLead = (leadId: string, assigneeName: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const oldAssignee = lead.assignedTo || 'Sem responsável';
      if (oldAssignee === assigneeName) return lead;

      const isUnassigning = !assigneeName || assigneeName === 'Sem responsável' || assigneeName === 'Não atribuído';

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'assignment',
        title: isUnassigning ? 'Responsável removido' : 'Responsável alterado',
        text: isUnassigning 
          ? `Responsável "${oldAssignee}" removido por ${author}.`
          : `Responsável alterado de "${oldAssignee}" para "${assigneeName}" por ${author}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      return {
        ...lead,
        assignedTo: isUnassigning ? undefined : assigneeName,
        sdrName: isUnassigning ? undefined : assigneeName,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
  };

  // ── SDR / Closer Dual Responsibility ────────────────────────────────────────

  const assignLeadSdr = (leadId: string, sdrId: string) => {
    const sdr = collaborators.find(c => c.id === sdrId);
    if (!sdr) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const oldSdrName = lead.sdrName || 'Sem SDR';

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'assignment',
        title: oldSdrName === 'Sem SDR' ? 'SDR responsável definido' : 'SDR responsável alterado',
        text: `SDR alterado de "${oldSdrName}" para "${sdr.name}" por ${author}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

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
  };

  const assignLeadCloser = (leadId: string, closerId: string) => {
    const closer = collaborators.find(c => c.id === closerId);
    if (!closer) return;

    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;
      const oldCloserName = lead.closerName || 'Sem Closer';

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'assignment',
        title: oldCloserName === 'Sem Closer' ? 'Closer responsável definido' : 'Closer alterado',
        text: `Closer alterado de "${oldCloserName}" para "${closer.name}" por ${author}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

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
  };

  const removeLeadCloser = (leadId: string) => {
    const author = currentUser?.name || 'Administrador';
    const authorId = currentUser?.id;
    const authorAvatar = currentUser?.avatarUrl;

    setLeads(prev => prev.map(lead => {
      if (lead.id !== leadId) return lead;

      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId,
        timestamp: new Date().toISOString(),
        type: 'assignment',
        title: 'Closer removido',
        text: `Closer "${lead.closerName || ''}" removido por ${author}.`,
        authorName: author,
        authorId,
        authorAvatarUrl: authorAvatar,
      };

      return {
        ...lead,
        closerId: undefined,
        closerName: undefined,
        activities: [newActivity, ...lead.activities],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }));
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

  // ── Benefits & VIP Catalogs CRUD ─────────────────────────────────────────────

  const addBenefitCatalogItem = (data: Omit<BenefitCatalogItem, 'id' | 'createdAt'>): string => {
    const id = `ben_${Date.now()}`;
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
    const id = `vip_cat_${Date.now()}`;
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
    return id;
  };

  const updateTemplate = (id: string, data: Partial<JourneyTemplate>) => {
    setTemplates(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...data } : t);
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
  };

  const applyTemplateToDebutante = (debutanteId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    updateDebutanteAccount(debutanteId, {
      journeyTemplateId: template.id,
      milestones: template.milestones,
      vipRewards: template.vipRewards,
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
    return debutantes.find(d => d.slug === slug || d.id === slug);
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
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
      updateDebutanteModuleToggle,
      updateDebutanteMilestones,
      updateDebutanteVipRewards,
      linkDebutanteJourney,
      markWelcomeVideoSeen,
      addFunnel,
      updateFunnel,
      deleteFunnel,
      updateLeadStage,
      addLeadNote,
      validateLead,
      invalidateLead,
      createLeadFromReferral,
      rejectLead,
      deleteLead,
      closeLeadSale,
      closeLeadSaleWithValue,
      assignLead,
      claimLeadIfUnassigned,
      assignLeadSdr,
      assignLeadCloser,
      removeLeadCloser,
      distributeLeadRoundRobin,
      addLeadTask,
      updateLeadTask,
      completeLeadTask,
      deleteLeadTask,
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
