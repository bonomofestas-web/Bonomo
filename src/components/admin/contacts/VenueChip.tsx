import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useAdminState } from '../../../context/AdminStateContext';
import { buildVenueAccentMap } from '../../../utils/venueColors';

/** Selo da unidade, com a cor da casa: todo ativo (lead, contrato, tarefa, orcamento) mostra a que unidade pertence. */
export const VenueChip: React.FC<{ venueId?: string | null; fallbackName?: string }> = ({ venueId, fallbackName }) => {
  const { venues } = useAdminState();
  const accents = useMemo(() => buildVenueAccentMap(venues), [venues]);
  const acc = venueId ? accents.get(venueId) : undefined;
  const label = acc?.label || fallbackName;
  if (!label) return <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(148,163,184,0.18)', color: '#64748B' }}>Sem unidade</span>;
  const color = acc?.color || '#64748B';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: `${color}22`, color, border: `1px solid ${color}55`, whiteSpace: 'nowrap' }}>
      <Building2 size={11} /> {label}
    </span>
  );
};
