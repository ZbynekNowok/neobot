(function () {
  var tbody = document.getElementById("outputs-tbody");
  var loading = document.getElementById("outputs-loading");
  var empty = document.getElementById("outputs-empty");
  var navOutputs = document.getElementById("nav-outputs");

  function summary(item) {
    var o = item.output;
    if (!o) return item.type || "";
    if (typeof o === "string") return o.slice(0, 80);
    if (o.text) return o.text.slice(0, 80);
    if (o.headline) return o.headline;
    if (o.jobId) return "job " + o.jobId;
    return item.type || "";
  }

  function loadOutputs() {
    if (!window.NeoBotAPI || !tbody) return;
    if (loading) loading.style.display = "inline-block";
    if (empty) empty.style.display = "none";
    tbody.innerHTML = "";
    NeoBotAPI.apiGet("api/outputs?limit=50")
      .then(function (data) {
        if (loading) loading.style.display = "none";
        var items = (data && data.items) || [];
        if (items.length === 0) {
          if (empty) empty.style.display = "block";
          return;
        }
        items.forEach(function (item) {
          var tr = document.createElement("tr");
          var created = (item.created_at && new Date(item.created_at).toLocaleString("cs-CZ")) || "";
          var sum = summary(item);
          tr.innerHTML =
            "<td>" + (item.type || "") + "</td>" +
            "<td>" + created + "</td>" +
            "<td>" + (sum.length > 60 ? sum.slice(0, 60) + "…" : sum) + "</td>" +
            "<td><button type=\"button\" class=\"secondary chat-continue-btn\" data-summary=\"" + (sum.replace(/"/g, "&quot;")).slice(0, 200) + "\">Pokračovat v chatu k tomuto výstupu</button></td>";
          var btn = tr.querySelector(".chat-continue-btn");
          if (btn) {
            btn.addEventListener("click", function () {
              var prefill = "Navazujeme na tento výstup: " + (btn.dataset.summary || "") + ". Navrhni 3 varianty.";
              if (window.NeoBotChatOpenWithPrefill) window.NeoBotChatOpenWithPrefill(prefill);
            });
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function () {
        if (loading) loading.style.display = "none";
        if (empty) {
          empty.textContent = "Chyba načtení nebo žádné výstupy.";
          empty.style.display = "block";
        }
      });
  }

  function showOutputsPanel() {
    var allPanels = ["dashboard-panel", "chat-panel", "seo-panel", "seo-audit-panel", "publish-panel", "marketing-panel", "history-panel", "outputs-panel"];
    var allNavIds = ["nav-dashboard", "nav-chat", "nav-seo", "nav-seo-audit", "nav-publish", "nav-marketing", "nav-history", "nav-outputs"];
    allPanels.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "outputs-panel");
    });
    allNavIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("active", id === "nav-outputs");
    });
    loadOutputs();
  }

  if (navOutputs) {
    navOutputs.addEventListener("click", function (e) {
      e.preventDefault();
      showOutputsPanel();
    });
  }
})();
