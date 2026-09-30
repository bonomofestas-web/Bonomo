import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckSquare, Calendar, Clock, Plus, Check, 
  Phone, Users, Utensils, MessageSquare, Briefcase, 
  ChevronLeft, ChevronRight, ExternalLink, ArrowRight,
  Target, MapPin, User, Flag, Paperclip, AlertTriangle
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import type { AdminTask } from '../../types/admin';
import type { Appointment } from '../../types';
import { getTaskPriorityConfig } from '../../utils/taskColors';

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
    leads = [],
    clients = [],
    activeVenueId,
    addTask,
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

  // Task Modal state (Notion-style detail & create)
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<AdminTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);

  // Filters for Left Column (Tasks)
  const [taskTab, setTaskTab] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my');

  // Selected Date for Right Column (Daily Calendar Time Grid)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Formatted calendar date for daily agenda header
  const formattedCalendarDate = useMemo(() => {
    if (!selectedCalendarDate) return '';
    const [y, m, d] = selectedCalendarDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = dateObj.toLocaleDateString('pt-BR', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [selectedCalendarDate]);

  // Hours list for Day Time Grid (07:00 to 23:59 for night events)
  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '23:59'
  ];

  // Ref to center auto-scroll on current hour in timeline
  const currentHourRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedCalendarDate === todayStr && currentHourRef.current) {
      currentHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedCalendarDate, todayStr]);

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
        // Tarefas de Hoje: exibe tarefas de hoje + tarefas atrasadas
        return task.status !== 'completed' && (!task.dueDate || task.dueDate <= todayStr);
      }
      if (taskTab === 'upcoming') {
        // Próximas: exibe todas as tarefas pendentes
        return task.status !== 'completed';
      }
      if (taskTab === 'completed') {
        return task.status === 'completed';
      }

      return true;
    }).sort((a, b) => {
      // Sort: unfinished first, then overdue tasks, then by due date & time
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      const isOverdueA = !a.status || a.status !== 'completed' ? (!!a.dueDate && a.dueDate < todayStr) : false;
      const isOverdueB = !b.status || b.status !== 'completed' ? (!!b.dueDate && b.dueDate < todayStr) : false;
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      const timeA = a.dueDate ? new Date(`${a.dueDate}T${a.dueTime || '00:00'}`).getTime() : 0;
      const timeB = b.dueDate ? new Date(`${b.dueDate}T${b.dueTime || '00:00'}`).getTime() : 0;
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
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
      today: userTasks.filter(t => t.status !== 'completed' && (!t.dueDate || t.dueDate <= todayStr)).length,
      upcoming: userTasks.filter(t => t.status !== 'completed').length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      all: userTasks.length,
    };
  }, [scopedTasks, scopeFilter, currentUser, todayStr]);

  // Tasks due today count
  const todayTasksCount = useMemo(() => {
    return scopedTasks.filter(t => (!t.dueDate || t.dueDate <= todayStr) && t.status !== 'completed').length;
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

  // Tasks scheduled for the selected calendar date (Audio 2: automatically appear on agenda)
  const dayTasks = useMemo(() => {
    return scopedTasks.filter(t => t.dueDate === selectedCalendarDate);
  }, [scopedTasks, selectedCalendarDate]);

  // Navigate calendar date
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedCalendarDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedCalendarDate(d.toISOString().split('T')[0]);
  };

  const handleOpenNewTask = () => {
    const newId = crypto.randomUUID();
    const newTask: AdminTask = {
      id: newId,
      databaseId: 'default_collabs',
      title: 'Nova Tarefa',
      description: '',
      content: '',
      dueDate: '',
      dueTime: '',
      status: 'todo',
      customStatusId: 'st_todo',
      priority: 'none',
      type: 'general',
      createdById: currentUser?.id || 'system',
      createdByName: currentUser?.name || 'Sistema',
      assignedToIds: currentUser?.id ? [currentUser.id] : [],
      customProperties: {},
      createdAt: new Date().toISOString(),
    };

    addTask(newTask);
    setSelectedTaskForDetail(newTask);
    setIsTaskDetailModalOpen(true);
  };

  const getTaskTypeConfig = (task: AdminTask) => {
    const custom = (task.customType || task.customProperties?.customType || '').toLowerCase();
    const type = ((task.type || '') as string).toLowerCase();
    const title = (task.title || '').toLowerCase();
    const combined = `${custom} ${type} ${title}`;

    if (combined.includes('whatsapp')) {
      return {
        label: task.customType || 'Follow-up WhatsApp',
        icon: <MessageSquare size={12} color="#0284C7" />,
        color: '#0284C7',
        bg: 'rgba(2, 132, 199, 0.12)',
        border: 'rgba(2, 132, 199, 0.3)',
      };
    }
    if (combined.includes('liga') || combined.includes('call')) {
      return {
        label: task.customType || 'Follow-up Ligação',
        icon: <Phone size={12} color="#6366F1" />,
        color: '#6366F1',
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(99, 102, 241, 0.3)',
      };
    }
    if (combined.includes('degusta')) {
      return {
        label: task.customType || 'Degustação',
        icon: <Utensils size={12} color="#F59E0B" />,
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    }
    if (combined.includes('visita')) {
      return {
        label: task.customType || 'Visita',
        icon: <MapPin size={12} color="#EC4899" />,
        color: '#EC4899',
        bg: 'rgba(236, 72, 153, 0.12)',
        border: 'rgba(236, 72, 153, 0.3)',
      };
    }
    if (combined.includes('reuni') || combined.includes('meeting')) {
      return {
        label: task.customType || 'Reunião',
        icon: <Users size={12} color="#10B981" />,
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    }
    if (combined.includes('compromisso') || combined.includes('commitment')) {
      return {
        label: task.customType || 'Compromisso',
        icon: <Calendar size={12} color="#8B5CF6" />,
        color: '#8B5CF6',
        bg: 'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.3)',
      };
    }
    if (combined.includes('follow') || task.isFollowUp) {
      return {
        label: task.customType || 'Follow-up',
        icon: <Target size={12} color="#0284C7" />,
        color: '#0284C7',
        bg: 'rgba(2, 132, 199, 0.12)',
        border: 'rgba(2, 132, 199, 0.3)',
      };
    }
    return {
      label: task.customType || 'Geral',
      icon: <Briefcase size={12} color="#94A3B8" />,
      color: '#94A3B8',
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.25)',
    };
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
        gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 0.95fr)',
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
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
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
              { id: 'upcoming', label: 'Próximas', count: tabCounts.upcoming, color: 'var(--adm-accent)' },
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
                  color: taskTab === tab.id ? '#FFFFFF' : 'var(--adm-text-muted)',
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

          {/* Task Table View Grouped by Status */}
          <div style={{ flex: 1, maxHeight: '560px', overflowY: 'auto', borderRadius: '10px', border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)' }}>
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
                  background: 'var(--adm-bg-card)',
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{
                    background: 'var(--adm-bg-card)',
                    borderBottom: '1px solid var(--adm-border)',
                    textAlign: 'left',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    <th style={{ width: '36px', padding: '10px 8px', textAlign: 'center' }}></th>
                    <th style={{ padding: '10px 12px' }}>Nome da Tarefa</th>
                    <th style={{ padding: '10px 10px' }}>Tipo</th>
                    <th style={{ padding: '10px 10px' }}>Vinculado</th>
                    <th style={{ padding: '10px 12px' }}>Prazo / Horário</th>
                    <th style={{ width: '42px', padding: '10px 8px', textAlign: 'center' }}>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'overdue', label: 'Atrasadas', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', icon: <AlertTriangle size={13} color="#EF4444" /> },
                    { id: 'todo', label: 'Não Iniciadas', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.10)', border: 'rgba(2, 132, 199, 0.25)', icon: <CheckSquare size={13} color="#0284C7" /> },
                    { id: 'in_progress', label: 'Em Execução', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)', icon: <Clock size={13} color="#F59E0B" /> },
                    { id: 'completed', label: 'Concluídas', color: '#10B981', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.25)', icon: <Check size={13} color="#10B981" /> },
                  ].map(group => {
                    const groupTasks = filteredTasks.filter(t => {
                      const isDone = t.status === 'completed';
                      const isOverdue = !isDone && Boolean(t.dueDate && t.dueDate < todayStr);

                      if (group.id === 'overdue') return isOverdue;
                      if (group.id === 'completed') return isDone;
                      if (group.id === 'in_progress') return !isDone && !isOverdue && t.status === 'in_progress';
                      return !isDone && !isOverdue && t.status !== 'in_progress';
                    });

                    if (groupTasks.length === 0) return null;

                    return (
                      <React.Fragment key={group.id}>
                        <tr style={{ background: group.bg, borderTop: `1px solid ${group.border}`, borderBottom: `1px solid ${group.border}` }}>
                          <td colSpan={6} style={{ padding: '6px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {group.icon}
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {group.label}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '1px 7px', borderRadius: '10px', background: 'var(--adm-bg-card)', color: group.color, border: `1px solid ${group.border}` }}>
                                {groupTasks.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {groupTasks.map((task, idx) => {
                          const isDone = task.status === 'completed';
                          const isOverdue = !isDone && Boolean(task.dueDate && task.dueDate < todayStr);
                          const isDueToday = !isDone && task.dueDate === todayStr;

                          // Resolve linked entity names
                          const resolvedLead = task.leadId ? leads.find(l => l.id === task.leadId) : null;
                          const resolvedLeadName = task.leadName || resolvedLead?.name;
                          const resolvedClient = task.clientId ? clients.find(c => c.id === task.clientId) : null;
                          const resolvedClientName = task.clientName || resolvedClient?.birthdayPersonName || resolvedClient?.name;
                          const resolvedDebutante = task.debutanteId ? debutantes.find(d => d.id === task.debutanteId) : null;
                          const resolvedDebutanteName = task.debutanteName || resolvedDebutante?.name;
                          const resolvedName = resolvedLeadName || resolvedClientName || resolvedDebutanteName;

                          const typeConfig = getTaskTypeConfig(task);
                          const priorityConfig = getTaskPriorityConfig(task.priority);

                          const hasNotes = Boolean(task.observations || task.content || task.description || task.customProperties?.observations);
                          const hasAttachments = Boolean(
                            (task.customProperties?.attachments && task.customProperties.attachments.length > 0) ||
                            (task.customProperties?.files && task.customProperties.files.length > 0)
                          );

                          const dateFormatted = task.dueDate ? (task.dueDate === todayStr ? 'Hoje' : (task.dueDate === tomorrowStr ? 'Amanhã' : task.dueDate.split('-').reverse().join('/'))) : 'Sem data';

                          return (
                            <tr
                              key={task.id}
                              onClick={() => {
                                setSelectedTaskForDetail(task);
                                setIsTaskDetailModalOpen(true);
                              }}
                              style={{
                                borderBottom: '1px solid var(--adm-border)',
                                background: isDone ? 'rgba(255, 255, 255, 0.01)' : idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                opacity: isDone ? 0.65 : 1,
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-card)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDone ? 'rgba(255, 255, 255, 0.01)' : idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'}
                            >
                              {/* Checkbox Column */}
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskStatus(task.id);
                                  }}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '5px',
                                    background: isDone ? 'var(--adm-green)' : 'transparent',
                                    border: `1.5px solid ${isDone ? 'var(--adm-green)' : 'var(--adm-border)'}`,
                                    color: '#000',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={isDone ? 'Mover para pendentes' : 'Marcar como concluída'}
                                >
                                  {isDone && <Check size={11} strokeWidth={3} />}
                                </button>
                              </td>

                              {/* Task Title (White, Single Line Ellipsis + ClickUp icons) */}
                              <td style={{ padding: '8px 12px', maxWidth: '320px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <span style={{
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                    fontSize: '0.80rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flexShrink: 1,
                                  }}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>

                                  {/* Ícones de anotações e anexos estilo ClickUp */}
                                  {hasNotes && (
                                    <span title="Possui anotações / observações" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--adm-text-muted)', flexShrink: 0 }}>
                                      <MessageSquare size={12} />
                                    </span>
                                  )}

                                  {hasAttachments && (
                                    <span title="Possui anexos" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--adm-text-muted)', flexShrink: 0 }}>
                                      <Paperclip size={12} />
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Task Type Badge */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: typeConfig.bg,
                                  border: `1px solid ${typeConfig.border}`,
                                  color: typeConfig.color,
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                }}>
                                  {typeConfig.icon}
                                  <span>{typeConfig.label}</span>
                                </span>
                              </td>

                              {/* Linked Lead / Client */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                {resolvedName ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (task.leadId) onOpenLead(task.leadId);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(96, 165, 250, 0.10)',
                                      border: '1px solid rgba(96, 165, 250, 0.3)',
                                      color: '#60A5FA',
                                      borderRadius: '6px',
                                      padding: '2px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: task.leadId ? 'pointer' : 'default',
                                      maxWidth: '100%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    <User size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {resolvedName}
                                    </span>
                                  </button>
                                ) : (
                                  <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.70rem' }}>—</span>
                                )}
                              </td>

                              {/* Due Date & Time */}
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: isOverdue ? '#EF4444' : isDueToday ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                                  fontSize: '0.74rem',
                                  fontWeight: isOverdue || isDueToday ? 700 : 500,
                                }}>
                                  {isOverdue && <AlertTriangle size={12} color="#EF4444" />}
                                  {dateFormatted}
                                  {task.dueTime ? ` às ${task.dueTime}` : ''}
                                </span>
                              </td>

                              {/* Priority Flag (ClickUp Style) */}
                              <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                <div
                                  title={`Prioridade: ${priorityConfig.label}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Flag size={14} fill={priorityConfig.color} color={priorityConfig.color} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
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
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
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

          {/* Date Indicator Bar (Clean Agenda Header - não parece card de tarefa) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px 8px 2px',
            borderBottom: '1px solid var(--adm-border)',
            fontSize: '0.78rem',
          }}>
            <div style={{ fontWeight: 800, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color="var(--adm-accent, #0284C7)" />
              <span>{formattedCalendarDate || selectedCalendarDate.split('-').reverse().join('/')}</span>
            </div>
            <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
              {dayAppointments.length} compromisso{dayAppointments.length !== 1 ? 's' : ''} • {dayTasks.length} afazer{dayTasks.length !== 1 ? 'es' : ''}
            </div>
          </div>

          {/* All-Day Tasks / Dia Inteiro com Nome do Lead ao Lado e cores temáticas */}
          {dayTasks.filter(t => !t.dueTime || !t.dueTime.trim()).length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--adm-bg-input)',
              border: '1px solid var(--adm-border)',
              borderRadius: '10px',
              padding: '8px 10px',
            }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Dia Inteiro ({dayTasks.filter(t => !t.dueTime || !t.dueTime.trim()).length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayTasks.filter(t => !t.dueTime || !t.dueTime.trim()).map(task => {
                  const typeConf = getTaskTypeConfig(task);
                  const linkedLead = task.leadId ? leads.find(l => l.id === task.leadId) : null;
                  const leadName = task.leadName || linkedLead?.name;

                  return (
                    <div
                      key={`allday_${task.id}`}
                      onClick={() => {
                        setSelectedTaskForDetail(task);
                        setIsTaskDetailModalOpen(true);
                      }}
                      style={{
                        background: typeConf.bg,
                        border: `1px solid ${typeConf.border}`,
                        borderRadius: '6px',
                        padding: '5px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        {typeConf.icon}
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </span>
                        {leadName && (
                          <span style={{ fontSize: '0.72rem', color: typeConf.color, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            • {leadName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Calendar Style Time Grid (07:00 to 23:59) */}
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

              const totalItems = matchedApps.length + matchedTasks.length;
              const hasItems = totalItems > 0;
              const slotHour = parseInt(hourPrefix, 10);
              const isCurrentHourSlot = selectedCalendarDate === todayStr && currentTime.getHours() === slotHour;
              const currentMinute = currentTime.getMinutes();

              return (
                <div
                  key={hour}
                  ref={isCurrentHourSlot ? currentHourRef : undefined}
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
                  {/* Live Moving Current Time Indicator Line (Clean Executive) */}
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
                      {/* Live Badge */}
                      <div style={{
                        background: 'var(--adm-accent)',
                        color: '#FFFFFF',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '6px',
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
                        }} />
                        <span>{String(slotHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}</span>
                      </div>

                      {/* Horizontal Moving Line across the timeline */}
                      <div style={{
                        flex: 1,
                        height: '1.5px',
                        background: 'var(--adm-accent)',
                        opacity: 0.6,
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

                  {/* Slot Events Container - Se houver múltiplas tarefas no mesmo horário, distribuídas horizontalmente lado a lado */}
                  <div style={{
                    flex: 1,
                    display: totalItems > 1 ? 'grid' : 'flex',
                    gridTemplateColumns: totalItems > 1 ? `repeat(${totalItems}, minmax(0, 1fr))` : undefined,
                    flexDirection: totalItems <= 1 ? 'column' : undefined,
                    gap: '6px',
                    minWidth: 0,
                  }}>
                    {/* Render Debutante Appointments (Degustações, Reuniões) */}
                    {matchedApps.map((app, idx) => (
                      <div
                        key={`app_${idx}`}
                        style={{
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                          border: '1px solid var(--adm-accent)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          minWidth: 0,
                          animation: 'fadeIn 0.15s ease-out',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                            <span style={{
                              background: 'var(--adm-accent)',
                              color: '#000',
                              fontSize: '0.60rem',
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: '4px',
                              flexShrink: 0,
                            }}>
                              {app.time || hour}
                            </span>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.title}
                            </span>
                            {app.debutanteName && (
                              <span style={{ fontSize: '0.70rem', color: 'var(--adm-accent)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                • {app.debutanteName}
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
                            padding: '2px',
                            flexShrink: 0,
                          }}
                          title="Ver na lista de compromissos"
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Render Day Tasks with fixed time (Cores temáticas + Título Branco + Lead ao lado) */}
                    {matchedTasks.map(task => {
                      const typeConf = getTaskTypeConfig(task);
                      const linkedLead = task.leadId ? leads.find(l => l.id === task.leadId) : null;
                      const leadName = task.leadName || linkedLead?.name;

                      return (
                        <div
                          key={`task_${task.id}`}
                          className="admin-timeline-task-card"
                          onClick={() => {
                            setSelectedTaskForDetail(task);
                            setIsTaskDetailModalOpen(true);
                          }}
                          style={{
                            background: typeConf.bg,
                            border: `1px solid ${typeConf.border}`,
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            cursor: 'pointer',
                            minWidth: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                            <span style={{
                              background: typeConf.color,
                              color: '#FFFFFF',
                              fontSize: '0.60rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              flexShrink: 0,
                            }}>
                              {task.dueTime}
                            </span>
                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.title}
                            </span>
                            {leadName && (
                              <span style={{ fontSize: '0.70rem', color: typeConf.color, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                • {leadName}
                              </span>
                            )}
                          </div>

                          {task.leadId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLead(task.leadId!);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: typeConf.color,
                                cursor: 'pointer',
                                padding: '2px',
                                flexShrink: 0,
                              }}
                              title="Abrir Lead no CRM"
                            >
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL: NOTION-STYLE TASK (CREATE & EDIT) ── */}
      <AdminTaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false);
          setSelectedTaskForDetail(null);
        }}
        task={selectedTaskForDetail}
        onOpenLead={onOpenLead}
        isHomeContext={true}
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
        .admin-task-card {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease !important;
          will-change: transform;
        }
        .admin-task-card:hover {
          transform: translateY(-2px);
          border-color: var(--adm-accent) !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }
        .admin-timeline-task-card {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease !important;
        }
        .admin-timeline-task-card:hover {
          transform: translateY(-1px);
          border-color: var(--adm-accent) !important;
        }

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
