# FM-1 Mobile

The M-VAVE FM-1 on your phone: **original hardware `.fwsc` packages**, executed by [Joakim Eriksson's fm1-emu](https://github.com/joakimeriksson/fm1-emu) CPU emulator behind a touch panel laid out like the instrument.

**[Play on GitHub Pages](https://hb3p8.github.io/fm1-mobile-emu/)**

The square screen spans the phone in portrait; landscape puts MASTER / SELECT / PRESETS / ALGORITHM and OCT− / OCT+ to its left and KNOB1–4 and the function buttons to its right. The compact Synth One style keyboard has one row of 16 white keys with 11 short black keys above them. Rotating changes the layout while the firmware continues running.

## Firmware menu

The seven screenshot cards stay in the main menu:

| Firmware | Pinned hardware release |
|---|---|
| X0X | 1.0.6 |
| Felucca | 1.6 |
| SLOOP | 2.6 |
| FiMba-1 | 0.6.1, pre-release |
| Melodee | 1.4.0-rc.1, pre-release, dual-core build |
| AMB-1 | 1.1 |
| MAKU | 0.1 |

**More** opens the complete upstream catalog, with search: 36 entries including these seven and M-VAVE's stock firmware. Extra packages download from their authors and are kept in IndexedDB for the next launch, including offline. The seven main packages ship with the page and are cached with it. Their bytes and SHA-256 checksums are pinned in `firmware/packages.json`; they are not recompiled or modified.

**Open .fwsc** loads another FM-1 update package from the device and keeps it locally. Select M-VAVE's stock entry in More to see its download link, then open the downloaded file. M-VAVE's package is not hosted by this project. SMK-37 packages are rejected because this panel has the FM-1's controls.

The seven thumbnails are from the [FM-1 Firmware Hub](https://fm1.designburgapps.com/), by the firmware authors. `screenshots/sources.json` records their URLs and checksums. Main releases remain pinned independently of the extended catalog.

## Playing

Open the page in Safari or Chrome. The first tap starts audio; use Add to Home Screen for the full phone display and offline use. Knobs turn by dragging up or down or using a mouse wheel. Keys support multi-touch and glissando. **Hold** latches buttons for one-finger combinations; Shift + click does the same on a computer.

Space is PLAY, Enter REC, Shift SEL, Esc HOME, Z / X octave, ↑ / ↓ SELECT. Q–I and A–K play the white keys, 1–0 and minus the black keys. Menu contains pause, xBR screen smoothing, firmware selection, X0X loop import, help and source links. Smoothing is off by default for sharp original pixels.

X0X accepts three sample slots, each with up to 16 audio files and about 7 seconds total. Imports are encoded into the hardware's IMA ADPCM flash format. Changing a slot restarts the firmware so it scans the slots again; save your pattern first. Existing imported loops are carried across the engine change.

## Saves and the engine change

The engine executes the unmodified pi32v2 machine code from each update package. It models both CPU cores, timers, interrupts, GPIO/key scanning, encoders, ADC, LCD, SPI flash and audio DMA. Hot instructions are JIT compiled to WebAssembly in the AudioWorklet. The emulated clock is 240 MHz, audio 44.1 kHz. Firmware is no longer built as a host-simulator C port.

Our small MIT patch adds flash access, an erase/program revision counter and fresh host entropy for the emulated hardware RNG (including MAKU worlds). Changed 4 KiB sectors are stored separately for each firmware in IndexedDB `fm1-hardware`. A flush before switching waits for pending flash writes. Local packages get a namespace based on their SHA-256, so opening a different file does not overwrite another file's saved work.

On the first launch after migration, Felucca-family NOR sectors are copied from the old `fm1-flash` database. X0X / FiMba-1 / AMB-1 objects in localStorage are wrapped in their actual A/B storage headers with CRC32. The original browser data is retained. An explicit marker prevents an erased hardware save from being re-imported on the next launch. Each firmware's own SAVE / autosave rules still apply; work not saved by the firmware is not a snapshot of CPU RAM.

This remains an emulator, with the hardware support provided by fm1-emu. USB devices are not forwarded to real hardware. Additional catalog firmware can require features the emulator has not implemented. On loading or runtime errors the screen reports the problem and Menu remains available.

## Build and verify

Requires Git, Python 3, Node.js for tests, and Rust with the `wasm32-unknown-unknown` target. On macOS the upstream build prefers rustup's stable toolchain (Homebrew rustc alone lacks that target).

```sh
rustup target add wasm32-unknown-unknown
firmware/build.sh           # builds the pinned emulator; verifies/downloads seven .fwsc files
python3 assemble.py         # writes app.js, dist/, offline cache and source archives
node firmware/smoke.mjs     # boots all seven hardware packages, tests audio/input/JIT/flash restore
node firmware/formats.mjs   # sample format against upstream encoder; migrated save CRCs
python3 -m http.server 4180 --directory dist
```

`firmware/emulator.json` pins the upstream engine commit. `firmware/emulator.patch` adds the persistence revision; `firmware/mobile.rs` exports the flash bridge. The build applies that patch and includes the bridge. `firmware/catalog.json` is the extended upstream catalog with verified moved URLs. The seven corresponding GPL source archives in `dist/src/` are retained with the binary releases. `assets/` contains the panel font and its notices.

| File | Purpose |
|---|---|
| `firmwares.js`, `power.js` | Main cards, More/search, package loading, audio and persistence |
| `panel.js`, `input.js`, `mobile.js` | Responsive controls, hardware input mapping, gestures and PWA updates |
| `screen.js` | Pixel and xBR rendering of the hardware LCD's RGB565 frame |
| `flash.js`, `loops.js` | Old save conversion, IMA sample format and import UI |
| `firmware/worklet.js` | Hardware emulator, JIT, input debounce, screen/LED and dirty flash messages |
| `assemble.py`, `sw.js` | Static bundle, offline cache and source archives |

GitHub Actions publishes the committed `dist/` on pushes to `main`. Existing installations offer **Update ready → Reload** in Menu when sound is running; an idle page switches automatically.

## Credits and licensing

App: GPL-3.0-only (`LICENSE`). CPU emulator: MIT, Copyright (c) 2026 Joakim Eriksson (`dist/engine/LICENSE.txt`). Input handling, loop UI and storage formats derive from Charles Vestal's X0X (GPL-3.0-only), built on Felucca by Leo Kuroshita / Hügelton Instruments. Seven main firmwares: X0X and AMB-1 by Charles Vestal; Felucca by Hügelton Instruments; SLOOP by isod89; FiMba-1 by Adam Sowers; Melodee by keremimo; MAKU by okumurari. The extended catalog lists its authors and repositories. xBR filter by Hyllian. Barlow font notices in `assets/`.

App, emulator and the seven corresponding firmware source archives are linked from Menu. This fan project is not affiliated with M-VAVE or the firmware authors. M-VAVE and FM-1 are their owners' trademarks.
