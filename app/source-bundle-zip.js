(function (root) {
  'use strict';
  async function read(file) {
    const bytes=new Uint8Array(await file.arrayBuffer()), view=new DataView(bytes.buffer);
    if(bytes.length>128*1024*1024) throw new Error('원문 ZIP은 128MB 이하로 나누세요.');
    const names=new Map(); let at=0, count=0, total=0;
    while(at+4<=bytes.length && view.getUint32(at,true)===0x04034b50) {
      if(++count>200 || at+30>bytes.length) throw new Error('ZIP 파일 수 초과 또는 손상');
      const flags=view.getUint16(at+6,true),method=view.getUint16(at+8,true);
      if(method!==0 || flags&8) throw new Error('앱에서 저장한 원문 ZIP을 사용하세요.');
      const size=view.getUint32(at+18,true),original=view.getUint32(at+22,true);
      const n=view.getUint16(at+26,true),e=view.getUint16(at+28,true);
      const end=at+30+n+e+size;
      if(end>bytes.length || size!==original || size>32*1024*1024 || total+size>128*1024*1024)
        throw new Error('ZIP 크기 또는 구조가 잘못됐습니다.');
      const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+30,at+30+n));
      if(!name || name.startsWith('/') || name.includes('..') || name.includes('\\') || names.has(name))
        throw new Error('안전하지 않은 ZIP 경로입니다.');
      const data=bytes.slice(at+30+n+e,end);
      if(root.ThreadsSourceCutZip.crc32(data)!==view.getUint32(at+14,true)) throw new Error('ZIP 파일 손상: '+name);
      names.set(name,data);at=end;total+=size;
    }
    if(!names.size) throw new Error('원문 ZIP을 읽지 못했습니다.');
    return names;
  }
  root.ThreadsSourceBundleZip=Object.freeze({read});
})(typeof globalThis!=='undefined'?globalThis:this);
