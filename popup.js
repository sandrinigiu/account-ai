// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — Popup Logic
// ══════════════════════════════════════════════════════

// ── TAB SWITCHING ────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById(tab + '-tab').classList.add('active');
    if (tab === 'tasks' || tab === 'messages') loadQueue(tab);
    if (tab === 'approval') detectCurrentTask();
  });
});

// ── LOAD QUEUE ───────────────────────────────────────
function loadQueue(type) {
  type = type || 'tasks';
  chrome.runtime.sendMessage({ action: 'loadQueue' }, function(response) {
    if (!response) return;
    var queue = type === 'tasks' ? response.tasks : response.messages;
    renderQueue(type, queue || []);
    updateBadges(response.tasks || [], response.messages || []);
  });
}

function renderQueue(type, queue) {
  var list = document.getElementById(type + '-list');
  var execBtn = document.getElementById(type + '-execute-btn');

  if (!queue.length) {
    list.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">' + (type === 'tasks' ? '📭' : '💬') + '</div>' +
        '<div class="empty-text">Nenhum' + (type === 'tasks' ? 'a task' : 'a mensagem') + ' na fila</div>' +
        '<div class="empty-hint">Envie pelo PilotoAuto → "📤 Enviar para Extensao"</div>' +
      '</div>';
    execBtn.disabled = true;
    return;
  }

  list.innerHTML = queue.map(function(item, idx) {
    var title, detail;
    if (type === 'tasks') {
      title = item.title || 'Task sem titulo';
      detail = item.client ? '📍 ' + item.client : 'Sem cliente';
    } else {
      title = item.client || 'Mensagem';
      detail = '📱 ' + (item.numero || 'sem numero');
    }
    return '<div class="queue-item">' +
      '<div class="queue-num">' + (idx + 1) + '</div>' +
      '<div class="queue-text">' +
        '<div class="queue-title">' + escHtml(title) + '</div>' +
        '<div class="queue-detail">' + escHtml(detail) + '</div>' +
      '</div>' +
      '<button class="queue-remove" data-type="' + type + '" data-index="' + idx + '" title="Remover">✕</button>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.queue-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.index);
      var t = btn.dataset.type;
      chrome.runtime.sendMessage({ action: 'removeItem', type: t, itemIndex: idx }, function() {
        loadQueue(t);
        showToast('Item removido', 'success');
      });
    });
  });

  execBtn.disabled = false;
}

function updateBadges(tasks, messages) {
  var tb = document.getElementById('tasks-badge');
  var mb = document.getElementById('messages-badge');
  if (tb) tb.textContent = tasks.length ? '(' + tasks.length + ')' : '';
  if (mb) mb.textContent = messages.length ? '(' + messages.length + ')' : '';
}

// ── EXECUTE ──────────────────────────────────────────
['tasks', 'messages'].forEach(function(type) {
  var btn = document.getElementById(type + '-execute-btn');
  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = '⏳ Executando...';
    var prog = document.getElementById(type + '-progress');
    prog.classList.add('active');

    chrome.runtime.sendMessage({ action: 'executeQueue', type: type }, function(response) {
      btn.textContent = '▶ EXECUTAR';
      if (response && response.success) {
        showToast('✅ ' + (response.count || '') + ' ' + (type === 'tasks' ? 'tasks criadas' : 'mensagens coladas') + '!', 'success');
        loadQueue(type);
      } else {
        var err = (response && response.error) ? response.error : 'Erro desconhecido';
        showToast('❌ ' + err, 'error');
        btn.disabled = false;
      }
      setTimeout(function() { prog.classList.remove('active'); }, 2000);
    });
  });
});

// ── CLEAR QUEUE ──────────────────────────────────────
['tasks', 'messages'].forEach(function(type) {
  var btn = document.getElementById(type + '-clear-btn');
  btn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'clearQueue', type: type }, function() {
      loadQueue(type);
      showToast('Fila limpa', 'success');
    });
  });
});

// ── PROGRESS UPDATES ────────────────────────────────
chrome.runtime.onMessage.addListener(function(message) {
  if (message.action === 'progressUpdate') {
    var type = message.type;
    var p = message.progress;
    var fill = document.getElementById(type + '-progress-fill');
    var text = document.getElementById(type + '-progress-text');
    var prog = document.getElementById(type + '-progress');
    if (fill && p.total > 0) fill.style.width = Math.round(p.done / p.total * 100) + '%';
    if (text) text.textContent = p.done + ' / ' + p.total + (type === 'tasks' ? ' tasks' : ' msgs');
    if (prog) prog.classList.add('active');
  }
});

// ── INJECT BRIDGE ────────────────────────────────────
var injectBtn = document.getElementById('inject-bridge-btn');
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('file://')) {
    injectBtn.style.display = 'block';
    injectBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({ action: 'injectBridge', tabId: tabs[0].id }, function(response) {
        if (response && response.success) {
          injectBtn.textContent = '✅ Bridge injetado!';
          injectBtn.classList.add('success');
          showToast('Bridge injetado!', 'success');
        } else {
          showToast('Erro: ' + ((response && response.error) || 'falha'), 'error');
        }
      });
    });
  }
});

// ── COLLECT TASKS ────────────────────────────────────
var collectBtn = document.getElementById('collect-btn');
var collectResult = document.getElementById('collect-result');
var collectList = document.getElementById('collect-list');
var collectCount = document.getElementById('collect-count');
var collectCopyBtn = document.getElementById('collect-copy-btn');
var lastCollectedTasks = [];

if (collectBtn) {
  collectBtn.addEventListener('click', function() {
    collectBtn.disabled = true;
    collectBtn.textContent = '⏳ Coletando...';
    chrome.runtime.sendMessage({ action: 'collectTasks' }, function(response) {
      collectBtn.disabled = false;
      collectBtn.textContent = '📥 COLETAR TASKS DO MKT.LAB';
      if (response && response.success && response.tasks && response.tasks.length) {
        lastCollectedTasks = response.tasks;
        collectCount.textContent = '✅ ' + response.count + ' tasks encontradas e copiadas!';
        collectList.innerHTML = response.tasks.map(function(t, idx) {
          return '<div class="queue-item"><div class="queue-num">' + (idx + 1) + '</div><div class="queue-text"><div class="queue-title">' + escHtml(t) + '</div></div></div>';
        }).join('');
        collectResult.style.display = 'block';
        navigator.clipboard.writeText(response.tasks.join('\n')).then(function() {
          showToast('✅ ' + response.count + ' tasks copiadas!', 'success');
        }).catch(function() {
          showToast('Use o botao "Copiar novamente".', 'error');
        });
      } else {
        showToast('❌ ' + ((response && response.error) || 'Nenhuma task encontrada'), 'error');
        collectResult.style.display = 'none';
      }
    });
  });
}

if (collectCopyBtn) {
  collectCopyBtn.addEventListener('click', function() {
    if (!lastCollectedTasks.length) return;
    navigator.clipboard.writeText(lastCollectedTasks.join('\n')).then(function() {
      showToast('📋 ' + lastCollectedTasks.length + ' tasks copiadas!', 'success');
    }).catch(function() { showToast('Falha ao copiar', 'error'); });
  });
}

// ── APPROVAL TAB ─────────────────────────────────────
var apRefreshBtn = document.getElementById('ap-refresh-btn');
var apSendBtn = document.getElementById('ap-send-btn');
var apTitleEl = document.getElementById('ap-title');
var apClientEl = document.getElementById('ap-client');
var apLinkEl = document.getElementById('ap-link');
var apPreviewEl = document.getElementById('ap-preview');
var apStatusWrap = document.getElementById('ap-status-wrap');

var currentApproval = null;

function setApStatus(kind, html) {
  if (!apStatusWrap) return;
  if (!kind) { apStatusWrap.innerHTML = ''; return; }
  apStatusWrap.innerHTML = '<div class="ap-' + kind + '">' + html + '</div>';
}

function buildPreview(info, template) {
  var tpl = template || 'Segue para aprovação @todos\n{{LINK}}';
  return tpl
    .replace(/\{\{LINK\}\}/g, info.link || '')
    .replace(/\{\{TITULO\}\}/g, info.title || '')
    .replace(/\{\{CLIENTE\}\}/g, info.client || '');
}

function detectCurrentTask() {
  apTitleEl.textContent = 'Detectando...';
  apTitleEl.classList.add('muted');
  apClientEl.textContent = '—'; apClientEl.classList.add('muted');
  apLinkEl.textContent = '—'; apLinkEl.classList.add('muted');
  apPreviewEl.textContent = '—';
  apSendBtn.disabled = true;
  setApStatus(null);

  chrome.runtime.sendMessage({ action: 'getCurrentEkyteTask' }, function(response) {
    if (!response || !response.success) {
      var err = (response && response.error) || 'Erro ao ler a página';
      setApStatus('warn', '⚠️ ' + escHtml(err));
      apTitleEl.textContent = 'Abra uma task no mkt.lab e clique em “Detectar”';
      return;
    }
    var info = response.info || {};
    currentApproval = info;

    if (info.title) {
      apTitleEl.textContent = info.title;
      apTitleEl.classList.remove('muted');
    } else {
      apTitleEl.textContent = 'Task não identificada no painel aberto';
    }

    if (info.client) {
      apClientEl.textContent = info.client + (info.webhook ? '  ✅ webhook configurado' : '  ⚠️ sem webhook');
      apClientEl.classList.remove('muted');
    } else {
      apClientEl.textContent = 'Cliente não detectado — cadastre o cliente no PilotoAuto com o mesmo nome do workspace';
    }

    if (info.link) {
      apLinkEl.textContent = info.link;
      apLinkEl.classList.remove('muted');
    }

    chrome.storage.local.get(['gchat_template'], function(data) {
      apPreviewEl.textContent = buildPreview(info, data.gchat_template);
    });

    if (info.client && info.webhook && info.link) {
      apSendBtn.disabled = false;
      setApStatus('ok', '✅ Pronto para enviar no grupo de <b>' + escHtml(info.client) + '</b>.');
    } else if (info.client && !info.webhook) {
      setApStatus('warn', '⚠️ Cliente <b>' + escHtml(info.client) + '</b> não tem webhook cadastrado no PilotoAuto.');
    } else if (!info.client) {
      setApStatus('warn', '⚠️ Workspace da task não casa com nenhum cliente cadastrado.');
    }
  });
}

if (apRefreshBtn) apRefreshBtn.addEventListener('click', detectCurrentTask);

if (apSendBtn) {
  apSendBtn.addEventListener('click', function() {
    if (!currentApproval || !currentApproval.webhook) return;
    apSendBtn.disabled = true;
    apSendBtn.textContent = '⏳ Enviando...';
    chrome.runtime.sendMessage({
      action: 'sendChatApproval',
      webhook: currentApproval.webhook,
      link: currentApproval.link,
      title: currentApproval.title,
      client: currentApproval.client
    }, function(response) {
      apSendBtn.textContent = '📨 ENVIAR APROVAÇÃO';
      if (response && response.success) {
        setApStatus('ok', '✅ Mensagem enviada no grupo de <b>' + escHtml(currentApproval.client) + '</b>.');
        showToast('✅ Aprovação enviada!', 'success');
        apSendBtn.disabled = true;
      } else {
        setApStatus('warn', '❌ ' + escHtml((response && response.error) || 'falha'));
        showToast('❌ Falha ao enviar', 'error');
        apSendBtn.disabled = false;
      }
    });
  });
}

// ── TOAST ────────────────────────────────────────────
function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + (type || '');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── INIT ─────────────────────────────────────────────
loadQueue('tasks');
loadQueue('messages');
