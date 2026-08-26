import React, { useState } from 'react';
import { Gift, Sparkles, Trophy, ArrowRight, CheckCircle2, Crown, UserPlus } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { BenefitCard } from './BenefitCard';
import { ClaimModal } from './ClaimModal';
import type { Benefit } from '../../types';

export const BenefitsHub: React.FC = () => {
  const { benefits, vipRewards, setActiveTab, debutante, setIsReferralModalOpen } = useAppState();
  const [activeClaimBenefit, setActiveClaimBenefit] = useState<Benefit | null>(null);

  const isPaused = debutante.journeyCycle.journeyStatus === 'paused';

  // Filter ONLY conquered / claimed benefits
  const conqueredBenefits = benefits.filter(b => b.status === 'claimed' || b.status === 'unlocked');
  
  // Filter ONLY conquered VIP gifts
  const conqueredVipGifts = vipRewards.filter(r => r.status === 'completed' || r.status === 'claimed');

  const totalConquests = conqueredBenefits.length + conqueredVipGifts.length;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* Paused Banner if journey is paused */}
      {isPaused && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(26, 12, 22, 0.98) 100%)',
          border: '1.5px solid rgba(255, 92, 154, 0.6)',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(255, 92, 154, 0.25)',
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FF5C9A', fontFamily: 'Poppins, sans-serif' }}>
              ⏸️ JORNADA PAUSADA — INDICAÇÕES PARA DESBLOQUEIO
            </div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins, sans-serif', marginTop: '2px' }}>
              Suas novas indicações serão contabilizadas para desbloquear mais +7 dias de jornada ({debutante.journeyCycle.cycleRenewalProgress}/3).
            </div>
          </div>
          <button
            onClick={() => setIsReferralModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
              color: '#1A0E00',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(255, 183, 3, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={14} color="#1A0E00" strokeWidth={2.5} />
            <span>+ Indicar Amigos</span>
          </button>
        </div>
      )}

      {/* ── 1. Universal Top Header (Icon + Title + Subtitle) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <Trophy size={24} color="#D4AF37" />
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
              Benefícios
            </h1>
            <p style={{
              color: '#B5AFA4',
              fontSize: '0.84rem',
              margin: 0,
              fontFamily: "'Montserrat', sans-serif",
              lineHeight: 1.35,
            }}>
              Aqui ficam reunidas todas as suas conquistas desbloqueadas na jornada e seus presentes VIPs
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(212, 175, 55, 0.12)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '20px',
          padding: '6px 14px',
          color: '#FFD700',
          fontSize: '0.78rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'Poppins, sans-serif',
          flexShrink: 0,
        }}>
          <Sparkles size={13} color="#FFD700" />
          <span>{totalConquests} {totalConquests === 1 ? 'Recompensa Conquistada' : 'Recompensas Conquistadas'}</span>
        </div>
      </div>

      {/* Empty State: If 0 conquered items */}
      {totalConquests === 0 ? (
        <div className="glass-card" style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          background: 'linear-gradient(135deg, rgba(26, 14, 34, 0.9) 0%, rgba(16, 9, 22, 0.95) 100%)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.12)',
            border: '1.5px dashed rgba(255, 215, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            color: '#FFD700'
          }}>
            <Gift size={32} />
          </div>

          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#FFF',
            fontFamily: 'Poppins, sans-serif',
            marginBottom: '8px'
          }}>
            Você ainda não possui benefícios conquistados
          </h3>

          <p style={{
            fontSize: '0.86rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'Poppins, sans-serif',
            lineHeight: 1.5,
            marginBottom: '26px',
            maxWidth: '440px',
            margin: '0 auto 26px auto'
          }}>
            Indique suas amigas e acompanhe o fechamento de festas para desbloquear recompensas exclusivas como minutos extras, convidados bônus e presentes Apple!
          </p>

          {isPaused ? (
            <button
              onClick={() => setIsReferralModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
                color: '#1A0E00',
                border: 'none',
                borderRadius: '50px',
                padding: '14px 32px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 6px 24px rgba(255, 183, 3, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'transform 0.2s ease',
              }}
            >
              <UserPlus size={18} color="#1A0E00" strokeWidth={2.5} />
              <span>+ Indicar Amigos</span>
              <ArrowRight size={16} color="#1A0E00" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('journey')}
              style={{
                background: 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '50px',
                padding: '14px 32px',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 6px 24px rgba(255, 92, 154, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'transform 0.2s ease',
              }}
            >
              <Sparkles size={18} />
              <span>Ir para a Jornada</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Section 1: Conquered Benefits */}
          {conqueredBenefits.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#FFD700',
                fontFamily: 'Poppins, sans-serif'
              }}>
                <Gift size={18} color="#FFD700" />
                <span>Benefícios da Festa Conquistados ({conqueredBenefits.length})</span>
              </div>

              <div className="benefits-grid">
                {conqueredBenefits.map(b => (
                  <BenefitCard
                    key={b.id}
                    benefit={b}
                    onClaimClick={(benefit) => setActiveClaimBenefit(benefit)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Conquered VIP Gifts */}
          {conqueredVipGifts.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#FF5C9A',
                fontFamily: 'Poppins, sans-serif'
              }}>
                <Crown size={18} color="#FF5C9A" />
                <span>Presentes VIP Conquistados ({conqueredVipGifts.length})</span>
              </div>

              <div className="benefits-grid">
                {conqueredVipGifts.map(vip => (
                  <div
                    key={vip.id}
                    className="glass-card"
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: '1.5px solid rgba(255, 215, 0, 0.5)',
                      boxShadow: '0 8px 24px rgba(255, 215, 0, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: '#000' }}>
                      <img
                        src={vip.imageUrl}
                        alt={vip.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFF',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                      }}>
                        <CheckCircle2 size={12} /> CONQUISTADO
                      </div>
                    </div>

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>
                          {vip.name}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                          {vip.description}
                        </p>
                      </div>

                      <div style={{
                        marginTop: '14px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.72rem',
                        color: '#FFD700',
                        fontWeight: 700
                      }}>
                        🏆 Recompensa confirmada pela gerência do evento
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claim Modal */}
      <ClaimModal
        benefit={activeClaimBenefit}
        onClose={() => setActiveClaimBenefit(null)}
      />

      <style>{`
        .benefits-header-card {
          padding: 24px 28px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        @media (max-width: 640px) {
          .benefits-header-card {
            padding: 16px 14px !important;
          }

          .benefits-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};
