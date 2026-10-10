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

// Resize only geometry; the worklet and active pattern survive device rotation. The screen stays
// square: in landscape its column is as wide as the space is tall, but leaves the controls on the right
// 40% of the width on squarish screens such as tablets; in portrait it fits the free height.
const screenPanel = document.getElementById("screen-panel"), screenBezel = document.getElementById("screen-bezel");
const mainPanel = document.querySelector(".panel-main");
function resizePanel() {
  const landscape = matchMedia("(orientation: landscape)").matches;
  if (landscape) {
    const room = device.clientWidth - mainPanel.offsetWidth - 2 - Math.max(260,device.clientWidth*.4);
    device.style.setProperty("--screen-col",`${Math.round(Math.max(160,Math.min(screenPanel.getBoundingClientRect().height,room)))}px`);
  }
  else device.style.removeProperty("--screen-col");
  const style = getComputedStyle(screenPanel);
  const w = screenPanel.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const h = screenPanel.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  screenBezel.style.setProperty("--screen-size",`${Math.max(120,Math.floor(Math.min(w,h)))}px`);
}
const panelObserver = new ResizeObserver(resizePanel);
panelObserver.observe(screenPanel); panelObserver.observe(device);
window.addEventListener("orientationchange",resizePanel);
resizePanel();

// SPDX-License-Identifier: GPL-3.0-only
// The 240×240 FM-1 framebuffer is magnified on the GPU straight to device pixels, either with
// xBR level 2 (Hyllian's edge-directed filter from game emulators, MIT) or as plain pixels.
"use strict";
const SCREEN_FILTER_KEY = "x0x-screen-filter";
const SCREEN_FILTERS = ["xbr", "pixel"];

const XBR_VERTEX = `
attribute vec2 aPos;
varying vec2 vTex;
void main() { vTex = vec2(aPos.x + 1.0, 1.0 - aPos.y) * 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const XBR_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec2 uSrc;      // framebuffer size in pixels
uniform float uDelta;   // framebuffer pixels per output pixel: the width of an anti-aliased edge
uniform float uMode;    // 0 pixels, 1 xBR
varying vec2 vTex;

const float Y_WEIGHT = 48.0;
const float EQ_THRESHOLD = 15.0;
const float LV2_COEFFICIENT = 2.0;
const vec3 Y = vec3(0.2126, 0.7152, 0.0722) * Y_WEIGHT;

vec4 df(vec4 a, vec4 b) { return abs(a - b); }
vec4 eq(vec4 a, vec4 b) { return 1.0 - step(EQ_THRESHOLD, df(a, b)); }
vec4 neq(vec4 a, vec4 b) { return vec4(notEqual(a, b)); }
vec4 wd(vec4 a, vec4 b, vec4 c, vec4 d, vec4 e, vec4 f, vec4 g, vec4 h) {
  return df(a, b) + df(a, c) + df(d, e) + df(d, f) + 4.0 * df(g, h);
}
float cdf(vec3 a, vec3 b) { vec3 d = abs(a - b); return d.r + d.g + d.b; }

/*  Neighbourhood of the centre pixel E (rows top to bottom):
            A1 B1 C1
         A0 A  B  C  C4
         D0 D  E  F  F4
         G0 G  H  I  I4
            G5 H5 I5
    The four vec4 lanes are E's four corners: I (bottom-right), C, A, G. */
void main() {
  vec2 ps = 1.0 / uSrc;
  vec2 pos = vTex * uSrc;
  vec2 fp = fract(pos);
  vec2 tc = (floor(pos) + 0.5) * ps;
  #define T(x, y) texture2D(uTex, tc + vec2(x, y) * ps).rgb
  vec3 E = T(0.0, 0.0);
  if (uMode < 0.5) { gl_FragColor = vec4(E, 1.0); return; }

  vec3 A1 = T(-1.0, -2.0), B1 = T(0.0, -2.0), C1 = T(1.0, -2.0);
  vec3 A0 = T(-2.0, -1.0), A = T(-1.0, -1.0), B = T(0.0, -1.0), C = T(1.0, -1.0), C4 = T(2.0, -1.0);
  vec3 D0 = T(-2.0, 0.0), D = T(-1.0, 0.0), F = T(1.0, 0.0), F4 = T(2.0, 0.0);
  vec3 G0 = T(-2.0, 1.0), G = T(-1.0, 1.0), H = T(0.0, 1.0), I = T(1.0, 1.0), I4 = T(2.0, 1.0);
  vec3 G5 = T(-1.0, 2.0), H5 = T(0.0, 2.0), I5 = T(1.0, 2.0);

  vec4 b = vec4(dot(B, Y), dot(D, Y), dot(H, Y), dot(F, Y));
  vec4 c = vec4(dot(C, Y), dot(A, Y), dot(G, Y), dot(I, Y));
  vec4 e = vec4(dot(E, Y));
  vec4 d = b.yzwx, f = b.wxyz, g = c.zwxy, h = b.zwxy, i = c.wxyz;
  vec4 i4 = vec4(dot(I4, Y), dot(C1, Y), dot(A0, Y), dot(G5, Y));
  vec4 i5 = vec4(dot(I5, Y), dot(C4, Y), dot(A1, Y), dot(G0, Y));
  vec4 h5 = vec4(dot(H5, Y), dot(F4, Y), dot(B1, Y), dot(D0, Y));
  vec4 f4 = h5.yzwx;

  // Lines below which a corner is interpolated: 45°, 30° (towards G) and 60° (towards C).
  vec4 fx     = vec4(1.0, -1.0, -1.0, 1.0) * fp.y + vec4(1.0, 1.0, -1.0, -1.0) * fp.x;
  vec4 fxLeft = vec4(1.0, -1.0, -1.0, 1.0) * fp.y + vec4(0.5, 2.0, -0.5, -2.0) * fp.x;
  vec4 fxUp   = vec4(1.0, -1.0, -1.0, 1.0) * fp.y + vec4(2.0, 0.5, -2.0, -0.5) * fp.x;
  vec4 Co = vec4(1.5, 0.5, -0.5, 0.5), Cx = vec4(1.0, 1.0, -0.5, 0.0), Cy = vec4(2.0, 0.0, -1.0, 0.5);
  vec4 delta = vec4(uDelta), deltaL = vec4(0.5, 1.0, 0.5, 1.0) * uDelta, deltaU = deltaL.yxwz;

  vec4 lv0 = neq(e, f) * neq(e, h);
  vec4 lv1 = lv0 * clamp((1.0 - eq(f, b)) * (1.0 - eq(h, d))
                       + eq(e, i) * (1.0 - eq(f, i4)) * (1.0 - eq(h, i5))
                       + eq(e, g) + eq(e, c), 0.0, 1.0);
  vec4 lv2Left = neq(e, g) * neq(d, g);
  vec4 lv2Up = neq(e, c) * neq(b, c);

  vec4 fx45i = clamp((fx + delta - Co - 0.25) / (2.0 * delta), 0.0, 1.0);
  vec4 fx45 = clamp((fx + delta - Co) / (2.0 * delta), 0.0, 1.0);
  vec4 fx30 = clamp((fxLeft + deltaL - Cx) / (2.0 * deltaL), 0.0, 1.0);
  vec4 fx60 = clamp((fxUp + deltaU - Cy) / (2.0 * deltaU), 0.0, 1.0);

  vec4 wd1 = wd(e, c, g, i, h5, f4, h, f);
  vec4 wd2 = wd(h, d, i5, f, i4, b, e, i);
  vec4 edri = step(wd1, wd2) * lv0;
  vec4 edr = (1.0 - step(wd2, wd1)) * lv1;
  vec4 edrLeft = step(LV2_COEFFICIENT * df(f, g), df(h, c)) * lv2Left * edr;
  vec4 edrUp = step(LV2_COEFFICIENT * df(h, c), df(f, g)) * lv2Up * edr;

  vec4 amount = max(max(edrLeft * fx30, edrUp * fx60), max(edr * fx45, edri * fx45i));
  vec4 px = step(df(e, f), df(e, h));

  vec3 res1 = mix(E, mix(H, F, px.x), amount.x);
  res1 = mix(res1, mix(B, D, px.z), amount.z);
  vec3 res2 = mix(E, mix(F, B, px.y), amount.y);
  res2 = mix(res2, mix(D, H, px.w), amount.w);
  gl_FragColor = vec4(mix(res1, res2, step(cdf(E, res1), cdf(E, res2))), 1.0);
}`;

const screenRenderer = (() => {
  const canvas = document.getElementById("screen");
  let filter = "xbr", frame = null;
  try { if (SCREEN_FILTERS.includes(localStorage.getItem(SCREEN_FILTER_KEY))) filter = localStorage.getItem(SCREEN_FILTER_KEY); } catch {}
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
  let program = null, uMode = null, uDelta = null;
  if (gl) {
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, XBR_VERTEX));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, XBR_FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (err) { console.warn("Screen filter unavailable:", err); program = null; }
  }
  if (program) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
                          [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 240, 240, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(240 * 240 * 4));
    gl.uniform2f(gl.getUniformLocation(program, "uSrc"), 240, 240);
    uMode = gl.getUniformLocation(program, "uMode");
    uDelta = gl.getUniformLocation(program, "uDelta");
  }
  const ctx2d = program ? null : canvas.getContext("2d");
  if (ctx2d) { canvas.width = canvas.height = 240; filter = "pixel"; }

  function render() {
    if (!program) { if (frame) ctx2d.putImageData(frame, 0, 0); return; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uMode, filter === "xbr" ? 1 : 0);
    gl.uniform1f(uDelta, 240 / canvas.width);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // Keep the drawing buffer at the canvas's size in device pixels so the filter output is never rescaled.
  function resize(width, height) {
    if (!program || !width || !height) return;
    const w = Math.max(240, Math.round(width)), h = Math.max(240, Math.round(height));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; render(); }
  }
  new ResizeObserver((entries) => {
    const entry = entries[0], box = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
    if (box) resize(box.inlineSize, box.blockSize);
    else resize(entry.contentRect.width * devicePixelRatio, entry.contentRect.height * devicePixelRatio);
  }).observe(canvas);
  render();

  return {
    get available() { return !!program; },
    get filter() { return filter; },
    set filter(value) {
      if (!program || !SCREEN_FILTERS.includes(value)) return;
      filter = value;
      try { localStorage.setItem(SCREEN_FILTER_KEY, value); } catch {}
      render();
    },
    draw(image) {
      frame = image;
      if (program) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
      render();
    },
  };
})();

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
document.addEventListener("pointerup", pointerUp);
document.addEventListener("pointercancel", pointerUp);
document.addEventListener("lostpointercapture", pointerUp);

function drawKnob(k) {
  k.ind.style.transform = `rotate(${k.angle}deg)`;
  if (k.role === "master") k.g.style.setProperty("--level", (master / 4096).toFixed(3));
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
const img = new ImageData(240, 240);
function drawScreen(fb) {
  const d = img.data;
  for (let i = 0; i < 240 * 240; i++) {
    const v = fb[i], p = ((v >> 8) | (v << 8)) & 0xFFFF;
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
  row.querySelector(".sname").textContent = "Reading...";
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
  if (!s) { n.textContent = skipped ? "Could not read that file" : "Empty"; return; }
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
    row.innerHTML = `<b>Slot ${k + 1}</b><span class="sname">Empty</span>` +
      `<label>Choose files<input type="file" multiple accept="audio/*,.wav,.aif,.aiff,.mp3,.flac"></label><button type="button">Clear</button>`;
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
  go.textContent = "Starting...";
  try {
    if (!window.isSecureContext || !window.AudioWorkletNode) throw new Error("Audio needs HTTPS or localhost");
    const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });
    audioContext = ac;
    await ac.resume();
    const [wasm] = await Promise.all([fetch("x0x.wasm").then((r) => { if (!r.ok) throw new Error(`x0x.wasm: ${r.status}`); return r.arrayBuffer(); }),
                                      ac.audioWorklet.addModule("worklet.js")]);
    node = new AudioWorkletNode(ac, "x0x", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    node.connect(ac.destination);
    const ready = new Promise((res, reject) => {
      const timer = setTimeout(() => reject(new Error("The audio engine did not answer")), 15000);
      node.port.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") { clearTimeout(timer); res(); }
        else if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }
        else if (m.type === "frame") {
          if (m.fb) drawScreen(m.fb);
          drawLights(m.buttons, m.keys, m.dim);
          window.x0xLast = m;
          if (m.load !== undefined) cpu.textContent = `Audio thread load: ${m.load}%`;
          if (m.store) saveStore(m.store);
        }
      };
    });
    node.port.postMessage({ type: "load", wasm, store: loadStore(), master }, [wasm]);
    await ready;
    [0, 1, 2].forEach((k) => { if (slots[k]) slotSend(k); });   // the loops kept in this browser
    await ac.resume();
    document.getElementById("start").hidden = true;
    status.textContent = "Sound on";
    document.querySelector(".app-shell").classList.add("running");
    document.getElementById("audio-toggle").hidden = false;
    syncButtons(); syncKeys();
  } catch (err) {
    go.disabled = false;
    if (audioContext) await audioContext.close().catch(() => {});
    audioContext = null; node = null;
    go.textContent = "Try again";
    status.textContent = "Could not start";
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
    document.getElementById("reset").textContent = "Click again to forget everything";
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
  const toggle=event.currentTarget;   // currentTarget is gone after the awaits below
  if (!audioContext) return;
  releaseInputs();
  if (audioContext.state === "running") await audioContext.suspend();
  else await audioContext.resume();
  const running=audioContext.state === "running";
  toggle.querySelector(".tool-label").textContent=running ? "Pause" : "Resume";
  toggle.setAttribute("aria-label",running ? "Pause" : "Resume");
  status.textContent=running ? "Sound on" : "Paused";
  document.querySelector(".app-shell").classList.toggle("running",audioContext.state === "running");
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
// launch and whenever the app comes back to the front), it takes over at once if the firmware is
// not running yet; otherwise Menu offers a reload so nothing stops in the middle of playing.
if ("serviceWorker" in navigator && window.isSecureContext) {
  const updated = !!navigator.serviceWorker.controller;   // false on the very first visit: nothing to replace
  navigator.serviceWorker.register("sw.js").then((registration)=> {
    document.addEventListener("visibilitychange",()=> { if (!document.hidden) registration.update().catch(()=>{}); });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=> {
    if (!updated) return;
    if (!node) { location.reload(); return; }
    document.getElementById("update").hidden=false;
    document.getElementById("settings-open").classList.add("has-update");
  });
  document.getElementById("update-reload").addEventListener("click",()=>location.reload());
}
