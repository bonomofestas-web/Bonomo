import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  User, 
  Phone, 
  CheckCircle2, 
  Smartphone, 
  PenTool, 
  ArrowLeft, 
  Check, 
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppState } from '../../context/AppStateContext';
import type { ReferralGroup } from '../../types';

interface ReferralFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'choice' | 'form';

export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({ isOpen, onClose }) => {
  const { addReferral } = useAppState();

  const [step, setStep] = useState<ModalStep>('choice');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState(14);
  const [group, setGroup] = useState<ReferralGroup>('Escola');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedContactName, setSelectedContactName] = useState<string | null>(null);
  const [isIosHintVisible, setIsIosHintVisible] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('choice');
      setName('');
      setPhone('');
      setAge(14);
      setGroup('Escola');
      setNotes('');
      setSubmitted(false);
      setSelectedContactName(null);
      setIsIosHintVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle native mobile contact selection (iOS Safari & Android Chrome)
  const handleSelectFromContacts = async () => {
    const contactsApi = (navigator as any).contacts || (window as any).navigator?.contacts;

    // 1. Tenta a Contact Picker API diretamente no evento do usuário (sem await prévio para não perder o gesto no iOS)
    if (contactsApi && typeof contactsApi.select === 'function') {
      try {
        const contacts = await contactsApi.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const selected = contacts[0];
          const contactName = Array.isArray(selected.name) ? selected.name[0] : (selected.name || '');
          const contactPhone = Array.isArray(selected.tel) ? selected.tel[0] : (selected.tel || '');

          if (contactName || contactPhone) {
            setName(contactName);
            setPhone(contactPhone);
            setSelectedContactName(contactName || 'Contato do celular');
            setStep('form');
            return;
          }
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Usuária cancelou a janela de contatos
          return;
        }
        console.warn('Contact picker fallback to auto-fill:', err);
      }
    }

    // 2. Se a API de contatos não estiver disponível (ex: Safari iOS padrão ou desktop),
    // abre o formulário com autofill do teclado do iPhone habilitado e foco automático
    setIsIosHintVisible(true);
    setStep('form');
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  };

  // Handle VCF / vCard file upload from iPhone / Android / PC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      let parsedName = '';
      let parsedPhone = '';

      const lines = text.split(/\r\n|\r|\n/);
      for (const line of lines) {
        if (line.startsWith('FN:') || line.startsWith('FN;')) {
          parsedName = line.substring(line.indexOf(':') + 1).trim();
        } else if (!parsedName && (line.startsWith('N:') || line.startsWith('N;'))) {
          const raw = line.substring(line.indexOf(':') + 1).split(';');
          parsedName = raw.filter(Boolean).reverse().join(' ').trim();
        } else if (line.startsWith('TEL') && line.includes(':')) {
          parsedPhone = line.substring(line.indexOf(':') + 1).trim();
        }
      }

      if (!parsedName) {
        parsedName = file.name.replace(/\.[^/.]+$/, '');
      }

      setName(parsedName);
      setPhone(parsedPhone || '');
      setSelectedContactName(parsedName);
      setStep('form');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addReferral({
      name: name.trim(),
      phone: phone.trim(),
      age: Number(age) || 14,
      group,
      notes: notes.trim()
    });

    setSubmitted(true);
    confetti({
      particleCount: 130,
      spread: 75,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FF5C9A', '#34D399', '#FFF']
    });

    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setPhone('');
      setNotes('');
      onClose();
    }, 1800);
  };

  const groups: ReferralGroup[] = ['Escola', 'Família', 'Judô', 'Faculdade', 'Amigos', 'Academia', 'Outros'];

  return (
    <div className="modal-overlay-responsive">
      <div className="glass-card modal-card-responsive" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '28px 24px',
        position: 'relative',
        border: '1.5px solid var(--primary)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(255, 92, 154, 0.25)',
        maxHeight: '90vh',
        overflowY: 'auto',
        fontFamily: 'Poppins, sans-serif'
      }}>
        {/* Hidden File Input for Native File/vCard Picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".vcf,.vcard,text/vcard,text/x-vcard,.csv" 
          style={{ display: 'none' }} 
          onChange={handleFileUpload} 
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#FFF',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
        >
          <X size={18} />
        </button>

        {/* ── SUBMITTED SUCCESS STATE ── */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.6)'
            }}>
              <CheckCircle2 size={38} color="#FFF" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#FFF' }}>
              Indicação Enviada com Sucesso! ✨
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Nossa equipe comercial entrará em contato com <strong>{name}</strong> e em breve o ponto da sua jornada será validado!
            </p>
          </div>
        ) : step === 'choice' ? (
          /* ── STEP 1: CHOICE (Export from contacts vs Manual) ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 215, 0, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(255,215,0,0.3)'
              }}>
                <Sparkles size={20} color="#FFD700" />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFF' }}>
                Nova Indicação de Amiga
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Escolha como deseja informar os dados da sua amiga:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Option 1: Export from Device Contacts */}
              <div
                onClick={handleSelectFromContacts}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 183, 3, 0.06) 100%)',
                  border: '1.5px solid rgba(255, 215, 0, 0.5)',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.35), 0 0 15px rgba(255,215,0,0.15)',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                  e.currentTarget.style.borderColor = '#FFD700';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.5)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(255,183,3,0.5)'
                }}>
                  <Smartphone size={24} color="#1A0E00" strokeWidth={2.5} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF' }}>
                      Importar dos Contatos do Celular
                    </h3>
                    <span style={{
                      background: 'rgba(255, 215, 0, 0.2)',
                      border: '1px solid rgba(255, 215, 0, 0.6)',
                      color: '#FFD700',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      ⚡ iPhone / Android
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                    Puxa nome e WhatsApp da agenda do celular em 1 toque.
                  </p>
                </div>
              </div>

              {/* Option 2: Fill Manually */}
              <div
                onClick={() => setStep('form')}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1.5px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 92, 154, 0.5)';
                  e.currentTarget.style.background = 'rgba(255, 92, 154, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <PenTool size={22} color="#FFF" />
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', marginBottom: '3px' }}>
                    Digitar Manualmente
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>
                    Digite você mesma o nome, telefone e detalhes da amiga.
                  </p>
                </div>
              </div>

              {/* Option 3: Upload VCF */}
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFD700',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FolderOpen size={14} />
                  <span>Ou carregar arquivo de contato (.vcf)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── STEP 2: FORMULÁRIO DE INDICAÇÃO ── */
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFF',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Voltar"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>
                  Dados da Indicação
                </h2>
              </div>

              {selectedContactName && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10B981',
                  borderRadius: '12px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Check size={12} /> Importado
                </span>
              )}
            </div>

            {/* Dica para iPhone / iOS Auto-fill */}
            {isIosHintVisible && (
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.35)',
                borderRadius: '12px',
                padding: '9px 12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Smartphone size={16} color="#FFD700" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.74rem', color: '#FFF', lineHeight: 1.3 }}>
                  📱 <strong>Dica iPhone:</strong> Toque no teclado em <strong>"Contatos"</strong> acima das teclas para puxar os dados da sua amiga direto da sua agenda!
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                  Nome da Amiga *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--primary)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
                  <input
                    ref={nameInputRef}
                    type="text"
                    name="name"
                    autoComplete="name"
                    autoCapitalize="words"
                    required
                    placeholder="Ex: Sophia Alencar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '12px',
                      padding: '10px 14px 10px 38px',
                      color: '#FFF',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                  WhatsApp / Telefone *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="var(--primary)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
                  <input
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    placeholder="(21) 99999-9999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '12px',
                      padding: '10px 14px 10px 38px',
                      color: '#FFF',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Idade e Grupo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                    Idade da Amiga
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#FFF',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                    Onde a Conheceu?
                  </label>
                  <select
                    value={group}
                    onChange={e => setGroup(e.target.value as ReferralGroup)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#FFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {groups.map(g => (
                      <option key={g} value={g} style={{ background: '#1A0E00', color: '#FFF' }}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Ela vai fazer 15 anos no próximo ano..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={18} />
              <span>Enviar Indicação (+1 Ponto)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
