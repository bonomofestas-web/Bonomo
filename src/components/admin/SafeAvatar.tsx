import React, { useState } from 'react';

interface SafeAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  border?: string;
  borderRadius?: string;
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  name = 'Lead',
  size = 36,
  className = '',
  style = {},
  border = '1.5px solid var(--adm-border)',
  borderRadius = '50%',
}) => {
  const [hasError, setHasError] = useState(false);

  // Iniciais do nome
  const getInitials = (n: string) => {
    if (!n) return 'L';
    const clean = n.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
    if (!clean) return n.slice(0, 2).toUpperCase();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Cores dinâmicas harmoniosas baseadas no nome
  const getAvatarGradient = (n: string) => {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      ['#3B82F6', '#1D4ED8'], // Azul
      ['#10B981', '#047857'], // Esmeralda
      ['#8B5CF6', '#6D28D9'], // Roxo
      ['#F59E0B', '#B45309'], // Âmbar
      ['#EC4899', '#BE185D'], // Rosa
      ['#06B6D4', '#0E7490'], // Ciano
      ['#6366F1', '#4338CA'], // Índigo
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const isInvalidUrl = !src || src.trim() === '' || hasError;

  if (isInvalidUrl) {
    const [c1, c2] = getAvatarGradient(name);
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius,
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: `${Math.max(size * 0.38, 10)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border,
          userSelect: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          ...style,
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius,
        objectFit: 'cover',
        border,
        flexShrink: 0,
        ...style,
      }}
    />
  );
};
