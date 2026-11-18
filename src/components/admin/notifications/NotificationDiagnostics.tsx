import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { useNotifDiag } from '../../../utils/notificationDiag';

interface Props {
  onSendTest: () => void;
}

/** Diagnostico para master/dev: status do canal em tempo real, ultimas etapas e envio de teste. */
export const NotificationDiagnostics: React.FC<Props> = ({ onSendTest }) => {
  const { entries, channelStatus } = useNotifDiag();
  const [open, setOpen] = useState(false);
  const connected = channelStatus === 'SUBSCRIBED';

  return (
    <div style={{ border: '1px solid var(--adm-border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '10px 14px', marginTop: '8px' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted, #94A3B8)', fontSize: '0.78rem', fontWeight: 700 }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Activity size={14} /> Diagnóstico de notificações
        <span style={{ marginLeft: 'auto', color: connected ? '#10B981' : '#F59E0B' }}>
          Tempo real: {connected ? 'conectado' : channelStatus}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={onSendTest}
            style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid var(--adm-accent, #3B82F6)', background: 'var(--adm-accent-bg, rgba(59,130,246,0.12))', color: 'var(--adm-accent, #3B82F6)', fontSize: '0.74rem', fontWeight: 800,
            }}
          >
            <Send size={13} /> Enviar notificação de teste
          </button>
          <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
            O teste grava uma notificação real para você. Devem aparecer pop-up, som e +1 no sino.
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'monospace', fontSize: '0.68rem' }}>
            {entries.length === 0 && <span style={{ color: 'var(--adm-text-muted, #94A3B8)' }}>Nenhum evento registrado nesta sessão.</span>}
            {entries.map((e, i) => (
              <div key={`${e.at}-${i}`} style={{ color: e.ok ? 'var(--adm-text-title, #E2E8F0)' : '#EF4444' }}>
                {new Date(e.at).toLocaleTimeString('pt-BR')} [{e.stage}] {e.detail}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
