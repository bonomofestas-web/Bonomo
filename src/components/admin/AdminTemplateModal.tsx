import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Gift, Crown, Save, Trash2, Eye
} from 'lucide-react';
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
      setMilestones(templateToEdit.milestones || []);
      setVipRewards(templateToEdit.vipRewards || []);
    } else {
      // Clean initial state as mandated by Audio 3 (no mock data)
      setName('');
      setDescription('');
      setSeasonOrPeriod('Temporada 2027');
      setMilestones([]);
      setVipRewards([]);
    }
  }, [templateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleMilestonePointsChange = (index: number, points: number) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      requiredReferrals: points,
      badgeTag: `${points} ${points === 1 ? 'INDICAÇÃO' : 'INDICAÇÕES'}`,
    };
    // Auto-sort ascending by required referrals
    setMilestones(updated.sort((a, b) => (Number(a.requiredReferrals) || 0) - (Number(b.requiredReferrals) || 0)));
  };

  const handleVipSalesChange = (index: number, sales: number) => {
    const updated = [...vipRewards];
    updated[index] = {
      ...updated[index],
      requiredSales: sales,
      badgeTag: sales === 1 ? '1ª VENDA' : `${sales} VENDAS`,
    };
    // Auto-sort ascending by required sales
    setVipRewards(updated.sort((a, b) => (Number(a.requiredSales) || 0) - (Number(b.requiredSales) || 0)));
  };

  const handleAddMilestoneFromCatalog = (benefitId: string) => {
    if (!benefitId) return;
    const catItem = benefitsCatalog.find(b => b.id === benefitId);
    if (!catItem) return;

    const currentPoints = milestones.map(m => m.requiredReferrals);
    const nextPoints = currentPoints.length > 0 ? Math.max(...currentPoints) + 5 : (catItem.pointsRequired || 5);

    const newMilestone: Milestone = {
      id: `m_${Date.now()}`,
      title: `Meta ${milestones.length + 1}`,
      description: `Acumule ${nextPoints} indicações validadas`,
      requiredReferrals: nextPoints,
      rewardTitle: catItem.name,
      rewardDescription: catItem.description,
      rewardImageUrl: catItem.cardImageUrl,
      badgeTag: `${nextPoints} INDICAÇÕES`,
      status: 'locked' as MilestoneStatus,
      iconName: 'Gift',
    };

    setMilestones(prev => [...prev, newMilestone].sort((a, b) => (Number(a.requiredReferrals) || 0) - (Number(b.requiredReferrals) || 0)));
  };

  const handleAddVipFromCatalog = (vipId: string) => {
    if (!vipId) return;
    const catItem = vipCatalog.find(v => v.id === vipId);
    if (!catItem) return;

    const currentSales = vipRewards.map(v => v.requiredSales);
    const nextSales = currentSales.length > 0 ? Math.max(...currentSales) + 1 : (catItem.salesRequired || 1);

    const newVip: VipReward = {
      id: `vip_${Date.now()}`,
      name: catItem.name,
      description: catItem.description,
      imageUrl: catItem.cardImageUrl,
      requiredSales: nextSales,
      order: vipRewards.length + 1,
      badgeTag: nextSales === 1 ? '1ª VENDA' : `${nextSales} VENDAS`,
      status: 'locked' as VipRewardStatus,
    };

    setVipRewards(prev => [...prev, newVip].sort((a, b) => (Number(a.requiredSales) || 0) - (Number(b.requiredSales) || 0)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const sortedMilestones = [...milestones].sort((a, b) => (Number(a.requiredReferrals) || 0) - (Number(b.requiredReferrals) || 0));
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
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid var(--adm-border)',
        borderRadius: '24px',
        maxWidth: '1180px',
        width: '100%',
        maxHeight: '94vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(20,17,27,0.95) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={20} color="var(--adm-accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {templateToEdit ? 'Editar Modelo de Jornada' : 'Criar Novo Modelo de Jornada'}
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Selecione os prêmios do catálogo oficial para compor a jornada e os presentes VIPs da debutante.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--adm-bg-elevated)',
              border: '1px solid var(--adm-border)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Split View Content: Form on Left + Live Journey Mirror on Right */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT: Config Form */}
          <form 
            onSubmit={handleSubmit}
            style={{
              flex: 1.2,
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              borderRight: '1px solid var(--adm-border)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nome do Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jornada Bonomo Ouro 2027..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Temporada / Período</label>
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
              <label style={labelStyle}>Descrição da Jornada</label>
              <textarea
                rows={2}
                placeholder="Ex: Trilha padrão de benefícios e presentes VIPs para aniversariantes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* ── SECTION 1: METAS POR INDICAÇÕES (CATÁLOGO DE BENEFÍCIOS) ── */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift size={16} color="var(--adm-accent)" />
                    <span>Metas por Indicações de Amigas</span>
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Selecione prêmios do catálogo e ajuste a pontuação exigida (auto-ordenada).
                  </p>
                </div>

                {/* Select from catalog */}
                <select
                  value=""
                  onChange={(e) => {
                    handleAddMilestoneFromCatalog(e.target.value);
                    e.target.value = '';
                  }}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid var(--adm-accent)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'var(--adm-accent)',
                    fontSize: '0.74rem',
                    fontWeight: 800,
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

              {milestones.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', borderRadius: '12px' }}>
                  Nenhum benefício inserido ainda. Selecione um item do catálogo acima para compor a jornada.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {milestones.map((m, idx) => (
                    <div key={m.id || idx} style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      {m.rewardImageUrl && (
                        <img
                          src={m.rewardImageUrl}
                          alt={m.rewardTitle}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {m.rewardTitle}
                          </span>
                          <span style={{ fontSize: '0.62rem', background: 'rgba(212,175,55,0.15)', color: 'var(--adm-accent)', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            Protegido do Catálogo
                          </span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.rewardDescription}
                        </p>
                      </div>

                      {/* Points Modifier */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                            Pontos Exigidos
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={m.requiredReferrals}
                            onChange={(e) => handleMilestonePointsChange(idx, Number(e.target.value) || 1)}
                            style={{
                              width: '70px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              color: 'var(--adm-text-title)',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '0.82rem',
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
                            padding: '6px',
                            cursor: 'pointer',
                            marginTop: '12px',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 2: PRESENTES VIPS (CONTRATOS FECHADOS) ── */}
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crown size={16} color="#EC4899" />
                    <span>Presentes VIPs (Por Contratos Fechados)</span>
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                    Presentes liberados conforme as indicações da debutante fecham contratos.
                  </p>
                </div>

                <select
                  value=""
                  onChange={(e) => {
                    handleAddVipFromCatalog(e.target.value);
                    e.target.value = '';
                  }}
                  style={{
                    background: 'var(--adm-bg-card)',
                    border: '1px solid #EC4899',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#EC4899',
                    fontSize: '0.74rem',
                    fontWeight: 800,
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

              {vipRewards.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--adm-text-muted)', background: 'var(--adm-bg-card)', borderRadius: '12px' }}>
                  Nenhum presente VIP inserido. Selecione itens do catálogo VIP acima.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vipRewards.map((v, idx) => (
                    <div key={v.id || idx} style={{
                      background: 'var(--adm-bg-card)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      {v.imageUrl && (
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                            {v.name}
                          </span>
                          <span style={{ fontSize: '0.62rem', background: 'rgba(236,72,153,0.15)', color: '#EC4899', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            Protegido do Catálogo
                          </span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.description}
                        </p>
                      </div>

                      {/* Sales Modifier */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <label style={{ display: 'block', fontSize: '0.62rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                            Vendas Exigidas
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={v.requiredSales}
                            onChange={(e) => handleVipSalesChange(idx, Number(e.target.value) || 1)}
                            style={{
                              width: '70px',
                              background: 'var(--adm-bg-input)',
                              border: '1px solid var(--adm-border)',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              color: 'var(--adm-text-title)',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '0.82rem',
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
                            padding: '6px',
                            cursor: 'pointer',
                            marginTop: '12px',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="adm-btn-secondary"
                style={{ flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.84rem' }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="adm-btn-primary"
                style={{ flex: 2, padding: '10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.86rem' }}
              >
                <Save size={15} />
                <span>{templateToEdit ? 'Salvar Modelo de Jornada' : 'Criar Modelo de Jornada'}</span>
              </button>
            </div>
          </form>

          {/* RIGHT: Live Journey Preview (Mirror of Debutante App) */}
          <div style={{
            flex: 1,
            background: 'var(--adm-bg-input)',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-accent)', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <Eye size={14} />
                <span>Espelhamento da Jornada da Debutante</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', fontWeight: 700 }}>
                {milestones.length} benefícios • {vipRewards.length} VIPs
              </span>
            </div>

            {/* Mobile-Style Container */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 16, 38, 0.95) 0%, rgba(12, 8, 18, 0.98) 100%)',
              border: '1.5px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}>
              {/* Header Preview */}
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {seasonOrPeriod || 'Temporada 2027'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', margin: '2px 0 0 0' }}>
                  {name || 'Nome do Modelo'}
                </h3>
              </div>

              {/* Vertical Steps */}
              {milestones.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#A0988A', fontSize: '0.78rem' }}>
                  Insira prêmios na esquerda para visualizar o mapa da jornada aqui em tempo real.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                  {/* Glowing Vertical Line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '16px',
                    width: '3px',
                    background: 'linear-gradient(180deg, #D4AF37 0%, rgba(212,175,55,0.2) 100%)',
                    zIndex: 1,
                  }} />

                  {milestones.map((m, idx) => (
                    <div key={m.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative', zIndex: 2 }}>
                      {/* Node Circle */}
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 100%)',
                        border: '2px solid #FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        boxShadow: '0 0 12px rgba(212,175,55,0.6)',
                        flexShrink: 0,
                      }}>
                        {m.requiredReferrals}
                      </div>

                      {/* Card Node */}
                      <div style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        {m.rewardImageUrl && (
                          <img
                            src={m.rewardImageUrl}
                            alt={m.rewardTitle}
                            style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase' }}>
                            {m.requiredReferrals} {m.requiredReferrals === 1 ? 'Indicação' : 'Indicações'}
                          </span>
                          <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFF', margin: '1px 0 0 0' }}>
                            {m.rewardTitle}
                          </h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* VIP Gifts Preview */}
              {vipRewards.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EC4899', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                    <Crown size={14} />
                    <span>Presentes VIPs por Contratos</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {vipRewards.map((v, idx) => (
                      <div key={v.id || idx} style={{
                        background: 'rgba(236, 72, 153, 0.08)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        {v.imageUrl && (
                          <img
                            src={v.imageUrl}
                            alt={v.name}
                            style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#EC4899', textTransform: 'uppercase' }}>
                            {v.requiredSales} {v.requiredSales === 1 ? 'Venda Exigida' : 'Vendas Exigidas'}
                          </span>
                          <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFF', margin: '1px 0 0 0' }}>
                            {v.name}
                          </h5>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
