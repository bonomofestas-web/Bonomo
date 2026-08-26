import React, { useState, useEffect } from 'react';
import { X, Users, User, Phone, Share2, Check } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { Guest, GuestGroup, GuestStatus, GuestGender } from '../../types';

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestToEdit?: Guest | null;
}

export const GuestFormModal: React.FC<GuestFormModalProps> = ({ 
  isOpen, 
  onClose,
  guestToEdit 
}) => {
  const { addGuest, updateGuest, debutante } = useAppState();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState(15);
  const [gender, setGender] = useState<GuestGender>('female');
  const [group, setGroup] = useState<GuestGroup>('Amigos');
  const [status, setStatus] = useState<GuestStatus>('pending');
  
  // Post-save modal feedback
  const [createdGuestId, setCreatedGuestId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (guestToEdit) {
      setName(guestToEdit.name || '');
      setPhone(guestToEdit.phone || '');
      setAge(guestToEdit.age || 15);
      setGender(guestToEdit.gender || 'female');
      setGroup(guestToEdit.group || 'Amigos');
      setStatus(guestToEdit.status || 'pending');
    } else {
      setName('');
      setPhone('');
      setAge(15);
      setGender('female');
      setGroup('Amigos');
      setStatus('pending');
    }
    setCreatedGuestId(null);
    setCopiedLink(false);
  }, [guestToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (guestToEdit) {
      updateGuest(guestToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        age: Number(age),
        gender,
        group,
        status,
        plusOnes: 0,
      });
      onClose();
    } else {
      const newId = addGuest({
        name: name.trim(),
        phone: phone.trim(),
        age: Number(age),
        gender,
        group,
        status,
        plusOnes: 0,
        origin: 'manual',
      });
      setCreatedGuestId(newId);
    }
  };

  const createdInviteUrl = createdGuestId 
    ? `${window.location.origin}${window.location.pathname}?convite=maria-eduarda&guestId=${createdGuestId}`
    : '';

  const handleCopyCreatedLink = () => {
    navigator.clipboard.writeText(createdInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendWhatsAppCreatedLink = () => {
    const text = `Olá, ${name}! A ${debutante.name} preparou um convite exclusivo para você para os 15 Anos dela no Espaço Rio Lounge! 👑✨\n\nConfira seu convite e confirme sua presença no link:\n${createdInviteUrl}`;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const groups: GuestGroup[] = ['Família', 'Escola', 'Amigos', 'VIPs', 'Outros'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #18141C 0%, #0E0A12 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.45)',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '26px 24px',
        position: 'relative',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85), 0 0 24px rgba(212, 175, 55, 0.15)',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Post-creation Success Screen */}
        {createdGuestId ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
            }}>
              <Check size={32} color="#000" strokeWidth={3} />
            </div>

            <h3 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#FFF',
              marginBottom: '8px'
            }}>
              Convidado Adicionado!
            </h3>

            <p style={{ fontSize: '0.86rem', color: '#B5AFA4', marginBottom: '20px', lineHeight: 1.5 }}>
              <strong style={{ color: '#E8C98D' }}>{name}</strong> foi cadastrado(a) com sucesso na sua lista oficial.
            </p>

            <div style={{
              background: '#141414',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                Link Exclusivo do Convidado
              </div>
              <div style={{ fontSize: '0.8rem', color: '#FFF', wordBreak: 'break-all', fontFamily: 'monospace', background: '#090909', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                {createdInviteUrl}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={handleCopyCreatedLink}
                  style={{
                    background: copiedLink ? '#10B981' : 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>

                <button
                  onClick={handleSendWhatsAppCreatedLink}
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1.5px solid #25D366',
                    color: '#25D366',
                    borderRadius: '30px',
                    padding: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Enviar WhatsApp</span>
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFF',
                  borderRadius: '30px',
                  padding: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Users size={20} color="#D4AF37" />
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#FFF',
                margin: 0,
              }}>
                {guestToEdit ? 'Editar Convidado' : 'Adicionar Convidado'}
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#B5AFA4', marginBottom: '20px', fontFamily: "'Montserrat', sans-serif" }}>
              Cadastre os dados individuais do convidado
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                  Nome Completo *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#141414',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px 12px 42px',
                      color: '#FFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* Telefone & Idade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                    WhatsApp / Telefone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="#D4AF37" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                    <input
                      type="tel"
                      placeholder="(21) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#141414',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 14px 12px 42px',
                        color: '#FFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                    Idade
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#141414',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#FFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: "'Montserrat', sans-serif",
                      textAlign: 'center'
                    }}
                  />
                </div>
              </div>

              {/* Gênero (Sexo) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                  Gênero
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'female', label: 'Feminino ♀' },
                    { id: 'male', label: 'Masculino ♂' },
                    { id: 'other', label: 'Outro' },
                  ].map(g => {
                    const isSelected = gender === g.id;
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setGender(g.id as GuestGender)}
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)' : '#141414',
                          color: isSelected ? '#000' : '#E0DACD',
                          border: isSelected ? '1px solid #FFF' : '1px solid rgba(212, 175, 55, 0.25)',
                          borderRadius: '12px',
                          padding: '8px 10px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grupo & Status Inicial (Apenas Aguardando e Confirmado) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                    Grupo
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value as GuestGroup)}
                    style={{
                      width: '100%',
                      background: '#141414',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#FFF',
                      fontSize: '0.86rem',
                      outline: 'none',
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {groups.map(g => (
                      <option key={g} value={g} style={{ background: '#141414', color: '#FFF' }}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: "'Cinzel', serif" }}>
                    Status Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GuestStatus)}
                    style={{
                      width: '100%',
                      background: '#141414',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#FFF',
                      fontSize: '0.86rem',
                      outline: 'none',
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    <option value="pending" style={{ background: '#141414', color: '#FFF' }}>⏳ Aguardando</option>
                    <option value="confirmed" style={{ background: '#141414', color: '#FFF' }}>✓ Confirmado</option>
                    {guestToEdit && (
                      <option value="declined" style={{ background: '#141414', color: '#FFF' }}>✕ Recusado</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Botões de Ação do Form */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFF',
                    borderRadius: '50px',
                    padding: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA7C11 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: "'Cinzel', serif",
                    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                  }}
                >
                  {guestToEdit 
                    ? 'Salvar Alterações' 
                    : status === 'pending' 
                      ? 'Adicionar e Gerar Convite' 
                      : 'Adicionar Convidado'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
