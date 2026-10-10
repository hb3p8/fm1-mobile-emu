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
  let filter = "pixel", frame = null;   // plain pixels unless Menu > Screen smoothing was turned on
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
