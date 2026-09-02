import React from 'react';

interface IcpTargetUserIconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Ícone do ICP: Alvo / Mira com a silhueta do Usuário / Lead no centro.
 */
export const IcpTargetUserIcon: React.FC<IcpTargetUserIconProps> = ({
  size = 18,
  color = 'currentColor',
  className,
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Círculo externo do Alvo */}
      <circle cx="12" cy="12" r="9.5" />
      
      {/* Mira / Ticks dos eixos do alvo */}
      <line x1="12" y1="1" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="23" />
      <line x1="1" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="23" y2="12" />
      
      {/* Cabeça do Usuário centralizado */}
      <circle cx="12" cy="9.5" r="2.5" />
      
      {/* Ombros / Corpo do Usuário no alvo */}
      <path d="M7.5 16.8c0-2.2 2-3.6 4.5-3.6s4.5 1.4 4.5 3.6" />
    </svg>
  );
};
