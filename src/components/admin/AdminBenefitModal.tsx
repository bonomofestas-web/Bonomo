import React, { useState, useEffect } from 'react';
import { X, Gift, Save, Eye } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { ImageUploadField } from './ImageUploadField';
import type { BenefitCatalogItem } from '../../types/admin';

interface AdminBenefitModalProps {
  isOpen: boolean;
  onClose: () => void;
  benefitToEdit?: BenefitCatalogItem | null;
}

export const AdminBenefitModal: React.FC<AdminBenefitModalProps> = ({
  isOpen,
  onClose,
  benefitToEdit,
}) => {
  const { addBenefitCatalogItem, updateBenefitCatalogItem } = useAdminState();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'festa' | 'convidados' | 'entretenimento' | 'gastronomia' | 'vip'>('festa');
  const [pointsRequired, setPointsRequired] = useState(5);
  const [estimatedValue, setEstimatedValue] = useState<number>(1500);
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [detailImageUrl, setDetailImageUrl] = useState('');

  useEffect(() => {
    if (benefitToEdit) {
      setName(benefitToEdit.name);
      setDescription(benefitToEdit.description);
      setCategory(benefitToEdit.category);
      setPointsRequired(benefitToEdit.pointsRequired);
      setEstimatedValue(benefitToEdit.estimatedValue || benefitToEdit.defaultValue || 1500);
      setCardImageUrl(benefitToEdit.cardImageUrl || '');
      setDetailImageUrl(benefitToEdit.detailImageUrl || '');
    } else {
      // Clean initial state without mock data
      setName('');
      setDescription('');
      setCategory('festa');
      setPointsRequired(5);
      setEstimatedValue(1500);
      setCardImageUrl('');
      setDetailImageUrl('');
    }
  }, [benefitToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (benefitToEdit) {
      updateBenefitCatalogItem(benefitToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        category,
        pointsRequired: Number(pointsRequired),
        estimatedValue: Number(estimatedValue),
        defaultValue: Number(estimatedValue),
        cardImageUrl: cardImageUrl.trim(),
        detailImageUrl: detailImageUrl.trim() || cardImageUrl.trim(),
      });
    } else {
      addBenefitCatalogItem({
        name: name.trim(),
        description: description.trim(),
        category,
        pointsRequired: Number(pointsRequired),
        estimatedValue: Number(estimatedValue),
        defaultValue: Number(estimatedValue),
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

  const categoryLabels: Record<string, string> = {
    festa: 'Festa & Horário',
    convidados: 'Convidados Extras',
    entretenimento: 'Entretenimento & Atrações',
    gastronomia: 'Gastronomia & Open Bar',
    vip: 'Experiência VIP',
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
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
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
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(20,17,27,0.95) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Gift size={20} color="var(--adm-accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                {benefitToEdit ? 'Editar Benefício do Catálogo' : 'Cadastrar Novo Benefício no Catálogo'}
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>
                Defina o nome, categoria, valor estimado e foto. Ao salvar, estará disponível para todas as jornadas.
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
              <label style={labelStyle}>Nome do Benefício *</label>
              <input
                type="text"
                required
                placeholder="Ex: Cabine de Fotos 360°, Robô de LED, DJ & Pista Paris..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="festa">Festa & Horário</option>
                  <option value="convidados">Convidados Extras</option>
                  <option value="entretenimento">Entretenimento & Atrações</option>
                  <option value="gastronomia">Gastronomia & Open Bar</option>
                  <option value="vip">Experiência VIP</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Valor Estimado (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Ex: 1500"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descrição do Benefício</label>
              <textarea
                rows={3}
                placeholder="Descreva o que está incluído no benefício para a debutante..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Image Upload */}
            <ImageUploadField
              label="Foto do Benefício (Card & Catálogo)"
              value={cardImageUrl}
              onChange={setCardImageUrl}
              aspectRatio="16:9"
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
                <span>{benefitToEdit ? 'Salvar Alterações' : 'Salvar no Catálogo'}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase' }}>
              <Eye size={14} />
              <span>Preview no App da Debutante</span>
            </div>

            {/* Realistic Debutante Card Preview */}
            <div style={{
              width: '100%',
              maxWidth: '300px',
              background: 'linear-gradient(135deg, rgba(32, 20, 48, 0.95) 0%, rgba(18, 12, 28, 0.98) 100%)',
              border: '1.5px solid rgba(212, 175, 55, 0.45)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {cardImageUrl ? (
                <img
                  src={cardImageUrl}
                  alt={name || 'Benefício'}
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
                  <Gift size={28} color="var(--adm-accent)" style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <span>Sem imagem cadastrada</span>
                </div>
              )}

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: '#D4AF37',
                    background: 'rgba(212, 175, 55, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                  }}>
                    {categoryLabels[category] || 'Benefício'}
                  </span>

                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#22C55E' }}>
                    R$ {Number(estimatedValue).toLocaleString('pt-BR')}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#FFF', margin: 0 }}>
                  {name || 'Nome do Benefício'}
                </h4>

                <p style={{ fontSize: '0.74rem', color: '#D1C8BA', margin: 0, lineHeight: 1.4 }}>
                  {description || 'A descrição detalhada do benefício aparecerá aqui para a debutante.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
