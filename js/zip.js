"use strict";
/* ZIP mínimo (método STORE, sem compressão) para baixar várias notas de uma vez
   e importar o .zip de volta. Nomes de arquivo em UTF-8 (flag 0x0800).
   Sem dependências. Não lê arquivos DEFLATE (ex.: criados por outros programas). */
var ZipCRC=(function(){
  var table=new Uint32Array(256);
  for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[n]=c>>>0;}
  return {of:function(bytes){var crc=0xFFFFFFFF;for(var i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&0xFF]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0;}};
})();
function zipEncode(str){
  if(typeof TextEncoder!=="undefined")return new TextEncoder().encode(str);
  var out=[],i,ch;
  for(i=0;i<str.length;i++){ch=str.charCodeAt(i);
    if(ch<0x80)out.push(ch);
    else if(ch<0x800)out.push(0xC0|(ch>>6),0x80|(ch&0x3F));
    else if(ch>=0xD800&&ch<=0xDBFF&&i+1<str.length){var lo=str.charCodeAt(i+1);if(lo>=0xDC00&&lo<=0xDFFF){var cp=0x10000+((ch-0xD800)<<10)+(lo-0xDC00);out.push(0xF0|(cp>>18),0x80|((cp>>12)&0x3F),0x80|((cp>>6)&0x3F),0x80|(cp&0x3F));i++;}}
    else out.push(0xE0|(ch>>12),0x80|((ch>>6)&0x3F),0x80|(ch&0x3F));
  }
  return new Uint8Array(out);
}
function zipDecode(bytes){
  if(typeof TextDecoder!=="undefined")return new TextDecoder("utf-8").decode(bytes);
  var s="",i;for(i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
  try{return decodeURIComponent(escape(s));}catch(e){return s;}
}
function makeZip(entries){
  var enc=zipEncode,parts=[],central=[],offset=0;
  function bytesOf(b){return (typeof b==="string")?enc(b):b;}
  entries.forEach(function(e){
    var nameB=enc(e.name),data=bytesOf(e.body),crc=ZipCRC.of(data);
    var lh=new Uint8Array(30);parts.push(lh);
    var dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
    dv.setUint16(8,0,true);dv.setUint16(10,0x21<<8|0,true);dv.setUint16(12,0x21<<8|0,true);
    dv.setUint32(14,crc,true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
    dv.setUint16(26,nameB.length,true);dv.setUint16(28,0,true);
    parts.push(nameB);parts.push(data);
    central.push({nameB:nameB,crc:crc,size:data.length,offset:offset});
    offset+=30+nameB.length+data.length;
  });
  var cdStart=offset,cdSize=0;
  central.forEach(function(c){
    var h=new Uint8Array(46);parts.push(h);
    var dv=new DataView(h.buffer);
    dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);
    dv.setUint16(8,0x0800,true);dv.setUint16(10,0,true);
    dv.setUint16(12,0x21<<8|0,true);dv.setUint16(14,0x21<<8|0,true);
    dv.setUint32(16,c.crc,true);dv.setUint32(20,c.size,true);dv.setUint32(24,c.size,true);
    dv.setUint16(28,c.nameB.length,true);dv.setUint16(30,0,true);dv.setUint16(32,0,true);
    dv.setUint16(34,0,true);dv.setUint16(36,0,true);dv.setUint32(38,0,true);
    dv.setUint32(42,c.offset,true);
    parts.push(c.nameB);
    cdSize+=46+c.nameB.length;
  });
  var end=new Uint8Array(22);parts.push(end);
  var ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,cdStart,true);ev.setUint16(20,0,true);
  return new Blob(parts,{type:"application/zip"});
}
function parseZip(buf){
  var bytes=(buf instanceof Uint8Array)?buf:new Uint8Array(buf);
  if(bytes.length<22)throw new Error("zip curto");
  var dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
  var endPos=-1,lo=Math.max(0,bytes.length-22-65557);
  for(var i=bytes.length-22;i>=lo;i--){if(dv.getUint32(i,true)===0x06054b50){endPos=i;break;}}
  if(endPos<0)throw new Error("EOCD não encontrado");
  var count=dv.getUint16(endPos+10,true),cdOff=dv.getUint32(endPos+16,true);
  var out=[],p=cdOff;
  for(var n=0;n<count;n++){
    if(dv.getUint32(p,true)!==0x02014b50)throw new Error("diretório inválido");
    var method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true);
    var nlen=dv.getUint16(p+28,true),elen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true);
    var lho=dv.getUint32(p+42,true);
    var name=zipDecode(bytes.subarray(p+46,p+46+nlen));
    var nlen2=dv.getUint16(lho+26,true),elen2=dv.getUint16(lho+28,true);
    var ds=lho+30+nlen2+elen2;
    if(method!==0)throw new Error("compactação não suportada: "+name);
    out.push({name:name,body:bytes.slice(ds,ds+csize)});
    p+=46+nlen+elen+clen;
  }
  return out;
}
