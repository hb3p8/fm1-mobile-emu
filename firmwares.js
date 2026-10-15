// SPDX-License-Identifier: GPL-3.0-only
// Seven pinned hardware packages, plus the complete upstream catalog under More.
"use strict";
const PRIMARY_FIRMWARES = {
  x0x: {
    name: "X0X", tag: "X0X", by: "Charles Vestal", repo: "https://github.com/charlesvestal/fm1-x0x",
    about: "Drum machine and acid bass line: 909 and 808 drums, a 303, breaks.",
    manual: "https://charlesvestal.github.io/fm1-x0x/manual/", loops: true,
  },
  felucca: {
    name: "Felucca", tag: "FELUCCA", by: "Leo Kuroshita, Hügelton Instruments", repo: "https://github.com/hugelton/Felucca",
    about: "Multi-engine synthesizer: thirteen engines, four tracks, a 64-step sequencer.",
    manual: "https://github.com/hugelton/Felucca#readme",
  },
  sloop: {
    name: "SLOOP", tag: "SLOOP", by: "isod89, after Felucca", repo: "https://github.com/isod89/sloop-fm1",
    about: "Live groovebox: three synths and a drum machine, song mode, physical models.",
    manual: "https://github.com/isod89/sloop-fm1/blob/main/GUIDE.md",
  },
  fimba: {
    name: "FiMba-1", tag: "FIMBA", by: "Adam Sowers", repo: "https://github.com/jadamsowers/fm1-fimba",
    about: "A kalimba: modelled tines on a body, thumb-roll chords, mbira patterns.",
    manual: "https://github.com/jadamsowers/fm1-fimba#readme",
  },
  melodee: {
    name: "Melodee", tag: "MELODEE", by: "keremimo, after Felucca", repo: "https://github.com/keremimo/melodee",
    about: "Multi-engine synth and sequencer: CZ-1, six-operator FM, Prophet, microtonal scales.",
    manual: "https://github.com/keremimo/melodee#readme",
  },
  amb: {
    name: "AMB-1", tag: "AMB-1", by: "Charles Vestal", repo: "https://github.com/charlesvestal/fm1-amb",
    about: "Generative ambient: breathing voices, bells on unequal tape loops, a gliding bass.",
    manual: "https://charlesvestal.github.io/fm1-amb/manual/",
  },
  maku: {
    name: "MAKU", tag: "MAKU", by: "okumurari", repo: "https://github.com/okumurari2/maku",
    about: "An always-on ambience machine: four parts, random worlds, drift and saved favourites.",
    manual: "https://github.com/okumurari2/maku/blob/main/AMBIENT.md",
  },
};
for (const [id, build] of Object.entries(FIRMWARE_BUILDS)) Object.assign(PRIMARY_FIRMWARES[id], build);
const FIRMWARES = Object.fromEntries(FIRMWARE_CATALOG.map(f => [f.id, {
  ...f, tag: f.name, by: f.author, manual: f.installer || f.repo, remote: true,
}]));
Object.assign(FIRMWARES, PRIMARY_FIRMWARES);
FIRMWARES.local = { name: "Local firmware", tag: "LOCAL", by: "Opened on this device", local: true,
  about: "An FM-1 .fwsc update package opened from this device.", manual: "https://github.com/joakimeriksson/fm1-emu#readme" };
const FIRMWARE_KEY = "fm1-firmware";
let FW_ID = "x0x";
try {
  const chosen = new URLSearchParams(location.search).get("fw") || localStorage.getItem(FIRMWARE_KEY);
  if (FIRMWARES[chosen]) FW_ID = chosen;
} catch {}
const FW = FIRMWARES[FW_ID];
const MASTER_MAX = 1023, MASTER_DEFAULT = 700, MASTER_STEP = 16;
