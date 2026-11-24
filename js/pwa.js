"use strict";
/* PWA: registra o service worker, oferece "Instalar app" e sincroniza o theme-color com o tema. */
(function () {
  var deferredPrompt = null;

  function isStandalone() {
    try {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    } catch (e) { return false; }
  }

  function syncThemeColor() {
    try {
      var colors = { dark: "#0c0c0c", light: "#eeeeee", white: "#ffffff", sepia: "#e8dcc3", midnight: "#0a1628", ubuntu: "#2C001E", firefox: "#15141A", blackred: "#000000", dracula: "#191a21", nord: "#242933", gruvbox: "#1d2021", solarized: "#073642" };
      var m = document.getElementById("metaTheme");
      if (m && typeof settings !== "undefined") m.setAttribute("content", colors[settings.theme] || "#0c0c0c");
    } catch (e) {}
  }

  function installApp() {
    if (!deferredPrompt) return;
    var p = deferredPrompt;
    deferredPrompt = null;
    try {
      p.prompt();
      if (p.userChoice) p.userChoice.then(function () { refreshInstallItem(); }).catch(function () {});
    } catch (e) {}
    refreshInstallItem();
  }

  function refreshInstallItem() {
    try {
      var old = document.getElementById("pwaInstall");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (!deferredPrompt || isStandalone()) return;
      var menu = document.getElementById("menu-file");
      if (!menu) return;
      var b = document.createElement("button");
      b.id = "pwaInstall";
      b.innerHTML = "<span>Instalar app…</span>";
      b.onclick = function () { try { closeMenus(); } catch (e) {} installApp(); };
      menu.insertBefore(b, menu.children[2] || null); // junto de "Nova janela"
    } catch (e) {}
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    refreshInstallItem();
  });
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    refreshInstallItem();
  });

  // Só em http(s); abrindo por file:// o app continua funcionando, sem offline.
  try {
    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").then(function (reg) {
          function watch(w) {
            if (!w) return;
            if (w.state === "installed" && navigator.serviceWorker.controller) showUpdateBar(w);
            w.addEventListener("statechange", function () {
              if (w.state === "installed" && navigator.serviceWorker.controller) showUpdateBar(w);
            });
          }
          reg.addEventListener("updatefound", function () { watch(reg.installing); });
          watch(reg.waiting);
          setInterval(function () { try { reg.update(); } catch (e) {} }, 60 * 60 * 1000);
          document.addEventListener("visibilitychange", function () {
            if (!document.hidden) { try { reg.update(); } catch (e) {} }
          });
        }).catch(function () {});
      });
    }
  } catch (e) {}

  try {
    if (typeof applyTheme === "function") {
      var prevTheme = applyTheme;
      applyTheme = function () { prevTheme(); syncThemeColor(); };
    }
    if (typeof buildMenus === "function") {
      var prevMenus = buildMenus;
      buildMenus = function () { prevMenus(); refreshInstallItem(); };
    }
  } catch (e) {}
  syncThemeColor();

  var updateSeen = false;
  function showUpdateBar(worker) {
    if (updateSeen) return;
    updateSeen = true;
    try {
      var bar = document.getElementById("updatebar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "updatebar";
        bar.className = "updatebar";
        var s = document.createElement("span");
        s.textContent = "Nova versão disponível.";
        bar.appendChild(s);
        var b = document.createElement("button");
        b.className = "btn primary";
        b.textContent = "Atualizar";
        b.onclick = function () {
          try { worker.postMessage("SKIP_WAITING"); }
          catch (e) { window.location.reload(); }
        };
        bar.appendChild(b);
        document.body.appendChild(bar);
      }
      bar.classList.add("show");
    } catch (e) {}
  }

  try {
    if ("serviceWorker" in navigator) {
      var reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!reloaded) { reloaded = true; window.location.reload(); }
      });
    }
  } catch (e) {}

  window.__reInstall = installApp;
})();
