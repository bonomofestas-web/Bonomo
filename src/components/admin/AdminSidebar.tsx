import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Building2, Users, Target, 
  CheckSquare, Home, Briefcase, DollarSign, SlidersHorizontal,
  ChevronRight, ChevronLeft,
  ChevronDown, Globe,
  Sparkles, Radio, PhoneCall, Compass,
  ShieldCheck, Star, X, AlertTriangle, Sliders, Headset,
  Eye, RotateCcw, Gift, Calendar, GripVertical, UserCheck
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { useAdminState } from '../../context/AdminStateContext';
import { type FeatureFlagId, type Venue, type CommercialFunnel } from '../../types/admin';
import { getLeadPendingWaitingTime } from '../../utils/leadSorting';

export type AdminTabType = 
  | 'home'
  | 'tasks'
  | 'team-calendar'
  | 'dashboard' 
  | 'crm' 
  | 'leads'
  | 'followups'
  | 'whatsapp'
  | 'post-sale-crm'
  | 'post-sale-clients'
  | 'vip-journey'
  | 'post-sale-appointments'
  | 'post-sale-visits-tastings'
  | 'team'
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
  | 'dev-features'
  | 'dev-users'
  | 'dev-announcements'
  | 'dev-support';

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
  admin: 'Gerência',
  gerencia: 'Gerência',
  pos_venda: 'Pós-Venda',
  comercial: 'Comercial',
  crm: 'Comercial',
  sdr: 'Comercial',
  closer: 'Comercial',
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
    venues, 
    activeVenueId, 
    setActiveVenueId,
    funnels,
    leads,
    hasUnconfiguredSources,
    unconfiguredSourcesCount,
    unindexedLeadsCount,
    getFeatureStatus,
    collaborators,
    viewingAsCollaborator,
    setViewingAsCollaborator,
    refreshAllData,
    userPinnedFunnelIds,
    reorderPinnedFunnels,
  } = useAdminState();

  const [isRefreshingLogo, setIsRefreshingLogo] = useState(false);

  const handleLogoRefresh = async () => {
    if (isRefreshingLogo) return;
    setIsRefreshingLogo(true);
    try {
      if (refreshAllData) {
        await refreshAllData();
      }
    } catch {}
    setTimeout(() => {
      setIsRefreshingLogo(false);
    }, 650);
  };

  // Contagem de conversas de WhatsApp pendentes aguardando resposta para o usuário logado
  const myPendingConversationsCount = useMemo(() => {
    if (!currentUser || !leads || leads.length === 0) return 0;
    const currentUserId = currentUser.id;
    const currentUserNameLower = (currentUser.name || '').trim().toLowerCase();

    const collabIdSet = new Set((collaborators || []).map(c => c.id));
    if (currentUserId) collabIdSet.add(currentUserId);

    let count = 0;
    for (const lead of leads) {
      const isAssignedToMe =
        lead.sdrId === currentUserId ||
        lead.closerId === currentUserId ||
        (lead.assignedTo && lead.assignedTo.trim().toLowerCase() === currentUserNameLower);

      if (!isAssignedToMe) continue;

      const waitTime = getLeadPendingWaitingTime(lead, collabIdSet);
      if (waitTime > 0) {
        count++;
      }
    }
    return count;
  }, [currentUser, leads, collaborators]);

  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const venueDropdownRef = useRef<HTMLDivElement>(null);
  const [draggedFunnelId, setDraggedFunnelId] = useState<string | null>(null);
  const [dragOverFunnelId, setDragOverFunnelId] = useState<string | null>(null);

  // Popover / Flyout flutuante para setores quando o menu está recuado (isCollapsed)
  const [collapsedSectorFlyout, setCollapsedSectorFlyout] = useState<'comercial' | 'pos_venda' | 'gerencia' | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
  const flyoutCloseTimerRef = useRef<any>(null);

  // Popover flutuante para o seletor de casas de festa na barra recuada
  const [venuePopoverPos, setVenuePopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Tooltip customizado do F5 System para botões na barra recuada
  const [customTooltip, setCustomTooltip] = useState<{ text: string; top: number; left: number } | null>(null);

  // Seções recolhíveis (accordion) no menu aberto
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleSectorButtonTrigger = (e: React.MouseEvent, sector: 'comercial' | 'pos_venda' | 'gerencia') => {
    if (flyoutCloseTimerRef.current) clearTimeout(flyoutCloseTimerRef.current);
    setCustomTooltip(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutPosition({ top: Math.max(12, rect.top - 6), left: rect.right + 8 });
    setCollapsedSectorFlyout(prev => prev === sector ? null : sector);
  };

  const handleSectorFlyoutMouseEnter = () => {
    if (flyoutCloseTimerRef.current) clearTimeout(flyoutCloseTimerRef.current);
    setCustomTooltip(null);
  };

  const handleSectorFlyoutMouseLeave = () => {
    flyoutCloseTimerRef.current = setTimeout(() => {
      setCollapsedSectorFlyout(null);
    }, 220);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (collapsedSectorFlyout && !target.closest('[data-sector-flyout="true"]') && !target.closest('[data-sector-btn="true"]')) {
        setCollapsedSectorFlyout(null);
      }
      if (isVenueDropdownOpen && !target.closest('[data-venue-popover="true"]') && !target.closest('[data-venue-trigger="true"]')) {
        setIsVenueDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collapsedSectorFlyout, isVenueDropdownOpen]);

  const handleFunnelDrop = (targetFunnelId: string) => {
    if (!draggedFunnelId || draggedFunnelId === targetFunnelId) {
      setDraggedFunnelId(null);
      setDragOverFunnelId(null);
      return;
    }

    const currentOrder = [...(userPinnedFunnelIds || [])];
    const sourceIndex = currentOrder.indexOf(draggedFunnelId);
    const targetIndex = currentOrder.indexOf(targetFunnelId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      currentOrder.splice(sourceIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedFunnelId);
      reorderPinnedFunnels(currentOrder);
    }

    setDraggedFunnelId(null);
    setDragOverFunnelId(null);
  };

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

  const effectiveUser = viewingAsCollaborator || currentUser;
  const isDevUser = Boolean(effectiveUser?.isDev);
  const userRole = effectiveUser?.role || 'master';

  const effectiveSectors: ('comercial' | 'pos_venda' | 'gerencia' | 'financeiro')[] = useMemo(() => {
    if (isDevUser || userRole === 'master') {
      return ['comercial', 'pos_venda', 'gerencia', 'financeiro'];
    }
    if (effectiveUser && 'sectors' in effectiveUser && Array.isArray((effectiveUser as any).sectors) && (effectiveUser as any).sectors.length > 0) {
      return (effectiveUser as any).sectors;
    }
    if (userRole === 'admin') return ['gerencia', 'comercial', 'pos_venda'];
    if (userRole === 'pos_venda') return ['pos_venda'];
    return ['comercial'];
  }, [effectiveUser, isDevUser, userRole]);

  const activeVenue = venues.find(v => v.id === activeVenueId) || null;

  // Map each tab to its controlling feature flag (if applicable)
  const TAB_FEATURE_FLAG: Partial<Record<AdminTabType, FeatureFlagId>> = {
    'master-dashboard': 'master_dashboard',
    'dashboard': 'commercial_dashboard',
    'venue-goals': 'goals',
  };

  const devItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'dev-features', label: 'Feature Flags', icon: <Sliders size={15} />, roles: ['master'] },
    { id: 'dev-users', label: 'Gestão de Usuários', icon: <Users size={15} />, roles: ['master'] },
    { id: 'dev-announcements', label: 'Broadcast', icon: <Radio size={15} />, roles: ['master'] },
    { id: 'dev-support', label: 'Suporte', icon: <Headset size={15} />, roles: ['master'] },
  ];

  // 1. Workspace
  const workspaceItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'home', label: 'Início', icon: <Home size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer', 'pos_venda'] },
    { id: 'team', label: 'Equipe', icon: <Users size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer', 'pos_venda'] },
  ];

// WhatsApp Official Brand SVG Icon
const WhatsAppBrandIcon: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-1.781-.892-2.946-1.597-4.108-3.593-.306-.527.306-.489.876-1.629.096-.192.048-.36-.024-.51-.072-.15-.678-1.636-.93-2.242-.244-.588-.493-.509-.678-.518-.176-.008-.377-.01-.578-.01s-.527.075-.803.376c-.276.301-1.055 1.03-1.055 2.511s1.08 2.913 1.231 3.114c.151.2 2.126 3.246 5.15 4.553.719.311 1.28.497 1.718.636.723.23 1.381.198 1.901.12.58-.087 1.78-.728 2.032-1.431.252-.703.252-1.305.176-1.431-.076-.126-.276-.201-.577-.351z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.92.545 3.715 1.488 5.237L2.05 21.95l4.857-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.634 0-3.175-.483-4.472-1.314l-.321-.205-2.887.826.837-2.822-.218-.337A8.17 8.17 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z"/>
  </svg>
);

  // Ferramentas: WhatsApp Multi-Setor
  const toolsItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[]; alertBadge?: boolean }[] = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppBrandIcon size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer', 'pos_venda'] },
  ];

  // 2. Comercial: Dashboard, Funil Comercial, Leads, Follow-up, Agendamentos
  const commercialItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[]; alertBadge?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'crm', label: 'Funil Comercial', icon: <Target size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'leads', label: 'Leads', icon: <Users size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'], alertBadge: unindexedLeadsCount > 0 },
    { id: 'followups', label: 'Follow-up', icon: <PhoneCall size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer'] },
    { id: 'post-sale-visits-tastings', label: 'Agendamentos', icon: <Calendar size={15} />, roles: ['master', 'admin', 'crm', 'sdr', 'closer', 'pos_venda'] },
  ];

  // 3. Pós-Venda: Funis de Pós-Venda, Clientes, App Aniversariantes, Compromissos
  const postSaleItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { id: 'post-sale-crm', label: 'Funis de Pós-Venda', icon: <Target size={15} />, roles: ['master', 'admin', 'pos_venda'] },
    { id: 'post-sale-clients', label: 'Clientes', icon: <UserCheck size={15} />, roles: ['master', 'admin', 'pos_venda'] },
    { id: 'debutantes', label: 'App Aniversariantes', icon: <Gift size={15} />, roles: ['master', 'admin', 'pos_venda'] },
    { id: 'post-sale-appointments', label: 'Compromissos', icon: <CheckSquare size={15} />, roles: ['master', 'admin', 'pos_venda'] },
  ];

  // 4. Gerência: Tarefas, Qualificação ICP, Origens, Metas, Dashboard Gerência, Colaboradores, Casas de Festa
  const masterItems: { id: AdminTabType; label: string; icon: React.ReactNode; roles: string[]; alertBadge?: boolean }[] = [
    { id: 'tasks', label: 'Tarefas', icon: <CheckSquare size={15} />, roles: ['master', 'admin'] },
    { id: 'mql', label: 'Qualificação', icon: <IcpTargetUserIcon size={15} />, roles: ['master', 'admin'] },
    { id: 'sources', label: 'Origens', icon: <Compass size={15} />, roles: ['master', 'admin'], alertBadge: hasUnconfiguredSources },
    { id: 'venue-goals', label: 'Metas', icon: <Star size={15} />, roles: ['master', 'admin'] },
    { id: 'master-dashboard', label: 'Dashboard Gerência', icon: <LayoutDashboard size={15} />, roles: ['master', 'admin'] },
    { id: 'collaborators', label: 'Colaboradores', icon: <ShieldCheck size={15} />, roles: ['master', 'admin'] },
    { id: 'venues', label: 'Casas de Festa', icon: <Building2 size={15} />, roles: ['master', 'admin'] },
  ];

  const allowedVenues = useMemo(() => {
    if (userRole === 'master') return venues;
    const targetVenueIds = effectiveUser?.venueIds;
    if (!targetVenueIds || targetVenueIds.length === 0) {
      const singleVenueId = (effectiveUser as any)?.venueId;
      if (singleVenueId && singleVenueId !== 'all') {
        return venues.filter(v => v.id === singleVenueId);
      }
      return venues;
    }
    return venues.filter(v => targetVenueIds.includes(v.id));
  }, [venues, effectiveUser, userRole]);


  const isPostSaleFunnel = useCallback((f: CommercialFunnel) => Boolean(
    f.isPostSale || 
    f.category === 'Pós-Venda' || 
    f.category === 'pos_venda' ||
    f.name?.toLowerCase().includes('pós-venda') || 
    f.name?.toLowerCase().includes('pos venda') || 
    f.name?.toLowerCase().includes('sucesso')
  ), []);

  const visiblePinnedFunnels = useMemo(() => {
    // No modo "Ver como...", nada fica fixado para evitar confusão ou inconsistência visual
    if (viewingAsCollaborator) return [];

    const pinnedIds = userPinnedFunnelIds || [];
    const filtered = funnels.filter(funnel => {
      return pinnedIds.includes(funnel.id);
    });
    return filtered.sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
  }, [funnels, userPinnedFunnelIds, viewingAsCollaborator]);

  const pinnedCommercialFunnels = useMemo(() => {
    if (!effectiveSectors.includes('comercial')) return [];
    return visiblePinnedFunnels.filter(f => !isPostSaleFunnel(f));
  }, [visiblePinnedFunnels, effectiveSectors, isPostSaleFunnel]);

  const pinnedPostSaleFunnels = useMemo(() => {
    if (!effectiveSectors.includes('pos_venda')) return [];
    return visiblePinnedFunnels.filter(f => isPostSaleFunnel(f));
  }, [visiblePinnedFunnels, effectiveSectors, isPostSaleFunnel]);

  const renderSidebarFunnelIcon = (iconName?: string, size = 15, color = '#D4AF37') => {
    return renderFunnelOrStageIcon(iconName, size, color, 'target');
  };

  const renderPinnedFunnelButton = (f: CommercialFunnel) => {
    const isPostSale = isPostSaleFunnel(f);
    const targetTab: AdminTabType = isPostSale ? 'post-sale-crm' : 'crm';
    const isFunnelActive = activeTab === targetTab && activeFunnelId === f.id;
    const funnelColor = isPostSale ? '#06B6D4' : (f.badgeColor || '#D4AF37');
    
    if (isCollapsed && !isMobileOverlay) {
      return (
        <button
          key={`pinned-${f.id}`}
          type="button"
          onClick={() => handleTabClick(targetTab, f.id)}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCustomTooltip({
              text: f.name,
              top: rect.top + (rect.height / 2),
              left: rect.right + 10,
            });
          }}
          onMouseLeave={() => setCustomTooltip(null)}
          style={{
            width: '38px',
            height: '38px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            background: isFunnelActive ? `${funnelColor}22` : 'transparent',
            border: isFunnelActive ? `1.5px solid ${funnelColor}` : '1px solid transparent',
            color: isFunnelActive ? funnelColor : '#8096A8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          {renderSidebarFunnelIcon(f.icon, 15, isFunnelActive ? funnelColor : (f.badgeColor || '#8096A8'))}
          {isFunnelActive && (
            <span style={{
              position: 'absolute',
              right: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '14px',
              borderRadius: '2px',
              background: funnelColor,
              boxShadow: `0 0 8px ${funnelColor}AA`,
            }} />
          )}
        </button>
      );
    }

    const isDraggingThis = draggedFunnelId === f.id;
    const isDragOverThis = dragOverFunnelId === f.id;
    const displayTitle = f.name.length > 14 ? f.name.split(' ')[0] : f.name;

    return (
      <button
        key={`pinned-${f.id}`}
        type="button"
        draggable={!isCollapsed}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', f.id);
          setDraggedFunnelId(f.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverFunnelId !== f.id) setDragOverFunnelId(f.id);
        }}
        onDragLeave={() => {
          if (dragOverFunnelId === f.id) setDragOverFunnelId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFunnelDrop(f.id);
        }}
        onDragEnd={() => {
          setDraggedFunnelId(null);
          setDragOverFunnelId(null);
        }}
        onClick={() => handleTabClick(targetTab, f.id)}
        title={`${isPostSale ? 'Pós-Venda' : 'Comercial'}: ${f.name} (Arraste para reordenar)`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 10px',
          paddingLeft: '16px',
          borderRadius: '8px',
          background: isFunnelActive ? `${funnelColor}18` : isDragOverThis ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
          border: isFunnelActive ? `1px solid ${funnelColor}77` : '1px solid transparent',
          borderTop: isDragOverThis ? '2px solid var(--adm-accent)' : isFunnelActive ? `1px solid ${funnelColor}77` : '1px solid transparent',
          color: isFunnelActive ? funnelColor : 'rgba(255, 255, 255, 0.75)',
          fontSize: '0.72rem',
          fontWeight: isFunnelActive ? 700 : 500,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
          opacity: isDraggingThis ? 0.35 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isFunnelActive) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#FFFFFF';
          }
        }}
        onMouseLeave={(e) => {
          if (!isFunnelActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
          }
        }}
      >
        <GripVertical size={11} style={{ opacity: 0.35, cursor: 'grab', flexShrink: 0, marginRight: '-3px' }} />
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {renderSidebarFunnelIcon(f.icon, 13, isFunnelActive ? funnelColor : (f.badgeColor || '#9E988D'))}
        </span>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayTitle}
        </span>
        <span style={{
          fontSize: '8px',
          padding: '1px 4px',
          borderRadius: '4px',
          background: isPostSale 
            ? (isFunnelActive ? 'rgba(6, 182, 212, 0.28)' : 'rgba(6, 182, 212, 0.12)')
            : (isFunnelActive ? `${funnelColor}30` : 'rgba(255, 255, 255, 0.08)'),
          color: isPostSale ? '#06B6D4' : (isFunnelActive ? funnelColor : (f.badgeColor || 'var(--adm-text-muted)')),
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.2px',
          flexShrink: 0,
        }}>
          {isPostSale ? 'PÓS' : 'FUNIL'}
        </span>
      </button>
    );
  };

  // Helper para renderizar o Popover/Flyout de funis quando a sidebar estiver colapsada (position: fixed para nunca ser cortado pelo overflow)
  const renderSectorFlyout = (sector: 'comercial' | 'pos_venda' | 'gerencia') => {
    if (!isCollapsed || isMobileOverlay || collapsedSectorFlyout !== sector || !flyoutPosition) return null;

    let title = 'Comercial';
    let accentColor = '#14A9D7';
    let items = commercialItems;

    if (sector === 'pos_venda') {
      title = 'Pós-Venda';
      accentColor = '#06B6D4';
      items = postSaleItems;
    } else if (sector === 'gerencia') {
      title = 'Gerência';
      accentColor = '#14A9D7';
      items = masterItems;
    }

    return (
      <div
        data-sector-flyout="true"
        onMouseEnter={handleSectorFlyoutMouseEnter}
        onMouseLeave={handleSectorFlyoutMouseLeave}
        style={{
          position: 'fixed',
          left: `${flyoutPosition.left}px`,
          top: `${flyoutPosition.top}px`,
          minWidth: '220px',
          maxWidth: '260px',
          background: '#141118',
          border: `1.5px solid ${accentColor}66`,
          borderRadius: '12px',
          padding: '8px',
          boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 20px ${accentColor}25`,
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{
          fontSize: '0.62rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: accentColor,
          padding: '4px 8px 6px 8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{title}</span>
        </div>

        {/* Itens do Setor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCollapsedSectorFlyout(null);
                  handleTabClick(item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: isActive ? `${accentColor}22` : 'transparent',
                  border: isActive ? `1px solid ${accentColor}88` : '1px solid transparent',
                  color: isActive ? accentColor : '#E2E8F0',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? accentColor : '#8096A8' }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCollapsedSectorButton = (sector: 'comercial' | 'pos_venda' | 'gerencia') => {
    let icon = <DollarSign size={18} />;
    let accentColor = '#14A9D7';
    let isSectorActive = false;

    // Detecta se algum funil fixado está ativo atualmente
    const isPinnedCommercialActive = activeTab === 'crm' && Boolean(activeFunnelId) && pinnedCommercialFunnels.some(f => f.id === activeFunnelId);
    const isPinnedPostSaleActive = activeTab === 'post-sale-crm' && Boolean(activeFunnelId) && pinnedPostSaleFunnels.some(f => f.id === activeFunnelId);

    if (sector === 'comercial') {
      accentColor = '#14A9D7';
      isSectorActive = !isPinnedCommercialActive && ['dashboard', 'crm', 'leads', 'followups', 'post-sale-visits-tastings'].includes(activeTab);
      // Ícone dinâmico do Comercial
      switch (activeTab) {
        case 'dashboard':
          icon = <LayoutDashboard size={18} />;
          break;
        case 'crm':
          icon = <Target size={18} />;
          break;
        case 'leads':
          icon = <Users size={18} />;
          break;
        case 'followups':
          icon = <PhoneCall size={18} />;
          break;
        case 'post-sale-visits-tastings':
          icon = <Calendar size={18} />;
          break;
        default:
          icon = <DollarSign size={18} />;
          break;
      }
    } else if (sector === 'pos_venda') {
      accentColor = '#06B6D4';
      isSectorActive = !isPinnedPostSaleActive && ['post-sale-crm', 'post-sale-clients', 'debutantes', 'post-sale-appointments'].includes(activeTab);
      // Ícone dinâmico do Pós-Venda
      switch (activeTab) {
        case 'post-sale-crm':
          icon = <Target size={18} />;
          break;
        case 'post-sale-clients':
          icon = <UserCheck size={18} />;
          break;
        case 'debutantes':
          icon = <Gift size={18} />;
          break;
        case 'post-sale-appointments':
          icon = <CheckSquare size={18} />;
          break;
        default:
          icon = <Briefcase size={18} />;
          break;
      }
    } else if (sector === 'gerencia') {
      accentColor = '#14A9D7';
      isSectorActive = ['tasks', 'mql', 'sources', 'venue-goals', 'master-dashboard', 'collaborators', 'venues'].includes(activeTab);
      // Ícone dinâmico da Gerência
      switch (activeTab) {
        case 'tasks':
          icon = <CheckSquare size={18} />;
          break;
        case 'mql':
          icon = <IcpTargetUserIcon size={18} />;
          break;
        case 'sources':
          icon = <Compass size={18} />;
          break;
        case 'venue-goals':
          icon = <Star size={18} />;
          break;
        case 'master-dashboard':
          icon = <LayoutDashboard size={18} />;
          break;
        case 'collaborators':
          icon = <ShieldCheck size={18} />;
          break;
        case 'venues':
          icon = <Building2 size={18} />;
          break;
        default:
          icon = <SlidersHorizontal size={18} />;
          break;
      }
    }

    const isFlyoutOpen = collapsedSectorFlyout === sector;

    return (
      <div 
        key={`collapsed-sector-${sector}`}
        style={{ position: 'relative', width: '100%' }}
      >
        <button
          data-sector-btn="true"
          type="button"
          onClick={(e) => handleSectorButtonTrigger(e, sector)}
          onMouseEnter={(e) => {
            handleSectorButtonTrigger(e, sector);
            if (!isSectorActive && !isFlyoutOpen) {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            handleSectorFlyoutMouseLeave();
            if (!isSectorActive && !isFlyoutOpen) {
              e.currentTarget.style.color = '#8096A8';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
          style={{
            width: '38px',
            height: '38px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            background: isSectorActive || isFlyoutOpen ? `${accentColor}22` : 'transparent',
            border: isSectorActive || isFlyoutOpen ? `1.5px solid ${accentColor}` : '1px solid transparent',
            color: isSectorActive || isFlyoutOpen ? accentColor : '#8096A8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          {icon}
          {isSectorActive && (
            <span style={{
              position: 'absolute',
              right: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '14px',
              borderRadius: '2px',
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}AA`,
            }} />
          )}
        </button>
      </div>
    );
  };

  // Helper para renderizar o cabeçalho recolhível (accordion) no menu aberto
  const renderSectionHeader = (title: string, sectionKey: string) => {
    const isSectionCollapsed = Boolean(collapsedSections[sectionKey]);
    return (
      <div 
        onClick={() => toggleSection(sectionKey)}
        title={isSectionCollapsed ? `Expandir ${title}` : `Recolher ${title}`}
        style={{
          fontSize: '0.58rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          color: '#14A9D7',
          letterSpacing: '0.6px',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          marginBottom: '2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(20, 169, 215, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span>{title}</span>
        <ChevronDown 
          size={12} 
          color="#14A9D7" 
          style={{ 
            transform: isSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.8,
          }} 
        />
      </div>
    );
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
    const isActive = (item.id === 'crm' || item.id === 'post-sale-crm')
      ? activeTab === item.id && (!activeFunnelId || activeFunnelId === null)
      : activeTab === item.id;

    // Check Feature Flag for this item (Dev account always has active access)
    const featureId = TAB_FEATURE_FLAG[item.id];
    const featureStatus = featureId ? getFeatureStatus(featureId) : 'active';

    // If disabled and not dev, hide completely
    if (featureStatus === 'disabled' && !isDevUser) {
      return null;
    }

    // Check Role & Sector Access for this item
    const itemRoles = (item as any).roles as string[] | undefined;
    if (itemRoles && !isDevUser && userRole !== 'master') {
      const hasRole = itemRoles.includes(userRole);
      const hasSectorMatch = (
        (effectiveSectors.includes('comercial') && (itemRoles.includes('crm') || itemRoles.includes('sdr') || itemRoles.includes('closer') || item.id === 'post-sale-visits-tastings')) ||
        (effectiveSectors.includes('pos_venda') && itemRoles.includes('pos_venda')) ||
        (effectiveSectors.includes('gerencia') && (itemRoles.includes('admin') || itemRoles.includes('master')))
      );
      if (!hasRole && !hasSectorMatch) {
        return null;
      }
    }

    const isComingSoon = featureStatus === 'coming_soon' && !isDevUser;
    const isDev = item.id.startsWith('dev-');

    if (isCollapsed && !isMobileOverlay) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleTabClick(item.id, null)}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCustomTooltip({
              text: isComingSoon ? `${item.label} (Em Breve)` : item.label,
              top: rect.top + (rect.height / 2),
              left: rect.right + 10,
            });
          }}
          onMouseLeave={() => setCustomTooltip(null)}
          style={{
            width: '38px',
            height: '38px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            background: isDev
              ? (isActive ? 'rgba(20, 169, 215, 0.35)' : 'rgba(20, 169, 215, 0.12)')
              : (isActive ? 'rgba(20, 169, 215, 0.18)' : 'transparent'),
            border: isDev
              ? (isActive ? '1.5px solid #38BDF8' : '1px solid rgba(20, 169, 215, 0.3)')
              : (isActive ? '1px solid #14A9D7' : '1px solid transparent'),
            color: isDev ? (isActive ? '#38BDF8' : '#7DD3FC') : (isActive ? '#14A9D7' : '#8096A8'),
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            boxShadow: isDev && isActive ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
          }}
        >
          {item.icon}
          {isComingSoon && (
            <span style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#14A9D7',
              boxShadow: '0 0 6px rgba(20, 169, 215, 0.8)',
            }} />
          )}
          {item.id === 'leads' && unindexedLeadsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#F59E0B',
              boxShadow: '0 0 6px rgba(245, 158, 11, 0.9)',
            }} />
          )}
          {item.id === 'whatsapp' && myPendingConversationsCount > 0 && (
            <span
              title={`${myPendingConversationsCount} conversa(s) pendente(s) aguardando sua resposta`}
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                borderRadius: '9999px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.60rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                border: '1.5px solid #1E293B',
                lineHeight: 1,
                zIndex: 2,
              }}
            >
              {myPendingConversationsCount > 99 ? '99+' : myPendingConversationsCount}
            </span>
          )}
          {isActive && (
            <span style={{
              position: 'absolute',
              right: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '14px',
              borderRadius: '2px',
              background: isDev ? '#38BDF8' : '#14A9D7',
              boxShadow: isDev ? '0 0 10px rgba(56, 189, 248, 0.9)' : '0 0 8px rgba(20, 169, 215, 0.8)',
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
          gap: '8px',
          padding: isSubItem ? '5px 8px 5px 12px' : '6px 8px',
          borderRadius: '8px',
          background: isDev 
            ? (isActive ? 'rgba(20, 169, 215, 0.30)' : 'rgba(20, 169, 215, 0.08)')
            : (isActive ? 'rgba(20, 169, 215, 0.14)' : 'transparent'),
          border: isDev
            ? (isActive ? '1.5px solid #38BDF8' : '1px solid rgba(20, 169, 215, 0.25)')
            : (isActive ? '1px solid #14A9D7' : '1px solid transparent'),
          color: isDev
            ? (isActive ? '#38BDF8' : '#E0F2FE')
            : (isActive ? '#14A9D7' : '#FFFFFF'),
          fontWeight: (isDev || isActive) ? 700 : 500,
          fontSize: isSubItem ? '0.70rem' : '0.75rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
          boxShadow: isDev && isActive ? '0 0 12px rgba(56, 189, 248, 0.35)' : 'none',
        }}
      >
        <span style={{ color: isDev ? '#38BDF8' : (isActive ? '#14A9D7' : '#8096A8'), display: 'flex', flexShrink: 0 }}>
          {item.icon}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
          {isComingSoon && (
            <span style={{
              fontSize: '0.48rem',
              fontWeight: 800,
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(20, 169, 215, 0.18)',
              color: '#14A9D7',
              border: '1px solid rgba(20, 169, 215, 0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
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
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={13} />
            </span>
          )}
          {item.id === 'leads' && unindexedLeadsCount > 0 && (
            <span
              title={`${unindexedLeadsCount} lead(s) desindexados (sem funil)!`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 5px',
                borderRadius: '5px',
                background: 'rgba(245, 158, 11, 0.18)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#F59E0B',
                fontSize: '0.62rem',
                fontWeight: 800,
                flexShrink: 0,
                animation: 'pulse 2s infinite ease-in-out',
              }}
            >
              <AlertTriangle size={11} />
              {unindexedLeadsCount}
            </span>
          )}
          {item.id === 'whatsapp' && myPendingConversationsCount > 0 && (
            <span
              title={`${myPendingConversationsCount} conversa(s) pendente(s) aguardando sua resposta`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                borderRadius: '9999px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: 800,
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {myPendingConversationsCount > 99 ? '99+' : myPendingConversationsCount}
            </span>
          )}
        </span>
        {isActive && <ChevronRight size={12} color="#14A9D7" style={{ flexShrink: 0 }} />}
      </button>
    );
  };

  const sidebarWidth = isMobileOverlay 
    ? '100vw' 
    : isCollapsed 
    ? '58px' 
    : '208px';

  return (
    <aside 
      className="admin-sidebar-scroll"
      style={{
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
        ? '20px 14px 30px 14px' 
        : isCollapsed 
        ? '14px 6px' 
        : '14px 8px',
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
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(20, 169, 215, 0.2)',
        marginBottom: '10px',
        position: 'relative',
      }}>
        {isCollapsed && !isMobileOverlay ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
          }}>
            {/* F5 Official Símbolo/Mark - Limpo, com Easter Egg de Refresh */}
            <div 
              title="F5 System • Atualizar tela"
              onClick={handleLogoRefresh}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src="/f5_mark.png"
                alt="F5"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain',
                  transform: isRefreshingLogo ? 'rotate(360deg)' : 'none',
                  transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>

            {/* Expand button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir Menu Lateral"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
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
              <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <>
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              minHeight: '30px',
            }}>
            {/* Centered Logo in the Middle with Easter Egg Refresh */}
            <div 
              title="F5 System • Atualizar tela"
              onClick={handleLogoRefresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src="/f5_logo.png"
                alt="F5 System"
                style={{
                  height: '24px',
                  width: 'auto',
                  maxWidth: '110px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                  transform: isRefreshingLogo ? 'rotate(360deg)' : 'none',
                  transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>

            {/* Collapse button positioned neatly on the right */}
            {!isMobileOverlay && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Recolher Menu Lateral"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  color: '#14A9D7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  zIndex: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(20, 169, 215, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>

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

      {/* Viewing As Collaborator Alert Banner (Redesenhado: Elegante, Espaçoso e Moderno) */}
      {viewingAsCollaborator && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.16) 0%, rgba(20, 169, 215, 0.05) 100%)',
          border: '1px solid rgba(20, 169, 215, 0.40)',
          borderRadius: '12px',
          padding: isCollapsed ? '8px 4px' : '10px 12px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: isCollapsed ? '6px' : '8px',
          boxShadow: '0 4px 16px rgba(20, 169, 215, 0.12)',
        }}>
          {isCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setViewingAsCollaborator(null)}
                title={`Modo de Visualização: ${viewingAsCollaborator.name}. Clique para sair.`}
                style={{
                  background: '#14A9D7',
                  color: '#080C14',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* Top row: Label badge and Sair button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#14A9D7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <Eye size={12} />
                  <span>Modo de Visualização</span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingAsCollaborator(null)}
                  title="Sair do Modo de Visualização e voltar à sua visão nativa"
                  style={{
                    background: 'rgba(20, 169, 215, 0.18)',
                    color: '#38BDF8',
                    border: '1px solid rgba(20, 169, 215, 0.35)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#14A9D7';
                    e.currentTarget.style.color = '#080C14';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(20, 169, 215, 0.18)';
                    e.currentTarget.style.color = '#38BDF8';
                  }}
                >
                  <RotateCcw size={11} />
                  <span>Sair</span>
                </button>
              </div>

              {/* Collab Info: Name and Role */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                }}>
                  {viewingAsCollaborator.name}
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: '#94A3B8',
                  marginTop: '2px',
                }}>
                  {ROLE_LABELS[viewingAsCollaborator.role] || viewingAsCollaborator.role}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Luxury Custom Venue Switcher Popover with Logos & Globo */}
      {!currentUser?.isFirstAccess && allowedVenues.length > 0 && (
        <div ref={venueDropdownRef} style={{ position: 'relative', marginBottom: '10px' }}>
          {/* Se o colaborador possui apenas 1 casa, exibe a logo e nome da unidade com orgulho, SEM dropdown e sem seta */}
          {(userRole !== 'master' && allowedVenues.length === 1) ? (
            <div
              title={`Sua Unidade Oficial: ${allowedVenues[0].name}`}
              style={{
                width: '100%',
                background: '#141118',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '10px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              {renderVenueIconBadge(allowedVenues[0], 26)}
              {!isCollapsed && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.52rem', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Sua Unidade
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {allowedVenues[0].name}
                  </div>
                </div>
              )}
            </div>
          ) : isCollapsed && !isMobileOverlay ? (
            <button
              data-venue-trigger="true"
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setVenuePopoverPos({ top: rect.top, left: rect.right + 8 });
                setIsVenueDropdownOpen(v => !v);
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setVenuePopoverPos({ top: rect.top, left: rect.right + 8 });
                setCustomTooltip(null);
                e.currentTarget.style.borderColor = '#D4AF37';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isVenueDropdownOpen ? '#D4AF37' : 'rgba(20, 169, 215, 0.35)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                width: '38px',
                height: '38px',
                margin: '0 auto',
                background: isVenueDropdownOpen ? 'rgba(212, 175, 55, 0.16)' : '#141118',
                border: isVenueDropdownOpen ? '1.5px solid #D4AF37' : '1px solid rgba(20, 169, 215, 0.35)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {activeVenue ? renderVenueIconBadge(activeVenue, 28) : <Globe size={18} color="#D4AF37" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsVenueDropdownOpen(v => !v)}
              style={{
                width: '100%',
                background: isVenueDropdownOpen ? 'rgba(212, 175, 55, 0.14)' : '#141118',
                border: `1px solid ${isVenueDropdownOpen ? '#D4AF37' : 'rgba(212, 175, 55, 0.25)'}`,
                borderRadius: '10px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                {renderVenueIconBadge(activeVenue, 24)}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.52rem', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Unidade
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {activeVenue?.name || (userRole === 'master' ? 'Rede Geral' : `Visão Geral (${allowedVenues.length})`)}
                  </div>
                </div>
              </div>
              <ChevronDown 
                size={12} 
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
          {isVenueDropdownOpen && (userRole === 'master' || allowedVenues.length > 1) && (
            <div 
              data-venue-popover="true"
              style={{
                position: isCollapsed ? 'fixed' : 'absolute',
                top: isCollapsed ? `${venuePopoverPos?.top ?? 60}px` : '100%',
                left: isCollapsed ? `${venuePopoverPos?.left ?? 64}px` : 0,
                right: isCollapsed ? undefined : 0,
                width: isCollapsed ? '230px' : undefined,
                marginTop: isCollapsed ? '0px' : '6px',
                background: '#141118',
                border: '1.5px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.85), 0 0 20px rgba(212, 175, 55, 0.2)',
                zIndex: 999999,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {(userRole === 'master' || allowedVenues.length > 1) && (
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
                  <span>{userRole === 'master' ? 'Todas as Unidades (Rede Geral)' : `Visão Geral (${allowedVenues.length} Unidades)`}</span>
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

      {/* Se não há casas de festa registradas para esta conta Master/Dev, foca exclusivamente no registro da 1ª casa */}
      {(venues.length === 0 && userRole === 'master') ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {isDevUser && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.75) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '12px',
              padding: isCollapsed ? '6px 2px' : '8px 6px',
              boxShadow: '0 4px 18px rgba(14, 165, 233, 0.15)',
            }}>
              {!isCollapsed && (
                <div style={{
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#38BDF8',
                  letterSpacing: '0.8px',
                  padding: '0 6px 6px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                  marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sliders size={12} color="#38BDF8" />
                    <span>Desenvolvedor & Suporte</span>
                  </div>
                  <span style={{
                    fontSize: '0.48rem',
                    background: 'rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    boxShadow: '0 0 8px rgba(56, 189, 248, 0.3)',
                  }}>
                    ROOT
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {devItems.map(item => renderNavButton(item))}
              </div>
            </div>
          )}

          <div style={{
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '12px',
            padding: isCollapsed ? '8px 4px' : '12px',
            textAlign: 'center',
          }}>
            <Building2 size={22} color="#D4AF37" style={{ margin: '0 auto 4px auto' }} />
            {!isCollapsed && (
              <>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                  1ª Casa de Festas
                </div>
                <div style={{ fontSize: '0.68rem', color: '#D3E0EA', lineHeight: 1.35 }}>
                  Cadastre sua primeira unidade para liberar o CRM e a equipe.
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {renderNavButton({
              id: 'venues',
              label: 'Cadastrar Unidade',
              icon: <Building2 size={17} />,
            })}
          </div>
        </div>
      ) : currentUser?.isFirstAccess ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          textAlign: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
          }}>
            <Sparkles size={22} />
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
            Primeiro Acesso
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8096A8', lineHeight: 1.45 }}>
            O menu será liberado assim que você concluir o cadastro do seu perfil.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isCollapsed ? '8px' : '10px',
          flex: 1,
        }}>
          {/* 0. Exclusive Developer Group: Destaque no Topo com Estilo Tech-Blue */}
          {isDevUser && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.75) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '12px',
              padding: isCollapsed ? '6px 2px' : '8px 6px',
              marginBottom: '4px',
              boxShadow: '0 4px 18px rgba(14, 165, 233, 0.15)',
            }}>
              {!isCollapsed && (
                <div style={{
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#38BDF8',
                  letterSpacing: '0.8px',
                  padding: '0 6px 6px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                  marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sliders size={12} color="#38BDF8" />
                    <span>Desenvolvedor & Suporte</span>
                  </div>
                  <span style={{
                    fontSize: '0.48rem',
                    background: 'rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    boxShadow: '0 0 8px rgba(56, 189, 248, 0.3)',
                  }}>
                    ROOT
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {devItems.map(item => renderNavButton(item))}
              </div>
            </div>
          )}

          {/* 1. Setor Workspace: Início, Tarefas, Equipe */}
          <div>
            {!isCollapsed && renderSectionHeader('Workspace', 'workspace')}
            {(!isCollapsed ? !collapsedSections['workspace'] : true) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {workspaceItems.map(item => renderNavButton(item))}
              </div>
            )}
          </div>

          {isCollapsed && <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '3px 4px' }} />}

          {/* Ferramentas: WhatsApp */}
          <div>
            {!isCollapsed && renderSectionHeader('Ferramentas', 'tools')}
            {(!isCollapsed ? !collapsedSections['tools'] : true) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {toolsItems.map(item => renderNavButton(item))}
              </div>
            )}
          </div>

          {isCollapsed && <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '3px 4px' }} />}

          {/* 2. Setor Comercial: Dashboard, Funil Comercial, Leads, Follow-up, Agendamentos */}
          {effectiveSectors.includes('comercial') && (
            isCollapsed && !isMobileOverlay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                {renderCollapsedSectorButton('comercial')}
                {pinnedCommercialFunnels.map(f => renderPinnedFunnelButton(f))}
              </div>
            ) : (
              <div>
                {renderSectionHeader('Comercial', 'comercial')}
                {!collapsedSections['comercial'] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {commercialItems.map(item => {
                      if (item.id === 'crm') {
                        const btn = renderNavButton(item);
                        return (
                          <React.Fragment key={item.id}>
                            {btn}
                            {pinnedCommercialFunnels.map(f => renderPinnedFunnelButton(f))}
                          </React.Fragment>
                        );
                      }
                      return renderNavButton(item);
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {isCollapsed && effectiveSectors.includes('comercial') && <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '3px 4px' }} />}

          {/* 3. Setor Pós-Venda: Funis de Pós-Venda, Clientes, App Aniversariantes, Compromissos */}
          {effectiveSectors.includes('pos_venda') && (
            isCollapsed && !isMobileOverlay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                {renderCollapsedSectorButton('pos_venda')}
                {pinnedPostSaleFunnels.map(f => renderPinnedFunnelButton(f))}
              </div>
            ) : (
              <div>
                {renderSectionHeader('Pós-Venda', 'pos_venda')}
                {!collapsedSections['pos_venda'] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {postSaleItems.map(item => {
                      if (item.id === 'post-sale-crm') {
                        const btn = renderNavButton(item);
                        return (
                          <React.Fragment key={item.id}>
                            {btn}
                            {pinnedPostSaleFunnels.map(f => renderPinnedFunnelButton(f))}
                          </React.Fragment>
                        );
                      }
                      return renderNavButton(item);
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {isCollapsed && effectiveSectors.includes('pos_venda') && <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '3px 4px' }} />}

          {/* 4. Gerência: Tarefas, Qualificação, Origens, Metas, Dashboard Gerência, Colaboradores, Casas de Festa */}
          {(isDevUser || userRole === 'master' || effectiveSectors.includes('gerencia')) && (
            isCollapsed && !isMobileOverlay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                {renderCollapsedSectorButton('gerencia')}
              </div>
            ) : (
              <div>
                {renderSectionHeader('Gerência', 'gerencia')}
                {!collapsedSections['gerencia'] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {masterItems.map(item => renderNavButton(item))}
                  </div>
                )}
              </div>
            )
          )}

          {/* 5. Setor Financeiro: Preparado */}
          {!isCollapsed && (
            <div>
              <div style={{
                fontSize: '0.56rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#8096A8',
                letterSpacing: '0.6px',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>Financeiro</span>
                <span style={{ fontSize: '0.48rem', background: 'rgba(148, 163, 184, 0.12)', color: 'var(--adm-text-muted)', padding: '1px 4px', borderRadius: '3px' }}>
                  Em Breve
                </span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Flyout Flutuante Fora do Scroll da Sidebar */}
      {isCollapsed && !isMobileOverlay && collapsedSectorFlyout && renderSectorFlyout(collapsedSectorFlyout)}

      {/* Tooltip Elegante Customizado do F5 System */}
      {isCollapsed && !isMobileOverlay && customTooltip && !collapsedSectorFlyout && !isVenueDropdownOpen && (
        <div style={{
          position: 'fixed',
          top: `${customTooltip.top}px`,
          left: `${customTooltip.left}px`,
          transform: 'translateY(-50%)',
          background: '#141118',
          border: '1px solid rgba(20, 169, 215, 0.45)',
          borderRadius: '7px',
          padding: '5px 10px',
          color: '#FFFFFF',
          fontSize: '0.72rem',
          fontWeight: 700,
          fontFamily: "'Poppins', sans-serif",
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,0.85), 0 0 12px rgba(20, 169, 215, 0.25)',
          zIndex: 9999999,
          pointerEvents: 'none',
        }}>
          {customTooltip.text}
        </div>
      )}
    </aside>
  );
};
