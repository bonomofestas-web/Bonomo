import React, { useState } from 'react';
import { X, Copy, Check, Code, ExternalLink, Lightbulb } from 'lucide-react';
import type { Source } from '../../types/sources';

interface AdminSourceEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
}

export const AdminSourceEmbedModal: React.FC<AdminSourceEmbedModalProps> = ({
  isOpen,
  onClose,
  source,
}) => {
  const [copiedType, setCopiedType] = useState<'url' | 'iframe' | 'script' | null>(null);

  if (!isOpen || !source) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.bonomofestas.com.br';
  const publicUrl = source.type === 'tracking_link' 
    ? `${baseUrl}/r/${source.slug || source.id}`
    : `${baseUrl}/f/${source.slug || source.id}`;

  const iframeCode = `<iframe 
  src="${publicUrl}" 
  width="100%" 
  height="680" 
  frameborder="0" 
  style="border: none; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);"
  allow="clipboard-write">
</iframe>`;

  const scriptCode = `<!-- Bonomo CRM - Formulário Incorporável (${source.name}) -->
<div id="bonomo-form-${source.slug || source.id}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = "${publicUrl}";
    iframe.style.width = "100%";
    iframe.style.height = "680px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    document.getElementById("bonomo-form-${source.slug || source.id}").appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = (text: string, type: 'url' | 'iframe' | 'script') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="adm-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div className="adm-modal-content" style={{
        background: 'var(--adm-bg-card)',
        border: '1px solid var(--adm-border)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '620px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--adm-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--adm-accent-bg)',
              color: 'var(--adm-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Code size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--adm-text-title)', margin: 0 }}>
                Código Incorporável & Link Público
              </h2>
              <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                Origem: <strong>{source.name}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. URL Pública Direta */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)', marginBottom: '6px' }}>
              1. Link Público Direto
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="adm-input"
                style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '0.8rem', background: 'var(--adm-bg-input)' }}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(publicUrl, 'url')}
                className="adm-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800 }}
              >
                {copiedType === 'url' ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedType === 'url' ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="adm-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', borderRadius: '10px', color: 'var(--adm-text-title)' }}
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* 2. Código Iframe */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                2. Código Iframe (HTML)
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(iframeCode, 'iframe')}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copiedType === 'iframe' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedType === 'iframe' ? 'Copiado!' : 'Copiar Iframe'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={iframeCode}
              rows={4}
              className="adm-input"
              style={{ width: '100%', borderRadius: '10px', fontSize: '0.74rem', fontFamily: 'monospace', background: 'var(--adm-bg-input)', padding: '10px' }}
            />
          </div>

          {/* 3. Código Script Embed (WordPress / Elementor) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--adm-text-title)' }}>
                3. Código Script Embed (WordPress / Elementor)
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(scriptCode, 'script')}
                style={{ background: 'transparent', border: 'none', color: 'var(--adm-accent)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copiedType === 'script' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedType === 'script' ? 'Copiado!' : 'Copiar Script'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={scriptCode}
              rows={5}
              className="adm-input"
              style={{ width: '100%', borderRadius: '10px', fontSize: '0.74rem', fontFamily: 'monospace', background: 'var(--adm-bg-input)', padding: '10px' }}
            />
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Lightbulb size={14} color="var(--adm-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span><strong>Dica:</strong> Cole este código em qualquer página HTML ou bloco HTML personalizado no WordPress, Wix ou Elementor. As respostas enviadas cairão instantaneamente no seu CRM.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="adm-btn-primary"
            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 650 }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
