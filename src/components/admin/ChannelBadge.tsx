import React from 'react';
import { CHANNELS, type ChannelKey } from '../../utils/channels';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';

/** Glifo (branco) do canal. Para um canal novo, basta acrescentar o caso aqui e em utils/channels.ts. */
export const ChannelIcon: React.FC<{ channel: ChannelKey; size?: number }> = ({ channel, size = 12 }) => {
  switch (channel) {
    case 'whatsapp':
      return <WhatsAppBrandIcon size={size} color="#FFFFFF" />;
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="#fff" />
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M14 8h2.2V5H13.5C11 5 10 6.5 10 8.6V10H8v3h2v6h3v-6h2.2l.5-3H13V8.9c0-.6.3-.9 1-.9z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M20.7 4.3 3.6 10.9c-.9.4-.9 1.1 0 1.4l4.3 1.4 1.7 5.1c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.4 3.3c.8.5 1.5.2 1.7-.8l2.9-13.7c.3-1.2-.4-1.7-1.9-1.5zM9 13.2l9.3-5.8c.4-.3.8-.1.5.2l-7.6 7-.3 3.2z" />
        </svg>
      );
  }
};

interface Props {
  /** Foto/avatar (qualquer elemento do tamanho informado) */
  children: React.ReactNode;
  size: number;
  /** Sem canal (ex.: formulario) = sem selo */
  channel?: ChannelKey;
}

/** Foto com o selo do canal (WhatsApp, Instagram...) no canto inferior direito. */
export const ChannelAvatar: React.FC<Props> = ({ children, size, channel }) => {
  const badge = Math.max(14, Math.round(size * 0.42));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {children}
      {channel && (
        <span
          title={CHANNELS[channel].label}
          style={{
            position: 'absolute', right: -3, bottom: -3, width: badge, height: badge, borderRadius: '50%',
            background: CHANNELS[channel].color, border: '2px solid var(--adm-bg-card, #fff)', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChannelIcon channel={channel} size={Math.round(badge * 0.62)} />
        </span>
      )}
    </div>
  );
};
