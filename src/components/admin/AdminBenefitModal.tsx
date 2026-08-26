import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Save } from 'lucide-react';
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
      setCardImageUrl(benefitToEdit.cardImageUrl);
      setDetailImageUrl(benefitToEdit.detailImageUrl || '');
    } else {
      setName('');
      setDescription('');
      setCategory('festa');
      setPointsRequired(5);
      setEstimatedValue(1500);
      setCardImageUrl('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80');
      setDetailImageUrl('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80');
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

  return (
    <div style={{
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
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflowY: 'auto',
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
              background: 'var(--adm-accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <Gift size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                {benefitToEdit ? 'Editar Benefício do Catálogo' : 'Novo Benefício de Meta'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Item disponibilizado para montagem de jornadas de indicação
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
              Nome do Benefício *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Cabine de Fotos Espelho Mágico"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>
              Descrição Comercial do Benefício *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Descreva o que a debutante ganha ao atingir esta meta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '60px',
              }}
            />
          </div>

          {/* Categoria, Indicações & Valor Estimado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={inputStyle}
              >
                <option value="festa">Festa & Horário</option>
                <option value="convidados">Convidados Extras</option>
                <option value="entretenimento">Atrações & Show</option>
                <option value="gastronomia">Gastronomia</option>
                <option value="vip">Experiência VIP</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Indicações
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={pointsRequired}
                onChange={(e) => setPointsRequired(Number(e.target.value))}
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
                step={50}
                placeholder="Ex: 1500"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Imagens do Benefício */}
          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--adm-accent)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Imagens do Benefício (2 Formatos)
              </span>
            </div>

            {/* Image 1: Mockup Transparent for main app journey */}
            <div>
              <ImageUploadField
                label="Imagem 1: Mockup / Fundo Transparente (Destaque Principal na Jornada)"
                value={cardImageUrl}
                onChange={(val) => setCardImageUrl(val)}
                aspectRatio="1:1"
                placeholder="PNG com fundo transparente para o card/trilha da debutante"
                previewHeight="75px"
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px', display: 'block' }}>
                * Recomendado: Foto do item recortada em PNG transparente para flutuar no card da jornada.
              </span>
            </div>

            {/* Image 2: Banner / Modal / Real venue photo */}
            <div>
              <ImageUploadField
                label="Imagem 2: Banner / Foto Real do Salão (Modal de Detalhes do Benefício)"
                value={detailImageUrl}
                onChange={(val) => setDetailImageUrl(val)}
                aspectRatio="16:9"
                placeholder="Foto 16:9 de alta resolução com o benefício no salão"
                previewHeight="75px"
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px', display: 'block' }}>
                * Exibida quando a debutante clica para ver os detalhes da conquista ou fotos reais do serviço.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
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
              <Save size={14} />
              <span>Salvar no Catálogo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
