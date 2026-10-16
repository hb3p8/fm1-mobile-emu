// SPDX-License-Identifier: GPL-3.0-only
// Test the complete, real FM-1 app as shipped in WebAssembly, not a JS mock.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import v8 from 'node:v8';
v8.setFlagsFromString('--no-concurrent-sparkplug');
let mem;
const wasi=new Proxy({clock_time_get:(_,p,out)=>{new DataView(mem.buffer).setBigUint64(out,0n,true);return 0},fd_write:(_,iov,n,out)=>{new DataView(mem.buffer).setUint32(out,0,true);return 0}},{get:(t,k)=>t[k]||(()=>0)});
const {instance}=await WebAssembly.instantiate(fs.readFileSync(process.argv[2]||'build/emu/min.wasm'),{wasi_snapshot_preview1:wasi,env:new Proxy({},{get:()=>()=>0})});
const ex=instance.exports;mem=ex.memory;if(ex._initialize)ex._initialize();ex.web_boot();ex.web_master(2200);
function run(ms){let peak=0;for(let f=0;f<ms*44.1;f+=128){ex.web_render(128);for(const ptr of [ex.web_out_l(),ex.web_out_r()])for(const x of new Float32Array(mem.buffer,ptr,128)){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x))}}return peak}
const params=()=>Array.from(new Int16Array(mem.buffer,ex.web_params(),ex.web_params_count()));
const lit=mask=>{let out=0;for(let k=0;k<27;k++)if(mask>>((53+k)%12)&1)out|=1<<k;return out>>>0};
const rot=(mask,n)=>((mask<<n)|(mask>>(12-n)))&4095;
run(100);assert.equal(params()[30],29);assert.equal(ex.web_form_count(),256);ex.web_preset(28);run(100);assert.equal(params()[30],28);assert.equal(ex.web_forms_active(),1);assert.equal(ex.web_form_count(),164);assert(ex.web_form_bass()<ex.web_form_count());assert(ex.web_form_piano()<ex.web_form_count());
ex.web_preset(27);run(100);assert.equal(params()[30],27);assert.equal(params()[24],160);assert.equal(params()[15],0);assert.equal(params()[16],0);
assert.equal(ex.web_score_active(),1);assert.equal(ex.web_score_bar(),1);assert.equal(ex.web_score_chorus(),1);
ex.web_preset(26);run(100);assert.equal(params()[28],4);assert.equal(params()[30],24);assert.equal(ex.web_cycle_count(),4);assert.equal(ex.web_playing(),1);
assert.equal(ex.web_scale(),rot(0x6d5,3));assert.equal(ex.web_lit_keys(),lit(ex.web_scale()));
ex.web_param(24,160);run(80);
const harmony=ex.web_position(),manualBefore=ex.web_part_notes(1);
ex.web_keys((1<<7)|(1<<11));run(100);
assert.equal(ex.web_part_notes(1),manualBefore+2);assert.equal(ex.web_position(),harmony);assert.equal(ex.web_yours(),0);
const solo=ex.web_part_notes(3),bass=ex.web_part_notes(2),drums=ex.web_part_notes(0);
run(1800);assert.equal(ex.web_part_notes(3),solo);assert(ex.web_part_notes(2)>bass);assert(ex.web_part_notes(0)>drums);
ex.web_keys(0);run(4800);assert(ex.web_part_notes(3)>solo);
for(let i=0;i<9;i++){ex.web_preset(20+i);const peak=run(1800);assert(peak>.01&&peak<1);assert.equal(params()[28],4);assert.equal(ex.web_lit_keys(),lit(ex.web_scale()))}
assert.equal(ex.web_score_active(),1);
assert.equal(ex.web_forms_active(),1);
ex.web_buttons(1<<6);run(80);ex.web_buttons(0);run(80); // HOME
const oldIdea=params()[32];ex.web_buttons(1<<4);run(80);ex.web_buttons(0);run(80); // EDIT
assert.equal(params()[30],28);assert.notEqual(params()[32],oldIdea);
const scorePosition=ex.web_position(),scoreBefore=ex.web_part_notes(1);ex.web_keys((1<<7)|(1<<11));run(100);
assert.equal(ex.web_part_notes(1),scoreBefore+2);assert.equal(ex.web_yours(),0);assert.equal(ex.web_position(),scorePosition);ex.web_keys(0);
// Browser switches must survive subsequent app/UI updates, not just echo a click.
for(const sound of [1,0,2,1,2]){ex.web_param(13,sound);assert(run(800)>.001);assert.equal(params()[13],sound)}
for(const rhythm of [3,2,0,2]){ex.web_param(22,rhythm);ex.web_param(23,50);run(800);assert.equal(params()[22],rhythm);assert.equal(params()[23],50)}
for(let p=36;p<41;p++){ex.web_param(p,83);run(60);assert.equal(params()[p],83)}
for(let i=0;i<2;i++){ex.web_buttons(1<<3);run(80);ex.web_buttons(0);run(80)}
ex.web_enc(3,1);run(100);assert(params()[36]>83); // LFO twice -> Bass tone, physical KNOB1
ex.web_buttons(1<<3);run(80);ex.web_buttons(0);run(80);
ex.web_enc(3,1);run(100);assert(params()[40]>83); // third LFO -> Bass FX
ex.web_param(40,31);run(80);
ex.web_preset(25);run(80);assert.equal(params()[40],7);
ex.web_preset(28);run(80);assert.equal(params()[40],31); // per-preset recall
ex.web_preset(26);ex.web_param(25,6);run(100);assert.equal(ex.web_scale(),rot(0x6d5,9));
ex.web_transport();run(1200);assert.equal(ex.web_playing(),0);
const count=ex.web_part_notes(1);ex.web_keys(1<<7);assert(run(120)>.001);assert.equal(ex.web_part_notes(1),count+1);ex.web_keys(0);run(300);
// Construct a genuine version-3 project from a saved current project. Verify
// that adding four tone parameters preserves existing settings on upgrade.
ex.web_param(40,29);ex.web_param(24,117);ex.web_param(25,4);ex.web_param(13,1);run(80);
ex.web_buttons(1<<7);run(80);ex.web_buttons(0);run(80);
assert.equal(ex.web_store_len(0),3416);
const current=new Uint8Array(mem.buffer,ex.web_store(0),3416).slice();
function legacy40(version,count){
 const end=(92+count*106+3)&~3,saved=new Uint8Array(end+80);
 saved.set(current.subarray(0,88));saved.set(current.subarray(90,94),88);
 new DataView(saved.buffer).setUint32(4,version,true);
 for(let i=0;i<count;i++){
  saved.set(current.subarray(94+i*108,94+i*108+80),92+i*106);
  saved.set(current.subarray(94+i*108+82,94+(i+1)*108),92+i*106+80);
 }
 saved.set(current.subarray(3336,3416),end);return saved;
}
const v7=new Uint8Array(3308);v7.set(current.subarray(0,3226));v7.set(current.subarray(3336,3416),3228);new DataView(v7.buffer).setUint32(4,7,true);
const v6=legacy40(6,29),v5=legacy40(5,28),v4=legacy40(4,27),old=new Uint8Array(2812);
new DataView(v5.buffer).setInt16(92+27*106+24*2,123,true);
old.set(v4.subarray(0,80));new DataView(old.buffer).setUint32(4,3,true);
old.set(v4.subarray(88,92),80);
for(let i=0;i<27;i++){
 old.set(v4.subarray(92+i*106,92+i*106+72),84+i*98);
 old.set(v4.subarray(92+i*106+80,92+i*106+106),84+i*98+72);
}
old.set(v4.subarray(2956,3036),2732);
for(const saved of [old,v4,v5,v6,v7,current]){
const fresh=await WebAssembly.instantiate(fs.readFileSync(process.argv[2]||'build/emu/min.wasm'),{wasi_snapshot_preview1:wasi,env:new Proxy({},{get:()=>()=>0})});
const mx=fresh.instance.exports;mem=mx.memory;if(mx._initialize)mx._initialize();
new Uint8Array(mem.buffer,mx.web_store(0),saved.length).set(saved);mx.web_store_set_len(0,saved.length);mx.web_boot();mx.web_render(128);
const migrated=Array.from(new Int16Array(mem.buffer,mx.web_params(),mx.web_params_count()));
assert.equal(migrated[24],117);assert.equal(migrated[25],4);assert.equal(migrated[13],1);
assert.deepEqual(migrated.slice(36),[62,70,48,58,saved===current||saved===v7?29:100]);
mx.web_preset(27);mx.web_render(1024);assert.equal(mx.web_score_active(),1);assert.equal(new Int16Array(mem.buffer,mx.web_params(),mx.web_params_count())[24],saved===v5?123:160);
mx.web_preset(28);mx.web_render(1024);assert.equal(mx.web_forms_active(),1);assert.equal(new Int16Array(mem.buffer,mx.web_params(),mx.web_params_count())[24],160);
mx.web_preset(29);mx.web_render(1024);assert.equal(mx.web_forms_active(),1);assert.equal(mx.web_form_count(),256);assert.equal(new Int16Array(mem.buffer,mx.web_params(),mx.web_params_count())[24],140);
}
console.log('PASS Jazz Box WASM: 10 presets, Romance score/forms, independent keys, scale LEDs, seed EDIT, bass/rhythm/tone switches, finite audio, bass reverb + physical FX page, per-preset recall, version-3/4/5/6/7/8 migration.');
