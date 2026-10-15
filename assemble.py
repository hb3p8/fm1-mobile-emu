#!/usr/bin/env python3
"""Assemble the mobile panel and the pinned pi32v2 hardware emulator for GitHub Pages."""
from pathlib import Path
import gzip, hashlib, io, json, shutil, tarfile, subprocess
HERE = Path(__file__).resolve().parent
DIST = HERE / 'dist'
FW = HERE / 'firmware'
ENGINE = FW / 'checkouts/fm1-emu'
PACKAGES = json.loads((FW / 'packages.json').read_text())
META = json.loads((FW / 'emulator.json').read_text())
assert subprocess.check_output(['git','rev-parse','HEAD'], cwd=ENGINE, text=True).strip() == META['commit']
assert (FW/'out/emulator/commit').read_text().strip() == META['commit'], 'Run firmware/build.sh'
builds = {}
for fid, f in PACKAGES.items():
    binary = FW/'out/packages'/f'{fid}.fwsc'
    assert hashlib.sha256(binary.read_bytes()).hexdigest() == f['sha256'], f'{fid}: package checksum mismatch'
    builds[fid] = dict(version=f['version'], commit=f['commit'], archive=f'src/{fid}.tar.gz',
        prerelease=f['prerelease'], release=f"https://github.com/{f['repo']}/releases/tag/{f['tag']}",
        screenshot=f'screenshots/{fid}.png', package=f'packages/{fid}.fwsc')
js = 'const FIRMWARE_BUILDS = '+json.dumps(builds)+';\n'
js += 'const FIRMWARE_CATALOG = '+json.dumps(json.loads((FW/'catalog.json').read_text())['firmwares'])+';\n'
for name in ['firmwares.js','panel.js','screen.js','input.js','flash.js','loops.js','power.js','mobile.js']:
    if name == 'input.js': js += 'let audioContext = null;\n'
    js += (HERE/name).read_text()+'\n'
(HERE/'app.js').write_text(js.rstrip()+'\n')
DIST.mkdir(exist_ok=True)
for old in ['fw','engine','packages']:
    target = DIST/old
    if target.exists(): shutil.rmtree(target)
ICONS = ['icon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png']
BASE = ['index.html','style.css','app.js','manifest.webmanifest']+ICONS
for name in BASE: shutil.copy2(HERE/name,DIST/name)
(DIST/'engine').mkdir()
shutil.copy2(FW/'out/emulator/fm1_web.wasm',DIST/'engine/fm1_web.wasm')
shutil.copy2(FW/'worklet.js',DIST/'engine/worklet.js')
shutil.copy2(ENGINE/'web/fwsc.js',DIST/'engine/fwsc.js')
shutil.copy2(ENGINE/'LICENSE',DIST/'engine/LICENSE.txt')
(DIST/'packages').mkdir()
for fid in PACKAGES: shutil.copy2(FW/'out/packages'/f'{fid}.fwsc',DIST/'packages'/f'{fid}.fwsc')
shutil.copytree(HERE/'screenshots',DIST/'screenshots',dirs_exist_ok=True)
shutil.copytree(HERE/'assets',DIST,dirs_exist_ok=True)
shutil.copy2(HERE/'LICENSE',DIST/'LICENSE.txt')
OFFLINE = BASE + ['engine/fm1_web.wasm','engine/worklet.js','engine/fwsc.js','engine/LICENSE.txt']
OFFLINE += [f'packages/{fid}.fwsc' for fid in PACKAGES]+[f'screenshots/{fid}.png' for fid in PACKAGES]
OFFLINE += ['BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt','LICENSE.txt','LICENSING.md']
digest=hashlib.sha256()
for name in OFFLINE: digest.update(name.encode()+b'\0'+(DIST/name).read_bytes())
(DIST/'sw.js').write_text((HERE/'sw.js').read_text().replace('"__VERSION__"',json.dumps(digest.hexdigest()[:16])).replace('__FILES__',json.dumps(OFFLINE)))
SKIP = {'.git', 'build', '.venv', '__pycache__', 'out', 'dist', 'checkouts', 'target', '.DS_Store'}
def archive(path, files):
    """files: (archive name, source path), written as a reproducible .tar.gz"""
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w', format=tarfile.PAX_FORMAT) as tar:
        for name, src in sorted(files):
            info = tar.gettarinfo(str(src), arcname=name)
            info.mtime, info.uid, info.gid, info.uname, info.gname = 0, 0, 0, '', ''
            info.mode = 0o755 if info.mode & 0o111 else 0o644
            with open(src, 'rb') as f:
                tar.addfile(info, f)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'wb') as f, gzip.GzipFile(filename='', fileobj=f, mode='wb', mtime=0) as gz:
        gz.write(raw.getvalue())
def tree(base, prefix):
    return [(prefix + str(p.relative_to(base)), p) for p in base.rglob('*')
            if p.is_file() and not SKIP.intersection(p.relative_to(base).parts)]

APP_FILES = ['index.html','style.css','firmwares.js','panel.js','screen.js','input.js','flash.js','loops.js','power.js','mobile.js','sw.js','assemble.py',
 'make_icons.py','app.js','README.md','LICENSE','manifest.webmanifest','.gitignore']+ICONS
archive(DIST/'source.tar.gz', [('fm1-mobile-emu/'+n,HERE/n) for n in APP_FILES] + tree(FW,'fm1-mobile-emu/firmware/') +
 tree(HERE/'.github','fm1-mobile-emu/.github/')+tree(HERE/'screenshots','fm1-mobile-emu/screenshots/')+tree(HERE/'assets','fm1-mobile-emu/assets/'))
archive(DIST/'src/emulator.tar.gz', tree(ENGINE/'crates','fm1-emu/crates/')+[(f'fm1-emu/{n}',ENGINE/n) for n in ['Cargo.toml','Cargo.lock','LICENSE']])
# The seven pinned GPL firmware source archives already in dist/src are retained byte for byte.
for fid in PACKAGES: assert (DIST/'src'/f'{fid}.tar.gz').exists(), f'{fid}: missing corresponding source archive'
print(f'Ready: {DIST}; {len(PACKAGES)} hardware packages, {len(json.loads((FW/"catalog.json").read_text())["firmwares"])+1} catalog entries')
