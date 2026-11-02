"use strict";
/* Guias: modelo, abrir/salvar/fechar e persistência de sessão. */
var tabs=[],active=0,untitledN=0;
var tabsEl=document.getElementById("tabs"),editor=document.getElementById("editor");
function cur(){return tabs[active];}
function newTab(name,content){
  untitledN++;
  var fb=name||("Sem título"+(untitledN>1?" "+untitledN:""));
  var t={name:fb,fallback:fb,path:null,handle:null,content:content||"",modified:false,encoding:"UTF-8",eol:"CRLF"};
  tabs.push(t);active=tabs.length-1;
  syncEditor();renderTabs();updateStatus();scheduleSessionSave();
  return t;
}
function syncEditor(){
  var t=cur();if(!t)return;
  if(editor.value!==t.content)editor.value=t.content;
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
  t.content=editor.value;t.modified=true;
  renderTabs();applyTheme();updateStatus();scheduleSessionSave();
}
function openFileObject(file,buf){
  if(buf.byteLength>=1073741824){alert("Arquivo de 1 GiB ou mais não suportado.");return;}
  var u8=new Uint8Array(buf),info=detectEncoding(u8),text=decodeBuf(u8,info),eol=detectEol(text);
  for(var k=0;k<tabs.length;k++){if(tabs[k].path===file.name){active=k;syncEditor();renderTabs();updateStatus();return;}}
  untitledN++;
  var t={name:file.name,path:file.name,handle:file.handle||null,content:text,modified:false,encoding:info.enc,eol:eol};
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
  closedStack.push({tab:{name:t.name,fallback:t.fallback,path:t.path,content:t.content,encoding:t.encoding,eol:t.eol,modified:t.modified},index:i});
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
