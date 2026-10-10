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

let audioContext = null;
// ---------------------------------------------------------------- state and input
let node = null, btnMask = 0, keyMask = 0, latched = 0, master = 2800;
const btnHeldBy = new Map(), keyHeldBy = new Map();      // pointer / key id -> bit
function send(m) { if (node) node.port.postMessage(m); }
function syncButtons() {
  let m = latched;
  for (const b of btnHeldBy.values()) m |= 1 << b;
  if (m !== btnMask) { btnMask = m; send({ type: "buttons", mask: m }); }
  for (const b of Object.values(buttons)) {
    b.g.classList.toggle("held", !!(m & (1 << b.bit)));
    b.g.classList.toggle("latched", !!(latched & (1 << b.bit)));
    b.hit.classList.toggle("latched", !!(latched & (1 << b.bit)));
    b.hit.setAttribute("aria-pressed", m & (1 << b.bit) ? "true" : "false");
  }
}
function syncKeys() {
  let m = 0;
  for (const k of keyHeldBy.values()) m |= 1 << k;
  if (m !== keyMask) { keyMask = m; send({ type: "keys", mask: m }); }
  keys.forEach((k, i) => k.g.classList.toggle("held", !!(m & (1 << i))));
}

for (const b of Object.values(buttons)) {
  b.hit.addEventListener("contextmenu", (e) => e.preventDefault());
  b.hit.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (latchMode || e.shiftKey || e.button === 2) { latched ^= 1 << b.bit; syncButtons(); return; }
    if (latched & (1 << b.bit)) { latched &= ~(1 << b.bit); syncButtons(); return; }
    b.hit.setPointerCapture(e.pointerId);
    rememberPress("p" + e.pointerId);
    btnHeldBy.set("p" + e.pointerId, b.bit);
    syncButtons();
  });
}
keys.forEach((k, i) => {
  k.hit.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    k.hit.setPointerCapture(e.pointerId);
    rememberPress("p" + e.pointerId);
    keyHeldBy.set("p" + e.pointerId, i);
    syncKeys();
  });
});
function pointerUp(e) {
  releasePointer(e.pointerId);
}
device.addEventListener("pointerup", pointerUp);
device.addEventListener("pointercancel", pointerUp);
device.addEventListener("lostpointercapture", pointerUp);

function drawKnob(k) {
  k.ind.style.transform = `rotate(${k.angle}deg)`;
  k.hit.setAttribute("aria-valuenow", k.role === "master" ? Math.round(master * 100 / 4096) : ((k.angle % 360 + 360) % 360));
}
function turn(k, n) {
  if (!n) return;
  if (k.role === "master") {
    master = Math.max(0, Math.min(4096, master + n * 64));
    k.angle = -135 + 270 * master / 4096;
    send({ type: "master", value: master });
  } else {
    k.angle = (k.angle + n * 18) % 360;
    send({ type: "enc", role: k.role, n });
  }
  drawKnob(k);
}
for (const k of Object.values(knobs)) {
  if (k.role === "master") { k.angle = -135 + 270 * master / 4096; drawKnob(k); }
  let drag = null, wheel = 0;
  k.hit.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    k.hit.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, acc: 0 };
  });
  k.hit.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.acc += drag.y - e.clientY;
    drag.y = e.clientY;
    const step = k.role === "master" ? 3 : 7;
    const n = Math.trunc(drag.acc / step);
    if (n) { drag.acc -= n * step; turn(k, n); }
  });
  const end = () => { drag = null; };
  k.hit.addEventListener("pointerup", end);
  k.hit.addEventListener("pointercancel", end);
  k.hit.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    if (Math.abs(dy) >= 50) { turn(k, dy < 0 ? 1 : -1); wheel = 0; return; }   // a mouse wheel notch: one detent
    wheel -= dy;                                                                   // a trackpad: by distance
    const n = Math.trunc(wheel / 25);
    if (n) { wheel -= n * 25; turn(k, n); }
  }, { passive: false });
  k.hit.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { turn(k, 1); e.preventDefault(); e.stopPropagation(); }
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { turn(k, -1); e.preventDefault(); e.stopPropagation(); }
  });
}

const KEYMAP = {};
"qwertyui".split("").forEach((c, i) => KEYMAP["Key" + c.toUpperCase()] = { key: WHITE_K[i] });
"asdfghjk".split("").forEach((c, i) => KEYMAP["Key" + c.toUpperCase()] = { key: WHITE_K[8 + i] });
"1234567890".split("").forEach((c, i) => KEYMAP["Digit" + c] = { key: BLACK_K[i] });
KEYMAP.Minus = { key: BLACK_K[10] };
Object.assign(KEYMAP, { Space: { btn: BTN.PLAY }, Enter: { btn: BTN.REC }, ShiftLeft: { btn: BTN.SEL }, ShiftRight: { btn: BTN.SEL },
                        Escape: { btn: BTN.HOME }, KeyZ: { btn: BTN["OCT-"] }, KeyX: { btn: BTN["OCT+"] } });
addEventListener("keydown", (e) => {
  if (!node || e.metaKey || e.ctrlKey || e.altKey || document.getElementById("settings").open) return;
  if ((e.code === "ArrowUp" || e.code === "ArrowDown") && !e.target.closest(".knob")) { turn(knobs.SELECT, e.code === "ArrowUp" ? 1 : -1); e.preventDefault(); return; }
  const m = KEYMAP[e.code];
  if (!m) return;
  e.preventDefault();
  if (e.repeat) return;
  if (m.key !== undefined) { keyHeldBy.set("k" + e.code, m.key); syncKeys(); }
  else { btnHeldBy.set("k" + e.code, m.btn); syncButtons(); }
});
addEventListener("keyup", (e) => {
  const id = "k" + e.code;
  if (keyHeldBy.delete(id)) syncKeys();
  if (btnHeldBy.delete(id)) syncButtons();
});
addEventListener("blur", () => {
  for (const id of [...btnHeldBy.keys()]) if (id[0] === "k") btnHeldBy.delete(id);
  for (const id of [...keyHeldBy.keys()]) if (id[0] === "k") keyHeldBy.delete(id);
  syncButtons(); syncKeys();
});

// ---------------------------------------------------------------- screen and lights
const ctx = document.getElementById("screen").getContext("2d");
const img = ctx.createImageData(240, 240);
function drawScreen(fb) {
  const d = img.data;
  for (let i = 0; i < 240 * 240; i++) {
    const v = fb[i], p = ((v >> 8) | (v << 8)) & 0xFFFF;
    d[i * 4] = ((p >> 11) & 31) * 255 / 31;
    d[i * 4 + 1] = ((p >> 5) & 63) * 255 / 63;
    d[i * 4 + 2] = (p & 31) * 255 / 31;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function drawLights(b, k, d = 0) {
  for (const x of Object.values(buttons)) x.g.classList.toggle("lit", !!(b & (1 << x.bit)));
  keys.forEach((x, i) => {
    x.g.classList.toggle("lit", !!(k & (1 << i)));
    x.g.classList.toggle("dim", !(k & (1 << i)) && !!(d & (1 << i)));
  });
}

// ---------------------------------------------------------------- storage
function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"), out = {};
    for (const [o, b64] of Object.entries(raw)) out[o] = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
    return out;
  } catch { return {}; }
}
function saveStore(store) {
  try {
    const raw = {};
    for (const [o, u8] of Object.entries(store)) { let s = ""; for (const c of u8) s += String.fromCharCode(c); raw[o] = btoa(s); }
    localStorage.setItem(STORE_KEY, JSON.stringify(raw));
  } catch { /* storage unavailable: this session only */ }
}

// ---------------------------------------------------------------- your breaks
// A file becomes mono 22050 Hz 16-bit here (the browser decodes and resamples it), peak 0.95 as
// tools/import_breaks.py leaves it, and goes to the worklet, which IMA-encodes it into the slot as
// an upload to the FM-1 would. Slots are kept in IndexedDB (they are too big for localStorage).
const SLOT_RATE = 22050, SLOT_MAX = 2 * (0x14000 - 512), SLOT_ZONES = 16;
const slots = [null, null, null];                 // {name, zones: [{pcm: Int16Array, rate}]}
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("x0x-emu", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("slots");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function slotsLoad() {
  try {
    const db = await idb();
    await Promise.all([0, 1, 2].map((k) => new Promise((res) => {
      const q = db.transaction("slots").objectStore("slots").get(k);
      q.onsuccess = () => { if (q.result) slots[k] = { name: q.result.name, zones: q.result.zones.map((z) => ({ pcm: new Int16Array(z.pcm), rate: z.rate })) }; res(); };
      q.onerror = () => res();
    })));
  } catch { /* no IndexedDB: this session only */ }
}
async function slotSave(k) {
  try {
    const db = await idb(), st = db.transaction("slots", "readwrite").objectStore("slots");
    if (slots[k]) st.put({ name: slots[k].name, zones: slots[k].zones.map((z) => ({ pcm: z.pcm.buffer.slice(0), rate: z.rate })) }, k);
    else st.delete(k);
  } catch { /* this session only */ }
}
function slotSend(k) { send({ type: "slot", k, name: slots[k] ? slots[k].name : "", zones: slots[k] ? slots[k].zones : [] }); }
async function decode(file) {
  const ctx = new OfflineAudioContext(1, 1, SLOT_RATE);
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * SLOT_RATE)), SLOT_RATE);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const x = (await off.startRendering()).getChannelData(0);
  let pk = 1e-9;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  const g = 0.95 / pk, pcm = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, x[i] * g)) * 32767);
  return pcm;
}
const slotName = (file) => (file.name.replace(/\.[^.]*$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "") || "LOOP").slice(0, 8);
async function slotFill(k, files) {
  files = [...files].filter((f) => f && f.size).slice(0, SLOT_ZONES);
  if (!files.length) return;
  const row = document.querySelectorAll(".slot")[k];
  row.querySelector(".sname").textContent = "Чтение…";
  const zones = [];
  let used = 0, skipped = 0;
  for (const f of files) {
    try {
      const pcm = await decode(f);
      if (used + pcm.length > SLOT_MAX) { skipped++; continue; }
      zones.push({ pcm, rate: SLOT_RATE });
      used += pcm.length;
    } catch { skipped++; }
  }
  slots[k] = zones.length ? { name: slotName(files[0]), zones } : null;
  slotDraw(k, skipped);
  slotSend(k);
  slotSave(k);
}
function slotDraw(k, skipped = 0) {
  const row = document.querySelectorAll(".slot")[k], s = slots[k], n = row.querySelector(".sname");
  if (!s) { n.textContent = skipped ? "Не удалось прочитать файл" : "Пусто"; return; }
  const sec = s.zones.reduce((a, z) => a + z.pcm.length, 0) / SLOT_RATE;
  n.innerHTML = "";
  const b = document.createElement("strong");
  b.textContent = s.name;
  n.append(b, ` · ${s.zones.length} loop${s.zones.length > 1 ? "s" : ""} · ${sec.toFixed(1)} of ${(SLOT_MAX / SLOT_RATE).toFixed(1)} s` +
           (skipped ? ` · ${skipped} did not fit or could not be read` : ""));
}
(function slotsUi() {
  const box = document.getElementById("slots");
  for (let k = 0; k < 3; k++) {
    const row = document.createElement("div");
    row.className = "slot";
    row.innerHTML = `<b>Slot ${k + 1}</b><span class="sname">Пусто</span>` +
      `<label>Выбрать файлы<input type="file" multiple accept="audio/*,.wav,.aif,.aiff,.mp3,.flac"></label><button type="button">Очистить</button>`;
    row.querySelector("input").addEventListener("change", (e) => { slotFill(k, e.target.files); e.target.value = ""; });
    row.querySelector("button").addEventListener("click", () => { slots[k] = null; slotDraw(k); slotSend(k); slotSave(k); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("over"); });
    row.addEventListener("dragleave", () => row.classList.remove("over"));
    row.addEventListener("drop", (e) => { e.preventDefault(); row.classList.remove("over"); slotFill(k, e.dataTransfer.files); });
    box.appendChild(row);
  }
  slotsLoad().then(() => [0, 1, 2].forEach((k) => slotDraw(k)));
})();

// ---------------------------------------------------------------- switching on
const status = document.getElementById("status"), cpu = document.getElementById("cpu");
async function switchOn() {
  const go = document.getElementById("go");
  go.disabled = true;
  go.textContent = "Запускается…";
  try {
    if (!window.isSecureContext || !window.AudioWorkletNode) throw new Error("Для звука откройте страницу по HTTPS или на localhost");
    const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });
    audioContext = ac;
    await ac.resume();
    const [wasm] = await Promise.all([fetch("x0x.wasm").then((r) => { if (!r.ok) throw new Error(`x0x.wasm: ${r.status}`); return r.arrayBuffer(); }),
                                      ac.audioWorklet.addModule("worklet.js")]);
    node = new AudioWorkletNode(ac, "x0x", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    node.connect(ac.destination);
    const ready = new Promise((res, reject) => {
      const timer = setTimeout(() => reject(new Error("Звуковое ядро не ответило")), 15000);
      node.port.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") { clearTimeout(timer); res(); }
        else if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }
        else if (m.type === "frame") {
          if (m.fb) drawScreen(m.fb);
          drawLights(m.buttons, m.keys, m.dim);
          window.x0xLast = m;
          if (m.load !== undefined) cpu.textContent = `Загрузка аудиопотока: ${m.load}%`;
          if (m.store) saveStore(m.store);
        }
      };
    });
    node.port.postMessage({ type: "load", wasm, store: loadStore(), master }, [wasm]);
    await ready;
    [0, 1, 2].forEach((k) => { if (slots[k]) slotSend(k); });   // the loops kept in this browser
    await ac.resume();
    document.getElementById("start").hidden = true;
    status.textContent = "● Звук включён";
    document.getElementById("audio-toggle").hidden = false;
    syncButtons(); syncKeys();
  } catch (err) {
    go.disabled = false;
    if (audioContext) await audioContext.close().catch(() => {});
    audioContext = null; node = null;
    go.textContent = "Повторить запуск";
    status.textContent = "Ошибка запуска";
    document.querySelector(".start small").textContent = err && err.message || String(err);
  }
}
document.getElementById("go").addEventListener("click", switchOn);
document.getElementById("reset").addEventListener("click", () => {
  if (document.getElementById("reset").dataset.armed) {
    try { localStorage.removeItem(STORE_KEY); } catch {}
    location.reload();
  } else {
    document.getElementById("reset").dataset.armed = "1";
    document.getElementById("reset").textContent = "Нажмите ещё раз для сброса";
  }
});

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
  if (!audioContext) return;
  releaseInputs();
  if (audioContext.state === "running") await audioContext.suspend();
  else await audioContext.resume();
  event.currentTarget.textContent=audioContext.state === "running" ? "Пауза" : "Звук";
  status.textContent=audioContext.state === "running" ? "● Звук включён" : "На паузе";
});
const fullscreen = document.getElementById("fullscreen");
if (!document.documentElement.requestFullscreen) fullscreen.hidden=true;
fullscreen.addEventListener("click",async()=> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen().catch(()=>{});
});
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
