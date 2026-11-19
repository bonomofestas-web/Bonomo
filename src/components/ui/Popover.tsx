import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PopoverPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Largura minima do painel (por padrao, a do gatilho). */
  minWidth?: number;
  /** Largura fixa do painel (ex.: calendario). */
  width?: number;
  maxHeight?: number;
  align?: 'left' | 'right';
  children: React.ReactNode;
}

/**
 * Painel flutuante ancorado a um gatilho. Renderiza em portal no document.body e usa posicao fixa,
 * entao nao e cortado por modais/containers com overflow. Fecha ao clicar fora ou com Esc.
 * Base de Select e DateField (src/components/ui).
 */
export const PopoverPanel: React.FC<PopoverPanelProps> = ({
  anchorRef, open, onClose, minWidth, width, maxHeight = 320, align = 'left', children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const panelW = width ?? Math.max(r.width, minWidth ?? 0);
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const panelH = panelRef.current?.offsetHeight ?? maxHeight;
    const openUp = spaceBelow < Math.min(panelH, maxHeight) && spaceAbove > spaceBelow;
    const avail = Math.max(120, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow));
    let left = align === 'right' ? r.right - panelW : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    setPos({
      top: openUp ? Math.max(8, r.top - Math.min(panelH, avail) - 6) : r.bottom + 6,
      left,
      width: panelW,
      maxHeight: avail,
    });
  }, [anchorRef, width, minWidth, maxHeight, align]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // Reposiciona apos o painel medir a propria altura
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, place, children]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      // Rolar a lista interna do proprio painel nao reposiciona
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      place();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, place, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={panelRef}
      role="presentation"
      style={{
        position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, maxHeight: pos?.maxHeight,
        zIndex: 5000, background: 'var(--adm-bg-card, #FFFFFF)', border: '1px solid var(--adm-border, #CBD5E1)',
        borderRadius: '12px', boxShadow: '0 18px 40px -6px rgba(0,0,0,0.35)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', opacity: pos ? 1 : 0,
      }}
    >
      {children}
    </div>,
    document.body,
  );
};
