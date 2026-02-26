(function () {
  var listEl = document.getElementById("users-list");
  var bannerEl = document.getElementById("users-banner");
  var emailInput = document.getElementById("users-email");
  var newRoleSelect = document.getElementById("users-new-role");
  var addBtn = document.getElementById("users-add-btn");

  function showBanner(msg, isError) {
    if (!bannerEl) return;
    bannerEl.textContent = msg;
    bannerEl.className = "banner " + (isError ? "error" : "info");
    bannerEl.style.display = "block";
  }

  function hideBanner() {
    if (bannerEl) bannerEl.style.display = "none";
  }

  function displayUserId(userId) {
    if (typeof userId !== "string") return userId || "";
    if (userId.indexOf("api:") === 0) return "API klíč (" + userId.slice(0, 12) + "…)";
    return userId;
  }

  function loadUsers() {
    if (!window.NeoBotAPI) {
      listEl.innerHTML = "<p class=\"meta\">API není k dispozici. Nastavte API klíč v Dashboardu.</p>";
      return;
    }
    listEl.innerHTML = "<p class=\"meta\">Načítám…</p>";
    NeoBotAPI.apiGet("api/workspace/users")
      .then(function (data) {
        hideBanner();
        if (!data.users || data.users.length === 0) {
          listEl.innerHTML = "<p class=\"meta\">Žádní uživatelé.</p>";
          return;
        }
        listEl.innerHTML = data.users
          .map(function (u) {
            var roleOptions = ["owner", "editor", "viewer"]
              .map(function (r) {
                return "<option value=\"" + r + "\"" + (u.role === r ? " selected" : "") + ">" + r + "</option>";
              })
              .join("");
            return (
              "<div class=\"user-row\" data-id=\"" +
              (u.id || "") +
              "\">" +
              "<span class=\"user-id\">" +
              displayUserId(u.user_id) +
              "</span>" +
              "<select class=\"user-role-select\" data-id=\"" +
              (u.id || "") +
              "\">" +
              roleOptions +
              "</select>" +
              "<div class=\"actions\">" +
              "<button type=\"button\" class=\"danger user-remove-btn\" data-id=\"" +
              (u.id || "") +
              "\">Odebrat</button>" +
              "</div>" +
              "</div>"
            );
          })
          .join("");

        listEl.querySelectorAll(".user-role-select").forEach(function (sel) {
          sel.addEventListener("change", function () {
            var id = sel.dataset.id;
            var role = sel.value;
            NeoBotAPI.apiPatch("api/workspace/users/" + encodeURIComponent(id), { role: role })
              .then(function () {
                hideBanner();
                loadUsers();
              })
              .catch(function (err) {
                showBanner((err && err.message) || "Chyba při změně role", true);
                loadUsers();
              });
          });
        });
        listEl.querySelectorAll(".user-remove-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.dataset.id;
            if (!confirm("Odebrat tohoto uživatele z workspace?")) return;
            NeoBotAPI.apiDelete("api/workspace/users/" + encodeURIComponent(id))
              .then(function () {
                hideBanner();
                loadUsers();
              })
              .catch(function (err) {
                showBanner((err && err.message) || "Chyba při odebírání", true);
                loadUsers();
              });
          });
        });
      })
      .catch(function (err) {
        var msg = (err && err.message) || "Nepodařilo se načíst uživatele.";
        if (err && err.status === 403) msg = "Pouze owner může spravovat uživatele.";
        if (err && err.status === 401) msg = "Neplatný nebo chybějící API klíč.";
        listEl.innerHTML = "<p class=\"meta\">" + msg + "</p>";
        showBanner(msg, true);
      });
  }

  if (addBtn && emailInput && newRoleSelect) {
    addBtn.addEventListener("click", function () {
      var email = (emailInput.value || "").trim();
      var role = newRoleSelect.value || "viewer";
      if (!email) {
        showBanner("Zadejte e-mail.", true);
        return;
      }
      addBtn.disabled = true;
      NeoBotAPI.apiPost("api/workspace/users", { email: email, role: role })
        .then(function () {
          hideBanner();
          emailInput.value = "";
          loadUsers();
        })
        .catch(function (err) {
          showBanner((err && err.message) || "Chyba při přidávání", true);
        })
        .then(function () {
          addBtn.disabled = false;
        });
    });
  }

  loadUsers();
})();
