import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, Download } from 'lucide-react';

export interface EmbeddedDoc { name: string; url: string; kind?: string }

interface Props {
  docs: EmbeddedDoc[];
  /** Documento aberto no inicio (indice) */
  initialIndex?: number;
  emptyText?: string;
}

const isImage = (u: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u);

/**
 * Visualizador de documentos DENTRO do sistema: o PDF abre aqui, sem nova aba.
 * Pensado para ser reaproveitado em qualquer tela que hoje abre documento em outra aba.
 */
export const EmbeddedDocViewer: React.FC<Props> = ({ docs, initialIndex = 0, emptyText = 'Nenhum documento anexado.' }) => {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, docs.length - 1)));
  useEffect(() => { setIndex(Math.min(initialIndex, Math.max(0, docs.length - 1))); }, [docs, initialIndex]);

  if (docs.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>{emptyText}</div>;
  }
  const cur = docs[index] || docs[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--adm-border)', overflowX: 'auto', flexShrink: 0 }}>
        {docs.map((d, i) => (
          <button key={`${d.url}-${i}`} type="button" onClick={() => setIndex(i)} title={d.name}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: 220, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.72rem', fontWeight: 700,
              border: i === index ? '1px solid #0284C7' : '1px solid var(--adm-border)', background: i === index ? 'rgba(2,132,199,0.12)' : 'transparent', color: i === index ? '#0284C7' : 'var(--adm-text-title)' }}>
            <FileText size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
          </button>
        ))}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, flexShrink: 0 }}>
          <a href={cur.url} target="_blank" rel="noreferrer" title="Abrir em nova aba" style={{ color: 'var(--adm-text-muted)', display: 'inline-flex' }}><ExternalLink size={14} /></a>
          <a href={cur.url} download title="Baixar" style={{ color: 'var(--adm-text-muted)', display: 'inline-flex' }}><Download size={14} /></a>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: 'var(--adm-bg-surface, #F1F5F9)' }}>
        {isImage(cur.url)
          ? <img src={cur.url} alt={cur.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <iframe key={cur.url} src={cur.url} title={cur.name} style={{ width: '100%', height: '100%', border: 'none' }} />}
      </div>
    </div>
  );
};
