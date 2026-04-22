// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — Ekyte Content Script (mkt.lab)
// ══════════════════════════════════════════════════════

(function() {
  'use strict';

  var D = 6000;
  var D_MODAL = 7500;
  var D_AFTER_TITLE = 2500;
  var D_BETWEEN_TASKS = 8000;

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'executeTasks') {
      executeTasks(message.queue)
        .then(function(count) {
          sendResponse({ success: true, count: count });
          chrome.runtime.sendMessage({ action: 'executionComplete', type: 'tasks', count: count });
        })
        .catch(function(err) { sendResponse({ success: false, error: err.message }); });
      return true;
    }
    if (message.action === 'collectTasks') {
      sendResponse(collectVisibleTasks()); return true;
    }
    if (message.action === 'getCurrentTaskInfo') {
      sendResponse({ success: true, info: getCurrentTaskInfo(message.clientes || []) });
      return true;
    }
  });

  // ── DETECT CURRENTLY OPEN TASK ─────────────────────
  function getCurrentTaskInfo(clientes) {
    var info = { title: '', client: '', link: window.location.href, workspaceRaw: '' };

    // Titulo: maior fonte no topo do painel direito (left > 400, top <= 250)
    var titleEl = Array.from(document.querySelectorAll('h1,h2,h3,[class*="title"] span,[class*="Title"] span,div'))
      .filter(function(el) {
        if (el.childElementCount !== 0) return false;
        var t = (el.textContent || '').trim();
        if (t.length < 3 || t.length > 300) return false;
        var r = el.getBoundingClientRect();
        if (r.left < 400) return false;
        if (r.top > 250) return false;
        if (r.width < 80) return false;
        return true;
      })
      .sort(function(a, b) {
        var sa = parseFloat(getComputedStyle(a).fontSize || '0');
        var sb = parseFloat(getComputedStyle(b).fontSize || '0');
        if (sb !== sa) return sb - sa;
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      })[0];
    if (titleEl) info.title = (titleEl.textContent || '').trim();

    // Texto do painel direito (fallback: body inteiro)
    var panelText = '';
    try {
      var rightPanel = Array.from(document.querySelectorAll('aside, [class*="panel"], [class*="Panel"], [class*="sidebar"], [class*="Sidebar"], [class*="detail"], [class*="Detail"], [role="complementary"]'))
        .filter(function(el) {
          var r = el.getBoundingClientRect();
          return r.left > 400 && r.width > 200 && r.height > 200;
        })
        .sort(function(a, b) { return b.getBoundingClientRect().width - a.getBoundingClientRect().width; })[0];
      panelText = rightPanel ? (rightPanel.innerText || '') : (document.body.innerText || '');
    } catch (e) { panelText = document.body.innerText || ''; }

    try {
      var m = panelText.match(/Workspace\s*[:\n\r]+\s*([^\n\r]+)/i);
      if (m && m[1]) info.workspaceRaw = m[1].trim();
    } catch (e) {}

    // 1ª prioridade: cliente extraído do TÍTULO da task.
    //   Padrao V4: "[NN][Tipo] (CLIENTE) | ..."  → primeiro (...) é o cliente.
    var fromTitle = '';
    if (info.title) {
      var mt = info.title.match(/\(([^)]+)\)/);
      if (mt && mt[1]) fromTitle = mt[1].trim();
    }

    // 2ª prioridade: match do texto do painel com a lista de clientes cadastrados
    //   (nome mais longo que aparece com boundary de palavra).
    var upperText = (panelText || '').toUpperCase();
    var bestFromList = '';
    (clientes || []).forEach(function(c) {
      if (!c || !c.nome) return;
      var nome = String(c.nome).trim();
      if (!nome) return;
      var nomeUp = nome.toUpperCase();
      var re = new RegExp('(^|[^A-Z0-9])' + nomeUp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Z0-9]|$)');
      if (re.test(upperText)) {
        if (nome.length > bestFromList.length) bestFromList = nome;
      }
    });

    if (fromTitle) {
      // Usa o nome exato do cadastro se bater (case-insensitive)
      var match = (clientes || []).find(function(c) {
        return c && c.nome && String(c.nome).trim().toUpperCase() === fromTitle.toUpperCase();
      });
      info.client = match ? String(match.nome).trim() : fromTitle;
    } else if (bestFromList) {
      info.client = bestFromList;
    } else if (info.workspaceRaw) {
      info.client = info.workspaceRaw;
    }

    return info;
  }

  // ── COLLECT VISIBLE TASKS ──────────────────────────
  function collectVisibleTasks() {
    var lines = (document.body.innerText || '').split('\n');
    var seen = {};
    var tasks = [];
    var noisePatterns = [/\bTIMER\b/i, /\bREUNI/i, /\bLEMBRET/i, /\bONBOARD/i, /\bTODOS OS CLIENTES\b/i, /\bRAPORT COTIDIANO\b/i, /^\[Modelo\]/i, /\[V4\]\s*CLAUDE/i, /^\[RUSTON\]/i, /^\[Ruston\]/i];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.charAt(0) !== '[') continue;
      if (l.length < 8 || l.length > 300) continue;
      if ((l.match(/[A-Za-z]/g) || []).length < 4) continue;
      var isNoise = false;
      for (var n = 0; n < noisePatterns.length; n++) { if (noisePatterns[n].test(l)) { isNoise = true; break; } }
      if (isNoise) continue;
      var k = l.toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1;
      tasks.push(l);
    }
    return { success: true, tasks: tasks, count: tasks.length };
  }

  // ── HELPERS ─────────────────────────────────────────
  function sleep(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }
  function waitFor(fn, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    return new Promise(function(resolve, reject) {
      var elapsed = 0;
      var iv = setInterval(function() {
        elapsed += 200;
        var el = fn();
        if (el) { clearInterval(iv); resolve(el); return; }
        if (elapsed > timeoutMs) { clearInterval(iv); reject(new Error('Timeout esperando elemento (' + timeoutMs + 'ms)')); }
      }, 200);
    });
  }
  function modal() { return document.querySelector('.modal-content'); }
  function simulateClick(el) {
    var r = el.getBoundingClientRect();
    var opts = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }
  function setInputValue(inp, value) {
    inp.focus(); inp.select();
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, value);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function updateProgress(done, total) {
    try { chrome.runtime.sendMessage({ action: 'updateProgress', type: 'tasks', progress: { done: done, total: total } }); } catch (e) {}
  }
  function log(msg) { console.log('[V4 Agent][Ekyte] ' + msg); }

  // ── EXECUTOR (criação de tasks em lote) ────────────
  // Aprovação NÃO é mais disparada aqui — é manual via aba "Aprovação"
  // da extensão, para tasks já existentes.
  async function executeTasks(queue) {
    if (!queue || !queue.length) throw new Error('Fila vazia');
    var completed = 0;
    for (var i = 0; i < queue.length; i++) {
      var task = queue[i];
      try {
        await executeOneTask(task);
        completed++;
        updateProgress(completed, queue.length);
      } catch (err) {
        throw new Error('Task "' + (task.title || '').substring(0, 30) + '": ' + err.message);
      }
      if (i < queue.length - 1) await sleep(D_BETWEEN_TASKS);
    }
    return completed;
  }

  async function executeOneTask(task) {
    await step1_openClaudePanel();
    await step2_openDropdown();
    await step3_clickDuplicar();
    await sleep(D_MODAL);
    await step4_fillTitle(task.title);
    await sleep(D + D_AFTER_TITLE);
    if (task.client) { await step5_selectWorkspace(task.client); await sleep(D); }
    await step5b_setPriority(task.priority);
    await sleep(1200);
    if (task.briefing) { await step6_fillBriefing(task.briefing); await sleep(D); }
    await step7_clickAvancar();
    await sleep(D);
    await step8_clickCriar();
    await sleep(2500);
  }

  async function step1_openClaudePanel() {
    var panelOpen = Array.from(document.querySelectorAll('h1,div,span')).find(function(el) {
      return el.childElementCount === 0 && el.textContent.trim() === '[V4] CLAUDE' && el.getBoundingClientRect().left > 400;
    });
    if (panelOpen) { await sleep(500); return; }
    var taskLink = Array.from(document.querySelectorAll('a,span,div,td')).find(function(el) {
      var r = el.getBoundingClientRect();
      return el.childElementCount === 0 && el.textContent.trim() === '[V4] CLAUDE' && r.left < 400 && r.left > 0;
    });
    if (!taskLink) throw new Error('[V4] CLAUDE nao encontrada na lista');
    simulateClick(taskLink);
    await sleep(2500);
  }

  async function step2_openDropdown() {
    var container = await waitFor(function() { return document.querySelector('.more-header.dropdown'); }, 5000);
    var anchor = document.getElementById('dropdown-task-header');
    if (!container || !anchor) throw new Error('Botao (...) nao encontrado');
    container.classList.add('open');
    anchor.setAttribute('open', '');
    await sleep(500);
  }

  async function step3_clickDuplicar() {
    var item = await waitFor(function() {
      var a = document.querySelector('a[title="Duplicar tarefa"]');
      if (a) return a;
      var menu = document.querySelector('ul[role="menu"]');
      if (menu) return Array.from(menu.querySelectorAll('a')).find(function(el) { return el.textContent.trim() === 'Duplicar tarefa'; });
      return null;
    }, 5000);
    if (!item) throw new Error('Duplicar tarefa nao encontrado');
    simulateClick(item);
  }

  async function step4_fillTitle(title) {
    var inp = await waitFor(function() { var m = modal(); return m ? m.querySelector('input#title') : null; }, 15000);
    if (!inp) throw new Error('Input de titulo nao encontrado');
    await sleep(800);
    setInputValue(inp, title);
    await sleep(1500);
    var m2 = modal(); var inp2 = m2 ? m2.querySelector('input#title') : null;
    if (inp2 && inp2.value !== title) {
      setInputValue(inp2, title);
      await sleep(1000);
      var m3 = modal(); var inp3 = m3 ? m3.querySelector('input#title') : null;
      if (inp3 && inp3.value !== title) setInputValue(inp3, title);
    }
  }

  async function step5_selectWorkspace(client) {
    var m = modal();
    if (!m) return;
    var focusInp = m.querySelector('.Select-input-tofocus');
    if (!focusInp) return;
    simulateClick(focusInp); focusInp.focus();
    var sinp = await waitFor(function() {
      var m2 = modal(); if (!m2) return null;
      var outer = m2.querySelector('.Select-menu-outer'); if (!outer) return null;
      return outer.querySelector('input#Select-input') || null;
    }, 8000);
    if (!sinp) return;
    sinp.focus(); setInputValue(sinp, client);
    sinp.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: client.slice(-1) }));
    sinp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: client.slice(-1) }));
    await new Promise(function(resolve) {
      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        var m3 = modal(); if (!m3) { clearInterval(poll); resolve(); return; }
        var opts = Array.from(m3.querySelectorAll('div[role="option"]'));
        var match = opts.find(function(el) {
          var sp = el.querySelector('span[title]');
          return sp && sp.title.trim().toUpperCase() === client.trim().toUpperCase();
        });
        if (!match && opts.length > 0 && attempts > 10) match = opts[0];
        if (match) { clearInterval(poll); simulateClick(match); resolve(); }
        else if (attempts > 30) { clearInterval(poll); resolve(); }
      }, 250);
    });
  }

  async function step5b_setPriority(priority) {
    var ourPriority = (priority !== undefined && priority !== null) ? parseInt(priority) : 50;
    ourPriority = Math.round(Math.round(ourPriority / 5) * 5);
    ourPriority = Math.max(0, Math.min(100, ourPriority));
    var mktValue = 100 - ourPriority;
    var m = modal(); if (!m) return;
    var slider = m.querySelector('.rangeslider-horizontal'); if (!slider) return;
    slider.setAttribute('aria-valuenow', String(mktValue));
    var px = Math.round(mktValue * 0.88 + 8);
    var fill = slider.querySelector('.rangeslider__fill');
    var handle = slider.querySelector('.rangeslider__handle');
    if (fill) fill.style.width = px + 'px';
    if (handle) handle.style.left = px + 'px';
    if (handle) {
      var r = handle.getBoundingClientRect();
      var eo = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      handle.dispatchEvent(new MouseEvent('mousedown', eo));
      handle.dispatchEvent(new MouseEvent('mousemove', eo));
      handle.dispatchEvent(new MouseEvent('mouseup', eo));
      handle.dispatchEvent(new MouseEvent('click', eo));
      handle.focus();
    }
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function step6_fillBriefing(briefing) {
    var editor = await waitFor(function() { var m = modal(); return m ? m.querySelector('.ql-editor') : null; }, 8000);
    if (!editor) throw new Error('Editor de briefing nao encontrado');
    var r = editor.getBoundingClientRect();
    var eo = { bubbles: true, cancelable: true, view: window, clientX: r.left + 10, clientY: r.top + 10 };
    editor.dispatchEvent(new MouseEvent('mousedown', eo));
    editor.dispatchEvent(new MouseEvent('mouseup', eo));
    editor.dispatchEvent(new MouseEvent('click', eo));
    editor.focus();
    await sleep(300);
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    var lines = briefing.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (i > 0) document.execCommand('insertParagraph', false, null);
      if (lines[i]) document.execCommand('insertText', false, lines[i]);
    }
    await sleep(500);
    if (!editor.textContent.trim() || editor.textContent.trim().length < 5) {
      editor.innerHTML = briefing.split('\n').map(function(l) { return '<div>' + (l || '<br>') + '</div>'; }).join('');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function step7_clickAvancar() {
    var m = modal();
    var btn = m ? Array.from(m.querySelectorAll('button')).find(function(b) { return b.textContent.trim().indexOf('Avan') === 0; }) : null;
    if (!btn) throw new Error('Botao Avancar nao encontrado');
    btn.click();
  }

  async function step8_clickCriar() {
    var btn = await waitFor(function() {
      var m = modal();
      return m ? Array.from(m.querySelectorAll('button')).find(function(b) { return b.textContent.trim() === 'Criar'; }) : null;
    }, 10000);
    if (!btn) throw new Error('Botao Criar nao encontrado');
    btn.click();
  }

  log('Content script carregado em ' + window.location.hostname);
})();
