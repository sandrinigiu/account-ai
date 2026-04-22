// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — Bridge Content Script
// ══════════════════════════════════════════════════════

(function() {
  'use strict';
  var VERSION = '1.1.0';

  window.__v4AgentInstalled = true;
  document.documentElement.setAttribute('data-v4-agent', 'true');

  console.log('[V4 Agent][Bridge] Carregado em ' + window.location.href);

  // Fila / mensagens (PilotoAuto → extensao)
  window.addEventListener('v4-agent-send', function(e) {
    var detail = e.detail || {};
    chrome.runtime.sendMessage({
      action: detail.action || 'replaceQueue',
      type: detail.type || 'tasks',
      tasks: detail.tasks,
      messages: detail.messages
    }, function(response) {
      if (chrome.runtime.lastError) {
        window.dispatchEvent(new CustomEvent('v4-agent-response', { detail: { success: false, error: chrome.runtime.lastError.message } }));
        return;
      }
      window.dispatchEvent(new CustomEvent('v4-agent-response', { detail: response || { success: false, error: 'Sem resposta' } }));
    });
  });

  // Sincronizacao de clientes (inclui webhook por cliente) — usada na aba Aprovacao
  window.addEventListener('v4-agent-sync-clientes', function(e) {
    var detail = e.detail || {};
    chrome.runtime.sendMessage({ action: 'syncClientes', clientes: detail.clientes || [] }, function() {
      if (chrome.runtime.lastError) console.error('[V4 Agent][Bridge] sync clientes falhou', chrome.runtime.lastError.message);
    });
  });

  // Template global de mensagem de aprovacao (configurado no PilotoAuto)
  window.addEventListener('v4-agent-sync-approval-config', function(e) {
    var detail = e.detail || {};
    chrome.runtime.sendMessage({ action: 'syncApprovalConfig', template: detail.template || '' }, function() {
      if (chrome.runtime.lastError) console.error('[V4 Agent][Bridge] sync config falhou', chrome.runtime.lastError.message);
    });
  });

  window.addEventListener('v4-agent-ping', function() {
    window.dispatchEvent(new CustomEvent('v4-agent-pong', { detail: { installed: true, version: VERSION } }));
  });

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'statusUpdate') {
      window.dispatchEvent(new CustomEvent('v4-agent-status', { detail: message }));
      sendResponse({ ok: true });
    }
    return true;
  });

  setTimeout(function() {
    window.dispatchEvent(new CustomEvent('v4-agent-pong', { detail: { installed: true, version: VERSION } }));
    // Pede ao PilotoAuto para re-sincronizar clientes e config quando a extensao carrega
    window.dispatchEvent(new CustomEvent('v4-agent-request-sync', { detail: {} }));
  }, 100);
})();
