import React from 'react';

const ROLE_LABELS: Record<string, string> = {
  sdr: 'SDR',
  closer: 'Closer',
  dev: 'Desenvolvedor',
  master: 'Master',
  admin: 'Admin',
  crm: 'CRM',
  pos_venda: 'Pós-venda',
  gerente_comercial: 'Gerente Comercial',
  gerente_geral: 'Gerente Geral',
};

export const roleLabel = (role?: string | null): string => {
  const key = (role || '').toLowerCase();
  return ROLE_LABELS[key] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Equipe');
};

// Nome do colaborador sempre acompanhado da tag do cargo registrado
export const CollaboratorIdentity: React.FC<{ name: string; role?: string | null; nameSize?: string }> = ({ name, role, nameSize = '0.8rem' }) => (
  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
    <span title={name} style={{ fontSize: nameSize, fontWeight: 800, color: 'var(--adm-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
      {name}
    </span>
    <span style={{
      fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
      padding: '1px 6px', borderRadius: '4px', color: 'var(--adm-text-muted)',
      background: 'var(--adm-bg-input)', border: '1px solid var(--adm-border)',
    }}>
      {roleLabel(role)}
    </span>
  </div>
);
