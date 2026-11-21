import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, XCircle, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Select } from '../../ui';
import { contactService } from '../../../services/contactService';
import { supplierService } from '../../../services/supplierService';
import type { Contact, SupplierProfile, SupplierQuote } from '../../../types/admin';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const STATUS: Record<string, { label: string; color: string }> = { pendente: { label: 'Pendente', color: '#B45309' }, aprovado: { label: 'Aprovado', color: '#059669' }, reprovado: { label: 'Reprovado', color: '#E11D48' } };

interface Props {
  contact: Contact;
  masterId: string;
  /** Quem pode aprovar ou reprovar orcamentos (financeiro, pos-venda e gerencia) */
  canDecide: boolean;
  userName?: string;
  onProfileSaved: (profile: SupplierProfile) => void;
}

/** Ficha do fornecedor: segmento, o que vende, dados empresariais, PIX, endereco e os orcamentos (ativos do fornecedor). */
export const SupplierPanel: React.FC<Props> = ({ contact, masterId, canDecide, userName, onProfileSaved }) => {
  const [profile, setProfile] = useState<SupplierProfile>(contact.supplierProfile || {});
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'aprovado' | 'reprovado'>('all');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', description: '' });

  useEffect(() => { setProfile(contact.supplierProfile || {}); }, [contact.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const load = React.useCallback(async () => setQuotes(await supplierService.getQuotes(masterId, contact.id)), [masterId, contact.id]);
  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof SupplierProfile, v: string) => setProfile(p => ({ ...p, [k]: v }));
  const saveProfile = async () => {
    setSaving(true);
    const ok = await contactService.setSupplier(contact.id, masterId, true, profile);
    setSaving(false);
    if (ok) { toast.success('Ficha do fornecedor salva.'); onProfileSaved(profile); } else toast.error('Não foi possível salvar a ficha.');
  };

  const addQuote = async () => {
    const amount = parseFloat(form.amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (!form.title.trim()) { toast.warning('Informe o título do orçamento.'); return; }
    const q = await supplierService.addQuote({ masterId, contactId: contact.id, title: form.title, description: form.description, amount, requestedByName: userName });
    if (!q) { toast.error('Não foi possível criar o orçamento.'); return; }
    setForm({ title: '', amount: '', description: '' }); setAdding(false); await load();
  };
  const decide = async (q: SupplierQuote, status: 'aprovado' | 'reprovado') => {
    const ok = await supplierService.decide(masterId, q.id, status, { name: userName });
    if (ok) { toast.success(status === 'aprovado' ? 'Orçamento aprovado.' : 'Orçamento reprovado.'); await load(); } else toast.error('Não foi possível registrar a decisão.');
  };

  const shown = quotes.filter(q => filter === 'all' || q.status === filter);
  const approvedTotal = quotes.filter(q => q.status === 'aprovado').reduce((a, q) => a + q.amount, 0);
  const label: React.CSSProperties = { fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--adm-text-muted)' };
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: '0.8rem' };
  const card: React.CSSProperties = { border: '1px solid var(--adm-border)', borderRadius: 12, padding: 18, background: 'var(--adm-bg-card, #fff)', display: 'flex', flexDirection: 'column', gap: 12 };
  const Field: React.FC<{ l: string; children: React.ReactNode; span?: number }> = ({ l, children, span }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}><span style={label}>{l}</span>{children}</label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--adm-text-title)' }}><Briefcase size={16} color="#B45309" /> Ficha do fornecedor</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <Field l="Segmento"><input className="adm-input" style={input} value={profile.segment || ''} onChange={e => set('segment', e.target.value)} placeholder="Ex.: buffet, decoração, foto e vídeo, DJ" /></Field>
          <Field l="Razão social / empresa"><input className="adm-input" style={input} value={profile.companyName || ''} onChange={e => set('companyName', e.target.value)} /></Field>
          <Field l="CNPJ"><input className="adm-input" style={input} value={profile.cnpj || ''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></Field>
          <Field l="Tipo da chave PIX">
            <Select className="adm-input" value={profile.pixType || ''} onChange={e => set('pixType', e.target.value)}>
              <option value="">Selecionar</option><option value="cnpj">CNPJ</option><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option>
            </Select>
          </Field>
          <Field l="Chave PIX"><input className="adm-input" style={input} value={profile.pixKey || ''} onChange={e => set('pixKey', e.target.value)} /></Field>
          <Field l="Endereço" span={2}><input className="adm-input" style={input} value={profile.address || ''} onChange={e => set('address', e.target.value)} /></Field>
          <Field l="O que vende" span={2}><textarea className="adm-input" rows={2} style={{ ...input, resize: 'vertical' }} value={profile.offers || ''} onChange={e => set('offers', e.target.value)} placeholder="Produtos e serviços que oferece" /></Field>
          <Field l="Observações" span={2}><textarea className="adm-input" rows={2} style={{ ...input, resize: 'vertical' }} value={profile.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={saveProfile} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}><Save size={14} /> {saving ? 'Salvando...' : 'Salvar ficha'}</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--adm-text-title)' }}>Orçamentos ({quotes.length})</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>Os ativos do fornecedor. Aprovado: {money(approvedTotal)}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {([['all', 'Todos'], ['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['reprovado', 'Reprovados']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} style={{ padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, background: filter === k ? 'rgba(37,99,235,0.14)' : 'transparent', color: filter === k ? '#2563EB' : 'var(--adm-text-muted)' }}>{l}</button>
            ))}
            <button type="button" onClick={() => setAdding(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800, color: 'var(--adm-text-title)' }}><Plus size={13} /> Novo orçamento</button>
          </div>
        </div>

        {adding && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 8, padding: 12, borderRadius: 10, background: 'rgba(100,116,139,0.07)' }}>
            <Field l="Título"><input className="adm-input" style={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex.: Decoração da festa da Júlia" /></Field>
            <Field l="Valor (R$)"><input className="adm-input" style={input} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" /></Field>
            <Field l="Detalhes" span={2}><textarea className="adm-input" rows={2} style={{ ...input, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setAdding(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: 'var(--adm-text-title)' }}>Cancelar</button>
              <button type="button" onClick={addQuote} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}>Criar orçamento</button>
            </div>
          </div>
        )}

        {shown.length === 0 && <div style={{ padding: 18, textAlign: 'center', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Nenhum orçamento {filter === 'all' ? 'ainda' : 'nesta situação'}.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(q => (
            <div key={q.id} style={{ border: '1px solid var(--adm-border)', borderLeft: `4px solid ${STATUS[q.status].color}`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>{q.title}</div>
                {q.description && <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: 2 }}>{q.description}</div>}
                <div style={{ fontSize: '0.66rem', color: 'var(--adm-text-muted)', marginTop: 3 }}>
                  Pedido {fmt(q.createdAt)}{q.requestedByName ? ` por ${q.requestedByName}` : ''}{q.decidedAt ? ` · ${STATUS[q.status].label.toLowerCase()} em ${fmt(q.decidedAt)}${q.decidedByName ? ` por ${q.decidedByName}` : ''}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--adm-text-title)' }}>{money(q.amount)}</div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 8px', borderRadius: 999, background: `${STATUS[q.status].color}1f`, color: STATUS[q.status].color, textTransform: 'uppercase' }}>{STATUS[q.status].label}</span>
              </div>
              {canDecide && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {q.status === 'pendente' ? (
                    <>
                      <button type="button" onClick={() => decide(q, 'aprovado')} title="Aprovar" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}><CheckCircle2 size={13} /> Aprovar</button>
                      <button type="button" onClick={() => decide(q, 'reprovado')} title="Reprovar" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #E11D48', background: 'transparent', color: '#E11D48', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}><XCircle size={13} /> Reprovar</button>
                    </>
                  ) : (
                    <button type="button" onClick={async () => { if (await supplierService.reopen(masterId, q.id)) await load(); }} title="Reabrir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', display: 'inline-flex' }}><RotateCcw size={15} /></button>
                  )}
                  <button type="button" onClick={async () => { if (window.confirm('Excluir este orçamento?') && await supplierService.removeQuote(masterId, q.id)) await load(); }} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', display: 'inline-flex' }}><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
