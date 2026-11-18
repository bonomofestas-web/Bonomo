import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText, MessageCircle, CalendarClock, ListChecks, Eye } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { leadService } from '../../services/leadService';
import { AdminLeadInspector } from './AdminLeadInspector';
import { WhatsAppAudioMessage } from './WhatsAppAudioMessage';
import type { Lead, LeadActivity } from '../../types/admin';

interface Props {
  lead: Lead;
  onClose: () => void;
}

type Tab = 'ficha' | 'conversa' | 'agenda';

const stripMediaPrefix = (t?: string) => (t || '').replace(/^\[media:[^\]]*\]\s*/i, '').trim();

/**
 * Visualizacao somente leitura de um lead de outro colaborador: ficha, historico da conversa e
 * agendamentos/tarefas, para entender como foi o atendimento. Nao envia nem altera nada.
 */
export const AdminLeadReadOnlyModal: React.FC<Props> = ({ lead, onClose }) => {
  const { appointments, tasks } = useAdminState();
  const [tab, setTab] = useState<Tab>('ficha');
  const [activities, setActivities] = useState<LeadActivity[] | null>(null);

  // Historico carregado sob demanda (as listas do app nao carregam mensagens de todos os leads)
  useEffect(() => {
    if (tab !== 'conversa' || activities !== null) return;
    let cancelled = false;
    leadService
      .getOlderActivitiesForLead(lead.id, new Date(Date.now() + 60_000).toISOString(), 300)
      .then(list => { if (!cancelled) setActivities(list); });
    return () => { cancelled = true; };
  }, [tab, lead.id, activities]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const messages = useMemo(
    () => (activities || []).filter(a => a.type === 'contact' && (a.text || a.mediaUrl)),
    [activities],
  );
  const leadAppointments = useMemo(
    () => (appointments || []).filter(a => a.leadId === lead.id).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    [appointments, lead.id],
  );
  const leadTasks = useMemo(
    () => (tasks || []).filter(t => t.leadId === lead.id),
    [tasks, lead.id],
  );

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode): React.ReactNode => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', cursor: 'pointer',
        background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: tab === id ? 800 : 600,
        color: tab === id ? 'var(--adm-accent, #14A9D7)' : 'var(--adm-text-muted, #94A3B8)',
        borderBottom: `2px solid ${tab === id ? 'var(--adm-accent, #14A9D7)' : 'transparent'}`,
      }}
    >
      {icon}{label}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)', height: 'min(88vh, 900px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--adm-bg-app, #0B111E)', border: '1px solid var(--adm-border, rgba(255,255,255,0.1))',
          borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0 14px', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--adm-text-title, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
              <Eye size={12} /> Somente leitura{lead.assignedTo ? ` • Responsável: ${lead.assignedTo}` : ''}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted, #94A3B8)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--adm-border, rgba(255,255,255,0.1))', padding: '0 8px' }}>
          {tabBtn('ficha', 'Ficha', <FileText size={14} />)}
          {tabBtn('conversa', 'Conversa', <MessageCircle size={14} />)}
          {tabBtn('agenda', 'Agendamentos', <CalendarClock size={14} />)}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {tab === 'ficha' && (
            <AdminLeadInspector lead={lead} onClose={onClose} onStageChange={() => {}} readOnly isModal />
          )}

          {tab === 'conversa' && (
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activities === null && <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>Carregando conversa...</div>}
              {activities !== null && messages.length === 0 && (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '32px 0' }}>Nenhuma mensagem registrada.</div>
              )}
              {messages.map(m => {
                const incoming = /recebid/i.test(m.title || '');
                const time = new Date(m.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                const caption = stripMediaPrefix(m.text);
                return (
                  <div key={m.id} style={{ alignSelf: incoming ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                    <div style={{
                      padding: '8px 12px', borderRadius: '12px', fontSize: '0.82rem', lineHeight: 1.4,
                      background: incoming ? 'var(--adm-bg-card, #111C2E)' : 'rgba(20,169,215,0.16)',
                      border: '1px solid var(--adm-border, rgba(255,255,255,0.08))', color: 'var(--adm-text-title, #fff)',
                    }}>
                      {m.mediaType === 'audio' && m.mediaUrl ? (
                        <WhatsAppAudioMessage src={m.mediaUrl} isIncoming={incoming} authorName={m.authorName} formattedTime={time} />
                      ) : m.mediaType === 'image' && m.mediaUrl ? (
                        <img src={m.mediaUrl} alt="Imagem da conversa" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                      ) : m.mediaUrl ? (
                        <a href={m.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent, #14A9D7)', fontWeight: 700 }}>
                          Abrir {m.mediaType === 'video' ? 'vídeo' : 'arquivo'}
                        </a>
                      ) : null}
                      {caption && !(m.mediaType === 'audio') && <div style={{ whiteSpace: 'pre-wrap', marginTop: m.mediaUrl ? '6px' : 0 }}>{caption}</div>}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted, #94A3B8)', marginTop: '2px', textAlign: incoming ? 'left' : 'right' }}>
                      {incoming ? lead.name : m.authorName} • {time}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'agenda' && (
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leadAppointments.length === 0 && leadTasks.length === 0 && (
                <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '32px 0' }}>Sem agendamentos ou tarefas para este lead.</div>
              )}
              {leadAppointments.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'var(--adm-bg-card, #111C2E)', border: '1px solid var(--adm-border, rgba(255,255,255,0.08))' }}>
                  <CalendarClock size={16} color="#3B82F6" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title, #fff)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                      {new Date(`${a.date}T12:00:00`).toLocaleDateString('pt-BR')} {a.time} • {a.status}
                    </div>
                  </div>
                </div>
              ))}
              {leadTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'var(--adm-bg-card, #111C2E)', border: '1px solid var(--adm-border, rgba(255,255,255,0.08))' }}>
                  <ListChecks size={16} color="#F59E0B" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--adm-text-title, #fff)' }}>{t.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted, #94A3B8)' }}>
                      {t.dueDate ? new Date(`${t.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'}{t.dueTime ? ` ${t.dueTime}` : ''} • {t.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
