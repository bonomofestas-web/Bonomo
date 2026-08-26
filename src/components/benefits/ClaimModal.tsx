import React from 'react';
import { X, Sparkles, Copy } from 'lucide-react';
import type { Benefit } from '../../types';

interface ClaimModalProps {
  benefit: Benefit | null;
  onClose: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ benefit, onClose }) => {
  if (!benefit) return null;

  const handleCopyCode = () => {
    if (benefit.voucherCode) {
      navigator.clipboard.writeText(benefit.voucherCode);
      alert('Código do Voucher Copiado para a área de transferência!');
    }
  };

  return (
    <div className="modal-overlay-responsive">
      <div className="glass-card modal-card-responsive" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '30px 24px',
        position: 'relative',
        border: '2px solid var(--text-gold)',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(28, 18, 41, 0.95) 0%, rgba(13, 7, 20, 0.98) 100%)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#FFF',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* Top Celebration Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          boxShadow: '0 0 24px rgba(245, 158, 11, 0.6)'
        }}>
          <Sparkles size={32} color="#FFF" className="animate-pulse-glow" />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <span className="badge badge-unlocked" style={{ fontSize: '0.72rem' }}>
            ✨ BENEFÍCIO RESGATADO COM SUCESSO!
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-gold)', marginBottom: '6px' }}>
          {benefit.title}
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.4 }}>
          {benefit.description}
        </p>

        {/* Voucher Code Box */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1.5px dashed var(--text-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-gold)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            VOUCHER OFICIAL DO BENEFÍCIO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px', color: '#FFF' }}>
            {benefit.voucherCode || 'VOUCHER-ATIVADO-2026'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Apresente este código no dia da festa ou reunião
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCopyCode} className="btn-primary" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', flex: 1, minWidth: '140px', justifyContent: 'center' }}>
            <Copy size={16} /> Copiar Código
          </button>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, minWidth: '100px', justifyContent: 'center' }}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
