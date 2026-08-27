import React, { useState, useEffect } from 'react';
import { 
  Search, Send, MessageSquare, Sparkles, 
  Settings, Mic, ChevronRight,
  ShieldAlert, CheckCircle2
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
}) => {
  const { 
    leads, collaborators, currentUser, activeVenueId,
    updateLeadStage, closeLeadSaleWithValue, addLeadNote,
    claimLeadIfUnassigned, assignLeadSdr,
    deleteLeadTask, completeLeadTask
  } = useAdminState();

  // ── Column 1 search & filters ─────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [isSettingsFilterOpen, setIsSettingsFilterOpen] = useState(false);
  const [selectedCollaboratorFilter, setSelectedCollaboratorFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedTemperatureFilter, setSelectedTemperatureFilter] = useState<string>('all');

  // ── Active lead & Column 2 Collapse state ──────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [isMiddleCollapsed, setIsMiddleCollapsed] = useState<boolean>(!isMiddleInitiallyOpen && !initialLeadId);
  
  // ── Column 3 Top Tabs: 'whatsapp' | 'history' | 'tasks' ────────────────────
  const [activeTabCol3, setActiveTabCol3] = useState<'whatsapp' | 'history' | 'tasks'>('whatsapp');
  const [messageMode, setMessageMode] = useState<'whatsapp' | 'internal_note'>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);

  // ── Task creation state ────────────────────────────────────────────────────
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ leadId: string; taskId: string; title: string } | null>(null);

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      setIsMiddleCollapsed(false);
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

    // Advanced gear filter
    let matchesCollab = true;
    if (selectedCollaboratorFilter !== 'all') {
      if (selectedCollaboratorFilter === 'unassigned') matchesCollab = !l.sdrId;
      else matchesCollab = l.sdrId === selectedCollaboratorFilter || l.closerId === selectedCollaboratorFilter;
    }

    let matchesStage = true;
    if (selectedStageFilter !== 'all') {
      matchesStage = l.stage === selectedStageFilter;
    }

    let matchesTemp = true;
    if (selectedTemperatureFilter !== 'all') {
      matchesTemp = l.temperature === selectedTemperatureFilter;
    }

    const matchesSearch = !search.trim() ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.debutanteName.toLowerCase().includes(search.toLowerCase());

    return matchesVenue && matchesRole && matchesFilterType && matchesCollab && matchesStage && matchesTemp && matchesSearch;
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

  const leadTasks = currentLead?.tasks || [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMiddleCollapsed ? '310px 1fr' : '310px 380px 1fr',
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
      {/* COLUNA 1 — INBOX / CONVERSAS ABERTAS (KOMMO STYLE)                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--adm-bg-card)',
        borderRight: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}>
        {/* Search header with gear filter popover */}
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--adm-border)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Buscar lead ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '6px',
                  padding: '6px 10px 6px 30px',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.78rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsFilterOpen(!isSettingsFilterOpen)}
              title="Filtros avançados da Caixa de Entrada"
              style={{
                background: isSettingsFilterOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                border: `1px solid ${isSettingsFilterOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                color: isSettingsFilterOpen ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={15} />
            </button>
          </div>

          {/* Settings Filter Popover */}
          {isSettingsFilterOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: '12px',
              right: '12px',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
              padding: '12px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Filtros da Caixa</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollaboratorFilter('all');
                    setSelectedStageFilter('all');
                    setSelectedTemperatureFilter('all');
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  Limpar
                </button>
              </div>

              {/* Por Responsável */}
              <div>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Responsável
                </label>
                <select
                  value={selectedCollaboratorFilter}
                  onChange={(e) => setSelectedCollaboratorFilter(e.target.value)}
                  style={{ width: '100%', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.74rem', color: 'var(--adm-text-title)' }}
                >
                  <option value="all">Todos os responsáveis</option>
                  <option value="unassigned">Sem SDR / Não atribuído</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              {/* Por Temperatura */}
              <div>
                <label style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Temperatura
                </label>
                <select
                  value={selectedTemperatureFilter}
                  onChange={(e) => setSelectedTemperatureFilter(e.target.value)}
                  style={{ width: '100%', background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.74rem', color: 'var(--adm-text-title)' }}
                >
                  <option value="all">Todas as temperaturas</option>
                  <option value="hot">🔥 Quente</option>
                  <option value="warm">🟡 Morno</option>
                  <option value="cold">🔵 Frio</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsFilterOpen(false)}
                style={{
                  background: '#2563EB',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Aplicar Filtros
              </button>
            </div>
          )}

          {/* INBOX Title + Filter tabs */}
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
                  background: filterType === 'all' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  border: 'none',
                  color: filterType === 'all' ? '#10B981' : 'var(--adm-text-muted)',
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
                  background: filterType === 'mine' ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  border: 'none',
                  color: filterType === 'mine' ? '#3B82F6' : 'var(--adm-text-muted)',
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
                    borderBottom: '1px solid var(--adm-border)',
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
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        color: isSelected ? '#FFF' : 'var(--adm-text-title)',
                      }}>
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#25D366',
                        border: '2px solid var(--adm-bg-card)',
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
                            background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.15)',
                            color: isSelected ? '#FFF' : '#10B981',
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

                      {/* Row 2: Debutante */}
                      <div style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--adm-accent)', marginTop: '1px', fontWeight: 600 }}>
                        {lead.debutanteName || 'Bonomo Festas'}
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
          borderTop: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-sidebar)',
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
      {/* COLUNA 2 — INSPEÇÃO & LINHAS DO LEAD (COLLAPSIBLE)                      */}
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
              <Sparkles size={40} color="var(--adm-text-muted)" style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Selecione um contato</div>
            </div>
          ) : (
            <AdminLeadInspector
              lead={currentLead}
              onWhatsApp={handleWhatsApp}
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
            <div style={{ fontSize: '0.8rem' }}>Selecione um lead para ver as conversas e tarefas</div>
          </div>
        ) : (
          <>
            {/* Top Tabs Header: [WhatsApp] [Histórico] [Tarefas] */}
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
                    { id: 'whatsapp', label: 'WhatsApp' },
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

              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                {currentLead.phone}
              </div>
            </div>

            {/* Content Body based on Active Top Tab */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
              
              {/* ── TAB 1: WHATSAPP SIMULATED / EMBOSSED PREVIEW ─────────────── */}
              {activeTabCol3 === 'whatsapp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                  {/* Date Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-muted)',
                      padding: '2px 12px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}>
                      Hoje
                    </span>
                  </div>

                  {/* Blurred / Simulated Chat Bubble */}
                  <div style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#25D366',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                      }}>
                        WA
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {currentLead.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                          WhatsApp: {currentLead.phone}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: '#2563EB',
                      color: '#FFF',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    }}>
                      <div style={{ fontSize: '0.66rem', opacity: 0.8, marginBottom: '4px' }}>
                        {formatDateTime(currentLead.createdAt || new Date().toISOString())} • SalesBot
                      </div>
                      Olá, {currentLead.name}! Tudo bem? Recebemos sua indicação através da debutante {currentLead.debutanteName} para conhecer os pacotes especiais de 15 Anos da Bonomo Festas.
                    </div>

                    {/* In-Brief Integration Banner Overlay */}
                    <div style={{
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px dashed var(--adm-accent)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '6px',
                    }}>
                      <ShieldAlert size={18} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-title)', lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--adm-accent)' }}>Em breve:</strong> Integração oficial do WhatsApp direto nesta tela. Para responder agora, clique em <strong style={{ color: '#25D366' }}>Enviar WhatsApp</strong> abaixo.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: HISTÓRICO & NOTAS ─────────────────────────────────── */}
              {activeTabCol3 === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '4px' }}>
                    Linha do Tempo & Anotações Internas
                  </div>

                  {currentLead.notes ? (
                    <div style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--adm-accent)', fontWeight: 700, marginBottom: '4px' }}>
                        Observação do Lead
                      </div>
                      <div style={{ color: 'var(--adm-text-title)', lineHeight: 1.5 }}>
                        {currentLead.notes}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
                      Nenhuma anotação registrada ainda.
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: TAREFAS ───────────────────────────────────────────── */}
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

            {/* Bottom Action Box (Kommo CRM exact interaction box) */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-card)',
              flexShrink: 0,
            }}>
              {/* Mode switch */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
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
                  <span>WhatsApp com {currentLead.name.split(' ')[0]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMessageMode('internal_note')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: messageMode === 'internal_note' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: messageMode === 'internal_note' ? 800 : 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Nota interna
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
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--adm-text-title)',
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
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
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
