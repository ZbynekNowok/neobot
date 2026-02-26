(function () {
  const POLL_INTERVAL_MS = 2000;
  const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];

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
  const banner = document.getElementById("seo-banner");
  const topicInput = document.getElementById("seo-topic");
  const generateBtn = document.getElementById("seo-generate-btn");
  const currentCard = document.getElementById("seo-current-card");
  const currentJobIdEl = document.getElementById("seo-current-jobid");
  const currentStatusEl = document.getElementById("seo-current-status");
  const progressContainer = document.getElementById("seo-progress-container");
  const progressBar = document.getElementById("seo-progress-bar");
  const progressText = document.getElementById("seo-progress-text");
  const currentResult = document.getElementById("seo-current-result");
  const resultText = document.getElementById("seo-result-text");
  const copyBtn = document.getElementById("seo-copy-btn");
  const publishBtn = document.getElementById("seo-publish-btn");
  const historyLoading = document.getElementById("seo-history-loading");
  const historyTbody = document.getElementById("seo-history-tbody");

  let stopPollingFn = null;
  let pollTimer = null; // For legacy fallback
  let currentJobId = null;

  function showBanner(text, isError) {
    banner.textContent = text;
    banner.className = "banner " + (isError ? "error" : "info");
    banner.style.display = "block";
  }

  function hideBanner() {
    banner.style.display = "none";
  }

  function setNav(activeSeo) {
    navChat.classList.toggle("active", !activeSeo);
    navSeo.classList.toggle("active", activeSeo);
    if (navSeoAudit) navSeoAudit.classList.toggle("active", false);
    if (navPublish) navPublish.classList.toggle("active", false);
    if (navDashboard) navDashboard.classList.toggle("active", false);
    if (navHistory) navHistory.classList.toggle("active", false);
    chatPanel.classList.toggle("active", !activeSeo);
    seoPanel.classList.toggle("active", activeSeo);
    if (seoAuditPanel) seoAuditPanel.classList.toggle("active", false);
    if (publishPanel) publishPanel.classList.toggle("active", false);
    if (dashboardPanel) dashboardPanel.classList.toggle("active", false);
    if (historyPanel) historyPanel.classList.toggle("active", false);
    if (activeSeo) loadHistory();
  }

  navChat.addEventListener("click", function (e) {
    e.preventDefault();
    setNav(false);
  });
  navSeo.addEventListener("click", function (e) {
    e.preventDefault();
    setNav(true);
  });

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("cs-CZ");
    } catch (_) {
      return iso;
    }
  }

  function statusClass(s) {
    return "seo-status " + (s || "").toLowerCase();
  }

  function apiGet(path) {
    return window.NeoBotAPI ? window.NeoBotAPI.apiGet(path) : Promise.reject(new Error("API není k dispozici"));
  }
  function apiPost(path, body) {
    return window.NeoBotAPI ? window.NeoBotAPI.apiPost(path, body) : Promise.reject(new Error("API není k dispozici"));
  }
  function addToHistory(type, input, output, status) {
    if (!window.NeoBotHistory) return;
    window.NeoBotHistory.addHistory({ type: type, input: input, output: output, status: status });
  }

  function stopPolling() {
    if (stopPollingFn) {
      stopPollingFn();
      stopPollingFn = null;
    }
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function updateProgress(progress) {
    if (!progressContainer || !progressBar || !progressText) return;
    var clamped = Math.min(100, Math.max(0, progress || 0));
    progressBar.style.width = clamped + "%";
    progressText.textContent = Math.round(clamped) + "%";
    progressContainer.style.display = "block";
  }

  function hideProgress() {
    if (progressContainer) progressContainer.style.display = "none";
  }

  function showCurrentJob(jobId, status, topic, progress) {
    currentJobId = jobId;
    currentCard.style.display = "block";
    currentJobIdEl.textContent = "Job ID: " + jobId;
    currentStatusEl.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + (status || "—") + "</span>";
    
    if (status === "completed" || status === "failed") {
      hideProgress();
      currentResult.style.display = status === "completed" ? "block" : "none";
      if (publishBtn) publishBtn.disabled = status !== "completed";
      if (status === "completed") loadResultIntoCurrent();
      else resultText.value = "";
    } else {
      updateProgress(progress || 0);
      currentResult.style.display = "none";
      if (publishBtn) publishBtn.disabled = true;
    }
  }

  async function loadResultIntoCurrent() {
    if (!currentJobId) return;
    try {
      // Try unified endpoint first (has result in job.result)
      if (window.JobPoller) {
        try {
          const unifiedData = await apiGet("api/jobs/" + encodeURIComponent(currentJobId));
          if (unifiedData && unifiedData.job && unifiedData.job.result && unifiedData.job.result.content) {
            resultText.value = unifiedData.job.result.content;
            return;
          }
        } catch (_) {
          // Fallback to legacy endpoint
        }
      }
      // Legacy endpoint fallback
      const data = await apiGet("api/seo/result/" + encodeURIComponent(currentJobId));
      resultText.value = (data && data.content) || "";
    } catch (_) {
      resultText.value = "";
    }
  }

  function startJobPolling(jobId) {
    if (!window.JobPoller || !window.JobPoller.startJobPolling) {
      console.warn("JobPoller not available, falling back to legacy polling");
      // Fallback to legacy polling if JobPoller not available
      pollTimer = setTimeout(function legacyPoll() {
        if (!currentJobId) return;
        apiGet("api/seo/status/" + encodeURIComponent(currentJobId))
          .then(function (data) {
            var status = (data && data.status) || "";
            currentStatusEl.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + status + "</span>";
            if (TERMINAL_STATUSES.includes(status)) {
              stopPolling();
              generateBtn.disabled = false;
              if (status === "completed") {
                currentResult.style.display = "block";
                loadResultIntoCurrent();
              }
              loadHistory();
              return;
            }
            pollTimer = setTimeout(legacyPoll, POLL_INTERVAL_MS);
          })
          .catch(function () {
            stopPolling();
            generateBtn.disabled = false;
            showBanner("Nelze načíst stav jobu.", true);
          });
      }, POLL_INTERVAL_MS);
      return;
    }

    stopPolling();

    stopPollingFn = window.JobPoller.startJobPolling(jobId, {
      onUpdate: function (job) {
        var status = job.status || "";
        var progress = job.progress || 0;
        
        currentStatusEl.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + status + "</span>";
        updateProgress(progress);
      },
      onCompleted: function (job) {
        stopPolling();
        generateBtn.disabled = false;
        showCurrentJob(jobId, "completed", null, 100);
        loadResultIntoCurrent();
        loadHistory();
        hideBanner();
      },
      onFailed: function (job) {
        stopPolling();
        generateBtn.disabled = false;
        var errorMsg = "Job failed";
        if (job && job.error && job.error.message) {
          errorMsg = job.error.message;
        } else if (job && job.error && typeof job.error === "string") {
          errorMsg = job.error;
        }
        showCurrentJob(jobId, "failed", null, 0);
        showBanner("Chyba: " + errorMsg, true);
        loadHistory();
      },
      timeoutMs: 120000,
      minDelayMs: 1000,
      maxDelayMs: 8000,
      backoffFactor: 1.5,
    });
  }

  generateBtn.addEventListener("click", async function () {
    const topic = (topicInput.value || "").trim();
    if (!topic) {
      showBanner("Zadejte téma článku.", true);
      return;
    }
    hideBanner();
    generateBtn.disabled = true;
    try {
      const data = await apiPost("api/seo/generate", { topic: topic });
      const jobId = data && data.jobId;
      if (jobId) {
        showCurrentJob(jobId, "queued", data.topic || topic, 0);
        currentResult.style.display = "none";
        resultText.value = "";
        addToHistory("seo_generate", { topic: topic }, { jobId: jobId }, "queued");
        loadHistory();
        startJobPolling(jobId);
      } else if (data && (data.content != null || data.article != null)) {
        const content = data.content || data.article || "";
        resultText.value = typeof content === "string" ? content : JSON.stringify(content);
        currentCard.style.display = "block";
        currentJobIdEl.textContent = "Výstup (přímý)";
        currentStatusEl.innerHTML = "Stav: <span class=\"" + statusClass("completed") + "\">completed</span>";
        currentResult.style.display = "block";
        addToHistory("seo_generate", { topic: topic }, { content: resultText.value }, "completed");
        loadHistory();
      } else {
        throw new Error("Server nevrátil jobId ani obsah.");
      }
    } catch (e) {
      showBanner((e && e.message) || "Chyba při vytváření jobu.", true);
      generateBtn.disabled = false;
    }
  });

  copyBtn.addEventListener("click", function () {
    const text = resultText.value;
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showBanner("Text zkopírován do schránky.", false);
          setTimeout(hideBanner, 2000);
        },
        function () { showBanner("Kopírování se nepovedlo.", true); }
      );
    } else {
      resultText.select();
      try {
        document.execCommand("copy");
        showBanner("Text zkopírován do schránky.", false);
        setTimeout(hideBanner, 2000);
      } catch (_) {
        showBanner("Kopírování se nepovedlo.", true);
      }
    }
  });

  if (publishBtn) {
    publishBtn.addEventListener("click", async function () {
      if (!currentJobId) return;
      hideBanner();
      publishBtn.disabled = true;
      try {
        const data = await apiPost("api/seo/article/" + encodeURIComponent(currentJobId) + "/publish", {});
        showBanner("Added to Publish Center" + (data && data.existing ? " (already exists)" : "") + ". <a href=\"#\" id=\"open-publish-link\" style=\"color:#7dd3fc;text-decoration:underline;\">Open Publish Center</a>", false);
        const link = document.getElementById("open-publish-link");
        if (link) {
          link.addEventListener("click", function (e) {
            e.preventDefault();
            if (navPublish) navPublish.click();
          });
        }
        setTimeout(hideBanner, 5000);
      } catch (e) {
        showBanner((e && e.message) || "Chyba při přidávání do Publish Center.", true);
      } finally {
        publishBtn.disabled = false;
      }
    });
  }

  async function loadHistory() {
    historyLoading.style.display = "block";
    historyTbody.innerHTML = "";
    try {
      const list = await apiGet("api/seo/list?limit=20");
      historyLoading.style.display = "none";
      if (!list || !Array.isArray(list) || !list.length) {
        historyTbody.innerHTML = "<tr><td colspan=\"4\">Žádná historie.</td></tr>";
        return;
      }
      list.forEach(function (row) {
        const tr = document.createElement("tr");
        tr.className = "clickable";
        const canCancel = row.status === "queued" || row.status === "processing";
        tr.innerHTML =
          "<td>" + formatDate(row.created_at) + "</td>" +
          "<td>" + escapeHtml(row.topic || "—") + "</td>" +
          "<td><span class=\"" + statusClass(row.status) + "\">" + escapeHtml(row.status || "—") + "</span></td>" +
          "<td class=\"actions\">" +
          "<button type=\"button\" class=\"secondary open-job\" data-job-id=\"" + escapeAttr(row.job_id) + "\">Open</button>" +
          (canCancel ? "<button type=\"button\" class=\"danger cancel-job\" data-job-id=\"" + escapeAttr(row.job_id) + "\">Cancel</button>" : "") +
          "</td>";
        tr.addEventListener("click", function (e) {
          if (e.target.closest("button")) return;
          openJob(row.job_id, row.status);
        });
        tr.querySelector(".open-job").addEventListener("click", function (e) {
          e.stopPropagation();
          openJob(row.job_id, row.status);
        });
        if (canCancel) {
          tr.querySelector(".cancel-job").addEventListener("click", function (e) {
            e.stopPropagation();
            cancelJob(row.job_id);
          });
        }
        historyTbody.appendChild(tr);
      });
    } catch (e) {
      historyLoading.style.display = "none";
      historyTbody.innerHTML = "<tr><td colspan=\"4\">Chyba: " + escapeHtml(e.message) + "</td></tr>";
    }
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function openJob(jobId, status) {
    showCurrentJob(jobId, status, null, 0);
    if (status === "completed") {
      currentResult.style.display = "block";
      await loadResultIntoCurrent();
    } else {
      currentResult.style.display = "none";
      if (!TERMINAL_STATUSES.includes(status)) {
        stopPolling();
        currentJobId = jobId;
        startJobPolling(jobId);
      }
    }
  }

  async function cancelJob(jobId) {
    try {
      await apiPost("api/seo/cancel/" + encodeURIComponent(jobId), {});
      if (currentJobId === jobId) {
        showCurrentJob(jobId, "cancelled");
        stopPolling();
        generateBtn.disabled = false;
      }
      loadHistory();
      hideBanner();
    } catch (e) {
      showBanner((e && e.message) || "Zrušení se nepovedlo.", true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (seoPanel.classList.contains("active")) loadHistory();
    });
  } else if (seoPanel.classList.contains("active")) {
    loadHistory();
  }
})();
