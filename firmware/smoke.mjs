// SPDX-License-Identifier: GPL-3.0-only
// Exercise the actual shipped worklets and wasm, not a substitute DSP or browser mock.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const app = path.resolve(import.meta.dirname, '..');
const registry = vm.createContext({});
const script = fs.readFileSync(path.join(app,'dist/app.js'),'utf8');
vm.runInContext(script.slice(0,script.indexOf('const FIRMWARE_KEY'))+'\nglobalThis.catalog=FIRMWARES;', registry);

for (const [id, fw] of Object.entries(registry.catalog)) {
  assert.ok(fs.existsSync(path.join(app,'dist',fw.screenshot)),`${id}: missing screenshot`);
  const bytes = fs.readFileSync(path.join(app,'dist',fw.wasm));
  let Processor, resolveReady, rejectReady, frame, frames=0, sectors={}, store={};
  const ready = new Promise((res,rej)=> {resolveReady=res;rejectReady=rej;});
  const context = vm.createContext({WebAssembly, performance, console, currentTime:0,
    AudioWorkletProcessor:class {
      constructor(){this.port={postMessage(message){
        if(message.type==='ready')resolveReady();
        if(message.type==='error')rejectReady(new Error(message.message));
        if(message.fb){frame=message.fb;frames++;}
        if(message.sectors)Object.assign(sectors,message.sectors);
        if(message.store)Object.assign(store,message.store);
      }};}
    },registerProcessor(name,klass){Processor=klass;assert.equal(name,fw.processor);}});
  vm.runInContext(fs.readFileSync(path.join(app,'dist',fw.worklet),'utf8'),context);
  const processor=new Processor();
  const timeout=setTimeout(()=>rejectReady(new Error(`${id}: boot timed out`)),5000);
  await processor.onMessage({type:'load',wasm:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),master:fw.masterDefault,store:{},sectors:{},seed:42});
  await ready;clearTimeout(timeout);
  let peak=0;
  function render(ms){
    for(let remaining=Math.ceil(ms*44.1);remaining>0;remaining-=128){
      const out=[new Float32Array(128),new Float32Array(128)];
      assert.equal(processor.process([], [out]),true);
      for(const channel of out)for(const value of channel){assert.ok(Number.isFinite(value),`${id}: non-finite audio`);peak=Math.max(peak,Math.abs(value));}
      context.currentTime+=128/44100;
    }
  }
  const send=message=>processor.onMessage(message);
  function tap(bit){send({type:'buttons',mask:1<<bit});render(80);send({type:'buttons',mask:0});render(80);}
  render(1200);
  assert.ok(frame && new Set(frame).size>3,`${id}: blank firmware screen`);
  send({type:'keys',mask:1<<7});render(400);send({type:'keys',mask:0});render(300);
  tap(10);render(2000);tap(10);render(200); // X0X's white keys edit steps; PLAY makes them sound.
  assert.ok(peak>0.001 && peak<1.5,`${id}: audio peak ${peak}`);
  send({type:'enc',role:3,n:1});render(100);
  assert.ok(frames>1,`${id}: screen never updates`);
  const before=processor.ex.web_flash_writes_count?.() ?? processor.ex.web_store_writes();
  if(id==='maku')tap(11); // MAKU REC likes its world and stores it.
  else if(id==='melodee') {tap(7);tap(13);tap(13);tap(13);} // USER slot, Save here sheet, name, write.
  else {tap(7);tap(13);tap(13);} // SAVE, confirm (preset slot / overwrite).
  render(1600);
  const after=processor.ex.web_flash_writes_count?.() ?? processor.ex.web_store_writes();
  if(['melodee','maku'].includes(id))assert.ok(after>before,`${id}: SAVE did not reach NOR flash`);
  // Re-open a firmware after the page's persisted writes: boot must still draw and render.
  const restoredReady = new Promise((res,rej)=> {resolveReady=res;rejectReady=rej;});
  const restored=new Processor();
  const restoredTimeout=setTimeout(()=>rejectReady(new Error(`${id}: restore timed out`)),5000);
  await restored.onMessage({type:'load',wasm:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),master:fw.masterDefault,store,sectors,seed:42});
  await restoredReady;clearTimeout(restoredTimeout);
  assert.ok(restored.ex,`${id}: saved work could not be restored`);
  if(fw.kind==='flash') {
    const nor=new Uint8Array(restored.ex.memory.buffer,restored.ex.web_nor(),restored.ex.web_nor_size());
    for(const [offset,bytes] of Object.entries(sectors)) {
      const expected=bytes ? new Uint8Array(bytes) : new Uint8Array(4096).fill(255);
      assert.deepEqual(nor.slice(+offset,+offset+4096),expected,`${id}: saved sector ${offset} was not restored`);
    }
  }
  console.log(`${id} ${fw.version}: boot, screen, note, encoder, restore OK; peak=${peak.toFixed(3)} writes=${after-before}`);
}
