import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Share2, Eye, Send, 
  Sparkles, Gift, Edit3, Trash2, Check, 
  ExternalLink, Building2, Search
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminFilterBar, type FilterState } from './AdminFilterBar';
import { AdminDebutanteModal } from './AdminDebutanteModal';
import { AdminPrizeConfigModal } from './AdminPrizeConfigModal';
import type { DebutanteAccount } from '../../types/admin';

interface AdminDebutantesViewProps {
  onOpenDebutanteApp: (slug: string) => void;
}

export const AdminDebutantesView: React.FC<AdminDebutantesViewProps> = ({
  onOpenDebutanteApp,
}) => {
  const { 
    debutantes, 
    venues, 
    templates,
    activeVenueId, 
    deleteDebutanteAccount,
    updateDebutanteModuleToggle,
    linkDebutanteJourney 
  } = useAdminState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debutanteToEdit, setDebutanteToEdit] = useState<DebutanteAccount | null>(null);
  const [debutanteToDelete, setDebutanteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [prizeModalDebutante, setPrizeModalDebutante] = useState<DebutanteAccount | null>(null);
  const [linkJourneyDebutante, setLinkJourneyDebutante] = useState<DebutanteAccount | null>(null);
  const [selectedTemplateToLink, setSelectedTemplateToLink] = useState<string>('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<'all' | 'journey' | 'guests_only'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [filterState, setFilterState] = useState<FilterState>({
    period: '7d',
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

  const handleCopyExclusiveLink = (slug: string) => {
    const url = `${window.location.origin}${window.location.pathname}?debutante=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleSendWhatsAppAccess = (debutante: DebutanteAccount) => {
    const venue = venues.find(v => v.id === debutante.venueId);
    const venueName = venue?.name || 'Espaço Rio Lounge';
    const link = `${window.location.origin}${window.location.pathname}?debutante=${debutante.slug}`;
    
    const text = `Olá, ${debutante.name}! 👑✨\nSeu aplicativo oficial para os seus 15 Anos no ${venueName} está pronto!\n\nAcesse diretamente pelo seu link exclusivo:\n${link}`;
    const cleanPhone = debutante.phone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      maxWidth: '1440px',
      margin: '0 auto',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px 0',
          }}>
            Gestão de Aniversariantes & Debutantes
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: 0 }}>
            Gere links exclusivos sem login, configure prêmios e acompanhe o progresso de cada festa.
          </p>
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
          <span>Cadastrar Debutante</span>
        </button>
      </div>

      {/* ── SEARCH & RICH FILTER BAR ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          <input
            type="text"
            placeholder="Buscar debutante por nome, telefone ou e-mail..."
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

        {/* Rich Multi-Filter Bar */}
        <AdminFilterBar
          filters={filterState}
          onChange={setFilterState}
          showSortFilter={true}
          sortOptions={sortOptions}
          resultCount={filteredDebutantes.length}
          totalCount={debutantes.length}
          labelUnit="debutantes"
        />

        {/* Module Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '4px 0' }}>
          {[
            { id: 'all', label: `Todas as Festas (${debutantes.length})` },
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

      {/* Debutantes List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px auto' }}>
              {debutantes.length === 0 
                ? 'Cadastre novas debutantes para gerar seus links exclusivos de acesso ao aplicativo.'
                : 'Nenhum resultado corresponde aos filtros selecionados.'}
            </p>
            {debutantes.length === 0 && (
              <button
                onClick={() => {
                  setDebutanteToEdit(null);
                  setIsModalOpen(true);
                }}
                className="adm-btn-primary"
                style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, margin: '0 auto' }}
              >
                <Plus size={15} /> Cadastrar Primeira Debutante
              </button>
            )}
          </div>
        ) : (
          filteredDebutantes.map(deb => {
            const venue = venues.find(v => v.id === deb.venueId);
            const isCopied = copiedSlug === deb.slug;
            const guestsConfirmed = deb.guests.filter(g => g.status === 'confirmed').length;

            return (
              <div
                key={deb.id}
                className="saas-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Top Info Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={deb.avatarUrl}
                      alt={deb.name}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--adm-accent)',
                      }}
                    />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: 'var(--adm-text-title)',
                          margin: 0,
                          letterSpacing: '-0.3px',
                        }}>
                          {deb.name}
                        </h3>

                        {/* Casa de Festas Badge */}
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Building2 size={12} /> {venue?.name || 'Casa não vinculada'}
                        </span>

                        {deb.isJourneyPending ? (
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.15)',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            color: '#EAB308',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            ⏳ Pendente de Vinculação
                          </span>
                        ) : deb.hasJourneyEnabled ? (
                          <span style={{
                            background: 'var(--adm-accent-bg)',
                            border: '1px solid var(--adm-accent)',
                            color: 'var(--adm-accent)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Sparkles size={11} /> Jornada VIP Ativa
                          </span>
                        ) : (
                          <span style={{
                            background: 'var(--adm-bg-elevated)',
                            border: '1px solid var(--adm-border)',
                            color: 'var(--adm-text-muted)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}>
                            Convidados & Agenda
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span>📅 Festa: <strong>{deb.partyDate.split('-').reverse().join('/')}</strong> (Faltam {deb.partyDaysLeft} dias)</span>
                        <span>📱 WhatsApp: <strong>{deb.phone}</strong></span>
                        {deb.email && <span>✉️ {deb.email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Quick Metrics Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '6px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Convidados</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{guestsConfirmed} / {deb.currentGuestLimit}</div>
                    </div>

                    {deb.hasJourneyEnabled && (
                      <>
                        <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '6px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--adm-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Indicações</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-accent)' }}>{deb.validReferrals} / {deb.totalTargetReferrals}</div>
                        </div>

                        <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '6px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--adm-green)', textTransform: 'uppercase', fontWeight: 700 }}>Vendas VIP</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-green)' }}>{deb.convertedReferralSales}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Link & Sharing Actions Bar */}
                <div style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleCopyExclusiveLink(deb.slug)}
                      style={{
                        background: isCopied ? 'var(--adm-green)' : 'var(--adm-accent)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '20px',
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
                      {isCopied ? <Check size={12} /> : <Share2 size={12} />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsAppAccess(deb)}
                      style={{
                        background: 'rgba(37, 211, 102, 0.15)',
                        border: '1px solid #25D366',
                        color: '#25D366',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Send size={12} />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenDebutanteApp(deb.slug)}
                    style={{
                      background: 'var(--adm-accent-bg)',
                      border: '1px solid var(--adm-border-hover)',
                      color: 'var(--adm-accent)',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Eye size={12} />
                    <span>App</span>
                    <ExternalLink size={10} />
                  </button>
                </div>

                {/* Bottom Actions Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--adm-border)',
                  paddingTop: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* View Debutante App Button */}
                    <button
                      onClick={() => onOpenDebutanteApp(deb.slug)}
                      style={{
                        background: 'var(--adm-accent-bg)',
                        border: '1px solid var(--adm-border-hover)',
                        color: 'var(--adm-accent)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Eye size={13} />
                      <span>Visualizar App</span>
                      <ExternalLink size={11} />
                    </button>

                    {/* Configure Prizes (Only if journey enabled) */}
                    {/* If Journey is Pending Linkage: Prominent Link Button */}
                    {deb.isJourneyPending && (
                      <button
                        onClick={() => {
                          setLinkJourneyDebutante(deb);
                          setSelectedTemplateToLink(templates[0]?.id || '');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
                          border: 'none',
                          color: '#000000',
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
                        }}
                      >
                        <Sparkles size={13} color="#000" />
                        <span>Vincular Modelo de Jornada</span>
                      </button>
                    )}

                    {/* Configure Prizes (Only if journey enabled and not pending) */}
                    {deb.hasJourneyEnabled && !deb.isJourneyPending && (
                      <button
                        onClick={() => setPrizeModalDebutante(deb)}
                        style={{
                          background: 'rgba(236, 72, 153, 0.15)',
                          border: '1px solid rgba(236, 72, 153, 0.35)',
                          color: '#EC4899',
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Gift size={13} />
                        <span>Configurar Prêmios</span>
                      </button>
                    )}

                    {/* Fast Module Switcher Toggle */}
                    <button
                      onClick={() => updateDebutanteModuleToggle(deb.id, !deb.hasJourneyEnabled)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-muted)',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      {deb.hasJourneyEnabled ? 'Desativar Jornada' : 'Ativar Jornada VIP'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setDebutanteToEdit(deb);
                        setIsModalOpen(true);
                      }}
                      style={{
                        background: 'var(--adm-bg-elevated)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-title)',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '0.74rem',
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebutanteToDelete({ id: deb.id, name: deb.name });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--adm-red)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '6px',
                      }}
                      title="Excluir debutante"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* In-App Deletion Confirmation Modal */}
      {debutanteToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Trash2 size={20} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  Excluir Debutante
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  Esta ação removerá a conta de acesso da debutante.
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: 'var(--adm-text-title)',
              lineHeight: 1.5,
            }}>
              Tem certeza que deseja excluir <strong>"{debutanteToDelete.name}"</strong>?
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-green)', fontWeight: 700, marginTop: '8px' }}>
                ✓ Os leads indicados por ela continuarão 100% preservados no CRM.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setDebutanteToDelete(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteDebutanteAccount(debutanteToDelete.id);
                  setDebutanteToDelete(null);
                }}
                style={{
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation / Edit Modal */}
      <AdminDebutanteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        debutanteToEdit={debutanteToEdit}
      />

      {/* Prize Config Modal */}
      <AdminPrizeConfigModal
        isOpen={Boolean(prizeModalDebutante)}
        onClose={() => setPrizeModalDebutante(null)}
        debutante={prizeModalDebutante}
      />

      {/* Vincular Modelo de Jornada Modal */}
      {linkJourneyDebutante && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sparkles size={20} color="#EAB308" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                  Vincular Modelo de Jornada
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                  Debutante: <strong>{linkJourneyDebutante.name}</strong>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: 'var(--adm-text-title)',
              lineHeight: 1.5,
            }}>
              Selecione o modelo de jornada pré-configurado que deseja atribuir a esta debutante. Ao vincular, as metas de indicação, os benefícios e os presentes VIP serão ativados no aplicativo dela.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Modelo de Jornada Disponível *
              </label>

              {templates.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.8rem', background: 'var(--adm-bg-input)', borderRadius: '12px' }}>
                  Nenhum modelo de jornada cadastrado. Crie um modelo na aba "Modelos & Jornadas".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {templates.map(tmpl => {
                    const isSelected = (selectedTemplateToLink || templates[0]?.id) === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateToLink(tmpl.id)}
                        style={{
                          background: isSelected ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                          border: `1.5px solid ${isSelected ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                          borderRadius: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="linkTemplateSelect"
                          checked={isSelected}
                          onChange={() => setSelectedTemplateToLink(tmpl.id)}
                          style={{ accentColor: 'var(--adm-accent)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isSelected ? 'var(--adm-accent)' : 'var(--adm-text-title)' }}>
                            {tmpl.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                            {tmpl.milestones?.length || 0} Metas/Benefícios • {tmpl.vipRewards?.length || 0} Presentes VIP
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setLinkJourneyDebutante(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={templates.length === 0}
                onClick={() => {
                  const templateId = selectedTemplateToLink || templates[0]?.id;
                  if (templateId && linkJourneyDebutante) {
                    linkDebutanteJourney(linkJourneyDebutante.id, templateId);
                    setLinkJourneyDebutante(null);
                  }
                }}
                className="adm-btn-primary"
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: templates.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: templates.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>Vincular e Ativar Jornada</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
