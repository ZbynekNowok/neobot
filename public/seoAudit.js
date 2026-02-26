(function () {
  const POLL_INTERVAL_MS = 2000;
  const TERMINAL_STATUSES = ["completed", "failed", "blocked_by_robots"];

  const navChat = document.getElementById("nav-chat");
  const navSeo = document.getElementById("nav-seo");
  const navSeoAudit = document.getElementById("nav-seo-audit");
  const navPublish = document.getElementById("nav-publish");
  const navDashboard = document.getElementById("nav-dashboard");
  const navHistory = document.getElementById("nav-history");
  const chatPanel = document.getElementById("chat-panel");
  const seoPanel = document.getElementById("seo-panel");
  const auditPanel = document.getElementById("seo-audit-panel");
  const publishPanel = document.getElementById("publish-panel");
  const dashboardPanel = document.getElementById("dashboard-panel");
  const historyPanel = document.getElementById("history-panel");
  const banner = document.getElementById("audit-banner");
  const urlInput = document.getElementById("audit-url");
  const maxPagesInput = document.getElementById("audit-max-pages");
  const startBtn = document.getElementById("audit-start-btn");
  const currentCard = document.getElementById("audit-current-card");
  const jobIdEl = document.getElementById("audit-job-id");
  const statusLine = document.getElementById("audit-status-line");
  const pagesLine = document.getElementById("audit-pages-line");
  const progressContainer = document.getElementById("audit-progress-container");
  const progressBar = document.getElementById("audit-progress-bar");
  const progressText = document.getElementById("audit-progress-text");
  const resultWrap = document.getElementById("audit-result-wrap");
  const historyLoading = document.getElementById("audit-history-loading");
  const historyTbody = document.getElementById("audit-history-tbody");

  let stopPollingFn = null;
  let pollTimer = null; // For legacy fallback
  let currentJobId = null;

  function showBanner(text, isError) {
    if (!banner) return;
    banner.textContent = text;
    banner.className = "banner " + (isError ? "error" : "info");
    banner.style.display = "block";
  }

  function hideBanner() {
    if (banner) banner.style.display = "none";
  }

  function setAuditNav() {
    if (navChat) navChat.classList.remove("active");
    if (navSeo) navSeo.classList.remove("active");
    if (navSeoAudit) navSeoAudit.classList.add("active");
    if (navPublish) navPublish.classList.remove("active");
    if (navDashboard) navDashboard.classList.remove("active");
    if (navHistory) navHistory.classList.remove("active");
    if (chatPanel) chatPanel.classList.remove("active");
    if (seoPanel) seoPanel.classList.remove("active");
    if (auditPanel) auditPanel.classList.add("active");
    if (publishPanel) publishPanel.classList.remove("active");
    if (dashboardPanel) dashboardPanel.classList.remove("active");
    if (historyPanel) historyPanel.classList.remove("active");
    loadAuditHistory();
  }

  if (navSeoAudit) {
    navSeoAudit.addEventListener("click", function (e) {
      e.preventDefault();
      setAuditNav();
    });
  }

  function statusClass(s) {
    const c = (s || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    return "seo-status " + (c || "unknown");
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
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
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

  function showCurrentAudit(jobId, status, pagesCrawled, progress) {
    currentJobId = jobId;
    if (!currentCard) return;
    currentCard.style.display = "block";
    if (jobIdEl) jobIdEl.textContent = "Job ID: " + jobId;
    if (statusLine) {
      statusLine.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + escapeHtml(status || "—") + "</span>";
    }
    if (pagesLine) pagesLine.textContent = "Stránek: " + (pagesCrawled != null ? pagesCrawled : "—");
    
    if (TERMINAL_STATUSES.indexOf(status) !== -1) {
      hideProgress();
      resultWrap.style.display = "block";
      if (status === "blocked_by_robots") {
        resultWrap.innerHTML = "<p class=\"banner error\">Web blokuje crawling (robots.txt). Načítám detail…</p>";
        loadAuditResult();
      } else if (status === "completed") {
        loadAuditResult();
      } else {
        resultWrap.innerHTML = "<p>Audit skončil se stavem: " + escapeHtml(status) + "</p>";
      }
    } else {
      updateProgress(progress || 0);
      resultWrap.style.display = "none";
    }
  }

  function renderReport(report) {
    if (!report) return "";
    let html = "";
    if (report.blocked_by_robots && report.message) {
      return "<p class=\"banner error\">" + escapeHtml(report.message) + "</p>";
    }
    if (report.issues && report.issues.length > 0) {
      html += "<section><h4>Problémy</h4><ul>";
      report.issues.forEach(function (i) {
        html += "<li class=\"issue\"><strong>" + escapeHtml(i.severity || "") + "</strong>: " + escapeHtml(i.message || "") + (i.urls && i.urls.length ? " (" + escapeHtml(i.urls.slice(0, 2).join(", ")) + ")" : "") + "</li>";
      });
      html += "</ul></section>";
    }
    if (report.quick_wins && report.quick_wins.length > 0) {
      html += "<section><h4>Rychlé úpravy</h4><ul>";
      report.quick_wins.forEach(function (w) {
        html += "<li>" + escapeHtml(w) + "</li>";
      });
      html += "</ul></section>";
    }
    if (report.recommendations && report.recommendations.length > 0) {
      html += "<section><h4>Doporučení</h4><ul>";
      report.recommendations.forEach(function (r) {
        html += "<li>" + escapeHtml(r) + "</li>";
      });
      html += "</ul></section>";
    }
    if (report.content_plan && report.content_plan.length > 0) {
      html += "<section><h4>Content plán (články)</h4><ul>";
      report.content_plan.forEach(function (c) {
        html += "<li class=\"issue\"><strong>" + escapeHtml(c.title || "") + "</strong><br>Intent: " + escapeHtml(c.intent || "") + (c.outline_h2 && c.outline_h2.length ? "<br>H2: " + escapeHtml(c.outline_h2.join(", ")) : "") + (c.cta ? "<br>CTA: " + escapeHtml(c.cta) : "") + "</li>";
      });
      html += "</ul></section>";
    }
    if (report.suggested_fixes && report.suggested_fixes.length > 0) {
      html += "<section><h4>Návrhy title/meta (top stránky)</h4><ul>";
      report.suggested_fixes.forEach(function (f, idx) {
        const fixId = "fix-" + (currentJobId || "") + "-" + idx;
        html += "<li class=\"fix-row\"><strong>URL:</strong> " + escapeHtml(f.url || "") + "<br><strong>Title:</strong> " + escapeHtml(f.suggested_title || "") + "<br><strong>Meta:</strong> " + escapeHtml(f.suggested_meta_description || "") + "<br><button type=\"button\" class=\"secondary send-fix-btn\" data-fix-id=\"" + escapeHtml(fixId) + "\" data-page-url=\"" + escapeHtml(f.url || "") + "\" style=\"margin-top:8px;\">Send Fix to Publish Center</button></li>";
      });
      html += "</ul></section>";
    }
    return html || "<p>Žádná data v reportu.</p>";
  }

  async function loadAuditResult() {
    if (!currentJobId) return;
    try {
      // Try unified endpoint first (has result in job.result)
      var report = null;
      if (window.JobPoller) {
        try {
          const unifiedData = await apiGet("api/jobs/" + encodeURIComponent(currentJobId));
          if (unifiedData && unifiedData.job && unifiedData.job.result && unifiedData.job.result.report) {
            report = unifiedData.job.result.report;
          }
        } catch (_) {
          // Fallback to legacy endpoint
        }
      }
      
      // Legacy endpoint fallback
      if (!report) {
        const data = await apiGet("api/seo/audit/result/" + encodeURIComponent(currentJobId));
        report = data && data.report;
      }
      
      resultWrap.style.display = "block";
      resultWrap.innerHTML = renderReport(report);
      const sendFixBtns = resultWrap.querySelectorAll(".send-fix-btn");
      sendFixBtns.forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const pageUrl = btn.getAttribute("data-page-url");
          if (!pageUrl || !currentJobId) return;
          hideBanner();
          btn.disabled = true;
          try {
            const result = await apiPost("api/seo/audit/" + encodeURIComponent(currentJobId) + "/fix/publish", { pageUrl: pageUrl });
            showBanner("Fix added to Publish Center" + (result.existing ? " (already exists)" : "") + ". <a href=\"#\" id=\"open-publish-link-audit\" style=\"color:#7dd3fc;text-decoration:underline;\">Open Publish Center</a>", false);
            const link = document.getElementById("open-publish-link-audit");
            if (link) {
              link.addEventListener("click", function (e) {
                e.preventDefault();
                if (navPublish) navPublish.click();
              });
            }
            setTimeout(hideBanner, 5000);
          } catch (e) {
            showBanner(e.message || "Chyba při přidávání fixu do Publish Center.", true);
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (_) {
      resultWrap.innerHTML = "<p>Nepodařilo načíst výsledek.</p>";
    }
  }

  function startJobPolling(jobId) {
    if (!window.JobPoller || !window.JobPoller.startJobPolling) {
      console.warn("JobPoller not available, falling back to legacy polling");
      // Fallback to legacy polling if JobPoller not available
      stopPolling(); // Clear any existing polling
      pollTimer = setTimeout(function legacyPoll() {
        if (!currentJobId) return;
        apiGet("api/seo/audit/status/" + encodeURIComponent(currentJobId))
          .then(function (data) {
            var status = (data && data.status) || "";
            if (statusLine) {
              statusLine.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + escapeHtml(status) + "</span>";
            }
            if (pagesLine) {
              pagesLine.textContent = "Stránek: " + (data && data.pages_crawled != null ? data.pages_crawled : "—");
            }
            if (TERMINAL_STATUSES.indexOf(status) !== -1) {
              stopPolling();
              startBtn.disabled = false;
              showCurrentAudit(currentJobId, status, data && data.pages_crawled);
              loadAuditHistory();
              return;
            }
            pollTimer = setTimeout(legacyPoll, POLL_INTERVAL_MS);
          })
          .catch(function () {
            stopPolling();
            startBtn.disabled = false;
            showBanner("Nelze načíst stav auditu.", true);
          });
      }, POLL_INTERVAL_MS);
      stopPollingFn = function () {
        if (pollTimer) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
      };
      return;
    }

    stopPolling(); // Clear any existing polling

    stopPolling();

    stopPollingFn = window.JobPoller.startJobPolling(jobId, {
      onUpdate: function (job) {
        var status = job.status || "";
        var progress = job.progress || 0;
        var pagesCrawled = null;
        
        // Extract pages_crawled from job.data if available
        if (job.data && job.data.pages_crawled != null) {
          pagesCrawled = job.data.pages_crawled;
        }
        
        if (statusLine) {
          statusLine.innerHTML = "Stav: <span class=\"" + statusClass(status) + "\">" + escapeHtml(status) + "</span>";
        }
        if (pagesLine && pagesCrawled != null) {
          pagesLine.textContent = "Stránek: " + pagesCrawled;
        }
        updateProgress(progress);
      },
      onCompleted: function (job) {
        stopPolling();
        startBtn.disabled = false;
        var pagesCrawled = null;
        if (job.data && job.data.pages_crawled != null) {
          pagesCrawled = job.data.pages_crawled;
        }
        showCurrentAudit(jobId, "completed", pagesCrawled, 100);
        loadAuditResult();
        loadAuditHistory();
        hideBanner();
      },
      onFailed: function (job) {
        stopPolling();
        startBtn.disabled = false;
        var errorMsg = "Audit failed";
        if (job && job.error && job.error.message) {
          errorMsg = job.error.message;
        } else if (job && job.error && typeof job.error === "string") {
          errorMsg = job.error;
        }
        showCurrentAudit(jobId, "failed", null, 0);
        showBanner("Chyba: " + errorMsg, true);
        loadAuditHistory();
      },
      timeoutMs: 300000, // 5 minutes for audit (longer than SEO generate)
      minDelayMs: 1000,
      maxDelayMs: 8000,
      backoffFactor: 1.5,
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", async function () {
      const url = (urlInput && urlInput.value) ? urlInput.value.trim() : "";
      if (!url) {
        showBanner("Zadejte URL webu.", true);
        return;
      }
      hideBanner();
      startBtn.disabled = true;
      try {
        const maxPages = maxPagesInput ? Math.min(50, Math.max(1, parseInt(maxPagesInput.value, 10) || 25)) : 25;
        const data = await apiPost("api/seo/audit", { url: url, maxPages: maxPages });
        const jobId = data && data.jobId;
        if (!jobId) throw new Error("Server nevrátil jobId.");
        showCurrentAudit(jobId, "queued", 0, 0);
        resultWrap.style.display = "none";
        addToHistory("seo_audit", { url: url, maxPages: maxPages }, { jobId: jobId }, "queued");
        loadAuditHistory();
        startJobPolling(jobId);
      } catch (e) {
        showBanner((e && e.message) || "Chyba při spuštění auditu.", true);
        startBtn.disabled = false;
      }
    });
  }

  async function loadAuditHistory() {
    if (!historyTbody) return;
    if (historyLoading) historyLoading.style.display = "block";
    historyTbody.innerHTML = "";
    try {
      const list = await apiGet("api/seo/audit/list?limit=20");
      if (historyLoading) historyLoading.style.display = "none";
      if (!list || !Array.isArray(list) || !list.length) {
        historyTbody.innerHTML = "<tr><td colspan=\"5\">Žádná historie.</td></tr>";
        return;
      }
      list.forEach(function (row) {
        const tr = document.createElement("tr");
        tr.className = "clickable";
        tr.innerHTML =
          "<td>" + formatDate(row.created_at) + "</td>" +
          "<td>" + escapeHtml((row.base_url || "").slice(0, 50)) + "</td>" +
          "<td><span class=\"" + statusClass(row.status) + "\">" + escapeHtml(row.status || "—") + "</span></td>" +
          "<td>" + (row.pages_crawled != null ? row.pages_crawled : "—") + "</td>" +
          "<td><button type=\"button\" class=\"secondary open-audit\" data-job-id=\"" + escapeHtml(row.job_id) + "\">Open</button></td>";
        tr.addEventListener("click", function (e) {
          if (e.target.closest("button")) return;
          openAudit(row.job_id, row.status, row.pages_crawled);
        });
        var openBtn = tr.querySelector(".open-audit");
        if (openBtn) {
          openBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            openAudit(row.job_id, row.status, row.pages_crawled);
          });
        }
        historyTbody.appendChild(tr);
      });
    } catch (e) {
      if (historyLoading) historyLoading.style.display = "none";
      historyTbody.innerHTML = "<tr><td colspan=\"5\">Chyba: " + escapeHtml(e.message) + "</td></tr>";
    }
  }

  function openAudit(jobId, status, pagesCrawled) {
    currentJobId = jobId;
    showCurrentAudit(jobId, status, pagesCrawled, 0);
    if (status === "completed" || status === "blocked_by_robots") {
      loadAuditResult();
    } else if (TERMINAL_STATUSES.indexOf(status) === -1) {
      stopPolling();
      startJobPolling(jobId);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (auditPanel && auditPanel.classList.contains("active")) loadAuditHistory();
    });
  } else if (auditPanel && auditPanel.classList.contains("active")) {
    loadAuditHistory();
  }
})();
