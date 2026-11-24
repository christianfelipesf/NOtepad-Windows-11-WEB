// Cobre: anexo de arquivo genérico no Markdown (link + legenda de data),
// legenda também nas imagens, compactação de data: antigo e título da guia.
// Roda com: node --test tests/md-file-attachments.test.js
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

describe("anexo de arquivo genérico no markdown", () => {
  it("arquivo grande vira link curto com legenda de data", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    const big = "data:application/pdf;base64," + "C".repeat(2000);
    t.run(`insertMarkdownFile(${JSON.stringify(big)},'relatorio.pdf')`);
    const val = t.run("editor.value");
    assert.ok(val.length < 160, "editor fica curto, sem o base64 gigante");
    assert.doesNotMatch(val, /CCCC/);
    assert.match(val, /\[relatorio\.pdf\]\(relatorio[a-z0-9.-]*\.pdf\)/);
    assert.match(val, /\*Colado em .+\*/);
    assert.equal(t.run("Object.keys(cur().attachments).length"), 1);
    t.run("renderPreview()");
    const html = t.box.document.getElementById("preview").innerHTML;
    assert.match(html, /<a /);
    assert.match(html, /relatorio\.pdf/);
    assert.match(html, /Colado em/);
  });

  it("arquivo pequeno continua inline com legenda", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    t.run("insertMarkdownFile('data:text/plain;base64,QQ==','nota.txt')");
    assert.match(t.run("editor.value"), /\[nota\.txt\]\(data:text\/plain;base64,QQ==\)/);
    assert.match(t.run("editor.value"), /\*Colado em .+\*/);
    assert.equal(t.run("Object.keys(cur().attachments||{}).length"), 0);
  });

  it("imagem também ganha legenda de data embaixo", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    const val = t.run("editor.value");
    assert.match(val, /!\[foto\]\(data:image\/png;base64,AAA\)\n\*Colado em .+\*\n/);
    t.run("renderPreview()");
    assert.match(t.box.document.getElementById("preview").innerHTML, /Colado em/);
  });

  it("data: genérico antigo é compactado ao abrir", () => {
    const t = boot();
    const big = "data:application/pdf;base64," + "D".repeat(2000);
    t.run(`cur().content='veja [doc](${big}) fim';`);
    t.run("syncEditor()");
    assert.ok(t.run("editor.value.length") < 120);
    assert.doesNotMatch(t.run("editor.value"), /DDDD/);
    assert.match(t.run("editor.value"), /\[doc\]\(doc[a-z0-9.-]*\.pdf\)/);
    assert.equal(t.run("Object.keys(cur().attachments).length"), 1);
  });

  it("legenda não vira título da guia", () => {
    const t = boot();
    t.run("newTab()");
    t.run("editor.value='![foto](foto.png)\\n*Colado em 01/01/2026, 10:00*\\n';renderTabs()");
    assert.equal(t.run("cur().name"), t.run("cur().fallback"));
  });

  it("arquivo em nota sem .md pergunta se converte", () => {
    const t = boot();
    assert.equal(t.run("isMarkdownFile(cur().name)"), false);
    t.run("insertMarkdownFile('data:text/plain;base64,QQ==','nota.txt')");
    assert.match(t.box.document.getElementById("dlgBox").innerHTML, /Converter para \.md/);
    assert.equal(t.run("cur().name"), "Sem título");
  });
});
