import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Edit3, Trash2, Search, 
  Building2, UserCheck, ChevronLeft, ChevronRight, List,
  Sparkles, UtensilsCrossed, FileText, Camera
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminAppointmentModal } from './AdminAppointmentModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { Appointment } from '../../types';

export const AdminAppointmentsView: React.FC = () => {
  const { 
    debutantes, 
    venues, 
    activeVenueId, 
    deleteAppointmentForDebutante 
  } = useAdminState();

  // View Mode: 'calendar' (default as requested) or 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Month navigation for Calendar View
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetDate, setPresetDate] = useState<string | undefined>(undefined);
  const [appointmentToEdit, setAppointmentToEdit] = useState<{ debutanteId: string; appointment: Appointment } | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ debutanteId: string; appId: string; title: string } | null>(null);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [filterState, setFilterState] = useState<FilterState>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    debutanteId: 'all',
  });

  // Flatten appointments with debutante & venue details
  const allAppointments = useMemo(() => {
    return debutantes.flatMap(d => {
      const venue = venues.find(v => v.id === d.venueId);
      return d.appointments.map(a => ({
        ...a,
        debutanteId: d.id,
        debutanteName: d.name,
        debutanteSlug: d.slug,
        partyDate: d.partyDate,
        venueId: d.venueId,
        venueName: venue?.name || 'Espaço Rio Lounge',
      }));
    });
  }, [debutantes, venues]);

  const displayedAppointments = useMemo(() => {
    return allAppointments.filter(app => {
      // 1. Venue Filter
      const venueTarget = filterState.venueId !== 'all' ? filterState.venueId : activeVenueId;
      if (venueTarget && app.venueId !== venueTarget) return false;

      // 2. Debutante Filter
      if (filterState.debutanteId && filterState.debutanteId !== 'all' && app.debutanteId !== filterState.debutanteId) return false;

      // 3. Responsible Filter
      if (filterState.collaboratorId !== 'all' && app.responsibleCollaboratorId !== filterState.collaboratorId) return false;

      // 4. Category Filter
      if (categoryFilter !== 'all' && app.category !== categoryFilter) return false;

      // 5. Search Query (matches title, location, category, debutante or responsible)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = app.title.toLowerCase().includes(q);
        const matchesCat = app.category.toLowerCase().includes(q);
        const matchesLoc = app.location.toLowerCase().includes(q);
        const matchesDeb = app.debutanteName.toLowerCase().includes(q);
        const matchesResp = app.responsibleName?.toLowerCase().includes(q);
        const matchesNotes = app.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesLoc && !matchesDeb && !matchesResp && !matchesNotes) {
          return false;
        }
      }

      // 6. Temporal / Period Filter (for List mode)
      if (viewMode === 'list' && filterState.period !== 'all') {
        const todayStr = new Date().toISOString().split('T')[0];
        const appDate = app.date;
        const today = new Date();
        const targetDate = new Date(appDate + 'T12:00:00');
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (filterState.period === 'today' && appDate !== todayStr) return false;
        if (filterState.period === '7d' && (diffDays < 0 || diffDays > 7)) return false;
        if (filterState.period === '30d' && (diffDays < 0 || diffDays > 30)) return false;
        if (filterState.period === 'this_month') {
          if (targetDate.getMonth() !== today.getMonth() || targetDate.getFullYear() !== today.getFullYear()) return false;
        }
        if (filterState.period === 'custom' && filterState.customStartDate && filterState.customEndDate) {
          if (appDate < filterState.customStartDate || appDate > filterState.customEndDate) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allAppointments, activeVenueId, filterState, categoryFilter, searchQuery, viewMode]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = useMemo(() => {
    const str = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayIndex = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const daysInPrevMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreate = () => {
    setPresetDate(undefined);
    setAppointmentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenCreateOnDate = (dateStr: string) => {
    setPresetDate(dateStr);
    setAppointmentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (debutanteId: string, appointment: Appointment) => {
    setAppointmentToEdit({ debutanteId, appointment });
    setIsModalOpen(true);
  };

  const handleDelete = (debutanteId: string, appId: string, title: string) => {
    setAppointmentToDelete({ debutanteId, appId, title });
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'Buffet & Degustação':
        return { bg: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: '1px solid rgba(236, 72, 153, 0.3)', icon: '🍽️' };
      case 'Vestido de Gala':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.3)', icon: '👗' };
      case 'Cerimonial':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', icon: '📋' };
      case 'Ensaio Fotográfico':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', icon: '📸' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)', icon: '✨' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Compromissos & Degustações
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Visualização de eventos, degustações e reuniões sincronizadas diretamente no app da debutante.
          </p>
        </div>

        {/* View Switcher + New Appointment Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Switcher Pill */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                background: viewMode === 'calendar' ? 'var(--adm-accent)' : 'transparent',
                color: viewMode === 'calendar' ? '#000000' : 'var(--adm-text-muted)',
                border: 'none',
                borderRadius: '9px',
                padding: '7px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarIcon size={14} />
              <span>Calendário</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--adm-accent)' : 'transparent',
                color: viewMode === 'list' ? '#000000' : 'var(--adm-text-muted)',
                border: 'none',
                borderRadius: '9px',
                padding: '7px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              <span>Lista</span>
            </button>
          </div>

          {/* Primary Action */}
          <button
            onClick={handleOpenCreate}
            className="adm-btn-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            <span>Agendar Compromisso</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER BAR ────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Box */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          <input
            type="text"
            placeholder="Buscar por título, debutante, 'Degustação', local ou participante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '10px 14px 10px 42px',
              color: 'var(--adm-text-title)',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos os Tipos', icon: null },
            { id: 'Buffet & Degustação', label: 'Degustações', icon: UtensilsCrossed },
            { id: 'Vestido de Gala', label: 'Vestido & Trajes', icon: Sparkles },
            { id: 'Cerimonial', label: 'Cerimonial & Roteiro', icon: FileText },
            { id: 'Ensaio Fotográfico', label: 'Ensaio & Foto', icon: Camera },
          ].map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                style={{
                  background: categoryFilter === cat.id ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                  border: categoryFilter === cat.id ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                  color: categoryFilter === cat.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  borderRadius: '16px',
                  padding: '5px 14px',
                  fontSize: '0.74rem',
                  fontWeight: categoryFilter === cat.id ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {Icon && <Icon size={13} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Rich Filter Bar (Venue, Debutante, Responsible) */}
        <AdminFilterBar
          filters={filterState}
          onChange={setFilterState}
          showDebutanteFilter={true}
          resultCount={displayedAppointments.length}
          totalCount={allAppointments.length}
          labelUnit="compromissos"
        />
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. CALENDAR VIEW (PRINCIPAL)                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div className="saas-card" style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          {/* Calendar Month Navigation Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                {monthName}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handlePrevMonth}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Mês Anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={handleNextMonth}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Próximo Mês"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={handleToday}
                style={{
                  background: 'var(--adm-accent-bg)',
                  border: '1px solid var(--adm-accent)',
                  color: 'var(--adm-accent)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Hoje
              </button>
            </div>

            {/* Helper Tip */}
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--adm-accent)" />
              <span>Passe o mouse sobre um dia para <strong>adicionar compromisso (+)</strong></span>
            </div>
          </div>

          {/* Monthly Days Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '8px',
          }}>
            {/* Days of week header */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-muted)',
                  textTransform: 'uppercase',
                  padding: '8px 0',
                  letterSpacing: '0.5px',
                }}
              >
                {d}
              </div>
            ))}

            {/* Prev month trailing days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  style={{
                    minHeight: '115px',
                    borderRadius: '12px',
                    background: 'var(--adm-bg-app)',
                    border: '1px solid var(--adm-border)',
                    opacity: 0.35,
                    padding: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>
                    {dayNum}
                  </span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isHovered = hoveredDate === dateStr;

              // Filter appointments for this day
              const dayAppointments = displayedAppointments.filter(a => a.date === dateStr);

              return (
                <div
                  key={dateStr}
                  onMouseEnter={() => setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  style={{
                    minHeight: '115px',
                    borderRadius: '12px',
                    background: isToday ? 'rgba(212, 175, 55, 0.04)' : 'var(--adm-bg-app)',
                    border: isToday 
                      ? '1.5px solid var(--adm-accent)' 
                      : isHovered 
                        ? '1px solid var(--adm-border-hover)' 
                        : '1px solid var(--adm-border)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isHovered ? '0 4px 18px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  {/* Day Header: Number + On-Hover Add Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: isToday ? 900 : 700,
                      color: isToday ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isToday ? 'var(--adm-accent-bg)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {dayNum}
                    </span>

                    {/* [+] Button (Appears on hover as requested) */}
                    <button
                      onClick={() => handleOpenCreateOnDate(dateStr)}
                      title={`Adicionar compromisso em ${dayNum} de ${monthName}`}
                      style={{
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'scale(1)' : 'scale(0.8)',
                        transition: 'all 0.15s ease',
                        background: 'var(--adm-accent)',
                        border: 'none',
                        color: '#000000',
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 900,
                        boxShadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
                      }}
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Day Appointments List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '100px' }}>
                    {dayAppointments.slice(0, 3).map(app => {
                      const badge = getCategoryBadgeStyle(app.category);
                      return (
                        <div
                          key={app.id}
                          onClick={() => handleOpenEdit(app.debutanteId, app)}
                          title={`${app.title} — ${app.debutanteName} (${app.time})`}
                          style={{
                            background: badge.bg,
                            border: badge.border,
                            color: badge.color,
                            borderRadius: '6px',
                            padding: '3px 6px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.filter = 'brightness(1.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.filter = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                              {badge.icon} {app.title}
                            </span>
                            <span style={{ fontSize: '0.62rem', opacity: 0.85, flexShrink: 0 }}>
                              {app.time}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.60rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {app.debutanteName}
                          </div>
                        </div>
                      );
                    })}

                    {dayAppointments.length > 3 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--adm-accent)', fontWeight: 800, textAlign: 'center', padding: '1px 0' }}>
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. LIST VIEW (DETALHADA)                                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {displayedAppointments.length === 0 ? (
            <div style={{
              background: 'var(--adm-bg-card)',
              borderRadius: '18px',
              padding: '48px 20px',
              textAlign: 'center',
              border: '1px dashed var(--adm-border)',
            }}>
              <CalendarIcon size={36} color="var(--adm-accent)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Nenhum compromisso encontrado</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px auto' }}>
                {allAppointments.length === 0 
                  ? 'Clique em "Agendar Compromisso" para adicionar degustações, ensaios e provas de vestido.'
                  : 'Nenhum compromisso corresponde aos filtros selecionados.'}
              </p>
              {allAppointments.length === 0 && (
                <button
                  onClick={handleOpenCreate}
                  className="adm-btn-primary"
                  style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, margin: '0 auto' }}
                >
                  <Plus size={15} /> Agendar Primeiro Compromisso
                </button>
              )}
            </div>
          ) : (
            displayedAppointments.map(app => {
              const isCompleted = app.status === 'completed';
              const isConfirmed = app.status === 'confirmed';

              return (
                <div
                  key={app.id}
                  className="saas-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    borderLeft: isCompleted ? '4px solid #F59E0B' : isConfirmed ? '4px solid var(--adm-green)' : '4px solid var(--adm-accent)',
                  }}
                >
                  {/* Left Date Badge + Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '260px' }}>
                    {/* Date Block */}
                    <div style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      minWidth: '70px',
                    }}>
                      <div style={{ fontSize: '0.66rem', color: 'var(--adm-accent)', fontWeight: 800, textTransform: 'uppercase' }}>
                        {new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--adm-text-title)', lineHeight: 1.1 }}>
                        {app.date.split('-')[2]}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                        {app.time}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                          {app.title}
                        </h3>

                        {/* Casa de Festa Badge */}
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Building2 size={11} /> {app.venueName}
                        </span>

                        <span style={{
                          background: 'var(--adm-accent-bg)',
                          color: 'var(--adm-accent)',
                          border: '1px solid var(--adm-border-hover)',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}>
                          {app.category}
                        </span>

                        {isCompleted && (
                          <span style={{ fontSize: '0.68rem', color: '#FBBF24', fontWeight: 800, background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                            ⭐ Realizado
                          </span>
                        )}

                        {isConfirmed && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--adm-green)', fontWeight: 800, background: 'var(--adm-green-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                            ✓ Confirmado
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <span>Debutante: <strong style={{ color: 'var(--adm-accent)' }}>{app.debutanteName}</strong></span>
                        <span>Local: <strong>{app.location}</strong></span>
                        {app.responsibleName && (
                          <span style={{
                            background: 'var(--adm-bg-elevated)',
                            border: '1px solid var(--adm-border)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            color: 'var(--adm-text-title)',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <UserCheck size={12} color="var(--adm-green)" />
                            Responsável: {app.responsibleName} ({app.responsibleRole || 'Atendimento'})
                          </span>
                        )}
                      </div>

                      {app.notes && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                          "{app.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(app.debutanteId, app)}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '10px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Edit3 size={13} color="var(--adm-accent)" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDelete(app.debutanteId, app.id, app.title)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-red)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '6px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Appointment Modal with preset date and debutante support */}
      <AdminAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        presetDate={presetDate}
        presetDebutanteId={filterState.debutanteId && filterState.debutanteId !== 'all' ? filterState.debutanteId : undefined}
        appointmentToEdit={appointmentToEdit}
      />

      {/* Appointment Delete Confirm */}
      <AdminConfirmModal
        isOpen={!!appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={() => {
          if (appointmentToDelete) {
            deleteAppointmentForDebutante(appointmentToDelete.debutanteId, appointmentToDelete.appId);
            setAppointmentToDelete(null);
          }
        }}
        title="Remover Compromisso"
        itemName={appointmentToDelete?.title}
        message={appointmentToDelete ? `Tem certeza que deseja remover o compromisso "${appointmentToDelete.title}"?` : undefined}
      />
    </div>
  );
};
