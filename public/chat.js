(function () {
  var messages = document.getElementById("messages");
  var input = document.getElementById("input");
  var sendBtn = document.getElementById("sendBtn");
  var threadList = document.getElementById("chat-thread-list");
  var newChatBtn = document.getElementById("chat-new-btn");
  var modeSelect = document.getElementById("chat-mode");

  var currentThreadId = null;
  var prefillMessage = null;

  function showChatPanel() {
    var allPanels = ["dashboard-panel", "chat-panel", "seo-panel", "seo-audit-panel", "publish-panel", "marketing-panel", "history-panel", "outputs-panel"];
    var allNavIds = ["nav-dashboard", "nav-chat", "nav-seo", "nav-seo-audit", "nav-publish", "nav-marketing", "nav-history", "nav-outputs"];
    allPanels.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "chat-panel");
    });
    allNavIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "nav-chat");
    });
  }

  function addMessage(text, who) {
    var div = document.createElement("div");
    div.className = "msg " + (who === "user" ? "user" : "bot");
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showError(msg) {
    addMessage("Chyba: " + msg, "bot");
  }

  function loadThreads() {
    if (!window.NeoBotAPI || !threadList) return;
    NeoBotAPI.apiGet("api/chat/threads")
      .then(function (data) {
        if (!data.threads) return;
        threadList.innerHTML = "";
        data.threads.forEach(function (t) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chat-thread-item" + (t.id === currentThreadId ? " active" : "");
          btn.textContent = (t.title || "(bez názvu)").slice(0, 36);
          btn.dataset.threadId = t.id;
          btn.addEventListener("click", function () {
            selectThread(t.id);
          });
          threadList.appendChild(btn);
        });
      })
      .catch(function () {});
  }

  function selectThread(threadId) {
    currentThreadId = threadId;
    loadThreadList();
    loadMessages(threadId);
  }

  function loadMessages(threadId) {
    if (!window.NeoBotAPI || !messages) return;
    messages.innerHTML = "";
    addMessage("Načítám…", "bot");
    NeoBotAPI.apiGet("api/chat/threads/" + encodeURIComponent(threadId))
      .then(function (data) {
        messages.innerHTML = "";
        if (!data.messages || data.messages.length === 0) {
          addMessage("Žádné zprávy. Napiš první zprávu.", "bot");
          return;
        }
        data.messages.forEach(function (m) {
          addMessage(m.content, m.role === "user" ? "user" : "bot");
        });
        messages.scrollTop = messages.scrollHeight;
      })
      .catch(function (err) {
        messages.innerHTML = "";
        showError(err && err.message ? err.message : "Nelze načíst vlákno.");
      });
  }

  function loadThreadList() {
    loadThreads();
  }

  function send() {
    var text = (prefillMessage || input.value || "").trim();
    if (prefillMessage) {
      input.value = prefillMessage;
      prefillMessage = null;
    }
    if (!text) return;

    input.value = "";
    addMessage(text, "user");
    var loadingEl = addMessage("Odpovídám…", "bot");
    sendBtn.disabled = true;
    input.disabled = true;

    var mode = (modeSelect && modeSelect.value) || "marketing";
    var body = { mode: mode, message: text };
    if (currentThreadId) body.threadId = currentThreadId;

    NeoBotAPI.apiPost("api/chat", body)
      .then(function (data) {
        loadingEl.remove();
        if (data.reply) addMessage(data.reply, "bot");
        if (data.threadId && !currentThreadId) {
          currentThreadId = data.threadId;
          loadThreadList();
        }
        messages.scrollTop = messages.scrollHeight;
      })
      .catch(function (err) {
        loadingEl.remove();
        var msg = (err && err.message) ? err.message : "Chyba";
        if (err && err.status === 401) msg = "Neplatný nebo chybějící API klíč. Nastav ho v Dashboardu.";
        if (err && err.status === 402) msg = "Překročen měsíční limit (usage).";
        if (err && err.status === 429) msg = "Příliš mnoho zpráv. Zkus za chvíli.";
        showError(msg);
      })
      .then(function () {
        sendBtn.disabled = false;
        input.disabled = false;
        if (input) input.focus();
      });
  }

  function startNewChat() {
    currentThreadId = null;
    messages.innerHTML = "";
    addMessage("Nový chat. Napiš zprávu (režim: " + (modeSelect ? modeSelect.value : "marketing") + ").", "bot");
    loadThreadList();
  }

  if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);
  if (sendBtn) sendBtn.addEventListener("click", send);
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") send();
    });
  }

  var navChat = document.getElementById("nav-chat");
  if (navChat) {
    navChat.addEventListener("click", function (e) {
      e.preventDefault();
      showChatPanel();
      loadThreadList();
      if (!currentThreadId) {
        messages.innerHTML = "";
        addMessage("Vyber vlákno vlevo nebo klikni na „Nový chat“.", "bot");
      }
    });
  }

  window.NeoBotChatOpenWithPrefill = function (prefill) {
    if (typeof prefill === "string" && prefill) prefillMessage = prefill;
    showChatPanel();
    startNewChat();
    if (prefillMessage) {
      input.value = prefillMessage;
      input.focus();
    }
  };

  messages.innerHTML = "";
  addMessage("Vyber vlákno vlevo nebo vytvoř Nový chat.", "bot");
})();
