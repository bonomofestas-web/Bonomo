import React from 'react';
import { Lock, Check, Sparkles, Crown } from 'lucide-react';
import type { VipReward } from '../../types';
import { useAppState } from '../../context/AppStateContext';
import { TransparentRewardVisual } from '../common/TransparentRewardVisual';

export interface VipRewardCardProps {
  reward: VipReward;
  index: number;
}

export const VipRewardCard: React.FC<VipRewardCardProps> = ({ reward, index }) => {
  const { convertedReferralSales } = useAppState();

  const currentSales = convertedReferralSales;
  const targetSales = reward.requiredSales;

  const isCompleted = reward.status === 'completed' || reward.status === 'claimed';
  const isInProgress = reward.status === 'in_progress';
  const isLocked = reward.status === 'locked';

  const progressPct = Math.min(100, Math.round((currentSales / targetSales) * 100));
  const diffSales = Math.max(0, targetSales - currentSales);

  return (
    <div
      className={`vip-reward-card vip-card-${reward.status}`}
      style={{
        background: isCompleted
          ? 'linear-gradient(135deg, rgba(38, 26, 12, 0.95) 0%, rgba(20, 14, 8, 0.98) 100%)'
          : isInProgress
          ? 'linear-gradient(135deg, rgba(35, 21, 38, 0.95) 0%, rgba(18, 10, 24, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(22, 20, 28, 0.75) 0%, rgba(14, 12, 18, 0.85) 100%)',
        border: isCompleted
          ? '1.5px solid rgba(255, 215, 0, 0.55)'
          : isInProgress
          ? '1.5px solid rgba(255, 92, 154, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '22px',
        padding: '24px 22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isCompleted
          ? '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 28px rgba(255, 215, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          : isInProgress
          ? '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 92, 154, 0.18)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.35s ease',
      }}
    >
      {/* Background ambient luxury glow for completed or active card */}
      {isCompleted && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
      {isInProgress && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(255, 92, 154, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── TOP: Badge & Order ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        position: 'relative',
        zIndex: 2,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          fontFamily: 'Poppins, sans-serif',
          background: isCompleted
            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(221, 168, 75, 0.35) 100%)'
            : isInProgress
            ? 'rgba(255, 92, 154, 0.2)'
            : 'rgba(255, 255, 255, 0.08)',
          color: isCompleted ? '#FFD700' : isInProgress ? '#FFB0C8' : 'rgba(255, 255, 255, 0.55)',
          border: isCompleted
            ? '1px solid rgba(255, 215, 0, 0.5)'
            : isInProgress
            ? '1px solid rgba(255, 92, 154, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.12)',
        }}>
          {isCompleted ? <Crown size={12} color="#FFD700" /> : <Sparkles size={12} />}
          {reward.badgeTag || `${reward.requiredSales} ${reward.requiredSales === 1 ? 'Venda' : 'Vendas'}`}
        </span>

        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: isCompleted ? '#E8C98D' : 'rgba(255, 255, 255, 0.4)',
          fontFamily: 'Poppins, sans-serif',
        }}>
          VIP #{index + 1}
        </span>
      </div>

      {/* ── CENTER: Prominent 3D Mockup ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px 0 16px 0',
        zIndex: 2,
      }}>
        <TransparentRewardVisual
          src={reward.imageUrl}
          alt={reward.name}
          className="vip-card-asset"
          style={{
            maxWidth: '180px',
            maxHeight: '150px',
            objectFit: 'contain',
            filter: isLocked
              ? 'grayscale(100%) opacity(0.35)'
              : isCompleted
              ? 'drop-shadow(0 12px 28px rgba(255, 215, 0, 0.55)) brightness(1.05)'
              : 'drop-shadow(0 12px 24px rgba(255, 92, 154, 0.45))',
            animation: (isCompleted || isInProgress) ? 'floatSimple 3.8s ease-in-out infinite' : 'none',
            pointerEvents: 'none',
            transition: 'all 0.4s ease',
          }}
        />
      </div>

      {/* ── CONTENT: Title, Subtitle & Requirement ── */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: '16px' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: isCompleted ? '#FFF' : isInProgress ? '#FFF' : '#A8A2B0',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1.25,
          marginBottom: '4px',
        }}>
          {reward.name}
        </h3>

        {reward.subtitle && (
          <div style={{
            fontSize: '0.78rem',
            color: isCompleted ? '#FFD700' : isInProgress ? '#FFB0C8' : 'rgba(255, 255, 255, 0.5)',
            fontWeight: 600,
            fontFamily: 'Poppins, sans-serif',
            marginBottom: '8px',
          }}>
            {reward.subtitle}
          </div>
        )}

        <p style={{
          fontSize: '0.78rem',
          color: isCompleted ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
          lineHeight: 1.45,
          margin: 0,
          fontFamily: 'Poppins, sans-serif',
        }}>
          {reward.description}
        </p>
      </div>

      {/* ── PROGRESS BAR & METRIC ── */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: '14px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '6px',
          fontSize: '0.74rem',
          fontFamily: 'Poppins, sans-serif',
        }}>
          <span style={{
            color: isCompleted ? '#FFD700' : isInProgress ? '#FFB0C8' : 'rgba(255, 255, 255, 0.45)',
            fontWeight: 700,
          }}>
            {isCompleted
              ? 'Meta Atingida!'
              : isInProgress
              ? `${currentSales} de ${targetSales} vendas confirmadas`
              : `Meta: ${targetSales} ${targetSales === 1 ? 'venda confirmada' : 'vendas confirmadas'}`}
          </span>
          <span style={{
            color: isCompleted ? '#FFD700' : '#FFF',
            fontWeight: 800,
            fontSize: '0.8rem',
          }}>
            {progressPct}%
          </span>
        </div>

        {/* Bar */}
        <div style={{
          height: '8px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: isCompleted
              ? 'linear-gradient(90deg, #DDA84B 0%, #FFD700 100%)'
              : 'linear-gradient(90deg, #FF5C9A 0%, #FF1493 100%)',
            boxShadow: isCompleted
              ? '0 0 12px rgba(255, 215, 0, 0.8)'
              : isInProgress
              ? '0 0 10px rgba(255, 92, 154, 0.8)'
              : 'none',
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* ── FOOTER: Status Badge / Action State ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {isCompleted && (
          <div style={{
            background: 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)',
            color: '#3D2702',
            padding: '10px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 900,
            fontSize: '0.82rem',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)',
          }}>
            <Check size={17} strokeWidth={3.5} />
            <span>Presente Conquistado!</span>
          </div>
        )}

        {isInProgress && (
          <div style={{
            background: 'rgba(255, 92, 154, 0.14)',
            border: '1px solid rgba(255, 92, 154, 0.4)',
            color: '#FFB0C8',
            padding: '10px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 800,
            fontSize: '0.78rem',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <Sparkles size={14} color="#FF5C9A" />
            <span>Falta apenas {diffSales} {diffSales === 1 ? 'venda' : 'vendas'}!</span>
          </div>
        )}

        {isLocked && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.45)',
            padding: '10px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '0.76rem',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <Lock size={14} />
            <span>Bloqueado • Meta: {targetSales} {targetSales === 1 ? 'venda' : 'vendas'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
