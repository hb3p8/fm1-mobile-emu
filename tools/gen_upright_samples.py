#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Embed compact, CC0 pizzicato attacks as flash-resident PCM (no runtime files).
Source, preparation and SHA256 records: assets/upright/manifest.json.
"""
from pathlib import Path
import json
import struct
import sys
import wave

src=Path(__file__).resolve().parents[1]/'assets/upright'
manifest=json.loads((src/'manifest.json').read_text())
out=Path(sys.argv[1] if len(sys.argv)>1 else 'build/gen/upright_attacks.h')
lines=['/* Generated CC0 VSCO 2 CE attack recordings; see assets/upright/. */', '#pragma once', '#include <stdint.h>',
       f'#define UPRIGHT_ATTACK_ZONES {len(manifest["zones"])}',f'#define UPRIGHT_ATTACK_LEN {manifest["frames"]}']
names=[]
for zone in manifest['zones']:
    for sample in zone['files']:
        name=f'upright_attack_{len(names)}';names.append(name)
        with wave.open(str(src/sample['file']),'rb') as w:
            assert w.getnchannels()==1 and w.getsampwidth()==2 and w.getframerate()==22050
            assert w.getnframes()==manifest['frames']
            values=struct.unpack('<'+'h'*w.getnframes(),w.readframes(w.getnframes()))
        lines.append(f'static const int16_t {name}[UPRIGHT_ATTACK_LEN] = {{')
        lines.extend('    '+','.join(str(x) for x in values[i:i+20])+',' for i in range(0,len(values),20))
        lines.append('};')
lines+=['static const int UPRIGHT_ATTACK_ROOT[UPRIGHT_ATTACK_ZONES] = {'+','.join(str(z['root_midi']) for z in manifest['zones'])+'};',
        'static const int16_t *const UPRIGHT_ATTACK[] = {'+','.join(names)+'};']
out.parent.mkdir(parents=True,exist_ok=True);out.write_text('\n'.join(lines)+'\n')
print(f'{out}: {len(names)} attacks, {len(names)*manifest["frames"]*2} PCM bytes')
