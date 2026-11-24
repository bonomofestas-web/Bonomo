import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../../context/AdminStateContext';
import { surveyPublicUrl, surveyService, type SurveyListItem } from '../../../services/surveyService';
import { Select } from '../../ui';
import type { SurveyResponse } from '../../../types/survey';

interface Props {
  lead: { id: string; name?: string; contactId?: string | null };
}

const STATUS: Record<SurveyResponse['status'], { label: string; color: string }> = {
  sent: { label: 'Enviada', color: '#D97706' },
  started: { label: 'Em andamento', color: '#0284C7' },
  completed: { label: 'Respondida', color: '#059669' },
};
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/**
 * Pesquisas do lead: gera o link pessoal de uma pesquisa publicada (a resposta fica ligada ao lead), copia o link e coloca a
 * mensagem pronta no campo do WhatsApp deste lead. Mostra o que ja foi enviado e respondido.
 */
export const LeadSurveysSection: React.FC<Props> = ({ lead }) => {
  const { scopedMasterId, currentUser } = useAdminState();
  const masterId = scopedMasterId || '';
  const [published, setPublished] = useState<SurveyListItem[]>([]);
  const [history, setHistory] = useState<Array<SurveyResponse & { surveyTitle: string; surveySlug: string }>>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!masterId || !lead.id) return;
    const [list, mine] = await Promise.all([surveyService.list(masterId), surveyService.listForLead(lead.id, masterId)]);
    setPublished(list.filter(s => s.status === 'published'));
    setHistory(mine);
  }, [masterId, lead.id]);
  useEffect(() => { void load(); }, [load]);

  // Nada a mostrar: sem pesquisa publicada e sem historico
  if (published.length === 0 && history.length === 0) return null;

  const firstName = (lead.name || '').trim().split(/\s+/)[0] || '';
  const send = async (surveyId: string, slug: string, title: string) => {
    setBusy(true);
    try {
      const invite = await surveyService.createInvite({ surveyId, masterId, leadId: lead.id, contactId: lead.contactId, sentByName: currentUser?.name });
      const link = surveyPublicUrl(slug, invite.token);
      const text = `${firstName ? `Oi, ${firstName}! ` : 'Oi! '}Pode responder esta pesquisa rapidinho? Leva só um minuto: ${link}`;
      try { await navigator.clipboard?.writeText(link); } catch { /* sem permissao de area de transferencia */ }
      const detail = { leadId: lead.id, text, handled: false };
      window.dispatchEvent(new CustomEvent('f5:composer-insert', { detail }));
      toast.success(detail.handled ? `Mensagem da pesquisa "${title}" colocada no campo de mensagem.` : 'Link pessoal copiado. Cole na conversa com o lead.');
      setPick('');
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar o link.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.70rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        <ClipboardList size={13} color="var(--adm-accent)" /> <span>Pesquisas</span>
      </div>
      {published.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select value={pick} onChange={e => setPick(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.8rem' }}>
              <option value="">Enviar uma pesquisa...</option>
              {published.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </div>
          <button type="button" disabled={!pick || busy} onClick={() => { const s = published.find(x => x.id === pick); if (s) void send(s.id, s.slug, s.title); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#0284C7', color: '#fff', fontSize: '0.76rem', fontWeight: 800, cursor: pick ? 'pointer' : 'default', opacity: pick ? 1 : 0.5 }}>
            <Send size={13} /> Gerar link
          </button>
        </div>
      )}
      {history.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--adm-border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.surveyTitle}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>enviada {fmt(r.sentAt || r.createdAt)}{r.completedAt ? ` · respondida ${fmt(r.completedAt)}` : ''}</div>
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#fff', background: STATUS[r.status].color }}>{STATUS[r.status].label}</span>
          {r.status !== 'completed' && r.token && (
            <button type="button" aria-label="Copiar link" title="Copiar link pessoal" onClick={() => { void navigator.clipboard?.writeText(surveyPublicUrl(r.surveySlug, r.token)); toast.success('Link copiado.'); }} style={{ display: 'inline-flex', padding: 5, borderRadius: 6, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-muted)', cursor: 'pointer' }}><Copy size={13} /></button>
          )}
        </div>
      ))}
    </div>
  );
};
