# V4 Browser Agent — Extensao Chrome

Executor universal para tarefas do PilotoAuto.
Substitui bookmarklets por uma extensao Chrome nativa (Manifest V3).

## Instalacao (modo desenvolvedor)

1. Abra `chrome://extensions/` no Chrome
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactacao**
4. Selecione a pasta `extensao-v4-browser/`
5. A extensao aparece na barra do Chrome com o icone V4

### Para uso com file:// (PilotoAuto local)

Apos instalar, va em `chrome://extensions/` > Detalhes da extensao V4 > Ative **"Permitir acesso a URLs de arquivo"**.

Alternativamente, abra o popup da extensao e clique em "Injetar Bridge" quando estiver em uma pagina file://.

## Como usar

### Tasks (mkt.lab / Ekyte)

1. No PilotoAuto, gere as tasks normalmente pela IA
2. Clique em **"Enviar Tasks para Extensao"**
3. Abra o mkt.lab (ekyte.com) na aba do navegador
4. Clique no icone da extensao V4 na barra do Chrome
5. Verifique as tasks na fila
6. Clique **EXECUTAR**
7. A extensao cria as tasks uma por uma automaticamente (~25s cada)

### Mensagens (WhatsApp Web)

1. No PilotoAuto, gere as mensagens de rapport
2. Clique em **"Enviar Mensagens para Extensao"**
3. Abra web.whatsapp.com na aba do navegador
4. Clique no icone da extensao e va na aba Mensagens
5. Clique **EXECUTAR**
6. A extensao cola as mensagens nas conversas (NAO envia — revisar antes)

## Arquitetura

```
PilotoAuto (webpage)
    |  CustomEvent 'v4-agent-send'
    v
bridge.js (content script na pagina do PilotoAuto)
    |  chrome.runtime.sendMessage
    v
background.js (service worker)
    |  chrome.tabs.sendMessage
    v
ekyte.js / whatsapp.js (content scripts nos sites-alvo)
```

## Estrutura de arquivos

```
extensao-v4-browser/
  manifest.json           Configuracao Manifest V3
  background.js           Service worker — filas e comunicacao
  popup.html / popup.js   Interface do popup (fila + progresso)
  content-scripts/
    bridge.js             Ponte PilotoAuto <-> extensao
    ekyte.js              Executor de tasks no mkt.lab
    whatsapp.js           Executor de mensagens no WhatsApp Web
  utils/
    storage.js            Wrapper chrome.storage.local
  assets/
    icon-48.png / icon-128.png
```

## Notas tecnicas

- **Manifest V3** — padrao atual do Chrome
- **chrome.storage.local** — filas persistem entre sessoes
- **Content scripts isolados** — cada dominio tem seu proprio content script
- **bridge.js** — usa CustomEvent para comunicacao webpage <-> extensao
- **Delay D = 5000ms** — mkt.lab e lento, nao reduzir sem testar
- **React setter trick** — obrigatorio para inputs React no Ekyte
- **simulateClick com coordenadas** — mkt.lab precisa de mousedown+mouseup+click reais
- **WhatsApp NAO envia** — mensagens ficam como rascunho para revisao
