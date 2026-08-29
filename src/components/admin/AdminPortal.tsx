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
import { AdminFirstAccessModal } from './AdminFirstAccessModal';
import { AdminUserSettingsView } from './AdminUserSettingsView';
import { Menu, X, Building2 } from 'lucide-react';

interface AdminPortalProps {
  onOpenDebutanteApp: (slug?: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  master: 'Master',
  admin: 'Gerente',
  crm: 'CRM',
  sdr: 'SDR',
  closer: 'Closer',
};

const ROLE_COLORS: Record<string, string> = {
  master: '#D4AF37',
  admin: '#3B82F6',
  crm: '#10B981',
  sdr: '#8B5CF6',
  closer: '#F97316',
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onOpenDebutanteApp,
}) => {
  const { currentUser, switchUserRoleDemo, switchCollaborator, theme, leads, tasks, venues, debutantes, collaborators, funnels } = useAdminState();
  const [activeTab, setActiveTab] = useState<AdminTabType>('home');
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
    if (tab === 'crm') {
      setActiveFunnelId(funnelId !== undefined ? funnelId : null);
    }
  };

  // If not authenticated, show login view
  if (!currentUser) {
    return <AdminLoginView onBackToApp={() => onOpenDebutanteApp()} />;
  }

  const userRole = currentUser.role;
  const roleColor = ROLE_COLORS[userRole] || '#D4AF37';

  // Notifications calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate === todayStr);
  const newUnassignedLeads = leads.filter(l => l.stage === 'new_lead');
  const totalNotificationsCount = dueTodayTasks.length + newUnassignedLeads.length;

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
        {/* Top Header Bar (Sticky & Seamless - Always Dark #0B090E) */}
        <header className="admin-portal-header" style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '64px',
          flexShrink: 0,
          background: '#0B090E',
          borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
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
              if (activeTab === 'dashboard') { category = 'Visão Geral'; title = 'Dashboard & Métricas'; }
              else if (activeTab === 'crm') { category = 'Comercial'; title = activeFunnel ? `Funil • ${activeFunnel.name}` : 'Funil Comercial & Leads'; }
              else if (activeTab === 'venues') { category = 'Unidades'; title = 'Casas de Festa & Espaços'; }
              else if (activeTab === 'debutantes') { category = 'Debutantes'; title = 'Central de Aniversariantes • 15 Anos'; }
              else if (activeTab === 'benefits') { category = 'Catálogo'; title = 'Catálogo de Benefícios & Recompensas'; }
              else if (activeTab === 'collaborators') { category = 'Gestão'; title = 'Equipe Comercial & Permissões'; }
              else if (activeTab === 'templates') { category = 'Jornadas'; title = 'Configurações de Jornadas VIP'; }
              else if (activeTab === 'appointments') { category = 'Agenda'; title = 'Agenda & Visitas / Degustações'; }
              else if (activeTab === 'settings') { category = 'Sistema'; title = 'Configurações Gerais'; }

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {category}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>/</span>
                  <h1 style={{ fontSize: '0.96rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
                    {title}
                  </h1>
                </div>
              );
            })()}
          </div>

          {/* Right Header Actions: Expandable Search + Notification Bell + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {/* Expandable Search Capsule */}
            <div className="admin-header-search" style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isSearchFocused || globalSearch ? '#141118' : 'transparent',
                border: `1px solid ${isSearchFocused || globalSearch ? 'rgba(212, 175, 55, 0.4)' : 'transparent'}`,
                borderRadius: '50px',
                padding: isSearchFocused || globalSearch ? '5px 12px' : '6px',
                width: isSearchFocused || globalSearch ? '280px' : '36px',
                height: '36px',
                boxSizing: 'border-box',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: isSearchFocused || globalSearch ? 'text' : 'pointer',
              }}
              onClick={() => setIsSearchFocused(true)}
              >
                <span style={{ color: isSearchFocused || globalSearch ? '#D4AF37' : '#9E988D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                      color: '#FFF',
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
                    {totalNotificationsCount === 0 ? (
                      <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                        🎉 Nenhuma pendência ou novo lead no momento!
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

            {/* 2. User Profile Pill & Collaborator Switcher Popover (Desktop Master Only) */}
            {userRole === 'master' && (
              <div className="admin-desktop-collaborator-switcher" style={{ position: 'relative' }}>
                <div 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isProfileMenuOpen ? 'rgba(212, 175, 55, 0.18)' : '#141118',
                    border: `1px solid ${isProfileMenuOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)'}`,
                    borderRadius: '30px',
                    padding: '3px 12px 3px 4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}>
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                      {currentUser?.name || 'Gestor'}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: roleColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      {ROLE_LABELS[userRole]}
                    </span>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9E988D', marginLeft: '2px' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

              {/* Profile / Collaborator Switcher Dropdown */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '260px',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  padding: '12px',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  animation: 'fadeIn 0.15s ease-out',
                }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', paddingLeft: '4px' }}>
                    Alternar Visão de Usuário
                  </div>

                  {/* Role presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {(['master', 'admin', 'sdr', 'closer'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          switchUserRoleDemo(role);
                          setIsProfileMenuOpen(false);
                        }}
                        style={{
                          background: userRole === role ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                          border: userRole === role ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                          color: userRole === role ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>

                  {/* Collaborators Quick List if available */}
                  {collaborators.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', paddingLeft: '4px' }}>
                        Colaboradores Cadastrados
                      </div>
                      {collaborators.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            switchCollaborator(c);
                            setIsProfileMenuOpen(false);
                          }}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: currentUser?.id === c.id ? 'var(--adm-accent-bg)' : 'transparent',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = currentUser?.id === c.id ? 'var(--adm-accent-bg)' : 'transparent'}
                        >
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{c.name}</div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>{c.role.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--adm-bg-app)', height: 'calc(100vh - 64px)' }}>
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

      {currentUser?.isFirstAccess && (
        <AdminFirstAccessModal onComplete={() => {}} />
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
