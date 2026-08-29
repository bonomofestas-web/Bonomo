import React from 'react';
import { Gift, Crown, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const JourneyViewSelector: React.FC = () => {
  const { journeySubTab, setJourneySubTab, convertedReferralSales, vipRewards } = useAppState();

  // If no VIP rewards configured for this debutante, do not show tab selector
  if (!vipRewards || vipRewards.length === 0) {
    return null;
  }

  const isBenefits = journeySubTab === 'benefits';
  const isVip = journeySubTab === 'vip_rewards';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
      marginTop: '8px',
    }}>
      <div style={{
        background: 'rgba(20, 11, 28, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 215, 0, 0.22)',
        borderRadius: '50px',
        padding: '5px',
        display: 'inline-flex',
        gap: '6px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        position: 'relative',
        maxWidth: '100%',
      }}>
        {/* Tab 1: BENEFÍCIOS (Default) */}
        <button
          onClick={() => setJourneySubTab('benefits')}
          style={{
            background: isBenefits
              ? 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)'
              : 'transparent',
            color: isBenefits ? '#FFF' : 'rgba(232, 201, 141, 0.75)',
            border: isBenefits ? '1px solid rgba(255, 176, 200, 0.4)' : 'none',
            borderRadius: '40px',
            padding: '9px 20px',
            fontSize: '0.82rem',
            fontWeight: isBenefits ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isBenefits ? '0 0 20px rgba(255, 92, 154, 0.55)' : 'none',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          <Gift size={15} color={isBenefits ? '#FFF' : '#E8C98D'} />
          <span>Benefícios</span>
        </button>

        {/* Tab 2: PRESENTES VIP */}
        <button
          onClick={() => setJourneySubTab('vip_rewards')}
          style={{
            background: isVip
              ? 'linear-gradient(135deg, #DDA84B 0%, #FFD700 100%)'
              : 'transparent',
            color: isVip ? '#3D2702' : 'rgba(232, 201, 141, 0.75)',
            border: isVip ? '1px solid #FFFFFF' : 'none',
            borderRadius: '40px',
            padding: '9px 20px',
            fontSize: '0.82rem',
            fontWeight: isVip ? 900 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isVip ? '0 0 24px rgba(255, 215, 0, 0.65)' : 'none',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            position: 'relative',
          }}
        >
          <Crown size={15} color={isVip ? '#3D2702' : '#FFD700'} />
          <span>Presentes VIP</span>
          {convertedReferralSales > 0 && (
            <span style={{
              background: isVip ? '#3D2702' : '#FFD700',
              color: isVip ? '#FFD700' : '#3D2702',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '0.65rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '2px',
            }}>
              {convertedReferralSales}
            </span>
          )}
          {convertedReferralSales === 0 && (
            <Sparkles size={12} color={isVip ? '#3D2702' : '#FFD700'} style={{ marginLeft: '-2px' }} />
          )}
        </button>
      </div>
    </div>
  );
};
