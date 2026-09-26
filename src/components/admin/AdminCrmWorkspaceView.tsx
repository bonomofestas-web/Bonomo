import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, MessageSquare, Sparkles, 
  ChevronRight, CheckCircle2, Lock,
  FileText, Plus, CheckSquare, Clock, Trash2, Edit3
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { CloseDealValueModal } from './CloseDealValueModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';
import { AdminLeadInspector } from './AdminLeadInspector';
import { formatPhone } from '../../utils/phoneFormatter';
import { sortLeadsByCriteria, getLeadPendingWaitingTime, getLeadWaitTimeSla } from '../../utils/leadSorting';
import type { Lead, CrmStage, AdminTask, TaskStatus } from '../../types/admin';

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
  } catch {
    return 'Data inválida';
  }
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
    leads, venues, collaborators, currentUser, activeVenueId,
    updateLeadStage, closeLeadSaleWithValue, addLeadNote,
    assignLeadSdr,
    tasks, addTask, updateTask, deleteTask, completeTaskWithFeedback
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

  // ── Task detail modal & completion state ───────────────────────────────────
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);
  const [completingTask, setCompletingTask] = useState<AdminTask | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      setIsMiddleCollapsed(false);
      if (onLeadOpened) onLeadOpened();
    }
  }, [initialLeadId]);

  const collabIdSet = useMemo(() => new Set((collaborators || []).map(c => c.id)), [collaborators]);

  // Filtered leads for Column 1 ordenados prioritariamente por Tempo de Espera
  const filteredLeads = useMemo(() => {
    const matching = leads.filter(l => {
      const matchesVenue = !activeVenueId || l.venueId === activeVenueId;
      
      if (filterTab === 'all') {
        // Aba "Abertas": leads sem responsável/SDR atribuído
        const hasSdr = Boolean(l.sdrId || (l.assignedTo && l.assignedTo.trim() !== '' && l.assignedTo !== 'Sem responsável' && l.assignedTo !== 'Não atribuído'));
        if (hasSdr) return false;
      }

      if (filterTab === 'mine') {
        // Aba "Minhas": leads atribuídos ao usuário logado
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

    return sortLeadsByCriteria(matching, 'waiting_time', collabIdSet);
  }, [leads, activeVenueId, filterTab, currentUser, searchQuery, collabIdSet]);

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

  const handleSendInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead || !noteText.trim()) return;
    addLeadNote(currentLead.id, noteText.trim());
    setNoteText('');
  };

  const leadTasks = useMemo(() => {
    if (!currentLead) return [];
    return tasks.filter(t => 
      t.leadId === currentLead.id || 
      t.customProperties?.leadId === currentLead.id || 
      (t as any).commercialLeadId === currentLead.id ||
      (currentLead.debutanteId && (t.debutanteId === currentLead.debutanteId || t.customProperties?.clientId === currentLead.debutanteId)) ||
      (currentLead.phone && t.customProperties?.phone === currentLead.phone) ||
      (currentLead.tasks && currentLead.tasks.some(lt => lt.id === t.id))
    );
  }, [tasks, currentLead?.id, currentLead?.debutanteId, currentLead?.phone, currentLead?.tasks]);

  const handleTaskStageChange = (task: AdminTask, newStatus: TaskStatus) => {
    if (newStatus === 'completed') {
      setCompletingTask(task);
    } else {
      updateTask(task.id, {
        status: newStatus,
        customStatusId: newStatus === 'in_progress' ? 'st_in_progress' : 'st_todo',
        completedAt: undefined,
      });
    }
  };

  const handleQuickCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead || !quickTaskTitle.trim()) return;

    addTask({
      databaseId: 'db_followup',
      title: quickTaskTitle.trim(),
      description: '',
      content: '',
      dueDate: quickTaskDueDate.trim() || new Date().toISOString().split('T')[0],
      dueTime: '14:00',
      status: 'todo',
      customStatusId: 'st_todo',
      priority: 'medium',
      type: 'followup',
      customType: 'Follow-up WhatsApp',
      createdById: currentUser?.id || 'system',
      createdByName: currentUser?.name || 'Comercial',
      assignedToIds: currentUser?.id ? [currentUser.id] : [],
      leadId: currentLead.id,
      leadName: currentLead.name,
      debutanteId: currentLead.debutanteId || undefined,
      debutanteName: currentLead.debutanteName || undefined,
      venueId: currentLead.venueId,
      customProperties: {
        leadId: currentLead.id,
        leadName: currentLead.name,
        venueId: currentLead.venueId,
        debutanteId: currentLead.debutanteId || undefined,
        clientId: currentLead.debutanteId || undefined,
      },
    });

    setQuickTaskTitle('');
    setQuickTaskDueDate('');
  };

  const leadActivities = currentLead?.activities || [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMiddleCollapsed ? '320px 1fr' : '320px 380px 1fr',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'var(--adm-bg-app)',
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 1 — LISTA DE CONVERSAS / LEADS (INBOX)                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRight: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-card)',
        overflow: 'hidden',
        height: '100%',
      }}>
        {/* Header do Inbox: Badge de Contagem + Abas [Abertas] [Minhas] */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              const lastMessageActivity = (lead.activities || [])
                .slice()
                .reverse()
                .find(a => a.type === 'contact' && (a.text || a.mediaUrl));
              const lastActivity = lastMessageActivity || lead.activities?.[lead.activities.length - 1];
              const pendingWaitMs = getLeadPendingWaitingTime(lead, collabIdSet);
              const sla = getLeadWaitTimeSla(pendingWaitMs);
              const hasSlaAlert = sla.level !== 'none' && sla.level !== 'recent';

              const itemBg = hasSlaAlert
                ? (isSelected ? (sla.level === 'red' ? 'rgba(239, 68, 68, 0.12)' : sla.level === 'orange' ? 'rgba(249, 115, 22, 0.10)' : 'rgba(234, 179, 8, 0.08)') : sla.cardBg)
                : (isSelected ? 'var(--adm-accent-bg)' : 'transparent');

              const itemBorderLeft = hasSlaAlert
                ? (isSelected ? `4px solid ${sla.color}` : `3px solid ${sla.color}`)
                : (isSelected ? '3px solid var(--adm-accent)' : '3px solid transparent');

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  style={{
                    padding: '11px 14px',
                    borderBottom: '1px solid var(--adm-border)',
                    background: itemBg,
                    borderLeft: itemBorderLeft,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = hasSlaAlert ? (sla.level === 'red' ? 'rgba(239, 68, 68, 0.09)' : sla.level === 'orange' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(234, 179, 8, 0.06)') : 'var(--adm-bg-input)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = itemBg;
                    }
                  }}
                >
                  {/* Top Row: Avatar + Indicator + Name + Tag + Time */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {/* Avatar do Lead (sempre mostra a inicial do Lead) */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1E1B2E 0%, #0D0B14 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          color: '#D4AF37',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          overflow: 'hidden',
                        }}>
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        {sdrAvatar ? (
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '13px',
                            height: '13px',
                            borderRadius: '50%',
                            border: '1.5px solid var(--adm-bg-card)',
                            overflow: 'hidden',
                          }}>
                            <img src={sdrAvatar} alt={sdr?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
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
                        )}
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
                      {pendingWaitMs > 0 && (
                        <span
                          title={`Aguardando resposta da equipe há ${sla.formattedTime} (${sla.label})`}
                          style={{
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: sla.bg,
                            color: sla.color,
                            border: `1px solid ${sla.border}`,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Clock size={9} color={sla.color} strokeWidth={2.5} />
                          <span>{sla.formattedTime}</span>
                        </span>
                      )}
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

                  {/* Middle Row: Debutante Indicadora & Unidade */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      👑 <strong style={{ color: 'var(--adm-accent)' }}>{lead.debutanteName}</strong>
                    </div>
                    {(lead.venueName || lead.venueId) && (
                      <span style={{
                        fontSize: '0.62rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {lead.venueName || venues.find(v => v.id === lead.venueId)?.name || 'Unidade'}
                      </span>
                    )}
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
                    {lastMessageActivity?.text || lastActivity?.text || lastActivity?.title || (lead.notes || 'Aguardando primeiro contato...')}
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
                  {(() => {
                    const notesCount = (currentLead?.activities || []).filter(a => 
                      a.type === 'note' || 
                      a.type === 'status_change' || 
                      a.type === 'assignment' || 
                      a.type === 'creation' || 
                      a.type === 'deal_closed' || 
                      a.type === 'validation' ||
                      a.type === 'task_created' ||
                      a.type === 'task_completed'
                    ).length;
                    return [
                      { id: 'whatsapp', label: 'WhatsApp (Sigiloso)' },
                      { id: 'history', label: `Histórico & Notas (${notesCount})` },
                      { id: 'tasks', label: `Tarefas (${leadTasks.length})` },
                    ];
                  })().map(tab => (
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
                {formatPhone(currentLead.phone)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={16} color="var(--adm-accent)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        Tarefas & Follow-ups ({leadTasks.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setIsTaskModalOpen(true);
                      }}
                      style={{
                        background: 'var(--adm-accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      <span>Nova Tarefa</span>
                    </button>
                  </div>

                  {leadTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--adm-text-muted)', fontSize: '0.78rem', border: '1px dashed var(--adm-border)', borderRadius: '10px' }}>
                      Nenhuma tarefa ou follow-up cadastrado para este lead.
                    </div>
                  ) : (
                    leadTasks.map(t => {
                      const isCompleted = t.status === 'completed';
                      return (
                        <div
                          key={t.id}
                          style={{
                            background: 'var(--adm-bg-card)',
                            border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--adm-border)'}`,
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isCompleted) {
                                    handleTaskStageChange(t, 'todo');
                                  } else {
                                    setCompletingTask(t);
                                  }
                                }}
                                title={isCompleted ? 'Marcar como pendente' : 'Finalizar tarefa (Registrar Feedback)'}
                                style={{
                                  background: isCompleted ? '#10B981' : 'transparent',
                                  border: `1.5px solid ${isCompleted ? '#10B981' : 'var(--adm-border)'}`,
                                  borderRadius: '5px',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isCompleted && <CheckCircle2 size={13} color="#FFF" />}
                              </button>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: isCompleted ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                  wordBreak: 'break-word',
                                }}>
                                  {t.title || t.description || t.content || 'Tarefa sem título'}
                                </div>
                                {(t.dueDate || t.customType || t.type) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    {t.dueDate && (
                                      <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <Clock size={10} />
                                        {t.dueDate} {t.dueTime ? `às ${t.dueTime}` : ''}
                                      </span>
                                    )}
                                    <span style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(20, 169, 215, 0.12)',
                                      color: isCompleted ? '#10B981' : 'var(--adm-accent)',
                                    }}>
                                      {t.customType || (t.type === 'followup' ? 'Follow-up' : 'Tarefa')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTask(t);
                                  setIsTaskModalOpen(true);
                                }}
                                title="Editar detalhes completos da tarefa"
                                style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setTaskToDelete(t)}
                                title="Excluir tarefa"
                                style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Seletor de Etapas da Tarefa: Não Iniciada | Em Execução | Finalizada */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'var(--adm-bg-input)',
                              padding: '2px 3px',
                              borderRadius: '7px',
                              border: '1px solid var(--adm-border)',
                            }}>
                              <button
                                type="button"
                                onClick={() => handleTaskStageChange(t, 'todo')}
                                style={{
                                  background: (t.status === 'todo' || !t.status) ? '#64748B' : 'transparent',
                                  color: (t.status === 'todo' || !t.status) ? '#FFFFFF' : 'var(--adm-text-muted)',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '2px 7px',
                                  fontSize: '0.67rem',
                                  fontWeight: (t.status === 'todo' || !t.status) ? 800 : 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease',
                                }}
                              >
                                Não Iniciada
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTaskStageChange(t, 'in_progress')}
                                style={{
                                  background: t.status === 'in_progress' ? '#2563EB' : 'transparent',
                                  color: t.status === 'in_progress' ? '#FFFFFF' : 'var(--adm-text-muted)',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '2px 7px',
                                  fontSize: '0.67rem',
                                  fontWeight: t.status === 'in_progress' ? 800 : 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease',
                                }}
                              >
                                Em Execução
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTaskStageChange(t, 'completed')}
                                style={{
                                  background: t.status === 'completed' ? '#10B981' : 'transparent',
                                  color: t.status === 'completed' ? '#FFFFFF' : 'var(--adm-text-muted)',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '2px 7px',
                                  fontSize: '0.67rem',
                                  fontWeight: t.status === 'completed' ? 800 : 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                {t.status === 'completed' && <CheckCircle2 size={10} strokeWidth={2.5} />}
                                <span>Finalizada</span>
                              </button>
                            </div>

                            {t.resolution && (
                              <span style={{ fontSize: '0.66rem', color: '#10B981', fontWeight: 600 }}>
                                ✓ Feedback registrado
                              </span>
                            )}
                          </div>

                          {/* Campo de Resolução / Resultado Inline (auto-save on blur) */}
                          <div style={{ marginTop: '2px' }}>
                            <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                              Resultado / Resolução:
                            </div>
                            <input
                              type="text"
                              defaultValue={t.resolution || t.customProperties?.resolution || ''}
                              placeholder="Digite o resultado/conclusão desta tarefa..."
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (t.resolution || t.customProperties?.resolution || '')) {
                                  updateTask(t.id, {
                                    resolution: val,
                                    customProperties: {
                                      ...(t.customProperties || {}),
                                      resolution: val,
                                    }
                                  });
                                }
                              }}
                              style={{
                                width: '100%',
                                background: 'var(--adm-bg-input)',
                                border: '1px solid var(--adm-border)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '0.74rem',
                                color: 'var(--adm-text-title)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Barra Inferior Dinâmica: Tarefa Rápida se Tab Tarefas; Nota Interna se outras tabs */}
            {activeTabCol3 === 'tasks' ? (
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-card)',
                flexShrink: 0,
              }}>
                <form onSubmit={handleQuickCreateTask} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Adicionar tarefa rápida para este lead... (Pressione Enter)"
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
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
                  <input
                    type="date"
                    value={quickTaskDueDate}
                    onChange={(e) => setQuickTaskDueDate(e.target.value)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.74rem',
                      outline: 'none',
                      width: '130px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!quickTaskTitle.trim()}
                    style={{
                      background: quickTaskTitle.trim() ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                      color: quickTaskTitle.trim() ? '#000' : 'var(--adm-text-muted)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: quickTaskTitle.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={13} />
                    <span>Criar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    title="Abrir formulário completo de tarefa"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Mais Detalhes
                  </button>
                </form>
              </div>
            ) : (
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
            )}
          </>
        )}
      </div>

      {/* Modal Fechamento de Venda */}
      {isCloseDealModalOpen && currentLead && (
        <CloseDealValueModal
          isOpen={isCloseDealModalOpen}
          lead={currentLead}
          onClose={() => setIsCloseDealModalOpen(false)}
          onConfirmSale={(leadId: string, dealValue: number, packageSold: string, closerNotes?: string, extraOptions?: any) => {
            closeLeadSaleWithValue(leadId, dealValue, packageSold, undefined, closerNotes, extraOptions);
            setIsCloseDealModalOpen(false);
          }}
        />
      )}

      {/* Modal Nova / Editar Tarefa com AdminTaskDetailModal */}
      {isTaskModalOpen && currentLead && (
        <AdminTaskDetailModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          initialLeadId={currentLead.id}
        />
      )}

      {/* Modal Confirmar Exclusão de Tarefa */}
      {taskToDelete && (
        <AdminConfirmModal
          isOpen={true}
          title="Excluir Tarefa"
          message={`Tem certeza que deseja excluir a tarefa "${taskToDelete.title || taskToDelete.description || 'Selecionada'}"?`}
          confirmText="Sim, Excluir"
          danger={true}
          onConfirm={() => {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }}
          onClose={() => setTaskToDelete(null)}
        />
      )}

      {/* Modal Finalizar Tarefa com Feedback */}
      {completingTask && (
        <AdminTaskCompletionModal
          isOpen={Boolean(completingTask)}
          taskTitle={completingTask.title || completingTask.description || 'Tarefa'}
          initialFeedback={completingTask.resolution || completingTask.customProperties?.resolution || ''}
          onClose={() => setCompletingTask(null)}
          onConfirm={(feedback) => {
            completeTaskWithFeedback(completingTask.id, feedback);
            setCompletingTask(null);
          }}
        />
      )}

    </div>
  );
};
