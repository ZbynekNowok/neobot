(function () {
  var listEl = document.getElementById("history-list");
  var modal = document.getElementById("history-modal");
  var detailBody = document.getElementById("history-detail-body");
  var copyBtn = document.getElementById("history-copy-json");
  var downloadBtn = document.getElementById("history-download-json");
  var closeBtn = document.getElementById("history-modal-close");
  var navHistory = document.getElementById("nav-history");
  var historyPanel = document.getElementById("history-panel");
  var currentDetailItem = null;
  
  // Job status cache and polling
  var jobStatusCache = {}; // jobId -> { status, progress, result, error, lastUpdate }
  var pollingTimers = {}; // jobId -> timer
  var pollingQueue = []; // Queue of jobIds to poll
  var activePolling = 0; // Number of active poll requests
  var MAX_CONCURRENT_POLLS = 3;
  var POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  var POLL_INTERVAL_BASE = 2000; // 2 seconds base
  var POLL_INTERVAL_MAX = 8000; // 8 seconds max

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function typeLabel(type) {
    if (type === "seo_generate") return "SEO článek";
    if (type === "seo_audit") return "SEO audit";
    if (type === "publish") return "Publish";
    return type || "—";
  }

  function shortDesc(item) {
    if (item.type === "seo_generate" && item.input && item.input.topic) return item.input.topic;
    if (item.type === "seo_audit" && item.input && item.input.url) return item.input.url;
    if (item.type === "publish" && item.input) return (item.input.channel || "publish") + " – " + (item.input.content || "").slice(0, 30);
    return (item.output && item.output.jobId) || item.jobId || item.id || "—";
  }

  function getJobId(item) {
    return (item.output && item.output.jobId) || item.jobId || null;
  }

  function statusClass(status) {
    if (!status) return "status-unknown";
    var s = String(status).toLowerCase();
    if (s === "queued") return "status-queued";
    if (s === "active") return "status-active";
    if (s === "completed") return "status-completed";
    if (s === "failed") return "status-failed";
    if (s === "not_found" || s === "not found") return "status-not-found";
    if (s === "offline") return "status-offline";
    return "status-unknown";
  }

  function statusLabel(status) {
    if (!status) return "—";
    var s = String(status).toLowerCase();
    if (s === "queued") return "Čeká";
    if (s === "active") return "Zpracovává se";
    if (s === "completed") return "Dokončeno";
    if (s === "failed") return "Chyba";
    if (s === "not_found" || s === "not found") return "Nenalezeno";
    if (s === "offline") return "Offline";
    return status;
  }

  function fetchJobStatus(jobId, callback) {
    if (!window.NeoBotAPI) {
      if (callback) callback({ error: "API not available" });
      return;
    }
    
    activePolling++;
    window.NeoBotAPI.apiGet("api/jobs/" + encodeURIComponent(jobId))
      .then(function (data) {
        activePolling--;
        if (data && data.ok && data.job) {
          var job = data.job;
          var cached = jobStatusCache[jobId] || {};
          var oldStatus = cached.status;
          var oldProgress = cached.progress;
          
          jobStatusCache[jobId] = {
            status: job.status,
            progress: job.progress || 0,
            result: job.result,
            error: job.error,
            lastUpdate: Date.now(),
            attempt: cached.attempt || 0,
          };
          
          // Update UI if status or progress changed
          if (oldStatus !== job.status || oldProgress !== (job.progress || 0)) {
            renderList();
          }
          
          // Stop polling if job completed/failed
          if (job.status === "completed" || job.status === "failed") {
            if (pollingTimers[jobId]) {
              clearTimeout(pollingTimers[jobId]);
              delete pollingTimers[jobId];
            }
            var queueIdx = pollingQueue.indexOf(jobId);
            if (queueIdx !== -1) {
              pollingQueue.splice(queueIdx, 1);
            }
          }
          
          if (callback) callback(null, job);
        } else {
          if (callback) callback({ error: "Invalid response" });
        }
        processPollQueue();
      })
      .catch(function (err) {
        activePolling--;
        var errorStatus = "offline";
        if (err && err.status === 404) {
          errorStatus = "not_found";
        }
        var cached = jobStatusCache[jobId] || {};
        jobStatusCache[jobId] = {
          status: errorStatus,
          progress: cached.progress || 0,
          result: cached.result,
          error: err && err.message ? { message: err.message } : null,
          lastUpdate: Date.now(),
          attempt: cached.attempt || 0,
        };
        if (callback) callback(err);
        processPollQueue();
      });
  }

  function processPollQueue() {
    if (activePolling >= MAX_CONCURRENT_POLLS || pollingQueue.length === 0) return;
    
    var jobId = pollingQueue.shift();
    fetchJobStatus(jobId, function (err, job) {
      if (!err && job) {
        renderList(); // Update UI
        schedulePoll(jobId, job.status);
      }
    });
  }

  function schedulePoll(jobId, status) {
    // Stop existing polling for this job
    if (pollingTimers[jobId]) {
      clearTimeout(pollingTimers[jobId]);
      delete pollingTimers[jobId];
    }

    // Only poll queued/active jobs
    if (status !== "queued" && status !== "active") {
      return;
    }

    // Check if panel is visible
    if (!historyPanel || !historyPanel.classList.contains("active")) {
      return;
    }

    // Check timeout
    var cached = jobStatusCache[jobId];
    if (cached && cached.lastUpdate) {
      var age = Date.now() - cached.lastUpdate;
      if (age > POLL_TIMEOUT_MS) {
        // Timeout - stop polling but keep status
        return;
      }
    }

    // Calculate delay with exponential backoff
    var attempt = (cached && cached.attempt) || 0;
    var delay = Math.min(POLL_INTERVAL_BASE * Math.pow(1.5, attempt), POLL_INTERVAL_MAX);
    
    // Update attempt counter
    if (cached) {
      cached.attempt = attempt + 1;
    }
    
    pollingTimers[jobId] = setTimeout(function () {
      delete pollingTimers[jobId];
      if (pollingQueue.indexOf(jobId) === -1) {
        pollingQueue.push(jobId);
      }
      processPollQueue();
    }, delay);
  }

  function startPollingForJobs() {
    if (!window.NeoBotHistory || !window.NeoBotAPI) return;
    if (!historyPanel || !historyPanel.classList.contains("active")) return;
    
    var list = NeoBotHistory.loadHistory();
    var jobsToPoll = [];
    
    list.forEach(function (item) {
      var jobId = getJobId(item);
      if (!jobId) return;
      
      var cached = jobStatusCache[jobId];
      if (!cached) {
        // First time - fetch immediately
        jobsToPoll.push(jobId);
      } else if (cached.status === "queued" || cached.status === "active") {
        // Check timeout
        if (cached.lastUpdate) {
          var age = Date.now() - cached.lastUpdate;
          if (age > POLL_TIMEOUT_MS) {
            // Timeout - don't poll
            return;
          }
        }
        // Already polling or needs polling
        if (pollingQueue.indexOf(jobId) === -1 && !pollingTimers[jobId]) {
          jobsToPoll.push(jobId);
        }
      }
    });
    
    // Add to queue
    jobsToPoll.forEach(function (jobId) {
      if (pollingQueue.indexOf(jobId) === -1) {
        pollingQueue.push(jobId);
      }
    });
    
    // Process queue
    processPollQueue();
  }

  function renderList() {
    if (!listEl || !window.NeoBotHistory) return;
    var list = NeoBotHistory.loadHistory();
    if (list.length === 0) {
      listEl.innerHTML = "<p style='color:#94a3b8;'>Žádná historie.</p>";
      return;
    }
    
    listEl.innerHTML = list.map(function (item) {
      var ts = item.timestamp ? new Date(item.timestamp).toLocaleString("cs-CZ") : "—";
      var jobId = getJobId(item);
      var cached = jobId ? jobStatusCache[jobId] : null;
      var status = cached ? cached.status : (item.status || null);
      var progress = cached ? cached.progress : null;
      var isLocalOnly = !jobId;
      
      var statusHtml = "";
      var progressHtml = "";
      
      if (isLocalOnly) {
        statusHtml = "<span class='status-badge status-local-only' style='display:inline-block;padding:2px 8px;border-radius:4px;background:#422006;color:#fcd34d;font-size:11px;margin-left:8px;'>Local only</span>";
      } else if (status) {
        statusHtml = "<span class='status-badge " + statusClass(status) + "' style='display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:8px;" +
          (status === "queued" ? "background:#422006;color:#fcd34d;" : "") +
          (status === "active" ? "background:#1e3a8a33;color:#93c5fd;" : "") +
          (status === "completed" ? "background:#14532d;color:#86efac;" : "") +
          (status === "failed" ? "background:#450a0a;color:#fca5a5;" : "") +
          (status === "not_found" ? "background:#450a0a;color:#fca5a5;" : "") +
          (status === "offline" ? "background:#422006;color:#fcd34d;" : "") +
          "'>" + escapeHtml(statusLabel(status)) + "</span>";
        
        if ((status === "queued" || status === "active") && progress != null) {
          // Check timeout
          var age = cached && cached.lastUpdate ? Date.now() - cached.lastUpdate : 0;
          if (age > POLL_TIMEOUT_MS) {
            progressHtml = "<div style='margin-top:6px;font-size:11px;color:#94a3b8;'>Stále běží – otevři detail</div>";
          } else {
            progressHtml = "<div style='margin-top:6px;'><div style='display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:2px;'><span>Progress</span><span>" + Math.round(progress) + "%</span></div>" +
              "<div style='width:100%;height:6px;background:#020617;border-radius:3px;overflow:hidden;border:1px solid #1e293b;'>" +
              "<div style='width:" + Math.min(100, Math.max(0, progress)) + "%;height:100%;background:#2563eb;transition:width 0.3s ease;'></div></div></div>";
          }
        }
      }
      
      return "<div class='item' data-id='" + escapeHtml(item.id) + "' data-job-id='" + (jobId ? escapeHtml(jobId) : "") + "'>" +
        "<div style='display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;'>" +
        "<div><strong>" + escapeHtml(typeLabel(item.type)) + "</strong> " + escapeHtml(shortDesc(item).slice(0, 60)) + statusHtml + "</div>" +
        "</div>" +
        progressHtml +
        "<div style='color:#94a3b8;font-size:12px;margin-top:4px;'>" + escapeHtml(ts) + "</div>" +
        "</div>";
    }).join("");

    listEl.querySelectorAll(".item").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-id");
        var item = NeoBotHistory.getHistoryById(id);
        if (item) {
          currentDetailItem = item;
          showDetail(item);
        }
      });
    });
    
    // Start polling for active jobs
    startPollingForJobs();
  }

  function showDetail(item) {
    var jobId = getJobId(item);
    
    if (jobId && window.NeoBotAPI) {
      // Fetch latest job status
      fetchJobStatus(jobId, function (err, job) {
        if (err || !job) {
          // Fallback to localStorage data
          renderDetailFromLocalStorage(item);
          return;
        }
        
        // Render from API data
        var html = "<div style='font-family:monospace;font-size:13px;line-height:1.6;'>";
        html += "<div style='margin-bottom:12px;'><strong>Typ:</strong> " + escapeHtml(typeLabel(item.type)) + "</div>";
        html += "<div style='margin-bottom:12px;'><strong>Job ID:</strong> " + escapeHtml(jobId) + "</div>";
        html += "<div style='margin-bottom:12px;'><strong>Status:</strong> <span class='" + statusClass(job.status) + "'>" + escapeHtml(statusLabel(job.status)) + "</span></div>";
        
        if (job.status === "not_found") {
          html += "<div style='margin-bottom:12px;padding:8px;background:#450a0a;border-radius:4px;color:#fca5a5;'>Job už není dostupný (byl odstraněn nebo neexistuje).</div>";
        } else if (job.status === "offline") {
          html += "<div style='margin-bottom:12px;padding:8px;background:#422006;border-radius:4px;color:#fcd34d;'>API není dostupné. Zobrazen poslední známý status.</div>";
        }
        
        if (job.progress != null && job.status !== "not_found" && job.status !== "offline") {
          html += "<div style='margin-bottom:12px;'><strong>Progress:</strong> " + Math.round(job.progress) + "%</div>";
        }
        
        if (job.error && job.error.message) {
          html += "<div style='margin-bottom:12px;padding:8px;background:#450a0a;border-radius:4px;color:#fca5a5;'><strong>Chyba:</strong> " + escapeHtml(job.error.message) + "</div>";
        }
        
        if (job.result) {
          var resultStr = JSON.stringify(job.result, null, 2);
          var resultPreview = resultStr.length > 500 ? resultStr.slice(0, 500) + "..." : resultStr;
          html += "<div style='margin-bottom:12px;'><strong>Výsledek:</strong><pre style='background:#020617;padding:8px;border-radius:4px;overflow:auto;max-height:300px;font-size:11px;'>" + escapeHtml(resultPreview) + "</pre></div>";
        }
        
        html += "<div style='margin-top:16px;padding-top:12px;border-top:1px solid #1e293b;'><strong>Původní data (localStorage):</strong><pre style='background:#020617;padding:8px;border-radius:4px;overflow:auto;max-height:200px;font-size:11px;'>" + escapeHtml(JSON.stringify(item, null, 2)) + "</pre></div>";
        html += "</div>";
        
        detailBody.innerHTML = html;
        modal.style.display = "flex";
      });
    } else {
      // No jobId - show localStorage data only
      renderDetailFromLocalStorage(item);
    }
  }

  function renderDetailFromLocalStorage(item) {
    detailBody.textContent = JSON.stringify(item, null, 2);
    modal.style.display = "flex";
  }

  if (closeBtn) closeBtn.addEventListener("click", function () { modal.style.display = "none"; });
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) modal.style.display = "none"; });

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (!currentDetailItem) return;
      var jobId = getJobId(currentDetailItem);
      var text;
      
      if (jobId && jobStatusCache[jobId]) {
        // Copy job data from API
        var cached = jobStatusCache[jobId];
        text = JSON.stringify({
          id: currentDetailItem.id,
          type: currentDetailItem.type,
          jobId: jobId,
          status: cached.status,
          progress: cached.progress,
          result: cached.result,
          error: cached.error,
          input: currentDetailItem.input,
          timestamp: currentDetailItem.timestamp,
        }, null, 2);
      } else {
        // Copy localStorage data
        text = JSON.stringify(currentDetailItem, null, 2);
      }
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { alert("Zkopírováno."); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Zkopírováno.");
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      if (!currentDetailItem) return;
      var text = JSON.stringify(currentDetailItem, null, 2);
      var a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(text);
      a.download = "neobot-history-" + (currentDetailItem.id || Date.now()) + ".json";
      a.click();
    });
  }

  var allPanels = ["dashboard-panel", "chat-panel", "seo-panel", "seo-audit-panel", "publish-panel", "marketing-panel", "history-panel", "outputs-panel"];
  var allNavIds = ["nav-dashboard", "nav-chat", "nav-seo", "nav-seo-audit", "nav-publish", "nav-marketing", "nav-history", "nav-outputs"];

  function showHistoryPanel() {
    allPanels.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "history-panel");
    });
    allNavIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "nav-history");
    });
    
    var isActive = historyPanel && historyPanel.classList.contains("active");
    if (isActive) {
      renderList();
      // Start polling when panel becomes visible
      startPollingForJobs();
    } else {
      // Stop polling when panel is hidden
      stopAllPolling();
    }
  }
  
  // Cleanup polling when panel is hidden
  function stopAllPolling() {
    Object.keys(pollingTimers).forEach(function (jobId) {
      clearTimeout(pollingTimers[jobId]);
      delete pollingTimers[jobId];
    });
    pollingQueue = [];
    activePolling = 0;
  }

  if (navHistory) {
    navHistory.addEventListener("click", function (e) {
      e.preventDefault();
      showHistoryPanel();
    });
  }

  renderList();
})();
