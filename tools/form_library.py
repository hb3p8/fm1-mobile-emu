#!/usr/bin/env python3
"""Canonical Jazz Box form library: validation and allocation-free C tables."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LIBRARY=ROOT/'assets/forms/library.json'
MAX_NOTES=48

def family(mask):
    return 3 if mask&0x249==0x249 else 1 if mask&8 else 2 if mask&1024 else 0

def integer(value,lo,hi,path):
    if type(value)!=int or not lo<=value<=hi:raise ValueError(f'{path}: expected integer {lo}…{hi}')

def validate(lib):
    if not isinstance(lib,dict) or lib.get('schema')!=1 or set(lib.get('banks',{}))!={'romance','after'}:raise ValueError('Expected schema 1 with romance and after banks')
    for key,b in lib['banks'].items():
        if not isinstance(b,dict):raise ValueError(key+': expected bank')
        integer(b.get('bars'),1,120,key+'.bars');integer(b.get('choruses'),1,4,key+'.choruses');integer(b.get('key'),0,11,key+'.key')
        at=0
        for i,c in enumerate(b.get('chart',[])):
            path=f'{key}.chart[{i}]'
            for name,lo,hi in [('at',0,65535),('mask',1,4095),('root',0,11),('beats',2,4),('scale',0,9)]:integer(c.get(name),lo,hi,path+'.'+name)
            if c['at']!=at or c['beats'] not in (2,4):raise ValueError(path+': non-contiguous harmony')
            at+=c['beats']*24
        if at!=b['bars']*96:raise ValueError(key+': chart length differs from bars')
        if not isinstance(b.get('forms'),list) or not 2<=len(b['forms'])<=1024:raise ValueError(key+': expected 2…1024 forms')
        ids=set()
        for i,f in enumerate(b['forms']):
            p=f'{key}.forms[{i}]'
            if not isinstance(f.get('id'),str) or not 1<=len(f['id'])<=64 or f['id'] in ids:raise ValueError(p+': missing/duplicate ID')
            ids.add(f['id'])
            name=f.get('name','')
            if not isinstance(name,str) or not 1<=len(name)<=32 or any(ord(c)<32 or ord(c)>126 for c in name):raise ValueError(p+': name must be 1…32 ASCII characters for FM-1 display')
            if f.get('part') not in ('bass','piano'):raise ValueError(p+': invalid part')
            for k,lo,hi in [('family',0,3),('feel',0,1),('kind',0,4 if f['part']=='bass' else 5),('length',48,96),('source_bar',0,255)]:integer(f.get(k),lo,hi,p+'.'+k)
            if f['length'] not in (48,96):raise ValueError(p+': length must be 48 or 96 ticks')
            if not isinstance(f.get('notes'),list) or len(f['notes'])>MAX_NOTES:raise ValueError(p+': maximum 48 notes')
            prev=-1
            for j,n in enumerate(f['notes']):
                np=f'{p}.notes[{j}]'
                for k,lo,hi in [('at',0,f['length']-1),('gate',1,255),('role',0,16),('oct',-4,5),('alter',-1,1),('velocity',1,127)]:integer(n.get(k),lo,hi,np+'.'+k)
                if n['role'] not in (*range(8),16):raise ValueError(np+': role must be 0…7 or 16 (next root)')
                if n['at']<prev:raise ValueError(np+': notes must be sorted by onset')
                prev=n['at']
        for c in b['chart']:
            for part in ('bass','piano'):
                for feel in ((0,1) if key=='romance' else (1,)):
                    count=sum(f['part']==part and f['length']==c['beats']*24 and f['feel']==feel and (part=='bass' or f['family']==family(c['mask'])) for f in b['forms'])
                    if count<2:raise ValueError(f'{key}: need at least two {part} forms of {c["beats"]} beats, feel {feel}, family {family(c["mask"])}')
        if key=='after':
            for i,n in enumerate(b.get('drums',[])):
                for k,lo,hi in [('at',0,b['bars']*b['choruses']*96-1),('gate',1,65535),('note',0,127),('velocity',1,127)]:integer(n.get(k),lo,hi,f'{key}.drums[{i}].{k}')
    return lib

def load(path=LIBRARY):return validate(json.loads(Path(path).read_text()))

def emit(lib,dest):
    validate(lib);dest=Path(dest);dest.mkdir(parents=True,exist_ok=True)
    for key,b in lib['banks'].items():
        prefix='ROMANCE' if key=='romance' else 'AFTER'
        text=['/* Generated from assets/forms/library.json by tools/form_library.py. */','#pragma once']
        if key=='romance':text+=['typedef struct { uint8_t at,gate,role; int8_t oct,alter; uint8_t velocity; } romance_form_note_t;',
          'typedef struct { uint16_t offset; uint8_t n,len,part,family,feel,kind; int8_t first_oct,center; uint8_t source_bar; const char *name; } romance_form_t;']
        else:
            text += [f'#define AFTER_BARS {b["bars"]}u',f'#define AFTER_CHORUSES {b["choruses"]}u',f'#define AFTER_TICKS ({b["bars"]*b["choruses"]}u*96u)',f'#define AFTER_CHORDS {len(b["chart"])}u',f'#define AFTER_DRUM_COUNT {len(b["drums"])}u','static const romance_chord_t AFTER_HARMONY[AFTER_CHORDS]={']
            text += ['    {%d,0x%03x,%d,%d,%d},'%(c['at'],c['mask'],c['root'],c['beats'],c['scale']) for c in b['chart']]+['};','static const romance_note_t AFTER_DRUMS[AFTER_DRUM_COUNT]={']
            text += ['    {%d,%d,%d,%d,0},'%(n['at'],n['gate'],n['note'],n['velocity']) for n in b['drums']]+['};']
        flat=[];rows=[]
        for f in b['forms']:
            notes=f['notes'];first=notes[0]['oct'] if notes else 0
            rows.append((len(flat),len(notes),f['length'],2 if f['part']=='bass' else 3,f['family'],f['feel'],f['kind'],first,0,f['source_bar'],json.dumps(f['name'])))
            flat.extend(notes)
        text += [f'#define {prefix}_FORM_COUNT {len(rows)}u',f'#define {prefix}_FORM_MAX 48u',f'static const romance_form_note_t {prefix}_FORM_NOTES[]={{']
        text += ['    {%d,%d,%d,%d,%d,%d},'%tuple(n[k] for k in ('at','gate','role','oct','alter','velocity')) for n in flat]+['};',f'static const romance_form_t {prefix}_FORMS[{prefix}_FORM_COUNT]={{']
        text += ['    {%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%s},'%row for row in rows]+['};','']
        (dest/('romance_forms.h' if key=='romance' else 'after_forms.h')).write_text('\n'.join(text))

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--output',default=str(ROOT/'build/gen'));a=p.parse_args();lib=load();emit(lib,a.output);print('Form library:',', '.join(f'{k}: {len(b["forms"])}' for k,b in lib['banks'].items()))
