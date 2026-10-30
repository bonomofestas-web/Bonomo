import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Sparkles, Check, AlertCircle, CheckCheck } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { renderWhatsAppFormattedText } from '../../utils/whatsappFormatter';
import { WhatsAppFormattingToolbar } from './WhatsAppFormattingToolbar';
import type { QuickMessage } from '../../types/admin';

interface AdminQuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToEdit?: QuickMessage | null;
}

export const AdminQuickMessageModal: React.FC<AdminQuickMessageModalProps> = ({
  isOpen,
  onClose,
  messageToEdit,
}) => {
  const { currentUser, addQuickMessage, updateQuickMessage, quickMessages } = useAdminState();

  const [keyword, setKeyword] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (messageToEdit) {
        setKeyword(messageToEdit.keyword);
        setMessageText(messageToEdit.message);
        setIsActive(messageToEdit.isActive);
      } else {
        setKeyword('');
        setMessageText('');
        setIsActive(true);
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, messageToEdit]);

  if (!isOpen) return null;

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove espaços e barra inicial automaticamente
    const rawVal = e.target.value.replace(/^\//, '');
    if (/\s/.test(rawVal)) {
      setError('A palavra-chave não pode conter espaços.');
    } else {
      setError(null);
    }
    const clean = rawVal.replace(/\s+/g, '').toLowerCase();
    setKeyword(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKeyword = keyword.trim().toLowerCase().replace(/^\//, '').replace(/\s+/g, '');

    if (!cleanKeyword) {
      setError('Por favor, informe uma palavra-chave para o atalho.');
      return;
    }

    if (!messageText.trim()) {
      setError('Por favor, digite o conteúdo da mensagem rápida.');
      return;
    }

    // Checa duplicidade de palavra-chave
    const duplicate = quickMessages.find(
      qm => qm.keyword.toLowerCase() === cleanKeyword && qm.id !== messageToEdit?.id
    );
    if (duplicate) {
      setError(`O atalho "/${cleanKeyword}" já está cadastrado. Escolha outra palavra-chave.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (messageToEdit) {
        await updateQuickMessage(messageToEdit.id, {
          keyword: cleanKeyword,
          message: messageText.trim(),
          isActive,
        });
      } else {
        await addQuickMessage({
          keyword: cleanKeyword,
          message: messageText.trim(),
          createdBy: currentUser?.name || 'Administrador',
          isActive,
        });
      }
      onClose();
    } catch {
      setError('Ocorreu um erro ao salvar a mensagem rápida. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--adm-bg-card, #1e293b)',
          border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--adm-border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--adm-bg-app, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(20, 169, 215, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#14A9D7',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--adm-text-title, #f8fafc)' }}>
                {messageToEdit ? 'Editar Mensagem Rápida' : 'Nova Mensagem Rápida'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--adm-text-muted, #94a3b8)' }}>
                Crie um atalho para enviar respostas prontas no chat do WhatsApp digitando /
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.80rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Atalho / Palavra-chave */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title, #f8fafc)', marginBottom: '6px' }}>
              Atalho / Palavra-chave <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '8px',
                background: 'var(--adm-bg-input, #0f172a)',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(20, 169, 215, 0.12)',
                  color: '#14A9D7',
                  fontWeight: 700,
                  fontSize: '0.90rem',
                  borderRight: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                }}
              >
                /
              </div>
              <input
                type="text"
                value={keyword}
                onChange={handleKeywordChange}
                placeholder="ex: saudacao, pix, agendamento"
                required
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--adm-text-title, #f8fafc)',
                  fontSize: '0.86rem',
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94a3b8)', marginTop: '4px' }}>
              Sem espaços. No chat, basta digitar <strong style={{ color: '#14A9D7' }}>/{keyword || 'palavra'}</strong> para selecionar este modelo.
            </div>
          </div>

          {/* Mensagem e Barra de Formatação */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text-title, #f8fafc)' }}>
                Conteúdo da Mensagem <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {/* Barra Flutuante/Fixa de Formatação do WhatsApp */}
              <WhatsAppFormattingToolbar
                inputRef={textareaRef}
                value={messageText}
                onChange={setMessageText}
                isDarkMode={true}
              />
            </div>

            <textarea
              ref={textareaRef}
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite a mensagem completa. Selecione qualquer parte do texto para aplicar Negrito, Itálico, Citação ou Listas."
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--adm-bg-input, #0f172a)',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                outline: 'none',
                color: 'var(--adm-text-title, #f8fafc)',
                fontSize: '0.86rem',
                lineHeight: 1.5,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Live Preview Formatado (Padrão WhatsApp) */}
          {messageText.trim() && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#00a884', textTransform: 'uppercase', marginBottom: '6px' }}>
                <Sparkles size={13} /> Prévia da Mensagem (Visual do WhatsApp)
              </div>
              <div
                style={{
                  background: '#efeae2',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    background: '#d9fdd3',
                    color: '#111b21',
                    padding: '8px 12px 6px 12px',
                    borderRadius: '8px 0px 8px 8px',
                    maxWidth: '85%',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                    boxShadow: '0 1px 1px rgba(11,20,26,0.13)',
                    wordBreak: 'break-word',
                  }}
                >
                  <div>
                    {renderWhatsAppFormattedText(messageText, { isDarkMode: false })}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '3px',
                      marginTop: '4px',
                      fontSize: '0.68rem',
                      color: '#667781',
                    }}
                  >
                    <span>12:00</span>
                    <CheckCheck size={14} color="#53bdeb" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ativo / Inativo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'var(--adm-bg-input, #0f172a)', border: '1px solid var(--adm-border, rgba(255,255,255,0.08))' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-title, #f8fafc)' }}>
                Mensagem Ativa
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94a3b8)' }}>
                Disponível para autocompletar no chat do WhatsApp
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '22px',
                  background: isActive ? '#00a884' : 'rgba(255,255,255,0.2)',
                  transition: 'background 0.2s ease',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isActive ? '22px' : '2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid var(--adm-border, rgba(255, 255, 255, 0.15))',
                color: 'var(--adm-text-body, #cbd5e1)',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '8px',
                background: '#14A9D7',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Salvando...' : messageToEdit ? 'Atualizar Mensagem' : 'Criar Mensagem Rápida'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
