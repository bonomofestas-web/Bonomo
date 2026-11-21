import React, { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, XCircle, Save, FileText, MessageSquare, ShieldAlert, Calendar, Users, Building2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../../context/AdminStateContext';
import { supabase } from '../../../lib/supabase';
import { financeService, isImportedContract } from '../../../services/financeService';
import { contractService } from '../../../services/contractService';
import { getContractDocuments } from '../../../utils/contractDocuments';
import { EMPTY_PLAN, expandPlan, parsePlan, validatePlan, type PaymentPlan, type PlanValidation } from '../../../utils/paymentPlan';
import { PaymentPlanEditor, type CardTerminalOption } from './PaymentPlanEditor';
import { EmbeddedDocViewer } from '../EmbeddedDocViewer';
import { AdminWhatsAppWorkspaceView } from '../AdminWhatsAppWorkspaceView';
import { getFinanceSource } from '../../../utils/financeSource';
import type { FinReview, FinReceivable } from '../../../types/finance';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return '—'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };

interface Props {
  /** Ocupa a area de conteudo (em vez de pop-up) */
  embedded?: boolean;
  review: FinReview & { contract: any };
  onClose: () => void;
  /** Chamado depois de aprovar ou reprovar (a fila recarrega) */
  onChanged: () => void;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem' }}>
    <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
    <strong style={{ color: 'var(--adm-text-title)', textAlign: 'right' }}>{value}</strong>
  </div>
);

/**
 * Ficha financeira do contrato (aprovacao do financeiro). Esquerda: dados e plano de pagamento editavel.
 * Direita: documentos abertos AQUI DENTRO (sem nova aba) e conversa de WhatsApp com o cliente.
 */
export const FinanceContractModal: React.FC<Props> = ({ review, onClose, onChanged, embedded }) => {
  const { currentUser, venues, sources } = useAdminState();
  const masterId = currentUser?.masterId || currentUser?.id || '';
  const c = review.contract;
  const snap = (c.client_snapshot || {}) as any;
  const imported = isImportedContract(c.commercial_fields_snapshot);
  const venueName = venues.find(v => v.id === c.venue_id)?.name || '';
  const financeSource = getFinanceSource(sources, c.venue_id);

  const [plan, setPlan] = useState<PaymentPlan>(() => parsePlan(review.plan) || parsePlan(c.payment_terms) || EMPTY_PLAN);
  const [validation, setValidation] = useState<PlanValidation | null>(null);
  const [terminals, setTerminals] = useState<CardTerminalOption[]>([]);
  const [tab, setTab] = useState<'docs' | 'whatsapp'>('docs');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [clientFunnelId, setClientFunnelId] = useState<string | null>(null);
  const [receivables, setReceivables] = useState<FinReceivable[]>([]);

  useEffect(() => { financeService.getCardTerminals(masterId).then(setTerminals); }, [masterId]);
  useEffect(() => {
    if (!c.client_id) return;
    supabase.from('clients').select('funnel_id').eq('id', c.client_id).maybeSingle().then(({ data }) => setClientFunnelId((data as any)?.funnel_id || null));
  }, [c.client_id]);
  useEffect(() => { financeService.getReceivables(masterId, c.id).then(setReceivables); }, [masterId, c.id]);

  const docs = useMemo(() => getContractDocuments({
    contractFileUrl: c.contract_file_url, paymentFileUrl: c.payment_file_url, attachments: c.attachments || [],
  } as any), [c]);

  const preview = useMemo(() => expandPlan(plan, { eventDate: c.event_date }), [plan, c.event_date]);
  const valid = validatePlan(plan, Number(c.total_amount || 0), { requireDates: true, hasEventDate: Boolean(c.event_date) });
  const reviewer = { id: currentUser?.id, name: currentUser?.name };

  const saveDraft = async () => {
    setBusy(true);
    const ok = await financeService.saveDraftPlan({ masterId, reviewId: review.id, plan: { ...plan, source: plan.source || 'financeiro' } });
    setBusy(false);
    if (ok) toast.success('Rascunho do plano salvo.'); else toast.error('Não foi possível salvar o rascunho.');
  };

  const approve = async () => {
    setBusy(true);
    const res = await financeService.approveReview({ masterId, reviewId: review.id, contractId: c.id, plan, reviewer });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível aprovar.'); return; }
    await contractService.approveContract({ contractId: c.id, masterId, approverUser: { id: reviewer.id || '', name: reviewer.name || 'Financeiro', role: 'financeiro' }, fromFinance: true });
    toast.success(`Contrato aprovado: ${res.receivables} parcelas criadas.`);
    onChanged();
    onClose();
  };

  const reject = async () => {
    setBusy(true);
    const res = await financeService.rejectReview({ masterId, reviewId: review.id, contractId: c.id, reason, reviewer });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível reprovar.'); return; }
    toast.success('Plano reprovado. O Closer recebeu a tarefa com o motivo.');
    onChanged();
    onClose();
  };

  return (
    <div style={embedded ? { width: '100%', height: '100%', minWidth: 0, display: 'flex' } : { position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={embedded ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} style={embedded ? { width: '100%', height: '100%', minWidth: 0, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { width: '100%', maxWidth: 1480, height: '94vh', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 16, boxShadow: '0 24px 60px rgba(2,6,23,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={19} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contract_title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{c.contract_code} · {snap.payerName || snap.name} · {venueName}</div>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#B45309' }}>Aguardando aprovação</span>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(520px, 1.15fr) minmax(420px, 1fr)' }}>
          {/* ESQUERDA: ficha */}
          <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--adm-border)' }}>
            {imported && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.4)', fontSize: '0.76rem', color: 'var(--adm-text-title)' }}>
                <ShieldAlert size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>Contrato importado.</strong> Confira o PDF ao lado, ajuste o plano de pagamento até fechar com o contrato e aprove. Este contrato não pode ser reprovado.</span>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Calendar size={14} color="#06B6D4" /> Contrato</div>
              <Row label="Data da festa" value={fmtDate(c.event_date)} />
              <Row label="Convidados" value={c.guest_count || 0} />
              <Row label="Valor total" value={brl(Number(c.total_amount || 0))} />
              <Row label="Unidade" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={12} />{venueName || '—'}</span>} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Users size={14} color="#8B5CF6" /> Contratante</div>
              <Row label="Nome" value={snap.payerName || snap.name || '—'} />
              <Row label="Telefone" value={snap.phone || '—'} />
              <Row label="CPF" value={snap.cpf || '—'} />
              {snap.email && <Row label="E-mail" value={snap.email} />}
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Plano de pagamento</div>
              <PaymentPlanEditor value={plan} onChange={setPlan} total={Number(c.total_amount || 0)} terminals={terminals} requireDates hasEventDate={Boolean(c.event_date)} eventDate={c.event_date} onValidation={setValidation} />
            </div>

            {valid.ok && preview.length > 0 && (
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}>Parcelas que serão criadas ({preview.length})</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--adm-border)', borderRadius: 8 }}>
                  {preview.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', fontSize: '0.74rem', borderBottom: i < preview.length - 1 ? '1px solid var(--adm-border)' : 'none' }}>
                      <span style={{ textTransform: 'capitalize' }}>{r.kind.replace('_', '-')} {r.totalSeq > 1 ? `${r.seq}/${r.totalSeq}` : ''}</span>
                      <span style={{ color: 'var(--adm-text-muted)' }}>{fmtDate(r.dueDate)}</span>
                      <strong>{brl(r.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {receivables.length > 0 && (
              <div style={{ fontSize: '0.74rem', color: '#B45309' }}>Este contrato já tem {receivables.length} parcelas geradas.</div>
            )}

            {rejecting && (
              <div style={{ border: '1px solid rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.05)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#E11D48' }}>Motivo da reprovação (volta ao Closer com este texto)</div>
                <textarea className="adm-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.78rem' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setRejecting(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Cancelar</button>
                  <button type="button" disabled={busy || reason.trim().length < 3} onClick={reject} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#E11D48', color: '#fff', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800, opacity: busy || reason.trim().length < 3 ? 0.5 : 1 }}>Confirmar reprovação</button>
                </div>
              </div>
            )}
          </div>

          {/* DIREITA: documentos e WhatsApp */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
              {([['docs', 'Documentos', FileText], ['whatsapp', 'WhatsApp', MessageSquare]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, border: 'none',
                    background: tab === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: tab === k ? '#0284C7' : 'var(--adm-text-muted)' }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {tab === 'docs' ? (
                <EmbeddedDocViewer docs={docs} />
              ) : c.client_id ? (
                <AdminWhatsAppWorkspaceView initialLeadId={c.client_id} activeFunnelId={clientFunnelId || 'post_sale_default'} isPostSale isEmbeddedInFunnel chatOnly forcedSourceId={financeSource?.id} />
              ) : (
                <div style={{ padding: 24, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Este contrato ainda não tem cliente vinculado.</div>
              )}
            </div>
          </div>
        </div>

        {/* Rodape: acoes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.74rem', color: validation && !validation.ok ? '#E11D48' : 'var(--adm-text-muted)' }}>
            {validation && !valid.ok ? valid.errors[0] : 'Plano completo: ao aprovar, as parcelas são criadas.'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={saveDraft} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}><Save size={14} /> Salvar rascunho</button>
            {!imported && (
              <button type="button" onClick={() => setRejecting(true)} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1px solid #E11D48', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#E11D48' }}><XCircle size={14} /> Reprovar</button>
            )}
            <button type="button" onClick={approve} disabled={busy || !valid.ok} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#059669', color: '#fff', cursor: valid.ok ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 800, opacity: busy || !valid.ok ? 0.5 : 1 }}><CheckCircle2 size={15} /> Aprovar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
