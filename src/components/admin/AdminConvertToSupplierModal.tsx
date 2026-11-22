import React, { useState } from 'react';
import { Truck, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Select } from '../ui';

interface AdminConvertToSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (category: string) => Promise<void>;
  contactName: string;
  isLoading?: boolean;
}

const SUPPLIER_CATEGORIES = [
  'Geral',
  'Buffet & Gastronomia',
  'Decoração & Cenografia',
  'Foto & Filmagem',
  'Som & Iluminação / DJ',
  'Atração / Animação',
  'Doces & Bolo',
  'Bebidas & Bar',
  'Segurança & Limpeza',
  'Manutenção & Estrutura',
  'Outro',
];

export const AdminConvertToSupplierModal: React.FC<AdminConvertToSupplierModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contactName,
  isLoading = false,
}) => {
  const [category, setCategory] = useState('Geral');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(category);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--adm-bg-card, #1E293B)',
          border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.18)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06B6D4',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--adm-text-title, #FFFFFF)' }}>
                Transformar em Fornecedor
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                {contactName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94A3B8)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted, #E2E8F0)', lineHeight: 1.45 }}>
              Esta ação excluirá o registro deste contato das esteiras de <strong>Leads</strong> e <strong>Clientes</strong>, convertendo-o definitivamente em <strong>Fornecedor</strong> na Central de Contatos.
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--adm-text-title, #FFFFFF)',
                marginBottom: '6px',
              }}
            >
              Categoria do Fornecedor
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                background: 'var(--adm-bg-input, rgba(0, 0, 0, 0.25))',
                color: 'var(--adm-text-title, #FFFFFF)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              {SUPPLIER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                background: 'transparent',
                color: 'var(--adm-text-muted, #94A3B8)',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#06B6D4',
                color: '#FFFFFF',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Convertendo...</span>
                </>
              ) : (
                <>
                  <Truck size={15} />
                  <span>Confirmar Transformação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
