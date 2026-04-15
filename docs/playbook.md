# Playbook: Account.AI

## Gargalo Resolvido

Gestores de contas na V4 Ruston & Co gastam horas por semana em trabalho repetitivo e manual:
- Coletar tasks espalhadas pelo mkt.lab para virar rapport de cliente
- Organizar tasks por cliente e formatar mensagens
- Produzir rapport mensal formatado
- Criar pauta de social media do zero
- Fazer check-in recorrente com clientes
- Rodar cliente oculto em campanhas ativas

O Account.AI concentra todas essas automações em um único painel, com IA (Claude) assumindo a parte criativa e repetitiva.

## O que Faz

Ferramenta web para gestores de contas com 6 módulos:

1. **Dashboard** — mostra o tempo economizado por ferramenta/usuário
2. **Clientes** — cadastro central de clientes (drawer), usado como contexto por todas as outras ferramentas
3. **Criador de Tasks** — gera o texto das tasks do mkt.lab já formatado a partir do briefing
4. **Gerador de Rapport** — fluxo de 4 passos:
   - **Coletar**: bookmarklet raspa as tasks do mkt.lab com 1 clique
   - **Organizar**: agrupa automaticamente por cliente
   - **Mensagens**: produz a mensagem semanal pronta pra mandar no WhatsApp/email
   - **Mensal**: compila o rapport mensal completo em PPTX / PDF / XLSX
5. **Cliente Oculto** — simula um cliente avaliando o atendimento e aponta gaps
6. **Check-in Automático** — gera o script de check-in do mês com dados do cliente
7. **Criação de Pauta** — gera pauta de conteúdo social completa a partir do brief

## Stack

HTML + CSS + JS puro, single-file (`index.html` ~520 KB), sem build.

Bibliotecas (CDN):
- PptxGenJS 3.12 — exporta PPTX
- SheetJS 0.18 — exporta XLSX
- jsPDF 2.5 — exporta PDF
- PapaParse 5.4 — CSV
- Chart.js 4.4 — gráficos do dashboard
- html2canvas 1.4 — captura de tela para PDFs
- Google Fonts (Inter)

IA: Anthropic Claude (API key informada pelo usuário final, armazenada apenas em `localStorage` do browser).

Design system: V4 ROKKO — palette preta/vermelha (`#E8364E`), fonte Inter, cards escuros.

## Prompt Principal

Cada módulo tem seu próprio prompt system, mas o núcleo comum do Account.AI é:

> Você é um assistente de gestor de contas na V4 Ruston & Co., agência de marketing digital. Dado o contexto do cliente ({{cliente}}) e os dados da tarefa ({{tasks}}), produza {{output_esperado}} em português brasileiro, tom profissional mas próximo, sem jargão desnecessário, pronto para uso direto com o cliente. Siga o formato V4 (headline, bullet objetivos, bullet próximos passos).

Prompts específicos (tasks, rapport, cliente oculto, check-in, pauta) adaptam esse core injetando contexto e formato de saída diferentes.

## Input / Output

| Módulo | Input | Output |
|--------|-------|--------|
| Criador de Tasks | Briefing do cliente + objetivo | Texto de tasks prontas pro mkt.lab |
| Rapport — Coletar | 1 clique no bookmarklet na tela do mkt.lab | Tasks copiadas pra clipboard |
| Rapport — Organizar | Tasks coladas do passo anterior | Tasks agrupadas por cliente |
| Rapport — Mensagens | Tasks organizadas | Mensagem WhatsApp/email pronta |
| Rapport — Mensal | Tasks do mês + dados do cliente | PPTX/PDF/XLSX do rapport mensal |
| Cliente Oculto | Dados do cliente + campanhas ativas | Relatório de avaliação simulada |
| Check-in Automático | Cliente + mês | Script de check-in formatado |
| Pauta | Briefing de social | Calendário de pauta completo |

## Tempo Economizado

Estimativa por gestor (levantamento V4 Ruston & Co):

- **Rapport mensal**: antes 3-4h por cliente → depois 15-20min por cliente
- **Tasks semanais**: antes 1-2h → depois 10min
- **Mensagens de status**: antes 45min por cliente → depois 5min
- **Pauta social**: antes 2-3h → depois 20min

**Total por gestor com 10 clientes**: economia estimada de **15-20h/semana**.

## Roadmap

Próximas iterações marcadas como "Em breve" no sidebar:
- Estruturação IG
- Produção de Roteiros
- Check-in Social

Integração futura com ROKKO onboarding (stack React 19 + Supabase + Gemini) para backend seguro da API key e persistência multi-usuário.

## Deploy

- **Produção (site estático)**: Vercel — `https://account-ai.vercel.app` *(a preencher após deploy)*
- **Repositório principal**: GitHub — *(a preencher após subida)*
- **Versão ROKKO integrada**: *(a preencher quando o Repo 2 for montado)*

## Como usar em 60 segundos

1. Acessa a URL
2. Cola sua API key da Anthropic na sidebar
3. Cadastra seus clientes em "Clientes"
4. Escolhe o módulo no menu → segue o fluxo guiado na tela
