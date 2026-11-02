"use strict";
/* Editor: zoom, localizar/substituir, ir para, fonte, data/hora, prévia MD. */
var zoom=100;
var preview=document.getElementById("preview");
function applyEditor(){
  editor.style.fontFamily=settings.face+",monospace";
  setZoomFont();
  editor.classList.toggle("wrap",settings.wrap);
  $("statusbar").style.display=settings.status?"flex":"none";
  var show=settings.mdPreview&&cur()&&isMarkdownFile(cur().name);
  preview.classList.toggle("show",!!show);
  if(show)renderPreview();
  var mb=$("mdbar");
  if(mb)mb.classList.toggle("show",!!(settings.mdBar&&cur()&&isMarkdownFile(cur().name)));
  var md=$("stMd");
  md.classList.toggle("off",!(cur()&&isMarkdownFile(cur().name)));
  md.style.fontWeight=settings.mdPreview?"bold":"normal";
}
function setZoomFont(){editor.style.fontSize=(settings.size*zoom/100)+"px";}
function setZoom(z){zoom=Math.max(10,Math.min(500,z));setZoomFont();updateStatus();scheduleSessionSave();}
function renderPreview(){if(cur())preview.innerHTML=mdRender(editor.value);}
function toggleMd(){
  settings.mdPreview=!settings.mdPreview;saveSettings();applyEditor();
  if(settings.mdPreview&&cur()&&!isMarkdownFile(cur().name))updateStatus("Prévia ativa: renomeie para .md para ver formatado");
  else updateStatus();
}
function insertTimeDate(){document.execCommand("insertText",false,stampNow());markModified();}
function mdWrap(before,after){
  var s=editor.selectionStart,e=editor.selectionEnd,v=editor.value,sel=v.slice(s,e);
  editor.value=v.slice(0,s)+before+sel+after+v.slice(e);
  if(sel)editor.setSelectionRange(s+before.length,s+before.length+sel.length);
  else editor.setSelectionRange(s+before.length,s+before.length);
  markModified();editor.focus();
}
function mdPrefix(fn){
  var s=editor.selectionStart,e=editor.selectionEnd,v=editor.value;
  var a=v.slice(0,s).split("\n").length-1,b=v.slice(0,e).split("\n").length-1,lines=v.split("\n"),n=0;
  for(var i=a;i<=b;i++){lines[i]=fn(lines[i],n);n++;}
  editor.value=lines.join("\n");
  markModified();editor.focus();updateStatus();
}
function mdFmt(cmd){
  if(!cur())return;
  if(cmd==="bold")mdWrap("**","**");
  else if(cmd==="italic")mdWrap("*","*");
  else if(cmd==="strike")mdWrap("~~","~~");
  else if(cmd==="code")mdWrap("`","`");
  else if(cmd==="h1")mdPrefix(function(l){return "# "+l.replace(/^#{1,6}\s*/,"");});
  else if(cmd==="h2")mdPrefix(function(l){return "## "+l.replace(/^#{1,6}\s*/,"");});
  else if(cmd==="h3")mdPrefix(function(l){return "### "+l.replace(/^#{1,6}\s*/,"");});
  else if(cmd==="ul")mdPrefix(function(l){return "- "+l;});
  else if(cmd==="ol")mdPrefix(function(l,i){return (i+1)+". "+l;});
  else if(cmd==="quote")mdPrefix(function(l){return "> "+l;});
  else if(cmd==="link"){
    var s=editor.selectionStart,e=editor.selectionEnd,v=editor.value,sel=v.slice(s,e);
    var ins=sel?"["+sel+"]()":"[]()";
    editor.value=v.slice(0,s)+ins+v.slice(e);
    var p=sel?s+ins.length-1:s+1;
    editor.setSelectionRange(p,p);
    markModified();editor.focus();
  }
}
function findInEditor(q,down,cs,wrap){
  var txt=editor.value,hay=cs?txt:txt.toLowerCase(),needle=cs?q:q.toLowerCase(),pos=-1,fromTop=false,fromBottom=false;
  if(down){var s=editor.selectionEnd;if(editor.selectionStart===0&&editor.selectionEnd===txt.length)s=0;pos=hay.indexOf(needle,s);if(pos<0&&wrap&&s>0){pos=hay.indexOf(needle,0);if(pos>=0)fromTop=true;}}
  else{var s2=editor.selectionStart-1;if(editor.selectionStart===0&&editor.selectionEnd===txt.length)s2=txt.length-1;pos=hay.lastIndexOf(needle,s2);if(pos<0&&wrap){pos=hay.lastIndexOf(needle);if(pos>=0)fromBottom=true;}}
  if(pos<0){dlg("<h2>RENotepad</h2><p>Não foi possível localizar \""+esc(q)+"\"</p><div class='row'><button class='btn primary' onclick='closeDlg()'>OK</button></div>");return;}
  editor.focus();
  if(editor.setRangeText){try{editor.setRangeText(txt.slice(pos,pos+q.length),pos,pos+q.length,"select");}catch(e){}}
  editor.setSelectionRange(pos,pos+q.length);
  updateStatus(fromTop?"Localizado a partir do início":fromBottom?"Localizado a partir do fim":"");
}
function doFind(down){
  var q=$("findText").value;if(!q)return;
  settings.matchCase=$("findCase").checked;settings.wrapAround=$("findWrap").checked;saveSettings();
  findInEditor(q,down,settings.matchCase,settings.wrapAround);
}
function findNextRep(q,cs){
  var txt=editor.value,hay=cs?txt:txt.toLowerCase(),nd=cs?q:q.toLowerCase();
  var pos=hay.indexOf(nd,editor.selectionEnd);
  if(pos<0)pos=hay.indexOf(nd,0);
  if(pos<0){dlg("<h2>RENotepad</h2><p>Não foi possível localizar \""+esc(q)+"\"</p><div class='row'><button class='btn primary' onclick='closeDlg()'>OK</button></div>");return;}
  editor.setSelectionRange(pos,pos+q.length);editor.focus();
}
function doReplaceOne(){
  var q=$("repFind").value,by=$("repBy").value;if(!q)return;
  var cs=$("repCase").checked,sel=editor.value.slice(editor.selectionStart,editor.selectionEnd);
  if((cs?sel===q:sel.toLowerCase()===q.toLowerCase())){document.execCommand("insertText",false,by);markModified();}
  findNextRep(q,cs);
}
function doReplaceAll(){
  var q=$("repFind").value,by=$("repBy").value;if(!q)return;
  var cs=$("repCase").checked,txt=editor.value,out,n=0;
  if(cs){out=txt.split(q).join(by);n=txt.split(q).length-1;}
  else{var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");n=(txt.match(re)||[]).length;out=txt.replace(re,by);}
  editor.value=out;markModified();updateStatus(n+" substituições");
}
