# TRANSICAO 2026-11 — NAO APAGAR, NAO PERDER

Esta pasta contem a migracao da **grande mudanca de novembro/2026**. Producao ainda esta no schema antigo;
estas migrations levam a base antiga para o schema novo sem perder dados.

## Ordem obrigatoria (fonte da verdade = arquivos individuais)
| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | 20261114200000_central_contatos_e_contratos_schema_and_backfill | Cria `contacts`, `contracts`, `contact_venue_access`, codigos CONT-/CTR-, leads multi-funil, backfill |
| 2 | 20261116120000_migrate_and_archive_legacy_clients | Migra e arquiva `clients` legado para contratos/contatos |
| 3 | 20261116130000_event_schedules_and_venue_goals | Agenda de eventos com bloqueio de datas e metas da unidade |
| 4 | 20261116140000_contract_amounts_and_cleanup_duplicates | Valores de entrada/saldo, `lead_id`, limpeza de duplicados |
| 5 | 20261116160000_add_contract_title_and_attachments | Titulo do contrato e anexo de comprovante |
| 6 | 20261117100000_sync_contract_decisors_to_contacts | Todo decisor/contratante de contrato vira contato (idempotente) |
| 7 | 20261117120000_add_contacts_avatar_refreshed_at | Coluna de controle do refresh de foto (TTL 7 dias) |

Atalho: `APPLY_TRANSICAO_2026_11_PRODUCAO.sql` = os 7 acima concatenados, na ordem.
Testado em dry-run (BEGIN/ROLLBACK) no banco local que ja tinha tudo aplicado: rodou sem erro,
ou seja, reexecucao segura. **Nao foi executado em producao.**

## Procedimento de deploy
1. Backup do banco no Supabase.
2. Executar `APPLY_TRANSICAO_2026_11_PRODUCAO.sql` no SQL Editor (ou `supabase db push`).
3. Fazer deploy do front/`api/` **depois** do banco (o codigo novo ja espera as colunas).
4. Validar:
   - `select count(*) from contracts where contact_id is null;` -> 0
   - `select master_id, count(*) from contacts where deleted_at is null group by 1;` -> confere com o esperado
   - Central de Contatos lista todos (carregar mais / busca no servidor).

## Fora do banco (nao e migration)
- **Changelog (/atualizacoes)**: vive em `src/data/changelogData.ts`, vai junto com o proximo deploy do front. Nao exige SQL.
- **Foto de perfil**: R2 `avatars/{master_id}/picture_{codigo}.jpg`; `contacts.profile_picture_url` + `avatar_refreshed_at`.
- Variaveis de ambiente do R2/UAZAPI devem existir em producao (`api/r2-delete.ts` ainda tem chaves como fallback no codigo: remover e rotacionar).

## Regra para proximos agentes
Qualquer nova mudanca de schema entra como **nova migration datada depois de 20261117120000**.
Nunca editar as 7 acima nem este pacote; se algo mudar, criar migration corretiva e atualizar este LEIA-ME.
