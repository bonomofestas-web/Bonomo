import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Save } from 'lucide-react';
import { goalsService, type VenueBaseline } from '../../services/goalsService';

interface Props {
  masterId: string;
  venueId: string;
  userId?: string;
  canEdit: boolean;
}

type FieldKey = Exclude<keyof VenueBaseline, 'venueId'>;

interface FieldDef { key: FieldKey; label: string; hint: string; suffix: string }

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Taxas da esteira',
    fields: [
      { key: 'conversionRate', label: 'Lead → contrato', hint: 'Dos leads captados, quantos fecham', suffix: '%' },
      { key: 'qualificationRate', label: 'Captado → qualificado', hint: 'Leads com MQL de 10% ou mais', suffix: '%' },
      { key: 'qualToSchedRate', label: 'Qualificado → agendado', hint: 'Responsabilidade do SDR', suffix: '%' },
      { key: 'schedToAttendRate', label: 'Agendado → compareceu', hint: 'Comparecimento nas visitas e degustações', suffix: '%' },
      { key: 'attendToWonRate', label: 'Compareceu → fechou', hint: 'Responsabilidade do Closer', suffix: '%' },
      { key: 'lossRate', label: 'Taxa de perda', hint: 'Leads perdidos sobre os captados', suffix: '%' },
    ],
  },
  {
    title: 'Volume mensal',
    fields: [
      { key: 'leadsPerMonth', label: 'Leads captados', hint: 'Média por mês', suffix: 'leads' },
      { key: 'appointmentsPerMonth', label: 'Agendamentos realizados', hint: 'Média por mês', suffix: 'agend.' },
      { key: 'contractsPerMonth', label: 'Contratos fechados', hint: 'Média por mês', suffix: 'contratos' },
    ],
  },
  {
    title: 'Financeiro e atendimento',
    fields: [
      { key: 'monthlyRevenue', label: 'Faturamento mensal', hint: 'Referência de faturamento fechado', suffix: 'R$' },
      { key: 'avgTicket', label: 'Ticket médio', hint: 'Valor médio por contrato', suffix: 'R$' },
      { key: 'responseTimeMinutes', label: 'Tempo da 1ª resposta', hint: 'Média em minutos (só comercial)', suffix: 'min' },
      { key: 'avgResponseMinutes', label: 'Tempo médio de resposta', hint: 'Qualquer mensagem, em minutos (só comercial)', suffix: 'min' },
    ],
  },
];

const EMPTY = (venueId: string): VenueBaseline => ({
  venueId, conversionRate: null, qualificationRate: null, qualToSchedRate: null, schedToAttendRate: null,
  attendToWonRate: null, lossRate: null, leadsPerMonth: null, appointmentsPerMonth: null, contractsPerMonth: null,
  avgTicket: null, monthlyRevenue: null, responseTimeMinutes: null, avgResponseMinutes: null,
});

const PCT_KEYS: FieldKey[] = ['conversionRate', 'qualificationRate', 'qualToSchedRate', 'schedToAttendRate', 'attendToWonRate', 'lossRate'];

/** Metricas base da casa: referencia inicial para o "Comparar com: Base da unidade" do dashboard. */
export const AdminVenueBaselineCard: React.FC<Props> = ({ masterId, venueId, userId, canEdit }) => {
  const [values, setValues] = useState<VenueBaseline>(EMPTY(venueId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setValues(EMPTY(venueId));
    goalsService.listVenueBaselines(masterId, venueId)
      .then(rows => { if (!cancelled && rows[0]) setValues(rows[0]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [masterId, venueId]);

  const setField = (key: FieldKey, raw: string) => {
    const cleaned = raw.replace(',', '.');
    const num = cleaned === '' ? null : Number(cleaned);
    setValues(v => ({ ...v, [key]: num !== null && Number.isFinite(num) && num >= 0 ? num : v[key] }));
    if (cleaned === '') setValues(v => ({ ...v, [key]: null }));
  };

  const handleSave = async () => {
    const badPct = PCT_KEYS.find(k => (values[k] as number | null) !== null && (values[k] as number) > 100);
    if (badPct) {
      toast.error('Taxas não podem passar de 100%.');
      return;
    }
    setSaving(true);
    const ok = await goalsService.saveVenueBaseline(masterId, values, userId);
    setSaving(false);
    if (ok) toast.success('Métricas base salvas.');
    else toast.error('Não foi possível salvar as métricas base.');
  };

  return (
    <div style={{
      background: 'var(--adm-bg-card)', border: '1px solid var(--adm-border)', borderRadius: '24px',
      padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '22px', boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px', background: 'var(--adm-accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-accent)',
          }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>Métricas base da casa</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', margin: '2px 0 0 0' }}>
              Valores iniciais de referência para quem ainda não tem histórico. Usados em Dashboard, Comparar com, Base da unidade
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button" onClick={handleSave} disabled={saving || loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '10px',
              border: 'none', background: 'var(--adm-accent)', color: '#0B111A', fontWeight: 800, fontSize: '0.8rem',
              cursor: saving || loading ? 'default' : 'pointer', opacity: saving || loading ? 0.6 : 1,
            }}
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar métricas base'}
          </button>
        )}
      </div>

      {GROUPS.map(group => (
        <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--adm-text-muted)' }}>
            {group.title}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            {group.fields.map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>{f.label}</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="adm-input"
                    type="number" min={0} step="any" inputMode="decimal"
                    disabled={!canEdit || loading}
                    value={values[f.key] === null ? '' : String(values[f.key])}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder="Opcional"
                    style={{ width: '100%', boxSizing: 'border-box', height: '38px', borderRadius: '10px', paddingRight: '64px' }}
                  />
                  <span style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--adm-text-muted)', pointerEvents: 'none',
                  }}>{f.suffix}</span>
                </div>
                <span style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)' }}>{f.hint}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
