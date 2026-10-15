// SPDX-License-Identifier: GPL-3.0-only
// Real on-device formats, for carrying saved work and loops from the former source ports.
// Object headers and sample format: charlesvestal/fm1-x0x, firmware/src/storage.c and tools/sampleio.py.
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (~c) >>> 0;
}

function legacyObjects(id, objects) {
  const bases = id === "x0x" ? [0xfc000, 0x97000, 0x99000, 0x9b000, 0xdc000, 0x9d000, 0xde000] : [0xfc000, 0xdc000];
  const sectors = {};
  for (const [key, b64] of Object.entries(objects)) {
    const obj = Number(key), base = bases[obj];
    if (base === undefined) continue;
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (data.length > 3840) continue;
    const b = new Uint8Array(4096).fill(255), v = new DataView(b.buffer);
    v.setUint32(0, 0x30583058, true); v.setUint16(4, obj, true); v.setUint16(6, 0, true);
    v.setUint32(8, 1, true); v.setUint32(12, data.length, true); v.setUint32(16, crc32(data), true);
    v.setUint32(28, crc32(b.subarray(0, 28)), true); b.set(data, 256);
    sectors[base] = b;
  }
  return sectors;
}

const IMA_STEP = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,
  97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,
  963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,
  5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const IMA_INDEX = [-1,-1,-1,-1,2,4,6,8];
function imaEncode(pcm) {
  let pred = 0, idx = 0;
  const out = new Uint8Array(Math.ceil(pcm.length / 2));
  for (let i = 0; i < pcm.length; i++) {
    let diff = pcm[i] - pred, code = diff < 0 ? 8 : 0, step = IMA_STEP[idx], delta = step >> 3;
    diff = Math.abs(diff);
    for (let bit = 4; bit; bit >>= 1, step >>= 1) if (diff >= step) { code |= bit; diff -= step; delta += step; }
    pred = Math.max(-32768, Math.min(32767, pred + (code & 8 ? -delta : delta)));
    idx = Math.max(0, Math.min(88, idx + IMA_INDEX[code & 7]));
    out[i >> 1] |= code << ((i & 1) * 4);
  }
  return out;
}

function loopSectors(k, slot) {
  const image = new Uint8Array(0x14000).fill(255), sectors = {};
  if (slot && slot.zones.length) {
    image.fill(0, 0, 512);
    const v = new DataView(image.buffer);
    v.setUint32(0, 0x504d5346, true); v.setUint16(4, 1, true); image[6] = slot.zones.length;
    for (let i = 0; i < Math.min(8, slot.name.length); i++) image[8 + i] = slot.name.charCodeAt(i) & 127;
    let used = 0;
    slot.zones.forEach((z, i) => {
      const data = imaEncode(z.pcm), p = 32 + i * 28;
      if (512 + used + data.length > image.length || i >= 16) throw new Error("Loop slot is too large");
      v.setUint32(p, used, true); v.setUint32(p + 4, z.pcm.length, true);
      v.setUint32(p + 8, 0, true); v.setUint32(p + 12, z.pcm.length - 1, true);
      v.setUint32(p + 16, Math.round(z.rate / 44100 * 65536), true);
      v.setInt16(p + 20, 60 * 16, true); v.setInt16(p + 22, 0, true);
      image[p + 24] = 0; image[p + 25] = 0; image[p + 26] = 127;
      image.set(data, 512 + used); used += data.length;
    });
    v.setUint32(16, used, true); v.setUint32(20, crc32(image.subarray(512, 512 + used)), true);
  }
  for (let off = 0; off < image.length; off += 4096) sectors[0xa0000 + k * image.length + off] = image.slice(off, off + 4096);
  return sectors;
}
