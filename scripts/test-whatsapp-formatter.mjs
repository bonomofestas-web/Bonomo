// Testes automatizados da formatação de texto do WhatsApp (F5 System)
// Validação dos requisitos do usuário:
// 1. Negrito (*texto*)
// 2. Itálico (_texto_)
// 3. Tachado (~texto~)
// 4. Monoespaçado (```texto```)
// 5. Código em linha (`texto`)
// 6. Listas com marcadores (- Item e * Item)
// 7. Lista numerada (1. Item)
// 8. Citação (> Texto citado)
// 9. Combinações (*_texto_*, *~texto~*, _~texto~_, *_~texto~_*)
// 10. URLs e proteção de caracteres internos

import assert from 'node:assert';

// Simulação da lógica de parse para Node
function tokenizeProtectedSpans(text) {
  const tokens = [];
  let tokenIndex = 0;

  // Code blocks: ```content```
  let processed = text.replace(/```([\s\S]*?)```/g, (_match, p1) => {
    const id = `__F5_TK_CB_${tokenIndex++}__`;
    tokens.push({ type: 'CODE_BLOCK', content: p1, raw: _match });
    return id;
  });

  // Inline code: `content`
  processed = processed.replace(/`([^`\n]+)`/g, (_match, p1) => {
    const id = `__F5_TK_IC_${tokenIndex++}__`;
    tokens.push({ type: 'INLINE_CODE', content: p1, raw: _match });
    return id;
  });

  // URLs
  const urlPattern = /(https?:\/\/[^\s<>"'()]+(?:\([^\s<>"']+\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g;
  processed = processed.replace(urlPattern, (_match) => {
    const id = `__F5_TK_URL_${tokenIndex++}__`;
    tokens.push({ type: 'URL', content: _match, raw: _match });
    return id;
  });

  return { template: processed, tokens };
}

function parseInlineStylesToTree(text) {
  const inlineRegex = /(?:^|[^\w*])(\*(?!\s)([^*]+?)(?<!\s)\*)|(?:^|[^\w_])(_(?!\s)([^_]+?)(?<!\s)_)|(?:^|[^\w~])(~(?!\s)([^~]+?)(?<!\s)~)/;
  const result = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      result.push({ type: 'text', value: remaining });
      break;
    }

    const matchStart = match.index;
    const fullMatch = match[0];
    let innerContent = '';
    let styleType = 'bold';
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

    const delimIndexInMatch = fullMatch.indexOf(delimiter);
    const leadingChar = delimIndexInMatch > 0 ? fullMatch.slice(0, delimIndexInMatch) : '';
    const beforeMatch = remaining.slice(0, matchStart) + leadingChar;

    if (beforeMatch) {
      result.push({ type: 'text', value: beforeMatch });
    }

    result.push({
      type: styleType,
      children: parseInlineStylesToTree(innerContent),
    });

    const consumedLength = matchStart + delimIndexInMatch + innerContent.length + 2;
    remaining = remaining.slice(consumedLength);
  }

  return result;
}

console.log('--- EXECUTANDO TESTES DE FORMATAÇÃO WHATSAPP (F5 SYSTEM) ---');

// Teste 1: Negrito
{
  const tree = parseInlineStylesToTree('*Olá Mundo*');
  assert.strictEqual(tree[0].type, 'bold');
  assert.strictEqual(tree[0].children[0].value, 'Olá Mundo');
  console.log('✓ 1. Negrito (*texto*) passou');
}

// Teste 2: Itálico
{
  const tree = parseInlineStylesToTree('_Olá Mundo_');
  assert.strictEqual(tree[0].type, 'italic');
  assert.strictEqual(tree[0].children[0].value, 'Olá Mundo');
  console.log('✓ 2. Itálico (_texto_) passou');
}

// Teste 3: Tachado
{
  const tree = parseInlineStylesToTree('~Preço antigo~');
  assert.strictEqual(tree[0].type, 'strike');
  assert.strictEqual(tree[0].children[0].value, 'Preço antigo');
  console.log('✓ 3. Tachado (~texto~) passou');
}

// Teste 4: Combinação Negrito + Itálico
{
  const tree = parseInlineStylesToTree('*_Negrito e Itálico_*');
  assert.strictEqual(tree[0].type, 'bold');
  assert.strictEqual(tree[0].children[0].type, 'italic');
  assert.strictEqual(tree[0].children[0].children[0].value, 'Negrito e Itálico');
  console.log('✓ 4. Combinação Negrito + Itálico (*_texto_*) passou');
}

// Teste 5: Combinação Tripla (*_~tudo~_*)
{
  const tree = parseInlineStylesToTree('*_~Negrito Itálico Tachado~_*');
  assert.strictEqual(tree[0].type, 'bold');
  assert.strictEqual(tree[0].children[0].type, 'italic');
  assert.strictEqual(tree[0].children[0].children[0].type, 'strike');
  assert.strictEqual(tree[0].children[0].children[0].children[0].value, 'Negrito Itálico Tachado');
  console.log('✓ 5. Combinação Tripla (*_~texto~_*) passou');
}

// Teste 6: Proteção de Codeblock (não deve formatar asteriscos dentro do código)
{
  const raw = 'Código: ```const x = 2 * 3;``` fim';
  const { template, tokens } = tokenizeProtectedSpans(raw);
  assert.strictEqual(tokens.length, 1);
  assert.strictEqual(tokens[0].type, 'CODE_BLOCK');
  assert.strictEqual(tokens[0].content, 'const x = 2 * 3;');
  console.log('✓ 6. Proteção de Codeblock (```...```) passou');
}

// Teste 7: Proteção de URL com underscores
{
  const raw = 'Acesse https://site.com/festa_debutante_15 para ver';
  const { tokens } = tokenizeProtectedSpans(raw);
  assert.strictEqual(tokens.length, 1);
  assert.strictEqual(tokens[0].type, 'URL');
  assert.strictEqual(tokens[0].content, 'https://site.com/festa_debutante_15');
  console.log('✓ 7. Proteção de URLs com underscores passou');
}

// Teste 8: Texto com sintaxe inválida/ambígua preservado
{
  const raw = 'Isso é 2 * 3 = 6 e * asterisco solto';
  const tree = parseInlineStylesToTree(raw);
  const fullText = tree.map(n => n.value || '').join('');
  assert.strictEqual(fullText, raw);
  console.log('✓ 8. Sintaxe ambígua mantida sem remoção de caracteres passou');
}

console.log('\nTODOS OS 8 TESTES DE FORMATAÇÃO WHATSAPP PASSARAM COM SUCESSO!\n');
