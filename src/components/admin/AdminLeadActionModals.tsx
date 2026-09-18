import React, { useState } from 'react';
import { 
  X, CheckSquare, GitBranch, Tag as TagIcon, 
  ArrowRight, Plus, Check, Users
} from 'lucide-react';
import type { Lead, CommercialFunnel, Collaborator, CrmStage } from '../../types/admin';

// ── 1. MODAL DE MUDAR DE FUNIL ──────────────────────────────────────────────
interface AdminMoveFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  funnels: CommercialFunnel[];
  onMove: (leadId: string, destinationFunnelId: string, stageId?: string) => Promise<boolean>;
}

export const AdminMoveFunnelModal: React.FC<AdminMoveFunnelModalProps> = ({
  isOpen,
  onClose,
  lead,
  funnels,
  onMove,
}) => {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !lead) return;
    setErrorMsg(null);
    setIsSubmitting(false);

    // Seleciona o primeiro funil diferente do atual, ou o primeiro disponível
    const otherFunnels = funnels.filter(f => f.id !== lead.funnelId);
    const initialFunnel = otherFunnels[0] || funnels[0];
    if (initialFunnel) {
      setSelectedFunnelId(initialFunnel.id);
      setSelectedStageId(initialFunnel.stages?.[0]?.id || 'new_lead');
    }
  }, [isOpen, lead, funnels]);

  if (!isOpen || !lead) return null;

  const currentFunnelObj = funnels.find(f => f.id === selectedFunnelId);
  const stages = currentFunnelObj?.stages || [];

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    const target = funnels.find(f => f.id === funnelId);
    setSelectedStageId(target?.stages?.[0]?.id || 'new_lead');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFunnelId) {
      setErrorMsg('Selecione o funil de destino.');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onMove(lead.id, selectedFunnelId, selectedStageId || undefined);
      if (ok) {
        onClose();
      } else {
        setErrorMsg('Não foi possível transferir o lead.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao mudar de funil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--adm-bg-card, #ffffff)',
          border: '1px solid var(--adm-border, #E2E8F0)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-app, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={16} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              Mudar Funil do Lead
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted, #94A3B8)', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.76rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-secondary, #475569)' }}>
            Movendo lead: <strong style={{ color: 'var(--adm-text-title, #0F172A)' }}>{lead.name}</strong>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-secondary, #475569)', marginBottom: '4px' }}>
              Funil de Destino
            </label>
            <select
              value={selectedFunnelId}
              onChange={(e) => handleFunnelChange(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                outline: 'none',
              }}
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {stages.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-secondary, #475569)', marginBottom: '4px' }}>
                Etapa Inicial
              </label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.80rem',
                  outline: 'none',
                }}
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'transparent',
                color: 'var(--adm-text-muted, #64748B)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>Transferir Lead</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ── 2. MODAL DE CRIAR TAREFA RÁPIDA ──────────────────────────────────────────
interface AdminQuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onAddTask: (leadId: string, task: { title: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => void;
}

export const AdminQuickTaskModal: React.FC<AdminQuickTaskModalProps> = ({
  isOpen,
  onClose,
  lead,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setPriority('medium');
    setErrorMsg(null);
  }, [isOpen]);

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o título da tarefa.');
      return;
    }
    onAddTask(lead.id, {
      title: title.trim(),
      dueDate: dueDate || undefined,
      priority,
    });
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
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
          maxWidth: '440px',
          background: 'var(--adm-bg-card, #ffffff)',
          border: '1px solid var(--adm-border, #E2E8F0)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-app, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="#6366F1" />
            <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              Nova Tarefa para o Lead
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted, #94A3B8)', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.76rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-secondary, #475569)' }}>
            Lead: <strong style={{ color: 'var(--adm-text-title, #0F172A)' }}>{lead.name}</strong>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-secondary, #475569)', marginBottom: '4px' }}>
              Título da Tarefa <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="ex: Ligar para confirmar presença na degustação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-input, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.80rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-secondary, #475569)', marginBottom: '4px' }}>
                Data Limite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.80rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-secondary, #475569)', marginBottom: '4px' }}>
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-input, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.80rem',
                  outline: 'none',
                }}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta / Urgente</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'transparent',
                color: 'var(--adm-text-muted, #64748B)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--adm-accent, #6366F1), #4F46E5)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>Salvar Tarefa</span>
              <Check size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ── 3. MODAL DE ADICIONAR TAG RÁPIDA (RESTRITO ÀS TAGS PRÉ-CONFIGURADAS DO FUNIL) ──
interface AdminAddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  predefinedTags?: string[];
  onAddTag: (leadId: string, tag: string) => void;
  onRemoveTag?: (leadId: string, tag: string) => void;
}

export const AdminAddTagModal: React.FC<AdminAddTagModalProps> = ({
  isOpen,
  onClose,
  lead,
  predefinedTags = [],
  onAddTag,
  onRemoveTag,
}) => {
  if (!isOpen || !lead) return null;

  const currentTags = lead.tags || [];

  const handleToggleTag = (tag: string) => {
    if (!tag.trim()) return;
    const isPresent = currentTags.includes(tag);
    if (isPresent && onRemoveTag) {
      onRemoveTag(lead.id, tag);
    } else if (!isPresent) {
      onAddTag(lead.id, tag);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
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
          maxWidth: '440px',
          background: 'var(--adm-bg-card, #ffffff)',
          border: '1px solid var(--adm-border, #E2E8F0)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-surface, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TagIcon size={16} color="var(--adm-accent, #14A9D7)" />
            <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              Tags Oficiais do Funil
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted, #94A3B8)', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted, #64748B)' }}>
            Lead: <strong style={{ color: 'var(--adm-text-title, #0F172A)' }}>{lead.name}</strong>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title, #0F172A)', marginBottom: '8px' }}>
              Selecione as tags para ativar ou desativar neste lead:
            </span>

            {predefinedTags.length === 0 ? (
              <div style={{
                padding: '20px 14px',
                textAlign: 'center',
                borderRadius: '8px',
                background: 'var(--adm-bg-input, #F8FAFC)',
                border: '1px dashed var(--adm-border, #CBD5E1)',
                color: 'var(--adm-text-muted, #64748B)',
                fontSize: '0.78rem',
              }}>
                Nenhuma tag pré-configurada neste funil.<br />
                <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                  O gestor do funil pode cadastrar tags oficiais na tela de Configurações do Funil.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {predefinedTags.map((tag) => {
                  const isAlreadyPresent = currentTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: isAlreadyPresent ? '1.5px solid #10B981' : '1px solid var(--adm-border, #CBD5E1)',
                        background: isAlreadyPresent ? 'rgba(16, 185, 129, 0.12)' : 'var(--adm-bg-input, #F8FAFC)',
                        color: isAlreadyPresent ? '#047857' : 'var(--adm-text-title, #0F172A)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isAlreadyPresent ? (
                        <Check size={12} color="#10B981" strokeWidth={3} />
                      ) : (
                        <Plus size={12} color="var(--adm-text-muted, #64748B)" />
                      )}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--adm-border, #E2E8F0)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--adm-accent, #14A9D7)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 4. MODAL EM MASSA: MOVER ETAPA ──────────────────────────────────────────
interface AdminBulkMoveStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  stages: Array<{ id: string; title: string; headerColor?: string }>;
  onConfirm: (stageId: CrmStage) => void;
}

export const AdminBulkMoveStageModal: React.FC<AdminBulkMoveStageModalProps> = ({
  isOpen,
  onClose,
  count,
  stages,
  onConfirm,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>(stages[0]?.id || 'new_lead');

  React.useEffect(() => {
    if (isOpen && stages.length > 0) {
      setSelectedStage(stages[0].id);
    }
  }, [isOpen, stages]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--adm-bg-card, #ffffff)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '8px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-app, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={16} color="#3B82F6" />
            <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              Mover {count} Lead(s) de Etapa
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-secondary, #475569)' }}>
            Selecione a nova etapa para onde todos os <strong>{count}</strong> leads selecionados serão transferidos:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
            {stages.map((st) => {
              const isSelected = selectedStage === st.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStage(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1.5px solid #3B82F6' : '1px solid var(--adm-border, #E2E8F0)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--adm-bg-card, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.headerColor || '#3B82F6' }} />
                    <span style={{ fontSize: '0.80rem', fontWeight: isSelected ? 700 : 500, color: 'var(--adm-text-title, #0F172A)' }}>
                      {st.title}
                    </span>
                  </div>
                  {isSelected && <Check size={14} color="#3B82F6" />}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'transparent',
                color: 'var(--adm-text-muted, #64748B)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedStage as CrmStage)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#3B82F6',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirmar e Mover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 5. MODAL EM MASSA: ATRIBUIR RESPONSÁVEL ──────────────────────────────────
interface AdminBulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  collaborators: Collaborator[];
  onConfirm: (collabId: string) => void;
}

export const AdminBulkAssignModal: React.FC<AdminBulkAssignModalProps> = ({
  isOpen,
  onClose,
  count,
  collaborators,
  onConfirm,
}) => {
  const [selectedCollabId, setSelectedCollabId] = useState<string>(collaborators[0]?.id || '');

  React.useEffect(() => {
    if (isOpen && collaborators.length > 0) {
      setSelectedCollabId(collaborators[0].id);
    }
  }, [isOpen, collaborators]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--adm-bg-card, #ffffff)',
        border: '1px solid var(--adm-border, #E2E8F0)',
        borderRadius: '8px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--adm-border, #E2E8F0)',
          background: 'var(--adm-bg-app, #F8FAFC)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="#10B981" />
            <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
              Atribuir Responsável ({count} Leads)
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-secondary, #475569)' }}>
            Selecione o colaborador que assumirá a responsabilidade por estes <strong>{count}</strong> leads:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
            {collaborators.map((c) => {
              const isSelected = selectedCollabId === c.id;
              const avatar = c.avatarUrl || (c as any).photoUrl;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCollabId(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1.5px solid #10B981' : '1px solid var(--adm-border, #E2E8F0)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--adm-bg-card, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {avatar ? (
                      <img src={avatar} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#334155', color: '#fff', fontSize: '0.70rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.80rem', fontWeight: isSelected ? 700 : 500, color: 'var(--adm-text-title, #0F172A)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #64748B)' }}>
                        {c.role === 'sdr' ? 'SDR Comercial' : c.role === 'closer' ? 'Closer Comercial' : 'Equipe Comercial'}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={14} color="#10B981" />}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'transparent',
                color: 'var(--adm-text-muted, #64748B)',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedCollabId)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#10B981',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Atribuir Todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
