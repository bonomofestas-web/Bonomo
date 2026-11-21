import React, { useEffect, useState } from 'react';
import { FileClock } from 'lucide-react';
import { Panel, formatBRL } from './DashboardKpi';
import { metricsService } from '../../../services/metricsService';

const STAGE_LABEL: Record<string, string> = {
  pendente: 'Novo contrato',
  aguardando_assinatura: 'Aguardando assinatura',
  juntando_documentos: 'Preparando documento',
  preenchido: 'Preenchido (com o financeiro)',
};

/**
 * Diferencia o que foi VENDIDO e ainda esta em fechamento (contrato nao aprovado pelo financeiro)
 * do que ja esta FECHADO (aprovado, contado no faturamento). Atualiza quando contratos mudam.
 */
export const ClosingPipelineCard: React.FC<{ masterId: string; venueIds: string[] }> = ({ masterId, venueIds }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof metricsService.getClosingPipeline>> | null>(null);
  const venueKey = venueIds.join(',');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!masterId) return;
      metricsService.getClosingPipeline(masterId, venueIds).then(d => { if (!cancelled) setData(d); }).catch(() => {});
    };
    load();
    window.addEventListener('f5:contracts-changed', load);
    return () => { cancelled = true; window.removeEventListener('f5:contracts-changed', load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId, venueKey]);

  if (!data || data.count === 0) return null;

  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--adm-text-muted)' }}>
        <FileClock size={15} />
        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vendido, em fechamento</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{formatBRL(data.total)}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
          em {data.count} {data.count === 1 ? 'contrato' : 'contratos'} · {formatBRL(data.signal)} de sinal e entrada contratados
        </span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>
        Venda consolidada, mas o contrato ainda não foi aprovado pelo financeiro; fica fora do faturamento fechado até lá.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(data.byStage).map(([k, v]) => (
          <span key={k} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, border: '1px solid var(--adm-border)', color: 'var(--adm-text-title)' }}>
            {STAGE_LABEL[k] || k}: {v.count} · {formatBRL(v.total)}
          </span>
        ))}
      </div>
    </Panel>
  );
};
