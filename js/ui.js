"use strict";
/* Interface: menus, diálogos, barra de status e eventos globais. */
function dlg(html){var b=$("dlgBox");b.innerHTML=html;if(b.classList&&b.classList.toggle)b.classList.toggle("wide",String(html).indexOf("cwrap")>=0);$("ovl").classList.add("show");}
function closeDlg(){$("ovl").classList.remove("show");}
function updateStatus(msg,link){
  var t=cur();if(!t){var mm=$("stMsg");if(mm&&typeof msg==="string")mm.textContent=msg;return;}
  var val=editor.value;
  var pos=editor.selectionStart,upTo=val.slice(0,pos),lines=upTo.split("\n");
  $("stPos").textContent="Ln "+lines.length+", Col "+(lines[lines.length-1].length+1);
  var s=editor.selectionStart,e=editor.selectionEnd;
  $("stChars").textContent=e>s?(e-s)+" de "+editor.value.length+" caracteres":editor.value.length+" caracteres";
  var total=val.length?val.split("\n").length:1,ln=$("stLines");
  if(ln)ln.textContent=total+(total===1?" linha":" linhas");
  var dz=$("stDates");
  if(dz&&t.createdAt){dz.textContent="Criado "+fmtDT(t.createdAt)+"  •  Editado "+fmtDT(t.updatedAt||t.createdAt);dz.title="Criado em "+fmtDT(t.createdAt)+"\nEditado em "+fmtDT(t.updatedAt||t.createdAt);}
  var th=$("stTheme");if(th){th.textContent="Tema: "+themeName();th.title="Clique para trocar de tema";}
  $("stZoom").textContent=zoom+"%";
  $("stEol").textContent=t.eol==="CRLF"?"Windows (CRLF)":t.eol==="LF"?"Unix (LF)":"Mac (CR)";
  $("stEnc").textContent=t.encoding;
  var ex=$("stExt");if(ex&&typeof tabExt==="function")ex.textContent=tabExt(t);
  
  var m=$("stMsg");if(typeof msg!=="string")msg="";if(typeof link!=="function")link=null;m.textContent=msg||"";m.classList.toggle("link",!!link);m.onclick=link||null;
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
    +"<div class='field'><label>Tema</label><select id='oTheme'><option value='dark'>Escuro (padrão)</option><option value='light'>Claro</option><option value='white'>Branco</option><option value='sepia'>Sépia</option><option value='midnight'>Meia-noite</option><option value='ubuntu'>Ubuntu</option><option value='firefox'>Firefox</option><option value='blackred'>Preto e vermelho</option></select></div>"
    +"<div class='check'><input type='checkbox' id='oWrap' "+(settings.wrap?"checked":"")+"><label for='oWrap'>Quebra automática de linha</label></div>"
    +"<div class='check'><input type='checkbox' id='oStatus' "+(settings.status?"checked":"")+"><label for='oStatus'>Barra de status</label></div>"
    +"<div class='check'><input type='checkbox' id='oStamp' "+(settings.stampOnSave?"checked":"")+"><label for='oStamp'>Inserir data/hora no fim ao salvar</label></div>"
    +"<div class='check'><input type='checkbox' id='oMd' "+(settings.mdPreview?"checked":"")+"><label for='oMd'>Prévia Markdown em arquivos .md</label></div>"
    +"<div class='field' style='margin-top:12px'><label>Sincronização entre aparelhos (nuvem própria, opcional)</label></div>"
    +"<div class='check'><input type='checkbox' id='oSyncOn' "+(settings.sync&&settings.sync.enabled?"checked":"")+"><label for='oSyncOn'>Ativar sincronização</label></div>"
    +"<div class='field'><label>Endpoint REST (ex.: https://seu-servidor/renotepad)</label><input type='text' id='oSyncEp' value='"+esc((settings.sync&&settings.sync.endpoint)||"")+"' placeholder='https://…'></div>"
    +"<div class='field'><label>Chave (token)</label><input type='text' id='oSyncTk' value='"+esc((settings.sync&&settings.sync.token)||"")+"' placeholder='opcional'></div>"
    +"<div class='row' style='justify-content:flex-start'><button class='btn' id='oSyncNow'>Sincronizar agora</button></div>"
    +"<p id='oSyncSt' style='margin-top:6px'>"+esc(syncStatusText())+"</p>"
    +"<p style='margin-top:10px'>Sem Copilot, sem telemetria. Só texto.</p>"
    +"<div class='row'><button class='btn' id='oAbout'>Sobre</button><button class='btn primary' id='oOk'>OK</button></div>");
  $("oTheme").value=settings.theme;
  $("oOk").onclick=function(){settings.theme=$("oTheme").value;settings.wrap=$("oWrap").checked;settings.status=$("oStatus").checked;settings.stampOnSave=$("oStamp").checked;settings.mdPreview=$("oMd").checked;if(!settings.sync)settings.sync={enabled:false,endpoint:"",token:""};settings.sync.enabled=$("oSyncOn").checked;settings.sync.endpoint=$("oSyncEp").value.trim();settings.sync.token=$("oSyncTk").value.trim();saveSettings();applyTheme();applyEditor();buildMenus();closeDlg();};
  $("oAbout").onclick=function(){openAbout();};
  if($("oSyncNow"))$("oSyncNow").onclick=function(){settings.sync.enabled=$("oSyncOn").checked;settings.sync.endpoint=$("oSyncEp").value.trim();settings.sync.token=$("oSyncTk").value.trim();saveSettings();SyncNow(function(m){var el=$("oSyncSt");if(el)el.textContent=m;});};
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
  item(F,"Guardar guia no navegador",null,function(){vaultSaveTab(active);});
  item(F,"Guardar tudo no navegador",null,function(){vaultSaveAll();});
  sep(F);
  item(F,"Imprimir...","Ctrl+P",function(){window.print();});
  sep(F);
  item(F,"Fechar guia","Ctrl+W",function(){closeTab(active);});
  item(F,"Reabrir guia fechada","Ctrl+Shift+T",reopenClosed);
  sep(F);
  item(F,"Gerenciar guias...",null,openManager);
  item(F,"Guias guardadas no navegador...",null,openClosedPanel);
  item(F,"Propriedades da nota",null,openProps);
  item(F,"Baixar tudo (.zip)",null,function(){downloadZip(tabs.map(function(_,i){return i;}),{vault:true});});
  item(F,"Importar .zip...",null,function(){$("zipInput").click();});
  item(E,"Desfazer","Ctrl+Z",function(){document.execCommand("undo");});
  sep(E);
  item(E,"Recortar","Ctrl+X",function(){document.execCommand("cut");});
  item(E,"Copiar","Ctrl+C",function(){document.execCommand("copy");});
  item(E,"Colar","Ctrl+V",function(){try{document.execCommand("paste");}catch(e){}});
  item(E,"Colar foto (Markdown)...",null,function(){pasteImageFromClipboard();});
  item(E,"Anexar arquivo (Markdown)...",null,function(){pickFile();});
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
  item(V,"Executar com prévia","F9",function(){if(typeof openRunPanel==="function")openRunPanel();else openRunInNewTab();});
  item(V,"Barra de formatação",null,function(){settings.mdBar=!settings.mdBar;saveSettings();applyEditor();});
  item(V,"Barra de status",null,function(){settings.status=!settings.status;saveSettings();applyEditor();buildMenus();});
  item(V,"Quebra automática de linha",null,function(){settings.wrap=!settings.wrap;saveSettings();applyEditor();buildMenus();});
  sep(V);
  item(V,"Tema: "+themeName(),null,function(){openThemeChooser();});
  item(S,"Configurações",null,openSettings);
  item(S,"Sobre o RENotepad",null,openAbout);
}
function openThemeChooser(){
  var h="<h2>Tema</h2><div class='field'><label>Escolha o tema</label><select id='tPick'>";
  THEME_ORDER.forEach(function(v){h+="<option value='"+v+"'"+(settings.theme===v?" selected":"")+">"+((typeof THEME_NAMES!=="undefined"?THEME_NAMES[v]:null)||v)+"</option>";});
  h+="</select></div><div class='row'><button class='btn primary' id='tOk'>Aplicar</button><button class='btn' onclick='closeDlg()'>Fechar</button></div>";
  dlg(h);
  $("tOk").onclick=function(){settings.theme=$("tPick").value;saveSettings();applyTheme();buildMenus();updateStatus();closeDlg();};
}
function openProps(){
  var t=cur();if(!t)return;
  if(tabs.indexOf(t)===active)t.content=editor.value;
  var n=t.content.length,ln=t.content.length?t.content.split("\n").length:1;
  var wd=(t.content.match(/\S+/g)||[]).length;
  dlg("<h2>Propriedades da nota</h2>"
    +"<div class='field'><label>Título</label><input type='text' id='pName' value='"+esc(t.name)+"'></div>"
    +"<p><b>Criada em:</b> "+esc(fmtDT(t.createdAt||Date.now()))+"<br><b>Editada em:</b> "+esc(fmtDT(t.updatedAt||t.createdAt||Date.now()))
    +"<br><b>Conteúdo:</b> "+n+" caracteres • "+ln+(ln===1?" linha":" linhas")+" • "+wd+(wd===1?" palavra":" palavras")
    +"<br><b>Codificação:</b> "+esc(t.encoding)+" &nbsp; <b>Quebra:</b> "+esc(t.eol)+"</p>"
    +"<div class='row'><button class='btn primary' id='pOk'>OK</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("pOk").onclick=function(){var v=$("pName").value.trim();if(v){if(v!==t.name)t.handle=null;t.name=v;t.fallback=v;if(!t.path)t.path=v;t.updatedAt=Date.now();}t.content=editor.value;scheduleSessionSave();renderTabs();applyTheme();updateStatus();closeDlg();};
}
function tabExt(t){var m=String((t&&t.path)||(t&&t.name)||"").match(/\.([a-z0-9]{1,10})$/i);return m?("."+m[1].toLowerCase()):".txt";}
function openExtDialog(){
  var t=cur();if(!t)return;
  if(tabs.indexOf(t)===active)t.content=editor.value;
  var full=t.path||t.name||"Sem título";
  var base=full.replace(/\.[a-z0-9]{1,10}$/i,""),curExt=tabExt(t);


  dlg("<h2>Extensão da nota</h2><p>Nota atual: <b>"+esc(full)+"</b></p>"
    +"<div class='field'><label>Nome (sem extensão)</label><input type='text' id='eBase' value='"+esc(base)+"'></div>"
    +"<div class='field'><label>Extensão (digite, ex.: .md)</label><input type='text' id='eExt' value='"+curExt+"' placeholder='.txt'></div>"
    +"<div class='row'><button class='btn primary' id='eOk'>Salvar</button><button class='btn' onclick='closeDlg()'>Cancelar</button></div>");
  $("eOk").onclick=function(){
    var b=$("eBase").value.trim().replace(/\.[a-z0-9]{1,10}$/i,"")||"Sem título";
    var typed=$("eExt").value.trim().toLowerCase();
    if(typed.charAt(0)!==".")typed="."+typed;
    if(!/^\.[a-z0-9]{1,10}$/.test(typed)){updateStatus("Extensão inválida: use letras e números, ex.: .md");return;}
    var nu=b+typed;
    if(nu!==t.name)t.handle=null;
    t.name=nu;t.fallback=nu;t.path=nu;t.updatedAt=Date.now();
    renderTabs();applyEditor();updateStatus();scheduleSessionSave();closeDlg();
  };
}
function openManager(){
  if(tabs.indexOf(cur())===active)cur().content=editor.value;
  var rows=tabs.map(function(t,i){
    return "<label class='mrow'><input type='checkbox' data-i='"+i+"' checked><span class='mn' title='"+esc(t.name)+"'>"+esc(t.name)+"</span><span class='md'>"+esc(fmtDT(t.updatedAt||t.createdAt||Date.now()))+"</span><span class='mc'>"+esc(String((i===active?"• ": "")+(t.content||"").length+" car."))+"</span></label>";
  }).join("");
  dlg("<h2>Gerenciar guias ("+tabs.length+")</h2>"
    +"<p>Marque as notas para baixar ou fechar. Use os botões para organizar.</p>"
    +"<div class='mtools'><button class='btn' id='mAll'>Todas</button><button class='btn' id='mNone'>Nenhuma</button><button class='btn' id='mAZ'>A–Z</button><button class='btn' id='mRecent'>Recentes</button></div>"
    +"<div class='mlist'>"+rows+"</div>"
    +"<div class='row' style='justify-content:flex-start'><button class='btn' id='mUp'>↑ Subir</button><button class='btn' id='mDown'>↓ Descer</button></div>"
    +"<div class='row'><button class='btn' id='mCloseSel'>Fechar marcadas</button><button class='btn primary' id='mZip'>Baixar marcadas (.zip)</button><button class='btn' onclick='closeDlg()'>Fechar</button></div>");
  function sel(){return Array.from(document.querySelectorAll(".mlist input:checked")).map(function(c){return +c.dataset.i;}).sort(function(a,b){return a-b;});}
  function refresh(){closeDlg();openManager();}
  $("mAll").onclick=function(){document.querySelectorAll(".mlist input").forEach(function(c){c.checked=true;});};
  $("mNone").onclick=function(){document.querySelectorAll(".mlist input").forEach(function(c){c.checked=false;});};
  $("mAZ").onclick=function(){
    var order=tabs.map(function(t,i){return i;}).sort(function(a,b){return tabs[a].name.localeCompare(tabs[b].name,"pt-BR");});
    var nt=order.map(function(i){return tabs[i];});var ai=order.indexOf(active);tabs.length=0;nt.forEach(function(t){tabs.push(t);});active=Math.max(0,ai);syncEditor();renderTabs();updateStatus();scheduleSessionSave();refresh();
  };
  $("mRecent").onclick=function(){
    var order=tabs.map(function(t,i){return i;}).sort(function(a,b){return (tabs[b].updatedAt||0)-(tabs[a].updatedAt||0);});
    var nt=order.map(function(i){return tabs[i];});var ai=order.indexOf(active);tabs.length=0;nt.forEach(function(t){tabs.push(t);});active=Math.max(0,ai);syncEditor();renderTabs();updateStatus();scheduleSessionSave();refresh();
  };
  $("mUp").onclick=function(){var s=sel();if(s.length!==1)return;moveTab(s[0],Math.max(0,s[0]-1));refresh();};
  $("mDown").onclick=function(){var s=sel();if(s.length!==1)return;moveTab(s[0],Math.min(tabs.length-1,s[0]+1));refresh();};
  $("mCloseSel").onclick=function(){
    var s=sel();if(!s.length)return;
    if(s.some(function(i){return tabs[i].modified;})){updateStatus("Notas com alterações serão guardadas no navegador antes de fechar");}
    for(var k=s.length-1;k>=0;k--){try{if(tabs.indexOf(tabs[s[k]])===active)tabs[s[k]].content=editor.value;tabs[s[k]].updatedAt=Date.now();vaultUpsert(tabs[s[k]]);}catch(e){}tabs.splice(s[k],1);}
    if(!tabs.length){untitledN=0;newTab();}active=Math.max(0,Math.min(active,tabs.length-1));
    syncEditor();renderTabs();updateStatus();scheduleSessionSave();refresh();
  };
  $("mZip").onclick=function(){var s=sel();if(!s.length){updateStatus("Marque ao menos uma nota");return;}downloadZip(s);};
}
var closedSelId=null,closedEditing=false;
function openClosedPanel(){
  closedEditing=false;
  var n=closedVault.length;
  var sel=vaultGet(closedSelId)||closedVault[closedVault.length-1]||null;
  if(sel)closedSelId=sel.id;
  var rows=closedVault.slice().reverse().map(function(v){
    return "<div class='crow"+(v.id===closedSelId?" sel":"")+"' data-id='"+v.id+"'><span class='cn'>"+esc(v.name)+"</span><span class='cd'>Criada "+esc(fmtDT(v.createdAt||v.closedAt||v.updatedAt||Date.now()))+"<br>Guardada "+esc(fmtDT(v.closedAt||v.updatedAt||v.createdAt||Date.now()))+" • "+String((v.content||"").length)+" car.</span></div>";
  }).join("");
  var detail="<p class='cempty'>Nenhuma guia guardada. No menu Arquivo, use “Guardar guia no navegador” para guardar a guia atual sem baixar arquivo.</p>";
  if(sel){
    var body=sel.content||"";
    var prevHtml=isMarkdownFile(sel.path||sel.name)?mdRender(body):"<pre class='cpre'>"+esc(body.slice(0,2000))+(body.length>2000?"…":"")+"</pre>";
    detail="<div class='field' style='margin-top:0'><label>Título</label><input type='text' id='cName' value='"+esc(sel.name)+"'></div>"
      +"<div class='cmeta'>Criada em "+esc(fmtDT(sel.createdAt||sel.closedAt||sel.updatedAt||Date.now()))+" • Guardada em "+esc(fmtDT(sel.closedAt||sel.updatedAt||sel.createdAt||Date.now()))+" • "+String(body.length)+" caracteres • "+esc(sel.encoding||"UTF-8")+" • "+esc(sel.eol||"CRLF")+"</div>"
      +"<div class='cprev'>"+prevHtml+"</div>"
      +"<div class='field'><label>Editar conteúdo</label><textarea id='cEdit' rows='8'>"+esc(body).replace(/<\/textarea/gi,"&lt;/textarea")+"</textarea></div>"
      +"<div class='row' style='justify-content:flex-start'><button class='btn primary' id='cSaveEdit'>Salvar edição</button><button class='btn' id='cOpen'>Abrir como guia</button><button class='btn' id='cDel'>Excluir</button></div>";
  }
  dlg("<h2>Guias guardadas no navegador ("+n+")</h2>"
    +"<p>As guias guardadas ficam salvas neste navegador. Entram no .zip dentro da pasta <b>guias-fechadas/</b>. Abrir como guia mantém a cópia aqui.</p>"
    +"<div class='cwrap'><div class='clist'>"+(rows||"<p class='cempty'>—</p>")+"</div><div class='cdetail'>"+detail+"</div></div>"
    +"<div class='row' style='justify-content:flex-start'><button class='btn' id='cOpenAll'>Abrir todas</button><button class='btn' id='cZip'>Baixar tudo (.zip)</button><button class='btn' id='cClear'>Apagar todas</button></div>"
    +"<div class='row'><button class='btn primary' onclick='closeDlg()'>Fechar</button></div>");
  function refresh(){closeDlg();closedEditing=false;openClosedPanel();}
  Array.from(document.querySelectorAll(".crow")).forEach(function(r){
    r.onclick=function(){closedSelId=r.dataset.id;refresh();};
  });
  function curSel(){return vaultGet(closedSelId);}
  var b;
  if((b=$("cSaveEdit")))b.onclick=function(){var s=curSel();if(!s)return;var nm=$("cName").value.trim();if(nm&&nm!==s.name)vaultRename(s.id,nm);vaultEditContent(s.id,$("cEdit").value);refresh();updateStatus("Edição guardada: "+s.name);};
  if((b=$("cOpen")))b.onclick=function(){if(vaultReopen(closedSelId))refresh();};
  if((b=$("cDel")))b.onclick=function(){var i=closedVault.findIndex(function(v){return v.id===closedSelId;});vaultRemove(closedSelId);closedSelId=(closedVault[Math.min(Math.max(0,i-1),closedVault.length-1)]||{}).id||null;refresh();};
  if((b=$("cOpenAll")))b.onclick=function(){var ids=closedVault.map(function(v){return v.id;});ids.forEach(vaultReopen);closeDlg();};
  if((b=$("cZip")))b.onclick=function(){closeDlg();downloadZip(tabs.map(function(_,i){return i;}),{vault:true});};
  if((b=$("cClear")))b.onclick=function(){if(confirm("Apagar todas as guias guardadas no navegador?")){vaultClear();closedSelId=null;refresh();}};
}
function downloadZip(idxs,opts){
  try{
    var files=(idxs||[]).map(function(i){
      var t=tabs[i];if(!t)return null;
      var rawBody=(tabs.indexOf(t)===active)?editor.value:(t.content||"");
      var body=(typeof resolveAttachments==="function")?resolveAttachments(rawBody,t):rawBody;
      return {name:sanitizeName(t.path||t.name),ext:isMarkdownFile(t.path||t.name)?".md":".txt",body:body,tab:t};
    }).filter(Boolean);
    var nVault=0;
    if(opts&&opts.vault){closedVault.forEach(function(v){files.push({name:sanitizeName(v.path||v.name),ext:isMarkdownFile(v.path||v.name)?".md":".txt",body:v.content||"",tab:v,folder:"guias-fechadas/"});nVault++;});}
    if(!files.length){updateStatus("Nada para baixar");return;}
    var used={},entries=files.map(function(f){
      var stem=(f.name||"").replace(/\.(txt|md)$/i,"")||"Sem título";
      if(stem.length>120)stem=stem.slice(0,120);
      var cand=stem,k=2,key=(f.folder||"")+cand.toLowerCase()+f.ext.toLowerCase();
      while(used[key]){cand=stem+" ("+(k++)+")";key=(f.folder||"")+cand.toLowerCase()+f.ext.toLowerCase();}
      used[key]=1;
      return {name:(f.folder||"")+cand+f.ext,body:toEol(f.body,((f.tab&&f.tab.eol)||"CRLF")),tab:f.tab};
    });
    var csv="arquivo;titulo;criado;editado;caracteres\r\n"+entries.map(function(e){
      return [e.name,e.tab.name,fmtDT(e.tab.createdAt||Date.now()),fmtDT(e.tab.updatedAt||e.tab.createdAt||Date.now()),String(e.body.length)].map(function(c){var s=String(c);if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(";");
    }).join("\r\n");
    var nNotes=entries.length;
    entries.push({name:"indice.csv",body:csv});
    entries.push({name:"notas.json",body:JSON.stringify({app:"RENotepad Web",exported:new Date().toISOString(),files:entries.slice(0,nNotes).map(function(e){return {file:e.name,title:e.tab.name,createdAt:new Date(e.tab.createdAt||Date.now()).toISOString(),updatedAt:new Date(e.tab.updatedAt||e.tab.createdAt||Date.now()).toISOString()};})})});
    var blob=makeZip(entries);
    var a=document.createElement("a");a.href=URL.createObjectURL(blob);
    var d=new Date();function p(n){return (n<10?"0":"")+n;}
    a.download="renotepad-notas-"+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes())+".zip";
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);
    updateStatus(nNotes+(nNotes===1?" nota aberta":" notas abertas")+(nVault?" + "+nVault+(nVault===1?" guardada (pasta guias-fechadas)":" guardadas (pasta guias-fechadas)"):"")+" no .zip");
  }catch(e){updateStatus("Falha ao gerar o .zip");}
}
function importZipData(buf){
  var entries;
  try{entries=parseZip(buf);}catch(e){updateStatus("Não foi possível importar: "+((e&&e.message)||"arquivo inválido"));return {n:0,s:0};}
  var byFile={};
  entries.forEach(function(e){
    if(e.name==="notas.json"){try{var mj=JSON.parse(zipDecode(e.body));(mj.files||[]).forEach(function(m){byFile[m.file]=m;});}catch(x){}}
  });
  function takenTab(x){for(var i=0;i<tabs.length;i++){if(tabs[i].path===x)return true;}return false;}
  function takenVault(x){for(var i=0;i<closedVault.length;i++){if((closedVault[i].path||closedVault[i].name)===x)return true;}return false;}
  function uniq(base,taken,claimed){var u=base,k=2;while(claimed[u]||taken(u)){u=base+" ("+(k++)+")";}claimed[u]=1;return u;}
  var n=0,s=0,claimed={},claimedV={};
  entries.forEach(function(e){
    if(e.name==="notas.json"||e.name==="indice.csv")return;
    if(/\/$/.test(e.name))return;
    if(/^__MACOSX\//.test(e.name)||/(^|\/)\._/.test(e.name)){s++;return;}
    var m=byFile[e.name];
    if(/^guias-fechadas\//.test(e.name)){
      try{
        var vb=new Uint8Array(e.body),vi=detectEncoding(vb),vt=decodeBuf(vb,vi);
        if(vb.length>=1073741824||vt.indexOf("\0")>=0){s++;return;}
        var vnm=(m&&m.title)||e.name.replace(/^.*[\/\\]/,"").replace(/\.(txt|md)$/i,"")||"Sem título";
        var mts=m&&Date.parse(m.updatedAt);
        var ex=null;for(var q=0;q<closedVault.length;q++){if((closedVault[q].path||closedVault[q].name)===vnm){ex=closedVault[q];break;}}
        if(ex&&!claimedV[vnm]){
          claimedV[vnm]=1;
          if(!(mts&&ex.updatedAt&&ex.updatedAt>mts)){vaultUpsert({name:vnm,path:null,content:vt,encoding:vi.enc,eol:detectEol(vt),createdAt:(m&&Date.parse(m.createdAt))||ex.createdAt||Date.now(),updatedAt:mts||Date.now()});}
          n++;return;
        }
        vnm=uniq(vnm,takenVault,claimedV);
        if(vaultUpsert({name:vnm,path:null,content:vt,encoding:vi.enc,eol:detectEol(vt),createdAt:(m&&Date.parse(m.createdAt))||Date.now(),updatedAt:mts||Date.now()}))n++;else s++;
      }catch(x){s++;}
      return;
    }
    var base=e.name.replace(/^.*[\/\\]/,"").replace(/\.(txt|md)$/i,"")||"Sem título";
    var target=claimed[base]?uniq(base,takenTab,claimed):base;
    claimed[target]=1;
    var t=openFileObject({name:target},e.body.buffer);
    if(t&&typeof t.n==="number"){n+=t.n;s+=(t.s||0);return;}
    if(!t){s++;return;}
    if(m&&!t.modified){
      if(m.title)t.name=m.title;
      if(m.createdAt){var pc=Date.parse(m.createdAt);if(pc)t.createdAt=pc;}
      if(m.updatedAt){var pu=Date.parse(m.updatedAt);if(pu)t.updatedAt=pu;}
    }
    n++;
  });
  renderTabs();updateStatus(n+(n===1?" nota importada":" notas importadas")+(s?" • "+s+(s===1?" ignorada":" ignoradas"):""));scheduleSessionSave();
  return {n:n,s:s};
}
function openAllTabs(){
  var c=$("ctx");c.innerHTML="";
  var h=document.createElement("div");h.style.cssText="padding:7px 10px;font-size:11px;color:var(--text-dim)";h.textContent=tabs.length+(tabs.length===1?" guia":" guias");c.appendChild(h);
  tabs.forEach(function(t,i){
    var b=document.createElement("button");
    b.innerHTML="<span>"+esc((i===active?"● ":"○ ")+t.name)+"</span>";
    b.title="Criado: "+fmtDT(t.createdAt||Date.now())+" • Editado: "+fmtDT(t.updatedAt||t.createdAt||Date.now());
    if(i===active)b.style.fontWeight="bold";
    b.onclick=function(){c.classList.remove("show");active=i;syncEditor();renderTabs();updateStatus();scheduleSessionSave();};
    c.appendChild(b);
  });
  var r=$("btnAllTabs").getBoundingClientRect();
  c.classList.add("tabs-list");
  c.style.left=Math.max(8,Math.min(r.left,innerWidth-330))+"px";c.style.top=(r.bottom+6)+"px";c.style.right="auto";
  c.classList.add("show");
}
function openTabMenu(i,x,y){
  var c=$("ctx");c.innerHTML="";c.classList.remove("tabs-list");
  [["Ativar guia",function(){active=i;syncEditor();renderTabs();updateStatus();scheduleSessionSave();}],
   ["Mover para a esquerda",function(){moveTab(i,Math.max(0,i-1));}],
   ["Mover para a direita",function(){moveTab(i,Math.min(tabs.length-1,i+1));}],
   ["Guardar no navegador",function(){vaultSaveTab(i);}],
   ["Fechar guia",function(){closeTab(i);}]].forEach(function(p){
    var b=document.createElement("button");b.textContent=p[0];
    b.onclick=function(){c.classList.remove("show");p[1]();};c.appendChild(b);});
  c.style.left=Math.max(4,Math.min(x||8,window.innerWidth-200))+"px";
  c.style.top=Math.max(40,(y||40))+"px";c.style.right="auto";
  c.classList.add("show");
}
function closeMenus(){document.querySelectorAll(".menu.show").forEach(function(m){m.classList.remove("show");});document.querySelectorAll(".mi.open").forEach(function(b){b.classList.remove("open");});}
function hideBoxes(){$("findBox").classList.remove("show");$("replaceBox").classList.remove("show");}
function bindGlobalEvents(){
  document.querySelectorAll(".mi").forEach(function(b){
    b.onclick=function(e){e.stopPropagation();var m=$("menu-"+b.dataset.m),was=m.classList.contains("show");closeMenus();if(!was){var r=b.getBoundingClientRect();m.style.top="32px";m.classList.add("show");var w=m.offsetWidth||240;m.style.left=Math.max(4,Math.min(r.left,window.innerWidth-w-4))+"px";b.classList.add("open");}};
  });
  $("btnSettings").onclick=function(e){e.stopPropagation();var m=$("menu-settings"),was=m.classList.contains("show");closeMenus();if(!was)m.classList.add("show");};

  document.addEventListener("click",function(e){if(!e.target.closest(".menu")&&!e.target.closest(".mi")&&e.target.id!=="btnSettings")closeMenus();if(!e.target.closest(".small-find")&&!e.target.closest(".ctx"))$("ctx").classList.remove("show");});
  $("btnNewTab").onclick=function(){newTab();};
  var bv=$("btnVaultAll");if(bv)bv.onclick=function(){confirmVaultClear();};
  tabsEl.addEventListener("contextmenu",function(e){e.preventDefault();var el=e.target.closest?e.target.closest(".tab"):null;openTabMenu(el?+el.dataset.idx:active,e.clientX,e.clientY);});
  $("btnAllTabs").onclick=function(e){e.stopPropagation();openAllTabs();};
  $("zipInput").addEventListener("change",function(e){Array.from(e.target.files).forEach(function(f){f.arrayBuffer().then(function(b){importZipData(b);});});e.target.value="";});
  var imgInp=$("imgInput");if(imgInp)imgInp.addEventListener("change",function(e){Array.from(e.target.files).forEach(function(f){insertImageFile(f);});e.target.value="";});
  var fInp=$("fileAttachInput");if(fInp)fInp.addEventListener("change",function(e){Array.from(e.target.files).forEach(function(f){insertAttachmentFile(f);});e.target.value="";});
  $("fileInput").addEventListener("change",function(e){
    Array.from(e.target.files).forEach(function(f){f.arrayBuffer().then(function(b){openFileObject({name:f.name},b);});});
    e.target.value="";
  });
  editor.addEventListener("input",function(){markModified();updateStatus();if(settings.mdPreview)renderPreview();});
  editor.addEventListener("keyup",function(){updateStatus();});
  editor.addEventListener("click",function(){updateStatus();});
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
    else if(e.key==="F9"&&!c){e.preventDefault();if(typeof openRunPanel==="function")openRunPanel();else openRunInNewTab();}
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
  var stR=$("stRun");if(stR)stR.onclick=function(){if(typeof openRunPanel==="function")openRunPanel();else openRunInNewTab();};
  $("stZoom").onclick=function(e){e.stopPropagation();
    var c=$("ctx");c.innerHTML="";
    [["Ampliar",function(){setZoom(zoom+10);}],["Reduzir",function(){setZoom(zoom-10);}],["Restaurar (100%)",function(){setZoom(100);}]].forEach(function(p){
      var b=document.createElement("button");b.textContent=p[0];
      b.onclick=function(){p[1]();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-110)+"px";c.classList.add("show");
  };
  $("stEol").onclick=function(e){e.stopPropagation();
    var c=$("ctx");c.innerHTML="";
    [["Windows (CRLF)","CRLF"],["Unix (LF)","LF"],["Mac (CR)","CR"]].forEach(function(p){
      var b=document.createElement("button");b.textContent=(cur().eol===p[1]?"✓ ":"")+p[0];
      b.onclick=function(){cur().eol=p[1];updateStatus();scheduleSessionSave();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-110)+"px";c.classList.add("show");
  };
  $("stEnc").onclick=function(e){e.stopPropagation();
    var c=$("ctx");c.innerHTML="";
    ["UTF-8","UTF-8 with BOM","UTF-16 LE","UTF-16 BE","ANSI"].forEach(function(v){
      var b=document.createElement("button");b.textContent=(cur().encoding===v?"✓ ":"")+v;
      b.onclick=function(){cur().encoding=v;updateStatus();scheduleSessionSave();c.classList.remove("show");};c.appendChild(b);});
    var r=e.target.getBoundingClientRect();
    c.style.left=Math.min(r.left,innerWidth-200)+"px";c.style.top=(r.top-140)+"px";c.classList.add("show");
  };
  var stT=$("stTheme");if(stT)stT.onclick=function(){openThemeChooser();};
  var stD=$("stDates");if(stD)stD.onclick=function(){openProps();};
  var stX=$("stExt");if(stX)stX.onclick=function(){openExtDialog();};
  var stL=$("stLines");if(stL)stL.onclick=function(){openGoto();};
  $("ovl").addEventListener("click",function(e){if(e.target.id==="ovl")closeDlg();});
  window.addEventListener("dragover",function(e){e.preventDefault();document.body.classList.add("dragging");});
  window.addEventListener("dragleave",function(e){if(!e.relatedTarget)document.body.classList.remove("dragging");});
  window.addEventListener("drop",function(e){
    e.preventDefault();document.body.classList.remove("dragging");
    var fs=e.dataTransfer&&e.dataTransfer.files;
    if(fs&&fs.length)Array.from(fs).forEach(function(f){
      if(/^image\//i.test(f.type||"")){insertImageFile(f);return;}
      var t=(typeof cur==="function")?cur():null;
      if(t&&typeof isMarkdownFile==="function"&&isMarkdownFile(t.name)){insertAttachmentFile(f);return;}
      f.arrayBuffer().then(function(b){openFileObject({name:f.name},b);});
    });
  });
}
