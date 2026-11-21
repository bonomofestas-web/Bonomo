import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Wallet, CheckCircle2, FileText, MessageSquare, FolderOpen, Handshake, Ban, Undo2, Calendar, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { DateField, Select } from '../../ui';
import { useAdminState } from '../../../context/AdminStateContext';
import { supabase } from '../../../lib/supabase';
import { financeService } from '../../../services/financeService';
import { getContractDocuments } from '../../../utils/contractDocuments';
import { cardBreakdown, parsePlan, paymentTextLines, terminalFeePct } from '../../../utils/paymentPlan';
import { EmbeddedDocViewer } from '../EmbeddedDocViewer';
import { AdminWhatsAppWorkspaceView } from '../AdminWhatsAppWorkspaceView';
import { getFinanceSource } from '../../../utils/financeSource';
import { PaymentPlanEditor } from './PaymentPlanEditor';
import { PaymentTextList } from '../contracts/PaymentTextList';
import { FIN_STAGE_LABEL, type FinContractSummary, type FinReceivable } from '../../../types/finance';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'Sem data'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };
const isOpenRow = (r: FinReceivable) => r.status === 'pendente' || r.status === 'parcial';
const KIND_LABEL: Record<string, string> = { sinal: 'Sinal', entrada: 'Entrada', parcela: 'Parcela', saldo: 'Saldo', cartao: 'Cartão', pos_evento: 'Pós-evento' };
const STATUS_COLOR: Record<string, string> = { pendente: '#B45309', parcial: '#0284C7', pago: '#059669', cancelado: '#64748B', renegociado: '#7C3AED', estornado: '#E11D48' };
const STAGE_COLOR: Record<string, string> = { em_dia: '#10B981', inadimplente: '#EF4444', renegociacao: '#F59E0B', quitado: '#059669', cancelamento: '#64748B' };

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem' }}>
    <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
    <strong style={{ color: 'var(--adm-text-title)', textAlign: 'right' }}>{value}</strong>
  </div>
);

interface Props { summary: FinContractSummary; onClose: () => void; onChanged: () => void; /** Ocupa a area de conteudo (em vez de pop-up) */ embedded?: boolean }

/**
 * Ficha financeira do contrato JA APROVADO. Mesmo desenho da aprovacao: dados do cliente e plano a esquerda (com o que foi
 * pago e o que falta); a direita, a conversa de WhatsApp (so a conversa) ou os documentos abertos aqui dentro.
 * Renegociacao e cancelamento sao definidos AQUI, nao arrastando cards.
 */
export const FinanceReceivablesModal: React.FC<Props> = ({ summary, onClose, onChanged, embedded }) => {
  const { currentUser, venues, sources } = useAdminState();
  const financeSource = getFinanceSource(sources, summary.venueId);
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const by = { id: currentUser?.id, name: currentUser?.name };
  const [c, setC] = useState<any>(null);
  const [rows, setRows] = useState<FinReceivable[]>([]);
  const [tab, setTab] = useState<'contrato' | 'whatsapp' | 'docs'>('contrato');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  const [clientFunnelId, setClientFunnelId] = useState<string | null>(null);
  const [stage, setStage] = useState(summary.stageKey);
  const [manual, setManual] = useState(summary.manualStage || null);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<null | 'renegociacao' | 'cancelamento'>(null);
  // baixa
  const [payId, setPayId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [method, setMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [feePct, setFeePct] = useState('');
  const [terminals, setTerminals] = useState<Array<{ id: string; name: string; feeTable: Record<string, number> }>>([]);
  const [terminalId, setTerminalId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setRows(await financeService.getReceivables(masterId, summary.contractId)), [masterId, summary.contractId]);
  useEffect(() => {
    void load();
    financeService.getCardTerminals(masterId).then(setTerminals);
    financeService.getContractForFinance(masterId, summary.contractId).then(setC);
  }, [load, masterId, summary.contractId]);
  useEffect(() => {
    if (!summary.clientId) return;
    supabase.from('clients').select('funnel_id').eq('id', summary.clientId).maybeSingle().then(({ data }) => setClientFunnelId((data as any)?.funnel_id || null));
  }, [summary.clientId]);

  const snap = (c?.client_snapshot || {}) as any;
  const venueName = venues.find(v => v.id === summary.venueId)?.name || '';
  const docs = useMemo(() => (c ? getContractDocuments({ contractFileUrl: c.contract_file_url, paymentFileUrl: c.payment_file_url, attachments: c.attachments || [] } as any) : []), [c]);
  const plan = useMemo(() => parsePlan(c?.payment_terms), [c]);
  const paymentLines = useMemo(() => paymentTextLines(c?.payment_summary), [c]);
  const paidTotal = rows.reduce((a, r) => a + Math.min(r.paidAmount, r.amount), 0);
  const pendingTotal = rows.filter(r => ['pendente', 'parcial', 'renegociado'].includes(r.status)).reduce((a, r) => a + (r.amount - r.paidAmount), 0);

  const open = (r: FinReceivable) => {
    setPayId(r.id);
    setAmount((r.amount - r.paidAmount).toFixed(2).replace('.', ','));
    setMethod(r.paymentMethod || 'pix');
    setInstallments(r.installments || 1);
    setTerminalId(r.terminalId || '');
    setFeePct('');
  };
  const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const isCard = method === 'cartao_credito';
  const card = isCard ? cardBreakdown(parsed, Number(feePct.replace(',', '.')) || 0) : null;

  const submitPay = async () => {
    if (!payId) return;
    setBusy(true);
    const res = await financeService.registerPayment({
      masterId, receivableId: payId, amount: parsed, date, method, installments: isCard ? installments : undefined,
      feePct: isCard ? Number(feePct.replace(',', '.')) || 0 : undefined, terminalId: terminalId || undefined, by,
    });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível registrar o pagamento.'); return; }
    toast.success('Pagamento registrado.');
    setPayId(null);
    await load();
    onChanged();
  };

  const setStageManual = async (target: 'renegociacao' | 'cancelamento' | null) => {
    setBusy(true);
    const res = await financeService.setManualStage({ masterId, contractId: summary.contractId, stage: target, note, by });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível alterar a etapa.'); return; }
    toast.success(target === 'renegociacao' ? 'Contrato em renegociação.' : target === 'cancelamento' ? 'Contrato enviado para Cancelamento.' : 'Contrato voltou à etapa calculada pelas parcelas.');
    setManual(target);
    setStage(target ?? (pendingTotal <= 0 ? 'quitado' : summary.overdueAmount > 0 ? 'inadimplente' : 'em_dia'));
    setMode(null);
    setNote('');
    onChanged();
  };

  const stageColor = STAGE_COLOR[stage] || '#64748B';
  const label = (t: string) => <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase' }}>{t}</span>;

  return (
    <div style={embedded ? { width: '100%', height: '100%', minWidth: 0, display: 'flex' } : { position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={embedded ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} style={embedded ? { width: '100%', height: '100%', minWidth: 0, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { width: '100%', maxWidth: 1480, height: '94vh', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 16, boxShadow: '0 24px 60px rgba(2,6,23,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={19} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary.contractTitle}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{summary.contractCode} · {snap.payerName || snap.name} · {venueName}</div>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: `${stageColor}22`, color: stageColor }}>{FIN_STAGE_LABEL[stage]}</span>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(480px, 1fr) minmax(480px, 1.1fr)' }}>
          {/* ESQUERDA: situacao do pagamento (fila de parcelas, baixa e situacao no funil) */}
          <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--adm-border)' }}>
            {/* Resumo com progresso */}
            <div style={{ border: '1px solid var(--adm-border)', borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(2,132,199,0.06), rgba(16,185,129,0.05))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[['Total do contrato', brl(summary.contractTotal), 'var(--adm-text-title)'], ['Recebido', brl(paidTotal), '#059669'], ['A receber', brl(pendingTotal), summary.overdueAmount > 0 ? '#E11D48' : 'var(--adm-text-title)']].map(([l, v, col]) => (
                  <div key={l}>
                    {label(l)}
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: col, letterSpacing: '-0.3px' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: 'var(--adm-border)', overflow: 'hidden' }}>
                <div style={{ width: `${summary.contractTotal > 0 ? Math.min(100, Math.round((paidTotal / summary.contractTotal) * 100)) : 0}%`, height: '100%', background: '#10B981' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>
                <span>{summary.contractTotal > 0 ? Math.round((paidTotal / summary.contractTotal) * 100) : 0}% recebido</span>
                {summary.overdueAmount > 0 && <span style={{ color: '#E11D48', fontWeight: 800 }}>{brl(summary.overdueAmount)} em atraso</span>}
              </div>
            </div>

            {/* Fila de pagamentos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Cronograma e pagamentos</div>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {([['all', 'Todas'], ['open', `Em aberto (${rows.filter(isOpenRow).length})`], ['paid', `Pagas (${rows.filter(r => r.status === 'pago').length})`]] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setFilter(k)} style={{ padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800, background: filter === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: filter === k ? '#0284C7' : 'var(--adm-text-muted)' }}>{l}</button>
                  ))}
                </div>
              </div>
              {rows.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhuma parcela criada para este contrato.</div>}
              <div style={{ border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden' }}>
                {rows.filter(r => filter === 'all' || (filter === 'open' ? isOpenRow(r) : r.status === 'pago')).map((r, idx) => {
                  const isOpen = payId === r.id;
                  const todayIso = new Date().toLocaleDateString('en-CA');
                  const late = Boolean(r.dueDate && r.dueDate < todayIso && isOpenRow(r));
                  const days = r.dueDate ? Math.round((new Date(`${r.dueDate}T12:00:00`).getTime() - new Date(`${todayIso}T12:00:00`).getTime()) / 86400000) : null;
                  const color = late ? '#E11D48' : STATUS_COLOR[r.status] || '#64748B';
                  const when = r.status === 'pago' ? `Pago${r.paidAmount ? '' : ''}` : days === null ? 'Sem data' : days < 0 ? `Atrasada há ${-days} ${-days === 1 ? 'dia' : 'dias'}` : days === 0 ? 'Vence hoje' : `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`;
                  return (
                    <div key={r.id} style={{ borderTop: idx > 0 ? '1px solid var(--adm-border)' : 'none', background: isOpen ? 'rgba(2,132,199,0.05)' : 'transparent' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '10px minmax(0,1fr) auto auto', gap: 12, alignItems: 'center', padding: '11px 14px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{KIND_LABEL[r.kind]}{r.totalSeq > 1 ? ` ${r.seq}/${r.totalSeq}` : ''}</div>
                          <div style={{ fontSize: '0.7rem', color: late ? '#E11D48' : 'var(--adm-text-muted)' }}>{fmtDate(r.dueDate)} · {when}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{brl(r.amount)}</div>
                          <span style={{ display: 'inline-block', marginTop: 2, fontSize: '0.62rem', fontWeight: 800, padding: '1px 8px', borderRadius: 999, background: `${color}1f`, color, textTransform: 'uppercase' }}>
                            {r.status === 'parcial' ? `parcial · ${brl(r.paidAmount)}` : r.status}
                          </span>
                        </div>
                        {isOpenRow(r) ? (
                          <button type="button" onClick={() => (isOpen ? setPayId(null) : open(r))} style={{ padding: '7px 12px', borderRadius: 8, border: isOpen ? '1px solid var(--adm-border)' : 'none', background: isOpen ? 'transparent' : '#0284C7', color: isOpen ? 'var(--adm-text-title)' : '#fff', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>{isOpen ? 'Fechar' : 'Dar baixa'}</button>
                        ) : r.status === 'pago' ? <CheckCircle2 size={20} color="#059669" /> : <span />}
                      </div>
                      {isOpen && (
                        <div style={{ padding: '4px 14px 14px 36px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 120px' }}>{label('Valor pago (bruto)')}<input className="adm-input" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: '0.8rem' }} /></label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 130px' }}>{label('Data')}<DateField className="adm-input" value={date} onChange={e => setDate(e.target.value)} /></label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 140px' }}>{label('Meio')}
                            <Select className="adm-input" value={method} onChange={e => setMethod(e.target.value)}>
                              <option value="pix">PIX</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option>
                              <option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão de crédito</option>
                            </Select>
                          </label>
                          {isCard && (
                            <>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '0 1 90px' }}>{label('Parcelas')}
                                <input className="adm-input" type="number" min={1} max={24} value={installments} onChange={e => {
                                  const n = Math.max(1, Number(e.target.value) || 1);
                                  setInstallments(n);
                                  const fee = terminalFeePct(terminals.find(x => x.id === terminalId)?.feeTable, n);
                                  if (fee != null) setFeePct(String(fee).replace('.', ','));
                                }} style={{ fontSize: '0.8rem' }} />
                              </label>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '0 1 90px' }}>{label('Taxa (%)')}<input className="adm-input" value={feePct} onChange={e => setFeePct(e.target.value)} placeholder="0,00" style={{ fontSize: '0.8rem' }} /></label>
                            </>
                          )}
                          <button type="button" disabled={busy || parsed <= 0} onClick={submitPay} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', opacity: busy || parsed <= 0 ? 0.5 : 1 }}>Registrar</button>
                          {card && parsed > 0 && (
                            <div style={{ flexBasis: '100%', fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>
                              Bruto <strong>{brl(card.grossCents / 100)}</strong> · taxa <strong style={{ color: '#EA580C' }}>{brl(card.feeCents / 100)}</strong> · entra líquido <strong style={{ color: 'var(--adm-text-title)' }}>{brl(card.netCents / 100)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Etapa do funil: acoes (nada de arrastar) */}
            <div style={{ border: '1px solid var(--adm-border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>Situação no funil financeiro</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
                Em dia, Inadimplente e Quitado são calculados pelas parcelas. Renegociação e Cancelamento são definidos aqui.
                {summary.manualNote ? ` Observação: ${summary.manualNote}.` : ''}
              </div>
              {mode ? (
                <>
                  <textarea className="adm-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.8rem' }}
                    placeholder={mode === 'cancelamento' ? 'Motivo do cancelamento (obrigatório)' : 'Combinado da renegociação (opcional)'} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={() => { setMode(null); setNote(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Voltar</button>
                    <button type="button" disabled={busy || (mode === 'cancelamento' && note.trim().length < 3)} onClick={() => setStageManual(mode)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: mode === 'cancelamento' ? '#64748B' : '#F59E0B', color: '#fff', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, opacity: busy || (mode === 'cancelamento' && note.trim().length < 3) ? 0.5 : 1 }}>
                      {mode === 'cancelamento' ? 'Confirmar cancelamento' : 'Iniciar renegociação'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {stage === 'inadimplente' && (
                    <button type="button" onClick={() => setMode('renegociacao')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #F59E0B', background: 'rgba(245,158,11,0.1)', color: '#B45309', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}><Handshake size={14} /> Renegociar a dívida</button>
                  )}
                  {manual && (
                    <button type="button" disabled={busy} onClick={() => setStageManual(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}><Undo2 size={14} /> Voltar para a etapa calculada</button>
                  )}
                  {stage !== 'cancelamento' && (
                    <button type="button" onClick={() => setMode('cancelamento')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #64748B', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}><Ban size={14} /> Cancelar contrato</button>
                  )}
                </div>
              )}
              {stage === 'cancelamento' && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>O estorno do saldo, a multa retida e a devolução serão feitos no fluxo de distrato (próxima etapa).</div>}
            </div>
          </div>

          {/* DIREITA: Contrato (detalhes), WhatsApp e Documentos, nessa ordem */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
              {([['contrato', 'Contrato', FileText], ['whatsapp', 'WhatsApp', MessageSquare], ['docs', 'Documentos', FolderOpen]] as const).map(([k, l, Icon]) => (
                <button key={k} type="button" onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, border: 'none', background: tab === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: tab === k ? '#0284C7' : 'var(--adm-text-muted)' }}><Icon size={14} /> {l}</button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: tab === 'contrato' ? 'auto' : 'hidden' }}>
              {tab === 'contrato' ? (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Calendar size={14} color="#06B6D4" /> O evento</div>
                    <Row label="Tipo" value={c?.event_type ? String(c.event_type).replace('_', ' ') : '—'} />
                    <Row label="Data da festa" value={fmtDate(c?.event_date)} />
                    <Row label="Convidados" value={c?.guest_count || 0} />
                    <Row label="Pacote" value={c?.package_name || '—'} />
                    <Row label="Unidade" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={12} />{venueName || '—'}</span>} />
                    {c?.closed_at && <Row label="Contrato fechado em" value={fmtDate(c.closed_at)} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Users size={14} color="#8B5CF6" /> Contratante</div>
                    <Row label="Nome" value={snap.payerName || snap.name || '—'} />
                    {snap.birthdayPersonName && <Row label="Aniversariante" value={snap.birthdayPersonName} />}
                    <Row label="Telefone" value={snap.phone || '—'} />
                    <Row label="CPF" value={snap.cpf || '—'} />
                    {snap.email && <Row label="E-mail" value={snap.email} />}
                    {snap.address && <Row label="Endereço" value={snap.address} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Valores combinados</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[['Total', Number(c?.total_amount || 0)], ['Sinal', Number(c?.signal_amount || 0)], ['Entrada', Number(c?.entry_amount || 0)], ['Saldo', Math.max(0, Number(c?.total_amount || 0) - Number(c?.signal_amount || 0) - Number(c?.entry_amount || 0))]].map(([l, v]) => (
                        <div key={l as string} style={{ border: '1px solid var(--adm-border)', borderRadius: 10, padding: '8px 10px' }}>{label(l as string)}<div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{brl(v as number)}</div></div>
                      ))}
                    </div>
                  </div>
                  {paymentLines.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Pagamento combinado (como está no contrato)</div>
                      <PaymentTextList lines={paymentLines} fontSize="0.76rem" />
                    </div>
                  )}
                  {plan && plan.items.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Plano de pagamento aprovado</div>
                      <PaymentPlanEditor value={plan} onChange={() => undefined} total={Number(c?.total_amount || 0)} readOnly requireDates eventDate={c?.event_date} hasEventDate={Boolean(c?.event_date)} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}>Equipe comercial</div>
                    <Row label="SDR" value={c?.sdr_name || '—'} />
                    <Row label="Closer" value={c?.closer_name || '—'} />
                  </div>
                  {c?.handover_notes && (
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}>Passagem de bastão</div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.76rem', color: 'var(--adm-text-muted)', lineHeight: 1.45 }}>{c.handover_notes}</div>
                    </div>
                  )}
                </div>
              ) : tab === 'docs' ? (
                <EmbeddedDocViewer docs={docs} />
              ) : summary.clientId ? (
                <AdminWhatsAppWorkspaceView initialLeadId={summary.clientId} activeFunnelId={clientFunnelId || 'post_sale_default'} isPostSale isEmbeddedInFunnel chatOnly forcedSourceId={financeSource?.id} />
              ) : (
                <div style={{ padding: 24, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Este contrato ainda não tem cliente vinculado.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
