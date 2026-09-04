import React, { useState } from 'react';
import { useAdminState } from '../../context/AdminStateContext';
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
import { AdminSettingsModal } from './AdminSettingsModal';
import { AdminVenueGoalsView } from './AdminVenueGoalsView';
import { AdminMasterDashboardView } from './AdminMasterDashboardView';
import { AdminSourcesView } from './AdminSourcesView';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { AdminMqlConfigView } from './AdminMqlConfigView';
import { AdminFirstAccessProfileView } from './AdminFirstAccessProfileView';
import { AdminUserSettingsView } from './AdminUserSettingsView';
import { AdminDevFeatureFlagsView } from './AdminDevFeatureFlagsView';
import { AdminDevUsersManagerView } from './AdminDevUsersManagerView';
import { AdminDevAnnouncementsView } from './AdminDevAnnouncementsView';
import { AdminDevSupportView } from './AdminDevSupportView';
import { AdminAnnouncementModal } from './AdminAnnouncementModal';
import { AdminSupportModal } from './AdminSupportModal';
import { ComingSoonOverlay } from './ComingSoonOverlay';
import { Menu, X, Building2, Headphones } from 'lucide-react';
import type { FeatureFlagId } from '../../types/admin';

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

const ROLE_COLORS: Record<string, string> = {
  dev: '#14A9D7',
  master: '#14A9D7',
  admin: '#3B82F6',
  crm: '#10B981',
  sdr: '#8B5CF6',
  closer: '#F97316',
};

import { useActiveTimeTracker } from '../../hooks/useActiveTimeTracker';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onOpenDebutanteApp,
}) => {
  const { 
    currentUser, 
    impersonatingMaster,
    stopImpersonation,
    theme, 
    leads, 
    tasks, 
    venues, 
    debutantes, 
    collaborators, 
    funnels, 
    getFeatureStatus,
    featureDescriptions,
    isFlagsLoaded,
    announcements,
    markAnnouncementAsRead,
  } = useAdminState();
  
  // Track active focus time for collaborators
  useActiveTimeTracker(currentUser);
  const [activeTab, setActiveTab] = useState<AdminTabType>(() => {
    try {
      const saved = localStorage.getItem('bonomo_admin_active_tab') as AdminTabType | null;
      if (saved) return saved;
    } catch {}
    return 'home';
  });
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Fast creation and settings modals
  const [isNewVenueModalOpen, setIsNewVenueModalOpen] = useState(false);
  const [isNewDebutanteModalOpen, setIsNewDebutanteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // CRM workspace: open lead directly from task click
  const [crmOpenLeadId, setCrmOpenLeadId] = useState<string | undefined>(undefined);

  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bonomo_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('bonomo_admin_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const handleSelectTab = (tab: AdminTabType, funnelId?: string | null) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('bonomo_admin_active_tab', tab);
    } catch {}
    if (tab === 'crm') {
      setActiveFunnelId(funnelId !== undefined ? funnelId : null);
    }
  };

  // If not authenticated, show login view
  if (!currentUser) {
    return <AdminLoginView />;
  }

  const userRole = currentUser.role;
  const roleColor = ROLE_COLORS[userRole] || '#D4AF37';

  // Selected announcement to view/re-read from notifications
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState<import('../../types/admin').SystemAnnouncement | null>(null);

  // Check for unread announcement directed at this user (Audio 6 & 7 + Audio 2 roles)
  const isUserTargetedByAnnouncement = (a: import('../../types/admin').SystemAnnouncement) => {
    if (!currentUser) return false;
    if (currentUser.role === 'dev') return true;
    if (a.targetRoles && a.targetRoles.length > 0) {
      return a.targetRoles.includes(currentUser.role);
    }
    if (a.targetAudience === 'all') return true;
    if (a.targetAudience === 'masters' && currentUser.role === 'master') return true;
    return false;
  };

  const unreadAnnouncement = React.useMemo(() => {
    if (!currentUser) return null;
    return announcements.find(a => {
      if (!isUserTargetedByAnnouncement(a)) return false;
      const alreadyRead = a.readReceipts && a.readReceipts.some(r => r.userId === currentUser.id);
      return !alreadyRead;
    }) || null;
  }, [announcements, currentUser]);

  // Notifications calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate === todayStr);
  const newUnassignedLeads = leads.filter(l => l.stage === 'new_lead');
  const userAnnouncements = announcements.filter(isUserTargetedByAnnouncement);
  const totalNotificationsCount = dueTodayTasks.length + newUnassignedLeads.length + (unreadAnnouncement ? 1 : 0);

  // Global search filtering
  const cleanSearch = globalSearch.trim().toLowerCase();
  const matchedVenues = cleanSearch ? venues.filter(v => v.name.toLowerCase().includes(cleanSearch) || v.address.toLowerCase().includes(cleanSearch)) : [];
  const matchedDebutantes = cleanSearch ? debutantes.filter(d => d.name.toLowerCase().includes(cleanSearch) || d.phone.includes(cleanSearch)) : [];
  const matchedLeads = cleanSearch ? leads.filter(l => l.name.toLowerCase().includes(cleanSearch) || l.phone.includes(cleanSearch) || l.debutanteName.toLowerCase().includes(cleanSearch)) : [];
  const matchedCollaborators = cleanSearch ? collaborators.filter(c => c.name.toLowerCase().includes(cleanSearch) || c.email.toLowerCase().includes(cleanSearch) || c.role.toLowerCase().includes(cleanSearch)) : [];
  const totalSearchMatches = matchedVenues.length + matchedDebutantes.length + matchedLeads.length + matchedCollaborators.length;

  const handleOpenLeadFromTask = (leadId: string) => {
    setCrmOpenLeadId(leadId);
    setActiveFunnelId('indicacao');
    setActiveTab('crm');
  };

  const renderContent = () => {
    // If collaborator has first access pending, render the profile completion onboarding workspace
    if (currentUser?.isFirstAccess) {
      return <AdminFirstAccessProfileView />;
    }

    // Feature Flag Check for non-dev users
    const TAB_FEATURE_FLAG: Partial<Record<AdminTabType, FeatureFlagId>> = {
      home: 'home',
      dashboard: 'dashboard',
      whatsapp: 'whatsapp',
      crm: 'funnels',
      debutantes: 'debutantes',
      'venue-goals': 'venue_goals',
      sources: 'sources',
      mql: 'icp',
      'master-dashboard': 'master_dashboard',
      collaborators: 'collaborators',
      venues: 'venues',
    };

    // Se não há casas de festa cadastradas, a tela mandatória é registrar a 1ª unidade (exceto Dev ou Configurações)
    const isDevSession = currentUser?.role === 'dev' || activeTab.startsWith('dev-');
    if (venues.length === 0 && !isDevSession && activeTab !== 'settings') {
      return (
        <AdminVenuesView
          onNavigateToFunnel={(funnelId: string) => {
            setActiveFunnelId(funnelId);
            setActiveTab('crm');
          }}
        />
      );
    }

    // Anti-Leak Guard (Audio 2): Impede qualquer vazamento visual durante F5 em abas protegidas
    if (!isFlagsLoaded && currentUser?.role !== 'dev' && activeTab !== 'home') {
      return (
        <div style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B090E',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <img src="/f5_mark.png" alt="F5" style={{ width: '40px', height: '40px', opacity: 0.8 }} />
            <div style={{ fontSize: '0.78rem', color: '#8096A8', fontFamily: "'Poppins', sans-serif" }}>
              Verificando permissões de acesso...
            </div>
          </div>
        </div>
      );
    }

    const flagId = TAB_FEATURE_FLAG[activeTab];
    if (flagId && currentUser?.role !== 'dev') {
      const status = getFeatureStatus(flagId);
      if (status === 'coming_soon') {
        return (
          <ComingSoonOverlay 
            featureTitle={activeTab.toUpperCase()} 
            description={featureDescriptions[flagId]}
            onBack={() => setActiveTab('home')} 
          />
        );
      }
      if (status === 'disabled') {
        if (activeTab !== 'home') {
          setActiveTab('home');
          try { localStorage.setItem('bonomo_admin_active_tab', 'home'); } catch {}
        }
        return <AdminHomeView onOpenLead={handleOpenLeadFromTask} onNavigateTab={(tab) => handleSelectTab(tab)} />;
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
          />
        );
      case 'whatsapp':
        return <AdminWhatsAppWorkspaceView />;
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
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
    }}>
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
          onOpenSettings={() => setIsSettingsModalOpen(true)}
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
            setIsSettingsModalOpen(true);
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
              } else if (activeTab === 'dashboard') { category = 'Visão Geral'; title = 'Dashboard & Métricas'; }
              else if (activeTab === 'crm') { category = 'Comercial'; title = activeFunnel ? `Funil • ${activeFunnel.name}` : 'Funil Comercial & Leads'; }
              else if (activeTab === 'whatsapp') { category = 'Comunicação'; title = 'WhatsApp Workspace'; }
              else if (activeTab === 'sources') { category = 'Gestão da Casa'; title = 'Origens & Rastreamento'; }
              else if (activeTab === 'mql') { category = 'Inteligência'; title = 'ICP'; }
              else if (activeTab === 'venue-goals') { category = 'Gestão da Casa'; title = 'Metas Comerciais da Casa'; }
              else if (activeTab === 'venues') { category = 'Unidades'; title = 'Casas de Festa & Espaços'; }
              else if (activeTab === 'debutantes') { category = 'Debutantes'; title = 'Central de Aniversariantes • 15 Anos'; }
              else if (activeTab === 'master-dashboard') { category = 'Master'; title = 'Dashboard Executivo Master'; }
              else if (activeTab === 'benefits') { category = 'Catálogo'; title = 'Catálogo de Benefícios & Recompensas'; }
              else if (activeTab === 'collaborators') { category = 'Gestão'; title = 'Equipe Comercial & Permissões'; }
              else if (activeTab === 'templates') { category = 'Jornadas'; title = 'Configurações de Jornadas VIP'; }
              else if (activeTab === 'appointments') { category = 'Agenda'; title = 'Agenda & Visitas / Degustações'; }
              else if (activeTab === 'settings') { category = 'Sistema'; title = 'Configurações Gerais'; }
              else if (activeTab === 'dev-features') { category = 'Desenvolvedor'; title = 'Feature Flags & Controle de Módulos'; }
              else if (activeTab === 'dev-users') { category = 'Desenvolvedor'; title = 'Gestão de Usuários (Masters & Equipe)'; }
              else if (activeTab === 'dev-announcements') { category = 'Desenvolvedor'; title = 'Comunicados Globais do App'; }
              else if (activeTab === 'dev-support') { category = 'Desenvolvedor'; title = 'Painel de Suporte & Central de Bugs'; }

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
            {/* Impersonation Active Banner (Audio 3: Exibido APENAS quando estiver no modo de visualização) */}
            {impersonatingMaster && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                borderRadius: '50px',
                padding: '4px 12px 4px 10px',
                color: '#D4AF37',
                fontSize: '0.76rem',
                fontWeight: 700,
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.18)',
                animation: 'fadeIn 0.2s ease-out',
                whiteSpace: 'nowrap',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#D4AF37',
                  boxShadow: '0 0 8px #D4AF37',
                }} />
                <span>
                  Visualizando como: <strong style={{ color: '#FFFFFF' }}>{currentUser.name}</strong> ({ROLE_LABELS[currentUser.role] || currentUser.role.toUpperCase()})
                </span>
                <button
                  type="button"
                  onClick={stopImpersonation}
                  style={{
                    background: '#D4AF37',
                    color: '#080C14',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  title="Encerrar simulação e voltar para sua conta de Master"
                >
                  <span>Voltar para Master</span>
                </button>
              </div>
            )}

            {/* Expandable Search Capsule (Audio 3: Centralização milimétrica da lupa) */}
            <div className="admin-header-search" style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSearchFocused || globalSearch ? 'flex-start' : 'center',
                gap: '8px',
                background: isSearchFocused || globalSearch ? '#141118' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${isSearchFocused || globalSearch ? '#14A9D7' : 'rgba(255, 255, 255, 0.12)'}`,
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
                  color: isSearchFocused || globalSearch ? '#14A9D7' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  lineHeight: 0,
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
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
                    style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.7rem' }}
                  >
                    ✕
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
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px' }}>
                            🏢 Casas de Festa ({matchedVenues.length})
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
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{v.name}</div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Debutantes */}
                      {matchedDebutantes.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#F472B6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px' }}>
                            👑 Aniversariantes ({matchedDebutantes.length})
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
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(244,114,182,0.2)', color: '#F472B6', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {d.name.charAt(0)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{d.name}</div>
                                  <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{d.phone} • Festa: {d.partyDate || 'Data a definir'}</div>
                                </div>
                                {!canAccessDebutantesTab && (
                                  <span style={{ fontSize: '0.62rem', color: '#818cf8', fontWeight: 700 }}>Ver Leads</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Leads do CRM */}
                      {matchedLeads.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px' }}>
                            🎯 Leads do CRM ({matchedLeads.length})
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
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: '#3B82F6', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {l.name.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{l.name}</div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Indicada por {l.debutanteName} • {l.phone}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Colaboradores */}
                      {matchedCollaborators.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', marginBottom: '4px', paddingLeft: '6px' }}>
                            🛡️ Equipe & Colaboradores ({matchedCollaborators.length})
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
            {/* Support / Help Center Button (Audio 3) */}
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
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
              <Headphones size={16} />
            </button>

            {/* 1. Notification Bell & Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
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
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#14A9D7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>📢 {ann.title}</span>
                          <span style={{ fontSize: '0.62rem', color: '#8096A8' }}>Clique para ler</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ann.content}
                        </div>
                      </div>
                    ))}

                    {totalNotificationsCount === 0 && userAnnouncements.length === 0 ? (
                      <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                        🎉 Nenhuma pendência ou comunicado no momento!
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
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-accent)' }}>
                              🎉 Nova Indicação Recebida
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
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F59E0B' }}>
                              ⏰ Tarefa com Prazo Hoje ({task.dueTime || 'Hoje'})
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

            {/* 2. User Profile Pill (Clicks to open settings) */}
            <div
              onClick={() => setActiveTab('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 12px 4px 4px',
                borderRadius: '24px',
                cursor: 'pointer',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                transition: 'all 0.15s ease',
              }}
              title="Acessar Configurações e Perfil"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--adm-accent-bg)',
                    color: 'var(--adm-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', lineHeight: 1.1 }}>
                  {currentUser?.name || 'Gestor'}
                </span>
                <span style={{ fontSize: '0.66rem', color: roleColor, fontWeight: 700, textTransform: 'uppercase' }}>
                  {ROLE_LABELS[userRole]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: (activeTab === 'whatsapp' || activeTab === 'crm') ? 'hidden' : 'auto',
          overflowX: 'hidden',
          background: 'var(--adm-bg-app)',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderContent()}
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

      <AdminSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <AdminSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

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
