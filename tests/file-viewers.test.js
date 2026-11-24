// Cobre: visualizadores de imagem, PDF, arquivo binário genérico, ZIP,
// tabela CSV e prévia HTML lado a lado.
// Roda com: node --test tests/file-viewers.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["js/core.js", "js/encoding.js", "js/zip.js", "js/markdown.js",
  "js/tabs.js", "js/editor.js", "js/ui.js", "js/run.js",
  "js/viewers.js", "js/main.js"];

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
    TextDecoder,
    TextEncoder,
    Blob: function (parts) { this.parts = parts || []; this.size = 0; },
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

// Monta um .zip STORE mínimo (sem compactação) para os testes.
function storeZip(files) {
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let off = 0;
  files.forEach((f) => {
    const nb = enc.encode(f.name);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0, true);
    h.setUint32(14, 0, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true);
    h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    chunks.push(new Uint8Array(h.buffer), nb, f.data);
    central.push({ nb, size: f.data.length, offset: off });
    off += 30 + nb.length + f.data.length;
  });
  const cdStart = off, cd = [];
  central.forEach((c) => {
    const h = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x02014b50, true); h.setUint16(4, 20, true); h.setUint16(6, 20, true);
    h.setUint16(8, 0x0800, true); h.setUint16(10, 0, true);
    h.setUint16(12, 0, true); h.setUint16(14, 0, true);
    h.setUint32(16, 0, true); h.setUint32(20, c.size, true); h.setUint32(24, c.size, true);
    h.setUint16(28, c.nb.length, true); h.setUint16(30, 0, true); h.setUint16(32, 0, true);
    h.setUint16(34, 0, true); h.setUint16(36, 0, true); h.setUint32(38, 0, true);
    h.setUint32(42, c.offset, true);
    cd.push(new Uint8Array(h.buffer), c.nb);
    off += 46 + c.nb.length;
  });
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, central.length, true); end.setUint16(10, central.length, true);
  end.setUint32(12, off - cdStart, true); end.setUint32(16, cdStart, true); end.setUint16(20, 0, true);
  const out = new Uint8Array(off + 22);
  let p = 0;
  [...chunks, ...cd, new Uint8Array(end.buffer)].forEach((c) => { out.set(c, p); p += c.length; });
  return out;
}

describe("visualizadores de arquivo", () => {
  it("imagem aberta direto vira guia de visualização", () => {
    const t = boot();
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01, 0x02]);
    t.run("openFileObject({name:'foto.png'},new Uint8Array(" + JSON.stringify([...png]) + ").buffer)");
    assert.equal(t.run("cur().path"), "foto.png");
    assert.equal(t.run("cur().bin.kind"), "image");
    assert.match(t.box.document.getElementById("preview").innerHTML, /<img/);
  });

  it("PDF aberto direto vira guia com iframe", () => {
    const t = boot();
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x0A, 0x25, 0x00, 0x01];
    t.run("openFileObject({name:'doc.pdf'},new Uint8Array(" + JSON.stringify(pdf) + ").buffer)");
    assert.equal(t.run("cur().bin.kind"), "pdf");
    assert.match(t.box.document.getElementById("preview").innerHTML, /<iframe/);
  });

  it("binário desconhecido vira guia com download, sem alerta", () => {
    const t = boot();
    t.run("openFileObject({name:'run.exe'},new Uint8Array([0x4D,0x5A,0x00,0x01]).buffer)");
    assert.equal(t.run("cur().bin.kind"), "file");
    assert.match(t.box.document.getElementById("preview").innerHTML, /Baixar/);
  });

  it("CSV abre como texto e rende tabela", () => {
    const t = boot();
    const raw = Array.from("nome;idade\nAna;30\nBeto;25").map((c) => c.charCodeAt(0));
    t.run("openFileObject({name:'dados.csv'},new Uint8Array(" + JSON.stringify(raw) + ").buffer)");
    assert.equal(t.run("cur().bin"), undefined);
    t.run("renderPreview()");
    const html = t.box.document.getElementById("preview").innerHTML;
    assert.match(html, /<table/);
    assert.match(html, /Ana/);
    assert.match(t.run("csvRender('a;b\\n1;2')"), /<th>a<\/th>/);
  });

  it("HTML aberto direto mostra prévia renderizada", () => {
    const t = boot();
    t.run("newTab('pag.html')");
    t.run("editor.value='<h1>oi</h1>';renderPreview()");
    assert.match(t.box.document.getElementById("preview").innerHTML, /<iframe/);
  });

  it("ZIP lista itens e abre texto interno", () => {
    const t = boot();
    const zb = storeZip([{ name: "oi.txt", data: new TextEncoder().encode("hello") }]);
    t.run("openViewerTab({name:'z.zip'},new Uint8Array(" + JSON.stringify([...zb]) + ").buffer,'zip')");
    assert.equal(t.run("cur().bin.entries.length"), 1);
    assert.equal(t.run("cur().bin.entries[0].name"), "oi.txt");
    assert.match(t.box.document.getElementById("preview").innerHTML, /oi\.txt/);
    t.run("openZipEntry(cur(),0)");
    assert.match(t.run("cur().content"), /hello/);
  });

  it("ZIP só de imagens vira lista, sem explodir guias", () => {
    const t = boot();
    const zb = storeZip([
      { name: "a.png", data: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00]) },
      { name: "b.jpg", data: new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]) }
    ]);
    const before = t.run("tabs.length");
    t.run("openFileObject({name:'fotos.zip'},new Uint8Array(" + JSON.stringify([...zb]) + ").buffer)");
    assert.equal(t.run("cur().bin.kind"), "zip");
    assert.equal(t.run("cur().bin.entries.length"), 2);
    assert.equal(t.run("tabs.length"), before + 1);
  });

  it("sessão guarda o visualizador", () => {
    const t = boot();
    t.run("openFileObject({name:'foto.png'},new Uint8Array([0x89,0x50,0x4E,0x47,0x00]).buffer)");
    t.run("saveSession()");
    const ses = JSON.parse(t.box.localStorage.getItem("renotepad2.session"));
    assert.equal(ses.tabs[ses.active].bin.kind, "image");
  });
});
