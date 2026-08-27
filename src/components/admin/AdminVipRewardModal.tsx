import React, { useState, useEffect } from 'react';
import { X, Crown, Save, Eye } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { VipRewardCatalogItem } from '../../types/admin';

interface AdminVipRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardToEdit?: VipRewardCatalogItem | null;
}

export const AdminVipRewardModal: React.FC<AdminVipRewardModalProps> = ({
  isOpen,
  onClose,
  rewardToEdit,
}) => {
  const { addVipCatalogItem, updateVipCatalogItem } = useAdminState();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [salesRequired, setSalesRequired] = useState(1);
  const [badgeTag, setBadgeTag] = useState('1ª VENDA');
  const [estimatedValue, setEstimatedValue] = useState<number>(3500);
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [detailImageUrl, setDetailImageUrl] = useState('');

  useEffect(() => {
    if (rewardToEdit) {
      setName(rewardToEdit.name);
      setDescription(rewardToEdit.description);
      setSalesRequired(rewardToEdit.salesRequired || 1);
      setBadgeTag(rewardToEdit.badgeTag || '1ª VENDA');
      setEstimatedValue(rewardToEdit.estimatedValue || 3500);
      setCardImageUrl(rewardToEdit.cardImageUrl || '');
      setDetailImageUrl(rewardToEdit.detailImageUrl || '');
    } else {
      // Clean initial state without mock data
      setName('');
      setDescription('');
      setSalesRequired(1);
      setBadgeTag('1ª VENDA');
      setEstimatedValue(3500);
      setCardImageUrl('');
      setDetailImageUrl('');
    }
  }, [rewardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (rewardToEdit) {
      updateVipCatalogItem(rewardToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        salesRequired: Number(salesRequired),
        badgeTag: badgeTag.trim(),
        estimatedValue: Number(estimatedValue),
        cardImageUrl: cardImageUrl.trim(),
        detailImageUrl: detailImageUrl.trim() || cardImageUrl.trim(),
      });
    } else {
      addVipCatalogItem({
        name: name.trim(),
        description: description.trim(),
        salesRequired: Number(salesRequired),
        badgeTag: badgeTag.trim(),
        estimatedValue: Number(estimatedValue),
        cardImageUrl: cardImageUrl.trim(),
        detailImageUrl: detailImageUrl.trim() || cardImageUrl.trim(),
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
        maxWidth: '960px',
        width: '100%',
        maxHeight: '92vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 30px rgba(236,72,153,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(20,17,27,0.95) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.18)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown size={20} color="#EC4899" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {rewardToEdit ? 'Editar Presente VIP' : 'Cadastrar Novo Presente VIP'}
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Presente de alto valor liberado para a debutante quando indicações fecham contrato de festa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
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
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Split View Content: Form on Left + Live Preview on Right */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
          {/* LEFT: Form */}
          <form 
            onSubmit={handleSubmit}
            style={{
              flex: 1,
              minWidth: '320px',
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderRight: '1px solid var(--adm-border)',
            }}
          >
            <div>
              <label style={labelStyle}>Nome do Presente VIP *</label>
              <input
                type="text"
                required
                placeholder="Ex: Apple Watch SE 2, iPhone 15, MacBook Air..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Vendas Necessárias *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={salesRequired}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 1;
                    setSalesRequired(val);
                    setBadgeTag(val === 1 ? '1ª VENDA' : `${val} VENDAS`);
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Valor Estimado (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Ex: 3500"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descrição do Presente VIP</label>
              <textarea
                rows={3}
                placeholder="Ex: Garantido quando 1 amiga fechar o contrato de 15 anos no espaço..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Image Upload */}
            <ImageUploadField
              label="Foto do Presente VIP"
              value={cardImageUrl}
              onChange={setCardImageUrl}
              aspectRatio="1:1"
              previewHeight="120px"
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="adm-btn-secondary"
                style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem' }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="adm-btn-primary"
                style={{ flex: 2, padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem' }}
              >
                <Save size={15} />
                <span>{rewardToEdit ? 'Salvar Alterações' : 'Salvar no Catálogo'}</span>
              </button>
            </div>
          </form>

          {/* RIGHT: Live Preview in Debutante App */}
          <div style={{
            width: '360px',
            background: 'var(--adm-bg-input)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EC4899', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase' }}>
              <Eye size={14} />
              <span>Preview no App da Debutante</span>
            </div>

            {/* Realistic Debutante VIP Card Preview */}
            <div style={{
              width: '100%',
              maxWidth: '300px',
              background: 'linear-gradient(135deg, rgba(38, 16, 32, 0.95) 0%, rgba(20, 10, 18, 0.98) 100%)',
              border: '1.5px solid rgba(236, 72, 153, 0.45)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(236,72,153,0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {cardImageUrl ? (
                <img
                  src={cardImageUrl}
                  alt={name || 'Presente VIP'}
                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '140px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.72rem',
                }}>
                  <Crown size={28} color="#EC4899" style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <span>Sem imagem cadastrada</span>
                </div>
              )}

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: '#EC4899',
                    background: 'rgba(236, 72, 153, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                  }}>
                    {salesRequired} {salesRequired === 1 ? 'Venda Exigida' : 'Vendas Exigidas'}
                  </span>

                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#22C55E' }}>
                    R$ {Number(estimatedValue).toLocaleString('pt-BR')}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#FFF', margin: 0 }}>
                  {name || 'Nome do Presente VIP'}
                </h4>

                <p style={{ fontSize: '0.74rem', color: '#D1C8BA', margin: 0, lineHeight: 1.4 }}>
                  {description || 'A descrição detalhada do presente aparecerá aqui para a debutante.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
