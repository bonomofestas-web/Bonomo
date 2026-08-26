import React, { useState } from 'react';
import { 
  X, Calendar,
  Phone, Users, Utensils, MessageSquare, Briefcase, 
  ExternalLink, Edit3, Trash2, Check
} from 'lucide-react';
import type { AdminTask, TaskType } from '../../types/admin';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AdminTask | null;
  onEdit: (task: AdminTask) => void;
  onOpenLead?: (leadId: string) => void;
}

export const AdminTaskDetailModal: React.FC<AdminTaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onOpenLead,
}) => {
  const { collaborators, toggleTaskStatus, deleteTask } = useAdminState();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'completed';

  const renderTypeIcon = (type?: TaskType) => {
    switch (type) {
      case 'call': return <Phone size={14} color="#60A5FA" />;
      case 'meeting': return <Users size={14} color="#A78BFA" />;
      case 'tasting': return <Utensils size={14} color="#F59E0B" />;
      case 'followup': return <MessageSquare size={14} color="#10B981" />;
      default: return <Briefcase size={14} color="var(--adm-accent)" />;
    }
  };

  const getPriorityInfo = (p?: string) => {
    switch (p) {
      case 'high': return { label: 'Alta (Urgente)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'medium': return { label: 'Média', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      default: return { label: 'Baixa', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const priorityInfo = getPriorityInfo(task.priority);

  const assignedCollabs = (task.assignedToIds || [])
    .map(id => collaborators.find(c => c.id === id))
    .filter(Boolean);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--adm-bg-input)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: isCompleted ? 'rgba(52, 211, 153, 0.15)' : 'var(--adm-accent-bg)',
              color: isCompleted ? '#34D399' : 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {renderTypeIcon(task.type)}
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Detalhes da Tarefa
              </span>
              <div style={{ fontSize: '0.74rem', color: isCompleted ? '#34D399' : '#F59E0B', fontWeight: 800 }}>
                {isCompleted ? '✓ Finalizada' : '● Pendente'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Title */}
          <div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--adm-text-title)',
              margin: '0 0 8px 0',
              textDecoration: isCompleted ? 'line-through' : 'none',
              opacity: isCompleted ? 0.7 : 1,
              lineHeight: 1.35,
            }}>
              {task.title}
            </h2>

            {/* Badges Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: priorityInfo.bg,
                border: `1px solid ${priorityInfo.color}55`,
                color: priorityInfo.color,
                borderRadius: '8px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}>
                Prioridade {priorityInfo.label}
              </span>

              <span style={{
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-muted)',
                borderRadius: '8px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Calendar size={12} color="var(--adm-accent)" />
                {formatDate(task.dueDate)}
                {task.dueTime && ` às ${task.dueTime}`}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div style={{
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '14px',
            }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Descrição / Orientações
              </label>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--adm-text-title)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {task.description}
              </p>
            </div>
          )}

          {/* Linked Lead / Debutante Quick Action Banner */}
          {task.leadId && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(212, 175, 55, 0.04))',
              border: '1px solid var(--adm-accent)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Lead Vinculado do CRM
                </span>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                  {task.leadName || 'Lead Bonomo'}
                </div>
              </div>

              {onOpenLead && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLead(task.leadId!);
                    onClose();
                  }}
                  className="adm-btn-primary"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  <span>Ir até o Lead</span>
                  <ExternalLink size={13} />
                </button>
              )}
            </div>
          )}

          {/* Assigned Responsibles */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Responsáveis Atribuídos ({assignedCollabs.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assignedCollabs.length === 0 ? (
                <span style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>Nenhum responsável atribuído</span>
              ) : (
                assignedCollabs.map(collab => collab && (
                  <div
                    key={collab.id}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '30px',
                      padding: '4px 12px 4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {collab.avatarUrl ? (
                      <img src={collab.avatarUrl} alt={collab.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--adm-accent-bg)', color: 'var(--adm-accent)', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {collab.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
                      {collab.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {/* Left: Delete */}
          <button
            type="button"
            onClick={() => setIsConfirmDeleteOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            <Trash2 size={14} />
            <span>Excluir</span>
          </button>

          {/* Right: Edit & Complete Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleTaskStatus(task.id);
                onClose();
              }}
              style={{
                background: isCompleted ? 'var(--adm-bg-card)' : 'linear-gradient(135deg, #10B981, #059669)',
                border: `1px solid ${isCompleted ? 'var(--adm-border)' : '#10B981'}`,
                color: isCompleted ? 'var(--adm-text-muted)' : '#FFF',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={14} />
              <span>{isCompleted ? 'Reabrir Tarefa' : 'Concluir Tarefa'}</span>
            </button>
          </div>
        </div>

      </div>

      <AdminConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          deleteTask(task.id);
          setIsConfirmDeleteOpen(false);
          onClose();
        }}
        title="Excluir Tarefa"
        itemName={task.title || task.description}
        message={`Tem certeza que deseja apagar a tarefa "${task.title || task.description}"? Esta ação não poderá ser desfeita.`}
      />
    </div>
  );
};
