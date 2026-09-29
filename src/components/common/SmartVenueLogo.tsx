import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface SmartVenueLogoProps {
  src?: string | null;
  alt?: string;
  size?: number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

// Cache global em memória para não recalcular a mesma logo múltiplas vezes
const logoThemeCache = new Map<string, 'dark' | 'light'>();

/**
 * Componente que renderiza a Logo da Casa de Festa com detecção inteligente de cor.
 * Analisa os pixels não-transparentes da logo via Canvas:
 * - Se a logo for clara (branca, dourada, pastel), usa fundo escuro/preto (#111116) para alto contraste.
 * - Se a logo for escura (preta, azul marinho), usa fundo claro (#FFFFFF).
 */
export const SmartVenueLogo: React.FC<SmartVenueLogoProps> = ({
  src,
  alt = 'Casa de Festa',
  size = 28,
  borderRadius = 8,
  style,
  className,
}) => {
  // Padrão 'dark' (preto) pois as marcas de eventos/casas de festa são frequentemente claras/douradas
  const [bgTheme, setBgTheme] = useState<'dark' | 'light'>(() => {
    if (src && logoThemeCache.has(src)) {
      return logoThemeCache.get(src)!;
    }
    return 'dark';
  });

  useEffect(() => {
    if (!src) return;

    if (logoThemeCache.has(src)) {
      setBgTheme(logoThemeCache.get(src)!);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 24, 24);
        const imageData = ctx.getImageData(0, 0, 24, 24);
        const data = imageData.data;

        let totalLuminance = 0;
        let validPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          // Considera apenas pixels visíveis
          if (alpha > 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Fórmula padrão ITU-R BT.601
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += lum;
            validPixels++;
          }
        }

        if (validPixels > 0) {
          const avgLuminance = totalLuminance / validPixels;
          // Se luminância média > 115, a logo é clara -> fundo deve ser escuro/preto (#111116)
          // Se <= 115, a logo é escura -> fundo deve ser claro/branco (#FFFFFF)
          const detectedTheme = avgLuminance > 115 ? 'dark' : 'light';
          logoThemeCache.set(src, detectedTheme);
          if (isMounted) {
            setBgTheme(detectedTheme);
          }
        }
      } catch {
        // Fallback gracioso caso CORS impeça leitura de pixels: mantém 'dark'
        logoThemeCache.set(src, 'dark');
      }
    };

    img.onerror = () => {
      logoThemeCache.set(src, 'dark');
    };

    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src]);

  const isDarkBg = bgTheme === 'dark';

  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius,
          background: 'rgba(212, 175, 55, 0.12)',
          border: '1px solid var(--adm-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--adm-accent)',
          flexShrink: 0,
          ...style,
        }}
      >
        <Building2 size={Math.round(size * 0.55)} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius,
        background: isDarkBg ? '#111116' : '#FFFFFF',
        border: isDarkBg ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--adm-border)',
        boxShadow: isDarkBg ? '0 2px 6px rgba(0, 0, 0, 0.4)' : '0 1px 4px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3px',
        flexShrink: 0,
        transition: 'background 0.2s ease, border-color 0.2s ease',
        ...style,
      }}
      title={alt}
    >
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: isDarkBg ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : 'none',
        }}
      />
    </div>
  );
};
