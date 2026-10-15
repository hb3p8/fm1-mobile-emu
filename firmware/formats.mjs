// Cross-check the hardware slot encoding against the firmware author's Python encoder.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({Uint8Array,Int16Array,DataView,atob});
vm.runInContext(readFileSync('flash.js','utf8'),context);
const f=JSON.parse(readFileSync('firmware/format-fixture.json'));
const sectors=context.loopSectors(0,{name:'TEST',zones:[{pcm:new Int16Array(f.pcm),rate:22050}]});
const image=new Uint8Array(0x14000);
for(const [off,b]of Object.entries(sectors))image.set(b,+off-0xa0000);
assert.deepEqual([...image.slice(0,480)],f.header);
assert.deepEqual([...image.slice(512,512+f.adpcm.length)],f.adpcm);
assert.equal(context.crc32(new TextEncoder().encode('123456789')),0xcbf43926);
for(const id of ['x0x','fimba','amb']){
 const payload=Uint8Array.from([1,5,20,80,255]);
 const out=context.legacyObjects(id,{'0':btoa(String.fromCharCode(...payload))});
 const b=out[0xfc000],v=new DataView(b.buffer);
 assert.equal(v.getUint32(0,true),0x30583058);
 assert.equal(v.getUint32(12,true),payload.length);
 assert.equal(v.getUint32(16,true),context.crc32(payload));
 assert.equal(v.getUint32(28,true),context.crc32(b.subarray(0,28)));
 assert.deepEqual(b.slice(256,261),payload);
}
console.log('Hardware sample format matches upstream encoder; legacy save headers and CRCs OK');
