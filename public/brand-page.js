(function () {
  var form = document.getElementById("brand-form");
  var banner = document.getElementById("brand-banner");
  var toast = document.getElementById("brand-toast");
  var saveBtn = document.getElementById("brand-save-btn");
  var clearBtn = document.getElementById("brand-clear-btn");
  var lastUpdateEl = document.getElementById("brand-last-update");
  var updatedAtEl = document.getElementById("brand-updated-at");

  var fieldIds = [
    "business_name", "industry", "target_audience", "city", "tone", "usp",
    "main_services", "cta_style", "forbidden_words"
  ];

  function formatDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return isNaN(d.getTime()) ? iso : d.toLocaleString("cs-CZ");
    } catch (_) {
      return iso;
    }
  }

  function loadProfile() {
    if (!window.NeoBotAPI) return;
    NeoBotAPI.apiGet("api/workspace/profile")
      .then(function (data) {
        var p = (data && data.profile) || {};
        fieldIds.forEach(function (fid) {
          var el = document.getElementById("brand-" + fid);
          if (!el) return;
          var v = p[fid];
          if (fid === "main_services" || fid === "forbidden_words") {
            el.value = Array.isArray(v) ? v.join("\n") : (v || "");
          } else {
            el.value = v || "";
          }
        });
        if (p.updated_at && lastUpdateEl && updatedAtEl) {
          updatedAtEl.textContent = formatDate(p.updated_at);
          lastUpdateEl.style.display = "block";
        } else if (lastUpdateEl) {
          lastUpdateEl.style.display = "none";
        }
      })
      .catch(function (err) {
        if (banner) {
          banner.style.display = "block";
          banner.className = "banner error";
          banner.textContent = (err && err.message) ? err.message : "Profil se nepodařilo načíst.";
        }
      });
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "Uloženo.";
    toast.style.display = "block";
    setTimeout(function () {
      toast.style.display = "none";
    }, 3000);
  }

  function buildPayload(empty) {
    var payload = {};
    if (empty) {
      fieldIds.forEach(function (fid) {
        payload[fid] = (fid === "main_services" || fid === "forbidden_words") ? [] : null;
      });
      return payload;
    }
    fieldIds.forEach(function (fid) {
      var el = document.getElementById("brand-" + fid);
      if (!el) return;
      var v = el.value ? el.value.trim() : "";
      if (fid === "main_services" || fid === "forbidden_words") {
        payload[fid] = v ? v.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) : [];
      } else {
        payload[fid] = v || null;
      }
    });
    return payload;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.NeoBotAPI || !saveBtn) return;
      var payload = buildPayload(false);
      saveBtn.disabled = true;
      if (banner) banner.style.display = "none";
      NeoBotAPI.apiPost("api/workspace/profile", payload)
        .then(function (data) {
          showToast("Uloženo.");
          if (data && data.profile && data.profile.updated_at && lastUpdateEl && updatedAtEl) {
            updatedAtEl.textContent = formatDate(data.profile.updated_at);
            lastUpdateEl.style.display = "block";
          }
        })
        .catch(function (err) {
          if (banner) {
            banner.style.display = "block";
            banner.className = "banner error";
            banner.textContent = (err && err.message) ? err.message : "Uložení se nepodařilo.";
          }
        })
        .then(function () {
          saveBtn.disabled = false;
        });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!window.NeoBotAPI) return;
      if (!confirm("Opravdu chcete vyčistit celý profil firmy? Všechna pole budou prázdná.")) return;
      var payload = buildPayload(true);
      clearBtn.disabled = true;
      if (banner) banner.style.display = "none";
      NeoBotAPI.apiPost("api/workspace/profile", payload)
        .then(function (data) {
          showToast("Profil vyčištěn.");
          fieldIds.forEach(function (fid) {
            var el = document.getElementById("brand-" + fid);
            if (el) el.value = "";
          });
          if (lastUpdateEl) lastUpdateEl.style.display = "none";
          if (data && data.profile && data.profile.updated_at && lastUpdateEl && updatedAtEl) {
            updatedAtEl.textContent = formatDate(data.profile.updated_at);
            lastUpdateEl.style.display = "block";
          }
        })
        .catch(function (err) {
          if (banner) {
            banner.style.display = "block";
            banner.className = "banner error";
            banner.textContent = (err && err.message) ? err.message : "Vyčištění se nepodařilo.";
          }
        })
        .then(function () {
          clearBtn.disabled = false;
        });
    });
  }

  loadProfile();
})();
