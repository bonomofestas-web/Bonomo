import { motion } from 'motion/react';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAdminState } from '../../context/AdminStateContext';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { notificationService, type AdminNotification } from '../../services/notificationService';
import { setUnreadNotifications } from '../../utils/notificationBadge';
import { AdminNotificationsList } from './notifications/AdminNotificationsList';
import { NotificationDiagnostics } from './notifications/NotificationDiagnostics';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminSidebar, type AdminTabType } from './AdminSidebar';
import { AdminHomeView } from './AdminHomeView';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminVenuesView } from './AdminVenuesView';
import { AdminDebutantesView } from './AdminDebutantesView';
import { AdminCrmKanbanView } from './AdminCrmKanbanView';
import { AdminAppointmentsView } from './AdminAppointmentsView';
import { AdminVenueEventsView } from './AdminVenueEventsView';
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
import { AdminQuickMessagesView } from './AdminQuickMessagesView';
import { AdminMqlConfigView } from './AdminMqlConfigView';

import { AdminUserSettingsView } from './AdminUserSettingsView';
import { AdminSlaSettingsView } from './AdminSlaSettingsView';
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
import { AdminClientsListView } from './AdminClientsListView';
import { AdminContactsView } from './AdminContactsView';
import { AdminContractsView } from './AdminContractsView';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { Toaster } from 'sonner';
import { Menu, X, Eye, Plus, Megaphone, Headset, ChevronDown, Check, Layers } from 'lucide-react';
import { type FeatureFlagId, type SystemAnnouncement } from '../../types/admin';

interface AdminPortalProps {
  onOpenDebutanteApp: (slug?: string) => void;
}

const TAB_FEATURE_FLAG: Partial<Record<AdminTabType, FeatureFlagId>> = {
  'master-dashboard': 'master_dashboard',
};


import { useActiveTimeTracker } from '../../hooks/useActiveTimeTracker';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onOpenDebutanteApp,
}) => {
  const {
    currentUser,
    viewingAsCollaborator,
    setViewingAsCollaborator,
    theme,
    leads,
    venues,
    collaborators,
    funnels,
    getFeatureStatus,
    featureDescriptions,
    announcements,
    markAnnouncementAsRead,
    supportTickets,
    isInitialSyncComplete,
    updateCollaborator,
    isRefreshing,
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
    } catch { }
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
    } catch { }
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
    } catch { }
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
    } catch { }
    return undefined;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dropdown de Funis no Breadcrumb Superior (Comercial / Pós-Venda)
  const [isBreadcrumbFunnelDropdownOpen, setIsBreadcrumbFunnelDropdownOpen] = useState(false);
  const breadcrumbFunnelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (breadcrumbFunnelDropdownRef.current && !breadcrumbFunnelDropdownRef.current.contains(e.target as Node)) {
        setIsBreadcrumbFunnelDropdownOpen(false);
      }
    };
    if (isBreadcrumbFunnelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isBreadcrumbFunnelDropdownOpen]);

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

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

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
        } catch { }
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
      try { localStorage.setItem('bonomo_admin_sidebar_collapsed', String(hasDbCollapsed)); } catch { }
    }
  }, [currentUser?.id, collaborators]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('bonomo_admin_sidebar_collapsed', String(next)); } catch { }

      // Persiste no Supabase na coluna permissions
      if (isSupabaseConfigured && currentUser?.id) {
        const currentCollab = collaborators.find(c => c.id === currentUser.id);
        const perms = Array.isArray(currentCollab?.permissions) ? [...currentCollab.permissions] : [];
        const nextPerms = next
          ? Array.from(new Set([...perms, 'ui:sidebar_collapsed']))
          : perms.filter(p => p !== 'ui:sidebar_collapsed');
        void supabase.from('collaborators').update({ permissions: nextPerms }).eq('id', currentUser.id);
        if (updateCollaborator) {
          updateCollaborator(currentUser.id, { permissions: nextPerms });
        }
      }
      return next;
    });
  };

  // Abertura direta de contrato (documento) e de contrato na esteira (cliente no funil de pos-venda)
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [openClientId, setOpenClientId] = useState<string | null>(null);

  const handleSelectTab = (tab: AdminTabType, funnelId?: string | null) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('bonomo_admin_active_tab', tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        if ((tab === 'crm' || tab === 'post-sale-crm') && funnelId) {
          url.searchParams.set('funnel_id', funnelId);
        } else if (tab !== 'crm' && tab !== 'post-sale-crm') {
          url.searchParams.delete('funnel_id');
        }
        if (tab !== 'whatsapp') {
          url.searchParams.delete('lead_id');
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch { }
    if (tab === 'crm' || tab === 'post-sale-crm') {
      setActiveFunnelId(funnelId !== undefined ? funnelId : null);
      if (funnelId) {
        try { localStorage.setItem('f5_active_funnel_id', funnelId); } catch { }
      } else {
        try { localStorage.removeItem('f5_active_funnel_id'); } catch { }
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
    } catch { }
  };

  const handleOpenLeadFromTask = (leadId: string, section: 'followup' | 'tasks' = 'followup') => {
    handleOpenLeadInWhatsApp(leadId, section);
  };

  const handleOpenLeadInFunnel = (leadId: string, funnelId?: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    const targetFunnelId = funnelId || targetLead?.funnelId || activeFunnelId;
    const isPostSale = Boolean(targetLead?.isClient || targetLead?.group === 'Pós-Venda');
    if (targetFunnelId) setActiveFunnelId(targetFunnelId);
    setCrmOpenLeadId(leadId);
    handleSelectTab(isPostSale ? 'post-sale-crm' : 'crm', targetFunnelId);
  };

  // Central de notificações: clique marca como lida e leva ao destino resolvido pelo estado atual
  const openNotification = (n: AdminNotification) => {
    void notificationService.markRead([n.id]);
    const leadId: string | undefined = n.payload?.leadId || (n.entityType === 'lead' ? n.entityId : undefined);
    switch (n.type) {
      case 'new_opportunity':
        if (leadId) handleOpenLeadInFunnel(leadId, n.payload?.funnelId);
        break;
      case 'message':
        if (leadId) handleOpenLeadInWhatsApp(leadId);
        break;
      case 'contract':
        // A tela de contratos abre o contrato pelo status atual (pendente na mesa de aprovação, aprovado no contrato)
        if (n.entityId) setOpenContractId(n.entityId);
        handleSelectTab('contracts');
        break;
      case 'task':
        if (leadId) handleOpenLeadFromTask(leadId, 'tasks'); else handleSelectTab('home');
        break;
      case 'appointment':
      case 'visit_tasting':
        handleSelectTab('post-sale-visits-tastings');
        break;
      case 'support':
        handleToggleSupport();
        break;
      default:
        handleSelectTab('notifications');
    }
  };
  const notif = useNotificationCenter(currentUser?.id, openNotification);
  useEffect(() => { setUnreadNotifications(notif.unreadCount); }, [notif.unreadCount]);

  // Dynamic First Available Tab calculation (Audio 1 & 2)
  const getFirstAvailableTab = useCallback((): AdminTabType => {
    const effectiveUser = viewingAsCollaborator || currentUser;
    if (effectiveUser?.isDev) return 'home';

    const effectiveRole = effectiveUser?.role || 'master';
    const effectiveSectors = (effectiveUser && 'sectors' in effectiveUser && Array.isArray((effectiveUser as any).sectors) && (effectiveUser as any).sectors.length > 0)
      ? (effectiveUser as any).sectors
      : (effectiveRole === 'admin' ? ['gerencia', 'comercial', 'pos_venda'] : effectiveRole === 'pos_venda' ? ['pos_venda'] : ['comercial']);

    const menuTabsInOrder: AdminTabType[] = [
      'home',
      'tasks',
      'post-sale-crm',
      'debutantes',
      'crm',
      'whatsapp',
      'leads',
      'followups',
      'dashboard',
      'venue-goals',
      'sources',
      'mql',
      'master-dashboard',
      'collaborators',
      'venues',
    ];

    for (const tab of menuTabsInOrder) {
      if (['crm', 'whatsapp', 'leads', 'followups', 'dashboard'].includes(tab)) {
        if (!effectiveSectors.includes('comercial')) continue;
      }
      if (['post-sale-crm', 'debutantes'].includes(tab)) {
        if (!effectiveSectors.includes('pos_venda')) continue;
      }
      if (tab === 'master-dashboard' || tab === 'collaborators' || tab === 'venues' || tab === 'sources' || tab === 'mql' || tab === 'venue-goals') {
        if (effectiveRole !== 'master' && !effectiveSectors.includes('gerencia')) continue;
      }

      const flag = TAB_FEATURE_FLAG[tab];
      if (flag) {
        const st = getFeatureStatus(flag);
        if (st === 'active') return tab;
      } else {
        return tab;
      }
    }
    return effectiveSectors.includes('pos_venda') ? 'post-sale-crm' : 'home';
  }, [viewingAsCollaborator, currentUser, getFeatureStatus]);

  // Guarda de setores e telas proibidas durante visualização com os olhos de um colaborador ou perfil logado
  useEffect(() => {
    const effectiveUser = viewingAsCollaborator || currentUser;
    if (!effectiveUser) return;
    const effectiveRole = effectiveUser.role || 'master';
    if (effectiveRole === 'master' || effectiveUser.isDev) return;

    const effectiveSectors: string[] = (effectiveUser.sectors && effectiveUser.sectors.length > 0)
      ? effectiveUser.sectors
      : (effectiveRole === 'admin' ? ['gerencia', 'comercial', 'pos_venda'] : effectiveRole === 'pos_venda' ? ['pos_venda'] : ['comercial']);

    const commercialTabs: AdminTabType[] = ['dashboard', 'whatsapp', 'crm', 'leads', 'followups'];
    const gerenciaTabs: AdminTabType[] = ['collaborators', 'venues', 'master-dashboard', 'sources', 'mql', 'venue-goals', 'templates', 'dev-features', 'dev-users', 'dev-announcements', 'dev-support'];
    const posVendaTabs: AdminTabType[] = ['post-sale-crm', 'debutantes'];

    if (commercialTabs.includes(activeTab) && !effectiveSectors.includes('comercial')) {
      const fallback = getFirstAvailableTab();
      handleSelectTab(fallback);
    } else if (gerenciaTabs.includes(activeTab) && !effectiveSectors.includes('gerencia')) {
      const fallback = getFirstAvailableTab();
      handleSelectTab(fallback);
    } else if (posVendaTabs.includes(activeTab) && !effectiveSectors.includes('pos_venda')) {
      const fallback = getFirstAvailableTab();
      handleSelectTab(fallback);
    }
  }, [viewingAsCollaborator, currentUser, activeTab, getFirstAvailableTab]);

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
          try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch { }
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
          try { localStorage.setItem('bonomo_admin_active_tab', e.detail.tab); } catch { }
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

  const userAnnouncements = useMemo<SystemAnnouncement[]>(() => announcements.filter(isUserTargetedByAnnouncement), [announcements, isUserTargetedByAnnouncement]);
  const totalNotificationsCount = notif.unreadCount + (unreadAnnouncement ? 1 : 0) + (unreadSupportCount > 0 ? 1 : 0);

  // Removido handleOpenLeadFromTask redundante

  // If not authenticated, show login view
  if (!currentUser) {
    return <AdminLoginView />;
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
              try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch { }
            }}
          />
        );
      }
      if (status === 'disabled') {
        const fallback = getFirstAvailableTab();
        if (activeTab !== fallback) {
          setTimeout(() => {
            setActiveTab(fallback);
            try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch { }
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
      case 'notifications':
        return (
          <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)', margin: 0 }}>
                  Central de Notificações
                </h1>
                <p style={{ margin: '4px 0 0 0', color: 'var(--adm-text-muted, #94A3B8)', fontSize: '0.85rem' }}>
                  Comunicados globais, prazos de tarefas e pendências da sua equipe.
                </p>
              </div>
              <span style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60A5FA',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}>
                {totalNotificationsCount} notificações
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Comunicados Gerais da Gestão */}
              {userAnnouncements.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--adm-bg-card, #111C2E)',
                  border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#14A9D7', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Megaphone size={16} />
                    Comunicados da Gestão
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {userAnnouncements.map(ann => (
                      <div
                        key={ann.id}
                        onClick={() => setSelectedAnnouncementDetail(ann)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(20, 169, 215, 0.08)',
                          border: '1px solid rgba(20, 169, 215, 0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#14A9D7' }}>
                          {ann.title}
                        </div>
                        <div style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '4px' }}>
                          {ann.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagens de Suporte */}
              {unreadSupportCount > 0 && (
                <div
                  onClick={handleToggleSupport}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <Headset size={20} color="#EF4444" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.88rem' }}>
                      Nova resposta no Suporte Técnico
                    </div>
                    <div style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px' }}>
                      Você possui {unreadSupportCount} mensagem(ns) não lida(s). Clique para abrir a central.
                    </div>
                  </div>
                </div>
              )}

              {/* Central de notificações (tarefas, mensagens, contratos, oportunidades, compromissos) */}
              <AdminNotificationsList
                items={notif.items}
                prefs={notif.prefs}
                onOpen={openNotification}
                onMarkAllRead={() => { void notif.markAllRead(); }}
                onClear={(onlyRead) => { void notif.clear(onlyRead); }}
                onTogglePref={(patch) => { void notif.updatePrefs({ ...notif.prefs, ...patch }, currentUser?.masterId || currentUser?.id || ''); }}
              />
              {(currentUser?.isDev || ['master', 'admin', 'gerencia'].includes(currentUser?.role || '')) && (
                <NotificationDiagnostics onSendTest={() => { void notif.sendTest(currentUser?.masterId || currentUser?.id || ''); }} />
              )}

            </div>
          </div>
        );
      case 'quick-messages':
        return <AdminQuickMessagesView />;
      case 'team-calendar':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="all" />;
      case 'dashboard':
        return (
          <AdminDashboardView
            onNavigateTab={(tab) => handleSelectTab(tab)}
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
      case 'contacts':
        return (
          <AdminContactsView
            initialContactId={openContactId}
            onInitialContactOpened={() => setOpenContactId(null)}
            onNavigateTab={(tab, params) => {
              if (tab === 'whatsapp' && params?.phone) {
                setActiveWhatsAppSearchQuery(params.phone);
                handleSelectTab('whatsapp');
              } else {
                handleSelectTab(tab);
              }
            }}
            onOpenLead={(leadId, funnelId) => {
              handleOpenLeadInFunnel(leadId, funnelId);
            }}
          />
        );
      case 'leads':
        return (
          <AdminLeadsListView
            onOpenLead={(leadId) => handleOpenLeadInFunnel(leadId)}
            onNavigateFunnel={(funnelId) => {
              setActiveFunnelId(funnelId);
              handleSelectTab('crm', funnelId);
            }}
          />
        );
      case 'contracts':
        return (
          <AdminContractsView
            onNavigateTab={(tab, params) => handleSelectTab(tab, params)}
            onOpenLead={(leadId, funnelId) => {
              if (funnelId) setActiveFunnelId(funnelId);
              setCrmOpenLeadId(leadId);
              handleSelectTab('crm', funnelId);
            }}
            onOpenContractKanban={(_contractId, funnelId, clientId) => {
              if (funnelId) setActiveFunnelId(funnelId);
              if (clientId) setOpenClientId(clientId);
              handleSelectTab('post-sale-crm', funnelId);
            }}
            initialContractId={openContractId}
            onInitialContractOpened={() => setOpenContractId(null)}
          />
        );
      case 'followups':
        return <AdminTasksWorkspaceView onOpenLead={handleOpenLeadFromTask} workspaceContext="all" />;
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
              } catch { }
            }}
          />
        );
      case 'post-sale-crm':
        return (
          <AdminPostSaleKanbanView
            initialClientId={openClientId}
            onClientOpened={() => setOpenClientId(null)}
            initialFunnelId={activeFunnelId}
            onSelectFunnel={(id) => {
              setActiveFunnelId(id);
              if (id) {
                try { localStorage.setItem('f5_active_funnel_id', id); } catch { }
              }
            }}
            onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)}
            onOpenLead={handleOpenLeadFromTask}
          />
        );
      case 'post-sale-clients':
        return (
          <AdminClientsListView
            onOpenLead={(id) => handleOpenLeadInFunnel(id)}
            onNavigateFunnel={(funnelId) => {
              setActiveFunnelId(funnelId);
              handleSelectTab('post-sale-crm', funnelId);
            }}
          />
        );
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
        return (
          <AdminDebutantesView
            onOpenDebutanteApp={(slug) => onOpenDebutanteApp(slug)}
            onOpenLead={handleOpenLeadFromTask}
            onNavigateTab={(tab) => handleSelectTab(tab as any)}
          />
        );
      case 'venue-goals':
        return <AdminVenueGoalsView />;
      case 'master-dashboard':
        return <AdminMasterDashboardView />;
      case 'sla-settings':
        return <AdminSlaSettingsView />;
      case 'benefits':
        return <AdminBenefitsCatalogView onBack={() => handleSelectTab('debutantes')} />;
      case 'collaborators':
        return <AdminCollaboratorsView />;
      case 'templates':
        return <AdminJourneysConfigView onBack={() => handleSelectTab('debutantes')} />;
      case 'appointments':
        return <AdminAppointmentsView />;
      case 'venue-events':
        return <AdminVenueEventsView />;
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
      {/* Barra de Progresso Luminosa Global (YouTube / GitHub top loader) */}
      {isRefreshing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 99999,
          background: 'linear-gradient(90deg, #14A9D7, #10B981, #06B6D4, #14A9D7)',
          backgroundSize: '200% 100%',
          animation: 'f5TopLoader 1s linear infinite',
          boxShadow: '0 0 12px rgba(20, 169, 215, 0.9)',
          pointerEvents: 'none',
        }}>
          <style>{`
            @keyframes f5TopLoader {
              0% { background-position: 100% 0; }
              100% { background-position: -100% 0; }
            }
          `}</style>
        </div>
      )}
      {/* Tela de Sincronização Inicial F5 System (Overlay Seguro que nunca trava nem quebra hooks) */}
      {!isSplashDismissed && currentUser.role !== 'dev' && (
        <AdminLoadingSplash
          isReady={isInitialSyncComplete}
          onComplete={() => {
            const flag = TAB_FEATURE_FLAG[activeTab];
            if (flag && getFeatureStatus(flag) === 'disabled') {
              const fallback = getFirstAvailableTab();
              setActiveTab(fallback);
              try { localStorage.setItem('bonomo_admin_active_tab', fallback); } catch { }
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
          zIndex: 1000,
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
              let category = 'Workspace';
              let title = 'Início';

              if (venues.length === 0 && activeTab !== 'dev-features' && activeTab !== 'dev-users' && activeTab !== 'settings') {
                category = 'Inicialização';
                title = 'Registrar Primeira Casa de Festas';
              } else if (activeTab === 'home') { category = 'Workspace'; title = 'Início'; }
              else if (activeTab === 'tasks') { category = 'Workspace'; title = 'Tarefas'; }
              else if (activeTab === 'notifications') { category = 'Workspace'; title = 'Notificações'; }
              else if (activeTab === 'team') { category = 'Workspace'; title = 'Equipe'; }
              else if (activeTab === 'team-calendar') { category = 'Workspace'; title = 'Agenda'; }
              else if (activeTab === 'contacts') { category = 'Comercial'; title = 'Central de Contatos'; }
              else if (activeTab === 'crm') { category = 'Comercial'; title = activeFunnel ? `Funil • ${activeFunnel.name}` : 'Funil Comercial'; }
              else if (activeTab === 'dashboard') { category = 'Comercial'; title = 'Dashboard'; }
              else if (activeTab === 'contracts') { category = 'Pós-Venda'; title = 'Central de Contratos'; }
              else if (activeTab === 'whatsapp') { category = 'Ferramentas'; title = 'Mensagens'; }
              else if (activeTab === 'quick-messages') { category = 'Ferramentas'; title = 'Mensagens Rápidas'; }
              else if (activeTab === 'followups') { category = 'Ferramentas'; title = 'Central de Tarefas'; }
              else if (activeTab === 'post-sale-crm') { category = 'Pós-Venda'; title = 'Funis de Pós-Venda'; }
              else if (activeTab === 'debutantes') { category = 'Pós-Venda'; title = 'App Aniversariantes'; }
              else if (activeTab === 'vip-journey') { category = 'Pós-Venda'; title = 'Jornada VIP'; }
              else if (activeTab === 'post-sale-visits-tastings') { category = 'Comercial'; title = 'Agendamentos'; }
              else if (activeTab === 'post-sale-appointments') { category = 'Pós-Venda'; title = 'Compromissos'; }
              else if (activeTab === 'venue-events') { category = 'Pós-Venda'; title = 'Agenda de Eventos'; }
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

              if (activeTab === 'crm' || activeTab === 'post-sale-crm') {
                const isCrm = activeTab === 'crm';
                const catLabel = isCrm ? 'COMERCIAL' : 'PÓS-VENDA';
                const currentFunnelObj = activeFunnelId
                  ? funnels.find(f => f.id === activeFunnelId)
                  : null;
                const displayTitle = currentFunnelObj?.name || 'Central de Funis';
                const listFunnels = isCrm
                  ? funnels.filter(f => !f.isPostSale)
                  : funnels.filter(f => f.isPostSale);

                return (
                  <div ref={breadcrumbFunnelDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {catLabel}
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem' }}>/</span>
                    <button
                      type="button"
                      onClick={() => setIsBreadcrumbFunnelDropdownOpen(!isBreadcrumbFunnelDropdownOpen)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#FFFFFF',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <h1 style={{ fontSize: '0.96rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
                        {displayTitle}
                      </h1>
                      <ChevronDown
                        size={14}
                        style={{
                          color: '#14A9D7',
                          transform: isBreadcrumbFunnelDropdownOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s ease',
                        }}
                      />
                    </button>

                    {/* Popover Dropdown de Seleção de Funil */}
                    {isBreadcrumbFunnelDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 10px)',
                          left: '0',
                          zIndex: 99999,
                          minWidth: '240px',
                          maxWidth: '300px',
                          background: '#141118',
                          border: '1px solid rgba(20, 169, 215, 0.35)',
                          borderRadius: '12px',
                          boxShadow: '0 16px 40px rgba(0,0,0,0.85), 0 0 20px rgba(20, 169, 215, 0.15)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          animation: 'fadeIn 0.12s ease-out',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{
                          padding: '4px 8px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: '#14A9D7',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          marginBottom: '2px',
                        }}>
                          {isCrm ? 'Funis Comerciais' : 'Funis de Pós-Venda'}
                        </div>

                        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {listFunnels.map(f => {
                            const isActive = currentFunnelObj?.id === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setActiveFunnelId(f.id);
                                  handleSelectTab(isCrm ? 'crm' : 'post-sale-crm', f.id);
                                  setIsBreadcrumbFunnelDropdownOpen(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: '7px',
                                  background: isActive ? 'rgba(20, 169, 215, 0.18)' : 'transparent',
                                  border: 'none',
                                  color: isActive ? '#14A9D7' : '#FFFFFF',
                                  fontSize: '0.76rem',
                                  fontWeight: isActive ? 800 : 500,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                  transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {f.name}
                                </span>
                                {isActive && <Check size={13} color="#14A9D7" style={{ flexShrink: 0 }} />}
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '4px', paddingTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFunnelId(null);
                              handleSelectTab(isCrm ? 'crm' : 'post-sale-crm', null);
                              setIsBreadcrumbFunnelDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.65)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Layers size={13} />
                            <span>Ver todos os funis (Central)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (activeTab === 'benefits' || activeTab === 'templates') {
                const subTitle = activeTab === 'benefits' ? 'Catálogo de Prêmios' : 'Jornadas VIP';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Pós-Venda
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem' }}>/</span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('debutantes')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'}
                    >
                      App Aniversariante
                    </button>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.8rem' }}>/</span>
                    <h1 style={{ fontSize: '0.96rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
                      {subTitle}
                    </h1>
                  </div>
                );
              }

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

          {/* Center: Barra de Busca Centralizada com Largura e Posição Fixa */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '340px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <AdminGlobalSearch
              activeTab={activeTab}
              activeFunnelId={activeFunnelId}
              onNavigateTab={(tab, funnelId, params) => {
                if (funnelId) setActiveFunnelId(funnelId);
                if (params?.contractId) setOpenContractId(params.contractId);
                if (params?.clientId) setOpenClientId(params.clientId);
                handleSelectTab(tab, funnelId);
                if (tab === 'whatsapp' && params?.phone) {
                  setActiveWhatsAppSearchQuery(params.phone);
                }
              }}
              onOpenLead={(leadId, funnelId) => {
                handleOpenLeadInFunnel(leadId, funnelId);
              }}
              onOpenContact={(contactId) => {
                setOpenContactId(contactId);
                handleSelectTab('contacts');
              }}
              onFilterFunnelLeads={(query) => {
                if (typeof window !== 'undefined') {
                  const evt = new CustomEvent('f5_crm_filter_query', { detail: { query } });
                  window.dispatchEvent(evt);
                }
              }}
            />
          </div>

          {/* Right Header Actions: Priorização das Ações do Funil Ativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px', justifyContent: 'flex-end', flexShrink: 0, zIndex: 11 }}>
            {/* Indicador de Visualização como Colaborador Ativo (com botão de saída rápida) */}
            {viewingAsCollaborator && (
              <div
                onClick={() => setViewingAsCollaborator(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(20, 169, 215, 0.18)',
                  border: '1px solid #14A9D7',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(20, 169, 215, 0.3)',
                  transition: 'all 0.15s ease',
                }}
                title={`Visualizando como: ${viewingAsCollaborator.name}. Clique para sair da visão.`}
              >
                <Eye size={13} color="#14A9D7" />
                <span style={{ fontSize: '0.74rem', color: '#FFFFFF', fontWeight: 700 }}>
                  {viewingAsCollaborator.name.split(' ')[0]}
                </span>
                <X size={12} color="#14A9D7" />
              </div>
            )}

            {/* Ponto de encaixe: as telas injetam aqui suas ações (createPortal) */}
            <div id="adm-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }} />

            {/* Ação Primária do Funil Comercial: + Adicionar Lead */}
            {activeTab === 'crm' && (() => {
              const activeFunnel = funnels.find(f => f.id === activeFunnelId);
              return (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('f5_crm_open_new_lead'));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
                  title={activeFunnel ? `Adicionar Lead ao ${activeFunnel.name}` : 'Adicionar Lead ao Funil'}
                >
                  <Plus size={15} />
                  <span>Adicionar Lead</span>
                  {activeFunnel && (
                    <span style={{ fontSize: '0.70rem', opacity: 0.85, fontWeight: 600 }}>
                      • {activeFunnel.name}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Ação Primária do Funil de Pós-Venda: + Adicionar Cliente */}
            {activeTab === 'post-sale-crm' && (() => {
              const activeFunnel = funnels.find(f => f.id === activeFunnelId);
              return (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('f5_open_new_client'));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#06B6D4',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.25)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0891B2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#06B6D4'}
                  title={activeFunnel ? `Adicionar Cliente ao ${activeFunnel.name}` : 'Adicionar Cliente ao Pós-Venda'}
                >
                  <Plus size={15} />
                  <span>Adicionar Cliente</span>
                  {activeFunnel && (
                    <span style={{ fontSize: '0.70rem', opacity: 0.85, fontWeight: 600 }}>
                      • {activeFunnel.name}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Ação Contextual Rápida: Nova Tarefa */}
            {(activeTab === 'home' || activeTab === 'tasks') && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('f5_open_new_task'));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
              >
                <Plus size={15} />
                <span>Nova Tarefa</span>
              </button>
            )}

            {/* Ação Contextual Rápida: Novo Contato */}
            {activeTab === 'contacts' && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('f5_open_new_contact'));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
              >
                <Plus size={15} />
                <span>Novo Contato</span>
              </button>
            )}
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
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}
            >
              {renderContent()}
            </motion.div>
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
            } catch { }
          }}
        />
      )}

      <Toaster richColors position="top-right" theme={theme === 'light' ? 'light' : 'dark'} closeButton />

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
