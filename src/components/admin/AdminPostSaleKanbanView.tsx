import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Kanban, Inbox, List, 
  PartyPopper, Settings, CheckCircle2,
  ChevronDown, MoreVertical, Store, Tag as TagIcon, Clock, Sparkles,
  MessageSquare, Trash2, ExternalLink,
  Eye, Check, X, Gem, Calendar, CheckSquare, UserPlus
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminNewClientModal } from './AdminNewClientModal';
import { AdminFunnelSettingsView } from './AdminFunnelSettingsView';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
import { AdminClientInspector } from './AdminClientInspector';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { renderFunnelOrStageIcon } from '../../utils/funnelIconLibrary';
import type { ClientStage } from '../../types/admin';

interface AdminPostSaleKanbanViewProps {
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

export const AdminPostSaleKanbanView: React.FC<AdminPostSaleKanbanViewProps> = ({
  onOpenDebutanteApp,
  onOpenCommercialLead,
  onOpenLead,
}) => {
  const { 
    clients, 
    venues, 
    collaborators, 
    currentUser,
    activeVenueId, 
    updateClient, 
    deleteClient, 
    updateClientStage, 
    funnels, 
    addFunnel,
    tasks,
    appointments
  } = useAdminState();

  const [viewMode, setViewMode] = useState<'kanban' | 'inbox' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [inspectorClientId, setInspectorClientId] = useState<string | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsFunnelId, setActiveSettingsFunnelId] = useState<string | null>(null);
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

  // Filtros Avançados Inline na Barra
  const [isFilterBarExpanded, setIsFilterBarExpanded] = useState(false);
  const [clientOwnershipFilter, setClientOwnershipFilter] = useState<'all' | 'open' | 'mine'>('all');
  const [filterState, setFilterState] = useState<{
    period: 'all' | '7d' | '30d' | '90d' | 'this_year';
    venueId: string;
    collaboratorId: string;
    sortBy: 'recent' | 'party_date' | 'highest_value' | 'alphabetical';
  }>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    sortBy: 'recent',
  });

  // Modo de Seleção Múltipla
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Estados de Ações e Interatividades dos Cards
  const [activeClientMenuId, setActiveClientMenuId] = useState<string | null>(null);
  const [hoveredRevenueClientId, setHoveredRevenueClientId] = useState<string | null>(null);
  const [addTagClientId, setAddTagClientId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveClientMenuId(null);
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

  const handleAddTag = (clientId: string) => {
    if (!newTagInput.trim()) {
      setAddTagClientId(null);
      return;
    }
    const targetClient = clients.find(c => c.id === clientId);
    if (!targetClient) return;
    const currentTags = targetClient.tags || [];
    const normalized = newTagInput.trim().toUpperCase();
    if (!currentTags.includes(normalized)) {
      updateClient(clientId, { tags: [...currentTags, normalized] });
    }
    setNewTagInput('');
    setAddTagClientId(null);
  };

  // Animações simétricas de recolher/expandir colunas
  const [collapsingColumns, setCollapsingColumns] = useState<Record<string, boolean>>({});
  const [expandingColumns, setExpandingColumns] = useState<Record<string, 'starting' | 'active'>>({});
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({
    completed: true,
  });

  const toggleColumnCollapse = (colId: string) => {
    const isCurrentlyCollapsed = Boolean(collapsedColumns[colId]);
    if (!isCurrentlyCollapsed) {
      setCollapsingColumns(prev => ({ ...prev, [colId]: true }));
      setTimeout(() => {
        setCollapsedColumns(prev => ({ ...prev, [colId]: true }));
        setCollapsingColumns(prev => ({ ...prev, [colId]: false }));
      }, 200);
    } else {
      setCollapsedColumns(prev => ({ ...prev, [colId]: false }));
      setExpandingColumns(prev => ({ ...prev, [colId]: 'starting' }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExpandingColumns(prev => ({ ...prev, [colId]: 'active' }));
        });
      });
      setTimeout(() => {
        setExpandingColumns(prev => {
          const copy = { ...prev };
          delete copy[colId];
          return copy;
        });
      }, 240);
    }
  };

  const postSaleFunnel = useMemo(() => {
    return (funnels || []).find(f => 
      f.isPostSale || 
      f.category === 'Pós-Venda' || 
      f.category === 'pos_venda' ||
      f.name?.toLowerCase().includes('pós-venda') || 
      f.name?.toLowerCase().includes('pos venda') ||
      f.name?.toLowerCase().includes('sucesso do cliente') ||
      f.name?.toLowerCase().includes('sucesso')
    ) || null;
  }, [funnels]);

  const handleOpenSettings = () => {
    let funnelId = postSaleFunnel?.id;
    if (!funnelId) {
      funnelId = addFunnel({
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
    { id: 'recent', label: 'Mais Recentes' },
    { id: 'party_date', label: 'Data da Festa (Próxima)' },
    { id: 'highest_value', label: 'Maior Rentabilidade' },
    { id: 'alphabetical', label: 'Nome (A-Z)' },
  ];

  // Filtragem completa e ordenação dos clientes
  const filteredClients = useMemo(() => {
    let list = clients.filter(client => {
      // 1. Casa de Festas
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
      // Padrão: mais recentes
      const timeA = new Date(a.funnelEnteredAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.funnelEnteredAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [clients, activeVenueId, filterState, clientOwnershipFilter, search, currentUser]);

  // Overall metrics
  const metrics = useMemo(() => {
    const totalActive = filteredClients.filter(c => c.stage !== 'completed' && c.stage !== 'archived').length;
    const totalRevenue = filteredClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);
    const partiesNext60Days = filteredClients.filter(c => {
      const pStr = c.partyDate || c.eventDate;
      if (!pStr) return false;
      const pTime = new Date(pStr).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((pTime - now) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 60;
    }).length;

    return { totalActive, totalRevenue, partiesNext60Days };
  }, [filteredClients]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedClientId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

  const handleBatchDelete = () => {
    if (confirm(`Deseja realmente excluir os ${selectedClientIds.length} clientes selecionados?`)) {
      selectedClientIds.forEach(id => deleteClient(id));
      setSelectedClientIds([]);
      setIsMultiSelectMode(false);
    }
  };

  if (inspectorClientId) {
    return (
      <AdminClientInspector
        clientId={inspectorClientId}
        onClose={() => setInspectorClientId(null)}
        onOpenDebutanteApp={onOpenDebutanteApp}
        onOpenCommercialLead={onOpenCommercialLead || onOpenLead}
      />
    );
  }

  if (isSettingsOpen && (activeSettingsFunnelId || postSaleFunnel?.id)) {
    return (
      <AdminFunnelSettingsView
        initialFunnelId={activeSettingsFunnelId || postSaleFunnel?.id}
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--adm-bg-app)',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── 1. TOOLBAR COMPACTA PADRÃO COMERCIAL CRM ── */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: 'var(--adm-bg-card)',
        borderBottom: '1px solid var(--adm-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        flexShrink: 0,
        zIndex: 30,
      }}>
        {/* Left Side: Funnel Pill + Search + Inline Filters + Ownership Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          
          {/* Active Funnel Indicator Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 9px',
              borderRadius: '7px',
              background: `${postSaleFunnel?.badgeColor || '#06B6D4'}18`,
              border: `1px solid ${postSaleFunnel?.badgeColor || '#06B6D4'}45`,
              color: 'var(--adm-text-title)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'default',
              flexShrink: 0,
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ color: postSaleFunnel?.badgeColor || '#06B6D4', display: 'inline-flex', alignItems: 'center' }}>
              {renderFunnelOrStageIcon(postSaleFunnel?.icon || 'shield-check', 13, postSaleFunnel?.badgeColor || '#06B6D4')}
            </span>
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              SUCESSO DO CLIENTE
            </span>
          </div>

          {/* Busca Compacta */}
          <div style={{
            position: 'relative',
            width: isFilterBarExpanded ? '150px' : '200px',
            transition: 'width 0.2s ease',
            flexShrink: 0,
          }}>
            <Search size={13} color="var(--adm-accent)" style={{ position: 'absolute', left: '9px', top: '7px' }} />
            <input
              type="text"
              placeholder="Buscar cliente ou telefone..."
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

          {/* Botão de Filtros Inline */}
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

          {/* Filtros Inline Diretos na Barra */}
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

        {/* Right Side: Seleção Múltipla + Adicionar Cliente + Seletor de Modo + Configurar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          
          {/* Botão de Seleção Múltipla */}
          <button
            type="button"
            onClick={() => {
              const next = !isMultiSelectMode;
              setIsMultiSelectMode(next);
              if (!next) setSelectedClientIds([]);
            }}
            title={isMultiSelectMode ? "Sair da seleção múltipla" : "Ativar seleção múltipla de clientes"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: isMultiSelectMode ? 'rgba(6, 182, 212, 0.15)' : 'var(--adm-bg-input)',
              border: `1px solid ${isMultiSelectMode ? '#06B6D4' : 'var(--adm-border)'}`,
              color: isMultiSelectMode ? '#06B6D4' : 'var(--adm-text-title)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckSquare size={13} />
            <span>{isMultiSelectMode ? 'Cancelar Seleção' : 'Seleção Múltipla'}</span>
            {selectedClientIds.length > 0 && (
              <span style={{
                background: '#06B6D4',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
              }}>
                {selectedClientIds.length}
              </span>
            )}
          </button>

          {/* Botão + Adicionar Cliente */}
          <button
            type="button"
            onClick={() => setIsNewClientModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.76rem',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={13} />
            <span>Adicionar Cliente</span>
          </button>

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
              onClick={() => setViewMode('inbox')}
              title="Caixa de Entrada / Chat"
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
              <Inbox size={14} />
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

            <button
              type="button"
              onClick={handleOpenSettings}
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
          </div>
        </div>
      </div>

      {/* ── Barra de Ações em Massa (Quando seleção múltipla ativa com itens selecionados) ── */}
      {isMultiSelectMode && selectedClientIds.length > 0 && (
        <div style={{
          background: 'var(--adm-accent-bg)',
          borderBottom: '1px solid var(--adm-accent)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          fontWeight: 700,
          color: 'var(--adm-accent)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{selectedClientIds.length} cliente(s) selecionado(s)</span>
            <button
              type="button"
              onClick={() => setSelectedClientIds(filteredClients.map(c => c.id))}
              style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-title)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.70rem' }}
            >
              Selecionar Todos ({filteredClients.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClientIds([])}
              style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.70rem' }}
            >
              Desmarcar
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-title)' }}>Mover para etapa:</span>
            {STAGE_COLUMNS.map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleBatchMoveStage(col.id)}
                style={{
                  background: 'var(--adm-bg-card)',
                  border: `1px solid ${col.color}`,
                  color: col.color,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {col.title.split(' ')[0]}
              </button>
            ))}

            <button
              type="button"
              onClick={handleBatchDelete}
              style={{
                background: '#EF4444',
                border: 'none',
                color: '#fff',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '6px',
              }}
            >
              <Trash2 size={11} />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. BARRA DE MÉTRICAS ULTRA-COMPACTA ── */}
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
          Total: <strong style={{ color: 'var(--adm-text-title)' }}>{filteredClients.length}</strong>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
          Próximas Festas (60d): <strong style={{ color: '#F59E0B' }}>{metrics.partiesNext60Days}</strong>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
          Em Andamento: <strong style={{ color: '#06B6D4' }}>{metrics.totalActive}</strong>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
          Carteira Total: <strong style={{ color: 'var(--adm-accent)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.totalRevenue)}
          </strong>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT: Kanban, Inbox, or List ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: viewMode === 'inbox' ? 0 : '8px 16px 20px', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'inbox' ? (
          <AdminWhatsAppWorkspaceView 
            initialLeadId={selectedClientId || undefined}
            activeFunnelId={postSaleFunnel?.id || 'post_sale_default'}
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
              paddingLeft: '4px',
              paddingRight: '24px',
              paddingTop: '6px',
              paddingBottom: '32px',
              boxSizing: 'border-box',
            }}
            className="custom-scrollbar"
          >
            {STAGE_COLUMNS.map(column => {
              const stageClients = filteredClients.filter(c => c.stage === column.id);
              const stageValue = stageClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);

              const isCollapsed = Boolean(collapsedColumns[column.id]);
              const isCollapsing = Boolean(collapsingColumns[column.id]);
              const expandingState = expandingColumns[column.id];
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
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderTop: `3px solid ${column.color}`,
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
                    alignSelf: 'flex-start',
                    gap: '6px',
                    boxShadow: 'none',
                    position: 'relative',
                    overflow: isSlim ? 'hidden' : 'visible',
                    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), flex 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Column Header (Sticky) */}
                  <div 
                    onClick={() => toggleColumnCollapse(column.id)}
                    title={`Clique para minimizar a etapa "${column.title.toUpperCase()}"`}
                    style={{
                      padding: '7px 9px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      borderTop: `3px solid ${column.color}`,
                      backgroundColor: 'var(--adm-bg-card, #1E1A29)',
                      backgroundImage: column.bgColor ? `linear-gradient(${column.bgColor}, ${column.bgColor})` : undefined,
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

                  {/* Cards Container */}
                  <div 
                    style={{
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      opacity: isSlim ? 0 : 1,
                      transform: isSlim ? 'translateY(-10px) scale(0.98)' : 'translateY(0) scale(1)',
                      transition: 'opacity 0.20s ease, transform 0.20s ease',
                      pointerEvents: isSlim ? 'none' : 'auto',
                    }}
                  >
                    {stageClients.map(client => {
                      const pDateStr = client.partyDate || client.eventDate;
                      const pTime = pDateStr ? new Date(pDateStr).getTime() : 0;
                      const daysLeft = pTime ? Math.ceil((pTime - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                      // Cálculos Financeiros (Contrato Base, Sinal, Parcelado, Upsell à vista vs parcelado, Caixa vs Previsto)
                      const baseContract = client.baseContractValue !== undefined ? client.baseContractValue : (client.dealValue || 0);
                      const signalGiven = client.contractDownPayment !== undefined ? client.contractDownPayment : (client.signalValue || 0);
                      const contractRemaining = client.contractInstallmentsRemaining !== undefined 
                        ? client.contractInstallmentsRemaining 
                        : Math.max(0, baseContract - signalGiven);

                      const upsells = client.upsellSales || [];
                      const totalUpsell = upsells.reduce((acc, u) => acc + (Number(u.value) || 0), 0);
                      
                      const upsellAVista = upsells
                        .filter(u => u.paymentType === 'a_vista' || u.paymentType === 'sinal' || u.paymentStatus === 'pago')
                        .reduce((acc, u) => acc + (Number(u.value) || 0), 0);
                      
                      const upsellParcelado = upsells
                        .filter(u => u.paymentType === 'parcelado' || (u.paymentStatus !== 'pago' && u.paymentType !== 'a_vista' && u.paymentType !== 'sinal'))
                        .reduce((acc, u) => acc + (Number(u.value) || 0), 0);

                      const totalCashReceived = signalGiven + upsellAVista;
                      const totalForecastedRemaining = contractRemaining + upsellParcelado;
                      const totalRentabilidade = (client.baseContractValue !== undefined) ? (baseContract + totalUpsell) : (client.dealValue || 0);

                      const managerCollab = collaborators.find(c => 
                        (client.assignedSuccessManagerId && c.id === client.assignedSuccessManagerId) ||
                        (client.assignedToId && c.id === client.assignedToId) ||
                        (client.assignedSuccessManagerName && c.name?.toLowerCase() === client.assignedSuccessManagerName.toLowerCase()) ||
                        (client.assignedTo && c.name?.toLowerCase() === client.assignedTo.toLowerCase())
                      );

                      const isSelectedInMulti = selectedClientIds.includes(client.id);
                      const isMenuOpen = activeClientMenuId === client.id;
                      const isRevenueHovered = hoveredRevenueClientId === client.id;

                      // Tarefas do cliente
                      const clientTasks = (tasks || []).filter(t => t.customProperties?.clientId === client.id || t.debutanteId === client.id || t.debutanteId === client.debutanteId);
                      const pendingTasks = clientTasks.filter(t => t.status !== 'completed');
                      const todayStr = new Date().toISOString().split('T')[0];
                      const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr).length;

                      // Compromissos / Agendamentos do cliente
                      const clientApps = (appointments || []).filter(a => a.debutanteId === client.id || a.debutanteId === client.debutanteId);
                      const pendingApps = clientApps.filter(a => a.status === 'confirmed' || a.status === 'scheduled');

                      return (
                        <div
                          key={client.id}
                          draggable={!isMultiSelectMode}
                          onDragStart={(e) => handleDragStart(e, client.id)}
                          onClick={() => {
                            if (isMultiSelectMode) {
                              toggleClientSelection(client.id);
                            } else {
                              setSelectedClientId(client.id);
                              setViewMode('inbox');
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: isSelectedInMulti ? 'rgba(6, 182, 212, 0.05)' : 'var(--adm-bg-card, #ffffff)',
                            border: isSelectedInMulti ? '1.5px solid #06B6D4' : '1px solid var(--adm-border, #E2E8F0)',
                            boxShadow: isSelectedInMulti ? '0 2px 8px rgba(6, 182, 212, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelectedInMulti) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.06)';
                              e.currentTarget.style.borderColor = '#06B6D4';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelectedInMulti) {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
                              e.currentTarget.style.borderColor = 'var(--adm-border, #E2E8F0)';
                            }
                          }}
                        >
                          {/* ── 1. CABEÇALHO DO CARD: 3 Pontinhos + Avatar + Nome + Telefone + VALOR FINANCEIRO (TOP RIGHT) COM HOVER POPOVER ── */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            {/* Esquerda: Checkbox / 3 Pontinhos + Avatar + Nome + Decisor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                              {isMultiSelectMode ? (
                                <div 
                                  onClick={(e) => toggleClientSelection(client.id, e)}
                                  style={{
                                    width: '15px',
                                    height: '15px',
                                    borderRadius: '3px',
                                    border: `1.5px solid ${isSelectedInMulti ? '#06B6D4' : 'var(--adm-border, #CBD5E1)'}`,
                                    background: isSelectedInMulti ? '#06B6D4' : 'transparent',
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
                                /* Botão 3 Pontinhos com Menu Flutuante */
                                <div style={{ position: 'relative', flexShrink: 0, marginLeft: '-3px' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveClientMenuId(isMenuOpen ? null : client.id);
                                    }}
                                    title="Opções do Cliente"
                                    style={{
                                      background: isMenuOpen ? 'var(--adm-bg-input, #F1F5F9)' : 'transparent',
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

                                  {/* Menu Flutuante */}
                                  {isMenuOpen && (
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
                                        minWidth: '170px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientMenuId(null);
                                          setSelectedClientId(client.id);
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
                                        <Eye size={12} color="var(--adm-accent)" />
                                        <span>Abrir Ficha do Cliente</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientMenuId(null);
                                          setSelectedClientId(client.id);
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
                                        <span>Atendimento WhatsApp</span>
                                      </button>

                                      {client.debutanteSlug && onOpenDebutanteApp && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveClientMenuId(null);
                                            onOpenDebutanteApp(client.debutanteSlug!);
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
                                          <ExternalLink size={12} color="#F59E0B" />
                                          <span>App da Debutante</span>
                                        </button>
                                      )}

                                      <div style={{ height: '1px', background: 'var(--adm-border, #E2E8F0)', margin: '2px 0' }} />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientMenuId(null);
                                          if (confirm(`Deseja realmente excluir o cliente "${client.name}"?`)) {
                                            deleteClient(client.id);
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
                                        <span>Excluir Cliente</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Avatar Monograma Dourado / Foto */}
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#18181B',
                                border: '1px solid rgba(217, 119, 6, 0.4)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <span style={{
                                  color: '#F59E0B',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}>
                                  {((client.birthdayPersonName || client.name) || 'C').trim().charAt(0).toUpperCase()}
                                </span>
                              </div>

                              {/* Nome e Decisor */}
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
                                    {client.birthdayPersonName || client.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 500,
                                    color: 'var(--adm-text-muted, #64748B)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: 1.1,
                                  }}>
                                    {client.payerName ? `Decisor: ${client.payerName}` : client.payerPhone ? formatPhone(client.payerPhone) : client.code}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Direita Superior: Valor Financeiro Total com Selo $ e Popover no Hover (Exato ao CRM Comercial) */}
                            <div 
                              style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                              onMouseEnter={() => setHoveredRevenueClientId(client.id)}
                              onMouseLeave={() => setHoveredRevenueClientId(null)}
                            >
                              <div style={{ width: '1px', height: '14px', background: 'var(--adm-border, #CBD5E1)', opacity: 0.6 }} />
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                color: '#047857',
                                letterSpacing: '-0.2px',
                                whiteSpace: 'nowrap',
                                cursor: 'help',
                              }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalRentabilidade)}
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
                                cursor: 'help',
                              }}>
                                $
                              </div>

                              {/* Popover Hover: Detalhamento Completo de Rentabilidade e Caixa vs Previsto */}
                              {isRevenueHovered && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    right: 0,
                                    zIndex: 300,
                                    width: '260px',
                                    padding: '12px 14px',
                                    background: 'var(--adm-bg-card, #ffffff)',
                                    border: '1px solid var(--adm-border, #CBD5E1)',
                                    borderRadius: '10px',
                                    boxShadow: '0 12px 30px -5px rgba(0,0,0,0.22)',
                                    fontSize: '0.72rem',
                                    color: 'var(--adm-text-body)',
                                    pointerEvents: 'none',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    paddingBottom: '6px',
                                    borderBottom: '1px solid var(--adm-border)',
                                    marginBottom: '8px',
                                    fontWeight: 800,
                                    color: 'var(--adm-text-title)',
                                    fontSize: '0.76rem',
                                  }}>
                                    <Gem size={13} color="#10B981" />
                                    <span>Detalhamento Financeiro do Cliente</span>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {/* Contrato Base */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--adm-text-title)', fontWeight: 700 }}>
                                        📄 Contrato Base:
                                      </span>
                                      <strong style={{ color: 'var(--adm-text-title)' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseContract)}
                                      </strong>
                                    </div>

                                    {/* Detalhes do Contrato: Sinal e Parcelado */}
                                    <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>• Sinal:</span>
                                        <span style={{ color: '#059669', fontWeight: 600 }}>
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(signalGiven)}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>• Parcelado:</span>
                                        <span style={{ color: '#D97706', fontWeight: 600 }}>
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contractRemaining)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Serviços Extras / Upsell */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                      <span style={{ color: '#059669', fontWeight: 700 }}>
                                        💎 Upsell ({upsells.length} {upsells.length === 1 ? 'item' : 'itens'}):
                                      </span>
                                      <strong style={{ color: '#059669' }}>
                                        +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUpsell)}
                                      </strong>
                                    </div>

                                    {/* Detalhes dos Extras: À vista vs Parcelado */}
                                    {upsells.length > 0 && (
                                      <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>• À Vista:</span>
                                          <span style={{ color: '#059669', fontWeight: 600 }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upsellAVista)}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>• Parcelado:</span>
                                          <span style={{ color: '#D97706', fontWeight: 600 }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upsellParcelado)}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Divisória de Resumo de Caixa */}
                                    <div style={{ height: '1px', background: 'var(--adm-border)', margin: '4px 0' }} />

                                    {/* Resumo de Dinheiro em Caixa vs Previsto */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
                                      <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        🟢 Em Caixa:
                                      </span>
                                      <strong style={{ color: '#059669' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCashReceived)}
                                      </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
                                      <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        🟡 Previsto:
                                      </span>
                                      <strong style={{ color: '#D97706' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalForecastedRemaining)}
                                      </strong>
                                    </div>

                                    {/* Faturamento Total Geral */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      paddingTop: '6px',
                                      borderTop: '1px dashed var(--adm-border)',
                                      marginTop: '2px',
                                    }}>
                                      <span style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                        💰 Faturamento Total:
                                      </span>
                                      <strong style={{ fontWeight: 800, color: '#047857', fontSize: '0.84rem' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRentabilidade)}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── 2. LINHA DEDICADA DA DATA DA FESTA / ANIVERSÁRIO (DIRETO E LIMPO, SEM RETÂNGULOS/BOXES) ── */}
                          {pDateStr && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.70rem',
                              lineHeight: 1.2,
                              marginTop: '1px',
                            }}>
                              <PartyPopper size={11} color="#3B82F6" style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
                                {new Date(pDateStr + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {daysLeft !== null && (
                                <span style={{
                                  fontWeight: 600,
                                  color: daysLeft <= 30 ? '#EF4444' : daysLeft <= 90 ? '#F59E0B' : 'var(--adm-accent)',
                                  fontSize: '0.66rem',
                                }}>
                                  ({daysLeft > 0 ? `${daysLeft} dias` : daysLeft === 0 ? '🎉 Hoje!' : 'Realizada'})
                                </span>
                              )}
                            </div>
                          )}

                          {/* ── 3. ÁREA CENTRAL: Nuvem de Tags em Formato Pílula (Pills Suaves + Ícones Profissionais) ── */}
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

                            // A) Casa de Festas (Ícone Store)
                            const venueObj = venues.find(v => v.id === client.venueId);
                            const venueTitle = venueObj?.name || client.venueName;
                            if (venueTitle) {
                              chips.push({
                                id: 'venue',
                                label: venueTitle.toUpperCase(),
                                icon: <Store size={9} style={{ flexShrink: 0 }} />,
                                bg: 'rgba(99, 102, 241, 0.08)',
                                color: '#4F46E5',
                                border: 'rgba(99, 102, 241, 0.22)',
                                title: `CASA DE FESTAS: ${venueTitle.toUpperCase()}`,
                              });
                            }

                            // B) Tipo de Evento (CAPSLOCK)
                            const rawType = (client.eventType || '15 ANOS').replace(/_/g, ' ').toUpperCase();
                            chips.push({
                              id: 'event_type',
                              label: rawType,
                              icon: <Sparkles size={9} style={{ flexShrink: 0 }} />,
                              bg: 'rgba(212, 175, 55, 0.10)',
                              color: '#B45309',
                              border: 'rgba(212, 175, 55, 0.25)',
                              title: `TIPO DE EVENTO: ${rawType}`,
                            });

                            // C) App de Convidados (CAPSLOCK)
                            if (client.debutanteId || client.debutanteSlug) {
                              chips.push({
                                id: 'app_active',
                                label: 'APP ATIVO',
                                icon: <CheckCircle2 size={9} style={{ flexShrink: 0 }} />,
                                bg: 'rgba(16, 185, 129, 0.08)',
                                color: '#059669',
                                border: 'rgba(16, 185, 129, 0.22)',
                                title: `APP ATIVO: /app/${client.debutanteSlug || client.debutanteId}`,
                              });
                            }

                            // D) Tags Customizadas (CAPSLOCK)
                            (client.tags || []).forEach((t, idx) => {
                              if (t && t.trim()) {
                                chips.push({
                                  id: `tag_${idx}`,
                                  label: t.trim().toUpperCase(),
                                  icon: <TagIcon size={8.5} color="#64748B" style={{ flexShrink: 0 }} />,
                                  bg: 'rgba(100, 116, 139, 0.08)',
                                  color: 'var(--adm-text-body, #334155)',
                                  border: 'rgba(100, 116, 139, 0.22)',
                                  title: `TAG: ${t.trim().toUpperCase()}`,
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
                                marginTop: '1px',
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
                                      maxWidth: '130px',
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

                                {/* Adicionar Tag Rápida (+) */}
                                {addTagClientId === client.id ? (
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    <input
                                      type="text"
                                      autoFocus
                                      placeholder="NOVA TAG..."
                                      value={newTagInput}
                                      onChange={(e) => setNewTagInput(e.target.value.toUpperCase())}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddTag(client.id);
                                        if (e.key === 'Escape') setAddTagClientId(null);
                                      }}
                                      style={{
                                        fontSize: '0.58rem',
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--adm-accent)',
                                        background: 'var(--adm-bg-input)',
                                        color: 'var(--adm-text-title)',
                                        width: '80px',
                                        outline: 'none',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddTag(client.id)}
                                      style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', color: '#10B981' }}
                                    >
                                      <Check size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAddTagClientId(null)}
                                      style={{ background: 'transparent', border: 'none', padding: '1px', cursor: 'pointer', color: '#EF4444' }}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddTagClientId(client.id);
                                      setNewTagInput('');
                                    }}
                                    title="Adicionar tag ao cliente"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '50%',
                                      border: '1px dashed var(--adm-border, #94A3B8)',
                                      background: 'transparent',
                                      color: 'var(--adm-text-muted, #64748B)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0,
                                      padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = '#06B6D4';
                                      e.currentTarget.style.color = '#06B6D4';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'var(--adm-border, #94A3B8)';
                                      e.currentTarget.style.color = 'var(--adm-text-muted, #64748B)';
                                    }}
                                  >
                                    <Plus size={9} />
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Divisória sutil */}
                          <div style={{ height: '1px', backgroundColor: 'var(--adm-border, #E2E8F0)', opacity: 0.5, margin: '2px 0 1px' }} />

                          {/* ── 4. ÁREA INFERIOR: Foto do Gestor + 3 Ícones de Status (Tarefas, WhatsApp, Agenda) + Data de Entrada ── */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            {/* Esquerda: Avatar Gestor + 3 Ícones de Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {/* Foto do Gestor de Sucesso */}
                              {managerCollab?.avatarUrl ? (
                                <img
                                  src={managerCollab.avatarUrl}
                                  alt={managerCollab.name}
                                  title={`Sucesso do Cliente: ${managerCollab.name}`}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid var(--adm-border, #E2E8F0)',
                                    flexShrink: 0,
                                  }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div 
                                  title={`Gestão: ${managerCollab?.name || client.assignedSuccessManagerName || 'Pós-Venda'}`}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: 'var(--adm-bg-input, #F1F5F9)',
                                    border: '1px solid var(--adm-border, #E2E8F0)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    color: 'var(--adm-text-muted)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(managerCollab?.name || client.assignedSuccessManagerName || 'P').trim().charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Barra com os 3 Ícones Essenciais (Tarefas, WhatsApp e Agenda) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                {/* 1. Tarefas (☑ CheckSquare) */}
                                {(() => {
                                  let bg = 'var(--adm-bg-input, #F8FAFC)';
                                  let border = 'var(--adm-border, #E2E8F0)';
                                  let color = '#94A3B8';
                                  let count = 0;

                                  if (overdueTasks > 0) {
                                    bg = 'rgba(239, 68, 68, 0.12)';
                                    border = 'rgba(239, 68, 68, 0.35)';
                                    color = '#DC2626';
                                    count = overdueTasks;
                                  } else if (pendingTasks.length > 0) {
                                    bg = 'rgba(245, 158, 11, 0.12)';
                                    border = 'rgba(245, 158, 11, 0.35)';
                                    color = '#D97706';
                                    count = pendingTasks.length;
                                  } else if (clientTasks.length > 0 && pendingTasks.length === 0) {
                                    bg = 'rgba(16, 185, 129, 0.15)';
                                    border = 'rgba(16, 185, 129, 0.35)';
                                    color = '#10B981';
                                  }

                                  return (
                                    <div
                                      title={
                                        overdueTasks > 0 ? `${overdueTasks} tarefa(s) atrasada(s)` :
                                        pendingTasks.length > 0 ? `${pendingTasks.length} tarefa(s) pendente(s)` :
                                        clientTasks.length > 0 ? 'Todas as tarefas concluídas' : 'Tarefas do Cliente'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClientId(client.id);
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

                                {/* 2. WhatsApp (WhatsAppBrandIcon) */}
                                {(() => {
                                  const unread = Number((client as any).unreadMessagesCount ?? (client as any).unreadCount ?? 0);
                                  const hasUnread = unread > 0;

                                  return (
                                    <div
                                      title={hasUnread ? `${unread} mensagem(ns) pendente(s)` : 'WhatsApp do Cliente'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClientId(client.id);
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

                                {/* 3. Agenda / Compromissos (Calendar) */}
                                {(() => {
                                  const hasApp = pendingApps.length > 0;
                                  const hasAppToday = pendingApps.some(a => a.date === todayStr);

                                  return (
                                    <div
                                      title={
                                        hasAppToday ? 'Compromisso agendado para HOJE!' :
                                        hasApp ? `${pendingApps.length} compromisso(s) agendado(s)` :
                                        'Agenda do Cliente'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClientId(client.id);
                                      }}
                                      style={{
                                        width: '21px',
                                        height: '21px',
                                        borderRadius: '5px',
                                        background: hasAppToday ? 'rgba(239, 68, 68, 0.12)' : hasApp ? 'rgba(245, 158, 11, 0.12)' : 'var(--adm-bg-input, #F8FAFC)',
                                        border: `1px solid ${hasAppToday ? 'rgba(239, 68, 68, 0.4)' : hasApp ? 'rgba(245, 158, 11, 0.4)' : 'var(--adm-border, #E2E8F0)'}`,
                                        color: hasAppToday ? '#EF4444' : hasApp ? '#D97706' : '#94A3B8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        position: 'relative',
                                      }}
                                    >
                                      <Calendar size={11} />
                                      {pendingApps.length > 0 && (
                                        <span style={{
                                          position: 'absolute',
                                          top: '-3px',
                                          right: '-3px',
                                          background: hasAppToday ? '#EF4444' : '#D97706',
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
                                          {pendingApps.length}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Direita: Data de Entrada no Funil */}
                            {(() => {
                              const enteredDate = client.funnelEnteredAt || client.contractDate || client.createdAt;
                              if (!enteredDate) return null;
                              return (
                                <span 
                                  title={`Data de entrada no funil de pós-venda: ${new Date(enteredDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 500,
                                    color: 'var(--adm-text-muted, #64748B)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Clock size={9} style={{ opacity: 0.7 }} />
                                  {new Date(enteredDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}

                    {stageClients.length === 0 && (
                      <div style={{
                        padding: '16px 6px',
                        textAlign: 'center',
                        color: 'var(--adm-text-muted)',
                        fontSize: '0.65rem',
                        border: '1.5px dashed var(--adm-border)',
                        borderRadius: '8px',
                        background: 'transparent',
                      }}>
                        Nenhum cliente nesta etapa
                      </div>
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
                  const stageCol = STAGE_COLUMNS.find(c => c.id === client.stage) || STAGE_COLUMNS[0];

                  return (
                    <tr
                      key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setInspectorClientId(client.id);
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
                        <strong style={{ color: 'var(--adm-text-title)', display: 'block' }}>
                          {client.birthdayPersonName || client.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                          {client.birthdayPersonAge ? `${client.birthdayPersonAge} Anos` : '15 Anos'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: 'var(--adm-text-title)', display: 'block' }}>{client.payerName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                          {formatPhone(client.payerPhone)}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>
                          {new Date(client.eventDate).toLocaleDateString('pt-BR')}
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
        />
      )}
    </div>
  );
};
