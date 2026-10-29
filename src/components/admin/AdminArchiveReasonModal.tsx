import React, { useState } from 'react';
import { X, Archive, AlertTriangle } from 'lucide-react';
import type { Lead } from '../../types/admin';

interface AdminArchiveReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmArchive: (leadId: string, reason: string) => Promise<void> | void;
}

const COMMON_ARCHIVE_REASONS = [
  'Contato temporariamente sem interesse (Retomar no futuro)',
  'Evento adiado indefinidamente pelo contratante',
  'Lead duplicado ou cadastrado por engano',
  'Lead inativo / Sem resposta no canal',
  'Transferido para atendimento externo',
  'Outro motivo...',
];

export const AdminArchiveReasonModal: React.FC<AdminArchiveReasonModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmArchive,
}) => {
  const [selectedReason, setSelectedReason] = useState(COMMON_ARCHIVE_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Outro motivo...' 
      ? customReasonText.trim() 
      : (customReasonText.trim() ? `${selectedReason} - ${customReasonText.trim()}` : selectedReason);

    if (!finalReason) {
      setError('Por favor, informe ou selecione o motivo do arquivamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmArchive(lead.id, finalReason);
      onClose();
    } catch (err) {
      console.error('Erro ao arquivar lead:', err);
      setError('Ocorreu um erro ao arquivar o lead. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid #8B5CF6',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(139, 92, 246, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(139, 92, 246, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.18)',
              border: '1px solid #8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8B5CF6',
            }}>
              <Archive size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
              }}>
                Arquivar Lead Comercial
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Lead: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> • {lead.code || 'CRM'}
              </p>
            </div>
          </div>
          <button
            type="button"
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          <div style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.76rem',
            color: 'var(--adm-text-title)',
          }}>
            <AlertTriangle size={16} color="#8B5CF6" style={{ flexShrink: 0 }} />
            <span>
              Ao arquivar, o lead é desanexado do funil ativo sem gerar alerta de sem funil e o motivo fica salvo no histórico.
            </span>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              color: 'var(--adm-text-title)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Motivo do Arquivamento *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {COMMON_ARCHIVE_REASONS.map(reason => {
                const isSelected = selectedReason === reason;
                return (
                  <div
                    key={reason}
                    onClick={() => {
                      setSelectedReason(reason);
                      setError('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#8B5CF6' : 'var(--adm-border)'}`,
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--adm-bg-input)',
                      color: isSelected ? '#8B5CF6' : 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{reason}</span>
                    {isSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              color: 'var(--adm-text-title)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              Observações Adicionais (Opcional)
            </label>
            <textarea
              rows={3}
              value={customReasonText}
              onChange={(e) => {
                setCustomReasonText(e.target.value);
                setError('');
              }}
              placeholder="Descreva detalhes que ajudem a equipe a entender este arquivamento..."
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: 'var(--adm-text-title)',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.86rem',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Arquivando...' : 'Confirmar Arquivamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
