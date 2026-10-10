// SPDX-License-Identifier: GPL-3.0-only
// Switching on the chosen firmware (firmwares.js), after X0X's own switchOn: its wasm in its worklet,
// the saved state handed back before boot, then the screen, the LEDs and new saves coming back.

// ---------------------------------------------------------------- the flash of Felucca-style firmwares
// IndexedDB "fm1-flash": key [firmware, sector offset] -> 4 KiB (too big for localStorage).
function flashDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("fm1-flash", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("sectors");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const flashRange = () => IDBKeyRange.bound([FW_ID, 0], [FW_ID, Infinity]);
async function flashLoad() {
  try {
    const db = await flashDb(), out = {};
    await new Promise((res) => {
      const q = db.transaction("sectors").objectStore("sectors").openCursor(flashRange());
      q.onsuccess = () => {
        const c = q.result;
        if (!c) return res();
        out[c.key[1]] = c.value;
        c.continue();
      };
      q.onerror = () => res();
    });
    return out;
  } catch { return {}; }                                  // no IndexedDB: this session only
}
async function flashSave(sectors) {                      // {offset: bytes, or null once erased}
  try {
    const st = (await flashDb()).transaction("sectors", "readwrite").objectStore("sectors");
    for (const [off, bytes] of Object.entries(sectors)) {
      if (bytes) st.put(bytes, [FW_ID, +off]);
      else st.delete([FW_ID, +off]);
    }
  } catch { /* this session only */ }
}
async function flashForget() {
  try {
    const st = (await flashDb()).transaction("sectors", "readwrite").objectStore("sectors");
    await new Promise((res) => { const q = st.delete(flashRange()); q.onsuccess = q.onerror = () => res(); });
  } catch {}
}

// ---------------------------------------------------------------- switching on
// The firmware loads with the page. Browsers start sound only from a user's tap, so the audio clock (which
// drives the firmware) waits for the first touch anywhere: that touch also plays the control it lands on.
const status = document.getElementById("status"), cpu = document.getElementById("cpu");
const hint = document.getElementById("screen-hint");
const PLAY_GREEN = 14;                                   // Felucca: PLAY lit green (playing)
let soundStarted = false, userPaused = false;            // (mobile.js: updates wait for an untouched page)
function showLights(lit, keysLit, keysDim, buttonsDim = 0) {
  if (lit & (1 << PLAY_GREEN)) lit |= 1 << BTN.PLAY;
  drawLights(lit, keysLit, keysDim);
  for (const b of Object.values(buttons)) b.g.classList.toggle("dim", !(lit & (1 << b.bit)) && !!(buttonsDim & (1 << b.bit)));
}
function showHint(text, error = false) {
  hint.hidden = !text;
  hint.textContent = text || "";
  hint.classList.toggle("error", error);
}
const UNLOCK = ["pointerdown", "pointerup", "touchend", "keydown", "click"];   // whichever this browser accepts
function unlock() { if (audioContext && !userPaused) audioContext.resume().catch(() => {}); }
function armUnlock(on) {
  for (const type of UNLOCK) (on ? addEventListener : removeEventListener)(type, unlock, true);
}
function soundState() {
  const running = audioContext && audioContext.state === "running";
  document.querySelector(".app-shell").classList.toggle("running", !!running);
  if (running) {
    soundStarted = true;
    armUnlock(false);
    showHint("");
    status.textContent = "Sound on";
  } else if (!userPaused) {                              // not started yet, or iOS interrupted it (a call)
    armUnlock(true);
    showHint("Tap anywhere to start the sound");
    status.textContent = "Waiting for a tap";
  }
}
async function switchOn() {
  showHint(`Loading ${FW.name}…`);
  try {
    if (!window.isSecureContext || !window.AudioWorkletNode) throw new Error("Sound needs HTTPS (or localhost)");
    if (navigator.audioSession) navigator.audioSession.type = "playback";   // iOS: play with the silent switch on
    const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });
    audioContext = ac;
    const [wasm, saved] = await Promise.all([
      fetch(FW.wasm).then((r) => { if (!r.ok) throw new Error(`${FW.wasm}: ${r.status}`); return r.arrayBuffer(); }),
      FW.kind === "flash" ? flashLoad() : loadStore(),
      ac.audioWorklet.addModule(FW.worklet)]);
    node = new AudioWorkletNode(ac, FW.processor, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    node.connect(ac.destination);
    const ready = new Promise((res, reject) => {
      const timer = setTimeout(() => reject(new Error("The firmware did not answer")), 15000);
      node.port.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") { clearTimeout(timer); res(); }
        else if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }
        else if (m.type === "frame") {
          if (m.fb) drawScreen(m.fb);
          if (m.leds) showLights(m.leds[0], m.leds[1], m.leds[3], m.leds[2]);
          else if (m.buttons !== undefined) showLights(m.buttons, m.keys, m.dim);
          if (m.load !== undefined) cpu.textContent = `${FW.name} ${FW.version} · audio thread load: ${m.load}%`;
          if (m.store) saveStore(m.store);
          if (m.sectors) flashSave(m.sectors);
        }
      };
    });
    const load = FW.kind === "flash" ? { sectors: saved } : { store: saved };
    node.port.postMessage({ type: "load", wasm, master, ...load }, [wasm]);
    await ready;
    if (FW.loops) [0, 1, 2].forEach((k) => { if (slots[k]) slotSend(k); });   // the loops kept in this browser
    document.getElementById("audio-toggle").hidden = false;
    syncButtons(); syncKeys();
    ac.onstatechange = soundState;
    soundState();
    unlock();                                            // (already allowed when the page was opened by a tap)
  } catch (err) {
    if (audioContext) await audioContext.close().catch(() => {});
    audioContext = null; node = null;
    status.textContent = "Could not start";
    showHint(err && err.message || String(err), true);
  }
}
switchOn();
document.getElementById("reset").addEventListener("click", async (event) => {
  const reset = event.currentTarget;
  if (reset.dataset.armed) {
    if (FW.kind === "flash") await flashForget();
    else try { localStorage.removeItem(STORE_KEY); } catch {}
    location.reload();
  } else {
    reset.dataset.armed = "1";
    reset.textContent = `Tap again to erase ${FW.name}'s saved work`;
  }
});

// ---------------------------------------------------------------- choosing the firmware (Menu)
(function firmwareMenu() {
  const list = document.getElementById("firmwares");
  for (const [id, f] of Object.entries(FIRMWARES)) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "firmware";
    row.setAttribute("aria-pressed", String(id === FW_ID));
    row.innerHTML = `<span class="firmware-name"></span><span class="firmware-about"></span><span class="firmware-by"></span>`;
    row.querySelector(".firmware-name").textContent = `${f.name} ${f.version || ""}`.trim();
    row.querySelector(".firmware-about").textContent = f.about;
    row.querySelector(".firmware-by").textContent = f.by;
    row.addEventListener("click", () => {
      if (id === FW_ID) return;
      try { localStorage.setItem(FIRMWARE_KEY, id); } catch {}
      location.reload();
    });
    list.append(row);
  }
  for (const el of document.querySelectorAll(".fw-tag")) el.textContent = FW.tag;
  document.querySelector(".breaks").hidden = !FW.loops;
  const manual = document.getElementById("fw-manual"), source = document.getElementById("fw-source");
  manual.href = FW.manual;
  manual.textContent = `${FW.name} manual`;
  source.href = FW.repo;
  source.textContent = `${FW.name} on GitHub`;
  document.getElementById("fw-archive").href = FW.archive;
  document.getElementById("reset").textContent = `Erase ${FW.name}'s saved work`;
})();
