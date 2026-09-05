import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, Calendar, Clock, Plus, Check, 
  Edit3, Phone, Users, Utensils, MessageSquare, Briefcase, 
  ChevronLeft, ChevronRight, ExternalLink, ArrowRight,
  Target, Crown, MapPin, User
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminTaskModal } from './AdminTaskModal';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { AdminTask, TaskType } from '../../types/admin';
import type { Appointment } from '../../types';

interface AdminHomeViewProps {
  onOpenLead: (leadId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const AdminHomeView: React.FC<AdminHomeViewProps> = ({
  onOpenLead,
  onNavigateTab,
}) => {
  const { 
    currentUser, 
    debutantes, 
    venues,
    tasks, 
    activeVenueId,
    deleteTask, 
    toggleTaskStatus 
  } = useAdminState();

  // User-scoped venues
  const userAllowedVenueIds = useMemo(() => {
    if (!currentUser || currentUser.role === 'master') return null; // null means all
    return currentUser.venueIds && currentUser.venueIds.length > 0 ? currentUser.venueIds : [];
  }, [currentUser]);

  // Venue-scoped debutantes and tasks
  const scopedDebutantes = useMemo(() => {
    return debutantes.filter(d => {
      if (activeVenueId) return d.venueId === activeVenueId;
      if (userAllowedVenueIds !== null && userAllowedVenueIds.length > 0) {
        return userAllowedVenueIds.includes(d.venueId);
      }
      return true;
    });
  }, [debutantes, activeVenueId, userAllowedVenueIds]);

  const scopedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeVenueId) return !t.venueId || t.venueId === 'all' || t.venueId === activeVenueId;
      if (userAllowedVenueIds !== null && userAllowedVenueIds.length > 0) {
        return !t.venueId || t.venueId === 'all' || userAllowedVenueIds.includes(t.venueId);
      }
      return true;
    });
  }, [tasks, activeVenueId, userAllowedVenueIds]);

  // Live Current Time for Timeline Indicator Line (Relógio dinâmico)
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Update every 15s
    return () => clearInterval(timer);
  }, []);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AdminTask | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);

  // Filters for Left Column (Tasks)
  const [taskTab, setTaskTab] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my');

  // Selected Date for Right Column (Daily Calendar Time Grid)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Hours list for Day Time Grid (07:00 to 22:00)
  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Formatted greeting date
  const formattedToday = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = d.toLocaleDateString('pt-BR', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // Filtered Tasks based on Active Tab and Scope
  const filteredTasks = useMemo(() => {
    return scopedTasks.filter(task => {
      // Scope filter: My tasks vs All team tasks
      if (scopeFilter === 'my' && currentUser?.id) {
        if (!task.assignedToIds?.includes(currentUser.id) && task.createdById !== currentUser.id) {
          return false;
        }
      }

      // Tab filter
      if (taskTab === 'today') {
        return task.status !== 'completed' && task.dueDate === todayStr;
      }
      if (taskTab === 'upcoming') {
        return task.status !== 'completed' && task.dueDate !== todayStr;
      }
      if (taskTab === 'completed') {
        return task.status === 'completed';
      }

      return true;
    }).sort((a, b) => {
      // Sort: unfinished first, then by due date & time
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return new Date(`${a.dueDate}T${a.dueTime || '00:00'}`).getTime() - new Date(`${b.dueDate}T${b.dueTime || '00:00'}`).getTime();
    });
  }, [scopedTasks, scopeFilter, taskTab, currentUser, todayStr]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const userTasks = scopedTasks.filter(task => {
      if (scopeFilter === 'my' && currentUser?.id) {
        return task.assignedToIds?.includes(currentUser.id) || task.createdById === currentUser.id;
      }
      return true;
    });

    return {
      today: userTasks.filter(t => t.status !== 'completed' && t.dueDate === todayStr).length,
      upcoming: userTasks.filter(t => t.status !== 'completed' && t.dueDate !== todayStr).length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      all: userTasks.length,
    };
  }, [scopedTasks, scopeFilter, currentUser, todayStr]);

  // Tasks due today count
  const todayTasksCount = useMemo(() => {
    return scopedTasks.filter(t => t.dueDate === todayStr && t.status !== 'completed').length;
  }, [scopedTasks, todayStr]);

  const completedTodayCount = useMemo(() => {
    return scopedTasks.filter(t => t.status === 'completed' && (t.completedAt || '').startsWith(todayStr)).length;
  }, [scopedTasks, todayStr]);

  // Aggregate All Appointments for the selected calendar date
  const dayAppointments = useMemo(() => {
    const list: (Appointment & { debutanteName: string; venueName: string; debutanteSlug: string })[] = [];
    for (const deb of scopedDebutantes) {
      const venue = venues.find(v => v.id === deb.venueId);
      for (const app of (deb.appointments || [])) {
        if (app.date === selectedCalendarDate) {
          list.push({
            ...app,
            debutanteName: deb.name,
            debutanteSlug: deb.slug,
            venueName: venue?.name || 'Espaço Rio Lounge',
          });
        }
      }
    }
    return list.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [scopedDebutantes, venues, selectedCalendarDate]);

  // Tasks scheduled for the selected calendar date
  const dayTasks = useMemo(() => {
    return scopedTasks.filter(t => t.dueDate === selectedCalendarDate && t.dueTime);
  }, [scopedTasks, selectedCalendarDate]);

  // Navigate calendar date
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedCalendarDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedCalendarDate(d.toISOString().split('T')[0]);
  };

  const handleOpenNewTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: AdminTask) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const renderTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'call': return <Phone size={13} color="#60A5FA" />;
      case 'meeting': return <Users size={13} color="#A78BFA" />;
      case 'tasting': return <Utensils size={13} color="#F59E0B" />;
      case 'followup': return <MessageSquare size={13} color="#10B981" />;
      default: return <Briefcase size={13} color="var(--adm-accent)" />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── TOP HERO BANNER & GREETING (Soft & Clean Executive Layout) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '4px 0 12px 0',
      }}>
        {/* Left: Personalized Greeting */}
        <div className="admin-home-greeting" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {currentUser?.avatarUrl ? (
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name}
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--adm-border)',
              }}
            />
          ) : (
            <div style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '1rem',
              border: '1.5px solid var(--adm-border)',
            }}>
              {(currentUser?.name || 'A').slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--adm-text-title)',
                letterSpacing: '-0.2px',
                margin: 0,
              }}>
                Olá, {currentUser?.name || 'Colaborador'}!
              </h1>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', margin: 0 }}>
              {formattedToday} • Painel de tarefas e agenda
            </p>
          </div>
        </div>

        {/* Right: Quick Stats & New Task Button */}
        <div className="admin-home-stats-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '8px',
            height: '38px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
              Pendentes:
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: todayTasksCount > 0 ? '#D97706' : 'var(--adm-text-title)' }}>
              {todayTasksCount}
            </span>
          </div>

          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '8px',
            height: '38px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
              Concluídas:
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--adm-green)' }}>
              {completedTodayCount}
            </span>
          </div>

          <button
            onClick={handleOpenNewTask}
            type="button"
            className="admin-home-desktop-new-task"
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxSizing: 'border-box',
              background: 'var(--adm-accent)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus size={15} />
            <span>Criar Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN WORKSPACE: TASKS (LEFT) & DAY AGENDA (RIGHT) ── */}
      <div className="admin-home-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        
        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 1: TASK MANAGER & TO-DO LIST (LEFT)
        ══════════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          {/* Column Header & Scope Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'var(--adm-accent-bg)',
                color: 'var(--adm-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckSquare size={16} />
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Minhas Tarefas & Afazeres
              </h2>

              <button
                type="button"
                onClick={handleOpenNewTask}
                title="Criar Nova Tarefa"
                style={{
                  background: 'var(--adm-accent-bg)',
                  border: '1px solid var(--adm-accent)',
                  color: 'var(--adm-accent)',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Scope Pill Toggle */}
            <div style={{
              background: 'var(--adm-bg-input)',
              borderRadius: '10px',
              padding: '3px',
              display: 'flex',
              gap: '3px',
            }}>
              <button
                type="button"
                onClick={() => setScopeFilter('my')}
                style={{
                  background: scopeFilter === 'my' ? 'var(--adm-accent-bg)' : 'transparent',
                  border: 'none',
                  color: scopeFilter === 'my' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Minhas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                style={{
                  background: scopeFilter === 'all' ? 'var(--adm-accent-bg)' : 'transparent',
                  border: 'none',
                  color: scopeFilter === 'all' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Toda a Equipe
              </button>
            </div>
          </div>

          {/* Section Tabs: Hoje, Próximas, Finalizadas, Todas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid var(--adm-border)',
            paddingBottom: '10px',
            overflowX: 'auto',
          }}>
            {[
              { id: 'today', label: 'Tarefas de Hoje', count: tabCounts.today, color: '#F59E0B' },
              { id: 'upcoming', label: 'Próximas & Gerais', count: tabCounts.upcoming, color: 'var(--adm-accent)' },
              { id: 'completed', label: 'Finalizadas', count: tabCounts.completed, color: '#10B981' },
              { id: 'all', label: 'Todas', count: tabCounts.all, color: 'var(--adm-text-muted)' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTaskTab(tab.id as any)}
                style={{
                  background: taskTab === tab.id ? 'var(--adm-accent-bg)' : 'transparent',
                  border: `1px solid ${taskTab === tab.id ? 'var(--adm-accent)' : 'transparent'}`,
                  color: taskTab === tab.id ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: taskTab === tab.id ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: taskTab === tab.id ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                  color: taskTab === tab.id ? '#000' : 'var(--adm-text-muted)',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Task Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredTasks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--adm-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--adm-bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--adm-accent)',
                }}>
                  <CheckSquare size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--adm-text-title)' }}>
                    {taskTab === 'today' ? 'Nenhuma tarefa pendente para hoje!' : taskTab === 'completed' ? 'Nenhuma tarefa finalizada ainda.' : 'Nenhuma tarefa encontrada.'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                    {taskTab === 'today' ? 'Você está com a agenda em dia!' : 'Crie tarefas para organizar suas metas.'}
                  </div>
                </div>
                {taskTab !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleOpenNewTask}
                    className="adm-btn-primary"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    <Plus size={14} />
                    <span>Adicionar Tarefa</span>
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map(task => {
                const isDone = task.status === 'completed';
                const isOverdue = !isDone && task.dueDate < todayStr;
                const isDueToday = !isDone && task.dueDate === todayStr;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskForDetail(task)}
                    style={{
                      background: isDone ? 'rgba(255, 255, 255, 0.02)' : 'var(--adm-bg-input)',
                      border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : isDueToday ? 'rgba(245, 158, 11, 0.4)' : 'var(--adm-border)'}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                      opacity: isDone ? 0.65 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--adm-accent)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isOverdue ? 'rgba(239, 68, 68, 0.4)' : isDueToday ? 'rgba(245, 158, 11, 0.4)' : 'var(--adm-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Toggle Status Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '6px',
                        background: isDone ? 'var(--adm-green)' : 'transparent',
                        border: `2px solid ${isDone ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginTop: '2px',
                        transition: 'all 0.15s ease',
                      }}
                      title={isDone ? 'Mover para pendentes' : 'Marcar como concluída'}
                    >
                      {isDone && <Check size={12} strokeWidth={3} />}
                    </button>

                    {/* Task Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {/* Type Icon */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'var(--adm-bg-card)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                        }}>
                          {renderTypeIcon(task.type)}
                        </div>

                        {/* Title */}
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--adm-text-title)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          wordBreak: 'break-word',
                        }}>
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : task.priority === 'medium' ? 'var(--adm-accent-bg)' : 'rgba(255, 255, 255, 0.05)',
                          color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                          border: `1px solid ${task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? 'var(--adm-accent)' : 'transparent'}`,
                        }}>
                          {task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                        </span>
                      </div>

                      {/* Description if any */}
                      {task.description && (
                        <p style={{ fontSize: '0.73rem', color: 'var(--adm-text-muted)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                          {task.description}
                        </p>
                      )}

                      {/* Meta: CRM Lead Link, Debutante Link, Due Date & Assignees */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                        
                        {/* CRM Lead Direct Link */}
                        {task.leadId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLead(task.leadId!);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(96, 165, 250, 0.12)',
                              border: '1px solid rgba(96, 165, 250, 0.35)',
                              color: '#60A5FA',
                              borderRadius: '7px',
                              padding: '3px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.22)';
                              e.currentTarget.style.borderColor = '#60A5FA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.12)';
                              e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.35)';
                            }}
                            title="Abrir detalhes deste Lead no CRM"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Target size={11} /> Lead: {task.leadName || 'Ver Lead'}
                            </span>
                            <ExternalLink size={11} />
                          </button>
                        )}

                        {/* Due Date & Time */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.12)' : isDueToday ? 'rgba(245, 158, 11, 0.12)' : 'var(--adm-bg-input)',
                          border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : isDueToday ? 'rgba(245, 158, 11, 0.3)' : 'var(--adm-border)'}`,
                          borderRadius: '7px',
                          padding: '3px 8px',
                          color: isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : 'var(--adm-text-muted)',
                          fontSize: '0.68rem',
                          fontWeight: isOverdue || isDueToday ? 700 : 600,
                        }}>
                          <Clock size={11} />
                          {task.dueDate === todayStr ? 'Hoje' : task.dueDate}
                          {task.dueTime ? ` às ${task.dueTime}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Action: Open Task Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                        style={{
                          background: 'var(--adm-bg-input)',
                          border: '1px solid var(--adm-border)',
                          color: 'var(--adm-text-muted)',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--adm-accent)';
                          e.currentTarget.style.borderColor = 'var(--adm-accent)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--adm-text-muted)';
                          e.currentTarget.style.borderColor = 'var(--adm-border)';
                        }}
                        title="Ver e Editar Tarefa"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 2: DAILY CALENDAR TIME GRID (RIGHT) — GOOGLE AGENDA STYLE
        ══════════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        }}>
          {/* Calendar Header & Date Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Calendar size={16} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                  Agenda do Dia
                </h2>
                <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
                  Degustações, Reuniões e Compromissos
                </div>
              </div>
            </div>

            {/* Date Navigator (< Ontem | Hoje | Amanhã >) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                }}
                title="Dia Anterior"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedCalendarDate(todayStr)}
                style={{
                  background: selectedCalendarDate === todayStr ? 'var(--adm-accent-bg)' : 'var(--adm-bg-input)',
                  border: `1px solid ${selectedCalendarDate === todayStr ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  color: selectedCalendarDate === todayStr ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                }}
                title="Próximo Dia"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Date Indicator Bar */}
          <div style={{
            background: 'var(--adm-bg-input)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
          }}>
            <div style={{ fontWeight: 650, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} color="var(--adm-accent)" />
              <span>{selectedCalendarDate.split('-').reverse().join('/')}</span>
            </div>
            <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.72rem' }}>
              {dayAppointments.length} compromissos • {dayTasks.length} afazeres
            </div>
          </div>

          {/* Google Calendar Style Time Grid (08:00 to 20:00) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '520px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}>
            {timeSlots.map(hour => {
              // Find appointments starting near this hour
              const hourPrefix = hour.split(':')[0];
              const matchedApps = dayAppointments.filter(a => (a.time || '').startsWith(hourPrefix));
              const matchedTasks = dayTasks.filter(t => (t.dueTime || '').startsWith(hourPrefix));

              const hasItems = matchedApps.length > 0 || matchedTasks.length > 0;
              const slotHour = parseInt(hourPrefix, 10);
              const isCurrentHourSlot = selectedCalendarDate === todayStr && currentTime.getHours() === slotHour;
              const currentMinute = currentTime.getMinutes();

              return (
                <div
                  key={hour}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    minHeight: hasItems ? 'auto' : '38px',
                    borderTop: '1px dashed var(--adm-border)',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                  }}
                >
                  {/* Live Moving Current Time Indicator Line (Linha de Horário em Tempo Real) */}
                  {isCurrentHourSlot && (
                    <div style={{
                      position: 'absolute',
                      top: `${Math.min(90, Math.max(10, (currentMinute / 60) * 100))}%`,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      zIndex: 20,
                      pointerEvents: 'none',
                    }}>
                      {/* Live Badge with Indicator Dot */}
                      <div style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 10px rgba(79, 70, 229, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0,
                        marginLeft: '32px',
                      }}>
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          display: 'inline-block',
                          boxShadow: '0 0 6px #FFFFFF',
                        }} />
                        <span>{String(slotHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}</span>
                      </div>

                      {/* Horizontal Moving Line across the timeline */}
                      <div style={{
                        flex: 1,
                        height: '2px',
                        background: 'linear-gradient(90deg, var(--adm-accent) 0%, rgba(79, 70, 229, 0.45) 70%, transparent 100%)',
                      }} />
                    </div>
                  )}

                  {/* Hour Label */}
                  <div style={{
                    width: '42px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isCurrentHourSlot ? 'var(--adm-accent)' : 'var(--adm-text-muted)',
                    flexShrink: 0,
                    paddingTop: '2px',
                    transition: 'color 0.15s ease',
                  }}>
                    {hour}
                  </div>

                  {/* Slot Events Container */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Render Debutante Appointments (Degustações, Reuniões) */}
                    {matchedApps.map((app, idx) => (
                      <div
                        key={`app_${idx}`}
                        style={{
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                          border: '1px solid var(--adm-accent)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          animation: 'fadeIn 0.15s ease-out',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{
                              background: 'var(--adm-accent)',
                              color: '#000',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}>
                              {app.time || hour}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Crown size={11} color="var(--adm-accent)" />
                              <strong>{app.debutanteName}</strong>
                            </span>
                            {(app.location || app.venueName) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                • <MapPin size={11} /> {app.location || app.venueName}
                              </span>
                            )}
                            {app.responsibleName && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                • <User size={11} /> {app.responsibleName}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigateTab('appointments')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--adm-accent)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Ver na lista de compromissos"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Render Day Tasks with fixed time */}
                    {matchedTasks.map(task => (
                      <div
                        key={`task_${task.id}`}
                        style={{
                          background: 'rgba(96, 165, 250, 0.12)',
                          border: '1px solid rgba(96, 165, 250, 0.4)',
                          borderRadius: '10px',
                          padding: '7px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{
                            background: '#60A5FA',
                            color: '#000',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}>
                            {task.dueTime}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </span>
                        </div>

                        {task.leadId && (
                          <button
                            type="button"
                            onClick={() => onOpenLead(task.leadId!)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#60A5FA',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Abrir Lead no CRM"
                          >
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL: CREATE / EDIT TASK ── */}
      <AdminTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
      />

      {/* ── MODAL: TASK DETAILS & LEAD CRM LINK ── */}
      <AdminTaskDetailModal
        isOpen={!!selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        task={selectedTaskForDetail}
        onEdit={(task) => {
          setSelectedTaskForDetail(null);
          handleEditTask(task);
        }}
        onOpenLead={onOpenLead}
      />

      {/* ── MODAL: CONFIRM TASK DELETION ── */}
      <AdminConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title="Excluir Tarefa"
        itemName={taskToDelete?.title || taskToDelete?.description}
        message={taskToDelete ? `Tem certeza que deseja apagar a tarefa "${taskToDelete.title || taskToDelete.description}"? Esta ação não poderá ser desfeita.` : undefined}
      />

      <style>{`
        @media (max-width: 900px) {
          .admin-home-header {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 16px !important;
            padding: 20px 16px !important;
          }
          .admin-home-greeting {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 10px !important;
          }
          .admin-home-stats-actions {
            justify-content: center !important;
            width: 100% !important;
          }
          .admin-home-desktop-new-task {
            display: none !important;
          }
          .admin-home-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
