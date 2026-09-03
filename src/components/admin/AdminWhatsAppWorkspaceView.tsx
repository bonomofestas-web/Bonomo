import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MessageSquare, Search, SlidersHorizontal, Send, Mic,
  ExternalLink, FileText, ChevronRight, ChevronLeft, Calendar,
  Plus, Check, X, CheckSquare, Clock
} from 'lucide-react';
import { IcpTargetUserIcon } from './IcpTargetUserIcon';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminLeadInspector } from './AdminLeadInspector';
import type { LeadActivity, CrmStage } from '../../types/admin';

interface AdminWhatsAppWorkspaceViewProps {
  initialLeadId?: string;
  activeFunnelId?: string;
  searchQuery?: string;
  onClose?: () => void;
  isEmbeddedInFunnel?: boolean;
}

export const AdminWhatsAppWorkspaceView: React.FC<AdminWhatsAppWorkspaceViewProps> = ({
  initialLeadId,
  activeFunnelId,
  searchQuery = '',
  onClose,
  isEmbeddedInFunnel = false,
}) => {
  const { 
    leads, 
    funnels,
    venues, 
    collaborators, 
    currentUser, 
    activeVenueId, 
    updateLeadData, 
    addLeadNote,
    addLeadTask,
    completeLeadTask,
    updateLeadStage,
    getFeatureStatus,
  } = useAdminState();

  const isWhatsAppDisabled = getFeatureStatus('whatsapp') === 'disabled' && currentUser?.role !== 'dev';
  const isWhatsAppComingSoon = getFeatureStatus('whatsapp') === 'coming_soon' && currentUser?.role !== 'dev';

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Filter Tabs State: 'open' | 'my' | 'all'
  const [quickFilter, setQuickFilter] = useState<'open' | 'my' | 'all'>('open');

  // Side Drawer: Lead Inspector (Ficha do Lead) - Opens on the LEFT of chat area
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Detailed Filters State
  const [filterVenueId, setFilterVenueId] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('all');
  const [filterTemperature, setFilterTemperature] = useState<string>('all');

  // Composer Mode: 'whatsapp' | 'notes' | 'tasks'
  const [composerTab, setComposerTab] = useState<'whatsapp' | 'notes' | 'tasks'>(() => {
    return isWhatsAppDisabled ? 'notes' : 'whatsapp';
  });

  useEffect(() => {
    if (isWhatsAppDisabled && composerTab === 'whatsapp') {
      setComposerTab('notes');
    }
  }, [isWhatsAppDisabled, composerTab]);
  
  // WhatsApp / Note Text
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  // Task Creation Form State
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [taskDueTime, setTaskDueTime] = useState('14:00');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>(currentUser?.id || '');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync initialLeadId prop
  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId]);

  // Sync searchQuery prop
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Active check (controls gear icon color)
  const isFilterActive = useMemo(() => {
    return filterVenueId !== 'all' || filterStage !== 'all' || filterCollaboratorId !== 'all' || filterTemperature !== 'all';
  }, [filterVenueId, filterStage, filterCollaboratorId, filterTemperature]);

  // Filtered Leads List
  const filteredLeads = useMemo(() => {
    const currentFunnel = activeFunnelId ? funnels.find(f => f.id === activeFunnelId) : null;
    const targetVenueId = currentFunnel?.venueId || (activeVenueId !== 'all' && activeVenueId !== 'multi' ? activeVenueId : null);

    const result = leads.filter(lead => {
      // 1. Funnel filter if embedded
      if (activeFunnelId && lead.funnelId && lead.funnelId !== activeFunnelId) {
        return false;
      }

      // 2. Specific venue isolation
      if (targetVenueId && lead.venueId && lead.venueId !== targetVenueId) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) {
          return false;
        }
      }

      // 3. Quick Filter Tabs
      if (quickFilter === 'open') {
        if (lead.stage === 'contract_signed' || lead.stage === 'lost') {
          if (lead.id !== selectedLeadId && lead.id !== initialLeadId) {
            return false;
          }
        }
      } else if (quickFilter === 'my') {
        const isMyLead = lead.assignedTo === currentUser?.name || 
          lead.sdrId === currentUser?.id || 
          lead.closerId === currentUser?.id ||
          lead.sdrName === currentUser?.name ||
          lead.closerName === currentUser?.name;
        if (!isMyLead && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 4. Specific venue filter
      if (filterVenueId !== 'all' && lead.venueId !== filterVenueId) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 5. Stage filter
      if (filterStage !== 'all' && lead.stage !== filterStage) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 6. Collaborator filter
      if (filterCollaboratorId !== 'all') {
        const matchesSdr = lead.sdrId === filterCollaboratorId;
        const matchesCloser = lead.closerId === filterCollaboratorId;
        const matchesAssigned = lead.assignedTo === filterCollaboratorId;
        if (!matchesSdr && !matchesCloser && !matchesAssigned && lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 7. Temperature filter
      if (filterTemperature !== 'all' && lead.temperature !== filterTemperature) {
        if (lead.id !== selectedLeadId && lead.id !== initialLeadId) return false;
      }

      // 8. Search term
      if (searchTerm.trim()) {
        const clean = searchTerm.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(clean);
        const matchesPhone = lead.phone.replace(/\D/g, '').includes(clean.replace(/\D/g, ''));
        const matchesDeb = lead.debutanteName?.toLowerCase().includes(clean);
        if (!matchesName && !matchesPhone && !matchesDeb) return false;
      }

      return true;
    });

    // Fallback: If result would be 0 leads, return leads so user always sees the conversations
    if (result.length === 0 && leads.length > 0) {
      return leads;
    }

    return result;
  }, [leads, activeFunnelId, activeVenueId, quickFilter, filterVenueId, filterStage, filterCollaboratorId, filterTemperature, searchTerm, currentUser, funnels, selectedLeadId, initialLeadId]);

  // Set initial selected lead if none selected
  useEffect(() => {
    if (!selectedLeadId && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedLead?.activities, composerTab]);

  // Handle Send Message / Note
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLead || !messageText.trim()) return;

    const author = currentUser?.name || 'Equipe Comercial';
    
    if (composerTab === 'notes') {
      addLeadNote(selectedLead.id, messageText.trim());
    } else {
      const newActivity: LeadActivity = {
        id: `act_${Date.now()}`,
        leadId: selectedLead.id,
        timestamp: new Date().toISOString(),
        type: 'contact',
        title: `Mensagem enviada via WhatsApp`,
        text: messageText.trim(),
        authorName: author,
        authorId: currentUser?.id,
      };

      const updatedActivities = [...(selectedLead.activities || []), newActivity];
      updateLeadData(selectedLead.id, {
        activities: updatedActivities,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }

    setMessageText('');
  };

  // Handle Create Task from Composer
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !taskDescription.trim()) return;

    const assignedCollab = collaborators.find(c => c.id === taskAssigneeId) || collaborators[0];

    addLeadTask(selectedLead.id, {
      description: taskDescription.trim(),
      dueDate: taskDueDate,
      dueTime: taskDueTime,
      priority: taskPriority,
      assignedToId: assignedCollab?.id || currentUser?.id || 'admin',
      assignedToName: assignedCollab?.name || currentUser?.name || 'Administrador',
      assignedToAvatarUrl: assignedCollab?.avatarUrl,
      createdByName: currentUser?.name || 'Administrador',
    });

    setTaskDescription('');
  };

  // Audio Recording Handlers
  const startAudioRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopAndSendAudio = () => {
    if (!selectedLead) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    const author = currentUser?.name || 'Equipe Comercial';
    const durationStr = `${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}`;

    const newActivity: LeadActivity = {
      id: `act_${Date.now()}`,
      leadId: selectedLead.id,
      timestamp: new Date().toISOString(),
      type: 'contact',
      title: `Áudio gravado (${durationStr})`,
      text: `🎤 Mensagem de voz gravada pela equipe comercial (${durationStr})`,
      authorName: author,
      authorId: currentUser?.id,
    };

    const updatedActivities = [...(selectedLead.activities || []), newActivity];
    updateLeadData(selectedLead.id, {
      activities: updatedActivities,
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const getCleanWhatsappUrl = (phone: string, text?: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = `55${clean}`;
    }
    const query = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${query}`;
  };

  const resetFilters = () => {
    setFilterVenueId('all');
    setFilterStage('all');
    setFilterCollaboratorId('all');
    setFilterTemperature('all');
  };

  // Filter Timeline Content based on active composer tab
  const timelineActivities = useMemo(() => {
    if (!selectedLead?.activities) return [];
    if (composerTab === 'whatsapp') {
      return selectedLead.activities.filter(a => a.type === 'contact' || a.type === 'creation');
    }
    if (composerTab === 'notes') {
      return selectedLead.activities.filter(a => 
        a.type === 'note' || 
        a.type === 'status_change' || 
        a.type === 'assignment' || 
        a.type === 'creation' || 
        a.type === 'deal_closed' || 
        a.type === 'validation'
      );
    }
    if (composerTab === 'tasks') {
      return selectedLead.activities.filter(a => a.type === 'task_created' || a.type === 'task_completed');
    }
    return selectedLead.activities;
  }, [selectedLead?.activities, composerTab]);

  const icpRating = useMemo(() => {
    if (!selectedLead) return null;
    const score = selectedLead.mqlScore ?? 0;
    const isTop = score >= 80 || selectedLead.mqlLevel === 'top';
    const isQualified = (score >= 50 && score < 80) || selectedLead.mqlLevel === 'qualified';
    const label = isTop ? 'ICP A' : isQualified ? 'ICP B' : 'ICP C';
    const color = isTop ? '#10B981' : isQualified ? '#F59E0B' : '#EF4444';
    const bg = isTop ? 'rgba(16, 185, 129, 0.15)' : isQualified ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    const border = isTop ? 'rgba(16, 185, 129, 0.35)' : isQualified ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    return { score, label, color, bg, border };
  }, [selectedLead]);

  return (
    <div style={{
      height: isEmbeddedInFunnel ? 'calc(100vh - 120px)' : 'calc(100vh - 40px)',
      display: 'flex',
      background: 'var(--adm-bg-card)',
      borderRadius: '24px',
      border: '1px solid var(--adm-border)',
      overflow: 'hidden',
      margin: isEmbeddedInFunnel ? '0' : '20px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: 'relative',
    }}>
      
      {/* ── COLUNA 1: LISTA DE CONVERSAS / LEADS ───────────────────────── */}
      <div style={{
        width: '340px',
        minWidth: '300px',
        maxWidth: '360px',
        borderRight: '1px solid var(--adm-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-card)',
      }}>
        {/* Top Header & Search Bar */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MessageSquare size={17} />
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {isEmbeddedInFunnel ? 'Caixa de Entrada' : 'WhatsApp Atendimento'}
              </h2>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
              {filteredLeads.length} leads
            </div>
          </div>

          {/* Quick Filter Tabs: Em Aberto | Meus Leads | Todos */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--adm-bg-card)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--adm-border)',
          }}>
            <button
              type="button"
              onClick={() => setQuickFilter('open')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '7px',
                background: quickFilter === 'open' ? 'var(--adm-accent-bg)' : 'transparent',
                border: quickFilter === 'open' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: quickFilter === 'open' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                fontSize: '0.72rem',
                fontWeight: quickFilter === 'open' ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Em Aberto
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('my')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '7px',
                background: quickFilter === 'my' ? 'var(--adm-accent-bg)' : 'transparent',
                border: quickFilter === 'my' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: quickFilter === 'my' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                fontSize: '0.72rem',
                fontWeight: quickFilter === 'my' ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Meus Leads
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '7px',
                background: quickFilter === 'all' ? 'var(--adm-accent-bg)' : 'transparent',
                border: quickFilter === 'all' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                color: quickFilter === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                fontSize: '0.72rem',
                fontWeight: quickFilter === 'all' ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Todos
            </button>
          </div>

          {/* Search + Filter Button with Gear/Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por lead ou telefone..."
                className="adm-input"
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  height: '38px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter Toggle Button */}
            <div ref={filterDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                title={isFilterActive ? 'Filtros ativos' : 'Filtrar conversas'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: isFilterActive ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                  background: isFilterActive ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                  color: isFilterActive ? 'var(--adm-accent)' : '#9E988D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <SlidersHorizontal size={17} />
              </button>

              {/* Filter Popover Dropdown */}
              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '280px',
                  background: '#141118',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFF' }}>Filtros de Conversa</span>
                    {isFilterActive && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Filter: Venue */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Casa de Festa
                    </label>
                    <select
                      value={filterVenueId}
                      onChange={(e) => setFilterVenueId(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todas as Casas</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Collaborator */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Responsável Comercial
                    </label>
                    <select
                      value={filterCollaboratorId}
                      onChange={(e) => setFilterCollaboratorId(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todos os Atendentes</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Temperature */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#9E988D', marginBottom: '4px' }}>
                      Temperatura do Lead
                    </label>
                    <select
                      value={filterTemperature}
                      onChange={(e) => setFilterTemperature(e.target.value)}
                      className="adm-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.76rem', borderRadius: '8px' }}
                    >
                      <option value="all">Todas as Temperaturas</option>
                      <option value="hot">🔥 Quente (Alta Probabilidade)</option>
                      <option value="warm">🟡 Morno (Em Negociação)</option>
                      <option value="cold">🔵 Frio (Inicial)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leads Conversations Scrollable List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Nenhuma conversa encontrada</div>
              <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Ajuste os filtros ou o termo de busca</div>
            </div>
          ) : (
            filteredLeads.map(lead => {
              const isSelected = selectedLeadId === lead.id;
              const venue = venues.find(v => v.id === lead.venueId);
              const lastActivity = lead.activities?.[lead.activities.length - 1];

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--adm-border)',
                    background: isSelected ? 'var(--adm-accent-bg)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--adm-accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--adm-bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Lead Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--adm-bg-input)',
                    border: '1.5px solid var(--adm-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--adm-accent)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    flexShrink: 0,
                  }}>
                    {lead.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', flexShrink: 0 }}>
                        {lastActivity ? new Date(lastActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                      {lastActivity ? (lastActivity.text || lastActivity.title) : lead.phone}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '6px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}>
                        {venue?.name || 'Unidade'}
                      </span>
                      {lead.subSource ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          {lead.subSource}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                          WhatsApp
                        </span>
                      )}
                      {lead.mqlScore !== undefined && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: lead.mqlLevel === 'top' ? 'rgba(16,185,129,0.15)' : lead.mqlLevel === 'qualified' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: lead.mqlLevel === 'top' ? '#10B981' : lead.mqlLevel === 'qualified' ? '#F59E0B' : '#EF4444',
                        }}>
                          {lead.mqlLevel === 'top' ? 'ICP A' : lead.mqlLevel === 'qualified' ? 'ICP B' : 'ICP C'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COLUNA 2: GAVETA LATERAL FICHA DO LEAD (INSPECTOR NO LADO ESQUERDO) ───── */}
      {selectedLead && isInspectorOpen && (
        <div style={{
          width: '380px',
          minWidth: '340px',
          maxWidth: '400px',
          borderRight: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <AdminLeadInspector
            lead={selectedLead}
            onStageChange={(newStage: CrmStage) => updateLeadStage(selectedLead.id, newStage)}
            onToggleCollapse={() => setIsInspectorOpen(false)}
          />
        </div>
      )}

      {/* ── COLUNA 3: ÁREA DE CHAT / TIMELINE & COMPOSER ─────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-card)',
        minWidth: '380px',
      }}>
        {selectedLead ? (
          <>
            {/* Chat Top Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--adm-bg-input)',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {/* Botão com Setinha para Abrir/Fechar a Ficha do Lead */}
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                  title={isInspectorOpen ? 'Recolher Ficha do Lead' : 'Expandir Ficha do Lead'}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isInspectorOpen ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                    border: `1.5px solid ${isInspectorOpen ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    color: isInspectorOpen ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {isInspectorOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--adm-accent-bg)',
                  border: '1.5px solid var(--adm-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}>
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                      {selectedLead.name}
                    </h3>
                    {selectedLead.subSource ? (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                      }}>
                        📱 WhatsApp / {selectedLead.subSource}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}>
                        📱 WhatsApp API
                      </span>
                    )}
                    {icpRating && (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: icpRating.bg,
                        color: icpRating.color,
                        border: `1px solid ${icpRating.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <IcpTargetUserIcon size={12} color={icpRating.color} /> {icpRating.label} ({icpRating.score}%)
                      </span>
                    )}
                    <a
                      href={getCleanWhatsappUrl(selectedLead.phone)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir no WhatsApp Oficial"
                      style={{ color: '#10B981', display: 'flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                    📱 {selectedLead.phone} • {selectedLead.sdrName ? `SDR: ${selectedLead.sdrName}` : 'Sem SDR'}
                  </div>
                </div>
              </div>

              {/* Close Button if modal */}
              {onClose && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-muted)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Fechar Caixa de Entrada"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* ── TIMELINE DINÂMICA CONECTADA À ABA DO COMPOSER ── */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'radial-gradient(ellipse at 50% 10%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)',
            }}>
              {/* 1. ABA WHATSAPP: Exibe histórico de mensagens */}
              {composerTab === 'whatsapp' && (
                timelineActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
                    <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhuma mensagem trocada ainda</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Digite uma mensagem abaixo para iniciar o atendimento via WhatsApp.</div>
                  </div>
                ) : (
                  timelineActivities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        alignSelf: 'flex-end',
                        maxWidth: '75%',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                          {act.authorName || 'Atendente'}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-body)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                        {act.text || act.title}
                      </div>
                    </div>
                  ))
                )
              )}

              {/* 2. ABA ANOTAÇÕES: Exibe lista de anotações internas */}
              {composerTab === 'notes' && (
                timelineActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhuma anotação interna registrada</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Registre anotações privadas da equipe sobre este lead abaixo.</div>
                  </div>
                ) : (
                  timelineActivities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        alignSelf: 'center',
                        width: '100%',
                        maxWidth: '560px',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px dashed var(--adm-accent)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📝 {act.authorName || 'Equipe Comercial'} • Nota Interna
                        </span>
                        <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.timestamp).toLocaleDateString('pt-BR')} às {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-body)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                        {act.text || act.title}
                      </div>
                    </div>
                  ))
                )
              )}

              {/* 3. ABA TAREFAS: Exibe tarefas agendadas */}
              {composerTab === 'tasks' && (
                (!selectedLead.tasks || selectedLead.tasks.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
                    <Calendar size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhuma tarefa agendada para este lead</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Agende retornos, confirmações de visita ou ligações no formulário abaixo.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedLead.tasks.map((t) => {
                      const isCompleted = t.status === 'completed';

                      return (
                        <div
                          key={t.id}
                          style={{
                            background: isCompleted ? 'rgba(16, 185, 129, 0.06)' : 'rgba(59, 130, 246, 0.08)',
                            border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                            <button
                              type="button"
                              onClick={() => completeLeadTask(selectedLead.id, t.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: isCompleted ? '#10B981' : '#60A5FA',
                                cursor: 'pointer',
                                padding: 0,
                                marginTop: '2px',
                              }}
                            >
                              <CheckSquare size={18} />
                            </button>
                            <div>
                              <div style={{
                                fontSize: '0.84rem',
                                fontWeight: 800,
                                color: isCompleted ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                              }}>
                                {t.description}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} /> {t.dueDate} {t.dueTime ? `às ${t.dueTime}` : ''}
                                </span>
                                <span>• Responsável: <strong>{t.assignedToName}</strong></span>
                                {t.priority && (
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    background: t.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                    color: t.priority === 'high' ? '#EF4444' : '#60A5FA',
                                  }}>
                                    {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isCompleted ? '#10B981' : '#60A5FA',
                            flexShrink: 0,
                          }}>
                            {isCompleted ? 'Concluída' : 'Pendente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* ── MULTI-TAB COMPOSER: WHATSAPP | ANOTAÇÕES | TAREFAS ── */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {/* Tab Selector Pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid var(--adm-border)',
                paddingBottom: '8px',
              }}>
                {!isWhatsAppDisabled && (
                  <button
                    type="button"
                    onClick={() => setComposerTab('whatsapp')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: composerTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      border: composerTab === 'whatsapp' ? '1px solid #10B981' : '1px solid transparent',
                      color: composerTab === 'whatsapp' ? '#10B981' : 'var(--adm-text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: composerTab === 'whatsapp' ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                    {isWhatsAppComingSoon && (
                      <span style={{ fontSize: '0.6rem', background: 'rgba(20, 169, 215, 0.2)', color: '#14A9D7', padding: '1px 5px', borderRadius: '4px' }}>
                        Em Breve
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setComposerTab('notes')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: composerTab === 'notes' ? 'var(--adm-accent-bg)' : 'transparent',
                    border: composerTab === 'notes' ? '1px solid var(--adm-accent)' : '1px solid transparent',
                    color: composerTab === 'notes' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: composerTab === 'notes' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText size={13} />
                  <span>Anotações</span>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerTab('tasks')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: composerTab === 'tasks' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: composerTab === 'tasks' ? '1px solid #3B82F6' : '1px solid transparent',
                    color: composerTab === 'tasks' ? '#60A5FA' : 'var(--adm-text-muted)',
                    fontSize: '0.76rem',
                    fontWeight: composerTab === 'tasks' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar size={13} />
                  <span>Tarefas</span>
                </button>
              </div>

              {/* 1. COMPOSER: TAREFAS */}
              {composerTab === 'tasks' ? (
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Descrição da tarefa (ex: Ligar para confirmar visita ao salão)..."
                    className="adm-input"
                    style={{ height: '40px', borderRadius: '10px', fontSize: '0.82rem' }}
                    required
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '3px' }}>
                        Data Limite
                      </label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="adm-input"
                        style={{ width: '100%', height: '34px', borderRadius: '8px', fontSize: '0.76rem' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '3px' }}>
                        Horário
                      </label>
                      <input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="adm-input"
                        style={{ width: '100%', height: '34px', borderRadius: '8px', fontSize: '0.76rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '3px' }}>
                        Responsável
                      </label>
                      <select
                        value={taskAssigneeId}
                        onChange={(e) => setTaskAssigneeId(e.target.value)}
                        className="adm-input"
                        style={{ width: '100%', height: '34px', borderRadius: '8px', fontSize: '0.76rem' }}
                      >
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted)', marginBottom: '3px' }}>
                        Prioridade
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        className="adm-input"
                        style={{ width: '100%', height: '34px', borderRadius: '8px', fontSize: '0.76rem' }}
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">🔥 Alta</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      type="submit"
                      disabled={!taskDescription.trim()}
                      className="adm-btn-primary"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: taskDescription.trim() ? 'pointer' : 'not-allowed',
                        opacity: taskDescription.trim() ? 1 : 0.6,
                      }}
                    >
                      <Plus size={14} />
                      <span>Agendar Tarefa</span>
                    </button>
                  </div>
                </form>
              ) : composerTab === 'notes' ? (
                /* 2. COMPOSER: ANOTAÇÕES */
                <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Quick Preset Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {['Tentativa 1 (Sem resposta)', 'Tentativa 2 (Caixa postal)', 'Orçamento enviado', 'Visita confirmada'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMessageText(prev => prev ? `${prev} - ${preset}` : preset)}
                        style={{
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.68rem',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Escreva uma nota interna sobre o atendimento deste lead..."
                      className="adm-input"
                      style={{ flex: 1, height: '42px', borderRadius: '12px', fontSize: '0.82rem' }}
                    />

                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="adm-btn-primary"
                      style={{
                        height: '42px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                        opacity: messageText.trim() ? 1 : 0.6,
                      }}
                    >
                      <Check size={14} />
                      <span>Salvar Nota</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* 3. COMPOSER: WHATSAPP */
                isRecording ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #EF4444',
                    borderRadius: '12px',
                    padding: '8px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444', fontWeight: 800, fontSize: '0.82rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                      <span>Gravando áudio... {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={cancelRecording}
                        style={{ background: 'transparent', border: 'none', color: '#9E988D', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={stopAndSendAudio}
                        className="adm-btn-primary"
                        style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800 }}
                      >
                        Enviar Áudio
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Digite uma mensagem para o cliente via WhatsApp..."
                      className="adm-input"
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        padding: '0 14px',
                        outline: 'none',
                      }}
                    />

                    <button
                      type="button"
                      onClick={startAudioRecording}
                      title="Gravar áudio"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'var(--adm-bg-card)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-body)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Mic size={17} />
                    </button>

                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="adm-btn-primary"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                        opacity: messageText.trim() ? 1 : 0.6,
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                )
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-muted)', gap: '12px' }}>
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Selecione uma conversa ao lado
            </div>
            <div style={{ fontSize: '0.8rem', maxWidth: '320px', textAlign: 'center' }}>
              Inicie atendimentos, responda dúvidas e gerencie o histórico de WhatsApp dos seus leads.
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
