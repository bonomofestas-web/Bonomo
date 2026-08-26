import React, { useState, useEffect, useMemo } from 'react';
import { 
  Kanban, List, Search, Building2,
  Inbox, Clock, Calendar, DollarSign, XCircle,
  ChevronLeft, ChevronDown, Plus, Layers,
  ArrowRight, CheckCircle2, Users, X,
  Crown, Megaphone, Handshake, Sparkles, Target,
  Settings, Shield, Lock, Trash2, Pin,
  Flame, Zap, Rocket, Heart,
  Trophy, Radio, PhoneCall, MessageSquare, Gift,
  Compass, ShieldCheck, Star, ShoppingBag, Music, Camera
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminCrmWorkspaceView } from './AdminCrmWorkspaceView';
import { CloseDealValueModal } from './CloseDealValueModal';
import { ImageUploadField } from './ImageUploadField';
import type { Lead, CrmStage, CommercialFunnel } from '../../types/admin';

interface AdminCrmKanbanViewProps {
  initialLeadId?: string;
  activeFunnelId?: string | null;
  onSelectFunnel?: (funnelId: string | null) => void;
  onLeadOpened?: () => void;
}

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
    claimLeadIfUnassigned 
  } = useAdminState();

  // Active Funnel selection: null = Hub de Funis (Cards), or 'indicacao', 'trafego', etc.
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(
    activeFunnelId !== undefined ? activeFunnelId : (initialLeadId ? 'indicacao' : null)
  );
  const [isFunnelDropdownOpen, setIsFunnelDropdownOpen] = useState(false);
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
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [iconMode, setIconMode] = useState<'icon' | 'image'>('icon');
  const [formAccessMode, setFormAccessMode] = useState<'all' | 'custom'>('all');
  const [formAllowedCollaboratorIds, setFormAllowedCollaboratorIds] = useState<string[]>([]);

  // View mode inside funnel
  const [viewMode, setViewMode] = useState<'workspace' | 'kanban' | 'list'>(initialLeadId ? 'workspace' : 'kanban');
  const [search, setSearch] = useState('');
  const [activeLeadIdForWorkspace, setActiveLeadIdForWorkspace] = useState<string | null>(initialLeadId || null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    period: '7d',
    venueId: 'all',
    collaboratorId: 'all',
    debutanteId: 'all',
    sortBy: 'recent',
  });

  const sortOptions = [
    { id: 'recent', label: 'Mais Recentes (Data)' },
    { id: 'oldest', label: 'Mais Antigos (Data)' },
    { id: 'name_asc', label: 'Ordem Alfabética (A-Z)' },
    { id: 'name_desc', label: 'Ordem Alfabética (Z-A)' },
  ];

  // Close Deal modal state
  const [dealModalLead, setDealModalLead] = useState<Lead | null>(null);
  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);

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
    setIsFunnelDropdownOpen(false);
    if (onSelectFunnel) onSelectFunnel(id);
  };

  // Open Create Funnel Modal (optionally with pre-selected venue)
  const handleOpenCreateFunnel = (targetVenueId?: string) => {
    setFormFunnelName('');
    setFormFunnelCategory('Marketing Digital');
    setFormFunnelDescription('');
    setFormFunnelVenueId(targetVenueId || activeVenueId || (venues[0]?.id || ''));
    setFormFunnelIcon('target');
    setFormCustomImageUrl('');
    setFormIsPinned(false);
    setIconMode('icon');
    setFormAccessMode('all');
    setFormAllowedCollaboratorIds([]);
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
    setFormIsPinned(funnel.isPinned || false);
    setIconMode(funnel.customImageUrl ? 'image' : 'icon');
    const hasCustomAccess = funnel.allowedCollaboratorIds && funnel.allowedCollaboratorIds.length > 0;
    setFormAccessMode(hasCustomAccess ? 'custom' : 'all');
    setFormAllowedCollaboratorIds(funnel.allowedCollaboratorIds || []);
    setIsCreateFunnelModalOpen(true);
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

    if (funnelToConfigure) {
      updateFunnel(funnelToConfigure.id, {
        name: formFunnelName.trim(),
        category: formFunnelCategory.trim(),
        description: formFunnelDescription.trim(),
        venueId: targetVenueId,
        icon: formFunnelIcon,
        customImageUrl: finalCustomImage,
        isPinned: formIsPinned,
        allowedCollaboratorIds: allowedIds,
      });
    } else {
      addFunnel({
        name: formFunnelName.trim(),
        category: formFunnelCategory.trim(),
        description: formFunnelDescription.trim(),
        venueId: targetVenueId,
        allowedCollaboratorIds: allowedIds,
        badge: formFunnelCategory,
        badgeColor: '#3B82F6',
        icon: formFunnelIcon,
        customImageUrl: finalCustomImage,
        isPinned: formIsPinned,
        stagesCount: 4,
        isPrimary: false,
        isDemo: false,
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

  // Filter and Sort leads strictly isolated for the selected Funnel
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // 1. Mandatory Strict Venue Isolation for Selected Funnel
      if (currentFunnel && currentFunnel.venueId) {
        if (l.venueId !== currentFunnel.venueId) return false;
      } else if (activeVenueId) {
        if (l.venueId !== activeVenueId) return false;
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
  }, [leads, currentFunnel, activeVenueId, filterState, search]);

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
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: CrmStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const isPrivileged = currentUser?.role === 'master' || currentUser?.role === 'admin';
    if (currentUser?.role === 'sdr' && lead.sdrId && lead.sdrId !== currentUser.id && !isPrivileged) {
      alert(`Este lead já está sendo atendido por ${lead.assignedTo || 'outro SDR'}. Apenas Gerentes ou Master podem reatribuir.`);
      setDraggedLeadId(null);
      return;
    }

    if (lead.stage === 'new_lead' && targetStage !== 'new_lead') {
      claimLeadIfUnassigned(leadId);
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
    claimLeadIfUnassigned(lead.id);
    setViewMode('workspace');
  };

  const handleWhatsApp = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
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
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          maxWidth: '560px',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--adm-accent-bg)',
                border: '1px solid var(--adm-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--adm-accent)',
              }}>
                <Settings size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                  {funnelToConfigure ? 'Configurações do Funil' : 'Novo Pipeline Comercial'}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                  Defina a casa vinculada e controle quem tem acesso a este funil
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
          <form onSubmit={handleSaveFunnel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Nome do Funil */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Nome do Funil *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Funil de Indicação • Espaço Rio Lounge"
                value={formFunnelName}
                onChange={(e) => setFormFunnelName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Casa de Festas & Categoria */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Casa de Festas Vinculada *
                </label>
                <select
                  required
                  value={formFunnelVenueId}
                  onChange={(e) => setFormFunnelVenueId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {venues.length === 0 ? (
                    <option value="">Nenhuma casa cadastrada</option>
                  ) : (
                    venues.map(v => (
                      <option key={v.id} value={v.id}>🏢 {v.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Categoria / Origem
                </label>
                <select
                  value={formFunnelCategory}
                  onChange={(e) => setFormFunnelCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option>Indicações do App</option>
                  <option>Marketing Digital</option>
                  <option>Parcerias Estratégicas</option>
                  <option>Eventos Presenciais</option>
                  <option>Prospecção Ativa</option>
                </select>
              </div>
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
                }}
              />
            </div>

            {/* ── ÍCONE OU FOTO DO FUNIL (400x400) ── */}
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
                  maxHeight: '160px',
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
                  />
                </div>
              )}
            </div>

            {/* ── FIXAR NO MENU LATERAL (SIDEBAR) ── */}
            <div
              onClick={() => setFormIsPinned(!formIsPinned)}
              style={{
                background: formIsPinned ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                border: `1.5px solid ${formIsPinned ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Pin size={16} color={formIsPinned ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} style={{ transform: formIsPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: formIsPinned ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                    Fixar no Menu Lateral (Sidebar)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                    Exibe este funil com 1 clique na seção "FUNIS" da barra esquerda
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formIsPinned}
                onChange={() => {}}
                style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </div>

            {/* ── CONTROLE DE ACESSO & PRIVACIDADE DO FUNIL ── */}
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
                    Controle de Acessos & Privacidade
                  </span>
                </div>
                <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                  Exclusivo Gerência / Master
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
                      Todos os SDRs e Closers da casa
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
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  padding: '8px',
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '4px' }}>
                    Marque os colaboradores autorizados a visualizar este funil:
                  </div>

                  {collaborators.filter(c => c.active).map(collab => {
                    const isChecked = formAllowedCollaboratorIds.includes(collab.id);
                    return (
                      <div
                        key={collab.id}
                        onClick={() => handleToggleAllowedCollaborator(collab.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isChecked ? 'var(--adm-accent-bg)' : 'transparent',
                          border: `1px solid ${isChecked ? 'var(--adm-accent)' : 'transparent'}`,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                          />
                          {collab.avatarUrl && (
                            <img
                              src={collab.avatarUrl}
                              alt={collab.name}
                              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )}
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                            {collab.name}
                          </span>
                        </div>

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
                    deleteFunnel(funnelToConfigure.id);
                    setIsCreateFunnelModalOpen(false);
                    setFunnelToConfigure(null);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '24px 32px 60px 32px', maxWidth: '1560px', margin: '0 auto', animation: 'fadeIn 0.25s ease-out', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: viewMode === 'workspace' ? '12px' : '20px', padding: viewMode === 'workspace' ? '16px 24px 16px 24px' : '24px 32px 60px 32px', maxWidth: '1600px', margin: '0 auto', height: viewMode === 'workspace' ? 'calc(100vh - 64px)' : 'auto', boxSizing: 'border-box', overflow: viewMode === 'workspace' ? 'hidden' : 'visible', animation: 'fadeIn 0.25s ease-out', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => handleSelectFunnel(null)} title="Voltar para a Central de Funis" style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '6px 12px', color: 'var(--adm-text-title)', fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}><ChevronLeft size={14} /> <span>Todos os Funis</span></button>
          
          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsFunnelDropdownOpen(!isFunnelDropdownOpen)} style={{ background: 'var(--adm-bg-card)', border: '1.5px solid var(--adm-accent)', borderRadius: '12px', padding: '6px 14px', color: 'var(--adm-text-title)', fontSize: '0.94rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{renderFunnelVisual(currentFunnel || { icon: 'target' }, 15, 24)}</span>
              <span>{currentFunnel?.name || 'Funil Comercial'}</span>
              <ChevronDown size={14} color="var(--adm-accent)" />
            </button>
            {isFunnelDropdownOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '340px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px', padding: '8px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
                {visibleVenues.map(v => {
                  const vFunnels = funnelsList.filter(f => f.venueId === v.id);
                  if (vFunnels.length === 0) return null;
                  return (
                    <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.5px' }}>
                        🏢 {v.name}
                      </div>
                      {vFunnels.map(f => (
                        <button key={f.id} onClick={() => handleSelectFunnel(f.id)} style={{ background: f.id === selectedFunnelId ? 'var(--adm-accent-bg)' : 'transparent', border: 'none', borderRadius: '8px', padding: '8px 10px', color: f.id === selectedFunnelId ? 'var(--adm-accent)' : 'var(--adm-text-title)', fontSize: '0.8rem', fontWeight: f.id === selectedFunnelId ? 800 : 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>{renderFunnelVisual(f, 13, 20)}</span>
                          <span style={{ flex: 1 }}>{f.name}</span>
                          {f.isPinned && <Pin size={11} color="var(--adm-accent)" style={{ transform: 'rotate(45deg)' }} />}
                          {f.id === selectedFunnelId && <CheckCircle2 size={13} color="var(--adm-accent)" />}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canConfigureFunnels && currentFunnel && (
            <button
              onClick={() => handleOpenConfigureFunnel(currentFunnel)}
              title="Configurar Acessos e Casa de Festas deste Funil"
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '6px 12px',
                color: 'var(--adm-text-muted)',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
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
              <span>Configurar Funil & Acessos</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px' }}>
            <button onClick={() => setViewMode('kanban')} style={{ background: viewMode === 'kanban' ? 'var(--adm-accent-bg)' : 'transparent', color: viewMode === 'kanban' ? 'var(--adm-accent)' : 'var(--adm-text-muted)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Kanban size={14} /> Kanban</button>
            <button onClick={() => setViewMode('workspace')} style={{ background: viewMode === 'workspace' ? 'var(--adm-accent-bg)' : 'transparent', color: viewMode === 'workspace' ? 'var(--adm-accent)' : 'var(--adm-text-muted)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Inbox size={14} /> Entrada</button>
            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--adm-accent-bg)' : 'transparent', color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><List size={14} /> Tabela</button>
          </div>
        </div>
      </div>

      {viewMode === 'workspace' ? (
        <AdminCrmWorkspaceView 
          initialLeadId={activeLeadIdForWorkspace || undefined}
        />
      ) : (
        <>
          {/* Search & Rich Multi-Filter Bar for Kanban / List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                placeholder="Buscar lead por nome, telefone ou aniversariante indicada..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '10px 14px 10px 42px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Rich Filter Bar */}
            <AdminFilterBar
              filters={filterState}
              onChange={setFilterState}
              showDebutanteFilter={true}
              showSortFilter={true}
              sortOptions={sortOptions}
              resultCount={filteredLeads.length}
              totalCount={leads.length}
              labelUnit="leads"
            />

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
          </div>

          {/* KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '16px',
              minHeight: '520px',
              width: '100%',
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
                      maxHeight: '75vh',
                      minWidth: '220px',
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
                              draggable
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
                              {/* Name */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                  {lead.name}
                                </span>
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
                                {lead.phone} • {lead.age} anos
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
                        <td style={{ padding: '12px 18px', color: 'var(--adm-text-body)' }}>{lead.phone}</td>
                        <td style={{ padding: '12px 18px', color: 'var(--adm-text-muted)' }}>{lead.age} anos ({lead.group})</td>
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

      {/* Funnel Configuration Modal */}
      {renderFunnelConfigModal()}
    </div>
  );
};

