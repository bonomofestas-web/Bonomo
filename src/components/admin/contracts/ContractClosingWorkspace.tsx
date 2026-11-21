import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, MessageSquare, Upload, Wallet, Calendar, Users, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../../context/AdminStateContext';
import { contractService } from '../../../services/contractService';
import { cloudflareR2Service } from '../../../lib/cloudflareR2';
import { getContractDocuments } from '../../../utils/contractDocuments';
import { EMPTY_PLAN, parsePlan, type PaymentPlan, type PlanValidation } from '../../../utils/paymentPlan';
import { buildVenueAccentMap } from '../../../utils/venueColors';
import { PaymentPlanEditor } from '../finance/PaymentPlanEditor';
import { ContractSideList, type SideItem } from '../finance/ContractSideList';
import { EmbeddedDocViewer } from '../EmbeddedDocViewer';
import { FILL_STAGES } from './ContractBoard';
import { AdminWhatsAppWorkspaceView } from '../AdminWhatsAppWorkspaceView';
import type { Contract, ContractFillStage } from '../../../types/admin';

const brl = (v?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d?: string | null) => { if (!d) return 'a definir'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; };


const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--adm-border)', fontSize: '0.78rem' }}>
    <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
    <strong style={{ color: 'var(--adm-text-title)', textAlign: 'right' }}>{value}</strong>
  </div>
);

interface Props {
  contracts: Contract[];
  masterId: string;
  canEdit: boolean;
  canViewDocs: boolean;
  /** Contrato aberto (o quadro fica no pai) */
  selectedId: string;
  onSelect: (id: string) => void;
  /** Volta para o quadro */
  onBack: () => void;
  onChanged: () => void;
  /** Altura da area (padrao: tela inteira menos a barra superior) */
  height?: string;
}

/**
 * Contratos em fechamento (comercial): mesma estrutura da aprovacao do financeiro. Lista recuavel a esquerda,
 * ficha ocupando a area de conteudo, documentos e WhatsApp (pela instancia que o vendedor ja usava) a direita.
 */
export const ContractClosingWorkspace: React.FC<Props> = ({ contracts, masterId, canEdit, canViewDocs, selectedId, onSelect, onBack, onChanged, height }) => {
  const { venues, leads } = useAdminState();
  const accents = useMemo(() => buildVenueAccentMap(venues), [venues]);
  const [collapsed, setCollapsed] = useState(true);
  const selected = contracts.find(c => c.id === selectedId) || null;

  const [plan, setPlan] = useState<PaymentPlan>(EMPTY_PLAN);
  const [validation, setValidation] = useState<PlanValidation | null>(null);
  const [tab, setTab] = useState<'docs' | 'whatsapp'>('docs');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'contract' | 'payment' | null>(null);

  useEffect(() => { setPlan(parsePlan(selected?.paymentTerms) || EMPTY_PLAN); }, [selected?.id, selected?.paymentTerms]); // eslint-disable-line react-hooks/exhaustive-deps

  const docs = useMemo(() => (selected ? getContractDocuments({ contractFileUrl: selected.contractFileUrl, paymentFileUrl: selected.paymentFileUrl, attachments: selected.attachments || [] } as any) : []), [selected]);
  const missing = selected ? contractService.getFillMissing(selected) : [];

  const items: SideItem[] = contracts.map(c => ({
    id: c.id,
    title: c.contractTitle || c.title || c.clientSnapshot?.name || c.contractCode,
    sub: `${FILL_STAGES.find(s => s.id === (c.fillStage || 'pendente'))?.label} · ${c.contractCode}`,
    right: brl(c.totalAmount),
    color: accents.get(c.venueId)?.color,
  }));

  const changeStage = async (stage: ContractFillStage) => {
    if (!selected || !canEdit || (selected.fillStage || 'pendente') === stage) return;
    setBusy(true);
    const res = await contractService.setFillStage({ contractId: selected.id, masterId, stage });
    setBusy(false);
    if (!res.success) {
      if (res.missing?.length) toast.warning('Faltam itens para marcar como preenchido', { description: res.missing.join(' · ') });
      else toast.error(res.message || 'Não foi possível mover o contrato.');
      return;
    }
    toast.success(stage === 'preenchido' ? 'Contrato preenchido: enviado ao financeiro.' : 'Etapa atualizada.');
    onChanged();
  };

  const upload = async (kind: 'contract' | 'payment', file?: File | null) => {
    if (!file || !selected) return;
    setUploading(kind);
    try {
      const url = await cloudflareR2Service.uploadFile(file, 'contratos');
      const res = await contractService.saveClosingData({ contractId: selected.id, masterId, ...(kind === 'contract' ? { contractFileUrl: url } : { paymentFileUrl: url }) });
      if (!res.success) throw new Error(res.message);
      toast.success(kind === 'contract' ? 'Contrato assinado anexado.' : 'Comprovante anexado.');
      onChanged();
    } catch (err: any) {
      toast.error(`Falha no envio do arquivo: ${err.message || 'tente novamente'}`);
    } finally {
      setUploading(null);
    }
  };

  const savePlan = async () => {
    if (!selected) return;
    if (plan.items.length > 0 && validation && !validation.ok) { toast.warning(validation.errors[0] || 'Revise o plano de pagamento.'); return; }
    setBusy(true);
    const res = await contractService.saveClosingData({ contractId: selected.id, masterId, plan });
    setBusy(false);
    if (!res.success) { toast.error(res.message || 'Não foi possível salvar.'); return; }
    toast.success('Condições de pagamento salvas.');
    onChanged();
  };

  // Envia ao financeiro: grava as condicoes de pagamento antes de mudar a etapa
  const sendToFinance = async () => {
    if (!selected) return;
    if (plan.items.length > 0 && validation && !validation.ok) { toast.warning(validation.errors[0] || 'Revise o plano de pagamento.'); return; }
    if (plan.items.length > 0) {
      const saved = await contractService.saveClosingData({ contractId: selected.id, masterId, plan });
      if (!saved.success) { toast.error(saved.message || 'Não foi possível salvar as condições.'); return; }
    }
    await changeStage('preenchido');
  };

  const snap = (selected?.clientSnapshot || {}) as any;
  const stage = (selected?.fillStage || 'pendente') as ContractFillStage;

  return (
    <div style={{ display: 'flex', height: height || 'calc(100vh - 64px)', width: '100%', minHeight: 0 }}>
      <ContractSideList items={items} selectedId={selectedId} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)}
        onSelect={id => { onSelect(id); setCollapsed(true); }} />

      <div style={{ flex: 1, minWidth: 0, padding: 10 }}>
        {!selected ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--adm-text-muted)', fontSize: '0.86rem', border: '1px dashed var(--adm-border)', borderRadius: 12 }}>
            <FileText size={30} />
            {contracts.length === 0 ? 'Nenhuma venda em fechamento.' : 'Selecione um contrato na lista para completar o fechamento.'}
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', minWidth: 0, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Topo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.contractTitle || selected.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>{selected.contractCode} · {snap.payerName || snap.name} · {selected.venueName} · Closer {selected.closerName || '—'}</div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#B45309' }}>{FILL_STAGES.find(s => s.id === stage)?.label}</span>
              <button type="button" onClick={onBack} aria-label="Voltar ao quadro" title="Voltar ao quadro" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(520px, 1.15fr) minmax(420px, 1fr)' }}>
              {/* ESQUERDA: ficha */}
              <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--adm-border)' }}>
                {selected.financeMessage && (
                  <div style={{ border: '1px solid #E11D48', borderRadius: 10, padding: '10px 12px', fontSize: '0.78rem', color: '#E11D48', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>Devolvido pelo financeiro:</strong> {selected.financeMessage}</span>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Etapa do fechamento</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {FILL_STAGES.map(st => {
                      const active = stage === st.id;
                      return (
                        <button key={st.id} type="button" disabled={!canEdit || busy} onClick={() => changeStage(st.id)} title={st.hint}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? '#0284C7' : 'var(--adm-border)'}`, background: active ? '#0284C7' : 'transparent', color: active ? '#fff' : 'var(--adm-text-title)', fontWeight: 700, fontSize: '0.74rem', cursor: canEdit ? 'pointer' : 'default' }}>
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                  {missing.length > 0 && <div style={{ fontSize: '0.74rem', color: '#B45309', marginTop: 8 }}>Para marcar como Preenchido falta: {missing.join(', ')}.</div>}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Calendar size={14} color="#06B6D4" /> Contrato</div>
                  <Row label="Data da festa" value={fmtDate(selected.eventDate)} />
                  <Row label="Convidados" value={selected.guestCount || 0} />
                  <Row label="Valor total" value={brl(selected.totalAmount)} />
                  <Row label="Sinal" value={brl(selected.signalAmount)} />
                  <Row label="Entrada" value={brl(selected.entryAmount)} />
                  {selected.paymentSummary && <Row label="Pagamento combinado" value={selected.paymentSummary} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 4 }}><Users size={14} color="#8B5CF6" /> Contratante</div>
                  <Row label="Nome" value={snap.payerName || snap.name || '—'} />
                  <Row label="Telefone" value={snap.phone || '—'} />
                  <Row label="Aniversariante" value={snap.birthdayPersonName || '—'} />
                </div>

                {canEdit && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {([['contract', 'Contrato assinado', Boolean(selected.contractFileUrl)], ['payment', 'Comprovante de pagamento', Boolean(selected.paymentFileUrl)]] as Array<['contract' | 'payment', string, boolean]>).map(([kind, label, has]) => (
                      <label key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px dashed ${has ? '#059669' : 'var(--adm-border)'}`, color: has ? '#059669' : 'var(--adm-text-title)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                        {has ? <CheckCircle2 size={14} /> : <Upload size={14} />}
                        {uploading === kind ? 'Enviando...' : has ? `${label} anexado (substituir)` : `Anexar ${label.toLowerCase()}`}
                        <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => { void upload(kind, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>Plano de pagamento</div>
                  <PaymentPlanEditor value={plan} onChange={setPlan} total={selected.totalAmount || 0} hasEventDate={Boolean(selected.eventDate)} eventDate={selected.eventDate || null} readOnly={!canEdit} onValidation={setValidation} />
                </div>
              </div>

              {/* DIREITA: documentos e WhatsApp */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0 }}>
                  {([['docs', 'Documentos', FileText], ['whatsapp', 'WhatsApp', MessageSquare]] as const).map(([k, label, Icon]) => (
                    <button key={k} type="button" onClick={() => setTab(k)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, border: 'none', background: tab === k ? 'rgba(2,132,199,0.14)' : 'transparent', color: tab === k ? '#0284C7' : 'var(--adm-text-muted)' }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {tab === 'docs' ? (
                    !selected.contractFileUrl && docs.length === 0 ? (
                      <label style={{ height: '100%', boxSizing: 'border-box', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, border: '2px dashed var(--adm-border)', borderRadius: 12, color: 'var(--adm-text-muted)', cursor: canEdit ? 'pointer' : 'default', textAlign: 'center', padding: 24 }}>
                        <Upload size={34} />
                        <strong style={{ fontSize: '0.95rem', color: 'var(--adm-text-title)' }}>{uploading === 'contract' ? 'Enviando contrato...' : 'Enviar contrato'}</strong>
                        <span style={{ fontSize: '0.78rem' }}>{canEdit ? 'Clique para escolher o PDF no computador. Ele sobe e aparece aqui na hora.' : 'O contrato ainda não foi enviado.'}</span>
                        {canEdit && <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => { void upload('contract', e.target.files?.[0]); e.target.value = ''; }} />}
                      </label>
                    ) : canViewDocs ? <EmbeddedDocViewer docs={docs} /> : <div style={{ padding: 24, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>{docs.length > 0 ? 'Documentos anexados. Eles abrem no Pós-venda e no Financeiro.' : 'Nenhum documento anexado ainda.'}</div>
                  ) : selected.leadId || selected.originLeadId ? (
                    // Espelho da conversa do lead no ultimo funil em que ele estava; o envio sai pela instancia que o vendedor ja usava
                    <AdminWhatsAppWorkspaceView initialLeadId={(selected.originLeadId || selected.leadId) as string} activeFunnelId={leads.find(l => l.id === (selected.originLeadId || selected.leadId))?.funnelId || selected.originFunnelId || undefined} isEmbeddedInFunnel chatOnly />
                  ) : (
                    <div style={{ padding: 24, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Este contrato não tem lead de origem para abrir a conversa.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodape */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>{missing.length > 0 ? `Falta: ${missing.join(', ')}.` : 'Tudo certo: pode enviar ao financeiro.'}</div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={savePlan} disabled={busy} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Salvar condições</button>
                  <button type="button" onClick={sendToFinance} disabled={busy || stage === 'preenchido'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#0284C7', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, opacity: busy || stage === 'preenchido' ? 0.5 : 1 }}><Send size={14} /> Enviar ao financeiro</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
