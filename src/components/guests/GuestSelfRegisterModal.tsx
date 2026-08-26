import React, { useState } from 'react';
import { X, Sparkles, Check, Users, Copy } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import type { GuestGroup } from '../../types';

export const GuestSelfRegisterModal: React.FC = () => {
  const { isSelfRegisterModalOpen, setIsSelfRegisterModalOpen, selfRegisterGuest, debutante } = useAppState();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [group, setGroup] = useState<GuestGroup>('Amigos');
  const [plusOnes, setPlusOnes] = useState<number>(0);
  const [companionNames, setCompanionNames] = useState<string[]>([]);
  const [sweetMessage, setSweetMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isSelfRegisterModalOpen) return null;

  const handlePlusOnesChange = (count: number) => {
    setPlusOnes(count);
    const newNames = [...companionNames];
    if (count > companionNames.length) {
      for (let i = companionNames.length; i < count; i++) {
        newNames.push('');
      }
    } else {
      newNames.length = count;
    }
    setCompanionNames(newNames);
  };

  const handleCompanionNameChange = (index: number, val: string) => {
    const newNames = [...companionNames];
    newNames[index] = val;
    setCompanionNames(newNames);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    selfRegisterGuest({
      name,
      phone,
      age: parseInt(age) || 15,
      group,
      plusOnes,
      companionNames: plusOnes > 0 ? companionNames.filter(n => n.trim() !== '') : undefined,
      sweetMessage: sweetMessage.trim() ? sweetMessage.trim() : undefined,
    });

    setSubmitted(true);
  };

  const handleClose = () => {
    setIsSelfRegisterModalOpen(false);
    setSubmitted(false);
    setName('');
    setPhone('');
    setAge('');
    setGroup('Amigos');
    setPlusOnes(0);
    setCompanionNames([]);
    setSweetMessage('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://villadiamond.com.br/convite?debutante=${encodeURIComponent(debutante.name)}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(8, 4, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 16, 40, 0.98) 0%, rgba(16, 9, 24, 0.99) 100%)',
        border: '1.5px solid rgba(255, 92, 154, 0.45)',
        borderRadius: '24px',
        maxWidth: '540px',
        width: '100%',
        padding: '28px 24px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(255,92,154,0.2)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 8px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.6)'
            }}>
              <Check size={32} color="#FFF" />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', marginBottom: '8px', fontFamily: 'Poppins, sans-serif' }}>
              Presença Confirmada! 🎉
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: '24px', fontFamily: 'Poppins, sans-serif' }}>
              Você foi cadastrado(a) com sucesso na lista de convidados de <strong>{debutante.name}</strong>! Mal podemos esperar para celebrar no grande dia!
            </p>

            <button
              onClick={handleClose}
              style={{
                background: 'linear-gradient(135deg, #FF5C9A 0%, #FF1493 100%)',
                color: '#FFF',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '50px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 4px 16px rgba(255, 92, 154, 0.4)'
              }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(255, 92, 154, 0.25) 0%, rgba(255, 20, 147, 0.35) 100%)',
                border: '1px solid #FF5C9A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={20} color="#FF5C9A" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', fontFamily: 'Poppins, sans-serif', margin: 0 }}>
                  Convite VIP & Auto-cadastro
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'rgba(232, 201, 141, 0.9)', margin: 0, fontFamily: 'Poppins, sans-serif' }}>
                  15 Anos de {debutante.name} • 18 de Abril de 2027
                </p>
              </div>
            </div>

            {/* Share link pill */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px dashed rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              margin: '14px 0 18px 0'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🔗 villadiamond.com.br/convite?debutante={encodeURIComponent(debutante.name)}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: copiedLink ? '#10B981' : 'rgba(255, 215, 0, 0.15)',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  color: copiedLink ? '#FFF' : '#FFD700',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                {copiedLink ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#E8C98D', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Nome Completo do Convidado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sophia Alencar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#E8C98D', textTransform: 'uppercase', marginBottom: '4px' }}>
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(21) 99999-9999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#FFF',
                      fontSize: '0.86rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#E8C98D', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Idade
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#FFF',
                      fontSize: '0.86rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#E8C98D', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Grupo de Convivência
                </label>
                <select
                  value={group}
                  onChange={e => setGroup(e.target.value as GuestGroup)}
                  style={{
                    width: '100%',
                    background: '#180E24',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.86rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Amigos">Amigos</option>
                  <option value="Escola">Escola</option>
                  <option value="Família">Família</option>
                  <option value="VIPs">VIPs</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* Seletor de Acompanhantes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#E8C98D', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Vai levar acompanhantes? (Contam como convidados)
                </label>
                <select
                  value={plusOnes}
                  onChange={e => handlePlusOnesChange(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#180E24',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#FFD700',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>Não (apenas eu)</option>
                  <option value={1}>+1 Acompanhante</option>
                  <option value={2}>+2 Acompanhantes</option>
                  <option value={3}>+3 Acompanhantes</option>
                </select>
              </div>

              {/* Campos dinâmicos de nomes dos acompanhantes */}
              {plusOnes > 0 && (
                <div style={{
                  background: 'rgba(255, 92, 154, 0.08)',
                  border: '1px solid rgba(255, 92, 154, 0.3)',
                  borderRadius: '14px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#FF5C9A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} /> Nomes dos Acompanhantes:
                  </div>
                  {Array.from({ length: plusOnes }).map((_, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      placeholder={`Nome completo do acompanhante ${idx + 1} *`}
                      value={companionNames[idx] || ''}
                      onChange={e => handleCompanionNameChange(idx, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        color: '#FFF',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Mensagem de Carinho */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#FF5C9A', textTransform: 'uppercase', marginBottom: '4px' }}>
                  💌 Deixe uma mensagem de carinho para {debutante.name} (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Escreva um recado especial para o grande dia...`}
                  value={sweetMessage}
                  onChange={e => setSweetMessage(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '0.84rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '14px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                  marginTop: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Check size={18} />
                <span>Confirmar Minha Presença no Evento 🎉</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
