// SPDX-License-Identifier: GPL-3.0-only
// Input handling adapted from charlesvestal/fm1-x0x (GPL-3.0-only).
// ---------------------------------------------------------------- state and input
let node = null, btnMask = 0, keyMask = 0, latched = 0, master = MASTER_DEFAULT;
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
document.addEventListener("pointerup", pointerUp);
document.addEventListener("pointercancel", pointerUp);
document.addEventListener("lostpointercapture", pointerUp);

function drawKnob(k) {
  k.ind.style.transform = `rotate(${k.angle}deg)`;
  if (k.role === "master") k.g.style.setProperty("--level", (master / MASTER_MAX).toFixed(3));
  k.hit.setAttribute("aria-valuenow", k.role === "master" ? Math.round(master * 100 / MASTER_MAX) : ((k.angle % 360 + 360) % 360));
}
function turn(k, n) {
  if (!n) return;
  if (k.role === "master") {
    master = Math.max(0, Math.min(MASTER_MAX, master + n * MASTER_STEP));
    k.angle = -135 + 270 * master / MASTER_MAX;
    send({ type: "master", value: master });
  } else {
    k.angle = (k.angle + n * 18) % 360;
    send({ type: "enc", role: k.role, n });
  }
  drawKnob(k);
}
for (const k of Object.values(knobs)) {
  if (k.role === "master") { k.angle = -135 + 270 * master / MASTER_MAX; drawKnob(k); }
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
const img = new ImageData(240, 240);
function drawScreen(fb) {
  const d = img.data;
  for (let i = 0; i < 240 * 240; i++) {
    const p = fb[i];
    d[i * 4] = ((p >> 11) & 31) * 255 / 31;
    d[i * 4 + 1] = ((p >> 5) & 63) * 255 / 63;
    d[i * 4 + 2] = (p & 31) * 255 / 31;
    d[i * 4 + 3] = 255;
  }
  screenRenderer.draw(img);
}
function drawLights(b, k, d = 0) {
  for (const x of Object.values(buttons)) x.g.classList.toggle("lit", !!(b & (1 << x.bit)));
  keys.forEach((x, i) => {
    x.g.classList.toggle("lit", !!(k & (1 << i)));
    x.g.classList.toggle("dim", !(k & (1 << i)) && !!(d & (1 << i)));
  });
}

