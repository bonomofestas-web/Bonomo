import { Sparkles, Star, Crown, Clock, Users, Calendar, ArrowRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ReferralJourneyMilestone } from './MilestoneCard';
import { JourneyViewSelector } from './JourneyViewSelector';
import { VipRewardsHub } from './VipRewardsHub';
import { JourneyCycleTimerBanner } from './JourneyCycleTimerBanner';
import { CyclePausedOverlay } from './CyclePausedOverlay';

export const VerticalJourney: React.FC = () => {
  const { milestones, validatedReferralsCount, sentReferralsCount, debutante, journeySubTab, setActiveTab } = useAppState();

  const validCount = validatedReferralsCount ?? debutante.validReferrals;
  const sentCount  = sentReferralsCount;
  const isPaused = debutante.journeyCycle.journeyStatus === 'paused';
  const isClosed = debutante.journeyCycle.journeyStatus === 'closed';

  // State: Jornada Pendente de Vinculação
  if (debutante.isJourneyPending) {
    return (
      <section style={{ paddingBottom: '24px', position: 'relative', animation: 'fadeIn 0.25s ease-out' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 16, 38, 0.95) 0%, rgba(16, 10, 26, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '24px',
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 24px rgba(234, 179, 8, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '2px solid #EAB308',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)',
          }}>
            <Clock size={32} color="#EAB308" />
          </div>

          <div>
            <span style={{
              background: 'rgba(234, 179, 8, 0.2)',
              color: '#EAB308',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: '10px',
            }}>
              Jornada em Preparação
            </span>

            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: 900,
              color: '#FFF',
              margin: '0 0 8px 0',
              fontFamily: 'Poppins, sans-serif',
            }}>
              Olá, {debutante.name}! 👑
            </h2>

            <p style={{
              fontSize: '0.86rem',
              color: '#D1C0DE',
              lineHeight: 1.6,
              maxWidth: '440px',
              margin: '0 auto',
            }}>
              Sua <strong>Jornada VIP de 15 Anos</strong> está sendo personalizada pela equipe da casa de festas. Em breve, seus benefícios exclusivos, metas de indicação e presentes VIP estarão liberados aqui!
            </p>
          </div>

          <div style={{
            width: '100%',
            maxWidth: '380px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.74rem', color: '#E8C98D', fontWeight: 800, textTransform: 'uppercase' }}>
              Enquanto isso, você já pode:
            </div>

            <button
              onClick={() => setActiveTab('guests')}
              style={{
                background: 'linear-gradient(135deg, rgba(232, 201, 141, 0.15) 0%, rgba(212, 175, 55, 0.08) 100%)',
                border: '1px solid rgba(232, 201, 141, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#FFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#E8C98D" />
                <span>Organizar Lista de Convidados</span>
              </div>
              <ArrowRight size={14} color="#E8C98D" />
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              style={{
                background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#FFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#A78BFA" />
                <span>Ver Meus Compromissos & Agenda</span>
              </div>
              <ArrowRight size={14} color="#A78BFA" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Segment 0 -> Meta 1 (5 indicações)
  const meta1Req = milestones[0]?.requiredReferrals || 5;
  const validInStart = Math.max(0, Math.min(validCount, meta1Req));
  const startGoldPct = (validInStart / meta1Req) * 100;

  const sentInStart = Math.max(0, Math.min(sentCount, meta1Req));
  const pinkInStart = Math.max(0, sentInStart - validInStart);
  const startPinkPct = (pinkInStart / meta1Req) * 100;

  return (
    <section style={{ paddingBottom: '24px', position: 'relative' }}>
      {/* ── 1. Compact & Discreet Cycle Timer Banner ── */}
      <div style={{ marginBottom: '14px' }}>
        <JourneyCycleTimerBanner />
      </div>

      {/* ── 2. Journey Metrics Card ── */}
      <div style={{
          background: 'linear-gradient(135deg, rgba(26, 16, 38, 0.95) 0%, rgba(16, 10, 26, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 215, 0, 0.38)',
          borderRadius: '24px',
          padding: '18px 20px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 20px rgba(255,215,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
            
            {/* Left Metric: Indicações Válidas */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.15)',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(255,215,0,0.3)',
                  flexShrink: 0,
                }}>
                  <Star size={16} fill="#FFD700" color="#FFD700" />
                </div>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFF', lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
                  {validCount}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#E8C98D', fontWeight: 700, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.2px' }}>
                indicações válidas
              </div>
            </div>

            {/* Center Vertical Gradient Divider */}
            <div style={{
              width: '1px',
              height: '46px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255, 215, 0, 0.35) 50%, transparent 100%)',
            }} />

            {/* Right Metric: % Da Sua Jornada */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 59, 112, 0.15)',
                  border: '1px solid rgba(255, 59, 112, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(255,59,112,0.3)',
                  flexShrink: 0,
                }}>
                  <Crown size={16} color="#FF5C9A" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFF', lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
                    {debutante.journeyProgressPercentage}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FF5C9A', fontFamily: 'Poppins, sans-serif', marginLeft: '1px' }}>
                    %
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#FFB0C8', fontWeight: 700, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.2px' }}>
                da sua jornada
              </div>
            </div>
          </div>

          {/* Dynamic Glowing Progress Bar */}
          <div style={{
            height: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              height: '100%',
              width: `${debutante.journeyProgressPercentage}%`,
              background: 'linear-gradient(90deg, #FFD700 0%, #FF3B70 100%)',
              borderRadius: '999px',
              boxShadow: '0 0 14px rgba(255, 59, 112, 0.8), 0 0 6px #FFD700',
              transition: 'width 0.8s ease-out'
            }} />
          </div>
        </div>

      {/* ── 3. Sub-tab View Selector: [ BENEFÍCIOS ]  [ PRESENTES VIP ] ── */}
      <JourneyViewSelector />

      {/* ── SUB-TAB 1: BENEFÍCIOS (Default Journey Experience) ── */}
      {journeySubTab === 'benefits' && (
        isPaused || isClosed ? (
          <CyclePausedOverlay />
        ) : (
          <div style={{ position: 'relative' }}>
            {/* ── Start of Journey Node (Ponto de Partida) ── */}
            <div 
              className="journey-start-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: '28px',
                position: 'relative',
                marginBottom: '0px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                {/* Start Node Circle (44px) */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: validCount > 0 
                    ? 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)' 
                    : sentCount > 0 
                    ? 'linear-gradient(135deg, #FF1493 0%, #FF5C9A 100%)' 
                    : 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 59, 112, 0.25) 100%)',
                  border: validCount > 0 
                    ? '2.5px solid #FFFFFF' 
                    : sentCount > 0 
                    ? '2.5px solid #FFB0C8' 
                    : '2px solid rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: validCount > 0 
                    ? '0 0 20px rgba(221,168,75,0.55)' 
                    : sentCount > 0 
                    ? '0 0 24px rgba(255,20,147,0.65)' 
                    : '0 0 16px rgba(255, 215, 0, 0.35)',
                  zIndex: 2,
                  transition: 'all 0.35s ease',
                }}>
                  <Sparkles size={18} color={validCount > 0 ? '#3D2702' : '#FFD700'} />
                </div>

                {/* Vertical Connecting Line from Start (0) to Meta 1 (5) */}
                <div style={{
                  position: 'relative',
                  width: '3px',
                  height: '38px',
                  marginTop: '4px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderLeft: (startGoldPct === 0 && startPinkPct === 0) ? '2px dashed rgba(255,255,255,0.2)' : 'none',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  {/* Top Dourado Portion (Validadas) */}
                  {startGoldPct > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${startGoldPct}%`,
                      background: 'linear-gradient(180deg, #DDA84B 0%, #FFD700 100%)',
                      boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
                      transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 2,
                    }} />
                  )}

                  {/* Middle Rosa Portion (Pendentes) */}
                  {startPinkPct > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: `${startGoldPct}%`,
                      left: 0,
                      width: '100%',
                      height: `${startPinkPct}%`,
                      background: 'linear-gradient(180deg, #FF1493 0%, #FF6090 100%)',
                      boxShadow: '0 0 10px rgba(255, 20, 147, 0.8)',
                      transition: 'top 0.6s ease, height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 1,
                    }} />
                  )}
                </div>
              </div>

              {/* Start Point Header Banner */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 215, 0, 0.25)',
                borderRadius: '14px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}>
                <div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#E8C98D',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    ✨ Ponto de Partida da Jornada
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins, sans-serif', marginTop: '1px' }}>
                    {validCount === 0 && sentCount === 0
                      ? 'Indique suas primeiras amigas para desbloquear as recompensas!'
                      : `${validCount} de ${meta1Req} indicações validadas rumo à 1ª meta`}
                  </div>
                </div>

                <div style={{
                  background: validCount >= meta1Req ? 'rgba(221,168,75,0.2)' : 'rgba(255,92,154,0.15)',
                  border: validCount >= meta1Req ? '1px solid #DDA84B' : '1px solid rgba(255,92,154,0.3)',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: validCount >= meta1Req ? '#FFD700' : '#FFB0C8',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {validCount >= meta1Req ? '1ª Meta Alcançada 🏆' : `Progresso 1ª Meta: ${Math.round((validInStart / meta1Req) * 100)}%`}
                </div>
              </div>
            </div>

            {/* Vertical timeline feed */}
            {milestones.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px dashed rgba(255, 215, 0, 0.3)',
                borderRadius: '16px',
                padding: '36px 20px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: '10px',
              }}>
                <Sparkles size={32} color="#FFD700" style={{ opacity: 0.7, marginBottom: '10px' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                  Metas em Configuração
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(209,192,222,0.7)', maxWidth: '340px', margin: '0 auto' }}>
                  Suas metas personalizadas serão vinculadas pela equipe da Casa de Festas em breve!
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '0' }}>
                {milestones.map((milestone, idx) => (
                  <ReferralJourneyMilestone
                    key={milestone.id}
                    milestone={milestone}
                    index={idx}
                    isLast={idx === milestones.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* ── SUB-TAB 2: PRESENTES VIP (VIP Rewards Gallery - Always Trackable) ── */}
      {journeySubTab === 'vip_rewards' && (
        <VipRewardsHub />
      )}

      <style>{`
        @media (max-width: 768px) {
          .journey-start-row {
            grid-template-columns: 36px 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </section>
  );
};
