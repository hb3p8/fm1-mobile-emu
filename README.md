# FM-1 X0X Mobile

Touch interface for the real X0X firmware, based on charlesvestal/fm1-x0x at 00bff73d6f8c0d5e5cf8c44314d0531efe0e8e62. GPL-3.0-only; see upstream/LICENSE and upstream/LICENSING.md.

The panel follows the look of AudioKit Synth One: dark tiles, black knobs with orange pointers, an orange Menu button. The controls keep the FM-1's arrangement: MASTER / SELECT / PRESETS / ALGORITHM in a 2×2 block with OCT− / OCT+ below, left of the screen in landscape; KNOB1–4 over the function buttons right of it (six by two, or four by three in portrait). A slim bar over KNOB1–4 (full width under the screen in portrait) holds the name, Hold and Menu, so the screen reaches the top edge; Menu holds the sound status and pause, the xBR switch, loops and help. In landscape the square screen fills the height beside the panels; in portrait it fills the width above them. Rotation changes only the layout and preserves the running firmware.

The 240×240 screen is magnified on the GPU (WebGL) to the display's device pixels with xBR level 2 by Hyllian, the edge-directed filter used by emulators of old games (`screen.js`). The Screen smoothing switch in Menu turns it off for plain pixels; the choice is kept in localStorage.

## Build

Install Emscripten, a C compiler, Python 3 and Pillow. From the parent directory containing `upstream/` and `app/`:

```sh
python3 -m venv app/.venv
app/.venv/bin/pip install Pillow
cd upstream
mkdir -p build/gen
../app/.venv/bin/python tools/gen_font.py build/gen/felucca_font.h
PATH=/opt/homebrew/bin:$PATH sh web/emu/build.sh  # macOS/Homebrew; otherwise sh web/emu/build.sh
cd ..
python3 app/assemble.py
```

The font generator has a portability fallback for Pillow installations without libraqm. The audio engines, emulator wrapper and AudioWorklet are unchanged.

## Run

```sh
python3 -m http.server 4180 --directory app/dist --bind 127.0.0.1
```

Open http://localhost:4180 on the computer and press “Switch on”, then PLAY. On a phone use an HTTPS deployment of `dist/`; AudioWorklet is not available on ordinary LAN HTTP addresses. Settings contain the upstream manual, loop import, reset, full source archive and license.

Audio runs at 44.1 kHz. SAVE stores patterns in localStorage; loop slots use IndexedDB. Browser storage is specific to the current origin.
