// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — WhatsApp Content Script
// Cola mensagens em conversas (NAO envia automaticamente)
// ══════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── MESSAGE LISTENER ───────────────────────────────
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'executeMessages') {
      executeMessages(message.queue)
        .then(function(count) {
          sendResponse({ success: true, count: count });
          chrome.runtime.sendMessage({ action: 'executionComplete', type: 'messages', count: count });
        })
        .catch(function(err) {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  });

  // ── HELPERS ─────────────────────────────────────────
  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function waitFor(fn, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    return new Promise(function(resolve, reject) {
      var elapsed = 0;
      var iv = setInterval(function() {
        elapsed += 300;
        var el = fn();
        if (el) { clearInterval(iv); resolve(el); return; }
        if (elapsed > timeoutMs) {
          clearInterval(iv);
          reject(new Error('Timeout esperando elemento'));
        }
      }, 300);
    });
  }

  function log(msg) {
    console.log('[V4 Agent][WhatsApp] ' + msg);
  }

  function updateProgress(done, total) {
    try {
      chrome.runtime.sendMessage({
        action: 'updateProgress',
        type: 'messages',
        progress: { done: done, total: total }
      });
    } catch (e) {}
  }

  // ── MAIN EXECUTOR ──────────────────────────────────
  async function executeMessages(queue) {
    if (!queue || !queue.length) throw new Error('Fila vazia');

    log('Iniciando envio de ' + queue.length + ' mensagens...');
    var completed = 0;

    for (var i = 0; i < queue.length; i++) {
      var msg = queue[i];
      log('Msg ' + (i + 1) + '/' + queue.length + ': ' + (msg.client || ''));

      try {
        await executeOneMessage(msg);
        completed++;
        updateProgress(completed, queue.length);
        log('✓ Mensagem ' + completed + ' colada (nao enviada)');
      } catch (err) {
        log('✗ Erro na msg ' + (i + 1) + ': ' + err.message);
        throw new Error('Mensagem "' + (msg.client || '') + '": ' + err.message);
      }

      // Wait between messages (random delay to seem human)
      if (i < queue.length - 1) {
        var delay = 2000 + Math.random() * 1500;
        await sleep(delay);
      }
    }

    log('✅ Todas as ' + completed + ' mensagens coladas!');
    return completed;
  }

  // ── EXECUTE ONE MESSAGE ────────────────────────────
  async function executeOneMessage(msg) {
    // Step 1: Search for contact/group
    log('Buscando conversa: ' + msg.client);

    var searchBox = await waitFor(function() {
      return document.querySelector('div[contenteditable="true"][data-tab="3"]');
    }, 8000);

    if (!searchBox) throw new Error('Barra de pesquisa nao encontrada');

    // Clear and type contact name
    searchBox.focus();
    searchBox.textContent = '';
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(300);

    document.execCommand('insertText', false, msg.client);
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));

    await sleep(1500); // Wait for search results

    // Step 2: Click on matching conversation
    var contact = null;
    try {
      contact = await waitFor(function() {
        var results = document.querySelectorAll('div[role="listitem"] span[title]');
        return Array.from(results).find(function(el) {
          var title = el.getAttribute('title') || '';
          return title.toLowerCase().includes(msg.client.toLowerCase());
        });
      }, 5000);
    } catch (e) {
      contact = null;
    }

    if (!contact) throw new Error('Conversa "' + msg.client + '" nao encontrada');

    contact.click();
    await sleep(1000);

    // Step 3: Find message input
    var msgInput = await waitFor(function() {
      return document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
             document.querySelector('footer div[contenteditable="true"]');
    }, 5000);

    if (!msgInput) throw new Error('Campo de mensagem nao encontrado');

    // Step 4: Paste message text (but DO NOT send)
    msgInput.focus();
    await sleep(200);

    // Use DataTransfer + ClipboardEvent for reliable paste
    var dt = new DataTransfer();
    dt.setData('text/plain', msg.texto);
    var pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true
    });
    msgInput.dispatchEvent(pasteEvent);

    // Fallback: insert text line by line if paste didn't work
    await sleep(300);
    if (!msgInput.textContent.trim()) {
      var lines = msg.texto.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (i > 0) {
          msgInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, shiftKey: true, bubbles: true
          }));
        }
        if (lines[i]) {
          document.execCommand('insertText', false, lines[i]);
        }
      }
      msgInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    log('Mensagem colada na conversa de ' + msg.client + ' (NAO enviada — revisar antes)');

    // Clear search
    await sleep(500);
    var clearBtn = document.querySelector('span[data-icon="x-alt"]');
    if (clearBtn) clearBtn.click();
  }

  log('Content script carregado em web.whatsapp.com');
})();
