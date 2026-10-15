// SPDX-License-Identifier: GPL-3.0-only
// Hardware .fwsc packages run unchanged in joakimeriksson/fm1-emu's pi32v2 CPU emulator.
function emulatorDb() {
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open('fm1-hardware',1);
    q.onupgradeneeded=()=>{q.result.createObjectStore('states');q.result.createObjectStore('packages');};
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
}
async function kept(store,key,value) {
  const db=await emulatorDb();
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,value===undefined?'readonly':'readwrite'), st=tx.objectStore(store);
      const q=value===undefined?st.get(key):st.put(value,key);
      tx.oncomplete=()=>resolve(q.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  } finally {db.close();}
}
let stateKey=FW_ID, savedSectors={}, savePending=Promise.resolve(), flushResolve=null, packageBytes=null;
function persist(sectors) {
  if(!sectors)return;
  Object.assign(savedSectors,sectors);
  // Snapshot now: an asynchronous write for the previous firmware cannot acquire later state.
  const key=stateKey, snapshot={sectors:{...savedSectors}, migrated:true};
  savePending=savePending.then(()=>kept('states',key,snapshot)).catch(()=>{
    document.getElementById('save-status').textContent='Browser storage is unavailable; saved work lasts for this session.';
  });
}
async function legacySectors() {
  const oldStore={x0x:'x0x-emu-store',fimba:'fimba-emu-store',amb:'amb-emu-store'}[FW_ID];
  if(oldStore){try{return legacyObjects(FW_ID,JSON.parse(localStorage.getItem(oldStore)||'{}'));}catch{return {};}}
  if(!PRIMARY_FIRMWARES[FW_ID])return {};
  return new Promise(resolve=>{
    try{
      const q=indexedDB.open('fm1-flash',1);
      q.onupgradeneeded=()=>q.result.createObjectStore('sectors');q.onerror=()=>resolve({});
      q.onsuccess=()=>{
        const db=q.result,out={},tx=db.transaction('sectors');
        const cursor=tx.objectStore('sectors').openCursor(IDBKeyRange.bound([FW_ID,0],[FW_ID,Infinity]));
        cursor.onsuccess=()=>{const c=cursor.result;if(c){out[c.key[1]]=c.value;c.continue();}};
        tx.oncomplete=()=>{db.close();resolve(out);};tx.onerror=()=>{db.close();resolve({});};
      };
    }catch{resolve({});}
  });
}
async function restoreState() {
  const saved=await kept('states',stateKey).catch(()=>null);
  savedSectors=saved?.sectors || await legacySectors();
  // A marker also for an empty state: erasing it must not import the old saves again.
  persist({});await savePending;
  return {...savedSectors};
}
async function packageOf() {
  if(FW.local || FW.byo){
    const local=await kept('packages',FW.local?'local':FW_ID).catch(()=>null);
    if(!local)throw new Error(FW.byo?'Open your FM-1.fwsc file in Menu.':'Open an FM-1 .fwsc file in Menu.');
    if(FW.local){stateKey='local:'+local.hash;FW.name=local.name;FW.tag=local.name;updateLabels();}
    return local.bytes;
  }
  if(!FW.remote){const r=await fetch(FW.package);if(!r.ok)throw new Error(`Could not load ${FW.name}: ${r.status}`);return r.arrayBuffer();}
  const key=FW_ID+':'+FW.version;
  const cached=await kept('packages',key).catch(()=>null);
  if(cached)return cached;
  const {fetchPackage}=await import('./engine/fwsc.js');
  const {bytes}=await fetchPackage(FW);
  // Check the file before keeping it; the CPU's loader handles the authoritative unpacking.
  if(bytes.length<1024 || bytes.length>8*1024*1024)throw new Error('The firmware package has an unexpected size');
  await kept('packages',key,bytes.buffer).catch(()=>{});
  return bytes.buffer;
}

const status=document.getElementById('status'),cpu=document.getElementById('cpu'),hint=document.getElementById('screen-hint');
let soundStarted=false,userPaused=false,booting=false;
function showHint(text,error=false){hint.hidden=!text;hint.textContent=text||'';hint.classList.toggle('error',error);}
const UNLOCK=['pointerdown','pointerup','touchend','keydown','click'];
function unlock(){if(audioContext && !userPaused)audioContext.resume().catch(()=>{});}
function armUnlock(on){for(const type of UNLOCK)(on?addEventListener:removeEventListener)(type,unlock,true);}
function soundState(){
  const running=audioContext?.state==='running';
  document.querySelector('.app-shell').classList.toggle('running',!!running);
  if(running){soundStarted=true;armUnlock(false);if(!booting)showHint('');status.textContent='Sound on';}
  else if(!userPaused){armUnlock(true);if(!booting)showHint('Tap anywhere to start the sound');status.textContent='Waiting for a tap';}
}
function showLights(leds){
  const ids=[2,3,4,5,6,7,8,9,10,11,12,13,0,1];
  for(const b of Object.values(buttons)){
    const v=leds[ids[b.bit]]/0.08;
    b.g.classList.toggle('lit',v>.55);b.g.classList.toggle('dim',v>.015 && v<=.55);
  }
  keys.forEach((k,i)=>{const v=leds[14+i]/.08;k.g.classList.toggle('lit',v>.55);k.g.classList.toggle('dim',v>.015&&v<=.55);});
}
async function flush(){
  if(node){
    await new Promise(resolve=>{const t=setTimeout(()=>{flushResolve=null;resolve();},1500);flushResolve=()=>{clearTimeout(t);resolve();};send({type:'flush'});});
  }
  await savePending;
}
async function startMachine(){
  const ac=audioContext;
  if(node){node.disconnect();node.port.close();node=null;}
  const [wasm,sectors]=await Promise.all([fetch('engine/fm1_web.wasm').then(r=>{if(!r.ok)throw new Error('Could not load emulator');return r.arrayBuffer();}),restoreState()]);
  if(FW.loops){await slotsReady;for(let k=0;k<3;k++)Object.assign(sectors,loopSectors(k,slots[k]));}
  node=new AudioWorkletNode(ac,'fm1-mobile',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  node.connect(ac.destination);
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('The emulator did not answer')),30000);
    node.port.onmessage=e=>{
      const m=e.data;
      if(m.type==='ready'){clearTimeout(timer);resolve();}
      else if(m.type==='error'){
        clearTimeout(timer);reject(new Error(m.message));status.textContent='Firmware stopped';showHint(m.message,true);
      }else if(m.type==='frame'){
        drawScreen(m.fb);showLights(m.leds);persist(m.sectors);
        cpu.textContent=`${FW.name} ${FW.version||''} · CPU emulator · ${m.load}% audio thread`;
      }else if(m.type==='flushed'){persist(m.sectors);if(flushResolve){const done=flushResolve;flushResolve=null;done();}}
    };
  });
  // Keep the package bytes on the page for a reboot after loop import.
  const pkg=packageBytes.slice(0);
  node.port.postMessage({type:'load',wasm,package:pkg,sectors,master,seed:crypto.getRandomValues(new Uint32Array(1))[0]},[wasm,pkg]);
  await ready;
  btnMask=keyMask=-1;syncButtons();syncKeys();
}
async function reboot(){
  if(booting)return;
  booting=true;showHint(`Loading ${FW.name}…`);
  try{await flush();await startMachine();booting=false;soundState();}
  catch(err){booting=false;showHint(err.message,true);}
}
async function switchOn(){
  booting=true;showHint(`Loading ${FW.name}…`);
  try{
    if(!isSecureContext||!window.AudioWorkletNode)throw new Error('Sound needs HTTPS (or localhost)');
    if(navigator.audioSession)navigator.audioSession.type='playback';
    audioContext=new AudioContext({sampleRate:44100,latencyHint:'interactive'});
    armUnlock(true); // Capture a tap even while the package is still downloading.
    const values=await Promise.all([packageOf(),audioContext.audioWorklet.addModule('engine/worklet.js')]);
    packageBytes=values[0];await startMachine();
    document.getElementById('audio-toggle').hidden=false;
    audioContext.onstatechange=soundState;booting=false;soundState();unlock();
  }catch(err){
    booting=false;armUnlock(false);
    if(audioContext)await audioContext.close().catch(()=>{});
    audioContext=null;if(node){node.disconnect();node.port.close();node=null;}
    status.textContent='Could not start';showHint(err.message||String(err),true);
  }
}
function updateLabels(){for(const el of document.querySelectorAll('.fw-tag'))el.textContent=FW.tag;}
async function chooseFirmware(id){
  if(id===FW_ID)return;
  releaseInputs();await flush();
  try{localStorage.setItem(FIRMWARE_KEY,id);}catch{}
  const url=new URL(location.href);url.searchParams.set('fw',id);location.href=url.href;
}
function firmwareRow(id,f,small=false){
  const row=document.createElement('button');row.type='button';row.className='firmware'+(small?' firmware-compact':'');
  row.dataset.firmware=id;row.setAttribute('aria-pressed',String(id===FW_ID));
  if(!small && f.screenshot){const shot=document.createElement('img');shot.className='firmware-shot';shot.width=shot.height=88;shot.src=f.screenshot;shot.alt=`${f.name} screenshot from the FM-1 Firmware Hub`;shot.loading='lazy';row.append(shot);}
  for(const [cls,value]of [['name',`${f.name} ${f.version||''}${f.prerelease?' · pre-release':''}`],['about',f.about],['by',f.by]]){
    const span=document.createElement('span');span.className='firmware-'+cls;span.textContent=value||'';row.append(span);
  }
  row.addEventListener('click',()=>chooseFirmware(id));return row;
}
(function firmwareMenu(){
  const main=document.getElementById('firmwares'),more=document.getElementById('more-firmwares');
  for(const [id,f]of Object.entries(PRIMARY_FIRMWARES))main.append(firmwareRow(id,f));
  for(const [id,f]of Object.entries(FIRMWARES))if(id!=='local')more.append(firmwareRow(id,f,true));
  document.getElementById('more-count').textContent=Object.keys(FIRMWARES).length-1;
  document.getElementById('firmware-search').addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase();let count=0;
    for(const row of more.children){row.hidden=!row.textContent.toLowerCase().includes(q);if(!row.hidden)count++;}
    document.getElementById('catalog-empty').hidden=count!==0;
  });
  if(!PRIMARY_FIRMWARES[FW_ID])document.getElementById('more').open=true;
  updateLabels();document.querySelector('.breaks').hidden=!FW.loops;
  for(const [id,value]of [['fw-manual',FW.manual],['fw-source',FW.repo],['fw-archive',FW.archive]]){
    const a=document.getElementById(id);a.hidden=!value;if(value)a.href=value;
  }
  document.getElementById('fw-manual').textContent=`${FW.name} manual`;
  document.getElementById('fw-source').textContent=`${FW.name} on GitHub`;
  document.getElementById('reset').textContent=`Erase ${FW.name}'s saved work`;
  const bring=document.getElementById('bring-firmware');bring.hidden=!FW.byo;
  if(FW.byo)bring.href=FW.download;
})();
document.getElementById('firmware-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  const message=document.getElementById('file-status');message.textContent='Reading package…';
  try{
    if(file.size<1024||file.size>8*1024*1024)throw new Error('Choose an FM-1 .fwsc package (up to 8 MB).');
    const bytes=await file.arrayBuffer();
    // Validate using the same Rust loader; it never executes this instance's CPU.
    const {instance}=await WebAssembly.instantiate(await(await fetch('engine/fm1_web.wasm')).arrayBuffer(),{env:{fm1_jit_compile:()=>0}});
    const x=instance.exports,p=x.fm1_alloc(bytes.byteLength);new Uint8Array(x.memory.buffer,p,bytes.byteLength).set(new Uint8Array(bytes));
    if(x.fm1_boot_fwsc(p,bytes.byteLength,0,0,240)||x.fm1_board()!==0)throw new Error('Choose a valid FM-1 .fwsc package.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const target=FW.byo?FW_ID:'local';
    await kept('packages',target,{bytes,hash,name:file.name.replace(/\.fwsc$/i,'')});
    if(FW_ID===target){await flush();location.reload();}else await chooseFirmware(target);
  }catch(err){message.textContent=err.message;}
  e.target.value='';
});
document.getElementById('reset').addEventListener('click',async e=>{
  const button=e.currentTarget;
  if(!button.dataset.armed){button.dataset.armed='1';button.textContent=`Tap again to erase ${FW.name}'s saved work`;return;}
  await flush();
  if(node){node.disconnect();node.port.close();node=null;}
  savedSectors={};persist({});await savePending;location.reload();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)send({type:'flush'});});
switchOn();
