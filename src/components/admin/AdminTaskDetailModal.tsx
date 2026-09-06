import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, Circle, Users,
  ExternalLink, Trash2, Send, Link,
  Maximize2, Minimize2, ChevronDown, ChevronRight,
  Smile, Image as ImageIcon, Layout,
  Phone, Utensils, MessageSquare, Briefcase, FileText, AlertCircle, CheckCircle2
} from 'lucide-react';
import type { AdminTask, TaskStatus, TaskPriority, TaskType, Collaborator } from '../../types/admin';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AdminTask | null;
  onEdit?: (task: AdminTask) => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminTaskDetailModal: React.FC<AdminTaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onOpenLead,
}) => {
  const { 
    currentUser, 
    collaborators, 
    updateTask, 
    deleteTask, 
    addTaskComment, 
    completeTaskWithFeedback 
  } = useAdminState();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskType, setTaskType] = useState<TaskType>('followup');
  const [newCommentText, setNewCommentText] = useState('');
  const [showMoreProperties, setShowMoreProperties] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');

  // Sync with current task
  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setContent(task.content || task.description || '');
    setDueDate(task.dueDate || '');
    setDueTime(task.dueTime || '14:00');
    setStatus(task.status || 'todo');
    setPriority(task.priority || 'medium');
    setTaskType(task.type || 'followup');
    setNewCommentText('');
    setFeedbackInput(task.mandatoryFeedback || '');
  }, [task]);

  if (!isOpen || !task) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const handleContentBlur = () => {
    if (content !== task.content) {
      updateTask(task.id, { content, description: content });
    }
  };

  const handleDateChange = (newDate: string) => {
    setDueDate(newDate);
    updateTask(task.id, { dueDate: newDate });
  };

  const handleTimeChange = (newTime: string) => {
    setDueTime(newTime);
    updateTask(task.id, { dueTime: newTime });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setPriority(newPriority);
    updateTask(task.id, { priority: newPriority });
  };

  const handleTypeChange = (newType: TaskType) => {
    setTaskType(newType);
    updateTask(task.id, { type: newType });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'completed' && task.leadId && !task.mandatoryFeedback) {
      setIsFeedbackModalOpen(true);
      return;
    }

    setStatus(newStatus);
    updateTask(task.id, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined 
    });
  };

  const handleConfirmFeedback = () => {
    if (!feedbackInput.trim()) return;
    completeTaskWithFeedback(task.id, feedbackInput.trim());
    setStatus('completed');
    setIsFeedbackModalOpen(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addTaskComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  const assignedCollabs = useMemo<Collaborator[]>(() => {
    if (!task?.assignedToIds) return [];
    return task.assignedToIds
      .map(id => collaborators.find(c => c.id === id))
      .filter((c): c is Collaborator => Boolean(c));
  }, [task?.assignedToIds, collaborators]);

  const getStatusBadge = (st: TaskStatus) => {
    switch (st) {
      case 'completed':
        return { label: 'Finalizado', color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', dot: '#10B981' };
      case 'in_progress':
        return { label: 'Em andamento', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)', dot: '#3B82F6' };
      case 'waiting':
        return { label: 'Aguardando', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', dot: '#F59E0B' };
      default:
        return { label: 'Não iniciado', color: 'var(--adm-text-muted)', bg: 'rgba(148, 163, 184, 0.14)', dot: '#94A3B8' };
    }
  };

  const getPriorityBadge = (pr: TaskPriority) => {
    switch (pr) {
      case 'urgent':
        return { label: 'Urgente', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.15)' };
      case 'high':
        return { label: 'Alta', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'medium':
        return { label: 'Média', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      default:
        return { label: 'Baixa', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const getTypeIcon = (tp: TaskType) => {
    switch (tp) {
      case 'call': return <Phone size={13} color="#60A5FA" />;
      case 'meeting': return <Users size={13} color="#A78BFA" />;
      case 'tasting': return <Utensils size={13} color="#F59E0B" />;
      case 'document': return <FileText size={13} color="#EC4899" />;
      default: return <MessageSquare size={13} color="#10B981" />;
    }
  };

  const statusInfo = getStatusBadge(status);
  const priorityInfo = getPriorityBadge(priority);

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: isFullScreen ? 'stretch' : 'center',
          justifyContent: 'center',
          padding: isFullScreen ? 0 : '24px 16px',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--adm-bg-card)',
            border: isFullScreen ? 'none' : '1px solid var(--adm-border)',
            borderRadius: isFullScreen ? 0 : '16px',
            width: '100%',
            maxWidth: isFullScreen ? '100vw' : '820px',
            height: isFullScreen ? '100vh' : '90vh',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s ease',
          }}
        >
          {/* Top Subtle Notion-style Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderBottom: '1px solid var(--adm-border)',
            background: 'var(--adm-bg-input)',
            flexShrink: 0,
          }}>
            {/* Top Left: Fullscreen Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? 'Reduzir janela' : 'Expandir tela cheia'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* Top Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Link da tarefa copiado para a área de transferência!');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  borderRadius: '6px',
                }}
              >
                <Link size={14} />
                <span>Copiar link</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                title="Excluir tarefa"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Fechar (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--adm-text-title)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-text-muted)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Document Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: isFullScreen ? '36px 120px' : '32px 48px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {/* Top Action Pills (Adicionar ícone, capa) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--adm-text-muted)', fontSize: '0.78rem' }}>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', borderRadius: '4px' }}
                onClick={() => updateTask(task.id, { icon: task.icon ? undefined : '🎯' })}
              >
                <Smile size={14} />
                <span>{task.icon ? 'Remover ícone' : 'Adicionar ícone'}</span>
              </button>
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', borderRadius: '4px' }}
                onClick={() => {
                  const url = prompt('Cole a URL da imagem de capa:');
                  if (url) updateTask(task.id, { coverUrl: url });
                }}
              >
                <ImageIcon size={14} />
                <span>{task.coverUrl ? 'Alterar capa' : 'Adicionar capa'}</span>
              </button>
            </div>

            {/* Optional Cover Image */}
            {task.coverUrl && (
              <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--adm-border)' }}>
                <img src={task.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Task Title (Editable Notion-Style Heading) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {task.icon && <span style={{ fontSize: '2rem' }}>{task.icon}</span>}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Sem título"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-title)',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.02em',
                  padding: 0,
                }}
              />
            </div>

            {/* Properties Key-Value Table (Notion Style) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '6px 0',
              borderBottom: '1px solid var(--adm-border)',
              paddingBottom: '20px',
            }}>
              {/* Row: Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Circle size={15} color="var(--adm-text-muted)" />
                  <span>Status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.color}40`,
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <option value="todo">⚪ Não iniciado</option>
                    <option value="in_progress">🔵 Em andamento</option>
                    <option value="waiting">🟡 Aguardando</option>
                    <option value="completed">🟢 Finalizado</option>
                  </select>
                </div>
              </div>

              {/* Row: Prazo / Data de entrega */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Calendar size={15} color="var(--adm-text-muted)" />
                  <span>Data de entrega</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.82rem',
                      color: 'var(--adm-text-body)',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.82rem',
                      color: 'var(--adm-text-body)',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              {/* Row: Prioridade */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <AlertCircle size={15} color="var(--adm-text-muted)" />
                  <span>Prioridade</span>
                </div>
                <div>
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                    style={{
                      background: priorityInfo.bg,
                      color: priorityInfo.color,
                      border: `1px solid ${priorityInfo.color}40`,
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Row: Tipo de Tarefa */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Briefcase size={15} color="var(--adm-text-muted)" />
                  <span>Tipo de Tarefa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    color: 'var(--adm-text-body)',
                  }}>
                    {getTypeIcon(taskType)}
                    <select
                      value={taskType}
                      onChange={(e) => handleTypeChange(e.target.value as TaskType)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontSize: 'inherit',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="followup">Follow-up Comercial</option>
                      <option value="meeting">Reunião / Visita</option>
                      <option value="call">Ligação de Alinhamento</option>
                      <option value="tasting">Degustação</option>
                      <option value="document">Envio de Proposta / Contrato</option>
                      <option value="general">Geral</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row: Pessoa / Responsável */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                  <Users size={15} color="var(--adm-text-muted)" />
                  <span>Pessoa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {assignedCollabs.length > 0 ? (
                    assignedCollabs.map((collab: Collaborator) => (
                      <div
                        key={collab.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          borderRadius: '16px',
                          padding: '3px 10px',
                          fontSize: '0.78rem',
                          color: 'var(--adm-text-title)',
                          fontWeight: 600,
                        }}
                      >
                        <img 
                          src={collab.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}&background=D4AF37&color=1B120C`}
                          alt={collab.name}
                          style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span>{collab.name}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>Vazio</span>
                  )}
                </div>
              </div>

              {/* Expandable Properties Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreProperties(!showMoreProperties)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  {showMoreProperties ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{showMoreProperties ? 'Ocultar propriedades' : 'Mais propriedades vinculadas'}</span>
                </button>
              </div>

              {/* Hidden / Expanded Properties */}
              {showMoreProperties && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {/* Lead Vínculo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                      <Layout size={15} color="var(--adm-text-muted)" />
                      <span>Lead CRM</span>
                    </div>
                    <div>
                      {task.leadId ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (task.leadId && onOpenLead) {
                              onOpenLead(task.leadId);
                              onClose();
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(212, 175, 55, 0.12)',
                            color: 'var(--adm-accent)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <span>{task.leadName || 'Ver Lead no CRM'}</span>
                          <ExternalLink size={12} />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>Sem vínculo com lead</span>
                      )}
                    </div>
                  </div>

                  {/* Debutante Vínculo */}
                  {task.debutanteName && (
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', minHeight: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem' }}>
                        <Smile size={15} color="var(--adm-text-muted)" />
                        <span>Debutante</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-body)', fontWeight: 600 }}>
                        {task.debutanteName}
                      </div>
                    </div>
                  )}

                  {/* Feedback Registrado */}
                  {task.mandatoryFeedback && (
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'flex-start', minHeight: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--adm-text-muted)', fontSize: '0.82rem', paddingTop: '4px' }}>
                        <CheckCircle2 size={15} color="#10B981" />
                        <span>Feedback</span>
                      </div>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        color: 'var(--adm-text-title)',
                        fontStyle: 'italic',
                      }}>
                        "{task.mandatoryFeedback}"
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section (Notion Style) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>
                Comentários
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'Admin')}&background=D4AF37&color=1B120C`}
                  alt="Current user"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Adicionar um comentário..."
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      padding: '8px 40px 8px 12px',
                      fontSize: '0.84rem',
                      color: 'var(--adm-text-body)',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                  {newCommentText.trim() && (
                    <button
                      type="submit"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--adm-accent)',
                        color: '#1B120C',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={13} />
                    </button>
                  )}
                </div>
              </form>

              {/* Existing Comments List */}
              {task.comments && task.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {task.comments.map(c => (
                    <div 
                      key={c.id} 
                      style={{
                        display: 'flex',
                        gap: '10px',
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }}
                    >
                      <img 
                        src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=D4AF37&color=1B120C`}
                        alt={c.authorName}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{c.authorName}</span>
                          <span>•</span>
                          <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--adm-text-body)', marginTop: '2px', lineHeight: 1.4 }}>
                          {c.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--adm-border)', margin: '8px 0' }} />

            {/* Notion Document Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} />
                <span>Anotações da Tarefa (Documento)</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleContentBlur}
                placeholder="Pressione 'Enter' para continuar com uma página vazia ou digite anotações, roteiro do contato e checklists da tarefa..."
                rows={isFullScreen ? 14 : 8}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--adm-text-body)',
                  fontSize: '0.94rem',
                  lineHeight: 1.6,
                  fontFamily: "'Inter', sans-serif",
                  resize: 'none',
                  padding: 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Lead Task Completion Feedback Modal */}
      {isFeedbackModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  Conclusão do Contato Comercial
                </h4>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                  O que aconteceu neste contato com o lead? (Obrigatório)
                </div>
              </div>
            </div>

            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="Ex: Tentei contato pelo WhatsApp mas não atendeu; Agendei visita para sábado; Lead qualificado no funil..."
              rows={4}
              autoFocus
              style={{
                width: '100%',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '0.84rem',
                color: 'var(--adm-text-body)',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFeedback}
                disabled={!feedbackInput.trim()}
                style={{
                  background: feedbackInput.trim() ? 'var(--adm-accent)' : 'rgba(148,163,184,0.3)',
                  color: feedbackInput.trim() ? '#1B120C' : 'var(--adm-text-muted)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: feedbackInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Salvar & Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <AdminConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${task.title}"?`}
        confirmText="Sim, Excluir"
        danger={true}
        onConfirm={handleDelete}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </>
  );
};
