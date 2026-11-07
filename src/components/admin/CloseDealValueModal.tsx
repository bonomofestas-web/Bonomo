import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, DollarSign, Package, FileText, UserCheck, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Lead } from '../../types/admin';

interface CloseDealValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  targetStageId?: string;
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
      updateExistingClient?: boolean;
      existingClientId?: string;
      targetStageId?: string;
      birthdayPersonName?: string;
      birthdayPersonPhone?: string;
      birthdayPersonBirthdate?: string;
      payerName?: string;
      payerPhone?: string;
      payerEmail?: string;
      payerCpf?: string;
      payerAddress?: string;
      payerNeighborhood?: string;
      paymentTerms?: string;
    }
  ) => void;
}

export const CloseDealValueModal: React.FC<CloseDealValueModalProps> = ({
  isOpen,
  onClose,
  lead,
  targetStageId,
  onConfirmSale,
}) => {
  const { currentUser, clients, funnels } = useAdminState();
  const birthdayContact = (lead?.contacts || []).find(c => c.role === 'debutante' || (c.role as any) === 'aniversariante');
  const birthdayName = birthdayContact?.name?.trim() || (lead as any)?.birthdayPersonName?.trim() || (lead?.primaryContactRole === 'debutante' || lead?.primaryContactRole === 'aniversariante' ? lead?.name?.trim() : (lead?.debutanteName && lead.debutanteName !== 'Indicação Externa' ? lead.debutanteName.trim() : lead?.name?.trim())) || 'Aniversariante';

  const primaryDecisor = (lead?.contacts || []).find(c => c.isPrimaryDecisionMaker) || 
    (lead?.primaryContactRole !== 'debutante' ? {
      name: lead?.name,
      phone: lead?.phone,
      role: lead?.primaryContactRole || 'responsavel',
    } : (lead?.contacts || []).find(c => c.role !== 'debutante')) || (lead?.contacts || [])[0];

  // ── DETECÇÃO DE SEGURANÇA EM TODOS OS FUNIS DE PÓS-VENDA ──
  // Verifica se este lead já possui cliente cadastrado no pós-venda para evitar duplicidades
  const existingClient = useMemo(() => {
    if (!lead) return null;
    const cleanLeadPhone = (lead.phone || '').replace(/\D/g, '');
    const cleanDecisorPhone = (primaryDecisor?.phone || '').replace(/\D/g, '');
    const leadNameClean = (lead.name || '').trim().toLowerCase();
    const bdayNameClean = birthdayName.trim().toLowerCase();

    return clients.find(c => {
      // 1. Por ID do lead comercial
      if (c.commercialLeadId && c.commercialLeadId === lead.id) return true;
      // 2. Por código comercial
      if (c.commercialLeadCode && lead.code && c.commercialLeadCode === lead.code) return true;
      // 3. Por telefone do pagador ou aniversariante
      const cPayerPhone = (c.payerPhone || '').replace(/\D/g, '');
      const cBdayPhone = ((c as any).birthdayPersonPhone || '').replace(/\D/g, '');
      if (cleanLeadPhone && (cleanLeadPhone === cPayerPhone || cleanLeadPhone === cBdayPhone)) return true;
      if (cleanDecisorPhone && (cleanDecisorPhone === cPayerPhone || cleanDecisorPhone === cBdayPhone)) return true;
      // 4. Por nome idêntico da aniversariante ou contratante na mesma unidade
      const cNameClean = (c.name || '').trim().toLowerCase();
      const cBdayClean = (c.birthdayPersonName || '').trim().toLowerCase();
      const cPayerClean = (c.payerName || '').trim().toLowerCase();
      if ((c.venueId === lead.venueId || !c.venueId) && (
        (bdayNameClean && (bdayNameClean === cNameClean || bdayNameClean === cBdayClean)) ||
        (leadNameClean && (leadNameClean === cNameClean || leadNameClean === cPayerClean))
      )) {
        return true;
      }
      return false;
    }) || null;
  }, [clients, lead, primaryDecisor, birthdayName]);

  const existingClientFunnel = useMemo(() => {
    if (!existingClient) return null;
    return funnels.find(f => f.id === existingClient.funnelId) || null;
  }, [funnels, existingClient]);

  const existingClientStage = useMemo(() => {
    if (!existingClient || !existingClientFunnel) return null;
    return existingClientFunnel.stages?.find(s => s.id === existingClient.stage) || null;
  }, [existingClientFunnel, existingClient]);

  const [updateExistingMode, setUpdateExistingMode] = useState<'update' | 'keep_as_is'>('update');

  const [dealValueStr, setDealValueStr] = useState(() => {
    if (!lead) return '';
    const val = lead.dealValue || lead.estimatedBudget || 0;
    return val > 0 ? String(val) : '';
  });
  const [downPaymentStr, setDownPaymentStr] = useState(() => {
    if (!lead) return '';
    const val = lead.downPayment ?? (lead as any).contractDownPayment ?? (lead as any).signalValue ?? 0;
    return val > 0 ? String(val) : '';
  });
  const [installmentsCount, setInstallmentsCount] = useState<number>(() => {
    return lead?.installments || (lead as any)?.contractInstallmentsCount || 10;
  });
  const [hasCreditCard, setHasCreditCard] = useState<boolean>(() => {
    return Boolean(lead?.hasCreditCard ?? (lead as any)?.customFieldValues?.hasCreditCard);
  });
  const [guestCount, setGuestCount] = useState<number>(() => {
    return lead?.estimatedGuests || (lead as any)?.guestCount || 150;
  });
  const [eventYear, setEventYear] = useState<string>(() => {
    if (lead?.eventYear) return String(lead.eventYear);
    if (lead?.partyDate) return String(new Date(lead.partyDate + 'T12:00:00').getFullYear());
    if (lead?.eventDate) return String(new Date(lead.eventDate + 'T12:00:00').getFullYear());
    return String(new Date().getFullYear());
  });
  const [packageSold, setPackageSold] = useState(() => {
    if (!lead) return '';
    return lead.packageSold || lead.interestService || '';
  });
  const [closerNotes, setCloserNotes] = useState('');
  const [contractSignedFileUrl, setContractSignedFileUrl] = useState<string>('');
  const [contractSignedFileName, setContractSignedFileName] = useState<string>('');
  const [error, setError] = useState('');

  // Dados do Contratante e da Homenageada para Passagem de Bastão completa
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerCpf, setPayerCpf] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [payerNeighborhood, setPayerNeighborhood] = useState('');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [birthdayPersonPhone, setBirthdayPersonPhone] = useState('');
  const [birthdayPersonBirthdate, setBirthdayPersonBirthdate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [showTransferDetails, setShowTransferDetails] = useState(true);

  // Sync state strictly from lead data when modal opens or lead changes
  React.useEffect(() => {
    if (lead && isOpen) {
      const val = lead.dealValue || lead.estimatedBudget || 0;
      setDealValueStr(val > 0 ? String(val) : '');
      const down = lead.downPayment ?? (lead as any).contractDownPayment ?? (lead as any).signalValue ?? 0;
      setDownPaymentStr(down > 0 ? String(down) : '');
      setPackageSold(lead.packageSold || lead.interestService || '');
      setInstallmentsCount(lead.installments || (lead as any)?.contractInstallmentsCount || 10);
      setHasCreditCard(Boolean(lead.hasCreditCard ?? (lead as any)?.customFieldValues?.hasCreditCard));
      setGuestCount(lead.estimatedGuests || (lead as any)?.guestCount || 150);
      if (lead.eventYear) {
        setEventYear(String(lead.eventYear));
      } else if (lead.partyDate) {
        setEventYear(String(new Date(lead.partyDate + 'T12:00:00').getFullYear()));
      } else if (lead.eventDate) {
        setEventYear(String(new Date(lead.eventDate + 'T12:00:00').getFullYear()));
      }
      setCloserNotes('');
      setContractSignedFileUrl('');
      setContractSignedFileName('');
      setError('');
      setUpdateExistingMode('update');

      const bContact = (lead.contacts || []).find(c => c.role === 'debutante' || (c.role as any) === 'aniversariante');
      const bName = bContact?.name?.trim() || (lead as any)?.birthdayPersonName?.trim() || (lead.primaryContactRole === 'debutante' || lead.primaryContactRole === 'aniversariante' ? lead.name?.trim() : (lead.debutanteName && lead.debutanteName !== 'Indicação Externa' ? lead.debutanteName.trim() : lead.name?.trim())) || '';
      const bPhone = bContact?.phone?.trim() || (lead as any)?.birthdayPersonPhone?.trim() || (lead.primaryContactRole === 'debutante' ? lead.phone?.trim() : '') || '';
      const bDate = bContact?.birthday || (lead as any)?.debutanteBirthDate || (lead as any)?.birthday || '';
      setBirthdayPersonName(bName);
      setBirthdayPersonPhone(bPhone);
      setBirthdayPersonBirthdate(bDate);

      const pDecisor = (lead.contacts || []).find(c => c.isPrimaryDecisionMaker) || 
        (lead.primaryContactRole !== 'debutante' ? {
          name: lead.name,
          phone: lead.phone,
          role: lead.primaryContactRole || 'responsavel',
          email: lead.email,
          cpf: lead.cpf,
          address: lead.address,
          neighborhood: lead.neighborhood,
        } : (lead.contacts || []).find(c => c.role !== 'debutante')) || (lead.contacts || [])[0];

      setPayerName(pDecisor?.name?.trim() || (lead as any).decisionMakerName?.trim() || (lead as any).payerName?.trim() || (lead.primaryContactRole !== 'debutante' ? lead.name : ''));
      setPayerPhone(pDecisor?.phone?.trim() || (lead.primaryContactRole !== 'debutante' ? lead.phone?.trim() : '') || '');
      setPayerEmail(pDecisor?.email?.trim() || lead.email?.trim() || (lead as any).payerEmail?.trim() || '');
      setPayerCpf(pDecisor?.cpf?.trim() || lead.cpf?.trim() || (lead as any).payerCpf?.trim() || '');
      setPayerAddress(pDecisor?.address?.trim() || lead.address?.trim() || (lead as any).address?.trim() || '');
      setPayerNeighborhood((pDecisor as any)?.neighborhood?.trim() || lead.neighborhood?.trim() || (lead as any).neighborhood?.trim() || '');

      setPaymentTerms(lead.paymentMethod || (lead as any).paymentTerms || '');
    }
  }, [lead?.id, isOpen]);

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
    const computedTerms = paymentTerms.trim() || `${downNum > 0 ? `Sinal de R$ ${downNum.toLocaleString('pt-BR')} + ` : ''}${installmentsCount}x parcelado`;

    onConfirmSale(lead.id, valueNum, packageSold.trim(), closerNotes.trim(), {
      downPayment: isNaN(downNum) ? 0 : downNum,
      installmentsCount: Number(installmentsCount) || 10,
      hasCreditCard,
      contractSignedFileUrl: contractSignedFileUrl || undefined,
      contractSignedFileName: contractSignedFileName || undefined,
      guestCount: Number(guestCount) || 150,
      eventYear: eventYear || undefined,
      updateExistingClient: Boolean(existingClient ? updateExistingMode === 'update' : true),
      existingClientId: existingClient?.id,
      targetStageId: targetStageId || undefined,
      birthdayPersonName: birthdayPersonName.trim() || undefined,
      birthdayPersonPhone: birthdayPersonPhone.trim() || undefined,
      birthdayPersonBirthdate: birthdayPersonBirthdate.trim() || undefined,
      payerName: payerName.trim() || undefined,
      payerPhone: payerPhone.trim() || undefined,
      payerEmail: payerEmail.trim() || undefined,
      payerCpf: payerCpf.trim() || undefined,
      payerAddress: payerAddress.trim() || undefined,
      payerNeighborhood: payerNeighborhood.trim() || undefined,
      paymentTerms: computedTerms,
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
                Aniversariante: <strong style={{ color: 'var(--adm-text-title)' }}>{birthdayName}</strong> • Decisor: <strong style={{ color: 'var(--adm-accent)' }}>{primaryDecisor?.name || 'Decisor'}</strong>
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

          {/* ── BANNER DE DETECÇÃO DE CLIENTE EXISTENTE (SEGURANÇA ANTI-DUPLICIDADE) ── */}
          {existingClient && (
            <div style={{
              background: 'rgba(20, 169, 215, 0.08)',
              border: '1.5px solid rgba(20, 169, 215, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="var(--adm-accent)" />
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Cliente Já Cadastrado no Pós-Venda
                </span>
                <span style={{ fontSize: '0.64rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontWeight: 700, marginLeft: 'auto' }}>
                  {existingClient.code}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-body)', lineHeight: 1.4 }}>
                Este lead já possui vínculo com o cliente <strong>"{existingClient.name}"</strong> no funil <strong>"{existingClientFunnel?.name || 'Pós-Venda'}"</strong> na etapa <strong>"{existingClientStage?.name || (existingClient.stage as string)}"</strong>.
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: updateExistingMode === 'update' ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  border: updateExistingMode === 'update' ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: updateExistingMode === 'update' ? 800 : 500,
                  color: updateExistingMode === 'update' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                }}>
                  <input
                    type="radio"
                    name="updateExistingMode"
                    checked={updateExistingMode === 'update'}
                    onChange={() => setUpdateExistingMode('update')}
                    style={{ accentColor: 'var(--adm-accent)' }}
                  />
                  <span>Atualizar dados do cliente existente</span>
                </label>

                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: updateExistingMode === 'keep_as_is' ? 'var(--adm-bg-hover)' : 'var(--adm-bg-input)',
                  border: updateExistingMode === 'keep_as_is' ? '1.5px solid var(--adm-border)' : '1px solid var(--adm-border)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: updateExistingMode === 'keep_as_is' ? 800 : 500,
                  color: updateExistingMode === 'keep_as_is' ? 'var(--adm-text-title)' : 'var(--adm-text-muted)',
                }}>
                  <input
                    type="radio"
                    name="updateExistingMode"
                    checked={updateExistingMode === 'keep_as_is'}
                    onChange={() => setUpdateExistingMode('keep_as_is')}
                    style={{ accentColor: 'var(--adm-accent)' }}
                  />
                  <span>Não atualizar pós-venda (manter como está)</span>
                </label>
              </div>
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

          {/* Dados do Contratante Pagante & Homenageada (Transferência ao Pós-Venda) */}
          <div style={{
            background: 'var(--adm-bg-elevated)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setShowTransferDetails(!showTransferDetails)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(20, 169, 215, 0.05)',
                border: 'none',
                borderBottom: showTransferDetails ? '1px solid var(--adm-border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} color="var(--adm-accent)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Dados do Contratante & Homenageada (Pós-Venda)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--adm-accent)', fontWeight: 600 }}>
                  {showTransferDetails ? 'Ocultar campos' : 'Ver / Editar campos'}
                </span>
                {showTransferDetails ? <ChevronUp size={14} color="var(--adm-accent)" /> : <ChevronDown size={14} color="var(--adm-accent)" />}
              </div>
            </button>

            {showTransferDetails && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Contratante Pagante */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Nome do Contratante (Pagante)</label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="Nome completo do responsável"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp / Telefone Pagante</label>
                    <input
                      type="text"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>E-mail do Pagante</label>
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>CPF do Pagante</label>
                    <input
                      type="text"
                      value={payerCpf}
                      onChange={(e) => setPayerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Endereço Completo</label>
                    <input
                      type="text"
                      value={payerAddress}
                      onChange={(e) => setPayerAddress(e.target.value)}
                      placeholder="Rua, número, complemento"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Bairro</label>
                    <input
                      type="text"
                      value={payerNeighborhood}
                      onChange={(e) => setPayerNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Homenageada / Debutante */}
                <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Aniversariante / Debutante</label>
                    <input
                      type="text"
                      value={birthdayPersonName}
                      onChange={(e) => setBirthdayPersonName(e.target.value)}
                      placeholder="Nome da debutante"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Tel. Debutante</label>
                    <input
                      type="text"
                      value={birthdayPersonPhone}
                      onChange={(e) => setBirthdayPersonPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Data de Nasc. Debutante</label>
                    <input
                      type="date"
                      value={birthdayPersonBirthdate}
                      onChange={(e) => setBirthdayPersonBirthdate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Condições de Pagamento */}
                <div>
                  <label style={labelStyle}>Forma & Condições de Pagamento Acordadas</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ex: Sinal R$ 5.000 no Pix + 10x sem juros no boleto"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
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
                <span>
                  {existingClient ? 'Relatório do Closer & Motivo da Retomada (Passagem de Bastão) *' : 'Relatório do Closer / Passagem de Bastão *'}
                </span>
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
              placeholder={existingClient ? "Explique por que este lead voltou para negociação, quais condições foram renegociadas e instruções para a equipe de Pós-Venda..." : "Descreva o fechamento, particularidades da família, promessas, cortesias acordadas, com quem tratar novos upsells..."}
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
