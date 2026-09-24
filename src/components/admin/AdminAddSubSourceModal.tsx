import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, AlertCircle } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { WhatsAppSubSource } from '../../types/sources';

interface AdminAddSubSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubSource: (subSource: WhatsAppSubSource) => void;
}

export const AdminAddSubSourceModal: React.FC<AdminAddSubSourceModalProps> = ({
  isOpen,
  onClose,
  onAddSubSource,
}) => {
  const { funnels } = useAdminState();

  const [subName, setSubName] = useState('');
  const [subKeyword, setSubKeyword] = useState('');
  const [subFunnelId, setSubFunnelId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSubName('');
      setSubKeyword('');
      setSubFunnelId('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      setErrorMsg('Informe o nome da sub-origem (Ex: Anúncios Instagram, Google Ads, TikTok).');
      return;
    }
    if (!subKeyword.trim()) {
      setErrorMsg('Informe a palavra-chave ou frase que o lead enviará na 1ª mensagem.');
      return;
    }

    const newSub: WhatsAppSubSource = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: subName.trim(),
      keyword: subKeyword.trim().toLowerCase(),
      funnelId: subFunnelId || undefined,
    };

    onAddSubSource(newSub);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
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
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Tag size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Adicionar Sub-origem
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Rastreie campanhas e anúncios por palavra-chave na mensagem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--adm-text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirm} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Nome da Sub-origem *
            </label>
            <input
              type="text"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Ex: Anúncios Instagram Reels, Google Ads, TikTok"
              className="adm-input"
              style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 12px', boxSizing: 'border-box' }}
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Palavra-Chave / Frase Identificadora *
            </label>
            <input
              type="text"
              value={subKeyword}
              onChange={(e) => setSubKeyword(e.target.value)}
              placeholder="Ex: quero orcamento reels, vi no insta, google"
              className="adm-input"
              style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 12px', boxSizing: 'border-box' }}
              required
            />
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
              Quando a primeira mensagem do lead contiver este texto, a sub-origem será vinculada.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              Funil de Destino Específico (Opcional)
            </label>
            <select
              value={subFunnelId}
              onChange={(e) => setSubFunnelId(e.target.value)}
              className="adm-input"
              style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '0.82rem', padding: '0 12px', boxSizing: 'border-box' }}
            >
              <option value="">Funil Padrão da Origem Principal</option>
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted)', marginTop: '4px' }}>
              Deixe vazio para usar o mesmo funil de destino da origem principal.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                background: 'transparent',
                color: 'var(--adm-text-muted)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="adm-btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              <span>Adicionar Sub-origem</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
