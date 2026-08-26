import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift, Crown } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
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

    if (templateToEdit) {
      updateTemplate(templateToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        seasonOrPeriod: seasonOrPeriod.trim(),
        milestones,
        vipRewards,
      });
    } else {
      addTemplate({
        name: name.trim(),
        description: description.trim(),
        seasonOrPeriod: seasonOrPeriod.trim(),
        milestones,
        vipRewards,
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
        maxWidth: '720px',
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
            {templateToEdit ? 'Editar Modelo de Jornada' : 'Criar Novo Modelo de Jornada'}
          </h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '22px' }}>
          Defina as metas da jornada e os presentes VIPs para aplicar nas debutantes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nome do Modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Nome do Modelo *
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
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={16} color="var(--adm-accent)" />
                <span>Metas da Jornada por Indicações</span>
              </h3>

              {/* Quick Select from Benefits Catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Puxar do Catálogo:</span>
                <select
                  onChange={(e) => {
                    const found = benefitsCatalog.find(b => b.id === e.target.value);
                    if (found) {
                      setMilestones(prev => [
                        ...prev,
                        {
                          id: `m_${Date.now()}`,
                          title: `Meta ${prev.length + 1}`,
                          description: 'Desbloqueie benefícios',
                          requiredReferrals: found.pointsRequired || 5,
                          rewardTitle: found.name,
                          rewardDescription: found.description,
                          rewardImageUrl: found.cardImageUrl || found.detailImageUrl,
                          status: 'locked',
                          iconName: 'Gift',
                          badgeTag: `${found.pointsRequired} INDICAÇÕES`,
                        }
                      ]);
                    }
                  }}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: 'var(--adm-accent)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                >
                  <option value="">+ Inserir do Catálogo...</option>
                  {benefitsCatalog.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.pointsRequired} pts)</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {milestones.map((m, idx) => (
                <div key={m.id || idx} style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginBottom: '4px', fontWeight: 600 }}>Meta (Qtd)</label>
                      <input
                        type="number"
                        value={m.requiredReferrals}
                        onChange={(e) => handleMilestoneChange(idx, 'requiredReferrals', Number(e.target.value))}
                        style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '8px', color: 'var(--adm-text-title)', textAlign: 'center', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginBottom: '4px', fontWeight: 600 }}>Título do Prêmio</label>
                      <input
                        type="text"
                        value={m.rewardTitle}
                        onChange={(e) => handleMilestoneChange(idx, 'rewardTitle', e.target.value)}
                        style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--adm-text-title)', fontWeight: 600 }}
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
                        padding: '8px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '16px',
                      }}
                    >
                      Remover
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginBottom: '4px', fontWeight: 600 }}>Descrição</label>
                    <input
                      type="text"
                      value={m.rewardDescription}
                      onChange={(e) => handleMilestoneChange(idx, 'rewardDescription', e.target.value)}
                      style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--adm-text-title)' }}
                    />
                  </div>

                  {/* Image Upload for Reward */}
                  <ImageUploadField
                    label={`Foto do Prêmio (Meta #${idx + 1})`}
                    value={m.rewardImageUrl}
                    onChange={(val) => handleMilestoneChange(idx, 'rewardImageUrl', val)}
                    aspectRatio="16:9"
                    previewHeight="70px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* VIP Rewards Configuration */}
          <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={16} color="#EC4899" />
                <span>Presentes VIPs por Vendas Convertidas</span>
              </h3>

              {/* Quick Select from VIP Catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Puxar do Catálogo VIP:</span>
                <select
                  onChange={(e) => {
                    const found = vipCatalog.find(v => v.id === e.target.value);
                    if (found) {
                      setVipRewards(prev => [
                        ...prev,
                        {
                          id: `vip_${Date.now()}`,
                          name: found.name,
                          description: found.description,
                          imageUrl: found.cardImageUrl || found.detailImageUrl,
                          requiredSales: found.salesRequired || 1,
                          order: prev.length + 1,
                          badgeTag: found.badgeTag || `${found.salesRequired}ª VENDA`,
                          status: 'locked',
                        }
                      ]);
                    }
                  }}
                  style={{
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: 'var(--adm-green)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                >
                  <option value="">+ Inserir Presente VIP...</option>
                  {vipCatalog.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.salesRequired} vendas)</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vipRewards.map((v, idx) => (
                <div key={v.id || idx} style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginBottom: '4px', fontWeight: 600 }}>Vendas Mín.</label>
                      <input
                        type="number"
                        value={v.requiredSales}
                        onChange={(e) => handleVipChange(idx, 'requiredSales', Number(e.target.value))}
                        style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '8px', color: 'var(--adm-text-title)', textAlign: 'center', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginBottom: '4px', fontWeight: 600 }}>Nome do Presente VIP</label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleVipChange(idx, 'name', e.target.value)}
                        style={{ width: '100%', background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--adm-text-title)', fontWeight: 600 }}
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
                        padding: '8px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '16px',
                      }}
                    >
                      Remover
                    </button>
                  </div>

                  {/* Image Upload for VIP */}
                  <ImageUploadField
                    label={`Foto do Presente VIP (#${idx + 1})`}
                    value={v.imageUrl}
                    onChange={(val) => handleVipChange(idx, 'imageUrl', val)}
                    aspectRatio="1:1"
                    previewHeight="70px"
                  />
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
