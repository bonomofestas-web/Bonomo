# F5 System • Guia de Configuração de Ambiente Local & Offline (Supabase)

Este guia orienta como configurar um ambiente de desenvolvimento **isolado e offline**, impedindo que testes ou alterações de código afetem a base de dados de **Produção** com usuários reais.

---

## 🎯 Objetivo
- **Produção Protegida:** A base de produção (`https://zwozhktkapedthteckai.supabase.co`) fica 100% preservada de testes, deleções acidentais e poluição de dados.
- **Desenvolvimento Offline/Local:** Todo o trabalho diário roda localmente na sua máquina (`http://127.0.0.1:54321`) com o Supabase Studio local em `http://127.0.0.1:54323`.
- **Rotina de Deploy:** Ao final do dia ou término de uma sprint, você executa as migrações validadas para a produção e realiza os commits.

---

## 🏗️ Opção 1: Supabase CLI Local com Docker (100% Offline)

A Supabase CLI necessita do **Docker Desktop** rodando para orquestrar os containers locais do PostgreSQL, Auth (GoTrue), Storage, PostgREST e Studio.

### Passo 1: Instalar o Docker Desktop
1. Baixe e instale o [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/).
2. Certifique-se de que a opção **WSL 2 Backend** está habilitada durante a instalação.
3. Abra o Docker Desktop e deixe-o rodando.

### Passo 2: Login e Link do Projeto na Supabase CLI
No terminal do projeto:

```bash
# 1. Autenticar na sua conta Supabase (abrirá o navegador para autorizar)
npx supabase login

# 2. Vincular o repositório ao seu projeto de produção
npx supabase link --project-ref zwozhktkapedthteckai
```

### Passo 3: Fazer o Backup (Dump) de Produção
Antes de rodar localmente, extraia o esquema e os dados atuais de produção:

```bash
# Exportar esquema atual da produção
npx supabase db dump -f supabase/backup_production_schema.sql

# Exportar os dados atuais da produção
npx supabase db dump --data-only -f supabase/backup_production_data.sql
```

### Passo 4: Iniciar os Serviços Locais
```bash
npx supabase start
```
Após inicializar, o terminal exibirá:
- **API URL:** `http://127.0.0.1:54321`
- **GraphQL URL:** `http://127.0.0.1:54321/graphql/v1`
- **DB URL:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio URL:** `http://127.0.0.1:54323` *(Seu painel web idêntico ao Supabase Cloud)*
- **anon key:** `eyJhbGciOi...` *(Chave pública local)*
- **service_role key:** `eyJhbGciOi...` *(Chave privada local)*

### Passo 5: Configurar o `.env.local`
O Vite dá prioridade automática para o arquivo `.env.local` (que já está listado no `.gitignore` para nunca ir ao GitHub).

Crie o arquivo `.env.local` na raiz do projeto com os dados locais informados no passo anterior:

```env
# AMBIENTE LOCAL (DESENVOLVIMENTO ISOLADO)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<COLE_AQUI_A_ANON_KEY_LOCAL>
VITE_CLOUDFLARE_R2_PUBLIC_URL=https://pub-dfdef15994014f9c933c40b4ccde124b.r2.dev
```

Ao rodar `npm run dev`, o app agora conversará **apenas com a sua máquina**.

### Comandos Úteis do Dia a Dia (Local):
- `npx supabase status`: Mostra as URLs e chaves ativas do ambiente local.
- `npx supabase stop`: Pausa os containers locais para economizar memória quando não estiver programando.
- `npx supabase db reset`: Reseta o banco local e reaplica todas as migrações de `supabase/migrations/`.

---

## ☁️ Opção 2: Projeto de Staging / Homologação na Nuvem (Sem necessidade de Docker)

Caso não queira ou não possa instalar o Docker Desktop de imediato na sua máquina:

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e crie um novo projeto gratuito chamado `f5-system-staging`.
2. No SQL Editor do projeto de Staging, cole e execute as migrações da pasta `supabase/migrations/` e o backup de dados.
3. No arquivo `.env.local`, aponte para esse novo projeto de staging:
   ```env
   VITE_SUPABASE_URL=https://<seu-staging-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sua-anon-key-de-staging>
   ```
4. Dessa forma, você desenvolve isoladamente na nuvem sem consumir memória do seu PC com containers Docker e sem afetar a produção.

---

## 🚀 Como Subir Alterações para Produção

Quando você validar uma nova funcionalidade que requer alteração no banco de dados:

1. Gere uma nova migração versionada:
   ```bash
   npx supabase migration new nome_da_sua_alteracao
   ```
2. Escreva o SQL dentro do arquivo criado em `supabase/migrations/`.
3. Teste localmente com `npx supabase db reset`.
4. Quando estiver aprovado, aplique em produção com:
   ```bash
   npx supabase db push
   ```
5. Faça o commit e push do código no Git normalmente.
