"""Real library validation, persistent HTTP edits, conflicts and origin guard."""
import copy
import http.client
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import threading
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from form_library import LIBRARY,load,validate,emit
from jazz_server import make_handler
from http.server import ThreadingHTTPServer
lib=load();assert all(len(b['forms'])>=2 for b in lib['banks'].values())
for mutate in [lambda x:x['banks']['romance']['forms'][0]['notes'][0].update(velocity=128),lambda x:x['banks']['romance']['forms'][0].update(notes=[None]),lambda x:x.update(banks=['romance','after']),lambda x:x['banks']['romance'].update(forms=[])]:
    bad=copy.deepcopy(lib);mutate(bad)
    try:validate(bad)
    except ValueError:pass
    else:raise AssertionError('Invalid library accepted')
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);path=root/'library.json';path.write_bytes(LIBRARY.read_bytes());web=root/'web';web.mkdir();(web/'index.html').write_text('Jazz Box')
    server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(path,web,root));threading.Thread(target=server.serve_forever,daemon=True).start();port=server.server_port
    def request(method,url,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',port);h={'Host':f'127.0.0.1:{port}'};h.update(headers or {});raw=None
        if body is not None:raw=json.dumps(body).encode();h['Content-Type']='application/json'
        conn.request(method,url,raw,h);r=conn.getresponse();status=r.status;data=r.read();conn.close();return status,json.loads(data)
    code,data=request('GET','/api/library');assert code==200
    headers={'X-Jazz-Token':data['token'],'If-Match':data['revision']}
    edited=copy.deepcopy(lib);edited['banks']['romance']['forms'][0]['name']='Edited form'
    assert request('PUT','/api/library',edited)[0]==403
    assert request('PUT','/api/library',edited,{**headers,'Origin':'https://unrelated.example'})[0]==403
    code,result=request('PUT','/api/library',edited,headers);assert code==200 and load(path)['banks']['romance']['forms'][0]['name']=='Edited form'
    assert request('PUT','/api/library',edited,headers)[0]==409
    headers['If-Match']=result['revision'];bad=copy.deepcopy(edited);bad['banks']['romance']['chart'][0]['root']=1
    assert request('PUT','/api/library',bad,headers)[0]==422
    assert request('GET','/api/library')[1]['revision']==result['revision']
    emit(load(path),root/'gen');assert 'Edited form' in (root/'gen/romance_forms.h').read_text()
    assert json.loads((root/'gen/library-build.json').read_text())['revision']==hashlib.sha256(path.read_bytes()).hexdigest()
    server.shutdown();server.server_close()
assert load()==lib
print('PASS form library: coverage/bounds, real save/readback, stale-write rejection, immutable source harmony, local-session guard, edited C output, original file unchanged.')
