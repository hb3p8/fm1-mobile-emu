#!/usr/bin/env python3
"""Assemble the mobile page around the original emulator's audio/storage code."""
from pathlib import Path
import shutil
import tarfile
import json
import hashlib

HERE = Path(__file__).resolve().parent
UPSTREAM = HERE.parent / "upstream"
source = (UPSTREAM / "web/emu/index.html").read_text()
script = source.split('<script>\n',1)[1].split('</script>',1)[0]
tail = script[script.index('// ---------------------------------------------------------------- state and input'):]
tail = tail.replace('if (e.shiftKey || e.button === 2)', 'if (latchMode || e.shiftKey || e.button === 2)')
tail = tail.replace('btnHeldBy.set("p" + e.pointerId, b.bit);', 'rememberPress("p" + e.pointerId);\n    btnHeldBy.set("p" + e.pointerId, b.bit);')
tail = tail.replace('keyHeldBy.set("p" + e.pointerId, i);', 'rememberPress("p" + e.pointerId);\n    keyHeldBy.set("p" + e.pointerId, i);')
tail = tail.replace('const id = "p" + e.pointerId;\n  if (btnHeldBy.delete(id)) syncButtons();\n  if (keyHeldBy.delete(id)) syncKeys();', 'releasePointer(e.pointerId);')
tail = tail.replace('k.ind.setAttribute("transform", `rotate(${k.angle} ${k.x} ${k.y})`);',
    'k.ind.style.transform = `rotate(${k.angle}deg)`;\n  if (k.role === "master") k.g.style.setProperty("--level", (master / 4096).toFixed(3));\n  k.hit.setAttribute("aria-valuenow", k.role === "master" ? Math.round(master * 100 / 4096) : ((k.angle % 360 + 360) % 360));')
tail = tail.replace('if (!node || e.metaKey || e.ctrlKey || e.altKey) return;',
    'if (!node || e.metaKey || e.ctrlKey || e.altKey || document.getElementById("settings").open) return;')
tail = tail.replace('if (e.code === "ArrowUp" || e.code === "ArrowDown")',
    'if ((e.code === "ArrowUp" || e.code === "ArrowDown") && !e.target.closest(".knob"))')
tail = tail.replace('const ctx = document.getElementById("screen").getContext("2d");\nconst img = ctx.createImageData(240, 240);',
    'const img = new ImageData(240, 240);')
tail = tail.replace('ctx.putImageData(img, 0, 0);', 'screenRenderer.draw(img);')
tail = tail.replace('const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });',
    'if (!window.isSecureContext || !window.AudioWorkletNode) throw new Error("Audio needs HTTPS or localhost");\n    const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });\n    audioContext = ac;\n    await ac.resume();')
tail = tail.replace('const ready = new Promise((res) => {', 'const ready = new Promise((res, reject) => {\n      const timer = setTimeout(() => reject(new Error("The audio engine did not answer")), 15000);')
tail = tail.replace('if (m.type === "ready") res();', 'if (m.type === "ready") { clearTimeout(timer); res(); }\n        else if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }')
tail = tail.replace('`X0X uses ${m.load}% of this computer\'s time`', '`Audio thread load: ${m.load}%`')
tail = tail.replace('status.textContent = ac.sampleRate === 44100 ? "On." : `On (the browser runs audio at ${ac.sampleRate} Hz).`;',
    'status.textContent = "Sound on";\n    document.querySelector(".app-shell").classList.add("running");\n    document.getElementById("audio-toggle").hidden = false;')
tail = tail.replace('go.textContent = "Switch on";', 'if (audioContext) await audioContext.close().catch(() => {});\n    audioContext = null; node = null;\n    go.textContent = "Try again";')
tail = tail.replace('status.textContent = "Could not start: " + (err && err.message || err) + ". Chrome, Edge, Firefox and Safari should all work.";',
    'status.textContent = "Could not start";\n    document.querySelector(".start small").textContent = err && err.message || String(err);')
# OCT− / OCT+ live in the top bar, outside #device: releases must be heard everywhere.
for event in ['pointerup', 'pointercancel', 'lostpointercapture']:
    tail = tail.replace(f'device.addEventListener("{event}", pointerUp);', f'document.addEventListener("{event}", pointerUp);')
for marker in ['const img = new ImageData(240, 240);', 'screenRenderer.draw(img);', 'document.addEventListener("lostpointercapture", pointerUp);']:
    assert marker in tail, 'upstream changed: ' + marker
(HERE/'app.js').write_text((HERE/'panel.js').read_text()+'\n'+(HERE/'screen.js').read_text()+'\nlet audioContext = null;\n'+tail+'\n'+(HERE/'mobile.js').read_text())
dist = HERE/'dist'
dist.mkdir(exist_ok=True)
ICONS = ['icon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png']
for name in ['index.html','style.css','app.js','manifest.webmanifest']+ICONS:
    shutil.copy2(HERE/name,dist/name)
for name in ['worklet.js','x0x.wasm']:
    shutil.copy2(UPSTREAM/'build/emu'/name,dist/name)
for name in ['BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt']:
    shutil.copy2(UPSTREAM/'assets/fonts'/name,dist/name)
shutil.copy2(UPSTREAM/'LICENSE',dist/'LICENSE.txt')
shutil.copy2(UPSTREAM/'LICENSING.md',dist/'LICENSING.md')
# Everything the page needs offline; the source archive stays online-only.
OFFLINE = ['index.html','style.css','app.js','manifest.webmanifest']+ICONS+['worklet.js','x0x.wasm',
           'BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt','LICENSE.txt','LICENSING.md']
digest=hashlib.sha256()
for name in OFFLINE:
    digest.update(name.encode()+b'\0'+(dist/name).read_bytes())
(dist/'sw.js').write_text((HERE/'sw.js').read_text().replace('"__VERSION__"',json.dumps(digest.hexdigest()[:16]))
                          .replace('__FILES__',json.dumps(OFFLINE)))
with tarfile.open(dist/'source.tar.gz','w:gz') as archive:
    for file in UPSTREAM.rglob('*'):
        if file.is_file() and not any(part in ['.git','build'] for part in file.relative_to(UPSTREAM).parts):
            archive.add(file,arcname='fm1-mobile-emu/upstream/'+str(file.relative_to(UPSTREAM)))
    for name in ['index.html','style.css','panel.js','screen.js','mobile.js','sw.js','assemble.py','make_icons.py','app.js','README.md','manifest.webmanifest']+ICONS:
        archive.add(HERE/name,arcname='fm1-mobile-emu/app/'+name)
manifest=HERE/'.openai/hosting.json'
if manifest.exists():
    config=json.loads(manifest.read_text()); config['static']={'directory':'dist'}
    manifest.write_text(json.dumps(config,indent=2)+'\n')
print('Ready: '+str(dist))
