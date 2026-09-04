import React, { useState, useMemo } from 'react';
import { 
  Headset, Search, Send, Image as ImageIcon, Video, 
  X, MessageSquare, LayoutGrid, List, CheckCircle2,
  Clock, AlertCircle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { SupportTicket, SupportTicketStatus } from '../../types/admin';

const MODULE_MAP: Record<string, { label: string; icon: string }> = {
  home: { label: 'Início', icon: '🏠' },
  crm: { label: 'Funil de Vendas / CRM', icon: '🎯' },
  debutantes: { label: 'Central de Debutantes', icon: '👑' },
  venues: { label: 'Casas de Festa', icon: '🏢' },
  collaborators: { label: 'Equipe & Colaboradores', icon: '🛡️' },
  whatsapp: { label: 'WhatsApp & Atendimento', icon: '💬' },
  other: { label: 'Outro Setor', icon: '⚙️' },
};

export const AdminDevSupportView: React.FC = () => {
  const { 
    supportTickets, 
    updateSupportTicketStatus, 
    sendSupportMessage 
  } = useAdminState();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Chat message draft
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter(ticket => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesCode = ticket.ticketCode.toLowerCase().includes(q);
        const matchesUser = ticket.userName.toLowerCase().includes(q);
        const matchesEmail = (ticket.userEmail || '').toLowerCase().includes(q);
        const matchesDesc = ticket.description.toLowerCase().includes(q);
        if (!matchesCode && !matchesUser && !matchesEmail && !matchesDesc) return false;
      }

      if (moduleFilter !== 'all' && ticket.module !== moduleFilter) {
        return false;
      }

      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [supportTickets, searchQuery, moduleFilter, statusFilter]);

  // Group into Kanban columns
  const newTickets = useMemo(() => filteredTickets.filter(t => t.status === 'new'), [filteredTickets]);
  const inProgressTickets = useMemo(() => filteredTickets.filter(t => t.status === 'in_progress'), [filteredTickets]);
  const resolvedTickets = useMemo(() => filteredTickets.filter(t => t.status === 'resolved'), [filteredTickets]);

  const activeTicket = useMemo(() => {
    return supportTickets.find(t => t.id === selectedTicketId) || null;
  }, [supportTickets, selectedTicketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !messageDraft.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await sendSupportMessage(activeTicket.id, messageDraft.trim());
      setMessageDraft('');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleChangeStatus = async (status: SupportTicketStatus) => {
    if (!activeTicket) return;
    await updateSupportTicketStatus(activeTicket.id, status);
  };

  const renderStatusBadge = (status: SupportTicketStatus) => {
    if (status === 'new') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(20, 169, 215, 0.15)',
          color: '#14A9D7',
          border: '1px solid rgba(20, 169, 215, 0.35)',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: '20px',
        }}>
          <AlertCircle size={12} />
          Novo
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: '20px',
        }}>
          <Clock size={12} />
          Em Andamento
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(16, 185, 129, 0.15)',
        color: '#10B981',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: '20px',
      }}>
        <CheckCircle2 size={12} />
        Resolvido
      </span>
    );
  };

  const renderKanbanCard = (ticket: SupportTicket) => {
    const isSelected = selectedTicketId === ticket.id;
    const moduleInfo = MODULE_MAP[ticket.module] || { label: ticket.module, icon: '⚙️' };
    const mediaUrl = ticket.imageUrl || ticket.screenshotUrl;

    return (
      <div
        key={ticket.id}
        onClick={() => setSelectedTicketId(ticket.id)}
        style={{
          background: isSelected ? 'rgba(20, 169, 215, 0.16)' : '#121A26',
          border: `1px solid ${isSelected ? '#14A9D7' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '14px',
          padding: '14px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: isSelected ? '0 0 18px rgba(20, 169, 215, 0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {/* Header do Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#14A9D7',
              background: 'rgba(20, 169, 215, 0.12)',
              padding: '2px 7px',
              borderRadius: '6px',
              border: '1px solid rgba(20, 169, 215, 0.25)',
            }}>
              {ticket.ticketCode}
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#D4AF37',
              background: 'rgba(212, 175, 55, 0.12)',
              padding: '2px 6px',
              borderRadius: '6px',
            }}>
              {moduleInfo.icon} {moduleInfo.label}
            </span>
          </div>

          <span style={{ fontSize: '0.68rem', color: '#8096A8' }}>
            {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </span>
        </div>

        {/* Descrição do problema */}
        <p style={{
          fontSize: '0.78rem',
          color: '#E1E7EC',
          lineHeight: 1.45,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {ticket.description}
        </p>

        {/* Informações do usuário e anexos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: '#8096A8',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <span style={{ fontWeight: 600, color: '#CBD5E1' }}>
            👤 {ticket.userName}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {mediaUrl && (
              <span title="Possui captura de tela" style={{ color: '#14A9D7', display: 'flex', alignItems: 'center' }}>
                <ImageIcon size={13} />
              </span>
            )}
            {ticket.videoUrl && (
              <span title="Possui gravação de vídeo" style={{ color: '#A855F7', display: 'flex', alignItems: 'center' }}>
                <Video size={13} />
              </span>
            )}
            {ticket.messages && ticket.messages.length > 0 && (
              <span title={`${ticket.messages.length} mensagem(ns)`} style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <MessageSquare size={13} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>{ticket.messages.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 28px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: "'Poppins', sans-serif",
      color: '#FFFFFF',
      background: 'radial-gradient(circle at 10% 10%, #0F1722 0%, #080D15 100%)',
    }}>
      {/* Top Banner / Metrics & Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {/* Título com ícone Headset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.25) 0%, rgba(20, 169, 215, 0.08) 100%)',
            border: '1px solid rgba(20, 169, 215, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
            boxShadow: '0 0 20px rgba(20, 169, 215, 0.25)',
          }}>
            <Headset size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                Painel de Suporte & Central de Bugs
              </h1>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(20, 169, 215, 0.15)',
                color: '#14A9D7',
                border: '1px solid rgba(20, 169, 215, 0.35)',
              }}>
                DEV SUPPORT
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '3px 0 0 0' }}>
              Atenda chamados com chat direto com a equipe, visualize prints/vídeos e alterne entre Kanban e Lista
            </p>
          </div>
        </div>

        {/* Toggle de Visualização: Kanban vs Lista */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#0D1522',
          border: '1px solid rgba(20, 169, 215, 0.35)',
          borderRadius: '12px',
          padding: '3px',
          gap: '4px',
        }}>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              border: viewMode === 'kanban' ? '1px solid #14A9D7' : '1px solid transparent',
              background: viewMode === 'kanban' ? 'rgba(20, 169, 215, 0.22)' : 'transparent',
              color: viewMode === 'kanban' ? '#FFFFFF' : '#8096A8',
              fontSize: '0.76rem',
              fontWeight: viewMode === 'kanban' ? 800 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutGrid size={15} color={viewMode === 'kanban' ? '#14A9D7' : '#8096A8'} />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              border: viewMode === 'list' ? '1px solid #14A9D7' : '1px solid transparent',
              background: viewMode === 'list' ? 'rgba(20, 169, 215, 0.22)' : 'transparent',
              color: viewMode === 'list' ? '#FFFFFF' : '#8096A8',
              fontSize: '0.76rem',
              fontWeight: viewMode === 'list' ? 800 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <List size={15} color={viewMode === 'list' ? '#14A9D7' : '#8096A8'} />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div style={{
        background: '#0D1522',
        border: '1px solid rgba(20, 169, 215, 0.25)',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Left: Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#161F2E',
          border: '1px solid rgba(20, 169, 215, 0.35)',
          borderRadius: '10px',
          padding: '8px 14px',
          width: '320px',
          maxWidth: '100%',
          transition: 'border-color 0.2s',
        }}>
          <Search size={16} color="#14A9D7" />
          <input
            type="text"
            placeholder="Buscar por código (#TKT), colaborador ou texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Seletor de Setor Moderno */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>Setor:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              style={{
                background: '#161F2E',
                border: '1px solid rgba(20, 169, 215, 0.35)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="all" style={{ background: '#0D1522' }}>Todos os Setores</option>
              <option value="home" style={{ background: '#0D1522' }}>🏠 Início</option>
              <option value="crm" style={{ background: '#0D1522' }}>🎯 Funil / CRM</option>
              <option value="debutantes" style={{ background: '#0D1522' }}>👑 Debutantes</option>
              <option value="venues" style={{ background: '#0D1522' }}>🏢 Casas de Festa</option>
              <option value="collaborators" style={{ background: '#0D1522' }}>🛡️ Colaboradores</option>
              <option value="whatsapp" style={{ background: '#0D1522' }}>💬 WhatsApp</option>
              <option value="other" style={{ background: '#0D1522' }}>⚙️ Outros</option>
            </select>
          </div>

          {/* Seletor de Status (visível no modo Lista ou para filtro refinado) */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: '#161F2E',
                  border: '1px solid rgba(20, 169, 215, 0.35)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <option value="all" style={{ background: '#0D1522' }}>Todos os Status</option>
                <option value="new" style={{ background: '#0D1522' }}>🚨 Novos</option>
                <option value="in_progress" style={{ background: '#0D1522' }}>⏳ Em Andamento</option>
                <option value="resolved" style={{ background: '#0D1522' }}>✅ Resolvidos</option>
              </select>
            </div>
          )}

          {/* Contador de chamados filtrados */}
          <span style={{
            fontSize: '0.74rem',
            color: '#14A9D7',
            background: 'rgba(20, 169, 215, 0.12)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(20, 169, 215, 0.25)',
            fontWeight: 700,
          }}>
            {filteredTickets.length} chamado(s)
          </span>
        </div>
      </div>

      {/* Main Workspace Area (Kanban OU Lista + Drawer Lateral se selecionado) */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: selectedTicketId ? '1fr 430px' : '1fr',
        gap: '16px',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left Side: Kanban OU Tabela em Lista */}
        {viewMode === 'kanban' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {/* COLUNA 1: NOVAS SOLICITAÇÕES */}
            <div style={{
              background: '#0D1522',
              border: '1px solid rgba(20, 169, 215, 0.25)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(20, 169, 215, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#14A9D7', boxShadow: '0 0 8px #14A9D7' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Novas Solicitações</span>
                </div>
                <span style={{
                  background: 'rgba(20, 169, 215, 0.2)',
                  color: '#14A9D7',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  border: '1px solid rgba(20, 169, 215, 0.35)',
                }}>
                  {newTickets.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {newTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748B', fontSize: '0.78rem' }}>
                    Nenhuma nova solicitação pendente
                  </div>
                ) : (
                  newTickets.map(renderKanbanCard)
                )}
              </div>
            </div>

            {/* COLUNA 2: EM ANDAMENTO */}
            <div style={{
              background: '#0D1522',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(245, 158, 11, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Em Andamento</span>
                </div>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#F59E0B',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}>
                  {inProgressTickets.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {inProgressTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748B', fontSize: '0.78rem' }}>
                    Nenhum chamado em andamento
                  </div>
                ) : (
                  inProgressTickets.map(renderKanbanCard)
                )}
              </div>
            </div>

            {/* COLUNA 3: RESOLVIDOS */}
            <div style={{
              background: '#0D1522',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(16, 185, 129, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Resolvidos</span>
                </div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}>
                  {resolvedTickets.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {resolvedTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748B', fontSize: '0.78rem' }}>
                    Nenhum chamado resolvido
                  </div>
                ) : (
                  resolvedTickets.map(renderKanbanCard)
                )}
              </div>
            </div>
          </div>
        ) : (
          /* MODO LISTA: Tabela Rica e Estruturada */
          <div style={{
            background: '#0D1522',
            border: '1px solid rgba(20, 169, 215, 0.25)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              overflowX: 'auto',
              flex: 1,
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.78rem',
              }}>
                <thead>
                  <tr style={{
                    background: '#161F2E',
                    borderBottom: '1px solid rgba(20, 169, 215, 0.2)',
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                    letterSpacing: '0.5px',
                  }}>
                    <th style={{ padding: '12px 16px' }}>Código</th>
                    <th style={{ padding: '12px 16px' }}>Data / Hora</th>
                    <th style={{ padding: '12px 16px' }}>Colaborador</th>
                    <th style={{ padding: '12px 16px' }}>Setor</th>
                    <th style={{ padding: '12px 16px' }}>Descrição do Problema</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Mídia</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                        Nenhum chamado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map(ticket => {
                      const isSelected = selectedTicketId === ticket.id;
                      const moduleInfo = MODULE_MAP[ticket.module] || { label: ticket.module, icon: '⚙️' };
                      const mediaUrl = ticket.imageUrl || ticket.screenshotUrl;

                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isSelected ? 'rgba(20, 169, 215, 0.14)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Código */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontWeight: 800,
                              color: '#14A9D7',
                              background: 'rgba(20, 169, 215, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(20, 169, 215, 0.25)',
                            }}>
                              {ticket.ticketCode}
                            </span>
                          </td>

                          {/* Data */}
                          <td style={{ padding: '12px 16px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { 
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>

                          {/* Solicitante */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{ticket.userName}</div>
                            {ticket.userEmail && (
                              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{ticket.userEmail}</div>
                            )}
                          </td>

                          {/* Setor */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              background: 'rgba(212, 175, 55, 0.12)',
                              color: '#D4AF37',
                              border: '1px solid rgba(212, 175, 55, 0.25)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              whiteSpace: 'nowrap',
                            }}>
                              {moduleInfo.icon} {moduleInfo.label}
                            </span>
                          </td>

                          {/* Descrição */}
                          <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                            <div style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: '#CBD5E1',
                            }}>
                              {ticket.description}
                            </div>
                          </td>

                          {/* Mídia */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {mediaUrl && (
                                <span title="Captura de tela anexada" style={{ color: '#14A9D7' }}>
                                  <ImageIcon size={14} />
                                </span>
                              )}
                              {ticket.videoUrl && (
                                <span title="Gravação em vídeo anexada" style={{ color: '#A855F7' }}>
                                  <Video size={14} />
                                </span>
                              )}
                              {!mediaUrl && !ticket.videoUrl && (
                                <span style={{ color: '#475569' }}>-</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 16px' }}>
                            {renderStatusBadge(ticket.status)}
                          </td>

                          {/* Ação */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketId(ticket.id);
                              }}
                              style={{
                                background: isSelected ? '#14A9D7' : 'rgba(20, 169, 215, 0.15)',
                                color: isSelected ? '#000000' : '#14A9D7',
                                border: '1px solid rgba(20, 169, 215, 0.4)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s',
                              }}
                            >
                              <MessageSquare size={12} />
                              <span>{isSelected ? 'Aberto' : 'Ver / Atender'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Right Side: Interactive Ticket Chat & Media Drawer */}
        {activeTicket && (
          <div style={{
            background: '#0D1522',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#161F2E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: '#14A9D7',
                    background: 'rgba(20, 169, 215, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 169, 215, 0.3)',
                  }}>
                    {activeTicket.ticketCode}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {activeTicket.userName}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                  {activeTicket.userEmail || 'Usuário do Sistema'} • {new Date(activeTicket.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Status Selector Bar */}
            <div style={{
              padding: '10px 18px',
              background: 'rgba(20, 169, 215, 0.05)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                Status do Chamado:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleChangeStatus('new')}
                  style={{
                    background: activeTicket.status === 'new' ? '#14A9D7' : 'rgba(20, 169, 215, 0.12)',
                    color: activeTicket.status === 'new' ? '#000000' : '#14A9D7',
                    border: '1px solid rgba(20, 169, 215, 0.35)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Novo
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus('in_progress')}
                  style={{
                    background: activeTicket.status === 'in_progress' ? '#F59E0B' : 'rgba(245, 158, 11, 0.12)',
                    color: activeTicket.status === 'in_progress' ? '#000000' : '#F59E0B',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Em Andamento
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus('resolved')}
                  style={{
                    background: activeTicket.status === 'resolved' ? '#10B981' : 'rgba(16, 185, 129, 0.12)',
                    color: activeTicket.status === 'resolved' ? '#000000' : '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Resolvido
                </button>
              </div>
            </div>

            {/* Scrollable Content: Details + Media + Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* Box da Mensagem Original do Usuário */}
              <div style={{
                background: '#161F2E',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#14A9D7', marginBottom: '6px' }}>
                  Descrição Inicial do Erro
                </div>
                <p style={{ fontSize: '0.78rem', color: '#E2E8F0', lineHeight: 1.5, margin: 0 }}>
                  {activeTicket.description}
                </p>
              </div>

              {/* Anexos de Mídia (Screenshot & Vídeo) */}
              {(activeTicket.imageUrl || activeTicket.screenshotUrl || activeTicket.videoUrl) && (
                <div style={{
                  background: '#161F2E',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#D4AF37' }}>
                    Evidências & Mídia Anexada
                  </div>

                  {(activeTicket.imageUrl || activeTicket.screenshotUrl) && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ImageIcon size={12} color="#14A9D7" />
                        <span>Captura de Tela:</span>
                      </div>
                      <img
                        src={(activeTicket.imageUrl || activeTicket.screenshotUrl)!}
                        alt="Screenshot"
                        onClick={() => setPreviewMediaUrl((activeTicket.imageUrl || activeTicket.screenshotUrl)!)}
                        style={{
                          width: '100%',
                          maxHeight: '160px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(20, 169, 215, 0.3)',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  )}

                  {activeTicket.videoUrl && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Video size={12} color="#A855F7" />
                        <span>Gravação da Tela:</span>
                      </div>
                      <video
                        src={activeTicket.videoUrl}
                        controls
                        style={{
                          width: '100%',
                          maxHeight: '180px',
                          borderRadius: '8px',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Histórico do Chat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>
                  Histórico de Atendimento
                </div>

                {(!activeTicket.messages || activeTicket.messages.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '0.74rem' }}>
                    Nenhuma resposta enviada ainda. Digite abaixo para orientar o colaborador.
                  </div>
                ) : (
                  activeTicket.messages.map((msg, idx) => {
                    const isDev = msg.senderRole === 'dev';
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isDev ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isDev ? 'linear-gradient(135deg, rgba(20, 169, 215, 0.25) 0%, rgba(20, 169, 215, 0.1) 100%)' : '#1E293B',
                          border: `1px solid ${isDev ? 'rgba(20, 169, 215, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '12px',
                          padding: '10px 12px',
                          color: '#FFFFFF',
                          fontSize: '0.76rem',
                          lineHeight: 1.4,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px',
                          fontSize: '0.65rem',
                          color: isDev ? '#14A9D7' : '#94A3B8',
                          fontWeight: 700,
                        }}>
                          <span>{msg.senderName} ({isDev ? 'Dev / Suporte' : 'Usuário'})</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div>{msg.message}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Input Footer */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 16px',
                background: '#161F2E',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="text"
                placeholder="Responder ao colaborador..."
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0D1522',
                  border: '1px solid rgba(20, 169, 215, 0.35)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={!messageDraft.trim() || isSendingMessage}
                style={{
                  background: '#14A9D7',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000000',
                  padding: '9px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: (!messageDraft.trim() || isSendingMessage) ? 'not-allowed' : 'pointer',
                  opacity: (!messageDraft.trim() || isSendingMessage) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Send size={14} />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal de Preview de Imagem em Tamanho Cheio */}
      {previewMediaUrl && (
        <div
          onClick={() => setPreviewMediaUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewMediaUrl}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
            />
            <button
              onClick={() => setPreviewMediaUrl(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: '#14A9D7',
                border: 'none',
                color: '#000000',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
