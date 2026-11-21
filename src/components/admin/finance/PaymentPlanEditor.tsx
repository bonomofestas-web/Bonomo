import React, { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Banknote, CalendarClock, CreditCard, Hourglass, Scale, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { DateField, Select } from '../../ui';
import {
  cardBreakdown, DEFAULT_SALDO_OFFSET_DAYS, fromCents, installmentAmountsCents, installmentDates, itemTotalCents, planTotalCents,
  saldoCents, saldoDueDate, terminalFeePct, toCents, validatePlan,
  type PaymentPlan, type PlanInstallmentsItem, type PlanItem, type PlanSaldoItem, type PlanValidation,
} from '../../../utils/paymentPlan';

export interface CardTerminalOption { id: string; name: string; feeTable?: Record<string, number> }

interface Props {
  value: PaymentPlan;
  onChange: (plan: PaymentPlan) => void;
  /** Valor total do contrato: o plano precisa fechar com ele */
  total: number;
  /** Maquininhas cadastradas (a taxa vem da tabela da maquininha) */
  terminals?: CardTerminalOption[];
  /** Financeiro exige as datas; na venda so avisa */
  requireDates?: boolean;
  hasEventDate?: boolean;
  /** Data da festa (YYYY-MM-DD): base do vencimento do saldo final */
  eventDate?: string | null;
  readOnly?: boolean;
  /** Recebe o resultado da validacao a cada mudanca (para bloquear o envio) */
  onValidation?: (v: PlanValidation) => void;
}

const brl = (c: number) => fromCents(c).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtInput = (n: number | undefined) => (n || n === 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const fmtDate = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : 'sem data');

/** Campo de dinheiro: digita livre ("1500", "1.500,00") e guarda numero. */
const MoneyInput: React.FC<{ value: number | undefined; onChange: (n: number) => void; disabled?: boolean; placeholder?: string }> = ({ value, onChange, disabled, placeholder }) => {
  const [text, setText] = React.useState(() => (value ? fmtInput(value) : ''));
  const lastValue = React.useRef(value);
  React.useEffect(() => {
    if (value !== lastValue.current) { setText(value ? fmtInput(value) : ''); lastValue.current = value; }
  }, [value]);
  return (
    <input
      className="adm-input"
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder || '0,00'}
      value={text}
      onChange={e => {
        const raw = e.target.value.replace(/[^\d.,]/g, '');
        setText(raw);
        const n = toCents(raw) / 100;
        lastValue.current = n;
        onChange(n);
      }}
      onBlur={() => setText(value ? fmtInput(value) : '')}
      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.76rem', height: 30, padding: '0 8px' }}
    />
  );
};

const NumberInput: React.FC<{ value: number | undefined; onChange: (n: number) => void; disabled?: boolean; min?: number; max?: number }> = ({ value, onChange, disabled, min = 0, max = 999 }) => (
  <input className="adm-input" type="number" min={min} max={max} disabled={disabled} value={value ?? ''}
    onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
    style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.76rem', height: 30, padding: '0 8px' }} />
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
    {children}
  </label>
);

const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 6 };
/** Controles compactos: mesma altura em todos os campos do plano */
const CTRL: React.CSSProperties = { height: 30, minHeight: 30, fontSize: '0.76rem', padding: '0 8px', boxSizing: 'border-box' };

const METHODS: Array<{ value: string; label: string }> = [
  { value: 'pix', label: 'PIX' }, { value: 'boleto', label: 'Boleto' }, { value: 'transferencia', label: 'Transferência' }, { value: 'dinheiro', label: 'Dinheiro' },
];

const META: Record<PlanItem['type'], { label: string; color: string; Icon: React.ElementType }> = {
  sinal: { label: 'Sinal', color: '#0284C7', Icon: Banknote },
  entrada: { label: 'Entrada', color: '#0284C7', Icon: Banknote },
  parcelas: { label: 'Parcelas PIX/boleto', color: '#7C3AED', Icon: CalendarClock },
  cartao: { label: 'Cartão de crédito', color: '#EA580C', Icon: CreditCard },
  pos_evento: { label: 'Pós-evento', color: '#059669', Icon: Hourglass },
  saldo: { label: 'Saldo final (automático)', color: '#475569', Icon: Scale },
};

/** Lista expansivel das parcelas: cada uma com data e valor; mudar uma recalcula o saldo. */
const InstallmentList: React.FC<{ item: PlanInstallmentsItem; onChange: (patch: Partial<PlanInstallmentsItem>) => void; readOnly?: boolean }> = ({ item, onChange, readOnly }) => {
  const amounts = installmentAmountsCents(item);
  const dates = installmentDates(item);
  const setOverride = (index: number, patch: { amount?: number; date?: string }) => {
    const rest = (item.overrides || []).filter(o => o.index !== index);
    const cur = (item.overrides || []).find(o => o.index === index) || { index };
    const next = { ...cur, ...patch };
    const baseAmount = toCents(item.amount);
    const clean = { index, ...(next.amount != null && toCents(next.amount) !== baseAmount ? { amount: next.amount } : {}), ...(next.date ? { date: next.date } : {}) };
    onChange({ overrides: (clean as any).amount != null || (clean as any).date ? [...rest, clean] : rest });
  };
  return (
    <div style={{ border: '1px solid var(--adm-border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 1fr 28px', gap: 8, padding: '6px 10px', background: 'rgba(100,116,139,0.08)', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>
        <span>#</span><span>Vencimento</span><span>Valor</span><span />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {amounts.map((c, i) => {
          const ov = item.overrides?.find(o => o.index === i);
          const changed = Boolean(ov && (ov.amount != null || ov.date));
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '38px 1fr 1fr 28px', gap: 8, alignItems: 'center', padding: '4px 10px', borderTop: '1px solid var(--adm-border)', background: changed ? 'rgba(245,158,11,0.08)' : 'transparent' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>{i + 1}/{amounts.length}</span>
              <DateField className="adm-input" style={CTRL} value={dates[i] || ''} disabled={readOnly} onChange={e => setOverride(i, { date: e.target.value })} />
              <MoneyInput value={fromCents(c)} disabled={readOnly} onChange={n => setOverride(i, { amount: n })} />
              {changed && !readOnly
                ? <button type="button" title="Voltar ao padrão" onClick={() => onChange({ overrides: (item.overrides || []).filter(o => o.index !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', display: 'inline-flex' }}><RotateCcw size={13} /></button>
                : <span />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Editor do plano de pagamento do contrato. Usado na venda (funil comercial), na aprovacao do financeiro
 * e na revisao dos contratos importados. O saldo final e automatico e sempre aparece no resumo.
 */
export const PaymentPlanEditor: React.FC<Props> = ({ value, onChange, total, terminals = [], requireDates, hasEventDate, eventDate, readOnly, onValidation }) => {
  const validation = useMemo(() => validatePlan(value, total, { requireDates, hasEventDate, eventDate }), [value, total, requireDates, hasEventDate, eventDate]);
  React.useEffect(() => { onValidation?.(validation); }, [validation]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const setItem = (i: number, patch: Partial<PlanItem>) => onChange({ ...value, items: value.items.map((it, idx) => (idx === i ? ({ ...it, ...patch } as PlanItem) : it)) });
  const removeItem = (i: number) => onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) });
  // O saldo final fica sempre por ultimo: novos itens entram antes dele
  const addItem = (it: PlanItem) => {
    const saldoIdx = value.items.findIndex(x => x.type === 'saldo');
    const items = saldoIdx >= 0 ? [...value.items.slice(0, saldoIdx), it, ...value.items.slice(saldoIdx)] : [...value.items, it];
    onChange({ ...value, items });
  };
  const saldoItem = value.items.find((x): x is PlanSaldoItem => x.type === 'saldo');
  const hasSaldo = Boolean(saldoItem);
  const missing = hasSaldo ? 0 : Math.max(0, -validation.diffCents);
  const itemCents = (it: PlanItem) => (it.type === 'saldo' ? saldoCents(value, total) : itemTotalCents(it));

  const launched = planTotalCents(value);
  const totalCents = toCents(total);
  const balance = totalCents - launched; // sobra (positivo) ou excesso (negativo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {value.items.map((it, i) => {
        const m = META[it.type];
        const sub = it.type === 'cartao' ? cardBreakdown(it.gross_amount, it.fee_pct) : null;
        const isParcelas = it.type === 'parcelas';
        const isOpen = Boolean(open[i]);
        const par = it as PlanInstallmentsItem;
        return (
          <div key={i} style={{ border: '1px solid var(--adm-border)', borderLeft: `3px solid ${m.color}`, borderRadius: 8, padding: '6px 10px 8px', background: 'var(--adm-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {isParcelas ? (
                <button type="button" onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} title={isOpen ? 'Recolher parcelas' : 'Ver e ajustar cada parcela'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.76rem', fontWeight: 800, color: m.color, textAlign: 'left' }}>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />} <m.Icon size={14} /> {m.label}
                  <span style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }}>
                    {par.count || 0}x de {brl(toCents(par.amount))}{par.first_due_date ? ` · 1º ${fmtDate(par.first_due_date)}` : ''}
                    {(par.overrides?.length || 0) > 0 ? ` · ${par.overrides!.length} ajustada(s)` : ''}
                  </span>
                </button>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: m.color }}><m.Icon size={14} /> {m.label}</span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--adm-text-title)' }}>{brl(itemCents(it))}</strong>
                {!readOnly && <button type="button" onClick={() => removeItem(i)} title="Remover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', display: 'inline-flex' }}><Trash2 size={14} /></button>}
              </span>
            </div>

            {(it.type === 'sinal' || it.type === 'entrada') && (
              <div style={GRID}>
                <Field label="Tipo">
                  <Select className="adm-input" style={CTRL} value={it.type} onChange={e => setItem(i, { type: e.target.value as 'sinal' | 'entrada' })} disabled={readOnly}>
                    <option value="sinal">Sinal</option><option value="entrada">Entrada</option>
                  </Select>
                </Field>
                <Field label="Valor"><MoneyInput value={it.amount} onChange={n => setItem(i, { amount: n })} disabled={readOnly} /></Field>
                <Field label="Data"><DateField className="adm-input" style={CTRL} value={it.date || ''} onChange={e => setItem(i, { date: e.target.value })} disabled={readOnly} /></Field>
                <Field label="Meio">
                  <Select className="adm-input" style={CTRL} value={it.method || 'pix'} onChange={e => setItem(i, { method: e.target.value as any })} disabled={readOnly}>
                    {METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
            )}

            {it.type === 'parcelas' && (
              <>
                <div style={GRID}>
                  <Field label="Quantidade"><NumberInput value={it.count} onChange={n => setItem(i, { count: n })} disabled={readOnly} max={120} /></Field>
                  <Field label="Valor de todas"><MoneyInput value={it.amount} onChange={n => setItem(i, { amount: n })} disabled={readOnly} /></Field>
                  <Field label="1º vencimento"><DateField className="adm-input" style={CTRL} value={it.first_due_date || ''} onChange={e => setItem(i, { first_due_date: e.target.value })} disabled={readOnly} /></Field>
                  <Field label="Dia do mês"><NumberInput value={it.due_day} onChange={n => setItem(i, { due_day: n || undefined })} disabled={readOnly} min={0} max={31} /></Field>
                  <Field label="Meio">
                    <Select className="adm-input" style={CTRL} value={it.method || 'pix'} onChange={e => setItem(i, { method: e.target.value as any })} disabled={readOnly}>
                      {METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
                {isOpen && <InstallmentList item={it} onChange={patch => setItem(i, patch)} readOnly={readOnly} />}
              </>
            )}

            {it.type === 'cartao' && (
              <>
                <div style={GRID}>
                  <Field label="Valor bruto"><MoneyInput value={it.gross_amount} onChange={n => setItem(i, { gross_amount: n })} disabled={readOnly} /></Field>
                  <Field label="Parcelas no cartão">
                    <NumberInput value={it.installments} max={24} disabled={readOnly} onChange={n => {
                      const term = terminals.find(t => t.id === it.terminal_id);
                      const fee = terminalFeePct(term?.feeTable, n);
                      setItem(i, { installments: n, ...(fee != null ? { fee_pct: fee } : {}) });
                    }} />
                  </Field>
                  {terminals.length > 0 && (
                    <Field label="Maquininha">
                      <Select className="adm-input" style={CTRL} value={it.terminal_id || ''} disabled={readOnly} onChange={e => {
                        const term = terminals.find(t => t.id === e.target.value);
                        const fee = terminalFeePct(term?.feeTable, it.installments || 1);
                        setItem(i, { terminal_id: e.target.value || undefined, ...(fee != null ? { fee_pct: fee } : {}) });
                      }}>
                        <option value="">Escolher</option>
                        {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </Field>
                  )}
                  <Field label="Taxa (%)">
                    <input className="adm-input" inputMode="decimal" disabled={readOnly} value={it.fee_pct ?? ''} placeholder="0,00"
                      onChange={e => setItem(i, { fee_pct: Number(e.target.value.replace(',', '.')) || undefined })}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.76rem', height: 30, padding: '0 8px' }} />
                  </Field>
                  <Field label="Data da passagem"><DateField className="adm-input" style={CTRL} value={it.date || ''} onChange={e => setItem(i, { date: e.target.value })} disabled={readOnly} /></Field>
                </div>
                {sub && sub.grossCents > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                    Taxa estimada <strong style={{ color: '#EA580C' }}>{brl(sub.feeCents)}</strong> · entra líquido <strong style={{ color: 'var(--adm-text-title)' }}>{brl(sub.netCents)}</strong>
                    {it.installments > 1 && <> ({it.installments}x de {brl(Math.round(sub.grossCents / it.installments))} bruto)</>}
                  </div>
                )}
              </>
            )}

            {it.type === 'saldo' && (
              <>
                <div style={GRID}>
                  <Field label="Dias antes da festa"><NumberInput value={Math.abs(it.offset_days ?? DEFAULT_SALDO_OFFSET_DAYS)} onChange={n => setItem(i, { offset_days: -n, date: undefined })} disabled={readOnly} max={365} /></Field>
                  <Field label="Ou data fixa"><DateField className="adm-input" style={CTRL} value={it.date || ''} onChange={e => setItem(i, { date: e.target.value || undefined })} disabled={readOnly} /></Field>
                  <Field label="Meio">
                    <Select className="adm-input" style={CTRL} value={it.method || 'pix'} onChange={e => setItem(i, { method: e.target.value as any })} disabled={readOnly}>
                      {METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                  O que sobra do total após tudo acima. Vence <strong style={{ color: 'var(--adm-text-title)' }}>{fmtDate(saldoDueDate(it, eventDate))}</strong>; as parcelas não devem passar dessa data.
                </div>
              </>
            )}

            {it.type === 'pos_evento' && (
              <div style={GRID}>
                <Field label="Valor"><MoneyInput value={it.amount} onChange={n => setItem(i, { amount: n })} disabled={readOnly} /></Field>
                <Field label="Dias depois da festa"><NumberInput value={it.offset_days} onChange={n => setItem(i, { offset_days: n })} disabled={readOnly} max={365} /></Field>
                <Field label="Meio">
                  <Select className="adm-input" style={CTRL} value={it.method || 'pix'} onChange={e => setItem(i, { method: e.target.value as any })} disabled={readOnly}>
                    {METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            ['Sinal / entrada', () => addItem({ type: 'entrada', amount: missing ? fromCents(missing) : 0, method: 'pix' })],
            ['Parcelas PIX/boleto', () => addItem({ type: 'parcelas', count: 1, amount: missing ? fromCents(missing) : 0, method: 'pix' })],
            ['Cartão de crédito', () => addItem({ type: 'cartao', gross_amount: missing ? fromCents(missing) : 0, installments: 1 })],
            ['Pós-evento', () => addItem({ type: 'pos_evento', amount: missing ? fromCents(missing) : 0, offset_days: 30, method: 'pix' })],
            ...(hasSaldo ? [] : [['Saldo final (30 dias antes)', () => onChange({ ...value, items: [...value.items, { type: 'saldo', offset_days: DEFAULT_SALDO_OFFSET_DAYS, method: 'pix' }] })] as [string, () => void]]),
          ] as Array<[string, () => void]>).map(([label, fn]) => (
            <button key={label} type="button" onClick={fn}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px dashed var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>
              <Plus size={12} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Resumo fixo: sempre mostra quanto ja foi lancado e quanto sobra (saldo) */}
      <div style={{ borderRadius: 10, padding: '10px 12px', border: `1px solid ${validation.ok ? 'rgba(16,185,129,0.45)' : 'rgba(225,29,72,0.4)'}`, background: validation.ok ? 'rgba(16,185,129,0.07)' : 'rgba(225,29,72,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {([
            ['Total do contrato', brl(totalCents), 'var(--adm-text-title)'],
            ['Já lançado', brl(launched), 'var(--adm-text-title)'],
            [hasSaldo ? `Saldo final (${fmtDate(saldoItem ? saldoDueDate(saldoItem, eventDate) : null)})` : (balance >= 0 ? 'Falta lançar' : 'Passou do total'), brl(Math.abs(balance)), balance < 0 ? '#E11D48' : hasSaldo ? '#475569' : balance === 0 ? '#059669' : '#B45309'],
          ] as Array<[string, string, string]>).map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>{label}</span>
              <strong style={{ fontSize: '0.98rem', color }}>{val}</strong>
            </div>
          ))}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: validation.ok ? '#059669' : '#E11D48' }}>
          {validation.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {validation.ok ? (hasSaldo ? 'Fecha com o contrato: o saldo cobre o restante' : 'Plano fecha com o contrato') : 'Plano não fecha com o contrato'}
        </span>
        {validation.errors.map(e => <div key={e} style={{ fontSize: '0.72rem', color: '#E11D48' }}>• {e}</div>)}
        {validation.warnings.map(w => <div key={w} style={{ fontSize: '0.72rem', color: '#B45309' }}>• {w}</div>)}
      </div>
    </div>
  );
};
