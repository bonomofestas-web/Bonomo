import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Search, Link2, Loader2, Calendar, Building2, User, Sparkles, Phone, PhoneForwarded } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminState } from '../../context/AdminStateContext';
import { contractService } from '../../services/contractService';
import { formatPhone } from '../../utils/phoneFormatter';
import { Select } from '../ui';
import type { Contract } from '../../types/admin';

interface Props {
  /** Lead solto (sem contrato) que sera vinculado */
  leadId: string | null;
  /** Unidade vinculada para filtro universal (sem vazamento de contratos) */
  venueId?: string | null;
  onClose: () => void;
  onLinked?: (contract: Contract, conversationLeadId?: string | null) => void;
}

const KINSHIPS = [
  'Mãe',
  'Pai',
  'Titular / Contratante',
  'Aniversariante / Debutante',
  'Noivo(a)',
  'Cônjuge',
  'Avó',
  'Avô',
  'Tia',
  'Tio',
  'Madrinha',
  'Padrinho',
  'Responsável Financeiro',
  'Outro',
];

const fmtDate = (d?: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

const dig = (s?: string | null) => (s || '').replace(/\D/g, '');

/** Vincula um lead solto ao contratante de um contrato: o numero vira dependente/participante do card. */
export const AdminLinkContractorModal: React.FC<Props> = ({ leadId, venueId, onClose, onLinked }) => {
  const { leads, clients, venues, activeVenueId, updateLead, scopedMasterId, currentUser } = useAdminState() as any;
  const lead = leadId ? (leads || []).find((l: any) => l.id === leadId) : null;
  const client = leadId ? (clients || []).find((c: any) => c.id === leadId || (c as any).leadId === leadId) : null;
  const effectiveMasterId = scopedMasterId || lead?.masterId || (lead as any)?.master_id || client?.masterId || currentUser?.masterId || currentUser?.id || 'a0000000-0000-0000-0000-000000000001';

  // Unidade inicial do funil/lead para o Filtro Universal (sem vazamento de contratos)
  const initialVenueId = venueId || lead?.venueId || (lead as any)?.venue_id || client?.venueId || (activeVenueId !== 'all' ? activeVenueId : 'all');
  const [selectedVenueId, setSelectedVenueId] = useState<string>(initialVenueId || 'all');

  // Dados do cliente para identificação automática
  const clientPhone = lead?.phone || client?.payerPhone || '';
  const clientCpf = lead?.payerCpf || (lead as any)?.cpf || client?.payerCpf || '';
  const clientEmail = lead?.email || client?.payerEmail || '';
  const cleanPhone = dig(clientPhone);
  const cleanCpf = dig(clientCpf);
  const cleanEmail = clientEmail.trim().toLowerCase();

  const [term, setTerm] = useState('');
  const [initialClientContracts, setInitialClientContracts] = useState<Contract[]>([]);
  const [initialSearching, setInitialSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Contract[]>([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [picked, setPicked] = useState<Contract | null>(null);

  // Detecta parentesco pré-existente no cadastro do cliente/lead
  const detectInitialKinship = useCallback((): string => {
    const raw = String(
      client?.payerRelationship ||
      (lead as any)?.payerRelationship ||
      (lead as any)?.customFieldValues?.payerRelationship ||
      (lead as any)?.custom_field_values?.payerRelationship ||
      (lead as any)?.customFieldValues?.role ||
      (lead as any)?.primaryContactRole ||
      (lead as any)?.primary_contact_role ||
      ''
    ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (raw.includes('mae') || raw === 'mother') return 'Mãe';
    if (raw.includes('pai') || raw === 'father') return 'Pai';
    if (raw.includes('titular') || raw.includes('contratante') || raw === 'client') return 'Titular / Contratante';
    if (raw.includes('debut') || raw.includes('aniversariante') || raw.includes('proprio') || raw === 'self') return 'Aniversariante / Debutante';
    if (raw.includes('noiv') || raw.includes('conjuge') || raw === 'spouse') return 'Cônjuge';
    if (raw.includes('avo') || raw.includes('avó') || raw.includes('grandparent')) return 'Avó';
    if (raw.includes('tia') || raw.includes('tio') || raw.includes('aunt_uncle')) return 'Tia';
    if (raw.includes('madrinha') || raw.includes('padrinho') || raw.includes('godparent')) return 'Madrinha';
    if (raw.includes('responsavel') || raw.includes('financeiro') || raw === 'guardian') return 'Responsável Financeiro';
    if (raw === 'other' || raw.includes('outro')) return 'Outro';
    return 'Mãe';
  }, [client, lead]);

  const [kinship, setKinship] = useState<string>(detectInitialKinship);
  const [disassociateFromContractor, setDisassociateFromContractor] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    setTerm('');
    setSearchResults([]);
    setPicked(null);
    setKinship(detectInitialKinship());
    setDisassociateFromContractor(true);
    setSelectedVenueId(initialVenueId || 'all');
  }, [leadId, initialVenueId, detectInitialKinship]);

  // 1. Busca automática inicial com base estritamente nos dados do cliente (WhatsApp/Telefone, CPF, E-mail)
  useEffect(() => {
    if (!leadId || !effectiveMasterId) {
      setInitialClientContracts([]);
      setInitialSearching(false);
      return;
    }

    let alive = true;
    setInitialSearching(true);

    const runInitialClientSearch = async () => {
      try {
        const vIds = selectedVenueId && selectedVenueId !== 'all' ? [selectedVenueId] : undefined;
        const matches: Contract[] = [];
        const seen = new Set<string>();

        // A. Por Telefone / WhatsApp do cliente (estritamente na unidade selecionada)
        if (cleanPhone.length >= 8) {
          const last8 = cleanPhone.slice(-8);
          const rows = await contractService.getContracts({
            masterId: effectiveMasterId,
            venueIds: vIds,
            approvalStatus: 'approved',
            search: last8,
            limit: 10,
          });
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              matches.push(c);
            }
          }
        }

        // B. Por CPF do cliente (se houver)
        if (cleanCpf.length >= 9) {
          const rows = await contractService.getContracts({
            masterId: effectiveMasterId,
            venueIds: vIds,
            approvalStatus: 'approved',
            search: cleanCpf,
            limit: 5,
          });
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              matches.push(c);
            }
          }
        }

        // C. Por E-mail (se houver)
        if (cleanEmail && cleanEmail.includes('@')) {
          const rows = await contractService.getContracts({
            masterId: effectiveMasterId,
            venueIds: vIds,
            approvalStatus: 'approved',
            search: cleanEmail,
            limit: 5,
          });
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              matches.push(c);
            }
          }
        }

        // D. Por Pistas no Nome do Lead (Data do Evento e Debutante - estritamente na unidade selecionada)
        const rawName = String(lead?.name || '');
        const dateMatch = rawName.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
        const eventDateStr = dateMatch ? `${dateMatch[1].padStart(2, '0')}/${dateMatch[2].padStart(2, '0')}/${dateMatch[3]}` : (lead?.eventDate || null);
        const after15 = rawName.match(/15\s*a\s+([a-zA-ZÀ-ÿ]+)/i);
        const debutanteKeyword = after15 ? after15[1].trim() : (lead?.debutanteName || null);

        if (eventDateStr) {
          const rows = await contractService.getContracts({
            masterId: effectiveMasterId,
            venueIds: vIds,
            approvalStatus: 'approved',
            search: eventDateStr,
            limit: 10,
          });
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              matches.push(c);
            }
          }
        }

        if (debutanteKeyword && debutanteKeyword.length >= 3) {
          const rows = await contractService.getContracts({
            masterId: effectiveMasterId,
            venueIds: vIds,
            approvalStatus: 'approved',
            search: debutanteKeyword,
            limit: 10,
          });
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              matches.push(c);
            }
          }
        }

        if (alive) {
          setInitialClientContracts(matches);
          setInitialSearching(false);
        }
      } catch {
        if (alive) setInitialSearching(false);
      }
    };

    void runInitialClientSearch();
    return () => { alive = false; };
  }, [leadId, effectiveMasterId, selectedVenueId, cleanPhone, cleanCpf, cleanEmail, lead?.name, lead?.eventDate, lead?.debutanteName]);

  // 2. Busca Dinâmica instantânea sob demanda (quando o usuário digita na barra de pesquisa)
  useEffect(() => {
    const raw = term.trim();
    if (!leadId || !effectiveMasterId || !raw || raw.length < 2) {
      setSearchResults([]);
      setSearchingDb(false);
      return;
    }

    const currentSeq = ++searchSeq.current;
    setSearchingDb(true);

    const timer = setTimeout(async () => {
      try {
        const rows = await contractService.getContracts({
          masterId: effectiveMasterId,
          venueIds: selectedVenueId && selectedVenueId !== 'all' ? [selectedVenueId] : undefined,
          approvalStatus: 'approved',
          search: raw,
          limit: 30,
        });

        if (currentSeq === searchSeq.current) {
          setSearchResults(rows);
          setSearchingDb(false);
        }
      } catch {
        if (currentSeq === searchSeq.current) {
          setSearchingDb(false);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [term, leadId, effectiveMasterId, selectedVenueId]);

  // Contratos a exibir: se o usuário digitou algo, exibe o resultado da busca; se vazio, exibe o que achou do cliente
  const isSearchActive = Boolean(term.trim());
  const displayContracts = isSearchActive ? searchResults : initialClientContracts;
  const isSearching = isSearchActive ? searchingDb : initialSearching;

  if (!leadId || !lead) return null;

  const pickedSnap = (picked?.clientSnapshot || {}) as any;
  const contractorName = picked?.contact?.name || pickedSnap?.payerName || pickedSnap?.name || 'Titular Contratante';
  const contractorPhone = (picked?.contact as any)?.phone || picked?.contact?.primaryPhone || pickedSnap?.payerPhone || pickedSnap?.phone || '';
  const contractorPhoneDigits = dig(contractorPhone);
  const leadPhoneDigits = dig(clientPhone);

  const isContractorHoldingThisPhone = Boolean(
    picked &&
    leadPhoneDigits &&
    contractorPhoneDigits &&
    leadPhoneDigits.length >= 8 &&
    contractorPhoneDigits.length >= 8 &&
    (contractorPhoneDigits.includes(leadPhoneDigits.slice(-8)) || leadPhoneDigits.includes(contractorPhoneDigits.slice(-8))) &&
    !kinship.toLowerCase().includes('titular') &&
    !kinship.toLowerCase().includes('contratante')
  );

  const confirm = async () => {
    if (!picked) return;
    setSaving(true);
    const res = await contractService.linkLooseLeadToContract({
      masterId: effectiveMasterId,
      looseLead: { id: lead.id, name: lead.name, phone: lead.phone },
      contractId: picked.id,
      kinship,
      disassociateFromContractor: isContractorHoldingThisPhone ? disassociateFromContractor : false,
    });
    if (!res.success) {
      setSaving(false);
      toast.error(res.message || 'Não foi possível vincular.');
      return;
    }
    // REGRA SUPREMA: O card continua exatamente onde está, na mesma etapa e no mesmo funil.
    // NUNCA executar mergeLeads (que deletava o lead do funil).
    if (updateLead) {
      updateLead(lead.id, {
        isClient: true,
        primaryContactRole: kinship,
        associated_contract_id: picked.id,
      });
    }
    window.dispatchEvent(new CustomEvent('f5:contracts-changed'));
    setSaving(false);
    toast.success(`${lead.name} vinculado com sucesso a ${picked.contractTitle || picked.title || picked.contractCode}`);
    onLinked?.(picked, res.conversationLeadId);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
        
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.94rem', color: 'var(--adm-text-title)' }}>
            <Link2 size={18} color="#0284C7" /> Vincular a um contrato existente
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Informações do Cliente + Seletor de Unidade (Filtro Universal da Unidade) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--adm-bg-input)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--adm-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>Cliente: <strong style={{ color: 'var(--adm-text-title)' }}>{lead.name}</strong></span>
              {clientPhone && <span style={{ color: 'var(--adm-text-muted)' }}>• {formatPhone(clientPhone)}</span>}
              {clientCpf && <span style={{ color: 'var(--adm-text-muted)' }}>• CPF: {clientCpf}</span>}
              {clientEmail && <span style={{ color: 'var(--adm-text-muted)' }}>• {clientEmail}</span>}
            </div>

            {/* Controles do Topo: Relação da Cliente + Seletor de Unidade */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--adm-text-muted)' }}>Relação:</span>
                <Select
                  value={kinship}
                  onChange={e => setKinship(e.target.value)}
                  style={{
                    height: 28,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'var(--adm-bg-card, #fff)',
                    border: '1px solid var(--adm-border)',
                    color: '#0284C7',
                    cursor: 'pointer',
                  }}
                >
                  {KINSHIPS.map(k => <option key={k} value={k}>{k}</option>)}
                </Select>
              </div>

              {/* Seletor Dinâmico de Unidade (Filtro Universal dentro do Master) */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} color="#0284C7" />
                <Select
                  value={selectedVenueId}
                  onChange={e => setSelectedVenueId(e.target.value)}
                  style={{
                    height: 28,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'var(--adm-bg-card, #fff)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-title)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Todas as unidades da rede</option>
                  {(venues || []).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.id === initialVenueId ? '(unidade do lead)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {!picked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingRight: 2 }}>
            
            {/* Input de Busca Dinâmica em Tempo Real */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--adm-text-muted)' }} />
              <input
                className="adm-input"
                autoFocus
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Buscar por debutante, contratante, CPF, telefone, data (ex: 12/09/2027) ou código..."
                style={{ width: '100%', height: 38, paddingLeft: 30, paddingRight: term ? 30 : 12, boxSizing: 'border-box', fontSize: '0.8rem' }}
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm('')}
                  style={{ position: 'absolute', right: 8, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Título da Lista e Status */}
            {(displayContracts.length > 0 || isSearching) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--adm-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>
                <span>{isSearchActive ? 'Resultados da busca' : 'Contratos identificados para este cliente'}</span>
                {isSearching && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: '#0284C7', textTransform: 'none', fontWeight: 600 }}>
                    <Loader2 size={12} className="animate-spin" /> Buscando...
                  </span>
                )}
              </div>
            )}

            {/* Lista Dinâmica de Contratos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 90, maxHeight: 270, overflowY: 'auto' }}>
              {isSearching && displayContracts.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.78rem' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isSearchActive ? 'Buscando contratos...' : 'Verificando contratos vinculados a este cliente...'}</span>
                </div>
              ) : displayContracts.length === 0 && !isSearching ? (
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--adm-text-title)',
                  padding: '24px 18px',
                  textAlign: 'center',
                  background: 'var(--adm-bg-surface, #F8FAFC)',
                  borderRadius: 10,
                  border: '1px dashed var(--adm-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <div style={{ fontWeight: 700 }}>
                    {isSearchActive
                      ? `Nenhum contrato encontrado para "${term}".`
                      : 'Não encontramos nenhum contrato relacionado a este cliente.'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', maxWidth: 440, lineHeight: 1.45 }}>
                    Caso seja pai, mãe ou dependente familiar, pesquise no campo acima pela data do evento (ex: 20/11/2026), nome da debutante/aniversariante, CPF ou dados do titular contratante.
                  </div>
                </div>
              ) : null}

              {displayContracts.map(c => {
                const snap = (c.clientSnapshot || {}) as any;
                const dateStr = fmtDate(c.eventDate);
                const contactName = c.contact?.name || snap.payerName || snap.name;
                const birthdayPerson = snap.birthdayPersonName;
                const contactPhone = (c.contact as any)?.phone || c.contact?.primaryPhone || snap.payerPhone || snap.phone;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPicked(c)}
                    style={{
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg-surface, #F8FAFC)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--adm-bg-input)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--adm-bg-surface, #F8FAFC)'; }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.contractTitle || c.title || c.contractCode}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: '0.7rem', color: 'var(--adm-text-muted)', marginTop: 3 }}>
                        <span style={{ fontWeight: 700, color: '#0284C7' }}>{c.contractCode}</span>
                        {contactName && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <User size={11} /> {contactName}
                          </span>
                        )}
                        {birthdayPerson && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--adm-text-title)', fontWeight: 600 }}>
                            <Sparkles size={11} color="#F59E0B" /> {birthdayPerson}
                          </span>
                        )}
                        {contactPhone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={10} /> {formatPhone(contactPhone)}
                          </span>
                        )}
                        {dateStr && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={11} /> {dateStr}
                          </span>
                        )}
                        {((c as any).venue?.name || c.venueName) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Building2 size={11} /> {(c as any).venue?.name || c.venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 800, flexShrink: 0 }}>
                      Vincular →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Contrato Escolhido: Seleção de Parentesco e Confirmação */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(2, 132, 199, 0.35)', background: 'rgba(2, 132, 199, 0.05)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--adm-text-title)' }}>
                {picked.contractTitle || picked.title || picked.contractCode}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
                <span style={{ fontWeight: 800, color: '#0284C7' }}>{picked.contractCode}</span>
                {picked.contact?.name && <span>Contratante: <strong style={{ color: 'var(--adm-text-title)' }}>{picked.contact.name}</strong></span>}
                {((picked.clientSnapshot as any)?.birthdayPersonName) && <span>Debutante: <strong style={{ color: 'var(--adm-text-title)' }}>{(picked.clientSnapshot as any).birthdayPersonName}</strong></span>}
                {picked.eventDate && <span>Data: <strong style={{ color: 'var(--adm-text-title)' }}>{fmtDate(picked.eventDate)}</strong></span>}
                {((picked as any).venue?.name || picked.venueName) && <span>Unidade: <strong style={{ color: 'var(--adm-text-title)' }}>{(picked as any).venue?.name || picked.venueName}</strong></span>}
              </div>
              <button
                type="button"
                onClick={() => setPicked(null)}
                style={{ marginTop: 8, fontSize: '0.72rem', color: '#0284C7', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                ← Trocar contrato selecionado
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: 6 }}>
                Qual o parentesco ou papel de {lead.name} com o titular?
              </label>
              <Select value={kinship} onChange={e => setKinship(e.target.value)} className="adm-input" style={{ width: '100%', height: 38, fontSize: '0.8rem', fontWeight: 700 }}>
                {KINSHIPS.map(k => <option key={k} value={k}>{k}</option>)}
              </Select>
            </div>

            {/* Aviso e Confirmação de Desassociação do WhatsApp do Titular */}
            {isContractorHoldingThisPhone && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.80rem', color: '#D97706' }}>
                  <PhoneForwarded size={14} /> WhatsApp atualmente vinculado ao contratante
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-title)', lineHeight: 1.45 }}>
                  Este número de WhatsApp ({formatPhone(clientPhone)}) está associado ao contrato sob o titular <strong>{contractorName}</strong>.
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--adm-text-title)',
                  cursor: 'pointer',
                  background: 'var(--adm-bg-card, #fff)',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--adm-border)'
                }}>
                  <input
                    type="checkbox"
                    checked={disassociateFromContractor}
                    onChange={e => setDisassociateFromContractor(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#0284C7' }}
                  />
                  <span>Deseja desassociar o WhatsApp do contratante ({contractorName}) e vincular à {kinship}?</span>
                </label>
              </div>
            )}

            <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', lineHeight: 1.5, background: 'var(--adm-bg-input)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--adm-border)' }}>
              <strong>O que acontece ao vincular:</strong> {lead.name} entra como participante ({kinship}) do contrato de <strong>{picked.contact?.name || 'Contratante'}</strong> na unidade <strong>{(picked as any).venue?.name || picked.venueName || 'vinculada'}</strong>. As mensagens do WhatsApp serão reunidas no mesmo atendimento familiar e o contato passa a ter acesso unificado à esteira do evento.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem' }}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirm}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0284C7',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                <span>{saving ? 'Vinculando...' : 'Confirmar vínculo'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
