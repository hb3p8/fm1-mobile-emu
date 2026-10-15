#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Build the pinned pi32v2 CPU emulator, then download the exact unmodified hardware packages.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/checkouts/fm1-emu"
COMMIT=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["commit"])' "$HERE/emulator.json")
if [ ! -d "$SRC/.git" ]; then git clone https://github.com/joakimeriksson/fm1-emu.git "$SRC"; fi
if [ "$(git -C "$SRC" rev-parse HEAD)" != "$COMMIT" ]; then
  git -C "$SRC" fetch origin "$COMMIT"
  git -C "$SRC" checkout "$COMMIT"
fi
if git -C "$SRC" apply --check "$HERE/emulator.patch" 2>/dev/null; then
  git -C "$SRC" apply "$HERE/emulator.patch"
else
  git -C "$SRC" apply --reverse --check "$HERE/emulator.patch"
fi
cp "$HERE/mobile.rs" "$SRC/crates/fm1-web/src/mobile.rs"
sh "$SRC/web/build.sh" "$HERE/out/emulator"
echo "$COMMIT" > "$HERE/out/emulator/commit"
python3 "$HERE/fetch_packages.py"
