import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Lock, Unlock, Plus, Clock, Building2, CheckCircle2, X } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import type { Client, VenueEventStatus } from '../../types/admin';

interface ClientVenueEventsCardProps {
  client?: Client;
  fallbackVenueId?: string;
  fallbackPartyDate?: string;
  fallbackGuestCount?: number;
  readOnly?: boolean;
}

const STATUS_LABELS: Record<VenueEventStatus, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Agendado', color: '#2563EB', bg: 'rgba(59, 130, 246, 0.12)' },
  confirmed: { label: 'Confirmado', color: '#059669', bg: 'rgba(16, 185, 129, 0.12)' },
  completed: { label: 'Realizado', color: '#7C3AED', bg: 'rgba(139, 92, 246, 0.12)' },
  cancelled: { label: 'Cancelado', color: '#DC2626', bg: 'rgba(239, 68, 68, 0.12)' },
};

const formatDateBr = (dateStr?: string) => {
  if (!dateStr) return '--/--/----';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

export const ClientVenueEventsCard: React.FC<ClientVenueEventsCardProps> = ({
  client,
  fallbackVenueId,
  fallbackPartyDate,
  fallbackGuestCount,
  readOnly = false,
}) => {
  const { venueEvents, addVenueEvent, venues, currentUser } = useAdminState();

  const canManage = useMemo(() => {
    if (readOnly) return false;
    if (currentUser?.isDev) return true;
    return ['pos_venda', 'admin', 'master'].includes(currentUser?.role || '');
  }, [readOnly, currentUser?.isDev, currentUser?.role]);

  const linkedEvents = useMemo(() => {
    if (!client?.id) return [];
    return venueEvents
      .filter(ev => ev.clientId === client.id)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [venueEvents, client?.id]);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venueId, setVenueId] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('01:00');
  const [blocksVenueDay, setBlocksVenueDay] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const openQuickForm = () => {
    if (!canManage || !client) return;
    setTitle(`Evento ${client.honoreeName || client.name}`);
    const defaultDate =
      (client.partyDate || client.eventDate || fallbackPartyDate || '').split('T')[0] ||
      new Date().toISOString().split('T')[0];
    setEventDate(defaultDate);
    setVenueId(client.venueId || fallbackVenueId || venues[0]?.id || '');
    setStartTime('19:00');
    setEndTime('01:00');
    setBlocksVenueDay(true);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !client || !venueId || !eventDate || !title.trim()) return;
    setIsSaving(true);
    try {
      const targetVenue = venues.find(v => v.id === venueId);
      await addVenueEvent({
        venueId,
        venueName: targetVenue?.name || client.venueName,
        clientId: client.id,
        clientName: client.name,
        title: title.trim(),
        eventType: '15 Anos / Debutante',
        eventDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        guestCount: client.guestCount || fallbackGuestCount,
        status: 'confirmed',
        blocksVenueDay,
      });
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!client) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'var(--adm-text-muted)',
          }}
        >
          <CalendarCheck2 size={13} color="#2563EB" />
          <span>Agenda de Eventos da Unidade ({linkedEvents.length})</span>
        </div>

        {canManage && !isAdding && (
          <button
            type="button"
            onClick={openQuickForm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(37, 99, 235, 0.35)',
              background: 'rgba(37, 99, 235, 0.10)',
              color: '#2563EB',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={11} /> Agendar na Casa
          </button>
        )}
      </div>

      <div
        style={{
          padding: '12px',
          borderRadius: '10px',
          background: 'var(--adm-bg-surface)',
          border: '1px solid var(--adm-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {isAdding && canManage && (
          <form
            onSubmit={handleSave}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--adm-bg-input)',
              border: '1px solid rgba(37, 99, 235, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                Registrar Evento na Unidade
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--adm-text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do evento"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--adm-border)',
                background: 'var(--adm-bg-surface)',
                color: 'var(--adm-text-title)',
                fontSize: '0.75rem',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <select
                required
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-surface)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.74rem',
                }}
              >
                <option value="">Unidade...</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-surface)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.74rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-surface)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.74rem',
                }}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg-surface)',
                  color: 'var(--adm-text-title)',
                  fontSize: '0.74rem',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={blocksVenueDay}
                onChange={(e) => setBlocksVenueDay(e.target.checked)}
                style={{ accentColor: '#DC2626' }}
              />
              Travar dia da unidade na agenda comercial
            </label>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 10px',
                borderRadius: '7px',
                border: 'none',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={13} /> {isSaving ? 'Salvando...' : 'Confirmar Evento'}
            </button>
          </form>
        )}

        {linkedEvents.length === 0 ? (
          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', textAlign: 'center', padding: '6px 0' }}>
            Nenhum evento vinculado na agenda da unidade para este cliente.
          </div>
        ) : (
          linkedEvents.map(ev => {
            const st = STATUS_LABELS[ev.status] || STATUS_LABELS.scheduled;
            const venueLabel = venues.find(v => v.id === ev.venueId)?.name || ev.venueName || 'Unidade';
            const locked = ev.blocksVenueDay !== false && ev.status !== 'cancelled';

            return (
              <div
                key={ev.id}
                style={{
                  padding: '9px 10px',
                  borderRadius: '8px',
                  background: 'var(--adm-bg-input)',
                  border: '1px solid var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                    {ev.title}
                  </span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '999px',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      background: st.bg,
                      color: st.color,
                    }}
                  >
                    {st.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.70rem', color: 'var(--adm-text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--adm-text-title)' }}>{formatDateBr(ev.eventDate)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Building2 size={11} /> {venueLabel}
                  </span>
                  {(ev.startTime || ev.endTime) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} /> {ev.startTime || '--:--'} - {ev.endTime || '--:--'}
                    </span>
                  )}
                </div>

                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      background: locked ? 'rgba(220, 38, 38, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                      color: locked ? '#DC2626' : '#64748B',
                    }}
                  >
                    {locked ? <Lock size={10} /> : <Unlock size={10} />}
                    {locked ? 'Dia da Casa Travado' : 'Sem Trava de Agenda'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

