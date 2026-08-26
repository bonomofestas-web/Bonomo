import React, { useEffect, useRef } from 'react';
import { Lock, Star, Check } from 'lucide-react';
import type { Milestone } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { TransparentRewardVisual } from '../common/TransparentRewardVisual';

export interface ReferralJourneyMilestoneProps {
  milestone: Milestone;
  isLast: boolean;
  index: number;
}

const STATUS_CONFIG = {
  completed: {
    label: 'CONCLUÍDO',
    badgeBg: '#EFD8C5',
    badgeColor: '#9A5B20',
    nodeBg: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
    nodeBorder: '#FFFFFF',
    nodeGlow: '0 0 20px rgba(221,168,75,0.55)',
  },
  in_progress: {
    label: 'EM PROGRESSO',
    badgeBg: '#F4C4D4',
    badgeColor: '#B7285B',
    nodeBg: 'linear-gradient(135deg, #FF1493 0%, #FF5C9A 100%)',
    nodeBorder: '#FFB0C8',
    nodeGlow: '0 0 24px rgba(255,20,147,0.65)',
  },
  locked: {
    label: 'BLOQUEADO',
    badgeBg: '#D8D6D9',
    badgeColor: '#4E4A50',
    nodeBg: '#292632',
    nodeBorder: '#5B5562',
    nodeGlow: 'none',
  },
};

export const ReferralJourneyMilestone: React.FC<ReferralJourneyMilestoneProps> = ({
  milestone,
  isLast,
  index,
}) => {
  const { debutante, milestones, validatedReferralsCount, sentReferralsCount } = useAppState();
  const cardRef = useRef<HTMLDivElement>(null);

  const validCount    = validatedReferralsCount ?? debutante.validReferrals;
  const sentCount     = sentReferralsCount;
  const targetReq     = milestone.requiredReferrals;

  // Find index of the first milestone that is not yet completed
  const firstUncompletedIdx = milestones.findIndex(m => validCount < m.requiredReferrals);

  // Exact 3 states:
  // 1. CONCLUÍDO: validCount >= targetReq
  // 2. EM PROGRESSO: Not completed, and (sentCount >= targetReq OR this is the active current milestone / Meta 1)
  // 3. BLOQUEADO: Otherwise
  const isCompleted   = validCount >= targetReq;
  const isInProgress  = !isCompleted && (
    sentCount >= targetReq || 
    index === firstUncompletedIdx || 
    index === 0
  );
  const isLocked      = !isCompleted && !isInProgress;

  // Calculate timeline connecting line segment downwards to next milestone
  const nextMilestone = !isLast ? milestones[index + 1] : null;
  const startReq      = targetReq;
  const endReq        = nextMilestone ? nextMilestone.requiredReferrals : targetReq;
  const segmentLength = Math.max(1, endReq - startReq);

  let goldPct = 0;
  let pinkPct = 0;

  if (!isLast && nextMilestone) {
    const validInSegment = Math.max(0, Math.min(validCount - startReq, segmentLength));
    goldPct = (validInSegment / segmentLength) * 100;

    const sentInSegment = Math.max(0, Math.min(sentCount - startReq, segmentLength));
    const pinkInSegment = Math.max(0, sentInSegment - validInSegment);
    pinkPct = (pinkInSegment / segmentLength) * 100;
  }

  // Two-Layer Cumulative Progress Bar Calculations (Rule 4, 5, 6)
  const diffToUnlock = Math.max(0, targetReq - validCount);
  const validPct = Math.min(100, Math.round((validCount / targetReq) * 100));
  const totalSubmittedPct = Math.min(100, Math.round((sentCount / targetReq) * 100));
  const pendingPct = Math.max(0, totalSubmittedPct - validPct);

  // Dynamic description
  let dynamicDesc = '';
  if (isCompleted) {
    dynamicDesc = 'Parabéns! Benefício conquistado para sua festa.';
  } else if (isInProgress) {
    dynamicDesc = `Faltam ${diffToUnlock} ${diffToUnlock === 1 ? 'indicação validada' : 'indicações validadas'} para a meta ser conquistada!`;
  } else {
    const neededSent = targetReq - sentCount;
    dynamicDesc = `Faça mais ${neededSent} ${neededSent === 1 ? 'indicação' : 'indicações'} para desbloquear.`;
  }

  // Scroll reveal observer
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = `opacity 0.4s ease ${index * 0.08}s, transform 0.4s ease ${index * 0.08}s`;
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  const stateKey = isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'locked';
  const stateCfg = STATUS_CONFIG[stateKey];
  const cardClass = `card-milestone-${stateKey}`;

  return (
    <div
      ref={cardRef}
      className="journey-milestone-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr',
        gap: '28px',
        position: 'relative',
        marginBottom: isLast ? 0 : '12px',
        alignItems: 'center',
      }}
    >
      {/* ── 1. TIMELINE VERTICAL AXIS (Esquerda) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>

        {/* Node Icon Circle (44px) */}
        <div 
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: stateCfg.nodeBg,
            border: `2.5px solid ${stateCfg.nodeBorder}`,
            boxShadow: stateCfg.nodeGlow,
            zIndex: 2,
            transition: 'all 0.35s ease',
          }}
        >
          {isCompleted ? (
            <Check size={20} color="#3D2702" strokeWidth={3.2} />
          ) : isInProgress ? (
            <Star size={19} fill="#FFF" color="#FFF" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' }} />
          ) : (
            <Lock size={17} color="#FFF" />
          )}
        </div>

        {/* Dynamic Dual-Color Vertical Connecting Line Segment (Dourado -> Rosa -> Cinza) */}
        {!isLast && (
          <div style={{
            position: 'relative',
            width: '3px',
            flex: 1,
            minHeight: '48px',
            marginTop: '4px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderLeft: (goldPct === 0 && pinkPct === 0) ? '2px dashed rgba(255,255,255,0.2)' : 'none',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            {/* Top Dourado Portion (Validadas) */}
            {goldPct > 0 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${goldPct}%`,
                background: 'linear-gradient(180deg, #DDA84B 0%, #FFD700 100%)',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
                transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 2,
              }} />
            )}

            {/* Middle Rosa Portion (Pendentes de Validação) */}
            {pinkPct > 0 && (
              <div style={{
                position: 'absolute',
                top: `${goldPct}%`,
                left: 0,
                width: '100%',
                height: `${pinkPct}%`,
                background: 'linear-gradient(180deg, #FF1493 0%, #FF6090 100%)',
                boxShadow: '0 0 10px rgba(255, 20, 147, 0.6)',
                transition: 'top 0.6s ease, height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1,
              }} />
            )}
          </div>
        )}
      </div>

      {/* ── 2. CARD CONTAINER (Direita - Grid 3 Áreas) ── */}
      <div
        className={`journey-card ${cardClass}`}
        style={{
          minHeight: '145px',
          borderRadius: '18px',
          padding: '20px 24px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 300ms ease',
          display: 'grid',
          gridTemplateColumns: '1fr 220px 70px',
          columnGap: '20px',
          alignItems: 'center',
        }}
      >
        {/* Sparkles decoration background for active/completed cards */}
        {(isCompleted || isInProgress) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.12,
            backgroundImage: `radial-gradient(#FFD700 1px, transparent 1px)`,
            backgroundSize: '18px 18px',
          }} />
        )}

        {/* ── ÁREA 1: INFORMAÇÃO (Esquerda) ── */}
        <div style={{ zIndex: 1, minWidth: 0 }}>
          {/* Status badge */}
          <div style={{ marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '24px',
              padding: '0 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              background: stateCfg.badgeBg,
              color: stateCfg.badgeColor,
              fontFamily: 'Poppins, sans-serif'
            }}>
              {stateCfg.label}
            </span>
          </div>

          {/* Quantidade de indicações (Requirement) */}
          <h3 style={{
            fontSize: '22px',
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: '6px',
            marginBottom: '2px',
            color: isCompleted ? '#3D2702' : isInProgress ? '#26171F' : '#4E4654',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {milestone.title}
          </h3>

          {/* Benefício (Reward Title) */}
          <p style={{
            fontSize: '15px',
            fontWeight: 600,
            marginTop: '4px',
            color: isCompleted ? '#6B4403' : isInProgress ? '#D81B60' : '#6B6172',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {milestone.rewardTitle}
          </p>

          {/* Progresso em Duas Camadas: Dourado (Validadas) + Rosa (Pendentes) */}
          {(isInProgress || isCompleted || (isLocked && sentCount > 0)) && (
            <div style={{ maxWidth: '240px', marginTop: '8px' }}>
              <div style={{
                height: '8px',
                borderRadius: '999px',
                background: isLocked ? 'rgba(0,0,0,0.12)' : '#EAE5EC',
                display: 'flex',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Segmento 1: DOURADO (Validadas / Progresso Confirmado) */}
                <div style={{
                  height: '100%',
                  width: `${validPct}%`,
                  background: 'linear-gradient(90deg, #DDA84B 0%, #FFD700 100%)',
                  boxShadow: validPct > 0 ? '0 0 8px rgba(221, 168, 75, 0.6)' : 'none',
                  transition: 'width 0.6s ease'
                }} />
                {/* Segmento 2: ROSA (Pendentes em Análise Comercial) */}
                <div style={{
                  height: '100%',
                  width: `${pendingPct}%`,
                  background: isLocked ? '#9E98A8' : 'linear-gradient(90deg, #FF1493 0%, #FF6090 100%)',
                  boxShadow: pendingPct > 0 && !isLocked ? '0 0 8px rgba(255, 20, 147, 0.6)' : 'none',
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          )}

          {/* Dynamic description line (curta no mobile, completa no desktop) */}
          <p className="desktop-desc" style={{
            fontSize: '12px',
            lineHeight: 1.4,
            marginTop: '8px',
            maxWidth: '480px',
            color: isCompleted ? '#754C06' : isInProgress ? '#D81B60' : '#6B6172',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: isInProgress ? 700 : 500
          }}>
            {dynamicDesc}
          </p>

          {/* Mobile description: Omitir se concluído para manter limpo */}
          {!isCompleted && (
            <p className="mobile-desc" style={{
              fontSize: '11px',
              lineHeight: 1.3,
              marginTop: '4px',
              color: isInProgress ? '#D81B60' : '#6B6172',
              fontFamily: 'Poppins, sans-serif',
              display: 'none',
              fontWeight: isInProgress ? 700 : 500
            }}>
              {isInProgress 
                ? `Faltam ${diffToUnlock} ${diffToUnlock === 1 ? 'validação' : 'validações'}` 
                : `Faça mais ${targetReq - sentCount} ${targetReq - sentCount === 1 ? 'indicação' : 'indicações'}`}
            </p>
          )}
        </div>

        {/* ── ÁREA 2: VISUAL DA RECOMPENSA 3D (Asset Amplo & Transparente) ── */}
        <div className="journey-card-area-2" style={{
          position: 'relative',
          width: '220px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <TransparentRewardVisual
            src={milestone.rewardImageUrl}
            alt={milestone.rewardTitle}
            status={milestone.status}
            className="journey-card-asset"
            style={{
              maxWidth: '190px',
              maxHeight: '130px',
              objectFit: 'contain',
              filter: isLocked
                ? 'grayscale(100%) opacity(0.35)'
                : isCompleted
                ? 'drop-shadow(0 10px 24px rgba(221,168,75,0.65)) sepia(25%) saturate(130%) brightness(1.03)'
                : 'drop-shadow(0 10px 24px rgba(255,20,147,0.45))',
              animation: (isCompleted || isInProgress) ? 'floatSimple 3.5s ease-in-out infinite' : 'none',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* ── ÁREA 3: ESTADO (Extrema Direita - Círculo Único no Desktop, Oculto no Mobile) ── */}
        <div className="journey-card-area-3" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          minWidth: '70px'
        }}>
          {/* Completed: Círculo Dourado Metal 54px com Check Dourado */}
          {isCompleted && (
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
              border: '2.5px solid #FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(221, 168, 75, 0.55)'
            }}>
              <Check size={24} color="#3D2702" strokeWidth={3.5} />
            </div>
          )}

          {/* In Progress: Counter Box Neon Rosa */}
          {isInProgress && (
            <div style={{
              background: 'rgba(255, 20, 147, 0.15)',
              border: '1.5px solid #FF1493',
              borderRadius: '14px',
              padding: '8px 12px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(255, 20, 147, 0.35)'
            }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#D81B60', lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
                {validCount} / {targetReq}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#D81B60', fontWeight: 700, fontFamily: 'Poppins, sans-serif', marginTop: '2px' }}>
                válidas
              </div>
            </div>
          )}

          {/* Locked: Circular Lock Badge Cinza Apagado (54px) */}
          {isLocked && (
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#A39CA9',
              border: '1.5px solid #8D8693',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9
            }}>
              <Lock size={20} color="#3D3743" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .journey-milestone-row {
            grid-template-columns: 36px 1fr !important;
            gap: 12px !important;
          }

          .journey-card {
            grid-template-columns: 1fr 115px !important;
            column-gap: 10px !important;
            padding: 12px 14px !important;
            min-height: 135px !important;
            max-height: 180px !important;
          }

          .journey-card-area-3 {
            display: none !important;
          }

          .journey-card-area-2 {
            width: 115px !important;
            height: 105px !important;
            justify-content: flex-end !important;
          }

          .journey-card-asset {
            max-width: 105px !important;
            max-height: 95px !important;
          }

          .desktop-desc {
            display: none !important;
          }

          .mobile-desc {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

/* Export alias MilestoneCard for backward compatibility */
export const MilestoneCard = ReferralJourneyMilestone;
