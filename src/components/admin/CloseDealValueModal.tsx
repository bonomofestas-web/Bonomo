import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Package, FileText } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead } from '../../types/admin';

interface CloseDealValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmSale: (
    leadId: string, 
    dealValue: number, 
    packageSold: string, 
    closerNotes: string,
    extraOptions?: {
      downPayment?: number;
      installmentsCount?: number;
      hasCreditCard?: boolean;
      contractSignedFileUrl?: string;
      contractSignedFileName?: string;
      guestCount?: number;
      eventYear?: number | string;
    }
  ) => void;
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
  const [downPaymentStr, setDownPaymentStr] = useState(() => {
    if (!lead) return '';
    const val = (lead as any).downPayment || (lead as any).contractDownPayment || (lead as any).signalValue || 0;
    return val > 0 ? String(val) : '';
  });
  const [installmentsCount, setInstallmentsCount] = useState<number>(() => {
    return (lead as any)?.contractInstallmentsCount || 10;
  });
  const [hasCreditCard, setHasCreditCard] = useState<boolean>(() => {
    return Boolean((lead as any)?.hasCreditCard);
  });
  const [guestCount, setGuestCount] = useState<number>(() => {
    return (lead as any)?.guestCount || (lead as any)?.estimatedGuests || 150;
  });
  const [eventYear, setEventYear] = useState<string>(() => {
    if (lead?.partyDate) return String(new Date(lead.partyDate).getFullYear());
    return String((lead as any)?.eventYear || new Date().getFullYear());
  });
  const [packageSold, setPackageSold] = useState(() => {
    if (!lead) return '';
    return lead.packageSold || lead.interestService || '';
  });
  const [closerNotes, setCloserNotes] = useState('');
  const [contractSignedFileUrl, setContractSignedFileUrl] = useState<string>('');
  const [contractSignedFileName, setContractSignedFileName] = useState<string>('');
  const [error, setError] = useState('');

  // Sync state when lead changes
  React.useEffect(() => {
    if (lead) {
      const val = lead.dealValue || lead.estimatedBudget || 0;
      setDealValueStr(val > 0 ? String(val) : '');
      const down = (lead as any).downPayment || (lead as any).contractDownPayment || (lead as any).signalValue || 0;
      setDownPaymentStr(down > 0 ? String(down) : '');
      setPackageSold(lead.packageSold || lead.interestService || '');
      setInstallmentsCount((lead as any)?.contractInstallmentsCount || 10);
      setHasCreditCard(Boolean((lead as any)?.hasCreditCard));
      setGuestCount((lead as any)?.guestCount || (lead as any)?.estimatedGuests || 150);
      if (lead?.partyDate) {
        setEventYear(String(new Date(lead.partyDate).getFullYear()));
      }
      setCloserNotes('');
      setContractSignedFileUrl('');
      setContractSignedFileName('');
      setError('');
    }
  }, [lead?.id]);

  if (!isOpen || !lead) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setContractSignedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setContractSignedFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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

    const downNum = downPaymentStr ? parseFloat(downPaymentStr.replace(/\./g, '').replace(',', '.')) : 0;

    onConfirmSale(lead.id, valueNum, packageSold.trim(), closerNotes.trim(), {
      downPayment: isNaN(downNum) ? 0 : downNum,
      installmentsCount: Number(installmentsCount) || 10,
      hasCreditCard,
      contractSignedFileUrl: contractSignedFileUrl || undefined,
      contractSignedFileName: contractSignedFileName || undefined,
      guestCount: Number(guestCount) || 150,
      eventYear: eventYear || undefined,
    });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--adm-bg-input)',
    border: '1px solid var(--adm-border)',
    borderRadius: '10px',
    padding: '9px 12px',
    color: 'var(--adm-text-title)',
    fontSize: '0.82rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.70rem',
    color: 'var(--adm-text-title)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '5px',
    fontFamily: "'Inter', sans-serif",
  };

  const primaryDecisor = (lead.contacts || []).find(c => c.isPrimaryDecisionMaker) || (lead.contacts || [])[0];

  const valueNum = parseFloat(dealValueStr.replace(/\./g, '').replace(',', '.')) || 0;
  const downNum = parseFloat(downPaymentStr.replace(/\./g, '').replace(',', '.')) || 0;
  const remainingNum = Math.max(0, valueNum - downNum);
  const parcelValue = installmentsCount > 0 ? (remainingNum / installmentsCount) : 0;

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
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1.5px solid var(--adm-accent)',
        borderRadius: '20px',
        maxWidth: '580px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(20, 169, 215, 0.25)',
        overflow: 'hidden',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(20, 169, 215, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'rgba(20, 169, 215, 0.18)',
              border: '1px solid var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--adm-accent)',
            }}>
              <DollarSign size={18} />
            </div>
            <div>
              <h2 style={{
                fontSize: '1.08rem',
                fontWeight: 800,
                color: 'var(--adm-text-title)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Fechamento de Venda & Passagem de Bastão
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
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
              width: '30px',
              height: '30px',
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {error && (
            <div style={{
              background: 'var(--adm-red-bg)',
              border: '1px solid var(--adm-red)',
              color: 'var(--adm-red)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          {/* Grid: Valor do Contrato & Entrada */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>
                Valor Total do Contrato (R$) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '9px', color: 'var(--adm-accent)', fontWeight: 800, fontSize: '0.85rem' }}>
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
                  placeholder="Ex: 58000"
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: 'var(--adm-accent)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Valor de Entrada / Sinal (R$)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#10B981', fontWeight: 800, fontSize: '0.85rem' }}>
                  R$
                </span>
                <input
                  type="text"
                  value={downPaymentStr}
                  onChange={(e) => setDownPaymentStr(e.target.value)}
                  placeholder="Ex: 10000"
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#10B981',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Grid: Parcelas & Cartão de Crédito */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Parcelamento do Saldo</label>
                {remainingNum > 0 && installmentsCount > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#F59E0B', fontWeight: 700 }}>
                    {installmentsCount}x de R$ {parcelValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <select
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                style={{ ...inputStyle, fontWeight: 700 }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 18, 20, 24].map(num => (
                  <option key={num} value={num}>{num}x {num === 1 ? '(À Vista / Sem Parcelamento)' : `Parcelas (Restante: R$ ${remainingNum.toLocaleString('pt-BR')})`}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Possui Cartão de Crédito?</label>
              <div style={{ display: 'flex', gap: '6px', height: '38px' }}>
                <button
                  type="button"
                  onClick={() => setHasCreditCard(true)}
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    border: `1.5px solid ${hasCreditCard ? '#10B981' : 'var(--adm-border)'}`,
                    background: hasCreditCard ? 'rgba(16, 185, 129, 0.15)' : 'var(--adm-bg-input)',
                    color: hasCreditCard ? '#10B981' : 'var(--adm-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {hasCreditCard && <CheckCircle2 size={12} />}
                  <span>Sim</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasCreditCard(false)}
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    border: `1.5px solid ${!hasCreditCard ? '#64748B' : 'var(--adm-border)'}`,
                    background: !hasCreditCard ? 'rgba(100, 116, 139, 0.15)' : 'var(--adm-bg-input)',
                    color: !hasCreditCard ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                  }}
                >
                  <span>Não</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid: Convidados & Ano do Evento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Nº de Convidados</label>
              <input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                placeholder="Ex: 150"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Ano Previsto da Festa</label>
              <input
                type="text"
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
                placeholder="Ex: 2026 / 2027"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Pacote / Descrição */}
          <div>
            <label style={labelStyle}>
              Pacote / Serviços Contratados *
            </label>
            <div style={{ position: 'relative' }}>
              <Package size={14} color="var(--adm-accent)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
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
                  paddingLeft: '34px',
                }}
              />
            </div>
          </div>

          {/* Upload do Contrato Assinado */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ ...labelStyle, margin: 0 }}>Anexar Contrato Assinado (PDF/Foto)</label>
              <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>Cai direto na aba Documentos do Cliente</span>
            </div>
            <div style={{
              border: '1.5px dashed var(--adm-border)',
              borderRadius: '10px',
              padding: '10px 14px',
              background: 'var(--adm-bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--adm-accent)" />
                <span style={{ fontSize: '0.74rem', color: contractSignedFileName ? 'var(--adm-text-title)' : 'var(--adm-text-muted)', fontWeight: contractSignedFileName ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contractSignedFileName || 'Nenhum contrato anexado ainda (opcional)'}
                </span>
              </div>
              <label style={{
                padding: '5px 10px',
                borderRadius: '6px',
                background: 'var(--adm-accent)',
                color: '#fff',
                fontSize: '0.70rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}>
                <span>{contractSignedFileName ? 'Substituir' : 'Escolher Arquivo'}</span>
                <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* Relatório do Closer (Passagem de Bastão) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
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
              rows={2}
              value={closerNotes}
              onChange={(e) => {
                setCloserNotes(e.target.value);
                setError('');
              }}
              placeholder="Descreva o fechamento, particularidades da família, promessas, cortesias acordadas, com quem tratar novos upsells..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '65px',
                lineHeight: 1.4,
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="adm-btn-secondary"
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                flex: 2,
                padding: '9px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.84rem',
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
