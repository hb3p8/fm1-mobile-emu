// SPDX-License-Identifier: GPL-3.0-only
// Harmonic preview mirrors the C form decoder; sound always comes from WASM.
export const SCALES=[0xAB5,0x6AD,0x6B5,0x6D5,0x5B3,0xB6D,0x55B,0x5AD,0x5AB,0x56D];
export const SCALE_NAMES=['Ionian','Dorian','Mixolydian','Lydian b7','Phrygian dominant','Diminished','Altered','Aeolian','Phrygian','Locrian nat2'];
export const NOTES=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export const ROLES=['1','3','5','7','9','11','13','colour'];
export const QUALITIES=[['maj7',0x891,0],['maj9',0x895,0],['6/9',0x295,0],['m7',0x489,1],['m9',0x48d,1],['7',0x491,2],['9',0x495,2],['13',0x695,2],['7♭9',0x493,4],['m7♭5',0x449,9],['dim7',0x249,5]];
export const family=mask=>(mask&0x249)===0x249?3:mask&8?1:mask&1024?2:0;
export function roles(mask,scale){const fam=family(mask),third=mask&8?3:4;return[0,third,mask&128?7:mask&64?6:8,mask&2048?11:mask&1024?10:fam===3?9:11,scale&4?2:1,scale&32?5:6,scale&512&&fam!==3?9:8,fam===3?11:third===4&&scale&8?3:scale&32?5:6]}
export function nearest(from,pc,lo=from-6,hi=from+6){let n=from+((pc-from)%12+12)%12;if(n-from>6)n-=12;while(n<lo)n+=12;while(n>hi)n-=12;return n}
export function decode(n,base,mask,scale,nextRoot){const r=roles(mask,scale);return(n.role&16?nearest(base,nextRoot):base+r[n.role&15])+12*n.oct+n.alter}
export function materialize(f,{root,mask,scale,nextRoot,bassOct=0}){
 const piano=f.part==='piano',firstOct=f.notes[0]?.oct||0;let best=Infinity,bestBase=36+root;
 for(let octave=-1;octave<=1;octave++){
  const base=36+root+12*octave-(piano?0:12*firstOct);let cost=0,first=0,last=0,sum=0;
  f.notes.forEach((n,i)=>{const note=decode(n,base,mask,scale,nextRoot);if(!i)first=note;last=note;sum+=note;const lo=piano?28:21,hi=piano?96:55;if(note<lo)cost+=(lo-note)*20;if(note>hi)cost+=(note-hi)*20});
  if(piano)cost+=2*Math.abs((f.notes.length?Math.trunc(sum/f.notes.length):65)-65)+12*Math.abs(octave);
  else{cost+=3*Math.abs(first-35)+Math.abs(first-36)+Math.abs(nearest(last,nextRoot,28,52)-last);if(first<28)cost+=(28-first)*10;if(first>48)cost+=(first-48)*10}
  if(cost<best){best=cost;bestBase=base}
 }
 return f.notes.map(n=>{let pitch=decode(n,bestBase,mask,scale,nextRoot);if(!piano){while(pitch<21)pitch+=12;while(pitch>55)pitch-=12;pitch+=12*bassOct}while(pitch<21)pitch+=12;while(pitch>108)pitch-=12;return {...n,pitch}})
}
export function noteName(n){return NOTES[(n%12+12)%12]+(Math.floor(n/12)-1)}
export function roleName(n){return(n.role&16?'NEXT:1':ROLES[n.role&15])+(n.alter>0?'+1':n.alter<0?'−1':'')}
export function validateForm(f){
 if(!f||typeof f!=='object'||typeof f.id!=='string'||f.id.length<1||f.id.length>64)throw Error('Форме нужен ID длиной 1–64 символа.');
 if(f.enabled!==undefined&&typeof f.enabled!=='boolean')throw Error('Состояние формы должно быть true или false.');
 if(typeof f.name!=='string'||!f.name||f.name.length>32||/[^\x20-\x7e]/.test(f.name))throw Error('Название: 1–32 символа латиницей для экрана FM-1.');
 if(!['bass','piano'].includes(f.part)||![48,96].includes(f.length))throw Error('Проверьте партию и длину формы.');
 for(const[k,lo,hi]of[['family',0,3],['feel',0,1],['source_bar',0,255],['kind',0,f.part==='bass'?4:5]])if(!Number.isInteger(f[k])||f[k]<lo||f[k]>hi)throw Error(`Форма: ${k} должно быть ${lo}…${hi}.`);
 if(!Array.isArray(f.notes)||f.notes.length>48||f.notes.some(n=>!n||typeof n!=='object'))throw Error('В форме допускается до 48 нот.');
 for(const[noteIndex,n]of f.notes.entries())for(const[k,lo,hi]of[['at',0,f.length-1],['gate',1,255],['oct',-4,5],['alter',-1,1],['velocity',1,127]])if(!Number.isInteger(n[k])||n[k]<lo||n[k]>hi)throw Error(`Нота ${noteIndex+1}: ${k} должно быть ${lo}…${hi}.`);
 for(const[i,n]of f.notes.entries()){if(![0,1,2,3,4,5,6,7,16].includes(n.role))throw Error('Недопустимая ступень.');if(i&&n.at<f.notes[i-1].at)throw Error('Ноты должны идти по времени.')}return f
}
