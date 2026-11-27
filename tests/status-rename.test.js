// Cobre: renomear só pelo .txt; clicar nas datas não faz nada;
// Propriedades é só leitura; Executar > Renomear usa o diálogo de extensão.
// Roda com: node --test tests/status-rename.test.js
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
  this.attrs = {};
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
    navigator: {},
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

describe("barra de status: um só caminho de renome", () => {
  it("datas não têm ação de clique", () => {
    const t = boot();
    t.run("newTab('nota.txt')");
    const fn = t.box.document.getElementById("stDates").onclick;
    assert.ok(fn === null || fn === undefined, "stDates não deve ter handler de clique");
  });

  it("datas não parecem clicáveis no index.html", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const m = html.match(/<span[^>]*id="stDates"[^>]*>/);
    assert.ok(m, "stDates existe no index.html");
    assert.doesNotMatch(m[0], /clickable/);
    assert.doesNotMatch(m[0], /clique para mudar o nome/);
  });

  it("extensão continua abrindo o diálogo de nome/extensão", () => {
    const t = boot();
    t.run("newTab('rascunho.txt')");
    const wired = t.box.document.getElementById("stExt").onclick;
    assert.equal(typeof wired, "function");
    wired();
    t.box.document.getElementById("eBase").value = "rascunho";
    t.box.document.getElementById("eExt").value = ".md";
    t.box.document.getElementById("eOk").onclick();
    assert.equal(t.run("cur().name"), "rascunho.md");
  });

  it("propriedades é somente leitura e indica o .txt para renomear", () => {
    const t = boot();
    t.run("newTab('nota.txt')");
    t.run("openProps()");
    const html = t.box.document.getElementById("dlgBox").innerHTML;
    assert.doesNotMatch(html, /pName/);
    assert.match(html, /\.txt/);
  });

  it("executar > renomear usa o diálogo de extensão", () => {
    const t = boot();
    t.run("newTab('nota.xyz')");
    t.run("openRunInNewTab()");
    const first = t.box.document.getElementById("dlgBox").innerHTML;
    assert.match(first, /rRename/);
    t.run("document.getElementById('rRename').onclick()");
    const second = t.box.document.getElementById("dlgBox").innerHTML;
    assert.match(second, /Extensão da nota/);
  });
});
