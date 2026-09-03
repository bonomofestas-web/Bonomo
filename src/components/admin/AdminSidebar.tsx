import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Building2, Users, Target, 
  LogOut, CheckSquare, Crown,
  ChevronRight, ChevronLeft, Settings,
  ChevronDown, Globe,
  Sparkles, Flame, Zap, DollarSign, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Compass,
  ShieldCheck, Star, ShoppingBag, Music, Camera, X, AlertTriangle, Sliders
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { APP_VERSION, type FeatureFlagId } from '../../types/admin';
import type { Venue } from '../../types/admin';

export type AdminTabType = 
  | 'home'
  | 'dashboard' 
  | 'crm' 
  | 'whatsapp'
  | 'sources'
  | 'mql'
  | 'debutantes' 
  | 'venue-goals'
  | 'master-dashboard'
  | 'venues' 
  | 'benefits'
  | 'collaborators' 
  | 'templates' 
  | 'appointments'
  | 'settings'
  | 'dev-features';

interface AdminSidebarProps {
  activeTab: AdminTabType;
  activeFunnelId?: string | null;
  onSelectTab: (tab: AdminTabType, funnelId?: string | null) => void;
  onOpenSettings?: () => void;
  onCloseMobile?: () => void;
  isMobileOverlay?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  dev: 'Desenvolvedor',
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { 
    currentUser, 
    logout, 
    venues, 
    activeVenueId, 
    setActiveVenueId,
    funnels,
    hasUnconfiguredSources,
    unconfiguredSourcesCount,
    getFeatureStatus,
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
  const activeVenue = venues.find(v => v.id === activeVenueId) || null;

  // Map each tab to its controlling feature flag (if applicable)
  const TAB_FEATURE_FLAG: Partial<Record<AdminTabType, FeatureFlagId>> = {
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

  const devItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'dev-features', label: 'Feature Flags (Dev)', icon: <Sliders size={17} />, roles: ['dev'] },
  ];

  // Grouped Navigation Items with updated concise labels
  const globalItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'home', label: 'Início', icon: <CheckSquare size={17} />, roles: ['dev', 'master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} />, roles: ['dev', 'master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'crm', label: 'Funil', icon: <Target size={17} />, roles: ['dev', 'master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={17} />, roles: ['dev', 'master', 'admin', 'crm', 'sdr', 'closer'] },
  ];

  const venueItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[]; alertBadge?: boolean }[] = [
    { id: 'debutantes', label: 'Aniversariantes', icon: <Users size={17} />, roles: ['dev', 'master', 'admin', 'crm'] },
    { id: 'venue-goals', label: 'Metas', icon: <Target size={17} />, roles: ['dev', 'master', 'admin', 'crm'] },
    { id: 'sources', label: 'Origens', icon: <Compass size={17} />, roles: ['dev', 'master', 'admin', 'crm'], alertBadge: hasUnconfiguredSources },
    { id: 'mql', label: 'ICP', icon: <IcpTargetUserIcon size={17} />, roles: ['dev', 'master', 'admin', 'crm'] },
  ];

  const masterItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'master-dashboard', label: 'Dashboard Master', icon: <Crown size={17} />, roles: ['dev', 'master'] },
    { id: 'collaborators', label: 'Colaboradores', icon: <ShieldCheck size={17} />, roles: ['dev', 'master'] },
    { id: 'venues', label: 'Casas de Festa', icon: <Building2 size={17} />, roles: ['dev', 'master'] },
  ];

  const allowedVenues = useMemo(() => {
    if (userRole === 'dev' || userRole === 'master') return venues;
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

  const renderSidebarFunnelIcon = (iconName?: string, size = 15, color = '#D4AF37') => {
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

  // Helper to render Venue Logo / Icon with Square Background
  const renderVenueIconBadge = (v?: Venue | null, size = 28, isRound = false) => {
    if (!v || !v.id || v.id === 'all') {
      return (
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: isRound ? '50%' : '8px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Globe size={Math.round(size * 0.55)} color="#D4AF37" />
        </div>
      );
    }

    if (v.logoUrl) {
      return (
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: isRound ? '50%' : '8px',
          background: '#1A1622',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          padding: '2px',
          boxSizing: 'border-box',
        }}>
          <img
            src={v.logoUrl}
            alt={v.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: isRound ? '50%' : '6px',
              display: 'block',
            }}
          />
        </div>
      );
    }

    // Fallback Monogram
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: isRound ? '50%' : '8px',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#D4AF37',
        fontWeight: 900,
        fontSize: `${Math.round(size * 0.42)}px`,
        fontFamily: "'Cinzel', serif",
      }}>
        {v.name.slice(0, 1).toUpperCase()}
      </div>
    );
  };

  const handleTabClick = (tabId: AdminTabType, funnelId?: string | null) => {
    onSelectTab(tabId, funnelId);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavButton = (item: { id: AdminTabType; label: string; icon: React.ReactNode }, isSubItem = false) => {
    const isActive = item.id === 'crm'
      ? activeTab === 'crm' && (!activeFunnelId || activeFunnelId === null)
      : activeTab === item.id;

    // Check Feature Flag for this item (Dev account always has active access)
    const featureId = TAB_FEATURE_FLAG[item.id];
    const featureStatus = featureId ? getFeatureStatus(featureId) : 'active';

    // If disabled and not dev, hide completely
    if (featureStatus === 'disabled' && userRole !== 'dev') {
      return null;
    }

    const isComingSoon = featureStatus === 'coming_soon' && userRole !== 'dev';

    if (isCollapsed && !isMobileOverlay) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleTabClick(item.id, null)}
          title={isComingSoon ? `${item.label} (Em Breve)` : item.label}
          style={{
            width: '44px',
            height: '44px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: isActive ? 'rgba(20, 169, 215, 0.18)' : 'transparent',
            border: isActive ? '1px solid #14A9D7' : '1px solid transparent',
            color: isActive ? '#14A9D7' : '#8096A8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          {item.icon}
          {isComingSoon && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#14A9D7',
              boxShadow: '0 0 6px rgba(20, 169, 215, 0.8)',
            }} />
          )}
          {isActive && (
            <span style={{
              position: 'absolute',
              right: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '4px',
              height: '16px',
              borderRadius: '2px',
              background: '#14A9D7',
              boxShadow: '0 0 8px rgba(20, 169, 215, 0.8)',
            }} />
          )}
        </button>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleTabClick(item.id, null)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: isSubItem ? '8px 10px 8px 16px' : '9px 12px',
          borderRadius: '10px',
          background: isActive ? 'rgba(20, 169, 215, 0.14)' : 'transparent',
          border: isActive ? '1px solid #14A9D7' : '1px solid transparent',
          color: isActive ? '#14A9D7' : '#FFFFFF',
          fontWeight: isActive ? 700 : 500,
          fontSize: isSubItem ? '0.78rem' : '0.82rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ color: isActive ? '#14A9D7' : '#8096A8', display: 'flex' }}>
          {item.icon}
        </span>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{item.label}</span>
          {isComingSoon && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(20, 169, 215, 0.2)',
              color: '#14A9D7',
              border: '1px solid rgba(20, 169, 215, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              Em Breve
            </span>
          )}
          {item.id === 'sources' && hasUnconfiguredSources && (
            <span
              title={`${unconfiguredSourcesCount} origem(ns) sem funil configurado!`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            >
              <AlertTriangle size={14} />
            </span>
          )}
        </span>
        {isActive && <ChevronRight size={13} color="#14A9D7" />}
      </button>
    );
  };

  const sidebarWidth = isMobileOverlay 
    ? '100vw' 
    : isCollapsed 
    ? '68px' 
    : '220px';

  return (
    <aside style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      maxWidth: sidebarWidth,
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
      padding: isMobileOverlay 
        ? '20px 16px 30px 16px' 
        : isCollapsed 
        ? '16px 10px' 
        : '18px 12px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      overflowX: 'hidden',
      zIndex: isMobileOverlay ? 9999 : 50,
      fontFamily: "'Poppins', sans-serif",
      color: '#FFFFFF',
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Brand Header: F5 System Official Logos */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed && !isMobileOverlay ? 'center' : 'space-between',
        paddingBottom: '14px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.2)',
        marginBottom: '14px',
        position: 'relative',
      }}>
        {isCollapsed && !isMobileOverlay ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}>
            {/* F5 Official Símbolo/Mark */}
            <div 
              title="F5 System"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(20, 169, 215, 0.12)',
                border: '1.5px solid #14A9D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(20, 169, 215, 0.3)',
                padding: '4px',
                boxSizing: 'border-box',
              }}
            >
              <img
                src="/f5_mark.png"
                alt="F5"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Expand button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir Menu Lateral"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(20, 169, 215, 0.3)',
                color: '#14A9D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(20, 169, 215, 0.2)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <img
                src="/f5_logo.png"
                alt="F5 System"
                style={{
                  height: '34px',
                  width: 'auto',
                  maxWidth: '140px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            {/* Collapse button */}
            {!isMobileOverlay && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Recolher Menu Lateral"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  color: '#14A9D7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(20, 169, 215, 0.2)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ChevronLeft size={16} />
              </button>
            )}

            {/* Mobile Close Button */}
            {isMobileOverlay && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Luxury Custom Venue Switcher Popover with Logos & Globo */}
      {(userRole === 'master' || allowedVenues.length > 1) && (
        <div ref={venueDropdownRef} style={{ position: 'relative', marginBottom: '14px' }}>
          {isCollapsed && !isMobileOverlay ? (
            <button
              type="button"
              onClick={() => setIsVenueDropdownOpen(v => !v)}
              title={activeVenue?.name || 'Todas as Casas (Rede Geral)'}
              style={{
                width: '44px',
                height: '44px',
                margin: '0 auto',
                background: '#141118',
                border: `1px solid ${isVenueDropdownOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.3)'}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {renderVenueIconBadge(activeVenue, 36)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsVenueDropdownOpen(v => !v)}
              style={{
                width: '100%',
                background: isVenueDropdownOpen ? 'rgba(212, 175, 55, 0.14)' : '#141118',
                border: `1px solid ${isVenueDropdownOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)'}`,
                borderRadius: '12px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                {renderVenueIconBadge(activeVenue, 28)}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Unidade
                  </div>
                  <div style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {activeVenue?.name || 'Rede Geral'}
                  </div>
                </div>
              </div>
              <ChevronDown 
                size={13} 
                color="#D4AF37" 
                style={{ 
                  transform: isVenueDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }} 
              />
            </button>
          )}

          {/* Venue Switcher Popover Menu */}
          {isVenueDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: isCollapsed ? '50px' : 0,
              right: isCollapsed ? undefined : 0,
              width: isCollapsed ? '220px' : undefined,
              marginTop: '6px',
              background: '#141118',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.15)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {userRole === 'master' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVenueId(null);
                    setIsVenueDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: activeVenueId === null ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                    border: activeVenueId === null ? '1px solid #D4AF37' : '1px solid transparent',
                    color: activeVenueId === null ? '#D4AF37' : '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: activeVenueId === null ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {renderVenueIconBadge(null, 24)}
                  <span>Todas as Casas (Rede Geral)</span>
                </button>
              )}

              {allowedVenues.map(venue => {
                const isSelected = activeVenueId === venue.id;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => {
                      setActiveVenueId(venue.id);
                      setIsVenueDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                      border: isSelected ? '1px solid #D4AF37' : '1px solid transparent',
                      color: isSelected ? '#D4AF37' : '#FFFFFF',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {renderVenueIconBadge(venue, 24)}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {venue.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isCollapsed ? '10px' : '14px',
        flex: 1,
      }}>
        {/* 1. Global Group: Início, Dashboard, Funil */}
        <div>
          {!isCollapsed && (
            <div style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#9E988D',
              letterSpacing: '0.8px',
              padding: '0 8px 6px 8px',
            }}>
              Workspace
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {globalItems.map(item => renderNavButton(item))}

            {/* Pinned Funnels List under Funil */}
            {!isCollapsed && visibleFunnels.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
                {visibleFunnels.map(f => {
                  const isFunnelActive = activeTab === 'crm' && activeFunnelId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleTabClick('crm', f.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px 6px 14px',
                        borderRadius: '8px',
                        background: isFunnelActive ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                        border: isFunnelActive ? '1px solid #D4AF37' : '1px solid transparent',
                        color: isFunnelActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.76rem',
                        fontWeight: isFunnelActive ? 700 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{renderSidebarFunnelIcon(f.icon, 13, isFunnelActive ? '#D4AF37' : '#9E988D')}</span>
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. Venue Group: Aniversariantes & Metas da Casa */}
        <div>
          {!isCollapsed && (
            <div style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#D4AF37',
              letterSpacing: '0.8px',
              padding: '0 8px 6px 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {activeVenue ? activeVenue.name : 'Gestão da Casa'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {venueItems.map(item => renderNavButton(item))}
          </div>
        </div>

        {/* 3. Master Administration: Dashboard Master, Colaboradores, Casas de Festa */}
        {(userRole === 'dev' || userRole === 'master') && (
          <div>
            {!isCollapsed && (
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#8096A8',
                letterSpacing: '0.8px',
                padding: '0 8px 6px 8px',
              }}>
                Administração
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {masterItems.map(item => renderNavButton(item))}
            </div>
          </div>
        )}

        {/* 4. Exclusive Developer Group: Feature Flags Panel */}
        {userRole === 'dev' && (
          <div>
            {!isCollapsed && (
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#14A9D7',
                letterSpacing: '0.8px',
                padding: '0 8px 6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span>Desenvolvedor</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {devItems.map(item => renderNavButton(item))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions: User Info Card */}
      <div style={{
        borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        paddingTop: '12px',
        marginTop: '12px',
      }}>
        {isCollapsed && !isMobileOverlay ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="User"
              onClick={() => handleTabClick('settings')}
              title={`${currentUser?.name || 'Administrador'} (${ROLE_LABELS[userRole] || userRole})`}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #D4AF37', objectFit: 'cover', cursor: 'pointer' }}
            />
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
                justifyContent: 'center',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <>
            <div style={{
              background: '#141118',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div 
                onClick={() => handleTabClick('settings')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                title="Configurações de Perfil e Tema"
              >
                <img
                  src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="User"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #D4AF37', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser?.name || 'Administrador'}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#9E988D', textTransform: 'uppercase', fontWeight: 600 }}>
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
                    padding: '5px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = activeTab === 'settings' ? '#D4AF37' : '#9E988D')}
                >
                  <Settings size={14} />
                </button>

                <button
                  onClick={logout}
                  title="Sair do Sistema"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9E988D',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#9E988D')}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>

            {/* System Version Footer */}
            <div style={{
              textAlign: 'center',
              paddingTop: '6px',
              fontSize: '0.62rem',
              color: 'rgba(212, 175, 55, 0.75)',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.8px',
              fontWeight: 700,
            }}>
              Versão {APP_VERSION}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
