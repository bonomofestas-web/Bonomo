import React, { useState } from 'react';
import { MoreVertical, Eye, MessageSquare, Trash2, Check, Link2, Building2, Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhone } from '../../utils/phoneFormatter';
import { relationshipLabel } from '../../utils/roleLabels';
import { SafeAvatar } from './SafeAvatar';
import type { Client, Collaborator, Venue } from '../../types/admin';
import { useAdminState } from '../../context/AdminStateContext';

export interface ClientPersonKanbanCardProps {
  client: Client;
  /** Lead em funil de pos-venda que nem virou cliente: ainda pode ser vinculado a um contratante */
  isLooseLead?: boolean;
  isMultiSelectMode?: boolean;
  isSelectedInMulti?: boolean;
  onToggleSelect?: (clientId: string, e?: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, clientId: string) => void;
  onClick?: () => void;
  onOpenInspector?: (clientId: string) => void;
  onOpenWhatsApp?: (clientId: string) => void;
  onDeleteClient?: (client: Client) => void;
  onLinkContractor?: (leadId: string) => void;
  venues?: Venue[];
  collaborators?: Collaborator[];
}

/**
 * Card de PESSOA (cliente ou lead que mandou mensagem e ainda NAO tem contrato).
 * Propositalmente diferente do card de contrato: cinza, borda tracejada, sem evento, convidados nem valores.
 * So mostra dados reais; nada vem pre-preenchido.
 */
export const ClientPersonKanbanCard: React.FC<ClientPersonKanbanCardProps> = ({
  client, isLooseLead = false, isMultiSelectMode = false, isSelectedInMulti = false,
  onToggleSelect, onDragStart, onClick, onOpenInspector, onOpenWhatsApp, onDeleteClient, onLinkContractor,
  venues = [], collaborators = [],
}) => {
  const { leads = [] } = useAdminState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = client.code || '';
  const phone = client.payerPhone || '';
  const relation = client.payerRelationship ? relationshipLabel(client.payerRelationship, '') : '';
  const venueName = (venues.find(v => v.id === client.venueId)?.name || client.venueName || '').replace(/^Bonomo\s+/i, '');
  const managerId = client.assignedSuccessManagerId || (client as any).assignedToId;
  const responsible = collaborators.find(c => c.id === managerId)?.name || client.assignedSuccessManagerName || client.assignedTo || '';
  const displayName = (client.name || client.payerName || 'Sem nome').trim();
  const clientAvatar = React.useMemo(() => {
    const directAvatar = client.avatarUrl || (client as any).photoUrl || (client as any).profilePicUrl || (client as any).custom_field_values?.avatarUrl || (client as any).customFieldValues?.avatarUrl;
    if (directAvatar) return directAvatar;

    // Procura por ID direto no leads
    const matchingById = (leads || []).find(l => l.id === client.id);
    const picById = matchingById?.avatarUrl || (matchingById as any)?.custom_field_values?.avatarUrl || (matchingById as any)?.customFieldValues?.avatarUrl;
    if (picById) return picById;

    // Procura por telefone no leads
    const rawPhone = phone || (client as any).phone || '';
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
    return undefined;
  }, [client, leads, phone]);

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`Código do cliente ${code} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 5, border: 'none', background: 'transparent',
    color: 'var(--adm-text-title)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%',
  };

  return (
    <div
      draggable={!isMultiSelectMode}
      onDragStart={(e) => onDragStart && onDragStart(e, client.id)}
      onClick={onClick}
      style={{
        fontFamily: "'Inter', sans-serif",
        background: isSelectedInMulti ? 'rgba(2, 132, 199, 0.06)' : 'var(--adm-bg-surface, #F1F5F9)',
        border: isSelectedInMulti ? '1.5px solid #0284C7' : '1.5px dashed #94A3B8',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        zIndex: menuOpen ? 150 : 1,
      }}
    >
      {/* Faixa: sem contrato (nitidamente diferente do card de contrato) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {isMultiSelectMode ? (
            <div
              onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(client.id, e); }}
              style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${isSelectedInMulti ? '#0284C7' : '#CBD5E1'}`, background: isSelectedInMulti ? '#0284C7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              {isSelectedInMulti && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
          ) : (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                title="Opções"
                style={{ background: menuOpen ? 'var(--adm-bg-input)' : 'transparent', border: 'none', borderRadius: 4, padding: 2, cursor: 'pointer', color: 'var(--adm-text-muted, #64748B)', display: 'flex' }}
              >
                <MoreVertical size={13} />
              </button>
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 250, background: 'var(--adm-bg-card, #fff)', border: '1px solid var(--adm-border, #CBD5E1)', borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.22)', padding: 4, minWidth: 175, display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  <button type="button" style={menuItem} onClick={() => { setMenuOpen(false); onOpenInspector && onOpenInspector(client.id); }}>
                    <Eye size={12} color="#0284C7" /><span>Abrir ficha</span>
                  </button>
                  <button type="button" style={menuItem} onClick={() => { setMenuOpen(false); onOpenWhatsApp && onOpenWhatsApp(client.id); }}>
                    <MessageSquare size={12} color="#10B981" /><span>Atendimento WhatsApp</span>
                  </button>
                  {onDeleteClient && !isLooseLead && (
                    <>
                      <div style={{ height: 1, background: 'var(--adm-border, #E2E8F0)', margin: '2px 0' }} />
                      <button type="button" style={{ ...menuItem, color: '#E11D48' }} onClick={() => { setMenuOpen(false); onDeleteClient(client); }}>
                        <Trash2 size={12} /><span>Remover cliente</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sem contrato</span>
        </div>

        {code && (
          <button type="button" onClick={copyCode} title="Copiar código do cliente"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.66rem', fontWeight: 700, padding: 0 }}>
            {code}{copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
          </button>
        )}
      </div>

      {/* Pessoa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <SafeAvatar
          src={clientAvatar}
          name={displayName}
          size={34}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--adm-text-title, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayName}>
            {displayName}
          </div>
          {phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginTop: 1 }}>
              <Phone size={11} /> <span>{formatPhone(phone)}</span>
            </div>
          )}
        </div>
        {relation && (
          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)', flexShrink: 0 }}>
            {relation}
          </span>
        )}
      </div>

      {(venueName || responsible) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.7rem', color: 'var(--adm-text-muted)', borderTop: '1px dashed #CBD5E1', paddingTop: 6 }}>
          {venueName ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }} title={`Unidade: ${venueName}`}>
              <Building2 size={12} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venueName}</span>
            </span>
          ) : <span />}
          {responsible && <span style={{ fontWeight: 700, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} title={`Responsável: ${responsible}`}>{responsible}</span>}
        </div>
      )}

      {/* Acao: lead solto vincula a contratante; cliente sem contrato abre a ficha para vincular o contrato */}
      {isLooseLead && onLinkContractor ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onLinkContractor(client.id); }}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, color: '#0284C7', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <Link2 size={12} /> Vincular a um contratante
        </button>
      ) : onOpenInspector ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenInspector(client.id); }}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, color: '#0284C7', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <Link2 size={12} /> Vincular contrato
        </button>
      ) : null}
    </div>
  );
};
