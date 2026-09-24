import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X, XCircle, RefreshCw } from 'lucide-react';
import type { TaskStatus } from '../../types/admin';

interface AdminTaskCompletionModalProps {
  isOpen: boolean;
  taskTitle: string;
  initialFeedback?: string;
  isAppointment?: boolean;
  onConfirm: (feedback: string, finalStatus?: TaskStatus, shouldReschedule?: boolean) => void;
  onClose: () => void;
}

export const AdminTaskCompletionModal: React.FC<AdminTaskCompletionModalProps> = ({
  isOpen,
  taskTitle,
  initialFeedback = '',
  isAppointment = false,
  onConfirm,
  onClose,
}) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('completed');
  const [shouldReschedule, setShouldReschedule] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback(initialFeedback);
      setSelectedStatus('completed');
      setShouldReschedule(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialFeedback]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirm(feedback.trim(), selectedStatus, shouldReschedule);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSuccess = selectedStatus === 'completed';

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
        maxWidth: '500px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
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
              background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isSuccess ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isSuccess ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <XCircle size={18} strokeWidth={2.5} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                Finalizar Follow-up / Tarefa
              </h3>
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--adm-text-muted, #64748B)',
                maxWidth: '340px',
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
          {/* Seletor de Resultado / Status Padrão */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '6px' }}>
              Resultado do Contato:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isAppointment ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedStatus('completed')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: selectedStatus === 'completed' ? '1.5px solid #10B981' : '1px solid var(--adm-border)',
                  background: selectedStatus === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input)',
                  color: selectedStatus === 'completed' ? '#10B981' : 'var(--adm-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isAppointment ? 'Realizado' : 'Concluído (Sucesso)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStatus(isAppointment ? 'no_show' : 'no_result');
                  setShouldReschedule(true);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: (selectedStatus === 'no_result' || selectedStatus === 'no_show') ? '1.5px solid #EF4444' : '1px solid var(--adm-border)',
                  background: (selectedStatus === 'no_result' || selectedStatus === 'no_show') ? 'rgba(239, 68, 68, 0.12)' : 'var(--adm-bg-input)',
                  color: (selectedStatus === 'no_result' || selectedStatus === 'no_show') ? '#EF4444' : 'var(--adm-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <XCircle size={14} />
                <span>{isAppointment ? 'No-show' : 'Sem Resultado'}</span>
              </button>

              {isAppointment && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('cancelled');
                    setShouldReschedule(false);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: selectedStatus === 'cancelled' ? '1.5px solid #64748B' : '1px solid var(--adm-border)',
                    background: selectedStatus === 'cancelled' ? 'rgba(100, 116, 139, 0.15)' : 'var(--adm-bg-input)',
                    color: selectedStatus === 'cancelled' ? '#64748B' : 'var(--adm-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                  <span>Cancelado</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--adm-text-title, #0F172A)',
              marginBottom: '6px',
            }}>
              Resumo do Follow-up / O que aconteceu:
            </label>

            <textarea
              ref={textareaRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSuccess 
                ? "Ex: Contato realizado com sucesso via WhatsApp; cliente confirmou interesse no pacote e pediu orçamento..."
                : "Ex: Cliente não atendeu nem respondeu no WhatsApp. Marcar nova tentativa para amanhã..."}
              rows={3}
              style={{
                width: '100%',
                background: 'var(--adm-bg-input, #F8FAFC)',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.80rem',
                color: 'var(--adm-text-title, #0F172A)',
                outline: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.45,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Reagendamento Instantâneo (Preserva histórico e cria novo agendamento) */}
          {(selectedStatus === 'no_result' || selectedStatus === 'no_show' || selectedStatus === 'cancelled') && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} color="#3B82F6" />
                <div>
                  <strong style={{ fontSize: '0.74rem', color: 'var(--adm-text-title)', display: 'block' }}>
                    Reagendar para data futura
                  </strong>
                  <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                    Mantém este registro no histórico e abre novo agendamento
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={shouldReschedule}
                onChange={(e) => setShouldReschedule(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#3B82F6', cursor: 'pointer' }}
              />
            </div>
          )}

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
                padding: '7px 14px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                background: isSuccess ? '#10B981' : '#EF4444',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isSuccess ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(239, 68, 68, 0.3)',
              }}
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              <span>{isSuccess ? 'Concluir com Sucesso' : 'Finalizar Sem Resultado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
