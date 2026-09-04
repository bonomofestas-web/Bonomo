import React, { useState, useMemo } from 'react';
import { 
  Headphones, Search, Send, Image as ImageIcon, Video, ExternalLink, 
  X, MessageSquare, Building2
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

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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

      return true;
    });
  }, [supportTickets, searchQuery, moduleFilter]);

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

  const renderKanbanCard = (ticket: SupportTicket) => {
    const isSelected = selectedTicketId === ticket.id;
    const moduleInfo = MODULE_MAP[ticket.module] || { label: ticket.module, icon: '⚙️' };

    return (
      <div
        key={ticket.id}
        onClick={() => setSelectedTicketId(ticket.id)}
        style={{
          background: isSelected ? 'rgba(20, 169, 215, 0.16)' : '#17141E',
          border: `1px solid ${isSelected ? '#14A9D7' : 'rgba(255, 255, 255, 0.08)'}`,
          borderRadius: '14px',
          padding: '14px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: isSelected ? '0 0 16px rgba(20, 169, 215, 0.25)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {/* Card Header: Code + Module */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.82rem',
            color: '#14A9D7',
            background: 'rgba(20, 169, 215, 0.15)',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            {ticket.ticketCode}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#8096A8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{moduleInfo.icon}</span>
            <span>{moduleInfo.label}</span>
          </span>
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.15)',
            color: '#D4AF37',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(212, 175, 55, 0.3)',
          }}>
            {(ticket.userName || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ticket.userName}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#8096A8' }}>
              {ticket.userRole.toUpperCase()} {ticket.venueName ? `• ${ticket.venueName}` : ''}
            </div>
          </div>
        </div>

        {/* Description snippet */}
        <p style={{
          margin: 0,
          fontSize: '0.78rem',
          color: '#CBD5E1',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}>
          {ticket.description}
        </p>

        {/* Card Footer: Attachments & Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '8px',
          fontSize: '0.68rem',
          color: '#8096A8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ticket.imageUrl && (
              <span title="Possui print anexado" style={{ color: '#14A9D7', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ImageIcon size={12} /> Foto
              </span>
            )}
            {ticket.videoUrl && (
              <span title="Possui vídeo anexado" style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Video size={12} /> Vídeo
              </span>
            )}
            {ticket.messages && ticket.messages.length > 0 && (
              <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <MessageSquare size={12} /> {ticket.messages.length}
              </span>
            )}
          </div>

          <span>
            {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
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
    }}>
      {/* Top Banner / Metrics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(20, 169, 215, 0.15)',
            border: '1px solid rgba(20, 169, 215, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#14A9D7',
          }}>
            <Headphones size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Painel de Suporte & Central de Bugs
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#8096A8', margin: '2px 0 0 0' }}>
              Gerencie chamados de erro, responda usuários diretamente e altere status no Kanban
            </p>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#141118',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '8px 14px',
            width: '260px',
          }}>
            <Search size={15} color="#8096A8" />
            <input
              type="text"
              placeholder="Buscar código (#TKT), usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#8096A8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{
              background: '#141118',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Todos os Setores</option>
            <option value="home">Início</option>
            <option value="crm">Funil / CRM</option>
            <option value="debutantes">Debutantes</option>
            <option value="venues">Casas de Festa</option>
            <option value="collaborators">Colaboradores</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Outros</option>
          </select>
        </div>
      </div>

      {/* Main Kanban Columns Workspace */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: selectedTicketId ? '1fr 1fr 1fr 420px' : '1fr 1fr 1fr',
        gap: '16px',
        overflow: 'hidden',
        minHeight: 0,
        transition: 'all 0.2s ease',
      }}>
        {/* COLUMN 1: NOVAS SOLICITAÇÕES */}
        <div style={{
          background: '#0B090E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(20, 169, 215, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#14A9D7', boxShadow: '0 0 8px #14A9D7' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Novas Solicitações</span>
            </div>
            <span style={{
              background: 'rgba(20, 169, 215, 0.15)',
              color: '#14A9D7',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(20, 169, 215, 0.3)',
            }}>
              {newTickets.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {newTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: '#8096A8', fontSize: '0.76rem' }}>
                Nenhuma nova solicitação pendente
              </div>
            ) : (
              newTickets.map(renderKanbanCard)
            )}
          </div>
        </div>

        {/* COLUMN 2: EM ANDAMENTO */}
        <div style={{
          background: '#0B090E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(245, 158, 11, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Em Andamento</span>
            </div>
            <span style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              {inProgressTickets.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inProgressTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: '#8096A8', fontSize: '0.76rem' }}>
                Nenhum chamado em andamento
              </div>
            ) : (
              inProgressTickets.map(renderKanbanCard)
            )}
          </div>
        </div>

        {/* COLUMN 3: FINALIZADO */}
        <div style={{
          background: '#0B090E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(16, 185, 129, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>Finalizado</span>
            </div>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              {resolvedTickets.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resolvedTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: '#8096A8', fontSize: '0.76rem' }}>
                Nenhum chamado finalizado
              </div>
            ) : (
              resolvedTickets.map(renderKanbanCard)
            )}
          </div>
        </div>

        {/* COLUMN 4 / INBOX DRAWER: FICHA DETALHADA E CHAT DIRETO */}
        {selectedTicketId && activeTicket && (
          <div style={{
            background: '#120F17',
            border: '1px solid rgba(20, 169, 215, 0.3)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}>
            {/* Header da Ficha */}
            <div style={{
              padding: '14px 18px',
              background: '#0B090E',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  color: '#14A9D7',
                }}>
                  {activeTicket.ticketCode}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8096A8' }}>
                  • {MODULE_MAP[activeTicket.module]?.label || activeTicket.module}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8096A8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content & Chat Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Quick Status Changers */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {activeTicket.status !== 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('in_progress')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#F59E0B',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚙️ Em Andamento
                  </button>
                )}

                {activeTicket.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('resolved')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10B981',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Marcar Finalizado
                  </button>
                )}

                {activeTicket.status !== 'new' && (
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('new')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(20, 169, 215, 0.15)',
                      border: '1px solid rgba(20, 169, 215, 0.35)',
                      color: '#14A9D7',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📌 Reabrir
                  </button>
                )}
              </div>

              {/* User Dossier */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ fontSize: '0.68rem', color: '#8096A8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Solicitante
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {activeTicket.userName} ({activeTicket.userRole.toUpperCase()})
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8096A8' }}>
                  {activeTicket.userEmail || 'Email não informado'}
                </div>
                {activeTicket.venueName && (
                  <div style={{ fontSize: '0.72rem', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Building2 size={12} /> {activeTicket.venueName}
                  </div>
                )}
              </div>

              {/* Bug Description */}
              <div>
                <div style={{ fontSize: '0.68rem', color: '#8096A8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Descrição do Problema
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.8rem',
                  color: '#CBD5E1',
                  lineHeight: '1.45',
                  whiteSpace: 'pre-wrap',
                }}>
                  {activeTicket.description}
                </div>
              </div>

              {/* Attachments */}
              {(activeTicket.imageUrl || activeTicket.videoUrl) && (
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#8096A8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Anexos
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeTicket.imageUrl && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(20, 169, 215, 0.3)' }}>
                        <img
                          src={activeTicket.imageUrl}
                          alt="Print do erro"
                          style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                          onClick={() => window.open(activeTicket.imageUrl, '_blank')}
                        />
                        <div style={{ padding: '6px 10px', background: '#0B090E', fontSize: '0.68rem', color: '#14A9D7', textAlign: 'center' }}>
                          Clique na imagem para abrir em tamanho original
                        </div>
                      </div>
                    )}

                    {activeTicket.videoUrl && (
                      <a
                        href={activeTicket.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#F59E0B',
                          fontSize: '0.76rem',
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                      >
                        <Video size={16} />
                        <span>Abrir Vídeo Explicativo do Usuário</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Direct Messages Chat Thread */}
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '0.68rem', color: '#8096A8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Chat Direto com o Usuário
                </div>

                <div style={{
                  minHeight: '130px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                }}>
                  {(!activeTicket.messages || activeTicket.messages.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#8096A8', fontSize: '0.74rem' }}>
                      Nenhuma mensagem trocada ainda. Responda o usuário abaixo.
                    </div>
                  ) : (
                    activeTicket.messages.map((m) => {
                      const isDev = m.senderRole === 'dev';
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isDev ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            background: isDev ? 'rgba(20, 169, 215, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                            border: isDev ? '1px solid rgba(20, 169, 215, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isDev ? '#14A9D7' : '#D4AF37' }}>
                              {m.senderName} {isDev ? '(Você • Dev)' : ''}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#8096A8' }}>
                              {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.76rem', color: '#FFFFFF', lineHeight: '1.35' }}>
                            {m.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dev Reply Box */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    placeholder="Mande uma mensagem direta para o usuário..."
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageDraft.trim()}
                    style={{
                      background: '#14A9D7',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: isSendingMessage || !messageDraft.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSendingMessage || !messageDraft.trim() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Send size={13} />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
