import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Target, 
  Search, 
  Building2, 
  Calendar,
  CheckCircle2,
  XCircle,
  Inbox,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { SafeAvatar } from './SafeAvatar';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import type { Client, CommercialFunnel } from '../../types/admin';

interface AdminClientsListViewProps {
  onOpenLead: (clientIdOrLeadId: string) => void;
  onNavigateFunnel?: (funnelId: string) => void;
}

export const AdminClientsListView: React.FC<AdminClientsListViewProps> = ({
  onOpenLead,
  onNavigateFunnel,
}) => {
  const { 
    clients, 
    leads, 
    funnels, 
    venues, 
    collaborators, 
    activeVenueId,
  } = useAdminState();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>(activeVenueId || 'all');
  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>('all');
  const [selectedCollabFilter, setSelectedCollabFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'lost' | 'inbox'>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Funis de Pós-Venda
  const postSaleFunnels = useMemo(() => {
    return (funnels || []).filter(f => 
      f.isPostSale || 
      f.category === 'Pós-Venda' || 
      f.category === 'pos_venda' ||
      f.name?.toLowerCase().includes('pós-venda') || 
      f.name?.toLowerCase().includes('pos venda') ||
      f.name?.toLowerCase().includes('sucesso')
    );
  }, [funnels]);

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

  // Unificação de Clientes (tabela clients + leads do pós-venda/caixa de entrada)
  const allPostSaleClients = useMemo(() => {
    const existingClientIds = new Set(clients.map(c => c.id));
    const extraClientsFromLeads: Client[] = (leads || [])
      .filter(l => (l.isClient || l.group === 'Pós-Venda' || postSaleFunnels.some(f => f.id === l.funnelId)) && !existingClientIds.has(l.id))
      .map(l => ({
        id: l.id,
        code: l.code ? (l.code.startsWith('LEAD-') ? `CLI-${l.code.replace('LEAD-', '')}` : l.code) : `CLI-${l.id.slice(0, 5).toUpperCase()}`,
        name: l.name,
        payerName: (l as any).payerName || l.name,
        payerPhone: l.phone,
        stage: (l.stage || 'onboarding') as any,
        venueId: l.venueId,
        venueName: l.venueName,
        dealValue: l.dealValue || 0,
        funnelId: l.funnelId,
        assignedSuccessManagerId: l.sdrId || l.closerId,
        assignedSuccessManagerName: l.assignedTo || l.sdrName || l.closerName,
        tags: l.tags || [],
        partyDate: l.partyDate || (l as any).eventDate,
        createdAt: l.createdAt || new Date().toISOString(),
        updatedAt: l.updatedAt || new Date().toISOString(),
      } as Client));

    return [...clients, ...extraClientsFromLeads];
  }, [clients, leads, postSaleFunnels]);

  // Filtragem completa
  const filteredClients = useMemo(() => {
    return allPostSaleClients.filter(client => {
      // 1. Filtro de Casa / Unidade
      if (selectedVenueFilter !== 'all' && client.venueId !== selectedVenueFilter) {
        return false;
      }

      // 2. Filtro de Funil de Pós-Venda
      if (selectedFunnelFilter !== 'all') {
        const clientFunnelId = (client as any).funnelId;
        if (clientFunnelId && clientFunnelId !== selectedFunnelFilter) return false;
      }

      // 3. Filtro de Responsável Pós-Venda
      if (selectedCollabFilter !== 'all') {
        const collabId = client.assignedSuccessManagerId || (client as any).assignedToId;
        if (collabId !== selectedCollabFilter) return false;
      }

      // 4. Filtro por Status
      const stageStr = (client.stage as string || '').toLowerCase();
      if (statusFilter === 'inbox') {
        if (stageStr !== 'new_lead' && stageStr !== 'entry' && !stageStr.includes('entrada')) return false;
      } else if (statusFilter === 'completed') {
        if (stageStr !== 'completed' && stageStr !== 'finalizado' && stageStr !== 'won') return false;
      } else if (statusFilter === 'lost') {
        if (stageStr !== 'lost' && stageStr !== 'cancelado') return false;
      } else if (statusFilter === 'in_progress') {
        if (stageStr === 'completed' || stageStr === 'lost' || stageStr === 'new_lead' || stageStr === 'entry') return false;
      }

      // 5. Busca Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = client.name?.toLowerCase().includes(term);
        const matchesCode = client.code?.toLowerCase().includes(term);
        const matchesPhone = client.payerPhone?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchesPayer = client.payerName?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesPayer) return false;
      }

      return true;
    });
  }, [allPostSaleClients, selectedVenueFilter, selectedFunnelFilter, selectedCollabFilter, statusFilter, searchTerm]);

  // Paginação
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredClients.slice(startIndex, startIndex + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Contadores para os botões de status
  const counts = useMemo(() => {
    let inbox = 0;
    let inProgress = 0;
    let completed = 0;
    let lost = 0;

    allPostSaleClients.forEach(c => {
      const s = (c.stage as string || '').toLowerCase();
      if (s === 'new_lead' || s === 'entry' || s.includes('entrada')) inbox++;
      else if (s === 'completed' || s === 'finalizado' || s === 'won') completed++;
      else if (s === 'lost' || s === 'cancelado') lost++;
      else inProgress++;
    });

    return { total: allPostSaleClients.length, inbox, inProgress, completed, lost };
  }, [allPostSaleClients]);

  // Helper para obter nome legível da etapa
  const getClientStageBadge = (client: Client) => {
    const rawStage = client.stage as string;
    const clientFunnelId = (client as any).funnelId;
    const matchedFunnel = clientFunnelId ? funnelsMap.get(clientFunnelId) : postSaleFunnels[0];
    const customNames = matchedFunnel?.postSaleCustomStageNames;

    if (rawStage === 'new_lead' || rawStage === 'entry' || rawStage.toLowerCase().includes('entrada')) {
      return {
        label: (customNames?.entry || 'Caixa de Entrada').toUpperCase(),
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    }
    if (rawStage === 'completed' || rawStage === 'finalizado' || rawStage === 'won') {
      return {
        label: (customNames?.won || 'Festa Realizada').toUpperCase(),
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    }
    if (rawStage === 'lost' || rawStage === 'cancelado') {
      return {
        label: (customNames?.lost || 'Cancelado').toUpperCase(),
        color: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
      };
    }

    const stageMatch = matchedFunnel?.stages?.find(s => s.id === rawStage);
    if (stageMatch) {
      return {
        label: stageMatch.name.toUpperCase(),
        color: stageMatch.color || '#3B82F6',
        bg: `${stageMatch.color || '#3B82F6'}18`,
        border: `${stageMatch.color || '#3B82F6'}44`,
      };
    }

    if (rawStage === 'onboarding') {
      return {
        label: 'ONBOARDING & BOAS-VINDAS',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.3)',
      };
    }

    return {
      label: rawStage.toUpperCase(),
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
    };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '20px 24px',
      gap: '16px',
      boxSizing: 'border-box',
      background: 'var(--adm-bg-main)',
      overflowY: 'auto',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── Top Header: Título, Ícone e Métricas Rápidas ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--adm-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22) 0%, rgba(6, 182, 212, 0.05) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06B6D4',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.15)',
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>Clientes do Pós-Venda</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06B6D4',
                border: '1px solid rgba(6, 182, 212, 0.35)',
              }}>
                {totalItems} de {allPostSaleClients.length}
              </span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
              Gestão centralizada de clientes ativos, festas em planejamento e pós-venda dedicado.
            </p>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: statusFilter === 'all' ? '1px solid #06B6D4' : '1px solid var(--adm-border)',
              background: statusFilter === 'all' ? 'rgba(6, 182, 212, 0.18)' : 'var(--adm-bg-card)',
              color: statusFilter === 'all' ? '#06B6D4' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Todos ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inbox')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: statusFilter === 'inbox' ? '1px solid #EF4444' : '1px solid var(--adm-border)',
              background: statusFilter === 'inbox' ? 'rgba(239, 68, 68, 0.18)' : 'var(--adm-bg-card)',
              color: statusFilter === 'inbox' ? '#EF4444' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Inbox size={12} />
            <span>Caixa de Entrada ({counts.inbox})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: statusFilter === 'in_progress' ? '1px solid #3B82F6' : '1px solid var(--adm-border)',
              background: statusFilter === 'in_progress' ? 'rgba(59, 130, 246, 0.18)' : 'var(--adm-bg-card)',
              color: statusFilter === 'in_progress' ? '#3B82F6' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Em Planejamento ({counts.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: statusFilter === 'completed' ? '1px solid #10B981' : '1px solid var(--adm-border)',
              background: statusFilter === 'completed' ? 'rgba(16, 185, 129, 0.18)' : 'var(--adm-bg-card)',
              color: statusFilter === 'completed' ? '#10B981' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckCircle2 size={12} />
            <span>Realizadas ({counts.completed})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('lost')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: statusFilter === 'lost' ? '1px solid #94A3B8' : '1px solid var(--adm-border)',
              background: statusFilter === 'lost' ? 'rgba(148, 163, 184, 0.18)' : 'var(--adm-bg-card)',
              color: statusFilter === 'lost' ? '#CBD5E1' : 'var(--adm-text-muted)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <XCircle size={12} />
            <span>Cancelados ({counts.lost})</span>
          </button>
        </div>
      </div>

      {/* ── Filters Bar: Busca e Seletores de Unidade, Funil e Responsável ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        {/* Campo de Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, código CLI, telefone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Seletor de Casa / Unidade */}
        <select
          value={selectedVenueFilter}
          onChange={(e) => {
            setSelectedVenueFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-card)',
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

        {/* Seletor de Funil de Pós-Venda */}
        {postSaleFunnels.length > 0 && (
          <select
            value={selectedFunnelFilter}
            onChange={(e) => {
              setSelectedFunnelFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Todos os Funis de Pós-Venda</option>
            {postSaleFunnels.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        {/* Seletor de Responsável */}
        <select
          value={selectedCollabFilter}
          onChange={(e) => {
            setSelectedCollabFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-card)',
            color: 'var(--adm-text-title)',
            fontSize: '0.78rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">Todos os Responsáveis</option>
          {collaborators.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Table Container ── */}
      <div className="saas-card" style={{
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid var(--adm-border)',
        background: 'var(--adm-bg-card)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'var(--adm-bg-input)', borderBottom: '1px solid var(--adm-border)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Cliente / Código</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Telefone</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Casa de Festa</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Pós-Venda</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Etapa no Funil</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem' }}>Data da Festa</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontSize: '0.62rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    <Users size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Nenhum cliente encontrado</div>
                    <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Ajuste os filtros de busca para encontrar registros.</div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map(client => {
                  const stageBadge = getClientStageBadge(client);
                  const venueName = client.venueName || (client.venueId ? venuesMap.get(client.venueId) : 'Todas as Casas');
                  const collab = client.assignedSuccessManagerId ? collabsMap.get(client.assignedSuccessManagerId) : null;
                  const collabName = client.assignedSuccessManagerName || collab?.name || 'Não atribuído';

                  // Verificação de mensagens não lidas no WhatsApp
                  const clientPhoneNorm = (client.payerPhone || (client as any).phone || '').replace(/\D/g, '');
                  const matchingLead = leads.find(l => l.id === client.id || (clientPhoneNorm && (l.phone || '').replace(/\D/g, '') === clientPhoneNorm));
                  const unread = Number((client as any).unreadMessagesCount ?? (client as any).unreadCount ?? (matchingLead as any)?.unreadMessagesCount ?? matchingLead?.unreadCount ?? 0);
                  const hasUnread = unread > 0;

                  return (
                    <tr
                      key={client.id}
                      style={{
                        borderBottom: '1px solid var(--adm-border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Cliente / Código */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SafeAvatar name={client.name} size={30} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                              {client.name}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: '#06B6D4', fontWeight: 700 }}>
                              {client.code || `CLI-${client.id.slice(0, 5).toUpperCase()}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--adm-text-body)', fontWeight: 600 }}>
                            {formatPhone(client.payerPhone)}
                          </span>
                          {hasUnread && (
                            <span 
                              title={`${unread} mensagem(ns) pendente(s)`}
                              style={{
                                background: '#EF4444',
                                color: '#FFFFFF',
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '9999px',
                              }}
                            >
                              {unread}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Casa de Festa */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}>
                          <Building2 size={10} />
                          <span>{venueName}</span>
                        </span>
                      </td>

                      {/* Pós-Venda (Responsável) */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {collab ? (
                            <SafeAvatar name={collabName} src={collab.avatarUrl} size={22} />
                          ) : (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'var(--adm-text-muted)' }}>
                              ?
                            </div>
                          )}
                          <span style={{ color: 'var(--adm-text-title)', fontWeight: 600 }}>{collabName}</span>
                        </div>
                      </td>

                      {/* Etapa no Funil */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: stageBadge.bg,
                          color: stageBadge.color,
                          border: `1px solid ${stageBadge.border}`,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}>
                          {stageBadge.label}
                        </span>
                      </td>

                      {/* Data da Festa */}
                      <td style={{ padding: '10px 14px' }}>
                        {client.partyDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                            <Calendar size={11} color="#06B6D4" />
                            <span>{new Date(client.partyDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.70rem' }}>
                            A definir
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Abrir WhatsApp */}
                          <button
                            type="button"
                            onClick={() => onOpenLead(client.id)}
                            title="Abrir no WhatsApp"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: hasUnread ? 'rgba(37, 211, 102, 0.18)' : 'var(--adm-bg-input)',
                              border: hasUnread ? '1px solid #25D366' : '1px solid var(--adm-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: hasUnread ? '#25D366' : 'var(--adm-text-muted)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <WhatsAppBrandIcon size={14} color={hasUnread ? '#25D366' : 'currentColor'} />
                          </button>

                          {/* Visualizar no Funil de Pós-Venda */}
                          {onNavigateFunnel && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetFunnelId = (client as any).funnelId || postSaleFunnels[0]?.id;
                                if (targetFunnelId) onNavigateFunnel(targetFunnelId);
                              }}
                              title="Visualizar no Funil de Pós-Venda"
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06B6D4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Target size={14} />
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

        {/* ── Table Footer & Pagination ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-input)',
          fontSize: '0.74rem',
        }}>
          <div style={{ color: 'var(--adm-text-muted)' }}>
            Mostrando <strong>{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> de <strong>{totalItems}</strong> clientes
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                color: 'var(--adm-text-title)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                color: 'var(--adm-text-title)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
