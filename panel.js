// SPDX-License-Identifier: GPL-3.0-only
// DOM controls use the same FM-1 bit and encoder mappings as upstream/web/emu/index.html.
"use strict";
const BTN = { FX:0, SEL:1, ENV:2, LFO:3, EDIT:4, GLO:5, HOME:6, SAVE:7, ARP:8, SEQ:9, PLAY:10, REC:11, "OCT-":12, "OCT+":13 };
const ENC = { SELECT:0, ALGORITHM:1, PRESETS:2, KNOB1:3, KNOB2:4, KNOB3:5, KNOB4:6 };
const WHITE_K = [0,2,4,6,7,9,11,12,14,16,18,19,21,23,24,26];
const BLACK_K = [1,3,5,8,10,13,15,17,20,22,25];
const BLACK_AFTER = [0,1,2,4,5,7,8,9,11,12,14];
const STORE_KEY = "x0x-emu-store";
const device = document.getElementById("device");
const knobs = {}, buttons = {}, keys = [];
let latchMode = false;
const pointerPressedAt = new Map(), pointerReleaseTimers = new Map();
function rememberPress(id) {
  clearTimeout(pointerReleaseTimers.get(id)); pointerReleaseTimers.delete(id);
  pointerPressedAt.set(id,performance.now());
}
function releasePointer(pointerId) {
  const id="p"+pointerId;
  clearTimeout(pointerReleaseTimers.get(id));
  // Match the upstream host's tap durations: firmware polls/debounces hardware input.
  const minimum=keyHeldBy.has(id) ? 60 : 40;
  const remaining=Math.max(0,minimum-(performance.now()-(pointerPressedAt.get(id) ?? 0)));
  const release=()=> {
    pointerReleaseTimers.delete(id); pointerPressedAt.delete(id);
    if (btnHeldBy.delete(id)) syncButtons();
    if (keyHeldBy.delete(id)) syncKeys();
  };
  if (remaining>0) pointerReleaseTimers.set(id,setTimeout(release,remaining));
  else release();
}

function knob(label, role, parent) {
  const g = document.createElement("div");
  g.className = "knob"; g.tabIndex = 0; g.setAttribute("role","slider");
  g.setAttribute("aria-label",label); g.setAttribute("aria-valuemin","0");
  g.setAttribute("aria-valuemax",role === "master" ? "100" : "360");
  g.setAttribute("aria-valuenow","0"); g.dataset.encoder = label;
  const name = document.createElement("span"); name.className = "knob-label"; name.textContent=label;
  const face = document.createElement("span"); face.className = "knob-face"; face.setAttribute("aria-hidden","true");
  const ind = document.createElement("span"); ind.className = "knob-indicator";
  face.append(ind); g.append(name,face); parent.append(g);
  knobs[label] = {g,hit:g,ind,angle:0,role};
}
const globalKnobs = document.getElementById("global-knobs");
knob("MASTER","master",globalKnobs); knob("SELECT",ENC.SELECT,globalKnobs);
knob("PRESETS",ENC.PRESETS,globalKnobs); knob("ALGORITHM",ENC.ALGORITHM,globalKnobs);
for (let i=1;i<=4;i++) knob(`KNOB${i}`,ENC[`KNOB${i}`],document.getElementById("parameter-knobs"));

function button(label,parent) {
  const g = document.createElement("button"); g.type="button"; g.className="control-button";
  g.textContent=label.replace("-","−"); g.dataset.button=label;
  g.setAttribute("aria-label",label); g.setAttribute("aria-pressed","false"); parent.append(g);
  buttons[label] = {g,hit:g,bit:BTN[label]};
}
button("OCT-",document.getElementById("octaves")); button("OCT+",document.getElementById("octaves"));
const functionButtons = document.getElementById("function-buttons");
["FX","SEL","ENV","LFO","EDIT","GLO","HOME","SAVE","ARP","SEQ","PLAY","REC"].forEach(label => button(label,functionButtons));
const keyboard = document.getElementById("keyboard");
WHITE_K.forEach((note,i) => {
  const g=document.createElement("button"); g.type="button"; g.className="key white";
  g.textContent=String(i+1); g.setAttribute("aria-label",`white key ${i+1}`); g.dataset.key=note;
  keyboard.append(g); keys[note]={g,hit:g};
});
BLACK_K.forEach((note,i) => {
  const g=document.createElement("button"); g.type="button"; g.className="key black";
  g.setAttribute("aria-label",`black key ${i+1}`); g.dataset.key=note;
  g.style.left=`${(BLACK_AFTER[i]+1)*100/16-2.05}%`; keyboard.append(g); keys[note]={g,hit:g};
});

// Resize only geometry; the worklet and active pattern survive device rotation.
function resizePanel() {
  const landscape = matchMedia("(orientation: landscape)").matches;
  if (landscape) {
    const rows=getComputedStyle(device).gridTemplateRows.split(" ");
    device.style.setProperty("--screen-size",rows[0]);
  } else device.style.removeProperty("--screen-size");
}
new ResizeObserver(resizePanel).observe(device);
window.addEventListener("orientationchange",resizePanel);
resizePanel();
