# FM-1 X0X Mobile

Touch interface for the real X0X firmware, based on charlesvestal/fm1-x0x at 00bff73d6f8c0d5e5cf8c44314d0531efe0e8e62. GPL-3.0-only; see upstream/LICENSE and upstream/LICENSING.md.

MASTER / SELECT / PRESETS / ALGORITHM keep the original 2×2 layout with OCT− / OCT+ below. KNOB1–4 sit above the function buttons. The 16 white and 11 black keys form one compact piano row. Rotation changes only the layout and preserves the running firmware.

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

Open http://localhost:4180 on the computer and press “Включить звук”, then PLAY. On a phone use an HTTPS deployment of `dist/`; AudioWorklet is not available on ordinary LAN HTTP addresses. Settings contain the upstream manual, loop import, reset, full source archive and license.

Audio runs at 44.1 kHz. SAVЕ stores patterns in localStorage; loop slots use IndexedDB. Browser storage is specific to the current origin.
