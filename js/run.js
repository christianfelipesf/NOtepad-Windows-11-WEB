"use strict";
/* Executar: roda o HTML/JS da guia atual em uma segunda aba do navegador. */
function isHtmlFile(name){return /\.(html?|xhtml|svg)$/i.test(name||"");}
function isJsFile(name){return /\.(m?js)$/i.test(name||"");}
function isRunnableFile(name){return isHtmlFile(name)||isJsFile(name);}
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
    $("rRename").onclick=function(){closeDlg();openProps();};
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
