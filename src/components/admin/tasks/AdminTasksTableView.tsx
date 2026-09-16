import React, { useMemo } from 'react';
import { 
  CheckSquare, Square, Calendar, Clock, 
  CheckCircle2, XCircle, Sparkles, ThumbsUp
} from 'lucide-react';
import type { AdminTask, Collaborator, Lead, Client, DebutanteAccount } from '../../../types/admin';
import { useAdminState } from '../../../context/AdminStateContext';
import { getTaskTypeTheme, renderTaskTypeIcon } from '../../../utils/taskColors';

interface AdminTasksTableViewProps {
  tasks: AdminTask[];
  allTasks?: AdminTask[];
  collaborators?: Collaborator[];
  leads?: Lead[];
  clients?: Client[];
  debutantes?: DebutanteAccount[];
  onOpenTask: (task: AdminTask) => void;
  onToggleStatus: (taskId: string) => void;
  todayStr: string;
  workspaceContext?: string;
}

interface DateGroup {
  key: string;
  title: string;
  subtitle: string;
  isOverdue: boolean;
  isToday: boolean;
  tasks: AdminTask[];
}

export const AdminTasksTableView: React.FC<AdminTasksTableViewProps> = ({
  tasks,
  allTasks = [],
  collaborators = [],
  leads: propsLeads,
  clients: propsClients,
  debutantes: propsDebutantes,
  onOpenTask,
  onToggleStatus,
  todayStr,
  workspaceContext = 'all',
}) => {
  const adminState = useAdminState();
  const leads = propsLeads || adminState?.leads || [];
  const clients = propsClients || adminState?.clients || [];
  const debutantes = propsDebutantes || adminState?.debutantes || [];

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const isVisitsContext = workspaceContext === 'visits_tastings';

  // Format Time/Deadline for individual task row
  const formatDeadline = (task: AdminTask) => {
    if (!task.dueDate) return 'Sem prazo';
    const timePart = task.dueTime ? (task.endTime ? ` ${task.dueTime} - ${task.endTime}` : ` ${task.dueTime}`) : '';
    if (task.dueDate === todayStr) {
      return `Hoje${timePart || ' 23:59'}`;
    }
    if (task.dueDate === tomorrowStr) {
      return `Amanhã${timePart || ' 23:59'}`;
    }
    const parts = task.dueDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}${timePart}`;
    }
    return `${task.dueDate}${timePart}`;
  };

  // Group tasks strictly by date (single header per calendar date)
  const groupedTasks = useMemo(() => {
    const groupMap = new Map<string, AdminTask[]>();

    tasks.forEach(task => {
      const key = task.dueDate || 'no_date';
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(task);
    });

    const groups: DateGroup[] = [];

    // Sort keys chronologically: past dates first, then today, then future dates, then no_date
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
      if (a === 'no_date') return 1;
      if (b === 'no_date') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      const groupItems = groupMap.get(key) || [];
      if (key === 'no_date') {
        groups.push({
          key,
          title: 'Sem Data Prevista',
          subtitle: 'Tarefas sem prazo definido',
          isOverdue: false,
          isToday: false,
          tasks: groupItems,
        });
        return;
      }

      const isOverdue = key < todayStr;
      const isToday = key === todayStr;
      const isTomorrow = key === tomorrowStr;

      try {
        const [y, m, d] = key.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        let title = dayMonth;
        if (isToday) {
          title = `Hoje • ${dayMonth}`;
        } else if (isTomorrow) {
          title = `Amanhã • ${dayMonth}`;
        }

        groups.push({
          key,
          title,
          subtitle: capitalizedWeekday,
          isOverdue,
          isToday,
          tasks: groupItems,
        });
      } catch {
        groups.push({
          key,
          title: key,
          subtitle: '',
          isOverdue,
          isToday,
          tasks: groupItems,
        });
      }
    });

    return groups;
  }, [tasks, todayStr, tomorrowStr]);

  // Helper for Visitas & Degustações: Calculate Notification 1 & 2 + Presence metric
  const getVisitNotificationData = (parentTask: AdminTask) => {
    const parentId = parentTask.id;
    const leadId = parentTask.leadId;

    // Search for Notification 1
    const notif1 = allTasks.find(t => {
      if (t.customProperties?.parentTaskId === parentId && t.customProperties?.notificationNumber === 1) return true;
      if (t.leadId && t.leadId === leadId && (t.title.toLowerCase().includes('notificar sobre') || t.title.toLowerCase().includes('lembrete: notificar'))) return true;
      return false;
    });

    // Search for Notification 2
    const notif2 = allTasks.find(t => {
      if (t.customProperties?.parentTaskId === parentId && t.customProperties?.notificationNumber === 2) return true;
      if (t.leadId && t.leadId === leadId && (t.title.toLowerCase().includes('confirmar presença') || t.title.toLowerCase().includes('confirmação 24h'))) return true;
      return false;
    });

    const evaluateNotification = (notif?: AdminTask) => {
      if (!notif) return { status: 'not_created', label: 'Pendente', isPositive: false };
      if (notif.status !== 'completed') {
        return { status: 'pending', label: 'Pendente', isPositive: false };
      }
      const resText = `${notif.resolution || ''} ${notif.observations || ''}`.toLowerCase();
      const isNegative = resText.includes('cancelad') || resText.includes('não') || resText.includes('desmarc') || resText.includes('ausente') || resText.includes('negativ');
      if (isNegative) {
        return { status: 'negative', label: 'Não Confirmado', isPositive: false };
      }
      return { status: 'positive', label: 'Confirmado', isPositive: true };
    };

    const eval1 = evaluateNotification(notif1);
    const eval2 = evaluateNotification(notif2);

    let positiveCount = 0;
    if (eval1.isPositive) positiveCount++;
    if (eval2.isPositive) positiveCount++;

    let presenceStatus: { label: string; bg: string; text: string; border: string; icon: React.ReactNode };

    if (positiveCount === 2) {
      presenceStatus = {
        label: 'Mais que Confirmado (100%)',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        icon: <Sparkles size={13} style={{ color: '#059669' }} />,
      };
    } else if (positiveCount === 1) {
      presenceStatus = {
        label: 'Cliente Confirmado (50%)',
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
        icon: <ThumbsUp size={13} style={{ color: '#2563EB' }} />,
      };
    } else {
      presenceStatus = {
        label: 'Não Confirmado (0%)',
        bg: '#F8FAFC',
        text: '#64748B',
        border: '#E2E8F0',
        icon: <Clock size={13} style={{ color: '#94A3B8' }} />,
      };
    }

    return {
      eval1,
      eval2,
      positiveCount,
      presenceStatus,
    };
  };

  const totalColumns = isVisitsContext ? 8 : 6;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E2E8F0',
      margin: '16px 24px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.80rem',
        }}>
          {/* Table Header */}
          <thead style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: '0.70rem',
            fontWeight: 800,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {isVisitsContext ? (
              <tr>
                <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                  <span className="sr-only">Status</span>
                </th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>HORÁRIO / PRAZO</th>
                <th style={{ padding: '12px 16px', minWidth: '160px' }}>RESPONSÁVEIS</th>
                <th style={{ padding: '12px 16px', minWidth: '220px' }}>FAMÍLIA & EVENTO</th>
                <th style={{ padding: '12px 14px', minWidth: '120px' }}>TIPO</th>
                <th style={{ padding: '12px 14px', minWidth: '140px' }}>CONFIRMAÇÃO 1</th>
                <th style={{ padding: '12px 14px', minWidth: '140px' }}>CONFIRMAÇÃO 2</th>
                <th style={{ padding: '12px 16px', minWidth: '180px' }}>CONFIRMAÇÃO PRESENÇA</th>
              </tr>
            ) : (
              <tr>
                <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                  <span className="sr-only">Status</span>
                </th>
                <th style={{ padding: '12px 16px', minWidth: '140px' }}>PRAZO</th>
                <th style={{ padding: '12px 16px', minWidth: '160px' }}>USUÁRIO RESPONSÁVEL</th>
                <th style={{ padding: '12px 16px', minWidth: '240px' }}>OBJETO / TAREFA</th>
                <th style={{ padding: '12px 16px', minWidth: '150px' }}>TIPO DE TAREFA</th>
                <th style={{ padding: '12px 16px', minWidth: '200px' }}>RESULTADO / RESOLUÇÃO</th>
              </tr>
            )}
          </thead>

          {/* Table Body Grouped by Date */}
          <tbody style={{ color: '#334155' }}>
            {groupedTasks.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                  Nenhum item encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              groupedTasks.map((group) => (
                <React.Fragment key={group.key}>
                  {/* Single Date Section Header Row */}
                  <tr style={{
                    background: group.isToday 
                      ? '#EFF6FF' 
                      : '#F8FAFC',
                    borderTop: '2px solid #E2E8F0',
                    borderBottom: '1px solid #E2E8F0',
                  }}>
                    <td 
                      colSpan={totalColumns} 
                      style={{ 
                        padding: '9px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={15} style={{ color: group.isToday ? '#2563EB' : '#64748B' }} />
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: group.isToday ? '#1D4ED8' : '#1E293B',
                            letterSpacing: '-0.2px',
                          }}>
                            {group.title}
                          </span>
                          {group.subtitle && (
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              color: group.isToday ? '#3B82F6' : '#64748B',
                              marginLeft: '4px',
                            }}>
                              • {group.subtitle}
                            </span>
                          )}
                        </div>

                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: group.isToday ? '#DBEAFE' : '#E2E8F0',
                          color: group.isToday ? '#1E40AF' : '#475569',
                        }}>
                          {group.tasks.length} {group.tasks.length === 1 ? 'tarefa' : 'tarefas'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Tasks in this Date Group */}
                  {group.tasks.map((task, idx) => {
                    const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'completed';
                    const isCompleted = task.status === 'completed';
                    const theme = getTaskTypeTheme(task);
                    // Resolve linked entity names (Lead, Client, Debutante)
                    const resolvedLeadName = task.leadName || (task.leadId ? leads.find(l => l.id === task.leadId)?.name : null);
                    const resolvedClientName = task.clientName || (task.clientId ? (clients.find(c => c.id === task.clientId)?.birthdayPersonName || clients.find(c => c.id === task.clientId)?.name) : null);
                    const resolvedDebutanteName = task.debutanteName || (task.debutanteId ? debutantes.find(d => d.id === task.debutanteId)?.name : null);
                    const leadOrTargetName = resolvedLeadName || resolvedClientName || resolvedDebutanteName || (task.customProperties?.company ? `${task.title}, ${task.customProperties.company}` : null);
                    
                    // Specific calculations for Visitas & Degustações
                    const visitData = isVisitsContext ? getVisitNotificationData(task) : null;

                    // Resolve Responsável and SDR for avatar display
                    const assignedCollab = collaborators.find(c => (task.assignedToIds || []).includes(c.id));
                    const assignedName = assignedCollab?.name || task.createdByName || 'Responsável';
                    const assignedAvatar = assignedCollab?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedName)}&background=3B82F6&color=FFFFFF`;

                    const sdrCollab = collaborators.find(c => c.id === task.customProperties?.sdrAssigneeId);
                    const sdrName = sdrCollab?.name || task.customProperties?.sdrName || 'SDR';
                    const sdrAvatar = sdrCollab?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(sdrName)}&background=D97706&color=FFFFFF`;

                    // Dynamic row background based on presence in Visitas & Degustações
                    let rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
                    let rowHoverBg = '#F0F9FF';

                    if (isVisitsContext && visitData) {
                      if (visitData.positiveCount === 2) {
                        rowBg = '#F0FDF4'; // pastel green
                        rowHoverBg = '#DCFCE7';
                      } else if (visitData.positiveCount === 1) {
                        rowBg = '#F0F9FF'; // pastel blue
                        rowHoverBg = '#E0F2FE';
                      } else {
                        rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
                        rowHoverBg = '#F1F5F9';
                      }
                    }

                    if (isCompleted) {
                      rowBg = '#F8FAFC';
                    }

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: rowBg,
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                          opacity: isCompleted ? 0.75 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = rowHoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = rowBg;
                        }}
                      >
                        {/* Checkbox Column */}
                        <td 
                          style={{ padding: '12px 14px', textAlign: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(task.id);
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isCompleted ? '#059669' : '#CBD5E1',
                            }}
                            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                          >
                            {isCompleted ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>

                        {/* Prazo / Horário */}
                        <td style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: isOverdue ? '#EF4444' : isCompleted ? '#94A3B8' : '#0F172A',
                          whiteSpace: 'nowrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isOverdue && (
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                            )}
                            <span>{task.dueTime ? `${task.dueTime}${task.endTime ? ` - ${task.endTime}` : ''}` : formatDeadline(task)}</span>
                          </div>
                        </td>

                        {/* Usuário Responsável / SDR (Avatars in Visitas Context) */}
                        {isVisitsContext ? (
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Responsável pelo Atendimento */}
                              <div 
                                title={`Responsável: ${assignedName}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <img
                                  src={assignedAvatar}
                                  alt={assignedName}
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1.5px solid #3B82F6',
                                  }}
                                />
                                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {assignedName.split(' ')[0]}
                                </span>
                              </div>

                              {/* SDR Notificador */}
                              {task.customProperties?.sdrAssigneeId && (
                                <div 
                                  title={`SDR Notificador: ${sdrName}`}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <img
                                    src={sdrAvatar}
                                    alt={sdrName}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '1.5px solid #D97706',
                                    }}
                                  />
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D97706', background: 'rgba(217, 119, 6, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                    SDR
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        ) : (
                          <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                            {assignedName}
                          </td>
                        )}

                        {/* Objeto / Tarefa / Família */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem', lineHeight: 1.3, textDecoration: isCompleted ? 'line-through' : 'none' }}>
                            {task.title}
                          </div>
                          {leadOrTargetName && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                              {leadOrTargetName}
                            </div>
                          )}
                        </td>

                        {/* Tipo de Tarefa */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: theme.badgeBg,
                            border: `1px solid ${theme.badgeBorder}`,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: theme.badgeText,
                            whiteSpace: 'nowrap',
                          }}>
                            {renderTaskTypeIcon(theme.category, 12, theme.primaryColor)}
                            <span>{theme.label}</span>
                          </span>
                        </td>

                        {/* VISITAS & DEGUSTAÇÕES SPECIFIC COLUMNS */}
                        {isVisitsContext && visitData && (
                          <>
                            {/* Confirmação 1 */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                background: visitData.eval1.status === 'positive' ? '#ECFDF5' : visitData.eval1.status === 'negative' ? '#FEF2F2' : '#FFFBEB',
                                color: visitData.eval1.status === 'positive' ? '#047857' : visitData.eval1.status === 'negative' ? '#B91C1C' : '#B45309',
                                border: `1px solid ${visitData.eval1.status === 'positive' ? '#A7F3D0' : visitData.eval1.status === 'negative' ? '#FECACA' : '#FDE68A'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.eval1.status === 'positive' && <CheckCircle2 size={12} />}
                                {visitData.eval1.status === 'negative' && <XCircle size={12} />}
                                {visitData.eval1.status === 'pending' && <Clock size={12} />}
                                <span>{visitData.eval1.label}</span>
                              </span>
                            </td>

                            {/* Confirmação 2 */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                background: visitData.eval2.status === 'positive' ? '#ECFDF5' : visitData.eval2.status === 'negative' ? '#FEF2F2' : '#FFFBEB',
                                color: visitData.eval2.status === 'positive' ? '#047857' : visitData.eval2.status === 'negative' ? '#B91C1C' : '#B45309',
                                border: `1px solid ${visitData.eval2.status === 'positive' ? '#A7F3D0' : visitData.eval2.status === 'negative' ? '#FECACA' : '#FDE68A'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.eval2.status === 'positive' && <CheckCircle2 size={12} />}
                                {visitData.eval2.status === 'negative' && <XCircle size={12} />}
                                {visitData.eval2.status === 'pending' && <Clock size={12} />}
                                <span>{visitData.eval2.label}</span>
                              </span>
                            </td>

                            {/* Confirmação de Presença */}
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 9px',
                                borderRadius: '7px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: visitData.presenceStatus.bg,
                                color: visitData.presenceStatus.text,
                                border: `1px solid ${visitData.presenceStatus.border}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {visitData.presenceStatus.icon}
                                <span>{visitData.presenceStatus.label}</span>
                              </span>
                            </td>
                          </>
                        )}

                        {/* Resultado / Resolução (apenas para outros contextos) */}
                        {!isVisitsContext && (
                          <td style={{
                            padding: '12px 16px',
                            color: task.resolution ? '#0F172A' : '#94A3B8',
                            fontStyle: task.resolution ? 'normal' : 'italic',
                            maxWidth: '280px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {task.resolution || 'Sem resolução registrada'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
