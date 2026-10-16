#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# MIN-1 host tests: the maths, the platform pieces kept from Felucca / X0X / AMB-1, the instrument, and
# the whole firmware app in the simulator (tests/scenarios/*.min: UI, chords, LEARN, persistence), with
# screenshots and audio in build/scenarios/; then each piece's estimated load on the FM-1.
#   tests/run_tests.sh
set -u
cd "$(dirname "$0")/.."
CC="${CC:-cc}"
CXX="${CXX:-c++}"
FAIL=0
OUT=build/host
mkdir -p "$OUT" build/scenarios build/gen
python3 tools/gen_drum_samples.py build/gen/x0x_drum_samples.h >/dev/null
python3 tools/gen_upright_samples.py build/gen/upright_attacks.h >/dev/null
python3 tools/gen_romance_score.py build/gen/romance_score.h >/dev/null
python3 tools/gen_after_forms.py build/gen/after_forms.h >/dev/null
run() {
    name="$1"; shift
    if "$@" > "$OUT/$name.log" 2>&1; then
        echo "  ok   $name"
    else
        echo "  FAIL $name (see $OUT/$name.log)"
        tail -15 "$OUT/$name.log" | sed 's/^/       /'
        FAIL=1
    fi
}
run fastmath sh -c "$CC -O2 -ffp-contract=off -Wall -Wextra -Werror -o $OUT/fastmath_test tests/host/fastmath_test.c -lm && $OUT/fastmath_test"
run encoder sh -c "$CC -O2 -w -Ifirmware/hal -o $OUT/encoder_test tests/host/encoder_test.c && $OUT/encoder_test"
run uac sh -c "$CC -O2 -w -Ifirmware/src -Ifirmware/hal -o $OUT/uac_test tests/host/uac_test.c -lm && $OUT/uac_test"
run trs sh -c "$CC -O2 -w -Ifirmware/src -Ifirmware/hal -o $OUT/trs_test tests/host/trs_test.c && $OUT/trs_test"
run min sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Wdouble-promotion -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp \
    -o $OUT/min_test tests/host/min_test.c firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/min_test"
run jazz sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/jazz_test tests/host/jazz_test.c firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/jazz_test"
run romance sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/romance_test tests/host/romance_test.c firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/romance_test"
run bass-reverb sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/bass_reverb_test tests/host/bass_reverb_test.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/bass_reverb_test"
run romance-forms sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/romance_forms_test tests/host/romance_forms_test.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/romance_forms_test"
run after-forms sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/after_forms_test tests/host/after_forms_test.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c && $OUT/after_forms_test"
run upright sh -c "$CC -O2 -ffp-contract=off -std=c99 -Wall -Wextra -Werror -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp -o $OUT/upright_test tests/host/upright_test.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c -lm && $OUT/upright_test"
run rings-reference sh -c "$CC -O2 -ffp-contract=off -std=c99 -Ifirmware/src/dsp -c firmware/src/dsp/rings_string.c -o $OUT/rings_reference.o && $CXX -O2 -ffp-contract=off -std=c++11 -DTEST -Itests/reference -Ifirmware/src/dsp tests/host/rings_reference_test.cpp $OUT/rings_reference.o -o $OUT/rings_reference_test && $OUT/rings_reference_test"
run after-split python3 tests/host/after_split_test.py
run storage sh -c "$CC -O2 -o $OUT/storage_test tests/storage_test.c && $OUT/storage_test"
# the update path, against the firmware package (Felucca's tests; needs ./build.sh)
if [ -f build/min.fwsc ]; then
    run ota-entry sh -c "$CC -o $OUT/ota_test tests/ota_test.c && $OUT/ota_test build/min.fwsc"
    if [ -z "${AC79_SDK:-}" ]; then
        echo "  skip update-loader (needs AC79_SDK, as the build)"
    else
    run update-loader sh -c "head -c 100000 build/min.bin > $OUT/old_app.bin && \
        python3 tools/fm1pkg_make.py $OUT/old_app.bin build/loader/ota.bin $OUT/old.fwsc >/dev/null && \
        $CC -o $OUT/ldr_test tests/ldr_test.c && $OUT/ldr_test $OUT/old.fwsc build/min.fwsc"
    fi
    run installer python3 tests/install_test.py
else
    echo "  skip update-path tests (no build/min.fwsc: run ./build.sh)"
fi
run host-build sh host/build_host.sh
if command -v emcc >/dev/null 2>&1; then
    run emu sh -c "sh web/emu/build.sh >/dev/null && node tests/host/emu_test.mjs build/emu/min.wasm < /dev/null && node tests/host/jazz_emu_test.mjs build/emu/min.wasm"
fi
for s in tests/scenarios/*.min; do
    n=$(basename "$s" .min)
    mkdir -p "build/scenarios/$n"
    run "scenario-$n" build/host/min_host "$s" "build/scenarios/$n"
done
# the load each piece puts on the FM-1, from the instructions it runs (a scalar build; see min_render.c)
run load sh -c "$CC -O2 -ffp-contract=off -fno-vectorize -fno-slp-vectorize -std=c99 -DEN_HOST -Ibuild/gen -Ifirmware/src/dsp \
    -o $OUT/min_render tests/host/min_render.c firmware/src/dsp/min.c firmware/src/dsp/drum909.c firmware/src/dsp/upright.c firmware/src/dsp/rings_string.c -lm && mkdir -p build/render && \
    $OUT/min_render 120 build/render"
[ -f "$OUT/load.log" ] && sed -n '1,21p' "$OUT/load.log" | awk '{printf "       %-10s %s %s %s %s\n", $1, $(NF-3), $(NF-2), $(NF-1), $NF}'
[ $FAIL -eq 0 ] && echo "all tests passed" || echo "TESTS FAILED"
exit $FAIL
