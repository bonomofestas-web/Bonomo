import React, { useState, useMemo } from 'react';
import { 
  Users, Crown, ShieldCheck, PhoneCall, Handshake, 
  Building2, Mail, Phone, Sparkles, Compass
} from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { formatPhone } from '../../utils/phoneFormatter';
import type { Collaborator } from '../../types/admin';

export const AdminTeamView: React.FC = () => {
  const { collaborators, venues, currentUser, activeVenueId } = useAdminState();
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>(activeVenueId || 'all');

  // Filter collaborators by venue if selected
  const activeCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      if (!c.active) return false;
      if (selectedVenueFilter === 'all') return true;
      if (c.role === 'master' || c.role === 'dev') return true; // Leadership serves all venues
      return c.venueIds && c.venueIds.includes(selectedVenueFilter);
    });
  }, [collaborators, selectedVenueFilter]);

  // Hierarchical groupings:
  // Level 1: Diretoria & Master
  const leadership = useMemo(() => {
    return activeCollaborators.filter(c => c.role === 'master' || c.role === 'dev');
  }, [activeCollaborators]);

  // Level 2: Gerência & Coordenação
  const management = useMemo(() => {
    return activeCollaborators.filter(c => c.role === 'admin');
  }, [activeCollaborators]);

  // Level 3: Equipe Comercial & Operações (SDRs, Closers, Pós-Venda, CRM)
  const operationalTeam = useMemo(() => {
    return activeCollaborators.filter(c => c.role !== 'master' && c.role !== 'dev' && c.role !== 'admin');
  }, [activeCollaborators]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
      case 'dev':
        return { label: 'Diretoria Executiva', bg: 'rgba(212, 175, 55, 0.15)', color: 'var(--adm-accent)', border: 'rgba(212, 175, 55, 0.35)', icon: Crown };
      case 'admin':
        return { label: 'Gerente Geral', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)', icon: ShieldCheck };
      case 'closer':
        return { label: 'Closer (Fechamento VIP)', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'rgba(16, 185, 129, 0.35)', icon: Handshake };
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

  const renderMemberCard = (collab: Collaborator) => {
    const isMe = Boolean(currentUser && (collab.id === currentUser.id || collab.email === currentUser.email));
    const roleConfig = getRoleBadge(collab.role);
    const RoleIcon = roleConfig.icon;

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
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          boxShadow: isMe ? '0 4px 20px rgba(212, 175, 55, 0.15)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        {/* "Você está aqui" Badge */}
        {isMe && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '16px',
            background: 'var(--adm-accent)',
            color: '#000000',
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Sparkles size={11} />
            <span>Você está aqui</span>
          </div>
        )}

        {/* Member Header: Photo + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {collab.avatarUrl ? (
            <img
              src={collab.avatarUrl}
              alt={collab.name}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: isMe ? '2px solid var(--adm-accent)' : '1px solid var(--adm-border)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--adm-bg-input)',
              border: isMe ? '2px solid var(--adm-accent)' : '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMe ? 'var(--adm-accent)' : 'var(--adm-text-title)',
              fontWeight: 800,
              fontSize: '1rem',
              flexShrink: 0,
            }}>
              {collab.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {collab.name}
            </div>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: roleConfig.bg,
              border: `1px solid ${roleConfig.border}`,
              color: roleConfig.color,
              fontSize: '0.68rem',
              fontWeight: 700,
            }}>
              <RoleIcon size={11} />
              <span>{roleConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Contact info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          fontSize: '0.74rem',
          color: 'var(--adm-text-muted)',
          borderTop: '1px solid var(--adm-border)',
          paddingTop: '10px',
        }}>
          {collab.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <Mail size={12} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{collab.email}</span>
            </div>
          )}
          {collab.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={12} style={{ flexShrink: 0 }} />
              <span>{formatPhone(collab.phone)}</span>
            </div>
          )}
        </div>

        {/* Venue affiliations */}
        {assignedVenues.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', paddingTop: '4px' }}>
            {assignedVenues.map((vName, i) => (
              <span key={i} style={{
                fontSize: '0.64rem',
                color: 'var(--adm-text-muted)',
                background: 'var(--adm-bg-input)',
                border: '1px solid var(--adm-border)',
                borderRadius: '6px',
                padding: '2px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                <Building2 size={10} />
                <span>{vName}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      padding: '24px 32px 60px 32px',
      width: '100%',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.25s ease-out',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Users size={24} color="var(--adm-accent)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--adm-text-title)', letterSpacing: '-0.4px', margin: 0 }}>
              Equipe do Workspace
            </h1>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', margin: 0, maxWidth: '650px' }}>
            Estrutura hierárquica e organograma dos colaboradores integrados à Bonomo Festas. Localize gestores, atendentes e colegas de time.
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

      {/* ── NÍVEL 1: DIRETORIA & MASTER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid var(--adm-border)', paddingBottom: '8px' }}>
          <Crown size={18} color="var(--adm-accent)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Diretoria Executiva & Master
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>({leadership.length})</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {leadership.map(renderMemberCard)}
        </div>
      </div>

      {/* ── NÍVEL 2: GERÊNCIA & COORDENAÇÃO GERAL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid var(--adm-border)', paddingBottom: '8px' }}>
          <ShieldCheck size={18} color="#60A5FA" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Gerência Geral & Coordenação
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>({management.length})</span>
        </div>

        {management.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
            Nenhum gerente designado para este filtro.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {management.map(renderMemberCard)}
          </div>
        )}
      </div>

      {/* ── NÍVEL 3: EQUIPE COMERCIAL & OPERAÇÕES ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid var(--adm-border)', paddingBottom: '8px' }}>
          <Users size={18} color="#10B981" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Equipe Comercial, SDRs & Pós-Venda
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)' }}>({operationalTeam.length})</span>
        </div>

        {operationalTeam.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
            Nenhum membro comercial cadastrado para este filtro.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {operationalTeam.map(renderMemberCard)}
          </div>
        )}
      </div>
    </div>
  );
};
