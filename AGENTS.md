# F5 System • Diretrizes de Agentes e Desenvolvedores

> **Aviso Crítico:** Antes de executar qualquer ação, leia obrigatoriamente o arquivo mestre do sistema:
> 👉 [F5_SYSTEM_MASTER.md](file:///c:/Users/--/OneDrive/Documents/Codex%20Projetos/Bonomo%20Festas%202/F5_SYSTEM_MASTER.md)

1. **Nome Oficial:** O sistema chama-se **F5 System**. Não confunda a plataforma com nomes de clientes ou casas de festas (ex.: Bonomo Festas é apenas uma unidade no banco de dados).
2. **Propósito do ERP:** Gestão centralizada para donos de redes de casas de festas (2 a 5+ unidades) com equipes compartilhadas (comercial, pós-venda, financeiro).
3. **Padrão de Código:** TypeScript estrito, persistência no Supabase, zero mock data em produção e validação com `npm run build`.
4. **Validação Visual Conduzida pelo Usuário:** Todo teste de interface, navegação e interação visual deve ser realizado pelo USUÁRIO. O agente NÃO deve abrir navegadores de forma autônoma; o agente deve fornecer links, credenciais e instruções claras para o usuário testar e dar o retorno.
5. **Isolamento de Arquivos no Cloudflare R2:** Todo upload em ambiente local de desenvolvimento é isolado sob o prefixo `local_dev/`. Arquivos de teste podem ser purgados a qualquer momento com `npm run cleanup:r2`, sem risco aos arquivos de produção (`brand/`, `videos/`, `avatars/`).
6. **Definição de "Área de Conteúdo":** O espaço central do sistema (onde as páginas, dashboards, tabelas, funis e módulos são renderizados — delimitado à esquerda pelo menu lateral e no topo pelo header superior) é formalmente denominado **Área de Conteúdo**. Sempre que for solicitado ajustar layout, respiro, tamanho de elementos ou melhoria de espaço "na área de conteúdo", trata-se especificamente deste espaço principal de trabalho.
