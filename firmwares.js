// SPDX-License-Identifier: GPL-3.0-only
// The firmwares this page runs: each is that firmware's own C code built for the browser (firmware/build.sh).
// "store" ones (X0X's lineage) keep numbered save objects in localStorage; "flash" ones (Felucca's lineage)
// keep the sectors of a simulated NOR flash in IndexedDB. The choice is kept per browser; switching reloads.
"use strict";
const FIRMWARES = {
  x0x: {
    name: "X0X", tag: "X0X", by: "Charles Vestal", repo: "https://github.com/charlesvestal/fm1-x0x",
    about: "Drum machine and acid bass line: 909 and 808 drums, a 303, breaks.",
    manual: "https://charlesvestal.github.io/fm1-x0x/manual/",
    kind: "store", wasm: "fw/x0x/x0x.wasm", worklet: "fw/x0x/worklet.js", processor: "x0x",
    store: "x0x-emu-store", loops: true, masterMax: 4096, masterDefault: 2800,
  },
  felucca: {
    name: "Felucca", tag: "FELUCCA", by: "Leo Kuroshita, Hügelton Instruments", repo: "https://github.com/hugelton/Felucca",
    about: "Multi-engine synthesizer: thirteen engines, four tracks, a 64-step sequencer.",
    manual: "https://github.com/hugelton/Felucca#readme",
    kind: "flash", wasm: "fw/felucca/felucca.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "felucca", masterMax: 1023, masterDefault: 700,
  },
  sloop: {
    name: "SLOOP", tag: "SLOOP", by: "isod89, after Felucca", repo: "https://github.com/isod89/sloop-fm1",
    about: "Live groovebox: three synths and a drum machine, song mode, physical models.",
    manual: "https://github.com/isod89/sloop-fm1/blob/main/GUIDE.md",
    kind: "flash", wasm: "fw/sloop/sloop.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "sloop", masterMax: 1023, masterDefault: 700,
  },
  fimba: {
    name: "FiMba-1", tag: "FIMBA", by: "Adam Sowers", repo: "https://github.com/jadamsowers/fm1-fimba",
    about: "A kalimba: modelled tines on a body, thumb-roll chords, mbira patterns.",
    manual: "https://github.com/jadamsowers/fm1-fimba#readme",
    kind: "store", wasm: "fw/fimba/kalimba.wasm", worklet: "fw/fimba/worklet.js", processor: "kalimba",
    store: "fimba-emu-store", masterMax: 4096, masterDefault: 2800,
  },
  melodee: {
    name: "Melodee", tag: "MELODEE", by: "keremimo, after Felucca", repo: "https://github.com/keremimo/melodee",
    about: "Multi-engine synth and sequencer: CZ-1, six-operator FM, Prophet, microtonal scales.",
    manual: "https://github.com/keremimo/melodee#readme",
    kind: "flash", wasm: "fw/melodee/melodee.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "melodee", masterMax: 1023, masterDefault: 700,
  },
  amb: {
    name: "AMB-1", tag: "AMB-1", by: "Charles Vestal", repo: "https://github.com/charlesvestal/fm1-amb",
    about: "Generative ambient: breathing voices, bells on unequal tape loops, a gliding bass.",
    manual: "https://charlesvestal.github.io/fm1-amb/manual/",
    kind: "store", wasm: "fw/amb/amb.wasm", worklet: "fw/amb/worklet.js", processor: "fm1",
    store: "amb-emu-store", masterMax: 4096, masterDefault: 2800,
  },
  hyp1: {
    name: "HYP-1", tag: "HYP-1", by: "RedtailWorks, after AMB-1", repo: "https://github.com/RustyPawz/fm1-HYP1",
    about: "Hypnotic techno and acid: generative voices, a 303 line and drums you sequence.",
    manual: "https://rustypawz.github.io/fm1-HYP1/manual/",
    kind: "store", wasm: "fw/hyp1/hyp1.wasm", worklet: "fw/hyp1/worklet.js", processor: "amb",
    store: "hyp1-emu-store", masterMax: 4096, masterDefault: 2800,
  },
  ghoulbox: {
    name: "GHOULBOX", tag: "GHOULBOX", by: "Jason Persinger, after Felucca", repo: "https://github.com/jasonpersinger/ghoulbox-fm1-dungeon-synth",
    about: "Dungeon synth: cathedral reverb, tape, choirs, organs and a hurdy-gurdy.",
    manual: "https://github.com/jasonpersinger/ghoulbox-fm1-dungeon-synth#readme",
    kind: "flash", wasm: "fw/ghoulbox/ghoulbox.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "ghoulbox", more: true, masterMax: 1023, masterDefault: 700,
  },
  choralroot: {
    name: "ChoralRoot", tag: "CHORALROOT", by: "Quixotic7", repo: "https://github.com/Quixotic7/ChoralRootFM1",
    about: "An Orchid-style chord instrument: roots, chord shapes, voicings, bass and a looper.",
    manual: "https://github.com/Quixotic7/ChoralRootFM1#readme",
    kind: "flash", wasm: "fw/choralroot/choralroot.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "choralroot", more: true, masterMax: 1023, masterDefault: 700,
  },
  maku: {
    name: "MAKU", tag: "MAKU", by: "okumurari", repo: "https://github.com/okumurari2/maku",
    about: "An always-on ambience machine: four parts, random worlds, drift and saved favourites.",
    manual: "https://github.com/okumurari2/maku/blob/main/AMBIENT.md",
    kind: "flash", wasm: "fw/maku/maku.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "maku", more: true, masterMax: 1023, masterDefault: 700,
  },
  jazzbox: {
    name: "Jazz Box", tag: "JAZZ BOX", by: "hb3p8, after Reytian's MIN-1", repo: "https://github.com/hb3p8/fm1-mobile-emu/tree/jazz-box-source",
    about: "Experimental and work in progress. Jazz chord progressions, walking bass, drums and live piano keys.",
    manual: "https://github.com/hb3p8/fm1-mobile-emu/blob/jazz-box-source/README.md",
    kind: "store", wasm: "fw/jazzbox/jazzbox.wasm", worklet: "fw/jazzbox/worklet.js", processor: "min",
    store: "jazzbox-emu-store", more: true, masterMax: 4096, masterDefault: 2800,
  },
  min1: {
    name: "MIN-1", tag: "MIN-1", by: "Reytian", repo: "https://github.com/Reytian/fm1-min1",
    about: "A minimalist ensemble inspired by Philip Glass: four models, twenty pieces and live chords.",
    manual: "https://github.com/Reytian/fm1-min1#readme",
    kind: "store", wasm: "fw/min1/min1.wasm", worklet: "fw/min1/worklet.js", processor: "min",
    store: "min1-emu-store", more: true, masterMax: 4096, masterDefault: 2800,
  },
  tonitor: {
    name: "Tonitor", tag: "TONITOR", by: "Nuno Zimas", repo: "https://github.com/nzimas/tonitor",
    about: "Six tracks of electroacoustic textures: eight sound engines, free loopers, grains and reverb.",
    manual: "https://nzimas.github.io/tonitor/manual.html",
    kind: "flash", wasm: "fw/tonitor/tonitor.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "tonitor", more: true, masterMax: 1023, masterDefault: 700,
  },
  dub: {
    name: "DUB-1", tag: "DUB-1", by: "sbegueria", repo: "https://github.com/sbegueria/fm1-dub",
    about: "Generative dub techno: chord stabs, tape echo, FM pings, sub bass and drums.",
    manual: "https://github.com/sbegueria/fm1-dub#readme",
    kind: "store", wasm: "fw/dub/dub.wasm", worklet: "fw/dub/worklet.js", processor: "amb",
    store: "dub-emu-store", more: true, masterMax: 4096, masterDefault: 2800,
  },
  kawa: {
    name: "KAWA", tag: "KAWA", by: "Omnipotard (Guizmoh)", repo: "https://github.com/Guizmoh/Kawa-Tracker-Fm1",
    about: "A six-track chiptune and IDM tracker: chip waves, FM, breaks, song chains and 32 live effects.",
    manual: "https://guizmoh.github.io/Kawa-Tracker-Fm1/manual/",
    kind: "store", wasm: "fw/kawa/kawa.wasm", worklet: "fw/kawa/worklet.js", processor: "kawa",
    store: "kawa-emu-store", more: true, masterMax: 4096, masterDefault: 2800,
  },
  caravel: {
    name: "Caravel", tag: "CARAVEL", by: "BonszaiMusic, after Felucca", repo: "https://github.com/bonszaimusic/caravel",
    about: "Multi-engine synthesis with SEM, HADES and DRONE voices, pair morphing and performance macros.",
    manual: "https://github.com/bonszaimusic/caravel#readme",
    kind: "flash", wasm: "fw/caravel/caravel.wasm", worklet: "fw/flash-worklet.js", processor: "flash-firmware",
    store: "caravel", more: true, masterMax: 1023, masterDefault: 700,
  },
  frasil: {
    name: "FRASIL", tag: "FRASIL", by: "Styves Goupil", repo: "https://github.com/styvesgoupil/frasil",
    about: "Layered ambient drones, FM glints and a bass sequencer, with shimmer, freeze and scene morphing.",
    manual: "https://frasilsynth.com/guide/",
    kind: "store", wasm: "fw/frasil/frasil.wasm", worklet: "fw/frasil/worklet.js", processor: "fm1",
    store: "frasil-emu-store", more: true, masterMax: 4096, masterDefault: 2800,
  },
};
for (const [id, build] of Object.entries(FIRMWARE_BUILDS)) Object.assign(FIRMWARES[id], build);   // version, commit
const FIRMWARE_KEY = "fm1-firmware";
let FW_ID = "x0x";
try { if (FIRMWARES[localStorage.getItem(FIRMWARE_KEY)]) FW_ID = localStorage.getItem(FIRMWARE_KEY); } catch {}
const FW = FIRMWARES[FW_ID];
const MASTER_MAX = FW.masterMax, MASTER_DEFAULT = FW.masterDefault, MASTER_STEP = FW.masterMax / 64;
