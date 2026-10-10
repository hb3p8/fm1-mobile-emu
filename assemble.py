#!/usr/bin/env python3
"""Assemble the mobile page around the original emulator's audio/storage code."""
from pathlib import Path
import shutil
import tarfile
import json

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
    'if (!window.isSecureContext || !window.AudioWorkletNode) throw new Error("Для звука откройте страницу по HTTPS или на localhost");\n    const ac = new AudioContext({ sampleRate: 44100, latencyHint: "interactive" });\n    audioContext = ac;\n    await ac.resume();')
tail = tail.replace('const ready = new Promise((res) => {', 'const ready = new Promise((res, reject) => {\n      const timer = setTimeout(() => reject(new Error("Звуковое ядро не ответило")), 15000);')
tail = tail.replace('if (m.type === "ready") res();', 'if (m.type === "ready") { clearTimeout(timer); res(); }\n        else if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }')
tail = tail.replace('go.textContent = "Starting...";', 'go.textContent = "Запускается…";')
tail = tail.replace('`X0X uses ${m.load}% of this computer\'s time`', '`Загрузка аудиопотока: ${m.load}%`')
tail = tail.replace('status.textContent = ac.sampleRate === 44100 ? "On." : `On (the browser runs audio at ${ac.sampleRate} Hz).`;',
    'status.textContent = "Звук включён";\n    document.querySelector(".app-shell").classList.add("running");\n    document.getElementById("audio-toggle").hidden = false;')
tail = tail.replace('go.textContent = "Switch on";', 'if (audioContext) await audioContext.close().catch(() => {});\n    audioContext = null; node = null;\n    go.textContent = "Повторить запуск";')
tail = tail.replace('status.textContent = "Could not start: " + (err && err.message || err) + ". Chrome, Edge, Firefox and Safari should all work.";',
    'status.textContent = "Ошибка запуска";\n    document.querySelector(".start small").textContent = err && err.message || String(err);')
tail = tail.replace('"Click again to forget everything"', '"Нажмите ещё раз для сброса"')
tail = tail.replace('"Reading..."', '"Чтение…"').replace('"Choose files', '"Выбрать файлы')
tail = tail.replace('<label>Choose files', '<label>Выбрать файлы').replace('>Clear</button>', '>Очистить</button>')
tail = tail.replace('>Empty</span>', '>Пусто</span>').replace('"Could not read that file" : "Empty"', '"Не удалось прочитать файл" : "Пусто"')
for marker in ['const img = new ImageData(240, 240);', 'screenRenderer.draw(img);']:
    assert marker in tail, 'upstream changed: ' + marker
(HERE/'app.js').write_text((HERE/'panel.js').read_text()+'\n'+(HERE/'screen.js').read_text()+'\nlet audioContext = null;\n'+tail+'\n'+(HERE/'mobile.js').read_text())
dist = HERE/'dist'
dist.mkdir(exist_ok=True)
for name in ['index.html','style.css','app.js','manifest.webmanifest','icon.svg']:
    shutil.copy2(HERE/name,dist/name)
for name in ['worklet.js','x0x.wasm']:
    shutil.copy2(UPSTREAM/'build/emu'/name,dist/name)
for name in ['BarlowSemiCondensed-Medium.ttf','BarlowSemiCondensed-SemiBold.ttf','Barlow-OFL.txt']:
    shutil.copy2(UPSTREAM/'assets/fonts'/name,dist/name)
shutil.copy2(UPSTREAM/'LICENSE',dist/'LICENSE.txt')
shutil.copy2(UPSTREAM/'LICENSING.md',dist/'LICENSING.md')
with tarfile.open(dist/'source.tar.gz','w:gz') as archive:
    for file in UPSTREAM.rglob('*'):
        if file.is_file() and not any(part in ['.git','build'] for part in file.relative_to(UPSTREAM).parts):
            archive.add(file,arcname='fm1-mobile-emu/upstream/'+str(file.relative_to(UPSTREAM)))
    for name in ['index.html','style.css','panel.js','screen.js','mobile.js','assemble.py','app.js','README.md','manifest.webmanifest','icon.svg']:
        archive.add(HERE/name,arcname='fm1-mobile-emu/app/'+name)
manifest=HERE/'.openai/hosting.json'
if manifest.exists():
    config=json.loads(manifest.read_text()); config['static']={'directory':'dist'}
    manifest.write_text(json.dumps(config,indent=2)+'\n')
print('Ready: '+str(dist))
