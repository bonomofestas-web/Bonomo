import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Share2, Send, 
  Gift, Edit3, Trash2, Check, 
  ExternalLink, Building2, Search, LayoutGrid, List,
  Calendar, Target
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminDebutanteModal } from './AdminDebutanteModal';
import { AdminDebutanteDetailModal } from './AdminDebutanteDetailModal';
import { AdminBenefitsCatalogView } from './AdminBenefitsCatalogView';
import { AdminJourneysConfigView } from './AdminJourneysConfigView';
import { AdminAppointmentsView } from './AdminAppointmentsView';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { DebutanteAccount } from '../../types/admin';

interface AdminDebutantesViewProps {
  onOpenDebutanteApp?: (slug: string) => void;
  initialSubTab?: 'debutantes' | 'benefits' | 'templates' | 'appointments';
}

export const AdminDebutantesView: React.FC<AdminDebutantesViewProps> = ({
  initialSubTab = 'debutantes',
}) => {
  const { 
    debutantes, 
    venues, 
    activeVenueId, 
    deleteDebutanteAccount,
  } = useAdminState();

  // Sub-tabs: 'debutantes' | 'benefits' | 'templates' | 'appointments'
  const [activeSubTab, setActiveSubTab] = useState<'debutantes' | 'benefits' | 'templates' | 'appointments'>(initialSubTab);

  // View Mode: 'grid' (3 cards per row) | 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debutanteToEdit, setDebutanteToEdit] = useState<DebutanteAccount | null>(null);
  const [debutanteToDelete, setDebutanteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [detailModalDebutante, setDetailModalDebutante] = useState<DebutanteAccount | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<'all' | 'journey' | 'guests_only'>('all');
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

      // 2. Module Filter
      if (filterModule === 'journey' && !d.hasJourneyEnabled) return false;
      if (filterModule === 'guests_only' && d.hasJourneyEnabled) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesPhone = d.phone.includes(q);
        const matchesEmail = d.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }

      // 4. Period / Temporal Filter
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
  }, [debutantes, activeVenueId, filterState, filterModule, searchQuery]);

  const handleCopyExclusiveLink = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleSendWhatsAppAccess = (debutante: DebutanteAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const venue = venues.find(v => v.id === debutante.venueId);
    const venueName = venue?.name || 'Espaço Rio Lounge';
    const link = `${window.location.origin}/${debutante.slug}`;
    
    const text = `Olá, ${debutante.name}! 👑✨\nSeu aplicativo oficial para os seus 15 Anos no ${venueName} está pronto!\n\nAcesse diretamente pelo seu link exclusivo:\n${link}`;
    const cleanPhone = debutante.phone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenAppDirect = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/${slug}`, '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── UNIFIED SUB-NAVIGATION HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1.5px solid var(--adm-border)',
        paddingBottom: '16px',
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'debutantes', label: 'Aniversariantes', icon: <Users size={16} />, count: debutantes.length },
            { id: 'benefits', label: 'Prêmios & Benefícios VIP', icon: <Gift size={16} /> },
            { id: 'templates', label: 'Jornadas & Metas', icon: <Target size={16} /> },
            { id: 'appointments', label: 'Compromissos & Degustações', icon: <Calendar size={16} /> },
          ].map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                style={{
                  background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'var(--adm-bg-card)',
                  border: `1.5px solid ${isActive ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  color: isActive ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  borderRadius: '14px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(212, 175, 55, 0.2)' : 'none',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{
                    background: isActive ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                    color: isActive ? '#000' : 'var(--adm-text-title)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Action (only on debutantes tab) */}
        {activeSubTab === 'debutantes' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle: Grid vs List */}
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
                  padding: '6px 10px',
                  color: viewMode === 'grid' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                <LayoutGrid size={15} />
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
                  padding: '6px 10px',
                  color: viewMode === 'list' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                <List size={15} />
                <span>Lista</span>
              </button>
            </div>

            <button
              onClick={() => {
                setDebutanteToEdit(null);
                setIsModalOpen(true);
              }}
              className="adm-btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            >
              <Plus size={16} />
              <span>Cadastrar Aniversariante</span>
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: ANIVERSARIANTES / DEBUTANTES ─────────────────────────────── */}
      {activeSubTab === 'debutantes' && (
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
              showSortFilter={true}
              sortOptions={sortOptions}
              resultCount={filteredDebutantes.length}
              totalCount={debutantes.length}
              labelUnit="aniversariantes"
            />

            {/* Module Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `Todas as Aniversariantes (${debutantes.length})` },
                { id: 'journey', label: `Com Jornada VIP Ativa (${debutantes.filter(d => d.hasJourneyEnabled).length})` },
                { id: 'guests_only', label: `Apenas Convidados & Agenda (${debutantes.filter(d => !d.hasJourneyEnabled).length})` },
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

                return (
                  <div
                    key={deb.id}
                    className="saas-card"
                    onClick={() => setDetailModalDebutante(deb)}
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

                          {deb.hasJourneyEnabled ? (
                            <span style={{
                              background: 'var(--adm-accent-bg)',
                              color: 'var(--adm-accent)',
                              borderRadius: '8px',
                              padding: '2px 6px',
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              Jornada VIP
                            </span>
                          ) : (
                            <span style={{
                              background: 'var(--adm-bg-input)',
                              color: 'var(--adm-text-muted)',
                              borderRadius: '8px',
                              padding: '2px 6px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              Convidados
                            </span>
                          )}
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
                      <span style={{ color: 'var(--adm-text-muted)' }}>
                        📅 Festa: <strong style={{ color: 'var(--adm-text-title)' }}>{deb.partyDate.split('-').reverse().join('/')}</strong>
                      </span>
                      <span style={{ color: 'var(--adm-accent)', fontWeight: 800 }}>
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

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--adm-border)',
                      gap: '6px',
                    }}>
                      {/* Open App */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenAppDirect(deb.slug, e)}
                        style={{
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          color: 'var(--adm-accent)',
                          borderRadius: '10px',
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Visualizar App</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

                        {/* Delete */}
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
                    onClick={() => setDetailModalDebutante(deb)}
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
                          {deb.hasJourneyEnabled && (
                            <span style={{ background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800 }}>
                              Jornada VIP
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                          <span>🏛️ {venue?.name || 'Sem casa'}</span>
                          <span>📅 {deb.partyDate.split('-').reverse().join('/')} ({deb.partyDaysLeft}d)</span>
                          <span>📱 {deb.phone}</span>
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
                        <span>Visualizar</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* ── TAB 2: PRÊMIOS & BENEFÍCIOS VIP ─────────────────────────────────── */}
      {activeSubTab === 'benefits' && (
        <AdminBenefitsCatalogView />
      )}

      {/* ── TAB 3: JORNADAS & METAS ─────────────────────────────────────────── */}
      {activeSubTab === 'templates' && (
        <AdminJourneysConfigView />
      )}

      {/* ── TAB 4: COMPROMISSOS & DEGUSTAÇÕES ───────────────────────────────── */}
      {activeSubTab === 'appointments' && (
        <AdminAppointmentsView />
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

      {/* Detail / Central da Aniversariante Modal */}
      {detailModalDebutante && (
        <AdminDebutanteDetailModal
          isOpen={Boolean(detailModalDebutante)}
          onClose={() => setDetailModalDebutante(null)}
          debutante={detailModalDebutante}
          venue={venues.find(v => v.id === detailModalDebutante.venueId)}
          onEdit={() => {
            setDebutanteToEdit(detailModalDebutante);
            setDetailModalDebutante(null);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {debutanteToDelete && (
        <AdminConfirmModal
          isOpen={Boolean(debutanteToDelete)}
          onClose={() => setDebutanteToDelete(null)}
          title="Excluir Aniversariante"
          message={`Tem certeza que deseja excluir "${debutanteToDelete.name}"? Todos os convidados, indicações e progresso da jornada serão removidos.`}
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
