import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAdminState } from '../../context/AdminStateContext';
import { useMessagingPause } from '../../hooks/useMessagingPause';
import { MESSAGING_FLAG_ID, MESSAGING_PAUSED_BANNER_DEFAULT } from '../../utils/messagingPause';

interface MessagingPausedBannerProps {
  /** compact = faixa fina para o chat/compositor */
  compact?: boolean;
  style?: React.CSSProperties;
}

/** Aviso fixo (nao dispensavel) enquanto o envio e o recebimento de mensagens estao pausados. Nao renderiza nada se ativo. */
export const MessagingPausedBanner: React.FC<MessagingPausedBannerProps> = ({ compact = false, style }) => {
  const paused = useMessagingPause();
  const { featureDescriptions } = useAdminState();
  if (!paused) return null;
  const text = (featureDescriptions as Record<string, string>)?.[MESSAGING_FLAG_ID] || MESSAGING_PAUSED_BANNER_DEFAULT;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 10,
        padding: compact ? '7px 12px' : '11px 16px',
        borderRadius: compact ? 8 : 12,
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        color: 'var(--adm-text-title)',
        fontSize: compact ? '0.74rem' : '0.84rem',
        fontWeight: 700,
        lineHeight: 1.35,
        ...style,
      }}
    >
      <AlertTriangle size={compact ? 14 : 18} color="#F59E0B" style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
};
