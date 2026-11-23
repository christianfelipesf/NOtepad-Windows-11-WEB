// Cobre: imagem colada vira referência curta, detecção de linguagem do
// painel Executar, JS executado com saída, e troca de extensão.
// Roda com: node --test tests/run-attachments-ext.test.js
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe("imagem colada vira referência curta", () => {
  it("url pequena continua inline", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    t.run("insertMarkdownImage('data:image/png;base64,AAA','foto')");
    assert.match(t.run("editor.value"), /!\[foto\]\(data:image\/png;base64,AAA\)/);
    assert.equal(t.run("Object.keys(cur().attachments||{}).length"), 0);
  });

  it("url longa vira nome curto e a prévia resolve", () => {
    const t = boot();
    t.run("newTab('nota.md')");
    const big = "data:image/png;base64," + "A".repeat(2000);
    t.run(`insertMarkdownImage(${JSON.stringify(big)},'foto')`);
    const val = t.run("editor.value");
    assert.ok(val.length < 100, "editor fica curto, sem o base64 gigante");
    assert.doesNotMatch(val, /AAAA/);
    assert.match(val, /!\[foto\]\(foto[a-z0-9.-]*\.png\)/);
    assert.equal(t.run("Object.keys(cur().attachments).length"), 1);
    assert.equal(t.run("resolveAttachments(editor.value,cur())"), `![foto](${big})\n`);
    t.run("renderPreview()");
    assert.match(t.box.document.getElementById("preview").innerHTML, /<img/);
  });

  it("nota antiga com base64 gigante é compactada ao abrir", () => {
    const t = boot();
    const big = "data:image/png;base64," + "B".repeat(2000);
    t.run(`cur().content='olha ![foto](${big}) fim';`);
    t.run("syncEditor()");
    assert.ok(t.run("editor.value.length") < 100);
    assert.equal(t.run("Object.keys(cur().attachments).length"), 1);
  });
});

describe("painel executar", () => {
  it("detecta a linguagem pelo nome e pelo conteúdo", () => {
    const t = boot();
    assert.equal(t.run("detectRunLang('a.py','x=1')"), "python");
    assert.equal(t.run("detectRunLang('a.js','1')"), "javascript");
    assert.equal(t.run("detectRunLang('a.html','oi')"), "html");
    assert.equal(t.run("detectRunLang('a.md','# t')"), "markdown");
    assert.equal(t.run("detectRunLang('sem-ext','{\"a\":1}')"), "json");
    assert.equal(t.run("detectRunLang('a.txt','<div>x</div>')"), "html");
  });

  it("roda javascript e mostra console + retorno", async () => {
    const t = boot();
    t.run("newTab('s.js')");
    t.run("openRunPanel()");
    t.box.document.getElementById("rCode").value = "console.log('ola'); return 40+2";
    t.box.document.getElementById("rLang").value = "javascript";
    t.run("runPanelGo()");
    await sleep(50);
    const out = t.box.document.getElementById("rLog").textContent;
    assert.match(out, /ola/);
    assert.match(out, /42/);
  });

  it("salvar mantém .py e outras extensões", () => {
    const t = boot();
    assert.equal(t.run("suggestedSaveName({name:'a.py',path:null})"), "a.py");
    assert.equal(t.run("suggestedSaveName({name:'a',path:null})"), "a.txt");
  });

  it("troca a extensão pela barra de status", () => {
    const t = boot();
    t.run("newTab('rascunho.txt')");
    const wired = t.box.document.getElementById("stExt").onclick;
    assert.equal(typeof wired, "function");
    wired();
    t.box.document.getElementById("eBase").value = "rascunho";
    t.box.document.getElementById("eExt").value = ".py";
    t.box.document.getElementById("eOk").onclick();
    assert.equal(t.run("cur().name"), "rascunho.py");
    assert.equal(t.box.document.getElementById("stExt").textContent, ".py");
    assert.equal(t.run("detectRunLang(cur().name,'x=1')"), "python");
  });

  it("esc protege aspas simples nos diálogos", () => {
    const t = boot();
    assert.equal(t.run("esc(\"a'b\\\"<>&\")"), "a&#39;b&quot;&lt;&gt;&amp;");
  });
});

describe("instalação e cache", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

  it("sem botão play no menubar", () => {
    assert.doesNotMatch(html, /id="btnRun"/);
    assert.doesNotMatch(html, /class="play"/);
  });

  it("service worker guarda todos os js/css da página", () => {
    const refs = new Set();
    for (const m of html.matchAll(/(?:src|href)="(js\/[^"]+|css\/[^"]+)"/g)) refs.add("./" + m[1]);
    assert.ok(refs.size > 0);
    for (const r of refs) assert.ok(sw.includes('"' + r + '"'), r + " fora do SHELL");
    const ver = sw.match(/APP_VERSION\s*=\s*"([^"]+)"/)[1];
    assert.ok(sw.includes('"' + "renotepad-" + ver + '"'), "CACHE acompanha APP_VERSION");
  });
});
