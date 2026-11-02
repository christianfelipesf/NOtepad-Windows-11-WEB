"use strict";
/* Inicialização: carrega configurações, restaura guias e liga tudo. */
loadSettings();
bindGlobalEvents();
(function restore(){
  var ses=loadSession(),count=0;
  if(ses&&ses.tabs){
    ses.tabs.slice(0,20).forEach(function(s){
      if(typeof s.content!=="string")return;
      untitledN++;
      tabs.push({name:s.name||("Sem título "+untitledN),path:s.path||null,handle:null,content:s.content,modified:!!s.modified,encoding:s.encoding||"UTF-8",eol:s.eol||"CRLF"});
      count++;
    });
    if(count){
      active=Math.max(0,Math.min(ses.active||0,tabs.length-1));
      if(typeof ses.zoom==="number")zoom=Math.max(10,Math.min(500,ses.zoom));
    }
  }
  if(!count)newTab();
  else{syncEditor();renderTabs();updateStatus(count+" guia(s) restaurada(s)");}
  buildMenus();
  $("findCase").checked=settings.matchCase;
  $("findWrap").checked=settings.wrapAround;
})();
window.addEventListener("beforeunload",saveSession);
