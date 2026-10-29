import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Edit3, Search, 
  Building2, UserCheck, ChevronLeft, ChevronRight, List,
  Sparkles, Clock, CheckCircle2, AlertCircle, X, RotateCcw, Phone,
  Check
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { AdminAppointmentModal } from './AdminAppointmentModal';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminTaskDetailModal } from './AdminTaskDetailModal';
import type { Appointment, AppointmentStatus } from '../../types';
import type { AdminTask } from '../../types/admin';

interface AdminAppointmentsViewProps {
  onOpenLead?: (leadId: string) => void;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}> = {
  scheduled: {
    label: 'Agendado',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: CalendarIcon,
  },
  confirmed: {
    label: 'Confirmado',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'Em Execução',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: Clock,
  },
  completed: {
    label: 'Compareceu',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelado',
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.35)',
    icon: X,
  },
  no_show: {
    label: 'Não Compareceu',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: AlertCircle,
  },
  rescheduled: {
    label: 'Reagendado',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
    icon: RotateCcw,
  },
  reschedule_target: {
    label: 'Reagendamento',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
    icon: Sparkles,
  },
};

export const AdminAppointmentsView: React.FC<AdminAppointmentsViewProps> = ({ onOpenLead: _onOpenLead }) => {
  const { 
    debutantes, 
    venues, 
    activeVenueId, 
    leads,
    appointments: adminAppointments,
    updateAppointment,
    addAppointment,
    deleteAppointment,
    deleteAppointmentForDebutante,
    collaborators,
    currentUser,
    updateLeadData,
  } = useAdminState();

  // View Mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  // Filtros Avançados
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>(activeVenueId || 'all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Month navigation for Calendar View
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Task Detail Modal State
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<AdminTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Modal State para Novo Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetDate, setPresetDate] = useState<string | undefined>(undefined);
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ id: string; title: string; debutanteId?: string } | null>(null);

  // ── ESTADO DO MODAL AVANÇADO DE EDIÇÃO & REAGENDAMENTO ──
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editCloserId, setEditCloserId] = useState('');
  const [editVenueId, setEditVenueId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('10:00');
  const [editPax, setEditPax] = useState(2);
  const [editCategory, setEditCategory] = useState('visit');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('scheduled');

  // Modal de Decisão ao Alterar Data/Hora: Salvar Diretamente vs Reagendar (Manter Histórico)
  const [reschedulePromptData, setReschedulePromptData] = useState<{
    originalApp: Appointment;
    newDate: string;
    newTime: string;
  } | null>(null);

  // ── 1. UNIFICAÇÃO DE DADOS (APPOINTMENTS + LEADS + DEBUTANTES) ─────────────
  const allAppointments = useMemo(() => {
    const list: (Appointment & {
      leadPhone?: string;
      leadVenueId?: string;
      debutanteSlug?: string;
      isFromLeadCommitment?: boolean;
    })[] = [];

    const seenIds = new Set<string>();

    // A. Agendamentos registrados no banco Supabase / estado global
    (adminAppointments || []).forEach(a => {
      seenIds.add(a.id);
      const targetVenue = venues.find(v => v.id === a.venueId);
      list.push({
        ...a,
        location: a.location || targetVenue?.name || 'Unidade Geral',
      });
    });

    // B. Agendamentos dos apps de debutantes
    debutantes.forEach(d => {
      const venue = venues.find(v => v.id === d.venueId);
      (d.appointments || []).forEach(a => {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          list.push({
            ...a,
            debutanteId: d.id,
            debutanteName: d.name,
            debutanteSlug: d.slug,
            venueId: a.venueId || d.venueId,
            location: a.location || venue?.name || 'Espaço',
          });
        }
      });
    });

    // C. Compromissos comerciais gravados nos Leads (Visitas e Degustações)
    leads.forEach(l => {
      const venue = venues.find(v => v.id === l.venueId);
      if (l.visitCommitment && l.visitCommitment.date) {
        const id = `lead_visit_${l.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          list.push({
            id,
            title: `Visita Comercial • ${l.name}`,
            category: 'visit',
            date: l.visitCommitment.date,
            time: l.visitCommitment.time || '10:00',
            location: venue?.name || 'Unidade Comercial',
            status: (l.visitCommitment.status as any) || 'scheduled',
            notes: l.visitCommitment.notes,
            responsibleCollaboratorId: l.visitCommitment.responsibleId,
            responsibleName: l.visitCommitment.responsibleName || l.closerName,
            venueId: l.venueId,
            targetType: 'lead',
            leadId: l.id,
            leadName: l.name,
            leadPhone: l.phone,
            pax: l.visitCommitment.pax || 2,
            isFromLeadCommitment: true,
          });
        }
      }
      if (l.tastingCommitment && l.tastingCommitment.date) {
        const id = `lead_tasting_${l.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          list.push({
            id,
            title: `Degustação Gastronômica • ${l.name}`,
            category: 'tasting',
            date: l.tastingCommitment.date,
            time: l.tastingCommitment.time || '19:00',
            location: venue?.name || 'Salão Nobre',
            status: (l.tastingCommitment.status as any) || 'scheduled',
            notes: l.tastingCommitment.notes,
            responsibleCollaboratorId: l.tastingCommitment.responsibleId,
            responsibleName: l.tastingCommitment.responsibleName || l.closerName,
            venueId: l.venueId,
            targetType: 'lead',
            leadId: l.id,
            leadName: l.name,
            leadPhone: l.phone,
            pax: l.tastingCommitment.pax || 4,
            isFromLeadCommitment: true,
          });
        }
      }
    });

    return list;
  }, [adminAppointments, debutantes, leads, venues]);

  // ── 2. FILTRAGEM MULTICRITÉRIO ─────────────────────────────────────────────
  const displayedAppointments = useMemo(() => {
    return allAppointments.filter(app => {
      // Unidade / Casa
      const targetVenue = selectedVenueFilter !== 'all' ? selectedVenueFilter : activeVenueId;
      if (targetVenue && targetVenue !== 'all' && app.venueId && app.venueId !== targetVenue) {
        return false;
      }

      // Status
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'scheduled') {
          if (app.status !== 'scheduled' && app.status !== 'confirmed' && app.status !== 'reschedule_target') return false;
        } else if (app.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Tipo / Categoria
      if (selectedTypeFilter !== 'all') {
        const cat = (app.category || '').toLowerCase();
        if (selectedTypeFilter === 'visit' && !cat.includes('visit') && !cat.includes('visita')) return false;
        if (selectedTypeFilter === 'tasting' && !cat.includes('tasting') && !cat.includes('degust')) return false;
      }

      // Filtro de Data
      if (dateFilterPreset !== 'all') {
        const appDate = app.date;
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        if (dateFilterPreset === 'today' && appDate !== todayStr) return false;
        if (dateFilterPreset === 'tomorrow' && appDate !== tomorrowStr) return false;
        if (dateFilterPreset === 'week') {
          const appD = new Date(appDate + 'T12:00:00');
          const diffDays = Math.ceil((appD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 7) return false;
        }
        if (dateFilterPreset === 'month') {
          const appD = new Date(appDate + 'T12:00:00');
          if (appD.getMonth() !== now.getMonth() || appD.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilterPreset === 'custom') {
          if (customStartDate && appDate < customStartDate) return false;
          if (customEndDate && appDate > customEndDate) return false;
        }
      }

      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (app.title || '').toLowerCase().includes(q);
        const nameMatch = (app.leadName || app.debutanteName || '').toLowerCase().includes(q);
        const notesMatch = (app.notes || '').toLowerCase().includes(q);
        const respMatch = (app.responsibleName || '').toLowerCase().includes(q);
        const phoneMatch = (app.leadPhone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        if (!titleMatch && !nameMatch && !notesMatch && !respMatch && !phoneMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [allAppointments, selectedVenueFilter, activeVenueId, selectedStatusFilter, selectedTypeFilter, dateFilterPreset, customStartDate, customEndDate, todayStr, searchQuery]);

  // ── 3. MÉTRICAS DO PERÍODO SELECIONADO ────────────────────────────────────
  const metrics = useMemo(() => {
    let total = displayedAppointments.length;
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    let noShow = 0;
    let rescheduled = 0;
    let cancelled = 0;

    displayedAppointments.forEach(a => {
      const st = a.status || 'scheduled';
      if (st === 'scheduled' || st === 'confirmed' || st === 'reschedule_target') scheduled++;
      else if (st === 'in_progress') inProgress++;
      else if (st === 'completed') completed++;
      else if (st === 'no_show') noShow++;
      else if (st === 'rescheduled') rescheduled++;
      else if (st === 'cancelled') cancelled++;
    });

    return { total, scheduled, inProgress, completed, noShow, rescheduled, cancelled };
  }, [displayedAppointments]);

  // ── HANDLERS DE EDIÇÃO E REAGENDAMENTO ────────────────────────────────────
  const handleOpenEditAppointment = (app: Appointment) => {
    setEditingAppointment(app);
    setEditClientName(app.leadName || app.debutanteName || app.title || '');
    setEditClientPhone((app as any).leadPhone || (app as any).phone || '');
    setEditCloserId(app.responsibleCollaboratorId || '');
    setEditVenueId(app.venueId || venues[0]?.id || '');
    setEditDate(app.date || todayStr);
    setEditTime(app.time || '10:00');
    setEditPax(app.pax || (app as any).guestsCount || 2);
    setEditCategory((app.category as string) || 'visit');
    setEditNotes(app.notes || '');
    setEditStatus((app.status as any) || 'scheduled');
  };

  const handleSaveEditForm = async () => {
    if (!editingAppointment) return;

    const isDateOrTimeChanged = editDate !== editingAppointment.date || editTime !== editingAppointment.time;

    // Se a data ou hora foi alterada, exibe o prompt para escolher entre apenas salvar nova data ou reagendar com histórico
    if (isDateOrTimeChanged) {
      setReschedulePromptData({
        originalApp: editingAppointment,
        newDate: editDate,
        newTime: editTime,
      });
      return;
    }

    // Salvamento direto sem alteração de data/hora
    await applyAppointmentUpdates(editingAppointment.id, {
      title: editClientName ? `${editCategory === 'visit' ? 'Visita' : 'Degustação'} • ${editClientName}` : editingAppointment.title,
      leadName: editClientName,
      responsibleCollaboratorId: editCloserId,
      responsibleName: collaborators.find(c => c.id === editCloserId)?.name || editingAppointment.responsibleName,
      venueId: editVenueId,
      notes: editNotes,
      status: editStatus,
      pax: editPax,
    });

    setEditingAppointment(null);
  };

  // Opção 1: Salva nova data diretamente no agendamento existente
  const handleConfirmDirectDateChange = async () => {
    if (!reschedulePromptData || !editingAppointment) return;

    await applyAppointmentUpdates(editingAppointment.id, {
      date: editDate,
      time: editTime,
      leadName: editClientName,
      responsibleCollaboratorId: editCloserId,
      responsibleName: collaborators.find(c => c.id === editCloserId)?.name || editingAppointment.responsibleName,
      venueId: editVenueId,
      notes: editNotes,
      status: editStatus,
      pax: editPax,
    });

    setReschedulePromptData(null);
    setEditingAppointment(null);
  };

  // Opção 2: Reagenda mantendo o agendamento original como 'rescheduled' e cria um novo com status 'reschedule_target'
  const handleConfirmRescheduleWithAudit = async () => {
    if (!reschedulePromptData || !editingAppointment) return;

    const closerObj = collaborators.find(c => c.id === editCloserId);

    // 1. Marca o compromisso original como 'rescheduled'
    await applyAppointmentUpdates(editingAppointment.id, {
      status: 'rescheduled',
      notes: `${editingAppointment.notes ? editingAppointment.notes + '\n' : ''}[Reagendado para ${editDate.split('-').reverse().join('/')} às ${editTime} por ${currentUser?.name || 'Administrador'}]`,
    });

    // 2. Cria o novo agendamento com status 'reschedule_target'
    const newApp: Omit<Appointment, 'id'> = {
      title: `${editCategory === 'visit' ? 'Visita Comercial' : 'Degustação'} • ${editClientName}`,
      category: editCategory,
      date: editDate,
      time: editTime,
      location: venues.find(v => v.id === editVenueId)?.name || editingAppointment.location,
      status: 'reschedule_target',
      notes: `${editNotes ? editNotes + '\n' : ''}[Reagendamento derivado da data anterior: ${editingAppointment.date.split('-').reverse().join('/')}]`,
      responsibleCollaboratorId: editCloserId,
      responsibleName: closerObj?.name || editingAppointment.responsibleName,
      venueId: editVenueId,
      targetType: editingAppointment.targetType || 'lead',
      leadId: editingAppointment.leadId,
      leadName: editClientName,
      pax: editPax,
    };

    await addAppointment(newApp);

    // Se for lead do CRM, atualiza o compromisso vinculado no lead
    if (editingAppointment.leadId) {
      const targetLead = leads.find(l => l.id === editingAppointment.leadId);
      if (targetLead) {
        if (editCategory === 'visit') {
          updateLeadData(targetLead.id, {
            visitCommitment: {
              ...(targetLead.visitCommitment || {}),
              type: 'visit',
              date: editDate,
              time: editTime,
              status: 'reschedule_target',
              pax: editPax || targetLead.visitCommitment?.pax || 2,
              notes: newApp.notes,
              responsibleId: editCloserId,
              responsibleName: closerObj?.name || targetLead.visitCommitment?.responsibleName,
            }
          });
        } else {
          updateLeadData(targetLead.id, {
            tastingCommitment: {
              ...(targetLead.tastingCommitment || {}),
              type: 'tasting',
              date: editDate,
              time: editTime,
              status: 'reschedule_target',
              pax: editPax || targetLead.tastingCommitment?.pax || 4,
              notes: newApp.notes,
              responsibleId: editCloserId,
              responsibleName: closerObj?.name || targetLead.tastingCommitment?.responsibleName,
            }
          });
        }
      }
    }

    setReschedulePromptData(null);
    setEditingAppointment(null);
  };

  // Helper unificado de atualização de agendamento
  const applyAppointmentUpdates = async (appId: string, updates: Partial<Appointment>) => {
    // Se for registro da tabela unificada de appointments
    if (!appId.startsWith('lead_')) {
      await updateAppointment(appId, updates);
    }

    // Se veio do compromisso de um lead do CRM
    if (appId.startsWith('lead_visit_')) {
      const leadId = appId.replace('lead_visit_', '');
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && targetLead.visitCommitment) {
        updateLeadData(leadId, {
          visitCommitment: {
            ...targetLead.visitCommitment,
            ...(updates.date ? { date: updates.date } : {}),
            ...(updates.time ? { time: updates.time } : {}),
            ...(updates.status ? { status: updates.status as any } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.responsibleCollaboratorId ? { responsibleId: updates.responsibleCollaboratorId, responsibleName: updates.responsibleName } : {}),
          }
        });
      }
    } else if (appId.startsWith('lead_tasting_')) {
      const leadId = appId.replace('lead_tasting_', '');
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && targetLead.tastingCommitment) {
        updateLeadData(leadId, {
          tastingCommitment: {
            ...targetLead.tastingCommitment,
            ...(updates.date ? { date: updates.date } : {}),
            ...(updates.time ? { time: updates.time } : {}),
            ...(updates.status ? { status: updates.status as any } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.responsibleCollaboratorId ? { responsibleId: updates.responsibleCollaboratorId, responsibleName: updates.responsibleName } : {}),
          }
        });
      }
    }
  };

  // Mudança Rápida de Status pelo Menu de Linha
  const handleQuickStatusChange = async (app: Appointment, newStatus: AppointmentStatus) => {
    await applyAppointmentUpdates(app.id, { status: newStatus });
  };

  // ── RENDERIZAÇÃO DO COMPONENTE ────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── HEADER SUPERIOR ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#14A9D7', marginBottom: '4px' }}>
            <CalendarIcon size={18} />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Central de Agendamentos & Visitas
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)', margin: 0 }}>
            Gestão Avançada de Agendamentos
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted, #64748B)', margin: '4px 0 0' }}>
            Acompanhe visitas comerciais, degustações e reuniões de clientes em tempo real com controle rigoroso de status e reagendamento.
          </p>
        </div>

        {/* Alternador de Visualização & Botão Novo Agendamento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--adm-bg-card, #FFFFFF)',
            border: '1px solid var(--adm-border, #CBD5E1)',
            borderRadius: '10px',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#14A9D7' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : 'var(--adm-text-muted, #64748B)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              <span>Lista Detalhada</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                background: viewMode === 'calendar' ? '#14A9D7' : 'transparent',
                color: viewMode === 'calendar' ? '#FFFFFF' : 'var(--adm-text-muted, #64748B)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarIcon size={14} />
              <span>Calendário</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPresetDate(todayStr);
              setIsModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '10px',
              background: '#14A9D7',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20, 169, 215, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS AVANÇADOS ────────────────────────────────────── */}
      <div style={{
        background: 'var(--adm-bg-card, #FFFFFF)',
        borderRadius: '14px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Botões Rápidos de Data */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-muted, #64748B)', marginRight: '4px' }}>
              Data:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'today', label: 'Hoje' },
              { id: 'tomorrow', label: 'Amanhã' },
              { id: 'week', label: 'Próximos 7 dias' },
              { id: 'month', label: 'Este Mês' },
              { id: 'custom', label: 'Período Livre' },
            ].map(btn => {
              const isActive = dateFilterPreset === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setDateFilterPreset(btn.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${isActive ? '#14A9D7' : 'var(--adm-border, #CBD5E1)'}`,
                    background: isActive ? 'rgba(20, 169, 215, 0.12)' : 'var(--adm-bg-surface, #F8FAFC)',
                    color: isActive ? '#0284C7' : 'var(--adm-text-title, #334155)',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Seletores de Unidade e Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Seletor de Casa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} color="#64748B" />
              <select
                value={selectedVenueFilter}
                onChange={(e) => setSelectedVenueFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-surface, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                <option value="all">Todas as Unidades</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Seletor de Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-surface, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.76rem',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="all">Todos os Status</option>
              <option value="scheduled">Agendados</option>
              <option value="in_progress">Em Execução</option>
              <option value="completed">Compareceram</option>
              <option value="no_show">Não Compareceram</option>
              <option value="rescheduled">Reagendados</option>
              <option value="cancelled">Cancelados</option>
            </select>

            {/* Seletor de Categoria */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border, #CBD5E1)',
                background: 'var(--adm-bg-surface, #F8FAFC)',
                color: 'var(--adm-text-title, #0F172A)',
                fontSize: '0.76rem',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="all">Todas as Categorias</option>
              <option value="visit">Visitas Comerciais</option>
              <option value="tasting">Degustações</option>
            </select>
          </div>
        </div>

        {/* Inputs de Data Customizada quando 'custom' está ativo */}
        {dateFilterPreset === 'custom' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--adm-border, #E2E8F0)',
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>De:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.76rem',
              }}
            />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>Até:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.76rem',
              }}
            />
          </div>
        )}

        {/* Campo de Busca Livre */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Buscar por nome do cliente, closer responsável, telefone ou observações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border, #CBD5E1)',
              background: 'var(--adm-bg-surface, #F8FAFC)',
              color: 'var(--adm-text-title, #0F172A)',
              fontSize: '0.80rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── BARRA DE MÉTRICAS DO PERÍODO ──────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        {/* Total */}
        <div style={{
          background: 'var(--adm-bg-card, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--adm-border, #E2E8F0)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase' }}>
            Total Filtrado
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
            {metrics.total}
          </span>
        </div>

        {/* Agendados */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase' }}>
            Agendados
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2563EB' }}>
            {metrics.scheduled}
          </span>
        </div>

        {/* Em Execução */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>
            Em Execução
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#D97706' }}>
            {metrics.inProgress}
          </span>
        </div>

        {/* Compareceram */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
            Compareceram
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>
            {metrics.completed}
          </span>
        </div>

        {/* Não Compareceram */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>
            Não Compareceu
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#DC2626' }}>
            {metrics.noShow}
          </span>
        </div>

        {/* Reagendados */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>
            Reagendados
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7C3AED' }}>
            {metrics.rescheduled}
          </span>
        </div>
      </div>

      {/* ── 4. LISTA DE AGENDAMENTOS (LIST VIEW) ─────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedAppointments.length === 0 ? (
            <div style={{
              background: 'var(--adm-bg-card, #FFFFFF)',
              borderRadius: '14px',
              border: '1px dashed var(--adm-border, #CBD5E1)',
              padding: '48px 20px',
              textAlign: 'center',
            }}>
              <CalendarIcon size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                Nenhum agendamento encontrado
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted, #64748B)', marginTop: '4px' }}>
                Não foram localizados agendamentos para os filtros e datas selecionadas.
              </p>
            </div>
          ) : (
            displayedAppointments.map(app => {
              const statusCfg = STATUS_CONFIG[app.status || 'scheduled'] || STATUS_CONFIG.scheduled;
              const StatusIcon = statusCfg.icon;
              const venueObj = venues.find(v => v.id === app.venueId);

              return (
                <div
                  key={app.id}
                  style={{
                    background: 'var(--adm-bg-card, #FFFFFF)',
                    borderRadius: '14px',
                    border: '1px solid var(--adm-border, #E2E8F0)',
                    borderLeft: `4px solid ${statusCfg.color}`,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Bloco de Data e Horário */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      background: 'var(--adm-bg-surface, #F8FAFC)',
                      border: '1px solid var(--adm-border, #CBD5E1)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      textAlign: 'center',
                      minWidth: '70px',
                    }}>
                      <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#14A9D7', textTransform: 'uppercase' }}>
                        {new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)', lineHeight: 1.1 }}>
                        {app.date.split('-')[2]}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--adm-text-muted, #64748B)', fontWeight: 700 }}>
                        {app.time}
                      </div>
                    </div>

                    {/* Detalhes do Agendamento */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                          {app.leadName || app.debutanteName || app.title}
                        </span>

                        {/* Badge de Status Oficial dos 7 Statuses */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: statusCfg.bg,
                          border: `1px solid ${statusCfg.border}`,
                          color: statusCfg.color,
                          fontSize: '0.70rem',
                          fontWeight: 800,
                        }}>
                          <StatusIcon size={12} color={statusCfg.color} />
                          <span>{statusCfg.label}</span>
                        </div>

                        {/* Unidade */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          color: '#6366F1',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                        }}>
                          <Building2 size={11} />
                          <span>{venueObj?.name || app.location}</span>
                        </span>
                      </div>

                      {/* Linha de Metadados: Closer, Telefone, PAX */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.76rem', color: '#64748B', flexWrap: 'wrap' }}>
                        {app.responsibleName && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <UserCheck size={13} color="#10B981" />
                            <strong>Closer:</strong> {app.responsibleName}
                          </span>
                        )}
                        {(app as any).leadPhone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} color="#64748B" />
                            {(app as any).leadPhone}
                          </span>
                        )}
                        {app.pax && (
                          <span>
                            <strong>PAX:</strong> {app.pax} pessoas
                          </span>
                        )}
                      </div>

                      {app.notes && (
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontStyle: 'italic', marginTop: '2px' }}>
                          "{app.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas de Linha */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Botões Rápidos de Status */}
                    {app.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(app, 'completed')}
                        title="Marcar como Compareceu"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#059669',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Compareceu
                      </button>
                    )}

                    {app.status !== 'no_show' && app.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(app, 'no_show')}
                        title="Marcar como Não Compareceu"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Faltou
                      </button>
                    )}

                    {/* Botão Editar & Reagendar */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditAppointment(app)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--adm-border, #CBD5E1)',
                        background: 'var(--adm-bg-surface, #F8FAFC)',
                        color: 'var(--adm-text-title, #0F172A)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} color="#14A9D7" />
                      <span>Editar / Reagendar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── 5. CALENDAR VIEW (MENSAL) ────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div style={{
          background: 'var(--adm-bg-card, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--adm-border, #E2E8F0)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Navegação de Mês */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)', margin: 0 }}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Grade Mensal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
          }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#64748B', padding: '6px 0' }}>
                {d}
              </div>
            ))}
            {(() => {
              const y = currentDate.getFullYear();
              const m = currentDate.getMonth();
              const firstDay = new Date(y, m, 1).getDay();
              const totalDays = new Date(y, m + 1, 0).getDate();
              const cells = [];

              for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`empty-${i}`} style={{ minHeight: '90px', background: 'transparent' }} />);
              }

              for (let d = 1; d <= totalDays; d++) {
                const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayApps = displayedAppointments.filter(a => a.date === dateStr);
                const isToday = dateStr === todayStr;

                cells.push(
                  <div
                    key={dateStr}
                    style={{
                      minHeight: '90px',
                      borderRadius: '10px',
                      border: `1px solid ${isToday ? '#14A9D7' : 'var(--adm-border, #E2E8F0)'}`,
                      background: isToday ? 'rgba(20, 169, 215, 0.04)' : 'var(--adm-bg-surface, #F8FAFC)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: isToday ? 900 : 700, color: isToday ? '#0284C7' : '#0F172A' }}>
                        {d}
                      </span>
                      {dayApps.length > 0 && (
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, background: '#14A9D7', color: '#FFFFFF', padding: '1px 5px', borderRadius: '10px' }}>
                          {dayApps.length}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '70px' }}>
                      {dayApps.map(app => {
                        const stCfg = STATUS_CONFIG[app.status || 'scheduled'] || STATUS_CONFIG.scheduled;
                        return (
                          <div
                            key={app.id}
                            onClick={() => handleOpenEditAppointment(app)}
                            style={{
                              fontSize: '0.66rem',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              background: stCfg.bg,
                              border: `1px solid ${stCfg.border}`,
                              color: stCfg.color,
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={`${app.time} - ${app.leadName || app.title} (${stCfg.label})`}
                          >
                            {app.time} {app.leadName || app.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* ── 6. MODAL AVANÇADO DE EDIÇÃO DE AGENDAMENTO ─────────────────────── */}
      {editingAppointment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card, #FFFFFF)',
            borderRadius: '16px',
            border: '1px solid var(--adm-border, #CBD5E1)',
            maxWidth: '560px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--adm-border, #E2E8F0)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#14A9D7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title, #0F172A)' }}>
                  Editar ou Reagendar Compromisso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Nome e Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    Nome do Cliente / Lead:
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              {/* Data e Horário (Campos Críticos de Reagendamento) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    Data do Agendamento:
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${editDate !== editingAppointment.date ? '#F59E0B' : '#CBD5E1'}`,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${editTime !== editingAppointment.time ? '#F59E0B' : '#CBD5E1'}`,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              {/* Closer Responsável e Unidade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    Closer Responsável:
                  </label>
                  <select
                    value={editCloserId}
                    onChange={(e) => setEditCloserId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="">Selecione um Closer</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                    Status do Agendamento:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="in_progress">Em Execução</option>
                    <option value="completed">Compareceu</option>
                    <option value="no_show">Não Compareceu</option>
                    <option value="rescheduled">Reagendado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  Observações Internas:
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.80rem',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid #CBD5E1',
                  color: '#64748B',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditForm}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: '#14A9D7',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(20, 169, 215, 0.25)',
                }}
              >
                <Check size={16} />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL DE CONFIRMAÇÃO DE REAGENDAMENTO (SALVAR VS REAGENDAR COM AUDITORIA) ── */}
      {reschedulePromptData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            maxWidth: '520px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
                  Como Deseja Registrar a Alteração de Data?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Você alterou a data de <strong>{reschedulePromptData.originalApp.date.split('-').reverse().join('/')}</strong> para <strong>{reschedulePromptData.newDate.split('-').reverse().join('/')} às {reschedulePromptData.newTime}</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {/* Opção A: Apenas Salvar Nova Data */}
              <div
                onClick={handleConfirmDirectDateChange}
                style={{
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  background: '#F8FAFC',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#14A9D7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
              >
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                  Apenas Salvar Nova Data
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Atualiza diretamente a data deste compromisso sem criar novos registros ou alterar o status para Reagendado.
                </div>
              </div>

              {/* Opção B: Reagendar com Histórico */}
              <div
                onClick={handleConfirmRescheduleWithAudit}
                style={{
                  border: '1.5px solid #8B5CF6',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  background: 'rgba(139, 92, 246, 0.05)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: '#7C3AED', marginBottom: '2px' }}>
                  <Sparkles size={14} color="#7C3AED" />
                  <span>Reagendar (Manter Histórico Completo)</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Marca este agendamento como <strong>Reagendado</strong> para auditoria da gerência e cria um novo agendamento com status <strong>Reagendamento</strong> para a nova data.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setReschedulePromptData(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar à Edição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal with preset date and debutante support */}
      <AdminAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        presetDate={presetDate}
      />

      {/* Appointment Delete Confirm */}
      <AdminConfirmModal
        isOpen={!!appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={() => {
          if (appointmentToDelete) {
            if (appointmentToDelete.debutanteId) {
              deleteAppointmentForDebutante(appointmentToDelete.debutanteId, appointmentToDelete.id);
            } else {
              deleteAppointment(appointmentToDelete.id);
            }
            setAppointmentToDelete(null);
          }
        }}
        title="Remover Compromisso"
        itemName={appointmentToDelete?.title}
        message={appointmentToDelete ? `Tem certeza que deseja remover o compromisso "${appointmentToDelete.title}"?` : undefined}
      />

      {/* Task Detail Modal for tasks clicked in calendar */}
      <AdminTaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTaskForModal(null);
        }}
        task={selectedTaskForModal}
        workspaceContext="appointments"
        initialDatabaseId="db_appointments"
      />
    </div>
  );
};
