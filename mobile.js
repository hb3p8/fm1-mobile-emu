// SPDX-License-Identifier: GPL-3.0-only
const settings = document.getElementById("settings");
const keyPointers = new Set();
function releaseInputs() {
  for (const timer of pointerReleaseTimers.values()) clearTimeout(timer);
  pointerReleaseTimers.clear(); pointerPressedAt.clear();
  btnHeldBy.clear(); keyHeldBy.clear(); keyPointers.clear(); syncButtons(); syncKeys();
}
document.getElementById("settings-open").addEventListener("click",()=> { releaseInputs(); settings.showModal(); });
document.getElementById("settings-close").addEventListener("click",()=>settings.close());
document.getElementById("hold-toggle").addEventListener("click",(event)=> {
  latchMode=!latchMode; event.currentTarget.setAttribute("aria-pressed",String(latchMode));
  if (!latchMode) { latched=0; syncButtons(); }
});
document.getElementById("audio-toggle").addEventListener("click",async(event)=> {
  const toggle=event.currentTarget;   // currentTarget is gone after the awaits below
  if (!audioContext) return;
  releaseInputs();
  userPaused=audioContext.state === "running";
  if (userPaused) await audioContext.suspend();
  else await audioContext.resume();
  const running=audioContext.state === "running";
  toggle.querySelector(".tool-label").textContent=running ? "Pause" : "Resume";
  toggle.setAttribute("aria-label",running ? "Pause" : "Resume");
  if (!running) status.textContent="Paused";
});
const filterToggle = document.getElementById("filter-toggle");
function syncFilter() {
  filterToggle.hidden=!screenRenderer.available;
  filterToggle.setAttribute("aria-pressed",String(screenRenderer.filter === "xbr"));
}
filterToggle.addEventListener("click",()=> { screenRenderer.filter=screenRenderer.filter === "xbr" ? "pixel" : "xbr"; syncFilter(); });
syncFilter();
document.addEventListener("visibilitychange",()=> { if(document.hidden) releaseInputs(); });
window.addEventListener("blur",releaseInputs);

// Captured pointer events stay with the first key; hit-test for glissando and multi-touch.
keys.forEach(key=>key.hit.addEventListener("pointerdown",event=>keyPointers.add("p"+event.pointerId)));
["pointerup","pointercancel","lostpointercapture"].forEach(type=>device.addEventListener(type,event=>keyPointers.delete("p"+event.pointerId)));
device.addEventListener("pointermove",(event)=> {
  const id="p"+event.pointerId;
  if (!keyPointers.has(id)) return;
  const under=document.elementFromPoint(event.clientX,event.clientY)?.closest(".key");
  const note=under ? Number(under.dataset.key) : null;
  if (note === null) { if (keyHeldBy.delete(id)) syncKeys(); }
  else if (note !== keyHeldBy.get(id)) { keyHeldBy.set(id,note); syncKeys(); }
});

keys.forEach((key,index)=> {
  key.hit.addEventListener("keydown",event=> {
    if (event.code!=="Enter" && event.code!=="Space") return;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) { keyHeldBy.set("focus-"+event.code,index); syncKeys(); }
  });
  key.hit.addEventListener("keyup",event=> {
    if (event.code!=="Enter" && event.code!=="Space") return;
    event.preventDefault(); event.stopPropagation();
    keyHeldBy.delete("focus-"+event.code); syncKeys();
  });
});

// Enter/Space on a focused hardware button behaves as a press/release, not a click toggle.
Object.values(buttons).forEach(button=> {
  button.hit.addEventListener("keydown",event=> {
    if (event.code!=="Enter" && event.code!=="Space") return;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) { btnHeldBy.set("focus-"+event.code,button.bit); syncButtons(); }
  });
  button.hit.addEventListener("keyup",event=> {
    if (event.code!=="Enter" && event.code!=="Space") return;
    event.preventDefault(); event.stopPropagation();
    btnHeldBy.delete("focus-"+event.code); syncButtons();
  });
});

// Offline use: sw.js keeps every file of this version. When a rebuilt version arrives (checked on
// launch and whenever the app comes back to the front), it takes over at once if the sound has not
// started yet; otherwise Menu offers a reload so nothing stops in the middle of playing.
if ("serviceWorker" in navigator && window.isSecureContext) {
  const updated = !!navigator.serviceWorker.controller;   // false on the very first visit: nothing to replace
  navigator.serviceWorker.register("sw.js").then((registration)=> {
    document.addEventListener("visibilitychange",()=> { if (!document.hidden) registration.update().catch(()=>{}); });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=> {
    if (!updated) return;
    if (!soundStarted) { location.reload(); return; }
    document.getElementById("update").hidden=false;
    document.getElementById("settings-open").classList.add("has-update");
  });
  document.getElementById("update-reload").addEventListener("click",()=>location.reload());
}
