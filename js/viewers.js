"use strict";
/* Visualizadores: imagem, PDF, áudio/vídeo, ZIP, tabela CSV e prévia HTML.
   Guias de visualização (t.bin) são só-leitura; o texto continua no editor. */
var BIN_PERSIST_LIMIT = 1000000;
function detectBinKind(name, u8) {
  var n = String(name || "").toLowerCase();
  var m = n.match(/\.([a-z0-9]{1,10})$/);
  var ext = m ? m[1] : "";
  var img = { png: 1, jpg: 1, jpeg: 1, gif: 1, webp: 1, bmp: 1, ico: 1, avif: 1 };
  if (img[ext]) return "image";
  if (ext === "pdf") return "pdf";
  if ({ mp3: 1, wav: 1, ogg: 1, oga: 1, opus: 1, m4a: 1, flac: 1, mid: 1, midi: 1 }[ext]) return "audio";
  if ({ mp4: 1, webm: 1, ogv: 1, mov: 1, m4v: 1 }[ext]) return "video";
  if ({ txt: 1, md: 1, markdown: 1, mdown: 1, mkd: 1, json: 1, csv: 1, html: 1, htm: 1, xhtml: 1, svg: 1, css: 1, js: 1, mjs: 1, py: 1, pyw: 1, xml: 1, log: 1, ini: 1, yml: 1, yaml: 1, toml: 1 }[ext]) return null;
  if (u8 && u8.length >= 4) {
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) return "image";
    if (u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF) return "image";
    if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) return "image";
    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return "image";
    if (u8[0] === 0x42 && u8[1] === 0x4D) return "image";
    if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return "pdf";
  }
  if (u8 && u8.indexOf(0) >= 0) return "file";
  return null;
}
function binMimeFor(kind, ext) {
  var map = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon", avif: "image/avif", pdf: "application/pdf", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", m4a: "audio/mp4", flac: "audio/flac", mid: "audio/midi", midi: "audio/midi", mp4: "video/mp4", webm: "video/webm", ogv: "video/ogg", mov: "video/quicktime", m4v: "video/x-m4v" };
  return map[ext] || (kind === "image" ? "image/png" : kind === "audio" ? "audio/mpeg" : kind === "video" ? "video/mp4" : "application/octet-stream");
}
function isViewerTab(t) { return !!(t && t.bin && t.bin.kind); }
function humanSize(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + " B";
  if (n < 1048576) return (Math.round(n / 102.4) / 10) + " KB";
  return (Math.round(n / 104857.6) / 10) + " MB";
}
function dataUrlToBlob(du) {
  var m = String(du || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!m) throw new Error("dataURL inválida");
  var mime = m[1] || "application/octet-stream", data = m[3];
  if (m[2]) {
    var bin = atob(data), bytes = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(data)], { type: mime });
}
function binForSave(t) {
  if (!t || !t.bin) return null;
  var b = t.bin;
  return { kind: b.kind, size: b.size || 0, mime: b.mime || "application/octet-stream",
    dataUrl: b.dataUrl || null, entries: b.entries || null };
}
function viewerUrl(t) {
  var b = t && t.bin;
  if (!b) return null;
  if (b.buf) {
    if (b._buf !== b.buf || !b.url) {
      try { if (b.url) URL.revokeObjectURL(b.url); } catch (e) {}
      try { b.url = URL.createObjectURL(new Blob([b.buf], { type: b.mime || "application/octet-stream" })); }
      catch (e) { return b.url || null; }
      b._buf = b.buf;
    }
    return b.url;
  }
  if (b.dataUrl && b._du !== b.dataUrl) {
    try {
      if (b.url) { try { URL.revokeObjectURL(b.url); } catch (e) {} }
      b.url = URL.createObjectURL(dataUrlToBlob(b.dataUrl));
      b._du = b.dataUrl;
    } catch (e) { return b.url || null; }
  }
  return b.url || null;
}
function openViewerTab(file, buf, kind) {
  var fname = String((file && file.name) || "arquivo");
  for (var k = 0; k < tabs.length; k++) {
    if (tabs[k].bin && tabs[k].path === fname) {
      active = k; syncEditor(); renderTabs(); updateStatus(); scheduleSessionSave(); return tabs[k];
    }
  }
  untitledN++;
  var xm = fname.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  var now = Date.now();
  var t = { name: fname, fallback: fname, path: fname, handle: (file && file.handle) || null, content: "", modified: false,
    encoding: "UTF-8", eol: "CRLF", createdAt: now, updatedAt: now, attachments: {},
    bin: { kind: kind, size: buf.byteLength, mime: binMimeFor(kind, xm ? xm[1] : ""), buf: buf, url: null, dataUrl: null, entries: null } };
  if (kind === "zip" && typeof listZipEntries === "function") {
    try { t.bin.entries = listZipEntries(new Uint8Array(buf)); }
    catch (e) { t.bin.entries = null; }
  }
  try { t.bin.url = URL.createObjectURL(new Blob([buf], { type: t.bin.mime })); } catch (e) { t.bin.url = null; }
  if (buf.byteLength <= BIN_PERSIST_LIMIT && typeof FileReader !== "undefined") {
    try {
      var rd = new FileReader();
      rd.onload = function () { t.bin.dataUrl = String(rd.result || ""); scheduleSessionSave(); };
      rd.readAsDataURL(new Blob([buf], { type: t.bin.mime }));
    } catch (e) {}
  }
  tabs.push(t); active = tabs.length - 1;
  syncEditor(); renderTabs(); updateStatus("Visualizando: " + fname); scheduleSessionSave();
  return t;
}
function openZipViewer(file, buf) { return openViewerTab(file, buf, "zip"); }
function openZipEntry(t, i) {
  var b = t && t.bin;
  if (!b || !b.buf || !b.entries || !b.entries[i]) return;
  var e = b.entries[i];
  if (e.method !== 0 || typeof zipExtractStore !== "function") { updateStatus("Extração indisponível para este item"); return; }
  try {
    var raw = zipExtractStore(new Uint8Array(b.buf), e);
    var base = String(e.name || "arquivo").replace(/^.*\//, "") || "arquivo";
    openFileObject({ name: base }, raw.buffer);
  } catch (err) { updateStatus("Não foi possível extrair: " + ((err && err.message) || err)); }
}
function downloadViewerTab(t) {
  var url = viewerUrl(t);
  if (!url) { updateStatus("Não foi possível montar o download"); return; }
  try {
    var a = document.createElement("a");
    a.href = url; a.download = t.path || t.name || "arquivo";
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { a.remove(); } catch (e) {} }, 4000);
  } catch (e) { updateStatus("Não foi possível baixar o arquivo"); }
}
function zipViewerHtml(t) {
  var es = t.bin.entries;
  if (!es) return "<p><em>Não foi possível listar este .zip (arquivo inválido ou formato não suportado).</em></p>";
  if (!es.length) return "<p><em>ZIP vazio.</em></p>";
  var rows = es.map(function (e, i) {
    var canOpen = !!t.bin.buf && e.method === 0 && typeof zipExtractStore === "function";
    var btn = canOpen ? " <button class=\"btn zopen\" data-i=\"" + i + "\">Abrir</button>" : "";
    var how = e.method === 0 ? "leitura direta" : "compactado (só nomes)";
    var nm = esc(String(e.name || "").replace(/\/$/, "").split("/").pop() || e.name);
    return "<tr><td>" + nm + "</td><td>" + humanSize(e.size) + "</td><td>" + how + btn + "</td></tr>";
  }).join("");
  return "<table class=\"vzip\"><tr><th>Arquivo</th><th>Tamanho</th><th></th></tr>" + rows + "</table>"
    + (t.bin.buf ? "" : "<p><em>Reabra o arquivo para extrair itens.</em></p>");
}
function renderViewer(t) {
  if (!t || !t.bin) return;
  var url = viewerUrl(t), kind = t.bin.kind;
  var name = esc(t.path || t.name || "arquivo");
  var html = "<p class=\"vmeta\"><b>" + name + "</b> • " + humanSize(t.bin.size || 0) + " • só visualização <button class=\"btn vclose\">Fechar (Esc)</button></p>";
  if (kind === "image" && url) html += "<img class=\"vimg\" src=\"" + url + "\" alt=\"" + name + "\">";
  else if (kind === "pdf" && url) html += "<iframe class=\"vpdf\" title=\"" + name + "\" src=\"" + url + "\"></iframe>";
  else if (kind === "audio" && url) html += "<audio class=\"vaud\" controls src=\"" + url + "\"></audio>";
  else if (kind === "video" && url) html += "<video class=\"vvid\" controls src=\"" + url + "\"></video>";
  else if (kind === "zip") html += zipViewerHtml(t);
  else if (!url) html += "<p><em>Prévia indisponível: o conteúdo não coube no salvamento local. Abra o arquivo de novo.</em></p>";
  if (url) html += "<p><a class=\"btn\" href=\"" + url + "\" download=\"" + name + "\">Baixar arquivo</a></p>";
  preview.innerHTML = html;
  var _vt = t;
  Array.prototype.forEach.call(preview.querySelectorAll ? preview.querySelectorAll(".vclose") : [], function (b) {
    b.onclick = function () { var i = tabs.indexOf(_vt); if (i >= 0) closeTab(i); };
  });
  var btns = preview.querySelectorAll ? preview.querySelectorAll(".zopen") : [];
  Array.prototype.forEach.call(btns, function (b) {
    b.onclick = function () { openZipEntry(cur(), +b.getAttribute("data-i")); };
  });
}
function isCsvFile(name) { return /\.csv$/i.test(String(name || "")); }
function csvRender(text) {
  var lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return "<p><em>(vazio)</em></p>";
  var sample = lines.slice(0, 5).join("\n"), delim = ",", best = -1;
  [";", ",", "\t", "|"].forEach(function (d) {
    var c = sample.split(d).length;
    if (c > best) { best = c; delim = d; }
  });
  if (best < 2) delim = ",";
  function splitRow(row) {
    var out = [], cur = "", q = false, i, ch;
    for (i = 0; i < row.length; i++) {
      ch = row[i];
      if (q) {
        if (ch === '"') { if (row[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  var MAXR = 500, MAXC = 50, rows = lines.slice(0, MAXR).map(splitRow), ncol = 0;
  rows.forEach(function (r) { if (r.length > ncol) ncol = r.length; });
  ncol = Math.min(ncol, MAXC);
  function cell(v, tag) { return "<" + tag + ">" + esc(v) + "</" + tag + ">"; }
  var h = "<table class=\"vcsv\"><tr>" + rows[0].slice(0, ncol).map(function (v) { return cell(v, "th"); }).join("") + "</tr>";
  rows.slice(1).forEach(function (r) {
    h += "<tr>" + r.slice(0, ncol).map(function (v) { return cell(v, "td"); }).join("") + "</tr>";
  });
  h += "</table>";
  if (lines.length > MAXR) h += "<p><em>Mostrando " + MAXR + " de " + lines.length + " linhas.</em></p>";
  return h;
}
var _htmlUrl = null;
function renderHtmlPreview(src) {
  try { if (_htmlUrl) URL.revokeObjectURL(_htmlUrl); } catch (e) {}
  _htmlUrl = null;
  try {
    _htmlUrl = URL.createObjectURL(new Blob([String(src == null ? "" : src)], { type: "text/html;charset=utf-8" }));
    preview.innerHTML = "<iframe class=\"vhtml\" sandbox=\"\" title=\"Prévia HTML\" src=\"" + _htmlUrl + "\"></iframe>";
  } catch (e) { preview.innerHTML = "<p><em>Não foi possível montar a prévia.</em></p>"; }
}
