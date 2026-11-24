// Cobre: conversão para .md sobrevive à sessão e renderTabs preserva o .md.
// Roda com: node --test tests/md-convert-persist.test.js
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

describe("conversão para .md persiste", () => {
  it("sessão salva o fallback .md após converter", () => {
    const t = boot();
    t.run("newTab()");
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    assert.match(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
    t.run("closeDlg();convertCurrentToMarkdown()");
    assert.equal(t.run("isMarkdownFile(cur().name)"), true);
    t.run("saveSession()");
    const ses = JSON.parse(t.box.localStorage.getItem("renotepad2.session"));
    const s = ses.tabs[ses.active];
    assert.ok(isMdName(s.name), "nome salvo é .md: " + s.name);
    assert.ok(isMdName(s.fallback), "fallback salvo é .md: " + s.fallback);
    function isMdName(n) { return /\.(md|markdown|mdown?)$/i.test(String(n || "")); }
  });

  it("segunda foto na nota convertida não pergunta de novo", () => {
    const t = boot();
    t.run("newTab()");
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    t.run("closeDlg();convertCurrentToMarkdown()");
    t.box.document.getElementById("dlgBox").innerHTML = "";
    t.run("insertMarkdownImage('data:image/png;base64,BBB','outra')");
    assert.doesNotMatch(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
    assert.equal(t.run("isMarkdownFile(cur().name)"), true);
  });

  it("titular pela primeira linha preserva o .md", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    t.run("editor.value='Minhas notas\\ncorpo';renderTabs()");
    assert.match(t.run("cur().name"), /\.md$/i);
  });

  it("recupera o .md de sessão antiga sem fallback", () => {
    const t = boot();
    t.run("newTab()");
    // Estado de sessão salva antes da correção: nome .md, sem fallback, só anexo/legenda.
    t.run("cur().name='Sem título.md';cur().fallback=undefined;editor.value='![foto](foto.png)\\n*Colado em 01/01/2026, 10:00*\\n';renderTabs()");
    assert.equal(t.run("isMarkdownFile(cur().name)"), true);
  });
});
