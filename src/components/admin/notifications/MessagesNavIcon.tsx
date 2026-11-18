import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAdminState } from '../../../context/AdminStateContext';

/**
 * Icone de "Mensagens" no menu com o numero de conversas nao lidas (como o circulo do WhatsApp).
 * Conta so o que e do usuario (SDR/Closer do lead) ou ainda nao tem dono. Sem consulta ao banco: usa os leads ja carregados.
 */
export const MessagesNavIcon: React.FC<{ size?: number }> = ({ size = 15 }) => {
  const { leads, currentUser } = useAdminState();
  const count = useMemo(() => {
    const me = currentUser?.id;
    if (!me) return 0;
    return leads.filter(l =>
      (l.unreadCount || 0) > 0 && !l.isClient &&
      (l.sdrId === me || l.closerId === me || (!l.sdrId && !l.closerId)),
    ).length;
  }, [leads, currentUser?.id]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <MessageSquare size={size} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: '-6px', right: '-8px', minWidth: '15px', height: '15px', padding: '0 4px',
          borderRadius: '999px', background: '#25D366', color: '#fff', fontSize: '0.58rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, boxSizing: 'border-box',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
};
