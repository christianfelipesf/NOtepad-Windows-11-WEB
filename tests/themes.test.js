// Cobre: catálogo de temas consistente, prévia no seletor e fluxo
// pré-visualizar ao vivo, Fechar desfaz, Aplicar salva.
// Roda com: node --test tests/themes.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["js/core.js", "js/encoding.js", "js/zip.js", "js/markdown.js",
  "js/tabs.js", "js/editor.js", "js/ui.js", "js/run.js", "js/main.js"];

function FakeElement(tag) {
  this.tagName = String(tag || "div").toUpperCase();
  this.children = [];
  this.style = {};
  this.dataset = {};
  const seen = new Set();
  this.classList = {
    add(...c) { c.forEach((x) => seen.add(x)); },
    remove(...c) { c.forEach((x) => seen.delete(x)); },
    toggle(c) { if (seen.has(c)) seen.delete(c); else seen.add(c); },
    contains(c) { return seen.has(c); }
  };
  this.value = "";
  this.textContent = "";
  this.innerHTML = "";
  this.checked = false;
  this.parentNode = null;
}
FakeElement.prototype.appendChild = function (el) { el.parentNode = this; this.children.push(el); return el; };
FakeElement.prototype.addEventListener = function () {};
FakeElement.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
FakeElement.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; };
FakeElement.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
FakeElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
};
FakeElement.prototype.scrollIntoView = function () {};
FakeElement.prototype.focus = function () {};
FakeElement.prototype.select = function () {};
FakeElement.prototype.setSelectionRange = function () {};
FakeElement.prototype.querySelectorAll = function () { return []; };
FakeElement.prototype.querySelector = function () { return null; };

function boot() {
  const store = {};
  const byId = new Map();
  const doc = {
    hidden: false,
    title: "",
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
    head: new FakeElement("head"),
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, new FakeElement("div"));
      return byId.get(id);
    },
    createElement(tag) { return new FakeElement(tag); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {}
  };
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    document: doc,
    URL: { createObjectURL() { return "blob:x"; }, revokeObjectURL() {} },
    window: {
      addEventListener() {},
      removeEventListener() {},
      location: { protocol: "file:", href: "http://localhost/" }
    },
    navigator: {},syncStatusText: function () { return ""; },SyncNow: function (cb) { if (cb) cb(""); return Promise.resolve(""); },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; }
  };
  sandbox.window.document = doc;
  vm.createContext(sandbox);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  }
  return { box: sandbox, run: (code) => vm.runInContext(code, sandbox) };
}

describe("temas", () => {
  it("todo tema tem nome, bloco CSS e cor PWA", () => {
    const t = boot();
    const css = fs.readFileSync(path.join(ROOT, "css/theme.css"), "utf8");
    const pwa = fs.readFileSync(path.join(ROOT, "js/pwa.js"), "utf8");
    const order = t.run("THEME_ORDER");
    assert.ok(order.length >= 8, "catálogo base preservado");
    order.forEach((v) => {
      assert.ok(t.run(`THEME_NAMES[${JSON.stringify(v)}]`), v + " tem nome");
      assert.ok(css.includes('[data-theme="' + v + '"]'), v + " tem CSS");
      assert.ok(pwa.includes(v + ': "'), v + " tem cor PWA");
    });
  });

  it("fogo laranja é lento e vai-e-volta", () => {
    const css = fs.readFileSync(path.join(ROOT, "css/theme.css"), "utf8");
    assert.match(css, /blackred-fire 28s ease-in-out infinite alternate/);
  });

  it("seletor mostra uma prévia por tema e o select acompanha", () => {
    const t = boot();
    t.run("openThemeChooser()");
    const html = t.box.document.getElementById("dlgBox").innerHTML;
    const rows = html.match(/id='tRow_/g) || [];
    assert.equal(rows.length, t.run("THEME_ORDER.length"));
    assert.match(html, /tmock/);
    assert.match(html, /Drácula/);
    t.run("openSettings()");
    const shtml = t.box.document.getElementById("dlgBox").innerHTML;
    ["nord", "gruvbox", "solarized", "dracula"].forEach((v) => {
      assert.ok(shtml.includes("value='" + v + "'"), "configurações listam " + v);
    });
  });

  it("tocar prevê ao vivo, Fechar desfaz, Aplicar salva", () => {
    const t = boot();
    assert.equal(t.run("settings.theme"), "dark");
    t.run("openThemeChooser()");
    t.box.document.getElementById("tRow_nord").onclick();
    assert.equal(t.run("settings.theme"), "nord");
    assert.equal(t.run("document.documentElement.dataset.theme"), "nord");
    assert.equal(t.run("localStorage.getItem('renotepad2.settings')"), null);
    t.box.document.getElementById("tCancel").onclick();
    assert.equal(t.run("settings.theme"), "dark");
    assert.equal(t.run("document.documentElement.dataset.theme"), "dark");
    t.run("openThemeChooser()");
    t.box.document.getElementById("tRow_gruvbox").onclick();
    t.box.document.getElementById("tOk").onclick();
    assert.equal(t.run("settings.theme"), "gruvbox");
    assert.match(t.run("localStorage.getItem('renotepad2.settings')"), /gruvbox/);
  });
});
