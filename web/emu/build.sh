#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# MIN-1 in the browser: the host simulator compiled to WebAssembly (Emscripten), plus its page.
#   [EN_VERSION=0.1] web/emu/build.sh  ->  build/emu/{index.html, worklet.js, min.wasm}
# Same sources and flags as host/build_host.sh (-ffp-contract=off, like the device).
set -e
cd "$(dirname "$0")/../.."
mkdir -p build/gen build/emu
python3 tools/gen_drum_samples.py build/gen/x0x_drum_samples.h >/dev/null
python3 tools/gen_upright_samples.py build/gen/upright_attacks.h >/dev/null
python3 tools/gen_romance_score.py build/gen/romance_score.h >/dev/null
python3 tools/gen_after_forms.py build/gen/after_forms.h >/dev/null
[ -f build/gen/felucca_font.h ] || python3 tools/gen_font.py build/gen/felucca_font.h >/dev/null
emcc -O2 -ffp-contract=off -std=gnu99 -Wall -Wno-unused-function -Wno-unused-parameter -Wno-unused-variable \
    -DEN_HOST -DEN_WEB "-DEN_VERSION=\"$(printf %s "${EN_VERSION:-DEV}" | tr a-z A-Z)\"" -Ifirmware/src -Ibuild/gen -Ifirmware/src/dsp -Ibuild/gen \
    --no-entry -sSTANDALONE_WASM -sSTACK_SIZE=1048576 -sINITIAL_MEMORY=33554432 -sFILESYSTEM=0 \
    -o build/emu/min.wasm web/emu/min_web.c firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c
cp web/emu/index.html web/emu/worklet.js build/emu/
echo "emu: build/emu ($(wc -c < build/emu/min.wasm) B wasm)"
