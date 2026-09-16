import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Plus, 
  ChevronLeft, ChevronRight, User, Users, Building2,
  Search, CalendarCheck, Utensils, X
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Appointment, AppointmentStatus } from '../../types';

export type CalendarViewMode = 
  | 'team' 
  | 'commercial_meetings' 
  | 'commercial_visits_tastings'
  | 'commercial_visits'
  | 'commercial_tastings'
  | 'post_sale_appointments'
  | 'post_sale_visits_tastings'
  | 'post_sale_visits' 
  | 'post_sale_tastings';

interface AdminUnifiedCalendarViewProps {
  mode: CalendarViewMode;
  onOpenLead?: (leadId: string) => void;
  onOpenDebutante?: (slug: string) => void;
}

const MODE_CONFIG: Record<CalendarViewMode, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  defaultCategory: string;
  accentColor: string;
  allowedTargetTypes: ('lead' | 'client' | 'team')[];
}> = {
  team: {
    title: 'Agenda da Equipe',
    subtitle: 'Alinhamentos internos, reuniões de gestão e planejamento do time',
    icon: <CalendarIcon size={22} color="var(--adm-accent)" />,
    defaultCategory: 'Reunião de Equipe',
    accentColor: 'var(--adm-accent)',
    allowedTargetTypes: ['team'],
  },
  commercial_meetings: {
    title: 'Reuniões Comerciais',
    subtitle: 'Agenda de reuniões e apresentações comerciais dos SDRs e Closers',
    icon: <CalendarCheck size={22} color="#38BDF8" />,
    defaultCategory: 'Reunião com Cliente',
    accentColor: '#38BDF8',
    allowedTargetTypes: ['lead'],
  },
  commercial_visits_tastings: {
    title: 'Visitas & Degustações Comerciais',
    subtitle: 'Visitas para conhecer os espaços e degustações de cardápio com leads',
    icon: <Utensils size={22} color="#FB923C" />,
    defaultCategory: 'Visita Técnica / Apresentação',
    accentColor: '#FB923C',
    allowedTargetTypes: ['lead', 'client'],
  },
  commercial_visits: {
    title: 'Visitas Comerciais',
    subtitle: 'Visitas agendadas com leads para conhecer os espaços e fechar contrato',
    icon: <CalendarIcon size={22} color="#FB923C" />,
    defaultCategory: 'Visita Técnica / Apresentação',
    accentColor: '#FB923C',
    allowedTargetTypes: ['lead', 'client'],
  },
  commercial_tastings: {
    title: 'Degustações de Vendas',
    subtitle: 'Degustações de cardápio agendadas com leads da esteira comercial',
    icon: <CalendarIcon size={22} color="#F472B6" />,
    defaultCategory: 'Buffet & Degustação',
    accentColor: '#F472B6',
    allowedTargetTypes: ['lead', 'client'],
  },
  post_sale_appointments: {
    title: 'Compromissos do Pós-Venda',
    subtitle: 'Agenda oficial de alinhamentos e etapas com as famílias dos aniversariantes',
    icon: <CalendarIcon size={22} color="var(--adm-accent)" />,
    defaultCategory: 'Alinhamento Geral',
    accentColor: 'var(--adm-accent)',
    allowedTargetTypes: ['client'],
  },
  post_sale_visits_tastings: {
    title: 'Visitas & Degustações do Pós-Venda',
    subtitle: 'Visitas técnicas, ensaios da valsa e degustações oficiais de cardápio',
    icon: <Utensils size={22} color="#A78BFA" />,
    defaultCategory: 'Visita Técnica / Apresentação',
    accentColor: '#A78BFA',
    allowedTargetTypes: ['client', 'lead'],
  },
  post_sale_visits: {
    title: 'Visitas Técnicas & Ensaios',
    subtitle: 'Visitas presenciais, ensaios da valsa e vistorias de decoração',
    icon: <CalendarIcon size={22} color="#A78BFA" />,
    defaultCategory: 'Visita Técnica / Apresentação',
    accentColor: '#A78BFA',
    allowedTargetTypes: ['client', 'lead'],
  },
  post_sale_tastings: {
    title: 'Degustações de Cardápio',
    subtitle: 'Degustações oficiais do buffet para escolha do menu da festa',
    icon: <CalendarIcon size={22} color="#F472B6" />,
    defaultCategory: 'Buffet & Degustação',
    accentColor: '#F472B6',
    allowedTargetTypes: ['client', 'lead'],
  },
};

export const AdminUnifiedCalendarView: React.FC<AdminUnifiedCalendarViewProps> = ({
  mode,
  onOpenLead,
  onOpenDebutante,
}) => {
  const { 
    venues, 
    activeVenueId, 
    setActiveVenueId, 
    leads, 
    debutantes, 
    collaborators, 
    currentUser,
    addAppointmentForDebutante,
    updateAppointmentForDebutante,
    deleteAppointmentForDebutante,
  } = useAdminState();

  const config = MODE_CONFIG[mode];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'list'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>(() => {
    if (mode === 'team' && currentUser?.role && !['master', 'admin', 'dev'].includes(currentUser.role)) {
      return currentUser.id || 'all';
    }
    return 'all';
  });
  
  // Modal de Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState(config.defaultCategory);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('14:00');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('scheduled');
  const [formNotes, setFormNotes] = useState('');
  const [formVenueId, setFormVenueId] = useState(activeVenueId !== 'all' && activeVenueId ? activeVenueId : (venues[0]?.id || ''));
  const [formResponsibleId, setFormResponsibleId] = useState(currentUser?.id || '');
  
  // Target Selection (Lead vs Client vs Team)
  const [formTargetType, setFormTargetType] = useState<'lead' | 'client' | 'team'>(
    config.allowedTargetTypes[0] || 'lead'
  );
  const [formSelectedLeadId, setFormSelectedLeadId] = useState('');
  const [formSelectedDebutanteId, setFormSelectedDebutanteId] = useState('');
  const [formGuestsCount, setFormGuestsCount] = useState(2);

  // Consolidação de todos os agendamentos registrados
  const allAppointments = useMemo(() => {
    return debutantes.flatMap(d => {
      return (d.appointments || []).map((a: Appointment) => ({
        ...a,
        debutanteId: a.debutanteId || d.id,
        debutanteName: a.debutanteName || d.name,
        venueId: a.venueId || d.venueId,
      }));
    });
  }, [debutantes]);

  // Filtragem dos compromissos deste modo
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((apt: Appointment) => {
      // Filtro de casa
      if (activeVenueId && activeVenueId !== 'all' && apt.venueId && apt.venueId !== activeVenueId) {
        return false;
      }
      // Filtro de modo/categoria
      if (mode === 'team') {
        if (apt.targetType !== 'team' && !apt.category?.toLowerCase().includes('equipe')) return false;
        if (selectedMemberFilter !== 'all' && apt.responsibleCollaboratorId !== selectedMemberFilter) {
          return false;
        }
      } else if (mode === 'commercial_meetings') {
        if (apt.targetType === 'team') return false;
        if (!apt.category?.toLowerCase().includes('reuni') && !apt.category?.toLowerCase().includes('comercial')) return false;
      } else if (mode === 'commercial_visits_tastings' || mode === 'post_sale_visits_tastings') {
        const cat = apt.category?.toLowerCase() || '';
        if (!cat.includes('visit') && !cat.includes('ensaio') && !cat.includes('degusta') && !cat.includes('buffet')) return false;
      } else if (mode === 'commercial_visits' || mode === 'post_sale_visits') {
        if (!apt.category?.toLowerCase().includes('visit') && !apt.category?.toLowerCase().includes('ensaio')) return false;
      } else if (mode === 'commercial_tastings' || mode === 'post_sale_tastings') {
        if (!apt.category?.toLowerCase().includes('degusta') && !apt.category?.toLowerCase().includes('buffet')) return false;
      } else if (mode === 'post_sale_appointments') {
        if (apt.targetType === 'team') return false;
      }

      // Filtro de status
      if (selectedStatusFilter !== 'all' && apt.status !== selectedStatusFilter) {
        return false;
      }

      // Filtro de busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = apt.title?.toLowerCase().includes(q);
        const matchLead = apt.leadName?.toLowerCase().includes(q);
        const matchDebutante = apt.debutanteName?.toLowerCase().includes(q);
        const matchResp = apt.responsibleName?.toLowerCase().includes(q);
        const matchLoc = apt.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchLead && !matchDebutante && !matchResp && !matchLoc) return false;
      }

      return true;
    });
  }, [allAppointments, activeVenueId, mode, selectedStatusFilter, selectedMemberFilter, searchQuery]);

  // Contadores de status
  const counts = useMemo(() => {
    return {
      all: filteredAppointments.length,
      scheduled: filteredAppointments.filter((a: Appointment) => a.status === 'scheduled').length,
      confirmed: filteredAppointments.filter((a: Appointment) => a.status === 'confirmed').length,
      completed: filteredAppointments.filter((a: Appointment) => a.status === 'completed').length,
    };
  }, [filteredAppointments]);

  const handleOpenCreate = (preselectedDate?: string) => {
    setEditingAppointment(null);
    setFormTitle('');
    setFormCategory(config.defaultCategory);
    setFormDate(preselectedDate || new Date().toISOString().split('T')[0]);
    setFormTime('14:00');
    setFormLocation(venues.find(v => v.id === formVenueId)?.name || 'Unidade Principal');
    setFormStatus('scheduled');
    setFormNotes('');
    setFormTargetType(config.allowedTargetTypes[0] || 'lead');
    setFormSelectedLeadId('');
    setFormSelectedDebutanteId('');
    setFormGuestsCount(2);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setFormTitle(apt.title);
    setFormCategory(apt.category);
    setFormDate(apt.date);
    setFormTime(apt.time);
    setFormLocation(apt.location || '');
    setFormStatus(apt.status);
    setFormNotes(apt.notes || '');
    setFormVenueId(apt.venueId || venues[0]?.id || '');
    setFormResponsibleId(apt.responsibleCollaboratorId || currentUser?.id || '');
    setFormTargetType(apt.targetType || (apt.leadId ? 'lead' : apt.debutanteId ? 'client' : 'team'));
    setFormSelectedLeadId(apt.leadId || '');
    setFormSelectedDebutanteId(apt.debutanteId || '');
    setFormGuestsCount(apt.guestsCount || 2);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responsible = collaborators.find(c => c.id === formResponsibleId);
    const selectedLead = formTargetType === 'lead' ? leads.find(l => l.id === formSelectedLeadId) : undefined;
    const selectedDebutante = formTargetType === 'client' ? debutantes.find(d => d.id === formSelectedDebutanteId) : undefined;

    const autoTitle = formTitle.trim() || (
      formTargetType === 'lead' && selectedLead 
        ? `${formCategory} • ${selectedLead.name}` 
        : formTargetType === 'client' && selectedDebutante
          ? `${formCategory} • ${selectedDebutante.name}`
          : `${formCategory} • Equipe`
    );

    const targetDebutanteId = (formTargetType === 'client' && selectedDebutante?.id) 
      ? selectedDebutante.id 
      : debutantes[0]?.id;

    const payload: Omit<Appointment, 'id'> = {
      title: autoTitle,
      category: formCategory,
      date: formDate,
      time: formTime,
      location: formLocation || 'Casa de Festas',
      status: formStatus,
      notes: formNotes,
      venueId: formVenueId || undefined,
      responsibleCollaboratorId: formResponsibleId,
      responsibleName: responsible?.name || currentUser?.name || 'Gestão',
      responsibleRole: responsible?.role || currentUser?.role || 'Admin',
      responsiblePhone: responsible?.phone,
      targetType: formTargetType,
      leadId: selectedLead?.id,
      leadName: selectedLead?.name,
      debutanteId: selectedDebutante?.id || targetDebutanteId,
      debutanteName: selectedDebutante?.name,
      guestsCount: Number(formGuestsCount),
    };

    if (editingAppointment) {
      const targetId = editingAppointment.debutanteId || targetDebutanteId;
      if (targetId) {
        updateAppointmentForDebutante(targetId, editingAppointment.id, payload);
      }
    } else if (targetDebutanteId) {
      addAppointmentForDebutante(targetDebutanteId, payload);
    }

    setIsModalOpen(false);
  };

  // Funções de navegação do calendário (Mês)
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const currentMonthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Funções de navegação da Semana (Segunda a Domingo)
  const getMondayOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const currentMonday = useMemo(() => getMondayOfWeek(currentDate), [currentDate]);

  const nextWeek = () => {
    setCurrentDate(new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const prevWeek = () => {
    setCurrentDate(new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setTimeout(() => {
      const el = document.getElementById('calendar-today-row');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // 7 Dias da Semana (Segunda a Domingo)
  const weekDaysList = useMemo(() => {
    const days = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday.getTime() + i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayApts = filteredAppointments
        .filter(a => a.date === dateStr)
        .sort((a, b) => a.time.localeCompare(b.time));

      days.push({
        dateObj: d,
        dateStr,
        dayOfWeekName: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }),
        isToday: dateStr === todayStr,
        appointments: dayApts,
      });
    }
    return days;
  }, [currentMonday, filteredAppointments]);

  // Grid do mês
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean; appointments: Appointment[] }[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false, appointments: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dayApts = filteredAppointments.filter(a => a.date === dateStr);
      days.push({ day, dateStr, isCurrentMonth: true, appointments: dayApts });
    }

    return days;
  }, [currentDate, filteredAppointments]);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmado', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.35)' };
      case 'completed':
        return { label: 'Concluído', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)' };
      default:
        return { label: 'Agendado', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.35)' };
    }
  };

  const handleSelectDayFromMonth = (dateStr: string) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, d));
    setViewType('list');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 24px 60px 24px',
      width: '100%',
      maxWidth: '1380px',
      margin: '0 auto',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'var(--adm-bg-card)',
            border: `1.5px solid ${config.accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 16px ${config.accentColor}33`,
          }}>
            {config.icon}
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.3px' }}>
              {config.title}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: '3px 0 0 0' }}>
              {config.subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Seletor de Membro da Equipe (visível no modo team) */}
          {mode === 'team' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--adm-bg-card)',
              border: '1px solid var(--adm-border)',
              borderRadius: '12px',
              padding: '4px 10px',
            }}>
              <Users size={14} color="var(--adm-accent)" />
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#1A1622' }}>Toda a Equipe</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#1A1622' }}>
                    {c.name} {c.id === currentUser?.id ? '(Você)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Unidade */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '12px',
            padding: '4px 10px',
          }}>
            <Building2 size={14} color="var(--adm-accent)" />
            <select
              value={activeVenueId || 'all'}
              onChange={(e) => setActiveVenueId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--adm-text-title)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#1A1622' }}>Todas as Casas</option>
              {venues.map(v => (
                <option key={v.id} value={v.id} style={{ background: '#1A1622' }}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Toggle Mês / Lista Semanal */}
          <div style={{
            display: 'flex',
            background: 'var(--adm-bg-input)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid var(--adm-border)',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setViewType('month')}
              style={{
                background: viewType === 'month' ? 'var(--adm-accent)' : 'transparent',
                color: viewType === 'month' ? '#000' : 'var(--adm-text-muted)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewType('list')}
              style={{
                background: viewType === 'list' ? 'var(--adm-accent)' : 'transparent',
                color: viewType === 'list' ? '#000' : 'var(--adm-text-muted)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Lista Semanal
            </button>
          </div>

          {/* Botão Novo Agendamento */}
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            style={{
              background: config.accentColor,
              color: '#000000',
              border: 'none',
              borderRadius: '12px',
              padding: '9px 18px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 4px 16px ${config.accentColor}40`,
            }}
          >
            <Plus size={16} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Filter & Metric Bar */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Chips de Status */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos', count: counts.all },
            { id: 'scheduled', label: 'Agendados', count: counts.scheduled },
            { id: 'confirmed', label: 'Confirmados', count: counts.confirmed },
            { id: 'completed', label: 'Concluídos', count: counts.completed },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatusFilter(tab.id as any)}
              style={{
                background: selectedStatusFilter === tab.id ? 'var(--adm-accent)' : 'var(--adm-bg-input)',
                color: selectedStatusFilter === tab.id ? '#000' : 'var(--adm-text-body)',
                border: `1px solid ${selectedStatusFilter === tab.id ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: selectedStatusFilter === tab.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.64rem',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Busca */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--adm-bg-input)',
          border: '1px solid var(--adm-border)',
          borderRadius: '10px',
          padding: '6px 12px',
          minWidth: '220px',
        }}>
          <Search size={14} color="var(--adm-text-muted)" />
          <input
            type="text"
            placeholder="Buscar agendamento ou pessoa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--adm-text-title)',
              fontSize: '0.78rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Main Calendar Render */}
      {viewType === 'month' ? (
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--adm-text-title)', textTransform: 'capitalize' }}>
                {currentMonthName}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              style={{
                background: 'transparent',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-accent)',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Hoje
            </button>
          </div>

          {/* Days of Week Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            textAlign: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--adm-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} style={{ padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid with Appointment Counts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
          }}>
            {calendarGrid.map((item, idx) => {
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];
              if (!item.isCurrentMonth) {
                return (
                  <div 
                    key={`empty-${idx}`} 
                    style={{
                      minHeight: '85px',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '12px',
                      opacity: 0.2,
                    }} 
                  />
                );
              }

              const count = item.appointments.length;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => handleSelectDayFromMonth(item.dateStr)}
                  title={count > 0 ? `${count} compromisso(s) - Clique para ver a lista semanal` : 'Clique para ver a lista semanal'}
                  style={{
                    minHeight: '85px',
                    background: isToday ? 'rgba(212,175,55,0.08)' : 'var(--adm-bg-input)',
                    border: `1.5px solid ${isToday ? 'var(--adm-accent)' : (count > 0 ? 'rgba(212,175,55,0.3)' : 'var(--adm-border)')}`,
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--adm-accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isToday ? 'var(--adm-accent)' : (count > 0 ? 'rgba(212,175,55,0.3)' : 'var(--adm-border)');
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.86rem',
                      fontWeight: isToday ? 900 : 700,
                      color: isToday ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                    }}>
                      {item.day}
                    </span>
                    {isToday && (
                      <span style={{
                        fontSize: '0.60rem',
                        fontWeight: 900,
                        color: 'var(--adm-accent)',
                        textTransform: 'uppercase',
                      }}>
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Contador numérico de compromissos no dia */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                    {count > 0 ? (
                      <div style={{
                        background: config.accentColor,
                        color: '#000000',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: `0 2px 8px ${config.accentColor}44`,
                      }}>
                        <span>{count}</span>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800 }}>{count === 1 ? 'ação' : 'ações'}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.70rem', color: 'rgba(255,255,255,0.2)' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Weekly List View (Monday to Sunday) */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Navigation Controls Semana */}
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={prevWeek}
                title="Semana anterior"
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Semana de {weekDaysList[0]?.formattedDate} a {weekDaysList[6]?.formattedDate} de {currentMonday.getFullYear()}
              </span>

              <button
                type="button"
                onClick={nextWeek}
                title="Próxima semana"
                style={{
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text-title)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={goToToday}
              style={{
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid var(--adm-accent)',
                color: 'var(--adm-accent)',
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Hoje
            </button>
          </div>

          {/* 7 Daily Blocks of the Week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {weekDaysList.map(day => (
              <div
                key={day.dateStr}
                id={day.isToday ? 'calendar-today-row' : undefined}
                style={{
                  background: day.isToday ? 'rgba(212,175,55,0.03)' : 'var(--adm-bg-card)',
                  border: `1.5px solid ${day.isToday ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: day.isToday ? '0 0 24px rgba(212,175,55,0.08)' : 'none',
                }}
              >
                {/* Day Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--adm-border)',
                  paddingBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CalendarIcon size={16} color={day.isToday ? 'var(--adm-accent)' : 'var(--adm-text-muted)'} />
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      color: day.isToday ? 'var(--adm-accent)' : 'var(--adm-text-title)',
                      textTransform: 'capitalize',
                    }}>
                      {day.dayOfWeekName}, {day.formattedDate}
                    </span>
                    {day.isToday && (
                      <span style={{
                        background: 'var(--adm-accent)',
                        color: '#000',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        padding: '1px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}>
                        Hoje
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCreate(day.dateStr)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-accent)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} />
                    <span>Agendar</span>
                  </button>
                </div>

                {/* Day Content: Empty State or Appointments Cards */}
                {day.appointments.length === 0 ? (
                  <div style={{
                    padding: '18px',
                    textAlign: 'center',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.78rem',
                    background: 'var(--adm-bg-input)',
                    borderRadius: '10px',
                    border: '1px dashed var(--adm-border)',
                  }}>
                    {day.isToday ? 'Sem compromissos para o dia de hoje.' : 'Sem compromissos para esta data.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {day.appointments.map(apt => {
                      const badge = getStatusBadge(apt.status);
                      const venue = venues.find(v => v.id === apt.venueId);

                      return (
                        <div
                          key={apt.id}
                          onClick={() => handleOpenEdit(apt)}
                          className="saas-card"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            gap: '14px',
                            cursor: 'pointer',
                            borderRadius: '12px',
                            border: '1px solid var(--adm-border)',
                            background: 'var(--adm-bg-input)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = config.accentColor}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--adm-border)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                            {/* Time Badge */}
                            <div style={{
                              background: 'var(--adm-bg-card)',
                              border: `1px solid ${config.accentColor}`,
                              borderRadius: '10px',
                              padding: '6px 10px',
                              fontSize: '0.80rem',
                              fontWeight: 900,
                              color: config.accentColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0,
                            }}>
                              <Clock size={13} />
                              <span>{apt.time}</span>
                            </div>

                            {/* Info */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                                  {apt.title}
                                </span>
                                <span style={{
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  borderRadius: '6px',
                                  padding: '1px 6px',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                }}>
                                  {badge.label}
                                </span>
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '4px',
                                fontSize: '0.72rem',
                                color: 'var(--adm-text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                {(apt.leadName || apt.debutanteName) && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={12} color="var(--adm-accent)" />
                                    <strong style={{ color: 'var(--adm-text-body)' }}>
                                      {apt.leadName ? `Lead: ${apt.leadName}` : `Cliente: ${apt.debutanteName}`}
                                    </strong>
                                  </span>
                                )}

                                {venue && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Building2 size={12} />
                                    <span>{venue.name}</span>
                                  </span>
                                )}

                                {apt.responsibleName && (
                                  <span>
                                    Resp: <strong style={{ color: 'var(--adm-text-title)' }}>{apt.responsibleName}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {apt.leadId && onOpenLead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenLead(apt.leadId!);
                                }}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38BDF8',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  borderRadius: '8px',
                                  padding: '5px 10px',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Ver Lead
                              </button>
                            )}
                            {apt.debutanteId && onOpenDebutante && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const deb = debutantes.find(d => d.id === apt.debutanteId);
                                  if (deb?.slug) onOpenDebutante(deb.slug);
                                }}
                                style={{
                                  background: 'rgba(244, 114, 182, 0.15)',
                                  color: '#F472B6',
                                  border: '1px solid rgba(244, 114, 182, 0.35)',
                                  borderRadius: '8px',
                                  padding: '5px 10px',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Ver Cliente
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(apt);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--adm-border)',
                                color: 'var(--adm-text-body)',
                                borderRadius: '8px',
                                padding: '5px 12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Agendamento */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--adm-bg-card)',
            border: '1px solid var(--adm-border)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--adm-accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {config.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--adm-text-title)', margin: 0 }}>
                    {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                    {config.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Seletor de Tipo de Vínculo (Lead vs Cliente vs Equipe) */}
              {config.allowedTargetTypes.length > 1 && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Vincular Agendamento a:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${config.allowedTargetTypes.length}, 1fr)`, gap: '8px', marginTop: '6px' }}>
                    {config.allowedTargetTypes.includes('lead') && (
                      <button
                        type="button"
                        onClick={() => setFormTargetType('lead')}
                        style={{
                          background: formTargetType === 'lead' ? '#38BDF8' : 'var(--adm-bg-input)',
                          color: formTargetType === 'lead' ? '#000' : 'var(--adm-text-body)',
                          border: `1px solid ${formTargetType === 'lead' ? '#38BDF8' : 'var(--adm-border)'}`,
                          borderRadius: '10px',
                          padding: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Lead (Comercial)
                      </button>
                    )}
                    {config.allowedTargetTypes.includes('client') && (
                      <button
                        type="button"
                        onClick={() => setFormTargetType('client')}
                        style={{
                          background: formTargetType === 'client' ? '#F472B6' : 'var(--adm-bg-input)',
                          color: formTargetType === 'client' ? '#000' : 'var(--adm-text-body)',
                          border: `1px solid ${formTargetType === 'client' ? '#F472B6' : 'var(--adm-border)'}`,
                          borderRadius: '10px',
                          padding: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Cliente (Pós-Venda)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Seletor de Lead Específico */}
              {formTargetType === 'lead' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Selecionar Lead da Esteira Comercial:
                  </label>
                  <select
                    value={formSelectedLeadId}
                    onChange={(e) => setFormSelectedLeadId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                    }}
                  >
                    <option value="">Selecione um lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} • {l.phone} {l.venueName ? `(${l.venueName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seletor de Cliente Específico */}
              {formTargetType === 'client' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Selecionar Aniversariante / Cliente:
                  </label>
                  <select
                    value={formSelectedDebutanteId}
                    onChange={(e) => setFormSelectedDebutanteId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                    }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {debutantes.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} • Festa: {d.partyDate}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Título Customizado / Opcional */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                  Título / Assunto (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Degustação de Pratos Quentes com a Família"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.8rem',
                    marginTop: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Data & Horário */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Data:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Casa de Festa & Responsável */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Unidade:
                  </label>
                  <select
                    value={formVenueId || ''}
                    onChange={(e) => {
                      setFormVenueId(e.target.value);
                      const selV = venues.find(v => v.id === e.target.value);
                      if (selV) setFormLocation(selV.name);
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                    }}
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                    Responsável:
                  </label>
                  <select
                    value={formResponsibleId}
                    onChange={(e) => setFormResponsibleId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '6px',
                    }}
                  >
                    {collaborators.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                  Status do Agendamento:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {[
                    { id: 'scheduled', label: 'Agendado' },
                    { id: 'confirmed', label: 'Confirmado' },
                    { id: 'completed', label: 'Concluído' },
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFormStatus(st.id as any)}
                      style={{
                        background: formStatus === st.id ? config.accentColor : 'var(--adm-bg-input)',
                        color: formStatus === st.id ? '#000' : 'var(--adm-text-body)',
                        border: `1px solid ${formStatus === st.id ? config.accentColor : 'var(--adm-border)'}`,
                        borderRadius: '10px',
                        padding: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>
                  Observações / Detalhes:
                </label>
                <textarea
                  placeholder="Ex: Debutante tem restrição alimentar a lactose, trazer amostras sem lactose..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--adm-bg-input)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--adm-text-title)',
                    fontSize: '0.8rem',
                    marginTop: '6px',
                    resize: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                {editingAppointment ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja realmente remover este agendamento?')) {
                        const debId = editingAppointment.debutanteId || debutantes[0]?.id;
                        if (debId) {
                          deleteAppointmentForDebutante(debId, editingAppointment.id);
                        }
                        setIsModalOpen(false);
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      background: 'var(--adm-bg-input)',
                      border: '1px solid var(--adm-border)',
                      color: 'var(--adm-text-title)',
                      borderRadius: '10px',
                      padding: '10px 18px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: config.accentColor,
                      color: '#000000',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 22px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: `0 4px 14px ${config.accentColor}40`,
                    }}
                  >
                    {editingAppointment ? 'Salvar Alterações' : 'Criar Agendamento'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
