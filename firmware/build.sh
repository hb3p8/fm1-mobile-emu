#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Build the pinned firmwares for the browser (WebAssembly, Emscripten) into app/firmware/out/<id>/:
#   x0x      charlesvestal/fm1-x0x   its own web/emu build (x0x.wasm + worklet.js)
#   felucca  hugelton/Felucca        its own web/emu build (felucca.wasm; app/firmware/flash-worklet.js plays it)
#   sloop    isod89/sloop-fm1        no browser build upstream: app/firmware/sloop_web.c (felucca.wasm's design)
#   fimba    jadamsowers/fm1-fimba   its own web/emu build (kalimba.wasm + worklet.js)
# HYP-1, GHOULBOX and ChoralRoot use their own upstream source simulators as well.
# The checkouts live in firmware/checkouts/ (sources.txt: directory, repository, pinned commit; git-ignored)
# and are cloned when missing, or moved to the pinned commit. Needs emcc, git and Python 3 with Pillow (with
# raqm; on macOS: brew install fribidi) and fontTools:
#   python3 -m venv firmware/.venv && firmware/.venv/bin/pip install Pillow fonttools
#   firmware/build.sh [id ...]          (PYTHON=... for another Python)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/out"
PY=${PYTHON:-$HERE/.venv/bin/python}
[ -x "$PY" ] || PY=$(command -v python3)
# the upstream build scripts call python3 (the generators) and emcc (Python >= 3.10): this Python first
[ -d /opt/homebrew/bin ] && PATH=/opt/homebrew/bin:$PATH
PATH=$(dirname "$PY"):$PATH
command -v emcc >/dev/null 2>&1 || { echo "firmware: no emcc (Emscripten)"; exit 1; }
"$PY" -c 'import PIL, fontTools' || { echo "firmware: $PY needs Pillow and fontTools"; exit 1; }
WANT=${*:-"x0x felucca sloop fimba melodee amb hyp1 ghoulbox choralroot maku jazzbox min1 tonitor dub kawa"}
EMCC_FLAGS="-O2 -ffp-contract=off -std=gnu99 -w --no-entry -sSTANDALONE_WASM -sSTACK_SIZE=1048576 -sINITIAL_MEMORY=33554432 -sFILESYSTEM=0"

gen() {   # generator script and output header, in the checkout, unless the header is there
    [ -f "$2" ] || "$PY" "tools/$1" "$2" >/dev/null
}

grep -v '^#' "$HERE/sources.txt" | while read -r id dir repo commit; do
    case " $WANT " in *" $id "*) ;; *) continue ;; esac
    src="$HERE/checkouts/$dir"
    [ -d "$src/.git" ] || git clone -q "$repo" "$src"
    if [ "$(git -C "$src" rev-parse HEAD)" != "$commit" ]; then
        git -C "$src" fetch -q origin "$commit"
        git -C "$src" checkout -q "$commit"
        rm -rf "$src/build"
    fi
    [ ! -f "$src/.gitmodules" ] || git -C "$src" submodule update --init --recursive
    mkdir -p "$OUT/$id"
    VERSION=$("$PY" -c 'import json,sys; r=json.load(open(sys.argv[1]))[sys.argv[2]]; print(r.get("version") or r["tag"].removeprefix("v"))' "$HERE/releases.json" "$id")
    cd "$src"
    case $id in
    x0x)
        X0X_VERSION="$VERSION" sh web/emu/build.sh >/dev/null
        cp build/emu/x0x.wasm build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    felucca)
        mkdir -p build/gen
        [ -f build/gen/ui_fonts.h ] || "$PY" tools/gen_aa_font.py build/gen/ui_fonts.h --preset inter-tight >/dev/null 2>&1
        for g in aa_icons:ui_icons aa_keycaps:ui_keycaps ui_palettes:ui_palettes tables:felucca_tables \
                 fm6_patches:felucca_fm6 samples:felucca_samples; do
            gen "gen_${g%%:*}.py" "build/gen/${g#*:}.h"
        done
        EMU_PREVIEW=0 sh web/emu/build.sh >/dev/null
        cp build/emu/felucca.wasm "$OUT/$id/"
        sed -n 's/^#define FELUCCA_VERSION "\([^"]*\)".*/\1/p' firmware/src/felucca.c | sed 's/^v//' > "$OUT/$id/version" ;;
    sloop)
        mkdir -p build/gen build/emu
        for g in font:felucca_font icons:felucca_icons tables:felucca_tables samples:felucca_samples \
                 drumkits:felucca_drumkits fm6_patches:felucca_fm6 logo:sloop_logo; do
            gen "gen_${g%%:*}.py" "build/gen/${g#*:}.h"
        done
        # shellcheck disable=SC2086
        emcc $EMCC_FLAGS -I. -Ifirmware/src -Ibuild/gen -o "$OUT/$id/sloop.wasm" "$HERE/sloop_web.c"
        sed -n 's/^#define FELUCCA_VERSION "SLOOP \([^"]*\)".*/\1/p' firmware/src/ui.c > "$OUT/$id/version" ;;
    fimba)
        OM_VERSION=$(cat VERSION) PYTHON="$PY" sh web/emu/build.sh >/dev/null
        cp build/emu/kalimba.wasm build/emu/worklet.js "$OUT/$id/"
        cp VERSION "$OUT/$id/version" ;;
    amb)
        PYTHON="$PY" sh build.sh --release "$VERSION" --web >/dev/null
        cp app/build/emu/app.wasm "$OUT/$id/amb.wasm"
        cp app/build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    hyp1)
        EN_VERSION="$VERSION" sh web/emu/build.sh >/dev/null
        cp build/emu/amb.wasm "$OUT/$id/hyp1.wasm"
        cp build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    min1)
        EN_VERSION="$VERSION" sh web/emu/build.sh >/dev/null
        cp build/emu/min.wasm "$OUT/$id/min1.wasm"
        cp build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    dub)
        EN_VERSION="$VERSION" sh web/emu/build.sh >/dev/null
        cp build/emu/amb.wasm "$OUT/$id/dub.wasm"
        cp build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    tonitor)
        mkdir -p build/gen
        gen gen_tables.py build/gen/tonitor_tables.h
        gen gen_font.py build/gen/tonitor_font.h
        emcc $EMCC_FLAGS -fno-builtin -I. -Ifirmware/src -Ibuild/gen -o "$OUT/$id/tonitor.wasm" "$HERE/tonitor_web.c"
        echo "$VERSION" > "$OUT/$id/version" ;;
    kawa)
        cd source
        emcc -O2 -ffp-contract=off -std=gnu99 -ffreestanding -fno-builtin \
            -DKAWA_WASM "-DAPP_VER=\"$VERSION\"" -I. -Ifirmware/src -Ifirmware/gen \
            --no-entry -sSTANDALONE_WASM -sINITIAL_MEMORY=4194304 -sSTACK_SIZE=262144 \
            -Wl,--export-dynamic -o "$OUT/$id/kawa.wasm" "$HERE/kawa_web.c"
        cp "$HERE/kawa-worklet.js" "$OUT/$id/worklet.js"
        echo "$VERSION" > "$OUT/$id/version" ;;
    jazzbox)
        EN_VERSION="$VERSION" sh web/emu/build.sh >/dev/null
        cp build/emu/min.wasm "$OUT/$id/jazzbox.wasm"
        cp build/emu/worklet.js "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    ghoulbox)
        "$PY" -c 'import runpy; runpy.run_path("tools/build.py", run_name="build_tools")["generate"]()' >/dev/null
        EMU_PREVIEW=0 sh web/emu/build.sh >/dev/null
        cp build/emu/felucca.wasm "$OUT/$id/ghoulbox.wasm"
        echo "$VERSION" > "$OUT/$id/version" ;;
    choralroot)
        # Only the generated assets: the normal build also invokes the hardware toolchain.
        "$PY" -c 'import runpy; runpy.run_path("tools/build.py", run_name="build_tools")["generate"]()' >/dev/null
        CR_VERSION="$VERSION" sh tools/emu/web/build_web.sh >/dev/null
        cp build/emu-web/choralroot.wasm "$OUT/$id/"
        echo "$VERSION" > "$OUT/$id/version" ;;
    maku)
        mkdir -p build/gen
        [ -f build/gen/ui_fonts.h ] || "$PY" tools/gen_aa_font.py build/gen/ui_fonts.h --preset inter-tight >/dev/null 2>&1
        for g in aa_icons:ui_icons aa_keycaps:ui_keycaps ui_palettes:ui_palettes tables:felucca_tables \
                 fm6_patches:felucca_fm6 samples:felucca_samples; do
            gen "gen_${g%%:*}.py" "build/gen/${g#*:}.h"
        done
        EMU_PREVIEW=0 sh web/emu/build.sh >/dev/null
        cp build/emu/felucca.wasm "$OUT/$id/maku.wasm"
        echo "$VERSION" > "$OUT/$id/version" ;;
    melodee)
        mkdir -p build/gen
        [ -f build/gen/ui_fonts.h ] || "$PY" tools/gen_aa_font.py build/gen/ui_fonts.h --preset rubik >/dev/null 2>&1
        for g in icons:ui_icons aa_keycaps:ui_keycaps ui_palettes:ui_palettes tables:melodee_tables \
                 fm6_patches:melodee_fm6 cz1_factory:melodee_cz1 prophet_factory:melodee_prophet_factory \
                 909_tables:x0x_drum_tables; do
            gen "gen_${g%%:*}.py" "build/gen/${g#*:}.h"
        done
        # Melodee's documented serial (one-core) audio path, with the real UI and NOR storage.
        emcc $EMCC_FLAGS -DMELODEE_DUAL_CORE=0 "-DMELODEE_VERSION=\"v$VERSION\"" \
            -I. -Ifirmware/src -Ibuild/gen -o "$OUT/$id/melodee.wasm" "$HERE/melodee_web.c"
        echo "$VERSION" > "$OUT/$id/version" ;;
    *) echo "firmware: unsupported id $id" >&2; exit 1 ;;
    esac
    echo "$id $(cat "$OUT/$id/version"): $(ls "$OUT/$id" | tr '\n' ' ')"
    echo "$commit" > "$OUT/$id/commit"
done
