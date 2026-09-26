(function () {
  'use strict';
  const table = Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function header(length) { const bytes = new Uint8Array(length); return { bytes, view: new DataView(bytes.buffer) }; }
  function zip(files) {
    const chunks = [], central = []; let offset = 0, size = 0;
    if (files.length > 500) throw new Error('파일이 너무 많습니다. 분할선을 줄여주세요.');
    for (const file of files) {
      const name = new TextEncoder().encode(file.name), data = file.data, crc = crc32(data);
      if (offset + data.length > 128 * 1024 * 1024) throw new Error('출력이 128MB를 넘습니다. 원문을 나눠 편집하세요.');
      const h = header(30), c = header(46);
      h.view.setUint32(0, 0x04034b50, true); h.view.setUint16(4, 20, true); h.view.setUint16(6, 0x800, true);
      h.view.setUint16(12, 33, true); h.view.setUint32(14, crc, true); h.view.setUint32(18, data.length, true);
      h.view.setUint32(22, data.length, true); h.view.setUint16(26, name.length, true);
      c.view.setUint32(0, 0x02014b50, true); c.view.setUint16(4, 20, true); c.view.setUint16(6, 20, true);
      c.view.setUint16(8, 0x800, true); c.view.setUint16(14, 33, true); c.view.setUint32(16, crc, true);
      c.view.setUint32(20, data.length, true); c.view.setUint32(24, data.length, true); c.view.setUint16(28, name.length, true);
      c.view.setUint32(42, offset, true); chunks.push(h.bytes, name, data); central.push(c.bytes, name);
      offset += 30 + name.length + data.length; size += 46 + name.length;
    }
    const end = header(22); end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(8, files.length, true); end.view.setUint16(10, files.length, true);
    end.view.setUint32(12, size, true); end.view.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end.bytes], { type: 'application/zip' });
  }
  window.ThreadsSourceCutZip = Object.freeze({ zip, crc32 });
})();
