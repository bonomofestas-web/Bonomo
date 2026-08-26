import React, { useEffect, useState } from 'react';

interface TransparentRewardProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  status?: string;
}

export const TransparentRewardVisual: React.FC<TransparentRewardProps> = ({
  src,
  alt,
  style,
  className,
}) => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width || 300;
        const height = img.naturalHeight || img.height || 300;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Sample border corner pixels to detect exact background color
        const cornerIndices = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          ((height - 1) * width + (width - 1)) * 4,
          (10 * width + 10) * 4,
          (10 * width + (width - 10)) * 4
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        cornerIndices.forEach(idx => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR = Math.round(bgR / cornerIndices.length);
        bgG = Math.round(bgG / cornerIndices.length);
        bgB = Math.round(bgB / cornerIndices.length);

        // Flood fill algorithm starting from all border pixels
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        for (let x = 0; x < width; x++) {
          queue.push(x);
          queue.push((height - 1) * width + x);
          visited[x] = 1;
          visited[(height - 1) * width + x] = 1;
        }
        for (let y = 0; y < height; y++) {
          queue.push(y * width);
          queue.push(y * width + (width - 1));
          visited[y * width] = 1;
          visited[y * width + (width - 1)] = 1;
        }

        const threshold = 52;
        let head = 0;

        while (head < queue.length) {
          const curr = queue[head++];
          const x = curr % width;
          const y = Math.floor(curr / width);
          const idx = curr * 4;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          const isLightBg = (r > 200 && g > 200 && b > 200) || (r > 185 && g > 175 && b > 175 && dist < threshold * 1.5);

          if (dist < threshold || isLightBg) {
            data[idx + 3] = 0; // Set Alpha to 0 (100% transparent!)

            const neighbors = [
              x > 0 ? curr - 1 : -1,
              x < width - 1 ? curr + 1 : -1,
              y > 0 ? curr - width : -1,
              y < height - 1 ? curr + width : -1
            ];

            for (const n of neighbors) {
              if (n >= 0 && !visited[n]) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        if (isMounted) {
          setProcessedUrl(dataUrl);
        }
      } catch (e) {
        console.warn('Canvas transparency fallback applied:', e);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <img
      src={processedUrl || src}
      alt={alt}
      className={className}
      style={{
        ...style,
        background: 'transparent',
      }}
    />
  );
};
