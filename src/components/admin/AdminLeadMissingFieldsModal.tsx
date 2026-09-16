import React from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import type { Lead } from '../../types/admin';

interface AdminLeadMissingFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInspector: () => void;
  lead: Lead | null;
  missingFields: string[];
}

export const AdminLeadMissingFieldsModal: React.FC<AdminLeadMissingFieldsModalProps> = ({
  isOpen,
  onClose,
  onOpenInspector,
  lead,
  missingFields,
}) => {
  if (!isOpen || !lead) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      animation: 'fadeIn 0.15s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}>
        {/* Clean Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B',
              flexShrink: 0,
            }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <h2 style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
              }}>
                Requisitos para Fechamento
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '1px 0 0 0' }}>
                Preencha os dados obrigatórios para mover para Ganho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Clean Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.80rem', color: 'var(--adm-text-body)', lineHeight: 1.45, margin: 0 }}>
            Para transferir o lead <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> para a esteira de <strong>Pós-Venda</strong>, é necessário preencher as seguintes informações:
          </p>

          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {missingFields.map((field, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                <span>{field}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px 14px',
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.80rem',
                color: 'var(--adm-text-muted)',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInspector();
              }}
              style={{
                flex: 1.6,
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.80rem',
                background: 'var(--adm-accent, #3B82F6)',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Completar na Ficha</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
