import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Check, Heart, User, Phone, 
  ArrowRight, ShieldCheck, ExternalLink, Navigation, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { GuestGroup } from '../../types';

interface GuestPublicLandingPageProps {
  onClose?: () => void;
  guestId?: string; // If loaded for a specific invited guest
}

export const GuestPublicLandingPage: React.FC<GuestPublicLandingPageProps> = ({ guestId }) => {
  const { debutante, currentTheme, guests, selfRegisterGuest, confirmGuestRsvp } = useAppState();

  const existingGuest = guestId ? guests.find(g => g.id === guestId) : null;

  const [name, setName] = useState(existingGuest?.name || '');
  const [phone, setPhone] = useState(existingGuest?.phone || '');
  const [age, setAge] = useState(existingGuest?.age ? String(existingGuest.age) : '15');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>(existingGuest?.gender || 'female');
  const [group, setGroup] = useState<GuestGroup>(existingGuest?.group || 'Amigos');
  
  const [sweetMessage, setSweetMessage] = useState(existingGuest?.sweetMessage || '');
  
  // Confirmed if guest is already confirmed or link is expired
  const isAlreadyConfirmed = Boolean(existingGuest && (existingGuest.status === 'confirmed' || existingGuest.isLinkExpired));
  const [isConfirmedState, setIsConfirmedState] = useState<boolean>(isAlreadyConfirmed);

  // Dynamic Venue Details from active theme/venue
  const venueObj = currentTheme as any;
  const venueName = venueObj.name || 'Casa de Festas';
  const venueLogo = venueObj.logoUrl || '/logo_riio_lounge.png';
  const venueAddress = venueObj.address || '';
  const venuePhoto = venueObj.photoUrl || venueObj.venueBallroomUrl || "/venue_ballroom.jpg";
  const venueTagline = venueObj.tagline || "Mais do que uma casa de festas, uma experiência inesquecível.";
  const venueDescription = venueObj.description || "Transformamos celebrações em momentos inesquecíveis, unindo estrutura impecável, atendimento personalizado e alta gastronomia.";
  
  const yearsInBusiness = venueObj.yearsInBusiness || 20;
  const eventsCompleted = venueObj.eventsCompleted || 2200;
  const guestsDelighted = venueObj.guestsDelighted || 300000;

  // When guest confirms, auto scroll smoothly to the newly unlocked venue info
  useEffect(() => {
    if (isConfirmedState) {
      const target = document.getElementById('venue-unlocked-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [isConfirmedState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (existingGuest) {
      // Individual invite confirmation
      confirmGuestRsvp(
        existingGuest.id, 
        sweetMessage.trim() || undefined
      );
    } else {
      // General invite self-registration (Individual per person)
      selfRegisterGuest({
        name: name.trim(),
        phone: phone.trim(),
        age: parseInt(age) || 15,
        gender,
        group,
        plusOnes: 0,
        sweetMessage: sweetMessage.trim() ? sweetMessage.trim() : undefined,
      });
    }

    setIsConfirmedState(true);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName} ${venueAddress}`)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${venueName} ${venueAddress}`)}`;

  const debutantePhoto = (debutante.useCustomInvitePhoto && debutante.customInvitePhotoUrl)
    ? debutante.customInvitePhotoUrl
    : debutante.avatarUrl;

  const receptionMessage = debutante.receptionMessage || 
    `É com muita alegria que convidamos você para celebrar esse momento tão especial na vida de ${debutante.name}. Esperamos você para tornar essa noite ainda mais inesquecível!`;

  const isIndividualLink = Boolean(existingGuest);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      color: '#FFFFFF',
      fontFamily: "'Montserrat', 'Poppins', sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: '80px',
    }}>

      {/* Main Container */}
      <div style={{
        maxWidth: '840px',
        margin: '0 auto',
        padding: '40px 20px 20px 20px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── 1. CABEÇALHO DO CONVITE: "CONVITE OFICIAL" + LOGO DA CASA DE FESTA ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '36px',
        }}>
          {/* Texto "Convite Oficial" Centralizado */}
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#D4AF37',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
            paddingBottom: '6px',
            display: 'inline-block',
          }}>
            Convite Oficial
          </div>

          {/* Logo Dinâmica da Casa de Festa */}
          <img 
            src={venueLogo} 
            alt={venueName} 
            style={{ 
              maxWidth: '180px',
              height: '84px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 14px rgba(212, 175, 55, 0.55))',
              marginBottom: '6px' 
            }} 
          />
        </div>

        {/* ── 2. BLOCO DA ANIVERSARIANTE (CHAMADA ÚNICA SEM REPETIÇÃO DO NOME) ── */}
        <div style={{
          background: '#0D0D0D',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '24px',
          padding: '32px 28px',
          marginBottom: '32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px',
            alignItems: 'center',
          }}>
            {/* Foto Grande e Destacada da Debutante */}
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1.5px solid rgba(212, 175, 55, 0.45)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8)',
              position: 'relative',
              aspectRatio: '1 / 1',
              maxHeight: '380px',
              margin: '0 auto',
              width: '100%',
            }}>
              <img
                src={debutantePhoto}
                alt="15 anos da Maria Eduarda"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            {/* Chamada Única e Mensagem de Recepção */}
            <div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FFF6DF 0%, #D4AF37 50%, #AA7C11 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: '0 0 16px 0',
                lineHeight: 1.15,
              }}>
                15 Anos de {debutante.name}
              </h1>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderLeft: '3px solid #D4AF37',
                padding: '16px 18px',
                borderRadius: '0 14px 14px 0',
                marginBottom: '8px',
              }}>
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.92rem',
                  color: '#E0DACD',
                  lineHeight: 1.7,
                  margin: 0,
                  fontWeight: 400,
                }}>
                  "{receptionMessage}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. INFORMAÇÕES DA RECEPÇÃO (DATA, HORÁRIO E TRAJE ÚNICO) ── */}
        <div style={{
          background: '#0D0D0D',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '24px',
          padding: '28px 24px',
          marginBottom: '32px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#D4AF37',
            textAlign: 'center',
            margin: '0 0 22px 0',
          }}>
            Informações da recepção
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {/* Data */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <Calendar size={22} color="#D4AF37" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9E988D', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Data</div>
                <div style={{ fontSize: '0.95rem', color: '#FFF', fontWeight: 700, marginTop: '2px' }}>18 de Abril de 2027</div>
              </div>
            </div>

            {/* Horário */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <Clock size={22} color="#D4AF37" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9E988D', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Horário</div>
                <div style={{ fontSize: '0.95rem', color: '#FFF', fontWeight: 700, marginTop: '2px' }}>Recepção às 20h00</div>
              </div>
            </div>

            {/* Traje (Opção Única) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <ShieldCheck size={22} color="#D4AF37" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9E988D', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Traje</div>
                <div style={{ fontSize: '0.95rem', color: '#FFF', fontWeight: 700, marginTop: '2px' }}>Gala</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. CONFIRMAÇÃO DE PRESENÇA (PRIMEIRA ETAPA: FORMULÁRIO | SEGUNDA ETAPA: CONFIRMADO) ── */}
        {!isConfirmedState ? (
          /* Formulário de Confirmação de Presença (Etapa 1) */
          <div style={{
            background: '#0D0D0D',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '24px',
            padding: '36px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            marginBottom: '32px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: '#FFF',
                margin: '0 0 6px 0',
              }}>
                Confirmação de presença
              </h2>
              <p style={{
                fontSize: '0.86rem',
                color: '#B5AFA4',
                margin: 0,
              }}>
                {isIndividualLink 
                  ? `Convite exclusivo para você, ${name}.` 
                  : 'Por gentileza, preencha seus dados.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* If Individual Link: Guest is already pre-identified */}
              {isIndividualLink ? (
                <div style={{
                  background: '#141414',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Cinzel', serif" }}>
                      Convidado(a) Identificado(a)
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#9E988D', marginTop: '2px' }}>
                      {phone} • {group}
                    </div>
                  </div>

                  {existingGuest?.allowedCapacity && existingGuest.allowedCapacity > 1 && (
                    <div style={{
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.76rem',
                      color: '#E8C98D',
                      fontWeight: 700
                    }}>
                      Convite para até {existingGuest.allowedCapacity} pessoas
                    </div>
                  )}
                </div>
              ) : (
                /* General Link: Open Inputs */
                <>
                  {/* Nome Completo */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#D4AF37',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '6px',
                      fontFamily: "'Cinzel', serif",
                    }}>
                      Nome Completo *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#141414',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px 12px 42px',
                          color: '#FFF',
                          fontSize: '0.9rem',
                          outline: 'none',
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {/* Telefone & Idade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '14px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#D4AF37',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '6px',
                        fontFamily: "'Cinzel', serif",
                      }}>
                        WhatsApp / Telefone *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                        <input
                          type="tel"
                          required
                          placeholder="(21) 99999-9999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#141414',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            borderRadius: '12px',
                            padding: '12px 14px 12px 42px',
                            color: '#FFF',
                            fontSize: '0.9rem',
                            outline: 'none',
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#D4AF37',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '6px',
                        fontFamily: "'Cinzel', serif",
                      }}>
                        Idade
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#141414',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          color: '#FFF',
                          fontSize: '0.9rem',
                          outline: 'none',
                          fontFamily: "'Montserrat', sans-serif",
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>

                  {/* Gênero (Sexo) */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#D4AF37',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '6px',
                      fontFamily: "'Cinzel', serif",
                    }}>
                      Gênero
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {[
                        { id: 'female', label: 'Feminino ♀' },
                        { id: 'male', label: 'Masculino ♂' },
                        { id: 'other', label: 'Outro' },
                      ].map(g => {
                        const isSelected = gender === g.id;
                        return (
                          <button
                            type="button"
                            key={g.id}
                            onClick={() => setGender(g.id as any)}
                            style={{
                              background: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141414',
                              border: isSelected ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
                              borderRadius: '10px',
                              padding: '8px 6px',
                              color: isSelected ? '#000' : '#E0DACD',
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              fontFamily: "'Montserrat', sans-serif",
                            }}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vínculo com a Debutante */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#D4AF37',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                      fontFamily: "'Cinzel', serif",
                    }}>
                      Vínculo com a Debutante
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                      {(['Amigos', 'Escola', 'Família', 'VIPs', 'Outros'] as GuestGroup[]).map((g) => {
                        const isSelected = group === g;
                        return (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setGroup(g)}
                            style={{
                              background: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141414',
                              border: isSelected ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
                              borderRadius: '10px',
                              padding: '9px 8px',
                              color: isSelected ? '#000' : '#E0DACD',
                              fontSize: '0.8rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              fontFamily: "'Montserrat', sans-serif",
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* 💌 Mensagem de carinho */}
              <div style={{
                background: '#141414',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '16px',
                padding: '16px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#D4AF37',
                  marginBottom: '4px',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                }}>
                  <Heart size={15} color="#D4AF37" fill="#D4AF37" />
                  <span>Mensagem de carinho para {debutante.name}</span>
                </label>
                <div style={{ fontSize: '0.72rem', color: '#9E988D', marginBottom: '10px' }}>
                  Deixe uma mensagem ou votos especiais de 15 anos para a aniversariante.
                </div>
                <textarea
                  rows={3}
                  placeholder={`Escreva aqui seus votos de felicidades, carinho ou lembrança especial para a ${debutante.name.split(' ')[0]}...`}
                  value={sweetMessage}
                  onChange={(e) => setSweetMessage(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0D0D0D',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    fontFamily: "'Montserrat', sans-serif",
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Botão de Confirmação */}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '16px 28px',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
                  transition: 'transform 0.2s ease',
                  marginTop: '6px',
                }}
              >
                <span>Confirmar Presença</span>
                <ArrowRight size={18} color="#000" />
              </button>
            </form>
          </div>
        ) : (
          /* Estado de Presença Confirmada (Etapa 2) */
          <div style={{
            background: '#0D0D0D',
            border: '1.5px solid #D4AF37',
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
            animation: 'fadeIn 0.35s ease-out',
            marginBottom: '32px',
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.4)',
            }}>
              <Check size={36} color="#000" strokeWidth={3} />
            </div>

            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#D4AF37',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              PRESENÇA CONFIRMADA COM SUCESSO
            </div>

            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(1.8rem, 4vw, 2.3rem)',
              fontWeight: 700,
              color: '#FFF',
              marginBottom: '12px',
            }}>
              Presença confirmada! 🎉
            </h2>

            <p style={{
              fontSize: '0.92rem',
              color: '#E8C98D',
              lineHeight: 1.6,
              maxWidth: '540px',
              margin: '0 auto 20px auto',
              fontWeight: 500,
            }}>
              {isAlreadyConfirmed 
                ? 'Sua presença já foi confirmada anteriormente! Confira abaixo todas as informações da festa e como chegar ao local.'
                : 'Agora você pode conferir abaixo todas as informações sobre a nossa casa de festa e descobrir como chegar ao local.'}
            </p>

            {/* Resumo dos Convidados Confirmados */}
            <div style={{
              background: '#141414',
              border: '1px dashed rgba(212, 175, 55, 0.4)',
              borderRadius: '16px',
              padding: '18px 20px',
              textAlign: 'left',
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.72rem', color: '#D4AF37', fontWeight: 800 }}>
                  CONVITE CONFIRMADO
                </span>
                <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> CONFIRMADO
                </span>
              </div>

              <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFF' }}>
                • {name} <span style={{ fontSize: '0.74rem', color: '#9E988D', fontWeight: 500 }}>({phone})</span>
              </div>

              {sweetMessage && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.84rem',
                  color: '#E0DACD',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}>
                  <Heart size={14} color="#D4AF37" fill="#D4AF37" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>"{sweetMessage}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 5. SEGUNDA ETAPA: LIBERADA APENAS APÓS A CONFIRMAÇÃO DE PRESENÇA ── */}
        {isConfirmedState && (
          <div id="venue-unlocked-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* Mensagem de Transição & Boas-Vindas à Casa de Festas */}
            <div style={{
              textAlign: 'center',
              marginBottom: '28px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(170, 124, 17, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '20px',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.86rem',
                color: '#E8C98D',
                fontWeight: 700,
              }}>
                <Sparkles size={16} color="#FFD700" />
                <span>Informações completas do evento liberadas com sucesso!</span>
              </div>
            </div>

            {/* Informações sobre a Casa de Festa */}
            <div style={{
              background: '#0D0D0D',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '24px',
              padding: '36px 32px',
              marginBottom: '32px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px',
                alignItems: 'center',
                marginBottom: '32px',
              }}>
                {/* Foto do Espaço */}
                <div style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                  position: 'relative',
                  maxHeight: '340px',
                }}>
                  <img
                    src={venuePhoto}
                    alt={venueName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Descrição da Casa de Festa */}
                <div>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#D4AF37',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    {venueName}
                  </div>

                  <h3 style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                    fontWeight: 700,
                    color: '#D4AF37',
                    lineHeight: 1.25,
                    marginBottom: '16px',
                  }}>
                    {venueTagline}
                  </h3>

                  <p style={{
                    fontSize: '0.88rem',
                    color: '#D1CBC1',
                    lineHeight: 1.7,
                    marginBottom: '14px',
                    fontWeight: 400,
                  }}>
                    {venueDescription}
                  </p>

                  <p style={{
                    fontSize: '0.88rem',
                    color: '#D1CBC1',
                    lineHeight: 1.7,
                    margin: 0,
                    fontWeight: 400,
                  }}>
                    Nosso compromisso é proporcionar uma noite memorável e sofisticada para todos os convidados.
                  </p>
                </div>
              </div>

              {/* 3 Números de Destaque da Casa de Festa */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '24px',
                paddingTop: '28px',
                borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                textAlign: 'center',
              }}>
                <div>
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(2rem, 4.5vw, 2.6rem)',
                    fontWeight: 700,
                    color: '#D4AF37',
                    lineHeight: 1,
                  }}>
                    +{yearsInBusiness}
                  </div>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.78rem',
                    color: '#E8C98D',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginTop: '6px',
                  }}>
                    Anos de Tradição
                  </div>
                </div>

                <div>
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(2rem, 4.5vw, 2.6rem)',
                    fontWeight: 700,
                    color: '#D4AF37',
                    lineHeight: 1,
                  }}>
                    +{eventsCompleted?.toLocaleString('pt-BR')}
                  </div>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.78rem',
                    color: '#E8C98D',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginTop: '6px',
                  }}>
                    Eventos Realizados
                  </div>
                </div>

                <div>
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(2rem, 4.5vw, 2.6rem)',
                    fontWeight: 700,
                    color: '#D4AF37',
                    lineHeight: 1,
                  }}>
                    +{guestsDelighted?.toLocaleString('pt-BR')}
                  </div>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.78rem',
                    color: '#E8C98D',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginTop: '6px',
                  }}>
                    Convidados Encantados
                  </div>
                </div>
              </div>
            </div>

            {/* Localização (Mapa Responsivo + Botões Google Maps e Waze) */}
            <div style={{
              background: '#0D0D0D',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '24px',
              padding: '32px 28px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: '#D4AF37',
                  margin: '0 0 6px 0',
                }}>
                  Localização
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#B5AFA4', margin: 0 }}>
                  {venueAddress}
                </p>
              </div>

              {/* Mapa 100% Responsivo */}
              <div style={{
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#141414',
                marginBottom: '20px',
                width: '100%',
              }}>
                <iframe
                  title={`Localização ${venueName}`}
                  src={venueObj.googleMapsEmbedUrl || `https://maps.google.com/maps?q=${encodeURIComponent(venueAddress || venueName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="300"
                  style={{
                    border: 0,
                    display: 'block',
                    filter: 'grayscale(15%) contrast(95%)',
                  }}
                  allowFullScreen={false}
                  loading="lazy"
                />
              </div>

              {/* Botões de Navegação */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                    color: '#000000',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '1px',
                    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                  }}
                >
                  <Navigation size={15} color="#000" />
                  <span>Google Maps</span>
                </a>

                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    color: '#FFFFFF',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  <ExternalLink size={15} color="#D4AF37" />
                  <span>Waze</span>
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
