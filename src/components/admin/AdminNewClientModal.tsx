import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { maskPhoneInput } from '../../utils/phoneFormatter';

interface AdminNewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (clientId: string) => void;
}

export const AdminNewClientModal: React.FC<AdminNewClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const { venues, activeVenueId, addClient } = useAdminState();

  const getEffectiveVenueId = () => {
    if (activeVenueId && activeVenueId !== 'all' && venues.some(v => v.id === activeVenueId)) {
      return activeVenueId;
    }
    return venues[0]?.id || '';
  };

  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [birthdayPersonAge, setBirthdayPersonAge] = useState<number>(15);
  const [payerName, setPayerName] = useState('');
  const [payerRelationship, setPayerRelationship] = useState<'mother' | 'father' | 'guardian' | 'self' | 'other'>('mother');
  const [payerCpf, setPayerCpf] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [venueId, setVenueId] = useState(getEffectiveVenueId);
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date(Date.now() + 180 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState('20:00 às 02:00');
  const [guestCount, setGuestCount] = useState(150);
  const [packageSold, setPackageSold] = useState('Pacote Imperial Ouro');
  const [dealValue, setDealValue] = useState<number | ''>(35000);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdayPersonName.trim() || !payerPhone.trim()) {
      alert('Por favor preencha ao menos o nome da aniversariante e o telefone do responsável.');
      return;
    }

    const newClientId = addClient({
      name: birthdayPersonName.trim(),
      birthdayPersonName: birthdayPersonName.trim(),
      birthdayPersonAge: Number(birthdayPersonAge) || 15,
      payerName: payerName.trim() || `${birthdayPersonName.trim()} (Responsável)`,
      payerRelationship,
      payerCpf: payerCpf.trim(),
      payerPhone: payerPhone.trim(),
      payerEmail: payerEmail.trim(),
      venueId,
      eventType: '15_anos',
      eventDate,
      eventTime,
      guestCount: Number(guestCount) || 150,
      packageSold: packageSold.trim() || 'Pacote Completo',
      dealValue: Number(dealValue) || 0,
      contractDate: new Date().toISOString().split('T')[0],
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim(),
      stage: 'onboarding',
    });

    if (onClientCreated) {
      onClientCreated(newClientId);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'var(--adm-card-bg, #ffffff)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--adm-text, #111827)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--adm-surface, #f9fafb)',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--adm-text, #111827)' }}>
              Cadastrar Novo Cliente no Pós-Venda
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--adm-text-muted, #6B7280)' }}>
              O cliente será organizado e atendido pelo nome da aniversariante
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--adm-text-muted, #6B7280)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seção 1: Aniversariante */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--adm-accent, #B8860B)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
              👑 1. Dados da Aniversariante (Nome Principal de Atendimento)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nome da Aniversariante *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fernanda Souza"
                  value={birthdayPersonName}
                  onChange={(e) => setBirthdayPersonName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Idade
                </label>
                <input
                  type="number"
                  value={birthdayPersonAge}
                  onChange={(e) => setBirthdayPersonAge(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Decisor / Contratante */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--adm-accent, #B8860B)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
              👤 2. Decisor / Contratante Pagante (Pai, Mãe ou Responsável)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nome do Decisor / Responsável *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Alberto Souza"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Parentesco
                </label>
                <select
                  value={payerRelationship}
                  onChange={(e) => setPayerRelationship(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="mother">Mãe</option>
                  <option value="father">Pai</option>
                  <option value="guardian">Responsável Legal</option>
                  <option value="self">Própria Homenageada</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  placeholder="(21) 98877-6655"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(maskPhoneInput(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  CPF
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={payerCpf}
                  onChange={(e) => setPayerCpf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com.br"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Dados Contratuais & Evento */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--adm-accent, #B8860B)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
              💼 3. Dados Contratuais & Casa de Festas
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Casa de Festas Contratada *
                </label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Data da Festa *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Pacote Contratado
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pacote Imperial Diamante"
                  value={packageSold}
                  onChange={(e) => setPackageSold(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Valor Total do Contrato (R$)
                </label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Convidados Contratados
                </label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Horário do Evento
                </label>
                <input
                  type="text"
                  placeholder="Ex: 20:00 às 02:00"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Condições de Pagamento Negociadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrada de R$ 5.000 + 10x de R$ 3.000 no boleto"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Observações Iniciais do Cliente
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações especiais sobre o perfil do cliente, preferências da debutante, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #e5e7eb)',
                    backgroundColor: 'var(--adm-surface, #f9fafb)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--adm-border, #e5e7eb)',
            paddingTop: '16px',
            marginTop: '8px',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #e5e7eb)',
                backgroundColor: 'transparent',
                color: 'var(--adm-text, #111827)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--adm-accent, #B8860B)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)',
              }}
            >
              <Check size={16} />
              Cadastrar Cliente no Pós-Venda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
