import React, { useMemo, useState } from 'react';
import { X, Building2, User, PartyPopper, Wallet, Users, FileText, Loader2, Save, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../../context/AdminStateContext';
import { contractService } from '../../../services/contractService';
import { proposalService } from '../../../services/proposalService';
import { cloudflareR2Service } from '../../../lib/cloudflareR2';
import { DateField, Select } from '../../ui';
import { maskPhoneInput } from '../../../utils/phoneFormatter';
import type { Contract, Proposal } from '../../../types/admin';

const EVENT_TYPES: Array<{ value: string; label: string; person: string; personPlaceholder: string }> = [
  { value: '15_anos', label: '15 Anos', person: 'Nome da debutante', personPlaceholder: 'Quem vai ser homenageada' },
  { value: 'casamento', label: 'Casamento', person: 'Nome dos noivos', personPlaceholder: 'Ex.: Ana e Pedro' },
  { value: 'aniversario', label: 'Aniversário', person: 'Nome do(a) aniversariante', personPlaceholder: 'Quem faz aniversário' },
  { value: 'bodas', label: 'Bodas', person: 'Nome dos homenageados', personPlaceholder: 'Ex.: Maria e João' },
  { value: 'corporativo', label: 'Corporativo', person: 'Nome da empresa ou evento', personPlaceholder: 'Ex.: Confraternização ACME' },
  { value: 'outro', label: 'Outro', person: 'Nome do(a) homenageado(a)', personPlaceholder: 'Quem é homenageado' },
];

const toCurrencyInput = (n?: number) => (n && n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const parseCurrencyInput = (v: string): number => {
  const cleaned = v.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
const today = () => new Date().toLocaleDateString('en-CA');

interface Props {
  mode: 'create' | 'edit';
  contract?: Contract | null;
  masterId: string;
  onClose: () => void;
  onSaved: (contract: Contract) => void;
  /**
   * Proposta comercial. Com `proposalMode` o formulario cria/edita a proposta (nao conta como contrato fechado);
   * sem `proposalMode`, a proposta informada vira contrato (ela e encerrada e fica ligada ao contrato que nasceu dela).
   */
  proposalMode?: boolean;
  proposal?: Proposal | null;
  /** Lead (e contato) a que a nova proposta fica vinculada */
  leadRef?: { leadId?: string | null; contactId?: string | null; name?: string; phone?: string; venueId?: string | null };
  onSavedProposal?: (proposal: Proposal) => void;
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border, #CBD5E1)', background: 'var(--adm-bg-input, #fff)', color: 'var(--adm-text-title)', fontSize: '0.84rem', outline: 'none' };

const Section: React.FC<{ icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }> = ({ icon, title, hint, children }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--adm-border)', paddingBottom: 8 }}>
      <span style={{ color: 'var(--adm-accent, #0284C7)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{title}</span>
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--adm-text-muted)' }}>{hint}</span>}
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div style={{ minWidth: 0 }}>
    <label style={labelStyle}>{label}{required && <span style={{ color: '#EF4444' }}> *</span>}</label>
    {children}
    {error && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 4, fontWeight: 600 }}>{error}</div>}
  </div>
);

/**
 * Registro manual de contrato (e edição dos dados básicos enquanto ele está em fechamento).
 * Só unidade, contratante, telefone, homenageada, tipo de evento e valor são obrigatórios; o resto se completa depois.
 */
export const ContractFormModal: React.FC<Props> = ({ mode, contract, masterId, onClose, onSaved, proposalMode, proposal, leadRef, onSavedProposal }) => {
  const { venues, collaborators, currentUser, addTask } = useAdminState();
  // Valores iniciais: do contrato (edicao) ou da proposta (edicao da proposta / conversao em contrato)
  const base: Partial<Contract> | null = contract ?? (proposal ? {
    venueId: proposal.venueId || '', eventType: proposal.eventType, eventDate: proposal.eventDate || undefined, guestCount: proposal.guestCount || undefined,
    packageName: proposal.packageName || undefined, totalAmount: proposal.totalAmount, notes: proposal.notes || undefined,
    sdrId: proposal.sdrId || undefined, closerId: proposal.closerId || undefined,
  } : null);
  const snap = (contract?.clientSnapshot || proposal?.clientSnapshot || (leadRef ? { name: leadRef.name, phone: leadRef.phone } : {})) as Record<string, any>;
  const isEdit = mode === 'edit' && Boolean(contract);
  const editingProposal = Boolean(proposalMode && proposal);
  const converting = Boolean(!proposalMode && proposal);
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  const allowedVenues = useMemo(() => {
    const real = venues.filter(v => v.id && v.id !== 'all');
    if (!currentUser || currentUser.role === 'master' || !(currentUser.venueIds && currentUser.venueIds.length)) return real;
    return real.filter(v => currentUser.venueIds!.includes(v.id));
  }, [venues, currentUser]);

  const people = useMemo(() => {
    const active = collaborators.filter(c => c.active !== false);
    const commercial = active.filter(c => (c.sectors || []).includes('comercial') || (c.jobRoles || []).some(j => j.startsWith('comercial:')));
    return (commercial.length ? commercial : active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [collaborators]);

  const selfIsCandidate = currentUser ? people.some(p => p.id === currentUser.id) : false;

  const [venueId, setVenueId] = useState(base?.venueId || (leadRef?.venueId && leadRef.venueId !== 'all' ? leadRef.venueId : '') || (allowedVenues.length === 1 ? allowedVenues[0].id : ''));
  const [eventType, setEventType] = useState(base?.eventType || '15_anos');
  const [eventDate, setEventDate] = useState((base?.eventDate || '').split('T')[0]);
  const [eventTime, setEventTime] = useState(contract?.eventTime || '');
  const [guestCount, setGuestCount] = useState(base?.guestCount ? String(base.guestCount) : '');
  const [packageName, setPackageName] = useState(base?.packageName || '');
  const [closedAt, setClosedAt] = useState((contract?.closedAt || '').split('T')[0] || today());
  const [payerName, setPayerName] = useState(snap.payerName || snap.name || '');
  const [phone, setPhone] = useState(snap.phone || '');
  const [cpf, setCpf] = useState(snap.cpf || '');
  const [email, setEmail] = useState(snap.email || '');
  const [address, setAddress] = useState(snap.address || '');
  const [honoreeName, setHonoreeName] = useState(snap.birthdayPersonName || '');
  const [total, setTotal] = useState(toCurrencyInput(base?.totalAmount));
  const [sdrId, setSdrId] = useState(base?.sdrId || '');
  const [closerId, setCloserId] = useState(base?.closerId || (!isEdit && selfIsCandidate ? currentUser!.id : ''));
  const [notes, setNotes] = useState(base?.notes || '');
  // Lembrete de retomada da proposta (vira tarefa de follow-up do responsavel)
  const [reminderDays, setReminderDays] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const typeMeta = EVENT_TYPES.find(t => t.value === eventType) || EVENT_TYPES[0];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!venueId) e.venueId = 'Escolha a unidade.';
    if (!payerName.trim()) e.payerName = 'Informe o nome do contratante.';
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Informe o telefone com DDD.';
    if (!proposalMode && !honoreeName.trim()) e.honoreeName = 'Informe o nome.';
    if (!eventType) e.eventType = 'Escolha o tipo de evento.';
    if (!(parseCurrencyInput(total) > 0)) e.total = 'Informe o valor da venda.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nameOf = (id: string) => people.find(p => p.id === id)?.name || '';

  const submit = async () => {
    if (!validate()) { toast.warning('Preencha os campos obrigatórios.'); return; }
    setSaving(true);
    try {
      const totalAmount = parseCurrencyInput(total);
      const clientSnapshot = {
        name: payerName.trim(),
        payerName: payerName.trim(),
        phone,
        cpf: cpf.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        birthdayPersonName: honoreeName.trim(),
        payerRelationship: snap.payerRelationship || 'Titular',
      };

      if (proposalMode) {
        // Proposta: ativo documental do comercial (nao conta como contrato fechado). O arquivo vai para o R2.
        let fileUrl: string | undefined;
        if (proposalFile) fileUrl = await cloudflareR2Service.uploadFile(proposalFile, 'propostas');
        const title = `${honoreeName.trim() || payerName.trim()} · ${typeMeta.label}`;
        const common = {
          title, eventType, eventDate: eventDate || null, guestCount: Number(guestCount) || null, packageName: packageName.trim() || null,
          totalAmount, clientSnapshot, notes: notes.trim() || null,
          closerId: closerId || null, closerName: nameOf(closerId), sdrId: sdrId || null, sdrName: nameOf(sdrId),
        };
        const saved = editingProposal && proposal
          ? await proposalService.update(proposal.id, masterId, { ...common, venueId, ...(fileUrl ? { fileUrl } : {}) })
          : await proposalService.create({
            ...common, masterId, venueId, fileUrl, leadId: leadRef?.leadId, contactId: leadRef?.contactId, source: leadRef?.leadId ? 'lead' : 'manual',
            createdByName: currentUser?.name, createdById: currentUser?.id,
          });
        if (!editingProposal && Number(reminderDays) > 0) {
          const due = new Date(); due.setDate(due.getDate() + Number(reminderDays));
          addTask({
            title: `Retomar proposta: ${title}`,
            description: `Proposta ${saved.proposalCode} de ${payerName.trim()}. Retomar o contato com o cliente e saber se vai fechar.`,
            dueDate: due.toLocaleDateString('en-CA'),
            venueId,
            assignedToIds: [closerId || currentUser?.id || ''].filter(Boolean),
            databaseId: 'db_follow_ups',
            leadId: leadRef?.leadId || undefined,
            leadName: payerName.trim(),
            createdById: currentUser?.id || 'admin',
            createdByName: currentUser?.name || 'Administrador',
            type: 'followup',
            status: 'todo',
            priority: 'medium',
            customProperties: { isFollowUp: true, proposalId: saved.id, proposalCode: saved.proposalCode, leadPhone: phone },
          } as any);
        }
        toast.success(editingProposal ? 'Proposta atualizada.' : 'Proposta registrada.');
        onSavedProposal?.(saved);
        return;
      }

      if (isEdit && contract) {
        const res = await contractService.updateContractBasics({
          contractId: contract.id,
          masterId,
          patch: {
            eventType,
            eventDate: eventDate || null,
            eventTime: eventTime || null,
            guestCount: Number(guestCount) || 0,
            packageName: packageName.trim() || null,
            totalAmount,
            closedAt: closedAt || null,
            clientSnapshot,
            sdrId: sdrId || null,
            sdrName: nameOf(sdrId),
            closerId: closerId || null,
            closerName: nameOf(closerId),
            notes,
          },
        });
        if (!res.success || !res.contract) throw new Error(res.message || 'Não foi possível salvar.');
        toast.success('Dados do contrato atualizados.');
        onSaved(res.contract);
        return;
      }

      const venue = allowedVenues.find(v => v.id === venueId);
      const contractCode = await contractService.reserveContractCode({ masterId, venueName: venue?.name, eventDate: eventDate || null });
      const created = await contractService.createContract({
        masterId,
        contractCode,
        venueId,
        venueName: venue?.name,
        eventType,
        eventDate: eventDate || undefined,
        eventTime: eventTime || undefined,
        closedAt: closedAt || undefined,
        guestCount: Number(guestCount) || 0,
        packageName: packageName.trim() || undefined,
        totalAmount,
        clientSnapshot,
        contactId: proposal?.contactId || undefined,
        leadId: proposal?.leadId || undefined,
        originLeadId: proposal?.leadId || undefined,
        commercialFieldsSnapshot: {
          registroManual: !converting, registradoPorId: currentUser?.id, registradoPorNome: currentUser?.name, registradoEm: new Date().toISOString(),
          ...(proposal ? { propostaOrigem: { id: proposal.id, codigo: proposal.proposalCode, arquivo: proposal.fileUrl || null, criadaEm: proposal.proposalDate || proposal.createdAt } } : {}),
        },
        sdrId: sdrId || null,
        sdrName: nameOf(sdrId),
        closerId: closerId || null,
        closerName: nameOf(closerId),
        approvalStatus: 'pending_approval',
        notes,
      });
      if (!created) throw new Error('Não foi possível registrar o contrato.');
      // A proposta morre ao virar contrato: fica convertida e ligada ao contrato que nasceu dela
      if (proposal) await proposalService.markConverted(proposal.id, masterId, created.id);
      toast.success(converting ? 'Proposta virou contrato. Complete os dados e os documentos no fechamento.' : 'Contrato registrado. Complete os dados e os documentos no fechamento.');
      onSaved(created);
    } catch (err: any) {
      console.error('[ContractFormModal]', err);
      toast.error(err?.message || 'Falha ao salvar o contrato.');
    } finally {
      setSaving(false);
    }
  };

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 18, overflow: 'hidden', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(2,132,199,0.12)', color: '#0284C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={19} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
              {proposalMode ? (editingProposal ? 'Editar proposta' : 'Nova proposta') : converting ? 'Transformar proposta em contrato' : isEdit ? 'Editar dados do contrato' : 'Registrar contrato'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
              {proposalMode
                ? 'A proposta fica no lead e na etapa Proposta do quadro. Ela não conta como contrato fechado.'
                : converting ? `${proposal?.proposalCode} · revise os dados. Ao salvar, a proposta é encerrada e o contrato nasce no fechamento.`
                : isEdit ? `${contract?.contractCode} · só enquanto está em fechamento` : 'Só o essencial para começar. O restante você completa durante o fechamento.'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" style={{ background: 'none', border: '1px solid var(--adm-border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--adm-text-muted)', display: 'inline-flex' }}><X size={18} /></button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Section icon={<Building2 size={15} />} title="Venda">
            <div style={grid2}>
              <Field label="Unidade" required error={errors.venueId}>
                <Select value={venueId} disabled={isEdit} onChange={e => setVenueId(e.target.value)} style={inputStyle}>
                  <option value="">Selecione a unidade</option>
                  {allowedVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
              <Field label="Tipo de evento" required error={errors.eventType}>
                <Select value={eventType} onChange={e => setEventType(e.target.value)} style={inputStyle}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
            </div>
            <div style={grid3}>
              <Field label="Data da festa">
                <DateField value={eventDate} onChange={e => setEventDate(e.target.value)} className="adm-input" style={inputStyle} />
              </Field>
              <Field label="Horário">
                <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'light' }} />
              </Field>
              <Field label="Convidados">
                <input type="number" min={0} value={guestCount} onChange={e => setGuestCount(e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
            </div>
            <div style={grid2}>
              <Field label="Pacote">
                <input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="Ex.: Pacote Completo" style={inputStyle} />
              </Field>
              {proposalMode ? (
                <Field label="Arquivo da proposta (PDF ou imagem)">
                  <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Paperclip size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposalFile ? proposalFile.name : proposal?.fileUrl ? 'Substituir o arquivo atual' : 'Anexar arquivo'}</span>
                    <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setProposalFile(e.target.files?.[0] || null)} />
                  </label>
                </Field>
              ) : (
                <Field label="Contrato fechado em">
                  <DateField value={closedAt} onChange={e => setClosedAt(e.target.value)} className="adm-input" style={inputStyle} />
                </Field>
              )}
            </div>
          </Section>

          <Section icon={<User size={15} />} title="Contratante">
            <div style={grid2}>
              <Field label="Nome" required error={errors.payerName}>
                <input value={payerName} onChange={e => setPayerName(e.target.value)} placeholder="Quem assina o contrato" style={inputStyle} />
              </Field>
              <Field label="Telefone" required error={errors.phone}>
                <input value={phone} onChange={e => setPhone(maskPhoneInput(e.target.value))} placeholder="(21) 99999-9999" inputMode="tel" style={inputStyle} />
              </Field>
              <Field label="CPF">
                <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" style={inputStyle} />
              </Field>
              <Field label="E-mail">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" style={inputStyle} />
              </Field>
            </div>
            <Field label="Endereço">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro e cidade" style={inputStyle} />
            </Field>
          </Section>

          <Section icon={<PartyPopper size={15} />} title="Homenageada">
            <Field label={typeMeta.person} required={!proposalMode} error={errors.honoreeName}>
              <input value={honoreeName} onChange={e => setHonoreeName(e.target.value)} placeholder={typeMeta.personPlaceholder} style={inputStyle} />
            </Field>
          </Section>

          <Section icon={<Wallet size={15} />} title="Valor" hint="Sinal, entrada e parcelas entram nas condições de pagamento, no fechamento.">
            <div style={{ maxWidth: 260 }}>
              <Field label="Valor total da venda" required error={errors.total}>
                <input value={total} onChange={e => setTotal(e.target.value)} onBlur={() => setTotal(toCurrencyInput(parseCurrencyInput(total)))} placeholder="0,00" inputMode="decimal" style={inputStyle} />
              </Field>
            </div>
          </Section>

          <Section icon={<Users size={15} />} title={proposalMode ? 'Responsáveis e lembrete' : 'Equipe da venda'}>
            <div style={grid2}>
              <Field label="Especialista (quem fechou)">
                <Select value={closerId} onChange={e => setCloserId(e.target.value)} style={inputStyle}>
                  <option value="">Sem especialista</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="SDR (quem atendeu primeiro)">
                <Select value={sdrId} onChange={e => setSdrId(e.target.value)} style={inputStyle}>
                  <option value="">Sem SDR</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            </div>
            {proposalMode && !editingProposal && (
              <Field label="Lembrar de retomar esta proposta">
                <Select value={reminderDays} onChange={e => setReminderDays(e.target.value)} style={inputStyle}>
                  <option value="">Sem lembrete</option>
                  {[1, 2, 3, 5, 7, 10, 15, 30].map(d => <option key={d} value={String(d)}>{d === 1 ? 'Em 1 dia' : `Em ${d} dias`}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Observações">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Combinados com o cliente, detalhes da negociação..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
          </Section>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px', borderTop: '1px solid var(--adm-border)', background: 'var(--adm-bg-surface, #F8FAFC)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}><span style={{ color: '#EF4444' }}>*</span> obrigatório</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-title)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="button" onClick={submit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 9, border: 'none', background: '#0284C7', color: '#fff', fontWeight: 800, fontSize: '0.84rem', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {proposalMode ? 'Salvar proposta' : converting ? 'Criar contrato' : isEdit ? 'Salvar dados' : 'Registrar contrato'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
