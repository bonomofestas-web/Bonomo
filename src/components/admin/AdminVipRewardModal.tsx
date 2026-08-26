import React, { useState, useEffect } from 'react';
import { X, Crown, Save } from 'lucide-react';
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
      setName('');
      setDescription('Garantido com contrato de festa fechado por indicação');
      setSalesRequired(1);
      setBadgeTag('1ª VENDA');
      setEstimatedValue(3500);
      setCardImageUrl('https://images.unsplash.com/photo-1509741102003-ca64bfe5f069?w=500&auto=format&fit=crop&q=80');
      setDetailImageUrl('https://images.unsplash.com/photo-1509741102003-ca64bfe5f069?w=1200&auto=format&fit=crop&q=80');
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
        cardImageUrl,
        detailImageUrl,
      });
    } else {
      addVipCatalogItem({
        name: name.trim(),
        description: description.trim(),
        salesRequired: Number(salesRequired),
        badgeTag: badgeTag.trim(),
        estimatedValue: Number(estimatedValue),
        cardImageUrl,
        detailImageUrl,
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
    <div className="admin-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div className="admin-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '620px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(236, 72, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EC4899',
            }}>
              <Crown size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                {rewardToEdit ? 'Editar Presente VIP' : 'Novo Presente VIP'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Prêmio de alto valor desbloqueado por vendas de festas convertidas
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
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nome */}
          <div>
            <label style={labelStyle}>
              Nome do Presente VIP *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Apple Watch SE 2, iPhone 15..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Vendas, Tag & Valor Estimado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Vendas Fechadas
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={salesRequired}
                onChange={(e) => setSalesRequired(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Selo / Tag
              </label>
              <input
                type="text"
                placeholder="Ex: 1ª VENDA"
                value={badgeTag}
                onChange={(e) => setBadgeTag(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                placeholder="Ex: 3500"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>
              Descrição Comercial do Presente VIP
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Garantido com contrato de festa fechado por indicação da aniversariante..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '75px',
              }}
            />
          </div>

          {/* Imagem 1: Mockup 1:1 Transparente */}
          <ImageUploadField
            label="1. Mockup do Presente VIP (Formato 1:1 Quadrado PNG)"
            value={cardImageUrl}
            onChange={(val) => setCardImageUrl(val)}
            aspectRatio="1:1"
            previewHeight="85px"
            placeholder="Subir imagem isolada do produto VIP"
          />

          {/* Imagem 2: Banner 16:9 Oficial */}
          <ImageUploadField
            label="2. Banner Oficial / Fotografia do Produto (Formato 16:9)"
            value={detailImageUrl}
            onChange={(val) => setDetailImageUrl(val)}
            aspectRatio="16:9"
            previewHeight="95px"
            placeholder="Subir foto de divulgação ou banner 16:9"
          />

          {/* Footer Buttons */}
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
              <Save size={16} />
              <span>{rewardToEdit ? 'Salvar Alterações' : 'Adicionar ao Catálogo VIP'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
