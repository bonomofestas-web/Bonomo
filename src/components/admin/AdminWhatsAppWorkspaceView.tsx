import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MessageSquare, Search, SlidersHorizontal, Send, Mic, Phone,
  ExternalLink, FileText
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminLeadDetailModal } from './AdminLeadDetailModal';
import type { LeadActivity } from '../../types/admin';

export const AdminWhatsAppWorkspaceView: React.FC = () => {
  const { 
    leads, 
    venues, 
    collaborators, 
    currentUser, 
    activeVenueId, 
    updateLeadData, 
    addLeadNote 
  } = useAdminState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Filters State
  const [filterVenueId, setFilterVenueId] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('all');
  const [filterTemperature, setFilterTemperature] = useState<string>('all');

  // Lead Full Details Modal
  const [detailModalLeadId, setDetailModalLeadId] = useState<string | null>(null);

  // Chat Input State
  const [messageText, setMessageText] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
    return leads.filter(lead => {
      // 1. Global venue switcher
      if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
        if (lead.venueId !== activeVenueId) return false;
      }

      // 2. Specific venue filter
      if (filterVenueId !== 'all' && lead.venueId !== filterVenueId) return false;

      // 3. Stage filter
      if (filterStage !== 'all' && lead.stage !== filterStage) return false;

      // 4. Collaborator filter
      if (filterCollaboratorId !== 'all') {
        const matchesSdr = lead.sdrId === filterCollaboratorId;
        const matchesCloser = lead.closerId === filterCollaboratorId;
        const matchesAssigned = lead.assignedTo === filterCollaboratorId;
        if (!matchesSdr && !matchesCloser && !matchesAssigned) return false;
      }

      // 5. Temperature filter
      if (filterTemperature !== 'all' && lead.temperature !== filterTemperature) return false;

      // 6. Search term
      if (searchTerm.trim()) {
        const clean = searchTerm.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(clean);
        const matchesPhone = lead.phone.replace(/\D/g, '').includes(clean.replace(/\D/g, ''));
        const matchesDeb = lead.debutanteName?.toLowerCase().includes(clean);
        if (!matchesName && !matchesPhone && !matchesDeb) return false;
      }

      return true;
    });
  }, [leads, activeVenueId, filterVenueId, filterStage, filterCollaboratorId, filterTemperature, searchTerm]);

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
  }, [selectedLead?.activities]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLead || !messageText.trim()) return;

    const author = currentUser?.name || 'Equipe Comercial';
    
    if (isNoteMode) {
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

  return (
    <div style={{
      height: 'calc(100vh - 40px)',
      display: 'flex',
      background: 'var(--adm-bg-card)',
      borderRadius: '24px',
      border: '1px solid var(--adm-border)',
      overflow: 'hidden',
      margin: '20px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      
      {/* ── COLUNA ESQUERDA: LISTA DE CONVERSAS / LEADS ─────────────────── */}
      <div style={{
        width: '380px',
        minWidth: '340px',
        maxWidth: '420px',
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
                WhatsApp Atendimento
              </h2>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
              {filteredLeads.length} conversas
            </div>
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
                style={{ width: '100%', paddingLeft: '32px', height: '38px', borderRadius: '10px', fontSize: '0.78rem' }}
              />
            </div>

            {/* Filter Toggle Button (Colored when filters active, Gray when default) */}
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
                    width: '42px',
                    height: '42px',
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
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', flexShrink: 0 }}>
                        {lastActivity ? new Date(lastActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                      {lastActivity ? (lastActivity.text || lastActivity.title) : lead.phone}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: '6px', background: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}>
                        {venue?.name || 'Unidade'}
                      </span>
                      {lead.temperature === 'hot' && (
                        <span style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                          🔥 Quente
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

      {/* ── COLUNA DIREITA: ÁREA DO CHAT / ATENDIMENTO FULLSCREEN ───────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--adm-bg-card)',
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
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--adm-accent-bg)',
                  border: '1.5px solid var(--adm-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                }}>
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                      {selectedLead.name}
                    </h3>
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={getCleanWhatsappUrl(selectedLead.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="adm-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', color: '#10B981' }}
                >
                  <Phone size={14} />
                  <span>WhatsApp Web</span>
                </a>

                <button
                  type="button"
                  onClick={() => setDetailModalLeadId(selectedLead.id)}
                  className="adm-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 800 }}
                >
                  <FileText size={14} />
                  <span>Ver Ficha Completa</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Timeline */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'radial-gradient(ellipse at 50% 10%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)',
            }}>
              {(!selectedLead.activities || selectedLead.activities.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--adm-text-muted)' }}>
                  <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Início do Atendimento com {selectedLead.name}</div>
                  <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Envie uma mensagem ou registre notas sobre o contato.</div>
                </div>
              ) : (
                selectedLead.activities.map((act) => {
                  const isNote = act.type === 'note';
                  return (
                    <div
                      key={act.id}
                      style={{
                        alignSelf: isNote ? 'center' : 'flex-end',
                        maxWidth: isNote ? '80%' : '70%',
                        background: isNote 
                          ? 'rgba(212, 175, 55, 0.12)' 
                          : 'var(--adm-bg-input)',
                        border: isNote ? '1px dashed var(--adm-accent)' : '1px solid var(--adm-border)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isNote ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                          {act.authorName || 'Atendente'} {isNote && '• 📝 Nota Interna'}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)' }}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-body)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                        {act.text || act.title}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Toolbar */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {/* Note Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: isNoteMode ? 'var(--adm-accent)' : 'var(--adm-text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isNoteMode}
                    onChange={(e) => setIsNoteMode(e.target.checked)}
                  />
                  <span>Modo Nota Interna (Privado para a equipe)</span>
                </label>
              </div>

              {/* Input Row */}
              {isRecording ? (
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
                    placeholder={isNoteMode ? "Escreva uma nota interna sobre este lead..." : "Digite uma mensagem para o cliente..."}
                    className="adm-input"
                    style={{ flex: 1, height: '42px', borderRadius: '12px', fontSize: '0.82rem' }}
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

      {/* Modal Ficha Completa do Lead */}
      {detailModalLeadId && (
        <AdminLeadDetailModal
          isOpen={Boolean(detailModalLeadId)}
          lead={leads.find(l => l.id === detailModalLeadId) || null}
          onClose={() => setDetailModalLeadId(null)}
        />
      )}
    </div>
  );
};
