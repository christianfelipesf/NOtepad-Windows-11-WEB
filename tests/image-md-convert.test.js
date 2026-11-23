// Teste focado: colar imagem em nota sem .md pergunta se converte,
// guarda o nome original e não renomeia sozinho.
// Roda com: node --test tests/image-md-convert.test.js
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
FakeElement.prototype.setAttribute = function (k, v) { this[k] = String(v); };
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

describe("imagem em nota sem .md", () => {
  it("deteccao .md só vale no fim do nome", () => {
    const t = boot();
    assert.equal(t.run("isMarkdownFile('nota.md')"), true);
    assert.equal(t.run("isMarkdownFile('NOTA.MD')"), true);
    assert.equal(t.run("isMarkdownFile('nota.markdown')"), true);
    assert.equal(t.run("isMarkdownFile('Sem título')"), false);
    assert.equal(t.run("isMarkdownFile('nota.txt')"), false);
    assert.equal(t.run("isMarkdownFile('nota.md.txt')"), false);
  });

  it("colar imagem pergunta se converte e guarda o original", () => {
    const t = boot();
    assert.equal(t.run("isMarkdownFile(cur().name)"), false);
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    assert.match(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
    assert.match(t.run("editor.value"), /!\[foto\]\(data:image\/png;base64,AAA\)/);
    assert.equal(t.run("cur().name"), "Sem título");
    t.box.document.getElementById("mdYes").onclick();
    assert.equal(t.run("cur().name"), "Sem título.md");
    assert.equal(t.run("cur().origName"), "Sem título");
    assert.equal(t.run("isMarkdownFile(cur().name)"), true);
    assert.match(t.box.document.getElementById("stMsg").textContent, /original/);
  });

  it("manter como está não renomeia e dá para converter depois", () => {
    const t = boot();
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    t.box.document.getElementById("mdNo").onclick();
    assert.equal(t.run("cur().name"), "Sem título");
    assert.equal(t.run("cur().mdAskDeclined"), true);
    const link = t.box.document.getElementById("stMsg").onclick;
    assert.equal(typeof link, "function");
    link();
    assert.match(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
  });

  it("nota .md não pergunta nada", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    assert.doesNotMatch(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
    assert.equal(t.run("cur().origName||null"), null);
  });

  it("salvar não duplica a extensão .md", () => {
    const t = boot();
    assert.equal(t.run("suggestedSaveName({name:'Sem título.md',path:null})"), "Sem título.md");
    assert.equal(t.run("suggestedSaveName({name:'Sem título',path:null})"), "Sem título.txt");
    assert.equal(t.run("markdownNameFor('nota.txt')"), "nota.md");
  });
});
