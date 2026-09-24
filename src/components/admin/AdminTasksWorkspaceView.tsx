import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Search, Filter, List, Calendar as CalendarIcon, Utensils,
  X, MessageSquare, Users, CheckSquare, Sliders
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { taskService } from '../../services/taskService';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import { AdminTaskCompletionModal } from './AdminTaskCompletionModal';
import { AdminAgendaAvailabilityModal } from './AdminAgendaAvailabilityModal';
import { AdminTasksKanbanView } from './tasks/AdminTasksKanbanView';
import { AdminTasksTableView } from './tasks/AdminTasksTableView';
import { AdminCalendarDayView } from './tasks/AdminCalendarDayView';
import { AdminCalendarWeekView } from './tasks/AdminCalendarWeekView';
import { AdminCalendarMonthView } from './tasks/AdminCalendarMonthView';
import type { AdminTask, TaskDatabase } from '../../types/admin';

export type TaskWorkspaceContext = 'all' | 'followup' | 'visits_tastings' | 'appointments';

interface AdminTasksWorkspaceViewProps {
  onOpenLead: (leadId: string) => void;
  workspaceContext?: TaskWorkspaceContext;
}

export type TaskWorkspaceViewMode = 'kanban' | 'table' | 'day' | 'week' | 'month';

export const AdminTasksWorkspaceView: React.FC<AdminTasksWorkspaceViewProps> = ({ 
  onOpenLead,
  workspaceContext = 'all',
}) => {
  const { 
    currentUser,
    activeVenueId, 
    tasks: contextTasks, 
    collaborators, 
    toggleTaskStatus,
    completeTaskWithFeedback,
    updateTask,
  } = useAdminState();

  // Active View Mode: 'kanban' (||'), 'table' (☰), 'day' (DIA), 'week' (SEMANA), 'month' (MÊS)
  const [viewMode, setViewMode] = useState<TaskWorkspaceViewMode>('kanban');

  // Date Navigation State for Day, Week, Month
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Databases & Selection
  const [databases, setDatabases] = useState<TaskDatabase[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('all');

  // Specific Sub-filter for Visitas & Degustações
  const [visitsSubFilter, setVisitsSubFilter] = useState<'all' | 'visit' | 'tasting'>('all');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<'all' | 'comercial' | 'pos_venda' | 'gerencia' | 'financeiro'>('all');

  const getTaskSector = useCallback((task: AdminTask): 'comercial' | 'pos_venda' | 'gerencia' | 'financeiro' => {
    const directSector = (task as any).sector;
    if (directSector && ['comercial', 'pos_venda', 'gerencia', 'financeiro'].includes(directSector)) {
      return directSector as any;
    }
    if (task.customProperties?.sector && ['comercial', 'pos_venda', 'gerencia', 'financeiro'].includes(task.customProperties.sector)) {
      return task.customProperties.sector as any;
    }
    if (task.databaseId === 'db_followup') return 'comercial';
    if (task.databaseId === 'db_visits_tastings') return 'comercial';
    if (task.databaseId === 'db_appointments' || Boolean(task.debutanteId)) return 'pos_venda';

    const str = `${task.customType || ''} ${task.type || ''} ${task.title || ''}`.toLowerCase();
    if (str.includes('follow') || str.includes('visita') || str.includes('lead') || str.includes('proposta') || str.includes('closer') || str.includes('sdr')) {
      return 'comercial';
    }
    if (str.includes('pos_venda') || str.includes('pós-venda') || str.includes('aniversariante') || str.includes('debutante') || str.includes('sucesso') || str.includes('cliente')) {
      return 'pos_venda';
    }
    if (str.includes('financeiro') || str.includes('pagamento') || str.includes('cobrança') || str.includes('faturamento')) {
      return 'financeiro';
    }
    if (str.includes('gerencia') || str.includes('gerência') || str.includes('meta') || str.includes('alinhamento')) {
      return 'gerencia';
    }

    if (task.assignedToIds && task.assignedToIds.length > 0) {
      const assignedCollab = collaborators.find(c => task.assignedToIds?.includes(c.id));
      if (assignedCollab?.sectors && assignedCollab.sectors.length > 0) {
        const first = assignedCollab.sectors[0];
        if (['comercial', 'pos_venda', 'gerencia', 'financeiro'].includes(first)) return first as any;
      }
      if (assignedCollab?.role) {
        if (['comercial', 'sdr', 'closer', 'crm'].includes(assignedCollab.role)) return 'comercial';
        if (['pos_venda'].includes(assignedCollab.role)) return 'pos_venda';
        if (['financeiro'].includes(assignedCollab.role)) return 'financeiro';
      }
    }

    return 'gerencia';
  }, [collaborators]);

  // Bloco de Notas Inteligente Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskTypeSelectorOpen, setIsTaskTypeSelectorOpen] = useState(false);
  const [modalWorkspaceContext, setModalWorkspaceContext] = useState<TaskWorkspaceContext>(workspaceContext);
  const [modalDatabaseId, setModalDatabaseId] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [prefilledDueDate, setPrefilledDueDate] = useState<string | undefined>(undefined);
  const [prefilledDueTime, setPrefilledDueTime] = useState<string | undefined>(undefined);
  const [prefilledCustomType, setPrefilledCustomType] = useState<string | undefined>(undefined);
  const [completingTask, setCompletingTask] = useState<AdminTask | null>(null);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const handleTableToggleStatus = useCallback((taskId: string) => {
    const task = contextTasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status !== 'completed') {
      setCompletingTask(task);
    } else {
      toggleTaskStatus(taskId);
    }
  }, [contextTasks, toggleTaskStatus]);

  // Refs for outside click
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load databases
  const loadDatabases = useCallback(async () => {
    try {
      const dbs = await taskService.getDatabases(activeVenueId || undefined);
      setDatabases(dbs);
    } catch (err) {
      console.error('Erro ao carregar bancos de tarefas:', err);
    }
  }, [activeVenueId]);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Context titles & labels (Dynamically adapts to Visits / Tastings subfilter)
  const entityLabel = useMemo(() => {
    switch (workspaceContext) {
      case 'followup': return 'Follow-ups';
      case 'visits_tastings':
        if (visitsSubFilter === 'visit') return 'Visitas';
        if (visitsSubFilter === 'tasting') return 'Degustações';
        return 'Visitas & Degustações';
      case 'appointments': return 'Compromissos';
      default: return 'Tarefas';
    }
  }, [workspaceContext, visitsSubFilter]);

  const newButtonText = useMemo(() => {
    switch (workspaceContext) {
      case 'followup': return 'NOVO FOLLOW-UP';
      case 'visits_tastings':
        if (visitsSubFilter === 'visit') return 'NOVA VISITA';
        if (visitsSubFilter === 'tasting') return 'NOVA DEGUSTAÇÃO';
        return 'NOVO AGENDAMENTO';
      case 'appointments': return 'NOVO COMPROMISSO';
      default: return 'NOVA TAREFA';
    }
  }, [workspaceContext, visitsSubFilter]);

  // Base Scoped Tasks for this context: in 'all' (Gerência Tarefas), displays all tasks for current houses
  const baseScopedTasks = useMemo(() => {
    return contextTasks.filter(task => {
      // 0. Context filter
      if (workspaceContext === 'followup') {
        if (task.databaseId === 'db_visits_tastings' || task.databaseId === 'db_appointments') return false;
        const isFollowUp = task.databaseId === 'db_followup' || task.type === 'followup' || task.type === 'call' || (task.customType || '').toLowerCase().includes('follow') || (Boolean(task.leadId) && !task.debutanteId);
        if (!isFollowUp) return false;
      } else if (workspaceContext === 'visits_tastings') {
        // Exclude follow-ups and auto-generated reminders
        if (task.databaseId === 'db_followup' || task.type === 'followup' || task.isFollowUp || task.customProperties?.parentTaskId || task.customProperties?.autoGenerated) return false;

        const isVisitsDb = task.databaseId === 'db_visits_tastings';
        const typeStr = (task.customType || task.type || '').toLowerCase();
        const titleStr = (task.title || '').toLowerCase();
        const isVisit = typeStr.includes('visita') || titleStr.includes('visita');
        const isTasting = typeStr.includes('degust') || typeStr.includes('jantar') || titleStr.includes('degust') || titleStr.includes('jantar');
        if (!isVisitsDb && !isVisit && !isTasting && task.type !== 'meeting') return false;

        if (visitsSubFilter === 'visit' && !isVisit) return false;
        if (visitsSubFilter === 'tasting' && !isTasting) return false;
      } else if (workspaceContext === 'appointments') {
        // Compromissos do Cliente (Pós-Venda): Strictly client/debutante linked or db_appointments
        if (task.databaseId === 'db_followup' || task.type === 'followup' || task.isFollowUp) return false;
        if (task.leadId && !task.debutanteId) return false;

        const isDirectAppointment = task.databaseId === 'db_appointments' || Boolean(task.debutanteId);
        const typeStr = (task.customType || task.type || '').toLowerCase();
        const isAppointmentType = typeStr.includes('compromisso') || typeStr.includes('reuni') || task.type === 'meeting' || (task.type as string) === 'client_appointment';
        if (!isDirectAppointment && !isAppointmentType) return false;
      }
      return true;
    });
  }, [contextTasks, workspaceContext, visitsSubFilter]);

  // Filter tasks based on context, search, database, assignee, type, priority, and status
  const filteredTasks = useMemo(() => {
    return baseScopedTasks.filter(task => {
      // 1. Database filter
      if (selectedDatabaseId !== 'all') {
        const db = databases.find(d => d.id === selectedDatabaseId);
        if (task.databaseId) {
          if (task.databaseId !== selectedDatabaseId) return false;
        } else if (!db?.isDefault) {
          return false;
        }
      }

      // 2. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchObs = (task.observations || '').toLowerCase().includes(q);
        const matchRes = (task.resolution || '').toLowerCase().includes(q);
        const matchLead = (task.leadName || '').toLowerCase().includes(q);
        const matchType = (task.customType || task.type || '').toLowerCase().includes(q);
        const matchAssignee = (task.assignedToIds || []).some((uid: string) => {
          const c = collaborators.find(col => col.id === uid);
          return (c?.name || '').toLowerCase().includes(q);
        });
        if (!matchTitle && !matchDesc && !matchObs && !matchRes && !matchLead && !matchType && !matchAssignee) {
          return false;
        }
      }

      // 3. Assignee filter
      if (assigneeFilter !== 'all') {
        if (!(task.assignedToIds || []).includes(assigneeFilter)) return false;
      }

      // 4. Type filter
      if (typeFilter !== 'all') {
        const currentType = (task.customType || task.type || '').toLowerCase();
        if (!currentType.includes(typeFilter.toLowerCase())) return false;
      }

      // 5. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && task.status !== 'completed') return false;
        if (statusFilter === 'pending' && task.status === 'completed') return false;
        if (statusFilter === 'overdue' && (task.status === 'completed' || !task.dueDate || task.dueDate >= todayStr)) return false;
      }

      // 6. Priority filter
      if (priorityFilter !== 'all') {
        if ((task.priority || 'medium') !== priorityFilter) return false;
      }

      // 7. Sector filter
      if (sectorFilter !== 'all') {
        if (getTaskSector(task) !== sectorFilter) return false;
      }

      return true;
    });
  }, [baseScopedTasks, selectedDatabaseId, databases, searchTerm, assigneeFilter, typeFilter, statusFilter, priorityFilter, sectorFilter, getTaskSector, collaborators, todayStr]);

  // Open detail modal with dynamically resolved database context
  const handleOpenTask = (task: AdminTask) => {
    let resolvedContext: TaskWorkspaceContext = 'all';
    let resolvedDbId = task.databaseId || 'default_collabs';

    if (resolvedDbId === 'db_followup' || task.type === 'followup' || (task.customType || '').toLowerCase().includes('follow')) {
      resolvedContext = 'followup';
      resolvedDbId = 'db_followup';
    } else if (resolvedDbId === 'db_visits_tastings' || (task.customType || '').toLowerCase().includes('visita') || (task.customType || '').toLowerCase().includes('degust')) {
      resolvedContext = 'visits_tastings';
      resolvedDbId = 'db_visits_tastings';
    } else if (resolvedDbId === 'db_appointments' || Boolean(task.debutanteId && !task.leadId)) {
      resolvedContext = 'appointments';
      resolvedDbId = 'db_appointments';
    }

    setModalWorkspaceContext(resolvedContext);
    setModalDatabaseId(resolvedDbId);
    setSelectedTask(task);
    setPrefilledDueDate(undefined);
    setPrefilledDueTime(undefined);
    setPrefilledCustomType(undefined);
    setIsTaskModalOpen(true);
  };

  const openModalForContext = (targetContext: TaskWorkspaceContext, targetSubtype?: string) => {
    setModalWorkspaceContext(targetContext);
    if (targetContext === 'followup') {
      setModalDatabaseId('db_followup');
      setPrefilledCustomType(targetSubtype || 'Follow-up WhatsApp');
    } else if (targetContext === 'visits_tastings') {
      setModalDatabaseId('db_visits_tastings');
      setPrefilledCustomType(targetSubtype || (visitsSubFilter === 'tasting' ? 'Degustação' : 'Visita'));
    } else if (targetContext === 'appointments') {
      setModalDatabaseId('db_appointments');
      setPrefilledCustomType(targetSubtype || 'Visita Técnica');
    } else {
      setModalDatabaseId('default_collabs');
      setPrefilledCustomType(targetSubtype || 'Acompanhar');
    }
    setIsTaskTypeSelectorOpen(false);
    setIsTaskModalOpen(true);
  };

  // Open modal for brand new task
  const handleNewTask = () => {
    setSelectedTask(null);
    setPrefilledDueDate(todayStr);
    setPrefilledDueTime(undefined);
    if (workspaceContext === 'all') {
      setIsTaskTypeSelectorOpen(true);
    } else {
      openModalForContext(workspaceContext);
    }
  };

  // Handle new task on double click in calendar
  const handleNewTaskForDate = (dateStr: string, timeStr?: string) => {
    setSelectedTask(null);
    setPrefilledDueDate(dateStr);
    setPrefilledDueTime(timeStr);
    if (workspaceContext === 'all') {
      setIsTaskTypeSelectorOpen(true);
    } else {
      openModalForContext(workspaceContext);
    }
  };

  const hasActiveFilters = assigneeFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || selectedDatabaseId !== 'all' || sectorFilter !== 'all';

  const resetFilters = () => {
    setAssigneeFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedDatabaseId('all');
    setSectorFilter('all');
    setSearchTerm('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#F8FAFC',
      color: '#0F172A',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* ── TOP MASTER BAR (Padrão Kommo / amoCRM em Light Mode) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 24px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        {/* Left: View Mode Switchers */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}>
          {/* 1. Kanban Mode ||' */}
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: viewMode === 'kanban' ? '#FFFFFF' : 'transparent',
              border: viewMode === 'kanban' ? '1px solid #CBD5E1' : '1px solid transparent',
              color: viewMode === 'kanban' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Visualização em Colunas / Kanban"
          >
            ||'
          </button>

          {/* 2. Table / List Mode ☰ */}
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
              border: viewMode === 'table' ? '1px solid #CBD5E1' : '1px solid transparent',
              color: viewMode === 'table' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Visualização em Tabela / Lista"
          >
            <List size={16} />
          </button>

          {/* 3. Daily Timeline DIA */}
          <button
            type="button"
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: viewMode === 'day' ? '#FFFFFF' : 'transparent',
              border: viewMode === 'day' ? '1px solid #CBD5E1' : '1px solid transparent',
              color: viewMode === 'day' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '0.5px',
              boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            DIA
          </button>

          {/* 4. Weekly Calendar SEMANA */}
          <button
            type="button"
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: viewMode === 'week' ? '#FFFFFF' : 'transparent',
              border: viewMode === 'week' ? '1px solid #CBD5E1' : '1px solid transparent',
              color: viewMode === 'week' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '0.5px',
              boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            SEMANA
          </button>

          {/* 5. Monthly Calendar MÊS */}
          <button
            type="button"
            onClick={() => setViewMode('month')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: viewMode === 'month' ? '#FFFFFF' : 'transparent',
              border: viewMode === 'month' ? '1px solid #CBD5E1' : '1px solid transparent',
              color: viewMode === 'month' ? '#0284C7' : '#64748B',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '0.5px',
              boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            MÊS
          </button>
        </div>

        {/* Sector Quick Switcher (Gerência Tarefas) */}
        {workspaceContext === 'all' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'comercial', label: 'Comercial' },
              { id: 'pos_venda', label: 'Pós-Venda' },
              { id: 'gerencia', label: 'Gerência' },
              { id: 'financeiro', label: 'Financeiro' },
            ].map(sec => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSectorFilter(sec.id as any)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  border: 'none',
                  background: sectorFilter === sec.id ? '#FFFFFF' : 'transparent',
                  color: sectorFilter === sec.id ? '#0284C7' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  boxShadow: sectorFilter === sec.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {sec.label}
              </button>
            ))}
          </div>
        )}

        {/* Visitas & Degustações Sub-filter Toggles (if in visits_tastings context) */}
        {workspaceContext === 'visits_tastings' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}>
            <button
              type="button"
              onClick={() => setVisitsSubFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: visitsSubFilter === 'all' ? '#FFFFFF' : 'transparent',
                color: visitsSubFilter === 'all' ? '#0284C7' : '#64748B',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                boxShadow: visitsSubFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setVisitsSubFilter('visit')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: visitsSubFilter === 'visit' ? '#FFFFFF' : 'transparent',
                color: visitsSubFilter === 'visit' ? '#059669' : '#64748B',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: visitsSubFilter === 'visit' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <CalendarIcon size={12} />
              <span>Visitas</span>
            </button>
            <button
              type="button"
              onClick={() => setVisitsSubFilter('tasting')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: visitsSubFilter === 'tasting' ? '#FFFFFF' : 'transparent',
                color: visitsSubFilter === 'tasting' ? '#D97706' : '#64748B',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: visitsSubFilter === 'tasting' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Utensils size={12} />
              <span>Degustações</span>
            </button>
          </div>
        )}

        {/* Center-Left: Quick Search & "Novo filtro" Button */}
        <div style={{ flex: 1, maxWidth: '380px', position: 'relative' }} ref={filterDropdownRef}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Novo filtro..."
              style={{
                width: '100%',
                padding: '8px 80px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                fontSize: '0.80rem',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              style={{
                position: 'absolute',
                right: '6px',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: hasActiveFilters ? '#E0F2FE' : '#F1F5F9',
                color: hasActiveFilters ? '#0284C7' : '#64748B',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Filter size={12} />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
              )}
            </button>
          </div>

          {/* Popover de Filtros Avançados */}
          {isFilterDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              width: '320px',
              padding: '16px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '14px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0F172A' }}>Filtros Avançados</span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{ fontSize: '0.70rem', color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Responsável */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Usuário Responsável
                </label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todos os responsáveis</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Tarefa */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Tipo de Tarefa
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todos os tipos</option>
                  <option value="Acompanhar">🔄 Acompanhar</option>
                  <option value="Visita">📅 Visita</option>
                  <option value="Degustação">🍽️ Degustação</option>
                  <option value="Follow-up">💬 Follow-up</option>
                  <option value="Reunião">👥 Reunião</option>
                  <option value="Ligação">📞 Ligação</option>
                  <option value="Contrato">📝 Contrato</option>
                </select>
              </div>

              {/* Banco / Unidade */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Banco de Tarefas / Unidade
                </label>
                <select
                  value={selectedDatabaseId}
                  onChange={(e) => setSelectedDatabaseId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todos os bancos</option>
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>{db.icon || '📋'} {db.name}</option>
                  ))}
                </select>
              </div>

              {/* Setor */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Setor da Empresa
                </label>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todos os setores</option>
                  <option value="comercial">💼 Comercial (SDR / Closer / CRM)</option>
                  <option value="pos_venda">🎉 Pós-Venda (Sucesso do Cliente)</option>
                  <option value="gerencia">🛡️ Gerência / Gestão</option>
                  <option value="financeiro">💰 Financeiro</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todos os status</option>
                  <option value="pending">Pendentes / Em Aberto</option>
                  <option value="overdue">Atrasadas</option>
                  <option value="completed">Concluídas</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Counter, Availability, + Nova Tarefa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Task Counter */}
          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#64748B' }}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'itens'}
          </span>

          {/* Grade & Disponibilidade Semanal (Visitas & Degustações - Exclusivo Gerência / Admin) */}
          {workspaceContext === 'visits_tastings' && (currentUser?.role === 'master' || currentUser?.role === 'admin') && (
            <button
              type="button"
              onClick={() => setIsAgendaModalOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#D4AF37',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="Configurar regras semanais e disponibilidade da agenda"
            >
              <Sliders size={13} />
              <span>Configurar Disponibilidade</span>
            </button>
          )}

          {/* + NOVA TAREFA Primary Blue Button */}
          <button
            type="button"
            onClick={handleNewTask}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              background: '#0284C7',
              border: '1px solid #0284C7',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: 800,
              letterSpacing: '0.4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Plus size={15} />
            <span>{newButtonText}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT AREA (Rendered View) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: '#F8FAFC',
      }}>
        {viewMode === 'kanban' && (
          <AdminTasksKanbanView
            tasks={filteredTasks}
            onOpenTask={handleOpenTask}
            todayStr={todayStr}
            entityLabel={entityLabel}
            workspaceContext={workspaceContext}
            collaborators={collaborators}
          />
        )}

        {viewMode === 'table' && (
          <AdminTasksTableView
            tasks={filteredTasks}
            allTasks={contextTasks}
            collaborators={collaborators}
            onOpenTask={handleOpenTask}
            onToggleStatus={handleTableToggleStatus}
            todayStr={todayStr}
            workspaceContext={workspaceContext}
          />
        )}

        {viewMode === 'day' && (
          <AdminCalendarDayView
            tasks={filteredTasks}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onOpenTask={handleOpenTask}
            onNewTaskForDate={handleNewTaskForDate}
            onUpdateTask={updateTask}
          />
        )}

        {viewMode === 'week' && (
          <AdminCalendarWeekView
            tasks={filteredTasks}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onOpenTask={handleOpenTask}
            onNewTaskForDate={handleNewTaskForDate}
            onUpdateTask={updateTask}
          />
        )}

        {viewMode === 'month' && (
          <AdminCalendarMonthView
            tasks={filteredTasks}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onOpenTask={handleOpenTask}
            onNewTaskForDate={handleNewTaskForDate}
            onSelectDay={(clickedDate) => {
              setCurrentDate(clickedDate);
              setViewMode('day');
            }}
          />
        )}
      </div>

      {/* ── PRÉ-TELA / SELETOR DE TIPO DE TAREFA (CENTRAL DE TAREFAS) ── */}
      {isTaskTypeSelectorOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            maxWidth: '640px',
            width: '100%',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}>
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                    Criar Nova Tarefa
                  </h2>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Selecione a categoria para abrir o formulário com a estrutura e campos corretos:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTaskTypeSelectorOpen(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}>
              {/* Option 1: Follow-up Comercial */}
              <div
                onClick={() => openModalForContext('followup', 'Follow-up WhatsApp')}
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0284C7';
                  e.currentTarget.style.background = '#F0F9FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(2, 132, 199, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(2, 132, 199, 0.12)',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MessageSquare size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#0284C7',
                    background: 'rgba(2, 132, 199, 0.10)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    Comercial
                  </span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Follow-up Comercial
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                    Retorno, negociação e acompanhamento de Leads do CRM.
                  </p>
                </div>
              </div>

              {/* Option 2: Visitas & Degustações */}
              <div
                onClick={() => openModalForContext('visits_tastings', 'Visita')}
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D97706';
                  e.currentTarget.style.background = '#FFFBEB';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(217, 119, 6, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(217, 119, 6, 0.12)',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Utensils size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#D97706',
                    background: 'rgba(217, 119, 6, 0.10)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    Pós-Venda
                  </span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Visita / Degustação
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                    Agendamento de visita presencial à casa ou degustação de cardápio.
                  </p>
                </div>
              </div>

              {/* Option 3: Compromissos */}
              <div
                onClick={() => openModalForContext('appointments', 'Visita Técnica')}
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7C3AED';
                  e.currentTarget.style.background = '#FAF5FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(124, 58, 237, 0.12)',
                    color: '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Users size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#7C3AED',
                    background: 'rgba(124, 58, 237, 0.10)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    Atendimento
                  </span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Compromisso do Cliente
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                    Reuniões, ensaios, maquiagem e alinhamentos com debutantes.
                  </p>
                </div>
              </div>

              {/* Option 4: Tarefa Geral & Operacional */}
              <div
                onClick={() => openModalForContext('all', 'Acompanhar')}
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(71, 85, 105, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(71, 85, 105, 0.12)',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckSquare size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#475569',
                    background: 'rgba(71, 85, 105, 0.10)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    Geral
                  </span>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Tarefa Geral & Equipe
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4 }}>
                    Demandas internas, manutenção, checklists operacionais e equipe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOCO DE NOTAS INTELIGENTE MODAL ── */}
      <AdminTaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onOpenLead={onOpenLead}
        initialDueDate={prefilledDueDate}
        initialDueTime={prefilledDueTime}
        initialCustomType={prefilledCustomType}
        initialDatabaseId={modalDatabaseId || (selectedDatabaseId !== 'all' ? selectedDatabaseId : undefined)}
        workspaceContext={modalWorkspaceContext}
      />

      {/* ── MODAL DE CONCLUSÃO DE TAREFA COM FEEDBACK ── */}
      <AdminTaskCompletionModal
        isOpen={!!completingTask}
        taskTitle={completingTask?.title || ''}
        onClose={() => setCompletingTask(null)}
        onConfirm={(feedback) => {
          if (completingTask) {
            completeTaskWithFeedback(completingTask.id, feedback);
            setCompletingTask(null);
          }
        }}
      />

      {/* ── MODAL DE CONFIGURAÇÃO DE GRADE & DISPONIBILIDADE DA AGENDA (GERÊNCIA) ── */}
      {isAgendaModalOpen && (
        <AdminAgendaAvailabilityModal
          venueId={activeVenueId || undefined}
          initialTab={visitsSubFilter === 'tasting' ? 'tastings' : 'visits'}
          onClose={() => setIsAgendaModalOpen(false)}
        />
      )}
    </div>
  );
};
