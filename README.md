# Jazz Box for M-VAVE FM-1

A local jazz accompaniment instrument derived from Reytian's MIN-1, using
its modal piano, Dattorro plate, platform and device/web build. Four parts:
X0X 909 drums, live piano keys, walking bass, and accompanying piano.

The original MIN-1 recipes and music models are removed. There is no
automatic soloist, chord takeover, LEARN/Mine, phase generator or pattern
engine. Device keys and incoming MIDI play melody notes independently of
harmony. Software/source and asset licences are detailed in LICENSING.md.

## Presets

1. First steps: ii–V–I triads
2. Velvet: ii7–V7–Imaj7
3. Close voices: the same with connected piano voicings
4. Secondary dominant
5. Tritone substitution
6. Both techniques
7. Chromatic descent
8. Fine Romance Trio: the original selected three-part MIDI accompaniment
9. Romance Forms: the same 32-bar harmony, changing bass/piano forms
10. After Gone Forms: a 40-bar chart in Eb, 140 BPM; 256 bass/comping forms
    extracted after separating the source piano's melody/right-hand layer

Seven short progressions and three score-based harmonies are the entire
cycle library. MIDI material is user-supplied; software GPL does not license
the music. The automatic piano hand split is conservative, not a manually
engraved voice transcription; see assets/scores/README.txt.

## Local web build

Requires Emscripten, Python 3 and the existing font-generation dependencies.

```sh
sh web/emu/build.sh
python3 -m http.server 58049 --bind 127.0.0.1 --directory build/emu
```

Open http://127.0.0.1:58049/. The WebAssembly runs the same C engine and FM-1
UI as the device. A/S/D/F/G/H/J/K play white keys, W/E/T/Y/U black keys,
Z/X shift octave, Space toggles transport. Russian keyboard layout works.

## Firmware panel (layout retained)

The original 28/144/68-pixel bands, chord strip, part lane positions and
four-knob cells remain in place. The removed solo lane and unused cells
are blank. SEQ has no assigned action.

| Page | Button | Knobs 1–4 |
| --- | --- | --- |
| Form | HOME | Variation; blank; Swing; Chord duration |
| Drums | ENV | Level; blank; blank; blank |
| Live keys | ARP | Level; blank; blank; blank |
| Bass | LFO | Level; sound; style; octave |
| Piano | FX | Level; voicing; rhythm; room |
| Setup | GLO | Tempo; root; blank; blank |
| System | GLO again | blank; MIDI out; lights; CPU |
| Bass tone | LFO again | Pluck; wood; decay; damping |
| Bass FX | LFO once more | Reverb send; blank; blank; blank |

Variation is shown only for generative form presets. Swing and chord duration
are shown only for short progressions: score phrases retain their MIDI timing.
Bass tone is available for Rings. Reverb send works with all three bass sounds.
OCT-/OCT+ transpose the live device keys. SELECT changes page; ALGORITHM
changes harmony; PRESETS cycles only through the ten Jazz Box recipes.

PLAY starts/stops, EDIT chooses new forms, SEL+EDIT restores the previous seed.
SEL+ENV/ARP/LFO/FX toggles a part; SEL+PLAY switches live/songs. REC records a
take, REC again keeps it. SAVE saves preset settings and the recorded take;
SAVE held resets the preset (in Songs it clears the selected song slot).

## Form library

`assets/forms/library.json` is the canonical editable bank (164 Romance,
256 After Gone forms). `tools/form_library.py` validates musical coverage,
bounds and names and compiles the const C tables. A normal build never
re-extracts or overwrites form edits from the source MIDI. MIDI analysis
utilities remain in tools/ for deliberate analysis/import work.

## Persistence and checks

Project format 9 stores only ten Jazz slots. Versions 3–8 import the Jazz
slots and their settings, discarding original MIN-1 slots and recordings.
Reserved parameter IDs are inert storage positions, not hidden controls.
Old Jazz SNG1/SNG2 recordings migrate to SNG3; retired commands are dropped.

```sh
tests/run_tests.sh
```

Checks cover the four-part engine, score loops, reusable forms in all keys,
Rings reference, reverb routing, storage migration, WASM, native panel
scenarios and estimated render load. No physical device is implied by host
or WASM checks. Hardware build/install tools and the Felucca platform remain;
installable `.fwsc` packages require the AC79 SDK/toolchain.
