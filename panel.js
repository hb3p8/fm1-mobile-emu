// SPDX-License-Identifier: GPL-3.0-only
// DOM controls use the same FM-1 bit and encoder mappings as upstream/web/emu/index.html.
"use strict";
const BTN = { FX:0, SEL:1, ENV:2, LFO:3, EDIT:4, GLO:5, HOME:6, SAVE:7, ARP:8, SEQ:9, PLAY:10, REC:11, "OCT-":12, "OCT+":13 };
const ENC = { SELECT:0, ALGORITHM:1, PRESETS:2, KNOB1:3, KNOB2:4, KNOB3:5, KNOB4:6 };
const WHITE_K = [0,2,4,6,7,9,11,12,14,16,18,19,21,23,24,26];
const BLACK_K = [1,3,5,8,10,13,15,17,20,22,25];
const BLACK_AFTER = [0,1,2,4,5,7,8,9,11,12,14];
const STORE_KEY = FW.store;
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
  g.className = "knob" + (role === "master" ? " knob-master" : ""); g.tabIndex = 0; g.setAttribute("role","slider");
  g.setAttribute("aria-label",label); g.setAttribute("aria-valuemin","0");
  g.setAttribute("aria-valuemax",role === "master" ? "100" : "360");
  g.setAttribute("aria-valuenow","0"); g.dataset.encoder = label;
  const face = document.createElement("span"); face.className = "knob-face"; face.setAttribute("aria-hidden","true");
  const ind = document.createElement("span"); ind.className = "knob-indicator";
  const name = document.createElement("span"); name.className = "knob-label"; name.textContent=label;
  face.append(ind); g.append(face,name); parent.append(g);
  knobs[label] = {g,hit:g,ind,angle:0,role};
}
for (let i=1;i<=4;i++) knob(`KNOB${i}`,ENC[`KNOB${i}`],document.getElementById("parameter-knobs"));
const globalKnobs = document.getElementById("global-knobs");
knob("MASTER","master",globalKnobs); knob("SELECT",ENC.SELECT,globalKnobs);
knob("PRESETS",ENC.PRESETS,globalKnobs); knob("ALGORITHM",ENC.ALGORITHM,globalKnobs);

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

// Resize only geometry; the worklet and active pattern survive device rotation. The screen stays square: in
// landscape as tall as the space (but leaving the controls on the right 40% of the width on squarish screens
// such as tablets), in portrait as wide. It snaps down to a whole multiple of 240 device pixels when that
// costs at most a tenth of its size: every firmware pixel then covers the same number of the display's
// (with Menu > Screen smoothing off, square blocks of them: screen.js samples the nearest pixel).
const BEZEL = 3;                                          /* .screen-bezel's padding */
const screenPanel = document.getElementById("screen-panel"), screenBezel = document.getElementById("screen-bezel");
const mainPanel = document.querySelector(".panel-main");
function screenSize(room) {
  const dpr = window.devicePixelRatio || 1, k = Math.floor(room * dpr / 240), whole = k * 240 / dpr;
  return k >= 1 && whole >= room * .9 ? whole : Math.max(120, Math.floor(room));
}
function resizePanel() {
  const landscape = matchMedia("(orientation: landscape)").matches, style = getComputedStyle(screenPanel);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const height = screenPanel.clientHeight - padY;
  const width = landscape ? Math.min(height, device.clientWidth - mainPanel.offsetWidth - 2 - Math.max(260, device.clientWidth * .4) - padX)
                          : screenPanel.clientWidth - padX;
  const size = screenSize(Math.min(width, height) - 2 * BEZEL) + 2 * BEZEL;
  screenBezel.style.setProperty("--screen-size", `${size}px`);
  if (landscape) device.style.setProperty("--screen-col", `${size + padX}px`);
  else device.style.removeProperty("--screen-col");
  requestAnimationFrame(alignScreen);
}
// Centring can leave the canvas half a device pixel off the display's grid, and the compositor would then
// resample it: shift it onto the grid, so its device-pixel-sized drawing buffer lands 1:1 on the display.
const screenCanvas = document.getElementById("screen");
function alignScreen() {
  const dpr = window.devicePixelRatio || 1;
  screenBezel.style.translate = "";
  const r = screenCanvas.getBoundingClientRect();
  const dx = Math.round(r.left * dpr) / dpr - r.left, dy = Math.round(r.top * dpr) / dpr - r.top;
  if (Math.abs(dx) > .001 || Math.abs(dy) > .001) screenBezel.style.translate = `${dx}px ${dy}px`;
}
const panelObserver = new ResizeObserver(resizePanel);
panelObserver.observe(screenPanel); panelObserver.observe(device);
panelObserver.observe(mainPanel);                         /* (its width moves the screen: labels in a late font) */
document.fonts?.ready.then(() => requestAnimationFrame(alignScreen));
window.addEventListener("orientationchange",resizePanel);
resizePanel();
