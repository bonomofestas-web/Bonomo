import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Building2, Users, Target, 
  LogOut, CheckSquare,
  ChevronRight, Settings,
  ChevronDown, Globe,
  Sparkles, Flame, Zap, DollarSign, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Compass,
  ShieldCheck, Star, ShoppingBag, Music, Camera, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { APP_VERSION } from '../../types/admin';

export type AdminTabType = 
  | 'home'
  | 'dashboard' 
  | 'crm' 
  | 'debutantes' 
  | 'venues' 
  | 'benefits'
  | 'collaborators' 
  | 'templates' 
  | 'appointments'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTabType;
  activeFunnelId?: string | null;
  onSelectTab: (tab: AdminTabType, funnelId?: string | null) => void;
  onOpenSettings?: () => void;
  onCloseMobile?: () => void;
  isMobileOverlay?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  master: 'Master',
  admin: 'Gerente',
  crm: 'Comercial',
  sdr: 'SDR',
  closer: 'Closer',
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  activeFunnelId,
  onSelectTab,
  onCloseMobile,
  isMobileOverlay = false,
}) => {
  const { 
    currentUser, 
    logout, 
    venues, 
    activeVenueId, 
    setActiveVenueId,
    funnels,
  } = useAdminState();

  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const venueDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target as Node)) {
        setIsVenueDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userRole = currentUser?.role || 'master';
  const activeVenue = venues.find(v => v.id === activeVenueId);

  // Grouped Navigation Items
  const globalItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'home', label: 'Meu Dia / Início', icon: <CheckSquare size={18} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'dashboard', label: 'Dashboard & Métricas', icon: <LayoutDashboard size={18} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'crm', label: 'Funil Comercial', icon: <Target size={18} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
  ];

  const venueItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'debutantes', label: 'Aniversariantes', icon: <Users size={18} />, roles: ['master', 'admin', 'crm'] },
  ];

  const masterItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'collaborators', label: 'Colaboradores', icon: <ShieldCheck size={18} />, roles: ['master'] },
    { id: 'venues', label: 'Casas de Festa', icon: <Building2 size={18} />, roles: ['master'] },
  ];

  const allowedVenues = useMemo(() => {
    if (userRole === 'master') return venues;
    if (!currentUser?.venueIds || currentUser.venueIds.length === 0) return venues;
    return venues.filter(v => currentUser.venueIds?.includes(v.id));
  }, [venues, currentUser, userRole]);

  const visibleFunnels = useMemo(() => {
    return funnels.filter(funnel => {
      if (!funnel.isPinned) return false;
      if (!activeVenueId) return true;
      return funnel.venueId === activeVenueId || funnel.venueId === 'all';
    });
  }, [funnels, activeVenueId]);

  const renderSidebarFunnelIcon = (iconName: string, size = 15, color = '#D4AF37') => {
    switch (iconName) {
      case 'sparkles': return <Sparkles size={size} color={color} />;
      case 'flame': return <Flame size={size} color={color} />;
      case 'zap': return <Zap size={size} color={color} />;
      case 'dollar-sign': return <DollarSign size={size} color={color} />;
      case 'rocket': return <Rocket size={size} color={color} />;
      case 'heart': return <Heart size={size} color={color} />;
      case 'trophy': return <Trophy size={size} color={color} />;
      case 'radio': return <Radio size={size} color={color} />;
      case 'phone-call': return <PhoneCall size={size} color={color} />;
      case 'message-square': return <MessageSquare size={size} color={color} />;
      case 'compass': return <Compass size={size} color={color} />;
      case 'shield-check': return <ShieldCheck size={size} color={color} />;
      case 'star': return <Star size={size} color={color} />;
      case 'shopping-bag': return <ShoppingBag size={size} color={color} />;
      case 'music': return <Music size={size} color={color} />;
      case 'camera': return <Camera size={size} color={color} />;
      default: return <Target size={size} color={color} />;
    }
  };

  const handleTabClick = (tabId: AdminTabType, funnelId?: string | null) => {
    onSelectTab(tabId, funnelId);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavButton = (item: { id: AdminTabType; label: string; icon: React.ReactNode }, isSubItem = false) => {
    const isActive = item.id === 'crm'
      ? activeTab === 'crm' && (!activeFunnelId || activeFunnelId === null)
      : activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleTabClick(item.id, null)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: isSubItem ? '9px 12px 9px 18px' : '10px 14px',
          borderRadius: '12px',
          background: isActive ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
          border: isActive ? '1px solid #D4AF37' : '1px solid transparent',
          color: isActive ? '#D4AF37' : '#FFFFFF',
          fontWeight: isActive ? 700 : 500,
          fontSize: isSubItem ? '0.82rem' : '0.86rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ color: isActive ? '#D4AF37' : '#9E988D', display: 'flex' }}>
          {item.icon}
        </span>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {isActive && <ChevronRight size={14} color="#D4AF37" />}
      </button>
    );
  };

  return (
    <aside style={{
      width: isMobileOverlay ? '100vw' : '270px',
      background: '#0B090E',
      borderRight: isMobileOverlay ? 'none' : '1px solid rgba(212, 175, 55, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: isMobileOverlay ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      right: isMobileOverlay ? 0 : undefined,
      bottom: isMobileOverlay ? 0 : undefined,
      padding: isMobileOverlay ? '24px 20px 32px 20px' : '24px 16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: isMobileOverlay ? 9999 : 50,
      fontFamily: "'Poppins', sans-serif",
      color: '#FFFFFF',
    }}>
      {/* Brand Header with Big Horizontal Logo and Mobile Close Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
        marginBottom: '18px',
        position: 'relative',
      }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo_horizontal.png"
            alt="Bonomo Festas"
            style={{
              width: '100%',
              maxWidth: '220px',
              height: 'auto',
              maxHeight: '52px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {isMobileOverlay && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            style={{
              position: 'absolute',
              right: '0px',
              top: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Luxury Custom Venue Switcher Popover (Solid Dark in all modes) */}
      {(userRole === 'master' || allowedVenues.length > 1) && (
        <div ref={venueDropdownRef} style={{ position: 'relative', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setIsVenueDropdownOpen(v => !v)}
            style={{
              width: '100%',
              background: isVenueDropdownOpen ? 'rgba(212, 175, 55, 0.14)' : '#141118',
              border: `1px solid ${isVenueDropdownOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)'}`,
              borderRadius: '14px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              {/* Logo / Badge */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                background: activeVenue ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {activeVenue?.logoUrl ? (
                  <img src={activeVenue.logoUrl} alt={activeVenue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : activeVenue ? (
                  <Building2 size={15} color="#D4AF37" />
                ) : (
                  <Globe size={15} color="#D4AF37" />
                )}
              </div>

              {/* Text */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#9E988D', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                  Unidade Selecionada
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeVenue ? activeVenue.name : 'Visão Global (Todas)'}
                </div>
              </div>
            </div>

            <ChevronDown
              size={14}
              color="#9E988D"
              style={{
                transform: isVenueDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            />
          </button>

          {/* Dropdown Menu Modal/Popover */}
          {isVenueDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: '#120F17',
              border: '1.5px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '16px',
              padding: '6px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9E988D', textTransform: 'uppercase', padding: '4px 8px 2px', letterSpacing: '0.5px' }}>
                Casas de Festa
              </div>

              {userRole === 'master' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVenueId(null);
                    setIsVenueDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    background: !activeVenueId ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                    border: !activeVenueId ? '1px solid #D4AF37' : '1px solid transparent',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    color: !activeVenueId ? '#D4AF37' : '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                  }}
                >
                  <Globe size={14} color="#D4AF37" />
                  <span>Visão Global (Todas)</span>
                </button>
              )}

              {allowedVenues.map(v => {
                const isSelected = activeVenueId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setActiveVenueId(v.id);
                      setIsVenueDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: isSelected ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                      border: isSelected ? '1px solid #D4AF37' : '1px solid transparent',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      color: isSelected ? '#D4AF37' : '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <Building2 size={14} color="#D4AF37" />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Section 1: Workspace Global */}
        <div>
          <div style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            color: '#9E988D',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            paddingLeft: '10px',
            marginBottom: '8px',
          }}>
            Workspace
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {globalItems.map(item => renderNavButton(item))}
          </div>
        </div>

        {/* Dynamic Funnel Sub-Items */}
        {visibleFunnels.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: '#D4AF37',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              paddingLeft: '10px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span>Funis Fixados</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {visibleFunnels.map(funnel => {
                const isFunnelActive = activeTab === 'crm' && activeFunnelId === funnel.id;
                const venue = venues.find(v => v.id === funnel.venueId);
                return (
                  <button
                    key={funnel.id}
                    type="button"
                    onClick={() => handleTabClick('crm', funnel.id)}
                    title={`Acessar ${funnel.name} (${venue?.name || ''})`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: isFunnelActive ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                      border: isFunnelActive ? '1px solid #D4AF37' : '1px solid transparent',
                      color: isFunnelActive ? '#D4AF37' : '#FFFFFF',
                      fontWeight: isFunnelActive ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '7px',
                      background: `${funnel.badgeColor || '#D4AF37'}18`,
                      border: `1px solid ${funnel.badgeColor || '#D4AF37'}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {funnel.customImageUrl ? (
                        <img src={funnel.customImageUrl} alt={funnel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        renderSidebarFunnelIcon(funnel.icon || 'target', 13, funnel.badgeColor || '#D4AF37')
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                        {funnel.name}
                      </div>
                      {venue && !activeVenueId && (
                        <div style={{ fontSize: '0.62rem', color: '#9E988D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {venue.name}
                        </div>
                      )}
                    </div>

                    {isFunnelActive && <ChevronRight size={13} color="#D4AF37" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Gestão por Casa de Festa */}
        <div>
          <div style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            color: '#D4AF37',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            paddingLeft: '10px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{activeVenue ? activeVenue.name : 'Gestão da Casa'}</span>
            {activeVenue && (
              <button
                type="button"
                onClick={() => setActiveVenueId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9E988D',
                  fontSize: '0.62rem',
                  cursor: 'pointer',
                  padding: 0,
                  textTransform: 'none',
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {venueItems
              .filter(item => item.roles.includes(userRole))
              .map(item => renderNavButton(item, true))}
          </div>
        </div>

        {/* Section 3: Master Control */}
        {userRole === 'master' && (
          <div>
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: '#D4AF37',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              paddingLeft: '10px',
              marginBottom: '8px',
            }}>
              Gestão Master
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {masterItems.map(item => renderNavButton(item))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions: User Info Card (Solid Dark in all modes) */}
      <div style={{
        borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        paddingTop: '16px',
        marginTop: '16px',
      }}>
        <div style={{
          background: '#141118',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '14px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div 
            onClick={() => handleTabClick('settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
            title="Configurações de Perfil e Tema"
          >
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="User"
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #D4AF37', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'Administrador'}
              </div>
              <div style={{ fontSize: '0.64rem', color: '#9E988D', textTransform: 'uppercase', fontWeight: 600 }}>
                {ROLE_LABELS[userRole] || userRole}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <button
              onClick={() => handleTabClick('settings')}
              title="Configurações & Tema"
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'settings' ? '#D4AF37' : '#9E988D',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = activeTab === 'settings' ? '#D4AF37' : '#9E988D')}
            >
              <Settings size={15} />
            </button>

            <button
              onClick={logout}
              title="Sair do Sistema"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9E988D',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9E988D')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* System Version Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '8px',
          fontSize: '0.65rem',
          color: 'rgba(212, 175, 55, 0.75)',
          fontFamily: "'Cinzel', serif",
          letterSpacing: '1px',
          fontWeight: 700,
        }}>
          Versão {APP_VERSION}
        </div>
      </div>
    </aside>
  );
};
