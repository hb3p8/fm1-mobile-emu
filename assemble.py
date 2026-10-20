#!/usr/bin/env python3
"""Assemble the mobile page around the original emulator's input/screen/storage code, with the firmwares
built by firmware/build.sh, into dist/ (what GitHub Pages serves)."""
from pathlib import Path
import gzip
import hashlib
import io
import json
import shutil
import tarfile

HERE = Path(__file__).resolve().parent
FW_OUT = HERE / "firmware/out"
CHECKOUTS = HERE / "firmware/checkouts"
SOURCES = [line.split() for line in (HERE / "firmware/sources.txt").read_text().splitlines()
           if line.strip() and not line.startswith('#')]                       # id, directory, repository, commit
UPSTREAM = CHECKOUTS / dict((s[0], s[1]) for s in SOURCES)['x0x']             # X0X: its page's input / screen code

source = (UPSTREAM / "web/emu/index.html").read_text()
script = source.split('<script>\n',1)[1].split('</script>',1)[0]
tail = script[script.index('// ---------------------------------------------------------------- state and input'):
              script.index('// ---------------------------------------------------------------- switching on')]  # power.js instead
tail = tail.replace('if (e.shiftKey || e.button === 2)', 'if (latchMode || e.shiftKey || e.button === 2)')
tail = tail.replace('btnHeldBy.set("p" + e.pointerId, b.bit);', 'rememberPress("p" + e.pointerId);\n    btnHeldBy.set("p" + e.pointerId, b.bit);')
tail = tail.replace('keyHeldBy.set("p" + e.pointerId, i);', 'rememberPress("p" + e.pointerId);\n    keyHeldBy.set("p" + e.pointerId, i);')
tail = tail.replace('const id = "p" + e.pointerId;\n  if (btnHeldBy.delete(id)) syncButtons();\n  if (keyHeldBy.delete(id)) syncKeys();', 'releasePointer(e.pointerId);')
tail = tail.replace('k.ind.setAttribute("transform", `rotate(${k.angle} ${k.x} ${k.y})`);',
    'k.ind.style.transform = `rotate(${k.angle}deg)`;\n  if (k.role === "master") k.g.style.setProperty("--level", (master / 4096).toFixed(3));\n  k.hit.setAttribute("aria-valuenow", k.role === "master" ? Math.round(master * 100 / 4096) : ((k.angle % 360 + 360) % 360));')
# MASTER: X0X's range is 0..4096, the Felucca family's the ADC's 0..1023 (firmwares.js)
tail = tail.replace('master = 2800;', 'master = MASTER_DEFAULT;').replace('master + n * 64', 'master + n * MASTER_STEP')
tail = tail.replace('master / 4096', 'master / MASTER_MAX').replace('master * 100 / 4096', 'master * 100 / MASTER_MAX')
tail = tail.replace('Math.min(4096, master', 'Math.min(MASTER_MAX, master')
tail = tail.replace('if (!node || e.metaKey || e.ctrlKey || e.altKey) return;',
    'if (!node || e.metaKey || e.ctrlKey || e.altKey || document.getElementById("settings").open) return;')
tail = tail.replace('if (e.code === "ArrowUp" || e.code === "ArrowDown")',
    'if ((e.code === "ArrowUp" || e.code === "ArrowDown") && !e.target.closest(".knob"))')
tail = tail.replace('const ctx = document.getElementById("screen").getContext("2d");\nconst img = ctx.createImageData(240, 240);',
    'const img = new ImageData(240, 240);')
tail = tail.replace('ctx.putImageData(img, 0, 0);', 'screenRenderer.draw(img);')
# OCT− / OCT+ and the bar live outside the key area: releases must be heard everywhere.
for event in ['pointerup', 'pointercancel', 'lostpointercapture']:
    tail = tail.replace(f'device.addEventListener("{event}", pointerUp);', f'document.addEventListener("{event}", pointerUp);')
for marker in ['const img = new ImageData(240, 240);', 'screenRenderer.draw(img);', 'document.addEventListener("lostpointercapture", pointerUp);',
               'master = MASTER_DEFAULT;', 'master + n * MASTER_STEP']:
    assert marker in tail, 'upstream changed: ' + marker
assert '4096' not in tail, 'upstream changed: a MASTER range left'

builds = {}
releases = json.loads((HERE/'firmware/releases.json').read_text())
for fid, directory, repo, commit in SOURCES:
    out = FW_OUT / fid
    assert (out / 'commit').read_text().strip() == commit, f'{fid}: run firmware/build.sh (built from another commit)'
    builds[fid] = {'version': (out / 'version').read_text().strip(), 'commit': commit,
                   'archive': f'src/{fid}.tar.gz', 'prerelease': releases[fid]['prerelease'],
                   'release': releases[fid]['release'],
                   'screenshot': f'screenshots/{fid}.png'}
app_js = ('const FIRMWARE_BUILDS = ' + json.dumps(builds) + ';\n' + (HERE/'firmwares.js').read_text() + '\n' +
          (HERE/'panel.js').read_text() + '\n' + (HERE/'screen.js').read_text() + '\nlet audioContext = null;\n' + tail + '\n' +
          (HERE/'power.js').read_text() + '\n' + (HERE/'mobile.js').read_text())
(HERE/'app.js').write_text(app_js)

dist = HERE/'dist'
for old in ['worklet.js', 'x0x.wasm', 'fw', 'src']:                  # (worklet.js, x0x.wasm: before the firmware choice)
    target = dist/old
    if target.is_dir():
        shutil.rmtree(target)
    elif target.exists():
        target.unlink()
dist.mkdir(exist_ok=True)
ICONS = ['icon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png']
for name in ['index.html','style.css','app.js','manifest.webmanifest']+ICONS:
    shutil.copy2(HERE/name,dist/name)
FW_FILES = {'x0x': ['x0x.wasm', 'worklet.js'], 'felucca': ['felucca.wasm'], 'sloop': ['sloop.wasm'],
            'fimba': ['kalimba.wasm', 'worklet.js'], 'melodee': ['melodee.wasm'],
            'amb': ['amb.wasm', 'worklet.js'], 'maku': ['maku.wasm'], 'hyp1': ['hyp1.wasm', 'worklet.js'],
            'ghoulbox': ['ghoulbox.wasm'], 'choralroot': ['choralroot.wasm'],
            'jazzbox': ['jazzbox.wasm', 'worklet.js'], 'min1': ['min1.wasm', 'worklet.js'],
            'tonitor': ['tonitor.wasm'], 'dub': ['dub.wasm', 'worklet.js']}
firmware_files = ['fw/flash-worklet.js']
(dist/'fw').mkdir()
shutil.copy2(HERE/'firmware/flash-worklet.js', dist/'fw/flash-worklet.js')
for fid, names in FW_FILES.items():
    (dist/'fw'/fid).mkdir()
    for name in names:
        shutil.copy2(FW_OUT/fid/name, dist/'fw'/fid/name)
        firmware_files.append(f'fw/{fid}/{name}')
for name in ['BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt']:
    shutil.copy2(UPSTREAM/'assets/fonts'/name,dist/name)
shutil.copy2(UPSTREAM/'LICENSE',dist/'LICENSE.txt')
shutil.copy2(UPSTREAM/'LICENSING.md',dist/'LICENSING.md')
shutil.copytree(HERE/'screenshots',dist/'screenshots',dirs_exist_ok=True)

# Everything the page needs offline; the source archives stay online-only.
OFFLINE = ['index.html','style.css','app.js','manifest.webmanifest']+ICONS+firmware_files+[f'screenshots/{fid}.png' for fid in builds]+[
           'BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt','LICENSE.txt','LICENSING.md']
digest=hashlib.sha256()
for name in OFFLINE:
    digest.update(name.encode()+b'\0'+(dist/name).read_bytes())
(dist/'sw.js').write_text((HERE/'sw.js').read_text().replace('"__VERSION__"',json.dumps(digest.hexdigest()[:16]))
                          .replace('__FILES__',json.dumps(OFFLINE)))

# The corresponding source (GPL-3.0): the app, and each firmware's tree as built. Byte-identical for the same
# files (no times, no owners, sorted), so a rebuild of the same commits leaves the archives unchanged.
SKIP = {'.git', 'build', '.venv', '__pycache__', 'out', 'dist', 'checkouts', '.DS_Store'}
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
APP_FILES = ['index.html','style.css','firmwares.js','panel.js','screen.js','power.js','mobile.js','sw.js','assemble.py',
             'make_icons.py','app.js','README.md','LICENSE','manifest.webmanifest','.gitignore']+ICONS
archive(dist/'source.tar.gz', [('fm1-mobile-emu/'+n, HERE/n) for n in APP_FILES] +
        tree(HERE/'firmware', 'fm1-mobile-emu/firmware/') + tree(HERE/'.github', 'fm1-mobile-emu/.github/') +
        tree(HERE/'screenshots', 'fm1-mobile-emu/screenshots/'))
for fid, directory, repo, commit in SOURCES:
    archive(dist/'src'/f'{fid}.tar.gz', tree(CHECKOUTS/directory, f'{directory}/'))

print('Ready: '+str(dist)+' ('+', '.join(f'{k} {v["version"]}' for k, v in builds.items())+')')
