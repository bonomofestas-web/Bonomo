import { Select } from '../ui';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HeaderActions } from './HeaderActions';
import { 
  Plus, Search, Kanban, List, LayoutGrid,
  Settings, CheckCircle2,
  ChevronDown, Clock,
  Trash2,
  Check, X, Calendar, CheckSquare,
  Copy, Building2, Layers, Users, DollarSign, ArrowRight, Pin, ShieldCheck,
  Smartphone, ArrowRightLeft, MoreHorizontal, MessageSquare
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminNewClientModal } from './AdminNewClientModal';
import { AdminFunnelSettingsView } from './AdminFunnelSettingsView';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { AdminLeadInspector } from './AdminLeadInspector';
import { AdminCreatePostSaleFunnelModal } from './AdminCreatePostSaleFunnelModal';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import { getDefaultPostSaleFunnelId, filterExtraPostSaleLeads, matchesFunnelStrict as matchesFunnelStrictHelper } from '../../utils/funnelUtils';
import { getClientFamilyLatestMessageTime } from '../../utils/leadSorting';
import { AdminContractKanbanCard } from './AdminContractKanbanCard';
import { ClientPersonKanbanCard } from './ClientPersonKanbanCard';
import { SafeAvatar } from './SafeAvatar';
import { contractService } from '../../services/contractService';
import { AdminLinkContractorModal } from './AdminLinkContractorModal';
import { toast } from 'sonner';
import type { Client, ClientStage, CommercialFunnel } from '../../types/admin';

interface AdminPostSaleKanbanViewProps {
  initialClientId?: string | null;
  onClientOpened?: () => void;
  initialFunnelId?: string | null;
  onSelectFunnel?: (funnelId: string | null) => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenCommercialLead?: (leadId: string) => void;
  onOpenLead?: (leadId: string) => void;
}

interface StageColumn {
  id: ClientStage;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STAGE_COLUMNS: StageColumn[] = [
  { 
    id: 'onboarding', 
    title: 'ONBOARDING & BOAS-VINDAS', 
    color: '#3B82F6', 
    bgColor: 'rgba(59, 130, 246, 0.08)', 
    borderColor: 'rgba(59, 130, 246, 0.3)' 
  },
  { 
    id: 'planning', 
    title: 'PLANEJAMENTO & CRONOGRAMA', 
    color: '#F59E0B', 
    bgColor: 'rgba(245, 158, 11, 0.08)', 
    borderColor: 'rgba(245, 158, 11, 0.3)' 
  },
  { 
    id: 'suppliers', 
    title: 'DEFINIÇÃO DE FORNECEDORES', 
    color: '#8B5CF6', 
    bgColor: 'rgba(139, 92, 246, 0.08)', 
    borderColor: 'rgba(139, 92, 246, 0.3)' 
  },
  { 
    id: 'final_alignment', 
    title: 'ALINHAMENTO FINAL (RETA FINAL)', 
    color: '#6366F1', 
    bgColor: 'rgba(99, 102, 241, 0.08)', 
    borderColor: 'rgba(99, 102, 241, 0.3)' 
  },
  { 
    id: 'party_day', 
    title: 'SEMANA DA FESTA / EVENTO', 
    color: '#EAB308', 
    bgColor: 'rgba(234, 179, 8, 0.08)', 
    borderColor: 'rgba(234, 179, 8, 0.3)' 
  },
  { 
    id: 'completed', 
    title: 'FESTA REALIZADA', 
    color: '#10B981', 
    bgColor: 'rgba(16, 185, 129, 0.08)', 
    borderColor: 'rgba(16, 185, 129, 0.3)' 
  },
  { 
    id: 'lost', 
    title: 'CONTRATO CANCELADO', 
    color: '#EF4444', 
    bgColor: 'rgba(239, 68, 68, 0.08)', 
    borderColor: 'rgba(239, 68, 68, 0.3)' 
  },
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

export const POST_SALE_ENTRY_COLUMN: StageColumn = {
  id: 'new_lead' as any,
  title: 'ENTRADA DO CLIENTE',
  color: '#EF4444',
  bgColor: 'rgba(239, 68, 68, 0.08)',
  borderColor: 'rgba(239, 68, 68, 0.3)',
};

// Formatador seguro de data que impede Invalid Date com ISO ou formatação brasileira
function formatSafeLocalDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).trim();
    if (cleanStr.includes('T')) {
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const parts = cleanStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

// Matcher resiliente entre cliente e coluna do Kanban (impede que clientes em etapas distintas desapareçam do quadro)
const getClientMatchedColumnId = (
  client: Client,
  cols: Array<{ id: string; title: string; isWon?: boolean; isLoss?: boolean }>
): string => {
  if (!cols || cols.length === 0) return '';
  const rawStage = String((client as { stage?: string }).stage || '').toLowerCase().trim();

  // 1. Correspondência direta pelo ID da coluna
  const direct = cols.find(c => String(c.id).toLowerCase().trim() === rawStage);
  if (direct) return direct.id;

  // 2. Correspondência semântica (entrada, ganho/realizada, perda/cancelada)
  if (!rawStage || rawStage === 'new_lead' || rawStage === 'entry' || rawStage === 'onboarding' || rawStage.includes('entrada') || rawStage.includes('onboarding')) {
    const entryCol = cols.find(c => c.id === 'new_lead' || c.id === 'entry' || c.id === 'onboarding' || c.title.toLowerCase().includes('entrada') || c.title.toLowerCase().includes('onboarding'));
    if (entryCol) return entryCol.id;
  }

  if (rawStage === 'completed' || rawStage === 'deal_closed' || rawStage === 'contract_signed' || rawStage.includes('realizad') || rawStage.includes('ganho')) {
    const wonCol = cols.find(c => c.isWon || c.id === 'completed' || c.title.toLowerCase().includes('realizad'));
    if (wonCol) return wonCol.id;
  }

  if (rawStage === 'lost' || rawStage === 'cancelado' || rawStage === 'cancelled' || rawStage.includes('cancelad')) {
    const lossCol = cols.find(c => c.isLoss || c.id === 'lost' || c.title.toLowerCase().includes('cancelad'));
    if (lossCol) return lossCol.id;
  }

  // 3. Fallback seguro para a primeira coluna ativa quando o cliente pertence ao funil mas veio de outra nomenclatura de etapa
  return cols[0].id;
};

export const AdminPostSaleKanbanView: React.FC<AdminPostSaleKanbanViewProps> = ({
  initialFunnelId = null,
  initialClientId = null,
  onClientOpened,
  onSelectFunnel,
  onOpenDebutanteApp,
}) => {
  const { 
    clients, 
    leads,
    venues, 
    collaborators, 
    currentUser,
    viewingAsCollaborator,
    activeVenueId, 
    deleteClient, 
    deleteMultipleClients,
    moveMultipleClientsToLead,
    updateClientStage, 
    funnels, 
    addFunnel,
    duplicateFunnel,
    togglePinFunnel,
    isFunnelPinned,
    tasks,
    appointments,
  } = useAdminState();

  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(initialFunnelId || null);

  const prevFunnelIdRef = useRef<string | null | undefined>(initialFunnelId);
  useEffect(() => {
    if (initialFunnelId !== undefined && initialFunnelId !== prevFunnelIdRef.current) {
      prevFunnelIdRef.current = initialFunnelId;
      setViewMode('kanban');
      if (initialFunnelId && funnels.length > 0) {
        const isPs = funnels.some(f =>
          f.id === initialFunnelId && (
            f.isPostSale ||
            f.category === 'Pós-Venda' ||
            f.category === 'pos_venda' ||
            f.name?.toLowerCase().includes('pós-venda') ||
            f.name?.toLowerCase().includes('pos venda') ||
            f.name?.toLowerCase().includes('sucesso') ||
            f.name?.toLowerCase().includes('decor')
          )
        );
        setSelectedFunnelId(isPs ? initialFunnelId : null);
      } else {
        setSelectedFunnelId(initialFunnelId);
      }
    }
  }, [initialFunnelId, funnels]);

  const handleSelectFunnel = (id: string | null) => {
    setSelectedFunnelId(id);
    setViewMode('kanban'); // Regra de Ouro: todo funil ao abrir reseta para Kanban
    if (id) {
      try { localStorage.setItem('f5_active_funnel_id', id); } catch {}
    }
    if (onSelectFunnel) {
      onSelectFunnel(id);
    }
  };
  const [viewMode, setViewMode] = useState<'kanban' | 'inbox' | 'list'>('kanban');
  const [funnelViewMode, setFunnelViewMode] = useState<'cards' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [funnelSearch, setFunnelSearch] = useState('');
  const [isFunnelMoreMenuOpen, setIsFunnelMoreMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [linkLeadId, setLinkLeadId] = useState<string | null>(null);
  // Clientes que ja tem contrato vinculado: card de contrato x card de pessoa (sem contrato)
  const [contractClientIds, setContractClientIds] = useState<Set<string> | null>(null);
  const boardMasterId = currentUser?.masterId || currentUser?.id || '';
  useEffect(() => {
    let alive = true;
    const load = () => { if (boardMasterId) void contractService.getLinkedClientIds(boardMasterId).then(ids => { if (alive) setContractClientIds(ids); }); };
    load();
    window.addEventListener('f5:contracts-changed', load);
    return () => { alive = false; window.removeEventListener('f5:contracts-changed', load); };
  }, [boardMasterId]);
  const [inspectorClientId, setInspectorClientId] = useState<string | null>(null);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsFunnelId, setActiveSettingsFunnelId] = useState<string | null>(null);
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalFilter = (e: any) => {
      if (e.detail && typeof e.detail.query === 'string') {
        setSearch(e.detail.query);
      }
    };
    const handleOpenNewClient = () => {
      setIsNewClientModalOpen(true);
    };
    window.addEventListener('f5_crm_filter_query', handleGlobalFilter);
    window.addEventListener('f5_open_new_client', handleOpenNewClient);
    return () => {
      window.removeEventListener('f5_crm_filter_query', handleGlobalFilter);
      window.removeEventListener('f5_open_new_client', handleOpenNewClient);
    };
  }, []);

  // Permissão de Configuração: Master, Admin ou Dev
  const canConfigurePostSale = Boolean(
    currentUser?.role === 'master' || 
    currentUser?.role === 'admin' || 
    currentUser?.isDev
  );

  // Filtros Avançados Inline na Barra
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState(false);
  const [clientOwnershipFilter, setClientOwnershipFilter] = useState<'all' | 'open' | 'mine'>('all');
  const [filterState, setFilterState] = useState<{
    period: 'all' | '7d' | '30d' | '90d' | 'this_year';
    venueId: string;
    collaboratorId: string;
    sortBy: 'message_recent' | 'recent' | 'party_date' | 'highest_value' | 'alphabetical';
  }>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    sortBy: 'message_recent',
  });

  // Modo de Seleção Múltipla
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);

  const [isMoveToLeadModalOpen, setIsMoveToLeadModalOpen] = useState(false);
  const [targetCommercialFunnelId, setTargetCommercialFunnelId] = useState('');
  const [targetCommercialStageId, setTargetCommercialStageId] = useState('');
  const [isMovingToLead, setIsMovingToLead] = useState(false);

  const handleBulkMoveToLead = async () => {
    if (!targetCommercialFunnelId || selectedClientIds.length === 0) return;
    setIsMovingToLead(true);
    try {
      await moveMultipleClientsToLead(selectedClientIds, targetCommercialFunnelId, targetCommercialStageId || undefined);
      setSelectedClientIds([]);
      setIsMultiSelectMode(false);
      setIsMoveToLeadModalOpen(false);
    } catch (err) {
      console.error('Erro ao mover clientes para lead:', err);
    } finally {
      setIsMovingToLead(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsFunnelMoreMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleClientSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Funis de Pós-Venda Identificados no Tenant (deduplicados por ID para segurança)
  const postSaleFunnels = useMemo(() => {
    const seenIds = new Set<string>();
    return (funnels || []).filter(f => {
      if (!f?.id || seenIds.has(f.id)) return false;
      const isPs = Boolean(
        f.isPostSale ||
        f.category === 'Pós-Venda' ||
        f.category === 'pos_venda' ||
        f.name?.toLowerCase().includes('pós-venda') ||
        f.name?.toLowerCase().includes('pos venda') ||
        f.name?.toLowerCase().includes('sucesso do cliente') ||
        f.name?.toLowerCase().includes('sucesso') ||
        f.name?.toLowerCase().includes('decor')
      );
      if (isPs) seenIds.add(f.id);
      return isPs;
    });
  }, [funnels]);

  // Funil Atualmente Selecionado no Kanban (estritamente dentre funis de Pós-Venda)
  const currentFunnel = useMemo(() => {
    if (selectedFunnelId) {
      const matched = postSaleFunnels.find(f => f.id === selectedFunnelId);
      if (matched) return matched;
    }
    return null;
  }, [postSaleFunnels, selectedFunnelId]);

  // Recupera unidades vinculadas manualmente a este funil de pós-venda (vínculo estrito, sem inferência automática)
  const getLinkedVenuesForFunnel = (targetFunnel: CommercialFunnel) => {
    const disabledSet = new Set<string>(targetFunnel.disabledVenueIds || []);
    const venueIdSet = new Set<string>();

    // 1. Unidades explicitamente associadas (sharedVenueIds ou targetFunnel.venueId)
    if (targetFunnel.venueId && targetFunnel.venueId !== 'all') {
      if (!disabledSet.has(targetFunnel.venueId)) {
        venueIdSet.add(targetFunnel.venueId);
      }
    }
    const funnelAny = targetFunnel as unknown as { venueIds?: string[]; sharedVenueIds?: string[] };
    const sharedIds = funnelAny.sharedVenueIds || funnelAny.venueIds;
    if (Array.isArray(sharedIds)) {
      sharedIds.forEach((id: string) => {
        if (id && id !== 'all' && !disabledSet.has(id)) venueIdSet.add(id);
      });
    }

    // Vínculo estritamente manual: NÃO infere por origens nem por clientes existentes
    return venues.filter(v => venueIdSet.has(v.id));
  };

  // Duplicar Funil (sem leads nem clientes, apenas configurações)
  const handleDuplicateFunnel = (funnelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newId = duplicateFunnel(funnelId);
    if (newId) {
      handleSelectFunnel(newId);
    }
  };

  // Identificador estável do funil primário de pós-venda (exclui cópias e funis secundários para nunca vazar clientes legados)
  const defaultPostSaleId = useMemo(() => {
    return getDefaultPostSaleFunnelId(postSaleFunnels);
  }, [postSaleFunnels]);

  const matchesFunnelStrict = (itemFunnelId: string | undefined, funnel: CommercialFunnel, allowLegacyFallback: boolean) =>
    matchesFunnelStrictHelper(itemFunnelId, funnel, defaultPostSaleId, allowLegacyFallback);

  const renderFunnelVisual = (funnel: CommercialFunnel, iconSize = 16, boxSize = 34) => {
    const isImage = Boolean(funnel.icon && (funnel.icon.startsWith('http') || funnel.icon.startsWith('/') || funnel.icon.startsWith('data:')));
    return (
      <div style={{
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        borderRadius: '10px',
        backgroundColor: `${funnel.badgeColor || '#06B6D4'}22`,
        border: `1.5px solid ${funnel.badgeColor || '#06B6D4'}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {isImage ? (
          <img src={funnel.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          renderFunnelOrStageIcon(funnel.icon || 'shield-check', iconSize, funnel.badgeColor || '#06B6D4')
        )}
      </div>
    );
  };

  const displayedFunnels = useMemo(() => {
    return postSaleFunnels.filter(f => {
      if (!funnelSearch.trim()) return true;
      const q = funnelSearch.toLowerCase().trim();
      const matchesName = (f.name || '').toLowerCase().includes(q);
      const matchesCat = (f.category || '').toLowerCase().includes(q);
      const linked = getLinkedVenuesForFunnel(f);
      const matchesVenue = linked.some(v => v.name.toLowerCase().includes(q));
      return matchesName || matchesCat || matchesVenue;
    });
  }, [postSaleFunnels, funnelSearch, venues]);

  // Agrupamento estruturado por Unidades e Multi-Unidades (sem duplicar funis)
  const funnelsByVenueGroup = useMemo(() => {
    const groups: { 
      venueName: string; 
      venueId: string; 
      logoUrl?: string; 
      isMultiVenue?: boolean;
      funnels: typeof displayedFunnels 
    }[] = [];

    // 1. Funis Multi-Unidades (Rede Geral ou vinculados a mais de 1 casa)
    const multiVenueFunnels = displayedFunnels.filter(f => {
      if (!f.venueId || f.venueId === 'all') return true;
      const linked = getLinkedVenuesForFunnel(f);
      return linked.length > 1;
    });

    if (multiVenueFunnels.length > 0) {
      groups.push({
        venueName: 'Multi-Unidades (Rede Geral)',
        venueId: 'multi',
        isMultiVenue: true,
        funnels: multiVenueFunnels,
      });
    }

    // 2. Por Unidade física cadastrada (Apenas funis EXCLUSIVOS desta unidade)
    venues.forEach(v => {
      const exclusiveFunnels = displayedFunnels.filter(f => {
        if (multiVenueFunnels.includes(f)) return false;
        const linked = getLinkedVenuesForFunnel(f);
        if (linked.length === 1 && linked[0].id === v.id) return true;
        return f.venueId === v.id;
      });

      if (exclusiveFunnels.length > 0) {
        groups.push({
          venueName: v.name,
          venueId: v.id,
          logoUrl: v.logoUrl,
          isMultiVenue: false,
          funnels: exclusiveFunnels,
        });
      }
    });

    // 3. Fallback se não foi agrupado
    const groupedIds = new Set(groups.flatMap(g => g.funnels.map(f => f.id)));
    const remaining = displayedFunnels.filter(f => !groupedIds.has(f.id));
    if (remaining.length > 0) {
      groups.push({
        venueName: 'Outras Unidades',
        venueId: 'other',
        isMultiVenue: true,
        funnels: remaining,
      });
    }

    return groups;
  }, [displayedFunnels, venues]);

  const getFunnelClientMetrics = (funnel: CommercialFunnel) => {
    const linked = getLinkedVenuesForFunnel(funnel);
    const linkedVenueIds = linked.map(v => v.id);

    const extraClientsFromLeads = filterExtraPostSaleLeads(leads || [], clients || []).filter(l => {
      const explicitlyInFunnel = Boolean(
        l.funnelId && (
          l.funnelId === funnel.id ||
          l.funnelId.trim().toLowerCase() === (funnel.name || '').trim().toLowerCase()
        )
      );
      if (explicitlyInFunnel) return true;
      if (!l.funnelId && funnel.id === defaultPostSaleId) {
        return linkedVenueIds.length === 0 || (l.venueId ? linkedVenueIds.includes(l.venueId) : true);
      }
      return false;
    });

    const combined = [...clients, ...extraClientsFromLeads];
    const funnelClients = combined.filter(c => {
      if ((c as any).isRemovedFromFunnel) return false;
      if (!matchesFunnelStrict((c as any).funnelId, funnel, true)) return false;
      if (!(c as any).funnelId && linkedVenueIds.length > 0 && c.venueId && !linkedVenueIds.includes(c.venueId)) {
        return false;
      }
      return true;
    });

    const activeCount = funnelClients.filter(c => c.stage !== 'completed' && c.stage !== 'lost' && c.stage !== 'archived').length;
    const totalPipeline = funnelClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);
    const partiesNext60 = funnelClients.filter(c => {
      const pStr = c.partyDate || c.eventDate;
      if (!pStr) return false;
      const pTime = new Date(pStr).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((pTime - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 60;
    }).length;

    return {
      totalClients: funnelClients.length,
      activeCount,
      totalPipeline,
      partiesNext60
    };
  };

  // Animações simétricas de recolher/expandir colunas (isoladas por funil)
  const [collapsingColumns, setCollapsingColumns] = useState<Record<string, boolean>>({});
  const [expandingColumns, setExpandingColumns] = useState<Record<string, 'starting' | 'active'>>({});
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  const getPostSaleColKey = (colId: string) => {
    const fId = currentFunnel?.id || activeVenueId || 'post_sale_default';
    return `${fId}:${colId}`;
  };

  const isDefaultPostSaleCollapsed = (colId: string) => {
    return ['completed', 'finalizado', 'lost', 'cancelado'].includes(colId);
  };

  const isColumnCollapsed = (colId: string) => {
    const key = getPostSaleColKey(colId);
    if (collapsedColumns[key] !== undefined) {
      return Boolean(collapsedColumns[key]);
    }
    return isDefaultPostSaleCollapsed(colId);
  };

  const toggleColumnCollapse = (colId: string) => {
    const key = getPostSaleColKey(colId);
    const isCurrentlyCollapsed = isColumnCollapsed(colId);
    if (!isCurrentlyCollapsed) {
      setCollapsingColumns(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCollapsedColumns(prev => ({ ...prev, [key]: true }));
        setCollapsingColumns(prev => ({ ...prev, [key]: false }));
      }, 200);
    } else {
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

  // Colunas Ativas (dinâmicas conforme as etapas reais configuradas no funil)
  const activeStageColumns = useMemo(() => {
    const customNames = currentFunnel?.postSaleCustomStageNames;
    const formatFallbackTitle = (id: string, defaultTitle: string) => {
      if (id === 'completed' && customNames?.won) return customNames.won.toUpperCase();
      if (id === 'lost' && customNames?.lost) return customNames.lost.toUpperCase();
      if ((id === 'entry' || id === 'new_lead') && customNames?.entry) return customNames.entry.toUpperCase();
      return defaultTitle;
    };

    const isEntryActive = Boolean(currentFunnel?.isEntryStageActive || currentFunnel?.enableInboxStage);
    const hasConfiguredStages = Boolean(currentFunnel?.stages && currentFunnel.stages.length > 0);

    let rawCols: { id: ClientStage; title: string; color: string; bgColor: string; borderColor: string; isWon?: boolean; isLoss?: boolean }[] = [];

    if (hasConfiguredStages && currentFunnel?.stages) {
      rawCols = [...currentFunnel.stages]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(st => ({
          id: st.id as any,
          title: (st.name || st.id).trim(),
          color: st.color || '#3B82F6',
          bgColor: `${st.color || '#3B82F6'}14`,
          borderColor: `${st.color || '#3B82F6'}4D`,
          isWon: Boolean(st.isWon),
          isLoss: Boolean(st.isLoss),
        }));
    } else {
      rawCols = STAGE_COLUMNS.map(col => ({
        ...col,
        title: formatFallbackTitle(col.id, col.title),
        isWon: col.id === 'completed',
        isLoss: col.id === 'lost',
      }));
    }

    if (!isEntryActive) {
      // Remove apenas a etapa de caixa de entrada do sistema quando desativada (preservando etapas personalizadas do funil)
      rawCols = rawCols.filter((c, idx) => {
        if (c.id === ('new_lead' as any) || c.id === ('entry' as any)) return false;
        const normalizedTitle = c.title.toLowerCase().trim();
        if (idx === 0 && !c.isWon && !c.isLoss && (normalizedTitle === 'entrada do cliente' || normalizedTitle === 'novo lead' || normalizedTitle === 'entrada')) {
          return false;
        }
        return true;
      });
    } else {
      const existingEntryIndex = rawCols.findIndex(c => c.id === ('new_lead' as any) || c.id === ('entry' as any));
      if (existingEntryIndex >= 0) {
        const entryCol = rawCols[existingEntryIndex];
        const otherCols = rawCols.filter((_, idx) => idx !== existingEntryIndex && rawCols[idx].id !== ('new_lead' as any) && rawCols[idx].id !== ('entry' as any));
        rawCols = [{ ...entryCol, id: 'new_lead' as any, title: entryCol.title || 'ENTRADA DO CLIENTE' }, ...otherCols];
      } else {
        const entryCol = {
          id: 'new_lead' as ClientStage,
          title: formatFallbackTitle('new_lead', 'ENTRADA DO CLIENTE'),
          color: '#EF4444',
          bgColor: '#EF444414',
          borderColor: '#EF44444D',
        };
        rawCols = [entryCol, ...rawCols];
      }
    }

    if (currentFunnel?.isWonStageEnabled === false) {
      rawCols = rawCols.filter(c => !c.isWon && c.id !== 'completed');
    }

    return rawCols;
  }, [currentFunnel]);

  const handleOpenSettings = async (targetFunnelId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let funnelId = targetFunnelId || currentFunnel?.id;
    if (!funnelId) {
      funnelId = await addFunnel({
        name: 'Sucesso do Cliente',
        category: 'Pós-Venda',
        description: 'Organização e acompanhamento da jornada do cliente pós-fechamento',
        venueId: activeVenueId || 'all',
        isEntryStageActive: false,
        isPostSale: true,
        allowedRoles: ['pos_venda', 'master', 'admin'],
        stages: STAGE_COLUMNS.map((st, idx) => ({
          id: st.id,
          name: st.title,
          color: st.color,
          order: idx,
          isFixed: idx === 0 || idx === STAGE_COLUMNS.length - 1,
          isWon: st.id === 'completed',
        })),
      });
    }
    setActiveSettingsFunnelId(funnelId);
    setIsSettingsOpen(true);
  };

  // Opções para os filtros inline
  const periodOptions = [
    { id: 'all', label: 'Todos os Períodos' },
    { id: '7d', label: 'Últimos 7 dias' },
    { id: '30d', label: 'Últimos 30 dias' },
    { id: '90d', label: 'Últimos 90 dias' },
    { id: 'this_year', label: 'Este Ano' },
  ];

  const sortOptions = [
    { id: 'message_recent', label: 'Mensagem Mais Recente' },
    { id: 'recent', label: 'Mais Recentes (Entrada no Funil)' },
    { id: 'party_date', label: 'Data da Festa (Próxima)' },
    { id: 'highest_value', label: 'Maior Rentabilidade' },
    { id: 'alphabetical', label: 'Nome (A-Z)' },
  ];

  // Clientes unificados (combina tabela clients com leads marcados como pós-venda sem duplicar registros)
  const allClients = useMemo<Client[]>(() => {
    const linkedVenueIds = currentFunnel ? getLinkedVenuesForFunnel(currentFunnel).map(v => v.id) : [];

    const extraClientsFromLeads: Client[] = filterExtraPostSaleLeads(leads || [], clients || [])
      .filter(l => {
        // Se o cliente possui funnelId explícito pertencente ao funil atual (ou a qualquer funil pós-venda),
        // ele deve ser exibido no Kanban igual ao Modo WhatsApp
        if (l.funnelId && currentFunnel) {
          return matchesFunnelStrict(l.funnelId, currentFunnel, false);
        }
        if (l.funnelId) {
          return postSaleFunnels.some(pf => matchesFunnelStrict(l.funnelId, pf, false));
        }

        if (currentFunnel && currentFunnel.id !== defaultPostSaleId) {
          return false;
        }
        if (currentFunnel && linkedVenueIds.length > 0 && l.venueId && !linkedVenueIds.includes(l.venueId)) {
          return false;
        }
        return true;
      })
      .map(l => ({
        id: l.id,
        code: l.code || `CLI-${l.id.slice(0, 5).toUpperCase()}`,
        name: l.name,
        avatarUrl: l.avatarUrl || (l as any).photoUrl || (l as any).profilePicUrl || (l as any).custom_field_values?.avatarUrl || (l as any).customFieldValues?.avatarUrl,
        payerName: (l as any).payerName || l.name,
        payerPhone: l.phone,
        stage: (l.stage || 'onboarding') as any,
        venueId: l.venueId,
        venueName: l.venueName,
        dealValue: l.dealValue || 0,
        funnelId: l.funnelId || defaultPostSaleId,
        assignedSuccessManagerId: l.sdrId || l.closerId,
        assignedSuccessManagerName: l.assignedTo || l.sdrName || l.closerName,
        partyDate: l.partyDate || l.eventDate,
        eventDate: l.eventDate || l.partyDate,
        tags: l.tags || [],
        contacts: l.contacts || [],
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: l.updatedAt || new Date().toISOString(),
      } as unknown as Client));

    return [...clients, ...extraClientsFromLeads];
  }, [clients, leads, currentFunnel, postSaleFunnels, defaultPostSaleId, venues]);

  // Filtragem completa e ordenação dos clientes
  const filteredClients = useMemo(() => {
    let list = allClients.filter(client => {
      if ((client as any).isRemovedFromFunnel || client.stage === 'archived') return false;

      // Se for um card solto sem contrato (avulso):
      // Se este contato já foi vinculado a um contrato oficial (como titular ou membro/contato da família),
      // ele NÃO deve aparecer como um card solto no Kanban, pois já está representado dentro do card do contrato!
      const isCardLoose = !(clients || []).some(c => c.id === client.id);
      if (isCardLoose) {
        const rawPhone = client.payerPhone || (client as any).phone || (client as any).payer_phone || '';
        const cPhoneDigits = rawPhone.replace(/\D/g, '').slice(-8);
        if (cPhoneDigits.length >= 8) {
          const isPartOfContract = (clients || []).some(c => {
            const pDigits = (c.payerPhone || (c as any).payer_phone || (c as any).phone || '').replace(/\D/g, '').slice(-8);
            if (pDigits === cPhoneDigits) return true;
            const contactsList = c.contacts || (c as any).contacts;
            if (Array.isArray(contactsList) && contactsList.some((ct: any) => (ct?.phone || '').replace(/\D/g, '').slice(-8) === cPhoneDigits)) {
              return true;
            }
            return false;
          });
          if (isPartOfContract) return false;
        }
      }

      // 0. Funil Vinculado e Unidades (Isolamento Estrito de Funis de Pós-Venda)
      if (currentFunnel) {
        if (!matchesFunnelStrict((client as any).funnelId, currentFunnel, true)) {
          return false;
        }
        if (!(client as any).funnelId) {
          const linkedVenueIds = getLinkedVenuesForFunnel(currentFunnel).map(v => v.id);
          if (linkedVenueIds.length > 0 && client.venueId && !linkedVenueIds.includes(client.venueId)) {
            return false;
          }
        }
      }

      // 1. Casa de Festas (Filtro dropdown adicional)
      const effectiveVenue = filterState.venueId !== 'all' ? filterState.venueId : activeVenueId;
      if (effectiveVenue && effectiveVenue !== 'all' && client.venueId !== effectiveVenue) {
        return false;
      }

      // 2. Colaborador / Gestor de Sucesso
      if (filterState.collaboratorId !== 'all') {
        const matchesCollab = 
          client.assignedSuccessManagerId === filterState.collaboratorId ||
          client.assignedToId === filterState.collaboratorId;
        if (!matchesCollab) return false;
      }

      // 3. Filtro de Ownership (Todos vs Em Aberto vs Meus Clientes)
      if (clientOwnershipFilter === 'open') {
        if (client.stage === 'completed' || client.stage === 'archived') return false;
      } else if (clientOwnershipFilter === 'mine') {
        const isMine = 
          (currentUser?.id && (client.assignedSuccessManagerId === currentUser.id || client.assignedToId === currentUser.id)) ||
          (currentUser?.name && (client.assignedSuccessManagerName?.toLowerCase() === currentUser.name.toLowerCase() || client.assignedTo?.toLowerCase() === currentUser.name.toLowerCase()));
        if (!isMine) return false;
      }

      // 4. Período
      if (filterState.period !== 'all') {
        const cDate = client.funnelEnteredAt || client.contractDate || client.createdAt;
        if (cDate) {
          const clientTime = new Date(cDate).getTime();
          const now = Date.now();
          const diffDays = (now - clientTime) / (1000 * 60 * 60 * 24);
          if (filterState.period === '7d' && diffDays > 7) return false;
          if (filterState.period === '30d' && diffDays > 30) return false;
          if (filterState.period === '90d' && diffDays > 90) return false;
          if (filterState.period === 'this_year') {
            const clientYear = new Date(cDate).getFullYear();
            const currentYear = new Date().getFullYear();
            if (clientYear !== currentYear) return false;
          }
        }
      }

      // 5. Busca
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = (client.birthdayPersonName || client.name || '').toLowerCase().includes(q);
        const matchesPayer = (client.payerName || '').toLowerCase().includes(q);
        const matchesCode = (client.code || '').toLowerCase().includes(q);
        const matchesPhone = (client.payerPhone || '').includes(q);
        if (!matchesName && !matchesPayer && !matchesCode && !matchesPhone) {
          return false;
        }
      }

      return true;
    });

    // Ordenação
    list = [...list].sort((a, b) => {
      // 1. Mensagem mais recente trocada com QUALQUER membro da família do contrato
      if (filterState.sortBy === 'message_recent') {
        const timeA = getClientFamilyLatestMessageTime(a, leads || []);
        const timeB = getClientFamilyLatestMessageTime(b, leads || []);
        return timeB - timeA;
      }
      if (filterState.sortBy === 'party_date') {
        const timeA = a.partyDate || a.eventDate ? new Date(a.partyDate || a.eventDate).getTime() : 9999999999999;
        const timeB = b.partyDate || b.eventDate ? new Date(b.partyDate || b.eventDate).getTime() : 9999999999999;
        return timeA - timeB;
      }
      if (filterState.sortBy === 'highest_value') {
        const valA = a.dealValue || 0;
        const valB = b.dealValue || 0;
        return valB - valA;
      }
      if (filterState.sortBy === 'alphabetical') {
        const nameA = (a.birthdayPersonName || a.name || '').toLowerCase();
        const nameB = (b.birthdayPersonName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      // Padrão: mais recentes (entrada no funil)
      const timeA = new Date(a.funnelEnteredAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.funnelEnteredAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [allClients, currentFunnel, defaultPostSaleId, activeVenueId, filterState, clientOwnershipFilter, search, currentUser, venues, leads]);

  // Handlers para Drag-to-Scroll horizontal do Kanban (arraste livre com a mãozinha)
  const handleBoardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('[draggable="true"]') ||
      target.closest('[data-no-board-drag]')
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

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedClientId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 75) {
        boardRef.current.scrollLeft -= 18;
      } else if (rect.width - x < 75) {
        boardRef.current.scrollLeft += 18;
      }
      if (y < 70) {
        boardRef.current.scrollTop -= 20;
      } else if (rect.height - y < 70) {
        boardRef.current.scrollTop += 20;
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: ClientStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedClientId;
    if (id) {
      updateClientStage(id, targetStage);
    }
    setDraggedClientId(null);
  };

  // Ações em Lote para Seleção Múltipla
  const handleBatchMoveStage = (targetStage: ClientStage) => {
    selectedClientIds.forEach(id => updateClientStage(id, targetStage));
    setSelectedClientIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBatchDelete = async () => {
    if (selectedClientIds.length === 0) return;
    const idsToDelete = [...selectedClientIds];
    setSelectedClientIds([]);
    setIsMultiSelectMode(false);
    await deleteMultipleClients(idsToDelete);
    toast.success(`${idsToDelete.length} cliente(s) excluído(s) com sucesso.`);
  };

  // Redirecionamento exclusivo para o Modo Workspace (elimina qualquer drawer lateral no Pós-Venda)
  useEffect(() => {
    if (inspectorClientId) {
      setSelectedClientId(inspectorClientId);
      setViewMode('inbox');
      setInspectorClientId(null);
    }
  }, [inspectorClientId]);

  // Abertura direta de um contrato/cliente (busca global, tela de Contratos)
  useEffect(() => {
    if (initialClientId) {
      setInspectorClientId(initialClientId);
      onClientOpened?.();
    }
  }, [initialClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isSettingsOpen && (activeSettingsFunnelId || currentFunnel?.id || postSaleFunnels[0]?.id)) {
    return (
      <AdminFunnelSettingsView
        initialFunnelId={activeSettingsFunnelId || currentFunnel?.id || postSaleFunnels[0]?.id}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveSettingsFunnelId(null);
        }}
        onSaved={() => {
          setIsSettingsOpen(false);
          setActiveSettingsFunnelId(null);
        }}
      />
    );
  }

  // ── CENTRAL DE FUNIS DE PÓS-VENDA (PRÉ-TELA QUANDO NENHUM FUNIL ESTIVER SELECIONADO) ──
  if (!selectedFunnelId) {
    const totalClientsCount = allClients.length;
    const totalPipelineSum = allClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);
    const formattedPipeline = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPipelineSum);

    // 5 KPIs Estratégicos & Operacionais de Pós-Venda
    const upcomingPartiesCount = allClients.filter(c => {
      const pStr = c.partyDate || c.eventDate;
      if (!pStr) return false;
      const pTime = new Date(pStr).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((pTime - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 60;
    }).length;

    const tastingsAndVisitsCount = allClients.filter(c => {
      const s = String(c.stage || '').toLowerCase();
      return s.includes('degust') || s.includes('visita') || s.includes('reuniao') || s.includes('alinhamento') || s.includes('planej');
    }).length;

    const appActiveCount = allClients.filter(c => Boolean(c.debutanteId || c.debutanteSlug || (c as any).hasDebutanteApp || (c as any).portalAccess)).length;
    const appActivationRate = totalClientsCount > 0 ? Math.round((appActiveCount / totalClientsCount) * 100) : 0;

    return (
      <div style={{
        padding: '24px 32px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.25s ease-out',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Título e ação primária no menu superior */}
        {canConfigurePostSale && (
          <HeaderActions>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
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
                boxShadow: 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Plus size={16} color="#FFFFFF" />
              <span>Novo Funil Pós-Venda</span>
            </button>
          </HeaderActions>
        )}

        {/* Overview KPIs - 5 Métricas Operacionais Clean (Sem sombras pesadas) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* 1. Clientes Ativos */}
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4', flexShrink: 0 }}>
              <Users size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Clientes na Carteira</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{totalClientsCount}</div>
            </div>
          </div>

          {/* 2. Festas Próximas 60d */}
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', flexShrink: 0 }}>
              <Calendar size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Festas Próximas 60d</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F59E0B' }}>{upcomingPartiesCount}</div>
            </div>
          </div>

          {/* 3. Degustações e Visitas */}
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', flexShrink: 0 }}>
              <Clock size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Visitas & Degustações</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{tastingsAndVisitsCount}</div>
            </div>
          </div>

          {/* 4. App Ativo */}
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0 }}>
              <Smartphone size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>App Aniversariante</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3B82F6' }}>{appActivationRate}% <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>({appActiveCount})</span></div>
            </div>
          </div>

          {/* 5. Volume em Contratos Pós-Venda */}
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
              <DollarSign size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Volume Contratos</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981' }}>{formattedPipeline}</div>
            </div>
          </div>
        </div>

        {/* Search Bar for Funnels + View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '440px' }}>
            <Search size={16} color="#06B6D4" style={{ position: 'absolute', left: '14px', top: '12px' }} />
            <input
              type="text"
              placeholder="Buscar esteira de pós-venda..."
              value={funnelSearch}
              onChange={(e) => setFunnelSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '9px 14px 9px 40px',
                color: 'var(--adm-text-title)',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--adm-bg-input)', padding: '3px', borderRadius: '10px', border: '1px solid var(--adm-border)' }}>
            <button
              type="button"
              onClick={() => setFunnelViewMode('list')}
              title="Visualização em Lista (Por Unidades)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: funnelViewMode === 'list' ? 'var(--adm-bg-card)' : 'transparent',
                color: funnelViewMode === 'list' ? '#06B6D4' : 'var(--adm-text-muted)',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={16} />
            </button>

            <button
              type="button"
              onClick={() => setFunnelViewMode('cards')}
              title="Visualização em Cards"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: funnelViewMode === 'cards' ? 'var(--adm-bg-card)' : 'transparent',
                color: funnelViewMode === 'cards' ? '#06B6D4' : 'var(--adm-text-muted)',
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Funnels View (List or Grid) */}
        {displayedFunnels.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>Nenhum Funil de Pós-Venda Encontrado</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0 }}>Crie um novo funil de pós-venda ou ajuste a busca para visualizar as esteiras.</p>
            </div>
            {canConfigurePostSale && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
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
                <span>Criar Novo Funil Pós-Venda</span>
              </button>
            )}
          </div>
        ) : funnelViewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {funnelsByVenueGroup.map(group => (
              <div key={group.venueId} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Cabeçalho da Unidade / Rede - Limpo, sem retângulo envolvente */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {group.logoUrl ? (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '2px',
                        boxSizing: 'border-box',
                      }}>
                        <img 
                          src={group.logoUrl} 
                          alt={group.venueName} 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: group.isMultiVenue ? 'rgba(6, 182, 212, 0.12)' : 'rgba(20, 169, 215, 0.12)', 
                        border: `1px solid ${group.isMultiVenue ? 'rgba(6, 182, 212, 0.3)' : 'rgba(20, 169, 215, 0.3)'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: group.isMultiVenue ? '#06B6D4' : 'var(--adm-accent)' 
                      }}>
                        {group.isMultiVenue ? <Layers size={16} /> : <Building2 size={16} />}
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {group.venueName}
                      </h4>
                      <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                        {group.funnels.length} {group.funnels.length === 1 ? 'esteira de pós-venda' : 'esteiras de pós-venda'}
                      </span>
                    </div>
                  </div>
                  {canConfigurePostSale && group.venueId !== 'multi' && group.venueId !== 'other' && (
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: '#06B6D4',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      <span>Novo Funil</span>
                    </button>
                  )}
                </div>

                {/* Lista de Funis em Contêiner Único Elegante (Sem retângulos aninhados) */}
                <div style={{
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}>
                  {group.funnels.map((funnel, fIdx) => {
                    const isPinned = isFunnelPinned(funnel.id);
                    const linkedVenues = getLinkedVenuesForFunnel(funnel);
                    const fMetrics = getFunnelClientMetrics(funnel);

                    return (
                      <div
                        key={funnel.id}
                        onClick={() => handleSelectFunnel(funnel.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 18px',
                          borderBottom: fIdx === group.funnels.length - 1 ? 'none' : '1px solid var(--adm-border)',
                          background: 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--adm-bg-input)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Esquerda: Ícone + Nome + Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
                          <div style={{ flexShrink: 0 }}>
                            {renderFunnelVisual(funnel, 15, 30)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {funnel.name}
                              </span>
                              {funnel.isPrimary && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.18)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
                                  PADRÃO
                                </span>
                              )}
                              <span
                                title={`ID do funil: ${funnel.id}`}
                                style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: 'var(--adm-bg-input)',
                                  color: 'var(--adm-text-muted)',
                                  border: '1px solid var(--adm-border)',
                                }}
                              >
                                ID: {funnel.id.slice(0, 8)}
                              </span>
                              {/* Badges de Unidades Vinculadas em Funis Multi-Unidades */}
                              {group.isMultiVenue && linkedVenues.length > 0 && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {linkedVenues.map(lv => (
                                    <span key={lv.id} style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(99, 102, 241, 0.12)',
                                      color: '#818cf8',
                                      border: '1px solid rgba(99, 102, 241, 0.25)',
                                    }}>
                                      {lv.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                              {funnel.stages?.length || 0} etapas • Pós-Venda
                            </span>
                          </div>
                        </div>

                        {/* Centro: Métricas (Clientes, Contratos, Festas 60d) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'center', minWidth: '70px' }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Clientes</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{fMetrics.totalClients}</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Contratos</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#10B981' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(fMetrics.totalPipeline)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '70px' }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Festas 60d</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#06B6D4' }}>{fMetrics.partiesNext60}</div>
                          </div>
                        </div>

                        {/* Direita: Botão Fixar + Configurações + Abrir Funil */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            disabled={Boolean(viewingAsCollaborator)}
                            title={isPinned ? "Desafixar do Workspace" : "Fixar no Workspace"}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinFunnel(funnel.id);
                            }}
                            style={{
                              background: isPinned ? 'var(--adm-accent-bg)' : 'transparent',
                              border: `1px solid ${isPinned ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                              borderRadius: '7px',
                              padding: '5px 8px',
                              color: isPinned ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                              cursor: viewingAsCollaborator ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Pin size={13} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
                          </button>

                          {canConfigurePostSale && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenSettings(funnel.id, e)}
                              title="Configurações e Vínculo de Casas do Funil"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '7px',
                                padding: '5px 8px',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Settings size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectFunnel(funnel.id);
                            }}
                            style={{
                              background: funnel.isPrimary ? '#06B6D4' : 'var(--adm-bg-elevated)',
                              border: funnel.isPrimary ? 'none' : '1px solid var(--adm-border)',
                              color: funnel.isPrimary ? '#FFFFFF' : 'var(--adm-text-title)',
                              borderRadius: '8px',
                              padding: '5px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Abrir</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {displayedFunnels.map(funnel => {
              const linkedVenues = getLinkedVenuesForFunnel(funnel);
              const fMetrics = getFunnelClientMetrics(funnel);
              const isPinned = isFunnelPinned(funnel.id);

              return (
                <div
                  key={funnel.id}
                  onClick={() => handleSelectFunnel(funnel.id)}
                  style={{
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-bg-card)',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    position: 'relative',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = funnel.badgeColor || '#06B6D4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--adm-border)';
                  }}
                >
                  <div>
                    {/* Top Row: Ícone + Nome + Badge Pós-Venda + [Fixar] + [Duplicar] + [Configurações] */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ flexShrink: 0 }}>
                          {renderFunnelVisual(funnel, 15, 32)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                          <h3 style={{
                            fontSize: '0.94rem',
                            fontWeight: 800,
                            color: 'var(--adm-text-title)',
                            margin: 0,
                            letterSpacing: '-0.2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }} title={funnel.name}>
                            {funnel.name}
                          </h3>

                          <span style={{
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: 'rgba(6, 182, 212, 0.12)',
                            color: '#06B6D4',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            flexShrink: 0,
                          }}>
                            <ShieldCheck size={9} />
                            <span>Pós-Venda</span>
                          </span>
                          <span
                            title={`ID do funil: ${funnel.id}`}
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'var(--adm-bg-input)',
                              color: 'var(--adm-text-muted)',
                              border: '1px solid var(--adm-border)',
                              flexShrink: 0,
                            }}
                          >
                            ID: {funnel.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      {/* Top Right: Pin Button + Duplicate + Settings */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={Boolean(viewingAsCollaborator)}
                          title={viewingAsCollaborator ? "Fixação desabilitada no modo Ver como..." : (isPinned ? "Desafixar do meu Workspace" : "Fixar no meu Workspace")}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinFunnel(funnel.id);
                          }}
                          style={{
                            background: isPinned ? 'var(--adm-accent-bg)' : 'transparent',
                            border: `1px solid ${isPinned ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                            borderRadius: '7px',
                            padding: '4px 7px',
                            color: isPinned ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                            cursor: viewingAsCollaborator ? 'not-allowed' : 'pointer',
                            opacity: viewingAsCollaborator ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Pin size={10} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
                          <span>{isPinned ? 'Fixado' : 'Fixar'}</span>
                        </button>

                        {canConfigurePostSale && (
                          <>
                            <button
                              type="button"
                              title="Duplicar Funil de Pós-Venda"
                              onClick={(e) => handleDuplicateFunnel(funnel.id, e)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '7px',
                                padding: '4px 6px',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Copy size={12} />
                            </button>

                            <button
                              type="button"
                              title="Configurações e Vínculo de Casas do Funil"
                              onClick={(e) => handleOpenSettings(funnel.id, e)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '7px',
                                padding: '4px 6px',
                                color: 'var(--adm-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Settings size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bloco de Métricas Flat (sem retângulo interno) */}
                    <div style={{
                      borderTop: '1px solid var(--adm-border)',
                      borderBottom: '1px solid var(--adm-border)',
                      padding: '9px 0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px',
                      textAlign: 'center',
                      marginBottom: '10px',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Clientes</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-text-title)', marginTop: '1px' }}>{fMetrics.totalClients}</div>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--adm-border)', borderRight: '1px solid var(--adm-border)' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Contratos</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#10B981', marginTop: '1px' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(fMetrics.totalPipeline)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Festas 60d</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#06B6D4', marginTop: '1px' }}>{fMetrics.partiesNext60}</div>
                      </div>
                    </div>

                    {/* Tags de Casas de Festas Vinculadas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {linkedVenues.length > 0 ? (
                        linkedVenues.map(v => (
                          <span key={v.id} style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: 'var(--adm-bg-input)',
                            color: 'var(--adm-text-muted)',
                            border: '1px solid var(--adm-border)',
                          }}>
                            {v.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                          Todas as casas vinculadas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--adm-border)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                      {funnel.stages?.length || 0} etapas
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#06B6D4',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <span>Acessar Esteira</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Modal de Criação de Funil de Pós-Venda quando na Central */}
        <AdminCreatePostSaleFunnelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newId) => {
            setSelectedFunnelId(newId);
            setIsCreateModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--adm-bg-app)',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <AdminLinkContractorModal
        leadId={linkLeadId}
        venueId={(currentFunnel?.venueId && currentFunnel.venueId !== 'all') ? currentFunnel.venueId : (activeVenueId !== 'all' ? activeVenueId : undefined)}
        onClose={() => setLinkLeadId(null)}
      />
      {/* ── 1. TOOLBAR COMPACTA PADRÃO COMERCIAL CRM ── */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: 'var(--adm-bg-card)',
        borderBottom: '1px solid var(--adm-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'nowrap',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
      }}>
        {/* Left Side: Funnel Pill + Search + Inline Filters + Ownership Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
          


          {/* Chip de Filtro de Busca Ativa (Alinhado com a Busca Global do Header) */}
          {search.trim() && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'var(--adm-accent-bg, rgba(6, 182, 212, 0.12))',
              border: '1px solid var(--adm-accent, #06B6D4)',
              fontSize: '0.72rem',
              color: 'var(--adm-accent, #06B6D4)',
              fontWeight: 600,
            }}>
              <Search size={11} />
              <span>Filtro: &ldquo;{search}&rdquo;</span>
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Limpar filtro de busca"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'inherit',
                  marginLeft: '2px',
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Botão de Filtros com Popover Flutuante (Anti-quebra de linha) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsFilterBarExpanded(!isFilterBarExpanded)}
              title="Filtros avançados do funil"
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
              {(filterState.period !== 'all' || filterState.venueId !== 'all' || filterState.collaboratorId !== 'all' || filterState.sortBy !== 'recent') && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--adm-accent, #06B6D4)',
                }} />
              )}
              <ChevronDown size={11} style={{ transform: isFilterBarExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Popover Flutuante de Filtros */}
            {isFilterBarExpanded && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 9999,
                background: 'var(--adm-bg-card, #1E1A29)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '220px',
                animation: 'fadeIn 0.15s ease-out',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase' }}>Filtros</span>
                  {(filterState.period !== 'all' || filterState.venueId !== 'all' || filterState.collaboratorId !== 'all' || filterState.sortBy !== 'recent') && (
                    <button
                      type="button"
                      onClick={() => setFilterState({ period: 'all', venueId: 'all', collaboratorId: 'all', sortBy: 'recent' })}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <X size={11} />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '3px' }}>Período:</div>
                    <AdminFilterDropdown
                      value={filterState.period}
                      options={periodOptions}
                      onChange={(val) => setFilterState(prev => ({ ...prev, period: val as any }))}
                    />
                  </div>

                  {venues.length > 1 && (
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '3px' }}>Unidade:</div>
                      <AdminFilterDropdown
                        value={filterState.venueId}
                        options={[
                          { id: 'all', label: 'Todas as Casas' },
                          ...venues.map(v => ({ id: v.id, label: v.name }))
                        ]}
                        onChange={(val) => setFilterState(prev => ({ ...prev, venueId: val }))}
                      />
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '3px' }}>Responsável:</div>
                    <AdminFilterDropdown
                      value={filterState.collaboratorId}
                      options={[
                        { id: 'all', label: 'Todos Colab.' },
                        ...collaborators.filter(c => c.active).map(c => ({ id: c.id, label: c.name }))
                      ]}
                      onChange={(val) => setFilterState(prev => ({ ...prev, collaboratorId: val }))}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '3px' }}>Ordenar por:</div>
                    <AdminFilterDropdown
                      value={filterState.sortBy || 'recent'}
                      options={sortOptions}
                      onChange={(val) => setFilterState(prev => ({ ...prev, sortBy: val as any }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seletor Rápido de Ordenação do Kanban */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AdminFilterDropdown
              value={filterState.sortBy || 'message_recent'}
              options={sortOptions}
              onChange={(val) => setFilterState(prev => ({ ...prev, sortBy: val as any }))}
              maxWidth="195px"
            />
          </div>

          {/* Toggle Rápido: Todos vs Em Aberto vs Meus Clientes */}
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
              onClick={() => setClientOwnershipFilter('all')}
              style={{
                background: clientOwnershipFilter === 'all' ? 'var(--adm-accent-bg)' : 'transparent',
                border: clientOwnershipFilter === 'all' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: clientOwnershipFilter === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: clientOwnershipFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setClientOwnershipFilter('open')}
              style={{
                background: clientOwnershipFilter === 'open' ? 'var(--adm-accent-bg)' : 'transparent',
                border: clientOwnershipFilter === 'open' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: clientOwnershipFilter === 'open' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: clientOwnershipFilter === 'open' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Em Aberto
            </button>
            <button
              type="button"
              onClick={() => setClientOwnershipFilter('mine')}
              style={{
                background: clientOwnershipFilter === 'mine' ? 'var(--adm-accent-bg)' : 'transparent',
                border: clientOwnershipFilter === 'mine' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: clientOwnershipFilter === 'mine' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: clientOwnershipFilter === 'mine' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Meus Clientes
            </button>
          </div>
        </div>

        {/* Right Side: Adicionar Cliente + Seletor de Modo + Configurar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          

          {/* Seletor de Modo Minimalista (Apenas Ícones) */}
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
                setSelectedClientId(null);
                setViewMode('inbox');
              }}
              title="Mensagens / Caixa de Entrada"
              style={{
                background: viewMode === 'inbox' ? 'var(--adm-accent-bg)' : 'transparent',
                color: viewMode === 'inbox' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '5px',
                border: viewMode === 'inbox' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={14} />
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Visualização em Lista / Tabela"
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

            {canConfigurePostSale && (
              <button
                type="button"
                onClick={() => handleOpenSettings()}
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

            {/* Menu de Ações Secundárias (...) */}
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFunnelMoreMenuOpen(prev => !prev)}
                title="Mais opções do funil"
                style={{
                  background: isFunnelMoreMenuOpen || isMultiSelectMode ? 'rgba(99, 102, 241, 0.12)' : 'var(--adm-bg-input)',
                  color: isFunnelMoreMenuOpen || isMultiSelectMode ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-title)',
                  borderRadius: '6px',
                  border: `1px solid ${isFunnelMoreMenuOpen || isMultiSelectMode ? 'var(--adm-accent, #6366F1)' : 'var(--adm-border)'}`,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <MoreHorizontal size={14} />
                {selectedClientIds.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--adm-accent, #6366F1)',
                    color: '#fff',
                    fontSize: '0.55rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {selectedClientIds.length}
                  </span>
                )}
              </button>

              {isFunnelMoreMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: 'var(--adm-bg-card, #ffffff)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '6px',
                  minWidth: '180px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  {/* 1. Seleção Múltipla */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isMultiSelectMode;
                      setIsMultiSelectMode(next);
                      if (!next) setSelectedClientIds([]);
                      setIsFunnelMoreMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isMultiSelectMode ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: isMultiSelectMode ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-title)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <CheckSquare size={13} />
                    <span style={{ flex: 1 }}>{isMultiSelectMode ? 'Desativar Seleção' : 'Seleção Múltipla'}</span>
                    {selectedClientIds.length > 0 && (
                      <span style={{
                        background: 'var(--adm-accent, #6366F1)',
                        color: '#fff',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '10px',
                      }}>
                        {selectedClientIds.length}
                      </span>
                    )}
                  </button>

                  {/* 2. Fixar no Menu */}
                  {currentFunnel && (
                    <button
                      type="button"
                      disabled={Boolean(viewingAsCollaborator)}
                      onClick={() => {
                        togglePinFunnel(currentFunnel.id);
                        setIsFunnelMoreMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isFunnelPinned(currentFunnel.id) ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                        color: isFunnelPinned(currentFunnel.id) ? '#06B6D4' : 'var(--adm-text-title)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: viewingAsCollaborator ? 'not-allowed' : 'pointer',
                        opacity: viewingAsCollaborator ? 0.4 : 1,
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Pin size={13} style={{ transform: isFunnelPinned(currentFunnel.id) ? 'rotate(45deg)' : 'none' }} />
                      <span>{isFunnelPinned(currentFunnel.id) ? 'Desafixar do Menu' : 'Fixar no Menu'}</span>
                    </button>
                  )}

                  {/* 3. Duplicar Funil */}
                  {canConfigurePostSale && currentFunnel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        handleDuplicateFunnel(currentFunnel.id, e);
                        setIsFunnelMoreMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Copy size={13} />
                      <span>Duplicar Funil</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top bar separator */}

      {/* ── 3. MAIN CONTENT: Kanban, Inbox, or List ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: viewMode === 'inbox' ? 0 : '8px 16px 20px', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'inbox' ? (
          <AdminWhatsAppWorkspaceView 
            initialLeadId={selectedClientId || undefined}
            activeFunnelId={currentFunnel?.id || 'post_sale_default'}
            isPostSale={true}
            isEmbeddedInFunnel={true}
            searchQuery={search}
            leadOwnershipFilter={clientOwnershipFilter}
            sortBy={filterState.sortBy}
            onClose={() => setViewMode('kanban')}
            onOpenDebutanteApp={onOpenDebutanteApp}
            onOpenClientFullProfile={(cId) => setInspectorClientId(cId)}
          />
        ) : viewMode === 'kanban' ? (
          /* Kanban Board */
          <div 
            ref={boardRef}
            onMouseDown={handleBoardMouseDown}
            onMouseMove={handleBoardMouseMove}
            onMouseUp={handleBoardMouseUpOrLeave}
            onMouseLeave={handleBoardMouseUpOrLeave}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: '12px',
              overflowX: 'auto',
              overflowY: 'auto',
              flex: 1,
              height: 'calc(100vh - 110px)',
              maxHeight: 'calc(100vh - 110px)',
              width: '100%',
              paddingLeft: '4px',
              paddingRight: '24px',
              paddingTop: '0px',
              paddingBottom: '40px',
              boxSizing: 'border-box',
              cursor: isDraggingBoard ? 'grabbing' : 'grab',
              userSelect: isDraggingBoard ? 'none' : 'auto',
            }}
            className="custom-scrollbar"
          >
            {activeStageColumns.map(column => {
              const stageClients = filteredClients.filter(c => getClientMatchedColumnId(c, activeStageColumns) === column.id);
              const stageValue = stageClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);

              const colKey = getPostSaleColKey(column.id);
              const isCollapsed = isColumnCollapsed(column.id);
              const isCollapsing = Boolean(collapsingColumns[colKey]);
              const expandingState = expandingColumns[colKey];
              const isSlim = isCollapsing || expandingState === 'starting';

              if (isCollapsed) {
                return (
                  <div
                    key={column.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onClick={() => toggleColumnCollapse(column.id)}
                    title={`Clique para expandir a etapa "${column.title.toUpperCase()}" (${stageClients.length} clientes)`}
                    style={{
                      background: 'var(--adm-bg-card, #1E1A29)',
                      border: '1px solid var(--adm-border)',
                      borderTop: `3px solid ${column.color}`,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      position: 'sticky',
                      top: '0px',
                      zIndex: 30,
                      width: '40px',
                      minWidth: '40px',
                      maxWidth: '40px',
                      flex: '0 0 40px',
                      padding: '10px 3px',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      gap: '10px',
                      transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: 'fadeIn 0.18s ease-out',
                      userSelect: 'none',
                      minHeight: '340px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {renderFunnelOrStageIcon((column as any).icon || column.id, 13, column.color)}
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '999px',
                        fontSize: '9px',
                        fontWeight: 800,
                        backgroundColor: `${column.color}20`,
                        color: column.color,
                      }}>
                        {stageClients.length}
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
                      {column.title.toUpperCase()}
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
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  style={{
                    flex: isSlim ? '0 0 40px' : '0 0 280px',
                    width: isSlim ? '40px' : '280px',
                    minWidth: isSlim ? '40px' : '280px',
                    maxWidth: isSlim ? '40px' : '280px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: 'stretch',
                    minHeight: '100%',
                    height: '100%',
                    gap: '6px',
                    boxShadow: 'none',
                    position: 'relative',
                    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), flex 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Column Header (Fixo Sticky no topo sincronizado) */}
                  <div 
                    onClick={() => toggleColumnCollapse(column.id)}
                    title={`Clique para minimizar a etapa "${column.title.toUpperCase()}"`}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      borderTop: `3px solid ${column.color}`,
                      backgroundColor: 'var(--adm-bg-card, #1E1A29)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      position: 'sticky',
                      top: '0px',
                      zIndex: 30,
                      flexShrink: 0,
                      boxShadow: 'none',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                        {isMultiSelectMode && (
                          <input
                            type="checkbox"
                            checked={stageClients.length > 0 && stageClients.every(c => selectedClientIds.includes(c.id))}
                            onClick={(e) => {
                              e.stopPropagation();
                              const allSel = stageClients.length > 0 && stageClients.every(c => selectedClientIds.includes(c.id));
                              if (allSel) {
                                setSelectedClientIds(prev => prev.filter(id => !stageClients.some(c => c.id === id)));
                              } else {
                                const newIds = stageClients.map(c => c.id);
                                setSelectedClientIds(prev => Array.from(new Set([...prev, ...newIds])));
                              }
                            }}
                            style={{ cursor: 'pointer', margin: 0 }}
                          />
                        )}
                        {renderFunnelOrStageIcon((column as any).icon || column.id, 12, column.color)}
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                          {column.title.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '6px',
                          fontSize: '9.5px',
                          fontWeight: 700,
                          backgroundColor: 'var(--adm-bg-card)',
                          color: column.color,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          flexShrink: 0,
                        }}>
                          {stageClients.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumnCollapse(column.id);
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

                  {/* Cards Container - Com scroll individual ultrafino de 4px */}
                  <div 
                    className="kanban-column-scrollbar"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                    style={{
                      padding: '4px 3px 60px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      flex: 1,
                      overflowY: 'auto',
                      maxHeight: 'calc(100vh - 220px)',
                      opacity: isSlim ? 0 : 1,
                      transform: isSlim ? 'translateY(-10px) scale(0.98)' : 'translateY(0) scale(1)',
                      transition: 'opacity 0.20s ease, transform 0.20s ease',
                      pointerEvents: isSlim ? 'none' : 'auto',
                    }}
                  >
                    {stageClients.map(client => {
                      const isSelectedInMulti = selectedClientIds.includes(client.id);
                      const clientTasks = (tasks || []).filter(t =>
                        Boolean(client.id && t.customProperties?.clientId === client.id) ||
                        Boolean(client.id && t.debutanteId === client.id) ||
                        Boolean(client.debutanteId && t.debutanteId === client.debutanteId) ||
                        Boolean(client.commercialLeadId && (t.leadId === client.commercialLeadId || t.customProperties?.leadId === client.commercialLeadId))
                      );
                      const clientApps = (appointments || []).filter(a =>
                        Boolean(client.id && a.debutanteId === client.id) ||
                        Boolean(client.debutanteId && a.debutanteId === client.debutanteId)
                      );

                      const isLoose = !(clients || []).some(c => c.id === client.id);
                      const hasContract = contractClientIds ? contractClientIds.has(client.id) : Boolean(client.contractTitle);
                      if (isLoose || !hasContract) {
                        return (
                          <ClientPersonKanbanCard
                            key={client.id}
                            client={client}
                            isLooseLead={isLoose}
                            isMultiSelectMode={isMultiSelectMode}
                            isSelectedInMulti={isSelectedInMulti}
                            onToggleSelect={toggleClientSelection}
                            onDragStart={handleDragStart}
                            onClick={() => {
                              if (isMultiSelectMode) toggleClientSelection(client.id);
                              else { setSelectedClientId(client.id); setViewMode("inbox"); }
                            }}
                            onOpenInspector={(id) => { setSelectedClientId(id); setViewMode("inbox"); }}
                            onOpenWhatsApp={(id) => { setSelectedClientId(id); setViewMode("inbox"); }}
                            onDeleteClient={(cli) => { deleteClient(cli.id); toast.success(`Cliente "${cli.name}" excluído.`); }}
                            onLinkContractor={setLinkLeadId}
                            venues={venues}
                            collaborators={collaborators}
                          />
                        );
                      }
                      return (
                        <AdminContractKanbanCard
                          key={client.id}
                          client={client}
                          isMultiSelectMode={isMultiSelectMode}
                          isSelectedInMulti={isSelectedInMulti}
                          onToggleSelect={toggleClientSelection}
                          onDragStart={handleDragStart}
                          onClick={() => {
                            if (isMultiSelectMode) {
                              toggleClientSelection(client.id);
                            } else {
                              setSelectedClientId(client.id);
                              setViewMode("inbox");
                            }
                          }}
                          onOpenInspector={(id) => {
                            setSelectedClientId(id);
                            setViewMode("inbox");
                          }}
                          onOpenWhatsApp={(id) => {
                            setSelectedClientId(id);
                            setViewMode("inbox");
                          }}
                          onOpenDebutanteApp={onOpenDebutanteApp}
                          onDeleteClient={(cli) => {
                            deleteClient(cli.id);
                            toast.success(`Cliente "${cli.name}" excluído.`);
                          }}
                          venues={venues}
                          collaborators={collaborators}
                          clientTasks={clientTasks}
                          clientAppointments={clientApps}
                        />
                      );
                    })}

                    {stageClients.length === 0 ? (
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          border: '1px dashed var(--adm-border)',
                          borderRadius: '8px',
                          color: 'var(--adm-text-muted)',
                          fontSize: '0.68rem',
                          fontWeight: 500,
                          textAlign: 'center',
                          padding: '24px 10px',
                          margin: '4px 0',
                          background: 'rgba(255, 255, 255, 0.01)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Layers size={15} strokeWidth={1.5} style={{ opacity: 0.35 }} />
                        <span>Nenhum contrato nesta etapa</span>
                      </div>
                    ) : (
                      /* Drop target elástico na parte inferior da coluna */
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                        style={{
                          flex: 1,
                          minHeight: '80px',
                          width: '100%',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List & Table View */
          <div style={{
            height: '100%',
            backgroundColor: 'var(--adm-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--adm-border)',
            overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--adm-bg-input)',
                  borderBottom: '1px solid var(--adm-border)',
                  textAlign: 'left',
                  color: 'var(--adm-text-muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '12px 16px' }}>Código</th>
                  <th style={{ padding: '12px 16px' }}>Aniversariante (Nome Principal)</th>
                  <th style={{ padding: '12px 16px' }}>Decisor / Pagante</th>
                  <th style={{ padding: '12px 16px' }}>Data da Festa</th>
                  <th style={{ padding: '12px 16px' }}>Casa de Festas</th>
                  <th style={{ padding: '12px 16px' }}>Pacote / Valor</th>
                  <th style={{ padding: '12px 16px' }}>Etapa do Pós-Venda</th>
                  <th style={{ padding: '12px 16px' }}>App de Convidados</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const matchedColId = getClientMatchedColumnId(client, activeStageColumns);
                  const stageCol = activeStageColumns.find(c => c.id === matchedColId) || activeStageColumns[0] || STAGE_COLUMNS[0];

                  return (
                    <tr
                      key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setViewMode('inbox');
                      }}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--adm-accent)',
                        }}>
                          {client.code}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <SafeAvatar
                            src={client.avatarUrl || (client as any).photoUrl || (client as any).profilePicUrl || (client as any).custom_field_values?.avatarUrl}
                            name={client.birthdayPersonName || client.name}
                            size={30}
                          />
                          <div>
                            <strong style={{ color: 'var(--adm-text-title)', display: 'block' }}>
                              {client.birthdayPersonName || client.name}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                              {client.birthdayPersonAge ? `${client.birthdayPersonAge} Anos` : ((client as any).eventType || 'Sem marcação')}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: 'var(--adm-text-title)', display: 'block' }}>{client.payerName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                          {formatPhone(client.payerPhone)}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>
                          {formatSafeLocalDate(client.eventDate || client.partyDate)}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--adm-text-title)' }}>
                        {client.venueName}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#047857' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.dealValue)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)', display: 'block' }}>
                          {client.packageSold}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: stageCol.bgColor,
                          color: stageCol.color,
                          border: `1px solid ${stageCol.borderColor}`,
                          textTransform: 'uppercase',
                        }}>
                          {stageCol.title.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {client.debutanteId ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10B981',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <CheckCircle2 size={12} /> /app/{client.debutanteSlug}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                            Não vinculado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Cadastro de Novo Cliente ── */}
      {isNewClientModalOpen && (
        <AdminNewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
          onClientCreated={(newId) => setSelectedClientId(newId)}
          defaultFunnelId={currentFunnel?.id}
        />
      )}

      {/* ── Modal de Criação de Novo Funil de Pós-Venda ── */}
      <AdminCreatePostSaleFunnelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => {
          setSelectedFunnelId(newId);
          setIsCreateModalOpen(false);
        }}
      />

      {/* ── Modal de Visualização Preview do Lead Comercial (Modo Somente Leitura • Espectador) ── */}
      {(() => {
        const previewLead = previewLeadId ? (leads || []).find(l => l.id === previewLeadId) : null;
        if (!previewLead) return null;
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '92vh',
              background: 'var(--adm-bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--adm-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}>
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(234, 179, 8, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#EAB308" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    Ficha Comercial do Lead (Modo Somente Leitura • Espectador)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewLeadId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <AdminLeadInspector
                  lead={previewLead}
                  readOnly={true}
                  isModal={true}
                  isPostSale={true}
                  onClose={() => setPreviewLeadId(null)}
                  onStageChange={() => {}}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── BARRA FLUTUANTE DE AÇÕES EM MASSA (PADRÃO COMERCIAL F5 SYSTEM) ── */}
      {isMultiSelectMode && (
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
            <span style={{ color: 'var(--adm-accent, #06B6D4)' }}>{selectedClientIds.length}</span> de {filteredClients.length} selecionado(s)
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedClientIds.length === filteredClients.length) {
                setSelectedClientIds([]);
              } else {
                setSelectedClientIds(filteredClients.map(c => c.id));
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
            {selectedClientIds.length === filteredClients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Mover para Etapa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted, #94A3B8)' }}>Etapa:</span>
            {activeStageColumns.slice(0, 4).map(col => (
              <button
                key={col.id}
                type="button"
                disabled={selectedClientIds.length === 0}
                onClick={() => handleBatchMoveStage(col.id)}
                style={{
                  background: 'var(--adm-bg-input, #0F172A)',
                  border: `1px solid ${col.borderColor || 'var(--adm-border)'}`,
                  color: col.color || 'var(--adm-text-title)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: selectedClientIds.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedClientIds.length > 0 ? 1 : 0.5,
                }}
              >
                {col.title.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Mover para Lead (Funil Comercial) */}
          <button
            type="button"
            disabled={selectedClientIds.length === 0}
            onClick={() => {
              const commercialFuns = funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda');
              const first = commercialFuns[0];
              setTargetCommercialFunnelId(first?.id || '');
              setTargetCommercialStageId(first?.stages?.[0]?.id || 'new_lead');
              setIsMoveToLeadModalOpen(true);
            }}
            title="Converter clientes selecionados em leads no funil comercial"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedClientIds.length > 0 ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: selectedClientIds.length > 0 ? 'var(--adm-accent, #6366F1)' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedClientIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedClientIds.length > 0 ? 1 : 0.5,
            }}
          >
            <ArrowRightLeft size={13} color="var(--adm-accent, #6366F1)" />
            <span>Mover para Lead</span>
          </button>

          {/* Excluir em Massa */}
          <button
            type="button"
            disabled={selectedClientIds.length === 0}
            onClick={handleBatchDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: selectedClientIds.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: selectedClientIds.length > 0 ? '#EF4444' : 'var(--adm-text-muted, #64748B)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: selectedClientIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedClientIds.length > 0 ? 1 : 0.5,
            }}
          >
            <Trash2 size={13} />
            <span>Excluir</span>
          </button>

          <div style={{ height: '18px', width: '1px', background: 'var(--adm-border, #334155)' }} />

          {/* Cancelar Seleção */}
          <button
            type="button"
            onClick={() => {
              setSelectedClientIds([]);
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

      {/* Modal Mover Clientes Selecionados para Lead (Funil Comercial) */}
      {isMoveToLeadModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card, #1E1A29)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--adm-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={16} color="var(--adm-accent, #6366F1)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Mover {selectedClientIds.length} Cliente(s) para Lead
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveToLeadModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-body)', margin: 0, lineHeight: 1.45 }}>
                Os contatos selecionados serão transferidos para a base de <strong>Leads Comerciais</strong> com novo código oficial <strong>LEAD-XXXXXX</strong>. Todo o histórico de WhatsApp, anotações e documentos serão preservados integralmente.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '5px' }}>
                  Funil Comercial de Destino
                </label>
                <Select
                  value={targetCommercialFunnelId}
                  onChange={(e) => {
                    const fId = e.target.value;
                    setTargetCommercialFunnelId(fId);
                    const selF = funnels.find(f => f.id === fId);
                    setTargetCommercialStageId(selF?.stages?.[0]?.id || 'new_lead');
                  }}
                  className="adm-input"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  {funnels.filter(f => !f.isPostSale && f.category !== 'Pós-Venda').map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '5px' }}>
                  Etapa Inicial no Comercial
                </label>
                <Select
                  value={targetCommercialStageId}
                  onChange={(e) => setTargetCommercialStageId(e.target.value)}
                  className="adm-input"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  {(funnels.find(f => f.id === targetCommercialFunnelId)?.stages || []).map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </Select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsMoveToLeadModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    background: 'transparent',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!targetCommercialFunnelId || isMovingToLead}
                  onClick={handleBulkMoveToLead}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: (!targetCommercialFunnelId || isMovingToLead) ? 'not-allowed' : 'pointer',
                    opacity: (!targetCommercialFunnelId || isMovingToLead) ? 0.6 : 1,
                  }}
                >
                  {isMovingToLead ? 'Transferindo...' : 'Confirmar Migração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
