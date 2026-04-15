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

## Como rodar localmente

Abre o `index.html` no navegador. Só isso. Nenhum build, nenhum servidor.

## Como usar

1. Cole sua API key da Anthropic (`sk-ant-api03-...`) na sidebar
2. Cadastre seus clientes em "Clientes"
3. Escolha a ferramenta no menu lateral e siga o fluxo de cada uma

## Deploy

Deploy estático na Vercel via drag & drop de toda esta pasta em https://vercel.com/new

## Documentação completa

Ver [`docs/playbook.md`](docs/playbook.md).
