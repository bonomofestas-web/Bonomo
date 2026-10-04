import React, { useState, useEffect } from 'react';

// Global cache in memory to avoid recalculating brightness for the same logo URL
const brightnessCache = new Map<string, boolean>();

interface VenueLogoImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  forceBlackIfLight?: boolean;
}

export const VenueLogoImage: React.FC<VenueLogoImageProps> = ({
  src,
  alt,
  style,
  forceBlackIfLight = true,
  ...props
}) => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (!src) return false;
    return brightnessCache.get(src) ?? false;
  });

  useEffect(() => {
    if (!src || !forceBlackIfLight) return;
    if (brightnessCache.has(src)) {
      setIsLight(brightnessCache.get(src)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const imgData = ctx.getImageData(0, 0, 16, 16).data;

        let totalBrightness = 0;
        let visiblePixels = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a > 35) { // Ignora pixels transparentes
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            // Fórmula padrão de luminância perceptual ITU-R BT.601
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            totalBrightness += brightness;
            visiblePixels++;
          }
        }

        if (visiblePixels > 0) {
          const avg = totalBrightness / visiblePixels;
          // Se o brilho médio for maior que 120 (dourado, amarelo, bege, branco), classifica como clara
          const lightResult = avg > 120;
          brightnessCache.set(src, lightResult);
          setIsLight(lightResult);
        }
      } catch (err) {
        // Fallback silencioso se o canvas falhar
      }
    };
    img.src = src;
  }, [src, forceBlackIfLight]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      style={{
        ...style,
        filter: isLight ? 'brightness(0)' : style?.filter,
        transition: 'filter 0.15s ease',
      }}
      {...props}
    />
  );
};
