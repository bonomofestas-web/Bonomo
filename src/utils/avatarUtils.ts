/**
 * Generates an ultra-luxurious gold monogram avatar (SVG Data URL)
 * featuring the debutante's initial inside a gold-bordered medallion with a crown.
 */
export const createMonogramAvatar = (name: string): string => {
  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : 'D';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFE89E"/>
        <stop offset="60%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#99771F"/>
      </radialGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#140B1F"/>
        <stop offset="100%" stop-color="#050308"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="128" fill="url(#bgGrad)"/>
    <circle cx="128" cy="128" r="116" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
    <circle cx="128" cy="128" r="106" fill="rgba(212,175,55,0.08)"/>
    <path d="M112 90 L128 74 L144 90 L138 102 L118 102 Z" fill="url(#goldGrad)"/>
    <text x="128" y="168" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-size="80" font-weight="900" fill="url(#goldGrad)" text-anchor="middle">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Generates a 512x512 PWA Home Screen Icon with a solid black background
 * and the venue's golden logo perfectly proportioned and centered.
 * Never leaves transparency to prevent iOS Safari from defaulting to white.
 */
export const generateBlackGoldPwaIcon = (logoUrl: string, venueName = 'Bonomo'): Promise<string> => {
  return new Promise<string>((resolve) => {
    const generateFallbackIcon = (): string => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return logoUrl || '/favicon.png';

        // 1. Solid pure black background (eliminates any white background on iOS)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);

        // 2. Luxury Outer Gold Ring with double stroke
        const grad = ctx.createLinearGradient(100, 100, 412, 412);
        grad.addColorStop(0, '#FFE89E');
        grad.addColorStop(0.5, '#D4AF37');
        grad.addColorStop(1, '#99771F');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 256, 224, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(256, 256, 208, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Royal Imperial Crown Path
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Crown Base
        ctx.roundRect(176, 300, 160, 16, 8);
        ctx.fill();

        // Crown Peaks
        ctx.beginPath();
        ctx.moveTo(176, 290);
        ctx.lineTo(160, 200); // Left peak
        ctx.lineTo(210, 240); // Left valley
        ctx.lineTo(256, 170); // Center peak (highest)
        ctx.lineTo(302, 240); // Right valley
        ctx.lineTo(352, 200); // Right peak
        ctx.lineTo(336, 290);
        ctx.closePath();
        ctx.fill();

        // Crown Jewels / Pearls on peaks
        [
          { x: 160, y: 195, r: 9 },
          { x: 256, y: 165, r: 12 },
          { x: 352, y: 195, r: 9 },
        ].forEach(jewel => {
          ctx.beginPath();
          ctx.arc(jewel.x, jewel.y, jewel.r, 0, Math.PI * 2);
          ctx.fillStyle = '#FFE89E';
          ctx.fill();
        });

        // 4. Venue Name Typography
        const cleanName = venueName.toUpperCase().slice(0, 16);
        ctx.fillStyle = '#FFE89E';
        ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cleanName, 256, 356);

        return canvas.toDataURL('image/png');
      } catch {
        return logoUrl || '/favicon.png';
      }
    };

    if (typeof window === 'undefined') {
      return resolve(logoUrl || '/favicon.png');
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(generateFallbackIcon());

      // Solid pure black background (eliminates any white background on iOS)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 512, 512);

      if (!logoUrl) {
        return resolve(generateFallbackIcon());
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Safe container size for iOS & Android icons (~58% of canvas, perfectly balanced)
        const maxLogoSize = 300;
        let w = img.width || maxLogoSize;
        let h = img.height || maxLogoSize;

        if (w > maxLogoSize || h > maxLogoSize) {
          if (w > h) {
            h = Math.round((h * maxLogoSize) / w);
            w = maxLogoSize;
          } else {
            w = Math.round((w * maxLogoSize) / h);
            h = maxLogoSize;
          }
        } else {
          // If original image is too small, scale up to fit safe container
          const scale = maxLogoSize / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const x = Math.round((512 - w) / 2);
        const y = Math.round((512 - h) / 2);

        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        // Fallback with solid black and gold monogram instead of raw transparent image
        resolve(generateFallbackIcon());
      };

      img.src = logoUrl;
    } catch {
      resolve(generateFallbackIcon());
    }
  });
};
