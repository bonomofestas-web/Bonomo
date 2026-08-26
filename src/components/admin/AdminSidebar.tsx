import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Building2, Users, Target, 
  Calendar, LogOut, Crown, Gift, CheckSquare,
  Shield, Layers, ChevronRight, Settings, TrendingUp,
  ChevronDown, Globe, Check, Pin, Megaphone, Handshake,
  Sparkles, Flame, Zap, DollarSign, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Compass,
  ShieldCheck, Star, ShoppingBag, Music, Camera
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
  | 'appointments';

interface AdminSidebarProps {
  activeTab: AdminTabType;
  activeFunnelId?: string | null;
  onSelectTab: (tab: AdminTabType, funnelId?: string | null) => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
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

  // Venue-specific sub-items (Ordered strictly: Aniversariantes -> Prêmios & Benefícios -> Jornadas & Metas -> Compromissos)
  const venueItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'debutantes', label: 'Aniversariantes', icon: <Users size={18} />, roles: ['master', 'admin', 'crm'] },
    { id: 'benefits', label: 'Prêmios & Benefícios VIP', icon: <Gift size={18} />, roles: ['master', 'admin'] },
    { id: 'templates', label: 'Jornadas & Metas', icon: <Layers size={18} />, roles: ['master', 'admin'] },
    { id: 'appointments', label: 'Compromissos / Degustações', icon: <Calendar size={18} />, roles: ['master', 'admin'] },
  ];

  // Gestão Master (Section 3)
  const masterItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'collaborators', label: 'Colaboradores', icon: <Shield size={18} />, roles: ['master', 'admin'] },
    { id: 'venues', label: 'Casas de Festa', icon: <Building2 size={18} />, roles: ['master'] },
  ];

  const visibleGlobal = globalItems.filter(item => item.roles.includes(userRole));
  const visibleVenueItems = venueItems.filter(item => item.roles.includes(userRole));
  const visibleMasterItems = masterItems.filter(item => item.roles.includes(userRole));

  // Allowed venues for user
  const userAllowedVenueIds = useMemo(() => {
    if (!currentUser || currentUser.role === 'master') return null;
    return currentUser.venueIds && currentUser.venueIds.length > 0 ? currentUser.venueIds : [];
  }, [currentUser]);

  // Pinned funnels for the active user/venue
  const pinnedFunnels = useMemo(() => {
    return (funnels || []).filter(f => {
      if (!f.isPinned) return false;
      if (activeVenueId && f.venueId !== activeVenueId) return false;
      if (userAllowedVenueIds !== null && userAllowedVenueIds.length > 0 && !userAllowedVenueIds.includes(f.venueId)) return false;
      return true;
    });
  }, [funnels, activeVenueId, userAllowedVenueIds]);

  const renderSidebarFunnelIcon = (iconName?: string, size = 15, color = '#D4AF37') => {
    switch (iconName) {
      case 'crown': return <Crown size={size} color={color} />;
      case 'megaphone': return <Megaphone size={size} color={color} />;
      case 'handshake': return <Handshake size={size} color={color} />;
      case 'sparkles': return <Sparkles size={size} color={color} />;
      case 'flame': return <Flame size={size} color={color} />;
      case 'zap': return <Zap size={size} color={color} />;
      case 'dollar': return <DollarSign size={size} color={color} />;
      case 'rocket': return <Rocket size={size} color={color} />;
      case 'heart': return <Heart size={size} color={color} />;
      case 'trophy': return <Trophy size={size} color={color} />;
      case 'radio': return <Radio size={size} color={color} />;
      case 'phone': return <PhoneCall size={size} color={color} />;
      case 'message': return <MessageSquare size={size} color={color} />;
      case 'gift': return <Gift size={size} color={color} />;
      case 'compass': return <Compass size={size} color={color} />;
      case 'shield': return <ShieldCheck size={size} color={color} />;
      case 'star': return <Star size={size} color={color} />;
      case 'shop': return <ShoppingBag size={size} color={color} />;
      case 'music': return <Music size={size} color={color} />;
      case 'camera': return <Camera size={size} color={color} />;
      default: return <Target size={size} color={color} />;
    }
  };

  // Allowed venues for switcher:
  // For master: all venues
  // For admin (manager): user's assigned venueIds
  const allowedVenues = userRole === 'master' 
    ? venues 
    : venues.filter(v => (currentUser?.venueIds || []).includes(v.id));

  const renderNavButton = (item: { id: AdminTabType; label: string; icon: React.ReactNode }, isSubItem = false) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id, null)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: isSubItem ? '9px 12px 9px 18px' : '10px 14px',
          borderRadius: '12px',
          background: isActive ? 'var(--adm-accent-bg)' : 'transparent',
          border: isActive ? '1px solid var(--adm-accent)' : '1px solid transparent',
          color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-body)',
          fontWeight: isActive ? 800 : 600,
          fontSize: isSubItem ? '0.82rem' : '0.86rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
          boxShadow: isActive ? '0 0 16px rgba(212, 175, 55, 0.12)' : 'none',
        }}
      >
        <span style={{ color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-muted)', display: 'flex' }}>
          {item.icon}
        </span>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {isActive && <ChevronRight size={14} color="var(--adm-accent)" />}
      </button>
    );
  };

  return (
    <aside style={{
      width: '270px',
      background: '#0B090E',
      borderRight: '1px solid rgba(212, 175, 55, 0.18)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      padding: '24px 16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: 50,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#FFFFFF',
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
        marginBottom: '18px',
      }}>
        <img
          src="/logo_bonomo_gold.png"
          alt="Bonomo Festas"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            objectFit: 'cover',
            border: '1.5px solid rgba(212, 175, 55, 0.5)',
            boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}>
            Bonomo Festas
          </div>
          <div style={{
            fontSize: '0.68rem',
            color: '#D4AF37',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Workspace VIP
          </div>
        </div>
      </div>

      {/* Luxury Custom Venue Switcher Popover */}
      {(userRole === 'master' || allowedVenues.length > 1) && (
        <div ref={venueDropdownRef} style={{ position: 'relative', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setIsVenueDropdownOpen(v => !v)}
            style={{
              width: '100%',
              background: isVenueDropdownOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
              border: `1px solid ${isVenueDropdownOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              borderRadius: '14px',
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: isVenueDropdownOpen ? '0 0 16px rgba(212, 175, 55, 0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
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
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                  Unidade Selecionada
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeVenue ? activeVenue.name : 'Visão Global (Todas)'}
                </div>
              </div>
            </div>

            <ChevronDown
              size={13}
              color="var(--adm-text-muted)"
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
              background: 'var(--adm-bg-card)',
              border: '1.5px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '16px',
              padding: '6px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              maxHeight: '300px',
              overflowY: 'auto',
              animation: 'fadeIn 0.15s ease-out',
            }}>
              {/* Header inside dropdown */}
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', padding: '4px 8px 2px', letterSpacing: '0.5px' }}>
                Casas de Festa
              </div>

              {/* Option 1: Visão Global */}
              {userRole === 'master' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveVenueId(null);
                    setIsVenueDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    background: !activeVenueId ? 'var(--adm-accent-bg)' : 'transparent',
                    border: !activeVenueId ? '1px solid var(--adm-accent)' : '1px solid transparent',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '6px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Globe size={13} color="#D4AF37" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Visão Global
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                        Todas as unidades
                      </div>
                    </div>
                  </div>
                  {!activeVenueId && <Check size={13} color="#D4AF37" strokeWidth={2.5} />}
                </button>
              )}

              {/* Divider */}
              {userRole === 'master' && (
                <div style={{ height: 1, background: 'var(--adm-border)', margin: '2px 0' }} />
              )}

              {/* Venues Options */}
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
                      background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                      border: isSelected ? '1px solid var(--adm-accent)' : '1px solid transparent',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {v.logoUrl ? (
                        <img src={v.logoUrl} alt={v.name} style={{ width: 24, height: 24, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          background: 'rgba(212, 175, 55, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Building2 size={13} color="#D4AF37" />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.name}
                        </div>
                        {v.address && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.address}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={13} color="#D4AF37" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        {/* Section 1: Workspace */}
        <div>
          <div style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            color: 'var(--adm-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            paddingLeft: '10px',
            marginBottom: '8px',
          }}>
            Workspace
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {visibleGlobal.map(item => renderNavButton(item, false))}
          </div>
        </div>

        {/* Section: Funis Fixados (Exibida APENAS quando há funis fixados) */}
        {pinnedFunnels.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: 'var(--adm-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              paddingLeft: '10px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Pin size={11} color="var(--adm-accent)" />
              <span>Funis</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {pinnedFunnels.map(funnel => {
                const isFunnelActive = activeTab === 'crm' && activeFunnelId === funnel.id;
                const venue = venues.find(v => v.id === funnel.venueId);

                return (
                  <button
                    key={funnel.id}
                    type="button"
                    onClick={() => onSelectTab('crm', funnel.id)}
                    title={`Acessar ${funnel.name} (${venue?.name || ''})`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: isFunnelActive ? 'var(--adm-accent-bg)' : 'transparent',
                      border: isFunnelActive ? '1px solid var(--adm-accent)' : '1px solid transparent',
                      color: isFunnelActive ? 'var(--adm-accent)' : 'var(--adm-text-body)',
                      fontWeight: isFunnelActive ? 800 : 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isFunnelActive ? '0 0 16px rgba(212, 175, 55, 0.12)' : 'none',
                    }}
                  >
                    {/* Funnel Icon or Custom Image Thumbnail */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '7px',
                      background: `${funnel.badgeColor || '#3B82F6'}18`,
                      border: `1px solid ${funnel.badgeColor || '#3B82F6'}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {funnel.customImageUrl ? (
                        <img src={funnel.customImageUrl} alt={funnel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        renderSidebarFunnelIcon(funnel.icon || 'target', 13, funnel.badgeColor || '#3B82F6')
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                        {funnel.name}
                      </div>
                      {venue && !activeVenueId && (
                        <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {venue.name}
                        </div>
                      )}
                    </div>

                    {isFunnelActive && <ChevronRight size={13} color="var(--adm-accent)" />}
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
            color: activeVenue ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
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
                  color: 'var(--adm-text-muted)',
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
          {venues.length === 0 ? (
            <div style={{ padding: '4px' }}>
              <button
                type="button"
                onClick={() => onSelectTab('venues')}
                style={{
                  width: '100%',
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px dashed var(--adm-accent)',
                  borderRadius: '12px',
                  padding: '12px 10px',
                  color: 'var(--adm-accent)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  lineHeight: 1.35,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Building2 size={16} />
                <span>Cadastre uma casa de festa para poder gerenciar</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {visibleVenueItems.map(item => renderNavButton(item, true))}
            </div>
          )}
        </div>

        {/* Section 3: Gestão Master (Visible if user has permissions for collaborators or venues) */}
        {visibleMasterItems.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: 'var(--adm-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              paddingLeft: '10px',
              marginBottom: '8px',
            }}>
              Gestão Master
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {visibleMasterItems.map(item => renderNavButton(item, false))}
            </div>
          </div>
        )}
      </nav>

      {/* Performance indicator for SDR/Closer */}
      {(userRole === 'sdr' || userRole === 'closer') && (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '10px 12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'var(--adm-green-bg)',
            color: 'var(--adm-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              {userRole === 'sdr' ? 'SDR Ativo' : 'Closer Ativo'}
            </div>
            <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
              {userRole === 'sdr' ? 'Seus atendimentos' : 'Suas reuniões e vendas'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions: User Info Card */}
      <div style={{
        borderTop: '1px solid var(--adm-border)',
        paddingTop: '16px',
      }}>
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '14px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div 
            onClick={onOpenSettings}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
            title="Configurações de Perfil e Tema"
          >
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="User"
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--adm-accent)', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'Administrador'}
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {ROLE_LABELS[userRole] || userRole}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Configurações & Tema"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted)')}
              >
                <Settings size={15} />
              </button>
            )}

            <button
              onClick={logout}
              title="Sair do Sistema"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--adm-text-muted)')}
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
