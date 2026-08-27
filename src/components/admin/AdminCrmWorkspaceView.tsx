import React, { useState, useEffect } from 'react';
import { 
  Search, Send, MessageSquare, Sparkles, 
  Settings, Mic
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { CloseDealValueModal } from './CloseDealValueModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminTaskModal } from './AdminTaskModal';
import { AdminLeadInspector } from './AdminLeadInspector';
import type { Lead, CrmStage } from '../../types/admin';

interface AdminCrmWorkspaceViewProps {
  initialLeadId?: string;
  onLeadOpened?: () => void;
}

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const formatTimeOnly = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '11:15'; }
};

export const AdminCrmWorkspaceView: React.FC<AdminCrmWorkspaceViewProps> = ({
  initialLeadId,
  onLeadOpened,
}) => {
  const { 
    leads, currentUser, activeVenueId,
    updateLeadStage, closeLeadSaleWithValue, addLeadNote,
    claimLeadIfUnassigned, assignLeadSdr,
    deleteLeadTask,
  } = useAdminState();

  // ── Column 1 filters ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'unassigned'>('all');

  // ── Active lead ────────────────────────────────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  
  // ── Column 3 state ─────────────────────────────────────────────────────────
  const [messageMode, setMessageMode] = useState<'whatsapp' | 'internal_note' | 'task'>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);

  // ── Task creation state ────────────────────────────────────────────────────
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ leadId: string; taskId: string; title: string } | null>(null);

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      claimLeadIfUnassigned(initialLeadId);
      if (onLeadOpened) onLeadOpened();
    }
  }, [initialLeadId]);

  // Filtered leads for Column 1
  const filteredLeads = leads.filter(l => {
    const matchesVenue = !activeVenueId || l.venueId === activeVenueId;
    const userRole = currentUser?.role;
    let matchesRole = true;
    if (userRole === 'sdr' && currentUser?.id) {
      matchesRole = l.sdrId === currentUser.id || !l.sdrId;
    } else if (userRole === 'closer' && currentUser?.id) {
      matchesRole = l.closerId === currentUser.id || l.stage === 'meeting_scheduled' || l.stage === 'contract_signed';
    }

    let matchesFilterType = true;
    if (filterType === 'mine') {
      matchesFilterType = (l.sdrId === currentUser?.id || l.closerId === currentUser?.id);
    } else if (filterType === 'unassigned') {
      matchesFilterType = !l.sdrId;
    }

    const matchesSearch = !search.trim() ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.debutanteName.toLowerCase().includes(search.toLowerCase());

    return matchesVenue && matchesRole && matchesFilterType && matchesSearch;
  });

  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads.length]);

  const currentLead = leads.find(l => l.id === selectedLeadId) || filteredLeads[0] || null;

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    if (!lead.sdrId && (currentUser?.role === 'sdr' || currentUser?.role === 'crm')) {
      claimLeadIfUnassigned(lead.id);
    }
  };

  const handleStageChange = (newStage: CrmStage) => {
    if (!currentLead) return;

    if (newStage !== 'new_lead' && !currentLead.sdrId && currentUser && (currentUser.role === 'sdr' || currentUser.role === 'crm' || currentUser.role === 'admin' || currentUser.role === 'master')) {
      assignLeadSdr(currentLead.id, currentUser.id);
    }

    if (newStage === 'contract_signed') { 
      setIsCloseDealModalOpen(true); 
    } else { 
      updateLeadStage(currentLead.id, newStage); 
    }
  };

  const handleConfirmSale = (leadId: string, dealValue: number, packageSold: string, contractDate: string) => {
    closeLeadSaleWithValue(leadId, dealValue, packageSold, contractDate);
  };

  const handleSendMessage = () => {
    if (!currentLead || !messageText.trim()) return;

    if (messageMode === 'whatsapp') {
      const cleanPhone = currentLead.phone.replace(/\D/g, '');
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText.trim())}`;
      window.open(url, '_blank');
      addLeadNote(currentLead.id, `[WhatsApp Enviado] ${messageText.trim()}`);
    } else if (messageMode === 'internal_note') {
      addLeadNote(currentLead.id, messageText.trim());
    }

    setMessageText('');
  };

  const handleWhatsApp = (lead: Lead) => {
    const clean = lead.phone.replace(/\D/g, '');
    const txt = `Olá, ${lead.name}! Tudo bem?\nRecebemos sua indicação através da debutante ${lead.debutanteName} para conhecer os pacotes especiais de 15 Anos da Bonomo Festas.\nPodemos agendar uma visita ou degustação?`;
    window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(txt)}`, '_blank');
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '310px 390px 1fr',
      gap: '0px',
      height: '100%',
      minHeight: 0,
      flex: 1,
      background: '#0D0B12',
      border: '1px solid var(--adm-border)',
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 1 — INBOX / CONVERSAS ABERTAS (KOMMO STYLE)                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#121019',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}>
        {/* Search header */}
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Buscar lead ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px 6px 30px',
                  color: '#FFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Settings size={15} />
            </button>
          </div>

          {/* INBOX Title + Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--adm-text-muted)', letterSpacing: '0.6px' }}>
                INBOX
              </span>
              <span style={{
                background: '#2563EB',
                color: '#FFF',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.66rem',
                fontWeight: 800,
              }}>
                {filteredLeads.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                style={{
                  background: filterType === 'all' ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                  border: 'none',
                  color: filterType === 'all' ? '#22C55E' : 'var(--adm-text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Abertas
              </button>
              <button
                type="button"
                onClick={() => setFilterType('mine')}
                style={{
                  background: filterType === 'mine' ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
                  border: 'none',
                  color: filterType === 'mine' ? '#60A5FA' : 'var(--adm-text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Minhas
              </button>
            </div>
          </div>
        </div>

        {/* Leads list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
              Nenhum contato encontrado
            </div>
          ) : (
            filteredLeads.map((lead, index) => {
              const isSelected = selectedLeadId === lead.id;
              const tagCode = `A${1400 + (index * 7) % 500}`;
              const timeStr = lead.createdAt ? formatTimeOnly(lead.createdAt) : 'Hoje 11:15';
              const lastNote = lead.notes || 'Salesbot: Olá, tudo bem?';

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    background: isSelected ? '#2563EB' : 'transparent',
                    color: isSelected ? '#FFF' : 'inherit',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {/* Avatar with WhatsApp dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        color: isSelected ? '#FFF' : '#D1C8BA',
                      }}>
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      {/* WhatsApp channel badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#25D366',
                        border: '2px solid #121019',
                      }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: Name + Tag + Time */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: isSelected ? '#FFF' : 'var(--adm-text-title)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {lead.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{
                            background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(34, 197, 94, 0.15)',
                            color: isSelected ? '#FFF' : '#22C55E',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                          }}>
                            {tagCode}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--adm-text-muted)' }}>
                            {timeStr}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Debutante / Venue / City */}
                      <div style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.85)' : '#D4AF37', marginTop: '1px', fontWeight: 600 }}>
                        {lead.debutanteName || 'Rio de Janeiro'}
                      </div>

                      {/* Row 3: Message preview */}
                      <div style={{
                        fontSize: '0.72rem',
                        color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--adm-text-muted)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {lastNote}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Menções & Chats de equipe */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(0, 0, 0, 0.25)',
          fontSize: '0.68rem',
          fontWeight: 800,
          color: 'var(--adm-text-muted)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          MENÇÕES & CHATS DE EQUIPE
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 2 — INSPEÇÃO & LINHAS DO LEAD (KOMMO STYLE)                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#121018',
        height: '100%',
      }}>
        {!currentLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--adm-text-muted)' }}>
            <Sparkles size={40} color="var(--adm-text-muted)" style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Selecione um contato para inspecionar</div>
          </div>
        ) : (
          <AdminLeadInspector
            lead={currentLead}
            onWhatsApp={handleWhatsApp}
            onStageChange={handleStageChange}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 3 — FEED DE TIMELINE / CHAT & CAIXA DE ENVIO                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0F0D15',
        height: '100%',
      }}>
        {!currentLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--adm-text-muted)' }}>
            <MessageSquare size={36} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.8rem' }}>Selecione um lead para ver o histórico</div>
          </div>
        ) : (
          <>
            {/* Timeline feed body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Date Divider (Hoje) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--adm-text-muted)',
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}>
                  Hoje
                </span>
              </div>

              {/* Lead Creation Audit Pill */}
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                <span>{currentLead.createdAt ? formatDate(currentLead.createdAt) : 'Hoje'}</span>{' '}
                <strong style={{ color: '#D4AF37' }}>{currentLead.debutanteName}</strong> indicou{' '}
                <strong style={{ color: '#FFF' }}>{currentLead.name}</strong> para os 15 Anos.
              </div>

              {/* Message Cards (Simulated Kommo Chat Bubble) */}
              <div style={{
                background: '#161320',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(37, 211, 102, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#25D366',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}>
                    WA
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFF' }}>
                      {currentLead.name}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                      Telefone: {currentLead.phone}
                    </div>
                  </div>
                </div>

                {/* Message pill inside card */}
                <div style={{
                  background: '#2563EB',
                  color: '#FFF',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                }}>
                  <div style={{ fontSize: '0.66rem', opacity: 0.85, marginBottom: '4px' }}>
                    {formatDate(currentLead.createdAt || new Date().toISOString())} • SalesBot
                  </div>
                  Olá, {currentLead.name}! Tudo bem? Recebemos sua indicação através da debutante {currentLead.debutanteName} para conhecer os pacotes especiais de 15 Anos da Bonomo Festas.
                </div>

                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', textAlign: 'right' }}>
                  Conversa Nº {currentLead.id.slice(-6).toUpperCase()}
                </div>
              </div>

              {/* Internal Note */}
              {currentLead.notes && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#D4AF37', fontWeight: 700, marginBottom: '4px' }}>
                    Observação Interna
                  </div>
                  <div style={{ color: 'var(--adm-text-title)', lineHeight: 1.5 }}>
                    {currentLead.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Box (Kommo CRM exact interaction box) */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#14111C',
              flexShrink: 0,
            }}>
              {/* Tab Selector: Bate-papo | Nota interna | Criar Tarefa */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMessageMode('whatsapp')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: messageMode === 'whatsapp' ? '#25D366' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: messageMode === 'whatsapp' ? 800 : 600,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Bate-papo com {currentLead.name.split(' ')[0]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMessageMode('internal_note')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: messageMode === 'internal_note' ? '#D4AF37' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: messageMode === 'internal_note' ? 800 : 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Nota interna
                </button>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  + Nova Tarefa
                </button>
              </div>

              {/* Text Input */}
              <textarea
                rows={2}
                placeholder={
                  messageMode === 'whatsapp'
                    ? `Enviar mensagem no WhatsApp para ${currentLead.name}...`
                    : 'Adicionar observação interna no histórico deste lead...'
                }
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSendMessage();
                  }
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: '#FFF',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />

              {/* Action Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    style={{
                      background: messageMode === 'whatsapp' ? '#25D366' : '#2563EB',
                      border: 'none',
                      color: '#FFF',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={12} />
                    <span>{messageMode === 'whatsapp' ? 'Enviar WhatsApp' : 'Salvar Nota'}</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Mic size={14} />
                  </button>
                </div>

                {messageText && (
                  <button
                    type="button"
                    onClick={() => setMessageText('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {isCloseDealModalOpen && currentLead && (
        <CloseDealValueModal
          lead={currentLead}
          isOpen={isCloseDealModalOpen}
          onClose={() => setIsCloseDealModalOpen(false)}
          onConfirmSale={handleConfirmSale}
        />
      )}

      {isTaskModalOpen && currentLead && (
        <AdminTaskModal
          isOpen={isTaskModalOpen}
          presetLeadId={currentLead.id}
          onClose={() => setIsTaskModalOpen(false)}
        />
      )}

      {taskToDelete && (
        <AdminConfirmModal
          isOpen={!!taskToDelete}
          title="Excluir Tarefa"
          message={`Tem certeza que deseja excluir a tarefa "${taskToDelete.title}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir Tarefa"
          danger={true}
          onConfirm={() => {
            deleteLeadTask(taskToDelete.leadId, taskToDelete.taskId);
            setTaskToDelete(null);
          }}
          onClose={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
};
