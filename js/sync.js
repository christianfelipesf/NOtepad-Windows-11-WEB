"use strict";
/* Sincronização local-first (rápida) com nuvem própria opcional.
   Arquitetura decidida: endpoint REST genérico + ID anônimo por aparelho
   + conflito resolve pela edição mais recente (last-write-wins).
   Tudo local funciona sem rede; a rede só entra quando settings.sync
   está ativado. Futuros provedores (Firebase/Supabase): basta chamar
   Sync.setRemote({pull(since),push(items)}) com o mesmo formato de item:
   {key,name,content,encoding,eol,updatedAt}. */
var Sync = (function () {
  var LS_LAST = "renotepad2.sync.last";
  var LS_DEVICE = "renotepad2.device";
  var pushTimer = null, applying = false, remote = null;

  function cfg() {
    try {
      var s = (typeof settings !== "undefined" && settings.sync) || {};
      return { enabled: !!s.enabled, endpoint: String(s.endpoint || "").replace(/\/+$/, ""), token: String(s.token || "") };
    } catch (e) { return { enabled: false, endpoint: "", token: "" }; }
  }
  function deviceId() {
    try {
      var id = localStorage.getItem(LS_DEVICE);
      if (!id) { id = "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); localStorage.setItem(LS_DEVICE, id); }
      return id;
    } catch (e) { return "d-unknown"; }
  }
  function last() {
    try { return JSON.parse(localStorage.getItem(LS_LAST) || '{"push":0,"pull":0}'); }
    catch (e) { return { push: 0, pull: 0 }; }
  }
  function saveLast(l) { try { localStorage.setItem(LS_LAST, JSON.stringify(l)); } catch (e) {} }

  /* Foto local: guias abertas + guardadas, sem bloquear a interface. */
  function collectLocal() {
    var items = [];
    try {
      tabs.forEach(function (t, i) {
        var body = (tabs.indexOf(t) === active && typeof editor !== "undefined") ? editor.value : (t.content || "");
        items.push({ key: "t:" + (t.vaultId || t.path || t.name), name: t.name, content: body,
          encoding: t.encoding || "UTF-8", eol: t.eol || "CRLF", updatedAt: t.updatedAt || Date.now() });
      });
      closedVault.forEach(function (v) {
        items.push({ key: "v:" + v.id, name: v.name, content: v.content || "",
          encoding: v.encoding || "UTF-8", eol: v.eol || "CRLF", updatedAt: v.updatedAt || 0 });
      });
    } catch (e) {}
    return items;
  }
  function findLocal(key) {
    if (key.slice(0, 2) === "v:") {
      var v = vaultGet(key.slice(2));
      return v ? { kind: "vault", ref: v } : null;
    }
    var k = key.slice(2);
    for (var i = 0; i < tabs.length; i++) {
      if ((tabs[i].vaultId || tabs[i].path || tabs[i].name) === k) return { kind: "tab", ref: tabs[i] };
    }
    for (var j = 0; j < closedVault.length; j++) {
      if ((closedVault[j].path || closedVault[j].name) === k) return { kind: "vault", ref: closedVault[j] };
    }
    return null;
  }
  /* Aplica itens remotos: só vence quem for mais recente; novidade cai na gaveta. */
  function applyRemote(items) {
    var n = 0;
    (items || []).forEach(function (r) {
      if (!r || !r.key) return;
      var f = findLocal(r.key);
      if (!f) {
        vaultUpsert({ name: r.name || "Sem título", path: null, content: r.content || "",
          encoding: r.encoding || "UTF-8", eol: r.eol || "CRLF", createdAt: r.updatedAt || Date.now(), updatedAt: r.updatedAt || Date.now() });
        n++;
      } else if ((r.updatedAt || 0) > (f.ref.updatedAt || 0)) {
        f.ref.content = r.content || "";
        if (r.name) f.ref.name = r.name;
        if (r.encoding) f.ref.encoding = r.encoding;
        if (r.eol) f.ref.eol = r.eol;
        f.ref.updatedAt = r.updatedAt;
        n++;
      }
    });
    if (n) { saveClosedVault(); syncEditor(); renderTabs(); updateStatus(n + (n === 1 ? " nota sincronizada" : " notas sincronizadas")); scheduleSessionSave(); }
    return n;
  }

  function http() {
    var c = cfg();
    if (remote) return remote;
    if (!c.enabled || !c.endpoint || typeof fetch === "undefined") return null;
    var headers = { "Content-Type": "application/json" };
    if (c.token) headers.Authorization = "Bearer " + c.token;
    return {
      pull: function (since) {
        return fetch(c.endpoint + "/pull?since=" + encodeURIComponent(since) + "&device=" + encodeURIComponent(deviceId()), { headers: headers })
          .then(function (r) { if (!r.ok) throw new Error("pull " + r.status); return r.json(); })
          .then(function (j) { return (j && j.items) || []; });
      },
      push: function (items) {
        return fetch(c.endpoint + "/push", { method: "POST", headers: headers,
          body: JSON.stringify({ device: deviceId(), items: items }) })
          .then(function (r) { if (!r.ok) throw new Error("push " + r.status); return r.json(); });
      }
    };
  }
  function status(msg) {
    try { if (typeof updateStatus === "function") updateStatus(msg); } catch (e) {}
    return msg;
  }
  function pullNow(cb) {
    var h = http(), l = last();
    if (!h) { var m = syncStatusText(); if (cb) cb(m); return Promise.resolve(m); }
    return h.pull(l.pull).then(function (items) {
      applying = true;
      try { applyRemote(items); } finally { applying = false; }
      l.pull = Date.now(); saveLast(l);
      var ok = "Sincronizado agora";
      status(ok); if (cb) cb(ok);
      return ok;
    }).catch(function () {
      var m = "Sem conexão — mantido o conteúdo local";
      status(m); if (cb) cb(m);
      return m;
    });
  }
  function pushNow() {
    var h = http(), l = last();
    if (!h) return Promise.resolve("off");
    var dirty = collectLocal().filter(function (it) { return it.updatedAt > l.push; });
    if (!dirty.length) return Promise.resolve("clean");
    return h.push(dirty).then(function () { l.push = Date.now(); saveLast(l); return "pushed"; })
      .catch(function () { return "offline"; });
  }
  return {
    setRemote: function (adapter) { remote = adapter; },
    deviceId: deviceId,
    markDirty: function () {
      if (applying) return;
      var c = cfg();
      if (!c.enabled || !c.endpoint) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(function () { pushTimer = null; pushNow(); }, 2500);
    },
    pullNow: pullNow,
    syncNow: function (cb) { return pullNow().then(function () { return pushNow(); }).then(function (m) { if (cb) cb(syncStatusText()); return m; }); }
  };
})();
/* Gancho local-first: todo save de sessão agenda um push em segundo plano. */
try {
  if (typeof scheduleSessionSave === "function") {
    var _schedSave = scheduleSessionSave;
    scheduleSessionSave = function () { _schedSave(); try { Sync.markDirty(); } catch (e) {} };
  }
} catch (e) {}
try {
  window.addEventListener("online", function () { try { Sync.syncNow(); } catch (e) {} });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { try { Sync.pullNow(); } catch (e) {} }
  });
  setInterval(function () { try { Sync.pullNow(); } catch (e) {} }, 5 * 60 * 1000);
} catch (e) {}
function syncStatusText() {
  try {
    var s = (typeof settings !== "undefined" && settings.sync) || {};
    if (!s.enabled) return "Sincronização desativada — tudo fica neste aparelho.";
    if (!s.endpoint) return "Ativada, mas sem endpoint configurado.";
    return "Ativada. Aparelho " + Sync.deviceId() + ".";
  } catch (e) { return ""; }
}
function SyncNow(cb) { try { return Sync.syncNow(cb); } catch (e) { if (cb) cb("Sincronização indisponível"); return Promise.resolve(""); } }
/* Armazenamento chave-valor em IndexedDB (rápido, cota maior que localStorage).
   Hoje guarda a fila de sincronização; é o ponto de troca para um DB futuro:
   Stores.use("vault", IDBkv) e o resto do app não muda. */
var IDBkv = (function () {
  var DB = "renotepad", STORE = "kv", dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (typeof indexedDB === "undefined") { rej(new Error("no-idb")); return; }
      var q = indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { q.result.createObjectStore(STORE); };
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error || new Error("idb")); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        try {
          var t = d.transaction(STORE, mode), st = t.objectStore(STORE), q = fn(st);
          q.onsuccess = function () { res(q.result); };
          q.onerror = function () { rej(q.error || new Error("idb")); };
        } catch (e) { rej(e); }
      });
    });
  }
  return {
    get: function (k) { return tx("readonly", function (s) { return s.get(k); }).catch(function () { return null; }); },
    set: function (k, v) { return tx("readwrite", function (s) { return s.put(v, k); }).catch(function () {}); },
    del: function (k) { return tx("readwrite", function (s) { return s.delete(k); }).catch(function () {}); }
  };
})();
