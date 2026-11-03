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
      var colors = { dark: "#0c0c0c", light: "#eeeeee", white: "#ffffff" };
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
        navigator.serviceWorker.register("sw.js").catch(function () {});
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

  window.__reInstall = installApp;
})();
