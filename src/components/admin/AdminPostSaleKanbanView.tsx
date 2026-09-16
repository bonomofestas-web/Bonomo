import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Kanban, Inbox, List, 
  Calendar, DollarSign, CheckCircle2, Settings
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminClientInspector } from './AdminClientInspector';
import { AdminNewClientModal } from './AdminNewClientModal';
import { AdminFunnelSettingsView } from './AdminFunnelSettingsView';
import { AdminWhatsAppWorkspaceView } from './AdminWhatsAppWorkspaceView';
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
    title: 'Onboarding & Boas-Vindas', 
    color: '#3B82F6', 
    bgColor: 'rgba(59, 130, 246, 0.08)', 
    borderColor: 'rgba(59, 130, 246, 0.3)' 
  },
  { 
    id: 'planning', 
    title: 'Planejamento & Cronograma', 
    color: '#F59E0B', 
    bgColor: 'rgba(245, 158, 11, 0.08)', 
    borderColor: 'rgba(245, 158, 11, 0.3)' 
  },
  { 
    id: 'suppliers', 
    title: 'Definição de Fornecedores', 
    color: '#8B5CF6', 
    bgColor: 'rgba(139, 92, 246, 0.08)', 
    borderColor: 'rgba(139, 92, 246, 0.3)' 
  },
  { 
    id: 'final_alignment', 
    title: 'Alinhamento Final (Reta Final)', 
    color: '#6366F1', 
    bgColor: 'rgba(99, 102, 241, 0.08)', 
    borderColor: 'rgba(99, 102, 241, 0.3)' 
  },
  { 
    id: 'party_day', 
    title: 'Semana da Festa / Evento', 
    color: '#EAB308', 
    bgColor: 'rgba(234, 179, 8, 0.08)', 
    borderColor: 'rgba(234, 179, 8, 0.3)' 
  },
  { 
    id: 'completed', 
    title: 'Festa Realizada', 
    color: '#10B981', 
    bgColor: 'rgba(16, 185, 129, 0.08)', 
    borderColor: 'rgba(16, 185, 129, 0.3)' 
  },
];

export const AdminPostSaleKanbanView: React.FC<AdminPostSaleKanbanViewProps> = ({
  onOpenDebutanteApp,
  onOpenCommercialLead,
  onOpenLead,
}) => {
  const effectiveOpenCommercialLead = onOpenCommercialLead || onOpenLead;
  const { clients, venues, activeVenueId, updateClientStage, funnels, addFunnel } = useAdminState();

  const [viewMode, setViewMode] = useState<'kanban' | 'inbox' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsFunnelId, setActiveSettingsFunnelId] = useState<string | null>(null);
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

  const postSaleFunnel = useMemo(() => {
    return (funnels || []).find(f => 
      f.isPostSale || 
      f.category === 'Pós-Venda' || 
      f.name?.toLowerCase().includes('pós-venda') || 
      f.name?.toLowerCase().includes('pos venda')
    );
  }, [funnels]);

  const handleOpenSettings = () => {
    let funnelId = postSaleFunnel?.id;
    if (!funnelId) {
      funnelId = addFunnel({
        name: 'Funil de Pós-Venda & Sucesso',
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

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Venue Filter
      const targetVenue = venueFilter !== 'all' ? venueFilter : activeVenueId;
      if (targetVenue && targetVenue !== 'all' && client.venueId !== targetVenue) {
        return false;
      }

      // Search Query (Aniversariante, Decisor, Código)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBirthdayPerson = (client.birthdayPersonName || client.name || '').toLowerCase().includes(q);
        const matchesPayer = (client.payerName || '').toLowerCase().includes(q);
        const matchesCode = (client.code || '').toLowerCase().includes(q);
        const matchesPhone = (client.payerPhone || '').includes(q);
        if (!matchesBirthdayPerson && !matchesPayer && !matchesCode && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [clients, venueFilter, activeVenueId, searchQuery]);

  // Overall metrics
  const metrics = useMemo(() => {
    const totalActive = filteredClients.filter(c => c.stage !== 'completed' && c.stage !== 'archived').length;
    const totalRevenue = filteredClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);
    const partiesNext60Days = filteredClients.filter(c => {
      const pTime = new Date(c.eventDate).getTime();
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

  if (selectedClientId) {
    return (
      <AdminClientInspector
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onOpenDebutanteApp={onOpenDebutanteApp}
        onOpenCommercialLead={effectiveOpenCommercialLead}
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
      {/* ── Header & Toolbar ── */}
      <div style={{
        padding: '20px 24px 14px',
        backgroundColor: 'var(--adm-bg-card)',
        borderBottom: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        {/* Title and Action Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👑</span>
              <h1 style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 900,
                color: 'var(--adm-text-title)',
                letterSpacing: '-0.3px',
              }}>
                Pós-Venda & Sucesso do Cliente
              </h1>
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                color: 'var(--adm-accent)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
              }}>
                {filteredClients.length} Clientes Ativos
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
              Organização e acompanhamento operacional da jornada da <strong>Aniversariante</strong> após o fechamento comercial
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Switcher: 3 Icons Only (Kanban, Inbox, List) identical to Commercial CRM */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--adm-bg-input)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              gap: '2px',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                title="Quadro Kanban"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'kanban' ? 'var(--adm-accent-bg)' : 'transparent',
                  color: viewMode === 'kanban' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Kanban size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('inbox')}
                title="Caixa de Entrada / Atendimento"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'inbox' ? 'var(--adm-accent-bg)' : 'transparent',
                  color: viewMode === 'inbox' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Inbox size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Lista & Tabela"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? 'var(--adm-accent-bg)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={15} />
              </button>
            </div>

            {/* Configurar Kanban */}
            <button
              onClick={handleOpenSettings}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                backgroundColor: 'var(--adm-bg-input)',
                color: 'var(--adm-text-title)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Settings size={14} />
              <span>Configurar</span>
            </button>

            {/* + Novo Cliente */}
            <button
              onClick={() => setIsNewClientModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--adm-accent)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)',
              }}
            >
              <Plus size={15} />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Filter and Metrics Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {/* Search & Venue Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
            <div style={{
              position: 'relative',
              flex: 1,
              maxWidth: '380px',
            }}>
              <Search
                size={15}
                color="var(--adm-accent)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Buscar por aniversariante, decisor ou CLI-XXXX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  backgroundColor: 'var(--adm-bg-input)',
                  fontSize: '0.80rem',
                  color: 'var(--adm-text-title)',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                backgroundColor: 'var(--adm-bg-input)',
                fontSize: '0.78rem',
                color: 'var(--adm-text-title)',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="all">Todas as Casas de Festas</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.76rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
            }}>
              <Calendar size={13} color="#F59E0B" />
              <span style={{ color: 'var(--adm-text-muted)' }}>Próximas Festas (60d):</span>
              <strong style={{ color: '#F59E0B' }}>{metrics.partiesNext60Days}</strong>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
            }}>
              <DollarSign size={13} color="var(--adm-accent)" />
              <span style={{ color: 'var(--adm-text-muted)' }}>Carteira Total:</span>
              <strong style={{ color: 'var(--adm-accent)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.totalRevenue)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content: Kanban, Inbox, or List ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: viewMode === 'inbox' ? 0 : '20px 28px', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'inbox' ? (
          <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <AdminWhatsAppWorkspaceView isEmbeddedInFunnel={true} onClose={() => setViewMode('kanban')} />
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Board */
          <div style={{
            display: 'flex',
            gap: '16px',
            height: '100%',
            overflowX: 'auto',
            paddingBottom: '16px',
          }}>
            {STAGE_COLUMNS.map(column => {
              const stageClients = filteredClients.filter(c => c.stage === column.id);
              const stageValue = stageClients.reduce((acc, c) => acc + (c.dealValue || 0), 0);

              return (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  style={{
                    flex: '0 0 320px',
                    backgroundColor: 'var(--adm-bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--adm-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--adm-border)',
                    borderTop: `3px solid ${column.color}`,
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    backgroundColor: column.bgColor,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {column.title}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--adm-bg-card)',
                        color: column.color,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}>
                        {stageClients.length}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stageValue)}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    {stageClients.map(client => {
                      const pTime = new Date(client.eventDate).getTime();
                      const daysLeft = Math.ceil((pTime - Date.now()) / (1000 * 60 * 60 * 24));

                      return (
                        <div
                          key={client.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, client.id)}
                          onClick={() => setSelectedClientId(client.id)}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.18)';
                            e.currentTarget.style.borderColor = 'var(--adm-accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                            e.currentTarget.style.borderColor = 'var(--adm-border)';
                          }}
                        >
                          {/* Card Top: Code and Venue */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--adm-accent)',
                            }}>
                              {client.code}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
                              {client.venueName}
                            </span>
                          </div>

                          {/* Card Main: Nome da Aniversariante */}
                          <div>
                            <strong style={{
                              fontSize: '15px',
                              color: 'var(--adm-text-title)',
                              display: 'block',
                              letterSpacing: '-0.01em',
                            }}>
                              {client.birthdayPersonName || client.name}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--adm-text-muted)' }}>
                              Decisor: {client.payerName}
                            </span>
                          </div>

                          {/* Card Date and Countdown */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            fontSize: '11px',
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--adm-text-title)' }}>
                              <Calendar size={12} color="#3B82F6" />
                              {new Date(client.eventDate).toLocaleDateString('pt-BR')}
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: daysLeft <= 30 ? '#EF4444' : daysLeft <= 90 ? '#F59E0B' : 'var(--adm-accent)',
                            }}>
                              {daysLeft > 0 ? `${daysLeft} dias` : daysLeft === 0 ? '🎉 Hoje!' : 'Realizada'}
                            </span>
                          </div>

                          {/* Card Bottom: Package, Value and Debutante App badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--adm-border)' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--adm-accent)' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(client.dealValue)}
                            </span>

                            {client.debutanteId ? (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10B981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}>
                                <CheckCircle2 size={11} /> App Ativo
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'var(--adm-text-muted)' }}>
                                Sem App
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {stageClients.length === 0 && (
                      <div style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--adm-text-muted)',
                        fontSize: '12px',
                        border: '1px dashed var(--adm-border)',
                        borderRadius: '8px',
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
                      onClick={() => setSelectedClientId(client.id)}
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
                        <span style={{ fontWeight: 700, color: 'var(--adm-accent)' }}>
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
                        }}>
                          {stageCol.title}
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
