import React, { useState, useMemo } from 'react';
import { 
  Users, Crown, ShieldCheck, PhoneCall, Handshake, 
  Building2, Sparkles, Compass
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';

// WhatsApp Brand SVG Icon
const WhatsAppBrandIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.176.2-.351.226-.652.075-1.781-.892-2.946-1.597-4.108-3.593-.306-.527.306-.489.876-1.629.096-.192.048-.36-.024-.51-.072-.15-.678-1.636-.93-2.242-.244-.588-.493-.509-.678-.518-.176-.008-.377-.01-.578-.01s-.527.075-.803.376c-.276.301-1.055 1.03-1.055 2.511s1.08 2.913 1.231 3.114c.151.2 2.126 3.246 5.15 4.553.719.311 1.28.497 1.718.636.723.23 1.381.198 1.901.12.58-.087 1.78-.728 2.032-1.431.252-.703.252-1.305.176-1.431-.076-.126-.276-.201-.577-.351z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.92.545 3.715 1.488 5.237L2.05 21.95l4.857-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.634 0-3.175-.483-4.472-1.314l-.321-.205-2.887.826.837-2.822-.218-.337A8.17 8.17 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z"/>
  </svg>
);

const HIERARCHY_ORDER: Record<string, number> = {
  master: 1,
  dev: 1,
  admin: 2,
  closer: 3,
  sdr: 4,
  pos_venda: 5,
  crm: 6,
};

export const AdminTeamView: React.FC = () => {
  const { collaborators, venues, currentUser, activeVenueId } = useAdminState();
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>(activeVenueId || 'all');

  // Filter and sort collaborators by strict hierarchy
  const sortedCollaborators = useMemo(() => {
    return collaborators
      .filter(c => {
        if (!c.active) return false;
        if (selectedVenueFilter === 'all') return true;
        if (c.role === 'master') return true;
        return c.venueIds && c.venueIds.includes(selectedVenueFilter);
      })
      .sort((a, b) => {
        const rankA = HIERARCHY_ORDER[a.role] ?? 99;
        const rankB = HIERARCHY_ORDER[b.role] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [collaborators, selectedVenueFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
      case 'dev':
        return { label: 'Diretoria / Master', bg: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', border: 'rgba(212, 175, 55, 0.35)', icon: Crown };
      case 'admin':
        return { label: 'Gerente Geral', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)', icon: ShieldCheck };
      case 'closer':
        return { label: 'Closer (Fechamento)', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.35)', icon: Handshake };
      case 'sdr':
        return { label: 'SDR (Qualificação)', bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', border: 'rgba(139, 92, 246, 0.35)', icon: PhoneCall };
      case 'pos_venda':
        return { label: 'Pós-Venda & Sucesso', bg: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', border: 'rgba(6, 182, 212, 0.35)', icon: Sparkles };
      case 'crm':
        return { label: 'Gestor de CRM', bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: 'rgba(245, 158, 11, 0.35)', icon: Compass };
      default:
        return { label: 'Colaborador', bg: 'var(--adm-bg-input)', color: 'var(--adm-text-muted)', border: 'var(--adm-border)', icon: Users };
    }
  };

  const cleanWhatsappNumber = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) return digits;
    return `55${digits}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="var(--adm-accent)" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.3px', margin: 0 }}>
              Equipe do Workspace
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(20, 169, 215, 0.12)',
              color: '#14A9D7',
              border: '1px solid rgba(20, 169, 215, 0.3)',
              padding: '2px 8px',
              borderRadius: '20px',
            }}>
              {sortedCollaborators.length} membros
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: '4px 0 0 0' }}>
            Colaboradores e atendentes da rede, ordenados por hierarquia com canal direto de contato.
          </p>
        </div>

        {/* Filter by Venue */}
        {venues.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={15} color="var(--adm-text-muted)" />
            <select
              value={selectedVenueFilter}
              onChange={(e) => setSelectedVenueFilter(e.target.value)}
              style={{
                background: 'var(--adm-bg-card)',
                border: '1px solid var(--adm-border)',
                color: 'var(--adm-text-title)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todas as Casas de Festas</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of Clean Cards (5 per row on desktop) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '16px',
      }}>
        {sortedCollaborators.map(collab => {
          const isMe = Boolean(currentUser && (collab.id === currentUser.id || collab.email === currentUser.email));
          const roleConfig = getRoleBadge(collab.role);
          const RoleIcon = roleConfig.icon;
          const cleanPhone = cleanWhatsappNumber(collab.phone);

          const assignedVenues = (collab.venueIds || [])
            .map(id => venues.find(v => v.id === id)?.name)
            .filter(Boolean);

          return (
            <div
              key={collab.id}
              style={{
                background: isMe ? 'var(--adm-accent-bg)' : 'var(--adm-bg-card)',
                border: isMe ? '1.5px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                borderRadius: '16px',
                padding: '18px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '10px',
                position: 'relative',
                boxShadow: isMe ? '0 4px 16px rgba(20, 169, 215, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isMe ? '0 4px 16px rgba(20, 169, 215, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              {/* "Você" Indicator */}
              {isMe && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--adm-accent)',
                  color: '#FFFFFF',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}>
                  <Sparkles size={9} />
                  <span>Você</span>
                </div>
              )}

              {/* Photo / Avatar */}
              <div style={{ position: 'relative' }}>
                {collab.avatarUrl ? (
                  <img
                    src={collab.avatarUrl}
                    alt={collab.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: isMe ? '2.5px solid var(--adm-accent)' : '2px solid var(--adm-border)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(20, 169, 215, 0.2) 0%, rgba(20, 169, 215, 0.05) 100%)',
                    border: isMe ? '2.5px solid var(--adm-accent)' : '2px solid var(--adm-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--adm-accent)',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    fontFamily: "'Cinzel', serif",
                  }}>
                    {collab.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Custom Job */}
              <div style={{ width: '100%', minWidth: 0 }}>
                <div style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: 'var(--adm-text-title)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {collab.name}
                </div>

                {collab.customJobTitle && (
                  <div style={{
                    fontSize: '0.70rem',
                    color: 'var(--adm-accent)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px',
                  }}>
                    {collab.customJobTitle}
                  </div>
                )}
              </div>

              {/* Role Badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: roleConfig.bg,
                border: `1px solid ${roleConfig.border}`,
                color: roleConfig.color,
                fontSize: '0.62rem',
                fontWeight: 700,
              }}>
                <RoleIcon size={10} />
                <span>{roleConfig.label}</span>
              </span>

              {/* Assigned Venues */}
              {assignedVenues.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                  fontSize: '0.62rem',
                  color: 'var(--adm-text-muted)',
                }}>
                  <Building2 size={10} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                    {assignedVenues.join(', ')}
                  </span>
                </div>
              )}

              {/* WhatsApp Button (wa.me) */}
              <div style={{ marginTop: 'auto', width: '100%', paddingTop: '4px' }}>
                {cleanPhone ? (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(37, 211, 102, 0.12)',
                      border: '1px solid rgba(37, 211, 102, 0.35)',
                      color: '#25D366',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 211, 102, 0.22)';
                      e.currentTarget.style.borderColor = '#25D366';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 211, 102, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.35)';
                    }}
                  >
                    <WhatsAppBrandIcon size={13} color="#25D366" />
                    <span>{formatPhone(collab.phone || '')}</span>
                  </a>
                ) : (
                  <span style={{
                    fontSize: '0.66rem',
                    color: 'var(--adm-text-muted)',
                    fontStyle: 'italic',
                    padding: '4px 0',
                    display: 'block',
                  }}>
                    Sem WhatsApp
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
