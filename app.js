const FIRMWARE_BUILDS = {"x0x": {"version": "1.0.6", "commit": "47f8e4c4ad602591b81c21bc5480db7a94f6d6af", "archive": "src/x0x.tar.gz", "prerelease": false, "release": "https://github.com/charlesvestal/fm1-x0x/releases/tag/v1.0.6", "screenshot": "screenshots/x0x.png", "package": "packages/x0x.fwsc"}, "felucca": {"version": "1.6", "commit": "1727537624390cc3f9c7dff2456b43b3a8edb005", "archive": "src/felucca.tar.gz", "prerelease": false, "release": "https://github.com/hugelton/Felucca/releases/tag/v1.6", "screenshot": "screenshots/felucca.png", "package": "packages/felucca.fwsc"}, "sloop": {"version": "2.6", "commit": "d30d6553353373cf5506b9ed285fc4a2aa0c30ef", "archive": "src/sloop.tar.gz", "prerelease": false, "release": "https://github.com/isod89/sloop-fm1/releases/tag/v2.6", "screenshot": "screenshots/sloop.png", "package": "packages/sloop.fwsc"}, "fimba": {"version": "0.6.1", "commit": "0485ed0d387ce78216428c7b19f97d77bbe10b4d", "archive": "src/fimba.tar.gz", "prerelease": true, "release": "https://github.com/jadamsowers/fm1-fimba/releases/tag/v0.6.1", "screenshot": "screenshots/fimba.png", "package": "packages/fimba.fwsc"}, "melodee": {"version": "1.4.0-rc.1", "commit": "fbc69717d9855542f6b109616ab8b0ad28783777", "archive": "src/melodee.tar.gz", "prerelease": true, "release": "https://github.com/keremimo/melodee/releases/tag/v1.4.0-rc.1", "screenshot": "screenshots/melodee.png", "package": "packages/melodee.fwsc"}, "amb": {"version": "1.1", "commit": "7e4d497ab52b3d4e1d0e9a228bc302a6e25f018a", "archive": "src/amb.tar.gz", "prerelease": false, "release": "https://github.com/charlesvestal/fm1-amb/releases/tag/v1.1", "screenshot": "screenshots/amb.png", "package": "packages/amb.fwsc"}, "maku": {"version": "0.1", "commit": "db910aabfc979f172db87817eb9b377990ac2298", "archive": "src/maku.tar.gz", "prerelease": false, "release": "https://github.com/okumurari2/maku/releases/tag/v0.1", "screenshot": "screenshots/maku.png", "package": "packages/maku.fwsc"}};
const FIRMWARE_CATALOG = [{"id": "mvave", "name": "M-VAVE stock firmware", "version": "", "author": "M-VAVE", "license": "M-VAVE's own", "byo": true, "about": "The original DX7-style FM synth, with both CPU cores. Open your own FM-1.fwsc file; it stays on this device. Starts with the emulator's patch bank.", "download": "https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/firmware/FM-1.fwsc", "repo": "https://github.com/joakimeriksson/fm1-emu/blob/master/docs/stock-firmware.md"}, {"id": "felucca", "name": "Felucca", "version": "1.6.1", "author": "hugelton", "license": "GPL-3.0", "about": "The original open firmware: a four-operator FM synth with sequencer, arpeggiator and effects.", "repo": "https://github.com/hugelton/Felucca", "package": "https://hugelton.github.io/Felucca/firmware/felucca-1.6.1.fwsc", "installer": "https://hugelton.github.io/Felucca/webapp/installer/"}, {"id": "felucca-salt", "name": "Felucca [Salt]", "version": "0.9-salt14", "author": "ChanceTheMaker", "license": "GPL-3.0", "about": "A Felucca fork with its own sound and editor changes.", "repo": "https://github.com/ChanceTheMaker/Felucca", "package": "https://chancethemaker.github.io/Felucca/firmware/felucca-0.9-salt14.fwsc", "installer": "https://chancethemaker.github.io/Felucca/webapp/installer/"}, {"id": "amb", "name": "AMB-1", "version": "1.1", "author": "charlesvestal", "license": "GPL-3.0", "about": "A generative ambient machine inspired by Music for Airports.", "repo": "https://github.com/charlesvestal/fm1-amb", "package": "https://charlesvestal.github.io/fm1-amb/firmware/amb-1.1.fwsc", "installer": "https://charlesvestal.github.io/fm1-amb/install/"}, {"id": "april", "name": "April OS", "version": "BETA 1.1", "author": "beashoko", "license": "MIT (its repository, which holds the installer page; the firmware source is not published)", "about": "A sampler inspired by the Casio SK-1: no synth engines, only samples, recorded through the installer page's microphone bridge.", "repo": "https://github.com/beashoko/april-os", "installer": "https://beashoko.github.io/april-os/", "embedded": "DEFAULT_FIRMWARE"}, {"id": "choralroot", "name": "ChoralRoot", "version": "0.21", "author": "Quixotic7", "license": "GPL-3.0", "about": "A port of the Choral Root synth.", "repo": "https://github.com/Quixotic7/ChoralRootFM1", "package": "https://quixotic7.github.io/ChoralRootFM1/firmware/choralroot-0.21.fwsc", "installer": "https://quixotic7.github.io/ChoralRootFM1/"}, {"id": "ctl", "name": "CTL-1", "version": "0.9.2", "author": "charlesvestal", "license": "GPL-3.0", "about": "A MIDI controller: the keys play in a scale with its chords on the black keys, four banks of knobs, an arpeggiator and Euclidean drums, with General MIDI sounds of its own.", "repo": "https://github.com/charlesvestal/fm1-ctl", "package": "https://charlesvestal.github.io/fm1-ctl/firmware/ctl-usb-0.9.2.fwsc", "installer": "https://charlesvestal.github.io/fm1-ctl/install/"}, {"id": "etch", "name": "ETCH", "version": "1.38", "author": "SikkenWorks", "license": "GPL-3.0", "about": "Draw the sound: a waveform drawn and changed with the knobs, morphed into another one, and a third modulating the result. An experimental build.", "repo": "https://github.com/SikkenWorks/ETCH", "package": "https://raw.githubusercontent.com/SikkenWorks/ETCH/main/ETCH-FM1-V1.38-OTA-RESTORE-FIX-EXPERIMENTAL.fwsc"}, {"id": "fimba", "name": "FiMba-1", "version": "0.6.1", "author": "jadamsowers", "license": "GPL-3.0", "about": "A physically modelled kalimba (thumb piano), with mbira patterns, tape and grains. Built on Felucca, X0X and FoMni.", "repo": "https://github.com/jadamsowers/fm1-fimba", "package": "https://jadamsowers.github.io/fm1-fimba/firmware/fimba-0.6.1.fwsc", "manifest": "https://jadamsowers.github.io/fm1-fimba/firmware/latest.json", "installer": "https://jadamsowers.github.io/fm1-fimba/"}, {"id": "fm1doom", "name": "FM-1 Doom", "version": "0.5", "author": "zvenson", "license": "GPL-3.0", "about": "Doom on the FM-1: one arena from FreeDM, played on the keys and a knob, on the FM-1's screen, with synthesised sound effects and no music.", "repo": "https://github.com/zvenson/fm1doom", "package": "https://raw.githubusercontent.com/zvenson/dxsloop/main/docs/doom/firmware/fm1doom-0.5.fwsc"}, {"id": "fomni", "name": "FoMni", "version": "0.4", "author": "charlesvestal", "license": "GPL-3.0", "about": "A chord harp inspired by the Omnichord: hold a chord, strum the keys.", "repo": "https://github.com/charlesvestal/fm1-fomni", "package": "https://charlesvestal.github.io/fm1-fomni/firmware/omni-0.4.fwsc", "installer": "https://charlesvestal.github.io/fm1-fomni/"}, {"id": "fumi", "name": "FuMi-1", "version": "1.0.7", "author": "cartesive", "license": "GPL-3.0", "about": "Inspired by the Suiko ST-50 shigin conductor: koto and shakuhachi-style tones.", "repo": "https://github.com/cartesive/fumi-1", "package": "https://cartesive.github.io/fumi-1/firmware/fumi-1.0.7.fwsc", "installer": "https://cartesive.github.io/fumi-1/"}, {"id": "ghoulbox", "name": "GHOULBOX", "version": "2.1", "author": "jasonpersinger", "license": "GPL-3.0", "about": "Dungeon synth (a Felucca fork): cathedral reverb and dark drones.", "repo": "https://github.com/jasonpersinger/ghoulbox-fm1-dungeon-synth", "package": "https://ghoulbox.messy.quest/firmware/felucca-gb2.1.fwsc", "installer": "https://ghoulbox.messy.quest/webapp/installer/"}, {"id": "hortator", "name": "Hortator", "version": "0.16.0", "author": "DeadActive", "license": "GPL-3.0", "about": "A drum-focused firmware based on Felucca.", "repo": "https://github.com/DeadActive/hortator", "package": "https://deadactive.github.io/hortator/firmware/felucca-drum-0.16.0-f3d7e5a.fwsc", "installer": "https://deadactive.github.io/hortator/webapp/installer/"}, {"id": "jangada", "name": "Jangada", "version": "1.0", "author": "zednaked", "license": "GPL-3.0", "about": "Superwave analog voices and a modulation matrix.", "repo": "https://github.com/zednaked/jangada", "package": "https://zednaked.github.io/jangada/firmware/jangada-1.0.fwsc", "installer": "https://zednaked.github.io/jangada/webapp/installer/"}, {"id": "jiant", "name": "JIANT FM", "version": "0.7.2-e317df3", "author": "juanjiant-bit", "license": "GPL-3.0", "about": "A bio-synthetic groovebox: six tracks drawn as living beings, eight engines (FM6 with Dexed, analog, phase, voice), mutating macros and SLOOP's song mode. Still in development.", "repo": "https://github.com/juanjiant-bit/JIANT", "package": "https://juanjiant-bit.github.io/JIANT/firmware/felucca-v0.7.2-e317df3.fwsc", "installer": "https://juanjiant-bit.github.io/JIANT/webapp/installer/"}, {"id": "melodee", "name": "Melodee", "version": "1.3.6", "author": "keremimo", "license": "GPL-3.0", "about": "A melodic synth firmware (a Felucca fork) with dual-core audio.", "repo": "https://github.com/keremimo/melodee", "package": "https://keremimo.github.io/melodee/firmware/melodee-1.3.6.fwsc", "installer": "https://keremimo.github.io/melodee/webapp/installer/"}, {"id": "obervave", "name": "OberVave", "version": "1.3.1", "author": "zvenson", "license": "GPL-3.0", "about": "An eight-voice analog-style polysynth after the American polys of 1979-84: two oscillators a voice, sync, cross-mod, a morphing filter, an arpeggiator, a sequencer, chorus, delay and plate reverb.", "repo": "https://github.com/zvenson/obervave", "package": "https://raw.githubusercontent.com/zvenson/obervave/main/docs/firmware/obervave-1.3.1.fwsc"}, {"id": "orbit", "name": "ORBIT", "version": "0.7.1", "author": "dspaudio", "license": "GPL-3.0", "about": "A four-track groovebox based on SLOOP: three synth parts and a drum machine, an event tape to rearrange them, OP-1-inspired screens.", "repo": "https://github.com/dspaudio/orbit", "package": "https://dspaudio.github.io/orbit/firmware/orbit-0.7.1.fwsc", "manifest": "https://dspaudio.github.io/orbit/manifest.json", "installer": "https://dspaudio.github.io/orbit/"}, {"id": "polly", "name": "Polly", "version": "0.4.3", "author": "charlesvestal", "license": "GPL-3.0", "about": "A pocket arranger after the Yamaha QY70: pick a style, play a chord and a band of eight follows, with General MIDI sounds.", "repo": "https://github.com/charlesvestal/fm1-polly", "package": "https://charlesvestal.github.io/fm1-polly/firmware/polly-0.4.3.fwsc", "installer": "https://charlesvestal.github.io/fm1-polly/"}, {"id": "purplemonkey", "name": "PurpleMonkey", "version": "0.11", "author": "Quixotic7", "license": "GPL-3.0", "about": "A firmware for kids.", "repo": "https://github.com/Quixotic7/PurpleMonkeyFM1", "package": "https://quixotic7.github.io/PurpleMonkeyFM1/firmware/purplemonkey-0.11.fwsc", "installer": "https://quixotic7.github.io/PurpleMonkeyFM1/webapp/installer/"}, {"id": "quest", "name": "FM1 Quest", "version": "0.21", "author": "hericdk", "license": "GPL-3.0", "about": "A live RPG adventure inside the synth.", "repo": "https://github.com/hericdk/fm1-quest", "package": "https://fm1.quest/firmware/fm1-quest-0.21.fwsc", "installer": "https://fm1.quest/webapp/installer/"}, {"id": "rainbow", "name": "Rainbow mode", "version": "1.1.5-rb", "author": "joshbartlettband-web", "license": "GPL-3.0", "about": "A music toy for little hands (a Felucca fork).", "repo": "https://github.com/joshbartlettband-web/felucca-rainbow", "package": "https://joshbartlettband-web.github.io/felucca-rainbow/firmware/felucca-1.1.5-rb.fwsc", "installer": "https://joshbartlettband-web.github.io/felucca-rainbow/webapp/installer/"}, {"id": "sid", "name": "FM-1 SID", "version": "0.1", "author": "joakimeriksson", "license": "GPL-3.0", "about": "Commodore 64 SID synth: twelve instruments, filter and envelope controls, chorus, delay and reverb. HOME opens the C64 tune player.", "repo": "https://github.com/joakimeriksson/fm1-emu/tree/master/fm1-sid", "package": "https://joakimeriksson.github.io/fm1-emu/fm1-sid/sidplayer.fwsc"}, {"id": "skiff", "name": "Skiff", "version": "1.1", "author": "illuminus5", "license": "GPL-3.0", "about": "A six-track groovebox built on Felucca 1.1.5: fourteen synth and drum engines, a 64-step sequencer with chords, ratchets and locks, songs and a performance layer.", "repo": "https://github.com/illuminus5/skiff", "package": "https://illuminus5.github.io/skiff/firmware/skiff-1.1.fwsc", "installer": "https://illuminus5.github.io/skiff/webapp/installer/"}, {"id": "sloop", "name": "SLOOP", "version": "2.6", "author": "isod89", "license": "GPL-3.0", "about": "A live groovebox: four looping tracks.", "repo": "https://github.com/isod89/sloop-fm1", "package": "https://isod89.github.io/sloop-fm1/firmware/sloop-2.6.fwsc", "installer": "https://isod89.github.io/sloop-fm1/webapp/installer/"}, {"id": "sloop-alg", "name": "SLOOP ALG", "version": "ALG05-TEST", "author": "shaw-core", "license": "none stated (a SLOOP fork)", "about": "A SLOOP test build with extra FM algorithms.", "repo": "https://github.com/shaw-core/Sloop_ALG02", "package": "https://shaw-core.github.io/Sloop_ALG02/firmware/sloop-ALG05-TEST.fwsc", "installer": "https://shaw-core.github.io/Sloop_ALG02/webapp/installer/"}, {"id": "sloop-banks", "name": "SLOOP DX7 Banks", "version": "2.3", "author": "majnikool", "license": "GPL-3.0", "about": "SLOOP with up to twelve DX7 voice banks and presets grouped by kind. Test builds.", "repo": "https://github.com/majnikool/sloop-fm1", "package": "https://raw.githubusercontent.com/majnikool/sloop-fm1/main/docs/firmware/sloop-2.3.fwsc"}, {"id": "sloop-floyd", "name": "SLOOP Floyd FM", "version": "2.4.1", "author": "renebohne", "license": "GPL-3.0", "about": "SLOOP with a four-operator FM engine after Floyd Steinberg's 4-OP idea: an envelope per operator and a live oscilloscope that draws the envelopes as you play.", "repo": "https://github.com/renebohne/sloop-fm1", "package": "https://raw.githubusercontent.com/renebohne/sloop-fm1/main/docs/firmware/sloop-2.4.1.fwsc"}, {"id": "sloopdx", "name": "sloopDX", "version": "3.5", "author": "zvenson", "license": "GPL-3.0", "about": "SLOOP's live workflow with a six-operator DX7 engine from Dexed: 32 algorithms, your own .syx banks, every voice edited on the FM-1, and FM drums.", "repo": "https://github.com/zvenson/dxsloop", "package": "https://raw.githubusercontent.com/zvenson/dxsloop/main/docs/firmware/sloopdx-3.5.fwsc"}, {"id": "tribe", "name": "TRIBE", "version": "0.1-beta", "author": "apiel", "license": "GPL-3.0", "about": "A ten-track groovebox built on X0X where any engine plays on any track: kicks, 909 and 808 voices, a 303, sixteen clips a track and scatter effects.", "repo": "https://github.com/apiel/fm1-tribe", "package": "https://apiel.github.io/fm1-tribe/firmware/tribe-0.1-beta.fwsc", "installer": "https://apiel.github.io/fm1-tribe/"}, {"id": "waveloop", "name": "WaveLoop Kit", "version": "1.0.5.2-midi23", "author": "ELI7VH", "license": "GPL-3.0", "about": "A Felucca mod: standalone Arturia MiniLab 3 control, fine track mixing, a DJ filter, momentary effects and MIDI feedback.", "repo": "https://github.com/ELI7VH/Felucca", "package": "https://eli7vh.github.io/Felucca/firmware/felucca-1.0.5.2-midi23.fwsc", "installer": "https://eli7vh.github.io/Felucca/webapp/installer/"}, {"id": "winampfm", "name": "winampFM Synth", "version": "0.12", "author": "hericdk", "license": "GPL-3.0", "about": "Winamp 2.x on the FM-1, built on SLOOP: your sounds as a playlist, four tracks recorded as loops, effects on sliders and a visualizer of lines.", "repo": "https://github.com/hericdk/winampFM", "package": "https://hericdk.github.io/winampFM/release/winampfm-0.12.fwsc"}, {"id": "x0x", "name": "X0X", "version": "1.0.9", "author": "charlesvestal", "license": "GPL-3.0", "about": "A groovebox: 909, 808, two 303s and a break player. Pick a drum with a black key, set steps with the white keys, then PLAY.", "repo": "https://github.com/charlesvestal/fm1-x0x", "package": "https://charlesvestal.github.io/fm1-x0x/firmware/x0x-1.0.9.fwsc", "installer": "https://charlesvestal.github.io/fm1-x0x/install/"}, {"id": "zp12", "name": "zp12", "version": "2.4.2", "author": "zvenson", "license": "GPL-3.0", "about": "A 12-bit sampling drum machine after the E-mu SP-1200: 32 pads at 26 kHz with no interpolation, filtered channels on the knobs, loops and songs.", "repo": "https://github.com/zvenson/zp12", "package": "https://raw.githubusercontent.com/zvenson/zp12/main/docs/install/firmware/zp12-2.4.2.fwsc"}];
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

// SPDX-License-Identifier: GPL-3.0-only
// Button bits keep the mobile panel mapping; encoders use the physical matrix IDs of fm1-emu.
"use strict";
const BTN = { FX:0, SEL:1, ENV:2, LFO:3, EDIT:4, GLO:5, HOME:6, SAVE:7, ARP:8, SEQ:9, PLAY:10, REC:11, "OCT-":12, "OCT+":13 };
const ENC = { SELECT:0, ALGORITHM:1, PRESETS:6, KNOB1:2, KNOB2:3, KNOB3:4, KNOB4:5 };
const WHITE_K = [0,2,4,6,7,9,11,12,14,16,18,19,21,23,24,26];
const BLACK_K = [1,3,5,8,10,13,15,17,20,22,25];
const BLACK_AFTER = [0,1,2,4,5,7,8,9,11,12,14];
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

// Resize only geometry; the worklet and active pattern survive device rotation. The screen stays square: in
// landscape as tall as the space (but leaving the controls on the right 40% of the width on squarish screens
// such as tablets), in portrait as wide. It snaps down to a whole multiple of 240 device pixels when that
// costs at most a tenth of its size: every firmware pixel then covers the same number of the display's
// (with Menu > Screen smoothing off, square blocks of them: screen.js samples the nearest pixel).
const BEZEL = 3;                                          /* .screen-bezel's padding */
const screenPanel = document.getElementById("screen-panel"), screenBezel = document.getElementById("screen-bezel");
const mainPanel = document.querySelector(".panel-main");
function screenSize(room) {
  const dpr = window.devicePixelRatio || 1, k = Math.floor(room * dpr / 240), whole = k * 240 / dpr;
  return k >= 1 && whole >= room * .9 ? whole : Math.max(120, Math.floor(room));
}
function resizePanel() {
  const landscape = matchMedia("(orientation: landscape)").matches, style = getComputedStyle(screenPanel);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const height = screenPanel.clientHeight - padY;
  const width = landscape ? Math.min(height, device.clientWidth - mainPanel.offsetWidth - 2 - Math.max(260, device.clientWidth * .4) - padX)
                          : screenPanel.clientWidth - padX;
  const size = screenSize(Math.min(width, height) - 2 * BEZEL) + 2 * BEZEL;
  screenBezel.style.setProperty("--screen-size", `${size}px`);
  if (landscape) device.style.setProperty("--screen-col", `${size + padX}px`);
  else device.style.removeProperty("--screen-col");
  requestAnimationFrame(alignScreen);
}
// Centring can leave the canvas half a device pixel off the display's grid, and the compositor would then
// resample it: shift it onto the grid, so its device-pixel-sized drawing buffer lands 1:1 on the display.
const screenCanvas = document.getElementById("screen");
function alignScreen() {
  const dpr = window.devicePixelRatio || 1;
  screenBezel.style.translate = "";
  const r = screenCanvas.getBoundingClientRect();
  const dx = Math.round(r.left * dpr) / dpr - r.left, dy = Math.round(r.top * dpr) / dpr - r.top;
  if (Math.abs(dx) > .001 || Math.abs(dy) > .001) screenBezel.style.translate = `${dx}px ${dy}px`;
}
const panelObserver = new ResizeObserver(resizePanel);
panelObserver.observe(screenPanel); panelObserver.observe(device);
panelObserver.observe(mainPanel);                         /* (its width moves the screen: labels in a late font) */
document.fonts?.ready.then(() => requestAnimationFrame(alignScreen));
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

let audioContext = null;
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


// SPDX-License-Identifier: GPL-3.0-only
// Real on-device formats, for carrying saved work and loops from the former source ports.
// Object headers and sample format: charlesvestal/fm1-x0x, firmware/src/storage.c and tools/sampleio.py.
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (~c) >>> 0;
}

function legacyObjects(id, objects) {
  const bases = id === "x0x" ? [0xfc000, 0x97000, 0x99000, 0x9b000, 0xdc000, 0x9d000, 0xde000] : [0xfc000, 0xdc000];
  const sectors = {};
  for (const [key, b64] of Object.entries(objects)) {
    const obj = Number(key), base = bases[obj];
    if (base === undefined) continue;
    const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (data.length > 3840) continue;
    const b = new Uint8Array(4096).fill(255), v = new DataView(b.buffer);
    v.setUint32(0, 0x30583058, true); v.setUint16(4, obj, true); v.setUint16(6, 0, true);
    v.setUint32(8, 1, true); v.setUint32(12, data.length, true); v.setUint32(16, crc32(data), true);
    v.setUint32(28, crc32(b.subarray(0, 28)), true); b.set(data, 256);
    sectors[base] = b;
  }
  return sectors;
}

const IMA_STEP = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,
  97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,
  963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,
  5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const IMA_INDEX = [-1,-1,-1,-1,2,4,6,8];
function imaEncode(pcm) {
  let pred = 0, idx = 0;
  const out = new Uint8Array(Math.ceil(pcm.length / 2));
  for (let i = 0; i < pcm.length; i++) {
    let diff = pcm[i] - pred, code = diff < 0 ? 8 : 0, step = IMA_STEP[idx], delta = step >> 3;
    diff = Math.abs(diff);
    for (let bit = 4; bit; bit >>= 1, step >>= 1) if (diff >= step) { code |= bit; diff -= step; delta += step; }
    pred = Math.max(-32768, Math.min(32767, pred + (code & 8 ? -delta : delta)));
    idx = Math.max(0, Math.min(88, idx + IMA_INDEX[code & 7]));
    out[i >> 1] |= code << ((i & 1) * 4);
  }
  return out;
}

function loopSectors(k, slot) {
  const image = new Uint8Array(0x14000).fill(255), sectors = {};
  if (slot && slot.zones.length) {
    image.fill(0, 0, 512);
    const v = new DataView(image.buffer);
    v.setUint32(0, 0x504d5346, true); v.setUint16(4, 1, true); image[6] = slot.zones.length;
    for (let i = 0; i < Math.min(8, slot.name.length); i++) image[8 + i] = slot.name.charCodeAt(i) & 127;
    let used = 0;
    slot.zones.forEach((z, i) => {
      const data = imaEncode(z.pcm), p = 32 + i * 28;
      if (512 + used + data.length > image.length || i >= 16) throw new Error("Loop slot is too large");
      v.setUint32(p, used, true); v.setUint32(p + 4, z.pcm.length, true);
      v.setUint32(p + 8, 0, true); v.setUint32(p + 12, z.pcm.length - 1, true);
      v.setUint32(p + 16, Math.round(z.rate / 44100 * 65536), true);
      v.setInt16(p + 20, 60 * 16, true); v.setInt16(p + 22, 0, true);
      image[p + 24] = 0; image[p + 25] = 0; image[p + 26] = 127;
      image.set(data, 512 + used); used += data.length;
    });
    v.setUint32(16, used, true); v.setUint32(20, crc32(image.subarray(512, 512 + used)), true);
  }
  for (let off = 0; off < image.length; off += 4096) sectors[0xa0000 + k * image.length + off] = image.slice(off, off + 4096);
  return sectors;
}

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



// SPDX-License-Identifier: GPL-3.0-only
// Hardware .fwsc packages run unchanged in joakimeriksson/fm1-emu's pi32v2 CPU emulator.
function emulatorDb() {
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open('fm1-hardware',1);
    q.onupgradeneeded=()=>{q.result.createObjectStore('states');q.result.createObjectStore('packages');};
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
}
async function kept(store,key,value) {
  const db=await emulatorDb();
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,value===undefined?'readonly':'readwrite'), st=tx.objectStore(store);
      const q=value===undefined?st.get(key):st.put(value,key);
      tx.oncomplete=()=>resolve(q.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  } finally {db.close();}
}
let stateKey=FW_ID, savedSectors={}, savePending=Promise.resolve(), flushResolve=null, packageBytes=null;
function persist(sectors) {
  if(!sectors)return;
  Object.assign(savedSectors,sectors);
  // Snapshot now: an asynchronous write for the previous firmware cannot acquire later state.
  const key=stateKey, snapshot={sectors:{...savedSectors}, migrated:true};
  savePending=savePending.then(()=>kept('states',key,snapshot)).catch(()=>{
    document.getElementById('save-status').textContent='Browser storage is unavailable; saved work lasts for this session.';
  });
}
async function legacySectors() {
  const oldStore={x0x:'x0x-emu-store',fimba:'fimba-emu-store',amb:'amb-emu-store'}[FW_ID];
  if(oldStore){try{return legacyObjects(FW_ID,JSON.parse(localStorage.getItem(oldStore)||'{}'));}catch{return {};}}
  if(!PRIMARY_FIRMWARES[FW_ID])return {};
  return new Promise(resolve=>{
    try{
      const q=indexedDB.open('fm1-flash',1);
      q.onupgradeneeded=()=>q.result.createObjectStore('sectors');q.onerror=()=>resolve({});
      q.onsuccess=()=>{
        const db=q.result,out={},tx=db.transaction('sectors');
        const cursor=tx.objectStore('sectors').openCursor(IDBKeyRange.bound([FW_ID,0],[FW_ID,Infinity]));
        cursor.onsuccess=()=>{const c=cursor.result;if(c){out[c.key[1]]=c.value;c.continue();}};
        tx.oncomplete=()=>{db.close();resolve(out);};tx.onerror=()=>{db.close();resolve({});};
      };
    }catch{resolve({});}
  });
}
async function restoreState() {
  const saved=await kept('states',stateKey).catch(()=>null);
  savedSectors=saved?.sectors || await legacySectors();
  // A marker also for an empty state: erasing it must not import the old saves again.
  persist({});await savePending;
  return {...savedSectors};
}
async function packageOf() {
  if(FW.local || FW.byo){
    const local=await kept('packages',FW.local?'local':FW_ID).catch(()=>null);
    if(!local)throw new Error(FW.byo?'Open your FM-1.fwsc file in Menu.':'Open an FM-1 .fwsc file in Menu.');
    if(FW.local){stateKey='local:'+local.hash;FW.name=local.name;FW.tag=local.name;updateLabels();}
    return local.bytes;
  }
  if(!FW.remote){const r=await fetch(FW.package);if(!r.ok)throw new Error(`Could not load ${FW.name}: ${r.status}`);return r.arrayBuffer();}
  const key=FW_ID+':'+FW.version;
  const cached=await kept('packages',key).catch(()=>null);
  if(cached)return cached;
  const {fetchPackage}=await import('./engine/fwsc.js');
  const {bytes}=await fetchPackage(FW);
  // Check the file before keeping it; the CPU's loader handles the authoritative unpacking.
  if(bytes.length<1024 || bytes.length>8*1024*1024)throw new Error('The firmware package has an unexpected size');
  await kept('packages',key,bytes.buffer).catch(()=>{});
  return bytes.buffer;
}

const status=document.getElementById('status'),cpu=document.getElementById('cpu'),hint=document.getElementById('screen-hint');
let soundStarted=false,userPaused=false,booting=false;
function showHint(text,error=false){hint.hidden=!text;hint.textContent=text||'';hint.classList.toggle('error',error);}
const UNLOCK=['pointerdown','pointerup','touchend','keydown','click'];
function unlock(){if(audioContext && !userPaused)audioContext.resume().catch(()=>{});}
function armUnlock(on){for(const type of UNLOCK)(on?addEventListener:removeEventListener)(type,unlock,true);}
function soundState(){
  const running=audioContext?.state==='running';
  document.querySelector('.app-shell').classList.toggle('running',!!running);
  if(running){soundStarted=true;armUnlock(false);if(!booting)showHint('');status.textContent='Sound on';}
  else if(!userPaused){armUnlock(true);if(!booting)showHint('Tap anywhere to start the sound');status.textContent='Waiting for a tap';}
}
function showLights(leds){
  const ids=[2,3,4,5,6,7,8,9,10,11,12,13,0,1];
  for(const b of Object.values(buttons)){
    const v=leds[ids[b.bit]]/0.08;
    b.g.classList.toggle('lit',v>.55);b.g.classList.toggle('dim',v>.015 && v<=.55);
  }
  keys.forEach((k,i)=>{const v=leds[14+i]/.08;k.g.classList.toggle('lit',v>.55);k.g.classList.toggle('dim',v>.015&&v<=.55);});
}
async function flush(){
  if(node){
    await new Promise(resolve=>{const t=setTimeout(()=>{flushResolve=null;resolve();},1500);flushResolve=()=>{clearTimeout(t);resolve();};send({type:'flush'});});
  }
  await savePending;
}
async function startMachine(){
  const ac=audioContext;
  if(node){node.disconnect();node.port.close();node=null;}
  const [wasm,sectors]=await Promise.all([fetch('engine/fm1_web.wasm').then(r=>{if(!r.ok)throw new Error('Could not load emulator');return r.arrayBuffer();}),restoreState()]);
  if(FW.loops){await slotsReady;for(let k=0;k<3;k++)Object.assign(sectors,loopSectors(k,slots[k]));}
  node=new AudioWorkletNode(ac,'fm1-mobile',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  node.connect(ac.destination);
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('The emulator did not answer')),30000);
    node.port.onmessage=e=>{
      const m=e.data;
      if(m.type==='ready'){clearTimeout(timer);resolve();}
      else if(m.type==='error'){
        clearTimeout(timer);reject(new Error(m.message));status.textContent='Firmware stopped';showHint(m.message,true);
      }else if(m.type==='frame'){
        drawScreen(m.fb);showLights(m.leds);persist(m.sectors);
        cpu.textContent=`${FW.name} ${FW.version||''} · CPU emulator · ${m.load}% audio thread`;
      }else if(m.type==='flushed'){persist(m.sectors);if(flushResolve){const done=flushResolve;flushResolve=null;done();}}
    };
  });
  // Keep the package bytes on the page for a reboot after loop import.
  const pkg=packageBytes.slice(0);
  node.port.postMessage({type:'load',wasm,package:pkg,sectors,master,seed:crypto.getRandomValues(new Uint32Array(1))[0]},[wasm,pkg]);
  await ready;
  btnMask=keyMask=-1;syncButtons();syncKeys();
}
async function reboot(){
  if(booting)return;
  booting=true;showHint(`Loading ${FW.name}…`);
  try{await flush();await startMachine();booting=false;soundState();}
  catch(err){booting=false;showHint(err.message,true);}
}
async function switchOn(){
  booting=true;showHint(`Loading ${FW.name}…`);
  try{
    if(!isSecureContext||!window.AudioWorkletNode)throw new Error('Sound needs HTTPS (or localhost)');
    if(navigator.audioSession)navigator.audioSession.type='playback';
    audioContext=new AudioContext({sampleRate:44100,latencyHint:'interactive'});
    armUnlock(true); // Capture a tap even while the package is still downloading.
    const values=await Promise.all([packageOf(),audioContext.audioWorklet.addModule('engine/worklet.js')]);
    packageBytes=values[0];await startMachine();
    document.getElementById('audio-toggle').hidden=false;
    audioContext.onstatechange=soundState;booting=false;soundState();unlock();
  }catch(err){
    booting=false;armUnlock(false);
    if(audioContext)await audioContext.close().catch(()=>{});
    audioContext=null;if(node){node.disconnect();node.port.close();node=null;}
    status.textContent='Could not start';showHint(err.message||String(err),true);
  }
}
function updateLabels(){for(const el of document.querySelectorAll('.fw-tag'))el.textContent=FW.tag;}
async function chooseFirmware(id){
  if(id===FW_ID)return;
  releaseInputs();await flush();
  try{localStorage.setItem(FIRMWARE_KEY,id);}catch{}
  const url=new URL(location.href);url.searchParams.set('fw',id);location.href=url.href;
}
function firmwareRow(id,f,small=false){
  const row=document.createElement('button');row.type='button';row.className='firmware'+(small?' firmware-compact':'');
  row.dataset.firmware=id;row.setAttribute('aria-pressed',String(id===FW_ID));
  if(!small && f.screenshot){const shot=document.createElement('img');shot.className='firmware-shot';shot.width=shot.height=88;shot.src=f.screenshot;shot.alt=`${f.name} screenshot from the FM-1 Firmware Hub`;shot.loading='lazy';row.append(shot);}
  for(const [cls,value]of [['name',`${f.name} ${f.version||''}${f.prerelease?' · pre-release':''}`],['about',f.about],['by',f.by]]){
    const span=document.createElement('span');span.className='firmware-'+cls;span.textContent=value||'';row.append(span);
  }
  row.addEventListener('click',()=>chooseFirmware(id));return row;
}
(function firmwareMenu(){
  const main=document.getElementById('firmwares'),more=document.getElementById('more-firmwares');
  for(const [id,f]of Object.entries(PRIMARY_FIRMWARES))main.append(firmwareRow(id,f));
  for(const [id,f]of Object.entries(FIRMWARES))if(id!=='local')more.append(firmwareRow(id,f,true));
  document.getElementById('more-count').textContent=Object.keys(FIRMWARES).length-1;
  document.getElementById('firmware-search').addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase();let count=0;
    for(const row of more.children){row.hidden=!row.textContent.toLowerCase().includes(q);if(!row.hidden)count++;}
    document.getElementById('catalog-empty').hidden=count!==0;
  });
  if(!PRIMARY_FIRMWARES[FW_ID])document.getElementById('more').open=true;
  updateLabels();document.querySelector('.breaks').hidden=!FW.loops;
  for(const [id,value]of [['fw-manual',FW.manual],['fw-source',FW.repo],['fw-archive',FW.archive]]){
    const a=document.getElementById(id);a.hidden=!value;if(value)a.href=value;
  }
  document.getElementById('fw-manual').textContent=`${FW.name} manual`;
  document.getElementById('fw-source').textContent=`${FW.name} on GitHub`;
  document.getElementById('reset').textContent=`Erase ${FW.name}'s saved work`;
  const bring=document.getElementById('bring-firmware');bring.hidden=!FW.byo;
  if(FW.byo)bring.href=FW.download;
})();
document.getElementById('firmware-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  const message=document.getElementById('file-status');message.textContent='Reading package…';
  try{
    if(file.size<1024||file.size>8*1024*1024)throw new Error('Choose an FM-1 .fwsc package (up to 8 MB).');
    const bytes=await file.arrayBuffer();
    // Validate using the same Rust loader; it never executes this instance's CPU.
    const {instance}=await WebAssembly.instantiate(await(await fetch('engine/fm1_web.wasm')).arrayBuffer(),{env:{fm1_jit_compile:()=>0}});
    const x=instance.exports,p=x.fm1_alloc(bytes.byteLength);new Uint8Array(x.memory.buffer,p,bytes.byteLength).set(new Uint8Array(bytes));
    if(x.fm1_boot_fwsc(p,bytes.byteLength,0,0,240)||x.fm1_board()!==0)throw new Error('Choose a valid FM-1 .fwsc package.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const target=FW.byo?FW_ID:'local';
    await kept('packages',target,{bytes,hash,name:file.name.replace(/\.fwsc$/i,'')});
    if(FW_ID===target){await flush();location.reload();}else await chooseFirmware(target);
  }catch(err){message.textContent=err.message;}
  e.target.value='';
});
document.getElementById('reset').addEventListener('click',async e=>{
  const button=e.currentTarget;
  if(!button.dataset.armed){button.dataset.armed='1';button.textContent=`Tap again to erase ${FW.name}'s saved work`;return;}
  await flush();
  if(node){node.disconnect();node.port.close();node=null;}
  savedSectors={};persist({});await savePending;location.reload();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)send({type:'flush'});});
switchOn();

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
  userPaused=audioContext.state === "running";
  if (userPaused) await audioContext.suspend();
  else await audioContext.resume();
  const running=audioContext.state === "running";
  toggle.querySelector(".tool-label").textContent=running ? "Pause" : "Resume";
  toggle.setAttribute("aria-label",running ? "Pause" : "Resume");
  if (!running) status.textContent="Paused";
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
// launch and whenever the app comes back to the front), it takes over at once if the sound has not
// started yet; otherwise Menu offers a reload so nothing stops in the middle of playing.
if ("serviceWorker" in navigator && window.isSecureContext) {
  const updated = !!navigator.serviceWorker.controller;   // false on the very first visit: nothing to replace
  navigator.serviceWorker.register("sw.js").then((registration)=> {
    document.addEventListener("visibilitychange",()=> { if (!document.hidden) registration.update().catch(()=>{}); });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=> {
    if (!updated) return;
    if (!soundStarted) { location.reload(); return; }
    document.getElementById("update").hidden=false;
    document.getElementById("settings-open").classList.add("has-update");
  });
  document.getElementById("update-reload").addEventListener("click",()=>location.reload());
}
