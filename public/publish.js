(function () {
  const banner = document.getElementById("publish-banner");
  const wpConnectForm = document.getElementById("wp-connect-form");
  const wpConnected = document.getElementById("wp-connected");
  const wpConnectedInfo = document.getElementById("wp-connected-info");
  const wpBaseUrl = document.getElementById("wp-base-url");
  const wpUsername = document.getElementById("wp-username");
  const wpAppPassword = document.getElementById("wp-app-password");
  const wpConnectBtn = document.getElementById("wp-connect-btn");
  const wpDisconnectBtn = document.getElementById("wp-disconnect-btn");
  const listLoading = document.getElementById("publish-list-loading");
  const listTbody = document.getElementById("publish-list-tbody");
  const navChat = document.getElementById("nav-chat");
  const navSeo = document.getElementById("nav-seo");
  const navSeoAudit = document.getElementById("nav-seo-audit");
  const navPublish = document.getElementById("nav-publish");
  const navDashboard = document.getElementById("nav-dashboard");
  const navHistory = document.getElementById("nav-history");
  const chatPanel = document.getElementById("chat-panel");
  const seoPanel = document.getElementById("seo-panel");
  const seoAuditPanel = document.getElementById("seo-audit-panel");
  const publishPanel = document.getElementById("publish-panel");
  const dashboardPanel = document.getElementById("dashboard-panel");
  const historyPanel = document.getElementById("history-panel");

  function showBanner(text, isError) {
    if (!banner) return;
    banner.textContent = text;
    banner.className = "banner " + (isError ? "error" : "info");
    banner.style.display = "block";
  }

  function hideBanner() {
    if (banner) banner.style.display = "none";
  }

  function setPublishNav() {
    if (navChat) navChat.classList.remove("active");
    if (navSeo) navSeo.classList.remove("active");
    if (navSeoAudit) navSeoAudit.classList.remove("active");
    if (navPublish) navPublish.classList.add("active");
    if (navDashboard) navDashboard.classList.remove("active");
    if (navHistory) navHistory.classList.remove("active");
    if (chatPanel) chatPanel.classList.remove("active");
    if (seoPanel) seoPanel.classList.remove("active");
    if (seoAuditPanel) seoAuditPanel.classList.remove("active");
    if (publishPanel) publishPanel.classList.add("active");
    if (dashboardPanel) dashboardPanel.classList.remove("active");
    if (historyPanel) historyPanel.classList.remove("active");
    loadTargets();
    loadPublishList();
  }

  if (navPublish) {
    navPublish.addEventListener("click", function (e) {
      e.preventDefault();
      setPublishNav();
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("cs-CZ");
    } catch (_) {
      return iso;
    }
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function statusClass(s) {
    return "seo-status " + (String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "_") || "unknown");
  }

  function apiGet(path) {
    return window.NeoBotAPI ? window.NeoBotAPI.apiGet(path) : Promise.reject(new Error("API není k dispozici"));
  }
  function apiPost(path, body) {
    return window.NeoBotAPI ? window.NeoBotAPI.apiPost(path, body) : Promise.reject(new Error("API není k dispozici"));
  }
  function apiDelete(path) {
    return window.NeoBotAPI ? window.NeoBotAPI.apiDelete(path) : Promise.reject(new Error("API není k dispozici"));
  }
  function addToHistory(type, input, output, status) {
    if (!window.NeoBotHistory) return;
    window.NeoBotHistory.addHistory({ type: type, input: input, output: output, status: status });
  }

  async function loadTargets() {
    try {
      var list = await apiGet("api/publish/targets");
      var wp = list && list.find(function (t) { return t.platform === "wordpress"; });
      if (wpConnectForm) wpConnectForm.style.display = wp ? "none" : "block";
      if (wpConnected) wpConnected.style.display = wp ? "block" : "none";
      if (wpConnectedInfo && wp) wpConnectedInfo.textContent = wp.base_url + " (" + escapeHtml(wp.username || "") + ")";
    } catch (e) {
      if (wpConnectForm) wpConnectForm.style.display = "block";
      if (wpConnected) wpConnected.style.display = "none";
      if (e && e.message && e.message.indexOf("503") !== -1) {
        showBanner("Připojení k platformám není k dispozici (chybí konfigurace).", true);
      }
    }
  }

  if (wpConnectBtn) {
    wpConnectBtn.addEventListener("click", async function () {
      var baseUrl = wpBaseUrl && wpBaseUrl.value ? wpBaseUrl.value.trim() : "";
      var username = wpUsername && wpUsername.value ? wpUsername.value.trim() : "";
      var appPassword = wpAppPassword && wpAppPassword.value ? wpAppPassword.value : "";
      if (!baseUrl || !username || !appPassword) {
        showBanner("Vyplňte Base URL, Username a Application Password.", true);
        return;
      }
      hideBanner();
      wpConnectBtn.disabled = true;
      try {
        await apiPost("api/publish/targets/wordpress", { baseUrl: baseUrl, username: username, appPassword: appPassword });
        showBanner("WordPress připojeno.", false);
        setTimeout(hideBanner, 3000);
        if (wpAppPassword) wpAppPassword.value = "";
        addToHistory("publish", { channel: "wordpress", baseUrl: baseUrl }, { connected: true }, "connected");
        loadTargets();
      } catch (e) {
        showBanner(e.message || "Připojení se nepovedlo.", true);
      } finally {
        wpConnectBtn.disabled = false;
      }
    });
  }

  if (wpDisconnectBtn) {
    wpDisconnectBtn.addEventListener("click", async function () {
      hideBanner();
      wpDisconnectBtn.disabled = true;
      try {
        await apiDelete("api/publish/targets/wordpress");
        loadTargets();
      } catch (e) {
        showBanner(e.message || "Odpojení se nepovedlo.", true);
      } finally {
        wpDisconnectBtn.disabled = false;
      }
    });
  }

  async function loadPublishList() {
    if (!listTbody) return;
    if (listLoading) listLoading.style.display = "block";
    listTbody.innerHTML = "";
    try {
      var list = await apiGet("api/publish/list?limit=20");
      if (listLoading) listLoading.style.display = "none";
      if (!list || !Array.isArray(list) || !list.length) {
        listTbody.innerHTML = "<tr><td colspan=\"5\">Žádné akce.</td></tr>";
        return;
      }
      list.forEach(function (row) {
        var result = null;
        if (row.result_json) {
          try {
            result = JSON.parse(row.result_json);
          } catch (_) {}
        }
        var resultCell = "—";
        if (result && result.remoteUrl) {
          resultCell = "<a href=\"" + escapeHtml(result.remoteUrl) + "\" target=\"_blank\" rel=\"noopener\">Open draft</a>";
        } else if (result && result.remoteId) {
          resultCell = "ID " + escapeHtml(String(result.remoteId));
        }
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + formatDate(row.created_at) + "</td>" +
          "<td>" + escapeHtml(row.target_platform || "—") + "</td>" +
          "<td>" + escapeHtml(row.entity_type || "") + " / " + escapeHtml(row.entity_id || "") + "</td>" +
          "<td><span class=\"" + statusClass(row.status) + "\">" + escapeHtml(row.status || "—") + "</span></td>" +
          "<td>" + resultCell + "</td>";
        listTbody.appendChild(tr);
      });
    } catch (e) {
      if (listLoading) listLoading.style.display = "none";
      listTbody.innerHTML = "<tr><td colspan=\"5\">Chyba: " + escapeHtml(e.message) + "</td></tr>";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (publishPanel && publishPanel.classList.contains("active")) {
        loadTargets();
        loadPublishList();
      }
    });
  } else if (publishPanel && publishPanel.classList.contains("active")) {
    loadTargets();
    loadPublishList();
  }
})();
