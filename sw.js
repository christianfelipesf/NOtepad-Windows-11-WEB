"use strict";
/* Service worker: deixa o RENotepad instalável e usável offline. */
var APP_VERSION = "v6";
var CACHE = "renotepad-v6";
var SHELL = [
  "./",
  "./index.html",
  "./site.webmanifest",
  "./css/theme.css",
  "./css/app.css",
  "./js/core.js",
  "./js/encoding.js",
  "./js/zip.js",
  "./js/markdown.js",
  "./js/tabs.js",
  "./js/editor.js",
  "./js/ui.js",
  "./js/run.js",
  "./js/sync.js",
  "./js/viewers.js",
  "./js/main.js",
  "./js/pwa.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32x32.png",
  "./icons/favicon-16x16.png",
  "./icons/apple-touch-icon.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "GET_VERSION" && e.source) e.source.postMessage({ version: APP_VERSION });
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
