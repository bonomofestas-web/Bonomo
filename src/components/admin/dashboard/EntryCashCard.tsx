import React from 'react';
import { Wallet } from 'lucide-react';
import { DeltaBadge, Panel, formatBRL } from './DashboardKpi';
import type { CommercialDashboardData } from '../../../hooks/useCommercialDashboardData';

interface Props {
  revenue: CommercialDashboardData['kpis']['revenue'];
  entry: CommercialDashboardData['entry'];
  comparedLabel: string;
}

/**
 * Logo abaixo do Faturamento: quanto do que foi FATURADO (contratos fechados) entrou em CAIXA no periodo.
 * Valor real = entradas e sinais pagos (liquido). Enquanto o financeiro nao der baixa, mostra a entrada CONTRATADA
 * dos fechamentos do periodo, com rotulo diferente para ninguem confundir.
 */
export const EntryCashCard: React.FC<Props> = ({ revenue, entry, comparedLabel }) => {
  const real = entry.hasCashData;
  const value = real ? entry.cash : entry.contracted;
  const pctOfRevenue = revenue.current > 0 ? Math.min(100, Math.round((value.current / revenue.current) * 100)) : 0;

  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--adm-text-muted)' }}>
          <Wallet size={15} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {real ? 'Entrada no período (em caixa)' : 'Entrada contratada no período'}
          </span>
        </div>
        {!real && (
          <span title="O financeiro ainda não deu baixa nas entradas. Este valor é o que foi contratado como entrada nos fechamentos do período."
            style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#B45309', border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)' }}>
            contratada, ainda sem baixa
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{formatBRL(value.current)}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>de {formatBRL(revenue.current)} faturados</span>
        <DeltaBadge pct={value.pct} />
        <span style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>vs {comparedLabel}</span>
      </div>

      <div style={{ height: 8, borderRadius: 999, background: 'var(--adm-border)', overflow: 'hidden' }}>
        <div style={{ width: `${pctOfRevenue}%`, height: '100%', background: real ? '#10B981' : '#F59E0B' }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--adm-text-muted)' }}>{pctOfRevenue}% do faturamento do período {real ? 'já entrou em caixa' : 'está previsto como entrada'}.</div>
    </Panel>
  );
};
