"use strict";
/* Guias: modelo, abrir/salvar/fechar e persistência de sessão. */
var tabs=[],active=0,untitledN=0;
var tabsEl=document.getElementById("tabs"),editor=document.getElementById("editor");
function cur(){return tabs[active];}
var dragTabIndex=-1;
function moveTab(from,to){
  if(from<0||to<0||from>=tabs.length||to>=tabs.length||from===to)return;
  var t=tabs.splice(from,1)[0];tabs.splice(to,0,t);
  if(active===from)active=to;else if(from<active&&active<=to)active--;else if(to<=active&&active<from)active++;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
}
function newTab(name,content){
  untitledN++;
  var fb=name||("Sem título"+(untitledN>1?" "+untitledN:""));
  var now=Date.now();var t={name:fb,fallback:fb,path:null,handle:null,content:content||"",modified:false,encoding:"UTF-8",eol:"CRLF",createdAt:now,updatedAt:now,attachments:{}};
  tabs.push(t);active=tabs.length-1;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
  return t;
}
function syncEditor(){
  var t=cur();if(!t)return;
  if(typeof compactTabImages==="function")compactTabImages(t);
  if(editor.value!==t.content)editor.value=t.content;
  try{var ae=tabsEl.children[active];if(ae&&ae.scrollIntoView)ae.scrollIntoView({block:"nearest"});}catch(e){}
  applyTheme();applyEditor();
}
function renderTabs(){
  var a=cur();
  if(a&&!a.path){
    var rawLines=editor.value.split("\n"),line="";
    for(var li=0;li<rawLines.length;li++){
      var cand=rawLines[li].replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\[[^\]]*\]\([^)]*\)/g,"").trim();
      if(!cand)continue;
      if(/^\*Colado em .+\*$/.test(cand))continue;
      if(/^data:[a-z]+\/[a-z0-9+.\-]+;base64,/i.test(cand))continue;
      if(cand.length>60&&cand.indexOf(" ")<0)cand=cand.slice(0,40);
      line=cand;break;
    }
    if(line.length>40)line=line.slice(0,40)+"…";
    var wantMd=(typeof isMarkdownFile==="function")&&(isMarkdownFile(a.name)||isMarkdownFile(a.fallback));
    if(wantMd&&line&&!isMarkdownFile(line))line=line+".md";
    if(wantMd&&!line&&!isMarkdownFile(a.fallback)&&isMarkdownFile(a.name))line=a.name;
    a.name=line||a.fallback||(wantMd?"Sem título.md":"Sem título");
  }
  tabsEl.innerHTML="";
  tabs.forEach(function(t,i){
    var d=document.createElement("div");
    d.className="tab"+(i===active?" active":"")+(t.modified?" modified":"");
    d.draggable=true;d.dataset.idx=i;
    d.title=t.name+"\nCriado: "+fmtDT(t.createdAt||Date.now())+"\nEditado: "+fmtDT(t.updatedAt||t.createdAt||Date.now());
    d.addEventListener("dragstart",function(ev){dragTabIndex=i;ev.dataTransfer.effectAllowed="move";try{ev.dataTransfer.setData("text/plain",String(i));}catch(e){}setTimeout(function(){d.classList.add("dragging");},0);});
    d.addEventListener("dragend",function(){dragTabIndex=-1;tabsEl.querySelectorAll(".tab").forEach(function(x){x.classList.remove("dragging");x.classList.remove("drop-before");x.classList.remove("drop-after");});});
    d.addEventListener("dragover",function(ev){if(dragTabIndex<0)return;ev.preventDefault();ev.dataTransfer.dropEffect="move";var r=d.getBoundingClientRect(),after=(ev.clientX-r.left)>r.width/2;d.classList.toggle("drop-before",!after);d.classList.toggle("drop-after",after);});
    d.addEventListener("dragleave",function(){d.classList.remove("drop-before");d.classList.remove("drop-after");});
    d.addEventListener("drop",function(ev){if(dragTabIndex<0)return;ev.preventDefault();var from=dragTabIndex,r=d.getBoundingClientRect(),after=(ev.clientX-r.left)>r.width/2,to=from< i?(after?i:i-1):(after?i+1:i);moveTab(from,Math.max(0,Math.min(to,tabs.length-1)));});
    var s=document.createElement("span");s.className="t";s.textContent=t.name;d.appendChild(s);
    var dot=document.createElement("span");dot.className="dot";d.appendChild(dot);
    var x=document.createElement("span");x.className="x";x.innerHTML='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';x.title="Fechar guia";
    x.onclick=function(e){e.stopPropagation();closeTab(i);};d.appendChild(x);
    d.onclick=function(){if(active!==i||editor.value!==cur().content){active=i;syncEditor();}else{active=i;}renderTabs();updateStatus();scheduleSessionSave();};
    d.onauxclick=function(e){if(e.button===1)closeTab(i);};
    tabsEl.appendChild(d);
  });
}
function markModified(){
  var t=cur();if(!t)return;
  t.content=editor.value;t.modified=true;t.updatedAt=Date.now();
  renderTabs();applyTheme();updateStatus();scheduleSessionSave();
}
function openFileObject(file,buf){
  if(buf.byteLength>=1073741824){alert("Arquivo de 1 GiB ou mais não suportado.");return;}
  if(/\.zip$/i.test((file&&file.name)||"")){return importZipData(buf);}
  var u8=new Uint8Array(buf),info=detectEncoding(u8),text=decodeBuf(u8,info),eol=detectEol(text),dotLog=text.slice(0,4)===".LOG";
  if(text.indexOf("\0")>=0){alert("Arquivo binário não suportado como texto: "+((file&&file.name)||"")+" — renomeie a nota para .md e arraste o arquivo para dentro dela para anexar.");return false;}
  for(var k=0;k<tabs.length;k++){if(tabs[k].path===file.name){active=k;if(!tabs[k].modified){tabs[k].content=text;tabs[k].encoding=info.enc;tabs[k].eol=eol;tabs[k].modified=false;if(dotLog){tabs[k].content=text+"\r\n"+stampNow()+"\r\n";tabs[k].modified=true;}}syncEditor();renderTabs();updateStatus();scheduleSessionSave();return tabs[k];}}
  untitledN++;
  var now2=Date.now();var t={name:file.name,path:file.name,handle:file.handle||null,content:text,modified:false,encoding:info.enc,eol:eol,createdAt:now2,updatedAt:now2,attachments:{}};
  if(dotLog){var ts="\r\n"+stampNow()+"\r\n";t.content=text+ts;t.modified=true;}
  tabs.push(t);active=tabs.length-1;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();return t;
}
function pickOpen(){
  if(window.showOpenFilePicker){
    window.showOpenFilePicker({multiple:true}).then(function(hs){
      hs.forEach(function(h){h.getFile().then(function(f){f.arrayBuffer().then(function(b){openFileObject({name:f.name,handle:h},b);});});});
    }).catch(function(){});
  }else{$("fileInput").click();}
}
function stampForSave(){
  if(!settings.stampOnSave)return;
  var line=(cur().eol==="LF"?"\n":"\r\n")+stampNow();
  editor.setSelectionRange(editor.value.length,editor.value.length);
  document.execCommand("insertText",false,line);
  markModified();
}
function suggestedSaveName(t){var n=t.path||t.name||"Sem título";if(/\.[a-z0-9]{1,10}$/i.test(n))return n;return n+".txt";}
function saveTab(i,withPicker){
  var t=tabs[i];if(!t)return Promise.resolve(false);
  stampForSave();
  var fullSrc=(typeof resolveAttachments==="function")?resolveAttachments(editor.value,t):editor.value;
  var body=toEol(fullSrc,t.eol),r=encodeContent(body,t.encoding),bytes=r.bytes;
  function done(ok,msg){
    if(!ok)return false;
    t.content=editor.value;t.modified=false;
    renderTabs();updateStatus(msg||("Salvo em "+stampNow()));scheduleSessionSave();
    return true;
  }
  if(r.lossy&&!confirm("Este arquivo contém caracteres Unicode que serão perdidos se salvo como ANSI. Continuar?"))return Promise.resolve(false);
  if(withPicker||!t.handle){
    if(window.showSaveFilePicker){
      return window.showSaveFilePicker({suggestedName:suggestedSaveName(t)}).then(function(h){
        return h.createWritable().then(function(w){return w.write(bytes).then(function(){return w.close();}).then(function(){
          t.handle=h;t.path=h.name||t.path||t.name;t.name=t.path;return done(true);});});
      }).catch(function(){return false;});
    }
  }else if(t.handle){
    return t.handle.createWritable().then(function(w){return w.write(bytes).then(function(){return w.close();}).then(function(){return done(true);});}).catch(function(){});
  }
  return Promise.resolve((function(){
    var blob=new Blob([bytes],{type:"text/plain"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=suggestedSaveName(t);document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
    return done(true);
  })());
}
function askSave(i){
  return new Promise(function(res){
    var t=tabs[i];
    dlg("<h2>RENotepad</h2><p>Deseja salvar as alterações em "+esc(t.path||t.name)+ "?</p><div class='row'><button class='btn primary' id='dSave'>Salvar arquivo</button><button class='btn' id='dVault'>Guardar no navegador</button><button class='btn' id='dNo'>Não salvar</button><button class='btn' id='dCancel'>Cancelar</button></div>");
    $("dSave").onclick=function(){closeDlg();saveTab(i,false).then(function(ok){res(ok?"save":"cancel");});};
    $("dNo").onclick=function(){closeDlg();res("nosave");};
    $("dVault").onclick=function(){closeDlg();if(tabs.indexOf(tabs[i])===active)tabs[i].content=editor.value;tabs[i].updatedAt=Date.now();vaultUpsert(tabs[i]);res("nosave");};
    $("dCancel").onclick=function(){closeDlg();res("cancel");};
  });
}
var CLOSED_KEY="renotepad2.closed";
var closedStack=[];
var closedVault=[];
function loadClosedVault(){try{var d=JSON.parse(localStorage.getItem(CLOSED_KEY)||"null");if(d&&Array.isArray(d.items))closedVault=d.items.filter(function(e){return e&&typeof e.content==="string";});}catch(e){closedVault=[];}return closedVault;}
function saveClosedVault(){try{closedVault=closedVault.slice(-50);localStorage.setItem(CLOSED_KEY,JSON.stringify({v:1,items:closedVault}));return true;}catch(e){return false;}}
function vaultEntryOf(t){return {id:"c"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36),name:t.name||"Sem título",path:t.path||null,content:t.content||"",encoding:t.encoding||"UTF-8",eol:t.eol||"CRLF",createdAt:t.createdAt||Date.now(),updatedAt:t.updatedAt||t.createdAt||Date.now(),closedAt:Date.now(),origName:t.origName||null,origPath:t.origPath||null,attachments:Object.assign({},t.attachments||{})};}
function vaultUpsert(t){function touch(e){e.content=t.content;e.updatedAt=Date.now();e.closedAt=Date.now();e.name=t.name;e.path=t.path;e.attachments=Object.assign({},t.attachments||{});if(t.origName)e.origName=t.origName;if(t.origPath)e.origPath=t.origPath;saveClosedVault();t.vaultId=e.id;return e;}if(t.vaultId){for(var j=0;j<closedVault.length;j++){if(closedVault[j].id===t.vaultId)return touch(closedVault[j]);}t.vaultId=null;}var key=t.path||t.name;for(var k=0;k<closedVault.length;k++){if((closedVault[k].path||closedVault[k].name)===key)return touch(closedVault[k]);}var e=vaultEntryOf(t);closedVault.push(e);saveClosedVault();t.vaultId=e.id;return e;}
function vaultSaveTab(i){var t=tabs[i];if(!t)return null;if(tabs.indexOf(t)===active)t.content=editor.value;t.updatedAt=Date.now();var e=vaultUpsert(t);renderTabs();updateStatus("Guardada no navegador: "+t.name);scheduleSessionSave();return e;}
function vaultSaveAll(){if(!tabs.length)return 0;if(tabs.indexOf(cur())===active)cur().content=editor.value;var n=0;tabs.forEach(function(t){t.updatedAt=t.updatedAt||Date.now();vaultUpsert(t);n++;});updateStatus(n+(n===1?" guia guardada no navegador":" guias guardadas no navegador"));return n;}
function vaultKeepCount(){var n=0;tabs.forEach(function(x){var body=(tabs.indexOf(x)===active)?editor.value:(x.content||"");if(x.path||String(body).length>0)n++;});return n;}
function confirmVaultClear(){
  var t=cur();if(!tabs.length||!t)return;
  var n=vaultKeepCount();
  var msg=n?(n===1?"Guardar <b>1 guia</b> no navegador, fechar todas e começar do zero?":"Guardar <b>"+n+" guias</b> no navegador, fechar todas e começar do zero?")
    :"Nenhuma guia tem conteúdo para guardar. Fechar tudo e começar do zero?";
  dlg("<h2>Guardar e limpar guias</h2><p>"+msg+"</p><p>As guias guardadas ficam neste navegador e podem ser reabertas em “Guias guardadas no navegador…”.</p>"
    +"<div class='row'><button class='btn primary' id='vYes'>"+(n?"Guardar e limpar":"Limpar")+"</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("vYes").onclick=function(){closeDlg();vaultSaveAllAndClear();};
}
function vaultSaveAllAndClear(){
  var t=cur();if(!tabs.length||!t)return 0;
  t.content=editor.value;
  var n=0;
  tabs.forEach(function(x){
    if(!(x.path||String(x.content||"").length>0))return;
    try{x.updatedAt=x.updatedAt||Date.now();vaultUpsert(x);n++;}catch(e){}
  });
  var ok=false;try{ok=saveClosedVault();}catch(e){ok=false;}
  tabs.length=0;untitledN=0;newTab();
  if(!n)updateStatus("Nada com conteúdo para guardar; guias limpas");
  else updateStatus(n+(n===1?" guia guardada no navegador e guias limpas":" guias guardadas no navegador e guias limpas")+" — use Guias guardadas para reabrir"+(ok?"":" (aviso: o navegador recusou o salvamento local)"));
  return n;
}
function vaultGet(id){for(var k=0;k<closedVault.length;k++){if(closedVault[k].id===id)return closedVault[k];}return null;}
function vaultRename(id,name){var e=vaultGet(id);if(!e||!String(name).trim())return false;e.name=String(name).trim();e.updatedAt=Date.now();saveClosedVault();return true;}
function vaultEditContent(id,content){var e=vaultGet(id);if(!e)return false;e.content=String(content);e.updatedAt=Date.now();saveClosedVault();return true;}
function vaultRemove(id){for(var k=0;k<closedVault.length;k++){if(closedVault[k].id===id){closedVault.splice(k,1);saveClosedVault();return true;}}return false;}
function vaultClear(){closedVault.length=0;saveClosedVault();}
function vaultReopen(id){var e=vaultGet(id);if(!e)return false;untitledN++;var t={name:e.name,fallback:e.name,path:e.path,handle:null,content:e.content,modified:false,encoding:e.encoding,eol:e.eol,createdAt:e.createdAt,updatedAt:e.updatedAt,vaultId:e.id,origName:e.origName||null,origPath:e.origPath||null,attachments:Object.assign({},e.attachments||{})};tabs.push(t);active=tabs.length-1;syncEditor();renderTabs();updateStatus("Reaberta: "+e.name);scheduleSessionSave();return true;}
function pushClosed(i){
  var t=tabs[i];if(!t)return;
  if(tabs.indexOf(t)===active)t.content=editor.value;
  closedStack.push({tab:{name:t.name,fallback:t.fallback,path:t.path,content:t.content,encoding:t.encoding,eol:t.eol,modified:t.modified,createdAt:t.createdAt,updatedAt:t.updatedAt,origName:t.origName||null,origPath:t.origPath||null,attachments:Object.assign({},t.attachments||{})},index:i});
  if(closedStack.length>10)closedStack.shift();
}
function reopenClosed(){
  var r=closedStack.pop();
  if(!r){updateStatus("Nada para reabrir");return;}
  var t=r.tab;t.handle=null;
  tabs.splice(Math.max(0,Math.min(r.index,tabs.length)),0,t);
  active=tabs.indexOf(t);
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
}
function closeTab(i){
  function remove(){
    pushClosed(i);
    tabs.splice(i,1);
    if(!tabs.length){untitledN=0;newTab();return;}
    active=Math.max(0,Math.min(active,tabs.length-1));
    syncEditor();renderTabs();updateStatus();scheduleSessionSave();
  }
  if(tabs[i].modified){
    var was=active;active=i;syncEditor();
    askSave(i).then(function(r){
      if(r==="cancel"){active=was;syncEditor();renderTabs();updateStatus();return;}
      remove();
    });
  }else remove();
}
