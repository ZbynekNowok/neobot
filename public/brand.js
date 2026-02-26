(function () {
  var form = document.getElementById("brand-form");
  var banner = document.getElementById("brand-banner");
  var toast = document.getElementById("brand-toast");
  var saveBtn = document.getElementById("brand-save-btn");
  var navBrand = document.getElementById("nav-brand");

  var fieldIds = [
    "business_name", "industry", "target_audience", "city", "tone", "usp",
    "main_services", "cta_style", "forbidden_words"
  ];

  function showBrandPanel() {
    var allPanels = ["dashboard-panel", "chat-panel", "brand-panel", "seo-panel", "seo-audit-panel", "publish-panel", "marketing-panel", "history-panel"];
    var allNavIds = ["nav-dashboard", "nav-chat", "nav-brand", "nav-seo", "nav-seo-audit", "nav-publish", "nav-marketing", "nav-history"];
    allPanels.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "brand-panel");
    });
    allNavIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "nav-brand");
    });
    loadProfile();
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
      })
      .catch(function (err) {
        if (banner) {
          banner.style.display = "block";
          banner.className = "banner error";
          banner.textContent = (err && err.message) ? err.message : "Profil se nepodařilo načíst.";
        }
      });
  }

  function showToast() {
    if (!toast) return;
    toast.style.display = "block";
    toast.textContent = "Uloženo.";
    setTimeout(function () {
      toast.style.display = "none";
    }, 3000);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.NeoBotAPI || !saveBtn) return;
      var payload = {};
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
      saveBtn.disabled = true;
      if (banner) banner.style.display = "none";
      NeoBotAPI.apiPost("api/workspace/profile", payload)
        .then(function () {
          showToast();
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

  if (navBrand) {
    navBrand.addEventListener("click", function (e) {
      e.preventDefault();
      showBrandPanel();
    });
  }
})();
