// SPDX-License-Identifier: GPL-3.0-only
import assert from'node:assert/strict';
import fs from'node:fs';
import{GROUP_DISTANCE,formDistance,groupForms,groupingKey,phraseProfile}from'../../web/emu/forms-groups.mjs';

const note=(at,role,oct=0)=>({at,gate:20,role,oct,alter:0,velocity:80});
const base={id:'a',part:'bass',length:96,feel:1,family:0,name:'Original',notes:[note(0,0),note(24,1),note(48,2)]};
const variant=structuredClone(base);variant.id='b';variant.name='Another name';variant.family=2;variant.enabled=false;
variant.notes.forEach(n=>{n.at++;n.gate++;n.oct++;n.velocity=30});
assert(formDistance(base,variant)<.01,'jitter, gate, global octave, velocity and name variation should stay close');
assert.equal(groupForms([base,variant]).length,1);
assert.equal(formDistance(base,{...base,notes:base.notes.map(n=>({...n,velocity:127}))}),0);
assert.equal(groupingKey([base]),groupingKey([{...base,name:'Renamed',enabled:false,notes:base.notes.map(n=>({...n,velocity:1}))}]));
for(const change of[{part:'piano'},{length:48},{feel:0}])assert.equal(formDistance(base,{...base,...change}),Infinity);
const descending={...base,id:'down',notes:[note(0,2),note(24,1),note(48,0)]};
assert.equal(formDistance(base,descending),Infinity);
assert.equal(groupForms([base,descending]).length,2);
assert.equal(formDistance(base,{...base,notes:[note(0,0),note(24,1),note(48,16)]}),Infinity,'next-root function should be distinct');
const roll={...base,part:'piano',notes:[note(0,0),note(1,1),note(2,2),note(3,3)]};
assert.equal(phraseProfile(roll).events.length,1,'a short rolled chord is one attack');
assert.equal(groupForms([{...base,id:'rest',notes:[]},base]).length,2);
// Similarity must not drift from A through B into a distant C.
const chain=[0,10,20].map((at,i)=>({...base,id:'chain-'+i,notes:[note(at,0)]}));
assert(formDistance(chain[0],chain[1])<GROUP_DISTANCE);
assert(formDistance(chain[1],chain[2])<GROUP_DISTANCE);
assert(formDistance(chain[0],chain[2])>GROUP_DISTANCE);
assert.equal(groupForms(chain).length,2);
assert.deepEqual(groupForms(chain),groupForms([...chain].reverse()));
assert.deepEqual(groupForms([]),[]);

const lib=JSON.parse(fs.readFileSync('assets/forms/library.json')),before=JSON.stringify(lib);let total=0,pairs=0;
for(const [key,bank]of Object.entries(lib.banks)){
 const groups=groupForms(bank.forms),ids=groups.flatMap(g=>g.members),byId=new Map(bank.forms.map(f=>[f.id,f]));
 assert.equal(ids.length,bank.forms.length);assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual([...ids].sort(),bank.forms.map(f=>f.id).sort());
 assert.deepEqual(groups,groupForms([...bank.forms].reverse()),'grouping must be independent of library order');
 for(const group of groups){
  assert(group.members.includes(group.representative));
  for(const id of group.members){const f=byId.get(id);assert.equal(f.part,group.part);assert.equal(f.length,group.length);assert.equal(f.feel,group.feel)}
  for(let i=0;i<group.members.length;i++)for(let j=0;j<i;j++){assert(formDistance(byId.get(group.members[i]),byId.get(group.members[j]))<=GROUP_DISTANCE+1e-12);pairs++}
 }
 assert(groups.some(g=>g.members.length>1),key+' should contain actual clusters');
 total+=ids.length;console.log(key+': '+ids.length+' forms → '+groups.length+' groups');
}
assert.equal(JSON.stringify(lib),before,'grouping must not change notes, IDs, JSON order or inclusion flags');
console.log('PASS phrase grouping:',total,'forms retained,',pairs,'within-group pairs, rhythm/contour constraints, octave/jitter/velocity invariance, deterministic complete-link groups, JSON unchanged.');
