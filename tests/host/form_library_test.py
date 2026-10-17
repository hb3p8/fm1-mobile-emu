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
for mutate in [lambda x:x['banks']['romance']['forms'][0]['notes'][0].update(velocity=128),lambda x:x['banks']['romance']['forms'][0].update(notes=[None]),lambda x:x.update(banks=['romance','after']),lambda x:x['banks']['romance'].update(forms=[]),lambda x:x['banks']['romance']['forms'][0].update(enabled=0),lambda x:x['banks']['romance']['forms'][0].update(enabled='false')]:
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
    edited=copy.deepcopy(lib);edited['banks']['romance']['forms'][0].update(name='Excluded form marker',enabled=False)
    edited['banks']['after']['forms'][0].update(name='Excluded After marker',enabled=False)
    assert request('PUT','/api/library',edited)[0]==403
    assert request('PUT','/api/library',edited,{**headers,'Origin':'https://unrelated.example'})[0]==403
    code,result=request('PUT','/api/library',edited,headers);assert code==200
    restored=load(path);assert restored['banks']['romance']['forms'][0]['enabled'] is False
    assert len(restored['banks']['romance']['forms'])==len(lib['banks']['romance']['forms'])
    assert request('PUT','/api/library',edited,headers)[0]==409
    headers['If-Match']=result['revision'];bad=copy.deepcopy(edited);bad['banks']['romance']['chart'][0]['root']=1
    assert request('PUT','/api/library',bad,headers)[0]==422
    assert request('GET','/api/library')[1]['revision']==result['revision']
    emit(restored,root/'gen');header=(root/'gen/romance_forms.h').read_text()
    assert 'Excluded form marker' not in header
    assert f'#define ROMANCE_FORM_COUNT {sum(f.get("enabled",True) for f in edited["banks"]["romance"]["forms"])}u' in header
    after_header=(root/'gen/after_forms.h').read_text()
    assert 'Excluded After marker' not in after_header
    assert f'#define AFTER_FORM_COUNT {sum(f.get("enabled",True) for f in edited["banks"]["after"]["forms"])}u' in after_header
    assert json.loads((root/'gen/library-build.json').read_text())['revision']==hashlib.sha256(path.read_bytes()).hexdigest()
    assert load(path)==restored  # compilation must not remove the inactive form from JSON
    restored['banks']['romance']['forms'][0]['enabled']=True
    restored['banks']['after']['forms'][0]['enabled']=True
    emit(restored,root/'restored');assert 'Excluded form marker' in (root/'restored/romance_forms.h').read_text()
    assert 'Excluded After marker' in (root/'restored/after_forms.h').read_text()
    # A library draft may disable every form; only a build requires coverage.
    inactive=copy.deepcopy(edited)
    for b in inactive['banks'].values():
        for f in b['forms']:f['enabled']=False
    code,result=request('PUT','/api/library',inactive,headers);assert code==200
    headers['If-Match']=result['revision']
    assert load(path,coverage=False)==inactive
    try:emit(inactive,root/'invalid')
    except ValueError as e:assert 'минимум 2 включённые' in str(e)
    else:raise AssertionError('Build accepted missing active coverage')
    assert request('POST','/api/build',{},headers)[0]==422
    server.shutdown();server.server_close()
assert load()==lib
print('PASS form library: coverage/bounds, persistent exclusion and re-enable, inactive forms omitted from C output but retained in JSON, disabled drafts save but cannot break builds, conflicts/origin guard, original file unchanged.')
