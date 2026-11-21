import React, { useState, useEffect } from 'react';

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

  // Reseta erro quando o src da imagem mudar
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Iniciais do nome: se tamanho <= 28px, exibe apenas a PRIMEIRA inicial
  const getInitials = (n: string) => {
    if (!n) return 'L';
    const clean = n.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
    if (!clean) return (size <= 28 ? n.slice(0, 1) : n.slice(0, 2)).toUpperCase();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (size <= 28) {
      return (parts[0]?.[0] || 'L').toUpperCase();
    }
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isInvalidUrl = !src || src.trim() === '' || hasError;

  if (isInvalidUrl) {
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius,
          background: 'var(--adm-bg-input, rgba(148, 163, 184, 0.10))',
          color: 'var(--adm-text-muted, #64748B)',
          fontWeight: 700,
          fontSize: `${Math.max(size * 0.36, 10)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1.5px dashed var(--adm-border, #94A3B8)',
          userSelect: 'none',
          letterSpacing: '0.5px',
          ...style,
        }}
        title={`${name} (sem foto)`}
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
