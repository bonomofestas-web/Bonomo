import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAdminState } from '../../context/AdminStateContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import { AdminSidebar, type AdminTabType } from './AdminSidebar';
import { AdminHomeView } from './AdminHomeView';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminVenuesView } from './AdminVenuesView';
import { AdminDebutantesView } from './AdminDebutantesView';
import { AdminCrmKanbanView } from './AdminCrmKanbanView';
import { AdminAppointmentsView } from './AdminAppointmentsView';
import { AdminCollaboratorsView } from './AdminCollaboratorsView';
import { AdminJourneysConfigView } from './AdminJourneysConfigView';
import { AdminBenefitsCatalogView } from './AdminBenefitsCatalogView';
import { AdminLoginView } from './AdminLoginView';
import { AdminVenueModal } from './AdminVenueModal';
import { AdminDebutanteModal } from './AdminDebutanteModal';
import { AdminVenueGoalsView } from './AdminVenueGoalsView';
import { AdminMasterDashboardView } from './AdminMasterDashboardView';
import { AdminSourcesView } from './AdminSourcesView';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { AdminTeamView } from './AdminTeamView';
import { AdminTasksWorkspaceView } from './AdminTasksWorkspaceView';
import { AdminMqlConfigView } from './AdminMqlConfigView';
import { AdminFirstAccessProfileView } from './AdminFirstAccessProfileView';
import { AdminUserSettingsView } from './AdminUserSettingsView';
import { AdminDevFeatureFlagsView } from './AdminDevFeatureFlagsView';
import { AdminDevUsersManagerView } from './AdminDevUsersManagerView';
import { AdminDevAnnouncementsView } from './AdminDevAnnouncementsView';
import { AdminDevSupportView } from './AdminDevSupportView';
import { AdminAnnouncementModal } from './AdminAnnouncementModal';
import { AdminSupportWidget } from './AdminSupportWidget';
import { AdminLoadingSplash } from './AdminLoadingSplash';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { ComingSoonOverlay } from './ComingSoonOverlay';
import { AdminPostSaleKanbanView } from './AdminPostSaleKanbanView';
import { AdminVipJourneyUnifiedView } from './AdminVipJourneyUnifiedView';
import { AdminLeadsListView } from './AdminLeadsListView';
import { Menu, X, Building2, Headset, Megaphone, Sparkles, Clock, Target, ShieldCheck, Crown, Settings, LogOut, Eye } from 'lucide-react';
import { type FeatureFlagId, type Venue, type DebutanteAccount, type Lead, type Collaborator, type AdminTask, type SystemAnnouncement } from '../../types/admin';

interface AdminPortalProps {
  onOpenDebutanteApp: (slug?: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  dev: 'Desenvolvedor',
  master: 'Master',
  admin: 'Gerente',
  crm: 'CRM',
  sdr: 'SDR',
  closer: 'Closer',
};

const TAB_FEATURE_FLAG: Partial<Record<AdminTabType, FeatureFlagId>> = {
  'master-dashboard': 'master_dashboard',
};


import { useActiveTimeTracker } from '../../hooks/useActiveTimeTracker';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onOpenDebutanteApp,
}) => {
  const { 
    currentUser, 
    logout,
    viewingAsCollaborator,
    setViewingAsCollaborator,
    theme, 
    leads, 
    tasks, 
    venues, 
    debutantes, 
    collaborators, 
    funnels, 
    getFeatureStatus,
    featureDescriptions,
    announcements,
    markAnnouncementAsRead,
    supportTickets,
    isInitialSyncComplete,
  } = useAdminState();
  
  // Track active focus time for collaborators
  useActiveTimeTracker(currentUser);
  const [activeTab, setActiveTab] = useState<AdminTabType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('funnel_settings') === 'true') return 'crm';
        const urlTab = params.get('tab') as AdminTabType | null;
        if (urlTab) return urlTab;
      }
      const saved = localStorage.getItem('bonomo_admin_active_tab') as AdminTabType | null;
      if (saved) return saved;
    } catch {}
    return 'home';
  });
  const [isSplashDismissed, setIsSplashDismissed] = useState(false);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlFunnel = params.get('funnel_id');
        if (urlFunnel) return urlFunnel;
      }
      return localStorage.getItem('f5_active_funnel_id');
    } catch {}
    return null;
  });
  const [activeWhatsAppLeadId, setActiveWhatsAppLeadId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlLead = params.get('lead_id');
        if (urlLead) return urlLead;
      }
      return localStorage.getItem('f5_wa_active_lead_id');
    } catch {}
    return null;
  });
  const [activeWhatsAppSearchQuery, setActiveWhatsAppSearchQuery] = useState<string>('');
  const [crmOpenLeadId, setCrmOpenLeadId] = useState<string | undefined>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlLead = params.get('crm_lead_id');
        if (urlLead) return urlLead;
      }
      return localStorage.getItem('f5_crm_active_lead_id') || undefined;
    } catch {}
    return undefined;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  // Estados do Botão Expansível de Olho ("Ver com os olhos de um colaborador")
  const [isEyeExpanded, setIsEyeExpanded] = useState(false);
  const [isEyeHovered, setIsEyeHovered] = useState(false);
  const eyeMenuRef = useRef<HTMLDivElement>(null);

  // Sincroniza tema dark/light no body e html
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.body.classList.add('admin-theme-dark');
        document.body.classList.remove('admin-theme-light');
        document.documentElement.classList.add('dark');
      } else {
        document.body.classList.add('admin-theme-light');
        document.body.classList.remove('admin-theme-dark');
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Close popovers on click outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (eyeMenuRef.current && !eyeMenuRef.current.contains(e.target as Node)) {
        setIsEyeExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchHovered, setIsSearchHovered] = useState(false);

  // Permissão para modo de visualização com os olhos de um colaborador
  const canSimulateView = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'gerencia' || currentUser?.isDev;

  const viewableCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (!c.active) return false;
      if (c.id === currentUser?.id) return false;
      if (c.role === 'dev') return false;
      return true;
    });
  }, [collaborators, currentUser?.id]);

  // Support notifications state (Audio 1 & 2: badge quando suporte responde)
  const [lastSupportReadAt, setLastSupportReadAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bonomo_last_support_read_at');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const unreadSupportCount = React.useMemo(() => {
    if (!supportTickets || supportTickets.length === 0) return 0;
    let count = 0;
    if (currentUser?.isDev) {
      return supportTickets.filter(t => t.status !== 'resolved' && new Date(t.createdAt).getTime() > lastSupportReadAt).length;
    }
    const myTickets = supportTickets.filter(t => t.userId === currentUser?.id || t.userEmail === currentUser?.email);
    for (const ticket of myTickets) {
      const hasUnreadDevMessage = ticket.messages?.some(
        m => m.senderRole === 'dev' && new Date(m.createdAt).getTime() > lastSupportReadAt
      );
      if (hasUnreadDevMessage) {
        count++;
      }
    }
    return count;
  }, [supportTickets, currentUser, lastSupportReadAt]);

  const handleToggleSupport = () => {
    setIsSupportModalOpen(prev => {
      const next = !prev;
      if (next) {
        const now = Date.now();
        setLastSupportReadAt(now);
        try {
          localStorage.setItem('bonomo_last_support_read_at', String(now));
        } catch {}
      }
      return next;
    });
  };
  
  // Fast creation and settings modals
  const [isNewVenueModalOpen, setIsNewVenueModalOpen] = useState(false);
  const [isNewDebutanteModalOpen, setIsNewDebutanteModalOpen] = useState(false);
  // CRM workspace: open lead directly from task click (declared above with URL persistence)

  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bonomo_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Carrega preferência de sidebar do banco de dados para o usuário autenticado
  useEffect(() => {
    if (!currentUser?.id) return;
    const currentCollab = collaborators.find(c => c.id === currentUser.id);
    if (currentCollab?.permissions && currentCollab.permissions.length > 0) {
      const hasDbCollapsed = Boolean(currentCollab.permissions.includes('ui:sidebar_collapsed'));
      setIsSidebarCollapsed(hasDbCollapsed);
      try { localStorage.setItem('bonomo_admin_sidebar_collapsed', String(hasDbCollapsed)); } catch {}
    }
  }, [currentUser?.id, collaborators]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('bonomo_admin_sidebar_collapsed', String(next)); } catch {}

      // Persiste no Supabase na coluna permissions
      if (isSupabaseConfigured && currentUser?.id) {
        const currentCollab = collaborators.find(c => c.id === currentUser.id);
        const perms = Array.isArray(currentCollab?.permissions) ? [...currentCollab.permissions] : [];
        const nextPerms = next 
          ? Array.from(new Set([...perms, 'ui:sidebar_collapsed']))
          : perms.filter(p => p !== 'ui:sidebar_collapsed');
        void supabase.from('collaborators').update({ permissions: nextPerms }).eq('id', currentUser.id);
      }
      return next;
    });
  };

  const handleSelectTab = (tab: AdminTabType, funnelId?: string | null) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('bonomo_admin_active_tab', tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        if (tab === 'crm' && funnelId) {
          url.searchParams.set('funnel_id', funnelId);
        } else if (tab !== 'crm') {
          url.searchParams.delete('funnel_id');
        }
        if (tab !== 'whatsapp') {
          url.searchParams.delete('lead_id');
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
    if (tab === 'crm') {
      setActiveFunnelId(funnelId !== undefined ? funnelId : null);
      if (funnelId) {
        try { localStorage.setItem('f5_active_funnel_id', funnelId); } catch {}
      } else {
        try { localStorage.removeItem('f5_active_funnel_id'); } catch {}
      }
    }
    if (tab === 'whatsapp') {
      setActiveWhatsAppSearchQuery('');
    }
  };

  const handleOpenLeadInWhatsApp = (leadId: string, section?: 'followup' | 'won_missing' | 'tasks') => {
    setActiveWhatsAppLeadId(leadId);
    setActiveWhatsAppSearchQuery(''); // Mantém a busca limpa para não travar a lista de conversas em um único lead
    setActiveTab('whatsapp');
    try {
      localStorage.setItem('bonomo_admin_active_tab', 'whatsapp');
      localStorage.setItem('f5_wa_active_lead_id', leadId);
      if (section) {
        localStorage.setItem('f5_wa_open_section', section);
      }
      if (currentUser?.id) {
        localStorage.setItem(`f5_wa_selected_lead_${currentUser.id}`, leadId);
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'whatsapp');
        url.searchParams.set('lead_id', leadId);
        if (section) url.searchParams.set('section', section);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  };

  const handleOpenLeadFromTask = (leadId: string, section: 'followup' | 'tasks' = 'followup') => {
    handleOpenLeadInWhatsApp(leadId, section);
  };

  // Dynamic First Available Tab calculation (Audio 1 & 2)
  const getFirstAvailableTab = useCallback((): AdminTabType => {
    const effectiveUser = viewingAsCollaborator || currentUser;
    if (effectiveUser?.isDev) return 'home';

    const effectiveRole = effectiveUser?.role || 'master';
    const effectiveSectors = (effectiveUser && 'sectors' in effectiveUser && Array.isArray((effectiveUser as any).sectors) && (effectiveUser as any).sectors.length > 0)
      ? (effectiveUser as any).sectors
      : (effectiveRole === 'admin' ? ['gerencia', 'comercial', 'pos_venda'] : effectiveRole === 'pos_venda' ? ['pos_venda', 'comercial'] : ['comercial']);

    const menuTabsInOrder: AdminTabType[] = [
      'home',
      'tasks',
      'dashboard',
      'crm',
      'whatsapp',
      'debutantes',
      'venue-goals',
      'sources',
      'mql',
      'master-dashboard',
      'collaborators',
      'venues',
    ];

    for (const tab of menuTabsInOrder) {
      if (tab === 'master-dashboard' || tab === 'collaborators' || tab === 'venues' || tab === 'sources' || tab === 'mql' || tab === 'venue-goals') {
        if (effectiveRole !== 'master' && !effectiveSectors.includes('gerencia')) continue;
      }
      if (tab === 'debutantes') {
        if (effectiveRole !== 'master' && !effectiveSectors.includes('pos_venda')) continue;
      }

      const flag = TAB_FEATURE_FLAG[tab];
      if (flag) {
        const st = getFeatureStatus(flag);
        if (st === 'active') return tab;
      } else {
        return tab;
      }
    }
    return 'crm';
  }, [viewingAsCollaborator, currentUser, getFeatureStatus]);

  // Guarda de setores e telas proibidas durante visualização com os olhos de um colaborador
  useEffect(() => {
    if (!viewingAsCollaborator) return;
    const effectiveUser = viewingAsCollaborator;
    const effectiveRole = effectiveUser.role || 'master';
    const effectiveSectors: string[] = (effectiveUser.sectors && effectiveUser.sectors.length > 0)
      ? effectiveUser.sectors
      : (effectiveRole === 'admin' ? ['gerencia', 'comercial', 'pos_venda'] : effectiveRole === 'pos_venda' ? ['pos_venda', 'comercial'] : ['comercial']);

    const gerenciaTabs: AdminTabType[] = ['collaborators', 'venues', 'master-dashboard', 'sources', 'mql', 'venue-goals', 'templates', 'dev-features', 'dev-users', 'dev-announcements', 'dev-support'];
    const posVendaTabs: AdminTabType[] = ['post-sale-crm', 'debutantes'];

    if (gerenciaTabs.includes(activeTab) && effectiveRole !== 'master' && !effectiveSectors.includes('gerencia')) {
      const fallback = getFirstAvailableTab();
      handleSelectTab(fallback);
    } else if (posVendaTabs.includes(activeTab) && effectiveRole !== 'master' && !effectiveSectors.includes('pos_venda')) {
      const fallback = getFirstAvailableTab();
      handleSelectTab(fallback);
    }
  }, [viewingAsCollaborator, activeTab, getFirstAvailableTab]);

  // Audio 2: Redirecionamento automático se a aba ativa estiver desativada por feature flag
  useEffect(() => {
    if (!isInitialSyncComplete || (viewingAsCollaborator ? viewingAsCollaborator.isDev : currentUser?.isDev)) return;
    const flag = TAB_FEATURE_FLAG[activeTab];
    if (flag) {
      const status = getFeatureStatus(flag);
      if (status === 'disabled') {
        const fallback = getFirstAvailableTab();
        if (fallback !== activeTab) {
          setActiveTab(fallback);
          try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch {}
        }
      }
    }
  }, [isInitialSyncComplete, activeTab, currentUser?.isDev, viewingAsCollaborator, getFeatureStatus, getFirstAvailableTab]);

  // Listener para troca de aba disparada por componentes filhos
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab) {
        if (e.detail.tab === 'whatsapp' && e.detail.leadId) {
          handleOpenLeadInWhatsApp(e.detail.leadId);
        } else {
          setActiveTab(e.detail.tab);
          try { localStorage.setItem('bonomo_admin_active_tab', e.detail.tab); } catch {}
        }
      }
    };
    window.addEventListener('admin_switch_tab', handleSwitchTab);
    return () => window.removeEventListener('admin_switch_tab', handleSwitchTab);
  }, [handleOpenLeadInWhatsApp]);

  // Selected announcement to view/re-read from notifications
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState<import('../../types/admin').SystemAnnouncement | null>(null);

  // Check for unread announcement directed at this user (Audio 6 & 7 + Audio 2 roles)
  const isUserTargetedByAnnouncement = useCallback((a: import('../../types/admin').SystemAnnouncement) => {
    if (!currentUser) return false;
    if (currentUser.isDev) return true;
    if (a.targetRoles && a.targetRoles.length > 0) {
      return a.targetRoles.includes(currentUser.role);
    }
    if (a.targetAudience === 'all') return true;
    if (a.targetAudience === 'masters' && currentUser.role === 'master') return true;
    return false;
  }, [currentUser]);

  const unreadAnnouncement = React.useMemo(() => {
    if (!currentUser) return null;
    return announcements.find(a => {
      if (!isUserTargetedByAnnouncement(a)) return false;
      const alreadyRead = a.readReceipts && a.readReceipts.some(r => r.userId === currentUser.id);
      return !alreadyRead;
    }) || null;
  }, [announcements, currentUser, isUserTargetedByAnnouncement]);

  // Notifications calculation
  const todayStr = useMemo<string>(() => new Date().toISOString().split('T')[0], []);
  const dueTodayTasks = useMemo<AdminTask[]>(() => tasks.filter((t: AdminTask) => t.status !== 'completed' && t.dueDate === todayStr), [tasks, todayStr]);
  const newUnassignedLeads = useMemo<Lead[]>(() => leads.filter((l: Lead) => l.stage === 'new_lead'), [leads]);
  const userAnnouncements = useMemo<SystemAnnouncement[]>(() => announcements.filter(isUserTargetedByAnnouncement), [announcements, isUserTargetedByAnnouncement]);
  const totalNotificationsCount = dueTodayTasks.length + newUnassignedLeads.length + (unreadAnnouncement ? 1 : 0);

  // Global search filtering
  const cleanSearch = globalSearch.trim().toLowerCase();
  const matchedVenues = useMemo<Venue[]>(() => cleanSearch ? venues.filter((v: Venue) => (v.name && v.name.toLowerCase().includes(cleanSearch)) || (v.address && v.address.toLowerCase().includes(cleanSearch))) : [], [venues, cleanSearch]);
  const matchedDebutantes = useMemo<DebutanteAccount[]>(() => cleanSearch ? debutantes.filter((d: DebutanteAccount) => (d.name && d.name.toLowerCase().includes(cleanSearch)) || (d.phone && d.phone.includes(cleanSearch))) : [], [debutantes, cleanSearch]);
  const matchedLeads = useMemo<Lead[]>(() => cleanSearch ? leads.filter((l: Lead) => (l.name && l.name.toLowerCase().includes(cleanSearch)) || (l.phone && l.phone.includes(cleanSearch)) || (l.debutanteName && l.debutanteName.toLowerCase().includes(cleanSearch))) : [], [leads, cleanSearch]);
  const matchedCollaborators = useMemo<Collaborator[]>(() => cleanSearch ? collaborators.filter((c: Collaborator) => (c.name && c.name.toLowerCase().includes(cleanSearch)) || (c.email && c.email.toLowerCase().includes(cleanSearch)) || (c.role && c.role.toLowerCase().includes(cleanSearch))) : [], [collaborators, cleanSearch]);
  const totalSearchMatches = matchedVenues.length + matchedDebutantes.length + matchedLeads.length + matchedCollaborators.length;

  // Removido handleOpenLeadFromTask redundante

  // If not authenticated, show login view
  if (!currentUser) {
    return <AdminLoginView />;
  }

  // Se o colaborador tem primeiro acesso pendente, exibe a tela de onboarding de perfil em tela cheia obrigatória
  if (currentUser?.isFirstAccess) {
    return <AdminFirstAccessProfileView />;
  }

  const renderContent = () => {

    // Se não há casas de festa cadastradas, a tela mandatória para Master é registrar a 1ª unidade (exceto Dev ou Configurações)
    const isDevSession = Boolean(currentUser?.isDev) || activeTab.startsWith('dev-');
    if (venues.length === 0 && !isDevSession && activeTab !== 'settings' && currentUser?.role === 'master') {
      return (
        <AdminVenuesView
          onNavigateToFunnel={(funnelId: string) => {
            setActiveFunnelId(funnelId);
            setActiveTab('crm');
          }}
        />
      );
    }

    const flagId = TAB_FEATURE_FLAG[activeTab];
    if (flagId && !currentUser?.isDev) {
      const status = getFeatureStatus(flagId);
      if (status === 'coming_soon') {
        const fallback = getFirstAvailableTab();
        return (
          <ComingSoonOverlay 
            featureTitle={activeTab.toUpperCase()} 
            description={featureDescriptions[flagId]}
            onBack={() => {
              setActiveTab(fallback);
              try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch {}
            }} 
          />
        );
      }
      if (status === 'disabled') {
        const fallback = getFirstAvailableTab();
        if (activeTab !== fallback) {
          setTimeout(() => {
            setActiveTab(fallback);
            try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch {}
          }, 0);
        }
        // Fallback imediato para evitar tela preta ou nula
        switch (fallback) {
          case 'crm':
            return (
              <AdminCrmKanbanView
                initialLeadId={crmOpenLeadId}
                activeFunnelId={activeFunnelId}
                onSelectFunnel={(id) => setActiveFunnelId(id)}
                onLeadOpened={() => setCrmOpenLeadId(undefined)}
                onOpenLeadInWhatsApp={handleOpenLeadInWhatsApp}
              />
            );
          case 'debutantes':
            return <AdminDebutantesView onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)} onOpenLead={handleOpenLeadFromTask} />;
          default:
            return (
              <AdminHomeView
                onOpenLead={handleOpenLeadFromTask}
                onNavigateTab={(tab) => handleSelectTab(tab)}
              />
            );
        }
      }
    }

    switch (activeTab) {
      case 'home':
        return (
          <AdminHomeView
            onOpenLead={handleOpenLeadFromTask}
            onNavigateTab={(tab) => handleSelectTab(tab)}
          />
        );
      case 'tasks':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="all" />;
      case 'team-calendar':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="all" />;
      case 'dashboard':
        return (
          <AdminDashboardView
            onNavigateTab={(tab) => handleSelectTab(tab)}
            onOpenNewDebutanteModal={() => setIsNewDebutanteModalOpen(true)}
            onOpenNewVenueModal={() => setIsNewVenueModalOpen(true)}
            onOpenLead={handleOpenLeadFromTask}
          />
        );
      case 'crm':
        return (
          <AdminCrmKanbanView
            initialLeadId={crmOpenLeadId}
            activeFunnelId={activeFunnelId}
            onSelectFunnel={(id) => setActiveFunnelId(id)}
            onLeadOpened={() => setCrmOpenLeadId(undefined)}
            onOpenLeadInWhatsApp={handleOpenLeadInWhatsApp}
          />
        );
      case 'leads':
        return (
          <AdminLeadsListView
            onOpenLead={(leadId) => handleOpenLeadInWhatsApp(leadId)}
            onNavigateFunnel={(funnelId) => {
              setActiveFunnelId(funnelId);
              handleSelectTab('crm', funnelId);
            }}
          />
        );
      case 'followups':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="followup" />;
      case 'whatsapp':
        return (
          <AdminWhatsAppWorkspaceView
            initialLeadId={activeWhatsAppLeadId || undefined}
            searchQuery={activeWhatsAppSearchQuery}
            onLeadOpened={() => {
              setActiveWhatsAppLeadId(null);
            }}
            onClose={() => {
              setActiveWhatsAppLeadId(null);
              setActiveWhatsAppSearchQuery('');
              try {
                localStorage.removeItem('f5_wa_active_lead_id');
                if (currentUser?.id) {
                  localStorage.removeItem(`f5_wa_selected_lead_${currentUser.id}`);
                }
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('lead_id');
                  window.history.replaceState({}, '', url.toString());
                }
              } catch {}
            }}
          />
        );
      case 'post-sale-crm':
        return <AdminPostSaleKanbanView onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)} onOpenLead={handleOpenLeadFromTask} />;
      case 'vip-journey':
        return <AdminVipJourneyUnifiedView onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)} onOpenLead={handleOpenLeadFromTask} />;
      case 'post-sale-appointments':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="appointments" />;
      case 'post-sale-visits-tastings':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="visits_tastings" onNavigateTab={(tab) => handleSelectTab(tab as any)} />;
      case 'team':
        return <AdminTeamView />;
      case 'sources':
        return <AdminSourcesView />;
      case 'mql':
        return <AdminMqlConfigView />;
      case 'venues':
        return (
          <AdminVenuesView
            onNavigateToFunnel={(funnelId: string) => {
              setActiveFunnelId(funnelId);
              setActiveTab('crm');
            }}
          />
        );
      case 'debutantes':
        if (currentUser?.role === 'sdr' || currentUser?.role === 'closer' || currentUser?.role === 'crm') {
          return (
            <AdminCrmKanbanView
              initialLeadId={crmOpenLeadId}
              activeFunnelId={activeFunnelId}
              onSelectFunnel={(id) => setActiveFunnelId(id)}
              onLeadOpened={() => setCrmOpenLeadId(undefined)}
            />
          );
        }
        return <AdminDebutantesView onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)} onOpenLead={handleOpenLeadFromTask} />;
      case 'venue-goals':
        return <AdminVenueGoalsView />;
      case 'master-dashboard':
        return <AdminMasterDashboardView />;
      case 'benefits':
        return <AdminBenefitsCatalogView />;
      case 'collaborators':
        return <AdminCollaboratorsView />;
      case 'templates':
        return <AdminJourneysConfigView />;
      case 'appointments':
        return <AdminAppointmentsView />;
      case 'settings':
        return <AdminUserSettingsView onBack={() => handleSelectTab('home')} />;
      case 'dev-features':
        return <AdminDevFeatureFlagsView />;
      case 'dev-users':
        return <AdminDevUsersManagerView />;
      case 'dev-announcements':
        return <AdminDevAnnouncementsView />;
      case 'dev-support':
        return <AdminDevSupportView />;
      default:
        return (
          <AdminHomeView
            onOpenLead={handleOpenLeadFromTask}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
    }
  };

  return (
    <div className={`admin-portal ${theme === 'light' ? 'admin-theme-light' : 'admin-theme-dark'}`} style={{
      display: 'flex',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      background: 'var(--adm-bg-app)',
      color: 'var(--adm-text-body)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
    }}>
      {/* Tela de Sincronização Inicial F5 System (Overlay Seguro que nunca trava nem quebra hooks) */}
      {!isSplashDismissed && currentUser.role !== 'dev' && (
        <AdminLoadingSplash
          isReady={isInitialSyncComplete}
          onComplete={() => {
            const flag = TAB_FEATURE_FLAG[activeTab];
            if (flag && getFeatureStatus(flag) === 'disabled') {
              const fallback = getFirstAvailableTab();
              setActiveTab(fallback);
              try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch {}
            }
            setIsSplashDismissed(true);
          }}
        />
      )}
      {/* Pop-up de Comunicado Geral no Primeiro Acesso (Audio 6 & 7) */}
      {(unreadAnnouncement || selectedAnnouncementDetail) && (
        <AdminAnnouncementModal
          announcement={selectedAnnouncementDetail || unreadAnnouncement!}
          onDismiss={() => {
            if (unreadAnnouncement && (!selectedAnnouncementDetail || selectedAnnouncementDetail.id === unreadAnnouncement.id)) {
              markAnnouncementAsRead(unreadAnnouncement.id);
            }
            setSelectedAnnouncementDetail(null);
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="admin-desktop-sidebar" style={{ height: '100vh', flexShrink: 0, overflow: 'hidden' }}>
        <AdminSidebar
          activeTab={activeTab}
          activeFunnelId={activeFunnelId}
          onSelectTab={(tab, funnelId) => {
            handleSelectTab(tab, funnelId);
            setIsMobileSidebarOpen(false);
          }}
          onOpenSettings={() => handleSelectTab('settings')}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </div>

      {/* Mobile Full Screen Menu Overlay */}
      {isMobileSidebarOpen && (
        <AdminSidebar
          activeTab={activeTab}
          activeFunnelId={activeFunnelId}
          onSelectTab={(tab, funnelId) => {
            handleSelectTab(tab, funnelId);
            setIsMobileSidebarOpen(false);
          }}
          onOpenSettings={() => {
            setIsMobileSidebarOpen(false);
            handleSelectTab('settings');
          }}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isMobileOverlay={true}
        />
      )}

      {/* Main Content Body */}
      <main className="admin-portal-main" style={{
        flex: 1,
        minWidth: 0,
        marginLeft: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'var(--adm-bg-app)',
        boxSizing: 'border-box',
      }}>
        {/* Top Header Bar (Fixed & Always Black #0B090E as specified in Audio 1) */}
        <header className="admin-portal-header" style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '64px',
          flexShrink: 0,
          background: '#0B090E',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          boxSizing: 'border-box',
          gap: '12px',
        }}>
          {/* Left: Mobile Toggle & Responsive Session Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {/* Mobile Hamburger */}
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              style={{
                background: '#141118',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Dynamic Breadcrumbs */}
            {(() => {
              const activeFunnel = funnels.find(f => f.id === activeFunnelId);
              let category = 'Central';
              let title = 'Meu Dia • Início';

              if (venues.length === 0 && activeTab !== 'dev-features' && activeTab !== 'dev-users' && activeTab !== 'settings') {
                category = 'Inicialização';
                title = 'Registrar Primeira Casa de Festas';
              } else if (activeTab === 'tasks') { category = 'Workspace'; title = 'Tarefas'; }
              else if (activeTab === 'team-calendar') { category = 'Workspace'; title = 'Agenda'; }
              else if (activeTab === 'team') { category = 'Workspace'; title = 'Equipe'; }
              else if (activeTab === 'dashboard') { category = 'Comercial'; title = 'Dashboard'; }
              else if (activeTab === 'whatsapp') { category = 'Comercial'; title = 'WhatsApp'; }
              else if (activeTab === 'crm') { category = 'Comercial'; title = activeFunnel ? `Funil • ${activeFunnel.name}` : 'Funil Comercial'; }
              else if (activeTab === 'followups') { category = 'Comercial'; title = 'Follow-up'; }
              else if (activeTab === 'post-sale-crm') { category = 'Pós-Venda'; title = 'Sucesso do Cliente'; }
              else if (activeTab === 'debutantes') { category = 'Pós-Venda'; title = 'App Aniversariantes'; }
              else if (activeTab === 'vip-journey') { category = 'Pós-Venda'; title = 'Jornada VIP'; }
              else if (activeTab === 'post-sale-visits-tastings') { category = 'Comercial'; title = 'Agendamentos'; }
              else if (activeTab === 'post-sale-appointments') { category = 'Pós-Venda'; title = 'Compromissos'; }
              else if (activeTab === 'master-dashboard') { category = 'Gerência'; title = 'Dashboard Gerência'; }
              else if (activeTab === 'collaborators') { category = 'Gerência'; title = 'Colaboradores'; }
              else if (activeTab === 'venues') { category = 'Gerência'; title = 'Casas de Festa'; }
              else if (activeTab === 'venue-goals') { category = 'Gerência'; title = 'Metas'; }
              else if (activeTab === 'sources') { category = 'Gerência'; title = 'Origens'; }
              else if (activeTab === 'mql') { category = 'Gerência'; title = 'Qualificação'; }
              else if (activeTab === 'benefits') { category = 'Pós-Venda'; title = 'Catálogo de Prêmios'; }
              else if (activeTab === 'templates') { category = 'Pós-Venda'; title = 'Jornadas VIP'; }
              else if (activeTab === 'settings') { category = 'Configurações'; title = 'Conta & Preferências'; }
              else if (activeTab === 'dev-features') { category = 'Desenvolvedor'; title = 'Feature Flags'; }
              else if (activeTab === 'dev-users') { category = 'Desenvolvedor'; title = 'Gestão de Usuários'; }
              else if (activeTab === 'dev-announcements') { category = 'Desenvolvedor'; title = 'Comunicados Globais'; }
              else if (activeTab === 'dev-support') { category = 'Desenvolvedor'; title = 'Central de Suporte'; }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {category}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem' }}>/</span>
                  <h1 style={{ fontSize: '0.96rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
                    {title}
                  </h1>
                </div>
              );
            })()}
          </div>

          {/* Right Header Actions: Impersonation Banner + Expandable Search + Notification Bell + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            {/* Botão Expansível de Modo de Visualização ("Ver com os olhos de um colaborador") */}
            {canSimulateView && (
              <div
                ref={eyeMenuRef}
                className="admin-header-eye-view"
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsEyeHovered(true)}
                onMouseLeave={() => setIsEyeHovered(false)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: (isEyeExpanded || viewingAsCollaborator) ? 'flex-start' : 'center',
                    gap: '8px',
                    background: viewingAsCollaborator
                      ? 'rgba(20, 169, 215, 0.18)'
                      : (isEyeExpanded ? '#141118' : 'rgba(255, 255, 255, 0.06)'),
                    border: `1px solid ${
                      viewingAsCollaborator
                        ? '#14A9D7'
                        : (isEyeExpanded || isEyeHovered ? '#14A9D7' : 'rgba(255, 255, 255, 0.12)')
                    }`,
                    borderRadius: '50px',
                    padding: (isEyeExpanded || viewingAsCollaborator) ? '3px 10px 3px 4px' : '0',
                    width: viewingAsCollaborator ? 'auto' : (isEyeExpanded ? '180px' : '36px'),
                    maxWidth: '220px',
                    height: '36px',
                    boxSizing: 'border-box',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    boxShadow: viewingAsCollaborator ? '0 0 14px rgba(20, 169, 215, 0.35)' : 'none',
                  }}
                  onClick={() => {
                    if (viewingAsCollaborator) {
                      // Clique na foto/olho quando ativo -> Sai imediatamente
                      setViewingAsCollaborator(null);
                    } else {
                      setIsEyeExpanded(!isEyeExpanded);
                    }
                  }}
                  title={
                    viewingAsCollaborator
                      ? `Visualizando como: ${viewingAsCollaborator.name} (Clique para sair da visão)`
                      : 'Visualizar sistema com os olhos de um colaborador'
                  }
                >
                  {viewingAsCollaborator ? (
                    // Círculo com a Foto do Colaborador selecionado + Mini Ícone de Olho
                    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                      <img
                        src={(viewingAsCollaborator.avatarUrl && !viewingAsCollaborator.avatarUrl.includes('unsplash.com')) ? viewingAsCollaborator.avatarUrl : createMonogramAvatar(viewingAsCollaborator.name)}
                        alt={viewingAsCollaborator.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#14A9D7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#080C14',
                        boxShadow: '0 0 4px #14A9D7',
                      }}>
                        <Eye size={8} />
                      </span>
                    </div>
                  ) : (
                    // Ícone de Olho redondo padrão (igual à lupa da busca)
                    <span style={{
                      color: isEyeExpanded || isEyeHovered ? '#14A9D7' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      lineHeight: 0,
                      flexShrink: 0,
                      transition: 'color 0.2s ease',
                    }}>
                      <Eye size={17} />
                    </span>
                  )}

                  {/* Texto expandido quando o seletor está aberto */}
                  {isEyeExpanded && !viewingAsCollaborator && (
                    <span style={{
                      fontSize: '0.74rem',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 600,
                    }}>
                      Ver como...
                    </span>
                  )}

                  {/* Informações do colaborador ativo no modo visão */}
                  {viewingAsCollaborator && (
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 700,
                        lineHeight: 1.1,
                      }}>
                        {viewingAsCollaborator.name.split(' ')[0]}
                      </span>
                      <span style={{
                        fontSize: '0.56rem',
                        color: '#14A9D7',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        lineHeight: 1.1,
                      }}>
                        Clique p/ sair
                      </span>
                    </div>
                  )}
                </div>

                {/* Popover Expansível de Seleção de Colaboradores */}
                {isEyeExpanded && !viewingAsCollaborator && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      width: '260px',
                      background: '#141118',
                      border: '1px solid rgba(20, 169, 215, 0.35)',
                      borderRadius: '16px',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.75), 0 0 20px rgba(20, 169, 215, 0.15)',
                      padding: '10px',
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '6px',
                    }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#14A9D7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={13} />
                        <span>Ver com os olhos de:</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#8096A8' }}>
                        {viewableCollaborators.length} disponíveis
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                    }}>
                      {viewableCollaborators.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#8096A8', fontSize: '0.74rem' }}>
                          Nenhum colaborador encontrado na equipe.
                        </div>
                      ) : (
                        viewableCollaborators.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setViewingAsCollaborator(c);
                              setIsEyeExpanded(false);
                              // Retoma imediatamente para a tela inicial / CRM do colaborador
                              const targetTab = getFirstAvailableTab() || 'crm';
                              handleSelectTab(targetTab);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 8px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: 'transparent',
                              border: '1px solid transparent',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(20, 169, 215, 0.12)';
                              e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <img
                              src={(c.avatarUrl && !c.avatarUrl.includes('unsplash.com')) ? c.avatarUrl : createMonogramAvatar(c.name)}
                              alt={c.name}
                              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.name}
                              </div>
                              <div style={{ fontSize: '0.64rem', color: '#14A9D7', textTransform: 'uppercase', fontWeight: 600 }}>
                                {ROLE_LABELS[c.role] || c.role}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expandable Search Capsule (Audio 3: Centralização milimétrica da lupa) */}
            <div
              className="admin-header-search"
              style={{ position: 'relative' }}
              onMouseEnter={() => setIsSearchHovered(true)}
              onMouseLeave={() => setIsSearchHovered(false)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSearchFocused || globalSearch ? 'flex-start' : 'center',
                gap: '8px',
                background: isSearchFocused || globalSearch ? '#141118' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isSearchFocused || globalSearch || isSearchHovered ? '#14A9D7' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '50px',
                padding: isSearchFocused || globalSearch ? '5px 12px' : '0',
                width: isSearchFocused || globalSearch ? '280px' : '36px',
                height: '36px',
                boxSizing: 'border-box',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: isSearchFocused || globalSearch ? 'text' : 'pointer',
              }}
              onClick={() => setIsSearchFocused(true)}
              >
                <span style={{
                  color: isSearchFocused || globalSearch || isSearchHovered ? '#14A9D7' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  lineHeight: 0,
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                  transition: 'color 0.2s ease',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                {(isSearchFocused || globalSearch) && (
                  <input
                    type="text"
                    placeholder="Buscar no sistema..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                    autoFocus
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                )}
                {globalSearch && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setGlobalSearch(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Live Search Results Popover */}
              {isSearchFocused && globalSearch.trim() && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  padding: '12px',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '360px',
                  overflowY: 'auto',
                }}>
                  {totalSearchMatches === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                      Nenhum resultado encontrado para "{globalSearch}"
                    </div>
                  ) : (
                    <>
                      {/* Casas de Festa */}
                      {matchedVenues.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--adm-accent)', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={12} color="var(--adm-accent)" /> Casas de Festa ({matchedVenues.length})
                          </div>
                          {matchedVenues.map(v => (
                            <div
                              key={v.id}
                              onClick={() => {
                                setActiveTab('venues');
                                setGlobalSearch('');
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Building2 size={14} color="var(--adm-accent)" />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>{v.name}</div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Debutantes */}
                      {matchedDebutantes.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#F472B6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Crown size={12} color="#F472B6" /> Aniversariantes ({matchedDebutantes.length})
                          </div>
                          {matchedDebutantes.map(d => {
                            const canAccessDebutantesTab = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'crm';
                            return (
                              <div
                                key={d.id}
                                onClick={() => {
                                  if (canAccessDebutantesTab) {
                                    setActiveTab('debutantes');
                                  } else {
                                    // SDR or Closer: Redirect to CRM tab
                                    setActiveTab('crm');
                                    // Find first lead belonging to this debutante or switch to CRM
                                    const debLead = leads.find(l => l.debutanteId === d.id);
                                    if (debLead) {
                                      handleOpenLeadFromTask(debLead.id);
                                    }
                                  }
                                  setGlobalSearch('');
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'transparent',
                                  transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(244,114,182,0.2)', color: '#F472B6', fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {d.name.charAt(0)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>{d.name}</div>
                                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{d.phone} • Festa: {d.partyDate || 'Data a definir'}</div>
                                </div>
                                {!canAccessDebutantesTab && (
                                  <span style={{ fontSize: '0.62rem', color: '#818cf8', fontWeight: 600 }}>Ver Leads</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Leads do CRM */}
                      {matchedLeads.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Target size={12} color="#3B82F6" /> Leads do CRM ({matchedLeads.length})
                          </div>
                          {matchedLeads.map(l => (
                            <div
                              key={l.id}
                              onClick={() => {
                                handleOpenLeadFromTask(l.id);
                                setGlobalSearch('');
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: '#3B82F6', fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {l.name.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-text-title)' }}>{l.name}</div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Indicada por {l.debutanteName} • {l.phone}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Colaboradores */}
                      {matchedCollaborators.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#8B5CF6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={12} color="#8B5CF6" /> Equipe & Colaboradores ({matchedCollaborators.length})
                          </div>
                          {matchedCollaborators.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setActiveTab('collaborators');
                                setGlobalSearch('');
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} alt={c.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {c.name.charAt(0)}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{c.name} ({c.role.toUpperCase()})</div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{c.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Support / Help Center Button (Audio 1, 2 & 3: Floating widget & unread badge - Oculto para desenvolvedor) */}
            {!currentUser?.isDev && (
              <button
                type="button"
                onClick={handleToggleSupport}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isSupportModalOpen ? 'rgba(20, 169, 215, 0.2)' : '#141118',
                  border: `1px solid ${isSupportModalOpen ? '#14A9D7' : 'rgba(20, 169, 215, 0.25)'}`,
                  color: isSupportModalOpen ? '#14A9D7' : '#9E988D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
                title="Central de Suporte & Report de Bugs"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#14A9D7';
                  e.currentTarget.style.borderColor = '#14A9D7';
                }}
                onMouseLeave={(e) => {
                  if (!isSupportModalOpen) {
                    e.currentTarget.style.color = '#9E988D';
                    e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.25)';
                  }
                }}
              >
                <Headset size={17} />
                {unreadSupportCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      minWidth: '17px',
                      height: '17px',
                      padding: '0 4px',
                      borderRadius: '10px',
                      background: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      fontFamily: "'Poppins', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                      border: '1.5px solid #090814',
                    }}
                  >
                    {unreadSupportCount}
                  </span>
                )}
              </button>
            )}

            {/* 1. Notification Bell & Dropdown */}
            <div ref={notificationsMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileMenuOpen(false);
                }}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isNotificationsOpen ? 'rgba(212, 175, 55, 0.18)' : '#141118',
                  border: `1px solid ${isNotificationsOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)'}`,
                  color: isNotificationsOpen ? '#D4AF37' : '#9E988D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#D4AF37';
                  e.currentTarget.style.borderColor = '#D4AF37';
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isNotificationsOpen ? '#D4AF37' : '#9E988D';
                  e.currentTarget.style.borderColor = isNotificationsOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)';
                  e.currentTarget.style.background = isNotificationsOpen ? 'rgba(212, 175, 55, 0.18)' : '#141118';
                }}
                title="Notificações"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {totalNotificationsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '1.5px solid var(--adm-bg-header)',
                  }} />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationsOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  padding: '14px',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  animation: 'fadeIn 0.15s ease-out',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Notificações do Sistema
                    </div>
                    <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                      {totalNotificationsCount} ativas
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {/* Avisos e Comunicados Gerais salvos */}
                    {userAnnouncements.slice(0, 2).map(ann => (
                      <div
                        key={ann.id}
                        onClick={() => {
                          setSelectedAnnouncementDetail(ann);
                          setIsNotificationsOpen(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(20, 169, 215, 0.12)',
                          border: '1px solid rgba(20, 169, 215, 0.35)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#14A9D7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Megaphone size={13} color="#14A9D7" /> {ann.title}</span>
                          <span style={{ fontSize: '0.62rem', color: '#8096A8' }}>Clique para ler</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ann.content}
                        </div>
                      </div>
                    ))}

                    {/* Alerta de Suporte Respondido (Audio 1 & 2) */}
                    {unreadSupportCount > 0 && (
                      <div
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          handleToggleSupport();
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Headset size={12} color="#EF4444" />
                          <span>{currentUser?.isDev ? 'Novos Chamados de Suporte' : 'Nova Resposta no Suporte'}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-title)' }}>
                          Você possui {unreadSupportCount} mensagem(ns) não lida(s) no Suporte Técnico.
                        </div>
                      </div>
                    )}

                    {totalNotificationsCount === 0 && userAnnouncements.length === 0 ? (
                      <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#10B981" /> Nenhuma pendência ou comunicado no momento!
                      </div>
                    ) : (
                      <>
                        {newUnassignedLeads.slice(0, 3).map(lead => (
                          <div
                            key={lead.id}
                            onClick={() => {
                              handleOpenLeadFromTask(lead.id);
                              setIsNotificationsOpen(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: 'var(--adm-accent-bg)',
                              border: '1px solid rgba(212, 175, 55, 0.3)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Sparkles size={12} color="var(--adm-accent)" /> Nova Indicação Recebida
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-title)' }}>
                              {lead.name} • Indicada por {lead.debutanteName}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                              Clique para atender no CRM
                            </div>
                          </div>
                        ))}

                        {dueTodayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setActiveTab('home');
                              setIsNotificationsOpen(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={12} color="#F59E0B" /> Tarefa com Prazo Hoje ({task.dueTime || 'Hoje'})
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-title)' }}>
                              {task.title}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                              {task.leadName ? `Lead: ${task.leadName}` : 'Tarefa geral da equipe'}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. User Profile Trigger & Popover Dropdown */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isProfileMenuOpen ? 'rgba(20, 169, 215, 0.18)' : '#141118',
                  border: `1px solid ${isProfileMenuOpen ? '#14A9D7' : (viewingAsCollaborator ? 'rgba(100, 116, 139, 0.4)' : 'rgba(20, 169, 215, 0.35)')}`,
                  filter: viewingAsCollaborator ? 'grayscale(100%) opacity(0.45)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, filter 0.25s ease',
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: isProfileMenuOpen ? '0 0 12px rgba(20, 169, 215, 0.35)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#14A9D7';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(20, 169, 215, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isProfileMenuOpen ? '#14A9D7' : (viewingAsCollaborator ? 'rgba(100, 116, 139, 0.4)' : 'rgba(20, 169, 215, 0.35)');
                  e.currentTarget.style.boxShadow = isProfileMenuOpen ? '0 0 12px rgba(20, 169, 215, 0.35)' : 'none';
                }}
                title={
                  viewingAsCollaborator
                    ? `Você está visualizando com os olhos de ${viewingAsCollaborator.name}. (Sua conta nativa: ${currentUser?.name})`
                    : `${currentUser?.name || 'Administrador'} (${ROLE_LABELS[currentUser?.role || 'master'] || currentUser?.role})`
                }
              >
                <img
                  src={(currentUser?.avatarUrl && !currentUser.avatarUrl.includes('unsplash.com')) ? currentUser.avatarUrl : createMonogramAvatar(currentUser?.name || 'Administrador')}
                  alt="Perfil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>

              {/* Profile Popover Dropdown */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '220px',
                  background: '#141118',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  borderRadius: '14px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.75), 0 0 20px rgba(20, 169, 215, 0.1)',
                  padding: '10px',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  animation: 'fadeIn 0.15s ease-out',
                }}>
                  {/* User Header Summary (aligned vertically, without duplicate photo) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '2px 4px 8px 4px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}>
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                    }}>
                      {currentUser?.name || 'Administrador'}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: '#8096A8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                    }}>
                      {currentUser?.email}
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.52rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        letterSpacing: '0.4px',
                      }}>
                        {ROLE_LABELS[currentUser?.role || 'master'] || currentUser?.role}
                      </span>
                    </div>
                  </div>

                  {/* Menu Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleSelectTab('settings');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 8px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: '#FFFFFF',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(20, 169, 215, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)';
                        e.currentTarget.style.color = '#14A9D7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                    >
                      <Settings size={15} color="#14A9D7" />
                      <span>Configurações & Tema</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 8px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: '#EF4444',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <LogOut size={15} color="#EF4444" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Área de Conteúdo (Content Area) */}
        <div
          className="f5-content-area"
          data-area="area-de-conteudo"
          style={{
            flex: 1,
            overflowY: (activeTab === 'whatsapp' || activeTab === 'crm') ? 'hidden' : 'auto',
            overflowX: 'hidden',
            background: 'var(--adm-bg-app)',
            height: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <AdminErrorBoundary fallbackTab="home" onResetTab={() => setActiveTab('home')}>
            {renderContent()}
          </AdminErrorBoundary>
        </div>
      </main>

      {/* Global Modals */}
      <AdminVenueModal
        isOpen={isNewVenueModalOpen}
        onClose={() => setIsNewVenueModalOpen(false)}
      />

      <AdminDebutanteModal
        isOpen={isNewDebutanteModalOpen}
        onClose={() => setIsNewDebutanteModalOpen(false)}
      />

      {!currentUser?.isDev && (
        <AdminSupportWidget
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          onMarkRead={() => {
            const now = Date.now();
            setLastSupportReadAt(now);
            try {
              localStorage.setItem('bonomo_last_support_read_at', String(now));
            } catch {}
          }}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .admin-desktop-sidebar {
            display: none !important;
          }
          .admin-desktop-collaborator-switcher {
            display: none !important;
          }
          .admin-portal-header {
            padding: 0 12px !important;
            gap: 8px !important;
          }
          .admin-mobile-menu-btn {
            display: flex !important;
          }
          .admin-header-search {
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
