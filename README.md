# Account.AI

Ferramentas de automação para gestores de contas da V4 Ruston & Co.

## Stack

Site estático single-file (HTML + JS puro) com design system V4 ROKKO.

Libs (via CDN):
- PptxGenJS, SheetJS (XLSX), jsPDF, PapaParse, Chart.js, html2canvas

Integração IA: Anthropic Claude API (chave colada pelo próprio usuário na sidebar, salva em localStorage do navegador — nenhuma credencial fica no servidor).

## Módulos

- **Dashboard** — métricas de tempo economizado
- **Clientes** — CRUD de clientes
- **Ferramentas Account**
  - Criador de Tasks
  - Gerador de Rapport (fluxo 4 passos: Coletar → Organizar → Mensagens → Mensal)
  - Cliente Oculto
  - Check-in Automático
- **Social Mídia**
  - Criação de Pauta
- **Extensão Chrome V4 Browser Agent** (baixe pelo próprio painel)
  - Coletar tasks do mkt.lab → clipboard
  - Criar tasks em lote no mkt.lab (duplica [V4] CLAUDE, renomeia, seleciona workspace, preenche briefing, Avançar, Criar)
  - Colar mensagens de rapport no WhatsApp Web em lote
  - **Aprovação no Google Chat** — com a task aberta no mkt.lab, detecta o cliente pelo padrão de título V4 `[NN][Tipo] (CLIENTE) | ...` e envia link + mensagem configurável no grupo do cliente com um clique (webhook por cliente; template global em Clientes)

## Como rodar localmente

Abre o `index.html` no navegador. Só isso. Nenhum build, nenhum servidor.

## Como usar

1. Cole sua API key da Anthropic (`sk-ant-api03-...`) na sidebar
2. Cadastre seus clientes em "Clientes"
3. Escolha a ferramenta no menu lateral e siga o fluxo de cada uma

## Deploy

Deploy estático na Vercel — este repositório é conectado direto à Vercel. Cada push na `main` vira deploy automático.

Para deploy manual avulso: drag & drop desta pasta em https://vercel.com/new.

## Documentação

- [`docs/playbook.md`](docs/playbook.md) — playbook do hackathon
- [`docs/checkpoint-2026-04-21.md`](docs/checkpoint-2026-04-21.md) — estado do projeto no checkpoint
