// SPDX-License-Identifier: GPL-3.0-only
// Loop import UI adapted from charlesvestal/fm1-x0x (GPL-3.0-only).
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
async function slotSend(k) { if (FW.loops && node) await reboot(); }
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
let slotsReady;
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
  slotsReady = slotsLoad().then(() => [0, 1, 2].forEach((k) => slotDraw(k)));
})();


