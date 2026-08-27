import React, { useState, useEffect } from 'react';
import { 
  Search, Send, MessageSquare, 
  Clock, Sparkles, 
  Inbox, Calendar, DollarSign, XCircle,
  Plus, Trash2, Check, AlertTriangle,
  ClipboardList, AlignLeft
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { CloseDealValueModal } from './CloseDealValueModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminTaskModal } from './AdminTaskModal';
import { AdminLeadInspector } from './AdminLeadInspector';
import type { Lead, CrmStage, LeadTask } from '../../types/admin';

interface AdminCrmWorkspaceViewProps {
  initialLeadId?: string;
  onLeadOpened?: () => void;
}

const STAGE_CONFIGS: Record<CrmStage, { label: string; shortLabel: string; color: string; bg: string; border: string }> = {
  new_lead:          { label: 'Novo Lead',                    shortLabel: 'Novo',       color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.35)' },
  in_analysis:       { label: 'Em Análise',                   shortLabel: 'Análise',    color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.35)' },
  meeting_scheduled: { label: 'Reunião / Degustação',         shortLabel: 'Reunião',    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.35)' },
  contract_signed:   { label: 'Contrato Fechado (Venda VIP)', shortLabel: 'Fechado',    color: '#FFD700', bg: 'rgba(255,215,0,0.15)',    border: 'rgba(255,215,0,0.45)' },
  lost:              { label: 'Perdido / Recusado',           shortLabel: 'Perdido',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.35)' },
};

const STAGE_LIST: CrmStage[] = ['new_lead', 'in_analysis', 'meeting_scheduled', 'contract_signed', 'lost'];

const renderStageIcon = (stage: CrmStage, size = 14) => {
  switch (stage) {
    case 'new_lead':          return <Inbox size={size} color="#60A5FA" />;
    case 'in_analysis':       return <Clock size={size} color="#FBBF24" />;
    case 'meeting_scheduled': return <Calendar size={size} color="#A78BFA" />;
    case 'contract_signed':   return <DollarSign size={size} color="#FFD700" />;
    case 'lost':              return <XCircle size={size} color="#EF4444" />;
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const formatDateShort = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  } catch { return dateStr; }
};

const getTaskStatus = (task: LeadTask) => {
  if (task.status === 'completed') return { color: '#34D399', bg: 'rgba(52,211,153,0.1)', label: 'Concluída' };
  const now = new Date();
  const due = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
  if (due < now) return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Atrasada' };
  const diffMs = due.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 24) return { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', label: 'Urgente' };
  return { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', label: 'Pendente' };
};

const AvatarCircle: React.FC<{ src?: string; name: string; size?: number; color?: string }> = ({ src, name, size = 30, color = '#D4AF37' }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `1.5px solid ${color}`, overflow: 'hidden', flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.38, fontWeight: 800, color }}>{initials}</span>
      )}
    </div>
  );
};

export const AdminCrmWorkspaceView: React.FC<AdminCrmWorkspaceViewProps> = ({
  initialLeadId,
  onLeadOpened,
}) => {
  const { 
    leads, collaborators, currentUser, activeVenueId,
    updateLeadStage, closeLeadSaleWithValue, addLeadNote,
    claimLeadIfUnassigned, assignLeadSdr,
    completeLeadTask, deleteLeadTask,
  } = useAdminState();

  // ── Column 1 filters ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | CrmStage>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | 'mine'>('all');

  // ── Active lead ────────────────────────────────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  
  // ── Column 3 state ─────────────────────────────────────────────────────────
  const [noteInput, setNoteInput] = useState('');
  const [activeCol3Tab, setActiveCol3Tab] = useState<'history' | 'tasks'>('history');
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
    // For SDR/Closer: only see their own leads
    const userRole = currentUser?.role;
    let matchesRole = true;
    if (userRole === 'sdr' && currentUser?.id) {
      matchesRole = l.sdrId === currentUser.id || (l.participants || []).some(p => p.collaboratorId === currentUser!.id);
    } else if (userRole === 'closer' && currentUser?.id) {
      matchesRole = l.closerId === currentUser.id || (l.participants || []).some(p => p.collaboratorId === currentUser!.id);
    }
    const matchesStage = stageFilter === 'all' || l.stage === stageFilter;
    let matchesAssignee = true;
    if (assigneeFilter === 'unassigned') {
      matchesAssignee = !l.sdrId && !l.assignedTo;
    } else if (assigneeFilter === 'mine') {
      matchesAssignee = l.sdrId === currentUser?.id || l.closerId === currentUser?.id;
    }
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.debutanteName.toLowerCase().includes(search.toLowerCase());
    return matchesVenue && matchesRole && matchesStage && matchesAssignee && matchesSearch;
  });

  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads.length]);

  const currentLead = leads.find(l => l.id === selectedLeadId) || filteredLeads[0] || null;

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    // Auto-claim if unassigned and current user is SDR
    if (!lead.sdrId && (currentUser?.role === 'sdr' || currentUser?.role === 'crm')) {
      claimLeadIfUnassigned(lead.id);
    }
  };

  const handleStageChange = (newStage: CrmStage) => {
    if (!currentLead) return;

    // Auto-claim SDR if unassigned when progressing past new_lead
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

  const handleAddNote = () => {
    if (!currentLead || !noteInput.trim()) return;
    addLeadNote(currentLead.id, noteInput.trim());
    setNoteInput('');
  };

  const handleWhatsApp = (lead: Lead) => {
    const clean = lead.phone.replace(/\D/g, '');
    const txt = `Olá, ${lead.name}! Tudo bem?\nRecebemos sua indicação através da debutante ${lead.debutanteName} para conhecer os pacotes especiais de 15 Anos da Bonomo Festas.\nPodemos agendar uma visita ou degustação?`;
    window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(txt)}`, '_blank');
  };

  const pendingTasks = (currentLead?.tasks || []).filter(t => t.status !== 'completed');
  const completedTasks = (currentLead?.tasks || []).filter(t => t.status === 'completed');

  // ── INPUT STYLE HELPER (uses CSS vars) ─────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)',
    borderRadius: '8px', padding: '7px 10px', color: 'var(--adm-text-title)',
    fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '310px 380px 1fr',
      gap: '0px',
      height: '100%',
      minHeight: 0,
      flex: 1,
      background: 'var(--adm-bg-card)',
      border: '1px solid var(--adm-border)',
      borderRadius: '20px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 1 — CAIXA DE ENTRADA                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--adm-bg-sidebar)',
        borderRight: '1px solid var(--adm-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        height: '100%',
      }}>
        {/* Inbox Header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--adm-border)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, background: 'var(--adm-bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Inbox size={16} color="#D4AF37" />
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Caixa de Entrada</span>
            </div>
            <span style={{ background: 'var(--adm-accent-bg)', color: '#D4AF37', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(212,175,55,0.3)' }}>
              {filteredLeads.length}
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="var(--adm-text-muted)" style={{ position: 'absolute', left: 9, top: 9 }} />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '28px', fontSize: '0.75rem' }}
            />
          </div>

          {/* Filters row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as any)} style={{ ...inputStyle, fontSize: '0.72rem' }}>
              <option value="all">Todas as etapas</option>
              {STAGE_LIST.map(s => <option key={s} value={s}>{STAGE_CONFIGS[s].shortLabel}</option>)}
            </select>
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as any)} style={{ ...inputStyle, fontSize: '0.72rem' }}>
              <option value="all">Todos</option>
              <option value="unassigned">Sem SDR</option>
              <option value="mine">Meus Leads</option>
            </select>
          </div>
        </div>

        {/* Leads list (Independent Scroll) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
              <Inbox size={32} color="var(--adm-text-muted)" style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>Nenhum lead encontrado</div>
              <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>Tente ajustar os filtros</div>
            </div>
          ) : (
            filteredLeads.map(lead => {
              const isSelected = lead.id === currentLead?.id;
              const cfg = STAGE_CONFIGS[lead.stage];
              const noSdr = !lead.sdrId;
              const pendingCount = (lead.tasks || []).filter(t => t.status !== 'completed').length;
              const sdr = lead.sdrId ? collaborators.find(c => c.id === lead.sdrId) : null;
              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  style={{
                    background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                    border: isSelected ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid transparent',
                    borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                    marginBottom: '4px', transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-card)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {lead.name}
                    </span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '1px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      {renderStageIcon(lead.stage, 10)}
                      {cfg.shortLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                    {lead.phone} · {lead.age}a · {lead.group}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    {noSdr ? (
                      <span style={{ fontSize: '0.62rem', color: '#FBBF24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={10} color="#FBBF24" /> Sem SDR
                      </span>
                    ) : sdr ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AvatarCircle src={sdr.avatarUrl} name={sdr.name} size={18} color="#8B5CF6" />
                        <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>{sdr.name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>{lead.sdrName}</span>
                    )}
                    {pendingCount > 0 && (
                      <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '1px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)' }}>
                        {pendingCount} tarefa{pendingCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COLUNA 2 — INSPEÇÃO & PERFIL DETALHADO DO LEAD                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRight: '1px solid var(--adm-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--adm-bg-app)',
        height: '100%',
      }}>
        {!currentLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--adm-text-muted)' }}>
            <Sparkles size={40} color="var(--adm-text-muted)" style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Selecione um lead para começar</div>
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
      {/* COLUNA 3 — HISTÓRICO & TAREFAS                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--adm-bg-app)',
      }}>
        {!currentLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--adm-text-muted)' }}>
            <MessageSquare size={36} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.8rem' }}>Selecione um lead</div>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div style={{ borderBottom: '1px solid var(--adm-border)', padding: '0 20px', display: 'flex', gap: '0' }}>
              {([
                { key: 'history', label: 'Histórico', icon: <AlignLeft size={14} /> },
                { key: 'tasks', label: `Tarefas${pendingTasks.length > 0 ? ` (${pendingTasks.length})` : ''}`, icon: <ClipboardList size={14} /> },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveCol3Tab(tab.key)} style={{
                  background: 'transparent', border: 'none',
                  borderBottom: activeCol3Tab === tab.key ? '2px solid #D4AF37' : '2px solid transparent',
                  color: activeCol3Tab === tab.key ? '#D4AF37' : 'var(--adm-text-muted)',
                  padding: '12px 16px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 0.12s ease', marginBottom: '-1px',
                }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
            {activeCol3Tab === 'history' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Note Input */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--adm-border)', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Registrar observação ou atualização..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={handleAddNote} disabled={!noteInput.trim()} style={{
                    background: noteInput.trim() ? 'linear-gradient(135deg, #D4AF37, #AA7C11)' : 'var(--adm-bg-card)',
                    border: 'none', borderRadius: '8px', padding: '7px 14px', color: noteInput.trim() ? '#000' : 'var(--adm-text-muted)',
                    cursor: noteInput.trim() ? 'pointer' : 'default', fontWeight: 800, fontSize: '0.78rem',
                    display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    <Send size={13} /> Enviar
                  </button>
                </div>

                {/* Quick tags & Task Shortcut */}
                <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--adm-border)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    onClick={() => setIsTaskModalOpen(true)}
                    style={{
                      background: 'var(--adm-accent-bg)', border: '1px solid var(--adm-accent)', color: 'var(--adm-accent)',
                      borderRadius: '6px', padding: '3px 9px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <Plus size={11} /> Agendar Tarefa / Ligação
                  </button>
                  {['Ligou, não atendeu', 'WhatsApp enviado', 'Aguardando retorno', 'Interesse confirmado', 'Visita agendada'].map(tag => (
                    <button key={tag} onClick={() => addLeadNote(currentLead.id, tag)} style={{
                      background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)',
                      borderRadius: '6px', padding: '3px 8px', fontSize: '0.66rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(currentLead.activities || []).map((activity, idx) => {
                    const typeColors: Record<string, string> = {
                      creation: '#60A5FA', status_change: '#A78BFA', note: '#34D399',
                      deal_closed: '#FFD700', assignment: '#F97316', task_created: '#8B5CF6',
                      task_completed: '#34D399', contact: '#60A5FA',
                    };
                    const color = typeColors[activity.type] || '#888';
                    const collab = activity.authorId ? collaborators.find(c => c.id === activity.authorId) : null;
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          {collab ? (
                            <AvatarCircle src={collab.avatarUrl || activity.authorAvatarUrl} name={activity.authorName} size={28} color={color} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                            </div>
                          )}
                          {idx < (currentLead.activities || []).length - 1 && (
                            <div style={{ width: '1px', flex: 1, background: 'var(--adm-border)', marginTop: '4px', minHeight: '16px' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingBottom: idx < (currentLead.activities || []).length - 1 ? '4px' : '0' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', lineHeight: 1.4 }}>
                            {activity.title}
                          </div>
                          {activity.text && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-body)', marginTop: '3px', lineHeight: 1.5 }}>
                              {activity.text}
                            </div>
                          )}
                          <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', marginTop: '4px', display: 'flex', gap: '6px' }}>
                            <span style={{ color, fontWeight: 600 }}>{activity.authorName}</span>
                            <span>·</span>
                            <span>{formatDate(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!currentLead.activities || currentLead.activities.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                      Nenhuma atividade registrada ainda.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TASKS TAB ──────────────────────────────────────────────────── */}
            {activeCol3Tab === 'tasks' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Add Task Button */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--adm-border)' }}>
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="adm-btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(212, 175, 55, 0.25)',
                    }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Nova Tarefa</span>
                  </button>
                </div>

                {/* Task List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--adm-text-muted)' }}>
                      <ClipboardList size={36} style={{ marginBottom: '10px', opacity: 0.3 }} />
                      <div style={{ fontSize: '0.82rem' }}>Nenhuma tarefa criada</div>
                    </div>
                  ) : (
                    <>
                      {pendingTasks.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pendentes ({pendingTasks.length})</div>
                          {pendingTasks.map(task => {
                            const st = getTaskStatus(task);
                            const assignee = collaborators.find(c => c.id === task.assignedToId);
                            return (
                              <div key={task.id} style={{ background: 'var(--adm-bg-card)', border: `1px solid ${st.color}40`, borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <button onClick={() => completeLeadTask(currentLead.id, task.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${st.color}`, background: 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, opacity: 0.5 }} />
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', marginBottom: '3px' }}>{task.description}</div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ background: st.bg, color: st.color, padding: '1px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800 }}>
                                      {st.label}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)' }}>
                                      {formatDateShort(task.dueDate)}{task.dueTime ? ' às ' + task.dueTime : ''}
                                    </span>
                                    {assignee && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AvatarCircle src={assignee.avatarUrl} name={assignee.name} size={16} color="#D4AF37" />
                                        <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>{assignee.name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setTaskToDelete({ leadId: currentLead.id, taskId: task.id, title: task.description })} 
                                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', fontFamily: "'Inter', sans-serif" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
                                  title="Excluir Tarefa"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {completedTasks.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '10px' }}>Concluídas ({completedTasks.length})</div>
                          {completedTasks.map(task => {
                            const assignee = collaborators.find(c => c.id === task.assignedToId);
                            return (
                              <div key={task.id} style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', opacity: 0.6 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #34D399', background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Check size={11} color="#34D399" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', textDecoration: 'line-through' }}>{task.description}</div>
                                  {assignee && (
                                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <AvatarCircle src={assignee.avatarUrl} name={assignee.name} size={14} color="#888" />
                                      {assignee.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Close Deal Modal */}
      {currentLead && (
        <CloseDealValueModal
          isOpen={isCloseDealModalOpen}
          onClose={() => setIsCloseDealModalOpen(false)}
          lead={currentLead}
          onConfirmSale={(leadId: string, dealValue: number, packageSold: string, contractDate: string) => {
            handleConfirmSale(leadId, dealValue, packageSold, contractDate);
            setIsCloseDealModalOpen(false);
          }}
        />
      )}

      {/* Task Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteLeadTask(taskToDelete.leadId, taskToDelete.taskId);
            setTaskToDelete(null);
          }
        }}
        title="Excluir Tarefa"
        itemName={taskToDelete?.title}
        message={taskToDelete ? `Tem certeza que deseja apagar a tarefa "${taskToDelete.title}"? Esta ação não poderá ser desfeita.` : undefined}
      />

      {/* Create Task Modal for Lead */}
      {currentLead && (
        <AdminTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          presetLeadId={currentLead.id}
          presetDebutanteId={currentLead.debutanteId}
        />
      )}
    </div>
  );
};
