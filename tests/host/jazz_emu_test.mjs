// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import assert from 'node:assert/strict';import v8 from 'node:v8';v8.setFlagsFromString('--no-concurrent-sparkplug');
const wasm=fs.readFileSync(process.argv[2]||'build/emu/min.wasm');let mem,ex;
const wasi=new Proxy({clock_time_get:(_,p,o)=>{new DataView(mem.buffer).setBigUint64(o,0n,true);return 0;}},{get:(t,k)=>t[k]||(()=>0)});
async function boot(store={}){const {instance}=await WebAssembly.instantiate(wasm,{wasi_snapshot_preview1:wasi,env:new Proxy({},{get:()=>()=>0})});ex=instance.exports;mem=ex.memory;if(ex._initialize)ex._initialize();for(const [o,b]of Object.entries(store)){new Uint8Array(mem.buffer,ex.web_store(+o),b.length).set(b);ex.web_store_set_len(+o,b.length)}ex.web_boot();ex.web_master(2200);run(100)}
function run(ms){let peak=0;for(let n=0;n<ms*44.1;n+=128){ex.web_render(128);for(const p of[ex.web_out_l(),ex.web_out_r()])for(const x of new Float32Array(mem.buffer,p,128)){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x))}}return peak}
const params=()=>Array.from(new Int16Array(mem.buffer,ex.web_params(),ex.web_params_count()));
const tap=(b)=>{ex.web_buttons(1<<b);run(80);ex.web_buttons(0);run(80)};
await boot();assert.equal(params()[30],9);assert.equal(ex.web_form_count(),JSON.parse(fs.readFileSync('assets/forms/library.json')).banks.after.forms.length);
for(let i=0;i<10;i++){ex.web_preset(i);assert(run(1800)>.01);assert.equal(params()[30],i);assert.equal(params()[16],0);assert.equal(params()[28],0);}
const chord=ex.web_position(),notes=ex.web_part_notes(1);ex.web_keys((1<<7)|(1<<11));run(100);assert.equal(ex.web_part_notes(1),notes+2);assert.equal(ex.web_position(),chord);ex.web_keys(0);
const seed=params()[32];tap(6);tap(4);assert.notEqual(params()[32],seed);assert.equal(params()[30],9);
// SEQ is unused. Every unused knob must stay inert rather than changing a hidden mode.
tap(9);ex.web_enc(4,20);run(100);assert.equal(params()[1],0);
tap(5);ex.web_enc(5,20);ex.web_enc(6,20);run(100);assert.equal(params()[26],0);assert.equal(params()[27],0);
for(let i=0;i<3;i++)tap(3);ex.web_enc(3,1);run(100);assert.equal(params()[40],8);
ex.web_transport();run(200);tap(7);
const store={};for(let o=0;o<ex.web_nobj();o++){let n=ex.web_store_len(o);if(n>0)store[o]=new Uint8Array(mem.buffer,ex.web_store(o),n).slice()}
assert.equal(new DataView(store[0].buffer).getUint32(4,true),9);
await boot(store);assert.equal(params()[30],9);assert.equal(params()[40],8);
const legacy={};for(const name of fs.readdirSync('tests/fixtures')){const m=name.match(/jazz-v8-object-(\d+)\.bin/);if(m)legacy[m[1]]=fs.readFileSync('tests/fixtures/'+name)}
await boot(legacy);assert.equal(params()[30],8);assert.equal(params()[24],117);assert.equal(params()[25],4);assert.equal(params()[40],37);assert.equal(params()[16],0);assert.equal(params()[28],0);
ex.web_buttons(1<<1);run(50);ex.web_buttons((1<<1)|(1<<10));run(50);ex.web_buttons(1<<1);run(50);ex.web_buttons(0);run(50);tap(10);run(200);assert.equal(ex.web_song_state(),2);run(1000);assert(ex.web_part_notes(1)>0);
console.log('PASS Jazz-only WASM: 10 presets, four parts, live keys, inactive old knobs/SEQ, phrase seed, per-preset save/reload, version-8 Jazz project and SNG2 migration.');
