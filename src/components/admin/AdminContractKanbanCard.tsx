import React, { useState } from 'react';
import { 
  Building2, Calendar, User, Users, 
  Copy, Check, MessageSquare, MoreVertical, Eye, ExternalLink, 
  Trash2, Gem
} from 'lucide-react';
import { toast } from 'sonner';
import type { Client, Collaborator, Venue } from '../../types/admin';

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
  venues = [],
  collaborators = [],
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRevenueHovered, setIsRevenueHovered] = useState(false);

  // 1. Código CTR Base36
  const ctrCode = customContractCode || 
    (client as any).contractCode || 
    (client.code?.startsWith('CTR-') ? client.code : `CTR-2026-${client.code?.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'S8V1RM'}`);

  const handleCopyCtr = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ctrCode);
    setIsCopied(true);
    toast.success(`Código ${ctrCode} copiado!`);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 2. Unidade / Venue (ex: "Jardins", "Espaço Rio Lounge")
  const venueObj = venues.find(v => v.id === client.venueId);
  const venueTitle = (venueObj?.name || client.venueName || 'Jardins').replace(/^Bonomo\s+/i, '');

  // 3. Detecção Limpa do Tipo de Evento & Estilo da Tag
  const detectedEventType = React.useMemo(() => {
    const raw = `${client.eventType || ''} ${(client.tags || []).join(' ')} ${client.name || ''} ${client.notes || ''}`.toLowerCase();
    if (raw.includes('casamento') || raw.includes('noivos') || raw.includes('noiva')) return 'Casamento';
    if (raw.includes('infantil') || raw.includes('kids') || raw.includes('1 aninho') || raw.includes('circo')) return 'Infantil';
    if (raw.includes('boda') || raw.includes('prata') || raw.includes('ouro')) return 'Bodas';
    if (raw.includes('corp') || raw.includes('empresa') || raw.includes('confer')) return 'Corporativo';
    if (raw.includes('40a') || raw.includes('50a') || raw.includes('60a') || raw.includes('adulto')) return 'Aniversário Adulto';
    return '15 Anos';
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
    let roleText = 'Mãe';
    const relLower = String(client.payerRelationship || '').toLowerCase();
    if (relLower.includes('mae') || relLower.includes('mãe') || relLower === 'mother') {
      roleText = 'Mãe';
    } else if (relLower.includes('pai') || relLower === 'father') {
      roleText = 'Pai';
    } else if (relLower.includes('aniversariante') || relLower.includes('debutante') || relLower === 'self') {
      roleText = 'Próprio(a)';
    } else if (relLower.includes('outro') || relLower.includes('familiar') || relLower === 'other') {
      roleText = 'Familiar';
    } else if (rawName && /\((father|pai)\)/i.test(rawName)) {
      roleText = 'Pai';
    } else {
      roleText = 'Mãe';
    }

    // Monta título limpo no padrão Carla Dias – Sophia Dias 15 Anos
    let title = '';
    if (contratante && protagonista && contratante.toLowerCase() !== protagonista.toLowerCase()) {
      title = `${contratante} – ${protagonista} ${detectedEventType}`;
    } else if (contratante) {
      title = `${contratante} – ${detectedEventType}`;
    } else {
      title = `Contrato ${ctrCode}`;
    }

    const decisor = `Decisor: ${contratante || 'Cliente'} (${roleText})`;

    return { contractTitle: title, decisorLine: decisor };
  }, [client.payerName, client.name, client.birthdayPersonName, client.payerRelationship, detectedEventType, ctrCode]);

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
  const responsibleStaff = managerCollab?.name || client.assignedTo || (client as any).commercialHistory?.closedBy || (client as any).responsibleStaff || (collaborators.length > 0 ? collaborators[0]?.name : 'Equipe F5');
  const responsibleAvatar = managerCollab?.avatarUrl || (managerCollab as any)?.photoUrl;
  const guestCount = client.guestCount || (client as any).estimatedGuests || 160;

  return (
    <div
      draggable={!isMultiSelectMode}
      onDragStart={(e) => onDragStart && onDragStart(e, client.id)}
      onClick={onClick}
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: isSelectedInMulti ? 'rgba(2, 132, 199, 0.05)' : 'var(--adm-bg-card, #FFFFFF)',
        border: isSelectedInMulti ? '1.5px solid #0284C7' : '1px solid var(--adm-border, #E2E8F0)',
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

          {/* Badge Código CTR */}
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
            title="Copiar Código CTR"
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
      <div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
          <User size={11} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {decisorLine}
          </span>
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
              title={`Responsável F5: ${responsibleStaff}`}
            >
              {responsibleStaff}
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenWhatsApp && onOpenWhatsApp(client.id);
          }} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#059669',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
          }}
          title="Abrir Atendimento no WhatsApp"
        >
          <MessageSquare size={13} color="#059669" />
        </button>
      </div>
    </div>
  );
};
