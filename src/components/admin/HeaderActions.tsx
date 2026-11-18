import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renderiza seus filhos no espaço livre à direita do menu superior do portal
 * (div#adm-header-actions em AdminPortal). Cada tela injeta aqui suas ações
 * primárias e controles de visualização, sem repetir o título na própria tela.
 */
export const HeaderActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(() => document.getElementById('adm-header-actions'));
  useEffect(() => {
    setSlot(document.getElementById('adm-header-actions'));
  }, []);
  return slot ? createPortal(children, slot) : null;
};

/** Botão primário padrão do cabeçalho (fundo escuro). */
export const headerPrimaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--adm-accent, #14A9D7)',
  color: '#FFFFFF',
  fontSize: '0.80rem',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
