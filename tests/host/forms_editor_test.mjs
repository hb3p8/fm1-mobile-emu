// SPDX-License-Identifier: GPL-3.0-only
import fs from'node:fs';import assert from'node:assert/strict';import{SCALES,QUALITIES,decode,materialize,validateForm}from'../../web/emu/forms-core.mjs';
const lib=JSON.parse(fs.readFileSync('assets/forms/library.json'));let mem;
const sample=structuredClone(lib.banks.romance.forms[0]);
for(const enabled of[undefined,true,false])validateForm({...sample,enabled});
for(const enabled of[0,1,'false',null])assert.throws(()=>validateForm({...sample,enabled}),/Состояние формы/);
const wasi=new Proxy({clock_time_get:(_,p,o)=>{new DataView(mem.buffer).setBigUint64(o,0n,true);return 0;}},{get:(t,k)=>t[k]||(()=>0)});
const{instance}=await WebAssembly.instantiate(fs.readFileSync('build/emu/min.wasm'),{wasi_snapshot_preview1:wasi,env:new Proxy({},{get:()=>()=>0})});const e=instance.exports;mem=e.memory;if(e._initialize)e._initialize();e.web_boot();e.web_preview_mode();
let comparisons=0;
for(const b of Object.values(lib.banks))for(const f of b.forms){validateForm(f);for(let root=0;root<12;root++)for(const[,mask,sk]of QUALITIES){const ctx={root,mask,scale:SCALES[sk],nextRoot:(root+5)%12};for(const n of f.notes){assert.equal(decode(n,36+root,mask,SCALES[sk],ctx.nextRoot),e.web_form_decode(n.role,n.oct,n.alter,36+root,mask,SCALES[sk],ctx.nextRoot));comparisons++}for(const n of materialize(f,ctx))assert(n.pitch>=21&&n.pitch<=(f.part==='bass'?55:108))}}
assert.equal(e.web_form_decode(15,0,0,36,0x891,0xab5,0),-1);
// An edited draft can be auditioned through real bass/piano voices without
// recompiling the bank, and the app transport stays stopped.
for(const p of[12,20])e.web_param(p,88);e.web_audition(2,40,100);e.web_audition(3,64,100);let peak=0;for(let j=0;j<100;j++){e.web_render(128);for(const ptr of[e.web_out_l(),e.web_out_r()])for(const x of new Float32Array(mem.buffer,ptr,128)){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x))}}assert(peak>.01);assert.equal(e.web_playing(),0);assert.equal(e.web_part_notes(2),1);assert.equal(e.web_part_notes(3),1);
e.web_audition(2,40,0);e.web_audition(3,64,0);e.web_render(128);
console.log('PASS form editor:',comparisons,'JS/C decoder comparisons, all-key ranges, invalid role guard, real WASM draft audition with transport stopped.');
