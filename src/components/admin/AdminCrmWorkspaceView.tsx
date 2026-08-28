import React, { useState, useEffect } from 'react';
import { 
  Send, MessageSquare, Sparkles, 
  ChevronRight, CheckCircle2, Lock,
  FileText
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
  isMiddleInitiallyOpen?: boolean;
  searchQuery?: string;
}

const formatDateTime = (iso: string) => {
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
  isMiddleInitiallyOpen = true,
  searchQuery = '',
}) => {
  const { 
    leads, collaborators, currentUser, activeVenueId,
    updateLeadStage, closeLeadSaleWithValue, addLeadNote,
    assignLeadSdr,
    deleteLeadTask, completeLeadTask
  } = useAdminState();

  // ── Column 1 filter tabs ──────────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<'all' | 'mine'>('all');

  // ── Active lead & Column 2 Collapse state ──────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [isMiddleCollapsed, setIsMiddleCollapsed] = useState<boolean>(!isMiddleInitiallyOpen && !initialLeadId);
  
  // ── Column 3 Top Tabs: 'whatsapp' | 'history' | 'tasks' ────────────────────
  const [activeTabCol3, setActiveTabCol3] = useState<'whatsapp' | 'history' | 'tasks'>('history');
  const [noteText, setNoteText] = useState('');
  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);

  // ── Task creation state ────────────────────────────────────────────────────
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ leadId: string; taskId: string; title: string } | null>(null);

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      setIsMiddleCollapsed(false);
      if (onLeadOpened) onLeadOpened();
    }
  }, [initialLeadId]);

  // Filtered leads for Column 1
  const filteredLeads = leads.filter(l => {
    const matchesVenue = !activeVenueId || l.venueId === activeVenueId;
    
    if (filterTab === 'mine') {
      const isMine = (currentUser?.id && (l.sdrId === currentUser.id || l.closerId === currentUser.id)) ||
        (currentUser?.name && l.assignedTo?.toLowerCase() === currentUser.name.toLowerCase());
      if (!isMine) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.debutanteName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return matchesVenue;
  });

  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads.length]);

  const currentLead = leads.find(l => l.id === selectedLeadId) || filteredLeads[0] || null;

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsMiddleCollapsed(false);
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

  const handleSendInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead || !noteText.trim()) return;
    addLeadNote(currentLead.id, noteText.trim());
    setNoteText('');
  };

  const leadTasks = currentLead?.tasks || [];
  const leadActivities = currentLead?.activities || [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMiddleCollapsed ? '290px 1fr' : '290px 400px 1fr',
      gap: '0px',
      height: '100%',
      minHeight: 0,
      flex: 1,
      background: 'var(--adm-bg-app)',
      border: '1px solid var(--adm-border)',
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 1 — INBOX / LISTA DE CONVERSAS (COMPACTO E LIMPO)                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--adm-bg-card)',
        borderRight: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}>
        {/* Header Compacto: INBOX [Contador] e abas [Abertas] e [Minhas] */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-card)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--adm-text-title)', letterSpacing: '0.5px' }}>
              INBOX
            </span>
            <span style={{
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              border: '1px solid var(--adm-accent)',
              padding: '1px 7px',
              borderRadius: '10px',
              fontSize: '0.66rem',
              fontWeight: 800,
            }}>
              {filteredLeads.length}
            </span>
          </div>

          {/* Abas [Abertas] [Minhas] */}
          <div style={{
            display: 'flex',
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              style={{
                background: filterTab === 'all' ? 'var(--adm-bg-card)' : 'transparent',
                color: filterTab === 'all' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                border: filterTab === 'all' ? '1px solid var(--adm-border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Abertas
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('mine')}
              style={{
                background: filterTab === 'mine' ? 'var(--adm-bg-card)' : 'transparent',
                color: filterTab === 'mine' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                border: filterTab === 'mine' ? '1px solid var(--adm-border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Minhas
            </button>
          </div>
        </div>

        {/* Feed de Leads / Conversas */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
              Nenhum lead encontrado neste filtro.
            </div>
          ) : (
            filteredLeads.map(lead => {
              const isSelected = lead.id === selectedLeadId;
              const sdr = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : undefined;
              const sdrAvatar = sdr?.avatarUrl;
              const lastActivity = lead.activities?.[0];

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  style={{
                    padding: '11px 14px',
                    borderBottom: '1px solid var(--adm-border)',
                    background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--adm-accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Top Row: Avatar + Indicator + Name + Tag + Time */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {/* Avatar with WhatsApp dot */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1E1B2E 0%, #0D0B14 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          color: '#D4AF37',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          overflow: 'hidden',
                        }}>
                          {sdrAvatar ? (
                            <img src={sdrAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            lead.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#22C55E',
                          border: '1.5px solid var(--adm-bg-card)',
                        }} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 800 : 700,
                          color: 'var(--adm-text-title)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {lead.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: 'var(--adm-accent)',
                        background: 'rgba(212, 175, 55, 0.1)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}>
                        [A{lead.age || 15}00]
                      </span>
                      <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                        {formatTimeOnly(lead.createdAt || new Date().toISOString())}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Debutante Indicadora */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    👑 <strong style={{ color: 'var(--adm-accent)' }}>{lead.debutanteName}</strong>
                  </div>

                  {/* Bottom Row: Última mensagem / nota preview */}
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--adm-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    opacity: 0.8,
                  }}>
                    {lastActivity ? lastActivity.title : (lead.notes || 'Aguardando primeiro contato...')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 2 — FICHA DO LEAD (REMODELADA COM 5 SEÇÕES TEMÁTICAS)            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!isMiddleCollapsed && (
        <div style={{
          borderRight: '1px solid var(--adm-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--adm-bg-card)',
          height: '100%',
        }}>
          {!currentLead ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--adm-text-muted)' }}>
              <Sparkles size={36} color="var(--adm-text-muted)" style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>Selecione um lead no Inbox</div>
            </div>
          ) : (
            <AdminLeadInspector
              lead={currentLead}
              onStageChange={handleStageChange}
              onToggleCollapse={() => setIsMiddleCollapsed(true)}
              isCollapsed={false}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 3 — FEED COM TOP TABS [WHATSAPP] [HISTÓRICO] [TAREFAS]           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--adm-bg-app)',
        height: '100%',
        position: 'relative',
      }}>
        {!currentLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--adm-text-muted)' }}>
            <MessageSquare size={36} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.8rem' }}>Selecione um lead para ver o histórico e tarefas</div>
          </div>
        ) : (
          <>
            {/* Top Tabs Header: [WhatsApp] [Histórico & Notas] [Tarefas] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMiddleCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsMiddleCollapsed(false)}
                    title="Expandir Ficha do Lead"
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-accent)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Ficha</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'whatsapp', label: 'WhatsApp (Sigiloso)' },
                    { id: 'history', label: 'Histórico & Notas' },
                    { id: 'tasks', label: `Tarefas (${leadTasks.length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTabCol3(tab.id as any)}
                      style={{
                        background: activeTabCol3 === tab.id ? 'var(--adm-accent-bg)' : 'transparent',
                        border: activeTabCol3 === tab.id ? '1px solid var(--adm-accent)' : '1px solid transparent',
                        color: activeTabCol3 === tab.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                        borderRadius: '8px',
                        padding: '5px 12px',
                        fontSize: '0.76rem',
                        fontWeight: activeTabCol3 === tab.id ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                {currentLead.phone}
              </div>
            </div>

            {/* Content Body based on Active Top Tab */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
              
              {/* ── TAB 1: WHATSAPP SIGILOSO COM BLUR & CARD CENTRAL ─────────── */}
              {activeTabCol3 === 'whatsapp' && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  minHeight: '340px',
                }}>
                  {/* Fundo Embaçado Simulando Mensagens */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    filter: 'blur(6px)',
                    opacity: 0.35,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    pointerEvents: 'none',
                  }}>
                    <div style={{ alignSelf: 'flex-start', background: '#2563EB', color: '#FFF', padding: '10px 14px', borderRadius: '12px', maxWidth: '70%' }}>
                      Olá, temos novidades sobre sua festa de 15 Anos!
                    </div>
                    <div style={{ alignSelf: 'flex-end', background: '#22C55E', color: '#FFF', padding: '10px 14px', borderRadius: '12px', maxWidth: '70%' }}>
                      Perfeito, estamos muito animados para agendar a degustação!
                    </div>
                    <div style={{ alignSelf: 'flex-start', background: '#2563EB', color: '#FFF', padding: '10px 14px', borderRadius: '12px', maxWidth: '70%' }}>
                      Ótimo! Seguem os horários disponíveis neste sábado.
                    </div>
                  </div>

                  {/* Card Central Glassmorphism Luxo */}
                  <div style={{
                    position: 'relative',
                    zIndex: 10,
                    background: 'rgba(11, 9, 14, 0.92)',
                    border: '1.5px solid rgba(212, 175, 55, 0.4)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    padding: '32px 28px',
                    textAlign: 'center',
                    maxWidth: '380px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'rgba(37, 211, 102, 0.15)',
                      border: '1px solid rgba(37, 211, 102, 0.4)',
                      color: '#25D366',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Lock size={26} />
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                      WhatsApp Integrado
                    </h4>

                    <p style={{ fontSize: '0.82rem', color: '#A0988A', margin: 0, lineHeight: 1.5 }}>
                      Funcionalidade sendo desenvolvida. Aguarde.
                    </p>

                    <div style={{ fontSize: '0.7rem', color: 'var(--adm-accent)', fontWeight: 700, background: 'rgba(212,175,55,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                      ⚡ Conexão segura em implantação
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: HISTÓRICO & NOTAS (COM AUDITORIA E FOTOS DA EQUIPE) ── */}
              {activeTabCol3 === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="var(--adm-accent)" />
                    <span>Linha do Tempo & Auditoria Comercial</span>
                  </div>

                  {leadActivities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: 'var(--adm-text-muted)', fontSize: '0.78rem', border: '1px dashed var(--adm-border)', borderRadius: '10px' }}>
                      Nenhuma atividade registrada ainda para este lead.
                    </div>
                  ) : (
                    leadActivities.map((act) => {
                      const collabMatch = act.authorId ? collaborators.find(c => c.id === act.authorId) : undefined;
                      const avatar = act.authorAvatarUrl || collabMatch?.avatarUrl;
                      const authorName = act.authorName || collabMatch?.name || 'Equipe Comercial';

                      return (
                        <div
                          key={act.id}
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* Avatar com Foto da Equipe */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1E1B2E 0%, #0D0B14 100%)',
                            border: '1.5px solid rgba(212, 175, 55, 0.4)',
                            color: '#D4AF37',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}>
                            {avatar ? (
                              <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              authorName.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <strong style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>
                                {authorName}
                              </strong>
                              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                {formatDateTime(act.timestamp)}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: 'var(--adm-accent)', fontWeight: 700, marginBottom: act.text ? '4px' : '0' }}>
                              {act.title}
                            </div>

                            {act.text && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', lineHeight: 1.4, background: 'var(--adm-bg-input)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--adm-border)' }}>
                                {act.text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── TAB 3: TAREFAS VINCULADAS AO SUPABASE ────────────────────── */}
              {activeTabCol3 === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                      Tarefas do Lead ({leadTasks.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTaskModalOpen(true)}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      + Nova Tarefa
                    </button>
                  </div>

                  {leadTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--adm-text-muted)', fontSize: '0.78rem', border: '1px dashed var(--adm-border)', borderRadius: '10px' }}>
                      Nenhuma tarefa pendente para este lead.
                    </div>
                  ) : (
                    leadTasks.map(t => (
                      <div
                        key={t.id}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => completeLeadTask(currentLead.id, t.id)}
                            style={{
                              background: t.status === 'completed' ? '#10B981' : 'transparent',
                              border: `1.5px solid ${t.status === 'completed' ? '#10B981' : 'var(--adm-border)'}`,
                              borderRadius: '4px',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            {t.status === 'completed' && <CheckCircle2 size={12} color="#FFF" />}
                          </button>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                              {t.description}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                              Vencimento: {t.dueDate} {t.dueTime ? `às ${t.dueTime}` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setTaskToDelete({ leadId: currentLead.id, taskId: t.id, title: t.description })}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                        >
                          <span style={{ fontSize: '0.72rem' }}>Excluir</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Caixa de Digitação Inferior (Modo Nota Interna Automático) */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              flexShrink: 0,
            }}>
              <form onSubmit={handleSendInternalNote} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Escrever uma nota interna ou registro de atendimento..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  style={{
                    background: noteText.trim() ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                    color: noteText.trim() ? '#000' : 'var(--adm-text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: noteText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Salvar Nota</span>
                  <Send size={12} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Modal Fechamento de Venda */}
      {isCloseDealModalOpen && currentLead && (
        <CloseDealValueModal
          isOpen={isCloseDealModalOpen}
          lead={currentLead}
          onClose={() => setIsCloseDealModalOpen(false)}
          onConfirmSale={(leadId: string, dealValue: number, packageSold: string, contractDate: string) => {
            handleConfirmSale(leadId, dealValue, packageSold, contractDate);
            setIsCloseDealModalOpen(false);
          }}
        />
      )}

      {/* Modal Nova Tarefa */}
      {isTaskModalOpen && currentLead && (
        <AdminTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          presetLeadId={currentLead.id}
        />
      )}

      {/* Modal Confirmar Exclusão de Tarefa */}
      {taskToDelete && (
        <AdminConfirmModal
          isOpen={true}
          title="Excluir Tarefa"
          message={`Tem certeza que deseja excluir a tarefa "${taskToDelete.title}"?`}
          confirmText="Sim, Excluir"
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
