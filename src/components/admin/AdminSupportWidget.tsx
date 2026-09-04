import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Headphones, X, Plus, Clock, CheckCircle2, AlertCircle, 
  Send, ArrowLeft, MessageSquare, ChevronRight, LayoutDashboard, Target,
  Crown, Building2, Users, Settings, Paperclip, RefreshCw
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { SupportTicketModule, SupportTicketStatus } from '../../types/admin';

interface AdminSupportWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkRead?: () => void;
}

const MODULE_OPTIONS: { id: SupportTicketModule; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'home', label: 'Início', icon: LayoutDashboard },
  { id: 'crm', label: 'Funil de Vendas / CRM', icon: Target },
  { id: 'debutantes', label: 'Central de Debutantes', icon: Crown },
  { id: 'venues', label: 'Casas de Festa', icon: Building2 },
  { id: 'collaborators', label: 'Equipe & Colaboradores', icon: Users },
  { id: 'whatsapp', label: 'WhatsApp & Atendimento', icon: MessageSquare },
  { id: 'other', label: 'Outro Setor', icon: Settings },
];

export const AdminSupportWidget: React.FC<AdminSupportWidgetProps> = ({ isOpen, onClose, onMarkRead }) => {
  const { 
    currentUser, 
    activeVenueId, 
    venues, 
    supportTickets, 
    createSupportTicket, 
    sendSupportMessage 
  } = useAdminState();

  // Widget Navigation Mode: 'dialog' (menu inicial) | 'create' | 'detail' | 'closed_list'
  const [viewMode, setViewMode] = useState<'dialog' | 'create' | 'detail' | 'closed_list'>('dialog');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Form State
  const [selectedModule, setSelectedModule] = useState<SupportTicketModule>('home');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showAttachUpload, setShowAttachUpload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Chat message draft
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtro de chamados do usuário logado
  const userTickets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'dev') return supportTickets;
    return supportTickets.filter(t => t.userId === currentUser.id || t.userEmail === currentUser.email);
  }, [supportTickets, currentUser]);

  const openTickets = useMemo(() => {
    return userTickets.filter(t => t.status !== 'resolved');
  }, [userTickets]);

  const closedTickets = useMemo(() => {
    return userTickets.filter(t => t.status === 'resolved');
  }, [userTickets]);

  const activeTicket = useMemo(() => {
    return supportTickets.find(t => t.id === selectedTicketId) || null;
  }, [supportTickets, selectedTicketId]);

  // Rola para a última mensagem ao abrir o chat ou enviar
  useEffect(() => {
    if (viewMode === 'detail') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewMode, activeTicket?.messages]);

  // Ao abrir o widget, marca lido se a callback existir
  useEffect(() => {
    if (isOpen && onMarkRead) {
      onMarkRead();
    }
  }, [isOpen, onMarkRead]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Por favor, descreva a dúvida ou problema.');
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
        status: 'new',
      });

      if (created) {
        setDescription('');
        setImageUrl('');
        setShowAttachUpload(false);
        setSelectedTicketId(created.id);
        setViewMode('detail');
      } else {
        setFormError('Não foi possível registrar o chamado. Tente novamente.');
      }
    } catch {
      setFormError('Falha de conexão ao enviar o chamado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageDraft.trim() || !selectedTicketId || isSendingMessage) return;

    setIsSendingMessage(true);
    const content = messageDraft.trim();
    setMessageDraft('');

    try {
      await sendSupportMessage(selectedTicketId, content);
    } catch {
      alert('Erro ao enviar mensagem para o suporte.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'new':
        return (
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(234, 179, 8, 0.12)',
            color: '#EAB308',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Clock size={10} />
            <span>Pendente</span>
          </span>
        );
      case 'in_progress':
        return (
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3B82F6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <RefreshCw size={10} className="animate-spin" />
            <span>Em Atendimento</span>
          </span>
        );
      case 'resolved':
        return (
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <CheckCircle2 size={10} />
            <span>Resolvido</span>
          </span>
        );
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        height: '590px',
        maxHeight: 'calc(100vh - 85px)',
        background: '#0B111A',
        border: '1px solid rgba(20, 169, 215, 0.35)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Poppins', sans-serif",
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      {/* ── HEADER DO WIDGET (ESTILO CRISP / INTERCOM) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0A58CA 0%, #032860 100%)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#FFFFFF',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}>
            <Headphones size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
              Entre em contato conosco
            </div>
            <div style={{ fontSize: '0.68rem', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span>Suporte & Equipe Técnica Online</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Minimizar Suporte"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── CORPO PRINCIPAL DO WIDGET ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: '#080C14',
      }}>

        {/* ── VISÃO 1: DIÁLOGO INICIAL (MENU DE OPÇÕES) ── */}
        {viewMode === 'dialog' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Balão do Atendimento */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#0A58CA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                flexShrink: 0,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                F5
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                borderTopLeftRadius: '4px',
                padding: '12px 14px',
                color: '#E2E8F0',
                fontSize: '0.78rem',
                lineHeight: 1.45,
              }}>
                Olá, <strong>{currentUser?.name?.split(' ')[0] || 'Colaborador'}</strong>! Sempre que precisar de suporte, esclarecimento de dúvidas ou reporte de alguma inconsistência, estamos por aqui.
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '6px' }}>
                  Escolha uma das opções abaixo:
                </div>
              </div>
            </div>

            {/* Chips de Ação Rápida */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setViewMode('create')}
                style={{
                  background: 'linear-gradient(135deg, #0A58CA 0%, #1D4ED8 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 4px 14px rgba(10, 88, 202, 0.35)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={15} />
                  <span>Criar Novo Chamado / Dúvida</span>
                </div>
                <ChevronRight size={15} />
              </button>

              {openTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (openTickets.length === 1) {
                      setSelectedTicketId(openTickets[0].id);
                      setViewMode('detail');
                    } else {
                      // Se houver mais de um, abre o mais recente
                      setSelectedTicketId(openTickets[0].id);
                      setViewMode('detail');
                    }
                  }}
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#60A5FA',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={15} />
                    <span>Meus Chamados em Aberto ({openTickets.length})</span>
                  </div>
                  <ChevronRight size={15} />
                </button>
              )}

              {closedTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('closed_list')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#94A3B8',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>Histórico de Chamados Concluídos ({closedTickets.length})</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* Chamado Recente Ativo (Card Destaque) */}
            {openTickets.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.3px' }}>
                  Última interação em andamento
                </div>
                <div 
                  onClick={() => {
                    setSelectedTicketId(openTickets[0].id);
                    setViewMode('detail');
                  }}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3B82F6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#60A5FA' }}>
                      #{openTickets[0].ticketCode}
                    </span>
                    {renderStatusBadge(openTickets[0].status)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {openTickets[0].description}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Clock size={10} />
                    <span>{new Date(openTickets[0].createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VISÃO 2: NOVO CHAMADO ── */}
        {viewMode === 'create' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setViewMode('dialog')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>
                Novo Chamado Técnico
              </div>
            </div>

            {formError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '8px 10px',
                color: '#EF4444',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Setor / Módulo Relacionado
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {MODULE_OPTIONS.map(mod => {
                    const isSelected = selectedModule === mod.id;
                    const ModIcon = mod.icon;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedModule(mod.id)}
                        style={{
                          background: isSelected ? 'rgba(10, 88, 202, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${isSelected ? '#0A58CA' : 'rgba(255, 255, 255, 0.08)'}`,
                          borderRadius: '8px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: isSelected ? '#60A5FA' : '#94A3B8',
                          fontSize: '0.7rem',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <ModIcon size={13} color={isSelected ? '#60A5FA' : '#94A3B8'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mod.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Como podemos ajudar? *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva o que aconteceu ou qual dúvida deseja esclarecer com a equipe técnica..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0A58CA'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                />
              </div>

              {/* Botão de Anexo de Print */}
              <div>
                {!showAttachUpload ? (
                  <button
                    type="button"
                    onClick={() => setShowAttachUpload(true)}
                    style={{
                      background: 'transparent',
                      border: '1px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#94A3B8',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Paperclip size={13} />
                    <span>Anexar print ou imagem (opcional)</span>
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <ImageUploadField
                      label="Print do problema / tela"
                      value={imageUrl}
                      onChange={setImageUrl}
                      folder="support-attachments"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #0A58CA 0%, #1D4ED8 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isSubmitting ? 0.7 : 1,
                  marginTop: '4px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Enviando chamado...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Enviar para a Equipe de Suporte</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── VISÃO 3: DETALHE DO CHAMADO & CHAT (ESTILO PRINT ENVIADO) ── */}
        {viewMode === 'detail' && activeTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar do Chamado */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('dialog')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
                    Chamado #{activeTicket.ticketCode}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94A3B8' }}>
                    Módulo: {MODULE_OPTIONS.find(m => m.id === activeTicket.module)?.label || activeTicket.module}
                  </div>
                </div>
              </div>
              {renderStatusBadge(activeTicket.status)}
            </div>

            {/* Conversa / Mensagens */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* Mensagem Inicial com a Descrição do Chamado */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '82%',
                  background: '#0A58CA',
                  borderRadius: '14px',
                  borderTopRightRadius: '3px',
                  padding: '10px 12px',
                  color: '#FFFFFF',
                  fontSize: '0.76rem',
                  lineHeight: 1.45,
                }}>
                  <div style={{ fontWeight: 500 }}>{activeTicket.description}</div>
                  {activeTicket.imageUrl && (
                    <a href={activeTicket.imageUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '6px' }}>
                      <img 
                        src={activeTicket.imageUrl} 
                        alt="Anexo" 
                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} 
                      />
                    </a>
                  )}
                  <div style={{ fontSize: '0.62rem', color: '#BFDBFE', textAlign: 'right', marginTop: '4px' }}>
                    {new Date(activeTicket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Mensagens subsequentes da conversa */}
              {(activeTicket.messages || []).map((msg) => {
                const isDev = msg.senderRole === 'dev';
                const isMe = msg.senderId === currentUser?.id;

                return (
                  <div 
                    key={msg.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      gap: '8px',
                      alignItems: 'flex-start',
                    }}
                  >
                    {!isMe && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#0A58CA',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        F5
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%',
                      background: isMe ? '#0A58CA' : 'rgba(255, 255, 255, 0.08)',
                      border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '14px',
                      borderTopLeftRadius: isMe ? '14px' : '3px',
                      borderTopRightRadius: isMe ? '3px' : '14px',
                      padding: '10px 12px',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      lineHeight: 1.45,
                    }}>
                      {!isMe && (
                        <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#60A5FA', marginBottom: '2px' }}>
                          {msg.senderName} {isDev && '(Suporte Técnico)'}
                        </div>
                      )}
                      <div>{msg.message}</div>
                      <div style={{ 
                        fontSize: '0.62rem', 
                        color: isMe ? '#BFDBFE' : '#94A3B8', 
                        textAlign: isMe ? 'right' : 'left', 
                        marginTop: '4px' 
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Barra Inferior de Envio de Mensagem no Chat */}
            {activeTicket.status !== 'resolved' ? (
              <form 
                onSubmit={handleSendMessage}
                style={{
                  padding: '10px 12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  placeholder="Digite uma mensagem..."
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    padding: '8px 14px',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0A58CA'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
                <button
                  type="submit"
                  disabled={!messageDraft.trim() || isSendingMessage}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: messageDraft.trim() ? '#0A58CA' : 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: messageDraft.trim() ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Send size={14} />
                </button>
              </form>
            ) : (
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#10B981',
                fontSize: '0.72rem',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                <span>Este atendimento foi finalizado pelo suporte.</span>
              </div>
            )}
          </div>
        )}

        {/* ── VISÃO 4: LISTA DE CHAMADOS CONCLUÍDOS ── */}
        {viewMode === 'closed_list' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setViewMode('dialog')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>
                Chamados Encerrados ({closedTickets.length})
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {closedTickets.map(tk => (
                <div
                  key={tk.id}
                  onClick={() => {
                    setSelectedTicketId(tk.id);
                    setViewMode('detail');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8' }}>
                      #{tk.ticketCode}
                    </span>
                    {renderStatusBadge(tk.status)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tk.description}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#64748B' }}>
                    Encerrado em: {new Date(tk.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
