// SPDX-License-Identifier: MIT
// Based on joakimeriksson/fm1-emu web/worklet.js, Copyright (c) 2026 Joakim Eriksson.
function jitImports(exports, stats) {
  return {
    fm1_jit_compile(ptr, len) {
      try {
        const x = exports();
        const bytes = new Uint8Array(x.memory.buffer, ptr, len).slice();
        const table = x.__indirect_function_table;
        const run = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { memory: x.memory, table } }).exports.run;
        const slot = table.grow(1);
        table.set(slot, run);
        stats.regions++;
        return slot;
      } catch (e) {
        stats.failed++;
        stats.error = String(e);
        return 0;
      }
    },
  };
}

const clock = globalThis.performance?.now ? () => performance.now() : () => Date.now();
const BUTTON_IDS = [2,3,4,5,6,7,8,9,10,11,12,13,0,1];
const SECTOR = 4096;
class Fm1Mobile extends AudioWorkletProcessor {
  constructor() {
    super();
    this.x = null; this.queue = []; this.masks = { buttons: 0, keys: 0 };
    this.port.onmessage = e => this.message(e.data).catch(err => this.fail(err));
  }
  fail(err) {
    this.x = null;
    this.port.postMessage({type:"error", message: String(err?.message || err)});
  }
  async message(m) {
    if (m.type === "load") {
      this.x = null;
      const module = await WebAssembly.compile(m.wasm);
      let x;
      this.jit = {regions:0, failed:0, error:""};
      x = (await WebAssembly.instantiate(module, {env: jitImports(() => x, this.jit)})).exports;
      x.fm1_jit(1, 16);
      const ptr = x.fm1_alloc(m.package.byteLength);
      new Uint8Array(x.memory.buffer, ptr, m.package.byteLength).set(new Uint8Array(m.package));
      if (x.fm1_boot_fwsc(ptr, m.package.byteLength, 0, 0, 240)) throw new Error("This is not a supported FM-1 .fwsc package");
      if (x.fm1_board() !== 0) throw new Error("This package is for an SMK-37. Please open an FM-1 firmware.");
      const flash = new Uint8Array(x.memory.buffer, x.fm1_flash(), x.fm1_flash_size());
      for (const [key, data] of Object.entries(m.sectors || {})) {
        const off = Number(key), b = new Uint8Array(data);
        if (!Number.isInteger(off) || off < 0 || off % SECTOR || b.length !== SECTOR || off + SECTOR > flash.length) continue;
        flash.set(b, off); x.fm1_flash_restored(off, SECTOR);
      }
      this.sent = flash.slice(); this.revision = x.fm1_flash_revision();
      x.fm1_seed(m.seed ?? 42);
      x.fm1_pot(m.master ?? 700);
      this.x = x; this.queue = []; this.masks = {buttons:0, keys:0}; this.nextInput = 0;
      this.calls = this.busy = this.samples = this.short = 0;
      this.port.postMessage({type:"ready"});
    } else if (this.x) {
      if (m.type === "buttons" || m.type === "keys") this.queue.push(m);
      else if (m.type === "enc") this.x.fm1_enc(m.role, m.n);
      else if (m.type === "master") this.x.fm1_pot(m.value);
      else if (m.type === "midi") for (const b of m.bytes) this.x.fm1_midi(b);
      else if (m.type === "flush") this.publish(true);
    }
  }
  input() {
    const ms = this.x.fm1_ms();
    if (!this.queue.length || ms < this.nextInput) return;
    const m = this.queue.shift(), was = this.masks[m.type];
    const count = m.type === "buttons" ? 14 : 27;
    for (let i = 0; i < count; i++) if ((was ^ m.mask) & (1 << i)) {
      this.x.fm1_key(m.type === "buttons" ? BUTTON_IDS[i] : i + 14, (m.mask >>> i) & 1);
    }
    this.masks[m.type] = m.mask;
    this.nextInput = ms + 24;  // Contacts remain closed for at least the firmware debounce interval.
  }
  changedSectors() {
    const x = this.x, revision = x.fm1_flash_revision();
    if (revision === this.revision) return null;
    this.revision = revision;
    const flash = new Uint8Array(x.memory.buffer, x.fm1_flash(), x.fm1_flash_size()), sectors = {};
    for (let off = 0; off < flash.length; off += SECTOR) {
      let same = true;
      for (let i = 0; i < SECTOR; i++) if (flash[off+i] !== this.sent[off+i]) { same = false; break; }
      if (!same) { sectors[off] = flash.slice(off, off+SECTOR); this.sent.set(sectors[off], off); }
    }
    return Object.keys(sectors).length ? sectors : null;
  }
  publish(flush = false) {
    const x = this.x;
    const sectors = this.changedSectors();
    if (flush) { this.port.postMessage({type:"flushed", sectors}); return; }
    const fb = new Uint16Array(x.memory.buffer, x.fm1_lcd(), 240*240).slice();
    const leds = new Float32Array(x.memory.buffer, x.fm1_leds(), 41).slice();
    const load = Math.round(this.busy / (this.samples / 44.1) * 100);
    this.port.postMessage({type:"frame", fb, leds, sectors, load, ms:x.fm1_ms(), short:this.short, jit:this.jit.regions}, [fb.buffer,leds.buffer]);
    this.busy = this.samples = 0;
  }
  process(_inputs, outputs) {
    if (!this.x) return true;
    try {
      this.input();
      const out = outputs[0], n = out[0].length, t = clock(), x = this.x;
      const have = x.fm1_render(n, 240e6 * .02);
      out[0].set(new Float32Array(x.memory.buffer, x.fm1_out_l(), n));
      if (out[1]) out[1].set(new Float32Array(x.memory.buffer, x.fm1_out_r(), n));
      this.short += have < n ? 1 : 0;
      this.busy += clock() - t; this.samples += n;
      if (x.fm1_halted()) throw new Error("The firmware stopped. Open Menu to choose another package.");
      if (++this.calls % 11 === 0) this.publish();
    } catch (err) { this.fail(err); }
    return true;
  }
}
registerProcessor("fm1-mobile", Fm1Mobile);
