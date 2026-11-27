"use strict";
/* Executar: roda o HTML/JS da guia atual em uma segunda aba do navegador. */
function isHtmlFile(name){return /\.(html?|xhtml|svg)$/i.test(name||"");}
function isJsFile(name){return /\.(m?js)$/i.test(name||"");}
function isPyFile(name){return /\.pyw?$/i.test(name||"");}
function isRunnableFile(name){return /\.(html?|xhtml|svg|m?js|pyw?|json|md|markdown|mdown?|css|txt|csv)$/i.test(name||"");}
function looksLikeHtml(src){return /<\s*(!doctype|html|head|body|script|style|div|p|h[1-6]|a|img|button)\b/i.test(src||"");}

function buildRunDoc(src,filename){
  if(isJsFile(filename)){
    var safe=String(src).replace(/<\/script/gi,"<\\/script");
    return "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>"+esc(filename||"script.js")+"</title>\n"
      +"<style>body{font-family:Consolas,monospace;margin:0;background:#111;color:#eee}"
      +"#log{white-space:pre-wrap;padding:12px;margin:0;min-height:40px;border-bottom:1px solid #333}"
      +"#app{padding:12px}.err{color:#ff7b7b}.warn{color:#ffd866}</style>\n</head>\n<body>\n"
      +"<pre id=\"log\"></pre><div id=\"app\"></div>\n<script>\n(function(){\n"
      +"var log=document.getElementById('log');\n"
      +"function line(args,cls){var d=document.createElement('div');if(cls)d.className=cls;"
      +"d.textContent=Array.prototype.map.call(args,function(a){try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}}).join(' ');log.appendChild(d);}\n"
      +"var _l=console.log,_w=console.warn,_e=console.error;\n"
      +"console.log=function(){line(arguments,'');_l&&_l.apply(console,arguments);};\n"
      +"console.warn=function(){line(arguments,'warn');_w&&_w.apply(console,arguments);};\n"
      +"console.error=function(){line(arguments,'err');_e&&_e.apply(console,arguments);};\n"
      +"window.onerror=function(m,s,l,c){line(['ERRO: '+m+' ('+l+':'+c+')'],'err');};\n"
      +"window.onunhandledrejection=function(e){line(['ERRO (promise): '+(e.reason&&e.reason.stack||e.reason||e)],'err');};\n"
      +"})();\n</scr"+"ipt>\n<script>\n"+safe+"\n</scr"+"ipt>\n</body>\n</html>";
  }
  return String(src);
}

function openRunInNewTab(){
  var t=cur();if(!t){updateStatus("Nada para executar");return;}
  if(tabs.indexOf(t)===active)t.content=editor.value;
  var src=t.content||"";
  function launch(){
    var doc=buildRunDoc(src,t.path||t.name||"");
    var blob;
    try{blob=new Blob([doc],{type:"text/html;charset=utf-8"});}
    catch(e){updateStatus("Falha ao executar");return;}
    var url=URL.createObjectURL(blob);
    var w=null;
    try{w=window.open(url,"_blank");}catch(e){w=null;}
    if(!w||w.closed||typeof w.closed==="undefined"){
      openRunBlocked(url,doc);
      updateStatus("Pop-up bloqueado: use o botão Abrir");
    }else{
      updateStatus("Executando em nova aba: "+(t.path||t.name));
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},60000);
    }
    scheduleSessionSave();
  }
  if(!isRunnableFile(t.path||t.name)){
    if(looksLikeHtml(src)){
      dlg("<h2>Executar página</h2><p>A guia atual não termina em <b>.html</b> ou <b>.js</b>, mas o conteúdo parece HTML. Deseja executar mesmo assim?</p>"
        +"<div class='row'><button class='btn primary' id='rGo'>Executar</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
      $("rGo").onclick=function(){closeDlg();launch();};
      return;
    }
    dlg("<h2>Executar página</h2><p>Para executar, renomeie a guia para <b>.html</b> (página) ou <b>.js</b> (script com console na tela). Ex.: <b>teste.html</b>.</p>"
      +"<div class='row'><button class='btn' id='rRename'>Renomear guia</button><button class='btn primary' id='rForce'>Executar mesmo assim</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
    $("rForce").onclick=function(){closeDlg();launch();};
    $("rRename").onclick=function(){closeDlg();openExtDialog();};
    return;
  }
  launch();
}

function openRunBlocked(url,doc){
  var safe=String(doc).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  dlg("<h2>Executar página</h2><p>O navegador bloqueou a nova aba. Abra manualmente ou veja a prévia abaixo.</p>"
    +"<div class='row' style='justify-content:flex-start'><a class='btn primary' id='rLink' href='"+url+"' target='_blank' rel='noopener' style='text-decoration:none;line-height:22px'>Abrir em nova aba</a>"
    +"<button class='btn' onclick='closeDlg()'>Fechar</button></div>"
    +"<div class='field'><label>Prévia embutida (scripts isolados)</label>"
    +"<iframe id='rFrame' class='run-frame' sandbox='allow-scripts' title='Prévia'></iframe></div>");
  var f=$("rFrame");
  if(f){f.src=url;}
  void safe;
}

/* Painel Executar com prévia: HTML, JS, Python, JSON, Markdown, CSS e texto. */
var RUN_LANGS=[["auto","Automática"],["html","HTML"],["javascript","JavaScript"],["python","Python"],["json","JSON"],["markdown","Markdown"],["css","CSS"],["csv","CSV"],["texto","Texto"]];
function runExtOf(name){var m=String(name||"").match(/\.([a-z0-9]+)$/i);return m?m[1].toLowerCase():"";}
function detectRunLang(name,src){
  var ext=runExtOf(name);
  if(ext==="html"||ext==="htm"||ext==="xhtml"||ext==="svg")return "html";
  if(ext==="js"||ext==="mjs")return "javascript";
  if(ext==="py"||ext==="pyw")return "python";
  if(ext==="json")return "json";if(ext==="csv")return "csv";
  if(ext==="md"||ext==="markdown"||ext==="mdown"||ext==="mkd")return "markdown";
  if(ext==="css")return "css";
  if(looksLikeHtml(src))return "html";
  if(/^\s*[\[{]/.test(src||"")){try{JSON.parse(src);return "json";}catch(e){}}
  return "texto";
}
function runPanelLog(msg){
  var l=$("rLog");if(!l)return;
  if(l.getAttribute&&l.getAttribute("data-init")){l.textContent="";l.removeAttribute("data-init");}
  l.textContent+=(l.textContent?"\n":"")+String(msg);
}
function runPanelPreview(html,showFrame,src){
  var w=$("rPrevWrap"),fr=$("rFrame"),pv=$("rPrev");
  if(w)w.style.display="block";
  if(fr)fr.style.display=showFrame?"block":"none";
  if(pv)pv.style.display=showFrame?"none":"block";
  if(showFrame&&fr){
    try{if(fr._url)URL.revokeObjectURL(fr._url);}catch(e){}
    var url=null;
    try{url=URL.createObjectURL(new Blob([src],{type:"text/html;charset=utf-8"}));fr._url=url;fr.src=url;}catch(e){fr.removeAttribute("src");if(pv){pv.style.display="block";pv.textContent="Não foi possível montar a prévia.";}}
  }else if(pv){pv.innerHTML=html||"<em>(vazio)</em>";}
}
function runJsPreview(code){
  runPanelLog("Executando JavaScript...");
  function fmt(v){try{return typeof v==="string"?v:JSON.stringify(v);}catch(e){return String(v);}}
  var cons={log:function(){runPanelLog([].map.call(arguments,fmt).join(" "));},
    info:function(){runPanelLog([].map.call(arguments,fmt).join(" "));},
    warn:function(){runPanelLog("AVISO: "+[].map.call(arguments,fmt).join(" "));},
    error:function(){runPanelLog("ERRO: "+[].map.call(arguments,fmt).join(" "));}};
  var done=function(v){if(v!==undefined)runPanelLog("=> "+fmt(v));runPanelLog("— fim —");};
  var fail=function(e){runPanelLog("ERRO: "+((e&&e.stack&&String(e.stack).split("\n")[0])||(e&&e.message)||e));};
  try{
    var fn=new Function("console","return (async function(){\n"+code+"\n})()");
    var r=fn(cons);
    if(r&&typeof r.then==="function")r.then(done,fail);else done(r);
  }catch(e){fail(e);}
}
var _pyodide=null,_pyLoading=null;
function ensurePyodide(){
  if(_pyodide)return Promise.resolve(_pyodide);
  if(_pyLoading)return _pyLoading;
  _pyLoading=new Promise(function(res,rej){
    try{
      if(typeof loadPyodide!=="undefined"){res(loadPyodide());return;}
    }catch(e){rej(e);return;}
    var s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
    s.onload=function(){try{res(loadPyodide());}catch(e){rej(e);}};
    s.onerror=function(){rej(new Error("download"));};
    document.head.appendChild(s);
  }).then(function(p){_pyodide=p;return p;},function(e){_pyLoading=null;throw e;});
  return _pyLoading;
}
function runPythonPreview(code){
  runPanelLog("Carregando Python (Pyodide, precisa de internet na 1ª vez)...");
  ensurePyodide().then(function(py){
    try{
      if(py.setStdout)py.setStdout({batched:function(s){if(s)runPanelLog(s);}});
      if(py.setStderr)py.setStderr({batched:function(s){if(s)runPanelLog("ERRO: "+s);}});
      var r=py.runPython(code);
      if(r!==undefined)runPanelLog("=> "+String(r));
      runPanelLog("— fim —");
    }catch(e){runPanelLog("ERRO: "+((e&&e.message)||e));}
  }).catch(function(){runPanelLog("Não foi possível carregar o Python aqui (sem internet ou CDN bloqueado).");});
}
function runPanelGo(){
  var t=cur();if(!t)return;
  var langEl=$("rLang"),codeEl=$("rCode");
  var lang=langEl?langEl.value:"auto",code=codeEl?codeEl.value:"";
  if(lang==="auto")lang=detectRunLang(t.path||t.name,code);
  if(lang==="javascript"){runPanelPreview("",false,"");$("rPrevWrap").style.display="block";runJsPreview(code);}
  else if(lang==="python")runPythonPreview(code);
  else if(lang==="html"){runPanelLog("Prévia HTML carregada abaixo.");runPanelPreview("",true,code);}
  else if(lang==="json"){
    try{var v=JSON.parse(code);runPanelLog(JSON.stringify(v,null,2));}
    catch(e){runPanelLog("ERRO: JSON inválido ("+((e&&e.message)||e)+")");}
    runPanelPreview("",false,"");
  }
  else if(lang==="csv"){
    runPanelLog("Prévia CSV abaixo ("+code.split("\n").length+" linhas).");
    runPanelPreview(typeof csvRender==="function"?csvRender(code):esc(code),false,"");
  }
  else if(lang==="markdown"){
    var full=(typeof resolveAttachments==="function")?resolveAttachments(code,t):code;
    runPanelLog("Prévia Markdown abaixo ("+code.split("\n").length+" linhas).");
    runPanelPreview(typeof mdRender==="function"?mdRender(full):esc(full),false,"");
  }
  else if(lang==="css"){
    runPanelPreview("",true,"<!doctype html><html><head><meta charset='utf-8'><style>"+code+"</style></head><body><h1>Prévia CSS</h1><p>Parágrafo de exemplo com o estilo da nota.</p><button>Botão</button></body></html>");
    runPanelLog("Prévia CSS aplicada ao modelo abaixo.");
  }
  else{
    var n=code.length,ln=code?code.split("\n").length:1;
    runPanelLog("Texto: "+n+" caracteres em "+ln+(ln===1?" linha":" linhas")+".");
    runPanelLog(code.slice(0,2000)+(code.length>2000?"\n…":""));
    runPanelPreview("",false,"");
  }
  scheduleSessionSave();
}
function openRunPanel(){
  var t=cur();if(!t){updateStatus("Nada para executar");return;}
  if(tabs.indexOf(t)===active)t.content=editor.value;
  var src=t.content||"",auto=detectRunLang(t.path||t.name,src);
  var opts=RUN_LANGS.map(function(p){return "<option value='"+p[0]+"'"+(p[0]==="auto"?" selected":"")+">"+p[1]+(p[0]==="auto"?" ("+auto+")":"")+"</option>";}).join("");
  dlg("<h2>Executar com prévia</h2><p>Nota: <b>"+esc(t.path||t.name||"Sem título")+"</b> • linguagem detectada: <b>"+esc(auto)+"</b></p>"
    +"<div class='field'><label>Linguagem</label><select id='rLang'>"+opts+"</select></div>"
    +"<div class='field'><label>Código</label><textarea id='rCode' rows='10'>"+esc(src).replace(/<\/textarea/gi,"&lt;/textarea")+"</textarea></div>"
    +"<div class='row' style='justify-content:flex-start'><button class='btn primary' id='rGo'>▶ Executar</button><button class='btn' id='rTab'>Nova aba</button><button class='btn' onclick='closeDlg()'>Fechar</button></div>"
    +"<div class='field'><label>Saída</label><pre id='rLog' class='run-log' data-init='1'>Clique em Executar.</pre></div>"
    +"<div class='field' id='rPrevWrap' style='display:none'><label>Prévia</label><iframe id='rFrame' class='run-frame' sandbox='allow-scripts' style='display:none' title='Prévia'></iframe><div id='rPrev' class='cprev' style='display:none'></div></div>");
  $("rGo").onclick=function(){runPanelGo();};
  $("rTab").onclick=function(){closeDlg();openRunInNewTab();};
}
