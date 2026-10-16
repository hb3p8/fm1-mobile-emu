# Jazz Box for M-VAVE FM-1

Jazz preset 10: **After You've Gone Forms**. A 40-bar chart in Eb at 140 BPM,
with 256 reusable bass/accompaniment forms extracted only after separating
the mixed piano track's right-hand melody/harmonisation. The arrangement's
source melody is excluded and there is no fixed-original preset. Three
40-bar source drum choruses provide the kit loop. The detailed generator
report and separated MIDI are in build/gen/after_forms.txt and
build/gen/after_separated.mid. New phrase button / HOME → EDIT changes the
form choices. Saves migrate from project format 7 to 8, preserving settings.


A local adaptation of Reytian's MIN-1. A self-playing jazz quartet, with an
independent live piano keyboard. The C engine, hardware panel, host simulator
and WebAssembly emulator share the same musical code.

- Seven progressions: ii-V-I triads, seventh chords, close voicings, secondary
  dominant, tritone substitution, combined substitutions, chromatic descent.
- **Fine Romance Trio** (preset 28 / web option 08): a 128-bar bass, piano and
  drum score from the user's MIDI, with a 32-bar harmonic chart, 160 BPM and
  the bass in its original low register. Preserves all 2971 notes/hits and their velocities;
  starts/gates are rounded to the 24 PPQN engine grid. Two-feel/hat changes to
  walking/ride in bars 33–48 and 97–112. Separate melody, strings and guitar
  are omitted; the generative solo starts muted, leaving the keyboard free.
- **Romance Forms** (preset 29 / web option 09): the same chord chart, drums
  and two-feel/walking sections. Recombines 59 bass and 105 piano forms
  extracted from the source. Each 2/4-beat chord chooses new forms of the
  matching length/feel; piano also matches the chord family. Pitch functions
  (1/3/5/7/9/11/13), chromatic neighbours and next-root approaches are remapped
  to the current/next harmony, with whole-phrase register adjustment. Immediate
  form repeats are excluded and the previous chorus's choice is downweighted.
- Piano: fast sixteenth-note arpeggios by default, with Morning's velocity curve
  and Room=50. Syncopated comping and held chords remain selectable.
- Walking bass with chromatic approach notes and differentiated accents (also
  long / two-feel), switchable between Rings, original Upright and Piano.
- Rings bass: eight real CC0 VSCO 2 pizzicato attacks (four registers, two
  alternate takes) excite the ported Rings string kernel. The old independent
  synthetic pluck and dry sample mix have been removed. Three broad body
  resonators follow the string output.
  Pluck, Wood, Decay and Damping controls; three voices for overlapping tails.
  The recordings occupy 33,872 bytes in flash; string buffers use 24 KiB.
- X0X's 909 engine: sampled ride and hats, modelled kick and snare.
- Generative sax/flute solo: scale-aware swing phrases, anchor tones and rests.
- Live polyphonic piano from the FM-1 keys / MIDI / browser keyboard. Playing
  does not replace the ensemble harmony. The soloist yields to the player and
  returns a bar after the last released note.
- Scale LEDs on the device; brighter anchor tones in the browser. Black/green
  screen and panel. The web mixer controls the C engine rather than a JS synth.

## Build and run the web emulator

Prerequisites: Emscripten, Python with Pillow, C/C++ compilers for host tests.

```sh
sh web/emu/build.sh
python3 -m http.server 8080 --directory build/emu
```

Open http://127.0.0.1:8080 and click **Switch on / Enable Jazz Box**.
On this Mac, Emscripten needs a newer Python than the system Python:

```sh
EMSDK_PYTHON=/opt/homebrew/bin/python3 sh web/emu/build.sh
```

Output: `build/emu/index.html`, `min.wasm`, `worklet.js`. This is a WebAssembly
build, not an installable device package. Hardware flashing is separate; see
BUILDING.md. Do not flash a web build.

## Play

Browser: A S D F G H J K = C4-C5; W E T Y U = black keys. Z/X changes octave.
Space starts/stops. The original device's 27-key F3-G5 geometry is preserved.
ENV = drums, ARP = live keys, LFO = bass, SEQ = solo, FX = piano. KNOB1 changes
the selected part's level. HOME/KNOB3 controls swing. The browser adds direct
progression/key/tempo, piano rhythm and mixer controls. In the piano page,
Rhythm=2 selects the new sixteenth arpeggio; Rhythm=3 selects swing comping.
On the bass page, Sound=0/1/2 selects Upright/Piano/Rings. Press LFO again
to open Bass tone: KNOB1–4 = Pluck, Wood, Decay, Damping. Press LFO once more
for Bass FX: KNOB1 = Bass reverb (0–100; send to the shared room). This works
with Rings, Upright and Piano, is saved per preset, and updates ringing voices.
The web panel has a separate bass reverb slider. Existing saved projects and
forty-parameter songs migrate while preserving their previous bass send. The web panel exposes
the same controls. Tone changes apply to the next pluck. Version-3 Jazz Box
saves and version-4/5 saves are migrated to version 6 while preserving preset
settings, learned cycles and songs. Mine/Rolled keep their old cycle IDs.

Fine Romance selects the appended Romance score cycle. Piano Rhythm=4 plays
the imported phrases; other rhythm settings substitute procedural comping.
Bass Style=3 plays the imported line (0/1/2 substitute long/two-feel/walking).
Tempo and Root transpose/stretch the whole trio; Bass Octave affects only the
bass. HOME/KNOB3 controls the optional generated solo's swing in score mode;
the trio keeps its recorded timing. The screen shows bar/chorus and an
eight-chord window of the full form; scale lights include diminished and
altered scales, with contextual Phrygian/Aeolian over iii/vi minor chords.
The score is compiled as about 24 KiB of const tables, with no runtime MIDI
parser, file I/O or dynamic allocation. See `assets/scores/README.txt` for
musical data provenance, omissions and timing precision.

Romance Forms keeps the original preset separately. The web shows the current
bass/piano form IDs and families. **New phrase variant**, or HOME → EDIT on
the hardware panel, changes the phrase seed without changing the progression.
Variation controls how strongly the previous chorus's choice is avoided.
Each pass continues the phrase RNG; recorded takes retain deterministic seeds.
Manual playing/muting does not consume the phrase RNG. Bass remains in the
low register. `tools/gen_romance_forms.py` produces the const form bank and
`build/gen/romance_forms.txt`, a Russian analysis/catalogue with source bars,
original notes, functional degrees, rhythm and octave positions.

Green LEDs identify a suggested scale for the current chord. Bright green
identifies anchor tones; pink is the player's input. Dorian is used on minor
sevenths, Ionian on major sevenths, Mixolydian on V7, Lydian dominant on tritone
substitutes and Phrygian dominant on A7 leading to Dm. These are choices, not
restrictions: all keys remain playable.

The default recipe is **Chromatic**, Eb7 - Dm7 - Db7 - Cmaj7, at 104 BPM.
Original MIN-1 presets and models are retained after/before the jazz recipes.
Jazz Box uses a separate browser storage key and project format.

## Validate

```sh
EMSDK_PYTHON=/opt/homebrew/bin/python3 tests/run_tests.sh
```

`tests/host/jazz_test.c` checks every progression in 12 keys, all four generated
parts, scale/anchor masks, manual note input independent of harmony, and release.
`upright_test.c` checks tuning, finite output, extreme controls and release tails.
`rings_reference_test.cpp` compares the portable C signal path with unmodified
Rings/stmlib Hermite, FIR and SVF components using identical coefficients.
The WASM tests also verify bass/rhythm/tone controls and old-save migration.
The legacy simulator scenarios explicitly select Morning before testing MIN-1
behavior. X0X source attribution and GPL-3.0-only notices are in LICENSING.md.

---

# MIN-1 for the M-VAVE FM-1

*Minimalist music for everyone, by Reytian. Inspired by [FM1-AMB](https://github.com/charlesvestal/fm1-amb) and Philip Glass.*

![MIN-1 in the browser emulator: the FM-1, and its screen at twice the size](docs/images/min1.png)

MIN-1 turns the M-VAVE FM-1 into a small minimalist ensemble, in the manner of the music of the 1960s to
80s that was made from very little: repeating figures, slow cycles of chords, processes you can hear.
It plays itself from the moment it's switched on, so there is always something to start from; then
you take over as much as you like: play your own chords (no theory needed: in EASY keys every key is a
chord that fits), roll ideas and keep the ones you like, bring parts in and out by hand, put processes
on the figures, and record it all as a song.

- **Try it in your browser** (no FM-1 needed): <https://reytian.github.io/fm1-min1/emu/>
- **Install it** (Chrome or Edge, with the FM-1 plugged in): <https://reytian.github.io/fm1-min1/install/>,
  or from the command line: `python3 tools/fm1_install.py min-0.2.1.fwsc` (see [BUILDING.md](BUILDING.md#install))
- **Download the firmware file**: [releases](https://github.com/Reytian/fm1-min1/releases) (`min-0.2.1.fwsc`)
- **Watch the demo** (3:49, recorded from the browser emulator, no voice-over):
  [min1-demo.mp4](https://github.com/Reytian/fm1-min1/releases/download/v0.2/min1-demo.mp4)

## Four models

![The four models on the FM-1's screen](docs/images/models.png)

| Model | What it does | Pieces |
|---|---|---|
| ARPEGGIO | Figures of the chord's tones, two against three; the additive process grows and shrinks them a note at a time | Morning, Glacier, Lagoon, Machine, Skyline, Evening, Counting, Prism |
| PHASE | Two parts play one figure; the lower slowly drifts ahead, locks in a step ahead, drifts on, round to unison | Drift, Breath, Weave, Tilt |
| PATTERNS | A chain of short patterns, each a little changed from the last; three players move along it at their own pace over a high pulse | Bazaar, Field, Gears, Murmur |
| BELLS | A melody walks the scale by step in phrases that grow from one note; a bell answers each note with the chord's nearest tone | Vigil, Snowfall, Lantern, Chapel |

## In short

| | |
|---|---|
| Keys | The chord. EASY (the default): each white key is a chord of the key, the tonic leftmost; the black keys the same chord with a seventh; several keys make a richer one. NOTES: the notes themselves. Let go and the cycle comes back |
| PLAY · REC · EDIT | Play / stop · record a song from the top (again: kept) · an idea for this page |
| SEL held | By hand: ENV ARP LFO SEQ FX bring a part in or out; EDIT goes back to the idea before; REC learns a cycle from the chords you play; PLAY switches songs / live; white keys 1–8: grow, shrink, shift, flip, still, slower, faster, a new section |
| HOME · ENV · ARP · LFO · SEQ · FX · GLO | The pages: Form, Upper, Lower, Bass, Lead, Chords, Setup (GLO again: System) |
| SELECT | The previous or next page; with HOME held, the tempo |
| ALGORITHM · PRESETS | The chord cycle (eighteen, Mine, Rolled) · the piece (twenty), or in SONGS the song (eight) |
| OCT− / OCT+ | The upper part's octave |
| SAVE | Saves pieces and songs; held, puts the piece back to its recipe (in SONGS: deletes the song) |

Hold any button for a second and a card says what it does; hold SEL and the screen shows its map. The
design (in Chinese) is in [docs/DESIGN.md](docs/DESIGN.md).

### From listening to making

1. **Listen.** PRESETS goes through the twenty pieces; each plays itself.
2. **Play the harmony.** Press white keys: each is a chord that fits. Turn HOLD on (Setup) and a chord
   stays until you press it again. The keys light where the cycle is, so you can play along.
3. **Roll ideas.** On a page, EDIT rolls an idea for it: a new chord cycle (Form), a new figure (Upper,
   Lower), a new line or melody or set of patterns (Lead), a new bass, a new rhythm. SEL + EDIT goes
   back. Ideas are kept with the piece.
4. **Make your own cycle.** SEL + REC, play two to eight chords one at a time, REC: they become "Mine".
5. **Arrange by hand.** SEL + a part's page button brings it in or out at the next chord; SEL + white
   keys put processes on the figures.
6. **Record a song.** REC starts from the top and records everything you do; REC again keeps it. PLAY
   plays it back exactly. SAVE keeps it, eight songs in all.

### The pages

| Page | KNOB 1 | KNOB 2 | KNOB 3 | KNOB 4 |
|---|---|---|---|---|
| Form (HOME) | Evolve (Patterns: Move on) | Build | Process (Phase: Drift, Patterns: Spread, Bells: Phrases) | Chord (its length) |
| Upper (ENV) | Level | Sound | Pulse (notes a beat) | Figure (Patterns: Start, Bells: where the bells answer) |
| Lower (ARP) | Level | Sound | Pulse | Figure (Patterns: Start) |
| Bass (LFO) | Level | Sound | Style | Octave |
| Lead (SEQ) | Level | Sound | Activity (Patterns, Bells: Pace) | Harmony |
| Chords (FX) | Level | Sound | Rhythm (hold, swell, 8ths, beats, breath, pulse) | Room (the reverb) |
| Setup (GLO) | Tempo | Root | Keys (Easy / Notes) | Hold |
| System (GLO again) | Model | MIDI out | Lights | CPU |

## Building and testing

The toolchain is AMB-1's and X0X's (see [BUILDING.md](BUILDING.md)):

```
tests/run_tests.sh      # the instrument, the platform pieces, the app in a simulator, the load on the FM-1
./build.sh              # build/min.fwsc
python3 tools/fm1_install.py build/min.fwsc     # install it over USB
```

`build/host/min_host SCRIPT OUTDIR` runs the whole app on a computer from a script
(`tests/scenarios/*.min`), with audio and screenshots coming out. `tests/host/min_render.c` renders
every piece to `build/render/` and prints how hard each would work the FM-1's processor, from the
instructions it runs (calibrated against X0X's published PERF TEST figures).

Installing firmware is at your own risk. An FM-1 that fails to start twice comes up in a safe mode with
USB on, and M-VAVE's own firmware can always be put back: the web installer's "Back to the stock
firmware", or see BUILDING.md.

## Credits

MIN-1 is by Reytian. It is inspired by [AMB-1](https://github.com/charlesvestal/fm1-amb), Charles Vestal's
generative ambient firmware for the FM-1, and by the music of Philip Glass.

The platform (hardware layer, USB, update loader, storage, installer) is [Felucca](https://github.com/hugelton/Felucca)'s
by Leo Kuroshita (Hügelton Instruments), by way of Charles Vestal's [X0X](https://github.com/charlesvestal/fm1-x0x),
FoMni and [AMB-1](https://github.com/charlesvestal/fm1-amb), whose app layer, simulator and tools MIN-1 started from.
The reverb is Jon Dattorro's plate ("Effect Design, Part 1", JAES 1997), as in AMB-1. The models follow
techniques of the minimalist composers (arpeggiated cycles and additive process, phasing, chains of
patterns played at each player's pace, tintinnabuli); no music is taken from their works. GPL-3.0-only;
see [LICENSING.md](LICENSING.md).

M-VAVE and FM-1 are trademarks of their owners. MIN-1 is not affiliated with M-VAVE, Hügelton
Instruments, Charles Vestal, Philip Glass, or any composer.

## 中文简介

MIN-1 是 M-VAVE FM-1 的极简主义音乐固件，受 FM1-AMB 与 Philip Glass 启发。开机就自己演奏：重复的音型、
缓慢的和弦循环、听得见的过程；然后交给你：按住白键就是和弦（不需要乐理），EDIT 随机出点子，教它你自己的和弦循环，
亲手让声部进出，录下一首歌并原样回放。四种模型（琶音、相位、模式、钟声），二十首曲子。设计说明见
[docs/DESIGN.md](docs/DESIGN.md)。在浏览器里试玩：<https://reytian.github.io/fm1-min1/emu/>；
用 Chrome 或 Edge 安装：<https://reytian.github.io/fm1-min1/install/>。
