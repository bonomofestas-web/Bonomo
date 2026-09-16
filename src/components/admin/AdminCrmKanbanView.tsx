import React, { useState, useEffect, useMemo } from 'react';
import { 
  Kanban, List, Search, Building2,
  Inbox, Clock, Calendar, DollarSign, XCircle,
  ChevronDown, Plus, Layers,
  Users, ArrowRight, X,
  Crown, Megaphone, Handshake, Sparkles, Target,
  Settings, Lock, Pin,
  Flame, Zap, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Gift, FileText,
  Compass, ShieldCheck, Star, ShoppingBag, Music, Camera,
  UserPlus, Eye, PartyPopper, Award, HelpCircle, AlertTriangle
} from 'lucide-react';
import { AdminNewLeadModal } from './AdminNewLeadModal';
import { AdminFunnelSettingsView } from './AdminFunnelSettingsView';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import type { FilterState } from './AdminFilterBar';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { CloseDealValueModal } from './CloseDealValueModal';
import { AdminLostReasonModal } from './AdminLostReasonModal';
import { AdminLeadMissingFieldsModal } from './AdminLeadMissingFieldsModal';
import { formatPhone } from '../../utils/phoneFormatter';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import type { Lead, CrmStage, CommercialFunnel, FunnelStageConfig } from '../../types/admin';

interface AdminCrmKanbanViewProps {
  initialLeadId?: string;
  activeFunnelId?: string | null;
  onSelectFunnel?: (funnelId: string | null) => void;
  onLeadOpened?: () => void;
  isPostSaleView?: boolean;
}

const DEFAULT_FORM_STAGES: FunnelStageConfig[] = [
  { id: 'new_lead', name: 'NOVO LEAD', color: '#EF4444', isFixed: true, order: 0 },
  { id: 'in_negotiation', name: 'EM NEGOCIAÇÃO', color: '#3B82F6', order: 1 },
  { id: 'scheduled', name: 'AGENDADO', color: '#EAB308', order: 2 },
  { id: 'decision', name: 'EM ANÁLISE / DEGUSTAÇÃO', color: '#F97316', order: 3 },
  { id: 'deal_closed', name: 'GANHO', color: '#10B981', isFixed: true, isWon: true, order: 4 },
  { id: 'lost', name: 'PERDIDO', color: '#EF4444', isFixed: true, isLoss: true, order: 5 },
];

const DEFAULT_POST_SALE_FORM_STAGES: FunnelStageConfig[] = [
  { id: 'onboarding', name: 'NOVO CLIENTE', color: '#EF4444', isFixed: true, order: 0 },
  { id: 'in_negotiation', name: 'EM ATENDIMENTO', color: '#3B82F6', order: 1 },
  { id: 'scheduled', name: 'AGENDADO', color: '#EAB308', order: 2 },
  { id: 'decision', name: 'DEGUSTAÇÃO / VISITA', color: '#F97316', order: 3 },
  { id: 'deal_closed', name: 'FINALIZADO', color: '#10B981', isFixed: true, isWon: true, order: 4 },
  { id: 'lost', name: 'CANCELADO', color: '#EF4444', isFixed: true, isLoss: true, order: 5 },
];

export const AdminCrmKanbanView: React.FC<AdminCrmKanbanViewProps> = ({
  initialLeadId,
  activeFunnelId,
  onSelectFunnel,
  onLeadOpened,
  isPostSaleView = false,
}) => {
  const { 
    leads, 
    venues,
    collaborators,
    currentUser,
    activeVenueId,
    funnels,
    tasks,
    addFunnel,
    updateFunnel,
    updateLeadStage,
    rejectLead,
    closeLeadSaleWithValue,
    mqlQuestions,
    allSources,
  } = useAdminState();

  const getLinkedVenuesForFunnel = (targetFunnel: CommercialFunnel) => {
    const venueIdSet = new Set<string>();
    if (targetFunnel.venueId && targetFunnel.venueId !== 'all') venueIdSet.add(targetFunnel.venueId);
    const funnelAny = targetFunnel as unknown as { venueIds?: string[] };
    if (funnelAny.venueIds && Array.isArray(funnelAny.venueIds)) {
      funnelAny.venueIds.forEach((id: string) => { if (id !== 'all') venueIdSet.add(id); });
    }
    // Origens conectadas a este funil
    (allSources || []).filter(s => s.funnelId === targetFunnel.id).forEach(s => {
      if (s.venueId && s.venueId !== 'all') venueIdSet.add(s.venueId);
    });
    return venues.filter(v => venueIdSet.has(v.id));
  };

  const hasIcpConfigured = (targetLead: Lead) => {
    if (!mqlQuestions || mqlQuestions.length === 0) return false;
    return mqlQuestions.some(q =>
      (targetLead.funnelId && ((q.funnelIds && q.funnelIds.includes(targetLead.funnelId)) || q.funnelId === targetLead.funnelId)) ||
      (q.venueIds && q.venueIds.length > 0 && q.venueIds.includes(targetLead.venueId)) ||
      q.venueId === targetLead.venueId ||
      q.venueId === 'all'
    );
  };

  const renderLeadOriginBadge = (lead: Lead) => {
    // Se tiver sub-origem mapeada (ex: WhatsApp / Instagram)
    if (lead.subSource) {
      return (
        <span
          title={`Origem: ${lead.sourceName || 'WhatsApp'} • Sub-origem: ${lead.subSource}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10B981',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <PhoneCall size={10} style={{ flexShrink: 0 }} />
          <span>WhatsApp / {lead.subSource}</span>
        </span>
      );
    }

    // Se for do WhatsApp (direto sem sub-origem)
    if ((lead.source as string) === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) {
      return (
        <span
          title="Origem: WhatsApp"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10B981',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <PhoneCall size={10} style={{ flexShrink: 0 }} />
          <span>WhatsApp</span>
        </span>
      );
    }

    // Se for do Instagram
    if ((lead.source as string) === 'instagram' || lead.sourceName?.toLowerCase().includes('instagram')) {
      return (
        <span
          title="Origem: Instagram"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'rgba(236, 72, 153, 0.12)',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            color: '#EC4899',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Camera size={10} style={{ flexShrink: 0 }} />
          <span>Instagram</span>
        </span>
      );
    }

    // Se for de Formulário
    if ((lead.source as string) === 'form' || lead.sourceName?.toLowerCase().includes('formulário') || lead.sourceName?.toLowerCase().includes('form')) {
      return (
        <span
          title={`Origem: ${lead.sourceName || 'Formulário'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            color: '#60A5FA',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <FileText size={10} style={{ flexShrink: 0 }} />
          <span>Formulário</span>
        </span>
      );
    }

    // Se for de Indicação
    if (lead.source === 'indicacao' || (lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto')) {
      return (
        <span
          title={`Indicada por: ${lead.debutanteName}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'var(--adm-accent-bg)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            color: 'var(--adm-accent)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Gift size={10} style={{ flexShrink: 0 }} />
          <span>Indicação</span>
        </span>
      );
    }

    // Se for Tráfego Pago
    if (lead.source === 'trafego_pago') {
      return (
        <span
          title="Origem: Tráfego Pago"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '8px',
            fontSize: '0.64rem',
            fontWeight: 800,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#F59E0B',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Target size={10} style={{ flexShrink: 0 }} />
          <span>Tráfego Pago</span>
        </span>
      );
    }

    // Fallback
    const displaySource = lead.sourceName || lead.source || 'Direto';
    return (
      <span
        title={`Origem: ${displaySource}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 7px',
          borderRadius: '8px',
          fontSize: '0.64rem',
          fontWeight: 800,
          background: 'rgba(148, 163, 184, 0.12)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          color: '#94A3B8',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Compass size={10} style={{ flexShrink: 0 }} />
        <span>{displaySource}</span>
      </span>
    );
  };

  const formatLeadDisplayDate = (lead: Lead) => {
    const rawDate = lead.eventDate || lead.partyDate || lead.funnelEnteredAt || lead.createdAt;
    if (!rawDate) return '11/09/2026';
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '11/09/2026';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderAssigneeAvatar = (
    collab: typeof collaborators[0] | null | undefined,
    fallbackName: string,
    roleTag: 'SDR' | 'Closer' | 'Resp',
    accentColor: string,
    zIndex = 1,
    isStacked = false
  ) => {
    const name = collab?.name || fallbackName;
    const rawAvatarUrl = collab?.avatarUrl || (currentUser && (currentUser.id === collab?.id || currentUser.name === name) ? currentUser.avatarUrl : undefined);
    const photoSrc = (rawAvatarUrl && !rawAvatarUrl.includes('unsplash.com'))
      ? rawAvatarUrl
      : createMonogramAvatar(name);

    return (
      <div
        key={`${roleTag}-${name}`}
        title={`${roleTag}: ${name}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginLeft: isStacked ? '-8px' : '0px',
          zIndex,
          transition: 'transform 0.15s ease, z-index 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
          e.currentTarget.style.zIndex = '10';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.zIndex = String(zIndex);
        }}
      >
        <img
          src={photoSrc}
          alt={name}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `1.5px solid ${accentColor}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
            display: 'block',
            background: 'var(--adm-bg-card, #ffffff)',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = createMonogramAvatar(name);
          }}
        />
      </div>
    );
  };

  // Active Funnel selection: null = Hub de Funis (Cards), or 'indicacao', 'trafego', etc.
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(() => {
    if (activeFunnelId !== undefined) return activeFunnelId;
    if (initialLeadId) return 'indicacao';
    if (isPostSaleView) return 'post_sale_default';
    return null;
  });
  const [funnelSearch, setFunnelSearch] = useState('');

  // Como CRM Funnel Settings Modal
  const [isComoFunnelSettingsOpen, setIsComoFunnelSettingsOpen] = useState(false);
  const [comoFunnelId, setComoFunnelId] = useState<string | undefined>(undefined);

  // View mode inside funnel
  const [viewMode, setViewMode] = useState<'workspace' | 'kanban' | 'list'>(initialLeadId ? 'workspace' : 'kanban');
  const [search, setSearch] = useState('');
  const [activeLeadIdForWorkspace, setActiveLeadIdForWorkspace] = useState<string | null>(initialLeadId || null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeHintStageId, setActiveHintStageId] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    debutanteId: 'all',
    sortBy: 'recent',
  });
  const [leadOwnershipFilter, setLeadOwnershipFilter] = useState<'all' | 'mine'>('all');
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState(false);

  const sortOptions = [
    { id: 'recent', label: 'Mais Recentes (Data)' },
    { id: 'oldest', label: 'Mais Antigos (Data)' },
    { id: 'name_asc', label: 'Ordem Alfabética (A-Z)' },
    { id: 'name_desc', label: 'Ordem Alfabética (Z-A)' },
  ];

  // Close Deal modal state
  const [dealModalLead, setDealModalLead] = useState<Lead | null>(null);
  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);

  // Lost Reason modal state
  const [lostReasonLead, setLostReasonLead] = useState<Lead | null>(null);
  const [isLostReasonModalOpen, setIsLostReasonModalOpen] = useState(false);

  // Missing fields for sale modal state
  const [missingFieldsLead, setMissingFieldsLead] = useState<Lead | null>(null);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [isMissingFieldsModalOpen, setIsMissingFieldsModalOpen] = useState(false);

  // Reopen negotiation confirmation modal state for Won leads
  const [reopeningLeadConfirm, setReopeningLeadConfirm] = useState<{ lead: Lead; targetStage: string } | null>(null);

  // New Lead modal state
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Check if current user is manager (Master or Admin)
  const canConfigureFunnels = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'dev';

  // Allowed venues for user
  const userAllowedVenueIds = useMemo(() => {
    if (!currentUser || currentUser.role === 'master') return null;
    return currentUser.venueIds && currentUser.venueIds.length > 0 ? currentUser.venueIds : [];
  }, [currentUser]);

  // Sync selected funnel with external prop
  useEffect(() => {
    if (activeFunnelId !== undefined) {
      setSelectedFunnelId(activeFunnelId);
    }
  }, [activeFunnelId]);

  useEffect(() => {
    if (initialLeadId) {
      const targetLead = leads.find(l => l.id === initialLeadId);
      const targetFunnel = funnelsList.find(f => targetLead && f.venueId === targetLead.venueId) || funnelsList[0];
      setSelectedFunnelId(targetFunnel?.id || null);
      setActiveLeadIdForWorkspace(initialLeadId);
      setViewMode('workspace');
      if (onLeadOpened) onLeadOpened();
    }
  }, [initialLeadId]);

  const handleSelectFunnel = (id: string | null) => {
    setSelectedFunnelId(id);
    if (onSelectFunnel) onSelectFunnel(id);
  };

  // Open Create Funnel in Full Content Area View
  const handleOpenCreateFunnel = (targetVenueId?: string) => {
    const newId = addFunnel({
      name: isPostSaleView ? 'Novo Funil Pós-Venda' : 'Novo Funil Comercial',
      category: isPostSaleView ? 'Pós-Venda' : 'Vendas & Atendimento',
      description: '',
      venueId: targetVenueId || activeVenueId || 'all',
      isEntryStageActive: false,
      stages: isPostSaleView ? DEFAULT_POST_SALE_FORM_STAGES : DEFAULT_FORM_STAGES,
    });
    setComoFunnelId(newId);
    setIsComoFunnelSettingsOpen(true);
  };

  // Open Funnel Configuration in Full Content Area View
  const handleOpenConfigureFunnel = (funnel: CommercialFunnel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setComoFunnelId(funnel.id);
    setIsComoFunnelSettingsOpen(true);
  };

  // Computed Funnels List based on Venues, Permissions, and Real-time Leads
  const funnelsList = useMemo(() => {
    let baseFunnels = funnels;
    if (isPostSaleView) {
      baseFunnels = funnels.filter(f => 
        f.isPostSale || 
        f.category === 'Pós-Venda' || 
        f.name?.toLowerCase().includes('pós-venda') || 
        f.name?.toLowerCase().includes('pos venda') ||
        f.name?.toLowerCase().includes('cliente')
      );
      if (baseFunnels.length === 0) {
        const targetVenues = (activeVenueId && activeVenueId !== 'all')
          ? venues.filter(v => v.id === activeVenueId)
          : venues;
        baseFunnels = targetVenues.map(v => ({
          id: `post_sale_${v.id}`,
          name: `Funil Pós-Venda • ${v.name}`,
          category: 'Pós-Venda',
          description: `Gestão de clientes, onboarding, visitas técnicas e degustações de ${v.name}`,
          venueId: v.id,
          icon: 'shield',
          badgeColor: '#06B6D4',
          isFixed: false,
          isPostSale: true,
          allowedRoles: ['pos_venda', 'master', 'admin'],
          stages: DEFAULT_POST_SALE_FORM_STAGES,
          order: 0,
        }));
      }
    } else {
      baseFunnels = funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda');
    }

    return baseFunnels.filter(funnel => {
      // 1. Collaborator Access Restriction (Managers/Master can see all; regular SDRs/Closers see only allowed)
      if (!canConfigureFunnels && funnel.allowedCollaboratorIds && funnel.allowedCollaboratorIds.length > 0 && currentUser?.id) {
        if (!funnel.allowedCollaboratorIds.includes(currentUser.id)) return false;
      }

      return true;
    }).map(funnel => {
      // Calculate dynamic metrics per funnel strictly for this funnel (filtered by activeVenueId if set)
      const funnelLeads = leads.filter(l => {
        const matchesFunnel = l.funnelId ? l.funnelId === funnel.id : funnel.isPrimary;
        if (!matchesFunnel) return false;
        if (activeVenueId && activeVenueId !== 'all' && l.venueId !== activeVenueId) return false;
        return true;
      });

      const referralTotalRevenue = funnelLeads
        .filter(l => {
          const s = l.stage as string;
          return s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado';
        })
        .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

      const referralConversion = funnelLeads.length > 0
        ? Math.round((funnelLeads.filter(l => {
            const s = l.stage as string;
            return s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado';
          }).length / funnelLeads.length) * 100)
        : 0;

      const venue = venues.find(v => v.id === funnel.venueId);

      return {
        ...funnel,
        venueName: funnel.venueId === 'all' ? 'Todas as Casas' : (venue?.name || 'Geral'),
        venueLogo: venue?.logoUrl,
        venueBallroom: venue?.ballroomImageUrl,
        venueAddress: venue?.address,
        leadCount: funnelLeads.length,
        openPipelineValue: referralTotalRevenue || 0,
        conversionRate: referralConversion || 0,
        buttonText: 'Acessar Funil',
      };
    });
  }, [funnels, leads, venues, activeVenueId, userAllowedVenueIds, canConfigureFunnels, currentUser, isPostSaleView]);

  useEffect(() => {
    if (isPostSaleView && (!selectedFunnelId || selectedFunnelId === 'indicacao' || selectedFunnelId === 'post_sale_default')) {
      if (funnelsList.length > 0) {
        setSelectedFunnelId(funnelsList[0].id);
      }
    }
  }, [isPostSaleView, selectedFunnelId, funnelsList]);

  const renderFunnelIcon = (iconName?: string, size = 16, color?: string) => {
    const iconColor = color || 'var(--adm-accent)';
    switch (iconName) {
      case 'crown': return <Crown size={size} color={iconColor} />;
      case 'megaphone': return <Megaphone size={size} color={iconColor} />;
      case 'handshake': return <Handshake size={size} color={iconColor} />;
      case 'sparkles': return <Sparkles size={size} color={iconColor} />;
      case 'flame': return <Flame size={size} color={iconColor} />;
      case 'zap': return <Zap size={size} color={iconColor} />;
      case 'dollar': return <DollarSign size={size} color={iconColor} />;
      case 'rocket': return <Rocket size={size} color={iconColor} />;
      case 'heart': return <Heart size={size} color={iconColor} />;
      case 'trophy': return <Trophy size={size} color={iconColor} />;
      case 'radio': return <Radio size={size} color={iconColor} />;
      case 'phone': return <PhoneCall size={size} color={iconColor} />;
      case 'message': return <MessageSquare size={size} color={iconColor} />;
      case 'gift': return <Gift size={size} color={iconColor} />;
      case 'compass': return <Compass size={size} color={iconColor} />;
      case 'shield': return <ShieldCheck size={size} color={iconColor} />;
      case 'star': return <Star size={size} color={iconColor} />;
      case 'shop': return <ShoppingBag size={size} color={iconColor} />;
      case 'music': return <Music size={size} color={iconColor} />;
      case 'camera': return <Camera size={size} color={iconColor} />;
      default: return <Target size={size} color={iconColor} />;
    }
  };

  const renderFunnelVisual = (funnel: { icon?: string; customImageUrl?: string; badgeColor?: string; name?: string }, size = 16, containerSize = 34) => {
    if (funnel.customImageUrl) {
      return (
        <div style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          borderRadius: '10px',
          overflow: 'hidden',
          border: `1px solid ${funnel.badgeColor || '#3B82F6'}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}>
          <img src={funnel.customImageUrl} alt={funnel.name || 'Funil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }

    return (
      <div style={{
        width: `${containerSize}px`,
        height: `${containerSize}px`,
        borderRadius: '10px',
        background: `${funnel.badgeColor || '#3B82F6'}15`,
        border: `1px solid ${funnel.badgeColor || '#3B82F6'}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {renderFunnelIcon(funnel.icon || 'target', size, funnel.badgeColor || '#3B82F6')}
      </div>
    );
  };

  const currentFunnel = useMemo(() => {
    return funnelsList.find(f => f.id === selectedFunnelId) || funnelsList[0];
  }, [funnelsList, selectedFunnelId]);

  const isPostSaleFunnel = useMemo(() => {
    if (!currentFunnel) return false;
    return (
      currentFunnel.isPostSale === true ||
      currentFunnel.allowedRoles?.includes('pos_venda') ||
      currentFunnel.category === 'Pós-Venda' ||
      currentFunnel.name?.toLowerCase().includes('pós-venda') ||
      currentFunnel.name?.toLowerCase().includes('pos-venda') ||
      currentFunnel.name?.toLowerCase().includes('pós venda')
    );
  }, [currentFunnel]);

  const isReadOnlyForPosVenda = currentUser?.role === 'pos_venda' && !isPostSaleFunnel;

  const isManager = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const isLeadSpectator = (l: Lead) => {
    if (isManager) return false;
    if (isReadOnlyForPosVenda) return true;
    if (currentUser?.role === 'sdr' || currentUser?.role === 'closer') {
      const isAssigned = (l.sdrId && l.sdrId === currentUser.id) ||
                         (l.closerId && l.closerId === currentUser.id) ||
                         (l.assignedTo && l.assignedTo === currentUser.name);
      return !isAssigned;
    }
    return false;
  };

  // Filter and Sort leads strictly isolated for the selected Funnel
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // 1. Mandatory Funnel / Venue Matching:
      if (currentFunnel) {
        if (l.funnelId) {
          if (l.funnelId !== currentFunnel.id) return false;
        } else if (currentFunnel.venueId && currentFunnel.venueId !== 'all') {
          if (l.venueId !== currentFunnel.venueId) return false;
        }
      } else if (activeVenueId && activeVenueId !== 'all') {
        if (l.venueId !== activeVenueId) return false;
      }

      // Ownership Filter: Meus Leads vs Todos
      if (leadOwnershipFilter === 'mine') {
        const isMine = 
          Boolean(currentUser?.id && (l.sdrId === currentUser.id || l.closerId === currentUser.id)) ||
          Boolean(currentUser?.name && (l.sdrName === currentUser.name || l.closerName === currentUser.name || l.assignedTo === currentUser.name)) ||
          Boolean(currentUser?.id && (l.participants || []).some(p => p.collaboratorId === currentUser.id));
        if (!isMine) return false;
      }

      // 2. Debutante Filter
      if (filterState.debutanteId && filterState.debutanteId !== 'all' && l.debutanteId !== filterState.debutanteId) return false;

      // 3. Collaborator / SDR / Closer Filter
      if (filterState.collaboratorId !== 'all') {
        const matchesCollab = l.sdrId === filterState.collaboratorId || 
          l.closerId === filterState.collaboratorId || 
          (l.participants || []).some(p => p.collaboratorId === filterState.collaboratorId);
        if (!matchesCollab) return false;
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesPhone = l.phone.includes(q);
        const matchesDeb = l.debutanteName.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesDeb) return false;
      }

      // 5. Period Filter
      if (filterState.period !== 'all') {
        const leadDate = new Date(l.createdAt || Date.now());
        const today = new Date();
        const diffDays = Math.ceil((today.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        const todayStr = today.toISOString().split('T')[0];

        if (filterState.period === 'today' && (l.createdAt || '').split('T')[0] !== todayStr) return false;
        if (filterState.period === '7d' && (diffDays < 0 || diffDays > 7)) return false;
        if (filterState.period === '30d' && (diffDays < 0 || diffDays > 30)) return false;
        if (filterState.period === 'this_month') {
          if (leadDate.getMonth() !== today.getMonth() || leadDate.getFullYear() !== today.getFullYear()) return false;
        }
        if (filterState.period === 'custom' && filterState.customStartDate && filterState.customEndDate) {
          const leadDateStr = (l.createdAt || '').split('T')[0];
          if (leadDateStr < filterState.customStartDate || leadDateStr > filterState.customEndDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filterState.sortBy === 'oldest') {
        return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
      }
      if (filterState.sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (filterState.sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      // default: recent
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }, [leads, currentFunnel, activeVenueId, filterState, search, leadOwnershipFilter, currentUser]);

  const renderColumnIcon = (iconOrStage: string, size = 15, color?: string) => {
    switch (iconOrStage) {
      case 'inbox':
      case 'new_lead':
      case 'onboarding':
        return <Inbox size={size} color={color || "#60A5FA"} />;
      case 'clock':
      case 'in_negotiation':
      case 'in_analysis':
      case 'qualificacao':
        return <Clock size={size} color={color || "#FBBF24"} />;
      case 'calendar':
      case 'scheduled':
      case 'meeting_scheduled':
      case 'visita_agendada':
        return <Calendar size={size} color={color || "#A78BFA"} />;
      case 'users':
        return <Users size={size} color={color || "#38BDF8"} />;
      case 'award':
      case 'decision':
      case 'degustacao':
        return <Award size={size} color={color || "#F97316"} />;
      case 'sparkles':
        return <Sparkles size={size} color={color || "#D4AF37"} />;
      case 'dollar':
      case 'deal_closed':
      case 'contract_signed':
      case 'contrato_fechado':
        return <DollarSign size={size} color={color || "#FFD700"} />;
      case 'x-circle':
      case 'lost':
      case 'recusado':
        return <XCircle size={size} color={color || "#EF4444"} />;
      case 'party':
        return <PartyPopper size={size} color={color || "#EC4899"} />;
      case 'phone':
        return <PhoneCall size={size} color={color || "#10B981"} />;
      case 'message':
        return <MessageSquare size={size} color={color || "#10B981"} />;
      case 'zap':
        return <Zap size={size} color={color || "#EAB308"} />;
      default:
        return <Layers size={size} color={color || "#38BDF8"} />;
    }
  };

  const columns = useMemo(() => {
    let rawStages: FunnelStageConfig[] = (currentFunnel?.stages && currentFunnel.stages.length > 0)
      ? currentFunnel.stages
      : (isPostSaleView ? DEFAULT_POST_SALE_FORM_STAGES : DEFAULT_FORM_STAGES);

    // Se isEntryStageActive for falso, oculta a primeira etapa se for a etapa de entrada
    const isEntryActive = Boolean(currentFunnel?.isEntryStageActive);
    if (!isEntryActive) {
      rawStages = rawStages.filter((st, idx) => {
        const isEntryName = st.name.toLowerCase().includes('entrada') || st.name.toLowerCase().includes('novo lead');
        const isEntryId = st.id === 'new_lead' || st.id === 'onboarding';
        if (idx === 0 && (isEntryName || isEntryId || (st.isFixed && !st.isWon && !st.isLoss))) {
          return false;
        }
        return true;
      });
    } else {
      const hasEntry = rawStages.some(st => st.id === 'new_lead' || st.id === 'onboarding' || st.name.toLowerCase().includes('entrada'));
      if (!hasEntry) {
        rawStages = [
          { id: 'new_lead', name: 'NOVO LEAD', color: '#EF4444', icon: 'inbox', isFixed: true, order: 0 },
          ...rawStages.map((st, i) => ({ ...st, order: i + 1 }))
        ];
      }
    }

    return rawStages.map((st, idx) => ({
      id: (st.id as string) || `stage_${idx}`,
      title: st.name,
      icon: st.icon,
      hints: st.hints,
      isMeetingStage: Boolean(st.isMeetingStage),
      headerColor: st.color || '#3B82F6',
      bgColor: `${st.color || '#3B82F6'}12`,
      borderColor: `${st.color || '#3B82F6'}40`,
      isWon: Boolean(st.isWon),
      isLoss: Boolean(st.isLoss),
    }));
  }, [currentFunnel, isPostSaleView]);

  // Robust lead to column matcher: guarantees no leads disappear from Kanban
  const getLeadMatchedColumnId = (lead: Lead, cols: typeof columns): string => {
    if (!cols || cols.length === 0) return '';
    const rawStage = String((lead as { stage?: string }).stage || '').toLowerCase();

    // 1. Direct match:
    const direct = cols.find(c => (c.id as string).toLowerCase() === rawStage);
    if (direct) return direct.id;

    // 2. Semantic matching:
    if (rawStage === 'new_lead' || rawStage === 'onboarding' || rawStage.includes('entrada')) {
      const entryCol = cols.find(c => (c.id as string) === 'new_lead' || (c.id as string) === 'onboarding' || c.title.toLowerCase().includes('entrada'));
      if (entryCol) return entryCol.id;
      return cols[0].id;
    }
    
    if (rawStage === 'in_negotiation' || rawStage === 'in_analysis' || rawStage === 'qualificacao' || rawStage === 'em_negociacao') {
      const negCol = cols.find(c => (c.id as string) === 'in_negotiation' || (c.id as string) === 'in_analysis' || (c.id as string) === 'qualificacao' || c.title.toLowerCase().includes('negocia') || c.title.toLowerCase().includes('análise') || c.title.toLowerCase().includes('qualifica'));
      if (negCol) return negCol.id;
    }
    
    if (rawStage === 'scheduled' || rawStage === 'meeting_scheduled' || rawStage === 'visita_agendada' || rawStage === 'agendado') {
      const schCol = cols.find(c => (c.id as string) === 'scheduled' || (c.id as string) === 'meeting_scheduled' || (c.id as string) === 'visita_agendada' || c.title.toLowerCase().includes('agendad') || c.title.toLowerCase().includes('visita'));
      if (schCol) return schCol.id;
    }
    
    if (rawStage === 'decision' || rawStage === 'degustacao') {
      const decCol = cols.find(c => (c.id as string) === 'decision' || (c.id as string) === 'degustacao' || c.title.toLowerCase().includes('degusta') || c.title.toLowerCase().includes('decis'));
      if (decCol) return decCol.id;
    }
    
    if (rawStage === 'deal_closed' || rawStage === 'contract_signed' || rawStage === 'contrato_fechado' || rawStage === 'ganho') {
      const wonCol = cols.find(c => c.isWon || (c.id as string) === 'deal_closed' || (c.id as string) === 'contract_signed' || (c.id as string) === 'contrato_fechado' || c.title.toLowerCase().includes('fechado') || c.title.toLowerCase().includes('ganho'));
      if (wonCol) return wonCol.id;
    }
    
    if (rawStage === 'lost' || rawStage === 'perdido') {
      const lossCol = cols.find(c => c.isLoss || (c.id as string) === 'lost' || c.title.toLowerCase().includes('perdid') || c.title.toLowerCase().includes('recusad'));
      if (lossCol) return lossCol.id;
    }

    // 3. Fallback to first available column:
    return cols[0].id;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    if (isReadOnlyForPosVenda) {
      e.preventDefault();
      return;
    }
    const targetLead = leads.find(l => l.id === leadId);
    if (targetLead && isLeadSpectator(targetLead)) {
      e.preventDefault();
      alert('Modo Espectador: Você tem apenas permissão de visualização neste lead atribuído a outro colaborador.');
      return;
    }
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (isReadOnlyForPosVenda) {
      alert('A equipe de Pós-Venda opera em modo de visualização neste funil comercial. Para gerenciar etapas e interagir, selecione um Funil de Pós-Venda.');
      return;
    }

    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (isLeadSpectator(lead)) {
      alert(`Modo Espectador: Este lead está sob atendimento de ${lead.assignedTo || 'outro SDR'}. Apenas o responsável ou Gerentes/Master podem alterar a etapa.`);
      setDraggedLeadId(null);
      return;
    }

    const isPrivileged = currentUser?.role === 'master' || currentUser?.role === 'admin';
    if (currentUser?.role === 'sdr' && lead.sdrId && lead.sdrId !== currentUser.id && !isPrivileged) {
      alert(`Este lead já está sendo atendido por ${lead.assignedTo || 'outro SDR'}. Apenas Gerentes ou Master podem reatribuir.`);
      setDraggedLeadId(null);
      return;
    }

    const isCurrentlyWon = lead.stage === 'contract_signed' || (lead.stage as string) === 'deal_closed' || (lead.stage as string) === 'contrato_fechado';
    const isTargetWon = (targetStage as string) === 'contract_signed' || (targetStage as string) === 'deal_closed' || (targetStage as string) === 'contrato_fechado';

    // Se o lead já é um cliente ganho e está sendo movido de volta para uma etapa de negociação ativa
    if (isCurrentlyWon && !isTargetWon) {
      setReopeningLeadConfirm({ lead, targetStage });
      setDraggedLeadId(null);
      return;
    }

    if (isTargetWon) {
      // Validar requisitos obrigatórios para Ganho (Audio 2: Closer não é obrigatório)
      const missing: string[] = [];

      // 1. Contato vinculado (Decisor / Responsável)
      const validContacts = (lead.contacts || []).filter(c => c.name?.trim() && c.phone?.trim() && c.phone.replace(/\D/g, '').length >= 8);
      if (validContacts.length === 0) {
        missing.push('Pelo menos 1 Contato Vinculado (com Nome e Telefone/WhatsApp)');
      }

      // 3. Tipo de Evento
      if (!lead.eventType) {
        missing.push('Tipo do Evento');
      }

      // 4. Data do Evento / Festa
      const eventDate = lead.partyDate || lead.eventDate;
      if (!eventDate) {
        missing.push('Data do Evento / Festa');
      }

      // 5. Data de Aniversário da Debutante / Aniversariante
      if (!lead.debutanteBirthDate) {
        missing.push('Data de Aniversário do(a) Aniversariante');
      }

      // 6. Quantidade de Convidados
      if (!lead.estimatedGuests || lead.estimatedGuests <= 0) {
        missing.push('Quantidade Estimada de Convidados');
      }

      // 7. Período Desejado
      if (!lead.desiredPeriod?.trim()) {
        missing.push('Período Desejado');
      }

      // 8. Valor da Venda / Orçamento
      const hasValue = (lead.dealValue && lead.dealValue > 0) || (lead.estimatedBudget && lead.estimatedBudget > 0);
      if (!hasValue) {
        missing.push('Valor da Venda / Orçamento');
      }

      // 9. Pacote Vendido / Interesse
      const hasPackage = lead.packageSold?.trim() || lead.interestService?.trim();
      if (!hasPackage) {
        missing.push('Pacote de Interesse / Vendido');
      }

      // 10. Formato de Pagamento
      if (!lead.paymentMethod?.trim()) {
        missing.push('Formato de Pagamento');
      }

      if (missing.length > 0) {
        setMissingFieldsLead(lead);
        setMissingFieldsList(missing);
        setIsMissingFieldsModalOpen(true);
        setDraggedLeadId(null);
        return;
      }

      setDealModalLead(lead);
      setIsCloseDealModalOpen(true);
    } else {
      const isTargetLoss = (targetStage as string) === 'lost' || (targetStage as string) === 'recusado' || (targetStage as string) === 'perdido' || (targetStage as string) === 'cancelado';
      if (isTargetLoss) {
        setLostReasonLead(lead);
        setIsLostReasonModalOpen(true);
        setDraggedLeadId(null);
        return;
      }

      updateLeadStage(leadId, targetStage as CrmStage);
    }
    setDraggedLeadId(null);
  };

  const handleConfirmReopenNegotiation = () => {
    if (reopeningLeadConfirm) {
      updateLeadStage(reopeningLeadConfirm.lead.id, reopeningLeadConfirm.targetStage as CrmStage);
      setReopeningLeadConfirm(null);
    }
  };

  const handleConfirmSale = (leadId: string, dealValue: number, packageSold: string, closerNotes?: string) => {
    closeLeadSaleWithValue(leadId, dealValue, packageSold, undefined, closerNotes);
  };

  const handleConfirmLost = (reason: string, details?: string) => {
    if (lostReasonLead) {
      const fullReason = details?.trim() ? `${reason} - ${details.trim()}` : reason;
      rejectLead(lostReasonLead.id, fullReason);
      setLostReasonLead(null);
      setIsLostReasonModalOpen(false);
    }
  };

  const handleOpenLeadWorkspace = (lead: Lead) => {
    setActiveLeadIdForWorkspace(lead.id);
    setViewMode('workspace');
  };

  const displayedFunnels = useMemo(() => {
    if (!funnelSearch.trim()) return funnelsList;
    const q = funnelSearch.toLowerCase();
    return funnelsList.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q) || (f.venueName || '').toLowerCase().includes(q));
  }, [funnelsList, funnelSearch]);

  // ── Render Kommo CRM Style Pipeline Configuration seamlessly in Content Area ──
  if (isComoFunnelSettingsOpen) {
    return (
      <AdminFunnelSettingsView
        initialFunnelId={comoFunnelId || selectedFunnelId || undefined}
        onClose={() => {
          setIsComoFunnelSettingsOpen(false);
          setComoFunnelId(undefined);
          setViewMode('kanban');
        }}
        onSaved={() => {
          setIsComoFunnelSettingsOpen(false);
          setComoFunnelId(undefined);
          setViewMode('kanban');
        }}
        onDeleted={() => {
          setIsComoFunnelSettingsOpen(false);
          setComoFunnelId(undefined);
          setSelectedFunnelId(null);
        }}
      />
    );
  }

  if (!isPostSaleView && !selectedFunnelId) {
    const totalPipelineSum = funnelsList.reduce((acc, curr) => acc + curr.openPipelineValue, 0);
    const totalLeadsSum = funnelsList.reduce((acc, curr) => acc + curr.leadCount, 0);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '24px 32px 80px 32px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.25s ease-out',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Main Title & Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Target size={24} color="var(--adm-accent)" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--adm-text-title)', letterSpacing: '-0.4px', margin: 0 }}>
                {isPostSaleView ? 'Central de Funis de Clientes (Pós-Venda)' : 'Central de Funis Comerciais'}
              </h1>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '650px' }}>
              {isPostSaleView 
                ? 'Pipelines de pós-venda estruturados e independentes. Gerencie clientes, onboarding, visitas técnicas e degustações.'
                : 'Pipelines comerciais estruturados e independentes. Gerencie oportunidades, mova etapas e acompanhe fechamentos.'}
            </p>
          </div>

          {canConfigureFunnels && (
            <button
              type="button"
              onClick={() => handleOpenCreateFunnel(activeVenueId && activeVenueId !== 'all' ? activeVenueId : undefined)}
              style={{
                background: 'var(--adm-accent)',
                color: '#FFFFFF',
                borderRadius: '10px',
                border: 'none',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(20, 169, 215, 0.35)',
                transition: 'all 0.18s ease',
              }}
            >
              <Plus size={16} color="#FFFFFF" />
              <span>{isPostSaleView ? 'Novo Funil Pós-Venda' : 'Novo Funil'}</span>
            </button>
          )}
        </div>

        {/* Overview KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pipelines Ativos</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{funnelsList.length} Funis</div>
            </div>
          </div>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Oportunidades</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{totalLeadsSum} Leads</div>
            </div>
          </div>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pipeline Fechado</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10B981' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPipelineSum)}
              </div>
            </div>
          </div>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Unidades Atendidas</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{venues.length} Casas</div>
            </div>
          </div>
        </div>

        {/* Search Bar for Funnels */}
        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          <input type="text" placeholder="Buscar funil por nome, categoria ou unidade..." value={funnelSearch} onChange={(e) => setFunnelSearch(e.target.value)} style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px 14px 10px 42px', color: 'var(--adm-text-title)', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* UNIFIED GRID OF FUNNELS (CLEAN PIPELINES WITHOUT FORCED VENUE TITLES) */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {displayedFunnels.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
              <Target size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>Nenhum Funil Encontrado</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>Crie um funil comercial ou ajuste os termos de busca para visualizar suas esteiras.</p>
            </div>
            {canConfigureFunnels && (
              <button
                type="button"
                onClick={() => handleOpenCreateFunnel(undefined)}
                style={{
                  background: 'var(--adm-accent)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: 'none',
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px'
                }}
              >
                <Plus size={15} />
                <span>Criar Novo Funil</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {displayedFunnels.map(funnel => {
              const linkedVenues = getLinkedVenuesForFunnel(funnel);

              return (
                <div
                  key={funnel.id}
                  onClick={() => handleSelectFunnel(funnel.id)}
                  className="saas-card"
                  style={{
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    border: funnel.isPrimary ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                    background: funnel.isPrimary 
                      ? 'linear-gradient(135deg, var(--adm-bg-card) 0%, rgba(212, 175, 55, 0.06) 100%)' 
                      : 'var(--adm-bg-card)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = funnel.badgeColor || 'var(--adm-accent)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = funnel.isPrimary ? 'var(--adm-accent)' : 'var(--adm-border)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Category Badge */}
                        {funnel.badge !== 'Indicações do App' && funnel.category !== 'Indicações do App' && (funnel.badge || funnel.category) && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '16px',
                            background: `${funnel.badgeColor || '#3B82F6'}18`,
                            color: funnel.badgeColor || '#3B82F6',
                            border: `1px solid ${funnel.badgeColor || '#3B82F6'}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {renderFunnelIcon(funnel.icon || 'target', 11, funnel.badgeColor || '#3B82F6')}
                            <span>{funnel.badge || funnel.category}</span>
                          </span>
                        )}

                        {/* Linked Venues Tags (Calculadas dinamicamente a partir das origens conectadas) */}
                        {linkedVenues.length > 0 ? (
                          linkedVenues.map(v => (
                            <span key={v.id} style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '8px',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#818cf8',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Building2 size={10} />
                              <span>{v.name}</span>
                            </span>
                          ))
                        ) : (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '8px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Building2 size={10} />
                            <span>{funnel.venueName || 'Todas as Casas'}</span>
                          </span>
                        )}

                        {/* Post-Sale Badge */}
                        {(funnel.isPostSale || funnel.category === 'Pós-Venda' || funnel.name?.toLowerCase().includes('pós-venda')) && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '8px',
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: '#06B6D4',
                            border: '1px solid rgba(6, 182, 212, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <ShieldCheck size={10} />
                            <span>Pós-Venda</span>
                          </span>
                        )}
                      </div>

                      {/* Top Right: Pin Button + Settings + Visual */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Pin on sidebar button */}
                        <button
                          type="button"
                          title={funnel.isPinned ? "Desafixar do menu lateral" : "Fixar no menu lateral (Sidebar)"}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFunnel(funnel.id, { isPinned: !funnel.isPinned });
                          }}
                          style={{
                            background: funnel.isPinned ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                            border: `1px solid ${funnel.isPinned ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                            borderRadius: '8px',
                            padding: '5px 7px',
                            color: funnel.isPinned ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Pin size={11} style={{ transform: funnel.isPinned ? 'rotate(45deg)' : 'none' }} />
                          <span>{funnel.isPinned ? 'Fixado' : 'Fixar'}</span>
                        </button>

                        {/* Settings button */}
                        {canConfigureFunnels && (
                          <button
                            type="button"
                            title="Configurações e Identidade do Funil"
                            onClick={(e) => handleOpenConfigureFunnel(funnel, e)}
                            style={{
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '5px',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--adm-accent)';
                              e.currentTarget.style.borderColor = 'var(--adm-accent)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--adm-text-muted)';
                              e.currentTarget.style.borderColor = 'var(--adm-border)';
                            }}
                          >
                            <Settings size={13} />
                          </button>
                        )}

                        {/* Funnel Visual Container (Custom Image or Icon) */}
                        {renderFunnelVisual(funnel, 15, 30)}
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                      {funnel.name}
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      {funnel.description}
                    </p>

                    {/* Privacy / Access Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {funnel.allowedCollaboratorIds && funnel.allowedCollaboratorIds.length > 0 ? (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#EAB308',
                          border: '1px solid rgba(234, 179, 8, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Lock size={9} />
                          <span>Acesso Restrito ({funnel.allowedCollaboratorIds.length} Colaboradores)</span>
                        </span>
                      ) : funnel.allowedRoles && funnel.allowedRoles.length > 0 && !(funnel.allowedRoles as string[]).includes('all') ? (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Lock size={9} />
                          <span>Setor: {funnel.allowedRoles.map(r => r === 'pos_venda' ? 'Pós-Venda' : r === 'admin' || r === 'master' ? 'Gerência' : 'Comercial').filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'var(--adm-bg-input)',
                          color: 'var(--adm-text-muted)',
                          border: '1px solid var(--adm-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Users size={9} />
                          <span>Aberto para Todo o Time</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* KPI Numbers */}
                  <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Oportunidades</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '2px' }}>{funnel.leadCount}</div>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--adm-border)', borderRight: '1px solid var(--adm-border)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pipeline R$</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(funnel.openPipelineValue)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Conversão</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--adm-accent)', marginTop: '2px' }}>{funnel.conversionRate}%</div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                      {funnel.stagesCount} Etapas no Kanban
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFunnel(funnel.id);
                      }}
                      style={{
                        background: funnel.isPrimary ? 'var(--adm-accent)' : 'var(--adm-bg-elevated)',
                        border: funnel.isPrimary ? 'none' : '1px solid var(--adm-border)',
                        color: funnel.isPrimary ? '#FFFFFF' : 'var(--adm-text-title)',
                        borderRadius: '9px',
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{funnel.buttonText}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* "+ Adicionar Funil" slot */}
            {canConfigureFunnels && (
              <div
                onClick={() => handleOpenCreateFunnel(undefined)}
                style={{
                  borderRadius: '18px',
                  padding: '24px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  border: '2px dashed var(--adm-border)',
                  background: 'transparent',
                  transition: 'all 0.18s ease',
                  minHeight: '220px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--adm-accent)';
                  e.currentTarget.style.background = 'var(--adm-accent-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--adm-border)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-accent)' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Criar Novo Funil</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px', maxWidth: '220px' }}>Adicione tráfego pago, parcerias, prospecção ou pós-venda.</div>
                </div>
              </div>
            )}
          </div>
        )}


      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px 24px 60px 24px',
      width: '100%',
      minHeight: 'calc(100vh - 64px)',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Banner de Modo Observador Comercial para equipe de Pós-Venda */}
      {isReadOnlyForPosVenda && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#06B6D4',
          boxShadow: '0 4px 16px rgba(6, 182, 212, 0.08)',
        }}>
          <ShieldCheck size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
            <strong style={{ color: '#22D3EE' }}>Modo Observador Comercial (Pós-Venda):</strong> Você tem acesso completo para visualizar informações, histórico e conversas deste funil comercial. Alterações de etapas e contato comercial direto são exclusivos do time de SDRs e Closers. Para atuar operacionalmente, utilize um <strong>Funil de Pós-Venda</strong>.
          </div>
        </div>
      )}

      {/* ── BARRA DE FERRAMENTAS SUPERIOR UNIFICADA (KANBAN / ENTRADA / TABELA) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '14px',
        padding: '8px 14px',
        flexWrap: 'wrap',
      }}>
        {/* Left Side: Receding Search Bar + Inline Expanding Filters + Meus Leads Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {/* Busca (Recolhe se filtros estiverem abertos, expande caso contrário) */}
          <div style={{
            position: 'relative',
            width: isFilterBarExpanded ? '180px' : '260px',
            transition: 'width 0.2s ease',
            flexShrink: 0,
          }}>
            <Search size={15} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder={isPostSaleView ? "Buscar cliente ou telefone..." : "Buscar lead ou telefone..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                padding: '7px 12px 7px 34px',
                color: 'var(--adm-text-title)',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          {/* Botão de Filtros (Expande inline dentro da barra, retraindo a pesquisa) */}
          <button
            type="button"
            onClick={() => setIsFilterBarExpanded(!isFilterBarExpanded)}
            title="Filtros avançados dentro da barra"
            style={{
              background: isFilterBarExpanded ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
              border: isFilterBarExpanded ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
              color: isFilterBarExpanded ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Settings size={14} />
            <span>Filtros</span>
            <ChevronDown size={12} style={{ transform: isFilterBarExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {/* Filtros Inline Diretos na Barra (Sem Dropdown/Popover Solto) */}
          {isFilterBarExpanded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              animation: 'fadeIn 0.15s ease-out',
            }}>
              {/* Período */}
              <select
                value={filterState.period}
                onChange={(e) => setFilterState(prev => ({ ...prev, period: e.target.value as any }))}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Todo o Período</option>
                <option value="today">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="this_month">Este mês</option>
              </select>

              {/* Casa de Festas */}
              {venues.length > 1 && (
                <select
                  value={filterState.venueId}
                  onChange={(e) => setFilterState(prev => ({ ...prev, venueId: e.target.value }))}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    fontSize: '0.74rem',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '140px',
                  }}
                >
                  <option value="all">Todas as Casas</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}

              {/* Colaborador */}
              <select
                value={filterState.collaboratorId}
                onChange={(e) => setFilterState(prev => ({ ...prev, collaboratorId: e.target.value }))}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '130px',
                }}
              >
                <option value="all">Todos Colab.</option>
                {collaborators.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Ordenação */}
              <select
                value={filterState.sortBy}
                onChange={(e) => setFilterState(prev => ({ ...prev, sortBy: e.target.value as any }))}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {sortOptions.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>

              {/* Limpar Filtros */}
              {(filterState.period !== 'all' || filterState.venueId !== 'all' || filterState.collaboratorId !== 'all' || filterState.sortBy !== 'recent') && (
                <button
                  type="button"
                  onClick={() => setFilterState({
                    period: 'all',
                    venueId: 'all',
                    collaboratorId: 'all',
                    debutanteId: 'all',
                    sortBy: 'recent',
                  })}
                  title="Limpar filtros"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)',
                    borderRadius: '6px',
                    padding: '4px 7px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <X size={12} />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          )}

          {/* Toggle Rápido: Todos vs Meus Leads */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setLeadOwnershipFilter('all')}
              style={{
                background: leadOwnershipFilter === 'all' ? 'var(--adm-accent-bg)' : 'transparent',
                border: leadOwnershipFilter === 'all' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: leadOwnershipFilter === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: leadOwnershipFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setLeadOwnershipFilter('mine')}
              style={{
                background: leadOwnershipFilter === 'mine' ? 'var(--adm-accent-bg)' : 'transparent',
                border: leadOwnershipFilter === 'mine' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: leadOwnershipFilter === 'mine' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: leadOwnershipFilter === 'mine' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              {isPostSaleView ? 'Meus Clientes' : 'Meus Leads'}
            </button>
          </div>
        </div>

        {/* Right Side: Ações e Seletor de Modo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* Botão + Adicionar Lead */}
          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, var(--adm-accent, #6366f1), #4f46e5)',
              color: '#fff',
              borderRadius: '8px',
              border: 'none',
              padding: '6px 13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={14} />
            <span>{isPostSaleView ? 'Adicionar Cliente' : 'Adicionar Lead'}</span>
          </button>

          {/* Seletor de Modo Minimalista (Apenas Ícones com Tooltips) */}
          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '8px',
            padding: '2px',
            display: 'flex',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Visualização Kanban"
              style={{
                background: viewMode === 'kanban' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                border: viewMode === 'kanban' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Kanban size={15} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLeadIdForWorkspace(null);
                setViewMode('workspace');
              }}
              title="Caixa de Entrada / Chat"
              style={{
                background: viewMode === 'workspace' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'workspace' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                border: viewMode === 'workspace' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Inbox size={15} />
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Visualização em Tabela"
              style={{
                background: viewMode === 'list' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                border: viewMode === 'list' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={15} />
            </button>

            {canConfigureFunnels && (selectedFunnelId || isPostSaleView) && (
              <button
                type="button"
                onClick={() => {
                  setComoFunnelId(selectedFunnelId || (funnelsList[0]?.id || 'post_sale_default'));
                  setIsComoFunnelSettingsOpen(true);
                }}
                title="Configurar etapas e automações do funil"
                style={{
                  background: 'var(--adm-bg-input)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--adm-accent)';
                  e.currentTarget.style.borderColor = 'var(--adm-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--adm-text-title)';
                  e.currentTarget.style.borderColor = 'var(--adm-border)';
                }}
              >
                <Settings size={14} />
                <span>Configurar Funil</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'workspace' ? (
        <AdminWhatsAppWorkspaceView 
          initialLeadId={activeLeadIdForWorkspace || undefined}
          activeFunnelId={selectedFunnelId || undefined}
          isEmbeddedInFunnel={true}
          onClose={() => setViewMode('kanban')}
        />
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', padding: '0 4px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
              Total: <strong style={{ color: 'var(--adm-text-title)' }}>{filteredLeads.length}</strong>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
              Qualificados: <strong style={{ color: 'var(--adm-green)' }}>{filteredLeads.filter(l => l.isValidated).length}</strong>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
              Vendas VIP: <strong style={{ color: 'var(--adm-accent)' }}>{filteredLeads.filter(l => l.stage === 'contract_signed').length}</strong>
            </div>
          </div>

          {/* KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: '16px',
              overflowX: 'auto',
              paddingBottom: '24px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              {columns.map(col => {
                const columnLeads = filteredLeads.filter(l => getLeadMatchedColumnId(l, columns) === col.id);
                const stageValue = columnLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      height: 'calc(100vh - 270px)',
                      minHeight: '540px',
                      width: '360px',
                      minWidth: '360px',
                      maxWidth: '360px',
                      flex: '0 0 360px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Column Header */}
                    <div style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--adm-border)',
                      borderTop: `3px solid ${col.headerColor}`,
                      borderTopLeftRadius: '14px',
                      borderTopRightRadius: '14px',
                      backgroundColor: col.bgColor || 'var(--adm-bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {renderColumnIcon(col.icon || col.id, 14, col.headerColor)}
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {col.title}
                          </span>
                          {col.hints && (
                            <div style={{ position: 'relative', display: 'inline-flex' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveHintStageId(activeHintStageId === col.id ? null : col.id);
                                }}
                                title="Ver orientações desta etapa"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: activeHintStageId === col.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                                  cursor: 'pointer',
                                  padding: '1px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-accent)'}
                                onMouseLeave={(e) => {
                                  if (activeHintStageId !== col.id) e.currentTarget.style.color = 'var(--adm-text-muted)';
                                }}
                              >
                                <HelpCircle size={13} />
                              </button>

                              {activeHintStageId === col.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: '-10px',
                                    zIndex: 50,
                                    width: '260px',
                                    padding: '12px 14px',
                                    background: 'var(--adm-bg-card)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    fontSize: '0.74rem',
                                    color: 'var(--adm-text-body)',
                                    lineHeight: 1.4,
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '4px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.72rem' }}>
                                      Orientações da Etapa
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveHintStageId(null)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0 }}
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                  <div>{col.hints}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: 'var(--adm-bg-card, #ffffff)',
                          color: col.headerColor,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          flexShrink: 0,
                        }}>
                          {columnLeads.length}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stageValue)}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div style={{
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      overflowY: 'auto',
                      flex: 1,
                    }}>
                      {columnLeads.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '28px 8px',
                          color: 'var(--adm-text-muted)',
                          fontSize: '0.72rem',
                          border: '1px dashed var(--adm-border)',
                          borderRadius: '10px',
                          lineHeight: 1.4,
                        }}>
                          Arraste um lead para cá
                        </div>
                      ) : (
                        columnLeads.map(lead => {
                          const sdrCollab = collaborators.find(c => (lead.sdrId && c.id === lead.sdrId) || (lead.sdrName && c.name?.toLowerCase() === lead.sdrName.toLowerCase()) || (lead.assignedTo && c.name?.toLowerCase() === lead.assignedTo.toLowerCase()));
                          const sdrDisplayName = sdrCollab?.name || lead.sdrName || (lead.assignedTo && lead.assignedTo !== 'Sem responsável' && lead.assignedTo !== 'Não atribuído' ? lead.assignedTo : '');

                          const closerCollab = collaborators.find(c => (lead.closerId && c.id === lead.closerId) || (lead.closerName && c.name?.toLowerCase() === lead.closerName.toLowerCase()));
                          const closerDisplayName = closerCollab?.name || lead.closerName || '';

                          const hasSdr = Boolean(lead.sdrId || lead.sdrName || sdrDisplayName);
                          const hasCloser = Boolean(lead.closerId || lead.closerName || closerDisplayName);
                          const hasNoAssignee = !hasSdr && !hasCloser;

                          // Pending Tasks calculation
                          const leadTasks = (lead.tasks || []).filter(t => t.status !== 'completed');
                          const generalLeadTasks = (tasks || []).filter(t => t.leadId === lead.id && t.status !== 'completed');
                          const totalPendingTasks = leadTasks.length + generalLeadTasks.length;

                          const lastMessageText = (lead as any).lastMessage || (lead as any).whatsappLastMessage || (lead as any).lastWhatsAppMessage || ((lead.activities || []).find(a => a.type === 'contact' || a.title?.toLowerCase().includes('whatsapp'))?.text);

                          return (
                            <div
                              key={lead.id}
                              draggable={!isReadOnlyForPosVenda && !isLeadSpectator(lead)}
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => handleOpenLeadWorkspace(lead)}
                              style={{
                                background: 'var(--adm-bg-card, #ffffff)',
                                border: '1px solid var(--adm-border, #E2E8F0)',
                                borderRadius: '14px',
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = isPostSaleView ? '#06B6D4' : 'var(--adm-accent)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--adm-border, #E2E8F0)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                              }}
                            >
                              {/* ROW 1: Lead Avatar + Name & Deal Value (Left) & Date + Tasks Status (Right) */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                {/* Left: Avatar + Name & Value */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  {/* Dark Gold Monogram Avatar */}
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#18181B',
                                    border: '2px solid rgba(217, 119, 6, 0.5)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    position: 'relative',
                                  }}>
                                    <span style={{
                                      color: '#F59E0B',
                                      fontSize: '1.05rem',
                                      fontWeight: 800,
                                      fontFamily: 'inherit',
                                      lineHeight: 1,
                                    }}>
                                      {(lead.name || 'D').trim().charAt(0).toUpperCase()}
                                    </span>
                                  </div>

                                  {/* Name and Deal Value */}
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '1px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                      <span style={{
                                        fontSize: '0.90rem',
                                        fontWeight: 800,
                                        color: 'var(--adm-text-title, #0F172A)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.2,
                                      }}>
                                        {lead.name}
                                      </span>
                                      {isLeadSpectator(lead) && (
                                        <span title="Modo Espectador: visualização somente leitura" style={{ fontSize: '0.52rem', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '4px', padding: '0 3px', display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                          <Eye size={8} />
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: '0.86rem',
                                      fontWeight: 800,
                                      color: '#10B981',
                                      letterSpacing: '-0.2px',
                                      lineHeight: 1.15,
                                    }}>
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.dealValue || lead.estimatedBudget || 35000)}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Date + Tasks Status */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', flexShrink: 0 }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--adm-text-muted, #64748B)',
                                    letterSpacing: '0.1px',
                                  }}>
                                    {formatLeadDisplayDate(lead)}
                                  </span>

                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.67rem',
                                    fontWeight: 600,
                                    color: totalPendingTasks > 0 ? '#F59E0B' : 'var(--adm-text-muted, #64748B)',
                                  }}>
                                    <span style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: totalPendingTasks > 0 ? '#F59E0B' : '#94A3B8',
                                      display: 'inline-block',
                                    }} />
                                    <span>{totalPendingTasks > 0 ? `${totalPendingTasks} ${totalPendingTasks === 1 ? 'tarefa' : 'tarefas'}` : 'Sem tarefas'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* ROW 2: Badges (Single horizontal line) + Assignee Avatar on Right */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                {/* Left: Badges (single line nowrap) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                  {/* Venue Badge */}
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    border: '1px solid rgba(99, 102, 241, 0.22)',
                                    color: '#6366F1',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flexShrink: 1,
                                  }}>
                                    <Building2 size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {venues.find(v => v.id === lead.venueId)?.name || lead.venueName || 'Espaço F5 System'}
                                    </span>
                                  </span>

                                  {/* Origin Badge */}
                                  {lead.source === 'instagram' ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(236, 72, 153, 0.08)',
                                      border: '1px solid rgba(236, 72, 153, 0.22)',
                                      color: '#EC4899',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <Camera size={11} style={{ flexShrink: 0 }} />
                                      <span>Instagram</span>
                                    </span>
                                  ) : lead.source === 'whatsapp' ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(16, 185, 129, 0.08)',
                                      border: '1px solid rgba(16, 185, 129, 0.22)',
                                      color: '#10B981',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <PhoneCall size={11} style={{ flexShrink: 0 }} />
                                      <span>WhatsApp</span>
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(6, 182, 212, 0.08)',
                                      border: '1px solid rgba(6, 182, 212, 0.22)',
                                      color: '#0891B2',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <Gift size={11} style={{ flexShrink: 0 }} />
                                      <span>Indicação</span>
                                    </span>
                                  )}

                                  {/* Temperature Badge */}
                                  {lead.temperature === 'warm' ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(245, 158, 11, 0.08)',
                                      border: '1px solid rgba(245, 158, 11, 0.22)',
                                      color: '#F59E0B',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <span style={{ fontSize: '10px' }}>🟡</span>
                                      <span>Morno</span>
                                    </span>
                                  ) : lead.temperature === 'cold' ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(59, 130, 246, 0.08)',
                                      border: '1px solid rgba(59, 130, 246, 0.22)',
                                      color: '#3B82F6',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <span style={{ fontSize: '10px' }}>🔵</span>
                                      <span>Frio</span>
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.22)',
                                      color: '#EF4444',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}>
                                      <span style={{ fontSize: '10px' }}>🔥</span>
                                      <span>Quente</span>
                                    </span>
                                  )}
                                </div>

                                {/* Right: Assignee Avatar Stack */}
                                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: '2px' }}>
                                  {hasSdr && renderAssigneeAvatar(sdrCollab, sdrDisplayName, 'SDR', '#0284C7', 1, false)}
                                  {hasCloser && (closerCollab?.id !== sdrCollab?.id || closerDisplayName !== sdrDisplayName) && (
                                    renderAssigneeAvatar(closerCollab, closerDisplayName, 'Closer', '#F59E0B', 2, hasSdr)
                                  )}
                                  {hasNoAssignee && (
                                    <div
                                      title="F5 System"
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '1.5px solid #0284C7',
                                        background: 'var(--adm-bg-card, #ffffff)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                      }}
                                    >
                                      <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#0284C7', letterSpacing: '-0.4px' }}>
                                        F5
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Horizontal Divider */}
                              <div style={{ height: '1px', backgroundColor: 'var(--adm-border, #E2E8F0)', opacity: 0.5, margin: '1px 0' }} />

                              {/* ROW 3: WhatsApp / Chat message preview bubble */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {/* WhatsApp Green Icon */}
                                <div
                                  title="WhatsApp"
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    color: '#10B981',
                                  }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                  </svg>
                                </div>

                                {/* Chat Bubble Container */}
                                <div style={{
                                  flex: 1,
                                  minWidth: 0,
                                  background: 'rgba(99, 102, 241, 0.04)',
                                  border: '1px solid rgba(99, 102, 241, 0.15)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  minHeight: '22px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}>
                                  <span style={{
                                    fontSize: '0.70rem',
                                    color: lastMessageText ? 'var(--adm-text-title)' : 'var(--adm-text-muted, #64748B)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                    display: 'block',
                                  }}>
                                    {lastMessageText || 'Nenhuma mensagem recente...'}
                                  </span>
                                </div>
                              </div>

                              {/* ICP Progress Bar in Commercial Kanban Card Bottom (Hidden in Post-Sale or when ICP is disabled/unconfigured) */}
                              {!isPostSaleView && (() => {
                                if (!hasIcpConfigured(lead)) return null;
                                const score = lead.mqlScore ?? 0;
                                const isTop = score >= 80 || lead.mqlLevel === 'top';
                                const isQualified = (score >= 50 && score < 80) || lead.mqlLevel === 'qualified';
                                const color = isTop ? '#10B981' : isQualified ? '#F59E0B' : '#EF4444';
                                const bgBadge = isTop ? 'rgba(16, 185, 129, 0.15)' : isQualified ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                                const borderBadge = isTop ? 'rgba(16, 185, 129, 0.3)' : isQualified ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                                const label = isTop ? 'ICP A' : isQualified ? 'ICP B' : 'ICP C';

                                return (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                    paddingTop: '8px',
                                    borderTop: '1px dashed var(--adm-border)',
                                    marginTop: '2px',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.66rem' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                        <IcpTargetUserIcon size={13} color={color} />
                                        <span>{label}</span>
                                      </span>
                                      <span style={{
                                        fontWeight: 800,
                                        color,
                                        background: bgBadge,
                                        border: `1px solid ${borderBadge}`,
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                      }}>
                                        {score}%
                                      </span>
                                    </div>
                                    <div style={{
                                      width: '100%',
                                      height: '4px',
                                      background: 'var(--adm-bg-card)',
                                      borderRadius: '2px',
                                      overflow: 'hidden',
                                    }}>
                                      <div style={{
                                        width: `${Math.max(score, 5)}%`,
                                        height: '100%',
                                        background: color,
                                        borderRadius: '2px',
                                        transition: 'width 0.3s ease',
                                      }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST / TABLE VIEW */}
          {viewMode === 'list' && (
            <div className="saas-card" style={{
              padding: 0,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--adm-bg-elevated)', borderBottom: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>{isPostSaleView ? 'Nome do Cliente' : 'Nome do Lead'}</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Telefone</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>{isPostSaleView ? 'Evento / Data' : 'Idade / Origem'}</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>{isPostSaleView ? 'Pacote / Valor' : 'Indicada por'}</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Responsável</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Etapa Atual</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => {
                    const col = columns.find(c => c.id === lead.stage) || columns[0];
                    const hasNoAssignee = !lead.assignedTo || lead.assignedTo === 'Sem responsável' || lead.assignedTo === 'Não atribuído';

                    return (
                      <tr 
                        key={lead.id}
                        onClick={() => handleOpenLeadWorkspace(lead)}
                        style={{
                          borderBottom: '1px solid var(--adm-border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          <div>{lead.name}</div>
                          <div style={{ fontSize: '0.64rem', color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)', fontWeight: 700 }}>
                            {isPostSaleView ? (lead.code ? (lead.code.startsWith('LEAD-') ? `CLI-${lead.code.replace('LEAD-', '')}` : lead.code) : 'CLI-NOVO') : (lead.code || 'LEAD-NOVO')}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)' }}>{formatPhone(lead.phone)}</td>
                        <td style={{ padding: '12px 18px' }}>
                          {isPostSaleView ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{lead.eventType || '15 Anos'}</span>
                              <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.72rem' }}>
                                {(lead.eventDate || lead.partyDate) ? new Date((lead.eventDate || lead.partyDate) + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data a definir'}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>{lead.age} anos ({lead.group})</span>
                              {renderLeadOriginBadge(lead)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {isPostSaleView ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{lead.packageSold || lead.interestService || 'Pacote Padrão'}</span>
                              <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.74rem' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lead.dealValue || lead.estimatedBudget || 0)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--adm-accent)', fontWeight: 600 }}>{lead.debutanteName}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {hasNoAssignee ? (
                            <span style={{ color: '#FBBF24', fontSize: '0.72rem', fontWeight: 800 }}>Não atribuído</span>
                          ) : (
                            <span style={{ color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 700 }}>{lead.assignedTo}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            background: 'var(--adm-bg-input)',
                            color: col.headerColor,
                            border: `1px solid ${col.borderColor}`,
                            borderRadius: '8px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            {renderColumnIcon(lead.stage, 12)}
                            <span>{col.title}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLeadWorkspace(lead);
                            }}
                            style={{
                              background: isPostSaleView ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-accent-bg)',
                              border: `1px solid ${isPostSaleView ? '#06B6D4' : 'var(--adm-accent)'}`,
                              color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação para Reabertura de Negociação de Lead Ganho */}
      {reopeningLeadConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--adm-bg-card, #1E293B)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EAB308',
                flexShrink: 0,
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                  Reabrir Negociação?
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                  Lead: <strong>{reopeningLeadConfirm.lead.name}</strong>
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: 'var(--adm-text-title, #FFFFFF)',
              lineHeight: 1.5,
            }}>
              Este lead já teve a <strong>venda fechada</strong> e é considerado um cliente ativo no sistema. Mover este lead para uma etapa anterior reabrirá a negociação no funil comercial.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setReopeningLeadConfirm(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--adm-border, rgba(255,255,255,0.15))',
                  backgroundColor: 'transparent',
                  color: 'var(--adm-text-muted, #94A3B8)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReopenNegotiation}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#EAB308',
                  color: '#000000',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
                }}
              >
                Sim, Reabrir Negociação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Deal Modal */}
      <CloseDealValueModal
        isOpen={isCloseDealModalOpen}
        onClose={() => setIsCloseDealModalOpen(false)}
        lead={dealModalLead}
        onConfirmSale={handleConfirmSale}
      />

      {/* Mandatory Lost Reason Modal */}
      <AdminLostReasonModal
        isOpen={isLostReasonModalOpen}
        onClose={() => {
          setIsLostReasonModalOpen(false);
          setLostReasonLead(null);
        }}
        lead={lostReasonLead}
        onConfirm={handleConfirmLost}
      />

      {/* Missing Fields Modal */}
      <AdminLeadMissingFieldsModal
        isOpen={isMissingFieldsModalOpen}
        onClose={() => setIsMissingFieldsModalOpen(false)}
        onOpenInspector={() => {
          if (missingFieldsLead) {
            handleOpenLeadWorkspace(missingFieldsLead);
          }
        }}
        lead={missingFieldsLead}
        missingFields={missingFieldsList}
      />

      {/* New Lead Modal */}
      <AdminNewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        defaultFunnelId={selectedFunnelId}
        defaultVenueId={activeVenueId}
        onLeadCreated={(newLeadId) => {
          setActiveLeadIdForWorkspace(newLeadId);
        }}
      />
    </div>
  );
};

