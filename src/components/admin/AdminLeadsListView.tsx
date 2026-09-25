import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Target, 
  AlertTriangle, 
  Search, 
  Building2, 
  ArrowRightLeft, 
  ExternalLink, 
  X, 
  Phone, 
  Trophy,
  Flame,
  RefreshCw,
  Archive,
  Trash2,
  Clock,
  Check
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { getLeadStageLabel } from '../../utils/leadUtils';
import { SafeAvatar } from './SafeAvatar';
import type { CommercialFunnel } from '../../types/admin';

interface AdminLeadsListViewProps {
  onOpenLead: (leadId: string) => void;
  onNavigateFunnel?: (funnelId: string) => void;
}

export const AdminLeadsListView: React.FC<AdminLeadsListViewProps> = ({
  onOpenLead,
  onNavigateFunnel,
}) => {
  const { 
    currentUser,
    leads, 
    funnels, 
    venues, 
    collaborators, 
    sources,
    activeVenueId,
    reassignLeadFunnel,
    reassignMultipleLeadsFunnel,
    archiveLead,
    unarchiveLead,
    deleteLead,
    deleteMultipleLeads,
  } = useAdminState();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');
  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>('all');
  const [selectedCollabFilter, setSelectedCollabFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'this_month' | 'this_year'>('all');
  const [filterType, setFilterType] = useState<'all' | 'unindexed' | 'active' | 'hot' | 'won' | 'lost' | 'archived'>('all');
  
  // Seleção múltipla para ações em lote
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modal de Realocação de Funil
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassigningLeadIds, setReassigningLeadIds] = useState<string[]>([]);
  const [targetFunnelId, setTargetFunnelId] = useState<string>('');
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Mapa de funis para lookup rápido
  const funnelsMap = useMemo(() => {
    const map = new Map<string, CommercialFunnel>();
    funnels.forEach(f => map.set(f.id, f));
    return map;
  }, [funnels]);

  // Mapa de casas para lookup rápido
  const venuesMap = useMemo(() => {
    const map = new Map<string, string>();
    venues.forEach(v => map.set(v.id, v.name));
    return map;
  }, [venues]);

  // Mapa de colaboradores
  const collabsMap = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string; role: string }>();
    collaborators.forEach(c => map.set(c.id, { name: c.name, avatarUrl: c.avatarUrl, role: c.role }));
    return map;
  }, [collaborators]);

  // Funil alvo selecionado no modal
  const targetFunnel = useMemo(() => {
    return funnels.find(f => f.id === targetFunnelId) || funnels[0] || null;
  }, [funnels, targetFunnelId]);

  // Permissão de exclusão
  const canDeleteLeads = currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.isDev;

  // Atualiza targetFunnelId quando abrir modal
  const handleOpenReassignModal = (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    setReassigningLeadIds(leadIds);
    const defaultFunnel = funnels[0];
    if (defaultFunnel) {
      setTargetFunnelId(defaultFunnel.id);
      setTargetStageId(defaultFunnel.stages?.[0]?.id || 'new_lead');
    }
    setIsReassignModalOpen(true);
  };

  const handleConfirmReassign = async () => {
    if (!targetFunnelId || reassigningLeadIds.length === 0) return;
    setIsSubmittingReassign(true);
    try {
      if (reassigningLeadIds.length === 1) {
        await reassignLeadFunnel(reassigningLeadIds[0], targetFunnelId, targetStageId || undefined);
      } else {
        await reassignMultipleLeadsFunnel(reassigningLeadIds, targetFunnelId, targetStageId || undefined);
      }
      setIsReassignModalOpen(false);
      setSelectedLeadIds([]);
      setReassigningLeadIds([]);
    } catch (err) {
      console.error('Erro ao realocar funil:', err);
      alert('Ocorreu um erro ao realocar o lead para o novo funil.');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Deseja realmente arquivar os ${selectedLeadIds.length} leads selecionados? Eles serão desanexados dos funis ativos.`)) {
      for (const id of selectedLeadIds) {
        await archiveLead(id);
      }
      setSelectedLeadIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Deseja realmente excluir os ${selectedLeadIds.length} leads selecionados? Essa ação não pode ser desfeita.`)) {
      const idsToDelete = [...selectedLeadIds];
      setSelectedLeadIds([]);
      await deleteMultipleLeads(idsToDelete);
    }
  };

  // Filtragem e Métricas
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisYearStart = new Date(now.getFullYear(), 0, 1).getTime();

    return leads.filter(lead => {
      // 1. Filtro global da unidade (se ativo no topo)
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (lead.venueId !== activeVenueId) return false;
      }

      // 2. Filtro local da unidade
      if (selectedVenueFilter !== 'all' && lead.venueId !== selectedVenueFilter) {
        return false;
      }

      // 3. Checagem de Desindexado e Arquivado
      const isArchived = Boolean(lead.isArchived);
      const isUnindexed = !isArchived && (!lead.funnelId || !funnelsMap.has(lead.funnelId));
      const isWon = lead.stage === 'contract_signed' || (lead.stage as string) === 'deal_closed';
      const isLost = lead.stage === 'lost';

      // 4. Filtro por tipo rápido / status
      if (filterType === 'unindexed' && !isUnindexed) return false;
      if (filterType === 'active' && (isUnindexed || isArchived)) return false;
      if (filterType === 'hot' && lead.temperature !== 'hot') return false;
      if (filterType === 'won' && !isWon) return false;
      if (filterType === 'lost' && !isLost) return false;
      if (filterType === 'archived' && !isArchived) return false;

      // 5. Filtro por Funil
      if (selectedFunnelFilter === 'unindexed') {
        if (!isUnindexed) return false;
      } else if (selectedFunnelFilter === 'archived') {
        if (!isArchived) return false;
      } else if (selectedFunnelFilter !== 'all') {
        if (lead.funnelId !== selectedFunnelFilter) return false;
      }

      // 6. Filtro por Colaborador (SDR ou Closer)
      if (selectedCollabFilter !== 'all') {
        const matchesSdr = lead.sdrId === selectedCollabFilter;
        const matchesCloser = lead.closerId === selectedCollabFilter;
        const matchesAssigned = lead.assignedTo === selectedCollabFilter;
        if (!matchesSdr && !matchesCloser && !matchesAssigned) return false;
      }

      // 7. Filtro por Origem
      if (selectedSourceFilter !== 'all') {
        const leadSrc = lead.sourceId || lead.subSource || lead.sourceName || lead.source || '';
        if (lead.sourceId !== selectedSourceFilter && leadSrc !== selectedSourceFilter) return false;
      }

      // 8. Filtro por Data de Criação
      if (selectedDateRange !== 'all') {
        const leadTime = lead.createdAt ? new Date(lead.createdAt).getTime() : 0;
        if (selectedDateRange === 'today' && leadTime < todayStart) return false;
        if (selectedDateRange === '7days' && leadTime < sevenDaysAgo) return false;
        if (selectedDateRange === '30days' && leadTime < thirtyDaysAgo) return false;
        if (selectedDateRange === 'this_month' && leadTime < thisMonthStart) return false;
        if (selectedDateRange === 'this_year' && leadTime < thisYearStart) return false;
      }

      // 9. Busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const rawDigits = query.replace(/\D/g, '');
        const matchesName = lead.name?.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.includes(rawDigits || query);
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        const matchesCode = lead.code?.toLowerCase().includes(query);
        const matchesSource = (lead.sourceName || lead.subSource || lead.source || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCode && !matchesSource) {
          return false;
        }
      }

      return true;
    });
  }, [
    leads, 
    activeVenueId, 
    selectedVenueFilter, 
    selectedFunnelFilter, 
    selectedCollabFilter, 
    selectedSourceFilter, 
    selectedDateRange, 
    filterType, 
    searchTerm, 
    funnelsMap
  ]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = leads.length;
    let unindexed = 0;
    let activeInFunnel = 0;
    let won = 0;
    let lost = 0;
    let archived = 0;

    leads.forEach(l => {
      const isArchived = Boolean(l.isArchived);
      if (isArchived) {
        archived++;
        return;
      }

      const isUnindexed = !l.funnelId || !funnelsMap.has(l.funnelId);
      if (isUnindexed) {
        unindexed++;
      } else {
        activeInFunnel++;
      }

      if (l.stage === 'contract_signed' || (l.stage as string) === 'deal_closed') {
        won++;
      } else if (l.stage === 'lost') {
        lost++;
      }
    });

    return { total, unindexed, activeInFunnel, won, lost, archived };
  }, [leads, funnelsMap]);

  // Paginação dos itens filtrados
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Seleção em massa
  const isAllPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.includes(l.id));
  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !paginatedLeads.some(l => l.id === id)));
    } else {
      const idsToAdd = paginatedLeads.map(l => l.id).filter(id => !selectedLeadIds.includes(id));
      setSelectedLeadIds(prev => [...prev, ...idsToAdd]);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const formatCreationDate = (isoString?: string): string => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '24px 32px 64px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      boxSizing: 'border-box',
    }}>
      
      {/* ── HEADER PRINCIPAL ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'var(--adm-bg-card, #FFFFFF)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1.5px solid rgba(20, 169, 215, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent, #14A9D7)',
            flexShrink: 0,
          }}>
            <Users size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', margin: 0, letterSpacing: '-0.02em' }}>
              Gestão Geral de Leads
            </h1>
            <p style={{ fontSize: '0.80rem', color: 'var(--adm-text-muted, #64748B)', margin: '3px 0 0 0' }}>
              Visão consolidada da base comercial, controle de indexação, criação e gestão de funis
            </p>
          </div>
        </div>

        {/* Ações Rápidas no Topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {stats.unindexed > 0 && (
            <button
              onClick={() => {
                setFilterType('unindexed');
                setSelectedFunnelFilter('unindexed');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                color: '#F59E0B',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <AlertTriangle size={15} />
              <span>{stats.unindexed} Leads Sem Funil</span>
            </button>
          )}

          {stats.archived > 0 && (
            <button
              onClick={() => {
                setFilterType('archived');
                setSelectedFunnelFilter('archived');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1.5px solid rgba(139, 92, 246, 0.35)',
                color: '#8B5CF6',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Archive size={15} />
              <span>{stats.archived} Arquivados</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CARDS DE ESTATÍSTICAS NO TOPO (6 KPIS) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
      }}>
        {/* Total na Base */}
        <div 
          onClick={() => { setFilterType('all'); setSelectedFunnelFilter('all'); }}
          style={{
            background: filterType === 'all' && selectedFunnelFilter === 'all' ? 'var(--adm-accent-bg, rgba(20, 169, 215, 0.08))' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'all' && selectedFunnelFilter === 'all' ? '1.5px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(20, 169, 215, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent, #14A9D7)',
            flexShrink: 0,
          }}>
            <Users size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total na Base
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', lineHeight: 1.2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Em Funis Ativos */}
        <div 
          onClick={() => { setFilterType('active'); setSelectedFunnelFilter('all'); }}
          style={{
            background: filterType === 'active' ? 'rgba(59, 130, 246, 0.08)' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'active' ? '1.5px solid #3B82F6' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3B82F6',
            flexShrink: 0,
          }}>
            <Target size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Em Funis Ativos
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1.2 }}>
              {stats.activeInFunnel}
            </div>
          </div>
        </div>

        {/* Sem Funil (Desanexados) */}
        <div 
          onClick={() => { setFilterType('unindexed'); setSelectedFunnelFilter('unindexed'); }}
          style={{
            background: filterType === 'unindexed' ? 'rgba(245, 158, 11, 0.08)' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'unindexed' ? '1.5px solid #F59E0B' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B',
            flexShrink: 0,
          }}>
            <AlertTriangle size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sem Funil
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B', lineHeight: 1.2 }}>
              {stats.unindexed}
            </div>
          </div>
        </div>

        {/* Vendas Fechadas (Won) */}
        <div 
          onClick={() => { setFilterType('won'); }}
          style={{
            background: filterType === 'won' ? 'rgba(16, 185, 129, 0.08)' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'won' ? '1.5px solid #10B981' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            flexShrink: 0,
          }}>
            <Trophy size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ganhos (Fechados)
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981', lineHeight: 1.2 }}>
              {stats.won}
            </div>
          </div>
        </div>

        {/* Perdidos */}
        <div 
          onClick={() => { setFilterType('lost'); }}
          style={{
            background: filterType === 'lost' ? 'rgba(239, 68, 68, 0.08)' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'lost' ? '1.5px solid #EF4444' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            flexShrink: 0,
          }}>
            <X size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Perdidos
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EF4444', lineHeight: 1.2 }}>
              {stats.lost}
            </div>
          </div>
        </div>

        {/* Arquivados */}
        <div 
          onClick={() => { setFilterType('archived'); setSelectedFunnelFilter('archived'); }}
          style={{
            background: filterType === 'archived' ? 'rgba(139, 92, 246, 0.08)' : 'var(--adm-bg-card, #FFFFFF)',
            border: filterType === 'archived' ? '1.5px solid #8B5CF6' : '1px solid var(--adm-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8B5CF6',
            flexShrink: 0,
          }}>
            <Archive size={19} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Arquivados
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8B5CF6', lineHeight: 1.2 }}>
              {stats.archived}
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS AVANÇADOS ── */}
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '14px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      }}>
        {/* Linha 1: Busca e Seleção de Casa / Colaborador / Funil / Origem / Data */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          {/* Busca Textual */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted, #94A3B8)' }} />
            <input
              type="text"
              placeholder="Buscar nome, telefone, email, LEAD-XXXX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted, #94A3B8)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Casa de Festas */}
          <div>
            <select
              value={selectedVenueFilter}
              onChange={(e) => setSelectedVenueFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todas as Casas de Festa</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Colaborador */}
          <div>
            <select
              value={selectedCollabFilter}
              onChange={(e) => setSelectedCollabFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todos os Colaboradores</option>
              {collaborators.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* Filtro por Funil */}
          <div>
            <select
              value={selectedFunnelFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFunnelFilter(val);
                if (val === 'unindexed') setFilterType('unindexed');
                else if (val === 'archived') setFilterType('archived');
                else if (filterType === 'unindexed' || filterType === 'archived') setFilterType('all');
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todos os Funis</option>
              <option value="unindexed">⚠️ Desanexados (Sem Funil)</option>
              <option value="archived">📦 Leads Arquivados</option>
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.category || 'Geral'})</option>
              ))}
            </select>
          </div>

          {/* Filtro por Origem */}
          <div>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todas as Origens</option>
              <option value="indicacao">Indicação (App Debutante)</option>
              <option value="whatsapp">WhatsApp Direto</option>
              <option value="instagram">Instagram</option>
              <option value="trafego_pago">Tráfego Pago (Meta/Google)</option>
              <option value="parceria">Parcerias</option>
              {sources && sources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Data de Criação */}
          <div>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value as any)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Data de Criação: Todo Período</option>
              <option value="today">Criados Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="this_month">Este Mês</option>
              <option value="this_year">Este Ano</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Badges de Filtro Rápido e Botão de Limpar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', marginRight: '4px' }}>
              Filtro Rápido:
            </span>
            <button
              onClick={() => { setFilterType('all'); setSelectedFunnelFilter('all'); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'all' ? '1px solid var(--adm-accent, #14A9D7)' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'all' ? 'var(--adm-accent-bg, rgba(20, 169, 215, 0.1))' : 'transparent',
                color: filterType === 'all' ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => { setFilterType('active'); setSelectedFunnelFilter('all'); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'active' ? '1px solid #3B82F6' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'active' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: filterType === 'active' ? '#3B82F6' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Em Funis ({stats.activeInFunnel})
            </button>
            <button
              onClick={() => { setFilterType('unindexed'); setSelectedFunnelFilter('unindexed'); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'unindexed' ? '1px solid #F59E0B' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'unindexed' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                color: filterType === 'unindexed' ? '#F59E0B' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sem Funil ({stats.unindexed})
            </button>
            <button
              onClick={() => setFilterType('hot')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'hot' ? '1px solid #EF4444' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'hot' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: filterType === 'hot' ? '#EF4444' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔥 Quentes
            </button>
            <button
              onClick={() => setFilterType('won')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'won' ? '1px solid #10B981' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'won' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: filterType === 'won' ? '#10B981' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🏆 Ganhos ({stats.won})
            </button>
            <button
              onClick={() => setFilterType('lost')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'lost' ? '1px solid #EF4444' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'lost' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: filterType === 'lost' ? '#EF4444' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Perdidos ({stats.lost})
            </button>
            <button
              onClick={() => { setFilterType('archived'); setSelectedFunnelFilter('archived'); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'archived' ? '1px solid #8B5CF6' : '1px solid var(--adm-border, #CBD5E1)',
                background: filterType === 'archived' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                color: filterType === 'archived' ? '#8B5CF6' : 'var(--adm-text-title, #334155)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📦 Arquivados ({stats.archived})
            </button>
          </div>

          {/* Limpar Todos os Filtros */}
          {(searchTerm || selectedVenueFilter !== 'all' || selectedFunnelFilter !== 'all' || selectedCollabFilter !== 'all' || selectedSourceFilter !== 'all' || selectedDateRange !== 'all' || filterType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedVenueFilter('all');
                setSelectedFunnelFilter('all');
                setSelectedCollabFilter('all');
                setSelectedSourceFilter('all');
                setSelectedDateRange('all');
                setFilterType('all');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-accent, #14A9D7)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
              }}
            >
              <RefreshCw size={13} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* ── BARRA FLUTUANTE DE AÇÕES EM LOTE ── */}
      {selectedLeadIds.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8' }}>
              {selectedLeadIds.length} lead(s) selecionado(s)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => handleOpenReassignModal(selectedLeadIds)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'var(--adm-accent, #14A9D7)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <ArrowRightLeft size={14} />
              <span>Realocar Funil</span>
            </button>

            <button
              onClick={handleBulkArchive}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.25)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#C4B5FD',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <Archive size={14} />
              <span>Arquivar</span>
            </button>

            {canDeleteLeads && (
              <button
                onClick={handleBulkDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
            )}

            <button
              onClick={() => setSelectedLeadIds([])}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#94A3B8',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── TABELA PRINCIPAL DE LEADS ── */}
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{
                background: 'var(--adm-bg-input, #F8FAFC)',
                borderBottom: '1.5px solid var(--adm-border, #E2E8F0)',
                color: 'var(--adm-text-muted, #64748B)',
                fontWeight: 800,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                <th style={{ padding: '14px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px' }}>Lead & Código</th>
                <th style={{ padding: '14px 16px' }}>Telefone</th>
                <th style={{ padding: '14px 16px' }}>Casa de Festas</th>
                <th style={{ padding: '14px 16px' }}>Origem</th>
                <th style={{ padding: '14px 16px' }}>Responsáveis (SDR / Closer)</th>
                <th style={{ padding: '14px 16px' }}>Funil / Etapa</th>
                <th style={{ padding: '14px 16px' }}>Data de Criação</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--adm-text-muted, #64748B)' }}>
                    <Users size={36} style={{ opacity: 0.3, margin: '0 auto 10px auto' }} />
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)' }}>
                      Nenhum lead encontrado com os filtros selecionados
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                      Tente alterar os termos de busca ou filtros de funil/unidade.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isArchived = Boolean(lead.isArchived);
                  const isUnindexed = !isArchived && (!lead.funnelId || !funnelsMap.has(lead.funnelId));
                  const funnel = lead.funnelId ? funnelsMap.get(lead.funnelId) : null;
                  const venueName = lead.venueName || (lead.venueId ? venuesMap.get(lead.venueId) : null) || 'Sem Casa Atribuída';
                  
                  const isWon = lead.stage === 'contract_signed' || (lead.stage as string) === 'deal_closed';
                  const isLost = lead.stage === 'lost';

                  const sdrCollab = lead.sdrId ? collabsMap.get(lead.sdrId) : null;
                  const closerCollab = lead.closerId ? collabsMap.get(lead.closerId) : null;

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border, #E2E8F0)',
                        background: isSelected 
                          ? 'var(--adm-accent-bg, rgba(20, 169, 215, 0.08))' 
                          : isArchived
                          ? 'rgba(139, 92, 246, 0.03)'
                          : isUnindexed 
                          ? 'rgba(245, 158, 11, 0.03)' 
                          : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-input, #F8FAFC)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isArchived 
                            ? 'rgba(139, 92, 246, 0.03)' 
                            : isUnindexed 
                            ? 'rgba(245, 158, 11, 0.03)' 
                            : 'transparent';
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Lead & Código */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SafeAvatar
                            src={lead.avatarUrl}
                            name={lead.name}
                            size={34}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                onClick={() => onOpenLead(lead.id)}
                                style={{ 
                                  fontWeight: 800, 
                                  color: 'var(--adm-text-title, #0F172A)', 
                                  cursor: 'pointer',
                                  fontSize: '0.84rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-accent, #14A9D7)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-title, #0F172A)'}
                              >
                                {lead.name}
                              </span>
                              {lead.temperature === 'hot' && <Flame size={14} color="#EF4444" />}
                              {isWon && <Trophy size={14} color="#10B981" />}
                            </div>
                            <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #64748B)', fontFamily: 'monospace' }}>
                              {lead.code || `LEAD-${lead.id.substring(0, 6)}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td style={{ padding: '14px 16px', color: 'var(--adm-text-title, #334155)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: 'var(--adm-text-muted, #94A3B8)' }} />
                          <span>{formatPhone(lead.phone) || 'Sem telefone'}</span>
                        </div>
                      </td>

                      {/* Casa de Festas */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} style={{ color: 'var(--adm-text-muted, #94A3B8)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--adm-text-body, #334155)' }}>
                            {venueName}
                          </span>
                        </div>
                      </td>

                      {/* Origem */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(20, 169, 215, 0.08)',
                            color: 'var(--adm-accent, #14A9D7)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            width: 'fit-content',
                          }}>
                            {lead.sourceName || (lead.source === 'indicacao' ? 'Indicação' : lead.source || 'Direto')}
                          </span>
                          {lead.subSource && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #64748B)' }}>
                              Sub: {lead.subSource}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Responsáveis */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', width: '38px' }}>SDR:</span>
                            <span style={{ color: sdrCollab ? 'var(--adm-text-title, #0F172A)' : 'var(--adm-text-muted, #94A3B8)', fontWeight: sdrCollab ? 700 : 500 }}>
                              {lead.sdrName || sdrCollab?.name || lead.assignedTo || 'Não atribuído'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', width: '38px' }}>Closer:</span>
                            <span style={{ color: closerCollab ? 'var(--adm-text-title, #0F172A)' : 'var(--adm-text-muted, #94A3B8)', fontWeight: closerCollab ? 700 : 500 }}>
                              {lead.closerName || closerCollab?.name || 'Não atribuído'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Funil / Etapa */}
                      <td style={{ padding: '14px 16px' }}>
                        {isArchived ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            background: 'rgba(139, 92, 246, 0.12)',
                            color: '#8B5CF6',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}>
                            <Archive size={12} />
                            <span>Arquivado</span>
                          </span>
                        ) : isUnindexed ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#F59E0B',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}>
                            <AlertTriangle size={12} />
                            <span>Sem Funil</span>
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span 
                              onClick={() => {
                                if (lead.funnelId && onNavigateFunnel) {
                                  onNavigateFunnel(lead.funnelId);
                                }
                              }}
                              style={{ 
                                fontWeight: 700, 
                                color: 'var(--adm-text-title, #0F172A)',
                                cursor: onNavigateFunnel ? 'pointer' : 'default',
                              }}
                              onMouseEnter={(e) => { if (onNavigateFunnel) e.currentTarget.style.color = 'var(--adm-accent, #14A9D7)'; }}
                              onMouseLeave={(e) => { if (onNavigateFunnel) e.currentTarget.style.color = 'var(--adm-text-title, #0F172A)'; }}
                            >
                              {funnel?.name || 'Funil Comercial'}
                            </span>
                            <span style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #64748B)' }}>
                              Etapa: {getLeadStageLabel(lead.stage, funnels, lead.funnelId)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Data de Criação */}
                      <td style={{ padding: '14px 16px', color: 'var(--adm-text-muted, #64748B)', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} />
                          <span>{formatCreationDate(lead.createdAt)}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Abrir Ficha */}
                          <button
                            onClick={() => onOpenLead(lead.id)}
                            title="Abrir detalhes do lead"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              background: 'var(--adm-bg-input, #F8FAFC)',
                              border: '1px solid var(--adm-border, #CBD5E1)',
                              color: 'var(--adm-text-title, #334155)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Abrir</span>
                          </button>

                          {/* Realocar */}
                          <button
                            onClick={() => handleOpenReassignModal([lead.id])}
                            title="Realocar para outro funil"
                            style={{
                              padding: '5px 7px',
                              borderRadius: '6px',
                              background: 'rgba(20, 169, 215, 0.08)',
                              border: '1px solid rgba(20, 169, 215, 0.3)',
                              color: 'var(--adm-accent, #14A9D7)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowRightLeft size={13} />
                          </button>

                          {/* Arquivar / Desarquivar */}
                          <button
                            onClick={async () => {
                              if (isArchived) {
                                if (confirm(`Deseja desarquivar o lead "${lead.name}"?`)) {
                                  await unarchiveLead(lead.id);
                                }
                              } else {
                                if (confirm(`Deseja arquivar o lead "${lead.name}"?`)) {
                                  await archiveLead(lead.id);
                                }
                              }
                            }}
                            title={isArchived ? "Desarquivar Lead" : "Arquivar Lead"}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '6px',
                              background: isArchived ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.08)',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              color: '#8B5CF6',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Archive size={13} />
                          </button>

                          {/* Excluir (Master / Admin apenas e se não fechado/perdido) */}
                          {canDeleteLeads && !isWon && !isLost && (
                            <button
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir o lead "${lead.name}"? Todas as tarefas e dados serão removidos.`)) {
                                  deleteLead(lead.id);
                                }
                              }}
                              title="Excluir este lead permanentemente"
                              style={{
                                padding: '5px 7px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#EF4444',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINAÇÃO E RODAPÉ DA TABELA ── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--adm-border, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--adm-bg-input, #F8FAFC)',
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted, #64748B)' }}>
            Mostrando <strong>{filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> a <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> de <strong>{filteredLeads.length}</strong> leads filtrados
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--adm-text-muted, #64748B)' }}>
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-card, #FFFFFF)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: currentPage === 1 ? 'transparent' : 'var(--adm-bg-card, #FFFFFF)',
                  color: currentPage === 1 ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Anterior
              </button>

              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: currentPage >= totalPages ? 'transparent' : 'var(--adm-bg-card, #FFFFFF)',
                  color: currentPage >= totalPages ? 'var(--adm-text-muted, #94A3B8)' : 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL DE REALOCAÇÃO DE FUNIL ── */}
      {isReassignModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingReassign) setIsReassignModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--adm-bg-card, #FFFFFF)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--adm-accent-bg, rgba(20, 169, 215, 0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent, #14A9D7)',
                }}>
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Realocar {reassigningLeadIds.length} Lead(s) para Funil
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--adm-text-muted, #64748B)' }}>
                    Selecione o funil de destino e a etapa de entrada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                disabled={isSubmittingReassign}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted, #64748B)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
                  Funil de Destino:
                </label>
                <select
                  value={targetFunnelId}
                  onChange={(e) => {
                    setTargetFunnelId(e.target.value);
                    const f = funnels.find(x => x.id === e.target.value);
                    if (f && f.stages && f.stages.length > 0) {
                      setTargetStageId(f.stages[0].id);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-input, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  {funnels.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.category || 'Geral'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
                  Etapa de Entrada no Funil:
                </label>
                <select
                  value={targetStageId}
                  onChange={(e) => setTargetStageId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-input, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  {(targetFunnel?.stages && targetFunnel.stages.length > 0) ? (
                    targetFunnel.stages.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="new_lead">Novo Lead</option>
                      <option value="in_analysis">Em Análise</option>
                      <option value="meeting_scheduled">Reunião Agendada</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                disabled={isSubmittingReassign}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  color: 'var(--adm-text-title, #334155)',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                disabled={isSubmittingReassign}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'var(--adm-accent, #14A9D7)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: isSubmittingReassign ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSubmittingReassign ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Confirmar Realocação</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
