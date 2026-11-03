"use strict";
/* Interface: menus, diálogos, barra de status e eventos globais. */
function dlg(html){$("dlgBox").innerHTML=html;$("ovl").classList.add("show");}
function closeDlg(){$("ovl").classList.remove("show");}
function updateStatus(msg,link){
  var t=cur();if(!t)return;
  var pos=editor.selectionStart,upTo=editor.value.slice(0,pos),lines=upTo.split("\n");
  $("stPos").textContent="Ln "+lines.length+", Col "+(lines[lines.length-1].length+1);
  var s=editor.selectionStart,e=editor.selectionEnd;
  $("stChars").textContent=e>s?(e-s)+" de "+editor.value.length+" caracteres":editor.value.length+" caracteres";
  $("stZoom").textContent=zoom+"%";
  $("stEol").textContent=t.eol==="CRLF"?"Windows (CRLF)":t.eol==="LF"?"Unix (LF)":"Mac (CR)";
  $("stEnc").textContent=t.encoding;
  var m=$("stMsg");m.textContent=msg||"";m.classList.toggle("link",!!link);m.onclick=link||null;
}
function openGoto(){
  var total=editor.value.split("\n").length;
  dlg("<h2>Ir para a linha</h2><div class='field'><label>Número da linha (1-"+total+")</label><input type='number' id='gNum' min='1' max='"+total+"' value='1'></div><div class='row'><button class='btn primary' id='gOk'>Ir para</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("gOk").onclick=function(){
    var n=parseInt($("gNum").value,10);
    if(n>=1&&n<=total){var ls=editor.value.split("\n"),p=0;for(var i=0;i<n-1;i++)p+=ls[i].length+1;editor.focus();editor.setSelectionRange(p,Math.min(p+ls[n-1].length,editor.value.length));updateStatus();}
    closeDlg();
  };
}
function openFont(){
  dlg("<h2>Fonte</h2><div class='field'><label>Fonte</label><select id='fFace'><option>Consolas</option><option>Lucida Console</option><option>Courier New</option><option>Segoe UI</option><option>Arial</option></select></div><div class='field'><label>Tamanho (px)</label><input type='number' id='fSize' min='8' max='72' value='"+settings.size+"'></div><div class='row'><button class='btn primary' id='fOk'>OK</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("fFace").value=settings.face;
  $("fOk").onclick=function(){settings.face=$("fFace").value;settings.size=Math.max(8,Math.min(72,parseInt($("fSize").value||"15",10)));saveSettings();applyEditor();closeDlg();};
}
function openSaveAs(){
  var t=cur();
  dlg("<h2>Salvar como</h2><div class='field'><label>Nome</label><input type='text' id='sName' value='"+esc(t.path||t.name)+"'></div><div class='field'><label>Codificação</label><select id='sEnc'><option>UTF-8</option><option>UTF-8 with BOM</option><option>UTF-16 LE</option><option>UTF-16 BE</option><option>ANSI</option></select></div><div class='field'><label>Quebra de linha</label><select id='sEol'><option value='CRLF'>Windows (CRLF)</option><option value='LF'>Unix (LF)</option><option value='CR'>Mac (CR)</option></select></div><div class='row'><button class='btn primary' id='sOk'>Salvar</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("sEnc").value=t.encoding;$("sEol").value=t.eol;
  $("sOk").onclick=function(){t.name=$("sName").value||t.name;t.path=t.name;t.encoding=$("sEnc").value;t.eol=$("sEol").value;closeDlg();saveTab(active,false).then(function(){renderTabs();updateStatus();applyEditor();});};
}
function openSettings(){
  dlg("<h2>Configurações</h2>"
    +"<div class='field'><label>Tema</label><select id='oTheme'><option value='dark'>Escuro (padrão)</option><option value='light'>Claro</option><option value='white'>Branco</option></select></div>"
    +"<div class='check'><input type='checkbox' id='oWrap' "+(settings.wrap?"checked":"")+"><label for='oWrap'>Quebra automática de linha</label></div>"
    +"<div class='check'><input type='checkbox' id='oStatus' "+(settings.status?"checked":"")+"><label for='oStatus'>Barra de status</label></div>"
    +"<div class='check'><input type='checkbox' id='oStamp' "+(settings.stampOnSave?"checked":"")+"><label for='oStamp'>Inserir data/hora no fim ao salvar</label></div>"
    +"<div class='check'><input type='checkbox' id='oMd' "+(settings.mdPreview?"checked":"")+"><label for='oMd'>Prévia Markdown em arquivos .md</label></div>"
    +"<p style='margin-top:10px'>Sem Copilot, sem telemetria. Só texto.</p>"
    +"<div class='row'><button class='btn' id='oAbout'>Sobre</button><button class='btn primary' id='oOk'>OK</button></div>");
  $("oTheme").value=settings.theme;
  $("oOk").onclick=function(){settings.theme=$("oTheme").value;settings.wrap=$("oWrap").checked;settings.status=$("oStatus").checked;settings.stampOnSave=$("oStamp").checked;settings.mdPreview=$("oMd").checked;saveSettings();applyTheme();applyEditor();buildMenus();closeDlg();};
  $("oAbout").onclick=function(){openAbout();};
}
function openAbout(){
  dlg("<img class='about-logo' src='icons/icon-192.png' alt='Ícone do RENotepad' width='64' height='64'><h2 style='text-align:center'>RE:Notepad (web)</h2><p style='text-align:center'>Bloco de notas do Windows 10, com visual do Windows 11.<br>Versão web não oficial, inspirada no <b>RENotepad</b> de Nikko Gonzales.<br>Sem Copilot, sem telemetria.</p><div class='row' style='justify-content:center'><button class='btn primary' onclick='closeDlg()'>OK</button></div>");
}
function buildMenus(){
  var F=$("menu-file"),E=$("menu-edit"),V=$("menu-view"),S=$("menu-settings");
  F.innerHTML="";E.innerHTML="";V.innerHTML="";S.innerHTML="";
  function item(menu,label,sc,fn){var b=document.createElement("button");b.innerHTML="<span>"+label+"</span>"+(sc?"<span class='k'>"+sc+"</span>":"");b.onclick=function(){closeMenus();fn();};menu.appendChild(b);}
  function sep(m){var h=document.createElement("hr");m.appendChild(h);}
  item(F,"Nova guia","Ctrl+T",function(){newTab();});
  item(F,"Nova janela","Ctrl+Shift+N",function(){window.open(location.href,"_blank");});
  sep(F);
  item(F,"Abrir...","Ctrl+O",pickOpen);
  item(F,"Salvar","Ctrl+S",function(){saveTab(active,false);});
  item(F,"Salvar como...","Ctrl+Shift+S",openSaveAs);
  item(F,"Salvar tudo",null,function(){var p=Promise.resolve();for(var i=0;i<tabs.length;i++){(function(k){p=p.then(function(){active=k;syncEditor();return saveTab(k,false);});})(i);}p.then(function(){renderTabs();});});
  sep(F);
  item(F,"Imprimir...","Ctrl+P",function(){window.print();});
  sep(F);
  item(F,"Fechar guia","Ctrl+W",function(){closeTab(active);});
  item(F,"Reabrir guia fechada","Ctrl+Shift+T",reopenClosed);
  item(E,"Desfazer","Ctrl+Z",function(){document.execCommand("undo");});
  sep(E);
  item(E,"Recortar","Ctrl+X",function(){document.execCommand("cut");});
  item(E,"Copiar","Ctrl+C",function(){document.execCommand("copy");});
  item(E,"Colar","Ctrl+V",function(){try{document.execCommand("paste");}catch(e){}});
  item(E,"Excluir","Del",function(){document.execCommand("delete");});
  sep(E);
  item(E,"Localizar...","Ctrl+F",function(){hideBoxes();$("findBox").classList.add("show");$("findText").focus();});
  item(E,"Localizar próxima","F3",function(){var q=$("findText").value;if(q)findInEditor(q,true,settings.matchCase,settings.wrapAround);});
  item(E,"Localizar anterior","Shift+F3",function(){var q=$("findText").value;if(q)findInEditor(q,false,settings.matchCase,settings.wrapAround);});
  item(E,"Substituir...","Ctrl+H",function(){hideBoxes();$("replaceBox").classList.add("show");});
  item(E,"Ir para...","Ctrl+G",openGoto);
  sep(E);
  item(E,"Selecionar tudo","Ctrl+A",function(){editor.select();});
  item(E,"Hora/Data","F5",insertTimeDate);
  item(E,"Fonte...",null,openFont);
  item(V,"Ampliar","Ctrl++",function(){setZoom(zoom+10);});
  item(V,"Reduzir","Ctrl+-",function(){setZoom(zoom-10);});
  item(V,"Restaurar zoom","Ctrl+0",function(){setZoom(100);});
  sep(V);
  item(V,"Prévia Markdown","Ctrl+Shift+M",toggleMd);
  item(V,"Barra de formatação",null,function(){settings.mdBar=!settings.mdBar;saveSettings();applyEditor();});
  item(V,"Barra de status",null,function(){settings.status=!settings.status;saveSettings();applyEditor();buildMenus();});
  item(V,"Quebra automática de linha",null,function(){settings.wrap=!settings.wrap;saveSettings();applyEditor();buildMenus();});
  sep(V);
  item(V,"Tema: "+themeName(),null,function(){settings.theme=settings.theme==="dark"?"light":settings.theme==="light"?"white":"dark";saveSettings();applyTheme();buildMenus();});
  item(S,"Configurações",null,openSettings);
  item(S,"Sobre o RENotepad",null,openAbout);
}
function closeMenus(){document.querySelectorAll(".menu.show").forEach(function(m){m.classList.remove("show");});document.querySelectorAll(".mi.open").forEach(function(b){b.classList.remove("open");});}
function hideBoxes(){$("findBox").classList.remove("show");$("replaceBox").classList.remove("show");}
function bindGlobalEvents(){
  document.querySelectorAll(".mi").forEach(function(b){
    b.onclick=function(e){e.stopPropagation();var m=$("menu-"+b.dataset.m),was=m.classList.contains("show");closeMenus();if(!was){var r=b.getBoundingClientRect();m.style.left=r.left+"px";m.style.top="32px";m.classList.add("show");b.classList.add("open");}};
  });
  $("btnSettings").onclick=function(e){e.stopPropagation();var m=$("menu-settings"),was=m.classList.contains("show");closeMenus();if(!was)m.classList.add("show");};
  document.addEventListener("click",function(e){if(!e.target.closest(".menu")&&!e.target.closest(".mi")&&e.target.id!=="btnSettings")closeMenus();if(!e.target.closest(".small-find")&&!e.target.closest(".ctx"))$("ctx").classList.remove("show");});
  $("btnNewTab").onclick=function(){newTab();};
  $("fileInput").addEventListener("change",function(e){
    Array.from(e.target.files).forEach(function(f){f.arrayBuffer().then(function(b){openFileObject({name:f.name},b);});});
    e.target.value="";
  });
  editor.addEventListener("input",function(){markModified();updateStatus();if(settings.mdPreview)renderPreview();});
  editor.addEventListener("keyup",updateStatus);
  editor.addEventListener("click",updateStatus);
  editor.addEventListener("wheel",function(e){if(e.ctrlKey){e.preventDefault();setZoom(zoom+(e.deltaY<0?10:-10));}},{passive:false});
  editor.addEventListener("keydown",function(e){if(e.key==="Tab"){e.preventDefault();document.execCommand("insertText",false,"\t");markModified();}});
  document.addEventListener("keydown",function(e){
    var c=e.ctrlKey||e.metaKey;
    if(c&&e.shiftKey&&e.key.toLowerCase()==="m"){e.preventDefault();toggleMd();}
    else if(c&&e.shiftKey&&e.key.toLowerCase()==="t"){e.preventDefault();reopenClosed();}
    else if(c&&e.key.toLowerCase()==="t"){e.preventDefault();newTab();}
    else if(c&&e.key.toLowerCase()==="w"&&!e.shiftKey){e.preventDefault();closeTab(active);}
    else if(c&&e.key.toLowerCase()==="o"){e.preventDefault();pickOpen();}
    else if(c&&e.key.toLowerCase()==="s"&&!e.shiftKey){e.preventDefault();saveTab(active,false);}
    else if(c&&e.shiftKey&&e.key.toLowerCase()==="s"){e.preventDefault();openSaveAs();}
    else if(c&&e.key.toLowerCase()==="f"){e.preventDefault();hideBoxes();$("findBox").classList.add("show");$("findText").focus();}
    else if(c&&e.key.toLowerCase()==="h"){e.preventDefault();hideBoxes();$("replaceBox").classList.add("show");}
    else if(c&&e.key.toLowerCase()==="g"){e.preventDefault();openGoto();}
    else if(e.key==="F3"){e.preventDefault();var q=$("findText").value;if(q)findInEditor(q,!e.shiftKey,settings.matchCase,settings.wrapAround);}
    else if(e.key==="F5"&&!c){e.preventDefault();insertTimeDate();}
    else if(c&&(e.key==="+"||e.key==="=")){e.preventDefault();setZoom(zoom+10);}
    else if(c&&e.key==="-"){e.preventDefault();setZoom(zoom-10);}
    else if(c&&e.key==="0"){e.preventDefault();setZoom(100);}
    else if(c&&e.key==="PageDown"){e.preventDefault();active=(active+1)%tabs.length;syncEditor();renderTabs();updateStatus();}
    else if(c&&e.key==="PageUp"){e.preventDefault();active=(active-1+tabs.length)%tabs.length;syncEditor();renderTabs();updateStatus();}
  });
  $("findDown").onclick=function(){doFind(true);};
  $("findUp").onclick=function(){doFind(false);};
  $("findClose").onclick=hideBoxes;
  $("repDown").onclick=function(){var q=$("repFind").value;if(q)findNextRep(q,$("repCase").checked);};
  $("repOne").onclick=doReplaceOne;$("repAll").onclick=doReplaceAll;$("repClose").onclick=hideBoxes;
  $("stMd").onclick=function(){toggleMd();};
  $("stZoom").onclick=function(e){
    var c=$("ctx");c.innerHTML="";
    [["Ampliar",function(){setZoom(zoom+10);}],["Reduzir",function(){setZoom(zoom-10);}],["Restaurar (100%)",function(){setZoom(100);}]].forEach(function(p){
      var b=document.createElement("button");b.textContent=p[0];
      b.onclick=function(){p[1]();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-110)+"px";c.classList.add("show");
  };
  $("stEol").onclick=function(e){
    var c=$("ctx");c.innerHTML="";
    [["Windows (CRLF)","CRLF"],["Unix (LF)","LF"],["Mac (CR)","CR"]].forEach(function(p){
      var b=document.createElement("button");b.textContent=(cur().eol===p[1]?"✓ ":"")+p[0];
      b.onclick=function(){cur().eol=p[1];updateStatus();scheduleSessionSave();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-110)+"px";c.classList.add("show");
  };
  $("stEnc").onclick=function(e){
    var c=$("ctx");c.innerHTML="";
    ["UTF-8","UTF-8 with BOM","UTF-16 LE","UTF-16 BE","ANSI"].forEach(function(v){
      var b=document.createElement("button");b.textContent=(cur().encoding===v?"✓ ":"")+v;
      b.onclick=function(){cur().encoding=v;updateStatus();scheduleSessionSave();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-140)+"px";c.classList.add("show");
  };
  $("ovl").addEventListener("click",function(e){if(e.target.id==="ovl")closeDlg();});
  window.addEventListener("dragover",function(e){e.preventDefault();document.body.classList.add("dragging");});
  window.addEventListener("dragleave",function(e){if(!e.relatedTarget)document.body.classList.remove("dragging");});
  window.addEventListener("drop",function(e){
    e.preventDefault();document.body.classList.remove("dragging");
    var fs=e.dataTransfer&&e.dataTransfer.files;
    if(fs&&fs.length)Array.from(fs).forEach(function(f){f.arrayBuffer().then(function(b){openFileObject({name:f.name},b);});});
  });
}
