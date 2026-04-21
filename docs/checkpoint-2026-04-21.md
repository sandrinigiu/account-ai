## Checkpoint — PilotoAuto (V4 Ruston & Co.)

**Vertical:** accounts
**Gargalo que resolve:** o time de accounts e social mídia da V4 gasta horas por semana em trabalho repetitivo (subir tasks, escrever rapport, avaliar atendimento, produzir pauta, mandar aprovação). PilotoAuto centraliza essas rotinas num painel + extensão que automatiza o que antes era copy-paste manual entre mkt.lab, Google Chat, WhatsApp e LLMs.
**Data:** 2026-04-21

### ✅ O que já construí

**1. Clientes — base de conhecimento global** (`👥 Clientes`)
- CRUD de clientes com nicho, responsável, dias de postagem, hashtags, tom de voz, notas e disclaimer de saúde.
- **Base de conhecimento por cliente** (KB): drag-and-drop de PDF / imagens / TXT — transcrições, briefings, benchmarks, reuniões. Alimenta a IA em todas as ferramentas do painel.
- **Importador com IA**: cola um documento e a IA extrai e cadastra vários clientes de uma vez.
- **Webhook Google Chat por cliente** (usado pela aba Aprovação da extensão).
- **Template global da mensagem de aprovação** com variáveis `{{LINK}} {{TITULO}} {{CLIENTE}}`.

**2. Criador de Tasks** (`🛠️ Ferramentas Account → Criador de Tasks`)
- Gera conjunto de tasks (título + briefing estruturado + prioridade + cliente) a partir de uma conversa com a IA.
- 3 modos: por arquivo/referência, manual, e a partir de planejamento.
- Botão "Enviar para Extensão" que sobe a fila via CustomEvent bridge → extensão executa no mkt.lab (duplica [V4] CLAUDE, renomeia, seleciona workspace, prioridade, briefing, Avançar, Criar).
- ~25s por task, sem intervenção humana.

**3. Gerador de Rapport** (`🛠️ Ferramentas Account → Gerador de Rapport`)
- Cola as tasks coletadas do mkt.lab (via extensão ou bookmarklet) → IA gera mensagem semanal personalizada por cliente, com tom de voz e contexto do KB.
- Pode incluir demandas extras (fora do mkt.lab).
- Envia em lote para o WhatsApp Web via extensão (cola, não envia automaticamente — account confere).

**4. Cliente Oculto** (`🛠️ Ferramentas Account → Cliente Oculto`)
- Conversa simulada com persona do cliente para avaliar atendimento. Régua de avaliação com critérios. IA sugere respostas.

**5. Check-in Automático** (`🛠️ Ferramentas Account → Check-in Automático`)
- Relatórios de performance semanal/mensal por cliente. Renderiza visualmente status e histórico.

**6. Criação de Pauta** (`📱 Social Mídia → Criação de Pauta`)
- Briefing guiado + gerador de pauta mensal completa para social mídia. Usa KB do cliente + dias de postagem + hashtags.
- Export estruturado para entrega.

**7. Extensão Chrome V4 Browser Agent** (`🧩 Extensão Chrome`)
- Empacotada como ZIP base64 embutido no HTML (download com 1 clique no painel).
- Bridge via CustomEvent para comunicação PilotoAuto ↔ extensão sem ID fixo, funciona em `file://`.
- **Aba Coletar:** raspa tasks visíveis do mkt.lab → clipboard.
- **Aba Tasks:** executa fila de criação (duplica [V4] CLAUDE com renomeação automática).
- **Aba Msgs:** cola rapport no WhatsApp Web em lote.
- **Aba Aprovação (nova):** com task aberta no mkt.lab, detecta cliente pelo padrão V4 de título `[NN][Tipo] (CLIENTE) | ...`, casa com o cadastro do cliente no PilotoAuto e envia link + mensagem configurável no grupo do Google Chat correspondente com um clique.

**8. Dashboard** (`📊 Dashboard`)
- Métricas de tempo economizado por ferramenta, visão agregada da equipe.

### 🚧 O que está travando
- **Fora do padrão ROKKO** (TS + Supabase + Vercel): PilotoAuto é um HTML single-file de ~600 KB rodando via `file://`. Funciona e é fácil de distribuir, mas integração com o ecossistema ROKKO exigirá refactor para repo + deploy.
- **Sem persistência centralizada**: todo estado (clientes, KB, configs, template de aprovação) vive em `localStorage` do browser. Cada account tem sua própria base — não há sync entre computadores.
- **Sem repo Git** em `C:\Piloto Auto`. Histórico vive só no arquivo. Risco de perda.
- **Pasta `v4-browser-agent/`** em `C:\Piloto Auto` está desatualizada (versão antes da aba Aprovação). Se Lucas carregar ela no Chrome, demo da Aprovação falha.
- **Aba Aprovação ainda não testada end-to-end** com task real + webhook real.
- **Estruturação IG / Roteiros / Check-in Social** — listados no menu como "Em breve", não implementados.

### 🎯 O que preciso para avançar
- Teste ao vivo da Aprovação com webhook real de um grupo do Google Chat da V4.
- Decisão de produto: **mantém single-file até o fim do hackathon** ou migra pra repo ROKKO já? Mudar meio do caminho custa ~1 dia, só vale se for exigência da banca.
- Priorizar quais "Em breve" do Social Mídia entram no MVP de entrega.
- Feedback de 2-3 accounts reais da V4 usando as ferramentas por 1-2 dias.

### 🎬 Demo
- **URL:** roda local — abrir `C:\Users\Usuario\Downloads\ppiloto-auto.html` no Chrome (+ extensão V4 Browser Agent carregada unpacked).
- **Credenciais de teste:** n/a.
- **Fluxo de 60 segundos (momento "uau" = Aprovação):**
  1. **Abrir PilotoAuto → Clientes** → mostrar o cliente cadastrado com KB, webhook Google Chat e template de aprovação editado → Salvar.
  2. **Criador de Tasks → Enviar para Extensão → mkt.lab** → ver a extensão criar 3 tasks em lote sem intervenção (~75s).
  3. **Abrir uma task no mkt.lab → extensão → aba Aprovação → Detectar** → cliente identificado automaticamente pelo título → **Enviar Aprovação** → mensagem cai no grupo do Chat do cliente.
  4. Fechar com Dashboard mostrando o ganho de tempo acumulado.

### 📊 Métrica do gargalo (agregado)

| Ferramenta | Antes (manual) | Depois (PilotoAuto) | Ganho estimado |
|---|---|---|---|
| Criar 10 tasks no mkt.lab | ~50 min | ~4 min (fila automática) | **~45 min/lote** |
| Rapport semanal (10 clientes) | ~2h (escrever 1 a 1) | ~15 min (cola + revisa) | **~1h45/semana/account** |
| Aprovação de task no Chat | ~90s × 15/dia = 22 min | ~8s × 15 = 2 min | **~20 min/dia/account** |
| Pauta mensal social mídia | ~3h por cliente | ~30 min (briefing + geração) | **~2h30/cliente/mês** |
| Cliente Oculto (avaliação) | ~45 min manual | ~15 min guiado | **~30 min/avaliação** |

**Total consolidado (6 accounts × 22 dias úteis):**
- Tasks + Rapport + Aprovação: **~15h/semana** liberadas do time de accounts.
- Pauta (10 clientes/mês): **~25h/mês** do time de social mídia.
- **Ganho agregado ≈ 85h/mês** de trabalho operacional convertido em trabalho estratégico.
