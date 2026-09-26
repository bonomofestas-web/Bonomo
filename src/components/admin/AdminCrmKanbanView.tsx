import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Kanban, List, Search, Building2,
  Inbox, Calendar, DollarSign,
  ChevronDown, ChevronUp, Plus, Layers,
  Users, ArrowRight, X,
  Megaphone, Sparkles, Target,
  Settings, Lock, Pin,
  Flame, PhoneCall, MessageSquare, Gift, FileText,
  Compass, ShieldCheck, Camera,
  UserPlus, Eye, AlertTriangle,
  User, SunMedium, Snowflake, Tag as TagIcon,
  MoreVertical, CheckSquare, Trash2, GitBranch, Archive,
  Store, Link2, Check, Zap, Sliders, Flag, Utensils, Clock
} from 'lucide-react';
import { AdminNewLeadModal } from './AdminNewLeadModal';
import { AdminFunnelSettingsView } from './AdminFunnelSettingsView';
import { 
  AdminMoveFunnelModal, 
  AdminQuickTaskModal, 
  AdminBulkMoveStageModal,
  AdminBulkAssignModal,
  AdminBulkMoveFunnelModal
} from './AdminLeadActionModals';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { SafeAvatar } from './SafeAvatar';
import { useAdminState } from '../../context/AdminStateContext';
import type { FilterState } from './AdminFilterBar';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { CloseDealValueModal } from './CloseDealValueModal';
import { AdminLostReasonModal } from './AdminLostReasonModal';
import { AdminLeadMissingFieldsModal } from './AdminLeadMissingFieldsModal';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { formatPhone } from '../../utils/phoneFormatter';
import { sortLeadsByCriteria, getLeadPendingWaitingTime, getLeadWaitTimeSla } from '../../utils/leadSorting';
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

interface AdminFilterDropdownProps {
  value: string;
  options: { id: string; label: string }[];
  onChange: (val: string) => void;
  maxWidth?: string;
}

const AdminFilterDropdown: React.FC<AdminFilterDropdownProps> = ({
  value,
  options,
  onChange,
  maxWidth = '150px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          background: isOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
          border: `1px solid ${isOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
          color: 'var(--adm-text-title)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: 'pointer',
          maxWidth,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.12s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.label || value}
        </span>
        <ChevronDown size={11} color="var(--adm-text-muted)" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 1000,
          minWidth: '150px',
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          maxHeight: '240px',
          overflowY: 'auto',
        }}>
          {options.map(opt => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '5px',
                  background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-input)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={12} color="var(--adm-accent)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
    updateLeadStage,
    rejectLead,
    closeLeadSaleWithValue,
    mqlQuestions,
    allSources,
    deleteLead,
    deleteMultipleLeads,
    archiveLead,
    addLeadTask,
    updateLeadData,
    togglePinFunnel,
    isFunnelPinned,
    reorderFunnels,
    reassignLeadFunnel,
  } = useAdminState();

  const totalUnreadMessages = useMemo(() => {
    return leads.reduce((acc, l) => acc + (l.unreadCount || 0), 0);
  }, [leads]);

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
    // ICP é exclusivo por unidade/casa de festas
    return mqlQuestions.some(q =>
      (q.venueId && q.venueId === targetLead.venueId) ||
      (q.venueIds && q.venueIds.length > 0 && q.venueIds.includes(targetLead.venueId))
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

  // Board Drag-to-Scroll Horizontal state & refs
  const boardRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);

  const [filterState, setFilterState] = useState<FilterState>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    debutanteId: 'all',
    sortBy: 'waiting_time',
  });
  const [leadOwnershipFilter, setLeadOwnershipFilter] = useState<'all' | 'open' | 'mine'>('all');
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState(false);

  const sortOptions = [
    { id: 'waiting_time', label: '⏱️ Tempo de Espera (Prioridade)' },
    { id: 'recent', label: 'Mais Recentes (Data)' },
    { id: 'oldest', label: 'Mais Antigos (Data)' },
    { id: 'message_recent', label: 'Mais Recente (Mensagem)' },
    { id: 'message_oldest', label: 'Mais Antiga (Mensagem)' },
    { id: 'name_asc', label: 'Ordem Alfabética (A-Z)' },
    { id: 'name_desc', label: 'Ordem Alfabética (Z-A)' },
  ];

  const periodOptions = [
    { id: 'all', label: 'Todo o Período' },
    { id: 'today', label: 'Hoje' },
    { id: '7d', label: 'Últimos 7 dias' },
    { id: '30d', label: 'Últimos 30 dias' },
    { id: 'this_month', label: 'Este mês' },
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
  const [isAddLeadMenuOpen, setIsAddLeadMenuOpen] = useState(false);
  const [newLeadInitialMode, setNewLeadInitialMode] = useState<'quick' | 'full'>('quick');

  // Estados para Ações Rápidas do Lead Card (Referência Visual)
  const [activeLeadMenuId, setActiveLeadMenuId] = useState<string | null>(null);
  const [moveFunnelLead, setMoveFunnelLead] = useState<Lead | null>(null);
  const [quickTaskLead, setQuickTaskLead] = useState<Lead | null>(null);
  const [addTagLead, setAddTagLead] = useState<Lead | null>(null);
  const [newCardTagInput, setNewCardTagInput] = useState('');
  const [showCardCustomTagInput, setShowCardCustomTagInput] = useState(false);
  const [activeValueLeadId, setActiveValueLeadId] = useState<string | null>(null);
  const [initialWorkspaceTab, setInitialWorkspaceTab] = useState<'whatsapp' | 'notes' | 'tasks'>('whatsapp');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-tag-popover]') && !target.closest('[data-tag-trigger]')) {
        setAddTagLead(null);
        setShowCardCustomTagInput(false);
        setNewCardTagInput('');
      }
      if (!target.closest('[data-lead-menu]') && !target.closest('[data-lead-menu-trigger]')) {
        setActiveLeadMenuId(null);
      }
      if (!target.closest('[data-value-popover]') && !target.closest('[data-value-trigger]')) {
        setActiveValueLeadId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estados para Seleção Múltipla / Ações em Massa no Funil
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStageModalOpen, setBulkStageModalOpen] = useState(false);
  const [bulkAssigneeModalOpen, setBulkAssigneeModalOpen] = useState(false);
  const [bulkFunnelModalOpen, setBulkFunnelModalOpen] = useState(false);

  // Fast Switcher Dropdown dos Funis Comerciais
  const [isFunnelSwitcherOpen, setIsFunnelSwitcherOpen] = useState(false);
  const funnelSwitcherRef = useRef<HTMLDivElement>(null);

  // Animações simétricas de recolher/expandir colunas com o fechamento como padrão de referência (isolado por funil)
  const [collapsingColumns, setCollapsingColumns] = useState<Record<string, boolean>>({});
  const [expandingColumns, setExpandingColumns] = useState<Record<string, 'starting' | 'active'>>({});

  // Armazena colunas recolhidas no formato `${funnelId}:${colId}` para que o fechamento de uma etapa não afete outros funis
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  const toggleLeadSelection = (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleColumnSelectAll = (colLeads: Lead[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const colLeadIds = colLeads.map(l => l.id);
    if (colLeadIds.length === 0) return;
    const allSelected = colLeadIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !colLeadIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...colLeadIds])));
    }
  };

  const handleBulkMoveStage = (targetStage: CrmStage) => {
    selectedLeadIds.forEach(id => {
      updateLeadStage(id, targetStage);
    });
    setBulkStageModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkAssignCollab = (collabId: string) => {
    const targetCollab = collaborators.find(c => c.id === collabId);
    if (!targetCollab) return;
    selectedLeadIds.forEach(id => {
      updateLeadData(id, {
        sdrId: targetCollab.id,
        sdrName: targetCollab.name,
        assignedTo: targetCollab.name,
      });
    });
    setBulkAssigneeModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkMoveFunnel = async (targetFunnelId: string, targetStageId?: string) => {
    for (const id of selectedLeadIds) {
      await reassignLeadFunnel(id, targetFunnelId, targetStageId);
    }
    setBulkFunnelModalOpen(false);
    setSelectedLeadIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Deseja realmente excluir os ${selectedLeadIds.length} leads selecionados? Essa ação não pode ser desfeita.`)) {
      const idsToDelete = [...selectedLeadIds];
      setSelectedLeadIds([]);
      setIsMultiSelectMode(false);
      await deleteMultipleLeads(idsToDelete);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      setActiveLeadMenuId(null);
      if (funnelSwitcherRef.current && !funnelSwitcherRef.current.contains(e.target as Node)) {
        setIsFunnelSwitcherOpen(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

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
      setIsComoFunnelSettingsOpen(false);
      setComoFunnelId(undefined);
      setViewMode('kanban');
    }
  }, [activeFunnelId]);

  // Sempre que mudar o funil selecionado, redefinir para o modo Kanban
  useEffect(() => {
    if (selectedFunnelId && !initialLeadId) {
      setViewMode('kanban');
    }
  }, [selectedFunnelId]);

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
    setIsComoFunnelSettingsOpen(false);
    setComoFunnelId(undefined);
    setActiveLeadIdForWorkspace(null);
    setViewMode('kanban');
    setIsFunnelSwitcherOpen(false);
    if (onSelectFunnel) onSelectFunnel(id);
  };

  // Open Create Funnel in Full Content Area View
  const handleOpenCreateFunnel = (targetVenueId?: string) => {
    const resolvedVenue = (targetVenueId && targetVenueId !== 'all')
      ? targetVenueId
      : (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi')
        ? activeVenueId
        : (venues[0]?.id || 'all');
    const newId = addFunnel({
      name: isPostSaleView ? 'Novo Funil Pós-Venda' : 'Novo Funil Comercial',
      category: isPostSaleView ? 'Pós-Venda' : 'Vendas & Atendimento',
      description: '',
      venueId: resolvedVenue,
      sharedVenueIds: (targetVenueId === 'all' || activeVenueId === 'all' || !activeVenueId) ? venues.map(v => v.id) : undefined,
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

  const handleMoveFunnel = (funnelId: string, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const listToReorder = [...funnelsList];
    const currentIndex = listToReorder.findIndex(f => f.id === funnelId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= listToReorder.length) return;

    const [moved] = listToReorder.splice(currentIndex, 1);
    listToReorder.splice(targetIndex, 0, moved);

    const reordered = listToReorder.map((f, idx) => ({
      ...f,
      order: idx,
    }));

    reorderFunnels(reordered);
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

      // 2. Filtro estrito de Unidade Selecionada no Topo (activeVenueId)
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        const linkedVenues = getLinkedVenuesForFunnel(funnel);
        if (linkedVenues.length > 0) {
          if (!linkedVenues.some(v => v.id === activeVenueId)) return false;
        } else if (funnel.venueId && funnel.venueId !== 'all' && funnel.venueId !== activeVenueId) {
          return false;
        }
      }

      return true;
    }).map(funnel => {
      // Calculate dynamic metrics per funnel strictly for this funnel (filtered by activeVenueId if set)
      const funnelLeads = leads.filter(l => {
        const matchesFunnel = l.funnelId 
          ? (l.funnelId === funnel.id || l.funnelId.toLowerCase().trim() === funnel.name.toLowerCase().trim()) 
          : funnel.isPrimary;
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
    return renderFunnelOrStageIcon(iconName, size, color, 'target');
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

  const commercialFunnelsForSwitcher = useMemo(() => {
    return funnelsList.filter(f => !f.isPostSale && f.category !== 'Pós-Venda');
  }, [funnelsList]);

  const postSaleFunnelsForSwitcher = useMemo(() => {
    return funnelsList.filter(f => f.isPostSale || f.category === 'Pós-Venda' || f.category === 'pos_venda');
  }, [funnelsList]);

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

  const collabIdSet = useMemo(() => new Set((collaborators || []).map(c => c.id)), [collaborators]);

  // Filter and Sort leads strictly isolated for the selected Funnel
  const filteredLeads = useMemo(() => {
    const matching = leads.filter(l => {
      // 1. Mandatory Strict Funnel Matching:
      if (currentFunnel) {
        if (!l.funnelId) return false; // Lead desindexado (sem funil) NUNCA deve aparecer no Kanban de funis
        const matchesId = l.funnelId === currentFunnel.id;
        const matchesName = l.funnelId.toLowerCase().trim() === currentFunnel.name.toLowerCase().trim();
        if (!matchesId && !matchesName) return false;
      } else if (activeVenueId && activeVenueId !== 'all') {
        if (l.venueId !== activeVenueId) return false;
      }

      // Ownership Filter: Meus Leads vs Em Aberto vs Todos
      if (leadOwnershipFilter === 'mine') {
        const isMine = 
          Boolean(currentUser?.id && (l.sdrId === currentUser.id || l.closerId === currentUser.id)) ||
          Boolean(currentUser?.name && (l.sdrName === currentUser.name || l.closerName === currentUser.name || l.assignedTo === currentUser.name)) ||
          Boolean(currentUser?.id && (l.participants || []).some(p => p.collaboratorId === currentUser.id));
        if (!isMine) return false;
      } else if (leadOwnershipFilter === 'open') {
        const s = (l.stage || '').toLowerCase();
        if (s === 'contract_signed' || s === 'deal_closed' || s === 'contrato_fechado' || s === 'lost' || s === 'cancelado') return false;
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
    });

    return sortLeadsByCriteria(matching, filterState.sortBy || 'waiting_time', collabIdSet);
  }, [leads, currentFunnel, activeVenueId, filterState, search, leadOwnershipFilter, currentUser, collabIdSet]);

  const renderColumnIcon = (iconOrStage: string, size = 15, color?: string) => {
    return renderFunnelOrStageIcon(iconOrStage, size, color, 'layers');
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

    // Se isWonStageEnabled for expressamente falso, oculta a etapa de ganho deste funil (funil de passagem)
    if (currentFunnel?.isWonStageEnabled === false) {
      rawStages = rawStages.filter(st => !st.isWon && st.id !== 'deal_closed' && st.id !== 'contrato_fechado');
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

  // Funções para controle de colunas recolhidas com escopo estrito por funil
  const getFunnelColKey = (colId: string, funnelId?: string) => {
    const fId = funnelId || currentFunnel?.id || selectedFunnelId || 'default';
    return `${fId}:${colId}`;
  };

  const isDefaultCollapsedCol = (colId: string, col?: { isWon?: boolean; isLoss?: boolean }) => {
    return ['deal_closed', 'contrato_fechado', 'lost', 'cancelado', 'recusado', 'perdido'].includes(colId) || Boolean(col?.isWon || col?.isLoss);
  };

  const isColumnCollapsed = (colId: string, col?: { isWon?: boolean; isLoss?: boolean }, funnelId?: string) => {
    const key = getFunnelColKey(colId, funnelId);
    if (collapsedColumns[key] !== undefined) {
      return Boolean(collapsedColumns[key]);
    }
    return isDefaultCollapsedCol(colId, col);
  };

  const toggleColumnCollapse = (colId: string) => {
    const key = getFunnelColKey(colId);
    const targetCol = columns.find(c => c.id === colId);
    const isCurrentlyCollapsed = isColumnCollapsed(colId, targetCol);

    if (!isCurrentlyCollapsed) {
      // Inicia fechamento: encolhe largura para 40px e fade-out suave dos cards
      setCollapsingColumns(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCollapsedColumns(prev => ({ ...prev, [key]: true }));
        setCollapsingColumns(prev => ({ ...prev, [key]: false }));
      }, 200);
    } else {
      // Inicia abertura simétrica: desmarca colapsado, inicia em 40px com cards em opacidade 0 e anima abertura fluida para 280px
      setCollapsedColumns(prev => ({ ...prev, [key]: false }));
      setExpandingColumns(prev => ({ ...prev, [key]: 'starting' }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExpandingColumns(prev => ({ ...prev, [key]: 'active' }));
        });
      });
      setTimeout(() => {
        setExpandingColumns(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      }, 240);
    }
  };

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

    // Regra F5 System: Leads que já avançaram no pipeline não podem retornar para a Caixa de Entrada
    const isTargetEntry = (targetStage as string) === 'new_lead' || (targetStage as string) === 'onboarding' || (columns.length > 0 && targetStage === columns[0].id && (columns[0].title.toLowerCase().includes('entrada') || columns[0].title.toLowerCase().includes('novo lead')));
    const isCurrentEntry = (lead.stage as string) === 'new_lead' || (lead.stage as string) === 'onboarding' || (columns.length > 0 && getLeadMatchedColumnId(lead, columns) === columns[0].id && (columns[0].title.toLowerCase().includes('entrada') || columns[0].title.toLowerCase().includes('novo lead')));
    if (isTargetEntry && !isCurrentEntry) {
      alert('Regra do CRM: A coluna de entrada é exclusivamente uma porta de entrada do sistema. Leads que já avançaram no pipeline não podem retornar para ela.');
      setDraggedLeadId(null);
      return;
    }

    // Automação de Gatilho da Etapa: Transferência Automática de Funil
    const targetStageConfig = (currentFunnel?.stages || []).find(s => s.id === targetStage);
    const transferTrigger = targetStageConfig?.triggers?.find(t => (t.type === 'move_to_funnel' || (t as any).type === 'transfer_funnel') && t.targetFunnelId);
    if (transferTrigger && transferTrigger.targetFunnelId) {
      setDraggedLeadId(null);
      reassignLeadFunnel(leadId, transferTrigger.targetFunnelId, transferTrigger.targetStageId).then((ok: boolean) => {
        if (ok) {
          const destFunnel = funnels.find(f => f.id === transferTrigger.targetFunnelId);
          console.log(`[Automação] Lead "${lead.name}" transferido automaticamente para o funil "${destFunnel?.name || transferTrigger.targetFunnelId}".`);
        }
      });
      return;
    }

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

  const handleConfirmSale = (
    leadId: string, 
    dealValue: number, 
    packageSold: string, 
    closerNotes?: string,
    extraOptions?: {
      downPayment?: number;
      installmentsCount?: number;
      hasCreditCard?: boolean;
      contractSignedFileUrl?: string;
      contractSignedFileName?: string;
      guestCount?: number;
      eventYear?: number | string;
    }
  ) => {
    closeLeadSaleWithValue(leadId, dealValue, packageSold, undefined, closerNotes, extraOptions);
  };

  const handleConfirmLost = (reason: string, details?: string) => {
    if (lostReasonLead) {
      const fullReason = details?.trim() ? `${reason} - ${details.trim()}` : reason;
      rejectLead(lostReasonLead.id, fullReason);
      setLostReasonLead(null);
      setIsLostReasonModalOpen(false);
    }
  };

  const handleOpenLeadWorkspace = (lead: Lead, tab: 'whatsapp' | 'notes' | 'tasks' = 'whatsapp') => {
    setActiveLeadIdForWorkspace(lead.id);
    setInitialWorkspaceTab(tab);
    setViewMode('workspace');
  };

  // Handlers para Drag-to-Scroll horizontal do Kanban (arraste livre sem scrollbar aparente)
  const handleBoardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('[draggable="true"]')
    ) {
      return;
    }
    if (!boardRef.current) return;
    isPointerDownRef.current = true;
    startXRef.current = e.pageX - boardRef.current.offsetLeft;
    scrollLeftRef.current = boardRef.current.scrollLeft;

    const handleGlobalMouseUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        setTimeout(() => setIsDraggingBoard(false), 50);
      }
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !boardRef.current) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.25;
    if (Math.abs(walk) > 4 && !isDraggingBoard) {
      setIsDraggingBoard(true);
    }
    boardRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleBoardMouseUpOrLeave = () => {
    if (isPointerDownRef.current) {
      isPointerDownRef.current = false;
      setTimeout(() => setIsDraggingBoard(false), 50);
    }
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
                        {/* Pin on sidebar button (User-scoped) */}
                        {(() => {
                          const isPinned = isFunnelPinned(funnel.id);
                          return (
                            <button
                              type="button"
                              title={isPinned ? "Desafixar do meu Workspace (Sidebar)" : "Fixar no meu Workspace (Sidebar)"}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinFunnel(funnel.id);
                              }}
                              style={{
                                background: isPinned ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                                border: `1px solid ${isPinned ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                                borderRadius: '8px',
                                padding: '5px 7px',
                                color: isPinned ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Pin size={11} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
                              <span>{isPinned ? 'Fixado' : 'Fixar'}</span>
                            </button>
                          );
                        })()}

                        {/* Reorder Buttons */}
                        {canConfigureFunnels && funnelsList.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button
                              type="button"
                              title="Mover funil para cima"
                              disabled={funnelsList.findIndex(f => f.id === funnel.id) === 0}
                              onClick={(e) => handleMoveFunnel(funnel.id, 'up', e)}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '6px',
                                padding: '4px',
                                color: funnelsList.findIndex(f => f.id === funnel.id) === 0 ? 'var(--adm-border)' : 'var(--adm-text-muted)',
                                cursor: funnelsList.findIndex(f => f.id === funnel.id) === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              title="Mover funil para baixo"
                              disabled={funnelsList.findIndex(f => f.id === funnel.id) === funnelsList.length - 1}
                              onClick={(e) => handleMoveFunnel(funnel.id, 'down', e)}
                              style={{
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '6px',
                                padding: '4px',
                                color: funnelsList.findIndex(f => f.id === funnel.id) === funnelsList.length - 1 ? 'var(--adm-border)' : 'var(--adm-text-muted)',
                                cursor: funnelsList.findIndex(f => f.id === funnel.id) === funnelsList.length - 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        )}

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
      width: '100%',
      minHeight: '100%',
      flex: 1,
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Banner de Modo Observador Comercial para equipe de Pós-Venda */}
      {isReadOnlyForPosVenda && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.35)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#06B6D4',
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.74rem', lineHeight: 1.4 }}>
            <strong style={{ color: '#22D3EE' }}>Modo Observador Comercial (Pós-Venda):</strong> Você tem acesso completo para visualizar informações, histórico e conversas deste funil comercial. Alterações de etapas e contato comercial direto são exclusivos do time de SDRs e Closers. Para atuar operacionalmente, utilize um <strong>Funil de Pós-Venda</strong>.
          </div>
        </div>
      )}

      {/* ── BARRA DE FERRAMENTAS SUPERIOR UNIFICADA (COLADA NO TOPO, SEM BORDAS BOLEADAS, COMPACTA) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        background: 'var(--adm-bg-card)',
        borderBottom: '1px solid var(--adm-border)',
        borderRadius: 0,
        padding: '5px 14px',
        flexWrap: 'wrap',
      }}>
        {/* Left Side: Active Funnel Pill + Receding Search Bar + Inline Expanding Filters + Meus Leads Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {/* Active Funnel Indicator Pill with Fast Dropdown */}
          {currentFunnel && (
            <div ref={funnelSwitcherRef} style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                onClick={() => {
                  if (!isPostSaleView) {
                    setIsFunnelSwitcherOpen(prev => !prev);
                  }
                }}
                title={!isPostSaleView ? "Clique para alternar rapidamente entre funis comerciais" : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 9px',
                  borderRadius: '7px',
                  background: `${currentFunnel.badgeColor || '#3B82F6'}18`,
                  border: `1px solid ${currentFunnel.badgeColor || '#3B82F6'}45`,
                  color: 'var(--adm-text-title)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: !isPostSaleView ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <span style={{ color: currentFunnel.badgeColor || '#3B82F6', display: 'inline-flex', alignItems: 'center' }}>
                  {renderFunnelIcon(currentFunnel.icon || 'target', 13, currentFunnel.badgeColor || '#3B82F6')}
                </span>
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentFunnel.name}
                </span>
                {!isPostSaleView && (
                  <ChevronDown 
                    size={11} 
                    style={{ 
                      color: 'var(--adm-text-muted)', 
                      marginLeft: '2px',
                      transform: isFunnelSwitcherOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }} 
                  />
                )}
              </div>

              {/* Fast Dropdown Menu dos Funis Comerciais */}
              {isFunnelSwitcherOpen && !isPostSaleView && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 1000,
                  background: 'var(--adm-bg-card, #1E1A29)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  minWidth: '220px',
                  maxWidth: '300px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  animation: 'fadeIn 0.12s ease-out',
                }}>
                  <div style={{ 
                    padding: '4px 8px 6px', 
                    fontSize: '0.66rem', 
                    fontWeight: 800, 
                    color: 'var(--adm-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderBottom: '1px solid var(--adm-border)',
                    marginBottom: '2px',
                  }}>
                    Funis Comerciais
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {commercialFunnelsForSwitcher.map(f => {
                      const isActive = f.id === currentFunnel.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            handleSelectFunnel(f.id);
                            setIsFunnelSwitcherOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isActive ? 'var(--adm-accent-bg, rgba(99, 102, 241, 0.12))' : 'transparent',
                            border: 'none',
                            color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                            fontSize: '0.74rem',
                            fontWeight: isActive ? 800 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'var(--adm-bg-input)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ color: f.badgeColor || '#3B82F6', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                              {renderFunnelIcon(f.icon || 'target', 12, f.badgeColor || '#3B82F6')}
                            </span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.name}
                            </span>
                          </div>
                          {isActive && <Check size={12} color="var(--adm-accent)" style={{ flexShrink: 0 }} />}
                        </button>
                      );
                    })}

                    {postSaleFunnelsForSwitcher.length > 0 && (
                      <>
                        <div style={{ 
                          padding: '6px 8px 4px', 
                          fontSize: '0.66rem', 
                          fontWeight: 800, 
                          color: 'var(--adm-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderTop: '1px solid var(--adm-border)',
                          marginTop: '4px',
                          marginBottom: '2px',
                        }}>
                          Funis de Pós-Venda
                        </div>

                        {postSaleFunnelsForSwitcher.map(f => {
                          const isActive = f.id === currentFunnel.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                handleSelectFunnel(f.id);
                                setIsFunnelSwitcherOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: isActive ? 'var(--adm-accent-bg, rgba(99, 102, 241, 0.12))' : 'transparent',
                                border: 'none',
                                color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                                fontSize: '0.74rem',
                                fontWeight: isActive ? 800 : 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'var(--adm-bg-input)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                  {renderFunnelIcon(f.icon || 'star', 12, '#10B981')}
                                </span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {f.name}
                                </span>
                                <span style={{ fontSize: '0.60rem', padding: '1px 4px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 800 }}>
                                  Pós-Venda
                                </span>
                              </div>
                              {isActive && <Check size={12} color="var(--adm-accent)" style={{ flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Link para Central de Funis */}
                  <div style={{ borderTop: '1px solid var(--adm-border)', marginTop: '4px', paddingTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectFunnel(null);
                        setIsFunnelSwitcherOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-text-muted)',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--adm-text-title)';
                        e.currentTarget.style.background = 'var(--adm-bg-input)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--adm-text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Layers size={12} />
                      <span>Ver todos os funis (Central)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Busca (Recolhe se filtros estiverem abertos, expande caso contrário) */}
          <div style={{
            position: 'relative',
            width: isFilterBarExpanded ? '150px' : '200px',
            transition: 'width 0.2s ease',
            flexShrink: 0,
          }}>
            <Search size={13} color="var(--adm-accent)" style={{ position: 'absolute', left: '9px', top: '7px' }} />
            <input
              type="text"
              placeholder={isPostSaleView ? "Buscar cliente ou telefone..." : "Buscar lead ou telefone..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '6px',
                padding: '4px 8px 4px 28px',
                color: 'var(--adm-text-title)',
                fontSize: '0.74rem',
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
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Settings size={13} />
            <span>Filtros</span>
            <ChevronDown size={11} style={{ transform: isFilterBarExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {/* Filtros Inline Diretos na Barra (Sem Dropdown/Popover Solto) */}
          {isFilterBarExpanded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexWrap: 'wrap',
              animation: 'fadeIn 0.15s ease-out',
            }}>
              {/* Período */}
              <AdminFilterDropdown
                value={filterState.period}
                options={periodOptions}
                onChange={(val) => setFilterState(prev => ({ ...prev, period: val as any }))}
                maxWidth="130px"
              />

              {/* Casa de Festas */}
              {venues.length > 1 && (
                <AdminFilterDropdown
                  value={filterState.venueId}
                  options={[
                    { id: 'all', label: 'Todas as Casas' },
                    ...venues.map(v => ({ id: v.id, label: v.name }))
                  ]}
                  onChange={(val) => setFilterState(prev => ({ ...prev, venueId: val }))}
                  maxWidth="140px"
                />
              )}

              {/* Colaborador */}
              <AdminFilterDropdown
                value={filterState.collaboratorId}
                options={[
                  { id: 'all', label: 'Todos Colab.' },
                  ...collaborators.filter(c => c.active).map(c => ({ id: c.id, label: c.name }))
                ]}
                onChange={(val) => setFilterState(prev => ({ ...prev, collaboratorId: val }))}
                maxWidth="130px"
              />

              {/* Ordenação */}
              <AdminFilterDropdown
                value={filterState.sortBy || 'recent'}
                options={sortOptions}
                onChange={(val) => setFilterState(prev => ({ ...prev, sortBy: val as any }))}
                maxWidth="165px"
              />

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
                    borderRadius: '5px',
                    padding: '3px 6px',
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <X size={11} />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          )}

          {/* Toggle Rápido: Todos vs Em Aberto vs Meus Leads */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '6px',
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
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: leadOwnershipFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setLeadOwnershipFilter('open')}
              style={{
                background: leadOwnershipFilter === 'open' ? 'var(--adm-accent-bg)' : 'transparent',
                border: leadOwnershipFilter === 'open' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: leadOwnershipFilter === 'open' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: leadOwnershipFilter === 'open' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Em Aberto
            </button>
            <button
              type="button"
              onClick={() => setLeadOwnershipFilter('mine')}
              style={{
                background: leadOwnershipFilter === 'mine' ? 'var(--adm-accent-bg)' : 'transparent',
                border: leadOwnershipFilter === 'mine' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: leadOwnershipFilter === 'mine' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Botão de Seleção Múltipla */}
          <button
            type="button"
            onClick={() => {
              const next = !isMultiSelectMode;
              setIsMultiSelectMode(next);
              if (!next) setSelectedLeadIds([]);
            }}
            title={isMultiSelectMode ? "Sair da seleção múltipla" : "Ativar seleção múltipla de leads"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: isMultiSelectMode ? 'rgba(99, 102, 241, 0.15)' : 'var(--adm-bg-input)',
              border: `1px solid ${isMultiSelectMode ? 'var(--adm-accent, #6366F1)' : 'var(--adm-border)'}`,
              color: isMultiSelectMode ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-title)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckSquare size={13} />
            <span>{isMultiSelectMode ? 'Cancelar Seleção' : 'Seleção Múltipla'}</span>
            {selectedLeadIds.length > 0 && (
              <span style={{
                background: 'var(--adm-accent, #6366F1)',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
              }}>
                {selectedLeadIds.length}
              </span>
            )}
          </button>

          {/* Botão + Adicionar Lead com Submenu Rápido / Personalizado */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsAddLeadMenuOpen(prev => !prev)}
              style={{
                background: isPostSaleView ? 'linear-gradient(135deg, #06B6D4, #0891B2)' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <UserPlus size={13} />
              <span>{isPostSaleView ? 'Adicionar Cliente' : 'Adicionar Lead'}</span>
              <ChevronDown size={12} style={{ transform: isAddLeadMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isAddLeadMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 200,
                  minWidth: '220px',
                  background: 'var(--adm-bg-card, #FFFFFF)',
                  border: '1px solid var(--adm-border, #E2E8F0)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setNewLeadInitialMode('quick');
                    setIsNewLeadModalOpen(true);
                    setIsAddLeadMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Cadastro Rápido
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted, #64748B)' }}>
                      Apenas Nome, WhatsApp e Unidade
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewLeadInitialMode('full');
                    setIsNewLeadModalOpen(true);
                    setIsAddLeadMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sliders size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                      Cadastro Personalizado
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted, #64748B)' }}>
                      Completo com orçamento e notas
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Seletor de Modo Minimalista (Apenas Ícones com Tooltips) */}
          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '6px',
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
                borderRadius: '5px',
                border: viewMode === 'kanban' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Kanban size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLeadIdForWorkspace(null);
                setViewMode('workspace');
              }}
              title={totalUnreadMessages > 0 ? `Caixa de Entrada (${totalUnreadMessages} mensagens não lidas)` : "Caixa de Entrada / Chat"}
              style={{
                background: viewMode === 'workspace' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'workspace' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                border: viewMode === 'workspace' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <Inbox size={14} />
              {totalUnreadMessages > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '1px 4px',
                  minWidth: '14px',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  boxShadow: '0 1px 4px rgba(16, 185, 129, 0.4)',
                }}>
                  {totalUnreadMessages}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Visualização em Tabela"
              style={{
                background: viewMode === 'list' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                border: viewMode === 'list' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
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
                  padding: '4px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.74rem',
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
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'workspace' ? (
        <AdminWhatsAppWorkspaceView 
          initialLeadId={activeLeadIdForWorkspace || undefined}
          activeFunnelId={currentFunnel?.id || selectedFunnelId || undefined}
          isEmbeddedInFunnel={true}
          initialComposerTab={initialWorkspaceTab}
          searchQuery={search}
          leadOwnershipFilter={leadOwnershipFilter}
          sortBy={filterState.sortBy}
          onClose={() => setViewMode('kanban')}
          isMultiSelectActive={isMultiSelectMode}
          onToggleMultiSelect={setIsMultiSelectMode}
          selectedLeadIds={selectedLeadIds}
          onSelectedLeadIdsChange={setSelectedLeadIds}
        />
      ) : (
        <>
          {/* Quick Metrics Bar (Ultra compacta) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            padding: '3px 16px',
            background: 'var(--adm-bg-app)',
            borderBottom: '1px solid var(--adm-border)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Total: <strong style={{ color: 'var(--adm-text-title)' }}>{filteredLeads.length}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Qualificados: <strong style={{ color: 'var(--adm-green)' }}>{filteredLeads.filter(l => l.isValidated).length}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
              Vendas VIP: <strong style={{ color: 'var(--adm-accent)' }}>{filteredLeads.filter(l => l.stage === 'contract_signed').length}</strong>
            </div>
          </div>

          {/* KANBAN BOARD VIEW (Scroll Vertical Unificado da Tela com Headers Sticky e Arraste Horizontal) */}
          {viewMode === 'kanban' && (
            <div
              ref={boardRef}
              onMouseDown={handleBoardMouseDown}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUpOrLeave}
              onMouseLeave={handleBoardMouseUpOrLeave}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: '12px',
                overflowX: 'auto',
                overflowY: 'auto',
                flex: 1,
                height: 'calc(100vh - 110px)',
                maxHeight: 'calc(100vh - 110px)',
                width: '100%',
                paddingLeft: '16px',
                paddingRight: '40px',
                paddingTop: '8px',
                paddingBottom: '40px',
                boxSizing: 'border-box',
                cursor: isDraggingBoard ? 'grabbing' : 'grab',
                userSelect: isDraggingBoard ? 'none' : 'auto',
              }}
              className="custom-scrollbar"
            >
              {columns.map(col => {
                const columnLeads = filteredLeads.filter(l => getLeadMatchedColumnId(l, columns) === col.id);
                const stageValue = columnLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

                // Regra F5 System: Coluna de Entrada com 0 leads SUMA completamente do Kanban
                const isEntryColumn = col.id === 'new_lead' || col.id === 'onboarding' || col.title.toLowerCase().includes('entrada') || col.title.toLowerCase().includes('novo lead');
                if (isEntryColumn && columnLeads.length === 0) {
                  return null;
                }

                // Colunas minimizadas com escopo estrito por funil (Ganho e Perdido por padrão, e qualquer etapa clicada pelo usuário)
                const colKey = getFunnelColKey(col.id);
                const isCollapsed = isColumnCollapsed(col.id, col);
                const isCollapsing = Boolean(collapsingColumns[colKey]);
                const expandingState = expandingColumns[colKey];
                const isSlim = isCollapsing || expandingState === 'starting';

                if (isCollapsed) {
                  return (
                    <div
                      key={col.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id)}
                      onClick={() => toggleColumnCollapse(col.id)}
                      title={`Clique para expandir a etapa "${col.title.toUpperCase()}" (${columnLeads.length} leads)`}
                      style={{
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        borderTop: `3px solid ${col.headerColor}`,
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        position: 'sticky',
                        top: 0,
                        zIndex: 15,
                        width: '40px',
                        minWidth: '40px',
                        maxWidth: '40px',
                        flex: '0 0 40px',
                        padding: '10px 3px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        gap: '10px',
                        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: 'fadeIn 0.18s ease-out',
                        minHeight: '340px',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {renderColumnIcon(col.icon || col.id, 13, col.headerColor)}
                        <span style={{
                          padding: '1px 4px',
                          borderRadius: '999px',
                          fontSize: '9px',
                          fontWeight: 800,
                          backgroundColor: `${col.headerColor}20`,
                          color: col.headerColor,
                        }}>
                          {columnLeads.length}
                        </span>
                      </div>

                      <div style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: 'var(--adm-text-title)',
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        marginTop: '6px',
                      }}>
                        {col.title.toUpperCase()}
                      </div>

                      {stageValue > 0 && (
                        <div style={{
                          marginTop: 'auto',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: 'var(--adm-text-muted)',
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          whiteSpace: 'nowrap',
                        }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stageValue)}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: 'flex-start',
                      width: isSlim ? '40px' : '280px',
                      minWidth: isSlim ? '40px' : '280px',
                      maxWidth: isSlim ? '40px' : '280px',
                      flex: isSlim ? '0 0 40px' : '0 0 280px',
                      gap: '6px',
                      boxShadow: 'none',
                      position: 'relative',
                      overflow: isSlim ? 'hidden' : 'visible',
                      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), flex 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Column Header - Sticky / Fixo no topo do Board durante a rolagem vertical da tela */}
                    <div 
                      onClick={() => toggleColumnCollapse(col.id)}
                      title={`Clique para minimizar a etapa "${col.title.toUpperCase()}"`}
                      style={{
                        padding: '7px 9px',
                        borderRadius: '8px',
                        border: '1px solid var(--adm-border)',
                        borderTop: `3px solid ${col.headerColor}`,
                        backgroundColor: 'var(--adm-bg-card, #1E1A29)',
                        backgroundImage: col.bgColor ? `linear-gradient(${col.bgColor}, ${col.bgColor})` : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        flexShrink: 0,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                          {isMultiSelectMode && (
                            <input
                              type="checkbox"
                              checked={columnLeads.length > 0 && columnLeads.every(l => selectedLeadIds.includes(l.id))}
                              ref={el => {
                                if (el) {
                                  const allSel = columnLeads.length > 0 && columnLeads.every(l => selectedLeadIds.includes(l.id));
                                  const someSel = columnLeads.some(l => selectedLeadIds.includes(l.id));
                                  el.indeterminate = someSel && !allSel;
                                }
                              }}
                              onClick={(e) => toggleColumnSelectAll(columnLeads, e)}
                              onChange={() => {}}
                              title={columnLeads.length > 0 && columnLeads.every(l => selectedLeadIds.includes(l.id)) ? "Desmarcar todos desta etapa" : "Selecionar todos desta etapa"}
                              style={{
                                cursor: 'pointer',
                                accentColor: 'var(--adm-accent, #6366F1)',
                                width: '13px',
                                height: '13px',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {renderColumnIcon(col.icon || col.id, 12, col.headerColor)}
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                            {col.title.toUpperCase()}
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
                                  if (activeHintStageId !== col.id) {
                                    e.currentTarget.style.color = 'var(--adm-text-muted)';
                                  }
                                }}
                              >
                                <Sparkles size={10} />
                              </button>

                              {activeHintStageId === col.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: '-10px',
                                    zIndex: 50,
                                    width: '240px',
                                    padding: '10px 12px',
                                    background: 'var(--adm-bg-card)',
                                    border: '1px solid var(--adm-border)',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    fontSize: '0.70rem',
                                    color: 'var(--adm-text-body)',
                                    lineHeight: 1.35,
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid var(--adm-border)', paddingBottom: '3px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--adm-text-title)', fontSize: '0.68rem' }}>
                                      Orientações da Etapa
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveHintStageId(null)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: 0 }}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  <div>{col.hints}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            backgroundColor: 'var(--adm-bg-card, #ffffff)',
                            color: col.headerColor,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0,
                          }}>
                            {columnLeads.length}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnCollapse(col.id);
                            }}
                            title="Minimizar coluna"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--adm-text-muted)',
                              cursor: 'pointer',
                              padding: '1px',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                          >
                            <ChevronDown size={12} style={{ transform: 'rotate(90deg)' }} />
                          </button>
                        </div>
                      </div>
                      <span style={{ fontSize: '9.5px', color: 'var(--adm-text-muted)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stageValue)}
                      </span>
                    </div>

                    {/* Cards Container (Direto no background, com animação simétrica suave de recolher e expandir) */}
                    <div style={{
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      opacity: isSlim ? 0 : 1,
                      transform: isSlim ? 'translateY(-10px) scale(0.98)' : 'translateY(0) scale(1)',
                      transition: 'opacity 0.20s ease, transform 0.20s ease',
                      pointerEvents: isSlim ? 'none' : 'auto',
                    }}>
                      {columnLeads.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '16px 6px',
                          color: 'var(--adm-text-muted)',
                          fontSize: '0.65rem',
                          border: '1.5px dashed var(--adm-border)',
                          borderRadius: '8px',
                          lineHeight: 1.4,
                          background: 'transparent',
                        }}>
                          Arraste um lead para cá
                        </div>
                      ) : (
                        columnLeads.map(lead => {
                          const sdrCollab = collaborators.find(c => (lead.sdrId && c.id === lead.sdrId) || (lead.sdrName && c.name?.toLowerCase() === lead.sdrName.toLowerCase()) || (lead.assignedTo && c.name?.toLowerCase() === lead.assignedTo.toLowerCase()));
                          const closerCollab = collaborators.find(c => (lead.closerId && c.id === lead.closerId) || (lead.closerName && c.name?.toLowerCase() === lead.closerName.toLowerCase()));

                          const isSelectedInMulti = selectedLeadIds.includes(lead.id);
                          const pendingWaitMs = getLeadPendingWaitingTime(lead, collabIdSet);
                          const sla = getLeadWaitTimeSla(pendingWaitMs);
                          const hasSlaAlert = sla.level !== 'none' && sla.level !== 'recent';

                          return (
                            <div
                              key={lead.id}
                              draggable={!isReadOnlyForPosVenda && !isLeadSpectator(lead) && !isMultiSelectMode}
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => {
                                if (isMultiSelectMode) {
                                  toggleLeadSelection(lead.id);
                                } else {
                                  handleOpenLeadWorkspace(lead);
                                }
                              }}
                              style={{
                                background: isSelectedInMulti 
                                  ? 'rgba(99, 102, 241, 0.05)' 
                                  : (hasSlaAlert ? sla.cardBg : 'var(--adm-bg-card, #ffffff)'),
                                border: isSelectedInMulti 
                                  ? '1.5px solid var(--adm-accent, #6366F1)' 
                                  : (hasSlaAlert ? `1.5px solid ${sla.cardBorder}` : '1px solid var(--adm-border, #E2E8F0)'),
                                borderRadius: '8px',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                position: 'relative',
                                boxShadow: isSelectedInMulti 
                                  ? '0 2px 8px rgba(99, 102, 241, 0.15)' 
                                  : (hasSlaAlert ? `0 0 0 1px ${sla.cardBorder}33, 0 2px 6px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.03)'),
                                zIndex: activeLeadMenuId === lead.id ? 100 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelectedInMulti) {
                                  e.currentTarget.style.borderColor = isPostSaleView ? '#06B6D4' : (hasSlaAlert ? sla.color : 'var(--adm-accent, #6366F1)');
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelectedInMulti) {
                                  e.currentTarget.style.borderColor = hasSlaAlert ? sla.cardBorder : 'var(--adm-border, #E2E8F0)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = hasSlaAlert ? `0 0 0 1px ${sla.cardBorder}33, 0 2px 6px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.03)';
                                }
                              }}
                            >
                              {/* ── 1. CABEÇALHO: 3 Pontinhos + Avatar + Nome/Telefone + Divisor + Valor + Selo $ ── */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                {/* Esquerda: Checkbox/3 Pontinhos + Avatar + Nome + Telefone */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                  {isMultiSelectMode ? (
                                    <div 
                                      onClick={(e) => toggleLeadSelection(lead.id, e)}
                                      style={{
                                        width: '15px',
                                        height: '15px',
                                        borderRadius: '3px',
                                        border: `1.5px solid ${isSelectedInMulti ? 'var(--adm-accent, #6366F1)' : 'var(--adm-border, #CBD5E1)'}`,
                                        background: isSelectedInMulti ? 'var(--adm-accent, #6366F1)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isSelectedInMulti && <Check size={10} color="#fff" strokeWidth={3} />}
                                    </div>
                                  ) : (
                                    /* Botão de 3 Pontinhos Verticais com Menu Flutuante */
                                    <div style={{ position: 'relative', flexShrink: 0, marginLeft: '-3px' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveLeadMenuId(activeLeadMenuId === lead.id ? null : lead.id);
                                        }}
                                        title="Opções do Lead"
                                        style={{
                                          background: activeLeadMenuId === lead.id ? 'var(--adm-bg-input, #F1F5F9)' : 'transparent',
                                          border: 'none',
                                          borderRadius: '4px',
                                          padding: '2px',
                                          cursor: 'pointer',
                                          color: 'var(--adm-text-muted, #64748B)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <MoreVertical size={13} />
                                      </button>

                                      {/* Menu Flutuante de Ações */}
                                      {activeLeadMenuId === lead.id && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            zIndex: 200,
                                            background: 'var(--adm-bg-card, #ffffff)',
                                            border: '1px solid var(--adm-border, #CBD5E1)',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18)',
                                            padding: '4px',
                                            minWidth: '160px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveLeadMenuId(null);
                                              setIsMultiSelectMode(true);
                                              setSelectedLeadIds(prev => prev.includes(lead.id) ? prev : [...prev, lead.id]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '6px 8px',
                                              borderRadius: '5px',
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--adm-text-title, #0F172A)',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              width: '100%',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <CheckSquare size={12} color="#6366F1" />
                                            <span>Selecionar Lead</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveLeadMenuId(null);
                                              handleOpenLeadWorkspace(lead, 'whatsapp');
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '6px 8px',
                                              borderRadius: '5px',
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--adm-text-title, #0F172A)',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              width: '100%',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <MessageSquare size={12} color="#10B981" />
                                            <span>Abrir Atendimento</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveLeadMenuId(null);
                                              handleOpenLeadWorkspace(lead, 'tasks');
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '6px 8px',
                                              borderRadius: '5px',
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--adm-text-title, #0F172A)',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              width: '100%',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <CheckSquare size={12} color="#6366F1" />
                                            <span>Criar Tarefa</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveLeadMenuId(null);
                                              setMoveFunnelLead(lead);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '6px 8px',
                                              borderRadius: '5px',
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--adm-text-title, #0F172A)',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              width: '100%',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <GitBranch size={12} color="#F59E0B" />
                                            <span>Mudar de Funil</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={async () => {
                                              setActiveLeadMenuId(null);
                                              if (confirm(`Deseja arquivar o lead "${lead.name}"? Ele será desanexado dos funis ativos.`)) {
                                                await archiveLead(lead.id);
                                              }
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '6px 8px',
                                              borderRadius: '5px',
                                              border: 'none',
                                              background: 'transparent',
                                              color: 'var(--adm-text-title, #0F172A)',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              width: '100%',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Archive size={12} color="#8B5CF6" />
                                            <span>Arquivar Lead</span>
                                          </button>

                                          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.isDev) && (
                                            lead.stage !== 'contract_signed' && (lead.stage as string) !== 'deal_closed' && lead.stage !== 'lost'
                                          ) && (
                                            <>
                                              <div style={{ height: '1px', background: 'var(--adm-border, #E2E8F0)', margin: '2px 0' }} />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveLeadMenuId(null);
                                                  if (confirm(`Deseja realmente excluir o lead "${lead.name}"?`)) {
                                                    deleteLead(lead.id);
                                                  }
                                                }}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  padding: '6px 8px',
                                                  borderRadius: '5px',
                                                  border: 'none',
                                                  background: 'transparent',
                                                  color: '#EF4444',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 600,
                                                  cursor: 'pointer',
                                                  textAlign: 'left',
                                                  width: '100%',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                              >
                                                <Trash2 size={12} color="#EF4444" />
                                                <span>Excluir Lead</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Avatar / Foto do Lead */}
                                  <SafeAvatar
                                    src={(lead as any).avatarUrl || (lead as any).photoUrl}
                                    name={lead.name}
                                    size={24}
                                  />

                                  {/* Nome do Lead e Telefone abaixo */}
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '0px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                                      <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        color: 'var(--adm-text-title, #0F172A)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.15,
                                      }}>
                                        {lead.name}
                                      </span>
                                      {isLeadSpectator(lead) && (
                                        <span title="Modo Espectador: somente leitura" style={{ fontSize: '0.45rem', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '3px', padding: '0 2px', display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                          <Eye size={7} />
                                        </span>
                                      )}
                                      {Boolean(lead.unreadCount && lead.unreadCount > 0) && (
                                        <span style={{
                                          background: '#10B981',
                                          color: '#fff',
                                          fontSize: '0.55rem',
                                          fontWeight: 800,
                                          borderRadius: '8px',
                                          padding: '1px 4px',
                                          minWidth: '14px',
                                          textAlign: 'center',
                                          lineHeight: '1.2',
                                          flexShrink: 0,
                                        }} title={`${lead.unreadCount} nova(s) mensagem(ns)`}>
                                          {lead.unreadCount}
                                        </span>
                                      )}
                                    </div>
                                    {lead.phone && (
                                      <span style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 500,
                                        color: 'var(--adm-text-muted, #64748B)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.1,
                                      }}>
                                        {formatPhone(lead.phone)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Direita: Separador + Valor de Retorno + Selo Circular Verde com $ e Popover Interativo */}
                                {(() => {
                                  const downPayment = lead.downPayment || 0;
                                  const installments = lead.installments || 0;
                                  const installmentVal = lead.installmentValue || (installments > 0 && lead.dealValue ? Math.max(0, (lead.dealValue - downPayment) / installments) : 0);
                                  const potentialValue = (lead.dealValue && lead.dealValue > 0)
                                    ? lead.dealValue
                                    : (downPayment > 0 || installments > 0)
                                    ? (downPayment + (installments * installmentVal))
                                    : (lead.estimatedBudget && lead.estimatedBudget > 0 ? lead.estimatedBudget : null);

                                  if (!potentialValue && downPayment === 0 && installments === 0) return null;

                                  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(potentialValue || 0);
                                  const isValuePopoverOpen = activeValueLeadId === lead.id;
                                  const remainingBalance = (potentialValue || 0) - downPayment;

                                  return (
                                    <div 
                                      data-value-trigger
                                      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, cursor: 'pointer' }}
                                      onMouseEnter={() => setActiveValueLeadId(lead.id)}
                                      onMouseLeave={() => setActiveValueLeadId(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveValueLeadId(isValuePopoverOpen ? null : lead.id);
                                      }}
                                    >
                                      <div style={{ width: '1px', height: '14px', background: 'var(--adm-border, #CBD5E1)', opacity: 0.6 }} />
                                      <span style={{
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        color: '#047857',
                                        letterSpacing: '-0.2px',
                                        whiteSpace: 'nowrap',
                                      }}>
                                        {formattedTotal}
                                      </span>
                                      <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#10B981',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '0.60rem',
                                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                                        flexShrink: 0,
                                      }}>
                                        $
                                      </div>

                                      {/* Popover Financeiro Glassmorphism */}
                                      {isValuePopoverOpen && (
                                        <div
                                          data-value-popover
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 6px)',
                                            right: 0,
                                            zIndex: 99999,
                                            minWidth: '220px',
                                            background: 'var(--adm-bg-card, #FFFFFF)',
                                            border: '1px solid var(--adm-border, #CBD5E1)',
                                            borderRadius: '10px',
                                            boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22), 0 4px 8px -2px rgba(0,0,0,0.1)',
                                            padding: '10px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            pointerEvents: 'auto',
                                          }}
                                        >
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderBottom: '1px solid var(--adm-border, #E2E8F0)',
                                            paddingBottom: '6px',
                                          }}>
                                            <span style={{
                                              fontSize: '0.68rem',
                                              fontWeight: 800,
                                              color: 'var(--adm-text-muted, #64748B)',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.4px',
                                            }}>
                                              Resumo Financeiro
                                            </span>
                                            <span style={{
                                              fontSize: '0.65rem',
                                              fontWeight: 700,
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              color: '#10B981',
                                            }}>
                                              {(lead.stage as string) === 'deal_closed' || (lead.stage as string) === 'contract_signed' ? 'Fechado' : 'Em Negociação'}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>Valor Total:</span>
                                              <span style={{ fontWeight: 800, color: '#047857' }}>{formattedTotal}</span>
                                            </div>

                                            {downPayment > 0 && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>Entrada:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--adm-text-title, #1E293B)' }}>
                                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(downPayment)}
                                                </span>
                                              </div>
                                            )}

                                            {installments > 0 && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>Parcelamento:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--adm-text-title, #1E293B)' }}>
                                                  {installments}x {installmentVal > 0 ? `de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(installmentVal)}` : ''}
                                                </span>
                                              </div>
                                            )}

                                            {downPayment > 0 && remainingBalance > 0 && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>Saldo Restante:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--adm-text-title, #1E293B)' }}>
                                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(remainingBalance)}
                                                </span>
                                              </div>
                                            )}

                                            {lead.eventDate && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--adm-border, #E2E8F0)', paddingTop: '4px', marginTop: '2px' }}>
                                                <span style={{ color: 'var(--adm-text-muted, #64748B)', fontWeight: 500 }}>Data do Evento:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--adm-accent, #6366F1)' }}>
                                                  {new Date(lead.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* ── 2. ÁREA CENTRAL: Nuvem de Tags em Formato Pílula (Pills Suaves + Ícones Profissionais) ── */}
                              {(() => {
                                const chips: Array<{
                                  id: string;
                                  label: string;
                                  icon: React.ReactNode;
                                  bg: string;
                                  color: string;
                                  border: string;
                                  title?: string;
                                }> = [];

                                // 0) Tempo de Espera / SLA (Prioridade Máxima com Ícone de Relógio Lucide)
                                if (pendingWaitMs > 0) {
                                  chips.push({
                                    id: 'wait_time_sla',
                                    label: sla.formattedTime,
                                    icon: <Clock size={9} color={sla.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />,
                                    bg: sla.bg,
                                    color: sla.color,
                                    border: sla.border,
                                    title: `Aguardando resposta da equipe: ${sla.formattedTime} (${sla.label})`,
                                  });
                                }

                                // A) Casa de Festas (Ícone de Estabelecimento Comercial: Store)
                                const venueObj = venues.find(v => v.id === lead.venueId);
                                const venueTitle = venueObj?.name || lead.venueName;
                                if (venueTitle) {
                                  chips.push({
                                    id: 'venue',
                                    label: venueTitle,
                                    icon: <Store size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(99, 102, 241, 0.08)',
                                    color: '#4F46E5',
                                    border: 'rgba(99, 102, 241, 0.22)',
                                    title: `Casa de Festas: ${venueTitle}`,
                                  });
                                }

                                // B) Origem do Lead (Automática)
                                if (lead.subSource) {
                                  chips.push({
                                    id: 'source_sub',
                                    label: lead.subSource,
                                    icon: <PhoneCall size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(16, 185, 129, 0.08)',
                                    color: '#059669',
                                    border: 'rgba(16, 185, 129, 0.22)',
                                    title: `Origem: WhatsApp • Sub-origem: ${lead.subSource}`,
                                  });
                                } else if (lead.source === 'instagram' || lead.sourceName?.toLowerCase().includes('instagram')) {
                                  chips.push({
                                    id: 'source_insta',
                                    label: 'Instagram',
                                    icon: <Link2 size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(236, 72, 153, 0.08)',
                                    color: '#DB2777',
                                    border: 'rgba(236, 72, 153, 0.22)',
                                    title: 'Origem: Instagram',
                                  });
                                } else if (lead.source === 'whatsapp' || lead.sourceName?.toLowerCase().includes('whatsapp')) {
                                  chips.push({
                                    id: 'source_wa',
                                    label: 'WhatsApp',
                                    icon: <PhoneCall size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(16, 185, 129, 0.08)',
                                    color: '#059669',
                                    border: 'rgba(16, 185, 129, 0.22)',
                                    title: 'Origem: WhatsApp Comercial',
                                  });
                                } else if (lead.source === 'indicacao' || (lead.debutanteName && lead.debutanteName !== 'Indicação Externa' && lead.debutanteName !== 'WhatsApp Direto')) {
                                  chips.push({
                                    id: 'source_ind',
                                    label: 'Indicação',
                                    icon: <Gift size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(212, 175, 55, 0.10)',
                                    color: '#B45309',
                                    border: 'rgba(212, 175, 55, 0.25)',
                                    title: `Indicada por: ${lead.debutanteName || 'Indicação'}`,
                                  });
                                } else if (lead.source === 'trafego_pago' || lead.sourceName?.toLowerCase().includes('meta') || lead.sourceName?.toLowerCase().includes('ads')) {
                                  chips.push({
                                    id: 'source_ads',
                                    label: 'Campanha Meta',
                                    icon: <Megaphone size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(168, 85, 247, 0.08)',
                                    color: '#9333EA',
                                    border: 'rgba(168, 85, 247, 0.22)',
                                    title: 'Origem: Campanha Meta / Tráfego Pago',
                                  });
                                } else if ((lead.source as string) === 'form' || lead.sourceName?.toLowerCase().includes('formulário') || lead.sourceName?.toLowerCase().includes('form')) {
                                  chips.push({
                                    id: 'source_form',
                                    label: 'Formulário',
                                    icon: <FileText size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(59, 130, 246, 0.08)',
                                    color: '#2563EB',
                                    border: 'rgba(59, 130, 246, 0.22)',
                                    title: 'Origem: Formulário Web',
                                  });
                                } else if (lead.sourceName) {
                                  chips.push({
                                    id: 'source_custom',
                                    label: lead.sourceName,
                                    icon: <Compass size={9} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(148, 163, 184, 0.08)',
                                    color: '#64748B',
                                    border: 'rgba(148, 163, 184, 0.22)',
                                    title: `Origem: ${lead.sourceName}`,
                                  });
                                }

                                // C) Tipo de Evento & Ano do Evento (Tags Prioritárias)
                                if (lead.eventType) {
                                  chips.push({
                                    id: 'event_type',
                                    label: lead.eventType,
                                    icon: <Sparkles size={8.5} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(168, 85, 247, 0.08)',
                                    color: '#9333EA',
                                    border: 'rgba(168, 85, 247, 0.22)',
                                    title: `Tipo de Evento: ${lead.eventType}`,
                                  });
                                }

                                const eventYearVal = lead.eventYear || (lead.partyDate ? new Date(lead.partyDate).getFullYear().toString() : undefined);
                                if (eventYearVal) {
                                  chips.push({
                                    id: 'event_year',
                                    label: String(eventYearVal),
                                    icon: <Calendar size={8.5} style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(59, 130, 246, 0.08)',
                                    color: '#2563EB',
                                    border: 'rgba(59, 130, 246, 0.22)',
                                    title: `Ano do Evento: ${eventYearVal}`,
                                  });
                                }

                                // D) Sistema de ICP (Perfil de Cliente Ideal - Exclusivo por Unidade)
                                if (hasIcpConfigured(lead)) {
                                  const hasCpAnswers = Boolean(lead.mqlAnswers && Object.keys(lead.mqlAnswers).length > 0) || 
                                    (typeof lead.mqlScore === 'number' && lead.mqlScore > 0);

                                  if (hasCpAnswers) {
                                    const score = lead.mqlScore ?? 0;
                                    const isTop = score >= 80 || lead.mqlLevel === 'top';
                                    const isQualified = (score >= 50 && score < 80) || lead.mqlLevel === 'qualified';
                                    const cpColor = isTop ? '#059669' : isQualified ? '#D97706' : '#DC2626';
                                    const cpBg = isTop ? 'rgba(16, 185, 129, 0.12)' : isQualified ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                                    const cpBorder = isTop ? 'rgba(16, 185, 129, 0.3)' : isQualified ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';

                                    chips.push({
                                      id: 'icp_score',
                                      label: `% ICP ${score}%`,
                                      icon: <IcpTargetUserIcon size={10} color={cpColor} />,
                                      bg: cpBg,
                                      color: cpColor,
                                      border: cpBorder,
                                      title: `Perfil de Cliente Ideal: ${score}%`,
                                    });
                                  } else {
                                    chips.push({
                                      id: 'icp_undefined',
                                      label: 'Indefinido',
                                      icon: <IcpTargetUserIcon size={10} color="#94A3B8" />,
                                      bg: 'var(--adm-bg-input, rgba(148, 163, 184, 0.08))',
                                      color: 'var(--adm-text-muted, #94A3B8)',
                                      border: 'var(--adm-border, rgba(148, 163, 184, 0.2))',
                                      title: 'Perfil ICP Indefinido (Nenhuma pergunta respondida)',
                                    });
                                  }
                                }

                                // D) Temperatura
                                if (lead.temperature === 'hot') {
                                  chips.push({
                                    id: 'temp',
                                    label: 'Quente',
                                    icon: <Flame size={9} color="#EF4444" style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(239, 68, 68, 0.08)',
                                    color: '#EF4444',
                                    border: 'rgba(239, 68, 68, 0.22)',
                                    title: 'Temperatura: Quente',
                                  });
                                } else if (lead.temperature === 'warm') {
                                  chips.push({
                                    id: 'temp',
                                    label: 'Morno',
                                    icon: <SunMedium size={9} color="#F59E0B" style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(245, 158, 11, 0.08)',
                                    color: '#F59E0B',
                                    border: 'rgba(245, 158, 11, 0.22)',
                                    title: 'Temperatura: Morno',
                                  });
                                } else if (lead.temperature === 'cold') {
                                  chips.push({
                                    id: 'temp',
                                    label: 'Frio',
                                    icon: <Snowflake size={9} color="#3B82F6" style={{ flexShrink: 0 }} />,
                                    bg: 'rgba(59, 130, 246, 0.08)',
                                    color: '#3B82F6',
                                    border: 'rgba(59, 130, 246, 0.22)',
                                    title: 'Temperatura: Frio',
                                  });
                                }

                                // E) Tags do Lead (Customizadas)
                                (lead.tags || []).forEach((tag, idx) => {
                                  if (tag && tag.trim()) {
                                    chips.push({
                                      id: `tag_${idx}`,
                                      label: tag.trim(),
                                      icon: <TagIcon size={8.5} color="#64748B" style={{ flexShrink: 0 }} />,
                                      bg: 'rgba(100, 116, 139, 0.08)',
                                      color: 'var(--adm-text-body, #334155)',
                                      border: 'rgba(100, 116, 139, 0.22)',
                                      title: `Tag: ${tag.trim()}`,
                                    });
                                  }
                                });

                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexWrap: 'wrap',
                                    minWidth: 0,
                                  }}>
                                    {chips.map(chip => (
                                      <span
                                        key={chip.id}
                                        title={chip.title || chip.label}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          padding: '2px 6px',
                                          borderRadius: '9999px',
                                          fontSize: '0.58rem',
                                          fontWeight: 700,
                                          background: chip.bg,
                                          border: `1px solid ${chip.border}`,
                                          color: chip.color,
                                          whiteSpace: 'nowrap',
                                          maxWidth: '120px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          lineHeight: 1.15,
                                        }}
                                      >
                                        {chip.icon}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {chip.label}
                                        </span>
                                      </span>
                                    ))}

                                    {/* Botão (+) Tracejado para Adicionar Tag Rápida com Popover Inline */}
                                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                                      <button
                                        type="button"
                                        data-tag-trigger
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddTagLead(addTagLead?.id === lead.id ? null : lead);
                                          setShowCardCustomTagInput(false);
                                          setNewCardTagInput('');
                                        }}
                                        title="Adicionar tag ao lead"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          border: `1px dashed ${addTagLead?.id === lead.id ? 'var(--adm-accent, #6366F1)' : 'var(--adm-border, #94A3B8)'}`,
                                          background: addTagLead?.id === lead.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                          color: addTagLead?.id === lead.id ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-muted, #64748B)',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease',
                                          flexShrink: 0,
                                          padding: 0,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor = 'var(--adm-accent, #6366F1)';
                                          e.currentTarget.style.color = 'var(--adm-accent, #6366F1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          if (addTagLead?.id !== lead.id) {
                                            e.currentTarget.style.borderColor = 'var(--adm-border, #94A3B8)';
                                            e.currentTarget.style.color = 'var(--adm-text-muted, #64748B)';
                                          }
                                        }}
                                      >
                                        <Plus size={9} />
                                      </button>

                                      {addTagLead?.id === lead.id && (
                                        <div
                                          data-tag-popover
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            zIndex: 9999,
                                            minWidth: '190px',
                                            background: 'var(--adm-bg-card, #FFFFFF)',
                                            border: '1px solid var(--adm-border, #CBD5E1)',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                                            padding: '4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            maxHeight: '240px',
                                            overflowY: 'auto',
                                          }}
                                        >
                                          <div style={{
                                            fontSize: '0.64rem',
                                            fontWeight: 800,
                                            color: 'var(--adm-text-muted, #64748B)',
                                            padding: '4px 8px 2px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                          }}>
                                            Tags do Funil
                                          </div>
                                          {(() => {
                                            const funnelTags = currentFunnel?.predefinedTags || [];
                                            const allowCustom = currentFunnel?.allowCollaboratorsCreateTags || (currentFunnel as any)?.duplicateRuleConfig?._allowCollaboratorsCreateTags;

                                            return (
                                              <>
                                                {funnelTags.length === 0 && !allowCustom && (
                                                  <div style={{
                                                    padding: '8px 10px',
                                                    fontSize: '0.72rem',
                                                    color: 'var(--adm-text-muted)',
                                                    textAlign: 'center',
                                                    fontWeight: 500,
                                                  }}>
                                                    Sem tags cadastradas no funil
                                                  </div>
                                                )}
                                                {funnelTags.map((tag) => {
                                                  const currentTags = lead.tags || [];
                                                  const isTagActive = currentTags.includes(tag);
                                                  return (
                                                    <button
                                                      key={tag}
                                                      type="button"
                                                      onClick={() => {
                                                        const updatedTags = isTagActive
                                                          ? currentTags.filter(t => t !== tag)
                                                          : [...currentTags, tag];
                                                        updateLeadData(lead.id, { tags: updatedTags });
                                                        setAddTagLead(null);
                                                      }}
                                                      style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '6px 8px',
                                                        borderRadius: '5px',
                                                        border: isTagActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                                        background: isTagActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                                        color: isTagActive ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-title)',
                                                        fontSize: '0.72rem',
                                                        fontWeight: isTagActive ? 700 : 500,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        width: '100%',
                                                        transition: 'all 0.1s ease',
                                                      }}
                                                      onMouseEnter={(e) => {
                                                        if (!isTagActive) e.currentTarget.style.background = 'var(--adm-bg-input)';
                                                      }}
                                                      onMouseLeave={(e) => {
                                                        if (!isTagActive) e.currentTarget.style.background = 'transparent';
                                                      }}
                                                    >
                                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {tag}
                                                      </span>
                                                      {isTagActive && <Check size={11} color="var(--adm-accent, #6366F1)" />}
                                                    </button>
                                                  );
                                                })}

                                                {/* Se criação de tags avulsas estiver habilitada pelo gestor */}
                                                {allowCustom && (
                                                  <div style={{ borderTop: '1px solid var(--adm-border, #E2E8F0)', marginTop: '4px', paddingTop: '4px' }}>
                                                    {showCardCustomTagInput ? (
                                                      <div style={{ display: 'flex', gap: '4px', padding: '2px 4px' }}>
                                                        <input
                                                          type="text"
                                                          placeholder="Nova tag..."
                                                          value={newCardTagInput}
                                                          onChange={(e) => setNewCardTagInput(e.target.value)}
                                                          onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newCardTagInput.trim()) {
                                                              e.preventDefault();
                                                              const tagVal = newCardTagInput.trim();
                                                              const curTags = lead.tags || [];
                                                              if (!curTags.includes(tagVal)) {
                                                                updateLeadData(lead.id, { tags: [...curTags, tagVal] });
                                                              }
                                                              setNewCardTagInput('');
                                                              setShowCardCustomTagInput(false);
                                                              setAddTagLead(null);
                                                            }
                                                          }}
                                                          autoFocus
                                                          style={{
                                                            flex: 1,
                                                            padding: '4px 6px',
                                                            borderRadius: '4px',
                                                            border: '1px solid var(--adm-border, #CBD5E1)',
                                                            background: 'var(--adm-bg-input, #F8FAFC)',
                                                            color: 'var(--adm-text-title, #1E293B)',
                                                            fontSize: '0.70rem',
                                                          }}
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            if (newCardTagInput.trim()) {
                                                              const tagVal = newCardTagInput.trim();
                                                              const curTags = lead.tags || [];
                                                              if (!curTags.includes(tagVal)) {
                                                                updateLeadData(lead.id, { tags: [...curTags, tagVal] });
                                                              }
                                                              setNewCardTagInput('');
                                                              setShowCardCustomTagInput(false);
                                                              setAddTagLead(null);
                                                            }
                                                          }}
                                                          style={{
                                                            padding: '4px 6px',
                                                            background: 'var(--adm-accent, #6366F1)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                          }}
                                                        >
                                                          OK
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => setShowCardCustomTagInput(true)}
                                                        style={{
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: '4px',
                                                          width: '100%',
                                                          padding: '5px 8px',
                                                          fontSize: '0.70rem',
                                                          fontWeight: 600,
                                                          color: 'var(--adm-accent, #6366F1)',
                                                          background: 'transparent',
                                                          border: 'none',
                                                          cursor: 'pointer',
                                                          borderRadius: '4px',
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                      >
                                                        <Plus size={11} />
                                                        <span>Criar nova tag</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Divisória sutil */}
                              <div style={{ height: '1px', backgroundColor: 'var(--adm-border, #E2E8F0)', opacity: 0.5, margin: '1px 0' }} />

                              {/* ── 3. ÁREA INFERIOR: Foto do Colaborador + Barra de Status/Ações + Data de Criação ── */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                {/* Esquerda: Foto Colaborador + 3 Ícones de Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  {/* Foto dos Colaboradores Responsáveis (SDR e Closer Empilhados se distintos) */}
                                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                    {(() => {
                                      const hasBoth = Boolean(sdrCollab && closerCollab && sdrCollab.id !== closerCollab.id);

                                      const renderCollabAvatar = (collab: typeof sdrCollab, roleLabel: string, isStacked = false) => {
                                        const avatar = collab?.avatarUrl || (collab as any)?.photoUrl;
                                        const initial = (collab?.name || 'U').trim().charAt(0).toUpperCase();

                                        if (avatar) {
                                          return (
                                            <img
                                              key={collab?.id || roleLabel}
                                              src={avatar}
                                              alt={collab?.name || roleLabel}
                                              title={`${roleLabel}: ${collab?.name}`}
                                              style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                flexShrink: 0,
                                                marginLeft: isStacked ? '-6px' : 0,
                                                border: isStacked ? '1.5px solid var(--adm-bg-card, #ffffff)' : 'none',
                                                zIndex: isStacked ? 2 : 1,
                                                boxShadow: isStacked ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
                                              }}
                                              onError={(e) => {
                                                (e.currentTarget as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          );
                                        }

                                        return (
                                          <div
                                            key={collab?.id || roleLabel}
                                            title={`${roleLabel}: ${collab?.name}`}
                                            style={{
                                              width: '22px',
                                              height: '22px',
                                              borderRadius: '50%',
                                              background: roleLabel === 'Closer' ? '#047857' : '#334155',
                                              color: '#F8FAFC',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontWeight: 700,
                                              fontSize: '0.62rem',
                                              flexShrink: 0,
                                              marginLeft: isStacked ? '-6px' : 0,
                                              border: isStacked ? '1.5px solid var(--adm-bg-card, #ffffff)' : 'none',
                                              zIndex: isStacked ? 2 : 1,
                                              boxShadow: isStacked ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
                                            }}
                                          >
                                            {initial}
                                          </div>
                                        );
                                      };

                                      if (hasBoth) {
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {renderCollabAvatar(sdrCollab, 'SDR', false)}
                                            {renderCollabAvatar(closerCollab, 'Closer', true)}
                                          </div>
                                        );
                                      }

                                      const singleCollab = sdrCollab || closerCollab || collaborators.find(c => c.name === lead.assignedTo);
                                      if (singleCollab) {
                                        return renderCollabAvatar(singleCollab, 'Responsável', false);
                                      }

                                      return (
                                        <div
                                          title="Sem responsável atribuído"
                                          style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            background: 'var(--adm-bg-input, #F1F5F9)',
                                            border: '1px dashed var(--adm-border, #CBD5E1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--adm-text-muted, #94A3B8)',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <User size={11} />
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Barra com os 3 Ícones Essenciais (Tarefas, WhatsApp e Agenda) */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    {/* 1. Tarefas (☑ CheckSquare) */}
                                    {(() => {
                                      const allTasks = [...(lead.tasks || []), ...(tasks || []).filter(t => t.leadId === lead.id)];
                                      const pending = allTasks.filter(t => t.status !== 'completed');
                                      const today = new Date().toISOString().split('T')[0];
                                      const overdue = pending.filter(t => t.dueDate && t.dueDate < today).length;
                                      const isAllDone = allTasks.length > 0 && pending.length === 0;

                                      let bg = 'var(--adm-bg-input, #F8FAFC)';
                                      let border = 'var(--adm-border, #E2E8F0)';
                                      let color = '#94A3B8';
                                      let count = 0;

                                      if (overdue > 0) {
                                        bg = 'rgba(239, 68, 68, 0.12)';
                                        border = 'rgba(239, 68, 68, 0.35)';
                                        color = '#DC2626';
                                        count = overdue;
                                      } else if (pending.length > 0) {
                                        bg = 'rgba(245, 158, 11, 0.12)';
                                        border = 'rgba(245, 158, 11, 0.35)';
                                        color = '#D97706';
                                        count = pending.length;
                                      } else if (isAllDone) {
                                        bg = 'rgba(16, 185, 129, 0.15)';
                                        border = 'rgba(16, 185, 129, 0.35)';
                                        color = '#10B981';
                                      }

                                      return (
                                        <div
                                          title={
                                            overdue > 0 ? `${overdue} tarefa(s) atrasada(s)` :
                                            pending.length > 0 ? `${pending.length} tarefa(s) pendente(s)` :
                                            isAllDone ? 'Todas as tarefas concluídas' : 'Sem tarefas'
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLeadWorkspace(lead, 'tasks');
                                          }}
                                          style={{
                                            width: '21px',
                                            height: '21px',
                                            borderRadius: '5px',
                                            background: bg,
                                            border: `1px solid ${border}`,
                                            color: color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            position: 'relative',
                                          }}
                                        >
                                          <CheckSquare size={11} />
                                          {count > 0 && (
                                            <span style={{
                                              position: 'absolute',
                                              top: '-3px',
                                              right: '-3px',
                                              background: color,
                                              color: '#fff',
                                              fontSize: '0.48rem',
                                              fontWeight: 800,
                                              borderRadius: '50%',
                                              minWidth: '10px',
                                              height: '10px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              padding: '0 1px',
                                            }}>
                                              {count}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* 2. WhatsApp (Ícone Oficial WhatsAppBrandIcon) */}
                                    {(() => {
                                      const unread = Number((lead as any).unreadMessagesCount ?? (lead as any).unreadCount ?? (lead as any).pendingMessagesCount ?? 0);
                                      const hasUnread = unread > 0;

                                      return (
                                        <div
                                          title={hasUnread ? `${unread} mensagem(ns) pendente(s)` : 'WhatsApp do Lead'}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLeadWorkspace(lead, 'whatsapp');
                                          }}
                                          style={{
                                            width: '21px',
                                            height: '21px',
                                            borderRadius: '5px',
                                            background: hasUnread ? 'rgba(37, 211, 102, 0.15)' : 'var(--adm-bg-input, #F8FAFC)',
                                            border: hasUnread ? '1px solid rgba(37, 211, 102, 0.4)' : '1px solid var(--adm-border, #E2E8F0)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            position: 'relative',
                                          }}
                                        >
                                          <WhatsAppBrandIcon size={12} color={hasUnread ? '#25D366' : '#94A3B8'} />
                                          {hasUnread && (
                                            <span style={{
                                              position: 'absolute',
                                              top: '-3px',
                                              right: '-3px',
                                              background: '#EF4444',
                                              color: '#fff',
                                              fontSize: '0.48rem',
                                              fontWeight: 800,
                                              borderRadius: '50%',
                                              minWidth: '10px',
                                              height: '10px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              padding: '0 1px',
                                            }}>
                                              {unread}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* 3. Visita (Building2) */}
                                    {(() => {
                                      const visit = lead.visitCommitment;
                                      let visitColor = '#94A3B8';
                                      let visitBg = 'var(--adm-bg-input, #F8FAFC)';
                                      let visitBorder = 'var(--adm-border, #E2E8F0)';
                                      let title = 'Visita: Não agendada';

                                      if (visit?.status === 'completed') {
                                        visitColor = '#10B981';
                                        visitBg = 'rgba(16, 185, 129, 0.15)';
                                        visitBorder = 'rgba(16, 185, 129, 0.4)';
                                        title = `Visita Realizada (${visit.date ? new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''})`;
                                      } else if (visit?.status === 'scheduled') {
                                        visitColor = '#F59E0B';
                                        visitBg = 'rgba(245, 158, 11, 0.15)';
                                        visitBorder = 'rgba(245, 158, 11, 0.4)';
                                        title = `Visita Agendada para ${visit.date ? new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''} às ${visit.time || ''}`;
                                      } else if (visit?.status === 'no_show' || visit?.status === 'cancelled') {
                                        visitColor = '#EF4444';
                                        visitBg = 'rgba(239, 68, 68, 0.15)';
                                        visitBorder = 'rgba(239, 68, 68, 0.4)';
                                        title = 'Visita: Não Compareceu / Cancelada';
                                      }

                                      return (
                                        <div
                                          title={title}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLeadWorkspace(lead, 'tasks');
                                          }}
                                          style={{
                                            width: '21px',
                                            height: '21px',
                                            borderRadius: '5px',
                                            background: visitBg,
                                            border: `1px solid ${visitBorder}`,
                                            color: visitColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.12s ease',
                                          }}
                                        >
                                          <Building2 size={11} color={visitColor} />
                                        </div>
                                      );
                                    })()}

                                    {/* 4. Degustação (Utensils) */}
                                    {(() => {
                                      const tasting = lead.tastingCommitment;
                                      let tastingColor = '#94A3B8';
                                      let tastingBg = 'var(--adm-bg-input, #F8FAFC)';
                                      let tastingBorder = 'var(--adm-border, #E2E8F0)';
                                      let title = 'Degustação: Não agendada';

                                      if (tasting?.status === 'completed') {
                                        tastingColor = '#10B981';
                                        tastingBg = 'rgba(16, 185, 129, 0.15)';
                                        tastingBorder = 'rgba(16, 185, 129, 0.4)';
                                        title = `Degustação Realizada (${tasting.date ? new Date(tasting.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''})`;
                                      } else if (tasting?.status === 'scheduled') {
                                        tastingColor = '#F59E0B';
                                        tastingBg = 'rgba(245, 158, 11, 0.15)';
                                        tastingBorder = 'rgba(245, 158, 11, 0.4)';
                                        title = `Degustação Agendada para ${tasting.date ? new Date(tasting.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''} às ${tasting.time || ''}`;
                                      } else if (tasting?.status === 'no_show' || tasting?.status === 'cancelled') {
                                        tastingColor = '#EF4444';
                                        tastingBg = 'rgba(239, 68, 68, 0.15)';
                                        tastingBorder = 'rgba(239, 68, 68, 0.4)';
                                        title = 'Degustação: Não Compareceu / Cancelada';
                                      }

                                      return (
                                        <div
                                          title={title}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLeadWorkspace(lead, 'tasks');
                                          }}
                                          style={{
                                            width: '21px',
                                            height: '21px',
                                            borderRadius: '5px',
                                            background: tastingBg,
                                            border: `1px solid ${tastingBorder}`,
                                            color: tastingColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.12s ease',
                                          }}
                                        >
                                          <Utensils size={11} color={tastingColor} />
                                        </div>
                                      );
                                    })()}

                                    {/* 5. Bandeira de Nível de Urgência (Flag) */}
                                    {(() => {
                                      const urgency = lead.urgencyLevel;
                                      let flagColor = '#94A3B8';
                                      let flagBg = 'var(--adm-bg-input, #F8FAFC)';
                                      let flagBorder = 'var(--adm-border, #E2E8F0)';
                                      let title = 'Urgência: Normal / Indefinida';

                                      if (urgency === 'urgente' || urgency === 'imediata') {
                                        flagColor = '#EF4444';
                                        flagBg = 'rgba(239, 68, 68, 0.15)';
                                        flagBorder = 'rgba(239, 68, 68, 0.35)';
                                        title = 'Urgência: Urgente / Imediata';
                                      } else if (urgency === 'alta') {
                                        flagColor = '#EA580C';
                                        flagBg = 'rgba(234, 88, 12, 0.15)';
                                        flagBorder = 'rgba(234, 88, 12, 0.35)';
                                        title = 'Urgência: Alta';
                                      } else if (urgency === 'media') {
                                        flagColor = '#F59E0B';
                                        flagBg = 'rgba(245, 158, 11, 0.15)';
                                        flagBorder = 'rgba(245, 158, 11, 0.35)';
                                        title = 'Urgência: Média';
                                      } else if (urgency === 'baixa') {
                                        flagColor = '#10B981';
                                        flagBg = 'rgba(16, 185, 129, 0.15)';
                                        flagBorder = 'rgba(16, 185, 129, 0.35)';
                                        title = 'Urgência: Baixa';
                                      }

                                      return (
                                        <div
                                          title={title}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLeadWorkspace(lead, 'whatsapp');
                                          }}
                                          style={{
                                            width: '21px',
                                            height: '21px',
                                            borderRadius: '5px',
                                            background: flagBg,
                                            border: `1px solid ${flagBorder}`,
                                            color: flagColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.12s ease',
                                          }}
                                        >
                                          <Flag size={11} fill={urgency ? flagColor : 'none'} />
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Direita: Data de Criação (Alinhamento Clean e Elegante) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.55rem', color: 'var(--adm-text-muted, #94A3B8)', lineHeight: 1.1 }}>
                                    Criado em
                                  </span>
                                  <span style={{ fontSize: '0.60rem', fontWeight: 700, color: 'var(--adm-text-body, #475569)', lineHeight: 1.2 }}>
                                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '--/--/----'}
                                  </span>
                                </div>
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

          {/* LIST / TABLE VIEW (100% da área útil, sem bordas boleadas) */}
          {viewMode === 'list' && (
            <div style={{
              width: '100%',
              flex: 1,
              minHeight: 'calc(100vh - 120px)',
              background: 'var(--adm-bg-card)',
              borderTop: '1px solid var(--adm-border)',
              borderRadius: 0,
              overflowX: 'auto',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                <thead>
                  <tr style={{ background: 'var(--adm-bg-elevated)', borderBottom: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)', textAlign: 'left' }}>
                    {isMultiSelectMode && (
                      <th style={{ width: '40px', padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                          ref={el => {
                            if (el) {
                              const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id));
                              const someSelected = filteredLeads.some(l => selectedLeadIds.includes(l.id));
                              el.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeadIds(filteredLeads.map(l => l.id));
                            } else {
                              setSelectedLeadIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: 'var(--adm-accent, #6366F1)' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>{isPostSaleView ? 'Nome do Cliente' : 'Nome do Lead'}</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Telefone</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>{isPostSaleView ? 'Evento / Data' : 'Idade / Origem'}</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>{isPostSaleView ? 'Pacote / Valor' : 'Indicada por'}</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Responsável</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Etapa Atual</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => {
                    const col = columns.find(c => c.id === lead.stage) || columns[0];
                    const hasNoAssignee = !lead.assignedTo || lead.assignedTo === 'Sem responsável' || lead.assignedTo === 'Não atribuído';
                    const isSelectedInMulti = selectedLeadIds.includes(lead.id);
                    const pendingWaitMs = getLeadPendingWaitingTime(lead, collabIdSet);
                    const sla = getLeadWaitTimeSla(pendingWaitMs);

                    return (
                      <tr 
                        key={lead.id}
                        onClick={() => {
                          if (isMultiSelectMode) {
                            toggleLeadSelection(lead.id);
                          } else {
                            handleOpenLeadWorkspace(lead);
                          }
                        }}
                        style={{
                          borderBottom: '1px solid var(--adm-border)',
                          cursor: 'pointer',
                          background: isSelectedInMulti ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelectedInMulti) e.currentTarget.style.background = 'var(--adm-bg-elevated)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelectedInMulti) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {isMultiSelectMode && (
                          <td style={{ width: '40px', padding: '8px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelectedInMulti}
                              onChange={() => toggleLeadSelection(lead.id)}
                              style={{ cursor: 'pointer', accentColor: 'var(--adm-accent, #6366F1)' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '8px 16px', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{lead.name}</span>
                            {pendingWaitMs > 0 && (
                              <span
                                title={`Aguardando resposta da equipe: ${sla.formattedTime} (${sla.label})`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  background: sla.bg,
                                  color: sla.color,
                                  border: `1px solid ${sla.border}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Clock size={9} color={sla.color} strokeWidth={2.5} />
                                {sla.formattedTime}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)', fontWeight: 700 }}>
                            {isPostSaleView ? (lead.code ? (lead.code.startsWith('LEAD-') ? `CLI-${lead.code.replace('LEAD-', '')}` : lead.code) : 'CLI-NOVO') : (lead.code || 'LEAD-NOVO')}
                          </div>
                        </td>
                        <td style={{ padding: '8px 16px', color: 'var(--adm-text-body)' }}>{formatPhone(lead.phone)}</td>
                        <td style={{ padding: '8px 16px' }}>
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
                        <td style={{ padding: '8px 16px' }}>
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
                        <td style={{ padding: '8px 16px' }}>
                          {hasNoAssignee ? (
                            <span style={{ color: '#FBBF24', fontSize: '0.72rem', fontWeight: 800 }}>Não atribuído</span>
                          ) : (
                            <span style={{ color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 700 }}>{lead.assignedTo}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 16px' }}>
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
                            <span style={{ textTransform: 'uppercase' }}>{col.title.toUpperCase()}</span>
                          </span>
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLeadWorkspace(lead);
                            }}
                            style={{
                              background: isPostSaleView ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-accent-bg)',
                              border: `1px solid ${isPostSaleView ? '#06B6D4' : 'var(--adm-accent)'}`,
                              color: isPostSaleView ? '#06B6D4' : 'var(--adm-accent)',
                              borderRadius: '6px',
                              padding: '4px 10px',
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
        defaultFunnelId={(currentFunnel?.id || selectedFunnelId) ?? undefined}
        defaultVenueId={(currentFunnel?.venueId || activeVenueId) ?? undefined}
        currentFunnelName={currentFunnel?.name}
        initialMode={newLeadInitialMode}
        onLeadCreated={(newLeadId) => {
          setActiveLeadIdForWorkspace(newLeadId);
          setInitialWorkspaceTab('whatsapp');
          setViewMode('workspace');
          setIsNewLeadModalOpen(false);
        }}
      />

      {/* Modais de Ações Rápidas do Lead Card */}
      <AdminMoveFunnelModal
        isOpen={Boolean(moveFunnelLead)}
        onClose={() => setMoveFunnelLead(null)}
        lead={moveFunnelLead}
        funnels={funnels}
        onMove={async (leadId, targetFunnelId, targetStageId) => {
          return await reassignLeadFunnel(leadId, targetFunnelId, targetStageId);
        }}
      />

      <AdminQuickTaskModal
        isOpen={Boolean(quickTaskLead)}
        onClose={() => setQuickTaskLead(null)}
        lead={quickTaskLead}
        onAddTask={(leadId, task) => {
          const defaultCollab = collaborators[0];
          addLeadTask(leadId, {
            description: task.title,
            dueDate: task.dueDate || new Date().toISOString().split('T')[0],
            priority: task.priority || 'medium',
            assignedToId: defaultCollab?.id || currentUser?.id || 'admin',
            assignedToName: defaultCollab?.name || currentUser?.name || 'Administrador',
            assignedToAvatarUrl: defaultCollab?.avatarUrl,
            createdByName: currentUser?.name || 'Administrador',
          });
        }}
      />

      {/* ── BARRA FLUTUANTE DE AÇÕES EM MASSA (SELEÇÃO MÚLTIPLA NO FUNIL) ── */}
      {isMultiSelectMode && viewMode !== 'workspace' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'var(--adm-bg-card, #1E293B)',
          border: '1px solid var(--adm-border, #334155)',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title, #FFFFFF)' }}>
            <span style={{ color: 'var(--adm-accent, #6366F1)' }}>{selectedLeadIds.length}</span> de {filteredLeads.length} selecionado(s)
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedLeadIds.length === filteredLeads.length) {
                setSelectedLeadIds([]);
              } else {
                setSelectedLeadIds(filteredLeads.map(l => l.id));
              }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--adm-border, #475569)',
              background: 'transparent',
              color: 'var(--adm-text-secondary, #94A3B8)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {selectedLeadIds.length === filteredLeads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Ação 0: Mudar Funil */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkFunnelModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: selectedLeadIds.length > 0 ? '#F59E0B' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <GitBranch size={13} color="#F59E0B" />
            <span>Mudar Funil</span>
          </button>

          {/* Ação 1: Mover Etapa */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkStageModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'var(--adm-bg-input, #0F172A)' : 'transparent',
              border: '1px solid var(--adm-border, #334155)',
              color: selectedLeadIds.length > 0 ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <GitBranch size={13} color="#3B82F6" />
            <span>Mover Etapa</span>
          </button>

          {/* Ação 2: Atribuir Responsável */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={() => setBulkAssigneeModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'var(--adm-bg-input, #0F172A)' : 'transparent',
              border: '1px solid var(--adm-border, #334155)',
              color: selectedLeadIds.length > 0 ? 'var(--adm-text-title, #FFFFFF)' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <Users size={13} color="#10B981" />
            <span>Atribuir Responsável</span>
          </button>

          {/* Ação 3: Excluir Múltiplos */}
          <button
            type="button"
            disabled={selectedLeadIds.length === 0}
            onClick={handleBulkDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedLeadIds.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: selectedLeadIds.length > 0 ? '#EF4444' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedLeadIds.length > 0 ? 1 : 0.5,
            }}
          >
            <Trash2 size={13} />
            <span>Excluir</span>
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Botão Fechar Seleção Múltipla */}
          <button
            type="button"
            onClick={() => {
              setSelectedLeadIds([]);
              setIsMultiSelectMode(false);
            }}
            title="Cancelar seleção"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modais de Ações em Massa */}
      <AdminBulkMoveFunnelModal
        isOpen={bulkFunnelModalOpen}
        onClose={() => setBulkFunnelModalOpen(false)}
        count={selectedLeadIds.length}
        funnels={funnelsList}
        currentFunnelId={currentFunnel?.id || undefined}
        onConfirm={handleBulkMoveFunnel}
      />

      <AdminBulkMoveStageModal
        isOpen={bulkStageModalOpen}
        onClose={() => setBulkStageModalOpen(false)}
        count={selectedLeadIds.length}
        stages={columns}
        onConfirm={handleBulkMoveStage}
      />

      <AdminBulkAssignModal
        isOpen={bulkAssigneeModalOpen}
        onClose={() => setBulkAssigneeModalOpen(false)}
        count={selectedLeadIds.length}
        collaborators={collaborators}
        onConfirm={handleBulkAssignCollab}
      />
    </div>
  );
};

