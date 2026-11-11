import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Plus,
  Search,
  Building2,
  UserCheck,
  Users,
  Clock,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  LayoutGrid,
  List as ListIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { VenueEvent, VenueEventStatus } from '../../types/admin';

const EVENT_TYPE_OPTIONS = [
  '15 Anos / Debutante',
  'Casamento',
  'Festa Infantil',
  'Formatura',
  'Evento Corporativo',
  'Confraternização',
  'Bloqueio / Manutenção',
  'Outro Evento',
];

const STATUS_META: Record<VenueEventStatus, { label: string; bg: string; color: string; border: string }> = {
  scheduled: {
    label: 'Agendado',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#2563EB',
    border: 'rgba(59, 130, 246, 0.30)',
  },
  confirmed: {
    label: 'Confirmado',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.30)',
  },
  completed: {
    label: 'Realizado',
    bg: 'rgba(139, 92, 246, 0.12)',
    color: '#7C3AED',
    border: 'rgba(139, 92, 246, 0.30)',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#DC2626',
    border: 'rgba(239, 68, 68, 0.30)',
  },
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatDateBr = (dateStr?: string) => {
  if (!dateStr) return '--/--/----';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

export const AdminVenueEventsView: React.FC = () => {
  const {
    venueEvents,
    addVenueEvent,
    updateVenueEvent,
    deleteVenueEvent,
    venues: scopedVenues,
    activeVenueId,
    clients,
    currentUser,
  } = useAdminState();

  // Regra de governança: Pós-Venda administra; Comercial visualiza apenas em modo leitura
  const canManageEvents = useMemo(() => {
    if (currentUser?.isDev) return true;
    const role = currentUser?.role || '';
    return role === 'pos_venda' || role === 'admin' || role === 'master';
  }, [currentUser?.role, currentUser?.isDev]);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [venueFilter, setVenueFilter] = useState<string>(
    activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi' ? activeVenueId : 'all'
  );
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VenueEventStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Criar / Editar Evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<VenueEvent | null>(null);
  const [formVenueId, setFormVenueId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formEventType, setFormEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('19:00');
  const [formEndTime, setFormEndTime] = useState('01:00');
  const [formGuestCount, setFormGuestCount] = useState<string>('');
  const [formClientId, setFormClientId] = useState<string>('');
  const [formClientSearch, setFormClientSearch] = useState<string>('');
  const [formStatus, setFormStatus] = useState<VenueEventStatus>('confirmed');
  const [formBlocksVenueDay, setFormBlocksVenueDay] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<VenueEvent | null>(null);

  const effectiveVenueFilter = useMemo(() => {
    if (activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi') {
      return activeVenueId;
    }
    return venueFilter;
  }, [activeVenueId, venueFilter]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return venueEvents
      .filter(ev => {
        if (effectiveVenueFilter !== 'all' && ev.venueId !== effectiveVenueFilter) return false;
        if (linkFilter === 'linked' && !ev.clientId) return false;
        if (linkFilter === 'unlinked' && ev.clientId) return false;
        if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
        if (q) {
          const venueName = scopedVenues.find(v => v.id === ev.venueId)?.name || ev.venueName || '';
          const match =
            ev.title.toLowerCase().includes(q) ||
            (ev.clientName || '').toLowerCase().includes(q) ||
            (ev.eventType || '').toLowerCase().includes(q) ||
            venueName.toLowerCase().includes(q) ||
            (ev.notes || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || (a.startTime || '').localeCompare(b.startTime || ''));
  }, [venueEvents, effectiveVenueFilter, linkFilter, statusFilter, searchQuery, scopedVenues]);

  const monthKey = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentMonth]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter(ev => ev.eventDate.startsWith(monthKey));
  }, [filteredEvents, monthKey]);

  const kpis = useMemo(() => {
    const activeMonth = monthEvents.filter(ev => ev.status !== 'cancelled');
    const lockedDays = new Set(activeMonth.filter(ev => ev.blocksVenueDay !== false).map(ev => `${ev.venueId}:${ev.eventDate}`)).size;
    const linked = activeMonth.filter(ev => Boolean(ev.clientId)).length;
    const unlinked = activeMonth.filter(ev => !ev.clientId).length;
    return {
      totalMonth: activeMonth.length,
      lockedDays,
      linked,
      unlinked,
    };
  }, [monthEvents]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      dateStr: string | null;
      dayNum?: number;
      events: VenueEvent[];
      hasLockedDay: boolean;
    }> = [];

    for (let i = 0; i < firstDayIdx; i++) {
      cells.push({ dateStr: null, events: [], hasLockedDay: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter(ev => ev.eventDate === dateStr);
      const hasLockedDay = dayEvents.some(ev => ev.blocksVenueDay !== false && ev.status !== 'cancelled');
      cells.push({ dateStr, dayNum: d, events: dayEvents, hasLockedDay });
    }

    return cells;
  }, [currentMonth, filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter(ev => ev.eventDate === selectedDate);
  }, [filteredEvents, selectedDate]);

  const selectableClients = useMemo(() => {
    const q = formClientSearch.trim().toLowerCase();
    return clients
      .filter(c => {
        if (formVenueId && c.venueId && c.venueId !== formVenueId) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.honoreeName || '').toLowerCase().includes(q) ||
          (c.payerPhone || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [clients, formVenueId, formClientSearch]);

  const openCreateModal = (presetDate?: string) => {
    if (!canManageEvents) return;
    const defaultVenue =
      (effectiveVenueFilter !== 'all' ? effectiveVenueFilter : scopedVenues[0]?.id) || '';
    setEditingEvent(null);
    setFormVenueId(defaultVenue);
    setFormTitle('');
    setFormEventType(EVENT_TYPE_OPTIONS[0]);
    setFormDate(presetDate || selectedDate || new Date().toISOString().split('T')[0]);
    setFormStartTime('19:00');
    setFormEndTime('01:00');
    setFormGuestCount('');
    setFormClientId('');
    setFormClientSearch('');
    setFormStatus('confirmed');
    setFormBlocksVenueDay(true);
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ev: VenueEvent) => {
    if (!canManageEvents) return;
    setEditingEvent(ev);
    setFormVenueId(ev.venueId);
    setFormTitle(ev.title);
    setFormEventType(ev.eventType || EVENT_TYPE_OPTIONS[0]);
    setFormDate(ev.eventDate);
    setFormStartTime(ev.startTime || '19:00');
    setFormEndTime(ev.endTime || '01:00');
    setFormGuestCount(ev.guestCount !== undefined ? String(ev.guestCount) : '');
    setFormClientId(ev.clientId || '');
    setFormClientSearch('');
    setFormStatus(ev.status);
    setFormBlocksVenueDay(ev.blocksVenueDay !== false);
    setFormNotes(ev.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSelectClientInForm = (clientId: string) => {
    setFormClientId(clientId);
    if (!clientId) return;
    const cli = clients.find(c => c.id === clientId);
    if (!cli) return;
    if (!formTitle.trim()) {
      setFormTitle(`Festa ${cli.honoreeName || cli.name}`);
    }
    if (!formGuestCount && cli.guestCount) {
      setFormGuestCount(String(cli.guestCount));
    }
    if (!editingEvent && cli.partyDate) {
      setFormDate(cli.partyDate);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEvents) return;
    if (!formVenueId) {
      setFormError('Selecione a casa de festas / unidade.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Informe o título ou identificação do evento.');
      return;
    }
    if (!formDate) {
      setFormError('Informe a data do evento.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const venueObj = scopedVenues.find(v => v.id === formVenueId);
      const linkedClient = formClientId ? clients.find(c => c.id === formClientId) : undefined;
      const parsedGuests = formGuestCount ? Number(formGuestCount) : undefined;

      if (editingEvent) {
        await updateVenueEvent(editingEvent.id, {
          venueId: formVenueId,
          venueName: venueObj?.name,
          clientId: formClientId || null,
          clientName: linkedClient?.name,
          title: formTitle.trim(),
          eventType: formEventType,
          eventDate: formDate,
          startTime: formStartTime || undefined,
          endTime: formEndTime || undefined,
          guestCount: parsedGuests && !Number.isNaN(parsedGuests) ? parsedGuests : undefined,
          status: formStatus,
          blocksVenueDay: formBlocksVenueDay,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await addVenueEvent({
          venueId: formVenueId,
          venueName: venueObj?.name,
          clientId: formClientId || null,
          clientName: linkedClient?.name,
          title: formTitle.trim(),
          eventType: formEventType,
          eventDate: formDate,
          startTime: formStartTime || undefined,
          endTime: formEndTime || undefined,
          guestCount: parsedGuests && !Number.isNaN(parsedGuests) ? parsedGuests : undefined,
          status: formStatus,
          blocksVenueDay: formBlocksVenueDay,
          notes: formNotes.trim() || undefined,
        });
      }
      setSelectedDate(formDate);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar evento da unidade:', err);
      setFormError('Não foi possível salvar o evento. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLockDay = async (ev: VenueEvent) => {
    if (!canManageEvents) return;
    await updateVenueEvent(ev.id, { blocksVenueDay: !ev.blocksVenueDay });
  };

  const handleConfirmDelete = async () => {
    if (!canManageEvents || !deletingEvent) return;
    await deleteVenueEvent(deletingEvent.id);
    setDeletingEvent(null);
  };

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0 28px' }}>
      {/* Cabeçalho Principal */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 22px',
          borderRadius: '14px',
          background: 'var(--adm-bg-surface, #FFFFFF)',
          border: '1px solid var(--adm-border, #E2E8F0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarCheck2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-title, #0F172A)',
                }}
              >
                Agenda de Eventos da Unidade
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  background: canManageEvents ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  color: canManageEvents ? '#059669' : '#2563EB',
                  border: canManageEvents
                    ? '1px solid rgba(16, 185, 129, 0.30)'
                    : '1px solid rgba(59, 130, 246, 0.30)',
                }}
              >
                {canManageEvents ? <ShieldCheck size={12} /> : <Eye size={12} />}
                {canManageEvents ? 'Administração Pós-Venda' : 'Visualização Comercial'}
              </span>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.80rem',
                color: 'var(--adm-text-muted, #64748B)',
              }}
            >
              Eventos cadastrados com trava bloqueiam automaticamente o dia da casa na agenda de visitas e degustações do Comercial.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '10px',
              background: 'var(--adm-bg-muted, #F1F5F9)',
              border: '1px solid var(--adm-border, #E2E8F0)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: viewMode === 'calendar' ? 'var(--adm-bg-surface, #FFFFFF)' : 'transparent',
                color: viewMode === 'calendar' ? '#2563EB' : 'var(--adm-text-muted, #64748B)',
              }}
            >
              <LayoutGrid size={14} /> Calendário
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: viewMode === 'list' ? 'var(--adm-bg-surface, #FFFFFF)' : 'transparent',
                color: viewMode === 'list' ? '#2563EB' : 'var(--adm-text-muted, #64748B)',
              }}
            >
              <ListIcon size={14} /> Lista
            </button>
          </div>

          {canManageEvents && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Plus size={15} /> Novo Evento / Trava
            </button>
          )}
        </div>
      </div>

      {/* Aviso de Somente Leitura para Comercial */}
      {!canManageEvents && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 16px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            color: 'var(--adm-text-title, #1E3A8A)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <Lock size={15} color="#2563EB" />
          <span>
            Agenda administrada pela equipe de Pós-Venda. O time Comercial possui acesso de consulta às datas travadas da unidade; datas com evento bloqueado ficam indisponíveis para novos agendamentos de visita.
          </span>
        </div>
      )}

      {/* KPIs do Mês */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          { label: 'Eventos no Mês', value: kpis.totalMonth, icon: CalendarIcon, color: '#2563EB' },
          { label: 'Dias Travados', value: kpis.lockedDays, icon: Lock, color: '#DC2626' },
          { label: 'Com Cliente Vinculado', value: kpis.linked, icon: UserCheck, color: '#059669' },
          { label: 'Sem Vínculo (Avulsos)', value: kpis.unlinked, icon: Building2, color: '#7C3AED' },
        ].map((item, i) => {
          const IconComp = item.icon;
          return (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--adm-bg-surface, #FFFFFF)',
                border: '1px solid var(--adm-border, #E2E8F0)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: `${item.color}18`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComp size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {item.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'var(--adm-bg-surface, #FFFFFF)',
          border: '1px solid var(--adm-border, #E2E8F0)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '11px', top: '10px' }} />
          <input
            type="text"
            placeholder="Buscar evento, cliente, tipo ou observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border, #CBD5E1)',
              background: 'var(--adm-bg-muted, #F8FAFC)',
              color: 'var(--adm-text-title, #0F172A)',
              fontSize: '0.78rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={effectiveVenueFilter}
          disabled={Boolean(activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi')}
          onChange={(e) => setVenueFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--adm-border, #CBD5E1)',
            background: 'var(--adm-bg-muted, #F8FAFC)',
            color: 'var(--adm-text-title, #0F172A)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <option value="all">Todas as Unidades</option>
          {scopedVenues.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          value={linkFilter}
          onChange={(e) => setLinkFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--adm-border, #CBD5E1)',
            background: 'var(--adm-bg-muted, #F8FAFC)',
            color: 'var(--adm-text-title, #0F172A)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <option value="all">Todos os Vínculos</option>
          <option value="linked">Com Cliente Vinculado</option>
          <option value="unlinked">Sem Cliente (Avulso)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | VenueEventStatus)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--adm-border, #CBD5E1)',
            background: 'var(--adm-bg-muted, #F8FAFC)',
            color: 'var(--adm-text-title, #0F172A)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <option value="all">Todos os Status</option>
          <option value="scheduled">Agendados</option>
          <option value="confirmed">Confirmados</option>
          <option value="completed">Realizados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {/* Conteúdo Principal: Calendário + Painel do Dia OR Lista */}
      {viewMode === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(300px, 1fr)', gap: '16px', alignItems: 'start' }}>
          {/* Calendário Mensal */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'var(--adm-bg-surface, #FFFFFF)',
              border: '1px solid var(--adm-border, #E2E8F0)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  color: 'var(--adm-text-title, #0F172A)',
                }}
              >
                {monthLabel}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  style={{
                    padding: '6px 9px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(now.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  style={{
                    padding: '6px 9px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
              {WEEK_DAYS.map(day => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    color: 'var(--adm-text-muted, #64748B)',
                    padding: '4px 0',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr) {
                  return <div key={`empty-${idx}`} style={{ minHeight: '86px', borderRadius: '10px', opacity: 0.25 }} />;
                }
                const isSelected = selectedDate === cell.dateStr;
                const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr!)}
                    onDoubleClick={() => canManageEvents && openCreateModal(cell.dateStr!)}
                    style={{
                      minHeight: '88px',
                      padding: '6px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected
                        ? '2px solid #2563EB'
                        : cell.hasLockedDay
                        ? '1px solid rgba(220, 38, 38, 0.45)'
                        : '1px solid var(--adm-border, #E2E8F0)',
                      background: cell.hasLockedDay
                        ? 'rgba(239, 68, 68, 0.05)'
                        : isSelected
                        ? 'rgba(37, 99, 235, 0.06)'
                        : 'var(--adm-bg-muted, #F8FAFC)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: isToday ? '#2563EB' : 'var(--adm-text-title, #0F172A)',
                        }}
                      >
                        {cell.dayNum}
                      </span>
                      {cell.hasLockedDay && (
                        <span
                          title="Dia travado na agenda comercial"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '1px 5px',
                            borderRadius: '5px',
                            background: 'rgba(220, 38, 38, 0.14)',
                            color: '#DC2626',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                          }}
                        >
                          <Lock size={9} /> Travado
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {cell.events.slice(0, 2).map(ev => {
                        const meta = STATUS_META[ev.status] || STATUS_META.scheduled;
                        return (
                          <div
                            key={ev.id}
                            style={{
                              padding: '2px 5px',
                              borderRadius: '5px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              background: meta.bg,
                              color: meta.color,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              borderLeft: `2px solid ${meta.color}`,
                            }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {cell.events.length > 2 && (
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)' }}>
                          +{cell.events.length - 2} evento(s)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel Lateral do Dia Selecionado */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'var(--adm-bg-surface, #FFFFFF)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase' }}>
                  Data Selecionada
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {formatDateBr(selectedDate)}
                </div>
              </div>
              {canManageEvents && (
                <button
                  type="button"
                  onClick={() => openCreateModal(selectedDate)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Agendar Aqui
                </button>
              )}
            </div>

            {selectedDayEvents.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  borderRadius: '10px',
                  border: '1px dashed var(--adm-border, #CBD5E1)',
                  color: 'var(--adm-text-muted, #64748B)',
                  fontSize: '0.78rem',
                }}
              >
                Nenhum evento ou trava registrada nesta data.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDayEvents.map(ev => {
                  const meta = STATUS_META[ev.status] || STATUS_META.scheduled;
                  const venueName = scopedVenues.find(v => v.id === ev.venueId)?.name || ev.venueName || 'Unidade';
                  const isLocked = ev.blocksVenueDay !== false && ev.status !== 'cancelled';

                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--adm-bg-muted, #F8FAFC)',
                        border: '1px solid var(--adm-border, #E2E8F0)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted, #64748B)' }}>
                            {venueName} {ev.eventType ? `• ${ev.eventType}` : ''}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: 'var(--adm-text-muted, #475569)' }}>
                        {(ev.startTime || ev.endTime) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {ev.startTime || '--:--'} às {ev.endTime || '--:--'}
                          </span>
                        )}
                        {ev.guestCount !== undefined && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} /> {ev.guestCount} convidados
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isLocked ? 'rgba(220, 38, 38, 0.10)' : 'rgba(100, 116, 139, 0.10)',
                            color: isLocked ? '#DC2626' : '#64748B',
                          }}
                        >
                          {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                          {isLocked ? 'Dia Travado (Comercial bloqueado)' : 'Sem Trava de Agenda'}
                        </span>

                        {ev.clientId ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#059669',
                            }}
                          >
                            <UserCheck size={11} /> {ev.clientName || 'Cliente vinculado'}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: 'rgba(124, 58, 237, 0.10)',
                              color: '#7C3AED',
                            }}
                          >
                            <Building2 size={11} /> Evento sem cliente vinculado
                          </span>
                        )}
                      </div>

                      {ev.notes && (
                        <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--adm-text-muted, #64748B)' }}>
                          {ev.notes}
                        </p>
                      )}

                      {canManageEvents && (
                        <div style={{ display: 'flex', gap: '6px', paddingTop: '4px', borderTop: '1px solid var(--adm-border, #E2E8F0)' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              padding: '5px 8px',
                              borderRadius: '7px',
                              border: '1px solid var(--adm-border, #CBD5E1)',
                              background: 'var(--adm-bg-surface, #FFFFFF)',
                              color: 'var(--adm-text-title, #0F172A)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={12} /> Editar / Vincular
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLockDay(ev)}
                            title={ev.blocksVenueDay ? 'Destravar dia para visitas' : 'Travar dia para visitas'}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '7px',
                              border: '1px solid var(--adm-border, #CBD5E1)',
                              background: 'var(--adm-bg-surface, #FFFFFF)',
                              color: ev.blocksVenueDay ? '#DC2626' : '#059669',
                              cursor: 'pointer',
                            }}
                          >
                            {ev.blocksVenueDay ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(ev)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '7px',
                              border: '1px solid rgba(239, 68, 68, 0.30)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Visualização em Lista Completa */
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            background: 'var(--adm-bg-surface, #FFFFFF)',
            border: '1px solid var(--adm-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--adm-text-muted, #64748B)', fontSize: '0.84rem' }}>
              Nenhum evento encontrado com os filtros selecionados.
            </div>
          ) : (
            filteredEvents.map(ev => {
              const meta = STATUS_META[ev.status] || STATUS_META.scheduled;
              const venueName = scopedVenues.find(v => v.id === ev.venueId)?.name || ev.venueName || 'Unidade';
              const isLocked = ev.blocksVenueDay !== false && ev.status !== 'cancelled';

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    border: '1px solid var(--adm-border, #E2E8F0)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                        {ev.title}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: isLocked ? 'rgba(220, 38, 38, 0.10)' : 'rgba(100, 116, 139, 0.10)',
                          color: isLocked ? '#DC2626' : '#64748B',
                        }}
                      >
                        {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                        {isLocked ? 'Dia Travado' : 'Sem Trava'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--adm-text-muted, #475569)' }}>
                      <span><strong>Data:</strong> {formatDateBr(ev.eventDate)}</span>
                      <span><strong>Unidade:</strong> {venueName}</span>
                      {(ev.startTime || ev.endTime) && (
                        <span><strong>Horário:</strong> {ev.startTime || '--:--'} - {ev.endTime || '--:--'}</span>
                      )}
                      <span>
                        <strong>Cliente:</strong>{' '}
                        {ev.clientId ? (ev.clientName || 'Vinculado') : 'Não vinculado (evento avulso)'}
                      </span>
                    </div>
                  </div>

                  {canManageEvents && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(ev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--adm-border, #CBD5E1)',
                          background: 'var(--adm-bg-surface, #FFFFFF)',
                          color: 'var(--adm-text-title, #0F172A)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEvent(ev)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.30)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#DC2626',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Criar / Editar Evento */}
      {isModalOpen && canManageEvents && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <form
            onSubmit={handleSaveEvent}
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '16px',
              background: 'var(--adm-bg-surface, #FFFFFF)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck2 size={20} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {editingEvent ? 'Editar Evento na Agenda da Unidade' : 'Novo Evento / Trava de Data'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--adm-text-muted, #64748B)' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.10)',
                  border: '1px solid rgba(239, 68, 68, 0.30)',
                  color: '#DC2626',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Unidade / Casa *
                </label>
                <select
                  value={formVenueId}
                  onChange={(e) => setFormVenueId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                >
                  <option value="">Selecione a unidade...</option>
                  {scopedVenues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Data do Evento *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                Título do Evento *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex.: Festa 15 Anos Sofia Mendes ou Reserva Corporativa"
                required
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-muted, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.80rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Tipo de Evento
                </label>
                <select
                  value={formEventType}
                  onChange={(e) => setFormEventType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                >
                  {EVENT_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as VenueEventStatus)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                >
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Realizado</option>
                  <option value="cancelled">Cancelado (libera dia)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Início
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Término
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Convidados
                </label>
                <input
                  type="number"
                  min={0}
                  value={formGuestCount}
                  onChange={(e) => setFormGuestCount(e.target.value)}
                  placeholder="Ex.: 150"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    background: 'var(--adm-bg-muted, #F8FAFC)',
                    color: 'var(--adm-text-title, #0F172A)',
                    fontSize: '0.80rem',
                  }}
                />
              </div>
            </div>

            {/* Vínculo Opcional a Cliente */}
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--adm-bg-muted, #F8FAFC)',
                border: '1px solid var(--adm-border, #E2E8F0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                Vincular a Cliente do Pós-Venda (Opcional)
              </div>
              <input
                type="text"
                value={formClientSearch}
                onChange={(e) => setFormClientSearch(e.target.value)}
                placeholder="Filtrar cliente por nome ou telefone..."
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-surface, #FFFFFF)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.76rem',
                }}
              />
              <select
                value={formClientId}
                onChange={(e) => handleSelectClientInForm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-surface, #FFFFFF)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                }}
              >
                <option value="">Sem vínculo com cliente (evento avulso / bloqueio manual)</option>
                {selectableClients.map(cli => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name}
                    {cli.honoreeName ? ` (${cli.honoreeName})` : ''}
                    {cli.partyDate ? ` - Festa ${formatDateBr(cli.partyDate)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Trava do Dia */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                border: formBlocksVenueDay
                  ? '1px solid rgba(220, 38, 38, 0.35)'
                  : '1px solid var(--adm-border, #E2E8F0)',
                background: formBlocksVenueDay ? 'rgba(239, 68, 68, 0.06)' : 'var(--adm-bg-muted, #F8FAFC)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {formBlocksVenueDay ? <Lock size={16} color="#DC2626" /> : <Unlock size={16} color="#64748B" />}
                <div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                    Travar dia da unidade na agenda comercial
                  </div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--adm-text-muted, #64748B)' }}>
                    Impede o Comercial de marcar visitas ou degustações nesta data enquanto o evento estiver ativo.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formBlocksVenueDay}
                onChange={(e) => setFormBlocksVenueDay(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#DC2626' }}
              />
            </label>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                Observações do Evento
              </label>
              <textarea
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Detalhes operacionais, montagem, horários especiais..."
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'var(--adm-bg-muted, #F8FAFC)',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '9px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'transparent',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                <CheckCircle2 size={15} /> {isSaving ? 'Salvando...' : editingEvent ? 'Salvar Alterações' : 'Cadastrar Evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      {deletingEvent && canManageEvents && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '14px',
              background: 'var(--adm-bg-surface, #FFFFFF)',
              border: '1px solid var(--adm-border, #E2E8F0)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626' }}>
              <XCircle size={20} />
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800 }}>Excluir Evento da Unidade?</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--adm-text-muted, #475569)' }}>
              Tem certeza que deseja remover <strong>{deletingEvent.title}</strong> ({formatDateBr(deletingEvent.eventDate)})? Caso o dia estivesse travado apenas por este evento, ele voltará a ficar disponível na agenda comercial.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border, #CBD5E1)',
                  background: 'transparent',
                  color: 'var(--adm-text-title, #0F172A)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Manter
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Excluir Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

