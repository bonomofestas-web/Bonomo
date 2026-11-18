import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Panel, SectionTitle, formatMinutes } from './DashboardKpi';
import { getPacingLevel } from './PacingThermometer';
import type { CommercialDashboardData } from '../../../hooks/useCommercialDashboardData';

interface Alert { id: string; level: 'critical' | 'warning'; text: string }

export const buildAlerts = (d: CommercialDashboardData): Alert[] => {
  const out: Alert[] = [];
  const expectedPct = d.pacing.expectedPct;

  const pacing = getPacingLevel(d.pacing);
  if (pacing === 'red' || pacing === 'yellow') {
    out.push({
      id: 'pacing', level: pacing === 'red' ? 'critical' : 'warning',
      text: `Faturamento em ${d.pacing.pct ?? 0}% da meta com ${expectedPct}% do período decorrido.`,
    });
  }

  if (d.kpis.closings.pct !== null && d.kpis.closings.pct <= -30 && d.kpis.closings.previous >= 3) {
    out.push({
      id: 'closings', level: 'warning',
      text: `Contratos fechados caíram ${Math.abs(Math.round(d.kpis.closings.pct))}% contra o período comparado.`,
    });
  }
  if (d.kpis.conversion.pct !== null && d.kpis.conversion.pct <= -20 && d.kpis.conversion.previous > 0) {
    out.push({
      id: 'conversion', level: 'warning',
      text: `Conversão lead para contrato caiu ${Math.abs(Math.round(d.kpis.conversion.pct))}% contra o período comparado.`,
    });
  }

  const { target, current } = d.kpis.response;
  if (target && current !== null && current > target * 1.5) {
    out.push({
      id: 'tma', level: 'critical',
      text: `Tempo médio de 1ª resposta (${formatMinutes(current)}) está 50% acima da meta de ${formatMinutes(target)}.`,
    });
  }

  if (d.deep.showRate.current !== null && d.deep.showRate.sample >= 5 && d.deep.showRate.current < 60) {
    out.push({
      id: 'show', level: 'warning',
      text: `Comparecimento em ${Math.round(d.deep.showRate.current)}% dos agendamentos finalizados.`,
    });
  }

  if (d.pipeline.openLeads > 0) {
    const share = (d.pipeline.stalledLeads / d.pipeline.openLeads) * 100;
    if (share >= 25) {
      out.push({
        id: 'stalled', level: share >= 50 ? 'critical' : 'warning',
        text: `${d.pipeline.stalledLeads} de ${d.pipeline.openLeads} leads abertos estão há mais de 7 dias sem interação.`,
      });
    }
  }

  if (d.closedWithoutDate > 0) {
    out.push({
      id: 'no-date', level: 'warning',
      text: `${d.closedWithoutDate} contrato(s) sem data de fechamento: o dashboard usa a data da última edição e o período pode ficar impreciso.`,
    });
  }

  d.collaborators.forEach(c => {
    if (c.goalPct !== null && expectedPct >= 30 && c.goalPct < expectedPct * 0.6) {
      out.push({
        id: `goal-${c.id}`, level: expectedPct >= 80 && c.goalPct < 50 ? 'critical' : 'warning',
        text: `${c.name} está em ${c.goalPct}% da meta individual com ${expectedPct}% do período decorrido.`,
      });
    }
    if (c.responseTarget && c.avgResponseMinutes !== null && c.avgResponseMinutes > c.responseTarget * 1.5) {
      out.push({
        id: `tma-${c.id}`, level: 'warning',
        text: `${c.name} responde em média em ${formatMinutes(c.avgResponseMinutes)} (meta ${formatMinutes(c.responseTarget)}).`,
      });
    }
  });

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1));
};

export const AlertsPanel: React.FC<{ data: CommercialDashboardData }> = ({ data }) => {
  const alerts = buildAlerts(data);
  return (
    <Panel>
      <SectionTitle hint="Gerados automaticamente a partir das metas e do período">Alertas</SectionTitle>
      {alerts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>
          <CheckCircle2 size={16} /> Nenhum alerta no período.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map(a => {
            const color = a.level === 'critical' ? '#EF4444' : '#F59E0B';
            const Icon = a.level === 'critical' ? AlertOctagon : AlertTriangle;
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 12px', borderRadius: '10px',
                border: `1px solid ${color}55`, background: `${color}14`, fontSize: '0.78rem', color: 'var(--adm-text-title)',
              }}>
                <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{a.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
};
