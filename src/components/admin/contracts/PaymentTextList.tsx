import React, { useState } from 'react';

/** Condicoes de pagamento do contrato, uma por linha; mostra as primeiras e deixa o resto atras de "ver todas". */
export const PaymentTextList: React.FC<{ lines: string[]; limit?: number; fontSize?: string }> = ({ lines, limit = 6, fontSize = '0.78rem' }) => {
  const [all, setAll] = useState(false);
  const shown = all ? lines : lines.slice(0, limit);
  return (
    <div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize, lineHeight: 1.4 }}>
        {shown.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      {lines.length > limit && (
        <button type="button" onClick={() => setAll(v => !v)} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#0284C7', fontWeight: 800, fontSize: '0.74rem' }}>
          {all ? 'Mostrar menos' : `Ver todas as ${lines.length} linhas`}
        </button>
      )}
    </div>
  );
};
