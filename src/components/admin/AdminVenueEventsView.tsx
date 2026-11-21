import { DateField, Select } from '../ui';
import { toLocalDateStr, getTodayLocalStr } from '../../utils/dateUtils';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarCheck2,
  Calendar as CalendarIcon,
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
  LayoutGrid,
  List as ListIcon,
  X,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { AdminTask, VenueEvent, VenueEventStatus } from '../../types/admin';
import { AdminCalendarMonthView } from './tasks/AdminCalendarMonthView';
import { buildVenueAccentMap } from '../../utils/venueColors';
import { agendaAvailabilityService } from '../../services/agendaAvailabilityService';
import { ContractQuickViewModal } from './ContractQuickViewModal';
import { AdminAgendaAvailabilityModal } from './AdminAgendaAvailabilityModal';
import { contractService } from '../../services/contractService';
import { canAccessContractFromAgenda } from '../../utils/accessPermissions';
import type { Contract } from '../../types/admin';
import { AdminCalendarWeekView } from './tasks/AdminCalendarWeekView';
import { AdminCalendarDayView } from './tasks/AdminCalendarDayView';

import { VENUE_DAY_TAKEN, venueDayTakenMessage } from '../../utils/venueEventDay';
import { eventTypeLabels } from '../../utils/roleLabels';

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
    appointments,
    venueAgendaConfigs,
    currentUser,
  } = useAdminState();

  // Regra de governança: Pós-Venda administra; Comercial visualiza apenas em modo leitura
  const canManageEvents = useMemo(() => {
    if (currentUser?.isDev) return true;
    const role = currentUser?.role || '';
    return role === 'pos_venda' || role === 'admin' || role === 'master';
  }, [currentUser?.role, currentUser?.isDev]);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wideHeader, setWideHeader] = useState(() => window.innerWidth >= 1500);
  useEffect(() => {
    const onResize = () => setWideHeader(window.innerWidth >= 1500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(() => document.getElementById('adm-header-actions'));
  useEffect(() => { setHeaderSlot(document.getElementById('adm-header-actions')); }, []);
  const [calendarScale, setCalendarScale] = useState<'month' | 'week' | 'day'>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);
  const navBtnStyle: React.CSSProperties = {
    padding: '5px 8px',
    borderRadius: '8px',
    border: '1px solid var(--adm-border, #CBD5E1)',
    background: 'var(--adm-bg-muted, #F8FAFC)',
    color: 'var(--adm-text-title, #0F172A)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  };
  const filterControlStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid var(--adm-border, #CBD5E1)',
    background: 'var(--adm-bg-surface, #FFFFFF)',
    color: 'var(--adm-text-title, #0F172A)',
    fontSize: '0.78rem',
    fontWeight: 600,
    outline: 'none',
  };
  const currentMonth = calendarDate;
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayLocalStr());
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
    const lockedDays = new Set(activeMonth.filter(ev => ev.status !== 'cancelled').map(ev => `${ev.venueId}:${ev.eventDate}`)).size;
    const linked = activeMonth.filter(ev => Boolean(ev.clientId)).length;
    const unlinked = activeMonth.filter(ev => !ev.clientId).length;
    return {
      totalMonth: activeMonth.length,
      lockedDays,
      linked,
      unlinked,
    };
  }, [monthEvents]);

  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter(ev => ev.eventDate === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Por padrao so os eventos; degustacoes e visitas aparecem quando o usuario liga os botoes
  const [showTastings, setShowTastings] = useState(false);
  const [showVisits, setShowVisits] = useState(false);

  const eventTasks = useMemo<AdminTask[]>(() => filteredEvents.map(ev => {
    let st = ev.startTime || '';
    let et = ev.endTime || '';
    if (st && st.includes('às')) {
      const parts = st.split('às').map(s => s.trim());
      st = parts[0] || '';
      if (!et) et = parts[1] || '';
    }
    return {
      id: ev.id,
      title: ev.title,
      dueDate: ev.eventDate,
      dueTime: st,
      endTime: et,
      status: ev.status === 'completed' ? 'completed' : ev.status === 'cancelled' ? 'cancelled' : 'todo',
      priority: 'none',
      type: 'meeting',
      customType: ev.eventType || 'Evento',
      createdById: ev.createdById || '',
      createdByName: ev.createdByName || '',
      assignedToIds: [],
      venueId: ev.venueId,
      createdAt: ev.createdAt || '',
    };
  }), [filteredEvents]);

  const addMinutes = (hhmm: string, mins: number) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    const total = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + mins);
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  };
  const isoLocal = (d: Date) => toLocalDateStr(d);

  // Duracao de cada agendamento = a configurada na agenda da casa (ex.: degustacao de 1h30)
  const configuredDuration = (venueId: string | undefined, type: 'tasting' | 'visit', date: string, time: string): number => {
    const cfg = venueAgendaConfigs.find(c => c.venueId === venueId);
    if (cfg && venueId) {
      const av = agendaAvailabilityService.getAvailableSlots(date, type, venueId, appointments, cfg, venueEvents);
      const slot = av.slots.find(sl => sl.time === time);
      if (slot?.durationMinutes) return slot.durationMinutes;
      if (av.slots[0]?.durationMinutes) return av.slots[0].durationMinutes;
    }
    return 60;
  };

  // Agendamentos (degustacao e visita) da mesma unidade, com a etiqueta do tipo e a duracao configurada
  const appointmentTasks = useMemo<AdminTask[]>(() => {
    if (!showTastings && !showVisits) return [];
    return (appointments || []).flatMap((a): AdminTask[] => {
      const cat = String(a.category || '').toLowerCase();
      const isTasting = cat.includes('degust');
      const isVisit = cat.includes('visit');
      if (!((isTasting && showTastings) || (isVisit && showVisits))) return [];
      if (['cancelled', 'canceled', 'cancelado'].includes(String(a.status || '').toLowerCase())) return [];
      if (effectiveVenueFilter !== 'all' && a.venueId && a.venueId !== effectiveVenueFilter) return [];
      const dur = configuredDuration(a.venueId, isTasting ? 'tasting' : 'visit', a.date, a.time);
      const who = a.leadName || a.debutanteName || '';
      return [{
        id: 'appt:' + a.id,
        title: who && !String(a.title || '').includes(who) ? a.title + ' • ' + who : (a.title || (isTasting ? 'Degustação' : 'Visita')),
        dueDate: a.date,
        dueTime: a.time,
        endTime: addMinutes(a.time, dur),
        status: 'todo',
        priority: 'none',
        type: 'meeting',
        customType: isTasting ? 'Degustação' : 'Visitação',
        createdById: '',
        createdByName: a.responsibleName || '',
        assignedToIds: [],
        venueId: a.venueId,
        createdAt: '',
      } as AdminTask];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, showTastings, showVisits, effectiveVenueFilter, venueAgendaConfigs, venueEvents]);

  // Janela em que a casa atende degustacao/visita no dia: do primeiro horario ate o ultimo + a duracao de cada um
  const availabilityTasks = useMemo<AdminTask[]>(() => {
    if (!showTastings && !showVisits) return [];
    const out: AdminTask[] = [];
    const first = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    first.setDate(first.getDate() - 7);
    const last = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    last.setDate(last.getDate() + 14);
    const todayStr = isoLocal(new Date());
    const types: Array<'tasting' | 'visit'> = [...(showTastings ? ['tasting' as const] : []), ...(showVisits ? ['visit' as const] : [])];
    for (const v of scopedVenues) {
      if (effectiveVenueFilter !== 'all' && v.id !== effectiveVenueFilter) continue;
      const cfg = venueAgendaConfigs.find(c => c.venueId === v.id);
      if (!cfg) continue;
      for (const type of types) {
        if (!agendaAvailabilityService.isCommitmentTypeConfigured(cfg, type)) continue;
        for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
          const ds = isoLocal(d);
          if (ds < todayStr) continue;
          const av = agendaAvailabilityService.getAvailableSlots(ds, type, v.id, appointments, cfg, venueEvents);
          if (!av.isDayAvailable || av.slots.length === 0) continue;
          const times = av.slots.map(sl => sl.time).sort();
          const dur = av.slots[0].durationMinutes || 60;
          const label = type === 'tasting' ? 'Degustação' : 'Visitação';
          const durLabel = dur % 60 === 0 ? (dur / 60) + 'h' : Math.floor(dur / 60) + 'h' + String(dur % 60).padStart(2, '0');
          out.push({
            id: 'slot:' + v.id + ':' + type + ':' + ds,
            title: label + ' disponível • ' + times.length + (times.length === 1 ? ' horário' : ' horários') + ' de ' + durLabel,
            dueDate: ds,
            dueTime: times[0],
            endTime: addMinutes(times[times.length - 1], dur),
            status: 'todo',
            priority: 'none',
            type: 'meeting',
            customType: label,
            createdById: '',
            createdByName: '',
            assignedToIds: [],
            venueId: v.id,
            createdAt: '',
          } as AdminTask);
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTastings, showVisits, calendarDate, scopedVenues, effectiveVenueFilter, venueAgendaConfigs, appointments, venueEvents]);

  const calendarTasks = useMemo<AdminTask[]>(() => [...eventTasks, ...availabilityTasks, ...appointmentTasks], [eventTasks, availabilityTasks, appointmentTasks]);

  // Cor por unidade: a escolhida na configuracao da casa; sem escolha, uma cor automatica estavel
  const venueAccent = useMemo(() => buildVenueAccentMap(scopedVenues), [scopedVenues]);
  // Etiqueta do tipo junto da casa: Evento, Degustação ou Visitação
  const accentFor = (t: AdminTask) => {
    const base = t.venueId ? venueAccent.get(t.venueId) : null;
    if (!base) return null;
    const tag = String(t.id).startsWith('appt:') || String(t.id).startsWith('slot:') ? (t.customType || 'Agendamento') : 'Evento';
    return { color: base.color, label: base.label + ' · ' + tag };
  };

  // Resumo do evento (vem do contrato): abre ao clicar no evento do calendario
  const [summary, setSummary] = useState<{ ev: VenueEvent; contract: Contract } | null>(null);
  const canOpenContract = canAccessContractFromAgenda(currentUser);

  const openEventFromCalendar = (task: AdminTask) => {
    if (String(task.id).startsWith('appt:') || String(task.id).startsWith('slot:')) {
      window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'post-sale-visits-tastings' } }));
      return;
    }
    const ev = filteredEvents.find(e => e.id === task.id);
    if (!ev) return;
    setSelectedDate(ev.eventDate);
    const masterId = currentUser?.masterId || currentUser?.id || '';
    if (ev.clientId && masterId) {
      void contractService.getContractByClientId(ev.clientId, masterId).then(ct => {
        if (ct) setSummary({ ev, contract: ct });
        else if (canManageEvents) openEditModal(ev); else setDrawerOpen(true);
      });
      return;
    }
    if (canManageEvents) openEditModal(ev); else setDrawerOpen(true);
  };

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
    setFormDate(presetDate || selectedDate || getTodayLocalStr());
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
    setFormStartTime(ev.startTime || '');
    setFormEndTime(ev.endTime || '');
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

  // Vindo de "Agendar na Casa" (ficha do cliente): abre o modal de nova festa ja preenchido
  useEffect(() => {
    if (!canManageEvents) return;
    let raw: string | null = null;
    try { raw = localStorage.getItem('f5_venue_event_prefill'); } catch { /* ignora */ }
    if (!raw) return;
    try { localStorage.removeItem('f5_venue_event_prefill'); } catch { /* ignora */ }
    try {
      const p = JSON.parse(raw) as { clientId?: string; venueId?: string; date?: string; eventType?: string; guestCount?: number | null; title?: string; people?: string };
      openCreateModal(p.date || undefined);
      if (p.venueId && scopedVenues.some(v => v.id === p.venueId)) setFormVenueId(p.venueId);
      if (p.clientId) handleSelectClientInForm(p.clientId);
      // Nome do evento e pessoas vindos da ficha do cliente (contrato vinculado)
      if (p.title) setFormTitle(p.title);
      if (p.people) setFormNotes(p.people);
      const kind = eventTypeLabels(p.eventType).kind;
      setFormEventType(kind === 'casamento' ? 'Casamento' : kind === 'aniversario' ? 'Festa Infantil' : '15 Anos / Debutante');
      if (p.guestCount) setFormGuestCount(String(p.guestCount));
      setFormStatus('scheduled'); // pendente ate a confirmacao
    } catch { /* prefill invalido: abre a agenda normalmente */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith(`${VENUE_DAY_TAKEN}:`)) {
        setFormError(venueDayTakenMessage(msg.slice(VENUE_DAY_TAKEN.length + 1)));
      } else {
        console.error('Erro ao salvar evento da unidade:', err);
        setFormError('Não foi possível salvar o evento. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canManageEvents || !deletingEvent) return;
    await deleteVenueEvent(deletingEvent.id);
    setDeletingEvent(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px 28px' }}>
      {headerSlot && createPortal(
        <>
        {/* Botão de Planejamento de Agendamento e Regras de Disponibilidade */}
        {(currentUser?.role === 'master' || currentUser?.role === 'admin' || (currentUser as any)?.role === 'manager' || canManageEvents) && (
          <button
            type="button"
            title="Planejamento de Agendamento (Grade e Regras de Disponibilidade)"
            aria-label="Planejamento de Agendamento"
            onClick={() => setIsAvailabilityModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            <Settings size={14} />
            <span>Disponibilidade</span>
          </button>
        )}

        <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {([['month', 'Mês', CalendarIcon], ['week', 'Semana', LayoutGrid], ['day', 'Dia', Clock], ['list', 'Lista', ListIcon]] as const).map(([mode, label, Icon]) => {
            const active = mode === 'list' ? viewMode === 'list' : viewMode === 'calendar' && calendarScale === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => { if (mode === 'list') { setViewMode('list'); } else { setViewMode('calendar'); setCalendarScale(mode); } setDrawerOpen(false); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: active ? '#FFFFFF' : 'transparent', color: active ? '#2563EB' : 'rgba(255,255,255,0.72)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                title={label}
                aria-label={label}
              >
                <Icon size={14} /> {wideHeader && <span>{label}</span>}
              </button>
            );
          })}
        </div>

        {canManageEvents && (
          <button
            type="button"
            onClick={() => openCreateModal(selectedDate)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', whiteSpace: 'nowrap' }}
          >
            <Plus size={15} /> Novo Evento
          </button>
        )}
        </>,
        headerSlot
      )}

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
            Agenda administrada pela equipe de Pós-Venda. Uma festa por dia por unidade. O time Comercial consulta as datas; visitas e degustações continuam liberadas em dias com festa, com aviso na hora de agendar.
          </span>
        </div>
      )}

      {/* Filtros e resumo do mes em uma unica linha */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px', maxWidth: '340px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '11px', top: '10px' }} />
          <input
            type="text"
            placeholder="Buscar evento, cliente ou tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...filterControlStyle, width: '100%', paddingLeft: '34px' }}
          />
        </div>
        <Select
          value={effectiveVenueFilter}
          disabled={Boolean(activeVenueId && activeVenueId !== 'all' && activeVenueId !== 'multi')}
          onChange={(e) => setVenueFilter(e.target.value)}
          style={filterControlStyle}
        >
          <option value="all">Todas as Unidades</option>
          {scopedVenues.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
        </Select>
        <Select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value as 'all' | 'linked' | 'unlinked')} style={filterControlStyle}>
          <option value="all">Todos os Vínculos</option>
          <option value="linked">Com Cliente Vinculado</option>
          <option value="unlinked">Sem Cliente (Avulso)</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | VenueEventStatus)} style={filterControlStyle}>
          <option value="all">Todos os Status</option>
          <option value="scheduled">Agendados</option>
          <option value="confirmed">Confirmados</option>
          <option value="completed">Realizados</option>
          <option value="cancelled">Cancelados</option>
        </Select>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { label: 'no mês', value: kpis.totalMonth, icon: CalendarIcon, color: '#2563EB' },
            { label: 'dias com festa', value: kpis.lockedDays, icon: Lock, color: '#DC2626' },
            { label: 'com cliente', value: kpis.linked, icon: UserCheck, color: '#059669' },
            { label: 'avulsos', value: kpis.unlinked, icon: Building2, color: '#7C3AED' },
          ].map(item => {
            const IconComp = item.icon;
            return (
              <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '999px', background: 'var(--adm-bg-surface, #FFFFFF)', border: '1px solid var(--adm-border, #E2E8F0)', fontSize: '0.74rem', color: 'var(--adm-text-muted, #64748B)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <IconComp size={12} color={item.color} />
                <strong style={{ color: 'var(--adm-text-title, #0F172A)', fontWeight: 800 }}>{item.value}</strong> {item.label}
              </span>
            );
          })}
        </div>
      </div>


      {summary && (
        <ContractQuickViewModal
          contract={summary.contract}
          eventStart={summary.ev.startTime}
          eventEnd={summary.ev.endTime}
          onClose={() => setSummary(null)}
          onAccessContract={canOpenContract ? () => {
            const id = summary.contract.id;
            setSummary(null);
            window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'contracts', contractId: id } }));
          } : undefined}
          onEditEvent={canManageEvents ? () => { const e = summary.ev; setSummary(null); openEditModal(e); } : undefined}
        />
      )}

      {viewMode === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {venueAccent.size > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 0 10px' }}>
              {Array.from(venueAccent.values()).map(a => (
                <span key={a.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', border: `1px solid ${a.color}55`, background: `${a.color}14`, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color }} /> {a.label}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 0 10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)' }}>Mostrar também:</span>
            {([['Degustações', showTastings, setShowTastings], ['Visitas', showVisits, setShowVisits]] as const).map(([label, on, set]) => (
              <button key={label} type="button" onClick={() => set(!on)} style={{ padding: '4px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, border: on ? '1px solid #2563EB' : '1px solid var(--adm-border, #CBD5E1)', background: on ? 'rgba(37,99,235,0.12)' : 'var(--adm-bg-surface, #FFFFFF)', color: on ? '#2563EB' : 'var(--adm-text-title, #0F172A)' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', ...(calendarScale === 'month' ? { minHeight: 'calc(100vh - 220px)' } : { height: 'calc(100vh - 220px)', minHeight: '520px' }), margin: '-16px -24px' }}>
            {calendarScale === 'month' && (
              <AdminCalendarMonthView
                expandCells
                openOnItemClick
                getTaskAccent={accentFor}
                tasks={calendarTasks}
                currentDate={calendarDate}
                onDateChange={setCalendarDate}
                onOpenTask={openEventFromCalendar}
                onSelectDay={(d) => { setCalendarDate(d); setSelectedDate(d.toLocaleDateString('en-CA')); setCalendarScale('day'); }}
              />
            )}
            {calendarScale === 'week' && (
              <AdminCalendarWeekView
                getTaskAccent={accentFor}
                tasks={calendarTasks}
                currentDate={calendarDate}
                onDateChange={setCalendarDate}
                onOpenTask={openEventFromCalendar}
                onNewTaskForDate={canManageEvents ? (dateStr) => openCreateModal(dateStr) : undefined}
              />
            )}
            {calendarScale === 'day' && (
              <AdminCalendarDayView
                startHour={0}
                endHour={23}
                getTaskAccent={accentFor}
                tasks={calendarTasks}
                currentDate={calendarDate}
                onDateChange={setCalendarDate}
                onOpenTask={openEventFromCalendar}
                onNewTaskForDate={canManageEvents ? (dateStr) => openCreateModal(dateStr) : undefined}
              />
            )}
          </div>

          {/* Gaveta lateral do dia selecionado */}
          <AnimatePresence>
          {drawerOpen && (
          <motion.aside
            key="day-drawer"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '64px',
              right: 0,
              bottom: 0,
              width: 'min(400px, 100vw)',
              zIndex: 60,
              overflowY: 'auto',
              padding: '16px',
              background: 'var(--adm-bg-surface, #FFFFFF)',
              borderLeft: '1px solid var(--adm-border, #E2E8F0)',
              boxShadow: '-12px 0 32px rgba(15, 23, 42, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted, #64748B)', textTransform: 'uppercase' }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)' }}>
                  {formatDateBr(selectedDate)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {canManageEvents && (
                  <button type="button" onClick={() => openCreateModal(selectedDate)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                    <Plus size={14} /> Neste dia
                  </button>
                )}
                <button type="button" aria-label="Fechar" onClick={() => setDrawerOpen(false)} style={{ ...navBtnStyle, padding: '6px' }}><X size={16} /></button>
              </div>
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
                          {isLocked ? 'Ocupa o dia (1 festa por dia)' : 'Cancelado'}
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
          </motion.aside>
          )}
          </AnimatePresence>
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
                        {isLocked ? 'Ocupa o dia' : 'Cancelado'}
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
                  {editingEvent ? 'Editar Evento na Agenda da Unidade' : 'Nova Festa / Evento na Unidade'}
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
                <Select
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
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Data do Evento *
                </label>
                <DateField
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
                <Select
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
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Status
                </label>
                <Select
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
                </Select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--adm-text-muted, #475569)' }}>
                  Início <span style={{ fontWeight: 500 }}>(vazio = dia inteiro)</span>
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
              <Select
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
              </Select>
            </div>

            {/* Regra de negocio: uma festa por dia por unidade; visitas e degustacoes seguem liberadas */}
            <div style={{
              padding: '10px 12px', borderRadius: '10px', fontSize: '0.74rem', lineHeight: 1.45,
              border: '1px solid var(--adm-border, #E2E8F0)', background: 'var(--adm-bg-muted, #F8FAFC)', color: 'var(--adm-text-muted, #64748B)',
            }}>
              Uma festa por dia por unidade. Visitas e degustações continuam liberadas nesta data; quem agenda recebe um aviso de que há festa no dia.
            </div>

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
              Tem certeza que deseja remover <strong>{deletingEvent.title}</strong> ({formatDateBr(deletingEvent.eventDate)})? O dia voltará a ficar livre para uma nova festa nesta unidade.
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
      {/* Modal de Planejamento de Agendamento e Grade de Disponibilidade */}
      {isAvailabilityModalOpen && (
        <AdminAgendaAvailabilityModal
          venueId={effectiveVenueFilter !== 'all' ? effectiveVenueFilter : (activeVenueId || undefined)}
          onClose={() => setIsAvailabilityModalOpen(false)}
        />
      )}
    </div>
  );
};

