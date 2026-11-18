import React from 'react';
import { Bell } from 'lucide-react';
import { useUnreadNotifications } from '../../../utils/notificationBadge';

/** Sino do menu lateral com contador de nao lidas (some quando zero). */
export const NotificationBell: React.FC<{ size?: number }> = ({ size = 15 }) => {
  const count = useUnreadNotifications();
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Bell size={size} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: '-6px', right: '-8px', minWidth: '15px', height: '15px', padding: '0 4px',
          borderRadius: '999px', background: '#EF4444', color: '#fff', fontSize: '0.58rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, boxSizing: 'border-box',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
};
