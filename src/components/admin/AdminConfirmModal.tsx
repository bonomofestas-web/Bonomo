import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  message,
  itemName,
  confirmText = 'Sim, Excluir',
  cancelText = 'Cancelar',
  danger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '20px',
      animation: 'fadeIn 0.18s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: danger ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid var(--adm-border)',
        borderRadius: '20px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: danger 
          ? '0 24px 64px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.15)'
          : '0 24px 64px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
            border: danger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {danger ? (
              <Trash2 size={20} color="#EF4444" />
            ) : (
              <AlertTriangle size={20} color="#D4AF37" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
            }}>
              {title}
            </h3>
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--adm-text-muted)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              {message || (
                <>
                  Tem certeza que deseja apagar {itemName ? <strong>"{itemName}"</strong> : 'este item'}? Esta ação não poderá ser desfeita.
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 24px 20px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          background: 'var(--adm-bg-input)',
          borderTop: '1px solid var(--adm-border)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '10px',
              padding: '9px 18px',
              color: 'var(--adm-text-title)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              background: danger 
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
              border: danger ? '1px solid #EF4444' : '1px solid #FFD700',
              borderRadius: '10px',
              padding: '9px 20px',
              color: danger ? '#FFFFFF' : '#1A0E00',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: danger 
                ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                : '0 4px 14px rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {danger && <Trash2 size={14} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
