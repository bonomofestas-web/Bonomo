import React from 'react';

/**
 * Utilitário de Formatação de Texto Nativo do WhatsApp para o CRM F5 System.
 * Interpreta com segurança:
 * - Negrito (*texto*)
 * - Itálico (_texto_)
 * - Tachado (~texto~)
 * - Monoespaçado (```texto```)
 * - Código em linha (`texto`)
 * - Citações (> Texto citado)
 * - Listas com marcadores (- Item ou * Item)
 * - Listas numeradas (1. Item)
 * - Combinações (*_texto_*, *~texto~*, etc.)
 * - URLs clicáveis
 */

interface RenderOptions {
  isDarkMode?: boolean;
}

// Token types for non-destructive lexical parsing
type TokenType = 'CODE_BLOCK' | 'INLINE_CODE' | 'URL' | 'TEXT';

interface Token {
  type: TokenType;
  content: string;
  raw: string;
}

/**
 * Tokeniza blocos protegidos (Code blocks, inline code, URLs) antes da interpretação de formatação inline
 */
function tokenizeProtectedSpans(text: string): { template: string; tokens: Token[] } {
  const tokens: Token[] = [];
  let tokenIndex = 0;

  // 1. Code blocks: ```content```
  let processed = text.replace(/```([\s\S]*?)```/g, (_match, p1) => {
    const id = `__F5_TK_CB_${tokenIndex++}__`;
    tokens.push({ type: 'CODE_BLOCK', content: p1, raw: _match });
    return id;
  });

  // 2. Inline code: `content`
  processed = processed.replace(/`([^`\n]+)`/g, (_match, p1) => {
    const id = `__F5_TK_IC_${tokenIndex++}__`;
    tokens.push({ type: 'INLINE_CODE', content: p1, raw: _match });
    return id;
  });

  // 3. URLs: http:// or https://
  const urlPattern = /(https?:\/\/[^\s<>"'()]+(?:\([^\s<>"']+\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g;
  processed = processed.replace(urlPattern, (_match) => {
    const id = `__F5_TK_URL_${tokenIndex++}__`;
    tokens.push({ type: 'URL', content: _match, raw: _match });
    return id;
  });

  return { template: processed, tokens };
}

/**
 * Renderiza inlines com suporte a combinações de negrito, itálico e tachado
 */
function parseInlineStyles(text: string, keyPrefix: string): React.ReactNode[] {
  // Regex para WhatsApp inline formatting:
  // Delimitadores não podem ser precedidos ou seguidos imediatamente por espaço interno.
  // Combinações como *_~texto~_*
  // Executamos uma abordagem recursiva ou de substituição hierárquica segura em string/tokens.
  
  // Se não houver delimitadores inline, retorna o texto puro
  if (!text.includes('*') && !text.includes('_') && !text.includes('~')) {
    return [text];
  }

  // Regex combinada para capturar *bold*, _italic_, ~strike~
  // Respeitando limites: abre com * e fecha com * sem espaço logo após a abertura ou antes do fechamento
  const inlineRegex = /(?:^|[^\w*])(\*(?!\s)([^*]+?)(?<!\s)\*)|(?:^|[^\w_])(_(?!\s)([^_]+?)(?<!\s)_)|(?:^|[^\w~])(~(?!\s)([^~]+?)(?<!\s)~)/;

  const result: React.ReactNode[] = [];
  let remaining = text;
  let partIdx = 0;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      result.push(remaining);
      break;
    }

    // Calcula o deslocamento do delimitador (caso o match tenha capturado o caractere anterior não-palavra)
    const matchStart = match.index;
    const fullMatch = match[0];
    
    // Identifica qual grupo capturou
    let innerContent = '';
    let styleType: 'bold' | 'italic' | 'strike' = 'bold';
    let delimiter = '*';

    if (match[1] !== undefined) {
      innerContent = match[2];
      styleType = 'bold';
      delimiter = '*';
    } else if (match[3] !== undefined) {
      innerContent = match[4];
      styleType = 'italic';
      delimiter = '_';
    } else if (match[5] !== undefined) {
      innerContent = match[6];
      styleType = 'strike';
      delimiter = '~';
    }

    // Identifica se há prefixo não-palavra antes do delimitador
    const delimIndexInMatch = fullMatch.indexOf(delimiter);
    const leadingChar = delimIndexInMatch > 0 ? fullMatch.slice(0, delimIndexInMatch) : '';
    const beforeMatch = remaining.slice(0, matchStart) + leadingChar;

    if (beforeMatch) {
      result.push(beforeMatch);
    }

    // Renderiza o nó estilizado de forma recursiva (permitindo aninhamento como *_texto_*)
    const nestedNodes = parseInlineStyles(innerContent, `${keyPrefix}_${partIdx}`);
    const elementKey = `${keyPrefix}_fmt_${partIdx++}`;

    if (styleType === 'bold') {
      result.push(<strong key={elementKey} style={{ fontWeight: 700 }}>{nestedNodes}</strong>);
    } else if (styleType === 'italic') {
      result.push(<em key={elementKey} style={{ fontStyle: 'italic' }}>{nestedNodes}</em>);
    } else if (styleType === 'strike') {
      result.push(<del key={elementKey} style={{ textDecoration: 'line-through' }}>{nestedNodes}</del>);
    }

    const consumedLength = matchStart + delimIndexInMatch + innerContent.length + 2; // +2 pelos 2 delimitadores
    remaining = remaining.slice(consumedLength);
  }

  return result;
}

/**
 * Reinsere os tokens protegidos (Codeblocks, inline code, URLs) nos nós React gerados
 */
function restoreTokensInNode(node: React.ReactNode, tokensMap: Map<string, Token>, options: RenderOptions): React.ReactNode {
  if (typeof node !== 'string') {
    if (React.isValidElement(node)) {
      const children = (node.props as any).children;
      if (Array.isArray(children)) {
        return React.cloneElement(node as React.ReactElement<any>, {
          children: React.Children.map(children, child => restoreTokensInNode(child, tokensMap, options))
        });
      } else if (children) {
        return React.cloneElement(node as React.ReactElement<any>, {
          children: restoreTokensInNode(children, tokensMap, options)
        });
      }
    }
    return node;
  }

  // Se for string, verifica se contém tokens __F5_TK_...__
  const tokenRegex = /(__F5_TK_(?:CB|IC|URL)_\d+__)/g;
  const parts = node.split(tokenRegex);

  if (parts.length === 1) return node;

  return parts.map((part, idx) => {
    const token = tokensMap.get(part);
    if (!token) return part;

    const key = `token_${idx}_${part}`;
    if (token.type === 'CODE_BLOCK') {
      return (
        <pre
          key={key}
          style={{
            background: options.isDarkMode ? '#0f172a' : '#f1f5f9',
            color: options.isDarkMode ? '#e2e8f0' : '#1e293b',
            border: options.isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.80rem',
            overflowX: 'auto',
            margin: '6px 0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <code>{token.content}</code>
        </pre>
      );
    }

    if (token.type === 'INLINE_CODE') {
      return (
        <code
          key={key}
          style={{
            background: options.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            color: options.isDarkMode ? '#f43f5e' : '#e11d48',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.84em',
            wordBreak: 'break-word',
          }}
        >
          {token.content}
        </code>
      );
    }

    if (token.type === 'URL') {
      return (
        <a
          key={key}
          href={token.content}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: options.isDarkMode ? '#53bdeb' : '#0284c7',
            textDecoration: 'underline',
            wordBreak: 'break-all',
            fontWeight: 600,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {token.content}
        </a>
      );
    }

    return part;
  });
}

/**
 * Função principal que analisa e renderiza o texto formatado no padrão WhatsApp
 */
export function renderWhatsAppFormattedText(rawText?: string | null, options: RenderOptions = {}): React.ReactNode {
  if (!rawText) return null;

  // 1. Extração segura de blocos protegidos
  const { template, tokens } = tokenizeProtectedSpans(rawText);
  const tokensMap = new Map<string, Token>();
  tokens.forEach((tk, idx) => {
    const key = `__F5_TK_${tk.type === 'CODE_BLOCK' ? 'CB' : tk.type === 'INLINE_CODE' ? 'IC' : 'URL'}_${idx}__`;
    tokensMap.set(key, tk);
  });

  // 2. Separa por linhas para processar blocos (Citações, Listas e Parágrafos)
  const lines = template.split('\n');
  const elements: React.ReactNode[] = [];

  let currentBlockType: 'none' | 'quote' | 'bullet' | 'ordered' = 'none';
  let currentGroupLines: string[] = [];

  const flushCurrentGroup = (groupKey: string) => {
    if (currentGroupLines.length === 0) return;

    if (currentBlockType === 'quote') {
      elements.push(
        <blockquote
          key={`quote_${groupKey}`}
          style={{
            borderLeft: options.isDarkMode ? '3px solid #00a884' : '3px solid #25d366',
            margin: '4px 0',
            padding: '2px 0 2px 10px',
            color: options.isDarkMode ? '#94a3b8' : '#475569',
            fontStyle: 'normal',
            background: options.isDarkMode ? 'rgba(0,168,132,0.06)' : 'rgba(37,211,102,0.06)',
            borderRadius: '0 4px 4px 0',
          }}
        >
          {currentGroupLines.map((lineText, lIdx) => (
            <div key={`ql_${lIdx}`}>
              {parseInlineStyles(lineText, `q_${groupKey}_${lIdx}`).map(node =>
                restoreTokensInNode(node, tokensMap, options)
              )}
            </div>
          ))}
        </blockquote>
      );
    } else if (currentBlockType === 'bullet') {
      elements.push(
        <ul
          key={`ul_${groupKey}`}
          style={{
            margin: '4px 0 4px 18px',
            padding: 0,
            listStyleType: 'disc',
          }}
        >
          {currentGroupLines.map((itemText, iIdx) => (
            <li key={`li_${iIdx}`} style={{ margin: '2px 0' }}>
              {parseInlineStyles(itemText, `b_${groupKey}_${iIdx}`).map(node =>
                restoreTokensInNode(node, tokensMap, options)
              )}
            </li>
          ))}
        </ul>
      );
    } else if (currentBlockType === 'ordered') {
      elements.push(
        <ol
          key={`ol_${groupKey}`}
          style={{
            margin: '4px 0 4px 18px',
            padding: 0,
            listStyleType: 'decimal',
          }}
        >
          {currentGroupLines.map((itemText, iIdx) => (
            <li key={`oli_${iIdx}`} style={{ margin: '2px 0' }}>
              {parseInlineStyles(itemText, `o_${groupKey}_${iIdx}`).map(node =>
                restoreTokensInNode(node, tokensMap, options)
              )}
            </li>
          ))}
        </ol>
      );
    }

    currentGroupLines = [];
    currentBlockType = 'none';
  };

  lines.forEach((line, lineIndex) => {
    // Verifica Citação: linha começando com "> " ou ">"
    if (/^>\s?(.*)$/.test(line)) {
      const match = line.match(/^>\s?(.*)$/);
      const textAfterQuote = match ? match[1] : '';
      if (currentBlockType !== 'quote') {
        flushCurrentGroup(`before_quote_${lineIndex}`);
        currentBlockType = 'quote';
      }
      currentGroupLines.push(textAfterQuote);
      return;
    }

    // Verifica Lista com marcadores: linha começando com "- " ou "* "
    if (/^[-*]\s+(.*)$/.test(line)) {
      const match = line.match(/^[-*]\s+(.*)$/);
      const itemContent = match ? match[1] : '';
      if (currentBlockType !== 'bullet') {
        flushCurrentGroup(`before_bullet_${lineIndex}`);
        currentBlockType = 'bullet';
      }
      currentGroupLines.push(itemContent);
      return;
    }

    // Verifica Lista numerada: linha começando com "1. ", "2. ", etc.
    if (/^\d+\.\s+(.*)$/.test(line)) {
      const match = line.match(/^\d+\.\s+(.*)$/);
      const itemContent = match ? match[1] : '';
      if (currentBlockType !== 'ordered') {
        flushCurrentGroup(`before_ordered_${lineIndex}`);
        currentBlockType = 'ordered';
      }
      currentGroupLines.push(itemContent);
      return;
    }

    // Linha normal ou vazia
    flushCurrentGroup(`line_${lineIndex}`);

    if (line.trim() === '') {
      // Preserva quebra de linha visual entre parágrafos
      elements.push(<div key={`br_${lineIndex}`} style={{ height: '8px' }} />);
    } else {
      const inlines = parseInlineStyles(line, `line_${lineIndex}`);
      elements.push(
        <div key={`p_${lineIndex}`} style={{ minHeight: '1.2em' }}>
          {inlines.map(node => restoreTokensInNode(node, tokensMap, options))}
        </div>
      );
    }
  });

  flushCurrentGroup('final');

  return elements;
}

/**
 * Aplica formatação de WhatsApp à seleção ativa de um input ou textarea.
 */
export function applyWhatsAppFormatting(
  fullText: string,
  start: number,
  end: number,
  format: 'bold' | 'italic' | 'strike' | 'monospace' | 'quote' | 'bullet' | 'number'
): { text: string; newStart: number; newEnd: number } {
  const selectedText = fullText.slice(start, end);
  const before = fullText.slice(0, start);
  const after = fullText.slice(end);

  if (format === 'bold') {
    // Se já estiver envolvido com *...*, remove (toggle)
    if (selectedText.startsWith('*') && selectedText.endsWith('*') && selectedText.length >= 2) {
      const unwrap = selectedText.slice(1, -1);
      return { text: before + unwrap + after, newStart: start, newEnd: start + unwrap.length };
    }
    const wrapped = `*${selectedText || 'texto'}*`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'italic') {
    if (selectedText.startsWith('_') && selectedText.endsWith('_') && selectedText.length >= 2) {
      const unwrap = selectedText.slice(1, -1);
      return { text: before + unwrap + after, newStart: start, newEnd: start + unwrap.length };
    }
    const wrapped = `_${selectedText || 'texto'}_`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'strike') {
    if (selectedText.startsWith('~') && selectedText.endsWith('~') && selectedText.length >= 2) {
      const unwrap = selectedText.slice(1, -1);
      return { text: before + unwrap + after, newStart: start, newEnd: start + unwrap.length };
    }
    const wrapped = `~${selectedText || 'texto'}~`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'monospace') {
    if (selectedText.startsWith('```') && selectedText.endsWith('```') && selectedText.length >= 6) {
      const unwrap = selectedText.slice(3, -3);
      return { text: before + unwrap + after, newStart: start, newEnd: start + unwrap.length };
    }
    const wrapped = `\`\`\`${selectedText || 'texto'}\`\`\``;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'quote') {
    const wrapped = `> ${selectedText || 'citação'}`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'bullet') {
    const wrapped = `- ${selectedText || 'item'}`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  if (format === 'number') {
    const wrapped = `1. ${selectedText || 'item'}`;
    return { text: before + wrapped + after, newStart: start, newEnd: start + wrapped.length };
  }

  return { text: fullText, newStart: start, newEnd: end };
}
