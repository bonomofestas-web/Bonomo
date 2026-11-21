# UI Kit do F5 System

Componentes compartilhados em `src/components/ui/`. **Antes de criar qualquer campo ou componente de interface, procure aqui.** Se já existe, use. Se não existe e vai se repetir, crie na pasta `ui/` e registre neste arquivo.

## Regra
- Dropdown, data e período no portal admin: **sempre** `Select`, `DateField` e `DateRangeField`.
- Proibido `<select>` e `<input type="date">` nativos nas telas do portal.
- Exceções: formulários públicos/mobile (`guests/*`, `referrals/*`), onde o seletor nativo é melhor no celular, e campos de hora (`type="time"`, `datetime-local`) até existir um `TimeField`.

## Componentes

### `Select`
Substitui `<select>`. Aceita os mesmos `<option>` e `<optgroup>` como filhos.
```tsx
import { Select } from '../ui';

<Select className="adm-input" value={venueId} onChange={e => setVenueId(e.target.value)} style={{ width: 220 }}>
  <option value="all">Todas as unidades</option>
  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
</Select>
```
- `onChange` recebe `{ target: { value, name } }`, igual ao uso de `<select>`.
- Lista em portal (não é cortada por modais), teclado (setas, Enter, Esc, digitar), busca automática acima de 8 opções (`searchThreshold`).
- `className`/`style` valem para o gatilho (use `adm-input`).

### `DateField`
Substitui `<input type="date">`. Valor `YYYY-MM-DD`.
```tsx
<DateField className="adm-input" value={date} onChange={e => setDate(e.target.value)} min="2026-01-01" />
```
- Calendário em popover, com "Hoje" e "Limpar" (quando não é `required`).

### `DateRangeField`
Período em um único campo: clica no início e no fim.
```tsx
<DateRangeField className="adm-input" start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
```

### `MonthYearSwitcher`
Título de calendário clicável: clique no mês abre o seletor de meses; clique no ano abre o seletor de anos (blocos de 12). Use no lugar do texto fixo "Novembro 2026" em **todo** calendário que navega por mês. `CalendarGrid` (portanto `DateField` e `DateRangeField`) já traz isso embutido.
```tsx
<MonthYearSwitcher year={d.getFullYear()} month={d.getMonth()} onChange={(y, m) => setD(new Date(y, m, 1))} />
```

### `CalendarGrid`, `PopoverPanel`
Peças de base (grade do calendário e painel flutuante em portal). Use para criar novos campos, não direto nas telas.

## Como estender
1. Procure em `src/components/ui/` e neste arquivo.
2. Se for criar, mantenha a API parecida com o elemento nativo equivalente (migração mais simples) e o visual do app (`--adm-*`, `adm-input`).
3. Registre aqui.

### `DropdownMenu`
Menu de ações ("⋯") para linhas e cards com várias ações. Lista em portal, teclado (setas, Enter, Esc).
```tsx
<DropdownMenu items={[
  { id: 'view', label: 'Ver perfil', icon: <User size={14} />, onSelect: openProfile },
  { id: 'edit', label: 'Editar', icon: <Pencil size={14} />, onSelect: edit, disabled: !canEdit, disabledReason: 'Sem permissão' },
  { id: 'remove', label: 'Remover', icon: <Trash2 size={14} />, danger: true, separatorBefore: true, onSelect: remove },
]} />
```
- `hidden: true` oculta o item; `trigger` personaliza o botão (padrão: três pontos).

### `MessagingPausedBanner` (`src/components/admin/MessagingPausedBanner.tsx`)
Aviso fixo (não dispensável) enquanto o envio e o recebimento de mensagens do WhatsApp estão pausados (chave remota `whatsapp_messaging` em `system_feature_flags`, status `disabled`). Não renderiza nada quando ativo. Texto vem de `coming_soon_message` da chave.
```tsx
<MessagingPausedBanner />          {/* tela inicial */}
<MessagingPausedBanner compact />  {/* lista de conversas / compositor */}
```
- Estado fora do React: `src/utils/messagingPause.ts` (`isMessagingPaused`, `ensureMessagingEnabled`, `MessagingPausedError`); hook `useMessagingPause()`.
- Envios passam pela barreira em `uazapiService` (`sendText`, `sendMedia`, `sendSticker`, `reactMessage`): erro `Função desabilitada temporariamente`.

### `EmbeddedDocViewer` (`src/components/admin/EmbeddedDocViewer.tsx`)
Abre documentos (PDF e imagem) **dentro do sistema**, sem nova aba. Lista os documentos em abas e mostra o escolhido em um visualizador. Use onde hoje o documento abre em outra aba.
```tsx
<EmbeddedDocViewer docs={getContractDocuments(contract)} />
```
- Em modais com `Select`/`DateField`, mantenha o `zIndex` do modal abaixo de 5000 (os popovers do kit ficam em 5000).

### `PaymentPlanEditor` (`src/components/admin/finance/PaymentPlanEditor.tsx`)
Editor do plano de pagamento do contrato (sinal/entrada, parcelas PIX/boleto, cartão com taxa e líquido, pós-evento) com conferência da soma contra o total. Lógica e validação em `src/utils/paymentPlan.ts`. Usado na venda (`CloseDealValueModal`), na aprovação do financeiro e na revisão dos contratos importados.
