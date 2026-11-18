# Auditoria da integração UAZAPI

Base: documentação oficial (docs.uazapi.com, API v2.6.9) x código em `src/services/uazapi*.ts`, `api/whatsapp-webhook.ts`, `supabase/functions/uazapi-webhook/`. Plano UAZAPI: pago (100 chips). Nenhuma correção abaixo foi aplicada; é o plano para priorizar.

Gravidade: **C** crítico, **A** alto, **M** médio, **B** baixo.

## Segurança

| # | G | Como está | Como deveria ser |
|---|---|---|---|
| 1 | C | `.env` define `VITE_UAZAPI_ADMIN_TOKEN`; o Vite embute no bundle do navegador. Chamadas admin no cliente: `/instance/all`, `/instance/create`, `/instance/delete`, `/globalwebhook` (`uazapiService.ts` 166-276, 740, 1313, 1347). | `admintoken` só no backend. Mover essas chamadas para `api/` (Vercel) e rotacionar o token (`POST /admin/token/rotate`), pois já foi exposto. |
| 2 | C | `api/whatsapp-webhook.ts` aceita qualquer POST (CORS `*`), sem segredo; responde 200 mesmo no `catch` (836-838). | Validar origem (segredo na URL/header configurado no webhook). A UAZAPI **não reenvia** webhook com falha: responder 2xx rápido, mas registrar/fila de erro para reconciliar. |
| 3 | M | SSE envia `token` na query (`uazapiSseService.ts` 361-367). | Inevitável com `EventSource`; garantir que a URL não vá para logs/telemetria. |

## Bugs e divergências

| # | G | Como está | Como deveria ser |
|---|---|---|---|
| 4 | A | `messages_update` (recibos) entra como mensagem nova no SSE (o tipo contém "message") e na Edge Function (`index.ts:221`). No `api/` não é tratado, então status Delivered/Read nunca atualiza. | Tratar à parte: `ReadReceipt` (`Timestamp` em segundos) e `GroupReceipts.Receipts[]`; atualizar status da atividade de forma idempotente, sem regredir (Read não volta a Sent). |
| 5 | A | Dois webhooks divergentes: `api/` usa `sources/leads/lead_activities`; a Edge Function usa `whatsapp_instances` e `ilike '%últimos8%'` no telefone. | Eleger um só. A busca por 8 dígitos pode cruzar leads de tenants diferentes (viola o isolamento por Master). |
| 6 | M | `/send/media` envia `text` e `caption` iguais. `/send/sticker` não é rota documentada (já há fallback). | Usar `text` como legenda; stickers via `/send/media` com `type: "sticker"`. |
| 7 | M | Rotas fora da documentação: `/chat/findMessages`, `/chat/profilePicture`, `/send/presence`, `DELETE /instance/delete`, `DELETE /webhook`. | `/message/find`, `/chat/details` ou `/chat/avatar`, `/message/presence`, `DELETE /instance`, `POST /webhook` com `enabled:false`. |
| 8 | M | Webhook grava só `sent`/`delivered` em `lead_activities.status`. | Estados da doc: Queued, Sent, Delivered, Read, Played, Failed, Expired, Canceled, Deleted. |
| 9 | M | Timestamps misturados: `message.messageTimestamp` vem em **ms**; `Timestamp` de recibo individual e `Receipts[].timestamp` em **s**. | Normalizar na entrada. |
| 10 | M | LID: não há chave canônica na doc. Webhook usa fallback fixo `https://f5system.uazapi.com` quando falta `BaseUrl` (`api/whatsapp-webhook.ts` ~485). | Persistir `sender_pn`, `sender_lid`, `chatlid`; usar `/chat/check` para mapear número↔LID; ler a URL base da configuração. |
| 11 | M | `/message/markread` não é usado (só `readchat` no envio). | Avaliar sincronizar leitura com o celular. Doc inconsistente: schema `results[]` x exemplo `markedMessages`; tratar ambos. |
| 12 | A | Sem backoff em 429. Limite: 10 req/s por instância (rajada 20); `/chat/details` máx. 4 paralelos. | Retry com `Retry-After`/backoff exponencial; fila local para rajadas (ex.: gap recovery de vários leads). |
| 13 | M | Não há `GET /instance/status` antes de enviar; erro 463 (`WHATSAPP_REACHOUT_TIMELOCK`) sem tratamento específico. | Checar estado antes; no 463 consultar `/instance/wa_messages_limits` e avisar o atendente. |
| 14 | M | Após timeout de envio, reenvia sem reconciliar. | Conferir por `track_id` ou `/message/find` antes de repetir (evita duplicar). |
| 15 | B | Estados `hibernated`, `registering`, `registration_conflict` não tratados (a doc cita os três). | Exibir e reconectar. |
| 16 | B | `/message/download`: `fileURL` expira em 2 dias (o fluxo para R2 está correto). `return_base64` é desaconselhado. | Manter cópia no R2; evitar `return_base64`. |

## Pontos a validar com tráfego real
- Formato exato dos eventos SSE (a doc mostra exemplo genérico diferente do webhook).
- Resposta de `markread`.
- A UAZAPI só guarda mensagens por ~7 dias: o Supabase é a fonte de verdade; `recoverMessagesInInterval` não serve para histórico antigo.
