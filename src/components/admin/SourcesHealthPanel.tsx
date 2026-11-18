import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';

/**
 * Saude das origens (somente leitura, master/gerencia/dev): onde as instancias WhatsApp estao ligadas e o que foge da regra
 * "uma instancia = um funil; toda instancia pode receber; o check decide se ela tambem envia".
 */
export const SourcesHealthPanel: React.FC = () => {
  const { sources, funnels, leads, currentUser } = useAdminState();
  const [open, setOpen] = useState(false);

  const allowed = Boolean(currentUser?.isDev || ['master', 'admin', 'gerencia'].includes(currentUser?.role || ''));

  const report = useMemo(() => {
    const wa = (sources || []).filter(s => s.type === 'whatsapp_api');
    const funnelName = (id?: string) => funnels.find(f => f.id === id)?.name || 'funil removido';
    const tokenOf = (s: any) => String(s.whatsappInstanceId || s.configuration?.token || s.configuration?.instanceToken || s.configuration?.instanceKey || '').trim();

    const withoutFunnel = wa.filter(s => !s.funnelId);
    const receiveOnly = wa.filter(s => s.funnelId && s.sendEnabled === false);

    const byToken = new Map<string, string[]>();
    wa.forEach(s => { const t = tokenOf(s); if (t) byToken.set(t, [...(byToken.get(t) || []), s.name]); });
    const duplicated = Array.from(byToken.values()).filter(names => names.length > 1);

    // Funis comerciais que recebem WhatsApp mas nenhum numero habilitado para responder
    const funnelsWithoutSender = funnels
      .filter(f => !f.isPostSale && wa.some(s => s.funnelId === f.id))
      .filter(f => !wa.some(s => s.funnelId === f.id && s.sendEnabled !== false));

    const sourceIds = new Set((sources || []).map(s => s.id));
    const leadsWithoutSource = leads.filter(l => !l.isClient && !l.sourceId).length;
    const orphanSource = leads.filter(l => l.sourceId && !sourceIds.has(l.sourceId)).length;

    const issues =
      withoutFunnel.length + duplicated.length + funnelsWithoutSender.length + orphanSource;

    return { wa, withoutFunnel, receiveOnly, duplicated, funnelsWithoutSender, leadsWithoutSource, orphanSource, issues, funnelName };
  }, [sources, funnels, leads]);

  if (!allowed) return null;

  const row = (label: string, value: React.ReactNode, warn = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid var(--adm-border)', fontSize: '0.78rem' }}>
      <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
      <strong style={{ color: warn ? '#F59E0B' : 'var(--adm-text-title)', textAlign: 'right' }}>{value}</strong>
    </div>
  );

  return (
    <div style={{ border: '1px solid var(--adm-border)', borderRadius: '12px', padding: '10px 14px', background: 'var(--adm-bg-card)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-title)', fontSize: '0.84rem', fontWeight: 800 }}
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {report.issues > 0 ? <AlertTriangle size={15} color="#F59E0B" /> : <ShieldCheck size={15} color="#10B981" />}
        Saúde das origens
        <span style={{ marginLeft: 'auto', fontSize: '0.74rem', fontWeight: 700, color: report.issues > 0 ? '#F59E0B' : '#10B981' }}>
          {report.issues > 0 ? `${report.issues} ponto(s) de atenção` : 'Tudo em ordem'}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '10px' }}>
          {row('Instâncias WhatsApp', report.wa.length)}
          {row('Instâncias sem funil (recebem sem destino)', report.withoutFunnel.length === 0 ? '0' : report.withoutFunnel.map(s => s.name).join(', '), report.withoutFunnel.length > 0)}
          {row('Mesma instância em mais de uma origem', report.duplicated.length === 0 ? '0' : report.duplicated.map(n => n.join(' + ')).join(' | '), report.duplicated.length > 0)}
          {row('Funis que recebem WhatsApp mas nenhum número envia', report.funnelsWithoutSender.length === 0 ? '0' : report.funnelsWithoutSender.map(f => f.name).join(', '), report.funnelsWithoutSender.length > 0)}
          {row('Instâncias "somente recebe"', report.receiveOnly.length === 0 ? '0' : report.receiveOnly.map(s => `${s.name} (${report.funnelName(s.funnelId)})`).join(', '))}
          {row('Leads sem origem', report.leadsWithoutSource)}
          {row('Leads apontando para origem que não existe mais', report.orphanSource, report.orphanSource > 0)}
        </div>
      )}
    </div>
  );
};
