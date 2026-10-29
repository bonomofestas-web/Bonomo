import React, { useState } from 'react';
import { X, Trash2, ShieldAlert } from 'lucide-react';
import type { Lead } from '../../types/admin';
import { formatPhone } from '../../utils/phoneFormatter';

interface AdminDeleteLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmDelete: (leadId: string, reason: string) => Promise<void> | void;
}

const COMMON_DELETE_REASONS = [
  'Contato Spam / Telemarketing indevido',
  'Lead de teste criado pela equipe',
  'Número inválido / Inexistente',
  'Solicitação expressa do titular (LGPD / Remoção)',
  'Cadastro em duplicidade com erro grave',
  'Outro motivo...',
];

export const AdminDeleteLeadModal: React.FC<AdminDeleteLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmDelete,
}) => {
  const [selectedReason, setSelectedReason] = useState(COMMON_DELETE_REASONS[0]);
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
      setError('Por favor, descreva ou selecione o motivo da exclusão.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmDelete(lead.id, finalReason);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      setError('Ocorreu um erro ao excluir o lead. Tente novamente.');
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
        border: '1.5px solid #EF4444',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(239, 68, 68, 0.3)',
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
          background: 'rgba(239, 68, 68, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}>
              <Trash2 size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
              }}>
                Excluir Lead do Sistema
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Lead: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> • {formatPhone(lead.phone) || 'Sem telefone'}
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
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.76rem',
            color: 'var(--adm-text-title)',
            lineHeight: 1.4,
          }}>
            <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Registro de Auditoria:</strong> Ao confirmar, o lead será removido das esteiras e funis, mas os dados básicos (Nome, Telefone, Data, Responsável e Motivo) ficarão registrados permanentemente na aba <strong>Histórico de Leads Apagados</strong>.
            </div>
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
              Selecione o Motivo da Exclusão *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {COMMON_DELETE_REASONS.map(reason => {
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
                      border: `1px solid ${isSelected ? '#EF4444' : 'var(--adm-border)'}`,
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'var(--adm-bg-input)',
                      color: isSelected ? '#EF4444' : 'var(--adm-text-title)',
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
                    {isSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />}
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
              Observações / Justificativa da Exclusão *
            </label>
            <textarea
              required
              rows={3}
              value={customReasonText}
              onChange={(e) => {
                setCustomReasonText(e.target.value);
                setError('');
              }}
              placeholder="Explique detalhadamente o motivo da exclusão deste lead..."
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
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão e Salvar Histórico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
