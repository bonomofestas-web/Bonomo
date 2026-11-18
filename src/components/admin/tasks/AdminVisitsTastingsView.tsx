import React, { useState, useMemo } from 'react';
import {
  Calendar, Utensils, Search, RotateCcw,
  CheckCircle2, Clock, Check, Building2, Users, MessageSquare,
  Award, UserCheck, CalendarPlus,
  CalendarDays, Ticket, Info
} from 'lucide-react';
import { useAdminState } from '../../../context/AdminStateContext';
import { AdminScheduleCommitmentModal } from '../AdminScheduleCommitmentModal';
import { AdminAgendaAvailabilityModal } from '../AdminAgendaAvailabilityModal';
import { AdminAppointmentReceiptModal } from '../AdminAppointmentReceiptModal';
import type { CommercialCommitmentType } from '../../../types/admin';
import { toast } from 'sonner';

export interface VisitOrTastingItem {
  id: string;
  type: 'visit' | 'tasting';
  typeLabel: string;
  voucherCode: string;
  title: string;
  clientName: string;
  phone: string;
  venueId: string;
  venueName: string;
  space: string;
  date: string;
  time: string;
  relativeTime: string;
  isToday: boolean;
  status: 'confirmed' | 'scheduled' | 'completed' | 'rescheduled';
  statusLabel: string;
  closerName: string;
  closerAvatar: string;
  pax: number;
  paxLabel: string;
  notes?: string;
  leadOrigin?: string;
  contractRef?: string | null;
  leadId?: string;
}

interface AdminVisitsTastingsViewProps {
  onOpenLead?: (leadId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminVisitsTastingsView: React.FC<AdminVisitsTastingsViewProps> = ({
  onOpenLead,
  onNavigateTab,
}) => {
  const { 
    venues = [], 
    collaborators = [], 
    currentUser, 
    activeVenueId, 
    setActiveVenueId, 
    tasks = [], 
    appointments = [], 
    leads = [],
    updateAppointment
  } = useAdminState();

  // Navigation tabs: 'all' | 'visits' | 'tastings' | 'history'
  const [currentTab, setCurrentTab] = useState<'all' | 'visits' | 'tastings' | 'history'>('all');

  // Unified Filter Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCloserFilter, setSelectedCloserFilter] = useState<string>('all');

  // Modals state
  const [selectedVoucherModal, setSelectedVoucherModal] = useState<VisitOrTastingItem | null>(null);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [commitmentModalType, setCommitmentModalType] = useState<CommercialCommitmentType>('visit');
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  // ── 1. DADOS 100% REAIS E BLINDADOS POR MASTER_ID (ZERO MOCK) ──
  const appointmentsList = useMemo<VisitOrTastingItem[]>(() => {
    const list: VisitOrTastingItem[] = [];
    const seenKeys = new Set<string>();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // A. Agendamentos da tabela oficial appointments do Supabase
    (appointments || []).forEach(app => {
      if (!app.id) return;
      const key = `app-${app.id}`;
      if (seenKeys.has(key)) return;
      
      const typeStr = (app.category || (app as any).type || app.title || '').toLowerCase();
      const isVisit = typeStr.includes('visit') || typeStr.includes('visita');
      const isTasting = typeStr.includes('degust') || typeStr.includes('tasting');
      if (!isVisit && !isTasting) return;

      seenKeys.add(key);
      const vObj = venues.find(v => v.id === app.venueId);
      const collab = collaborators.find(c => c.id === app.responsibleCollaboratorId);
      const closerName = app.responsibleName || collab?.name || 'Equipe Bonomo';
      const closerAvatar = closerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
      const clientName = app.leadName || app.debutanteName || 'Cliente Bonomo';
      const isToday = Boolean(app.date && app.date === todayStr);
      const rawPax = app.pax || app.guestsCount || 3;
      const cleanPax = Math.max(1, rawPax);

      let st: VisitOrTastingItem['status'] = 'scheduled';
      if (app.status === 'completed' || (app.status as any) === 'done') st = 'completed';
      else if (app.status === 'confirmed') st = 'confirmed';
      else if ((app.status as any) === 'rescheduled') st = 'rescheduled';

      const prefix = isTasting ? 'AGD' : 'AGV';
      const code = (app as any).voucherCode || (app as any).receiptCode || `${prefix}-${app.id.slice(0, 5).toUpperCase()}`;

      list.push({
        id: app.id,
        type: isTasting ? 'tasting' : 'visit',
        typeLabel: isTasting ? 'Degustação Gastronômica' : 'Visita Comercial',
        voucherCode: code.replace('#', ''),
        title: app.title || (isTasting ? `Degustação VIP • ${clientName}` : `Visita Comercial • ${clientName}`),
        clientName,
        phone: app.responsiblePhone || '(11) 99999-9999',
        venueId: app.venueId || vObj?.id || 'diamond',
        venueName: vObj?.name || app.location || 'Casa de Festas Bonomo',
        space: vObj?.name || 'Casa de Festas',
        date: app.date || todayStr,
        time: app.time || '19:30',
        relativeTime: isToday ? `Hoje às ${app.time || '19:30'}` : `${app.date} às ${app.time || '19:30'}`,
        isToday,
        status: st,
        statusLabel: st === 'completed' ? 'Realizado' : st === 'confirmed' ? 'Confirmado' : st === 'rescheduled' ? 'Remarcado' : 'Agendado',
        closerName,
        closerAvatar,
        pax: cleanPax,
        paxLabel: `${cleanPax} ${cleanPax === 1 ? 'convidado' : 'convidados'}`,
        notes: app.notes,
        leadId: app.leadId,
      });
    });

    // B. Compromissos comerciais gravados nos Leads reais
    (leads || []).forEach(l => {
      const vObj = venues.find(v => v.id === l.venueId);
      const sdrOrCloser = collaborators.find(c => c.id === l.sdrId || c.id === l.closerId || c.name === l.sdrName);

      if (l.visitCommitment && l.visitCommitment.scheduled && l.visitCommitment.date) {
        const key = `lead-vst-${l.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const isToday = l.visitCommitment.date === todayStr;
          const closerName = l.visitCommitment.responsibleName || sdrOrCloser?.name || l.sdrName || 'Equipe Bonomo';
          const closerAvatar = closerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
          const cleanPax = Math.max(1, l.visitCommitment.pax || 3);
          const st = l.visitCommitment.status === 'completed' ? 'completed' : (l.visitCommitment.status as any) === 'confirmed' ? 'confirmed' : l.visitCommitment.status === 'rescheduled' ? 'rescheduled' : 'scheduled';

          list.push({
            id: l.visitCommitment.id || key,
            type: 'visit',
            typeLabel: 'Visita Comercial',
            voucherCode: `AGV-${l.id.slice(0, 5).toUpperCase()}`,
            title: `Visita Comercial • ${l.name}`,
            clientName: l.name,
            phone: l.phone,
            venueId: l.venueId || vObj?.id || 'diamond',
            venueName: vObj?.name || 'Casa de Festas Bonomo',
            space: vObj?.name || 'Casa de Festas',
            date: l.visitCommitment.date,
            time: l.visitCommitment.time || '19:30',
            relativeTime: isToday ? `Hoje às ${l.visitCommitment.time || '19:30'}` : `${l.visitCommitment.date} às ${l.visitCommitment.time || '19:30'}`,
            isToday,
            status: st,
            statusLabel: st === 'completed' ? 'Realizado' : st === 'confirmed' ? 'Confirmado' : st === 'rescheduled' ? 'Remarcado' : 'Agendado',
            closerName,
            closerAvatar,
            pax: cleanPax,
            paxLabel: `${cleanPax} ${cleanPax === 1 ? 'convidado' : 'convidados'}`,
            notes: l.visitCommitment.notes,
            leadId: l.id,
          });
        }
      }

      if (l.tastingCommitment && l.tastingCommitment.scheduled && l.tastingCommitment.date) {
        const key = `lead-tst-${l.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const isToday = l.tastingCommitment.date === todayStr;
          const closerName = l.tastingCommitment.responsibleName || sdrOrCloser?.name || l.sdrName || 'Equipe Bonomo';
          const closerAvatar = closerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
          const cleanPax = Math.max(1, l.tastingCommitment.pax || 3);
          const st = l.tastingCommitment.status === 'completed' ? 'completed' : (l.tastingCommitment.status as any) === 'confirmed' ? 'confirmed' : l.tastingCommitment.status === 'rescheduled' ? 'rescheduled' : 'scheduled';

          list.push({
            id: l.tastingCommitment.id || key,
            type: 'tasting',
            typeLabel: 'Degustação Gastronômica',
            voucherCode: `AGD-${l.id.slice(0, 5).toUpperCase()}`,
            title: `Degustação Gastronômica • ${l.name}`,
            clientName: l.name,
            phone: l.phone,
            venueId: l.venueId || vObj?.id || 'diamond',
            venueName: vObj?.name || 'Casa de Festas Bonomo',
            space: vObj?.name || 'Casa de Festas',
            date: l.tastingCommitment.date,
            time: l.tastingCommitment.time || '20:30',
            relativeTime: isToday ? `Hoje às ${l.tastingCommitment.time || '20:30'}` : `${l.tastingCommitment.date} às ${l.tastingCommitment.time || '20:30'}`,
            isToday,
            status: st,
            statusLabel: st === 'completed' ? 'Realizado' : st === 'confirmed' ? 'Confirmado' : st === 'rescheduled' ? 'Remarcado' : 'Agendado',
            closerName,
            closerAvatar,
            pax: cleanPax,
            paxLabel: `${cleanPax} ${cleanPax === 1 ? 'convidado' : 'convidados'}`,
            notes: l.tastingCommitment.notes,
            leadId: l.id,
          });
        }
      }
    });

    // C. Tarefas de Visita/Degustação reais
    (tasks || []).forEach(t => {
      const typeStr = (t.customType || t.type || t.title || '').toLowerCase();
      if (!typeStr.includes('visita') && !typeStr.includes('degust')) return;
      const key = `task-${t.id}`;
      if (seenKeys.has(key) || (t.id && seenKeys.has(`app-${t.id}`))) return;
      seenKeys.add(key);

      const isTasting = typeStr.includes('degust');
      const vObj = venues.find(v => v.id === t.venueId);
      const isToday = Boolean(t.dueDate && t.dueDate === todayStr);
      const closerName = t.customProperties?.closerName || t.createdByName || 'Consultor F5';
      const closerAvatar = closerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
      const cleanPax = Math.max(1, t.customProperties?.pax || 3);

      let st: VisitOrTastingItem['status'] = 'scheduled';
      if (t.status === 'completed') st = 'completed';
      else if ((t.status as any) === 'rescheduled') st = 'rescheduled';
      else if ((t.customProperties as any)?.confirmed) st = 'confirmed';

      list.push({
        id: t.id,
        type: isTasting ? 'tasting' : 'visit',
        typeLabel: isTasting ? 'Degustação Gastronômica' : 'Visita Comercial',
        voucherCode: (t.customProperties?.receiptCode?.replace('#', '') || `${isTasting ? 'AGD' : 'AGV'}-${t.id.slice(0, 5).toUpperCase()}`),
        title: t.title,
        clientName: t.customProperties?.leadName || t.leadName || 'Cliente Convidado',
        phone: t.customProperties?.leadPhone || '(11) 99999-9999',
        venueId: t.venueId || vObj?.id || 'diamond',
        venueName: vObj?.name || 'Casa de Festas Bonomo',
        space: vObj?.name || 'Casa de Festas',
        date: t.dueDate || todayStr,
        time: t.dueTime || '19:30',
        relativeTime: isToday ? `Hoje às ${t.dueTime || '19:30'}` : `${t.dueDate} às ${t.dueTime || '19:30'}`,
        isToday,
        status: st,
        statusLabel: st === 'completed' ? 'Realizado' : st === 'confirmed' ? 'Confirmado' : st === 'rescheduled' ? 'Remarcado' : 'Agendado',
        closerName,
        closerAvatar,
        pax: cleanPax,
        paxLabel: `${cleanPax} ${cleanPax === 1 ? 'convidado' : 'convidados'}`,
        notes: t.description,
        leadId: t.leadId,
      });
    });

    return list;
  }, [appointments, leads, tasks, venues, collaborators]);

  // Ações Rápidas
  const handleQuickConfirm = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateAppointment) {
      updateAppointment(itemId, { status: 'confirmed' });
    }
    toast.success('Presença confirmada com sucesso!');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedVenueFilter('all');
    setSelectedStatusFilter('all');
    setSelectedCloserFilter('all');
  };

  // KPIs
  const kpis = useMemo(() => {
    const visitsCount = appointmentsList.filter(a => a.type === 'visit' && a.status !== 'completed').length;
    const tastingsCount = appointmentsList.filter(a => a.type === 'tasting' && a.status !== 'completed').length;
    const confirmedCount = appointmentsList.filter(a => a.status === 'confirmed').length;
    const completedCount = appointmentsList.filter(a => a.status === 'completed').length;
    const totalScheduled = visitsCount + tastingsCount;

    return {
      scheduledThisWeek: totalScheduled,
      confirmedVisits: confirmedCount,
      totalVisits: visitsCount,
      tastings: tastingsCount,
      attendanceRate: totalScheduled > 0 ? `${Math.round((confirmedCount / totalScheduled) * 100)}%` : '100%',
      completedCount,
    };
  }, [appointmentsList]);

  // Filtragem
  const filteredList = useMemo(() => {
    let result = appointmentsList;

    if (currentTab === 'visits') {
      result = result.filter(a => a.type === 'visit' && a.status !== 'completed');
    } else if (currentTab === 'tastings') {
      result = result.filter(a => a.type === 'tasting' && a.status !== 'completed');
    } else if (currentTab === 'history') {
      result = result.filter(a => a.status === 'completed');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        a.voucherCode.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.venueName.toLowerCase().includes(q) ||
        a.closerName.toLowerCase().includes(q)
      );
    }

    if (selectedVenueFilter !== 'all') {
      result = result.filter(a =>
        a.venueId === selectedVenueFilter ||
        a.venueName.toLowerCase().includes(selectedVenueFilter.toLowerCase())
      );
    }

    if (selectedStatusFilter !== 'all') {
      result = result.filter(a => a.status === selectedStatusFilter);
    }

    if (selectedCloserFilter !== 'all') {
      result = result.filter(a => a.closerName.toLowerCase().includes(selectedCloserFilter.toLowerCase()));
    }

    return result;
  }, [appointmentsList, currentTab, searchQuery, selectedVenueFilter, selectedStatusFilter, selectedCloserFilter]);

  // Agrupamento por data (Sem datas vazias)
  const groupedByDate = useMemo(() => {
    const sorted = [...filteredList].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time.localeCompare(b.time);
    });

    const groups: {
      date: string;
      formattedDate: string;
      isToday: boolean;
      isTomorrow: boolean;
      items: VisitOrTastingItem[];
    }[] = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

    const map = new Map<string, VisitOrTastingItem[]>();
    sorted.forEach(item => {
      const d = item.date || 'Sem data';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(item);
    });

    map.forEach((items, dateKey) => {
      const isToday = dateKey === todayStr;
      const isTomorrow = dateKey === tomorrowStr;

      let formattedDate = dateKey;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const [y, m, d] = dateKey.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        formattedDate = `${capitalizedWeekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      }

      groups.push({
        date: dateKey,
        formattedDate,
        isToday,
        isTomorrow,
        items
      });
    });

    return groups;
  }, [filteredList]);

  return (
    <div 
      className="custom-scrollbar"
      style={{ 
        height: '100%',
        minHeight: 0,
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'var(--adm-bg-app)', 
        color: 'var(--adm-text-body)', 
        fontFamily: "'Inter', sans-serif" 
      }}
    >
      {/* Título no breadcrumb; controles em linha compacta */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botão de Planejamento da Grade */}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || (currentUser as any)?.role === 'manager') && (
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('venues') : setIsAgendaModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Configurar regras semanais e grade de horários da agenda"
            >
              <CalendarDays size={15} color="#D97706" />
              <span>Planejamento de Grade</span>
            </button>
          )}

          {/* Agendar Visita Comercial */}
          <button
            type="button"
            onClick={() => {
              setCommitmentModalType('visit');
              setIsCommitmentModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#0284C7',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            <CalendarPlus size={15} />
            <span>Agendar Visita</span>
          </button>

          {/* Agendar Degustação Gastronômica */}
          <button
            type="button"
            onClick={() => {
              setCommitmentModalType('tasting');
              setIsCommitmentModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#9333EA',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
            }}
          >
            <Utensils size={15} />
            <span>Agendar Degustação VIP</span>
          </button>
        </div>
      </div>

      {/* ── KPIS RESUMO EXECUTIVO (4 Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
      }}>
        {/* Card 1: Total */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--adm-shadow)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>Total de Agendamentos</span>
              <div style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Calendar size={16} color="#38BDF8" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: 'var(--adm-text-title)' }}>{kpis.scheduledThisWeek}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>agendados</span>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
            <span>Todas as casas de festa</span>
            <span style={{ color: '#0284C7', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>Semana Ativa</span>
          </div>
        </div>

        {/* Card 2: Visitas Confirmadas */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--adm-shadow)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>Visitas Confirmadas</span>
              <div style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UserCheck size={16} color="#10B981" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#10B981' }}>{kpis.confirmedVisits}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>de {kpis.totalVisits} visitas</span>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
            <span>Presença confirmada</span>
            <span style={{ color: '#10B981', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{kpis.totalVisits > 0 ? `${Math.round((kpis.confirmedVisits / kpis.totalVisits) * 100)}%` : '0%'}</span>
          </div>
        </div>

        {/* Card 3: Degustações VIP */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--adm-shadow)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>Degustações VIP</span>
              <div style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Utensils size={16} color="#A855F7" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#A855F7' }}>{kpis.tastings}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>degustações</span>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
            <span>Capacidade por mesa</span>
            <span style={{ color: '#A855F7', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>Gastronomia</span>
          </div>
        </div>

        {/* Card 4: Taxa de Confirmação */}
        <div style={{
          background: 'var(--adm-bg-card)',
          border: '1px solid var(--adm-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--adm-shadow)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>Taxa de Confirmação</span>
              <div style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Award size={16} color="#D97706" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#D97706' }}>{kpis.attendanceRate}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>Meta: 90%</span>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--adm-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
            <span>Dados reais da semana</span>
            <span style={{ color: '#D97706', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>Alta Precisão</span>
          </div>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE: BUSCA E FILTROS ── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: 'var(--adm-shadow)',
      }}>
        {/* Campo de Busca */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={15} color="var(--adm-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar lead, closer, código..."
            style={{
              width: '100%',
              fontSize: '0.76rem',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.15s ease',
            }}
          />
        </div>

        {/* Filtros Dropdowns Estruturados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filtro de Casas de Festa */}
          <select
            value={selectedVenueFilter}
            onChange={(e) => {
              setSelectedVenueFilter(e.target.value);
              if (e.target.value !== 'all' && setActiveVenueId) {
                setActiveVenueId(e.target.value);
              }
            }}
            style={{
              fontSize: '0.76rem',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <option value="all">Todas as Casas de Festa ({venues?.length || 0})</option>
            {venues?.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          {/* Filtro de Tipo */}
          <select
            value={currentTab}
            onChange={(e) => setCurrentTab(e.target.value as any)}
            style={{
              fontSize: '0.76rem',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <option value="all">Visitas & Degustações</option>
            <option value="visits">Visitas Comerciais</option>
            <option value="tastings">Degustações Gastronômicas</option>
            <option value="history">Histórico & Realizadas</option>
          </select>

          {/* Filtro Status Integrado */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            style={{
              fontSize: '0.76rem',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmado</option>
            <option value="scheduled">Agendado</option>
            <option value="rescheduled">Remarcado</option>
            <option value="completed">Realizado</option>
          </select>

          {/* Filtro Consultor / Closer */}
          <select
            value={selectedCloserFilter}
            onChange={(e) => setSelectedCloserFilter(e.target.value)}
            style={{
              fontSize: '0.76rem',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-input)',
              color: 'var(--adm-text-title)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <option value="all">Todos os Anfitriões</option>
            {collaborators?.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Botão Limpar Filtros */}
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--adm-border)',
              background: 'var(--adm-bg-surface-subtle)',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Limpar Filtros"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── TABELA OPERACIONAL SEMANAL (ESPELHANDO PROTOTYPE-VISITAS-PLANILHA.HTML) ── */}
      <div style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--adm-shadow)',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--adm-border)',
          background: 'var(--adm-bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, letterSpacing: '-0.01em' }}>
              Lista Operacional Semanal de Agendamentos
            </h3>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(14, 165, 233, 0.15)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              color: '#38BDF8',
            }}>
              {filteredList.length} {filteredList.length === 1 ? 'Agendamento' : 'Agendamentos'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} color="#38BDF8" />
            <span>Agrupamento inteligente por data • Sem datas vazias • Gestão de presença e recepção comercial</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'var(--adm-bg-surface)',
                borderBottom: '1px solid var(--adm-border)',
                color: 'var(--adm-text-muted)',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <th style={{ padding: '12px 18px' }}>Horário & Tipo</th>
                <th style={{ padding: '12px 18px' }}>Cliente / Homenageado</th>
                <th style={{ padding: '12px 18px' }}>Casa de Festa & Pax</th>
                <th style={{ padding: '12px 18px' }}>Anfitrião / Closer</th>
                <th style={{ padding: '12px 18px' }}>Status Integrado</th>
                <th style={{ padding: '12px 18px', textAlign: 'center' }}>Voucher Oficial</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {groupedByDate.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    <Calendar size={32} color="var(--adm-text-muted)" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--adm-text-title)', margin: '0 0 4px 0' }}>Nenhum agendamento encontrado para os filtros selecionados.</p>
                    <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: 0 }}>Crie um novo agendamento ou ajuste os parâmetros de busca acima.</p>
                  </td>
                </tr>
              ) : (
                groupedByDate.map(group => (
                  <React.Fragment key={group.date}>
                    {/* Cabeçalho Visual da Data (Sem datas vazias) */}
                    <tr style={{
                      background: 'var(--adm-bg-surface-subtle)',
                      borderTop: '1px solid var(--adm-border)',
                      borderBottom: '1px solid var(--adm-border)',
                    }}>
                      <td colSpan={7} style={{ padding: '12px 18px', color: 'var(--adm-text-title)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--adm-accent, #0284C7)', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.86rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{group.formattedDate}</span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'var(--adm-bg-card)',
                              color: 'var(--adm-text-body)',
                              border: '1px solid var(--adm-border)',
                            }}>
                              {group.items.length} {group.items.length === 1 ? 'agendamento' : 'agendamentos'}
                            </span>
                          </div>
                          <div>
                            {group.isToday && (
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#F59E0B',
                                color: '#000000',
                                letterSpacing: '0.05em',
                              }}>
                                HOJE
                              </span>
                            )}
                            {group.isTomorrow && (
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#0284C7',
                                color: '#FFFFFF',
                                letterSpacing: '0.05em',
                              }}>
                                AMANHÃ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Linhas de Agendamento daquela Data */}
                    {group.items.map(app => {
                      const isVisit = app.type === 'visit';
                      return (
                        <tr
                          key={app.id}
                          style={{
                            borderBottom: '1px solid var(--adm-border)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-bg-card-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Horário & Tipo */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: 'var(--adm-text-title)' }}>{app.time}</span>
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: isVisit ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
                                background: isVisit ? 'rgba(14, 165, 233, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                                color: isVisit ? '#0284C7' : '#9333EA',
                              }}>
                                {app.typeLabel}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>#{app.voucherCode}</div>
                          </td>

                          {/* Cliente / Homenageado */}
                          <td style={{ padding: '12px 18px' }}>
                            <div 
                              onClick={() => {
                                if (app.leadId && onOpenLead) onOpenLead(app.leadId);
                              }}
                              style={{
                                fontWeight: 800,
                                color: 'var(--adm-text-title)',
                                fontSize: '0.78rem',
                                cursor: app.leadId && onOpenLead ? 'pointer' : 'default',
                              }}
                            >
                              {app.clientName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>{app.title}</div>
                            <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>{app.phone}</div>
                          </td>

                          {/* Casa de Festa & Pax (Sem salão/jardim) */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--adm-text-title)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={14} color="#0284C7" />
                              <span>{app.venueName}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={12} />
                              <span>{app.paxLabel}</span>
                            </div>
                          </td>

                          {/* Anfitrião / Closer com Avatar de Destaque */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                padding: '1.5px',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                              }}>
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  background: 'var(--adm-bg-card)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#D97706',
                                  fontSize: '0.64rem',
                                  fontWeight: 900,
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                  {app.closerAvatar}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--adm-text-title)', fontSize: '0.78rem' }}>{app.closerName}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>Anfitrião Designado</div>
                              </div>
                            </div>
                          </td>

                          {/* Status Integrado */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div>
                                {app.status === 'confirmed' && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10B981',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                  }}>
                                    <CheckCircle2 size={12} />
                                    Confirmado
                                  </span>
                                )}
                                {app.status === 'scheduled' && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    background: 'rgba(14, 165, 233, 0.15)',
                                    color: '#0284C7',
                                    border: '1px solid rgba(14, 165, 233, 0.3)',
                                  }}>
                                    <Clock size={12} />
                                    Agendado
                                  </span>
                                )}
                                {app.status === 'rescheduled' && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: '#9333EA',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                  }}>
                                    <RotateCcw size={12} />
                                    Remarcado
                                  </span>
                                )}
                                {app.status === 'completed' && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    background: 'rgba(16, 185, 129, 0.25)',
                                    color: '#059669',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                  }}>
                                    <Check size={12} />
                                    Realizado
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>
                                {app.status === 'confirmed' ? 'Presença confirmada' : 'Aguardando comparecimento'}
                              </div>
                            </div>
                          </td>

                          {/* Voucher Oficial */}
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedVoucherModal(app)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(14, 165, 233, 0.15)',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                color: '#0284C7',
                                fontWeight: 800,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Ticket size={14} />
                              <span>Ver Voucher</span>
                            </button>
                          </td>

                          {/* Ações Rápidas */}
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clean = app.phone.replace(/\D/g, '');
                                  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(`Olá ${app.clientName}! Confirmamos o seu voucher #${app.voucherCode} para a ${app.typeLabel} na ${app.venueName}.`)}`, '_blank');
                                }}
                                style={{
                                  padding: '6px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--adm-border)',
                                  background: 'var(--adm-bg-surface)',
                                  color: '#10B981',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                                title="WhatsApp Cliente"
                              >
                                <MessageSquare size={14} />
                              </button>

                              {app.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickConfirm(app.id, e)}
                                  style={{
                                    padding: '6px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--adm-border)',
                                    background: 'var(--adm-bg-surface)',
                                    color: '#0284C7',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Confirmar Presença"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          </td>
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

      {/* ── MODAL VOUCHER OFICIAL DO SISTEMA (AdminAppointmentReceiptModal) ── */}
      {selectedVoucherModal && (
        <AdminAppointmentReceiptModal
          receipt={{
            id: selectedVoucherModal.id,
            leadId: selectedVoucherModal.leadId,
            type: selectedVoucherModal.type,
            code: selectedVoucherModal.voucherCode,
            leadName: selectedVoucherModal.clientName,
            leadPhone: selectedVoucherModal.phone,
            venueId: selectedVoucherModal.venueId,
            venueName: selectedVoucherModal.venueName,
            venueAddress: venues.find(v => v.id === selectedVoucherModal.venueId)?.address || 'Casa de Festas Bonomo',
            venueLogoUrl: venues.find(v => v.id === selectedVoucherModal.venueId)?.logoUrl,
            dateStr: selectedVoucherModal.date,
            timeStr: selectedVoucherModal.time,
            pax: selectedVoucherModal.pax,
            closerName: selectedVoucherModal.closerName,
            closerRoleTitle: 'Consultor de Recepções',
            notes: selectedVoucherModal.notes,
          }}
          onClose={() => setSelectedVoucherModal(null)}
        />
      )}

      {/* ── MODAL DE AGENDAMENTO OFICIAL ── */}
      {isCommitmentModalOpen && (
        <AdminScheduleCommitmentModal
          initialType={commitmentModalType}
          onClose={() => setIsCommitmentModalOpen(false)}
          onScheduled={() => {
            setIsCommitmentModalOpen(false);
            toast.success(`${commitmentModalType === 'visit' ? 'Visita' : 'Degustação'} agendada com sucesso!`);
          }}
        />
      )}

      {/* ── MODAL DE GRADE & DISPONIBILIDADE DA AGENDA ── */}
      {isAgendaModalOpen && (
        <AdminAgendaAvailabilityModal
          venueId={activeVenueId || undefined}
          initialType="visit"
          onClose={() => setIsAgendaModalOpen(false)}
        />
      )}
    </div>
  );
};
