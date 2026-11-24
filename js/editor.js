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
  var rn=$("stRun");if(rn&&typeof isRunnableFile==="function")rn.classList.toggle("off",!(cur()&&isRunnableFile(cur().path||cur().name)));

  md.style.fontWeight=settings.mdPreview?"bold":"normal";
}
function setZoomFont(){editor.style.fontSize=(settings.size*zoom/100)+"px";}
function setZoom(z){zoom=Math.max(10,Math.min(500,z));setZoomFont();updateStatus();scheduleSessionSave();}
function renderPreview(){var t=cur();if(t)preview.innerHTML=mdRender(resolveAttachments(editor.value,t));}
function toggleMd(){
  settings.mdPreview=!settings.mdPreview;saveSettings();applyEditor();
  if(settings.mdPreview&&cur()&&!isMarkdownFile(cur().name))updateStatus("Prévia ativa: renomeie para .md para ver formatado");
  else updateStatus();
}
function insertTimeDate(){document.execCommand("insertText",false,stampNow());markModified();}
function imageAlt(file){var n=String((file&&file.name)||"").replace(/\.[^.]+$/,"").replace(/[\[\]()]/g," ").trim();return n||"foto";}
function pasteCaption(){try{return "*Colado em "+fmtDT(Date.now())+"*";}catch(e){return "*Colado em*";}}
function attachmentBase(name,fallback){
  var n=String(name||"").replace(/^.*[\\\/]/,"").replace(/\.[^.]+$/,"").replace(/[\[\]()]/g," ").trim();
  n=n.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,40);
  return n||String(fallback||"arquivo");
}
function attachmentExtOf(dataUrl,fileName){
  var mt=String(dataUrl||"").match(/^data:([a-z0-9+.-]+\/[a-z0-9+.-]+)/i);
  var m=(mt&&mt[1]||"").toLowerCase();
  var map={"image/jpeg":".jpg","image/gif":".gif","image/webp":".webp","image/svg+xml":".svg","image/bmp":".bmp","image/png":".png",
    "application/pdf":".pdf","application/zip":".zip","text/plain":".txt","text/markdown":".md","application/json":".json","text/csv":".csv",
    "text/html":".html","audio/mpeg":".mp3","audio/ogg":".ogg","video/mp4":".mp4","audio/mp4":".m4a"};
  if(map[m])return map[m];
  if(m.indexOf("image/")===0)return ".png";
  var fm=String(fileName||"").match(/\.[a-z0-9]{1,10}$/i);
  if(fm)return fm[0].toLowerCase();
  if(m.indexOf("text/")===0)return ".txt";
  return ".bin";
}
function markdownNameFor(base){
  var n=String(base||"").trim()||"Sem título";
  if(isMarkdownFile(n))return n;
  if(/\.txt$/i.test(n))return n.replace(/\.txt$/i,".md");
  return n+".md";
}
function convertCurrentToMarkdown(){
  var t=cur();if(!t||isMarkdownFile(t.name))return false;
  if(!t.origName)t.origName=t.name;
  if(t.path&&!t.origPath)t.origPath=t.path;
  var nu=markdownNameFor(t.name);
  t.name=nu;
  if(!t.path)t.fallback=nu;else t.path=nu;
  t.handle=null;
  t.updatedAt=Date.now();
  renderTabs();applyEditor();scheduleSessionSave();
  return true;
}
function askMarkdownConvert(alt,kind){
  var t=cur();if(!t||isMarkdownFile(t.name)||t.mdAskDeclined)return false;
  var shown=t.origName||t.name||"Sem título";
  var what=kind||"Foto";
  dlg("<h2>"+what+" em nota sem Markdown</h2><p>O anexo foi inserido como Markdown ("+esc((kind==="Arquivo"?"[":"![")+(alt||"anexo")+"]...")+") mas esta nota (<b>"+esc(t.name||"Sem título")+"</b>) ainda não é .md, então a prévia e a barra Markdown continuam desligadas.</p>"
    +"<p>Quer converter para Markdown agora? O nome original (<b>"+esc(shown)+"</b>) fica guardado e nada do texto é apagado.</p>"
    +"<div class='row'><button class='btn primary' id='mdYes'>Converter para .md</button><button class='btn' id='mdNo'>Manter como está</button></div>");
  $("mdYes").onclick=function(){closeDlg();if(convertCurrentToMarkdown())updateStatus("Nota convertida para .md (original: "+cur().origName+")");};
  $("mdNo").onclick=function(){var c=cur();if(c)c.mdAskDeclined=true;closeDlg();updateStatus((kind==="Arquivo"?"Arquivo inserido":"Foto inserida")+" (Markdown): "+(alt||"anexo")+" — toque aqui para converter para .md",function(){var cc=cur();if(cc)cc.mdAskDeclined=false;askMarkdownConvert(alt,kind);});};
  return true;
}
var IMG_INLINE_LIMIT=1000;
function ensureAttachments(t){if(!t)return {};if(!t.attachments||typeof t.attachments!=="object")t.attachments={};return t.attachments;}
function imageExtOf(dataUrl){return attachmentExtOf(dataUrl,"");}
function nextAttachmentName(t,base,ext){
  var att=ensureAttachments(t);
  var b=attachmentBase(base,"arquivo");
  var n=1,name=""+b+ext;
  while(att[name]||editor.value.indexOf("]("+name+")")>=0){n++;name=b+"-"+n+ext;}
  return name;
}
function nextImageName(t,alt,ext){return nextAttachmentName(t,alt||"imagem",ext);}
function compactLongDataUrlsInText(text,t){
  var n=0;
  var out=String(text).replace(/(!?\[[^\]]*\])\((data:[^)\s]*;base64,[A-Za-z0-9+/=]+)\)/gi,function(m,link,url){
    if(url.length<IMG_INLINE_LIMIT)return m;
    var isImg=link.charAt(0)==="!";
    var inner=link.replace(/^!?\[/,"").replace(/\]$/,"");
    var att=ensureAttachments(t),k;
    for(k in att){if(att[k]===url){n++;return (isImg?"!":"")+ "["+inner+"]("+k+")";}}
    var nm=nextAttachmentName(t,inner||(isImg?"imagem":"arquivo"),attachmentExtOf(url,inner));
    att[nm]=url;n++;
    return (isImg?"!":"")+ "["+inner+"]("+nm+")";
  });
  return {text:out,count:n};
}
function compactTabImages(t){
  if(!t||typeof t.content!=="string"||t.content.indexOf("data:")<0)return 0;
  var r=compactLongDataUrlsInText(t.content,t);
  if(!r.count)return 0;
  t.content=r.text;t.updatedAt=Date.now();
  if(typeof editor!=="undefined"&&tabs.indexOf(t)===active&&editor.value!==r.text){
    var pos=null;try{pos=editor.selectionStart;}catch(e){}
    editor.value=r.text;
    try{if(pos!=null)editor.setSelectionRange(Math.max(0,Math.min(pos,r.text.length)),Math.max(0,Math.min(pos,r.text.length)));}catch(e){}
  }
  if(typeof scheduleSessionSave==="function")scheduleSessionSave();
  return r.count;
}
function resolveAttachments(text,t){
  var s=String(text==null?"":text),att=(t&&t.attachments)||{},k;
  for(k in att){if(s.indexOf(k)>=0)s=s.split("]("+k+")").join("]("+att[k]+")");}
  return s;
}
function insertMarkdownImage(dataUrl,alt){
  var host=cur(),short=null;
  if(host&&/^data:image\//i.test(dataUrl||"")&&String(dataUrl).length>IMG_INLINE_LIMIT){
    short=nextImageName(host,alt,imageExtOf(dataUrl));
    ensureAttachments(host)[short]=dataUrl;
  }
  var md="!["+alt+"]("+(short||dataUrl)+")\n"+pasteCaption();
  var s=editor.selectionStart||0,e=editor.selectionEnd||s,v=editor.value;
  var text=(s>0&&v.charAt(s-1)!=="\n"?"\n":"")+md+"\n";
  editor.focus();
  var ok=false;try{ok=document.execCommand("insertText",false,text);}catch(err){}
  if(!ok){editor.value=v.slice(0,s)+text+v.slice(e);editor.setSelectionRange(s+text.length,s+text.length);}
  markModified();if(settings.mdPreview)renderPreview();
  var t=cur();
  var tag=short?("Foto inserida de forma compacta: "+alt+" ("+short+")"):"Foto inserida (Markdown): "+alt;
  if(t&&!isMarkdownFile(t.name)){
    if(!t.mdAskDeclined&&typeof dlg==="function"){askMarkdownConvert(alt);return;}
    updateStatus(tag+" — toque aqui para converter para .md",function(){var c=cur();if(c)c.mdAskDeclined=false;askMarkdownConvert(alt);});
    return;
  }
  updateStatus(tag);
}
function insertImageFile(file){
  if(!file||!/^image\//i.test(file.type||""))return false;
  if(file.size>8*1024*1024){updateStatus("Foto muito grande (máx. 8 MB)");return true;}
  var alt=imageAlt(file);
  var rd=new FileReader();
  rd.onload=function(){
    var url=String(rd.result||"");if(!url)return;
    var img=new Image();
    img.onload=function(){
      var w=img.naturalWidth||0,h=img.naturalHeight||0,scale=(w&&h)?Math.min(1,1600/Math.max(w,h)):1;
      if(scale<1||file.size>1024*1024){
        try{
          var c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          var out=c.toDataURL(file.type==="image/png"?"image/png":"image/jpeg",0.88);
          if(out&&out.length<url.length)url=out;
        }catch(err){}
      }
      insertMarkdownImage(url,alt);
      if(url.length>1500000)updateStatus("Foto inserida, mas a nota ficou pesada ("+Math.round(url.length/1024)+" KB) — pode não caber no salvamento automático");
    };
    img.onerror=function(){insertMarkdownImage(url,alt);};
    img.src=url;
  };
  rd.onerror=function(){updateStatus("Não foi possível ler a foto");};
  rd.readAsDataURL(file);
  return true;
}
function pickImage(){var inp=$("imgInput");if(inp)inp.click();}
function pickFile(){var inp=$("fileAttachInput");if(inp)inp.click();}
function insertMarkdownFile(dataUrl,name){
  var host=cur(),short=null;
  if(host&&/^data:/i.test(dataUrl||"")&&String(dataUrl).length>IMG_INLINE_LIMIT){
    short=nextAttachmentName(host,name,attachmentExtOf(dataUrl,name));
    ensureAttachments(host)[short]=dataUrl;
  }
  var md="["+name+"]("+(short||dataUrl)+")\n"+pasteCaption();
  var s=editor.selectionStart||0,e=editor.selectionEnd||s,v=editor.value;
  var text=(s>0&&v.charAt(s-1)!=="\n"?"\n":"")+md+"\n";
  editor.focus();
  var ok=false;try{ok=document.execCommand("insertText",false,text);}catch(err){}
  if(!ok){editor.value=v.slice(0,s)+text+v.slice(e);editor.setSelectionRange(s+text.length,s+text.length);}
  markModified();if(settings.mdPreview)renderPreview();
  var t=cur();
  var tag=short?("Arquivo inserido de forma compacta: "+name+" ("+short+")"):"Arquivo inserido (Markdown): "+name;
  if(t&&!isMarkdownFile(t.name)){
    if(!t.mdAskDeclined&&typeof dlg==="function"){askMarkdownConvert(name,"Arquivo");return;}
    updateStatus(tag+" — toque aqui para converter para .md",function(){var c=cur();if(c)c.mdAskDeclined=false;askMarkdownConvert(name,"Arquivo");});
    return;
  }
  updateStatus(tag);
}
function insertAttachmentFile(file){
  if(!file)return false;
  if(/^image\//i.test(file.type||""))return insertImageFile(file);
  if(file.size>8*1024*1024){updateStatus("Arquivo muito grande (máx. 8 MB)");return true;}
  var name=String((file&&file.name)||"arquivo").replace(/[\[\]()]/g," ").trim()||"arquivo";
  var rd=new FileReader();
  rd.onload=function(){
    var url=String(rd.result||"");if(!url)return;
    insertMarkdownFile(url,name);
    if(url.length>1500000)updateStatus("Arquivo inserido, mas a nota ficou pesada ("+Math.round(url.length/1024)+" KB) — pode não caber no salvamento automático");
  };
  rd.onerror=function(){updateStatus("Não foi possível ler o arquivo");};
  try{rd.readAsDataURL(file);}catch(e){updateStatus("Não foi possível ler o arquivo");}
  return true;
}
function pasteImageFromClipboard(){
  if(navigator.clipboard&&navigator.clipboard.read){
    navigator.clipboard.read().then(function(items){
      var found=null;
      items.forEach(function(it){(it.types||[]).forEach(function(tp){if(/^image\//i.test(tp))found={it:it,tp:tp};});});
      if(!found){pickImage();return;}
      found.it.getType(found.tp).then(function(b){insertImageFile(b);}).catch(function(){pickImage();});
    }).catch(function(){pickImage();});
  }else pickImage();
}
if(typeof editor!=="undefined"&&editor&&editor.addEventListener)editor.addEventListener("paste",function(e){
  var cd=e.clipboardData;if(!cd)return;
  var files=[];
  if(cd.files&&cd.files.length)files=Array.from(cd.files);
  else if(cd.items)Array.from(cd.items).forEach(function(it){if(it.kind==="file"){var f=it.getAsFile();if(f)files.push(f);}});
  var img=null,others=[];
  files.forEach(function(f){
    if(/^image\//i.test(f.type||"")){if(!img)img=f;}
    else others.push(f);
  });
  if(img){e.preventDefault();insertImageFile(img);}
  if(others.length){
    var t=cur();
    if(t&&typeof isMarkdownFile==="function"&&isMarkdownFile(t.name)){
      e.preventDefault();
      others.forEach(function(f){insertAttachmentFile(f);});
    }
  }
});
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
