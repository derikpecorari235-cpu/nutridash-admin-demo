# NutriDash — Painel Administrativo com IA para Nutricionistas

Dashboard administrativo com inteligência artificial integrada para profissionais de nutrição. Centraliza a gestão de pacientes, a geração de conteúdo, o controle financeiro e o atendimento automatizado em um só lugar.

> **Versão de demonstração.** Este repositório é uma versão sanitizada de um sistema desenvolvido sob medida para um cliente real do setor de nutrição. Os dados são fictícios e todas as credenciais foram substituídas por variáveis de ambiente.

## Funcionalidades

- **Gestão de pacientes** — cadastro, detalhamento e acompanhamento
- **Assistente de IA integrado** ao dashboard
- **Geração de conteúdo para redes sociais** com IA, a partir de uma base de conhecimento (RAG via upload de PDF)
- **Controle financeiro** — registro de despesas por categoria
- **Dashboard de métricas** em tempo real
- **Lembretes automatizados** (ex.: fotos de acompanhamento) via WhatsApp
- **Autenticação** com rotas protegidas

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend / Dados | Supabase (PostgreSQL + Auth) |
| Automação / Orquestração | N8N |
| IA | Claude (Anthropic), OpenAI (embeddings) |
| Mensageria | WhatsApp (Whapi) |

## Arquitetura

O frontend **não** chama as APIs de IA diretamente. Toda a lógica de inteligência artificial e as integrações passam por workflows no N8N, que orquestram as chamadas e a persistência:

```
Frontend (React) → N8N (orquestração) → Claude / OpenAI / Supabase / WhatsApp
```

Esse desenho mantém as credenciais sensíveis fora do cliente e centraliza a automação no backend.

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/derikpecorari235-cpu/nutridash-admin-demo.git

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env   # preencha com suas próprias credenciais

# 4. Rode o projeto
npm run dev
```

## Variáveis de ambiente

As credenciais reais foram removidas. Veja `.env.example` para a lista de variáveis necessárias (Supabase e webhooks do N8N).
