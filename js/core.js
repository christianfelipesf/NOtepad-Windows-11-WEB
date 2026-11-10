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
  if(THEME_ORDER.indexOf(settings.theme)<0)settings.theme="dark";
}
function saveSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(settings));}catch(e){}}
var THEME_ORDER=["dark","light","white","sepia","midnight"];
function themeName(){return {dark:"Escuro",light:"Claro",white:"Branco",sepia:"Sépia",midnight:"Meia-noite"}[settings.theme]||"Escuro";}
function nextTheme(){settings.theme=THEME_ORDER[(THEME_ORDER.indexOf(settings.theme)+1)%THEME_ORDER.length];saveSettings();applyTheme();}
function fmtDT(ts){try{return new Date(ts).toLocaleString([],{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return "";}}
function fmtFileTS(ts){var d=new Date(ts);function p(n){return (n<10?"0":"")+n;}return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes());}
function sanitizeName(s){return String(s||"Sem título").replace(/[\\/:*?"<>|]/g,"_").trim().slice(0,80)||"Sem título";}
function applyTheme(){
  document.documentElement.dataset.theme=settings.theme;
  var t=(typeof cur==="function")?cur():null;
  document.title=((t&&t.modified)?"*":"")+((t&&t.name)||"Sem título")+" - RENotepad";
  var mt=document.getElementById("metaTheme");if(mt)mt.content=getComputedStyle(document.documentElement).getPropertyValue("--strip")||"#0c0c0c";
}
function saveSession(){
  try{
    if(typeof tabs==="undefined")return;
    var data={v:1,active:active,zoom:zoom,tabs:tabs.map(function(t){
      return {name:t.name,path:t.path,content:(typeof editor!=="undefined"&&tabs.indexOf(t)===active)?editor.value:t.content,encoding:t.encoding,eol:t.eol,modified:t.modified,createdAt:t.createdAt,updatedAt:t.updatedAt};
    })};
    var s=JSON.stringify(data);
    if(s.length>4500000){
      data.tabs=data.tabs.map(function(t){return {name:t.name,path:t.path,content:t.content.slice(0,200000),encoding:t.encoding,eol:t.eol,modified:t.modified,createdAt:t.createdAt,updatedAt:t.updatedAt};});
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
