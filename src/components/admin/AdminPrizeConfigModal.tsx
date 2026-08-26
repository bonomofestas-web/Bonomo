import React, { useState, useEffect } from 'react';
import { X, Gift, Crown, Check, Sparkles } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { DebutanteAccount } from '../../types/admin';
import type { Milestone, VipReward } from '../../types';

interface AdminPrizeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  debutante: DebutanteAccount | null;
}

export const AdminPrizeConfigModal: React.FC<AdminPrizeConfigModalProps> = ({
  isOpen,
  onClose,
  debutante,
}) => {
  const { updateDebutanteMilestones, updateDebutanteVipRewards } = useAdminState();
  const [activeTab, setActiveTab] = useState<'milestones' | 'vip'>('milestones');

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vipRewards, setVipRewards] = useState<VipReward[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (debutante) {
      setMilestones(debutante.milestones || []);
      setVipRewards(debutante.vipRewards || []);
    }
  }, [debutante, isOpen]);

  if (!isOpen || !debutante) return null;

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleVipRewardChange = (index: number, field: keyof VipReward, value: any) => {
    const updated = [...vipRewards];
    updated[index] = { ...updated[index], [field]: value };
    setVipRewards(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateDebutanteMilestones(debutante.id, milestones);
    updateDebutanteVipRewards(debutante.id, vipRewards);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.45)',
        borderRadius: '24px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px 24px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 24px rgba(212, 175, 55, 0.15)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Sparkles size={20} color="#D4AF37" />
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#FFF',
            margin: 0,
          }}>
            Configuração de Prêmios — {debutante.name}
          </h2>
        </div>
        <p style={{ fontSize: '0.84rem', color: '#B5AFA4', marginBottom: '18px' }}>
          Personalize as etapas da jornada por indicações e os presentes VIPs por contratos fechados.
        </p>

        {/* Tabs Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            style={{
              background: activeTab === 'milestones' ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141118',
              color: activeTab === 'milestones' ? '#000' : '#E0DACD',
              border: activeTab === 'milestones' ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '14px',
              padding: '10px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Gift size={16} />
            <span>Metas da Jornada ({milestones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vip')}
            style={{
              background: activeTab === 'vip' ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141118',
              color: activeTab === 'vip' ? '#000' : '#E0DACD',
              border: activeTab === 'vip' ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '14px',
              padding: '10px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Crown size={16} />
            <span>Presentes VIPs ({vipRewards.length})</span>
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    background: '#120F16',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#D4AF37', fontWeight: 800, fontFamily: "'Cinzel', serif" }}>
                      Etapa #{idx + 1} — {m.requiredReferrals} Amigas Indicadas
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9E988D' }}>ID: {m.id}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                        Meta (Qtd)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={m.requiredReferrals}
                        onChange={(e) => handleMilestoneChange(idx, 'requiredReferrals', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#0D0A12',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '8px',
                          padding: '8px',
                          color: '#FFF',
                          fontSize: '0.86rem',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                        Título do Prêmio Conquistado
                      </label>
                      <input
                        type="text"
                        value={m.rewardTitle}
                        onChange={(e) => handleMilestoneChange(idx, 'rewardTitle', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0D0A12',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: '#FFF',
                          fontSize: '0.86rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                      Descrição do Prêmio
                    </label>
                    <input
                      type="text"
                      value={m.rewardDescription}
                      onChange={(e) => handleMilestoneChange(idx, 'rewardDescription', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0D0A12',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <ImageUploadField
                    label="Foto do Prêmio da Meta"
                    value={m.rewardImageUrl}
                    onChange={(val) => handleMilestoneChange(idx, 'rewardImageUrl', val)}
                    aspectRatio="16:9"
                    previewHeight="70px"
                  />
                </div>
              ))}
            </div>
          )}

          {/* VIP Rewards Tab */}
          {activeTab === 'vip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {vipRewards.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    background: '#120F16',
                    border: '1px solid rgba(255, 92, 154, 0.35)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#FFD700', fontWeight: 800, fontFamily: "'Cinzel', serif" }}>
                      Presente VIP #{idx + 1} — {v.requiredSales} Venda{v.requiredSales > 1 ? 's' : ''} Convertida{v.requiredSales > 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#FF5C9A' }}>{v.badgeTag || 'VIP'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                        Vendas Mínimas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={v.requiredSales}
                        onChange={(e) => handleVipRewardChange(idx, 'requiredSales', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#0D0A12',
                          border: '1px solid rgba(255, 92, 154, 0.35)',
                          borderRadius: '8px',
                          padding: '8px',
                          color: '#FFF',
                          fontSize: '0.86rem',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                        Nome do Presente VIP
                      </label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleVipRewardChange(idx, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0D0A12',
                          border: '1px solid rgba(255, 92, 154, 0.35)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: '#FFF',
                          fontSize: '0.86rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#B5AFA4', marginBottom: '4px' }}>
                      Descrição do Presente VIP
                    </label>
                    <input
                      type="text"
                      value={v.description}
                      onChange={(e) => handleVipRewardChange(idx, 'description', e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0D0A12',
                        border: '1px solid rgba(255, 92, 154, 0.35)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <ImageUploadField
                    label="Foto do Presente VIP"
                    value={v.imageUrl}
                    onChange={(val) => handleVipRewardChange(idx, 'imageUrl', val)}
                    aspectRatio="1:1"
                    previewHeight="70px"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFF',
                borderRadius: '50px',
                padding: '12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                background: savedSuccess ? '#10B981' : 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '50px',
                padding: '12px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {savedSuccess ? <Check size={18} /> : <Sparkles size={18} />}
              <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Prêmios da Debutante'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
