// Real hardware packages through the exact AudioWorklet shipped to phones.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const wasm=readFileSync('dist/engine/fm1_web.wasm');
const code=readFileSync('dist/engine/worklet.js','utf8');
const ids=process.argv.slice(2);
for (const id of ids.length?ids:['x0x','felucca','sloop','fimba','melodee','amb','maku']) {
 let Processor, error, frames=0, peak=0, saves=0, ready=false, last;
 const sectors={};
 const context=vm.createContext({WebAssembly,Uint8Array,Uint16Array,Float32Array,Date,performance,console,
   AudioWorkletProcessor:class {constructor(){this.port={postMessage:m=>{
     if(m.type==='error') error=m.message;
     if(m.type==='ready') ready=true;
     if(m.type==='frame'){last=m; frames++;if(m.sectors){Object.assign(sectors,m.sectors); saves+=Object.keys(m.sectors).length;}}
   }};}},registerProcessor:(n,c)=>Processor=c});
 vm.runInContext(code,context);
 const p=new Processor();
 await p.message({type:'load',wasm,package:readFileSync(`dist/packages/${id}.fwsc`)});
 assert(ready, `${id}: not ready`);
 const render=(s,processor=p)=>{for(let i=0;i<s*44100;i+=128){const out=[new Float32Array(128),new Float32Array(128)];processor.process([], [out]);if(error)throw Error(`${id}: ${error}`);for(const v of out[0]){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}}};
 render(4);
 const lit=last.fb.filter(v=>v!==0).length;
 assert(new Set(last.fb).size>3, `${id}: no color screen`);
 assert(lit>1000, `${id}: blank screen (${lit})`);
 await p.message({type:'keys',mask:1<<7});render(.4);
 await p.message({type:'keys',mask:0});render(.1);
 await p.message({type:'enc',role:0,n:1});render(.1);
 await p.message({type:'buttons',mask:1<<10});render(.15);
 await p.message({type:'buttons',mask:0});render(.8);
 assert(peak>.0001,`${id}: silent (${peak})`);
 // Stop playback before writing flash (X0X defers SAVE while running).
 const tap=async bit=>{await p.message({type:'buttons',mask:1<<bit});render(.08);await p.message({type:'buttons',mask:0});render(.08);};
 await tap(10);render(.2);
 await p.message({type:'enc',role:2,n:1});render(.1);
 if(id==='sloop'){
  await p.message({type:'buttons',mask:1<<7});render(.3);
  for(let i=0;i<2;i++){await p.message({type:'keys',mask:1<<7});render(.15);await p.message({type:'keys',mask:0});render(.15);}
  await p.message({type:'buttons',mask:0});render(.1);
 }
 else if(id==='maku')await tap(11); // REC likes and stores the current world.
 else if(id==='melodee'){await tap(7);await tap(13);await tap(13);await tap(13);}
 else {await tap(7);await tap(13);await tap(13);}
 render(1.6);
 assert(saves>0,`${id}: SAVE did not write flash`);
 console.log(`${id}: pixels=${lit}, peak=${peak.toFixed(4)}, frames=${frames}, emulated=${last.ms}ms, JIT=${last.jit}, saved sectors=${saves}`);
 assert(p.jit.regions>0,`${id}: no JIT blocks compiled`);
 assert(!p.jit.failed,`${id}: JIT compile failures (${p.jit.error})`);
 // Restoring actual written sectors into a fresh CPU must preserve their bytes before execution.
 const q=new Processor();await q.message({type:'load',wasm,package:readFileSync(`dist/packages/${id}.fwsc`),sectors});
 const x=q.x, flash=new Uint8Array(x.memory.buffer,x.fm1_flash(),x.fm1_flash_size());
 for(const [off,b]of Object.entries(sectors))assert.deepEqual(flash.slice(+off,+off+4096),b,`${id}: restore`);
 render(1,q);assert(!x.fm1_halted(),`${id}: restored firmware stopped`);
}
