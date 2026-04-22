// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — Service Worker (background.js)
// ══════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(function() {
  console.log('[V4 Agent] Extensao instalada');
  chrome.storage.local.set({
    ext_queue_tasks: [],
    ext_queue_messages: [],
    ext_execution_status: null
  });
});

// ── MESSAGE HANDLER ──────────────────────────────────
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  var action = message.action;

  switch (action) {
    case 'loadQueue': handleLoadQueue(sendResponse); return true;
    case 'addQueue': handleAddQueue(message, sendResponse); return true;
    case 'replaceQueue': handleReplaceQueue(message, sendResponse); return true;
    case 'executeQueue': handleExecuteQueue(message.type, sendResponse); return true;
    case 'removeItem': handleRemoveItem(message, sendResponse); return true;
    case 'clearQueue': handleClearQueue(message.type, sendResponse); return true;

    case 'updateProgress':
      chrome.runtime.sendMessage({ action: 'progressUpdate', type: message.type, progress: message.progress }).catch(function() {});
      sendResponse({ ok: true });
      return true;

    case 'executionComplete': handleExecutionComplete(message, sendResponse); return true;

    case 'getStatus':
      chrome.storage.local.get(['ext_execution_status'], function(data) {
        sendResponse(data.ext_execution_status || null);
      });
      return true;

    case 'collectTasks': handleCollectTasks(sendResponse); return true;
    case 'injectBridge': handleInjectBridge(message.tabId, sendResponse); return true;
    case 'sendChatApproval': handleSendChatApproval(message, sendResponse); return true;
    case 'testChatWebhook': handleTestChatWebhook(message, sendResponse); return true;
    case 'getCurrentEkyteTask': handleGetCurrentEkyteTask(sendResponse); return true;
    case 'syncClientes': handleSyncClientes(message, sendResponse); return true;
    case 'syncApprovalConfig': handleSyncApprovalConfig(message, sendResponse); return true;
  }
});

// ── SYNC FROM PILOTOAUTO ─────────────────────────────
function handleSyncClientes(message, sendResponse) {
  var list = Array.isArray(message.clientes) ? message.clientes : [];
  chrome.storage.local.set({ v4_clientes: list }, function() {
    console.log('[V4 Agent] ' + list.length + ' clientes sincronizados');
    sendResponse({ success: true, count: list.length });
  });
}

function handleSyncApprovalConfig(message, sendResponse) {
  var obj = {};
  if (typeof message.template === 'string') obj.gchat_template = message.template;
  chrome.storage.local.set(obj, function() {
    console.log('[V4 Agent] Config de aprovação sincronizada');
    sendResponse({ success: true });
  });
}

// ── DETECT CURRENT EKYTE TASK ────────────────────────
async function handleGetCurrentEkyteTask(sendResponse) {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab) { sendResponse({ success: false, error: 'Nenhuma aba ativa' }); return; }
    if (!tab.url || (!tab.url.includes('ekyte.com') && !tab.url.includes('mkt.lab'))) {
      sendResponse({ success: false, error: 'Abra o mkt.lab (Ekyte) com uma task aberta' });
      return;
    }

    var data = await chrome.storage.local.get(['v4_clientes']);
    var clientes = data.v4_clientes || [];

    chrome.tabs.sendMessage(tab.id, { action: 'getCurrentTaskInfo', clientes: clientes }, function(response) {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Content script não carregou. Recarregue o mkt.lab.' });
        return;
      }
      if (!response) { sendResponse({ success: false, error: 'Sem resposta do content script' }); return; }
      // Injeta link real e webhook do cliente
      var info = response.info || {};
      info.link = tab.url;
      if (info.client) {
        var match = clientes.find(function(c) {
          return c && c.nome && String(c.nome).trim().toUpperCase() === String(info.client).trim().toUpperCase();
        });
        info.webhook = match ? (match.gchatWebhook || '') : '';
      } else {
        info.webhook = '';
      }
      sendResponse({ success: true, info: info });
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── GOOGLE CHAT APPROVAL ─────────────────────────────
async function handleSendChatApproval(message, sendResponse) {
  try {
    var cfg = await chrome.storage.local.get(['gchat_webhook_url', 'gchat_template']);
    var webhook = message.webhook || cfg.gchat_webhook_url;
    var template = cfg.gchat_template || 'Segue para aprovação @todos\n{{LINK}}';

    if (!webhook) {
      sendResponse({ success: false, error: 'Webhook do Google Chat não configurado pro cliente.' });
      return;
    }

    var text = template
      .replace(/\{\{LINK\}\}/g, message.link || '')
      .replace(/\{\{TITULO\}\}/g, message.title || '')
      .replace(/\{\{CLIENTE\}\}/g, message.client || '');

    var r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: text })
    });

    if (!r.ok) {
      var errText = await r.text();
      sendResponse({ success: false, error: 'HTTP ' + r.status + ': ' + errText.substring(0, 200) });
      return;
    }
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleTestChatWebhook(message, sendResponse) {
  try {
    var webhook = message.webhook;
    if (!webhook) { sendResponse({ success: false, error: 'URL vazia' }); return; }
    var r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: '✅ Teste da extensao V4 Browser Agent — webhook funcionando!' })
    });
    if (!r.ok) {
      var errText = await r.text();
      sendResponse({ success: false, error: 'HTTP ' + r.status + ': ' + errText.substring(0, 200) });
      return;
    }
    sendResponse({ success: true });
  } catch (err) { sendResponse({ success: false, error: err.message }); }
}

// ── HANDLERS ─────────────────────────────────────────
function handleLoadQueue(sendResponse) {
  chrome.storage.local.get(['ext_queue_tasks', 'ext_queue_messages'], function(data) {
    sendResponse({ tasks: data.ext_queue_tasks || [], messages: data.ext_queue_messages || [] });
  });
}

function handleAddQueue(message, sendResponse) {
  var type = message.type;
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  var newItems = type === 'tasks' ? (message.tasks || []) : (message.messages || []);
  chrome.storage.local.get([key], function(data) {
    var current = data[key] || [];
    var merged = current.concat(newItems);
    chrome.storage.local.set({ [key]: merged }, function() {
      updateBadge();
      sendResponse({ success: true, count: newItems.length, total: merged.length });
    });
  });
}

function handleReplaceQueue(message, sendResponse) {
  var type = message.type;
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  var items = type === 'tasks' ? (message.tasks || []) : (message.messages || []);
  chrome.storage.local.set({ [key]: items }, function() {
    updateBadge();
    sendResponse({ success: true, count: items.length });
  });
}

async function handleExecuteQueue(type, sendResponse) {
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  try {
    var data = await chrome.storage.local.get([key]);
    var queue = data[key] || [];
    if (!queue.length) { sendResponse({ success: false, error: 'Fila vazia' }); return; }

    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab) { sendResponse({ success: false, error: 'Nenhuma aba ativa' }); return; }

    if (type === 'tasks' && !tab.url.includes('ekyte.com') && !tab.url.includes('mkt.lab')) {
      sendResponse({ success: false, error: 'Abra o mkt.lab (Ekyte) primeiro' }); return;
    }
    if (type === 'messages' && !tab.url.includes('web.whatsapp.com')) {
      sendResponse({ success: false, error: 'Abra web.whatsapp.com primeiro' }); return;
    }

    chrome.storage.local.set({ ext_execution_status: { running: true, type: type, total: queue.length, done: 0 } });
    var csAction = type === 'tasks' ? 'executeTasks' : 'executeMessages';
    chrome.tabs.sendMessage(tab.id, { action: csAction, queue: queue }, function(response) {
      if (chrome.runtime.lastError) {
        var errMsg = chrome.runtime.lastError.message || '';
        sendResponse({ success: false, error: errMsg.includes('Receiving end') ? 'Content script não encontrado. Recarregue a página.' : errMsg });
        return;
      }
      sendResponse(response || { success: false, error: 'Sem resposta do content script' });
    });
  } catch (err) { sendResponse({ success: false, error: err.message }); }
}

function handleRemoveItem(message, sendResponse) {
  var type = message.type;
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  chrome.storage.local.get([key], function(data) {
    var current = data[key] || [];
    current.splice(message.itemIndex, 1);
    chrome.storage.local.set({ [key]: current }, function() {
      updateBadge();
      sendResponse({ success: true });
    });
  });
}

function handleClearQueue(type, sendResponse) {
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  chrome.storage.local.set({ [key]: [] }, function() {
    updateBadge();
    sendResponse({ success: true });
  });
}

function handleExecutionComplete(message, sendResponse) {
  var type = message.type;
  var count = message.count;
  var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
  chrome.storage.local.set({
    [key]: [],
    ext_execution_status: { running: false, type: type, total: count, done: count }
  }, function() { updateBadge(); sendResponse({ success: true }); });
}

async function handleCollectTasks(sendResponse) {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab) { sendResponse({ success: false, error: 'Nenhuma aba ativa' }); return; }
    if (!tab.url.includes('ekyte.com') && !tab.url.includes('mkt.lab')) {
      sendResponse({ success: false, error: 'Abra o mkt.lab (Ekyte) primeiro' }); return;
    }
    chrome.tabs.sendMessage(tab.id, { action: 'collectTasks' }, function(response) {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Content script não encontrado. Recarregue o mkt.lab.' });
        return;
      }
      sendResponse(response || { success: false, error: 'Sem resposta' });
    });
  } catch (err) { sendResponse({ success: false, error: err.message }); }
}

async function handleInjectBridge(tabId, sendResponse) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content-scripts/bridge.js'] });
    sendResponse({ success: true });
  } catch (err) { sendResponse({ success: false, error: err.message }); }
}

function updateBadge() {
  chrome.storage.local.get(['ext_queue_tasks', 'ext_queue_messages'], function(data) {
    var total = (data.ext_queue_tasks || []).length + (data.ext_queue_messages || []).length;
    chrome.action.setBadgeText({ text: total > 0 ? String(total) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#E8364E' });
  });
}
