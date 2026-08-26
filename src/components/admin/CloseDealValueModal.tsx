import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Package, Calendar } from 'lucide-react';
import type { Lead } from '../../types/admin';

interface CloseDealValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmSale: (leadId: string, dealValue: number, packageSold: string, contractDate: string) => void;
}

export const CloseDealValueModal: React.FC<CloseDealValueModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmSale,
}) => {
  const [dealValueStr, setDealValueStr] = useState('28500');
  const [packageSold, setPackageSold] = useState('Pacote Ouro Real 200 Convidados + Pista de LED');
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valueNum = parseFloat(dealValueStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valueNum) || valueNum <= 0) {
      setError('Por favor, informe o valor real do contrato fechado em R$ (maior que zero).');
      return;
    }

    if (!packageSold.trim()) {
      setError('Por favor, descreva o pacote ou serviços contratados.');
      return;
    }

    onConfirmSale(lead.id, valueNum, packageSold.trim(), contractDate);
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
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
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
              <DollarSign size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Registrar Venda Fechada
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Lead: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> • Indicada por {lead.debutanteName}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              background: 'var(--adm-red-bg)',
              border: '1px solid var(--adm-red)',
              color: 'var(--adm-red)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          {/* Valor do Contrato */}
          <div>
            <label style={labelStyle}>
              Valor Total do Contrato (R$) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '10px', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.9rem' }}>
                R$
              </span>
              <input
                type="text"
                required
                value={dealValueStr}
                onChange={(e) => {
                  setDealValueStr(e.target.value);
                  setError('');
                }}
                placeholder="28.500"
                style={{
                  ...inputStyle,
                  paddingLeft: '44px',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--adm-accent)',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '4px', display: 'block' }}>
              Este valor será creditado no faturamento e pontuará a debutante indicadora.
            </span>
          </div>

          {/* Pacote / Descrição */}
          <div>
            <label style={labelStyle}>
              Pacote / Serviços Contratados *
            </label>
            <div style={{ position: 'relative' }}>
              <Package size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                required
                value={packageSold}
                onChange={(e) => {
                  setPackageSold(e.target.value);
                  setError('');
                }}
                placeholder="Ex: Pacote Ouro Real 200 Convidados"
                style={{
                  ...inputStyle,
                  paddingLeft: '38px',
                }}
              />
            </div>
          </div>

          {/* Data do Fechamento */}
          <div>
            <label style={labelStyle}>
              Data da Assinatura do Contrato *
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="date"
                required
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: '38px',
                }}
              />
            </div>
          </div>

          {/* Impacto da Venda */}
          <div style={{
            background: 'var(--adm-accent-bg)',
            border: '1px solid var(--adm-accent)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <CheckCircle2 size={24} color="var(--adm-accent)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-title)', lineHeight: 1.4 }}>
              Ao confirmar, a etapa do lead mudará para <strong>Contrato Fechado</strong> e a comissão / pontuação da debutante <strong>{lead.debutanteName}</strong> será validada.
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
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
              Confirmar Fechamento de Venda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
