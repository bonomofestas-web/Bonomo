import React, { useState, useEffect, useMemo } from 'react';
import { 
  Kanban, List, Search, Building2,
  Inbox, Clock, Calendar, DollarSign, XCircle,
  ChevronDown, Plus, Layers,
  ArrowRight, CheckCircle2, Users, X,
  Crown, Megaphone, Handshake, Sparkles, Target,
  Settings, Shield, Lock, Trash2, Pin,
  Flame, Zap, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Gift, FileText,
  Compass, ShieldCheck, Star, ShoppingBag, Music, Camera,
  UserPlus, Eye
} from 'lucide-react';
import { AdminNewLeadModal } from './AdminNewLeadModal';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import type { FilterState } from './AdminFilterBar';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { CloseDealValueModal } from './CloseDealValueModal';
import { ImageUploadField } from './ImageUploadField';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Lead, CrmStage, CommercialFunnel, FunnelStageConfig, FunnelCustomField, FunnelFieldType } from '../../types/admin';

interface AdminCrmKanbanViewProps {
  initialLeadId?: string;
  activeFunnelId?: string | null;
  onSelectFunnel?: (funnelId: string | null) => void;
  onLeadOpened?: () => void;
}

const DEFAULT_FORM_STAGES: FunnelStageConfig[] = [
  { id: 'new_lead', name: 'Novo Lead', color: '#3B82F6', isFixed: true, order: 0 },
  { id: 'qualificacao', name: 'Qualificação / Contato', color: '#F59E0B', isFixed: false, order: 1 },
  { id: 'visita_agendada', name: 'Visita / Degustação Agendada', color: '#8B5CF6', isFixed: false, order: 2 },
  { id: 'deal_closed', name: 'Venda Fechada (Ganho)', color: '#10B981', isFixed: true, isWon: true, order: 3 },
  { id: 'lost', name: 'Perdido / Não Realizado', color: '#EF4444', isFixed: true, isLoss: true, order: 4 },
];

const AVAILABLE_FUNNEL_ICONS = [
  { id: 'target', label: 'Alvo / Meta', icon: Target },
  { id: 'megaphone', label: 'Marketing / Anúncios', icon: Megaphone },
  { id: 'handshake', label: 'Parcerias / B2B', icon: Handshake },
  { id: 'crown', label: 'VIP / Indicação', icon: Crown },
  { id: 'sparkles', label: 'Experiência VIP', icon: Sparkles },
  { id: 'flame', label: 'Alta Conversão', icon: Flame },
  { id: 'zap', label: 'Vendas Rápidas', icon: Zap },
  { id: 'dollar', label: 'Contratos / Finanças', icon: DollarSign },
  { id: 'rocket', label: 'Lançamento', icon: Rocket },
  { id: 'trophy', label: 'Destaque', icon: Trophy },
  { id: 'heart', label: 'Fidelização', icon: Heart },
  { id: 'radio', label: 'Tráfego Pago', icon: Radio },
  { id: 'phone', label: 'Televendas / Call', icon: PhoneCall },
  { id: 'message', label: 'WhatsApp / Chat', icon: MessageSquare },
  { id: 'gift', label: 'Benefícios', icon: Gift },
  { id: 'compass', label: 'Prospecção', icon: Compass },
  { id: 'shield', label: 'Corporativo', icon: ShieldCheck },
  { id: 'star', label: 'Exclusivo', icon: Star },
  { id: 'shop', label: 'Pacotes / Loja', icon: ShoppingBag },
  { id: 'music', label: 'Festas & Shows', icon: Music },
  { id: 'camera', label: 'Eventos & Fotos', icon: Camera },
];

const FUNNEL_CATEGORIES = [
  { id: 'Marketing Digital', label: 'Marketing Digital / Ads', icon: Radio, color: '#3B82F6', badgeBg: 'rgba(59,130,246,0.15)' },
  { id: 'Parcerias Estratégicas', label: 'Parcerias & B2B', icon: Handshake, color: '#10B981', badgeBg: 'rgba(16,185,129,0.15)' },
  { id: 'Eventos Presenciais', label: 'Eventos & Degustações', icon: Sparkles, color: '#F59E0B', badgeBg: 'rgba(245,158,11,0.15)' },
  { id: 'Prospecção Ativa', label: 'Prospecção Ativa / Outbound', icon: PhoneCall, color: '#8B5CF6', badgeBg: 'rgba(139,92,246,0.15)' },
  { id: 'Indicações do App', label: 'Indicações do App', icon: Crown, color: '#D4AF37', badgeBg: 'rgba(212,175,55,0.15)' },
  { id: 'Pós-Venda', label: 'Pós-Venda & Onboarding', icon: ShieldCheck, color: '#06B6D4', badgeBg: 'rgba(6,182,212,0.15)' },
];

export const AdminCrmKanbanView: React.FC<AdminCrmKanbanViewProps> = ({
  initialLeadId,
  activeFunnelId,
  onSelectFunnel,
  onLeadOpened,
}) => {
  const { 
    leads, 
    venues,
    collaborators,
    currentUser,
    activeVenueId,
    funnels,
    addFunnel,
    updateFunnel,
    deleteFunnel,
    updateLeadStage,
    closeLeadSaleWithValue,
    getFeatureStatus,
  } = useAdminState();

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

  // Active Funnel selection: null = Hub de Funis (Cards), or 'indicacao', 'trafego', etc.
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(
    activeFunnelId !== undefined ? activeFunnelId : (initialLeadId ? 'indicacao' : null)
  );
  const [funnelSearch, setFunnelSearch] = useState('');

  // Funnel Configuration & Access Modal
  const [funnelToConfigure, setFunnelToConfigure] = useState<CommercialFunnel | null>(null);
  const [isCreateFunnelModalOpen, setIsCreateFunnelModalOpen] = useState(false);
  
  // Create / Edit Funnel Form State
  const [formFunnelName, setFormFunnelName] = useState('');
  const [formFunnelCategory, setFormFunnelCategory] = useState('Marketing Digital');
  const [formFunnelDescription, setFormFunnelDescription] = useState('');
  const [formFunnelVenueId, setFormFunnelVenueId] = useState('');
  const [formFunnelIcon, setFormFunnelIcon] = useState('target');
  const [formCustomImageUrl, setFormCustomImageUrl] = useState('');
  const [iconMode, setIconMode] = useState<'icon' | 'image'>('icon');
  const [formAccessMode, setFormAccessMode] = useState<'all' | 'custom'>('all');
  const [formAllowedCollaboratorIds, setFormAllowedCollaboratorIds] = useState<string[]>([]);
  const [formStages, setFormStages] = useState<FunnelStageConfig[]>(DEFAULT_FORM_STAGES);
  const [formCustomFields, setFormCustomFields] = useState<FunnelCustomField[]>([]);
  const [formIsPostSale, setFormIsPostSale] = useState(false);

  // View mode inside funnel
  const [viewMode, setViewMode] = useState<'workspace' | 'kanban' | 'list'>(initialLeadId ? 'workspace' : 'kanban');
  const [search, setSearch] = useState('');
  const [activeLeadIdForWorkspace, setActiveLeadIdForWorkspace] = useState<string | null>(initialLeadId || null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

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

  // New Lead modal state
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Check if current user is manager (Master or Admin)
  const canConfigureFunnels = currentUser?.role === 'master' || currentUser?.role === 'admin';

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

  // Open Create Funnel Modal (optionally with pre-selected venue)
  const handleOpenCreateFunnel = (targetVenueId?: string) => {
    setFormFunnelName('');
    setFormFunnelCategory('Vendas & Atendimento');
    setFormFunnelDescription('');
    setFormFunnelVenueId(targetVenueId || activeVenueId || (venues[0]?.id || ''));
    setFormFunnelIcon('target');
    setFormCustomImageUrl('');
    setIconMode('icon');
    setFormAccessMode('all');
    setFormAllowedCollaboratorIds([]);
    setFormStages(DEFAULT_FORM_STAGES);
    setFormCustomFields([]);
    setFormIsPostSale(false);
    setFunnelToConfigure(null);
    setIsCreateFunnelModalOpen(true);
  };

  // Open Edit / Configure Funnel Modal
  const handleOpenConfigureFunnel = (funnel: CommercialFunnel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFunnelToConfigure(funnel);
    setFormFunnelName(funnel.name);
    setFormFunnelCategory(funnel.category);
    setFormFunnelDescription(funnel.description || '');
    setFormFunnelVenueId(funnel.venueId || (venues[0]?.id || ''));
    setFormFunnelIcon(funnel.icon || 'target');
    setFormCustomImageUrl(funnel.customImageUrl || '');
    setIconMode(funnel.customImageUrl ? 'image' : 'icon');
    const hasCustomAccess = funnel.allowedCollaboratorIds && funnel.allowedCollaboratorIds.length > 0;
    setFormAccessMode(hasCustomAccess ? 'custom' : 'all');
    setFormAllowedCollaboratorIds(funnel.allowedCollaboratorIds || []);
    setFormStages(funnel.stages && funnel.stages.length > 0 ? funnel.stages : DEFAULT_FORM_STAGES);
    setFormCustomFields(funnel.customFields || []);
    setFormIsPostSale(funnel.isPostSale === true || funnel.category === 'Pós-Venda');
    setIsCreateFunnelModalOpen(true);
  };

  // Stage Helpers
  const handleAddIntermediateStage = () => {
    const newStage: FunnelStageConfig = {
      id: `stage_${Date.now()}`,
      name: 'Nova Etapa',
      color: '#8B5CF6',
      isFixed: false,
      order: formStages.length - 2, // Before won and loss
    };
    // Insert before the last two fixed stages (won and lost)
    const fixedEnd = formStages.filter(s => s.isWon || s.isLoss);
    const middleAndStart = formStages.filter(s => !s.isWon && !s.isLoss);
    setFormStages([...middleAndStart, newStage, ...fixedEnd]);
  };

  const handleUpdateStage = (id: string, updates: Partial<FunnelStageConfig>) => {
    setFormStages(formStages.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRemoveStage = (id: string) => {
    setFormStages(formStages.filter(s => s.id !== id || s.isFixed));
  };

  // Custom Fields Helpers
  const handleAddCustomField = () => {
    const newField: FunnelCustomField = {
      id: `field_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      required: false,
      placeholder: 'Preencha...',
    };
    setFormCustomFields([...formCustomFields, newField]);
  };

  const handleUpdateCustomField = (id: string, updates: Partial<FunnelCustomField>) => {
    setFormCustomFields(formCustomFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setFormCustomFields(formCustomFields.filter(f => f.id !== id));
  };

  // Save Funnel (Create or Update)
  const handleSaveFunnel = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formFunnelName.trim()) return;

    const targetVenueId = formFunnelVenueId || venues[0]?.id;
    if (!targetVenueId || targetVenueId === 'all') {
      alert('Por favor, selecione uma Casa de Festas para vincular este funil.');
      return;
    }

    const allowedIds = formAccessMode === 'custom' ? formAllowedCollaboratorIds : [];
    const finalCustomImage = iconMode === 'image' && formCustomImageUrl.trim() ? formCustomImageUrl.trim() : undefined;
    const finalIsPostSale = formIsPostSale || formFunnelCategory === 'Pós-Venda';

    if (funnelToConfigure) {
      updateFunnel(funnelToConfigure.id, {
        name: formFunnelName.trim(),
        category: formFunnelCategory.trim(),
        description: formFunnelDescription.trim(),
        venueId: targetVenueId,
        icon: formFunnelIcon,
        customImageUrl: finalCustomImage,
        allowedCollaboratorIds: allowedIds,
        stages: formStages,
        customFields: formCustomFields,
        isPostSale: finalIsPostSale,
        allowedRoles: finalIsPostSale ? ['pos_venda'] : undefined,
      });
    } else {
      addFunnel({
        name: formFunnelName.trim(),
        category: formFunnelCategory.trim(),
        description: formFunnelDescription.trim(),
        venueId: targetVenueId,
        allowedCollaboratorIds: allowedIds,
        badge: formFunnelCategory,
        badgeColor: finalIsPostSale ? '#06B6D4' : '#3B82F6',
        icon: formFunnelIcon,
        customImageUrl: finalCustomImage,
        isPinned: false,
        stagesCount: formStages.length,
        stages: formStages,
        customFields: formCustomFields,
        isPrimary: false,
        isDemo: false,
        isPostSale: finalIsPostSale,
        allowedRoles: finalIsPostSale ? ['pos_venda'] : undefined,
      });
    }

    setIsCreateFunnelModalOpen(false);
    setFunnelToConfigure(null);
  };

  // Toggle Collaborator in Access List
  const handleToggleAllowedCollaborator = (collabId: string) => {
    setFormAllowedCollaboratorIds(prev => 
      prev.includes(collabId) ? prev.filter(id => id !== collabId) : [...prev, collabId]
    );
  };

  // Computed Funnels List based on Venues, Permissions, and Real-time Leads
  const funnelsList = useMemo(() => {
    return funnels.filter(funnel => {
      // 1. Venue Filter
      if (activeVenueId) {
        if (funnel.venueId !== activeVenueId) return false;
      }
      if (userAllowedVenueIds !== null && userAllowedVenueIds.length > 0) {
        if (!userAllowedVenueIds.includes(funnel.venueId)) return false;
      }

      // 2. Collaborator Access Restriction (Managers/Master can see all; regular SDRs/Closers see only allowed)
      if (!canConfigureFunnels && funnel.allowedCollaboratorIds && funnel.allowedCollaboratorIds.length > 0 && currentUser?.id) {
        if (!funnel.allowedCollaboratorIds.includes(currentUser.id)) return false;
      }

      return true;
    }).map(funnel => {
      // Calculate dynamic metrics per funnel strictly for this funnel's venue
      const funnelLeads = leads.filter(l => l.venueId === funnel.venueId);

      const referralTotalRevenue = funnelLeads
        .filter(l => l.stage === 'contract_signed')
        .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

      const referralConversion = funnelLeads.length > 0
        ? Math.round((funnelLeads.filter(l => l.stage === 'contract_signed').length / funnelLeads.length) * 100)
        : 0;

      const venue = venues.find(v => v.id === funnel.venueId);

      return {
        ...funnel,
        venueName: venue?.name || 'Casa de Festas',
        venueLogo: venue?.logoUrl,
        venueBallroom: venue?.ballroomImageUrl,
        venueAddress: venue?.address,
        leadCount: funnelLeads.length,
        openPipelineValue: referralTotalRevenue || 0,
        conversionRate: referralConversion || 0,
        buttonText: 'Acessar Funil',
      };
    });
  }, [funnels, leads, venues, activeVenueId, userAllowedVenueIds, canConfigureFunnels, currentUser]);

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
      // 1. Mandatory Strict Venue Isolation for Selected Funnel
      if (currentFunnel && currentFunnel.venueId) {
        if (l.venueId !== currentFunnel.venueId) return false;
      } else if (activeVenueId) {
        if (l.venueId !== activeVenueId) return false;
      }

      // Ownership Filter: Meus Leads vs Todos
      if (leadOwnershipFilter === 'mine') {
        const isMine = l.sdrId === currentUser?.id || l.closerId === currentUser?.id || l.assignedTo === currentUser?.name;
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

  const renderColumnIcon = (stage: CrmStage, size = 15) => {
    switch (stage) {
      case 'new_lead': return <Inbox size={size} color="#60A5FA" />;
      case 'in_analysis': return <Clock size={size} color="#FBBF24" />;
      case 'meeting_scheduled': return <Calendar size={size} color="#A78BFA" />;
      case 'contract_signed': return <DollarSign size={size} color="#FFD700" />;
      case 'lost': return <XCircle size={size} color="#EF4444" />;
    }
  };

  const columns: { id: CrmStage; title: string; headerColor: string; borderColor: string }[] = [
    { id: 'new_lead', title: 'Novo Lead', headerColor: '#60A5FA', borderColor: 'rgba(96, 165, 250, 0.4)' },
    { id: 'in_analysis', title: 'Em Análise', headerColor: '#FBBF24', borderColor: 'rgba(251, 191, 36, 0.4)' },
    { id: 'meeting_scheduled', title: 'Reunião / Degustação', headerColor: '#A78BFA', borderColor: 'rgba(167, 139, 250, 0.4)' },
    { id: 'contract_signed', title: 'Contrato Fechado (Venda VIP)', headerColor: '#FFD700', borderColor: 'rgba(255, 215, 0, 0.5)' },
    { id: 'lost', title: 'Perdido / Recusado', headerColor: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' },
  ];

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

  const handleDrop = (e: React.DragEvent, targetStage: CrmStage) => {
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

    if (targetStage === 'contract_signed') {
      setDealModalLead(lead);
      setIsCloseDealModalOpen(true);
    } else {
      updateLeadStage(leadId, targetStage);
    }
    setDraggedLeadId(null);
  };

  const handleConfirmSale = (leadId: string, dealValue: number, packageSold: string, contractDate: string) => {
    closeLeadSaleWithValue(leadId, dealValue, packageSold, contractDate);
  };

  const handleOpenLeadWorkspace = (lead: Lead) => {
    setActiveLeadIdForWorkspace(lead.id);
    setViewMode('workspace');
  };

  const handleWhatsApp = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnlyForPosVenda || isLeadSpectator(lead)) {
      alert('Modo Espectador: O contato comercial direto é reservado ao responsável designado pelo lead.');
      return;
    }
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const text = `Olá, ${lead.name}! Tudo bem?\nRecebemos sua indicação através da debutante ${lead.debutanteName} para conhecer os pacotes de 15 Anos da Bonomo Festas!\nPodemos agendar uma visita/degustação?`;
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // ── Render Funnel Configuration / Creation Modal ──
  const renderFunnelConfigModal = () => {
    if (!isCreateFunnelModalOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}>
        <div style={{
          background: 'var(--adm-bg-card)',
          border: funnelToConfigure?.isPrimary ? '1.5px solid rgba(212,175,55,0.4)' : '1px solid var(--adm-border)',
          borderRadius: '20px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: funnelToConfigure?.isPrimary ? 'rgba(212,175,55,0.15)' : 'var(--adm-accent-bg)',
                border: `1px solid ${funnelToConfigure?.isPrimary ? 'var(--adm-accent)' : 'var(--adm-accent)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--adm-accent)',
              }}>
                {funnelToConfigure?.isPrimary ? <Crown size={20} /> : <Settings size={20} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                    {funnelToConfigure 
                      ? (funnelToConfigure.isPrimary ? 'Controle de Acesso • Funil de Indicação' : 'Configurações do Funil')
                      : 'Novo Pipeline Comercial'
                    }
                  </h3>
                  {funnelToConfigure?.isPrimary && (
                    <span style={{ fontSize: '0.64rem', background: 'rgba(212,175,55,0.2)', color: 'var(--adm-accent)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      Padrão do Sistema
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  {funnelToConfigure?.isPrimary 
                    ? 'Funil estrutural integrado às indicações das debutantes e convidadas'
                    : 'Defina a casa vinculada, categoria e permissões de acesso'
                  }
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateFunnelModalOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSaveFunnel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ── CASO 1: FUNIL PADRÃO DE INDICAÇÃO (ESTRUTURA FIXA E PROTEGIDA) ── */}
            {funnelToConfigure?.isPrimary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Banner Informativo */}
                <div style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.25)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <Sparkles size={18} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', lineHeight: 1.5 }}>
                    <strong>Funil Padrão e Vitalício:</strong> Este é o funil nativo do ecossistema de indicações. Seu nome, categoria, casa vinculada e identidade visual são pré-definidos para garantir a integridade dos pontos e relatórios. Você pode gerenciar abaixo quais membros da equipe têm acesso a ele.
                  </div>
                </div>

                {/* Card de Resumo Fixo */}
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Nome do Funil
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                      {funnelToConfigure.name}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Casa de Festas Vinculada
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-accent)', marginTop: '2px' }}>
                      🏢 {venues.find(v => v.id === funnelToConfigure.venueId)?.name || 'Casa Principal'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Categoria
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', marginTop: '2px' }}>
                      👑 Indicações do App
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                      Status do Funil
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      ● Ativo & Protegido
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── CASO 2: FUNIL PERSONALIZADO / NOVO FUNIL (CONFIGURAÇÃO COMPLETA) ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Nome do Funil */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Nome do Funil *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tráfego Pago & Meta Ads • Unidade Barra"
                    value={formFunnelName}
                    onChange={(e) => setFormFunnelName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '11px 14px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.86rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Seletor Visual de Casa de Festas Vinculada */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Casa de Festas Vinculada *
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: venues.length > 1 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
                    gap: '8px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}>
                    {venues.map(v => {
                      const isSelected = formFunnelVenueId === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setFormFunnelVenueId(v.id)}
                          style={{
                            background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                            border: `1.5px solid ${isSelected ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                            borderRadius: '12px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {v.logoUrl ? (
                            <img
                              src={v.logoUrl}
                              alt={v.name}
                              style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(0,0,0,0.5)', padding: '3px', border: '1px solid var(--adm-border)' }}
                            />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--adm-bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-accent)' }}>
                              <Building2 size={16} />
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.address}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={16} color="var(--adm-accent)" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seletor Visual de Categoria / Origem */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Categoria / Canal de Origem
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '8px',
                  }}>
                    {FUNNEL_CATEGORIES.map(cat => {
                      const isSelected = formFunnelCategory === cat.id;
                      const CatIcon = cat.icon;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setFormFunnelCategory(cat.id);
                            if (cat.id === 'Pós-Venda') setFormIsPostSale(true);
                          }}
                          style={{
                            background: isSelected ? cat.badgeBg : 'var(--adm-bg-input)',
                            border: `1.5px solid ${isSelected ? cat.color : 'var(--adm-border)'}`,
                            borderRadius: '10px',
                            padding: '9px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <CatIcon size={16} color={cat.color} />
                          <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--adm-text-title)' : 'var(--adm-text-muted)' }}>
                            {cat.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Finalidade do Funil: Pós-Venda */}
                <div
                  onClick={() => setFormIsPostSale(!formIsPostSale)}
                  style={{
                    background: formIsPostSale ? 'rgba(6, 182, 212, 0.1)' : 'var(--adm-bg-input)',
                    border: `1.5px solid ${formIsPostSale ? '#06B6D4' : 'var(--adm-border)'}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: formIsPostSale ? '#06B6D4' : 'var(--adm-bg-card)',
                      border: `1px solid ${formIsPostSale ? '#06B6D4' : 'var(--adm-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: formIsPostSale ? '#FFFFFF' : 'var(--adm-text-muted)',
                      flexShrink: 0,
                    }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: formIsPostSale ? '#06B6D4' : 'var(--adm-text-title)' }}>
                        Funil Destinado a Pós-Venda & Onboarding
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        Permite que a equipe de Pós-Venda interaja com leads, crie anotações, tarefas e mova etapas livremente neste funil.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsPostSale}
                    onChange={(e) => setFormIsPostSale(e.target.checked)}
                    style={{ accentColor: '#06B6D4', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Descrição Comercial
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descrição do objetivo e etapas deste funil..."
                    value={formFunnelDescription}
                    onChange={(e) => setFormFunnelDescription(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Identidade Visual do Funil */}
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Identidade Visual do Funil
                    </span>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--adm-bg-card)', padding: '3px', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                      <button
                        type="button"
                        onClick={() => setIconMode('icon')}
                        style={{
                          background: iconMode === 'icon' ? 'var(--adm-accent-bg)' : 'transparent',
                          border: iconMode === 'icon' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                          color: iconMode === 'icon' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Ícone
                      </button>
                      <button
                        type="button"
                        onClick={() => setIconMode('image')}
                        style={{
                          background: iconMode === 'image' ? 'var(--adm-accent-bg)' : 'transparent',
                          border: iconMode === 'image' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                          color: iconMode === 'image' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Foto (400x400)
                      </button>
                    </div>
                  </div>

                  {iconMode === 'icon' ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '8px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}>
                      {AVAILABLE_FUNNEL_ICONS.map(item => {
                        const isSelected = formFunnelIcon === item.id;
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setFormFunnelIcon(item.id)}
                            style={{
                              background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                              border: isSelected ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                              borderRadius: '10px',
                              padding: '8px 6px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                              color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                            }}
                          >
                            <IconComp size={18} color={isSelected ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} />
                            <span style={{ fontSize: '0.64rem', fontWeight: isSelected ? 800 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <ImageUploadField
                        label="Foto ou Banner do Funil"
                        helperText="A foto será redimensionada e comprimida automaticamente para 400x400 pixels."
                        aspectRatio="1:1"
                        previewHeight="120px"
                        value={formCustomImageUrl}
                        onChange={(url) => setFormCustomImageUrl(url)}
                        folder="funnels"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ETAPAS DO FUNIL (PIPELINE STAGES) ── */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="var(--adm-accent)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Etapas do Funil Comercial
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddIntermediateStage}
                  style={{
                    background: 'var(--adm-accent-bg)',
                    border: '1px solid var(--adm-accent)',
                    color: 'var(--adm-accent)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  <span>Nova Etapa</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formStages.map((stg) => (
                  <div
                    key={stg.id}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: `1px solid ${stg.isFixed ? 'rgba(212,175,55,0.2)' : 'var(--adm-border)'}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: stg.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }} />
                      {stg.isFixed ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {stg.name} <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>(Fixa)</span>
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={stg.name}
                          onChange={(e) => handleUpdateStage(stg.id, { name: e.target.value })}
                          style={{
                            background: 'transparent',
                            border: '1px solid transparent',
                            color: 'var(--adm-text-title)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            width: '100%',
                            outline: 'none',
                          }}
                          onFocus={(e) => { e.target.style.background = 'var(--adm-bg-input)'; e.target.style.borderColor = 'var(--adm-accent)'; }}
                          onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                        />
                      )}
                    </div>

                    {!stg.isFixed && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stg.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                        }}
                        title="Remover etapa"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── CAMPOS PERSONALIZADOS DA FICHA DO LEAD ── */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="var(--adm-accent)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Campos Extras da Ficha do Lead
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  style={{
                    background: 'var(--adm-accent-bg)',
                    border: '1px solid var(--adm-accent)',
                    color: 'var(--adm-accent)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  <span>Novo Campo</span>
                </button>
              </div>

              {formCustomFields.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  Nenhum campo personalizado adicionado a este funil.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formCustomFields.map(field => (
                    <div
                      key={field.id}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Nome do campo..."
                        value={field.label}
                        onChange={(e) => handleUpdateCustomField(field.id, { label: e.target.value })}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.76rem',
                          outline: 'none',
                        }}
                      />

                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateCustomField(field.id, { type: e.target.value as FunnelFieldType })}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.76rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="text">Texto Livre</option>
                        <option value="date">Data</option>
                        <option value="number">Número</option>
                        <option value="todo">Checklist / Tarefa</option>
                        <option value="select">Seleção (Dropdown)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                        }}
                        title="Remover campo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── CONTROLE DE ACESSO & PRIVACIDADE DO FUNIL (COM PROTEÇÃO HIERÁRQUICA) ── */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} color="var(--adm-accent)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Controle de Acessos & Permissões da Equipe
                  </span>
                </div>
                <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                  {currentUser?.role === 'master' ? 'Acesso Master Total' : 'Permissões por Hierarquia'}
                </span>
              </div>

              {/* Radio Selector: All Team vs Restricted */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setFormAccessMode('all')}
                  style={{
                    background: formAccessMode === 'all' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                    border: `1.5px solid ${formAccessMode === 'all' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="funnelAccessMode"
                    checked={formAccessMode === 'all'}
                    onChange={() => setFormAccessMode('all')}
                    style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: formAccessMode === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                      👥 Todo o Time (Padrão)
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      Visível a todos os membros da casa
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setFormAccessMode('custom')}
                  style={{
                    background: formAccessMode === 'custom' ? 'rgba(234, 179, 8, 0.12)' : 'var(--adm-bg-card)',
                    border: `1.5px solid ${formAccessMode === 'custom' ? '#EAB308' : 'var(--adm-border)'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="funnelAccessMode"
                    checked={formAccessMode === 'custom'}
                    onChange={() => setFormAccessMode('custom')}
                    style={{ accentColor: '#EAB308', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: formAccessMode === 'custom' ? '#EAB308' : 'var(--adm-text-title)' }}>
                      🔒 Acesso Restrito
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      Selecionar colaboradores
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaborator Checkboxes when Custom Access is selected */}
              {formAccessMode === 'custom' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '8px',
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Selecione os colaboradores autorizados a visualizar e interagir com este funil:
                  </div>

                  {collaborators
                    .filter(c => c.active && c.role !== 'master') // Master always has root access and is excluded from checklist
                    .map(collab => {
                      const isChecked = formAllowedCollaboratorIds.includes(collab.id);
                      
                      // Hierarchy check: can the current user toggle this collaborator's access?
                      const canModify = currentUser?.role === 'master' || 
                        (currentUser?.role === 'admin' && collab.role !== 'master' && collab.role !== 'admin') ||
                        (currentUser?.role === 'crm' && (collab.role === 'sdr' || collab.role === 'closer'));

                      return (
                        <div
                          key={collab.id}
                          onClick={() => {
                            if (canModify) handleToggleAllowedCollaborator(collab.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isChecked ? 'var(--adm-accent-bg)' : 'transparent',
                            border: `1px solid ${isChecked ? 'var(--adm-accent)' : 'transparent'}`,
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: canModify ? 'pointer' : 'not-allowed',
                            opacity: canModify ? 1 : 0.6,
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!canModify}
                              onChange={() => {}}
                              style={{ accentColor: 'var(--adm-accent)', cursor: canModify ? 'pointer' : 'not-allowed' }}
                            />
                            {collab.avatarUrl ? (
                              <img
                                src={collab.avatarUrl}
                                alt={collab.name}
                                style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.66rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {collab.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                              {collab.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {!canModify && (
                              <span title="Permissão bloqueada por hierarquia de cargo" style={{ display: 'flex', alignItems: 'center' }}>
                                <Lock size={12} color="var(--adm-text-muted)" />
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: collab.role === 'closer' ? 'rgba(249, 115, 22, 0.15)' : collab.role === 'sdr' ? 'rgba(139, 92, 246, 0.15)' : 'var(--adm-bg-input)',
                              color: collab.role === 'closer' ? '#FB923C' : collab.role === 'sdr' ? '#A78BFA' : 'var(--adm-text-muted)',
                            }}>
                              {collab.role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              {funnelToConfigure && !funnelToConfigure.isPrimary ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja excluir o funil "${funnelToConfigure.name}"?`)) {
                      deleteFunnel(funnelToConfigure.id);
                      setIsCreateFunnelModalOpen(false);
                      setFunnelToConfigure(null);
                    }
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={13} />
                  <span>Excluir Funil</span>
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateFunnelModalOpen(false)}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="adm-btn-primary"
                  style={{
                    borderRadius: '10px',
                    padding: '8px 18px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  <span>{funnelToConfigure ? 'Salvar Configurações' : 'Criar e Acessar'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const displayedFunnels = useMemo(() => {
    if (!funnelSearch.trim()) return funnelsList;
    const q = funnelSearch.toLowerCase();
    return funnelsList.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q) || (f.venueName || '').toLowerCase().includes(q));
  }, [funnelsList, funnelSearch]);

  const visibleVenues = useMemo(() => {
    let list = venues;
    if (activeVenueId) {
      list = list.filter(v => v.id === activeVenueId);
    }
    if (userAllowedVenueIds !== null && userAllowedVenueIds.length > 0) {
      list = list.filter(v => userAllowedVenueIds.includes(v.id));
    }
    return list;
  }, [venues, activeVenueId, userAllowedVenueIds]);

  if (!selectedFunnelId) {
    const totalPipelineSum = funnelsList.reduce((acc, curr) => acc + curr.openPipelineValue, 0);
    const totalLeadsSum = funnelsList.reduce((acc, curr) => acc + curr.leadCount, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '24px 32px 60px 32px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.25s ease-out', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Main Title & Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Target size={24} color="var(--adm-accent)" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--adm-text-title)', letterSpacing: '-0.4px', margin: 0 }}>
                Central de Funis Comerciais
              </h1>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '650px' }}>
              Pipelines de vendas estruturados e organizados por Casa de Festa. Gerencie oportunidades, mova etapas e acompanhe fechamentos.
            </p>
          </div>
          {canConfigureFunnels && venues.length > 0 && (
            <button onClick={() => handleOpenCreateFunnel()} className="adm-btn-primary" style={{ padding: '8px 18px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> <span>Criar Novo Funil</span>
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
              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Unidades com Funis</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{visibleVenues.length} Casas</div>
            </div>
          </div>
        </div>

        {/* Search Bar for Funnels */}
        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          <input type="text" placeholder="Buscar por nome do funil, canal ou casa..." value={funnelSearch} onChange={(e) => setFunnelSearch(e.target.value)} style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px 14px 10px 42px', color: 'var(--adm-text-title)', fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* SECTIONS GROUPED STRICTLY BY CASA DE FESTA (CLEAN TEXT HEADERS)       */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {visibleVenues.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
              <Building2 size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>Nenhuma Casa de Festa Encontrada</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>Cadastre uma casa de festas para vincular funis comerciais e gerenciar vendas.</p>
            </div>
          </div>
        ) : (
          visibleVenues.map(venue => {
            const venueFunnels = displayedFunnels.filter(f => f.venueId === venue.id);
            const venueLeads = leads.filter(l => l.venueId === venue.id);
            const venuePipelineValue = venueLeads
              .filter(l => l.stage === 'contract_signed')
              .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

            // If user typed a search query and no funnels match for this venue, hide venue section
            if (funnelSearch.trim() && venueFunnels.length === 0) return null;

            return (
              <div
                key={venue.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginBottom: '10px',
                }}
              >
                {/* Clean, Simple Venue Header (No bulky container) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  borderBottom: '1.5px solid var(--adm-border)',
                  paddingBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.28rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
                      {venue.name}
                    </h2>
                    <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                      {venueFunnels.length} {venueFunnels.length === 1 ? 'funil ativo' : 'funis ativos'} • {venueLeads.length} oportunidades • Fechado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(venuePipelineValue)}
                    </span>
                  </div>

                  {canConfigureFunnels && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFunnel(venue.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--adm-accent)';
                        e.currentTarget.style.color = 'var(--adm-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--adm-border)';
                        e.currentTarget.style.color = 'var(--adm-text-title)';
                      }}
                    >
                      <Plus size={14} color="var(--adm-accent)" />
                      <span>Criar Novo Funil</span>
                    </button>
                  )}
                </div>

                {/* Grid of Funnel Cards for this Venue */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {venueFunnels.map(funnel => (
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
                              <span>{funnel.badge}</span>
                            </span>

                            {/* Venue Badge */}
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
                              <span>{funnel.venueName}</span>
                            </span>

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
                                title="Configurações, Identidade e Permissões do Funil"
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
                            color: funnel.isPrimary ? '#000000' : 'var(--adm-text-title)',
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
                  ))}

                  {/* "+ Adicionar Funil" slot for this specific venue */}
                  {canConfigureFunnels && (
                    <div
                      onClick={() => handleOpenCreateFunnel(venue.id)}
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
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Criar Funil para {venue.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px', maxWidth: '220px' }}>Adicione tráfego pago, parcerias ou campanhas locais.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Funnel Configuration Modal */}
        {renderFunnelConfigModal()}
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
              placeholder="Buscar lead ou telefone..."
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
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
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
              Meus Leads
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
            <span>Adicionar Lead</span>
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
          </div>
        </div>
      </div>

      {viewMode === 'workspace' ? (
        <AdminWhatsAppWorkspaceView 
          initialLeadId={activeLeadIdForWorkspace || undefined}
          activeFunnelId={selectedFunnelId || undefined}
          isEmbeddedInFunnel={true}
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
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))`,
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '20px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              {columns.map(col => {
                const columnLeads = filteredLeads.filter(l => l.stage === col.id);

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
                      minHeight: '520px',
                      minWidth: '260px',
                    }}
                  >
                    {/* Column Header */}
                    <div style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--adm-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--adm-bg-elevated)',
                      borderTopLeftRadius: '14px',
                      borderTopRightRadius: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {renderColumnIcon(col.id, 14)}
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: col.headerColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {col.title}
                        </span>
                      </div>
                      <span style={{
                        background: 'var(--adm-bg-input)',
                        color: 'var(--adm-text-title)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '1px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        marginLeft: '4px',
                        flexShrink: 0,
                      }}>
                        {columnLeads.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div style={{
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
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
                          const hasNoAssignee = !lead.assignedTo || lead.assignedTo === 'Sem responsável' || lead.assignedTo === 'Não atribuído';
                          const assignedCollab = collaborators.find(c => c.id === lead.sdrId || c.id === lead.closerId || c.name === lead.assignedTo);

                          return (
                            <div
                              key={lead.id}
                              draggable={!isReadOnlyForPosVenda && !isLeadSpectator(lead)}
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => handleOpenLeadWorkspace(lead)}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--adm-accent)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--adm-border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              {/* Header: Name & Origin Badge on Top-Right */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--adm-text-title)', wordBreak: 'break-word' }}>
                                      {lead.name}
                                    </span>
                                    {isLeadSpectator(lead) && (
                                      <span title="Modo Espectador: visualização somente leitura" style={{ fontSize: '0.6rem', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '4px', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <Eye size={10} /> Espectador
                                      </span>
                                    )}
                                  </div>
                                  {lead.code && (!lead.name || lead.name === lead.code || lead.name.startsWith('LEAD-')) && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-accent)', letterSpacing: '0.5px' }}>
                                      {lead.code}
                                    </span>
                                  )}
                                </div>
                                {renderLeadOriginBadge(lead)}
                              </div>
                              {/* Casa de Festa Badge */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  color: '#818cf8',
                                  borderRadius: '6px',
                                  padding: '1px 6px',
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}>
                                  <Building2 size={10} /> {venues.find(v => v.id === lead.venueId)?.name || 'Espaço Rio Lounge'}
                                </span>
                              </div>

                              {/* Phone & Age */}
                              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                                {formatPhone(lead.phone)} • {lead.age} anos
                              </div>

                              {/* Referred By */}
                              <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                                Indicada por: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.debutanteName}</strong>
                              </div>

                              {/* Assignee Badge with Profile Picture */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderTop: '1px solid var(--adm-border)',
                                paddingTop: '8px',
                                marginTop: '4px',
                              }}>
                                {hasNoAssignee ? (
                                  <span style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#FBBF24',
                                    borderRadius: '6px',
                                    padding: '2px 6px',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                  }}>
                                    Não atribuído
                                  </span>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {assignedCollab?.avatarUrl ? (
                                      <img
                                        src={assignedCollab.avatarUrl}
                                        alt={assignedCollab.name}
                                        style={{
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '50%',
                                          objectFit: 'cover',
                                          border: '1px solid var(--adm-accent)',
                                        }}
                                      />
                                    ) : (
                                      <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: 'var(--adm-accent-bg)',
                                        color: 'var(--adm-accent)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                      }}>
                                        {(assignedCollab?.name || lead.assignedTo || 'U').charAt(0)}
                                      </div>
                                    )}
                                    <span style={{
                                      color: 'var(--adm-text-title)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                    }}>
                                      {assignedCollab?.name || lead.assignedTo}
                                    </span>
                                  </div>
                                )}

                                <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                                  {lead.activities?.length || 0} notas
                                </span>
                              </div>

                              {/* ICP Progress Bar in Kanban Card Bottom */}
                              {(() => {
                                if (getFeatureStatus('icp') === 'disabled') return null;
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
                                      borderRadius: '2px',
                                      background: 'rgba(255, 255, 255, 0.08)',
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
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Nome do Lead</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Telefone</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Idade / Origem</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Indicada por</th>
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
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: 'var(--adm-text-title)' }}>{lead.name}</td>
                        <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)' }}>{formatPhone(lead.phone)}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>{lead.age} anos ({lead.group})</span>
                            {renderLeadOriginBadge(lead)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--adm-accent)', fontWeight: 600 }}>{lead.debutanteName}</td>
                        <td style={{ padding: '12px 18px' }}>
                          {hasNoAssignee ? (
                            <span style={{ color: '#FBBF24', fontSize: '0.72rem', fontWeight: 800 }}>Não atribuído</span>
                          ) : (
                            <span style={{ color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 700 }}>{lead.assignedTo}</span>
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
                            onClick={(e) => handleWhatsApp(lead, e)}
                            style={{
                              background: 'rgba(37, 211, 102, 0.12)',
                              border: '1px solid #25D366',
                              color: '#25D366',
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            WhatsApp
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

      {/* Close Deal Modal */}
      <CloseDealValueModal
        isOpen={isCloseDealModalOpen}
        onClose={() => setIsCloseDealModalOpen(false)}
        lead={dealModalLead}
        onConfirmSale={handleConfirmSale}
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

      {/* Funnel Configuration Modal */}
      {renderFunnelConfigModal()}
    </div>
  );
};

