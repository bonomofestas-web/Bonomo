import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  User, 
  Phone, 
  CheckCircle2, 
  Smartphone, 
  PenTool, 
  Search, 
  ArrowLeft, 
  Check, 
  ShieldCheck,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppState } from '../../context/AppStateContext';
import type { ReferralGroup } from '../../types';

interface ReferralFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PhoneContact {
  id: string;
  name: string;
  phone: string;
  group: ReferralGroup;
  initials: string;
  color: string;
}

const mockDeviceContacts: PhoneContact[] = [
  { id: 'c1', name: 'Sophia Alencar', phone: '(21) 98765-4321', group: 'Escola', initials: 'SA', color: '#FF5C9A' },
  { id: 'c2', name: 'Beatriz Vasconcelos', phone: '(21) 99123-4567', group: 'Amigos', initials: 'BV', color: '#FFD700' },
  { id: 'c3', name: 'Isadora Prado', phone: '(21) 97654-3210', group: 'Escola', initials: 'IP', color: '#34D399' },
  { id: 'c4', name: 'Valentina Rossi', phone: '(21) 98234-5678', group: 'Escola', initials: 'VR', color: '#A78BFA' },
  { id: 'c5', name: 'Larissa Freire', phone: '(21) 99345-6789', group: 'Academia', initials: 'LF', color: '#F472B6' },
  { id: 'c6', name: 'Giovanna Martins', phone: '(21) 97890-1234', group: 'Escola', initials: 'GM', color: '#60A5FA' },
  { id: 'c7', name: 'Mariana Lima', phone: '(21) 98456-7890', group: 'Família', initials: 'ML', color: '#F59E0B' },
  { id: 'c8', name: 'Gabriela Duarte', phone: '(21) 99567-8901', group: 'Judô', initials: 'GD', color: '#EC4899' },
  { id: 'c9', name: 'Helena Silveira', phone: '(21) 97123-4567', group: 'Escola', initials: 'HS', color: '#10B981' },
  { id: 'c10', name: 'Camila Martins', phone: '(21) 98678-9012', group: 'Amigos', initials: 'CM', color: '#8B5CF6' },
  { id: 'c11', name: 'Yasmin Fonseca', phone: '(21) 99789-0123', group: 'Amigos', initials: 'YF', color: '#F97316' },
  { id: 'c12', name: 'Laura Peixoto', phone: '(21) 97345-6789', group: 'Escola', initials: 'LP', color: '#38BDF8' },
  { id: 'c13', name: 'Bruna Figueiredo', phone: '(21) 98890-1234', group: 'Amigos', initials: 'BF', color: '#FB7185' },
  { id: 'c14', name: 'Clara Toledo', phone: '(21) 99456-7890', group: 'Escola', initials: 'CT', color: '#C084FC' },
  { id: 'c15', name: 'Melissa Correia', phone: '(21) 97567-8901', group: 'Outros', initials: 'MC', color: '#FBBF24' }
];

type ModalStep = 'choice' | 'contacts' | 'form';

export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({ isOpen, onClose }) => {
  const { addReferral } = useAppState();

  const [step, setStep] = useState<ModalStep>('choice');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState(14);
  const [group, setGroup] = useState<ReferralGroup>('Escola');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactName, setSelectedContactName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setContactSearch('');
      setSelectedContactName(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle native or in-app contact selection
  const handleSelectFromContacts = async () => {
    // 1. Try Native Mobile Contact Picker API (Chrome Android / Samsung Internet / Edge Mobile / PWA)
    if ('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function') {
      try {
        const availableProps = typeof (navigator as any).contacts?.getProperties === 'function'
          ? await (navigator as any).contacts.getProperties()
          : ['name', 'tel'];

        const propsToQuery = ['name', 'tel'].filter(p => availableProps.includes(p));
        const finalProps = propsToQuery.length > 0 ? propsToQuery : ['name'];

        const contacts = await (navigator as any).contacts.select(finalProps, { multiple: false });
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
      } catch (err: any) {
        console.log('Native contact picker interaction or not supported on this OS:', err);
        if (err?.name === 'AbortError') {
          // User closed the native picker
          return;
        }
      }
    }

    // 2. Open the system contact picker UI
    setStep('contacts');
  };

  // Handle VCF / vCard file upload from PC / Mac / Mobile File Manager
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
      setPhone(parsedPhone || '(21) 99999-9999');
      setSelectedContactName(parsedName);
      setStep('form');
    };
    reader.readAsText(file);
  };

  const handlePickContact = (contact: PhoneContact) => {
    setName(contact.name);
    setPhone(contact.phone);
    setGroup(contact.group);
    setSelectedContactName(contact.name);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    addReferral({
      name,
      phone,
      age: Number(age),
      group,
      notes
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

  const filteredContacts = mockDeviceContacts.filter(c => 
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  );

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
        overflowY: 'auto'
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
              Indicação Enviada com Sucesso! ✨
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif', lineHeight: 1.5 }}>
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
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
                Nova Indicação de Amiga
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', fontFamily: 'Poppins, sans-serif' }}>
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
                  e.currentTarget.style.boxShadow = '0 8px 26px rgba(255, 183, 3, 0.35), 0 0 20px rgba(255, 215, 0, 0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.5)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35), 0 0 15px rgba(255,215,0,0.15)';
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
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
                      Exportar da Lista de Contatos
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
                      ⚡ Mais Rápido
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
                    Abre a agenda de contatos do aparelho. Preenche nome e telefone em 1 clique.
                  </p>
                </div>

                <ChevronRight size={20} color="#FFD700" style={{ flexShrink: 0 }} />
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif', marginBottom: '3px' }}>
                    Preencher Manualmente
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins, sans-serif', lineHeight: 1.3 }}>
                    Digite você mesma o nome, telefone e detalhes da amiga.
                  </p>
                </div>

                <ChevronRight size={20} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
              </div>
            </div>
          </div>
        ) : step === 'contacts' ? (
          /* ── STEP 2: DEVICE CONTACTS PICKER ── */
          <div>
            {/* Header with Back button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
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
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif', lineHeight: 1.2 }}>
                    Contatos do Aparelho 📱
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                    <ShieldCheck size={13} color="#34D399" /> Acesso aos contatos liberado
                  </span>
                </div>
              </div>

              {/* PC / File Upload option */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  color: '#FFD700',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif'
                }}
                title="Abrir arquivo de contato do PC (.vcf / .csv)"
              >
                <FolderOpen size={13} color="#FFD700" />
                <span>Arquivo .vcf</span>
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>
              Selecione a amiga para importar nome e telefone automaticamente:
            </p>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={17} color="#FFD700" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '24px',
                  padding: '11px 16px 11px 40px',
                  color: '#FFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'Poppins, sans-serif'
                }}
              />
            </div>

            {/* Contacts List */}
            <div 
              className="hide-scrollbar" 
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}
            >
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                  Nenhum contato encontrado com esse nome.
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => handlePickContact(contact)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.45)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Initials Avatar */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: contact.color,
                        color: '#1A0E00',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Poppins, sans-serif',
                        flexShrink: 0
                      }}>
                        {contact.initials}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFF', fontFamily: 'Poppins, sans-serif' }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins, sans-serif' }}>
                          {contact.phone} • <span style={{ color: '#FFD700' }}>{contact.group}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 100%)',
                        color: '#1A0E00',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '16px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        fontFamily: 'Poppins, sans-serif',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Selecionar</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Switch to manual button */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setStep('form')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 92, 154, 0.9)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  textDecoration: 'underline'
                }}
              >
                Prefiro preencher manualmente os dados
              </button>
            </div>
          </div>
        ) : (
          /* ── STEP 3: FORM DETAILS ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <button
                onClick={() => setStep('choice')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Voltar às opções"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif', lineHeight: 1.2 }}>
                  Dados da Indicação 👭
                </h2>
              </div>
            </div>

            {selectedContactName && (
              <div style={{
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                borderRadius: '12px',
                padding: '8px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: '#34D399',
                fontFamily: 'Poppins, sans-serif'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} /> Contato importado: <strong>{selectedContactName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSelectFromContacts}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FFD700',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Trocar contato
                </button>
              </div>
            )}

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '18px', fontFamily: 'Poppins, sans-serif' }}>
              Revise os dados e complete os campos restantes para enviar à equipe comercial:
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFD700', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                  NOME COMPLETO DA INDICADA *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophia Alencar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px 12px 42px',
                      color: '#FFF',
                      fontSize: '0.95rem',
                      outline: 'none',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>
              </div>

              {/* Phone & Age */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFD700', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                    TELEFONE / WHATSAPP *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                    <input
                      type="text"
                      required
                      placeholder="(21) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px 12px 42px',
                        color: '#FFF',
                        fontSize: '0.95rem',
                        outline: 'none',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFD700', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                    IDADE
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={18}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      color: '#FFF',
                      fontSize: '0.95rem',
                      outline: 'none',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>
              </div>

              {/* Group */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFD700', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                  AMBIENTE / GRUPO DE CONVIVÊNCIA
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value as ReferralGroup)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    color: '#FFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  {groups.map(g => (
                    <option key={g} value={g} style={{ background: '#130B1E', color: '#FFF' }}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFD700', marginBottom: '6px', fontFamily: 'Poppins, sans-serif' }}>
                  OBSERVAÇÕES ADICIONAIS (OPCIONAL)
                </label>
                <textarea
                  placeholder="Ex: Aniversário em outubro/2027, mãe está procurando casa de festa."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    color: '#FFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                />
              </div>

              {/* Explanatory Banner */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.08)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.76rem',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.3,
                fontFamily: 'Poppins, sans-serif'
              }}>
                ℹ️ <strong>Como funciona:</strong> A indicação é recebida pela equipe comercial da casa de festas. Após a validação dos dados, o ponto será contabilizado automaticamente na sua jornada.
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFB703 50%, #FB8500 100%)',
                  color: '#1A0E00',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  padding: '13px 20px',
                  borderRadius: '50px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 6px 20px rgba(255, 183, 3, 0.45), 0 0 12px rgba(255, 215, 0, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Sparkles size={18} color="#1A0E00" />
                <span>Enviar Indicação</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
