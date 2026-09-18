import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Target, 
  AlertTriangle, 
  Search, 
  Building2, 
  ArrowRightLeft, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Phone, 
  Mail, 
  CheckSquare, 
  Trophy,
  Flame,
  RefreshCw
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { createMonogramAvatar } from '../../utils/avatarUtils';
import { formatPhone } from '../../utils/phoneFormatter';
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
    leads, 
    funnels, 
    venues, 
    collaborators, 
    activeVenueId,
    reassignLeadFunnel,
    reassignMultipleLeadsFunnel,
  } = useAdminState();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');
  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'unindexed' | 'active' | 'hot'>('all');
  
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
  const pageSize = 25;

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
    const map = new Map<string, { name: string; avatarUrl?: string }>();
    collaborators.forEach(c => map.set(c.id, { name: c.name, avatarUrl: c.avatarUrl }));
    return map;
  }, [collaborators]);

  // Funil alvo selecionado no modal
  const targetFunnel = useMemo(() => {
    return funnels.find(f => f.id === targetFunnelId) || funnels[0] || null;
  }, [funnels, targetFunnelId]);

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

  // Filtragem e Métricas
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Filtro global da unidade (se ativo no topo)
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (lead.venueId !== activeVenueId) return false;
      }

      // 2. Filtro local da unidade
      if (selectedVenueFilter !== 'all' && lead.venueId !== selectedVenueFilter) {
        return false;
      }

      // 3. Checagem de Desindexado
      const isUnindexed = !lead.funnelId || !funnelsMap.has(lead.funnelId);

      // 4. Filtro por tipo rápido
      if (filterType === 'unindexed' && !isUnindexed) return false;
      if (filterType === 'active' && isUnindexed) return false;
      if (filterType === 'hot' && lead.temperature !== 'hot') return false;

      // 5. Filtro por Funil
      if (selectedFunnelFilter === 'unindexed') {
        if (!isUnindexed) return false;
      } else if (selectedFunnelFilter !== 'all') {
        if (lead.funnelId !== selectedFunnelFilter) return false;
      }

      // 6. Busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.includes(query);
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        const matchesCode = lead.code?.toLowerCase().includes(query);
        const matchesSource = (lead.sourceName || lead.source || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCode && !matchesSource) {
          return false;
        }
      }

      return true;
    });
  }, [leads, activeVenueId, selectedVenueFilter, selectedFunnelFilter, filterType, searchTerm, funnelsMap]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = leads.length;
    let unindexed = 0;
    let activeInFunnel = 0;
    let won = 0;

    leads.forEach(l => {
      const isUnindexed = !l.funnelId || !funnelsMap.has(l.funnelId);
      if (isUnindexed) {
        unindexed++;
      } else {
        activeInFunnel++;
      }
      if (l.stage === 'contract_signed' || (l.stage as string) === 'deal_closed') {
        won++;
      }
    });

    return { total, unindexed, activeInFunnel, won };
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ── HEADER PRINCIPAL ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(20, 169, 215, 0.12)',
              border: '1px solid rgba(20, 169, 215, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Users size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Gestão Geral de Leads
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Visão consolidada da base comercial, controle de indexação e realocação de funis
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Destaque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                color: '#F59E0B',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                animation: 'pulse 2s infinite ease-in-out',
              }}
            >
              <AlertTriangle size={15} />
              <span>{stats.unindexed} Leads Desindexados</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CARDS DE ESTATÍSTICAS NO TOPO ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        <div className="saas-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
              Total na Base
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--adm-text-title)', lineHeight: 1.2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        <div className="saas-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
          }}>
            <Target size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
              Indexados em Funil
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', lineHeight: 1.2 }}>
              {stats.activeInFunnel}
            </div>
          </div>
        </div>

        <div className="saas-card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          border: stats.unindexed > 0 ? '1.5px solid rgba(245, 158, 11, 0.4)' : undefined,
          background: stats.unindexed > 0 ? 'rgba(245, 158, 11, 0.05)' : undefined,
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: stats.unindexed > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.12)',
            border: `1px solid ${stats.unindexed > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(100, 116, 139, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: stats.unindexed > 0 ? '#F59E0B' : 'var(--adm-text-muted)',
          }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stats.unindexed > 0 ? '#F59E0B' : 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
              Desindexados / Sem Funil
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.unindexed > 0 ? '#F59E0B' : 'var(--adm-text-title)', lineHeight: 1.2 }}>
              {stats.unindexed}
            </div>
          </div>
        </div>

        <div className="saas-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4AF37',
          }}>
            <Trophy size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
              Contratos Fechados
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D4AF37', lineHeight: 1.2 }}>
              {stats.won}
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS & PESQUISA ── */}
      <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Busca Textual */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '480px' }}>
            <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, e-mail ou código..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                fontSize: '0.82rem',
                outline: 'none',
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
                  background: 'none',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setFilterType('all'); setCurrentPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: filterType === 'all' ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                background: filterType === 'all' ? 'rgba(20, 169, 215, 0.15)' : 'var(--adm-bg-input)',
                color: filterType === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                cursor: 'pointer',
              }}
            >
              Todos ({stats.total})
            </button>

            <button
              onClick={() => { setFilterType('unindexed'); setSelectedFunnelFilter('unindexed'); setCurrentPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: filterType === 'unindexed' ? '1.5px solid #F59E0B' : '1px solid var(--adm-border)',
                background: filterType === 'unindexed' ? 'rgba(245, 158, 11, 0.2)' : 'var(--adm-bg-input)',
                color: filterType === 'unindexed' ? '#F59E0B' : 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <AlertTriangle size={12} />
              <span>Sem Funil ({stats.unindexed})</span>
            </button>

            <button
              onClick={() => { setFilterType('active'); if (selectedFunnelFilter === 'unindexed') setSelectedFunnelFilter('all'); setCurrentPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: filterType === 'active' ? '1px solid #10B981' : '1px solid var(--adm-border)',
                background: filterType === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                color: filterType === 'active' ? '#10B981' : 'var(--adm-text-muted)',
                cursor: 'pointer',
              }}
            >
              Com Funil ({stats.activeInFunnel})
            </button>

            <button
              onClick={() => { setFilterType('hot'); setCurrentPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: filterType === 'hot' ? '1px solid #EF4444' : '1px solid var(--adm-border)',
                background: filterType === 'hot' ? 'rgba(239, 68, 68, 0.15)' : 'var(--adm-bg-input)',
                color: filterType === 'hot' ? '#EF4444' : 'var(--adm-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Flame size={12} />
              <span>Quentes</span>
            </button>
          </div>

          {/* Selects de Casa de Festas e Funil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedVenueFilter}
              onChange={e => { setSelectedVenueFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todas as Casas</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            <select
              value={selectedFunnelFilter}
              onChange={e => { setSelectedFunnelFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todos os Funis</option>
              <option value="unindexed">⚠️ Apenas Desindexados (Sem Funil)</option>
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* ── BARRA DE AÇÃO EM LOTE ── */}
        {selectedLeadIds.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: '10px',
            background: 'rgba(20, 169, 215, 0.12)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            marginTop: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckSquare size={16} color="var(--adm-accent)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
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
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'var(--adm-accent)',
                  border: 'none',
                  color: '#000',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <ArrowRightLeft size={13} />
                <span>Realocar para Funil</span>
              </button>

              <button
                onClick={() => setSelectedLeadIds([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                Limpar seleção
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TABELA DE LEADS ── */}
      <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{
                background: 'var(--adm-bg-elevated)',
                borderBottom: '1px solid var(--adm-border)',
                color: 'var(--adm-text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: 'pointer', accentColor: 'var(--adm-accent)' }}
                  />
                </th>
                <th style={{ padding: '12px 16px' }}>Lead</th>
                <th style={{ padding: '12px 16px' }}>Origem</th>
                <th style={{ padding: '12px 16px' }}>Responsáveis</th>
                <th style={{ padding: '12px 16px' }}>Casa de Festas</th>
                <th style={{ padding: '12px 16px' }}>Funil Comercial</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--adm-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} opacity={0.3} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nenhum lead encontrado com os filtros selecionados</span>
                      <span style={{ fontSize: '0.75rem' }}>Tente ajustar a busca ou limpar os filtros</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const isUnindexed = !lead.funnelId || !funnelsMap.has(lead.funnelId);
                  const linkedFunnel = lead.funnelId ? funnelsMap.get(lead.funnelId) : null;
                  const currentStage = linkedFunnel?.stages?.find(s => s.id === lead.stage);
                  const venueName = lead.venueName || venuesMap.get(lead.venueId) || 'Não informada';
                  const sdrCollab = lead.sdrId ? collabsMap.get(lead.sdrId) : null;
                  const closerCollab = lead.closerId ? collabsMap.get(lead.closerId) : null;

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        background: isSelected 
                          ? 'rgba(20, 169, 215, 0.06)' 
                          : isUnindexed 
                            ? 'rgba(245, 158, 11, 0.03)' 
                            : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead.id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--adm-accent)' }}
                        />
                      </td>

                      {/* Lead Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={createMonogramAvatar(lead.name || 'Lead')}
                            alt={lead.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                onClick={() => onOpenLead(lead.id)}
                                style={{ 
                                  fontWeight: 800, 
                                  color: 'var(--adm-text-title)', 
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  textDecorationColor: 'transparent',
                                  transition: 'text-decoration-color 0.15s ease',
                                }}
                                onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--adm-accent)'}
                                onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}
                              >
                                {lead.name}
                              </span>
                              {lead.code && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  background: 'var(--adm-bg-elevated)',
                                  color: 'var(--adm-text-muted)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--adm-border)',
                                }}>
                                  {lead.code}
                                </span>
                              )}
                              {lead.temperature === 'hot' && (
                                <span title="Lead Quente" style={{ color: '#EF4444' }}>🔥</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                              {lead.phone && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={10} />
                                  {formatPhone(lead.phone)}
                                </span>
                              )}
                              {lead.email && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Mail size={10} />
                                  {lead.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origem */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          {lead.sourceName || lead.source || 'Direto / Indefinido'}
                        </span>
                        {lead.subSource && (
                          <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                            {lead.subSource}
                          </div>
                        )}
                      </td>

                      {/* Responsáveis */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#8B5CF6' }}>SDR:</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                              {lead.sdrName || sdrCollab?.name || 'Não atribuído'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#F97316' }}>Closer:</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                              {lead.closerName || closerCollab?.name || 'Não atribuído'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Casa de Festas */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} color="var(--adm-text-muted)" />
                          <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                            {venueName}
                          </span>
                        </div>
                      </td>

                      {/* Funil Comercial */}
                      <td style={{ padding: '14px 16px' }}>
                        {isUnindexed ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1.5px solid rgba(245, 158, 11, 0.45)',
                              color: '#F59E0B',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}>
                              <AlertTriangle size={12} />
                              Sem Funil Atrelado
                            </span>
                            <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                              Clique em realocar para vincular
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                onClick={() => onNavigateFunnel && lead.funnelId && onNavigateFunnel(lead.funnelId)}
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  color: 'var(--adm-accent)',
                                  cursor: onNavigateFunnel ? 'pointer' : 'default',
                                }}
                              >
                                {linkedFunnel?.name || 'Funil Comercial'}
                              </span>
                            </div>
                            {currentStage && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: currentStage.color || '#10B981',
                                }} />
                                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                                  {currentStage.name}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenReassignModal([lead.id])}
                            title="Realocar para um Funil"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: isUnindexed ? 'rgba(245, 158, 11, 0.15)' : 'var(--adm-bg-elevated)',
                              border: isUnindexed ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--adm-border)',
                              color: isUnindexed ? '#F59E0B' : 'var(--adm-text-title)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <ArrowRightLeft size={12} />
                            <span>Realocar</span>
                          </button>

                          <button
                            onClick={() => onOpenLead(lead.id)}
                            title="Ver detalhes do lead"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: 'var(--adm-bg-elevated)',
                              border: '1px solid var(--adm-border)',
                              color: 'var(--adm-text-title)',
                              cursor: 'pointer',
                            }}
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINAÇÃO ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderTop: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-elevated)',
          fontSize: '0.76rem',
          color: 'var(--adm-text-muted)',
        }}>
          <div>
            Mostrando {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a {Math.min(currentPage * pageSize, filteredLeads.length)} de {filteredLeads.length} leads
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                color: currentPage === 1 ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem',
              }}
            >
              Anterior
            </button>
            <span style={{ fontWeight: 700, color: 'var(--adm-text-title)', padding: '0 6px' }}>
              {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                color: currentPage === totalPages ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem',
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DE REALOCAÇÃO DE FUNIL ── */}
      {isReassignModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div className="saas-card" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(20, 169, 215, 0.15)',
                  color: 'var(--adm-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                    Realocar Leads para Funil
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                    Vincule os leads selecionados a um funil comercial ativo
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumo dos leads selecionados */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--adm-bg-elevated)',
              border: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                Total de leads a realocar:
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--adm-accent)' }}>
                {reassigningLeadIds.length} lead(s)
              </span>
            </div>

            {/* Seleção do Funil */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                Selecione o Funil de Destino:
              </label>
              <select
                value={targetFunnelId}
                onChange={e => {
                  const newFunnelId = e.target.value;
                  setTargetFunnelId(newFunnelId);
                  const f = funnels.find(item => item.id === newFunnelId);
                  setTargetStageId(f?.stages?.[0]?.id || 'new_lead');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.stages?.length || 0} etapas)</option>
                ))}
              </select>
            </div>

            {/* Seleção da Etapa */}
            {targetFunnel && targetFunnel.stages && targetFunnel.stages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                  Etapa Inicial no Funil:
                </label>
                <select
                  value={targetStageId}
                  onChange={e => setTargetStageId(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                >
                  {targetFunnel.stages.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Rodapé e Ações */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                disabled={isSubmittingReassign}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmReassign}
                disabled={isSubmittingReassign || !targetFunnelId}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'var(--adm-accent)',
                  border: 'none',
                  color: '#000',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: isSubmittingReassign ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSubmittingReassign ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirmar Realocação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
