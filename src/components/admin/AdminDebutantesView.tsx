import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Share2, Send, 
  Gift, Edit3, Trash2, Check, 
  ExternalLink, Building2, Search, LayoutGrid, List,
  Calendar, Power, Phone, Mail, Crown
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminDebutanteModal } from './AdminDebutanteModal';
import { AdminDebutanteDetailView } from './AdminDebutanteDetailView';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { DebutanteAccount, EventType } from '../../types/admin';

interface AdminDebutantesViewProps {
  onOpenDebutanteApp?: (slug: string) => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminDebutantesView: React.FC<AdminDebutantesViewProps> = ({
  onOpenLead,
}) => {
  const { 
    debutantes, 
    venues, 
    activeVenueId, 
    deleteDebutanteAccount,
    toggleDebutanteStatus,
    currentUser,
    templates,
  } = useAdminState();

  const canManage = currentUser?.role === 'master' || currentUser?.role === 'admin';

  // Selected Debutante for In-Page Detail View
  const [selectedDebutanteId, setSelectedDebutanteId] = useState<string | null>(null);

  // View Mode: 'grid' (3 cards per row) | 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debutanteToEdit, setDebutanteToEdit] = useState<DebutanteAccount | null>(null);
  const [debutanteToDelete, setDebutanteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<'all' | 'active' | 'inactive' | 'journey' | 'guests_only'>('all');
  const [filterEventType, setFilterEventType] = useState<EventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [filterState, setFilterState] = useState<FilterState>({
    period: 'all',
    venueId: 'all',
    collaboratorId: 'all',
    sortBy: 'recent',
  });

  const sortOptions = [
    { id: 'recent', label: 'Mais Recentes (Cadastro)' },
    { id: 'oldest', label: 'Mais Antigas (Cadastro)' },
    { id: 'name_asc', label: 'Ordem Alfabética (A-Z)' },
    { id: 'name_desc', label: 'Ordem Alfabética (Z-A)' },
    { id: 'party_soonest', label: 'Festa Mais Próxima' },
    { id: 'party_furthest', label: 'Festa Mais Distante' },
  ];

  const filteredDebutantes = useMemo(() => {
    return debutantes.filter(d => {
      // 1. Venue Filter
      const venueTarget = filterState.venueId !== 'all' ? filterState.venueId : activeVenueId;
      const matchesVenue = !venueTarget || d.venueId === venueTarget;
      if (!matchesVenue) return false;

      // 2. Event Type Filter
      if (filterEventType !== 'all') {
        const itemType = d.eventType || 'debutante_15';
        if (itemType !== filterEventType) return false;
      }

      // 3. Status / Module Filter
      const isInactive = d.status === 'inactive';
      if (filterModule === 'active' && isInactive) return false;
      if (filterModule === 'inactive' && !isInactive) return false;
      if (filterModule === 'journey' && (!d.hasJourneyEnabled || isInactive)) return false;
      if (filterModule === 'guests_only' && (d.hasJourneyEnabled || isInactive)) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesPhone = d.phone.includes(q);
        const matchesEmail = d.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }

      // 5. Period / Temporal Filter
      if (filterState.period !== 'all') {
        const today = new Date();
        const createdDate = new Date(d.createdAt || Date.now());
        const diffCreatedDays = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const todayStr = today.toISOString().split('T')[0];

        if (filterState.period === 'today' && (d.createdAt || '').split('T')[0] !== todayStr) return false;
        if (filterState.period === '7d' && (diffCreatedDays < 0 || diffCreatedDays > 7)) return false;
        if (filterState.period === '30d' && (diffCreatedDays < 0 || diffCreatedDays > 30)) return false;
        if (filterState.period === 'this_month') {
          if (createdDate.getMonth() !== today.getMonth() || createdDate.getFullYear() !== today.getFullYear()) return false;
        }
        if (filterState.period === 'custom' && filterState.customStartDate && filterState.customEndDate) {
          const createdStr = (d.createdAt || '').split('T')[0];
          if (createdStr < filterState.customStartDate || createdStr > filterState.customEndDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const sortBy = filterState.sortBy || 'recent';
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'party_soonest') return new Date(a.partyDate).getTime() - new Date(b.partyDate).getTime();
      if (sortBy === 'party_furthest') return new Date(b.partyDate).getTime() - new Date(a.partyDate).getTime();
      if (sortBy === 'oldest') return (new Date(a.createdAt || '').getTime() || 0) - (new Date(b.createdAt || '').getTime() || 0);
      return (new Date(b.createdAt || '').getTime() || 0) - (new Date(a.createdAt || '').getTime() || 0);
    });
  }, [debutantes, activeVenueId, filterState, filterModule, filterEventType, searchQuery]);

  const handleCopyExclusiveLink = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/?debutante=${encodeURIComponent(slug)}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleSendWhatsAppAccess = (debutante: DebutanteAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const venue = venues.find(v => v.id === debutante.venueId);
    const venueName = venue?.name || 'Espaço Bonomo';
    const link = `${window.location.origin}/?debutante=${encodeURIComponent(debutante.slug)}`;
    
    const text = `Olá, ${debutante.name}! 👑✨\nSeu aplicativo oficial para os seus 15 Anos no ${venueName} está pronto!\n\nAcesse diretamente pelo seu link exclusivo:\n${link}`;
    const cleanPhone = debutante.phone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenAppDirect = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/?debutante=${encodeURIComponent(slug)}`, '_blank');
  };

  const handleOpenInviteDirect = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/?convite=${encodeURIComponent(slug)}`, '_blank');
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
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── HEADER BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1.5px solid var(--adm-border)',
        paddingBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'var(--adm-bg-card)',
            border: '1.5px solid var(--adm-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(212,175,55,0.25)',
          }}>
            <Gift size={22} color="var(--adm-accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
              Aplicativo • Contas & Convidados
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
              Gestão de contas, convites e links de acesso ao aplicativo oficial (/app/:slug)
            </p>
          </div>
        </div>

        {!selectedDebutanteId && (
          <button
            onClick={() => {
              setDebutanteToEdit(null);
              setIsModalOpen(true);
            }}
            className="adm-btn-primary"
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            <span>Cadastrar Conta no App</span>
          </button>
        )}
      </div>

      {/* ── ANIVERSARIANTES CONTENT ─────────────────────────────── */}
      {selectedDebutanteId ? (
        (() => {
          const deb = debutantes.find(d => d.id === selectedDebutanteId);
          if (!deb) return null;
          return (
            <AdminDebutanteDetailView
              debutante={deb}
              venue={venues.find(v => v.id === deb.venueId)}
              onBack={() => setSelectedDebutanteId(null)}
              onEdit={() => {
                setDebutanteToEdit(deb);
                setIsModalOpen(true);
              }}
              onOpenLead={onOpenLead}
            />
          );
        })()
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                placeholder="Buscar aniversariante por nome, telefone ou e-mail..."
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

            <AdminFilterBar
              filters={filterState}
              onChange={setFilterState}
              showCollaboratorFilter={false}
              showSortFilter={true}
              sortOptions={sortOptions}
              resultCount={filteredDebutantes.length}
              totalCount={debutantes.length}
              labelUnit="aniversariantes"
            />

            {/* Event Category Filter Pills (Limpo, sem emojis) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'all', label: 'Todos os Eventos' },
                { id: 'debutante_15', label: '15 Anos' },
                { id: 'birthday_kids', label: 'Infantil' },
                { id: 'birthday_adult', label: 'Adulto' },
                { id: 'baby_shower', label: 'Chá de Bebê' },
                { id: 'wedding_anniversary', label: 'Bodas / Casamento' },
                { id: 'graduation', label: 'Formatura' },
                { id: 'corporate', label: 'Corporativo' },
                { id: 'other', label: 'Outros' },
              ].map(typeTab => (
                <button
                  key={typeTab.id}
                  type="button"
                  onClick={() => setFilterEventType(typeTab.id as any)}
                  style={{
                    background: filterEventType === typeTab.id ? 'rgba(212, 175, 55, 0.2)' : 'var(--adm-bg-card)',
                    border: `1px solid ${filterEventType === typeTab.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                    color: filterEventType === typeTab.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    borderRadius: '16px',
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: filterEventType === typeTab.id ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{typeTab.label}</span>
                </button>
              ))}
            </div>

            {/* Module Filter Pills & Right-Aligned Cards/List Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `Todas (${debutantes.length})` },
                  { id: 'active', label: `Ativas (${debutantes.filter(d => d.status !== 'inactive').length})` },
                  { id: 'inactive', label: `Inativas / Encerradas (${debutantes.filter(d => d.status === 'inactive').length})` },
                  { id: 'journey', label: `Com Jornada VIP (${debutantes.filter(d => d.hasJourneyEnabled && d.status !== 'inactive').length})` },
                  { id: 'guests_only', label: `Apenas Convidados (${debutantes.filter(d => !d.hasJourneyEnabled && d.status !== 'inactive').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterModule(tab.id as any)}
                    style={{
                      background: filterModule === tab.id ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                      border: filterModule === tab.id ? '1px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                      color: filterModule === tab.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                      borderRadius: '20px',
                      padding: '5px 14px',
                      fontSize: '0.74rem',
                      fontWeight: filterModule === tab.id ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Grid vs List (Right Side) */}
              <div style={{
                display: 'flex',
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                borderRadius: '12px',
                padding: '3px',
                gap: '2px',
              }}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Visualização em Cards (3 por linha)"
                  style={{
                    background: viewMode === 'grid' ? 'var(--adm-accent-bg)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: viewMode === 'grid' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  <LayoutGrid size={14} />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Visualização em Lista Compacta"
                  style={{
                    background: viewMode === 'list' ? 'var(--adm-accent-bg)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  <List size={14} />
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredDebutantes.length === 0 ? (
            <div style={{
              background: 'var(--adm-bg-card)',
              borderRadius: '18px',
              padding: '48px 20px',
              textAlign: 'center',
              border: '1px dashed var(--adm-border)',
            }}>
              <Users size={36} color="var(--adm-accent)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Nenhuma aniversariante encontrada</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: '4px auto 16px auto', maxWidth: '400px' }}>
                Cadastre novas debutantes para gerar seus links exclusivos de acesso ao aplicativo.
              </p>
              <button
                onClick={() => {
                  setDebutanteToEdit(null);
                  setIsModalOpen(true);
                }}
                className="adm-btn-primary"
                style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, margin: '0 auto' }}
              >
                <Plus size={15} /> Cadastrar Primeira Aniversariante
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID CARDS VIEW (3 per row) ────────────────────────────────── */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}>
              {filteredDebutantes.map(deb => {
                const venue = venues.find(v => v.id === deb.venueId);
                const isCopied = copiedSlug === deb.slug;
                const guestsConfirmed = deb.guests.filter(g => g.status === 'confirmed').length;
                const totalReferrals = deb.referrals?.length || 0;

                const getEventBadge = (type?: EventType) => {
                  switch (type) {
                    case 'birthday_kids': return { label: 'Infantil', icon: '🎈', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
                    case 'birthday_adult': return { label: 'Adulto', icon: '🥂', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)' };
                    case 'baby_shower': return { label: 'Chá Bebê', icon: '🍼', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.12)' };
                    case 'wedding_anniversary': return { label: 'Bodas', icon: '💍', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' };
                    case 'graduation': return { label: 'Formatura', icon: '🎓', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
                    case 'corporate': return { label: 'Corporativo', icon: '🏢', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' };
                    case 'other': return { label: 'Outro', icon: '✨', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' };
                    default: return { label: '15 Anos', icon: '👑', color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.12)' };
                  }
                };
                const eventBadge = getEventBadge(deb.eventType);

                return (
                  <div
                    key={deb.id}
                    className="saas-card"
                    onClick={() => setSelectedDebutanteId(deb.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Top Row: Avatar, Name & Venue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={deb.avatarUrl}
                        alt={deb.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--adm-accent)',
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <h3 style={{
                            fontSize: '1.02rem',
                            fontWeight: 800,
                            color: 'var(--adm-text-title)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {deb.name}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <span style={{
                              background: eventBadge.bg,
                              color: eventBadge.color,
                              border: `1px solid ${eventBadge.color}40`,
                              borderRadius: '6px',
                              padding: '1px 5px',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                            }}>
                              {eventBadge.icon} {eventBadge.label}
                            </span>

                            {deb.status === 'inactive' ? (
                              <span style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#EF4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                padding: '2px 6px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                              }}>
                                Inativa
                              </span>
                            ) : (
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                padding: '2px 6px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                              }}>
                                Ativa
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building2 size={12} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue?.name || 'Casa não vinculada'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Date & Countdown */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--adm-bg-input)',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                    }}>
                      <span style={{ color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} color="var(--adm-accent)" />
                        <span>Festa: <strong style={{ color: 'var(--adm-text-title)' }}>{deb.partyDate.split('-').reverse().join('/')}</strong></span>
                      </span>
                      <span style={{ color: 'var(--adm-accent)', fontWeight: 650 }}>
                        Faltam {deb.partyDaysLeft} dias
                      </span>
                    </div>

                    {/* Metrics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Convidados</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{guestsConfirmed} / {deb.currentGuestLimit}</div>
                      </div>

                      <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Indicações</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-accent)' }}>{totalReferrals}</div>
                      </div>

                      <div style={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '10px', padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Vendas VIP</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-green)' }}>{deb.convertedReferralSales}</div>
                      </div>
                    </div>

                    {/* Jornada VIP de Prêmios & Progresso Real-time */}
                    {deb.hasJourneyEnabled && (() => {
                      const currentSales = deb.convertedReferralSales || 0;
                      const template = templates.find(t => t.id === deb.journeyTemplateId) || templates[0];
                      const rewards = template?.vipRewards || [];
                      const nextReward = rewards.find(r => r.requiredSales > currentSales) || rewards[rewards.length - 1];
                      const targetRequired = nextReward ? nextReward.requiredSales : 5;
                      const progressPercent = Math.min(100, Math.round((currentSales / (targetRequired || 1)) * 100));
                      const remainingSales = Math.max(0, targetRequired - currentSales);

                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#D4AF37' }}>
                              <Crown size={12} />
                              <span>Jornada VIP {nextReward ? `• ${nextReward.name}` : ''}</span>
                            </span>
                            <span style={{ fontWeight: 800, color: '#D4AF37' }}>
                              {progressPercent}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${progressPercent}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #D4AF37 0%, #F59E0B 100%)',
                              borderRadius: '6px',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--adm-text-muted)' }}>
                            <span>{currentSales} {currentSales === 1 ? 'venda confirmada' : 'vendas confirmadas'}</span>
                            <span style={{ fontWeight: remainingSales === 0 ? 800 : 500, color: remainingSales === 0 ? '#10B981' : 'var(--adm-text-muted)' }}>
                              {remainingSales > 0 ? `Falta ${remainingSales} para o prêmio` : '🏆 Meta Conquistada!'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--adm-border)',
                      gap: '6px',
                    }}>
                      {/* Open App & Open Invite Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenAppDirect(deb.slug, e)}
                          title="Abrir o App da Debutante"
                          style={{
                            background: 'rgba(212, 175, 55, 0.12)',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            color: 'var(--adm-accent)',
                            borderRadius: '10px',
                            padding: '6px 9px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>App</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenInviteDirect(deb.slug, e)}
                          title="Abrir o Convite Oficial"
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-title)',
                            borderRadius: '10px',
                            padding: '6px 9px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Mail size={12} color="var(--adm-accent)" />
                          <span>Convite</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Toggle Status (Ativar / Desativar) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDebutanteStatus(deb.id);
                          }}
                          title={deb.status === 'inactive' ? 'Reativar acesso da debutante' : 'Desativar acesso da debutante'}
                          style={{
                            background: deb.status === 'inactive' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                            border: `1px solid ${deb.status === 'inactive' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: deb.status === 'inactive' ? '#10B981' : '#EF4444',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Power size={13} />
                        </button>

                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyExclusiveLink(deb.slug, e)}
                          title="Copiar link exclusivo da debutante"
                          style={{
                            background: isCopied ? 'var(--adm-green)' : 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: isCopied ? '#FFF' : 'var(--adm-text-title)',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                        </button>

                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={(e) => handleSendWhatsAppAccess(deb, e)}
                          title="Enviar link via WhatsApp"
                          style={{
                            background: 'rgba(37, 211, 102, 0.12)',
                            border: '1px solid rgba(37, 211, 102, 0.3)',
                            color: '#25D366',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={13} />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDebutanteToEdit(deb);
                            setIsModalOpen(true);
                          }}
                          title="Editar cadastro"
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-muted)',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Delete - apenas para Gerentes, Master e Dev */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDebutanteToDelete({ id: deb.id, name: deb.name });
                            }}
                            title="Excluir aniversariante"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: 'var(--adm-red)',
                              borderRadius: '8px',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── LIST VIEW (Table Rows) ─────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredDebutantes.map(deb => {
                const venue = venues.find(v => v.id === deb.venueId);
                const isCopied = copiedSlug === deb.slug;
                const totalReferrals = deb.referrals?.length || 0;

                return (
                  <div
                    key={deb.id}
                    onClick={() => setSelectedDebutanteId(deb.id)}
                    style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '14px',
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                      <img
                        src={deb.avatarUrl}
                        alt={deb.name}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--adm-accent)',
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {deb.name}
                          </span>
                          {deb.status === 'inactive' ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800 }}>
                              Inativa
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800 }}>
                              Ativa
                            </span>
                          )}
                          {deb.hasJourneyEnabled && (
                            <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800 }}>
                              Jornada VIP
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={11} color="var(--adm-accent)" />
                            <span>{venue?.name || 'Sem casa'}</span>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} color="var(--adm-accent)" />
                            <span>{deb.partyDate.split('-').reverse().join('/')} ({deb.partyDaysLeft}d)</span>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} color="var(--adm-accent)" />
                            <span>{formatPhone(deb.phone)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-accent)' }}>
                          {totalReferrals} indicações
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--adm-green)', fontWeight: 700 }}>
                          {deb.convertedReferralSales} vendas VIP
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleOpenAppDirect(deb.slug, e)}
                        style={{
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          color: 'var(--adm-accent)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>App</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenInviteDirect(deb.slug, e)}
                        title="Abrir Convite Oficial"
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-title)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Mail size={13} color="var(--adm-accent)" />
                        <span>Convite</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDebutanteStatus(deb.id);
                          }}
                          title={deb.status === 'inactive' ? 'Reativar acesso' : 'Desativar acesso'}
                          style={{
                            background: deb.status === 'inactive' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                            border: `1px solid ${deb.status === 'inactive' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: deb.status === 'inactive' ? '#10B981' : '#EF4444',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Power size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyExclusiveLink(deb.slug, e)}
                          title="Copiar link"
                          style={{
                            background: isCopied ? 'var(--adm-green)' : 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: isCopied ? '#FFF' : 'var(--adm-text-title)',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDebutanteToEdit(deb);
                            setIsModalOpen(true);
                          }}
                          style={{
                            background: 'var(--adm-bg-input)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-muted)',
                            borderRadius: '8px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {/* Create / Edit Debutante */}
      {isModalOpen && (
        <AdminDebutanteModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setDebutanteToEdit(null);
          }}
          debutanteToEdit={debutanteToEdit}
        />
      )}



      {/* Delete Confirm Modal */}
      {debutanteToDelete && (
        <AdminConfirmModal
          isOpen={Boolean(debutanteToDelete)}
          onClose={() => setDebutanteToDelete(null)}
          title="Excluir Aniversariante"
          message={`Tem certeza que deseja excluir "${debutanteToDelete.name}"? A jornada e a lista de convidados serão removidas. As indicações e leads gerados no CRM continuarão preservados com o histórico de indicação intacto.`}
          confirmText="Sim, Excluir Aniversariante"
          danger={true}
          onConfirm={() => {
            deleteDebutanteAccount(debutanteToDelete.id);
            setDebutanteToDelete(null);
          }}
        />
      )}
    </div>
  );
};
