# MIN-1 licensing

MIN-1 is free software under the GNU General Public License, version 3 only
(`GPL-3.0-only`, full text in `LICENSE`). It is built on Felucca's platform layer (through X0X, FoMni and
AMB-1) and keeps Felucca's licence. If you distribute MIN-1, or firmware derived from it, you must give
your recipients its complete corresponding source under the same licence.

## Where the code comes from

| What | Origin | Licence |
| --- | --- | --- |
| Platform: `firmware/hal/`, `firmware/loader/`, `firmware/src/{libc,lcd,gfx,usb,storage,ota,midi_uart}.c`, `tools/` (build, package, install, rescue), `web/fm1*.js` | [Felucca](https://github.com/hugelton/Felucca), Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hügelton Instruments, as changed for [X0X](https://github.com/charlesvestal/fm1-x0x), FoMni and [AMB-1](https://github.com/charlesvestal/fm1-amb) (Charles Vestal), then MIN-1 | GPL-3.0-only |
| `firmware/src/app/{panel,plat_fm1,main_fm1,project}.c`, `firmware/src/app/{app,plat}.h`, `host/min_host.c`, `web/emu/`, the drawing helpers and knob strip in `firmware/src/app/ui.c` | AMB-1 at d4a211c (adapted from X0X, itself from Felucca's `panel.c`, `main.c`, `audio.c`), changed for MIN-1 | GPL-3.0-only |
| `firmware/src/dsp/fastmath.h` | X0X, by way of AMB-1 | GPL-3.0-only |
| Dattorro's plate reverb and the voice leading in `firmware/src/dsp/min.c` | AMB-1 (the plate from [FoMni](https://github.com/charlesvestal/fm1-fomni)) | GPL-3.0-only |
| The overload guard in `firmware/src/dsp/min.c` | after X0X's (`firmware/src/app/engine.c`) | GPL-3.0-only |
| The idea of a browser emulator for FM-1 firmware (`web/emu/`) | [Groove OS](https://www.groove-os.com/) by Peter Gombos, whose site runs its firmware in the browser; no code from it | credit only |
| Everything else in `firmware/src/{app,dsp}`, `tests/`, `docs/`, `web/demo/` | MIN-1, Copyright (C) 2026 Reytian | GPL-3.0-only |

## Third-party material

| What | Licence | Where |
| --- | --- | --- |
| Barlow Semi Condensed (The Barlow Project Authors), the UI face | SIL OFL 1.1 | `assets/fonts/BarlowSemiCondensed-*.ttf`, `assets/fonts/Barlow-OFL.txt` |
| Terminus (Dimitar Toshkov Zhekov), an alternative font set | SIL OFL 1.1 | `assets/fonts/ter-u*.bdf`, `assets/fonts/Terminus-LICENSE.txt` |
| JieLi AC79 SDK: `uboot.boot`, `cfg_tool.bin`, `eq_cfg_hw.bin` are read from your SDK checkout at build time and placed in the package; no SDK files are in this tree | Apache-2.0 | <https://gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK> |

## Music

MIN-1 is inspired by AMB-1 and by the music of Philip Glass (*Glassworks* above all). The chord cycles
are plain progressions of the common practice (i–VI–iv–V and the like) and the models follow techniques,
not pieces: no melody, figure or progression is taken from any work.

## Trademarks

"Felucca" and "Hügelton Instruments" are names of Hügelton Instruments.
"M-VAVE" and "FM-1" are trademarks of their respective owners. MIN-1 is independent firmware; it is
not affiliated with, endorsed by or supported by any of them, nor by Charles Vestal or Philip Glass.

## Radio

MIN-1 never enables the Bluetooth / Wi-Fi radio of the hardware.

## Jazz Box adaptation

Jazz Box adds the orchestration in `firmware/src/dsp/jazz.inc`, live melody input,
scale LEDs and the dark green interface, under GPL-3.0-only.

The **Fine Romance** score is derived from the user's supplied
`assets/scores/a_fine_romance_mw.mid`, which credits Mel Webb for the MIDI
arrangement. This musical data is separate from the software licence; no
open-source licence is asserted for the composition or arrangement. See
`assets/scores/README.txt` for the exact extraction and timing changes.
The chord-relative bank for **Romance Forms** is derived from the same
user-supplied material; its musical ownership is unchanged by abstraction or
recombination. The extraction/planning code is GPL-3.0-only.

The unchanged files `firmware/src/dsp/{drum909.c,drum909.h,drum909_dsp.h,x0x_param.h}`,
`tools/gen_drum_samples.py` and `assets/909/` were copied from Charles Vestal's
[X0X](https://github.com/charlesvestal/fm1-x0x) at commit
`2e31c517ded3732c58b845eb0c800fe018004b8d`. The 909 engine is derived from
9W9 / ER-99 (Matthew Cieplak); the ride, crash and hi-hat sample attribution is
preserved in `assets/909/README.txt`. Generated tables and sample headers are
recreated during each build. Original MIN-1 and platform notices remain intact.

The hybrid bass DSP in `firmware/src/dsp/upright.{c,h}` is GPL-3.0-only.
Its eight compact attack recordings in `assets/upright/` are derived from
[VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) at commit
`440300901dfe9275fd84e0b7763af1f8443ae62e`, under CC0-1.0. Recorded by Sam
Gossner and Simon Dalzell (Versilian Studios); sample cutting by Elan Hickler /
Soundemote. The CC0 dedication, source paths, original SHA256 hashes, pitch
mapping and preparation notes are included beside the derived recordings.

The fixed-note, non-dispersive Rings string path in
`firmware/src/dsp/rings_string.{c,h}` is adapted under MIT from Emilie Gillet's
[Rings](https://github.com/pichenettes/eurorack) at
`f4cfa7697095a28d292bff758beb51deb49b5a86` and
[stmlib](https://github.com/pichenettes/stmlib) at
`e3bd7c9cc00e4364166f9905c0509b6ffd0535ec`. Copyright and permission notices
are retained in the source and `assets/upright/RINGS-LICENSE.txt`. Changes:
portable C, 44.1 kHz, note-on coefficient preparation, external delay storage;
no dispersion, CV interpolation, auxiliary output or sub-audio resampling.
The original unmodified headers in `tests/reference/` are host-test fixtures
and are not linked into the device or WASM builds. The adaptation does not
include any Mutable Instruments module branding or claim hardware endorsement.
