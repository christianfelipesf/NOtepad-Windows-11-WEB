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
  var now=Date.now();var t={name:fb,fallback:fb,path:null,handle:null,content:content||"",modified:false,encoding:"UTF-8",eol:"CRLF",createdAt:now,updatedAt:now};
  tabs.push(t);active=tabs.length-1;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
  return t;
}
function syncEditor(){
  var t=cur();if(!t)return;
  if(editor.value!==t.content)editor.value=t.content;
  try{var ae=tabsEl.children[active];if(ae&&ae.scrollIntoView)ae.scrollIntoView({block:"nearest"});}catch(e){}
  applyTheme();applyEditor();
}
function renderTabs(){
  var a=cur();
  if(a&&!a.path){
    var line=editor.value.split("\n")[0].trim();
    if(line.length>40)line=line.slice(0,40)+"…";
    a.name=line||a.fallback||"Sem título";
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
    var x=document.createElement("span");x.className="x";x.textContent="×";x.title="Fechar guia";
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
  if(/\.zip$/i.test((file&&file.name)||"")){importZipData(buf);return;}
  var u8=new Uint8Array(buf),info=detectEncoding(u8),text=decodeBuf(u8,info),eol=detectEol(text);
  for(var k=0;k<tabs.length;k++){if(tabs[k].path===file.name){active=k;syncEditor();renderTabs();updateStatus();return;}}
  untitledN++;
  var now2=Date.now();var t={name:file.name,path:file.name,handle:file.handle||null,content:text,modified:false,encoding:info.enc,eol:eol,createdAt:now2,updatedAt:now2};
  if(text.slice(0,4)===".LOG"){var ts="\r\n"+stampNow()+"\r\n";t.content=text+ts;t.modified=true;}
  tabs.push(t);active=tabs.length-1;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
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
function saveTab(i,withPicker){
  var t=tabs[i];if(!t)return Promise.resolve(false);
  stampForSave();
  var body=toEol(editor.value,t.eol),r=encodeContent(body,t.encoding),bytes=r.bytes;
  function done(ok,msg){
    if(!ok)return false;
    t.content=editor.value;t.modified=false;
    renderTabs();updateStatus(msg||("Salvo em "+stampNow()));scheduleSessionSave();
    return true;
  }
  if(r.lossy&&!confirm("Este arquivo contém caracteres Unicode que serão perdidos se salvo como ANSI. Continuar?"))return Promise.resolve(false);
  if(withPicker||!t.handle){
    if(window.showSaveFilePicker){
      return window.showSaveFilePicker({suggestedName:t.path||(t.name+".txt")}).then(function(h){
        return h.createWritable().then(function(w){return w.write(bytes).then(function(){return w.close();}).then(function(){
          t.handle=h;t.path=h.name||t.path||t.name;t.name=t.path;return done(true);});});
      }).catch(function(){return false;});
    }
  }else if(t.handle){
    return t.handle.createWritable().then(function(w){return w.write(bytes).then(function(){return w.close();}).then(function(){return done(true);});}).catch(function(){});
  }
  return Promise.resolve((function(){
    var blob=new Blob([bytes],{type:"text/plain"}),a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download=t.path||(t.name+".txt");a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
    return done(true);
  })());
}
function askSave(i){
  return new Promise(function(res){
    var t=tabs[i];
    dlg("<h2>RENotepad</h2><p>Deseja salvar as alterações em "+esc(t.path||t.name)+ "?</p><div class='row'><button class='btn primary' id='dSave'>Salvar</button><button class='btn' id='dNo'>Não salvar</button><button class='btn' id='dCancel'>Cancelar</button></div>");
    $("dSave").onclick=function(){closeDlg();saveTab(i,false).then(function(ok){res(ok?"save":"cancel");});};
    $("dNo").onclick=function(){closeDlg();res("nosave");};
    $("dCancel").onclick=function(){closeDlg();res("cancel");};
  });
}
var closedStack=[];
function pushClosed(i){
  var t=tabs[i];if(!t)return;
  if(tabs.indexOf(t)===active)t.content=editor.value;
  closedStack.push({tab:{name:t.name,fallback:t.fallback,path:t.path,content:t.content,encoding:t.encoding,eol:t.eol,modified:t.modified,createdAt:t.createdAt,updatedAt:t.updatedAt},index:i});
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
