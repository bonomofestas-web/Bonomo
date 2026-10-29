import React from 'react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote } from 'lucide-react';
import { applyWhatsAppFormatting } from '../../utils/whatsappFormatter';

interface WhatsAppFormattingToolbarProps {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  isDarkMode?: boolean;
  position?: 'top' | 'floating' | 'inline';
}

export const WhatsAppFormattingToolbar: React.FC<WhatsAppFormattingToolbarProps> = ({
  inputRef,
  value,
  onChange,
  isDarkMode = true,
  position = 'inline',
}) => {
  const handleFormat = (
    format: 'bold' | 'italic' | 'strike' | 'monospace' | 'quote' | 'bullet' | 'number',
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const element = inputRef.current;
    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;

    const result = applyWhatsAppFormatting(value, start, end, format);
    onChange(result.text);

    // Re-foca e restaura seleção de texto após a formatação
    requestAnimationFrame(() => {
      element.focus();
      try {
        element.setSelectionRange(result.newStart, result.newEnd);
      } catch {}
    });
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: '5px',
    background: 'transparent',
    border: 'none',
    color: isDarkMode ? '#94a3b8' : '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '3px 6px',
        borderRadius: '7px',
        background: isDarkMode ? '#1e293b' : '#f8fafc',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        boxShadow: position === 'floating' ? '0 4px 12px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      <button
        type="button"
        title="Negrito (*texto*)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('bold', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <Bold size={13} />
      </button>

      <button
        type="button"
        title="Itálico (_texto_)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('italic', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <Italic size={13} />
      </button>

      <button
        type="button"
        title="Tachado (~texto~)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('strike', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <Strikethrough size={13} />
      </button>

      <button
        type="button"
        title="Monoespaçado (```texto```)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('monospace', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <Code size={13} />
      </button>

      <div style={{ width: '1px', height: '14px', background: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e2e8f0', margin: '0 2px' }} />

      <button
        type="button"
        title="Citação (> texto)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('quote', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <Quote size={13} />
      </button>

      <button
        type="button"
        title="Lista com Marcadores (- item)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('bullet', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <List size={13} />
      </button>

      <button
        type="button"
        title="Lista Numerada (1. item)"
        style={btnStyle}
        onMouseDown={(e) => handleFormat('number', e)}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b')}
      >
        <ListOrdered size={13} />
      </button>
    </div>
  );
};
