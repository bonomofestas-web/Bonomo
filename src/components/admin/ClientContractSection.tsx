import React, { useMemo, useRef, useState } from 'react';
import { FileText, Link2, Eye, Users, Calendar, CheckCircle2, CalendarPlus, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SafeAvatar } from './SafeAvatar';
import { DateField } from '../ui';
import { useAdminState } from '../../context/AdminStateContext';
import { contractService } from '../../services/contractService';
import { eventPeopleConfig } from '../../utils/eventPeople';
import { collectPhoneHolders, findPhoneConflict, duplicatePhoneMessage } from '../../utils/phoneDuplicates';
import { generateUuid } from '../../utils/uuid';
import { ClientEventTypeRow, ContractOriginalTag, ClientCardHistory } from './ClientCardChanges';
import { ContractQuickViewModal } from './ContractQuickViewModal';
import type { Client, Contract, LeadContact } from '../../types/admin';

interface Props {
  client: Client;
  contract: Contract | null;
  loading: boolean;
  masterId: string;
  readOnly?: boolean;
  onOpenLink: () => void;
}

const money = (v?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v || 0));

const card: React.CSSProperties = { background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 28 };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)', flexShrink: 0 };
const valueStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, justifyContent: 'flex-end', flexWrap: 'wrap' };
const inputStyle: React.CSSProperties = { background: 'transparent', border: 'none', borderBottom: '1px solid var(--adm-border)', color: 'var(--adm-text-title)', fontSize: '0.78rem', fontWeight: 700, outline: 'none', padding: '2px 0', minWidth: 0 };
const selectStyle: React.CSSProperties = { height: 30, fontSize: '0.76rem', borderRadius: 8, padding: '0 8px', minWidth: 140 };
const heading = (icon: React.ReactNode, text: string): React.ReactNode => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: 'var(--adm-text-title)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{icon}<span>{text}</span></div>
);

function resolveAvatarForPhone(_phone?: string, person?: any): string | undefined {
  if (person?.avatarUrl || person?.profile_picture_url || person?.profilePictureUrl) {
    return person.avatarUrl || person.profile_picture_url || person.profilePictureUrl;
  }
  return undefined;
}

/** Uma pessoa do evento: nome + WhatsApp (o numero vinculado vira aba de conversa no chat). */
const PersonRow: React.FC<{ label: string; placeholder: string; optional?: boolean; person?: LeadContact; readOnly?: boolean; onCommit: (name: string, phone: string) => void; onRemove?: () => void }> = ({ label, placeholder, optional, person, readOnly, onCommit, onRemove }) => {
  const [name, setName] = useState(person?.name || '');
  const [phone, setPhone] = useState(person?.phone || '');
  const commit = () => { if ((person?.name || '') !== name.trim() || (person?.phone || '') !== phone.trim()) onCommit(name.trim(), phone.trim()); };
  const avatarUrl = resolveAvatarForPhone(phone || person?.phone);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
      <div style={{ paddingBottom: 2, flexShrink: 0 }}>
        <SafeAvatar name={name || placeholder} src={avatarUrl} size={34} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', flex: 1, minWidth: 0 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>{label}{optional ? ' (opcional)' : ''}</span>
          <input style={inputStyle} disabled={readOnly} value={name} placeholder={placeholder} onChange={e => setName(e.target.value)} onBlur={commit} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>WhatsApp</span>
          <input style={inputStyle} disabled={readOnly} value={phone} placeholder="(00) 00000-0000" inputMode="tel" onChange={e => setPhone(e.target.value)} onBlur={commit} />
        </label>
        {onRemove && person && !readOnly ? (
          <button type="button" onClick={onRemove} title="Remover pessoa" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
        ) : <span style={{ width: 17 }} />}
      </div>
    </div>
  );
};

export const ClientContractSection: React.FC<Props> = ({ client, contract, loading, masterId, readOnly, onOpenLink }) => {
  const { updateClient, currentUser, venueEvents, venues } = useAdminState() as any;
  const [quickView, setQuickView] = useState(false);
  const [tick, setTick] = useState(0);
  const guestFocusRef = useRef<number | null>(null);
  const author = { id: currentUser?.id, name: currentUser?.name || 'Equipe', role: currentUser?.role };

  const config = useMemo(() => eventPeopleConfig(client.eventType), [client.eventType]);
  const contacts = (client.contacts || []) as LeadContact[];

  const personFor = (idx: number): LeadContact | undefined => {
    const slot = config.slots[idx];
    const nth = config.slots.slice(0, idx).filter(s => s.role === slot.role).length;
    return contacts.filter(c => c.role === slot.role)[nth];
  };

  const commitPerson = (idx: number, name: string, phone: string) => {
    const slot = config.slots[idx];
    const existing = personFor(idx);
    if (phone) {
      const conflict = findPhoneConflict(phone, collectPhoneHolders(client), existing?.id);
      if (conflict) { toast.error(duplicatePhoneMessage(conflict, 'cliente')); return; }
    }
    let next: LeadContact[];
    if (!name && !phone) next = contacts.filter(c => c.id !== existing?.id);
    else if (existing) next = contacts.map(c => (c.id === existing.id ? { ...c, name, phone } : c));
    else next = [...contacts, { id: generateUuid(), name, phone, role: slot.role, isPrimaryDecisionMaker: false } as LeadContact];
    updateClient(client.id, { contacts: next, ...(idx === 0 ? { birthdayPersonName: name } : {}) });
  };

  // ── Sem contrato: so o convite para vincular ──
  if (loading) {
    return <div style={{ ...card, color: 'var(--adm-text-muted)', fontSize: '0.74rem' }}>Carregando contrato...</div>;
  }
  if (!contract) {
    return (
      <div style={{ ...card, alignItems: 'flex-start', gap: 8, borderStyle: 'dashed' }}>
        {heading(<FileText size={13} color="#8B5CF6" />, 'Contrato')}
        <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>
          Este cliente ainda não tem contrato vinculado. Ao vincular, a ficha passa a mostrar o nome do contrato, as pessoas do evento, data, convidados e valores, e os arquivos entram em Documentos Contratuais.
        </div>
        {!readOnly && (
          <button type="button" onClick={onOpenLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
            <Link2 size={14} /> Vincular contrato
          </button>
        )}
      </div>
    );
  }

  // ── Com contrato ──
  const venueName = venues?.find((v: any) => v.id === (client.venueId || contract.venueId))?.name || client.venueName || contract.venueName || '—';
  const linkedEvents = (venueEvents || []).filter((ev: any) => ev.clientId === client.id);
  const canManageAgenda = !readOnly && (currentUser?.isDev || ['pos_venda', 'admin', 'master'].includes(currentUser?.role || ''));
  const eventDate = (client.eventDate || (client as any).partyDate || '').split('T')[0];

  const logChange = (field: 'guest_count' | 'event_date', oldValue: string, newValue: string) => {
    void contractService.logCardChange({ clientId: client.id, masterId, field, oldValue, newValue, author }).then(() => setTick(t => t + 1));
  };

  const openAgenda = () => {
    const people = config.slots.map((_, i) => personFor(i)).filter(Boolean).map(p => `${p!.name}${p!.phone ? ` (${p!.phone})` : ''}`).join(' · ');
    try {
      localStorage.setItem('f5_venue_event_prefill', JSON.stringify({
        clientId: client.id,
        venueId: client.venueId || contract.venueId || '',
        date: eventDate,
        eventType: client.eventType || contract.eventType || '',
        guestCount: client.guestCount || contract.guestCount || null,
        title: client.contractTitle || contract.contractTitle || '',
        people: people ? `Pessoas do evento: ${people}` : '',
      }));
    } catch { /* sem armazenamento: abre a agenda sem preenchimento */ }
    window.dispatchEvent(new CustomEvent('admin_switch_tab', { detail: { tab: 'venue-events' } }));
  };

  return (
    <>
      {/* Pessoas do evento (por tipo) */}
      <div style={card}>
        {heading(<Users size={13} color="#EC4899" />, config.heading)}
        {config.slots.map((slot, i) => {
          const person = personFor(i);
          // Segunda vaga opcional so aparece se a primeira estiver preenchida
          if (slot.optional && !personFor(0)) return null;
          return (
            <PersonRow
              key={`${slot.role}-${i}-${person?.id || 'new'}`}
              label={slot.label}
              placeholder={slot.placeholder}
              optional={slot.optional}
              person={person}
              readOnly={readOnly}
              onCommit={(n, p) => commitPerson(i, n, p)}
              onRemove={slot.optional ? () => commitPerson(i, '', '') : undefined}
            />
          );
        })}
      </div>

      {/* Evento */}
      <div style={card}>
        {heading(<Calendar size={13} color="#06B6D4" />, 'Evento')}

        <ClientEventTypeRow
          client={client}
          masterId={masterId}
          user={currentUser}
          rowStyle={rowStyle}
          labelStyle={labelStyle}
          valueStyle={valueStyle}
          selectStyle={selectStyle}
          onApplied={(patch) => { updateClient(client.id, patch); setTick(t => t + 1); }}
        />

        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={{ ...labelStyle, paddingTop: 6 }}>Data do evento</span>
          <div style={valueStyle}>
            <DateField
              disabled={readOnly}
              value={eventDate}
              onChange={(e: any) => {
                const next = e.target.value || '';
                logChange('event_date', eventDate, next);
                updateClient(client.id, { eventDate: next, partyDate: next });
              }}
              style={{ ...inputStyle, color: '#F59E0B' }}
            />
            <ContractOriginalTag clientId={client.id} masterId={masterId} field="eventDate" current={eventDate} refreshKey={tick} />
            {linkedEvents.length > 0 ? (
              <span title="Evento vinculado à agenda de eventos" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: '#059669', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 6 }}>
                <CheckCircle2 size={12} /> Na agenda
              </span>
            ) : canManageAgenda && eventDate ? (
              <button type="button" onClick={openAgenda} title="Cria o evento na agenda com o nome e as pessoas"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: '#0284C7', background: 'rgba(2,132,199,0.10)', border: '1px solid rgba(2,132,199,0.3)', padding: '2px 7px', borderRadius: 6, cursor: 'pointer' }}>
                <CalendarPlus size={12} /> Vincular à agenda
              </button>
            ) : null}
          </div>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Convidados</span>
          <div style={valueStyle}>
            <input
              type="number"
              disabled={readOnly}
              style={{ ...inputStyle, width: 70, textAlign: 'right' }}
              value={client.guestCount ?? contract.guestCount ?? 0}
              onFocus={() => { guestFocusRef.current = client.guestCount ?? contract.guestCount ?? 0; }}
              onChange={e => updateClient(client.id, { guestCount: Math.max(0, Number(e.target.value) || 0) })}
              onBlur={() => {
                const before = guestFocusRef.current; guestFocusRef.current = null;
                const now = client.guestCount ?? 0;
                if (before !== null && before !== now) logChange('guest_count', String(before), String(now));
              }}
            />
            <ContractOriginalTag clientId={client.id} masterId={masterId} field="guestCount" current={client.guestCount} refreshKey={tick} />
          </div>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Unidade</span>
          <div style={valueStyle}><Building2 size={12} color="#D4AF37" /><strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>{venueName}</strong></div>
        </div>

        <ClientCardHistory clientId={client.id} masterId={masterId} refreshKey={tick} />
      </div>

      {/* Contrato do sistema + valores */}
      <div style={card}>
        {heading(<FileText size={13} color="#8B5CF6" />, 'Contrato')}
        <div style={rowStyle}><span style={labelStyle}>Total</span><strong style={{ fontSize: '0.84rem', color: '#10B981' }}>{money(contract.totalAmount)}</strong></div>
        <div style={rowStyle}><span style={labelStyle}>Entrada</span><strong style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)' }}>{money(contract.entryAmount)}</strong></div>
        <div style={rowStyle}><span style={labelStyle}>Saldo</span><strong style={{ fontSize: '0.78rem', color: '#F59E0B' }}>{money(contract.balanceAmount)}</strong></div>
        <button type="button" onClick={() => setQuickView(true)}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input)', color: 'var(--adm-text-title)', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}>
          <Eye size={13} /> Ver contrato
        </button>
      </div>

      <ContractQuickViewModal contract={quickView ? contract : null} onClose={() => setQuickView(false)} />
    </>
  );
};
