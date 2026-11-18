import React from 'react';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Mini-grafico de barras em SVG (leve para tabelas). Dia sem movimento aparece como uma linha fina. */
export const SourceSparkline: React.FC<Props> = ({ values, width = 84, height = 26, color = 'var(--adm-accent, #3B82F6)' }) => {
  const max = Math.max(1, ...values);
  const gap = 3;
  const barW = Math.max(3, (width - gap * (values.length - 1)) / values.length);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Movimento dos últimos dias">
      {values.map((v, i) => {
        const h = v === 0 ? 2 : Math.max(4, Math.round((v / max) * (height - 2)));
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1.5}
            fill={color}
            opacity={v === 0 ? 0.25 : 1}
          />
        );
      })}
    </svg>
  );
};
