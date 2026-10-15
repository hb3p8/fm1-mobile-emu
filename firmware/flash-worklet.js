// SPDX-License-Identifier: GPL-3.0-only
// Felucca-family firmwares and ChoralRoot in an AudioWorklet: the wasm is the whole firmware against a
// simulated FM-1 with a 1 MiB NOR flash. After Felucca's web/emu/worklet.js (hugelton/Felucca, GPL-3.0),
// itself after X0X's: each render quantum runs the device's clock forward; about 30 times a second the
// screen and the LEDs go out, and after the firmware writes its flash, the 4 KiB sectors that changed.

const SECTOR = 4096;
const HOLD_MS = 24;                 // each button / key change stays this long in device time (the debounce)
const clock = globalThis.performance ? () => globalThis.performance.now() : () => Date.now();

class FlashFirmware extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ex = null;
    this.sentDraws = -1;
    this.sentWrites = -1;
    this.sentLeds = "";
    this.sent = null;               // the flash as the page last got it
    this.lastFrame = 0;
    this.busy = 0;
    this.frames = 0;
    this.queue = [];
    this.nextOk = 0;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(m) {
    if (m.type === "load") {
      const wasi = {
        clock_time_get: (_id, _prec, out) => { new DataView(this.mem.buffer).setBigUint64(out, BigInt(Math.round(currentTime * 1e9)), true); return 0; },
        fd_write: (_fd, iov, n, out) => {
          const v = new DataView(this.mem.buffer); let count = 0;
          for (let i = 0; i < n; i++) count += v.getUint32(iov + 8 * i + 4, true);
          v.setUint32(out, count, true); return 0;
        },
      };
      const stub = new Proxy(wasi, { get: (t, k) => t[k] || (() => 0) });
      WebAssembly.instantiate(m.wasm, { wasi_snapshot_preview1: stub, env: new Proxy({}, { get: () => () => 0 }) }).then(({ instance }) => {
        const ex = instance.exports;
        this.mem = ex.memory;
        this.choralroot = !!ex.web_flash_stage;
        ex._initialize?.();
        let nor;
        if (this.choralroot) {
          nor = new Uint8Array(ex.memory.buffer, ex.web_flash_stage(), ex.web_flash_size());
          nor.fill(255);
        } else { ex.web_nor_erase(); nor = this.nor(ex); }
        for (const [k, v] of Object.entries(m.sectors || {})) {
          const off = +k, b = new Uint8Array(v);
          if (off % SECTOR === 0 && off + SECTOR <= nor.length && b.length === SECTOR) nor.set(b, off);
        }
        this.sent = nor.slice();
        if (this.choralroot) ex.web_flash_stage_len(nor.length);
        if (ex.web_set_seed) ex.web_set_seed(m.seed ?? 0);
        ex.web_master(m.master ?? 700);
        ex.web_boot();
        this.ex = ex;
        this.sentWrites = this.writes(ex);
        this.port.postMessage({ type: "ready" });
      }).catch((err) => this.port.postMessage({ type: "error", message: String(err && err.message || err) }));
      return;
    }
    const ex = this.ex;
    if (!ex) return;
    if (m.type === "buttons" || m.type === "keys") this.queue.push(m);
    else if (m.type === "enc") ex.web_enc(m.role, m.n | 0);
    else if (m.type === "master") ex.web_master(m.value | 0);
    else if (m.type === "midi" && ex.web_midi) ex.web_midi(m.st | 0, m.d1 | 0, m.d2 | 0);
  }

  nor(ex) { return new Uint8Array(ex.memory.buffer, this.choralroot ? ex.web_flash() : ex.web_nor(), this.choralroot ? ex.web_flash_size() : ex.web_nor_size()); }
  writes(ex) { return this.choralroot ? ex.web_flash_dirty() : ex.web_flash_writes_count(); }

  // The sectors that differ from what the page has: {offset: bytes}, an erased sector as null.
  changedSectors() {
    const nor = this.nor(this.ex), out = {};
    for (let off = 0; off < nor.length; off += SECTOR) {
      const now = nor.subarray(off, off + SECTOR), was = this.sent.subarray(off, off + SECTOR);
      let same = true;
      for (let i = 0; i < SECTOR; i++) if (now[i] !== was[i]) { same = false; break; }
      if (same) continue;
      was.set(now);
      out[off] = now.every((v) => v === 0xFF) ? null : now.slice();
    }
    return out;
  }

  publish() {
    const ex = this.ex, mem = ex.memory.buffer;
    const msg = { type: "frame" };
    let leds;
    if (this.choralroot) {
      leds = [0, 0, 0, 0];
      const levels = new Uint8Array(mem, ex.web_leds(), 42);
      for (let i = 0; i < 41; i++) {
        const dim = levels[i] !== 2, word = (i < 27 ? 1 : 0) + (dim ? 2 : 0), bit = i < 27 ? i : i - 27;
        if (levels[i]) leds[word] |= 1 << bit;
      }
      if (levels[41]) leds[0] |= 1 << 14; // PLAY's separate green LED.
    } else leds = [ex.web_lit_buttons() >>> 0, ex.web_lit_keys() >>> 0, ex.web_dim_buttons() >>> 0, ex.web_dim_keys() >>> 0];
    const key = leds.join(",");
    if (key !== this.sentLeds) {
      this.sentLeds = key;
      msg.leds = leds;
    }
    if (this.frames >= 44100) {
      msg.load = Math.round(100 * this.busy / (this.frames / 44.1));
      this.busy = this.frames = 0;
    }
    const transfer = [];
    const draws = this.choralroot ? ex.web_lcd_writes() : ex.web_screen_draws();
    if (draws !== this.sentDraws) {
      this.sentDraws = draws;
      msg.fb = new Uint16Array(mem, this.choralroot ? ex.web_fb() : ex.web_screen(), 240 * 240).slice();
      transfer.push(msg.fb.buffer);
    }
    const writes = this.writes(ex);
    if (writes !== this.sentWrites) {               // a save is done within one main-loop pass: whole here
      this.sentWrites = writes;
      msg.sectors = this.changedSectors();
    }
    if (msg.leds || msg.fb || msg.sectors || msg.load !== undefined) this.port.postMessage(msg, transfer);
  }

  // A tap's down and up can arrive within one render quantum, but the FM-1's contacts never close for less
  // than its debounce: each change of the buttons or the keys stays HOLD_MS of device time.
  input() {
    const ex = this.ex, now = this.choralroot ? ex.web_ms() : ex.web_now_ms();
    while (this.queue.length && now - this.nextOk >= 0) {
      const m = this.queue.shift();
      if (m.type === "buttons") ex.web_buttons(m.mask >>> 0);
      else ex.web_keys(m.mask >>> 0);
      this.nextOk = now + HOLD_MS;
    }
  }

  process(inputs, outputs) {
    const ex = this.ex;
    if (!ex) return true;
    if (this.queue.length) this.input();
    const out = outputs[0], n = out[0].length;
    const t0 = clock();
    ex.web_render(n);
    this.busy += clock() - t0;
    this.frames += n;
    out[0].set(new Float32Array(ex.memory.buffer, ex.web_out_l(), n));
    if (out[1]) out[1].set(new Float32Array(ex.memory.buffer, ex.web_out_r(), n));
    if (currentTime - this.lastFrame >= 1 / 30) {
      this.lastFrame = currentTime;
      this.publish();
    }
    return true;
  }
}

registerProcessor("flash-firmware", FlashFirmware);
