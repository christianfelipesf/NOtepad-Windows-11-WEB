// Teste focado: botão "Guardar todas e limpar" pede confirmação,
// move as guias para as guardadas e fecha tudo.
// Roda com: node --test tests/vault-clear.test.js
// Usa só módulos nativos do Node; carrega os arquivos reais do app com um
// DOM mínimo. sync.js/pwa.js ficam de fora porque o caminho testado não
// passa por eles.
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
FakeElement.prototype.insertBefore = function (el, ref) {
  el.parentNode = this;
  const i = ref ? this.children.indexOf(ref) : -1;
  if (i < 0) this.children.push(el); else this.children.splice(i, 0, el);
  return el;
};
FakeElement.prototype.removeChild = function (el) {
  const i = this.children.indexOf(el);
  if (i >= 0) this.children.splice(i, 1);
  el.parentNode = null;
  return el;
};
FakeElement.prototype.addEventListener = function () {};
FakeElement.prototype.removeEventListener = function () {};
FakeElement.prototype.setAttribute = function (k, v) { this[k] = String(v); };
FakeElement.prototype.getAttribute = function (k) { return this[k]; };
FakeElement.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
};
FakeElement.prototype.scrollIntoView = function () {};
FakeElement.prototype.focus = function () {};
FakeElement.prototype.select = function () {};
FakeElement.prototype.setSelectionRange = function () {};
FakeElement.prototype.querySelectorAll = function () { return []; };
FakeElement.prototype.querySelector = function () { return null; };

function boot({ quotaError = false } = {}) {
  const store = {};
  const byId = new Map();
  const doc = {
    hidden: false,
    title: "",
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
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
    window: {
      addEventListener() {},
      removeEventListener() {},
      location: { protocol: "file:", href: "http://localhost/" }
    },
    navigator: {},
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) {
        if (quotaError) throw new Error("QuotaExceededError");
        store[k] = String(v);
      },
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

function duasGuias(t) {
  t.run('editor.value="nota um";markModified();newTab("Segunda","conteúdo dois");');
}

describe("Guardar e limpar guias", () => {
  it("botão abre confirmação com a contagem e só limpa após confirmar", () => {
    const t = boot();
    duasGuias(t);
    assert.equal(t.run("tabs.length"), 2);
    const btn = t.box.document.getElementById("btnVaultAll");
    assert.equal(typeof btn.onclick, "function");
    btn.onclick();
    assert.equal(t.run("tabs.length"), 2);
    assert.match(t.box.document.getElementById("dlgBox").innerHTML, /2 guias/);
    t.box.document.getElementById("vYes").onclick();
    assert.equal(t.run("tabs.length"), 1);
    assert.equal(t.run("cur().content"), "");
    assert.match(t.run("closedVault.map(v=>v.content).join('|')"), /nota um/);
    assert.match(t.run("closedVault.map(v=>v.content).join('|')"), /conteúdo dois/);
    assert.match(t.box.document.getElementById("stMsg").textContent, /guardadas/);
  });

  it("cancelar não fecha nem guarda nada", () => {
    const t = boot();
    duasGuias(t);
    t.box.document.getElementById("btnVaultAll").onclick();
    t.run("closeDlg()");
    assert.equal(t.run("tabs.length"), 2);
    assert.equal(t.run("closedVault.length"), 0);
  });

  it("limpa as guias mesmo quando o salvamento local falha", () => {
    const t = boot({ quotaError: true });
    duasGuias(t);
    t.box.document.getElementById("btnVaultAll").onclick();
    t.box.document.getElementById("vYes").onclick();
    assert.equal(t.run("tabs.length"), 1);
    assert.match(t.box.document.getElementById("stMsg").textContent, /recusou/);
  });
});
