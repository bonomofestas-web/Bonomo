/**
 * Plano de pagamento estruturado do contrato (guardado em contracts.payment_terms, jsonb, version 1).
 * Ver docs/PLANO_FINANCEIRO.md. Todo calculo e feito em CENTAVOS (inteiros) para nao ter erro de arredondamento.
 */

export type PlanPixMethod = 'pix' | 'boleto' | 'transferencia' | 'dinheiro';

export interface PlanEntryItem {
  type: 'sinal' | 'entrada';
  amount: number;
  date?: string;                 // YYYY-MM-DD
  method?: PlanPixMethod | 'cartao';
}

export interface PlanInstallmentsItem {
  type: 'parcelas';              // PIX/boleto recorrente
  count: number;
  amount: number;                // valor de cada parcela
  last_amount?: number;          // quando a ultima parcela e diferente (ex.: 10 x 1.500 + 1 x 25.120)
  first_due_date?: string;       // YYYY-MM-DD
  due_day?: number;              // dia do mes (opcional; se vazio usa o dia da 1a data)
  method?: PlanPixMethod;
  /** Ajustes de uma parcela especifica (index 0-based): valor e/ou data diferentes das demais */
  overrides?: Array<{ index: number; amount?: number; date?: string }>;
}

export interface PlanCardItem {
  type: 'cartao';
  gross_amount: number;          // valor BRUTO que o cliente passa no cartao
  installments: number;
  terminal_id?: string;
  fee_pct?: number;              // taxa estimada (%) vinda do cadastro da maquininha; editavel
  date?: string;                 // data da passagem
}

export interface PlanPostEventItem {
  type: 'pos_evento';
  amount: number;
  offset_days: number;           // vence em event_date + offset_days (recalculado se a festa mudar)
  method?: PlanPixMethod;
}

/** Saldo final: sem valor digitado (= total - tudo que foi lancado). Vence por padrao 30 dias antes da festa; editavel. */
export interface PlanSaldoItem {
  type: 'saldo';
  offset_days: number;           // relativo a data da festa (padrao -30)
  date?: string;                 // data fixa (sobrepoe o offset)
  method?: PlanPixMethod;
}

export const DEFAULT_SALDO_OFFSET_DAYS = -30;

export type PlanItem = PlanEntryItem | PlanInstallmentsItem | PlanCardItem | PlanPostEventItem | PlanSaldoItem;

export interface PaymentPlan {
  version: 1;
  items: PlanItem[];
  source?: 'venda' | 'financeiro' | 'importacao';
  note?: string;
}

export const EMPTY_PLAN: PaymentPlan = { version: 1, items: [] };

export const toCents = (v: number | string | undefined | null): number => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : Number(v || 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromCents = (c: number): number => Math.round(c) / 100;

/** Reconhece o que veio do banco: so o formato estruturado (version 1) vale como plano; texto antigo e ignorado. */
export function parsePlan(raw: unknown): PaymentPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as any;
  if (p.version !== 1 || !Array.isArray(p.items)) return null;
  return p as PaymentPlan;
}

/** Valor (em centavos) de cada parcela: base, ultima diferente e ajustes por parcela. */
export function installmentAmountsCents(it: PlanInstallmentsItem): number[] {
  const n = Math.max(0, Math.floor(it.count || 0));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const base = isLast && it.last_amount != null && it.last_amount !== (it.amount as any) ? toCents(it.last_amount) : toCents(it.amount);
    const ov = it.overrides?.find(o => o.index === i && o.amount != null);
    out.push(ov ? toCents(ov.amount) : base);
  }
  return out;
}

export function itemTotalCents(it: PlanItem): number {
  switch (it.type) {
    case 'sinal':
    case 'entrada':
      return toCents(it.amount);
    case 'parcelas':
      return installmentAmountsCents(it).reduce((a, c) => a + c, 0);
    case 'cartao':
      return toCents(it.gross_amount);
    case 'pos_evento':
      return toCents(it.amount);
    case 'saldo':
      return 0; // calculado a partir do total (ver saldoCents)
  }
}

/** Valor do saldo final = total do contrato - soma dos demais itens (nunca negativo). */
export function saldoCents(plan: PaymentPlan, totalAmount: number): number {
  return Math.max(0, toCents(totalAmount) - planTotalCents(plan));
}

/** Data de vencimento do saldo final: data fixa ou data da festa + offset (padrao -30 dias). */
export function saldoDueDate(it: PlanSaldoItem, eventDate?: string | null): string | null {
  if (it.date) return it.date;
  return eventDate ? addDaysIso(eventDate, it.offset_days ?? DEFAULT_SALDO_OFFSET_DAYS) : null;
}

/** Sinal e entrada do plano, em reais (o sinal compoe o calculo financeiro junto com a entrada). */
export function planSignalEntry(plan: PaymentPlan | null | undefined): { signal: number; entry: number } {
  let signal = 0, entry = 0;
  for (const it of plan?.items || []) {
    if (it.type === 'sinal') signal += toCents(it.amount);
    if (it.type === 'entrada') entry += toCents(it.amount);
  }
  return { signal: fromCents(signal), entry: fromCents(entry) };
}

export const planTotalCents = (plan: PaymentPlan): number => plan.items.reduce((a, it) => a + itemTotalCents(it), 0);

export interface PlanValidation {
  ok: boolean;
  sumCents: number;
  totalCents: number;
  diffCents: number;           // soma - total (positivo = passou do total)
  errors: string[];            // impede o envio/aprovacao
  warnings: string[];          // alerta, nao impede
}

/**
 * A soma das modalidades tem que bater com o total do contrato (tolerancia R$ 0,01).
 * `requireDates`: o financeiro exige datas de vencimento antes de aprovar; na venda, datas faltando so geram alerta.
 */
export function validatePlan(plan: PaymentPlan | null, totalAmount: number, opts: { requireDates?: boolean; hasEventDate?: boolean; eventDate?: string | null } = {}): PlanValidation {
  const totalCents = toCents(totalAmount);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!plan || plan.items.length === 0) {
    return { ok: false, sumCents: 0, totalCents, diffCents: -totalCents, errors: ['Informe como o cliente vai pagar.'], warnings };
  }
  const saldoItem = plan.items.find((i): i is PlanSaldoItem => i.type === 'saldo');
  // Com saldo automatico, ele cobre o que falta: so bloqueia quando os demais itens passam do total.
  const sumCents = planTotalCents(plan) + (saldoItem ? saldoCents(plan, totalAmount) : 0);
  const diffCents = sumCents - totalCents;
  if (saldoItem) {
    if (planTotalCents(plan) > totalCents + 1) {
      errors.push(`A soma das formas de pagamento passa do total em R$ ${fromCents(planTotalCents(plan) - totalCents).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    }
  } else if (Math.abs(diffCents) > 1) {
    errors.push(diffCents > 0
      ? `A soma das formas de pagamento passa do total em R$ ${fromCents(diffCents).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      : `Faltam R$ ${fromCents(-diffCents).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para fechar o total do contrato.`);
  }
  const dateIssue = (msg: string) => (opts.requireDates ? errors.push(msg) : warnings.push(msg));
  plan.items.forEach((it, i) => {
    const label = `Item ${i + 1}`;
    if ((it.type === 'sinal' || it.type === 'entrada') && itemTotalCents(it) <= 0) errors.push(`${label} (${it.type}): informe o valor.`);
    if ((it.type === 'sinal' || it.type === 'entrada') && !it.date) dateIssue(`${label} (${it.type}): falta a data.`);
    if (it.type === 'parcelas') {
      if (!(it.count > 0)) errors.push(`${label} (parcelas): informe a quantidade.`);
      if (!(toCents(it.amount) > 0)) errors.push(`${label} (parcelas): informe o valor da parcela.`);
      if (!it.first_due_date) dateIssue(`${label} (parcelas): falta a data da 1ª parcela.`);
    }
    if (it.type === 'cartao') {
      if (!(it.installments > 0)) errors.push(`${label} (cartão): informe o número de parcelas.`);
      if (toCents(it.gross_amount) <= 0) errors.push(`${label} (cartão): informe o valor bruto.`);
      if (!it.date) dateIssue(`${label} (cartão): falta a data da passagem.`);
    }
    if (it.type === 'saldo') {
      if (!it.date && opts.hasEventDate === false) dateIssue(`${label} (saldo): o contrato ainda não tem data da festa para calcular o vencimento.`);
    }
    if (it.type === 'pos_evento') {
      if (toCents(it.amount) <= 0) errors.push(`${label} (pós-evento): informe o valor.`);
      if (opts.hasEventDate === false) warnings.push(`${label} (pós-evento): o contrato ainda não tem data da festa; o vencimento será calculado quando houver.`);
    }
  });
  // Nenhuma parcela/entrada pode vencer depois do saldo (nem da festa, quando o saldo e 30 dias antes)
  if (saldoItem) {
    const limit = saldoDueDate(saldoItem, opts.eventDate);
    if (limit) {
      for (const [i, r] of expandPlan(plan, { eventDate: opts.eventDate, totalAmount }).entries()) {
        if (r.kind !== 'saldo' && r.dueDate && r.dueDate > limit) { warnings.push(`Item ${i + 1}: vence depois do saldo final (${limit.split('-').reverse().join('/')}).`); break; }
      }
    }
  }
  return { ok: errors.length === 0, sumCents, totalCents, diffCents, errors, warnings };
}

/** Taxa do cartao: valor da taxa, liquido e %, a partir do bruto e da taxa (%). */
export function cardBreakdown(grossAmount: number, feePct?: number): { grossCents: number; feeCents: number; netCents: number } {
  const grossCents = toCents(grossAmount);
  const feeCents = Math.round(grossCents * (Number(feePct) || 0) / 100);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}

/** Taxa (%) da maquininha para N parcelas, a partir de fee_table {"1":2.1,"2":3.4,...}; devolve o mais proximo abaixo se nao houver exato. */
export function terminalFeePct(feeTable: Record<string, number> | undefined, installments: number): number | undefined {
  if (!feeTable) return undefined;
  if (feeTable[String(installments)] != null) return Number(feeTable[String(installments)]);
  const keys = Object.keys(feeTable).map(Number).filter(n => n <= installments).sort((a, b) => b - a);
  return keys.length ? Number(feeTable[String(keys[0])]) : undefined;
}

const addMonths = (iso: string, months: number, dueDay?: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const day = Math.min(dueDay || d, new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate());
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
export const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

/** Data de cada parcela (com ajustes) para exibir no editor. */
export function installmentDates(it: PlanInstallmentsItem): Array<string | null> {
  const n = Math.max(0, Math.floor(it.count || 0));
  return Array.from({ length: n }, (_, i) => it.overrides?.find(o => o.index === i && o.date)?.date || (it.first_due_date ? addMonths(it.first_due_date, i, it.due_day) : null));
}

/** Linha que o financeiro grava em fin_receivables. */
export interface ExpandedReceivable {
  kind: 'sinal' | 'entrada' | 'parcela' | 'saldo' | 'cartao' | 'pos_evento';
  seq: number;
  totalSeq: number;
  dueDate: string | null;
  dueRule: { base: 'event_date'; offset_days: number } | null;
  amount: number;
  paymentMethod?: string;
  installments?: number;
  terminalId?: string;
}

/** Transforma o plano em parcelas a receber, na ordem do contrato. */
export function expandPlan(plan: PaymentPlan, ctx: { eventDate?: string | null; totalAmount?: number }): ExpandedReceivable[] {
  const out: ExpandedReceivable[] = [];
  for (const it of plan.items) {
    if (it.type === 'sinal' || it.type === 'entrada') {
      out.push({ kind: it.type, seq: 1, totalSeq: 1, dueDate: it.date || null, dueRule: null, amount: fromCents(toCents(it.amount)), paymentMethod: it.method });
    } else if (it.type === 'parcelas') {
      const n = Math.max(0, Math.floor(it.count || 0));
      const cents = installmentAmountsCents(it);
      for (let i = 0; i < n; i++) {
        const ovDate = it.overrides?.find(o => o.index === i && o.date)?.date;
        out.push({
          kind: 'parcela', seq: i + 1, totalSeq: n,
          dueDate: ovDate || (it.first_due_date ? addMonths(it.first_due_date, i, it.due_day) : null),
          dueRule: null, amount: fromCents(cents[i]), paymentMethod: it.method,
        });
      }
    } else if (it.type === 'cartao') {
      out.push({ kind: 'cartao', seq: 1, totalSeq: 1, dueDate: it.date || null, dueRule: null, amount: fromCents(toCents(it.gross_amount)), paymentMethod: 'cartao_credito', installments: it.installments, terminalId: it.terminal_id });
    } else if (it.type === 'saldo') {
      const amt = ctx.totalAmount != null ? saldoCents(plan, ctx.totalAmount) : 0;
      if (amt > 0) out.push({ kind: 'saldo', seq: 1, totalSeq: 1, dueDate: saldoDueDate(it, ctx.eventDate), dueRule: it.date ? null : { base: 'event_date', offset_days: it.offset_days ?? DEFAULT_SALDO_OFFSET_DAYS }, amount: fromCents(amt), paymentMethod: it.method });
    } else if (it.type === 'pos_evento') {
      out.push({
        kind: 'pos_evento', seq: 1, totalSeq: 1,
        dueDate: ctx.eventDate ? addDaysIso(ctx.eventDate, it.offset_days || 0) : null,
        dueRule: { base: 'event_date', offset_days: it.offset_days || 0 },
        amount: fromCents(toCents(it.amount)), paymentMethod: it.method,
      });
    }
  }
  return out;
}

/** Plano a partir dos campos antigos soltos do fechamento (sinal + N parcelas + cartao), para pre-preencher o editor. */
export function planFromLegacy(input: { total: number; downPayment?: number; installmentsCount?: number }): PaymentPlan {
  const total = toCents(input.total);
  const down = toCents(input.downPayment);
  const items: PlanItem[] = [];
  if (down > 0) items.push({ type: 'entrada', amount: fromCents(down), method: 'pix' });
  const rest = total - down;
  const n = Math.max(0, Math.floor(input.installmentsCount || 0));
  if (rest > 0 && n > 0) {
    const each = Math.floor(rest / n);
    const last = rest - each * (n - 1);
    items.push({ type: 'parcelas', count: n, amount: fromCents(each), ...(last !== each ? { last_amount: fromCents(last) } : {}), method: 'pix' });
  }
  return { version: 1, items, source: 'venda' };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** Condicao de pagamento combinada, em texto corrido (descricao do contrato; o fluxo estruturado fica no financeiro). */
export function describePlan(plan: PaymentPlan | null | undefined, totalAmount?: number): string {
  if (!plan || plan.items.length === 0) return '';
  const parts: string[] = [];
  for (const it of plan.items) {
    if (it.type === 'sinal' || it.type === 'entrada') {
      parts.push(`${it.type === 'sinal' ? 'Sinal' : 'Entrada'} de ${brl(it.amount)}${it.date ? ` em ${brDate(it.date)}` : ''}`);
    } else if (it.type === 'parcelas') {
      parts.push(`${it.count}x de ${brl(it.amount)}${it.first_due_date ? ` a partir de ${brDate(it.first_due_date)}` : ''}`);
    } else if (it.type === 'cartao') {
      parts.push(`${brl(it.gross_amount)} no cartão em ${it.installments}x`);
    } else if (it.type === 'pos_evento') {
      parts.push(`${brl(it.amount)} após o evento`);
    } else if (it.type === 'saldo') {
      const v = totalAmount != null ? saldoCents(plan, totalAmount) : 0;
      parts.push(`saldo${v > 0 ? ` de ${brl(fromCents(v))}` : ''} ${it.date ? `em ${brDate(it.date)}` : `${Math.abs(it.offset_days ?? DEFAULT_SALDO_OFFSET_DAYS)} dias ${(it.offset_days ?? DEFAULT_SALDO_OFFSET_DAYS) < 0 ? 'antes' : 'depois'} da festa`}`);
    }
  }
  return parts.join(' + ');
}

/**
 * Quebra o texto de pagamento do contrato em linhas legiveis (uma condicao por linha), sem pontuacao sobrando e sem
 * repetir: linhas do cronograma parcela a parcela ("01/05 - R$ 500 bom p/ ...") sao descartadas (ficam no financeiro).
 */
export function paymentTextLines(text?: string | null): string[] {
  if (!text) return [];
  const parts = text.includes('\n')
    ? text.split(/\n+/)
    : text.replace(/\s+/g, ' ').split(/\s*;\s*|\s*\.\s+(?=Mais\b|Sinal\b|Entrada\b|Saldo\b|\d{1,2}\/\d{1,2}\b)/i);
  const cleaned = parts
    .map(l => l.replace(/^[\s.,;:-]+|[\s;:-]+$/g, '').trim())
    .filter(l => l.length > 2)
    // cronograma detalhado repete o que ja foi dito acima
    .filter(l => !/^\d{1,2}\s*\/\s*\d{1,2}\s*[–-]/.test(l) && !/bom p\//i.test(l));
  return cleaned.filter((l, i) => cleaned.findIndex(x => x.toLowerCase() === l.toLowerCase()) === i);
}
