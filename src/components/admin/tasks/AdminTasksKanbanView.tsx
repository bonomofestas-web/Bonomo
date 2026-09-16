import React from 'react';
import { Clock, CheckCircle2, Building } from 'lucide-react';
import type { AdminTask, Collaborator } from '../../../types/admin';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';

interface AdminTasksKanbanViewProps {
  tasks: AdminTask[];
  onOpenTask: (task: AdminTask) => void;
  todayStr: string;
  entityLabel?: string; // 'Tarefas' | 'Follow-ups' | 'Visitas & Degustações' | 'Compromissos' | 'Visitas' | 'Degustações'
  workspaceContext?: 'all' | 'followup' | 'visits_tastings' | 'appointments';
  collaborators?: Collaborator[];
}

export const AdminTasksKanbanView: React.FC<AdminTasksKanbanViewProps> = ({
  tasks,
  onOpenTask,
  todayStr,
  entityLabel = 'Tarefas',
  workspaceContext = 'all',
  collaborators = [],
}) => {
  // Helpers for date buckets
  const tomorrowStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const endOfWeekStr = React.useMemo(() => {
    const d = new Date();
    const dayOfWeek = d.getDay() || 7; // 1 = Seg, 7 = Dom
    d.setDate(d.getDate() + (7 - dayOfWeek));
    return d.toISOString().split('T')[0];
  }, []);

  // Filter tasks into columns
  const overdueTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      return t.dueDate < todayStr && t.status !== 'completed';
    });
  }, [tasks, todayStr]);

  const todayTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      return t.dueDate === todayStr;
    });
  }, [tasks, todayStr]);

  const tomorrowTasks = React.useMemo(() => {
    return tasks.filter(t => t.dueDate === tomorrowStr);
  }, [tasks, tomorrowStr]);

  const thisWeekTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      return t.dueDate > tomorrowStr && t.dueDate <= endOfWeekStr;
    });
  }, [tasks, tomorrowStr, endOfWeekStr]);

  const formatTaskTime = (task: AdminTask) => {
    const dateParts = (task.dueDate || todayStr).split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : task.dueDate;
    if (task.dueTime) {
      if (task.endTime) {
        return `${formattedDate} ${task.dueTime}-${task.endTime}`;
      }
      return `${formattedDate} ${task.dueTime}`;
    }
    return `${formattedDate} Dia todo`;
  };

  const getSectorName = (task: AdminTask) => {
    const typeStr = (task.customType || task.type || '').toLowerCase();
    const titleStr = (task.title || '').toLowerCase();
    if (task.type === 'followup' || task.type === 'call' || typeStr.includes('follow') || Boolean(task.leadId)) {
      return 'Follow-up';
    }
    if (typeStr.includes('visita') || titleStr.includes('visita')) {
      return 'Visita';
    }
    if (typeStr.includes('degust') || titleStr.includes('degust') || titleStr.includes('jantar')) {
      return 'Degustação';
    }
    if (typeStr.includes('reuni') || typeStr.includes('compromisso') || task.type === 'meeting') {
      return 'Compromisso';
    }
    return 'Geral';
  };

  const renderColumn = (title: string, columnTasks: AdminTask[], accentColor: string = '#0284C7') => {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: '280px',
        maxWidth: '420px',
        background: 'transparent',
      }}>
        {/* Column Header */}
        <div style={{
          paddingBottom: '10px',
          marginBottom: '12px',
          borderBottom: `2px solid ${accentColor}`,
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.6px',
            color: '#0F172A',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {title}
          </h2>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginTop: '2px', display: 'block' }}>
            {columnTasks.length} {columnTasks.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Column Task Cards with safe padding to prevent hover border clipping */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          overflowY: 'auto',
          padding: '6px 6px 12px 6px',
        }}>
          {columnTasks.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              border: '1px dashed #CBD5E1',
              borderRadius: '12px',
              color: '#94A3B8',
              fontSize: '0.78rem',
              background: '#FFFFFF',
            }}>
              Nenhum item para este período
            </div>
          ) : (
            columnTasks.map(task => {
              const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
              const isCompleted = task.status === 'completed';
              const leadOrTargetName = task.leadName || task.debutanteName || (task.customProperties?.company ? `${task.title}, ${task.customProperties.company}` : null);
              const theme = getTaskTypeTheme(task);

              const assignedCollab = (task.assignedToIds && task.assignedToIds.length > 0)
                ? collaborators.find(c => task.assignedToIds?.includes(c.id))
                : (task.createdById ? collaborators.find(c => c.id === task.createdById) : null);
              const assignedAvatar = assignedCollab?.avatarUrl;
              const assignedName = assignedCollab?.name || task.createdByName || 'Colaborador';
              const assignedInitial = assignedName.charAt(0).toUpperCase();

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  style={{
                    position: 'relative',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isCompleted 
                      ? '1px solid #E2E8F0' 
                      : isOverdue 
                        ? '1.5px solid #FCA5A5' 
                        : '1px solid #E2E8F0',
                    background: isCompleted 
                      ? '#F8FAFC' 
                      : isOverdue 
                        ? '#FEF2F2' 
                        : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    opacity: isCompleted ? 0.75 : 1,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isOverdue ? '#EF4444' : theme.primaryColor;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = isOverdue 
                      ? '0 6px 16px rgba(239, 68, 68, 0.15)' 
                      : '0 6px 16px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isCompleted ? '#E2E8F0' : isOverdue ? '#FCA5A5' : '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }}
                >
                  {/* Lead or Client name (Blue / Top) */}
                  {leadOrTargetName && (
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#0284C7',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Building size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
                      <span>{leadOrTargetName}</span>
                    </div>
                  )}

                  {/* Task Title */}
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    lineHeight: 1.3,
                    marginBottom: '6px',
                    paddingRight: (isOverdue || isCompleted) ? '18px' : '0',
                  }}>
                    {task.title}
                  </div>

                  {/* Date and Time */}
                  <div style={{
                    fontSize: '0.70rem',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '8px',
                  }}>
                    <Clock size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                    <span>{formatTaskTime(task)}</span>
                  </div>

                  {/* Footer: Sector / Type Badge (Left) + Assigned Collaborator Photo Avatar (Right) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '0.72rem',
                    paddingTop: '6px',
                    borderTop: '1px solid #F1F5F9',
                  }}>
                    {/* Sector (in Minhas Tarefas) or Subtype (in Sector view) */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: theme.badgeBg,
                      border: `1px solid ${theme.badgeBorder}`,
                      color: theme.badgeText,
                      fontSize: '0.70rem',
                      fontWeight: 700,
                    }}>
                      {renderTaskTypeIcon(theme.category, 11, theme.primaryColor)}
                      <span>{workspaceContext === 'all' ? getSectorName(task) : theme.label}</span>
                    </div>

                    {/* Collaborator Photo Circle in Sector Views */}
                    {workspaceContext !== 'all' && (
                      <div 
                        title={`Responsável: ${assignedName}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: assignedAvatar ? 'transparent' : '#0284C7',
                          color: '#FFFFFF',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          overflow: 'hidden',
                          border: '1.5px solid #FFFFFF',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          flexShrink: 0,
                        }}
                      >
                        {assignedAvatar ? (
                          <img 
                            src={assignedAvatar} 
                            alt={assignedName} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <span>{assignedInitial}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Badge Tag if completed or overdue */}
                  {isOverdue && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#EF4444',
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.7)',
                    }} />
                  )}
                  {isCompleted && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', color: '#059669' }} title="Finalizada">
                      <CheckCircle2 size={15} />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      gap: '24px',
      overflowX: 'auto',
      padding: '16px 24px',
      boxSizing: 'border-box',
      background: '#F8FAFC',
    }}>
      {renderColumn(`${entityLabel} Atrasadas`, overdueTasks, '#EF4444')}
      {renderColumn(`${entityLabel} de Hoje`, todayTasks, '#0284C7')}
      {renderColumn(`${entityLabel} de Amanhã`, tomorrowTasks, '#3B82F6')}
      {renderColumn(`${entityLabel} Desta Semana`, thisWeekTasks, '#8B5CF6')}
    </div>
  );
};
