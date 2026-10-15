#!/usr/bin/env python3
"""Fetch original .fwsc packages; refuse content that differs from the pinned SHA-256."""
from pathlib import Path
import hashlib, json, urllib.request
HERE=Path(__file__).resolve().parent
OUT=HERE/'out/packages'
OUT.mkdir(parents=True,exist_ok=True)
for fid, f in json.loads((HERE/'packages.json').read_text()).items():
    path=OUT/f'{fid}.fwsc'
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=f['sha256']:
        data=urllib.request.urlopen(f['package']).read()
        assert hashlib.sha256(data).hexdigest()==f['sha256'], f'{fid}: package checksum mismatch'
        path.write_bytes(data)
    print(f"{fid} {f['version']}: original hardware package verified")
