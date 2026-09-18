import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface AdminTaskCompletionModalProps {
  isOpen: boolean;
  taskTitle: string;
  initialFeedback?: string;
  onConfirm: (feedback: string) => void;
  onClose: () => void;
}

export const AdminTaskCompletionModal: React.FC<AdminTaskCompletionModalProps> = ({
  isOpen,
  taskTitle,
  initialFeedback = '',
  onConfirm,
  onClose,
}) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback(initialFeedback);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialFeedback]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirm(feedback.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
      animation: 'fadeIn 0.15s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-card, #FFFFFF)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                Finalizar Tarefa
              </h3>
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--adm-text-muted, #64748B)',
                maxWidth: '320px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '1px',
              }}>
                {taskTitle || 'Tarefa selecionada'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted, #64748B)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--adm-text-title, #0F172A)',
              marginBottom: '6px',
            }}>
              O que aconteceu nesta tarefa?
            </label>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '0.72rem',
              color: 'var(--adm-text-muted, #64748B)',
              lineHeight: 1.4,
            }}>
              Descreva o resultado, retorno do contato ou observações de conclusão. Este resumo será salvo no histórico do lead/cliente.
            </p>

            <textarea
              ref={textareaRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Contato realizado com sucesso via WhatsApp; cliente confirmou data e enviamos o orçamento do pacote Gold..."
              rows={4}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input, #F8FAFC)',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.82rem',
                color: 'var(--adm-text-title, #0F172A)',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.5,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '6px',
              fontSize: '0.68rem',
              color: 'var(--adm-text-muted, #94A3B8)',
            }}>
              <span>Pressione <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--adm-bg-input, #E2E8F0)', fontSize: '0.66rem' }}>Ctrl+Enter</kbd> para concluir rápido</span>
              <span>Opcional, mas recomendado</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--adm-border, #E2E8F0)',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border, #CBD5E1)',
                color: 'var(--adm-text-muted, #64748B)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                background: '#10B981',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              <span>Concluir Tarefa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
