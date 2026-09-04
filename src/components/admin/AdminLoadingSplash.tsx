import React, { useState, useEffect } from 'react';

interface AdminLoadingSplashProps {
  onComplete?: () => void;
  isReady?: boolean;
}

const LOADING_STEPS = [
  'Sincronizando workspace...',
  'Validando permissões e módulos...',
  'Carregando funis e leads...',
  'Iniciando F5 System...',
];

export const AdminLoadingSplash: React.FC<AdminLoadingSplashProps> = ({
  onComplete,
  isReady = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Stepped text animation
    const textInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    // Progressive loading bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 85) {
          return prev + Math.floor(Math.random() * 14) + 6;
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  // When backend sync is ready (or after minimum animation time), complete the bar and trigger onComplete
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isReady) {
      setProgress(100);
      setCurrentStepIndex(LOADING_STEPS.length - 1);
      timeout = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 300);
      }, 350);
    }
    return () => clearTimeout(timeout);
  }, [isReady, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 45%, #0B1728 0%, #060B12 60%, #030508 100%)',
        fontFamily: "'Poppins', sans-serif",
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Horizontal Brand Logo */}
      <div style={{ marginBottom: '28px' }}>
        <img
          src="/f5_logo.png"
          alt="F5 System"
          style={{
            height: '38px',
            width: 'auto',
            maxWidth: '160px',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 0 16px rgba(20, 169, 215, 0.25))',
          }}
        />
      </div>

      {/* Thin Progress Bar (clean, no box) */}
      <div
        style={{
          width: '210px',
          height: '3px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '14px',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #14A9D7 0%, #38BDF8 100%)',
            borderRadius: '9999px',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.6)',
            transition: 'width 0.25s ease-out',
          }}
        />
      </div>

      {/* Status Text (clean, no container) */}
      <div
        style={{
          fontSize: '0.74rem',
          color: '#8096A8',
          letterSpacing: '0.2px',
          height: '18px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        {LOADING_STEPS[currentStepIndex]}
      </div>
    </div>
  );
};
