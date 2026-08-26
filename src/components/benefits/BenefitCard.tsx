import React from 'react';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Benefit } from '../../types';
import { useAppState } from '../../context/AppStateContext';

interface BenefitCardProps {
  benefit: Benefit;
  onClaimClick: (benefit: Benefit) => void;
}

export const BenefitCard: React.FC<BenefitCardProps> = ({ benefit, onClaimClick }) => {
  const { debutante, claimBenefit } = useAppState();

  const isLocked = benefit.status === 'locked';
  const isUnlocked = benefit.status === 'unlocked';
  const isClaimed = benefit.status === 'claimed';

  const handleClaim = () => {
    claimBenefit(benefit.id);
    onClaimClick(benefit);
  };

  return (
    <div 
      className="glass-card benefit-card-wrapper"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        border: isUnlocked 
          ? '1.5px solid var(--text-gold)' 
          : isClaimed 
          ? '1.5px solid #34D399' 
          : '1px solid var(--border-color)',
        opacity: isLocked ? 0.8 : 1
      }}
    >
      {/* Top Image */}
      <div style={{
        position: 'relative',
        height: '140px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: '14px'
      }}>
        <img 
          src={benefit.imageUrl} 
          alt={benefit.title} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isLocked ? 'grayscale(0.7)' : 'none'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '3px 8px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--primary-light)'
        }}>
          {benefit.category}
        </div>

        {isLocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(13, 7, 20, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <Lock size={24} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: '0.75rem', color: '#FFF', fontWeight: 700 }}>
              {benefit.requiredPoints} Indicações Necessárias
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
          {benefit.title}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {benefit.description}
        </p>
      </div>

      {/* Footer State & Button */}
      <div>
        {isUnlocked && (
          <button 
            onClick={handleClaim}
            className="btn-primary animate-pulse-glow" 
            style={{ 
              width: '100%', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              padding: '10px 16px',
              fontSize: '0.82rem'
            }}
          >
            <Sparkles size={15} /> Resgatar Benefício
          </button>
        )}

        {isClaimed && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            color: '#34D399', 
            fontWeight: 700, 
            fontSize: '0.82rem',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <CheckCircle2 size={16} /> Benefício Resgatado
          </div>
        )}

        {isLocked && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            textAlign: 'center',
            background: 'rgba(255,255,255,0.04)',
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)'
          }}>
            Faltam {benefit.requiredPoints - debutante.validReferrals} indicações válidas
          </div>
        )}
      </div>
    </div>
  );
};
