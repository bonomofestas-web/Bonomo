import React, { useEffect, useState } from 'react';
import { AlertTriangle, History, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Select } from '../ui';
import { contractService } from '../../services/contractService';
import { canChangeEventType } from '../../utils/accessPermissions';
import { normalizeEventKind, type EventKind } from '../../utils/contractTitle';
import type { Client, Collaborator } from '../../types/admin';

const KIND_OPTIONS: Array<{ value: EventKind; label: string }> = [
  { value: 'quinze_anos', label: '15 Anos' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'outro', label: 'Outro' },
];

const KIND_VALUE: Record<EventKind, string> = {
  quinze_anos: '15_anos', casamento: 'casamento', infantil: 'infantil', corporativo: 'corporativo', outro: 'outro',
};

const FIELD_LABEL: Record<string, string> = {
  guest_count: 'Convidados', event_date: 'Data da festa', event_type: 'Tipo do evento', contract_title: 'Nome do contrato',
};

const fmt = (field: string, v?: string | null) => {
  if (!v) return '—';
  if (field === 'event_date') { const [y, m, d] = v.split('T')[0].split('-'); return y && m && d ? `${d}/${m}/${y}` : v; }
  if (field === 'event_type') return KIND_OPTIONS.find(o => o.value === normalizeEventKind(v))?.label || v;
  return v;
};

interface RowProps {
  client: Client;
  masterId: string;
  user?: Partial<Collaborator> | null;
  rowStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  valueStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  onApplied: (patch: Partial<Client>) => void;
}

/** Linha "Tipo do evento": travada para quem nao e gerencia; para gerente pede alerta + motivo e regera o titulo. */
export const ClientEventTypeRow: React.FC<RowProps> = ({ client, masterId, user, rowStyle, labelStyle, valueStyle, selectStyle, onApplied }) => {
  const allowed = canChangeEventType(user);
  const current = normalizeEventKind(client.eventType);
  const [pending, setPending] = useState<EventKind | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    if (!pending) return;
    setSaving(true);
    const res = await contractService.updateCardField({
      clientId: client.id, masterId, field: 'event_type', value: KIND_VALUE[pending], reason,
      author: { id: user?.id, name: user?.name || 'Equipe', role: user?.role, ...(user as any) },
    });
    setSaving(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível alterar o tipo.'); return; }
    toast.success('Tipo do evento alterado. O nome do contrato foi atualizado.');
    onApplied({ eventType: KIND_VALUE[pending] });
    setPending(null); setReason('');
  };

  return (
    <>
      <div style={rowStyle}>
        <span style={labelStyle}>Tipo do Evento</span>
        <div style={valueStyle}>
          {allowed ? (
            <Select
              value={current}
              onChange={(e) => { const v = e.target.value as EventKind; if (v !== current) setPending(v); }}
              style={selectStyle}
            >
              {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <span title="Somente a gerência altera o tipo do evento (a mudança altera o contrato)" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              {KIND_OPTIONS.find(o => o.value === current)?.label}
              <Lock size={11} color="var(--adm-text-muted)" />
            </span>
          )}
        </div>
      </div>

      {pending && (
        <div style={{ margin: '4px 0 6px', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.10)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.74rem', color: 'var(--adm-text-title)', lineHeight: 1.4 }}>
            <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Mudar o tipo de <strong>{fmt('event_type', client.eventType)}</strong> para <strong>{KIND_OPTIONS.find(o => o.value === pending)?.label}</strong> altera o contrato também e regera o nome do card. O original fica no histórico.</span>
          </div>
          <textarea
            className="adm-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da mudança (obrigatório)"
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.78rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => { setPending(null); setReason(''); }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.74rem', color: 'var(--adm-text-title)' }}>Cancelar</button>
            <button type="button" disabled={saving || reason.trim().length < 3} onClick={apply} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#D97706', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem', opacity: saving || reason.trim().length < 3 ? 0.5 : 1 }}>
              {saving ? 'Salvando...' : 'Confirmar mudança'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/** Etiqueta discreta "contrato: N" quando o valor atual do card difere do contrato original. */
export const ContractOriginalTag: React.FC<{ clientId: string; masterId: string; field: 'guestCount' | 'eventDate'; current: number | string | undefined; refreshKey?: unknown }> = ({ clientId, masterId, field, current, refreshKey }) => {
  const [original, setOriginal] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    contractService.getCardContractInfo(clientId, masterId).then(info => {
      if (!alive || !info) return;
      setOriginal(field === 'guestCount' ? String(info.guestCount) : (info.eventDate ? info.eventDate.split('T')[0] : null));
    });
    return () => { alive = false; };
  }, [clientId, masterId, field, refreshKey]);
  const cur = field === 'guestCount' ? String(current ?? '') : String(current ?? '').split('T')[0];
  if (!original || original === cur || original === '0') return null;
  return (
    <span title="Valor do contrato original (o card guarda o valor atual)" style={{ fontSize: '0.64rem', padding: '1px 6px', borderRadius: 6, background: 'rgba(148,163,184,0.18)', color: 'var(--adm-text-muted)', whiteSpace: 'nowrap' }}>
      contrato: {fmt(field === 'guestCount' ? 'guest_count' : 'event_date', original)}
    </span>
  );
};

/** Aba/secao "Histórico de alterações" do card. */
export const ClientCardHistory: React.FC<{ clientId: string; masterId: string; refreshKey?: unknown }> = ({ clientId, masterId, refreshKey }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof contractService.getCardChanges>>>([]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    contractService.getCardChanges(clientId, masterId).then(r => { if (alive) setRows(r); });
    return () => { alive = false; };
  }, [open, clientId, masterId, refreshKey]);

  return (
    <div style={{ marginTop: 6 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
        <History size={13} color="var(--adm-accent)" /> Histórico de alterações {open ? '▾' : '▸'}
      </button>
      {open && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Nenhuma alteração registrada.</div>}
          {rows.map(r => (
            <div key={r.id} style={{ fontSize: '0.72rem', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
              <div style={{ color: 'var(--adm-text-title)' }}>
                <strong>{FIELD_LABEL[r.field] || r.field}:</strong> {fmt(r.field, r.oldValue)} → {fmt(r.field, r.newValue)}
              </div>
              <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.66rem' }}>
                {r.authorName || 'Equipe'}{r.authorRole ? ` (${r.authorRole})` : ''} · {new Date(r.createdAt).toLocaleString('pt-BR')}
              </div>
              {r.reason && <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.68rem', marginTop: 2 }}>Motivo: {r.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
