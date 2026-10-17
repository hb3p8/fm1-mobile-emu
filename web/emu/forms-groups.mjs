// SPDX-License-Identifier: GPL-3.0-only
// Display-only phrase clustering. Library order, IDs, notes and build flags stay untouched.
const ROLE_PITCH=[0,4,7,11,14,17,21,18];
export const GROUP_DISTANCE=.28;
const clamp=x=>Math.min(1,Math.max(0,x));
const compare=(a,b)=>a<b?-1:a>b?1:0;
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;

export function phraseProfile(form){
 const notes=[...form.notes].sort((a,b)=>a.at-b.at||a.role-b.role||a.oct-b.oct||a.alter-b.alter);
 const events=[];
 for(const note of notes){
  let event=events.at(-1);
  // A short rolled chord is one attack, rather than several melody notes.
  if(!event||note.at-event.at>3){event={at:note.at,notes:[]};events.push(event)}
  event.notes.push(note);
 }
 const pitch=n=>(n.role===16?5:ROLE_PITCH[n.role])+12*n.oct+n.alter;
 const octave=events.length?12*Math.floor(Math.min(...events[0].notes.map(pitch))/12):0;
 let previous;
 for(const event of events){
  event.pitches=event.notes.map(n=>pitch(n)-octave).sort((a,b)=>a-b);
  event.roles=new Set(event.notes.map(n=>n.role));
  event.gate=mean(event.notes.map(n=>n.gate));
  event.center=mean(event.pitches);
  event.motion=previous===undefined?0:event.center-previous;
  previous=event.center;
 }
 return{part:form.part,length:form.length,feel:form.feel,events,
  next:notes.some(n=>n.role===16),chromatic:notes.some(n=>n.alter!==0),
  travel:events.length>1?events.at(-1).center-events[0].center:0};
}

function eventDistance(a,b){
 const nearest=(xs,ys)=>mean(xs.map(x=>Math.min(...ys.map(y=>clamp(Math.abs(x-y)/12)))));
 const pitch=(nearest(a.pitches,b.pitches)+nearest(b.pitches,a.pitches))/2;
 const union=new Set([...a.roles,...b.roles]);
 const roles=1-[...a.roles].filter(x=>b.roles.has(x)).length/union.size;
 const motion=a.motion*b.motion<0?1:clamp(Math.abs(a.motion-b.motion)/10);
 return .34*clamp((Math.abs(a.at-b.at)-3)/12)+.2*pitch+.14*roles+.2*motion+
  .07*Math.abs(a.pitches.length-b.pitches.length)/Math.max(a.pitches.length,b.pitches.length)+
  .05*clamp(Math.abs(a.gate-b.gate)/48);
}

export function profileDistance(a,b){
 if(a.part!==b.part||a.length!==b.length||a.feel!==b.feel||a.next!==b.next)return Infinity;
 if(!a.events.length||!b.events.length)return a.events.length===b.events.length?0:Infinity;
 // Opposing bass lines remain different motifs, even if their pitch sets coincide.
 if(a.part==='bass'&&a.travel*b.travel<0&&Math.abs(a.travel)>=3&&Math.abs(b.travel)>=3)return Infinity;
 const m=a.events.length,n=b.events.length,skip=.7;
 let previous=Float64Array.from({length:n+1},(_,i)=>i*skip);
 for(let i=1;i<=m;i++){
  const row=new Float64Array(n+1);row[0]=i*skip;
  for(let j=1;j<=n;j++)row[j]=Math.min(previous[j]+skip,row[j-1]+skip,previous[j-1]+eventDistance(a.events[i-1],b.events[j-1]));
  previous=row;
 }
 return previous[n]/Math.max(m,n);
}

export const formDistance=(a,b)=>profileDistance(phraseProfile(a),phraseProfile(b));

function motif(profile){
 const events=profile.events;
 if(!events.length)return'Пауза';
 if(profile.part==='bass'){
  if(profile.next)return'К следующему корню';
  if(events.every(e=>[...e.roles].every(r=>r===0||r===2)))return'Тоника и квинта';
  if(profile.chromatic)return'Хроматический оборот';
  if(events.slice(1).every(e=>e.motion>=0)&&profile.travel>0)return'Восходящая линия';
  if(events.slice(1).every(e=>e.motion<=0)&&profile.travel<0)return'Нисходящая линия';
  return'Разворот / волна';
 }
 const chords=events.filter(e=>e.pitches.length>=3).length;
 if(events.length===1&&chords)return'Аккордовый удар';
 if(chords&&chords<events.length)return'Аккорд и ответ';
 if(chords)return'Аккордовые синкопы';
 if(profile.chromatic)return'Хроматический ответ';
 return events.every(e=>e.pitches.length===1)?'Одноголосный ответ':'Двухголосный ответ';
}

export function groupForms(forms,{threshold=GROUP_DISTANCE}={}){
 if(!Number.isFinite(threshold)||threshold<0)throw Error('Invalid grouping distance');
 const sorted=[...forms].sort((a,b)=>compare(a.id,b.id)),profiles=sorted.map(phraseProfile),n=sorted.length;
 const distance=Array.from({length:n},()=>new Float64Array(n)),link=Array.from({length:n},()=>new Float64Array(n));
 for(let i=0;i<n;i++)for(let j=0;j<i;j++)distance[i][j]=distance[j][i]=link[i][j]=link[j][i]=profileDistance(profiles[i],profiles[j]);
 const clusters=sorted.map((_,i)=>[i]);
 // Complete-link: every pair in a group must be close; similarity cannot drift through a chain.
 while(true){
  let left=-1,right=-1,best=Infinity;
  for(let i=0;i<n;i++)if(clusters[i])for(let j=i+1;j<n;j++)if(clusters[j]&&link[i][j]<best){best=link[i][j];left=i;right=j}
  if(best>threshold||left<0)break;
  clusters[left].push(...clusters[right]);clusters[right]=null;
  for(let k=0;k<n;k++)if(clusters[k]&&k!==left)link[left][k]=link[k][left]=Math.max(link[left][k],link[right][k]);
 }
 const count={bass:0,piano:0};
 return clusters.filter(Boolean).map(indices=>{
  indices.sort((a,b)=>a-b);
  let representative=indices[0],best=Infinity;
  for(const i of indices){const sum=indices.reduce((s,j)=>s+distance[i][j],0);if(sum<best){best=sum;representative=i}}
  const profile=profiles[representative],members=indices.map(i=>sorted[i].id);
  return{id:members[0],members,representative:sorted[representative].id,part:profile.part,
   length:profile.length,feel:profile.feel,title:motif(profile),attacks:profile.events.length};
 }).sort((a,b)=>compare(a.part,b.part)||a.feel-b.feel||b.length-a.length||compare(a.id,b.id))
  .map(group=>({...group,code:(group.part==='bass'?'B':'P')+String(++count[group.part]).padStart(2,'0')}));
}

// Names, velocity and enabled flags do not change structural similarity.
export const groupingKey=forms=>JSON.stringify(forms.map(f=>[f.id,f.part,f.length,f.feel,f.notes.map(n=>[n.at,n.gate,n.role,n.oct,n.alter])]));
