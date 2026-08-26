import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Building2, UserCheck, Users, Clock, 
  ChevronDown, X, Check, ArrowUpDown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

export type PeriodFilterType = '7d' | 'today' | '30d' | 'this_month' | 'all' | 'custom';

export interface FilterState {
  period: PeriodFilterType;
  customStartDate?: string;
  customEndDate?: string;
  venueId: string; // 'all' or specific id
  venueIds?: string[]; // multi-selected venue IDs
  collaboratorId: string; // 'all' or specific id
  collaboratorIds?: string[]; // multi-selected collaborator IDs
  debutanteId?: string; // 'all' or specific id
  debutanteIds?: string[]; // multi-selected debutante IDs
  sortBy?: string;
  category?: string;
}

interface AdminFilterBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  showDebutanteFilter?: boolean;
  showCategoryFilter?: boolean;
  showSortFilter?: boolean;
  categories?: { id: string; label: string }[];
  sortOptions?: { id: string; label: string }[];
  resultCount?: number;
  totalCount?: number;
  labelUnit?: string;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  filters,
  onChange,
  showDebutanteFilter = false,
  showSortFilter = false,
  sortOptions = [],
  resultCount,
  totalCount,
  labelUnit = 'itens',
}) => {
  const { venues, collaborators, debutantes, currentUser } = useAdminState();

  // User-scoped allowed venues
  const userAllowedVenues = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'master') return venues;
    const ids = currentUser.venueIds && currentUser.venueIds.length > 0 ? currentUser.venueIds : [];
    if (ids.length === 0) return venues;
    return venues.filter(v => ids.includes(v.id));
  }, [venues, currentUser]);

  // Active Dropdown Popover
  const [openDropdown, setOpenDropdown] = useState<'period' | 'venue' | 'collaborator' | 'debutante' | 'sort' | null>(null);
  
  // Custom Date Range State
  const [tempStartDate, setTempStartDate] = useState(filters.customStartDate || '');
  const [tempEndDate, setTempEndDate] = useState(filters.customEndDate || '');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePeriodChange = (p: PeriodFilterType) => {
    if (p === 'custom') {
      onChange({ ...filters, period: 'custom', customStartDate: tempStartDate, customEndDate: tempEndDate });
    } else {
      onChange({ ...filters, period: p });
      setOpenDropdown(null);
    }
  };

  const applyCustomRange = () => {
    if (tempStartDate && tempEndDate) {
      onChange({ ...filters, period: 'custom', customStartDate: tempStartDate, customEndDate: tempEndDate });
      setOpenDropdown(null);
    }
  };

  // Toggle multi-venue
  const toggleVenue = (vid: string) => {
    const current = filters.venueIds || (filters.venueId !== 'all' ? [filters.venueId] : []);
    const updated = current.includes(vid) ? current.filter(id => id !== vid) : [...current, vid];
    const newVenueId = updated.length === 1 ? updated[0] : (updated.length === 0 ? 'all' : 'multi');
    onChange({ ...filters, venueId: newVenueId, venueIds: updated });
  };

  // Toggle multi-collaborator
  const toggleCollaborator = (cid: string) => {
    const current = filters.collaboratorIds || (filters.collaboratorId !== 'all' ? [filters.collaboratorId] : []);
    const updated = current.includes(cid) ? current.filter(id => id !== cid) : [...current, cid];
    const newCollabId = updated.length === 1 ? updated[0] : (updated.length === 0 ? 'all' : 'multi');
    onChange({ ...filters, collaboratorId: newCollabId, collaboratorIds: updated });
  };

  // Toggle multi-debutante
  const toggleDebutante = (did: string) => {
    const current = filters.debutanteIds || (filters.debutanteId && filters.debutanteId !== 'all' ? [filters.debutanteId] : []);
    const updated = current.includes(did) ? current.filter(id => id !== did) : [...current, did];
    const newDebId = updated.length === 1 ? updated[0] : (updated.length === 0 ? 'all' : 'multi');
    onChange({ ...filters, debutanteId: newDebId, debutanteIds: updated });
  };

  const clearAllFilters = () => {
    onChange({
      period: '7d', // 7 days default
      venueId: 'all',
      venueIds: [],
      collaboratorId: 'all',
      collaboratorIds: [],
      debutanteId: 'all',
      debutanteIds: [],
      category: 'all',
      sortBy: sortOptions[0]?.id || 'recent',
    });
    setOpenDropdown(null);
  };

  // Helper Labels
  const getPeriodLabel = (p: PeriodFilterType) => {
    switch (p) {
      case '7d': return 'Últimos 7 Dias (Semana)';
      case 'today': return 'Hoje';
      case '30d': return 'Últimos 30 Dias';
      case 'this_month': return 'Este Mês';
      case 'all': return 'Todo o Período';
      case 'custom': 
        if (filters.customStartDate && filters.customEndDate) {
          const s = filters.customStartDate.split('-').reverse().join('/');
          const e = filters.customEndDate.split('-').reverse().join('/');
          return `${s} até ${e}`;
        }
        return 'Personalizado';
    }
  };

  const selectedVenueIds = filters.venueIds || (filters.venueId !== 'all' && filters.venueId !== 'multi' ? [filters.venueId] : []);
  const selectedCollabIds = filters.collaboratorIds || (filters.collaboratorId !== 'all' && filters.collaboratorId !== 'multi' ? [filters.collaboratorId] : []);
  const selectedDebIds = filters.debutanteIds || (filters.debutanteId && filters.debutanteId !== 'all' && filters.debutanteId !== 'multi' ? [filters.debutanteId] : []);

  const hasActiveFilters = 
    filters.period !== '7d' || 
    selectedVenueIds.length > 0 || 
    selectedCollabIds.length > 0 || 
    selectedDebIds.length > 0 ||
    (filters.category && filters.category !== 'all');

  return (
    <div 
      ref={containerRef}
      style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ── TOP CONTROLS ROW ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        {/* Left: Rich Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* 1. PERÍODO BUTTON */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'period' ? null : 'period')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: filters.period !== '7d' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                border: `1px solid ${filters.period !== '7d' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                color: filters.period !== '7d' ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Clock size={14} color="var(--adm-accent)" />
              <span>{getPeriodLabel(filters.period)}</span>
              <ChevronDown size={13} style={{ transform: openDropdown === 'period' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Período Popover Modal */}
            {openDropdown === 'period' && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 999,
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '10px',
                width: '280px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'fadeIn 0.15s ease-out',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 6px' }}>
                  Intervalo de Tempo
                </div>

                {[
                  { id: '7d', label: 'Últimos 7 Dias (Padrão)', desc: 'Visualização da semana atual' },
                  { id: 'today', label: 'Hoje', desc: 'Atividades e dados do dia' },
                  { id: '30d', label: 'Últimos 30 Dias', desc: 'Desempenho no último mês corrido' },
                  { id: 'this_month', label: 'Este Mês', desc: 'Do dia 1º até hoje' },
                  { id: 'all', label: 'Todo o Período', desc: 'Histórico completo acumulado' },
                ].map(opt => {
                  const isSelected = filters.period === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePeriodChange(opt.id as PeriodFilterType)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                        border: `1px solid ${isSelected ? 'var(--adm-accent)' : 'transparent'}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && <Check size={14} color="var(--adm-accent)" />}
                    </button>
                  );
                })}

                {/* Custom Range Option */}
                <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '10px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} color="var(--adm-accent)" />
                    <span>Intervalo Personalizado</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '3px' }}>De:</label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '5px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.72rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.64rem', color: 'var(--adm-text-muted)', display: 'block', marginBottom: '3px' }}>Até:</label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '6px',
                          padding: '5px',
                          color: 'var(--adm-text-title)',
                          fontSize: '0.72rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="adm-btn-primary"
                    disabled={!tempStartDate || !tempEndDate}
                    style={{
                      width: '100%',
                      padding: '7px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      opacity: (!tempStartDate || !tempEndDate) ? 0.5 : 1,
                    }}
                  >
                    Aplicar Intervalo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. CASA DE FESTAS BUTTON (MULTI-SELECT) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'venue' ? null : 'venue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: selectedVenueIds.length > 0 ? 'rgba(99, 102, 241, 0.15)' : 'var(--adm-bg-input)',
                border: `1px solid ${selectedVenueIds.length > 0 ? '#818cf8' : 'var(--adm-border)'}`,
                color: selectedVenueIds.length > 0 ? '#818cf8' : 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={14} color="#818cf8" />
              <span>
                {selectedVenueIds.length === 0 
                  ? `Todas as Casas (${userAllowedVenues.length})` 
                  : selectedVenueIds.length === 1 
                    ? userAllowedVenues.find(v => v.id === selectedVenueIds[0])?.name || venues.find(v => v.id === selectedVenueIds[0])?.name
                    : `Casas (${selectedVenueIds.length})`}
              </span>
              <ChevronDown size={13} style={{ transform: openDropdown === 'venue' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Venue Popover Dropdown */}
            {openDropdown === 'venue' && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 999,
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '10px',
                width: '320px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'fadeIn 0.15s ease-out',
                maxHeight: '340px',
                overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Filtrar por Casa de Festas
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, venueId: 'all', venueIds: [] })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-accent)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Ver Todas
                  </button>
                </div>

                {userAllowedVenues.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.76rem' }}>
                    Nenhuma casa de festa disponível para o seu usuário.
                  </div>
                ) : (
                  userAllowedVenues.map(v => {
                    const isSelected = selectedVenueIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleVenue(v.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isSelected ? '#818cf8' : 'transparent'}`,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ accentColor: '#818cf8', cursor: 'pointer' }}
                          />
                          {v.logoUrl ? (
                            <img src={v.logoUrl} alt={v.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Building2 size={12} color="#818cf8" />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? '#818cf8' : 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.name}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.address.split('-')[0] || v.address}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} color="#818cf8" />}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 3. COLABORADOR BUTTON (MULTI-SELECT) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'collaborator' ? null : 'collaborator')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: selectedCollabIds.length > 0 ? 'var(--adm-green-bg)' : 'var(--adm-bg-input)',
                border: `1px solid ${selectedCollabIds.length > 0 ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                color: selectedCollabIds.length > 0 ? 'var(--adm-green)' : 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <UserCheck size={14} color="var(--adm-green)" />
              <span>
                {selectedCollabIds.length === 0 
                  ? `Toda a Equipe (${collaborators.length})` 
                  : selectedCollabIds.length === 1 
                    ? collaborators.find(c => c.id === selectedCollabIds[0])?.name 
                    : `Equipe (${selectedCollabIds.length})`}
              </span>
              <ChevronDown size={13} style={{ transform: openDropdown === 'collaborator' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Collaborator Popover Dropdown */}
            {openDropdown === 'collaborator' && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 999,
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '14px',
                padding: '10px',
                width: '320px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'fadeIn 0.15s ease-out',
                maxHeight: '340px',
                overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Filtrar Colaboradores
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, collaboratorId: 'all', collaboratorIds: [] })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adm-green)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Ver Todos
                  </button>
                </div>

                {collaborators.map(c => {
                  const isSelected = selectedCollabIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCollaborator(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? 'var(--adm-green-bg)' : 'var(--adm-bg-input)',
                        border: `1px solid ${isSelected ? 'var(--adm-green)' : 'transparent'}`,
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--adm-green)', cursor: 'pointer' }}
                        />
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--adm-green)' }}>
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? 'var(--adm-green)' : 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)' }}>
                            {c.role === 'admin' ? 'Gerência' : c.role.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check size={14} color="var(--adm-green)" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. DEBUTANTE FILTER (MULTI-SELECT) */}
          {showDebutanteFilter && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'debutante' ? null : 'debutante')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: selectedDebIds.length > 0 ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  border: `1px solid ${selectedDebIds.length > 0 ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  color: selectedDebIds.length > 0 ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Users size={14} color="var(--adm-accent)" />
                <span>
                  {selectedDebIds.length === 0 
                    ? `Todas as Debutantes (${debutantes.length})` 
                    : selectedDebIds.length === 1 
                      ? debutantes.find(d => d.id === selectedDebIds[0])?.name 
                      : `Debutantes (${selectedDebIds.length})`}
                </span>
                <ChevronDown size={13} style={{ transform: openDropdown === 'debutante' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              </button>

              {/* Debutante Popover */}
              {openDropdown === 'debutante' && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 999,
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '10px',
                  width: '320px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  animation: 'fadeIn 0.15s ease-out',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Filtrar Debutantes
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, debutanteId: 'all', debutanteIds: [] })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-accent)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Ver Todas
                    </button>
                  </div>

                  {debutantes.map(d => {
                    const isSelected = selectedDebIds.includes(d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => toggleDebutante(d.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isSelected ? 'var(--adm-accent)' : 'transparent'}`,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                          />
                          <img src={d.avatarUrl} alt={d.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {d.name}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--adm-text-muted)' }}>
                              Festa: {d.partyDate.split('-').reverse().join('/')}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} color="var(--adm-accent)" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. SORT FILTER */}
          {showSortFilter && sortOptions.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowUpDown size={13} color="var(--adm-text-muted)" />
                <span>Ordenar: {sortOptions.find(o => o.id === filters.sortBy)?.label || 'Padrão'}</span>
                <ChevronDown size={13} style={{ transform: openDropdown === 'sort' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              </button>

              {openDropdown === 'sort' && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 999,
                  background: 'var(--adm-bg-card)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '8px',
                  width: '200px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-out',
                }}>
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange({ ...filters, sortBy: opt.id });
                        setOpenDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: filters.sortBy === opt.id ? 'var(--adm-accent-bg)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: filters.sortBy === opt.id ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                        fontSize: '0.76rem',
                        fontWeight: filters.sortBy === opt.id ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{opt.label}</span>
                      {filters.sortBy === opt.id && <Check size={13} color="var(--adm-accent)" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right: Active Summary & Clear Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {resultCount !== undefined && (
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
              Mostrando <strong style={{ color: 'var(--adm-text-title)' }}>{resultCount}</strong> {totalCount !== undefined && `de ${totalCount}`} {labelUnit}
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Restaurar visualização padrão"
            >
              <X size={12} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
