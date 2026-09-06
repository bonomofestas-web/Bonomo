import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Calendar, CheckCircle2,
  Users, Search, ExternalLink, Plus
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import type { AdminTask } from '../../types/admin';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskModal } from './AdminTaskModal';

interface AdminFollowUpsViewProps {
  onOpenLead?: (leadId: string) => void;
}

export const AdminFollowUpsView: React.FC<AdminFollowUpsViewProps> = ({ onOpenLead }) => {
  const { 
    tasks, 
    leads, 
    collaborators, 
    currentUser, 
    completeTaskWithFeedback 
  } = useAdminState();

  const [filterScope, setFilterScope] = useState<'mine' | 'all'>('mine');
  const [filterDate, setFilterDate] = useState<'today' | 'week' | 'overdue' | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter tasks that are followups or tied to CRM leads
  const followUpTasks = useMemo(() => {
    return tasks.filter(task => {
      // Must be a follow-up or lead-related task
      const isLeadOrFollowup = task.type === 'followup' || task.type === 'call' || Boolean(task.leadId);
      if (!isLeadOrFollowup) return false;

      // Scope filter: mine vs all
      if (filterScope === 'mine' && currentUser) {
        const isAssigned = (task.assignedToIds || []).includes(currentUser.id) || task.createdById === currentUser.id;
        if (!isAssigned) return false;
      }

      // Status filter
      if (filterStatus === 'pending' && task.status === 'completed') return false;
      if (filterStatus === 'completed' && task.status !== 'completed') return false;

      // Date filter
      if (filterDate === 'today' && task.dueDate !== todayStr) return false;
      if (filterDate === 'overdue') {
        const isOverdue = task.status !== 'completed' && task.dueDate < todayStr;
        if (!isOverdue) return false;
      }
      if (filterDate === 'week') {
        const taskDate = new Date(task.dueDate);
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        if (taskDate < now || taskDate > nextWeek) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesLead = (task.leadName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLead) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by due date
      return new Date(`${a.dueDate}T${a.dueTime || '00:00'}`).getTime() - new Date(`${b.dueDate}T${b.dueTime || '00:00'}`).getTime();
    });
  }, [tasks, filterScope, filterDate, filterStatus, searchQuery, todayStr, currentUser]);

  const handleQuickComplete = (task: AdminTask) => {
    if (task.leadId) {
      setCompletingTaskId(task.id);
      setFeedbackText('');
    } else {
      completeTaskWithFeedback(task.id, 'Follow-up concluído.');
    }
  };

  const handleSaveFeedback = () => {
    if (!completingTaskId || !feedbackText.trim()) return;
    completeTaskWithFeedback(completingTaskId, feedbackText.trim());
    setCompletingTaskId(null);
    setFeedbackText('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Agenda de Follow-ups Comerciais
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
                Gestão e execução dos retornos programados com os leads do CRM
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={() => setIsNewTaskModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--adm-accent)',
            color: '#1B120C',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 18px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={16} />
          <span>Agendar Follow-up</span>
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="saas-card" style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Left: Scope Pill Toggle (Meus vs Todos) */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--adm-bg-input)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid var(--adm-border)',
        }}>
          <button
            type="button"
            onClick={() => setFilterScope('mine')}
            style={{
              background: filterScope === 'mine' ? 'var(--adm-accent)' : 'transparent',
              color: filterScope === 'mine' ? '#1B120C' : 'var(--adm-text-muted)',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Meus Follow-ups
          </button>
          <button
            type="button"
            onClick={() => setFilterScope('all')}
            style={{
              background: filterScope === 'all' ? 'var(--adm-accent)' : 'transparent',
              color: filterScope === 'all' ? '#1B120C' : 'var(--adm-text-muted)',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Toda a Equipe
          </button>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'all', label: 'Todos os Prazos' },
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Próximos 7 dias' },
            { id: 'overdue', label: 'Atrasados' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilterDate(p.id as any)}
              style={{
                background: filterDate === p.id ? 'var(--adm-bg-input)' : 'transparent',
                border: `1px solid ${filterDate === p.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                color: filterDate === p.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Status Filter (Pendentes vs Concluídos) */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--adm-bg-input)',
          padding: '2px',
          borderRadius: '8px',
          border: '1px solid var(--adm-border)',
          gap: '2px',
        }}>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            style={{
              background: filterStatus === 'pending' ? 'var(--adm-accent-bg)' : 'transparent',
              border: filterStatus === 'pending' ? '1px solid var(--adm-accent)' : '1px solid transparent',
              color: filterStatus === 'pending' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: filterStatus === 'pending' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            style={{
              background: filterStatus === 'completed' ? 'var(--adm-accent-bg)' : 'transparent',
              border: filterStatus === 'completed' ? '1px solid var(--adm-accent)' : '1px solid transparent',
              color: filterStatus === 'completed' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: filterStatus === 'completed' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            Concluídos
          </button>
        </div>

        {/* Right: Search Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={14} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou lead..."
            style={{
              width: '100%',
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '8px',
              padding: '6px 10px 6px 32px',
              fontSize: '0.78rem',
              color: 'var(--adm-text-body)',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Follow-ups List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {followUpTasks.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--adm-text-title)', margin: '0 0 6px 0' }}>
              Nenhum follow-up pendente para este filtro!
            </h4>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>
              Todos os contatos agendados estão em dia ou foram concluídos.
            </p>
          </div>
        ) : (
          followUpTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && task.dueDate < todayStr;
            const isToday = !isCompleted && task.dueDate === todayStr;

            const lead = leads.find(l => l.id === task.leadId);
            const assignedCollab = collaborators.find(c => (task.assignedToIds || []).includes(c.id));

            return (
              <div
                key={task.id}
                className="saas-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderLeft: isOverdue ? '4px solid #EF4444' : isToday ? '4px solid var(--adm-accent)' : '4px solid transparent',
                  transition: 'transform 0.1s ease',
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                  {/* Quick Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleQuickComplete(task)}
                    title={isCompleted ? 'Concluído' : 'Marcar como concluído'}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isCompleted ? '#10B981' : 'transparent',
                      border: `1.5px solid ${isCompleted ? '#10B981' : 'var(--adm-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted && <CheckCircle2 size={16} color="#FFFFFF" />}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span 
                        onClick={() => setSelectedTask(task)}
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: isCompleted ? 'var(--adm-text-muted)' : 'var(--adm-text-title)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {task.title}
                      </span>

                      {/* Status Badges */}
                      {isOverdue && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                          Atrasado
                        </span>
                      )}
                      {isToday && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--adm-accent)' }}>
                          Para Hoje
                        </span>
                      )}
                    </div>

                    {/* Meta info: Lead, Date, Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.76rem', color: 'var(--adm-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                      {lead && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--adm-text-title)', fontWeight: 600 }}>
                          <Users size={12} color="var(--adm-accent)" />
                          <span>{lead.name}</span>
                          {lead.phone && (
                            <span style={{ color: 'var(--adm-text-muted)', fontWeight: 400 }}>({formatPhone(lead.phone)})</span>
                          )}
                        </span>
                      )}

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{task.dueDate.split('-').reverse().join('/')}</span>
                        {task.dueTime && <span>às {task.dueTime}</span>}
                      </span>

                      {assignedCollab && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img
                            src={assignedCollab.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedCollab.name)}&background=D4AF37&color=1B120C`}
                            alt={assignedCollab.name}
                            style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>{assignedCollab.name}</span>
                        </span>
                      )}

                      {task.mandatoryFeedback && (
                        <span style={{ color: '#10B981', fontStyle: 'italic' }}>
                          Feedback: "{task.mandatoryFeedback}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {lead && onOpenLead && (
                    <button
                      type="button"
                      onClick={() => onOpenLead(lead.id)}
                      title="Abrir no CRM"
                      style={{
                        background: 'var(--adm-bg-input)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-text-muted)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>Abrir Lead</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    title="Ver detalhes da tarefa no estilo Notion"
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notion-Style Task Modal */}
      {selectedTask && (
        <AdminTaskDetailModal
          isOpen={Boolean(selectedTask)}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onOpenLead={onOpenLead}
        />
      )}

      {/* Create New Task Modal */}
      {isNewTaskModalOpen && (
        <AdminTaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
        />
      )}

      {/* Feedback Prompt on Complete */}
      {completingTaskId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
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
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              Feedback Obrigatório de Follow-up
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
              Como foi o contato com o lead? Descreva o resultado para atualizar o histórico comercial.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: Mensagem enviada pelo WhatsApp; Lead solicitou orçamento para novembro; Reunião agendada..."
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
                onClick={() => setCompletingTaskId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-muted)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={!feedbackText.trim()}
                style={{
                  background: feedbackText.trim() ? 'var(--adm-accent)' : 'rgba(148,163,184,0.3)',
                  color: feedbackText.trim() ? '#1B120C' : 'var(--adm-text-muted)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Registrar Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
