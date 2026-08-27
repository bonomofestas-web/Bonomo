import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift, Crown } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { JourneyTemplate } from '../../types/admin';
import type { Milestone, VipReward, MilestoneStatus, VipRewardStatus } from '../../types';

interface AdminTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: JourneyTemplate | null;
}

export const AdminTemplateModal: React.FC<AdminTemplateModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
}) => {
  const { addTemplate, updateTemplate, benefitsCatalog, vipCatalog } = useAdminState();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seasonOrPeriod, setSeasonOrPeriod] = useState('Anual 2027');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vipRewards, setVipRewards] = useState<VipReward[]>([]);

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setDescription(templateToEdit.description);
      setSeasonOrPeriod(templateToEdit.seasonOrPeriod || 'Anual 2027');
      setMilestones(templateToEdit.milestones);
      setVipRewards(templateToEdit.vipRewards);
    } else {
      setName('Novo Modelo de Jornada');
      setDescription('Configuração personalizada de metas e presentes VIPs');
      setSeasonOrPeriod('Edição Especial');
      setMilestones([
        { id: 'm_1', title: 'Meta 1', description: 'Desbloqueie benefícios', requiredReferrals: 5, rewardTitle: 'Cabine de Fotos Interativa', rewardDescription: 'Fotos ilimitadas para todos os convidados', rewardImageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=500&auto=format&fit=crop&q=80', status: 'locked' as MilestoneStatus, iconName: 'Camera', badgeTag: '5 INDICAÇÕES' },
        { id: 'm_2', title: 'Meta 2', description: 'Desbloqueie benefícios', requiredReferrals: 10, rewardTitle: 'Robô de LED Gigante', rewardDescription: 'Apresentação com efeitos de CO2 na pista', rewardImageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80', status: 'locked' as MilestoneStatus, iconName: 'Zap', badgeTag: '10 INDICAÇÕES' },
        { id: 'm_3', title: 'Meta 3', description: 'Desbloqueie benefícios', requiredReferrals: 15, rewardTitle: 'DJ & Pista de Led Paris', rewardDescription: 'Show especial de abertura da balada', rewardImageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80', status: 'locked' as MilestoneStatus, iconName: 'Music', badgeTag: '15 INDICAÇÕES' },
      ]);
      setVipRewards([
        { id: 'vip_1', name: 'Apple Watch SE 2', description: 'Garantido com 1 contrato de festa fechado', imageUrl: 'https://images.unsplash.com/photo-1509741102003-ca64bfe5f069?w=500&auto=format&fit=crop&q=80', requiredSales: 1, order: 1, badgeTag: '1ª VENDA', status: 'in_progress' as VipRewardStatus },
        { id: 'vip_2', name: 'iPhone 15 128GB', description: 'Garantido com 2 contratos de festa fechados', imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80', requiredSales: 2, order: 2, badgeTag: '2 VENDAS', status: 'locked' as VipRewardStatus },
      ]);
    }
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleVipChange = (index: number, field: keyof VipReward, value: any) => {
    const updated = [...vipRewards];
    updated[index] = { ...updated[index], [field]: value };
    setVipRewards(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Auto-sort milestones ascending by required referrals
    const sortedMilestones = [...milestones].sort((a, b) => (Number(a.requiredReferrals) || 0) - (Number(b.requiredReferrals) || 0));
    // Auto-sort VIP rewards ascending by required sales
    const sortedVipRewards = [...vipRewards].sort((a, b) => (Number(a.requiredSales) || 0) - (Number(b.requiredSales) || 0));

    if (templateToEdit) {
      updateTemplate(templateToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        seasonOrPeriod: seasonOrPeriod.trim(),
        milestones: sortedMilestones,
        vipRewards: sortedVipRewards,
      });
    } else {
      addTemplate({
        name: name.trim(),
        description: description.trim(),
        seasonOrPeriod: seasonOrPeriod.trim(),
        milestones: sortedMilestones,
        vipRewards: sortedVipRewards,
      });
    }

    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'var(--adm-text-title)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '740px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--adm-bg-elevated)',
            border: '1px solid var(--adm-border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--adm-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--adm-accent)',
          }}>
            <Sparkles size={20} />
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--adm-text-title)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {templateToEdit ? 'Editar Modelo de Jornada' : 'Novo Modelo de Jornada'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '22px' }}>
          Defina as metas por indicação e os presentes VIPs por contrato fechado. As metas são auto-ordenadas por pontuação.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Nome do Modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Nome do Modelo de Jornada *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Jornada Especial Ouro 2027"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Temporada / Período
              </label>
              <input
                type="text"
                placeholder="Ex: Anual 2027"
                value={seasonOrPeriod}
                onChange={(e) => setSeasonOrPeriod(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Descrição do Modelo
            </label>
            <input
              type="text"
              placeholder="Ex: Pacote de prêmios focado em tecnologia e atrações de pista."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Milestones Configuration */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={16} color="var(--adm-accent)" />
                  <span>Metas da Jornada por Indicações (Ordem Crescente)</span>
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                  Edite a quantidade de indicações exigida. Os dados do prêmio vêm do Catálogo.
                </span>
              </div>

              {/* Quick Select from Benefits Catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value=""
                  onChange={(e) => {
                    const found = benefitsCatalog.find(b => b.id === e.target.value);
                    if (found) {
                      setMilestones(prev => {
                        const newMilestone: Milestone = {
                          id: `m_${Date.now()}`,
                          title: found.name,
                          description: found.description,
                          requiredReferrals: found.pointsRequired || 5,
                          rewardTitle: found.name,
                          rewardDescription: found.description,
                          rewardImageUrl: found.cardImageUrl || found.detailImageUrl,
                          status: 'locked',
                          iconName: 'Gift',
                          badgeTag: `${found.pointsRequired} INDICAÇÕES`,
                        };
                        return [...prev, newMilestone].sort((a, b) => (Number(a.requiredReferrals) || 0) - (Number(b.requiredReferrals) || 0));
                      });
                    }
                  }}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'var(--adm-accent)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">+ Inserir do Catálogo de Benefícios...</option>
                  {benefitsCatalog.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.pointsRequired} pts)</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {milestones.map((m, idx) => (
                <div key={m.id || idx} style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  {/* Thumbnail */}
                  {m.rewardImageUrl && (
                    <img
                      src={m.rewardImageUrl}
                      alt={m.rewardTitle}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1px solid var(--adm-border)',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Benefit Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {m.rewardTitle}
                      </span>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        background: 'var(--adm-accent-bg)',
                        color: 'var(--adm-accent)',
                        borderRadius: '6px',
                        padding: '1px 6px',
                      }}>
                        {m.requiredReferrals} pts exigidos
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.rewardDescription}
                    </p>
                  </div>

                  {/* Required Referrals Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <label style={{ display: 'block', fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                        Meta (Indicações)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={m.requiredReferrals}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          handleMilestoneChange(idx, 'requiredReferrals', val);
                        }}
                        style={{
                          width: '75px',
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          color: 'var(--adm-text-title)',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setMilestones(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--adm-red)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '12px',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VIP Rewards Configuration */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={16} color="#EC4899" />
                  <span>Presentes VIPs por Vendas Convertidas (Ordem Crescente)</span>
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                  Edite a quantidade de vendas exigida. Os dados do presente vêm do Catálogo VIP.
                </span>
              </div>

              {/* Quick Select from VIP Catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value=""
                  onChange={(e) => {
                    const found = vipCatalog.find(v => v.id === e.target.value);
                    if (found) {
                      setVipRewards(prev => {
                        const newReward: VipReward = {
                          id: `vip_${Date.now()}`,
                          name: found.name,
                          description: found.description,
                          imageUrl: found.cardImageUrl || found.detailImageUrl,
                          requiredSales: found.salesRequired || 1,
                          order: prev.length + 1,
                          badgeTag: found.badgeTag || `${found.salesRequired}ª VENDA`,
                          status: 'locked',
                        };
                        return [...prev, newReward].sort((a, b) => (Number(a.requiredSales) || 0) - (Number(b.requiredSales) || 0));
                      });
                    }
                  }}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'var(--adm-green)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">+ Inserir do Catálogo VIP...</option>
                  {vipCatalog.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.salesRequired} vendas)</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vipRewards.map((v, idx) => (
                <div key={v.id || idx} style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  {/* Thumbnail */}
                  {v.imageUrl && (
                    <img
                      src={v.imageUrl}
                      alt={v.name}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1px solid var(--adm-border)',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* VIP Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                        {v.name}
                      </span>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: 'var(--adm-green)',
                        borderRadius: '6px',
                        padding: '1px 6px',
                      }}>
                        {v.requiredSales} {v.requiredSales === 1 ? 'venda exigida' : 'vendas exigidas'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.description}
                    </p>
                  </div>

                  {/* Required Sales Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <label style={{ display: 'block', fontSize: '0.64rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                        Vendas Mínimas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={v.requiredSales}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          handleVipChange(idx, 'requiredSales', val);
                        }}
                        style={{
                          width: '75px',
                          background: 'var(--adm-bg-card)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          color: 'var(--adm-text-title)',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setVipRewards(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--adm-red)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '12px',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.86rem',
              }}
            >
              {templateToEdit ? 'Salvar Modelo' : 'Criar Modelo de Jornada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
