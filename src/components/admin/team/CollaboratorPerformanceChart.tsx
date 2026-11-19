import React, { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Client, Collaborator, CommercialFunnel, Lead } from '../../../types/admin';
import { computeGoalActuals } from '../../../utils/goalActuals';
import { contractValue, isActiveContract, upsellSalesOf, type ProfileKind } from '../../../utils/collaboratorAssets';

/**
 * Desempenho do colaborador nos ultimos 6 meses (so dele), calculado com os dados em memoria (nenhuma consulta nova).
 * - SDR / Closer: agendamentos e contratos fechados por mes, com a linha de faturamento.
 * - Pos-venda: vendas adicionais por mes (quantidade e valor).
 */
interface Props {
  collaborator: Collaborator;
  kind: ProfileKind;
  venueIds: string[];
  leads: Lead[];
  clients: Client[];
  funnels: CommercialFunnel[];
  collaborators: Collaborator[];
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const CollaboratorPerformanceChart: React.FC<Props> = ({ collaborator, kind, venueIds, leads, clients, funnels, collaborators }) => {
  const isCommercial = kind === 'sdr' || kind === 'closer' || kind === 'sdr_closer';
  const isPostSale = kind === 'pos_venda';

  const rows = useMemo(() => {
    const now = new Date();
    const out: { label: string; Agendamentos: number; Contratos: number; Faturamento: number; Vendas: number; Valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const last = i === 0 ? now : new Date(first.getFullYear(), first.getMonth() + 1, 0);
      const label = first.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      let appointments = 0; let closings = 0; let revenue = 0;
      if (isCommercial && venueIds.length > 0) {
        const a = computeGoalActuals({ leads, clients, funnels, collaborators }, venueIds, iso(first), iso(last));
        const r = a.byCollaborator.get(collaborator.id);
        appointments = r?.appointments ?? 0; closings = r?.closings ?? 0; revenue = r?.revenue ?? 0;
      }
      let sales = 0; let salesValue = 0;
      if (isPostSale) {
        const list = upsellSalesOf(collaborator.id, clients, iso(first), iso(last));
        sales = list.length;
        salesValue = list.reduce((s, x) => s + Number(x.sale.value || 0), 0);
      }
      out.push({ label: label.charAt(0).toUpperCase() + label.slice(1), Agendamentos: appointments, Contratos: closings, Faturamento: revenue, Vendas: sales, Valor: salesValue });
    }
    return out;
  }, [collaborator.id, isCommercial, isPostSale, venueIds, leads, clients, funnels, collaborators]);

  const hasData = rows.some(r => r.Agendamentos || r.Contratos || r.Faturamento || r.Vendas || r.Valor);
  const activeContracts = useMemo(() => clients.filter(c => c.assignedSuccessManagerId === collaborator.id && isActiveContract(c)), [clients, collaborator.id]);
  const portfolio = activeContracts.reduce((s, c) => s + contractValue(c), 0);

  if (!isCommercial && !isPostSale) return null;

  return (
    <div style={{ background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' }}>
          Desempenho nos últimos 6 meses
        </div>
        {isPostSale && activeContracts.length > 0 && (
          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Carteira atual: <strong style={{ color: 'var(--adm-text-title)' }}>{activeContracts.length} contratos · {brl(portfolio)}</strong></div>
        )}
      </div>
      {!hasData ? (
        <div style={{ padding: '26px 0', textAlign: 'center', fontSize: '0.82rem', color: 'var(--adm-text-muted)' }}>
          Sem resultados registrados nos últimos 6 meses.
        </div>
      ) : (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--adm-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="qty" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--adm-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="money" orientation="right" hide />
              <Tooltip
                contentStyle={{ background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: 10, fontSize: 12 }}
                formatter={(value: number, name: string) => (name === 'Faturamento' || name === 'Valor vendido' ? brl(value) : value)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {isCommercial && <Bar yAxisId="qty" dataKey="Agendamentos" fill="#14A9D7" radius={[6, 6, 0, 0]} maxBarSize={26} />}
              {isCommercial && <Bar yAxisId="qty" dataKey="Contratos" name="Contratos fechados" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={26} />}
              {isCommercial && <Line yAxisId="money" type="monotone" dataKey="Faturamento" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />}
              {isPostSale && <Bar yAxisId="qty" dataKey="Vendas" name="Vendas adicionais" fill="#06B6D4" radius={[6, 6, 0, 0]} maxBarSize={30} />}
              {isPostSale && <Line yAxisId="money" type="monotone" dataKey="Valor" name="Valor vendido" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
