"use strict";
/* Núcleo: utilidades, configurações e persistência de sessão. */
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function debounce(fn,ms){var t=null;return function(){clearTimeout(t);var a=arguments,s=this;t=setTimeout(function(){fn.apply(s,a);},ms);};}
function stampNow(){var n=new Date();return n.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+" "+n.toLocaleDateString();}
var SET_KEY="renotepad2.settings", SES_KEY="renotepad2.session";
var settings={wrap:false,status:true,theme:"dark",face:"Consolas",size:15,matchCase:false,wrapAround:true,stampOnSave:false,mdPreview:false,mdBar:true};
function loadSettings(){
  try{
    var old=JSON.parse(localStorage.getItem("renotepad")||"null");
    var s=JSON.parse(localStorage.getItem(SET_KEY)||"null")||old||{};
    if(s.dark===false&&!s.theme)s.theme="light";delete s.dark;
    for(var k in settings){if(s[k]!==undefined)settings[k]=s[k];}
  }catch(e){}
  if(["dark","light","white"].indexOf(settings.theme)<0)settings.theme="dark";
}
function saveSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(settings));}catch(e){}}
function themeName(){return settings.theme==="dark"?"Escuro":settings.theme==="light"?"Claro":"Branco";}
function applyTheme(){
  document.documentElement.dataset.theme=settings.theme;
  var t=(typeof cur==="function")?cur():null;
  document.title=((t&&t.modified)?"*":"")+((t&&t.name)||"Sem título")+" - RENotepad";
}
function saveSession(){
  try{
    if(typeof tabs==="undefined")return;
    var data={v:1,active:active,zoom:zoom,tabs:tabs.map(function(t){
      return {name:t.name,path:t.path,content:(typeof editor!=="undefined"&&tabs.indexOf(t)===active)?editor.value:t.content,encoding:t.encoding,eol:t.eol,modified:t.modified};
    })};
    var s=JSON.stringify(data);
    if(s.length>4500000){
      data.tabs=data.tabs.map(function(t){return {name:t.name,path:t.path,content:t.content.slice(0,200000),encoding:t.encoding,eol:t.eol,modified:t.modified};});
      s=JSON.stringify(data);
    }
    localStorage.setItem(SES_KEY,s);
  }catch(e){}
}
var scheduleSessionSave=debounce(saveSession,500);
function loadSession(){
  try{
    var d=JSON.parse(localStorage.getItem(SES_KEY)||"null");
    if(!d||!Array.isArray(d.tabs)||!d.tabs.length)return null;
    return d;
  }catch(e){return null;}
}
