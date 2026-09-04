import React, { useState, useMemo } from 'react';
import { 
  Headphones, X, Plus, Clock, CheckCircle2, AlertCircle, 
  Send, Image as ImageIcon, Video, ExternalLink, ArrowLeft,
  MessageSquare, ChevronRight
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { SupportTicketModule, SupportTicketStatus } from '../../types/admin';

interface AdminSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODULE_OPTIONS: { id: SupportTicketModule; label: string; icon: string }[] = [
  { id: 'home', label: 'Início', icon: '🏠' },
  { id: 'crm', label: 'Funil de Vendas / CRM', icon: '🎯' },
  { id: 'debutantes', label: 'Central de Debutantes', icon: '👑' },
  { id: 'venues', label: 'Casas de Festa', icon: '🏢' },
  { id: 'collaborators', label: 'Equipe & Colaboradores', icon: '🛡️' },
  { id: 'whatsapp', label: 'WhatsApp & Atendimento', icon: '💬' },
  { id: 'other', label: 'Outro Setor', icon: '⚙️' },
];

export const AdminSupportModal: React.FC<AdminSupportModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    activeVenueId, 
    venues, 
    supportTickets, 
    createSupportTicket, 
    sendSupportMessage 
  } = useAdminState();

  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Form State
  const [selectedModule, setSelectedModule] = useState<SupportTicketModule>('home');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Chat message draft
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // User Tickets (Filtrados para o usuário atual ou casa de festas, com foco nos últimos 7 dias)
  const userTickets = useMemo(() => {
    if (!currentUser) return [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Se for Dev, vê tudo; caso contrário, tickets criados por este usuário
    const filtered = currentUser.role === 'dev' 
      ? supportTickets 
      : supportTickets.filter(t => t.userId === currentUser.id || t.userEmail === currentUser.email);

    // Separar tickets recentes (últimos 7 dias) ou garantir que o último de todos apareça
    const recent = filtered.filter(t => new Date(t.createdAt) >= sevenDaysAgo);
    if (recent.length === 0 && filtered.length > 0) {
      return [filtered[0]]; // Sempre mostra pelo menos o último
    }
    return recent.length > 0 ? recent : filtered.slice(0, 5);
  }, [supportTickets, currentUser]);

  const activeTicket = useMemo(() => {
    return supportTickets.find(t => t.id === selectedTicketId) || null;
  }, [supportTickets, selectedTicketId]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Por favor, descreva o problema detalhadamente.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const activeVenue = venues.find(v => v.id === activeVenueId);
      const created = await createSupportTicket({
        userId: currentUser?.id || 'anon',
        userName: currentUser?.name || 'Colaborador',
        userEmail: currentUser?.email || '',
        userRole: currentUser?.role || 'master',
        venueId: activeVenueId || undefined,
        venueName: activeVenue?.name || undefined,
        module: selectedModule,
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        status: 'new',
      });

      if (created) {
        // Reset form and go to detail
        setDescription('');
        setImageUrl('');
        setVideoUrl('');
        setSelectedTicketId(created.id);
        setViewMode('detail');
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao enviar chamado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'new':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 800,
            background: 'rgba(20, 169, 215, 0.15)',
            color: '#14A9D7',
            border: '1px solid rgba(20, 169, 215, 0.35)',
          }}>
            <Clock size={11} />
            Novo
          </span>
        );
      case 'in_progress':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 800,
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#F59E0B',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}>
            <AlertCircle size={11} />
            Em Andamento
          </span>
        );
      case 'resolved':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 800,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}>
            <CheckCircle2 size={11} />
            Finalizado
          </span>
        );
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        background: '#120F17',
        border: '1px solid rgba(20, 169, 215, 0.3)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(20, 169, 215, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Poppins', sans-serif",
        color: '#FFFFFF',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          background: '#0B090E',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(20, 169, 215, 0.15)',
              border: '1px solid rgba(20, 169, 215, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14A9D7',
            }}>
              <Headphones size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Central de Suporte & Report de Bugs
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#8096A8', margin: '2px 0 0 0' }}>
                Comunicação direta com a equipe de desenvolvimento F5
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#8096A8',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8096A8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs (Minhas Solicitações vs Nova Solicitação) */}
        {viewMode !== 'detail' && (
          <div style={{
            display: 'flex',
            padding: '12px 24px 0 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'list' ? '2px solid #14A9D7' : '2px solid transparent',
                color: viewMode === 'list' ? '#14A9D7' : '#8096A8',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={15} />
              <span>Minhas Solicitações ({userTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('create')}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'create' ? '2px solid #14A9D7' : '2px solid transparent',
                color: viewMode === 'create' ? '#14A9D7' : '#8096A8',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={15} />
              <span>Novo Report de Bug</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* VIEW: DETAIL / CHAT */}
          {viewMode === 'detail' && activeTicket ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#14A9D7',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  alignSelf: 'flex-start',
                }}
              >
                <ArrowLeft size={14} />
                Voltar para lista de solicitações
              </button>

              {/* Ticket Card Info */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: '#14A9D7',
                      background: 'rgba(20, 169, 215, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}>
                      {activeTicket.ticketCode}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#8096A8' }}>
                      Setor: <strong style={{ color: '#FFFFFF' }}>{MODULE_OPTIONS.find(m => m.id === activeTicket.module)?.label || activeTicket.module}</strong>
                    </span>
                  </div>
                  {getStatusBadge(activeTicket.status)}
                </div>

                <p style={{ fontSize: '0.85rem', color: '#FFFFFF', margin: '8px 0', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                  {activeTicket.description}
                </p>

                {/* Attachments preview */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {activeTicket.imageUrl && (
                    <a
                      href={activeTicket.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(20, 169, 215, 0.1)',
                        border: '1px solid rgba(20, 169, 215, 0.3)',
                        color: '#14A9D7',
                        fontSize: '0.74rem',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <ImageIcon size={14} />
                      <span>Ver Imagem Anexada</span>
                      <ExternalLink size={12} />
                    </a>
                  )}

                  {activeTicket.videoUrl && (
                    <a
                      href={activeTicket.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#F59E0B',
                        fontSize: '0.74rem',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Video size={14} />
                      <span>Assistir Vídeo Explicativo</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div style={{ marginTop: '8px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8096A8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Respostas & Mensagens Diretas
                </h3>

                <div style={{
                  minHeight: '120px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                }}>
                  {(!activeTicket.messages || activeTicket.messages.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#8096A8', fontSize: '0.78rem' }}>
                      Nenhuma mensagem no chamado ainda. Envie uma mensagem ou aguarde a análise do desenvolvedor.
                    </div>
                  ) : (
                    activeTicket.messages.map((m) => {
                      const isMe = m.senderId === currentUser?.id;
                      const isDev = m.senderRole === 'dev';
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            background: isMe ? 'rgba(20, 169, 215, 0.2)' : isDev ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            border: isMe ? '1px solid rgba(20, 169, 215, 0.4)' : isDev ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDev ? '#D4AF37' : '#14A9D7' }}>
                              {m.senderName} {isDev && '⚡ (Desenvolvedor)'}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#8096A8' }}>
                              {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#FFFFFF', lineHeight: '1.4' }}>
                            {m.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    placeholder="Digite sua resposta para o desenvolvedor..."
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
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
                      borderRadius: '10px',
                      padding: '0 16px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: isSendingMessage || !messageDraft.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSendingMessage || !messageDraft.trim() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={15} />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          ) : viewMode === 'create' ? (
            /* VIEW: CREATE NEW TICKET */
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#EF4444',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}>
                  {formError}
                </div>
              )}

              {/* Pergunta Crucial 1: Qual setor do app ocorreu o bug? */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                  1. Em qual parte do sistema o problema aconteceu? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {MODULE_OPTIONS.map((m) => {
                    const isSelected = selectedModule === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModule(m.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(20, 169, 215, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1px solid #14A9D7' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#14A9D7' : '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          fontWeight: isSelected ? 800 : 500,
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pergunta Crucial 2: Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  2. O que aconteceu? Descreva o problema *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique com detalhes: o que você clicou, o que aconteceu de inesperado e o que você esperava que acontecesse..."
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    lineHeight: '1.4',
                  }}
                />
              </div>

              {/* Pergunta Crucial 3: Anexar Imagem (Upload R2) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  3. Anexar Print ou Foto do Erro (Recomendado)
                </label>
                <ImageUploadField
                  label="Print da Tela"
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="support"
                  placeholder="Selecione um print do erro para agilizar a correção"
                  previewHeight="100px"
                />
              </div>

              {/* Pergunta Crucial 4: Anexar Vídeo com instrução clara (Áudio 3) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  4. Anexar Vídeo da Tela (Opcional)
                </label>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(20, 169, 215, 0.08)',
                  border: '1px solid rgba(20, 169, 215, 0.25)',
                  fontSize: '0.74rem',
                  color: '#8096A8',
                  marginBottom: '8px',
                  lineHeight: '1.4',
                }}>
                  💡 <strong style={{ color: '#14A9D7' }}>Dica para envio de vídeo:</strong> Suba o vídeo no seu <strong>Google Drive</strong> ou no <strong>YouTube (como Não Listado)</strong> e cole o link público abaixo.
                </div>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou https://drive.google.com/..."
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#8096A8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#14A9D7',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isSubmitting || !description.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || !description.trim() ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(20, 169, 215, 0.35)',
                  }}
                >
                  {isSubmitting ? 'Enviando chamado...' : 'Enviar Solicitação de Suporte'}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW: TICKETS LIST (Últimos 7 dias ou último report) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', color: '#8096A8' }}>
                  Mostrando solicitações recentes dos últimos 7 dias:
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('create')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(20, 169, 215, 0.15)',
                    border: '1px solid rgba(20, 169, 215, 0.4)',
                    color: '#14A9D7',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  <span>Nova Solicitação</span>
                </button>
              </div>

              {userTickets.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Nenhuma solicitação aberta recentemente
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: '#8096A8', margin: '6px 0 16px 0' }}>
                    Tudo funcionando perfeitamente! Se encontrar qualquer instabilidade, reporte aqui.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('create')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: '#14A9D7',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Abrir Primeiro Chamado
                  </button>
                </div>
              ) : (
                userTickets.map((t) => {
                  const moduleLabel = MODULE_OPTIONS.find(m => m.id === t.module)?.label || t.module;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setViewMode('detail');
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(20, 169, 215, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(20, 169, 215, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            color: '#14A9D7',
                          }}>
                            {t.ticketCode}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#8096A8' }}>• {moduleLabel}</span>
                        </div>
                        {getStatusBadge(t.status)}
                      </div>

                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#E2E8F0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {t.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#8096A8' }}>
                          {new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#14A9D7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Ver detalhes / Chat <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
