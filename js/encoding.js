"use strict";
/* Codificação e quebras de linha, como o Windows 10 faz. */
function detectEncoding(buf){
  if(buf.length>=3&&buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF)return {enc:"UTF-8 with BOM",strip:3};
  if(buf.length>=2&&buf[0]===0xFF&&buf[1]===0xFE)return {enc:"UTF-16 LE",strip:2};
  if(buf.length>=2&&buf[0]===0xFE&&buf[1]===0xFF)return {enc:"UTF-16 BE",strip:2};
  try{new TextDecoder("utf-8",{fatal:true}).decode(buf);return {enc:"UTF-8",strip:0};}
  catch(e){return {enc:"ANSI",strip:0};}
}
function decodeBuf(buf,info){
  var b=buf.slice(info.strip),i;
  if(info.enc==="UTF-16 LE")return new TextDecoder("utf-16le").decode(b);
  if(info.enc==="UTF-16 BE"){var le=new Uint8Array(b.length);for(i=0;i+1<b.length;i+=2){le[i]=b[i+1];le[i+1]=b[i];}return new TextDecoder("utf-16le").decode(le);}
  if(info.enc==="ANSI")return new TextDecoder("windows-1252").decode(b);
  return new TextDecoder("utf-8").decode(b);
}
function detectEol(text){
  var crlf=(text.match(/\r\n/g)||[]).length;
  var lone=(text.match(/\r(?!\n)/g)||[]).length;
  var lf=(text.match(/(?<!\r)\n/g)||[]).length;
  if(crlf>=lf&&crlf>=lone)return "CRLF";
  if(lf>=crlf&&lf>=lone)return "LF";
  return "CR";
}
function toEol(text,eol){
  var u=text.replace(/\r\n|\r|\n/g,"\n");
  if(eol==="CRLF")return u.replace(/\n/g,"\r\n");
  if(eol==="CR")return u.replace(/\n/g,"\r");
  return u;
}
function encodeContent(text,enc){
  var i;
  if(enc==="UTF-8 with BOM")return {bytes:new Uint8Array([0xEF,0xBB,0xBF].concat(Array.from(new TextEncoder().encode(text))))};
  if(enc==="UTF-16 LE"){var a=new Uint8Array(2+text.length*2);a[0]=0xFF;a[1]=0xFE;for(i=0;i<text.length;i++){a[2+i*2]=text.charCodeAt(i)&255;a[2+i*2+1]=(text.charCodeAt(i)>>8)&255;}return {bytes:a};}
  if(enc==="UTF-16 BE"){var c=new Uint8Array(2+text.length*2);c[0]=0xFE;c[1]=0xFF;for(i=0;i<text.length;i++){c[2+i*2]=(text.charCodeAt(i)>>8)&255;c[2+i*2+1]=text.charCodeAt(i)&255;}return {bytes:c};}
  if(enc==="ANSI"){var out=[],lossy=false;for(var ch of text){var cp=ch.codePointAt(0);if(cp>255){out.push(0x3F);lossy=true;}else out.push(cp);}return {bytes:new Uint8Array(out),lossy:lossy};}
  return {bytes:new TextEncoder().encode(text)};
}
