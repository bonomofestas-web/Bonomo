import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Package, FileText } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead } from '../../types/admin';

interface CloseDealValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmSale: (leadId: string, dealValue: number, packageSold: string, closerNotes: string) => void;
}

export const CloseDealValueModal: React.FC<CloseDealValueModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmSale,
}) => {
  const { currentUser } = useAdminState();
  const [dealValueStr, setDealValueStr] = useState(() => {
    if (!lead) return '';
    const val = lead.dealValue || lead.estimatedBudget || 0;
    return val > 0 ? String(val) : '';
  });
  const [packageSold, setPackageSold] = useState(() => {
    if (!lead) return '';
    return lead.packageSold || lead.interestService || '';
  });
  const [closerNotes, setCloserNotes] = useState('');
  const [error, setError] = useState('');

  // Sync state when lead changes
  React.useEffect(() => {
    if (lead) {
      const val = lead.dealValue || lead.estimatedBudget || 0;
      setDealValueStr(val > 0 ? String(val) : '');
      setPackageSold(lead.packageSold || lead.interestService || '');
      setCloserNotes('');
      setError('');
    }
  }, [lead?.id]);

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

    if (!closerNotes.trim()) {
      setError('Por favor, preencha o Relatório do Closer (passagem de bastão para o Pós-Venda).');
      return;
    }

    onConfirmSale(lead.id, valueNum, packageSold.trim(), closerNotes.trim());
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
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Inter', sans-serif",
  };

  const primaryDecisor = (lead.contacts || []).find(c => c.isPrimaryDecisionMaker) || (lead.contacts || [])[0];

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
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid var(--adm-accent)',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(20, 169, 215, 0.25)',
        overflow: 'hidden',
        maxHeight: '92vh',
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
          background: 'rgba(20, 169, 215, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(20, 169, 215, 0.18)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Fechamento de Venda & Passagem de Bastão
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Aniversariante: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong> • Decisor: <strong style={{ color: 'var(--adm-accent)' }}>{primaryDecisor?.name || 'Decisor'}</strong>
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
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
                placeholder="Ex: 28500"
                style={{
                  ...inputStyle,
                  paddingLeft: '44px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--adm-accent)',
                }}
              />
            </div>
          </div>

          {/* Pacote / Descrição */}
          <div>
            <label style={labelStyle}>
              Pacote / Serviços Contratados *
            </label>
            <div style={{ position: 'relative' }}>
              <Package size={15} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
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
                  paddingLeft: '36px',
                }}
              />
            </div>
          </div>

          {/* Relatório do Closer (Passagem de Bastão) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} color="var(--adm-accent)" />
                <span>Relatório do Closer / Passagem de Bastão *</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--adm-accent)', fontWeight: 700 }}>
                Fechador: {currentUser?.name}
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={closerNotes}
              onChange={(e) => {
                setCloserNotes(e.target.value);
                setError('');
              }}
              placeholder="Descreva como foi o fechamento, o que foi combinado com a família, particularidades do evento, cortesias acordadas, etc..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '80px',
                lineHeight: 1.4,
              }}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '3px', display: 'block' }}>
              Este texto será gravado como o primeiro item do histórico do cliente no Pós-Venda com sua identificação.
            </span>
          </div>

          {/* Banner de Confirmação */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <CheckCircle2 size={20} color="#10B981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.74rem', color: '#10B981', lineHeight: 1.4 }}>
              Ao confirmar, o lead se torna <strong>Ganho</strong> e é criado automaticamente como <strong>Cliente no Pós-Venda</strong>.
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
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
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              }}
            >
              Concretizar Venda e Criar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
