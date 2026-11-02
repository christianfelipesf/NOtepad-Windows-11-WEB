"use strict";
/* Leitor Markdown enxuto, sem dependências (prévia de .md). */
function mdInline(s){
  s=esc(s);
  s=s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,"<img alt='$1' src='$2'>");
  s=s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,"<a href='$2' target='_blank' rel='noopener'>$1</a>");
  s=s.replace(/`([^`]+)`/g,"<code>$1</code>");
  s=s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/__([^_]+)__/g,"<strong>$1</strong>");
  s=s.replace(/\*([^*]+)\*/g,"<em>$1</em>");
  s=s.replace(/(^|\W)_([^_]+)_(\W|$)/g,"$1<em>$2</em>$3");
  s=s.replace(/~~([^~]+)~~/g,"<del>$1</del>");
  return s;
}
function mdRender(src){
  var lines=src.replace(/\r\n?/g,"\n").split("\n"),html=[],i=0,n=lines.length;
  function isFence(l){return /^```/.test(l);}
  while(i<n){
    var l=lines[i];
    if(isFence(l)){var lang=l.slice(3).trim(),buf=[];i++;while(i<n&&!isFence(lines[i])){buf.push(lines[i]);i++;}i++;html.push("<pre><code>"+esc(buf.join("\n"))+"</code></pre>");continue;}
    var h=l.match(/^(#{1,6})\s+(.*)/);
    if(h){var lv=h[1].length;html.push("<h"+lv+">"+mdInline(h[2])+"</h"+lv+">");i++;continue;}
    if(/^\s*---+\s*$/.test(l)){html.push("<hr>");i++;continue;}
    var bq=l.match(/^\s*>\s?(.*)/);
    if(bq){var q=[];while(i<n){var m=lines[i].match(/^\s*>\s?(.*)/);if(!m)break;q.push(m[1]);i++;}html.push("<blockquote>"+q.map(mdInline).join("<br>")+"</blockquote>");continue;}
    if(/^\s*\|.*\|\s*$/.test(l)&&i+1<n&&/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1])){
      var heads=l.split("|").filter(function(c){return c.trim()!=="";}).map(mdInline);
      i+=2;var rows=[];
      while(i<n&&/^\s*\|.*\|\s*$/.test(lines[i])){rows.push(lines[i].split("|").filter(function(c){return c.trim()!=="";}).map(mdInline));i++;}
      html.push("<table><tr><th>"+heads.join("</th><th>")+"</th></tr>"+rows.map(function(r){return "<tr><td>"+r.join("</td><td>")+"</td></tr>";}).join("")+"</table>");continue;}
    var li=l.match(/^\s*([-*+]|\d+[.)])\s+(.*)/);
    if(li){var items=[],ordered=/\d/.test(li[1]);
      while(i<n){var lm=lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.*)/);if(!lm)break;
        var task=lm[2].match(/^\[([ xX])\]\s+(.*)/);
        items.push(task?("<input type='checkbox' disabled"+(task[1].toLowerCase()==="x"?" checked":"")+"> "+mdInline(task[2])):mdInline(lm[2]));i++;}
      html.push((ordered?"<ol>":"<ul>")+items.map(function(x){return "<li>"+x+"</li>";}).join("")+(ordered?"</ol>":"</ul>"));continue;}
    if(l.trim()===""){i++;continue;}
    var para=[l];i++;
    while(i<n&&lines[i].trim()!==""&&!/^(#{1,6}\s|```|\s*([-*+]|\d+[.)])\s|\s*>|\s*\|.*\|\s*$)/.test(lines[i])){para.push(lines[i]);i++;}
    html.push("<p>"+para.map(mdInline).join("<br>")+"</p>");
  }
  return html.join("\n")||"<p><em>(vazio)</em></p>";
}
function isMarkdownFile(name){return /\.md|markdown$/i.test(name||"");}
