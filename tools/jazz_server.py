#!/usr/bin/env python3
"""Loopback-only Jazz Box preview plus persistent form-library editor API."""
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import threading
from urllib.parse import urlsplit
from form_library import LIBRARY,ROOT,load,validate

LIMIT=8*1024*1024

def revision(data):return hashlib.sha256(data).hexdigest()

def make_handler(library=LIBRARY,web_root=ROOT/'build/emu',project_root=ROOT):
    library=Path(library);web_root=Path(web_root);project_root=Path(project_root)
    lock=threading.RLock();token=secrets.token_urlsafe(24)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):super().__init__(*a,directory=str(web_root),**kw)
        def log_message(self,fmt,*args):pass
        def end_headers(self):
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');super().end_headers()
        def reply(self,code,data):
            raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
        def host_ok(self):
            host=self.headers.get('Host','');expected=f'127.0.0.1:{self.server.server_port}';local=f'localhost:{self.server.server_port}'
            origin=self.headers.get('Origin')
            return host in (expected,local) and (not origin or origin in ('http://'+expected,'http://'+local))
        def do_GET(self):
            if not self.host_ok():return self.reply(403,{'error':'Local origin required'})
            if urlsplit(self.path).path=='/api/library':
                with lock:
                    raw=library.read_bytes();manifest=web_root/'library-build.json';built=json.loads(manifest.read_text()) if manifest.exists() else {}
                    return self.reply(200,{'library':json.loads(raw),'revision':revision(raw),'token':token,'builtRevision':built.get('revision')})
            if self.path.startswith('/api/'):return self.reply(404,{'error':'Unknown endpoint'})
            return super().do_GET()
        def payload(self):
            if not self.host_ok() or self.headers.get('X-Jazz-Token')!=token:raise PermissionError('Local editor session required')
            if self.headers.get_content_type()!='application/json':raise ValueError('Expected application/json')
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=LIMIT:raise ValueError('JSON request exceeds 8 MiB')
            return json.loads(self.rfile.read(n))
        def do_PUT(self):
            if urlsplit(self.path).path!='/api/library':return self.reply(404,{'error':'Unknown endpoint'})
            try:
                data=self.payload();validate(data,coverage=False)
                with lock:
                    previous=library.read_bytes()
                    if self.headers.get('If-Match')!=revision(previous):return self.reply(409,{'error':'Library changed in another window. Export your draft before reloading.'})
                    old=json.loads(previous)
                    for key in ('romance','after'):
                        if {k:v for k,v in data['banks'][key].items() if k!='forms'}!={k:v for k,v in old['banks'][key].items() if k!='forms'}:raise ValueError('Only forms are editable; source harmony/drums are read-only')
                    raw=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode();temp=library.with_suffix('.tmp')
                    try:
                        temp.write_bytes(raw);os.replace(temp,library)
                    finally:
                        if temp.exists():temp.unlink()
                    return self.reply(200,{'revision':revision(raw)})
            except PermissionError as e:return self.reply(403,{'error':str(e)})
            except (ValueError,KeyError,TypeError) as e:return self.reply(422,{'error':str(e)})
        def do_POST(self):
            if urlsplit(self.path).path!='/api/build':return self.reply(404,{'error':'Unknown endpoint'})
            try:
                self.payload()
                with lock:
                    if self.headers.get('If-Match')!=revision(library.read_bytes()):return self.reply(409,{'error':'Save the current library before building'})
                    load(library)
                    env=os.environ.copy()
                    if 'EMSDK_PYTHON' not in env and Path('/opt/homebrew/bin/python3').exists():env['EMSDK_PYTHON']='/opt/homebrew/bin/python3'
                    proc=subprocess.run(['sh','web/emu/build.sh'],cwd=project_root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180)
                    if proc.returncode:return self.reply(500,{'error':'Web build failed','log':proc.stdout[-5000:]})
                    built=project_root/'build/emu'
                    if built.resolve()!=web_root.resolve():
                        for item in built.iterdir():
                            if item.is_file():shutil.copy2(item,web_root/item.name)
                    manifest=json.loads((web_root/'library-build.json').read_text())
                    return self.reply(200,{'revision':manifest['revision'],'log':proc.stdout[-2000:]})
            except PermissionError as e:return self.reply(403,{'error':str(e)})
            except (ValueError,subprocess.TimeoutExpired) as e:return self.reply(422,{'error':str(e)})
    return Handler

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=58049);p.add_argument('--web-root',type=Path,default=ROOT/'build/emu');a=p.parse_args()
    load(coverage=False);server=http.server.ThreadingHTTPServer(('127.0.0.1',a.port),make_handler(web_root=a.web_root.resolve()))
    print(f'Jazz Box: http://127.0.0.1:{a.port}/\nForms: http://127.0.0.1:{a.port}/forms.html',flush=True);server.serve_forever()
