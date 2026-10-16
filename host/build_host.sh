#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Build the MIN-1 host simulator (the whole app on this machine) into build/host/min_host.
# Same sources as the firmware, -ffp-contract=off like the device (no fused multiply-add).
set -e
cd "$(dirname "$0")/.."
CC="${CC:-cc}"
mkdir -p build/gen build/host
python3 tools/gen_drum_samples.py build/gen/x0x_drum_samples.h >/dev/null
python3 tools/gen_upright_samples.py build/gen/upright_attacks.h >/dev/null
python3 tools/gen_romance_score.py build/gen/romance_score.h >/dev/null
python3 tools/gen_after_forms.py build/gen/after_forms.h >/dev/null
[ -f build/gen/felucca_font.h ] || python3 tools/gen_font.py build/gen/felucca_font.h >/dev/null
$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Wno-unused-function -Wno-unused-parameter \
    -DEN_HOST -Ifirmware/src -Ibuild/gen -Ifirmware/src/dsp -Ibuild/gen -o build/host/min_host host/min_host.c \
    firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c -lm
echo "host: build/host/min_host"
