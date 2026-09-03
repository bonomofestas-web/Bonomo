import React, { useState } from 'react';
import { 
  Users, UserPlus, CheckCircle2, Clock, Search, 
  Heart, Calendar, MessageSquareHeart, Sparkles
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { GuestFormModal } from './GuestFormModal';
import { GuestAddOptionsModal } from './GuestAddOptionsModal';
import { GuestImportContactsModal } from './GuestImportContactsModal';
import { GuestInviteLinkShareModal } from './GuestInviteLinkShareModal';
import { GuestInviteConfigModal } from './GuestInviteConfigModal';
import { GuestDetailView } from './GuestDetailView';
import { GuestPublicLandingPage } from './GuestPublicLandingPage';
import { SwipeableGuestCard } from './SwipeableGuestCard';
import type { Guest } from '../../types';

export const GuestList: React.FC = () => {
  const { 
    guests, 
    debutante,
    currentTheme,
    indicateGuestAsReferral,
    deleteGuest,
  } = useAppState();

  const [guestSubTab, setGuestSubTab] = useState<'guests' | 'messages'>('guests');
  const [likedMessages, setLikedMessages] = useState<Record<string, boolean>>({
    'g2': true, // Demo initial like for Sofia
  });

  const [isAddOptionsModalOpen, setIsAddOptionsModalOpen] = useState(false);
  const [isImportContactsModalOpen, setIsImportContactsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [selectedDetailGuest, setSelectedDetailGuest] = useState<Guest | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublicLandingPageOpen, setIsPublicLandingPageOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Todos');
  const [filterView, setFilterView] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [referralSuccessToast, setReferralSuccessToast] = useState<string | null>(null);

  const totalHeadcount = guests.length;
  const confirmedCount = guests.filter(g => g.status === 'confirmed').length;
  const pendingCount = guests.filter(g => g.status === 'pending').length;
  const declinedCount = guests.filter(g => g.status === 'declined').length;
  const guestsWithMessages = guests.filter(g => Boolean(g.sweetMessage));
  const sweetMessagesCount = guestsWithMessages.length;
  const guestLimit = debutante.currentGuestLimit || 250;

  const toggleMessageLike = (guestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedMessages(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  const handleConvertGuestToReferral = (guest: Guest, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = indicateGuestAsReferral(guest.id);
    if (success) {
      setReferralSuccessToast(`✨ ${guest.name} foi indicada com sucesso para a Casa de Festas! (+1 Ponto)`);
    } else {
      setReferralSuccessToast(`✨ ${guest.name} já constava como indicada.`);
    }
    setTimeout(() => setReferralSuccessToast(null), 3500);
  };

  const handleDeleteGuest = (guestId: string) => {
    const guestName = guests.find(g => g.id === guestId)?.name || 'Convidado';
    deleteGuest(guestId);
    setReferralSuccessToast(`🗑️ ${guestName} foi removido(a) da lista de convidados.`);
    setTimeout(() => setReferralSuccessToast(null), 3500);
  };

  const filteredGuests = guests.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(search.toLowerCase()) || 
      (g.phone && g.phone.includes(search));
      
    const matchesGroup = selectedGroup === 'Todos' || g.group === selectedGroup;
    
    if (filterView === 'confirmed') return matchesSearch && matchesGroup && g.status === 'confirmed';
    if (filterView === 'pending') return matchesSearch && matchesGroup && g.status === 'pending';
    return matchesSearch && matchesGroup;
  });

  const groups = ['Todos', 'Família', 'Escola', 'Amigos', 'VIPs', 'Outros'];

  const handleSendWhatsAppInvite = (guest: Guest, e: React.MouseEvent) => {
    e.stopPropagation();
    const debSlug = debutante.slug || encodeURIComponent(debutante.name.toLowerCase().replace(/\s+/g, '-'));
    const inviteUrl = `${window.location.origin}/?convite=${debSlug}&guestId=${guest.id}`;
    const venueName = currentTheme?.name || 'Casa de Festas';
    const text = `Olá, ${guest.name}! A ${debutante.name} preparou um convite exclusivo para você para os 15 Anos dela no ${venueName}! 👑✨\n\nConfira seu convite e confirme sua presença no link:\n${inviteUrl}`;
    const cleanPhone = guest.phone.replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // If public landing page is active in full screen preview
  if (isPublicLandingPageOpen) {
    return <GuestPublicLandingPage onClose={() => setIsPublicLandingPageOpen(false)} />;
  }

  // If dedicated guest detail sub-page is active
  if (selectedDetailGuest) {
    return (
      <>
        <GuestDetailView 
          guest={selectedDetailGuest}
          onBack={() => setSelectedDetailGuest(null)}
          onEdit={(guest) => {
            setGuestToEdit(guest);
            setIsFormModalOpen(true);
          }}
        />

        <GuestFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          guestToEdit={guestToEdit}
        />
      </>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* Toast Notification */}
      {referralSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
          border: '1.5px solid #FF5C9A',
          color: '#FFF',
          padding: '12px 24px',
          borderRadius: '30px',
          zIndex: 2000,
          boxShadow: '0 8px 32px rgba(255, 92, 154, 0.4)',
          fontSize: '0.86rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <Sparkles size={16} color="#FFD700" />
          <span>{referralSuccessToast}</span>
        </div>
      )}

      {/* ── 1. Universal Top Header (Icon + Title + Subtitle) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '18px',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1.5px solid rgba(212, 175, 55, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(212, 175, 55, 0.25)',
        }}>
          <Users size={24} color="#D4AF37" />
        </div>

        <div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '-0.3px',
          }}>
            Convidados
          </h1>
          <p style={{
            color: '#B5AFA4',
            fontSize: '0.84rem',
            margin: 0,
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: 1.35,
          }}>
            Nesta página você pode gerenciar sua lista oficial de convidados, enviar convites e acompanhar presenças
          </p>
        </div>
      </div>

      {/* ── 2. Party Event Countdown Bar (Clean Informative Banner) ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 14, 28, 0.95) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '16px',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Calendar size={18} color="#D4AF37" />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            color: '#FFFFFF',
            fontFamily: 'Poppins, sans-serif',
            lineHeight: 1.2,
          }}>
            Faltam <span style={{ color: '#FFD700' }}>{debutante.partyDaysLeft} dias</span> para a festa
          </div>
          <div style={{
            fontSize: '0.74rem',
            color: '#B5AFA4',
            fontFamily: "'Montserrat', sans-serif",
            marginTop: '2px',
          }}>
            {debutante.partyDate ? debutante.partyDate.split('-').reverse().join('/') : 'Data a definir'} • <strong style={{ color: '#E8C98D' }}>{currentTheme?.name || 'Casa de Festas'}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Sub-Tab View Selector: [ Lista de Convidados ]  [ Mensagens de Carinho ] ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#100E14',
        padding: '5px',
        borderRadius: '16px',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        marginBottom: '20px',
        gap: '6px',
      }}>
        <button
          onClick={() => setGuestSubTab('guests')}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            border: 'none',
            background: guestSubTab === 'guests'
              ? 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)'
              : 'transparent',
            color: guestSubTab === 'guests' ? '#000000' : '#E0DACD',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.5px',
            boxShadow: guestSubTab === 'guests' ? '0 2px 10px rgba(212, 175, 55, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={16} color={guestSubTab === 'guests' ? '#000' : '#D4AF37'} />
          <span>Lista de Convidados ({totalHeadcount})</span>
        </button>

        <button
          onClick={() => setGuestSubTab('messages')}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            border: 'none',
            background: guestSubTab === 'messages'
              ? 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)'
              : 'transparent',
            color: guestSubTab === 'messages' ? '#000000' : '#E0DACD',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.5px',
            boxShadow: guestSubTab === 'messages' ? '0 2px 10px rgba(212, 175, 55, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <MessageSquareHeart size={16} color={guestSubTab === 'messages' ? '#000' : '#D4AF37'} />
          <span>Mensagens de Carinho ({sweetMessagesCount})</span>
        </button>
      </div>

      {/* ── SUB-TAB 1: LISTA DE CONVIDADOS ── */}
      {guestSubTab === 'guests' && (
        <>
          {/* Header & Action Buttons & 4-Quadrant KPIs */}
          <div style={{
            background: 'linear-gradient(135deg, #121212 0%, #0A0A0A 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '24px',
            padding: '22px 22px',
            marginBottom: '20px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          }}>
            {/* Symmetrical 2-Column Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '18px' }}>
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                style={{
                  background: 'rgba(212, 175, 55, 0.12)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#E8C98D',
                  borderRadius: '16px',
                  padding: '11px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.5px',
                }}
              >
                <span>⚙️ Personalizar Convite</span>
              </button>

              <button 
                onClick={() => setIsAddOptionsModalOpen(true)} 
                style={{
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '11px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                }}
              >
                <UserPlus size={15} color="#000" />
                <span>Adicionar Convidado</span>
              </button>
            </div>

            {/* Symmetrical 4-Quadrant (2x2) KPI Grid */}
            <div className="guest-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* 1. Total */}
              <div 
                onClick={() => setFilterView('all')}
                style={{ 
                  background: filterView === 'all' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                  border: filterView === 'all' ? '1.5px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#B5AFA4', fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: '0.5px' }}>TOTAL DE PESSOAS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D4AF37', marginTop: '2px' }}>{totalHeadcount} <span style={{ fontSize: '0.74rem', color: '#9E988D', fontWeight: 500 }}>/ {guestLimit}</span></div>
              </div>

              {/* 2. Confirmados */}
              <div 
                onClick={() => setFilterView('confirmed')}
                style={{ 
                  background: filterView === 'confirmed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.06)', 
                  border: filterView === 'confirmed' ? '1.5px solid #34D399' : '1px solid rgba(16, 185, 129, 0.25)', 
                  borderRadius: '16px', 
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Cinzel', serif" }}><CheckCircle2 size={11} /> CONFIRMADOS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>{confirmedCount}</div>
              </div>

              {/* 3. Aguardando */}
              <div 
                onClick={() => setFilterView('pending')}
                style={{ 
                  background: filterView === 'pending' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.06)', 
                  border: filterView === 'pending' ? '1.5px solid #E8C98D' : '1px solid rgba(212, 175, 55, 0.25)', 
                  borderRadius: '16px', 
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#E8C98D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Cinzel', serif" }}><Clock size={11} /> AGUARDANDO</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E8C98D', marginTop: '2px' }}>{pendingCount}</div>
              </div>

              {/* 4. Recusados / Não Vão */}
              <div 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.06)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '16px', 
                  padding: '12px 14px',
                  cursor: 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: '0.5px' }}>RECUSADOS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>{declinedCount}</div>
              </div>
            </div>
          </div>

          {/* ── Search & Group Filter Pills (No Scrollbar, Touch-Swipe) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Search size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1.5px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '24px',
                  padding: '9px 14px 9px 38px',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Horizontal Filter with invisible scrollbar & touch swipe */}
            <div 
              className="guest-filter-scroll hide-scrollbar"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '2px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {groups.map((g) => {
                const isSelected = selectedGroup === g;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141414',
                      color: isSelected ? '#000000' : '#E0DACD',
                      border: isSelected ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
                      padding: '7px 18px',
                      borderRadius: '20px',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 10px rgba(212, 175, 55, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                      lineHeight: 1.2,
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Guest Cards List (Swipe to Delete + Detail View) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredGuests.length === 0 ? (
              <div style={{
                background: '#121212',
                borderRadius: '20px',
                padding: '44px 20px',
                textAlign: 'center',
                border: '1px dashed rgba(212, 175, 55, 0.3)',
              }}>
                <Users size={36} color="#D4AF37" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Nenhum convidado encontrado</div>
                <p style={{ fontSize: '0.82rem', color: '#B5AFA4', marginTop: '4px' }}>
                  Compartilhe o link de convite ou adicione manualmente seus amigos e familiares.
                </p>
              </div>
            ) : (
              filteredGuests.map(g => (
                <SwipeableGuestCard
                  key={g.id}
                  guest={g}
                  onClick={() => setSelectedDetailGuest(g)}
                  onDelete={handleDeleteGuest}
                  onSendWhatsApp={handleSendWhatsAppInvite}
                  onReferral={handleConvertGuestToReferral}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ── SUB-TAB 2: MENSAGENS DE CARINHO (Dedicated Wall) ── */}
      {guestSubTab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease-out' }}>
          {guestsWithMessages.length === 0 ? (
            <div style={{
              background: '#121212',
              borderRadius: '24px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1.5px dashed rgba(212, 175, 55, 0.3)',
            }}>
              <MessageSquareHeart size={44} color="#D4AF37" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', fontFamily: "'Playfair Display', Georgia, serif", margin: '0 0 6px 0' }}>
                Nenhum recado recebido ainda
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#B5AFA4', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                Quando seus convidados confirmarem presença pelo link oficial de convite, os recados carinhosos deles aparecerão reunidos nesta galeria especial!
              </p>
            </div>
          ) : (
            guestsWithMessages.map(g => {
              const isLiked = Boolean(likedMessages[g.id]);

              return (
                <div
                  key={`msg-${g.id}`}
                  style={{
                    background: 'linear-gradient(135deg, #161513 0%, #0E0D0B 100%)',
                    border: isLiked ? '1.5px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.25)',
                    borderRadius: '20px',
                    padding: '22px 24px',
                    boxShadow: isLiked
                      ? '0 8px 28px rgba(0,0,0,0.8), 0 0 16px rgba(212, 175, 55, 0.2)'
                      : '0 6px 20px rgba(0,0,0,0.6)',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Decorative Gold Quote Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '2rem', lineHeight: 1, color: '#D4AF37', fontFamily: "'Playfair Display', serif", opacity: 0.6 }}>
                      “
                    </span>

                    {/* Favorite / Like Button */}
                    <button
                      onClick={(e) => toggleMessageLike(g.id, e)}
                      style={{
                        background: isLiked ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: isLiked ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        color: isLiked ? '#FFD700' : '#B5AFA4',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        fontFamily: "'Montserrat', sans-serif",
                        transition: 'transform 0.15s ease',
                      }}
                      title="Salvar recado como favorito"
                    >
                      <Heart 
                        size={15} 
                        fill={isLiked ? '#FFD700' : 'transparent'} 
                        color={isLiked ? '#FFD700' : '#B5AFA4'} 
                      />
                      <span>{isLiked ? 'Favorito ❤️' : 'Favoritar'}</span>
                    </button>
                  </div>

                  {/* Message Content (Main Focus) */}
                  <p style={{
                    fontSize: '1.06rem',
                    fontStyle: 'italic',
                    color: '#FFFFFF',
                    lineHeight: 1.6,
                    margin: '0 0 16px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    letterSpacing: '0.2px',
                  }}>
                    {g.sweetMessage}
                  </p>

                  {/* Discreet Author Sign-off Footer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderTop: '1px solid rgba(212, 175, 55, 0.15)',
                    paddingTop: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: '#E8C98D',
                        fontFamily: "'Cinzel', serif",
                        letterSpacing: '0.5px',
                      }}>
                        — {g.name}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#888' }}>
                        • {g.group}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      color: '#34D399',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <CheckCircle2 size={12} /> Presença Confirmada
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <GuestAddOptionsModal
        isOpen={isAddOptionsModalOpen}
        onClose={() => setIsAddOptionsModalOpen(false)}
        onSelectManual={() => {
          setGuestToEdit(null);
          setIsFormModalOpen(true);
        }}
        onSelectContacts={() => setIsImportContactsModalOpen(true)}
        onSelectShareLink={() => setIsShareModalOpen(true)}
      />

      <GuestImportContactsModal
        isOpen={isImportContactsModalOpen}
        onClose={() => setIsImportContactsModalOpen(false)}
      />

      <GuestFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => {
          setIsFormModalOpen(false);
          setGuestToEdit(null);
        }} 
        guestToEdit={guestToEdit}
      />

      <GuestInviteConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
      />

      <GuestInviteLinkShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        onOpenPublicLandingPage={() => setIsPublicLandingPageOpen(true)}
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .guest-item-card:hover {
          transform: translateY(-2px);
          border-color: rgba(212, 175, 55, 0.6) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8), 0 0 16px rgba(212, 175, 55, 0.15) !important;
        }
        @media (max-width: 640px) {
          .guest-kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
};
