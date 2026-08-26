import React from 'react';
import { Crown, Sparkles, Trophy, ShoppingBag } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { VipRewardCard } from './VipRewardCard';

export const VipRewardsHub: React.FC = () => {
  const { vipRewards, convertedReferralSales } = useAppState();

  const salesCount = convertedReferralSales;
  const conqueredCount = vipRewards.filter(r => salesCount >= r.requiredSales).length;
  const nextReward = vipRewards.find(r => salesCount < r.requiredSales);

  return (
    <section className="vip-rewards-hub-container" style={{ paddingBottom: '32px' }}>
      {/* ── 1. Luxury Header & Compact Explanation (Section 14) ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(221, 168, 75, 0.12) 0%, rgba(35, 21, 47, 0.95) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        borderRadius: '20px',
        padding: '20px 24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}>
        {/* Glow decoration */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 215, 0, 0.15)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '20px',
              padding: '3px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#FFD700',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '8px',
            }}>
              <Crown size={13} color="#FFD700" />
              <span>Clube de Presentes Exclusivos</span>
            </div>

            <h2 style={{
              fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
              fontWeight: 800,
              color: '#FFF',
              fontFamily: 'Poppins, sans-serif',
              lineHeight: 1.25,
              marginBottom: '6px',
            }}>
              Suas indicações podem se transformar em presentes incríveis! ✨
            </h2>

            <p style={{
              fontSize: '0.84rem',
              color: 'rgba(232, 201, 141, 0.85)',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: 'Poppins, sans-serif',
            }}>
              Quando uma amiga indicada por você fecha sua festa com a gente, você avança na sua jornada VIP e conquista prêmios de altíssimo luxo.
            </p>
          </div>
        </div>

        {/* ── VIP KPI Summary Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '18px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {/* KPI 1: Vendas Confirmadas */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 215, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShoppingBag size={18} color="#FFD700" />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                Festas Fechadas
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFF', lineHeight: 1.1 }}>
                {salesCount} {salesCount === 1 ? 'venda' : 'vendas'}
              </div>
            </div>
          </div>

          {/* KPI 2: Presentes Conquistados */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 92, 154, 0.3)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 92, 154, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Trophy size={18} color="#FF5C9A" />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                Conquistados
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FF5C9A', lineHeight: 1.1 }}>
                {conqueredCount} de {vipRewards.length}
              </div>
            </div>
          </div>

          {/* KPI 3: Próximo Desejo */}
          {nextReward && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sparkles size={18} color="#E8C98D" />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Próximo Desejo
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E8C98D', lineHeight: 1.1 }}>
                  {nextReward.name.split(' ')[0]} {nextReward.name.split(' ')[1] || ''} (Falta {nextReward.requiredSales - salesCount})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. VIP Rewards Gallery Grid ── */}
      <div className="vip-rewards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {vipRewards.map((reward, index) => (
          <VipRewardCard
            key={reward.id}
            reward={reward}
            index={index}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .vip-rewards-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </section>
  );
};
