import React, { useState } from 'react';
import { 
  Building2, Calendar, User, Users, 
  Copy, Check, MessageSquare, MoreVertical, Eye, ExternalLink, 
  Trash2, Gem, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { SafeAvatar } from './SafeAvatar';
import type { Client, Collaborator, Venue } from '../../types/admin';
import { normalizeEventKind, type EventKind } from '../../utils/contractTitle';
import { useAdminState } from '../../context/AdminStateContext';

const KIND_LABEL: Record<EventKind, string> = {
  quinze_anos: '15 Anos', casamento: 'Casamento', infantil: 'Infantil', corporativo: 'Corporativo', outro: 'Evento',
};

export interface AdminContractKanbanCardProps {
  client: Client;
  contractCode?: string;
  isMultiSelectMode?: boolean;
  isSelectedInMulti?: boolean;
  onToggleSelect?: (clientId: string, e?: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, clientId: string) => void;
  onClick?: () => void;
  onOpenInspector?: (clientId: string) => void;
  onOpenWhatsApp?: (clientId: string) => void;
  onOpenDebutanteApp?: (slug: string) => void;
  onDeleteClient?: (client: Client) => void;
  /** Lead em funil de pos-venda SEM contrato: card diferente, com acao de vincular a um contratante */
  isLooseLead?: boolean;
  onLinkContractor?: (leadId: string) => void;
  venues?: Venue[];
  collaborators?: Collaborator[];
  clientTasks?: any[];
  clientAppointments?: any[];
}

export const AdminContractKanbanCard: React.FC<AdminContractKanbanCardProps> = ({
  client,
  contractCode: customContractCode,
  isMultiSelectMode = false,
  isSelectedInMulti = false,
  onToggleSelect,
  onDragStart,
  onClick,
  onOpenInspector,
  onOpenWhatsApp,
  onOpenDebutanteApp,
  onDeleteClient,
  isLooseLead = false,
  onLinkContractor,
  venues = [],
  collaborators = [],
}) => {
  const { leads = [] } = useAdminState();
  const [isCopied, setIsCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRevenueHovered, setIsRevenueHovered] = useState(false);

  // 1. Codigo de CLIENTE (CLI-...). O codigo de contrato (CTR-) foi descontinuado no pos-venda.
  const ctrCode = customContractCode || client.code || `CLI-${client.id.slice(0, 6).toUpperCase()}`;

  const handleCopyCtr = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ctrCode);
    setIsCopied(true);
    toast.success(`Código do cliente ${ctrCode} copiado!`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 2. Unidade / Venue (ex: "Jardins", "Espaço Rio Lounge")
  const venueObj = venues.find(v => v.id === client.venueId);
  const venueTitle = (venueObj?.name || client.venueName || '').replace(/^Bonomo\s+/i, '');

  // 3. Detecção Limpa do Tipo de Evento & Estilo da Tag
  const detectedEventType = React.useMemo(() => {
    const explicit = normalizeEventKind(client.eventType);
    if (client.eventType && String(client.eventType).trim() && explicit !== 'outro') return KIND_LABEL[explicit];
    const raw = `${client.eventType || ''} ${(client.tags || []).join(' ')} ${client.name || ''} ${client.notes || ''}`.toLowerCase();
    if (raw.includes('casamento') || raw.includes('noivos') || raw.includes('noiva')) return 'Casamento';
    if (raw.includes('infantil') || raw.includes('kids') || raw.includes('1 aninho') || raw.includes('circo')) return 'Infantil';
    if (raw.includes('boda') || raw.includes('prata') || raw.includes('ouro')) return 'Bodas';
    if (raw.includes('corp') || raw.includes('empresa') || raw.includes('confer')) return 'Corporativo';
    if (raw.includes('40a') || raw.includes('50a') || raw.includes('60a') || raw.includes('adulto')) return 'Aniversário Adulto';
    return 'Evento';
  }, [client.eventType, client.tags, client.name, client.notes]);

  const eventBadgeStyle = React.useMemo(() => {
    switch (detectedEventType) {
      case '15 Anos':
        return {
          bg: 'rgba(236, 72, 153, 0.10)',
          color: '#EC4899',
          border: 'rgba(236, 72, 153, 0.30)',
        };
      case 'Casamento':
        return {
          bg: 'rgba(212, 175, 55, 0.12)',
          color: '#B45309',
          border: 'rgba(212, 175, 55, 0.35)',
        };
      case 'Infantil':
        return {
          bg: 'rgba(139, 92, 246, 0.10)',
          color: '#8B5CF6',
          border: 'rgba(139, 92, 246, 0.30)',
        };
      case 'Bodas':
        return {
          bg: 'rgba(245, 158, 11, 0.10)',
          color: '#D97706',
          border: 'rgba(245, 158, 11, 0.30)',
        };
      default:
        return {
          bg: 'rgba(2, 132, 199, 0.08)',
          color: '#0284C7',
          border: 'rgba(2, 132, 199, 0.25)',
        };
    }
  }, [detectedEventType]);

  // 4. Título do Contrato Oficial: [Contratante] – [Protagonista] [Tipo de Evento]
  const { contractTitle, decisorLine } = React.useMemo(() => {
    const cleanEmojis = (str: string) => 
      str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');

    const sanitize = (str?: string) => {
      if (!str) return '';
      let s = cleanEmojis(str);
      // Remove prefixos operacionais comuns como RRR, Rrr, ERL, LEAD-
      s = s.replace(/^(?:r{2,3}|erl|lead)[-\s_]+/i, '');
      // Remove parênteses com datas, anos, papéis ou sufixos
      s = s.replace(/\([^)]*\)/gi, '');
      // Remove trechos como "15A Nome DD/MM/YYYY" se sobraram soltos
      s = s.replace(/\b15A?\s+[A-Za-zÀ-ÿ]+(?:\s+\d{2}\/\d{2}\/\d{2,4})?/gi, '');
      s = s.replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, '');
      s = s.replace(/•\s*(?:15\s*Anos|Casamento|Infantil)/gi, '');
      s = s.replace(/\b15\s*Anos\b/gi, '');
      s = s.replace(/\s+/g, ' ');
      return s.trim();
    };

    let contratante = sanitize(client.payerName || client.name);
    let protagonista = sanitize(client.birthdayPersonName);

    // Tenta extrair a protagonista do formato "(15A Nome DD/MM/YYYY)" ou "(Nome DD/MM/YYYY)" do nome bruto
    const rawName = client.name || '';
    if (!protagonista || protagonista.toLowerCase() === contratante.toLowerCase()) {
      const match15A = rawName.match(/(?:15A?|\()\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)\s+\d{2}\/\d{2}/i);
      if (match15A && match15A[1] && !/^(anos?|festa|evento|confraterniz)/i.test(match15A[1])) {
        protagonista = sanitize(match15A[1]);
      } else {
        const matchDash = rawName.match(/[–-]\s*([A-Za-zÀ-ÿ]+)/i);
        if (matchDash && matchDash[1] && !/^(15\s*anos?|casamento|infantil)/i.test(matchDash[1])) {
          protagonista = sanitize(matchDash[1]);
        }
      }
    }

    // Role do Decisor (o cliente é Decisor; "Responsável" é termo interno exclusivo da equipe)
    let roleText = '';
    const relLower = String(client.payerRelationship || '').toLowerCase();
    if (relLower) {
      if (relLower.includes('mae') || relLower.includes('mãe') || relLower === 'mother') roleText = 'Mãe';
      else if (relLower.includes('pai') || relLower === 'father') roleText = 'Pai';
      else if (relLower.includes('aniversariante') || relLower.includes('debutante') || relLower === 'self') roleText = 'Próprio(a)';
      else if (relLower.includes('responsavel') || relLower.includes('responsável') || relLower === 'guardian') roleText = 'Responsável legal';
      else if (relLower.includes('outro') || relLower.includes('familiar') || relLower === 'other') roleText = 'Familiar';
    }

    // Regra Oficial do Kanban de Pós-Venda: Nome da Aniversariante (1º e 2º nome) + Evento
    const getFirstTwoNames = (fullName: string) => {
      const parts = fullName.trim().split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).join(' ');
    };

    let targetPerson = protagonista;
    if (!targetPerson) {
      const stored = String(client.contractTitle || '').trim();
      if (stored.includes('•')) {
        const parts = stored.split('•').map(p => sanitize(p));
        if (parts.length >= 2 && parts[1]) {
          targetPerson = parts[1];
        }
      }
    }
    if (!targetPerson) {
      targetPerson = contratante;
    }

    const shortName = getFirstTwoNames(targetPerson || 'Cliente');
    const eventName = detectedEventType || '15 Anos';
    const title = `${shortName} • ${eventName}`;

    const decisor = `Decisor: ${contratante || 'Cliente'}${roleText ? ` (${roleText})` : ''}`;

    return { contractTitle: title, decisorLine: decisor };
  }, [client.payerName, client.name, client.birthdayPersonName, client.birthdayPersonAge, client.contractTitle, client.eventType, client.payerRelationship, detectedEventType, ctrCode]);

  // Contatos Secundários / Familiares vinculados ao contrato (Mãe, Pai, Debutante)
  const secondaryContacts = React.useMemo(() => {
    const list = Array.isArray(client.contacts) ? client.contacts : [];
    const payerClean = (client.payerName || client.name || '').trim().toLowerCase();
    return list.filter(c => c && c.name && c.name.trim().toLowerCase() !== payerClean);
  }, [client.contacts, client.payerName, client.name]);

  // 4b. Detalhe por tipo de evento (layout base unico; so muda o que aparece na linha)
  const typeDetail = React.useMemo(() => {
    const kind = normalizeEventKind(client.eventType || detectedEventType);
    const honoree = (client.birthdayPersonName || '').trim();
    const age = client.birthdayPersonAge ? `${client.birthdayPersonAge} anos` : '';
    const pkg = (client.packageSold || '').trim();
    const parts: Record<EventKind, Array<string | undefined>> = {
      quinze_anos: [honoree, age, pkg],
      casamento: [honoree, (client.venueName || '').trim()],
      infantil: [honoree, age, (client.tags || []).find(t => /tema/i.test(t))],
      corporativo: [(client.payerName || '').trim(), client.guestCount ? `${client.guestCount} pessoas` : undefined],
      outro: [honoree, pkg],
    };
    return parts[kind].filter(Boolean).join(' · ');
  }, [client.eventType, detectedEventType, client.birthdayPersonName, client.birthdayPersonAge, client.packageSold, client.venueName, client.tags, client.payerName, client.guestCount]);

  // 5. Data do Evento & Contagem Regressiva
  const eventDateStr = client.eventDate || (client as any).partyDate;
  let daysLeft: number | null = null;
  let formattedEventDate = '';

  if (eventDateStr) {
    const [y, m, d] = eventDateStr.split('T')[0].split('-').map(Number);
    if (y && m && d) {
      formattedEventDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      const now = new Date();
      const target = new Date(y, m - 1, d, 12, 0, 0);
      const diffTime = target.getTime() - now.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // 6. Dados Financeiros (Apenas valor real, sem tags de vaidade 'Em dia')
  const baseContract = Number(client.dealValue || client.baseContractValue || 0);
  const upsells = client.upsellSales || [];
  const totalUpsell = upsells.reduce((acc, u) => acc + (Number(u.value) || 0), 0);
  const totalRentabilidade = baseContract + totalUpsell;

  // 7. Colaborador Responsável & Convidados
  const managerCollab = collaborators.find(c => 
    c.id === client.assignedSuccessManagerId || 
    c.id === (client as any).assignedToId || 
    c.name === client.assignedTo || 
    c.name === (client as any).commercialHistory?.closedBy
  );
  const responsibleStaff = managerCollab?.name || client.assignedTo || (client as any).commercialHistory?.closedBy || (client as any).responsibleStaff || '';
  const responsibleAvatar = managerCollab?.avatarUrl || (managerCollab as any)?.photoUrl;
  const guestCount = client.guestCount || (client as any).estimatedGuests || 0;

  const matchingLead = React.useMemo(() => {
    const rawPhone = client.payerPhone || (client as any).phone || '';
    const digits = rawPhone.replace(/\D/g, '').slice(-8);
    return (leads || []).find(l => {
      if (l.id === client.id || (client as any).commercialLeadId === l.id) return true;
      if (digits.length >= 8) {
        const lDigits = (l.phone || '').replace(/\D/g, '').slice(-8);
        return lDigits === digits;
      }
      return false;
    });
  }, [leads, client.id, (client as any).commercialLeadId, client.payerPhone, (client as any).phone]);

  const unreadMessagesCount = React.useMemo(() => {
    return Number(
      (client as any).unreadMessagesCount ?? 
      (client as any).unreadCount ?? 
      (client as any).pendingMessagesCount ?? 
      (matchingLead as any)?.unreadMessagesCount ?? 
      matchingLead?.unreadCount ?? 
      0
    );
  }, [client, matchingLead]);

  const clientAvatar = React.useMemo(() => {
    // 1. Imagem direta no objeto client
    const directAvatar = client.avatarUrl || (client as any).photoUrl || (client as any).profilePicUrl || (client as any).custom_field_values?.avatarUrl || (client as any).customFieldValues?.avatarUrl;
    if (directAvatar) return directAvatar;

    // 2. Coleta telefones da família vinculada ao contrato
    const phonesToTry: string[] = [];
    if (client.payerPhone) phonesToTry.push(client.payerPhone);
    if (Array.isArray(client.contacts)) {
      client.contacts.forEach(c => {
        if (c && c.phone) phonesToTry.push(c.phone);
      });
    }

    // 3. Procura nos leads registrados no sistema (onde as fotos sincronizadas pelo WhatsApp residem)
    for (const rawPhone of phonesToTry) {
      const digits = rawPhone.replace(/\D/g, '');
      if (digits.length >= 8) {
        const last8 = digits.slice(-8);
        const matchingLead = (leads || []).find(l => {
          const lDigits = (l.phone || '').replace(/\D/g, '');
          return lDigits.slice(-8) === last8 && (l.avatarUrl || (l as any).custom_field_values?.avatarUrl || (l as any).customFieldValues?.avatarUrl);
        });
        const leadPic = matchingLead?.avatarUrl || (matchingLead as any)?.custom_field_values?.avatarUrl || (matchingLead as any)?.customFieldValues?.avatarUrl;
        if (leadPic) return leadPic;
      }
    }

    // 4. Procura se algum contato já tem profile_picture_url salvo
    if (Array.isArray(client.contacts)) {
      for (const c of client.contacts) {
        const ctPic = (c as any).profile_picture_url || (c as any).profilePictureUrl || (c as any).avatarUrl;
        if (ctPic) return ctPic;
      }
    }

    return undefined;
  }, [client, leads]);

  return (
    <div
      draggable={!isMultiSelectMode}
      onDragStart={(e) => onDragStart && onDragStart(e, client.id)}
      onClick={onClick}
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: isSelectedInMulti ? 'rgba(2, 132, 199, 0.05)' : 'var(--adm-bg-card, #FFFFFF)',
        border: isSelectedInMulti ? '1.5px solid #0284C7' : (isLooseLead ? '1.5px dashed #94A3B8' : '1px solid var(--adm-border, #E2E8F0)'),
        borderLeft: isSelectedInMulti ? undefined : `4px solid ${eventBadgeStyle.color}`,
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: isSelectedInMulti ? '0 0 0 1.5px #0284C7, 0 4px 12px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        zIndex: isMenuOpen ? 150 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelectedInMulti) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'var(--adm-accent, #0284C7)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.07)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelectedInMulti) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'var(--adm-border, #E2E8F0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
        }
      }}
    >
      {isLooseLead && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '5px 8px', borderRadius: '8px', background: 'rgba(148, 163, 184, 0.14)', border: '1px solid rgba(148, 163, 184, 0.35)' }}>
          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sem contrato</span>
          {onLinkContractor && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLinkContractor(client.id); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 800, color: '#0284C7', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Link2 size={12} /> Vincular a um contratante
            </button>
          )}
        </div>
      )}

      {/* ── 1. TOPO: Menu / Multi-Select + Código CTR à Esquerda + Badge Tipo de Evento à Direita ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          {isMultiSelectMode ? (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect && onToggleSelect(client.id, e);
              }}
              style={{
                width: '15px',
                height: '15px',
                borderRadius: '3px',
                border: `1.5px solid ${isSelectedInMulti ? '#0284C7' : 'var(--adm-border, #CBD5E1)'}`,
                background: isSelectedInMulti ? '#0284C7' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {isSelectedInMulti && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
          ) : (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                style={{
                  background: isMenuOpen ? 'var(--adm-bg-input)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px',
                  cursor: 'pointer',
                  color: 'var(--adm-text-muted, #64748B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Opções do Contrato"
              >
                <MoreVertical size={13} />
              </button>

              {/* Menu Flutuante */}
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 250,
                    background: 'var(--adm-bg-card, #ffffff)',
                    border: '1px solid var(--adm-border, #CBD5E1)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.22)',
                    padding: '4px',
                    minWidth: '175px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenInspector && onOpenInspector(client.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Eye size={12} color="#0284C7" />
                    <span>Abrir Ficha / Detalhes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenWhatsApp && onOpenWhatsApp(client.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--adm-text-title)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MessageSquare size={12} color="#10B981" />
                    <span>Atendimento WhatsApp</span>
                  </button>

                  {client.debutanteSlug && onOpenDebutanteApp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenDebutanteApp(client.debutanteSlug!);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--adm-text-title)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--adm-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ExternalLink size={12} color="#F59E0B" />
                      <span>App da Debutante</span>
                    </button>
                  )}

                  <div style={{ height: '1px', background: 'var(--adm-border, #E2E8F0)', margin: '2px 0' }} />

                  {onDeleteClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteClient(client);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: 'none',
                        background: 'transparent',
                        color: '#E11D48',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(225, 29, 72, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={12} color="#E11D48" />
                      <span>Excluir Contrato</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Badge Código do Cliente */}
          <span 
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.22)',
              color: '#0284C7',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            {ctrCode}
          </span>

          <button 
            type="button"
            onClick={handleCopyCtr} 
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: 'var(--adm-text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Copiar código do cliente"
          >
            {isCopied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
          </button>
        </div>

        {/* Tag do Tipo de Evento à Direita (Casamento, 15 Anos, etc.) */}
        <span 
          style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '6px',
            background: eventBadgeStyle.bg,
            border: `1px solid ${eventBadgeStyle.border}`,
            color: eventBadgeStyle.color,
            flexShrink: 0,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
          title={`Tipo de Evento: ${detectedEventType}`}
        >
          {detectedEventType}
        </span>
      </div>

      {/* ── 2. TÍTULO DO CONTRATO: Carla Dias – Sophia Dias 15 Anos ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        <SafeAvatar
          src={clientAvatar}
          name={client.payerName || client.name || 'Cliente'}
          size={34}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 
            style={{
              fontSize: '0.84rem',
              fontWeight: 800,
              color: 'var(--adm-text-title, #0F172A)',
              margin: 0,
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={contractTitle}
          >
            {contractTitle}
          </h4>
          {typeDetail && (
            <div style={{ fontSize: '0.70rem', fontWeight: 600, color: eventBadgeStyle.color, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={typeDetail}>
              {typeDetail}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
            <User size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {decisorLine}
            </span>
          </div>
          {secondaryContacts.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                color: 'var(--adm-text-muted)',
                marginTop: '2px',
              }}
              title={secondaryContacts.map(sc => `${sc.role ? `${sc.role}: ` : ''}${sc.name}`).join(' • ')}
            >
              <Users size={11} color="#D4AF37" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {secondaryContacts.map(sc => `${sc.role ? `${sc.role}: ` : ''}${sc.name}`).join(' • ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. SUB-BOX: DATA DO EVENTO & DIAS RESTANTES ── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'var(--adm-bg-surface, #F8FAFC)',
          border: '1px solid var(--adm-border, #E2E8F0)',
          fontSize: '0.72rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-text-title)' }}>
          <Calendar size={13} color="var(--adm-accent, #0284C7)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700 }}>{formattedEventDate || 'Data a definir'}</span>
        </div>

        {daysLeft !== null && (
          <span 
            style={{
              fontSize: '0.66rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: daysLeft <= 0 ? 'rgba(16, 185, 129, 0.12)' : (daysLeft <= 30 ? 'rgba(239, 68, 68, 0.10)' : 'rgba(2, 132, 199, 0.08)'),
              color: daysLeft <= 0 ? '#059669' : (daysLeft <= 30 ? '#DC2626' : '#0284C7'),
              border: daysLeft <= 0 ? '1px solid rgba(16, 185, 129, 0.25)' : (daysLeft <= 30 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(2, 132, 199, 0.22)'),
            }}
          >
            {daysLeft <= 0 ? (daysLeft === 0 ? 'Hoje!' : 'Festa Realizada') : `Faltam ${daysLeft} dias`}
          </span>
        )}
      </div>

      {/* ── 4. UNIDADE & CONVIDADOS (Agrupados sem sobreposição com CTR) ── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '0.70rem',
          color: 'var(--adm-text-muted)',
        }}
      >
        {venueTitle ? (
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
          }}
          title={`Unidade: ${venueTitle}`}
        >
          <Building2 size={12} color="#0284C7" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {venueTitle}
          </span>
        </div>
        ) : <span />}

        {guestCount > 0 && (
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <Users size={12} color="var(--adm-text-muted)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{guestCount} convidados</span>
        </div>
        )}
      </div>

      {/* ── 5. LINHA FINANCEIRA: Valor do Contrato Limpo (Sem tags de vaidade 'Em dia') ── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '3px',
          borderTop: '1px dashed var(--adm-border, #E2E8F0)',
        }}
      >
        <div 
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsRevenueHovered(true)}
          onMouseLeave={() => setIsRevenueHovered(false)}
        >
          <span style={{ fontSize: '0.62rem', color: 'var(--adm-text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Valor do Contrato
          </span>
          <span 
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: '0.84rem',
              fontWeight: 800,
              color: 'var(--adm-text-title, #0F172A)',
              letterSpacing: '-0.3px',
              cursor: 'help',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRentabilidade)}
          </span>

          {/* Tooltip de Detalhamento no Hover do Valor */}
          {isRevenueHovered && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                zIndex: 200,
                width: '190px',
                padding: '8px 10px',
                background: 'var(--adm-bg-card, #ffffff)',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '8px',
                boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22)',
                fontSize: '0.70rem',
                color: 'var(--adm-text-body, #334155)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: 'var(--adm-text-title)', paddingBottom: '5px', marginBottom: '5px', borderBottom: '1px solid var(--adm-border)' }}>
                <Gem size={12} color="#10B981" />
                <span>Detalhamento Financeiro</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--adm-text-muted)' }}>Contrato Base:</span>
                  <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseContract)}</strong>
                </div>
                {totalUpsell > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706' }}>
                    <span>• Extras / Upsell:</span>
                    <span>+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUpsell)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, paddingTop: '4px', marginTop: '2px', borderTop: '1px dashed var(--adm-border)', color: '#047857' }}>
                  <span>Total:</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRentabilidade)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. RODAPÉ: Avatar com Foto + Nome do Colaborador Responsável + WhatsApp ── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '6px',
          borderTop: '1px solid var(--adm-border, #E2E8F0)',
          fontSize: '0.72rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
          {/* Avatar com foto ou iniciais */}
          {responsibleAvatar ? (
            <img 
              src={responsibleAvatar} 
              alt={responsibleStaff}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--adm-accent, #0284C7)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(2, 132, 199, 0.12)',
                border: '1.5px solid rgba(2, 132, 199, 0.35)',
                color: '#0284C7',
                fontSize: '0.64rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {(responsibleStaff || 'E').slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.1 }}>
              Responsável
            </span>
            <span 
              style={{ 
                fontSize: '0.74rem', 
                fontWeight: 800, 
                color: 'var(--adm-text-title)', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                maxWidth: '180px',
              }}
              title={`Responsável F5: ${responsibleStaff || 'Sem responsável'}`}
            >
              {responsibleStaff || 'Sem responsável'}
            </span>
          </div>
        </div>

        {/* Botão de WhatsApp / Notificação de Mensagens Não Lidas */}
        <div
          title={unreadMessagesCount > 0 ? `${unreadMessagesCount} mensagem(ns) não lida(s) no WhatsApp` : 'Abrir conversa no WhatsApp'}
          onClick={(e) => {
            e.stopPropagation();
            onOpenWhatsApp && onOpenWhatsApp(client.id);
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: unreadMessagesCount > 0 ? 'rgba(37, 211, 102, 0.16)' : 'var(--adm-bg-surface, #F1F5F9)',
            border: unreadMessagesCount > 0 ? '1px solid rgba(37, 211, 102, 0.5)' : '1px solid var(--adm-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.borderColor = '#25D366';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = unreadMessagesCount > 0 ? 'rgba(37, 211, 102, 0.5)' : 'var(--adm-border, #E2E8F0)';
          }}
        >
          <MessageSquare size={13} color={unreadMessagesCount > 0 ? '#10B981' : 'var(--adm-text-muted, #64748B)'} />
          {unreadMessagesCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#EF4444',
              color: '#ffffff',
              fontSize: '0.50rem',
              fontWeight: 800,
              borderRadius: '999px',
              minWidth: '13px',
              height: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.5)',
            }}>
              {unreadMessagesCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
